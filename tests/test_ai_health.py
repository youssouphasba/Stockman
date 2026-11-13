import asyncio
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import ai_health  # noqa: E402


class FakeModel:
    def __init__(self, error=None):
        self.error = error

    def generate_content(self, prompt):
        if self.error:
            raise self.error
        return "OK"


class AiHealthTests(unittest.TestCase):
    def setUp(self):
        ai_health._state.update({"status": "unknown", "category": None, "last_error": None, "last_error_at": None, "last_success_at": None, "last_alert_at": {}})

    def test_classify_gemini_errors(self):
        self.assertEqual(ai_health.classify_error(Exception("429 Your prepayment credits are depleted.")), "credit")
        self.assertEqual(ai_health.classify_error(Exception("429 Resource has been exhausted (e.g. check quota).")), "quota")
        self.assertEqual(ai_health.classify_error(Exception("400 API key not valid. Please pass a valid API key.")), "auth")
        self.assertIsNone(ai_health.classify_error(ValueError("bad json")))
        self.assertIsNone(ai_health.user_message(ValueError("bad json")))

    def test_alert_once_then_recovery(self):
        events = []
        loop = asyncio.new_event_loop()

        async def notifier(event, payload):
            events.append((event, payload.get("category") or payload.get("previous_category")))

        ai_health.bind(loop, notifier)
        try:
            broken = ai_health.MonitoredModel(FakeModel(Exception("429 Your prepayment credits are depleted.")))
            for _ in range(3):
                with self.assertRaises(Exception):
                    broken.generate_content("x")
            self.assertEqual(ai_health.snapshot()["status"], "down")
            self.assertEqual(ai_health.snapshot()["category_label"], "Crédit Gemini épuisé")
            ai_health.MonitoredModel(FakeModel()).generate_content("x")
            loop.run_until_complete(asyncio.sleep(0.05))
        finally:
            loop.close()
            ai_health._loop = None
            ai_health._notifier = None
        self.assertEqual(events, [("down", "credit"), ("recovered", "credit")])
        self.assertEqual(ai_health.snapshot()["status"], "ok")

    def test_ordinary_errors_do_not_alert(self):
        model = ai_health.MonitoredModel(FakeModel(ValueError("bad json")))
        with self.assertRaises(ValueError):
            model.generate_content("x")
        self.assertEqual(ai_health.snapshot()["status"], "unknown")


if __name__ == "__main__":
    unittest.main()
