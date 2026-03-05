"""
Project Service — Gestion des Chantiers / Projets BTP
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase


# Corps de métier (catégories de dépenses dans un chantier)
CORPS_METIER = [
    "gros_oeuvre",       # Maçonnerie, fondations, dalles
    "plomberie",         # Plomberie, sanitaire
    "electricite",       # Électricité, câblage
    "peinture",          # Peinture, décoration
    "carrelage",         # Carrelage, revêtement sol
    "menuiserie",        # Portes, fenêtres, placards
    "toiture",           # Charpente, couverture
    "ferronnerie",       # Portails, grilles, soudure
    "etancheite",        # Étanchéité
    "autre",             # Divers
]


# ═══════════════════════════════ Projects CRUD ═══════════════════════════════

async def create_project(db: AsyncIOMotorDatabase, project_data: dict) -> dict:
    """Créer un nouveau chantier."""
    project = {
        "project_id": f"prj_{uuid.uuid4().hex[:12]}",
        **project_data,
        "status": "devis",
        "actual_cost": 0.0,
        "materials_allocated": [],
        "labor_entries": [],
        "situations": [],
        "notes": project_data.get("notes", ""),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project


async def update_project(db: AsyncIOMotorDatabase, project_id: str, store_id: str, update_data: dict) -> Optional[dict]:
    """Mettre à jour un chantier."""
    update_data["updated_at"] = datetime.now(timezone.utc)

    result = await db.projects.find_one_and_update(
        {"project_id": project_id, "store_id": store_id},
        {"$set": update_data},
        return_document=True
    )
    if result:
        result.pop("_id", None)
    return result


async def list_projects(db: AsyncIOMotorDatabase, store_id: str, status: Optional[str] = None) -> List[dict]:
    """Lister les chantiers d'un magasin."""
    query = {"store_id": store_id}
    if status:
        query["status"] = status
    cursor = db.projects.find(query).sort("created_at", -1)
    projects = []
    async for p in cursor:
        p.pop("_id", None)
        projects.append(p)
    return projects


async def get_project(db: AsyncIOMotorDatabase, project_id: str, store_id: str) -> Optional[dict]:
    """Récupérer un chantier par ID."""
    project = await db.projects.find_one({"project_id": project_id, "store_id": store_id})
    if project:
        project.pop("_id", None)
    return project


# ═══════════════════════════════ Material Allocation ═══════════════════════════

async def allocate_material(
    db: AsyncIOMotorDatabase, project_id: str, store_id: str,
    product_id: str, quantity: float, corps_metier: str = "autre",
    user_id: str = ""
) -> dict:
    """Affecter du matériau du stock vers un chantier (sortie de stock)."""
    project = await db.projects.find_one({"project_id": project_id, "store_id": store_id})
    if not project:
        raise ValueError("Project not found")
    if project["status"] not in ("devis", "en_cours"):
        raise ValueError("Cannot allocate materials to a completed project")

    # Vérifier le produit en stock
    product = await db.products.find_one({"product_id": product_id, "store_id": store_id})
    if not product:
        raise ValueError("Product not found in inventory")
    if product["quantity"] < quantity:
        raise ValueError(
            f"Insufficient stock for '{product['name']}': needs {quantity}, has {product['quantity']}"
        )

    unit_cost = product.get("purchase_price", 0) or 0
    total_cost = unit_cost * quantity

    allocation = {
        "allocation_id": f"alloc_{uuid.uuid4().hex[:8]}",
        "product_id": product_id,
        "name": product.get("name", ""),
        "quantity": quantity,
        "unit": product.get("unit", ""),
        "unit_cost": unit_cost,
        "total_cost": total_cost,
        "corps_metier": corps_metier,
        "allocated_at": datetime.now(timezone.utc),
    }

    # Déduire du stock
    await db.products.update_one(
        {"product_id": product_id, "store_id": store_id},
        {"$inc": {"quantity": -int(quantity)}}
    )

    # Mouvement de stock
    movement = {
        "movement_id": f"mv_{uuid.uuid4().hex[:12]}",
        "product_id": product_id,
        "store_id": store_id,
        "user_id": user_id,
        "type": "out",
        "quantity": int(quantity),
        "reason": f"Chantier: {project['name']} ({corps_metier}) #{project_id}",
        "created_at": datetime.now(timezone.utc),
    }
    await db.stock_movements.insert_one(movement)

    # Ajouter au chantier
    await db.projects.update_one(
        {"project_id": project_id, "store_id": store_id},
        {
            "$push": {"materials_allocated": allocation},
            "$inc": {"actual_cost": total_cost},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        }
    )

    project = await get_project(db, project_id, store_id)
    return project


