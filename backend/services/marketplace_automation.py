import logging
from utils.i18n import i18n
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

class MarketplaceAutomationService:
    @staticmethod
    async def send_order(db, user_id: str, items: list, supplier_id: str = None, store_id: str = None, lang: str = "fr"):
        """Send a marketplace order and persist its trace."""
        try:
            order_id = f"ord_{uuid.uuid4().hex[:12]}"
            total_amount = 0
            
            for item in items:
                total_amount += item.get("quantity", 0) * item.get("cost", 0)
                
            order = {
                "order_id": order_id,
                "user_id": user_id,
                "store_id": store_id,
                "supplier_id": supplier_id,
                "items": items,
                "total_amount": total_amount,
                "status": "sent",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "simulation": True
            }
            
            await db.supplier_orders.insert_one(order)
            
            # Log
            await db.activity_logs.insert_one({
                "log_id": f"log_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "user_name": "System",
                "owner_id": user_id,
                "module": "marketplace",
                "action": "send_order",
                "description": i18n.t("marketplace.order_sent_description", lang, order_id=order_id, count=len(items)),
                "created_at": datetime.now(timezone.utc)
            })
            
            logger.info(f"Marketplace order {order_id} sent for user {user_id}")
            return {"status": "success", "order_id": order_id, "message": i18n.t("marketplace.order_sent_message", lang)}
            
        except Exception as e:
            logger.error(f"Error sending marketplace order: {e}")
            raise e
