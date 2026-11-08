import asyncio
import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ecommerce_theme_store import ThemeConflictError, ThemeRevisionNotFound, ThemeRevisionStore  # noqa: E402
from ecommerce_themes import (  # noqa: E402
    CONTRACT,
    LEGACY_MODEL_ID,
    LEGACY_MODEL_NAME,
    THEME_SCHEMA_VERSION,
    ThemeValidationError,
    assert_guided_changes_only,
    authorize_theme_change,
    available_models,
    build_legacy_theme_document,
    compute_theme_capabilities,
    is_model_available,
    legacy_theme_identity,
    normalize_catalog_overrides,
    resolve_model,
    validate_theme_document,
)
from fake_mongo import FakeDatabase  # noqa: E402


def technical_contract():
    """Contrat de test explicitement technique : ajoute un modèle à structure modifiable
    pour couvrir les règles Enterprise. Il n'est jamais chargé par l'application."""
    contract = copy.deepcopy(CONTRACT)
    contract["sections"]["test-text"] = {
        "type_version": 1,
        "settings": {
            "heading": {"type": "text", "max_length": 40, "nullable": True},
            "align": {"type": "enum", "values": ["left", "center"]},
        },
        "blocks": {"test-item": {"type_version": 1, "settings": {"label": {"type": "text", "max_length": 20}}}},
    }
    contract["models"]["test-editable"] = {
        "name": "Modèle technique de test",
        "version": "1.0.0",
        "default_plans": ["enterprise"],
        "structure_editable": True,
        "custom_pages": True,
        "pages": [{"id": "home", "kind": "home", "sections": [{"id": "intro", "type": "test-text", "required": True}, {"id": "extra", "type": "test-text"}]}],
        "guided_settings": {"global": ["brand_color"], "sections": {"test-text": ["heading"]}, "blocks": {}},
    }
    return contract


def editable_document():
    return {
        "schema_version": 1, "model_id": "test-editable", "model_version": "1.0.0",
        "global_settings": {"brand_color": "#112233"},
        "pages": [{"id": "home", "kind": "home", "sections": [
            {"id": "intro", "type": "test-text", "type_version": 1, "settings": {"heading": "A", "align": "left"}, "blocks": []},
            {"id": "extra", "type": "test-text", "type_version": 1, "settings": {"heading": None, "align": "center"}, "blocks": []},
        ]}],
    }


def expect_error(test, code, fn, *args, **kwargs):
    with test.assertRaises(ThemeValidationError) as ctx:
        fn(*args, **kwargs)
    test.assertEqual(ctx.exception.code, code, ctx.exception.as_dict())
    return ctx.exception


class BasicThemeTests(unittest.TestCase):
    def test_identity_is_additive_and_has_no_commercial_values(self):
        self.assertEqual(legacy_theme_identity(), {
            "model_id": "legacy-v1", "model_name": "Stockman Basic", "theme_schema_version": 1,
        })

    def test_identity_matches_the_registry(self):
        self.assertEqual(CONTRACT["models"][LEGACY_MODEL_ID]["name"], LEGACY_MODEL_NAME)
        self.assertEqual(CONTRACT["schema_version"], THEME_SCHEMA_VERSION)

    def test_unknown_models_resolve_to_basic(self):
        for model_id in (None, "", "unknown", "legacy-v1"):
            self.assertEqual(resolve_model(model_id)["id"], LEGACY_MODEL_ID)

    def test_contract_is_shared_byte_for_byte_with_the_web(self):
        self.assertEqual(
            (ROOT / "backend" / "ecommerce_theme_contract.json").read_bytes(),
            (ROOT / "web-app" / "src" / "lib" / "ecommerceThemeContract.json").read_bytes(),
        )


