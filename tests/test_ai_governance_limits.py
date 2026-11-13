import asyncio
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from fastapi import HTTPException  # noqa: E402
except ImportError:  # FastAPI n'est pas installé localement : on simule l'exception utilisée.
    import types

    class HTTPException(Exception):
        def __init__(self, status_code, detail=None):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail

    fastapi_stub = types.ModuleType("fastapi")
    fastapi_stub.HTTPException = HTTPException
    sys.modules["fastapi"] = fastapi_stub

from fake_mongo import FakeDatabase  # noqa: E402
from services import ai_governance as gov  # noqa: E402


def run(coro):
    return asyncio.run(coro)


async def use(db, feature, times):
    for _ in range(times):
        await db.ai_usage.insert_one({"user_id": "u1", "owner_id": "u1", "feature": feature, "success": True, "created_at": datetime.now(timezone.utc)})


class AiLimitTests(unittest.TestCase):
    def test_free_calculations_have_no_usage_quota(self):
        db = FakeDatabase()
        run(use(db, "deadstock_analysis", 50))
        run(gov.check_ai_limit(db, "u1", "starter", "deadstock_analysis"))  # ne lève rien

    def test_free_calculations_stay_reserved_by_plan(self):
        db = FakeDatabase()
        with self.assertRaises(HTTPException) as ctx:
            run(gov.check_ai_limit(db, "u1", "starter", "seasonality_alerts"))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_gemini_features_now_have_a_quota(self):
        db = FakeDatabase()
        for feature in ("pl_analysis", "churn_prediction", "monthly_report", "voice_to_text"):
            limit = gov.AI_FEATURE_LIMITS[feature]["limits"]["starter"]
            run(use(db, feature, limit))
            with self.assertRaises(HTTPException) as ctx:
                run(gov.check_ai_limit(db, "u1", "starter", feature))
            self.assertEqual(ctx.exception.status_code, 429)

    def test_quota_is_shared_by_the_whole_account(self):
        db = FakeDatabase()
        limit = gov.AI_FEATURE_LIMITS["pl_analysis"]["limits"]["pro"]

        async def team_usage():
            for index in range(limit):
                await db.ai_usage.insert_one({
                    "user_id": f"staff{index % 3}", "owner_id": "owner1", "feature": "pl_analysis",
                    "success": True, "created_at": datetime.now(timezone.utc),
                })

        run(team_usage())
        with self.assertRaises(HTTPException) as ctx:
            run(gov.check_ai_limit(db, "owner1", "pro", "pl_analysis"))
        self.assertEqual(ctx.exception.status_code, 429)
        run(gov.check_ai_limit(db, "owner2", "pro", "pl_analysis"))  # un autre compte n'est pas touché


if __name__ == "__main__":
    unittest.main()
