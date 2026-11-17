import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import admin_ops  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402

NOW = datetime(2026, 11, 17, 10, 0, tzinfo=timezone.utc)
ADMIN = {"user_id": "user_admin", "name": "Admin", "email": "admin@example.com"}


def run(coro):
    return asyncio.run(coro)


class AuditLogTests(unittest.TestCase):
    def test_secrets_are_masked_and_long_values_cut(self):
        payload = {"password": "abc", "nested": {"api_key": "k", "note": "x" * 500}, "items": list(range(30))}
        clean = admin_ops.summarize_payload(payload)
        self.assertEqual(clean["password"], "***")
        self.assertEqual(clean["nested"]["api_key"], "***")
        self.assertTrue(clean["nested"]["note"].endswith("…"))
        self.assertLessEqual(len(clean["nested"]["note"]), admin_ops.MAX_STRING + 1)
        self.assertEqual(len(clean["items"]), admin_ops.MAX_ITEMS + 1)

    def test_action_on_subscription_is_attached_to_the_owner(self):
        db = FakeDatabase()
        run(db.business_accounts.insert_one({"account_id": "acc_1", "owner_user_id": "user_shop"}))
        entry = run(admin_ops.record_admin_action(
            db, admin=ADMIN, method="POST", route_path="/api/admin/subscriptions/{account_id}/grace",
            path_params={"account_id": "acc_1"}, query_params={"days": "7"}, payload={"note": "Retard Wave"},
            outcome="success", status_code=200, now=NOW,
        ))
        self.assertEqual(entry["action"], "POST /admin/subscriptions/{account_id}/grace")
        self.assertEqual(entry["target_user_ids"], ["user_shop"])
        rows = run(admin_ops.list_admin_actions(db, target_user_id="user_shop"))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["label"], "Délai de grâce accordé")
        self.assertEqual(rows[0]["admin_name"], "Admin")

    def test_bulk_action_is_attached_to_every_account(self):
        db = FakeDatabase()
        run(admin_ops.record_admin_action(
            db, admin=ADMIN, method="POST", route_path="/api/admin/users/bulk-plan",
            path_params={}, query_params={}, payload={"user_ids": ["u1", "u2"], "plan": "pro"},
            outcome="error", status_code=400, now=NOW,
        ))
        self.assertEqual(len(run(admin_ops.list_admin_actions(db, target_user_id="u2"))), 1)
        self.assertEqual(len(run(admin_ops.list_admin_actions(db, outcome="success"))), 0)

    def test_unknown_action_keeps_its_route_as_label(self):
        self.assertEqual(admin_ops.action_label("POST /admin/nouvelle-route"), "POST /admin/nouvelle-route")


class TodayQueueTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        users = [
            {"user_id": "u_shop", "name": "Awa", "email": "awa@example.com", "last_login": NOW - timedelta(days=20)},
            {"user_id": "u_demo", "name": "Démo", "is_demo": True},
            {"user_id": "u_active", "name": "Moussa", "last_login": NOW - timedelta(days=1)},
        ]
        for user in users:
            run(self.db.users.insert_one(user))

    def group(self, queue, code):
        return next(g for g in queue["groups"] if g["code"] == code)

    def test_old_ticket_is_urgent_and_listed_first(self):
        run(self.db.support_tickets.insert_one({"ticket_id": "t_new", "user_id": "u_shop", "user_name": "Awa", "subject": "Récent", "status": "open", "created_at": NOW - timedelta(hours=2)}))
        run(self.db.support_tickets.insert_one({"ticket_id": "t_old", "user_id": "u_active", "user_name": "Moussa", "subject": "Ancien", "status": "open", "created_at": NOW - timedelta(days=4)}))
        run(self.db.support_tickets.insert_one({"ticket_id": "t_done", "user_id": "u_shop", "subject": "Fini", "status": "resolved", "created_at": NOW}))
        tickets = self.group(run(admin_ops.build_today_queue(self.db, NOW)), "tickets")
        self.assertEqual([i["ref"] for i in tickets["items"]], ["t_old", "t_new"])
        self.assertTrue(tickets["items"][0]["urgent"])
        self.assertEqual(tickets["severity"], "critical")

    def test_demo_and_active_accounts_are_left_out(self):
        for account_id, owner in (("acc_shop", "u_shop"), ("acc_demo", "u_demo"), ("acc_active", "u_active")):
            run(self.db.business_accounts.insert_one({
                "account_id": account_id, "owner_user_id": owner, "plan": "pro",
                "subscription_status": "active", "subscription_provider": "stripe",
                "subscription_end": NOW + timedelta(days=2),
            }))
        queue = run(admin_ops.build_today_queue(self.db, NOW))
        self.assertEqual([i["user_id"] for i in self.group(queue, "expiring")["items"]], ["u_shop", "u_active"])
        self.assertEqual([i["user_id"] for i in self.group(queue, "inactive_paying")["items"]], ["u_shop"])

    def test_payment_failure_names_the_owner_once(self):
        run(self.db.business_accounts.insert_one({"account_id": "acc_shop", "owner_user_id": "u_shop"}))
        for hours in (1, 5):
            run(self.db.subscription_events.insert_one({"account_id": "acc_shop", "provider": "flutterwave", "event_type": "payment_failed", "created_at": NOW - timedelta(hours=hours)}))
        run(self.db.subscription_events.insert_one({"account_id": "acc_shop", "provider": "stripe", "event_type": "payment_failed", "created_at": NOW - timedelta(days=10)}))
        items = self.group(run(admin_ops.build_today_queue(self.db, NOW)), "payment_failures")["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["name"], "Awa")
        self.assertEqual(items[0]["detail"], "Échec Flutterwave")


class GlobalSearchTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        run(self.db.users.insert_one({"user_id": "u1", "name": "Senlab Pharmacie", "email": "contact@senlab.sn", "phone": "+221 77 123 45 67"}))
        run(self.db.users.insert_one({"user_id": "u2", "name": "Senlab démo", "is_demo": True}))
        run(self.db.stores.insert_one({"store_id": "s1", "name": "Pharmacie Senlab Plateau", "user_id": "u1"}))
        run(self.db.support_tickets.insert_one({"ticket_id": "t1", "subject": "Imprimante", "user_name": "Senlab Pharmacie", "user_id": "u1", "created_at": NOW}))

    def test_finds_accounts_stores_and_tickets_without_demo(self):
        result = run(admin_ops.global_search(self.db, "senlab"))
        self.assertEqual([u["user_id"] for u in result["users"]], ["u1"])
        self.assertEqual([s["store_id"] for s in result["stores"]], ["s1"])
        self.assertEqual([t["ticket_id"] for t in result["tickets"]], ["t1"])

    def test_phone_search_ignores_spaces_and_prefix(self):
        self.assertEqual(run(admin_ops.global_search(self.db, "77 123"))["users"][0]["user_id"], "u1")

    def test_special_characters_are_not_treated_as_patterns(self):
        self.assertEqual(run(admin_ops.global_search(self.db, ".*"))["users"], [])

    def test_too_short_query_returns_nothing(self):
        self.assertEqual(run(admin_ops.global_search(self.db, "s"))["users"], [])


if __name__ == "__main__":
    unittest.main()
