import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { cache, KEYS } from './cache';
import NetInfo from '@react-native-community/netinfo';
import { SyncAction, syncService } from './sync';

import Constants from 'expo-constants';

const getApiUrl = () => {
  // 1. If explicitly set in environment, always use it (prod builds via eas.json)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Extra config (from app.json)
  if (Constants.expoConfig?.extra?.apiUrl) {
    return Constants.expoConfig.extra.apiUrl;
  }

  // 3. In development, use the host URI from Expo Go / Dev Client
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      const url = `http://${ip}:8000`;
      return url;
    }
  }

  // 4. Absolute fallback
  if (__DEV__) {
    console.warn('⚠️ Aucun EXPO_PUBLIC_API_URL défini et impossible de détecter l\'IP locale. Fallback sur localhost.');
    return 'http://localhost:8000';
  }

  console.error('❌ ERREUR: EXPO_PUBLIC_API_URL ou Constants.expoConfig.extra.apiUrl n\'est pas défini pour le build de production !');
  return '';
};

export const API_URL = getApiUrl();
console.log('API URL configured:', API_URL);

const TOKEN_KEY = 'auth_token';

async function isOnline() {
  const state = await NetInfo.fetch();
  return !!state.isConnected && !!state.isInternetReachable;
}

// For web, use localStorage; for native, use SecureStore
async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function removeToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  const online = await isOnline();

  // 1. Handle GET requests (Caching)
  if (method === 'GET') {
    if (!online) {
      const cached = await cache.get<T>(endpoint);
      if (cached) return cached;
      throw new ApiError('Mode hors ligne : Données non diponibles en cache', 503);
    }

    try {
      const data = await rawRequest<T>(endpoint, options);
      // Cache the successful response
      await cache.set(endpoint, data);
      return data;
    } catch (error) {
      // Fallback to cache if server error
      const cached = await cache.get<T>(endpoint);
      if (cached) return cached;
      throw error;
    }
  }

  // 2. Handle Mutations (Proactive attempt, then queuing if failed)
  try {
    return await rawRequest<T>(endpoint, options);
  } catch (error) {
    if (!online) {
      // Don't queue logouts for sync - they should be local-only if offline
      if (endpoint === '/auth/logout') {
        return { message: 'Déconnexion locale' } as any;
      }

      // Detect entity type from endpoint for syncAction
      let entity: SyncAction['entity'] = 'product';
      if (endpoint.includes('/products')) entity = 'product';
      else if (endpoint.includes('/suppliers')) entity = 'supplier';
      else if (endpoint.includes('/orders')) entity = 'order';
      else if (endpoint.includes('/settings')) entity = 'settings';
      else if (endpoint.includes('/sales')) entity = 'sale';
      else if (endpoint.includes('/stock/movement')) entity = 'stock';
      else if (endpoint.includes('/customers')) entity = 'customer';
      else if (endpoint.includes('/expenses')) entity = 'expense';
      else if (endpoint.includes('/alert-rules')) entity = 'alert_rule';
      else if (endpoint.includes('/notifications')) entity = 'notification';

      let type: SyncAction['type'] = 'update';
      if (method === 'POST') type = 'create';
      else if (method === 'DELETE') type = 'delete';

      await syncService.addToQueue({
        type,
        entity,
        payload: body || { id: endpoint.split('/').pop() }
      });

      // Return a fake successful response to keep UI moving
      return { status: 'pending', sync: true } as any;
    }
    throw error;
  }
}

// Low-level request that doesn't intercept for sync (used by syncService)
export async function rawRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken();
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${API_URL}/api${endpoint}`, {
      ...config,
      signal: controller.signal,
    } as any);
    clearTimeout(timeoutId);

    if (response.status === 401) {
      if (endpoint !== '/auth/login') {
        await removeToken();
        throw new AuthError('Session expirée');
      }
    }

    if (response.status === 403) {
      throw new ApiError('Accès refusé. Contactez votre manager.', 403);
    }

    if (response.status === 429) {
      throw new ApiError('Trop de tentatives. Veuillez réessayer plus tard.', 429);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erreur serveur' }));
      let message = 'Erreur serveur';

      if (error.detail) {
        if (typeof error.detail === 'string') {
          message = error.detail;
        } else if (Array.isArray(error.detail)) {
          // Flatten FastAPI validation errors: [{"loc": ["body", "email"], "msg": "value is not a valid email address", "type": "value_error.email"}]
          message = error.detail.map((d: any) =>
            `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg || JSON.stringify(d)}`
          ).join('\n');
        } else if (typeof error.detail === 'object') {
          message = JSON.stringify(error.detail);
        }
      }

      console.log('Throwing ApiError:', message, response.status);
      throw new ApiError(message, response.status);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`TIMEOUT contacting ${API_URL}/api${endpoint}`);
      throw new ApiError(`Le serveur met trop de temps à répondre (Timeout 30s) sur ${API_URL}`, 408);
    }
    throw err;
  }
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

// Auth
export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  register: (
    email: string,
    password: string,
    name: string,
    role: string = 'shopkeeper',
    phone: string = '',
    currency?: string,
    business_type?: string,
    how_did_you_hear?: string,
    country_code?: string
  ) =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        name,
        role,
        phone: phone || undefined,
        currency,
        business_type,
        how_did_you_hear,
        country_code
      },
    }),
  verifyPhone: (otp: string) =>
    request<{ message: string; user: User }>('/auth/verify-phone', {
      method: 'POST',
      body: { otp },
    }),
  me: () => request<User>('/auth/me'),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: { old_password: oldPassword, new_password: newPassword }
    }),
  resendOtp: () =>
    request<{ message: string; otp_fallback?: string }>('/auth/resend-otp', {
      method: 'POST',
    }),
};

export type ActivityLog = {
  log_id: string;
  user_id: string;
  user_name: string;
  owner_id: string;
  store_id?: string;
  action: string;
  module: string;
  description: string;
  details: any;
  created_at: string;
};

// Chat / Messaging
export type ChatMessage = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'shopkeeper' | 'supplier';
  content: string;
  read: boolean;
  created_at: string;
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
  created_at: string;
};

export const chat = {
  listConversations: () =>
    request<Conversation[]>('/conversations'),
  createConversation: (partnerId: string, partnerName: string) =>
    request<Conversation>(`/conversations?partner_id=${partnerId}&partner_name=${encodeURIComponent(partnerName)}`, { method: 'POST' }),
  getMessages: (conversationId: string, skip = 0, limit = 50) =>
    request<{ items: ChatMessage[]; total: number }>(`/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (conversationId: string, content: string) =>
    request<ChatMessage>(`/conversations/${conversationId}/messages`, { method: 'POST', body: { content } }),
  getUnreadCount: () =>
    request<{ unread: number }>('/conversations/unread-count'),
};

