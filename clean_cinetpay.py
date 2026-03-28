import os
import json

def clean_json_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".json"):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Remove keys containing ''
                    if isinstance(data, dict):
                        keys_to_remove = [k for k in data.keys() if '' in k.lower()]
                        for k in keys_to_remove:
                            del data[k]
                            print(f"Removed {k} from {path}")
                        
                        # Search deeper in nested dicts if necessary (optional but safe)
                        def deep_clean(d):
                            if isinstance(d, dict):
                                keys = list(d.keys())
                                for k in keys:
                                    if '' in k.lower():
                                        del d[k]
                                    else:
                                        deep_clean(d[k])
                            elif isinstance(d, list):
                                for item in d:
                                    deep_clean(item)
                        
                        deep_clean(data)

                        with open(path, 'w', encoding='utf-8') as f:
                            json.dump(data, f, ensure_ascii=False, indent=4)
                except Exception as e:
                    print(f"Error processing {path}: {e}")

if __name__ == "__main__":
    clean_json_files("c:\\Users\\Utilisateur\\projet_stock")
