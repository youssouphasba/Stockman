"""Analyse des produits des commerçants et de l'usage du catalogue global, pour l'admin.

Le serveur lit les documents ; ce module calcule. Les prix et les montants ne sont
jamais mélangés entre devises : on compare des quantités, des nombres de boutiques,
et des prix médians par pays.
"""

import statistics
import unicodedata
from collections import Counter, defaultdict
from typing import Any, Dict, Iterable, List, Optional

QUALITY_FLAGS = {
    "no_selling_price": "Sans prix de vente",
    "no_purchase_price": "Sans prix d’achat",
    "no_category": "Sans catégorie",
    "no_barcode": "Sans code-barres",
    "negative_stock": "Stock négatif",
}

# Écart au-delà duquel un prix de référence du catalogue est signalé.
PRICE_DRIFT_ALERT_PCT = 30
# Nombre minimal de prix observés pour comparer au prix de référence.
MIN_OBSERVED_PRICES = 3
# Seuil sous lequel une case secteur × pays est considérée comme peu couverte.
THIN_COVERAGE = 10


def canonical(name: Any) -> str:
    """Même normalisation que le catalogue global : minuscules, sans accents, espaces réduits."""
    text = str(name or "").strip().lower()
    text = "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))
    return " ".join(text.split())


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _codes(product: dict) -> List[str]:
    return [str(v).strip() for v in (product.get("barcode"), product.get("sku")) if str(v or "").strip()]


def product_flags(product: dict) -> List[str]:
    flags = []
    if _num(product.get("selling_price")) <= 0:
        flags.append("no_selling_price")
    if _num(product.get("purchase_price")) <= 0:
        flags.append("no_purchase_price")
    if not str(product.get("category") or "").strip() and not product.get("category_id"):
        flags.append("no_category")
    if not product.get("barcode"):
        flags.append("no_barcode")
    if _num(product.get("quantity")) < 0:
        flags.append("negative_stock")
    return flags


def quality_report(products: Iterable[dict], owners: Dict[str, dict], merchant_limit: int = 100) -> dict:
    totals = {flag: 0 for flag in QUALITY_FLAGS}
    per_owner: Dict[str, Dict[str, Any]] = {}
    count = 0
    for product in products:
        count += 1
        owner_id = product.get("user_id")
        bucket = per_owner.setdefault(owner_id, {"products": 0, **{flag: 0 for flag in QUALITY_FLAGS}})
        bucket["products"] += 1
        for flag in product_flags(product):
            totals[flag] += 1
            bucket[flag] += 1
    merchants = []
    for owner_id, bucket in per_owner.items():
        owner = owners.get(owner_id) or {}
        issues = sum(bucket[flag] for flag in ("no_selling_price", "no_purchase_price", "negative_stock"))
        merchants.append({
            "user_id": owner_id,
            "name": owner.get("name") or "Inconnu",
            "email": owner.get("email") or "",
            "country_code": owner.get("country_code"),
            "issues": issues,
            **bucket,
        })
    merchants.sort(key=lambda row: (-row["issues"], -row["products"]))
    return {
        "total_products": count,
        "totals": totals,
        "labels": QUALITY_FLAGS,
        "merchants": merchants[:merchant_limit],
    }


def top_sold(rows: Iterable[dict], owners: Dict[str, dict], limit: int = 20) -> List[dict]:
    """rows : agrégat Mongo par (user_id, store_id, nom du produit) des ventes sur la période."""
    merged: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        key_doc = row.get("_id") or {}
        name = str(key_doc.get("name") or "").strip()
        key = canonical(name)
        if not key:
            continue
        owner = owners.get(key_doc.get("user")) or {}
        bucket = merged.setdefault(key, {"names": Counter(), "quantity": 0.0, "sales": 0, "stores": set(), "merchants": set(), "countries": Counter()})
        bucket["names"][name] += 1
        bucket["quantity"] += _num(row.get("quantity"))
        bucket["sales"] += int(row.get("sales") or 0)
        bucket["stores"].add(key_doc.get("store"))
        bucket["merchants"].add(key_doc.get("user"))
        if owner.get("country_code"):
            bucket["countries"][owner["country_code"]] += 1
    result = [
        {
            "name": bucket["names"].most_common(1)[0][0],
            "quantity": round(bucket["quantity"], 2),
            "sales": bucket["sales"],
            "stores": len(bucket["stores"]),
            "merchants": len(bucket["merchants"]),
            "countries": [code for code, _ in bucket["countries"].most_common()],
        }
        for bucket in merged.values()
    ]
    # Un produit vendu par beaucoup de boutiques compte plus qu'un gros volume dans une seule.
    result.sort(key=lambda row: (-row["merchants"], -row["quantity"]))
    return result[:limit]


