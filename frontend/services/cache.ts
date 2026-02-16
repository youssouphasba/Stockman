import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
    DASHBOARD: 'dashboard',
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    SUPPLIERS: 'suppliers',
    ORDERS: 'orders',
    CUSTOMERS: 'customers',
    SETTINGS: 'settings',
    STATISTICS: 'statistics',
    ALERTS: 'alerts',
    ALERT_RULES: 'alert_rules',
    EXPENSES: 'expenses',
    ACCOUNTING: 'accounting',
    SYNC_QUEUE: 'sync_queue',
    LAST_SYNC: 'last_sync_time',
    CACHE_TIMESTAMPS: 'cache_timestamps',
};

export const cache = {
    async get<T>(key: string): Promise<T | null> {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error('Cache read error', e);
            return null;
        }
    },

    async set(key: string, value: any): Promise<void> {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
            // Also save timestamp
            await this.setTimestamp(key);
        } catch (e) {
            console.error('Cache write error', e);
        }
    },

    async remove(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error('Cache remove error', e);
        }
    },

    async setTimestamp(key: string): Promise<void> {
        try {
            const timestamps = await this.get<Record<string, number>>(KEYS.CACHE_TIMESTAMPS) || {};
            timestamps[key] = Date.now();
            await AsyncStorage.setItem(KEYS.CACHE_TIMESTAMPS, JSON.stringify(timestamps));
        } catch (e) {
            // ignore
        }
    },

    async getTimestamp(key: string): Promise<number | null> {
        try {
            const timestamps = await this.get<Record<string, number>>(KEYS.CACHE_TIMESTAMPS);
            return timestamps?.[key] || null;
        } catch {
            return null;
        }
    },

    /** Returns age in minutes since last cache update, or null if never cached */
    async getAge(key: string): Promise<number | null> {
        const ts = await this.getTimestamp(key);
        if (!ts) return null;
        return Math.floor((Date.now() - ts) / 60000);
    },

    /** Check if cache is stale (older than maxAgeMinutes) */
    async isStale(key: string, maxAgeMinutes: number = 30): Promise<boolean> {
        const age = await this.getAge(key);
        if (age === null) return true;
        return age > maxAgeMinutes;
    },

    async getLastSyncTime(): Promise<number | null> {
        try {
            const val = await AsyncStorage.getItem(KEYS.LAST_SYNC);
            return val ? parseInt(val, 10) : null;
        } catch {
            return null;
        }
    },

    async setLastSyncTime(): Promise<void> {
        try {
            await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
        } catch {
            // ignore
        }
    },
};
