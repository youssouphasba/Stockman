import logging
import httpx
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.expo_push_url = "https://exp.host/--/api/v2/push/send"
        self.resend_url = "https://api.resend.com/emails"
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        }
        # In production, an Access Token might be required if configured in Expo dashboard
        access_token = os.environ.get("EXPO_ACCESS_TOKEN")
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"
        self.resend_api_key = os.environ.get("RESEND_API_KEY", "")
        self.email_from = os.environ.get("RESEND_FROM_EMAIL", "Stockman <noreply@stockman.app>")

    async def send_push_notification(self, expo_tokens: List[str], title: str, body: str, data: Optional[Dict[str, Any]] = None):
        """
        Send a push notification to one or more Expo Push Tokens.
        """
        if not expo_tokens:
            return

        messages = []
        for token in expo_tokens:
            if not token.startswith("ExponentPushToken"):
                logger.warning(f"Invalid Expo Push Token: {token}")
                continue
                
            msg = {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
            }
            if data:
                msg["data"] = data
            messages.append(msg)

        if not messages:
            return

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.expo_push_url,
                    json=messages,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"Push notification sent successfully: {result}")
                return result
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return None

    async def notify_user(self, db, user_id: str, title: str, body: str, 
                          data: Optional[Dict[str, Any]] = None, caller_owner_id: Optional[str] = None):
        """
        Helper to notify a user by their user_id. 
        If caller_owner_id is provided, verify the target user belongs to the same tenant.
        """
        user_doc = await db.users.find_one({"user_id": user_id}, {"push_tokens": 1, "parent_user_id": 1})
        if not user_doc:
            return

        # Verification tenant : le user cible doit appartenir au même propriétaire
        if caller_owner_id:
            target_owner = user_doc.get("parent_user_id") or user_id
            if target_owner != caller_owner_id and user_id != caller_owner_id:
                logger.warning(f"Cross-tenant notification blocked: caller={caller_owner_id} target={user_id}")
                return

        if "push_tokens" in user_doc:
            tokens = user_doc["push_tokens"]
            if tokens:
                await self.send_push_notification(tokens, title, body, data)

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
        except Exception as e:
            logger.error("Error sending email notification: %s", e)
            return None
