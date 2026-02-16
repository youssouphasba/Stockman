import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { cache, KEYS } from '../services/cache';
import { syncService } from '../services/sync';
import { rawRequest } from '../services/api';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface SyncContextType {
    isOnline: boolean;
    syncStatus: SyncStatus;
    pendingCount: number;
    lastSyncTime: number | null;
    processQueue: () => Promise<void>;
    prefetchData: () => Promise<void>;
    lastSyncLabel: string;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const PREFETCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [pendingCount, setPendingCount] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const wasOffline = useRef(false);
    const prefetchTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    // Network listener
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(prev => {
                if (!prev && online) wasOffline.current = true;
                return online;
            });
        });

        loadInitialState();
        return () => {
            unsubscribe();
            if (prefetchTimer.current) clearInterval(prefetchTimer.current);
        };
    }, []);

    async function loadInitialState() {
        const count = await syncService.getPendingCount();
        setPendingCount(count);
        const lt = await cache.getLastSyncTime();
        setLastSyncTime(lt);
    }

    // Process queue when coming back online
    useEffect(() => {
        if (isOnline && wasOffline.current) {
            wasOffline.current = false;
            processQueue();
            prefetchData();
        }
    }, [isOnline]);

    // Periodic pending count refresh
    useEffect(() => {
        const interval = setInterval(async () => {
            const count = await syncService.getPendingCount();
            setPendingCount(count);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Periodic prefetch when online
    useEffect(() => {
        if (isOnline) {
            prefetchTimer.current = setInterval(() => {
                prefetchData();
            }, PREFETCH_INTERVAL_MS);
        } else if (prefetchTimer.current) {
            clearInterval(prefetchTimer.current);
            prefetchTimer.current = null;
        }
        return () => {
            if (prefetchTimer.current) clearInterval(prefetchTimer.current);
        };
    }, [isOnline]);

    const processQueue = useCallback(async () => {
        const count = await syncService.getPendingCount();
        if (count === 0) return;

        setSyncStatus('syncing');
        try {
            const result = await syncService.processQueue();
            const remaining = await syncService.getPendingCount();
            setPendingCount(remaining);

            if (result.processed > 0) {
                const lt = await cache.getLastSyncTime();
                setLastSyncTime(lt);
            }

            setSyncStatus(remaining === 0 ? 'synced' : 'error');
            // Reset status after 3 seconds
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch {
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 3000);
        }
    }, []);

    const prefetchData = useCallback(async () => {
        if (!isOnline) return;

        try {
            // Prefetch critical data in parallel, but don't fail if any one fails
            const fetches = [
                safeFetch('/dashboard', KEYS.DASHBOARD),
                safeFetch('/products?skip=0&limit=200', KEYS.PRODUCTS),
                safeFetch('/categories', KEYS.CATEGORIES),
                safeFetch('/settings', KEYS.SETTINGS),
                safeFetch('/customers?skip=0&limit=200', KEYS.CUSTOMERS),
                safeFetch('/suppliers?skip=0&limit=100', KEYS.SUPPLIERS),
                safeFetch('/alerts?skip=0&limit=50', KEYS.ALERTS),
                safeFetch('/alert-rules', KEYS.ALERT_RULES),
            ];

            await Promise.allSettled(fetches);
            await cache.setLastSyncTime();
            const lt = await cache.getLastSyncTime();
            setLastSyncTime(lt);
        } catch {
            // Prefetch is best-effort
        }
    }, [isOnline]);

    async function safeFetch(endpoint: string, cacheKey: string) {
        try {
            const stale = await cache.isStale(cacheKey, 5);
            if (!stale) return; // Skip if fresh (< 5 min old)

            const data = await rawRequest(endpoint);
            await cache.set(cacheKey, data);
        } catch {
            // Individual fetch failures are fine
        }
    }

    function getLastSyncLabel(): string {
        if (!lastSyncTime) return 'Jamais synchronisé';
        const diffMs = Date.now() - lastSyncTime;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Synchro à l'instant";
        if (diffMins < 60) return `Synchro il y a ${diffMins}min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Synchro il y a ${diffHours}h`;
        return `Synchro il y a ${Math.floor(diffHours / 24)}j`;
    }

    return (
        <SyncContext.Provider value={{
            isOnline,
            syncStatus,
            pendingCount,
            lastSyncTime,
            processQueue,
            prefetchData,
            lastSyncLabel: getLastSyncLabel(),
        }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
