"""Paiement des commandes en ligne.

Le client paie le commerçant, une seule fois, le total de sa commande (articles et livraison).
Stockman ne reçoit et ne détient jamais cet argent : il affiche le compte Wave ou Orange Money
du commerçant, puis suit l'état du paiement.

    awaiting  -> le client n'a pas encore payé
    declared  -> le client dit avoir payé ; le commerçant vérifie sur son compte
    paid      -> le commerçant a confirmé avoir reçu le paiement

Seul le passage à « paid » dépend de la source de confirmation : aujourd'hui le geste
« Paiement reçu » du commerçant, plus tard une confirmation automatique de l'opérateur. Le reste du
parcours (commande, réservation du transport, « Prête ») ne change pas.
"""

import hashlib
import hmac
import re
import secrets
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Mapping, Optional
from urllib.parse import urlsplit

from pymongo import ReturnDocument

WAVE = "wave"
ORANGE_MONEY = "orange_money"
ON_DELIVERY = "on_delivery"
OTHER = "other"  # commande passée sans choix de paiement (boutique sans compte mobile, ancienne commande)

# Comptes de paiement mobile qu'un commerçant peut afficher, dans l'ordre proposé au client.
WALLETS: Dict[str, str] = {WAVE: "Wave", ORANGE_MONEY: "Orange Money"}

AWAITING = "awaiting"
DECLARED = "declared"
PAID = "paid"

CLOSED_WITHOUT_SALE = ("cancelled", "rejected")


class PaymentError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def wallet_phone(value: Optional[str]) -> Optional[str]:
    """Numéro du compte de paiement mobile au format international, sinon None."""
    raw = (value or "").strip()
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if raw.startswith("+"):
        number = digits
    elif digits.startswith("00"):
        number = digits[2:]
    elif len(digits) == 9 and digits.startswith("7"):
        number = "221" + digits
    else:
        number = digits
    if number.startswith("221"):
        return "+" + number if len(number) == 12 and number[3] == "7" else None
    # Autres pays : numéro international complet, saisi avec son indicatif.
    if (raw.startswith("+") or digits.startswith("00")) and 10 <= len(number) <= 15:
        return "+" + number
    return None


def wave_link(value: Optional[str]) -> Optional[str]:
    """Lien de paiement Wave du commerçant : uniquement une adresse https du domaine wave.com."""
    raw = (value or "").strip()
    if not raw:
        return None
    parts = urlsplit(raw)
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or parts.username or parts.password or not (host == "wave.com" or host.endswith(".wave.com")):
        raise PaymentError(422, "wave_link_invalid", "Le lien de paiement doit être un lien Wave, qui commence par https:// et se termine par wave.com.")
    if len(raw) > 300:
        raise PaymentError(422, "wave_link_invalid", "Ce lien de paiement Wave est trop long.")
    return raw


def mobile_money_offered(account: Mapping[str, Any]) -> bool:
    """Wave et Orange Money sont proposés aux commerces du Sénégal, en XOF. Ailleurs, la boutique en
    ligne fonctionne sans eux : le client lit les consignes de paiement écrites par le commerçant.
    Un compte sans pays ni devise est un compte sénégalais d'origine."""
    return str(account.get("country_code") or "SN").upper() == "SN" and str(account.get("currency") or "XOF").upper() == "XOF"


# Moyen de paiement de la vente enregistrée à la livraison, selon celui de la commande en ligne.
SALE_METHODS: Dict[str, str] = {WAVE: "mobile_money", ORANGE_MONEY: "mobile_money", ON_DELIVERY: "cash", OTHER: "cash"}


def sale_payment_method(order: Mapping[str, Any]) -> str:
    payment = order.get("payment") if isinstance(order.get("payment"), dict) else {}
    return SALE_METHODS.get(str(payment.get("method") or ""), str(order.get("payment_method") or "cash"))


def settled(order: Mapping[str, Any]) -> bool:
    """Le commerçant a confirmé le paiement. Une commande d'avant le suivi du paiement n'a pas d'état :
    sa validation valait confirmation."""
    payment = order.get("payment")
    return not isinstance(payment, dict) or payment.get("status") == PAID


def wallet_label(method: Optional[str]) -> Optional[str]:
    return WALLETS.get(method or "")


