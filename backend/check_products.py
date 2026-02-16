import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def check_products():
    load_dotenv('backend/.env')
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'stock_management')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    products = await db.products.find({}, {"_id": 0}).to_list(10)
    print(f"Total Products Sample: {len(products)}")
    for p in products:
        print(f"Name: {p.get('name')} | UserID: {p.get('user_id')}")
    
    count = await db.products.count_documents({})
    print(f"Total Products Count: {count}")

if __name__ == "__main__":
    asyncio.run(check_products())
