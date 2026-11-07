import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ecommerce_onboarding import LEASE_SECONDS, EcommerceOnboarding, can_offer_setup, has_existing_configuration  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 7, 9, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.now

    def advance(self, seconds):
        self.now += timedelta(seconds=seconds)


def account(account_id="acc_a", owner="owner_a", **fields):
    return {"account_id": account_id, "owner_user_id": owner, "ecommerce_slug": f"{account_id}-site", **fields}


def run(coro):
    return asyncio.run(coro)


class EligibilityTests(unittest.TestCase):
    def test_only_operational_admins_able_to_write_from_this_channel(self):
        self.assertTrue(can_offer_setup(is_org_admin=True, is_demo=False, can_write_data=True, web_read_only=False))
        self.assertFalse(can_offer_setup(is_org_admin=False, is_demo=False, can_write_data=True, web_read_only=False))
        self.assertFalse(can_offer_setup(is_org_admin=True, is_demo=True, can_write_data=True, web_read_only=False))
        self.assertFalse(can_offer_setup(is_org_admin=True, is_demo=False, can_write_data=False, web_read_only=False))
        # Starter et Pro restent en consultation sur le web : pas de proposition sur ce canal.
        self.assertFalse(can_offer_setup(is_org_admin=True, is_demo=False, can_write_data=True, web_read_only=True))

    def test_disabled_site_is_not_considered_unconfigured_when_settings_exist(self):
        self.assertFalse(has_existing_configuration(account(ecommerce_enabled=False)))
        self.assertTrue(has_existing_configuration(account(ecommerce_enabled=False, ecommerce_hero_title="")))
        self.assertTrue(has_existing_configuration(account(ecommerce_enabled=True)))
        # Champs posés automatiquement à la création du site : ils ne valent pas configuration.
        self.assertFalse(has_existing_configuration(account(ecommerce_default_store_id="store_1")))


class OnboardingStoreTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.clock = Clock()
        self.service = EcommerceOnboarding(self.db, clock=self.clock)

    def test_new_site_is_pending_and_later_is_remembered_for_every_device(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        self.assertEqual(run(self.service.status(acc, slug)), "pending")
        claim = run(self.service.claim(acc, slug))
        self.assertIsNotNone(claim["claim_id"])
        self.assertEqual(run(self.service.respond(acc["account_id"], slug, claim["claim_id"], "later")), "deferred")
        self.assertEqual(run(self.service.status(acc, slug)), "deferred")
        other_device = run(self.service.claim(acc, slug))
        self.assertIsNone(other_device["claim_id"])
        self.assertEqual(other_device["state"], "deferred")

    def test_configure_records_started_without_enabling_the_site(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        claim = run(self.service.claim(acc, slug))
        self.assertEqual(run(self.service.respond(acc["account_id"], slug, claim["claim_id"], "configure")), "started")
        self.assertNotIn("ecommerce_enabled", self.db.ecommerce_site_onboarding.docs[0])
        self.assertEqual(acc.get("ecommerce_enabled"), None)

    def test_two_devices_never_show_the_proposal_simultaneously(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        first = run(self.service.claim(acc, slug))
        second = run(self.service.claim(acc, slug))
        self.assertIsNotNone(first["claim_id"])
        self.assertIsNone(second["claim_id"])
        self.assertEqual(second["state"], "pending")
        self.assertIsNone(run(self.service.respond(acc["account_id"], slug, "x" * 43, "later")))
        # Le premier appareil renouvelle sa réservation.
        self.assertEqual(run(self.service.claim(acc, slug, first["claim_id"]))["claim_id"], first["claim_id"])

    def test_leaving_the_screen_releases_the_lease_without_counting_as_refusal(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        first = run(self.service.claim(acc, slug))
        run(self.service.release(acc["account_id"], slug, first["claim_id"]))
        self.assertEqual(run(self.service.status(acc, slug)), "pending")
        self.assertIsNotNone(run(self.service.claim(acc, slug))["claim_id"])

    def test_expired_lease_can_be_taken_over_and_old_holder_still_answers_when_free(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        first = run(self.service.claim(acc, slug))
        self.clock.advance(LEASE_SECONDS + 1)
        # Appareil en veille : sa réservation a expiré mais personne ne l'a reprise, son choix reste enregistré.
        self.assertEqual(run(self.service.respond(acc["account_id"], slug, first["claim_id"], "later")), "deferred")

    def test_expired_lease_taken_by_another_device_blocks_the_old_holder(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        first = run(self.service.claim(acc, slug))
        self.clock.advance(LEASE_SECONDS + 1)
        second = run(self.service.claim(acc, slug))
        self.assertIsNotNone(second["claim_id"])
        self.assertIsNone(run(self.service.claim(acc, slug, first["claim_id"]))["claim_id"])
        self.assertIsNone(run(self.service.respond(acc["account_id"], slug, first["claim_id"], "configure")))
        self.assertEqual(run(self.service.respond(acc["account_id"], slug, second["claim_id"], "later")), "deferred")
        # Une réponse tardive après traitement renvoie l'état final au lieu d'une erreur.
        self.assertEqual(run(self.service.respond(acc["account_id"], slug, first["claim_id"], "configure")), "deferred")

    def test_existing_sites_with_settings_or_orders_are_not_disturbed(self):
        configured = account("acc_b", "owner_b", ecommerce_site_name="Ma boutique")
        self.assertEqual(run(self.service.status(configured, configured["ecommerce_slug"])), "configured")
        claim = run(self.service.claim(configured, configured["ecommerce_slug"]))
        self.assertIsNone(claim["claim_id"])
        self.assertEqual(claim["state"], "configured")

        with_orders = account("acc_c", "owner_c")
        run(self.db.ecommerce_orders.insert_one({"_id": "o1", "user_id": "owner_c", "site_slug": with_orders["ecommerce_slug"]}))
        self.assertEqual(run(self.service.status(with_orders, with_orders["ecommerce_slug"])), "configured")

    def test_saving_settings_marks_the_site_configured(self):
        acc = account()
        slug = acc["ecommerce_slug"]
        claim = run(self.service.claim(acc, slug))
        run(self.service.configured(acc["account_id"], slug))
        self.assertEqual(run(self.service.status(acc, slug)), "configured")
        self.assertEqual(run(self.service.respond(acc["account_id"], slug, claim["claim_id"], "later")), "configured")

    def test_accounts_are_isolated(self):
        first, second = account("acc_a", "owner_a"), account("acc_b", "owner_b")
        claim = run(self.service.claim(first, first["ecommerce_slug"]))
        run(self.service.respond("acc_a", first["ecommerce_slug"], claim["claim_id"], "later"))
        self.assertEqual(run(self.service.status(second, second["ecommerce_slug"])), "pending")
        # Un jeton d'un autre compte ne permet pas de répondre pour ce compte.
        self.assertIsNone(run(self.service.respond("acc_b", second["ecommerce_slug"], claim["claim_id"], "later")))
        self.assertIsNotNone(run(self.service.claim(second, second["ecommerce_slug"]))["claim_id"])

    def test_invalid_decision_is_rejected(self):
        with self.assertRaises(ValueError):
            run(self.service.respond("acc_a", "slug", "token", "activate"))


if __name__ == "__main__":
    unittest.main()