// Products
// Image upload
export const uploads = {
  image: (base64Data: string, folder = 'products') =>
    request<{ url: string; filename: string }>('/upload/image', {
      method: 'POST',
      body: { image: base64Data, folder },
    }),
  getFullUrl: (path: string) => {
    if (!path) return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path}`;
  },
};

export const products = {
  list: (categoryId?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (categoryId) qs.set('category_id', categoryId);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<Product>>(`/products?${qs.toString()}`);
  },
  get: (id: string) => request<Product>(`/products/${id}`),
  create: (data: ProductCreate) =>
    request<Product>('/products', { method: 'POST', body: data }),
  update: (id: string, data: Partial<ProductCreate>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) =>
    request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),
  getPriceHistory: (id: string) =>
    request<PriceHistory[]>(`/products/${id}/price-history`),
  adjustStock: (productId: string, actualQuantity: number, reason?: string) =>
    request<Product>(`/products/${productId}/adjust`, { method: 'POST', body: { actual_quantity: actualQuantity, reason } }),
  addVariant: (productId: string, variant: Omit<ProductVariant, 'variant_id' | 'is_active'>) =>
    request<{ message: string; variant: ProductVariant; total_quantity: number }>(`/products/${productId}/variants`, { method: 'POST', body: variant }),
  updateVariant: (productId: string, variantId: string, variant: Omit<ProductVariant, 'variant_id' | 'is_active'>) =>
    request<{ message: string; total_quantity: number }>(`/products/${productId}/variants/${variantId}`, { method: 'PUT', body: variant }),
  deleteVariant: (productId: string, variantId: string) =>
    request<{ message: string; total_quantity: number }>(`/products/${productId}/variants/${variantId}`, { method: 'DELETE' }),
  batchStockUpdate: (codes: string[], increment: number = 1) =>
    request<{ message: string; updated_count: number; not_found_count?: number; not_found?: string[] }>('/products/batch-stock-update', { method: 'POST', body: { codes, increment } }),
  batchAssociateRFID: (associations: { sku: string; rfid: string }[]) =>
    request<{ message: string; associated_count: number }>('/products/batch-associate-rfid', { method: 'POST', body: { associations } }),
  parseImport: (formData: FormData) =>
    request<any>('/products/import/parse', {
      method: 'POST',
      body: formData,
    }),
  confirmImport: (data: any) =>
    request<{ message: string; count: number }>('/products/import/confirm', {
      method: 'POST',
      body: data,
    }),
};

// Stores
export const stores = {
  list: () => request<Store[]>('/stores'),
  create: (data: StoreCreate) => request<Store>('/stores', { method: 'POST', body: data }),
  setActive: (storeId: string) => request<User>('/auth/active-store', { method: 'PUT', body: { store_id: storeId } }),
};

// Categories
export const categories = {
  list: () => request<Category[]>('/categories'),
  create: (data: { name: string; color?: string; icon?: string }) =>
    request<Category>('/categories', { method: 'POST', body: data }),
  update: (id: string, data: { name: string; color?: string; icon?: string }) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) =>
    request<{ message: string }>(`/categories/${id}`, { method: 'DELETE' }),
};

// Stock
export const stock = {
  createMovement: (data: StockMovementCreate) =>
    request<StockMovement>('/stock/movement', { method: 'POST', body: data }),
  getMovements: (productId?: string, days?: number, startDate?: string, endDate?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (productId) qs.set('product_id', productId);
    if (days) qs.set('days', days.toString());
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<StockMovement>>(`/stock/movements?${qs.toString()}`);
  },
};

// Alerts
export const alerts = {
  list: (skip = 0, limit = 50) =>
    request<PaginatedResponse<Alert>>(`/alerts?skip=${skip}&limit=${limit}`),
  markRead: (id: string) =>
    request<{ message: string }>(`/alerts/${id}/read`, { method: 'PUT' }),
  dismiss: (id: string) =>
    request<{ message: string }>(`/alerts/${id}/dismiss`, { method: 'PUT' }),
  clearDismissed: () =>
    request<{ message: string }>('/alerts/dismissed', { method: 'DELETE' }),
};

// Alert Rules
export const alertRules = {
  list: () => request<AlertRule[]>('/alert-rules'),
  create: (data: AlertRuleCreate) => request<AlertRule>('/alert-rules', { method: 'POST', body: data }),
  update: (id: string, data: AlertRuleCreate) => request<AlertRule>(`/alert-rules/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ message: string }>(`/alert-rules/${id}`, { method: 'DELETE' }),
};

// Dashboard
export const dashboard = {
  get: () => request<DashboardData>('/dashboard'),
};

// Statistics
export const statistics = {
  get: () => request<StatisticsData>('/statistics'),
};

// Settings
export const settings = {
  get: () => request<UserSettings>('/settings'),
  update: (data: Partial<UserSettings>) =>
    request<UserSettings>('/settings', { method: 'PUT', body: data }),
};

