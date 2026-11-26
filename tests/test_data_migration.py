import asyncio
import io
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import data_migration as mig  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402

try:
    import openpyxl  # noqa: F401
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


def run(coro):
    return asyncio.run(coro)


class FakeImportService:
    """Reprend le contrat de ImportService (validation puis insertion) sans pydantic."""

    def __init__(self, db):
        self.db = db

    async def validate_and_prepare_products(self, rows, user_id, store_id):
        products = []
        for index, row in enumerate(rows):
            products.append({
                "product_id": f"prod_{index}_{row['name'][:4]}", "name": row["name"], "user_id": user_id,
                "store_id": store_id, "quantity": row.get("quantity", 0), "purchase_price": row.get("purchase_price", 0),
                "selling_price": row.get("selling_price", 0), "sku": row.get("sku", ""), "is_active": True,
            })
        return {"products": products, "errors": []}

    async def execute_bulk_insert(self, products):
        await self.db.products.insert_many(products)
        for product in products:
            await self.db.stock_movements.insert_one({"user_id": product["user_id"], "product_id": product["product_id"], "type": "in"})
        return len(products)


class FakeModel:
    def __init__(self, text):
        self.text = text
        self.calls = 0

    async def generate_content_async(self, _prompt):
        self.calls += 1
        return SimpleNamespace(text=self.text)


class ParsingTests(unittest.TestCase):
    def test_numbers_in_local_formats(self):
        self.assertEqual(mig.parse_number("1 500 FCFA"), 1500)
        self.assertEqual(mig.parse_number("1.500"), 1500)
        self.assertEqual(mig.parse_number("2,5"), 2.5)
        self.assertEqual(mig.parse_number("1.234,56 €"), 1234.56)
        self.assertEqual(mig.parse_number("1,234.56"), 1234.56)
        self.assertEqual(mig.parse_number("12 000"), 12000)
        self.assertIsNone(mig.parse_number("abc"))

    def test_dates_day_first_and_iso(self):
        moment, has_time = mig.parse_date("03/02/2025")
        self.assertEqual((moment.year, moment.month, moment.day, moment.hour), (2025, 2, 3, 12))
        self.assertFalse(has_time)
        moment, has_time = mig.parse_date("2025-02-03 14:30")
        self.assertEqual((moment.hour, moment.minute), (14, 30))
        self.assertTrue(has_time)
        moment, _ = mig.parse_date("12/25/2024")  # mois en premier : le 25 ne peut pas être un mois
        self.assertEqual((moment.month, moment.day), (12, 25))
        moment, _ = mig.parse_date(45658)  # numéro de série Excel = 2025-01-01
        self.assertEqual(moment.date().isoformat(), "2025-01-01")
        self.assertEqual(mig.parse_date("pas une date"), (None, False))

    def test_payment_methods(self):
        self.assertEqual(mig.normalize_payment_method("Espèces"), "cash")
        self.assertEqual(mig.normalize_payment_method("Orange Money"), "mobile_money")
        self.assertEqual(mig.normalize_payment_method("Wave"), "mobile_money")
        self.assertEqual(mig.normalize_payment_method("Crédit client"), "credit")
        self.assertEqual(mig.normalize_payment_method("CB"), "card")

    def test_csv_with_title_line_and_semicolons(self):
        content = "Export de ma boutique\n\nDésignation;Prix de vente;Stock\nRiz 5kg;3 500;12\nHuile 1L;1 200;30\n".encode("cp1252")
        tables = mig.read_tables(content, "export.csv")
        self.assertEqual(tables[0]["columns"], ["Désignation", "Prix de vente", "Stock"])
        self.assertEqual(len(tables[0]["rows"]), 2)

    @unittest.skipUnless(HAS_OPENPYXL, "openpyxl non installé")
    def test_xlsx_sheets_are_separate_tables(self):
        from openpyxl import Workbook

        workbook = Workbook()
        products = workbook.active
        products.title = "Articles"
        products.append(["Nom", "Prix de vente", "Stock"])
        products.append(["Sucre", 800, 10])
        sales = workbook.create_sheet("Ventes")
        sales.append(["Date", "Article", "Quantité", "Montant", "Paiement"])
        sales.append([datetime(2025, 3, 1, 9, 15), "Sucre", 2, 1600, "Wave"])
        buffer = io.BytesIO()
        workbook.save(buffer)
        tables = mig.read_tables(buffer.getvalue(), "boutique.xlsx")
        self.assertEqual([table["name"] for table in tables], ["Articles", "Ventes"])
        self.assertEqual(tables[1]["rows"][0]["Date"], "2025-03-01T09:15:00")

    def test_old_xls_is_refused_with_a_clear_message(self):
        with self.assertRaisesRegex(ValueError, "xlsx"):
            mig.read_tables(b"\xd0\xcf\x11\xe0", "vieux.xls")


