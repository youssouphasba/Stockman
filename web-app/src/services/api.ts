import { syncService } from './syncService';

// In the browser, always go through the Next.js rewrite proxy so auth cookies stay same-origin.
// On the server, keep the env fallback for non-browser execution contexts.
const IS_BROWSER = typeof window !== 'undefined';
export const API_URL = IS_BROWSER ? '' : (process.env.NEXT_PUBLIC_API_URL || '');
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const OFFLINE_CACHE_PREFIX = 'stockman_api_cache:';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const WEB_ACCESS_MODE_KEY = 'stockman_web_access_mode';
const NON_CACHEABLE_GET_PREFIXES = [
    '/auth/',
    '/demo/session/',
    '/subscription/me',
    '/user/features',
    '/settings',
];

// Idempotency key generator for critical mutations (sales, payments)
const generateIdempotencyKey = () =>
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const IDEMPOTENT_MUTATION_PREFIXES = ['/sales', '/payments', '/stock/movement', '/stock/transfer', '/orders'];

// Web auth is cookie-based; these helpers only clear legacy storage when needed.
export const getToken = () => null;
export const setToken = (_token: string) => {};
export const getRefreshToken = () => null;
export const setRefreshToken = (_token: string) => {};

function shouldBypassOfflineCache(endpoint: string) {
    return NON_CACHEABLE_GET_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function clearOfflineApiCache() {
    if (typeof window === 'undefined') return;
    try {
        for (let i = localStorage.length - 1; i >= 0; i -= 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith(OFFLINE_CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        }
    } catch {
        // ignore storage cleanup issues
    }
}

export function setWebAccessMode(mode: 'full' | 'read_only') {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WEB_ACCESS_MODE_KEY, mode);
}

export function clearWebAccessMode() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WEB_ACCESS_MODE_KEY);
}

function isConsultationOnlyWebMode() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(WEB_ACCESS_MODE_KEY) === 'read_only';
}

function canMutateInConsultationMode(endpoint: string) {
    return ['/auth/logout', '/subscription', '/billing'].some((prefix) => endpoint.startsWith(prefix));
}

export const removeToken = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearWebAccessMode();
    clearOfflineApiCache();
};

type RequestOptions = {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
};

const ONLINE_ONLY_MUTATION_PREFIXES = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/verify',
    '/auth/resend',
    '/billing',
    '/subscription/sync',
    '/ai/',
];

function getOfflineCacheKey(endpoint: string) {
    return `${OFFLINE_CACHE_PREFIX}${endpoint}`;
}

interface CachedEntry { data: unknown; ts: number }

function readCachedResponse<T>(endpoint: string): T | null {
    if (shouldBypassOfflineCache(endpoint)) return null;
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(getOfflineCacheKey(endpoint));
        if (!raw) return null;
        const entry: CachedEntry = JSON.parse(raw);
        if (entry.ts && Date.now() - entry.ts > CACHE_TTL_MS) {
            localStorage.removeItem(getOfflineCacheKey(endpoint));
            return null;
        }
        return (entry.data ?? entry) as T;
    } catch {
        return null;
    }
}

function writeCachedResponse(endpoint: string, value: unknown) {
    if (shouldBypassOfflineCache(endpoint)) return;
    if (typeof window === 'undefined') return;
    try {
        const entry: CachedEntry = { data: value, ts: Date.now() };
        localStorage.setItem(getOfflineCacheKey(endpoint), JSON.stringify(entry));
    } catch {
        // ignore cache quota issues
    }
}

function isOnlineOnlyMutation(endpoint: string) {
    return ONLINE_ONLY_MUTATION_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}

function buildOfflineMutationResponse<T>(endpoint: string, method: string, body: unknown, requestId: string): T {
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        return {
            ...(body as Record<string, unknown>),
            status: 'pending',
            sync: true,
            offline_pending: true,
            offline_endpoint: endpoint,
            offline_method: method,
            offline_request_id: requestId,
        } as T;
    }
    return {
        status: 'pending',
        sync: true,
        offline_pending: true,
        offline_endpoint: endpoint,
        offline_method: method,
        offline_request_id: requestId,
    } as T;
}

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

// Mutex: ensures only one refresh request runs at a time across all concurrent 401s
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
    try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (refreshRes.ok) {
            await refreshRes.json().catch(() => null);
            return true;
        }
    } catch (refreshErr) {
        console.warn('Auto-refresh failed:', refreshErr);
    }
    return false;
}

async function refreshWithMutex(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
    return refreshPromise;
}

function buildEndpointWithParams(endpoint: string, params?: Record<string, string | number | boolean | undefined>) {
    if (!params) return endpoint;
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        search.set(key, String(value));
    });
    const query = search.toString();
    if (!query) return endpoint;
    return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
}

async function performRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, params } = options;
    const hasJsonBody = body !== undefined && body !== null && !(body instanceof FormData);
    const finalEndpoint = buildEndpointWithParams(endpoint, params);

    // Attach idempotency key on critical mutations to prevent duplicates on retry
    const extraHeaders: Record<string, string> = {};
    if (method !== 'GET' && IDEMPOTENT_MUTATION_PREFIXES.some((p) => endpoint.startsWith(p))) {
        extraHeaders['X-Idempotency-Key'] = generateIdempotencyKey();
    }

    const config: RequestInit = {
        method,
        credentials: 'include',
        headers: {
            ...(IS_BROWSER ? { 'X-Stockman-Surface': 'web' } : {}),
            ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
            ...extraHeaders,
            ...headers,
        },
    };

    if (body !== undefined && body !== null) {
        config.body = body instanceof FormData ? (body as any) : JSON.stringify(body);
    }

    let response = await fetch(`${API_URL}/api${finalEndpoint}`, config);

    if (response.status === 401) {
        const skipRefresh = ['/auth/login', '/auth/refresh'];
        if (!skipRefresh.includes(endpoint)) {
            const refreshed = await refreshWithMutex();
            if (refreshed) {
                response = await fetch(`${API_URL}/api${finalEndpoint}`, config);
            }
        }
        if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
            removeToken();
            throw new AuthError('Session expirée. Veuillez vous reconnecter.');
        }
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur serveur' }));
        let message = 'Erreur serveur';

        console.warn(`API ${response.status} on ${endpoint}:`, error?.detail ?? error);

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

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params } = options;
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const cacheEndpoint = buildEndpointWithParams(endpoint, params);

    if (method !== 'GET' && isConsultationOnlyWebMode() && !canMutateInConsultationMode(endpoint)) {
        throw new ApiError(
            "Votre plan Starter ou Pro est disponible sur le web en consultation uniquement. Passez à Enterprise pour créer ou modifier des données depuis le web.",
            403,
        );
    }

    if (method === 'GET') {
        if (!online) {
            const cached = readCachedResponse<T>(cacheEndpoint);
            if (cached) return cached;
            throw new ApiError('Mode hors ligne : données non disponibles en cache', 503);
        }

        try {
            const data = await performRequest<T>(endpoint, options);
            writeCachedResponse(cacheEndpoint, data);
            return data;
        } catch (error) {
            if (error instanceof AuthError || shouldBypassOfflineCache(cacheEndpoint)) {
                throw error;
            }
            const cached = readCachedResponse<T>(cacheEndpoint);
            if (cached) return cached;
            throw error;
        }
    }

    try {
        return await performRequest<T>(endpoint, options);
    } catch (error) {
        const offlineNow = (typeof navigator !== 'undefined' && !navigator.onLine) || !online;
        if (!offlineNow) {
            throw error;
        }
        if (body instanceof FormData) {
            throw new ApiError('Cette action nécessite une connexion pour envoyer un fichier.', 503);
        }
        if (isOnlineOnlyMutation(endpoint)) {
            throw new ApiError('Cette action nécessite une connexion internet active.', 503);
        }

        const requestId = syncService.queueRequest({
            endpoint,
            method,
            body,
        });
        return buildOfflineMutationResponse<T>(endpoint, method, body, requestId);
    }
}

// ─── Shared Types ───

export type UserFeatures = {
    has_production: boolean;
    is_restaurant: boolean;
    sector: string;
    sector_label: string;
};

export type PermissionLevel = 'none' | 'read' | 'write';

export type UserPermissions = {
    stock?: PermissionLevel;
    accounting?: PermissionLevel;
    crm?: PermissionLevel;
    pos?: PermissionLevel;
    suppliers?: PermissionLevel;
    staff?: PermissionLevel;
};

export type StorePermissions = Record<string, Partial<UserPermissions>>;

export type VerificationChannel = 'phone' | 'email';

export type User = {
    user_id: string;
    name: string;
    email: string;
    store_name?: string;
    country_code?: string;
    role: string;
    permissions?: UserPermissions;
    effective_permissions?: UserPermissions;
    account_id?: string;
    account_roles?: ('billing_admin' | 'org_admin')[];
    store_permissions?: StorePermissions;
    plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
    effective_plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
    subscription_plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
    subscription_status?: 'active' | 'expired' | 'cancelled';
    effective_subscription_status?: 'active' | 'expired' | 'cancelled';
    subscription_access_phase?: 'active' | 'grace' | 'restricted' | 'read_only';
    grace_until?: string | null;
    read_only_after?: string | null;
    requires_payment_attention?: boolean;
    can_write_data?: boolean;
    can_use_advanced_features?: boolean;
    currency?: string;
    business_type?: string;
    active_store_id?: string;
    store_ids?: string[];
    is_phone_verified?: boolean;
    is_email_verified?: boolean;
    required_verification?: VerificationChannel | null;
    verification_channel?: VerificationChannel | null;
    signup_surface?: 'mobile' | 'web' | null;
    verification_completed_at?: string | null;
    can_access_app?: boolean;
    can_access_web?: boolean;
    is_demo?: boolean;
    demo_session_id?: string | null;
    demo_type?: string | null;
    demo_surface?: string | null;
    demo_expires_at?: string | null;
};

export type PricingPlanQuote = {
    plan: 'starter' | 'pro' | 'enterprise';
    currency: string;
    display_currency: string;
    amount: string;
    display_price: string;
    provider: 'flutterwave' | 'stripe';
};

export type PricingPublicResponse = {
    country_code: string;
    requested_currency?: string | null;
    currency: string;
    display_currency: string;
    pricing_region: string;
    recommended_checkout_provider: 'flutterwave' | 'stripe';
    use_mobile_money: boolean;
    can_change_billing_country: boolean;
    fallback_used?: boolean;
    plans: Record<'starter' | 'pro' | 'enterprise', PricingPlanQuote>;
};

