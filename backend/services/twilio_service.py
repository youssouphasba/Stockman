import os
import logging
from twilio.rest import Client
from typing import Optional

logger = logging.getLogger(__name__)

class TwilioService:
    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.whatsapp_number = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886") # Default sandbox number
        
        self.client = None
        if self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info("Twilio client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
        else:
            logger.warning("Twilio credentials missing. WhatsApp messages will only be logged.")

    async def send_whatsapp_otp(self, phone: str, otp: str) -> bool:
        """
        Send an OTP via WhatsApp.
        Phone should be in E.164 format (ex: +221771234567).
        """
        if not phone:
            logger.warning("No phone number provided, skipping WhatsApp OTP")
            return False

        # Ensure phone has the whatsapp: prefix for Twilio
        to_whatsapp_number = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone
        
        message_body = f"Votre code de vérification Stockman est : {otp}"
        
        if self.client:
            try:
                # Twilio Python library is synchronous, we can run it in an executor if needed,
                # but for an OTP it's usually fast enough.
                import asyncio
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        body=message_body,
                        from_=self.whatsapp_number,
                        to=to_whatsapp_number
                    )
                )
                logger.info(f"WhatsApp OTP sent to {phone}")
                return True
            except Exception as e:
                logger.error(f"Error sending WhatsApp via Twilio: {e}")
                return False
        else:
            logger.info(f"[SIMULATION WHATSAPP] To: {phone} | Body: {message_body}")
            return True # Pretend it worked for dev/testing if no keys
