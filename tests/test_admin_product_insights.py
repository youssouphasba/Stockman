import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import admin_product_insights as pi  # noqa: E402

OWNERS = {
    "u1": {"name": "Awa", "country_code": "SN", "currency": "XOF", "sector": "epicerie"},
    "u2": {"name": "Moussa", "country_code": "SN", "currency": "XOF", "sector": "epicerie"},
    "u3": {"name": "Paul", "country_code": "FR", "currency": "EUR", "sector": "epicerie"},
}
ENTRIES = [
    {"catalog_id": "g_riz", "display_name": "Riz parfumé 5 kg", "barcodes": ["111"], "sector": "epicerie", "country_codes": ["SN"], "sale_price": 1000},
    {"catalog_id": "g_lait", "display_name": "Lait en poudre", "sector": "epicerie", "country_codes": []},
    {"catalog_id": "g_sucre", "display_name": "Sucre", "sector": "epicerie", "country_codes": ["SN"]},
]
VISIBLE = {"g_riz", "g_lait"}  # g_sucre attend sa relecture


def product(pid, user, name, **extra):
    return {"product_id": pid, "user_id": user, "store_id": f"s_{user}", "name": name, "selling_price": 100, "purchase_price": 50,
            "category": "Épicerie", "barcode": None, "quantity": 5, **extra}


class InsightsTests(unittest.TestCase):
    def test_canonical_matches_catalog_normalization(self):
        self.assertEqual(pi.canonical("  Riz   PARFUMÉ "), "riz parfume")

    def test_quality_report_counts_and_ranks_merchants(self):
        products = [
            product("p1", "u1", "Riz", selling_price=0, purchase_price=0, quantity=-2),
            product("p2", "u1", "Huile", category="", barcode="999"),
            product("p3", "u2", "Savon", barcode="888"),
        ]
        report = pi.quality_report(products, OWNERS)
        self.assertEqual(report["total_products"], 3)
        self.assertEqual(report["totals"]["no_selling_price"], 1)
        self.assertEqual(report["totals"]["no_category"], 1)
        self.assertEqual(report["totals"]["no_barcode"], 1)
        self.assertEqual(report["totals"]["negative_stock"], 1)
        self.assertEqual(report["merchants"][0]["user_id"], "u1")
        self.assertEqual(report["merchants"][0]["issues"], 3)

    def test_top_sold_merges_names_across_stores(self):
        rows = [
            {"_id": {"user": "u1", "store": "s1", "name": "coca cola 33cl"}, "quantity": 10, "sales": 4},
            {"_id": {"user": "u2", "store": "s2", "name": "Coca  Cola 33cl"}, "quantity": 3, "sales": 2},
            {"_id": {"user": "u3", "store": "s3", "name": "baguette"}, "quantity": 50, "sales": 30},
        ]
        top = pi.top_sold(rows, OWNERS)
        self.assertEqual(top[0]["merchants"], 2)
        self.assertEqual(top[0]["quantity"], 13)
        self.assertEqual(top[0]["countries"], ["SN"])
        self.assertEqual(top[1]["name"], "baguette")

    def test_candidates_skip_visible_entries_and_flag_pending(self):
        index = pi.build_catalog_index(ENTRIES, VISIBLE)
        products = [
            product("p1", "u1", "Riz parfumé 5kg", barcode="111"),   # code-barres du catalogue : déjà proposé
            product("p2", "u1", "Lait en poudre"),                   # nom du catalogue : déjà proposé
            product("p3", "u1", "Sucre"), product("p4", "u2", "sucre"),  # fiche en attente
            product("p5", "u1", "Attiéké", selling_price=500), product("p6", "u2", "Attieke", selling_price=700),
            product("p7", "u3", "Pain de mie"),                       # un seul commerçant
        ]
        candidates = pi.catalog_candidates(products, OWNERS, index)
        by_key = {c["key"]: c for c in candidates}
        self.assertEqual(set(by_key), {"sucre", "attieke"})
        self.assertEqual(by_key["sucre"]["pending_catalog_id"], "g_sucre")
        self.assertIsNone(by_key["attieke"]["pending_catalog_id"])
        self.assertEqual(by_key["attieke"]["prices"][0], {"currency": "XOF", "median": 600, "min": 500, "max": 700, "count": 2})

    def test_usage_links_prices_and_drift(self):
        products = [
            product("p1", "u1", "Riz parfumé", global_catalog_id="g_riz", selling_price=1400),
            product("p2", "u2", "Riz", barcode="111", selling_price=1500),
            {**product("p3", "u2", "Riz bis", barcode="111", selling_price=1300), "store_id": "s_u2b"},
            product("p4", "u3", "Lait en poudre", selling_price=5),
        ]
        sold = {"p1": {"quantity": 12}, "p4": {"quantity": 0}}
        usage = pi.catalog_usage(ENTRIES, VISIBLE, products, OWNERS, sold)
        rows = {row["catalog_id"]: row for row in usage["items"]}
        riz = rows["g_riz"]
        self.assertEqual((riz["imported_stores"], riz["matched_stores"], riz["selling_stores_30d"], riz["quantity_30d"]), (1, 3, 1, 12))
        self.assertEqual(riz["observed_prices"][0], {"country_code": "SN", "median": 1400, "count": 3, "drift_pct": 40.0})
        self.assertTrue(riz["price_alert"])
        # Fiche sans pays : pas de comparaison de prix possible.
        self.assertIsNone(rows["g_lait"]["observed_prices"][0]["drift_pct"])
        self.assertEqual(usage["summary"]["never_used"], 0)
        self.assertEqual(usage["summary"]["price_alerts"], 1)

    def test_coverage_flags_thin_cells(self):
        coverage = pi.coverage_matrix(ENTRIES, VISIBLE, OWNERS, {"epicerie": "Épicerie"})
        self.assertEqual(coverage["countries"], ["SN", "FR"])
        cells = {c["country_code"]: c for c in coverage["rows"][0]["cells"]}
        # Riz (SN) + Lait (tous pays) au Sénégal ; Lait seul en France.
        self.assertEqual((cells["SN"]["entries"], cells["SN"]["merchants"]), (2, 2))
        self.assertEqual((cells["FR"]["entries"], cells["FR"]["merchants"]), (1, 1))
        self.assertTrue(cells["SN"]["thin"])
        self.assertEqual(coverage["gaps"][0]["country_code"], "SN")


if __name__ == "__main__":
    unittest.main()
