from __future__ import annotations

import json
import logging
import os
from copy import deepcopy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

DEFAULT_COUNTRY_CODE = "SN"
DEFAULT_CURRENCY = "XOF"
FLUTTERWAVE_SUPPORTED_CURRENCIES = {"XOF", "XAF", "GNF", "CDF"}
FCFA_CURRENCIES = {"XOF", "XAF"}

XOF_COUNTRY_CODES = {
    "SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GW",
}
XAF_COUNTRY_CODES = {
    "CM", "GA", "CG", "CF", "TD", "GQ",
}
EU_COUNTRY_CODES = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
    "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
    "RO", "SK", "SI", "ES", "SE",
}

CURRENCY_LABELS = {
    "XOF": "FCFA",
    "XAF": "FCFA",
    "EUR": "EUR",
    "USD": "USD",
    "GNF": "GNF",
    "CDF": "CDF",
    "INR": "INR",
}

CURRENCY_SYMBOLS = {
    "EUR": "€",
    "USD": "$",
    "GBP": "£",
    "INR": "₹",
    "JPY": "¥",
}

DEFAULT_PRICING_CATALOG: Dict[str, Dict[str, Any]] = {
    "XOF": {
        "currency": "XOF",
        "display_currency": "FCFA",
        "provider": "flutterwave",
        "region": "waemu",
        "decimals": 0,
        "plans": {
            "starter": "2500",
            "pro": "4900",
            "enterprise": "9900",
        },
    },
    "XAF": {
        "currency": "XAF",
        "display_currency": "FCFA",
        "provider": "flutterwave",
        "region": "cemac",
        "decimals": 0,
        "plans": {
            "starter": "2500",
            "pro": "4900",
            "enterprise": "9900",
        },
    },
    "EUR": {
        "currency": "EUR",
        "display_currency": "EUR",
        "provider": "stripe",
        "region": "europe",
        "decimals": 2,
        "plans": {
            "starter": "6.99",
            "pro": "9.99",
            "enterprise": "14.99",
        },
    },
    "GNF": {
        "currency": "GNF",
        "display_currency": "GNF",
        "provider": "flutterwave",
        "region": "guinea",
        "decimals": 0,
        "plans": {
            "starter": "25000",
            "pro": "49000",
            "enterprise": "99000",
        },
    },
}


def _to_decimal(value: Any, fallback: str = "0") -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(fallback)


