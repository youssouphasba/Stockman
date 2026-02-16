import { User } from '../services/api';

/**
 * Centrally formats an amount according to the user's currency.
 * @param amount Number to format
 * @param currency Currency code (XOF, EUR, etc.)
 * @returns Formatted string (e.g. "1 500 FCFA" or "1 500 €")
 */
export function formatCurrency(amount: number, currency: string = 'XOF'): string {
    if (amount === undefined || amount === null) return '0 ' + getCurrencySymbol(currency);

    const formatted = amount.toLocaleString('fr-FR', {
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
