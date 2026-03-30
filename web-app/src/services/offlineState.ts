import { syncService, type QueuedRequest } from './syncService';

function toNumber(value: unknown, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getSortedQueue() {
    return [...syncService.getQueue()].sort((a, b) => a.timestamp - b.timestamp);
}

function getEndpointId(endpoint: string, prefix: string) {
    if (!endpoint.startsWith(prefix)) return '';
    return endpoint.slice(prefix.length).split('/')[0] || '';
}

export function getPendingInventorySummary() {
    const queue = getSortedQueue();
    let pendingProducts = 0;
    let pendingUpdates = 0;
    let pendingStockMovements = 0;

    queue.forEach((request) => {
        if (request.endpoint === '/products' && request.method === 'POST') pendingProducts += 1;
        if (request.endpoint.startsWith('/products/') && request.method === 'PUT') pendingUpdates += 1;
        if (request.endpoint === '/stock/movement' && request.method === 'POST') pendingStockMovements += 1;
    });

    return {
        pendingProducts,
        pendingUpdates,
        pendingStockMovements,
        pendingTotal: pendingProducts + pendingUpdates + pendingStockMovements,
    };
}

export function mergeInventoryOfflineState(products: any[], selectedLocation = '') {
    const queue = getSortedQueue();
    const items = new Map<string, any>();
    const order: string[] = [];

    (Array.isArray(products) ? products : []).forEach((product) => {
        items.set(product.product_id, { ...product });
        order.push(product.product_id);
    });

    queue.forEach((request) => {
        if (request.endpoint === '/products' && request.method === 'POST') {
            const body = request.body || {};
            if (selectedLocation && (body.location_id || '') !== selectedLocation) {
                return;
            }
            const productId = `offline-product-${request.id}`;
            if (!items.has(productId)) {
                items.set(productId, {
                    ...body,
                    product_id: productId,
                    quantity: toNumber(body.quantity),
                    purchase_price: toNumber(body.purchase_price),
                    selling_price: toNumber(body.selling_price),
                    min_stock: toNumber(body.min_stock),
                    max_stock: toNumber(body.max_stock, 100),
                    unit: body.unit || 'pièce',
                    offline_pending: true,
                    offline_request_id: request.id,
                    offline_kind: 'create',
                });
                order.unshift(productId);
            }
            return;
        }

        if (request.endpoint.startsWith('/products/') && request.method === 'PUT') {
            const productId = getEndpointId(request.endpoint, '/products/');
            const current = items.get(productId);
            if (!current) return;
            items.set(productId, {
                ...current,
                ...(request.body || {}),
                offline_pending: true,
                offline_kind: 'update',
                offline_request_id: request.id,
            });
            return;
        }

        if (request.endpoint.startsWith('/products/') && request.method === 'DELETE') {
            const productId = getEndpointId(request.endpoint, '/products/');
            items.delete(productId);
            const index = order.indexOf(productId);
            if (index >= 0) order.splice(index, 1);
            return;
        }

        if (request.endpoint === '/stock/movement' && request.method === 'POST') {
            const body = request.body || {};
            const productId = body.product_id;
            const current = items.get(productId);
            if (!current) return;
            const quantity = toNumber(body.quantity);
            const delta = body.type === 'out' ? -quantity : quantity;
            items.set(productId, {
                ...current,
                quantity: Math.max(0, toNumber(current.quantity) + delta),
                offline_pending: true,
                offline_kind: 'stock_movement',
                offline_request_id: request.id,
            });
        }
    });

    return {
        products: order.map((productId) => items.get(productId)).filter(Boolean),
        summary: getPendingInventorySummary(),
    };
}

export function applyPendingDebtToCustomer<T extends { current_debt?: number }>(customer: T, signedAmount: number) {
    return {
        ...customer,
        current_debt: Math.max(0, toNumber(customer.current_debt) - signedAmount),
        offline_pending: true,
        offline_pending_debt: true,
    };
}

export function buildPendingDebtEntry(customerId: string, signedAmount: number, description?: string, createdAt?: string) {
    const isPayment = signedAmount > 0;
    return {
        customer_id: customerId,
        type: isPayment ? 'payment' : 'credit_sale',
        amount: signedAmount,
        date: createdAt || new Date().toISOString(),
        reference: 'SYNC',
        details: description || (isPayment ? 'Paiement hors ligne en attente' : 'Dette hors ligne en attente'),
        pending: true,
    };
}

export function getPendingDebtEntries(customerId: string) {
    const queue = [...getSortedQueue()]
        .filter((request) => request.endpoint === `/customers/${customerId}/payments` && request.method === 'POST')
        .sort((a, b) => b.timestamp - a.timestamp);

    return queue.map((request) =>
        buildPendingDebtEntry(
            customerId,
            toNumber(request.body?.amount),
            request.body?.notes,
            new Date(request.timestamp).toISOString(),
        ),
    );
}

export function mergeCustomersOfflineState(customers: any[]) {
    const queue = getSortedQueue();
    const items = new Map<string, any>();
    const order: string[] = [];
    let pendingCustomers = 0;
    let pendingDebtChanges = 0;

    (Array.isArray(customers) ? customers : []).forEach((customer) => {
        items.set(customer.customer_id, { ...customer });
        order.push(customer.customer_id);
    });

    queue.forEach((request) => {
        if (request.endpoint === '/customers' && request.method === 'POST') {
            pendingCustomers += 1;
            const body = request.body || {};
            const customerId = `offline-customer-${request.id}`;
            if (!items.has(customerId)) {
                items.set(customerId, {
                    customer_id: customerId,
                    user_id: '',
                    loyalty_points: 0,
                    total_spent: 0,
                    current_debt: 0,
                    visit_count: 0,
                    average_basket: 0,
                    created_at: new Date(request.timestamp).toISOString(),
                    ...body,
                    offline_pending: true,
                    offline_request_id: request.id,
                });
                order.unshift(customerId);
            }
            return;
        }

        if (request.endpoint.startsWith('/customers/') && request.endpoint.endsWith('/payments') && request.method === 'POST') {
            pendingDebtChanges += 1;
            const customerId = getEndpointId(request.endpoint, '/customers/');
            const current = items.get(customerId);
            if (!current) return;
            items.set(customerId, applyPendingDebtToCustomer(current, toNumber(request.body?.amount)));
            return;
        }

        if (request.endpoint.startsWith('/customers/') && request.method === 'PUT') {
            const customerId = getEndpointId(request.endpoint, '/customers/');
            const current = items.get(customerId);
            if (!current) return;
            items.set(customerId, {
                ...current,
                ...(request.body || {}),
                offline_pending: true,
                offline_request_id: request.id,
            });
            return;
        }

        if (request.endpoint.startsWith('/customers/') && request.method === 'DELETE') {
            const customerId = getEndpointId(request.endpoint, '/customers/');
            items.delete(customerId);
            const index = order.indexOf(customerId);
            if (index >= 0) order.splice(index, 1);
        }
    });

    return {
        customers: order.map((customerId) => items.get(customerId)).filter(Boolean),
        summary: {
            pendingCustomers,
            pendingDebtChanges,
            pendingTotal: pendingCustomers + pendingDebtChanges,
        },
    };
}
