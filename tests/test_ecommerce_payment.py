import asyncio
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import ecommerce_payment as payment  # noqa: E402
from ecommerce_payment import EcommercePaymentService, PaymentError  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


NOW = datetime(2026, 11, 9, 12, 0, tzinfo=timezone.utc)
# Comptes techniques de test : valeurs neutres, jamais affichées par l'application.
WAVE_ACCOUNT = {"ecommerce_wave_phone": "+221770000003", "ecommerce_wave_name": "Boutique Test"}


class SettingsTest(unittest.TestCase):
    def test_a_wallet_number_is_stored_in_international_format(self):
        self.assertEqual(payment.wallet_phone("77 000 00 03"), "+221770000003")
        self.assertEqual(payment.wallet_phone("+221 77 000 00 03"), "+221770000003")
        self.assertEqual(payment.wallet_phone("00221770000003"), "+221770000003")
        self.assertEqual(payment.wallet_phone("+225 07 00 00 00 03"), "+2250700000003")
        for wrong in ("", "12345", "33 000 00 03", "+221 33 000 00 03", "0700000003"):
            self.assertIsNone(payment.wallet_phone(wrong), wrong)

    def test_only_a_wave_https_link_is_accepted(self):
        self.assertEqual(payment.wave_link(" https://pay.wave.com/m/M_test "), "https://pay.wave.com/m/M_test")
        self.assertIsNone(payment.wave_link("  "))
        for wrong in ("http://pay.wave.com/m/M_test", "https://wave.com.example.org/pay", "https://notwave.com/x", "https://user@pay.wave.com/x", "javascript:alert(1)"):
            with self.assertRaises(PaymentError, msg=wrong):
                payment.wave_link(wrong)

    def test_settings_change_only_the_fields_sent(self):
        self.assertEqual(payment.settings_updates({"wave_phone": "770000003"}), {"ecommerce_wave_phone": "+221770000003"})
        self.assertEqual(payment.settings_updates({"wave_phone": "", "wave_name": " ", "wave_link": ""}),
                         {"ecommerce_wave_phone": None, "ecommerce_wave_name": None, "ecommerce_wave_link": None})
        self.assertEqual(payment.settings_updates({"orange_money_phone": "78 000 00 05", "orange_money_name": " Boutique Test "}),
                         {"ecommerce_orange_money_phone": "+221780000005", "ecommerce_orange_money_name": "Boutique Test"})
        self.assertEqual(payment.settings_updates({"pay_on_delivery": False}), {"ecommerce_pay_on_delivery": False})
        self.assertEqual(payment.settings_updates({}), {})
        self.assertEqual(payment.settings_updates({field: None for field in payment.SETTINGS_FIELDS}), {})
        for field, label in (("wave_phone", "Wave"), ("orange_money_phone", "Orange Money")):
            with self.assertRaises(PaymentError) as refused:
                payment.settings_updates({field: "abc"})
            self.assertEqual(refused.exception.code, "wallet_phone_invalid")
            self.assertIn(label, refused.exception.message)

    def test_a_shop_without_mobile_account_offers_no_choice(self):
        self.assertIsNone(payment.public_options({}))
        self.assertEqual(payment.choose_method({}, None), "other")
        self.assertEqual(payment.choose_method({}, "wave"), "other")
        self.assertTrue(payment.settings_view({})["pay_on_delivery"])

    def test_a_shop_with_wave_offers_wave_and_delivery_unless_refused(self):
        options = payment.public_options(WAVE_ACCOUNT)
        self.assertEqual(options, {"wallets": [{"id": "wave", "label": "Wave", "phone": "+221770000003", "name": "Boutique Test", "link": None}], "on_delivery": True})
        self.assertEqual(payment.choose_method(WAVE_ACCOUNT, "wave"), "wave")
        self.assertEqual(payment.choose_method(WAVE_ACCOUNT, "on_delivery"), "on_delivery")
        # Une page restée ouverte avant le réglage n'envoie aucun choix : la commande reste possible.
        self.assertEqual(payment.choose_method(WAVE_ACCOUNT, None), "on_delivery")
        wave_only = {**WAVE_ACCOUNT, "ecommerce_pay_on_delivery": False}
        self.assertFalse(payment.public_options(wave_only)["on_delivery"])
        self.assertEqual(payment.choose_method(wave_only, None), "wave")
        for unavailable in ("on_delivery", "orange_money"):
            with self.assertRaises(PaymentError) as refused:
                payment.choose_method(wave_only, unavailable)
            self.assertEqual(refused.exception.status, 422)

    def test_a_denkma_delivery_is_paid_before_it_leaves(self):
        # Le livreur Denkma n'encaisse jamais pour la boutique.
        options = payment.public_options(WAVE_ACCOUNT, denkma_delivery=True)
        self.assertEqual(([wallet["id"] for wallet in options["wallets"]], options["on_delivery"]), (["wave"], False))
        self.assertEqual(payment.choose_method(WAVE_ACCOUNT, None, denkma_delivery=True), "wave")
        self.assertEqual(payment.choose_method(WAVE_ACCOUNT, "wave", denkma_delivery=True), "wave")
        with self.assertRaises(PaymentError) as refused:
            payment.choose_method(WAVE_ACCOUNT, "on_delivery", denkma_delivery=True)
        self.assertEqual(refused.exception.code, "payment_method_unavailable")
        self.assertIn("avant son départ", refused.exception.message)
        self.assertEqual(payment.choose_method({}, None, denkma_delivery=True), "other")

    def test_wave_and_orange_money_are_offered_to_senegalese_shops_only(self):
        for foreign in ({"country_code": "CI"}, {"country_code": "FR", "currency": "EUR"}, {"currency": "XAF"}):
            account = {**WAVE_ACCOUNT, **foreign}
            self.assertIsNone(payment.public_options(account))
            self.assertEqual(payment.choose_method(account, "wave"), "other")
            self.assertFalse(payment.settings_view(account)["mobile_money_available"])
            with self.assertRaises(PaymentError) as refused:
                payment.settings_updates({"wave_phone": "+2250700000000"}, account)
            self.assertEqual(refused.exception.code, "mobile_money_unavailable")
            # Les autres réglages, et l'effacement d'un numéro, restent possibles.
            self.assertEqual(payment.settings_updates({"wave_phone": "", "pay_on_delivery": False}, account),
                             {"ecommerce_wave_phone": None, "ecommerce_pay_on_delivery": False})
        self.assertTrue(payment.settings_view({"country_code": "SN", "currency": "XOF"})["mobile_money_available"])
        self.assertTrue(payment.settings_view({})["mobile_money_available"])

    def test_the_sale_keeps_the_payment_method_of_the_order(self):
        for method, expected in (("wave", "mobile_money"), ("orange_money", "mobile_money"), ("on_delivery", "cash"), ("other", "cash")):
            self.assertEqual(payment.sale_payment_method({"payment": {"method": method}}), expected)
        self.assertEqual(payment.sale_payment_method({}), "cash")
        self.assertEqual(payment.sale_payment_method({"payment_method": "credit"}), "credit")

    def test_only_a_confirmed_payment_counts_as_paid(self):
        self.assertTrue(payment.settled({}))
        self.assertTrue(payment.settled({"payment": {"status": "paid"}}))
        for status in ("awaiting", "declared"):
            self.assertFalse(payment.settled({"payment": {"status": status}}))

    def test_a_shop_can_offer_wave_and_orange_money_together(self):
        both = {**WAVE_ACCOUNT, "ecommerce_wave_link": "https://pay.wave.com/m/M_test", "ecommerce_orange_money_phone": "+221780000005", "ecommerce_pay_on_delivery": False}
        options = payment.public_options(both)
        self.assertEqual([wallet["id"] for wallet in options["wallets"]], ["wave", "orange_money"])
        self.assertEqual(options["wallets"][0]["link"], "https://pay.wave.com/m/M_test")
        self.assertEqual(options["wallets"][1], {"id": "orange_money", "label": "Orange Money", "phone": "+221780000005", "name": None, "link": None})
        self.assertEqual(payment.choose_method(both, "orange_money"), "orange_money")
        self.assertEqual(payment.choose_method(both, None), "wave")
        self.assertEqual(payment.wallet_account(both, "orange_money")["phone"], "+221780000005")
        self.assertIsNone(payment.wallet_account(both, "on_delivery"))
        self.assertEqual(payment.wallet_label("orange_money"), "Orange Money")
        self.assertIsNone(payment.wallet_label("on_delivery"))
        orange_only = {"ecommerce_orange_money_phone": "+221780000005"}
        with self.assertRaises(PaymentError):
            payment.choose_method(orange_only, "wave")
        self.assertEqual(payment.settings_view(both)["orange_money_phone"], "+221780000005")


