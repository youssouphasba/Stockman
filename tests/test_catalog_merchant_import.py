import asyncio
import sys
import types
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Le service importe le SDK Gemini au chargement ; il n'est pas utilisé ici.
if "google.generativeai" not in sys.modules:
    google = sys.modules.setdefault("google", types.ModuleType("google"))
    genai = types.ModuleType("google.generativeai")
    google.generativeai = genai
    sys.modules["google.generativeai"] = genai

from fake_mongo import FakeDatabase  # noqa: E402
from services.catalog_service import CatalogService  # noqa: E402

ENTRIES = [
    {"catalog_id": "g1", "display_name": "Riz 5 kg", "sector": "epicerie", "country_codes": ["SN"], "publication_status": "published", "added_by_count": 9},
    {"catalog_id": "g2", "display_name": "Lait", "sector": "epicerie", "country_codes": [], "verified": True, "added_by_count": 5},
    {"catalog_id": "g3", "display_name": "Ma recette maison", "sector": "epicerie", "country_codes": ["SN"], "verified": False, "added_by_count": 1},
    {"catalog_id": "g4", "display_name": "Fromage", "sector": "epicerie", "country_codes": ["FR"], "publication_status": "published", "added_by_count": 3},
]


class MerchantCatalogTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = CatalogService(self.db)

        async def seed():
            for entry in ENTRIES:
                await self.db.global_catalog.insert_one(dict(entry))
        asyncio.run(seed())

    def test_browse_only_shows_reviewed_entries_for_the_country(self):
        result = asyncio.run(self.service.browse("epicerie", "SN", None, 0, 50))
        self.assertEqual([p["catalog_id"] for p in result["products"]], ["g1", "g2"])
        self.assertEqual(result["total"], 2)

    def test_import_keeps_the_catalog_link_and_ignores_unreviewed_entries(self):
        result = asyncio.run(self.service.import_to_user(["g1", "g3"], "u1", "s1"))
        self.assertEqual(result["imported"], 1)
        product = self.db.products.docs[0]
        self.assertEqual((product["name"], product["global_catalog_id"], product["selling_price"]), ("Riz 5 kg", "g1", 0))

    def test_import_all_skips_unreviewed_entries(self):
        result = asyncio.run(self.service.import_all_sector("epicerie", "SN", "u1", "s1"))
        self.assertEqual(result["imported"], 2)
        self.assertEqual(sorted(p["global_catalog_id"] for p in self.db.products.docs), ["g1", "g2"])


if __name__ == "__main__":
    unittest.main()
