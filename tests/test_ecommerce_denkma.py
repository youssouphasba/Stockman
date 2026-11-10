import asyncio
import json
import sys
import time
import unittest
import unittest.mock
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ecommerce_denkma import DenkmaApi, DenkmaError, EcommerceDenkmaService, SecretBox, denkma_phone, sign  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 8, 21, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.now


class FakeDenkma:
    """Denkma Pro simulé : mêmes réponses que l'API partenaire, sans réseau."""

    base_url = "https://api.denkma.test"

    def __init__(self):
        self.calls = []
        self.orders = {}
        self.floors = {"home_to_home": {"amount_xof": 1500, "fundable": True}, "home_to_relay": {"amount_xof": 1000, "fundable": True}}
        self.sessions = {}
        self.fail = {}
        self.payment_status = "funded"
        self.photo_ready = False

    def _guard(self, name):
        self.calls.append(name)
        if name in self.fail:
            raise self.fail[name]

    async def exchange(self, code, webhook_url):
        self._guard("exchange")
        self.webhook_url = webhook_url
        return {"api_key": "dk_live_cle_secrete_1234", "webhook_secret": "secret-evenements"}

    async def partner_signup(self, partner_key, body):
        self._guard("partner_signup")
        self.partner_key, self.signup_body = partner_key, body
        return {"api_key": "dk_live_cle_inscription_5678", "webhook_secret": "secret-inscription", "merchant_id": "mrc_1", "validation_status": "pending"}

    async def shop(self, key):
        self._guard("shop")
        return {"transport_open": True}

    async def floor(self, key, mode, weight_kg, category):
        self._guard(f"floor:{mode}")
        return dict(self.floors[mode])

    async def open_destination(self, key, mode, opener_origin):
        self._guard("open_destination")
        self.opener_origin = opener_origin
        self.sessions["mds_1"] = {"delivery_mode": mode, "confirmed": False}
        return {"session_id": "mds_1", "url": "https://api.denkma.test/pro/destination?s=mds_1#token=abc", "expires_at": "2026-11-08T21:30:00Z"}

    async def destination(self, key, session_id):
        self._guard("destination")
        session = self.sessions[session_id]
        return {"session_id": session_id, "confirmed": session["confirmed"], "delivery_mode": session["delivery_mode"], "relay_name": session.get("relay_name")}

    async def quote(self, key, session_id, mode, weight_kg, category):
        self._guard("quote")
        return {"amount_xof": 1750, "currency": "XOF", "fundable": self.sessions[session_id].get("fundable", True)}

    async def save_order(self, key, ref, body):
        self._guard("save_order")
        self.saved_body = body
        self.orders[ref] = {"order_id": "mord_1", "status": "ready_for_quote", "external_ref": ref}
        return dict(self.orders[ref])

    async def order_quote(self, key, ref):
        self._guard("order_quote")
        return {"quote_id": "mqt_1", "amount_xof": 1750, "expires_at": "2026-11-08T22:00:00Z"}

    async def payment_confirmed(self, key, ref):
        self._guard("payment_confirmed")
        self.orders[ref]["status"] = self.payment_status
        return {**self.orders[ref], "photo_ready": self.photo_ready}

    async def reserve(self, key, ref, quote_id):
        self._guard("reserve")
        self.orders[ref]["status"] = "funded"
        return {"order": dict(self.orders[ref])}

    async def photo(self, key, ref, content, content_type):
        self._guard("photo")
        self.photo_ready = True
        return {"photo_ready": True}

    async def prepared(self, key, ref):
        self._guard("prepared")
        self.orders[ref]["status"] = "prepared"
        return dict(self.orders[ref])

    async def dispatch(self, key, ref):
        self._guard("dispatch")
        self.orders[ref].update({"status": "dispatched", "tracking_code": "DK-12345", "parcel_status": "created"})
        return {**self.orders[ref], "collection_code": "123456"}

    async def order(self, key, ref):
        self._guard("order")
        return dict(self.orders[ref])

    async def cancel(self, key, ref):
        self._guard("cancel")
        self.orders[ref]["status"] = "cancelled"
        return dict(self.orders[ref])


class DenkmaServiceTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.api = FakeDenkma()
        self.clock = Clock()
        self.delivered = []

        async def on_delivered(order):
            self.delivered.append(order["order_id"])

        self.service = EcommerceDenkmaService(self.db, web_base_url="https://app.stockman.pro", api=self.api,
                                              box_factory=lambda: SecretBox("secret-de-test"), clock=self.clock, on_delivered=on_delivered)
        # Compte et commande techniques de test : données neutres, jamais affichées par l'application.
        run(self.db.business_accounts.insert_one({"account_id": "acc_a", "ecommerce_slug": "boutique-a"}))
        run(self.db.ecommerce_orders.insert_one({
            "order_id": "eord_1", "order_number": "WEB-1", "account_id": "acc_a", "status": "pending",
            "customer_name": "Client Test", "customer_phone": "77 000 00 00", "items": [{"product_id": "p1"}, {"product_id": "p2"}],
        }))

    def account(self):
        return self.db.business_accounts.docs[0]

    def order(self):
        return self.db.ecommerce_orders.docs[0]

    def connect(self):
        start = run(self.service.start_connection(self.account()))
        state = parse_qs(urlsplit(start["url"]).query)["state"][0]
        run(self.service.finish_connection("code-denkma-usage-unique-0001", state))
        return start

    def test_connection_seals_the_key_and_is_single_use(self):
        start = self.connect()
        query = parse_qs(urlsplit(start["url"]).query)
        self.assertTrue(start["url"].startswith("https://api.denkma.test/pro/?"))
        self.assertEqual((query["connect"], query["platform"], query["domain"]), (["1"], ["custom_api"], ["app.stockman.pro"]))
        self.assertEqual(query["return_url"], ["https://app.stockman.pro/api/public/ecommerce/denkma/connected"])
        link = self.account()["ecommerce_denkma"]
        self.assertNotIn("dk_live", json.dumps(link, default=str))
        self.assertEqual(link["key_hint"], "1234")
        self.assertTrue(self.api.webhook_url.endswith(f"/api/public/ecommerce/denkma/events/{link['hook_id']}"))
        self.assertEqual(SecretBox("secret-de-test").open(link["api_key"]), "dk_live_cle_secrete_1234")
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.finish_connection("code-denkma-usage-unique-0001", query["state"][0]))
        self.assertEqual(ctx.exception.status, 410)
        expired = run(self.service.start_connection(self.account()))
        self.clock.now += timedelta(minutes=11)
        with self.assertRaises(DenkmaError):
            run(self.service.finish_connection("code-denkma-usage-unique-0002", parse_qs(urlsplit(expired["url"]).query)["state"][0]))
        status = run(self.service.status(self.account()))
        self.assertEqual((status["connected"], status["transport_open"], status["weight_kg"], status["parcel_category"]), (True, True, 1.0, "small"))

    def test_checkout_offers_fundable_modes_and_checks_the_destination(self):
        self.assertEqual(run(self.service.delivery_options(self.account())), {"modes": []})
        self.connect()
        self.api.floors["home_to_relay"]["fundable"] = False
        options = run(self.service.delivery_options(self.account()))
        self.assertEqual(options["modes"], [{"mode": "home_to_home", "label": "À domicile", "from_amount": 1500}])
        embedded = run(self.service.open_destination(self.account(), "home_to_home", "https://app.stockman.pro"))
        self.assertTrue(embedded["embedded"])
        self.assertEqual(self.api.opener_origin, "https://app.stockman.pro")
        popup = run(self.service.open_destination(self.account(), "home_to_home", "https://www.boutique-test.example"))
        self.assertFalse(popup["embedded"])
        self.assertIsNone(self.api.opener_origin)
        self.assertEqual(run(self.service.destination_quote(self.account(), "mds_1")), {"confirmed": False})
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.checkout_delivery(self.account(), "mds_1", "77 000 00 00"))
        self.assertEqual(ctx.exception.code, "denkma_destination")
        self.api.sessions["mds_1"]["confirmed"] = True
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.checkout_delivery(self.account(), "mds_1", "12345"))
        self.assertEqual(ctx.exception.code, "denkma_phone")
        delivery = run(self.service.checkout_delivery(self.account(), "mds_1", "77 000 00 00"))
        self.assertEqual((delivery["provider"], delivery["mode"], delivery["fee"], delivery["status"]), ("denkma", "home_to_home", 1750.0, "pending_sync"))
        self.api.sessions["mds_1"]["fundable"] = False
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.destination_quote(self.account(), "mds_1"))
        self.assertEqual(ctx.exception.code, "denkma_unavailable")

    def prepare_order(self):
        self.connect()
        run(self.service.open_destination(self.account(), "home_to_home", None))
        self.api.sessions["mds_1"]["confirmed"] = True
        delivery = run(self.service.checkout_delivery(self.account(), "mds_1", "77 000 00 00"))
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_1"}, {"$set": {"delivery": delivery}}))
        return run(self.service.register_order(self.account(), self.order()))

    def test_the_order_is_registered_with_the_confirmed_destination(self):
        delivery = self.prepare_order()
        body = self.api.saved_body
        self.assertEqual((body["recipient_phone"], body["delivery_mode"], body["destination_session_id"], body["weight_kg"]), ("+221770000000", "home_to_home", "mds_1", 1.0))
        self.assertEqual(body["description"], "Commande Stockman WEB-1 - 2 article(s)")
        self.assertEqual((delivery["status"], delivery["quote_id"], delivery["denkma_order_id"]), ("registered", "mqt_1", "mord_1"))
        self.api.fail["save_order"] = DenkmaError(422, "denkma_refused", "La destination n’est pas confirmée.")
        run(self.db.ecommerce_orders.update_one({"order_id": "eord_1"}, {"$set": {"delivery": {**delivery, "status": "pending_sync"}}}))
        failed = run(self.service.register_order(self.account(), self.order()))
        self.assertEqual((failed["status"], failed["error"]), ("sync_failed", "La destination n’est pas confirmée."))

    def test_one_tap_ships_after_payment_and_preparation_with_an_optional_photo(self):
        self.prepare_order()
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.ship(self.account(), self.order(), customer_paid=False, photo=b"img"))
        self.assertEqual(ctx.exception.code, "payment_required")
        delivery = run(self.service.ship(self.account(), self.order(), customer_paid=True, photo=b"img"))
        self.assertEqual((delivery["denkma_status"], delivery["tracking_code"], delivery["error"]), ("dispatched", "DK-12345", None))
        self.assertEqual(self.api.calls[-4:], ["payment_confirmed", "photo", "prepared", "dispatch"])

    def test_validating_reserves_and_ready_requests_the_pickup(self):
        self.prepare_order()
        self.api.photo_ready = True
        reserved = run(self.service.validated(self.account(), self.order()))
        self.assertEqual((reserved["denkma_status"], reserved["error"], reserved.get("waiting_for")), ("funded", None, None))
        self.assertNotIn("prepared", self.api.calls)
        self.assertNotIn("dispatch", self.api.calls)
        shipped = run(self.service.validated(self.account(), self.order(), ready=True))
        self.assertEqual((shipped["denkma_status"], shipped["tracking_code"]), ("dispatched", "DK-12345"))
        self.assertEqual(self.api.calls[-3:], ["payment_confirmed", "prepared", "dispatch"])
        calls = len(self.api.calls)
        run(self.service.validated(self.account(), self.order(), ready=True))
        self.assertEqual(len(self.api.calls), calls)

    def test_ready_alone_requests_the_pickup_and_shows_the_code_for_the_courier(self):
        self.prepare_order()
        shipped = run(self.service.validated(self.account(), self.order(), ready=True))
        self.assertEqual((shipped["denkma_status"], shipped.get("waiting_for"), shipped["error"]), ("dispatched", None, None))
        self.assertNotIn("photo", self.api.calls)
        self.assertEqual(self.api.calls[-3:], ["payment_confirmed", "prepared", "dispatch"])
        self.assertEqual(shipped["collection_code"], "123456")
        self.assertEqual(self.order()["delivery"]["collection_code"], "123456")

    def test_the_code_for_the_courier_leaves_the_order_once_the_parcel_is_collected(self):
        merge = self.service._merge
        waiting = merge({}, {"status": "dispatched", "parcel_status": "created", "collection_code": "123456"})
        self.assertEqual(waiting["collection_code"], "123456")
        # Un événement de suivi ne porte pas le code : tant que le colis attend, le code reste affiché.
        self.assertEqual(merge(waiting, {"parcel_status": "created"})["collection_code"], "123456")
        self.assertIsNone(merge(waiting, {"parcel_status": "out_for_delivery"})["collection_code"])
        self.assertIsNone(merge(waiting, {"status": "dispatched", "parcel_status": "created", "collection_code": None})["collection_code"])

    def test_a_refused_validation_is_shown_on_the_order_without_failing(self):
        self.prepare_order()
        self.api.payment_status = "awaiting_funding"
        delivery = run(self.service.validated(self.account(), self.order()))
        self.assertTrue(delivery["error"])
        self.assertEqual(self.order()["delivery"]["error"], delivery["error"])
        self.assertEqual(run(self.service.validated(self.account(), {**self.order(), "delivery": None})), {})

    def test_an_expired_price_is_requoted_and_missing_funds_are_explained(self):
        self.prepare_order()
        self.api.payment_status = "ready_for_quote"
        run(self.service.ship(self.account(), self.order(), customer_paid=True, photo=b"img"))
        self.assertIn("reserve", self.api.calls)
        run(self.db.ecommerce_orders.insert_one({**self.order(), "order_id": "eord_2", "delivery": {**self.order()["delivery"], "status": "registered"}}))
        self.api.orders["eord_2"] = {"order_id": "mord_2", "status": "ready_for_quote"}
        self.api.payment_status = "awaiting_funding"
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.ship(self.account(), self.db.ecommerce_orders.docs[-1], customer_paid=True, photo=b"img"))
        self.assertEqual((ctx.exception.status, ctx.exception.code), (402, "denkma_funds"))
        no_choice = {**self.order(), "delivery": None}
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.ship(self.account(), no_choice, customer_paid=True, photo=b"img"))
        self.assertEqual(ctx.exception.code, "denkma_not_chosen")

    def test_signed_events_update_the_order_once_and_report_the_delivery(self):
        self.prepare_order()
        hook = self.account()["ecommerce_denkma"]["hook_id"]
        raw = json.dumps({"id": "evt_1", "type": "parcel.delivered", "data": {"order_id": "mord_1", "external_ref": "eord_1", "status": "dispatched", "parcel_status": "delivered", "tracking_code": "DK-12345"}}).encode()
        stamp = int(time.time())
        header = f"t={stamp},v1={sign('secret-evenements', stamp, raw)}"
        self.assertEqual(run(self.service.handle_event(hook, header, raw)), {"handled": True})
        delivery = self.order()["delivery"]
        self.assertEqual((delivery["parcel_status"], delivery["tracking_code"], delivery["events"]), ("delivered", "DK-12345", ["evt_1"]))
        self.assertEqual(self.delivered, ["eord_1"])
        self.assertEqual(run(self.service.handle_event(hook, header, raw)), {"handled": True, "duplicate": True})
        self.assertEqual(self.delivered, ["eord_1"])
        for bad in (f"t={stamp},v1=00", f"t={stamp - 3600},v1={sign('secret-evenements', stamp - 3600, raw)}", ""):
            with self.assertRaises(DenkmaError) as ctx:
                run(self.service.handle_event(hook, bad, raw))
            self.assertEqual(ctx.exception.status, 401)
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.handle_event("inconnu", header, raw))
        self.assertEqual(ctx.exception.status, 404)

    def test_cancelling_releases_a_delivery_that_has_not_left(self):
        self.prepare_order()
        run(self.service.cancel_order(self.account(), self.order()))
        self.assertEqual(self.order()["delivery"]["denkma_status"], "cancelled")
        calls = len(self.api.calls)
        run(self.service.cancel_order(self.account(), self.order()))
        self.assertEqual(len(self.api.calls), calls)

    def event(self, event_id, created_at, **data):
        link = self.account()["ecommerce_denkma"]
        raw = json.dumps({"id": event_id, "type": "parcel.updated", "created_at": created_at, "data": {"external_ref": "eord_1", **data}}).encode()
        stamp = int(time.time())
        signature = f"t={stamp},v1={sign('secret-evenements', stamp, raw)}"
        return run(self.service.handle_event(link["hook_id"], signature, raw))

    def test_an_older_event_never_moves_the_tracking_backwards(self):
        self.prepare_order()
        self.assertEqual(self.event("evt_b", "2026-11-08T21:10:00+00:00", parcel_status="delivered"), {"handled": True})
        late = self.event("evt_a", "2026-11-08T21:05:00+00:00", parcel_status="created", collection_code="123456")
        self.assertEqual(late, {"handled": True, "stale": True})
        delivery = self.order()["delivery"]
        self.assertEqual((delivery["parcel_status"], delivery.get("collection_code")), ("delivered", None))
        self.assertEqual(delivery["events"], ["evt_b", "evt_a"])
        self.assertEqual(self.delivered, ["eord_1"])
        # Renvoyé par Denkma, l'ancien événement est reconnu : il ne compte toujours pas.
        self.assertEqual(self.event("evt_a", "2026-11-08T21:05:00+00:00", parcel_status="created"), {"handled": True, "duplicate": True})
        self.assertEqual(self.event("evt_c", "2026-11-08T21:10:00+00:00", parcel_status="delivered"), {"handled": True})

    def test_an_event_is_replayed_on_the_fresh_order_when_another_write_came_first(self):
        self.prepare_order()
        original = self.service._save_delivery
        raced = []

        async def save(order, delivery, *, expect=False):
            if expect is not False and not raced:
                # Une autre écriture passe juste avant celle-ci.
                raced.append(True)
                await original(order, {**self.order()["delivery"], "tracking_code": "DK-AUTRE"})
            return await original(order, delivery, expect=expect)

        self.service._save_delivery = save
        self.assertEqual(self.event("evt_a", "2026-11-08T21:05:00+00:00", parcel_status="in_transit"), {"handled": True})
        delivery = self.order()["delivery"]
        self.assertEqual((delivery["parcel_status"], delivery["tracking_code"], delivery["events"]), ("in_transit", "DK-AUTRE", ["evt_a"]))

    def test_cancelling_reaches_a_parcel_still_waiting_for_its_courier(self):
        self.prepare_order()
        run(self.service.validated(self.account(), self.order(), ready=True))
        self.assertEqual((self.order()["delivery"]["denkma_status"], self.order()["delivery"]["parcel_status"]), ("dispatched", "created"))
        delivery = run(self.service.cancel_order(self.account(), self.order()))
        self.assertEqual(self.api.calls[-1], "cancel")
        self.assertEqual((delivery["denkma_status"], delivery["cancel_state"]), ("cancelled", "done"))

    def test_a_parcel_already_collected_is_not_announced_as_cancelled(self):
        self.prepare_order()
        run(self.service.validated(self.account(), self.order(), ready=True))
        self.event("evt_a", "2026-11-08T21:05:00+00:00", parcel_status="out_for_delivery")
        calls = len(self.api.calls)
        delivery = run(self.service.cancel_order(self.account(), self.order()))
        self.assertEqual(len(self.api.calls), calls)
        self.assertEqual(delivery["cancel_state"], "refused")
        self.assertIn("déjà parti", delivery["cancel_error"])

    def test_a_cancellation_denkma_could_not_receive_is_retried_until_confirmed(self):
        self.prepare_order()
        self.api.fail["cancel"] = DenkmaError(503, "denkma_unreachable", "Denkma ne répond pas pour le moment.")
        delivery = run(self.service.cancel_order(self.account(), self.order()))
        self.assertEqual((delivery["cancel_state"], delivery.get("denkma_status")), ("pending", "ready_for_quote"))
        self.assertEqual(run(self.service.retry_cancellations()), 0)
        self.assertEqual(self.order()["delivery"]["cancel_state"], "pending")
        del self.api.fail["cancel"]
        self.assertEqual(run(self.service.retry_cancellations()), 1)
        self.assertEqual((self.order()["delivery"]["cancel_state"], self.order()["delivery"]["denkma_status"]), ("done", "cancelled"))
        calls = len(self.api.calls)
        self.assertEqual(run(self.service.retry_cancellations()), 0)
        self.assertEqual(len(self.api.calls), calls)

    def test_a_refused_cancellation_is_shown_and_not_retried(self):
        self.prepare_order()
        self.api.fail["cancel"] = DenkmaError(409, "denkma_refused", "Le colis ne peut plus être annulé.")
        delivery = run(self.service.cancel_order(self.account(), self.order()))
        self.assertEqual((delivery["cancel_state"], delivery["cancel_error"]), ("refused", "Le colis ne peut plus être annulé."))
        calls = len(self.api.calls)
        run(self.service.retry_cancellations())
        self.assertEqual(len(self.api.calls), calls)

    def test_shipping_before_payment_is_kept_as_the_merchants_decision(self):
        self.prepare_order()
        unpaid = run(self.service.validated(self.account(), self.order(), paid=False))
        self.assertEqual(unpaid["authorized_unpaid_at"], self.clock.now)
        self.assertEqual(self.order()["delivery"]["authorized_unpaid_at"], self.clock.now)
        paid = run(self.service.validated(self.account(), self.order(), ready=True, paid=True))
        self.assertIsNone(paid["authorized_unpaid_at"])

    def test_denkma_is_offered_to_senegalese_shops_only(self):
        for foreign in ({"country_code": "CI"}, {"country_code": "SN", "currency": "EUR"}, {"currency": "XAF"}):
            account = {"account_id": "acc_b", **foreign}
            for refused in (self.service.start_connection(account), self.service.signup(account, {"phone": "77 000 00 00"})):
                with self.assertRaises(DenkmaError) as ctx:
                    run(refused)
                self.assertEqual((ctx.exception.status, ctx.exception.code), (403, "denkma_country"))
            status = run(self.service.status(account))
            self.assertEqual((status["available"], status["connected"]), (False, False))
            self.assertIn("Sénégal", status["problem"])
        self.assertTrue(run(self.service.status({"account_id": "acc_c", "country_code": "sn", "currency": "XOF"}))["available"])
        # Une boutique déjà connectée qui n'est pas sénégalaise ne propose plus Denkma à ses clients.
        self.connect()
        run(self.service.open_destination(self.account(), "home_to_home", None))
        self.api.sessions["mds_1"]["confirmed"] = True
        moved = {**self.account(), "country_code": "CI"}
        self.assertFalse(self.service.offered(moved))
        self.assertTrue(self.service.offered(self.account()))
        self.assertEqual(run(self.service.delivery_options(moved)), {"modes": []})
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.checkout_delivery(moved, "mds_1", "77 000 00 00"))
        self.assertEqual(ctx.exception.code, "denkma_unavailable")

    def test_the_connection_key_can_be_separated_from_the_server_secret(self):
        service = EcommerceDenkmaService(self.db, web_base_url="https://app.stockman.pro", api=self.api)
        with unittest.mock.patch.dict("os.environ", {"JWT_SECRET": "secret-serveur", "DENKMA_ENCRYPTION_KEY": ""}):
            sealed = service._box_factory().seal("dk_live_x")
        with unittest.mock.patch.dict("os.environ", {"JWT_SECRET": "secret-serveur-change", "DENKMA_ENCRYPTION_KEY": "secret-serveur"}):
            self.assertEqual(service._box_factory().open(sealed), "dk_live_x")

    def test_settings_and_disconnection(self):
        with self.assertRaises(DenkmaError):
            run(self.service.update_settings(self.account(), weight_kg=2, parcel_category="small"))
        self.connect()
        run(self.service.update_settings(self.account(), weight_kg=2.5, parcel_category="large"))
        self.assertEqual(run(self.service.status(self.account(), live=False))["weight_kg"], 2.5)
        modes = run(self.service.delivery_options(self.account()))["modes"]
        self.assertEqual([mode["mode"] for mode in modes], ["home_to_home"])
        with self.assertRaises(DenkmaError):
            run(self.service.update_settings(self.account(), weight_kg=0, parcel_category="small"))
        run(self.service.disconnect(self.account()))
        self.assertFalse(run(self.service.status(self.account()))["connected"])


