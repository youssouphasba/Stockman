import unittest

from pydantic import ValidationError

from backend.admin_message_links import AdminMessageActionLink, render_admin_message_email_actions


class AdminMessageLinkTests(unittest.TestCase):
    def test_link_can_be_serialized_for_storage(self):
        link = AdminMessageActionLink(label="  Stockman  ", url=" https://stockman.pro ")
        self.assertEqual(link.model_dump(mode="json"), {
            "label": "Stockman",
            "url": "https://stockman.pro/",
        })

    def test_invalid_destinations_are_rejected(self):
        for url in (
            "javascript:alert(1)",
            "//stockman.pro",
            "http://stockman.pro",
            "https:///stockman.pro",
            "https://user@stockman.pro",
            "https://stockman.pro\\path",
            "https://stockman.pro/a b",
        ):
            with self.subTest(url=url), self.assertRaises(ValidationError):
                AdminMessageActionLink(label="Stockman", url=url)

    def test_empty_or_overlong_label_is_rejected(self):
        for label in ("   ", "a" * 81):
            with self.subTest(label=label), self.assertRaises(ValidationError):
                AdminMessageActionLink(label=label, url="https://stockman.pro")

    def test_email_preserves_internal_action_and_escapes_external_button(self):
        link = AdminMessageActionLink(label="<Stockman>", url="https://stockman.pro/?a=1&b=2")
        html, plain = render_admin_message_email_actions("https://app.stockman.pro", link)
        self.assertIn('href="https://app.stockman.pro"', html)
        self.assertIn('href="https://stockman.pro/?a=1&amp;b=2"', html)
        self.assertIn("&lt;Stockman&gt;", html)
        self.assertIn("<Stockman> : https://stockman.pro/?a=1&b=2", plain)

    def test_existing_messages_do_not_need_actions(self):
        self.assertEqual(render_admin_message_email_actions(None, None), ("", ""))