def _normalize_catalog_entry(currency: str, value: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(value, dict):
        return None
    plans = value.get("plans") if isinstance(value.get("plans"), dict) else {}
    normalized_plans = {}
    for plan in ("starter", "pro", "enterprise"):
        if plan in plans:
            normalized_plans[plan] = str(plans[plan])
    if not normalized_plans:
        return None
    decimals = value.get("decimals")
    try:
        decimals = int(decimals)
    except (TypeError, ValueError):
        decimals = 2 if currency == "EUR" else 0
    provider = str(value.get("provider") or ("flutterwave" if currency in FLUTTERWAVE_SUPPORTED_CURRENCIES else "stripe")).lower()
    if provider not in {"flutterwave", "stripe"}:
        provider = "stripe"
    return {
        "currency": currency,
        "display_currency": str(value.get("display_currency") or CURRENCY_LABELS.get(currency, currency)),
        "provider": provider,
        "region": str(value.get("region") or f"configured_{currency.lower()}"),
        "decimals": decimals,
        "plans": normalized_plans,
    }


def load_pricing_catalog() -> Dict[str, Dict[str, Any]]:
    catalog = deepcopy(DEFAULT_PRICING_CATALOG)
    raw = os.environ.get("PRICING_CATALOG_JSON")
    if not raw:
        return catalog
    try:
        overrides = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Invalid PRICING_CATALOG_JSON: %s", exc)
        return catalog

    if not isinstance(overrides, dict):
        return catalog

    for currency, entry in overrides.items():
        if not isinstance(currency, str):
            continue
        normalized = _normalize_catalog_entry(currency.upper(), entry)
        if normalized:
            catalog[currency.upper()] = normalized
    return catalog


def _format_decimal(amount: Decimal, decimals: int, currency: str, display_currency: str) -> str:
    quantize_pattern = "1" if decimals == 0 else f"1.{'0' * decimals}"
    quantized = amount.quantize(Decimal(quantize_pattern), rounding=ROUND_HALF_UP)
    if decimals == 0:
        integer_part = f"{int(quantized):,}".replace(",", " ")
        suffix = " FCFA" if currency in FCFA_CURRENCIES else f" {display_currency}"
        return f"{integer_part}{suffix}"

    amount_str = f"{quantized:,.{decimals}f}"
    amount_str = amount_str.replace(",", " ").replace(".", ",")
    symbol = CURRENCY_SYMBOLS.get(currency)
    if currency == "EUR":
        return f"{amount_str} €"
    if symbol:
        return f"{symbol}{amount_str}"
    return f"{amount_str} {display_currency}"


def detect_pricing_region(country_code: Optional[str] = None, currency: Optional[str] = None) -> str:
    normalized_country = (country_code or "").upper()
    normalized_currency = (currency or "").upper()
    if normalized_currency in FCFA_CURRENCIES or normalized_country in XOF_COUNTRY_CODES | XAF_COUNTRY_CODES:
        return "fcfa"
    if normalized_currency == "EUR" or normalized_country in EU_COUNTRY_CODES:
        return "europe"
    if normalized_currency:
        return f"currency_{normalized_currency.lower()}"
    return "fallback_sn_xof"


def _resolve_effective_currency(
    catalog: Dict[str, Dict[str, Any]],
    requested_country_code: Optional[str] = None,
    requested_currency: Optional[str] = None,
) -> str:
    country_code = (requested_country_code or "").upper()
    currency = (requested_currency or "").upper()

    if currency and currency in catalog:
        return currency
    if country_code in XOF_COUNTRY_CODES and "XOF" in catalog:
        return "XOF"
    if country_code in XAF_COUNTRY_CODES and "XAF" in catalog:
        return "XAF"
    if country_code in EU_COUNTRY_CODES and "EUR" in catalog:
        return "EUR"
    if currency in FCFA_CURRENCIES and currency in catalog:
        return currency
    if not country_code and not currency and "XOF" in catalog:
        return "XOF"
    if "EUR" in catalog:
        return "EUR"
    return DEFAULT_CURRENCY


def has_locked_billing_country(source_doc: Optional[dict]) -> bool:
    if not source_doc:
        return False
    provider = source_doc.get("subscription_provider")
    return bool(provider and provider not in {"none", ""}) or bool(source_doc.get("subscription_end"))


def build_pricing_payload(
    country_code: Optional[str] = None,
    currency: Optional[str] = None,
    *,
    locked: bool = False,
    catalog: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    active_catalog = catalog or load_pricing_catalog()
    requested_country_code = (country_code or DEFAULT_COUNTRY_CODE).upper()
    requested_currency = (currency or "").upper() or None
    effective_currency = _resolve_effective_currency(active_catalog, requested_country_code, requested_currency)
    entry = active_catalog.get(effective_currency) or active_catalog[DEFAULT_CURRENCY]
    pricing_region = detect_pricing_region(requested_country_code, effective_currency)

    plans: Dict[str, Dict[str, Any]] = {}
    for plan in ("starter", "pro", "enterprise"):
        amount = _to_decimal(entry["plans"].get(plan, "0"))
        plans[plan] = {
            "plan": plan,
            "currency": effective_currency,
            "display_currency": entry["display_currency"],
            "amount": str(amount),
            "display_price": _format_decimal(amount, entry["decimals"], effective_currency, entry["display_currency"]),
            "provider": entry["provider"],
        }

    return {
        "country_code": requested_country_code,
        "requested_currency": requested_currency,
        "currency": effective_currency,
        "display_currency": entry["display_currency"],
        "pricing_region": pricing_region,
        "recommended_checkout_provider": entry["provider"],
        "use_mobile_money": entry["provider"] == "flutterwave",
        "can_change_billing_country": not locked,
        "plans": plans,
        "fallback_used": requested_currency not in (None, "", effective_currency),
    }


def resolve_plan_amount(plan: str, currency: Optional[str], country_code: Optional[str] = None) -> Dict[str, Any]:
    payload = build_pricing_payload(country_code=country_code, currency=currency)
    plan_payload = payload["plans"].get(plan)
    if not plan_payload:
        raise KeyError(f"Unknown plan: {plan}")
    return {
        **plan_payload,
        "pricing_region": payload["pricing_region"],
        "use_mobile_money": payload["use_mobile_money"],
        "recommended_checkout_provider": payload["recommended_checkout_provider"],
    }

