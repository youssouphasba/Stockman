from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set


PERMISSION_MODULES = ("pos", "stock", "accounting", "crm", "suppliers", "staff")
VALID_PERMISSION_LEVELS = {"none", "read", "write"}
NOTIFICATION_CONTACT_KEYS = ("default", "stock", "procurement", "finance", "crm", "operations", "billing")
NOTIFICATION_CHANNELS = ("in_app", "push", "email")
NOTIFICATION_SEVERITY_LEVELS = ("info", "warning", "critical")
SUBSCRIPTION_ACCESS_PHASES = ("active", "grace", "restricted", "read_only")
USER_SELF_SETTING_FIELDS: Set[str] = {
    "language",
    "push_notifications",
    "notification_preferences",
    "expense_categories",
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
    "store_notification_contacts",
    "receipt_business_name",
    "receipt_footer",
    "invoice_business_name",
    "invoice_business_address",
    "invoice_label",
    "invoice_prefix",
    "invoice_footer",
    "invoice_payment_terms",
    "tax_enabled",
    "tax_rate",
    "tax_mode",
}
ACCOUNT_SHARED_SETTING_FIELDS: Set[str] = {"modules", "notification_contacts"}
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


def normalize_expense_categories(categories: Optional[List[str]]) -> List[str]:
    seen: Set[str] = set()
    normalized: List[str] = []
    for category in categories or []:
        value = str(category or "").strip()
        if not value:
            continue
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(value)
    return normalized


def default_notification_contacts() -> Dict[str, List[str]]:
    return {key: [] for key in NOTIFICATION_CONTACT_KEYS}


def default_notification_preferences() -> Dict[str, Any]:
    return {
        "in_app": True,
        "push": True,
        "email": False,
        "minimum_severity_for_push": "warning",
        "minimum_severity_for_email": "critical",
    }


def _normalize_email_list(value: Any) -> List[str]:
    if isinstance(value, str):
        candidates = [part.strip().lower() for part in value.replace(";", ",").split(",")]
    elif isinstance(value, list):
        candidates = [str(part).strip().lower() for part in value]
    else:
        candidates = []

    emails: List[str] = []
    for candidate in candidates:
        if not candidate or "@" not in candidate:
            continue
        local_part, _, domain = candidate.partition("@")
        if not local_part or "." not in domain:
            continue
        if candidate not in emails:
            emails.append(candidate)
    return emails


def normalize_notification_contacts(value: Any) -> Dict[str, List[str]]:
    normalized = default_notification_contacts()
    if not isinstance(value, dict):
        return normalized

    for key in NOTIFICATION_CONTACT_KEYS:
        normalized[key] = _normalize_email_list(value.get(key))
    return normalized


def normalize_notification_preferences(value: Any, push_enabled: bool = True) -> Dict[str, Any]:
    normalized = default_notification_preferences()
    normalized["push"] = push_enabled
    if not isinstance(value, dict):
        return normalized

    for key in ("in_app", "push", "email"):
        if key in value:
            normalized[key] = bool(value.get(key))

    for key in ("minimum_severity_for_push", "minimum_severity_for_email"):
        severity = value.get(key)
        if severity in NOTIFICATION_SEVERITY_LEVELS:
            normalized[key] = severity
    return normalized


def normalize_plan(plan: Optional[str]) -> str:
    if plan == "premium":
        return "enterprise"
    return plan or "starter"


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return max(0, int(raw))
    except ValueError:
        return default


PAID_SUBSCRIPTION_GRACE_DAYS = _int_env("PAID_SUBSCRIPTION_GRACE_DAYS", 7)
TRIAL_SUBSCRIPTION_GRACE_DAYS = _int_env("TRIAL_SUBSCRIPTION_GRACE_DAYS", 3)
SUBSCRIPTION_READ_ONLY_AFTER_DAYS = _int_env("SUBSCRIPTION_READ_ONLY_AFTER_DAYS", 30)


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


def compute_subscription_access_policy(source_doc: Optional[dict]) -> Dict[str, Any]:
    source = source_doc or {}
    now = datetime.now(timezone.utc)
    status = source.get("subscription_status") or "active"
    provider = source.get("subscription_provider") or "none"
    subscription_end = source.get("subscription_end")
    trial_ends_at = source.get("trial_ends_at")
    manual_grace_until = source.get("manual_access_grace_until")
    manual_read_only_enabled = bool(source.get("manual_read_only_enabled"))

    is_paying = provider not in ("none", "", None) or bool(subscription_end)
    anchor = subscription_end or trial_ends_at
    if anchor and not anchor.tzinfo:
        anchor = anchor.replace(tzinfo=timezone.utc)
    if manual_grace_until and not manual_grace_until.tzinfo:
        manual_grace_until = manual_grace_until.replace(tzinfo=timezone.utc)

    phase = "active"
    grace_until = None
    read_only_after = None

    if anchor and anchor < now:
        grace_days = PAID_SUBSCRIPTION_GRACE_DAYS if is_paying else TRIAL_SUBSCRIPTION_GRACE_DAYS
        grace_until = anchor + timedelta(days=grace_days)
        if manual_grace_until and manual_grace_until > grace_until:
            grace_until = manual_grace_until
        read_only_after = grace_until + timedelta(days=SUBSCRIPTION_READ_ONLY_AFTER_DAYS)
        if now <= grace_until:
            phase = "grace"
        elif manual_read_only_enabled:
            phase = "read_only"
        elif now <= read_only_after:
            phase = "restricted"
        else:
            phase = "restricted"
    elif manual_grace_until and manual_grace_until > now:
        phase = "grace"
        grace_until = manual_grace_until
        read_only_after = grace_until + timedelta(days=SUBSCRIPTION_READ_ONLY_AFTER_DAYS)
    elif manual_read_only_enabled:
        phase = "read_only"

    return {
        "subscription_access_phase": phase,
        "grace_until": grace_until,
        "read_only_after": read_only_after,
        "manual_read_only_enabled": manual_read_only_enabled,
        "requires_payment_attention": phase != "active" or status in {"expired", "cancelled"},
        "can_write_data": phase in {"active", "grace", "restricted"},
        "can_use_advanced_features": phase in {"active", "grace"},
        "is_paying": is_paying,
        "status": status,
        "provider": provider,
    }