export type SubscriptionData = {
    plan: 'trial' | 'starter' | 'pro' | 'enterprise';
    effective_plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
    status: 'active' | 'expired' | 'cancelled';
    subscription_access_phase?: 'active' | 'grace' | 'restricted' | 'read_only';
    grace_until?: string | null;
    read_only_after?: string | null;
    requires_payment_attention?: boolean;
    can_write_data?: boolean;
    can_use_advanced_features?: boolean;
    trial_ends_at?: string;
    subscription_end?: string;
    subscription_provider: 'none' | 'revenuecat' | 'flutterwave' | 'stripe' | '';
    remaining_days: number;
    is_trial: boolean;
    country_code: string;
    currency: string;
    pricing_region: string;
    effective_prices: Record<'starter' | 'pro' | 'enterprise', PricingPlanQuote>;
    recommended_checkout_provider: 'flutterwave' | 'stripe';
    can_change_billing_country: boolean;
    billing_contact_name?: string;
    billing_contact_email?: string;
    use_mobile_money?: boolean;
    is_demo?: boolean;
    demo_session_id?: string | null;
    demo_type?: string | null;
    demo_surface?: string | null;
    demo_expires_at?: string | null;
};

export type DemoSessionInfo = {
    demo_session_id: string;
    demo_type: string;
    label: string;
    surface: string;
    expires_at: string;
    contact_email?: string | null;
    status: string;
    country_code: string;
    currency: string;
    pricing_region: string;
};

export type DemoSessionResponse = {
    access_token: string;
    refresh_token?: string;
    user: User;
    demo_session: DemoSessionInfo;
};

export type DashboardLayoutSettings = {
    show_kpi: boolean;
    show_stock_status: boolean;
    show_smart_reminders: boolean;
    show_forecast: boolean;
    show_recent_alerts: boolean;
    show_recent_sales: boolean;
    show_stock_chart: boolean;
    show_category_chart: boolean;
    show_abc_analysis: boolean;
    show_reorder: boolean;
    show_inventory_tasks: boolean;
    show_expiry_alerts: boolean;
    show_profitability: boolean;
};

export type NotificationChannel = 'in_app' | 'push' | 'email';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type NotificationContactMap = {
    default: string[];
    stock: string[];
    procurement: string[];
    finance: string[];
    crm: string[];
    operations: string[];
    billing: string[];
};

export type NotificationPreferences = {
    in_app: boolean;
    push: boolean;
    email: boolean;
    minimum_severity_for_push: NotificationSeverity;
    minimum_severity_for_email: NotificationSeverity;
};

export type AlertRule = {
    rule_id: string;
    user_id: string;
    account_id?: string;
    type: string;
    scope: 'account' | 'store';
    store_id?: string | null;
    enabled: boolean;
    threshold_percentage?: number | null;
    notification_channels: NotificationChannel[];
    recipient_keys: (keyof NotificationContactMap)[];
    recipient_emails: string[];
    minimum_severity?: NotificationSeverity | null;
    created_at: string;
    updated_at?: string;
};

export type AlertRuleCreate = {
    type: string;
    scope?: 'account' | 'store';
    store_id?: string | null;
    enabled?: boolean;
    threshold_percentage?: number | null;
    notification_channels?: NotificationChannel[];
    recipient_keys?: (keyof NotificationContactMap)[];
    recipient_emails?: string[];
    minimum_severity?: NotificationSeverity | null;
};

export type UserSettings = {
    user_id?: string;
    account_id?: string;
    user_name?: string;
    email?: string;
    language?: string;
    currency?: string;
    modules: Record<string, boolean>;
    simple_mode: boolean;
    push_notifications?: boolean;
    notification_preferences?: NotificationPreferences;
    notification_contacts?: NotificationContactMap;
    store_notification_contacts?: NotificationContactMap;
    tax_enabled?: boolean;
    tax_rate?: number;
    tax_mode?: 'ttc' | 'ht';
    receipt_business_name?: string;
    receipt_footer?: string;
    invoice_business_name?: string;
    invoice_business_address?: string;
    invoice_label?: string;
    invoice_prefix?: string;
    invoice_footer?: string;
    invoice_payment_terms?: string;
    terminals?: string[];
    billing_contact_name?: string;
    billing_contact_email?: string;
    loyalty?: {
        is_active: boolean;
        ratio: number;
        reward_threshold: number;
    };
    mobile_preferences?: {
        simple_mode: boolean;
        show_manager_zone?: boolean;
    };
    web_preferences?: {
        dashboard_layout?: DashboardLayoutSettings;
    };
    dashboard_layout?: DashboardLayoutSettings;
    reminder_rules?: Record<string, any>;
    expense_categories?: string[];
};

export type Store = {
    store_id: string;
    user_id: string;
    name: string;
    address?: string;
    currency?: string;
    store_notification_contacts?: NotificationContactMap;
    receipt_business_name?: string;
    receipt_footer?: string;
    invoice_business_name?: string;
    invoice_business_address?: string;
    invoice_label?: string;
    invoice_prefix?: string;
    invoice_footer?: string;
    invoice_payment_terms?: string;
    terminals?: string[];
    tax_enabled?: boolean;
    tax_rate?: number;
    tax_mode?: 'ttc' | 'ht';
    created_at: string;
};

export type AccountingSaleHistoryItem = {
    sale_id: string;
    store_id?: string;
    created_at: string;
    total_amount: number;
    discount_amount?: number;
    payment_method: string;
    payments?: { method: string; amount: number }[];
    customer_id?: string;
    customer_name?: string;
    status?: string;
    item_count: number;
    items: {
        product_id?: string;
        product_name?: string;
        quantity: number;
        selling_price?: number;
        total?: number;
    }[];
    invoice_id?: string;
    invoice_number?: string;
    invoice_label?: string;
    invoice_issued_at?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
};

export type CustomerInvoiceItem = {
    product_id?: string;
    product_name?: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    tax_rate?: number;
    tax_amount?: number;
};

export type CustomerInvoice = {
    invoice_id: string;
    invoice_number: string;
    invoice_label: string;
    invoice_prefix: string;
    user_id: string;
    store_id: string;
    sale_id: string;
    customer_id?: string;
    customer_name?: string;
    status: string;
    currency?: string;
    items: CustomerInvoiceItem[];
    discount_amount?: number;
    subtotal_ht?: number;
    tax_total?: number;
    total_amount: number;
    payment_method?: string;
    payments?: { method: string; amount: number }[];
    business_name?: string;
    business_address?: string;
    footer?: string;
    payment_terms?: string;
    notes?: string;
    sale_created_at?: string;
    issued_at: string;
    created_at: string;
};

export type AccountingTopExpenseCategory = {
    category: string;
    label: string;
    amount: number;
    ratio: number;
};

export type AccountingStats = {
    revenue: number;
    cogs: number;
    gross_profit: number;
    net_profit: number;
    total_losses: number;
    expenses: number;
    expenses_breakdown: Record<string, number>;
    loss_breakdown: Record<string, number>;
    sales_count: number;
    period_label: string;
    total_purchases: number;
    purchases_count: number;
    daily_revenue: { date: string; revenue: number; profit: number }[];
    payment_breakdown: Record<string, number>;
    avg_sale: number;
    total_items_sold: number;
    stock_value: number;
    stock_selling_value: number;
    tax_collected: number;
    scope_label?: string;
    summary?: string;
    recommendations?: string[];
    gross_margin_pct?: number;
    net_margin_pct?: number;
    expense_ratio?: number;
    loss_ratio?: number;
    tax_ratio?: number;
    top_expense_categories?: AccountingTopExpenseCategory[];
    product_performance: {
        id: string;
        name: string;
        qty_sold: number;
        revenue: number;
        cogs: number;
        loss: number;
        gross_profit?: number;
        net_contribution?: number;
        margin_pct?: number;
    }[];
};

export type CrmAnalyticsSegment = {
    id: string;
    label: string;
    description: string;
    accent: string;
    count: number;
    examples: string[];
};

export type CrmAnalyticsOverview = {
    days: number;
    summary: string;
    recommendations: string[];
    kpis: {
        total_customers: number;
        active_customers: number;
        new_customers: number;
        inactive_customers: number;
        at_risk_customers: number;
        vip_customers: number;
        average_basket: number;
        repeat_rate: number;
        debt_customers: number;
        debt_balance: number;
        birthdays_soon: number;
    };
    segments: CrmAnalyticsSegment[];
};

export type SupplierInvoice = {
    invoice_id: string;
    user_id: string;
    supplier_id: string;
    order_id?: string;
    invoice_number: string;
    amount: number;
    status: 'paid' | 'unpaid' | 'partial';
    due_date?: string;
    file_url?: string;
    notes?: string;
    created_at: string;
};

export type SupplierCommunicationLog = {
    log_id: string;
    user_id: string;
    supplier_id: string;
    type: 'whatsapp' | 'call' | 'visit' | 'email' | 'other';
    subject?: string;
    content: string;
    created_at: string;
};

export type SupplierLogCreate = {
    type: 'whatsapp' | 'call' | 'visit' | 'email' | 'other';
    subject?: string;
    content: string;
};

export type SupplierStats = {
    total_spent: number;
    pending_spent: number;
    orders_count: number;
    pending_orders: number;
    avg_delivery_days: number;
    delivered_count: number;
    partially_delivered_count?: number;
    cancelled_count?: number;
    on_time_rate?: number;
    full_delivery_rate?: number;
    partial_delivery_rate?: number;
    cancel_rate?: number;
    price_variance_pct?: number;
    average_order_value?: number;
    order_frequency_days?: number;
    score?: number;
    score_label?: 'fiable' | 'a_surveiller' | 'risque';
    recent_incidents?: string[];
    store_breakdown?: {
        store_id?: string;
        store_name: string;
        orders_count: number;
        open_orders: number;
        delivered_orders: number;
        total_spent: number;
    }[];
};

export type SupplierPriceHistoryPoint = {
    order_id: string;
    store_id?: string;
    store_name: string;
    date?: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
};

export type SupplierCompetitorPrice = {
    supplier_id?: string;
    supplier_name: string;
    supplier_price: number;
    is_preferred?: boolean;
};

export type SupplierPriceHistoryItem = {
    product_id: string;
    product_name: string;
    unit: string;
    current_supplier_price: number;
    last_order_price: number;
    average_price_30d?: number | null;
    average_price_90d?: number | null;
    min_price_90d?: number | null;
    max_price_90d?: number | null;
    latest_change_pct: number;
    last_ordered_at?: string | null;
    points: SupplierPriceHistoryPoint[];
    competitor_prices: SupplierCompetitorPrice[];
};

