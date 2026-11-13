import asyncio
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import platform_modules as pm  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


class ResolveTests(unittest.TestCase):
    def setUp(self):
        pm.invalidate_cache()

    def test_suppliers_are_off_by_default_for_everyone(self):
        policy = pm.normalize_policy(None)
        for plan in pm.PLANS:
            self.assertEqual(pm.resolve(policy, "suppliers", plan, "epicerie"), (False, "default"))

    def test_most_precise_level_wins(self):
        policy = pm.normalize_policy({"modules": {"suppliers": {
            "default": False,
            "plans": {"enterprise": True},
            "business_types": {"pharmacie": False, "grossiste": True},
        }}})
        self.assertEqual(pm.resolve(policy, "suppliers", "enterprise", "epicerie"), (True, "plan"))
        self.assertEqual(pm.resolve(policy, "suppliers", "enterprise", "pharmacie"), (False, "business_type"))
        self.assertEqual(pm.resolve(policy, "suppliers", "starter", "Grossiste"), (True, "business_type"))
        self.assertEqual(pm.resolve(policy, "suppliers", "enterprise", "pharmacie", {"suppliers": True}), (True, "account"))
        self.assertEqual(pm.resolve(policy, "suppliers", "pro", "boutique"), (False, "default"))

    def test_invalid_values_are_dropped(self):
        policy = pm.normalize_policy({"modules": {"suppliers": {
            "default": "yes", "plans": {"gold": True, "pro": "1"}, "business_types": {"lune": True},
        }}})
        self.assertEqual(policy["suppliers"], {"default": False, "plans": {}, "business_types": {}})

    def test_team_and_background_jobs_follow_the_owner_account(self):
        db = FakeDatabase()
        run(db.users.insert_one({"user_id": "owner", "role": "shopkeeper", "account_id": "acct_owner", "plan": "pro"}))
        run(db.business_accounts.insert_one({"account_id": "acct_owner", "plan": "pro", "business_type": "epicerie"}))
        self.assertFalse(run(pm.owner_has_module(db, "owner", "suppliers")))
        run(pm.save_policy(db, {"suppliers": {"plans": {"pro": True}}}))
        self.assertTrue(run(pm.owner_has_module(db, "owner", "suppliers")))
        run(db.business_accounts.update_one({"account_id": "acct_owner"}, {"$set": {"module_overrides.suppliers": False}}))
        self.assertFalse(run(pm.owner_has_module(db, "owner", "suppliers")))

    def test_stockman_team_and_supplier_accounts_are_not_restricted(self):
        db = FakeDatabase()
        self.assertEqual(run(pm.access_for_account(db, "starter", None, None, "superadmin")), {"suppliers": True})
        self.assertEqual(run(pm.access_for_account(db, "starter", None, None, "supplier")), {"suppliers": True})
        self.assertEqual(run(pm.access_for_account(db, "starter", None, None, "shopkeeper")), {"suppliers": False})


if __name__ == "__main__":
    unittest.main()