def settings_updates(data: Mapping[str, Any], account: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
    """Champs du compte à enregistrer à partir du réglage « Paiement » ; seuls les champs fournis changent."""
    updates: Dict[str, Any] = {}
    if account is not None and not mobile_money_offered(account) and any(str(data.get(f"{wallet}_phone") or "").strip() for wallet in WALLETS):
        raise PaymentError(422, "mobile_money_unavailable", "Wave et Orange Money sont proposés aux boutiques du Sénégal. Écrivez vos consignes de paiement dans le champ prévu.")
    for wallet, label in WALLETS.items():
        if data.get(f"{wallet}_phone") is not None:
            raw = str(data[f"{wallet}_phone"]).strip()
            phone = wallet_phone(raw)
            if raw and not phone:
                raise PaymentError(422, "wallet_phone_invalid", f"Ce numéro {label} n'est pas reconnu. Saisissez-le comme dans {label}, par exemple 77 123 45 67.")
            updates[f"ecommerce_{wallet}_phone"] = phone
        if data.get(f"{wallet}_name") is not None:
            updates[f"ecommerce_{wallet}_name"] = str(data[f"{wallet}_name"]).strip()[:80] or None
    if data.get("wave_link") is not None:
        updates["ecommerce_wave_link"] = wave_link(str(data["wave_link"]))
    if data.get("pay_on_delivery") is not None:
        updates["ecommerce_pay_on_delivery"] = bool(data["pay_on_delivery"])
    return updates


SETTINGS_FIELDS = frozenset({*(f"{wallet}_{part}" for wallet in WALLETS for part in ("phone", "name")), "wave_link", "pay_on_delivery"})


def settings_view(account: Mapping[str, Any]) -> Dict[str, Any]:
    """Réglage tel que le commerçant le voit et le modifie."""
    view: Dict[str, Any] = {}
    for wallet in WALLETS:
        view[f"{wallet}_phone"] = account.get(f"ecommerce_{wallet}_phone")
        view[f"{wallet}_name"] = account.get(f"ecommerce_{wallet}_name")
    view["wave_link"] = account.get("ecommerce_wave_link")
    view["pay_on_delivery"] = account.get("ecommerce_pay_on_delivery") is not False
    # Faux : l'écran de réglage ne montre pas les comptes Wave et Orange Money.
    view["mobile_money_available"] = mobile_money_offered(account)
    return view


def public_options(account: Mapping[str, Any], *, denkma_delivery: bool = False) -> Optional[Dict[str, Any]]:
    """Moyens de paiement proposés au client. None : la boutique n'a aucun compte de paiement mobile,
    le client ne choisit rien et lit seulement les consignes écrites par le commerçant.

    denkma_delivery=True (commande livrée par Denkma) retire le paiement à la livraison : le livreur
    Denkma n'encaisse jamais pour la boutique, le colis se paie donc avant son départ."""
    if not mobile_money_offered(account):
        return None
    wallets = [
        {
            "id": wallet,
            "label": label,
            "phone": account[f"ecommerce_{wallet}_phone"],
            "name": account.get(f"ecommerce_{wallet}_name"),
            "link": account.get("ecommerce_wave_link") if wallet == WAVE else None,
        }
        for wallet, label in WALLETS.items()
        if account.get(f"ecommerce_{wallet}_phone")
    ]
    if not wallets:
        return None
    on_delivery = account.get("ecommerce_pay_on_delivery") is not False
    return {"wallets": wallets, "on_delivery": on_delivery and not denkma_delivery}


def wallet_account(account: Mapping[str, Any], method: Optional[str]) -> Optional[Dict[str, Any]]:
    """Compte du commerçant pour ce moyen de paiement, s'il est proposé."""
    return next((wallet for wallet in (public_options(account) or {}).get("wallets", []) if wallet["id"] == method), None)


def choose_method(account: Mapping[str, Any], requested: Optional[str], *, denkma_delivery: bool = False) -> str:
    options = public_options(account, denkma_delivery=denkma_delivery)
    if not options:
        return OTHER
    offered = [wallet["id"] for wallet in options["wallets"]]
    if requested in offered:
        return str(requested)
    if requested in (ON_DELIVERY, None) and options["on_delivery"]:
        return ON_DELIVERY
    if requested is None:
        return offered[0]
    if requested == ON_DELIVERY and denkma_delivery:
        raise PaymentError(422, "payment_method_unavailable", "Une commande livrée par Denkma se paie avant son départ : le livreur n'encaisse pas pour la boutique. Choisissez un autre mode de paiement.")
    raise PaymentError(422, "payment_method_unavailable", "Cette boutique ne propose pas ce mode de paiement. Rechargez la page, puis choisissez un autre mode.")


def new_payment(method: str) -> Dict[str, Any]:
    """Paiement d'une nouvelle commande et jeton remis au seul client, pour qu'il suive ce paiement."""
    token = secrets.token_urlsafe(24)
    return {"payment": {"method": method, "status": AWAITING, "token_hash": _hash(token)}, "token": token}


def merchant_view(order: Mapping[str, Any]) -> Dict[str, Any]:
    """Commande telle que le commerçant la reçoit : sans le condensat du jeton du client."""
    payment = order.get("payment")
    if not isinstance(payment, dict) or "token_hash" not in payment:
        return dict(order)
    return {**order, "payment": {key: value for key, value in payment.items() if key != "token_hash"}}


def public_state(order: Mapping[str, Any]) -> Dict[str, Any]:
    """Ce que le client voit de sa commande sur la page de paiement."""
    payment = order.get("payment") or {}
    return {
        "order_number": order.get("order_number"),
        "order_status": order.get("status"),
        "amount_due": order.get("amount_due") if order.get("amount_due") is not None else order.get("total_amount"),
        "currency": order.get("currency") or "XOF",
        "method": payment.get("method") or OTHER,
        "status": payment.get("status") or AWAITING,
    }


class EcommercePaymentService:
    def __init__(self, database: Any, *, clock: Callable[[], datetime] = _now):
        self.orders = database.ecommerce_orders
        self.clock = clock

    async def _customer_order(self, slug: str, order_id: str, token: str) -> Dict[str, Any]:
        order = await self.orders.find_one({"order_id": order_id, "site_slug": slug}, {"_id": 0})
        expected = ((order or {}).get("payment") or {}).get("token_hash")
        # Même réponse pour une commande inconnue et un mauvais jeton : rien ne se devine.
        if not order or not expected or not hmac.compare_digest(str(expected), _hash(token or "")):
            raise PaymentError(404, "order_not_found", "Commande introuvable.")
        return order

    async def state(self, slug: str, order_id: str, token: str) -> Dict[str, Any]:
        return public_state(await self._customer_order(slug, order_id, token))

    async def declare(self, slug: str, order_id: str, token: str) -> Dict[str, Any]:
        """Le client dit avoir payé. Renvoie l'état public et « changed » : vrai une seule fois,
        pour prévenir le commerçant une seule fois même si le client insiste."""
        order = await self._customer_order(slug, order_id, token)
        if order.get("status") in CLOSED_WITHOUT_SALE:
            raise PaymentError(409, "order_closed", "Cette commande a été annulée. Contactez la boutique avant de payer.")
        updated = await self.orders.find_one_and_update(
            {"order_id": order_id, "site_slug": slug, "payment.status": AWAITING, "status": {"$nin": list(CLOSED_WITHOUT_SALE)}},
            {"$set": {"payment.status": DECLARED, "payment.declared_at": self.clock(), "updated_at": self.clock()}},
            projection={"_id": 0},
            return_document=ReturnDocument.AFTER,
        )
        if updated:
            return {"state": public_state(updated), "changed": True, "order": updated}
        fresh = await self.orders.find_one({"order_id": order_id, "site_slug": slug}, {"_id": 0}) or order
        return {"state": public_state(fresh), "changed": False, "order": fresh}

    async def mark(self, order: Mapping[str, Any], *, paid: bool, actor_id: str) -> Dict[str, Any]:
        """Le commerçant confirme avoir reçu le paiement, ou corrige une confirmation faite par erreur.
        Renvoie la commande à jour et « changed » (faux si elle était déjà dans cet état)."""
        status = order.get("status")
        if status in CLOSED_WITHOUT_SALE:
            raise PaymentError(409, "order_closed", "Cette commande est annulée : son paiement ne peut plus être modifié.")
        if not paid and status == "delivered":
            raise PaymentError(409, "order_closed", "Cette commande est livrée : son paiement ne peut plus être modifié.")
        current = dict(order.get("payment") or {})
        was_paid = current.get("status") == PAID
        if paid == was_paid:
            return {"order": dict(order), "changed": False}
        now = self.clock()
        changes: Dict[str, Any] = {"updated_at": now}
        if "method" not in current:
            changes["payment.method"] = OTHER
        if paid:
            changes.update({"payment.status": PAID, "payment.paid_at": now, "payment.paid_by": actor_id, "payment.confirmed_by": "merchant"})
            unset: Dict[str, Any] = {}
        else:
            # Retour à l'état précédent : le client garde sa déclaration s'il en avait fait une.
            changes["payment.status"] = DECLARED if current.get("declared_at") else AWAITING
            unset = {"payment.paid_at": "", "payment.paid_by": "", "payment.confirmed_by": ""}
        query: Dict[str, Any] = {"order_id": order["order_id"], "user_id": order.get("user_id"), "status": {"$nin": list(CLOSED_WITHOUT_SALE)}}
        query["payment.status"] = PAID if was_paid else {"$ne": PAID}
        update: Dict[str, Any] = {"$set": changes}
        if unset:
            update["$unset"] = unset
        updated = await self.orders.find_one_and_update(query, update, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
        if updated:
            return {"order": updated, "changed": True}
        fresh = await self.orders.find_one({"order_id": order["order_id"], "user_id": order.get("user_id")}, {"_id": 0}) or dict(order)
        return {"order": fresh, "changed": False}
