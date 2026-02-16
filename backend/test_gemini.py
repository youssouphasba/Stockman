import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

api_key = os.environ.get("GOOGLE_API_KEY")
print(f"Using API Key: {api_key[:10]}...")

if not api_key:
    print("ERROR: GOOGLE_API_KEY not found in .env")
    exit(1)

try:
    genai.configure(api_key=api_key)
    
    print("Listing models...")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Available model: {m.name}")

    print("\nTesting models/gemini-1.5-flash generate_content...")
    model = genai.GenerativeModel('models/gemini-1.5-flash')
    
    response = model.generate_content("Quel temps fait-il ?")
    print(f"Response: {response.text}")

except Exception as e:
    import traceback
    print(f"Error Type: {type(e)}")
    print(f"Error Message: {e}")
    if hasattr(e, "response"):
        try:
            print(f"Response Status: {e.response.status_code}")
            print(f"Response Text: {e.response.text}")
        except:
             pass
    traceback.print_exc()