class PaymentFlowTest(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = EcommercePaymentService(self.db, clock=lambda: NOW)
        created = payment.new_payment("wave")
        self.token = created["token"]
        self.order = {"order_id": "eord_test", "order_number": "WEB-TEST", "site_slug": "boutique-test", "user_id": "user_test",
                      "status": "pending", "total_amount": 10000, "delivery_fee": 1500, "amount_due": 11500, "currency": "XOF",
                      "payment": created["payment"]}
        run(self.db.ecommerce_orders.insert_one(dict(self.order)))

    def stored(self):
        return run(self.db.ecommerce_orders.find_one({"order_id": "eord_test"}, {"_id": 0}))

    def test_the_customer_follows_the_payment_with_the_token_only(self):
        state = run(self.service.state("boutique-test", "eord_test", self.token))
        self.assertEqual(state, {"order_number": "WEB-TEST", "order_status": "pending", "amount_due": 11500, "currency": "XOF", "method": "wave", "status": "awaiting"})
        for slug, order_id, token in (("boutique-test", "eord_test", "wrong"), ("autre", "eord_test", self.token), ("boutique-test", "eord_x", self.token), ("boutique-test", "eord_test", "")):
            with self.assertRaises(PaymentError) as refused:
                run(self.service.state(slug, order_id, token))
            self.assertEqual(refused.exception.status, 404)

    def test_the_token_never_reaches_the_merchant(self):
        self.assertNotIn(self.token, str(self.stored()))
        view = payment.merchant_view(self.stored())
        self.assertNotIn("token_hash", view["payment"])
        self.assertEqual(view["payment"], {"method": "wave", "status": "awaiting"})
        self.assertEqual(payment.merchant_view({"order_id": "old"}), {"order_id": "old"})

    def test_declaring_twice_alerts_the_merchant_once(self):
        first = run(self.service.declare("boutique-test", "eord_test", self.token))
        self.assertTrue(first["changed"])
        self.assertEqual(first["state"]["status"], "declared")
        self.assertEqual(self.stored()["payment"]["declared_at"], NOW)
        second = run(self.service.declare("boutique-test", "eord_test", self.token))
        self.assertFalse(second["changed"])
        self.assertEqual(second["state"]["status"], "declared")

    def test_a_cancelled_order_refuses_a_payment(self):
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_test"}, {"$set": {"status": "cancelled"}}))
        with self.assertRaises(PaymentError) as refused:
            run(self.service.declare("boutique-test", "eord_test", self.token))
        self.assertEqual(refused.exception.status, 409)
        with self.assertRaises(PaymentError):
            run(self.service.mark(self.stored(), paid=True, actor_id="user_test"))
        self.assertEqual(self.stored()["payment"]["status"], "awaiting")

    def test_the_merchant_confirms_then_can_correct_a_mistake(self):
        run(self.service.declare("boutique-test", "eord_test", self.token))
        paid = run(self.service.mark(self.stored(), paid=True, actor_id="user_test"))
        self.assertTrue(paid["changed"])
        self.assertEqual(paid["order"]["payment"]["status"], "paid")
        self.assertEqual(paid["order"]["payment"]["paid_by"], "user_test")
        self.assertEqual(paid["order"]["payment"]["confirmed_by"], "merchant")
        again = run(self.service.mark(self.stored(), paid=True, actor_id="user_test"))
        self.assertFalse(again["changed"])
        # Le client voit la confirmation sur sa page.
        self.assertEqual(run(self.service.state("boutique-test", "eord_test", self.token))["status"], "paid")
        undone = run(self.service.mark(self.stored(), paid=False, actor_id="user_test"))
        self.assertTrue(undone["changed"])
        self.assertEqual(undone["order"]["payment"]["status"], "declared")
        self.assertNotIn("paid_at", undone["order"]["payment"])

    def test_a_stale_screen_cannot_confirm_twice(self):
        stale = self.stored()
        run(self.service.mark(stale, paid=True, actor_id="user_test"))
        result = run(self.service.mark(stale, paid=True, actor_id="user_other"))
        self.assertFalse(result["changed"])
        self.assertEqual(result["order"]["payment"]["paid_by"], "user_test")

    def test_an_order_without_payment_details_can_be_marked_paid(self):
        run(self.db.ecommerce_orders.insert_one({"order_id": "eord_old", "user_id": "user_test", "status": "confirmed", "total_amount": 5000}))
        old = run(self.db.ecommerce_orders.find_one({"order_id": "eord_old"}, {"_id": 0}))
        paid = run(self.service.mark(old, paid=True, actor_id="user_test"))
        self.assertEqual(paid["order"]["payment"]["method"], "other")
        self.assertEqual(paid["order"]["payment"]["status"], "paid")
        self.assertEqual(payment.public_state(old)["amount_due"], 5000)

    def test_a_delivered_order_keeps_its_payment(self):
        run(self.service.mark(self.stored(), paid=True, actor_id="user_test"))
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_test"}, {"$set": {"status": "delivered"}}))
        with self.assertRaises(PaymentError):
            run(self.service.mark(self.stored(), paid=False, actor_id="user_test"))
        self.assertEqual(self.stored()["payment"]["status"], "paid")


if __name__ == "__main__":
    unittest.main()
