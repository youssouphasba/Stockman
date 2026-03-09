import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from enterprise_access import (  # noqa: E402
    build_effective_access_context,
    build_effective_permissions,
    default_dashboard_layout,
    default_modules,
    merge_effective_settings,
    normalize_account_roles,
    seed_business_account,
    user_has_operational_access,
)


class EnterpriseAccessTests(unittest.TestCase):
    def test_shopkeeper_roles_are_backfilled(self):
        roles = normalize_account_roles({"role": "shopkeeper", "account_roles": []})
        self.assertIn("billing_admin", roles)
        self.assertIn("org_admin", roles)

    def test_store_permissions_override_global_permissions(self):
        user_doc = {
            "role": "staff",
            "permissions": {"stock": "read", "pos": "none"},
            "store_ids": ["store_a", "store_b"],
            "active_store_id": "store_b",
            "store_permissions": {
                "store_b": {"stock": "write", "pos": "read"},
            },
        }
        effective = build_effective_permissions(user_doc, active_store_id="store_b")
        self.assertEqual(effective["stock"], "write")
        self.assertEqual(effective["pos"], "read")

    def test_billing_only_user_has_no_operational_access(self):
        user_doc = {
            "role": "staff",
            "account_roles": ["billing_admin"],
            "permissions": {"stock": "none", "pos": "none", "accounting": "none", "crm": "none", "suppliers": "none", "staff": "none"},
        }
        self.assertFalse(user_has_operational_access(user_doc))

    def test_org_admin_gets_full_permissions_and_account_store_scope(self):
        user_doc = {
            "role": "staff",
            "account_roles": ["org_admin"],
            "store_ids": ["store_a"],
            "active_store_id": "store_a",
        }
        account_doc = {"store_ids": ["store_a", "store_b"], "plan": "enterprise", "subscription_status": "active"}
        context = build_effective_access_context(user_doc, account_doc)
        self.assertEqual(context["store_ids"], ["store_a", "store_b"])
        self.assertEqual(context["effective_permissions"]["stock"], "write")
        self.assertTrue(context["has_operational_access"])

    def test_seed_business_account_keeps_billing_contact(self):
        account = seed_business_account({
            "user_id": "user_1",
            "name": "Awa Ndiaye",
            "email": "awa@example.com",
            "plan": "premium",
            "currency": "XOF",
            "store_ids": ["store_a"],
        }, {"modules": default_modules()})
        self.assertEqual(account["plan"], "enterprise")
        self.assertEqual(account["billing_contact_name"], "Awa Ndiaye")
        self.assertEqual(account["billing_contact_email"], "awa@example.com")

    def test_merge_effective_settings_prefers_account_modules_and_billing_contact(self):
        merged = merge_effective_settings(
            user_id="user_1",
            account_id="acct_1",
            user_settings={
                "simple_mode": True,
                "dashboard_layout": default_dashboard_layout(),
                "modules": {"crm": False},
            },
            account_doc={
                "modules": {"crm": True, "orders": False},
                "billing_contact_name": "Finance Team",
                "billing_contact_email": "billing@example.com",
            },
        )
        self.assertTrue(merged["modules"]["crm"])
        self.assertFalse(merged["modules"]["orders"])
        self.assertEqual(merged["billing_contact_name"], "Finance Team")
        self.assertEqual(merged["billing_contact_email"], "billing@example.com")
        self.assertTrue(merged["mobile_preferences"]["simple_mode"])


if __name__ == "__main__":
    unittest.main()
