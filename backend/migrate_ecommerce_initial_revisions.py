"""
Migration : version d'origine des sites e-commerce (Stockman Basic)

Pour chaque site e-commerce sans version publiée enregistrée, crée une révision « initiale »
à partir des champs historiques du compte (nom du site, titre et message d'accueil, couleur,
logo de la bibliothèque) et la signale comme version en ligne. L'historique des versions
permet ensuite de revenir au site d'origine.

Garanties :
  - le rendu public, les domaines, les produits, les ventes, les commandes et les paiements
    ne sont ni lus ni modifiés : seules les collections de versions de thèmes sont écrites ;
  - une valeur historique incompatible est signalée, jamais corrigée ;
  - relancer la migration ne crée rien de plus (idempotence).

Usage (depuis le dossier backend) :
    python migrate_ecommerce_initial_revisions.py          # Simulation : affiche sans modifier
    python migrate_ecommerce_initial_revisions.py apply    # Applique la migration
"""

import asyncio
import os
import sys
from collections import Counter
from typing import Callable

from ecommerce_theme_service import EcommerceThemeService

STATUS_LABELS = {
    "would_record": "à enregistrer",
    "recorded": "enregistrés",
    "invalid": "valeurs historiques incompatibles (non modifiés)",
    "skipped": "déjà à jour ou sans site",
}


async def run(db, apply: bool, out: Callable[[str], None] = print) -> Counter:
    """Parcourt les sites e-commerce et enregistre leur version d'origine si nécessaire."""
    service = EcommerceThemeService(db)
    counts: Counter = Counter()
    accounts = await db.business_accounts.find({"ecommerce_slug": {"$exists": True, "$ne": None}}, {"_id": 0}).to_list(length=None)
    for account in accounts:
        result = await service.record_initial_revision(account, apply=apply)
        counts[result["status"]] += 1
        if result["status"] == "invalid":
            out(f"  {account.get('account_id')} ({account.get('ecommerce_slug')}) : {result['reason']} sur {result['path']}")
        elif result["status"] == "skipped" and result["reason"] == "concurrent_change":
            out(f"  {account.get('account_id')} ({account.get('ecommerce_slug')}) : modifié pendant la migration, à relancer")
    return counts


async def main() -> None:
    from dotenv import load_dotenv
    from motor.motor_asyncio import AsyncIOMotorClient

    load_dotenv()
    mongo_url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
    db_name = os.environ.get("DB_NAME", "stock_management")
    apply = len(sys.argv) > 1 and sys.argv[1] == "apply"

    client = AsyncIOMotorClient(mongo_url)
    try:
        print(f"\nVersion d'origine des sites e-commerce - mode : {'APPLICATION' if apply else 'SIMULATION'}\n")
        counts = await run(client[db_name], apply)
        print("\nRésumé :")
        for status, label in STATUS_LABELS.items():
            print(f"  {label} : {counts.get(status, 0)}")
        if not apply:
            print("\nSimulation : aucune modification effectuée.")
            print("Relancez avec 'apply' pour appliquer : python migrate_ecommerce_initial_revisions.py apply")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
