import requests
import os
from dotenv import load_dotenv
import json

load_dotenv()

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
AI_SUPPORT_URL = f"{BASE_URL}/api/ai/support"

EMAIL = os.getenv("TEST_EMAIL", "admin@stockman.com")
PASSWORD = os.getenv("TEST_PASSWORD", "admin123")

def login():
    print(f"--- Authenticating as {EMAIL} ---")
    try:
        response = requests.post(LOGIN_URL, json={"email": EMAIL, "password": PASSWORD})
        if response.status_code == 200:
            token = response.json()["access_token"]
            print(f"Login successful. Token: {token[:10]}...")
            return token
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_ai_tools():
    token = login()
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}

    # Test 1: Sales Stats
    print("\n--- 1. Testing Sales Tool (What are my sales today?) ---")
    prompt = {
        "message": "Quel est mon chiffre d'affaires aujourd'hui ?",
        "history": [] 
    }
    res = requests.post(AI_SUPPORT_URL, json=prompt, headers=headers)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print(f"AI Response: {res.json()['response']}")
    else:
        print(f"Error: {res.text}")

    # Test 2: Product Info
    print("\n--- 2. Testing Product Tool (Do I have Riz?) ---")
    prompt = {
        "message": "Est-ce que j'ai du Riz en stock ?",
        "history": [] 
    }
    res = requests.post(AI_SUPPORT_URL, json=prompt, headers=headers)
    print(f"Status: {res.status_code}")
    # Test 3: Advice (Check verbosity)
    print("\n--- 3. Testing Advice (Check verbosity) ---")
    prompt = {
        "message": "Comment puis-je améliorer mes ventes ce mois-ci ?",
        "history": [] 
    }
    res = requests.post(AI_SUPPORT_URL, json=prompt, headers=headers)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print(f"AI Response: {res.json()['response']}")
    else:
        print(f"Error: {res.text}")

if __name__ == "__main__":
    test_ai_tools()
