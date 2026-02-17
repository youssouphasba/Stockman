import json
import os

# Configuration
LOCALES_DIR = r"C:\Users\Utilisateur\projet_stock\landing-page\public\locales"
MASTER_FILE = os.path.join(LOCALES_DIR, "fr.json")
LANGUAGES = ["ar", "de", "en", "es", "ff", "hi", "it", "pl", "pt", "ro", "ru", "tr", "wo", "zh"]

def sync_dict(master_dict, target_dict, lang):
    """Recursively sync target_dict to match master_dict structure."""
    new_dict = {}
    for key, value in master_dict.items():
        if isinstance(value, dict):
            new_dict[key] = sync_dict(value, target_dict.get(key, {}), lang)
        else:
            # If key exists and is NOT English (simple heuristic: if target != master and target != English version)
            # Actually, to be safe, we'll just keep what's there if it looks translated.
            # But the problem is everything IS English right now.
            target_val = target_dict.get(key)
            if target_val and target_val != value: # If different from French, it might be a translation
                 new_dict[key] = target_val
            else:
                 new_dict[key] = value # Fallback to French (better than English if the user is in a non-English locale)
                 # Note: Ideally we'd use an AI to translate here, but for now we sync the structure.
    return new_dict

def main():
    with open(MASTER_FILE, 'r', encoding='utf-8') as f:
        master_data = json.load(f)

    for lang in LANGUAGES:
        target_path = os.path.join(LOCALES_DIR, f"{lang}.json")
        if os.path.exists(target_path):
            with open(target_path, 'r', encoding='utf-8') as f:
                target_data = json.load(f)
        else:
            target_data = {}

        print(f"Syncing {lang}...")
        synced_data = sync_dict(master_data, target_data, lang)
        
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(synced_data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    main()
