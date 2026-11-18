import asyncio
import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

# httpx n'est utile qu'aux envois réels, remplacés ici.
sys.modules.setdefault("httpx", types.ModuleType("httpx"))

from fake_mongo import FakeDatabase  # noqa: E402
from services.notification_service import NotificationService  # noqa: E402


def run(coro):
    return asyncio.run(coro)


class SharedDeviceNotificationTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = NotificationService()
        self.sent = []

        async def fake_send(tokens, title, body, data=None):
            self.sent.append((list(tokens), title, data))
            return {"ok": True, "reason": None, "message": "ok", "attempted_tokens": len(tokens),
                    "valid_tokens": len(tokens), "invalid_tokens": [], "tickets": [], "errors": []}

        self.service.send_push_notification = fake_send

    def add_user(self, user_id, tokens, store_name):
        run(self.db.users.insert_one({"user_id": user_id, "push_tokens": tokens, "store_name": store_name}))

    def test_shared_device_gets_account_name_and_target(self):
        self.add_user("u1", ["ExponentPushToken[shared]", "ExponentPushToken[own]"], "Boutique Dakar")
        self.add_user("u2", ["ExponentPushToken[shared]"], "Boutique Thiès")
        result = run(self.service.notify_user(self.db, "u1", "Rupture", "3 produits"))
        self.assertTrue(result["ok"])
        by_tokens = {tuple(tokens): (title, data) for tokens, title, data in self.sent}
        self.assertEqual(by_tokens[("ExponentPushToken[own]",)][0], "Rupture")
        self.assertEqual(by_tokens[("ExponentPushToken[shared]",)][0], "Boutique Dakar · Rupture")
        for _, data in by_tokens.values():
            self.assertEqual(data["target_user_id"], "u1")

    def test_single_account_device_keeps_plain_title(self):
        self.add_user("u1", ["ExponentPushToken[own]"], "Boutique Dakar")
        run(self.service.notify_user(self.db, "u1", "Rupture", "3 produits", {"type": "stock"}))
        self.assertEqual(self.sent, [(["ExponentPushToken[own]"], "Rupture", {"type": "stock", "target_user_id": "u1"})])


if __name__ == "__main__":
    unittest.main()
