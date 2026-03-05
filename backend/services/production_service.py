"""
Production Service — Gestion des Recettes et Ordres de Fabrication
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_recipe(db: AsyncIOMotorDatabase, recipe_data: dict) -> dict:
    """Créer une recette avec calcul automatique du coût."""
    recipe = {
        "recipe_id": f"rcp_{uuid.uuid4().hex[:12]}",
        **recipe_data,
        "computed_cost": 0.0,
        "total_cost": 0.0,
        "margin_percent": 0.0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    # Calcul du coût des ingrédients
    recipe = await _compute_recipe_cost(db, recipe)

    await db.recipes.insert_one(recipe)
    recipe.pop("_id", None)
    return recipe


async def update_recipe(db: AsyncIOMotorDatabase, recipe_id: str, store_id: str, update_data: dict) -> Optional[dict]:
    """Mettre à jour une recette."""
    update_data["updated_at"] = datetime.now(timezone.utc)

    existing = await db.recipes.find_one({"recipe_id": recipe_id, "store_id": store_id})
    if not existing:
        return None

    # Merge
    for k, v in update_data.items():
        if v is not None:
            existing[k] = v

    # Recalcul du coût
    existing = await _compute_recipe_cost(db, existing)

    await db.recipes.update_one(
        {"recipe_id": recipe_id, "store_id": store_id},
        {"$set": existing}
    )
    existing.pop("_id", None)
    return existing


async def delete_recipe(db: AsyncIOMotorDatabase, recipe_id: str, store_id: str) -> bool:
    """Supprimer une recette."""
    result = await db.recipes.delete_one({"recipe_id": recipe_id, "store_id": store_id})
    return result.deleted_count > 0


async def list_recipes(db: AsyncIOMotorDatabase, store_id: str) -> List[dict]:
    """Lister toutes les recettes d'un magasin."""
    cursor = db.recipes.find({"store_id": store_id}).sort("name", 1)
    recipes = []
    async for r in cursor:
        r.pop("_id", None)
        recipes.append(r)
    return recipes


