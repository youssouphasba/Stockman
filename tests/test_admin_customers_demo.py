import unittest
from pathlib import Path

SERVER = (Path(__file__).resolve().parents[1] / "backend" / "server.py").read_text(encoding="utf-8-sig")


class AdminCustomersDemoTests(unittest.TestCase):
    def test_admin_customer_list_hides_demo_and_practice_customers(self):
        start = SERVER.index('@admin_router.get("/customers")')
        body = SERVER[start:start + 1200]
        self.assertIn('query = await admin_non_demo_filter("user_id")', body)
        self.assertIn('query[onboarding_guide.DEMO_TAG] = {"$ne": True}', body)


if __name__ == "__main__":
    unittest.main()
