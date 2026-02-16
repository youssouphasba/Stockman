import { cache, KEYS } from './cache';

export interface SyncAction {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: 'product' | 'supplier' | 'order' | 'alert_rule' | 'settings' | 'stock' | 'notification' | 'customer' | 'expense' | 'sale';
    endpoint?: string;
    method?: string;
    payload: any;
    timestamp: number;
    retries?: number;
}

const MAX_RETRIES = 3;

export const syncService = {
    async addToQueue(action: Omit<SyncAction, 'id' | 'timestamp' | 'retries'>) {
        const queue = (await cache.get<SyncAction[]>(KEYS.SYNC_QUEUE)) || [];
        const newAction: SyncAction = {
            ...action,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            retries: 0,
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

    async processQueue(): Promise<{ processed: number; failed: number }> {
        const queue = await this.getQueue();
        if (queue.length === 0) return { processed: 0, failed: 0 };

        const remainingQueue: SyncAction[] = [];
        let processed = 0;
        let failed = 0;

        for (const action of queue) {
            try {
                await this.processAction(action);
                processed++;
            } catch (error) {
                console.error('Sync failed for action', action.id, error);
                const retries = (action.retries || 0) + 1;
                if (retries < MAX_RETRIES) {
                    remainingQueue.push({ ...action, retries });
                    failed++;
                } else {
                    console.warn('Dropping sync action after max retries', action.id);
                    failed++;
                }
            }
        }

        await cache.set(KEYS.SYNC_QUEUE, remainingQueue);

        if (processed > 0) {
            await cache.setLastSyncTime();
        }

        return { processed, failed };
    },

    async processAction(action: SyncAction) {
        const { rawRequest } = require('./api');

        // If action has a direct endpoint/method, use that
        if (action.endpoint && action.method) {
            await rawRequest(action.endpoint, {
                method: action.method,
                body: action.payload,
            });
            return;
        }

        switch (action.entity) {
            case 'product':
                if (action.type === 'create') await rawRequest('/products', { method: 'POST', body: action.payload });
                if (action.type === 'update') await rawRequest(`/products/${action.payload.product_id}`, { method: 'PUT', body: action.payload });
                if (action.type === 'delete') await rawRequest(`/products/${action.payload.product_id}`, { method: 'DELETE' });
                break;
            case 'sale':
            case 'order':
                if (action.type === 'create') await rawRequest('/sales', { method: 'POST', body: action.payload });
                break;
            case 'settings':
                if (action.type === 'update') await rawRequest('/settings', { method: 'PUT', body: action.payload });
                break;
            case 'supplier':
                if (action.type === 'create') await rawRequest('/suppliers', { method: 'POST', body: action.payload });
                if (action.type === 'update') await rawRequest(`/suppliers/${action.payload.supplier_id}`, { method: 'PUT', body: action.payload });
                if (action.type === 'delete') await rawRequest(`/suppliers/${action.payload.supplier_id}`, { method: 'DELETE' });
                break;
            case 'stock':
                if (action.type === 'create') await rawRequest('/stock/movement', { method: 'POST', body: action.payload });
                break;
            case 'customer':
                if (action.type === 'create') await rawRequest('/customers', { method: 'POST', body: action.payload });
                if (action.type === 'update') await rawRequest(`/customers/${action.payload.customer_id}`, { method: 'PUT', body: action.payload });
                if (action.type === 'delete') await rawRequest(`/customers/${action.payload.customer_id}`, { method: 'DELETE' });
                break;
            case 'expense':
                if (action.type === 'create') await rawRequest('/expenses', { method: 'POST', body: action.payload });
                if (action.type === 'delete') await rawRequest(`/expenses/${action.payload.expense_id}`, { method: 'DELETE' });
                break;
            case 'alert_rule':
                if (action.type === 'create') await rawRequest('/alert-rules', { method: 'POST', body: action.payload });
                if (action.type === 'update') await rawRequest(`/alert-rules/${action.payload.rule_id}`, { method: 'PUT', body: action.payload });
                if (action.type === 'delete') await rawRequest(`/alert-rules/${action.payload.rule_id}`, { method: 'DELETE' });
                break;
            case 'notification':
                if (action.type === 'create') await rawRequest('/notifications/register-token', { method: 'POST', body: action.payload });
                break;
        }
    }
};
