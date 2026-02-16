import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict

logger = logging.getLogger(__name__)

class OperationalService:
    @staticmethod
    async def calculate_abc_classes(db, user_id: str, store_id: str = None):
        """
        Perform ABC Analysis on inventory based on last 30 days revenue.
        A-Items: Top 80% of revenue (Vital few)
        B-Items: Next 15% (Average)
        C-Items: Bottom 5% (Trivial many)
        """
        try:
            now = datetime.now(timezone.utc)
            thirty_days_ago = now - timedelta(days=30)
            
            # 1. Fetch Sales
            match_query = {
                "user_id": user_id,
                "created_at": {"$gte": thirty_days_ago}
            }
            if store_id:
                match_query["store_id"] = store_id
                
            pipeline = [
                {"$match": match_query},
                {"$unwind": "$items"},
                {"$group": {
                    "_id": "$items.product_id",
                    "revenue": {"$sum": "$items.total"},
                    "quantity": {"$sum": "$items.quantity"}
                }},
                {"$sort": {"revenue": -1}}
            ]
            
            product_stats = await db.sales.aggregate(pipeline).to_list(None)
            
            if not product_stats:
                return {"message": "Pas assez de données de vente pour l'analyse ABC."}
                
            total_revenue = sum(p["revenue"] for p in product_stats)
            if total_revenue == 0:
                return {"message": "Aucun revenu généré sur la période."}
                
            # 2. Assign Classes
            cumulative_revenue = 0
            updates = []
            
            stats = {
                "A": 0, "B": 0, "C": 0, "total_products": len(product_stats)
            }
            
            for p in product_stats:
                revenue = p["revenue"]
                cumulative_revenue += revenue
                cum_pct = cumulative_revenue / total_revenue
                
                abc_class = "C"
                if cum_pct <= 0.80:
                    abc_class = "A"
                elif cum_pct <= 0.95:
                    abc_class = "B"
                
                stats[abc_class] += 1
                
                updates.append({
                    "product_id": p["_id"],
                    "abc_class": abc_class,
                    "abc_revenue_30d": revenue
                })
                
            # 3. Bulk Update Products
            # Using bulk_write would be better efficiently, but for simplicity loop updates
            # optimize with individual updates for now or UpdateMany if possible
            from pymongo import UpdateOne
            bulk_ops = [
                UpdateOne(
                    {"product_id": u["product_id"]},
                    {"$set": {"abc_class": u["abc_class"], "abc_revenue_30d": u["abc_revenue_30d"]}}
                )
                for u in updates
            ]
            
            if bulk_ops:
                await db.products.bulk_write(bulk_ops)
                
            logger.info(f"ABC Analysis completed for {user_id}: {stats}")
            return {
                "status": "completed",
                "stats": stats,
                "period": "30 days",
                "total_revenue": total_revenue
            }
            
        except Exception as e:
            logger.error(f"Error in ABC Analysis: {e}")
            raise e
