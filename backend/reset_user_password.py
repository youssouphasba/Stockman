import argparse
import os
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

    parser = argparse.ArgumentParser(description="Reset a user password and revoke active sessions.")
    parser.add_argument("--email", help="User email")
    parser.add_argument("--password", help="New password")
    parser.add_argument("--mongo-url", dest="mongo_url", help="MongoDB connection string")
    args = parser.parse_args()

    email = resolve_required_value(args.email, "RESET_USER_EMAIL", "User email")
    password = resolve_required_value(args.password, "RESET_USER_PASSWORD", "New password")
    mongo_url = resolve_mongo_url(args.mongo_url)
    client = MongoClient(mongo_url)
    db = client["stock_management"]

    user = db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise SystemExit(f"Utilisateur introuvable: {email}")

    now = datetime.now(timezone.utc)
    auth_version = normalize_auth_version(user.get("auth_version")) + 1
    db.users.update_one(
        {"email": email},
        {
            "$set": {
                "password_hash": get_password_hash(password),
                "auth_version": auth_version,
                "updated_at": now,
            }
        },
    )
    db.user_sessions.update_many(
        {"user_id": user["user_id"], "revoked_at": {"$exists": False}},
        {"$set": {"revoked_at": now, "revocation_reason": "password_reset"}},
    )
    print(f"Password reset and sessions revoked for: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
