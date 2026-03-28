
import json
import os

ff_file = r'c:\Users\Utilisateur\projet_stock\frontend\locales\ff.json'
pl_file = r'c:\Users\Utilisateur\projet_stock\frontend\locales\pl.json'

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
            d = d.setdefault(part, {})
        d[parts[-1]] = value
    
    with open(file_path, 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Fulani Batch 3 (AI Prompts & Alerts)
ff_translations = {
    'admin.users.banConfirm': 'Sokku huutoro o? / Ban huutoro o?',
    'admin.users.banDesc': '{{name}} waawata seede hannde.',
    'admin.users.banBtn': 'Sokku / Ban',
    'admin.users.reactivateBtn': 'Uddit / Réactiver',
    'admin.users.active': 'Golloowo',
    'admin.users.banned': 'Sokkaaɗo / Banni',
    'admin.users.countryLabel': 'Leydi: {{country}}',
    'ai.daily_summary_prompt': 'Ko a Stockman AI. Ko ɗee golle hannde : {activity}. Waɗat kabaruuji mbeebaaɗi (3-4 zdania) ngam jeeyowo o.',
    'ai.persona_name': 'Balloowo Stockman',
    'ai.replenishment_advice_prompt': 'Ko a ganndo njuɓɓudi. Ko ɗee kuuje masiibaaji : {products}. Hokku wasiyaaji ngam heɓugol kuuje goɗɗe.',
    'ai.summary_goal': 'Faandaare maa ko wallude huutoro o e aplikasion o ORAZ taskagol golle mum.',
    'ai.summary_instruction_admin': 'SO HUUTORO O KO ADMIN, FUƊƊO JAABOL MAA E KABARU CELLAL SYSTEM SO JEERTINAALI EENA NGAWII.',
    'ai.summary_role_admin': 'Ko a balloowo ADMIN Stockman. A ena jogii accès e kabaruuji fof.',
    'ai.summary_role_merchant': 'Ko a balloowo ganndo aplikasion Stockman ngam jeeyoɓe.',
    'ai.summary_tone': 'Haaldu e haala mojjere, ganndal e teddungal. Jaabol maa ena foti mbeebaade.',
    'ai.tools.inventory_alerts.empty': 'Walaa jeertinaali njulaaku masiibaaji.',
    'ai.tools.inventory_alerts.format': '{name}: Stan={quantity} (Min={min_stock})',
    'ai.tools.system_alerts.empty': 'Cellal system njuɓɓudi ena mojji fey. Walaa jeertinaali masiibaaji.',
    'ai.tools.system_alerts.critical_login': 'MASIIBA: {count} boofgol seede heɓaa e 24h.',
    'ai.tools.system_alerts.support_backlog': 'JEERTINAALE: Tikkeeji ballal ena ɗuuri ({count} udditaaɗi).',
    'ai.tools.product_info.not_found': "Walaa kuuje heɓaaɗe ngam '{name}'.",
    'ai.tools.product_info.status_out': 'Rupture / Walaa',
    'ai.tools.product_info.status_in': 'Ena jogii',
    'ai.tools.forecast.not_found': "Kuuje '{name}' heɓaaka ngam taskagol.",
    'ai.tools.forecast.invalid_date': 'Format ñalngu ena boofii. Huutoro YYYY-MM-DD.',
    'ai.voice_to_text_error': 'Waawataa winndu haala o'
}

# Polish Batch 2 (Admin & AI)
pl_translations = {
    'admin.actions.confirm': 'Potwierdzenie',
    'admin.actions.cancel': 'Anuluj',
    'admin.actions.success': 'Sukces',
    'admin.actions.error': 'Błąd',
    'admin.actions.sendSuccess': '✅ Wysłano',
    'admin.actions.statusUpdated': '✅ Status został zaktualizowany',
    'admin.alerts.title': 'Alerty',
    'admin.alerts.openTickets': 'Otwarte zgłoszenia',
    'admin.alerts.lowStock': 'Niski stan magazynowy',
    'admin.alerts.recentSignups': 'Rejestracje (7 dni)',
    'admin.comms.newMsg': 'Nowa wiadomość',
    'admin.comms.target': 'Cel:',
    'admin.comms.send': 'Wyślij',
    'admin.comms.broadcast': 'Transmituj (Broadcast)',
    'admin.comms.history': 'Historia',
    'admin.comms.broadcastSuccess': '📢 Transmisja: Wysłano do {{count}} urządzeń',
    'admin.dashboard': 'Panel Administratora',
    'admin.disputes.title': 'Spory',
    'admin.disputes.investigate': 'Zbadaj',
    'admin.disputes.resolve': 'Rozwiąż',
    'admin.disputes.reject': 'Odrzuć',
    'admin.disputes.resolution': 'ROZWIĄZANIE:',
    'admin.disputes.adminNotes': 'NOTATKI ADMINA:',
    'admin.distribution.country': 'Podział według krajów',
    'admin.distribution.role': 'Użytkownicy według ról',
    'admin.health.title': 'Stan Systemu',
    'admin.health.database': 'Baza danych',
    'admin.health.online': 'ONLINE',
    'admin.health.error': 'BŁĄD',
    'admin.health.version': 'Wersja {{version}}',
    'admin.logs.title': 'Logi',
    'admin.placeholders.searchUsers': 'Szukaj użytkownika...',
    'admin.placeholders.searchStores': 'Szukaj sklepu...',
    'admin.placeholders.searchProducts': 'Szukaj produktu...',
    'admin.placeholders.searchCustomers': 'Szukaj klienta...',
    'admin.placeholders.msgTitle': 'Tytuł wiadomości',
    'admin.placeholders.msgContent': 'Treść wiadomości...',
    'admin.placeholders.targetUserId': 'ID użytkownika (np. user_...)',
    'admin.placeholders.replyPlaceholder': 'Twoja odpowiedź...',
    'admin.placeholders.resolutionPlaceholder': 'Rozwiązanie (opcjonalnie)...',
    'admin.placeholders.adminNotesPlaceholder': 'Notatki administratora...',
    'admin.retention.title': 'Retencja',
    'admin.retention.deletedTotal': 'Usunięte (Suma)',
    'admin.retention.inactive30': 'Nieaktywni (>30 dni)',
    'admin.revenue.title': 'Przychody',
    'admin.revenue.today': 'Dzisiaj',
    'admin.revenue.week': '7 dni',
    'admin.revenue.month': '30 dni',
    'admin.security.failed24h': 'Niepowodzenia (24h)',
    'admin.security.success24h': 'Połączenia (24h)',
    'admin.security.blocked': 'Zablokowani',
    'admin.security.events': 'Zdarzenia',
    'admin.segments.global': 'Globalny',
    'admin.segments.users': 'Użytkownicy',
    'admin.segments.stores': 'Sklepy',
    'admin.segments.stock': 'Zarządzanie magazynem',
    'admin.segments.finance': 'Finanse',
    'admin.segments.crm': 'CRM',
    'admin.segments.support': 'Wsparcie',
    'admin.segments.disputes': 'Spory',
    'admin.segments.comms': 'Komunikacja',
    'admin.segments.security': 'Bezpieczeństwo',
    'admin.segments.logs': 'Dziennik aktywności',
    'admin.segments.settings': 'Ustawienia',
    'admin.segments.cgu': 'Regulamin',
    'admin.segments.privacy': 'Prywatność',
    'admin.settings.config': 'Konfiguracja',
    'admin.settings.appVersion': 'Wersja aplikacji',
    'admin.settings.serverStatus': 'Status serwera',
    'admin.settings.actions': 'Akcje',
    'admin.settings.dataExplorer': '📊 Eksplorator danych (MongoDB)',
    'admin.stock.title': 'Produkty',
    'admin.stock.units': '{{count}} jednostek',
    'admin.stock.seller': 'Sprzedawca',
    'admin.stock.deleteConfirmTitle': '⚠️ Trwałe usuwanie',
    'admin.stock.deleteConfirmDesc': "Czy na pewno chcesz usunąć produkt „{{name}}”? Tej akcji nie można cofnąć.",
    'admin.stores.title': 'Sklepy',
    'admin.stores.owner': 'Właściciel',
    'admin.stores.products': 'Produkty',
    'admin.stores.sales': 'Sprzedaż',
    'admin.support.title': 'Zgłoszenia',
    'admin.support.filterAll': 'Wszystko',
    'admin.support.filterOpen': 'Otwarte',
    'admin.support.filterPending': 'En oczekiwaniu',
    'admin.support.filterClosed': 'Zamknięte',
    'admin.support.reply': 'Odpowiedz',
    'admin.support.close': 'Zamknij',
    'admin.topStores.title': 'Najlepsze sklepy',
    'admin.users.title': 'Użytkownicy',
    'admin.users.filterAll': 'Wszystko',
    'admin.users.filterShopkeepers': 'Sprzedawcy',
    'admin.users.filterStaff': 'Personel',
    'admin.users.filterSuppliers': 'Dostawcy',
    'admin.users.filterAdmins': 'Administratorzy',
    'admin.users.banConfirm': 'Zablokować tego użytkownika?',
    'admin.users.banDesc': '{{name}} nie będzie już mógł się zalogować.',
    'admin.users.banBtn': 'Zablokuj',
    'admin.users.reactivateBtn': 'Aktywuj ponownie',
    'admin.users.active': 'Aktywny',
    'admin.users.banned': 'Zablokowany',
    'admin.users.countryLabel': 'Kraj: {{country}}',
    'ai.daily_summary_prompt': 'Jesteś Stockman AI. Oto dzisiejsze działania: {activity}. Zrób bardzo krótkie (3-4 zdania) i motywujące podsumowanie dla sprzedawcy.',
    'ai.persona_name': 'Asystent Stockman',
    'ai.replenishment_advice_prompt': 'Jesteś ekspertem ds. logistyki. Oto krytyczne produkty: {products}. Podaj rady dotyczące uzupełniania zapasów na podstawie ostatniej sprzedaży.',
    'ai.summary_goal': 'Twoim celem jest pomoc użytkownikowi w poruszaniu się po aplikacji ORAZ analizie jego działań.',
    'ai.summary_instruction_admin': 'JEŚLI UŻYTKOWNIK JEST ADMINEM, ROZPOCZNIJ SWOJĄ PIERWSZĄ ODPOWIEDŹ OD KRÓTKIEGO PODSUMOWANIA STANU SYSTEMU, JEŚLI WYSTĘPUJĄ ALERTY.',
    'ai.summary_role_admin': 'Jesteś osobistym asystentem ADMINISTRATORA Stockman. Masz dostęp do globalnych metryk.',
    'ai.summary_role_merchant': 'Jesteś inteligentnym, eksperckim asystentem aplikacji Stockman dla sprzedawców.',
    'ai.summary_tone': 'Przyjmij ton pedagogiczny, profesjonalny i serdeczny. Twoje odpowiedzi muszą być kompletne i wyjaśniające.',
    'ai.tools.inventory_alerts.empty': 'Brak krytycznych alertów zapasów.',
    'ai.tools.inventory_alerts.format': '{name}: Stan={quantity} (Min={min_stock})',
    'ai.tools.system_alerts.empty': 'Stan systemu administracyjnego jest doskonały. Brak krytycznych alertów.',
    'ai.tools.system_alerts.critical_login': 'KRYTYCZNE: Wykryto {count} nieudanych prób logowania w ciągu 24h. Ryzyko ataku Brute-force.',
    'ai.tools.system_alerts.support_backlog': 'ALERT: Wysokie zaległości w zgłoszeniach wsparcia ({count} otwartych zgłoszeń).'
}

update_locale(ff_file, ff_translations)
update_locale(pl_file, pl_translations)
print("Successfully updated locales.")
