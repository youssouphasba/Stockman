import { cache, KEYS } from './cache';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncAction {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'product' | 'supplier' | 'order' | 'alert_rule' | 'settings' | 'stock' | 'notification' | 'customer' | 'expense' | 'sale';
    endpoint?: string;
    method?: string;
    payload: any;
    timestamp: number;
    retries?: number;
    lastError?: string;
}

export interface FailedSyncAction extends SyncAction {
    failedAt: number;
    reason: string;
}

type QueueActionInput = Omit<SyncAction, 'id' | 'timestamp' | 'retries'> & Partial<Pick<SyncAction, 'id' | 'timestamp' | 'retries'>>;

let activeProcessQueuePromise: Promise<{ processed: number; failed: number; dead: number }> | null = null;

const MAX_RETRIES = 5; // Increased from 3 — more persistent
const DEAD_LETTER_KEY = 'sync_dead_letter';

// Callback called when actions are permanently failed (UI can subscribe to this)
type FailureCallback = (failed: FailedSyncAction[]) => void;
let onFailureCallback: FailureCallback | null = null;

export const syncService = {
    // Subscribe to failure events (call from your UI to show warnings)
    onPermanentFailure(cb: FailureCallback) {
        onFailureCallback = cb;
    },

    async addToQueue(action: QueueActionInput) {
        const queue = (await cache.get<SyncAction[]>(KEYS.SYNC_QUEUE)) || [];
        const newAction: SyncAction = {
            ...action,
            id: action.id || Math.random().toString(36).substr(2, 9),
            timestamp: action.timestamp ?? Date.now(),
            retries: action.retries ?? 0,
        };
        queue.push(newAction);
        await cache.set(KEYS.SYNC_QUEUE, queue);
        return newAction;
    },

    async getQueue() {
        return (await cache.get<SyncAction[]>(KEYS.SYNC_QUEUE)) || [];
    },

    async getPendingCount() {
        const queue = await this.getQueue();
        return queue.length;
    },

    async clearQueue() {
        await cache.remove(KEYS.SYNC_QUEUE);
    },

    /** Get all permanently failed actions (dead letter queue) */
    async getFailedActions(): Promise<FailedSyncAction[]> {
        return (await cache.get<FailedSyncAction[]>(DEAD_LETTER_KEY)) || [];
    },

    /** Get count of permanently failed actions */
    async getFailedCount(): Promise<number> {
        const failed = await this.getFailedActions();
        return failed.length;
    },

    /** Retry a specific failed action by id (moves it back to the main queue) */
    async retryFailed(actionId: string) {
        const failed = await this.getFailedActions();
        const action = failed.find(a => a.id === actionId);
        if (!action) return;

        // Move back to active queue with reset retries
        const retryAction: SyncAction = {
            ...action,
            retries: 0,
            lastError: undefined,
        };
        await this.addToQueue(retryAction);

        // Remove from dead letter
        const remaining = failed.filter(a => a.id !== actionId);
        await cache.set(DEAD_LETTER_KEY, remaining);
    },

    /** Retry ALL failed actions */
    async retryAllFailed() {
        const failed = await this.getFailedActions();
        for (const action of failed) {
            await this.retryFailed(action.id);
        }
    },

    /** Dismiss a specific failed action (acknowledge and remove) */
    async dismissFailed(actionId: string) {
        const failed = await this.getFailedActions();
        const remaining = failed.filter(a => a.id !== actionId);
        await cache.set(DEAD_LETTER_KEY, remaining);
    },

    async processQueue(): Promise<{ processed: number; failed: number; dead: number }> {
        if (activeProcessQueuePromise) {
            return activeProcessQueuePromise;
        }

        activeProcessQueuePromise = this.processQueueInternal();
        try {
            return await activeProcessQueuePromise;
        } finally {
            activeProcessQueuePromise = null;
        }
    },

    async processQueueInternal(): Promise<{ processed: number; failed: number; dead: number }> {
        const queue = await this.getQueue();
        if (queue.length === 0) return { processed: 0, failed: 0, dead: 0 };

        const remainingQueue: SyncAction[] = [];
        const newlyDead: FailedSyncAction[] = [];
        let processed = 0;
        let failed = 0;

        for (const action of queue) {
            try {
                await this.processAction(action);
                processed++;
            } catch (error: any) {
                const retries = (action.retries || 0) + 1;
                const errorMessage = error?.message || String(error);

                if (retries < MAX_RETRIES) {
                    // Still retryable — keep in queue with backoff info
                    remainingQueue.push({ ...action, retries, lastError: errorMessage });
                    failed++;
                } else {
                    // Max retries exceeded — move to dead letter queue (NEVER silently drop)
                    console.warn('[SyncService] Moving action to dead letter queue after max retries:', action.id, action.entity, action.type);
                    newlyDead.push({
                        ...action,
                        retries,
                        lastError: errorMessage,
                        failedAt: Date.now(),
                        reason: `Max retries (${MAX_RETRIES}) exceeded. Last error: ${errorMessage}`,
                    });
                    failed++;
                }
            }
        }

        await cache.set(KEYS.SYNC_QUEUE, remainingQueue);

        // Persist newly dead actions
        if (newlyDead.length > 0) {
            const existingDead = await this.getFailedActions();
            await cache.set(DEAD_LETTER_KEY, [...existingDead, ...newlyDead]);

            // Notify UI subscriber
            if (onFailureCallback) {
                const allDead = await this.getFailedActions();
                onFailureCallback(allDead);
            }
        }

        if (processed > 0) {
            await cache.setLastSyncTime();
        }

        return { processed, failed, dead: newlyDead.length };
    },

    async processAction(action: SyncAction) {
        // Lazy import to break circular dependency (api.ts imports sync.ts)
        const { rawRequest } = require('./api');
        const requestOptions = {
            headers: {
                'X-Idempotency-Key': `offline-sync:${action.entity}:${action.id}`,
            },
        };
        const payloadId =
            action.payload?.product_id ||
            action.payload?.supplier_id ||
            action.payload?.customer_id ||
            action.payload?.expense_id ||
            action.payload?.rule_id ||
            action.payload?.id;
        const payloadBody = action.payload?.data ?? action.payload;

        // If action has a direct endpoint/method, use that
        if (action.endpoint && action.method) {
            await rawRequest(action.endpoint, {
                ...requestOptions,
                method: action.method,
                body: payloadBody,
            });
            return;
        }

        switch (action.entity) {
            case 'product':
                if (action.type === 'create') await rawRequest('/products', { ...requestOptions, method: 'POST', body: payloadBody });
                if (action.type === 'update' && payloadId) await rawRequest(`/products/${payloadId}`, { ...requestOptions, method: 'PUT', body: payloadBody });
                if (action.type === 'delete' && payloadId) await rawRequest(`/products/${payloadId}`, { ...requestOptions, method: 'DELETE' });
                break;
            case 'sale':
            case 'order':
                if (action.type === 'create') await rawRequest('/sales', { ...requestOptions, method: 'POST', body: payloadBody });
                break;
            case 'settings':
                if (action.type === 'update') await rawRequest('/settings', { ...requestOptions, method: 'PUT', body: payloadBody });
                break;
            case 'supplier':
                if (action.type === 'create') await rawRequest('/suppliers', { ...requestOptions, method: 'POST', body: payloadBody });
                if (action.type === 'update' && payloadId) await rawRequest(`/suppliers/${payloadId}`, { ...requestOptions, method: 'PUT', body: payloadBody });
                if (action.type === 'delete' && payloadId) await rawRequest(`/suppliers/${payloadId}`, { ...requestOptions, method: 'DELETE' });
                break;
            case 'stock':
                if (action.type === 'create') await rawRequest('/stock/movement', { ...requestOptions, method: 'POST', body: payloadBody });
                break;
            case 'customer':
                if (action.type === 'create') await rawRequest('/customers', { ...requestOptions, method: 'POST', body: payloadBody });
                if (action.type === 'update' && payloadId) await rawRequest(`/customers/${payloadId}`, { ...requestOptions, method: 'PUT', body: payloadBody });
                if (action.type === 'delete' && payloadId) await rawRequest(`/customers/${payloadId}`, { ...requestOptions, method: 'DELETE' });
                break;
            case 'expense':
                if (action.type === 'create') await rawRequest('/expenses', { ...requestOptions, method: 'POST', body: payloadBody });
                if (action.type === 'delete' && payloadId) await rawRequest(`/expenses/${payloadId}`, { ...requestOptions, method: 'DELETE' });
                break;
            case 'alert_rule':
                if (action.type === 'create') await rawRequest('/alert-rules', { ...requestOptions, method: 'POST', body: payloadBody });
                if (action.type === 'update' && payloadId) await rawRequest(`/alert-rules/${payloadId}`, { ...requestOptions, method: 'PUT', body: payloadBody });
                if (action.type === 'delete' && payloadId) await rawRequest(`/alert-rules/${payloadId}`, { ...requestOptions, method: 'DELETE' });
                break;
            case 'notification':
                if (action.type === 'create') await rawRequest('/notifications/register-token', { ...requestOptions, method: 'POST', body: payloadBody });
                break;
        }
    }
};
