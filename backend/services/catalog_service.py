"""
Catalogue Global Communautaire — Service
Gère la collection `global_catalog` :
  - Contribution automatique (anonymisée) quand un commerçant crée un produit
  - Browse par secteur / pays
  - Lookup code-barres (multi-EAN)
  - Normalisation IA des noms pour éviter les doublons
  - Template CSV pré-rempli
"""
import csv
import io
import logging
import re
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from collections import defaultdict

import google.generativeai as genai

from constants.sectors import BUSINESS_SECTORS, normalize_sector

logger = logging.getLogger(__name__)


class CatalogService:
    def __init__(self, db):
        self.db = db

    # ──────────────────────────────────────────────────────────────────────────
    # INDEXES  (appelé au démarrage du serveur)
    # ──────────────────────────────────────────────────────────────────────────
    async def create_indexes(self):
        """Crée les index MongoDB nécessaires pour la performance."""
        col = self.db.global_catalog
        await col.create_index("catalog_id", unique=True)
        await col.create_index("barcodes")                     # lookup rapide
        await col.create_index("canonical_name")               # déduplication
        await col.create_index([("sector", 1), ("country_codes", 1)])  # browse
        await col.create_index("added_by_count")               # tri popularité
        logger.info("Global catalog indexes created")

    # ──────────────────────────────────────────────────────────────────────────
    # CONTRIBUTION  — enrichit le catalogue quand un commerçant crée un produit
    # ──────────────────────────────────────────────────────────────────────────
    async def contribute_product(
        self,
        name: str,
        barcode: Optional[str],
        category: Optional[str],
        sector: str,
        country_code: str,
        image_url: Optional[str] = None,
    ):
        """
        Ajoute (ou met à jour) un produit dans le catalogue global.
        Déduplique par code-barres d'abord, puis par nom canonique.
        Ne stocke AUCUNE donnée commerciale (prix, stock, marges).
        """
        sector = normalize_sector(sector)
        canonical = self._simple_normalize(name)

        if not canonical or len(canonical) < 2:
            return  # Nom trop court, on ignore

        col = self.db.global_catalog

        # 1. Chercher par code-barres exact
        existing = None
        if barcode and barcode.strip():
            barcode = barcode.strip()
            existing = await col.find_one({"barcodes": barcode})

        # 2. Sinon, chercher par nom canonique + même secteur
        if not existing:
            existing = await col.find_one({
                "canonical_name": canonical,
                "sector": sector,
            })

        if existing:
            # Mettre à jour : incrémenter le compteur, ajouter le barcode/alias/pays
            update_ops: Dict[str, Any] = {
                "$inc": {"added_by_count": 1},
            }
            add_to_set: Dict[str, Any] = {}
            if country_code:
                add_to_set["country_codes"] = country_code
            if barcode and barcode not in existing.get("barcodes", []):
                add_to_set["barcodes"] = barcode
            alias_lower = name.strip().lower()
            if alias_lower not in [a.lower() for a in existing.get("aliases", [])]:
                add_to_set["aliases"] = name.strip()
            if image_url and not existing.get("image_url"):
                update_ops["$set"] = {"image_url": image_url}

            if add_to_set:
                update_ops["$addToSet"] = add_to_set

            await col.update_one({"_id": existing["_id"]}, update_ops)
        else:
            # Créer une nouvelle entrée
            doc = {
                "catalog_id": f"gcat_{uuid.uuid4().hex[:12]}",
                "canonical_name": canonical,
                "display_name": name.strip(),
                "barcodes": [barcode] if barcode and barcode.strip() else [],
                "aliases": [name.strip()],
                "category": category or "",
                "sector": sector,
                "country_codes": [country_code] if country_code else [],
                "image_url": image_url,
                "added_by_count": 1,
                "verified": False,
                "created_at": datetime.now(timezone.utc),
            }
            await col.insert_one(doc)

    async def contribute_products_batch(
        self,
        products: List[Dict[str, Any]],
        sector: str,
        country_code: str,
    ):
        """Contribution en lot (après import CSV par ex.)."""
        for p in products:
            try:
                await self.contribute_product(
                    name=p.get("name", ""),
                    barcode=p.get("barcode") or p.get("sku"),
                    category=p.get("category"),
                    sector=sector,
                    country_code=country_code,
                    image_url=p.get("image_url"),
                )
            except Exception as e:
                logger.error(f"Catalog contribute error for '{p.get('name')}': {e}")

    # ──────────────────────────────────────────────────────────────────────────
    # BROWSE  — lister les produits du catalogue par secteur / pays
    # ──────────────────────────────────────────────────────────────────────────
    async def browse(
        self,
        sector: str,
        country_code: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """Retourne les produits du catalogue triés par popularité."""
        sector = normalize_sector(sector)
        query: Dict[str, Any] = {"sector": sector}

        if country_code:
            query["country_codes"] = country_code

        if search and search.strip():
            import re
            safe = re.escape(search.strip())
            query["$or"] = [
                {"display_name": {"$regex": safe, "$options": "i"}},
                {"aliases": {"$regex": safe, "$options": "i"}},
                {"barcodes": search.strip()},
            ]

        total = await self.db.global_catalog.count_documents(query)
        cursor = self.db.global_catalog.find(
            query, {"_id": 0, "aliases": 0}
        ).sort("added_by_count", -1).skip(skip).limit(limit)

        products = await cursor.to_list(limit)
        return {"products": products, "total": total}

    # ──────────────────────────────────────────────────────────────────────────
    # LOOKUP  — recherche par code-barres
    # ──────────────────────────────────────────────────────────────────────────
    async def lookup_barcode(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Cherche un produit dans le catalogue global par code-barres."""
        if not barcode or not barcode.strip():
            return None
        doc = await self.db.global_catalog.find_one(
            {"barcodes": barcode.strip()},
            {"_id": 0, "aliases": 0},
        )
        return doc

    # ──────────────────────────────────────────────────────────────────────────
    # SECTORS  — liste des secteurs avec comptage
    # ──────────────────────────────────────────────────────────────────────────
    async def get_sectors_with_counts(self) -> List[Dict[str, Any]]:
        """Retourne la liste des secteurs avec le nombre de produits dans chacun."""
        pipeline = [
            {"$group": {"_id": "$sector", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await self.db.global_catalog.aggregate(pipeline).to_list(50)
        counts = {r["_id"]: r["count"] for r in results}

        sectors = []
        for key, info in BUSINESS_SECTORS.items():
            sectors.append({
                "key": key,
                "label": info["label"],
                "icon": info["icon"],
                "product_count": counts.get(key, 0),
            })
        return sectors

    # ──────────────────────────────────────────────────────────────────────────
    # IMPORT  — importer des produits du catalogue dans le compte d'un commerçant
    # ──────────────────────────────────────────────────────────────────────────
    async def import_to_user(
        self,
        catalog_ids: List[str],
        user_id: str,
        store_id: str,
    ) -> Dict[str, Any]:
        """
        Copie les produits sélectionnés du catalogue global dans le compte
        d'un commerçant. Prix = 0, Stock = 0.
        """
        if not catalog_ids:
            return {"imported": 0}

        catalog_products = await self.db.global_catalog.find(
            {"catalog_id": {"$in": catalog_ids}}, {"_id": 0}
        ).to_list(len(catalog_ids))

        created = 0
        for cp in catalog_products:
            # Vérifier qu'un produit avec ce nom n'existe pas déjà
            existing = await self.db.products.find_one({
                "user_id": user_id,
                "store_id": store_id,
                "name": cp["display_name"],
            })
            if existing:
                continue

            product = {
                "product_id": str(uuid.uuid4()),
                "user_id": user_id,
                "store_id": store_id,
                "name": cp["display_name"],
                "barcode": cp["barcodes"][0] if cp.get("barcodes") else None,
                "sku": cp["barcodes"][0] if cp.get("barcodes") else None,
                "category": cp.get("category", ""),
                "category_id": None,
                "purchase_price": 0,
                "selling_price": 0,
                "quantity": 0,
                "min_stock": 0,
                "image_url": cp.get("image_url"),
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            await self.db.products.insert_one(product)
            created += 1

        return {"imported": created, "total_requested": len(catalog_ids)}

    async def import_all_sector(
        self,
        sector: str,
        country_code: Optional[str],
        user_id: str,
        store_id: str,
    ) -> Dict[str, Any]:
        """Importe TOUS les produits d'un secteur/pays dans le compte."""
        sector = normalize_sector(sector)
        query: Dict[str, Any] = {"sector": sector}
        if country_code:
            query["country_codes"] = country_code

        catalog_products = await self.db.global_catalog.find(
            query, {"catalog_id": 1, "_id": 0}
        ).to_list(5000)

        ids = [cp["catalog_id"] for cp in catalog_products]
        return await self.import_to_user(ids, user_id, store_id)

    # ──────────────────────────────────────────────────────────────────────────
    # TEMPLATE CSV  — fichier pré-rempli pour import classique
    # ──────────────────────────────────────────────────────────────────────────
    async def generate_csv_template(
        self,
        sector: Optional[str] = None,
        country_code: Optional[str] = None,
        lang: str = "fr",
    ) -> str:
        """
        Génère un template CSV. Si un secteur est fourni,
        pré-remplit avec les produits populaires du catalogue (prix=0).
        """
        headers = {
            "fr": ["Nom", "Code-barres", "Catégorie", "Prix Achat", "Prix Vente", "Quantité", "Stock Minimum"],
            "en": ["Name", "Barcode", "Category", "Purchase Price", "Selling Price", "Quantity", "Min Stock"],
        }
        cols = headers.get(lang, headers["fr"])
        if lang == "en":
            cols = cols + ["Location"]
        else:
            cols = cols + ["Emplacement"]

        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        writer.writerow(cols)

        if sector:
            sector = normalize_sector(sector)
            query: Dict[str, Any] = {"sector": sector}
            if country_code:
                query["country_codes"] = country_code

            products = await self.db.global_catalog.find(
                query, {"_id": 0}
            ).sort("added_by_count", -1).limit(200)

            async for p in products:
                barcode = p["barcodes"][0] if p.get("barcodes") else ""
                writer.writerow([
                    p.get("display_name", ""),
                    barcode,
                    p.get("category", ""),
                    0,   # Prix achat — le commerçant remplit
                    0,   # Prix vente — le commerçant remplit
                    0,   # Quantité — le commerçant remplit
                    0,   # Stock minimum
                    "",
                ])

        return output.getvalue()

    # ──────────────────────────────────────────────────────────────────────────
    # ADMIN  — modération du catalogue
    # ──────────────────────────────────────────────────────────────────────────
    async def admin_stats(self) -> Dict[str, Any]:
        """Stats globales pour le back-office admin."""
        docs = await self.db.global_catalog.find({}, {"_id": 0}).to_list(5000)
        total = len(docs)
        verified = len([doc for doc in docs if doc.get("verified") is True])

        # Par secteur
        sector_pipeline = [
            {"$group": {"_id": "$sector", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        by_sector = await self.db.global_catalog.aggregate(sector_pipeline).to_list(50)

        # Par pays
        country_pipeline = [
            {"$unwind": "$country_codes"},
            {"$group": {"_id": "$country_codes", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        by_country = await self.db.global_catalog.aggregate(country_pipeline).to_list(50)

        by_status: Dict[str, int] = defaultdict(int)
        assistant = {
            "missing_image": 0,
            "missing_category": 0,
            "missing_price": 0,
            "missing_unit": 0,
            "missing_marketplace_link": 0,
            "duplicates_probable": 0,
            "incomplete": 0,
        }
        seen_pairs = set()
        probable_duplicates = 0
        for doc in docs:
            status = doc.get("publication_status") or "draft"
            by_status[status] += 1
            completeness = self._compute_completeness_flags(doc)
            if completeness["missing_image"]:
                assistant["missing_image"] += 1
            if completeness["missing_category"]:
                assistant["missing_category"] += 1
            if completeness["missing_price"]:
                assistant["missing_price"] += 1
            if completeness["missing_unit"]:
                assistant["missing_unit"] += 1
            if completeness["missing_marketplace_link"]:
                assistant["missing_marketplace_link"] += 1
            if completeness["incomplete"]:
                assistant["incomplete"] += 1
            pair = (doc.get("sector") or "autre", doc.get("canonical_name") or "")
            if pair[1]:
                if pair in seen_pairs:
                    probable_duplicates += 1
                else:
                    seen_pairs.add(pair)
        assistant["duplicates_probable"] = probable_duplicates

        total_adoptions = sum(doc.get("added_by_count") or 0 for doc in docs)
        completeness_scores = [
            self._compute_completeness_flags(doc).get("score", 0) for doc in docs
        ]
        avg_completeness = round(sum(completeness_scores) / len(completeness_scores)) if completeness_scores else 0
        published_count = by_status.get("published", 0)

        return {
            "total_products": total,
            "verified_products": verified,
            "unverified_products": total - verified,
            "published_products": published_count,
            "total_adoptions": total_adoptions,
            "avg_completeness": avg_completeness,
            "by_sector": {r["_id"]: r["count"] for r in by_sector},
            "by_country": {r["_id"]: r["count"] for r in by_country},
            "by_status": dict(by_status),
            "assistant": assistant,
        }

    async def admin_list(
        self,
        sector: Optional[str] = None,
        verified: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        country: Optional[str] = None,
        publication_status: Optional[str] = None,
        assistant_bucket: Optional[str] = None,
        tag: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Liste paginée pour l'admin."""
        query: Dict[str, Any] = {}
        if sector:
            query["sector"] = normalize_sector(sector)
        if country:
            query["country_codes"] = country.strip().upper()
        if verified is not None:
            query["verified"] = verified
        if publication_status:
            query["publication_status"] = publication_status
        if tag:
            query["tags"] = tag.strip().lower()
        if search and search.strip():
            import re
            safe = re.escape(search.strip())
            query["$or"] = [
                {"display_name": {"$regex": safe, "$options": "i"}},
                {"barcodes": search.strip()},
                {"aliases": {"$regex": safe, "$options": "i"}},
                {"tags": {"$regex": safe, "$options": "i"}},
            ]

        products = await self.db.global_catalog.find(
            query, {"_id": 0}
        ).sort("added_by_count", -1).to_list(5000)

        if assistant_bucket:
            products = [
                product for product in products
                if self._matches_assistant_bucket(product, assistant_bucket)
            ]

        total = len(products)
        products = products[skip: skip + limit]
        for product in products:
            product["completeness"] = self._compute_completeness_flags(product)
            product["supplier_suggestions_count"] = len(product.get("supplier_suggestions") or [])

        return {"products": products, "total": total}

    async def admin_verify(self, catalog_id: str) -> bool:
        result = await self.db.global_catalog.update_one(
            {"catalog_id": catalog_id},
            {"$set": {"verified": True}},
        )
        return result.modified_count > 0

    async def admin_delete(self, catalog_id: str) -> bool:
        result = await self.db.global_catalog.delete_one({"catalog_id": catalog_id})
        return result.deleted_count > 0

    async def admin_merge(self, keep_id: str, merge_ids: List[str]) -> Dict[str, Any]:
        """
        Fusionne plusieurs entrées du catalogue en une seule.
        Conserve `keep_id`, absorbe les barcodes/aliases/pays des autres.
        """
        keep = await self.db.global_catalog.find_one({"catalog_id": keep_id})
        if not keep:
            return {"error": "Produit principal introuvable"}

        to_merge = await self.db.global_catalog.find(
            {"catalog_id": {"$in": merge_ids}}
        ).to_list(len(merge_ids))

        all_barcodes = set(keep.get("barcodes", []))
        all_aliases = set(keep.get("aliases", []))
        all_countries = set(keep.get("country_codes", []))
        total_count = keep.get("added_by_count", 1)

        for m in to_merge:
            all_barcodes.update(m.get("barcodes", []))
            all_aliases.update(m.get("aliases", []))
            all_countries.update(m.get("country_codes", []))
            total_count += m.get("added_by_count", 0)

        # Mettre à jour le produit principal
        await self.db.global_catalog.update_one(
            {"catalog_id": keep_id},
            {"$set": {
                "barcodes": list(all_barcodes),
                "aliases": list(all_aliases),
                "country_codes": list(all_countries),
                "added_by_count": total_count,
            }},
        )

        # Supprimer les doublons
        await self.db.global_catalog.delete_many({"catalog_id": {"$in": merge_ids}})

        return {"merged": len(to_merge), "kept": keep_id}

    async def admin_create(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        display_name = (payload.get("display_name") or "").strip()
        if not display_name:
            raise ValueError("Le nom du produit est obligatoire.")

        sector = normalize_sector(payload.get("sector") or "autre")
        canonical = self._simple_normalize(display_name)
        barcodes = self._normalize_string_list(payload.get("barcodes"))
        aliases = self._normalize_string_list(payload.get("aliases"))
        country_codes = self._normalize_country_codes(payload.get("country_codes"))
        image_url = (payload.get("image_url") or "").strip() or None
        verified = bool(payload.get("verified", True))
        added_by_count = max(1, int(payload.get("added_by_count") or 1))
        category = (payload.get("category") or "").strip()
        unit = self._normalize_unit(payload.get("unit"))
        tags = self._normalize_tags(payload.get("tags"))
        supplier_suggestions = self._normalize_string_list(payload.get("supplier_suggestions"))
        marketplace_matches = self._normalize_catalog_match_list(payload.get("marketplace_matches"))
        publication_status = self._normalize_publication_status(payload.get("publication_status"))
        notes = (payload.get("notes") or "").strip()
        reference_price = self._normalize_optional_float(payload.get("reference_price"))
        sale_price = self._normalize_optional_float(payload.get("sale_price"))
        supplier_hint = (payload.get("supplier_hint") or "").strip()

        if display_name.lower() not in [alias.lower() for alias in aliases]:
            aliases.insert(0, display_name)

        conflict_query: Dict[str, Any] = {"sector": sector, "$or": [{"canonical_name": canonical}]}
        if barcodes:
            conflict_query["$or"].append({"barcodes": {"$in": barcodes}})
        conflict = await self.db.global_catalog.find_one(conflict_query, {"_id": 0, "catalog_id": 1, "display_name": 1})
        if conflict:
            raise ValueError(
                f'Un produit catalogue similaire existe déjà ({conflict.get("display_name") or conflict.get("catalog_id")}).'
            )

        doc = {
            "catalog_id": f"gcat_{uuid.uuid4().hex[:12]}",
            "canonical_name": canonical,
            "display_name": display_name,
            "barcodes": barcodes,
            "aliases": aliases,
            "category": category,
            "sector": sector,
            "country_codes": country_codes,
            "image_url": image_url,
            "added_by_count": added_by_count,
            "verified": verified,
            "unit": unit,
            "tags": tags,
            "supplier_suggestions": supplier_suggestions,
            "marketplace_matches": marketplace_matches,
            "publication_status": publication_status,
            "notes": notes,
            "reference_price": reference_price,
            "sale_price": sale_price,
            "supplier_hint": supplier_hint,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        doc["completeness"] = self._compute_completeness_flags(doc)
        await self.db.global_catalog.insert_one(doc)
        return doc

    async def admin_update(self, catalog_id: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = await self.db.global_catalog.find_one({"catalog_id": catalog_id}, {"_id": 0})
        if not existing:
            return None

        display_name = (payload.get("display_name") or existing.get("display_name") or "").strip()
        if not display_name:
            raise ValueError("Le nom du produit est obligatoire.")

        sector = normalize_sector(payload.get("sector") or existing.get("sector") or "autre")
        canonical = self._simple_normalize(display_name)
        barcodes = self._normalize_string_list(payload.get("barcodes", existing.get("barcodes", [])))
        aliases = self._normalize_string_list(payload.get("aliases", existing.get("aliases", [])))
        country_codes = self._normalize_country_codes(payload.get("country_codes", existing.get("country_codes", [])))
        image_url = (payload.get("image_url") or existing.get("image_url") or "").strip() or None
        verified = bool(payload.get("verified", existing.get("verified", False)))
        added_by_count = max(1, int(payload.get("added_by_count") or existing.get("added_by_count") or 1))
        category = (payload.get("category") if payload.get("category") is not None else existing.get("category") or "").strip()
        unit = self._normalize_unit(payload.get("unit", existing.get("unit")))
        tags = self._normalize_tags(payload.get("tags", existing.get("tags")))
        supplier_suggestions = self._normalize_string_list(payload.get("supplier_suggestions", existing.get("supplier_suggestions", [])))
        marketplace_matches = self._normalize_catalog_match_list(payload.get("marketplace_matches", existing.get("marketplace_matches", [])))
        publication_status = self._normalize_publication_status(payload.get("publication_status", existing.get("publication_status")))
        notes = (payload.get("notes") if payload.get("notes") is not None else existing.get("notes") or "").strip()
        reference_price = self._normalize_optional_float(payload.get("reference_price", existing.get("reference_price")))
        sale_price = self._normalize_optional_float(payload.get("sale_price", existing.get("sale_price")))
        supplier_hint = (payload.get("supplier_hint") if payload.get("supplier_hint") is not None else existing.get("supplier_hint") or "").strip()

        if display_name.lower() not in [alias.lower() for alias in aliases]:
            aliases.insert(0, display_name)

        conflict_query: Dict[str, Any] = {
            "catalog_id": {"$ne": catalog_id},
            "sector": sector,
            "$or": [{"canonical_name": canonical}],
        }
        if barcodes:
            conflict_query["$or"].append({"barcodes": {"$in": barcodes}})
        conflict = await self.db.global_catalog.find_one(conflict_query, {"_id": 0, "catalog_id": 1, "display_name": 1})
        if conflict:
            raise ValueError(
                f'Un autre produit catalogue similaire existe déjà ({conflict.get("display_name") or conflict.get("catalog_id")}).'
            )

        updates = {
            "canonical_name": canonical,
            "display_name": display_name,
            "barcodes": barcodes,
            "aliases": aliases,
            "category": category,
            "sector": sector,
            "country_codes": country_codes,
            "image_url": image_url,
            "added_by_count": added_by_count,
            "verified": verified,
            "unit": unit,
            "tags": tags,
            "supplier_suggestions": supplier_suggestions,
            "marketplace_matches": marketplace_matches,
            "publication_status": publication_status,
            "notes": notes,
            "reference_price": reference_price,
            "sale_price": sale_price,
            "supplier_hint": supplier_hint,
            "updated_at": datetime.now(timezone.utc),
        }
        await self.db.global_catalog.update_one({"catalog_id": catalog_id}, {"$set": updates})
        existing.update(updates)
        existing["completeness"] = self._compute_completeness_flags(existing)
        return existing

    async def admin_duplicate(self, catalog_id: str) -> Optional[Dict[str, Any]]:
        existing = await self.db.global_catalog.find_one({"catalog_id": catalog_id}, {"_id": 0})
        if not existing:
            return None
        clone_payload = dict(existing)
        clone_payload.pop("catalog_id", None)
        clone_payload.pop("created_at", None)
        clone_payload.pop("updated_at", None)
        clone_payload["display_name"] = f'{existing.get("display_name", "Produit")} copie'
        clone_payload["verified"] = False
        clone_payload["publication_status"] = "draft"
        return await self.admin_create(clone_payload)

    async def admin_bulk_upsert(self, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        created = 0
        updated = 0
        errors: List[Dict[str, Any]] = []
        for index, row in enumerate(rows):
            try:
                catalog_id = (row.get("catalog_id") or "").strip()
                if catalog_id:
                    result = await self.admin_update(catalog_id, row)
                    if result:
                        updated += 1
                    else:
                        created += 1
                        await self.admin_create(row)
                else:
                    # Dedup: check existing by display_name + sector before creating
                    name = (row.get("display_name") or "").strip()
                    sector_val = row.get("sector") or ""
                    existing = None
                    if name:
                        existing = await self.db.global_catalog.find_one(
                            {"display_name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}, "sector": sector_val},
                            {"catalog_id": 1},
                        )
                    if existing:
                        await self.admin_update(existing["catalog_id"], row)
                        updated += 1
                    else:
                        await self.admin_create(row)
                        created += 1
            except Exception as exc:
                errors.append({"index": index, "name": row.get("display_name") or row.get("name"), "error": str(exc)})
        return {"created": created, "updated": updated, "errors": errors}

    async def admin_bulk_update(self, catalog_ids: List[str], updates: Dict[str, Any]) -> Dict[str, Any]:
        if not catalog_ids:
            return {"updated": 0}
        docs = await self.db.global_catalog.find({"catalog_id": {"$in": catalog_ids}}, {"_id": 0}).to_list(len(catalog_ids))
        updated_count = 0
        errors: List[Dict[str, Any]] = []
        for doc in docs:
            try:
                await self.admin_update(doc["catalog_id"], updates)
                updated_count += 1
            except Exception as exc:
                errors.append({"catalog_id": doc["catalog_id"], "error": str(exc)})
        return {"updated": updated_count, "errors": errors}

    async def admin_assistant(self, catalog_id: Optional[str] = None, sample_limit: int = 200) -> Dict[str, Any]:
        products = await self.db.global_catalog.find({}, {"_id": 0}).sort("added_by_count", -1).limit(sample_limit).to_list(sample_limit)
        marketplace_products = await self.db.catalog_products.find({}, {"_id": 0, "catalog_id": 1, "name": 1, "category": 1, "unit": 1, "supplier_user_id": 1, "price": 1}).limit(1000).to_list(1000)
        marketplace_profiles = await self.db.supplier_profiles.find({}, {"_id": 0, "user_id": 1, "company_name": 1}).limit(1000).to_list(1000)
        profile_map = {item["user_id"]: item.get("company_name") or "Fournisseur marketplace" for item in marketplace_profiles}

        templates = [
            {"id": "epicerie", "label": "Épicerie", "sector": "epicerie", "category": "Produits alimentaires", "unit": "pièce", "tags": ["épicerie", "rayon"]},
            {"id": "boissons", "label": "Boissons", "sector": "boissons", "category": "Boissons", "unit": "L", "tags": ["boisson", "liquide"]},
            {"id": "hygiene", "label": "Hygiène", "sector": "cosmetiques", "category": "Hygiène", "unit": "pièce", "tags": ["hygiène", "soin"]},
            {"id": "marketplace", "label": "Fournisseur marketplace", "sector": "grossiste", "category": "Marketplace", "unit": "pièce", "tags": ["marketplace", "catalogue"]},
            {"id": "restaurant", "label": "Restaurant", "sector": "restaurant", "category": "Ingrédients", "unit": "kg", "tags": ["restaurant", "cuisine"]},
        ]

        payload: Dict[str, Any] = {
            "templates": templates,
            "assistant_stats": await self.admin_stats(),
        }
        if catalog_id:
            target = await self.db.global_catalog.find_one({"catalog_id": catalog_id}, {"_id": 0})
            if not target:
                return payload
            payload["item"] = target
            payload["suggestions"] = self._build_assistant_suggestions(target, products, marketplace_products, profile_map)
        return payload

    # ──────────────────────────────────────────────────────────────────────────
    # UTILITAIRES
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _normalize_string_list(values: Optional[List[str]]) -> List[str]:
        cleaned: List[str] = []
        seen = set()
        for value in values or []:
            item = str(value or "").strip()
            if not item:
                continue
            lowered = item.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            cleaned.append(item)
        return cleaned

    @staticmethod
    def _normalize_country_codes(values: Optional[List[str]]) -> List[str]:
        cleaned: List[str] = []
        seen = set()
        for value in values or []:
            item = str(value or "").strip().upper()
            if not item:
                continue
            if item in seen:
                continue
            seen.add(item)
            cleaned.append(item)
        return cleaned

    @staticmethod
    def _normalize_tags(values: Optional[List[str]]) -> List[str]:
        cleaned: List[str] = []
        seen = set()
        for value in values or []:
            item = str(value or "").strip().lower()
            if not item or item in seen:
                continue
            seen.add(item)
            cleaned.append(item)
        return cleaned

    @staticmethod
    def _normalize_unit(value: Optional[str]) -> str:
        item = str(value or "").strip()
        return item or "pièce"

    @staticmethod
    def _normalize_publication_status(value: Optional[str]) -> str:
        allowed = {"draft", "ready", "published", "needs_review", "archived"}
        item = str(value or "").strip().lower()
        return item if item in allowed else "draft"

    @staticmethod
    def _normalize_optional_float(value: Any) -> Optional[float]:
        if value in (None, "", False):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _normalize_catalog_match_list(values: Optional[List[str]]) -> List[str]:
        return CatalogService._normalize_string_list(values)

    @staticmethod
    def _simple_normalize(name: str) -> str:
        """Normalisation simple (lowercase, trim, supprime accents basiques)."""
        import unicodedata
        if not name:
            return ""
        text = name.strip().lower()
        # Supprime les accents
        nfkd = unicodedata.normalize("NFKD", text)
        text = "".join(c for c in nfkd if not unicodedata.combining(c))
        # Supprime les espaces multiples
        text = " ".join(text.split())
        return text

    def _compute_completeness_flags(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        missing_image = not bool((doc.get("image_url") or "").strip())
        missing_category = not bool((doc.get("category") or "").strip())
        missing_price = doc.get("reference_price") in (None, "") and doc.get("sale_price") in (None, "")
        missing_unit = not bool((doc.get("unit") or "").strip())
        missing_marketplace_link = len(doc.get("marketplace_matches") or []) == 0
        incomplete = any([missing_image, missing_category, missing_price, missing_unit])
        score = 100
        for flag in [missing_image, missing_category, missing_price, missing_unit, missing_marketplace_link]:
            if flag:
                score -= 20
        return {
            "missing_image": missing_image,
            "missing_category": missing_category,
            "missing_price": missing_price,
            "missing_unit": missing_unit,
            "missing_marketplace_link": missing_marketplace_link,
            "incomplete": incomplete,
            "score": max(0, score),
        }

    def _matches_assistant_bucket(self, doc: Dict[str, Any], bucket: str) -> bool:
        completeness = self._compute_completeness_flags(doc)
        if bucket == "incomplete":
            return completeness["incomplete"]
        if bucket == "missing_image":
            return completeness["missing_image"]
        if bucket == "missing_category":
            return completeness["missing_category"]
        if bucket == "missing_price":
            return completeness["missing_price"]
        if bucket == "missing_unit":
            return completeness["missing_unit"]
        if bucket == "missing_marketplace_link":
            return completeness["missing_marketplace_link"]
        if bucket == "published":
            return (doc.get("publication_status") or "draft") == "published"
        if bucket == "needs_review":
            return (doc.get("publication_status") or "draft") == "needs_review"
        return True

    def _build_assistant_suggestions(
        self,
        target: Dict[str, Any],
        products: List[Dict[str, Any]],
        marketplace_products: List[Dict[str, Any]],
        profile_map: Dict[str, str],
    ) -> Dict[str, Any]:
        normalized_name = self._simple_normalize(target.get("display_name") or "")
        name_tokens = [token for token in normalized_name.split(" ") if len(token) >= 3]
        category_votes: Dict[str, int] = defaultdict(int)
        unit_votes: Dict[str, int] = defaultdict(int)
        duplicate_candidates: List[Dict[str, Any]] = []
        marketplace_matches: List[Dict[str, Any]] = []
        supplier_suggestions: List[Dict[str, Any]] = []

        for product in products:
            if product.get("catalog_id") == target.get("catalog_id"):
                continue
            other_name = self._simple_normalize(product.get("display_name") or "")
            overlap = sum(1 for token in name_tokens if token in other_name)
            if overlap > 0:
                if product.get("category"):
                    category_votes[product["category"]] += overlap
                if product.get("unit"):
                    unit_votes[product["unit"]] += overlap
                if other_name == normalized_name or overlap >= max(1, len(name_tokens) - 1):
                    duplicate_candidates.append({
                        "catalog_id": product.get("catalog_id"),
                        "display_name": product.get("display_name"),
                        "category": product.get("category"),
                        "sector": product.get("sector"),
                        "score": overlap,
                    })

        for product in marketplace_products:
            other_name = self._simple_normalize(product.get("name") or "")
            overlap = sum(1 for token in name_tokens if token in other_name)
            if overlap <= 0:
                continue
            match = {
                "catalog_id": product.get("catalog_id"),
                "name": product.get("name"),
                "category": product.get("category"),
                "unit": product.get("unit"),
                "price": product.get("price"),
                "supplier_user_id": product.get("supplier_user_id"),
                "supplier_name": profile_map.get(product.get("supplier_user_id"), "Fournisseur marketplace"),
                "score": overlap,
            }
            marketplace_matches.append(match)
            supplier_suggestions.append({
                "supplier_user_id": product.get("supplier_user_id"),
                "supplier_name": profile_map.get(product.get("supplier_user_id"), "Fournisseur marketplace"),
                "product_name": product.get("name"),
                "score": overlap,
            })
            if product.get("category"):
                category_votes[product["category"]] += overlap
            if product.get("unit"):
                unit_votes[product["unit"]] += overlap

        category_suggestions = [
            {"value": key, "score": value}
            for key, value in sorted(category_votes.items(), key=lambda item: item[1], reverse=True)[:5]
        ]
        unit_suggestions = [
            {"value": key, "score": value}
            for key, value in sorted(unit_votes.items(), key=lambda item: item[1], reverse=True)[:5]
        ]

        unique_supplier_suggestions: List[Dict[str, Any]] = []
        seen_suppliers = set()
        for suggestion in sorted(supplier_suggestions, key=lambda item: item["score"], reverse=True):
            supplier_key = suggestion.get("supplier_user_id")
            if not supplier_key or supplier_key in seen_suppliers:
                continue
            seen_suppliers.add(supplier_key)
            unique_supplier_suggestions.append(suggestion)

        return {
            "category_suggestions": category_suggestions,
            "unit_suggestions": unit_suggestions,
            "duplicate_candidates": sorted(duplicate_candidates, key=lambda item: item["score"], reverse=True)[:5],
            "marketplace_matches": sorted(marketplace_matches, key=lambda item: item["score"], reverse=True)[:8],
            "supplier_suggestions": unique_supplier_suggestions[:8],
        }
