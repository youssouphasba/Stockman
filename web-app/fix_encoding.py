import os

locales_dir = 'src/locales'
for filename in os.listdir(locales_dir):
    if filename.endswith('.json'):
        filepath = os.path.join(locales_dir, filename)
        try:
            # Try reading as UTF-8
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            # If successful, re-write to ensure it's clean UTF-8
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Verified/Rewritten {filename} (UTF-8)")
        except UnicodeDecodeError:
            # If UTF-8 fails, try latin-1/windows-1252 and convert to UTF-8
            with open(filepath, 'r', encoding='latin-1') as f:
                content = f.read()
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Converted {filename} from Latin-1 to UTF-8")
