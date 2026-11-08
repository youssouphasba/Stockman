import asyncio
import copy
import re
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ecommerce_theme_service import (  # noqa: E402
    PREVIEW_TTL,
    EcommerceThemeService,
    ThemeServiceError,
    guided_field_descriptors,
    hash_preview_token,
    theme_error_response,
)
from ecommerce_theme_store import ThemeConflictError, ThemeRevisionNotFound  # noqa: E402
from ecommerce_themes import (  # noqa: E402
    ThemeValidationError,
    build_legacy_theme_document,
    compute_theme_capabilities,
    legacy_account_values,
)
from fake_mongo import FakeDatabase  # noqa: E402


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 8, 9, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.now

    def advance(self, **delta):
        self.now += timedelta(**delta)


def run(coro):
    return asyncio.run(coro)


def capabilities(plan="starter", surface="mobile", *, org_admin=True, demo=False, writable=True):
    caps = compute_theme_capabilities(plan=plan, is_org_admin=org_admin, is_demo=demo, can_write_data=writable, surface=surface)
    caps["preview"] = bool(caps["guided_edit"] or caps["structure_edit"])
    return caps


MOBILE = capabilities("starter", "mobile")
STARTER_WEB = capabilities("starter", "web")
ENTERPRISE_WEB = capabilities("enterprise", "web")
ENTERPRISE_MOBILE = capabilities("enterprise", "mobile")
READ_ONLY = capabilities("starter", "mobile", writable=False)

ACCOUNT = {"account_id": "acc_a"}
SLUG = "boutique-a"


def expect(test, exc_type, code, coro):
    with test.assertRaises(exc_type) as ctx:
        run(coro)
    if code is not None:
        test.assertEqual(ctx.exception.code, code)
    return ctx.exception


def edit(document, **values):
    document = copy.deepcopy(document)
    section = document["pages"][0]["sections"][0]
    for key, value in values.items():
        if key == "brand_color":
            document["global_settings"][key] = value
        else:
            section["settings"][key] = value
    return document


class ThemeServiceTestCase(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.clock = Clock()
        self.service = EcommerceThemeService(self.db, clock=self.clock)
        run(self.db.business_accounts.insert_one({
            "account_id": "acc_a", "owner_user_id": "owner_a", "ecommerce_slug": SLUG, "ecommerce_enabled": False,
            "ecommerce_hero_title": "Bienvenue", "ecommerce_brand_color": "#047857",
            "ecommerce_contact_email": "contact@exemple.test", "ecommerce_custom_domain": "www.exemple.test",
        }))
        run(self.db.business_accounts.insert_one({
            "account_id": "acc_b", "owner_user_id": "owner_b", "ecommerce_slug": "boutique-b", "ecommerce_enabled": True,
            "ecommerce_hero_title": "Autre compte",
        }))
        run(self.db.users.insert_one({"user_id": "owner_a", "name": "Awa Diop"}))

    def account(self, account_id="acc_a"):
        return next(doc for doc in self.db.business_accounts.docs if doc["account_id"] == account_id)

    def view(self, caps=MOBILE):
        return run(self.service.view(ACCOUNT, SLUG, caps))

    def save(self, document, lock, caps=MOBILE):
        return run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=lock, capabilities=caps, author_id="owner_a"))

    def publish(self, state, caps=MOBILE, **overrides):
        params = {
            "revision_id": state["draft"]["revision_id"],
            "expected_lock_version": state["lock_version"],
            "expected_published_fingerprint": state["published"]["fingerprint"],
        }
        params.update(overrides)
        return run(self.service.publish(ACCOUNT, SLUG, capabilities=caps, author_id="owner_a", **params))


