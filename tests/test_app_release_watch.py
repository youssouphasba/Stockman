import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import app_release_watch  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402

NOW = datetime(2026, 11, 25, 12, 0, tzinfo=timezone.utc)
RELEASED = NOW - timedelta(hours=30)


def run(coro):
    return asyncio.run(coro)


class GhostReleaseTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.sent = []

    async def notify(self, title, body, html_body, data):
        self.sent.append((title, body))

    def check(self, released_at=RELEASED, store_version="1.0.5"):
        return run(app_release_watch.check_ghost_release(self.db, "ios", store_version, released_at, NOW, self.notify))

    def add_device(self, version, updated_at):
        run(self.db.push_installations.insert_one({"platform": "ios", "app_version": version, "updated_at": updated_at}))

    def seen(self, version, at):
        run(app_release_watch.record_version_seen(self.db, "ios", version, at))

    def test_alerts_once_when_no_new_version_appears_after_release(self):
        self.add_device("1.0.26", NOW - timedelta(hours=3))
        self.seen("1.0.26", RELEASED - timedelta(days=3))
        self.assertIsNotNone(self.check())
        self.assertEqual(len(self.sent), 1)
        self.assertIn("numéro affiché par le store : 1.0.5", self.sent[0][1])
        self.assertIsNone(self.check())
        self.assertEqual(len(self.sent), 1)

    def test_store_number_differing_from_app_number_is_not_an_alert(self):
        # L'App Store dit « 1.0.5 », l'app dit « 1.0.27 » : la nouvelle version tourne bien.
        self.add_device("1.0.27", NOW - timedelta(hours=2))
        self.seen("1.0.27", RELEASED + timedelta(hours=1))
        self.assertIsNone(self.check(store_version="1.0.5"))
        self.assertEqual(self.sent, [])

    def test_first_sighting_is_kept(self):
        self.seen("1.0.27", RELEASED + timedelta(hours=1))
        self.seen("1.0.27", NOW)
        doc = run(self.db.app_versions_seen.find_one({"platform": "ios", "version": "1.0.27"}))
        self.assertEqual(doc["first_seen_at"], RELEASED + timedelta(hours=1))

    def test_no_alert_before_24_hours(self):
        self.add_device("1.0.26", NOW - timedelta(hours=1))
        self.assertIsNone(self.check(released_at=NOW - timedelta(hours=10)))

    def test_no_alert_for_releases_before_the_watch_started(self):
        self.add_device("1.0.25", NOW - timedelta(hours=1))
        self.assertIsNone(self.check(released_at=datetime(2026, 11, 16, 22, 50, tzinfo=timezone.utc)))

    def test_no_alert_without_any_active_device(self):
        self.assertIsNone(self.check())
        self.assertEqual(self.sent, [])


if __name__ == "__main__":
    unittest.main()
