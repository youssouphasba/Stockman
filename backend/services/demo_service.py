from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from constants.sectors import normalize_sector
from services.pricing import DEFAULT_COUNTRY_CODE, build_pricing_payload
from enterprise_access import default_modules, default_notification_contacts


DEMO_TYPE_ALIASES = {
    "retail": "retail",
    "commerce": "retail",
    "shop": "retail",
    "boutique": "retail",
    "epicerie": "retail",
    "epicerie_ou_boutique": "retail",
    "grocery": "retail",
    "restaurant": "restaurant",
    "food": "restaurant",
    "enterprise": "enterprise",
    "entreprise": "enterprise",
    "supermarche": "enterprise",
    "supermarket": "enterprise",
    "logistique": "enterprise",
    "logistics": "enterprise",
}


DEMO_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "retail": {
        "demo_type": "retail",
        "label": "Epicerie ou boutique",
        "surface": "mobile",
        "duration_hours": 24,
        "plan": "pro",
        "business_type": "epicerie",
        "store_names": ["Boutique Plateau"],
        "staff_profiles": [
            {
                "role": "cashier",
                "name": "Aminata Caissiere",
                "permissions": {"pos": "write", "crm": "read"},
            },
        ],
    },
    "restaurant": {
        "demo_type": "restaurant",
        "label": "Restaurant",
        "surface": "mobile",
        "duration_hours": 24,
        "plan": "pro",
        "business_type": "restaurant",
        "store_names": ["Le Bistrot Demo"],
        "staff_profiles": [
            {
                "role": "server",
                "name": "Moussa Salle",
                "permissions": {"pos": "write", "crm": "read"},
            },
        ],
    },
    "enterprise": {
        "demo_type": "enterprise",
        "label": "Entreprise",
        "surface": "web",
        "duration_hours": 48,
        "plan": "enterprise",
        "business_type": "supermarche",
        "store_names": ["Supermarche Centre", "Supermarche Nord", "Depot Logistique"],
        "staff_profiles": [
            {
                "role": "stock_manager",
                "name": "Fatou Stock",
                "permissions": {"stock": "write", "suppliers": "write"},
            },
            {
                "role": "accountant",
                "name": "Yao Finance",
                "permissions": {"accounting": "write", "crm": "read"},
            },
        ],
    },
}


def normalize_demo_type(raw_value: Optional[str]) -> str:
    normalized = (raw_value or "").strip().lower()
    if normalized in DEMO_DEFINITIONS:
        return normalized
    return DEMO_TYPE_ALIASES.get(normalized, "retail")


def get_demo_definition(demo_type: str) -> Dict[str, Any]:
    return DEMO_DEFINITIONS[normalize_demo_type(demo_type)]


def resolve_demo_pricing(country_code: Optional[str]) -> Dict[str, Any]:
    return build_pricing_payload(country_code=country_code or DEFAULT_COUNTRY_CODE, currency=None, locked=False)


def build_demo_user_email(contact_email: str, demo_session_id: str) -> str:
    local_part = (contact_email.split("@")[0] if "@" in contact_email else contact_email).strip().lower()
    safe_local = "".join(char for char in local_part if char.isalnum()) or "user"
    return f"demo+{safe_local}.{demo_session_id[-6:]}@stockman.pro"


