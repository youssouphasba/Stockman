"""
Migration : fix null/missing fields on legacy users for Pydantic V2 compatibility.

Sets default values directly in MongoDB so all user documents are clean.

Usage:
    python migrate_null_fields.py          # Dry-run (shows what would change)
    python migrate_null_fields.py apply    # Apply fixes in MongoDB
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

DEFAULTS = {
    "role": "shopkeeper",
    "store_ids": [],
    "permissions": {},
    "plan": "starter",
    "subscription_status": "active",
    "subscription_provider": "none",
    "currency": "XOF",
    "language": "fr",
    "is_phone_verified": False,
    "auth_type": "email",
}

async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry-run"
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client.stockman

    users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, **{k: 1 for k in DEFAULTS}}).to_list(None)
    print(f"Total users in DB: {len(users)}\n")

    to_fix = []
    for u in users:
        fixes = {}
        for field, default in DEFAULTS.items():
            if u.get(field) is None or (field == "role" and not u.get(field)):
                fixes[field] = default
        if fixes:
            to_fix.append((u["user_id"], u.get("email", "?"), fixes))

    if not to_fix:
        print("All users are clean — nothing to fix.")
        client.close()
        return

    print(f"Users needing fixes: {len(to_fix)}\n")
    for user_id, email, fixes in to_fix:
        print(f"  {email} ({user_id}): {fixes}")

    if mode == "apply":
        print(f"\nApplying fixes...")
        for user_id, email, fixes in to_fix:
            await db.users.update_one({"user_id": user_id}, {"$set": fixes})
        print(f"Done — {len(to_fix)} users fixed.")
    else:
        print(f"\nDry-run mode. Run with 'apply' to fix.")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
