"""Alerte « version fantôme » : une version publiée sur le store depuis plus de 24 h, sans qu'aucune
nouvelle version d'app ne soit apparue sur les appareils, est presque toujours une build qui plante
au lancement (cas de la 1.0.26 iOS).

Le numéro renvoyé par l'App Store (« 1.0.5 ») n'est pas celui que l'app déclare (« 1.0.26 ») : on ne
compare donc jamais les numéros. On regarde si une version encore jamais vue est apparue sur des
appareils de clients depuis la mise en ligne."""
import html
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, Optional

logger = logging.getLogger(__name__)

GHOST_VERSION_DELAY_HOURS = 24
# L'historique des versions vues commence avec cette surveillance : les mises en ligne antérieures
# ne peuvent pas être jugées.
WATCH_SINCE = datetime(2026, 11, 19, tzinfo=timezone.utc)
PLATFORM_LABELS = {"ios": ("iOS", "l'App Store", "iPhone"), "android": ("Android", "Google Play", "téléphone Android")}

Notifier = Callable[[str, str, str, Dict[str, Any]], Awaitable[None]]


async def record_version_seen(db, platform: str, version: Optional[str], now: datetime) -> None:
    """Note la première apparition d'une version d'app sur un appareil de client."""
    version = (version or "").strip()
    if platform not in PLATFORM_LABELS or not version:
        return
    await db.app_versions_seen.update_one(
        {"platform": platform, "version": version},
        {"$setOnInsert": {"platform": platform, "version": version, "first_seen_at": now}},
        upsert=True,
    )


async def check_ghost_release(
    db, platform: str, store_version: str, released_at: datetime, now: datetime, notify: Notifier
) -> Optional[Dict[str, Any]]:
    """Envoie une alerte unique par mise en ligne ; renvoie l'alerte créée, sinon None."""
    if released_at < WATCH_SINCE or now - released_at < timedelta(hours=GHOST_VERSION_DELAY_HOURS):
        return None
    alert_id = f"{platform}:{released_at.isoformat()}"
    if await db.app_release_alerts.find_one({"alert_id": alert_id}):
        return None
    new_versions = await db.app_versions_seen.count_documents(
        {"platform": platform, "first_seen_at": {"$gte": released_at}}
    )
    if new_versions > 0:
        return None
    # Sans aucun appareil actif sur la période, l'absence de nouvelle version ne prouve rien.
    active = await db.push_installations.count_documents(
        {"platform": platform, "updated_at": {"$gte": released_at - timedelta(days=7)}}
    )
    if active == 0:
        return None

    alert = {
        "alert_id": alert_id, "platform": platform, "store_version": store_version,
        "released_at": released_at, "created_at": now,
    }
    await db.app_release_alerts.insert_one(dict(alert))
    label, store, device = PLATFORM_LABELS[platform]
    hours = int((now - released_at).total_seconds() // 3600)
    title = f"{label} : nouvelle version introuvable depuis {hours} h"
    body = (
        f"Une version est en ligne sur {store} depuis {hours} h (numéro affiché par le store : {store_version}), "
        f"mais aucun {device} n'a encore lancé de nouvelle version. Elle plante peut-être au lancement : "
        "installez-la depuis le store pour vérifier."
    )
    html_body = f"<p>{html.escape(body)}</p><p>Appareils {html.escape(label)} actifs sur la période, toutes versions : {active}.</p>"
    try:
        await notify(title, body, html_body, {"type": "app_release_alert", "platform": platform})
    except Exception as exc:
        # L'alerte reste enregistrée : on ne renvoie pas d'e-mail en boucle si l'envoi échoue.
        logger.warning("Ghost app version alert failed: %s", exc)
    return alert
