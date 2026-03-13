import argparse
import os
import sys
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from passlib.context import CryptContext
from pymongo import MongoClient


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def normalize_auth_version(value) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = 1
    return parsed if parsed > 0 else 1


def resolve_mongo_url(cli_value: str | None) -> str:
    mongo_url = cli_value or os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
    if not mongo_url:
        raise SystemExit("MONGO_URL ou MONGODB_URI requis.")
    return mongo_url


def resolve_required_value(cli_value: str | None, env_name: str, label: str) -> str:
    value = cli_value or os.environ.get(env_name)
    if not value:
        raise SystemExit(f"{label} requis via --{label.lower().replace(' ', '-')} ou {env_name}.")
    return value


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Create or promote a superadmin account.")
    parser.add_argument("--email", help="Admin email")
    parser.add_argument("--password", help="Admin password")
    parser.add_argument("--name", help="Admin display name")
    parser.add_argument("--mongo-url", dest="mongo_url", help="MongoDB connection string")
    args = parser.parse_args()

    email = resolve_required_value(args.email, "SUPERADMIN_EMAIL", "Admin email")
    password = resolve_required_value(args.password, "SUPERADMIN_PASSWORD", "Admin password")
    name = resolve_required_value(args.name, "SUPERADMIN_NAME", "Admin name")
    mongo_url = resolve_mongo_url(args.mongo_url)
    client = MongoClient(mongo_url)
    db = client["stock_management"]

    now = datetime.now(timezone.utc)
    password_hash = get_password_hash(password)
    user = db.users.find_one({"email": email}, {"_id": 0})

    if user:
        auth_version = normalize_auth_version(user.get("auth_version")) + 1
        db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "name": name,
                    "role": "superadmin",
                    "auth_type": "email",
                    "password_hash": password_hash,
                    "auth_version": auth_version,
                    "updated_at": now,
                }
            },
        )
        db.user_sessions.update_many(
            {"user_id": user["user_id"], "revoked_at": {"$exists": False}},
            {"$set": {"revoked_at": now, "revocation_reason": "superadmin_password_reset"}},
        )
        print(f"Updated existing superadmin: {email}")
        return 0

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    db.users.insert_one(
        {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password_hash": password_hash,
            "role": "superadmin",
            "auth_type": "email",
            "created_at": now,
            "updated_at": now,
            "permissions": {},
            "store_ids": [],
            "active_store_id": None,
            "auth_version": 1,
        }
    )
    print(f"Created superadmin: {email} ({user_id})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
