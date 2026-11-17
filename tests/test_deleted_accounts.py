import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import deleted_accounts as da  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402

NOW = datetime(2026, 11, 17, 10, 0, tzinfo=timezone.utc)
USER = {
    "user_id": "user_1", "name": "Awa", "email": "awa@example.com", "phone": "+221770000000",
    "role": "shopkeeper", "country_code": "SN", "store_ids": ["s1", "s2"],
    "created_at": NOW - timedelta(days=90), "last_login": NOW - timedelta(days=2), "password_hash": "secret",
}


class DeletedAccountsTests(unittest.TestCase):
    def test_entry_keeps_identity_and_subscription_but_no_secret(self):
        entry = da.build_archive_entry(USER, {"plan": "pro", "subscription_provider": "stripe", "subscription_status": "active"}, da.ORIGIN_SELF, now=NOW)
        self.assertEqual(entry["plan"], "pro")
        self.assertTrue(entry["was_paying"])
        self.assertEqual(entry["stores_count"], 2)
        self.assertEqual(entry["last_login_at"], USER["last_login"])
        self.assertIsNone(entry["deleted_by_admin_name"])
        self.assertNotIn("password_hash", entry)

    def test_admin_deletion_names_the_admin(self):
        entry = da.build_archive_entry(USER, None, da.ORIGIN_ADMIN, {"user_id": "adm", "name": "Moussa"}, now=NOW)
        self.assertEqual(entry["deleted_by"], "admin")
        self.assertEqual(entry["deleted_by_admin_name"], "Moussa")
        self.assertFalse(entry["was_paying"])

    def test_list_returns_newest_first_with_old_entries_readable(self):
        db = FakeDatabase()

        async def run():
            await db.deleted_users_archive.insert_one({"original_user_id": "old", "email": "old@example.com", "name": "Ancien", "role": "shopkeeper", "deleted_at": NOW - timedelta(days=30)})
            await da.archive_deleted_account(db, USER, None, da.ORIGIN_SELF)
            return await da.list_deleted_accounts(db)

        rows = asyncio.run(run())
        self.assertEqual([row["user_id"] for row in rows], ["user_1", "old"])
        self.assertTrue(all(row["is_deleted"] for row in rows))
        self.assertEqual(rows[1]["deleted_by"], "self")


if __name__ == "__main__":
    unittest.main()