// Suppliers
export const suppliers = {
  list: (skip = 0, limit = 50, search?: string) => {
    const qs = new URLSearchParams();
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    if (search) qs.set('search', search);
    return request<PaginatedResponse<Supplier>>(`/suppliers?${qs.toString()}`);
  },
  get: (id: string) => request<Supplier>(`/suppliers/${id}`),
  create: (data: SupplierCreate) =>
    request<Supplier>('/suppliers', { method: 'POST', body: data }),
  update: (id: string, data: SupplierCreate) =>
    request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) =>
    request<{ message: string }>(`/suppliers/${id}`, { method: 'DELETE' }),
  getProducts: (supplierId: string) =>
    request<SupplierProductLink[]>(`/suppliers/${supplierId}/products`),
  getStats: (id: string) => request<SupplierStats>(`/suppliers/${id}/stats`),
  getInvoices: (id: string) => request<SupplierInvoice[]>(`/suppliers/${id}/invoices`),
  createInvoice: (id: string, data: Partial<SupplierInvoice>) =>
    request<SupplierInvoice>(`/suppliers/${id}/invoices`, { method: 'POST', body: data }),
  getLogs: (id: string) => request<SupplierCommunicationLog[]>(`/suppliers/${id}/logs`),
  createLog: (id: string, data: SupplierLogCreate) =>
    request<SupplierCommunicationLog>(`/suppliers/${id}/logs`, { method: 'POST', body: data }),
};

// Supplier-Product links
export const supplierProducts = {
  link: (data: SupplierProductCreate) =>
    request<SupplierProduct>('/supplier-products', { method: 'POST', body: data }),
  unlink: (linkId: string) =>
    request<{ message: string }>(`/supplier-products/${linkId}`, { method: 'DELETE' }),
};

// Orders
export const orders = {
  list: (status?: string, supplierId?: string, startDate?: string, endDate?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (supplierId) qs.set('supplier_id', supplierId);
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<OrderWithDetails>>(`/orders?${qs.toString()}`);
  },
  get: (id: string) => request<OrderFull>(`/orders/${id}`),
  create: (data: OrderCreate) =>
    request<{ message: string; order_id: string }>('/orders', { method: 'POST', body: data }),
  updateStatus: (id: string, status: string) =>
    request<{ message: string }>(`/orders/${id}/status`, { method: 'PUT', body: { status } }),
  delete: (id: string) =>
    request<{ message: string }>(`/orders/${id}`, { method: 'DELETE' }),
  receivePartial: (orderId: string, items: { item_id: string; received_quantity: number }[], notes?: string) =>
    request<{ message: string; status: string; received_items: Record<string, number> }>(
      `/orders/${orderId}/receive-partial`, { method: 'PUT', body: { items, notes } }
    ),
  getFilterSuppliers: () => request<any[]>('/orders/filter-suppliers'),
  suggestMatches: (orderId: string) =>
    request<{ suggestions: MatchSuggestion[] }>(`/orders/${orderId}/suggest-matches`, { method: 'POST' }),
  confirmDelivery: (orderId: string, mappings: DeliveryMappingItem[]) =>
    request<{ message: string; results: any[] }>(`/orders/${orderId}/confirm-delivery`, { method: 'POST', body: { mappings } }),
  mapProduct: (catalogId: string, productId: string) =>
    request<{ message: string }>('/orders/map-product', { method: 'POST', body: { catalog_id: catalogId, product_id: productId } }),
};

// Returns & Credit Notes
export const returns = {
  create: (data: ReturnCreate) =>
    request<ReturnData>('/returns', { method: 'POST', body: data }),
  list: (type?: string, status?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (status) qs.set('status', status);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<ReturnData>>(`/returns?${qs.toString()}`);
  },
  get: (id: string) => request<ReturnData>(`/returns/${id}`),
  complete: (id: string) =>
    request<{ message: string; credit_note: CreditNote }>(`/returns/${id}/complete`, { method: 'PUT' }),
};

export const creditNotes = {
  list: (status?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<CreditNote>>(`/credit-notes?${qs.toString()}`);
  },
};

// Supplier Profile (CAS 1)
export const supplierProfile = {
  get: () => request<SupplierProfileData>('/supplier/profile'),
  create: (data: SupplierProfileCreate) => request<SupplierProfileData>('/supplier/profile', { method: 'POST', body: data }),
  update: (data: SupplierProfileCreate) => request<SupplierProfileData>('/supplier/profile', { method: 'PUT', body: data }),
};

