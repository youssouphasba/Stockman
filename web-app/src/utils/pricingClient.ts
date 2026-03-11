export function detectBrowserCountryCode(): string {
    if (typeof window === 'undefined') {
        return 'SN';
    }

    const locale = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language || '';
    const localeMatch = locale.match(/[-_]([A-Z]{2})$/i);
    if (localeMatch?.[1]) {
        return localeMatch[1].toUpperCase();
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const timezoneCountryMap: Record<string, string> = {
        'Africa/Dakar': 'SN',
        'Africa/Abidjan': 'CI',
        'Africa/Bamako': 'ML',
        'Africa/Ouagadougou': 'BF',
        'Africa/Lome': 'TG',
        'Africa/Cotonou': 'BJ',
        'Africa/Niamey': 'NE',
        'Africa/Douala': 'CM',
        'Africa/Conakry': 'GN',
        'Europe/Paris': 'FR',
        'Europe/Brussels': 'BE',
        'Europe/Berlin': 'DE',
        'Europe/Madrid': 'ES',
        'Europe/Rome': 'IT',
        'Europe/Lisbon': 'PT',
        'Asia/Kolkata': 'IN',
        'America/New_York': 'US',
        'America/Toronto': 'CA',
    };

    if (timezoneCountryMap[timezone]) {
        return timezoneCountryMap[timezone];
    }

    if (timezone.startsWith('Europe/')) return 'FR';
    if (timezone.startsWith('Africa/')) return 'SN';
    return 'SN';
}
