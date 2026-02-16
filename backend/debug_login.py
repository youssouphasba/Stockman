import requests
import sys

BASE_URL = "http://localhost:8000/api"
EMAIL = "contact@tontetic.fr"
PASSWORD = "admin1234"

def test_login():
    print(f"Attempting login with {EMAIL}...")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print(f"Token received: {token[:20]}...")
            return token
        else:
            print("Login failed.")
            return None
    except Exception as e:
        print(f"Exception during login: {e}")
        return None

def test_protected_route(token):
    print("\nAttempting to access /auth/me with token...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Exception during protected route: {e}")

if __name__ == "__main__":
    token = test_login()
    if token:
        test_protected_route(token)
