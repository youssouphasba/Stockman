import logging
import httpx
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.expo_push_url = "https://exp.host/--/api/v2/push/send"
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        }
        # In production, an Access Token might be required if configured in Expo dashboard
        access_token = os.environ.get("EXPO_ACCESS_TOKEN")
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"

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

    async def notify_user(self, db, user_id: str, title: str, body: str, data: Optional[Dict[str, Any]] = None):
        """
        Helper to notify a user by their user_id by fetching their registered tokens.
        """
        user_doc = await db.users.find_one({"user_id": user_id}, {"push_tokens": 1})
        if user_doc and "push_tokens" in user_doc:
            tokens = user_doc["push_tokens"]
            if tokens:
                await self.send_push_notification(tokens, title, body, data)
