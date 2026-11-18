"""Catalogue public des boutiques en ligne.

Les photos des produits sont enregistrées dans la fiche produit, sous forme de texte (data URI).
Les recopier dans le catalogue public l'alourdissait de dizaines de kilo-octets par produit :
le catalogue donne désormais l'adresse de chaque photo, servie à part et mise en cache.

Le même module fournit la fiche d'un produit seul (page produit partageable) et la liste des
produits pour le plan du site.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Au-delà, le catalogue public est tronqué et le signale (« catalog.truncated »).
PUBLIC_CATALOG_LIMIT = 5000
PRODUCT_ID_PATTERN = "^[A-Za-z0-9_-]{3,80}$"
_PRODUCT_ID_RE = re.compile(PRODUCT_ID_PATTERN)
_DATA_IMAGE_RE = re.compile(r"^data:(image/(?:jpeg|jpg|png|webp|gif));base64,", re.IGNORECASE)
_EXTERNAL_IMAGE_RE = re.compile(r"^https?://", re.IGNORECASE)
# Une photo de produit compressée par Stockman pèse moins de 200 Ko ; au-delà, elle n'est pas servie.
MAX_IMAGE_BYTES = 5 * 1024 * 1024

_LIST_FIELDS = {
    "_id": 0,
    "product_id": 1,
    "name": 1,
    "description": 1,
    "selling_price": 1,
    "quantity": 1,
    "unit": 1,
    "category_id": 1,
    "updated_at": 1,
}


def is_valid_product_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_PRODUCT_ID_RE.match(value))


def public_products_query(owner_id: str, store_id: Optional[str], show_out_of_stock: bool) -> Dict[str, Any]:
    """Produits visibles sur le site public : actifs, avec un prix, et en stock sauf réglage contraire."""
    query: Dict[str, Any] = {
        "user_id": owner_id,
        "store_id": store_id,
        "is_active": {"$ne": False},
        "selling_price": {"$gt": 0},
    }
    if not show_out_of_stock:
        query["quantity"] = {"$gt": 0}
    return query


def _version(updated_at: Any) -> str:
    # Change à chaque modification de la fiche : une nouvelle photo a une nouvelle adresse.
    if isinstance(updated_at, datetime):
        return str(int(updated_at.timestamp()))
    if isinstance(updated_at, str) and updated_at:
        return hashlib.sha1(updated_at.encode("utf-8")).hexdigest()[:10]
    return "0"


def product_image_path(slug: str, product_id: str, updated_at: Any) -> str:
    return f"/api/public/ecommerce/{slug}/products/{product_id}/image?v={_version(updated_at)}"


def image_kind(value: Any) -> Optional[str]:
    """« embedded » pour une photo enregistrée dans la fiche, « external » pour une adresse web."""
    if not isinstance(value, str) or not value:
        return None
    if _DATA_IMAGE_RE.match(value):
        return "embedded"
    if _EXTERNAL_IMAGE_RE.match(value):
        return "external"
    return None


def decode_embedded_image(value: Any) -> Optional[Tuple[bytes, str]]:
    """Octets et type d'une photo enregistrée dans la fiche ; None si elle est illisible."""
    if not isinstance(value, str):
        return None
    match = _DATA_IMAGE_RE.match(value)
    if not match:
        return None
    media_type = match.group(1).lower().replace("image/jpg", "image/jpeg")
    encoded = value[match.end():]
    if len(encoded) > MAX_IMAGE_BYTES * 4 // 3 + 4:
        return None
    try:
        data = base64.b64decode(encoded, validate=False)
    except (binascii.Error, ValueError):
        return None
    if not data:
        return None
    return data, media_type


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def shape_product(doc: Dict[str, Any], category_name: Optional[str], image: Optional[str]) -> Dict[str, Any]:
    quantity = _number(doc.get("quantity"))
    return {
        "product_id": doc.get("product_id"),
        "name": doc.get("name"),
        "description": doc.get("description"),
        "selling_price": _number(doc.get("selling_price")),
        "quantity": quantity,
        "unit": doc.get("unit") or "piece",
        "image": image,
        "category": category_name,
        "available": quantity > 0,
    }


