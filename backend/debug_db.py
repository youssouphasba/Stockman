import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

async def check_db():
    print("--- Database Debug Scan ---")
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'stock_management')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("\n--- All Users ---")
    async for u in db.users.find({}, {"password_hash": 0, "_id": 0}):
        print(f"ID: {u.get('user_id')}, Email: {u.get('email')}, Role: {u.get('role')}, Parent: {u.get('parent_user_id')}, Name: {u.get('name')}")
    
    print("\n--- Recent Suppliers (All) ---")
    cursor = db.suppliers.find().sort("created_at", -1).limit(10)
    async for s in cursor:
        print(f"ID: {s.get('supplier_id')}, Name: {s.get('name')}, UserID: {s.get('user_id')}, Active: {s.get('is_active')}, CreatedAt: {s.get('created_at')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_db())
