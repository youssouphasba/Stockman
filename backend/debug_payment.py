import asyncio
import httpx
import uuid
import time

BASE_URL = "http://127.0.0.1:8000"

async def test_payment():
    print("--- Testing Payment Endpoint ---")
    
    # 1. Register/Login to get token
    unique_id = uuid.uuid4().hex[:8]
    email = f"pay_{unique_id}@test.com"
    password = "password123"
    
    async with httpx.AsyncClient() as client:
        # Register
        print(f"Registering {email}...")
        try:
            resp = await client.post(f"{BASE_URL}/api/auth/register", json={
                "email": email,
                "password": password,
                "name": "Payment Tester",
                "phone": "+221770000000" # Force XOF currency
            })
        except Exception as e:
            print(f"Registration request failed: {e}")
            return

        if resp.status_code != 200:
            print(f"Registration failed: {resp.text}")
            return
            
        data = resp.json()
        token = data.get("access_token")
        if not token:
             print(f"No token returned: {data}")
             return
             
        user = data.get("user", {})
        print(f"User Currency: {user.get('currency')}")
        
        # 2. Call Subscribe
        print("Calling /api/payment/subscribe...")
        try:
            resp = await client.post(
                f"{BASE_URL}/api/payment/subscribe",
                headers={"Authorization": f"Bearer {token}"},
                timeout=30.0
            )
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print(f"Success: {resp.json()}")
            else:
                print(f"Error: {resp.text}")
        except Exception as e:
            print(f"Exception calling subscribe: {e}")

if __name__ == "__main__":
    asyncio.run(test_payment())
