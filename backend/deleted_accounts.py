"""Trace des comptes supprimés, affichée dans la liste Utilisateurs de l'admin.

Au moment d'une suppression, on garde une fiche courte : identité, pays, forfait,
dates et origine de la suppression. Aucune donnée commerciale (ventes, produits,
clients) n'est conservée.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

COLLECTION = "deleted_users_archive"

ORIGIN_SELF = "self"
ORIGIN_ADMIN = "admin"

REASONS = {
    ORIGIN_SELF: "Suppression demandée par l’utilisateur (droit à l’oubli)",
    ORIGIN_ADMIN: "Suppression depuis l’admin",
}


def _is_paying(account: Optional[dict]) -> bool:
    provider = str((account or {}).get("subscription_provider") or "none").strip().lower()
    return provider not in ("", "none")


def build_archive_entry(
    user_doc: dict,
    account: Optional[dict],
    origin: str,
    admin: Optional[Dict[str, Any]] = None,
    now: Optional[datetime] = None,
) -> dict:
    account = account or {}
    store_ids = user_doc.get("store_ids")
    return {
        "original_user_id": user_doc.get("user_id"),
        "email": user_doc.get("email"),
        "name": user_doc.get("name"),
        "phone": user_doc.get("phone") or user_doc.get("phone_number"),
        "role": user_doc.get("role"),
        "plan": account.get("plan") or user_doc.get("plan"),
        "subscription_status": account.get("subscription_status") or user_doc.get("subscription_status"),
        "subscription_provider": account.get("subscription_provider") or "none",
        "was_paying": _is_paying(account),
        "trial_ends_at": account.get("trial_ends_at"),
        "country_code": user_doc.get("country_code"),
        "stores_count": len(store_ids) if isinstance(store_ids, list) else None,
        "created_at": user_doc.get("created_at"),
        "last_login_at": user_doc.get("last_login_at") or user_doc.get("last_login"),
        "deleted_at": now or datetime.now(timezone.utc),
        "deleted_by": origin,
        "deleted_by_admin_id": (admin or {}).get("user_id") if origin == ORIGIN_ADMIN else None,
        "deleted_by_admin_name": (admin or {}).get("name") if origin == ORIGIN_ADMIN else None,
        "reason": REASONS.get(origin, REASONS[ORIGIN_SELF]),
    }


async def archive_deleted_account(db, user_doc: dict, account: Optional[dict], origin: str, admin: Optional[Dict[str, Any]] = None) -> dict:
    entry = build_archive_entry(user_doc, account, origin, admin)
    await getattr(db, COLLECTION).insert_one(dict(entry))
    return entry


def to_admin_row(doc: dict) -> dict:
    """Ligne au format de la liste Utilisateurs de l'admin."""
    origin = doc.get("deleted_by") or ORIGIN_SELF
    return {
        "user_id": doc.get("original_user_id"),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "role": doc.get("role"),
        "plan": doc.get("plan"),
        "subscription_status": doc.get("subscription_status"),
        "was_paying": bool(doc.get("was_paying")),
        "country_code": doc.get("country_code"),
        "stores_count": doc.get("stores_count"),
        "created_at": doc.get("created_at"),
        "last_login_at": doc.get("last_login_at"),
        "deleted_at": doc.get("deleted_at"),
        "deleted_by": origin,
        "deleted_by_admin_name": doc.get("deleted_by_admin_name"),
        "is_deleted": True,
    }


async def list_deleted_accounts(db, limit: int = 500) -> List[dict]:
    limit = max(1, min(int(limit or 500), 2000))
    docs = await getattr(db, COLLECTION).find({}, {"_id": 0}).sort("deleted_at", -1).limit(limit).to_list(limit)
    return [to_admin_row(doc) for doc in docs]
