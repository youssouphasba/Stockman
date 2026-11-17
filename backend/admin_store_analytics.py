"""Analyse des boutiques pour l'admin Stockman.

Ce module ne parle pas à la base : le serveur lui passe les documents lus, il
calcule les lignes du tableau des boutiques, la synthèse globale et l'analyse des
ventes d'une boutique. Les montants ne sont jamais additionnés entre devises.
"""

import unicodedata
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional

import trial_extension

ACTIVE_DAYS = 7
SLOWING_DAYS = 30

ACTIVITY_LEVELS = ("active", "slowing", "inactive", "never")
BILLING_STATES = ("paying", "trial", "expired")
SORTS = ("revenue_30d", "trend", "last_sale", "created", "name", "products")

PAYMENT_LABELS = {
    "cash": "Espèces",
    "mobile_money": "Mobile money",
    "wave": "Wave",
    "orange_money": "Orange Money",
    "card": "Carte",
    "credit": "Crédit client",
    "transfer": "Virement",
    "check": "Chèque",
    "on_delivery": "Paiement à la livraison",
}


def _as_utc(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _iso(value: Any) -> Optional[str]:
    parsed = _as_utc(value)
    return parsed.isoformat() if parsed else None


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _fold(value: Any) -> str:
    """Texte sans accents ni majuscules, pour trier et chercher (« Épicerie » ≈ « epicerie »)."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(ch for ch in text if not unicodedata.combining(ch)).lower()


def classify_activity(last_sale_at: Any, now: datetime) -> str:
    last = _as_utc(last_sale_at)
    if not last:
        return "never"
    age = now - last
    if age <= timedelta(days=ACTIVE_DAYS):
        return "active"
    if age <= timedelta(days=SLOWING_DAYS):
        return "slowing"
    return "inactive"


def billing_state(account: Optional[dict], now: datetime) -> str:
    account = account or {}
    if trial_extension.is_paying_account(account) and account.get("subscription_status") == "active":
        return "paying"
    trial_end = _as_utc(account.get("trial_ends_at"))
    if trial_end and trial_end > now:
        return "trial"
    return "expired"


def trend_pct(current: float, previous: float) -> Optional[float]:
    """Variation en % ; None quand la période précédente est vide (pas de base de comparaison)."""
    if previous <= 0:
        return None
    return round((current - previous) / previous * 100, 1)


def sales_stats_pipeline(store_ids: List[str], now: datetime) -> List[dict]:
    """Agrégat Mongo : CA total, 30 derniers jours, 30 jours précédents et dernière vente par boutique."""
    since_30 = now - timedelta(days=30)
    since_60 = now - timedelta(days=60)
    in_30 = {"$gte": ["$created_at", since_30]}
    in_prev = {"$and": [{"$gte": ["$created_at", since_60]}, {"$lt": ["$created_at", since_30]}]}
    return [
        {"$match": {
            "store_id": {"$in": store_ids},
            "$or": [{"status": {"$exists": False}}, {"status": "completed"}],
        }},
        {"$group": {
            "_id": "$store_id",
            "total": {"$sum": "$total_amount"},
            "count": {"$sum": 1},
            "last_sale_at": {"$max": "$created_at"},
            "revenue_30d": {"$sum": {"$cond": [in_30, "$total_amount", 0]}},
            "sales_30d": {"$sum": {"$cond": [in_30, 1, 0]}},
            "revenue_prev_30d": {"$sum": {"$cond": [in_prev, "$total_amount", 0]}},
        }},
    ]


def build_store_rows(
    stores: Iterable[dict],
    owners: Dict[str, dict],
    accounts: Dict[str, dict],
    sales_stats: Dict[str, dict],
    product_counts: Dict[str, int],
    now: datetime,
) -> List[dict]:
    rows = []
    for store in stores:
        store_id = store.get("store_id")
        owner = owners.get(store.get("user_id")) or {}
        account = accounts.get(store.get("user_id"))
        stats = sales_stats.get(store_id) or {}
        revenue_30d = round(_num(stats.get("revenue_30d")), 2)
        revenue_prev = round(_num(stats.get("revenue_prev_30d")), 2)
        rows.append({
            "store_id": store_id,
            "user_id": store.get("user_id"),
            "name": store.get("name"),
            "address": store.get("address"),
            "created_at": _iso(store.get("created_at")),
            "owner_name": owner.get("name") or "Inconnu",
            "owner_email": owner.get("email") or "",
            "country_code": owner.get("country_code"),
            "currency": owner.get("currency"),
            "business_type": owner.get("business_type"),
            "plan": (account or {}).get("plan") or owner.get("plan") or "starter",
            "billing": billing_state(account, now),
            "product_count": int(product_counts.get(store_id) or 0),
            "total_revenue": round(_num(stats.get("total")), 2),
            "sales_count": int(stats.get("count") or 0),
            "revenue_30d": revenue_30d,
            "sales_30d": int(stats.get("sales_30d") or 0),
            "revenue_prev_30d": revenue_prev,
            "revenue_trend_pct": trend_pct(revenue_30d, revenue_prev),
            "last_sale_at": _iso(stats.get("last_sale_at")),
            "activity": classify_activity(stats.get("last_sale_at"), now),
        })
    return rows


def filter_rows(
    rows: List[dict],
    search: Optional[str] = None,
    country: Optional[str] = None,
    plan: Optional[str] = None,
    activity: Optional[str] = None,
    billing: Optional[str] = None,
) -> List[dict]:
    term = _fold((search or "").strip())
    result = []
    for row in rows:
        if country and (row.get("country_code") or "") != country:
            continue
        if plan and row.get("plan") != plan:
            continue
        if activity and row.get("activity") != activity:
            continue
        if billing and row.get("billing") != billing:
            continue
        if term and not any(term in _fold(row.get(field)) for field in ("name", "address", "owner_name", "owner_email", "store_id")):
            continue
        result.append(row)
    return result


def sort_rows(rows: List[dict], sort: str = "revenue_30d") -> List[dict]:
    if sort == "name":
        return sorted(rows, key=lambda r: _fold(r.get("name")))
    if sort == "created":
        return sorted(rows, key=lambda r: r.get("created_at") or "", reverse=True)
    if sort == "last_sale":
        return sorted(rows, key=lambda r: r.get("last_sale_at") or "", reverse=True)
    if sort == "products":
        return sorted(rows, key=lambda r: r.get("product_count") or 0, reverse=True)
    if sort == "trend":
        # Les boutiques sans base de comparaison passent après celles qui en ont une.
        return sorted(rows, key=lambda r: (r.get("revenue_trend_pct") is None, -(r.get("revenue_trend_pct") or 0)))
    by_last_sale = sorted(rows, key=lambda r: r.get("last_sale_at") or "", reverse=True)
    return sorted(by_last_sale, key=lambda r: -(r.get("revenue_30d") or 0))


def _counted(values: Iterable[Optional[str]], empty_label: str) -> List[dict]:
    counts: Dict[str, int] = defaultdict(int)
    for value in values:
        counts[value or empty_label] += 1
    return [{"key": key, "count": count} for key, count in sorted(counts.items(), key=lambda item: (-item[1], item[0]))]


def summarize(rows: List[dict], now: datetime) -> dict:
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    by_currency: Dict[str, Dict[str, float]] = defaultdict(lambda: {"revenue_30d": 0.0, "revenue_prev_30d": 0.0, "sales_30d": 0})
    for row in rows:
        bucket = by_currency[row.get("currency") or "—"]
        bucket["revenue_30d"] += row.get("revenue_30d") or 0
        bucket["revenue_prev_30d"] += row.get("revenue_prev_30d") or 0
        bucket["sales_30d"] += row.get("sales_30d") or 0
    activity_counts = {level: 0 for level in ACTIVITY_LEVELS}
    for row in rows:
        activity_counts[row.get("activity") or "never"] += 1
    return {
        "total": len(rows),
        "activity": activity_counts,
        "active_7d": activity_counts["active"],
        "active_30d": activity_counts["active"] + activity_counts["slowing"],
        "never_sold": activity_counts["never"],
        "without_products": sum(1 for row in rows if not row.get("product_count")),
        "new_this_month": sum(1 for row in rows if (_as_utc(row.get("created_at")) or month_start - timedelta(days=1)) >= month_start),
        "revenue_by_currency": sorted(
            (
                {
                    "currency": currency,
                    "revenue_30d": round(values["revenue_30d"], 2),
                    "revenue_prev_30d": round(values["revenue_prev_30d"], 2),
                    "trend_pct": trend_pct(values["revenue_30d"], values["revenue_prev_30d"]),
                    "sales_30d": int(values["sales_30d"]),
                }
                for currency, values in by_currency.items()
            ),
            key=lambda item: -item["sales_30d"],
        ),
        "by_country": _counted((row.get("country_code") for row in rows), "—"),
        "by_business_type": _counted((row.get("business_type") for row in rows), "non renseigné"),
    }


def _sale_payments(sale: dict) -> List[tuple]:
    payments = [p for p in (sale.get("payments") or []) if isinstance(p, dict) and _num(p.get("amount")) > 0]
    if payments:
        return [(str(p.get("method") or "autre").lower(), _num(p.get("amount"))) for p in payments]
    return [(str(sale.get("payment_method") or "cash").lower(), _num(sale.get("total_amount")))]


def build_sales_analysis(sales: Iterable[dict], now: datetime) -> dict:
    """Ventes des 90 derniers jours d'une boutique : périodes, courbe 30 jours, marge, produits, paiements, canaux."""
    since = {days: now - timedelta(days=days) for days in (7, 30, 90)}
    periods = {days: {"revenue": 0.0, "count": 0} for days in (7, 30, 90)}
    today = now.date()
    daily = {(today - timedelta(days=offset)).isoformat(): {"revenue": 0.0, "count": 0} for offset in range(29, -1, -1)}
    products: Dict[str, Dict[str, Any]] = {}
    payments: Dict[str, Dict[str, float]] = defaultdict(lambda: {"amount": 0.0, "count": 0})
    channels: Dict[str, Dict[str, float]] = defaultdict(lambda: {"amount": 0.0, "count": 0})
    items_revenue = 0.0
    costed_revenue = 0.0
    costed_cost = 0.0
    last_sale: Optional[datetime] = None

    for sale in sales:
        created = _as_utc(sale.get("created_at"))
        if not created or created < since[90]:
            continue
        amount = _num(sale.get("total_amount"))
        if last_sale is None or created > last_sale:
            last_sale = created
        for days in (7, 30, 90):
            if created >= since[days]:
                periods[days]["revenue"] += amount
                periods[days]["count"] += 1
        if created < since[30]:
            continue
        day = created.date().isoformat()
        if day in daily:
            daily[day]["revenue"] += amount
            daily[day]["count"] += 1
        for method, paid in _sale_payments(sale):
            payments[method]["amount"] += paid
            payments[method]["count"] += 1
        source = "ecommerce" if str(sale.get("source") or "").lower() == "ecommerce" else "physical"
        channels[source]["amount"] += amount
        channels[source]["count"] += 1
        for item in sale.get("items") or []:
            line_total = _num(item.get("total")) or _num(item.get("selling_price")) * _num(item.get("quantity"))
            quantity = _num(item.get("quantity"))
            items_revenue += line_total
            cost = _num(item.get("purchase_price"))
            if cost > 0:
                costed_revenue += line_total
                costed_cost += cost * quantity
            key = item.get("product_id") or item.get("product_name") or "inconnu"
            bucket = products.setdefault(key, {"product_id": item.get("product_id"), "name": item.get("product_name") or "Produit", "quantity": 0.0, "revenue": 0.0})
            bucket["quantity"] += quantity
            bucket["revenue"] += line_total

    def period_view(days: int) -> dict:
        revenue = round(periods[days]["revenue"], 2)
        count = periods[days]["count"]
        return {"revenue": revenue, "count": count, "avg_basket": round(revenue / count, 2) if count else 0}

    margin = round(costed_revenue - costed_cost, 2)
    return {
        "periods": {f"{days}d": period_view(days) for days in (7, 30, 90)},
        "daily_30d": [{"date": day, "revenue": round(v["revenue"], 2), "count": v["count"]} for day, v in daily.items()],
        "margin_30d": {
            "amount": margin,
            "pct": round(margin / costed_revenue * 100, 1) if costed_revenue else None,
            # Part du CA dont le prix d'achat est connu : la marge n'est calculée que sur cette part.
            "coverage_pct": round(costed_revenue / items_revenue * 100) if items_revenue else 0,
        },
        "top_products_30d": [
            {**row, "quantity": round(row["quantity"], 2), "revenue": round(row["revenue"], 2)}
            for row in sorted(products.values(), key=lambda r: -r["revenue"])[:8]
        ],
        "payment_methods_30d": [
            {"method": method, "label": PAYMENT_LABELS.get(method, method.replace("_", " ").capitalize()), "amount": round(v["amount"], 2), "count": int(v["count"])}
            for method, v in sorted(payments.items(), key=lambda item: -item[1]["amount"])
        ],
        "channels_30d": [
            {"source": source, "label": "E-commerce" if source == "ecommerce" else "Boutique physique", "amount": round(v["amount"], 2), "count": int(v["count"])}
            for source, v in sorted(channels.items(), key=lambda item: -item[1]["amount"])
        ],
        "last_sale_at": last_sale.isoformat() if last_sale else None,
    }