export type ProcurementOverview = {
    days: number;
    scope_label: string;
    recommendations: string[];
    approval: {
        workflow_enabled: boolean;
        pending_orders: number;
    };
    kpis: {
        total_spend: number;
        open_orders: number;
        suppliers_count: number;
        average_supplier_score: number;
        group_opportunities: number;
        local_replenishment_items: number;
    };
    supplier_ranking: {
        supplier_key: string;
        supplier_id?: string;
        supplier_name: string;
        kind: 'manual' | 'marketplace';
        stores_count: number;
        orders_count: number;
        open_orders: number;
        total_spend: number;
        avg_order_value: number;
        avg_lead_time_days: number;
        on_time_rate: number;
        full_delivery_rate: number;
        partial_delivery_rate: number;
        cancel_rate: number;
        price_variance_pct: number;
        score: number;
        score_label: 'fiable' | 'a_surveiller' | 'risque';
        recent_incidents: string[];
    }[];
    store_summaries: {
        store_id: string;
        store_name: string;
        spent: number;
        open_orders: number;
        critical_replenishments: number;
        active_suppliers: number;
    }[];
    group_opportunities: {
        supplier_id?: string;
        supplier_name: string;
        stores_count: number;
        total_estimated_amount: number;
        total_recommended_quantity: number;
        stores: {
            store_id?: string;
            store_name: string;
            items_count: number;
            estimated_total: number;
            items: {
                product_id: string;
                product_name: string;
                suggested_quantity: number;
                estimated_total: number;
            }[];
        }[];
    }[];
    local_suggestions: {
        store_id: string;
        store_name: string;
        product_id: string;
        product_name: string;
        supplier_id?: string;
        supplier_name: string;
        current_quantity: number;
        min_stock: number;
        suggested_quantity: number;
        supplier_price: number;
        estimated_total: number;
    }[];
};

export type SupplierProduct = {
    link_id: string;
    supplier_id: string;
    product_id: string;
    supplier_price: number;
    supplier_sku?: string;
    is_preferred?: boolean;
    user_id?: string;
    created_at?: string;
};

export type SupplierProductCreate = {
    supplier_id: string;
    product_id: string;
    supplier_price: number;
    supplier_sku?: string;
    is_preferred?: boolean;
};

export type SupplierProductUpdate = {
    supplier_price?: number;
    supplier_sku?: string;
    is_preferred?: boolean;
};

export type SupplierProductLink = SupplierProduct & {
    product: any;
};

export type SupplierProfileData = {
    profile_id: string;
    user_id: string;
    company_name: string;
    description: string;
    phone: string;
    address: string;
    city: string;
    categories: string[];
    delivery_zones: string[];
    min_order_amount: number;
    average_delivery_days: number;
    rating_average: number;
    rating_count: number;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
};

export type CatalogProductData = {
    catalog_id: string;
    supplier_user_id: string;
    name: string;
    description: string;
    category: string;
    subcategory: string;
    price: number;
    unit: string;
    min_order_quantity: number;
    stock_available: number;
    available: boolean;
    created_at: string;
    updated_at: string;
};

export type CatalogProductCreate = {
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    price?: number;
    unit?: string;
    min_order_quantity?: number;
    stock_available?: number;
    available?: boolean;
};

export type SupplierRatingData = {
    rating_id: string;
    supplier_user_id: string;
    shopkeeper_user_id: string;
    shopkeeper_name: string;
    order_id: string;
    score: number;
    comment?: string;
    created_at: string;
};

export type MarketplaceSupplier = SupplierProfileData & {
    name?: string;
    supplier_user_id?: string;
    category?: string;
    country_code?: string;
    city?: string;
    rating?: number;
    is_verified?: boolean;
    logo_url?: string;
    catalog_count: number;
};

export type MarketplaceSupplierDetail = {
    profile: SupplierProfileData;
    catalog: CatalogProductData[];
    ratings: SupplierRatingData[];
};

export type MarketplaceCatalogProduct = CatalogProductData & {
    supplier_name: string;
    supplier_city: string;
    supplier_rating: number;
};

export type Order = {
    order_id: string;
    user_id: string;
    supplier_id: string;
    supplier_user_id?: string;
    is_connected: boolean;
    status: string;
    total_amount: number;
    notes?: string;
    expected_delivery?: string;
    received_items?: Record<string, number>;
    created_at: string;
    updated_at: string;
};

export type OrderWithDetails = Order & {
    supplier_name: string;
    items_count: number;
    items_preview?: string[];
};

export type OrderItem = {
    item_id: string;
    order_id: string;
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: any;
    mapped_product_id?: string;
};

export type OrderFull = Order & {
    supplier: any;
    items: OrderItem[];
};

export type SupplierOrderData = Order & {
    shopkeeper_name: string;
    shopkeeper_user_id: string;
    items_count: number;
    items: OrderItem[];
    items_preview?: string[];
};

export type SupplierDashboardData = {
    catalog_products: number;
    orders_by_status: Record<string, number>;
    total_orders: number;
    total_revenue: number;
    rating_average: number;
    rating_count: number;
    recent_orders: Order[];
    pending_action: number;
    revenue_this_month: number;
    avg_order_value: number;
    active_clients: number;
    top_products: { name: string; total_qty: number }[];
};

export type SupplierClientData = {
    id: string;
    name: string;
    latest_order_at?: string;
    total_orders: number;
};

export type MatchSuggestion = {
    catalog_id: string;
    catalog_name: string;
    catalog_category: string;
    catalog_subcategory: string;
    quantity: number;
    unit_price: number;
    matched_product_id: string | null;
    matched_product_name: string | null;
    confidence: number;
    reason: string;
    source: 'mapping' | 'gemini' | 'error' | 'none' | 'empty_inventory';
};

export type DeliveryMappingItem = {
    catalog_id: string;
    product_id?: string;
    create_new?: boolean;
};

export type AnalyticsFilterOption = {
    id: string;
    label: string;
    hint?: string;
};

export type AnalyticsPeriodOption = {
    label: string;
    days: number;
};

export type AnalyticsFilterMeta = {
    stores: AnalyticsFilterOption[];
    categories: AnalyticsFilterOption[];
    suppliers: AnalyticsFilterOption[];
    periods: AnalyticsPeriodOption[];
};

export type AnalyticsFilters = {
    days?: number;
    start_date?: string;
    end_date?: string;
    store_id?: string;
    category_id?: string;
    supplier_id?: string;
};

export type AnalyticsExecutiveOverview = {
    currency: string;
    days: number;
    scope_label?: string;
    summary: string;
    recommendations: string[];
    kpis: {
        revenue: number;
        previous_revenue: number;
        revenue_delta: number;
        gross_profit: number;
        previous_gross_profit: number;
        gross_profit_delta: number;
        sales_count: number;
        previous_sales_count: number;
        sales_count_delta: number;
        average_ticket: number;
        previous_average_ticket: number;
        average_ticket_delta: number;
        stock_value: number;
        stock_turnover_ratio: number;
        low_stock_count: number;
        out_of_stock_count: number;
        dormant_products_count: number;
        total_products: number;
    };
    top_products: {
        product_id: string;
        name: string;
        revenue: number;
        quantity: number;
        gross_profit: number;
    }[];
    top_categories: {
        category_id?: string;
        name: string;
        revenue: number;
        quantity: number;
        gross_profit: number;
    }[];
};

export type AnalyticsStoreComparisonRow = {
    store_id: string;
    store_name: string;
    address?: string;
    active: boolean;
    revenue: number;
    previous_revenue: number;
    revenue_delta: number;
    gross_profit: number;
    sales_count: number;
    previous_sales_count: number;
    sales_count_delta: number;
    average_ticket: number;
    stock_turnover_ratio: number;
    stock_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
    dormant_products_count: number;
    total_products: number;
};

export type AnalyticsStoreComparison = {
    currency: string;
    days: number;
    totals: {
        store_count: number;
        revenue: number;
        previous_revenue: number;
        revenue_delta: number;
        gross_profit: number;
        sales_count: number;
        average_ticket: number;
        stock_turnover_ratio: number;
        stock_value: number;
        low_stock_count: number;
        out_of_stock_count: number;
        dormant_products_count: number;
        total_products: number;
    };
    stores: AnalyticsStoreComparisonRow[];
};

export type AnalyticsStockProductRisk = {
    product_id: string;
    name: string;
    quantity: number;
    stock_value: number;
    store_id?: string;
    min_stock?: number;
    max_stock?: number;
    shortage?: number;
    overstock_units?: number;
    suggested_order?: number;
    expiry_date?: string;
};

export type AnalyticsStockHealth = {
    currency: string;
    days: number;
    kpis: {
        stock_value: number;
        stock_turnover_ratio: number;
        low_stock_count: number;
        out_of_stock_count: number;
        overstock_count: number;
        dormant_products_count: number;
        expiring_soon_count: number;
        total_products: number;
        replenishment_candidates_count: number;
    };
    critical_products: AnalyticsStockProductRisk[];
    overstock_products: AnalyticsStockProductRisk[];
    dormant_products: AnalyticsStockProductRisk[];
    expiring_products: AnalyticsStockProductRisk[];
    replenishment_candidates: AnalyticsStockProductRisk[];
};

export type AnalyticsStockAbcItem = {
    product_id: string;
    name: string;
    class: 'A' | 'B' | 'C';
    sales_count: number;
    revenue: number;
    quantity: number;
    unit: string;
    stock_value: number;
    share_of_revenue: number;
    gross_profit: number;
    recommendation: string;
};

export type AnalyticsStockAbc = {
    currency: string;
    days: number;
    totals: {
        revenue: number;
        product_count: number;
        class_a_count: number;
        class_b_count: number;
        class_c_count: number;
    };
    classes: {
        A: AnalyticsStockAbcItem[];
        B: AnalyticsStockAbcItem[];
        C: AnalyticsStockAbcItem[];
    };
};

export type AnalyticsKpiDetailColumn = {
    key: string;
    label: string;
};

export type AnalyticsKpiDetail = {
    title: string;
    description: string;
    export_name: string;
    columns: AnalyticsKpiDetailColumn[];
    rows: Record<string, any>[];
    total_rows: number;
};

export type AuthResponse = {
    access_token: string;
    refresh_token?: string;
    user: User;
};

export type VerificationStatus = {
    completed: boolean;
    user: User;
};

// ─── Production Types ───

export type RecipeIngredient = {
    product_id: string;
    name?: string;
    quantity: number;
    unit: string;
};

export type Recipe = {
    recipe_id: string;
    store_id?: string;
    name: string;
    category?: string;
    description?: string;
    recipe_type?: 'prep' | 'service';
    menu_product_id?: string;
    output_product_id?: string;
    output_quantity: number;
    output_unit: string;
    ingredients: RecipeIngredient[];
    prep_time_min: number;
    instructions?: string;
    waste_percent: number;
    labor_cost: number;
    energy_cost: number;
    computed_cost: number;
    total_cost: number;
    suggested_price: number;
    margin_percent: number;
    is_active: boolean;
    created_at: string;
};

export type ProductionOrder = {
    order_id: string;
    recipe_id: string;
    recipe_name: string;
    batch_multiplier: number;
    planned_output: number;
    actual_output?: number;
    output_unit: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    planned_date?: string;
    started_at?: string;
    completed_at?: string;
    total_material_cost: number;
    waste_quantity: number;
    notes?: string;
    created_at: string;
};

