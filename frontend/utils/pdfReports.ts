import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Sale, OrderFull, Store } from '../services/api';
import { formatCurrency } from './format';

type ReportSection = {
  title: string;
  headers: string[];
  rows: string[][];
  alignRight?: number[]; // column indices to align right
};

type ReportConfig = {
  storeName: string;
  storeAddress?: string;
  reportTitle: string;
  subtitle?: string;
  primaryColor?: string;
  kpis?: { label: string; value: string; color?: string }[];
  sections: ReportSection[];
};

function buildHtml(config: ReportConfig): string {
  const color = config.primaryColor || '#6C63FF';

  const kpisHtml = config.kpis?.length
    ? `<div class="kpi-grid">${config.kpis.map((k) => `
        <div class="kpi-card">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value" ${k.color ? `style="color:${k.color}"` : ''}>${k.value}</div>
        </div>`).join('')}
      </div>`
    : '';

  const sectionsHtml = config.sections
    .map((s) => {
      const thHtml = s.headers
        .map((h, i) => `<th ${s.alignRight?.includes(i) ? 'style="text-align:right"' : ''}>${h}</th>`)
        .join('');

      const rowsHtml = s.rows.length > 0
        ? s.rows.map((row) =>
          `<tr>${row.map((cell, i) =>
            `<td style="padding:10px 5px; border-bottom:1px solid #eee; ${s.alignRight?.includes(i) ? 'text-align:right;' : ''}">${cell}</td>`
          ).join('')}</tr>`
        ).join('')
        : `<tr><td colspan="${s.headers.length}" style="text-align:center; padding:20px; color:#999;">Aucune donnée</td></tr>`;

      return `
        <section>
          <h3>${s.title}</h3>
          <table>
            <thead><tr>${thHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </section>`;
    })
    .join('');

  return `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica','Arial',sans-serif; color:#333; max-width:800px; margin:0 auto; padding:20px; line-height:1.5; }
        .header { text-align:center; margin-bottom:30px; padding-bottom:20px; border-bottom:2px solid ${color}; }
        .header h1 { margin:0; color:${color}; text-transform:uppercase; letter-spacing:1px; }
        .header p { margin:5px 0; color:#666; font-size:14px; }
        .report-title { text-align:center; background:#f4f4f4; padding:15px; border-radius:8px; margin-bottom:30px; }
        .report-title h2 { margin:0; color:#333; }
        .report-title p { margin:5px 0 0; color:#666; font-size:13px; }
        .kpi-grid { display:flex; flex-wrap:wrap; gap:15px; margin-bottom:30px; }
        .kpi-card { flex:1; min-width:120px; background:#fff; padding:12px; border-radius:8px; border:1px solid #eee; text-align:center; }
        .kpi-label { font-size:11px; color:#888; text-transform:uppercase; margin-bottom:4px; }
        .kpi-value { font-size:16px; font-weight:bold; color:${color}; }
        section { margin-bottom:35px; }
        h3 { border-left:4px solid ${color}; padding-left:10px; margin-bottom:15px; font-size:15px; }
        table { width:100%; border-collapse:collapse; }
        th { text-align:left; padding:10px 5px; background:${color}; color:white; font-size:11px; text-transform:uppercase; }
        td { font-size:12px; }
        .footer { margin-top:40px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${config.storeName}</h1>
        ${config.storeAddress ? `<p>${config.storeAddress}</p>` : ''}
      </div>
      <div class="report-title">
        <h2>${config.reportTitle}</h2>
        ${config.subtitle ? `<p>${config.subtitle}</p>` : ''}
      </div>
      ${kpisHtml}
      ${sectionsHtml}
      <div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} par Stockman</div>
    </body>
    </html>
  `;
}

export async function generateAndSharePdf(config: ReportConfig): Promise<void> {
  const html = buildHtml(config);
  await printAndShare(html, config.reportTitle);
}

export async function printAndShare(html: string, title: string) {
  if (Platform.OS === 'web') {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentWindow?.document.open();
    iframe.contentWindow?.document.write(html);
    iframe.contentWindow?.document.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: title,
    });
  }
}

export async function generateSalePdf(sale: Sale, store: Store, currency?: string): Promise<void> {
  const itemsHtml = sale.items.map(item => `
    <tr>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:center">${item.quantity}</td>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(item.selling_price, currency)}</td>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(item.total, currency)}</td>
    </tr>
  `).join('');

  const date = new Date(sale.created_at).toLocaleDateString('fr-FR');
  const ref = `REC-${sale.sale_id.slice(-6).toUpperCase()}`;

  const html = buildProfessionalInvoiceHtml({
    store,
    title: "REÇU DE VENTE",
    ref,
    date,
    recipientLabel: "Client",
    recipientName: sale.customer_id || "Client Divers",
    itemsHtml,
    total: sale.total_amount,
    currency,
    paymentMethod: sale.payment_method
  });

  await printAndShare(html, `Recu_${ref}`);
}

