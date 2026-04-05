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

                if purchase_price < 0 or selling_price < 0:
                    errors.append({"row": index, "error": "Prix négatif non autorisé"})
                    continue
                if quantity < 0:
                    errors.append({"row": index, "error": "Quantité négative non autorisée"})
                    continue
                if selling_price > 999_999_999 or purchase_price > 999_999_999:
                    errors.append({"row": index, "error": "Prix trop élevé"})
                    continue

                product = {
                    "product_id": f"prod_{uuid.uuid4().hex[:12]}",
                    "name": str(name).strip(),
                    "description": str(row.get("description", "")).strip(),
                    "sku": str(row.get("sku") or row.get("SKU") or row.get("Référence") or "").strip(),
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
