"""Livraison des commandes en ligne avec Denkma Pro (API partenaire /api/integrations/v1).

Le commerçant connecte une fois son compte Denkma Pro. À la commande, le client choisit sa
position (livraison à domicile) ou un point relais sur une page Denkma : aucune adresse écrite.
Le prix exact s'ajoute au total. « Livrer avec Denkma » confirme le paiement du client, réserve le
transport sur le compte Denkma Pro, envoie la photo du colis, le déclare prêt et demande
l'enlèvement. Le suivi revient par des événements signés.
"""

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Mapping, Optional, Tuple
from urllib.parse import urlencode, urlsplit

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://api.denkma.com"
API_PREFIX = "/api/integrations/v1"
PARTNER_PREFIX = "/api/partners/v1"
CONNECT_MINUTES = 10
SIGNATURE_TOLERANCE_SECONDS = 600
DEFAULT_WEIGHT_KG = 1.0
MODES = ("home_to_home", "home_to_relay")
MODE_LABELS = {"home_to_home": "À domicile", "home_to_relay": "En point relais"}
CATEGORIES = ("small", "large")
# Statuts d'une commande Denkma après lesquels l'expédition est engagée.
SHIPPED_STATUSES = ("dispatching", "dispatched")
MAX_EVENTS = 50


def _http_client(**kwargs: Any) -> Any:
    # Dépendance du serveur, chargée seulement pour un véritable appel réseau.
    import httpx

    return httpx.AsyncClient(**kwargs)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Any) -> Any:
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _hash(value: str) -> str:
    return hashlib.sha256((value or "").encode("utf-8")).hexdigest()


