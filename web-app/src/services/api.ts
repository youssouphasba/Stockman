
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://stockman-production-149d.up.railway.app';
const TOKEN_KEY = 'auth_token';

// For web, we use standard localStorage
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

type RequestOptions = {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
};

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

export class AuthError extends ApiError {
    constructor(message: string) {
        super(message, 401);
    }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = getToken();
    const { method = 'GET', body, headers = {} } = options;

    const config: RequestInit = {
        method,
        headers: {
            ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
        },
    };

    if (body) {
        config.body = body instanceof FormData ? (body as any) : JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, config);

    if (response.status === 401) {
        if (endpoint !== '/auth/login') {
            removeToken();
            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur serveur' }));
        let message = 'Erreur serveur';

        if (error.detail) {
            if (typeof error.detail === 'string') {
                message = error.detail;
            } else if (Array.isArray(error.detail)) {
                // Handle FastAPI validation errors: [{"loc": ["body", "email"], "msg": "invalid email", ...}]
                message = error.detail.map((d: any) =>
                    `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg || JSON.stringify(d)}`
                ).join('\n');
            } else if (typeof error.detail === 'object') {
                message = JSON.stringify(error.detail);
            }
        }

        throw new ApiError(message, response.status);
    }

    return response.json();
}

// Ported services (Subset for the MVP)
export const auth = {
    login: (email: string, password: string) =>
        request<{ access_token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: { email, password },
        }),
    me: () => request<any>('/auth/me'),
    logout: () => {
        removeToken();
        return Promise.resolve({ message: 'Success' });
    }
};

export const products = {
    list: (categoryId?: string, skip = 0, limit = 50) => {
        const qs = new URLSearchParams();
        if (categoryId) qs.set('category_id', categoryId);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/products?${qs.toString()}`);
    },
    get: (id: string) => request<any>(`/products/${id}`),
    create: (data: any) => request<any>('/products', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
    importParse: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return request<any>('/products/import/parse', { method: 'POST', body: formData });
    },
    importConfirm: (importData: any[], mapping: any) =>
        request<any>('/products/import/confirm', { method: 'POST', body: { importData, mapping } }),
    getPriceHistory: (id: string) => request<any[]>(`/products/${id}/price-history`),
    batchStockUpdate: (codes: string[], increment: number = 1) =>
        request<{ message: string; updated_count: number; not_found_count?: number; not_found?: string[] }>('/products/batch-stock-update', { method: 'POST', body: { codes, increment } }),
};

export const dashboard = {
    get: () => request<any>('/dashboard'),
};

export const stock = {
    getMovements: (productId?: string, days?: number, startDate?: string, endDate?: string, skip = 0, limit = 50) => {
        const qs = new URLSearchParams();
        if (productId) qs.set('product_id', productId);
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/stock/movements?${qs.toString()}`);
    }
};

export const statistics = {
    get: (days?: number) => request<any>(`/statistics${days ? `?days=${days}` : ''}`),
};

export const inventory = {
    getTasks: (status: string = 'pending') => request<any[]>(`/inventory/tasks?status=${status}`),
    generateTasks: () => request<any>('/inventory/tasks/generate', { method: 'POST' }),
    submitResult: (taskId: string, count: number) => request<any>(`/inventory/tasks/${taskId}/submit`, { method: 'POST', body: { count } }),
};

export const sales = {
    list: (skip = 0, limit = 50) =>
        request<any[]>(`/sales?skip=${skip}&limit=${limit}`),
    get: (id: string) => request<any>(`/sales/${id}`),
    create: (data: { items: any[]; total_amount: number; payment_method: string; customer_id?: string }) =>
        request<any>('/sales', {
            method: 'POST',
            body: data,
        }),
    forecast: () => request<any>('/sales/forecast'),
};

export const accounting = {
    getStats: (days?: number, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<any>(`/accounting/stats?${qs.toString()}`);
    }
};