class EntitlementTests(unittest.TestCase):
    def test_basic_is_always_available_even_if_a_configuration_omits_it(self):
        for plan in ("starter", "pro", "enterprise", None, "premium"):
            self.assertTrue(is_model_available(LEGACY_MODEL_ID, plan, {LEGACY_MODEL_ID: []}))

    def test_rights_come_from_server_configuration_without_hardcoded_quota(self):
        contract = technical_contract()
        self.assertFalse(is_model_available("test-editable", "pro", None, contract))
        self.assertTrue(is_model_available("test-editable", "premium", None, contract))
        overrides = normalize_catalog_overrides({"test-editable": ["pro", "unknown"], "ghost": ["starter"], "legacy-v1": "bad"}, contract)
        self.assertEqual(overrides, {"test-editable": ["pro"]})
        self.assertTrue(is_model_available("test-editable", "pro", overrides, contract))
        self.assertFalse(is_model_available("test-editable", "enterprise", overrides, contract))
        expected = [model_id for model_id, model in contract["models"].items() if model_id != "test-editable" and "pro" in model["default_plans"]] + ["test-editable"]
        self.assertEqual([model["id"] for model in available_models("pro", overrides, contract)], expected)
        self.assertNotIn("test-editable", [model["id"] for model in available_models("enterprise", overrides, contract)])
        self.assertEqual(normalize_catalog_overrides(["not", "a", "mapping"]), {})


class CapabilityTests(unittest.TestCase):
    def caps(self, plan, surface, **overrides):
        params = {"plan": plan, "is_org_admin": True, "is_demo": False, "can_write_data": True, "surface": surface}
        params.update(overrides)
        return compute_theme_capabilities(**params)

    def test_starter_and_pro_edit_on_mobile_and_only_view_on_web(self):
        for plan in ("starter", "pro"):
            mobile = self.caps(plan, "mobile")
            self.assertTrue(mobile["guided_edit"] and mobile["publish"] and mobile["change_model"])
            self.assertFalse(mobile["structure_edit"] or mobile["custom_pages"] or mobile["manage_history"])
            web = self.caps(plan, "web")
            self.assertTrue(web["view"])
            self.assertFalse(any(value for key, value in web.items() if key != "view"))

    def test_enterprise_has_guided_mobile_and_full_web_editor(self):
        mobile = self.caps("enterprise", "mobile")
        self.assertTrue(mobile["guided_edit"] and mobile["manage_history"])
        self.assertFalse(mobile["structure_edit"])
        web = self.caps("enterprise", "web")
        self.assertTrue(all(web.values()))

    def test_roles_demo_and_subscription_restrictions_remove_writes(self):
        for overrides in ({"is_org_admin": False}, {"is_demo": True}, {"can_write_data": False}):
            caps = self.caps("enterprise", "web", **overrides)
            self.assertFalse(any(value for key, value in caps.items() if key != "view"), overrides)
        self.assertFalse(self.caps("enterprise", "web", is_org_admin=False)["view"])

    def test_unknown_surface_is_rejected(self):
        with self.assertRaises(ValueError):
            self.caps("enterprise", "desktop")