def _median_prices(products: Iterable[dict], owners: Dict[str, dict]) -> List[dict]:
    by_currency: Dict[str, List[float]] = defaultdict(list)
    for product in products:
        price = _num(product.get("selling_price"))
        if price > 0:
            by_currency[(owners.get(product.get("user_id")) or {}).get("currency") or "—"].append(price)
    return [
        {"currency": currency, "median": round(statistics.median(values), 2), "min": round(min(values), 2), "max": round(max(values), 2), "count": len(values)}
        for currency, values in sorted(by_currency.items(), key=lambda item: -len(item[1]))
    ]


def build_catalog_index(entries: Iterable[dict], visible_ids: set) -> Dict[str, Dict[str, dict]]:
    by_name: Dict[str, dict] = {}
    by_code: Dict[str, dict] = {}
    by_id: Dict[str, dict] = {}
    for entry in entries:
        ref = {"catalog_id": entry.get("catalog_id"), "visible": entry.get("catalog_id") in visible_ids, "display_name": entry.get("display_name")}
        by_id[entry.get("catalog_id")] = ref
        name = entry.get("canonical_name") or canonical(entry.get("display_name"))
        if name and (name not in by_name or ref["visible"]):
            by_name[name] = ref
        for code in entry.get("barcodes") or []:
            code = str(code or "").strip()
            if code and (code not in by_code or ref["visible"]):
                by_code[code] = ref
    return {"name": by_name, "code": by_code, "id": by_id}


def match_catalog(product: dict, index: Dict[str, Dict[str, dict]]) -> Optional[dict]:
    linked = product.get("global_catalog_id")
    if linked and linked in index["id"]:
        return index["id"][linked]
    for code in _codes(product):
        if code in index["code"]:
            return index["code"][code]
    return index["name"].get(canonical(product.get("name")))


def catalog_candidates(products: Iterable[dict], owners: Dict[str, dict], index: Dict[str, Dict[str, dict]], min_merchants: int = 2, limit: int = 60) -> List[dict]:
    """Produits créés par plusieurs commerçants et absents du catalogue proposé aux commerçants."""
    groups: Dict[str, Dict[str, Any]] = {}
    for product in products:
        match = match_catalog(product, index)
        if match and match["visible"]:
            continue
        key = canonical(product.get("name"))
        if len(key) < 2:
            continue
        owner = owners.get(product.get("user_id")) or {}
        group = groups.setdefault(key, {
            "names": Counter(), "merchants": set(), "stores": set(), "countries": Counter(), "sectors": Counter(),
            "categories": Counter(), "units": Counter(), "barcodes": Counter(), "products": [], "pending": None,
        })
        group["names"][str(product.get("name") or "").strip()] += 1
        group["merchants"].add(product.get("user_id"))
        group["stores"].add(product.get("store_id"))
        if owner.get("country_code"):
            group["countries"][owner["country_code"]] += 1
        if owner.get("sector"):
            group["sectors"][owner["sector"]] += 1
        if str(product.get("category") or "").strip():
            group["categories"][str(product["category"]).strip()] += 1
        if str(product.get("unit") or "").strip():
            group["units"][str(product["unit"]).strip()] += 1
        for code in _codes(product):
            group["barcodes"][code] += 1
        group["products"].append(product)
        if match and not match["visible"]:
            group["pending"] = match
    result = []
    for key, group in groups.items():
        if len(group["merchants"]) < min_merchants:
            continue
        result.append({
            "key": key,
            "name": group["names"].most_common(1)[0][0],
            "variants": [name for name, _ in group["names"].most_common(4)],
            "merchants": len(group["merchants"]),
            "stores": len(group["stores"]),
            "countries": [code for code, _ in group["countries"].most_common()],
            "sector": group["sectors"].most_common(1)[0][0] if group["sectors"] else None,
            "category": group["categories"].most_common(1)[0][0] if group["categories"] else None,
            "unit": group["units"].most_common(1)[0][0] if group["units"] else None,
            "barcodes": [code for code, _ in group["barcodes"].most_common(3)],
            "prices": _median_prices(group["products"], owners),
            # Fiche déjà présente dans le catalogue mais pas encore publiée ni vérifiée.
            "pending_catalog_id": group["pending"]["catalog_id"] if group["pending"] else None,
        })
    result.sort(key=lambda row: (-row["merchants"], -row["stores"]))
    return result[:limit]


