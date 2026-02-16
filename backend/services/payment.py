import os
import logging
from datetime import datetime, timedelta
# import stripe # Uncomment when installed
import uuid

logger = logging.getLogger(__name__)

# Mock Stripe for now to avoid crashing if library is missing
class MockStripe:
    api_key = None
    class Checkout:
        class Session:
            @staticmethod
            def create(**kwargs):
                return {
                    "id": f"cs_test_{uuid.uuid4().hex}",
                    "url": "https://example.com/checkout_mock?success=true" 
                }
stripe = MockStripe()

# Configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
if STRIPE_SECRET_KEY:
    try:
        import stripe as real_stripe
        stripe = real_stripe
        stripe.api_key = STRIPE_SECRET_KEY
    except ImportError:
        logger.warning("Stripe library not installed. Using Mock.")

# Mobile Money Aggregator Config (e.g. CinetPay, PayTech)
MM_API_KEY = os.environ.get("MM_API_KEY")
MM_SITE_ID = os.environ.get("MM_SITE_ID")
BASE_URL = os.environ.get("API_URL", "http://localhost:8000")

async def create_payment_session(user: dict, plan_id: str = "premium"):
    """
    Creates a payment session based on user currency.
    Returns: {"payment_url": "..."}
    """
    currency = user.get("currency", "XOF")
    email = user.get("email")
    user_id = user.get("user_id")

    # 1. EUROPE (EUR) -> STRIPE
    if currency == "EUR":
        try:
            # Price ID should be in env or config, hardcoded for demo
            price_id = "price_123456789" # Replace with real Stripe Price ID
            
            checkout_session = stripe.Checkout.Session.create(
                customer_email=email,
                payment_method_types=['card'],
                line_items=[
                    {
                        # 'price': price_id, # Use real price ID in prod
                        'price_data': {
                            'currency': 'eur',
                            'product_data': {
                                'name': 'Stockman Premium',
                            },
                            'unit_amount': 499, # 4.99 EUR
                            'recurring': {
                                'interval': 'month',
                            },
                        },
                        'quantity': 1,
                    },
                ],
                mode='subscription',
                success_url=f"{BASE_URL}/api/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{BASE_URL}/api/payment/cancel",
                metadata={
                    "user_id": user_id,
                    "plan_id": plan_id
                }
            )
            return {"payment_url": checkout_session["url"]}
        except Exception as e:
            logger.error(f"Stripe Error: {e}")
            raise e

    # 2. AFRICA (XOF/XAF) -> MOBILE MONEY
    else:
        # Mocking a Mobile Money Aggregator (like CinetPay/Wave)
        # In production, you would make an HTTP POST to the aggregator
        
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
        amount = 2000 # 2000 FCFA
        
        # Simulating external provider URL
        # For now, we return a "success" URL directly to test the flow
        # In real life, this would be the aggregator's payment page
        mock_payment_url = f"{BASE_URL}/api/payment/mock-mm-gateway?txn={transaction_id}&user_id={user_id}"
        
        logger.info(f"Generated Mobile Money Link for {user_id}: {mock_payment_url}")
        return {"payment_url": mock_payment_url}

async def process_webhook(provider: str, payload: dict):
    """
    Handle webhooks from Stripe or MM providers to update user subscription
    """
    if provider == "stripe":
        pass # verify signature, update user.subscription_status
    elif provider == "mobile_money":
        pass
    return {"status": "processed"}
