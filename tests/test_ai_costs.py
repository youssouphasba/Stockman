import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAG = (ROOT / "backend" / "services" / "rag_service.py").read_text(encoding="utf-8-sig")
SERVER = (ROOT / "backend" / "server.py").read_text(encoding="utf-8-sig")


class AiCostTests(unittest.TestCase):
    def test_rag_index_does_not_embed_source_code(self):
        # Le code source représentait ~500 000 tokens recalculés par Gemini à chaque déploiement.
        self.assertNotIn("_chunk_business_code", RAG)
        self.assertNotIn("_chunk_code_file", RAG)
        self.assertNotIn('"server.py"', RAG)

    def test_forecast_ai_summary_is_opt_in_and_cached(self):
        start = SERVER.index('@api_router.get("/sales/forecast")')
        body = SERVER[start:SERVER.index('@api_router.get("/sales/forecast/{product_id}")')]
        self.assertIn("with_ai_summary: bool = Query(False)", body)
        self.assertIn('resolve_gemini_api_key() if with_ai_summary else ""', body)
        self.assertIn("_forecast_ai_summary_cache[summary_key]", body)
        self.assertIn("FORECAST_AI_SUMMARY_TTL_SECONDS = 6 * 3600", SERVER)

    def test_only_the_home_forecast_card_requests_the_ai_summary(self):
        card = (ROOT / "frontend" / "components" / "ForecastCard.tsx").read_text(encoding="utf-8")
        products = (ROOT / "frontend" / "app" / "(tabs)" / "products.tsx").read_text(encoding="utf-8")
        self.assertIn("sales.forecast(true)", card)
        self.assertIn("salesApi.forecast()", products)


if __name__ == "__main__":
    unittest.main()
