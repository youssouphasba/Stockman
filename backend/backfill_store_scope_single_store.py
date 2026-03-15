"""
Backfill legacy documents missing `store_id` for accounts with exactly one store.

Safe scope:
- customers
- customer_payments
- promotions
- suppliers
- campaigns

Usage:
    python backfill_store_scope_single_store.py          # Dry-run
    python backfill_store_scope_single_store.py apply    # Apply updates
"""

import asyncio
import os
import sys
from collections import defaultdict

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

COLLECTIONS = [
    "customers",
    "customer_payments",
    "promotions",
    "suppliers",
    "campaigns",
]


async def build_single_store_owner_map(db) -> dict[str, str]:
    stores = await db.stores.find(
        {"store_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "user_id": 1, "store_id": 1},
    ).to_list(None)
    by_owner: dict[str, set[str]] = defaultdict(set)
    for store in stores:
        owner_id = store.get("user_id")
        store_id = store.get("store_id")
        if owner_id and store_id:
            by_owner[owner_id].add(store_id)
    return {
        owner_id: next(iter(store_ids))
        for owner_id, store_ids in by_owner.items()
        if len(store_ids) == 1
    }


async def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry-run"
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(mongo_url)
    db = client.stockman

    owner_store_map = await build_single_store_owner_map(db)
    print(f"Single-store owners detected: {len(owner_store_map)}")
    if not owner_store_map:
        client.close()
        return

    total_candidates = 0
    updates: list[tuple[str, str, str, int]] = []
    legacy_filter = {"$or": [{"store_id": {"$exists": False}}, {"store_id": None}, {"store_id": ""}]}

    for collection_name in COLLECTIONS:
        collection = db[collection_name]
        for owner_id, store_id in owner_store_map.items():
            query = {"user_id": owner_id, **legacy_filter}
            count = await collection.count_documents(query)
            if count <= 0:
                continue
            total_candidates += count
            updates.append((collection_name, owner_id, store_id, count))

    if not updates:
        print("No legacy store-scoped documents to backfill.")
        client.close()
        return

    print(f"Legacy documents to backfill: {total_candidates}\n")
    for collection_name, owner_id, store_id, count in updates:
        print(f"- {collection_name}: {count} docs for owner {owner_id} -> {store_id}")

    if mode != "apply":
        print("\nDry-run mode. Run with 'apply' to persist changes.")
        client.close()
        return

    print("\nApplying backfill...")
    for collection_name, owner_id, store_id, _count in updates:
        collection = db[collection_name]
        query = {"user_id": owner_id, **legacy_filter}
        await collection.update_many(query, {"$set": {"store_id": store_id}})
    print("Backfill complete.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
