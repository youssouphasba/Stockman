import re
import unittest
from pathlib import Path

SERVER = Path(__file__).resolve().parents[1] / "backend" / "server.py"


class AdminRouterGuardTest(unittest.TestCase):
    def test_admin_router_is_only_mounted_behind_superadmin(self):
        source = SERVER.read_text(encoding="utf-8-sig")
        mounts = re.findall(r"^\s*\w+\.include_router\(admin_router[^\n]*", source, re.MULTILINE)
        self.assertEqual(len(mounts), 1, mounts)
        self.assertIn("Depends(require_superadmin)", mounts[0])


if __name__ == "__main__":
    unittest.main()
