"""Socle du moteur de thèmes e-commerce Stockman.

Le serveur reste l'autorité : registre des modèles et des sections de confiance,
validation stricte des documents de thème, capacités d'édition par canal et par
abonnement, et projection du site actuel (Stockman Basic, ``legacy-v1``).

Ce module ne remplace pas encore le rendu public et n'écrit dans aucune donnée
commerciale (produits, prix, stocks, commandes, paiements).
"""

import copy
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional

from ecommerce_media import parse_media_url
from enterprise_access import normalize_plan

logger = logging.getLogger(__name__)

CONTRACT_PATH = Path(__file__).resolve().parent / "ecommerce_theme_contract.json"
CONTRACT: Dict[str, Any] = json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))

LEGACY_MODEL_ID = "legacy-v1"
LEGACY_MODEL_NAME = "Stockman Basic"
THEME_SCHEMA_VERSION = CONTRACT["schema_version"]

KNOWN_PLANS = ("starter", "pro", "enterprise")
SURFACES = ("mobile", "web")
DOCUMENT_KEYS = {"schema_version", "model_id", "model_version", "global_settings", "pages"}
PAGE_KEYS = {"id", "kind", "path", "title", "menu", "sections"}
SECTION_KEYS = {"id", "type", "type_version", "settings", "blocks"}
BLOCK_KEYS = {"id", "type", "type_version", "settings"}
PAGE_TITLE_MAX_LENGTH = 120

_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_MEDIA_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_PATH_SEGMENT_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def legacy_theme_identity() -> dict:
    return {
        "model_id": LEGACY_MODEL_ID,
        "model_name": LEGACY_MODEL_NAME,
        "theme_schema_version": THEME_SCHEMA_VERSION,
    }


class ThemeValidationError(ValueError):
    """Document refusé : ``code`` est stable pour les clients, ``path`` désigne l'élément fautif."""

    def __init__(self, code: str, path: str, message: str):
        super().__init__(f"{path}: {message}")
        self.code = code
        self.path = path
        self.message = message

    def as_dict(self) -> Dict[str, str]:
        return {"code": self.code, "path": self.path, "message": self.message}


# --- Registre ---------------------------------------------------------------

def list_models(contract: Mapping[str, Any] = CONTRACT) -> List[Dict[str, Any]]:
    return [{"id": model_id, **copy.deepcopy(model)} for model_id, model in contract["models"].items()]


def get_model(model_id: Optional[str], contract: Mapping[str, Any] = CONTRACT) -> Optional[Dict[str, Any]]:
    model = contract["models"].get(model_id or "")
    return {"id": model_id, **copy.deepcopy(model)} if model else None


def resolve_model(model_id: Optional[str], contract: Mapping[str, Any] = CONTRACT) -> Dict[str, Any]:
    """Modèle à utiliser pour le rendu : un identifiant absent ou inconnu revient à Stockman Basic."""
    return get_model(model_id, contract) or get_model(LEGACY_MODEL_ID, contract)


def normalize_catalog_overrides(raw: Any, contract: Mapping[str, Any] = CONTRACT) -> Dict[str, List[str]]:
    """Droits par abonnement configurés côté serveur (document ``ecommerce_theme_settings``).

    Seuls les modèles connus et les abonnements connus sont retenus ; une configuration
    invalide est ignorée plutôt que d'ouvrir des droits."""
    if not isinstance(raw, Mapping):
        return {}
    result: Dict[str, List[str]] = {}
    for model_id, plans in raw.items():
        if model_id not in contract["models"] or not isinstance(plans, (list, tuple)):
            continue
        result[model_id] = sorted({normalize_plan(plan) for plan in plans if isinstance(plan, str)} & set(KNOWN_PLANS))
    return result


async def load_catalog_overrides(db, contract: Mapping[str, Any] = CONTRACT) -> Dict[str, List[str]]:
    doc = await db.ecommerce_theme_settings.find_one({"_id": "catalog"})
    return normalize_catalog_overrides((doc or {}).get("model_plans"), contract)


def is_model_available(
    model_id: str,
    plan: Optional[str],
    overrides: Optional[Mapping[str, Iterable[str]]] = None,
    contract: Mapping[str, Any] = CONTRACT,
) -> bool:
    model = contract["models"].get(model_id)
    if not model:
        return False
    if model.get("always_available"):
        # Stockman Basic reste utilisable par tous les sites existants, quel que soit l'abonnement.
        return True
    allowed = (overrides or {}).get(model_id, model.get("default_plans", []))
    return normalize_plan(plan) in set(allowed)


