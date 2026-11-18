import asyncio
import base64
import io
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import ecommerce_catalog  # noqa: E402
from ecommerce_catalog import (  # noqa: E402
    PublicCatalog,
    decode_embedded_image,
    image_kind,
    is_valid_product_id,
    product_image_path,
)
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


# Image synthétique générée pour le test : aucune photo de commerçant.
def data_uri():
    buffer = io.BytesIO()
    Image.new("RGB", (20, 20), (10, 120, 80)).save(buffer, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


UPDATED = datetime(2026, 11, 18, 12, 0, tzinfo=timezone.utc)


def product(product_id, name, **extra):
    doc = {
        "product_id": product_id,
        "name": name,
        "user_id": "owner",
        "store_id": "store",
        "selling_price": 1000,
        "quantity": 3,
        "unit": "piece",
        "is_active": True,
        "updated_at": UPDATED,
    }
    doc.update(extra)
    return doc


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.catalog = PublicCatalog(self.db)
        self.photo = data_uri()
        run(self.db.categories.insert_one({"category_id": "cat1", "user_id": "owner", "name": "Sacs"}))
        run(self.db.products.insert_many([
            product("prod_a", "Ceinture", image="https://cdn.example.org/ceinture.jpg"),
            product("prod_b", "Sac", image=self.photo, category_id="cat1"),
            product("prod_c", "Chapeau"),
            product("prod_d", "Rupture", quantity=0),
            product("prod_e", "Sans prix", selling_price=0),
            product("prod_f", "Archivé", is_active=False),
            product("prod_g", "Autre boutique", store_id="other"),
        ]))

    def test_list_serves_photos_by_address_and_never_embeds_them(self):
        result = run(self.catalog.list_products("owner", "store", False, "ma-boutique"))
        names = [item["name"] for item in result["products"]]
        self.assertEqual(names, ["Ceinture", "Chapeau", "Sac"])
        by_id = {item["product_id"]: item for item in result["products"]}
        self.assertEqual(by_id["prod_a"]["image"], "https://cdn.example.org/ceinture.jpg")
        self.assertEqual(by_id["prod_b"]["image"], product_image_path("ma-boutique", "prod_b", UPDATED))
        self.assertIsNone(by_id["prod_c"]["image"])
        self.assertEqual(by_id["prod_b"]["category"], "Sacs")
        self.assertNotIn("base64", str(result))
        self.assertEqual(result["total"], 3)
        self.assertFalse(result["truncated"])

    def test_out_of_stock_products_follow_the_setting(self):
        result = run(self.catalog.list_products("owner", "store", True, "ma-boutique"))
        rupture = next(item for item in result["products"] if item["product_id"] == "prod_d")
        self.assertFalse(rupture["available"])

    def test_private_preview_keeps_photos_inline(self):
        result = run(self.catalog.list_products("owner", "store", False, "ma-boutique", inline_images=True))
        by_id = {item["product_id"]: item for item in result["products"]}
        self.assertEqual(by_id["prod_b"]["image"], self.photo)

    def test_truncated_catalog_is_reported(self):
        original = ecommerce_catalog.PUBLIC_CATALOG_LIMIT
        ecommerce_catalog.PUBLIC_CATALOG_LIMIT = 2
        try:
            result = run(self.catalog.list_products("owner", "store", False, "ma-boutique"))
        finally:
            ecommerce_catalog.PUBLIC_CATALOG_LIMIT = original
        self.assertEqual(len(result["products"]), 2)
        self.assertEqual(result["total"], 3)
        self.assertTrue(result["truncated"])

    def test_single_product_only_when_published(self):
        sac = run(self.catalog.get_product("owner", "store", False, "ma-boutique", "prod_b"))
        self.assertEqual(sac["name"], "Sac")
        self.assertTrue(sac["image"].startswith("/api/public/ecommerce/ma-boutique/products/prod_b/image?v="))
        for hidden in ("prod_d", "prod_e", "prod_f", "prod_g", "inconnu", "../x"):
            self.assertIsNone(run(self.catalog.get_product("owner", "store", False, "ma-boutique", hidden)), hidden)

    def test_read_image_decodes_embedded_photo_and_redirects_external(self):
        image = run(self.catalog.read_image("owner", "store", False, "prod_b"))
        self.assertEqual(image["media_type"], "image/jpeg")
        self.assertTrue(image["data"].startswith(b"\xff\xd8"))
        self.assertEqual(len(image["etag"]), 32)
        self.assertEqual(run(self.catalog.read_image("owner", "store", False, "prod_a")), {"redirect": "https://cdn.example.org/ceinture.jpg"})
        self.assertIsNone(run(self.catalog.read_image("owner", "store", False, "prod_c")))
        self.assertIsNone(run(self.catalog.read_image("owner", "store", False, "prod_g")))

    def test_sitemap_lists_published_products(self):
        rows = run(self.catalog.sitemap_products("owner", "store", False))
        self.assertEqual([row["product_id"] for row in rows], ["prod_a", "prod_c", "prod_b"])
        self.assertEqual(rows[0]["updated_at"], UPDATED.isoformat())


class HelperTests(unittest.TestCase):
    def test_image_kind(self):
        self.assertEqual(image_kind("data:image/png;base64,AAAA"), "embedded")
        self.assertEqual(image_kind("https://x.org/a.png"), "external")
        self.assertIsNone(image_kind("javascript:alert(1)"))
        self.assertIsNone(image_kind("data:text/html;base64,AAAA"))
        self.assertIsNone(image_kind(None))

    def test_decode_rejects_unreadable_images(self):
        self.assertIsNone(decode_embedded_image("data:image/png;base64,"))
        self.assertIsNone(decode_embedded_image("data:image/svg+xml;base64,PHN2Zz4="))
        self.assertEqual(decode_embedded_image("data:image/jpg;base64,AAEC")[1], "image/jpeg")

    def test_product_ids(self):
        self.assertTrue(is_valid_product_id("prod_0123abcd"))
        self.assertFalse(is_valid_product_id("a/b"))
        self.assertFalse(is_valid_product_id(""))


if __name__ == "__main__":
    unittest.main()