async def return_material(
    db: AsyncIOMotorDatabase, project_id: str, store_id: str,
    allocation_id: str, return_qty: float, user_id: str = ""
) -> dict:
    """Retourner du matériau non utilisé d'un chantier vers le stock."""
    project = await db.projects.find_one({"project_id": project_id, "store_id": store_id})
    if not project:
        raise ValueError("Project not found")

    # Trouver l'allocation
    alloc = None
    for a in project.get("materials_allocated", []):
        if a["allocation_id"] == allocation_id:
            alloc = a
            break
    if not alloc:
        raise ValueError("Allocation not found")
    if return_qty > alloc["quantity"]:
        raise ValueError("Return quantity exceeds allocated quantity")

    # Remettre en stock
    await db.products.update_one(
        {"product_id": alloc["product_id"], "store_id": store_id},
        {"$inc": {"quantity": int(return_qty)}}
    )

    # Mouvement de stock
    movement = {
        "movement_id": f"mv_{uuid.uuid4().hex[:12]}",
        "product_id": alloc["product_id"],
        "store_id": store_id,
        "user_id": user_id,
        "type": "in",
        "quantity": int(return_qty),
        "reason": f"Retour chantier: {project['name']} #{project_id}",
        "created_at": datetime.now(timezone.utc),
    }
    await db.stock_movements.insert_one(movement)

    # Mettre à jour l'allocation
    cost_returned = alloc["unit_cost"] * return_qty
    alloc["quantity"] -= return_qty
    alloc["total_cost"] -= cost_returned

    await db.projects.update_one(
        {"project_id": project_id, "store_id": store_id,
         "materials_allocated.allocation_id": allocation_id},
        {
            "$set": {
                "materials_allocated.$.quantity": alloc["quantity"],
                "materials_allocated.$.total_cost": alloc["total_cost"],
                "updated_at": datetime.now(timezone.utc),
            },
            "$inc": {"actual_cost": -cost_returned},
        }
    )

    project = await get_project(db, project_id, store_id)
    return project


# ═══════════════════════════════ Labor ═══════════════════════════════════

async def add_labor(
    db: AsyncIOMotorDatabase, project_id: str, store_id: str,
    name: str, role: str, days: float, daily_rate: float,
    corps_metier: str = "autre"
) -> dict:
    """Ajouter une entrée de main d'œuvre à un chantier."""
    project = await db.projects.find_one({"project_id": project_id, "store_id": store_id})
    if not project:
        raise ValueError("Project not found")

    total = days * daily_rate
    entry = {
        "labor_id": f"lab_{uuid.uuid4().hex[:8]}",
        "name": name,
        "role": role,
        "days": days,
        "daily_rate": daily_rate,
        "total": total,
        "corps_metier": corps_metier,
        "added_at": datetime.now(timezone.utc),
    }

    await db.projects.update_one(
        {"project_id": project_id, "store_id": store_id},
        {
            "$push": {"labor_entries": entry},
            "$inc": {"actual_cost": total},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        }
    )

    project = await get_project(db, project_id, store_id)
    return project


# ═══════════════════════════════ Situations (Facturation) ═══════════════════

async def add_situation(
    db: AsyncIOMotorDatabase, project_id: str, store_id: str,
    label: str, percent: float, amount: float, notes: str = ""
) -> dict:
    """Ajouter une situation de travaux (facturation progressive)."""
    project = await db.projects.find_one({"project_id": project_id, "store_id": store_id})
    if not project:
        raise ValueError("Project not found")

    situation = {
        "situation_id": f"sit_{uuid.uuid4().hex[:8]}",
        "label": label,
        "percent": percent,
        "amount": amount,
        "notes": notes,
        "paid": False,
        "date": datetime.now(timezone.utc),
    }

    await db.projects.update_one(
        {"project_id": project_id, "store_id": store_id},
        {
            "$push": {"situations": situation},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        }
    )

    project = await get_project(db, project_id, store_id)
    return project


# ═══════════════════════════════ Complete ═══════════════════════════════════

async def complete_project(db: AsyncIOMotorDatabase, project_id: str, store_id: str) -> dict:
    """Clôturer un chantier."""
    project = await db.projects.find_one({"project_id": project_id, "store_id": store_id})
    if not project:
        raise ValueError("Project not found")
    if project["status"] == "termine":
        raise ValueError("Project already completed")

    await db.projects.update_one(
        {"project_id": project_id, "store_id": store_id},
        {"$set": {
            "status": "termine",
            "actual_end_date": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    project = await get_project(db, project_id, store_id)
    return project


# ═══════════════════════════════ Dashboard ═══════════════════════════════════

async def get_project_dashboard(db: AsyncIOMotorDatabase, store_id: str) -> dict:
    """KPIs des chantiers."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Chantiers actifs
    active = await db.projects.count_documents({
        "store_id": store_id, "status": {"$in": ["devis", "en_cours"]}
    })

    # Terminés ce mois
    completed_month = await db.projects.count_documents({
        "store_id": store_id, "status": "termine",
        "actual_end_date": {"$gte": month_start},
    })

    # Total budget vs coût réel
    pipeline = [
        {"$match": {"store_id": store_id, "status": {"$in": ["en_cours", "termine"]}}},
        {"$group": {
            "_id": None,
            "total_budget": {"$sum": "$budget_estimate"},
            "total_actual": {"$sum": "$actual_cost"},
            "total_invoiced": {"$sum": {"$reduce": {
                "input": "$situations",
                "initialValue": 0,
                "in": {"$add": ["$$value", "$$this.amount"]},
            }}},
        }}
    ]
    agg = await db.projects.aggregate(pipeline).to_list(1)
    stats = agg[0] if agg else {"total_budget": 0, "total_actual": 0, "total_invoiced": 0}

    total_budget = stats.get("total_budget", 0) or 0
    total_actual = stats.get("total_actual", 0) or 0
    margin_pct = round(
        ((total_budget - total_actual) / total_budget * 100) if total_budget > 0 else 0, 1
    )

    return {
        "active_projects": active,
        "completed_month": completed_month,
        "total_budget": total_budget,
        "total_actual": total_actual,
        "total_invoiced": stats.get("total_invoiced", 0) or 0,
        "margin_percent": margin_pct,
    }
