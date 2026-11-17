"""Outils de pilotage de l'admin Stockman.

- Journal des actions admin : chaque modification faite depuis l'admin est tracée
  (qui, quoi, sur quel compte, quand, avec quel résultat).
- File « à traiter aujourd'hui » : la liste nominative des dossiers qui demandent
  une action, triés du plus urgent au moins urgent.
- Recherche globale : retrouver un compte, une boutique ou un ticket par nom,
  e-mail ou téléphone.
"""

import re
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

AUDIT_COLLECTION = "admin_audit_logs"

# Ces clés ne sont jamais copiées dans le journal, quelle que soit leur profondeur.
SENSITIVE_KEY_PARTS = ("password", "token", "secret", "otp", "pin", "api_key", "apikey", "credential")
MAX_STRING = 200
MAX_ITEMS = 20
MAX_DEPTH = 3

# Paramètres d'URL qui désignent l'objet visé, du plus précis au plus général.
TARGET_PARAMS = (
    ("user_id", "user"),
    ("account_id", "account"),
    ("store_id", "store"),
    ("ticket_id", "ticket"),
    ("dispute_id", "dispute"),
    ("product_id", "product"),
    ("catalog_id", "catalog"),
    ("platform", "platform"),
    ("name", "collection"),
)

# Libellés lisibles des actions, par méthode et chemin (sans le préfixe /api).
ACTION_LABELS: Dict[str, str] = {
    "PUT /admin/cgu": "Modification des CGU",
    "PUT /admin/privacy": "Modification de la politique de confidentialité",
    "POST /admin/generate-payment-link": "Création d'un lien de paiement",
    "POST /admin/subscriptions/{account_id}/payment-links": "Régénération des liens de paiement",
    "POST /admin/subscriptions/{account_id}/send-reminder": "Relance d'abonnement envoyée",
    "POST /admin/subscriptions/{account_id}/grace": "Délai de grâce accordé",
    "POST /admin/subscriptions/{account_id}/read-only": "Lecture seule modifiée",
    "POST /admin/users/{user_id}/trial-extension": "Mois gratuits offerts",
    "POST /admin/users/{user_id}/toggle": "Compte activé ou désactivé",
    "PUT /admin/users/{user_id}/feature-flags": "Fonctions du compte modifiées",
    "PUT /admin/users/{user_id}/custom-limits": "Limites du compte modifiées",
    "PUT /admin/users/{user_id}/modules": "Modules du compte modifiés",
    "POST /admin/users/{user_id}/note": "Note interne enregistrée",
    "PUT /admin/users/{user_id}/note": "Note interne enregistrée",
    "POST /admin/users/{user_id}/system-messages": "Message envoyé au compte",
    "POST /admin/users/{user_id}/onboarding-guide/relaunch": "Guide de démarrage relancé",
    "POST /admin/users/bulk-plan": "Forfait modifié en masse",
    "POST /admin/set-plan": "Forfait modifié",
    "POST /admin/set-plan-all": "Forfait modifié pour tout un rôle",
    "DELETE /admin/users": "Compte supprimé",
    "PUT /admin/users/{user_id}/admin-access": "Accès à l'admin modifié",
    "POST /admin/broadcast": "Annonce envoyée à tous",
    "POST /admin/messages/send": "Message envoyé",
    "POST /admin/app-updates/announce": "Mise à jour mobile annoncée",
    "DELETE /admin/app-updates/announce/{platform}": "Annonce de mise à jour retirée",
    "POST /admin/app-updates/notify": "Notification de mise à jour envoyée",
    "PUT /admin/modules": "Règles des modules modifiées",
    "POST /admin/support/tickets/{ticket_id}/reply": "Réponse à un ticket",
    "PUT /admin/support/tickets/{ticket_id}/close": "Ticket fermé",
    "POST /admin/support/tickets/{ticket_id}/close": "Ticket fermé",
    "POST /admin/support/tickets/{ticket_id}/assist": "Assistance à distance démarrée",
    "POST /admin/disputes/{dispute_id}/reply": "Réponse à un litige",
    "PUT /admin/disputes/{dispute_id}/status": "Statut d'un litige modifié",
    "POST /admin/products/{product_id}/toggle": "Produit activé ou désactivé",
    "PUT /admin/products/{product_id}/toggle": "Produit activé ou désactivé",
    "DELETE /admin/products/{product_id}": "Produit supprimé",
    "POST /admin/products/batch-action": "Action groupée sur des produits",
    "DELETE /admin/collections/{name}": "Collection vidée",
    "POST /admin/ai/health/check": "Contrôle de l'IA lancé",
}


