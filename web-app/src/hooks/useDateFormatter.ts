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

    const formatCurrency = (amount: number) => {
        if (!isMounted) return '... F';
        try {
            return amount.toLocaleString() + ' F';
        } catch (e) {
            return amount + ' F';
        }
    };

    return { formatDate, formatCurrency, isMounted };
}
