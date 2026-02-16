import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

api_key = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

try:
    models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
    print(f"Testing {len(models)} models...")
    
    for model_name in models:
        # Use short name or full name? try both
        short_name = model_name.replace("models/", "")
        
        print(f"\n--- Testing: {model_name} ---")
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Ping", generation_config={"max_output_tokens": 10})
            print(f"SUCCESS with {model_name}: {response.text}")
            break # Stop at first success
        except Exception as e:
            print(f"FAILED with {model_name}: {e}")
            
except Exception as e:
    print(f"Global error: {e}")
