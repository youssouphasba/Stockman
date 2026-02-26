"""
Migration : plan 'premium' → 'starter' ou 'pro'

Logique :
  - 1 boutique  → starter  (1 boutique, 1 user)
  - ≥2 boutiques → pro     (2 boutiques, 5 users)

Usage :
    python migrate_premium_plans.py          # Mode dry-run (affiche sans modifier)
    python migrate_premium_plans.py apply    # Applique la migration
    python migrate_premium_plans.py report   # Résumé par plan sans modifier
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
    mode = sys.argv[1] if len(sys.argv) > 1 else 'dry-run'

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Récupérer tous les users avec plan 'premium'
    premium_users = await db.users.find(
        {"role": "shopkeeper", "plan": "premium"},
        {"user_id": 1, "email": 1, "name": 1, "plan": 1, "subscription_status": 1, "_id": 0}
    ).to_list(1000)

    if not premium_users:
        print("✅ Aucun user avec plan 'premium' trouvé. Migration inutile.")
        client.close()
        return

    print(f"\n{'='*70}")
    print(f"  Migration plan 'premium' → 'starter' / 'pro'")
    print(f"  Mode : {mode.upper()}")
    print(f"{'='*70}\n")
    print(f"{'Email':<35} {'Boutiques':<12} {'→ Plan'}")
    print("-" * 60)

    starter_ids = []
    pro_ids = []

    for user in premium_users:
        uid = user['user_id']

        # Compter les boutiques de cet utilisateur
        store_count = await db.stores.count_documents({"owner_id": uid})

        target_plan = 'pro' if store_count >= 2 else 'starter'

        print(f"{user.get('email',''):<35} {store_count:<12} → {target_plan}")

        if target_plan == 'starter':
            starter_ids.append(uid)
        else:
            pro_ids.append(uid)

    print(f"\nRésumé :")
    print(f"  → starter : {len(starter_ids)} user(s)")
    print(f"  → pro     : {len(pro_ids)} user(s)")
    print(f"  TOTAL     : {len(premium_users)} user(s) premium\n")

    if mode != 'apply':
        print("ℹ️  Mode dry-run. Aucune modification effectuée.")
        print("    Relancez avec 'apply' pour appliquer : python migrate_premium_plans.py apply")
        client.close()
        return

    # Application
    if starter_ids:
        res = await db.users.update_many(
            {"user_id": {"$in": starter_ids}},
            {"$set": {"plan": "starter"}}
        )
        print(f"✅ {res.modified_count} user(s) migré(s) → starter")

    if pro_ids:
        res = await db.users.update_many(
            {"user_id": {"$in": pro_ids}},
            {"$set": {"plan": "pro"}}
        )
        print(f"✅ {res.modified_count} user(s) migré(s) → pro")

    # Vérification finale
    remaining = await db.users.count_documents({"role": "shopkeeper", "plan": "premium"})
    print(f"\n{'✅' if remaining == 0 else '⚠️'} Users 'premium' restants : {remaining}")
    print("Migration terminée.")

    client.close()


asyncio.run(main())
