import asyncio
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fake_mongo import FakeDatabase  # noqa: E402
import fiscal_ledger as ledger  # noqa: E402

OWNER = "owner1"


def run(coro):
    return asyncio.run(coro)


def sale(sale_id, total, when, method="cash", status="completed"):
    return {
        "sale_id": sale_id, "user_id": OWNER, "store_id": "store1", "status": status,
        "created_at": when, "total_amount": total, "tax_total": round(total / 6, 2), "payment_method": method,
        "payments": [{"method": method, "amount": total}],
        "items": [{"product_id": "p1", "product_name": "Gaze pièce", "quantity": 1, "selling_price": total, "total": total}],
        "customer_name": "Client à ne pas copier",
    }


async def add_sale(db, document, **kwargs):
    await db.sales.insert_one(dict(document))
    return await ledger.record_sale(db, OWNER, document, **kwargs)


class FiscalLedgerTest(unittest.TestCase):
    def setUp(self):
        os.environ["FISCAL_LEDGER_SECRET"] = "secret-de-test"
        self.db = FakeDatabase()
        self.now = datetime.now(timezone.utc)

    def tearDown(self):
        os.environ.pop("FISCAL_LEDGER_SECRET", None)

    def test_entries_are_numbered_chained_and_signed(self):
        first = run(add_sale(self.db, sale("s1", 1500, self.now)))
        second = run(add_sale(self.db, sale("s2", 500, self.now)))
        self.assertEqual((first["seq"], second["seq"]), (1, 2))
        self.assertIsNone(first["prev_hash"])
        self.assertEqual(second["prev_hash"], first["hash"])
        self.assertEqual(second["cumulative_total"], 2000)
        self.assertTrue(second["signature"])
        self.assertNotIn("customer_name", second["sale"])
        self.assertTrue(run(ledger.verify(self.db, OWNER))["ok"])

    def test_a_sale_is_recorded_only_once(self):
        document = sale("s1", 1500, self.now)
        run(add_sale(self.db, document))
        run(ledger.record_sale(self.db, OWNER, document))
        self.assertEqual(run(self.db.fiscal_ledger.count_documents({"owner_id": OWNER})), 1)

    def test_cancellation_is_a_new_negative_entry(self):
        document = sale("s1", 1500, self.now)
        run(add_sale(self.db, document))
        run(self.db.sales.update_one({"sale_id": "s1"}, {"$set": {"status": "cancelled", "cancelled_at": self.now}}))
        entry = run(ledger.record_cancellation(self.db, OWNER, {**document, "status": "cancelled", "cancelled_at": self.now}, reason="erreur"))
        self.assertEqual(entry["seq"], 2)
        self.assertEqual(entry["amount"], -1500)
        self.assertEqual(entry["cumulative_total"], 0)
        self.assertEqual(entry["reason"], "erreur")
        self.assertTrue(run(ledger.verify(self.db, OWNER))["ok"])

    def test_tampering_is_detected(self):
        run(add_sale(self.db, sale("s1", 1500, self.now)))
        run(add_sale(self.db, sale("s2", 500, self.now)))
        # Modification directe du registre.
        run(self.db.fiscal_ledger.update_one({"seq": 1}, {"$set": {"amount": 15}}))
        kinds = {problem["kind"] for problem in run(ledger.verify(self.db, OWNER))["problems"]}
        self.assertIn("integrity", kinds)

    def test_modified_or_deleted_sale_is_detected(self):
        run(add_sale(self.db, sale("s1", 1500, self.now)))
        run(add_sale(self.db, sale("s2", 500, self.now)))
        run(self.db.sales.update_one({"sale_id": "s1"}, {"$set": {"total_amount": 100}}))
        run(self.db.sales.delete_one({"sale_id": "s2"}))
        kinds = {problem["kind"] for problem in run(ledger.verify(self.db, OWNER))["problems"]}
        self.assertEqual(kinds, {"modified_sale", "deleted_sale"})

    def test_removed_entry_breaks_the_sequence(self):
        for index in range(3):
            run(add_sale(self.db, sale(f"s{index}", 100, self.now)))
        run(self.db.fiscal_ledger.delete_one({"seq": 2}))
        kinds = {problem["kind"] for problem in run(ledger.verify(self.db, OWNER))["problems"]}
        self.assertIn("sequence", kinds)
        self.assertIn("chain", kinds)

    def test_existing_sales_are_taken_over_in_order(self):
        old = self.now - timedelta(days=40)
        run(self.db.sales.insert_one(sale("old2", 200, old + timedelta(hours=1))))
        run(self.db.sales.insert_one(sale("old1", 100, old)))
        entry = run(add_sale(self.db, sale("new", 50, self.now)))
        self.assertEqual(entry["seq"], 3)
        entries = run(self.db.fiscal_ledger.find({"owner_id": OWNER}).sort("seq", 1).to_list(None))
        self.assertEqual([item["sale_id"] for item in entries], ["old1", "old2", "new"])
        self.assertEqual([item["backfilled"] for item in entries], [True, True, False])
        self.assertTrue(run(ledger.verify(self.db, OWNER))["ok"])

    def test_training_sale_is_recorded_outside_totals(self):
        entry = run(add_sale(self.db, sale("demo", 900, self.now), training=True))
        self.assertTrue(entry["training"])
        self.assertEqual(entry["cumulative_total"], 0)
        run(self.db.sales.delete_one({"sale_id": "demo"}))  # nettoyage du guide de démarrage
        self.assertTrue(run(ledger.verify(self.db, OWNER))["ok"])

    def test_closures_and_archive(self):
        past = self.now.replace(hour=12, minute=0) - timedelta(days=400)
        run(self.db.sales.insert_one(sale("a", 1000, past)))
        run(self.db.sales.insert_one(sale("b", 500, past + timedelta(seconds=5), method="mobile_money")))
        # La première vente du jour reprend l'historique puis clôt les périodes terminées.
        run(add_sale(self.db, sale("c", 70, self.now)))
        day_key = past.strftime("%Y-%m-%d")
        closures = run(ledger.list_closures(self.db, OWNER))
        self.assertEqual(sorted(item["period_type"] for item in closures), ["day", "month", "year"])
        day = next(item for item in closures if item["period_type"] == "day")
        self.assertEqual(day["period_key"], day_key)
        self.assertEqual(day["totals"]["net_total"], 1500)
        self.assertEqual(day["totals"]["by_payment_method"], {"cash": 1000, "mobile_money": 500})
        self.assertEqual(day["cumulative_total"], 1500)
        # Sans effet si on relance.
        run(self.db.fiscal_counters.update_one({"owner_id": OWNER}, {"$unset": {"closures_checked_day": ""}}))
        self.assertEqual(run(ledger.ensure_closures(self.db, OWNER)), 0)

        archive = run(ledger.build_archive(self.db, OWNER, "day", day_key))
        self.assertEqual(len(archive["entries"]), 2)
        self.assertTrue(archive["matches_first_archive"])
        self.assertIsNone(run(ledger.build_archive(self.db, OWNER, "day", self.now.strftime("%Y-%m-%d"))))
        self.assertTrue(run(ledger.verify(self.db, OWNER))["ok"])

    def test_ledger_survives_account_deletion(self):
        run(add_sale(self.db, sale("s1", 1500, self.now)))
        self.assertTrue(run(ledger.mark_retention(self.db, OWNER, "Ma boutique")))
        retention = run(self.db.fiscal_retention.find_one({"owner_id": OWNER}))
        self.assertGreater(retention["purge_after"], self.now + timedelta(days=365 * 6))
        self.assertFalse(run(ledger.mark_retention(self.db, "inconnu")))


if __name__ == "__main__":
    unittest.main()
