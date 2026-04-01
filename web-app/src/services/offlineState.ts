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
        current_debt: toNumber(customer.current_debt) - signedAmount,
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

export function mergeAccountingOfflineState(params: {
    recentSales: any[];
    invoiceHistory: any[];
    expensesList: any[];
}) {
    const queue = getSortedQueue();
    const salesMap = new Map<string, any>();
    const saleOrder: string[] = [];
    const invoiceMap = new Map<string, any>();
    const invoiceOrder: string[] = [];
    const expenseMap = new Map<string, any>();
    const expenseOrder: string[] = [];
    let pendingInvoices = 0;
    let pendingExpenses = 0;
    let pendingSaleCancellations = 0;

    (Array.isArray(params.recentSales) ? params.recentSales : []).forEach((sale) => {
        salesMap.set(sale.sale_id, { ...sale });
        saleOrder.push(sale.sale_id);
    });

    (Array.isArray(params.invoiceHistory) ? params.invoiceHistory : []).forEach((invoice) => {
        invoiceMap.set(invoice.invoice_id, { ...invoice });
        invoiceOrder.push(invoice.invoice_id);
    });

    (Array.isArray(params.expensesList) ? params.expensesList : []).forEach((expense) => {
        expenseMap.set(expense.expense_id, { ...expense });
        expenseOrder.push(expense.expense_id);
    });

    queue.forEach((request) => {
        if (request.endpoint?.startsWith('/invoices/from-sale/') && request.method === 'POST') {
            pendingInvoices += 1;
            const saleId = getEndpointId(request.endpoint, '/invoices/from-sale/');
            const sale = salesMap.get(saleId);
            const invoiceId = `offline-invoice-${request.id}`;
            const invoiceNumber = `EN-ATT-${saleId.slice(0, 6).toUpperCase()}`;

            if (!invoiceMap.has(invoiceId)) {
                invoiceMap.set(invoiceId, {
                    invoice_id: invoiceId,
                    invoice_number: invoiceNumber,
                    invoice_label: 'Facture',
                    invoice_prefix: 'SYNC',
                    sale_id: saleId,
                    customer_name: sale?.customer_name || 'Client divers',
                    status: 'pending',
                    items: sale?.items || [],
                    total_amount: sale?.total_amount || 0,
                    notes: 'Facture créée hors ligne et en attente de synchronisation.',
                    issued_at: new Date(request.timestamp).toISOString(),
                    created_at: new Date(request.timestamp).toISOString(),
                    offline_pending: true,
                });
                invoiceOrder.unshift(invoiceId);
            }

            if (sale) {
                salesMap.set(saleId, {
                    ...sale,
                    invoice_id: invoiceId,
                    invoice_number: invoiceNumber,
                    invoice_label: 'Facture',
                    offline_pending_invoice: true,
                });
            }
            return;
        }

        if (request.endpoint === '/invoices/free' && request.method === 'POST') {
            pendingInvoices += 1;
            const invoiceId = `offline-free-invoice-${request.id}`;
            if (!invoiceMap.has(invoiceId)) {
                const body = request.body || {};
                invoiceMap.set(invoiceId, {
                    invoice_id: invoiceId,
                    invoice_number: `BROUILLON-${String(request.id).slice(0, 6).toUpperCase()}`,
                    invoice_label: 'Facture',
                    invoice_prefix: 'SYNC',
                    customer_name: body.customer_name || 'Client divers',
                    status: 'pending',
                    items: body.items || [],
                    total_amount: (body.items || []).reduce((sum: number, item: any) => sum + (toNumber(item.quantity, 1) * toNumber(item.unit_price)), 0) - toNumber(body.discount_amount),
                    notes: body.notes || 'Facture libre créée hors ligne et en attente de synchronisation.',
                    issued_at: new Date(request.timestamp).toISOString(),
                    created_at: new Date(request.timestamp).toISOString(),
                    offline_pending: true,
                });
                invoiceOrder.unshift(invoiceId);
            }
            return;
        }

        if (request.endpoint === '/expenses' && request.method === 'POST') {
            pendingExpenses += 1;
            const expenseId = `offline-expense-${request.id}`;
            if (!expenseMap.has(expenseId)) {
                expenseMap.set(expenseId, {
                    expense_id: expenseId,
                    category: request.body?.category || 'other',
                    amount: toNumber(request.body?.amount),
                    description: request.body?.description,
                    created_at: new Date(request.timestamp).toISOString(),
                    offline_pending: true,
                });
                expenseOrder.unshift(expenseId);
            }
            return;
        }

        if (request.endpoint?.startsWith('/expenses/') && request.method === 'DELETE') {
            const expenseId = getEndpointId(request.endpoint, '/expenses/');
            expenseMap.delete(expenseId);
            const index = expenseOrder.indexOf(expenseId);
            if (index >= 0) expenseOrder.splice(index, 1);
            return;
        }

        if (request.endpoint?.startsWith('/sales/') && request.endpoint.endsWith('/cancel') && request.method === 'POST') {
            pendingSaleCancellations += 1;
            const saleId = getEndpointId(request.endpoint, '/sales/');
            const sale = salesMap.get(saleId);
            if (!sale) return;
            salesMap.set(saleId, {
                ...sale,
                status: 'cancelled',
                cancelled_at: new Date(request.timestamp).toISOString(),
                offline_pending_cancellation: true,
            });
        }
    });

    return {
        recentSales: saleOrder.map((saleId) => salesMap.get(saleId)).filter(Boolean),
        invoiceHistory: invoiceOrder.map((invoiceId) => invoiceMap.get(invoiceId)).filter(Boolean),
        expensesList: expenseOrder.map((expenseId) => expenseMap.get(expenseId)).filter(Boolean),
        summary: {
            pendingInvoices,
            pendingExpenses,
            pendingSaleCancellations,
            pendingTotal: pendingInvoices + pendingExpenses + pendingSaleCancellations,
        },
    };
}

