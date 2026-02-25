import json
import os

locales_dir = r'c:\Users\Utilisateur\projet_stock\frontend\locales'
base_file = os.path.join(locales_dir, 'fr.json')

with open(base_file, 'r', encoding='utf-8-sig') as f:
    fr_data = json.load(f)

def flatten(d, prefix=''):
    items = {}
    for k, v in d.items():
        key = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            items.update(flatten(v, key))
        else:
            items[key] = v
    return items

fr_flat = flatten(fr_data)

results = []
for filename in sorted(os.listdir(locales_dir)):
    if filename.endswith('.json') and filename != 'fr.json':
        path = os.path.join(locales_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                target_data = json.load(f)
            target_flat = flatten(target_data)
            
            missing = set(fr_flat.keys()) - set(target_flat.keys())
            same_as_fr = 0
            for k in set(fr_flat.keys()) & set(target_flat.keys()):
                if target_flat[k] == fr_flat[k] and len(str(fr_flat[k])) > 3: # Ignore short strings like 'OK', 'Yes', etc.
                    same_as_fr += 1
            
            results.append({
                'loc': filename,
                'total': len(fr_flat),
                'missing': len(missing),
                'french_leak': same_as_fr,
                'percent_translated': round(((len(fr_flat) - len(missing) - same_as_fr) / len(fr_flat)) * 100, 1)
            })
        except Exception as e:
            results.append({'loc': filename, 'error': str(e)})

with open(os.path.join(locales_dir, 'global_audit.json'), 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print('Audit complete.')
