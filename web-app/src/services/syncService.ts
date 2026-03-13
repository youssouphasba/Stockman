'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const OFFLINE_REQUESTS_KEY = 'stockman_offline_requests';
const LEGACY_OFFLINE_SALES_KEY = 'stockman_offline_sales';

export interface QueuedRequest {
    id: string;
    endpoint: string;
    method: string;
    body?: any;
    timestamp: number;
}

class SyncService {
    private isSyncing = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.migrateLegacySalesQueue();
            window.addEventListener('online', () => this.sync());
            if (navigator.onLine) {
                setTimeout(() => {
                    this.sync();
                }, 0);
            }
        }
    }

    private migrateLegacySalesQueue() {
        try {
            const legacyRaw = localStorage.getItem(LEGACY_OFFLINE_SALES_KEY);
            if (!legacyRaw) return;
            const legacy = JSON.parse(legacyRaw);
            if (!Array.isArray(legacy) || legacy.length === 0) {
                localStorage.removeItem(LEGACY_OFFLINE_SALES_KEY);
                return;
            }

            const current = this.getQueue();
            const migrated = legacy.map((sale: any) => ({
                id: sale.id || crypto.randomUUID(),
                endpoint: '/sales',
                method: 'POST',
                body: sale.data,
                timestamp: sale.timestamp || Date.now(),
            }));
            localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify([...current, ...migrated]));
            localStorage.removeItem(LEGACY_OFFLINE_SALES_KEY);
        } catch {
            // ignore migration issues
        }
    }

    queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp'>) {
        const queue = this.getQueue();
        const queued: QueuedRequest = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...request,
        };
        queue.push(queued);
        localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify(queue));
        return queued.id;
    }

    queueSale(saleData: any) {
        return this.queueRequest({
            endpoint: '/sales',
            method: 'POST',
            body: saleData,
        });
    }

    getQueue(): QueuedRequest[] {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(OFFLINE_REQUESTS_KEY);
        try {
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    private async send(request: QueuedRequest) {
        const response = await fetch(`${API_URL}/api${request.endpoint}`, {
            method: request.method,
            credentials: 'include',
            headers: {
                ...(request.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
            body: request.body
                ? (request.body instanceof FormData ? request.body : JSON.stringify(request.body))
                : undefined,
        });

        if (!response.ok) {
            const error = await response.text().catch(() => 'Erreur de synchronisation');
            throw new Error(error || 'Erreur de synchronisation');
        }
    }

    async sync() {
        if (this.isSyncing || typeof navigator === 'undefined' || !navigator.onLine) return;

        const queue = this.getQueue();
        if (queue.length === 0) return;

        this.isSyncing = true;
        const failed: QueuedRequest[] = [];

        for (const request of queue) {
            try {
                await this.send(request);
            } catch (err) {
                console.error(`Failed to sync request ${request.id}`, err);
                failed.push(request);
            }
        }

        localStorage.setItem(OFFLINE_REQUESTS_KEY, JSON.stringify(failed));
        this.isSyncing = false;
    }
}

export const syncService = new SyncService();