class PublicCatalog:
    def __init__(self, db: Any):
        self.db = db

    async def _category_names(self, owner_id: str, docs: List[Dict[str, Any]]) -> Dict[str, str]:
        ids = sorted({doc.get("category_id") for doc in docs if doc.get("category_id")})
        if not ids:
            return {}
        rows = await self.db.categories.find(
            {"category_id": {"$in": ids}, "user_id": owner_id},
            {"_id": 0, "category_id": 1, "name": 1},
        ).to_list(len(ids))
        return {row.get("category_id"): row.get("name") for row in rows}

    async def list_products(
        self,
        owner_id: str,
        store_id: Optional[str],
        show_out_of_stock: bool,
        slug: str,
        inline_images: bool = False,
    ) -> Dict[str, Any]:
        """Catalogue public trié par nom. inline_images : photos recopiées telles quelles (aperçu privé,
        dont le site peut ne pas être en ligne et donc ne pas servir les photos par adresse)."""
        query = public_products_query(owner_id, store_id, show_out_of_stock)
        projection = dict(_LIST_FIELDS)
        if inline_images:
            projection["image"] = 1
        docs = await self.db.products.find(query, projection).sort("name", 1).limit(PUBLIC_CATALOG_LIMIT).to_list(PUBLIC_CATALOG_LIMIT)
        total = len(docs)
        if total >= PUBLIC_CATALOG_LIMIT:
            total = await self.db.products.count_documents(query)

        images: Dict[str, Optional[str]] = {}
        if inline_images:
            images = {doc.get("product_id"): doc.get("image") if image_kind(doc.get("image")) else None for doc in docs}
        else:
            # Deux lectures légères : les photos enregistrées ne sont jamais chargées ici.
            ids = [doc.get("product_id") for doc in docs]
            embedded = await self.db.products.find(
                {**query, "product_id": {"$in": ids}, "image": {"$regex": "^data:image/"}},
                {"_id": 0, "product_id": 1},
            ).to_list(len(ids) or 1)
            embedded_ids = {row.get("product_id") for row in embedded}
            external = await self.db.products.find(
                {**query, "product_id": {"$in": ids}, "image": {"$regex": "^https?://"}},
                {"_id": 0, "product_id": 1, "image": 1},
            ).to_list(len(ids) or 1)
            images = {row.get("product_id"): row.get("image") for row in external}
            for doc in docs:
                if doc.get("product_id") in embedded_ids:
                    images[doc.get("product_id")] = product_image_path(slug, doc.get("product_id"), doc.get("updated_at"))

        categories = await self._category_names(owner_id, docs)
        products = [shape_product(doc, categories.get(doc.get("category_id")), images.get(doc.get("product_id"))) for doc in docs]
        return {"products": products, "total": total, "truncated": total > len(products)}

    async def get_product(
        self,
        owner_id: str,
        store_id: Optional[str],
        show_out_of_stock: bool,
        slug: str,
        product_id: str,
    ) -> Optional[Dict[str, Any]]:
        if not is_valid_product_id(product_id):
            return None
        query = {**public_products_query(owner_id, store_id, show_out_of_stock), "product_id": product_id}
        doc = await self.db.products.find_one(query, {**_LIST_FIELDS, "image": 1})
        if not doc:
            return None
        kind = image_kind(doc.get("image"))
        image = None
        if kind == "embedded":
            image = product_image_path(slug, product_id, doc.get("updated_at"))
        elif kind == "external":
            image = doc.get("image")
        categories = await self._category_names(owner_id, [doc])
        return shape_product(doc, categories.get(doc.get("category_id")), image)

    async def read_image(
        self,
        owner_id: str,
        store_id: Optional[str],
        show_out_of_stock: bool,
        product_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Photo d'un produit publié : {data, media_type, etag} ou {redirect} pour une adresse web."""
        if not is_valid_product_id(product_id):
            return None
        query = {**public_products_query(owner_id, store_id, show_out_of_stock), "product_id": product_id}
        doc = await self.db.products.find_one(query, {"_id": 0, "image": 1})
        value = (doc or {}).get("image")
        kind = image_kind(value)
        if kind == "external":
            return {"redirect": value}
        if kind != "embedded":
            return None
        decoded = decode_embedded_image(value)
        if not decoded:
            return None
        data, media_type = decoded
        return {"data": data, "media_type": media_type, "etag": hashlib.sha256(data).hexdigest()[:32]}

    async def sitemap_products(self, owner_id: str, store_id: Optional[str], show_out_of_stock: bool) -> List[Dict[str, Any]]:
        query = public_products_query(owner_id, store_id, show_out_of_stock)
        docs = await self.db.products.find(
            query,
            {"_id": 0, "product_id": 1, "name": 1, "updated_at": 1},
        ).sort("name", 1).limit(PUBLIC_CATALOG_LIMIT).to_list(PUBLIC_CATALOG_LIMIT)
        rows = []
        for doc in docs:
            updated_at = doc.get("updated_at")
            rows.append({
                "product_id": doc.get("product_id"),
                "updated_at": updated_at.isoformat() if isinstance(updated_at, datetime) else None,
            })
        return rows
