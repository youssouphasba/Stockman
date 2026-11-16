import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import ecommerce_payment as payment  # noqa: E402
from fake_mongo import matches  # noqa: E402


def needs_action(order):
    return matches(order, payment.action_required_query())


class ActionRequiredQueryTests(unittest.TestCase):
    def test_orders_waiting_for_the_merchant_are_counted(self):
        self.assertTrue(needs_action({"status": "pending", "payment": {"status": "awaiting"}}))
        self.assertTrue(needs_action({"status": "confirmed"}))
        self.assertTrue(needs_action({"status": "preparing", "delivery": {"provider": "denkma"}}))
        self.assertTrue(needs_action({"status": "ready"}))
        self.assertTrue(needs_action({"status": "ready", "delivery": {"provider": "denkma"}, "payment": {"status": "declared"}}))

    def test_closed_orders_and_running_denkma_deliveries_are_not_counted(self):
        for status in ("delivered", "cancelled", "rejected"):
            self.assertFalse(needs_action({"status": status, "payment": {"status": "declared"}}))
        self.assertFalse(needs_action({"status": "ready", "delivery": {"provider": "denkma"}, "payment": {"status": "paid"}}))


if __name__ == "__main__":
    unittest.main()
