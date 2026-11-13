"""Registre inaltérable des ventes (commerces, hors restauration).

Chaque vente terminée et chaque annulation y est inscrite une seule fois, avec :
- un numéro continu par compte (un trou dans la série se voit) ;
- une copie figée des données de la vente (articles, montants, TVA, règlements) ;
- une empreinte SHA-256 calculée avec celle de l'inscription précédente (chaînage) ;
- une signature HMAC si ``FISCAL_LEDGER_SECRET`` est défini : sans ce secret, une
  modification faite directement en base ne peut pas être maquillée ;
- le total cumulé depuis l'origine.

Une vente n'est jamais corrigée : son annulation est une nouvelle inscription, en négatif.
Les clôtures (jour, mois, année) figent les totaux de chaque période et sont chaînées entre
elles ; les archives exportent une période close avec sa propre empreinte.

Le registre ne contient aucune donnée personnelle de client. Il est conservé quand le compte
est supprimé (voir ``mark_retention``).
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

try:  # Les fuseaux servent à dater les clôtures à l'heure du commerce.
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

logger = logging.getLogger(__name__)

LEDGER_VERSION = 1
RETENTION_YEARS = 6
ENTRY_SALE = "sale"
ENTRY_CANCELLATION = "cancellation"
PERIOD_TYPES = ("day", "month", "year")
COUNTRY_TIMEZONES = {
    "FR": "Europe/Paris", "BE": "Europe/Brussels", "CH": "Europe/Zurich", "LU": "Europe/Luxembourg",
    "SN": "Africa/Dakar", "CI": "Africa/Abidjan", "ML": "Africa/Bamako", "BF": "Africa/Ouagadougou",
    "GN": "Africa/Conakry", "TG": "Africa/Lome", "BJ": "Africa/Porto-Novo", "NE": "Africa/Niamey",
    "CM": "Africa/Douala", "GA": "Africa/Libreville", "CG": "Africa/Brazzaville", "CD": "Africa/Kinshasa",
    "MA": "Africa/Casablanca", "TN": "Africa/Tunis", "DZ": "Africa/Algiers",
}
# Champs couverts par l'empreinte d'une inscription : tout sauf l'empreinte et la signature.
_UNSIGNED_FIELDS = {"_id", "hash", "signature"}


def _secret() -> Optional[bytes]:
    value = (os.environ.get("FISCAL_LEDGER_SECRET") or "").strip()
    return value.encode("utf-8") if value else None


def is_signed() -> bool:
    return _secret() is not None


def timezone_for_country(country_code: Optional[str]) -> str:
    return COUNTRY_TIMEZONES.get((country_code or "").upper(), "UTC")


def _zone(name: Optional[str]):
    if ZoneInfo is None or not name or name == "UTC":
        return timezone.utc
    try:
        return ZoneInfo(name)
    except Exception:  # données de fuseaux absentes du serveur
        return timezone.utc


def _as_utc(value: Any) -> datetime:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            value = None
    if not isinstance(value, datetime):
        value = datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso(value: Any) -> str:
    # MongoDB ne garde que les millisecondes : on s'y tient pour que l'empreinte reste stable.
    return _as_utc(value).isoformat(timespec="milliseconds")


def _money(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _canonical(payload: Dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str).encode("utf-8")


def _seal(document: Dict[str, Any]) -> Dict[str, Any]:
    """Ajoute l'empreinte (et la signature) calculées sur tout le contenu du document."""
    content = _canonical({key: value for key, value in document.items() if key not in _UNSIGNED_FIELDS})
    document["hash"] = hashlib.sha256(content).hexdigest()
    secret = _secret()
    document["signature"] = hmac.new(secret, content, hashlib.sha256).hexdigest() if secret else None
    return document


def _seal_problem(document: Dict[str, Any]) -> Optional[str]:
    content = _canonical({key: value for key, value in document.items() if key not in _UNSIGNED_FIELDS})
    if hashlib.sha256(content).hexdigest() != document.get("hash"):
        return "empreinte invalide : le contenu a été modifié"
    secret = _secret()
    if secret and document.get("signature"):
        expected = hmac.new(secret, content, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, document["signature"]):
            return "signature invalide : le contenu a été modifié"
    elif secret and not document.get("signature"):
        return "signature absente"
    return None