export const expenses = {
    list: (days?: number, startDate?: string, endDate?: string, skip = 0, limit = 50) => {
        const qs = new URLSearchParams();
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/expenses?${qs.toString()}`);
    },
    create: (data: { category: string; amount: number; description?: string }) =>
        request<any>('/expenses', {
            method: 'POST',
            body: data,
        }),
    delete: (id: string) => request<any>(`/expenses/${id}`, { method: 'DELETE' }),
};

export const customers = {
    list: (skip = 0, limit = 50) => request<any>(`/customers?skip=${skip}&limit=${limit}`),
    get: (id: string) => request<any>(`/customers/${id}`),
    create: (data: { name: string; email?: string; phone?: string; notes?: string; birthday?: string; category?: string }) =>
        request<any>('/customers', {
            method: 'POST',
            body: data,
        }),
    update: (id: string, data: any) =>
        request<any>(`/customers/${id}`, {
            method: 'PUT',
            body: data,
        }),
    delete: (id: string) => request<any>(`/customers/${id}`, { method: 'DELETE' }),
    getDebts: (id: string) => request<any>(`/customers/${id}/debts`),
    addDebt: (id: string, data: { amount: number; is_payment: boolean; description?: string }) =>
        request<any>(`/customers/${id}/debts`, { method: 'POST', body: data }),
};

export const suppliers = {
    list: () => request<any[]>('/suppliers'),
    get: (id: string) => request<any>(`/suppliers/${id}`),
    create: (data: any) => request<any>('/suppliers', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/suppliers/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/suppliers/${id}`, { method: 'DELETE' }),
};

export const supplier_orders = {
    list: (skip = 0, limit = 50) => request<any>(`/orders?skip=${skip}&limit=${limit}`),
    get: (id: string) => request<any>(`/orders/${id}`),
    create: (data: { supplier_id: string; items: any[]; notes?: string; expected_delivery?: string }) =>
        request<any>('/orders', {
            method: 'POST',
            body: data,
        }),
    updateStatus: (id: string, status: string) =>
        request<any>(`/orders/${id}/status`, {
            method: 'PUT',
            body: { status },
        }),
    receivePartial: (id: string, items: any[], notes?: string) =>
        request<any>(`/orders/${id}/receive-partial`, {
            method: 'PUT',
            body: { items, notes },
        }),
};

export const replenishment = {
    getSuggestions: () => request<any[]>('/replenishment/suggestions'),
    automate: () => request<any>('/replenishment/automate', { method: 'POST' }),
};

// Alerts
export const alerts = {
    list: (skip = 0, limit = 50) =>
        request<any>(`/alerts?skip=${skip}&limit=${limit}`),
    markRead: (id: string) =>
        request<{ message: string }>(`/alerts/${id}/read`, { method: 'PUT' }),
    dismiss: (id: string) =>
        request<{ message: string }>(`/alerts/${id}/dismiss`, { method: 'PUT' }),
};

// Activity Logs
export const activityLogs = {
    list: (skip = 0, limit = 50) =>
        request<any>(`/activity-logs?skip=${skip}&limit=${limit}`),
};

// Settings
export const settings = {
    get: () => request<any>('/settings'),
    update: (data: any) =>
        request<any>('/settings', { method: 'PUT', body: data }),
};

// Marketplace
export const marketplace = {
    searchSuppliers: (params?: { q?: string; category?: string; city?: string; min_rating?: number; verified_only?: boolean }) => {
        const qs = new URLSearchParams();
        if (params?.q) qs.append('q', params.q);
        if (params?.category) qs.append('category', params.category);
        if (params?.city) qs.append('city', params.city);
        if (params?.min_rating) qs.append('min_rating', params.min_rating.toString());
        if (params?.verified_only) qs.append('verified_only', 'true');
        return request<any[]>(`/marketplace/suppliers?${qs.toString()}`);
    },
    getSupplier: (supplierUserId: string) => request<any>(`/marketplace/suppliers/${supplierUserId}`),
    searchProducts: (params?: { q?: string; category?: string; price_min?: number; price_max?: number; min_supplier_rating?: number }) => {
        const qs = new URLSearchParams();
        if (params?.q) qs.append('q', params.q || '');
        if (params?.category) qs.append('category', params.category);
        if (params?.price_min) qs.append('price_min', params.price_min.toString());
        if (params?.price_max) qs.append('price_max', params.price_max.toString());
        if (params?.min_supplier_rating) qs.append('min_supplier_rating', params.min_supplier_rating.toString());
        return request<any[]>(`/marketplace/search-products?${qs.toString()}`);
    }
};

