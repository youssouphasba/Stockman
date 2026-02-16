import sys
import os
from pymongo import MongoClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

load_dotenv()
MONGO_URL = os.environ.get("MONGO_URL")

# Setup identical to server.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    print(f"Connecting to MongoDB at {MONGO_URL[:20]}...", file=sys.stderr)
    client = MongoClient(MONGO_URL)
    db = client["stock_management"]
    
    email = "admin@stockman.com"
    password = "admin123"
    
    # Check if exists
    existing = db.users.find_one({"email": email})
    if existing:
        print(f"User {email} already exists. Updating...", file=sys.stderr)
        new_hash = pwd_context.hash(password)
        db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash, "role": "superadmin"}}
        )
        print("Updated existing user.", file=sys.stderr)
    else:
        print(f"Creating new user {email}...", file=sys.stderr)
        new_hash = pwd_context.hash(password)
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": "Super Admin",
            "password_hash": new_hash,
            "role": "superadmin",
            "auth_type": "email",
            "created_at": datetime.now(timezone.utc),
            "permissions": {},
            "store_ids": [],
            "active_store_id": None
        }
        
        db.users.insert_one(new_user)
        print(f"Created user with ID: {user_id}", file=sys.stderr)

    # Verification
    user = db.users.find_one({"email": email})
    if user:
        is_valid = pwd_context.verify(password, user["password_hash"])
        print(f"Verification Check: {'✅ VALID' if is_valid else '❌ INVALID'}", file=sys.stderr)
    else:
        print("❌ User not found after creation!", file=sys.stderr)

if __name__ == "__main__":
    create_admin()
