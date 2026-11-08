import asyncio
import copy
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ecommerce_theme_service import (  # noqa: E402
    PUBLISHED_THEME_FIELD,
    EcommerceThemeService,
    ThemeServiceError,
    guided_field_descriptors,
)
from ecommerce_themes import (  # noqa: E402
    CONTRACT,
    ThemeValidationError,
    build_legacy_theme_document,
    compatible_legacy_values,
    compute_theme_capabilities,
    instantiate_model,
    theme_identity,
    validate_theme_document,
)
from fake_mongo import FakeDatabase  # noqa: E402

# Tous les modèles à sections du registre : chaque nouveau modèle passe automatiquement les mêmes contrôles.
SECTION_MODELS = tuple(model_id for model_id in CONTRACT["models"] if model_id != "legacy-v1")


def run(coro):
    return asyncio.run(coro)


def caps(plan="starter", surface="mobile"):
    result = compute_theme_capabilities(plan=plan, is_org_admin=True, is_demo=False, can_write_data=True, surface=surface)
    result["preview"] = bool(result["guided_edit"] or result["structure_edit"])
    return result


MOBILE = caps()
ENTERPRISE_WEB = caps("enterprise", "web")
STARTER_WEB = caps("starter", "web")
ACCOUNT = {"account_id": "acc_a"}
SLUG = "boutique-a"


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 8, 15, 0, tzinfo=timezone.utc)

    def __call__(self):
        self.now += timedelta(seconds=1)
        return self.now


def section(document, section_id, page_id="home"):
    page = next(item for item in document["pages"] if item["id"] == page_id)
    return next(item for item in page["sections"] if item["id"] == section_id)


