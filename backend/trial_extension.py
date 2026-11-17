"""Mois gratuits offerts par l'admin Stockman à un commerçant.

À l'inscription, un commerçant reçoit un mois d'essai gratuit (30 jours).
L'admin peut prolonger cet essai de un à douze mois. Les mois s'ajoutent à la
fin de l'essai en cours ; si l'essai est déjà terminé, ils partent d'aujourd'hui
et le compte retrouve l'accès complet.

Un compte qui paie déjà son abonnement n'est pas concerné : pour lui, on accorde
un délai de grâce.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

DAYS_PER_MONTH = 30
MIN_MONTHS = 1
MAX_MONTHS = 12
# Essai offert à l'inscription, modifiable par l'admin (de 1 à 12 mois).
DEFAULT_SIGNUP_MONTHS = 1


def normalize_signup_months(value) -> int:
    try:
        months = int(value)
    except (TypeError, ValueError):
        return DEFAULT_SIGNUP_MONTHS
    return months if MIN_MONTHS <= months <= MAX_MONTHS else DEFAULT_SIGNUP_MONTHS


def signup_trial_view(settings_doc) -> dict:
    """Durée de l'essai offert à l'inscription, lue dans app_settings (clé « global »)."""
    months = normalize_signup_months(((settings_doc or {}).get("trial") or {}).get("signup_months"))
    return {"months": months, "days": months * DAYS_PER_MONTH}


def is_paying_account(account: Optional[Dict[str, Any]]) -> bool:
    provider = str((account or {}).get("subscription_provider") or "none").strip().lower()
    return provider not in {"", "none"}


def new_trial_end(current_end: Optional[datetime], now: datetime, months: int) -> datetime:
    if not MIN_MONTHS <= int(months) <= MAX_MONTHS:
        raise ValueError(f"months must be between {MIN_MONTHS} and {MAX_MONTHS}")
    if current_end is not None and current_end.tzinfo is None:
        current_end = current_end.replace(tzinfo=now.tzinfo)
    start = current_end if current_end and current_end > now else now
    return start + timedelta(days=DAYS_PER_MONTH * int(months))


def _months_label(months: int, language: str) -> str:
    if language == "fr":
        return "1 mois gratuit" if months == 1 else f"{months} mois gratuits"
    return "1 free month" if months == 1 else f"{months} free months"


def notification_text(months: int, trial_end: datetime, language: Optional[str] = None, note: str = "") -> Dict[str, str]:
    """Titre et texte envoyés au commerçant (notification interne, push et e-mail)."""
    # Le wolof et le peul sont parlés surtout en Afrique francophone : on y écrit en français.
    lang = "fr" if (language or "fr").lower()[:2] in {"fr", "wo", "ff"} else "en"
    end = trial_end.strftime("%d/%m/%Y")
    label = _months_label(months, lang)
    if lang == "fr":
        title = f"Stockman vous offre {label}"
        content = f"Bonne nouvelle : votre essai gratuit est prolongé. Vous profitez de Stockman sans payer jusqu'au {end}."
    else:
        title = f"Stockman gives you {label}"
        content = f"Good news: your free trial has been extended. You can use Stockman for free until {end}."
    note = (note or "").strip()
    if note:
        content = f"{content}\n\n{note}"
    return {"title": title, "content": content}


def _parse_iso(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def undoable_extension(events: List[Dict[str, Any]], current_end: Optional[datetime]) -> Tuple[Optional[Dict[str, Any]], str]:
    """Dernière offre de mois gratuits encore annulable, ou la raison du refus.

    On n'annule que la plus récente offre non annulée, et seulement si la fin d'essai
    actuelle est toujours celle qu'elle a fixée : sinon une autre modification est passée
    entre-temps et remettre l'ancienne date l'effacerait.
    """
    candidates = [e for e in events if e.get("event_type") == "trial_extended" and not e.get("reverted_at")]
    if not candidates:
        return None, "Aucune offre de mois gratuits à annuler sur ce compte."
    latest = max(candidates, key=lambda e: _parse_iso(e.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc))
    metadata = latest.get("metadata") or {}
    set_end = _parse_iso(metadata.get("trial_ends_at"))
    if current_end is not None and current_end.tzinfo is None:
        current_end = current_end.replace(tzinfo=timezone.utc)
    if not set_end or not current_end or abs((set_end - current_end).total_seconds()) > 60:
        return None, "La fin d'essai a changé depuis la dernière offre : annulation impossible automatiquement."
    return latest, ""


def correction_text(trial_end: Optional[datetime], language: Optional[str] = None) -> Dict[str, str]:
    """Message de correction quand une offre de mois gratuits envoyée par erreur est annulée."""
    lang = "fr" if (language or "fr").lower()[:2] in {"fr", "wo", "ff"} else "en"
    if lang == "fr":
        title = "Correction de votre essai gratuit"
        content = (
            f"Un message précédent vous annonçait des mois gratuits par erreur. Votre essai gratuit se termine le {trial_end.strftime('%d/%m/%Y')}."
            if trial_end else "Un message précédent vous annonçait des mois gratuits par erreur. Nous vous prions de nous en excuser."
        )
    else:
        title = "Correction to your free trial"
        content = (
            f"A previous message announced extra free months by mistake. Your free trial ends on {trial_end.strftime('%d/%m/%Y')}."
            if trial_end else "A previous message announced extra free months by mistake. We apologise for the confusion."
        )
    return {"title": title, "content": content}
