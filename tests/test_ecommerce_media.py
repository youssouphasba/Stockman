import asyncio
import base64
import copy
import io
import re
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import ecommerce_media  # noqa: E402
from ecommerce_media import (  # noqa: E402
    EcommerceMediaLibrary,
    MediaServiceError,
    decode_upload,
    normalize_alt,
    parse_media_url,
    process_image,
)
from ecommerce_theme_service import EcommerceThemeService  # noqa: E402
from ecommerce_themes import ThemeValidationError, build_legacy_theme_document, compute_theme_capabilities  # noqa: E402
from fake_mongo import FakeDatabase  # noqa: E402


def run(coro):
    return asyncio.run(coro)


# Images synthétiques générées pour les tests : aucune donnée de commerçant.
def image_bytes(fmt="JPEG", size=(800, 600), mode="RGB", color=(200, 40, 40), **save_options):
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, format=fmt, **save_options)
    return buffer.getvalue()


def as_upload(raw, prefix=True):
    encoded = base64.b64encode(raw).decode()
    return f"data:image/jpeg;base64,{encoded}" if prefix else encoded


def decoded(variant_bytes):
    return Image.open(io.BytesIO(variant_bytes))


def expect(test, code, fn, *args, **kwargs):
    with test.assertRaises(MediaServiceError) as ctx:
        result = fn(*args, **kwargs)
        if asyncio.iscoroutine(result):
            run(result)
    test.assertEqual(ctx.exception.code, code, ctx.exception.message)
    return ctx.exception


class ProcessingTests(unittest.TestCase):
    def test_metadata_is_removed_and_orientation_applied(self):
        exif = Image.Exif()
        exif[0x0112] = 6  # Orientation : rotation de 90 degrés.
        exif[0x010F] = "Appareil de test"
        processed = process_image(image_bytes(size=(800, 400), exif=exif.tobytes()), "image")
        self.assertEqual((processed.width, processed.height), (400, 800))
        for variant in processed.variants:
            output = decoded(variant.data)
            self.assertEqual(output.format, "WEBP")
            self.assertEqual(len(output.getexif()), 0)
            self.assertNotIn(b"Appareil de test", variant.data)

    def test_transparency_is_kept_for_logos(self):
        processed = process_image(image_bytes("PNG", (300, 300), "RGBA", (0, 0, 0, 0)), "logo")
        self.assertTrue(processed.has_alpha)
        self.assertEqual(decoded(processed.variants[0].data).mode, "RGBA")

    def test_variants_follow_the_kind_and_are_never_upscaled(self):
        logo = process_image(image_bytes(size=(1000, 1000)), "logo")
        self.assertEqual([variant.width for variant in logo.variants], [96, 192, 384])
        small = process_image(image_bytes(size=(150, 100)), "logo")
        self.assertEqual([(variant.width, variant.height) for variant in small.variants], [(96, 64), (150, 100)])
        banner = process_image(image_bytes(size=(3000, 1000)), "image")
        self.assertEqual([variant.width for variant in banner.variants], [480, 960, 1600, 2400])

    def test_only_fixed_jpeg_png_and_webp_images_are_accepted(self):
        self.assertEqual(process_image(image_bytes("WEBP"), "image").variants[0].width, 480)
        expect(self, "media_format", process_image, image_bytes("GIF", mode="P", color=1), "image")
        animated = io.BytesIO()
        frames = [Image.new("RGB", (64, 64), color) for color in ((255, 0, 0), (0, 0, 255))]
        frames[0].save(animated, format="WEBP", save_all=True, append_images=frames[1:])
        expect(self, "media_animated", process_image, animated.getvalue(), "image")
        expect(self, "media_unreadable", process_image, b'<svg xmlns="http://www.w3.org/2000/svg"></svg>', "image")
        expect(self, "media_unreadable", process_image, b"\x89PNG\r\n\x1a\nnot really", "image")

    def test_technical_bounds_are_enforced(self):
        expect(self, "media_too_small", process_image, image_bytes(size=(16, 400)), "image")
        with mock.patch.object(ecommerce_media, "MAX_PIXELS", 1000):
            expect(self, "media_dimensions", process_image, image_bytes(size=(100, 100)), "image")
        with mock.patch.object(ecommerce_media, "MAX_UPLOAD_BYTES", 100):
            expect(self, "media_too_large", decode_upload, as_upload(image_bytes()))
        expect(self, "media_unreadable", decode_upload, "pas du base64 !")
        expect(self, "media_kind", process_image, image_bytes(), "video")

    def test_alt_text_and_media_urls(self):
        self.assertEqual(normalize_alt("  Vitrine de la boutique  "), "Vitrine de la boutique")
        expect(self, "media_alt", normalize_alt, "Ligne 1\nLigne 2")
        expect(self, "media_alt", normalize_alt, "x" * 201)
        media_id = "med_0123456789abcdef01234567"
        self.assertEqual(parse_media_url(f"https://app.stockman.pro/api/public/ecommerce/media/{media_id}/192.webp"), media_id)
        for other in (None, "", "https://cdn.example.com/logo.png", f"https://app.stockman.pro/api/public/ecommerce/media/{media_id}/192.png"):
            self.assertIsNone(parse_media_url(other))


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 8, 12, 0, tzinfo=timezone.utc)

    def __call__(self):
        return self.now