def available_models(
    plan: Optional[str],
    overrides: Optional[Mapping[str, Iterable[str]]] = None,
    contract: Mapping[str, Any] = CONTRACT,
) -> List[Dict[str, Any]]:
    return [model for model in list_models(contract) if is_model_available(model["id"], plan, overrides, contract)]


# --- Capacités --------------------------------------------------------------

def compute_theme_capabilities(
    *,
    plan: Optional[str],
    is_org_admin: bool,
    is_demo: bool,
    can_write_data: bool,
    surface: str,
    role: Optional[str] = None,
) -> Dict[str, bool]:
    """Capacités d'édition du site pour un canal donné.

    ``surface`` est déterminée par le serveur. Starter et Pro éditent depuis le mobile et
    consultent le web ; Enterprise édite aussi depuis le web, avec l'édition structurelle.
    Chaque mutation future doit recalculer ces capacités : la réponse ne sert qu'à l'UI."""
    if surface not in SURFACES:
        raise ValueError(f"Unknown surface: {surface}")
    normalized_plan = normalize_plan(plan)
    enterprise = normalized_plan == "enterprise" or role in ("admin", "superadmin")
    can_write = bool(is_org_admin and not is_demo and can_write_data)
    channel_write = can_write and (surface == "mobile" or enterprise)
    return {
        "view": bool(is_org_admin),
        "guided_edit": channel_write,
        "change_model": channel_write,
        "publish": channel_write,
        "structure_edit": can_write and enterprise and surface == "web",
        "custom_pages": can_write and enterprise and surface == "web",
        "manage_history": can_write and enterprise,
    }


# --- Validation -------------------------------------------------------------

def _fail(code: str, path: str, message: str) -> None:
    raise ThemeValidationError(code, path, message)


def _check_keys(value: Mapping[str, Any], allowed: Iterable[str], path: str, required: Iterable[str] = ()) -> None:
    allowed_set = set(allowed)
    for key in value:
        if key not in allowed_set:
            _fail("unknown_property", f"{path}.{key}", "Propriété non autorisée")
    for key in required:
        if key not in value:
            _fail("missing_property", f"{path}.{key}", "Propriété obligatoire manquante")


def _check_id(value: Any, path: str, limits: Mapping[str, Any]) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", value) or len(value) > limits["max_id_length"]:
        _fail("invalid_id", path, "Identifiant invalide")
    return value


def _check_field(spec: Mapping[str, Any], value: Any, path: str) -> None:
    if value is None:
        if not spec.get("nullable"):
            _fail("invalid_value", path, "Valeur obligatoire")
        return
    kind = spec["type"]
    if kind == "text":
        if not isinstance(value, str):
            _fail("invalid_type", path, "Texte attendu")
        if len(value) > spec["max_length"]:
            _fail("text_too_long", path, f"Texte limité à {spec['max_length']} caractères")
        if _CONTROL_RE.search(value) or (not spec.get("multiline") and ("\n" in value or "\r" in value)):
            _fail("invalid_characters", path, "Caractères non autorisés")
    elif kind == "color":
        if not isinstance(value, str) or not _COLOR_RE.match(value):
            _fail("invalid_color", path, "Couleur attendue au format #RRGGBB")
    elif kind == "media_id":
        if not isinstance(value, str) or not _MEDIA_ID_RE.match(value):
            _fail("invalid_media", path, "Référence de média invalide")
    elif kind == "boolean":
        if not isinstance(value, bool):
            _fail("invalid_type", path, "Booléen attendu")
    elif kind == "enum":
        if value not in spec["values"]:
            _fail("invalid_value", path, "Valeur non autorisée")
    elif kind == "integer":
        if not isinstance(value, int) or isinstance(value, bool) or not spec.get("min", value) <= value <= spec.get("max", value):
            _fail("invalid_value", path, "Entier hors limites")
    else:
        _fail("unknown_field_type", path, f"Type de champ inconnu : {kind}")


def _check_settings(specs: Mapping[str, Any], settings: Any, path: str) -> None:
    if not isinstance(settings, dict):
        _fail("invalid_type", path, "Objet attendu")
    _check_keys(settings, specs.keys(), path, [key for key, spec in specs.items() if spec.get("required")])
    for key, value in settings.items():
        _check_field(specs[key], value, f"{path}.{key}")


