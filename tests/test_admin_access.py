import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import admin_access as aa  # noqa: E402

SERVER = Path(__file__).resolve().parents[1] / "backend" / "server.py"


class AdminAccessRulesTests(unittest.TestCase):
    def test_superadmin_reaches_everything(self):
        for path in ("/api/admin/collections/users", "/api/admin/users/u1/admin-access", "/api/admin/audit-logs"):
            self.assertTrue(aa.can_access("superadmin", [], path), path)

    def test_merchant_or_staff_never_reaches_the_admin(self):
        for role in ("shopkeeper", "staff", "supplier", None):
            self.assertFalse(aa.can_access(role, list(aa.SCOPES), "/api/admin/today"))

    def test_team_member_only_reaches_granted_scopes(self):
        scopes = ["support"]
        self.assertTrue(aa.can_access("admin", scopes, "/api/admin/support/tickets"))
        self.assertTrue(aa.can_access("admin", scopes, "/api/admin/disputes/d1/reply"))
        self.assertFalse(aa.can_access("admin", scopes, "/api/admin/subscriptions/acc_1/grace"))
        self.assertFalse(aa.can_access("admin", scopes, "/api/admin/users"))

    def test_shared_pages_are_open_to_every_team_member(self):
        for path in ("/api/admin/today", "/api/admin/search", "/api/admin/me/access", "/api/admin/users/u1/detail", "/api/admin/notifications/read"):
            self.assertTrue(aa.can_access("admin", [], path), path)

    def test_sensitive_settings_stay_with_the_superadmin(self):
        every_scope = list(aa.SCOPES)
        for path in (
            "/api/admin/users/u1/admin-access",
            "/api/admin/users/bulk-plan",
            "/api/admin/team",
            "/api/admin/collections/users",
            "/api/admin/modules",
            "/api/admin/security/sessions",
            "/api/admin/audit-logs",
            "/api/admin/logs",
            "/api/admin/health",
            "/api/admin/set-plan",
            "/api/admin/trial-settings",
        ):
            self.assertFalse(aa.can_access("admin", every_scope, path), path)

    def test_finance_figures_need_the_finance_scope(self):
        self.assertTrue(aa.can_access("admin", ["finance"], "/api/admin/stats/mrr"))
        self.assertFalse(aa.can_access("admin", ["stats"], "/api/admin/stats/mrr"))
        self.assertTrue(aa.can_access("admin", ["stats"], "/api/admin/stats/retention"))
        self.assertTrue(aa.can_access("admin", ["finance"], "/api/admin/users/u1/trial-extension"))
        self.assertFalse(aa.can_access("admin", ["accounts"], "/api/admin/users/u1/trial-extension"))
        self.assertTrue(aa.can_access("admin", ["finance"], "/api/admin/users/u1/trial-extension/undo"))
        self.assertFalse(aa.can_access("admin", ["accounts"], "/api/admin/users/u1/trial-extension/undo"))

    def test_unknown_scopes_are_dropped(self):
        self.assertEqual(aa.normalize_scopes(["finance", "root", "support"]), ["support", "finance"])

    def test_access_view_lists_sections_for_the_interface(self):
        view = aa.access_view("admin", ["support", "inconnu"])
        self.assertEqual(view["scopes"], ["support"])
        self.assertEqual(view["sections"], ["overview", "notifications", "support", "disputes"])
        self.assertIsNone(aa.access_view("superadmin", [])["sections"])
        self.assertEqual(aa.access_view("shopkeeper", ["support"])["sections"], [])


class ServerWiringTests(unittest.TestCase):
    def setUp(self):
        self.source = SERVER.read_text(encoding="utf-8-sig")

    def test_admin_router_endpoints_use_the_scoped_guard(self):
        blocks = re.split(r"\n(?=@)", self.source)
        offenders = [b.splitlines()[0] for b in blocks if b.startswith("@admin_router.") and "Depends(require_superadmin)" in b.split("):", 1)[0]]
        self.assertEqual(offenders, [])

    def test_admin_router_mount_checks_access_and_audits(self):
        mount = re.findall(r"^\s*\w+\.include_router\(admin_router[^\n]*", self.source, re.MULTILINE)
        self.assertEqual(len(mount), 1)
        self.assertIn("Depends(require_admin_access)", mount[0])
        self.assertIn("Depends(audit_admin_request)", mount[0])


if __name__ == "__main__":
    unittest.main()
