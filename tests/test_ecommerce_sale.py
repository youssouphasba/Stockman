import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import ecommerce_sale  # noqa: E402
from ecommerce_sale import SaleError  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


class SaleConversionTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.now = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)
        self.sales = []
        self.fail_sale = False
        # Produits et commande techniques de test : données neutres, jamais affichées par l'application.
        for product_id, quantity in (("p1", 5.0), ("p2", 1.0)):
            run(self.db.products.insert_one({"product_id": product_id, "user_id": "u1", "store_id": "s1", "name": f"Produit {product_id}", "quantity": quantity}))
        run(self.db.ecommerce_orders.insert_one({
            "order_id": "eord_1", "user_id": "u1", "store_id": "s1", "status": "ready",
            "items": [{"product_id": "p1", "quantity": 2}, {"product_id": "p2", "quantity": 1}, {"product_id": "p1", "quantity": 1}],
        }))

    def order(self):
        return dict(self.db.ecommerce_orders.docs[0])

    def stock(self):
        return {doc["product_id"]: doc["quantity"] for doc in self.db.products.docs}

    async def record_movement(self, product, quantity, before, after):
        await self.db.stock_movements.insert_one({"source_type": "ecommerce_order", "source_id": "eord_1", "product_id": product["product_id"], "quantity": quantity, "previous_quantity": before, "new_quantity": after})

    async def record_sale(self, sale_id, order, lines):
        if self.fail_sale:
            raise RuntimeError("interruption")
        self.sales.append((sale_id, [(line["product"]["product_id"], line["quantity"]) for line in lines]))
        await self.db.sales.insert_one({"sale_id": sale_id})

    def convert(self, order=None):
        return run(ecommerce_sale.convert(self.db, order or self.order(), owner_id="u1", store_id="s1",
                                          record_sale=self.record_sale, record_movement=self.record_movement, clock=lambda: self.now))

    def test_a_delivered_order_becomes_one_sale_and_leaves_the_stock_once(self):
        stale = self.order()
        done = self.convert()
        self.assertEqual((done["status"], done["sale_id"], done.get("sale_claim")), ("delivered", self.sales[0][0], None))
        self.assertEqual(self.stock(), {"p1": 2.0, "p2": 0.0})
        self.assertEqual(self.sales[0][1], [("p1", 2.0), ("p2", 1.0), ("p1", 1.0)])
        # Le même produit sur deux lignes sort en un seul mouvement.
        self.assertEqual([(m["product_id"], m["quantity"], m["new_quantity"]) for m in self.db.stock_movements.docs], [("p1", 3.0, 2.0), ("p2", 1.0, 0.0)])
        # Une seconde demande, même partie d'une ancienne lecture de la commande, ne vend rien de plus.
        self.assertEqual(self.convert(stale)["sale_id"], done["sale_id"])
        self.assertEqual(self.convert()["sale_id"], done["sale_id"])
        self.assertEqual((len(self.sales), self.stock()), (1, {"p1": 2.0, "p2": 0.0}))

    def test_a_missing_article_gives_back_the_stock_already_taken(self):
        run(self.db.products.update_one({"product_id": "p2"}, {"$set": {"quantity": 0.0}}))
        with self.assertRaises(SaleError) as refused:
            self.convert()
        self.assertEqual((refused.exception.status, refused.exception.message), (400, "Stock insuffisant pour Produit p2"))
        self.assertEqual(self.stock(), {"p1": 5.0, "p2": 0.0})
        self.assertEqual((self.db.stock_movements.docs, self.sales), ([], []))
        order = self.order()
        self.assertEqual((order["status"], order.get("sale_id"), order.get("sale_claim")), ("ready", None, None))
        # Le stock revenu, la commande se termine normalement.
        run(self.db.products.update_one({"product_id": "p2"}, {"$set": {"quantity": 1.0}}))
        self.assertEqual(self.convert()["status"], "delivered")
        self.assertEqual(self.stock(), {"p1": 2.0, "p2": 0.0})

    def test_a_second_request_waits_while_the_first_one_is_working(self):
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_1"}, {"$set": {"sale_claim": {"sale_id": "sale_en_cours", "at": self.now - timedelta(minutes=1)}}}))
        with self.assertRaises(SaleError) as busy:
            self.convert()
        self.assertEqual(busy.exception.status, 409)
        self.assertEqual((self.stock(), self.sales), ({"p1": 5.0, "p2": 1.0}, []))

    def test_an_interrupted_conversion_resumes_without_selling_twice(self):
        self.fail_sale = True
        with self.assertRaises(RuntimeError):
            self.convert()
        # Stock sorti, vente non écrite : la commande reste réservée, rien n'est défait à l'aveugle.
        claimed = self.order()
        self.assertEqual((self.stock(), claimed["status"], bool(claimed["sale_claim"]["sale_id"])), ({"p1": 2.0, "p2": 0.0}, "ready", True))
        self.fail_sale = False
        with self.assertRaises(SaleError):
            self.convert()
        self.now += timedelta(minutes=11)
        done = self.convert()
        self.assertEqual((done["status"], done["sale_id"]), ("delivered", claimed["sale_claim"]["sale_id"]))
        self.assertEqual((self.stock(), len(self.sales), len(self.db.stock_movements.docs)), ({"p1": 2.0, "p2": 0.0}, 1, 2))

    def test_a_closed_or_empty_order_sells_nothing(self):
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_1"}, {"$set": {"status": "cancelled"}}))
        with self.assertRaises(SaleError) as closed:
            self.convert()
        self.assertEqual(closed.exception.status, 400)
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_1"}, {"$set": {"status": "ready", "items": [{"product_id": "p1", "quantity": 0}]}}))
        with self.assertRaises(SaleError):
            self.convert()
        self.assertEqual((self.stock(), self.order().get("sale_claim")), ({"p1": 5.0, "p2": 1.0}, None))

    async def record_return(self, product, quantity, before, after):
        await self.db.stock_movements.insert_one({"source_type": "ecommerce_release", "source_id": "eord_1", "product_id": product["product_id"], "quantity": quantity, "previous_quantity": before, "new_quantity": after})

    def reserve(self):
        return run(ecommerce_sale.reserve(self.db, self.order(), owner_id="u1", store_id="s1", record_movement=self.record_movement, clock=lambda: self.now))

    def release(self):
        return run(ecommerce_sale.release(self.db, self.order(), owner_id="u1", store_id="s1", record_return=self.record_return, clock=lambda: self.now))

    def test_a_paid_order_reserves_its_stock_and_the_delivery_does_not_take_it_twice(self):
        self.assertTrue(self.reserve())
        self.assertEqual(self.stock(), {"p1": 2.0, "p2": 0.0})
        self.assertEqual((self.order().get("stock_reserved_at"), self.order().get("sale_claim")), (self.now, None))
        done = self.convert()
        self.assertEqual(done["status"], "delivered")
        self.assertEqual((self.stock(), len(self.db.stock_movements.docs), len(self.sales)), ({"p1": 2.0, "p2": 0.0}, 2, 1))

    def test_a_reservation_that_lacks_stock_reserves_nothing(self):
        run(self.db.products.update_one({"product_id": "p2"}, {"$set": {"quantity": 0.0}}))
        with self.assertRaises(SaleError) as refused:
            self.reserve()
        self.assertEqual(refused.exception.message, "Stock insuffisant pour Produit p2")
        self.assertEqual((self.stock(), self.db.stock_movements.docs), ({"p1": 5.0, "p2": 0.0}, []))
        self.assertEqual((self.order().get("stock_reserved_at"), self.order().get("sale_claim")), (None, None))

    def test_a_cancelled_reservation_gives_the_stock_back_once_and_can_be_taken_again(self):
        self.reserve()
        self.assertEqual(self.release(), 2)
        self.assertEqual(self.release(), 0)
        self.assertEqual(self.stock(), {"p1": 5.0, "p2": 1.0})
        self.assertIsNone(self.order().get("stock_reserved_at"))
        released = [doc for doc in self.db.stock_movements.docs if doc["source_type"] == "ecommerce_order"]
        self.assertTrue(all(doc["released_at"] == self.now for doc in released))
        # Paiement confirmé de nouveau, puis livraison : le stock sort une seule fois de plus.
        self.reserve()
        self.convert()
        self.assertEqual(self.stock(), {"p1": 2.0, "p2": 0.0})

    def test_a_delivered_order_keeps_its_stock_out(self):
        self.convert()
        self.assertEqual(self.release(), 0)
        self.assertEqual(self.stock(), {"p1": 2.0, "p2": 0.0})


class SaleSourceBackfillTests(unittest.TestCase):
    def test_only_sales_linked_to_an_order_become_ecommerce(self):
        db = FakeDatabase()
        for sale_id in ("sale_web", "sale_caisse"):
            run(db.sales.insert_one({"sale_id": sale_id, "user_id": "u1"}))
        run(db.ecommerce_orders.insert_one({"order_id": "eord_1", "user_id": "u1", "sale_id": "sale_web"}))
        run(db.ecommerce_orders.insert_one({"order_id": "eord_2", "user_id": "u1", "sale_id": None}))
        self.assertEqual(run(ecommerce_sale.backfill_sale_sources(db)), 1)
        self.assertEqual(run(ecommerce_sale.backfill_sale_sources(db)), 0)
        sales = {doc["sale_id"]: (doc.get("source"), doc.get("ecommerce_order_id")) for doc in db.sales.docs}
        self.assertEqual(sales, {"sale_web": ("ecommerce", "eord_1"), "sale_caisse": (None, None)})


if __name__ == "__main__":
    unittest.main()