def _check_page_path(page: Mapping[str, Any], path: str, limits: Mapping[str, Any], reserved: set) -> Optional[str]:
    value = page.get("path")
    if page["kind"] != "custom":
        if value is not None:
            _fail("unexpected_path", f"{path}.path", "Seules les pages personnalisées ont un chemin")
        return None
    if not isinstance(value, str) or not value or len(value) > limits["max_path_length"]:
        _fail("invalid_path", f"{path}.path", "Chemin de page invalide")
    segments = value.split("/")
    if not all(_PATH_SEGMENT_RE.match(segment) for segment in segments):
        _fail("invalid_path", f"{path}.path", "Chemin de page invalide")
    if segments[0] in reserved:
        _fail("reserved_path", f"{path}.path", "Ce chemin est réservé par Stockman")
    return value


def validate_theme_document(document: Any, contract: Mapping[str, Any] = CONTRACT) -> Dict[str, Any]:
    """Valide un document de thème complet et en retourne une copie.

    Aucun type, réglage ou chemin n'est accepté sur la seule base de sa forme : tout doit
    appartenir au registre. Les valeurs ne sont jamais corrigées silencieusement."""
    limits = contract["limits"]
    if not isinstance(document, dict):
        _fail("invalid_type", "$", "Objet attendu")
    size = len(json.dumps(document, ensure_ascii=False, separators=(",", ":"), default=str).encode("utf-8"))
    if size > limits["max_document_bytes"]:
        _fail("document_too_large", "$", "Document trop volumineux")
    _check_keys(document, DOCUMENT_KEYS, "$", DOCUMENT_KEYS)

    if document["schema_version"] != contract["schema_version"] or isinstance(document["schema_version"], bool):
        _fail("unsupported_schema", "$.schema_version", "Version de schéma non prise en charge")
    model = contract["models"].get(document["model_id"]) if isinstance(document["model_id"], str) else None
    if not model:
        _fail("unknown_model", "$.model_id", "Modèle inconnu")
    if document["model_version"] != model["version"]:
        _fail("unsupported_model_version", "$.model_version", "Version du modèle non prise en charge")

    _check_settings(contract["global_settings"], document["global_settings"], "$.global_settings")

    pages = document["pages"]
    if not isinstance(pages, list) or not pages:
        _fail("invalid_pages", "$.pages", "Au moins une page est requise")
    if len(pages) > limits["max_pages"]:
        _fail("too_many_pages", "$.pages", "Trop de pages")

    template_pages = {page["kind"]: page for page in model["pages"]}
    allowed_sections = {section["type"] for page in model["pages"] for section in page["sections"]}
    if model.get("structure_editable"):
        allowed_sections = set(contract["sections"])
    allowed_kinds = (set(contract["page_kinds"]) - {"custom"}) if model.get("structure_editable") else set(template_pages)
    if model.get("custom_pages"):
        allowed_kinds.add("custom")
    reserved = set(contract["reserved_paths"])
    seen_ids, seen_paths, seen_kinds = set(), set(), set()
    header_pages = 0

    for page_index, page in enumerate(pages):
        page_path = f"$.pages[{page_index}]"
        if not isinstance(page, dict):
            _fail("invalid_type", page_path, "Objet attendu")
        _check_keys(page, PAGE_KEYS, page_path, ("id", "kind", "sections"))
        page_id = _check_id(page["id"], f"{page_path}.id", limits)
        if page_id in seen_ids:
            _fail("duplicate_id", f"{page_path}.id", "Identifiant déjà utilisé")
        seen_ids.add(page_id)
        if page["kind"] not in contract["page_kinds"] or page["kind"] not in allowed_kinds:
            _fail("page_kind_not_allowed", f"{page_path}.kind", "Type de page non autorisé pour ce modèle")
        if page["kind"] != "custom":
            if page["kind"] in seen_kinds:
                _fail("duplicate_page_kind", f"{page_path}.kind", "Cette page existe déjà")
            seen_kinds.add(page["kind"])
        custom_path = _check_page_path(page, page_path, limits, reserved)
        if custom_path:
            if custom_path in seen_paths:
                _fail("duplicate_path", f"{page_path}.path", "Chemin déjà utilisé")
            seen_paths.add(custom_path)
        if "title" in page and page["title"] is not None:
            _check_field({"type": "text", "max_length": PAGE_TITLE_MAX_LENGTH}, page["title"], f"{page_path}.title")
        if page["kind"] == "custom":
            # Le titre d'une page personnalisée sert de lien dans la navigation : il est obligatoire.
            if not isinstance(page.get("title"), str) or not page["title"].strip():
                _fail("missing_title", f"{page_path}.title", "Donnez un titre à la page")
            menu = page.get("menu", "footer")
            if menu not in contract["page_menus"]:
                _fail("invalid_value", f"{page_path}.menu", "Emplacement de navigation non autorisé")
            header_pages += menu == "header"
        elif "menu" in page:
            _fail("unexpected_menu", f"{page_path}.menu", "Seules les pages personnalisées ont un emplacement de navigation")

        sections = page["sections"]
        if not isinstance(sections, list) or len(sections) > limits["max_sections_per_page"]:
            _fail("invalid_sections", f"{page_path}.sections", "Liste de sections invalide")
        for section_index, section in enumerate(sections):
            section_path = f"{page_path}.sections[{section_index}]"
            if not isinstance(section, dict):
                _fail("invalid_type", section_path, "Objet attendu")
            _check_keys(section, SECTION_KEYS, section_path, SECTION_KEYS)
            section_id = _check_id(section["id"], f"{section_path}.id", limits)
            if section_id in seen_ids:
                _fail("duplicate_id", f"{section_path}.id", "Identifiant déjà utilisé")
            seen_ids.add(section_id)
            spec = contract["sections"].get(section["type"]) if isinstance(section["type"], str) else None
            if not spec or section["type"] not in allowed_sections:
                _fail("section_not_allowed", f"{section_path}.type", "Section non autorisée pour ce modèle")
            if section["type_version"] != spec["type_version"] or isinstance(section["type_version"], bool):
                _fail("unsupported_section_version", f"{section_path}.type_version", "Version de section non prise en charge")
            _check_settings(spec["settings"], section["settings"], f"{section_path}.settings")

            blocks = section["blocks"]
            if not isinstance(blocks, list) or len(blocks) > limits["max_blocks_per_section"]:
                _fail("invalid_blocks", f"{section_path}.blocks", "Liste de blocs invalide")
            for block_index, block in enumerate(blocks):
                block_path = f"{section_path}.blocks[{block_index}]"
                if not isinstance(block, dict):
                    _fail("invalid_type", block_path, "Objet attendu")
                _check_keys(block, BLOCK_KEYS, block_path, BLOCK_KEYS)
                block_id = _check_id(block["id"], f"{block_path}.id", limits)
                if block_id in seen_ids:
                    _fail("duplicate_id", f"{block_path}.id", "Identifiant déjà utilisé")
                seen_ids.add(block_id)
                block_spec = spec["blocks"].get(block["type"]) if isinstance(block["type"], str) else None
                if not block_spec:
                    _fail("block_not_allowed", f"{block_path}.type", "Bloc non autorisé dans cette section")
                if block["type_version"] != block_spec["type_version"] or isinstance(block["type_version"], bool):
                    _fail("unsupported_block_version", f"{block_path}.type_version", "Version de bloc non prise en charge")
                _check_settings(block_spec["settings"], block["settings"], f"{block_path}.settings")

    # Borne technique de mise en page (en-tête lisible), identique pour tous les abonnements.
    if header_pages > limits["max_header_pages"]:
        _fail("too_many_header_pages", "$.pages", f"Le menu principal accueille au plus {limits['max_header_pages']} pages personnalisées")
    if not model.get("structure_editable") and _structure(pages) != _template_structure(model):
        _fail("structure_locked", "$.pages", "La structure de ce modèle n'est pas modifiable")
    for kind, template in template_pages.items():
        page = next((item for item in pages if item.get("kind") == kind), None)
        if page is None:
            _fail("missing_page", "$.pages", f"Page obligatoire manquante : {kind}")
        present = [section["type"] for section in page["sections"]]
        for required in template["sections"]:
            # Une structure modifiable ne protège que les sections indispensables au parcours commercial.
            if model.get("structure_editable") and not required.get("required"):
                continue
            if required["type"] not in present:
                _fail("missing_section", "$.pages", f"Section indispensable manquante : {required['type']}")
    return copy.deepcopy(document)


