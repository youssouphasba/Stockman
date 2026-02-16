import requests
import json

BASE_URL = "http://localhost:8000/api"
EMAIL = "contact@tontetic.fr"
PASSWORD = "admin1234"

def reproduce():
    print(f"--- Authenticating as {EMAIL} ---")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            return
        
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        print("\n--- Testing GET /replenishment/suggestions ---")
        res = requests.get(f"{BASE_URL}/replenishment/suggestions", headers=headers)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print("Success! Suggestions count:", len(res.json()))
            print("Preview:", json.dumps(res.json()[:2], indent=2))
        else:
            print("Error:", res.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    reproduce()
