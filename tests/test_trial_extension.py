import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import trial_extension as te  # noqa: E402

NOW = datetime(2026, 11, 17, 10, 0, tzinfo=timezone.utc)


class TrialExtensionTests(unittest.TestCase):
    def test_months_are_added_after_the_running_trial(self):
        current = NOW + timedelta(days=10)
        self.assertEqual(te.new_trial_end(current, NOW, 2), current + timedelta(days=60))

    def test_expired_trial_restarts_from_today(self):
        self.assertEqual(te.new_trial_end(NOW - timedelta(days=5), NOW, 1), NOW + timedelta(days=30))
        self.assertEqual(te.new_trial_end(None, NOW, 3), NOW + timedelta(days=90))

    def test_naive_dates_from_mongo_are_handled(self):
        naive = (NOW + timedelta(days=1)).replace(tzinfo=None)
        self.assertEqual(te.new_trial_end(naive, NOW, 1), NOW + timedelta(days=31))

    def test_month_count_is_bounded(self):
        for months in (0, 13, -1):
            with self.assertRaises(ValueError):
                te.new_trial_end(None, NOW, months)

    def test_paying_accounts_are_detected(self):
        self.assertTrue(te.is_paying_account({"subscription_provider": "stripe"}))
        for provider in ("none", "", None):
            self.assertFalse(te.is_paying_account({"subscription_provider": provider}))
        self.assertFalse(te.is_paying_account(None))

    def test_french_notification_uses_singular_and_plural(self):
        end = NOW + timedelta(days=30)
        one = te.notification_text(1, end, "fr")
        self.assertEqual(one["title"], "Stockman vous offre 1 mois gratuit")
        self.assertIn("jusqu'au 17/12/2026", one["content"])
        self.assertEqual(te.notification_text(3, end, "fr")["title"], "Stockman vous offre 3 mois gratuits")

    def test_other_languages_get_english_and_the_admin_note(self):
        self.assertEqual(te.notification_text(1, NOW, "wo")["title"], "Stockman vous offre 1 mois gratuit")
        text = te.notification_text(2, NOW, "de", note="Merci pour votre fidélité.")
        self.assertEqual(text["title"], "Stockman gives you 2 free months")
        self.assertTrue(text["content"].endswith("Merci pour votre fidélité."))

    def test_signup_trial_defaults_to_one_month(self):
        self.assertEqual(te.signup_trial_view(None), {"months": 1, "days": 30})
        self.assertEqual(te.signup_trial_view({"trial": {}}), {"months": 1, "days": 30})

    def test_signup_trial_uses_the_admin_setting(self):
        self.assertEqual(te.signup_trial_view({"trial": {"signup_months": 3}}), {"months": 3, "days": 90})

    def test_invalid_signup_setting_falls_back_to_one_month(self):
        for value in (0, 13, "abc", None, -2):
            self.assertEqual(te.signup_trial_view({"trial": {"signup_months": value}})["months"], 1)


class UndoTrialExtensionTests(unittest.TestCase):
    def events(self):
        first_end = NOW + timedelta(days=60)
        second_end = NOW + timedelta(days=90)
        return [
            {"event_id": "e1", "event_type": "trial_extended", "created_at": NOW - timedelta(minutes=5),
             "metadata": {"months": 1, "previous_trial_ends_at": (NOW + timedelta(days=30)).isoformat(), "trial_ends_at": first_end.isoformat()}},
            {"event_id": "e2", "event_type": "trial_extended", "created_at": NOW,
             "metadata": {"months": 1, "previous_trial_ends_at": first_end.isoformat(), "trial_ends_at": second_end.isoformat()}},
        ], first_end, second_end

    def test_latest_offer_is_undone_when_the_trial_end_is_unchanged(self):
        events, _first, second = self.events()
        event, reason = te.undoable_extension(events, second)
        self.assertEqual((event["event_id"], reason), ("e2", ""))

    def test_already_reverted_offers_are_skipped(self):
        events, first, _second = self.events()
        events[1]["reverted_at"] = NOW
        event, _ = te.undoable_extension(events, first)
        self.assertEqual(event["event_id"], "e1")

    def test_refused_when_the_trial_end_changed_since(self):
        events, _first, second = self.events()
        event, reason = te.undoable_extension(events, second + timedelta(days=7))
        self.assertIsNone(event)
        self.assertIn("a changé", reason)

    def test_refused_without_any_offer(self):
        event, reason = te.undoable_extension([], NOW)
        self.assertIsNone(event)
        self.assertIn("Aucune offre", reason)

    def test_correction_text(self):
        text = te.correction_text(NOW + timedelta(days=30), "wo")
        self.assertEqual(text["title"], "Correction de votre essai gratuit")
        self.assertIn("17/12/2026", text["content"])
        self.assertIn("ends on", te.correction_text(NOW, "en")["content"])


if __name__ == "__main__":
    unittest.main()
