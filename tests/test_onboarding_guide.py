import asyncio
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import onboarding_guide as guide  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


def owner(user_id="owner", **fields):
    return {"user_id": user_id, "role": "shopkeeper", guide.GUIDE_FIELD: guide.initial_state(), **fields}


async def seed_guide_data(db, owner_id="owner"):
    """Reproduit ce que le guide crée : deux produits, un client, une vente et leurs traces."""
    tag = {guide.DEMO_TAG: True}
    await db.products.insert_one({"product_id": "p1", "user_id": owner_id, "quantity": 9, **tag})
    await db.products.insert_one({"product_id": "p2", "user_id": owner_id, "quantity": 4, **tag})
    await db.customers.insert_one({"customer_id": "c1", "user_id": owner_id, **tag})
    await db.sales.insert_one({"sale_id": "s1", "user_id": owner_id, "customer_id": "c1",
                               "items": [{"product_id": "p1", "quantity": 1}, {"product_id": "p2", "quantity": 2}], **tag})
    for pid, qty in (("p1", 1), ("p2", 2)):
        await db.stock_movements.insert_one({"movement_id": f"m_{pid}", "user_id": owner_id, "product_id": pid, "type": "out", "quantity": qty})
        await db.price_history.insert_one({"product_id": pid, "user_id": owner_id})
    await db.activity_logs.insert_one({"owner_id": owner_id, "details": {"product_id": "p1"}})
    await db.activity_logs.insert_one({"owner_id": owner_id, "details": {"sale_id": "s1"}})
    await db.activity_logs.insert_one({"owner_id": owner_id, "details": {"customer_id": "c1"}})


class EligibilityTests(unittest.TestCase):
    def test_only_owner_of_a_new_shop_account(self):
        self.assertTrue(guide.is_eligible(owner()))
        self.assertFalse(guide.is_eligible(owner(parent_user_id="boss")))
        self.assertFalse(guide.is_eligible(owner(is_demo=True)))
        self.assertFalse(guide.is_eligible(owner(role="supplier")))
        # Compte existant : pas d'état posé à l'inscription.
        self.assertFalse(guide.is_eligible({"user_id": "old", "role": "shopkeeper"}))
        self.assertFalse(guide.is_eligible(owner(**{guide.GUIDE_FIELD: {"status": guide.COMPLETED}})))


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        run(self.db.users.insert_one(owner()))

    def test_tagging_only_while_the_guide_runs(self):
        self.assertFalse(run(guide.is_active(self.db, "owner")))
        state = run(guide.start(self.db, "owner"))
        self.assertEqual(state["status"], guide.ACTIVE)
        self.assertTrue(run(guide.is_active(self.db, "owner")))
        run(guide.finish(self.db, "owner", guide.COMPLETED))
        self.assertFalse(run(guide.is_active(self.db, "owner")))

    def test_progress_is_kept_and_unknown_steps_refused(self):
        run(guide.start(self.db, "owner"))
        self.assertEqual(run(guide.save_progress(self.db, "owner", "tab_pos"))["step"], "tab_pos")
        with self.assertRaises(ValueError):
            run(guide.save_progress(self.db, "owner", "nope"))

    def test_finish_removes_every_trace_of_the_exercise(self):
        run(guide.start(self.db, "owner"))
        run(seed_guide_data(self.db))
        # Données réelles d'un autre compte : jamais touchées.
        run(self.db.products.insert_one({"product_id": "other", "user_id": "someone", guide.DEMO_TAG: True}))
        result = run(guide.finish(self.db, "owner", guide.COMPLETED))
        self.assertEqual(result["status"], guide.COMPLETED)
        self.assertEqual(result["cleanup"], {"products": 2, "customers": 1, "sales": 1, "kept_products": 0})
        for collection in ("customers", "sales", "stock_movements", "price_history", "activity_logs"):
            self.assertEqual(run(getattr(self.db, collection).count_documents({"user_id": "owner"}))
                             + run(getattr(self.db, collection).count_documents({"owner_id": "owner"})), 0, collection)
        self.assertEqual(run(self.db.products.count_documents({})), 1)

    def test_kept_product_gets_its_stock_back(self):
        run(guide.start(self.db, "owner"))
        run(seed_guide_data(self.db))
        result = run(guide.finish(self.db, "owner", guide.COMPLETED, keep_product_ids=["p1", "unknown"]))
        self.assertEqual(result["cleanup"]["kept_products"], 1)
        kept = run(self.db.products.find_one({"product_id": "p1"}))
        self.assertEqual(kept["quantity"], 10)
        self.assertNotIn(guide.DEMO_TAG, kept)
        self.assertIsNone(run(self.db.products.find_one({"product_id": "p2"})))
        self.assertEqual(run(self.db.stock_movements.count_documents({"product_id": "p1"})), 0)

    def test_skip_also_cleans_and_finishing_twice_does_nothing(self):
        run(guide.start(self.db, "owner"))
        run(seed_guide_data(self.db))
        first = run(guide.finish(self.db, "owner", guide.SKIPPED))
        self.assertEqual(first["status"], guide.SKIPPED)
        self.assertEqual(run(self.db.products.count_documents({"user_id": "owner"})), 0)
        second = run(guide.finish(self.db, "owner", guide.COMPLETED))
        self.assertEqual(second["status"], guide.SKIPPED)
        self.assertIsNone(second["cleanup"])


