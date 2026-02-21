'use client';

import { sales as salesApi } from './api';

const OFFLINE_SALES_KEY = 'stockman_offline_sales';

export interface QueuedSale {
    id: string;
    data: any;
    timestamp: number;
}

class SyncService {
    private isSyncing = false;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.sync());
        }
    }

    /**
     * Queue a sale for background sync
     */
    queueSale(saleData: any) {
        const queue = this.getQueue();
        const newSale: QueuedSale = {
            id: crypto.randomUUID(),
            data: saleData,
            timestamp: Date.now()
        };
        queue.push(newSale);
        localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(queue));
        console.log('Sale queued offline:', newSale.id);
        return newSale.id;
    }

    /**
     * Get the current queue of offline sales
     */
    getQueue(): QueuedSale[] {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(OFFLINE_SALES_KEY);
        try {
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    /**
     * Start the synchronization process
     */
    async sync() {
        if (this.isSyncing || !navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        this.isSyncing = true;
        console.log(`Starting sync for ${queue.length} sales...`);

        const failed: QueuedSale[] = [];

        for (const sale of queue) {
            try {
                await salesApi.create(sale.data);
                console.log(`Successfully synced sale ${sale.id}`);
            } catch (err) {
                console.error(`Failed to sync sale ${sale.id}`, err);
                failed.push(sale);
            }
        }

        localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(failed));
        this.isSyncing = false;

        if (failed.length === 0) {
            console.log('Synchronization complete.');
        } else {
            console.warn(`Synchronization finished with ${failed.length} failures.`);
        }
    }
}

export const syncService = new SyncService();
