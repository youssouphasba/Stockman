'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { analytics, AnalyticsFilterMeta } from '../services/api';

type AnalyticsFiltersState = {
    days: number;
    useCustomRange: boolean;
    startDate: string;
    endDate: string;
    storeId: string;
    categoryId: string;
    supplierId: string;
};

type AnalyticsFiltersContextValue = {
    filters: AnalyticsFiltersState;
    meta: AnalyticsFilterMeta;
    metaLoading: boolean;
    metaError: boolean;
    setFilter: <K extends keyof AnalyticsFiltersState>(key: K, value: AnalyticsFiltersState[K]) => void;
    resetFilters: () => void;
    refreshMeta: () => void;
    setDateRange: (startDate: string, endDate: string) => void;
};

const DEFAULT_META: AnalyticsFilterMeta = {
    stores: [],
    categories: [],
    suppliers: [],
    periods: [],
};

const DEFAULT_FILTERS: AnalyticsFiltersState = {
    days: 30,
    useCustomRange: false,
    startDate: '',
    endDate: '',
    storeId: '',
    categoryId: '',
    supplierId: '',
};

const AnalyticsFiltersContext = createContext<AnalyticsFiltersContextValue | null>(null);

export function AnalyticsFiltersProvider({
    children,
    enabled = true,
}: {
    children: React.ReactNode;
    enabled?: boolean;
}) {
    const [filters, setFilters] = useState<AnalyticsFiltersState>(DEFAULT_FILTERS);
    const [meta, setMeta] = useState<AnalyticsFilterMeta>(DEFAULT_META);
    const [metaLoading, setMetaLoading] = useState(true);
    const [metaError, setMetaError] = useState(false);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        if (!enabled) return;
        let current = true;
        setMetaLoading(true);
        setMetaError(false);
        analytics.getFilterMeta()
            .then((response) => {
                if (!current) return;
                setMeta(response);
                setFilters((filters) => ({
                    ...filters,
                    storeId: response.stores.some((item) => item.id === filters.storeId) ? filters.storeId : '',
                    categoryId: response.categories.some((item) => item.id === filters.categoryId) ? filters.categoryId : '',
                    supplierId: response.suppliers.some((item) => item.id === filters.supplierId) ? filters.supplierId : '',
                }));
            })
            .catch(() => { if (current) setMetaError(true); })
            .finally(() => { if (current) setMetaLoading(false); });
        return () => { current = false; };
    }, [enabled, revision]);

    const setFilter = <K extends keyof AnalyticsFiltersState>(key: K, value: AnalyticsFiltersState[K]) => {
        setFilters((current) => ({ ...current, ...(key === 'days' ? { useCustomRange: false } : {}), [key]: value }));
    };

    return (
        <AnalyticsFiltersContext.Provider
            value={{
                filters,
                meta,
                metaLoading,
                metaError,
                setFilter,
                resetFilters: () => setFilters(DEFAULT_FILTERS),
                refreshMeta: () => setRevision((value) => value + 1),
                setDateRange: (startDate, endDate) => setFilters((current) => ({ ...current, startDate, endDate, useCustomRange: true })),
            }}
        >
            {children}
        </AnalyticsFiltersContext.Provider>
    );
}

export function useAnalyticsFilters() {
    const context = useContext(AnalyticsFiltersContext);
    if (!context) {
        throw new Error('useAnalyticsFilters must be used within AnalyticsFiltersProvider');
    }
    return context;
}
