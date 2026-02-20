import json
import os

def sync_locales(base_file, target_dir):
    with open(base_file, 'r', encoding='utf-8-sig') as f:
        base_data = json.load(f)

    # Sort keys for consistency
    base_data = dict(sorted(base_data.items()))
    for section in base_data:
        if isinstance(base_data[section], dict):
            base_data[section] = dict(sorted(base_data[section].items()))

    # Walk through target files
    for filename in os.listdir(target_dir):
        if filename.endswith('.json') and filename != os.path.basename(base_file):
            target_path = os.path.join(target_dir, filename)
            print(f"Syncing {filename}...")
            
            with open(target_path, 'r', encoding='utf-8-sig') as f:
                target_data = json.load(f)

            synced_data = {}
            new_keys_count = 0

            # Ensure all sections from base exist in target
            for section, keys in base_data.items():
                if section not in target_data:
                    synced_data[section] = keys # Entire section missing
                    new_keys_count += len(keys) if isinstance(keys, dict) else 1
                elif isinstance(keys, dict):
                    synced_data[section] = target_data[section]
                    for key, value in keys.items():
                        if key not in synced_data[section]:
                            synced_data[section][key] = value
                            new_keys_count += 1
                    # Sort section keys
                    synced_data[section] = dict(sorted(synced_data[section].items()))
                else:
                    synced_data[section] = target_data.get(section, keys)

            # Sort top-level keys
            synced_data = dict(sorted(synced_data.items()))

            with open(target_path, 'w', encoding='utf-8-sig') as f:
                json.dump(synced_data, f, ensure_ascii=False, indent=2)
            
            print(f"  Done. Added {new_keys_count} keys.")

    # Also rewrite base file to ensure it's sorted and clean (removes duplicates too!)
    with open(base_file, 'w', encoding='utf-8-sig') as f:
        json.dump(base_data, f, ensure_ascii=False, indent=2)
    print("Base file cleaned and sorted.")

if __name__ == "__main__":
    locales_path = r"C:\Users\Utilisateur\projet_stock\frontend\locales"
    sync_locales(os.path.join(locales_path, "fr.json"), locales_path)
