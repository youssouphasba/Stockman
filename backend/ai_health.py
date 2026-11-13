"""Santé du service d'IA (Gemini) : détection des pannes et alerte du superadmin.

Tous les appels passent par ``MonitoredModel`` (voir ``build_gemini_model`` dans server.py).
Un refus pour crédit épuisé, quota dépassé ou clé invalide déclenche une alerte unique
(notification et e-mail) au superadmin, puis une alerte « rétabli » au premier succès.
"""

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable, Dict, Optional

logger = logging.getLogger(__name__)

# Pannes qui demandent une action de l'équipe Stockman.
CATEGORY_LABELS = {
    "credit": "Crédit Gemini épuisé",
    "quota": "Quota Gemini dépassé",
    "auth": "Clé Gemini refusée",
}
ALERT_COOLDOWN_SECONDS = 6 * 3600

_state: Dict[str, Any] = {
    "status": "unknown",  # unknown | ok | down
    "category": None,
    "last_error": None,
    "last_error_at": None,
    "last_success_at": None,
    "last_alert_at": {},
}
_loop: Optional[asyncio.AbstractEventLoop] = None
_notifier: Optional[Callable[[str, Dict[str, Any]], Awaitable[None]]] = None


def bind(loop: asyncio.AbstractEventLoop, notifier: Callable[[str, Dict[str, Any]], Awaitable[None]]) -> None:
    """Branche la boucle principale et la fonction qui prévient le superadmin (au démarrage)."""
    global _loop, _notifier
    _loop = loop
    _notifier = notifier


def classify_error(error: BaseException) -> Optional[str]:
    text = f"{type(error).__name__} {error}".lower()
    if "prepayment" in text or "credits are depleted" in text or "billing" in text:
        return "credit"
    if "api key not valid" in text or "api_key_invalid" in text or "permission denied" in text or "permissiondenied" in text:
        return "auth"
    if "429" in text or "resource exhausted" in text or "resourceexhausted" in text or "quota" in text:
        return "quota"
    return None


def user_message(error: BaseException) -> Optional[str]:
    """Message clair pour l'utilisateur quand la panne vient du service d'IA lui-même."""
    if classify_error(error):
        return "L'assistant IA est momentanément indisponible. Réessayez un peu plus tard ; en attendant, vous pouvez consulter les guides."
    return None


def snapshot() -> Dict[str, Any]:
    data = {key: value for key, value in _state.items() if key != "last_alert_at"}
    data["category_label"] = CATEGORY_LABELS.get(_state["category"]) if _state["category"] else None
    return data


def _schedule(event: str, payload: Dict[str, Any]) -> None:
    if not _loop or not _notifier:
        return
    try:
        asyncio.run_coroutine_threadsafe(_notifier(event, payload), _loop)
    except Exception as exc:  # la boucle peut être fermée à l'arrêt du serveur
        logger.warning("AI health notification not scheduled: %s", exc)


def record_failure(error: BaseException, feature: str = "") -> None:
    category = classify_error(error)
    if not category:
        return
    now = time.time()
    _state.update({
        "status": "down",
        "category": category,
        "last_error": str(error)[:300],
        "last_error_at": now,
    })
    last_alert = _state["last_alert_at"].get(category, 0)
    if now - last_alert >= ALERT_COOLDOWN_SECONDS:
        _state["last_alert_at"][category] = now
        logger.error("AI service down (%s) during %s: %s", category, feature or "appel IA", error)
        _schedule("down", {**snapshot(), "feature": feature})


def record_success() -> None:
    was_down = _state["status"] == "down"
    _state["status"] = "ok"
    _state["last_success_at"] = time.time()
    if was_down:
        category = _state["category"]
        _state["category"] = None
        _state["last_alert_at"].pop(category, None)
        _schedule("recovered", {**snapshot(), "previous_category": category})


class _MonitoredChat:
    def __init__(self, chat: Any):
        self._chat = chat

    def __getattr__(self, name: str) -> Any:
        return getattr(self._chat, name)

    def send_message(self, *args: Any, **kwargs: Any) -> Any:
        try:
            result = self._chat.send_message(*args, **kwargs)
        except Exception as exc:
            record_failure(exc, "assistant")
            raise
        record_success()
        return result

    async def send_message_async(self, *args: Any, **kwargs: Any) -> Any:
        try:
            result = await self._chat.send_message_async(*args, **kwargs)
        except Exception as exc:
            record_failure(exc, "assistant")
            raise
        record_success()
        return result


class MonitoredModel:
    """Enveloppe un modèle Gemini : mêmes méthodes, avec suivi des pannes."""

    def __init__(self, model: Any):
        self._model = model

    def __getattr__(self, name: str) -> Any:
        return getattr(self._model, name)

    def generate_content(self, *args: Any, **kwargs: Any) -> Any:
        try:
            result = self._model.generate_content(*args, **kwargs)
        except Exception as exc:
            record_failure(exc, "generate_content")
            raise
        record_success()
        return result

    async def generate_content_async(self, *args: Any, **kwargs: Any) -> Any:
        try:
            result = await self._model.generate_content_async(*args, **kwargs)
        except Exception as exc:
            record_failure(exc, "generate_content")
            raise
        record_success()
        return result

    def start_chat(self, *args: Any, **kwargs: Any) -> _MonitoredChat:
        return _MonitoredChat(self._model.start_chat(*args, **kwargs))
