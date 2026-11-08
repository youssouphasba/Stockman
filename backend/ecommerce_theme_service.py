"""Apparence des sites e-commerce : modèles, brouillon, publication, historique et aperçu privé.

- Les capacités sont calculées par le serveur à chaque requête et vérifiées ici avant
  toute écriture ; aucun droit fourni par le client n'est lu.
- Stockman Basic (``legacy-v1``) garde ses champs historiques comme source du rendu public.
  Pour les modèles du moteur de sections, la révision publiée fait autorité ; les champs
  historiques compatibles (nom, couleur, logo, titres) en restent le reflet pour les
  métadonnées, les notifications et un éventuel retour à Basic. Chaque publication est
  conditionnée aux valeurs en ligne que le commerçant a vues : pas de double autorité.
- Changer de modèle est une opération dédiée : la structure approuvée est instanciée avec les
  seules données réelles du commerçant, l'ancienne version reste dans l'historique.
- L'aperçu privé repose sur un jeton aléatoire dont seule l'empreinte est conservée. Il
  expire, peut afficher un site désactivé et n'autorise aucune opération commerciale.
- Toute référence de média doit appartenir au compte et au site, et correspondre au type
  attendu par le champ ; une image utilisée par le site publié ou le brouillon ne peut pas être
  supprimée.
- Rien ici ne modifie l'activation du site, son domaine, ses produits, ses prix, ses
  stocks, ses commandes ou ses paiements.
"""

import copy
import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Tuple

from ecommerce_media import MAX_MEDIA_PER_SITE as MEDIA_LIMIT, MEDIA_KINDS, EcommerceMediaLibrary, MediaServiceError, parse_media_url
from ecommerce_onboarding import EcommerceOnboarding
from ecommerce_theme_store import ThemeConflictError, ThemeRevisionNotFound, ThemeRevisionStore, document_fingerprint
from ecommerce_themes import (
    CONTRACT,
    LEGACY_ACCOUNT_FIELDS,
    LEGACY_LOGO_FIELD,
    LEGACY_MODEL_ID,
    ThemeValidationError,
    authorize_theme_change,
    build_legacy_theme_document,
    carry_custom_pages,
    compatible_legacy_values,
    instantiate_model,
    is_model_available,
    iter_media_values,
    legacy_account_values,
    load_catalog_overrides,
    resolve_model,
    theme_identity,
    validate_theme_document,
)

logger = logging.getLogger(__name__)

PREVIEW_TTL = timedelta(minutes=30)
HISTORY_LIMIT = 50
PREVIEW_SOURCES = ("draft", "published", "model")
# Catégories proposées dans les réglages : longueur alignée sur le champ « Catégorie » du registre.
MAX_CATEGORIES = 100
MAX_CATEGORY_LENGTH = 120
EDITABLE_FIELD_TYPES = ("text", "color", "media_id", "enum", "boolean", "integer")
_PUBLIC_SPEC_KEYS = ("type", "label", "hint", "max_length", "multiline", "nullable", "media_kind", "min", "max", "source")
# Largeur minimale du logo publié : net jusqu'à trois fois la taille affichée.
LOGO_DISPLAY_WIDTH = 192
PUBLISHED_FIELDS = LEGACY_ACCOUNT_FIELDS + (LEGACY_LOGO_FIELD,)
PUBLISHED_THEME_FIELD = "ecommerce_theme_published"
_POINTER_PATH = f"{PUBLISHED_THEME_FIELD}.revision_id"
PAGE_LABELS = {"home": "Accueil", "catalog": "Catalogue", "contact": "Contact"}
# Correspondance des anciens réglages du site vers un modèle du moteur de sections.
LEGACY_SETTINGS_TO_THEME = {
    "ecommerce_site_name": ("global", "site_name"),
    "ecommerce_brand_color": ("global", "brand_color"),
    "ecommerce_hero_title": ("hero", "heading"),
    "ecommerce_welcome_message": ("hero", "subheading"),
}
_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{32,128}$")

FORBIDDEN_MESSAGES = {
    "view": "Accès à l'apparence du site non autorisé.",
    "edit": "Vous ne pouvez pas modifier l'apparence du site depuis ce canal.",
    "publish": "Vous ne pouvez pas publier l'apparence du site depuis ce canal.",
    "change_model": "Vous ne pouvez pas changer de modèle depuis ce canal.",
    "manage_history": "L'historique des versions est réservé à Enterprise.",
    "preview": "L'aperçu privé n'est pas disponible depuis ce canal.",
}
CONFLICT_MESSAGE = "L'apparence du site a été modifiée entre-temps. Rechargez-la avant de continuer."
PUBLISHED_CHANGED_MESSAGE = "Le site publié a été modifié entre-temps. Vérifiez les différences avant de publier."
PREVIEW_UNAVAILABLE_MESSAGE = "Cet aperçu a expiré ou n'existe pas. Créez-en un nouveau depuis Stockman."


class ThemeServiceError(Exception):
    """Refus métier stable pour les clients : statut HTTP, code et message en français."""

    def __init__(self, status: int, code: str, message: str, **extra: Any):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.extra = extra

    def as_dict(self) -> Dict[str, Any]:
        return {"code": self.code, "message": self.message, **self.extra}


