from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set


PERMISSION_MODULES = ("pos", "stock", "accounting", "crm", "suppliers", "staff")
VALID_PERMISSION_LEVELS = {"none", "read", "write"}
USER_SELF_SETTING_FIELDS: Set[str] = {
    "language",
    "push_notifications",
    "simple_mode",
    "mobile_preferences",
    "web_preferences",
    "dashboard_layout",
    "user_name",
}
ORG_ADMIN_SETTING_FIELDS: Set[str] = {
    "loyalty",
    "reminder_rules",
}
STORE_SCOPED_SETTING_FIELDS: Set[str] = {
    "terminals",
    "receipt_business_name",
    "receipt_footer",
    "tax_enabled",
    "tax_rate",
    "tax_mode",
}
ACCOUNT_SHARED_SETTING_FIELDS: Set[str] = {"modules"}
BILLING_ADMIN_SETTING_FIELDS: Set[str] = {"billing_contact_name", "billing_contact_email"}
ALL_ALLOWED_SETTING_FIELDS: Set[str] = (
    USER_SELF_SETTING_FIELDS
    | ORG_ADMIN_SETTING_FIELDS
    | STORE_SCOPED_SETTING_FIELDS
    | ACCOUNT_SHARED_SETTING_FIELDS
    | BILLING_ADMIN_SETTING_FIELDS
)


def default_modules() -> Dict[str, bool]:
    return {
        "stock_management": True,
        "alerts": True,
        "rules": True,
        "statistics": True,
        "history": True,
        "export": True,
        "crm": True,
        "suppliers": True,
        "orders": True,
        "accounting": True,
        "reservations": True,
        "kitchen": True,
    }


def default_dashboard_layout() -> Dict[str, bool]:
    return {
        "show_kpi": True,
        "show_stock_status": True,
        "show_smart_reminders": True,
        "show_forecast": True,
        "show_recent_alerts": True,
        "show_recent_sales": True,
        "show_stock_chart": True,
        "show_category_chart": True,
        "show_abc_analysis": True,
        "show_reorder": True,
        "show_inventory_tasks": True,
        "show_expiry_alerts": True,
        "show_profitability": True,
    }


def normalize_plan(plan: Optional[str]) -> str:
    if plan == "premium":
        return "enterprise"
    return plan or "starter"


def normalize_account_roles(user_doc: dict) -> List[str]:
    roles = list(dict.fromkeys(user_doc.get("account_roles") or []))
    if user_doc.get("role") in ("shopkeeper", "admin", "superadmin"):
        for role in ("billing_admin", "org_admin"):
            if role not in roles:
                roles.append(role)
    return roles


def is_org_admin_doc(user_doc: dict) -> bool:
    return "org_admin" in normalize_account_roles(user_doc)


def is_billing_admin_doc(user_doc: dict) -> bool:
    return "billing_admin" in normalize_account_roles(user_doc)


def normalize_permission_map(permissions: Optional[dict]) -> Dict[str, str]:
    normalized = {module: "none" for module in PERMISSION_MODULES}
    for module, level in (permissions or {}).items():
        if module in normalized and level in VALID_PERMISSION_LEVELS:
            normalized[module] = level
    return normalized


def normalize_store_permissions(store_permissions: Optional[dict]) -> Dict[str, Dict[str, str]]:
    normalized: Dict[str, Dict[str, str]] = {}
    for store_id, permission_map in (store_permissions or {}).items():
        if not isinstance(store_id, str) or not isinstance(permission_map, dict):
            continue
        normalized_map = {
            module: level
            for module, level in normalize_permission_map(permission_map).items()
            if level != "none"
        }
        normalized[store_id] = normalized_map
    return normalized


def resolve_account_store_ids(account_doc: Optional[dict], owner_doc: Optional[dict] = None) -> List[str]:
    store_ids = list(dict.fromkeys((account_doc or {}).get("store_ids") or (owner_doc or {}).get("store_ids") or []))
    return [store_id for store_id in store_ids if isinstance(store_id, str)]