def catalog_usage(
    entries: List[dict],
    visible_ids: set,
    products: Iterable[dict],
    owners: Dict[str, dict],
    sold_by_product: Dict[str, Dict[str, Any]],
) -> dict:
    """Usage de chaque fiche : boutiques qui l'ont importée ou l'ont déjà, ventes sur 30 jours, prix observés."""
    index = build_catalog_index(entries, visible_ids)
    usage: Dict[str, Dict[str, Any]] = {
        entry.get("catalog_id"): {"imported_stores": set(), "matched_stores": set(), "selling_stores": set(), "quantity_30d": 0.0, "prices": defaultdict(list)}
        for entry in entries
    }
    for product in products:
        match = match_catalog(product, index)
        if not match:
            continue
        bucket = usage.get(match["catalog_id"])
        if bucket is None:
            continue
        store_id = product.get("store_id")
        bucket["matched_stores"].add(store_id)
        if product.get("global_catalog_id") == match["catalog_id"]:
            bucket["imported_stores"].add(store_id)
        sold = sold_by_product.get(product.get("product_id"))
        if sold and _num(sold.get("quantity")) > 0:
            bucket["selling_stores"].add(store_id)
            bucket["quantity_30d"] += _num(sold.get("quantity"))
        price = _num(product.get("selling_price"))
        country = (owners.get(product.get("user_id")) or {}).get("country_code")
        if price > 0 and country:
            bucket["prices"][country].append(price)

    rows = []
    for entry in entries:
        catalog_id = entry.get("catalog_id")
        bucket = usage[catalog_id]
        countries = [c for c in (entry.get("country_codes") or []) if c]
        reference = _num(entry.get("sale_price")) or _num(entry.get("reference_price"))
        observed = []
        for country, values in sorted(bucket["prices"].items(), key=lambda item: -len(item[1])):
            median = statistics.median(values)
            drift = None
            # Comparaison seulement si la fiche vise un seul pays : sinon on ne sait pas dans quelle devise est le prix.
            if reference > 0 and len(countries) == 1 and countries[0] == country and len(values) >= MIN_OBSERVED_PRICES:
                drift = round((median - reference) / reference * 100, 1)
            observed.append({"country_code": country, "median": round(median, 2), "count": len(values), "drift_pct": drift})
        drifts = [row["drift_pct"] for row in observed if row["drift_pct"] is not None]
        rows.append({
            "catalog_id": catalog_id,
            "display_name": entry.get("display_name"),
            "sector": entry.get("sector"),
            "category": entry.get("category"),
            "country_codes": countries,
            "visible": catalog_id in visible_ids,
            "reference_price": reference or None,
            "imported_stores": len(bucket["imported_stores"]),
            "matched_stores": len(bucket["matched_stores"]),
            "selling_stores_30d": len(bucket["selling_stores"]),
            "quantity_30d": round(bucket["quantity_30d"], 2),
            "observed_prices": observed[:5],
            "price_alert": any(abs(value) >= PRICE_DRIFT_ALERT_PCT for value in drifts),
        })
    visible_rows = [row for row in rows if row["visible"]]
    return {
        "items": rows,
        "summary": {
            "entries": len(rows),
            "visible": len(visible_rows),
            "never_used": sum(1 for row in visible_rows if not row["matched_stores"]),
            "imported_links": sum(row["imported_stores"] for row in rows),
            "selling_30d": sum(1 for row in visible_rows if row["selling_stores_30d"]),
            "price_alerts": sum(1 for row in rows if row["price_alert"]),
        },
    }


def coverage_matrix(entries: Iterable[dict], visible_ids: set, owners: Dict[str, dict], sector_labels: Dict[str, str]) -> dict:
    """Fiches proposées par secteur et par pays, face au nombre de commerçants de ce secteur dans ce pays."""
    merchants: Dict[tuple, int] = defaultdict(int)
    countries = Counter()
    for owner in owners.values():
        if owner.get("country_code") and owner.get("sector"):
            merchants[(owner["sector"], owner["country_code"])] += 1
            countries[owner["country_code"]] += 1
    entries_count: Dict[tuple, int] = defaultdict(int)
    for entry in entries:
        if entry.get("catalog_id") not in visible_ids:
            continue
        codes = [c for c in (entry.get("country_codes") or []) if c]
        for country in (codes or list(countries)):
            entries_count[(entry.get("sector") or "autre", country)] += 1
    country_list = [code for code, _ in countries.most_common(12)]
    sectors = sorted({sector for sector, _ in merchants} | {sector for sector, _ in entries_count}, key=lambda s: -sum(merchants[(s, c)] for c in country_list))
    rows = []
    gaps = []
    for sector in sectors:
        cells = []
        for country in country_list:
            cell = {"country_code": country, "entries": entries_count[(sector, country)], "merchants": merchants[(sector, country)]}
            cell["thin"] = cell["merchants"] > 0 and cell["entries"] < THIN_COVERAGE
            if cell["thin"]:
                gaps.append({"sector": sector, "sector_label": sector_labels.get(sector, sector), **cell})
            cells.append(cell)
        rows.append({"sector": sector, "sector_label": sector_labels.get(sector, sector), "cells": cells})
    gaps.sort(key=lambda gap: (-gap["merchants"], gap["entries"]))
    return {"countries": country_list, "rows": rows, "gaps": gaps[:20], "thin_threshold": THIN_COVERAGE}
