"""Commande en ligne livrée : sortie du stock, vente et clôture, une seule fois.

La commande est d'abord réservée pour ce traitement (sale_claim) : deux demandes simultanées
n'enregistrent qu'une vente. Si un article manque, les sorties de stock déjà faites sont remises
et la réservation rendue. Après une interruption, la réservation expire et le traitement reprend
là où il s'était arrêté : une sortie de stock déjà écrite pour cette commande n'est pas refaite,
et la vente garde le même identifiant.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Mapping, Optional, Tuple

from pymongo import ReturnDocument

CLAIM_MINUTES = 10
CLOSED = ("delivered", "cancelled", "rejected")
MOVEMENT_SOURCE = "ecommerce_order"


class SaleError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def convert(
    db: Any,
    order: Mapping[str, Any],
    *,
    owner_id: str,
    store_id: str,
    record_sale: Callable[[str, Mapping[str, Any], List[Dict[str, Any]]], Awaitable[None]],
    record_movement: Callable[[Mapping[str, Any], float, float, float], Awaitable[None]],
    clock: Callable[[], datetime] = _now,
) -> Dict[str, Any]:
    """Renvoie la commande livrée. « record_sale(sale_id, commande, lignes) » enregistre la vente ;
    « record_movement(produit, quantité, avant, après) » écrit le mouvement de stock d'un produit."""
    order_id = order["order_id"]
    if order.get("sale_id"):
        return dict(order)
    now = clock()
    key = {"order_id": order_id, "user_id": owner_id}
    previous = await db.ecommerce_orders.find_one_and_update(
        {**key, "sale_id": None, "status": {"$nin": list(CLOSED)},
         "$or": [{"sale_claim": None}, {"sale_claim.at": {"$lt": now - timedelta(minutes=CLAIM_MINUTES)}}]},
        {"$set": {"sale_claim.at": now}},
        projection={"_id": 0},
        return_document=ReturnDocument.BEFORE,
    )
    if not previous:
        fresh = await db.ecommerce_orders.find_one(key, {"_id": 0})
        if fresh and fresh.get("sale_id"):
            return fresh
        if fresh and fresh.get("status") in CLOSED:
            raise SaleError(400, "Cette commande est déjà clôturée")
        raise SaleError(409, "Cette commande est déjà en cours d'enregistrement. Actualisez dans un instant.")
    # Reprise d'un traitement interrompu : même vente, pour ne jamais en créer deux.
    sale_id = (previous.get("sale_claim") or {}).get("sale_id") or f"sale_{uuid.uuid4().hex[:12]}"
    await db.ecommerce_orders.update_one(key, {"$set": {"sale_claim.sale_id": sale_id}})
    claim = {**key, "sale_claim.sale_id": sale_id}
    taken: List[Tuple[str, float]] = []

    try:
        lines: List[Dict[str, Any]] = []
        products: Dict[str, Dict[str, Any]] = {}
        needed: Dict[str, float] = {}
        for item in previous.get("items") or []:
            product_id = item.get("product_id")
            quantity = float(item.get("quantity") or 0)
            if not product_id or quantity <= 0:
                continue
            product = products.get(product_id) or await db.products.find_one(
                {"product_id": product_id, "user_id": owner_id, "store_id": store_id, "is_active": {"$ne": False}}, {"_id": 0})
            if not product:
                raise SaleError(400, f"Produit indisponible : {item.get('product_name') or product_id}")
            products[product_id] = product
            needed[product_id] = needed.get(product_id, 0.0) + quantity
            lines.append({"item": dict(item), "product": product, "quantity": quantity})
        if not lines:
            raise SaleError(400, "Aucun article valide dans cette commande")

        # Un produit commandé sur plusieurs lignes sort du stock en une fois.
        for product_id, quantity in needed.items():
            product = products[product_id]
            if await db.stock_movements.find_one({"source_type": MOVEMENT_SOURCE, "source_id": order_id, "product_id": product_id}, {"_id": 0, "product_id": 1}):
                continue
            before = float(product.get("quantity") or 0)
            result = await db.products.update_one(
                {"product_id": product_id, "user_id": owner_id, "store_id": store_id, "quantity": {"$gte": quantity}},
                {"$inc": {"quantity": -quantity}, "$set": {"updated_at": clock()}},
            )
            if not result.modified_count:
                raise SaleError(400, f"Stock insuffisant pour {product.get('name')}")
            taken.append((product_id, quantity))
            await record_movement(product, quantity, before, before - quantity)
    except SaleError:
        # Rien n'est vendu : le stock déjà sorti revient, et la commande peut être reprise.
        for product_id, quantity in taken:
            await db.products.update_one({"product_id": product_id, "user_id": owner_id, "store_id": store_id},
                                         {"$inc": {"quantity": quantity}, "$set": {"updated_at": clock()}})
            await db.stock_movements.delete_one({"source_type": MOVEMENT_SOURCE, "source_id": order_id, "product_id": product_id})
        await db.ecommerce_orders.update_one(claim, {"$unset": {"sale_claim": ""}})
        raise

    if not await db.sales.find_one({"sale_id": sale_id}, {"_id": 0, "sale_id": 1}):
        await record_sale(sale_id, previous, lines)
    await db.ecommerce_orders.update_one(
        claim,
        {"$set": {"status": "delivered", "sale_id": sale_id, "delivered_at": clock(), "updated_at": clock()}, "$unset": {"sale_claim": ""}},
    )
    updated: Optional[Dict[str, Any]] = await db.ecommerce_orders.find_one(key, {"_id": 0})
    return updated or dict(previous)