export type ProductionDashboard = {
    today_productions: number;
    month_productions: number;
    month_cost: number;
    waste_percent: number;
    active_recipes: number;
    in_progress: number;
};

type ProjectAllocatePayload = {
    product_id: string;
    quantity: number;
    corps_metier?: string;
};

type ProjectLaborPayload = {
    name: string;
    role?: string;
    days: number;
    daily_rate: number;
    corps_metier?: string;
};

type ProjectSituationPayload = {
    label: string;
    percent: number;
    amount: number;
    notes?: string;
};

type ProjectDevisPayload = {
    designation: string;
    lot?: string;
    unite?: string;
    quantity: number;
    unit_price: number;
};

type ProjectJournalPayload = {
    date: string;
    weather?: string;
    workers_count?: number;
    work_done?: string;
    materials_received?: string;
    incidents?: string;
    notes?: string;
};

type ProjectSubcontractorPayload = {
    name: string;
    corps_metier?: string;
    contact?: string;
    contract_amount?: number;
    notes?: string;
};

type ProjectSubcontractorPaymentPayload = {
    amount: number;
};

type ProjectPhasePayload = {
    name: string;
    corps_metier?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
};

export type ProjectMaterial = {
    material_id: string;
    allocation_id?: string;
    product_id: string;
    name: string;
    quantity: number;
    unit: string;
    unit_cost?: number;
    total_cost: number;
    corps_metier?: string;
    allocated_at: string;
};

export type ProjectLaborEntry = {
    labor_id: string;
    name: string;
    role?: string;
    days: number;
    daily_rate: number;
    total_cost: number;
    corps_metier?: string;
    created_at?: string;
};

export type ProjectSituation = {
    situation_id: string;
    label: string;
    percent: number;
    amount: number;
    notes?: string;
    date: string;
    paid?: boolean;
};

export type Project = {
    project_id: string;
    name: string;
    client_name?: string;
    client_phone?: string;
    address?: string;
    budget_estimate: number;
    description?: string;
    retention_percent?: number;
    actual_cost: number;
    status: string;
    materials_allocated: ProjectMaterial[];
    labor_entries: ProjectLaborEntry[];
    situations: ProjectSituation[];
    created_at?: string;
    updated_at?: string;
};

export type ProjectCreate = {
    name: string;
    client_name?: string;
    client_phone?: string;
    address?: string;
    budget_estimate?: number;
    description?: string;
    retention_percent?: number;
    status?: string;
};

export type ProjectDashboard = {
    active_projects: number;
    total_budget: number;
    total_actual: number;
    margin_percent: number;
};

// Ported services (Subset for the MVP)
export const auth = {
    login: (email: string, password: string) =>
        request<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password },
        }),
    me: () => request<User>('/auth/me'),
    updateProfile: (data: { name?: string; currency?: string; country_code?: string; business_type?: string }) =>
        request<any>('/auth/profile', { method: 'PUT', body: data }),
    changePassword: (data: { old_password: string; new_password: string }) =>
        request<{ message: string }>('/auth/change-password', { method: 'POST', body: data }),
    register: (data: {
        email: string; password: string; name: string;
        role: string; phone?: string; business_type?: string; how_did_you_hear?: string;
        plan?: 'starter' | 'pro' | 'enterprise';
        currency?: string;
        country_code?: string;
        signup_surface?: 'mobile' | 'web';
    }) => request<AuthResponse>('/auth/register', { method: 'POST', body: data }),
    socialLogin: (firebaseIdToken: string, signupSurface: 'mobile' | 'web' = 'web') =>
        request<AuthResponse>('/auth/verify-social', { method: 'POST', body: { firebase_id_token: firebaseIdToken, signup_surface: signupSurface } }),
    verifyEmail: (otp: string) =>
        request<{ message: string; user: User }>('/auth/verify-email', { method: 'POST', body: { otp } }),
    resendEmailOtp: () =>
        request<{ message: string; otp_fallback?: string }>('/auth/resend-email-otp', { method: 'POST' }),
    verificationStatus: () =>
        request<VerificationStatus>('/auth/verification-status'),
    logout: async () => {
        try {
            return await request<{ message: string }>('/auth/logout', { method: 'POST' });
        } finally {
            removeToken();
        }
    },
    deleteAccount: (password: string) => request<{ message: string }>('/profile', {
        method: 'DELETE',
        body: { password },
    }),
};

export const products = {
    list: (categoryId?: string, skip = 0, limit = 50, locationId?: string, isMenuItem?: boolean) => {
        const qs = new URLSearchParams();
        if (categoryId) qs.set('category_id', categoryId);
        if (locationId) qs.set('location_id', locationId);
        if (typeof isMenuItem === 'boolean') qs.set('is_menu_item', String(isMenuItem));
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/products?${qs.toString()}`);
    },
    get: (id: string) => request<any>(`/products/${id}`),
    create: (data: any) => request<any>('/products', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
    transferLocation: (id: string, data: { to_location_id?: string | null; note?: string | null }) =>
        request<any>(`/products/${id}/transfer-location`, { method: 'POST', body: data }),
    importParse: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return request<any>('/products/import/parse', { method: 'POST', body: formData });
    },
    importConfirm: (importData: any[], mapping: any) =>
        request<any>('/products/import/confirm', { method: 'POST', body: { importData, mapping } }),
    importText: (text: string, autoCreate = true) =>
        request<{ products?: any[]; created?: number; count?: number; auto_created?: boolean }>('/products/import/text', {
            method: 'POST',
            body: { text, auto_create: autoCreate },
        }),
    getPriceHistory: (id: string) => request<any[]>(`/products/${id}/price-history`),
    batchStockUpdate: (codes: string[], increment: number = 1) =>
        request<{ message: string; updated_count: number; not_found_count?: number; not_found?: string[] }>('/products/batch-stock-update', { method: 'POST', body: { codes, increment } }),
    getStats: (id: string) => request<any>(`/products/${id}/stats`),
};

export const projects = {
    list: () => request<Project[]>('/projects'),
    dashboard: () => request<ProjectDashboard>('/projects/dashboard'),
    create: (data: ProjectCreate) =>
        request<Project>('/projects', { method: 'POST', body: data }),
    update: (id: string, data: Partial<ProjectCreate>) =>
        request<Project>(`/projects/${id}`, { method: 'PUT', body: data }),
    complete: (id: string) =>
        request<Project>(`/projects/${id}/complete`, { method: 'POST' }),
    allocateMaterial: (projectId: string, data: ProjectAllocatePayload) =>
        request<Project>(`/projects/${projectId}/materials`, { method: 'POST', body: data }),
    addLabor: (projectId: string, data: ProjectLaborPayload) =>
        request<Project>(`/projects/${projectId}/labor`, { method: 'POST', body: data }),
    addSituation: (projectId: string, data: ProjectSituationPayload) =>
        request<Project>(`/projects/${projectId}/situations`, { method: 'POST', body: data }),
    addDevisItem: (projectId: string, data: ProjectDevisPayload) =>
        request<Project>(`/projects/${projectId}/devis`, { method: 'POST', body: data }),
    deleteDevisItem: (projectId: string, itemId: string) =>
        request<Project>(`/projects/${projectId}/devis/${itemId}`, { method: 'DELETE' }),
    addJournalEntry: (projectId: string, data: ProjectJournalPayload) =>
        request<Project>(`/projects/${projectId}/journal`, { method: 'POST', body: data }),
    addSubcontractor: (projectId: string, data: ProjectSubcontractorPayload) =>
        request<Project>(`/projects/${projectId}/subcontractors`, { method: 'POST', body: data }),
    paySubcontractor: (projectId: string, subId: string, data: ProjectSubcontractorPaymentPayload) =>
        request<Project>(`/projects/${projectId}/subcontractors/${subId}/payments`, { method: 'POST', body: data }),
    addPhase: (projectId: string, data: ProjectPhasePayload) =>
        request<Project>(`/projects/${projectId}/phases`, { method: 'POST', body: data }),
    updatePhase: (projectId: string, phaseId: string, data: Partial<ProjectPhasePayload>) =>
        request<Project>(`/projects/${projectId}/phases/${phaseId}`, { method: 'PUT', body: data }),
};

export const locations = {
    list: () => request<any[]>('/locations'),
    create: (data: { name: string; type?: string | null; parent_id?: string | null; is_active?: boolean }) => request<any>('/locations', { method: 'POST', body: data }),
    update: (id: string, data: { name?: string | null; type?: string | null; parent_id?: string | null; is_active?: boolean | null }) => request<any>(`/locations/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/locations/${id}`, { method: 'DELETE' }),
    generate: (data: {
        levels: Array<{
            type?: string | null;
            mode: 'range' | 'names';
            start?: number;
            end?: number;
            prefix?: string | null;
            suffix?: string | null;
            names?: string[];
        }>;
        root_parent_id?: string | null;
        reactivate_existing?: boolean;
    }) => request<{
        created_count: number;
        reused_count: number;
        total_count: number;
        levels_count: number;
        root_parent_id?: string | null;
    }>('/locations/generate', { method: 'POST', body: data }),
};

export const userFeatures = {
    get: () => request<UserFeatures>('/user/features'),
};

export const tables = {
    list: () => request<any[]>('/tables'),
    create: (data: { name: string; capacity: number }) => request<any>('/tables', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/tables/${id}`, { method: 'PUT', body: data }),
    act: (id: string, action: 'reserve' | 'seat' | 'clean' | 'free', data?: { covers?: number }) =>
        request<any>(`/tables/${id}/actions/${action}`, { method: 'POST', body: data || {} }),
    reserve: (id: string) => request<any>(`/tables/${id}/actions/reserve`, { method: 'POST', body: {} }),
    seat: (id: string, data?: { covers?: number }) => request<any>(`/tables/${id}/actions/seat`, { method: 'POST', body: data || {} }),
    clean: (id: string) => request<any>(`/tables/${id}/actions/clean`, { method: 'POST', body: {} }),
    free: (id: string) => request<any>(`/tables/${id}/actions/free`, { method: 'POST', body: {} }),
    delete: (id: string) => request<{ message: string }>(`/tables/${id}`, { method: 'DELETE' }),
};

export const reservations = {
    list: (date?: string) => request<any[]>(`/reservations${date ? `?date=${date}` : ''}`),
    create: (data: any) => request<any>('/reservations', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/reservations/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ message: string }>(`/reservations/${id}`, { method: 'DELETE' }),
    arrive: (id: string, tableId?: string) => request<any>(`/reservations/${id}/arrive`, { method: 'PUT', body: tableId ? { table_id: tableId } : {} }),
};

