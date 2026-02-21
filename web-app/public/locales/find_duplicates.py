
import json

def find_duplicates(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    def dict_raise_on_duplicates(ordered_pairs):
        d = {}
        for k, v in ordered_pairs:
            if k in d:
                print(f"Duplicate key found at some level: {k}")
            d[k] = v
        return d
    
    try:
        json.loads(content, object_pairs_hook=dict_raise_on_duplicates)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_duplicates(r"C:\Users\Utilisateur\projet_stock\frontend\locales\hi.json")
