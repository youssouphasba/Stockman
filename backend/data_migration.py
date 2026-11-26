"""Reprise des données d'un ancien logiciel ou d'un cahier vers Stockman.

Le commerçant dépose un fichier (CSV, Excel, PDF ou photo). Le module :
1. lit les tableaux qu'il contient (une feuille Excel = un tableau) ;
2. reconnaît, pour chacun, s'il s'agit de produits ou de ventes et associe les colonnes
   (règles simples d'abord, l'IA ensuite si elles ne suffisent pas) ;
3. prépare un aperçu chiffré avant tout enregistrement ;
4. enregistre l'import sous un numéro de lot, ce qui permet de l'annuler en entier.

Règles des ventes reprises (validées par le user le 2026-11-18) : elles vont dans la table des
ventes avec leur date d'origine et `source = "import"`, ce qui les fait compter dans les tableaux de
bord, la comptabilité et les prévisions. Elles n'entrent jamais dans le registre fiscal, ne
touchent pas au stock, ne peuvent être ni annulées ni facturées, et ne produisent pas de ticket.
"""

import csv
import hashlib
import io
import json
import logging
import re
import unicodedata
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from product_name_matching import product_name_similarity

logger = logging.getLogger(__name__)

IMPORT_SOURCE = "import"
KIND_PRODUCTS = "products"
KIND_SALES = "sales"
KIND_IGNORE = "ignore"
KINDS = (KIND_PRODUCTS, KIND_SALES, KIND_IGNORE)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_ROWS_PER_TABLE = 20000
MAX_REPORTED_ERRORS = 200
PREVIEW_ROWS = 5
# Un produit dont le nom ressemble à ce point à un produit existant est considéré comme le même.
PRODUCT_MATCH_THRESHOLD = 0.84
DRAFT_TTL = timedelta(days=2)
# Délai pendant lequel un import peut être annulé.
UNDO_WINDOW = timedelta(days=30)

SPREADSHEET_EXTENSIONS = (".xlsx", ".xlsm")
TEXT_EXTENSIONS = (".csv", ".txt", ".tsv")
DOCUMENT_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
}

PAYMENT_METHODS = ("cash", "mobile_money", "card", "transfer", "credit")

# Champs Stockman et intitulés de colonnes courants (déjà normalisés : minuscules, sans accents).
PRODUCT_ALIASES: Dict[str, List[str]] = {
    "name": ["nom", "nom produit", "nom du produit", "produit", "article", "designation", "libelle",
             "product", "product name", "name", "title", "item", "item name", "intitule"],
    "sku": ["code", "code barre", "code barres", "code article", "barcode", "ean", "reference",
            "ref", "sku", "reference interne", "internal reference"],
    "quantity": ["stock", "quantite", "quantite en stock", "qte", "qte stock", "qty", "quantity",
                 "stock actuel", "en stock", "on hand", "quantity on hand", "stock disponible"],
    "purchase_price": ["prix achat", "prix d achat", "cout", "cout unitaire", "cost", "prix de revient",
                       "pa", "purchase price", "cost price", "prix d achat unitaire"],
    "selling_price": ["prix vente", "prix de vente", "prix", "pv", "price", "sale price", "selling price",
                      "tarif", "prix unitaire", "prix ttc", "sales price"],
    "category_name": ["categorie", "famille", "rayon", "category", "type", "groupe", "product category"],
    "unit": ["unite", "unit", "uom", "unite de mesure"],
    "min_stock": ["stock min", "stock minimum", "seuil", "seuil d alerte", "min stock", "alerte"],
    "description": ["description", "details", "commentaire"],
}

SALE_ALIASES: Dict[str, List[str]] = {
    "date": ["date", "jour", "date vente", "date de vente", "date ticket", "date facture", "sale date",
             "order date", "created at", "date heure", "datetime", "date operation", "date de la vente"],
    "time": ["heure", "time", "hour", "heure vente"],
    "product_name": ["produit", "article", "designation", "libelle", "nom produit", "nom du produit",
                     "item", "product", "product name", "nom article", "description article"],
    "quantity": ["quantite", "qte", "qty", "quantity", "nombre", "nb", "quantite vendue", "qte vendue"],
    "unit_price": ["prix", "prix unitaire", "pu", "p u", "unit price", "price", "prix de vente",
                   "prix vente", "pv"],
    "total": ["total", "montant", "montant total", "total ttc", "ttc", "amount", "total amount",
              "chiffre d affaires", "ca", "recette", "recettes", "montant vente", "total vente",
              "montant ttc", "net a payer", "vente", "ventes"],
    "purchase_price": ["prix achat", "prix d achat", "cout", "cost", "prix de revient"],
    "payment_method": ["mode de paiement", "paiement", "payment", "payment method", "moyen de paiement",
                       "reglement", "mode reglement", "mode de reglement", "type paiement"],
    "customer_name": ["client", "nom client", "nom du client", "customer", "customer name"],
    "reference": ["ticket", "n ticket", "no ticket", "numero ticket", "num ticket", "facture",
                  "n facture", "no facture", "numero facture", "numero", "reference vente", "receipt",
                  "receipt number", "order id", "order number", "invoice", "invoice number",
                  "transaction", "id vente", "n vente", "numero de vente"],
}

REQUIRED_FIELDS = {KIND_PRODUCTS: ("name",), KIND_SALES: ("date",)}
SKIPPED_NAMES = {"total", "sous total", "total general", "totaux", "grand total"}


# ----------------------------------------------------------------------------- utilitaires