export const categories = {
    list: () => request<any[]>('/categories'),
    create: (data: { name: string; color: string; icon?: string }) =>
        request<any>('/categories', { method: 'POST', body: data }),
    update: (id: string, data: { name: string; color: string; icon?: string }) =>
        request<any>(`/categories/${id}`, { method: 'PUT', body: data }),
};

export const ai = {
    dailySummary: (language: string = 'fr') =>
        request<{ summary: string }>(`/ai/daily-summary?lang=${language}`),
    suggestCategory: (productName: string, lang: string = 'fr') =>
        request<{ category: string; subcategory: string }>(`/ai/suggest-category?name=${encodeURIComponent(productName)}&lang=${lang}`),
    generateDescription: (name: string, category?: string, subcategory?: string, lang: string = 'fr') =>
        request<{ description: string }>(`/ai/generate-description?name=${encodeURIComponent(name)}&category=${category || ''}&subcategory=${subcategory || ''}&lang=${lang}`),
    suggestPrice: (productId: string, lang: string = 'fr') =>
        request<{ suggested_price: number; reasoning: string }>(`/ai/suggest-price/${productId}?lang=${lang}`),
    basketSuggestions: (productIds: string[]) =>
        request<{ suggestions: any[] }>('/ai/basket-suggestions', {
            method: 'POST',
            body: { product_ids: productIds },
        }),
    scanInvoice: (base64: string, lang: string = 'fr') =>
        request<any>('/ai/scan-invoice', {
            method: 'POST',
            body: { image: base64, lang },
        }),
    detectAnomalies: (language: string = 'fr') =>
        request<{ anomalies: any[] }>(`/ai/detect-anomalies?lang=${language}`),
    support: (message: string, history: any[], language: string = 'fr') =>
        request<{ response: string }>('/ai/support', {
            method: 'POST',
            body: { message, history, language },
        }),
};

export const returns = {
    list: () => request<any>('/returns'),
    get: (id: string) => request<any>(`/returns/${id}`),
    create: (data: any) => request<any>('/returns', { method: 'POST', body: data }),
    complete: (id: string) => request<any>(`/returns/${id}/complete`, { method: 'POST' }),
};

export const creditNotes = {
    list: () => request<any>('/credit-notes'),
    get: (id: string) => request<any>(`/credit-notes/${id}`),
};

export const subUsers = {
    list: () => request<any[]>('/sub-users'),
    create: (data: any) => request<any>('/sub-users', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/sub-users/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/sub-users/${id}`, { method: 'DELETE' }),
};

export const alertRules = {
    list: () => request<any[]>('/alert-rules'),
    create: (data: any) => request<any>('/alert-rules', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/alert-rules/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/alert-rules/${id}`, { method: 'DELETE' }),
};

export const subscription = {
    getDetails: () => request<any>('/subscription/details'),
    sync: () => request<any>('/subscription/sync', { method: 'POST' }),
    initCinetPay: () => request<{ payment_url: string }>('/subscription/cinetpay/init', { method: 'POST' }),
};

