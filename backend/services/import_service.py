import csv
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import ValidationError
from pymongo import UpdateOne

logger = logging.getLogger(__name__)
IMPORT_JOB_CHUNK_SIZE = 200


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()

def _normalize_column(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    replacements = {
        "é": "e",
        "è": "e",
        "ê": "e",
        "ë": "e",
        "à": "a",
        "â": "a",
        "ä": "a",
        "î": "i",
        "ï": "i",
        "ô": "o",
        "ö": "o",
        "ù": "u",
        "û": "u",
        "ü": "u",
        "ç": "c",
        "_": " ",
        "-": " ",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return " ".join(normalized.split())


def _first_present(row: Dict[str, Any], columns_by_alias: Dict[str, str], aliases: List[str]) -> Any:
    for alias in aliases:
        source = columns_by_alias.get(_normalize_column(alias))
        if source and row.get(source) not in (None, ""):
            return row.get(source)
    return None


def _join_defined(*values: Any, separator: str = " - ") -> str:
    parts = [_normalize_text(value) for value in values if _normalize_text(value)]
    return separator.join(parts)


PLATFORM_IMPORT_PROFILES: Dict[str, Dict[str, Any]] = {
    "shopify": {
        "label": "Shopify",
        "required_columns": ["title", "handle"],
        "signature_columns": ["variant sku", "variant price", "image src", "body html", "variant inventory qty"],
        "fields": {
            "name": ["title"],
            "sku": ["variant sku", "variant barcode"],
            "quantity": ["variant inventory qty", "inventory quantity", "variant inventory quantity"],
            "purchase_price": ["cost per item", "variant cost", "cost"],
            "selling_price": ["variant price", "price"],
            "category_name": ["product category", "type", "category", "custom product type"],
            "description": ["body html", "description"],
            "unit": ["unit", "variant unit"],
            "image": ["image src"],
        },
    },
    "odoo": {
        "label": "Odoo",
        "required_columns": ["name"],
        "signature_columns": ["internal reference", "sales price", "cost", "quantity on hand", "product category"],
        "fields": {
            "name": ["name", "product name", "nom", "article"],
            "sku": ["internal reference", "default code", "barcode", "reference interne", "code barre"],
            "quantity": ["quantity on hand", "on hand", "qty available", "quantite en stock", "stock"],
            "purchase_price": ["cost", "standard price", "cout", "prix de revient", "prix d'achat"],
            "selling_price": ["sales price", "sale price", "prix de vente"],
            "category_name": ["product category", "category", "categorie"],
            "description": ["description", "internal notes", "notes"],
            "unit": ["unit of measure", "uom", "unite de mesure", "unite"],
            "image": ["image", "image 1920", "image url"],
        },
    },
    "woocommerce": {
        "label": "WooCommerce",
        "required_columns": ["name"],
        "signature_columns": ["regular price", "stock", "categories", "images", "sku"],
        "fields": {
            "name": ["name", "nom"],
            "sku": ["sku", "ugs"],
            "quantity": ["stock", "stock quantity", "quantite en stock"],
            "purchase_price": ["cost", "purchase price", "prix d'achat"],
            "selling_price": ["regular price", "sale price", "price", "tarif regulier"],
            "category_name": ["categories", "category", "categorie"],
            "description": ["description", "short description", "description courte"],
            "unit": ["unit", "unite"],
            "image": ["images", "image", "image url"],
        },
    },
}


STOCKMAN_IDENTITY_MAPPING = {
    "name": "name",
    "sku": "sku",
    "quantity": "quantity",
    "purchase_price": "purchase_price",
    "selling_price": "selling_price",
    "category_name": "category_name",
    "description": "description",
    "unit": "unit",
    "min_stock": "min_stock",
    "location": "location",
    "image": "image",
}

class ImportService:
    def __init__(self, db):
        self.db = db

    async def parse_csv(self, content: bytes) -> Dict[str, Any]:
        """Parse CSV content and return columns + rows"""
        text = ""
        # Try different encodings
        for encoding in ["utf-8-sig", "utf-8", "latin-1", "cp1252"]:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if not text:
            raise ValueError("Impossible de décoder le fichier. Essayez un format UTF-8 standard.")

        # Detect delimiter if possible, fallback to comma
        sample = text[:2000]
        delimiter = ","
        if ";" in sample and sample.count(";") > sample.count(","):
            delimiter = ";"

        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        rows = list(reader)
        columns = reader.fieldnames or []
        
        logger.info(f"CSV Parsed: {len(rows)} rows, delimiter='{delimiter}', columns={columns}")
        
        return {
            "columns": columns,
            "data": rows,
            "row_count": len(rows)
        }

    def detect_import_profile(self, columns: List[str]) -> Dict[str, Any]:
        normalized_columns = {_normalize_column(column) for column in columns}
        best_source = "generic"
        best_profile: Dict[str, Any] = {}
        best_score = 0.0
        best_detected: List[str] = []

        for source, profile in PLATFORM_IMPORT_PROFILES.items():
            required = [_normalize_column(column) for column in profile.get("required_columns", [])]
            signature = [_normalize_column(column) for column in profile.get("signature_columns", [])]
            required_matches = [column for column in required if column in normalized_columns]
            signature_matches = [column for column in signature if column in normalized_columns]

            if len(required_matches) < len(required):
                continue
            if source != "shopify" and len(signature_matches) < 2:
                continue
            if source == "shopify" and len(signature_matches) < 1:
                continue

            score = min(1.0, (len(required_matches) * 0.35) + (len(signature_matches) / max(1, len(signature)) * 0.65))
            if score > best_score:
                best_source = source
                best_profile = profile
                best_score = score
                best_detected = required_matches + signature_matches

        if best_source == "generic":
            return {
                "source": "generic",
                "label": "Fichier CSV",
                "confidence": 0,
                "auto_mapping": False,
                "detected_columns": [],
            }

        return {
            "source": best_source,
            "label": best_profile.get("label", best_source.title()),
            "confidence": round(best_score, 2),
            "auto_mapping": True,
            "detected_columns": best_detected,
        }

    def get_identity_mapping(self) -> Dict[str, str]:
        return dict(STOCKMAN_IDENTITY_MAPPING)

    def normalize_platform_rows(self, data: List[Dict[str, Any]], source: str) -> List[Dict[str, Any]]:
        profile = PLATFORM_IMPORT_PROFILES.get(source)
        if not profile:
            return data

        fields = profile.get("fields", {})
        normalized_rows: List[Dict[str, Any]] = []
        carried_shopify_values: Dict[str, Dict[str, Any]] = {}
        for row in data:
            columns_by_alias = {_normalize_column(column): column for column in row.keys()}
            normalized_row: Dict[str, Any] = {}
            shopify_handle = _normalize_text(_first_present(row, columns_by_alias, ["handle"]))
            for field, aliases in fields.items():
                value = _first_present(row, columns_by_alias, aliases)
                if source == "shopify" and field in {"name", "category_name", "description", "image"}:
                    if value not in (None, "") and shopify_handle:
                        carried_shopify_values.setdefault(shopify_handle, {})[field] = value
                    elif shopify_handle:
                        value = carried_shopify_values.get(shopify_handle, {}).get(field)
                if field == "image" and isinstance(value, str) and "," in value:
                    value = value.split(",")[0]
                normalized_row[field] = value

            if source == "shopify":
                title = _first_present(row, columns_by_alias, ["title"]) or normalized_row.get("name")
                option_values = [
                    _first_present(row, columns_by_alias, ["option1 value"]),
                    _first_present(row, columns_by_alias, ["option2 value"]),
                    _first_present(row, columns_by_alias, ["option3 value"]),
                ]
                option_values = [
                    value for value in option_values
                    if _normalize_text(value) and _normalize_text(value).lower() != "default title"
                ]
                variant_title = _first_present(row, columns_by_alias, ["variant title"])
                if not option_values and _normalize_text(variant_title).lower() != "default title":
                    option_values = [variant_title]
                normalized_row["name"] = _join_defined(title, *option_values)

            normalized_rows.append(normalized_row)

        return normalized_rows

    def map_columns(self, data: List[Dict[str, Any]], mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        """Map foreign columns to internal product fields"""
        mapped_data = []
        for row in data:
            mapped_row = {}
            for target_field, source_field in mapping.items():
                if source_field in row:
                    mapped_row[target_field] = row[source_field]
            mapped_data.append(mapped_row)
        return mapped_data

    async def validate_and_prepare_products(
        self, 
        data: List[Dict[str, Any]], 
        user_id: str, 
        store_id: str,
        start_index: int = 0,
        import_job_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Validate raw data and prepare it for MongoDB insertion"""
        prepared = []
        errors = []
        # Preload categories to avoid N+1 queries (I7)
        cats = await self.db.categories.find({"user_id": user_id}, {"category_id": 1, "name": 1}).to_list(None)
        valid_category_ids = {c["category_id"] for c in cats}
        category_name_map = {
            _normalize_text(c.get("name")).lower(): c["category_id"]
            for c in cats
            if _normalize_text(c.get("name"))
        }
        loc_query = {"user_id": user_id}
        if store_id:
            loc_query["store_id"] = store_id
        locs = await self.db.locations.find(loc_query, {"location_id": 1, "name": 1}).to_list(None)
        location_ids = {l["location_id"] for l in locs}
        location_names = {str(l.get("name", "")).strip().lower(): l["location_id"] for l in locs if l.get("name")}
        existing_skus = {
            _normalize_text(sku)
            for sku in await self.db.products.distinct(
                "sku",
                {
                    "user_id": user_id,
                    "store_id": store_id,
                    "is_active": {"$ne": False},
                    "sku": {"$nin": [None, ""]},
                },
            )
            if _normalize_text(sku)
        }
        existing_skus.update({
            _normalize_text(barcode)
            for barcode in await self.db.products.distinct(
                "barcode",
                {
                    "user_id": user_id,
                    "store_id": store_id,
                    "is_active": {"$ne": False},
                    "barcode": {"$nin": [None, ""]},
                },
            )
            if _normalize_text(barcode)
        })
        seen_skus = set()

        for local_index, row in enumerate(data):
            index = start_index + local_index
            try:
                # Basic normalization
                name = row.get("name") or row.get("NOM") or row.get("Désignation")
                if not name:
                    errors.append({"row": index, "error": "Nom du produit manquant"})
                    continue

                # Validation category_id / category_name (I7 optimized)
                current_category_id = row.get("category_id")
                if current_category_id and current_category_id not in valid_category_ids:
                    current_category_id = None

                category_name = (
                    row.get("category_name")
                    or row.get("category")
                    or row.get("categorie")
                    or row.get("catégorie")
                )
                normalized_category_name = _normalize_text(category_name)
                if not current_category_id and normalized_category_name:
                    current_category_id = category_name_map.get(normalized_category_name.lower())
                    if not current_category_id:
                        category_doc = {
                            "category_id": f"cat_{uuid.uuid4().hex[:12]}",
                            "name": normalized_category_name,
                            "user_id": user_id,
                            "store_id": store_id,
                            "created_at": datetime.now(timezone.utc),
                            "updated_at": datetime.now(timezone.utc),
                        }
                        await self.db.categories.insert_one(category_doc)
                        current_category_id = category_doc["category_id"]
                        valid_category_ids.add(current_category_id)
                        category_name_map[normalized_category_name.lower()] = current_category_id

                # Clean numeric values with bounds check (M14)
                purchase_price = clean_float(row.get("purchase_price") or row.get("prix_achat") or 0.0)
                selling_price = clean_float(row.get("selling_price") or row.get("prix_vente") or 0.0)
                quantity = clean_int(row.get("quantity") or row.get("stock") or 0)
                sku = _normalize_text(row.get("sku") or row.get("SKU") or row.get("barcode") or row.get("Référence"))
                image = _normalize_text(row.get("image") or row.get("image_url") or row.get("Image Src"))

                if purchase_price < 0 or selling_price < 0:
                    errors.append({"row": index, "error": "Prix négatif non autorisé"})
                    continue
                if quantity < 0:
                    errors.append({"row": index, "error": "Quantité négative non autorisée"})
                    continue
                if selling_price > 999_999_999 or purchase_price > 999_999_999:
                    errors.append({"row": index, "error": "Prix trop élevé"})
                    continue

                if sku and (sku in existing_skus or sku in seen_skus):
                    errors.append({"row": index, "error": f"Code-barres déjà utilisé dans cette boutique : {sku}"})
                    continue
                if sku:
                    seen_skus.add(sku)

                product = {
                    "product_id": f"prod_{uuid.uuid4().hex[:12]}",
                    "name": str(name).strip(),
                    "description": str(row.get("description", "")).strip(),
                    "sku": sku,
                    "image": image or None,
                    "quantity": quantity,
                    "unit": str(row.get("unit") or "pièce").strip(),
                    "purchase_price": purchase_price,
                    "selling_price": selling_price,
                    "min_stock": clean_int(row.get("min_stock") or 0),
                    "category_id": current_category_id,
                    "user_id": user_id,
                    "store_id": store_id,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                if import_job_id:
                    product["import_job_id"] = import_job_id
                    product["import_row_index"] = index
                
                raw_location = (
                    row.get("location_id")
                    or row.get("location")
                    or row.get("emplacement")
                    or row.get("location_name")
                )
                if raw_location:
                    raw_location_value = str(raw_location).strip()
                    resolved_location = (
                        raw_location_value if raw_location_value in location_ids else None
                    )
                    if not resolved_location:
                        resolved_location = location_names.get(raw_location_value.lower())
                    if resolved_location:
                        product["location_id"] = resolved_location
                    else:
                        errors.append({"row": index, "error": f"Emplacement inconnu: {raw_location_value}"})

                prepared.append(product)
            except Exception as e:
                errors.append({"row": index, "error": str(e)})

        return {
            "valid_count": len(prepared),
            "error_count": len(errors),
            "products": prepared,
            "errors": errors
        }

    async def execute_bulk_insert(self, products: List[Dict[str, Any]]) -> int:
        """Insert products into the database and record initial stock movements with transaction (M8)"""
        if not products:
            return 0

        movements = []
        now = datetime.now(timezone.utc)
        for p in products:
            qty = p.get("quantity", 0)
            if qty > 0:
                movements.append({
                    "movement_id": f"mov_{uuid.uuid4().hex[:12]}",
                    "product_id": p["product_id"],
                    "product_name": p["name"],
                    "user_id": p["user_id"],
                    "store_id": p.get("store_id"),
                    "type": "in",
                    "quantity": qty,
                    "reason": "Importation initiale (Bulk)",
                    "previous_quantity": 0,
                    "new_quantity": qty,
                    "created_at": now
                })

        try:
            async with await self.db.client.start_session() as session:
                async with session.start_transaction():
                    result = await self.db.products.insert_many(products, session=session)
                    if movements:
                        await self.db.stock_movements.insert_many(movements, session=session)
                    return len(result.inserted_ids)
        except Exception as exc:
            logger.warning(f"Bulk import transaction unavailable, falling back to non-transactional insert: {exc}")
            result = await self.db.products.insert_many(products)
            if movements:
                await self.db.stock_movements.insert_many(movements)
            return len(result.inserted_ids)

    async def execute_bulk_import_chunk(self, products: List[Dict[str, Any]], import_job_id: str) -> int:
        """Insert one import chunk in an idempotent way."""
        if not products:
            return 0

        now = datetime.now(timezone.utc)
        product_ops = []
        movement_ops = []
        for product in products:
            row_index = product.get("import_row_index")
            if row_index is None:
                continue
            product_ops.append(
                UpdateOne(
                    {"import_job_id": import_job_id, "import_row_index": row_index},
                    {"$setOnInsert": product},
                    upsert=True,
                )
            )

            quantity = product.get("quantity", 0)
            if quantity > 0:
                movement_id = f"mov_import_{import_job_id}_{row_index}"
                movement_ops.append(
                    UpdateOne(
                        {"movement_id": movement_id},
                        {"$setOnInsert": {
                            "movement_id": movement_id,
                            "product_id": product["product_id"],
                            "product_name": product["name"],
                            "user_id": product["user_id"],
                            "store_id": product.get("store_id"),
                            "type": "in",
                            "quantity": quantity,
                            "reason": "Importation initiale (Bulk async)",
                            "previous_quantity": 0,
                            "new_quantity": quantity,
                            "created_at": now,
                            "import_job_id": import_job_id,
                            "import_row_index": row_index,
                        }},
                        upsert=True,
                    )
                )

        inserted_count = 0
        if product_ops:
            product_result = await self.db.products.bulk_write(product_ops, ordered=False)
            inserted_count = int(getattr(product_result, "upserted_count", 0) or 0)
        if movement_ops:
            await self.db.stock_movements.bulk_write(movement_ops, ordered=False)
        return inserted_count

    async def create_import_job(
        self,
        import_data: List[Dict[str, Any]],
        mapping: Dict[str, str],
        user_id: str,
        store_id: Optional[str] = None,
        file_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        job_id = f"imp_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        doc = {
            "job_id": job_id,
            "user_id": user_id,
            "store_id": store_id,
            "file_name": file_name,
            "status": "queued",
            "total_rows": len(import_data),
            "processed_rows": 0,
            "inserted_count": 0,
            "error_count": 0,
            "errors": [],
            "mapping": mapping,
            "import_data": import_data,
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "completed_at": None,
            "last_error": None,
        }
        await self.db.import_jobs.insert_one(doc)
        return doc

    async def get_import_job(self, job_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        return await self.db.import_jobs.find_one({"job_id": job_id, "user_id": user_id}, {"_id": 0})

    async def get_active_import_job(self, user_id: str, store_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {
            "user_id": user_id,
            "status": {"$in": ["queued", "running", "failed"]},
        }
        if store_id:
            query["store_id"] = store_id
        rows = await self.db.import_jobs.find(query, {"_id": 0}).sort("updated_at", -1).limit(1).to_list(1)
        return rows[0] if rows else None

    async def process_import_job(self, job_id: str, user_id: str) -> Dict[str, Any]:
        job = await self.get_import_job(job_id, user_id)
        if not job:
            raise ValueError("Job d'import introuvable")
        if job.get("status") == "completed":
            return job

        now = datetime.now(timezone.utc)
        if not job.get("started_at"):
            await self.db.import_jobs.update_one(
                {"job_id": job_id, "user_id": user_id},
                {"$set": {"started_at": now, "status": "running", "updated_at": now, "last_error": None}},
            )
        else:
            await self.db.import_jobs.update_one(
                {"job_id": job_id, "user_id": user_id},
                {"$set": {"status": "running", "updated_at": now, "last_error": None}},
            )

        processed_rows = int(job.get("processed_rows", 0) or 0)
        inserted_count = int(job.get("inserted_count", 0) or 0)
        error_count = int(job.get("error_count", 0) or 0)
        collected_errors = list(job.get("errors") or [])
        import_data = list(job.get("import_data") or [])
        mapping = dict(job.get("mapping") or {})
        store_id = job.get("store_id") or user_id

        try:
            while processed_rows < len(import_data):
                raw_chunk = import_data[processed_rows:processed_rows + IMPORT_JOB_CHUNK_SIZE]
                mapped_chunk = self.map_columns(raw_chunk, mapping)
                validation = await self.validate_and_prepare_products(
                    mapped_chunk,
                    user_id,
                    store_id,
                    start_index=processed_rows,
                    import_job_id=job_id,
                )
                inserted_count += await self.execute_bulk_import_chunk(validation["products"], job_id)
                error_count += validation["error_count"]
                if validation["errors"]:
                    remaining_slots = max(0, 200 - len(collected_errors))
                    if remaining_slots > 0:
                        collected_errors.extend(validation["errors"][:remaining_slots])

                processed_rows += len(raw_chunk)
                await self.db.import_jobs.update_one(
                    {"job_id": job_id, "user_id": user_id},
                    {"$set": {
                        "status": "running",
                        "processed_rows": processed_rows,
                        "inserted_count": inserted_count,
                        "error_count": error_count,
                        "errors": collected_errors,
                        "updated_at": datetime.now(timezone.utc),
                    }},
                )

            completed_at = datetime.now(timezone.utc)
            await self.db.import_jobs.update_one(
                {"job_id": job_id, "user_id": user_id},
                {"$set": {
                    "status": "completed",
                    "processed_rows": processed_rows,
                    "inserted_count": inserted_count,
                    "error_count": error_count,
                    "errors": collected_errors,
                    "updated_at": completed_at,
                    "completed_at": completed_at,
                    "last_error": None,
                    "import_data": [],
                    "mapping": {},
                }},
            )
            final_job = await self.get_import_job(job_id, user_id)
            return final_job or {}
        except Exception as exc:
            failed_at = datetime.now(timezone.utc)
            await self.db.import_jobs.update_one(
                {"job_id": job_id, "user_id": user_id},
                {"$set": {
                    "status": "failed",
                    "processed_rows": processed_rows,
                    "inserted_count": inserted_count,
                    "error_count": error_count,
                    "errors": collected_errors,
                    "updated_at": failed_at,
                    "last_error": str(exc),
                }},
            )
            raise

    async def process_import(
        self,
        import_data: List[Dict[str, Any]],
        mapping: Dict[str, str],
        user_id: str,
        store_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Full import pipeline: map columns, validate, and insert"""
        # 1. Map columns
        mapped_data = self.map_columns(import_data, mapping)

        # 2. Validate and prepare
        result = await self.validate_and_prepare_products(mapped_data, user_id, store_id or user_id)

        if result["valid_count"] == 0:
            return {
                "message": "Aucun produit valide à importer",
                "count": 0,
                "errors": result["errors"]
            }

        # 3. Insert into database
        inserted_count = await self.execute_bulk_insert(result["products"])

        return {
            "message": f"{inserted_count} produits importés avec succès",
            "count": inserted_count,
            "errors": result["errors"]
        }

    async def infer_mapping_with_ai(self, sample_data: List[Dict[str, Any]], gemini_model) -> Dict[str, str]:
        """Use Gemini to guess the mapping from sample data"""
        if not sample_data:
            return {}

        # Nettoyer les données : tronquer les valeurs longues, retirer caractères suspects (H7)
        clean_data = []
        for row in sample_data[:3]:
            clean_row = {}
            for k, v in row.items():
                # Tronquer les clés et valeurs
                clean_key = str(k)[:50].replace('"', '').replace('\n', ' ')
                clean_val = str(v)[:100].replace('"', '').replace('\n', ' ')
                clean_row[clean_key] = clean_val
            clean_data.append(clean_row)

        prompt = f"""
        Analyze these CSV columns and map them to standard fields.
        Standard fields: name, sku, quantity, purchase_price, selling_price, category, description, unit, location.
        
        CSV Sample:
        {json.dumps(clean_data, indent=2)}
        
        Return ONLY a JSON mapping where keys are standard fields and values are CSV column names.
        Example: {{"name": "Désignation Article", "sku": "Ref #"}}
        """

        try:
            response = await gemini_model.generate_content_async(prompt)
            # Basic JSON extraction
            text = response.text
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
        except Exception as e:
            logger.error(f"AI Mapping Error: {e}")

        return {}

    async def infer_template_normalization_with_ai(self, sample_data: List[Dict[str, Any]], gemini_model) -> Dict[str, Any]:
        if not sample_data:
            return {"mapping": {}, "confidence": 0, "ambiguous_fields": [], "ignored_columns": []}

        clean_data = []
        for row in sample_data[:10]:
            clean_row = {}
            for key, value in row.items():
                clean_key = str(key)[:80].replace('"', '').replace('\n', ' ')
                clean_value = str(value)[:160].replace('"', '').replace('\n', ' ')
                clean_row[clean_key] = clean_value
            clean_data.append(clean_row)

        prompt = f"""
        Tu es un assistant de migration de catalogue produits vers Stockman.
        Analyse ce fichier importé et associe uniquement les colonnes existantes aux champs Stockman.

        Champs Stockman possibles :
        - name : nom du produit, obligatoire
        - sku : référence, SKU ou code-barres
        - quantity : quantité en stock
        - purchase_price : prix d'achat ou coût
        - selling_price : prix de vente, tarif public ou prix TTC
        - category_name : catégorie ou famille produit
        - description : description
        - unit : unité
        - min_stock : stock minimum
        - location : emplacement
        - image : image ou URL d'image

        Règles :
        - N'invente jamais de colonne.
        - Si une colonne est ambiguë, ne la mappe pas et ajoute le champ dans ambiguous_fields.
        - Réponds uniquement en JSON valide.
        - confidence doit représenter ta confiance globale entre 0 et 1.

        Format attendu :
        {{
          "mapping": {{"name": "Nom colonne", "selling_price": "Nom colonne"}},
          "confidence": 0.85,
          "ambiguous_fields": ["purchase_price"],
          "ignored_columns": ["Nom colonne ignorée"]
        }}

        Échantillon CSV :
        {json.dumps(clean_data, ensure_ascii=False)}
        """

        try:
            response = await gemini_model.generate_content_async(prompt)
            text = response.text or ""
            start = text.find("{")
            end = text.rfind("}") + 1
            if start == -1 or end <= start:
                return {"mapping": {}, "confidence": 0, "ambiguous_fields": [], "ignored_columns": []}

            payload = json.loads(text[start:end])
            mapping = payload.get("mapping") if isinstance(payload, dict) else {}
            if not isinstance(mapping, dict):
                mapping = {}

            sample_columns = set(sample_data[0].keys()) if sample_data else set()
            allowed_fields = set(STOCKMAN_IDENTITY_MAPPING.keys())
            safe_mapping = {
                field: column
                for field, column in mapping.items()
                if field in allowed_fields and column in sample_columns
            }
            confidence = payload.get("confidence", 0)
            try:
                confidence = max(0, min(1, float(confidence)))
            except (TypeError, ValueError):
                confidence = 0

            ambiguous_fields = payload.get("ambiguous_fields") or []
            ignored_columns = payload.get("ignored_columns") or []
            return {
                "mapping": safe_mapping,
                "confidence": confidence,
                "ambiguous_fields": ambiguous_fields if isinstance(ambiguous_fields, list) else [],
                "ignored_columns": ignored_columns if isinstance(ignored_columns, list) else [],
            }
        except Exception as e:
            logger.error(f"AI template normalization error: {e}")

        return {"mapping": {}, "confidence": 0, "ambiguous_fields": [], "ignored_columns": []}
