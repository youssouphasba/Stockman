import asyncio
import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import migrate_ecommerce_initial_revisions as migration  # noqa: E402
from ecommerce_theme_service import ORIGIN_AUTHOR, PUBLISHED_THEME_FIELD, EcommerceThemeService  # noqa: E402
from ecommerce_theme_store import ThemeConflictError  # noqa: E402
from ecommerce_themes import compute_theme_capabilities  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


def caps(plan, surface):
    result = compute_theme_capabilities(plan=plan, is_org_admin=True, is_demo=False, can_write_data=True, surface=surface)
    result["preview"] = bool(result["guided_edit"] or result["structure_edit"])
    return result


MOBILE = caps("starter", "mobile")
ENTERPRISE_WEB = caps("enterprise", "web")
ACCOUNT = {"account_id": "acc_a"}
SLUG = "site-a"


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 8, 18, 0, tzinfo=timezone.utc)

    def __call__(self):
        self.now += timedelta(seconds=1)
        return self.now


def quiet(_line):
    return None


class InitialRevisionMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = EcommerceThemeService(self.db, clock=Clock())
        # Comptes techniques de test : valeurs neutres, jamais affichées par l'application.
        run(self.db.business_accounts.insert_one({
            "account_id": "acc_a", "ecommerce_slug": SLUG, "ecommerce_enabled": True,
            "ecommerce_site_name": "Site A", "ecommerce_hero_title": "", "ecommerce_brand_color": "#047857",
        }))
        run(self.db.business_accounts.insert_one({"account_id": "acc_b", "ecommerce_slug": "site-b", "ecommerce_brand_color": "rouge"}))
        run(self.db.business_accounts.insert_one({"account_id": "acc_c"}))
        run(self.db.products.insert_one({"product_id": "p1", "user_id": "owner_a"}))
        run(self.db.orders.insert_one({"order_id": "o1", "account_id": "acc_a"}))

    def account(self):
        return self.db.business_accounts.docs[0]

    def test_simulation_writes_nothing_and_reports_incompatible_values(self):
        lines = []
        counts = run(migration.run(self.db, apply=False, out=lines.append))
        self.assertEqual(dict(counts), {"would_record": 1, "invalid": 1})
        self.assertEqual(self.db.ecommerce_theme_revisions.docs, [])
        self.assertEqual(self.db.ecommerce_theme_states.docs, [])
        self.assertEqual(len(lines), 1)
        self.assertIn("acc_b", lines[0])
        self.assertIn("invalid_color", lines[0])

    def test_apply_records_the_origin_once_without_touching_the_site(self):
        accounts_before = copy.deepcopy(self.db.business_accounts.docs)
        counts = run(migration.run(self.db, apply=True, out=quiet))
        self.assertEqual(dict(counts), {"recorded": 1, "invalid": 1})
        self.assertEqual(self.db.business_accounts.docs, accounts_before)
        revision = self.db.ecommerce_theme_revisions.docs[0]
        self.assertEqual((revision["reason"], revision["author_id"], revision["model_id"]), ("initial", ORIGIN_AUTHOR, "legacy-v1"))
        self.assertEqual(revision["provenance"], {"source": "legacy_account_fields", "fields": ["ecommerce_brand_color", "ecommerce_hero_title", "ecommerce_site_name"]})
        # Une chaîne vide reste vide : rien n'est corrigé ni complété.
        self.assertEqual(revision["document"]["pages"][0]["sections"][0]["settings"], {"site_name": "Site A", "hero_title": ""})
        state = self.db.ecommerce_theme_states.docs[0]
        self.assertEqual((state["published_revision_id"], state["draft_revision_id"], state["published_at"]), (revision["_id"], None, None))
        # Relancer la migration ne crée rien de plus.
        again = run(migration.run(self.db, apply=True, out=quiet))
        self.assertEqual(dict(again), {"skipped": 1, "invalid": 1})
        self.assertEqual(len(self.db.ecommerce_theme_revisions.docs), 1)
        # Les données commerciales ne sont pas touchées.
        self.assertEqual(self.db.products.docs, [{"product_id": "p1", "user_id": "owner_a"}])
        self.assertEqual(self.db.orders.docs, [{"order_id": "o1", "account_id": "acc_a"}])

    def test_the_origin_is_online_in_history_and_restorable_after_a_change(self):
        run(migration.run(self.db, apply=True, out=quiet))
        origin_id = self.db.ecommerce_theme_revisions.docs[0]["_id"]
        state = run(self.service.view(ACCOUNT, SLUG, ENTERPRISE_WEB))
        self.assertEqual((state["published"]["revision_id"], state["lock_version"]), (origin_id, 1))
        history = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"]
        self.assertEqual([(item["kind"], item["is_published"], item["author"]) for item in history], [("initial", True, None)])

        document = copy.deepcopy(state["published"]["document"])
        document["pages"][0]["sections"][0]["settings"]["hero_title"] = "Titre modifié"
        saved = run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(self.db.ecommerce_theme_revisions.docs[-1]["parent_revision_id"], origin_id)
        published = run(self.service.publish(
            ACCOUNT, SLUG, revision_id=saved["draft"]["revision_id"], expected_lock_version=saved["lock_version"],
            expected_published_fingerprint=saved["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
        ))
        self.assertEqual(self.account()["ecommerce_hero_title"], "Titre modifié")
        history = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"]
        self.assertFalse(next(item for item in history if item["kind"] == "initial")["is_published"])
        restored = run(self.service.restore(ACCOUNT, SLUG, revision_id=origin_id, expected_lock_version=published["lock_version"], capabilities=ENTERPRISE_WEB, author_id="owner_a"))
        self.assertEqual(restored["draft"]["document"]["pages"][0]["sections"][0]["settings"]["hero_title"], "")

    def test_section_models_and_pending_drafts_are_handled_safely(self):
        account = self.account()
        account[PUBLISHED_THEME_FIELD] = {"model_id": "atelier", "revision_id": "threv_absente"}
        self.assertEqual(run(self.service.record_initial_revision(account, apply=True)), {"status": "skipped", "reason": "section_model"})
        del account[PUBLISHED_THEME_FIELD]
        self.assertEqual(run(self.service.record_initial_revision({"account_id": "acc_c"}, apply=True)), {"status": "skipped", "reason": "no_site"})

        # Un brouillon en cours, jamais publié : la version d'origine s'ajoute sans le toucher.
        state = run(self.service.view(ACCOUNT, SLUG, MOBILE))
        document = copy.deepcopy(state["published"]["document"])
        document["pages"][0]["sections"][0]["settings"]["hero_title"] = "Brouillon"
        saved = run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=0, capabilities=MOBILE, author_id="owner_a"))
        result = run(self.service.record_initial_revision(account, apply=True))
        self.assertEqual(result["status"], "recorded")
        stored = self.db.ecommerce_theme_states.docs[0]
        self.assertEqual((stored["draft_revision_id"], stored["published_revision_id"], stored["lock_version"]), (saved["draft"]["revision_id"], result["revision_id"], 2))
        # Un écran ouvert avant la migration doit simplement recharger l'apparence.
        with self.assertRaises(ThemeConflictError):
            run(self.service.save_draft(ACCOUNT, SLUG, document=document | {"global_settings": {**document["global_settings"], "brand_color": "#111827"}}, expected_lock_version=saved["lock_version"], capabilities=MOBILE, author_id="owner_a"))


    def test_the_first_publication_keeps_the_origin_even_without_migration(self):
        def publish_title(title, account=ACCOUNT, slug=SLUG):
            state = run(self.service.view(account, slug, MOBILE))
            document = copy.deepcopy(state["published"]["document"])
            document["pages"][0]["sections"][0]["settings"]["hero_title"] = title
            saved = run(self.service.save_draft(account, slug, document=document, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
            return run(self.service.publish(
                account, slug, revision_id=saved["draft"]["revision_id"], expected_lock_version=saved["lock_version"],
                expected_published_fingerprint=saved["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
            ))

        publish_title("Premier changement")
        publish_title("Deuxième changement")
        history = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"]
        origins = [item for item in history if item["kind"] == "initial"]
        self.assertEqual([(item["is_published"], item["author"]) for item in origins], [(False, None)])
        origin = next(doc for doc in self.db.ecommerce_theme_revisions.docs if doc["reason"] == "initial")
        self.assertEqual(origin["document"]["pages"][0]["sections"][0]["settings"], {"site_name": "Site A", "hero_title": ""})
        self.assertEqual(self.account()["ecommerce_hero_title"], "Deuxième changement")

        # Une valeur historique incompatible n'empêche pas la publication : seule la version d'origine manque.
        self.db.business_accounts.docs[1]["ecommerce_brand_color"] = "rouge"
        account_b = {"account_id": "acc_b"}
        state = run(self.service.view(account_b, "site-b", MOBILE))
        document = copy.deepcopy(state["published"]["document"])
        document["global_settings"]["brand_color"] = "#111827"
        saved = run(self.service.save_draft(account_b, "site-b", document=document, expected_lock_version=0, capabilities=MOBILE, author_id="owner_b"))
        run(self.service.publish(
            account_b, "site-b", revision_id=saved["draft"]["revision_id"], expected_lock_version=saved["lock_version"],
            expected_published_fingerprint=saved["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_b",
        ))
        self.assertEqual(self.db.business_accounts.docs[1]["ecommerce_brand_color"], "#111827")
        self.assertFalse(any(doc["reason"] == "initial" and doc["account_id"] == "acc_b" for doc in self.db.ecommerce_theme_revisions.docs))


if __name__ == "__main__":
    unittest.main()
