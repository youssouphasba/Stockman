"""Caisse vocale : retrouver les produits du catalogue dans une phrase dictée.

La transcription n'est jamais parfaite (« gaz pièce » pour « Gaze pièce », accents ou
pluriels différents) et le commerçant ne prononce pas toujours le nom complet. La
recherche est donc tolérante : sans accents, avec une marge d'erreur sur l'orthographe,
et sur une partie du nom quand elle désigne un seul produit sans ambiguïté. Quand
plusieurs produits correspondent, ils sont proposés au commerçant, qui choisit.
"""

import json
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

FULL_NAME_THRESHOLD = 0.84
TOKEN_THRESHOLD = 0.85
# Ressemblance plus lointaine : jamais ajoutée d'office, seulement proposée au choix.
LOOSE_TOKEN_THRESHOLD = 0.72
MAX_SUGGESTED_PRODUCTS = 6
# Nombre de premières lettres identiques qui suffit à reconnaître un mot dont la fin est
# mal transcrite : 5 pour retenir le produit (s'il est seul à correspondre), 4 pour le proposer.
PREFIX_LENGTH = 5
LOOSE_PREFIX_LENGTH = 4
MAX_QUANTITY = 999

NUMBER_WORDS = {
    "un": 1, "une": 1, "one": 1, "uno": 1, "una": 1,
    "deux": 2, "two": 2, "dos": 2,
    "trois": 3, "three": 3, "tres": 3,
    "quatre": 4, "four": 4, "cuatro": 4,
    "cinq": 5, "five": 5, "cinco": 5,
    "six": 6, "seis": 6,
    "sept": 7, "seven": 7, "siete": 7,
    "huit": 8, "eight": 8, "ocho": 8,
    "neuf": 9, "nine": 9, "nueve": 9,
    "dix": 10, "ten": 10, "diez": 10,
    "onze": 11, "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15,
    "seize": 16, "vingt": 20, "trente": 30, "quarante": 40, "cinquante": 50,
}
STOPWORDS = {
    "de", "du", "des", "d", "le", "la", "les", "l", "et", "avec", "puis", "plus",
    "the", "and", "of", "a", "au", "aux", "en", "y", "el", "los", "las",
}
MULTIPLIERS = {"fois", "x"}
# Mots qui peuvent séparer la quantité du nom : « deux boîtes de paracétamol ».
QUANTITY_FILLERS = STOPWORDS | {
    "boite", "boites", "bouteille", "bouteilles", "paquet", "paquets", "piece", "pieces",
    "sac", "sacs", "sachet", "sachets", "carton", "cartons", "kilo", "kilos", "kg",
    "litre", "litres", "unite", "unites",
}


def normalize(text: str) -> str:
    """Minuscules, sans accents ni ponctuation."""
    decomposed = unicodedata.normalize("NFKD", (text or "").replace("×", " x "))
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", without_accents.lower()).strip()


def tokenize(text: str) -> List[str]:
    normalized = normalize(text)
    return normalized.split() if normalized else []


def _tokenize_with_words(text: str) -> Tuple[List[str], List[str]]:
    """Mots normalisés et, en parallèle, les mots tels qu'ils ont été dits (pour l'affichage)."""
    tokens: List[str] = []
    words: List[str] = []
    for word in re.findall(r"[^\W_]+", (text or "").replace("×", " x ")):
        for token in tokenize(word):
            tokens.append(token)
            words.append(word)
    return tokens, words


def _ratio(left: str, right: str, threshold: float) -> float:
    if left == right:
        return 1.0
    matcher = SequenceMatcher(None, left, right)
    if matcher.real_quick_ratio() < threshold or matcher.quick_ratio() < threshold:
        return 0.0
    return matcher.ratio()


def _common_prefix(left: str, right: str) -> int:
    length = 0
    for first, second in zip(left, right):
        if first != second:
            break
        length += 1
    return length