def theme_error_response(exc: Exception) -> Optional[Tuple[int, Dict[str, Any]]]:
    """Traduit une erreur du moteur de thèmes en réponse HTTP, ou None si elle est inconnue."""
    if isinstance(exc, (ThemeServiceError, MediaServiceError)):
        return exc.status, exc.as_dict()
    if isinstance(exc, ThemeConflictError):
        return 409, {"code": "conflict", "message": CONFLICT_MESSAGE, "lock_version": exc.current_lock_version}
    if isinstance(exc, ThemeRevisionNotFound):
        return 404, {"code": "revision_not_found", "message": "Cette version est introuvable."}
    if isinstance(exc, ThemeValidationError):
        return 422, exc.as_dict()
    return None


def hash_preview_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _aware(value: Any) -> Any:
    # Le client Mongo renvoie des dates UTC sans fuseau.
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _iso(value: Any) -> Optional[str]:
    value = _aware(value)
    return value.isoformat() if isinstance(value, datetime) else None


def _public_spec(spec: Mapping[str, Any]) -> Dict[str, Any]:
    result = {key: spec[key] for key in _PUBLIC_SPEC_KEYS if key in spec}
    if spec.get("type") == "enum":
        labels = spec.get("labels", {})
        result["options"] = [{"value": value, "label": labels.get(value, value)} for value in spec["values"]]
    return result


def _group_label(page: Mapping[str, Any], section_label: str) -> str:
    page_label = PAGE_LABELS.get(page.get("kind"), page.get("title") or "Page")
    return section_label if section_label == page_label else f"{page_label} · {section_label}"


def guided_field_descriptors(document: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT) -> List[Dict[str, Any]]:
    """Points d'édition guidée du document, décrits à partir du registre et regroupés par rubrique.

    Chaque champ désigne une instance précise (réglage global, section ou bloc) : les clients
    n'ont pas besoin de connaître la structure d'un modèle pour l'éditer."""
    model = contract["models"].get(document.get("model_id"))
    if not model:
        return []
    guided = model.get("guided_settings", {})
    groups = contract.get("global_groups", {})
    fields: List[Dict[str, Any]] = []
    for group in list(groups) or ["identity"]:
        for key in guided.get("global", []):
            spec = contract["global_settings"].get(key)
            if not spec or spec["type"] not in EDITABLE_FIELD_TYPES or (spec.get("group") or "identity") != group:
                continue
            fields.append({
                "id": f"global.{key}", "scope": "global", "key": key,
                "group": f"global:{group}", "group_label": groups.get(group, "Réglages"),
                **_public_spec(spec),
            })
    for page in document.get("pages", []):
        for section in page.get("sections", []):
            section_spec = contract["sections"].get(section.get("type"), {})
            group = f"section:{page['id']}.{section['id']}"
            group_label = _group_label(page, section_spec.get("label", "Section"))
            for key in guided.get("sections", {}).get(section.get("type"), []):
                spec = section_spec.get("settings", {}).get(key)
                if spec and spec["type"] in EDITABLE_FIELD_TYPES:
                    fields.append({
                        "id": f"{page['id']}.{section['id']}.{key}", "scope": "section",
                        "page_id": page["id"], "section_id": section["id"], "key": key,
                        "group": group, "group_label": group_label, **_public_spec(spec),
                    })
            for index, block in enumerate(section.get("blocks", [])):
                block_spec = section_spec.get("blocks", {}).get(block.get("type"), {})
                for key in guided.get("blocks", {}).get(block.get("type"), []):
                    spec = block_spec.get("settings", {}).get(key)
                    if spec and spec["type"] in EDITABLE_FIELD_TYPES:
                        fields.append({
                            "id": f"{page['id']}.{section['id']}.{block['id']}.{key}", "scope": "block",
                            "page_id": page["id"], "section_id": section["id"], "block_id": block["id"], "key": key,
                            "group": group, "group_label": group_label, **_public_spec(spec),
                            "label": f"{block_spec.get('label', 'Élément')} {index + 1} · {spec.get('label', key)}",
                        })
    return fields


def _cas_condition(values: Mapping[str, Any], field: str) -> Any:
    """Condition Mongo exacte : valeur présente, présente à null, ou absente."""
    if field not in values:
        return {"$exists": False}
    if values[field] is None:
        return {"$exists": True, "$in": [None]}
    return values[field]


def _current_legacy_values(account: Mapping[str, Any]) -> Dict[str, Any]:
    return {field: account[field] for field in PUBLISHED_FIELDS if field in account}


def _pointer(account: Mapping[str, Any]) -> Dict[str, Any]:
    pointer = account.get(PUBLISHED_THEME_FIELD)
    return pointer if isinstance(pointer, dict) else {}


def _published_filter(account_id: str, slug: str, values: Mapping[str, Any], pointer_revision: Optional[str]) -> Dict[str, Any]:
    query: Dict[str, Any] = {"account_id": account_id, "ecommerce_slug": slug, **{field: _cas_condition(values, field) for field in PUBLISHED_FIELDS}}
    query[_POINTER_PATH] = pointer_revision if pointer_revision else {"$exists": False}
    return query


