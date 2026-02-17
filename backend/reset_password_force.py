import sys
from pymongo import MongoClient
from passlib.context import CryptContext

# Setup identical to server.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")

def force_reset():
    print(f"Connecting to MongoDB at {MONGO_URL[:20]}...", file=sys.stderr)
    client = MongoClient(MONGO_URL)
    db = client["stock_management"]
    
    email = "contact@stockman.pro"
    password = "admin1234"
    
    print(f"Hashing password '{password}'...", file=sys.stderr)
    new_hash = pwd_context.hash(password)
    
    print(f"Updating user '{email}'...", file=sys.stderr)
    result = db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash}}
    )
    
    print(f"Update acknowledged: {result.acknowledged}", file=sys.stderr)
    print(f"Modified count: {result.modified_count}", file=sys.stderr)
    
    # Verification
    user = db.users.find_one({"email": email})
    if user:
        stored_hash = user.get("password_hash")
        is_valid = pwd_context.verify(password, stored_hash)
        print(f"Verification Check: {'✅ VALID' if is_valid else '❌ INVALID'}", file=sys.stderr)
    else:
        print("❌ User not found after update!", file=sys.stderr)

if __name__ == "__main__":
    force_reset()
