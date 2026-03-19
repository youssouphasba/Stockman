import base64
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None


def _load_service_account_info() -> Optional[Dict[str, Any]]:
    raw_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if raw_json:
        return json.loads(raw_json)

    raw_b64 = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON_B64")
    if raw_b64:
        decoded = base64.b64decode(raw_b64).decode("utf-8")
        return json.loads(decoded)

    json_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE")
    if json_path:
        return json.loads(Path(json_path).read_text(encoding="utf-8"))

    return None


def init_firebase() -> Optional[firebase_admin.App]:
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    except ValueError:
        pass

    service_account_info = _load_service_account_info()
    if not service_account_info:
        logger.warning("Firebase Admin not configured: missing service account credentials")
        return None

    cred = credentials.Certificate(service_account_info)
    _firebase_app = firebase_admin.initialize_app(cred)
    logger.info("Firebase Admin initialized")
    return _firebase_app


def verify_firebase_phone_token(id_token: str) -> Dict[str, Any]:
    app = init_firebase()
    if not app:
        raise RuntimeError("Firebase Admin is not configured")

    decoded = firebase_auth.verify_id_token(id_token, app=app, check_revoked=False)
    provider = ((decoded.get("firebase") or {}).get("sign_in_provider"))
    phone_number = decoded.get("phone_number")
    if provider != "phone" or not phone_number:
        raise ValueError("Invalid Firebase phone verification token")

    return {
        "phone_number": phone_number,
        "firebase_uid": decoded.get("uid"),
        "provider": provider,
        "decoded_token": decoded,
    }
