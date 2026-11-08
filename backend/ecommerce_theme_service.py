"""Apparence des sites e-commerce : brouillon, publication, historique et aperçu privé.

- Les capacités sont calculées par le serveur à chaque requête et vérifiées ici avant
  toute écriture ; aucun droit fourni par le client n'est lu.
- Stockman Basic (``legacy-v1``) garde ses champs historiques comme source du rendu
  public. Publier écrit ces champs sous condition que les valeurs en ligne n'aient pas
  changé : le rendu actuel, les anciennes applications et l'historique restent cohérents,
  sans double source d'autorité.
- L'aperçu privé repose sur un jeton aléatoire dont seule l'empreinte est conservée. Il
  expire, peut afficher un site désactivé et n'autorise aucune opération commerciale.
- Rien ici ne modifie l'activation du site, son domaine, ses produits, ses prix, ses
  stocks, ses commandes ou ses paiements.
"""

import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional, Tuple

from ecommerce_onboarding import EcommerceOnboarding
from ecommerce_theme_store import ThemeConflictError, ThemeRevisionNotFound, ThemeRevisionStore, document_fingerprint
from ecommerce_themes import (
    CONTRACT,
    LEGACY_ACCOUNT_FIELDS,
    LEGACY_MODEL_ID,
    ThemeValidationError,
    authorize_theme_change,
    build_legacy_theme_document,
    iter_media_values,
    legacy_account_values,
    resolve_model,
    validate_theme_document,
)

logger = logging.getLogger(__name__)

PREVIEW_TTL = timedelta(minutes=30)
HISTORY_LIMIT = 50
PREVIEW_SOURCES = ("draft", "published")
# Les champs média attendent la bibliothèque de médias : ils ne sont pas proposés à l'édition.
EDITABLE_FIELD_TYPES = ("text", "color")
_PUBLIC_SPEC_KEYS = ("type", "label", "hint", "max_length", "multiline", "nullable")
_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{32,128}$")

