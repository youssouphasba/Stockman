"""Proposition de première configuration du site e-commerce.

L'état est conservé côté serveur, par compte commercial et par site, afin que
E-com, Paramètres et tous les appareils partagent la même décision. Une
réservation temporaire évite d'afficher la proposition simultanément sur deux
appareils ; quitter l'écran libère la réservation sans valoir refus.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, Optional

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


# Champs dont la présence prouve que le commerçant a déjà enregistré des réglages.
# Les champs posés automatiquement à la création du site (slug, activation à False,
# boutique liée par défaut) n'en font volontairement pas partie.
CONFIGURATION_FIELDS = (
    "ecommerce_configured_at", "ecommerce_site_name", "ecommerce_hero_title",
    "ecommerce_welcome_message", "ecommerce_brand_color", "ecommerce_contact_email",
    "ecommerce_contact_phone", "ecommerce_contact_address", "ecommerce_delivery_info",
    "ecommerce_whatsapp_phone", "ecommerce_payment_instructions", "ecommerce_logo_url",
    "ecommerce_custom_domain", "ecommerce_domain_requested_name",
    "ecommerce_show_out_of_stock_products",
)
LEASE_SECONDS = 180
DECISION_STATES = {"configure": "started", "later": "deferred"}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def can_offer_setup(*, is_org_admin: bool, is_demo: bool, can_write_data: bool, web_read_only: bool) -> bool:
    """La proposition n'est faite qu'à un administrateur opérationnel pouvant réellement
    modifier le site depuis le canal utilisé (Starter et Pro restent en consultation sur le web)."""
    return bool(is_org_admin and not is_demo and can_write_data and not web_read_only)


def has_existing_configuration(account: Dict[str, Any]) -> bool:
    """Un site activé ou des réglages déjà enregistrés suffisent à considérer le site établi.
    Un site simplement désactivé n'est pas, à lui seul, un site non configuré."""
    return account.get("ecommerce_enabled") is True or any(field in account for field in CONFIGURATION_FIELDS)


class EcommerceOnboarding:
    def __init__(self, db, clock: Callable[[], datetime] = utc_now):
        self.collection = db.ecommerce_site_onboarding
        self.orders = db.ecommerce_orders
        self.clock = clock

    @staticmethod
    def key(account_id: str, slug: str) -> str:
        return f"{account_id}:{slug}"

    @staticmethod
    def _lease_available(token: Optional[str], now: datetime) -> Dict[str, Any]:
        # Une réservation est disponible si elle appartient déjà à cet appareil (même expirée,
        # tant qu'aucun autre appareil ne l'a reprise) ou si personne ne la détient.
        options = [{"lease_until": {"$exists": False}}, {"lease_until": {"$lte": now}}]
        if token:
            options.insert(0, {"lease_id": token})
        return {"$or": options}

    async def initial_state(self, account: Dict[str, Any], slug: str) -> str:
        if has_existing_configuration(account):
            return "configured"
        order = await self.orders.find_one({"user_id": account["owner_user_id"], "site_slug": slug}, {"_id": 1})
        return "configured" if order else "pending"

    async def status(self, account: Dict[str, Any], slug: str) -> str:
        if await self.initial_state(account, slug) == "configured":
            return "configured"
        current = await self.collection.find_one({"_id": self.key(account["account_id"], slug)})
        return (current or {}).get("state") or "pending"

    async def claim(self, account: Dict[str, Any], slug: str, lease_id: Optional[str] = None) -> Dict[str, Any]:
        now = self.clock()
        key = self.key(account["account_id"], slug)
        if await self.initial_state(account, slug) == "configured":
            await self.configured(account["account_id"], slug)
            return {"state": "configured", "claim_id": None, "retry_after_seconds": LEASE_SECONDS}
        try:
            await self.collection.update_one({"_id": key}, {"$setOnInsert": {
                "account_id": account["account_id"], "site_slug": slug,
                "state": "pending", "created_at": now,
            }}, upsert=True)
        except DuplicateKeyError:
            pass
        token = lease_id or secrets.token_urlsafe(32)
        claimed = await self.collection.find_one_and_update(
            {"_id": key, "state": "pending", **self._lease_available(lease_id, now)},
            {"$set": {"lease_id": token, "lease_until": now + timedelta(seconds=LEASE_SECONDS)}},
            return_document=ReturnDocument.AFTER,
        )
        state = claimed["state"] if claimed else await self.status(account, slug)
        return {"state": state, "claim_id": token if claimed else None, "retry_after_seconds": LEASE_SECONDS}

    async def respond(self, account_id: str, slug: str, token: str, decision: str) -> Optional[str]:
        """Enregistre le choix explicite. Retourne l'état final, y compris lorsqu'un autre
        appareil a déjà traité la proposition, ou None si un autre appareil la détient encore."""
        state = DECISION_STATES.get(decision)
        if not state:
            raise ValueError("Invalid onboarding decision")
        now = self.clock()
        key = self.key(account_id, slug)
        updated = await self.collection.find_one_and_update(
            {"_id": key, "state": "pending", **self._lease_available(token, now)},
            {
                "$set": {"state": state, "decision": decision, "responded_at": now},
                "$unset": {"lease_id": "", "lease_until": ""},
            },
            return_document=ReturnDocument.AFTER,
        )
        if updated:
            return state
        current = await self.collection.find_one({"_id": key})
        if current and current.get("state") not in (None, "pending"):
            return current["state"]
        return None

    async def release(self, account_id: str, slug: str, token: str) -> None:
        await self.collection.update_one(
            {"_id": self.key(account_id, slug), "state": "pending", "lease_id": token},
            {"$unset": {"lease_id": "", "lease_until": ""}},
        )

    async def configured(self, account_id: str, slug: str) -> None:
        now = self.clock()
        await self.collection.update_one(
            {"_id": self.key(account_id, slug)},
            {
                "$set": {"state": "configured", "configured_at": now},
                "$setOnInsert": {"account_id": account_id, "site_slug": slug, "created_at": now},
                "$unset": {"lease_id": "", "lease_until": ""},
            },
            upsert=True,
        )
