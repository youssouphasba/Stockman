import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncService, FailedSyncAction } from '../services/sync';

export type SyncStatus = {
    pendingCount: number;
    failedCount: number;
    failedActions: FailedSyncAction[];
    isOnline: boolean;
    retryAll: () => Promise<void>;
    dismissFailed: (id: string) => Promise<void>;
};

/**
 * Hook that monitors sync queue status and failed (dead letter) actions.
 * Call this once in a top-level layout to keep the status fresh.
 */
export function useSyncStatus(): SyncStatus {
    const [pendingCount, setPendingCount] = useState(0);
    const [failedActions, setFailedActions] = useState<FailedSyncAction[]>([]);
    const [isOnline, setIsOnline] = useState(true);

    // Subscribe to network changes
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = !!state.isConnected && !!state.isInternetReachable;
            setIsOnline(online);

            // When we come back online, process the queue
            if (online) {
                syncService.processQueue().then(({ dead }) => {
                    refreshCounts();
                });
            }
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to permanent failures
    useEffect(() => {
        syncService.onPermanentFailure((failed) => {
            setFailedActions(failed);
        });
    }, []);

    // Initial load
    useEffect(() => {
        refreshCounts();
        // Poll every 30s to stay fresh
        const interval = setInterval(refreshCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    async function refreshCounts() {
        const [pending, failed] = await Promise.all([
            syncService.getPendingCount(),
            syncService.getFailedActions(),
        ]);
        setPendingCount(pending);
        setFailedActions(failed);
    }

    async function retryAll() {
        await syncService.retryAllFailed();
        await syncService.processQueue();
        await refreshCounts();
    }

    async function dismissFailed(id: string) {
        await syncService.dismissFailed(id);
        await refreshCounts();
    }

    return {
        pendingCount,
        failedCount: failedActions.length,
        failedActions,
        isOnline,
        retryAll,
        dismissFailed,
    };
}
