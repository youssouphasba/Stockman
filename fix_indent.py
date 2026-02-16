
import os

file_path = 'backend/server.py'

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Lines 6727 to 6825 (1-indexed) are lines[6726] to lines[6825] (0-indexed)
    # But let's verify line content first to be sure.
    # Looking at the view_file:
    # 6725: async def get_replenishment_suggestions...
    # 6726:     """Analyze..."""
    # 6727:         owner_id = ...
    
    modified = False
    for i in range(6726, 6825): # Lines 6727 to 6825 (0-indexed)
        if i < len(lines):
            line = lines[i]
            if line.startswith('        '):
                lines[i] = line[4:] # Remove 4 spaces
                modified = True
            elif line.strip() == '':
                pass # skip empty lines
            elif line.startswith('    '):
                # Already correctly indented or docstring?
                pass

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Successfully fixed indentation in backend/server.py")
    else:
        print("No indentation changes made.")
else:
    print(f"File not found: {file_path}")
