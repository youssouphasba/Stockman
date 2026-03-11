import { API_URL } from '../config';

export type PricingPlanQuote = {
    plan: 'starter' | 'pro' | 'enterprise';
    currency: string;
    display_currency: string;
    amount: string;
    display_price: string;
    provider: 'flutterwave' | 'stripe';
};

export type PublicPricingResponse = {
    country_code: string;
    requested_currency?: string | null;
    currency: string;
    display_currency: string;
    pricing_region: string;
    recommended_checkout_provider: 'flutterwave' | 'stripe';
    use_mobile_money: boolean;
    can_change_billing_country: boolean;
    fallback_used?: boolean;
    plans: Record<'starter' | 'pro' | 'enterprise', PricingPlanQuote>;
};

const DEFAULT_FALLBACK: PublicPricingResponse = {
    country_code: 'SN',
    currency: 'XOF',
    display_currency: 'FCFA',
    pricing_region: 'fcfa',
    recommended_checkout_provider: 'flutterwave',
    use_mobile_money: true,
    can_change_billing_country: true,
    plans: {
        starter: { plan: 'starter', currency: 'XOF', display_currency: 'FCFA', amount: '2500', display_price: '2 500 FCFA', provider: 'flutterwave' },
        pro: { plan: 'pro', currency: 'XOF', display_currency: 'FCFA', amount: '4900', display_price: '4 900 FCFA', provider: 'flutterwave' },
        enterprise: { plan: 'enterprise', currency: 'XOF', display_currency: 'FCFA', amount: '9900', display_price: '9 900 FCFA', provider: 'flutterwave' },
    },
};

function buildLocalFallback(countryCode: string): PublicPricingResponse {
    const normalized = countryCode.toUpperCase();
    const europeCountries = new Set(['FR', 'BE', 'DE', 'IT', 'ES', 'PT', 'NL', 'LU', 'IE']);
    if (europeCountries.has(normalized)) {
        return {
            ...DEFAULT_FALLBACK,
            country_code: normalized,
            currency: 'EUR',
            display_currency: 'EUR',
            pricing_region: 'europe',
            recommended_checkout_provider: 'stripe',
            use_mobile_money: false,
            plans: {
                starter: { plan: 'starter', currency: 'EUR', display_currency: 'EUR', amount: '6.99', display_price: '6,99 €', provider: 'stripe' },
                pro: { plan: 'pro', currency: 'EUR', display_currency: 'EUR', amount: '9.99', display_price: '9,99 €', provider: 'stripe' },
                enterprise: { plan: 'enterprise', currency: 'EUR', display_currency: 'EUR', amount: '14.99', display_price: '14,99 €', provider: 'stripe' },
            },
        };
    }
    return { ...DEFAULT_FALLBACK, country_code: normalized || 'SN' };
}

export function detectBrowserCountryCode(): string {
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
        'Asia/Kolkata': 'IN',
        'America/New_York': 'US',
    };
    if (timezoneCountryMap[timezone]) {
        return timezoneCountryMap[timezone];
    }
    if (timezone.startsWith('Europe/')) return 'FR';
    if (timezone.startsWith('Africa/')) return 'SN';
    return 'SN';
}

export async function fetchPublicPricing(countryCode: string, currency?: string): Promise<PublicPricingResponse> {
    if (!API_URL) {
        return buildLocalFallback(countryCode);
    }

    const params = new URLSearchParams();
    params.set('country_code', countryCode);
    if (currency) {
        params.set('currency', currency);
    }

    try {
        const response = await fetch(`${API_URL}/api/pricing/public?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn('Pricing fallback used:', error);
        return buildLocalFallback(countryCode);
    }
}