def _with_demo_metadata(payload: Dict[str, Any], demo_session_id: str, expires_at: datetime) -> Dict[str, Any]:
    enriched = dict(payload)
    enriched["is_demo"] = True
    enriched["demo_session_id"] = demo_session_id
    enriched["demo_expires_at"] = expires_at
    return enriched


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _sale_item(
    product: Dict[str, Any],
    quantity: float,
    *,
    discount_amount: float = 0.0,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    selling_price = float(product.get("selling_price") or 0)
    purchase_price = float(product.get("purchase_price") or 0)
    line_total = max(0.0, round((selling_price * quantity) - discount_amount, 2))
    return {
        "product_id": product["product_id"],
        "product_name": product["name"],
        "quantity": quantity,
        "purchase_price": purchase_price,
        "selling_price": selling_price,
        "discount_amount": round(discount_amount, 2),
        "total": line_total,
        "tax_rate": float(product.get("tax_rate") or 0),
        "tax_amount": 0.0,
        "station": product.get("kitchen_station") or "plat",
        "item_notes": notes,
        "ready": True,
        "sold_quantity_input": quantity,
        "sold_unit": product.get("pricing_unit") or product.get("display_unit") or product.get("unit"),
        "measurement_type": product.get("measurement_type"),
        "pricing_unit": product.get("pricing_unit"),
    }


def _build_store_docs(definition: Dict[str, Any], owner_user_id: str, demo_session_id: str, expires_at: datetime, now: datetime) -> List[Dict[str, Any]]:
    stores: List[Dict[str, Any]] = []
    base_business_type = normalize_sector(definition["business_type"])
    for index, store_name in enumerate(definition["store_names"]):
        store_id = _new_id("store")
        stores.append(_with_demo_metadata({
            "store_id": store_id,
            "user_id": owner_user_id,
            "name": store_name,
            "address": f"{10 + index} Avenue Stockman",
            "phone": f"+22177000{index:03d}",
            "business_type": base_business_type,
            "created_at": now,
            "receipt_business_name": store_name,
            "receipt_footer": "Merci de tester Stockman en mode demo.",
            "invoice_business_name": f"{store_name} - Stockman Demo",
            "invoice_business_address": f"{10 + index} Avenue Stockman",
        }, demo_session_id, expires_at))
    return stores


def _build_category_docs(
    owner_user_id: str,
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
    category_names: List[str],
) -> List[Dict[str, Any]]:
    return [
        _with_demo_metadata({
            "category_id": _new_id("cat"),
            "name": name,
            "color": color,
            "icon": icon,
            "user_id": owner_user_id,
            "created_at": now,
        }, demo_session_id, expires_at)
        for name, color, icon in category_names
    ]


def _build_product_blueprints(demo_type: str) -> List[Dict[str, Any]]:
    if demo_type == "restaurant":
        return [
            {"name": "Thieb Poulet", "category": "Plats", "purchase_price": 1800, "selling_price": 3500, "quantity": 18, "min_stock": 4, "unit": "portion", "station": "plat"},
            {"name": "Yassa Poisson", "category": "Plats", "purchase_price": 2200, "selling_price": 4200, "quantity": 14, "min_stock": 4, "unit": "portion", "station": "plat"},
            {"name": "Burger Maison", "category": "Snacking", "purchase_price": 1300, "selling_price": 2800, "quantity": 20, "min_stock": 5, "unit": "portion", "station": "plat"},
            {"name": "Jus Bissap", "category": "Boissons", "purchase_price": 250, "selling_price": 900, "quantity": 40, "min_stock": 8, "unit": "verre", "station": "boisson"},
            {"name": "Cafe Touba", "category": "Boissons", "purchase_price": 120, "selling_price": 600, "quantity": 32, "min_stock": 10, "unit": "tasse", "station": "boisson"},
            {"name": "Tarte Citron", "category": "Desserts", "purchase_price": 600, "selling_price": 1500, "quantity": 0, "min_stock": 3, "unit": "part", "station": "dessert"},
        ]
    return [
        {"name": "Riz parfumee 25kg", "category": "Epicerie", "purchase_price": 14500, "selling_price": 18500, "quantity": 12, "min_stock": 3, "unit": "sac"},
        {"name": "Huile 5L", "category": "Epicerie", "purchase_price": 4200, "selling_price": 5500, "quantity": 7, "min_stock": 4, "unit": "bidon"},
        {"name": "Lait en poudre", "category": "Epicerie", "purchase_price": 1800, "selling_price": 2500, "quantity": 0, "min_stock": 4, "unit": "boite"},
        {"name": "Sucre 1kg", "category": "Epicerie", "purchase_price": 500, "selling_price": 700, "quantity": 38, "min_stock": 10, "unit": "sachet"},
        {"name": "Savon detergeant", "category": "Hygiene", "purchase_price": 320, "selling_price": 550, "quantity": 19, "min_stock": 6, "unit": "piece"},
        {"name": "Boisson gazeuse", "category": "Boissons", "purchase_price": 280, "selling_price": 500, "quantity": 45, "min_stock": 12, "unit": "bouteille"},
        {"name": "Biscuits assortiment", "category": "Snacking", "purchase_price": 350, "selling_price": 650, "quantity": 9, "min_stock": 5, "unit": "pack"},
        {"name": "Farine 1kg", "category": "Epicerie", "purchase_price": 450, "selling_price": 650, "quantity": 4, "min_stock": 5, "unit": "sachet"},
    ]


def _build_products_for_store(
    demo_type: str,
    owner_user_id: str,
    store: Dict[str, Any],
    categories: List[Dict[str, Any]],
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
    offset_multiplier: int,
) -> List[Dict[str, Any]]:
    category_map = {category["name"]: category["category_id"] for category in categories}
    products: List[Dict[str, Any]] = []
    for index, blueprint in enumerate(_build_product_blueprints(demo_type)):
        quantity = blueprint["quantity"]
        if demo_type == "enterprise":
            quantity = max(0, quantity + (offset_multiplier * 3) - (index % 3))
        products.append(_with_demo_metadata({
            "product_id": _new_id("prod"),
            "name": blueprint["name"],
            "description": "Donnee de demo Stockman",
            "sku": f"DEMO-{offset_multiplier + 1:02d}-{index + 1:02d}",
            "category_id": category_map.get(blueprint["category"]),
            "quantity": float(quantity),
            "unit": blueprint.get("unit", "piece"),
            "measurement_type": "unit",
            "allows_fractional_sale": False,
            "quantity_precision": 1.0,
            "purchase_price": float(blueprint["purchase_price"]),
            "selling_price": float(blueprint["selling_price"]),
            "min_stock": float(blueprint["min_stock"]),
            "max_stock": float(max(blueprint["min_stock"] * 4, blueprint["quantity"] + 10)),
            "lead_time_days": 3 + (index % 3),
            "tax_rate": 18.0,
            "user_id": owner_user_id,
            "store_id": store["store_id"],
            "is_active": True,
            "created_at": now - timedelta(days=40 - index),
            "updated_at": now - timedelta(days=index),
            "kitchen_station": blueprint.get("station", "plat"),
            "is_menu_item": demo_type == "restaurant",
        }, demo_session_id, expires_at))
    return products


def _build_customer_docs(
    owner_user_id: str,
    demo_type: str,
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> List[Dict[str, Any]]:
    base_customers = [
        {"name": "Awa Ndiaye", "phone": "+221770001111", "email": "awa.demo@example.com"},
        {"name": "Mamadou Diallo", "phone": "+221770002222", "email": "mamadou.demo@example.com"},
        {"name": "Khady Ba", "phone": "+221770003333", "email": "khady.demo@example.com"},
    ]
    if demo_type == "enterprise":
        base_customers.append({"name": "Societe Keur Log", "phone": "+221770004444", "email": "keurlog.demo@example.com"})
    customers = []
    for index, item in enumerate(base_customers):
        customers.append(_with_demo_metadata({
            "customer_id": _new_id("cust"),
            "user_id": owner_user_id,
            "name": item["name"],
            "phone": item["phone"],
            "email": item["email"],
            "loyalty_points": 15 * (index + 1),
            "total_spent": 0.0,
            "current_debt": 0.0,
            "notes": "Client demo",
            "category": "VIP" if index == 0 else "Regulier",
            "created_at": now - timedelta(days=60 - index * 5),
        }, demo_session_id, expires_at))
    return customers


def _build_supplier_docs(
    owner_user_id: str,
    store_ids: List[str],
    demo_type: str,
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> List[Dict[str, Any]]:
    base_suppliers = [
        ("Sunu Distribution", "Aminata Faye", "3 jours", "A la livraison"),
        ("Dakar Cash", "Ousmane Gueye", "2 jours", "A 15 jours"),
        ("Atlas Trading", "Sarah Cisse", "5 jours", "A 30 jours"),
    ]
    suppliers: List[Dict[str, Any]] = []
    for index, (name, contact_name, delay, payment_conditions) in enumerate(base_suppliers):
        suppliers.append(_with_demo_metadata({
            "supplier_id": _new_id("sup"),
            "user_id": owner_user_id,
            "store_id": store_ids[index % len(store_ids)],
            "name": name,
            "contact_name": contact_name,
            "email": f"{name.lower().replace(' ', '.')}@demo-supplier.test",
            "phone": f"+22178123{index:04d}",
            "address": f"{20 + index} Rue Fournisseur",
            "notes": "Fournisseur de demonstration",
            "products_supplied": "Catalogue demo",
            "delivery_delay": delay,
            "payment_conditions": payment_conditions,
            "is_active": True,
            "created_at": now - timedelta(days=90 - index * 7),
            "updated_at": now - timedelta(days=index),
        }, demo_session_id, expires_at))
    if demo_type == "restaurant":
        suppliers = suppliers[:2]
    return suppliers


def _build_supplier_product_docs(
    owner_user_id: str,
    products: List[Dict[str, Any]],
    suppliers: List[Dict[str, Any]],
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> List[Dict[str, Any]]:
    links: List[Dict[str, Any]] = []
    for index, product in enumerate(products):
        supplier = suppliers[index % len(suppliers)]
        product_name = product["name"].lower()
        if "riz" in product_name or "huile" in product_name or "farine" in product_name:
            supplier = next((item for item in suppliers if item["name"] == "Sunu Distribution"), supplier)
        elif "lait" in product_name or "sucre" in product_name or "biscuits" in product_name:
            supplier = next((item for item in suppliers if item["name"] == "Dakar Cash"), supplier)
        elif "savon" in product_name or "boisson" in product_name:
            supplier = next((item for item in suppliers if item["name"] == "Atlas Trading"), supplier)
        links.append(_with_demo_metadata({
            "link_id": _new_id("link"),
            "supplier_id": supplier["supplier_id"],
            "product_id": product["product_id"],
            "user_id": owner_user_id,
            "supplier_price": round(float(product.get("purchase_price") or 0) * 0.98, 2),
            "supplier_sku": f"SUP-{index + 1:03d}",
            "is_preferred": index % 2 == 0,
            "created_at": now - timedelta(days=20 - (index % 5)),
        }, demo_session_id, expires_at))
    return links


def _build_sales_docs(
    owner_user_id: str,
    stores: List[Dict[str, Any]],
    products: List[Dict[str, Any]],
    customers: List[Dict[str, Any]],
    currency: str,
    demo_type: str,
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    products_by_store: Dict[str, List[Dict[str, Any]]] = {}
    for product in products:
        products_by_store.setdefault(product["store_id"], []).append(product)

    sales: List[Dict[str, Any]] = []
    customer_payments: List[Dict[str, Any]] = []
    invoices: List[Dict[str, Any]] = []

    for store_index, store in enumerate(stores):
        store_products = products_by_store.get(store["store_id"], [])
        if len(store_products) < 4:
            continue
        sale_offsets = [3, 6, 10, 15, 22, 28]
        for sale_index, days_ago in enumerate(sale_offsets):
            product_a = store_products[sale_index % len(store_products)]
            product_b = store_products[(sale_index + 2) % len(store_products)]
            quantity_a = 1 + (sale_index % 3)
            quantity_b = 1 if demo_type == "restaurant" else 2
            item_a = _sale_item(product_a, quantity_a)
            item_b = _sale_item(product_b, quantity_b, discount_amount=100 if sale_index == 1 else 0)
            sale_items = [item_a, item_b]
            payment_method = "credit" if sale_index == 2 and demo_type != "restaurant" else ("card" if sale_index % 2 else "cash")
            total_amount = round(sum(item["total"] for item in sale_items), 2)
            customer = customers[sale_index % len(customers)]
            created_at = now - timedelta(days=days_ago, hours=store_index * 2 + sale_index)
            sale = _with_demo_metadata({
                "sale_id": _new_id("sale"),
                "user_id": owner_user_id,
                "store_id": store["store_id"],
                "items": sale_items,
                "total_amount": total_amount,
                "discount_amount": round(sum(item["discount_amount"] for item in sale_items), 2),
                "payment_method": payment_method,
                "payments": [{"method": payment_method, "amount": total_amount}],
                "customer_id": customer["customer_id"],
                "customer_name": customer["name"],
                "terminal_id": f"TERM-{store_index + 1}",
                "created_at": created_at,
                "tax_total": 0.0,
                "tax_mode": "ttc",
                "subtotal_ht": round(total_amount / 1.18, 2),
                "status": "completed",
                "service_type": "dine_in" if demo_type == "restaurant" else "takeaway",
                "current_amount": total_amount,
            }, demo_session_id, expires_at)
            sales.append(sale)

            if payment_method == "credit":
                customer_payments.append(_with_demo_metadata({
                    "payment_id": _new_id("pay"),
                    "customer_id": customer["customer_id"],
                    "user_id": owner_user_id,
                    "amount": round(total_amount * 0.4, 2),
                    "notes": "Reglement partiel demo",
                    "created_at": created_at + timedelta(days=2),
                }, demo_session_id, expires_at))

            if sale_index in {0, 3}:
                invoice_items = [
                    {
                        "product_id": item["product_id"],
                        "product_name": item["product_name"],
                        "description": item["product_name"],
                        "quantity": item["quantity"],
                        "unit_price": item["selling_price"],
                        "line_total": item["total"],
                        "tax_rate": item.get("tax_rate", 0.0),
                        "tax_amount": item.get("tax_amount", 0.0),
                    }
                    for item in sale_items
                ]
                invoices.append(_with_demo_metadata({
                    "invoice_id": _new_id("cinv"),
                    "invoice_number": f"FAC-DEMO-{store_index + 1}{sale_index + 1:03d}",
                    "invoice_label": "Facture",
                    "invoice_prefix": "FAC",
                    "user_id": owner_user_id,
                    "store_id": store["store_id"],
                    "sale_id": sale["sale_id"],
                    "customer_id": customer["customer_id"],
                    "customer_name": customer["name"],
                    "status": "issued",
                    "currency": currency,
                    "items": invoice_items,
                    "discount_amount": sale["discount_amount"],
                    "subtotal_ht": sale["subtotal_ht"],
                    "tax_total": sale["tax_total"],
                    "total_amount": sale["total_amount"],
                    "payment_method": payment_method,
                    "payments": sale["payments"],
                    "business_name": store.get("invoice_business_name") or store["name"],
                    "business_address": store.get("invoice_business_address") or store.get("address"),
                    "footer": "Document de demonstration Stockman",
                    "payment_terms": "Paiement a reception",
                    "notes": "Facture generee automatiquement pour la demo",
                    "sale_created_at": created_at,
                    "issued_at": created_at + timedelta(minutes=15),
                    "created_at": created_at + timedelta(minutes=15),
                }, demo_session_id, expires_at))

        if demo_type == "restaurant":
            open_items = [
                _sale_item(store_products[0], 2, notes="Sans oignons"),
                _sale_item(store_products[3], 2),
            ]
            open_total = round(sum(item["total"] for item in open_items), 2)
            sales.append(_with_demo_metadata({
                "sale_id": _new_id("sale"),
                "user_id": owner_user_id,
                "store_id": store["store_id"],
                "items": open_items,
                "total_amount": open_total,
                "discount_amount": 0.0,
                "payment_method": "cash",
                "payments": [],
                "customer_name": "Table 4",
                "created_at": now - timedelta(hours=2),
                "table_id": "demo_table_4",
                "covers": 2,
                "tax_total": 0.0,
                "tax_mode": "ttc",
                "subtotal_ht": round(open_total / 1.18, 2),
                "kitchen_sent": True,
                "kitchen_sent_at": now - timedelta(hours=1, minutes=45),
                "status": "open",
                "service_type": "dine_in",
                "occupied_since": now - timedelta(hours=2),
                "current_amount": open_total,
            }, demo_session_id, expires_at))

    return sales, customer_payments, invoices


def _apply_customer_totals(customers: List[Dict[str, Any]], sales: List[Dict[str, Any]], payments: List[Dict[str, Any]]) -> None:
    spent_by_customer: Dict[str, float] = {}
    debt_by_customer: Dict[str, float] = {}
    visits_by_customer: Dict[str, int] = {}
    last_purchase_by_customer: Dict[str, datetime] = {}
    for sale in sales:
        customer_id = sale.get("customer_id")
        if not customer_id or sale.get("status") != "completed":
            continue
        spent_by_customer[customer_id] = spent_by_customer.get(customer_id, 0.0) + float(sale.get("total_amount") or 0)
        visits_by_customer[customer_id] = visits_by_customer.get(customer_id, 0) + 1
        created_at = sale.get("created_at")
        if isinstance(created_at, datetime):
            previous = last_purchase_by_customer.get(customer_id)
            if previous is None or created_at > previous:
                last_purchase_by_customer[customer_id] = created_at
        if sale.get("payment_method") == "credit":
            debt_by_customer[customer_id] = debt_by_customer.get(customer_id, 0.0) + float(sale.get("total_amount") or 0)
    for payment in payments:
        customer_id = payment.get("customer_id")
        if not customer_id:
            continue
        debt_by_customer[customer_id] = debt_by_customer.get(customer_id, 0.0) - float(payment.get("amount") or 0)
    for customer in customers:
        customer_id = customer["customer_id"]
        total_spent = round(spent_by_customer.get(customer_id, 0.0), 2)
        visit_count = visits_by_customer.get(customer_id, 0)
        customer["total_spent"] = total_spent
        customer["current_debt"] = round(max(0.0, debt_by_customer.get(customer_id, 0.0)), 2)
        customer["visit_count"] = visit_count
        customer["average_basket"] = round(total_spent / visit_count, 2) if visit_count else 0.0
        last_purchase = last_purchase_by_customer.get(customer_id)
        customer["last_purchase_date"] = last_purchase.date().isoformat() if last_purchase else None
        customer["tier"] = "gold" if total_spent >= 60000 else ("silver" if total_spent >= 25000 else "bronze")


def _build_expense_docs(
    owner_user_id: str,
    stores: List[Dict[str, Any]],
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> List[Dict[str, Any]]:
    expenses: List[Dict[str, Any]] = []
    categories = [("Electricite", 45000), ("Transport", 25000), ("Loyer", 120000)]
    for store_index, store in enumerate(stores):
        for offset, (category, amount) in enumerate(categories):
            expenses.append(_with_demo_metadata({
                "expense_id": _new_id("exp"),
                "user_id": owner_user_id,
                "store_id": store["store_id"],
                "category": category,
                "amount": float(amount + (store_index * 5000) + (offset * 2500)),
                "description": f"{category} demo {store['name']}",
                "created_at": now - timedelta(days=8 + offset * 6 + store_index),
            }, demo_session_id, expires_at))
    return expenses


def _build_order_docs(
    owner_user_id: str,
    stores: List[Dict[str, Any]],
    suppliers: List[Dict[str, Any]],
    supplier_products: List[Dict[str, Any]],
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    products_by_supplier: Dict[str, List[Dict[str, Any]]] = {}
    for link in supplier_products:
        products_by_supplier.setdefault(link["supplier_id"], []).append(link)

    orders: List[Dict[str, Any]] = []
    order_items: List[Dict[str, Any]] = []
    statuses = ["delivered", "confirmed", "pending"]

    for index, supplier in enumerate(suppliers):
        linked_products = products_by_supplier.get(supplier["supplier_id"], [])
        if not linked_products:
            continue
        selected_links = linked_products[: min(2, len(linked_products))]
        order_id = _new_id("ord")
        status = statuses[index % len(statuses)]
        created_at = now - timedelta(days=5 + index * 4)
        total_amount = 0.0
        current_items: List[Dict[str, Any]] = []
        for item_index, link in enumerate(selected_links):
            quantity = 6 + item_index * 2
            unit_price = round(float(link.get("supplier_price") or 0), 2)
            total_price = round(quantity * unit_price, 2)
            total_amount += total_price
            current_items.append(_with_demo_metadata({
                "item_id": _new_id("item"),
                "order_id": order_id,
                "product_id": link["product_id"],
                "product_name": f"Appro {item_index + 1}",
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price,
            }, demo_session_id, expires_at))
        order_items.extend(current_items)
        received_items = {item["item_id"]: item["quantity"] for item in current_items} if status == "delivered" else {}
        orders.append(_with_demo_metadata({
            "order_id": order_id,
            "user_id": owner_user_id,
            "store_id": supplier.get("store_id") or stores[0]["store_id"],
            "supplier_id": supplier["supplier_id"],
            "is_connected": False,
            "status": status,
            "total_amount": round(total_amount, 2),
            "notes": "Commande fournisseur demo",
            "expected_delivery": created_at + timedelta(days=3),
            "received_items": received_items,
            "approval_required": False,
            "approval_status": "not_required",
            "created_at": created_at,
            "updated_at": created_at + timedelta(days=1),
        }, demo_session_id, expires_at))
    return orders, order_items


def _build_stock_movements(
    owner_user_id: str,
    products: List[Dict[str, Any]],
    sales: List[Dict[str, Any]],
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> List[Dict[str, Any]]:
    sold_quantities: Dict[Tuple[str, str], float] = {}
    for sale in sales:
        if sale.get("status") != "completed":
            continue
        store_id = sale.get("store_id")
        for item in sale.get("items", []):
            product_id = item.get("product_id")
            if not product_id or not store_id:
                continue
            key = (store_id, product_id)
            sold_quantities[key] = sold_quantities.get(key, 0.0) + float(item.get("quantity") or 0)

    movements: List[Dict[str, Any]] = []
    for index, product in enumerate(products):
        key = (product["store_id"], product["product_id"])
        sold_quantity = round(sold_quantities.get(key, 0.0), 2)
        current_quantity = float(product.get("quantity") or 0)
        opening_quantity = round(current_quantity + sold_quantity + (3 if current_quantity <= 0 else 0), 2)
        first_created_at = now - timedelta(days=45 - (index % 6))
        movements.append(_with_demo_metadata({
            "movement_id": _new_id("mov"),
            "product_id": product["product_id"],
            "user_id": owner_user_id,
            "store_id": product["store_id"],
            "type": "in",
            "quantity": opening_quantity,
            "reason": "Stock initial demo",
            "batch_id": None,
            "previous_quantity": 0.0,
            "new_quantity": opening_quantity,
            "created_at": first_created_at,
        }, demo_session_id, expires_at))
        if sold_quantity > 0:
            movements.append(_with_demo_metadata({
                "movement_id": _new_id("mov"),
                "product_id": product["product_id"],
                "user_id": owner_user_id,
                "store_id": product["store_id"],
                "type": "out",
                "quantity": sold_quantity,
                "reason": "Vente POS",
                "batch_id": None,
                "previous_quantity": opening_quantity,
                "new_quantity": round(max(0.0, opening_quantity - sold_quantity), 2),
                "created_at": first_created_at + timedelta(days=20 + (index % 5)),
            }, demo_session_id, expires_at))
    return movements


def _build_restaurant_tables(
    owner_user_id: str,
    store_id: str,
    demo_session_id: str,
    expires_at: datetime,
    now: datetime,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    tables: List[Dict[str, Any]] = []
    for table_number in range(1, 7):
        table_id = "demo_table_4" if table_number == 4 else _new_id("tbl")
        tables.append(_with_demo_metadata({
            "table_id": table_id,
            "user_id": owner_user_id,
            "store_id": store_id,
            "name": f"Table {table_number}",
            "capacity": 4 if table_number < 5 else 6,
            "status": "occupied" if table_number == 4 else ("reserved" if table_number == 6 else "free"),
            "current_sale_id": None,
            "occupied_since": (now - timedelta(hours=2)).isoformat() if table_number == 4 else None,
            "current_amount": 0.0,
            "covers": 2 if table_number == 4 else 0,
            "created_at": now - timedelta(days=20),
        }, demo_session_id, expires_at))

    reservations = [
        _with_demo_metadata({
            "reservation_id": _new_id("res"),
            "user_id": owner_user_id,
            "store_id": store_id,
            "customer_name": "Aissatou Demo",
            "phone": "+221770009999",
            "date": now.date().isoformat(),
            "time": "20:00",
            "covers": 4,
            "table_id": tables[-1]["table_id"],
            "notes": "Anniversaire",
            "status": "confirmed",
            "created_at": now - timedelta(hours=4),
        }, demo_session_id, expires_at),
        _with_demo_metadata({
            "reservation_id": _new_id("res"),
            "user_id": owner_user_id,
            "store_id": store_id,
            "customer_name": "Jean Marc",
            "phone": "+221770008888",
            "date": (now - timedelta(days=1)).date().isoformat(),
            "time": "13:30",
            "covers": 2,
            "table_id": None,
            "notes": "Client habitue",
            "status": "arrived",
            "created_at": now - timedelta(days=1, hours=5),
        }, demo_session_id, expires_at),
    ]
    return tables, reservations


def _build_owner_name(contact_email: str, definition: Dict[str, Any]) -> str:
    local_part = (contact_email.split("@")[0] if "@" in contact_email else contact_email).strip()
    cleaned = " ".join(chunk.capitalize() for chunk in local_part.replace(".", " ").replace("_", " ").split())
    return cleaned or f"Responsable {definition['label']}"


async def create_demo_session(
    db: Any,
    *,
    demo_type: str,
    contact_email: str,
    password_hash: str,
    country_code: Optional[str] = None,
    currency: Optional[str] = None,
) -> Dict[str, Any]:
    normalized_type = normalize_demo_type(demo_type)
    definition = get_demo_definition(normalized_type)
    normalized_email = contact_email.strip().lower()
    now = datetime.now(timezone.utc)

    existing_session = await db.demo_sessions.find_one(
        {
            "contact_email": normalized_email,
            "demo_type": normalized_type,
            "status": "active",
            "expires_at": {"$gt": now},
        },
        {"_id": 0},
    )
    if existing_session:
        owner_doc = await db.users.find_one(
            {"user_id": existing_session.get("owner_user_id"), "demo_session_id": existing_session["demo_session_id"]},
            {"_id": 0},
        )
        account_doc = await db.business_accounts.find_one(
            {"account_id": existing_session.get("account_id"), "demo_session_id": existing_session["demo_session_id"]},
            {"_id": 0},
        )
        if owner_doc and account_doc:
            await db.demo_sessions.update_one(
                {"demo_session_id": existing_session["demo_session_id"]},
                {"$set": {"last_accessed_at": now}},
            )
            existing_session["last_accessed_at"] = now
            return {
                "session": existing_session,
                "owner_user": owner_doc,
                "account": account_doc,
                "created": False,
            }
        await cleanup_demo_session(db, existing_session["demo_session_id"], mark_missing=True)

    pricing_payload = build_pricing_payload(
        country_code=country_code or DEFAULT_COUNTRY_CODE,
        currency=currency,
        locked=False,
    )
    resolved_country_code = pricing_payload["country_code"]
    resolved_currency = pricing_payload["currency"]
    expires_at = now + timedelta(hours=int(definition["duration_hours"]))
    demo_session_id = _new_id("demo")
    account_id = _new_id("acct")
    owner_user_id = _new_id("user")
    owner_name = _build_owner_name(normalized_email, definition)
    synthetic_email = build_demo_user_email(normalized_email, demo_session_id)

    stores = _build_store_docs(definition, owner_user_id, demo_session_id, expires_at, now)
    store_ids = [store["store_id"] for store in stores]
    categories = _build_category_docs(
        owner_user_id,
        demo_session_id,
        expires_at,
        now,
        ["Plats", "Boissons", "Desserts", "Snacking"] if normalized_type == "restaurant" else ["Epicerie", "Boissons", "Hygiene", "Snacking"],
    )
    products: List[Dict[str, Any]] = []
    for index, store in enumerate(stores):
        products.extend(
            _build_products_for_store(
                normalized_type,
                owner_user_id,
                store,
                categories,
                demo_session_id,
                expires_at,
                now,
                index,
            )
        )
    customers = _build_customer_docs(owner_user_id, normalized_type, demo_session_id, expires_at, now)
    suppliers = _build_supplier_docs(owner_user_id, store_ids, normalized_type, demo_session_id, expires_at, now)
    supplier_products = _build_supplier_product_docs(owner_user_id, products, suppliers, demo_session_id, expires_at, now)
    sales, customer_payments, invoices = _build_sales_docs(
        owner_user_id,
        stores,
        products,
        customers,
        resolved_currency,
        normalized_type,
        demo_session_id,
        expires_at,
        now,
    )
    _apply_customer_totals(customers, sales, customer_payments)
    expenses = _build_expense_docs(owner_user_id, stores, demo_session_id, expires_at, now)
    orders, order_items = _build_order_docs(owner_user_id, stores, suppliers, supplier_products, demo_session_id, expires_at, now)
    stock_movements = _build_stock_movements(owner_user_id, products, sales, demo_session_id, expires_at, now)
    tables: List[Dict[str, Any]] = []
    reservations: List[Dict[str, Any]] = []
    if normalized_type == "restaurant":
        tables, reservations = _build_restaurant_tables(owner_user_id, stores[0]["store_id"], demo_session_id, expires_at, now)

    owner_user = _with_demo_metadata({
        "user_id": owner_user_id,
        "name": owner_name,
        "email": synthetic_email,
        "phone": "+221770000000",
        "password_hash": password_hash,
        "created_at": now,
        "auth_type": "email",
        "role": "shopkeeper",
        "permissions": {module: "write" for module in ["pos", "stock", "accounting", "crm", "suppliers", "staff"]},
        "parent_user_id": None,
        "account_id": account_id,
        "account_roles": ["org_admin", "billing_admin"],
        "store_permissions": {},
        "effective_permissions": {},
        "effective_plan": definition["plan"],
        "subscription_plan": definition["plan"],
        "effective_subscription_status": "active",
        "subscription_access_phase": "active",
        "grace_until": None,
        "read_only_after": None,
        "manual_read_only_enabled": False,
        "requires_payment_attention": False,
        "can_write_data": True,
        "can_use_advanced_features": True,
        "active_store_id": store_ids[0] if store_ids else None,
        "store_ids": store_ids,
        "plan": definition["plan"],
        "subscription_status": "active",
        "subscription_provider": "none",
        "subscription_provider_id": None,
        "subscription_end": None,
        "trial_ends_at": None,
        "currency": resolved_currency,
        "business_type": normalize_sector(definition["business_type"]),
        "how_did_you_hear": "demo_mode",
        "is_phone_verified": True,
        "is_email_verified": True,
        "required_verification": None,
        "verification_channel": None,
        "signup_surface": definition["surface"],
        "verification_completed_at": now,
        "country_code": resolved_country_code,
        "language": "fr",
        "demo_type": normalized_type,
        "demo_surface": definition["surface"],
        "demo_contact_email": normalized_email,
    }, demo_session_id, expires_at)

    staff_users: List[Dict[str, Any]] = []
    for index, profile in enumerate(definition.get("staff_profiles", [])):
        staff_users.append(_with_demo_metadata({
            "user_id": _new_id("user"),
            "name": profile["name"],
            "email": f"demo+staff{index + 1}.{demo_session_id[-6:]}@stockman.pro",
            "phone": None,
            "password_hash": password_hash,
            "created_at": now,
            "auth_type": "email",
            "role": "staff",
            "permissions": profile["permissions"],
            "parent_user_id": owner_user_id,
            "account_id": account_id,
            "account_roles": [],
            "store_permissions": {},
            "effective_permissions": {},
            "effective_plan": definition["plan"],
            "subscription_plan": definition["plan"],
            "effective_subscription_status": "active",
            "subscription_access_phase": "active",
            "manual_read_only_enabled": False,
            "requires_payment_attention": False,
            "can_write_data": True,
            "can_use_advanced_features": True,
            "active_store_id": store_ids[min(index, len(store_ids) - 1)] if store_ids else None,
            "store_ids": store_ids if normalized_type == "enterprise" else store_ids[:1],
            "plan": definition["plan"],
            "subscription_status": "active",
            "subscription_provider": "none",
            "subscription_end": None,
            "trial_ends_at": None,
            "currency": resolved_currency,
            "business_type": normalize_sector(definition["business_type"]),
            "is_phone_verified": True,
            "is_email_verified": True,
            "signup_surface": definition["surface"],
            "country_code": resolved_country_code,
            "language": "fr",
            "demo_type": normalized_type,
            "demo_surface": definition["surface"],
            "demo_contact_email": normalized_email,
        }, demo_session_id, expires_at))

    notification_contacts = default_notification_contacts()
    notification_contacts["default"] = [normalized_email]
    notification_contacts["billing"] = [normalized_email]
    business_account = _with_demo_metadata({
        "account_id": account_id,
        "owner_user_id": owner_user_id,
        "business_type": normalize_sector(definition["business_type"]),
        "store_ids": store_ids,
        "plan": definition["plan"],
        "subscription_status": "active",
        "subscription_provider": "none",
        "subscription_provider_id": None,
        "subscription_end": None,
        "trial_ends_at": None,
        "manual_access_grace_until": None,
        "manual_read_only_enabled": False,
        "currency": resolved_currency,
        "country_code": resolved_country_code,
        "modules": default_modules(),
        "notification_contacts": notification_contacts,
        "billing_contact_name": owner_name,
        "billing_contact_email": normalized_email,
        "created_at": now,
        "updated_at": now,
        "demo_type": normalized_type,
        "demo_surface": definition["surface"],
        "demo_contact_email": normalized_email,
    }, demo_session_id, expires_at)

    owner_settings = _with_demo_metadata({
        "settings_id": _new_id("settings"),
        "user_id": owner_user_id,
        "account_id": account_id,
        "modules": default_modules(),
        "simple_mode": False,
        "mobile_preferences": {"simple_mode": False, "show_manager_zone": True},
        "web_preferences": {"dashboard_layout": {"sales": True, "stock": True, "expenses": True, "customers": True, "reports": True}},
        "language": "fr",
        "push_notifications": True,
        "notification_contacts": notification_contacts,
        "store_notification_contacts": notification_contacts,
        "tax_enabled": True,
        "tax_rate": 18.0,
        "tax_mode": "ttc",
        "receipt_business_name": stores[0]["receipt_business_name"] if stores else owner_name,
        "receipt_footer": "Merci de tester Stockman en mode demo.",
        "invoice_business_name": stores[0].get("invoice_business_name") if stores else owner_name,
        "invoice_business_address": stores[0].get("invoice_business_address") if stores else "Stockman Demo",
        "invoice_label": "Facture",
        "invoice_prefix": "FAC",
        "invoice_footer": "Document genere automatiquement pour la demonstration.",
        "invoice_payment_terms": "Paiement a reception",
        "billing_contact_name": owner_name,
        "billing_contact_email": normalized_email,
        "created_at": now,
        "updated_at": now,
    }, demo_session_id, expires_at)

    session_doc = {
        "demo_session_id": demo_session_id,
        "status": "active",
        "demo_type": normalized_type,
        "label": definition["label"],
        "surface": definition["surface"],
        "contact_email": normalized_email,
        "country_code": resolved_country_code,
        "currency": resolved_currency,
        "pricing_region": pricing_payload["pricing_region"],
        "owner_user_id": owner_user_id,
        "account_id": account_id,
        "store_ids": store_ids,
        "created_at": now,
        "started_at": now,
        "last_accessed_at": now,
        "expires_at": expires_at,
    }

    try:
        await db.demo_sessions.insert_one(session_doc)
        await db.business_accounts.insert_one(business_account)
        await db.users.insert_many([owner_user, *staff_users])
        await db.user_settings.insert_one(owner_settings)
        await db.stores.insert_many(stores)
        await db.categories.insert_many(categories)
        await db.products.insert_many(products)
        await db.customers.insert_many(customers)
        if customer_payments:
            await db.customer_payments.insert_many(customer_payments)
        if sales:
            await db.sales.insert_many(sales)
        if invoices:
            await db.customer_invoices.insert_many(invoices)
        if suppliers:
            await db.suppliers.insert_many(suppliers)
        if supplier_products:
            await db.supplier_products.insert_many(supplier_products)
        if orders:
            await db.orders.insert_many(orders)
        if order_items:
            await db.order_items.insert_many(order_items)
        if expenses:
            await db.expenses.insert_many(expenses)
        if stock_movements:
            await db.stock_movements.insert_many(stock_movements)
        if tables:
            await db.tables.insert_many(tables)
        if reservations:
            await db.reservations.insert_many(reservations)
    except Exception:
        await cleanup_demo_session(db, demo_session_id, force_delete_record=True)
        raise

    return {
        "session": session_doc,
        "owner_user": owner_user,
        "account": business_account,
        "created": True,
    }


async def expire_demo_session(db: Any, demo_session_id: str, *, now: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
    current_time = now or datetime.now(timezone.utc)
    session_doc = await db.demo_sessions.find_one({"demo_session_id": demo_session_id}, {"_id": 0})
    if not session_doc:
        return None
    if session_doc.get("status") == "active":
        await db.demo_sessions.update_one(
            {"demo_session_id": demo_session_id},
            {"$set": {"status": "expired", "expired_at": current_time}},
        )
        session_doc["status"] = "expired"
        session_doc["expired_at"] = current_time
    return session_doc


async def cleanup_demo_session(
    db: Any,
    demo_session_id: str,
    *,
    mark_missing: bool = False,
    force_delete_record: bool = False,
) -> Dict[str, int]:
    collection_names = [
        "users",
        "business_accounts",
        "user_settings",
        "stores",
        "categories",
        "products",
        "customers",
        "customer_payments",
        "sales",
        "customer_invoices",
        "suppliers",
        "supplier_products",
        "orders",
        "order_items",
        "expenses",
        "stock_movements",
        "tables",
        "reservations",
        "alerts",
        "activity_logs",
    ]
    deleted_counts: Dict[str, int] = {}
    for collection_name in collection_names:
        result = await db[collection_name].delete_many({"demo_session_id": demo_session_id})
        deleted_counts[collection_name] = result.deleted_count

    if force_delete_record:
        await db.demo_sessions.delete_one({"demo_session_id": demo_session_id})
        return deleted_counts

    updates: Dict[str, Any] = {
        "status": "cleaned",
        "cleaned_at": datetime.now(timezone.utc),
        "cleanup_counts": deleted_counts,
    }
    if mark_missing:
        updates["cleanup_reason"] = "missing_seeded_owner"
    await db.demo_sessions.update_one({"demo_session_id": demo_session_id}, {"$set": updates})
    return deleted_counts


async def cleanup_expired_demo_sessions(db: Any) -> Dict[str, int]:
    now = datetime.now(timezone.utc)
    sessions = await db.demo_sessions.find(
        {
            "status": {"$in": ["active", "expired"]},
            "expires_at": {"$lt": now},
        },
        {"_id": 0, "demo_session_id": 1},
    ).to_list(length=None)
    cleaned = 0
    for session in sessions:
        demo_session_id = session["demo_session_id"]
        await expire_demo_session(db, demo_session_id, now=now)
        await cleanup_demo_session(db, demo_session_id)
        cleaned += 1
    return {"cleaned_sessions": cleaned}
