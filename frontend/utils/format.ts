import { User } from '../services/api';

/**
 * Centrally formats an amount according to the user's currency.
 * @param amount Number to format
 * @param currency Currency code (XOF, EUR, etc.)
 * @returns Formatted string (e.g. "1 500 FCFA" or "1 500 €")
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = 'XOF'): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (numericAmount === undefined || numericAmount === null || isNaN(numericAmount)) {
        return `0 ${getCurrencySymbol(currency)}`;
    }

    const formatted = numericAmount.toLocaleString('fr-FR', {
        maximumFractionDigits: 0,
    });

    return `${formatted} ${getCurrencySymbol(currency)}`;
}

/**
 * Returns the symbol or display name for a given currency code.
 */
export function getCurrencySymbol(currency: string | null | undefined = 'XOF'): string {
    const code = (currency || 'XOF').toUpperCase();
    const explicitSymbols: Record<string, string> = {
        EUR: '€',
        USD: '$',
        GBP: '£',
        JPY: '¥',
        CAD: 'C$',
        CHF: 'CHF',
        XAF: 'FCFA',
        XOF: 'FCFA',
    };

    if (explicitSymbols[code]) {
        return explicitSymbols[code];
    }

    try {
        const parts = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: code,
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).formatToParts(0);
        const symbol = parts.find((part) => part.type === 'currency')?.value?.trim();
        return symbol || code;
    } catch {
        return code; // Fallback to currency code (e.g. MAD, TND, DZD)
    }
}

/**
 * Safely formats a number without currency symbol.
 */
export function formatNumber(amount: number | string | null | undefined): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (numericAmount === undefined || numericAmount === null || isNaN(numericAmount)) {
        return '0';
    }

    return numericAmount.toLocaleString('fr-FR', {
        maximumFractionDigits: 0,
    });
}

/**
 * Helper to use formatCurrency with a User object.
 */
export function formatUserCurrency(amount: number, user: User | null): string {
    return formatCurrency(amount, user?.currency || 'XOF');
}
