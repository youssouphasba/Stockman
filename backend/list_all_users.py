import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def list_all_details():
    load_dotenv('backend/.env')
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'stock_management')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"Name: {u.get('name')} | Email: {u.get('email')} | Role: {u.get('role')} | UserID: {u.get('user_id')} | Created: {u.get('created_at')}")

if __name__ == "__main__":
    asyncio.run(list_all_details())
