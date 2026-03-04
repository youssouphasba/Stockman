import json
import os
import re

def audit_locales():
    locales_path = r"C:\Users\Utilisateur\projet_stock\frontend\locales"
    
    # Typical English words to find in fr.json
    english_indicators = ["All", "order", "suppliers", "approved", "bulk", "pending", "history", "delivery", "cancel", "success"]
    
    results = {}

    for filename in os.listdir(locales_path):
        if not filename.endswith('.json'):
            continue
            
        lang = filename.split('.')[0]
        file_path = os.path.join(locales_path, filename)
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            try:
                data = json.load(f)
            except Exception as e:
                results[lang] = {"error": str(e)}
                continue
                
        fixmes = []
        english_in_fr = []
        french_in_en = []
        
        def walk(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    walk(v, f"{path}.{k}" if path else k)
            elif isinstance(obj, str):
                if "FIXME" in obj:
                    fixmes.append(path)
                
                # Heuristic for English in fr.json
                if lang == "fr":
                    if any(word.lower() in obj.lower().split() for word in ["order", "suppliers", "details", "approved"]):
                        # Check if it's actually English (primitive)
                        if not any(fr_word in obj.lower() for fr_word in ["commande", "fournisseur", "détail"]):
                            english_in_fr.append(f"{path}: {obj}")
                
                # Heuristic for French in en.json
                if lang == "en":
                    if any(fr_word in obj.lower() for fr_word in ["commande", "fournisseur", "détail", "réussi"]):
                        french_in_en.append(f"{path}: {obj}")

        walk(data)
        
        results[lang] = {
            "fixmes": fixmes,
            "suspicious_texts": english_in_fr if lang == "fr" else (french_in_en if lang == "en" else [])
        }

    with open("audit_report.json", "w", encoding="utf-8") as rf:
        json.dump(results, rf, indent=2, ensure_ascii=False)

    print("Audit finished. See audit_report.json")

if __name__ == "__main__":
    audit_locales()