class DenkmaError(Exception):
    """Refus présentable au commerçant ou au client : statut HTTP, code stable, message en français."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def denkma_phone(value: Optional[str]) -> Optional[str]:
    """Numéro au format attendu par Denkma (Sénégal ou France), sinon None."""
    raw = (value or "").strip()
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if raw.startswith("+"):
        number = digits
    elif digits.startswith("00"):
        number = digits[2:]
    elif len(digits) == 9 and digits[0] in "73":
        number = "221" + digits
    elif len(digits) == 10 and digits.startswith(("06", "07")):
        number = "33" + digits[1:]
    else:
        number = digits
    if (len(number) == 12 and number.startswith("221")) or (len(number) == 11 and number.startswith("33")):
        return "+" + number
    return None


def _detail(data: Mapping[str, Any]) -> Optional[str]:
    detail = data.get("detail")
    if isinstance(detail, str) and detail.strip():
        return detail.strip()
    if isinstance(detail, Mapping) and str(detail.get("message") or "").strip():
        return str(detail["message"]).strip()
    if isinstance(detail, list) and detail and isinstance(detail[0], Mapping):
        message = str(detail[0].get("msg") or "").strip()
        return re.sub(r"^Value error, ", "", message) or None
    return None


def _refusal(status: int, detail: Optional[str]) -> DenkmaError:
    if status == 401:
        return DenkmaError(401, "denkma_disconnected", "La connexion à Denkma n'est plus valable. Reconnectez Denkma dans Paramètres > Site e-commerce.")
    if status == 402:
        return DenkmaError(402, "denkma_funds", "Solde transport Denkma insuffisant. Rechargez votre compte Denkma Pro : l'expédition pourra ensuite partir.")
    if status == 403:
        return DenkmaError(403, "denkma_forbidden", detail or "Denkma Pro n'est pas ouvert pour ce commerce, ou la connexion n'a pas cette permission.")
    if status == 404:
        return DenkmaError(404, "denkma_not_found", detail or "Cette commande est introuvable chez Denkma.")
    if status == 410:
        return DenkmaError(410, "denkma_expired", detail or "Le prix ou la réservation Denkma a expiré. Relancez l'expédition.")
    if status == 429:
        return DenkmaError(429, "denkma_busy", "Denkma reçoit trop de demandes. Réessayez dans une minute.")
    if status in (400, 409, 413, 422):
        return DenkmaError(status, "denkma_refused", detail or "Denkma a refusé cette demande.")
    return DenkmaError(502, "denkma_error", "Denkma n'a pas pu traiter la demande. Réessayez dans quelques minutes.")


class DenkmaApi:
    """Appels à l'API partenaire de Denkma Pro, avec la clé de la boutique."""

    def __init__(self, base_url: Optional[str] = None, *, client_factory: Callable[..., Any] = _http_client, timeout: float = 20.0):
        self.base_url = (base_url or os.environ.get("DENKMA_API_URL") or DEFAULT_API_URL).rstrip("/")
        self.client_factory = client_factory
        self.timeout = timeout

    async def _call(self, method: str, path: str, *, key: Optional[str] = None, body: Optional[Dict[str, Any]] = None,
                    files: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None,
                    prefix: str = API_PREFIX, authorization: Optional[str] = None) -> Dict[str, Any]:
        headers = {"Authorization": authorization or f"Bearer {key}"} if (key or authorization) else {}
        try:
            async with self.client_factory(base_url=self.base_url, timeout=self.timeout) as client:
                response = await client.request(method, prefix + path, json=body, files=files, params=params, headers=headers)
        except Exception as exc:
            logger.warning("Denkma API unreachable for %s %s: %s", method, path, type(exc).__name__)
            raise DenkmaError(503, "denkma_unreachable", "Denkma ne répond pas pour le moment. Réessayez dans quelques minutes.") from exc
        try:
            data = response.json() if response.content else {}
        except ValueError:
            data = {}
        data = data if isinstance(data, dict) else {}
        if response.status_code < 300:
            return data
        logger.warning("Denkma API refused %s %s: %s", method, path, response.status_code)
        raise _refusal(response.status_code, _detail(data))

    async def exchange(self, code: str, webhook_url: Optional[str]) -> Dict[str, Any]:
        return await self._call("POST", "/connect/exchange", body={"code": code, "webhook_url": webhook_url})

    async def partner_signup(self, partner_key: str, body: Dict[str, Any]) -> Dict[str, Any]:
        """Création du compte Denkma Pro du commerçant, au nom de Stockman (clé de plateforme)."""
        return await self._call("POST", "/merchants", body=body, prefix=PARTNER_PREFIX, authorization=f"Partner {partner_key}")

    async def shop(self, key: str) -> Dict[str, Any]:
        return await self._call("GET", "/shop", key=key)

    async def floor(self, key: str, mode: str, weight_kg: float, category: str) -> Dict[str, Any]:
        return await self._call("POST", "/quotes/from", key=key, body={"delivery_mode": mode, "weight_kg": weight_kg, "parcel_category": category})

    async def quote(self, key: str, session_id: str, mode: str, weight_kg: float, category: str) -> Dict[str, Any]:
        return await self._call("POST", "/quotes", key=key, body={
            "delivery_mode": mode, "weight_kg": weight_kg, "parcel_category": category, "destination_session_id": session_id,
        })

    async def open_destination(self, key: str, mode: str, opener_origin: Optional[str]) -> Dict[str, Any]:
        return await self._call("POST", "/destination-sessions", key=key, body={"delivery_mode": mode, "opener_origin": opener_origin})

    async def destination(self, key: str, session_id: str) -> Dict[str, Any]:
        return await self._call("GET", f"/destination-sessions/{session_id}", key=key)

    async def save_order(self, key: str, ref: str, body: Dict[str, Any]) -> Dict[str, Any]:
        return await self._call("PUT", f"/orders/{ref}", key=key, body=body, params={"shipment": 1})

    async def order(self, key: str, ref: str) -> Dict[str, Any]:
        return await self._call("GET", f"/orders/{ref}", key=key, params={"shipment": 1})

    async def order_quote(self, key: str, ref: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/quote", key=key, params={"shipment": 1})

    async def payment_confirmed(self, key: str, ref: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/payment-confirmed", key=key, params={"shipment": 1})

    async def reserve(self, key: str, ref: str, quote_id: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/reserve", key=key, body={"quote_id": quote_id}, params={"shipment": 1})

    async def photo(self, key: str, ref: str, content: bytes, content_type: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/photo", key=key, files={"photo": ("colis.jpg", content, content_type)}, params={"shipment": 1})

    async def prepared(self, key: str, ref: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/prepared", key=key, params={"shipment": 1})

    async def dispatch(self, key: str, ref: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/dispatch", key=key, params={"shipment": 1})

    async def cancel(self, key: str, ref: str) -> Dict[str, Any]:
        return await self._call("POST", f"/orders/{ref}/cancel", key=key, params={"shipment": 1})


class SecretBox:
    """Chiffrement des secrets Denkma au repos, avec une clé dérivée du secret du serveur."""

    def __init__(self, secret: str):
        if not secret:
            raise DenkmaError(503, "denkma_crypto", "Le chiffrement des connexions Denkma n'est pas configuré sur le serveur.")
        from cryptography.fernet import Fernet

        self._fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(b"stockman:denkma:" + secret.encode("utf-8")).digest()))

    def seal(self, value: str) -> str:
        return self._fernet.encrypt(value.encode("utf-8")).decode("ascii")

    def open(self, token: str) -> str:
        return self._fernet.decrypt(token.encode("ascii")).decode("utf-8")


def sign(secret: str, stamp: Any, raw: bytes) -> str:
    """Signature des événements Denkma : HMAC-SHA256 de « horodatage.corps »."""
    return hmac.new(secret.encode("utf-8"), str(stamp).encode("ascii") + b"." + raw, hashlib.sha256).hexdigest()


def parse_signature(header: Optional[str]) -> Tuple[Optional[int], Optional[str]]:
    parts = dict(item.split("=", 1) for item in (header or "").split(",") if "=" in item)
    try:
        return int(parts.get("t", "")), parts.get("v1") or None
    except ValueError:
        return None, None


class EcommerceDenkmaService:
    def __init__(
        self,
        db,
        *,
        web_base_url: str,
        api: Optional[DenkmaApi] = None,
        box_factory: Optional[Callable[[], SecretBox]] = None,
        clock: Optional[Callable[[], datetime]] = None,
        on_delivered: Optional[Callable[[Mapping[str, Any]], Any]] = None,
    ):
        self.accounts = db.business_accounts
        self.orders = db.ecommerce_orders
        self.states = db.denkma_connect_states
        self.api = api or DenkmaApi()
        self.web_base_url = web_base_url.rstrip("/")
        self.shop_domain = urlsplit(self.web_base_url).hostname or ""
        self._box_factory = box_factory or (lambda: SecretBox(os.environ.get("JWT_SECRET", "")))
        self.clock = clock or _now
        self.on_delivered = on_delivered
        self._floor_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}

    # --- Connexion -----------------------------------------------------------

    @staticmethod
    def connection(account: Mapping[str, Any]) -> Dict[str, Any]:
        link = account.get("ecommerce_denkma")
        return link if isinstance(link, dict) and link.get("api_key") else {}

    def is_connected(self, account: Mapping[str, Any]) -> bool:
        return bool(self.connection(account))

    def _key(self, account: Mapping[str, Any]) -> str:
        link = self.connection(account)
        if not link:
            raise DenkmaError(409, "denkma_not_connected", "Connectez d'abord Denkma Pro dans Paramètres > Site e-commerce.")
        try:
            return self._box_factory().open(link["api_key"])
        except DenkmaError:
            raise
        except Exception:
            raise DenkmaError(409, "denkma_not_connected", "La connexion à Denkma doit être refaite. Reconnectez Denkma dans Paramètres > Site e-commerce.")

    @staticmethod
    def _settings(account: Mapping[str, Any]) -> Tuple[float, str]:
        link = account.get("ecommerce_denkma") or {}
        weight = link.get("weight_kg")
        category = link.get("parcel_category")
        return (float(weight) if isinstance(weight, (int, float)) and 0 < weight <= 1000 else DEFAULT_WEIGHT_KG,
                category if category in CATEGORIES else "small")

    async def start_connection(self, account: Mapping[str, Any]) -> Dict[str, str]:
        state = secrets.token_urlsafe(24)
        await self.states.insert_one({"state_hash": _hash(state), "account_id": account["account_id"], "expires_at": self.clock() + timedelta(minutes=CONNECT_MINUTES)})
        query = urlencode({
            "connect": "1", "platform": "custom_api", "domain": self.shop_domain,
            "return_url": f"{self.web_base_url}/api/public/ecommerce/denkma/connected", "state": state,
        })
        return {"url": f"{self.api.base_url}/pro/?{query}"}

    async def finish_connection(self, code: Optional[str], state: Optional[str]) -> str:
        row = await self.states.find_one({"state_hash": _hash(state or "")})
        if not row or not code:
            raise DenkmaError(410, "denkma_state", "Cette demande de connexion n'est plus valable. Relancez « Connecter Denkma » depuis Stockman.")
        removed = await self.states.delete_one({"state_hash": row["state_hash"]})
        if not removed.deleted_count or _aware(row["expires_at"]) <= self.clock():
            raise DenkmaError(410, "denkma_state", "Cette demande de connexion a expiré. Relancez « Connecter Denkma » depuis Stockman.")
        account = await self.accounts.find_one({"account_id": row["account_id"]}, {"_id": 0}) or {}
        previous, hook_id = self._previous(account)
        box = self._box_factory()
        result = await self.api.exchange(code, self._events_url(hook_id))
        await self._store(row["account_id"], previous, hook_id, box, result, origin="connect")
        return row["account_id"]

    @staticmethod
    def partner_key() -> str:
        return (os.environ.get("DENKMA_PARTNER_KEY") or "").strip()

    @staticmethod
    def _previous(account: Mapping[str, Any]) -> Tuple[Dict[str, Any], str]:
        previous = account.get("ecommerce_denkma") if isinstance(account.get("ecommerce_denkma"), dict) else {}
        return previous, previous.get("hook_id") or secrets.token_urlsafe(18)

    def _events_url(self, hook_id: str) -> str:
        return f"{self.web_base_url}/api/public/ecommerce/denkma/events/{hook_id}"

    async def _store(self, account_id: str, previous: Mapping[str, Any], hook_id: str, box: SecretBox,
                     result: Mapping[str, Any], *, origin: str) -> None:
        api_key, webhook_secret = str(result.get("api_key") or ""), str(result.get("webhook_secret") or "")
        if not api_key or not webhook_secret:
            raise DenkmaError(502, "denkma_error", "Denkma n'a pas renvoyé la clé de connexion. Relancez la connexion.")
        await self.accounts.update_one({"account_id": account_id}, {"$set": {"ecommerce_denkma": {
            "api_key": box.seal(api_key), "webhook_secret": box.seal(webhook_secret), "key_hint": api_key[-4:],
            "hook_id": hook_id, "connected_at": self.clock(), "origin": origin,
            "weight_kg": previous.get("weight_kg", DEFAULT_WEIGHT_KG), "parcel_category": previous.get("parcel_category", "small"),
        }}})
        self._floor_cache.pop(account_id, None)

    async def signup(self, account: Mapping[str, Any], details: Mapping[str, Any]) -> None:
        """Crée le compte Denkma Pro du commerçant depuis Stockman, puis le relie à la boutique.

        Le numéro a été vérifié par SMS dans l'application (preuve Firebase, revérifiée par Denkma).
        Le compte reste en attente de validation par Denkma avant la première expédition."""
        partner_key = self.partner_key()
        if not partner_key:
            raise DenkmaError(503, "denkma_signup_unavailable", "La création d'un compte Denkma Pro depuis Stockman n'est pas encore ouverte. Créez votre compte dans l'application Denkma, puis connectez-le.")
        if self.is_connected(account):
            raise DenkmaError(409, "denkma_already_connected", "Denkma est déjà connecté à votre boutique.")
        phone = denkma_phone(details.get("phone"))
        if not phone:
            raise DenkmaError(400, "denkma_phone", "Denkma Pro est disponible avec un numéro du Sénégal ou de France.")
        previous, hook_id = self._previous(account)
        box = self._box_factory()
        body = {**details, "phone": phone, "partner_account_ref": account["account_id"], "webhook_url": self._events_url(hook_id)}
        try:
            result = await self.api.partner_signup(partner_key, body)
        except DenkmaError as exc:
            if exc.status == 401:
                logger.error("Denkma refused the Stockman partner key")
                raise DenkmaError(503, "denkma_signup_unavailable", "La création d'un compte Denkma Pro est momentanément indisponible. Réessayez plus tard, ou créez votre compte dans l'application Denkma.") from exc
            raise
        await self._store(account["account_id"], previous, hook_id, box, result, origin="signup")

    async def status(self, account: Mapping[str, Any], *, live: bool = True) -> Dict[str, Any]:
        link = self.connection(account)
        weight, category = self._settings(account)
        state: Dict[str, Any] = {"connected": bool(link), "key_hint": link.get("key_hint"), "connected_at": link.get("connected_at"),
                                 "weight_kg": weight, "parcel_category": category, "transport_open": None, "problem": None,
                                 "validation_pending": False, "signup_available": bool(self.partner_key())}
        if link and live:
            try:
                shop = await self.api.shop(self._key(account))
                state["transport_open"] = bool(shop.get("transport_open"))
            except DenkmaError as exc:
                # Un compte créé depuis Stockman reste fermé tant que Denkma ne l'a pas validé.
                if exc.status == 403 and link.get("origin") == "signup":
                    state["validation_pending"] = True
                    state["problem"] = "Denkma vérifie votre commerce. La livraison Denkma s'ouvrira dans votre boutique dès la validation de votre compte ; en attendant, vos clients écrivent leur adresse."
                else:
                    state["problem"] = exc.message
        return state

    async def update_settings(self, account: Mapping[str, Any], *, weight_kg: float, parcel_category: str) -> None:
        link = self.connection(account)
        if not link:
            raise DenkmaError(409, "denkma_not_connected", "Connectez d'abord Denkma Pro dans Paramètres > Site e-commerce.")
        if not 0 < weight_kg <= 1000 or parcel_category not in CATEGORIES:
            raise DenkmaError(400, "denkma_settings", "Indiquez un poids entre 0,1 et 1 000 kg.")
        await self.accounts.update_one({"account_id": account["account_id"]}, {"$set": {"ecommerce_denkma": {**link, "weight_kg": round(weight_kg, 2), "parcel_category": parcel_category}}})
        self._floor_cache.pop(account["account_id"], None)

    async def disconnect(self, account: Mapping[str, Any]) -> None:
        await self.accounts.update_one({"account_id": account["account_id"]}, {"$unset": {"ecommerce_denkma": ""}})
        self._floor_cache.pop(account["account_id"], None)

    # --- Vitrine ---------------------------------------------------------------

    async def delivery_options(self, account: Mapping[str, Any]) -> Dict[str, Any]:
        """Modes proposés au client, avec leur prix « à partir de ». Un mode que la boutique ne
        peut pas financer n'est pas proposé, sans jamais révéler son solde."""
        if not self.is_connected(account):
            return {"modes": []}
        cached = self._floor_cache.get(account["account_id"])
        if cached and cached[0] > time.monotonic():
            return cached[1]
        key = self._key(account)
        weight, category = self._settings(account)
        modes: List[Dict[str, Any]] = []
        for mode in MODES:
            if category == "large" and mode == "home_to_relay":
                continue
            try:
                floor = await self.api.floor(key, mode, weight, category)
            except DenkmaError as exc:
                logger.info("Denkma mode %s unavailable for %s: %s", mode, account["account_id"], exc.code)
                continue
            if floor.get("fundable"):
                modes.append({"mode": mode, "label": MODE_LABELS[mode], "from_amount": floor.get("amount_xof")})
        result = {"modes": modes}
        self._floor_cache[account["account_id"]] = (time.monotonic() + 600, result)
        return result

    async def open_destination(self, account: Mapping[str, Any], mode: str, page_origin: Optional[str]) -> Dict[str, Any]:
        if mode not in MODES:
            raise DenkmaError(400, "denkma_mode", "Mode de livraison inconnu.")
        # La page Denkma ne s'affiche dans la vitrine que sur l'adresse Stockman ; ailleurs, elle s'ouvre à part.
        origin = f"https://{self.shop_domain}"
        embedded = bool(page_origin) and page_origin.rstrip("/") == origin
        session = await self.api.open_destination(self._key(account), mode, origin if embedded else None)
        return {"session_id": session.get("session_id"), "url": session.get("url"), "expires_at": session.get("expires_at"), "embedded": embedded}

    async def destination_quote(self, account: Mapping[str, Any], session_id: str) -> Dict[str, Any]:
        key = self._key(account)
        state = await self.api.destination(key, session_id)
        if not state.get("confirmed"):
            return {"confirmed": False}
        weight, category = self._settings(account)
        quote = await self.api.quote(key, session_id, state.get("delivery_mode") or "home_to_home", weight, category)
        if not quote.get("fundable"):
            raise DenkmaError(409, "denkma_unavailable", "La livraison Denkma n'est pas disponible pour cette boutique pour le moment.")
        return {"confirmed": True, "mode": state.get("delivery_mode"), "relay_name": state.get("relay_name"),
                "amount": quote.get("amount_xof"), "currency": quote.get("currency") or "XOF"}

    # --- Commande ----------------------------------------------------------------

    async def checkout_delivery(self, account: Mapping[str, Any], session_id: str, customer_phone: Optional[str]) -> Dict[str, Any]:
        """Choix du client revérifié par Denkma au moment de la commande : prix qui fait foi."""
        if not denkma_phone(customer_phone):
            raise DenkmaError(422, "denkma_phone", "Indiquez un numéro de téléphone sénégalais (ou français) : le livreur Denkma en a besoin.")
        quote = await self.destination_quote(account, session_id)
        if not quote.get("confirmed"):
            raise DenkmaError(422, "denkma_destination", "Choisissez votre position ou votre point relais avant d'envoyer la commande.")
        return {"provider": "denkma", "mode": quote["mode"], "relay_name": quote.get("relay_name"), "session_id": session_id,
                "fee": float(quote.get("amount") or 0), "status": "pending_sync", "events": []}

    def _order_body(self, account: Mapping[str, Any], order: Mapping[str, Any]) -> Dict[str, Any]:
        weight, category = self._settings(account)
        items = order.get("items") or []
        reference = order.get("order_number") or order.get("order_id")
        return {
            "recipient_name": (order.get("customer_name") or "")[:120],
            "recipient_phone": denkma_phone(order.get("customer_phone")),
            "delivery_mode": (order.get("delivery") or {}).get("mode") or "home_to_home",
            "parcel_category": category,
            "weight_kg": weight,
            "description": f"Commande Stockman {reference} - {len(items)} article(s)",
            "destination_session_id": (order.get("delivery") or {}).get("session_id"),
        }

    async def _save_delivery(self, order: Mapping[str, Any], delivery: Dict[str, Any]) -> Dict[str, Any]:
        delivery = {**delivery, "updated_at": self.clock()}
        await self.orders.update_one({"order_id": order["order_id"]}, {"$set": {"delivery": delivery, "updated_at": self.clock()}})
        return delivery

    @staticmethod
    def _merge(delivery: Mapping[str, Any], denkma_order: Mapping[str, Any]) -> Dict[str, Any]:
        merged = dict(delivery)
        for source, target in (("status", "denkma_status"), ("parcel_status", "parcel_status"), ("tracking_code", "tracking_code"), ("order_id", "denkma_order_id")):
            if denkma_order.get(source) is not None:
                merged[target] = denkma_order[source]
        return merged

    async def register_order(self, account: Mapping[str, Any], order: Mapping[str, Any]) -> Dict[str, Any]:
        """Enregistre la commande chez Denkma avec la destination confirmée et fixe le prix garanti.
        Un échec est conservé sur la commande : l'expédition le reprendra."""
        delivery = dict(order.get("delivery") or {})
        try:
            key = self._key(account)
            saved = await self.api.save_order(key, order["order_id"], self._order_body(account, order))
            delivery = self._merge(delivery, saved)
            if saved.get("status") in ("ready_for_quote",):
                quote = await self.api.order_quote(key, order["order_id"])
                delivery.update({"quote_id": quote.get("quote_id"), "quote_expires_at": quote.get("expires_at")})
            delivery.update({"status": "registered", "error": None})
        except DenkmaError as exc:
            logger.warning("Denkma registration failed for order %s: %s", order.get("order_id"), exc.code)
            delivery.update({"status": "sync_failed", "error": exc.message})
        return await self._save_delivery(order, delivery)

    # --- Expédition --------------------------------------------------------------

    async def ship(self, account: Mapping[str, Any], order: Mapping[str, Any], *, customer_paid: bool,
                   photo: Optional[bytes] = None, photo_type: str = "image/jpeg") -> Dict[str, Any]:
        delivery = dict(order.get("delivery") or {})
        if delivery.get("provider") != "denkma":
            raise DenkmaError(409, "denkma_not_chosen", "Le client n'a pas choisi la livraison Denkma pour cette commande.")
        if order.get("status") in ("cancelled", "rejected", "delivered"):
            raise DenkmaError(409, "order_closed", "Cette commande est déjà clôturée.")
        if not customer_paid:
            raise DenkmaError(422, "payment_required", "Confirmez que le client a payé sa commande : Denkma ne collecte pas le paiement des marchandises.")
        key = self._key(account)
        ref = order["order_id"]
        if delivery.get("status") != "registered":
            delivery = await self.register_order(account, order)
            if delivery.get("status") != "registered":
                raise DenkmaError(409, "denkma_sync", delivery.get("error") or "La commande n'a pas pu être enregistrée chez Denkma.")
        try:
            current = await self.api.payment_confirmed(key, ref)
            if current.get("status") == "ready_for_quote":
                # Le prix garanti au client a expiré : nouveau devis, puis réservation.
                quote = await self.api.order_quote(key, ref)
                current = (await self.api.reserve(key, ref, quote["quote_id"])).get("order") or current
            status = current.get("status")
            if status == "awaiting_funding":
                raise _refusal(402, None)
            if status in ("draft", "awaiting_destination"):
                raise DenkmaError(422, "denkma_incomplete", "La position du client ou le point relais n'est pas confirmé chez Denkma.")
            if status not in ("funded", "prepared", *SHIPPED_STATUSES):
                raise DenkmaError(409, "denkma_state", "La commande Denkma n'est pas prête à partir. Actualisez-la puis réessayez.")
            if not current.get("photo_ready") and status not in SHIPPED_STATUSES:
                if not photo:
                    raise DenkmaError(422, "photo_required", "Ajoutez la photo du colis : Denkma la demande avant l'enlèvement.")
                await self.api.photo(key, ref, photo, photo_type)
            if status == "funded":
                current = await self.api.prepared(key, ref)
            if current.get("status") == "prepared":
                current = await self.api.dispatch(key, ref)
        except DenkmaError as exc:
            await self._save_delivery(order, {**delivery, "error": exc.message})
            raise
        delivery = self._merge(delivery, current)
        delivery.update({"error": None, "shipped_at": delivery.get("shipped_at") or self.clock()})
        return await self._save_delivery(order, delivery)

    async def cancel_order(self, account: Mapping[str, Any], order: Mapping[str, Any]) -> None:
        """Commande annulée dans Stockman : sa livraison Denkma pas encore partie est annulée,
        ce qui libère le transport réservé. Un refus de Denkma n'empêche pas l'annulation."""
        delivery = dict(order.get("delivery") or {})
        if delivery.get("provider") != "denkma" or delivery.get("status") != "registered":
            return
        if delivery.get("denkma_status") in (*SHIPPED_STATUSES, "cancelled"):
            return
        try:
            current = await self.api.cancel(self._key(account), order["order_id"])
            await self._save_delivery(order, self._merge(delivery, current))
        except DenkmaError as exc:
            logger.warning("Denkma cancellation failed for order %s: %s", order.get("order_id"), exc.code)

    async def refresh(self, account: Mapping[str, Any], order: Mapping[str, Any]) -> Dict[str, Any]:
        delivery = dict(order.get("delivery") or {})
        if delivery.get("provider") != "denkma":
            raise DenkmaError(409, "denkma_not_chosen", "Le client n'a pas choisi la livraison Denkma pour cette commande.")
        current = await self.api.order(self._key(account), order["order_id"])
        delivery = await self._save_delivery(order, self._merge(delivery, current))
        if delivery.get("parcel_status") == "delivered" and self.on_delivered:
            await self.on_delivered({**order, "delivery": delivery})
        return delivery

    # --- Événements --------------------------------------------------------------

    async def handle_event(self, hook_id: str, signature: Optional[str], raw: bytes) -> Dict[str, Any]:
        account = await self.accounts.find_one({"ecommerce_denkma.hook_id": hook_id}, {"_id": 0}) if hook_id else None
        link = self.connection(account or {})
        if not link:
            raise DenkmaError(404, "denkma_hook", "Connexion inconnue.")
        stamp, digest = parse_signature(signature)
        if stamp is None or not digest or abs(time.time() - stamp) > SIGNATURE_TOLERANCE_SECONDS:
            raise DenkmaError(401, "denkma_signature", "Signature absente ou périmée.")
        try:
            expected = sign(self._box_factory().open(link["webhook_secret"]), stamp, raw)
        except Exception:
            raise DenkmaError(401, "denkma_signature", "Secret de connexion illisible : reconnectez Denkma.")
        if not hmac.compare_digest(expected, digest):
            raise DenkmaError(401, "denkma_signature", "Signature invalide.")
        try:
            event = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            raise DenkmaError(400, "denkma_event", "Événement illisible.")
        data = event.get("data") if isinstance(event.get("data"), dict) else {}
        reference = str(data.get("external_ref") or "")
        order = await self.orders.find_one({"order_id": reference, "account_id": account.get("account_id")}, {"_id": 0}) if reference else None
        if not order:
            # Une commande retirée ne doit pas provoquer de nouvelles tentatives inutiles.
            return {"handled": False}
        delivery = dict(order.get("delivery") or {})
        seen = list(delivery.get("events") or [])
        event_id = str(event.get("id") or "")
        if event_id and event_id in seen:
            return {"handled": True, "duplicate": True}
        delivery = self._merge(delivery, data)
        delivery["events"] = (seen + ([event_id] if event_id else []))[-MAX_EVENTS:]
        delivery["last_event"] = {"type": event.get("type"), "at": self.clock()}
        if delivery.get("parcel_status") == "delivered":
            delivery["delivered_at"] = delivery.get("delivered_at") or self.clock()
        delivery = await self._save_delivery(order, delivery)
        if delivery.get("parcel_status") == "delivered" and self.on_delivered:
            await self.on_delivered({**order, "delivery": delivery})
        return {"handled": True}
