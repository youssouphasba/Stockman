/**
 * ExportService.ts — Stockman Professional Export Engine
 * Handles Excel (XLSX) and PDF exports with consistent branding.
 * All functions are client-side safe (browser only).
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ExcelColumn {
    key: string;
    label: string;
    /** Column width in characters */
    width?: number;
    type?: 'text' | 'number' | 'currency' | 'date' | 'percent';
    /** Custom value formatter */
    format?: (value: any, row?: any) => string | number;
}

export interface ExcelSheet {
    name: string;
    columns: ExcelColumn[];
    data: any[];
    /** Rows appended at the bottom after an empty separator */
    summaryRows?: Array<[string, string | number]>;
}

export interface ExcelConfig {
    title: string;
    period?: string;
    storeName?: string;
    filename: string;
    sheets: ExcelSheet[];
}

export interface PDFSection {
    title?: string;
    columns: ExcelColumn[];
    data: any[];
    kpiCards?: Array<{ label: string; value: string }>;
}

export interface PDFConfig {
    title: string;
    subtitle?: string;
    period?: string;
    storeName?: string;
    filename: string;
    sections: PDFSection[];
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function buildWorksheet(sheetConfig: ExcelSheet, meta: { title: string; period?: string }): XLSX.WorkSheet {
    const { columns, data, summaryRows } = sheetConfig;
    const today = new Date().toLocaleDateString('fr-FR');
    const periodStr = meta.period ? `Période : ${meta.period}` : `Généré le : ${today}`;

    // Title block (rows 0-2)
    const titleRow = [`STOCKMAN — ${meta.title.toUpperCase()}`];
    const infoRow = [periodStr, '', `Exporté le : ${today}`];
    const emptyRow: string[] = [];
    const headerRow = columns.map(c => c.label);

    // Data rows
    const dataRows = data.map(item =>
        columns.map(col => {
            const raw = item[col.key];
            if (col.format) return col.format(raw, item);
            if (raw === null || raw === undefined) return '';
            if (col.type === 'date' && raw) {
                try { return new Date(raw).toLocaleDateString('fr-FR'); } catch { return String(raw); }
            }
            if ((col.type === 'number' || col.type === 'currency') && raw !== '') {
                const n = Number(raw);
                return isNaN(n) ? raw : n;
            }
            return raw;
        })
    );

    // Build full array-of-arrays
    const aoa: any[][] = [
        titleRow,    // row 0
        infoRow,     // row 1
        emptyRow,    // row 2
        headerRow,   // row 3
        ...dataRows, // rows 4+
    ];

    // Summary block
    if (summaryRows && summaryRows.length > 0) {
        aoa.push([]); // separator
        summaryRows.forEach(([label, value]) => aoa.push([label, value]));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge title across all columns
    if (columns.length > 1) {
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
        ];
    }

    // Column widths
    ws['!cols'] = columns.map(c => ({ wch: c.width || 20 }));

    // Freeze header row (row index 3 = 4th row)
    ws['!freeze'] = { xSplit: 0, ySplit: 4 };

    return ws;
}

export function exportToExcel(config: ExcelConfig): void {
    const wb = XLSX.utils.book_new();

    config.sheets.forEach(sheet => {
        const ws = buildWorksheet(sheet, { title: config.title, period: config.period });
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
    });

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${config.filename}_${date}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────────────────────

const C_PRIMARY: [number, number, number] = [59, 130, 246];
const C_DARK: [number, number, number] = [15, 23, 42];
const C_LIGHT: [number, number, number] = [248, 250, 252];
const C_GRAY: [number, number, number] = [100, 116, 139];
const C_WHITE: [number, number, number] = [255, 255, 255];
const C_ACCENT: [number, number, number] = [16, 185, 129]; // Emerald for positive highlights

function drawPageHeader(doc: any, config: PDFConfig): void {
    const pageW = doc.internal.pageSize.getWidth();

    // Background bar
    doc.setFillColor(...C_LIGHT);
    doc.rect(0, 0, pageW, 46, 'F');

    // Blue accent strip on left
    doc.setFillColor(...C_PRIMARY);
    doc.rect(0, 0, 5, 46, 'F');

    // Company name
    doc.setTextColor(...C_PRIMARY);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('STOCKMAN', 13, 17);

    // Separator dot
    doc.setTextColor(...C_GRAY);
    doc.setFontSize(18);
    doc.text('·', 65, 17);

    // Report title next to logo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_DARK);
    doc.text(config.title, 72, 17);

    // Subtitle (if any)
    if (config.subtitle) {
        doc.setFontSize(8);
        doc.setTextColor(...C_GRAY);
        doc.text(config.subtitle, 13, 27);
    }

    // Divider line
    doc.setDrawColor(...C_PRIMARY);
    doc.setLineWidth(0.4);
    doc.line(13, 32, pageW - 12, 32);

    // Meta info below the line
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_GRAY);

    const metaParts: string[] = [];
    if (config.storeName) metaParts.push(`Magasin : ${config.storeName}`);
    if (config.period) metaParts.push(`Période : ${config.period}`);
    const now = new Date();
    metaParts.push(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);

    doc.text(metaParts.join('    |    '), 13, 40);
}

function drawPageFooters(doc: any): void {
    const pageW = doc.internal.pageSize.getWidth();
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...C_LIGHT);
        doc.rect(0, 285, pageW, 12, 'F');
        doc.setDrawColor(...C_PRIMARY);
        doc.setLineWidth(0.3);
        doc.line(0, 285, pageW, 285);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C_GRAY);
        doc.text('STOCKMAN — Document confidentiel — Usage interne uniquement', 13, 291);
        doc.text(`Page ${i} / ${pageCount}`, pageW - 13, 291, { align: 'right' });
    }
}