def _is_sensitive(key: str) -> bool:
    lowered = str(key).lower()
    return any(part in lowered for part in SENSITIVE_KEY_PARTS)


def summarize_payload(value: Any, depth: int = 0) -> Any:
    """Copie réduite et sans secrets d'un corps de requête, pour le journal."""
    if depth >= MAX_DEPTH:
        return "…"
    if isinstance(value, dict):
        out: Dict[str, Any] = {}
        for index, (key, item) in enumerate(value.items()):
            if index >= MAX_ITEMS:
                out["…"] = f"{len(value) - MAX_ITEMS} champ(s) de plus"
                break
            out[str(key)] = "***" if _is_sensitive(key) else summarize_payload(item, depth + 1)
        return out
    if isinstance(value, list):
        items = [summarize_payload(item, depth + 1) for item in value[:MAX_ITEMS]]
        if len(value) > MAX_ITEMS:
            items.append(f"… {len(value) - MAX_ITEMS} élément(s) de plus")
        return items
    if isinstance(value, str):
        return value if len(value) <= MAX_STRING else value[:MAX_STRING] + "…"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:MAX_STRING]


def action_key(method: str, route_path: str) -> str:
    path = route_path[4:] if route_path.startswith("/api/") else route_path
    return f"{method.upper()} {path}"


def action_label(key: str) -> str:
    return ACTION_LABELS.get(key) or key


