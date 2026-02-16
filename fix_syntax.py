
import os

file_path = 'backend/server.py'

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step-by-step replacement for safety
    # 1. Triple quotes with escapes
    new_content = content.replace('\\"\\"\\"', '"""')
    # 2. Single quotes with escapes
    new_content = new_content.replace('\\"', '"')

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully fixed syntax errors in backend/server.py")
    else:
        print("No syntax errors found to fix.")
else:
    print(f"File not found: {file_path}")
