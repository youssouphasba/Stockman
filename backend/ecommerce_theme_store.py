"""Révisions versionnées des thèmes e-commerce : brouillon et publication distincts.

- Une révision est immuable après création et toujours rattachée à un compte et un site.
- L'état du site pointe vers le brouillon courant et la révision publiée ; chaque
  changement de pointeur est conditionné par ``lock_version`` (contrôle de concurrence).
- Publier ne modifie ni l'activation du site, ni son domaine, ni aucune donnée commerciale.
- Restaurer crée un nouveau brouillon à partir d'une ancienne révision, sans réécrire
  l'historique ; la mise en ligne exige une nouvelle publication.
- Abandonner un brouillon retire seulement le pointeur : la révision reste consultable.

Les autorisations (capacités et points guidés) sont vérifiées par l'appelant avec
``ecommerce_themes.authorize_theme_change`` avant toute écriture.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ecommerce_themes import CONTRACT, validate_theme_document


class ThemeConflictError(Exception):
    """La version de référence ne correspond plus : une autre sauvegarde a eu lieu."""

    def __init__(self, current_lock_version: int):
        super().__init__("Theme state changed")
        self.current_lock_version = current_lock_version


class ThemeRevisionNotFound(Exception):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def document_fingerprint(document: Dict[str, Any]) -> str:
    canonical = json.dumps(document, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class ThemeRevisionStore:
    def __init__(self, db, clock: Callable[[], datetime] = utc_now, contract: Dict[str, Any] = CONTRACT):
        self.states = db.ecommerce_theme_states
        self.revisions = db.ecommerce_theme_revisions
        self.clock = clock
        self.contract = contract

    @staticmethod
    def key(account_id: str, slug: str) -> str:
        return f"{account_id}:{slug}"

    async def ensure_indexes(self) -> None:
        await self.revisions.create_index([("account_id", 1), ("site_slug", 1), ("created_at", -1)])

    async def get_state(self, account_id: str, slug: str) -> Optional[Dict[str, Any]]:
        return await self.states.find_one({"_id": self.key(account_id, slug)})

    async def get_revision(self, account_id: str, slug: str, revision_id: str) -> Dict[str, Any]:
        revision = await self.revisions.find_one({"_id": revision_id, "account_id": account_id, "site_slug": slug})
        if not revision:
            raise ThemeRevisionNotFound(revision_id)
        return revision

    async def list_revisions(self, account_id: str, slug: str, limit: int = 50) -> List[Dict[str, Any]]:
        cursor = self.revisions.find(
            {"account_id": account_id, "site_slug": slug},
            {"document": 0},
        ).sort("created_at", -1).limit(max(1, min(limit, 200)))
        return await cursor.to_list(length=None)

    async def published_document(self, account_id: str, slug: str) -> Optional[Dict[str, Any]]:
        state = await self.get_state(account_id, slug)
        if not state or not state.get("published_revision_id"):
            return None
        return (await self.get_revision(account_id, slug, state["published_revision_id"]))["document"]

    async def _create_revision(self, account_id: str, slug: str, document: Dict[str, Any], *, parent_id: Optional[str], author_id: str, reason: str) -> Dict[str, Any]:
        revision = {
            "_id": f"threv_{uuid.uuid4().hex}",
            "account_id": account_id,
            "site_slug": slug,
            "parent_revision_id": parent_id,
            "author_id": author_id,
            "reason": reason,
            "created_at": self.clock(),
            "fingerprint": document_fingerprint(document),
            "schema_version": document["schema_version"],
            "model_id": document["model_id"],
            "model_version": document["model_version"],
            "document": document,
        }
        await self.revisions.insert_one(revision)
        return revision

    async def _move_pointers(self, account_id: str, slug: str, expected_lock_version: int, updates: Dict[str, Any]) -> Dict[str, Any]:
        key = self.key(account_id, slug)
        now = self.clock()
        if expected_lock_version == 0:
            state = {
                "_id": key, "account_id": account_id, "site_slug": slug, "lock_version": 1,
                "draft_revision_id": None, "published_revision_id": None,
                "created_at": now, "updated_at": now, **updates,
            }
            try:
                await self.states.insert_one(state)
                return state
            except DuplicateKeyError:
                current = await self.get_state(account_id, slug)
                raise ThemeConflictError((current or {}).get("lock_version", 0))
        state = await self.states.find_one_and_update(
            {"_id": key, "lock_version": expected_lock_version},
            {"$set": {**updates, "updated_at": now}, "$inc": {"lock_version": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if not state:
            current = await self.get_state(account_id, slug)
            raise ThemeConflictError((current or {}).get("lock_version", 0))
        return state

    async def save_draft(self, account_id: str, slug: str, document: Any, *, author_id: str, expected_lock_version: int, reason: str = "draft") -> Dict[str, Any]:
        validated = validate_theme_document(document, self.contract)
        state = await self.get_state(account_id, slug)
        current_draft_id = (state or {}).get("draft_revision_id")
        if current_draft_id:
            current = await self.get_revision(account_id, slug, current_draft_id)
            if current["fingerprint"] == document_fingerprint(validated):
                # Double envoi du même contenu : aucune nouvelle révision.
                return state
        if (state or {}).get("lock_version", 0) != expected_lock_version:
            raise ThemeConflictError((state or {}).get("lock_version", 0))
        parent_id = current_draft_id or (state or {}).get("published_revision_id")
        revision = await self._create_revision(account_id, slug, validated, parent_id=parent_id, author_id=author_id, reason=reason)
        # En cas de conflit, la révision créée reste orpheline et n'est jamais publiée.
        return await self._move_pointers(account_id, slug, expected_lock_version, {"draft_revision_id": revision["_id"], "draft_updated_by": author_id})

    async def publish(self, account_id: str, slug: str, *, revision_id: str, author_id: str, expected_lock_version: int, clear_draft: bool = False) -> Dict[str, Any]:
        revision = await self.get_revision(account_id, slug, revision_id)
        # Le registre a pu évoluer depuis l'enregistrement : la révision est revalidée avant publication.
        validate_theme_document(revision["document"], self.contract)
        updates: Dict[str, Any] = {
            "published_revision_id": revision_id,
            "published_at": self.clock(),
            "published_by": author_id,
        }
        if clear_draft:
            # Le brouillon publié n'est plus un travail en attente.
            updates["draft_revision_id"] = None
        return await self._move_pointers(account_id, slug, expected_lock_version, updates)

    async def discard_draft(self, account_id: str, slug: str, *, expected_lock_version: int) -> Dict[str, Any]:
        """Abandonne le brouillon courant : la révision reste dans l'historique, seul le pointeur est retiré."""
        return await self._move_pointers(account_id, slug, expected_lock_version, {"draft_revision_id": None, "draft_updated_by": None})

    async def restore(self, account_id: str, slug: str, *, revision_id: str, author_id: str, expected_lock_version: int) -> Dict[str, Any]:
        source = await self.get_revision(account_id, slug, revision_id)
        document = validate_theme_document(source["document"], self.contract)
        state = await self.get_state(account_id, slug)
        if (state or {}).get("lock_version", 0) != expected_lock_version:
            raise ThemeConflictError((state or {}).get("lock_version", 0))
        parent_id = (state or {}).get("draft_revision_id") or (state or {}).get("published_revision_id")
        revision = await self._create_revision(account_id, slug, document, parent_id=parent_id, author_id=author_id, reason=f"restore:{revision_id}")
        return await self._move_pointers(account_id, slug, expected_lock_version, {"draft_revision_id": revision["_id"], "draft_updated_by": author_id})
