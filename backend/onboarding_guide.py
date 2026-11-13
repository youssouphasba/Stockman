"""Guide interactif de démarrage (application mobile).

Le guide est proposé une seule fois au propriétaire d'un compte commerce :
l'inscription pose l'état « pending » ; un compte plus ancien le reçoit à sa prochaine
ouverture de l'application s'il n'a encore aucun produit (``ensure_state``). Pendant le guide, le produit, le
client et la vente créés pour l'exercice reçoivent l'étiquette ``onboarding_demo`` ;
ils sont supprimés à la fin, avec tout ce qu'ils ont produit (mouvements de stock,
historique de prix, alertes, journal d'activité). Le commerçant peut garder un
produit qu'il a saisi pour de vrai : son stock est alors rétabli comme avant la
vente d'exercice.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

GUIDE_FIELD = "onboarding_guide"
DEMO_TAG = "onboarding_demo"

PENDING = "pending"
ACTIVE = "active"
COMPLETED = "completed"
SKIPPED = "skipped"
# Compte existant qui avait déjà des produits : le guide ne lui est pas imposé.
NOT_NEEDED = "not_needed"
OPEN_STATES = {PENDING, ACTIVE}
FINAL_STATES = {COMPLETED, SKIPPED}

# Étapes connues de l'application : la progression enregistrée doit en faire partie.
STEP_IDS = (
    "welcome",
    "tab_products", "open_add_menu", "add_one", "product_name", "product_purchase_price",
    "product_selling_price", "product_quantity", "product_save",
    "open_add_menu_text", "text_import", "text_input", "text_submit",
    "other_methods", "other_scan", "other_csv", "other_catalog",
    "tab_pos", "pos_products", "pos_pick", "pos_add_customer", "customer_name",
    "customer_save", "pos_pay", "receipt",
    "tab_accounting", "accounting_kpis", "accounting_sales",
    "tab_crm", "crm_customer", "crm_stats", "crm_purchases",
    "finish",
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def initial_state() -> Dict[str, Any]:
    """État posé à l'inscription d'un propriétaire de commerce."""
    return {"status": PENDING}


def _is_shop_owner(user_doc: Optional[Dict[str, Any]]) -> bool:
    return bool(user_doc) and user_doc.get("role") == "shopkeeper" and not user_doc.get("is_demo") and not user_doc.get("parent_user_id")


async def ensure_state(db, user_doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Pose l'état du guide sur un compte créé avant sa mise en ligne.

    Le guide est imposé seulement si le commerçant n'a encore aucun produit ; sinon
    le compte est marqué « not_needed » pour ne plus refaire la vérification.
    """
    if not _is_shop_owner(user_doc) or user_doc.get(GUIDE_FIELD):
        return user_doc
    user_id = user_doc["user_id"]
    has_products = await db.products.find_one({"user_id": user_id, DEMO_TAG: {"$ne": True}}, {"_id": 0, "product_id": 1})
    state = {"status": NOT_NEEDED} if has_products else initial_state()
    await db.users.update_one({"user_id": user_id, GUIDE_FIELD: {"$exists": False}}, {"$set": {GUIDE_FIELD: state}})
    return {**user_doc, GUIDE_FIELD: state}


def is_eligible(user_doc: Optional[Dict[str, Any]]) -> bool:
    """Seul le propriétaire d'un compte commerce, hors démonstration, suit le guide."""
    if not _is_shop_owner(user_doc):
        return False
    return (user_doc.get(GUIDE_FIELD) or {}).get("status") in OPEN_STATES


def public_state(user_doc: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    guide = (user_doc or {}).get(GUIDE_FIELD) or {}
    return {
        "eligible": is_eligible(user_doc),
        "status": guide.get("status"),
        "step": guide.get("step"),
    }


async def is_active(db, owner_id: str) -> bool:
    """Vrai quand les créations du compte doivent être étiquetées comme données du guide."""
    doc = await db.users.find_one({"user_id": owner_id}, {"_id": 0, GUIDE_FIELD: 1})
    return ((doc or {}).get(GUIDE_FIELD) or {}).get("status") == ACTIVE


async def tag(db, collection: str, query: Dict[str, Any]) -> None:
    await getattr(db, collection).update_one(query, {"$set": {DEMO_TAG: True}})


async def start(db, user_id: str) -> Dict[str, Any]:
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not is_eligible(doc):
        return public_state(doc)
    guide = doc.get(GUIDE_FIELD) or {}
    if guide.get("status") == PENDING:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {f"{GUIDE_FIELD}.status": ACTIVE, f"{GUIDE_FIELD}.started_at": utc_now(), f"{GUIDE_FIELD}.step": "welcome"}},
        )
    return public_state(await db.users.find_one({"user_id": user_id}, {"_id": 0}))