def detect_target(path_params: Dict[str, Any], payload: Any, query_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    params = {**(query_params or {}), **path_params}
    for param, target_type in TARGET_PARAMS:
        if param == "name" and param not in path_params:
            continue
        value = params.get(param)
        if value:
            return {"target_type": target_type, "target_id": str(value)}
    if isinstance(payload, dict):
        ids = payload.get("user_ids")
        if isinstance(ids, list) and ids:
            return {"target_type": "users", "target_id": None, "target_ids": [str(i) for i in ids[:200]]}
        if payload.get("user_id"):
            return {"target_type": "user", "target_id": str(payload["user_id"])}
    return {"target_type": None, "target_id": None}


async def resolve_target_user_ids(db, target: Dict[str, Any]) -> List[str]:
    """Compte(s) commerçant concerné(s), pour retrouver l'action depuis la fiche client."""
    target_type, target_id = target.get("target_type"), target.get("target_id")
    if target_type == "users":
        return list(target.get("target_ids") or [])
    if not target_id:
        return []
    if target_type == "user":
        return [target_id]
    if target_type == "account":
        account = await db.business_accounts.find_one({"account_id": target_id}, {"_id": 0, "owner_user_id": 1})
        owner = (account or {}).get("owner_user_id")
        return [owner] if owner else []
    if target_type == "store":
        store = await db.stores.find_one({"store_id": target_id}, {"_id": 0, "user_id": 1})
        return [store["user_id"]] if store and store.get("user_id") else []
    if target_type == "ticket":
        ticket = await db.support_tickets.find_one({"ticket_id": target_id}, {"_id": 0, "user_id": 1})
        return [ticket["user_id"]] if ticket and ticket.get("user_id") else []
    if target_type == "dispute":
        dispute = await db.disputes.find_one({"dispute_id": target_id}, {"_id": 0, "reporter_id": 1})
        return [dispute["reporter_id"]] if dispute and dispute.get("reporter_id") else []
    return []


async def record_admin_action(
    db,
    *,
    admin: Dict[str, Any],
    method: str,
    route_path: str,
    path_params: Dict[str, Any],
    query_params: Dict[str, Any],
    payload: Any,
    outcome: str,
    status_code: int,
    now: datetime,
) -> Dict[str, Any]:
    key = action_key(method, route_path)
    clean_payload = summarize_payload(payload) if payload is not None else None
    target = detect_target(path_params, payload, query_params)
    entry = {
        "log_id": f"aud_{now.strftime('%Y%m%d%H%M%S%f')}",
        "created_at": now,
        "admin_id": admin.get("user_id"),
        "admin_name": admin.get("name") or "",
        "admin_email": admin.get("email") or "",
        "method": method.upper(),
        "route": key.split(" ", 1)[1],
        "action": key,
        "path_params": {k: str(v) for k, v in path_params.items()},
        "query_params": summarize_payload(dict(query_params)) if query_params else {},
        "payload": clean_payload,
        "outcome": outcome,
        "status_code": status_code,
        "target_type": target.get("target_type"),
        "target_id": target.get("target_id"),
        "target_user_ids": await resolve_target_user_ids(db, target),
    }
    await getattr(db, AUDIT_COLLECTION).insert_one(dict(entry))
    return entry


async def list_admin_actions(
    db,
    *,
    target_user_id: Optional[str] = None,
    admin_id: Optional[str] = None,
    outcome: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}
    if target_user_id:
        query["target_user_ids"] = target_user_id
    if admin_id:
        query["admin_id"] = admin_id
    if outcome in {"success", "error"}:
        query["outcome"] = outcome
    limit = max(1, min(int(limit or 100), 300))
    rows = await getattr(db, AUDIT_COLLECTION).find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for row in rows:
        row["label"] = action_label(row.get("action") or "")
    return rows


# --------------------------------------------------------------------------- #
# File « à traiter aujourd'hui »
# --------------------------------------------------------------------------- #

PAYMENT_FAILURE_EVENTS = ["checkout_failed", "payment_failed", "payment_issue", "payment_unmatched"]
QUEUE_LIMIT = 8


def _aware(value: Any, tz) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=tz)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=tz)
    return None


