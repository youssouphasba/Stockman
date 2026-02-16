import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def f():
    load_dotenv('backend/.env')
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME','stock_management')]
    count = await db.products.count_documents({})
    print(f"COUNT_RESULT: {count}")

if __name__ == "__main__":
    asyncio.run(f())