def normalize_label(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _cell_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def parse_number(value: Any) -> Optional[float]:
    """Lit un montant ou une quantité écrits à la française, à l'anglaise ou avec une devise."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(" ", "").replace(" ", "").replace(" ", "")
    if not text:
        return None
    negative = text.startswith("-") or (text.startswith("(") and text.endswith(")"))
    text = re.sub(r"[^0-9,.]", "", text)
    if not text or not re.search(r"\d", text):
        return None
    if "," in text and "." in text:
        decimal = "," if text.rfind(",") > text.rfind(".") else "."
        thousands = "." if decimal == "," else ","
        text = text.replace(thousands, "").replace(decimal, ".")
    elif "," in text:
        text = text.replace(",", "") if re.fullmatch(r"\d{1,3}(,\d{3})+", text) else text.replace(",", ".")
    elif "." in text and re.fullmatch(r"\d{1,3}(\.\d{3})+", text):
        text = text.replace(".", "")
    try:
        number = float(text)
    except ValueError:
        return None
    return -number if negative else number


_DATE_PATTERN = re.compile(
    r"^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:[ T,]+(\d{1,2})[:hH](\d{2})(?::(\d{2}))?)?"
)


def parse_date(value: Any) -> Tuple[Optional[datetime], bool]:
    """Renvoie (date en UTC, heure connue). Les dates sans heure sont placées à midi, pour ne
    jamais glisser d'un jour à l'autre selon le fuseau."""
    if value is None or value == "":
        return None, False
    if isinstance(value, datetime):
        has_time = value.time() != time(0, 0)
        return _as_utc(value if has_time else value.replace(hour=12)), has_time
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, 12, tzinfo=timezone.utc), False
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if 20000 <= float(value) <= 80000:  # numéro de série Excel
            moment = datetime(1899, 12, 30) + timedelta(days=float(value))
            has_time = moment.time() != time(0, 0)
            return _as_utc(moment if has_time else moment.replace(hour=12)), has_time
        return None, False
    text = str(value).strip()
    if not text:
        return None, False
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        has_time = bool(re.search(r"\d[T ]\d{1,2}:\d{2}", text))
        if not has_time:
            parsed = parsed.replace(hour=12)
        return _as_utc(parsed), has_time
    except ValueError:
        pass
    match = _DATE_PATTERN.match(text)
    if not match:
        number = parse_number(text)
        return parse_date(number) if number and re.fullmatch(r"\d{5}(\.\d+)?", text) else (None, False)
    first, second, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
    day, month = (first, second)
    if second > 12 and first <= 12:
        day, month = second, first  # écriture américaine : mois / jour
    if year < 100:
        year += 2000
    has_time = match.group(4) is not None
    hour = int(match.group(4)) if has_time else 12
    minute = int(match.group(5)) if has_time else 0
    second_value = int(match.group(6)) if match.group(6) else 0
    try:
        return datetime(year, month, day, hour, minute, second_value, tzinfo=timezone.utc), has_time
    except ValueError:
        return None, False


def parse_time(value: Any) -> Optional[time]:
    if isinstance(value, time):
        return value
    if isinstance(value, datetime):
        return value.time()
    match = re.match(r"^\s*(\d{1,2})[:hH](\d{2})", str(value or ""))
    if not match:
        return None
    hour, minute = int(match.group(1)), int(match.group(2))
    return time(hour, minute) if hour < 24 and minute < 60 else None


def normalize_payment_method(value: Any) -> str:
    text = normalize_label(value)
    if not text:
        return "cash"
    if any(word in text for word in ("credit", "dette", "a terme", "differe")):
        return "credit"
    if any(word in text for word in ("mobile", "momo", "orange", "wave", "mtn", "moov", "free money",
                                      "airtel", "mpesa", "m pesa", "flooz", "t money")):
        return "mobile_money"
    if any(word in text for word in ("carte", "card", "cb", "visa", "mastercard", "tpe")):
        return "card"
    if any(word in text for word in ("virement", "transfer", "banque", "bank", "cheque", "check")):
        return "transfer"
    return "cash"


# ----------------------------------------------------------------------------- lecture des fichiers


def file_extension(filename: str) -> str:
    match = re.search(r"\.[A-Za-z0-9]+$", filename or "")
    return match.group(0).lower() if match else ""


def is_document(filename: str, content_type: Optional[str] = None) -> bool:
    """PDF ou photo : lus par l'IA plutôt que par un tableur."""
    if file_extension(filename) in DOCUMENT_MIME_TYPES:
        return True
    return bool(content_type and (content_type.startswith("image/") or content_type == "application/pdf"))


def document_mime_type(filename: str, content_type: Optional[str] = None) -> str:
    return DOCUMENT_MIME_TYPES.get(file_extension(filename)) or content_type or "application/octet-stream"


def _decode_text(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("Impossible de lire le texte de ce fichier.")


def _matrix_from_csv(content: bytes) -> List[List[Any]]:
    text = _decode_text(content)
    sample = text[:4000]
    delimiter = max((";", ",", "\t", "|"), key=sample.count)
    if sample.count(delimiter) == 0:
        delimiter = ","
    return [row for row in csv.reader(io.StringIO(text), delimiter=delimiter)]


def _matrices_from_xlsx(content: bytes) -> List[Tuple[str, List[List[Any]]]]:
    try:
        from openpyxl import load_workbook
    except ImportError as exc:  # pragma: no cover - dépendance installée en production
        raise ValueError("La lecture des fichiers Excel n'est pas disponible sur le serveur.") from exc
    try:
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:
        raise ValueError("Ce fichier Excel est illisible ou protégé par un mot de passe.") from exc
    sheets = []
    try:
        for sheet in workbook.worksheets:
            rows = []
            for row in sheet.iter_rows(values_only=True):
                rows.append(list(row))
                if len(rows) > MAX_ROWS_PER_TABLE + 50:
                    break
            sheets.append((sheet.title, rows))
    finally:
        workbook.close()
    return sheets


def _is_text_cell(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip()) and parse_number(value) is None and parse_date(value)[0] is None


def table_from_matrix(name: str, matrix: List[List[Any]]) -> Optional[Dict[str, Any]]:
    """Repère la ligne des intitulés (souvent précédée d'un titre) et renvoie le tableau."""
    rows = [row for row in matrix if any(_cell_text(cell) for cell in row)]
    if not rows:
        return None
    head = rows[:20]
    widest = max(sum(1 for cell in row if _cell_text(cell)) for row in head)
    header_index = None
    for index, row in enumerate(head):
        filled = [cell for cell in row if _cell_text(cell)]
        if len(filled) >= 2 and len(filled) >= 0.6 * widest and all(_is_text_cell(cell) for cell in filled):
            header_index = index
            break
    if header_index is None:
        return None
    header_row = rows[header_index]
    columns: List[str] = []
    positions: List[int] = []
    for position, cell in enumerate(header_row):
        label = _cell_text(cell)
        if not label:
            continue
        unique = label
        suffix = 2
        while unique in columns:
            unique = f"{label} ({suffix})"
            suffix += 1
        columns.append(unique)
        positions.append(position)
    data = []
    for row in rows[header_index + 1:]:
        record = {}
        for column, position in zip(columns, positions):
            value = row[position] if position < len(row) else None
            if isinstance(value, str):
                value = value.strip()
            if isinstance(value, (datetime, date)):
                value = value.isoformat()
            elif isinstance(value, time):
                value = value.strftime("%H:%M")
            record[column] = value
        if any(_cell_text(value) for value in record.values()):
            data.append(record)
        if len(data) >= MAX_ROWS_PER_TABLE:
            break
    if not data:
        return None
    return {"name": name, "columns": columns, "rows": data}


def read_tables(content: bytes, filename: str) -> List[Dict[str, Any]]:
    """Tableaux d'un fichier CSV ou Excel. Les PDF et les photos passent par l'IA."""
    extension = file_extension(filename)
    if extension == ".xls":
        raise ValueError("Ancien format Excel (.xls) : ouvrez le fichier et enregistrez-le au format .xlsx, puis réessayez.")
    if extension in SPREADSHEET_EXTENSIONS or content[:2] == b"PK":
        matrices = _matrices_from_xlsx(content)
    else:
        matrices = [(re.sub(r"\.[^.]+$", "", filename or "") or "Fichier", _matrix_from_csv(content))]
    tables = []
    for name, matrix in matrices:
        table = table_from_matrix(name, matrix)
        if table:
            tables.append(table)
    if not tables:
        raise ValueError("Aucun tableau lisible dans ce fichier : la première ligne doit contenir les intitulés des colonnes.")
    return tables


# ----------------------------------------------------------------------------- reconnaissance


def _match_columns(columns: List[str], aliases: Dict[str, List[str]]) -> Dict[str, str]:
    """Associe chaque champ à la colonne dont l'intitulé correspond, sans réutiliser une colonne."""
    normalized = {column: normalize_label(column) for column in columns}
    mapping: Dict[str, str] = {}
    used = set()
    # Correspondance exacte d'abord, puis intitulé qui commence par l'alias.
    for exact in (True, False):
        for field, names in aliases.items():
            if field in mapping:
                continue
            for column, label in normalized.items():
                if column in used or not label:
                    continue
                if (exact and label in names) or (not exact and any(label.startswith(name + " ") for name in names if len(name) > 2)):
                    mapping[field] = column
                    used.add(column)
                    break
    return mapping


def guess_table(columns: List[str]) -> Dict[str, Any]:
    """Reconnaissance par les intitulés de colonnes, sans IA."""
    sales_mapping = _match_columns(columns, SALE_ALIASES)
    product_mapping = _match_columns(columns, PRODUCT_ALIASES)
    sales_score = (
        (4 if "date" in sales_mapping else 0)
        + (2 if "total" in sales_mapping else 0)
        + sum(1 for field in ("payment_method", "reference", "customer_name") if field in sales_mapping)
    )
    stock_column = product_mapping.get("quantity")
    stock_specific = bool(stock_column) and "stock" in normalize_label(stock_column)
    products_score = (
        (3 if "name" in product_mapping else 0)
        + (2 if stock_specific else 0)
        + sum(1 for field in ("purchase_price", "sku", "category_name", "min_stock") if field in product_mapping)
    )
    if "date" in sales_mapping and sales_score >= 5 and sales_score > products_score:
        return {"kind": KIND_SALES, "mapping": sales_mapping, "confidence": 0.9 if sales_score >= 6 else 0.75}
    if "date" in sales_mapping and ("total" in sales_mapping or "unit_price" in sales_mapping) and not stock_specific:
        return {"kind": KIND_SALES, "mapping": sales_mapping, "confidence": 0.7}
    if "name" in product_mapping and products_score >= 4:
        return {"kind": KIND_PRODUCTS, "mapping": product_mapping, "confidence": 0.85}
    if "name" in product_mapping and "selling_price" in product_mapping:
        return {"kind": KIND_PRODUCTS, "mapping": product_mapping, "confidence": 0.65}
    return {"kind": None, "mapping": {}, "confidence": 0.0}


def mapping_for_kind(columns: List[str], kind: str) -> Dict[str, str]:
    if kind == KIND_SALES:
        return _match_columns(columns, SALE_ALIASES)
    if kind == KIND_PRODUCTS:
        return _match_columns(columns, PRODUCT_ALIASES)
    return {}


def _clean_sample(rows: List[Dict[str, Any]], limit: int = 8) -> List[Dict[str, str]]:
    sample = []
    for row in rows[:limit]:
        sample.append({str(key)[:60].replace("\n", " "): _cell_text(value)[:80].replace("\n", " ") for key, value in row.items()})
    return sample


def _extract_json(text: str) -> Any:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    start = min([index for index in (text.find("{"), text.find("[")) if index != -1], default=-1)
    if start == -1:
        raise ValueError("Réponse de l'IA sans JSON")
    end = max(text.rfind("}"), text.rfind("]")) + 1
    return json.loads(text[start:end])


def _fields_description() -> str:
    return (
        "Champs d'un tableau de PRODUITS : name (nom, obligatoire), sku (code-barres ou référence), "
        "quantity (stock actuel), purchase_price (prix d'achat), selling_price (prix de vente), "
        "category_name (catégorie), unit (unité), min_stock (stock minimum), description.\n"
        "Champs d'un tableau de VENTES : date (obligatoire), time (heure si colonne séparée), "
        "product_name (article vendu), quantity, unit_price (prix unitaire), total (montant de la ligne "
        "ou de la vente), purchase_price (coût), payment_method (mode de paiement), customer_name (client), "
        "reference (numéro de ticket ou de facture)."
    )


async def ai_classify_table(table: Dict[str, Any], model: Any) -> Dict[str, Any]:
    """L'IA reconnaît le type du tableau et associe les colonnes quand les règles n'ont pas suffi."""
    prompt = (
        "Tu aides un commerçant à reprendre les données de son ancien logiciel dans Stockman.\n"
        "Voici le début d'un tableau exporté. Dis s'il contient des produits (catalogue, stock) ou des "
        "ventes (historique daté), puis associe ses colonnes aux champs Stockman.\n\n"
        f"{_fields_description()}\n\n"
        "Règles : n'invente jamais de colonne ; utilise exactement les intitulés fournis ; si le tableau "
        "ne contient ni produits ni ventes, réponds \"unknown\". Réponds uniquement en JSON :\n"
        '{"kind": "products" | "sales" | "unknown", "mapping": {"champ": "Intitulé de colonne"}, "confidence": 0.0}\n\n'
        f"Feuille : {table.get('name')}\n"
        f"Colonnes : {json.dumps(table['columns'], ensure_ascii=False)}\n"
        f"Lignes : {json.dumps(_clean_sample(table['rows']), ensure_ascii=False)}"
    )
    response = await model.generate_content_async(prompt)
    payload = _extract_json(getattr(response, "text", ""))
    if not isinstance(payload, dict):
        raise ValueError("Réponse de l'IA inattendue")
    kind = payload.get("kind") if payload.get("kind") in (KIND_PRODUCTS, KIND_SALES) else None
    allowed = SALE_ALIASES if kind == KIND_SALES else PRODUCT_ALIASES
    columns = set(table["columns"])
    mapping = {
        field: column for field, column in (payload.get("mapping") or {}).items()
        if field in allowed and column in columns
    }
    try:
        confidence = max(0.0, min(1.0, float(payload.get("confidence") or 0)))
    except (TypeError, ValueError):
        confidence = 0.0
    if kind and not all(field in mapping for field in REQUIRED_FIELDS[kind]):
        kind = None
    return {"kind": kind, "mapping": mapping if kind else {}, "confidence": confidence if kind else 0.0}


async def classify_table(table: Dict[str, Any], model: Any = None) -> Dict[str, Any]:
    if table.get("preset"):
        return dict(table["preset"])
    guess = guess_table(table["columns"])
    if guess["kind"] and guess["confidence"] >= 0.75:
        return {**guess, "method": "rules"}
    if model is not None:
        try:
            result = await ai_classify_table(table, model)
            if result["kind"]:
                return {**result, "method": "ai"}
        except Exception as exc:
            logger.warning("Reconnaissance IA du tableau impossible : %s", exc)
    return {**guess, "method": "rules"}


async def ai_read_document(content: bytes, mime_type: str, filename: str, model: Any) -> List[Dict[str, Any]]:
    """PDF ou photo (cahier, état imprimé) : l'IA recopie les lignes dans un tableau."""
    import base64

    prompt = (
        "Ce document vient d'un commerçant qui passe à Stockman : export PDF de son ancien logiciel, "
        "inventaire imprimé ou page de cahier écrite à la main. Recopie fidèlement toutes ses lignes.\n\n"
        f"{_fields_description()}\n\n"
        "Règles : ne devine pas une valeur illisible (mets null) ; les montants et quantités sont des "
        "nombres sans devise ; les dates au format AAAA-MM-JJ (avec l'heure AAAA-MM-JJTHH:MM si elle "
        "figure) ; ignore les lignes de total. Un document peut contenir les deux types de tableaux.\n"
        "Réponds uniquement en JSON :\n"
        '{"tables": [{"kind": "products" | "sales", "title": "titre court", "rows": [{"champ": valeur}]}]}'
    )
    part = {"mime_type": mime_type, "data": base64.b64encode(content).decode("ascii")}
    response = await model.generate_content_async([prompt, part])
    payload = _extract_json(getattr(response, "text", ""))
    tables = []
    for index, item in enumerate((payload or {}).get("tables") or []):
        kind = item.get("kind")
        if kind not in (KIND_PRODUCTS, KIND_SALES):
            continue
        allowed = SALE_ALIASES if kind == KIND_SALES else PRODUCT_ALIASES
        rows = [
            {field: value for field, value in row.items() if field in allowed}
            for row in (item.get("rows") or []) if isinstance(row, dict)
        ]
        rows = [row for row in rows if any(_cell_text(value) for value in row.values())][:MAX_ROWS_PER_TABLE]
        if not rows:
            continue
        columns = [field for field in allowed if any(field in row for row in rows)]
        mapping = {field: field for field in columns}
        tables.append({
            "name": item.get("title") or f"{filename} ({index + 1})",
            "columns": columns,
            "rows": rows,
            "preset": {"kind": kind, "mapping": mapping, "confidence": 0.7, "method": "ai_document"},
        })
    if not tables:
        raise ValueError("L'IA n'a trouvé ni produits ni ventes lisibles dans ce document.")
    return tables


# ----------------------------------------------------------------------------- préparation


def _value(row: Dict[str, Any], mapping: Dict[str, str], field: str) -> Any:
    column = mapping.get(field)
    return row.get(column) if column else None


def _product_index(products: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_code = {}
    for product in products:
        for code in (product.get("sku"), product.get("barcode")):
            if code:
                by_code[normalize_label(code)] = product
    return {"products": products, "by_code": by_code, "by_name": {normalize_label(p.get("name")): p for p in products if p.get("name")}}


def find_product(index: Dict[str, Any], name: Any, code: Any = None) -> Optional[Dict[str, Any]]:
    if code and normalize_label(code) in index["by_code"]:
        return index["by_code"][normalize_label(code)]
    label = normalize_label(name)
    if not label:
        return None
    if label in index["by_name"]:
        return index["by_name"][label]
    best, best_score = None, 0.0
    for product in index["products"]:
        score = product_name_similarity(str(name), str(product.get("name") or ""))
        if score > best_score:
            best, best_score = product, score
    return best if best_score >= PRODUCT_MATCH_THRESHOLD else None


def prepare_products(rows: List[Dict[str, Any]], mapping: Dict[str, str], existing: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Lignes de produits au format attendu par l'import de produits, doublons écartés."""
    index = _product_index(existing)
    seen = set()
    ready, skipped, errors = [], [], []
    for position, row in enumerate(rows):
        line = position + 2  # ligne 1 = intitulés
        name = _cell_text(_value(row, mapping, "name"))
        if not name or normalize_label(name) in SKIPPED_NAMES:
            if name:
                continue
            errors.append({"row": line, "error": "Nom du produit manquant"})
            continue
        sku = _cell_text(_value(row, mapping, "sku"))
        key = normalize_label(sku) or normalize_label(name)
        if key in seen:
            skipped.append({"row": line, "name": name, "reason": "Ligne en double dans le fichier"})
            continue
        seen.add(key)
        match = find_product(index, name, sku)
        if match:
            skipped.append({"row": line, "name": name, "reason": f"Déjà dans votre catalogue : {match.get('name')}"})
            continue
        prepared = {"name": name}
        for field in ("purchase_price", "selling_price", "quantity", "min_stock"):
            number = parse_number(_value(row, mapping, field))
            if number is not None:
                prepared[field] = number
        for field in ("category_name", "unit", "description"):
            text = _cell_text(_value(row, mapping, field))
            if text:
                prepared[field] = text
        if sku:
            prepared["sku"] = sku
        ready.append(prepared)
    return {"rows": ready, "skipped": skipped, "errors": errors}


def _sale_line(row: Dict[str, Any], mapping: Dict[str, str], line: int) -> Dict[str, Any]:
    moment, has_time = parse_date(_value(row, mapping, "date"))
    if moment is None:
        raise ValueError("Date absente ou illisible")
    if "time" in mapping and not has_time:
        clock = parse_time(_value(row, mapping, "time"))
        if clock:
            moment = moment.replace(hour=clock.hour, minute=clock.minute, second=0)
            has_time = True
    if moment > utc_now() + timedelta(days=1):
        raise ValueError("Date dans le futur")
    if moment.year < 2000:
        raise ValueError("Date trop ancienne")
    quantity = parse_number(_value(row, mapping, "quantity"))
    unit_price = parse_number(_value(row, mapping, "unit_price"))
    total = parse_number(_value(row, mapping, "total"))
    if quantity is None or quantity == 0:
        quantity = 1.0
    if total is None and unit_price is not None:
        total = round(quantity * unit_price, 2)
    if total is None:
        raise ValueError("Montant absent")
    if total < 0 or quantity < 0:
        raise ValueError("Montant ou quantité négatif (retour ou avoir non repris)")
    if unit_price is None:
        unit_price = round(total / quantity, 2) if quantity else total
    return {
        "line": line,
        "moment": moment,
        "has_time": has_time,
        "product_name": _cell_text(_value(row, mapping, "product_name")),
        "quantity": quantity,
        "unit_price": unit_price,
        "total": round(total, 2),
        "purchase_price": parse_number(_value(row, mapping, "purchase_price")),
        "payment_method": normalize_payment_method(_value(row, mapping, "payment_method")),
        "customer_name": _cell_text(_value(row, mapping, "customer_name")),
        "reference": _cell_text(_value(row, mapping, "reference")),
    }


def _group_key(line: Dict[str, Any]) -> Tuple:
    """Une vente = un ticket. Sans numéro de ticket, les lignes de la même minute et du même client
    forment un ticket ; sans heure, chaque ligne est une vente."""
    if line["reference"]:
        return ("ref", line["reference"])
    if line["has_time"]:
        return ("time", line["moment"].replace(second=0, microsecond=0).isoformat(), line["customer_name"])
    return ("line", line["line"])


def sale_fingerprint(sale: Dict[str, Any]) -> str:
    """Empreinte d'une vente reprise : réimporter le même fichier ne la crée pas deux fois."""
    parts = [
        sale.get("import_reference") or "",
        _as_utc(sale["created_at"]).strftime("%Y-%m-%dT%H:%M"),
        f"{float(sale.get('total_amount') or 0):.2f}",
        "|".join(sorted(f"{normalize_label(item.get('product_name'))}:{float(item.get('quantity') or 0):g}" for item in sale.get("items") or [])),
    ]
    return hashlib.sha256("#".join(parts).encode("utf-8")).hexdigest()[:32]


def prepare_sales(
    rows: List[Dict[str, Any]],
    mapping: Dict[str, str],
    products: List[Dict[str, Any]],
    owner_id: str,
    store_id: str,
    unnamed_label: str = "Ventes reprises",
) -> Dict[str, Any]:
    index = _product_index(products)
    groups: Dict[Tuple, List[Dict[str, Any]]] = {}
    errors = []
    skipped_totals = 0
    for position, row in enumerate(rows):
        line_number = position + 2
        try:
            line = _sale_line(row, mapping, line_number)
        except ValueError as exc:
            first_text = next((normalize_label(value) for value in row.values() if isinstance(value, str) and value.strip()), "")
            if first_text in SKIPPED_NAMES or first_text.startswith("total"):
                skipped_totals += 1
                continue
            errors.append({"row": line_number, "error": str(exc)})
            continue
        groups.setdefault(_group_key(line), []).append(line)

    sales = []
    matched = unmatched = 0
    unmatched_names: Dict[str, int] = {}
    for lines in groups.values():
        items = []
        for line in lines:
            product = find_product(index, line["product_name"]) if line["product_name"] else None
            if line["product_name"]:
                if product:
                    matched += 1
                else:
                    unmatched += 1
                    unmatched_names[line["product_name"]] = unmatched_names.get(line["product_name"], 0) + 1
            purchase_price = line["purchase_price"]
            if purchase_price is None and product:
                purchase_price = float(product.get("purchase_price") or 0)
            items.append({
                "product_id": product.get("product_id") if product else "",
                "product_name": (product.get("name") if product else line["product_name"]) or unnamed_label,
                "quantity": line["quantity"],
                "purchase_price": float(purchase_price or 0),
                "selling_price": line["unit_price"],
                "discount_amount": 0.0,
                "total": line["total"],
                "tax_rate": 0.0,
                "tax_amount": 0.0,
            })
        first = lines[0]
        total = round(sum(item["total"] for item in items), 2)
        payments: Dict[str, float] = {}
        for line in lines:
            payments[line["payment_method"]] = round(payments.get(line["payment_method"], 0) + line["total"], 2)
        payment_method = max(payments, key=payments.get)
        sale = {
            "sale_id": f"sale_{uuid.uuid4().hex[:12]}",
            "user_id": owner_id,
            "store_id": store_id,
            "items": items,
            "total_amount": total,
            "discount_amount": 0.0,
            "payment_method": payment_method,
            "payments": [{"method": method, "amount": amount} for method, amount in payments.items()],
            "customer_id": None,
            "customer_name": next((line["customer_name"] for line in lines if line["customer_name"]), None),
            "created_at": min(line["moment"] for line in lines),
            "status": "completed",
            "source": IMPORT_SOURCE,
            "tax_total": 0.0,
            "tax_mode": "ttc",
            "subtotal_ht": total,
            "service_type": "takeaway",
            "import_reference": first["reference"] or None,
        }
        sale["import_fingerprint"] = sale_fingerprint(sale)
        sales.append(sale)
    sales.sort(key=lambda sale: sale["created_at"])
    return {
        "sales": sales,
        "errors": errors,
        "skipped_totals": skipped_totals,
        "matched_lines": matched,
        "unmatched_lines": unmatched,
        "unmatched_names": sorted(unmatched_names, key=unmatched_names.get, reverse=True)[:10],
    }


# ----------------------------------------------------------------------------- aperçu


def _normalized_preview(rows: List[Dict[str, Any]], mapping: Dict[str, str]) -> List[Dict[str, str]]:
    return [{field: _cell_text(row.get(column)) for field, column in mapping.items()} for row in rows[:PREVIEW_ROWS]]


async def summarize_table(db, table: Dict[str, Any], owner_id: str, store_id: str) -> Dict[str, Any]:
    kind, mapping = table.get("kind"), table.get("mapping") or {}
    summary: Dict[str, Any] = {
        "index": table["index"],
        "name": table["name"],
        "kind": kind,
        "method": table.get("method"),
        "confidence": table.get("confidence", 0),
        "columns": table["columns"],
        "mapping": mapping,
        "row_count": len(table["rows"]),
        "preview": _normalized_preview(table["rows"], mapping) if kind in (KIND_PRODUCTS, KIND_SALES) else [],
        "missing_fields": [field for field in REQUIRED_FIELDS.get(kind, ()) if field not in mapping],
    }
    if kind == KIND_PRODUCTS and not summary["missing_fields"]:
        existing = await _store_products(db, owner_id, store_id)
        prepared = prepare_products(table["rows"], mapping, existing)
        summary.update({
            "products_ready": len(prepared["rows"]),
            "products_skipped": len(prepared["skipped"]),
            "errors": prepared["errors"][:20],
            "error_count": len(prepared["errors"]),
            "skipped": prepared["skipped"][:20],
        })
    elif kind == KIND_SALES and not summary["missing_fields"]:
        products = await _store_products(db, owner_id, store_id)
        prepared = prepare_sales(table["rows"], mapping, products, owner_id, store_id)
        sales = prepared["sales"]
        known = await _known_fingerprints(db, owner_id, store_id, [sale["import_fingerprint"] for sale in sales])
        fresh = [sale for sale in sales if sale["import_fingerprint"] not in known]
        summary.update({
            "sales_ready": len(fresh),
            "already_imported": len(sales) - len(fresh),
            "revenue": round(sum(sale["total_amount"] for sale in fresh), 2),
            "first_date": fresh[0]["created_at"].date().isoformat() if fresh else None,
            "last_date": fresh[-1]["created_at"].date().isoformat() if fresh else None,
            "matched_lines": prepared["matched_lines"],
            "unmatched_lines": prepared["unmatched_lines"],
            "unmatched_names": prepared["unmatched_names"],
            "errors": prepared["errors"][:20],
            "error_count": len(prepared["errors"]),
        })
    return summary


async def _store_products(db, owner_id: str, store_id: str) -> List[Dict[str, Any]]:
    return await db.products.find(
        {"user_id": owner_id, "store_id": store_id, "is_active": {"$ne": False}},
        {"_id": 0, "product_id": 1, "name": 1, "sku": 1, "barcode": 1, "purchase_price": 1},
    ).to_list(None)


async def _known_fingerprints(db, owner_id: str, store_id: str, fingerprints: List[str]) -> set:
    if not fingerprints:
        return set()
    docs = await db.sales.find(
        {"user_id": owner_id, "store_id": store_id, "source": IMPORT_SOURCE, "import_fingerprint": {"$in": fingerprints}},
        {"_id": 0, "import_fingerprint": 1},
    ).to_list(None)
    return {doc.get("import_fingerprint") for doc in docs}


# ----------------------------------------------------------------------------- brouillon, import, annulation


# Une analyse est gardée en base le temps de la relecture ; MongoDB refuse les documents de plus de 16 Mo.
MAX_DRAFT_BYTES = 12 * 1024 * 1024


async def create_draft(db, owner_id: str, store_id: str, user_id: str, filename: str, tables: List[Dict[str, Any]], model: Any = None) -> Dict[str, Any]:
    size = len(json.dumps([table["rows"] for table in tables], default=str, ensure_ascii=False).encode("utf-8"))
    if size > MAX_DRAFT_BYTES:
        raise ValueError("Ce fichier contient trop de données pour un seul import : découpez-le (par année, par exemple) et importez les parties l'une après l'autre.")
    await db.migration_drafts.delete_many({"owner_id": owner_id, "expires_at": {"$lt": utc_now()}})
    stored = []
    for index, table in enumerate(tables):
        result = await classify_table(table, model)
        stored.append({
            "index": index,
            "name": table["name"],
            "columns": table["columns"],
            "rows": table["rows"],
            "kind": result.get("kind") or KIND_IGNORE,
            "mapping": result.get("mapping") or {},
            "confidence": result.get("confidence", 0),
            "method": result.get("method"),
        })
    draft = {
        "draft_id": f"mig_{uuid.uuid4().hex[:12]}",
        "owner_id": owner_id,
        "store_id": store_id,
        "created_by": user_id,
        "file_name": filename,
        "tables": stored,
        "created_at": utc_now(),
        "expires_at": utc_now() + DRAFT_TTL,
    }
    await db.migration_drafts.insert_one(dict(draft))
    return await draft_summary(db, draft)


async def draft_summary(db, draft: Dict[str, Any]) -> Dict[str, Any]:
    tables = [await summarize_table(db, table, draft["owner_id"], draft["store_id"]) for table in draft["tables"]]
    return {"draft_id": draft["draft_id"], "file_name": draft["file_name"], "tables": tables}


async def get_draft(db, draft_id: str, owner_id: str) -> Dict[str, Any]:
    draft = await db.migration_drafts.find_one({"draft_id": draft_id, "owner_id": owner_id}, {"_id": 0})
    if not draft:
        raise LookupError("Analyse introuvable ou expirée : déposez à nouveau le fichier.")
    return draft


async def change_table_kind(db, draft: Dict[str, Any], index: int, kind: str, model: Any = None) -> Dict[str, Any]:
    if kind not in KINDS:
        raise ValueError("Type de tableau inconnu")
    tables = draft["tables"]
    if not 0 <= index < len(tables):
        raise ValueError("Tableau introuvable")
    table = tables[index]
    mapping: Dict[str, str] = {}
    if kind in (KIND_PRODUCTS, KIND_SALES):
        mapping = mapping_for_kind(table["columns"], kind)
        if table.get("method") == "ai_document":
            mapping = {field: field for field in table["columns"] if field in (SALE_ALIASES if kind == KIND_SALES else PRODUCT_ALIASES)}
        elif model is not None and not all(field in mapping for field in REQUIRED_FIELDS[kind]):
            try:
                result = await ai_classify_table({**table, "name": f"{table['name']} (le commerçant indique : {kind})"}, model)
                if result["kind"] == kind:
                    mapping = result["mapping"]
            except Exception as exc:
                logger.warning("Association IA des colonnes impossible : %s", exc)
    table.update({"kind": kind, "mapping": mapping, "method": table.get("method") if kind != KIND_IGNORE else None})
    await db.migration_drafts.update_one(
        {"draft_id": draft["draft_id"]},
        {"$set": {f"tables.{index}.kind": kind, f"tables.{index}.mapping": mapping}},
    )
    return await summarize_table(db, table, draft["owner_id"], draft["store_id"])


async def change_table_mapping(db, draft: Dict[str, Any], index: int, mapping: Dict[str, Optional[str]]) -> Dict[str, Any]:
    tables = draft["tables"]
    if not 0 <= index < len(tables):
        raise ValueError("Tableau introuvable")
    table = tables[index]
    allowed = SALE_ALIASES if table["kind"] == KIND_SALES else PRODUCT_ALIASES
    columns = set(table["columns"])
    cleaned = {field: column for field, column in (mapping or {}).items() if field in allowed and column in columns}
    table["mapping"] = cleaned
    await db.migration_drafts.update_one({"draft_id": draft["draft_id"]}, {"$set": {f"tables.{index}.mapping": cleaned}})
    return await summarize_table(db, table, draft["owner_id"], draft["store_id"])


async def run_import(db, draft: Dict[str, Any], user_id: str, import_service: Any, unnamed_label: str = "Ventes reprises") -> Dict[str, Any]:
    """Enregistre le brouillon : produits d'abord (les ventes s'y rattachent), puis ventes."""
    owner_id, store_id = draft["owner_id"], draft["store_id"]
    batch_id = f"imp_{uuid.uuid4().hex[:12]}"
    report: Dict[str, Any] = {
        "products_created": 0, "products_skipped": 0, "sales_created": 0, "sales_already_imported": 0,
        "revenue": 0.0, "first_date": None, "last_date": None, "errors": [], "error_count": 0, "unmatched_names": [],
    }

    def add_errors(table: Dict[str, Any], errors: List[Dict[str, Any]]):
        report["error_count"] += len(errors)
        room = MAX_REPORTED_ERRORS - len(report["errors"])
        for error in errors[:max(room, 0)]:
            report["errors"].append({"table": table["name"], **error})

    tables = sorted(
        [table for table in draft["tables"] if table.get("kind") in (KIND_PRODUCTS, KIND_SALES)],
        key=lambda table: 0 if table["kind"] == KIND_PRODUCTS else 1,
    )
    if not tables:
        raise ValueError("Aucun tableau à importer : choisissez Produits ou Ventes pour au moins un tableau.")
    for table in tables:
        missing = [field for field in REQUIRED_FIELDS[table["kind"]] if field not in (table.get("mapping") or {})]
        if missing:
            raise ValueError(f"« {table['name']} » : indiquez la colonne {', '.join(missing)} avant d'importer.")

    await db.migration_batches.insert_one({
        "batch_id": batch_id, "owner_id": owner_id, "store_id": store_id, "created_by": user_id,
        "file_name": draft["file_name"], "status": "running", "created_at": utc_now(),
    })
    try:
        for table in tables:
            if table["kind"] == KIND_PRODUCTS:
                existing = await _store_products(db, owner_id, store_id)
                prepared = prepare_products(table["rows"], table["mapping"], existing)
                report["products_skipped"] += len(prepared["skipped"])
                add_errors(table, prepared["errors"])
                if prepared["rows"]:
                    validated = await import_service.validate_and_prepare_products(prepared["rows"], owner_id, store_id)
                    add_errors(table, [
                        {"row": None, "error": f"{prepared['rows'][error['row']]['name']} : {error.get('error')}"
                         if isinstance(error.get("row"), int) and error["row"] < len(prepared["rows"]) else error.get("error")}
                        for error in validated["errors"]
                    ])
                    products = validated["products"]
                    for product in products:
                        product["import_batch_id"] = batch_id
                    report["products_created"] += await import_service.execute_bulk_insert(products)
            else:
                products = await _store_products(db, owner_id, store_id)
                prepared = prepare_sales(table["rows"], table["mapping"], products, owner_id, store_id, unnamed_label)
                add_errors(table, prepared["errors"])
                sales = prepared["sales"]
                known = await _known_fingerprints(db, owner_id, store_id, [sale["import_fingerprint"] for sale in sales])
                fresh = [sale for sale in sales if sale["import_fingerprint"] not in known]
                report["sales_already_imported"] += len(sales) - len(fresh)
                for sale in fresh:
                    sale["import_batch_id"] = batch_id
                for start in range(0, len(fresh), 500):
                    await db.sales.insert_many(fresh[start:start + 500])
                report["sales_created"] += len(fresh)
                report["revenue"] = round(report["revenue"] + sum(sale["total_amount"] for sale in fresh), 2)
                if fresh:
                    first, last = fresh[0]["created_at"].date().isoformat(), fresh[-1]["created_at"].date().isoformat()
                    report["first_date"] = min(filter(None, [report["first_date"], first]))
                    report["last_date"] = max(filter(None, [report["last_date"], last]))
                report["unmatched_names"] = (report["unmatched_names"] + prepared["unmatched_names"])[:10]
    except Exception:
        await db.migration_batches.update_one({"batch_id": batch_id}, {"$set": {"status": "failed", "finished_at": utc_now()}})
        await undo_batch(db, batch_id, owner_id, force=True)
        raise
    await db.migration_batches.update_one(
        {"batch_id": batch_id},
        {"$set": {"status": "done", "finished_at": utc_now(), "report": report}},
    )
    await db.migration_drafts.delete_one({"draft_id": draft["draft_id"]})
    return {"batch_id": batch_id, **report}


async def list_batches(db, owner_id: str, store_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {"owner_id": owner_id, "status": {"$in": ["done", "undone"]}}
    if store_id:
        query["store_id"] = store_id
    batches = await db.migration_batches.find(query, {"_id": 0}).sort("created_at", -1).limit(30).to_list(30)
    now = utc_now()
    for batch in batches:
        created = batch.get("created_at")
        batch["can_undo"] = batch.get("status") == "done" and isinstance(created, datetime) and now - _as_utc(created) <= UNDO_WINDOW
    return batches


async def undo_batch(db, batch_id: str, owner_id: str, force: bool = False) -> Dict[str, Any]:
    """Retire tout ce qu'un import a créé. Un produit vendu depuis en caisse est gardé."""
    batch = await db.migration_batches.find_one({"batch_id": batch_id, "owner_id": owner_id}, {"_id": 0})
    if not batch:
        raise LookupError("Import introuvable")
    if not force:
        if batch.get("status") != "done":
            raise ValueError("Cet import a déjà été annulé.")
        created = batch.get("created_at")
        if isinstance(created, datetime) and utc_now() - _as_utc(created) > UNDO_WINDOW:
            raise ValueError("Cet import date de plus de 30 jours : il ne peut plus être annulé en entier.")
    sales_removed = await db.sales.delete_many({"user_id": owner_id, "source": IMPORT_SOURCE, "import_batch_id": batch_id})
    products = await db.products.find({"user_id": owner_id, "import_batch_id": batch_id}, {"_id": 0, "product_id": 1}).to_list(None)
    removable, kept = [], 0
    for product in products:
        used = await db.sales.count_documents({"user_id": owner_id, "items.product_id": product["product_id"]})
        if used:
            kept += 1
        else:
            removable.append(product["product_id"])
    if removable:
        await db.products.delete_many({"user_id": owner_id, "product_id": {"$in": removable}})
        await db.stock_movements.delete_many({"user_id": owner_id, "product_id": {"$in": removable}})
    result = {
        "sales_removed": getattr(sales_removed, "deleted_count", 0),
        "products_removed": len(removable),
        "products_kept": kept,
    }
    if not force:
        await db.migration_batches.update_one(
            {"batch_id": batch_id},
            {"$set": {"status": "undone", "undone_at": utc_now(), "undo_result": result}},
        )
    return result