// Supplier Catalog (CAS 1)
export const supplierCatalog = {
  list: () => request<CatalogProductData[]>('/supplier/catalog'),
  create: (data: CatalogProductCreate) => request<CatalogProductData>('/supplier/catalog', { method: 'POST', body: data }),
  update: (id: string, data: CatalogProductCreate) => request<CatalogProductData>(`/supplier/catalog/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ message: string }>(`/supplier/catalog/${id}`, { method: 'DELETE' }),
};

// Supplier Dashboard (CAS 1)
export const supplierDashboard = {
  get: () => request<SupplierDashboardData>('/supplier/dashboard'),
  getRatings: () => request<any[]>('/supplier/ratings'),
};

// Supplier Orders received (CAS 1)
export const supplierOrders = {
  list: (status?: string, shopkeeperUserId?: string, startDate?: string, endDate?: string) =>
    request<SupplierOrderData[]>(`/supplier/orders?${status ? `status=${status}&` : ''}${shopkeeperUserId ? `shopkeeper_user_id=${shopkeeperUserId}&` : ''}${startDate ? `start_date=${startDate}&` : ''}${endDate ? `end_date=${endDate}` : ''}`),
  getClients: () => request<any[]>('/supplier/clients'),
  updateStatus: (orderId: string, status: string) =>
    request<any>(`/supplier/orders/${orderId}/status`, {
      method: 'PUT',
      body: { status },
    }),
};
// Notifications
export const notifications = {
  registerToken: (token: string) => request<{ message: string }>('/notifications/register-token', { method: 'POST', body: { token } }),
};

// Marketplace (CAS 1)
export const marketplace = {
  searchSuppliers: (params?: { q?: string; category?: string; city?: string; min_rating?: number; verified_only?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.append('q', params.q);
    if (params?.category) qs.append('category', params.category);
    if (params?.city) qs.append('city', params.city);
    if (params?.min_rating) qs.append('min_rating', params.min_rating.toString());
    if (params?.verified_only) qs.append('verified_only', 'true');
    return request<MarketplaceSupplier[]>(`/marketplace/suppliers?${qs.toString()}`);
  },
  getSupplier: (supplierUserId: string) => request<MarketplaceSupplierDetail>(`/marketplace/suppliers/${supplierUserId}`),
  searchProducts: (params?: { q?: string; category?: string; price_min?: number; price_max?: number; min_supplier_rating?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.append('q', params.q || '');
    if (params?.category) qs.append('category', params.category);
    if (params?.price_min) qs.append('price_min', params.price_min.toString());
    if (params?.price_max) qs.append('price_max', params.price_max.toString());
    if (params?.min_supplier_rating) qs.append('min_supplier_rating', params.min_supplier_rating.toString());
    return request<CatalogProductData[]>(`/marketplace/search-products?${qs.toString()}`);
  }
};

// Activity Logs
export const activityLogs = {
  list: (skip = 0, limit = 50) =>
    request<PaginatedResponse<ActivityLog>>(`/activity-logs?skip=${skip}&limit=${limit}`),
};

// Replenishment
export const replenishment = {
  getSuggestions: () => request<ReplenishmentSuggestion[]>('/replenishment/suggestions'),
  automate: () => request<{ message: string; created_count: number; order_ids: string[] }>('/replenishment/automate', { method: 'POST' }),
};

// Admin & Support
export type SupportMessage = {
  message_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};

export type SupportTicket = {
  ticket_id: string;
  user_id: string;
  user_name: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved';
  messages: SupportMessage[];
  created_at: string;
  updated_at: string;
};

export type SystemHealth = {
  status: string;
  database: string;
  timestamp: string;
  version: string;
};

export type GlobalStats = {
  users: number;
  stores: number;
  products: number;
  sales: number;
  deleted_users?: number;
  inactive_users?: number;
  total_revenue: number;
  last_updated: string;
};

export type DetailedStats = {
  users_by_role: Record<string, number>;
  users_by_country?: Record<string, number>;
  users_by_plan?: Record<string, number>;
  recent_signups: number;
  signups_today?: number;
  trials_expiring_soon?: number;
  top_stores: { store_id: string; name: string; revenue: number; sales_count: number }[];
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  open_tickets: number;
  low_stock_count: number;
};

export type StoreAdmin = {
  store_id: string;
  name: string;
  user_id: string;
  owner_name: string;
  owner_email: string;
  product_count: number;
  total_revenue: number;
  sales_count: number;
  created_at: string;
};

export const admin = {
  // Global
  getHealth: () => request<SystemHealth>('/admin/health'),
  getGlobalStats: () => request<GlobalStats>('/admin/stats'),
  getDetailedStats: () => request<DetailedStats>('/admin/stats/detailed'),

  // Modules
  listUsers: (skip = 0, limit = 100) => request<User[]>(`/admin/users?skip=${skip}&limit=${limit}`),
  listStores: (skip = 0, limit = 50) => request<{ items: StoreAdmin[]; total: number }>(`/admin/stores?skip=${skip}&limit=${limit}`),
  listAllProducts: (params: { category_id?: string; min_stock?: number; search?: string; skip?: number; limit?: number }) => {
    const cleanParams: any = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleanParams[k] = v;
    });
    const query = new URLSearchParams(cleanParams).toString();
    return request<{ items: Product[]; total: number }>(`/admin/products?${query}`);
  },
  deleteProduct: (productId: string) => request<{ message: string }>(`/admin/products/${productId}`, { method: 'DELETE' }),
  toggleProduct: (productId: string) => request<{ product_id: string; is_active: boolean }>(`/admin/products/${productId}/toggle`, { method: 'PUT' }),
  listAllCustomers: (params: { search?: string; skip?: number; limit?: number }) => {
    const cleanParams: any = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleanParams[k] = v;
    });
    const query = new URLSearchParams(cleanParams).toString();
    return request<{ items: Customer[]; total: number }>(`/admin/customers?${query}`);
  },
  listLogs: (module?: string, skip = 0, limit = 100) =>
    request<ActivityLog[]>(`/admin/logs?${module ? `module=${module}&` : ''}skip=${skip}&limit=${limit}`),

  // User management
  toggleUser: (userId: string) =>
    request<{ user_id: string; is_active: boolean }>(`/admin/users/${userId}/toggle`, { method: 'PUT' }),

  // Support
  listTickets: (status?: string) => request<SupportTicket[]>(`/admin/support/tickets${status ? `?status=${status}` : ''}`),
  replyTicket: (ticketId: string, content: string) =>
    request<SupportTicket>(`/admin/support/tickets/${ticketId}/reply`, { method: 'POST', body: { content } }),
  closeTicket: (ticketId: string) =>
    request<{ message: string }>(`/admin/support/tickets/${ticketId}/close`, { method: 'POST' }),

  // Disputes
  listDisputes: (params?: { status?: string; type?: string; skip?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any || {}).toString();
    return request<{ items: any[]; total: number }>(`/admin/disputes?${query}`);
  },
  replyDispute: (disputeId: string, content: string) =>
    request<any>(`/admin/disputes/${disputeId}/reply`, { method: 'POST', body: { content } }),
  updateDisputeStatus: (disputeId: string, status: string, resolution?: string, admin_notes?: string) =>
    request<{ message: string }>(`/admin/disputes/${disputeId}/status`, { method: 'PUT', body: { status, resolution, admin_notes } }),
  getDisputeStats: () => request<{ total: number; open: number; investigating: number; resolved: number; rejected: number; by_type: Record<string, number> }>('/admin/disputes/stats'),

  // Communication
  sendMessage: (data: { title: string; content: string; type?: string; target?: string }) =>
    request<{ message_id: string; sent: boolean }>('/admin/messages/send', { method: 'POST', body: data }),
  listMessages: (type?: string, skip = 0, limit = 50) => {
    const params = type ? `type=${type}&skip=${skip}&limit=${limit}` : `skip=${skip}&limit=${limit}`;
    return request<{ items: any[]; total: number }>(`/admin/messages?${params}`);
  },

  // Security
  listSecurityEvents: (type?: string, skip = 0, limit = 100) => {
    const params = type ? `type=${type}&skip=${skip}&limit=${limit}` : `skip=${skip}&limit=${limit}`;
    return request<{ items: any[]; total: number }>(`/admin/security/events?${params}`);
  },
  getSecurityStats: () => request<{ total_events: number; failed_logins_24h: number; failed_logins_7d: number; successful_logins_24h: number; password_changes_7d: number; blocked_users: number }>('/admin/security/stats'),
  getActiveSessions: () => request<any[]>('/admin/security/sessions'),

  // Comm
  broadcast: (message: string, title?: string) =>
    request<{ sent_to: number; message: string; title: string }>('/admin/broadcast', { method: 'POST', body: { message, title } }),

  // Data Explorer (Phase 27)
  getCollections: () => request<CollectionInfo[]>('/admin/collections'),
  getCollectionData: (name: string, skip: number, limit: number, search?: string) => {
    return request<CollectionData>(`/admin/collections/${name}?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
  },
  updateCGU: (content: string) => request<{ message: string }>('/admin/cgu', { method: 'POST', body: { content } }),
  updatePrivacy: (content: string) => request<{ message: string }>('/admin/privacy', { method: 'POST', body: { content } }),
};

