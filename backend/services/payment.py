import os
import json
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta

import httpx
import stripe as stripe_lib

logger = logging.getLogger(__name__)

# Flutterwave configuration (remplace CinetPay — pas besoin de société africaine)
FLW_SECRET_KEY = os.environ.get("FLW_SECRET_KEY", "")
FLW_HASH = os.environ.get("FLW_HASH", "")  # webhook verification hash
BASE_URL = os.environ.get("API_URL", "https://stockman-production-149d.up.railway.app")

# Stripe configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Stripe Price IDs (recurring monthly subscriptions)
STRIPE_PRICES = {
    "starter":    os.environ.get("STRIPE_PRICE_STARTER",    "price_1T5o3cGpkYa46RHL4xR75B0Z"),
    "pro":        os.environ.get("STRIPE_PRICE_PRO",        "price_1T5o4YGpkYa46RHLP4AFu7sv"),
    "enterprise": os.environ.get("STRIPE_PRICE_ENTERPRISE", "price_1T5o7MGpkYa46RHLOFg7dpzs"),
}

# RevenueCat webhook secret
REVENUECAT_WEBHOOK_SECRET = os.environ.get("REVENUECAT_WEBHOOK_SECRET", "")

# Devises gérées par Flutterwave Mobile Money (Afrique de l'Ouest/Centre)
FLUTTERWAVE_CURRENCIES = {"XOF", "XAF", "GNF", "CDF"}
# Alias rétrocompat
CINETPAY_CURRENCIES = FLUTTERWAVE_CURRENCIES

# Pricing (per month, after 3-month free trial)
# XOF/XAF = FCFA Flutterwave | EUR in cents for Stripe
PRICES = {
    "starter":    {"XOF": 1000,  "XAF": 1000,  "GNF": 10000, "EUR": 399},
    "pro":        {"XOF": 2500,  "XAF": 2500,  "GNF": 25000, "EUR": 799},
    "enterprise": {"XOF": 9400,  "XAF": 9400,  "GNF": 94000,  "EUR": 1499},
    "premium":    {"XOF": 2500,  "XAF": 2500,  "GNF": 25000, "EUR": 799},  # rétrocompat
}
PLAN_LABELS = {
    "starter":    "Stockman Starter - 1 mois",
    "pro":        "Stockman Pro - 1 mois",
    "enterprise": "Stockman Enterprise - 1 mois",
    "premium":    "Stockman Pro - 1 mois",
}


# ─── Flutterwave ─────────────────────────────────────────────────────────────

async def create_flutterwave_session(user: dict, plan: str = "pro") -> dict:
    """Initialize a Flutterwave Standard payment link for Mobile Money."""
    transaction_id = f"stk_{uuid.uuid4().hex[:16]}"

    user_currency = user.get("currency", "XOF")
    plan_prices = PRICES.get(plan, PRICES["pro"])
    amount = plan_prices.get(user_currency) or plan_prices["XOF"]

    payload = {
        "tx_ref": transaction_id,
        "amount": amount,
        "currency": user_currency,
        "redirect_url": f"{BASE_URL}/api/payment/success",
        "payment_options": "mobilemoneyssenegal,mobilemoneyghana,mobilemoneyfranco,card",
        "meta": {"user_id": user["user_id"], "plan": plan},
        "customer": {
            "email": user.get("email", "noreply@stockman.app"),
            "phonenumber": user.get("phone", ""),
            "name": user.get("name", ""),
        },
        "customizations": {
            "title": "Stockman",
            "description": PLAN_LABELS.get(plan, "Stockman - 1 mois"),
            "logo": "https://stockman.app/logo.png",
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.flutterwave.com/v3/payments",
            json=payload,
            headers={"Authorization": f"Bearer {FLW_SECRET_KEY}"},
            timeout=15.0,
        )
        data = resp.json()

    if data.get("status") == "success":
        return {
            "payment_url": data["data"]["link"],
            "transaction_id": transaction_id,
        }
    else:
        logger.error(f"Flutterwave init error: {data}")
        raise Exception(f"Flutterwave error: {data.get('message', 'Unknown error')}")


async def verify_flutterwave_transaction(transaction_id: str) -> dict:
    """Verify a Flutterwave transaction by tx_ref."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.flutterwave.com/v3/transactions",
            params={"tx_ref": transaction_id},
            headers={"Authorization": f"Bearer {FLW_SECRET_KEY}"},
            timeout=10.0,
        )
        return resp.json()


# Alias rétrocompat (pour ne pas casser d'autres imports éventuels)
async def create_cinetpay_session(user: dict, plan: str = "pro") -> dict:
    return await create_flutterwave_session(user, plan)

async def verify_cinetpay_transaction(transaction_id: str) -> dict:
    return await verify_flutterwave_transaction(transaction_id)


# ─── Stripe ──────────────────────────────────────────────────────────────────

async def create_stripe_session(user: dict, plan: str = "enterprise") -> dict:
    """Create a Stripe Checkout session for a recurring monthly subscription."""
    stripe_lib.api_key = STRIPE_SECRET_KEY
    price_id = STRIPE_PRICES.get(plan, STRIPE_PRICES["enterprise"])

    def _create():
        return stripe_lib.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{BASE_URL}/api/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{BASE_URL}/api/payment/cancel",
            customer_email=user.get("email") or None,
            metadata={"user_id": user["user_id"], "plan": plan},
            subscription_data={"metadata": {"user_id": user["user_id"], "plan": plan}},
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