def _structure(pages: List[Dict[str, Any]]) -> list:
    return [
        (page.get("id"), page.get("kind"), page.get("path"), [
            (section.get("id"), section.get("type"), [(block.get("id"), block.get("type")) for block in section.get("blocks", [])])
            for section in page.get("sections", [])
        ])
        for page in pages
    ]


def _template_structure(model: Mapping[str, Any]) -> list:
    return [
        (page["id"], page["kind"], page.get("path"), [(section["id"], section["type"], []) for section in page["sections"]])
        for page in model["pages"]
    ]


def _custom_pages_outline(pages: Iterable[Mapping[str, Any]]) -> list:
    """Pages personnalisées : adresse, titre, navigation et structure, sans les contenus des sections."""
    custom = [page for page in pages if page.get("kind") == "custom"]
    return [
        (page.get("id"), page.get("path"), page.get("title"), page.get("menu"), _structure([page])[0][3])
        for page in custom
    ]


# --- Contrôle des modifications --------------------------------------------

_ABSENT = object()


def _changed_keys(before: Mapping[str, Any], after: Mapping[str, Any]) -> set:
    # Une clé absente et une clé à None sont distinctes : effacer explicitement est une modification.
    return {key for key in set(before) | set(after) if before.get(key, _ABSENT) != after.get(key, _ABSENT)}


