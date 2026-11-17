"""Périmètres d'accès de l'équipe Stockman à l'admin.

Le superadmin a tous les droits. Un membre d'équipe (rôle ``admin``) n'accède
qu'aux périmètres qui lui ont été accordés : support, finance, comptes, catalogue,
communication, statistiques. Les réglages sensibles (accès de l'équipe, base de
données, sécurité, modules, journal admin) restent réservés au superadmin.

La décision se fait sur le chemin réel de la requête, sans le préfixe ``/api``.
La première règle qui correspond l'emporte.
"""

import re
from typing import Dict, Iterable, List, Optional, Tuple

SHARED = "*"

SCOPES: Dict[str, Dict[str, object]] = {
    "support": {
        "label": "Support",
        "description": "Tickets, litiges et messages aux clients.",
        "sections": ["support", "disputes"],
    },
    "finance": {
        "label": "Finance",
        "description": "Abonnements, liens de paiement, MRR et conversion.",
        "sections": ["finance", "subscriptions", "mrr"],
    },
    "accounts": {
        "label": "Comptes",
        "description": "Utilisateurs, boutiques, clients des commerçants et démos.",
        "sections": ["users", "stores", "crm", "demos"],
    },
    "catalog": {
        "label": "Catalogue",
        "description": "Catalogue partagé, produits et adoption.",
        "sections": ["products", "catalog", "catalog_adoption"],
    },
    "communication": {
        "label": "Communication",
        "description": "Annonces, mises à jour mobiles et textes légaux.",
        "sections": ["broadcast", "app_updates", "legal"],
    },
    "stats": {
        "label": "Statistiques",
        "description": "Indicateurs, rétention et usage de l'IA.",
        "sections": ["retention", "ai_usage"],
    },
}

# Sections visibles par tout membre de l'équipe.
SHARED_SECTIONS = ["overview", "notifications"]

_RULES: List[Tuple[re.Pattern, Optional[str]]] = [(re.compile(pattern), scope) for pattern, scope in (
    # Réservé au superadmin, même si un périmètre plus large semble correspondre.
    (r"^/admin/users/[^/]+/admin-access$", None),
    (r"^/admin/users/bulk-plan$", None),
    (r"^/admin/team$", None),
    # Ouvert à toute l'équipe.
    (r"^/admin/(today|search|me/access)$", SHARED),
    (r"^/admin/notifications(/|$)", SHARED),
    (r"^/admin/users/[^/]+/detail$", SHARED),
    # Périmètres.
    (r"^/admin/(support|disputes|messages)(/|$)", "support"),
    (r"^/admin/(subscriptions|generate-payment-link)(/|$)", "finance"),
    (r"^/admin/stats/(mrr|conversion)$", "finance"),
    (r"^/admin/(users|stores|customers|demo-sessions|verification-events|inventory)(/|$)", "accounts"),
    (r"^/admin/(catalog|products|marketplace)(/|$)", "catalog"),
    (r"^/admin/stats/catalog-adoption$", "catalog"),
    (r"^/admin/(broadcast|app-updates|cgu|privacy)(/|$)", "communication"),
    (r"^/admin/stats(/|$)", "stats"),
)]


def normalize_scopes(scopes: Iterable[str]) -> List[str]:
    return [scope for scope in SCOPES if scope in set(scopes or [])]


def route_scope(path: str) -> Optional[str]:
    """Périmètre exigé par un chemin ; None signifie réservé au superadmin."""
    if path.startswith("/api/"):
        path = path[4:]
    for pattern, scope in _RULES:
        if pattern.search(path):
            return scope
    return None


def can_access(role: Optional[str], scopes: Iterable[str], path: str) -> bool:
    if role == "superadmin":
        return True
    if role != "admin":
        return False
    required = route_scope(path)
    if required is None:
        return False
    return required == SHARED or required in set(scopes or [])


def access_view(role: Optional[str], scopes: Iterable[str]) -> Dict[str, object]:
    """Ce que l'interface admin doit montrer à ce membre de l'équipe."""
    if role == "superadmin":
        granted = list(SCOPES)
        sections: Optional[List[str]] = None  # toutes
    else:
        granted = normalize_scopes(scopes) if role == "admin" else []
        sections = list(SHARED_SECTIONS) if role == "admin" else []
        for scope in granted:
            sections.extend(s for s in SCOPES[scope]["sections"] if s not in sections)
    return {
        "role": role,
        "is_superadmin": role == "superadmin",
        "scopes": granted,
        "sections": sections,
        "catalog": [{"key": key, "label": meta["label"], "description": meta["description"]} for key, meta in SCOPES.items()],
    }