export function exportToPDF(config: PDFConfig): void {
    const doc = new jsPDF() as any;
    const pageW = doc.internal.pageSize.getWidth();

    drawPageHeader(doc, config);

    let y = 55;

    config.sections.forEach((section, idx) => {
        // New page if running out of space
        if (y > 240 && idx > 0) {
            doc.addPage();
            y = 15;
        }

        // ── Section title ──
        if (section.title) {
            doc.setFillColor(...C_PRIMARY);
            doc.rect(12, y, 3, 7, 'F');
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C_DARK);
            doc.text(section.title, 18, y + 5.5);
            y += 13;
        }

        // ── KPI Cards ──
        if (section.kpiCards && section.kpiCards.length > 0) {
            const cards = section.kpiCards;
            const gap = 4;
            const cardW = (pageW - 24 - gap * (cards.length - 1)) / cards.length;

            cards.forEach((card, ci) => {
                const cx = 12 + ci * (cardW + gap);
                doc.setDrawColor(210, 225, 245);
                doc.setFillColor(...C_WHITE);
                doc.roundedRect(cx, y, cardW, 22, 2, 2, 'FD');

                // Top accent line on card
                doc.setFillColor(...C_PRIMARY);
                doc.rect(cx, y, cardW, 2, 'F');

                doc.setFontSize(6);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C_GRAY);
                const labelText = card.label.toUpperCase();
                doc.text(labelText, cx + 4, y + 9);

                doc.setFontSize(9.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C_DARK);
                const val = String(card.value);
                doc.text(val.length > 20 ? val.substring(0, 20) : val, cx + 4, y + 18);
            });

            y += 30;
        }

        // ── Data Table ──
        if (section.data.length > 0 && section.columns.length > 0) {
            const headers = section.columns.map(c => c.label);
            const rows = section.data.map(item =>
                section.columns.map(col => {
                    const val = item[col.key];
                    if (col.format) return String(col.format(val, item));
                    if (val === null || val === undefined) return '–';
                    if (col.type === 'date' && val) {
                        try { return new Date(val).toLocaleDateString('fr-FR'); } catch { return String(val); }
                    }
                    if ((col.type === 'number' || col.type === 'currency') && typeof val === 'number') {
                        return val.toLocaleString('fr-FR');
                    }
                    return String(val);
                })
            );

            autoTable(doc, {
                startY: y,
                head: [headers],
                body: rows,
                theme: 'striped',
                headStyles: {
                    fillColor: C_PRIMARY,
                    textColor: C_WHITE,
                    fontStyle: 'bold',
                    fontSize: 7.5,
                    cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
                },
                bodyStyles: {
                    fontSize: 7,
                    cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
                    textColor: C_DARK,
                    lineColor: [230, 235, 245],
                    lineWidth: 0.1,
                },
                alternateRowStyles: {
                    fillColor: [242, 246, 253],
                },
                margin: { left: 12, right: 12 },
                didDrawPage: () => {
                    // Redraw header on subsequent pages
                },
            });

            y = (doc as any).lastAutoTable.finalY + 14;
        }
    });

    drawPageFooters(doc);

    const date = new Date().toISOString().split('T')[0];
    doc.save(`${config.filename}_${date}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-BUILT MODULE EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Export the full product inventory */
export function exportInventory(
    products: any[],
    currency = 'F',
    format: 'excel' | 'pdf' = 'excel'
): void {
    const prepared = products.map(p => ({
        ...p,
        category: p.category_name || p.category || '–',
        location: p.location_name || p.location || '–',
        margin_pct:
            p.selling_price && p.purchase_price && p.selling_price > 0
                ? `${(((p.selling_price - p.purchase_price) / p.selling_price) * 100).toFixed(1)}%`
                : '–',
        stock_status:
            (p.quantity || 0) <= 0
                ? 'Rupture'
                : (p.quantity || 0) <= (p.min_stock || 0)
                ? 'Critique'
                : 'Normal',
        stock_value: (p.quantity || 0) * (p.purchase_price || 0),
    }));

    const allCols: ExcelColumn[] = [
        { key: 'sku', label: 'SKU / Code', width: 16 },
        { key: 'name', label: 'Nom du Produit', width: 34 },
        { key: 'category', label: 'Catégorie', width: 20 },
        { key: 'quantity', label: 'Stock Actuel', width: 14, type: 'number' },
        { key: 'unit', label: 'Unité', width: 10 },
        { key: 'min_stock', label: 'Stock Min', width: 12, type: 'number' },
        { key: 'max_stock', label: 'Stock Max', width: 12, type: 'number' },
        { key: 'purchase_price', label: `Prix Achat (${currency})`, width: 20, type: 'number' },
        { key: 'selling_price', label: `Prix Vente (${currency})`, width: 20, type: 'number' },
        { key: 'margin_pct', label: 'Marge %', width: 12 },
        { key: 'stock_value', label: `Val. Stock (${currency})`, width: 20, type: 'number' },
        { key: 'location', label: 'Emplacement', width: 20 },
        { key: 'stock_status', label: 'Statut Stock', width: 14 },
        { key: 'description', label: 'Description', width: 40 },
    ];

    const alertCols = allCols.slice(0, 10);

    const totalValue = prepared.reduce((s, p) => s + (p.stock_value || 0), 0);
    const outOfStock = prepared.filter(p => (p.quantity || 0) <= 0).length;
    const critical = prepared.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) <= (p.min_stock || 0)).length;
    const alertList = prepared.filter(p => (p.quantity || 0) <= (p.min_stock || 0));

    if (format === 'excel') {
        exportToExcel({
            title: 'Inventaire Produits',
            filename: 'Stockman_Inventaire',
            sheets: [
                {
                    name: 'Inventaire Complet',
                    columns: allCols,
                    data: prepared,
                    summaryRows: [
                        ['TOTAL PRODUITS', prepared.length],
                        [`VALEUR STOCK TOTAL (${currency})`, totalValue],
                        ['EN RUPTURE DE STOCK', outOfStock],
                        ['STOCK CRITIQUE (< min)', critical],
                        ['PRODUITS NORMAUX', prepared.length - outOfStock - critical],
                    ],
                },
                {
                    name: 'Alertes & Ruptures',
                    columns: alertCols,
                    data: alertList,
                    summaryRows: [
                        ['TOTAL ALERTES', alertList.length],
                    ],
                },
            ],
        });
    } else {
        exportToPDF({
            title: 'Inventaire Produits',
            filename: 'Stockman_Inventaire',
            sections: [
                {
                    title: 'Résumé Inventaire',
                    columns: [],
                    data: [],
                    kpiCards: [
                        { label: 'Total Produits', value: String(prepared.length) },
                        { label: `Valeur du Stock`, value: `${totalValue.toLocaleString('fr-FR')} ${currency}` },
                        { label: 'Ruptures', value: String(outOfStock) },
                        { label: 'Stock Critique', value: String(critical) },
                    ],
                },
                {
                    title: 'Liste Complète',
                    columns: allCols.slice(0, 10),
                    data: prepared,
                },
            ],
        });
    }
}

/** Export CRM customer list */
export function exportCRM(
    customers: any[],
    currency = 'F',
    format: 'excel' | 'pdf' = 'excel'
): void {
    const prepared = customers.map(c => {
        const spent = c.total_spent || 0;
        const tier =
            spent > 1_000_000 ? 'Platine' :
            spent > 500_000 ? 'Or' :
            spent > 100_000 ? 'Argent' : 'Bronze';
        return { ...c, tier_label: tier };
    });

    const columns: ExcelColumn[] = [
        { key: 'name', label: 'Nom Complet', width: 28 },
        { key: 'phone', label: 'Téléphone', width: 18 },
        { key: 'email', label: 'Email', width: 30 },
        { key: 'category', label: 'Catégorie', width: 16 },
        { key: 'tier_label', label: 'Niveau Fidélité', width: 16 },
        { key: 'loyalty_points', label: 'Points', width: 12, type: 'number' },
        { key: 'total_spent', label: `Total Dépensé (${currency})`, width: 22, type: 'number' },
        { key: 'total_debt', label: `Dette (${currency})`, width: 18, type: 'number' },
        { key: 'birthday', label: 'Anniversaire', width: 16, type: 'date' },
        { key: 'notes', label: 'Notes', width: 35 },
    ];

    const vipList = prepared.filter(c => ['Or', 'Platine'].includes(c.tier_label));
    const totalDebt = prepared.reduce((s, c) => s + (c.total_debt || 0), 0);
    const totalRevenue = prepared.reduce((s, c) => s + (c.total_spent || 0), 0);

    if (format === 'excel') {
        exportToExcel({
            title: 'CRM — Liste Clients',
            filename: 'Stockman_CRM',
            sheets: [
                {
                    name: 'Tous les Clients',
                    columns,
                    data: prepared,
                    summaryRows: [
                        ['TOTAL CLIENTS', prepared.length],
                        [`DETTE TOTALE (${currency})`, totalDebt],
                        [`REVENUS GÉNÉRÉS (${currency})`, totalRevenue],
                        ['CLIENTS VIP (Or + Platine)', vipList.length],
                    ],
                },
                {
                    name: 'Clients VIP',
                    columns,
                    data: vipList,
                    summaryRows: [
                        ['TOTAL VIP', vipList.length],
                        [`REVENUS VIP (${currency})`, vipList.reduce((s, c) => s + (c.total_spent || 0), 0)],
                    ],
                },
            ],
        });
    } else {
        exportToPDF({
            title: 'Rapport CRM Clients',
            filename: 'Stockman_CRM',
            sections: [
                {
                    title: 'Indicateurs Clés',
                    columns: [],
                    data: [],
                    kpiCards: [
                        { label: 'Total Clients', value: String(prepared.length) },
                        { label: `CA Clients`, value: `${totalRevenue.toLocaleString('fr-FR')} ${currency}` },
                        { label: `Dette Totale`, value: `${totalDebt.toLocaleString('fr-FR')} ${currency}` },
                        { label: 'Clients VIP', value: String(vipList.length) },
                    ],
                },
                {
                    title: 'Liste des Clients',
                    columns: columns.slice(0, 8),
                    data: prepared,
                },
            ],
        });
    }
}

/** Export accounting financial report */
export function exportAccounting(
    stats: any,
    expenses: any[],
    currency = 'F',
    period = 30,
    format: 'excel' | 'pdf' = 'excel'
): void {
    const periodLabel = stats?.period_label || `Derniers ${period} jours`;

    const productPerf = (stats?.product_performance || [])
        .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
        .map((p: any) => ({
            ...p,
            margin: (p.revenue || 0) - (p.cogs || 0),
            margin_pct:
                p.revenue > 0
                    ? `${((((p.revenue || 0) - (p.cogs || 0)) / p.revenue) * 100).toFixed(1)}%`
                    : '0%',
        }));

    const perfCols: ExcelColumn[] = [
        { key: 'name', label: 'Produit', width: 32 },
        { key: 'qty_sold', label: 'Qté Vendue', width: 14, type: 'number' },
        { key: 'revenue', label: `Ventes (${currency})`, width: 20, type: 'number' },
        { key: 'cogs', label: `Coût (${currency})`, width: 20, type: 'number' },
        { key: 'margin', label: `Marge (${currency})`, width: 20, type: 'number' },
        { key: 'margin_pct', label: 'Marge %', width: 12 },
    ];

    const expCols: ExcelColumn[] = [
        { key: 'created_at', label: 'Date', width: 16, type: 'date' },
        { key: 'category', label: 'Catégorie', width: 22 },
        { key: 'description', label: 'Description', width: 38 },
        { key: 'amount', label: `Montant (${currency})`, width: 20, type: 'number' },
    ];

    const summCols: ExcelColumn[] = [
        { key: 'label', label: 'Indicateur Financier', width: 38 },
        { key: 'value', label: `Montant (${currency})`, width: 24 },
    ];

    const totalRevenue = stats?.revenue || 0;
    const grossProfit = stats?.gross_profit || 0;
    const netProfit = stats?.net_profit || 0;
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const cogs = totalRevenue - grossProfit;
    const netMarginPct = totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : '0%';

    const summaryData = [
        { label: 'Chiffre d\'affaires (CA)', value: totalRevenue },
        { label: 'Coût des marchandises vendues (COGS)', value: cogs },
        { label: 'Marge brute', value: grossProfit },
        { label: 'Marge brute %', value: totalRevenue > 0 ? `${((grossProfit / totalRevenue) * 100).toFixed(1)}%` : '0%' },
        { label: 'Dépenses opérationnelles', value: totalExpenses },
        { label: 'Bénéfice net', value: netProfit },
        { label: 'Marge nette %', value: netMarginPct },
    ];

    if (format === 'excel') {
        exportToExcel({
            title: 'Rapport Financier',
            period: periodLabel,
            filename: 'Stockman_Comptabilite',
            sheets: [
                {
                    name: 'Résumé Financier',
                    columns: summCols,
                    data: summaryData,
                },
                {
                    name: 'Performance Produits',
                    columns: perfCols,
                    data: productPerf,
                    summaryRows: [
                        [`CA Total (${currency})`, totalRevenue],
                        [`Marge Brute Totale (${currency})`, grossProfit],
                    ],
                },
                {
                    name: 'Dépenses',
                    columns: expCols,
                    data: expenses,
                    summaryRows: [
                        [`TOTAL DÉPENSES (${currency})`, totalExpenses],
                    ],
                },
            ],
        });
    } else {
        exportToPDF({
            title: 'Rapport Financier',
            period: periodLabel,
            filename: 'Stockman_Comptabilite',
            sections: [
                {
                    title: 'Résumé Financier',
                    columns: [],
                    data: [],
                    kpiCards: [
                        { label: 'Chiffre d\'Affaires', value: `${totalRevenue.toLocaleString('fr-FR')} ${currency}` },
                        { label: 'Marge Brute', value: `${grossProfit.toLocaleString('fr-FR')} ${currency}` },
                        { label: 'Dépenses', value: `${totalExpenses.toLocaleString('fr-FR')} ${currency}` },
                        { label: 'Bénéfice Net', value: `${netProfit.toLocaleString('fr-FR')} ${currency}` },
                    ],
                },
                {
                    title: 'Indicateurs Financiers Détaillés',
                    columns: summCols,
                    data: summaryData,
                },
                {
                    title: 'Top Produits par Performance',
                    columns: perfCols,
                    data: productPerf.slice(0, 30),
                },
                {
                    title: 'Dépenses Opérationnelles',
                    columns: expCols,
                    data: expenses,
                },
            ],
        });
    }
}

/** Export supplier orders list */
export function exportOrders(
    orders: any[],
    currency = 'F',
    format: 'excel' | 'pdf' = 'excel'
): void {
    const STATUS_FR: Record<string, string> = {
        pending: 'En attente',
        ordered: 'Commandé',
        received: 'Reçu',
        partial: 'Partiel',
        cancelled: 'Annulé',
    };

    const prepared = orders.map(o => ({
        ...o,
        supplier_name: o.supplier_name || o.supplier?.name || '–',
        items_count: (o.items || []).length,
        total_amount:
            o.total_amount ||
            (o.items || []).reduce((s: number, i: any) => s + (i.total_price || 0), 0) ||
            0,
        status_label: STATUS_FR[o.status] || o.status || '–',
    }));

    const columns: ExcelColumn[] = [
        { key: 'order_number', label: 'N° Commande', width: 18 },
        { key: 'supplier_name', label: 'Fournisseur', width: 26 },
        { key: 'created_at', label: 'Date', width: 16, type: 'date' },
        { key: 'status_label', label: 'Statut', width: 16 },
        { key: 'items_count', label: 'Nb Articles', width: 14, type: 'number' },
        { key: 'total_amount', label: `Montant (${currency})`, width: 20, type: 'number' },
        { key: 'notes', label: 'Notes', width: 35 },
    ];

    const totalAmount = prepared.reduce((s, o) => s + (o.total_amount || 0), 0);
    const pending = prepared.filter(o => ['pending', 'ordered'].includes(o.status)).length;
    const received = prepared.filter(o => o.status === 'received').length;

    if (format === 'excel') {
        exportToExcel({
            title: 'Commandes Fournisseurs',
            filename: 'Stockman_Commandes',
            sheets: [
                {
                    name: 'Commandes',
                    columns,
                    data: prepared,
                    summaryRows: [
                        ['TOTAL COMMANDES', prepared.length],
                        [`MONTANT TOTAL (${currency})`, totalAmount],
                        ['EN ATTENTE / EN COURS', pending],
                        ['REÇUES', received],
                        ['ANNULÉES', prepared.filter(o => o.status === 'cancelled').length],
                    ],
                },
            ],
        });
    } else {
        exportToPDF({
            title: 'Commandes Fournisseurs',
            filename: 'Stockman_Commandes',
            sections: [
                {
                    title: 'Vue d\'Ensemble',
                    columns: [],
                    data: [],
                    kpiCards: [
                        { label: 'Total Commandes', value: String(prepared.length) },
                        { label: `Montant Total`, value: `${totalAmount.toLocaleString('fr-FR')} ${currency}` },
                        { label: 'En Attente', value: String(pending) },
                        { label: 'Reçues', value: String(received) },
                    ],
                },
                {
                    title: 'Liste des Commandes',
                    columns,
                    data: prepared,
                },
            ],
        });
    }
}

/** Export activity/audit logs */
export function exportActivity(
    logs: any[],
    format: 'excel' | 'pdf' = 'excel'
): void {
    const columns: ExcelColumn[] = [
        { key: 'created_at', label: 'Date / Heure', width: 22, type: 'date' },
        { key: 'module', label: 'Module', width: 16 },
        { key: 'action', label: 'Action', width: 28 },
        { key: 'user_name', label: 'Utilisateur', width: 24 },
        { key: 'description', label: 'Détails', width: 48 },
    ];

    const prepared = logs.map(l => ({
        ...l,
        created_at: l.created_at || l.timestamp || '',
        user_name: l.user_name || l.user?.name || l.user_email || '–',
        description: l.description || l.details || l.message || '–',
    }));

    if (format === 'excel') {
        exportToExcel({
            title: 'Journal d\'Activité',
            filename: 'Stockman_Activite',
            sheets: [
                {
                    name: 'Journal',
                    columns,
                    data: prepared,
                    summaryRows: [
                        ['TOTAL ENTRÉES', prepared.length],
                        ['PÉRIODE', `${prepared.length > 0 ? new Date(prepared[prepared.length - 1].created_at).toLocaleDateString('fr-FR') : '–'} → ${prepared.length > 0 ? new Date(prepared[0].created_at).toLocaleDateString('fr-FR') : '–'}`],
                    ],
                },
            ],
        });
    } else {
        exportToPDF({
            title: 'Journal d\'Activité Système',
            filename: 'Stockman_Activite',
            sections: [
                {
                    title: 'Journal d\'Audit Complet',
                    columns,
                    data: prepared,
                },
            ],
        });
    }
}

/** Export dashboard KPIs and stats */
export function exportDashboard(
    data: any,
    currency = 'F',
    period = 30,
    format: 'excel' | 'pdf' = 'excel'
): void {
    const kpiRows = [
        { label: 'CA Aujourd\'hui', valeur: data?.today_revenue || 0 },
        { label: 'Ventes Aujourd\'hui (nb)', valeur: data?.today_sales_count || 0 },
        { label: 'CA du Mois en cours', valeur: data?.month_revenue || 0 },
        { label: 'Valeur totale du Stock', valeur: data?.total_stock_value || 0 },
        { label: 'Produits en Rupture', valeur: data?.out_of_stock_count || 0 },
        { label: 'Stock Faible (< min)', valeur: data?.low_stock_count || 0 },
        { label: 'Nouveaux Clients (mois)', valeur: data?.new_customers_month || 0 },
        { label: 'Marge Brute Estimée', valeur: data?.gross_profit || 0 },
    ];

    const kpiCols: ExcelColumn[] = [
        { key: 'label', label: 'Indicateur', width: 38 },
        { key: 'valeur', label: `Valeur (${currency} ou nb)`, width: 24, type: 'number' },
    ];

    const rawSales = data?.sales_chart || data?.daily_revenue || data?.revenue_chart || [];
    const salesData = rawSales.map((d: any) => ({
        date: d.date || d.day || d._id || '–',
        revenue: d.revenue || d.total || d.amount || 0,
        orders: d.orders || d.count || d.sales_count || 0,
    }));

    const salesCols: ExcelColumn[] = [
        { key: 'date', label: 'Date', width: 18 },
        { key: 'revenue', label: `CA (${currency})`, width: 20, type: 'number' },
        { key: 'orders', label: 'Nb Ventes', width: 14, type: 'number' },
    ];

    if (format === 'excel') {
        const sheets: ExcelSheet[] = [
            { name: 'Indicateurs KPI', columns: kpiCols, data: kpiRows },
        ];
        if (salesData.length > 0) {
            sheets.push({
                name: 'Ventes Quotidiennes',
                columns: salesCols,
                data: salesData,
                summaryRows: [
                    [`CA Total (${currency})`, salesData.reduce((s: number, d: any) => s + (d.revenue || 0), 0)],
                    ['Total Transactions', salesData.reduce((s: number, d: any) => s + (d.orders || 0), 0)],
                ],
            });
        }
        exportToExcel({
            title: 'Tableau de Bord',
            period: `Derniers ${period} jours`,
            filename: 'Stockman_Dashboard',
            sheets,
        });
    } else {
        const sections: PDFSection[] = [
            {
                title: 'Indicateurs Clés de Performance',
                columns: [],
                data: [],
                kpiCards: [
                    { label: 'CA Aujourd\'hui', value: `${(data?.today_revenue || 0).toLocaleString('fr-FR')} ${currency}` },
                    { label: 'CA du Mois', value: `${(data?.month_revenue || 0).toLocaleString('fr-FR')} ${currency}` },
                    { label: 'Valeur Stock', value: `${(data?.total_stock_value || 0).toLocaleString('fr-FR')} ${currency}` },
                    { label: 'Ruptures', value: String(data?.out_of_stock_count || 0) },
                ],
            },
            { title: 'Détail des Métriques', columns: kpiCols, data: kpiRows },
        ];
        if (salesData.length > 0) {
            sections.push({ title: 'Évolution des Ventes', columns: salesCols, data: salesData });
        }
        exportToPDF({
            title: 'Tableau de Bord',
            period: `Derniers ${period} jours`,
            filename: 'Stockman_Dashboard',
            sections,
        });
    }
}