async def save_progress(db, user_id: str, step: str) -> Dict[str, Any]:
    if step not in STEP_IDS:
        raise ValueError("Étape inconnue")
    await db.users.update_one(
        {"user_id": user_id, f"{GUIDE_FIELD}.status": ACTIVE},
        {"$set": {f"{GUIDE_FIELD}.step": step, f"{GUIDE_FIELD}.updated_at": utc_now()}},
    )
    return public_state(await db.users.find_one({"user_id": user_id}, {"_id": 0}))


async def _ids(db, collection: str, owner_id: str, field: str) -> List[str]:
    docs = await getattr(db, collection).find({"user_id": owner_id, DEMO_TAG: True}, {"_id": 0, field: 1}).to_list(None)
    return [doc[field] for doc in docs if doc.get(field)]


async def _delete_many(db, collection: str, query: Dict[str, Any]) -> int:
    result = await getattr(db, collection).delete_many(query)
    return int(getattr(result, "deleted_count", 0) or 0)


async def cleanup(db, owner_id: str, keep_product_ids: Iterable[str] = ()) -> Dict[str, int]:
    """Supprime les données du guide ; les produits gardés perdent l'étiquette et retrouvent leur stock."""
    product_ids = await _ids(db, "products", owner_id, "product_id")
    keep = [pid for pid in dict.fromkeys(keep_product_ids or ()) if pid in product_ids]
    remove = [pid for pid in product_ids if pid not in keep]
    customer_ids = await _ids(db, "customers", owner_id, "customer_id")
    sales = await db.sales.find({"user_id": owner_id, DEMO_TAG: True}, {"_id": 0}).to_list(None)
    sale_ids = [sale["sale_id"] for sale in sales if sale.get("sale_id")]

    # Produits gardés : on rend les quantités vendues pendant l'exercice et on retire leurs sorties de stock.
    for pid in keep:
        sold = sum(float(item.get("quantity") or 0) for sale in sales for item in sale.get("items") or [] if item.get("product_id") == pid)
        update: Dict[str, Any] = {"$unset": {DEMO_TAG: ""}}
        if sold:
            update["$inc"] = {"quantity": sold}
        await db.products.update_one({"product_id": pid, "user_id": owner_id}, update)
    if keep and sale_ids:
        await _delete_many(db, "stock_movements", {"user_id": owner_id, "product_id": {"$in": keep}, "type": "out"})

    summary = {
        "products": await _delete_many(db, "products", {"user_id": owner_id, "product_id": {"$in": remove}}) if remove else 0,
        "customers": await _delete_many(db, "customers", {"user_id": owner_id, "customer_id": {"$in": customer_ids}}) if customer_ids else 0,
        "sales": await _delete_many(db, "sales", {"user_id": owner_id, "sale_id": {"$in": sale_ids}}) if sale_ids else 0,
        "kept_products": len(keep),
    }
    if remove:
        for collection in ("stock_movements", "price_history", "batches", "alerts"):
            await _delete_many(db, collection, {"user_id": owner_id, "product_id": {"$in": remove}})
    if sale_ids:
        await _delete_many(db, "customer_invoices", {"user_id": owner_id, "sale_id": {"$in": sale_ids}})
    if customer_ids:
        await _delete_many(db, "customer_payments", {"user_id": owner_id, "customer_id": {"$in": customer_ids}})
    traces = [
        {"details.product_id": {"$in": remove}} if remove else None,
        {"details.sale_id": {"$in": sale_ids}} if sale_ids else None,
        {"details.customer_id": {"$in": customer_ids}} if customer_ids else None,
    ]
    traces = [trace for trace in traces if trace]
    if traces:
        await _delete_many(db, "activity_logs", {"owner_id": owner_id, "$or": traces})
    return summary


async def finish(db, user_id: str, outcome: str, keep_product_ids: Iterable[str] = ()) -> Dict[str, Any]:
    """Termine (ou fait passer) le guide et nettoie ses données, une seule fois."""
    if outcome not in FINAL_STATES:
        raise ValueError("Issue inconnue")
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    status = ((doc or {}).get(GUIDE_FIELD) or {}).get("status")
    if status not in OPEN_STATES:
        return {**public_state(doc), "cleanup": None}
    summary = await cleanup(db, user_id, keep_product_ids)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {f"{GUIDE_FIELD}.status": outcome, f"{GUIDE_FIELD}.finished_at": utc_now()}},
    )
    return {**public_state(await db.users.find_one({"user_id": user_id}, {"_id": 0})), "cleanup": summary}
