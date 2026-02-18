import json
import os

locales_dir = r"c:\Users\Utilisateur\projet_stock\frontend\locales"
reference_file = os.path.join(locales_dir, "fr.json")
english_file = os.path.join(locales_dir, "en.json")

with open(reference_file, 'r', encoding='utf-8') as f:
    reference_data = json.load(f)

with open(english_file, 'r', encoding='utf-8') as f:
    english_data = json.load(f)

def sync_keys(ref, target, eng_ref=None):
    """Recursively sync keys from ref to target."""
    synced = {}
    for key, value in ref.items():
        if isinstance(value, dict):
            # Recursively sync nested dicts
            target_val = target.get(key, {})
            eng_val = eng_ref.get(key, {}) if eng_ref else {}
            synced[key] = sync_keys(value, target_val, eng_val)
        else:
            # For leaf nodes, if key exists in target, keep it
            if key in target:
                # If target value is identical to French value and NOT fr.json itself,
                # it might be a leaked placeholder.
                # However, some short words (like "OK", "7d") are same in many languages.
                # We only flag/replace if it's a long string or specifically known to be French.
                synced[key] = target[key]
            else:
                # If missing, use English as fallback if available, else French
                if eng_ref and key in eng_ref:
                    synced[key] = eng_ref[key]
                else:
                    synced[key] = value
    return synced

for filename in os.listdir(locales_dir):
    if filename.endswith(".json") and filename != "fr.json":
        filepath = os.path.join(locales_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                target_data = json.load(f)
            except json.JSONDecodeError:
                print(f"Error decoding {filename}, skipping.")
                continue
        
        # Determine if we should use English reference
        # We don't use English reference when syncing en.json itself (to avoid circularity though eng_ref would be same)
        current_eng_ref = english_data if filename != "en.json" else None
        
        synced_data = sync_keys(reference_data, target_data, current_eng_ref)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(synced_data, f, ensure_ascii=False, indent=2)
        print(f"Synced {filename}")

print("Sync complete.")