export async function generatePurchaseOrderPdf(order: OrderFull, store: Store, currency?: string): Promise<void> {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:center">${item.quantity}</td>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(item.unit_price, currency)}</td>
      <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(item.total_price, currency)}</td>
    </tr>
  `).join('');

  const date = new Date(order.created_at).toLocaleDateString('fr-FR');
  const ref = `CMD-${order.order_id.slice(-6).toUpperCase()}`;

  const html = buildProfessionalInvoiceHtml({
    store,
    title: "BON DE COMMANDE",
    ref,
    date,
    recipientLabel: "Fournisseur",
    recipientName: order.supplier.name,
    itemsHtml,
    total: order.total_amount,
    currency,
    notes: order.notes
  });

  await printAndShare(html, `Commande_${ref}`);
}

export type InvoiceData = {
  store: Store;
  title: string;
  ref: string;
  date: string;
  recipientLabel: string;
  recipientName: string;
  itemsHtml: string;
  total: number;
  currency?: string;
  paymentMethod?: string;
  notes?: string;
};

export function buildProfessionalInvoiceHtml(data: InvoiceData) {
  const primaryColor = '#6C63FF';
  return `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid ${primaryColor}; }
        .company-info h1 { margin: 0; color: ${primaryColor}; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
        .company-info p { margin: 5px 0; color: #666; font-size: 14px; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { margin: 0 0 10px 0; color: #333; font-size: 24px; }
        .meta-item { margin-bottom: 5px; font-size: 14px; }
        .meta-label { font-weight: bold; color: #555; }
        
        .client-section { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid ${primaryColor}; }
        .client-label { font-size: 12px; text-transform: uppercase; color: #888; font-weight: bold; margin-bottom: 5px; }
        .client-name { font-size: 18px; font-weight: bold; color: #333; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { text-align: left; padding: 12px 15px; background-color: ${primaryColor}; color: white; font-weight: 600; text-transform: uppercase; font-size: 12px; }
        td { padding: 12px 15px; border-bottom: 1px solid #eee; font-size: 14px; }
        tr:nth-child(even) { background-color: #f8f9fa; }
        
        .total-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
        .total-box { width: 250px; background: #f9fafb; padding: 20px; border-radius: 8px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
        .grand-total { border-top: 2px solid ${primaryColor}; padding-top: 10px; margin-top: 10px; font-weight: bold; font-size: 18px; color: ${primaryColor}; }
        
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999; }
        .notes { margin-top: 20px; font-style: italic; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${data.store.name}</h1>
          <p>${data.store.address || ''}</p>
        </div>
        <div class="invoice-details">
          <h2>${data.title}</h2>
          <div class="meta-item"><span class="meta-label">Réf:</span> ${data.ref}</div>
          <div class="meta-item"><span class="meta-label">Date:</span> ${data.date}</div>
        </div>
      </div>

      <div class="client-section">
        <div class="client-label">${data.recipientLabel}</div>
        <div class="client-name">${data.recipientName}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center">Qté</th>
            <th style="text-align:right">Prix Unitaire</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${data.itemsHtml}</tbody>
      </table>

      <div class="total-section">
        <div class="total-box">
          <div class="total-row">
            <span>Total:</span>
            <span class="grand-total">${formatCurrency(data.total, data.currency)}</span>
          </div>
          ${data.paymentMethod ? `<div style="margin-top: 10px; font-size: 12px; color: #666; text-align: right;">Payé par: ${data.paymentMethod}</div>` : ''}
        </div>
      </div>

      ${data.notes ? `<div class="notes">Notes: ${data.notes}</div>` : ''}

      <div class="footer">
        Généré par Stockman le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
      </div>
    </body>
    </html>
  `;
}


export async function generateProductLabelPdf(product: Product, storeName: string): Promise<void> {
  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: 'Helvetica', 'Arial', sans-serif; 
          margin: 0; 
          padding: 10px; 
          width: 200px;
          height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .store { font-size: 8px; color: #666; margin-bottom: 2px; text-transform: uppercase; }
        .name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
        .barcode-container { margin-bottom: 5px; }
        .barcode-svg { width: 150px; height: 40px; }
        .sku { font-size: 10px; font-family: monospace; }
        .rfid { 
          margin-top: 5px; 
          font-size: 8px; 
          color: #444; 
          background: #f0f0f0; 
          padding: 2px 4px; 
          border-radius: 2px;
          border: 1px dashed #ccc;
        }
      </style>
    </head>
    <body>
      <div class="store">${storeName}</div>
      <div class="name">${product.name.substring(0, 25)}${product.name.length > 25 ? '...' : ''}</div>
      
      ${product.sku ? `
        <div class="barcode-container">
          <div class="sku">${product.sku}</div>
        </div>
      ` : ''}

      ${product.rfid_tag ? `
        <div class="rfid">RFID: ${product.rfid_tag}</div>
      ` : ''}
      
      <div style="font-size: 8px; margin-top: 4px; color: #999;">Stockman</div>
    </body>
    </html>
  `;

  await printAndShare(html, `Label_${product.name}`);
}
