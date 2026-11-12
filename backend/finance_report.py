"""Chiffres de l'écran Finances, calculés par la base de données et séparés par canal de vente.

Deux canaux : « physical » (caisse, boutique) et « ecommerce » (vente créée à la livraison d'une
commande en ligne). Une vente sans champ « source » est une vente physique.

Définitions retenues :
- chiffre d'affaires : ventes terminées de la période, annulations exclues. Pour l'E-com, seules
  les commandes livrées comptent, payées ou à crédit ; les frais de livraison Denkma n'en font
  jamais partie (ils ne sont pas dans la vente) ;
- encaissé : part payée des ventes de la période, plus les remboursements de dettes reçus ;
- à encaisser (E-com) : commandes livrées dont le paiement n'est pas encore confirmé ;
- livraison en transit : frais Denkma payés par les clients, à reverser au transporteur.
"""

from datetime import datetime
from typing import Any, Dict, List, Mapping, Optional

PHYSICAL = "physical"
ECOMMERCE = "ecommerce"
CHANNELS = (PHYSICAL, ECOMMERCE)
CLOSED_WITHOUT_SALE = ["cancelled", "rejected"]

_SOURCE = {"$cond": [{"$eq": ["$source", ECOMMERCE]}, ECOMMERCE, PHYSICAL]}
_TOTAL = {"$ifNull": ["$total_amount", 0]}
# Part de la vente laissée à crédit : celle inscrite en dette, ou toute la vente si elle est « à crédit ».
_CREDIT = {"$cond": [
    {"$gt": [{"$ifNull": ["$credit_debt_applied", 0]}, 0]},
    "$credit_debt_applied",
    {"$cond": [{"$eq": ["$payment_method", "credit"]}, _TOTAL, 0]},
]}
_ITEM_QTY = {"$ifNull": ["$items.quantity", 0]}
_ITEM_REVENUE = {"$cond": [
    {"$gt": [{"$ifNull": ["$items.total", 0]}, 0]},
    "$items.total",
    {"$multiply": [_ITEM_QTY, {"$ifNull": ["$items.selling_price", 0]}]},
]}
_ITEM_COST = {"$multiply": [_ITEM_QTY, {"$ifNull": ["$items.purchase_price", 0]}]}
_DAY = {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}}


def normalize_channel(channel: Optional[str]) -> str:
    return channel if channel in CHANNELS else "all"


def channel_filter(channel: Optional[str]) -> Dict[str, Any]:
    """Filtre Mongo des ventes d'un canal ; vide pour toutes les ventes."""
    if channel == ECOMMERCE:
        return {"source": ECOMMERCE}
    if channel == PHYSICAL:
        return {"source": {"$ne": ECOMMERCE}}
    return {}


def date_range_filter(field: str, start: datetime, end: datetime) -> Dict[str, Any]:
    """Période sur un champ daté. Certaines anciennes fiches stockent la date en texte ISO : elles
    sont retenues aussi, la comparaison de textes ISO suivant l'ordre chronologique."""
    return {"$or": [
        {field: {"$gte": start, "$lte": end}},
        {field: {"$gte": start.isoformat(), "$lte": end.isoformat()}},
    ]}


def _money(value: Any) -> float:
    return round(float(value or 0), 2)


def _empty_channel() -> Dict[str, Any]:
    return {"revenue": 0.0, "sales_count": 0, "cogs": 0.0, "gross_profit": 0.0, "avg_sale": 0.0,
            "tax_collected": 0.0, "credit": 0.0, "collected": 0.0, "items_sold": 0.0, "share_pct": 0.0}