class ViewTests(ThemeServiceTestCase):
    def test_initial_view_projects_the_live_basic_site_without_writing(self):
        state = self.view()
        self.assertEqual(state["lock_version"], 0)
        self.assertIsNone(state["draft"])
        self.assertIsNone(state["published"]["revision_id"])
        self.assertEqual(state["published"]["issues"], [])
        self.assertEqual(state["published"]["document"], build_legacy_theme_document(self.account()))
        self.assertEqual(state["model"], {"id": "legacy-v1", "name": "Stockman Basic", "version": "1.0.0"})
        self.assertFalse(state["site_enabled"])
        self.assertEqual(self.db.ecommerce_theme_states.docs, [])
        self.assertEqual(self.db.ecommerce_theme_revisions.docs, [])

    def test_fields_describe_guided_points_including_the_logo_media(self):
        fields = self.view()["fields"]
        self.assertEqual([field["id"] for field in fields], [
            "global.brand_color", "global.logo_asset_id",
            "home.storefront.site_name", "home.storefront.hero_title", "home.storefront.welcome_message",
        ])
        labels = {field["key"]: field["label"] for field in fields}
        self.assertEqual(labels["hero_title"], "Titre d'accueil")
        welcome = next(field for field in fields if field["key"] == "welcome_message")
        self.assertEqual((welcome["max_length"], welcome["multiline"]), (600, True))
        logo = next(field for field in fields if field["key"] == "logo_asset_id")
        self.assertEqual((logo["type"], logo["media_kind"], logo["label"]), ("media_id", "logo", "Logo"))

    def test_incompatible_live_values_are_reported_not_corrected(self):
        self.account()["ecommerce_hero_title"] = "Ligne 1\nLigne 2"
        state = self.view()
        self.assertEqual(state["published"]["issues"][0]["code"], "invalid_characters")
        self.assertEqual(state["published"]["document"]["pages"][0]["sections"][0]["settings"]["hero_title"], "Ligne 1\nLigne 2")

    def test_view_requires_an_operational_admin(self):
        expect(self, ThemeServiceError, "forbidden", self.service.view(ACCOUNT, SLUG, capabilities(org_admin=False)))

    def test_unknown_site_is_not_found(self):
        expect(self, ThemeServiceError, "site_not_found", self.service.view(ACCOUNT, "boutique-b", MOBILE))


