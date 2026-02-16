from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import csv
import io
from starlette.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
if os.environ.get("USE_MOCK_DB", "false").lower() == "true":
    from mock_mongo import AsyncIOMotorClient
    logger.info("USING MOCK IN-MEMORY DATABASE")
    client = AsyncIOMotorClient(mongo_url)
else:
    client = AsyncIOMotorClient(mongo_url)

db = client[os.environ.get('DB_NAME', 'stock_management')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 1

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Stock Management API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
async def create_indexes():
    """Create essential indexes for performance"""
    try:
        # Users
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
        
        # Products
        await db.products.create_index([("user_id", 1), ("store_id", 1)])
        await db.products.create_index("sku")
        
        # Sales
        await db.sales.create_index([("user_id", 1), ("store_id", 1)])
        await db.sales.create_index("created_at")
        
        # Stock Movements
        await db.stock_movements.create_index("product_id")
        await db.stock_movements.create_index("created_at")
        await db.stock_movements.create_index([("user_id", 1), ("store_id", 1)])
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

    # Migration: backfill store_id on documents missing it
    try:
        users = await db.users.find({"active_store_id": {"$ne": None}}, {"user_id": 1, "active_store_id": 1, "_id": 0}).to_list(None)
        for u in users:
            uid = u["user_id"]
            sid = u["active_store_id"]
            # Backfill products
            await db.products.update_many(
                {"user_id": uid, "$or": [{"store_id": None}, {"store_id": {"$exists": False}}]},
                {"$set": {"store_id": sid}}
            )
            # Backfill stock_movements
            await db.stock_movements.update_many(
                {"user_id": uid, "$or": [{"store_id": None}, {"store_id": {"$exists": False}}]},
                {"$set": {"store_id": sid}}
            )
            # Backfill alerts
            await db.alerts.update_many(
                {"user_id": uid, "$or": [{"store_id": None}, {"store_id": {"$exists": False}}]},
                {"$set": {"store_id": sid}}
            )
            # Backfill batches
            await db.batches.update_many(
                {"user_id": uid, "$or": [{"store_id": None}, {"store_id": {"$exists": False}}]},
                {"$set": {"store_id": sid}}
            )
            # Fix simple_mode for existing users
            await db.user_settings.update_many(
                {"user_id": uid, "simple_mode": True},
                {"$set": {"simple_mode": False}}
            )
        logger.info("Migration: store_id backfill completed")
    except Exception as e:
        logger.error(f"Migration error: {e}")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# App routers
api_router = APIRouter(prefix="/api")

# ===================== STORE MODELS =====================
class Store(BaseModel):
    store_id: str = Field(default_factory=lambda: f"store_{uuid.uuid4().hex[:12]}")
    user_id: str # Owner
    name: str
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoreCreate(BaseModel):
    name: str
    address: Optional[str] = None

# ===================== MODELS =====================

class UserBase(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    role: str = "shopkeeper"  # "shopkeeper" or "supplier"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    user_id: str
    created_at: datetime
    auth_type: str = "email"  # "email" or "google"
    role: str = "shopkeeper"  # "shopkeeper" or "supplier"
    active_store_id: Optional[str] = None # The store currently being managed
    store_ids: List[str] = [] # List of stores this user has access to

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Category(BaseModel):
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    color: str = "#3B82F6"
    icon: str = "cube-outline"
    user_id: str
    store_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    icon: str = "cube-outline"

class Product(BaseModel):
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[str] = None
    quantity: int = 0
    unit: str = "pièce"  # pièce, carton, kg, litre, etc.
    purchase_price: float = 0.0
    selling_price: float = 0.0
    min_stock: int = 0
    max_stock: int = 100
    lead_time_days: int = 3 # Average time to receive stock
    image: Optional[str] = None  # base64
    user_id: str
    store_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[str] = None
    quantity: int = 0
    unit: str = "pièce"
    purchase_price: float = 0.0
    selling_price: float = 0.0
    min_stock: int = 0
    max_stock: int = 100
    lead_time_days: int = 3
    image: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    lead_time_days: Optional[int] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None

class Batch(BaseModel):
    batch_id: str = Field(default_factory=lambda: f"batch_{uuid.uuid4().hex[:12]}")
    product_id: str
    user_id: str
    store_id: Optional[str] = None
    batch_number: str
    quantity: int
    expiry_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BatchCreate(BaseModel):
    product_id: str
    batch_number: str
    quantity: int
    expiry_date: Optional[datetime] = None

class InventoryTask(BaseModel):
    task_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    user_id: str
    store_id: str
    product_id: str
    product_name: str
    expected_quantity: int
    actual_quantity: Optional[int] = None
    discrepancy: Optional[int] = None
    status: str = "pending"  # "pending", "completed"
    priority: str = "medium"  # "high", "medium", "low"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class InventoryTaskUpdate(BaseModel):
    actual_quantity: int

class StockMovement(BaseModel):
    movement_id: str = Field(default_factory=lambda: f"mov_{uuid.uuid4().hex[:12]}")
    product_id: str
    user_id: str
    store_id: Optional[str] = None
    type: str  # "in" or "out"
    quantity: int
    reason: str = ""
    batch_id: Optional[str] = None
    previous_quantity: int
    new_quantity: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockMovementCreate(BaseModel):
    product_id: str
    type: str  # "in" or "out"
    quantity: int
    reason: str = ""
    batch_id: Optional[str] = None

class Alert(BaseModel):
    alert_id: str = Field(default_factory=lambda: f"alert_{uuid.uuid4().hex[:12]}")
    user_id: str
    store_id: Optional[str] = None
    product_id: Optional[str] = None
    type: str  # "low_stock", "out_of_stock", "overstock", "slow_moving"
    title: str
    message: str
    severity: str = "warning"  # "info", "warning", "critical"
    is_read: bool = False
    is_dismissed: bool = False
    action_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlertRule(BaseModel):
    rule_id: str = Field(default_factory=lambda: f"rule_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: str  # "low_stock", "out_of_stock", "overstock", "slow_moving"
    enabled: bool = True
    threshold_percentage: Optional[int] = None  # e.g., 20% of max
    notification_channels: List[str] = ["in_app"]  # "in_app", "push", "email", "sms"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlertRuleCreate(BaseModel):
    type: str
    enabled: bool = True
    threshold_percentage: Optional[int] = None
    notification_channels: List[str] = ["in_app"]

class LoyaltySettings(BaseModel):
    is_active: bool = True
    ratio: int = 1000 # FCFA for 1 point
    reward_threshold: int = 50 # Points required for a reward
    reward_description: str = "Remise de 10%"

class UserSettings(BaseModel):
    settings_id: str = Field(default_factory=lambda: f"settings_{uuid.uuid4().hex[:12]}")
    user_id: str
    loyalty: LoyaltySettings = Field(default_factory=LoyaltySettings)
    modules: dict = Field(default_factory=lambda: {
        "stock_management": True,
        "alerts": True,
        "rules": True,
        "statistics": True,
        "history": True,
        "export": True
    })
    simple_mode: bool = False  # true = simple, false = advanced
    language: str = "fr"
    push_notifications: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PushToken(BaseModel):
    token_id: str = Field(default_factory=lambda: f"token_{uuid.uuid4().hex[:12]}")
    user_id: str
    expo_push_token: str
    device_type: str  # "ios", "android", "web"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===================== POS MODELS =====================

class SaleItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    purchase_price: float = 0.0 # Price at the moment of sale for COGS calculation
    selling_price: float
    total: float

class Sale(BaseModel):
    sale_id: str = Field(default_factory=lambda: f"sale_{uuid.uuid4().hex[:12]}")
    user_id: str
    store_id: str
    items: List[SaleItem]
    total_amount: float
    payment_method: str = "cash"  # "cash", "mobile_money", "card"
    customer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SaleCreate(BaseModel):
    items: List[dict] # [{product_id, quantity}]
    payment_method: str = "cash"
    customer_id: Optional[str] = None

class AccountingStats(BaseModel):
    revenue: float
    cogs: float
    gross_profit: float
    net_profit: float
    total_losses: float
    loss_breakdown: Dict[str, float]
    sales_count: int
    period_label: str
    total_purchases: float = 0.0
    purchases_count: int = 0
    daily_revenue: list = []
    payment_breakdown: Dict[str, float] = {}
    avg_sale: float = 0.0
    total_items_sold: int = 0
    stock_value: float = 0.0
    stock_selling_value: float = 0.0

# ===================== CRM MODELS =====================

class Customer(BaseModel):
    customer_id: str = Field(default_factory=lambda: f"cust_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    loyalty_points: int = 0
    total_spent: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class Promotion(BaseModel):
    promotion_id: str = Field(default_factory=lambda: f"promo_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    description: str
    discount_percentage: Optional[float] = None
    points_required: Optional[int] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===================== SUPPLIER MODELS =====================

class Supplier(BaseModel):
    supplier_id: str = Field(default_factory=lambda: f"sup_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    products_supplied: str = ""  # produits habituels (texte libre)
    delivery_delay: str = ""  # ex: "2-3 jours"
    payment_conditions: str = ""  # ex: "À la livraison"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    products_supplied: str = ""
    delivery_delay: str = ""
    payment_conditions: str = ""

class SupplierProduct(BaseModel):
    link_id: str = Field(default_factory=lambda: f"link_{uuid.uuid4().hex[:12]}")
    supplier_id: str
    product_id: str
    user_id: str
    supplier_price: float = 0.0
    supplier_sku: Optional[str] = None
    is_preferred: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierProductCreate(BaseModel):
    supplier_id: str
    product_id: str
    supplier_price: float = 0.0
    supplier_sku: Optional[str] = None
    is_preferred: bool = False

# ===================== ORDER MODELS =====================

class Order(BaseModel):
    order_id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:12]}")
    user_id: str
    supplier_id: str
    supplier_user_id: Optional[str] = None  # CAS 1: user_id du fournisseur inscrit
    is_connected: bool = False  # True si commande via marketplace (CAS 1)
    status: str = "pending"  # "pending", "confirmed", "shipped", "delivered", "cancelled"
    total_amount: float = 0.0
    notes: Optional[str] = None
    expected_delivery: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItem(BaseModel):
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    order_id: str
    product_id: str
    quantity: int
    unit_price: float
    total_price: float

class OrderCreate(BaseModel):
    supplier_id: str
    supplier_user_id: Optional[str] = None
    items: List[dict]  # [{product_id, quantity, unit_price}]
    notes: Optional[str] = None
    expected_delivery: Optional[datetime] = None

class OrderStatusUpdate(BaseModel):
    status: str

# ===================== CAS 1 MODELS =====================

class SupplierProfile(BaseModel):
    profile_id: str = Field(default_factory=lambda: f"sprof_{uuid.uuid4().hex[:12]}")
    user_id: str  # the supplier's user_id
    company_name: str
    description: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    categories: List[str] = []
    delivery_zones: List[str] = []
    min_order_amount: float = 0.0
    average_delivery_days: int = 3
    rating_average: float = 0.0
    rating_count: int = 0
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierProfileCreate(BaseModel):
    company_name: str
    description: str = ""
    phone: str = ""
    address: str = ""
    city: str = ""
    categories: List[str] = []
    delivery_zones: List[str] = []
    min_order_amount: float = 0.0
    average_delivery_days: int = 3

class CatalogProduct(BaseModel):
    catalog_id: str = Field(default_factory=lambda: f"cata_{uuid.uuid4().hex[:12]}")
    supplier_user_id: str
    name: str
    description: str = ""
    category: str = ""
    price: float = 0.0
    unit: str = "pièce"
    min_order_quantity: int = 1
    stock_available: int = 0
    available: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CatalogProductCreate(BaseModel):
    name: str
    description: str = ""
    category: str = ""
    price: float = 0.0
    unit: str = "pièce"
    min_order_quantity: int = 1
    stock_available: int = 0
    available: bool = True

class SupplierRating(BaseModel):
    rating_id: str = Field(default_factory=lambda: f"rat_{uuid.uuid4().hex[:12]}")
    supplier_user_id: str
    shopkeeper_user_id: str
    order_id: str
    score: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierRatingCreate(BaseModel):
    order_id: str
    score: int  # 1-5
    comment: Optional[str] = None

class SupplierInvitation(BaseModel):
    invitation_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    shopkeeper_user_id: str
    manual_supplier_id: str
    email: str
    token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    status: str = "pending"  # "pending", "accepted", "expired"
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierInvitationCreate(BaseModel):
    email: str

# ===================== AUTH HELPERS =====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request) -> Optional[User]:
    # Try cookie first
    token = request.cookies.get("session_token")
    # Then try Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user_doc:
            # Ensure role field exists for legacy users
            if "role" not in user_doc:
                user_doc["role"] = "shopkeeper"
            return User(**user_doc)
    except JWTError:
        pass

    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    return user

async def require_shopkeeper(request: Request) -> User:
    user = await require_auth(request)
    if user.role != "shopkeeper":
        raise HTTPException(status_code=403, detail="Accès réservé aux commerçants")
    return user

async def require_supplier(request: Request) -> User:
    user = await require_auth(request)
    if user.role != "supplier":
        raise HTTPException(status_code=403, detail="Accès réservé aux fournisseurs")
    return user

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate, response: Response):
    """Register a new user with email/password"""
    try:
        existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        hashed_password = get_password_hash(user_data.password)
        
        # Create Default Store
        store_id = f"store_{uuid.uuid4().hex[:12]}"
        store = Store(
            store_id=store_id,
            user_id=user_id,
            name=f"Magasin de {user_data.name}"
        )
        await db.stores.insert_one(store.model_dump())
        
        role = user_data.role if user_data.role in ("shopkeeper", "supplier") else "shopkeeper"
        user_doc = {
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "password_hash": hashed_password,
            "picture": None,
            "auth_type": "email",
            "role": role,
            "active_store_id": store_id,
            "store_ids": [store_id],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(user_doc)
        
        # Create default settings
        settings = UserSettings(user_id=user_id)
        await db.user_settings.insert_one(settings.model_dump())
        
        # Create default alert rules
        default_rules = [
            AlertRule(user_id=user_id, type="low_stock", enabled=True, threshold_percentage=20),
            AlertRule(user_id=user_id, type="out_of_stock", enabled=True),
            AlertRule(user_id=user_id, type="overstock", enabled=True, threshold_percentage=90),
        ]
        for rule in default_rules:
            await db.alert_rules.insert_one(rule.model_dump())
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            path="/"
        )
        
        user = User(
            user_id=user_id,
            email=user_data.email,
            name=user_data.name,
            picture=None,
            created_at=user_doc["created_at"],
            auth_type="email",
            role=role,
            active_store_id=store_id,
            store_ids=[store_id]
        )

        return TokenResponse(access_token=access_token, user=user)
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, user_data: UserLogin, response: Response):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if user_doc.get("auth_type") == "google":
        raise HTTPException(status_code=400, detail="Ce compte utilise la connexion Google")
    
    if not verify_password(user_data.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    access_token = create_access_token(data={"sub": user_doc["user_id"]})
    
    response.set_cookie(
        key="session_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    # Ensure store info is returned (compatibility with older users)
    active_store_id = user_doc.get("active_store_id")
    store_ids = user_doc.get("store_ids", [])
    
    # Migration for old users without stores: create one if needed
    if not store_ids and user_doc.get("role") == "shopkeeper":
        store_id = f"store_{uuid.uuid4().hex[:12]}"
        store = Store(
            store_id=store_id,
            user_id=user_doc["user_id"],
            name=f"Magasin de {user_doc['name']}"
        )
        await db.stores.insert_one(store.model_dump())
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {"active_store_id": store_id, "store_ids": [store_id]}}
        )
        active_store_id = store_id
        store_ids = [store_id]
        
    user = User(
        user_id=user_doc["user_id"],
        email=user_doc["email"],
        name=user_doc["name"],
        picture=user_doc.get("picture"),
        created_at=user_doc["created_at"],
        auth_type=user_doc.get("auth_type", "email"),
        role=user_doc.get("role", "shopkeeper"),
        active_store_id=active_store_id,
        store_ids=store_ids
    )

    return TokenResponse(access_token=access_token, user=user)

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    """Get current user info"""
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Déconnexion réussie"}

# ===================== STORE ROUTES =====================

@api_router.get("/stores", response_model=List[Store])
async def get_stores(user: User = Depends(require_auth)):
    stores = await db.stores.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return [Store(**s) for s in stores]

@api_router.post("/stores", response_model=Store)
async def create_store(store_data: StoreCreate, user: User = Depends(require_auth)):
    store = Store(**store_data.model_dump(), user_id=user.user_id)
    await db.stores.insert_one(store.model_dump())
    
    # Update user's store list and set as active if it's the first one
    update_data = {"$push": {"store_ids": store.store_id}}
    if not user.active_store_id:
        update_data["$set"] = {"active_store_id": store.store_id}
        
    await db.users.update_one(
        {"user_id": user.user_id},
        update_data
    )
    
    return store

@api_router.put("/auth/active-store", response_model=User)
async def set_active_store(store_data: dict, user: User = Depends(require_auth)):
    store_id = store_data.get("store_id")
    if not store_id or store_id not in user.store_ids:
        raise HTTPException(status_code=400, detail="Magasin invalide")
        
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"active_store_id": store_id}}
    )
    
    user.active_store_id = store_id
    return user

