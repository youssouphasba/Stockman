import requests
import sys
import json

BASE_URL = "http://localhost:8000/api"
# Use known credentials or create a test user if needed.
# For now, let's try with the same credentials as debug_login.py
EMAIL = "contact@tontetic.fr"
PASSWORD = "admin1234"

def test_endpoints():
    print(f"--- Authenticating as {EMAIL} ---")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            return
        
        token = response.json().get("access_token")
        print(f"Login successful. Token: {token[:10]}...")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test Dashboard
        print("\n--- Testing GET /dashboard ---")
        dash_res = requests.get(f"{BASE_URL}/dashboard", headers=headers)
        print(f"Status: {dash_res.status_code}")
        if dash_res.status_code == 200:
             print("Success! Data preview:", str(dash_res.json())[:200])
        else:
             print("Error:", dash_res.text)

        # Test Statistics
        print("\n--- Testing GET /statistics ---")
        stat_res = requests.get(f"{BASE_URL}/statistics", headers=headers)
        print(f"Status: {stat_res.status_code}")

        # Test AI Support
        print("\n--- Testing POST /ai/support ---")
        ai_res = requests.post(f"{BASE_URL}/ai/support", headers=headers, json={"message": "Hello", "history": []})
        print(f"Status: {ai_res.status_code}")
        print(f"Response: {ai_res.text}")
        
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_endpoints()