class InstantiationTests(unittest.TestCase):
    def test_every_model_is_valid_and_reuses_only_real_merchant_values(self):
        identity = {
            "site_name": "Maison Awa", "hero_title": "Bienvenue chez Awa", "welcome_message": "Tissus et créations faites à Dakar.",
            "brand_color": "#7C3AED", "delivery_info": "Livraison en 24 h à Dakar.",
        }
        for model_id in SECTION_MODELS:
            document = instantiate_model(model_id, identity)
            validate_theme_document(document)
            self.assertEqual(document["global_settings"]["site_name"], "Maison Awa")
            self.assertEqual(document["global_settings"]["brand_color"], "#7C3AED")
            hero = section(document, "hero")
            self.assertEqual((hero["settings"]["heading"], hero["settings"]["subheading"]), ("Bienvenue chez Awa", "Tissus et créations faites à Dakar."))
            self.assertNotIn("image_asset_id", hero["settings"])
            for page in document["pages"]:
                for item in page["sections"]:
                    for block in item["blocks"]:
                        if item["type"] == "features":
                            # Un point fort n'existe que s'il reprend une information du commerçant.
                            self.assertIn(block["settings"]["text"], ("Livraison en 24 h à Dakar.",))
                        else:
                            # Les autres blocs du modèle sont vides : aucun avis, image ou message inventé.
                            self.assertEqual(block["settings"], {}, (model_id, item["id"], block["id"]))
        self.assertEqual(section(instantiate_model("marche", {}), "services")["blocks"], [])

    def test_carried_values_that_do_not_fit_are_left_empty_not_truncated(self):
        document = instantiate_model("vitrine", {"site_name": "Nom\\nsur deux lignes".replace("\\\\n", "\\n"), "welcome_message": "x" * 601, "brand_color": "rouge"})
        self.assertNotIn("subheading", section(document, "hero")["settings"])
        self.assertNotIn("brand_color", document["global_settings"])

    def test_identity_reads_basic_and_section_documents(self):
        basic = build_legacy_theme_document({"ecommerce_site_name": "Chez Awa", "ecommerce_hero_title": "Titre", "ecommerce_brand_color": "#111827"})
        identity = theme_identity(basic, {"ecommerce_delivery_info": "  Retrait en boutique  ", "ecommerce_contact_phone": ""})
        self.assertEqual(identity, {"brand_color": "#111827", "site_name": "Chez Awa", "hero_title": "Titre", "delivery_info": "Retrait en boutique"})
        atelier = instantiate_model("atelier", identity)
        self.assertEqual(theme_identity(atelier, {})["hero_title"], "Titre")
        back_to_basic = instantiate_model("legacy-v1", theme_identity(atelier, {}))
        self.assertEqual(back_to_basic["pages"][0]["sections"][0]["settings"], {"site_name": "Chez Awa", "hero_title": "Titre"})

    def test_mirrored_fields_follow_the_section_document(self):
        document = instantiate_model("atelier", {"site_name": "Atelier Awa", "brand_color": "#DB2777", "hero_title": "Collection"})
        self.assertEqual(compatible_legacy_values(document), {
            "ecommerce_site_name": "Atelier Awa", "ecommerce_brand_color": "#DB2777", "ecommerce_hero_title": "Collection",
        })

    def test_required_sections_protect_the_commercial_journey(self):
        document = instantiate_model("marche", {})
        catalog = next(page for page in document["pages"] if page["kind"] == "catalog")
        catalog["sections"] = []
        with self.assertRaises(ThemeValidationError) as ctx:
            validate_theme_document(document)
        self.assertEqual(ctx.exception.code, "missing_section")
        optional = instantiate_model("marche", {})
        next(page for page in optional["pages"] if page["kind"] == "home")["sections"].pop(0)
        validate_theme_document(optional)

    def test_presets_and_compositions_stay_consistent_with_the_registry(self):
        for model_id in SECTION_MODELS:
            model = CONTRACT["models"][model_id]
            self.assertGreaterEqual(len(model["presets"]), 3)
            for preset in model["presets"]:
                for key, value in preset["settings"].items():
                    spec = CONTRACT["global_settings"][key]
                    self.assertIn(value, spec["values"], (model_id, preset["id"], key))
                    self.assertNotEqual(key, "brand_color")
            document = instantiate_model(model_id, {"top_category": "Tissus"})
            collection = next(item for page in document["pages"] for item in page["sections"] if item["type"] == "featured-collection")
            self.assertEqual(collection["settings"]["category"], "Tissus")
            self.assertEqual(document["global_settings"]["animation_style"], model["global_defaults"]["animation_style"])

    def test_models_differ_by_composition_and_style(self):
        # Une bibliothèque de modèles réellement différents : pas deux modèles avec la même page
        # d'accueil et le même style par défaut.
        signatures = set()
        for model_id in SECTION_MODELS:
            model = CONTRACT["models"][model_id]
            home = next(page for page in model["pages"] if page["kind"] == "home")
            signature = (tuple(item["type"] for item in home["sections"]), tuple(sorted(model["global_defaults"].items())))
            self.assertNotIn(signature, signatures, model_id)
            signatures.add(signature)
            self.assertEqual(len({preset["id"] for preset in model["presets"]}), len(model["presets"]))

    def test_descriptors_group_fields_and_describe_enums_and_blocks(self):
        document = instantiate_model("marche", {"delivery_info": "Livraison le jour même.", "payment_instructions": "Paiement à la livraison."})
        fields = guided_field_descriptors(document)
        groups = []
        for field in fields:
            if field["group_label"] not in groups:
                groups.append(field["group_label"])
        self.assertEqual(groups[:4], ["Identité", "Style", "En-tête", "Pied de page"])
        self.assertIn("Accueil · Bannière d'accueil", groups)
        self.assertIn("Contact", groups)
        scheme = next(field for field in fields if field["key"] == "color_scheme")
        self.assertEqual(scheme["options"][1], {"value": "cream", "label": "Crème"})
        block_title = next(field for field in fields if field["scope"] == "block" and field["key"] == "title")
        self.assertEqual(block_title["label"], "Point fort 1 · Titre")
        self.assertEqual(block_title["block_id"], "feature-delivery")
        columns = next(field for field in fields if field["id"] == "home.selection.columns")
        self.assertEqual((columns["type"], columns["min"], columns["max"]), ("integer", 2, 5))


class ModelLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = EcommerceThemeService(self.db, clock=Clock())
        run(self.db.business_accounts.insert_one({
            "account_id": "acc_a", "ecommerce_slug": SLUG, "ecommerce_enabled": True,
            "ecommerce_site_name": "Maison Awa", "ecommerce_hero_title": "Bienvenue", "ecommerce_brand_color": "#047857",
            "ecommerce_delivery_info": "Livraison en 24 h.", "ecommerce_contact_email": "contact@exemple.test",
        }))
        run(self.db.users.insert_one({"user_id": "owner_a", "name": "Awa Diop"}))

    def account(self):
        return self.db.business_accounts.docs[0]

    def view(self, capabilities=MOBILE):
        return run(self.service.view(ACCOUNT, SLUG, capabilities, plan="starter"))

    def change(self, model_id, state, capabilities=MOBILE, plan="starter"):
        return run(self.service.change_model(ACCOUNT, SLUG, model_id=model_id, expected_lock_version=state["lock_version"], capabilities=capabilities, plan=plan, author_id="owner_a"))

    def publish(self, state, capabilities=MOBILE):
        return run(self.service.publish(
            ACCOUNT, SLUG, revision_id=state["draft"]["revision_id"], expected_lock_version=state["lock_version"],
            expected_published_fingerprint=state["published"]["fingerprint"], capabilities=capabilities, author_id="owner_a",
        ))

    def test_view_lists_available_models_and_marks_the_published_one(self):
        models = {model["id"]: model for model in self.view()["models"]}
        self.assertEqual(list(models), list(CONTRACT["models"]))
        self.assertTrue(models["legacy-v1"]["published"])
        self.assertEqual(models["atelier"]["name"], "Atelier")

    def test_server_configuration_can_restrict_a_model(self):
        run(self.db.ecommerce_theme_settings.insert_one({"_id": "catalog", "model_plans": {"atelier": ["enterprise"]}}))
        self.assertNotIn("atelier", [model["id"] for model in self.view()["models"]])
        with self.assertRaises(ThemeServiceError) as ctx:
            self.change("atelier", self.view())
        self.assertEqual(ctx.exception.code, "model_unavailable")

    def test_switching_model_creates_a_draft_and_publishing_moves_authority_to_the_revision(self):
        state = self.change("atelier", self.view())
        self.assertEqual(state["draft"]["document"]["model_id"], "atelier")
        self.assertEqual(state["published"]["model_id"], "legacy-v1")
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")
        self.assertTrue(any(field["key"] == "font_pairing" for field in state["fields"]))

        state = self.publish(state)
        account = self.account()
        self.assertEqual(account[PUBLISHED_THEME_FIELD]["model_id"], "atelier")
        self.assertEqual(state["published"]["revision_id"], account[PUBLISHED_THEME_FIELD]["revision_id"])
        self.assertEqual(state["published"]["model_id"], "atelier")
        self.assertEqual((account["ecommerce_site_name"], account["ecommerce_hero_title"]), ("Maison Awa", "Bienvenue"))
        self.assertEqual(account["ecommerce_contact_email"], "contact@exemple.test")
        public = run(self.service.public_theme(account))
        self.assertEqual(public["model_id"], "atelier")
        self.assertEqual(section(public["document"], "hero")["settings"]["heading"], "Bienvenue")

        # Retour à Stockman Basic : les champs historiques redeviennent la source du rendu.
        state = self.publish(self.change("legacy-v1", state))
        self.assertNotIn(PUBLISHED_THEME_FIELD, self.account())
        self.assertIsNone(run(self.service.public_theme(self.account())))
        self.assertEqual(state["published"]["model_id"], "legacy-v1")
        self.assertEqual(self.account()["ecommerce_hero_title"], "Bienvenue")

    def test_guided_channels_edit_only_guided_points_of_a_section_model(self):
        state = self.publish(self.change("marche", self.view()))
        document = copy.deepcopy(state["published"]["document"])
        section(document, "hero")["settings"]["heading"] = "Courses livrées chez vous"
        document["global_settings"]["color_scheme"] = "dark"
        state = run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(section(state["draft"]["document"], "hero")["settings"]["heading"], "Courses livrées chez vous")

        structural = copy.deepcopy(state["draft"]["document"])
        home_count = len(next(page for page in structural["pages"] if page["kind"] == "home")["sections"])
        next(page for page in structural["pages"] if page["kind"] == "home")["sections"].pop()
        with self.assertRaises(ThemeValidationError) as ctx:
            run(self.service.save_draft(ACCOUNT, SLUG, document=structural, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
        self.assertEqual(ctx.exception.code, "guided_change_forbidden")
        # Enterprise sur le web peut retirer une section non indispensable.
        enterprise_state = run(self.service.save_draft(ACCOUNT, SLUG, document=structural, expected_lock_version=state["lock_version"], capabilities=ENTERPRISE_WEB, author_id="owner_a"))
        self.assertEqual(len(next(page for page in enterprise_state["draft"]["document"]["pages"] if page["kind"] == "home")["sections"]), home_count - 1)

    def test_enterprise_web_adds_sections_and_blocks_guided_channels_cannot(self):
        state = self.publish(self.change("vitrine", self.view()))
        document = copy.deepcopy(state["published"]["document"])
        home = next(page for page in document["pages"] if page["kind"] == "home")
        home["sections"].insert(1, {"id": "faq-extra", "type": "faq", "type_version": 1, "settings": {"heading": "Questions"}, "blocks": [
            {"id": "extra-question", "type": "question", "type_version": 1, "settings": {"question": "Livrez-vous ?", "answer": "Oui, sous 48 h."}},
        ]})
        with self.assertRaises(ThemeValidationError):
            run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))
        saved = run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=state["lock_version"], capabilities=ENTERPRISE_WEB, author_id="owner_a"))
        self.assertEqual(section(saved["draft"]["document"], "faq-extra")["blocks"][0]["id"], "extra-question")
        published = self.publish(saved, ENTERPRISE_WEB)
        self.assertEqual(section(published["published"]["document"], "faq-extra")["settings"]["heading"], "Questions")
        bad = copy.deepcopy(published["published"]["document"])
        section(bad, "faq-extra")["blocks"].append({"id": "x", "type": "feature", "type_version": 1, "settings": {}})
        with self.assertRaises(ThemeValidationError) as ctx:
            run(self.service.save_draft(ACCOUNT, SLUG, document=bad, expected_lock_version=published["lock_version"], capabilities=ENTERPRISE_WEB, author_id="owner_a"))
        self.assertEqual(ctx.exception.code, "block_not_allowed")

    def test_model_change_requires_the_dedicated_capability(self):
        candidate = instantiate_model("vitrine", {})
        with self.assertRaises(ThemeServiceError) as ctx:
            run(self.service.save_draft(ACCOUNT, SLUG, document=candidate, expected_lock_version=0, capabilities=STARTER_WEB | {"guided_edit": True}, author_id="owner_a"))
        self.assertEqual(ctx.exception.code, "forbidden")
        with self.assertRaises(ThemeServiceError):
            self.change("vitrine", self.view(STARTER_WEB), capabilities=STARTER_WEB)

    def test_model_preview_shows_a_candidate_without_saving_anything(self):
        token, _ = run(self.service.create_preview(ACCOUNT, SLUG, source="model", model_id="vitrine", plan="starter", capabilities=MOBILE, author_id="owner_a"))
        effective, info, theme = run(self.service.resolve_preview(token))
        self.assertEqual(info["source"], "model")
        self.assertEqual(theme["model_id"], "vitrine")
        self.assertEqual(effective["ecommerce_site_name"], "Maison Awa")
        self.assertEqual(self.db.ecommerce_theme_revisions.docs, [])
        with self.assertRaises(ThemeServiceError):
            run(self.service.create_preview(ACCOUNT, SLUG, source="model", model_id="inconnu", plan="starter", capabilities=MOBILE, author_id="owner_a"))

    def test_old_app_presentation_changes_are_translated_to_the_published_model(self):
        self.assertFalse(run(self.service.apply_legacy_settings("acc_a", SLUG, {"ecommerce_hero_title": "Basic"}, author_id="owner_a")))
        state = self.publish(self.change("vitrine", self.view()))
        applied = run(self.service.apply_legacy_settings("acc_a", SLUG, {"ecommerce_hero_title": "Depuis l'ancienne application", "ecommerce_contact_phone": "+221"}, author_id="owner_a"))
        self.assertTrue(applied)
        account = self.account()
        public = run(self.service.public_theme(account))
        self.assertEqual(section(public["document"], "hero")["settings"]["heading"], "Depuis l'ancienne application")
        self.assertEqual(account["ecommerce_hero_title"], "Depuis l'ancienne application")
        self.assertNotEqual(account[PUBLISHED_THEME_FIELD]["revision_id"], state["published"]["revision_id"])
        history = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"]
        self.assertEqual(history[0]["kind"], "settings")
        self.assertTrue(history[0]["is_published"])

    def test_featured_collection_uses_the_largest_real_category(self):
        self.account()["owner_user_id"] = "owner_a"
        for index, category in enumerate(["cat_a", "cat_b", "cat_b"]):
            run(self.db.products.insert_one({"product_id": f"p{index}", "user_id": "owner_a", "category_id": category, "is_active": True}))
        run(self.db.products.insert_one({"product_id": "p9", "user_id": "owner_a", "category_id": "cat_a", "is_active": False}))
        run(self.db.categories.insert_one({"category_id": "cat_a", "user_id": "owner_a", "name": "Boissons"}))
        run(self.db.categories.insert_one({"category_id": "cat_b", "user_id": "owner_a", "name": "Épicerie"}))
        state = self.change("marche", self.view())
        collection = section(state["draft"]["document"], "collection")
        self.assertEqual(collection["settings"]["category"], "Épicerie")
        self.assertEqual([preset["id"] for preset in state["presets"]], ["frais", "terroir", "epicerie-fine"])
        heading_field = next(field for field in state["fields"] if field["key"] == "heading" and field.get("section_id") == "collection")
        self.assertEqual(heading_field["group_label"], "Accueil · Collection mise en avant")
        # Les catégories proposées sont celles du catalogue réel, de la plus fournie à la moins fournie.
        self.assertEqual(state["categories"], ["Épicerie", "Boissons"])
        category_field = next(field for field in state["fields"] if field["key"] == "category" and field.get("section_id") == "collection")
        self.assertEqual(category_field["source"], "categories")

    def test_history_names_model_changes(self):
        self.change("atelier", self.view())
        item = run(self.service.history(ACCOUNT, SLUG, ENTERPRISE_WEB))["revisions"][0]
        self.assertEqual((item["kind"], item["model_name"], item["is_draft"]), ("model", "Atelier", True))


if __name__ == "__main__":
    unittest.main()