export const system = {
  getCGU: (lang?: string) => request<{ content: string; updated_at: string }>(`/cgu${lang ? `?lang=${lang}` : ''}`),
  getPrivacy: (lang?: string) => request<{ content: string; updated_at: string }>(`/privacy${lang ? `?lang=${lang}` : ''}`),
};



export const support = {
  createTicket: (subject: string, message: string) =>
    request<SupportTicket>('/support/tickets', { method: 'POST', body: { subject, message } }),
};

export const ai = {
  support: (message: string, history: any[], language: string = 'fr') =>
    request<{ response: string }>('/ai/support', {
      method: 'POST',
      body: { message, history, language },
    }),
  getHistory: () => request<{ messages: { role: string; content: string; timestamp: string }[] }>('/ai/history'),
  clearHistory: () => request<{ message: string }>('/ai/history', { method: 'DELETE' }),
  suggestCategory: (productName: string, language: string = 'fr') =>
    request<{ category: string; subcategory: string }>('/ai/suggest-category', {
      method: 'POST',
      body: { product_name: productName, language },
    }),
  generateDescription: (productName: string, category?: string, subcategory?: string, language: string = 'fr') =>
    request<{ description: string }>('/ai/generate-description', {
      method: 'POST',
      body: { product_name: productName, category, subcategory, language },
    }),
  dailySummary: (language: string = 'fr') =>
    request<{ summary: string }>(`/ai/daily-summary?lang=${language}`),
  detectAnomalies: (language: string = 'fr') =>
    request<{ anomalies: AiAnomaly[] }>(`/ai/detect-anomalies?lang=${language}`),
  basketSuggestions: (productIds: string[]) =>
    request<{ suggestions: BasketSuggestion[] }>('/ai/basket-suggestions', {
      method: 'POST',
      body: { product_ids: productIds },
    }),
  replenishmentAdvice: (language: string = 'fr') =>
    request<{ advice: string; priority_count: number }>(`/ai/replenishment-advice?lang=${language}`),
  suggestPrice: (productId: string, language: string = 'fr') =>
    request<AiPriceSuggestion>('/ai/suggest-price', {
      method: 'POST',
      body: { product_id: productId, language },
    }),
  scanInvoice: (imageBase64: string, language: string = 'fr') =>
    request<InvoiceScanResult>('/ai/scan-invoice', {
      method: 'POST',
      body: { image: imageBase64, language },
    }),
  voiceToText: (audioBase64: string, language: string = 'fr') =>
    request<{ transcription: string }>('/ai/voice-to-text', {
      method: 'POST',
      body: { audio: audioBase64, language },
    }),
};

export type InvoiceScanResult = {
  supplier_name?: string | null;
  invoice_number?: string | null;
  date?: string | null;
  items: { name: string; quantity: number; unit_price: number; total: number }[];
  total_amount?: number | null;
  error?: string;
};

export type AiPriceSuggestion = {
  suggested_price: number;
  min_price: number;
  max_price: number;
  reasoning: string;
  current_price: number;
  purchase_price: number;
};

export type BasketSuggestion = {
  product_id: string;
  name: string;
  selling_price: number;
  score: number;
};

export type AiAnomaly = {
  type: 'revenue' | 'volume' | 'margin' | 'stock';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
};

// User Disputes (Phase 29)
export const disputes = {
  create: (data: { subject: string; description: string; type?: string }) =>
    request<{ message: string; dispute_id: string }>('/disputes', { method: 'POST', body: data }),
  mine: () => request<any[]>('/disputes/mine'),
};

// User Notifications (Phase 29)
export const userNotifications = {
  list: (skip = 0, limit = 20) =>
    request<{ items: any[]; total: number }>(`/user/notifications?skip=${skip}&limit=${limit}`),
};

// Smart Reminders
export type SmartReminder = {
  reminder_id: string;
  category: 'stock' | 'orders' | 'crm' | 'accounting';
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  icon: string;
  action_label?: string;
  action_route?: string;
  data?: Record<string, any>;
};

export type SmartRemindersResponse = {
  reminders: SmartReminder[];
  total: number;
  by_category: Record<string, number>;
  generated_at: string;
};

