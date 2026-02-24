import os
import json
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import httpx
import stripe as stripe_lib

logger = logging.getLogger(__name__)

# CinetPay configuration
CINETPAY_API_KEY = os.environ.get("CINETPAY_API_KEY", "")
CINETPAY_SITE_ID = os.environ.get("CINETPAY_SITE_ID", "")
CINETPAY_SECRET_KEY = os.environ.get("CINETPAY_SECRET_KEY", "")
BASE_URL = os.environ.get("API_URL", "https://stockman-production-149d.up.railway.app")

# Stripe configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# RevenueCat webhook secret
REVENUECAT_WEBHOOK_SECRET = os.environ.get("REVENUECAT_WEBHOOK_SECRET", "")

# Devises gérées par CinetPay (Mobile Money Afrique)
CINETPAY_CURRENCIES = {"XOF", "XAF", "GNF", "CDF"}

# Pricing (per month, after 3-month free trial)
# XOF/XAF = FCFA CinetPay | EUR in cents for Stripe
PRICES = {
    "starter":    {"XOF": 1000,  "XAF": 1000,  "GNF": 10000, "EUR": 399},
    "pro":        {"XOF": 2500,  "XAF": 2500,  "GNF": 25000, "EUR": 799},
    "enterprise": {"XOF": 10000, "XAF": 10000, "GNF": 100000, "EUR": 2999},
    "premium":    {"XOF": 2500,  "XAF": 2500,  "GNF": 25000, "EUR": 799},  # rétrocompat
}
PLAN_LABELS = {
    "starter":    "Stockman Starter - 1 mois",
    "pro":        "Stockman Pro - 1 mois",
    "enterprise": "Stockman Enterprise - 1 mois",
    "premium":    "Stockman Pro - 1 mois",
}


# ─── CinetPay ────────────────────────────────────────────────────────────────

async def create_cinetpay_session(user: dict, plan: str = "pro") -> dict:
    """Initialize a CinetPay payment session for Mobile Money."""
    transaction_id = f"stk_{uuid.uuid4().hex[:16]}"

    user_currency = user.get("currency", "XOF")
    plan_prices = PRICES.get(plan, PRICES["pro"])
    amount = plan_prices.get(user_currency) or plan_prices["XOF"]

    payload = {
        "apikey": CINETPAY_API_KEY,
        "site_id": CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
        "amount": amount,
        "currency": user_currency,
        "description": PLAN_LABELS.get(plan, "Stockman - 1 mois"),
        "notify_url": f"{BASE_URL}/api/webhooks/cinetpay",
        "return_url": f"{BASE_URL}/api/payment/success",
        "cancel_url": f"{BASE_URL}/api/payment/cancel",
        "channels": "MOBILE_MONEY",
        "metadata": json.dumps({"user_id": user["user_id"]}),
        "customer_name": user.get("name", ""),
        "customer_email": user.get("email", ""),
        "customer_phone_number": user.get("phone", ""),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api-checkout.cinetpay.com/v2/payment",
            json=payload,
            timeout=15.0,
        )
        data = resp.json()

    if data.get("code") == "201":
        return {
            "payment_url": data["data"]["payment_url"],
            "transaction_id": transaction_id,
        }
    else:
        logger.error(f"CinetPay init error: {data}")
        raise Exception(f"CinetPay error: {data.get('message', 'Unknown error')}")


async def verify_cinetpay_transaction(transaction_id: str) -> dict:
    """Check transaction status with CinetPay API."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api-checkout.cinetpay.com/v2/payment/check",
            json={
                "apikey": CINETPAY_API_KEY,
                "site_id": CINETPAY_SITE_ID,
                "transaction_id": transaction_id,
            },
            timeout=10.0,
        )
        return resp.json()


# ─── Stripe ──────────────────────────────────────────────────────────────────

async def create_stripe_session(user: dict, plan: str = "enterprise") -> dict:
    """Create a Stripe Checkout session (card payment, EUR)."""
    stripe_lib.api_key = STRIPE_SECRET_KEY
    amount_eur = PRICES.get(plan, PRICES["enterprise"])["EUR"]
    label = PLAN_LABELS.get(plan, "Stockman - 1 mois")

    def _create():
        return stripe_lib.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": label},
                    "unit_amount": amount_eur,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{BASE_URL}/api/payment/success",
            cancel_url=f"{BASE_URL}/api/payment/cancel",
            customer_email=user.get("email") or None,
            metadata={"user_id": user["user_id"], "plan": plan},
        )

    session = await asyncio.to_thread(_create)
    return {"checkout_url": session.url, "session_id": session.id}


def verify_stripe_event(payload: bytes, sig_header: str):
    """Verify Stripe webhook signature and return the event."""
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not set, skipping signature verification")
        import json as _json
        return _json.loads(payload)
    return stripe_lib.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)


# ─── RevenueCat ──────────────────────────────────────────────────────────────

def verify_revenuecat_webhook(auth_header: str) -> bool:
    """Verify RevenueCat webhook authorization header."""
    if not REVENUECAT_WEBHOOK_SECRET:
        logger.warning("REVENUECAT_WEBHOOK_SECRET not set, skipping verification")
        return True
    return auth_header == f"Bearer {REVENUECAT_WEBHOOK_SECRET}"
