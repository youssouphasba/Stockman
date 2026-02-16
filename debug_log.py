
import os

log_file = 'backend/startup_log_v6.txt'

try:
    if os.path.exists(log_file):
        with open(log_file, 'r', encoding='utf-16') as f:
            content = f.read()
            
        # Find the last occurrence of the replenishment endpoint content
        target = "replenishment/suggestions"
        idx = content.rfind(target)
        
        if idx != -1:
            print(f"Found '{target}' at index {idx}")
            # Print a generous chunk around it to catch the traceback
            # The traceback usually follows the request log
            start = idx
            end = min(len(content), idx + 4000)
            chunk = content[start:end]
            print("--- LOG CHUNK START ---")
            print(chunk)
            print("--- LOG CHUNK END ---")
        else:
            print(f"'{target}' not found in {log_file}")
    else:
        print(f"File {log_file} does not exist")
except Exception as e:
    print(f"Error reading file: {e}")
