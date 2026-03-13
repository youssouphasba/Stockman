import argparse
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient


def resolve_mongo_url(cli_value: str | None) -> str:
    mongo_url = cli_value or os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
    if not mongo_url:
        raise SystemExit("MONGO_URL ou MONGODB_URI requis.")
    return mongo_url


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Force all users to reauthenticate.")
    parser.add_argument("--mongo-url", dest="mongo_url", help="MongoDB connection string")
    args = parser.parse_args()

    mongo_url = resolve_mongo_url(args.mongo_url)
    client = MongoClient(mongo_url)
    db = client["stock_management"]
    now = datetime.now(timezone.utc)

    users = db.users.find({}, {"_id": 0, "user_id": 1, "auth_version": 1})
    updated = 0
    for user in users:
        current_auth_version = user.get("auth_version")
        try:
            parsed = int(current_auth_version)
        except (TypeError, ValueError):
            parsed = 1
        if parsed < 1:
            parsed = 1
        db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"auth_version": parsed + 1, "updated_at": now}},
        )
        updated += 1

    result = db.user_sessions.update_many(
        {"revoked_at": {"$exists": False}},
        {"$set": {"revoked_at": now, "revocation_reason": "global_reauth"}},
    )
    print(f"Forced global reauth for {updated} users and revoked {result.modified_count} sessions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