class ValidatorTests(unittest.TestCase):
    def test_legacy_projection_is_valid_and_preserves_explicit_values(self):
        empty = build_legacy_theme_document({"account_id": "acc"})
        self.assertEqual(validate_theme_document(empty), empty)
        self.assertEqual(empty["pages"][0]["sections"][0]["settings"], {})
        self.assertNotIn("brand_color", empty["global_settings"])
        filled = build_legacy_theme_document({
            "ecommerce_site_name": "", "ecommerce_hero_title": None,
            "ecommerce_welcome_message": "Bienvenue\nchez nous", "ecommerce_brand_color": "#2563EB",
            "ecommerce_contact_phone": "+221", "ecommerce_enabled": True,
        })
        validate_theme_document(filled)
        self.assertEqual(filled["pages"][0]["sections"][0]["settings"], {"site_name": "", "hero_title": None, "welcome_message": "Bienvenue\nchez nous"})
        self.assertEqual(filled["global_settings"], {"logo_asset_id": None, "brand_color": "#2563EB"})
        # Les réglages commerciaux et l'activation restent hors du document visuel.
        self.assertNotIn("+221", str(filled))
        self.assertNotIn("enabled", str(filled))

    def test_incompatible_legacy_values_are_reported_not_corrected(self):
        document = build_legacy_theme_document({"ecommerce_brand_color": "#FFF"})
        self.assertEqual(document["global_settings"]["brand_color"], "#FFF")
        expect_error(self, "invalid_color", validate_theme_document, document)

    def test_document_shape_and_registry_are_enforced(self):
        base = build_legacy_theme_document({})
        cases = [
            ("unknown_property", lambda d: d.update(script="alert(1)")),
            ("missing_property", lambda d: d.pop("pages")),
            ("unsupported_schema", lambda d: d.update(schema_version=2)),
            ("unsupported_schema", lambda d: d.update(schema_version=True)),
            ("unknown_model", lambda d: d.update(model_id="shopify-dawn")),
            ("unsupported_model_version", lambda d: d.update(model_version="9.0.0")),
            ("unknown_property", lambda d: d["global_settings"].update(price=1000)),
            ("invalid_media", lambda d: d["global_settings"].update(logo_asset_id="../../etc/passwd")),
            ("unknown_property", lambda d: d["pages"][0]["sections"][0]["settings"].update(stock=3)),
            ("text_too_long", lambda d: d["pages"][0]["sections"][0]["settings"].update(hero_title="x" * 121)),
            ("invalid_characters", lambda d: d["pages"][0]["sections"][0]["settings"].update(site_name="A\nB")),
            ("invalid_characters", lambda d: d["pages"][0]["sections"][0]["settings"].update(welcome_message="A\x00B")),
            ("invalid_type", lambda d: d["pages"][0]["sections"][0]["settings"].update(site_name=12)),
            ("section_not_allowed", lambda d: d["pages"][0]["sections"][0].update(type="custom-html")),
            ("unsupported_section_version", lambda d: d["pages"][0]["sections"][0].update(type_version=2)),
            ("block_not_allowed", lambda d: d["pages"][0]["sections"][0]["blocks"].append({"id": "b", "type": "html", "type_version": 1, "settings": {}})),
            ("invalid_id", lambda d: d["pages"][0].update(id="Home Page")),
            ("page_kind_not_allowed", lambda d: d["pages"][0].update(kind="catalog")),
            ("structure_locked", lambda d: d["pages"][0]["sections"].append(copy.deepcopy(d["pages"][0]["sections"][0]) | {"id": "second"})),
            ("structure_locked", lambda d: d["pages"][0]["sections"][0].update(id="renamed")),
            ("invalid_pages", lambda d: d.update(pages=[])),
        ]
        for code, mutate in cases:
            document = copy.deepcopy(base)
            mutate(document)
            expect_error(self, code, validate_theme_document, document)

    def test_size_limit_is_a_technical_guard(self):
        contract = copy.deepcopy(CONTRACT)
        contract["limits"]["max_document_bytes"] = 200
        expect_error(self, "document_too_large", validate_theme_document, build_legacy_theme_document({"ecommerce_welcome_message": "x" * 300}), contract)

    def test_editable_models_check_ids_paths_and_required_sections(self):
        contract = technical_contract()
        validate_theme_document(editable_document(), contract)
        custom = {"id": "about", "kind": "custom", "path": "a-propos", "title": "À propos", "sections": []}

        def with_pages(*pages):
            document = editable_document()
            document["pages"].extend(copy.deepcopy(list(pages)))
            return document

        validate_theme_document(with_pages(custom), contract)
        expect_error(self, "reserved_path", validate_theme_document, with_pages(custom | {"path": "checkout"}), contract)
        expect_error(self, "reserved_path", validate_theme_document, with_pages(custom | {"path": "api/v1"}), contract)
        expect_error(self, "invalid_path", validate_theme_document, with_pages(custom | {"path": "../admin"}), contract)
        expect_error(self, "invalid_path", validate_theme_document, with_pages(custom | {"path": "Promo"}), contract)
        expect_error(self, "duplicate_path", validate_theme_document, with_pages(custom, custom | {"id": "about-2"}), contract)
        expect_error(self, "duplicate_id", validate_theme_document, with_pages(custom | {"id": "intro"}), contract)
        expect_error(self, "duplicate_page_kind", validate_theme_document, with_pages({"id": "home-2", "kind": "home", "sections": []}), contract)
        expect_error(self, "unexpected_path", validate_theme_document, with_pages({"id": "cat", "kind": "catalog", "path": "x", "sections": []}), contract)
        missing = editable_document()
        missing["pages"][0]["sections"] = []
        expect_error(self, "missing_section", validate_theme_document, missing, contract)
        # Une section non indispensable d'un modèle modifiable peut être retirée.
        optional_removed = editable_document()
        optional_removed["pages"][0]["sections"] = optional_removed["pages"][0]["sections"][:1]
        validate_theme_document(optional_removed, contract)
        bad_enum = editable_document()
        bad_enum["pages"][0]["sections"][0]["settings"]["align"] = "justify"
        expect_error(self, "invalid_value", validate_theme_document, bad_enum, contract)
        with_block = editable_document()
        with_block["pages"][0]["sections"][0]["blocks"] = [{"id": "item-1", "type": "test-item", "type_version": 1, "settings": {"label": "Ok"}}]
        validate_theme_document(with_block, contract)
        with_block["pages"][0]["sections"][0]["blocks"][0]["settings"]["label"] = None
        expect_error(self, "invalid_value", validate_theme_document, with_block, contract)


    def test_custom_pages_need_a_title_and_a_bounded_menu(self):
        contract = technical_contract()
        custom = {"id": "about", "kind": "custom", "path": "a-propos", "title": "À propos", "sections": []}

        def with_pages(*pages):
            document = editable_document()
            document["pages"].extend(copy.deepcopy(list(pages)))
            return document

        validate_theme_document(with_pages(custom | {"menu": "hidden"}), contract)
        for title in (None, "", "   "):
            expect_error(self, "missing_title", validate_theme_document, with_pages(custom | {"title": title}), contract)
        expect_error(self, "missing_title", validate_theme_document, with_pages({key: value for key, value in custom.items() if key != "title"}), contract)
        expect_error(self, "invalid_value", validate_theme_document, with_pages(custom | {"menu": "sidebar"}), contract)
        expect_error(self, "invalid_value", validate_theme_document, with_pages(custom | {"menu": None}), contract)
        home_with_menu = editable_document()
        home_with_menu["pages"][0]["menu"] = "header"
        expect_error(self, "unexpected_menu", validate_theme_document, home_with_menu, contract)
        limit = contract["limits"]["max_header_pages"]
        header_pages = [custom | {"id": f"page-{index}", "path": f"page-{index}", "menu": "header"} for index in range(limit + 1)]
        validate_theme_document(with_pages(*header_pages[:limit]), contract)
        expect_error(self, "too_many_header_pages", validate_theme_document, with_pages(*header_pages), contract)
        # Aucune page personnalisée n'imite une page du modèle ou une page de l'application.
        for path in ("contact", "catalogue", "pricing"):
            expect_error(self, "reserved_path", validate_theme_document, with_pages(custom | {"path": path}), contract)