# ===================== CATEGORY ROUTES =====================

# ===================== CATEGORY ROUTES =====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories(user: User = Depends(require_auth), store_id: Optional[str] = None):
    query = {"user_id": user.user_id}
    target_store = store_id or user.active_store_id
    if target_store:
        # For backward compatibility, also match if store_id is missing (legacy data)
        # But for strictly multi-store, we should probably just filter by store_id if present
        # Ideally we migrated data. Let's assume strict filtering for new/migrated users.
        query["store_id"] = target_store
        
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(cat_data: CategoryCreate, user: User = Depends(require_auth)):
    category = Category(
        **cat_data.model_dump(),
        user_id=user.user_id,
        store_id=user.active_store_id
    )
    await db.categories.insert_one(category.model_dump())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, cat_data: CategoryCreate, user: User = Depends(require_auth)):
    result = await db.categories.find_one_and_update(
        {"category_id": category_id, "user_id": user.user_id},
        {"$set": cat_data.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    result.pop("_id", None)
    return Category(**result)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(require_auth)):
    result = await db.categories.delete_one({"category_id": category_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    # Update products with this category
    await db.products.update_many(
        {"category_id": category_id, "user_id": user.user_id},
        {"$set": {"category_id": None}}
    )
    return {"message": "Catégorie supprimée"}

# ===================== PRODUCT ROUTES =====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    user: User = Depends(require_auth),
    category_id: Optional[str] = None,
    active_only: bool = True,
    store_id: Optional[str] = None
):
    query = {"user_id": user.user_id}
    
    target_store = store_id or user.active_store_id
    if target_store:
        query["store_id"] = target_store
        
    if category_id:
        query["category_id"] = category_id
    if active_only:
        query["is_active"] = True
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return [Product(**prod) for prod in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, user: User = Depends(require_auth)):
    product = await db.products.find_one({"product_id": product_id, "user_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(prod_data: ProductCreate, user: User = Depends(require_auth)):
    product = Product(
        **prod_data.model_dump(),
        user_id=user.user_id,
        store_id=user.active_store_id
    )
    await db.products.insert_one(product.model_dump())
    
    # Check and create alerts if needed
    await check_and_create_alerts(product, user.user_id, store_id=user.active_store_id)

    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, prod_data: ProductUpdate, user: User = Depends(require_auth)):
    update_dict = {k: v for k, v in prod_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.products.find_one_and_update(
        {"product_id": product_id, "user_id": user.user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    result.pop("_id", None)
    product = Product(**result)
    
    # Check and create alerts if needed
    await check_and_create_alerts(product, user.user_id, store_id=user.active_store_id)

    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(require_auth)):
    result = await db.products.delete_one({"product_id": product_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}

# ===================== STOCK MOVEMENT ROUTES =====================

@api_router.post("/stock/movement", response_model=StockMovement)
async def create_stock_movement(mov_data: StockMovementCreate, user: User = Depends(require_auth)):
    product = await db.products.find_one({"product_id": mov_data.product_id, "user_id": user.user_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    previous_quantity = product["quantity"]
    
    # Handle Batch Sync
    if mov_data.type == "in":
        new_quantity = previous_quantity + mov_data.quantity
        if mov_data.batch_id:
            await db.batches.update_one(
                {"batch_id": mov_data.batch_id, "user_id": user.user_id},
                {"$inc": {"quantity": mov_data.quantity}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
    else: # OUT
        new_quantity = max(0, previous_quantity - mov_data.quantity)
        
        # FEFO Logic for Outflows
        if mov_data.batch_id:
            # Specific batch selected
            await db.batches.update_one(
                {"batch_id": mov_data.batch_id, "user_id": user.user_id},
                {"$inc": {"quantity": -mov_data.quantity}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
        else:
            # Automatic FEFO: Take from oldest expiring batches first
            qty_to_deduct = mov_data.quantity
            active_batches = await db.batches.find(
                {"product_id": mov_data.product_id, "user_id": user.user_id, "quantity": {"$gt": 0}},
                {"_id": 0}
            ).sort("expiry_date", 1).to_list(None)
            
            for b in active_batches:
                if qty_to_deduct <= 0:
                    break
                
                deduct = min(b["quantity"], qty_to_deduct)
                await db.batches.update_one(
                    {"batch_id": b["batch_id"]},
                    {"$inc": {"quantity": -deduct}, "$set": {"updated_at": datetime.now(timezone.utc)}}
                )
                qty_to_deduct -= deduct
    
    # Update product quantity
    await db.products.update_one(
        {"product_id": mov_data.product_id},
        {"$set": {"quantity": new_quantity, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Create movement record
    movement = StockMovement(
        product_id=mov_data.product_id,
        user_id=user.user_id,
        store_id=user.active_store_id,
        type=mov_data.type,
        quantity=mov_data.quantity,
        reason=mov_data.reason,
        batch_id=mov_data.batch_id,
        previous_quantity=previous_quantity,
        new_quantity=new_quantity
    )
    await db.stock_movements.insert_one(movement.model_dump())

    # Check for alerts
    product["quantity"] = new_quantity
    await check_and_create_alerts(Product(**product), user.user_id, store_id=user.active_store_id)

    return movement

# ===================== BATCH ROUTES =====================

@api_router.get("/batches", response_model=List[Batch])
async def get_batches(
    user: User = Depends(require_auth),
    product_id: Optional[str] = None,
    store_id: Optional[str] = None,
    active_only: bool = True
):
    query = {"user_id": user.user_id}
    target_store = store_id or user.active_store_id
    if target_store:
        query["store_id"] = target_store
    if product_id:
        query["product_id"] = product_id
    if active_only:
        query["quantity"] = {"$gt": 0}
        
    batches = await db.batches.find(query, {"_id": 0}).sort("expiry_date", 1).to_list(1000)
    return [Batch(**b) for b in batches]

@api_router.post("/batches", response_model=Batch)
async def create_batch(batch_data: BatchCreate, user: User = Depends(require_auth)):
    batch = Batch(
        **batch_data.model_dump(),
        user_id=user.user_id,
        store_id=user.active_store_id
    )
    await db.batches.insert_one(batch.model_dump())
    
    # Optional: Automatically create a stock movement for this initial batch quantity?
    # For now, let's assume batches are created via stock movements or separately.
    # If created separately, we should probably record a movement to keep product total sync.
    
    return batch

# ===================== INVENTORY ROUTES =====================

@api_router.get("/inventory/tasks", response_model=List[InventoryTask])
async def get_inventory_tasks(
    user: User = Depends(require_auth),
    status: Optional[str] = "pending"
):
    query = {"user_id": user.user_id, "store_id": user.active_store_id}
    if status:
        query["status"] = status
        
    tasks = await db.inventory_tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [InventoryTask(**t) for t in tasks]

@api_router.post("/inventory/generate")
async def generate_inventory_tasks(user: User = Depends(require_auth)):
    """Generate cyclic inventory tasks based on ABC priority"""
    user_id = user.user_id
    store_id = user.active_store_id
    
    # Get current statistics for ABC info
    from fastapi.testclient import TestClient # Hack to reuse logic if it's purely internal or just call function
    # Better: just use the logic directly
    
    products = await db.products.find({"user_id": user_id, "store_id": store_id, "is_active": True}, {"_id": 0}).to_list(None)
    
    # Simple logic: pick a few products that haven't been counted recently
    # For a real implementation, we'd check 'last_counted_at' field (need to add it)
    # Let's pick 5 random products for now, weighted by A (3), B (1), C (1) if they exist
    
    # We'll use the ABC logic from get_statistics (abstracted logic would be better but let's keep it simple)
    # Pick 5 products
    import random
    selected = random.sample(products, min(len(products), 5))
    
    new_tasks = []
    for p in selected:
        # Check if already has a pending task
        existing = await db.inventory_tasks.find_one({
            "product_id": p["product_id"],
            "status": "pending",
            "user_id": user_id
        })
        if existing:
            continue
            
        task = InventoryTask(
            user_id=user_id,
            store_id=store_id,
            product_id=p["product_id"],
            product_name=p["name"],
            expected_quantity=p["quantity"],
            priority="medium" # Could be dynamic
        )
        await db.inventory_tasks.insert_one(task.model_dump())
        new_tasks.append(task)
        
    return {"message": f"{len(new_tasks)} tâches d'inventaire générées", "tasks": new_tasks}

@api_router.put("/inventory/tasks/{task_id}", response_model=InventoryTask)
async def submit_inventory_result(
    task_id: str, 
    update: InventoryTaskUpdate,
    user: User = Depends(require_auth)
):
    task = await db.inventory_tasks.find_one({"task_id": task_id, "user_id": user.user_id})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
        
    actual = update.actual_quantity
    expected = task["expected_quantity"]
    discrepancy = actual - expected
    
    updated_at = datetime.now(timezone.utc)
    
    result = await db.inventory_tasks.find_one_and_update(
        {"task_id": task_id},
        {"$set": {
            "actual_quantity": actual,
            "discrepancy": discrepancy,
            "status": "completed",
            "completed_at": updated_at
        }},
        return_document=True
    )
    
    # If discrepancy, we should probably record a stock movement to adjust!
    if discrepancy != 0:
        mov_type = "in" if discrepancy > 0 else "out"
        qty = abs(discrepancy)
        
        # We'll call the logic directly instead of a sub-request
        # For simplicity, let's just create a movement record
        movement = StockMovement(
            product_id=task["product_id"],
            user_id=user.user_id,
            store_id=user.active_store_id,
            type=mov_type,
            quantity=qty,
            reason=f"Ajustement Inventaire (TaskId: {task_id})",
            previous_quantity=expected,
            new_quantity=actual
        )
        await db.stock_movements.insert_one(movement.model_dump())
        
        # Update product
        await db.products.update_one(
            {"product_id": task["product_id"]},
            {"$set": {"quantity": actual, "updated_at": updated_at}}
        )
        
        # Also need to check alerts for the new quantity
        # ... logic skipped for brevity but ideally called here
        
    result.pop("_id", None)
    return InventoryTask(**result)

# ===================== POS ROUTES =====================

@api_router.get("/sales", response_model=List[Sale])
async def get_sales(user: User = Depends(require_auth), store_id: Optional[str] = None):
    query = {"user_id": user.user_id}
    target_store = store_id or user.active_store_id
    if target_store:
        query["store_id"] = target_store
        
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Sale(**s) for s in sales]

# ===================== CRM ROUTES =====================

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(user: User = Depends(require_auth)):
    customers = await db.customers.find({"user_id": user.user_id}).sort("name", 1).to_list(1000)
    return [Customer(**c) for c in customers]

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, user: User = Depends(require_auth)):
    customer = Customer(
        user_id=user.user_id,
        **customer_data.model_dump()
    )
    await db.customers.insert_one(customer.model_dump())
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_data: CustomerCreate, user: User = Depends(require_auth)):
    update_dict = customer_data.model_dump()
    result = await db.customers.find_one_and_update(
        {"customer_id": customer_id, "user_id": user.user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    result.pop("_id", None)
    return Customer(**result)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: User = Depends(require_auth)):
    result = await db.customers.delete_one({"customer_id": customer_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé"}

@api_router.get("/promotions", response_model=List[Promotion])
async def get_promotions(user: User = Depends(require_auth)):
    promotions = await db.promotions.find({"user_id": user.user_id, "is_active": True}).to_list(100)
    return [Promotion(**p) for p in promotions]

class PromotionCreate(BaseModel):
    title: str
    description: str = ""
    discount_percentage: Optional[float] = None
    points_required: Optional[int] = None
    is_active: bool = True

@api_router.post("/promotions", response_model=Promotion)
async def create_promotion(data: PromotionCreate, user: User = Depends(require_auth)):
    promotion = Promotion(**data.model_dump(), user_id=user.user_id)
    await db.promotions.insert_one(promotion.model_dump())
    return promotion

@api_router.put("/promotions/{promotion_id}", response_model=Promotion)
async def update_promotion(promotion_id: str, data: PromotionCreate, user: User = Depends(require_auth)):
    update_dict = data.model_dump()
    result = await db.promotions.find_one_and_update(
        {"promotion_id": promotion_id, "user_id": user.user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    result.pop("_id", None)
    return Promotion(**result)

@api_router.delete("/promotions/{promotion_id}")
async def delete_promotion(promotion_id: str, user: User = Depends(require_auth)):
    result = await db.promotions.delete_one({"promotion_id": promotion_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promotion non trouvée")
    return {"message": "Promotion supprimée"}

@api_router.post("/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, user: User = Depends(require_auth)):
    user_id = user.user_id
    store_id = user.active_store_id
    
    sale_items = []
    total_amount = 0.0
    
    # We use a transaction-like approach or just careful sequential updates
    # 1. Validate and Prepare
    for item in sale_data.items:
        prod_id = item["product_id"]
        qty = item["quantity"]
        
        product = await db.products.find_one({"product_id": prod_id, "user_id": user_id})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit {prod_id} non trouvé")
        
        if product["quantity"] < qty:
            raise HTTPException(status_code=400, detail=f"Stock insuffisant pour {product['name']}")
            
        line_total = product["selling_price"] * qty
        total_amount += line_total
        
        sale_items.append(SaleItem(
            product_id=prod_id,
            product_name=product["name"],
            quantity=qty,
            purchase_price=product.get("purchase_price", 0.0),
            selling_price=product["selling_price"],
            total=line_total
        ))
        
    # 2. Process Stock Deductions (FEFO)
    for si in sale_items:
        # Use our existing FEFO logic by calling the internal part of create_stock_movement
        # or just create a movement which triggers the logic
        
        # We'll create a movement record directly
        movement_data = StockMovementCreate(
            product_id=si.product_id,
            type="out",
            quantity=si.quantity,
            reason=f"Vente POS"
        )
        
        # Actually call the logic of create_stock_movement but avoid re-auth check
        # Since logic is in the route, we can extract it or just call it if we refactored
        # For now, let's replicate the core logic for brevity or call the function
        await create_stock_movement(movement_data, user)

    # 3. Save Sale
    sale = Sale(
        user_id=user_id,
        store_id=store_id,
        items=sale_items,
        total_amount=total_amount,
        payment_method=sale_data.payment_method,
        customer_id=sale_data.customer_id
    )
    
    # Update Customer Stats if applicable
    if sale_data.customer_id:
        # Fetch loyalty settings
        settings_doc = await db.user_settings.find_one({"user_id": user_id})
        ratio = 1000
        if settings_doc and "loyalty" in settings_doc:
            ratio = settings_doc["loyalty"].get("ratio", 1000)
            if not settings_doc["loyalty"].get("is_active", True):
                ratio = 0 # Disable points if loyalty program is inactive
        
        if ratio > 0:
            points_earned = int(total_amount / ratio)
            await db.customers.update_one(
                {"customer_id": sale_data.customer_id, "user_id": user_id},
                {
                    "$inc": {
                        "loyalty_points": points_earned,
                        "total_spent": total_amount
                    }
                }
            )

    await db.sales.insert_one(sale.model_dump())
    
    return sale

@api_router.get("/accounting/stats", response_model=AccountingStats)
async def get_accounting_stats(days: int = 30, user: User = Depends(require_auth)):
    user_id = user.user_id
    store_id = user.active_store_id
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # 1. Sales Data (filtered by store)
    sales_query: dict = {"user_id": user_id, "created_at": {"$gte": start_date}}
    if store_id:
        sales_query["store_id"] = store_id
    sales = await db.sales.find(sales_query).to_list(1000)

    revenue = 0.0
    cogs = 0.0
    total_items_sold = 0
    payment_breakdown: Dict[str, float] = {}
    daily_map: Dict[str, dict] = {}

    for s in sales:
        sale_amount = s.get("total_amount", 0.0)
        revenue += sale_amount

        # Payment breakdown
        pm = s.get("payment_method", "cash")
        payment_breakdown[pm] = payment_breakdown.get(pm, 0.0) + sale_amount

        # Daily aggregation
        sale_date = s.get("created_at")
        if isinstance(sale_date, str):
            try:
                sale_date = datetime.fromisoformat(sale_date.replace('Z', '+00:00'))
            except Exception:
                sale_date = None
        if sale_date:
            day_key = sale_date.strftime("%Y-%m-%d")
            if day_key not in daily_map:
                daily_map[day_key] = {"date": day_key, "revenue": 0.0, "profit": 0.0}
            daily_map[day_key]["revenue"] += sale_amount

        sale_cogs = 0.0
        for item in s.get("items", []):
            item_cost = item.get("purchase_price", 0.0) * item.get("quantity", 0)
            cogs += item_cost
            sale_cogs += item_cost
            total_items_sold += item.get("quantity", 0)

        if sale_date:
            day_key = sale_date.strftime("%Y-%m-%d")
            daily_map[day_key]["profit"] += sale_amount - sale_cogs

    gross_profit = revenue - cogs

    # Sort daily revenue
    daily_revenue = sorted(daily_map.values(), key=lambda d: d["date"])

    # 2. Losses Data (filtered by store)
    mv_query: dict = {
        "user_id": user_id,
        "type": "out",
        "created_at": {"$gte": start_date},
        "reason": {"$ne": "Vente POS"}
    }
    if store_id:
        mv_query["store_id"] = store_id
    movements = await db.stock_movements.find(mv_query).to_list(1000)

    total_losses = 0.0
    loss_breakdown: Dict[str, float] = {}

    prod_ids = list(set([m["product_id"] for m in movements]))
    products_db = await db.products.find({"product_id": {"$in": prod_ids}}).to_list(len(prod_ids)) if prod_ids else []
    prod_map = {p["product_id"]: p for p in products_db}

    for m in movements:
        p = prod_map.get(m["product_id"])
        price = p.get("purchase_price", 0.0) if p else 0.0
        loss_val = price * m["quantity"]
        total_losses += loss_val

        reason = m.get("reason") or "Autre"
        loss_breakdown[reason] = loss_breakdown.get(reason, 0.0) + loss_val

    # 3. Purchase Orders (filtered by store via user)
    purchase_query: dict = {
        "user_id": user_id,
        "status": "delivered",
        "updated_at": {"$gte": start_date}
    }
    delivered_orders = await db.orders.find(purchase_query).to_list(1000)
    total_purchases = sum(o.get("total_amount", 0) for o in delivered_orders)

    # 4. Stock value (current)
    stock_query: dict = {"user_id": user_id, "is_active": True}
    if store_id:
        stock_query["store_id"] = store_id
    all_products = await db.products.find(stock_query, {"_id": 0}).to_list(1000)
    stock_value = sum(p.get("quantity", 0) * p.get("purchase_price", 0) for p in all_products)
    stock_selling_value = sum(p.get("quantity", 0) * p.get("selling_price", 0) for p in all_products)

    net_profit = gross_profit - total_losses
    avg_sale = revenue / len(sales) if sales else 0.0

    return AccountingStats(
        revenue=revenue,
        cogs=cogs,
        gross_profit=gross_profit,
        net_profit=net_profit,
        total_losses=total_losses,
        loss_breakdown=loss_breakdown,
        sales_count=len(sales),
        period_label=f"Derniers {days} jours",
        total_purchases=total_purchases,
        purchases_count=len(delivered_orders),
        daily_revenue=daily_revenue,
        payment_breakdown=payment_breakdown,
        avg_sale=round(avg_sale, 0),
        total_items_sold=total_items_sold,
        stock_value=round(stock_value, 0),
        stock_selling_value=round(stock_selling_value, 0),
    )

@api_router.get("/stock/movements", response_model=List[StockMovement])
async def get_stock_movements(
    user: User = Depends(require_auth),
    product_id: Optional[str] = None,
    limit: int = 50,
    store_id: Optional[str] = None
):
    query = {"user_id": user.user_id}
    
    target_store = store_id or user.active_store_id
    if target_store:
        query["store_id"] = target_store
        
    if product_id:
        query["product_id"] = product_id
    
    movements = await db.stock_movements.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [StockMovement(**mov) for mov in movements]

# ===================== ALERT ROUTES =====================

async def check_and_create_alerts(product: Product, user_id: str, store_id: Optional[str] = None):
    """Check product status and create/resolve alerts based on rules"""
    # Use provided store_id, fall back to product's store_id
    effective_store_id = store_id or product.store_id

    rules = await db.alert_rules.find({"user_id": user_id, "enabled": True}, {"_id": 0}).to_list(100)

    for rule in rules:
        alert = None
        should_resolve = False

        if rule["type"] == "out_of_stock":
            if product.quantity == 0:
                alert = Alert(
                    user_id=user_id,
                    store_id=effective_store_id,
                    product_id=product.product_id,
                    type="out_of_stock",
                    title="Rupture de stock",
                    message=f"{product.name} est en rupture de stock",
                    severity="critical"
                )
            else:
                # Stock restored → auto-resolve existing out_of_stock alerts
                should_resolve = True

        elif rule["type"] == "low_stock" and product.min_stock > 0:
            if product.quantity <= product.min_stock and product.quantity > 0:
                alert = Alert(
                    user_id=user_id,
                    store_id=effective_store_id,
                    product_id=product.product_id,
                    type="low_stock",
                    title="Stock faible",
                    message=f"{product.name}: {product.quantity} {product.unit}(s) restant(s)",
                    severity="warning"
                )
            elif product.quantity > product.min_stock:
                # Stock above threshold → auto-resolve existing low_stock alerts
                should_resolve = True

        elif rule["type"] == "overstock" and product.max_stock > 0:
            if product.quantity >= product.max_stock:
                alert = Alert(
                    user_id=user_id,
                    store_id=effective_store_id,
                    product_id=product.product_id,
                    type="overstock",
                    title="Surstock",
                    message=f"{product.name}: stock excessif ({product.quantity} {product.unit}(s))",
                    severity="info"
                )
            else:
                # Stock below max → auto-resolve existing overstock alerts
                should_resolve = True

        # Auto-resolve: dismiss alerts that no longer apply
        if should_resolve:
            await db.alerts.update_many(
                {
                    "user_id": user_id,
                    "product_id": product.product_id,
                    "type": rule["type"],
                    "is_dismissed": False
                },
                {"$set": {"is_dismissed": True}}
            )

        if alert:
            # Check if similar alert already exists (not dismissed), including store_id
            dup_query = {
                "user_id": user_id,
                "product_id": product.product_id,
                "type": alert.type,
                "is_dismissed": False
            }
            if effective_store_id:
                dup_query["store_id"] = effective_store_id

            existing = await db.alerts.find_one(dup_query, {"_id": 0})

            if not existing:
                # Also dismiss any old alerts for same product/type with wrong store_id
                await db.alerts.update_many(
                    {
                        "user_id": user_id,
                        "product_id": product.product_id,
                        "type": alert.type,
                        "is_dismissed": False,
                        "store_id": {"$ne": effective_store_id}
                    },
                    {"$set": {"is_dismissed": True}}
                )
                await db.alerts.insert_one(alert.model_dump())
                await send_push_notification(user_id, alert.title, alert.message)

async def check_slow_moving(user_id: str):
    """Check for products with no 'out' movement in the last 30 days"""
    rules = await db.alert_rules.find({"user_id": user_id, "type": "slow_moving", "enabled": True}, {"_id": 0}).to_list(1)
    if not rules:
        return

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    products = await db.products.find({"user_id": user_id, "is_active": True, "quantity": {"$gt": 0}}, {"_id": 0}).to_list(1000)

    for product in products:
        # Check if there's been any "out" movement in the last 30 days
        recent_out = await db.stock_movements.find_one({
            "product_id": product["product_id"],
            "user_id": user_id,
            "type": "out",
            "created_at": {"$gte": thirty_days_ago}
        })
        if not recent_out:
            # Check if alert already exists
            existing = await db.alerts.find_one({
                "user_id": user_id,
                "product_id": product["product_id"],
                "type": "slow_moving",
                "is_dismissed": False
            })
            if not existing:
                alert = Alert(
                    user_id=user_id,
                    product_id=product["product_id"],
                    type="slow_moving",
                    title="Produit dormant",
                    message=f"{product['name']} n'a eu aucune sortie depuis 30 jours",
                    severity="info"
                )
                await db.alerts.insert_one(alert.model_dump())

@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    user: User = Depends(require_auth),
    include_dismissed: bool = False,
    limit: int = 50,
    store_id: Optional[str] = None
):
    query = {"user_id": user.user_id}
    
    target_store = store_id or user.active_store_id
    if target_store:
        query["store_id"] = target_store
        
    if not include_dismissed:
        query["is_dismissed"] = False
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [Alert(**alert) for alert in alerts]

@api_router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, user: User = Depends(require_auth)):
    result = await db.alerts.update_one(
        {"alert_id": alert_id, "user_id": user.user_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    return {"message": "Alerte marquée comme lue"}

@api_router.put("/alerts/{alert_id}/dismiss")
async def dismiss_alert(alert_id: str, user: User = Depends(require_auth)):
    result = await db.alerts.update_one(
        {"alert_id": alert_id, "user_id": user.user_id},
        {"$set": {"is_dismissed": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    return {"message": "Alerte ignorée"}

@api_router.delete("/alerts/dismissed")
async def clear_dismissed_alerts(user: User = Depends(require_auth)):
    result = await db.alerts.delete_many({"user_id": user.user_id, "is_dismissed": True})
    return {"message": f"{result.deleted_count} alertes supprimées"}

# ===================== ALERT RULES ROUTES =====================

@api_router.get("/alert-rules", response_model=List[AlertRule])
async def get_alert_rules(user: User = Depends(require_auth)):
    rules = await db.alert_rules.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return [AlertRule(**rule) for rule in rules]

@api_router.post("/alert-rules", response_model=AlertRule)
async def create_alert_rule(rule_data: AlertRuleCreate, user: User = Depends(require_auth)):
    rule = AlertRule(**rule_data.model_dump(), user_id=user.user_id)
    await db.alert_rules.insert_one(rule.model_dump())
    return rule

@api_router.put("/alert-rules/{rule_id}", response_model=AlertRule)
async def update_alert_rule(rule_id: str, rule_data: AlertRuleCreate, user: User = Depends(require_auth)):
    result = await db.alert_rules.find_one_and_update(
        {"rule_id": rule_id, "user_id": user.user_id},
        {"$set": rule_data.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    result.pop("_id", None)
    return AlertRule(**result)

@api_router.delete("/alert-rules/{rule_id}")
async def delete_alert_rule(rule_id: str, user: User = Depends(require_auth)):
    result = await db.alert_rules.delete_one({"rule_id": rule_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    return {"message": "Règle supprimée"}

# ===================== SETTINGS ROUTES =====================

@api_router.get("/settings", response_model=UserSettings)
async def get_settings(user: User = Depends(require_auth)):
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    if not settings:
        # Create default settings
        settings = UserSettings(user_id=user.user_id)
        await db.user_settings.insert_one(settings.model_dump())
        return settings
    return UserSettings(**settings)

@api_router.put("/settings")
async def update_settings(settings_update: dict, user: User = Depends(require_auth)):
    settings_update["updated_at"] = datetime.now(timezone.utc)
    result = await db.user_settings.find_one_and_update(
        {"user_id": user.user_id},
        {"$set": settings_update},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Paramètres non trouvés")
    result.pop("_id", None)
    return UserSettings(**result)

# ===================== PUSH TOKEN ROUTES =====================

@api_router.post("/push-tokens")
async def register_push_token(token_data: dict, user: User = Depends(require_auth)):
    expo_push_token = token_data.get("expo_push_token")
    device_type = token_data.get("device_type", "unknown")
    
    if not expo_push_token:
        raise HTTPException(status_code=400, detail="expo_push_token requis")
    
    # Update or create token
    await db.push_tokens.update_one(
        {"expo_push_token": expo_push_token},
        {
            "$set": {
                "user_id": user.user_id,
                "expo_push_token": expo_push_token,
                "device_type": device_type,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc)
            },
            "$setOnInsert": {
                "token_id": f"token_{uuid.uuid4().hex[:12]}",
                "created_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {"message": "Token enregistré"}

@api_router.delete("/push-tokens/{token}")
async def unregister_push_token(token: str, user: User = Depends(require_auth)):
    await db.push_tokens.update_one(
        {"expo_push_token": token, "user_id": user.user_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Token désactivé"}

# ===================== DASHBOARD ROUTES =====================

@api_router.get("/dashboard")
async def get_dashboard(user: User = Depends(require_auth)):
    # Check slow_moving & late deliveries in background
    await check_slow_moving(user.user_id)
    await check_late_deliveries_internal(user.user_id)

    # Filter by store
    store_query = {"user_id": user.user_id, "is_active": True}
    if user.active_store_id:
        store_query["store_id"] = user.active_store_id
        
    products = await db.products.find(store_query, {"_id": 0}).to_list(1000)
    
    alert_query = {"user_id": user.user_id, "is_dismissed": False}
    if user.active_store_id:
        alert_query["store_id"] = user.active_store_id
        
    alerts = await db.alerts.find(alert_query, {"_id": 0}).to_list(100)
    
    # Calculate stats
    total_products = len(products)
    total_value = sum(p.get("quantity", 0) * p.get("purchase_price", 0) for p in products)
    selling_value = sum(p.get("quantity", 0) * p.get("selling_price", 0) for p in products)
    
    # Out of stock products
    out_of_stock_products = [p for p in products if p.get("quantity", 0) == 0]

    # Critical products (out of stock or below min)
    critical_products = [p for p in products if p.get("quantity", 0) == 0 or (p.get("min_stock", 0) > 0 and p.get("quantity", 0) <= p.get("min_stock", 0))]

    # Overstock products
    overstock_products = [p for p in products if p.get("max_stock", 0) > 0 and p.get("quantity", 0) >= p.get("max_stock", 0)]

    # Low stock products (above 0 but below min)
    low_stock_products = [p for p in products if p.get("quantity", 0) > 0 and p.get("min_stock", 0) > 0 and p.get("quantity", 0) <= p.get("min_stock", 0)]
    
    # Recent sales (last 5)
    sales_query = {"user_id": user.user_id}
    if user.active_store_id:
        sales_query["store_id"] = user.active_store_id

    recent_sales = await db.sales.find(sales_query, {"_id": 0}).sort("created_at", -1).to_list(5)

    # Revenue calculations
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.now(timezone.utc) - timedelta(days=30)

    today_sales_query = {**sales_query, "created_at": {"$gte": today_start}}
    month_sales_query = {**sales_query, "created_at": {"$gte": month_start}}

    today_sales = await db.sales.find(today_sales_query, {"_id": 0}).to_list(1000)
    month_sales = await db.sales.find(month_sales_query, {"_id": 0}).to_list(1000)

    today_revenue = sum(s.get("total_amount", 0) for s in today_sales)
    month_revenue = sum(s.get("total_amount", 0) for s in month_sales)

    return {
        "total_products": total_products,
        "total_stock_value": round(total_value, 2),
        "potential_revenue": round(selling_value, 2),
        "critical_count": len(critical_products),
        "overstock_count": len(overstock_products),
        "low_stock_count": len(low_stock_products),
        "out_of_stock_count": len(out_of_stock_products),
        "unread_alerts": len([a for a in alerts if not a.get("is_read", False)]),
        "critical_products": critical_products[:5],
        "overstock_products": overstock_products[:5],
        "recent_alerts": alerts[:5],
        "recent_sales": recent_sales,
        "today_revenue": round(today_revenue, 0),
        "month_revenue": round(month_revenue, 0),
        "today_sales_count": len(today_sales),
    }

# ===================== SUPPLIER ROUTES =====================

@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(user: User = Depends(require_auth)):
    suppliers = await db.suppliers.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(100)
    return [Supplier(**s) for s in suppliers]

@api_router.get("/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str, user: User = Depends(require_auth)):
    supplier = await db.suppliers.find_one({"supplier_id": supplier_id, "user_id": user.user_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    return Supplier(**supplier)

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(sup_data: SupplierCreate, user: User = Depends(require_auth)):
    supplier = Supplier(**sup_data.model_dump(), user_id=user.user_id)
    await db.suppliers.insert_one(supplier.model_dump())
    return supplier

@api_router.put("/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, sup_data: SupplierCreate, user: User = Depends(require_auth)):
    update_dict = sup_data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    result = await db.suppliers.find_one_and_update(
        {"supplier_id": supplier_id, "user_id": user.user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    result.pop("_id", None)
    return Supplier(**result)

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, user: User = Depends(require_auth)):
    result = await db.suppliers.update_one(
        {"supplier_id": supplier_id, "user_id": user.user_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    return {"message": "Fournisseur supprimé"}

# Supplier-Product links
@api_router.get("/suppliers/{supplier_id}/products")
async def get_supplier_products(supplier_id: str, user: User = Depends(require_auth)):
    links = await db.supplier_products.find(
        {"supplier_id": supplier_id, "user_id": user.user_id}, {"_id": 0}
    ).to_list(100)
    
    # Get product details
    product_ids = [link["product_id"] for link in links]
    products = await db.products.find(
        {"product_id": {"$in": product_ids}, "user_id": user.user_id}, {"_id": 0}
    ).to_list(100)
    products_map = {p["product_id"]: p for p in products}
    
    result = []
    for link in links:
        product = products_map.get(link["product_id"])
        if product:
            result.append({
                **link,
                "product": product
            })
    return result

@api_router.post("/supplier-products", response_model=SupplierProduct)
async def link_supplier_product(link_data: SupplierProductCreate, user: User = Depends(require_auth)):
    # Check if link already exists
    existing = await db.supplier_products.find_one({
        "supplier_id": link_data.supplier_id,
        "product_id": link_data.product_id,
        "user_id": user.user_id
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Ce produit est déjà lié à ce fournisseur")
    
    link = SupplierProduct(**link_data.model_dump(), user_id=user.user_id)
    await db.supplier_products.insert_one(link.model_dump())
    
    # If preferred, remove preferred from other suppliers
    if link.is_preferred:
        await db.supplier_products.update_many(
            {
                "product_id": link_data.product_id,
                "user_id": user.user_id,
                "link_id": {"$ne": link.link_id}
            },
            {"$set": {"is_preferred": False}}
        )
    
    return link

@api_router.delete("/supplier-products/{link_id}")
async def unlink_supplier_product(link_id: str, user: User = Depends(require_auth)):
    result = await db.supplier_products.delete_one({"link_id": link_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lien non trouvé")
    return {"message": "Lien supprimé"}

# ===================== ORDER ROUTES =====================

@api_router.get("/orders")
async def get_orders(user: User = Depends(require_auth), status: Optional[str] = None):
    query = {"user_id": user.user_id}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get supplier names
    supplier_ids = list(set(o["supplier_id"] for o in orders))
    suppliers = await db.suppliers.find({"supplier_id": {"$in": supplier_ids}}, {"_id": 0}).to_list(100)
    suppliers_map = {s["supplier_id"]: s["name"] for s in suppliers}
    
    for order in orders:
        order["supplier_name"] = suppliers_map.get(order["supplier_id"], "Inconnu")
        # Get items count
        items = await db.order_items.find({"order_id": order["order_id"]}, {"_id": 0}).to_list(100)
        order["items_count"] = len(items)
    
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: User = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Get supplier
    supplier = await db.suppliers.find_one({"supplier_id": order["supplier_id"]}, {"_id": 0})
    order["supplier"] = supplier
    
    # Get items with product details
    items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    product_ids = [item["product_id"] for item in items]
    products = await db.products.find({"product_id": {"$in": product_ids}}, {"_id": 0}).to_list(100)
    products_map = {p["product_id"]: p for p in products}
    
    for item in items:
        item["product"] = products_map.get(item["product_id"])
    
    order["items"] = items
    return order

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user: User = Depends(require_auth)):
    # Verify supplier exists
    supplier = await db.suppliers.find_one({"supplier_id": order_data.supplier_id, "user_id": user.user_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")
    
    # Calculate total
    total_amount = sum(item["quantity"] * item["unit_price"] for item in order_data.items)
    
    order = Order(
        user_id=user.user_id,
        supplier_id=order_data.supplier_id,
        supplier_user_id=order_data.supplier_user_id,
        is_connected=order_data.supplier_user_id is not None,
        total_amount=total_amount,
        notes=order_data.notes,
        expected_delivery=order_data.expected_delivery
    )
    
    await db.orders.insert_one(order.model_dump())
    
    # Create order items
    for item in order_data.items:
        order_item = OrderItem(
            order_id=order.order_id,
            product_id=item["product_id"],
            quantity=item["quantity"],
            unit_price=item["unit_price"],
            total_price=item["quantity"] * item["unit_price"]
        )
        await db.order_items.insert_one(order_item.model_dump())
    
    return {"message": "Commande créée", "order_id": order.order_id}

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: OrderStatusUpdate, user: User = Depends(require_auth)):
    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
    if status_data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    result = await db.orders.find_one_and_update(
        {"order_id": order_id, "user_id": user.user_id},
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc)}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # If delivered, update stock
    if status_data.status == "delivered":
        items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
        for item in items:
            product = await db.products.find_one({"product_id": item["product_id"], "user_id": user.user_id}, {"_id": 0})
            if product:
                new_quantity = product["quantity"] + item["quantity"]
                await db.products.update_one(
                    {"product_id": item["product_id"]},
                    {"$set": {"quantity": new_quantity, "updated_at": datetime.now(timezone.utc)}}
                )

                # Create stock movement
                movement = StockMovement(
                    product_id=item["product_id"],
                    user_id=user.user_id,
                    store_id=user.active_store_id,
                    type="in",
                    quantity=item["quantity"],
                    reason=f"Commande {order_id} livrée",
                    previous_quantity=product["quantity"],
                    new_quantity=new_quantity
                )
                await db.stock_movements.insert_one(movement.model_dump())

                # Check alerts for updated product
                product["quantity"] = new_quantity
                await check_and_create_alerts(Product(**product), user.user_id, store_id=user.active_store_id)

    return {"message": f"Statut mis à jour: {status_data.status}"}

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, user: User = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] not in ["pending", "cancelled"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une commande en cours")
    
    await db.orders.delete_one({"order_id": order_id})
    await db.order_items.delete_many({"order_id": order_id})
    return {"message": "Commande supprimée"}

# ===================== STATISTICS ROUTES =====================

@api_router.get("/statistics")
async def get_statistics(user: User = Depends(require_auth)):
    user_id = user.user_id
    store_id = user.active_store_id

    # Filter by store
    product_query = {"user_id": user_id, "is_active": True}
    movement_query = {"user_id": user_id}
    if store_id:
        product_query["store_id"] = store_id
        movement_query["store_id"] = store_id

    products = await db.products.find(product_query, {"_id": 0}).to_list(1000)
    movements = await db.stock_movements.find(movement_query, {"_id": 0}).sort("created_at", -1).to_list(500)
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Stock by category
    categories = await db.categories.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    category_map = {c["category_id"]: c["name"] for c in categories}
    
    stock_by_category = {}
    for product in products:
        cat_id = product.get("category_id")
        cat_name = category_map.get(cat_id, "Sans catégorie") if cat_id else "Sans catégorie"
        if cat_name not in stock_by_category:
            stock_by_category[cat_name] = {"count": 0, "value": 0}
        stock_by_category[cat_name]["count"] += 1
        stock_by_category[cat_name]["value"] += product.get("quantity", 0) * product.get("purchase_price", 0)
    
    # Stock status distribution
    status_distribution = {
        "normal": 0,
        "low_stock": 0,
        "out_of_stock": 0,
        "overstock": 0
    }
    
    for p in products:
        qty = p.get("quantity", 0)
        min_s = p.get("min_stock", 0)
        max_s = p.get("max_stock", 0)
        
        if qty == 0:
            status_distribution["out_of_stock"] += 1
        elif min_s > 0 and qty <= min_s:
            status_distribution["low_stock"] += 1
        elif max_s > 0 and qty >= max_s:
            status_distribution["overstock"] += 1
        else:
            status_distribution["normal"] += 1
    
    # Calculate stock value history (last 7 days)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    history_dates = [today - timedelta(days=i) for i in range(7)]
    history_dates.reverse() # Oldest to newest
    
    # Current total value
    current_total_value = sum(p.get("quantity", 0) * p.get("purchase_price", 0) for p in products)
    
    # Product price map
    price_map = {p["product_id"]: p.get("purchase_price", 0) for p in products}
    
    stock_value_history = []
    
    # We iterate backwards from today
    # Value at start of day T = Value at end of day T-1
    # Value at end of day T = Value at end of day T (current for today)
    
    # Actually, simplistic approach:
    # Value[Today] = current_total_value
    # Value[Yesterday] = Value[Today] - (MovementsIn_Today * Price) + (MovementsOut_Today * Price)
    
    # Organize movements by date
    movements_by_date = {}
    for m in movements:
        m_date = m["created_at"]
        if isinstance(m_date, str):
            try:
                m_date = datetime.fromisoformat(m_date.replace('Z', '+00:00'))
            except:
                continue
        
        date_key = m_date.strftime("%Y-%m-%d")
        if date_key not in movements_by_date:
            movements_by_date[date_key] = []
        movements_by_date[date_key].append(m)
        
    running_value = current_total_value
    history_values = {}
    
    # Calculate backwards
    # We span 30 days to be safe but only return 7
    for i in range(30): 
        date = today - timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        # Save value for this day (it represents the value at the END of the day)
        history_values[date_str] = running_value
        
        # Reverse movements of this day to get start of day value (which is end of prev day)
        day_movements = movements_by_date.get(date_str, [])
        for m in day_movements:
            qty = m["quantity"]
            pid = m["product_id"]
            price = price_map.get(pid, 0)
            
            if m["type"] == "in":
                # If we added stock today, yesterday we had less
                running_value -= (qty * price)
            else:
                # If we removed stock today, yesterday we had more
                running_value += (qty * price)
                
    # Extract last 7 days for the chart
    chart_data = []
    for d in history_dates:
        d_str = d.strftime("%Y-%m-%d")
        val = history_values.get(d_str, 0)
        chart_data.append({"date": d_str, "value": max(0, val)}) # Ensure no negative value

    # Recent movements summary (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_movements = [m for m in movements if m.get("created_at") and m["created_at"] > thirty_days_ago]
    
    movements_in = sum(m["quantity"] for m in recent_movements if m["type"] == "in")
    movements_out = sum(m["quantity"] for m in recent_movements if m["type"] == "out")
    
    # Orders stats
    orders_pending = len([o for o in orders if o["status"] == "pending"])
    orders_completed = len([o for o in orders if o["status"] == "delivered"])
    total_orders_value = sum(o.get("total_amount", 0) for o in orders if o["status"] == "delivered")
    
    # Top products by value
    products_by_value = sorted(products, key=lambda p: p.get("quantity", 0) * p.get("purchase_price", 0), reverse=True)[:5]
        
    # ABC Analysis (Pareto Principle)
    # Class A: Top 80% of revenue
    # Class B: Next 15% of revenue
    # Class C: Last 5% of revenue
    
    # Calculate revenue per product from delivered orders
    product_revenue = {}
    total_revenue_abc = 0
    
    for order in orders:
        if order.get("status") != "delivered":
            continue
            
        items = order.get("items", [])
        # Handle both dict and object access if needed, but here orders are dicts from .to_list()
        for item in items:
            pid = item.get("product_id")
            # Items might store total_price or we calc it for revenue
            # OrderItem usually has total_price
            rev = item.get("total_price", 0)
            if pid:
                product_revenue[pid] = product_revenue.get(pid, 0) + rev
                total_revenue_abc += rev
                
    # Sort products by revenue descending
    sorted_by_revenue = sorted(product_revenue.items(), key=lambda x: x[1], reverse=True)
    
    abc_data = {"A": [], "B": [], "C": []}
    current_revenue = 0
    
    for pid, rev in sorted_by_revenue:
        current_revenue += rev
        if total_revenue_abc > 0:
            percentage = (current_revenue / total_revenue_abc) * 100
        else:
            percentage = 100 # No revenue, everything is C or unclassified
            
        # Helper to find product name
        p_name = next((p["name"] for p in products if p["product_id"] == pid), "Unknown Product")
        
        item_data = {"id": pid, "name": p_name, "revenue": rev, "percentage": (rev/total_revenue_abc*100) if total_revenue_abc > 0 else 0}
        
        if percentage <= 80:
            abc_data["A"].append(item_data)
        elif percentage <= 95:
             abc_data["B"].append(item_data)
        else:
             abc_data["C"].append(item_data)

    # Products with NO revenue are automatically C
    all_revenue_pids = set(product_revenue.keys())
    for p in products:
        if p["product_id"] not in all_revenue_pids:
            abc_data["C"].append({"id": p["product_id"], "name": p["name"], "revenue": 0, "percentage": 0})

    # Reorder Recommendations (Smart Reordering)
    reorder_recommendations = []
    
    # Calculate daily sales for each product in last 30 days
    product_sales_history = {} # pid -> {date_str: qty}
    
    for m in movements:
        if m["type"] != "out":
            continue
            
        m_date = m["created_at"]
        if isinstance(m_date, str):
            try:
                m_date = datetime.fromisoformat(m_date.replace('Z', '+00:00'))
            except:
                continue
        
        date_str = m_date.strftime("%Y-%m-%d")
        pid = m["product_id"]
        
        if pid not in product_sales_history:
            product_sales_history[pid] = {}
        
        product_sales_history[pid][date_str] = product_sales_history[pid].get(date_str, 0) + m["quantity"]

    for p in products:
        pid = p["product_id"]
        sales_days = product_sales_history.get(pid, {})
        
        total_qty_30 = sum(sales_days.values())
        avg_daily = total_qty_30 / 30.0
        max_daily = max(sales_days.values()) if sales_days else 0
        
        lead_time = p.get("lead_time_days", 3)
        max_lead_time = lead_time * 1.5 # Assumption
        
        # Safety Stock = (Max Sales * Max LT) - (Avg Sales * LT)
        safety_stock = (max_daily * max_lead_time) - (avg_daily * lead_time)
        
        # Reorder Point = (Avg Sales * LT) + Safety Stock
        reorder_point = (avg_daily * lead_time) + safety_stock
        
        # Add to recommendations if current quantity is at or below reorder point
        # AND if there is actually sales velocity (don't recommend ordering stuff that never sells)
        if p["quantity"] <= reorder_point and total_qty_30 > 0:
            reorder_recommendations.append({
                "product_id": pid,
                "name": p["name"],
                "current_quantity": p["quantity"],
                "reorder_point": round(reorder_point, 1),
                "suggested_quantity": round(max(p.get("max_stock", 100) - p["quantity"], 0)),
                "priority": "critical" if p["quantity"] <= (avg_daily * lead_time) else "warning"
            })

    # Expiry Alerts (Next 30 days)
    expiry_alerts = []
    thirty_days_later = datetime.now(timezone.utc) + timedelta(days=30)
    
    expiring_soon = await db.batches.find({
        "user_id": user_id,
        "store_id": store_id,
        "quantity": {"$gt": 0},
        "expiry_date": {"$lte": thirty_days_later, "$ne": None}
    }, {"_id": 0}).to_list(100)
    
    for b in expiring_soon:
        prod = next((p for p in products if p["product_id"] == b["product_id"]), None)
        expiry_alerts.append({
            "product_id": b["product_id"],
            "name": prod["name"] if prod else "Produit inconnu",
            "batch_number": b["batch_number"],
            "expiry_date": b["expiry_date"].isoformat() if isinstance(b["expiry_date"], datetime) else b["expiry_date"],
            "quantity": b["quantity"],
            "priority": "critical" if b["expiry_date"] <= datetime.now(timezone.utc) else "warning"
        })

    return {
        "expiry_alerts": expiry_alerts,
        "reorder_recommendations": reorder_recommendations,
        "abc_analysis": abc_data,
        "stock_by_category": [{"name": k, "count": v["count"], "value": v["value"]} for k, v in stock_by_category.items()],
        "status_distribution": status_distribution,
        "movements_summary": {
            "in": movements_in,
            "out": movements_out,
            "net": movements_in - movements_out
        },
        "orders_stats": {
            "pending": orders_pending,
            "completed": orders_completed,
            "total_value": total_orders_value
        },
        "top_products_by_value": [
            {
                "name": p["name"],
                "quantity": p["quantity"],
                "value": p["quantity"] * p.get("purchase_price", 0)
            }
            for p in products_by_value
        ],
        "stock_value_history": chart_data
    }

# ===================== SUPPLIER PROFILE ROUTES (CAS 1) =====================

@api_router.get("/supplier/profile")
async def get_supplier_profile(user: User = Depends(require_supplier)):
    profile = await db.supplier_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profil non trouvé. Créez votre profil fournisseur.")
    return SupplierProfile(**profile)

@api_router.post("/supplier/profile", response_model=SupplierProfile)
async def create_supplier_profile(data: SupplierProfileCreate, user: User = Depends(require_supplier)):
    existing = await db.supplier_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Profil déjà existant. Utilisez PUT pour modifier.")
    profile = SupplierProfile(**data.model_dump(), user_id=user.user_id)
    await db.supplier_profiles.insert_one(profile.model_dump())
    return profile

@api_router.put("/supplier/profile", response_model=SupplierProfile)
async def update_supplier_profile(data: SupplierProfileCreate, user: User = Depends(require_supplier)):
    update_dict = data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    result = await db.supplier_profiles.find_one_and_update(
        {"user_id": user.user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Profil non trouvé")
    result.pop("_id", None)
    return SupplierProfile(**result)

# ===================== SUPPLIER CATALOG ROUTES (CAS 1) =====================

@api_router.get("/supplier/catalog", response_model=List[CatalogProduct])
async def get_supplier_catalog(user: User = Depends(require_supplier)):
    items = await db.catalog_products.find({"supplier_user_id": user.user_id}, {"_id": 0}).to_list(500)
    return [CatalogProduct(**item) for item in items]

@api_router.post("/supplier/catalog", response_model=CatalogProduct)
async def create_catalog_product(data: CatalogProductCreate, user: User = Depends(require_supplier)):
    item = CatalogProduct(**data.model_dump(), supplier_user_id=user.user_id)
    await db.catalog_products.insert_one(item.model_dump())
    return item

@api_router.put("/supplier/catalog/{catalog_id}", response_model=CatalogProduct)
async def update_catalog_product(catalog_id: str, data: CatalogProductCreate, user: User = Depends(require_supplier)):
    update_dict = data.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc)
    result = await db.catalog_products.find_one_and_update(
        {"catalog_id": catalog_id, "supplier_user_id": user.user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Produit catalogue non trouvé")
    result.pop("_id", None)
    return CatalogProduct(**result)

@api_router.delete("/supplier/catalog/{catalog_id}")
async def delete_catalog_product(catalog_id: str, user: User = Depends(require_supplier)):
    result = await db.catalog_products.delete_one({"catalog_id": catalog_id, "supplier_user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit catalogue non trouvé")
    return {"message": "Produit supprimé du catalogue"}

# ===================== SUPPLIER DASHBOARD (CAS 1) =====================

@api_router.get("/supplier/dashboard")
async def get_supplier_dashboard(user: User = Depends(require_supplier)):
    catalog_count = await db.catalog_products.count_documents({"supplier_user_id": user.user_id})
    orders = await db.orders.find({"supplier_user_id": user.user_id, "is_connected": True}, {"_id": 0}).to_list(500)

    orders_by_status = {}
    total_revenue = 0.0
    for o in orders:
        status = o.get("status", "pending")
        orders_by_status[status] = orders_by_status.get(status, 0) + 1
        if status == "delivered":
            total_revenue += o.get("total_amount", 0)

    profile = await db.supplier_profiles.find_one({"user_id": user.user_id}, {"_id": 0})

    return {
        "catalog_products": catalog_count,
        "orders_by_status": orders_by_status,
        "total_orders": len(orders),
        "total_revenue": round(total_revenue, 2),
        "rating_average": profile.get("rating_average", 0) if profile else 0,
        "rating_count": profile.get("rating_count", 0) if profile else 0,
        "recent_orders": orders[:5]
    }

# ===================== SUPPLIER ORDERS RECEIVED (CAS 1) =====================

@api_router.get("/supplier/orders")
async def get_supplier_orders(user: User = Depends(require_supplier), status: Optional[str] = None):
    query = {"supplier_user_id": user.user_id, "is_connected": True}
    if status:
        query["status"] = status

    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    # Get shopkeeper names
    user_ids = list(set(o["user_id"] for o in orders))
    users = await db.users.find({"user_id": {"$in": user_ids}}, {"_id": 0, "user_id": 1, "name": 1}).to_list(100)
    users_map = {u["user_id"]: u["name"] for u in users}

    for order in orders:
        order["shopkeeper_name"] = users_map.get(order["user_id"], "Inconnu")
        items = await db.order_items.find({"order_id": order["order_id"]}, {"_id": 0}).to_list(100)
        order["items_count"] = len(items)
        order["items"] = items

    return orders

@api_router.put("/supplier/orders/{order_id}/status")
async def supplier_update_order_status(order_id: str, status_data: OrderStatusUpdate, user: User = Depends(require_supplier)):
    valid_transitions = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["shipped"],
        "shipped": ["delivered"],
    }

    order = await db.orders.find_one({"order_id": order_id, "supplier_user_id": user.user_id, "is_connected": True}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    allowed = valid_transitions.get(order["status"], [])
    if status_data.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Transition invalide: {order['status']} → {status_data.status}")

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc)}}
    )

    # If delivered, update stock for the shopkeeper
    if status_data.status == "delivered":
        # Get shopkeeper's active_store_id
        shopkeeper = await db.users.find_one({"user_id": order["user_id"]}, {"_id": 0})
        shopkeeper_store_id = shopkeeper.get("active_store_id") if shopkeeper else None

        items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
        for item in items:
            product = await db.products.find_one({"product_id": item["product_id"], "user_id": order["user_id"]}, {"_id": 0})
            if product:
                new_quantity = product["quantity"] + item["quantity"]
                await db.products.update_one(
                    {"product_id": item["product_id"]},
                    {"$set": {"quantity": new_quantity, "updated_at": datetime.now(timezone.utc)}}
                )
                movement = StockMovement(
                    product_id=item["product_id"],
                    user_id=order["user_id"],
                    store_id=shopkeeper_store_id,
                    type="in",
                    quantity=item["quantity"],
                    reason=f"Commande {order_id} livrée (fournisseur inscrit)",
                    previous_quantity=product["quantity"],
                    new_quantity=new_quantity
                )
                await db.stock_movements.insert_one(movement.model_dump())

                # Check alerts
                product["quantity"] = new_quantity
                await check_and_create_alerts(Product(**product), order["user_id"], store_id=shopkeeper_store_id)

    # Send push notification to shopkeeper
    await send_push_notification(
        order["user_id"],
        "Commande mise à jour",
        f"Votre commande {order_id} est maintenant: {status_data.status}"
    )

    return {"message": f"Statut mis à jour: {status_data.status}"}

# ===================== MARKETPLACE ROUTES (CAS 1) =====================

@api_router.get("/marketplace/suppliers")
async def search_marketplace_suppliers(
    user: User = Depends(require_auth),
    q: Optional[str] = None,
    category: Optional[str] = None,
    city: Optional[str] = None
):
    query: dict = {}
    if q:
        query["company_name"] = {"$regex": q, "$options": "i"}
    if category:
        query["categories"] = category
    if city:
        query["city"] = {"$regex": city, "$options": "i"}

    profiles = await db.supplier_profiles.find(query, {"_id": 0}).to_list(50)

    # Enrich with catalog count
    for profile in profiles:
        catalog_count = await db.catalog_products.count_documents({"supplier_user_id": profile["user_id"], "available": True})
        profile["catalog_count"] = catalog_count

    return profiles

@api_router.get("/marketplace/suppliers/{supplier_user_id}")
async def get_marketplace_supplier(supplier_user_id: str, user: User = Depends(require_auth)):
    profile = await db.supplier_profiles.find_one({"user_id": supplier_user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")

    catalog = await db.catalog_products.find({"supplier_user_id": supplier_user_id, "available": True}, {"_id": 0}).to_list(200)
    ratings = await db.supplier_ratings.find({"supplier_user_id": supplier_user_id}, {"_id": 0}).sort("created_at", -1).to_list(20)

    # Get raters names
    rater_ids = [r["shopkeeper_user_id"] for r in ratings]
    raters = await db.users.find({"user_id": {"$in": rater_ids}}, {"_id": 0, "user_id": 1, "name": 1}).to_list(100)
    raters_map = {u["user_id"]: u["name"] for u in raters}
    for r in ratings:
        r["shopkeeper_name"] = raters_map.get(r["shopkeeper_user_id"], "Anonyme")

    return {
        "profile": profile,
        "catalog": catalog,
        "ratings": ratings
    }

@api_router.get("/marketplace/search-products")
async def search_marketplace_products(
    user: User = Depends(require_auth),
    q: Optional[str] = None,
    category: Optional[str] = None
):
    query: dict = {"available": True}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}

    products = await db.catalog_products.find(query, {"_id": 0}).to_list(100)

    # Enrich with supplier profile info
    supplier_ids = list(set(p["supplier_user_id"] for p in products))
    profiles = await db.supplier_profiles.find({"user_id": {"$in": supplier_ids}}, {"_id": 0}).to_list(100)
    profiles_map = {p["user_id"]: p for p in profiles}

    for product in products:
        sup_profile = profiles_map.get(product["supplier_user_id"])
        product["supplier_name"] = sup_profile.get("company_name", "Inconnu") if sup_profile else "Inconnu"
        product["supplier_city"] = sup_profile.get("city", "") if sup_profile else ""
        product["supplier_rating"] = sup_profile.get("rating_average", 0) if sup_profile else 0

    return products

# ===================== INVITATION ROUTES (CAS 1) =====================

@api_router.post("/suppliers/{supplier_id}/invite")
async def invite_supplier(supplier_id: str, data: SupplierInvitationCreate, user: User = Depends(require_auth)):
    # Verify manual supplier exists
    supplier = await db.suppliers.find_one({"supplier_id": supplier_id, "user_id": user.user_id}, {"_id": 0})
    if not supplier:
        raise HTTPException(status_code=404, detail="Fournisseur non trouvé")

    # Check for existing pending invitation
    existing = await db.supplier_invitations.find_one({
        "manual_supplier_id": supplier_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Une invitation est déjà en attente pour ce fournisseur")

    invitation = SupplierInvitation(
        shopkeeper_user_id=user.user_id,
        manual_supplier_id=supplier_id,
        email=data.email
    )
    await db.supplier_invitations.insert_one(invitation.model_dump())

    return {"message": "Invitation envoyée", "invitation_id": invitation.invitation_id, "token": invitation.token}

@api_router.post("/auth/register-from-invitation")
async def register_from_invitation(user_data: UserCreate, token: str):
    """Register a supplier from an invitation token"""
    invitation = await db.supplier_invitations.find_one({"token": token, "status": "pending"}, {"_id": 0})
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation invalide ou expirée")

    if datetime.now(timezone.utc) > invitation["expires_at"]:
        await db.supplier_invitations.update_one({"token": token}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Invitation expirée")

    # Check email not taken
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Create supplier user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hashed_password,
        "picture": None,
        "auth_type": "email",
        "role": "supplier",
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(user_doc)

    # Create default settings
    settings = UserSettings(user_id=user_id)
    await db.user_settings.insert_one(settings.model_dump())

    # Mark invitation as accepted
    await db.supplier_invitations.update_one({"token": token}, {"$set": {"status": "accepted"}})

    # Link the manual supplier to this user
    await db.suppliers.update_one(
        {"supplier_id": invitation["manual_supplier_id"]},
        {"$set": {"linked_user_id": user_id}}
    )

    access_token = create_access_token(data={"sub": user_id})

    user_obj = User(
        user_id=user_id,
        email=user_data.email,
        name=user_data.name,
        picture=None,
        created_at=user_doc["created_at"],
        auth_type="email",
        role="supplier"
    )

    return TokenResponse(access_token=access_token, user=user_obj)

# ===================== RATING ROUTES (CAS 1) =====================

@api_router.post("/suppliers/{supplier_user_id}/rate")
async def rate_supplier(supplier_user_id: str, data: SupplierRatingCreate, user: User = Depends(require_auth)):
    if data.score < 1 or data.score > 5:
        raise HTTPException(status_code=400, detail="Le score doit être entre 1 et 5")

    # Verify the order exists and is delivered
    order = await db.orders.find_one({
        "order_id": data.order_id,
        "user_id": user.user_id,
        "supplier_user_id": supplier_user_id,
        "status": "delivered"
    }, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande livrée non trouvée")

    # Check if already rated
    existing = await db.supplier_ratings.find_one({
        "order_id": data.order_id,
        "shopkeeper_user_id": user.user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà noté cette commande")

    rating = SupplierRating(
        supplier_user_id=supplier_user_id,
        shopkeeper_user_id=user.user_id,
        order_id=data.order_id,
        score=data.score,
        comment=data.comment
    )
    await db.supplier_ratings.insert_one(rating.model_dump())

    # Update supplier profile average
    all_ratings = await db.supplier_ratings.find({"supplier_user_id": supplier_user_id}, {"_id": 0}).to_list(1000)
    avg = sum(r["score"] for r in all_ratings) / len(all_ratings) if all_ratings else 0
    await db.supplier_profiles.update_one(
        {"user_id": supplier_user_id},
        {"$set": {"rating_average": round(avg, 1), "rating_count": len(all_ratings)}}
    )

    return {"message": "Notation enregistrée", "rating_average": round(avg, 1)}

# ===================== PUSH NOTIFICATION HELPER =====================

async def send_push_notification(user_id: str, title: str, body: str):
    """Send push notification via Expo Push API"""
    tokens = await db.push_tokens.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(10)
    if not tokens:
        return

    try:
        import httpx
        messages = []
        for t in tokens:
            messages.append({
                "to": t["expo_push_token"],
                "title": title,
                "body": body,
                "sound": "default"
            })

        async with httpx.AsyncClient() as client:
            await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json"}
            )
    except Exception as e:
        logger.error(f"Push notification error: {e}")

# ===================== LATE DELIVERY CHECK =====================

async def check_late_deliveries_internal(user_id: str):
    """Check orders with expected_delivery in the past and not yet delivered"""
    now = datetime.now(timezone.utc)
    late_orders = await db.orders.find({
        "user_id": user_id,
        "expected_delivery": {"$lt": now},
        "status": {"$nin": ["delivered", "cancelled"]}
    }, {"_id": 0}).to_list(100)

    for order in late_orders:
        # Get supplier name
        supplier = await db.suppliers.find_one({"supplier_id": order["supplier_id"]}, {"_id": 0})
        supplier_name = supplier["name"] if supplier else "Inconnu"

        existing = await db.alerts.find_one({
            "user_id": user_id,
            "type": "late_delivery",
            "is_dismissed": False,
            "message": {"$regex": order["order_id"]}
        })
        if not existing:
            alert = Alert(
                user_id=user_id,
                type="late_delivery",
                title="Livraison en retard",
                message=f"Commande {order['order_id']} ({supplier_name}) aurait dû être livrée le {str(order['expected_delivery'])[:10]}",
                severity="warning"
            )
            await db.alerts.insert_one(alert.model_dump())

@api_router.post("/check-late-deliveries")
async def check_late_deliveries(user: User = Depends(require_auth)):
    await check_late_deliveries_internal(user.user_id)
    return {"message": "Vérification des livraisons en retard effectuée"}

# ===================== EXPORT CSV ROUTES =====================


def get_user_from_token_query(token: str = Query(...)):
    """Helper to auth via query param (for direct download links)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    # We can't verify user exists easily without async here or duplicating logic, 
    # but for export `sub` is usually enough. Optimally we'd reuse `get_current_user` logic but it depends on OAuth2PasswordBearer.
    # Let's just return a simple User object or fetch from DB if needed. 
    # Since we are in async function below, we can fetch user there.
    return user_id

@api_router.get("/export/products/csv")
async def export_products_csv(token: str = Query(...)):
    try:
        user_id = get_user_from_token_query(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Non autorisé")
        
    products = await db.products.find({"user_id": user_id, "is_active": True}, {"_id": 0}).to_list(1000)
    categories = await db.categories.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    cat_map = {c["category_id"]: c["name"] for c in categories}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nom", "SKU", "Catégorie", "Quantité", "Unité", "Prix achat", "Prix vente", "Stock min", "Stock max", "Créé le"])
    for p in products:
        writer.writerow([
            p.get("name", ""),
            p.get("sku", ""),
            cat_map.get(p.get("category_id"), ""),
            p.get("quantity", 0),
            p.get("unit", ""),
            p.get("purchase_price", 0),
            p.get("selling_price", 0),
            p.get("min_stock", 0),
            p.get("max_stock", 0),
            str(p.get("created_at", ""))[:10],
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=produits.csv"}
    )

@api_router.get("/export/movements/csv")
async def export_movements_csv(token: str = Query(...)):
    try:
        user_id = get_user_from_token_query(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Non autorisé")

    movements = await db.stock_movements.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    products = await db.products.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    prod_map = {p["product_id"]: p["name"] for p in products}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Produit", "Type", "Quantité", "Avant", "Après", "Raison"])
    for m in movements:
        writer.writerow([
            str(m.get("created_at", ""))[:19],
            prod_map.get(m.get("product_id"), "Inconnu"),
            "Entrée" if m.get("type") == "in" else "Sortie",
            m.get("quantity", 0),
            m.get("previous_quantity", 0),
            m.get("new_quantity", 0),
            m.get("reason", ""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mouvements.csv"}
    )

@api_router.get("/export/accounting/csv")
async def export_accounting_csv(token: str = Query(...), days: int = Query(30)):
    try:
        user_id = get_user_from_token_query(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Non autorisé")

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Sales
    sales = await db.sales.find({"user_id": user_id, "created_at": {"$gte": start_date}}).to_list(5000)
    # Losses
    loss_movements = await db.stock_movements.find({
        "user_id": user_id, "type": "out",
        "created_at": {"$gte": start_date}, "reason": {"$ne": "Vente POS"}
    }).to_list(5000)
    products = await db.products.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    prod_map = {p["product_id"]: p for p in products}
    # Purchases
    orders = await db.orders.find({
        "user_id": user_id, "status": "delivered", "updated_at": {"$gte": start_date}
    }).to_list(1000)

    output = io.StringIO()
    writer = csv.writer(output)

    # Section: Sales
    writer.writerow(["=== VENTES ==="])
    writer.writerow(["Date", "Réf", "Articles", "Mode paiement", "Montant"])
    for s in sales:
        writer.writerow([
            str(s.get("created_at", ""))[:19],
            s.get("sale_id", "")[-6:].upper(),
            sum(i.get("quantity", 0) for i in s.get("items", [])),
            s.get("payment_method", ""),
            s.get("total_amount", 0),
        ])

    writer.writerow([])
    writer.writerow(["=== PERTES / DEMARQUE ==="])
    writer.writerow(["Date", "Produit", "Quantité", "Coût unitaire", "Perte totale", "Raison"])
    for m in loss_movements:
        p = prod_map.get(m.get("product_id"))
        price = p.get("purchase_price", 0) if p else 0
        writer.writerow([
            str(m.get("created_at", ""))[:19],
            p.get("name", "Inconnu") if p else "Inconnu",
            m.get("quantity", 0),
            price,
            price * m.get("quantity", 0),
            m.get("reason", ""),
        ])

    writer.writerow([])
    writer.writerow(["=== ACHATS FOURNISSEURS ==="])
    writer.writerow(["Date livraison", "Réf commande", "Fournisseur", "Montant"])
    for o in orders:
        writer.writerow([
            str(o.get("updated_at", ""))[:19],
            o.get("order_id", "")[-6:].upper(),
            o.get("supplier_name", ""),
            o.get("total_amount", 0),
        ])

    writer.writerow([])
    total_rev = sum(s.get("total_amount", 0) for s in sales)
    total_loss = sum((prod_map.get(m.get("product_id"), {}).get("purchase_price", 0) * m.get("quantity", 0)) for m in loss_movements)
    total_purch = sum(o.get("total_amount", 0) for o in orders)
    writer.writerow(["=== RESUME ==="])
    writer.writerow(["Chiffre d'affaires", total_rev])
    writer.writerow(["Pertes", total_loss])
    writer.writerow(["Achats fournisseurs", total_purch])
    writer.writerow(["Période", f"Derniers {days} jours"])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=comptabilite_{days}j.csv"}
    )

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "Stock Management API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

@api_router.get("/check-db")
async def check_db():
    try:
        await db.command("ping")
        return {"status": "connected", "database": db.name}
    except Exception as e:
        logger.error(f"DB Check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:19000",
        "http://localhost:19006",
        "http://localhost:8081",
        "http://localhost:3000",
        os.environ.get("ALLOWED_ORIGIN", "*")
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
