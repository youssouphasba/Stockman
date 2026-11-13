"""Modules de la plateforme activés ou coupés par l'administrateur Stockman.

Un module (aujourd'hui : Fournisseurs) se règle à quatre niveaux, du plus général
au plus précis :

1. le réglage global (``default``) ;
2. le plan du compte (Starter, Pro, Enterprise) ;
3. le type d'activité du compte (épicerie, pharmacie, restaurant…) ;
4. le compte lui-même (``business_accounts.module_overrides``).

Le niveau le plus précis qui a une valeur l'emporte. Un niveau sans valeur laisse
décider le niveau au-dessus. Le réglage s'applique au compte entier : les membres
de l'équipe suivent le compte du propriétaire.
"""

import time
from typing import Any, Dict, Optional, Tuple

from constants.sectors import BUSINESS_SECTORS, normalize_sector

POLICY_KEY = "module_policy"
OVERRIDES_FIELD = "module_overrides"
PLANS = ("starter", "pro", "enterprise")

# Modules réglables et leur valeur quand l'admin n'a encore rien choisi.
MODULES: Dict[str, Dict[str, Any]] = {
    "suppliers": {"label": "Fournisseurs", "default": False},
}

SOURCE_LABELS = {
    "account": "Réglage du compte",
    "business_type": "Type d'activité",
    "plan": "Plan",
    "default": "Réglage global",
}

_CACHE_TTL_SECONDS = 30.0
_cache: Dict[str, Any] = {"policy": None, "at": 0.0}


def _clean_rule_map(raw: Any, allowed: Tuple[str, ...]) -> Dict[str, bool]:
    if not isinstance(raw, dict):
        return {}
    return {key: bool(value) for key, value in raw.items() if key in allowed and isinstance(value, bool)}


def normalize_policy(raw: Optional[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Politique complète et propre : chaque module a un réglage global, par plan et par type d'activité."""
    modules = (raw or {}).get("modules") if isinstance(raw, dict) else None
    modules = modules if isinstance(modules, dict) else {}
    sectors = tuple(BUSINESS_SECTORS.keys())
    policy: Dict[str, Dict[str, Any]] = {}
    for module, meta in MODULES.items():
        rule = modules.get(module) if isinstance(modules.get(module), dict) else {}
        default = rule.get("default")
        policy[module] = {
            "default": default if isinstance(default, bool) else bool(meta["default"]),
            "plans": _clean_rule_map(rule.get("plans"), PLANS),
            "business_types": _clean_rule_map(rule.get("business_types"), sectors),
        }
    return policy


def invalidate_cache() -> None:
    _cache["policy"] = None
    _cache["at"] = 0.0


async def get_policy(db) -> Dict[str, Dict[str, Any]]:
    now = time.monotonic()
    if _cache["policy"] is not None and now - _cache["at"] < _CACHE_TTL_SECONDS:
        return _cache["policy"]
    doc = await db.platform_settings.find_one({"key": POLICY_KEY}, {"_id": 0})
    policy = normalize_policy(doc)
    _cache["policy"] = policy
    _cache["at"] = now
    return policy


async def save_policy(db, raw: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    policy = normalize_policy({"modules": raw})
    await db.platform_settings.update_one(
        {"key": POLICY_KEY},
        {"$set": {"key": POLICY_KEY, "modules": policy}},
        upsert=True,
    )
    invalidate_cache()
    return policy


def resolve(
    policy: Dict[str, Dict[str, Any]],
    module: str,
    plan: Optional[str],
    business_type: Optional[str],
    overrides: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, str]:
    """Renvoie (activé, niveau qui a décidé)."""
    rule = policy.get(module) or normalize_policy(None)[module]
    override = (overrides or {}).get(module)
    if isinstance(override, bool):
        return override, "account"
    sector = normalize_sector(business_type or "")
    if sector in rule["business_types"]:
        return rule["business_types"][sector], "business_type"
    plan_key = (plan or "").lower()
    if plan_key in rule["plans"]:
        return rule["plans"][plan_key], "plan"
    return rule["default"], "default"


async def access_for_account(
    db,
    plan: Optional[str],
    business_type: Optional[str],
    account_doc: Optional[Dict[str, Any]],
    role: Optional[str] = None,
) -> Dict[str, bool]:
    """Modules visibles pour un utilisateur ; l'équipe Stockman et les fournisseurs ne sont pas concernés."""
    if role in {"superadmin", "admin", "supplier"}:
        return {module: True for module in MODULES}
    policy = await get_policy(db)
    overrides = (account_doc or {}).get(OVERRIDES_FIELD) or {}
    return {module: resolve(policy, module, plan, business_type, overrides)[0] for module in MODULES}


async def owner_has_module(db, owner_id: str, module: str) -> bool:
    """Pour les tâches de fond (alertes, rappels) qui ne passent pas par une requête utilisateur."""
    owner = await db.users.find_one(
        {"user_id": owner_id},
        {"_id": 0, "account_id": 1, "plan": 1, "subscription_plan": 1, "business_type": 1, "role": 1},
    ) or {}
    account_id = owner.get("account_id") or f"acct_{owner_id}"
    account = await db.business_accounts.find_one(
        {"account_id": account_id},
        {"_id": 0, "plan": 1, "business_type": 1, OVERRIDES_FIELD: 1},
    ) or {}
    plan = account.get("plan") or owner.get("subscription_plan") or owner.get("plan")
    business_type = account.get("business_type") or owner.get("business_type")
    access = await access_for_account(db, plan, business_type, account, owner.get("role"))
    return bool(access.get(module))


def account_view(
    policy: Dict[str, Dict[str, Any]],
    plan: Optional[str],
    business_type: Optional[str],
    account_doc: Optional[Dict[str, Any]],
) -> Dict[str, Dict[str, Any]]:
    """État de chaque module pour la fiche client de l'admin, avec le niveau qui décide."""
    overrides = (account_doc or {}).get(OVERRIDES_FIELD) or {}
    view: Dict[str, Dict[str, Any]] = {}
    for module, meta in MODULES.items():
        enabled, source = resolve(policy, module, plan, business_type, overrides)
        override = overrides.get(module)
        view[module] = {
            "label": meta["label"],
            "enabled": enabled,
            "source": source,
            "source_label": SOURCE_LABELS[source],
            "override": override if isinstance(override, bool) else None,
        }
    return view


def catalog() -> Dict[str, Any]:
    """Ce que l'admin peut régler : modules, plans et types d'activité."""
    return {
        "modules": [{"key": key, "label": meta["label"]} for key, meta in MODULES.items()],
        "plans": [{"key": plan, "label": plan.capitalize()} for plan in PLANS],
        "business_types": [{"key": key, "label": meta["label"]} for key, meta in BUSINESS_SECTORS.items()],
    }