def build_effective_access_context(user_doc: dict, account_doc: Optional[dict] = None) -> Dict[str, Any]:
    allowed_store_ids = resolve_allowed_store_ids(user_doc, account_doc)
    active_store_id = resolve_active_store_id(user_doc, allowed_store_ids)
    account_roles = normalize_account_roles(user_doc)
    effective_permissions = build_effective_permissions(user_doc, account_doc=account_doc, active_store_id=active_store_id)
    subscribed_plan = normalize_plan((account_doc or {}).get("plan") or user_doc.get("plan"))
    effective_status = (account_doc or {}).get("subscription_status") or user_doc.get("subscription_status", "active")
    access_policy = compute_subscription_access_policy(account_doc or user_doc)
    effective_plan = subscribed_plan if access_policy["can_use_advanced_features"] else "starter"
    return {
        "account_roles": account_roles,
        "effective_permissions": effective_permissions,
        "effective_plan": effective_plan,
        "subscribed_plan": subscribed_plan,
        "effective_subscription_status": effective_status,
        "subscription_access_phase": access_policy["subscription_access_phase"],
        "grace_until": access_policy["grace_until"],
        "read_only_after": access_policy["read_only_after"],
        "manual_read_only_enabled": access_policy["manual_read_only_enabled"],
        "requires_payment_attention": access_policy["requires_payment_attention"],
        "can_write_data": access_policy["can_write_data"],
        "can_use_advanced_features": access_policy["can_use_advanced_features"],
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
    owner_email = owner_doc.get("email")
    notification_contacts = default_notification_contacts()
    if owner_email:
        notification_contacts["default"] = [owner_email]
        notification_contacts["billing"] = [owner_email]
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
        "country_code": owner_doc.get("country_code", "SN"),
        "modules": (owner_settings or {}).get("modules") or default_modules(),
        "notification_contacts": normalize_notification_contacts(
            (owner_settings or {}).get("notification_contacts") or notification_contacts
        ),
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
    notification_preferences = normalize_notification_preferences(
        user_settings.get("notification_preferences"),
        push_enabled=user_settings.get("push_notifications", True),
    )
    notification_contacts = normalize_notification_contacts((account_doc or {}).get("notification_contacts"))
    billing_contact_email = (account_doc or {}).get("billing_contact_email")
    if billing_contact_email:
        if billing_contact_email not in notification_contacts["billing"]:
            notification_contacts["billing"].append(billing_contact_email)
        if not notification_contacts["default"]:
            notification_contacts["default"].append(billing_contact_email)

    store_settings = active_store_doc or {}
    store_notification_contacts = normalize_notification_contacts(store_settings.get("store_notification_contacts"))
    terminals = store_settings.get("terminals")
    if terminals is None:
        terminals = user_settings.get("terminals") or []
    receipt_business_name = store_settings.get("receipt_business_name")
    if receipt_business_name is None:
        receipt_business_name = user_settings.get("receipt_business_name")
    receipt_footer = store_settings.get("receipt_footer")
    if receipt_footer is None:
        receipt_footer = user_settings.get("receipt_footer")
    invoice_business_name = store_settings.get("invoice_business_name")
    if invoice_business_name is None:
        invoice_business_name = user_settings.get("invoice_business_name")
    invoice_business_address = store_settings.get("invoice_business_address")
    if invoice_business_address is None:
        invoice_business_address = user_settings.get("invoice_business_address")
    invoice_label = store_settings.get("invoice_label")
    if invoice_label is None:
        invoice_label = user_settings.get("invoice_label")
    invoice_prefix = store_settings.get("invoice_prefix")
    if invoice_prefix is None:
        invoice_prefix = user_settings.get("invoice_prefix")
    invoice_footer = store_settings.get("invoice_footer")
    if invoice_footer is None:
        invoice_footer = user_settings.get("invoice_footer")
    invoice_payment_terms = store_settings.get("invoice_payment_terms")
    if invoice_payment_terms is None:
        invoice_payment_terms = user_settings.get("invoice_payment_terms")
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
        "notification_preferences": notification_preferences,
        "expense_categories": normalize_expense_categories(user_settings.get("expense_categories")),
        "notification_contacts": notification_contacts,
        "store_notification_contacts": store_notification_contacts,
        "dashboard_layout": web_preferences.get("dashboard_layout") or default_dashboard_layout(),
        "terminals": terminals,
        "tax_enabled": bool(tax_enabled),
        "tax_rate": float(tax_rate or 0.0),
        "tax_mode": tax_mode or "ttc",
        "receipt_business_name": receipt_business_name,
        "receipt_footer": receipt_footer,
        "invoice_business_name": invoice_business_name,
        "invoice_business_address": invoice_business_address,
        "invoice_label": invoice_label,
        "invoice_prefix": invoice_prefix,
        "invoice_footer": invoice_footer,
        "invoice_payment_terms": invoice_payment_terms,
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
