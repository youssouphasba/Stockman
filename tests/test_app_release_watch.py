import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import app_release_watch  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402

NOW = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)
RELEASED = NOW - timedelta(hours=30)


def run(coro):
    return asyncio.run(coro)


class GhostVersionTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.sent = []

    async def notify(self, title, body, html_body, data):
        self.sent.append((title, data))

    def check(self, released_at=RELEASED, version="1.0.27"):
        return run(app_release_watch.check_ghost_version(self.db, "ios", version, released_at, NOW, self.notify))

    def add_device(self, version, updated_at):
        run(self.db.push_installations.insert_one({"platform": "ios", "app_version": version, "updated_at": updated_at}))

    def test_alerts_once_when_no_device_reports_the_live_version(self):
        self.add_device("1.0.25", NOW - timedelta(days=2))
        self.assertIsNotNone(self.check())
        self.assertEqual(len(self.sent), 1)
        self.assertIn("iOS 1.0.27 : aucun appareil depuis 30 h", self.sent[0][0])
        self.assertIsNone(self.check())
        self.assertEqual(len(self.sent), 1)

    def test_no_alert_when_a_device_runs_the_version(self):
        self.add_device("1.0.27", NOW - timedelta(hours=2))
        self.assertIsNone(self.check())
        self.assertEqual(self.sent, [])

    def test_no_alert_before_24_hours(self):
        self.add_device("1.0.25", NOW - timedelta(hours=1))
        self.assertIsNone(self.check(released_at=NOW - timedelta(hours=10)))

    def test_no_alert_without_any_active_device(self):
        self.assertIsNone(self.check())
        self.assertEqual(self.sent, [])


if __name__ == "__main__":
    unittest.main()