export const smartReminders = {
  get: () => request<SmartRemindersResponse>('/smart-reminders'),
};

// Invitations (CAS 1)
export const invitations = {
  send: (supplierId: string, email: string) =>
    request<{ message: string; invitation_id: string; token: string }>(`/suppliers/${supplierId}/invite`, { method: 'POST', body: { email } }),
};

// Ratings (CAS 1)
export const ratings = {
  create: (supplierUserId: string, data: { order_id: string; score: number; comment?: string }) =>
    request<{ message: string; rating_average: number }>(`/suppliers/${supplierUserId}/rate`, { method: 'POST', body: data }),
};

// Sub-Users (Permissions Management)
export const subUsers = {
  list: () => request<User[]>('/users/sub-users'),
  create: (data: Partial<User> & { password?: string }) => request<User>('/users/sub-users', { method: 'POST', body: data }),
  update: (id: string, data: Partial<User>) => request<User>(`/users/sub-users/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ message: string }>(`/users/sub-users/${id}`, { method: 'DELETE' }),
};

// Export
export const exportApi = {
  productsUrl: () => `${API_URL}/api/export/products/csv`,
  movementsUrl: () => `${API_URL}/api/export/movements/csv`,
};

export { getToken, setToken, removeToken };

// =================== Pagination ===================

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};

// =================== Types ===================

export type Store = {
  store_id: string;
  user_id: string;
  name: string;
  address?: string;
  created_at: string;
};

export type StoreCreate = {
  name: string;
  address?: string;
};

export type UserPermissions = {
  stock: 'none' | 'read' | 'write';
  accounting: 'none' | 'read' | 'write';
  crm: 'none' | 'read' | 'write';
  pos: 'none' | 'read' | 'write';
  suppliers: 'none' | 'read' | 'write';
};

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  auth_type: string;
  role: string; // "shopkeeper" | "staff" | "supplier"
  permissions?: Record<string, 'none' | 'read' | 'write'>;
  parent_user_id?: string;
  created_at: string;
  active_store_id?: string;
  store_ids?: string[];
  plan?: 'trial' | 'starter' | 'pro' | 'enterprise';
  subscription_status?: 'active' | 'expired';
  trial_ends_at?: string;
  currency?: string;
  business_type?: string;
  how_did_you_hear?: string;
  is_phone_verified?: boolean;
  phone?: string;
  country_code?: string;
};

export type ProductVariant = {
  variant_id: string;
  name: string;
  sku?: string;
  quantity: number;
  purchase_price?: number;
  selling_price?: number;
  is_active: boolean;
};

export type Product = {
  product_id: string;
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
  subcategory?: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number;
  lead_time_days: number;
  image?: string;
  rfid_tag?: string;
  expiry_date?: string;
  location_id?: string;
  user_id: string;
  is_active: boolean;
  variants: ProductVariant[];
  has_variants: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductCreate = {
  name: string;
  description?: string;
  sku?: string;
  category_id?: string;
  subcategory?: string;
  quantity?: number;
  unit?: string;
  purchase_price?: number;
  selling_price?: number;
  min_stock?: number;
  max_stock?: number;
  lead_time_days?: number;
  image?: string;
  rfid_tag?: string;
  expiry_date?: string;
  variants?: ProductVariant[];
  has_variants?: boolean;
};

export type PriceHistory = {
  history_id: string;
  product_id: string;
  purchase_price: number;
  selling_price: number;
  recorded_at: string;
};

export type Category = {
  category_id: string;
  name: string;
  color: string;
  icon: string;
  user_id: string;
  created_at: string;
};

export type StockMovement = {
  movement_id: string;
  product_id: string;
  product_name?: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  previous_quantity: number;
  new_quantity: number;
  created_at: string;
};

export type StockMovementCreate = {
  product_id: string;
  type: 'in' | 'out';
  quantity: number;
  reason?: string;
  batch_id?: string;
};

export type Alert = {
  alert_id: string;
  product_id?: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
};

export type DashboardData = {
  total_products: number;
  total_stock_value: number;
  potential_revenue: number;
  critical_count: number;
  overstock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  unread_alerts: number;
  critical_products: Product[];
  overstock_products: Product[];
  recent_alerts: Alert[];
  recent_sales: Sale[];
  today_revenue: number;
  yesterday_revenue: number;
  month_revenue: number;
  today_sales_count: number;
  yesterday_sales_count: number;
  top_selling_today: { name: string; qty: number }[];
};

export type StatisticsData = {
  stock_by_category: { name: string; count: number; value: number }[];
  status_distribution: Record<string, number>;
  movements_summary: { in: number; out: number; net: number };
  orders_stats: { pending: number; completed: number; total_value: number };
  top_products_by_value: { name: string; quantity: number; value: number }[];
  stock_value_history: { date: string; value: number }[];
  abc_analysis: {
    A: { id: string; name: string; revenue: number; percentage: number }[];
    B: { id: string; name: string; revenue: number; percentage: number }[];
    C: { id: string; name: string; revenue: number; percentage: number }[];
  };
  reorder_recommendations: {
    product_id: string;
    name: string;
    current_quantity: number;
    reorder_point: number;
    suggested_quantity: number;
    priority: 'critical' | 'warning';
  }[];
  expiry_alerts: {
    product_id: string;
    name: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    priority: 'critical' | 'warning';
  }[];
  profit_by_category: { name: string; value: number }[];
};

// Batches
export const batches = {
  list: (productId?: string) =>
    request<Batch[]>(`/batches${productId ? `?product_id=${productId}` : ''}`),
  create: (data: BatchCreate) =>
    request<Batch>('/batches', { method: 'POST', body: data }),
};

// Inventory
export const inventory = {
  getTasks: (status?: string) =>
    request<InventoryTask[]>(`/inventory/tasks${status ? `?status=${status}` : ''}`),
  generateTasks: () =>
    request<{ message: string; tasks: InventoryTask[] }>('/inventory/generate', { method: 'POST' }),
  submitResult: (id: string, actualQuantity: number) =>
    request<InventoryTask>(`/inventory/tasks/${id}`, {
      method: 'PUT',
      body: { actual_quantity: actualQuantity }
    }),
};

// Sales / POS
export const sales = {
  list: (storeId?: string, days?: number, startDate?: string, endDate?: string, productId?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (storeId) qs.set('store_id', storeId);
    if (days) qs.set('days', days.toString());
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    if (productId) qs.set('product_id', productId);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<Sale>>(`/sales?${qs.toString()}`);
  },
  create: (data: SaleCreate) => request<Sale>('/sales', { method: 'POST', body: data }),
  forecast: () => request<SalesForecastResponse>('/sales/forecast'),
};

// CRM
export const customers = {
  list: (sortBy?: string, skip = 0, limit = 50) => {
    const qs = new URLSearchParams();
    if (sortBy) qs.set('sort_by', sortBy);
    qs.set('skip', skip.toString());
    qs.set('limit', limit.toString());
    return request<PaginatedResponse<Customer>>(`/customers?${qs.toString()}`);
  },
  get: (id: string) => request<Customer>(`/customers/${id}`),
  create: (data: CustomerCreate) => request<Customer>('/customers', { method: 'POST', body: data }),
  update: (id: string, data: CustomerCreate) => request<Customer>(`/customers/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ message: string }>(`/customers/${id}`, { method: 'DELETE' }),
  getSales: (customerId: string) => request<CustomerSalesResponse>(`/customers/${customerId}/sales`),
  getBirthdays: (days: number = 7) => request<Customer[]>(`/customers/birthdays?days=${days}`),
  sendCampaign: (data: { message: string; customer_ids: string[]; channel: string }) =>
    request<{ message: string }>('/customers/campaign', { method: 'POST', body: data }),
  addPayment: (customerId: string, amount: number, notes?: string) =>
    request<CustomerPayment>(`/customers/${customerId}/payments`, { method: 'POST', body: { amount, notes } }),
  getPayments: (customerId: string) => request<CustomerPayment[]>(`/customers/${customerId}/payments`),
  getDebtHistory: (customerId: string) => request<DebtTransaction[]>(`/customers/${customerId}/debt-history`),
};