def _tokens_match(said: str, expected: str, loose: bool = False) -> bool:
    if said == expected:
        return True
    # Les mots très courts et les nombres doivent être exacts (« 40 » n'est pas « 400 »).
    if min(len(said), len(expected)) < 3 or said.isdigit() or expected.isdigit():
        return False
    # Début du mot bien compris, fin déformée : « oxybupreakain » pour « oxybuprocaïne ».
    if _common_prefix(said, expected) >= (LOOSE_PREFIX_LENGTH if loose else PREFIX_LENGTH):
        return True
    if loose and min(len(said), len(expected)) < 4:
        return False
    threshold = LOOSE_TOKEN_THRESHOLD if loose else TOKEN_THRESHOLD
    return _ratio(said, expected, threshold) >= threshold


def _partial_match(tokens: List[str], free: List[int], significant: List[str], loose: bool) -> Tuple[List[int], set]:
    """Mots libres de la phrase qui se retrouvent dans le nom du produit."""
    matched_text: List[int] = []
    matched_name: set = set()
    for index in free:
        for name_index, expected in enumerate(significant):
            if name_index not in matched_name and _tokens_match(tokens[index], expected, loose):
                matched_name.add(name_index)
                matched_text.append(index)
                break
    return matched_text, matched_name


def _number(token: str) -> Optional[int]:
    if token.isdigit():
        return int(token)
    return NUMBER_WORDS.get(token)


def _quantity(tokens: List[str], start: int, end: int, taken: set) -> int:
    """Quantité dite juste avant le produit (« 2 coca ») ou après (« coca fois 3 »)."""
    quantity: Optional[int] = None
    index = start - 1
    skipped = 0
    while index >= 0 and index not in taken and skipped <= 2:
        value = _number(tokens[index])
        if value is not None:
            quantity = value
            break
        if tokens[index] not in QUANTITY_FILLERS:
            break
        skipped += 1
        index -= 1
    if quantity is None and end + 1 < len(tokens) and tokens[end] in MULTIPLIERS and (end + 1) not in taken:
        quantity = _number(tokens[end + 1])
    return max(1, min(quantity or 1, MAX_QUANTITY))