class RecognitionTests(unittest.TestCase):
    def test_products_table(self):
        guess = mig.guess_table(["Désignation", "Code barre", "Prix d'achat", "Prix de vente", "Stock actuel", "Famille"])
        self.assertEqual(guess["kind"], mig.KIND_PRODUCTS)
        self.assertEqual(guess["mapping"]["name"], "Désignation")
        self.assertEqual(guess["mapping"]["quantity"], "Stock actuel")
        self.assertEqual(guess["mapping"]["category_name"], "Famille")

    def test_sales_table(self):
        guess = mig.guess_table(["Date", "N° ticket", "Article", "Qté", "PU", "Montant", "Mode de paiement"])
        self.assertEqual(guess["kind"], mig.KIND_SALES)
        self.assertEqual(guess["mapping"]["reference"], "N° ticket")
        self.assertEqual(guess["mapping"]["total"], "Montant")

    def test_unknown_columns_go_to_the_ai(self):
        table = {"name": "Feuil1", "columns": ["Col A", "Col B"], "rows": [{"Col A": "Riz", "Col B": "3500"}]}
        model = FakeModel('{"kind": "products", "mapping": {"name": "Col A", "selling_price": "Col B", "sku": "Inventée"}, "confidence": 0.8}')
        result = run(mig.classify_table(table, model))
        self.assertEqual(result["kind"], mig.KIND_PRODUCTS)
        self.assertEqual(result["mapping"], {"name": "Col A", "selling_price": "Col B"})  # colonne inventée écartée
        self.assertEqual(result["method"], "ai")

    def test_clear_columns_do_not_call_the_ai(self):
        model = FakeModel("{}")
        table = {"name": "x", "columns": ["Nom", "Prix de vente", "Stock", "Catégorie"], "rows": [{"Nom": "a"}]}
        run(mig.classify_table(table, model))
        self.assertEqual(model.calls, 0)


SALES_MAPPING = {"date": "Date", "reference": "Ticket", "product_name": "Article", "quantity": "Qté", "total": "Montant", "payment_method": "Paiement"}


def sale_rows():
    return [
        {"Date": "01/03/2025 09:15", "Ticket": "T1", "Article": "Riz 5kg", "Qté": "2", "Montant": "7000", "Paiement": "Espèces"},
        {"Date": "01/03/2025 09:15", "Ticket": "T1", "Article": "Huile", "Qté": "1", "Montant": "1200", "Paiement": "Espèces"},
        {"Date": "02/03/2025", "Ticket": "T2", "Article": "Savon inconnu", "Qté": "", "Montant": "500", "Paiement": "Wave"},
        {"Date": "", "Ticket": "", "Article": "TOTAL", "Qté": "", "Montant": "8700", "Paiement": ""},
        {"Date": "pas de date", "Ticket": "T3", "Article": "Riz 5kg", "Qté": "1", "Montant": "3500", "Paiement": ""},
    ]


