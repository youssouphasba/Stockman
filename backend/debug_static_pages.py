import requests
import sys

BASE_URL = "http://localhost:8000"

def test_get_cgu():
    url = f"{BASE_URL}/api/cgu"
    print(f"Testing GET {url}...")
    try:
        response = requests.get(url, timeout=5)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Response Sample:", response.text[:100])
        else:
            print("Error Response:", response.text)
    except Exception as e:
        print(f"Exception: {e}")

def test_update_cgu():
    # Note: Admin routes are usually under /api/admin if admin_router is included there.
    # Let's check where admin_router is mounted.
    # Assuming /api/admin based on typical structure, or directly on api_router if it was mixed.
    # The code showed: @admin_router.post("/cgu")
    # We need to know where admin_router is included.
    # But often it's mounted as /api/admin
    
    url = f"{BASE_URL}/api/admin/cgu" 
    print(f"Testing POST {url}...")
    payload = {"content": "# Test CGU content update"}
    
    # We need to fake auth or if permissive.
    # If auth required, this might fail 401.
    try:
        response = requests.post(url, json=payload, timeout=5)
        print(f"Status: {response.status_code}")
        print("Response:", response.text)
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_get_cgu()
    test_update_cgu()