export const kitchen = {
    pending: (station?: string) => request<any[]>(`/kitchen/pending${station ? `?station=${station}` : ''}`),
    sendToKitchen: (saleId: string) => request<any>(`/sales/${saleId}/send-kitchen`, { method: 'POST' }),
    markItemReady: (saleId: string, itemIdx: number) => request<any>(`/kitchen/${saleId}/items/${itemIdx}/ready`, { method: 'PUT' }),
    serveOrder: (saleId: string) => request<any>(`/sales/${saleId}/serve`, { method: 'POST' }),
};

export const restaurantOrders = {
    getTableOrder: (tableId: string) => request<any>(`/tables/${tableId}/order`),
    openOrder: (data: { table_id?: string; covers?: number; items: any[]; notes?: string; service_type?: string }) =>
        request<any>('/sales', { method: 'POST', body: { ...data, status: 'open', payment_method: 'cash' } }),
    addItems: (saleId: string, items: any[]) => request<any>(`/sales/${saleId}/items`, { method: 'POST', body: { items } }),
    removeItem: (saleId: string, itemIdx: number) => request<any>(`/sales/${saleId}/items/${itemIdx}`, { method: 'DELETE' }),
    finalize: (saleId: string, data: { payment_method?: string; payments?: any[]; tip_amount?: number; discount_amount?: number; service_charge_percent?: number; covers?: number }) =>
        request<any>(`/sales/${saleId}/finalize`, { method: 'POST', body: data }),
    cancel: (saleId: string, reason?: string) =>
        request<any>(`/sales/${saleId}/cancel`, { method: 'POST', body: reason ? { reason } : {} }),
};

export const restaurant = {
    stats: () => request<{
        today_revenue: number;
        today_covers: number;
        avg_ticket: number;
        tables_total: number;
        tables_occupied: number;
        kitchen_pending: number;
        today_reservations: any[];
        hourly_revenue: { hour: number; revenue: number }[];
        top_dishes: { name: string; qty: number }[];
    }>('/restaurant/stats'),
};

export const production = {
    recipes: {
        list: () => request<Recipe[]>('/recipes'),
        get: (id: string) => request<Recipe>(`/recipes/${id}`),
        create: (data: any) => request<Recipe>('/recipes', { method: 'POST', body: data }),
        delete: (id: string) => request<{ message: string }>(`/recipes/${id}`, { method: 'DELETE' }),
    },
    orders: {
        list: (status?: string) => request<ProductionOrder[]>(`/production/orders${status ? `?status=${status}` : ''}`),
        create: (recipeId: string, batchMultiplier = 1, notes?: string) =>
            request<ProductionOrder>('/production/orders', { method: 'POST', body: { recipe_id: recipeId, batch_multiplier: batchMultiplier, notes } }),
        start: (id: string) => request<ProductionOrder>(`/production/orders/${id}/start`, { method: 'PUT' }),
        complete: (id: string, actualOutput: number, wasteQuantity = 0) =>
            request<ProductionOrder>(`/production/orders/${id}/complete`, { method: 'PUT', body: { actual_output: actualOutput, waste_quantity: wasteQuantity } }),
        cancel: (id: string) => request<ProductionOrder>(`/production/orders/${id}/cancel`, { method: 'PUT' }),
    },
    dashboard: () => request<ProductionDashboard>('/production/dashboard'),
};

export const catalog = {
    getSectors: () => request<any[]>('/catalog/sectors'),
    browse: (params: { sector?: string; search?: string; skip?: number; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params.sector) qs.set('sector', params.sector);
        if (params.search) qs.set('search', params.search);
        qs.set('skip', (params.skip || 0).toString());
        qs.set('limit', (params.limit || 50).toString());
        return request<any>(`/catalog/browse?${qs.toString()}`);
    },
    import: (catalogIds: string[]) =>
        request<any>('/catalog/import', { method: 'POST', body: { catalog_ids: catalogIds } }),
    importAll: (sector: string, countryCode: string) =>
        request<any>('/catalog/import-all', { method: 'POST', body: { sector, country_code: countryCode } }),
    lookupBarcode: (barcode: string) => request<any>(`/catalog/barcode/${barcode}`),
};

export const dashboard = {
    get: () => request<any>('/dashboard'),
};

export const analytics = {
    getFilterMeta: () => request<AnalyticsFilterMeta>('/analytics/filters/meta'),
    getExecutiveOverview: (filters: AnalyticsFilters = {}) => {
        const qs = new URLSearchParams();
        if (filters.days) qs.set('days', filters.days.toString());
        if (filters.start_date) qs.set('start_date', filters.start_date);
        if (filters.end_date) qs.set('end_date', filters.end_date);
        if (filters.store_id) qs.set('store_id', filters.store_id);
        if (filters.category_id) qs.set('category_id', filters.category_id);
        if (filters.supplier_id) qs.set('supplier_id', filters.supplier_id);
        return request<AnalyticsExecutiveOverview>(`/analytics/executive/overview?${qs.toString()}`);
    },
    getStoreComparison: (filters: AnalyticsFilters = {}) => {
        const qs = new URLSearchParams();
        if (filters.days) qs.set('days', filters.days.toString());
        if (filters.start_date) qs.set('start_date', filters.start_date);
        if (filters.end_date) qs.set('end_date', filters.end_date);
        if (filters.store_id) qs.set('store_id', filters.store_id);
        if (filters.category_id) qs.set('category_id', filters.category_id);
        if (filters.supplier_id) qs.set('supplier_id', filters.supplier_id);
        return request<AnalyticsStoreComparison>(`/analytics/stores/compare?${qs.toString()}`);
    },
    getStockHealth: (filters: AnalyticsFilters = {}) => {
        const qs = new URLSearchParams();
        if (filters.days) qs.set('days', filters.days.toString());
        if (filters.start_date) qs.set('start_date', filters.start_date);
        if (filters.end_date) qs.set('end_date', filters.end_date);
        if (filters.store_id) qs.set('store_id', filters.store_id);
        if (filters.category_id) qs.set('category_id', filters.category_id);
        if (filters.supplier_id) qs.set('supplier_id', filters.supplier_id);
        return request<AnalyticsStockHealth>(`/analytics/stock/health?${qs.toString()}`);
    },
    getStockAbc: (filters: AnalyticsFilters = {}) => {
        const qs = new URLSearchParams();
        if (filters.days) qs.set('days', filters.days.toString());
        if (filters.start_date) qs.set('start_date', filters.start_date);
        if (filters.end_date) qs.set('end_date', filters.end_date);
        if (filters.store_id) qs.set('store_id', filters.store_id);
        if (filters.category_id) qs.set('category_id', filters.category_id);
        if (filters.supplier_id) qs.set('supplier_id', filters.supplier_id);
        return request<AnalyticsStockAbc>(`/analytics/stock/abc?${qs.toString()}`);
    },
    getKpiDetails: (
        context: 'executive' | 'multi_stores' | 'stock_health',
        metric: string,
        filters: AnalyticsFilters = {},
    ) => {
        const qs = new URLSearchParams();
        qs.set('context', context);
        qs.set('metric', metric);
        if (filters.days) qs.set('days', filters.days.toString());
        if (filters.start_date) qs.set('start_date', filters.start_date);
        if (filters.end_date) qs.set('end_date', filters.end_date);
        if (filters.store_id) qs.set('store_id', filters.store_id);
        if (filters.category_id) qs.set('category_id', filters.category_id);
        if (filters.supplier_id) qs.set('supplier_id', filters.supplier_id);
        return request<AnalyticsKpiDetail>(`/analytics/kpi-details?${qs.toString()}`);
    },
};

export const stock = {
    getMovements: (
        productId?: string,
        days?: number,
        startDate?: string,
        endDate?: string,
        skip = 0,
        limit = 50,
        storeId?: string,
        categoryId?: string,
        supplierId?: string,
    ) => {
        const qs = new URLSearchParams();
        if (productId) qs.set('product_id', productId);
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        if (storeId) qs.set('store_id', storeId);
        if (categoryId) qs.set('category_id', categoryId);
        if (supplierId) qs.set('supplier_id', supplierId);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/stock/movements?${qs.toString()}`);
    },
    addMovement: (data: { product_id: string; type: 'in' | 'out'; quantity: number; reason?: string }) =>
        request<any>('/stock/movement', { method: 'POST', body: data }),
    reverseMovement: (movementId: string) =>
        request<any>(`/stock/movement/${movementId}/reverse`, { method: 'POST' }),
};

export const statistics = {
    get: (days?: number) => request<any>(`/statistics${days ? `?days=${days}` : ''}`),
};

export const inventory = {
    getTasks: (status: string = 'pending') => request<any[]>(`/inventory/tasks?status=${status}`),
    generateTasks: () => request<any>('/inventory/generate', { method: 'POST' }),
    submitResult: (taskId: string, count: number) => request<any>(`/inventory/tasks/${taskId}`, { method: 'PUT', body: { actual_quantity: count } }),
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
    cancel: (saleId: string, reason?: string) =>
        request<any>(`/sales/${saleId}/cancel`, { method: 'POST', body: reason ? { reason } : {} }),
    forecast: () => request<any>('/sales/forecast'),
    productForecast: (productId: string) => request<any>(`/sales/forecast/${productId}`),
};

export const accounting = {
    getStats: (days?: number, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        if (typeof days === 'number') qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<AccountingStats>(`/accounting/stats?${qs.toString()}`);
    },
    getGrandLivre: (days?: number, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<any>(`/grand-livre?${qs.toString()}`);
    },
    getSalesHistory: (days?: number, startDate?: string, endDate?: string, skip = 0, limit = 50, storeId?: string) => {
        const qs = new URLSearchParams();
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        if (storeId) qs.set('store_id', storeId);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<{ items: AccountingSaleHistoryItem[]; total: number }>(`/accounting/sales-history?${qs.toString()}`);
    },
    getInvoices: (days?: number, startDate?: string, endDate?: string, skip = 0, limit = 50, storeId?: string) => {
        const qs = new URLSearchParams();
        if (days) qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        if (storeId) qs.set('store_id', storeId);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<{ items: CustomerInvoice[]; total: number }>(`/invoices?${qs.toString()}`);
    },
    createInvoiceFromSale: (saleId: string) =>
        request<CustomerInvoice>(`/invoices/from-sale/${saleId}`, { method: 'POST' }),
    createFreeInvoice: (data: {
        customer_name?: string;
        customer_id?: string;
        items: { description: string; quantity: number; unit_price: number; tax_rate?: number }[];
        discount_amount?: number;
        payment_method?: string;
        payment_terms?: string;
        notes?: string;
    }) => request<CustomerInvoice>('/invoices/free', { method: 'POST', body: data }),
    getInvoice: (invoiceId: string) =>
        request<CustomerInvoice>(`/invoices/${invoiceId}`),
    getKpiDetails: (metric: string, days?: number, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        qs.set('metric', metric);
        if (typeof days === 'number') qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<AnalyticsKpiDetail>(`/accounting/kpi-details?${qs.toString()}`);
    },
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
    update: (id: string, data: { category: string; amount: number; description?: string }) =>
        request<any>(`/expenses/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/expenses/${id}`, { method: 'DELETE' }),
};

export const customers = {
    list: (skip = 0, limit = 50, sortBy = 'name') => request<any>(`/customers?skip=${skip}&limit=${limit}&sort_by=${sortBy}`),
    get: (id: string) => request<any>(`/customers/${id}`),
    getSales: (id: string) => request<any>(`/customers/${id}/sales`),
    getBirthdays: (days = 7) => request<any[]>(`/customers/birthdays?days=${days}`),
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
    getDebts: (id: string) => request<any>(`/customers/${id}/debt-history`),
    addDebt: (id: string, data: { amount: number; is_payment: boolean; description?: string }) =>
        request<any>(`/customers/${id}/payments`, {
            method: 'POST',
            body: {
                amount: data.amount,
                notes: data.description,
            }
        }),
    cancelPayment: (customerId: string, paymentId: string) =>
        request<any>(`/customers/${customerId}/payments/${paymentId}`, { method: 'DELETE' }),
};

export const promotions = {
    list: () => request<Promotion[]>('/promotions'),
    create: (data: Partial<Promotion>) => request<Promotion>('/promotions', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Promotion>) => request<Promotion>(`/promotions/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ message: string }>(`/promotions/${id}`, { method: 'DELETE' }),
};