export const promotions = {
  list: () => request<Promotion[]>('/promotions'),
  create: (data: Partial<Promotion>) => request<Promotion>('/promotions', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Promotion>) => request<Promotion>(`/promotions/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ message: string }>(`/promotions/${id}`, { method: 'DELETE' }),
};

export type ReplenishmentSuggestion = {
  product_id: string;
  product_name: string;
  current_quantity: number;
  min_stock: number;
  max_stock: number;
  daily_velocity: number;
  days_until_stock_out?: number;
  suggested_quantity: number;
  priority: 'critical' | 'warning' | 'info';
  supplier_id?: string;
  supplier_name?: string;
};

// Accounting
export const accounting = {
  getStats: (days: number = 30, startDate?: string, endDate?: string) => {
    const qs = new URLSearchParams();
    if (days) qs.set('days', days.toString());
    if (startDate) qs.set('start_date', startDate);
    if (endDate) qs.set('end_date', endDate);
    const query = qs.toString();
    return request<AccountingStats>(`/accounting/stats${query ? `?${query}` : ''}`);
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
    return request<PaginatedResponse<Expense>>(`/expenses?${qs.toString()}`);
  },
  create: (data: ExpenseCreate) => request<Expense>('/expenses', { method: 'POST', body: data }),
  delete: (id: string) => request<{ message: string }>(`/expenses/${id}`, { method: 'DELETE' }),
};

export type AccountingStats = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  net_profit: number;
  total_losses: number;
  expenses: number; // NEW
  expenses_breakdown: Record<string, number>; // NEW
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
  product_performance: { id: string; name: string; qty_sold: number; revenue: number; cogs: number; loss: number }[];
};

export type InventoryTask = {
  task_id: string;
  user_id: string;
  store_id: string;
  product_id: string;
  product_name: string;
  expected_quantity: number;
  actual_quantity?: number;
  discrepancy?: number;
  status: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  completed_at?: string;
};

export type Customer = {
  customer_id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  loyalty_points: number;
  total_spent: number;
  current_debt: number; // NEW
  notes?: string;
  birthday?: string;
  category?: string;
  created_at: string;
  visit_count?: number;
  last_purchase_date?: string;
  average_basket?: number;
  tier?: 'bronze' | 'argent' | 'or' | 'platine';
};





export type SaleItem = {
  product_id: string;
  product_name?: string;
  quantity: number;
  selling_price: number;
  total: number;
};

export type Sale = {
  sale_id: string;
  user_id: string;
  store_id: string;
  items: SaleItem[];
  total_amount: number;
  payment_method: string;
  customer_id?: string;
  customer_name?: string;
  created_at: string;
};

export type SaleCreate = {
  items: { product_id: string; quantity: number }[];
  payment_method: string;
  customer_id?: string;
};



export type CustomerPayment = {
  payment_id: string;
  customer_id: string;
  user_id: string;
  amount: number;
  notes?: string;
  created_at: string;
};

export type DebtTransaction = {
  type: 'credit_sale' | 'payment';
  date: string;
  amount: number;
  reference: string;
  details: string;
};

export type CustomerCreate = {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  birthday?: string;
};

export type CustomerSalesResponse = {
  sales: Sale[];
  visit_count: number;
  average_basket: number;
  last_purchase_date?: string;
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

export type Expense = {
  expense_id: string;
  user_id: string;
  store_id?: string;
  category: string;
  amount: number;
  description?: string;
  created_at: string;
};

export type ExpenseCreate = {
  category: string;
  amount: number;
  description?: string;
  store_id?: string;
  date?: string;
};

export type Batch = {
  batch_id: string;
  product_id: string;
  user_id: string;
  batch_number: string;
  quantity: number;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
};

export type BatchCreate = {
  product_id: string;
  batch_number: string;
  quantity: number;
  expiry_date?: string;
};

export type LoyaltySettings = {
  is_active: boolean;
  ratio: number;
  reward_threshold: number;
  reward_description: string;
};

export type ReminderRule = {
  enabled: boolean;
  threshold?: number | null;
};

export type ReminderRuleSettings = {
  inventory_check: ReminderRule;
  dormant_products: ReminderRule;
  late_deliveries: ReminderRule;
  replenishment: ReminderRule;
  pending_invitations: ReminderRule;
  debt_recovery: ReminderRule;
  client_reactivation: ReminderRule;
  birthdays: ReminderRule;
  monthly_report: ReminderRule;
  expense_spike: ReminderRule;
};

export type UserSettings = {
  settings_id: string;
  user_id: string;
  loyalty: LoyaltySettings;
  reminder_rules?: ReminderRuleSettings;
  modules: Record<string, boolean>;
  simple_mode: boolean;
  language: string;
  push_notifications: boolean;
  dashboard_layout?: {
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
};

export type Supplier = {
  supplier_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  products_supplied?: string;
  delivery_delay?: string;
  payment_conditions?: string;
  is_active: boolean;
  created_at: string;
};

export type SupplierCreate = {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  products_supplied?: string;
  delivery_delay?: string;
  payment_conditions?: string;
};

export type SupplierProduct = {
  link_id: string;
  supplier_id: string;
  product_id: string;
  user_id: string;
  supplier_price: number;
  supplier_sku?: string;
  is_preferred: boolean;
  created_at: string;
};

export type SupplierProductCreate = {
  supplier_id: string;
  product_id: string;
  supplier_price?: number;
  supplier_sku?: string;
  is_preferred?: boolean;
};

export type SupplierProductLink = SupplierProduct & {
  product: Product;
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
  product?: Product | CatalogProductData;
  mapped_product_id?: string;
};

export type OrderFull = Order & {
  supplier: Supplier;
  items: OrderItem[];
};

export type OrderCreate = {
  supplier_id: string;
  supplier_user_id?: string;
  items: { product_id: string; quantity: number; unit_price: number }[];
  notes?: string;
  expected_delivery?: string;
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

// =================== Returns & Credit Notes Types ===================

export type ReturnItem = {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  reason?: string;
};

export type ReturnCreate = {
  order_id?: string;
  supplier_id?: string;
  items: ReturnItem[];
  type: 'supplier' | 'customer';
  notes?: string;
};

export type ReturnData = {
  return_id: string;
  user_id: string;
  store_id?: string;
  order_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  type: 'supplier' | 'customer';
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  items: ReturnItem[];
  total_amount: number;
  credit_note_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type CreditNote = {
  credit_note_id: string;
  return_id: string;
  user_id: string;
  store_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  type: string;
  amount: number;
  status: 'active' | 'used' | 'expired';
  used_amount: number;
  notes?: string;
  created_at: string;
};

// =================== Sales Forecast Types ===================

export type ForecastProduct = {
  product_id: string;
  name: string;
  current_stock: number;
  velocity: number;
  days_of_stock: number;
  predicted_sales_7d: number;
  predicted_sales_30d: number;
  trend: 'up' | 'down' | 'stable';
  risk_level: 'critical' | 'warning' | 'ok';
};

export type SalesForecastResponse = {
  products: ForecastProduct[];
  total_predicted_revenue_7d: number;
  total_predicted_revenue_30d: number;
  ai_summary: string;
  currency: string;
  generated_at: string;
};

export type AlertRule = {
  rule_id: string;
  user_id: string;
  type: string;
  enabled: boolean;
  threshold_percentage?: number | null;
  notification_channels: string[];
  created_at: string;
};

export type AlertRuleCreate = {
  type: string;
  enabled?: boolean;
  threshold_percentage?: number | null;
  notification_channels?: string[];
};

// =================== DATA EXPLORER Types ===================
export type CollectionInfo = {
  name: string;
  count: number;
};

export type CollectionData = {
  data: any[];
  total: number;
  skip: number;
  limit: number;
};


// =================== CAS 1 Types ===================

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

export type SupplierProfileCreate = {
  company_name: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  categories?: string[];
  delivery_zones?: string[];
  min_order_amount?: number;
  average_delivery_days?: number;
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

export type SupplierOrderData = Order & {
  shopkeeper_name: string;
  shopkeeper_user_id: string;
  items_count: number;
  items: OrderItem[];
};

export type MarketplaceSupplier = SupplierProfileData & {
  catalog_count: number;
};

export type MarketplaceSupplierDetail = {
  profile: SupplierProfileData;
  catalog: CatalogProductData[];
  ratings: SupplierRatingData[];
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

export type MarketplaceCatalogProduct = CatalogProductData & {
  supplier_name: string;
  supplier_city: string;
  supplier_rating: number;
};

export type SubscriptionData = {
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  trial_ends_at: string;
  subscription_end?: string;
  subscription_provider: 'none' | 'revenuecat' | 'cinetpay';
  remaining_days: number;
  is_trial: boolean;
};

export const profile = {
  exportData: async () => {
    return request<any>('/profile/export');
  },
  deleteAccount: (password: string) => request<{ message: string }>('/profile', {
    method: 'DELETE',
    body: { password },
  }),
};

export const subscription = {
  getDetails: () => request<SubscriptionData>('/subscription/me'),
  checkout: (plan: string) => request<{ payment_url: string; transaction_id: string }>(`/billing/checkout?plan=${plan}`, { method: 'POST' }),
  sync: () => request<{ plan: string; status: string }>('/subscription/sync', { method: 'POST' }),
};

export type Location = {
  location_id: string;
  name: string;
  description?: string;
  store_id?: string;
};

export const locations = {
  list: () => request<Location[]>('/locations'),
};