class ChangeControlTests(unittest.TestCase):
    def test_guided_channel_only_changes_guided_points(self):
        base = build_legacy_theme_document({"ecommerce_hero_title": "Avant"})
        candidate = copy.deepcopy(base)
        candidate["pages"][0]["sections"][0]["settings"]["hero_title"] = "Après"
        candidate["global_settings"]["brand_color"] = "#0F766E"
        assert_guided_changes_only(base, candidate)
        cleared = copy.deepcopy(base)
        cleared["pages"][0]["sections"][0]["settings"]["hero_title"] = None
        assert_guided_changes_only(base, cleared)

    def test_guided_channel_cannot_change_structure_model_or_unlisted_settings(self):
        contract = technical_contract()
        base = editable_document()
        moved = copy.deepcopy(base)
        moved["pages"][0]["sections"].append({"id": "more", "type": "test-text", "type_version": 1, "settings": {"align": "center"}, "blocks": []})
        expect_error(self, "guided_change_forbidden", assert_guided_changes_only, base, moved, contract)
        unlisted = copy.deepcopy(base)
        unlisted["pages"][0]["sections"][0]["settings"]["align"] = "center"
        expect_error(self, "guided_change_forbidden", assert_guided_changes_only, base, unlisted, contract)
        other_model = build_legacy_theme_document({})
        expect_error(self, "model_change_requires_dedicated_operation", assert_guided_changes_only, base, other_model, contract)

    def test_authorization_uses_server_capabilities(self):
        contract = technical_contract()
        base = editable_document()
        structural = copy.deepcopy(base)
        structural["pages"].append({"id": "about", "kind": "custom", "path": "a-propos", "title": "À propos", "sections": []})
        pro_mobile = compute_theme_capabilities(plan="pro", is_org_admin=True, is_demo=False, can_write_data=True, surface="mobile")
        pro_web = compute_theme_capabilities(plan="pro", is_org_admin=True, is_demo=False, can_write_data=True, surface="web")
        enterprise_web = compute_theme_capabilities(plan="enterprise", is_org_admin=True, is_demo=False, can_write_data=True, surface="web")
        expect_error(self, "forbidden", authorize_theme_change, pro_web, base, base, contract)
        expect_error(self, "guided_change_forbidden", authorize_theme_change, pro_mobile, base, structural, contract)
        self.assertEqual(authorize_theme_change(enterprise_web, base, structural, contract), structural)
        expect_error(self, "unknown_property", authorize_theme_change, enterprise_web, base, structural | {"extra": 1}, contract)
        # Premier document : un canal guidé doit partir de la structure du modèle.
        self.assertEqual(authorize_theme_change(pro_mobile, None, base, contract), base)
        expect_error(self, "guided_change_forbidden", authorize_theme_change, pro_mobile, None, structural, contract)

    def test_custom_pages_need_their_own_capability_while_their_texts_stay_guided(self):
        contract = technical_contract()
        base = editable_document()
        base["pages"].append({"id": "about", "kind": "custom", "path": "a-propos", "title": "À propos", "menu": "footer", "sections": [
            {"id": "about-text", "type": "test-text", "type_version": 1, "settings": {"heading": "Histoire", "align": "left"}, "blocks": []},
        ]})
        pro_mobile = compute_theme_capabilities(plan="pro", is_org_admin=True, is_demo=False, can_write_data=True, surface="mobile")
        enterprise_web = compute_theme_capabilities(plan="enterprise", is_org_admin=True, is_demo=False, can_write_data=True, surface="web")
        # Après un passage à Pro, les textes d'une page personnalisée restent modifiables depuis le mobile.
        texts = copy.deepcopy(base)
        texts["pages"][1]["sections"][0]["settings"]["heading"] = "Depuis 1998"
        self.assertEqual(authorize_theme_change(pro_mobile, base, texts, contract), texts)
        for key, value in (("title", "Qui sommes-nous"), ("menu", "header")):
            changed = copy.deepcopy(base)
            changed["pages"][1][key] = value
            error = expect_error(self, "guided_change_forbidden", authorize_theme_change, pro_mobile, base, changed, contract)
            self.assertEqual(error.path, f"$.pages[1].{key}")
            self.assertEqual(authorize_theme_change(enterprise_web, base, changed, contract), changed)
        # Une capacité structurelle sans les pages personnalisées ne permet pas de les gérer.
        structure_only = enterprise_web | {"custom_pages": False}
        removed = copy.deepcopy(base)
        removed["pages"].pop()
        expect_error(self, "custom_pages_forbidden", authorize_theme_change, structure_only, base, removed, contract)
        expect_error(self, "custom_pages_forbidden", authorize_theme_change, structure_only, None, base, contract)
        reordered = copy.deepcopy(base)
        reordered["pages"][0]["sections"].reverse()
        self.assertEqual(authorize_theme_change(structure_only, base, reordered, contract), reordered)


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 7, 10, 0, tzinfo=timezone.utc)

    def __call__(self):
        self.now += timedelta(seconds=1)
        return self.now


