from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import json

async def list_users():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'stock_management')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    users = await db.users.find({}, {'_id': 0, 'email': 1, 'name': 1, 'role': 1, 'created_at': 1}).to_list(100)
    print(json.dumps(users, default=str, indent=2))

if __name__ == "__main__":
    asyncio.run(list_users())
