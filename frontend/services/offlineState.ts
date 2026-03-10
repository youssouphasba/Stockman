import type { AccountingSaleHistoryItem, CustomerInvoice, Expense } from './api';
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