export function mergeSuppliersOfflineState(params: {
    manualSuppliers: any[];
    orders: any[];
}) {
    const queue = getSortedQueue();
    const suppliersMap = new Map<string, any>();
    const supplierOrder: string[] = [];
    const ordersMap = new Map<string, any>();
    const ordersOrder: string[] = [];
    let pendingSuppliers = 0;
    let pendingOrders = 0;

    (Array.isArray(params.manualSuppliers) ? params.manualSuppliers : []).forEach((supplier) => {
        suppliersMap.set(supplier.supplier_id, { ...supplier });
        supplierOrder.push(supplier.supplier_id);
    });

    (Array.isArray(params.orders) ? params.orders : []).forEach((order) => {
        ordersMap.set(order.order_id, { ...order });
        ordersOrder.push(order.order_id);
    });

    queue.forEach((request) => {
        if (request.endpoint === '/suppliers' && request.method === 'POST') {
            pendingSuppliers += 1;
            const supplierId = `offline-supplier-${request.id}`;
            if (!suppliersMap.has(supplierId)) {
                suppliersMap.set(supplierId, {
                    supplier_id: supplierId,
                    ...request.body,
                    offline_pending: true,
                });
                supplierOrder.unshift(supplierId);
            }
            return;
        }

        if (request.endpoint?.startsWith('/suppliers/') && request.method === 'PUT') {
            const supplierId = getEndpointId(request.endpoint, '/suppliers/');
            const current = suppliersMap.get(supplierId);
            if (!current) return;
            suppliersMap.set(supplierId, {
                ...current,
                ...(request.body || {}),
                offline_pending: true,
            });
            return;
        }

        if (request.endpoint?.startsWith('/suppliers/') && request.method === 'DELETE') {
            const supplierId = getEndpointId(request.endpoint, '/suppliers/');
            suppliersMap.delete(supplierId);
            const index = supplierOrder.indexOf(supplierId);
            if (index >= 0) supplierOrder.splice(index, 1);
            return;
        }

        if (request.endpoint === '/orders' && request.method === 'POST') {
            pendingOrders += 1;
            const orderId = `offline-order-${request.id}`;
            if (!ordersMap.has(orderId)) {
                const body = request.body || {};
                const items = Array.isArray(body.items) ? body.items : [];
                const supplier = body.supplier_id ? suppliersMap.get(body.supplier_id) : null;
                ordersMap.set(orderId, {
                    order_id: orderId,
                    supplier_id: body.supplier_id || '',
                    supplier_user_id: body.supplier_user_id || '',
                    supplier_name: supplier?.name || (body.supplier_user_id ? 'Fournisseur marketplace' : 'Fournisseur'),
                    items,
                    total_amount: items.reduce((sum: number, item: any) => sum + (toNumber(item.quantity) * toNumber(item.unit_price)), 0),
                    status: 'pending',
                    created_at: new Date(request.timestamp).toISOString(),
                    expected_delivery: body.expected_delivery,
                    notes: body.notes,
                    offline_pending: true,
                });
                ordersOrder.unshift(orderId);
            }
        }
    });

    return {
        manualSuppliers: supplierOrder.map((supplierId) => suppliersMap.get(supplierId)).filter(Boolean),
        orders: ordersOrder.map((orderId) => ordersMap.get(orderId)).filter(Boolean),
        summary: {
            pendingSuppliers,
            pendingOrders,
            pendingTotal: pendingSuppliers + pendingOrders,
        },
    };
}