FORBIDDEN_MESSAGES = {
    "view": "Accès à l'apparence du site non autorisé.",
    "edit": "Vous ne pouvez pas modifier l'apparence du site depuis ce canal.",
    "publish": "Vous ne pouvez pas publier l'apparence du site depuis ce canal.",
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
    if isinstance(exc, ThemeServiceError):
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


def guided_field_descriptors(document: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT) -> List[Dict[str, Any]]:
    """Points d'édition guidée du document, décrits à partir du registre.

    Chaque champ désigne une instance précise (page et section) : les clients n'ont pas
    besoin de connaître la structure d'un modèle pour l'éditer."""
    model = contract["models"].get(document.get("model_id"))
    if not model:
        return []
    guided = model.get("guided_settings", {})
    fields: List[Dict[str, Any]] = []
    for key in guided.get("global", []):
        spec = contract["global_settings"].get(key)
        if spec and spec["type"] in EDITABLE_FIELD_TYPES:
            fields.append({"id": f"global.{key}", "scope": "global", "key": key, **_public_spec(spec)})
    for page in document.get("pages", []):
        for section in page.get("sections", []):
            keys = guided.get("sections", {}).get(section.get("type"), [])
            specs = contract["sections"].get(section.get("type"), {}).get("settings", {})
            for key in keys:
                spec = specs.get(key)
                if spec and spec["type"] in EDITABLE_FIELD_TYPES:
                    fields.append({
                        "id": f"{page['id']}.{section['id']}.{key}",
                        "scope": "section",
                        "page_id": page["id"],
                        "section_id": section["id"],
                        "key": key,
                        **_public_spec(spec),
                    })
    return fields


def _public_spec(spec: Mapping[str, Any]) -> Dict[str, Any]:
    return {key: spec[key] for key in _PUBLIC_SPEC_KEYS if key in spec}


def assert_no_unverified_media(document: Mapping[str, Any], contract: Mapping[str, Any] = CONTRACT) -> None:
    """Sans bibliothèque de médias, aucune référence ne peut être rattachée après vérification
    de propriété : toute valeur non nulle est refusée."""
    for path, value in iter_media_values(document, contract):
        if value is not None:
            raise ThemeValidationError("media_unavailable", path, "La bibliothèque de médias n'est pas encore disponible : retirez ce média.")


def _cas_condition(values: Mapping[str, Any], field: str) -> Any:
    """Condition Mongo exacte : valeur présente, présente à null, ou absente."""
    if field not in values:
        return {"$exists": False}
    if values[field] is None:
        return {"$exists": True, "$in": [None]}
    return values[field]


def _legacy_update(values: Mapping[str, Any], extra_set: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
    update: Dict[str, Any] = {"$set": {**{field: values[field] for field in LEGACY_ACCOUNT_FIELDS if field in values}, **(extra_set or {})}}
    removed = {field: "" for field in LEGACY_ACCOUNT_FIELDS if field not in values}
    if removed:
        update["$unset"] = removed
    return update


def _current_legacy_values(account: Mapping[str, Any]) -> Dict[str, Any]:
    return {field: account[field] for field in LEGACY_ACCOUNT_FIELDS if field in account}


class EcommerceThemeService:
    def __init__(self, db, clock: Optional[Callable[[], datetime]] = None, contract: Mapping[str, Any] = CONTRACT):
        self.db = db
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.contract = contract
        self.store = ThemeRevisionStore(db, clock=self.clock, contract=contract)
        self.accounts = db.business_accounts
        self.previews = db.ecommerce_theme_previews

    async def ensure_indexes(self) -> None:
        await self.store.ensure_indexes()
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

    @staticmethod
    def _matches_live(revision: Mapping[str, Any], live: Mapping[str, Any]) -> bool:
        document = revision.get("document") or {}
        if document.get("model_id") != LEGACY_MODEL_ID:
            return False
        return legacy_account_values(document) == _current_legacy_values(live)

    def _check_publishable(self, document: Mapping[str, Any]) -> None:
        assert_no_unverified_media(document, self.contract)
        if document["model_id"] != LEGACY_MODEL_ID:
            # Seul Stockman Basic dispose aujourd'hui d'un moteur de rendu public.
            raise ThemeServiceError(409, "renderer_unavailable", "Ce modèle n'est pas encore disponible pour la publication.")

    # --- Lecture -------------------------------------------------------------

    async def view(self, account: Mapping[str, Any], slug: str, capabilities: Mapping[str, bool]) -> Dict[str, Any]:
        self._require(capabilities, "view", "view")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        published_document = build_legacy_theme_document(live)
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

        published_revision_id = None
        published_at = None
        revision = await self._pointed_revision(account_id, slug, state, "published_revision_id")
        # Les réglages du site peuvent avoir changé depuis : la version n'est signalée en ligne
        # que si elle correspond exactement aux valeurs publiques actuelles.
        if revision and self._matches_live(revision, live):
            published_revision_id = revision["_id"]
            published_at = _iso(state.get("published_at"))

        edited = draft["document"] if draft else published_document
        model = resolve_model(edited.get("model_id"), self.contract)
        return {
            "site_slug": slug,
            "site_enabled": live.get("ecommerce_enabled") is True,
            "lock_version": state.get("lock_version", 0),
            "capabilities": {key: bool(value) for key, value in capabilities.items()},
            "model": {"id": model["id"], "name": model["name"], "version": model["version"]},
            "fields": guided_field_descriptors(edited, self.contract),
            "published": {
                "document": published_document,
                "fingerprint": document_fingerprint(published_document),
                "revision_id": published_revision_id,
                "published_at": published_at,
                "issues": issues,
            },
            "draft": draft,
        }

    async def history(self, account: Mapping[str, Any], slug: str, capabilities: Mapping[str, bool]) -> Dict[str, Any]:
        self._require(capabilities, "manage_history", "manage_history")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        state = await self.store.get_state(account_id, slug) or {}
        revisions = await self.store.list_revisions(account_id, slug, HISTORY_LIMIT)
        published = await self._pointed_revision(account_id, slug, state, "published_revision_id")
        live_revision_id = published["_id"] if published and self._matches_live(published, live) else None
        names = await self._author_names(revision.get("author_id") for revision in revisions)
        items = []
        for revision in revisions:
            reason = revision.get("reason") or "draft"
            items.append({
                "revision_id": revision["_id"],
                "created_at": _iso(revision.get("created_at")),
                "author": names.get(revision.get("author_id")) or None,
                "kind": "restore" if reason.startswith("restore:") else "draft",
                "restored_from": reason.split(":", 1)[1] if reason.startswith("restore:") else None,
                "model_id": revision.get("model_id"),
                "is_draft": revision["_id"] == state.get("draft_revision_id"),
                "is_published": revision["_id"] == live_revision_id,
            })
        return {"revisions": items}

    # --- Mutations -----------------------------------------------------------

    async def save_draft(self, account, slug: str, *, document: Any, expected_lock_version: int, capabilities, author_id: str) -> Dict[str, Any]:
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        live = await self._load_account(account_id, slug)
        # La référence est toujours la version publique actuelle, pas le dernier brouillon.
        validated = authorize_theme_change(capabilities, build_legacy_theme_document(live), document, self.contract)
        assert_no_unverified_media(validated, self.contract)
        await self.store.save_draft(account_id, slug, validated, author_id=author_id, expected_lock_version=expected_lock_version)
        return await self.view(account, slug, capabilities)

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
        live_document = build_legacy_theme_document(live)
        if document_fingerprint(live_document) != expected_published_fingerprint:
            raise ThemeServiceError(409, "published_changed", PUBLISHED_CHANGED_MESSAGE)
        revision = await self.store.get_revision(account_id, slug, revision_id)
        # Les droits sont réévalués à la publication contre la version publique de référence :
        # un brouillon plus riche ne peut pas être publié par un canal limité à l'édition guidée.
        document = authorize_theme_change(capabilities, live_document, revision["document"], self.contract)
        self._check_publishable(document)

        previous = _current_legacy_values(live)
        published = legacy_account_values(document)
        now = self.clock()
        result = await self.accounts.update_one(
            {"account_id": account_id, "ecommerce_slug": slug, **{field: _cas_condition(previous, field) for field in LEGACY_ACCOUNT_FIELDS}},
            _legacy_update(published, {"ecommerce_configured_at": now, "updated_at": now}),
        )
        if not result.matched_count:
            raise ThemeServiceError(409, "published_changed", PUBLISHED_CHANGED_MESSAGE)
        try:
            await self.store.publish(
                account_id, slug,
                revision_id=revision_id, author_id=author_id,
                expected_lock_version=expected_lock_version, clear_draft=True,
            )
        except ThemeConflictError:
            # Une autre opération a déplacé les pointeurs : les valeurs publiques précédentes sont
            # rétablies, uniquement si personne ne les a modifiées depuis.
            await self.accounts.update_one(
                {"account_id": account_id, "ecommerce_slug": slug, **{field: _cas_condition(published, field) for field in LEGACY_ACCOUNT_FIELDS}},
                _legacy_update(previous),
            )
            raise
        try:
            await EcommerceOnboarding(self.db, clock=self.clock).configured(account_id, slug)
        except Exception:
            logger.warning("E-commerce onboarding sync deferred for account %s", account_id)
        return await self.view(account, slug, capabilities)

    async def restore(self, account, slug: str, *, revision_id: str, expected_lock_version: int, capabilities, author_id: str) -> Dict[str, Any]:
        self._require(capabilities, "manage_history", "manage_history")
        self._require(capabilities, "edit", "guided_edit", "structure_edit")
        account_id = account["account_id"]
        source = await self.store.get_revision(account_id, slug, revision_id)
        live = await self._load_account(account_id, slug)
        validated = authorize_theme_change(capabilities, build_legacy_theme_document(live), source["document"], self.contract)
        assert_no_unverified_media(validated, self.contract)
        await self.store.restore(account_id, slug, revision_id=revision_id, author_id=author_id, expected_lock_version=expected_lock_version)
        return await self.view(account, slug, capabilities)

    # --- Aperçu privé --------------------------------------------------------

    async def create_preview(self, account, slug: str, *, source: str, capabilities, author_id: str) -> Tuple[str, datetime]:
        self._require(capabilities, "preview", "preview")
        if source not in PREVIEW_SOURCES:
            raise ThemeServiceError(422, "invalid_source", "Source d'aperçu inconnue.")
        account_id = account["account_id"]
        await self._load_account(account_id, slug)
        revision_id = None
        if source == "draft":
            state = await self.store.get_state(account_id, slug)
            revision_id = (state or {}).get("draft_revision_id")
            if not revision_id:
                raise ThemeServiceError(409, "no_draft", "Aucun brouillon à prévisualiser. Enregistrez d'abord vos modifications.")
        token = secrets.token_urlsafe(32)
        now = self.clock()
        expires_at = now + PREVIEW_TTL
        await self.previews.insert_one({
            "_id": hash_preview_token(token),
            "account_id": account_id,
            "site_slug": slug,
            "revision_id": revision_id,
            "created_by": author_id,
            "created_at": now,
            "expires_at": expires_at,
        })
        return token, expires_at

    async def resolve_preview(self, token: Any) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Compte effectif à afficher pour un jeton valide : les champs historiques sont remplacés
        par ceux de la révision prévisualisée, sans rien écrire."""
        if not isinstance(token, str) or not _TOKEN_RE.match(token):
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        session = await self.previews.find_one({"_id": hash_preview_token(token)})
        if not session or session.get("revoked_at") or _aware(session.get("expires_at")) <= self.clock():
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        account = await self.accounts.find_one({"account_id": session["account_id"], "ecommerce_slug": session["site_slug"]}, {"_id": 0})
        if not account:
            raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
        effective = dict(account)
        if session.get("revision_id"):
            try:
                revision = await self.store.get_revision(session["account_id"], session["site_slug"], session["revision_id"])
                document = validate_theme_document(revision["document"], self.contract)
            except (ThemeRevisionNotFound, ThemeValidationError):
                raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
            if document["model_id"] != LEGACY_MODEL_ID:
                raise ThemeServiceError(404, "preview_not_found", PREVIEW_UNAVAILABLE_MESSAGE)
            for field in LEGACY_ACCOUNT_FIELDS:
                effective.pop(field, None)
            effective.update(legacy_account_values(document))
        return effective, {
            "expires_at": _iso(session.get("expires_at")),
            "source": "draft" if session.get("revision_id") else "published",
            "site_enabled": account.get("ecommerce_enabled") is True,
        }