def resolve_allowed_store_ids(user_doc: dict, account_doc: Optional[dict] = None) -> List[str]:
    account_store_ids = resolve_account_store_ids(account_doc, user_doc)
    if user_doc.get("role") == "superadmin" or is_org_admin_doc(user_doc):
        return account_store_ids or list(dict.fromkeys(user_doc.get("store_ids") or []))

    requested_store_ids = [store_id for store_id in (user_doc.get("store_ids") or []) if store_id in account_store_ids]
    if requested_store_ids:
        return requested_store_ids

    active_store_id = user_doc.get("active_store_id")
    if active_store_id in account_store_ids:
        return [active_store_id]

    if account_store_ids:
        return [account_store_ids[0]]

    return []


def resolve_active_store_id(user_doc: dict, allowed_store_ids: List[str]) -> Optional[str]:
    active_store_id = user_doc.get("active_store_id")
    if active_store_id in allowed_store_ids:
        return active_store_id
    return allowed_store_ids[0] if allowed_store_ids else active_store_id


def user_can_access_store(
    user_doc: dict,
    store_id: Optional[str],
    account_doc: Optional[dict] = None,
) -> bool:
    if not store_id:
        return True
    if user_doc.get("role") == "superadmin" or is_org_admin_doc(user_doc):
        return True
    return store_id in resolve_allowed_store_ids(user_doc, account_doc)


def build_effective_permissions(
    user_doc: dict,
    account_doc: Optional[dict] = None,
    active_store_id: Optional[str] = None,
) -> Dict[str, str]:
    permissions = normalize_permission_map(user_doc.get("permissions"))
    if user_doc.get("role") == "superadmin" or is_org_admin_doc(user_doc):
        return {module: "write" for module in PERMISSION_MODULES}

    target_store_id = active_store_id or resolve_active_store_id(user_doc, resolve_allowed_store_ids(user_doc, account_doc))
    store_permissions = normalize_store_permissions(user_doc.get("store_permissions"))
    if target_store_id and target_store_id in store_permissions:
        permissions.update(store_permissions[target_store_id])
    return permissions


def user_has_operational_access(
    user_doc: dict,
    account_doc: Optional[dict] = None,
    active_store_id: Optional[str] = None,
) -> bool:
    if user_doc.get("role") == "superadmin" or is_org_admin_doc(user_doc):
        return True
    effective_permissions = build_effective_permissions(user_doc, account_doc=account_doc, active_store_id=active_store_id)
    return any(
        effective_permissions.get(module) in ("read", "write")
        for module in PERMISSION_MODULES
    )


def build_effective_access_context(user_doc: dict, account_doc: Optional[dict] = None) -> Dict[str, Any]:
    allowed_store_ids = resolve_allowed_store_ids(user_doc, account_doc)
    active_store_id = resolve_active_store_id(user_doc, allowed_store_ids)
    account_roles = normalize_account_roles(user_doc)
    effective_permissions = build_effective_permissions(user_doc, account_doc=account_doc, active_store_id=active_store_id)
    effective_plan = normalize_plan((account_doc or {}).get("plan") or user_doc.get("plan"))
    effective_status = (account_doc or {}).get("subscription_status") or user_doc.get("subscription_status", "active")
    return {
        "account_roles": account_roles,
        "effective_permissions": effective_permissions,
        "effective_plan": effective_plan,
        "effective_subscription_status": effective_status,
        "store_ids": allowed_store_ids,
        "active_store_id": active_store_id,
        "store_permissions": normalize_store_permissions(user_doc.get("store_permissions")),
        "has_operational_access": user_has_operational_access(
            user_doc,
            account_doc=account_doc,
            active_store_id=active_store_id,
        ),
    }


