import requests
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
AI_SUPPORT_URL = f"{BASE_URL}/api/ai/support"
AI_HISTORY_URL = f"{BASE_URL}/api/ai/history"

EMAIL = os.getenv("TEST_EMAIL", "admin@stockman.com")
PASSWORD = os.getenv("TEST_PASSWORD", "admin123")

def login():
    print(f"--- Authenticating as {EMAIL} ---")
    try:
        response = requests.post(LOGIN_URL, json={"username": EMAIL, "password": PASSWORD})
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

def test_ai_history():
    token = login()
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Clear History first
    print("\n--- 1. Clearing History ---")
    res = requests.delete(AI_HISTORY_URL, headers=headers)
    print(f"Status: {res.status_code}, Response: {res.text}")

    # 2. Get History (should be empty)
    print("\n--- 2. Getting History (Expect Empty) ---")
    res = requests.get(AI_HISTORY_URL, headers=headers)
    print(f"Status: {res.status_code}, Response: {res.json()}")
    
    # 3. Send Message
    print("\n--- 3. Sending AI Message ---")
    prompt = {
        "message": "Bonjour, ceci est un test de mémoire.",
        "history": [] 
    }
    res = requests.post(AI_SUPPORT_URL, json=prompt, headers=headers)
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        print(f"AI Response: {res.json()['response'][:50]}...")
    else:
        print(f"Error: {res.text}")

    # 4. Get History (should have user message + assistant message)
    print("\n--- 4. Getting History (Expect populated) ---")
    res = requests.get(AI_HISTORY_URL, headers=headers)
    data = res.json()
    print(f"Status: {res.status_code}")
    if "messages" in data:
        print(f"Message count: {len(data['messages'])}")
        for msg in data['messages']:
            print(f"- [{msg['role']}] {msg['content'][:30]}...")
    else:
        print(f"Response: {data}")

    # 5. Clear History again
    print("\n--- 5. Clearing History Finally ---")
    requests.delete(AI_HISTORY_URL, headers=headers)
    print("History cleared.")

if __name__ == "__main__":
    test_ai_history()