async def sales_report(db: Any, match: Mapping[str, Any]) -> Dict[str, Any]:
    """Totaux des ventes terminées correspondant à « match », pour chaque canal.
    Renvoie {channels, payments, daily, products}, chaque ligne portant son canal."""
    pipeline = [
        {"$match": dict(match)},
        {"$facet": {
            "totals": [{"$group": {
                "_id": _SOURCE,
                "revenue": {"$sum": _TOTAL},
                "count": {"$sum": 1},
                "tax": {"$sum": {"$ifNull": ["$tax_total", 0]}},
                "credit": {"$sum": _CREDIT},
            }}],
            "payments": [{"$group": {
                "_id": {"method": {"$ifNull": ["$payment_method", "cash"]}, "source": _SOURCE},
                "amount": {"$sum": _TOTAL},
            }}],
            "daily": [{"$group": {"_id": {"day": _DAY, "source": _SOURCE}, "revenue": {"$sum": _TOTAL}}}],
            "items": [
                {"$unwind": "$items"},
                {"$group": {
                    "_id": {"product_id": "$items.product_id", "day": _DAY, "source": _SOURCE},
                    "name": {"$first": "$items.product_name"},
                    "quantity": {"$sum": _ITEM_QTY},
                    "revenue": {"$sum": _ITEM_REVENUE},
                    "cogs": {"$sum": _ITEM_COST},
                }},
            ],
        }},
    ]
    rows = await db.sales.aggregate(pipeline).to_list(1)
    facet = rows[0] if rows else {}

    channels = {channel: _empty_channel() for channel in CHANNELS}
    for row in facet.get("totals") or []:
        target = channels[row["_id"]]
        target["revenue"] = _money(row.get("revenue"))
        target["sales_count"] = int(row.get("count") or 0)
        target["tax_collected"] = _money(row.get("tax"))
        target["credit"] = _money(row.get("credit"))
        target["collected"] = _money(target["revenue"] - target["credit"])

    daily: Dict[str, Dict[str, Any]] = {}

    def day_row(day: str) -> Dict[str, Any]:
        return daily.setdefault(day, {"date": day, "revenue": 0.0, "profit": 0.0, PHYSICAL: 0.0, ECOMMERCE: 0.0,
                                      "profit_" + PHYSICAL: 0.0, "profit_" + ECOMMERCE: 0.0})

    for row in facet.get("daily") or []:
        day, source = row["_id"]["day"], row["_id"]["source"]
        target = day_row(day)
        target[source] += float(row.get("revenue") or 0)
        target["profit_" + source] += float(row.get("revenue") or 0)

    products: Dict[tuple, Dict[str, Any]] = {}
    for row in facet.get("items") or []:
        key = row["_id"]
        source, cogs = key["source"], float(row.get("cogs") or 0)
        channels[source]["cogs"] += cogs
        channels[source]["items_sold"] += float(row.get("quantity") or 0)
        day_row(key["day"])["profit_" + source] -= cogs
        if key.get("product_id"):
            product = products.setdefault((key["product_id"], source), {
                "id": key["product_id"], "name": row.get("name") or "Inconnu", "source": source,
                "qty_sold": 0.0, "revenue": 0.0, "cogs": 0.0,
            })
            product["qty_sold"] += float(row.get("quantity") or 0)
            product["revenue"] += float(row.get("revenue") or 0)
            product["cogs"] += cogs

    total_revenue = sum(channel["revenue"] for channel in channels.values())
    for channel in channels.values():
        channel["cogs"] = _money(channel["cogs"])
        channel["gross_profit"] = _money(channel["revenue"] - channel["cogs"])
        channel["avg_sale"] = _money(channel["revenue"] / channel["sales_count"]) if channel["sales_count"] else 0.0
        channel["share_pct"] = round(channel["revenue"] / total_revenue * 100, 2) if total_revenue > 0 else 0.0
        channel["items_sold"] = round(channel["items_sold"], 3)

    for row in daily.values():
        row["revenue"] = _money(row[PHYSICAL] + row[ECOMMERCE])
        row["profit"] = _money(row["profit_" + PHYSICAL] + row["profit_" + ECOMMERCE])
        for source in CHANNELS:
            row[source] = _money(row[source])
            row["profit_" + source] = _money(row["profit_" + source])

    payments = [
        {"method": row["_id"]["method"], "source": row["_id"]["source"], "amount": _money(row.get("amount"))}
        for row in facet.get("payments") or []
    ]
    return {
        "channels": channels,
        "payments": payments,
        "daily": sorted(daily.values(), key=lambda row: row["date"]),
        "products": list(products.values()),
    }


def pick(report: Mapping[str, Any], channel: str) -> Dict[str, Any]:
    """Chiffres d'un canal (« physical », « ecommerce ») ou de toutes les ventes (« all »)."""
    sources = CHANNELS if channel == "all" else (channel,)
    totals = _empty_channel()
    for source in sources:
        for field in ("revenue", "sales_count", "cogs", "tax_collected", "credit", "collected", "items_sold"):
            totals[field] += report["channels"][source][field]
    totals["gross_profit"] = _money(totals["revenue"] - totals["cogs"])
    totals["avg_sale"] = _money(totals["revenue"] / totals["sales_count"]) if totals["sales_count"] else 0.0
    totals["share_pct"] = 100.0 if channel == "all" else report["channels"][channel]["share_pct"]

    payment_breakdown: Dict[str, float] = {}
    for row in report["payments"]:
        if row["source"] in sources:
            payment_breakdown[row["method"]] = _money(payment_breakdown.get(row["method"], 0) + row["amount"])

    daily = [
        {"date": row["date"], "revenue": _money(sum(row[s] for s in sources)), "profit": _money(sum(row["profit_" + s] for s in sources)),
         PHYSICAL: row[PHYSICAL], ECOMMERCE: row[ECOMMERCE]}
        for row in report["daily"]
    ]

    merged: Dict[str, Dict[str, Any]] = {}
    for product in report["products"]:
        if product["source"] not in sources:
            continue
        target = merged.setdefault(product["id"], {"id": product["id"], "name": product["name"], "qty_sold": 0.0, "revenue": 0.0, "cogs": 0.0, "loss": 0.0})
        for field in ("qty_sold", "revenue", "cogs"):
            target[field] += product[field]
    return {"totals": totals, "payment_breakdown": payment_breakdown, "daily": daily, "products": merged}