class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.library = EcommerceMediaLibrary(self.db, base_url=lambda: "https://app.stockman.pro/", clock=Clock())

    def upload(self, raw=None, kind="logo", account="acc_a", slug="boutique-a"):
        return run(self.library.upload(account, slug, data=as_upload(raw or image_bytes()), kind=kind, alt="Logo", author_id="owner_a"))

    def test_upload_stores_variants_and_serves_them_by_immutable_url(self):
        doc = self.upload()
        self.assertRegex(doc["_id"], r"^med_[0-9a-f]{24}$")
        item = self.library.public_item(doc)
        self.assertEqual(item["urls"]["192"], f"https://app.stockman.pro/api/public/ecommerce/media/{doc['_id']}/192.webp")
        self.assertEqual(item["thumbnail_url"], item["urls"]["192"])
        stored = run(self.library.read_file(doc["_id"], 192))
        self.assertEqual(decoded(stored["data"]).width, 192)
        self.assertIsNone(run(self.library.read_file(doc["_id"], 500)))
        self.assertIsNone(run(self.library.read_file("../etc/passwd", 192)))

    def test_same_file_is_reused_and_the_library_is_bounded(self):
        first = self.upload()
        self.assertEqual(self.upload()["_id"], first["_id"])
        self.assertEqual(len(self.db.ecommerce_media.docs), 1)
        with mock.patch.object(ecommerce_media, "MAX_MEDIA_PER_SITE", 2):
            self.upload(image_bytes(color=(1, 2, 3)))
            expect(self, "media_limit", self.upload, image_bytes(color=(4, 5, 6)))

    def test_media_are_isolated_by_account_and_site(self):
        doc = self.upload()
        self.assertIsNone(run(self.library.get("acc_b", "boutique-b", doc["_id"])))
        self.assertIsNone(run(self.library.get("acc_a", "autre-site", doc["_id"])))
        expect(self, "media_not_found", self.library.delete, "acc_b", "boutique-b", doc["_id"], in_use=set())
        self.assertEqual(run(self.library.get_many("acc_b", "boutique-b", [doc["_id"]])), {})

    def test_used_media_cannot_be_deleted_and_unused_media_disappear_with_their_files(self):
        doc = self.upload()
        expect(self, "media_in_use", self.library.delete, "acc_a", "boutique-a", doc["_id"], in_use={doc["_id"]})
        run(self.library.delete("acc_a", "boutique-a", doc["_id"], in_use=set()))
        self.assertEqual(self.db.ecommerce_media.docs, [])
        self.assertEqual(self.db.ecommerce_media_files.docs, [])

    def test_failed_metadata_write_leaves_no_orphan_file(self):
        async def broken_insert(_doc):
            raise RuntimeError("écriture impossible")

        self.db.ecommerce_media.insert_one = broken_insert
        with self.assertRaises(RuntimeError):
            self.upload()
        self.assertEqual(self.db.ecommerce_media_files.docs, [])


