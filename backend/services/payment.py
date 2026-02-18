import os
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta

import httpx

logger = logging.getLogger(__name__)

# CinetPay configuration
CINETPAY_API_KEY = os.environ.get("CINETPAY_API_KEY", "")
CINETPAY_SITE_ID = os.environ.get("CINETPAY_SITE_ID", "")
CINETPAY_SECRET_KEY = os.environ.get("CINETPAY_SECRET_KEY", "")
BASE_URL = os.environ.get("API_URL", "https://stockman-production-149d.up.railway.app")

# RevenueCat webhook secret
REVENUECAT_WEBHOOK_SECRET = os.environ.get("REVENUECAT_WEBHOOK_SECRET", "")

# Pricing (per month, after 3-month free trial)
PRICES = {
    "starter": {"XOF": 1000, "EUR": 399},   # 1000 FCFA or 3.99€
    "premium": {"XOF": 2500, "EUR": 799},    # 2500 FCFA or 7.99€
}
PREMIUM_PRICE_XOF = 2500  # backward compat


async def create_cinetpay_session(user: dict) -> dict:
    """Initialize a CinetPay payment session for Mobile Money."""
    transaction_id = f"stk_{uuid.uuid4().hex[:16]}"

    user_currency = user.get("currency", "XOF")
    amount = PRICES.get("premium", {}).get(user_currency, PREMIUM_PRICE_XOF)
    
    payload = {
        "apikey": CINETPAY_API_KEY,
        "site_id": CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
        "amount": amount,
        "currency": user_currency,
        "description": "Stockman Premium - 1 mois",
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


def verify_revenuecat_webhook(auth_header: str) -> bool:
    """Verify RevenueCat webhook authorization header."""
    if not REVENUECAT_WEBHOOK_SECRET:
        logger.warning("REVENUECAT_WEBHOOK_SECRET not set, skipping verification")
        return True
    return auth_header == f"Bearer {REVENUECAT_WEBHOOK_SECRET}"