def assert_guided_changes_only(base: Mapping[str, Any], candidate: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT) -> None:
    """Refuse toute différence hors des points d'édition guidée du modèle.

    La comparaison porte sur la dernière révision publiée de référence : un brouillon
    structurel ne peut pas être publié par un canal limité à l'édition guidée."""
    if base["model_id"] != candidate["model_id"] or base["model_version"] != candidate["model_version"]:
        _fail("model_change_requires_dedicated_operation", "$.model_id", "Le changement de modèle est une opération dédiée")
    model = contract["models"][candidate["model_id"]]
    guided = model.get("guided_settings", {})
    if _structure(base["pages"]) != _structure(candidate["pages"]):
        _fail("guided_change_forbidden", "$.pages", "La structure du site ne peut pas être modifiée depuis ce canal")
    for key in _changed_keys(base["global_settings"], candidate["global_settings"]):
        if key not in guided.get("global", []):
            _fail("guided_change_forbidden", f"$.global_settings.{key}", "Réglage non modifiable depuis ce canal")
    for page_index, (before_page, after_page) in enumerate(zip(base["pages"], candidate["pages"])):
        page_path = f"$.pages[{page_index}]"
        if before_page.get("title") != after_page.get("title"):
            _fail("guided_change_forbidden", f"{page_path}.title", "Titre de page non modifiable depuis ce canal")
        if before_page.get("menu") != after_page.get("menu"):
            _fail("guided_change_forbidden", f"{page_path}.menu", "Navigation de la page non modifiable depuis ce canal")
        for section_index, (before_section, after_section) in enumerate(zip(before_page["sections"], after_page["sections"])):
            section_path = f"{page_path}.sections[{section_index}]"
            if before_section["type_version"] != after_section["type_version"]:
                _fail("guided_change_forbidden", f"{section_path}.type_version", "Version de section non modifiable")
            allowed = guided.get("sections", {}).get(after_section["type"], [])
            for key in _changed_keys(before_section["settings"], after_section["settings"]):
                if key not in allowed:
                    _fail("guided_change_forbidden", f"{section_path}.settings.{key}", "Réglage non modifiable depuis ce canal")
            for block_index, (before_block, after_block) in enumerate(zip(before_section["blocks"], after_section["blocks"])):
                block_allowed = guided.get("blocks", {}).get(after_block["type"], [])
                for key in _changed_keys(before_block["settings"], after_block["settings"]):
                    if key not in block_allowed:
                        _fail("guided_change_forbidden", f"{section_path}.blocks[{block_index}].settings.{key}", "Réglage non modifiable depuis ce canal")


def authorize_theme_change(
    capabilities: Mapping[str, bool],
    base: Optional[Mapping[str, Any]],
    candidate: Any,
    contract: Mapping[str, Any] = CONTRACT,
) -> Dict[str, Any]:
    """Point de contrôle unique pour une future mutation : capacités recalculées côté serveur,
    validation complète, puis restriction aux points guidés si l'édition structurelle est absente."""
    if not capabilities.get("guided_edit") and not capabilities.get("structure_edit"):
        _fail("forbidden", "$", "Modification du site non autorisée depuis ce canal")
    document = validate_theme_document(candidate, contract)
    if base is None:
        if not capabilities.get("structure_edit") and _structure(document["pages"]) != _template_structure(contract["models"][document["model_id"]]):
            _fail("guided_change_forbidden", "$.pages", "La structure initiale doit suivre le modèle")
    else:
        if base["model_id"] != document["model_id"]:
            _fail("model_change_requires_dedicated_operation", "$.model_id", "Le changement de modèle est une opération dédiée")
        if not capabilities.get("structure_edit"):
            assert_guided_changes_only(base, document, contract)
    # Créer, déplacer, renommer ou supprimer une page personnalisée demande sa propre capacité ;
    # les textes de ses sections restent modifiables par l'édition guidée.
    if not capabilities.get("custom_pages") and _custom_pages_outline(document["pages"]) != _custom_pages_outline(base["pages"] if base is not None else []):
        _fail("custom_pages_forbidden", "$.pages", "Les pages personnalisées se gèrent depuis l'éditeur visuel web Enterprise")
    return document


