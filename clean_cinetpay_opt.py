import os
import json

def clean_json_files(directory):
    exclude_dirs = {'.git', 'node_modules', '.expo', '__pycache__'}
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(".json"):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    changed = False
                    if isinstance(data, dict):
                        # Use a deep clean to handle nested structures
                        def deep_clean(d):
                            nonlocal changed
                            if isinstance(d, dict):
                                keys = list(d.keys())
                                for k in keys:
                                    if '' in k.lower():
                                        del d[k]
                                        changed = True
                                        print(f"Removed key '{k}' from {path}")
                                    else:
                                        deep_clean(d[k])
                            elif isinstance(d, list):
                                for item in d:
                                    deep_clean(item)
                        
                        deep_clean(data)

                        if changed:
                            with open(path, 'w', encoding='utf-8') as f:
                                json.dump(data, f, ensure_ascii=False, indent=4)
                except Exception as e:
                    # Ignore non-json or corrupt json if script finds them
                    pass

if __name__ == "__main__":
    clean_json_files("c:\\Users\\Utilisateur\\projet_stock")