MOBILE = compute_theme_capabilities(plan="starter", is_org_admin=True, is_demo=False, can_write_data=True, surface="mobile")
MOBILE["preview"] = True
ACCOUNT = {"account_id": "acc_a"}
SLUG = "boutique-a"


class ThemeMediaTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.service = EcommerceThemeService(self.db, clock=Clock())
        run(self.db.business_accounts.insert_one({"account_id": "acc_a", "ecommerce_slug": SLUG, "ecommerce_enabled": True, "ecommerce_hero_title": "Bienvenue"}))
        run(self.db.users.insert_one({"user_id": "owner_a", "name": "Awa Diop"}))

    def account(self):
        return self.db.business_accounts.docs[0]

    def upload(self, kind="logo", color=(10, 120, 60)):
        return run(self.service.upload_media(ACCOUNT, SLUG, data=as_upload(image_bytes(color=color)), kind=kind, alt=None, capabilities=MOBILE, author_id="owner_a"))

    def with_logo(self, state, media_id):
        document = copy.deepcopy(state["draft"]["document"] if state["draft"] else state["published"]["document"])
        document["global_settings"]["logo_asset_id"] = media_id
        return document

    def save(self, document, state):
        return run(self.service.save_draft(ACCOUNT, SLUG, document=document, expected_lock_version=state["lock_version"], capabilities=MOBILE, author_id="owner_a"))

    def publish(self, state):
        return run(self.service.publish(
            ACCOUNT, SLUG, revision_id=state["draft"]["revision_id"], expected_lock_version=state["lock_version"],
            expected_published_fingerprint=state["published"]["fingerprint"], capabilities=MOBILE, author_id="owner_a",
        ))

    def test_logo_is_checked_previewed_and_published_to_the_historical_field(self):
        logo = self.upload()
        image = self.upload(kind="image", color=(1, 1, 1))
        state = run(self.service.view(ACCOUNT, SLUG, MOBILE))
        with self.assertRaises(ThemeValidationError) as ctx:
            self.save(self.with_logo(state, image["media_id"]), state)
        self.assertEqual(ctx.exception.code, "media_kind_mismatch")

        state = self.save(self.with_logo(state, logo["media_id"]), state)
        self.assertEqual(state["media"][logo["media_id"]]["thumbnail_url"], logo["thumbnail_url"])
        token, _ = run(self.service.create_preview(ACCOUNT, SLUG, source="draft", capabilities=MOBILE, author_id="owner_a"))
        effective, _ = run(self.service.resolve_preview(token))
        expected_url = f"https://app.stockman.pro/api/public/ecommerce/media/{logo['media_id']}/192.webp"
        self.assertEqual(effective["ecommerce_logo_url"], expected_url)
        self.assertNotIn("ecommerce_logo_url", self.account())

        state = self.publish(state)
        self.assertEqual(self.account()["ecommerce_logo_url"], expected_url)
        self.assertEqual(state["published"]["document"]["global_settings"]["logo_asset_id"], logo["media_id"])
        self.assertIsNotNone(state["published"]["revision_id"])
        listing = run(self.service.list_media(ACCOUNT, SLUG, MOBILE, kind="logo"))
        self.assertEqual([(item["media_id"], item["in_use"]) for item in listing["media"]], [(logo["media_id"], True)])
        with self.assertRaises(MediaServiceError) as ctx:
            run(self.service.delete_media(ACCOUNT, SLUG, logo["media_id"], capabilities=MOBILE))
        self.assertEqual(ctx.exception.code, "media_in_use")

        state = self.publish(self.save(self.with_logo(state, None), state))
        self.assertNotIn("ecommerce_logo_url", self.account())
        run(self.service.delete_media(ACCOUNT, SLUG, logo["media_id"], capabilities=MOBILE))

    def test_external_historical_logo_is_never_erased(self):
        self.account()["ecommerce_logo_url"] = "https://cdn.example.com/logo-historique.png"
        state = run(self.service.view(ACCOUNT, SLUG, MOBILE))
        self.assertIsNone(state["published"]["document"]["global_settings"]["logo_asset_id"])
        document = copy.deepcopy(state["published"]["document"])
        document["pages"][0]["sections"][0]["settings"]["hero_title"] = "Nouveau titre"
        state = self.publish(self.save(document, state))
        self.assertEqual(self.account()["ecommerce_logo_url"], "https://cdn.example.com/logo-historique.png")
        self.assertIsNotNone(state["published"]["revision_id"])

    def test_versions_pointing_to_a_deleted_image_cannot_be_restored(self):
        logo = self.upload()
        enterprise = compute_theme_capabilities(plan="enterprise", is_org_admin=True, is_demo=False, can_write_data=True, surface="web")
        enterprise["preview"] = True
        state = run(self.service.view(ACCOUNT, SLUG, enterprise))
        with_logo = self.save(self.with_logo(state, logo["media_id"]), state)
        revision_id = with_logo["draft"]["revision_id"]
        state = run(self.service.discard_draft(ACCOUNT, SLUG, expected_lock_version=with_logo["lock_version"], capabilities=enterprise, author_id="owner_a"))
        run(self.service.delete_media(ACCOUNT, SLUG, logo["media_id"], capabilities=enterprise))
        with self.assertRaises(ThemeValidationError) as ctx:
            run(self.service.restore(ACCOUNT, SLUG, revision_id=revision_id, expected_lock_version=state["lock_version"], capabilities=enterprise, author_id="owner_a"))
        self.assertEqual(ctx.exception.code, "media_not_found")

    def test_media_management_requires_an_editing_channel(self):
        web_starter = compute_theme_capabilities(plan="starter", is_org_admin=True, is_demo=False, can_write_data=True, surface="web")
        with self.assertRaises(Exception) as ctx:
            run(self.service.upload_media(ACCOUNT, SLUG, data=as_upload(image_bytes()), kind="logo", alt=None, capabilities=web_starter, author_id="owner_a"))
        self.assertEqual(getattr(ctx.exception, "code", None), "forbidden")
        self.assertEqual(self.db.ecommerce_media.docs, [])
        listing = run(self.service.list_media(ACCOUNT, SLUG, web_starter))
        self.assertEqual((listing["media"], listing["total"], listing["limit"]), ([], 0, 60))

    def test_projection_reads_a_stockman_logo_url(self):
        media_id = "med_0123456789abcdef01234567"
        document = build_legacy_theme_document({"ecommerce_logo_url": f"https://app.stockman.pro/api/public/ecommerce/media/{media_id}/192.webp"})
        self.assertEqual(document["global_settings"]["logo_asset_id"], media_id)


class PublicRouteTests(unittest.TestCase):
    def test_public_media_route_is_immutable_and_strict(self):
        source = (ROOT / "backend" / "server.py").read_text(encoding="utf-8").replace("\r\n", "\n")
        self.assertIn('"Cache-Control": "public, max-age=31536000, immutable"', source)
        self.assertIn('"X-Content-Type-Options": "nosniff"', source)
        route = re.search(r'@app\.get\("/api/public/ecommerce/media/\{media_id\}/\{filename\}"\)\n(async def [\s\S]*?)(?=\n\n\n)', source).group(1)
        self.assertIn('pattern="^med_[0-9a-f]{24}$"', route)
        self.assertIn('pattern="^[0-9]{2,4}[.]webp$"', route)
        self.assertIn('media_type="image/webp"', route)


if __name__ == "__main__":
    unittest.main()