# --- Projection du site actuel ---------------------------------------------

# Correspondance entre le document ``legacy-v1`` et les champs historiques du compte.
LEGACY_GLOBAL_FIELDS = {"brand_color": "ecommerce_brand_color"}
LEGACY_SECTION_FIELDS = {
    "site_name": "ecommerce_site_name",
    "hero_title": "ecommerce_hero_title",
    "welcome_message": "ecommerce_welcome_message",
}
LEGACY_ACCOUNT_FIELDS = tuple(LEGACY_GLOBAL_FIELDS.values()) + tuple(LEGACY_SECTION_FIELDS.values())
LEGACY_LOGO_FIELD = "ecommerce_logo_url"


def build_legacy_theme_document(account_doc: Mapping[str, Any]) -> Dict[str, Any]:
    """Projection en lecture seule des champs de présentation historiques vers ``legacy-v1``.

    Un champ absent reste absent et une chaîne vide reste vide. Le logo historique, les
    coordonnées, la livraison, le paiement, le domaine et l'activation restent des réglages
    du site, distincts du document visuel. Le document retourné doit être validé : une valeur
    historique incompatible est signalée par le validateur, jamais corrigée en silence."""
    model = CONTRACT["models"][LEGACY_MODEL_ID]
    template_page = model["pages"][0]
    template_section = template_page["sections"][0]
    settings = {key: account_doc[field] for key, field in LEGACY_SECTION_FIELDS.items() if field in account_doc}
    # Seul un logo de la bibliothèque Stockman est représenté ; une adresse externe historique reste
    # affichée par le site, sans être reprise ni effacée par le document.
    global_settings: Dict[str, Any] = {"logo_asset_id": parse_media_url(account_doc.get(LEGACY_LOGO_FIELD))}
    for key, field in LEGACY_GLOBAL_FIELDS.items():
        if field in account_doc:
            global_settings[key] = account_doc[field]
    return {
        "schema_version": THEME_SCHEMA_VERSION,
        "model_id": LEGACY_MODEL_ID,
        "model_version": model["version"],
        "global_settings": global_settings,
        "pages": [{
            "id": template_page["id"],
            "kind": template_page["kind"],
            "sections": [{
                "id": template_section["id"],
                "type": template_section["type"],
                "type_version": CONTRACT["sections"][template_section["type"]]["type_version"],
                "settings": settings,
                "blocks": [],
            }],
        }],
    }


def legacy_account_values(document: Mapping[str, Any]) -> Dict[str, Any]:
    """Inverse de ``build_legacy_theme_document`` pour un document ``legacy-v1`` déjà validé.

    Une clé absente du document est absente du résultat : le champ historique correspondant
    doit alors être retiré, afin que la projection relue reproduise exactement le document."""
    if document.get("model_id") != LEGACY_MODEL_ID:
        raise ValueError("Only legacy-v1 documents map to historical fields")
    section = next(
        item for page in document["pages"] for item in page["sections"] if item["type"] == "legacy-storefront"
    )
    values = {field: document["global_settings"][key] for key, field in LEGACY_GLOBAL_FIELDS.items() if key in document["global_settings"]}
    values.update({field: section["settings"][key] for key, field in LEGACY_SECTION_FIELDS.items() if key in section["settings"]})
    return values


def iter_media_values(document: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT):
    """Parcourt les réglages de type média d'un document validé : (chemin, valeur, spécification)."""
    for key, spec in contract["global_settings"].items():
        if spec["type"] == "media_id" and key in document.get("global_settings", {}):
            yield f"$.global_settings.{key}", document["global_settings"][key], spec
    for page_index, page in enumerate(document.get("pages", [])):
        for section_index, section in enumerate(page.get("sections", [])):
            section_spec = contract["sections"].get(section.get("type"), {})
            section_path = f"$.pages[{page_index}].sections[{section_index}]"
            for key, spec in section_spec.get("settings", {}).items():
                if spec["type"] == "media_id" and key in section.get("settings", {}):
                    yield f"{section_path}.settings.{key}", section["settings"][key], spec
            for block_index, block in enumerate(section.get("blocks", [])):
                block_spec = section_spec.get("blocks", {}).get(block.get("type"), {})
                for key, spec in block_spec.get("settings", {}).items():
                    if spec["type"] == "media_id" and key in block.get("settings", {}):
                        yield f"{section_path}.blocks[{block_index}].settings.{key}", block["settings"][key], spec


