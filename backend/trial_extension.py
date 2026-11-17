"""Mois gratuits offerts par l'admin Stockman à un commerçant.

À l'inscription, un commerçant reçoit un mois d'essai gratuit (30 jours).
L'admin peut prolonger cet essai de un à douze mois. Les mois s'ajoutent à la
fin de l'essai en cours ; si l'essai est déjà terminé, ils partent d'aujourd'hui
et le compte retrouve l'accès complet.

Un compte qui paie déjà son abonnement n'est pas concerné : pour lui, on accorde
un délai de grâce.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

DAYS_PER_MONTH = 30
MIN_MONTHS = 1
MAX_MONTHS = 12


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
