"""Connexion du nom de domaine d'un commerçant à son site e-commerce.

Le commerçant saisit son domaine. Stockman l'enregistre auprès de l'hébergeur du site public
(Vercel) quand l'accès à son API est configuré, puis indique les enregistrements DNS exacts à
créer. La vérification contrôle le DNS, la propriété du domaine et la réponse HTTPS du site :
le site ne passe sur ce domaine qu'une fois tout opérationnel. L'adresse Stockman reste active.
"""

import asyncio
import ipaddress
import logging
import os
import socket
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Mapping, Optional, Set, Tuple

from ecommerce_addresses import DomainInputError, DomainTarget, expected_records, parse_domain_input, record_name

logger = logging.getLogger(__name__)

DEFAULT_CNAME_TARGET = "cname.vercel-dns.com"
DEFAULT_APEX_IPV4 = "76.76.21.21"
# Réponse fixe du serveur Stockman : elle prouve que le domaine ouvre bien le site Stockman.
MARKER_PATH = "/api/public/ecommerce/_domain-check"
MARKER_SERVICE = "stockman"

NOT_CONNECTED = "not_connected"
DNS_PENDING = "dns_pending"
OWNERSHIP_PENDING = "ownership_pending"
CERTIFICATE_PENDING = "certificate_pending"
ACTIVATION_PENDING = "activation_pending"
ACTIVE = "active"

OLD_RECORDS_WARNING = "Supprimez les anciens enregistrements A, AAAA ou CNAME sur ces mêmes noms : ils enverraient vos visiteurs vers votre ancien site."


def _http_client(**kwargs: Any) -> Any:
    # Dépendance du serveur, chargée seulement pour un véritable appel réseau.
    import httpx

    return httpx.AsyncClient(**kwargs)


