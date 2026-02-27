import os
import logging
from twilio.rest import Client
from typing import Optional
import re as _re

logger = logging.getLogger(__name__)

class TwilioService:
    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.whatsapp_number = os.environ.get("TWILIO_WHATSAPP_NUMBER")
        
        self.client = None
        if self.account_sid and self.auth_token and self.whatsapp_number:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info(f"Twilio client initialized. SID: {self.account_sid[:6]}... | From: {self.whatsapp_number}")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
        else:
            missing = []
            if not self.account_sid: missing.append("TWILIO_ACCOUNT_SID")
            if not self.auth_token: missing.append("TWILIO_AUTH_TOKEN")
            if not self.whatsapp_number: missing.append("TWILIO_WHATSAPP_NUMBER")
            logger.warning(f"Twilio credentials missing: {', '.join(missing)}. WhatsApp messages will only be logged (SIMULATION MODE).")

    async def send_whatsapp_otp(self, phone: str, otp: str) -> bool:
        """
        Send an OTP via WhatsApp.
        Phone should be in E.164 format (ex: +221771234567).
        """
        if not phone:
            logger.warning("No phone number provided, skipping WhatsApp OTP")
            return False

        # Validation format E.164
        if not _re.match(r'^\+[1-9]\d{6,14}$', phone.replace("whatsapp:", "")):
            logger.warning(f"Invalid phone format: {phone}")
            return False

        # Ensure phone has the whatsapp: prefix for Twilio
        to_whatsapp_number = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone
        
        message_body = f"Votre code de vérification Stockman est : {otp}"
        
        if self.client:
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                message = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        body=message_body,
                        from_=self.whatsapp_number,
                        to=to_whatsapp_number
                    )
                )
                logger.info(f"WhatsApp OTP sent to {phone} | SID: {message.sid} | Status: {message.status}")
                return True
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Twilio WhatsApp ERROR to {phone}: {error_msg}")
                # Log common Twilio error causes
                if "21608" in error_msg:
                    logger.error("  -> Cause: Le numero n'a pas rejoint le sandbox WhatsApp Twilio.")
                    logger.error("  -> Solution: L'utilisateur doit envoyer 'join <mot-cle>' au numero sandbox Twilio.")
                elif "20003" in error_msg:
                    logger.error("  -> Cause: Identifiants Twilio invalides (Account SID ou Auth Token).")
                elif "21211" in error_msg:
                    logger.error("  -> Cause: Numero de telephone invalide.")
                elif "63032" in error_msg or "template" in error_msg.lower():
                    logger.error("  -> Cause: Template WhatsApp non approuve pour la production.")
                return False
        else:
            if os.environ.get("APP_ENV") == "production" or os.environ.get("ENV") == "production":
                logger.error("CRITICAL: Twilio credentials missing in production! OTP NOT sent.")
                return False  # NE PAS simuler en production
            logger.info(f"[SIMULATION] WhatsApp OTP to {phone} | Code: {otp}")
            return True  # Pretend it worked for dev/testing if no keys
