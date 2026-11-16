import unittest
from pathlib import Path

SERVER = (Path(__file__).resolve().parents[1] / "backend" / "server.py").read_text(encoding="utf-8-sig")


class SessionCleanupTests(unittest.TestCase):
    def test_inactive_sessions_live_as_long_as_the_refresh_token(self):
        start = SERVER.index("# 3. Cleanup inactive sessions (I10)")
        block = SERVER[start:start + 900]
        self.assertIn("timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)", block)
        self.assertNotIn("timedelta(hours=24)", block)


if __name__ == "__main__":
    unittest.main()