export type Promotion = {
    promotion_id: string;
    title: string;
    description: string;
    discount_percentage?: number;
    points_required?: number;
    target_tier?: string;
    is_active: boolean;
};

export const crmAnalytics = {
    getOverview: (days?: number, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        if (typeof days === 'number') qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<CrmAnalyticsOverview>(`/analytics/crm/overview?${qs.toString()}`);
    },
    getKpiDetails: (metric: string, days?: number, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        qs.set('metric', metric);
        if (typeof days === 'number') qs.set('days', days.toString());
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<AnalyticsKpiDetail>(`/analytics/crm/kpi-details?${qs.toString()}`);
    },
};

export const suppliers = {
    list: () => request<any[]>('/suppliers'),
    get: (id: string) => request<any>(`/suppliers/${id}`),
    create: (data: any) => request<any>('/suppliers', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/suppliers/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/suppliers/${id}`, { method: 'DELETE' }),
    getProducts: (id: string) => request<SupplierProductLink[]>(`/suppliers/${id}/products`),
    getStats: (id: string) => request<SupplierStats>(`/suppliers/${id}/stats`),
    getPriceHistory: (id: string) => request<SupplierPriceHistoryItem[]>(`/suppliers/${id}/price-history`),
    getInvoices: (id: string) => request<SupplierInvoice[]>(`/suppliers/${id}/invoices`),
    createInvoice: (id: string, data: Partial<SupplierInvoice>) =>
        request<SupplierInvoice>(`/suppliers/${id}/invoices`, { method: 'POST', body: data }),
    getLogs: (id: string) => request<SupplierCommunicationLog[]>(`/suppliers/${id}/logs`),
    createLog: (id: string, data: SupplierLogCreate) =>
        request<SupplierCommunicationLog>(`/suppliers/${id}/logs`, { method: 'POST', body: data }),
    getInvitationLink: (id: string) =>
        request<{ link: string }>(`/suppliers/${id}/invitation-link`),
    resendInvitation: (id: string) =>
        request<{ message: string }>(`/suppliers/${id}/resend-invitation`, { method: 'POST' }),
};

export const procurementAnalytics = {
    getOverview: (filtersOrDays: number | AnalyticsFilters = 90) => {
        const qs = new URLSearchParams();
        if (typeof filtersOrDays === 'number') {
            qs.set('days', filtersOrDays.toString());
        } else {
            if (typeof filtersOrDays.days === 'number') qs.set('days', filtersOrDays.days.toString());
            if (filtersOrDays.start_date) qs.set('start_date', filtersOrDays.start_date);
            if (filtersOrDays.end_date) qs.set('end_date', filtersOrDays.end_date);
            if (filtersOrDays.store_id) qs.set('store_id', filtersOrDays.store_id);
            if (filtersOrDays.supplier_id) qs.set('supplier_id', filtersOrDays.supplier_id);
        }
        if (!qs.has('days') && !qs.has('start_date') && !qs.has('end_date')) {
            qs.set('days', '90');
        }
        return request<ProcurementOverview>(`/analytics/procurement/overview?${qs.toString()}`);
    },
};

export const supplierProducts = {
    list: (productId?: string) => {
        const qs = new URLSearchParams();
        if (productId) qs.set('product_id', productId);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<SupplierProduct[]>(`/supplier-products${suffix}`);
    },
    link: (data: SupplierProductCreate) =>
        request<SupplierProduct>('/supplier-products', { method: 'POST', body: data }),
    update: (linkId: string, data: SupplierProductUpdate) =>
        request<SupplierProduct>(`/supplier-products/${linkId}`, { method: 'PUT', body: data }),
    unlink: (linkId: string) =>
        request<{ message: string }>(`/supplier-products/${linkId}`, { method: 'DELETE' }),
};

export const supplier_orders = {
    list: (status?: string, supplierId?: string, startDate?: string, endDate?: string, skip = 0, limit = 50) => {
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        if (supplierId) qs.set('supplier_id', supplierId);
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        qs.set('skip', skip.toString());
        qs.set('limit', limit.toString());
        return request<any>(`/orders?${qs.toString()}`);
    },
    get: (id: string) => request<OrderFull>(`/orders/${id}`),
    create: (data: { supplier_id: string; supplier_user_id?: string; items: any[]; notes?: string; expected_delivery?: string }) =>
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
            headers: { 'X-Idempotency-Key': generateIdempotencyKey() }
        }),
    getFilterSuppliers: () => request<any[]>('/orders/filter-suppliers'),
    suggestMatches: (orderId: string) =>
        request<{ suggestions: MatchSuggestion[] }>(`/orders/${orderId}/suggest-matches`, { method: 'POST' }),
    confirmDelivery: (orderId: string, mappings: DeliveryMappingItem[]) =>
        request<{ message: string; results: any[] }>(`/orders/${orderId}/confirm-delivery`, { method: 'POST', body: { mappings } }),
    mapProduct: (catalogId: string, productId: string) =>
        request<{ message: string }>('/orders/map-product', { method: 'POST', body: { catalog_id: catalogId, product_id: productId } }),
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
    get: () => request<UserSettings>('/settings'),
    update: (data: Partial<UserSettings> & Record<string, any>) =>
        request<UserSettings>('/settings', { method: 'PUT', body: data }),
};

// Marketplace
export const marketplace = {
    searchSuppliers: (params?: { q?: string; category?: string; city?: string; country_code?: string; min_rating?: number; verified_only?: boolean }) => {
        const qs = new URLSearchParams();
        if (params?.q) qs.append('q', params.q);
        if (params?.category) qs.append('category', params.category);
        if (params?.city) qs.append('city', params.city);
        if (params?.country_code) qs.append('country_code', params.country_code);
        if (params?.min_rating) qs.append('min_rating', params.min_rating.toString());
        if (params?.verified_only) qs.append('verified_only', 'true');
        return request<MarketplaceSupplier[]>(`/marketplace/suppliers?${qs.toString()}`);
    },
    getSupplier: (supplierUserId: string) => request<MarketplaceSupplierDetail>(`/marketplace/suppliers/${supplierUserId}`),
    connectSupplier: (supplierUserId: string) =>
        request<any>(`/marketplace/suppliers/${supplierUserId}/connect`, { method: 'POST' }),
    searchProducts: (params?: { q?: string; category?: string; price_min?: number; price_max?: number; min_supplier_rating?: number }) => {
        const qs = new URLSearchParams();
        if (params?.q) qs.append('q', params.q || '');
        if (params?.category) qs.append('category', params.category);
        if (params?.price_min) qs.append('price_min', params.price_min.toString());
        if (params?.price_max) qs.append('price_max', params.price_max.toString());
        if (params?.min_supplier_rating) qs.append('min_supplier_rating', params.min_supplier_rating.toString());
        return request<MarketplaceCatalogProduct[]>(`/marketplace/search-products?${qs.toString()}`);
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
    suggestCategory: (name: string, lang: string = 'fr') =>
        request<{ category: string; subcategory: string }>('/ai/suggest-category', {
            method: 'POST',
            body: { product_name: name, language: lang },
        }),
    generateDescription: (name: string, category?: string, subcategory?: string, lang: string = 'fr') =>
        request<{ description: string }>('/ai/generate-description', {
            method: 'POST',
            body: { product_name: name, category, subcategory, language: lang },
        }),
    suggestPrice: (productId: string, lang: string = 'fr') =>
        request<{ suggested_price: number; reasoning: string }>('/ai/suggest-price', {
            method: 'POST',
            body: { product_id: productId, language: lang },
        }),
    basketSuggestions: (productIds: string[]) =>
        request<{ suggestions: any[] }>('/ai/basket-suggestions', {
            method: 'POST',
            body: { product_ids: productIds },
        }),
    scanInvoice: (base64: string, lang: string = 'fr') =>
        request<any>('/ai/scan-invoice', {
            method: 'POST',
            body: { image: base64, language: lang },
        }),
    detectAnomalies: (language: string = 'fr') =>
        request<{ anomalies: any[] }>(`/ai/detect-anomalies?lang=${language}`),
    support: (message: string, history: any[], language: string = 'fr') =>
        request<{ response: string }>('/ai/support', {
            method: 'POST',
            body: { message, history, language, platform: 'web' },
        }),
    plAnalysis: (lang: string = 'fr', days: number = 30) =>
        request<{ analysis: string; kpis: any }>(`/ai/pl-analysis?lang=${lang}&days=${days}`),
    churnPrediction: (lang: string = 'fr') =>
        request<{ at_risk: any[]; total_at_risk: number; summary: string }>(`/ai/churn-prediction?lang=${lang}`),
    monthlyReport: (lang: string = 'fr') =>
        request<{ report: string; generated_at: string }>(`/ai/monthly-report?lang=${lang}`),
    replenishmentAdvice: (lang: string = 'fr') =>
        request<{ advice: string; priority_count: number }>(`/ai/replenishment-advice?lang=${lang}`),
    // Vague 1 — algorithmic features
    businessHealthScore: (params?: {
        days?: number;
        start_date?: string;
        end_date?: string;
        store_id?: string;
        category_id?: string;
        supplier_id?: string;
    }) =>
        request<{
            score: number;
            color: string;
            components: { margin: number; rotation: number; debt_recovery: number; trend: number };
            details: any;
        }>('/ai/business-health-score', { params }),
    dashboardPrediction: (params?: {
        store_id?: string;
        category_id?: string;
        supplier_id?: string;
    }) =>
        request<{
            projected_revenue: number;
            current_revenue: number;
            days_elapsed: number;
            days_in_month: number;
            delta_vs_last_month: number;
            confidence: string;
            method: string;
        }>('/ai/dashboard-prediction', { params }),
    salesForecast: (days: number = 7) =>
        request<{
            forecasts: Array<{
                product_id: string;
                name: string;
                current_stock: number;
                velocity_per_day: number;
                trend_coefficient: number;
                forecast_7d: number;
                forecast_30d: number;
                stock_covers_days: number | null;
                alert: string | null;
            }>;
            period_days: number;
        }>(`/ai/sales-forecast?days=${days}`),
    deadstockAnalysis: () =>
        request<any>('/ai/deadstock-analysis'),
    // Vague 2 — intelligence stock
    seasonalityAlerts: () =>
        request<any>('/ai/seasonality-alerts'),
    shrinkageAnalysis: (items: Array<{ product_id: string; counted_quantity: number }>) =>
        request<any>('/ai/shrinkage-analysis', {
            method: 'POST',
            body: { items },
        }),
    detectDuplicates: (target: 'products' | 'suppliers' = 'products', threshold: number = 0.7) =>
        request<any>('/ai/detect-duplicates', {
            method: 'POST',
            body: { target, threshold },
        }),
    resolveDuplicate: (target: 'products' | 'suppliers', itemAId: string, itemBId: string, status: 'ignored' | 'different') =>
        request<any>('/ai/duplicates/resolutions', {
            method: 'POST',
            body: {
                target,
                item_a_id: itemAId,
                item_b_id: itemBId,
                status,
            },
        }),
    supplierRating: (supplierId: string) =>
        request<any>(`/ai/supplier-rating/${supplierId}`),
    optimalOrderDay: (supplierId: string) =>
        request<any>(`/ai/optimal-order-day/${supplierId}`),
    autoDraftOrders: (coverageDays: number = 14) =>
        request<any>('/ai/auto-draft-orders', {
            method: 'POST',
            body: { coverage_days: coverageDays },
        }),
    // Vague 6
    contextualTips: () =>
        request<any>('/ai/contextual-tips'),
    categorizeExpense: (description: string, amount?: number) =>
        request<any>('/ai/categorize-expense', {
            method: 'POST',
            body: { description, amount: amount ?? 0 },
        }),
    // Vague 5
    productCorrelations: (minSupport?: number) =>
        request<any>(`/ai/product-correlations${minSupport ? `?min_support=${minSupport}` : ''}`),
    // Vague 4
    rebalanceSuggestions: () =>
        request<any>('/ai/rebalance-suggestions'),
    storeBenchmark: () =>
        request<any>('/ai/store-benchmark'),
    // Vague 7
    customerSummary: (customerId: string, lang?: string) =>
        request<any>(`/ai/customer-summary/${customerId}${lang ? `?lang=${lang}` : ''}`),
    generateCustomerMessage: (customerId: string, messageType: string, lang?: string, context?: string) =>
        request<any>('/ai/generate-customer-message', { method: 'POST', body: { customer_id: customerId, message_type: messageType, lang: lang ?? 'fr', context: context ?? '' } }),
    naturalQuery: (query: string, storeId?: string) =>
        request<any>('/ai/natural-query', { method: 'POST', body: { query, store_id: storeId } }),
    voiceToCart: (audioBase64: string, lang?: string, storeId?: string) =>
        request<any>('/ai/voice-to-cart', { method: 'POST', body: { audio_base64: audioBase64, lang: lang ?? 'fr', store_id: storeId } }),
};

export const returns = {
    list: () => request<any>('/returns'),
    get: (id: string) => request<any>(`/returns/${id}`),
    create: (data: any) => request<any>('/returns', { method: 'POST', body: data }),
    complete: (id: string) => request<any>(`/returns/${id}/complete`, { method: 'PUT' }),
};

export const creditNotes = {
    list: () => request<any>('/credit-notes'),
    get: (id: string) => request<any>(`/credit-notes/${id}`),
};

export const subUsers = {
    list: () => request<User[]>('/sub-users'),
    create: (data: Partial<User> & { password?: string }) => request<User>('/sub-users', { method: 'POST', body: data }),
    update: (id: string, data: Partial<User>) => request<User>(`/sub-users/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/sub-users/${id}`, { method: 'DELETE' }),
};

export const alertRules = {
    list: () => request<AlertRule[]>('/alert-rules'),
    create: (data: AlertRuleCreate) => request<AlertRule>('/alert-rules', { method: 'POST', body: data }),
    update: (id: string, data: AlertRuleCreate) => request<AlertRule>(`/alert-rules/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<any>(`/alert-rules/${id}`, { method: 'DELETE' }),
};

export const pricing = {
    getPublic: (countryCode?: string, currency?: string) => {
        const qs = new URLSearchParams();
        if (countryCode) qs.set('country_code', countryCode);
        if (currency) qs.set('currency', currency);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return request<PricingPublicResponse>(`/pricing/public${suffix}`);
    },
};

export const subscription = {
    getDetails: () => request<SubscriptionData>('/subscription/me'),
    sync: () => request<{ plan: string; status: string }>('/subscription/sync', { method: 'POST' }),
    checkout: (plan: string) => request<{ payment_url: string; transaction_id: string }>(`/billing/checkout?plan=${plan}`, { method: 'POST' }),
    stripeCheckout: (plan: string) => request<{ checkout_url: string; session_id: string }>(`/billing/stripe-checkout?plan=${plan}`, { method: 'POST' }),
};

function detectCountryCode(): string | undefined {
    try {
        const locale = navigator.language || '';
        // e.g. "fr-FR" → "FR", "en-US" → "US"
        const parts = locale.split('-');
        if (parts.length >= 2) return parts[parts.length - 1].toUpperCase();
    } catch {}
    return undefined;
}

export const demo = {
    createSession: (demoType: string, countryCode?: string) =>
        request<DemoSessionResponse>('/demo/session', { method: 'POST', body: { demo_type: demoType, country_code: countryCode ?? detectCountryCode() } }),
    getCurrentSession: () => request<DemoSessionInfo>('/demo/session/me'),
    captureContact: (email: string) =>
        request<DemoSessionInfo>('/demo/session/contact', { method: 'POST', body: { email } }),
};

export const stores = {
    list: () => request<Store[]>('/stores'),
    create: (data: { name: string; address?: string }) =>
        request<Store>('/stores', { method: 'POST', body: data }),
    update: (id: string, data: {
        name?: string;
        address?: string;
        currency?: string;
        store_notification_contacts?: NotificationContactMap;
        receipt_business_name?: string;
        receipt_footer?: string;
        invoice_business_name?: string;
        invoice_business_address?: string;
        invoice_label?: string;
        invoice_prefix?: string;
        invoice_footer?: string;
        invoice_payment_terms?: string;
        terminals?: string[];
    }) =>
        request<Store>(`/stores/${id}`, { method: 'PUT', body: data }),
    setActive: (storeId: string) =>
        request<any>('/auth/active-store', { method: 'PUT', body: { store_id: storeId } }),
    getConsolidatedStats: (days = 30) =>
        request<any>(`/stores/consolidated-stats?days=${days}`),
    transferStock: (data: { product_id: string; from_store_id: string; to_store_id: string; quantity: number; note?: string }) =>
        request<any>('/stock/transfer', { method: 'POST', body: data }),
    reverseTransfer: (data: { product_id: string; from_store_id: string; to_store_id: string; quantity: number; note?: string }) =>
        request<any>('/stock/transfer/reverse', { method: 'POST', body: data }),
    getTransfers: (skip = 0, limit = 50) =>
        request<{ items: any[]; total: number }>(`/stock/transfers?skip=${skip}&limit=${limit}`),
};

function toQueryString(params?: Record<string, unknown>) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        query.set(key, String(value));
    });
    return query.toString();
}