class DomainServiceError(Exception):
    """Refus présentable au commerçant : statut HTTP, code stable et message en français."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


class HostingError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


HOSTING_UNAVAILABLE = "L'hébergeur du site ne répond pas pour le moment. Réessayez dans quelques minutes."


class VercelDomains:
    """Domaines du projet Vercel qui sert le site public : ajout, état et retrait."""

    def __init__(
        self,
        token: str,
        project_id: str,
        team_id: Optional[str] = None,
        *,
        client_factory: Callable[..., Any] = _http_client,
        base_url: str = "https://api.vercel.com",
        timeout: float = 15.0,
    ):
        self.token = token
        self.project_id = project_id
        self.team_id = team_id
        self.client_factory = client_factory
        self.base_url = base_url
        self.timeout = timeout

    @classmethod
    def from_env(cls, env: Mapping[str, str] = os.environ) -> Optional["VercelDomains"]:
        token = (env.get("VERCEL_API_TOKEN") or "").strip()
        project_id = (env.get("VERCEL_PROJECT_ID") or "").strip()
        if not token or not project_id:
            return None
        return cls(token, project_id, (env.get("VERCEL_TEAM_ID") or "").strip() or None)

    async def _call(self, method: str, path: str, *, body: Optional[Dict[str, Any]] = None, query: Optional[Dict[str, str]] = None) -> Tuple[int, Dict[str, Any]]:
        params = dict(query or {})
        if self.team_id:
            params["teamId"] = self.team_id
        try:
            async with self.client_factory(base_url=self.base_url, timeout=self.timeout) as client:
                response = await client.request(method, path, params=params, json=body, headers={"Authorization": f"Bearer {self.token}"})
        except Exception as exc:
            logger.warning("Vercel API unreachable for %s %s: %s", method, path, type(exc).__name__)
            raise HostingError("hosting_unreachable", HOSTING_UNAVAILABLE) from exc
        try:
            data = response.json() if response.content else {}
        except ValueError:
            data = {}
        return response.status_code, data if isinstance(data, dict) else {}

    async def project_domain(self, host: str) -> Optional[Dict[str, Any]]:
        status, data = await self._call("GET", f"/v9/projects/{self.project_id}/domains/{host}")
        if status == 404:
            return None
        if status >= 300:
            logger.warning("Vercel domain read failed for %s: %s", host, status)
            raise HostingError("hosting_error", HOSTING_UNAVAILABLE)
        return data

    async def attach(self, host: str, redirect_to: Optional[str] = None) -> Dict[str, Any]:
        body: Dict[str, Any] = {"name": host}
        if redirect_to:
            body.update({"redirect": redirect_to, "redirectStatusCode": 308})
        status, data = await self._call("POST", f"/v10/projects/{self.project_id}/domains", body=body)
        if status < 300:
            return data
        # Déjà rattaché à ce projet : l'opération est terminée.
        existing = await self.project_domain(host)
        if existing is not None:
            return existing
        code = str((data.get("error") or {}).get("code") or "")
        logger.warning("Vercel domain attach failed for %s: %s %s", host, status, code)
        if status == 409 or "in_use" in code or "taken" in code:
            raise HostingError("domain_in_use", "Ce domaine est déjà utilisé par un autre site chez notre hébergeur. Retirez-le de cet autre site, puis réessayez.")
        if status in (400, 422):
            raise HostingError("domain_rejected", "Notre hébergeur refuse ce nom de domaine. Vérifiez son orthographe.")
        raise HostingError("hosting_error", "Le domaine n'a pas pu être enregistré chez notre hébergeur. Réessayez dans quelques minutes.")

    async def verify(self, host: str) -> Optional[Dict[str, Any]]:
        status, data = await self._call("POST", f"/v9/projects/{self.project_id}/domains/{host}/verify")
        # Un refus signifie seulement que la preuve de propriété n'est pas encore visible.
        return data if status < 300 else None

    async def config(self, host: str) -> Dict[str, Any]:
        status, data = await self._call("GET", f"/v6/domains/{host}/config", query={"projectIdOrName": self.project_id})
        if status >= 300:
            logger.warning("Vercel domain config failed for %s: %s", host, status)
            raise HostingError("hosting_error", HOSTING_UNAVAILABLE)
        return data

    async def detach(self, host: str) -> None:
        status, _data = await self._call("DELETE", f"/v9/projects/{self.project_id}/domains/{host}")
        if status >= 300 and status != 404:
            logger.warning("Vercel domain detach failed for %s: %s", host, status)


def recommended_value(config: Mapping[str, Any], key: str) -> Optional[str]:
    """Valeur recommandée par l'hébergeur (« recommendedCNAME » ou « recommendedIPv4 »)."""
    items = config.get(key)
    if not isinstance(items, list):
        return None
    ranked = sorted((item for item in items if isinstance(item, Mapping)), key=lambda item: item.get("rank") if isinstance(item.get("rank"), int) else 99)
    for item in ranked:
        value = item.get("value")
        for candidate in value if isinstance(value, list) else [value]:
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip().rstrip(".")
    return None


def ownership_records(project_domain: Mapping[str, Any], apex: str) -> List[Dict[str, str]]:
    """Preuve de propriété demandée par l'hébergeur quand le domaine a déjà servi ailleurs."""
    records = []
    for item in project_domain.get("verification") or []:
        if not isinstance(item, Mapping) or item.get("type") != "TXT":
            continue
        fqdn, value = str(item.get("domain") or "").strip(".").lower(), str(item.get("value") or "").strip()
        if fqdn and value and (fqdn == apex or fqdn.endswith(f".{apex}")):
            records.append({"type": "TXT", "name": record_name(fqdn, apex), "host": fqdn, "value": value, "purpose": "ownership"})
    return records


def compute_state(*, automatic: bool, dns_ok: bool, ownership_ok: bool, https_ok: bool) -> str:
    if not ownership_ok:
        return OWNERSHIP_PENDING
    if not dns_ok:
        return DNS_PENDING
    if https_ok:
        return ACTIVE
    # DNS correct sans réponse HTTPS : certificat en préparation, ou activation à faire par Stockman
    # quand l'hébergeur n'est pas piloté automatiquement.
    return CERTIFICATE_PENDING if automatic else ACTIVATION_PENDING


