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
    setFilter: <K extends keyof AnalyticsFiltersState>(key: K, value: AnalyticsFiltersState[K]) => void;
    resetFilters: () => void;
    refreshMeta: () => Promise<void>;
};

const DEFAULT_META: AnalyticsFilterMeta = {
    stores: [],
    categories: [],
    suppliers: [],
    periods: [
        { label: '7 jours', days: 7 },
        { label: '30 jours', days: 30 },
        { label: '90 jours', days: 90 },
    ],
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

    const loadMeta = async () => {
        setMetaLoading(true);
        try {
            const response = await analytics.getFilterMeta();
            setMeta({
                ...DEFAULT_META,
                ...response,
                periods: response.periods?.length ? response.periods : DEFAULT_META.periods,
            });
        } catch (error) {
            console.error('Failed to load analytics filters', error);
            setMeta(DEFAULT_META);
        } finally {
            setMetaLoading(false);
        }
    };

    useEffect(() => {
        if (!enabled) {
            setMetaLoading(false);
            return;
        }
        loadMeta();
    }, [enabled]);

    const setFilter = <K extends keyof AnalyticsFiltersState>(key: K, value: AnalyticsFiltersState[K]) => {
        setFilters((current) => ({ ...current, [key]: value }));
    };

    return (
        <AnalyticsFiltersContext.Provider
            value={{
                filters,
                meta,
                metaLoading,
                setFilter,
                resetFilters: () => setFilters(DEFAULT_FILTERS),
                refreshMeta: loadMeta,
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