// User support tickets
export const support = {
    createTicket: (subject: string, message: string) =>
        request<any>('/support/tickets', { method: 'POST', body: { subject, message } }),
    getMyTickets: () => request<any[]>('/support/tickets/mine'),
    replyTicket: (ticketId: string, content: string) =>
        request<any>(`/support/tickets/${ticketId}/reply`, { method: 'POST', body: { content } }),
};

// User disputes
export const disputes = {
    create: (data: { subject: string; description: string; type: string; against_user_id?: string }) =>
        request<any>('/disputes', { method: 'POST', body: data }),
    getMine: () => request<any[]>('/disputes/mine'),
};

// User notifications
export const userNotifications = {
    list: (skip = 0, limit = 20) =>
        request<{ items: any[]; total: number; unread: number }>(`/user/notifications?skip=${skip}&limit=${limit}`),
    markRead: (messageId: string) =>
        request<any>(`/user/notifications/${messageId}/read`, { method: 'POST' }),
    markAllRead: () =>
        request<any>('/user/notifications/read-all', { method: 'POST' }),
};

// Legal (public, unauthenticated)
export const legal = {
    getCGU: (lang = 'fr') => request<{ content: string; updated_at?: string }>(`/cgu?lang=${encodeURIComponent(lang)}`),
    getPrivacy: (lang = 'fr') => request<{ content: string; updated_at?: string }>(`/privacy?lang=${encodeURIComponent(lang)}`),
};

