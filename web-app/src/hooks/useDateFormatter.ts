'use client';

import { useState, useEffect } from 'react';

/**
 * A hook to safely format dates on the client side only to avoid hydration mismatches.
 * Returns null during SSR and the formatted string after hydration.
 */
export function useDateFormatter() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatDate = (date: string | Date | number) => {
        if (!isMounted) return '...';
        try {
            return new Date(date).toLocaleDateString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const formatCurrency = (amount: number, currencyOverride?: string) => {
        if (!isMounted) return '...';
        const currency = currencyOverride
            || (typeof window !== 'undefined' ? localStorage.getItem('user_currency') : null)
            || 'XOF';
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency,
                maximumFractionDigits: 0,
            }).format(amount);
        } catch (e) {
            return amount.toLocaleString() + ' ' + currency;
        }
    };

    return { formatDate, formatCurrency, isMounted };
}