class DraftTests(ThemeServiceTestCase):
    def test_guided_draft_is_saved_without_changing_the_public_site(self):
        base = self.view()
        state = self.save(edit(base["published"]["document"], hero_title="Nouveautés"), base["lock_version"])
        self.assertEqual(state["lock_version"], 1)
        self.assertEqual(state["draft"]["document"]["pages"][0]["sections"][0]["settings"]["hero_title"], "Nouveautés")
        self.assertEqual(state["draft"]["updated_by"], "Awa Diop")
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")
        self.assertEqual(state["published"]["document"], base["published"]["document"])

    def test_web_starter_pro_read_only_and_suspended_accounts_cannot_save(self):
        base = self.view(STARTER_WEB)
        self.assertFalse(base["capabilities"]["guided_edit"])
        document = edit(base["published"]["document"], hero_title="Web")
        expect(self, ThemeServiceError, "forbidden", self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=0, capabilities=STARTER_WEB, author_id="owner_a"))
        expect(self, ThemeServiceError, "forbidden", self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=0, capabilities=READ_ONLY, author_id="owner_a"))
        self.assertEqual(self.db.ecommerce_theme_revisions.docs, [])

    def test_structure_and_locked_settings_are_refused(self):
        base = self.view(ENTERPRISE_WEB)
        document = copy.deepcopy(base["published"]["document"])
        document["pages"][0]["sections"].append(copy.deepcopy(document["pages"][0]["sections"][0]) | {"id": "copy"})
        expect(self, ThemeValidationError, "structure_locked", self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=0, capabilities=ENTERPRISE_WEB, author_id="owner_a"))
        other_model = copy.deepcopy(base["published"]["document"]) | {"model_id": "unknown"}
        expect(self, ThemeValidationError, "unknown_model", self.service.save_draft(ACCOUNT, SLUG, document=other_model, expected_lock_version=0, capabilities=ENTERPRISE_WEB, author_id="owner_a"))

    def test_unknown_media_references_are_refused(self):
        base = self.view()
        document = copy.deepcopy(base["published"]["document"])
        document["global_settings"]["logo_asset_id"] = "med_0123456789abcdef01234567"
        error = expect(self, ThemeValidationError, "media_not_found", self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=0, capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(error.path, "$.global_settings.logo_asset_id")

    def test_stale_lock_versions_conflict(self):
        base = self.view()
        self.save(edit(base["published"]["document"], hero_title="Mobile"), 0)
        error = expect(self, ThemeConflictError, None, self.service.save_draft(ACCOUNT, SLUG, document=edit(base["published"]["document"], hero_title="Web"), expected_lock_version=0, capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(error.current_lock_version, 1)

    def test_discard_keeps_the_revision_and_revokes_its_previews(self):
        base = self.view()
        state = self.save(edit(base["published"]["document"], hero_title="Essai"), 0)
        token, _expires = run(self.service.create_preview(ACCOUNT, SLUG, source="draft", capabilities=MOBILE, author_id="owner_a"))
        state = run(self.service.discard_draft(ACCOUNT, SLUG, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
        self.assertIsNone(state["draft"])
        self.assertEqual(len(self.db.ecommerce_theme_revisions.docs), 1)
        expect(self, ThemeServiceError, "preview_not_found", self.service.resolve_preview(token))
        expect(self, ThemeServiceError, "no_draft", self.service.discard_draft(ACCOUNT, SLUG, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
        expect(self, ThemeConflictError, None, self.service.discard_draft(ACCOUNT, SLUG, expected_lock_version=0, capabilities=MOBILE, author_id="owner_a"))


class PublishTests(ThemeServiceTestCase):
    def test_publication_writes_only_the_historical_presentation_fields(self):
        base = self.view()
        document = edit(base["published"]["document"], hero_title="Soldes", site_name="Maison Awa", brand_color="#2563EB")
        del document["pages"][0]["sections"][0]["settings"]["hero_title"]
        state = self.publish(self.save(document, 0))
        account = self.account()
        self.assertNotIn("ecommerce_hero_title", account)
        self.assertEqual(account["ecommerce_site_name"], "Maison Awa")
        self.assertEqual(account["ecommerce_brand_color"], "#2563EB")
        # Activation, coordonnées et domaine restent des réglages du site, jamais touchés par le thème.
        self.assertFalse(account["ecommerce_enabled"])
        self.assertEqual(account["ecommerce_contact_email"], "contact@exemple.test")
        self.assertEqual(account["ecommerce_custom_domain"], "www.exemple.test")
        self.assertIn("ecommerce_configured_at", account)
        self.assertIsNone(state["draft"])
        self.assertIsNotNone(state["published"]["revision_id"])
        self.assertEqual(state["published"]["document"], build_legacy_theme_document(account))
        self.assertEqual(legacy_account_values(document), legacy_account_values(state["published"]["document"]))
        onboarding = self.db.ecommerce_site_onboarding.docs
        self.assertEqual([(doc["_id"], doc["state"]) for doc in onboarding], [("acc_a:boutique-a", "configured")])
        self.assertEqual(self.account("acc_b")["ecommerce_hero_title"], "Autre compte")

    def test_changes_made_from_site_settings_block_a_blind_publication(self):
        draft_state = self.save(edit(self.view()["published"]["document"], hero_title="Brouillon"), 0)
        self.account()["ecommerce_brand_color"] = "#DB2777"  # Enregistrement concurrent depuis les réglages du site.
        expect(self, ThemeServiceError, "published_changed", self.service.publish(
            ACCOUNT, SLUG, revision_id=draft_state["draft"]["revision_id"], expected_lock_version=1,
            expected_published_fingerprint=draft_state["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
        ))
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")
        fresh = self.view()
        self.assertEqual(fresh["draft"]["revision_id"], draft_state["draft"]["revision_id"])
        self.assertIsNone(fresh["published"]["revision_id"])
        # Après relecture des différences, la publication explicite reste possible.
        self.publish(fresh)
        self.assertEqual(self.account()["ecommerce_hero_title"], "Brouillon")

    def test_stale_state_or_another_draft_is_refused(self):
        state = self.save(edit(self.view()["published"]["document"], hero_title="A"), 0)
        expect(self, ThemeConflictError, None, self.service.publish(
            ACCOUNT, SLUG, revision_id=state["draft"]["revision_id"], expected_lock_version=0,
            expected_published_fingerprint=state["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
        ))
        expect(self, ThemeServiceError, "draft_changed", self.service.publish(
            ACCOUNT, SLUG, revision_id="threv_other", expected_lock_version=1,
            expected_published_fingerprint=state["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
        ))
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")

    def test_publication_requires_the_publish_capability_for_the_channel(self):
        state = self.save(edit(self.view(ENTERPRISE_WEB)["published"]["document"], hero_title="Web Enterprise"), 0, ENTERPRISE_WEB)
        expect(self, ThemeServiceError, "forbidden", self.service.publish(
            ACCOUNT, SLUG, revision_id=state["draft"]["revision_id"], expected_lock_version=state["lock_version"],
            expected_published_fingerprint=state["published"]["fingerprint"], capabilities=STARTER_WEB, author_id="owner_a",
        ))
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")

    def test_pointer_conflict_restores_the_previous_public_values(self):
        state = self.save(edit(self.view()["published"]["document"], hero_title="Course"), 0)

        async def concurrent_publish(*_args, **_kwargs):
            raise ThemeConflictError(2)

        self.service.store.publish = concurrent_publish
        expect(self, ThemeConflictError, None, self.service.publish(
            ACCOUNT, SLUG, revision_id=state["draft"]["revision_id"], expected_lock_version=1,
            expected_published_fingerprint=state["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
        ))
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")
        self.assertEqual(self.account()["ecommerce_brand_color"], "#047857")

    def test_later_settings_changes_hide_the_published_marker(self):
        self.publish(self.save(edit(self.view()["published"]["document"], hero_title="Publié"), 0))
        self.assertIsNotNone(self.view()["published"]["revision_id"])
        self.account()["ecommerce_hero_title"] = "Modifié depuis les réglages"
        self.assertIsNone(self.view()["published"]["revision_id"])


class HistoryTests(ThemeServiceTestCase):
    def test_history_and_restore_are_reserved_to_enterprise(self):
        expect(self, ThemeServiceError, "forbidden", self.service.history(ACCOUNT, SLUG, MOBILE))
        state = self.save(edit(self.view()["published"]["document"], hero_title="V1"), 0)
        expect(self, ThemeServiceError, "forbidden", self.service.restore(
            ACCOUNT, SLUG, revision_id=state["draft"]["revision_id"], expected_lock_version=1, capabilities=MOBILE, author_id="owner_a",
        ))

    def test_history_flags_draft_and_live_versions_and_restore_creates_a_draft(self):
        first = self.publish(self.save(edit(self.view(ENTERPRISE_WEB)["published"]["document"], hero_title="V1"), 0, ENTERPRISE_WEB), ENTERPRISE_WEB)
        first_id = first["published"]["revision_id"]
        self.clock.advance(seconds=1)
        second = self.save(edit(first["published"]["document"], hero_title="V2"), first["lock_version"], ENTERPRISE_WEB)
        history = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"]
        flags = {item["revision_id"]: (item["is_draft"], item["is_published"], item["author"]) for item in history}
        self.assertEqual(flags[first_id], (False, True, "Awa Diop"))
        self.assertEqual(flags[second["draft"]["revision_id"]], (True, False, "Awa Diop"))
        self.assertNotIn("document", history[0])

        self.clock.advance(seconds=1)
        restored = run(self.service.restore(
            ACCOUNT, SLUG, revision_id=first_id, expected_lock_version=second["lock_version"], capabilities=ENTERPRISE_WEB, author_id="owner_a",
        ))
        self.assertEqual(restored["draft"]["document"]["pages"][0]["sections"][0]["settings"]["hero_title"], "V1")
        self.assertEqual(self.account()["ecommerce_hero_title"], "V1")
        newest = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"][0]
        self.assertEqual((newest["kind"], newest["restored_from"], newest["is_draft"]), ("restore", first_id, True))

    def test_revisions_of_another_account_cannot_be_restored(self):
        other = EcommerceThemeService(self.db, clock=self.clock)
        foreign = run(other.save_draft({"account_id": "acc_b"}, "boutique-b", document=build_legacy_theme_document(self.account("acc_b")), expected_lock_version=0, capabilities=ENTERPRISE_WEB, author_id="owner_b"))
        expect(self, ThemeRevisionNotFound, None, self.service.restore(
            ACCOUNT, SLUG, revision_id=foreign["draft"]["revision_id"], expected_lock_version=0, capabilities=ENTERPRISE_WEB, author_id="owner_a",
        ))


class PreviewTests(ThemeServiceTestCase):
    def test_draft_preview_overlays_the_draft_without_writing_and_works_when_disabled(self):
        self.save(edit(self.view()["published"]["document"], hero_title="Aperçu", brand_color="#7C3AED"), 0)
        token, expires_at = run(self.service.create_preview(ACCOUNT, SLUG, source="draft", capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(expires_at, self.clock.now + PREVIEW_TTL)
        stored = self.db.ecommerce_theme_previews.docs[0]
        self.assertEqual(stored["_id"], hash_preview_token(token))
        self.assertNotIn(token, repr(stored))
        effective, info, _theme = run(self.service.resolve_preview(token))
        self.assertEqual((effective["ecommerce_hero_title"], effective["ecommerce_brand_color"]), ("Aperçu", "#7C3AED"))
        self.assertEqual(effective["ecommerce_contact_email"], "contact@exemple.test")
        self.assertEqual(info["source"], "draft")
        self.assertFalse(info["site_enabled"])
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")

    def test_published_preview_shows_live_values(self):
        token, _ = run(self.service.create_preview(ACCOUNT, SLUG, source="published", capabilities=MOBILE, author_id="owner_a"))
        effective, info, _theme = run(self.service.resolve_preview(token))
        self.assertEqual(effective["ecommerce_hero_title"], "Bienvenue")
        self.assertEqual(info["source"], "published")

    def test_expired_malformed_and_unknown_tokens_are_rejected(self):
        token, _ = run(self.service.create_preview(ACCOUNT, SLUG, source="published", capabilities=MOBILE, author_id="owner_a"))
        for bad in ("", "court", "x" * 300, None, 123, token[:-1] + ("A" if token[-1] != "A" else "B")):
            expect(self, ThemeServiceError, "preview_not_found", self.service.resolve_preview(bad))
        self.clock.advance(minutes=31)
        expect(self, ThemeServiceError, "preview_not_found", self.service.resolve_preview(token))

    def test_naive_expiry_dates_from_mongo_are_compared_in_utc(self):
        token, _ = run(self.service.create_preview(ACCOUNT, SLUG, source="published", capabilities=MOBILE, author_id="owner_a"))
        stored = self.db.ecommerce_theme_previews.docs[0]
        stored["expires_at"] = stored["expires_at"].replace(tzinfo=None)
        run(self.service.resolve_preview(token))

    def test_preview_requires_an_editing_channel_and_an_existing_draft(self):
        expect(self, ThemeServiceError, "forbidden", self.service.create_preview(ACCOUNT, SLUG, source="published", capabilities=STARTER_WEB, author_id="owner_a"))
        expect(self, ThemeServiceError, "no_draft", self.service.create_preview(ACCOUNT, SLUG, source="draft", capabilities=MOBILE, author_id="owner_a"))
        expect(self, ThemeServiceError, "invalid_source", self.service.create_preview(ACCOUNT, SLUG, source="other", capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(self.db.ecommerce_theme_previews.docs, [])


class HelperTests(unittest.TestCase):
    def test_legacy_values_round_trip_through_the_projection(self):
        account = {"ecommerce_site_name": "", "ecommerce_hero_title": None, "ecommerce_brand_color": "#111827"}
        document = build_legacy_theme_document(account)
        self.assertEqual(legacy_account_values(document), account)
        self.assertEqual(build_legacy_theme_document(legacy_account_values(document)), document)

    def test_descriptors_follow_the_document_instances(self):
        fields = guided_field_descriptors(build_legacy_theme_document({}))
        section_field = next(field for field in fields if field["key"] == "site_name")
        self.assertEqual((section_field["page_id"], section_field["section_id"], section_field["scope"]), ("home", "storefront", "section"))
        self.assertEqual(guided_field_descriptors({"model_id": "unknown"}), [])

    def test_errors_map_to_stable_http_responses(self):
        self.assertEqual(theme_error_response(ThemeConflictError(4))[0], 409)
        self.assertEqual(theme_error_response(ThemeConflictError(4))[1]["lock_version"], 4)
        self.assertEqual(theme_error_response(ThemeRevisionNotFound("x"))[0], 404)
        self.assertEqual(theme_error_response(ThemeValidationError("invalid_value", "$.x", "Valeur"))[1]["path"], "$.x")
        self.assertEqual(theme_error_response(ThemeServiceError(403, "forbidden", "Non"))[1]["code"], "forbidden")
        self.assertIsNone(theme_error_response(RuntimeError("autre")))


class RouteGuardTests(unittest.TestCase):
    """Les routes restent minces : on vérifie qu'aucune mutation n'échappe aux gardes existantes."""

    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "backend" / "server.py").read_text(encoding="utf-8").replace("\r\n", "\n")

    def route_body(self, method, path):
        match = re.search(rf'@api_router\.{method}\("{re.escape(path)}"\)\n(async def [\s\S]*?)(?=\n\n\n|\n@)', self.source)
        self.assertIsNotNone(match, path)
        return match.group(1)

    def test_every_theme_mutation_uses_the_write_guard_and_the_server_context(self):
        for method, path in [
            ("put", "/ecommerce/site/theme/draft"),
            ("post", "/ecommerce/site/theme/draft/discard"),
            ("post", "/ecommerce/site/theme/publish"),
            ("post", "/ecommerce/site/theme/revisions/{revision_id}/restore"),
            ("post", "/ecommerce/site/theme/preview"),
            ("post", "/ecommerce/site/theme/model"),
            ("post", "/ecommerce/site/media"),
            ("post", "/ecommerce/site/media/{media_id}/alt"),
            ("post", "/ecommerce/site/media/{media_id}/delete"),
        ]:
            body = self.route_body(method, path)
            self.assertIn("ensure_subscription_write_allowed(user, request=request)", body, path)
            self.assertIn("get_ecommerce_theme_context(user, data.site_slug)", body, path)
            self.assertIn("ecommerce_theme_capabilities(user, request)", body, path)
            self.assertNotIn("data.capabilities", body, path)

    def test_reads_never_write_and_the_public_preview_is_never_cached(self):
        for path in ("/ecommerce/site/theme", "/ecommerce/site/theme/revisions", "/ecommerce/site/media"):
            body = self.route_body("get", path)
            self.assertNotIn("save_draft", body)
            self.assertNotIn("publish(", body)
        self.assertIn('"Cache-Control": "no-store, max-age=0"', self.source)
        self.assertIn('@app.post("/api/public/ecommerce/preview")', self.source)
        self.assertIn('/preview#{token}', self.source)
        # Le thème d'un aperçu n'est jamais remplacé par le thème publié.
        self.assertIn("payload = await build_public_ecommerce_payload(account_doc, theme=theme)", self.source)
        self.assertIn("if theme is _PUBLISHED_THEME:", self.source)


if __name__ == "__main__":
    unittest.main()
