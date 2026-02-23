"""
Script de développement — Passe les comptes de test en plan enterprise.
Usage :
    python set_enterprise.py                          # Liste tous les users
    python set_enterprise.py all                      # Passe TOUS les shopkeepers en enterprise
    python set_enterprise.py email@example.com        # Passe un user spécifique en enterprise
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL') or os.environ.get('MONGODB_URI') or 'mongodb://localhost:27017'
DB_NAME   = os.environ.get('DB_NAME', 'stock_management')

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    arg = sys.argv[1] if len(sys.argv) > 1 else None

    if arg is None:
        # Lister tous les users
        users = await db.users.find(
            {"role": "shopkeeper"},
            {"user_id": 1, "email": 1, "name": 1, "plan": 1, "subscription_status": 1, "_id": 0}
        ).to_list(200)
        print(f"\n{'Email':<35} {'Plan':<12} {'Status'}")
        print("-" * 60)
        for u in users:
            print(f"{u.get('email',''):<35} {u.get('plan','?'):<12} {u.get('subscription_status','?')}")
        print(f"\nTotal : {len(users)} shopkeepers")
        print("\nUsage :")
        print("  python set_enterprise.py all               → tous en enterprise")
        print("  python set_enterprise.py email@test.com    → un user spécifique")

    elif arg == "all":
        result = await db.users.update_many(
            {"role": "shopkeeper"},
            {"$set": {"plan": "enterprise", "subscription_status": "active"}}
        )
        print(f"✅ {result.modified_count} compte(s) passé(s) en enterprise.")

    else:
        # Chercher par email
        user = await db.users.find_one({"email": arg})
        if not user:
            print(f"❌ Aucun user trouvé avec l'email : {arg}")
        else:
            await db.users.update_one(
                {"email": arg},
                {"$set": {"plan": "enterprise", "subscription_status": "active"}}
            )
            print(f"✅ {user['email']} ({user.get('name','')}) → plan enterprise")

    client.close()

asyncio.run(main())