def _published_update(values: Mapping[str, Any], pointer: Optional[Dict[str, Any]], extra_set: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
    to_set = {field: values[field] for field in PUBLISHED_FIELDS if field in values}
    to_unset = {field: "" for field in PUBLISHED_FIELDS if field not in values}
    if pointer:
        to_set[PUBLISHED_THEME_FIELD] = pointer
    else:
        to_unset[PUBLISHED_THEME_FIELD] = ""
    update: Dict[str, Any] = {"$set": {**to_set, **(extra_set or {})}}
    if to_unset:
        update["$unset"] = to_unset
    return update


def _document_media_ids(*documents: Optional[Mapping[str, Any]]) -> set:
    ids = set()
    for document in documents:
        if document:
            ids.update(value for _path, value, _spec in iter_media_values(document) if isinstance(value, str))
    return ids


class EcommerceThemeService:
    def __init__(
        self,
        db,
        clock: Optional[Callable[[], datetime]] = None,
        contract: Mapping[str, Any] = CONTRACT,
        media: Optional[EcommerceMediaLibrary] = None,
    ):
        self.db = db
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.contract = contract
        self.store = ThemeRevisionStore(db, clock=self.clock, contract=contract)
        self.media = media or EcommerceMediaLibrary(db, base_url=lambda: "https://app.stockman.pro", clock=self.clock)
        self.accounts = db.business_accounts
        self.previews = db.ecommerce_theme_previews

    async def ensure_indexes(self) -> None:
        await self.store.ensure_indexes()
        await self.media.ensure_indexes()
        # Les sessions expirées sont supprimées automatiquement ; leur expiration est aussi vérifiée à la lecture.
        await self.previews.create_index("expires_at", expireAfterSeconds=0)
        await self.previews.create_index([("account_id", 1), ("site_slug", 1), ("revision_id", 1)])

    # --- Contrôles -----------------------------------------------------------

    @staticmethod
    def _require(capabilities: Mapping[str, bool], message_key: str, *names: str) -> None:
        if not any(capabilities.get(name) for name in names):
            raise ThemeServiceError(403, "forbidden", FORBIDDEN_MESSAGES[message_key])

    async def _load_account(self, account_id: str, slug: str) -> Dict[str, Any]:
        account = await self.accounts.find_one({"account_id": account_id, "ecommerce_slug": slug}, {"_id": 0})
        if not account:
            raise ThemeServiceError(404, "site_not_found", "Site e-commerce introuvable.")
        return account

    async def _author_names(self, author_ids: Iterable[str]) -> Dict[str, str]:
        ids = sorted({author_id for author_id in author_ids if author_id})
        if not ids:
            return {}
        users = await self.db.users.find({"user_id": {"$in": ids}}, {"_id": 0, "user_id": 1, "name": 1}).to_list(len(ids))
        return {user["user_id"]: user.get("name") or "" for user in users}

    async def _pointed_revision(self, account_id: str, slug: str, state: Mapping[str, Any], pointer: str) -> Optional[Dict[str, Any]]:
        revision_id = state.get(pointer)
        if not revision_id:
            return None
        try:
            return await self.store.get_revision(account_id, slug, revision_id)
        except ThemeRevisionNotFound:
            # Pointeur incohérent : la lecture continue sans cette version plutôt que de bloquer l'écran.
            logger.warning("Theme revision %s missing for %s:%s", revision_id, account_id, slug)
            return None

    async def _live_document(self, account_id: str, slug: str, live: Mapping[str, Any]) -> Tuple[Dict[str, Any], Optional[str]]:
        """Document servi au public : révision publiée d'un modèle à sections, sinon projection de Basic."""
        pointer = _pointer(live)
        if pointer.get("revision_id") and pointer.get("model_id") not in (None, LEGACY_MODEL_ID):
            try:
                revision = await self.store.get_revision(account_id, slug, pointer["revision_id"])
                return revision["document"], revision["_id"]
            except ThemeRevisionNotFound:
                logger.warning("Published theme revision %s missing for %s:%s", pointer["revision_id"], account_id, slug)
        return build_legacy_theme_document(live), None

    @staticmethod
    def _matches_live(revision: Mapping[str, Any], live: Mapping[str, Any]) -> bool:
        document = revision.get("document") or {}
        if document.get("model_id") != LEGACY_MODEL_ID or _pointer(live):
            return False
        texts = {field: live[field] for field in LEGACY_ACCOUNT_FIELDS if field in live}
        if legacy_account_values(document) != texts:
            return False
        return (document["global_settings"].get("logo_asset_id") or None) == parse_media_url(live.get(LEGACY_LOGO_FIELD))

    async def _assert_media(self, account_id: str, slug: str, document: Mapping[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Chaque média référencé appartient au compte et au site, et convient au champ."""
        references = [(path, value, spec) for path, value, spec in iter_media_values(document, self.contract) if value is not None]
        found = await self.media.get_many(account_id, slug, [value for _path, value, _spec in references])
        for path, value, spec in references:
            doc = found.get(value)
            if not doc:
                raise ThemeValidationError("media_not_found", path, "Cette image n'existe plus dans la bibliothèque.")
            if spec.get("media_kind") and doc.get("kind") != spec["media_kind"]:
                raise ThemeValidationError("media_kind_mismatch", path, "Cette image n'est pas adaptée à ce champ.")
        return found

    def _published_values(self, document: Mapping[str, Any], live: Mapping[str, Any], media: Mapping[str, Mapping[str, Any]]) -> Dict[str, Any]:
        """Valeurs historiques qu'une publication du document doit produire."""
        values = legacy_account_values(document) if document["model_id"] == LEGACY_MODEL_ID else compatible_legacy_values(document)
        logo_id = document["global_settings"].get("logo_asset_id")
        if logo_id:
            values[LEGACY_LOGO_FIELD] = self.media.display_url(media[logo_id], LOGO_DISPLAY_WIDTH)
        elif LEGACY_LOGO_FIELD in live and parse_media_url(live[LEGACY_LOGO_FIELD]) is None:
            # Logo externe historique : conservé tel quel, jamais effacé par une publication.
            values[LEGACY_LOGO_FIELD] = live[LEGACY_LOGO_FIELD]
        return values

    async def _public_media(self, account_id: str, slug: str, document: Mapping[str, Any]) -> Dict[str, Dict[str, Any]]:
        docs = await self.media.get_many(account_id, slug, _document_media_ids(document))
        result = {}
        for media_id, doc in docs.items():
            item = self.media.public_item(doc)
            result[media_id] = {key: item[key] for key in ("alt", "width", "height", "urls")}
        return result

    async def _media_map(self, account_id: str, slug: str, *documents: Optional[Mapping[str, Any]]) -> Dict[str, Dict[str, Any]]:
        docs = await self.media.get_many(account_id, slug, _document_media_ids(*documents))
        return {media_id: self.media.public_item(doc) for media_id, doc in docs.items()}

    async def media_in_use(self, account_id: str, slug: str) -> set:
        live = await self._load_account(account_id, slug)
        live_document, _ = await self._live_document(account_id, slug, live)
        state = await self.store.get_state(account_id, slug) or {}
        draft = await self._pointed_revision(account_id, slug, state, "draft_revision_id")
        return _document_media_ids(live_document, (draft or {}).get("document"))

    async def _available_models(self, plan: Optional[str], published_model: str, draft_model: Optional[str]) -> List[Dict[str, Any]]:
        overrides = await load_catalog_overrides(self.db, self.contract)
        models = []
        for model_id, model in self.contract["models"].items():
            if not is_model_available(model_id, plan, overrides, self.contract):
                continue
            models.append({
                "id": model_id,
                "name": model["name"],
                "description": model.get("description", ""),
                "published": model_id == published_model,
                "draft": model_id == draft_model,
            })
        return models

    async def _require_model(self, model_id: str, plan: Optional[str]) -> None:
        overrides = await load_catalog_overrides(self.db, self.contract)
        if model_id not in self.contract["models"] or not is_model_available(model_id, plan, overrides, self.contract):
            raise ThemeServiceError(403, "model_unavailable", "Ce modèle n'est pas disponible pour votre abonnement.")

    async def _authorize(self, account_id: str, slug: str, capabilities: Mapping[str, bool], live_document: Mapping[str, Any], candidate: Any) -> Dict[str, Any]:
        """Même modèle : différences contrôlées contre la version publique. Autre modèle : opération
        dédiée ; pour un canal guidé, la référence est le brouillon créé par le serveur pour ce modèle
        (structure approuvée et blocs issus des données du commerçant), sinon la structure du modèle."""
        if isinstance(candidate, dict) and candidate.get("model_id") == live_document.get("model_id"):
            return authorize_theme_change(capabilities, live_document, candidate, self.contract)
        self._require(capabilities, "change_model", "change_model")
        state = await self.store.get_state(account_id, slug) or {}
        draft = await self._pointed_revision(account_id, slug, state, "draft_revision_id")
        reference = None
        if draft and isinstance(candidate, dict) and draft["document"].get("model_id") == candidate.get("model_id"):
            reference = draft["document"]
        return authorize_theme_change(capabilities, reference, candidate, self.contract)

    async def _working_document(self, account_id: str, slug: str, live_document: Mapping[str, Any]) -> Mapping[str, Any]:
        """Travail en cours du commerçant : brouillon s'il existe, sinon version publique."""
        state = await self.store.get_state(account_id, slug) or {}
        draft = await self._pointed_revision(account_id, slug, state, "draft_revision_id")
        return (draft or {}).get("document") or live_document

    async def _identity(self, account_id: str, slug: str, live: Mapping[str, Any], live_document: Mapping[str, Any]) -> Dict[str, Any]:
        """Valeurs du commerçant reprises par un nouveau modèle : brouillon en cours, sinon version publique."""
        identity = theme_identity(await self._working_document(account_id, slug, live_document), live)
        if identity.get("logo_asset_id") and not await self.media.get(account_id, slug, identity["logo_asset_id"]):
            identity.pop("logo_asset_id")
        top_category = await self._top_category(live)
        if top_category:
            identity["top_category"] = top_category
        return identity

    async def _categories(self, live: Mapping[str, Any]) -> List[str]:
        """Catégories réelles de la boutique liée, de la plus fournie à la moins fournie."""
        try:
            query: Dict[str, Any] = {"user_id": live.get("owner_user_id"), "is_active": {"$ne": False}}
            if live.get("ecommerce_default_store_id"):
                query["store_id"] = live["ecommerce_default_store_id"]
            products = await self.db.products.find(query, {"_id": 0, "category_id": 1}).limit(2000).to_list(2000)
            counts: Dict[str, int] = {}
            for product in products:
                if product.get("category_id"):
                    counts[product["category_id"]] = counts.get(product["category_id"], 0) + 1
            if not counts:
                return []
            categories = await self.db.categories.find(
                {"category_id": {"$in": list(counts)}, "user_id": live.get("owner_user_id")}, {"_id": 0, "category_id": 1, "name": 1}
            ).to_list(len(counts))
            totals: Dict[str, int] = {}
            for category in categories:
                name = category.get("name")
                if isinstance(name, str) and name.strip():
                    label = name.strip()[:MAX_CATEGORY_LENGTH]
                    totals[label] = totals.get(label, 0) + counts.get(category.get("category_id"), 0)
            return [name for name, _count in sorted(totals.items(), key=lambda item: (-item[1], item[0].casefold()))][:MAX_CATEGORIES]
        except Exception:
            logger.warning("Categories unavailable for %s", live.get("account_id"))
            return []

    async def _top_category(self, live: Mapping[str, Any]) -> Optional[str]:
        """Catégorie réelle la plus fournie de la boutique liée, pour la collection mise en avant."""
        categories = await self._categories(live)
        return categories[0] if categories else None

    # --- Lecture -------------------------------------------------------------

    async def view(self, account: Mapping[str, Any], slug: str, capabilities: Mapping[str, bool], plan: Optional[str] = None) -> Dict[str, Any]:
        self._require(capabilities, "view", "view")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        published_document, live_revision_id = await self._live_document(account_id, slug, live)
        issues: List[Dict[str, str]] = []
        try:
            validate_theme_document(published_document, self.contract)
        except ThemeValidationError as exc:
            # Valeur historique incompatible : signalée, jamais corrigée en silence.
            issues.append(exc.as_dict())
        state = await self.store.get_state(account_id, slug) or {}

        draft = None
        revision = await self._pointed_revision(account_id, slug, state, "draft_revision_id")
        if revision:
            names = await self._author_names([revision.get("author_id")])
            draft = {
                "revision_id": revision["_id"],
                "document": revision["document"],
                "updated_at": _iso(revision.get("created_at")),
                "updated_by": names.get(revision.get("author_id")) or None,
            }

        published_revision_id = live_revision_id
        published_at = _iso(state.get("published_at")) if live_revision_id else None
        if not live_revision_id:
            revision = await self._pointed_revision(account_id, slug, state, "published_revision_id")
            # Les réglages du site peuvent avoir changé depuis : la version n'est signalée en ligne
            # que si elle correspond exactement aux valeurs publiques actuelles.
            if revision and self._matches_live(revision, live):
                published_revision_id = revision["_id"]
                published_at = _iso(state.get("published_at"))

        edited = draft["document"] if draft else published_document
        model = resolve_model(edited.get("model_id"), self.contract)
        media = await self._media_map(account_id, slug, published_document, draft["document"] if draft else None)
        return {
            "site_slug": slug,
            "site_enabled": live.get("ecommerce_enabled") is True,
            "lock_version": state.get("lock_version", 0),
            "capabilities": {key: bool(value) for key, value in capabilities.items()},
            "model": {"id": model["id"], "name": model["name"], "version": model["version"]},
            "models": await self._available_models(plan, published_document["model_id"], draft["document"]["model_id"] if draft else None),
            "fields": guided_field_descriptors(edited, self.contract),
            # Styles prêts à l'emploi du modèle : ils ne touchent jamais à la couleur de marque.
            "presets": copy.deepcopy(model.get("presets", [])),
            # Catégories réelles du catalogue, proposées pour la collection mise en avant.
            "categories": await self._categories(live),
            "published": {
                "model_id": published_document["model_id"],
                "document": published_document,
                "fingerprint": document_fingerprint(published_document),
                "revision_id": published_revision_id,
                "published_at": published_at,
                "issues": issues,
            },
            "draft": draft,
            "media": media,
        }

    async def history(self, account: Mapping[str, Any], slug: str, capabilities: Mapping[str, bool]) -> Dict[str, Any]:
        self._require(capabilities, "manage_history", "manage_history")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        state = await self.store.get_state(account_id, slug) or {}
        revisions = await self.store.list_revisions(account_id, slug, HISTORY_LIMIT)
        _document, live_revision_id = await self._live_document(account_id, slug, live)
        if not live_revision_id:
            published = await self._pointed_revision(account_id, slug, state, "published_revision_id")
            live_revision_id = published["_id"] if published and self._matches_live(published, live) else None
        names = await self._author_names(revision.get("author_id") for revision in revisions)
        items = []
        for revision in revisions:
            reason = revision.get("reason") or "draft"
            kind, _, origin = reason.partition(":")
            items.append({
                "revision_id": revision["_id"],
                "created_at": _iso(revision.get("created_at")),
                "author": names.get(revision.get("author_id")) or None,
                "kind": kind if kind in ("draft", "restore", "model", "settings") else "draft",
                "restored_from": origin if kind == "restore" else None,
                "model_id": revision.get("model_id"),
                "model_name": self.contract["models"].get(revision.get("model_id"), {}).get("name"),
                "is_draft": revision["_id"] == state.get("draft_revision_id"),
                "is_published": revision["_id"] == live_revision_id,
            })
        return {"revisions": items}

    async def public_theme(self, account_doc: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
        """Thème publié d'un modèle à sections pour le site public, ou None pour Stockman Basic."""
        pointer = _pointer(account_doc)
        if not pointer.get("revision_id") or pointer.get("model_id") in (None, LEGACY_MODEL_ID):
            return None
        account_id, slug = account_doc.get("account_id"), account_doc.get("ecommerce_slug")
        try:
            revision = await self.store.get_revision(account_id, slug, pointer["revision_id"])
            document = validate_theme_document(revision["document"], self.contract)
        except (ThemeRevisionNotFound, ThemeValidationError):
            # Le site reste servi par Stockman Basic à partir des champs reflétés, jamais par une page blanche.
            logger.warning("Published theme unavailable for %s:%s", account_id, slug)
            return None
        return {"model_id": document["model_id"], "document": document, "media": await self._public_media(account_id, slug, document)}

    # --- Mutations -----------------------------------------------------------

    async def save_draft(self, account, slug: str, *, document: Any, expected_lock_version: int, capabilities, author_id: str) -> Dict[str, Any]:
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        live_document, _ = await self._live_document(account_id, slug, live)
        # La référence est toujours la version publique actuelle, pas le dernier brouillon.
        validated = await self._authorize(account_id, slug, capabilities, live_document, document)
        await self._assert_media(account_id, slug, validated)
        await self.store.save_draft(account_id, slug, validated, author_id=author_id, expected_lock_version=expected_lock_version)
        return await self.view(account, slug, capabilities)

    async def change_model(self, account, slug: str, *, model_id: str, expected_lock_version: int, capabilities, plan: Optional[str], author_id: str) -> Dict[str, Any]:
        """Crée un brouillon du modèle choisi, rempli avec les valeurs réelles du commerçant."""
        self._require(capabilities, "change_model", "change_model")
        await self._require_model(model_id, plan)
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        live_document, _ = await self._live_document(account_id, slug, live)
        document = instantiate_model(model_id, await self._identity(account_id, slug, live, live_document), self.contract)
        # Les pages personnalisées suivent le site dans un modèle qui les accepte.
        document = carry_custom_pages(document, await self._working_document(account_id, slug, live_document), self.contract)
        await self.store.save_draft(account_id, slug, document, author_id=author_id, expected_lock_version=expected_lock_version, reason=f"model:{model_id}")
        return await self.view(account, slug, capabilities, plan)

    async def discard_draft(self, account, slug: str, *, expected_lock_version: int, capabilities, author_id: str) -> Dict[str, Any]:
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        state = await self.store.get_state(account_id, slug)
        current_lock = (state or {}).get("lock_version", 0)
        if current_lock != expected_lock_version:
            raise ThemeConflictError(current_lock)
        draft_id = (state or {}).get("draft_revision_id")
        if not draft_id:
            raise ThemeServiceError(409, "no_draft", "Aucun brouillon à abandonner.")
        await self.store.discard_draft(account_id, slug, expected_lock_version=expected_lock_version)
        # Les aperçus d'un brouillon abandonné ne doivent plus être consultables.
        await self.previews.update_many(
            {"account_id": account_id, "site_slug": slug, "revision_id": draft_id, "revoked_at": {"$exists": False}},
            {"$set": {"revoked_at": self.clock(), "revoked_by": author_id}},
        )
        return await self.view(account, slug, capabilities)

    async def _publish_document(
        self,
        account_id: str,
        slug: str,
        live: Mapping[str, Any],
        document: Mapping[str, Any],
        revision_id: str,
        *,
        expected_lock_version: int,
        author_id: str,
        clear_draft: bool,
    ) -> None:
        media = await self._assert_media(account_id, slug, document)
        previous = _current_legacy_values(live)
        previous_pointer = _pointer(live) or None
        values = self._published_values(document, live, media)
        pointer = None if document["model_id"] == LEGACY_MODEL_ID else {"model_id": document["model_id"], "revision_id": revision_id}
        now = self.clock()
        result = await self.accounts.update_one(
            _published_filter(account_id, slug, previous, (previous_pointer or {}).get("revision_id")),
            _published_update(values, pointer, {"ecommerce_configured_at": now, "updated_at": now}),
        )
        if not result.matched_count:
            raise ThemeServiceError(409, "published_changed", PUBLISHED_CHANGED_MESSAGE)
        try:
            await self.store.publish(
                account_id, slug,
                revision_id=revision_id, author_id=author_id,
                expected_lock_version=expected_lock_version, clear_draft=clear_draft,
            )
        except ThemeConflictError:
            # Une autre opération a déplacé les pointeurs : les valeurs publiques précédentes sont
            # rétablies, uniquement si personne ne les a modifiées depuis.
            await self.accounts.update_one(
                _published_filter(account_id, slug, values, (pointer or {}).get("revision_id")),
                _published_update(previous, previous_pointer),
            )
            raise
        try:
            await EcommerceOnboarding(self.db, clock=self.clock).configured(account_id, slug)
        except Exception:
            logger.warning("E-commerce onboarding sync deferred for account %s", account_id)

    async def publish(
        self,
        account,
        slug: str,
        *,
        revision_id: str,
        expected_lock_version: int,
        expected_published_fingerprint: str,
        capabilities,
        author_id: str,
    ) -> Dict[str, Any]:
        self._require(capabilities, "publish", "publish")
        account_id = account["account_id"]
        state = await self.store.get_state(account_id, slug)
        current_lock = (state or {}).get("lock_version", 0)
        if current_lock != expected_lock_version:
            raise ThemeConflictError(current_lock)
        if not state or state.get("draft_revision_id") != revision_id:
            raise ThemeServiceError(409, "draft_changed", "Ce brouillon n'est plus le brouillon en cours. Rechargez l'apparence du site.")

        live = await self._load_account(account_id, slug)
        live_document, _ = await self._live_document(account_id, slug, live)
        if document_fingerprint(live_document) != expected_published_fingerprint:
            raise ThemeServiceError(409, "published_changed", PUBLISHED_CHANGED_MESSAGE)
        revision = await self.store.get_revision(account_id, slug, revision_id)
        # Les droits sont réévalués à la publication contre la version publique de référence :
        # un brouillon plus riche ne peut pas être publié par un canal limité à l'édition guidée.
        document = await self._authorize(account_id, slug, capabilities, live_document, revision["document"])
        await self._publish_document(
            account_id, slug, live, document, revision_id,
            expected_lock_version=expected_lock_version, author_id=author_id, clear_draft=True,
        )
        return await self.view(account, slug, capabilities)

    async def restore(self, account, slug: str, *, revision_id: str, expected_lock_version: int, capabilities, author_id: str) -> Dict[str, Any]:
        self._require(capabilities, "manage_history", "manage_history")
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        source = await self.store.get_revision(account_id, slug, revision_id)
        live = await self._load_account(account_id, slug)
        live_document, _ = await self._live_document(account_id, slug, live)
        validated = await self._authorize(account_id, slug, capabilities, live_document, source["document"])
        # Une version qui désigne une image supprimée depuis ne peut pas redevenir un brouillon.
        await self._assert_media(account_id, slug, validated)
        await self.store.restore(account_id, slug, revision_id=revision_id, author_id=author_id, expected_lock_version=expected_lock_version)
        return await self.view(account, slug, capabilities)

    async def apply_legacy_settings(self, account_id: str, slug: str, changes: Mapping[str, Any], *, author_id: str) -> bool:
        """Traduit les réglages de présentation envoyés par une ancienne application vers le modèle
        publié, puis publie immédiatement, comme ces applications le faisaient. Retourne False pour
        Stockman Basic, dont les champs historiques restent directement la source du rendu."""
        relevant = {field: value for field, value in changes.items() if field in LEGACY_SETTINGS_TO_THEME}
        for _attempt in range(3):
            live = await self._load_account(account_id, slug)
            live_document, live_revision_id = await self._live_document(account_id, slug, live)
            if not live_revision_id or not relevant:
                return False
            document = copy.deepcopy(live_document)
            hero = next(
                (section for page in document["pages"] if page["kind"] == "home" for section in page["sections"] if section["type"] == "hero"),
                None,
            )
            for field, value in relevant.items():
                scope, key = LEGACY_SETTINGS_TO_THEME[field]
                target = document["global_settings"] if scope == "global" else (hero or {}).get("settings")
                if target is not None:
                    target[key] = value
            validated = validate_theme_document(document, self.contract)
            if validated == live_document:
                return True
            state = await self.store.get_state(account_id, slug) or {}
            revision = await self.store.create_revision(
                account_id, slug, validated, author_id=author_id, reason="settings", parent_id=live_revision_id,
            )
            try:
                await self._publish_document(
                    account_id, slug, live, validated, revision["_id"],
                    expected_lock_version=state.get("lock_version", 0), author_id=author_id, clear_draft=False,
                )
                return True
            except ThemeConflictError:
                continue
            except ThemeServiceError as exc:
                if exc.code != "published_changed":
                    raise
        raise ThemeServiceError(409, "published_changed", PUBLISHED_CHANGED_MESSAGE)

    # --- Aperçu privé --------------------------------------------------------

    async def create_preview(
        self,
        account,
        slug: str,
        *,
        source: str,
        capabilities,
        author_id: str,
        model_id: Optional[str] = None,
        plan: Optional[str] = None,
    ) -> Tuple[str, datetime]:
        self._require(capabilities, "preview", "preview")
        if source not in PREVIEW_SOURCES:
            raise ThemeServiceError(422, "invalid_source", "Source d'aperçu inconnue.")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        revision_id = None
        candidate = None
        if source == "draft":
            state = await self.store.get_state(account_id, slug) or {}
            revision_id = state.get("draft_revision_id")
            if not revision_id:
                raise ThemeServiceError(409, "no_draft", "Aucun brouillon à prévisualiser. Enregistrez d'abord vos modifications.")
        elif source == "model":
            # Découverte d'un modèle avant de le choisir : rien n'est enregistré dans l'historique.
            await self._require_model(model_id or "", plan)
            live_document, _ = await self._live_document(account_id, slug, live)
            candidate = instantiate_model(model_id, await self._identity(account_id, slug, live, live_document), self.contract)
        token = secrets.token_urlsafe(32)
        now = self.clock()
        expires_at = now + PREVIEW_TTL
        session = {
            "_id": hash_preview_token(token),
            "account_id": account_id,
            "site_slug": slug,
            "revision_id": revision_id,
            "created_by": author_id,
            "created_at": now,
            "expires_at": expires_at,
        }
        if candidate is not None:
            session["document"] = candidate
        await self.previews.insert_one(session)
        return token, expires_at

    async def resolve_preview(self, token: Any) -> Tuple[Dict[str, Any], Dict[str, Any], Optional[Dict[str, Any]]]:
        """Compte effectif et thème à afficher pour un jeton valide, sans rien écrire."""
        if not isinstance(token, str) or not _TOKEN_RE.match(token):
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        session = await self.previews.find_one({"_id": hash_preview_token(token)})
        if not session or session.get("revoked_at") or _aware(session.get("expires_at")) <= self.clock():
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        account_id, slug = session["account_id"], session["site_slug"]
        account = await self.accounts.find_one({"account_id": account_id, "ecommerce_slug": slug}, {"_id": 0})
        if not account:
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        try:
            if session.get("document"):
                document = validate_theme_document(session["document"], self.contract)
                source = "model"
            elif session.get("revision_id"):
                revision = await self.store.get_revision(account_id, slug, session["revision_id"])
                document = validate_theme_document(revision["document"], self.contract)
                source = "draft"
            else:
                live_document, _ = await self._live_document(account_id, slug, account)
                document = validate_theme_document(live_document, self.contract)
                source = "published"
        except (ThemeRevisionNotFound, ThemeValidationError):
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        media = await self.media.get_many(account_id, slug, _document_media_ids(document))
        if any(media_id not in media for media_id in _document_media_ids(document)):
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        effective = dict(account)
        for field in PUBLISHED_FIELDS:
            effective.pop(field, None)
        effective.update(self._published_values(document, account, media))
        theme = None
        if document["model_id"] != LEGACY_MODEL_ID:
            theme = {"model_id": document["model_id"], "document": document, "media": await self._public_media(account_id, slug, document)}
        return effective, {
            "expires_at": _iso(session.get("expires_at")),
            "source": source,
            "site_enabled": account.get("ecommerce_enabled") is True,
        }, theme

    # --- Bibliothèque de médias ----------------------------------------------

    async def list_media(self, account, slug: str, capabilities, kind: Optional[str] = None) -> Dict[str, Any]:
        self._require(capabilities, "view", "view")
        if kind is not None and kind not in MEDIA_KINDS:
            raise MediaServiceError(422, "media_kind", "Type de média inconnu.")
        account_id = account["account_id"]
        in_use = await self.media_in_use(account_id, slug)
        items = await self.media.list(account_id, slug, in_use=in_use, kind=kind)
        # La limite technique porte sur toute la bibliothèque du site, tous types confondus.
        return {"media": items, "total": await self.media.count(account_id, slug), "limit": MEDIA_LIMIT}

    async def upload_media(self, account, slug: str, *, data: Any, kind: str, alt: Any, capabilities, author_id: str) -> Dict[str, Any]:
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        await self._load_account(account_id, slug)
        doc = await self.media.upload(account_id, slug, data=data, kind=kind, alt=alt, author_id=author_id)
        in_use = await self.media_in_use(account_id, slug)
        return self.media.public_item(doc, in_use=doc["_id"] in in_use)

    async def update_media_alt(self, account, slug: str, media_id: str, *, alt: Any, capabilities) -> Dict[str, Any]:
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        doc = await self.media.update_alt(account_id, slug, media_id, alt)
        in_use = await self.media_in_use(account_id, slug)
        return self.media.public_item(doc, in_use=media_id in in_use)

    async def delete_media(self, account, slug: str, media_id: str, *, capabilities) -> Dict[str, Any]:
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        await self.media.delete(account_id, slug, media_id, in_use=await self.media_in_use(account_id, slug))
        return {"deleted": True}
