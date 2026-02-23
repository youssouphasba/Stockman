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
        
        for index, row in enumerate(data):
            try:
                # Basic normalization
                name = row.get("name") or row.get("NOM") or row.get("Désignation")
                if not name:
                    errors.append({"row": index, "error": "Nom du produit manquant"})
                    continue

                # Clean numeric values
                def clean_float(val, default=0.0):
                    if val is None or val == "": return default
                    try:
                        # Handle European formats (1.234,56 or 1 234,56)
                        str_val = str(val).replace(" ", "").replace(",", ".")
                        return float(str_val)
                    except ValueError:
                        return default

                def clean_int(val, default=0):
                    if val is None or val == "": return default
                    try:
                        return int(clean_float(val))
                    except (ValueError, TypeError):
                        return default

                product = {
                    "product_id": f"prod_{uuid.uuid4().hex[:12]}",
                    "name": str(name).strip(),
                    "description": str(row.get("description", "")).strip(),
                    "sku": str(row.get("sku") or row.get("SKU") or row.get("Référence") or "").strip(),
                    "quantity": clean_int(row.get("quantity") or row.get("stock") or 0),
                    "unit": str(row.get("unit") or "pièce").strip(),
                    "purchase_price": clean_float(row.get("purchase_price") or row.get("prix_achat") or 0.0),
                    "selling_price": clean_float(row.get("selling_price") or row.get("prix_vente") or 0.0),
                    "min_stock": clean_int(row.get("min_stock") or 0),
                    "category_id": row.get("category_id"),
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
        """Insert products into the database"""
        if not products:
            return 0
        
        result = await self.db.products.insert_many(products)
        
        # Log activity
        # Note: In a real scenario, we might want to log this to activity_logs
        
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

        prompt = f"""
        Analyze these first few rows of a CSV file and map them to our standard fields.
        Standard fields: name, sku, quantity, purchase_price, selling_price, category, description, unit.
        
        CSV Sample:
        {json.dumps(sample_data[:3], indent=2)}
        
        Return ONLY a JSON mapping where keys are standard fields and values are CSV column names.
        Example: {{"name": "Désignation Article", "sku": "Ref #", ...}}
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
