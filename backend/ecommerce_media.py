"""Bibliothèque de médias des sites e-commerce.

- Le type réel est détecté par décodage, jamais par l'extension ou le type annoncé : seules les
  images JPEG, PNG et WebP fixes sont acceptées (pas de SVG, d'animation ni de fichier illisible).
- L'orientation est appliquée puis l'image est réencodée : les métadonnées (EXIF, GPS, profils)
  disparaissent, la transparence est conservée.
- Chaque média produit des variantes WebP de largeurs fixes, jamais agrandies. Une URL désigne un
  contenu qui ne change jamais : elle peut être mise en cache un an.
- Les fichiers sont conservés dans MongoDB, sans fournisseur supplémentaire. Les identifiants et les
  URL ne dépendent pas du stockage : un stockage objet pourra le remplacer plus tard.
- Les bornes ci-dessous sont des protections techniques, pas des quotas commerciaux.
"""

import base64
import binascii
import hashlib
import io
import re
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Set

from PIL import Image, ImageOps, UnidentifiedImageError

MEDIA_KINDS: Dict[str, Sequence[int]] = {
    # Logo : affiché en petit, net sur les écrans haute densité.
    "logo": (96, 192, 384),
    # Image de section : bannières et visuels, du mobile au grand écran.
    "image": (480, 960, 1600, 2400),
}
ACCEPTED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 60_000_000
MIN_SIDE = 32
MAX_MEDIA_PER_SITE = 60
ALT_MAX_LENGTH = 200
WEBP_QUALITY = 82
MEDIA_ID_RE = re.compile(r"^med_[0-9a-f]{24}$")
MEDIA_PATH_RE = re.compile(r"/api/public/ecommerce/media/(med_[0-9a-f]{24})/(\d{2,4})\.webp$")
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")


class MediaServiceError(Exception):
    """Refus stable pour les clients : statut HTTP, code et message en français."""

    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message

    def as_dict(self) -> Dict[str, str]:
        return {"code": self.code, "message": self.message}


@dataclass
class MediaVariant:
    width: int
    height: int
    data: bytes = field(repr=False)


@dataclass
class ProcessedImage:
    width: int
    height: int
    has_alpha: bool
    content_hash: str
    variants: List[MediaVariant]


def media_path(media_id: str, width: int) -> str:
    return f"/api/public/ecommerce/media/{media_id}/{width}.webp"


def parse_media_url(url: Any) -> Optional[str]:
    """Identifiant d'un média Stockman à partir de son URL publique, ou None pour toute autre adresse."""
    if not isinstance(url, str):
        return None
    match = MEDIA_PATH_RE.search(url)
    return match.group(1) if match else None


