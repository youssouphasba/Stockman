
import os

file_path = 'backend/server.py'

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # We want to insert '    try:\n' at line 6727 (index 6726)
    # And then indent lines 6727 to 6821 (indices 6727 to 6821 after insertion)
    
    # Check if we already have a try there
    if 'try:' not in lines[6726]:
        lines.insert(6726, '    try:\n')
        # Now the lines that were 6727-6821 are at 6727-6822
        for i in range(6727, 6823):
            line = lines[i]
            if line.strip() != '':
                lines[i] = '    ' + line
        
        # Also fix the logger line 6824 (previously 6823) and return lines
        # 6823:     except Exception as e: (at 4 spaces) - this is correct now!
        # 6824:     logger.error... (needs indent)
        # 6825:     # ... (needs indent)
        # 6826:     return [] (needs indent)
        for i in range(6824, 6827):
            if i < len(lines):
                line = lines[i]
                if line.strip() != '':
                    lines[i] = '    ' + line

        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Successfully restored try block and indentation in backend/server.py")
    else:
        print("Try block already exists.")
else:
    print(f"File not found: {file_path}")