def match_products_from_text(text: str, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Retourne la liste ``{"product", "qty"}`` des produits reconnus sans ambiguïté."""
    return analyze_text(text, products)["matches"]


def analyze_text(text: str, products: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Analyse la phrase dictée.

    ``matches`` : produits reconnus sans ambiguïté, ``{"product", "qty"}``.
    ``suggestions`` : pour un passage qui correspond à plusieurs produits ou qui n'y ressemble
    que de loin, ``{"said", "qty", "products"}`` ; le commerçant choisit.
    """
    tokens, words = _tokenize_with_words(text)
    if not tokens:
        return {"matches": [], "suggestions": []}

    catalog: List[Tuple[Dict[str, Any], List[str]]] = []
    for product in products:
        name_tokens = tokenize(product.get("name") or "")
        if name_tokens and len("".join(name_tokens)) >= 2:
            catalog.append((product, name_tokens))

    # 1. Nom complet, avec une marge d'erreur sur l'orthographe.
    full_candidates: List[Tuple[float, int, int, int, int]] = []
    for position, (_product, name_tokens) in enumerate(catalog):
        name = " ".join(name_tokens)
        exact_only = len(name) <= 3
        for size in {len(name_tokens) - 1, len(name_tokens), len(name_tokens) + 1}:
            if size < 1 or size > len(tokens):
                continue
            for start in range(0, len(tokens) - size + 1):
                window = " ".join(tokens[start:start + size])
                score = 1.0 if window == name else (0.0 if exact_only else _ratio(window, name, FULL_NAME_THRESHOLD))
                if score >= FULL_NAME_THRESHOLD:
                    full_candidates.append((score, size, start, start + size, position))

    taken: set = set()
    used_products: set = set()
    found: List[Tuple[int, int, int]] = []  # (start, end, position dans le catalogue)
    for score, size, start, end, position in sorted(full_candidates, key=lambda item: (-item[0], -item[1], item[2])):
        span = set(range(start, end))
        if position in used_products or span & taken:
            continue
        taken |= span
        used_products.add(position)
        found.append((start, end, position))

    # 2. Nom partiel (« oxybuprocaïne » pour « Oxybuprocaïne 40mg collyre »), seulement
    #    quand un seul produit correspond : un doute ne doit pas remplir le panier.
    free = [
        index for index, token in enumerate(tokens)
        if index not in taken and token not in STOPWORDS and token not in MULTIPLIERS and _number(token) is None and len(token) >= 3
    ]
    partial_candidates: List[Tuple[int, float, Tuple[int, ...], int]] = []
    if free:
        for position, (_product, name_tokens) in enumerate(catalog):
            if position in used_products:
                continue
            significant = [token for token in name_tokens if len(token) >= 3 and not token.isdigit()]
            if not significant:
                continue
            matched_text, matched_name = _partial_match(tokens, free, significant, loose=False)
            if not matched_text:
                continue
            if 0 not in matched_name and len(matched_text) < 2:
                continue
            coverage = round(len(matched_name) / len(significant), 3)
            partial_candidates.append((len(matched_text), coverage, tuple(matched_text), position))

    partial_candidates.sort(key=lambda item: (-item[0], -item[1]))
    for count, coverage, indices, position in partial_candidates:
        span = set(indices)
        if span & taken:
            continue
        ambiguous = any(
            other_position != position and other_count == count and other_coverage == coverage and span & set(other_indices)
            for other_count, other_coverage, other_indices, other_position in partial_candidates
        )
        if ambiguous:
            continue
        taken |= span
        used_products.add(position)
        found.append((min(indices), max(indices) + 1, position))

    matches = []
    for start, end, position in sorted(found):
        matches.append({"product": catalog[position][0], "qty": _quantity(tokens, start, end, taken)})

    # 3. Ce qui reste : plusieurs produits possibles, ou une ressemblance plus lointaine.
    #    Rien n'est ajouté d'office ; les produits sont proposés et le commerçant choisit.
    remaining = [index for index in free if index not in taken]
    groups: Dict[int, List[Tuple[int, float, Tuple[int, ...], int]]] = {}
    if remaining:
        for position, (_product, name_tokens) in enumerate(catalog):
            if position in used_products:
                continue
            significant = [token for token in name_tokens if len(token) >= 3 and not token.isdigit()]
            if not significant:
                continue
            matched_text, matched_name = _partial_match(tokens, remaining, significant, loose=True)
            if not matched_text:
                continue
            coverage = round(len(matched_name) / len(significant), 3)
            groups.setdefault(min(matched_text), []).append((len(matched_text), coverage, tuple(matched_text), position))

    suggestions = []
    for first_index in sorted(groups):
        candidates = sorted(groups[first_index], key=lambda item: (-item[0], -item[1]))[:MAX_SUGGESTED_PRODUCTS]
        indices = sorted({index for candidate in candidates for index in candidate[2]})
        suggestions.append({
            "said": " ".join(words[index] for index in indices),
            "qty": _quantity(tokens, indices[0], indices[-1] + 1, taken),
            "products": [catalog[candidate[3]][0] for candidate in candidates],
        })

    return {"matches": matches, "suggestions": suggestions}


# ---------------------------------------------------------------------------
# Transcription guidée par le catalogue
# ---------------------------------------------------------------------------
# Sans connaître les produits, la transcription se trompe (« gaze » entendu « gas », « eau »
# entendu « oh ») et peut boucler sur un bruit. On donne donc le catalogue au modèle, qui
# renvoie les produits qu'il a reconnus ; seuls les noms présents au catalogue sont retenus.
MAX_CATALOG_NAMES = 500
MAX_AI_CANDIDATES = 5


def build_ai_prompt(products: List[Dict[str, Any]], language_name: str) -> str:
    names = []
    seen = set()
    for product in products:
        name = (product.get("name") or "").strip()
        if name and name.lower() not in seen:
            seen.add(name.lower())
            names.append(name)
        if len(names) >= MAX_CATALOG_NAMES:
            break
    catalog = "\n".join(f"- {name}" for name in names)
    return (
        "You are the voice checkout of a small shop. In the audio, the cashier lists products to sell, "
        f"usually in {language_name}, sometimes with a quantity (\"deux\", \"3\", \"une fois\"...).\n"
        "Here is the shop catalog, one product per line:\n"
        f"{catalog}\n\n"
        "Return only JSON with this shape:\n"
        "{\"transcription\": \"words actually heard\", "
        "\"items\": [{\"name\": \"exact catalog name\", \"quantity\": 1}], "
        "\"unsure\": [{\"said\": \"words heard\", \"quantity\": 1, \"candidates\": [\"exact catalog name\"]}]}\n"
        "Rules:\n"
        "- Spoken words are often short or mispronounced forms of catalog names (\"gaz\" or \"gas\" for \"Gaze pièce\", "
        "\"eau\" for \"Eau pour préparation injectable\"): match them to the catalog.\n"
        "- Use only names copied exactly from the catalog.\n"
        "- Put a product in \"items\" only when one catalog product clearly fits. When several could fit, put the spoken "
        f"words in \"unsure\" with up to {MAX_AI_CANDIDATES} candidates, best first.\n"
        "- Quantity defaults to 1.\n"
        "- If the audio is silent or unintelligible, return empty lists. Write the transcription once, never repeat it."
    )


def collapse_repetitions(text: str, max_length: int = 300) -> str:
    """Supprime les répétitions en boucle (« Gas, gas. Gas, gas. ... ») d'une transcription."""
    parts = [part.strip() for part in re.split(r"(?<=[.!?\n])\s+", text or "") if part.strip()]
    kept: List[str] = []
    for part in parts:
        if not kept or normalize(part) != normalize(kept[-1]):
            kept.append(part)
    collapsed = " ".join(kept)
    return collapsed if len(collapsed) <= max_length else collapsed[:max_length].rstrip() + "…"


def _ai_quantity(value: Any) -> int:
    try:
        return max(1, min(int(round(float(value))), MAX_QUANTITY))
    except (TypeError, ValueError):
        return 1


def parse_ai_response(raw: str, products: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Lit la réponse JSON du modèle. Renvoie None si elle est inexploitable."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        data = json.loads(text)
    except ValueError:
        match = re.search(r"\{.*\}", text, re.S)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
        except ValueError:
            return None
    if not isinstance(data, dict):
        return None

    by_name: Dict[str, List[Dict[str, Any]]] = {}
    for product in products:
        key = normalize(product.get("name") or "")
        if key:
            by_name.setdefault(key, []).append(product)

    matches: List[Dict[str, Any]] = []
    suggestions: List[Dict[str, Any]] = []
    used = set()
    for item in data.get("items") or []:
        if not isinstance(item, dict):
            continue
        found = by_name.get(normalize(str(item.get("name") or "")), [])
        quantity = _ai_quantity(item.get("quantity"))
        if len(found) == 1 and found[0].get("product_id") not in used:
            used.add(found[0].get("product_id"))
            matches.append({"product": found[0], "qty": quantity})
        elif len(found) > 1:  # plusieurs produits portent ce nom : le commerçant choisit
            suggestions.append({"said": str(item.get("name")), "qty": quantity, "products": found[:MAX_SUGGESTED_PRODUCTS]})
    for entry in data.get("unsure") or []:
        if not isinstance(entry, dict):
            continue
        candidates: List[Dict[str, Any]] = []
        for name in entry.get("candidates") or []:
            for product in by_name.get(normalize(str(name)), []):
                if product.get("product_id") not in used and product not in candidates:
                    candidates.append(product)
        if candidates:
            suggestions.append({
                "said": str(entry.get("said") or "").strip()[:80],
                "qty": _ai_quantity(entry.get("quantity")),
                "products": candidates[:MAX_SUGGESTED_PRODUCTS],
            })
    transcription = collapse_repetitions(str(data.get("transcription") or ""))
    return {"transcription": transcription, "matches": matches, "suggestions": suggestions}


def merge_analyses(primary: Dict[str, Any], secondary: Dict[str, Any]) -> Dict[str, Any]:
    """Réunit deux analyses sans doublon : la première l'emporte."""
    matched_ids = {match["product"].get("product_id") for match in primary["matches"]}
    matches = list(primary["matches"])
    for match in secondary["matches"]:
        product_id = match["product"].get("product_id")
        if product_id not in matched_ids:
            matched_ids.add(product_id)
            matches.append(match)
    suggestions = []
    seen_groups = set()
    for suggestion in primary["suggestions"] + secondary["suggestions"]:
        products = [product for product in suggestion["products"] if product.get("product_id") not in matched_ids]
        key = tuple(sorted(str(product.get("product_id")) for product in products))
        if products and key not in seen_groups:
            seen_groups.add(key)
            suggestions.append({**suggestion, "products": products})
    return {"matches": matches, "suggestions": suggestions}
