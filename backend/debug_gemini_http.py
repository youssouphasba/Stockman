import os
import httpx
import json
from dotenv import load_dotenv
from pathlib import Path

# Load .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

api_key = os.environ.get("GOOGLE_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [
        {
            "parts": [
                {"text": "Salut, comment ça va ?"}
            ]
        }
    ]
}

headers = {
    "Content-Type": "application/json"
}

print(f"Testing direct HTTP POST to: {url[:60]}...")
try:
    response = httpx.post(url, json=payload, headers=headers, timeout=30.0)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Exception: {e}")