class DenkmaSignupTests(DenkmaServiceTests):
    DETAILS = {"subtype": "merchant", "business_name": "Boutique A", "owner_name": "Responsable A", "phone": "77 000 00 00",
               "phone_proof": "jeton-firebase-de-test-0000", "pin": "4821", "accepted_legal": True,
               "pickup_location": {"label": "Repère de test", "city": "Dakar", "district": None,
                                   "geopin": {"lat": 14.7, "lng": -17.45, "accuracy": 12.0, "source": "gps"}}}

    def setUp(self):
        super().setUp()
        self.env = unittest.mock.patch.dict("os.environ", {"DENKMA_PARTNER_KEY": "cle-plateforme-de-test"})
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_signup_creates_the_account_and_connects_the_shop(self):
        self.assertTrue(run(self.service.status(self.account()))["signup_available"])
        run(self.service.signup(self.account(), dict(self.DETAILS)))
        self.assertEqual(self.api.partner_key, "cle-plateforme-de-test")
        body = self.api.signup_body
        self.assertEqual((body["phone"], body["partner_account_ref"], body["pin"]), ("+221770000000", "acc_a", "4821"))
        link = self.account()["ecommerce_denkma"]
        self.assertEqual((link["origin"], link["key_hint"]), ("signup", "5678"))
        self.assertTrue(body["webhook_url"].endswith(f"/api/public/ecommerce/denkma/events/{link['hook_id']}"))
        self.assertNotIn("dk_live", json.dumps(link, default=str))
        self.assertEqual(SecretBox("secret-de-test").open(link["webhook_secret"]), "secret-inscription")
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.signup(self.account(), dict(self.DETAILS)))
        self.assertEqual(ctx.exception.code, "denkma_already_connected")

    def test_pending_validation_is_explained(self):
        run(self.service.signup(self.account(), dict(self.DETAILS)))
        self.api.fail["shop"] = DenkmaError(403, "denkma_forbidden", "Les intégrations ne sont pas ouvertes pour ce commerce.")
        status = run(self.service.status(self.account()))
        self.assertTrue(status["connected"])
        self.assertTrue(status["validation_pending"])
        self.assertIn("dès la validation", status["problem"])
        # Les clients écrivent leur adresse tant que Denkma n'a pas validé le commerce.
        self.api.fail.update({"floor:home_to_home": self.api.fail["shop"], "floor:home_to_relay": self.api.fail["shop"]})
        self.assertEqual(run(self.service.delivery_options(self.account())), {"modes": []})

    def test_signup_refusals(self):
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.signup(self.account(), {**self.DETAILS, "phone": "+1 555 000 0000"}))
        self.assertEqual(ctx.exception.code, "denkma_phone")
        self.api.fail["partner_signup"] = DenkmaError(401, "denkma_disconnected", "Clé refusée.")
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.signup(self.account(), dict(self.DETAILS)))
        self.assertEqual((ctx.exception.status, ctx.exception.code), (503, "denkma_signup_unavailable"))
        self.api.fail["partner_signup"] = DenkmaError(409, "denkma_refused", "Ce numéro a déjà un compte Denkma.")
        with self.assertRaises(DenkmaError) as ctx:
            run(self.service.signup(self.account(), dict(self.DETAILS)))
        self.assertEqual(ctx.exception.message, "Ce numéro a déjà un compte Denkma.")
        self.assertNotIn("ecommerce_denkma", self.account())
        self.env.stop()
        with unittest.mock.patch.dict("os.environ", {"DENKMA_PARTNER_KEY": ""}):
            self.assertFalse(run(self.service.status(self.account()))["signup_available"])
            with self.assertRaises(DenkmaError) as ctx:
                run(self.service.signup(self.account(), dict(self.DETAILS)))
            self.assertEqual(ctx.exception.code, "denkma_signup_unavailable")
        self.env.start()


