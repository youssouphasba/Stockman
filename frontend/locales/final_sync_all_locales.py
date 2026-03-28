import json
import os

# Manual translation map for fallback and critical keys (26 languages)
TRANSLATIONS = {
    "users.stock_label": {
        "ar": "المخزون", "de": "Lagerbestand", "en": "Stock", "es": "Inventario", "fr": "Stock",
        "hi": "स्टॉक", "it": "Magazzino", "pt": "Estoque", "ru": "Склад", "tr": "Stok",
        "zh": "库存", "ff": "Nguina", "wo": "Am-am", "pl": "Zapasy", "ro": "Stoc"
    },
    "modals.ai_assistant_title": {
        "en": "AI Assistant", "fr": "Assistant IA", "it": "Assistente IA", "es": "Asistente IA",
        "pt": "Assistente IA", "de": "KI-Assistent", "ar": "مساعد الذكاء الاصطناعي",
        "ru": "ИИ-помощник", "zh": "人工智能助手", "hi": "एआई सहायक", "tr": "YP Asistanı",
        "ff": "Gollotooɗo IA", "wo": "Dimbalukat IA"
    },
    "modals.ai_welcome": {
        "en": "Hello! I am your Stockman assistant. How can I help you today?",
        "fr": "Bonjour ! Je suis votre assistant Stockman. Comment puis-je vous aider aujourd'hui ?",
        "it": "Ciao! Sono il tuo assistente Stockman. Come posso aiutarti oggi?",
        "es": "¡Hola! Soy tu asistente de Stockman. ¿Cómo puedo ayudarte hoy?",
        "ar": "مرحباً! أنا مساعد Stockman الخاص بك. كيف يمكنني مساعدتك اليوم؟",
    },
    "modals.ai_placeholder": {
        "en": "Ask your question...", "fr": "Posez votre question...", "it": "Fai la tua domanda...",
        "es": "Haz tu pregunta...", "ar": "اسأل سؤالك...", "wo": "Laajël sa laaj...", "ff": "Landa landal ma..."
    },
    "modals.ai_loading": {
        "en": "AI is thinking...", "fr": "L'IA réfléchit...", "it": "L'IA sta riflettendo...",
        "es": "La IA está pensando...", "ar": "الذكاء الاصطناعي يفكر...", "wo": "IA bi ngiy xalaat...", "ff": "IA ena miijoo..."
    }
}

def sync_all():
    locales_path = r"C:\Users\Utilisateur\projet_stock\frontend\locales"
    with open(os.path.join(locales_path, "fr.json"), 'r', encoding='utf-8-sig') as f:
        master = json.load(f)
    
    with open(os.path.join(locales_path, "en.json"), 'r', encoding='utf-8-sig') as f:
        en_ref = json.load(f)

    for filename in os.listdir(locales_path):
        if not filename.endswith('.json') or filename in ["fr.json", "en.json", "audit_report.json"]:
            continue
            
        lang = filename.split('.')[0]
        file_path = os.path.join(locales_path, filename)
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            data = json.load(f)
            
        def sync_obj(m_obj, d_obj, path=""):
            changed = False
            
            # Remove keys NOT in master
            to_remove = [k for k in d_obj if k not in m_obj]
            for k in to_remove:
                del d_obj[k]
                changed = True
                
            # Add or update keys from master
            for k, v in m_obj.items():
                cur_path = f"{path}.{k}" if path else k
                
                is_fixme = isinstance(d_obj.get(k), str) and "FIXME" in d_obj.get(k)
                is_missing = k not in d_obj
                
                if is_missing or is_fixme:
                    if cur_path in TRANSLATIONS and lang in TRANSLATIONS[cur_path]:
                        d_obj[k] = TRANSLATIONS[cur_path][lang]
                    else:
                        def get_ref_val(obj, p_parts):
                            for part in p_parts:
                                if isinstance(obj, dict) and part in obj:
                                    obj = obj[part]
                                else:
                                    return None
                            return obj if isinstance(obj, str) else None
                        
                        ref_val = get_ref_val(en_ref, cur_path.split('.'))
                        d_obj[k] = ref_val if ref_val else v
                    changed = True
                
                if isinstance(v, dict):
                    if k not in d_obj or not isinstance(d_obj[k], dict):
                        d_obj[k] = {}
                        changed = True
                    if sync_obj(v, d_obj[k], cur_path):
                        changed = True
            
            return changed

        if sync_obj(master, data):
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"Synced {filename}")

if __name__ == "__main__":
    sync_all()
