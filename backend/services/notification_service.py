import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


def is_expo_push_token(token: str) -> bool:
    value = str(token or "")
    return value.startswith("ExponentPushToken") or value.startswith("ExpoPushToken")


class NotificationService:
    def __init__(self):
        self.expo_push_url = "https://exp.host/--/api/v2/push/send"
        self.resend_url = "https://api.resend.com/emails"
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        }
        access_token = os.environ.get("EXPO_ACCESS_TOKEN")
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"
        self.resend_api_key = os.environ.get("RESEND_API_KEY", "")
        self.email_from = os.environ.get("RESEND_FROM_EMAIL", "Stockman <noreply@stockman.app>")

    async def send_push_notification(
        self,
        expo_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send a push notification to one or more Expo Push Tokens and return
        a structured result that callers can inspect.
        """
        if not expo_tokens:
            return {
                "ok": False,
                "reason": "no_tokens",
                "message": "Aucun jeton push n'est disponible pour cet utilisateur.",
                "attempted_tokens": 0,
                "valid_tokens": 0,
                "invalid_tokens": [],
                "tickets": [],
                "errors": [],
            }

        messages: List[Dict[str, Any]] = []
        invalid_tokens: List[str] = []
        for token in expo_tokens:
            if not is_expo_push_token(token):
                logger.warning("Invalid Expo Push Token: %s", token)
                invalid_tokens.append(token)
                continue

            msg: Dict[str, Any] = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
            }
            if data:
                msg["data"] = data
            messages.append(msg)

        if not messages:
            return {
                "ok": False,
                "reason": "invalid_tokens",
                "message": "Les jetons push enregistres sont invalides.",
                "attempted_tokens": len(expo_tokens),
                "valid_tokens": 0,
                "invalid_tokens": invalid_tokens,
                "tickets": [],
                "errors": [],
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.expo_push_url,
                    json=messages,
                    headers=self.headers,
                    timeout=10.0,
                )
                response.raise_for_status()
                raw_result = response.json()
                ticket_data = raw_result.get("data") if isinstance(raw_result, dict) else None
                tickets = ticket_data if isinstance(ticket_data, list) else []
                errors: List[Dict[str, Any]] = []
                ok_count = 0
                reason = None
                message = "Notification push envoyee."

                for item in tickets:
                    if item.get("status") == "ok":
                        ok_count += 1
                        continue

                    logger.warning("Expo push ticket issue: %s", item)
                    errors.append(item)
                    details = item.get("details") or {}
                    if details.get("error") == "InvalidCredentials":
                        reason = "invalid_credentials"
                        message = "Expo n'a pas pu envoyer la notification car la configuration FCM est invalide ou manquante."
                    elif not reason:
                        reason = "provider_error"
                        message = item.get("message") or "Le fournisseur push a refuse la notification."

                result = {
                    "ok": ok_count > 0 and not errors,
                    "reason": reason,
                    "message": message,
                    "attempted_tokens": len(expo_tokens),
                    "valid_tokens": len(messages),
                    "invalid_tokens": invalid_tokens,
                    "tickets": tickets,
                    "errors": errors,
                }
                logger.info("Push notification sent with result: %s", result)
                return result
        except Exception as exc:
            logger.error("Error sending push notification: %s", exc)
            return {
                "ok": False,
                "reason": "request_failed",
                "message": str(exc),
                "attempted_tokens": len(expo_tokens),
                "valid_tokens": len(messages),
                "invalid_tokens": invalid_tokens,
                "tickets": [],
                "errors": [],
            }

    async def notify_user(
        self,
        db,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        caller_owner_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Helper to notify a user by user_id.
        If caller_owner_id is provided, verify the target user belongs to the
        same tenant.
        """
        user_doc = await db.users.find_one({"user_id": user_id}, {"push_tokens": 1, "parent_user_id": 1})
        if not user_doc:
            return {
                "ok": False,
                "reason": "user_not_found",
                "message": "Utilisateur introuvable.",
                "user_id": user_id,
            }

        if caller_owner_id:
            target_owner = user_doc.get("parent_user_id") or user_id
            if target_owner != caller_owner_id and user_id != caller_owner_id:
                logger.warning(
                    "Cross-tenant notification blocked: caller=%s target=%s",
                    caller_owner_id,
                    user_id,
                )
                return {
                    "ok": False,
                    "reason": "cross_tenant_blocked",
                    "message": "Envoi bloque pour une autre organisation.",
                    "user_id": user_id,
                }

        tokens = user_doc.get("push_tokens") or []
        if not tokens:
            return {
                "ok": False,
                "reason": "no_tokens_registered",
                "message": "Aucun appareil n'est enregistre pour cet utilisateur.",
                "user_id": user_id,
            }

        result = await self.send_push_notification(tokens, title, body, data)
        result["user_id"] = user_id
        return result

    async def send_email_notification(
        self,
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ):
        """
        Send an email notification via Resend.
        """
        recipients = []
        for email in to_emails:
            value = str(email or "").strip().lower()
            if value and value not in recipients:
                recipients.append(value)

        if not recipients:
            return None
        if not self.resend_api_key:
            logger.warning("RESEND_API_KEY not set - skipping email notification")
            return None

        payload: Dict[str, Any] = {
            "from": self.email_from,
            "to": recipients,
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            payload["text"] = text_body

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.resend_url,
                    headers={"Authorization": f"Bearer {self.resend_api_key}"},
                    json=payload,
                    timeout=10.0,
                )
                response.raise_for_status()
                result = response.json()
                logger.info("Email notification sent successfully: %s", result)
                return result
        except Exception as exc:
            logger.error("Error sending email notification: %s", exc)
            return None
