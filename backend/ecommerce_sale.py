"""Commande en ligne : réservation du stock au paiement, puis vente à la livraison, une seule fois.

La commande est d'abord réservée pour ce traitement (sale_claim) : deux demandes simultanées
n'enregistrent qu'une vente. Si un article manque, les sorties de stock déjà faites sont remises
et la réservation rendue. Après une interruption, la réservation expire et le traitement reprend
là où il s'était arrêté : une sortie de stock déjà écrite pour cette commande n'est pas refaite,
et la vente garde le même identifiant.

Une commande payée réserve ses articles : ils sortent du stock dès la confirmation du paiement,
avec la même référence que la sortie faite à la livraison. La livraison ne les sort donc pas une
seconde fois. Si la commande est annulée ou si le paiement est retiré avant la livraison, la
sortie est marquée « libérée » (released_at) et le stock revient.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Mapping, Optional, Tuple

from pymongo import ReturnDocument

CLAIM_MINUTES = 10
CLOSED = ("delivered", "cancelled", "rejected")
MOVEMENT_SOURCE = "ecommerce_order"
ECOMMERCE = "ecommerce"

RecordMovement = Callable[[Mapping[str, Any], float, float, float], Awaitable[None]]


class SaleError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _active_movement(order_id: str, product_id: str) -> Dict[str, Any]:
    """Sortie de stock de cette commande pour ce produit, encore en vigueur (non libérée)."""
    return {"source_type": MOVEMENT_SOURCE, "source_id": order_id, "product_id": product_id, "released_at": None}


async def _claim(db: Any, key: Dict[str, Any], now: datetime) -> Optional[Dict[str, Any]]:
    return await db.ecommerce_orders.find_one_and_update(
        {**key, "sale_id": None, "status": {"$nin": list(CLOSED)},
         "$or": [{"sale_claim": None}, {"sale_claim.at": {"$lt": now - timedelta(minutes=CLAIM_MINUTES)}}]},
        {"$set": {"sale_claim.at": now}},
        projection={"_id": 0},
        return_document=ReturnDocument.BEFORE,
    )


async def _take_stock(
    db: Any,
    order_id: str,
    needed: Mapping[str, float],
    products: Mapping[str, Mapping[str, Any]],
    *,
    owner_id: str,
    store_id: str,
    record_movement: RecordMovement,
    clock: Callable[[], datetime],
) -> None:
    """Sort du stock ce qui ne l'est pas encore pour cette commande. En cas de manque, remet ce qui
    vient d'être sorti et lève SaleError."""
    taken: List[Tuple[str, float]] = []
    try:
        # Un produit commandé sur plusieurs lignes sort du stock en une fois.
        for product_id, quantity in needed.items():
            product = products[product_id]
            if await db.stock_movements.find_one(_active_movement(order_id, product_id), {"_id": 0, "product_id": 1}):
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
        for product_id, quantity in taken:
            await db.products.update_one({"product_id": product_id, "user_id": owner_id, "store_id": store_id},
                                         {"$inc": {"quantity": quantity}, "$set": {"updated_at": clock()}})
            await db.stock_movements.delete_one(_active_movement(order_id, product_id))
        raise


async def _load_lines(db: Any, order: Mapping[str, Any], *, owner_id: str, store_id: str) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]], Dict[str, float]]:
    lines: List[Dict[str, Any]] = []
    products: Dict[str, Dict[str, Any]] = {}
    needed: Dict[str, float] = {}
    for item in order.get("items") or []:
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
    return lines, products, needed


async def convert(
    db: Any,
    order: Mapping[str, Any],
    *,
    owner_id: str,
    store_id: str,
    record_sale: Callable[[str, Mapping[str, Any], List[Dict[str, Any]]], Awaitable[None]],
    record_movement: RecordMovement,
    clock: Callable[[], datetime] = _now,
) -> Dict[str, Any]:
    """Renvoie la commande livrée. « record_sale(sale_id, commande, lignes) » enregistre la vente ;
    « record_movement(produit, quantité, avant, après) » écrit le mouvement de stock d'un produit."""
    order_id = order["order_id"]
    if order.get("sale_id"):
        return dict(order)
    key = {"order_id": order_id, "user_id": owner_id}
    previous = await _claim(db, key, clock())
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

    try:
        lines, products, needed = await _load_lines(db, previous, owner_id=owner_id, store_id=store_id)
        await _take_stock(db, order_id, needed, products, owner_id=owner_id, store_id=store_id,
                          record_movement=record_movement, clock=clock)
    except SaleError:
        # Rien n'est vendu : la commande peut être reprise.
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


