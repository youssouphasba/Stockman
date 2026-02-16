import asyncio
import time
import httpx
from datetime import datetime
import uuid

# URL of your local backend
BASE_URL = "http://127.0.0.1:8000"

async def test_login_performance():
    print(f"--- Starting Full Login Flow Test at {datetime.now()} ---")
    
    # 1. Register a fresh user to ensure we can login successfully
    unique_id = uuid.uuid4().hex[:8]
    email = f"perf_test_{unique_id}@example.com"
    password = "password123"
    
    async with httpx.AsyncClient() as client:
        # REGISTER
        print(f"1. Registering user {email}...")
        start_reg = time.time()
        try:
            reg_resp = await client.post(f"{BASE_URL}/api/auth/register", json={
                "email": email,
                "password": password,
                "name": "Perf Tester"
            }, timeout=30.0)
            print(f"   Registration Status: {reg_resp.status_code} ({time.time() - start_reg:.4f}s)")
        except Exception as e:
            print(f"   Registration Failed: {e}")
            return

        # LOGIN
        print(f"2. Logging in...")
        start_login = time.time()
        try:
            login_resp = await client.post(f"{BASE_URL}/api/auth/login", json={
                "email": email,
                "password": password
            }, timeout=30.0)
            end_login = time.time()
            duration = end_login - start_login
            
            print(f"   Login Status: {login_resp.status_code}")
            print(f"   Login Duration: {duration:.4f} seconds")
            
            if "X-Process-Time" in login_resp.headers:
                print(f"   Server-Reported Process Time: {login_resp.headers['X-Process-Time']}s")
            
            if login_resp.status_code == 200:
                print("   Login SUCCESS")
            else:
                print(f"   Login ERROR: {login_resp.text}")

        except httpx.TimeoutException:
            print(f"   TIMEOUT ERROR after {time.time() - start_login:.4f} seconds")
        except Exception as e:
            print(f"   Test Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_login_performance())