def run(coro):
    return asyncio.run(coro)


class RevisionStoreTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.store = ThemeRevisionStore(self.db, clock=Clock())
        self.document = build_legacy_theme_document({"ecommerce_hero_title": "V1"})

    def edited(self, title):
        document = copy.deepcopy(self.document)
        document["pages"][0]["sections"][0]["settings"]["hero_title"] = title
        return document

    def test_draft_and_publication_are_distinct(self):
        state = run(self.store.save_draft("acc", "site", self.document, author_id="u1", expected_lock_version=0))
        self.assertEqual(state["lock_version"], 1)
        self.assertIsNone(state["published_revision_id"])
        self.assertIsNone(run(self.store.published_document("acc", "site")))
        first = state["draft_revision_id"]
        state = run(self.store.publish("acc", "site", revision_id=first, author_id="u1", expected_lock_version=1))
        self.assertEqual(state["published_revision_id"], first)
        state = run(self.store.save_draft("acc", "site", self.edited("V2"), author_id="u1", expected_lock_version=2))
        self.assertNotEqual(state["draft_revision_id"], first)
        self.assertEqual(state["published_revision_id"], first)
        published = run(self.store.published_document("acc", "site"))
        self.assertEqual(published["pages"][0]["sections"][0]["settings"]["hero_title"], "V1")
        draft = run(self.store.get_revision("acc", "site", state["draft_revision_id"]))
        self.assertEqual(draft["parent_revision_id"], first)

    def test_stale_versions_conflict_and_leave_no_published_change(self):
        run(self.store.save_draft("acc", "site", self.document, author_id="mobile", expected_lock_version=0))
        run(self.store.save_draft("acc", "site", self.edited("Web"), author_id="web", expected_lock_version=1))
        with self.assertRaises(ThemeConflictError) as ctx:
            run(self.store.save_draft("acc", "site", self.edited("Mobile"), author_id="mobile", expected_lock_version=1))
        self.assertEqual(ctx.exception.current_lock_version, 2)
        with self.assertRaises(ThemeConflictError):
            run(self.store.save_draft("acc", "site", self.edited("Other"), author_id="x", expected_lock_version=0))
        state = run(self.store.get_state("acc", "site"))
        draft = run(self.store.get_revision("acc", "site", state["draft_revision_id"]))
        self.assertEqual(draft["document"]["pages"][0]["sections"][0]["settings"]["hero_title"], "Web")
        with self.assertRaises(ThemeConflictError):
            run(self.store.publish("acc", "site", revision_id=state["draft_revision_id"], author_id="x", expected_lock_version=1))

    def test_repeated_identical_save_is_idempotent(self):
        first = run(self.store.save_draft("acc", "site", self.document, author_id="u1", expected_lock_version=0))
        again = run(self.store.save_draft("acc", "site", copy.deepcopy(self.document), author_id="u1", expected_lock_version=0))
        self.assertEqual(again["lock_version"], first["lock_version"])
        self.assertEqual(len(self.db.ecommerce_theme_revisions.docs), 1)

    def test_invalid_documents_are_never_stored(self):
        invalid = self.edited("x" * 500)
        with self.assertRaises(ThemeValidationError):
            run(self.store.save_draft("acc", "site", invalid, author_id="u1", expected_lock_version=0))
        self.assertEqual(self.db.ecommerce_theme_revisions.docs, [])
        self.assertEqual(self.db.ecommerce_theme_states.docs, [])

    def test_restore_creates_a_new_draft_without_publishing(self):
        state = run(self.store.save_draft("acc", "site", self.document, author_id="u1", expected_lock_version=0))
        first = state["draft_revision_id"]
        state = run(self.store.publish("acc", "site", revision_id=first, author_id="u1", expected_lock_version=1))
        state = run(self.store.save_draft("acc", "site", self.edited("V2"), author_id="u1", expected_lock_version=2))
        second = state["draft_revision_id"]
        state = run(self.store.publish("acc", "site", revision_id=second, author_id="u1", expected_lock_version=3))
        state = run(self.store.restore("acc", "site", revision_id=first, author_id="u2", expected_lock_version=4))
        restored = run(self.store.get_revision("acc", "site", state["draft_revision_id"]))
        self.assertNotIn(restored["_id"], (first, second))
        self.assertEqual(restored["reason"], f"restore:{first}")
        self.assertEqual(restored["document"], run(self.store.get_revision("acc", "site", first))["document"])
        self.assertEqual(state["published_revision_id"], second)
        self.assertEqual(len(self.db.ecommerce_theme_revisions.docs), 3)

    def test_revisions_are_isolated_by_account_and_site(self):
        state = run(self.store.save_draft("acc_a", "site-a", self.document, author_id="a", expected_lock_version=0))
        revision_id = state["draft_revision_id"]
        with self.assertRaises(ThemeRevisionNotFound):
            run(self.store.publish("acc_b", "site-b", revision_id=revision_id, author_id="b", expected_lock_version=0))
        with self.assertRaises(ThemeRevisionNotFound):
            run(self.store.restore("acc_b", "site-b", revision_id=revision_id, author_id="b", expected_lock_version=0))
        with self.assertRaises(ThemeRevisionNotFound):
            run(self.store.get_revision("acc_a", "other-site", revision_id))
        self.assertEqual(run(self.store.list_revisions("acc_b", "site-b")), [])
        history = run(self.store.list_revisions("acc_a", "site-a"))
        self.assertEqual([item["_id"] for item in history], [revision_id])
        self.assertNotIn("document", history[0])
        self.assertIsNone(run(self.store.get_state("acc_b", "site-b")))


if __name__ == "__main__":
    unittest.main()
