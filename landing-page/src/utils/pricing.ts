import i18n from 'i18next';

export interface PriceInfo {
    amount: string;
    currency: string;
    period: string;
}

export interface Pricing {
    starter: PriceInfo;
    premium: PriceInfo;
    enterprise: {
        name: string;
        price: string;
    };
}

const REGION_PRICING = {
    africa: {
        currency: 'FCFA',
        starter: '1000',
        premium: '2500',
    },
    europe: {
        currency: '€',
        starter: '3,99',
        premium: '7,99',
    },
    global: {
        currency: '$',
        starter: '3.99',
        premium: '7.99',
    }
};

export const getPricingByLanguage = (lng: string) => {
    const lang = lng.split('-')[0];

    // Africa-centered languages
    if (['wo', 'ff'].includes(lang)) {
        return REGION_PRICING.africa;
    }

    // Languages likely in Europe (simple heuristic)
    if (['de', 'it', 'es', 'pl', 'ro', 'tr'].includes(lang)) {
        return REGION_PRICING.europe;
    }

    // French can be both, default to Africa for Stockman target
    if (lang === 'fr') {
        return REGION_PRICING.africa;
    }

    // Default for others (English, Chinese, Hindi, etc.)
    return REGION_PRICING.global;
};

export const formatPrice = (amount: string, currency: string) => {
    if (currency === 'FCFA') {
        return `${amount} ${currency}`;
    }
    if (currency === '€') {
        return `${amount}${currency}`;
    }
    return `${currency}${amount}`;
};