# --- Changement de modèle ---------------------------------------------------

def _fits(spec: Mapping[str, Any], value: Any) -> bool:
    try:
        _check_field(spec, value, "$")
    except ThemeValidationError:
        return False
    return True


def _put(target: Dict[str, Any], specs: Mapping[str, Any], key: str, value: Any) -> None:
    # Une valeur reprise qui ne respecte pas le nouveau champ est laissée de côté, jamais tronquée.
    if value not in (None, "") and key in specs and _fits(specs[key], value):
        target[key] = value


def _home_section(document: Mapping[str, Any], section_type: str) -> Optional[Mapping[str, Any]]:
    for page in document.get("pages", []):
        if page.get("kind") != "home":
            continue
        for section in page.get("sections", []):
            if section.get("type") == section_type:
                return section
    return None


def theme_identity(document: Mapping[str, Any], account_doc: Mapping[str, Any]) -> Dict[str, Any]:
    """Valeurs réelles du commerçant reprises lors d'un changement de modèle : aucun contenu inventé."""
    identity: Dict[str, Any] = {}
    global_settings = document.get("global_settings", {})
    for key in ("site_name", "brand_color", "logo_asset_id"):
        if global_settings.get(key):
            identity[key] = global_settings[key]
    legacy = _home_section(document, "legacy-storefront")
    if legacy:
        settings = legacy.get("settings", {})
        for key in ("site_name", "hero_title", "welcome_message"):
            if settings.get(key):
                identity.setdefault(key, settings[key])
    hero = _home_section(document, "hero")
    if hero:
        settings = hero.get("settings", {})
        if settings.get("heading"):
            identity.setdefault("hero_title", settings["heading"])
        if settings.get("subheading"):
            identity.setdefault("welcome_message", settings["subheading"])
    for key, field in (
        ("delivery_info", "ecommerce_delivery_info"),
        ("payment_instructions", "ecommerce_payment_instructions"),
        ("whatsapp_phone", "ecommerce_whatsapp_phone"),
        ("contact_phone", "ecommerce_contact_phone"),
    ):
        if isinstance(account_doc.get(field), str) and account_doc[field].strip():
            identity[key] = account_doc[field].strip()
    return identity


def _identity_features(identity: Mapping[str, Any], section_spec: Mapping[str, Any]) -> List[Dict[str, Any]]:
    block_spec = section_spec["blocks"]["feature"]
    phone = identity.get("whatsapp_phone") or identity.get("contact_phone")
    candidates = [
        ("feature-delivery", "truck", "Livraison", identity.get("delivery_info")),
        ("feature-payment", "card", "Paiement", identity.get("payment_instructions")),
        ("feature-contact", "chat", "Une question ?", f"Joignez-nous au {phone}." if phone else None),
    ]
    blocks = []
    for block_id, icon, title, text in candidates:
        # Seules les informations réellement renseignées par le commerçant deviennent des points forts.
        if text and _fits(block_spec["settings"]["text"], text):
            blocks.append({"id": block_id, "type": "feature", "type_version": block_spec["type_version"], "settings": {"icon": icon, "title": title, "text": text}})
    return blocks


