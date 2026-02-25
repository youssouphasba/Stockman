
import json
import os

def update_locale(file_path, translations):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    for key, value in translations.items():
        parts = key.split('.')
        d = data
        for part in parts[:-1]:
            if part not in d or not isinstance(d[part], dict):
                d[part] = {}
            d = d[part]
        d[parts[-1]] = value
    
    with open(file_path, 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# --------- ENGLISH (EN) ---------
en_translations = {
    'abc.no_revenue': 'No revenue generated during this period.',
    'ai.summary_goal': 'Your goal is to help the user navigate the app AND analyze their metrics.',
    'ai.summary_role_admin': 'You are the Stockman ADMIN assistant. You have access to global metrics.',
    'ai.summary_role_merchant': 'You are a smart assistant for the Stockman app for merchants.',
    'ai.summary_tone': 'Adopt a professional, helpful, and clear tone.',
    'admin.health.online': 'ONLINE',
    'admin.users.filterShopkeepers': 'Merchants',
    'admin.users.filterStaff': 'Staff',
    'admin.users.filterSuppliers': 'Suppliers',
    'admin.users.filterAdmins': 'Admins',
    'tips.pos_01_title': 'Quick Scanner',
    'tips.pos_01_desc': 'Scan items quickly: the basket fills up automatically as you go.',
    'tips.pos_04_title': 'WhatsApp Receipt',
    'tips.pos_04_desc': 'Send the receipt via WhatsApp directly to the customer after each sale.',
    'tips.accounting_03_title': 'CSV Export',
    'tips.accounting_03_desc': 'Export your data in CSV format for your accountant or external accounting software.',
    'tips.alerts_03_title': 'Dormant Products',
    'tips.alerts_03_desc': 'Detect products without any sales for 30 days to optimize your inventory.'
}

# --------- POLISH (PL) ---------
pl_translations = {
    'common.export': 'Eksportuj',
    'common.orders': 'Zamówienia',
    'dashboard.history': 'Historia',
    'dashboard.stock_status': 'Status zapasów',
    'dashboard.recent_alerts': 'Ostatnie alerty',
    'reminders.low_stock_label': 'Niski stan',
    'reminders.dormant_products_label': 'Produkt niechodliwy',
    'reminders.late_deliveries_label': 'Opóźniona dostawa',
    'reminders.replenishment_label': 'Sugerowane uzupełnienie',
    'tips.dashboard_01_title': 'Zmień sklep',
    'tips.dashboard_01_desc': 'Użyj przełącznika w prawym górnym rogu, aby szybko przełączać się między sklepami.',
    'tips.dashboard_02_title': 'Analityka ABC',
    'tips.dashboard_02_desc': 'Klasa A to 80% Twoich obrotów. Skup się na tych kluczowych produktach.',
    'tips.lots_peremption_title': 'Partie i termin ważności',
    'tips.lots_peremption_desc': 'Zarządzaj partiami z datami ważności, idealne dla żywności i produktów łatwo psujących się.',
    'stock.reasons.pos_sale': 'Sprzedaż w punkcie sprzedaży',
    'stock.reasons.inventory_adjustment': 'Korekta zapasów',
    'stock.reasons.supplier_reception': 'Przyjęcie od dostawcy'
}

# --------- ROMANIAN (RO) ---------
ro_translations = {
    'common.export': 'Exportă',
    'common.orders': 'Comenzi',
    'dashboard.history': 'Istoric',
    'dashboard.stock_status': 'Starea stocului',
    'dashboard.recent_alerts': 'Alte recente',
    'reminders.low_stock_label': 'Stoc redus',
    'reminders.dormant_products_label': 'Produs inactiv',
    'reminders.late_deliveries_label': 'Livrare întârziată',
    'reminders.replenishment_label': 'Reaprovizionare sugerată',
    'tips.dashboard_01_title': 'Schimbă magazinul',
    'tips.dashboard_01_desc': 'Folosiți selectorul din dreapta sus pentru a comuta rapid între magazine.',
    'tips.dashboard_02_title': 'Analiza ABC',
    'tips.dashboard_02_desc': 'Clasa A reprezintă 80% din cifra de afaceri. Concentrați-vă pe aceste produse.',
    'tips.lots_peremption_title': 'Loturi și expirare',
    'tips.lots_peremption_desc': 'Gestionați loturile cu date de expirare, ideal pentru produse alimentare.',
    'stock.reasons.pos_sale': 'Vânzare POS',
    'stock.reasons.inventory_adjustment': 'Ajustare stoc',
    'stock.reasons.supplier_reception': 'Recepție furnizor',
    'stock.reasons.loss_damage': 'Pierdere sau deteriorare'
}

update_locale(r'c:\Users\Utilisateur\projet_stock\frontend\locales\en.json', en_translations)
update_locale(r'c:\Users\Utilisateur\projet_stock\frontend\locales\pl.json', pl_translations)
update_locale(r'c:\Users\Utilisateur\projet_stock\frontend\locales\ro.json', ro_translations)

print("Successfully updated en, pl, and ro locales.")
