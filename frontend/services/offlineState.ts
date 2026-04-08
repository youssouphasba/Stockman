import type { AccountingSaleHistoryItem, CustomerInvoice, DebtTransaction, Expense } from './api';
import { syncService } from './sync';

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEndpointId(endpoint: string, prefix: string) {
  if (!endpoint.startsWith(prefix)) return '';
  return endpoint.slice(prefix.length).split('/')[0] || '';
}

export async function mergeAccountingOfflineState(params: {
  recentSales: AccountingSaleHistoryItem[];
  invoiceHistory: CustomerInvoice[];
  expensesList: Expense[];
}) {
  const queue = (await syncService.getQueue()).slice().sort((a, b) => a.timestamp - b.timestamp);
  const salesMap = new Map<string, AccountingSaleHistoryItem>();
  const saleOrder: string[] = [];
  const invoiceMap = new Map<string, CustomerInvoice>();
  const invoiceOrder: string[] = [];
  const expenseMap = new Map<string, Expense>();
  const expenseOrder: string[] = [];
  let pendingInvoices = 0;
  let pendingExpenses = 0;

  (params.recentSales || []).forEach((sale) => {
    salesMap.set(sale.sale_id, { ...sale });
    saleOrder.push(sale.sale_id);
  });

  (params.invoiceHistory || []).forEach((invoice) => {
    invoiceMap.set(invoice.invoice_id, { ...invoice });
    invoiceOrder.push(invoice.invoice_id);
  });

  (params.expensesList || []).forEach((expense) => {
    expenseMap.set(expense.expense_id, { ...expense });
    expenseOrder.push(expense.expense_id);
  });

  queue.forEach((action) => {
    if (action.endpoint?.startsWith('/invoices/from-sale/') && action.method === 'POST') {
      pendingInvoices += 1;
      const saleId = getEndpointId(action.endpoint, '/invoices/from-sale/');
      const sale = salesMap.get(saleId);
      const invoiceId = `offline-invoice-${action.id}`;

      if (!invoiceMap.has(invoiceId)) {
        invoiceMap.set(invoiceId, {
          invoice_id: invoiceId,
          invoice_number: `EN-ATT-${saleId.slice(0, 6).toUpperCase()}`,
          invoice_label: 'Facture',
          invoice_prefix: 'SYNC',
          user_id: '',
          store_id: sale?.store_id || '',
          sale_id: saleId,
          customer_id: sale?.customer_id,
          customer_name: sale?.customer_name,
          status: 'pending',
          items: (sale?.items || []).map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            description: item.product_name || 'Article',
            quantity: item.quantity,
            unit_price: item.selling_price,
            line_total: item.total ?? item.selling_price * item.quantity,
          })),
          discount_amount: sale?.discount_amount,
          total_amount: sale?.total_amount || 0,
          payment_method: sale?.payment_method,
          payments: sale?.payments,
          notes: 'Facture créée hors ligne et en attente de synchronisation.',
          issued_at: new Date(action.timestamp).toISOString(),
          created_at: new Date(action.timestamp).toISOString(),
          offline_pending: true,
        } as CustomerInvoice);
        invoiceOrder.unshift(invoiceId);
      }

      if (sale) {
        salesMap.set(saleId, {
          ...sale,
          invoice_id: invoiceId,
          invoice_number: `EN-ATT-${saleId.slice(0, 6).toUpperCase()}`,
          invoice_label: 'Facture',
          offline_pending_invoice: true,
        } as AccountingSaleHistoryItem);
      }
      return;
    }

    if (action.endpoint === '/expenses' && action.method === 'POST') {
      pendingExpenses += 1;
      const expenseId = `offline-expense-${action.id}`;
      if (!expenseMap.has(expenseId)) {
        expenseMap.set(expenseId, {
          expense_id: expenseId,
          user_id: '',
          store_id: action.payload?.store_id,
          category: action.payload?.category || 'other',
          amount: toNumber(action.payload?.amount),
          description: action.payload?.description,
          created_at: new Date(action.timestamp).toISOString(),
          offline_pending: true,
        } as Expense);
        expenseOrder.unshift(expenseId);
      }
      return;
    }

    if (action.endpoint?.startsWith('/expenses/') && action.method === 'DELETE') {
      const expenseId = getEndpointId(action.endpoint, '/expenses/');
      expenseMap.delete(expenseId);
      const index = expenseOrder.indexOf(expenseId);
      if (index >= 0) expenseOrder.splice(index, 1);
    }
  });

  return {
    recentSales: saleOrder.map((saleId) => salesMap.get(saleId)).filter(Boolean) as AccountingSaleHistoryItem[],
    invoiceHistory: invoiceOrder.map((invoiceId) => invoiceMap.get(invoiceId)).filter(Boolean) as CustomerInvoice[],
    expensesList: expenseOrder.map((expenseId) => expenseMap.get(expenseId)).filter(Boolean) as Expense[],
    summary: {
      pendingInvoices,
      pendingExpenses,
      pendingTotal: pendingInvoices + pendingExpenses,
    },
  };
}

