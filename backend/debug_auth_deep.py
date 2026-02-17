import asyncio
from pymongo import MongoClient
from passlib.context import CryptContext
import logging

# Setup identical to server.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def debug_user():
    client = MongoClient("mongodb://localhost:27017")
    db = client["stock_management"]
    
    email = "contact@stockman.pro"
    user = db.users.find_one({"email": email})
    
    if not user:
        print(f"❌ User {email} not found!")
        return

    print(f"✅ User found: {user['email']}")
    print(f"   Role: {user.get('role')}")
    print(f"   Auth Type: {user.get('auth_type')}")
    
    stored_hash = user.get("password_hash")
    print(f"   Stored Hash: {stored_hash}")
    
    password = "admin1234"
    is_valid = verify_password(password, stored_hash)
    print(f"   Verify '{password}': {'✅ MATCH' if is_valid else '❌ FAIL'}")
    
    if not is_valid:
        print("   ⚠️ Fixing password hash...")
        new_hash = get_password_hash(password)
        db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": new_hash}}
        )
        print("   ✅ Password updated to 'admin1234'")
        
        # Verify again
        user = db.users.find_one({"email": email})
        is_valid_now = verify_password(password, user["password_hash"])
        print(f"   Re-Verify: {'✅ MATCH' if is_valid_now else '❌ FAIL'}")

if __name__ == "__main__":
    debug_user()