def _sale_snapshot(sale: Dict[str, Any]) -> Dict[str, Any]:
    """Copie figée des données de la vente, sans donnée personnelle de client."""
    items = []
    for item in sale.get("items") or []:
        items.append({
            "product_id": item.get("product_id"),
            "name": item.get("product_name"),
            "quantity": item.get("quantity"),
            "unit_price": _money(item.get("selling_price")),
            "discount": _money(item.get("discount_amount")),
            "total": _money(item.get("total")),
            "tax_rate": _money(item.get("tax_rate")),
            "tax_amount": _money(item.get("tax_amount")),
        })
    payments = [
        {"method": payment.get("method"), "amount": _money(payment.get("amount"))}
        for payment in (sale.get("payments") or [])
        if isinstance(payment, dict)
    ]
    return {
        "store_id": sale.get("store_id"),
        "terminal_id": sale.get("terminal_id"),
        "source": sale.get("source") or "physical",
        "created_at": _iso(sale.get("created_at")),
        "total_ttc": _money(sale.get("total_amount")),
        "subtotal_ht": _money(sale.get("subtotal_ht")),
        "tax_total": _money(sale.get("tax_total")),
        "tax_mode": sale.get("tax_mode") or "ttc",
        "discount_amount": _money(sale.get("discount_amount")),
        "payment_method": sale.get("payment_method"),
        "payments": payments,
        "items": items,
    }


async def ensure_indexes(db) -> None:
    await db.fiscal_ledger.create_index([("owner_id", 1), ("seq", 1)], unique=True)
    await db.fiscal_ledger.create_index([("owner_id", 1), ("sale_id", 1), ("type", 1)], unique=True)
    await db.fiscal_ledger.create_index([("owner_id", 1), ("day", 1)])
    await db.fiscal_counters.create_index([("owner_id", 1)], unique=True)
    await db.fiscal_closures.create_index([("owner_id", 1), ("period_type", 1), ("period_key", 1)], unique=True)
    await db.fiscal_archives.create_index([("owner_id", 1), ("period_type", 1), ("period_key", 1)], unique=True)
    await db.fiscal_retention.create_index([("owner_id", 1)], unique=True)