async def reserve(
    db: Any,
    order: Mapping[str, Any],
    *,
    owner_id: str,
    store_id: str,
    record_movement: RecordMovement,
    clock: Callable[[], datetime] = _now,
) -> bool:
    """Commande payée, pas encore livrée : ses articles sortent du stock tout de suite, pour qu'une
    vente en caisse ne les prenne pas. Renvoie True si la commande a des articles réservés.
    Lève SaleError si un article manque : rien n'est alors réservé."""
    order_id = order["order_id"]
    if order.get("sale_id") or order.get("status") in CLOSED:
        return False
    key = {"order_id": order_id, "user_id": owner_id}
    previous = await _claim(db, key, clock())
    if not previous:
        raise SaleError(409, "Cette commande est déjà en cours d'enregistrement. Actualisez dans un instant.")
    try:
        _, products, needed = await _load_lines(db, previous, owner_id=owner_id, store_id=store_id)
        await _take_stock(db, order_id, needed, products, owner_id=owner_id, store_id=store_id,
                          record_movement=record_movement, clock=clock)
    except SaleError:
        await db.ecommerce_orders.update_one(key, {"$unset": {"sale_claim": ""}})
        raise
    await db.ecommerce_orders.update_one(key, {"$set": {"stock_reserved_at": clock()}, "$unset": {"sale_claim": ""}})
    return True


async def release(
    db: Any,
    order: Mapping[str, Any],
    *,
    owner_id: str,
    store_id: str,
    record_return: RecordMovement,
    clock: Callable[[], datetime] = _now,
) -> int:
    """Commande annulée ou paiement retiré avant la livraison : le stock réservé revient.
    « record_return(produit, quantité, avant, après) » écrit le mouvement d'entrée. Renvoie le nombre
    de produits remis en stock."""
    order_id = order["order_id"]
    if order.get("sale_id"):
        return 0
    movements = await db.stock_movements.find(
        {"source_type": MOVEMENT_SOURCE, "source_id": order_id, "released_at": None}, {"_id": 0}).to_list(None)
    returned = 0
    for movement in movements:
        product_id = movement.get("product_id")
        quantity = float(movement.get("quantity") or 0)
        # Une seule demande libère une sortie donnée, même si deux arrivent en même temps.
        claimed = await db.stock_movements.find_one_and_update(
            _active_movement(order_id, product_id),
            {"$set": {"released_at": clock()}},
            projection={"_id": 0},
            return_document=ReturnDocument.BEFORE,
        )
        if not claimed or quantity <= 0:
            continue
        product = await db.products.find_one_and_update(
            {"product_id": product_id, "user_id": owner_id, "store_id": store_id},
            {"$inc": {"quantity": quantity}, "$set": {"updated_at": clock()}},
            projection={"_id": 0},
            return_document=ReturnDocument.AFTER,
        )
        if not product:
            continue
        after = float(product.get("quantity") or 0)
        await record_return(product, quantity, after - quantity, after)
        returned += 1
    await db.ecommerce_orders.update_one({"order_id": order_id, "user_id": owner_id}, {"$unset": {"stock_reserved_at": ""}})
    return returned


async def backfill_sale_sources(db: Any) -> int:
    """Reprise de l'historique : chaque commande livrée garde l'identifiant de sa vente, ce qui
    permet de classer cette vente « E-com » avec certitude. Les autres ventes restent physiques.
    Sans effet si elle est relancée. Renvoie le nombre de ventes reclassées."""
    orders = await db.ecommerce_orders.find(
        {"sale_id": {"$exists": True, "$nin": [None, ""]}},
        {"_id": 0, "order_id": 1, "sale_id": 1, "user_id": 1},
    ).to_list(None)
    changed = 0
    for order in orders:
        result = await db.sales.update_many(
            {"sale_id": order["sale_id"], "user_id": order.get("user_id"), "source": {"$ne": ECOMMERCE}},
            {"$set": {"source": ECOMMERCE, "ecommerce_order_id": order["order_id"]}},
        )
        changed += int(getattr(result, "modified_count", 0) or 0)
    return changed