class SalesPreparationTests(unittest.TestCase):
    def test_lines_grouped_by_ticket_and_matched_to_products(self):
        products = [{"product_id": "p_riz", "name": "Riz 5 kg", "purchase_price": 3000}, {"product_id": "p_huile", "name": "Huile", "purchase_price": 900}]
        result = mig.prepare_sales(sale_rows(), SALES_MAPPING, products, "owner", "store")
        self.assertEqual(len(result["sales"]), 2)
        first = result["sales"][0]
        self.assertEqual(first["total_amount"], 8200)
        self.assertEqual(first["source"], mig.IMPORT_SOURCE)
        self.assertEqual(first["status"], "completed")
        self.assertEqual([item["product_id"] for item in first["items"]], ["p_riz", "p_huile"])
        self.assertEqual(first["items"][0]["purchase_price"], 3000)  # coût repris du produit pour la marge
        self.assertEqual(first["created_at"], datetime(2025, 3, 1, 9, 15, tzinfo=timezone.utc))
        second = result["sales"][1]
        self.assertEqual(second["payment_method"], "mobile_money")
        self.assertEqual(second["items"][0]["product_id"], "")
        self.assertEqual(result["unmatched_names"], ["Savon inconnu"])
        self.assertEqual(result["skipped_totals"], 1)  # la ligne TOTAL n'est ni importée ni signalée
        self.assertEqual(len(result["errors"]), 1)
        self.assertNotIn("public_receipt_token", first)

    def test_daily_totals_without_products(self):
        rows = [{"Jour": "05/01/2025", "Recette": "45 000"}, {"Jour": "06/01/2025", "Recette": "52 500"}]
        result = mig.prepare_sales(rows, {"date": "Jour", "total": "Recette"}, [], "owner", "store", unnamed_label="Ventes reprises")
        self.assertEqual([sale["total_amount"] for sale in result["sales"]], [45000, 52500])
        self.assertEqual(result["sales"][0]["items"][0]["product_name"], "Ventes reprises")

    def test_future_and_negative_lines_are_rejected(self):
        rows = [{"Date": "01/01/2099", "Montant": "100"}, {"Date": "01/01/2025", "Montant": "-50"}]
        result = mig.prepare_sales(rows, {"date": "Date", "total": "Montant"}, [], "o", "s")
        self.assertEqual(result["sales"], [])
        self.assertEqual(len(result["errors"]), 2)


class ProductPreparationTests(unittest.TestCase):
    def test_existing_and_duplicate_products_are_skipped(self):
        rows = [
            {"Nom": "Coca-Cola 33cl", "Prix": "500"},
            {"Nom": "Sucre", "Prix": "800", "Stock": "1 200"},
            {"Nom": "Sucre", "Prix": "800"},
            {"Nom": "TOTAL", "Prix": "1300"},
            {"Nom": "", "Prix": "100"},
        ]
        existing = [{"product_id": "p1", "name": "Coca Cola 33cl"}]
        result = mig.prepare_products(rows, {"name": "Nom", "selling_price": "Prix", "quantity": "Stock"}, existing)
        self.assertEqual(result["rows"], [{"name": "Sucre", "selling_price": 800, "quantity": 1200}])
        self.assertEqual(len(result["skipped"]), 2)
        self.assertEqual(len(result["errors"]), 1)


class FlowTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = FakeImportService(self.db)

    def tables(self):
        return [
            {"name": "Produits", "columns": ["Nom", "Prix de vente", "Stock", "Catégorie"],
             "rows": [{"Nom": "Riz 5kg", "Prix de vente": "3500", "Stock": "10", "Catégorie": "Épicerie"},
                      {"Nom": "Huile", "Prix de vente": "1200", "Stock": "5", "Catégorie": "Épicerie"}]},
            {"name": "Ventes", "columns": list(sale_rows()[0].keys()), "rows": sale_rows()},
        ]

    def test_analyze_import_reimport_and_undo(self):
        summary = run(mig.create_draft(self.db, "owner", "store", "owner", "boutique.xlsx", self.tables()))
        kinds = [table["kind"] for table in summary["tables"]]
        self.assertEqual(kinds, [mig.KIND_PRODUCTS, mig.KIND_SALES])
        self.assertEqual(summary["tables"][0]["products_ready"], 2)
        self.assertEqual(summary["tables"][1]["sales_ready"], 2)
        self.assertEqual(summary["tables"][1]["first_date"], "2025-03-01")

        draft = run(mig.get_draft(self.db, summary["draft_id"], "owner"))
        report = run(mig.run_import(self.db, draft, "owner", self.service))
        self.assertEqual(report["products_created"], 2)
        self.assertEqual(report["sales_created"], 2)
        self.assertEqual(report["revenue"], 8700)
        sales = run(self.db.sales.find({"user_id": "owner"}).to_list(None))
        self.assertTrue(all(sale["import_batch_id"] == report["batch_id"] for sale in sales))
        # Les ventes du ticket T1 sont rattachées aux produits importés juste avant.
        riz = run(self.db.products.find_one({"name": "Riz 5kg"}))
        self.assertIn(riz["product_id"], [item["product_id"] for sale in sales for item in sale["items"]])
        self.assertEqual(riz["quantity"], 10)  # le stock vient du fichier produits, pas des ventes

        # Même fichier une seconde fois : rien n'est créé en double.
        again = run(mig.create_draft(self.db, "owner", "store", "owner", "boutique.xlsx", self.tables()))
        self.assertEqual(again["tables"][0]["products_ready"], 0)
        self.assertEqual(again["tables"][1]["sales_ready"], 0)
        self.assertEqual(again["tables"][1]["already_imported"], 2)

        # Une vente faite en caisse avec l'huile importée la protège de l'annulation.
        huile = run(self.db.products.find_one({"name": "Huile"}))
        run(self.db.sales.insert_one({"sale_id": "pos1", "user_id": "owner", "items": [{"product_id": huile["product_id"]}]}))
        undo = run(mig.undo_batch(self.db, report["batch_id"], "owner"))
        self.assertEqual(undo, {"sales_removed": 2, "products_removed": 1, "products_kept": 1})
        self.assertIsNotNone(run(self.db.products.find_one({"name": "Huile"})))
        self.assertIsNone(run(self.db.products.find_one({"name": "Riz 5kg"})))
        self.assertEqual(run(self.db.stock_movements.count_documents({"product_id": riz["product_id"]})), 0)
        with self.assertRaisesRegex(ValueError, "déjà été annulé"):
            run(mig.undo_batch(self.db, report["batch_id"], "owner"))
        batches = run(mig.list_batches(self.db, "owner"))
        self.assertEqual(batches[0]["status"], "undone")
        self.assertFalse(batches[0]["can_undo"])

    def test_change_kind_and_mapping(self):
        tables = [{"name": "Feuil1", "columns": ["A", "B"], "rows": [{"A": "01/02/2025", "B": "1000"}]}]
        summary = run(mig.create_draft(self.db, "owner", "store", "owner", "f.csv", tables))
        self.assertEqual(summary["tables"][0]["kind"], mig.KIND_IGNORE)
        draft = run(mig.get_draft(self.db, summary["draft_id"], "owner"))
        table = run(mig.change_table_kind(self.db, draft, 0, mig.KIND_SALES))
        self.assertEqual(table["missing_fields"], ["date"])
        draft = run(mig.get_draft(self.db, summary["draft_id"], "owner"))
        table = run(mig.change_table_mapping(self.db, draft, 0, {"date": "A", "total": "B", "reference": "Z"}))
        self.assertEqual(table["mapping"], {"date": "A", "total": "B"})
        self.assertEqual(table["sales_ready"], 1)
        draft = run(mig.get_draft(self.db, summary["draft_id"], "owner"))
        self.assertEqual(draft["tables"][0]["kind"], mig.KIND_SALES)

    def test_import_refuses_a_table_without_required_column(self):
        tables = [{"name": "Feuil1", "columns": ["A"], "rows": [{"A": "x"}]}]
        summary = run(mig.create_draft(self.db, "owner", "store", "owner", "f.csv", tables))
        draft = run(mig.get_draft(self.db, summary["draft_id"], "owner"))
        run(mig.change_table_kind(self.db, draft, 0, mig.KIND_SALES))
        draft = run(mig.get_draft(self.db, summary["draft_id"], "owner"))
        with self.assertRaisesRegex(ValueError, "date"):
            run(mig.run_import(self.db, draft, "owner", self.service))

    def test_other_owner_cannot_read_the_draft(self):
        summary = run(mig.create_draft(self.db, "owner", "store", "owner", "f.csv", self.tables()))
        with self.assertRaises(LookupError):
            run(mig.get_draft(self.db, summary["draft_id"], "intrus"))


if __name__ == "__main__":
    unittest.main()