export const admin = {
    getHealth: () => request<any>('/admin/health'),
    getGlobalStats: () => request<any>('/admin/stats'),
    getDetailedStats: () => request<any>('/admin/stats/detailed'),
    listUsers: (skip = 0, limit = 100) => request<any[]>(`/admin/users?skip=${skip}&limit=${limit}`),
    listStores: (skip = 0, limit = 50) => request<any>(`/admin/stores?skip=${skip}&limit=${limit}`),
    listAllProducts: (params: any) => {
        const qs = new URLSearchParams(params);
        return request<any>(`/admin/products?${qs.toString()}`);
    },
    toggleUser: (id: string) => request<any>(`/admin/users/${id}/toggle`, { method: 'PUT' }),
    toggleProduct: (id: string) => request<any>(`/admin/products/${id}/toggle`, { method: 'PUT' }),
    deleteProduct: (id: string) => request<any>(`/admin/products/${id}`, { method: 'DELETE' }),
    listTickets: (status?: string) => request<any[]>(`/admin/support/tickets${status ? `?status=${status}` : ''}`),
    replyTicket: (id: string, content: string) => request<any>(`/admin/support/tickets/${id}/reply`, { method: 'POST', body: { content } }),
    closeTicket: (id: string) => request<any>(`/admin/support/tickets/${id}/close`, { method: 'POST' }),
    listLogs: (module?: string, skip = 0, limit = 100) => request<any[]>(`/admin/logs?${module ? `module=${module}&` : ''}skip=${skip}&limit=${limit}`),
    // Disputes
    listDisputes: (params?: { status?: string; type?: string; skip?: number; limit?: number }) => {
        const query = new URLSearchParams(params as any || {}).toString();
        return request<{ items: any[]; total: number }>(`/admin/disputes?${query}`);
    },
    replyDispute: (id: string, content: string) =>
        request<any>(`/admin/disputes/${id}/reply`, { method: 'POST', body: { content } }),
    updateDisputeStatus: (id: string, status: string, resolution?: string) =>
        request<any>(`/admin/disputes/${id}/status`, { method: 'PUT', body: { status, resolution } }),
    getDisputeStats: () => request<any>('/admin/disputes/stats'),
    // Security
    listSecurityEvents: (type?: string, skip = 0, limit = 100) => {
        const params = type ? `type=${type}&skip=${skip}&limit=${limit}` : `skip=${skip}&limit=${limit}`;
        return request<{ items: any[]; total: number }>(`/admin/security/events?${params}`);
    },
    getSecurityStats: () => request<any>('/admin/security/stats'),
    getActiveSessions: () => request<any[]>('/admin/security/sessions'),
    // Communication
    broadcast: (message: string, title?: string) =>
        request<any>('/admin/broadcast', { method: 'POST', body: { message, title } }),
    sendMessage: (data: { title: string; content: string; target?: string }) =>
        request<any>('/admin/messages/send', { method: 'POST', body: data }),
};

// ── Chat / Messagerie ────────────────────────────────────────────────────────

export type ChatMessage = {
    message_id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    created_at: string;
    read: boolean;
};

export type Conversation = {
    conversation_id: string;
    shopkeeper_id: string;
    shopkeeper_name: string;
    supplier_id: string;
    supplier_name: string;
    last_message?: string;
    last_message_at?: string;
    unread_shopkeeper: number;
    unread_supplier: number;
};

export const chat = {
    listConversations: () => request<Conversation[]>('/conversations'),
    createConversation: (partnerId: string, partnerName: string) =>
        request<Conversation>(`/conversations?partner_id=${partnerId}&partner_name=${encodeURIComponent(partnerName)}`, { method: 'POST' }),
    getMessages: (conversationId: string, skip = 0, limit = 100) =>
        request<{ items: ChatMessage[]; total: number }>(`/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`),
    sendMessage: (conversationId: string, content: string) =>
        request<ChatMessage>(`/conversations/${conversationId}/messages`, { method: 'POST', body: { content } }),
    getUnreadCount: () => request<{ unread: number }>('/conversations/unread-count'),
};

export const supplierDashboard = {
    get: () => request<any>('/supplier/dashboard/stats'),
    getPerformance: (days = 30) => request<any>(`/supplier/dashboard/performance?days=${days}`),
};

export const supplierOrders = {
    list: (status?: string, skip = 0, limit = 50) => {
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/supplier/orders?${qs.toString()}`);
    },
    updateStatus: (id: string, status: string) => request<any>(`/supplier/orders/${id}/status`, { method: 'PUT', body: { status } }),
};

export const supplierCatalog = {
    list: (skip = 0, limit = 50) => request<any>(`/supplier/catalog?skip=${skip}&limit=${limit}`),
    updatePrice: (id: string, price: number) => request<any>(`/supplier/catalog/${id}/price`, { method: 'PUT', body: { price } }),
    toggleStock: (id: string) => request<any>(`/supplier/catalog/${id}/toggle-stock`, { method: 'PUT' }),
};