export const admin = {
    getHealth: () => request<any>('/admin/health'),
    getGlobalStats: () => request<any>('/admin/stats'),
    getDetailedStats: () => request<any>('/admin/stats/detailed'),
    getOnboardingStats: (days = 30) => request<any>(`/admin/stats/onboarding?days=${days}`),
    getOtpStats: (days = 30) => request<any>(`/admin/stats/otp?days=${days}`),
    getEnterpriseSignupStats: (days = 30) => request<any>(`/admin/stats/enterprise-signups?days=${days}`),
    getConversionStats: () => request<any>('/admin/stats/conversion'),
    getSubscriptionsOverview: (days = 30) => request<any>(`/admin/subscriptions/overview?days=${days}`),
    getDemoSessionsOverview: (days = 30) => request<any>(`/admin/demo-sessions/overview?days=${days}`),
    listDemoSessions: (params?: { search?: string; status?: string; demo_type?: string; surface?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
        return request<{ items: any[]; total: number }>(`/admin/demo-sessions${query ? `?${query}` : ''}`);
    },
    listSubscriptionAccounts: (params?: { search?: string; status?: string; plan?: string; provider?: string; country_code?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
        return request<{ items: any[]; total: number }>(`/admin/subscriptions/accounts${query ? `?${query}` : ''}`);
    },
    listSubscriptionEvents: (params?: { provider?: string; event_type?: string; source?: string; account_id?: string; status?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
        return request<{ items: any[]; total: number }>(`/admin/subscriptions/events${query ? `?${query}` : ''}`);
    },
    getSubscriptionAlerts: () => request<any>('/admin/subscriptions/alerts'),
    grantSubscriptionGrace: (accountId: string, days = 7, note?: string) => request<any>(`/admin/subscriptions/${accountId}/grace?days=${days}`, { method: 'POST', body: { note } }),
    enableSubscriptionReadOnly: (accountId: string, note?: string) => request<any>(`/admin/subscriptions/${accountId}/read-only?enabled=true`, { method: 'POST', body: { note } }),
    disableSubscriptionReadOnly: (accountId: string, note?: string) => request<any>(`/admin/subscriptions/${accountId}/read-only?enabled=false`, { method: 'POST', body: { note } }),
    regenerateSubscriptionLinks: (accountId: string) => request<any>(`/admin/subscriptions/${accountId}/payment-links`, { method: 'POST' }),
    sendSubscriptionReminder: (accountId: string, daysLeft = 1) =>
        request<any>(`/admin/subscriptions/${accountId}/send-reminder?days_left=${daysLeft}`, { method: 'POST' }),
    listVerificationEvents: (params?: { type?: string; provider?: string; channel?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
        return request<{ items: any[]; total: number }>(`/admin/verification-events${query ? `?${query}` : ''}`);
    },
    listUsers: (skip = 0, limit = 100) => request<any[]>(`/admin/users?skip=${skip}&limit=${limit}`),
    listStores: (skip = 0, limit = 50) => request<any>(`/admin/stores?skip=${skip}&limit=${limit}`),
    listAllProducts: (params?: { category_id?: string; min_stock?: number; store_id?: string; owner_user_id?: string; business_sector?: string; is_active?: boolean; search?: string; skip?: number; limit?: number }) => {
        const qs = toQueryString(params as Record<string, unknown> | undefined);
        return request<any>(`/admin/products${qs ? `?${qs}` : ''}`);
    },
    getCatalogStats: () => request<any>('/admin/catalog/stats'),
    listCatalogProducts: (params?: { sector?: string; country?: string; verified?: boolean; search?: string; publication_status?: string; assistant_bucket?: string; tag?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
        return request<{ products: any[]; total: number }>(`/admin/catalog/products${query ? `?${query}` : ''}`);
    },
    getCatalogAssistant: (catalogId?: string) =>
        request<any>(`/admin/catalog/assistant${catalogId ? `?catalog_id=${encodeURIComponent(catalogId)}` : ''}`),
    createCatalogProduct: (data: {
        display_name?: string;
        category?: string;
        sector?: string;
        barcodes?: string[];
        aliases?: string[];
        country_codes?: string[];
        image_url?: string;
        unit?: string;
        tags?: string[];
        supplier_suggestions?: string[];
        marketplace_matches?: string[];
        publication_status?: string;
        notes?: string;
        reference_price?: number;
        sale_price?: number;
        supplier_hint?: string;
        verified?: boolean;
        added_by_count?: number;
    }) => request<any>('/admin/catalog/products', { method: 'POST', body: data }),
    bulkUpsertCatalogProducts: (rows: any[]) =>
        request<any>('/admin/catalog/products/bulk', { method: 'POST', body: { rows } }),
    updateCatalogProduct: (catalogId: string, data: {
        display_name?: string;
        category?: string;
        sector?: string;
        barcodes?: string[];
        aliases?: string[];
        country_codes?: string[];
        image_url?: string;
        unit?: string;
        tags?: string[];
        supplier_suggestions?: string[];
        marketplace_matches?: string[];
        publication_status?: string;
        notes?: string;
        reference_price?: number;
        sale_price?: number;
        supplier_hint?: string;
        verified?: boolean;
        added_by_count?: number;
    }) => request<any>(`/admin/catalog/${catalogId}`, { method: 'PUT', body: data }),
    bulkUpdateCatalogProducts: (catalogIds: string[], updates: any) =>
        request<any>('/admin/catalog/bulk', { method: 'PUT', body: { catalog_ids: catalogIds, updates } }),
    duplicateCatalogProduct: (catalogId: string) =>
        request<any>('/admin/catalog/duplicate', { method: 'POST', body: { catalog_id: catalogId } }),
    verifyCatalogProduct: (catalogId: string) => request<any>(`/admin/catalog/${catalogId}/verify`, { method: 'PUT' }),
    mergeCatalogProducts: (keepId: string, mergeIds: string[]) =>
        request<any>('/admin/catalog/merge', { method: 'POST', body: { keep_id: keepId, merge_ids: mergeIds } }),
    deleteCatalogProduct: (catalogId: string) => request<any>(`/admin/catalog/${catalogId}`, { method: 'DELETE' }),
    bulkDeleteCatalogProducts: (catalogIds: string[]) =>
        request<any>('/admin/catalog/bulk-delete', { method: 'POST', body: { catalog_ids: catalogIds } }),
    toggleUser: (id: string) => request<any>(`/admin/users/${id}/toggle`, { method: 'PUT' }),
    deleteUser: (email: string) => request<any>(`/admin/users?email=${encodeURIComponent(email)}`, { method: 'DELETE' }),
    setUserPlan: (userId: string, plan: string) => request<any>(`/admin/set-plan?user_id=${encodeURIComponent(userId)}&plan=${encodeURIComponent(plan)}`, { method: 'POST' }),
    bulkSetUserPlan: (userIds: string[], plan: string) => request<any>('/admin/users/bulk-plan', { method: 'POST', body: { user_ids: userIds, plan } }),
    updateUserNote: (userId: string, note: string) => request<any>(`/admin/users/${userId}/note`, { method: 'PUT', body: { note } }),
    getUserDetail: (userId: string) => request<any>(`/admin/users/${userId}/detail`),
    setFeatureFlags: (userId: string, flags: Record<string, boolean>) => request<any>(`/admin/users/${userId}/feature-flags`, { method: 'PUT', body: { flags } }),
    setCustomLimits: (userId: string, limits: Record<string, number>) => request<any>(`/admin/users/${userId}/custom-limits`, { method: 'PUT', body: { limits } }),
    toggleProduct: (id: string) => request<any>(`/admin/products/${id}/toggle`, { method: 'PUT' }),
    deleteProduct: (id: string) => request<any>(`/admin/products/${id}`, { method: 'DELETE' }),
    listTickets: (status?: string) => request<any[]>(`/admin/support/tickets${status ? `?status=${status}` : ''}`),
    replyTicket: (id: string, content: string) => request<any>(`/admin/support/tickets/${id}/reply`, { method: 'POST', body: { content } }),
    closeTicket: (id: string) => request<any>(`/admin/support/tickets/${id}/close`, { method: 'POST' }),
    listLogs: (module?: string, skip = 0, limit = 100) => request<any[]>(`/admin/logs?${module ? `module=${module}&` : ''}skip=${skip}&limit=${limit}`),
    getUserLogs: (userId: string, limit = 50) => request<any[]>(`/admin/logs?user_id=${encodeURIComponent(userId)}&limit=${limit}`),
    getMrrStats: (months = 12) => request<any>(`/admin/stats/mrr?months=${months}`),
    getRetentionStats: (months = 12) => request<any>(`/admin/stats/retention?months=${months}`),
    getCatalogAdoption: (limit = 50) => request<any[]>(`/admin/stats/catalog-adoption?limit=${limit}`),
    getApiHealth: (days = 7) => request<any>(`/admin/stats/api-health?days=${days}`),
    // Disputes
    listDisputes: (params?: { status?: string; type?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
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
    listMessages: (type?: string, skip = 0, limit = 50) => {
        const params = type ? `type=${type}&skip=${skip}&limit=${limit}` : `skip=${skip}&limit=${limit}`;
        return request<{ items: any[]; total: number }>(`/admin/messages?${params}`);
    },
    getCGU: (lang = 'fr') => request<{ content: string; updated_at?: string }>(`/cgu?lang=${encodeURIComponent(lang)}`),
    getPrivacy: (lang = 'fr') => request<{ content: string; updated_at?: string }>(`/privacy?lang=${encodeURIComponent(lang)}`),
    updateCGU: (content: string) => request<{ message: string }>('/admin/cgu', { method: 'POST', body: { content } }),
    updatePrivacy: (content: string) => request<{ message: string }>('/admin/privacy', { method: 'POST', body: { content } }),
    getLeads: () => request<{ contacts: any[]; subscribers: any[] }>('/public/leads'),
    // AI Usage
    getAiUsageStats: (days = 30) => request<any>(`/admin/ai-usage-stats?days=${days}`),
    getAiUsageDetail: (params?: { days?: number; feature?: string; plan?: string; owner_id?: string; skip?: number; limit?: number }) => {
        const query = toQueryString(params as Record<string, unknown> | undefined);
        return request<any>(`/admin/ai-usage-detail?${query}`);
    },
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

export const supplierProfile = {
    get: () => request<SupplierProfileData>('/supplier/profile'),
    create: (data: {
        company_name: string;
        description?: string;
        phone?: string;
        address?: string;
        city?: string;
        categories?: string[];
        delivery_zones?: string[];
        min_order_amount?: number;
        average_delivery_days?: number;
    }) => request<SupplierProfileData>('/supplier/profile', { method: 'POST', body: data }),
    update: (data: {
        company_name: string;
        description?: string;
        phone?: string;
        address?: string;
        city?: string;
        categories?: string[];
        delivery_zones?: string[];
        min_order_amount?: number;
        average_delivery_days?: number;
    }) => request<SupplierProfileData>('/supplier/profile', { method: 'PUT', body: data }),
};

export const supplierDashboard = {
    get: () => request<SupplierDashboardData>('/supplier/dashboard'),
    getRatings: () => request<SupplierRatingData[]>('/supplier/ratings'),
};

export const supplierOrders = {
    list: (status?: string, shopkeeperUserId?: string, startDate?: string, endDate?: string) => {
        const qs = new URLSearchParams();
        if (status) qs.set('status', status);
        if (shopkeeperUserId) qs.set('shopkeeper_user_id', shopkeeperUserId);
        if (startDate) qs.set('start_date', startDate);
        if (endDate) qs.set('end_date', endDate);
        return request<SupplierOrderData[]>(`/supplier/orders?${qs.toString()}`);
    },
    getClients: () => request<SupplierClientData[]>('/supplier/clients'),
    updateStatus: (id: string, status: string) => request<any>(`/supplier/orders/${id}/status`, { method: 'PUT', body: { status } }),
};

export const supplierCatalog = {
    list: () => request<CatalogProductData[]>('/supplier/catalog'),
    create: (data: CatalogProductCreate) => request<CatalogProductData>('/supplier/catalog', { method: 'POST', body: data }),
    update: (id: string, data: CatalogProductCreate) => request<CatalogProductData>(`/supplier/catalog/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => request<{ message: string }>(`/supplier/catalog/${id}`, { method: 'DELETE' }),
};