async def ecommerce_flow(db: Any, match: Mapping[str, Any], start: datetime, end: datetime) -> Dict[str, Any]:
    """Circuit des commandes en ligne : commandé, livré, encaissé, à encaisser, livraison en transit.
    « match » limite aux commandes du commerçant et de ses boutiques accessibles."""
    delivered_in_period = {"$or": [
        {"delivered_at": {"$gte": start, "$lte": end}},
        {"delivered_at": None, "updated_at": {"$gte": start, "$lte": end}},
    ]}
    pipeline = [
        {"$match": dict(match)},
        {"$facet": {
            "ordered": [
                {"$match": {"created_at": {"$gte": start, "$lte": end}, "status": {"$nin": CLOSED_WITHOUT_SALE}}},
                {"$group": {"_id": None, "amount": {"$sum": _TOTAL}, "count": {"$sum": 1}}},
            ],
            "cancelled": [
                {"$match": {"created_at": {"$gte": start, "$lte": end}, "status": {"$in": CLOSED_WITHOUT_SALE}}},
                {"$group": {"_id": None, "amount": {"$sum": _TOTAL}, "count": {"$sum": 1}}},
            ],
            "open": [
                {"$match": {"status": {"$nin": ["delivered", *CLOSED_WITHOUT_SALE]}}},
                {"$group": {"_id": None, "amount": {"$sum": _TOTAL}, "count": {"$sum": 1}}},
            ],
            "delivered": [
                {"$match": {"status": "delivered", **delivered_in_period}},
                {"$group": {"_id": None, "amount": {"$sum": _TOTAL}, "count": {"$sum": 1}}},
            ],
            "to_collect": [
                {"$match": {"status": "delivered", "sale_on_credit": True, "payment.status": {"$ne": "paid"}}},
                {"$group": {"_id": None, "amount": {"$sum": _TOTAL}, "count": {"$sum": 1}}},
            ],
            "delivery_transit": [
                {"$match": {"payment.status": "paid", "payment.paid_at": {"$gte": start, "$lte": end},
                            "delivery_fee": {"$gt": 0}, "status": {"$nin": CLOSED_WITHOUT_SALE}}},
                {"$group": {"_id": None, "amount": {"$sum": "$delivery_fee"}, "count": {"$sum": 1}}},
            ],
        }},
    ]
    rows = await db.ecommerce_orders.aggregate(pipeline).to_list(1)
    facet = rows[0] if rows else {}

    def block(name: str) -> Dict[str, Any]:
        found = (facet.get(name) or [{}])[0] if facet.get(name) else {}
        return {"amount": _money(found.get("amount")), "count": int(found.get("count") or 0)}

    return {name: block(name) for name in ("ordered", "cancelled", "open", "delivered", "to_collect", "delivery_transit")}


async def sum_by(db: Any, collection: str, match: Mapping[str, Any], field: str, group: Optional[str] = None) -> Dict[str, float]:
    """Somme d'un champ, éventuellement par catégorie, sans charger les fiches."""
    pipeline: List[Dict[str, Any]] = [
        {"$match": dict(match)},
        {"$group": {"_id": f"${group}" if group else None, "amount": {"$sum": {"$ifNull": [f"${field}", 0]}}, "count": {"$sum": 1}}},
    ]
    rows = await getattr(db, collection).aggregate(pipeline).to_list(None)
    if group:
        return {str(row["_id"] if row["_id"] is not None else "Autre"): _money(row.get("amount")) for row in rows}
    found = rows[0] if rows else {}
    return {"amount": _money(found.get("amount")), "count": float(found.get("count") or 0)}


async def stock_value(db: Any, match: Mapping[str, Any]) -> Dict[str, float]:
    rows = await db.products.aggregate([
        {"$match": dict(match)},
        {"$group": {
            "_id": None,
            "cost": {"$sum": {"$multiply": [{"$ifNull": ["$quantity", 0]}, {"$ifNull": ["$purchase_price", 0]}]}},
            "selling": {"$sum": {"$multiply": [{"$ifNull": ["$quantity", 0]}, {"$ifNull": ["$selling_price", 0]}]}},
        }},
    ]).to_list(1)
    found = rows[0] if rows else {}
    return {"cost": _money(found.get("cost")), "selling": _money(found.get("selling"))}