def decode_upload(data: Any) -> bytes:
    """Décode un envoi base64, avec ou sans préfixe ``data:``, en refusant tout contenu invalide."""
    if not isinstance(data, str) or not data:
        raise MediaServiceError(422, "media_unreadable", "Ce fichier n'est pas une image lisible.")
    payload = data.split(",", 1)[1] if data.startswith("data:") and "," in data else data
    payload = re.sub(r"\s+", "", payload)
    if len(payload) * 3 // 4 > MAX_UPLOAD_BYTES + 3:
        raise MediaServiceError(413, "media_too_large", "Image trop lourde : 8 Mo maximum.")
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        raise MediaServiceError(422, "media_unreadable", "Ce fichier n'est pas une image lisible.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise MediaServiceError(413, "media_too_large", "Image trop lourde : 8 Mo maximum.")
    return raw


def process_image(raw: bytes, kind: str) -> ProcessedImage:
    if kind not in MEDIA_KINDS:
        raise MediaServiceError(422, "media_kind", "Type de média inconnu.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise MediaServiceError(413, "media_too_large", "Image trop lourde : 8 Mo maximum.")
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            image_format = probe.format
            width, height = probe.size
            animated = bool(getattr(probe, "is_animated", False)) and getattr(probe, "n_frames", 1) > 1
            probe.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise MediaServiceError(422, "media_unreadable", "Ce fichier n'est pas une image lisible.")
    if image_format not in ACCEPTED_FORMATS:
        raise MediaServiceError(415, "media_format", "Format non pris en charge : utilisez une image JPEG, PNG ou WebP.")
    if animated:
        raise MediaServiceError(415, "media_animated", "Les images animées ne sont pas prises en charge.")
    if width * height > MAX_PIXELS:
        raise MediaServiceError(413, "media_dimensions", "Image trop grande : 60 mégapixels maximum.")
    if min(width, height) < MIN_SIDE:
        raise MediaServiceError(422, "media_too_small", "Image trop petite : 32 pixels minimum de côté.")

    try:
        with Image.open(io.BytesIO(raw)) as source:
            image = ImageOps.exif_transpose(source)
            has_alpha = image.mode in ("RGBA", "LA", "PA") or (image.mode == "P" and "transparency" in image.info)
            image = image.convert("RGBA" if has_alpha else "RGB")
            variants: List[MediaVariant] = []
            for target in MEDIA_KINDS[kind]:
                variant_width = min(target, image.width)
                if variants and variants[-1].width == variant_width:
                    continue
                variant_height = max(1, round(image.height * variant_width / image.width))
                resized = image if variant_width == image.width else image.resize((variant_width, variant_height), Image.Resampling.LANCZOS)
                buffer = io.BytesIO()
                # Réencodage complet : aucune métadonnée de l'original n'est recopiée.
                resized.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=4)
                variants.append(MediaVariant(width=variant_width, height=variant_height, data=buffer.getvalue()))
            final_width, final_height = image.size
    except (OSError, ValueError, Image.DecompressionBombError):
        raise MediaServiceError(422, "media_unreadable", "Ce fichier n'est pas une image lisible.")
    return ProcessedImage(
        width=final_width,
        height=final_height,
        has_alpha=has_alpha,
        content_hash=hashlib.sha256(raw).hexdigest(),
        variants=variants,
    )


def normalize_alt(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise MediaServiceError(422, "media_alt", "Texte alternatif invalide.")
    text = value.strip()
    if len(text) > ALT_MAX_LENGTH:
        raise MediaServiceError(422, "media_alt", f"Texte alternatif limité à {ALT_MAX_LENGTH} caractères.")
    if _CONTROL_RE.search(text):
        raise MediaServiceError(422, "media_alt", "Le texte alternatif tient sur une seule ligne.")
    return text


def _iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).isoformat()
    return None


class EcommerceMediaLibrary:
    def __init__(self, db, base_url: Callable[[], str], clock: Optional[Callable[[], datetime]] = None):
        self.media = db.ecommerce_media
        self.files = db.ecommerce_media_files
        self.base_url = base_url
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    async def ensure_indexes(self) -> None:
        await self.media.create_index([("account_id", 1), ("site_slug", 1), ("created_at", -1)])
        await self.media.create_index([("account_id", 1), ("site_slug", 1), ("content_hash", 1), ("kind", 1)])
        await self.files.create_index("media_id")

    def url(self, media_id: str, width: int) -> str:
        return f"{self.base_url().rstrip('/')}{media_path(media_id, width)}"

    def public_item(self, doc: Mapping[str, Any], *, in_use: bool = False) -> Dict[str, Any]:
        variants = sorted(doc.get("variants", []), key=lambda item: item["width"])
        urls = {str(item["width"]): self.url(doc["_id"], item["width"]) for item in variants}
        thumbnail = next((item for item in variants if item["width"] >= 192), variants[-1] if variants else None)
        return {
            "media_id": doc["_id"],
            "kind": doc.get("kind"),
            "alt": doc.get("alt") or "",
            "width": doc.get("width"),
            "height": doc.get("height"),
            "has_alpha": bool(doc.get("has_alpha")),
            "urls": urls,
            "thumbnail_url": self.url(doc["_id"], thumbnail["width"]) if thumbnail else None,
            "created_at": _iso(doc.get("created_at")),
            "in_use": in_use,
        }

    def display_url(self, doc: Mapping[str, Any], minimum_width: int) -> Optional[str]:
        variants = sorted(doc.get("variants", []), key=lambda item: item["width"])
        if not variants:
            return None
        chosen = next((item for item in variants if item["width"] >= minimum_width), variants[-1])
        return self.url(doc["_id"], chosen["width"])

    async def get(self, account_id: str, slug: str, media_id: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(media_id, str) or not MEDIA_ID_RE.match(media_id):
            return None
        return await self.media.find_one({"_id": media_id, "account_id": account_id, "site_slug": slug})

    async def get_many(self, account_id: str, slug: str, media_ids: Iterable[str]) -> Dict[str, Dict[str, Any]]:
        ids = sorted({media_id for media_id in media_ids if isinstance(media_id, str) and MEDIA_ID_RE.match(media_id)})
        if not ids:
            return {}
        docs = await self.media.find({"_id": {"$in": ids}, "account_id": account_id, "site_slug": slug}).to_list(len(ids))
        return {doc["_id"]: doc for doc in docs}

    async def list(self, account_id: str, slug: str, *, in_use: Set[str], kind: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"account_id": account_id, "site_slug": slug}
        if kind:
            query["kind"] = kind
        docs = await self.media.find(query).sort("created_at", -1).limit(MAX_MEDIA_PER_SITE).to_list(MAX_MEDIA_PER_SITE)
        return [self.public_item(doc, in_use=doc["_id"] in in_use) for doc in docs]

    async def count(self, account_id: str, slug: str) -> int:
        return await self.media.count_documents({"account_id": account_id, "site_slug": slug})

    async def upload(self, account_id: str, slug: str, *, data: Any, kind: str, alt: Any, author_id: str) -> Dict[str, Any]:
        alt_text = normalize_alt(alt)
        if kind not in MEDIA_KINDS:
            raise MediaServiceError(422, "media_kind", "Type de média inconnu.")
        raw = decode_upload(data)
        processed = process_image(raw, kind)
        existing = await self.media.find_one({"account_id": account_id, "site_slug": slug, "content_hash": processed.content_hash, "kind": kind})
        if existing:
            # Même fichier envoyé deux fois : le média existant est réutilisé.
            return existing
        if await self.count(account_id, slug) >= MAX_MEDIA_PER_SITE:
            raise MediaServiceError(409, "media_limit", f"La bibliothèque contient déjà {MAX_MEDIA_PER_SITE} images. Supprimez une image inutilisée.")
        media_id = f"med_{secrets.token_hex(12)}"
        now = self.clock()
        stored: List[str] = []
        try:
            # Les fichiers sont écrits avant la fiche : une fiche ne désigne jamais un fichier absent.
            for variant in processed.variants:
                file_id = f"{media_id}:{variant.width}"
                await self.files.insert_one({
                    "_id": file_id, "media_id": media_id, "account_id": account_id,
                    "content_type": "image/webp", "bytes": len(variant.data), "data": variant.data, "created_at": now,
                })
                stored.append(file_id)
            doc = {
                "_id": media_id, "account_id": account_id, "site_slug": slug, "kind": kind, "alt": alt_text,
                "width": processed.width, "height": processed.height, "has_alpha": processed.has_alpha,
                "original_bytes": len(raw), "content_hash": processed.content_hash,
                "variants": [{"width": item.width, "height": item.height, "bytes": len(item.data)} for item in processed.variants],
                "created_by": author_id, "created_at": now, "updated_at": now,
            }
            await self.media.insert_one(doc)
        except Exception:
            for file_id in stored:
                await self.files.delete_one({"_id": file_id})
            raise
        return doc

    async def update_alt(self, account_id: str, slug: str, media_id: str, alt: Any) -> Dict[str, Any]:
        alt_text = normalize_alt(alt)
        doc = await self.get(account_id, slug, media_id)
        if not doc:
            raise MediaServiceError(404, "media_not_found", "Cette image n'existe pas dans la bibliothèque.")
        await self.media.update_one({"_id": media_id, "account_id": account_id}, {"$set": {"alt": alt_text, "updated_at": self.clock()}})
        doc["alt"] = alt_text
        return doc

    async def delete(self, account_id: str, slug: str, media_id: str, *, in_use: Set[str]) -> None:
        doc = await self.get(account_id, slug, media_id)
        if not doc:
            raise MediaServiceError(404, "media_not_found", "Cette image n'existe pas dans la bibliothèque.")
        if media_id in in_use:
            raise MediaServiceError(409, "media_in_use", "Cette image est utilisée par le site publié ou par le brouillon. Retirez-la d'abord.")
        await self.media.delete_one({"_id": media_id, "account_id": account_id})
        for variant in doc.get("variants", []):
            await self.files.delete_one({"_id": f"{media_id}:{variant['width']}"})

    async def read_file(self, media_id: str, width: int) -> Optional[Dict[str, Any]]:
        if not MEDIA_ID_RE.match(media_id or ""):
            return None
        return await self.files.find_one({"_id": f"{media_id}:{width}"})