class PhoneTests(unittest.TestCase):
    def test_numbers_follow_denkma_rules(self):
        for value in ("77 000 00 00", "+221 77 000 00 00", "00221770000000", "221770000000"):
            self.assertEqual(denkma_phone(value), "+221770000000", value)
        self.assertEqual(denkma_phone("06 12 34 56 78"), "+33612345678")
        for value in ("", None, "12345", "+1 555 000 0000", "88 000 00 00"):
            self.assertIsNone(denkma_phone(value), value)


class FakeResponse:
    def __init__(self, status_code, data):
        self.status_code = status_code
        self._data = data
        self.content = b"x"

    def json(self):
        return self._data


class FakeClient:
    def __init__(self, responses, sent):
        self.responses = responses
        self.sent = sent

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def request(self, method, path, json=None, files=None, params=None, headers=None):
        self.sent.append((method, path, json, params, headers))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class DenkmaApiTests(unittest.TestCase):
    def api(self, responses, sent):
        return DenkmaApi("https://api.denkma.test", client_factory=lambda **kwargs: FakeClient(responses, sent))

    def test_requests_and_refusals_are_translated(self):
        sent = []
        api = self.api([FakeResponse(200, {"amount_xof": 1500, "fundable": True})], sent)
        self.assertEqual(run(api.floor("dk_live_x", "home_to_home", 1.0, "small"))["amount_xof"], 1500)
        method, path, body, params, headers = sent[0]
        self.assertEqual((method, path, headers), ("POST", "/api/integrations/v1/quotes/from", {"Authorization": "Bearer dk_live_x"}))
        cases = [
            (FakeResponse(401, {"detail": "Clé d’intégration invalide."}), 401, "denkma_disconnected"),
            (FakeResponse(402, {"detail": "Solde transport insuffisant."}), 402, "denkma_funds"),
            (FakeResponse(422, {"detail": [{"msg": "Value error, Numéro de destinataire invalide."}]}), 422, "denkma_refused"),
            (FakeResponse(500, {}), 502, "denkma_error"),
            (ConnectionError("hors ligne"), 503, "denkma_unreachable"),
        ]
        for response, status, code in cases:
            with self.assertRaises(DenkmaError) as ctx:
                run(self.api([response], sent).order("dk_live_x", "eord_1"))
            self.assertEqual((ctx.exception.status, ctx.exception.code), (status, code))
        with self.assertRaises(DenkmaError) as ctx:
            run(self.api([FakeResponse(422, {"detail": [{"msg": "Value error, Numéro de destinataire invalide."}]})], sent).order("k", "e"))
        self.assertEqual(ctx.exception.message, "Numéro de destinataire invalide.")
        self.assertEqual(sent[-1][3], {"shipment": 1})

    def test_partner_signup_uses_the_platform_key(self):
        sent = []
        api = self.api([FakeResponse(200, {"api_key": "k", "webhook_secret": "s"})], sent)
        run(api.partner_signup("cle-plateforme", {"phone": "+221770000000"}))
        method, path, body, params, headers = sent[0]
        self.assertEqual((method, path, headers), ("POST", "/api/partners/v1/merchants", {"Authorization": "Partner cle-plateforme"}))
        with self.assertRaises(DenkmaError) as ctx:
            run(self.api([FakeResponse(409, {"detail": {"code": "phone_in_use", "message": "Ce numéro a déjà un compte Denkma."}})], sent).partner_signup("c", {}))
        self.assertEqual(ctx.exception.message, "Ce numéro a déjà un compte Denkma.")


if __name__ == "__main__":
    unittest.main()