def _person(user: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    user = user or {}
    return {
        "user_id": user.get("user_id"),
        "name": user.get("store_name") or user.get("name") or user.get("email") or "Compte sans nom",
        "email": user.get("email") or "",
    }


async def _users_by_id(db, user_ids: Iterable[str]) -> Dict[str, Dict[str, Any]]:
    ids = sorted({uid for uid in user_ids if uid})
    if not ids:
        return {}
    docs = await db.users.find(
        {"user_id": {"$in": ids}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "store_name": 1, "is_demo": 1, "demo_session_id": 1, "role": 1},
    ).to_list(len(ids))
    return {doc["user_id"]: doc for doc in docs}


def _is_excluded(user: Optional[Dict[str, Any]], excluded_ids: set) -> bool:
    if not user:
        return True
    return (
        user.get("user_id") in excluded_ids
        or bool(user.get("is_demo"))
        or bool(user.get("demo_session_id"))
        or user.get("role") in {"superadmin", "admin"}
    )


def _group(code: str, title: str, hint: str, section: str, severity: str, items: List[Dict[str, Any]], total: int) -> Dict[str, Any]:
    return {
        "code": code,
        "title": title,
        "hint": hint,
        "section": section,
        "severity": severity,
        "total": total,
        "items": items[:QUEUE_LIMIT],
    }


async def build_today_queue(db, now: datetime, excluded_user_ids: Iterable[str] = ()) -> Dict[str, Any]:
    tz = now.tzinfo
    excluded = set(excluded_user_ids)
    groups: List[Dict[str, Any]] = []

    # 1. Tickets support ouverts, du plus ancien au plus récent.
    tickets = await db.support_tickets.find(
        {"status": {"$in": ["open", "in_progress"]}},
        {"_id": 0, "ticket_id": 1, "user_id": 1, "user_name": 1, "user_email": 1, "subject": 1, "priority": 1, "status": 1, "created_at": 1, "updated_at": 1},
    ).sort("created_at", 1).to_list(200)
    ticket_items = []
    for ticket in tickets:
        if ticket.get("user_id") in excluded:
            continue
        created = _aware(ticket.get("created_at"), tz)
        age_days = max(0, (now - created).days) if created else None
        ticket_items.append({
            "user_id": ticket.get("user_id"),
            "name": ticket.get("user_name") or ticket.get("user_email") or "Client",
            "email": ticket.get("user_email") or "",
            "detail": ticket.get("subject") or "Sans objet",
            "meta": f"Ouvert depuis {age_days} jour(s)" if age_days is not None else "",
            "urgent": ticket.get("priority") in {"high", "urgent"} or (age_days or 0) >= 3,
            "ref": ticket.get("ticket_id"),
            "date": created,
        })
    ticket_items.sort(key=lambda item: (not item["urgent"],))
    groups.append(_group(
        "tickets", "Tickets support en attente", "Répondre aux plus anciens en premier.",
        "support", "critical" if any(i["urgent"] for i in ticket_items) else "warning",
        ticket_items, len(ticket_items),
    ))

    # 2. Échecs de paiement des 7 derniers jours.
    failures = await db.subscription_events.find(
        {"created_at": {"$gte": now - timedelta(days=7)}, "event_type": {"$in": PAYMENT_FAILURE_EVENTS}},
        {"_id": 0, "account_id": 1, "user_id": 1, "provider": 1, "event_type": 1, "created_at": 1, "message": 1},
    ).sort("created_at", -1).to_list(200)
    account_ids = sorted({f.get("account_id") for f in failures if f.get("account_id")})
    accounts = await db.business_accounts.find(
        {"account_id": {"$in": account_ids}}, {"_id": 0, "account_id": 1, "owner_user_id": 1}
    ).to_list(len(account_ids) or 1) if account_ids else []
    owner_by_account = {a["account_id"]: a.get("owner_user_id") for a in accounts}
    failure_owner_ids = [f.get("user_id") or owner_by_account.get(f.get("account_id")) for f in failures]
    users = await _users_by_id(db, failure_owner_ids)
    seen, failure_items = set(), []
    for failure, owner_id in zip(failures, failure_owner_ids):
        user = users.get(owner_id)
        if _is_excluded(user, excluded) or owner_id in seen:
            continue
        seen.add(owner_id)
        provider = str(failure.get("provider") or "paiement").capitalize()
        failure_items.append({
            **_person(user),
            "detail": f"Échec {provider}",
            "meta": failure.get("message") or failure.get("event_type") or "",
            "urgent": True,
            "ref": failure.get("account_id"),
            "date": _aware(failure.get("created_at"), tz),
        })
    groups.append(_group(
        "payment_failures", "Paiements en échec (7 jours)", "Contacter le client avant la coupure.",
        "subscriptions", "critical", failure_items, len(failure_items),
    ))

    # 3. Abonnements payants qui se terminent dans les 7 jours.
    expiring = await db.business_accounts.find(
        {"subscription_end": {"$gte": now, "$lte": now + timedelta(days=7)}, "subscription_status": "active"},
        {"_id": 0, "account_id": 1, "owner_user_id": 1, "plan": 1, "subscription_end": 1, "subscription_provider": 1},
    ).sort("subscription_end", 1).to_list(200)
    users = await _users_by_id(db, [a.get("owner_user_id") for a in expiring])
    expiring_items = []
    for account in expiring:
        user = users.get(account.get("owner_user_id"))
        if _is_excluded(user, excluded):
            continue
        end = _aware(account.get("subscription_end"), tz)
        days_left = max(0, (end - now).days) if end else None
        expiring_items.append({
            **_person(user),
            "detail": f"Forfait {str(account.get('plan') or '').capitalize()}".strip(),
            "meta": f"Se termine dans {days_left} jour(s)" if days_left is not None else "",
            "urgent": days_left is not None and days_left <= 2,
            "ref": account.get("account_id"),
            "date": end,
        })
    groups.append(_group(
        "expiring", "Abonnements qui se terminent sous 7 jours", "Vérifier le renouvellement ou relancer.",
        "subscriptions", "warning", expiring_items, len(expiring_items),
    ))

    # 4. Essais qui se terminent dans les 3 jours.
    trials = await db.business_accounts.find(
        {"trial_ends_at": {"$gte": now, "$lte": now + timedelta(days=3)}, "subscription_provider": {"$in": ["none", None, ""]}},
        {"_id": 0, "account_id": 1, "owner_user_id": 1, "plan": 1, "trial_ends_at": 1},
    ).sort("trial_ends_at", 1).to_list(200)
    users = await _users_by_id(db, [a.get("owner_user_id") for a in trials])
    trial_items = []
    for account in trials:
        user = users.get(account.get("owner_user_id"))
        if _is_excluded(user, excluded):
            continue
        end = _aware(account.get("trial_ends_at"), tz)
        trial_items.append({
            **_person(user),
            "detail": f"Essai {str(account.get('plan') or '').capitalize()}".strip(),
            "meta": f"Se termine le {end.strftime('%d/%m')}" if end else "",
            "urgent": False,
            "ref": account.get("account_id"),
            "date": end,
        })
    groups.append(_group(
        "trials", "Essais qui se terminent sous 3 jours", "Proposer l'abonnement adapté.",
        "subscriptions", "info", trial_items, len(trial_items),
    ))

    # 5. Litiges ouverts.
    disputes = await db.disputes.find(
        {"status": {"$in": ["open", "investigating"]}},
        {"_id": 0, "dispute_id": 1, "reporter_id": 1, "reporter_name": 1, "reporter_email": 1, "subject": 1, "status": 1, "created_at": 1},
    ).sort("created_at", 1).to_list(200)
    dispute_items = [{
        "user_id": d.get("reporter_id"),
        "name": d.get("reporter_name") or d.get("reporter_email") or "Client",
        "email": d.get("reporter_email") or "",
        "detail": d.get("subject") or "Litige",
        "meta": "En cours d'examen" if d.get("status") == "investigating" else "Ouvert",
        "urgent": d.get("status") == "open",
        "ref": d.get("dispute_id"),
        "date": _aware(d.get("created_at"), tz),
    } for d in disputes]
    groups.append(_group(
        "disputes", "Litiges ouverts", "Trancher ou demander des précisions.",
        "disputes", "warning", dispute_items, len(dispute_items),
    ))

    # 6. Comptes payants sans connexion depuis 14 jours (risque de départ).
    paying = await db.business_accounts.find(
        {"subscription_status": "active", "subscription_provider": {"$nin": ["none", None, ""]}},
        {"_id": 0, "account_id": 1, "owner_user_id": 1, "plan": 1},
    ).to_list(2000)
    owners = await db.users.find(
        {"user_id": {"$in": [a.get("owner_user_id") for a in paying if a.get("owner_user_id")]}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "store_name": 1, "last_login": 1, "last_login_at": 1, "is_demo": 1, "demo_session_id": 1, "role": 1},
    ).to_list(2000) if paying else []
    owners_by_id = {o["user_id"]: o for o in owners}
    inactive_items = []
    for account in paying:
        user = owners_by_id.get(account.get("owner_user_id"))
        if _is_excluded(user, excluded):
            continue
        last = _aware(user.get("last_login_at") or user.get("last_login"), tz)
        if last and (now - last).days < 14:
            continue
        inactive_items.append({
            **_person(user),
            "detail": f"Forfait {str(account.get('plan') or '').capitalize()}".strip(),
            "meta": f"Dernière connexion il y a {(now - last).days} jours" if last else "Aucune connexion enregistrée",
            "urgent": False,
            "ref": account.get("account_id"),
            "date": last,
        })
    inactive_items.sort(key=lambda item: item["date"] or datetime.min.replace(tzinfo=tz))
    groups.append(_group(
        "inactive_paying", "Clients payants inactifs depuis 14 jours", "Appeler pour éviter un désabonnement.",
        "users", "info", inactive_items, len(inactive_items),
    ))

    for group in groups:
        for item in group["items"]:
            if isinstance(item.get("date"), datetime):
                item["date"] = item["date"].isoformat()
    total = sum(group["total"] for group in groups)
    urgent = sum(1 for group in groups for item in group["items"] if item.get("urgent"))
    return {"generated_at": now.isoformat(), "total": total, "urgent": urgent, "groups": groups}


# --------------------------------------------------------------------------- #
# Recherche globale
# --------------------------------------------------------------------------- #

SEARCH_LIMIT = 8


def _search_regex(term: str) -> Dict[str, str]:
    return {"$regex": re.escape(term), "$options": "i"}


async def global_search(db, term: str, excluded_user_ids: Iterable[str] = ()) -> Dict[str, Any]:
    term = (term or "").strip()
    if len(term) < 2:
        return {"query": term, "users": [], "stores": [], "tickets": []}
    excluded = set(excluded_user_ids)
    rx = _search_regex(term)
    digits = re.sub(r"\D", "", term)

    user_or: List[Dict[str, Any]] = [{"name": rx}, {"email": rx}, {"store_name": rx}, {"user_id": term}]
    if len(digits) >= 4:
        # Les numéros sont saisis avec ou sans espaces, tirets ou indicatif.
        user_or.append({"phone": {"$regex": r"\D*".join(digits)}})
    users = await db.users.find(
        {"$or": user_or},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "phone": 1, "role": 1, "plan": 1, "store_name": 1, "is_demo": 1, "demo_session_id": 1, "parent_user_id": 1},
    ).limit(40).to_list(40)
    user_rows = []
    for user in users:
        if user.get("user_id") in excluded or user.get("is_demo") or user.get("demo_session_id"):
            continue
        user_rows.append({
            "user_id": user.get("user_id"),
            "name": user.get("name") or user.get("email") or user.get("user_id"),
            "email": user.get("email") or "",
            "phone": user.get("phone") or "",
            "role": user.get("role") or "",
            "plan": user.get("plan") or "",
            "owner_user_id": user.get("parent_user_id") or user.get("user_id"),
        })
        if len(user_rows) >= SEARCH_LIMIT:
            break

    stores = await db.stores.find(
        {"$or": [{"name": rx}, {"store_id": term}]},
        {"_id": 0, "store_id": 1, "name": 1, "user_id": 1, "address": 1},
    ).limit(SEARCH_LIMIT).to_list(SEARCH_LIMIT)
    store_rows = [s for s in stores if s.get("user_id") not in excluded]

    tickets = await db.support_tickets.find(
        {"$or": [{"subject": rx}, {"user_name": rx}, {"user_email": rx}, {"ticket_id": term}]},
        {"_id": 0, "ticket_id": 1, "subject": 1, "user_id": 1, "user_name": 1, "status": 1, "created_at": 1},
    ).sort("created_at", -1).limit(SEARCH_LIMIT).to_list(SEARCH_LIMIT)
    for ticket in tickets:
        if isinstance(ticket.get("created_at"), datetime):
            ticket["created_at"] = ticket["created_at"].isoformat()

    return {"query": term, "users": user_rows, "stores": store_rows, "tickets": tickets}