def instantiate_model(model_id: str, identity: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT) -> Dict[str, Any]:
    """Document initial d'un modèle : structure approuvée par Stockman, contenus du commerçant."""
    model = contract["models"].get(model_id)
    if not model:
        _fail("unknown_model", "$.model_id", "Modèle inconnu")
    if model_id == LEGACY_MODEL_ID:
        legacy_fields = {
            field: identity[key]
            for key, field in (("site_name", "ecommerce_site_name"), ("hero_title", "ecommerce_hero_title"), ("welcome_message", "ecommerce_welcome_message"), ("brand_color", "ecommerce_brand_color"))
            if identity.get(key) and _fits(
                contract["global_settings"]["brand_color"] if key == "brand_color" else contract["sections"]["legacy-storefront"]["settings"][key],
                identity[key],
            )
        }
        document = build_legacy_theme_document(legacy_fields)
        document["global_settings"]["logo_asset_id"] = identity.get("logo_asset_id")
        return validate_theme_document(document, contract)

    global_settings: Dict[str, Any] = copy.deepcopy(model.get("global_defaults", {}))
    for key in ("site_name", "brand_color", "logo_asset_id"):
        _put(global_settings, contract["global_settings"], key, identity.get(key))
    pages = []
    for page in model["pages"]:
        sections = []
        for template in page["sections"]:
            spec = contract["sections"][template["type"]]
            settings = copy.deepcopy(template.get("settings", {}))
            # Blocs prévus par le modèle, vides : la section reste masquée tant que le commerçant ne les remplit pas.
            blocks: List[Dict[str, Any]] = [
                {"id": block["id"], "type": block["type"], "type_version": spec["blocks"][block["type"]]["type_version"], "settings": copy.deepcopy(block.get("settings", {}))}
                for block in template.get("blocks", [])
            ]
            if template["type"] == "hero":
                _put(settings, spec["settings"], "heading", identity.get("hero_title") or identity.get("site_name"))
                _put(settings, spec["settings"], "subheading", identity.get("welcome_message"))
            elif template["type"] == "features":
                blocks = _identity_features(identity, spec)
            elif template["type"] == "featured-collection":
                _put(settings, spec["settings"], "category", identity.get("top_category"))
            sections.append({"id": template["id"], "type": template["type"], "type_version": spec["type_version"], "settings": settings, "blocks": blocks})
        pages.append({"id": page["id"], "kind": page["kind"], "sections": sections})
    document = {
        "schema_version": contract["schema_version"],
        "model_id": model_id,
        "model_version": model["version"],
        "global_settings": global_settings,
        "pages": pages,
    }
    return validate_theme_document(document, contract)


def _free_id(value: str, taken: set, limit: int) -> str:
    candidate, index = value, 2
    while candidate in taken:
        suffix = f"-{index}"
        candidate = f"{value[:limit - len(suffix)]}{suffix}"
        index += 1
    taken.add(candidate)
    return candidate


def carry_custom_pages(document: Mapping[str, Any], source: Optional[Mapping[str, Any]], contract: Mapping[str, Any] = CONTRACT) -> Dict[str, Any]:
    """Reprend les pages personnalisées du site dans un nouveau modèle qui les accepte.

    Leurs sections viennent du registre commun : elles restent identiques. Un identifiant déjà
    pris par le nouveau modèle est renommé. Si le résultat n'est pas valide, le modèle est
    proposé sans elles : elles restent disponibles dans l'historique des versions."""
    result = copy.deepcopy(dict(document))
    model = contract["models"].get(result.get("model_id"), {})
    pages = [page for page in (source or {}).get("pages", []) if isinstance(page, Mapping) and page.get("kind") == "custom"]
    if not pages or not model.get("custom_pages"):
        return result
    limit = contract["limits"]["max_id_length"]
    taken = {
        item["id"]
        for page in result["pages"]
        for item in [page, *page["sections"], *(block for section in page["sections"] for block in section["blocks"])]
    }
    try:
        for source_page in pages:
            page = copy.deepcopy(dict(source_page))
            page["id"] = _free_id(str(page.get("id", "page")), taken, limit)
            for section in page.get("sections", []):
                section["id"] = _free_id(str(section.get("id", "section")), taken, limit)
                for block in section.get("blocks", []):
                    block["id"] = _free_id(str(block.get("id", "bloc")), taken, limit)
            result["pages"].append(page)
        return validate_theme_document(result, contract)
    except (ThemeValidationError, TypeError, AttributeError, KeyError) as exc:
        logger.warning("Custom pages not carried to model %s: %s", result.get("model_id"), getattr(exc, "code", type(exc).__name__))
        return copy.deepcopy(dict(document))


def compatible_legacy_values(document: Mapping[str, Any]) -> Dict[str, Any]:
    """Champs historiques qu'un document d'un autre modèle renseigne (métadonnées, notifications,
    retour éventuel à Stockman Basic). Une valeur absente du document retire le champ."""
    global_settings = document.get("global_settings", {})
    values: Dict[str, Any] = {}
    if global_settings.get("site_name") is not None:
        values["ecommerce_site_name"] = global_settings["site_name"]
    if global_settings.get("brand_color") is not None:
        values["ecommerce_brand_color"] = global_settings["brand_color"]
    hero = _home_section(document, "hero")
    if hero:
        if hero["settings"].get("heading") is not None:
            values["ecommerce_hero_title"] = hero["settings"]["heading"]
        if hero["settings"].get("subheading") is not None:
            values["ecommerce_welcome_message"] = hero["settings"]["subheading"]
    return values

