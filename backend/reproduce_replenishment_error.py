import argparse
import json
import os

import requests
from dotenv import load_dotenv


def resolve_required_value(cli_value: str | None, env_name: str, label: str) -> str:
    value = cli_value or os.environ.get(env_name)
    if not value:
        raise SystemExit(f"{label} requis via --{label.lower().replace(' ', '-')} ou {env_name}.")
    return value


def reproduce(base_url: str, email: str, password: str):
    print(f"--- Authenticating as {email} ---")
    try:
        response = requests.post(f"{base_url}/auth/login", json={"email": email, "password": password}, timeout=30)
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            return
        
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        print("\n--- Testing GET /replenishment/suggestions ---")
        res = requests.get(f"{base_url}/replenishment/suggestions", headers=headers, timeout=30)
        print(f"Status: {res.status_code}")
        if res.status_code == 200:
            print("Success! Suggestions count:", len(res.json()))
            print("Preview:", json.dumps(res.json()[:2], indent=2))
        else:
            print("Error:", res.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    load_dotenv()
    parser = argparse.ArgumentParser(description="Reproduce replenishment suggestions behavior for a given account.")
    parser.add_argument("--base-url", help="Backend API base URL, e.g. http://localhost:8000/api")
    parser.add_argument("--email", help="User email")
    parser.add_argument("--password", help="User password")
    args = parser.parse_args()

    base_url = resolve_required_value(args.base_url, "REPLENISH_BASE_URL", "Base URL")
    email = resolve_required_value(args.email, "REPLENISH_EMAIL", "User email")
    password = resolve_required_value(args.password, "REPLENISH_PASSWORD", "User password")
    reproduce(base_url, email, password)
