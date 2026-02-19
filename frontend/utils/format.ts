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
export function getCurrencySymbol(currency: string = 'XOF'): string {
    const code = currency.toUpperCase();
    switch (code) {
        case 'EUR':
            return '€';
        case 'USD':
            return '$';
        case 'GBP':
            return '£';
        case 'JPY':
            return '¥';
        case 'XAF':
        case 'XOF':
            return 'FCFA';
        case 'CAD':
            return 'C$';
        case 'CHF':
            return 'CHF';
        default:
            return code; // Fallback to currency code (e.g., MAD, TND, DZD)
    }
}

/**
 * Helper to use formatCurrency with a User object.
 */
export function formatUserCurrency(amount: number, user: User | null): string {
    return formatCurrency(amount, user?.currency || 'XOF');
}