def seed_business_account(owner_doc: dict, owner_settings: Optional[dict] = None) -> Dict[str, Any]:
    owner_id = owner_doc.get("parent_user_id") or owner_doc.get("user_id")
    return {
        "account_id": owner_doc.get("account_id") or f"acct_{owner_id}",
        "owner_user_id": owner_id,
        "business_type": owner_doc.get("business_type"),
        "store_ids": list(dict.fromkeys(owner_doc.get("store_ids") or [])),
        "plan": normalize_plan(owner_doc.get("plan")),
        "subscription_status": owner_doc.get("subscription_status", "active"),
        "subscription_provider": owner_doc.get("subscription_provider", "none"),
        "subscription_provider_id": owner_doc.get("subscription_provider_id"),
        "subscription_end": owner_doc.get("subscription_end"),
        "trial_ends_at": owner_doc.get("trial_ends_at"),
        "currency": owner_doc.get("currency", "XOF"),
        "modules": (owner_settings or {}).get("modules") or default_modules(),
        "billing_contact_name": owner_doc.get("name"),
        "billing_contact_email": owner_doc.get("email"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def merge_effective_settings(
    user_id: str,
    account_id: Optional[str],
    user_settings: Optional[dict] = None,
    account_doc: Optional[dict] = None,
    active_store_doc: Optional[dict] = None,
) -> Dict[str, Any]:
    user_settings = dict(user_settings or {})
    mobile_preferences = dict(user_settings.get("mobile_preferences") or {})
    web_preferences = dict(user_settings.get("web_preferences") or {})

    if "simple_mode" not in mobile_preferences:
        mobile_preferences["simple_mode"] = user_settings.get("simple_mode", False)
    if "show_manager_zone" not in mobile_preferences:
        mobile_preferences["show_manager_zone"] = True

    if "dashboard_layout" not in web_preferences:
        web_preferences["dashboard_layout"] = user_settings.get("dashboard_layout") or default_dashboard_layout()

    modules = (account_doc or {}).get("modules") or user_settings.get("modules") or default_modules()

    store_settings = active_store_doc or {}
    terminals = store_settings.get("terminals")
    if terminals is None:
        terminals = user_settings.get("terminals") or []
    receipt_business_name = store_settings.get("receipt_business_name")
    if receipt_business_name is None:
        receipt_business_name = user_settings.get("receipt_business_name")
    receipt_footer = store_settings.get("receipt_footer")
    if receipt_footer is None:
        receipt_footer = user_settings.get("receipt_footer")
    tax_enabled = store_settings.get("tax_enabled")
    if tax_enabled is None:
        tax_enabled = user_settings.get("tax_enabled", False)
    tax_rate = store_settings.get("tax_rate")
    if tax_rate is None:
        tax_rate = user_settings.get("tax_rate", 0.0)
    tax_mode = store_settings.get("tax_mode")
    if tax_mode is None:
        tax_mode = user_settings.get("tax_mode", "ttc")

    return {
        "settings_id": user_settings.get("settings_id"),
        "user_id": user_id,
        "account_id": account_id,
        "loyalty": user_settings.get("loyalty") or {},
        "reminder_rules": user_settings.get("reminder_rules") or {},
        "modules": modules,
        "simple_mode": mobile_preferences.get("simple_mode", False),
        "mobile_preferences": mobile_preferences,
        "web_preferences": web_preferences,
        "language": user_settings.get("language", "fr"),
        "push_notifications": user_settings.get("push_notifications", True),
        "dashboard_layout": web_preferences.get("dashboard_layout") or default_dashboard_layout(),
        "terminals": terminals,
        "tax_enabled": bool(tax_enabled),
        "tax_rate": float(tax_rate or 0.0),
        "tax_mode": tax_mode or "ttc",
        "receipt_business_name": receipt_business_name,
        "receipt_footer": receipt_footer,
        "billing_contact_name": (account_doc or {}).get("billing_contact_name"),
        "billing_contact_email": (account_doc or {}).get("billing_contact_email"),
        "created_at": user_settings.get("created_at") or datetime.now(timezone.utc),
        "updated_at": user_settings.get("updated_at") or datetime.now(timezone.utc),
    }


def partition_settings_update(settings_update: Optional[dict]) -> Dict[str, List[str]]:
    keys = set((settings_update or {}).keys())
    return {
        "user": sorted(keys & USER_SELF_SETTING_FIELDS),
        "org_admin": sorted(keys & ORG_ADMIN_SETTING_FIELDS),
        "store": sorted(keys & STORE_SCOPED_SETTING_FIELDS),
        "account": sorted(keys & ACCOUNT_SHARED_SETTING_FIELDS),
        "billing": sorted(keys & BILLING_ADMIN_SETTING_FIELDS),
        "unknown": sorted(keys - ALL_ALLOWED_SETTING_FIELDS),
    }
