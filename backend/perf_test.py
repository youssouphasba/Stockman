import time
import requests
import json
import os

API_BASE = "http://localhost:8000/api"

def test_perf():
    # 1. Login to get token
    login_url = f"{API_BASE}/auth/login"
    # We'll use a known test user if possible, or try to register one
    user_data = {"email": "perf_test@example.com", "password": "Password123!"}
    
    # Try register first
    requests.post(f"{API_BASE}/auth/register", json={"email": "perf_test@example.com", "password": "Password123!", "name": "Perf Tester"})
    
    response = requests.post(login_url, json=user_data)
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        return
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ("/dashboard", "Dashboard Summary"),
        ("/sales/forecast", "AI Sales Forecast"),
        ("/replenishment/suggestions", "Replenishment Suggestions"),
        ("/products", "Product List (50)"),
        ("/activity-logs", "Activity Logs"),
    ]
    
    print(f"{'Endpoint':<30} | {'Status':<10} | {'Time (s)':<10}")
    print("-" * 55)
    
    for path, label in endpoints:
        start = time.time()
        res = requests.get(f"{API_BASE}{path}", headers=headers)
        duration = time.time() - start
        print(f"{label:<30} | {res.status_code:<10} | {duration:.3f}s")

    # Test AI Support (POST)
    print("-" * 55)
    start = time.time()
    res = requests.post(f"{API_BASE}/ai/support", headers=headers, json={"message": "Comment gérer mon stock ?"})
    duration = time.time() - start
    print(f"{'AI Support (POST)':<30} | {res.status_code:<10} | {duration:.3f}s")

if __name__ == "__main__":
    test_perf()
