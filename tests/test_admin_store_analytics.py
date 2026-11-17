import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import admin_store_analytics as sa  # noqa: E402

NOW = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)


def days_ago(days):
    return NOW - timedelta(days=days)


class ActivityAndBillingTests(unittest.TestCase):
    def test_activity_levels(self):
        self.assertEqual(sa.classify_activity(days_ago(2), NOW), "active")
        self.assertEqual(sa.classify_activity(days_ago(20), NOW), "slowing")
        self.assertEqual(sa.classify_activity(days_ago(45), NOW), "inactive")
        self.assertEqual(sa.classify_activity(None, NOW), "never")
        self.assertEqual(sa.classify_activity(days_ago(1).replace(tzinfo=None), NOW), "active")

    def test_billing_state(self):
        self.assertEqual(sa.billing_state({"subscription_provider": "stripe", "subscription_status": "active"}, NOW), "paying")
        self.assertEqual(sa.billing_state({"subscription_provider": "none", "trial_ends_at": days_ago(-5)}, NOW), "trial")
        self.assertEqual(sa.billing_state({"subscription_provider": "none", "trial_ends_at": days_ago(5)}, NOW), "expired")
        self.assertEqual(sa.billing_state(None, NOW), "expired")

    def test_trend_needs_a_previous_period(self):
        self.assertEqual(sa.trend_pct(150, 100), 50.0)
        self.assertIsNone(sa.trend_pct(150, 0))


class StoreRowsTests(unittest.TestCase):
    def setUp(self):
        stores = [
            {"store_id": "s1", "user_id": "u1", "name": "Boutique Dakar", "created_at": days_ago(3)},
            {"store_id": "s2", "user_id": "u2", "name": "Épicerie Lyon", "created_at": days_ago(200)},
            {"store_id": "s3", "user_id": "u1", "name": "Dépôt", "created_at": days_ago(40)},
        ]
        owners = {
            "u1": {"name": "Awa", "email": "awa@example.com", "country_code": "SN", "currency": "XOF", "business_type": "epicerie"},
            "u2": {"name": "Paul", "email": "paul@example.com", "country_code": "FR", "currency": "EUR"},
        }
        accounts = {"u1": {"plan": "pro", "subscription_provider": "stripe", "subscription_status": "active"}}
        stats = {
            "s1": {"total": 5000, "count": 10, "last_sale_at": days_ago(1), "revenue_30d": 3000, "sales_30d": 6, "revenue_prev_30d": 2000},
            "s2": {"total": 900, "count": 3, "last_sale_at": days_ago(50), "revenue_30d": 0, "sales_30d": 0, "revenue_prev_30d": 0},
        }
        self.rows = sa.build_store_rows(stores, owners, accounts, stats, {"s1": 12, "s2": 4}, NOW)

    def test_rows_carry_activity_trend_and_plan(self):
        s1, s2, s3 = self.rows
        self.assertEqual((s1["activity"], s1["revenue_trend_pct"], s1["plan"], s1["billing"]), ("active", 50.0, "pro", "paying"))
        self.assertEqual((s2["activity"], s2["billing"], s2["plan"]), ("inactive", "expired", "starter"))
        self.assertEqual((s3["activity"], s3["product_count"], s3["sales_count"]), ("never", 0, 0))

    def test_filters_and_search(self):
        self.assertEqual([r["store_id"] for r in sa.filter_rows(self.rows, country="SN")], ["s1", "s3"])
        self.assertEqual([r["store_id"] for r in sa.filter_rows(self.rows, search="paul@")], ["s2"])
        self.assertEqual([r["store_id"] for r in sa.filter_rows(self.rows, search="epicerie")], ["s2"])
        self.assertEqual([r["store_id"] for r in sa.filter_rows(self.rows, activity="never")], ["s3"])
        self.assertEqual([r["store_id"] for r in sa.filter_rows(self.rows, billing="paying")], ["s1", "s3"])

    def test_sorts(self):
        self.assertEqual([r["store_id"] for r in sa.sort_rows(self.rows)], ["s1", "s2", "s3"])
        self.assertEqual([r["store_id"] for r in sa.sort_rows(self.rows, "created")], ["s1", "s3", "s2"])
        self.assertEqual([r["store_id"] for r in sa.sort_rows(self.rows, "name")], ["s1", "s3", "s2"])

    def test_summary_never_mixes_currencies(self):
        summary = sa.summarize(self.rows, NOW)
        self.assertEqual(summary["total"], 3)
        self.assertEqual((summary["active_7d"], summary["active_30d"], summary["never_sold"]), (1, 1, 1))
        self.assertEqual(summary["without_products"], 1)
        self.assertEqual(summary["new_this_month"], 1)
        by_currency = {item["currency"]: item for item in summary["revenue_by_currency"]}
        self.assertEqual(by_currency["XOF"]["revenue_30d"], 3000)
        self.assertEqual(by_currency["EUR"]["revenue_30d"], 0)
        self.assertEqual(summary["by_country"][0], {"key": "SN", "count": 2})


class SalesAnalysisTests(unittest.TestCase):
    def test_periods_daily_margin_products_payments_channels(self):
        sales = [
            {"created_at": days_ago(1), "total_amount": 1000, "payment_method": "cash",
             "items": [{"product_id": "p1", "product_name": "Riz", "quantity": 2, "total": 1000, "purchase_price": 300}]},
            {"created_at": days_ago(10), "total_amount": 500, "payments": [{"method": "wave", "amount": 300}, {"method": "cash", "amount": 200}], "source": "ecommerce",
             "items": [{"product_id": "p2", "product_name": "Huile", "quantity": 1, "total": 500}]},
            {"created_at": days_ago(60), "total_amount": 700, "payment_method": "credit", "items": []},
            {"created_at": days_ago(120), "total_amount": 9999, "items": []},
        ]
        result = sa.build_sales_analysis(sales, NOW)
        self.assertEqual(result["periods"]["7d"], {"revenue": 1000, "count": 1, "avg_basket": 1000})
        self.assertEqual(result["periods"]["30d"]["revenue"], 1500)
        self.assertEqual(result["periods"]["90d"]["count"], 3)
        self.assertEqual(len(result["daily_30d"]), 30)
        self.assertEqual(result["daily_30d"][-2]["revenue"], 1000)
        # Marge calculée seulement sur le Riz (prix d'achat connu) : 1000 - 2 x 300.
        self.assertEqual(result["margin_30d"], {"amount": 400, "pct": 40.0, "coverage_pct": 67})
        self.assertEqual([p["name"] for p in result["top_products_30d"]], ["Riz", "Huile"])
        payments = {p["method"]: p["amount"] for p in result["payment_methods_30d"]}
        self.assertEqual(payments, {"cash": 1200, "wave": 300})
        channels = {c["source"]: c["amount"] for c in result["channels_30d"]}
        self.assertEqual(channels, {"physical": 1000, "ecommerce": 500})
        self.assertEqual(result["last_sale_at"], days_ago(1).isoformat())

    def test_empty_store(self):
        result = sa.build_sales_analysis([], NOW)
        self.assertEqual(result["periods"]["30d"], {"revenue": 0, "count": 0, "avg_basket": 0})
        self.assertIsNone(result["margin_30d"]["pct"])
        self.assertIsNone(result["last_sale_at"])


if __name__ == "__main__":
    unittest.main()