async def resolve_ips(host: str) -> Set[str]:
    loop = asyncio.get_running_loop()
    try:
        infos = await loop.run_in_executor(None, socket.getaddrinfo, host, 443, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except (OSError, UnicodeError):
        return set()
    return {str(info[4][0]) for info in infos if info[4]}


def _all_public(ips: Set[str]) -> bool:
    try:
        return bool(ips) and all(ipaddress.ip_address(ip).is_global for ip in ips)
    except ValueError:
        return False


async def stockman_answers(host: str, client_factory: Callable[..., Any] = _http_client, timeout: float = 8.0) -> bool:
    """Le domaine répond en HTTPS, avec un certificat valide, et c'est bien le site Stockman."""
    try:
        async with client_factory(timeout=timeout, follow_redirects=False) as client:
            response = await client.get(f"https://{host}{MARKER_PATH}", headers={"User-Agent": "Stockman domain check"})
        return response.status_code == 200 and response.json().get("service") == MARKER_SERVICE
    except Exception:
        return False


def legacy_steps(target: DomainTarget, records: List[Dict[str, str]]) -> List[str]:
    """Étapes lues par les anciennes versions de l'application."""
    steps = [f"Chez le fournisseur de votre domaine, ouvrez la gestion DNS de {target.apex}."]
    steps += [f"Créez un enregistrement {record['type']} nommé {record['name']} avec la valeur {record['value']}." for record in records]
    steps += [
        "Supprimez les anciens enregistrements A, AAAA ou CNAME sur ces mêmes noms.",
        "Revenez dans Stockman et lancez la vérification : la propagation prend en général quelques minutes, parfois jusqu'à 48 heures.",
    ]
    return steps


class EcommerceDomainService:
    def __init__(
        self,
        db,
        *,
        hosting: Optional[VercelDomains] = None,
        resolver: Callable[[str], Awaitable[Set[str]]] = resolve_ips,
        probe: Callable[[str], Awaitable[bool]] = stockman_answers,
        clock: Optional[Callable[[], datetime]] = None,
        cname_target: Optional[str] = None,
        apex_ipv4: Optional[str] = None,
        legacy_target: Optional[str] = None,
    ):
        self.accounts = db.business_accounts
        self.hosting = hosting
        self.resolver = resolver
        self.probe = probe
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.cname_target = cname_target or os.environ.get("ECOMMERCE_DOMAIN_CNAME_TARGET") or DEFAULT_CNAME_TARGET
        self.apex_ipv4 = apex_ipv4 or os.environ.get("ECOMMERCE_DOMAIN_APEX_IPV4") or DEFAULT_APEX_IPV4
        # Adresse de l'application, visée par les anciennes consignes : encore acceptée à la vérification.
        self.legacy_target = legacy_target

    @property
    def automatic(self) -> bool:
        return self.hosting is not None

    @staticmethod
    def target_of(account: Mapping[str, Any]) -> Optional[DomainTarget]:
        host = account.get("ecommerce_custom_domain")
        if not host:
            return None
        try:
            apex = parse_domain_input(host).apex
        except DomainInputError:
            apex = host
        aliases = [alias for alias in account.get("ecommerce_domain_aliases") or [] if alias]
        return DomainTarget(host=host, apex=apex, redirect_from=aliases[0] if aliases else None)

    # --- Opérations ----------------------------------------------------------

    async def connect(self, account: Mapping[str, Any], raw_domain: Optional[str]) -> None:
        try:
            target = parse_domain_input(raw_domain)
        except DomainInputError as exc:
            raise DomainServiceError(400, exc.code, exc.message)
        account_id = account["account_id"]
        if account.get("ecommerce_custom_domain") == target.host:
            await self.check(account)
            return
        taken = await self.accounts.find_one({
            "account_id": {"$ne": account_id},
            "$or": [{"ecommerce_custom_domain": {"$in": target.hosts}}, {"ecommerce_domain_aliases": {"$in": target.hosts}}],
        }, {"_id": 0, "account_id": 1})
        if taken:
            raise DomainServiceError(409, "domain_taken", "Ce domaine est déjà connecté à une autre boutique Stockman.")
        if self.hosting:
            await self._attach(target)
        if account.get("ecommerce_custom_domain"):
            await self._detach(account)
        now = self.clock()
        update = {
            "ecommerce_custom_domain": target.host,
            "ecommerce_domain_aliases": [target.redirect_from] if target.redirect_from else [],
            "ecommerce_domain_mode": "connect",
            "ecommerce_domain_state": DNS_PENDING,
            "ecommerce_domain_status": "pending_verification",
            "ecommerce_domain_records": expected_records(target, self.cname_target, self.apex_ipv4),
            "ecommerce_domain_redirect_ready": False if target.redirect_from else None,
            "ecommerce_domain_hosting": "vercel" if self.hosting else "manual",
            "ecommerce_domain_connected_at": now,
            "ecommerce_domain_checked_at": None,
            "ecommerce_domain_verified_at": None,
            "updated_at": now,
        }
        await self.accounts.update_one({"account_id": account_id}, {"$set": update})
        await self.check({**account, **update})

    async def check(self, account: Mapping[str, Any]) -> None:
        target = self.target_of(account)
        if not target:
            return
        hosting_mode = account.get("ecommerce_domain_hosting")
        result = None
        if self.hosting:
            try:
                if hosting_mode != "vercel":
                    # Domaine connecté avant le pilotage de l'hébergeur : il y est enregistré maintenant.
                    await self._attach(target)
                    hosting_mode = "vercel"
                result = await self._check_with_hosting(target)
            except (HostingError, DomainServiceError) as exc:
                logger.warning("Hosting check unavailable for %s: %s", target.host, getattr(exc, "code", exc))
        if result is None:
            result = await self._check_dns(target)
        dns_ok, ownership_ok, redirect_ok, records = result
        https_ok = dns_ok and ownership_ok and await self._https(target.host)
        state = compute_state(automatic=hosting_mode == "vercel", dns_ok=dns_ok, ownership_ok=ownership_ok, https_ok=https_ok)
        now = self.clock()
        await self.accounts.update_one(
            # Une vérification ne doit jamais réécrire un domaine changé ou retiré entre-temps.
            {"account_id": account["account_id"], "ecommerce_custom_domain": target.host},
            {"$set": {
                "ecommerce_domain_state": state,
                "ecommerce_domain_status": "verified" if state == ACTIVE else "pending_verification",
                "ecommerce_domain_records": records,
                "ecommerce_domain_redirect_ready": redirect_ok if target.redirect_from else None,
                "ecommerce_domain_hosting": hosting_mode or "manual",
                "ecommerce_domain_checked_at": now,
                "ecommerce_domain_verified_at": (account.get("ecommerce_domain_verified_at") or now) if state == ACTIVE else None,
            }},
        )

    async def disconnect(self, account: Mapping[str, Any]) -> None:
        if account.get("ecommerce_custom_domain"):
            await self._detach(account)
        await self.accounts.update_one({"account_id": account["account_id"]}, {"$set": {
            "ecommerce_custom_domain": None,
            "ecommerce_domain_aliases": [],
            "ecommerce_domain_mode": "stockman",
            "ecommerce_domain_state": NOT_CONNECTED,
            "ecommerce_domain_status": "not_configured",
            "ecommerce_domain_records": [],
            "ecommerce_domain_redirect_ready": None,
            "ecommerce_domain_hosting": None,
            "ecommerce_domain_checked_at": None,
            "ecommerce_domain_verified_at": None,
            "updated_at": self.clock(),
        }})

    # --- Lecture -------------------------------------------------------------

    def describe(self, account: Mapping[str, Any]) -> Dict[str, Any]:
        """Champs du site pour les applications, dont ceux lus par leurs anciennes versions."""
        target = self.target_of(account)
        if not target:
            return {
                "domain_state": NOT_CONNECTED, "domain_records": [], "domain_redirect_from": None,
                "domain_redirect_ready": None, "domain_checked_at": None, "domain_automatic": self.automatic,
                "domain_verification_target": self.cname_target, "domain_record_type": "CNAME", "domain_record_name": "www",
                "domain_record_value": self.cname_target, "domain_dns_mode": "preferred_www",
                "domain_connection_steps": [], "domain_connection_warning": None,
            }
        state = account.get("ecommerce_domain_state") or (ACTIVE if account.get("ecommerce_domain_status") == "verified" else DNS_PENDING)
        records = account.get("ecommerce_domain_records") or expected_records(target, self.cname_target, self.apex_ipv4)
        site = next((record for record in records if record.get("purpose") == "site"), records[0])
        return {
            "domain_state": state,
            "domain_records": records,
            "domain_redirect_from": target.redirect_from,
            "domain_redirect_ready": account.get("ecommerce_domain_redirect_ready"),
            "domain_checked_at": account.get("ecommerce_domain_checked_at"),
            "domain_automatic": self.automatic,
            "domain_verification_target": site["value"],
            "domain_record_type": site["type"],
            "domain_record_name": site["name"],
            "domain_record_value": site["value"],
            "domain_dns_mode": "preferred_www" if target.host.startswith("www.") else "subdomain",
            "domain_connection_steps": legacy_steps(target, records),
            "domain_connection_warning": OLD_RECORDS_WARNING,
        }

    # --- Contrôles -----------------------------------------------------------

    async def _attach(self, target: DomainTarget) -> None:
        try:
            await self.hosting.attach(target.host)
            if target.redirect_from:
                try:
                    await self.hosting.attach(target.redirect_from, redirect_to=target.host)
                except HostingError:
                    await self.hosting.detach(target.host)
                    raise
        except HostingError as exc:
            raise DomainServiceError(409 if exc.code == "domain_in_use" else 502, exc.code, exc.message)

    async def _detach(self, account: Mapping[str, Any]) -> None:
        if not self.hosting or account.get("ecommerce_domain_hosting") != "vercel":
            return
        for host in [account.get("ecommerce_custom_domain"), *(account.get("ecommerce_domain_aliases") or [])]:
            if not host:
                continue
            try:
                await self.hosting.detach(host)
            except HostingError:
                logger.warning("Domain %s could not be removed from hosting", host)

    async def _check_with_hosting(self, target: DomainTarget) -> Tuple[bool, bool, bool, List[Dict[str, str]]]:
        domain = await self.hosting.project_domain(target.host)
        if domain is None:
            # Retiré entre-temps chez l'hébergeur : il est enregistré de nouveau.
            domain = await self.hosting.attach(target.host)
        if not domain.get("verified"):
            domain = (await self.hosting.verify(target.host)) or domain
        ownership_ok = bool(domain.get("verified"))
        config = await self.hosting.config(target.host)
        cname = recommended_value(config, "recommendedCNAME") or self.cname_target
        ipv4 = recommended_value(config, "recommendedIPv4") or self.apex_ipv4
        redirect_ok = True
        if target.redirect_from:
            redirect_config = await self.hosting.config(target.redirect_from)
            ipv4 = recommended_value(redirect_config, "recommendedIPv4") or ipv4
            redirect_ok = redirect_config.get("misconfigured") is False
        records = expected_records(target, cname, ipv4)
        if not ownership_ok:
            records += ownership_records(domain, target.apex)
        return config.get("misconfigured") is False, ownership_ok, redirect_ok, records

    async def _check_dns(self, target: DomainTarget) -> Tuple[bool, bool, bool, List[Dict[str, str]]]:
        host_ips = await self.resolver(target.host)
        expected: Set[str] = set()
        for name in filter(None, (self.cname_target, self.legacy_target)):
            expected |= await self.resolver(name)
        dns_ok = bool(host_ips & expected)
        redirect_ok = True
        if target.redirect_from:
            redirect_ok = self.apex_ipv4 in await self.resolver(target.redirect_from)
        return dns_ok, True, redirect_ok, expected_records(target, self.cname_target, self.apex_ipv4)

    async def _https(self, host: str) -> bool:
        # Seules des adresses publiques sont contactées.
        if not _all_public(await self.resolver(host)):
            return False
        return await self.probe(host)
