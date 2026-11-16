import ast
import os
import unittest
from unittest import mock
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "backend" / "server.py").read_text(encoding="utf-8-sig").replace("\r\n", "\n")
TREE = ast.parse(SOURCE)


def load(names, namespace):
    # server.py ne peut pas être importé ici (FastAPI absent) : on exécute seulement les fonctions testées.
    nodes = [node for node in TREE.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    assert {node.name for node in nodes} == set(names), names
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "server.py", "exec"), namespace)
    return namespace


class FakeJwt:
    @staticmethod
    def encode(payload, key, algorithm):
        return "token-" + payload["email"]


NOW = datetime(2026, 11, 16, 12, tzinfo=timezone.utc)


def activation_target(days_since_creation: int):
    namespace = load(["choose_system_activation_target"], {
        "Any": Any, "Dict": Dict, "Optional": Optional, "datetime": datetime,
        "is_billable_owner_doc": lambda user: True,
        "normalize_plan": lambda plan: plan,
        "parse_datetime_value": lambda value: value,
        "permission_allows_write": lambda permissions, module: True,
        "build_app_deeplink": lambda screen, params: f"stockman://{screen}",
    })
    user = {"user_id": "u", "email": "owner@example.com", "created_at": NOW - timedelta(days=days_since_creation)}
    access = {"can_write_data": True, "effective_permissions": {}}
    return namespace["choose_system_activation_target"](user, {"plan": "starter"}, access, 0, 0, None, None, NOW)


class ActivationEmailTests(unittest.TestCase):
    def test_product_reminder_is_sent_three_times_at_most(self):
        milestones = {day: (activation_target(day) or {}).get("milestone") for day in range(0, 120)}
        self.assertIsNone(milestones[0])
        self.assertEqual(milestones[1], "j1")
        self.assertEqual(milestones[3], "j3")
        self.assertEqual(milestones[7], "j7")
        self.assertEqual({value for value in milestones.values() if value}, {"j1", "j3", "j7"})
        self.assertTrue(all(milestones[day] is None for day in range(14, 120)))

    def test_links_and_unsubscribe_use_the_stockman_domain(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self._check_links()

    def _check_links(self):
        namespace = load(
            ["get_web_app_base_url", "get_email_link_base_url", "build_marketing_unsubscribe_link", "build_marketing_email_headers"],
            {"os": os, "Dict": Dict, "jwt": FakeJwt, "SECRET_KEY": "k", "ALGORITHM": "HS256",
             "MARKETING_EMAIL_SCOPE": "marketing", "quote": quote},
        )
        url = namespace["build_marketing_unsubscribe_link"](" Owner@Example.com ")
        self.assertEqual(url, "https://app.stockman.pro/api/email/unsubscribe?t=token-owner%40example.com")
        self.assertEqual(namespace["build_marketing_email_headers"](url), {
            "List-Unsubscribe": f"<{url}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        })
        for builder in ("build_signed_billing_payment_link", "build_signed_app_open_link"):
            body = ast.get_source_segment(SOURCE, next(node for node in TREE.body if getattr(node, "name", None) == builder))
            self.assertIn("get_email_link_base_url()", body)
            self.assertNotIn("get_api_public_base_url()", body)

    def test_activation_and_demo_emails_respect_unsubscribes(self):
        for name in ("send_system_activation_email", "send_demo_conversion_email"):
            body = ast.get_source_segment(SOURCE, next(node for node in TREE.body if getattr(node, "name", None) == name))
            self.assertIn("is_marketing_email_unsubscribed(email)", body)
            self.assertIn("headers=build_marketing_email_headers(unsubscribe_url)", body)


if __name__ == "__main__":
    unittest.main()
