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
                ])

        return output.getvalue()

    # ──────────────────────────────────────────────────────────────────────────
    # ADMIN  — modération du catalogue
    # ──────────────────────────────────────────────────────────────────────────
    async def admin_stats(self) -> Dict[str, Any]:
        """Stats globales pour le back-office admin."""
        total = await self.db.global_catalog.count_documents({})
        verified = await self.db.global_catalog.count_documents({"verified": True})

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

        return {
            "total_products": total,
            "verified_products": verified,
            "unverified_products": total - verified,
            "by_sector": {r["_id"]: r["count"] for r in by_sector},
            "by_country": {r["_id"]: r["count"] for r in by_country},
        }

    async def admin_list(
        self,
        sector: Optional[str] = None,
        verified: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Liste paginée pour l'admin."""
        query: Dict[str, Any] = {}
        if sector:
            query["sector"] = normalize_sector(sector)
        if verified is not None:
            query["verified"] = verified
        if search and search.strip():
            import re
            safe = re.escape(search.strip())
            query["$or"] = [
                {"display_name": {"$regex": safe, "$options": "i"}},
                {"barcodes": search.strip()},
            ]

        total = await self.db.global_catalog.count_documents(query)
        products = await self.db.global_catalog.find(
            query, {"_id": 0}
        ).sort("added_by_count", -1).skip(skip).limit(limit).to_list(limit)

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

    # ──────────────────────────────────────────────────────────────────────────
    # UTILITAIRES
    # ──────────────────────────────────────────────────────────────────────────
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
