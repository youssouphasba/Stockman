import requests
import json

BASE_URL = "http://localhost:8000"

# Need authentication for settings!
# We can't easily login without a user.
# But we can try to hit the endpoint and expect 401, which confirms it exists.
# If it was 404, it would mean it doesn't exist.

def test_settings_existence():
    print("Testing /api/settings existence...")
    try:
        response = requests.get(f"{BASE_URL}/api/settings", timeout=5)
        print(f"Status: {response.status_code}")
        if response.status_code == 404:
            print("ERROR: Endpoint /api/settings NOT FOUND")
        elif response.status_code == 401:
            print("SUCCESS: Endpoint exists (401 Unauthorized as expected)")
        elif response.status_code == 200:
             print("SUCCESS: Endpoint exists (200 OK)")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_settings_existence()