if __name__ == "__main__":
    unittest.main()


class ExistingAccountTests(unittest.TestCase):
    def test_existing_owner_without_products_receives_the_guide(self):
        db = FakeDatabase()
        doc = {"user_id": "old", "role": "shopkeeper"}
        run(db.users.insert_one(dict(doc)))
        updated = run(guide.ensure_state(db, doc))
        self.assertTrue(guide.is_eligible(updated))
        stored = run(db.users.find_one({"user_id": "old"}))
        self.assertEqual(stored[guide.GUIDE_FIELD]["status"], guide.PENDING)

    def test_existing_owner_with_products_is_left_alone(self):
        db = FakeDatabase()
        doc = {"user_id": "old", "role": "shopkeeper"}
        run(db.users.insert_one(dict(doc)))
        run(db.products.insert_one({"product_id": "real", "user_id": "old"}))
        updated = run(guide.ensure_state(db, doc))
        self.assertFalse(guide.is_eligible(updated))
        stored = run(db.users.find_one({"user_id": "old"}))
        self.assertEqual(stored[guide.GUIDE_FIELD]["status"], guide.NOT_NEEDED)

    def test_staff_and_finished_guides_are_untouched(self):
        db = FakeDatabase()
        staff = {"user_id": "staff", "role": "staff", "parent_user_id": "boss"}
        done = {"user_id": "done", "role": "shopkeeper", guide.GUIDE_FIELD: {"status": guide.COMPLETED}}
        self.assertIs(run(guide.ensure_state(db, staff)), staff)
        self.assertIs(run(guide.ensure_state(db, done)), done)


class AdminTests(unittest.TestCase):
    def test_stats_count_statuses_and_drop_off_steps(self):
        db = FakeDatabase()
        run(db.users.insert_one(owner("a", **{guide.GUIDE_FIELD: {"status": guide.ACTIVE, "step": "text_input"}})))
        run(db.users.insert_one(owner("b", **{guide.GUIDE_FIELD: {"status": guide.SKIPPED, "step": "pos_pay"}})))
        run(db.users.insert_one(owner("c", **{guide.GUIDE_FIELD: {"status": guide.COMPLETED, "step": "finish"}})))
        run(db.users.insert_one(owner("d", **{guide.GUIDE_FIELD: {"status": guide.NOT_NEEDED}})))
        stats = run(guide.admin_stats(db))
        self.assertEqual(stats["started"], 3)
        self.assertEqual(stats["by_status"][guide.NOT_NEEDED], 1)
        self.assertEqual(stats["completion_rate"], 33.3)
        self.assertEqual(stats["in_progress_by_step"][0]["label"], guide.STEP_LABELS["text_input"])
        self.assertEqual(stats["skipped_by_step"][0]["step"], "pos_pay")

    def test_relaunch_cleans_running_guide_and_restarts(self):
        db = FakeDatabase()
        run(db.users.insert_one(owner(**{guide.GUIDE_FIELD: {"status": guide.ACTIVE, "step": "pos_pay"}})))
        run(seed_guide_data(db))
        view = run(guide.relaunch(db, "owner"))
        self.assertEqual(view["status"], guide.PENDING)
        self.assertEqual(view["relaunch_count"], 1)
        self.assertEqual(run(db.products.count_documents({"user_id": "owner"})), 0)
        self.assertEqual(run(db.sales.count_documents({"user_id": "owner"})), 0)

    def test_relaunch_refuses_staff(self):
        db = FakeDatabase()
        run(db.users.insert_one({"user_id": "staff", "role": "staff", "parent_user_id": "boss"}))
        with self.assertRaises(ValueError):
            run(guide.relaunch(db, "staff"))