export async function mergeCustomersOfflineState(customers: any[]) {
  const queue = (await syncService.getQueue()).slice().sort((a, b) => a.timestamp - b.timestamp);
  const items = new Map<string, any>();
  const order: string[] = [];
  let pendingCustomers = 0;
  let pendingDebtChanges = 0;

  (Array.isArray(customers) ? customers : []).forEach((customer) => {
    items.set(customer.customer_id, { ...customer });
    order.push(customer.customer_id);
  });

  queue.forEach((action) => {
    if (action.endpoint === '/customers' && action.method === 'POST') {
      pendingCustomers += 1;
      const body = action.payload || {};
      const customerId = `offline-customer-${action.id}`;
      if (!items.has(customerId)) {
        items.set(customerId, {
          customer_id: customerId,
          user_id: '',
          loyalty_points: 0,
          total_spent: 0,
          current_debt: 0,
          visit_count: 0,
          average_basket: 0,
          created_at: new Date(action.timestamp).toISOString(),
          ...body,
          offline_pending: true,
          offline_request_id: action.id,
        });
        order.unshift(customerId);
      }
      return;
    }

    if (action.endpoint?.startsWith('/customers/') && action.endpoint.endsWith('/payments') && action.method === 'POST') {
      pendingDebtChanges += 1;
      const customerId = getEndpointId(action.endpoint, '/customers/');
      const current = items.get(customerId);
      if (!current) return;
      const signedAmount = toNumber(action.payload?.amount);
      items.set(customerId, {
        ...current,
        current_debt: toNumber(current.current_debt) - signedAmount,
        offline_pending: true,
        offline_pending_debt: true,
      });
      return;
    }

    if (action.endpoint?.startsWith('/customers/') && action.method === 'PUT') {
      const customerId = getEndpointId(action.endpoint, '/customers/');
      const current = items.get(customerId);
      if (!current) return;
      items.set(customerId, {
        ...current,
        ...(action.payload || {}),
        offline_pending: true,
        offline_request_id: action.id,
      });
      return;
    }

    if (action.endpoint?.startsWith('/customers/') && action.method === 'DELETE') {
      const customerId = getEndpointId(action.endpoint, '/customers/');
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

export async function mergeSuppliersOfflineState(suppliers: any[]) {
  const queue = (await syncService.getQueue()).slice().sort((a, b) => a.timestamp - b.timestamp);
  const items = new Map<string, any>();
  const order: string[] = [];
  let pendingSuppliers = 0;

  (Array.isArray(suppliers) ? suppliers : []).forEach((supplier) => {
    items.set(supplier.supplier_id, { ...supplier });
    order.push(supplier.supplier_id);
  });

  queue.forEach((action) => {
    const isSupplierAction =
      action.entity === 'supplier' ||
      action.endpoint === '/suppliers' ||
      action.endpoint?.startsWith('/suppliers/');

    if (!isSupplierAction) return;

    if (action.type === 'create' || (action.endpoint === '/suppliers' && action.method === 'POST')) {
      pendingSuppliers += 1;
      const supplierId = `offline-supplier-${action.id}`;
      if (!items.has(supplierId)) {
        items.set(supplierId, {
          supplier_id: supplierId,
          user_id: '',
          created_at: new Date(action.timestamp).toISOString(),
          updated_at: new Date(action.timestamp).toISOString(),
          ...(action.payload || {}),
          offline_pending: true,
          offline_request_id: action.id,
        });
        order.unshift(supplierId);
      }
      return;
    }

    const supplierId = action.payload?.supplier_id || action.payload?.id || getEndpointId(action.endpoint || '', '/suppliers/');
    if (!supplierId) return;

    if (action.type === 'update' || action.method === 'PUT') {
      const current = items.get(supplierId);
      if (!current) return;
      items.set(supplierId, {
        ...current,
        ...(action.payload?.data ?? action.payload ?? {}),
        supplier_id: current.supplier_id,
        offline_pending: true,
        offline_request_id: action.id,
        updated_at: new Date(action.timestamp).toISOString(),
      });
      return;
    }

    if (action.type === 'delete' || action.method === 'DELETE') {
      items.delete(supplierId);
      const index = order.indexOf(supplierId);
      if (index >= 0) order.splice(index, 1);
    }
  });

  return {
    suppliers: order.map((supplierId) => items.get(supplierId)).filter(Boolean),
    summary: {
      pendingSuppliers,
      pendingTotal: pendingSuppliers,
    },
  };
}

export async function getPendingDebtEntries(customerId: string): Promise<DebtTransaction[]> {
  const queue = (await syncService.getQueue())
    .filter((action) => action.endpoint === `/customers/${customerId}/payments` && action.method === 'POST')
    .sort((a, b) => b.timestamp - a.timestamp);

  return queue.map((action) => {
    const signedAmount = toNumber(action.payload?.amount);
    const isPayment = signedAmount > 0;
    return {
      type: isPayment ? 'payment' : 'credit_sale',
      amount: signedAmount,
      date: new Date(action.timestamp).toISOString(),
      reference: 'SYNC',
      details: action.payload?.notes || (isPayment ? 'Paiement hors ligne en attente' : 'Dette hors ligne en attente'),
    };
  });
}

export async function mergePosProductsOfflineState(products: any[]) {
  const queue = (await syncService.getQueue()).slice().sort((a, b) => a.timestamp - b.timestamp);
  const items = new Map<string, any>();

  (Array.isArray(products) ? products : []).forEach((product) => {
    items.set(product.product_id, { ...product });
  });

  queue.forEach((action) => {
    if (action.endpoint !== '/sales' || action.method !== 'POST') return;
    const saleItems = Array.isArray(action.payload?.items) ? action.payload.items : [];
    saleItems.forEach((saleItem: any) => {
      const current = items.get(saleItem.product_id);
      if (!current) return;
      const quantity = toNumber(saleItem.quantity, 0);
      items.set(saleItem.product_id, {
        ...current,
        quantity: Math.max(0, toNumber(current.quantity) - quantity),
        offline_pending_sale: true,
      });
    });
  });

  return Array.from(items.values());
}
