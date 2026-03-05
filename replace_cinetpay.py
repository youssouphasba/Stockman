import os
import re

def global_replace(directory):
    exclude_dirs = {'.git', 'node_modules', '.expo', '__pycache__', 'dist'}
    # Replace "" with "" and "" with "" (or specific logic)
    # Most cases are in lists: (RevenueCat, ...) -> (RevenueCat, ...)
    patterns = [
        (re.compile(r',\s*', re.IGNORECASE), ''),
        (re.compile(r'\s*,', re.IGNORECASE), ''),
        (re.compile(r'', re.IGNORECASE), ''),
    ]
    
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.json', '.ts', '.tsx', '.py', '.md', '.txt', '.html')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for pattern, replacement in patterns:
                        new_content = pattern.sub(replacement, new_content)
                    
                    if new_content != content:
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Replaced  in {path}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    global_replace("c:\\Users\\Utilisateur\\projet_stock")
