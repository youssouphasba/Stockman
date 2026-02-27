import csv
import io
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import ValidationError

logger = logging.getLogger(__name__)

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
        store_id: str
    ) -> Dict[str, Any]:
        """Validate raw data and prepare it for MongoDB insertion"""
        prepared = []
        errors = []
        # Preload categories to avoid N+1 queries (I7)
        cats = await self.db.categories.find({"user_id": user_id}, {"category_id": 1}).to_list(None)
        valid_category_ids = {c["category_id"] for c in cats}

        for index, row in enumerate(data):
            try:
                # Basic normalization
                name = row.get("name") or row.get("NOM") or row.get("Désignation")
                if not name:
                    errors.append({"row": index, "error": "Nom du produit manquant"})
                    continue

                # Validation category_id (I7 optimized)
                current_category_id = row.get("category_id")
                if current_category_id and current_category_id not in valid_category_ids:
                    current_category_id = None # Skip invalid category

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
        
        async with await self.db.client.start_session() as session:
            async with session.start_transaction():
                result = await self.db.products.insert_many(products, session=session)
                
                # Prepare stock movements for products with quantity > 0
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
                
                if movements:
                    await self.db.stock_movements.insert_many(movements, session=session)
                
                return len(result.inserted_ids)

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
        Standard fields: name, sku, quantity, purchase_price, selling_price, category, description, unit.
        
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
