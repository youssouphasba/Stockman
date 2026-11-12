"""Calculs de Finances par canal. Les agrégations Mongo sont exécutées par mongomock, s'il est
installé ; sinon ces tests sont ignorés."""

import asyncio
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import finance_report  # noqa: E402

try:
    import mongomock
except ImportError:  # pragma: no cover
    mongomock = None


class _Cursor:
    def __init__(self, rows):
        self.rows = list(rows)

    async def to_list(self, length=None):
        return self.rows if length is None else self.rows[:length]


class _Collection:
    def __init__(self, collection):
        self.collection = collection

    def aggregate(self, pipeline):
        return _Cursor(self.collection.aggregate(pipeline))


class _Database:
    def __init__(self):
        self.raw = mongomock.MongoClient().db

    def __getattr__(self, name):
        return _Collection(self.raw[name])


def run(coro):
    return asyncio.run(coro)


def day(n, hour=10):
    return datetime(2026, 11, n, hour, 0)


@unittest.skipIf(mongomock is None, "mongomock absent")
class FinanceReportTests(unittest.TestCase):
    def setUp(self):
        self.db = _Database()
        # Ventes techniques de test : montants neutres, jamais affichés par l'application.
        self.db.raw.sales.insert_many([
            {"sale_id": "s1", "user_id": "u1", "created_at": day(1), "total_amount": 100, "payment_method": "cash", "tax_total": 10,
             "items": [{"product_id": "p1", "product_name": "P1", "quantity": 2, "selling_price": 50, "purchase_price": 30, "total": 100}]},
            {"sale_id": "s2", "user_id": "u1", "created_at": day(1), "total_amount": 60, "payment_method": "credit", "credit_debt_applied": 60,
             "items": [{"product_id": "p2", "product_name": "P2", "quantity": 1, "selling_price": 60, "purchase_price": 20}]},
            {"sale_id": "s3", "user_id": "u1", "created_at": day(2), "total_amount": 200, "payment_method": "mobile_money", "source": "ecommerce",
             "items": [{"product_id": "p1", "product_name": "P1", "quantity": 4, "selling_price": 50, "purchase_price": 30, "total": 200}]},
            {"sale_id": "s4", "user_id": "u1", "created_at": day(3), "total_amount": 40, "payment_method": "credit", "source": "ecommerce",
             "items": [{"product_id": "p2", "product_name": "P2", "quantity": 1, "selling_price": 40, "purchase_price": 20, "total": 40}]},
        ])

    def report(self):
        return run(finance_report.sales_report(self.db, {"user_id": "u1"}))

    def test_sales_are_split_by_channel_and_missing_source_means_physical(self):
        channels = self.report()["channels"]
        physical, ecommerce = channels["physical"], channels["ecommerce"]
        self.assertEqual((physical["revenue"], physical["sales_count"], physical["cogs"], physical["gross_profit"]), (160, 2, 80, 80))
        self.assertEqual((ecommerce["revenue"], ecommerce["sales_count"], ecommerce["cogs"], ecommerce["gross_profit"]), (240, 2, 140, 100))
        # Une vente à crédit compte en chiffre d'affaires, pas en encaissement.
        self.assertEqual((physical["collected"], ecommerce["collected"]), (100, 200))
        self.assertEqual((physical["share_pct"], ecommerce["share_pct"]), (40, 60))
        self.assertEqual(physical["tax_collected"], 10)

    def test_a_channel_view_keeps_only_its_sales(self):
        report = self.report()
        ecommerce = finance_report.pick(report, "ecommerce")
        self.assertEqual((ecommerce["totals"]["revenue"], ecommerce["totals"]["avg_sale"]), (240, 120))
        self.assertEqual(ecommerce["payment_breakdown"], {"mobile_money": 200, "credit": 40})
        self.assertEqual(sorted(ecommerce["products"]), ["p1", "p2"])
        self.assertEqual(ecommerce["products"]["p1"]["qty_sold"], 4)
        everything = finance_report.pick(report, "all")
        self.assertEqual((everything["totals"]["revenue"], everything["totals"]["collected"]), (400, 300))
        self.assertEqual(everything["products"]["p1"]["revenue"], 300)
        first_day = everything["daily"][0]
        self.assertEqual((first_day["date"], first_day["revenue"], first_day["profit"], first_day["physical"], first_day["ecommerce"]),
                         ("2026-11-01", 160, 80, 160, 0))

    def test_ecommerce_flow_separates_ordered_delivered_and_to_collect(self):
        start, end = day(1, 0), day(30, 23)
        self.db.raw.ecommerce_orders.insert_many([
            {"order_id": "o1", "user_id": "u1", "created_at": day(1), "status": "delivered", "delivered_at": day(2), "total_amount": 200,
             "delivery_fee": 15, "payment": {"status": "paid", "paid_at": day(1)}},
            {"order_id": "o2", "user_id": "u1", "created_at": day(2), "status": "delivered", "delivered_at": day(3), "total_amount": 40,
             "sale_on_credit": True, "payment": {"status": "awaiting"}},
            {"order_id": "o3", "user_id": "u1", "created_at": day(4), "status": "confirmed", "total_amount": 70, "payment": {"status": "awaiting"}},
            {"order_id": "o4", "user_id": "u1", "created_at": day(4), "status": "cancelled", "total_amount": 90,
             "delivery_fee": 15, "payment": {"status": "paid", "paid_at": day(4)}},
        ])
        flow = run(finance_report.ecommerce_flow(self.db, {"user_id": "u1"}, start, end))
        self.assertEqual(flow["ordered"], {"amount": 310, "count": 3})
        self.assertEqual(flow["cancelled"], {"amount": 90, "count": 1})
        self.assertEqual(flow["open"], {"amount": 70, "count": 1})
        self.assertEqual(flow["delivered"], {"amount": 240, "count": 2})
        self.assertEqual(flow["to_collect"], {"amount": 40, "count": 1})
        # Les frais d'une commande annulée ne sont pas en transit.
        self.assertEqual(flow["delivery_transit"], {"amount": 15, "count": 1})

    def test_totals_without_loading_documents(self):
        self.db.raw.expenses.insert_many([
            {"user_id": "u1", "amount": 30, "category": "rent"},
            {"user_id": "u1", "amount": 20, "category": "rent"},
            {"user_id": "u1", "amount": 5},
        ])
        self.assertEqual(run(finance_report.sum_by(self.db, "expenses", {"user_id": "u1"}, "amount", "category")), {"rent": 50, "Autre": 5})
        self.assertEqual(run(finance_report.sum_by(self.db, "expenses", {"user_id": "u1"}, "amount")), {"amount": 55, "count": 3})
        self.db.raw.products.insert_many([{"quantity": 2, "purchase_price": 10, "selling_price": 15}, {"quantity": 1, "purchase_price": 4}])
        self.assertEqual(run(finance_report.stock_value(self.db, {})), {"cost": 24, "selling": 30})


if __name__ == "__main__":
    unittest.main()
