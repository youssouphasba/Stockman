"""Alerte « version fantôme » : une version publiée sur le store depuis plus de 24 h, qu'aucun
appareil ne signale, est presque toujours une build qui plante au lancement (cas de la 1.0.26 iOS)."""
import html
import logging
from datetime import datetime, timedelta
from typing import Any, Awaitable, Callable, Dict, Optional

logger = logging.getLogger(__name__)

GHOST_VERSION_DELAY_HOURS = 24
PLATFORM_LABELS = {"ios": ("iOS", "l'App Store", "iPhone"), "android": ("Android", "Google Play", "téléphone Android")}

Notifier = Callable[[str, str, str, Dict[str, Any]], Awaitable[None]]


async def check_ghost_version(
    db, platform: str, version: str, released_at: datetime, now: datetime, notify: Notifier
) -> Optional[Dict[str, Any]]:
    """Envoie une alerte unique par version ; renvoie l'alerte créée, sinon None."""
    if now - released_at < timedelta(hours=GHOST_VERSION_DELAY_HOURS):
        return None
    alert_id = f"{platform}:{version}"
    if await db.app_release_alerts.find_one({"alert_id": alert_id}):
        return None
    on_version = await db.push_installations.count_documents(
        {"platform": platform, "app_version": version, "updated_at": {"$gte": released_at}}
    )
    if on_version > 0:
        return None
    # Sans aucun appareil actif sur la période, l'absence de signal ne prouve rien.
    active = await db.push_installations.count_documents(
        {"platform": platform, "updated_at": {"$gte": released_at - timedelta(days=7)}}
    )
    if active == 0:
        return None

    alert = {"alert_id": alert_id, "platform": platform, "version": version, "released_at": released_at, "created_at": now}
    await db.app_release_alerts.insert_one(dict(alert))
    label, store, device = PLATFORM_LABELS.get(platform, (platform, "le store", "appareil"))
    hours = int((now - released_at).total_seconds() // 3600)
    title = f"{label} {version} : aucun appareil depuis {hours} h"
    body = (
        f"La version {version} est en ligne sur {store} depuis {hours} h, mais aucun {device} ne l'a encore "
        "signalée. Elle plante peut-être au lancement : installez-la depuis le store pour vérifier."
    )
    html_body = f"<p>{html.escape(body)}</p><p>Appareils {html.escape(label)} actifs sur la période, toutes versions : {active}.</p>"
    try:
        await notify(title, body, html_body, {"type": "app_release_alert", "platform": platform, "version": version})
    except Exception as exc:
        # L'alerte reste enregistrée : on ne renvoie pas d'e-mail en boucle si l'envoi échoue.
        logger.warning("Ghost app version alert failed: %s", exc)
    return alert