async def get_recipe(db: AsyncIOMotorDatabase, recipe_id: str, store_id: str) -> Optional[dict]:
    """Récupérer une recette par ID."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id, "store_id": store_id})
    if recipe:
        recipe.pop("_id", None)
    return recipe


async def check_feasibility(db: AsyncIOMotorDatabase, recipe_id: str, store_id: str) -> dict:
    """Vérifier combien de batches sont possibles avec le stock actuel."""
    recipe = await db.recipes.find_one({"recipe_id": recipe_id, "store_id": store_id})
    if not recipe:
        return {"max_batches": 0, "limiting_ingredient": None, "details": []}

    max_batches = float("inf")
    limiting = None
    details = []

    for ingredient in recipe.get("ingredients", []):
        product = await db.products.find_one({
            "product_id": ingredient["product_id"],
            "store_id": store_id
        })
        available = product["quantity"] if product else 0
        needed = ingredient["quantity"]
        possible = int(available / needed) if needed > 0 else 0

        details.append({
            "product_id": ingredient["product_id"],
            "name": ingredient.get("name", "?"),
            "available": available,
            "needed_per_batch": needed,
            "unit": ingredient.get("unit", ""),
            "max_batches": possible,
        })

        if possible < max_batches:
            max_batches = possible
            limiting = ingredient.get("name", "?")

    return {
        "max_batches": int(max_batches) if max_batches != float("inf") else 0,
        "limiting_ingredient": limiting,
        "details": details,
    }


# ═══════════════════════════════ Production Orders ═══════════════════════════

async def create_production_order(db: AsyncIOMotorDatabase, order_data: dict) -> dict:
    """Créer un ordre de production (statut: planned)."""
    recipe = await db.recipes.find_one({
        "recipe_id": order_data["recipe_id"],
        "store_id": order_data["store_id"]
    })
    if not recipe:
        raise ValueError("Recipe not found")

    multiplier = order_data.get("batch_multiplier", 1.0)

    order = {
        "order_id": f"po_{uuid.uuid4().hex[:12]}",
        "store_id": order_data["store_id"],
        "recipe_id": recipe["recipe_id"],
        "recipe_name": recipe["name"],
        "batch_multiplier": multiplier,
        "planned_output": recipe.get("output_quantity", 1) * multiplier,
        "actual_output": None,
        "output_product_id": recipe.get("output_product_id"),
        "output_unit": recipe.get("output_unit", "pièce"),
        "status": "planned",
        "planned_date": order_data.get("planned_date", datetime.now(timezone.utc)),
        "started_at": None,
        "completed_at": None,
        "ingredients_consumed": [
            {
                "product_id": ing["product_id"],
                "name": ing.get("name", ""),
                "planned_qty": ing["quantity"] * multiplier,
                "actual_qty": None,
                "unit": ing.get("unit", ""),
                "unit_cost": 0.0,
            }
            for ing in recipe.get("ingredients", [])
        ],
        "total_material_cost": (recipe.get("computed_cost", 0) or 0) * multiplier,
        "waste_quantity": 0,
        "notes": order_data.get("notes", ""),
        "created_by": order_data.get("created_by", ""),
        "created_at": datetime.now(timezone.utc),
    }

    await db.production_orders.insert_one(order)
    order.pop("_id", None)
    return order


async def start_production(db: AsyncIOMotorDatabase, order_id: str, store_id: str) -> dict:
    """Démarrer un ordre de production : déduire les matières premières du stock."""
    order = await db.production_orders.find_one({"order_id": order_id, "store_id": store_id})
    if not order:
        raise ValueError("Production order not found")
    if order["status"] != "planned":
        raise ValueError(f"Cannot start order with status '{order['status']}'")

    # Vérifier et déduire le stock des matières premières
    for ing in order["ingredients_consumed"]:
        product = await db.products.find_one({
            "product_id": ing["product_id"],
            "store_id": store_id
        })
        if not product:
            raise ValueError(f"Ingredient '{ing['name']}' not found in inventory")

        needed = ing["planned_qty"]
        if product["quantity"] < needed:
            raise ValueError(
                f"Insufficient stock for '{ing['name']}': needs {needed}, has {product['quantity']}"
            )

        # Enregistrer le coût unitaire au moment de la consommation
        ing["unit_cost"] = product.get("purchase_price", 0)
        ing["actual_qty"] = needed

        # Déduire du stock
        await db.products.update_one(
            {"product_id": ing["product_id"], "store_id": store_id},
            {"$inc": {"quantity": -int(needed)}}
        )

        # Créer un mouvement de stock (sortie pour production)
        movement = {
            "movement_id": f"mv_{uuid.uuid4().hex[:12]}",
            "product_id": ing["product_id"],
            "store_id": store_id,
            "user_id": order.get("created_by", ""),
            "type": "out",
            "quantity": int(needed),
            "reason": f"Production: {order['recipe_name']} (#{order_id})",
            "created_at": datetime.now(timezone.utc),
        }
        await db.stock_movements.insert_one(movement)

    # Recalcul du coût réel
    total_cost = sum(
        (ing.get("actual_qty", 0) or 0) * (ing.get("unit_cost", 0) or 0)
        for ing in order["ingredients_consumed"]
    )

    await db.production_orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc),
            "ingredients_consumed": order["ingredients_consumed"],
            "total_material_cost": total_cost,
        }}
    )

    order["status"] = "in_progress"
    order["started_at"] = datetime.now(timezone.utc)
    order["total_material_cost"] = total_cost
    order.pop("_id", None)
    return order


async def complete_production(
    db: AsyncIOMotorDatabase, order_id: str, store_id: str,
    actual_output: float, waste_quantity: float = 0
) -> dict:
    """Terminer la production : ajouter les produits finis au stock."""
    order = await db.production_orders.find_one({"order_id": order_id, "store_id": store_id})
    if not order:
        raise ValueError("Production order not found")
    if order["status"] != "in_progress":
        raise ValueError(f"Cannot complete order with status '{order['status']}'")

    # Ajouter le produit fini au stock
    output_product_id = order.get("output_product_id")
    if output_product_id:
        await db.products.update_one(
            {"product_id": output_product_id, "store_id": store_id},
            {"$inc": {"quantity": int(actual_output)}}
        )
        # Mouvement de stock (entrée production)
        movement = {
            "movement_id": f"mv_{uuid.uuid4().hex[:12]}",
            "product_id": output_product_id,
            "store_id": store_id,
            "user_id": order.get("created_by", ""),
            "type": "in",
            "quantity": int(actual_output),
            "reason": f"Production terminée: {order['recipe_name']} (#{order_id})",
            "created_at": datetime.now(timezone.utc),
        }
        await db.stock_movements.insert_one(movement)

    now = datetime.now(timezone.utc)
    await db.production_orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "completed",
            "completed_at": now,
            "actual_output": actual_output,
            "waste_quantity": waste_quantity,
        }}
    )

    order["status"] = "completed"
    order["completed_at"] = now
    order["actual_output"] = actual_output
    order["waste_quantity"] = waste_quantity
    order.pop("_id", None)
    return order


async def cancel_production(db: AsyncIOMotorDatabase, order_id: str, store_id: str) -> dict:
    """Annuler un ordre : remettre les matières premières si déjà déduites."""
    order = await db.production_orders.find_one({"order_id": order_id, "store_id": store_id})
    if not order:
        raise ValueError("Production order not found")
    if order["status"] == "completed":
        raise ValueError("Cannot cancel a completed order")

    # Si l'ordre était en cours → remettre les matières premières
    if order["status"] == "in_progress":
        for ing in order["ingredients_consumed"]:
            qty = ing.get("actual_qty") or ing.get("planned_qty", 0)
            if qty > 0:
                await db.products.update_one(
                    {"product_id": ing["product_id"], "store_id": store_id},
                    {"$inc": {"quantity": int(qty)}}
                )
                # Mouvement de stock (retour matière)
                movement = {
                    "movement_id": f"mv_{uuid.uuid4().hex[:12]}",
                    "product_id": ing["product_id"],
                    "store_id": store_id,
                    "user_id": order.get("created_by", ""),
                    "type": "in",
                    "quantity": int(qty),
                    "reason": f"Production annulée: {order['recipe_name']} (#{order_id})",
                    "created_at": datetime.now(timezone.utc),
                }
                await db.stock_movements.insert_one(movement)

    await db.production_orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": "cancelled"}}
    )

    order["status"] = "cancelled"
    order.pop("_id", None)
    return order


async def list_production_orders(
    db: AsyncIOMotorDatabase, store_id: str,
    status: Optional[str] = None, limit: int = 50
) -> List[dict]:
    """Lister les ordres de production."""
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    cursor = db.production_orders.find(query).sort("created_at", -1).limit(limit)
    orders = []
    async for o in cursor:
        o.pop("_id", None)
        orders.append(o)
    return orders


async def get_production_dashboard(db: AsyncIOMotorDatabase, store_id: str) -> dict:
    """KPIs de production pour le dashboard."""
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Productions du jour
    today_orders = await db.production_orders.count_documents({
        "store_id": store_id,
        "status": "completed",
        "completed_at": {"$gte": today_start},
    })

    # Productions du mois
    month_orders = await db.production_orders.count_documents({
        "store_id": store_id,
        "status": "completed",
        "completed_at": {"$gte": month_start},
    })

    # Coût total du mois
    pipeline = [
        {"$match": {
            "store_id": store_id,
            "status": "completed",
            "completed_at": {"$gte": month_start},
        }},
        {"$group": {
            "_id": None,
            "total_cost": {"$sum": "$total_material_cost"},
            "total_produced": {"$sum": "$actual_output"},
            "total_waste": {"$sum": "$waste_quantity"},
        }}
    ]
    agg = await db.production_orders.aggregate(pipeline).to_list(1)
    stats = agg[0] if agg else {"total_cost": 0, "total_produced": 0, "total_waste": 0}

    # Recettes actives
    active_recipes = await db.recipes.count_documents({"store_id": store_id, "is_active": True})

    # En cours
    in_progress = await db.production_orders.count_documents({
        "store_id": store_id, "status": "in_progress"
    })

    total_produced = stats.get("total_produced", 0) or 0
    total_waste = stats.get("total_waste", 0) or 0
    waste_pct = (total_waste / (total_produced + total_waste) * 100) if (total_produced + total_waste) > 0 else 0

    return {
        "today_productions": today_orders,
        "month_productions": month_orders,
        "month_cost": stats.get("total_cost", 0) or 0,
        "month_produced": total_produced,
        "waste_percent": round(waste_pct, 1),
        "active_recipes": active_recipes,
        "in_progress": in_progress,
    }


# ═══════════════════════════════ Helpers ═══════════════════════════════════

async def _compute_recipe_cost(db: AsyncIOMotorDatabase, recipe: dict) -> dict:
    """Calcule le coût des matières premières d'une recette."""
    total = 0.0
    for ing in recipe.get("ingredients", []):
        product = await db.products.find_one({"product_id": ing["product_id"]})
        if product:
            unit_cost = product.get("purchase_price", 0) or 0
            total += unit_cost * ing.get("quantity", 0)
            # Dénormaliser le nom
            ing["name"] = product.get("name", ing.get("name", ""))

    recipe["computed_cost"] = round(total, 2)
    labor = recipe.get("labor_cost", 0) or 0
    energy = recipe.get("energy_cost", 0) or 0
    recipe["total_cost"] = round(total + labor + energy, 2)

    # Calcul de la marge si un produit fini est lié
    output_id = recipe.get("output_product_id")
    if output_id:
        product = await db.products.find_one({"product_id": output_id})
        if product:
            selling = product.get("selling_price", 0) or 0
            output_qty = recipe.get("output_quantity", 1) or 1
            cost_per_unit = recipe["total_cost"] / output_qty if output_qty > 0 else 0
            recipe["margin_percent"] = round(
                ((selling - cost_per_unit) / cost_per_unit * 100) if cost_per_unit > 0 else 0, 1
            )

    return recipe
