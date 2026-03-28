
import json
import os

locales_dir = r'c:\Users\Utilisateur\projet_stock\frontend\locales'

def load_json(name):
    path = os.path.join(locales_dir, f"{name}.json")
    if not os.path.exists(path): return {}
    with open(path, 'r', encoding='utf-8-sig') as f:
        return json.load(f)

en = load_json('en')
fr = load_json('fr')

def get_flat(d, prefix=''):
    flat = {}
    for k, v in d.items():
        if isinstance(v, dict): flat.update(get_flat(v, prefix + k + '.'))
        else: flat[prefix + k] = v
    return flat

en_flat = get_flat(en)
fr_flat = get_flat(fr)

def set_key(d, key_path, value):
    parts = key_path.split('.')
    for part in parts[:-1]:
        if part not in d or not isinstance(d[part], dict):
            d[part] = {}
        d = d[part]
    d[parts[-1]] = value

# Critical keys discovered to be leaked or important
critical_keys = [
    'errors.ai_generation_error', 'errors.auth_required', 'errors.generic',
    'validation.required', 'auth.login.signIn', 'auth.logout_btn',
    'common.save', 'common.cancel', 'common.confirm', 'common.delete'
]

# Multilingual map for major languages (Best effort based on common terms)
multi_map = {
    "ff": { # Pulaar
        "errors.generic": "Fofon kadi yowre waɗi.",
        "validation.required": "Ɗun yo ko hatoo.",
        "common.save": "Hisnude",
        "common.cancel": "Boortude",
        "common.confirm": "Jaɓude",
        "common.delete": "Momtude"
    },
    "wo": { # Wolof
        "errors.generic": "Njuumte am na ci biir.",
        "validation.required": "Li dafa war.",
        "common.save": "Denc",
        "common.cancel": "Bàyyi",
        "common.confirm": "Wéy",
        "common.delete": "Far"
    },
    "pt": { # Portuguese
        "errors.generic": "Ocorreu um erro inesperado.",
        "validation.required": "Este campo é obrigatório.",
        "common.save": "Salvar",
        "common.cancel": "Cancelar",
        "common.confirm": "Confirmar",
        "common.delete": "Excluir"
    }
}

langs = [f.split('.')[0] for f in os.listdir(locales_dir) if f.endswith('.json') and f not in ['en.json', 'fr.json']]

for lang in langs:
    data = load_json(lang)
    if not data: continue
    
    # 1. Apply multi_map if exists
    if lang in multi_map:
        for k, v in multi_map[lang].items():
            set_key(data, k, v)
    
    # 2. Force English fallback for ALL French-leaked keys
    # This ensures 100% elimination as requested
    flat_data = get_flat(data)
    changed = 0
    for k, v in flat_data.items():
        if v == fr_flat.get(k) and len(v) > 3:
            if v.lower() not in ['date', 'type', 'total', 'email', 'fcfa']:
                en_val = en_flat.get(k)
                if en_val and en_val != v:
                    set_key(data, k, en_val)
                    changed += 1
    
    with open(os.path.join(locales_dir, f"{lang}.json"), 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Propagated fixes to {lang}.json ({changed} leaks replaced with English)")

print("Global propagation completed.")