async def _counter(db, owner_id: str, timezone_name: Optional[str]) -> Dict[str, Any]:
    await db.fiscal_counters.update_one(
        {"owner_id": owner_id},
        {"$setOnInsert": {
            "seq": 0,
            "timezone": timezone_name or "UTC",
            "version": LEDGER_VERSION,
            "started_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return await db.fiscal_counters.find_one({"owner_id": owner_id})


async def _previous_entry(db, owner_id: str, seq: int) -> Optional[Dict[str, Any]]:
    """Inscription précédente ; attend un court instant si elle est en cours d'écriture."""
    if seq <= 1:
        return None
    for _ in range(40):
        entry = await db.fiscal_ledger.find_one({"owner_id": owner_id, "seq": seq - 1})
        if entry:
            return entry
        await asyncio.sleep(0.05)
    return None


async def _append(
    db,
    owner_id: str,
    entry_type: str,
    sale: Dict[str, Any],
    *,
    occurred_at: Any,
    timezone_name: Optional[str],
    actor_id: Optional[str] = None,
    reason: Optional[str] = None,
    training: bool = False,
    backfilled: bool = False,
) -> Optional[Dict[str, Any]]:
    sale_id = sale.get("sale_id")
    if not sale_id:
        return None
    existing = await db.fiscal_ledger.find_one({"owner_id": owner_id, "sale_id": sale_id, "type": entry_type})
    if existing:
        return existing  # une vente n'est inscrite qu'une fois

    counter = await _counter(db, owner_id, timezone_name)
    zone_name = counter.get("timezone") or "UTC"
    updated = await db.fiscal_counters.find_one_and_update(
        {"owner_id": owner_id}, {"$inc": {"seq": 1}}, return_document=True,
    )
    seq = int(updated["seq"])
    previous = await _previous_entry(db, owner_id, seq)

    snapshot = _sale_snapshot(sale)
    sign = -1 if entry_type == ENTRY_CANCELLATION else 1
    amount = 0.0 if training else round(sign * snapshot["total_ttc"], 2)
    moment = _as_utc(occurred_at)
    entry = {
        "version": LEDGER_VERSION,
        "owner_id": owner_id,
        "seq": seq,
        "type": entry_type,
        "sale_id": sale_id,
        "occurred_at": _iso(moment),
        "recorded_at": _iso(datetime.now(timezone.utc)),
        "day": moment.astimezone(_zone(zone_name)).strftime("%Y-%m-%d"),
        "timezone": zone_name,
        "actor_id": actor_id,
        "reason": reason,
        # Vente d'entraînement (guide de démarrage) : inscrite, mais hors des totaux.
        "training": bool(training),
        # Reprise de l'historique : l'intégrité n'est garantie qu'à partir de l'inscription.
        "backfilled": bool(backfilled),
        "amount": amount,
        "cumulative_total": round(_money((previous or {}).get("cumulative_total")) + amount, 2),
        "sale": snapshot,
        "prev_hash": (previous or {}).get("hash"),
        # Vrai seulement si l'inscription précédente n'a pas pu être lue (signalé à la vérification).
        "chain_gap": seq > 1 and previous is None,
    }
    _seal(entry)
    await db.fiscal_ledger.insert_one(dict(entry))
    return entry


async def _backfill(db, owner_id: str, timezone_name: Optional[str], skip_sale_id: Optional[str] = None) -> int:
    """Première utilisation : inscrit les ventes déjà présentes, dans l'ordre chronologique."""
    sales = await db.sales.find(
        {"user_id": owner_id, "status": {"$in": ["completed", "cancelled"]}}, {"_id": 0},
    ).to_list(None)
    events = []
    for sale in sales:
        if skip_sale_id and sale.get("sale_id") == skip_sale_id:
            continue  # la vente en cours est inscrite juste après, à sa place
        events.append((_as_utc(sale.get("created_at")), 0, ENTRY_SALE, sale))
        if sale.get("status") == "cancelled":
            events.append((_as_utc(sale.get("cancelled_at") or sale.get("created_at")), 1, ENTRY_CANCELLATION, sale))
    events.sort(key=lambda event: (event[0], event[1]))
    for moment, _order, entry_type, sale in events:
        await _append(
            db, owner_id, entry_type, sale,
            occurred_at=moment, timezone_name=timezone_name,
            actor_id=sale.get("cancelled_by_user_id") if entry_type == ENTRY_CANCELLATION else None,
            reason=sale.get("cancellation_reason") if entry_type == ENTRY_CANCELLATION else None,
            backfilled=True,
        )
    return len(events)


async def _prepare(db, owner_id: str, timezone_name: Optional[str], skip_sale_id: Optional[str] = None) -> None:
    """Crée le registre du compte à sa première vente et y reprend l'historique existant."""
    counter = await db.fiscal_counters.find_one({"owner_id": owner_id})
    if counter and counter.get("backfill_done"):
        return
    await _counter(db, owner_id, timezone_name)
    claimed = await db.fiscal_counters.find_one_and_update(
        {"owner_id": owner_id, "backfill_started": {"$ne": True}},
        {"$set": {"backfill_started": True}},
        return_document=True,
    )
    if not claimed:
        # Une autre requête fait la reprise : on lui laisse le temps de finir.
        for _ in range(100):
            counter = await db.fiscal_counters.find_one({"owner_id": owner_id})
            if counter and counter.get("backfill_done"):
                return
            await asyncio.sleep(0.1)
        return
    try:
        await _backfill(db, owner_id, timezone_name, skip_sale_id)
    finally:
        await db.fiscal_counters.update_one({"owner_id": owner_id}, {"$set": {"backfill_done": True}})


async def is_ready(db, owner_id: str) -> bool:
    """Vrai quand le registre du compte existe et que l'historique y a déjà été repris."""
    counter = await db.fiscal_counters.find_one({"owner_id": owner_id}, {"_id": 0, "backfill_done": 1})
    return bool(counter and counter.get("backfill_done"))


async def record_sale(
    db, owner_id: str, sale: Dict[str, Any], *, timezone_name: Optional[str] = None,
    actor_id: Optional[str] = None, training: bool = False,
) -> Optional[Dict[str, Any]]:
    """Inscrit une vente terminée."""
    await _prepare(db, owner_id, timezone_name, skip_sale_id=sale.get("sale_id"))
    entry = await _append(
        db, owner_id, ENTRY_SALE, sale,
        occurred_at=sale.get("created_at"), timezone_name=timezone_name,
        actor_id=actor_id, training=training,
    )
    await ensure_closures(db, owner_id)
    return entry


async def record_cancellation(
    db, owner_id: str, sale: Dict[str, Any], *, timezone_name: Optional[str] = None,
    actor_id: Optional[str] = None, reason: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Inscrit l'annulation d'une vente : une nouvelle ligne en négatif, la vente d'origine reste."""
    await _prepare(db, owner_id, timezone_name)
    original = await db.fiscal_ledger.find_one({"owner_id": owner_id, "sale_id": sale.get("sale_id"), "type": ENTRY_SALE})
    if not original:
        original = await _append(
            db, owner_id, ENTRY_SALE, sale,
            occurred_at=sale.get("created_at"), timezone_name=timezone_name, backfilled=True,
        )
    entry = await _append(
        db, owner_id, ENTRY_CANCELLATION, sale,
        occurred_at=sale.get("cancelled_at") or datetime.now(timezone.utc), timezone_name=timezone_name,
        actor_id=actor_id, reason=reason, training=bool((original or {}).get("training")),
    )
    await ensure_closures(db, owner_id)
    return entry


# ---------------------------------------------------------------------------
# Clôtures
# ---------------------------------------------------------------------------
def _empty_totals() -> Dict[str, Any]:
    return {
        "sales_count": 0, "cancellations_count": 0, "training_count": 0,
        "gross_total": 0.0, "cancelled_total": 0.0, "net_total": 0.0, "tax_total": 0.0,
        "by_payment_method": {},
    }


def _add_entry(totals: Dict[str, Any], entry: Dict[str, Any]) -> None:
    if entry.get("training"):
        totals["training_count"] += 1
        return
    snapshot = entry.get("sale") or {}
    sign = -1 if entry.get("type") == ENTRY_CANCELLATION else 1
    total = _money(snapshot.get("total_ttc"))
    if sign > 0:
        totals["sales_count"] += 1
        totals["gross_total"] = round(totals["gross_total"] + total, 2)
    else:
        totals["cancellations_count"] += 1
        totals["cancelled_total"] = round(totals["cancelled_total"] + total, 2)
    totals["net_total"] = round(totals["net_total"] + sign * total, 2)
    totals["tax_total"] = round(totals["tax_total"] + sign * _money(snapshot.get("tax_total")), 2)
    payments = snapshot.get("payments") or [{"method": snapshot.get("payment_method") or "cash", "amount": total}]
    for payment in payments:
        method = str(payment.get("method") or "cash")
        totals["by_payment_method"][method] = round(
            totals["by_payment_method"].get(method, 0.0) + sign * _money(payment.get("amount")), 2,
        )


def _period_key(period_type: str, day: str) -> str:
    return {"day": day, "month": day[:7], "year": day[:4]}[period_type]


async def ensure_closures(db, owner_id: str, now: Optional[datetime] = None) -> int:
    """Crée les clôtures manquantes des périodes terminées (jour, mois, année). Sans effet si tout est à jour."""
    counter = await db.fiscal_counters.find_one({"owner_id": owner_id})
    if not counter:
        return 0
    zone = _zone(counter.get("timezone"))
    today = _as_utc(now or datetime.now(timezone.utc)).astimezone(zone).strftime("%Y-%m-%d")
    last_checked = counter.get("closures_checked_day")
    if last_checked == today:
        return 0

    entries = await db.fiscal_ledger.find({"owner_id": owner_id}, {"_id": 0}).sort("seq", 1).to_list(None)
    created = 0
    for period_type in PERIOD_TYPES:
        current_key = _period_key(period_type, today)
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for entry in entries:
            key = _period_key(period_type, entry["day"])
            if key < current_key:
                grouped.setdefault(key, []).append(entry)
        existing = await db.fiscal_closures.find(
            {"owner_id": owner_id, "period_type": period_type}, {"_id": 0},
        ).sort("period_key", 1).to_list(None)
        done = {closure["period_key"] for closure in existing}
        previous_hash = existing[-1]["hash"] if existing else None
        for key in sorted(grouped):
            if key in done:
                continue
            period_entries = grouped[key]
            totals = _empty_totals()
            for entry in period_entries:
                _add_entry(totals, entry)
            closure = {
                "version": LEDGER_VERSION,
                "owner_id": owner_id,
                "period_type": period_type,
                "period_key": key,
                "timezone": counter.get("timezone") or "UTC",
                "closed_at": _iso(datetime.now(timezone.utc)),
                "entries_count": len(period_entries),
                "first_seq": period_entries[0]["seq"],
                "last_seq": period_entries[-1]["seq"],
                "last_entry_hash": period_entries[-1]["hash"],
                # Total cumulé depuis l'origine, à la fin de la période.
                "cumulative_total": period_entries[-1]["cumulative_total"],
                "totals": totals,
                "prev_hash": previous_hash,
            }
            _seal(closure)
            await db.fiscal_closures.insert_one(dict(closure))
            previous_hash = closure["hash"]
            created += 1
    await db.fiscal_counters.update_one({"owner_id": owner_id}, {"$set": {"closures_checked_day": today}})
    return created


async def list_closures(db, owner_id: str, period_type: Optional[str] = None, limit: int = 400) -> List[Dict[str, Any]]:
    await ensure_closures(db, owner_id)
    query: Dict[str, Any] = {"owner_id": owner_id}
    if period_type in PERIOD_TYPES:
        query["period_type"] = period_type
    closures = await db.fiscal_closures.find(query, {"_id": 0}).sort("period_key", -1).limit(limit).to_list(None)
    return closures


# ---------------------------------------------------------------------------
# Archives
# ---------------------------------------------------------------------------
async def build_archive(db, owner_id: str, period_type: str, period_key: str) -> Optional[Dict[str, Any]]:
    """Archive d'une période close : ses inscriptions, sa clôture et une empreinte de l'ensemble."""
    if period_type not in PERIOD_TYPES:
        return None
    await ensure_closures(db, owner_id)
    closure = await db.fiscal_closures.find_one(
        {"owner_id": owner_id, "period_type": period_type, "period_key": period_key}, {"_id": 0},
    )
    if not closure:
        return None
    entries = await db.fiscal_ledger.find(
        {"owner_id": owner_id, "seq": {"$gte": closure["first_seq"], "$lte": closure["last_seq"]}}, {"_id": 0},
    ).sort("seq", 1).to_list(None)
    entries = [entry for entry in entries if _period_key(period_type, entry["day"]) == period_key]
    record = await db.fiscal_archives.find_one(
        {"owner_id": owner_id, "period_type": period_type, "period_key": period_key}, {"_id": 0},
    )
    archive = {
        "format": "stockman-fiscal-archive",
        "version": LEDGER_VERSION,
        "owner_id": owner_id,
        "period_type": period_type,
        "period_key": period_key,
        "closure": closure,
        "entries": entries,
    }
    _seal(archive)
    if not record:
        record = {
            "owner_id": owner_id,
            "period_type": period_type,
            "period_key": period_key,
            "archived_at": _iso(datetime.now(timezone.utc)),
            "entries_count": len(entries),
            "hash": archive["hash"],
            "signature": archive["signature"],
        }
        await db.fiscal_archives.insert_one(dict(record))
    # La date de première archive fait foi ; l'empreinte d'origine permet de comparer.
    archive["archived_at"] = record["archived_at"]
    archive["first_archive_hash"] = record["hash"]
    archive["matches_first_archive"] = record["hash"] == archive["hash"]
    return archive


# ---------------------------------------------------------------------------
# Vérification
# ---------------------------------------------------------------------------
async def verify(db, owner_id: str, max_problems: int = 50) -> Dict[str, Any]:
    """Contrôle la série, le chaînage, les empreintes et la concordance avec les ventes en base."""
    problems: List[Dict[str, Any]] = []

    def report(kind: str, message: str, **extra: Any) -> None:
        if len(problems) < max_problems:
            problems.append({"kind": kind, "message": message, **extra})

    entries = await db.fiscal_ledger.find({"owner_id": owner_id}, {"_id": 0}).sort("seq", 1).to_list(None)
    counter = await db.fiscal_counters.find_one({"owner_id": owner_id}) or {}
    previous: Optional[Dict[str, Any]] = None
    cumulative = 0.0
    recorded_sales: Dict[str, Dict[str, Any]] = {}
    cancelled_sales = set()
    for entry in entries:
        seq = entry.get("seq")
        expected_seq = (previous["seq"] + 1) if previous else 1
        if seq != expected_seq:
            report("sequence", f"Numéro attendu {expected_seq}, trouvé {seq} : une inscription manque.", seq=seq)
        seal_problem = _seal_problem(entry)
        if seal_problem:
            report("integrity", f"Inscription n° {seq} : {seal_problem}.", seq=seq)
        if entry.get("chain_gap"):
            report("chain", f"Inscription n° {seq} : la précédente n'a pas pu être lue à l'écriture.", seq=seq)
        elif entry.get("prev_hash") != ((previous or {}).get("hash")):
            report("chain", f"Inscription n° {seq} : le chaînage avec la précédente est rompu.", seq=seq)
        cumulative = round(cumulative + _money(entry.get("amount")), 2)
        if not entry.get("chain_gap") and _money(entry.get("cumulative_total")) != cumulative:
            report("total", f"Inscription n° {seq} : le total cumulé ne correspond pas.", seq=seq)
            cumulative = _money(entry.get("cumulative_total"))
        if entry.get("type") == ENTRY_SALE:
            recorded_sales[entry["sale_id"]] = entry
        else:
            cancelled_sales.add(entry["sale_id"])
        previous = entry
    if entries and int(counter.get("seq") or 0) != entries[-1]["seq"]:
        report("sequence", "Le compteur ne correspond pas à la dernière inscription : des inscriptions manquent en fin de série.")

    # Concordance avec les ventes : une vente modifiée ou supprimée en base se voit ici.
    sales = await db.sales.find(
        {"user_id": owner_id, "status": {"$in": ["completed", "cancelled"]}}, {"_id": 0},
    ).to_list(None)
    seen = set()
    for sale in sales:
        sale_id = sale.get("sale_id")
        seen.add(sale_id)
        entry = recorded_sales.get(sale_id)
        if not entry:
            report("missing_entry", f"Vente {sale_id} absente du registre.", sale_id=sale_id)
            continue
        snapshot = _sale_snapshot(sale)
        for field in ("total_ttc", "tax_total", "payment_method", "items", "payments"):
            if snapshot[field] != entry["sale"].get(field):
                report("modified_sale", f"Vente {sale_id} : « {field} » diffère de l'inscription n° {entry['seq']}.", sale_id=sale_id)
                break
        if sale.get("status") == "cancelled" and sale_id not in cancelled_sales:
            report("missing_entry", f"Annulation de la vente {sale_id} absente du registre.", sale_id=sale_id)
        if sale.get("status") != "cancelled" and sale_id in cancelled_sales:
            report("modified_sale", f"Vente {sale_id} : annulée au registre mais active en base.", sale_id=sale_id)
    for sale_id, entry in recorded_sales.items():
        if sale_id not in seen and not entry.get("training"):
            report("deleted_sale", f"Vente {sale_id} (inscription n° {entry['seq']}) supprimée de la base.", sale_id=sale_id)

    closures = await db.fiscal_closures.find({"owner_id": owner_id}, {"_id": 0}).sort("period_key", 1).to_list(None)
    last_by_type: Dict[str, Optional[str]] = {}
    for closure in closures:
        label = f"Clôture {closure.get('period_type')} {closure.get('period_key')}"
        seal_problem = _seal_problem(closure)
        if seal_problem:
            report("closure", f"{label} : {seal_problem}.")
        if closure.get("prev_hash") != last_by_type.get(closure.get("period_type")):
            report("closure", f"{label} : le chaînage avec la clôture précédente est rompu.")
        last_by_type[closure.get("period_type")] = closure.get("hash")

    return {
        "ok": not problems,
        "signed": is_signed(),
        "entries": len(entries),
        "last_seq": entries[-1]["seq"] if entries else 0,
        "cumulative_total": entries[-1]["cumulative_total"] if entries else 0.0,
        "closures": len(closures),
        "problems": problems,
        "checked_at": _iso(datetime.now(timezone.utc)),
    }


async def status(db, owner_id: str) -> Dict[str, Any]:
    counter = await db.fiscal_counters.find_one({"owner_id": owner_id}, {"_id": 0})
    last = None
    if counter and counter.get("seq"):
        last = await db.fiscal_ledger.find_one({"owner_id": owner_id, "seq": counter["seq"]}, {"_id": 0})
    return {
        "started": bool(counter),
        "signed": is_signed(),
        "timezone": (counter or {}).get("timezone"),
        "entries": int((counter or {}).get("seq") or 0),
        "last_entry_at": (last or {}).get("recorded_at"),
        "cumulative_total": (last or {}).get("cumulative_total", 0.0),
        "closures": await db.fiscal_closures.count_documents({"owner_id": owner_id}),
        "retention_years": RETENTION_YEARS,
    }


async def mark_retention(db, owner_id: str, business_name: Optional[str] = None) -> bool:
    """Compte supprimé : le registre est gardé jusqu'à la fin du délai légal de conservation."""
    if not await db.fiscal_ledger.count_documents({"owner_id": owner_id}):
        return False
    await ensure_closures(db, owner_id)
    now = datetime.now(timezone.utc)
    await db.fiscal_retention.update_one(
        {"owner_id": owner_id},
        {"$set": {
            "business_name": business_name,
            "account_deleted_at": now,
            "purge_after": now + timedelta(days=365 * RETENTION_YEARS + 2),
        }},
        upsert=True,
    )
    return True
