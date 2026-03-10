from typing import Any, Dict, List, Optional


MeasurementType = str

WEIGHT_RATIOS = {
    "g": 1.0,
    "kg": 1000.0,
}

VOLUME_RATIOS = {
    "ml": 1.0,
    "cl": 10.0,
    "l": 1000.0,
}

UNIT_ALIASES = {
    "piece": "pièce",
    "pieces": "pièce",
    "pièce": "pièce",
    "pièces": "pièce",
    "unite": "pièce",
    "unité": "pièce",
    "unit": "pièce",
    "units": "pièce",
    "kg": "kg",
    "kilogramme": "kg",
    "kilogrammes": "kg",
    "g": "g",
    "gramme": "g",
    "grammes": "g",
    "l": "L",
    "litre": "L",
    "litres": "L",
    "ml": "ml",
    "millilitre": "ml",
    "millilitres": "ml",
    "cl": "cL",
    "centilitre": "cL",
    "centilitres": "cL",
}


def round_quantity(value: Any, decimals: int = 3) -> float:
    return round(float(value or 0.0), decimals)


def normalize_unit_label(unit: Optional[str]) -> str:
    raw = str(unit or "").strip()
    if not raw:
        return "pièce"
    key = raw.lower()
    return UNIT_ALIASES.get(key, raw)


def infer_measurement_type(unit: Optional[str], explicit: Optional[str] = None) -> MeasurementType:
    if explicit in {"unit", "weight", "volume"}:
        return explicit
    normalized = normalize_unit_label(unit)
    if normalized in WEIGHT_RATIOS:
        return "weight"
    if normalized.lower() in VOLUME_RATIOS:
        return "volume"
    return "unit"


def default_precision_for_unit(unit: Optional[str], measurement_type: Optional[str] = None) -> float:
    normalized = normalize_unit_label(unit)
    resolved_type = infer_measurement_type(normalized, measurement_type)
    if resolved_type == "weight":
        return 1.0 if normalized == "g" else 0.001
    if resolved_type == "volume":
        if normalized == "ml":
            return 1.0
        if normalized == "cL":
            return 0.01
        return 0.001
    return 1.0


def default_sale_units(unit: Optional[str], measurement_type: Optional[str] = None) -> List[str]:
    normalized = normalize_unit_label(unit)
    resolved_type = infer_measurement_type(normalized, measurement_type)
    if resolved_type == "weight":
        return ["g", "kg"]
    if resolved_type == "volume":
        return ["ml", "cL", "L"]
    return [normalized]


def normalize_product_measurement_fields(product: Dict[str, Any]) -> Dict[str, Any]:
    normalized = dict(product or {})
    unit = normalize_unit_label(
        normalized.get("unit")
        or normalized.get("display_unit")
        or normalized.get("pricing_unit")
        or "pièce"
    )
    measurement_type = infer_measurement_type(unit, normalized.get("measurement_type"))
    display_unit = normalize_unit_label(normalized.get("display_unit") or unit)
    pricing_unit = normalize_unit_label(normalized.get("pricing_unit") or unit)
    quantity_precision = normalized.get("quantity_precision")
    if quantity_precision in (None, "", 0):
        quantity_precision = default_precision_for_unit(pricing_unit, measurement_type)

    allows_fractional_sale = normalized.get("allows_fractional_sale")
    if allows_fractional_sale is None:
        allows_fractional_sale = measurement_type in {"weight", "volume"}

    normalized["unit"] = unit
    normalized["measurement_type"] = measurement_type
    normalized["display_unit"] = display_unit
    normalized["pricing_unit"] = pricing_unit
    normalized["allows_fractional_sale"] = bool(allows_fractional_sale)
    normalized["quantity_precision"] = round_quantity(quantity_precision, 3)
    normalized["quantity"] = round_quantity(normalized.get("quantity", 0))
    normalized["min_stock"] = round_quantity(normalized.get("min_stock", 0))
    normalized["max_stock"] = round_quantity(normalized.get("max_stock", 100))
    return normalized


def get_measurement_ratios(measurement_type: Optional[str]) -> Dict[str, float]:
    if measurement_type == "weight":
        return WEIGHT_RATIOS
    if measurement_type == "volume":
        return VOLUME_RATIOS
    return {"pièce": 1.0}


def convert_quantity(value: Any, from_unit: Optional[str], to_unit: Optional[str], measurement_type: Optional[str]) -> float:
    numeric = float(value or 0.0)
    normalized_from = normalize_unit_label(from_unit)
    normalized_to = normalize_unit_label(to_unit)
    resolved_type = infer_measurement_type(normalized_to, measurement_type)
    if resolved_type == "unit":
        return round_quantity(numeric)
    ratios = get_measurement_ratios(resolved_type)
    from_key = normalized_from.lower() if resolved_type == "volume" else normalized_from
    to_key = normalized_to.lower() if resolved_type == "volume" else normalized_to
    if from_key not in ratios or to_key not in ratios:
        raise ValueError("Unité incompatible")
    base_value = numeric * ratios[from_key]
    return round_quantity(base_value / ratios[to_key])


def is_multiple_of_precision(value: Any, precision: Any) -> bool:
    numeric = float(value or 0.0)
    step = float(precision or 1.0)
    if step <= 0:
        return True
    quotient = numeric / step
    return abs(round(quotient) - quotient) < 1e-6


def build_sale_quantity_context(product: Dict[str, Any], item: Dict[str, Any]) -> Dict[str, Any]:
    normalized_product = normalize_product_measurement_fields(product)
    measurement_type = normalized_product["measurement_type"]
    pricing_unit = normalized_product["pricing_unit"]
    raw_quantity = item.get("quantity", 1)
    sold_unit = normalize_unit_label(item.get("sold_unit") or pricing_unit)
    sold_quantity_input = float(item.get("sold_quantity_input", raw_quantity) or 0)

    if item.get("sold_quantity_input") is not None or item.get("sold_unit") is not None:
        quantity = convert_quantity(sold_quantity_input, sold_unit, pricing_unit, measurement_type)
    else:
        quantity = round_quantity(raw_quantity)
        sold_quantity_input = quantity
        sold_unit = pricing_unit

    if quantity <= 0:
        raise ValueError("Quantité invalide")

    precision_in_pricing_unit = normalized_product["quantity_precision"]
    if not is_multiple_of_precision(quantity, precision_in_pricing_unit):
        raise ValueError("La quantité ne respecte pas le pas de vente du produit")

    return {
        "quantity": round_quantity(quantity),
        "sold_quantity_input": round_quantity(sold_quantity_input),
        "sold_unit": sold_unit,
        "measurement_type": measurement_type,
        "pricing_unit": pricing_unit,
        "display_unit": normalized_product["display_unit"],
    }


def format_quantity(value: Any, unit: Optional[str]) -> str:
    numeric = round_quantity(value)
    if abs(numeric - round(numeric)) < 1e-6:
        text = str(int(round(numeric)))
    else:
        text = f"{numeric:.3f}".rstrip("0").rstrip(".")
    return f"{text} {normalize_unit_label(unit)}".strip()
