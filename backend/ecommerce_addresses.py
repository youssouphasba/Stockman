"""Adresses publiques d'un site e-commerce : adresse Stockman et nom de domaine du commerçant.

Fonctions pures, sans accès à la base ni au réseau : le serveur et les tests les partagent.
"""

import re
import unicodedata
from dataclasses import dataclass
from typing import Dict, List, Optional
from urllib.parse import urlsplit

SLUG_MAX_LENGTH = 50
# Lettres qui ne se décomposent pas en lettre + accent.
_LIGATURES = {"œ": "oe", "æ": "ae", "ß": "ss", "ø": "o", "đ": "d", "ł": "l", "ı": "i"}

# Suffixes publics à deux niveaux les plus courants : « maboutique.com.sn » est un domaine nu,
# pas un sous-domaine de « com.sn ».
MULTI_LABEL_SUFFIXES = frozenset({
    "co.uk", "org.uk", "me.uk", "com.au", "net.au", "org.au", "co.nz",
    "co.za", "org.za", "com.ng", "com.gh", "co.ke", "co.tz", "co.ug", "com.sn", "co.ci", "com.cm",
    "com.gn", "com.mg", "com.tn", "com.dz", "co.ma", "com.eg",
    "com.br", "com.mx", "com.ar", "com.co", "co.jp", "co.in", "co.kr", "com.cn", "com.hk", "com.sg",
    "com.my", "com.tr", "com.ua", "com.pl",
})
# Domaines de Stockman et de ses hébergeurs : jamais connectés comme domaine d'un commerçant.
RESERVED_DOMAINS = ("stockman.pro", "vercel.app", "vercel.com", "railway.app", "localhost")
_HOST_RE = re.compile(r"(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]")


def normalize_ecommerce_slug(value: Optional[str]) -> str:
    """Fin de l'adresse Stockman : « Épicerie Senlab » devient « epicerie-senlab »."""
    text = "".join(_LIGATURES.get(char, char) for char in (value or "").strip().lower())
    text = "".join(char for char in unicodedata.normalize("NFKD", text) if not unicodedata.combining(char))
    slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:SLUG_MAX_LENGTH].strip("-")
    if not slug:
        return "boutique"
    # L'adresse publique exige au moins deux caractères.
    return slug if len(slug) >= 2 else f"boutique-{slug}"


class DomainInputError(ValueError):
    """Domaine refusé, avec un message prêt à afficher au commerçant."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class DomainTarget:
    """Domaine à connecter : adresse principale du site et domaine nu redirigé vers elle."""

    host: str
    apex: str
    redirect_from: Optional[str] = None

    @property
    def hosts(self) -> List[str]:
        return [self.host] + ([self.redirect_from] if self.redirect_from else [])


def parse_domain_input(value: Optional[str]) -> DomainTarget:
    """Lit le domaine saisi par le commerçant.

    « senlab.com », « www.senlab.com » ou « https://www.senlab.com/ » connectent www.senlab.com,
    et senlab.com y redirige. Un sous-domaine (« boutique.senlab.com ») est connecté seul."""
    raw = (value or "").strip().lower()
    if not raw:
        raise DomainInputError("empty", "Saisissez votre nom de domaine, par exemple senlab.com.")
    if " " in raw:
        raise DomainInputError("invalid", "Un nom de domaine ne contient pas d'espace.")
    try:
        host = (urlsplit(raw if "://" in raw else f"https://{raw}").hostname or "").strip(".")
        host = host.encode("idna").decode("ascii")
    except (UnicodeError, ValueError):
        raise DomainInputError("invalid", "Ce nom de domaine n'est pas valide. Vérifiez son orthographe.")
    if not host or len(host) > 253 or not _HOST_RE.fullmatch(host):
        raise DomainInputError("invalid", "Ce nom de domaine n'est pas valide. Vérifiez son orthographe, par exemple senlab.com.")
    if any(host == reserved or host.endswith(f".{reserved}") for reserved in RESERVED_DOMAINS):
        raise DomainInputError("reserved", "Cette adresse appartient déjà à Stockman : saisissez un domaine que vous avez acheté.")
    labels = host.split(".")
    suffix_size = 2 if ".".join(labels[-2:]) in MULTI_LABEL_SUFFIXES else 1
    if len(labels) <= suffix_size:
        raise DomainInputError("incomplete", "Ce nom de domaine est incomplet, par exemple senlab.com.")
    apex = ".".join(labels[-(suffix_size + 1):])
    if host in (apex, f"www.{apex}"):
        return DomainTarget(host=f"www.{apex}", apex=apex, redirect_from=apex)
    return DomainTarget(host=host, apex=apex)


def record_name(fqdn: str, apex: str) -> str:
    """Nom à saisir chez le fournisseur du domaine : « @ » pour le domaine nu, sinon le préfixe."""
    return "@" if fqdn == apex else fqdn[: -(len(apex) + 1)]


def expected_records(target: DomainTarget, cname_target: str, apex_ipv4: str) -> List[Dict[str, str]]:
    """Enregistrements DNS à créer, dans l'ordre où le commerçant doit les lire."""
    records = [{
        "type": "CNAME", "name": record_name(target.host, target.apex), "host": target.host,
        "value": cname_target, "purpose": "site",
    }]
    if target.redirect_from:
        records.append({"type": "A", "name": "@", "host": target.redirect_from, "value": apex_ipv4, "purpose": "redirect"})
    return records
