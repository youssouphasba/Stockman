import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load .env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

api_key = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

print("Testing Gemini integration with genai library...")
try:
    # Test with the model name from server.py
    model_name = 'gemini-2.5-flash'
    print(f"Initializing model: {model_name}")
    model = genai.GenerativeModel(model_name)
    
    print("Starting chat...")
    chat = model.start_chat()
    
    print("Sending message: 'Salut'...")
    response = chat.send_message("Salut")
    print(f"Response: {response.text}")
    print("Success!")
except Exception as e:
    print(f"Error caught: {e}")
    # Try with gemini-1.5-flash as fallback to see if it's the model name
    try:
        print("\nTrying with gemini-1.5-flash fallback...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        chat = model.start_chat()
        response = chat.send_message("Salut")
        print(f"1.5-flash Response: {response.text}")
    except Exception as e2:
        print(f"Fallback error: {e2}")
