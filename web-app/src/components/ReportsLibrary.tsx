'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Download,
    FileSpreadsheet,
    FileText,
    Layers3,
    Package,
    Receipt,
    RefreshCcw,
    Store,
    TrendingUp,
    Truck,
    Users,
} from 'lucide-react';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import { useDateFormatter } from '../hooks/useDateFormatter';
import { getAccessContext } from '../utils/access';
import {
    accounting,
    analytics,
    crmAnalytics,
    procurementAnalytics,
    type AccountingSaleHistoryItem,
    type AccountingStats,
    type AnalyticsExecutiveOverview,
    type AnalyticsFilters,
    type AnalyticsStockHealth,
    type AnalyticsStoreComparison,
    type CrmAnalyticsOverview,
    type CustomerInvoice,
    type ProcurementOverview,
} from '../services/api';
import { exportToExcel, exportToPDF, type ExcelConfig, type PDFConfig } from '../utils/ExportService';

type ReportsLibraryProps = {
    user?: any;
    features?: {
        has_production?: boolean;
        is_restaurant?: boolean;
        sector?: string;
    } | null;
};

type ReportCard = {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    accent: string;
    available: boolean;
    highlights: string[];
    excelLabel?: string;
    pdfLabel?: string;
};

export default function ReportsLibrary({ user, features }: ReportsLibraryProps) {
    const { filters } = useAnalyticsFilters();
    const { formatCurrency, formatDate } = useDateFormatter();
    const access = useMemo(() => getAccessContext(user), [user]);
    const isOrgAdmin = access.isOrgAdmin;
    const isRestaurantBusiness = features?.is_restaurant || ['restaurant', 'traiteur'].includes(features?.sector || '');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<string | null>(null);
    const [executiveOverview, setExecutiveOverview] = useState<AnalyticsExecutiveOverview | null>(null);
    const [stockHealth, setStockHealth] = useState<AnalyticsStockHealth | null>(null);
    const [storeComparison, setStoreComparison] = useState<AnalyticsStoreComparison | null>(null);
    const [accountingStats, setAccountingStats] = useState<AccountingStats | null>(null);
    const [salesHistory, setSalesHistory] = useState<AccountingSaleHistoryItem[]>([]);
    const [invoiceHistory, setInvoiceHistory] = useState<CustomerInvoice[]>([]);
    const [crmOverview, setCrmOverview] = useState<CrmAnalyticsOverview | null>(null);
    const [procurementOverview, setProcurementOverview] = useState<ProcurementOverview | null>(null);

    const derivedDays = useMemo(() => {
        if (filters.useCustomRange && filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return Math.max(diff + 1, 1);
        }
        return filters.days;
    }, [filters.days, filters.endDate, filters.startDate, filters.useCustomRange]);

    const analyticsFilters = useMemo<AnalyticsFilters>(() => ({
        days: filters.useCustomRange ? undefined : filters.days,
        start_date: filters.useCustomRange && filters.startDate ? filters.startDate : undefined,
        end_date: filters.useCustomRange && filters.endDate ? filters.endDate : undefined,
        store_id: filters.storeId || undefined,
        category_id: filters.categoryId || undefined,
        supplier_id: filters.supplierId || undefined,
    }), [filters]);

    const periodLabel = useMemo(() => {
        if (filters.useCustomRange && filters.startDate && filters.endDate) {
            return `${formatDate(filters.startDate)} -> ${formatDate(filters.endDate)}`;
        }
        return `${derivedDays} jours`;
    }, [derivedDays, filters.endDate, filters.startDate, filters.useCustomRange, formatDate]);

    const scopeLabel = executiveOverview?.scope_label
        || accountingStats?.scope_label
        || procurementOverview?.scope_label
        || (filters.storeId ? 'Boutique active' : 'Perimetre autorise');

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const results = await Promise.allSettled([
                    !isRestaurantBusiness ? analytics.getExecutiveOverview(analyticsFilters) : Promise.resolve(null),
                    !isRestaurantBusiness ? analytics.getStockHealth(analyticsFilters) : Promise.resolve(null),
                    accounting.getStats(
                        filters.useCustomRange ? undefined : filters.days,
                        filters.useCustomRange ? filters.startDate : undefined,
                        filters.useCustomRange ? filters.endDate : undefined,
                    ),
                    accounting.getSalesHistory(
                        filters.useCustomRange ? undefined : filters.days,
                        filters.useCustomRange ? filters.startDate : undefined,
                        filters.useCustomRange ? filters.endDate : undefined,
                        0,
                        200,
                        filters.storeId || undefined,
                    ),
                    accounting.getInvoices(
                        filters.useCustomRange ? undefined : filters.days,
                        filters.useCustomRange ? filters.startDate : undefined,
                        filters.useCustomRange ? filters.endDate : undefined,
                        0,
                        200,
                        filters.storeId || undefined,
                    ),
                    !isRestaurantBusiness ? crmAnalytics.getOverview(
                        filters.useCustomRange ? undefined : filters.days,
                        filters.useCustomRange ? filters.startDate : undefined,
                        filters.useCustomRange ? filters.endDate : undefined,
                    ) : Promise.resolve(null),
                    !isRestaurantBusiness ? procurementAnalytics.getOverview({
                        days: filters.useCustomRange ? undefined : derivedDays,
                        start_date: filters.useCustomRange ? filters.startDate : undefined,
                        end_date: filters.useCustomRange ? filters.endDate : undefined,
                        store_id: filters.storeId || undefined,
                        supplier_id: filters.supplierId || undefined,
                    }) : Promise.resolve(null),
                    !isRestaurantBusiness && isOrgAdmin ? analytics.getStoreComparison(analyticsFilters) : Promise.resolve(null),
                ]);

                if (cancelled) return;
                const [
                    executiveResult,
                    stockResult,
                    financeResult,
                    salesResult,
                    invoicesResult,
                    crmResult,
                    procurementResult,
                    storesResult,
                ] = results;

                const hasRejectedSection = results.some((result) => result.status === 'rejected');
                const allRejected = results.every((result) => result.status === 'rejected');

                if (executiveResult.status === 'fulfilled') setExecutiveOverview(executiveResult.value);
                else {
                    console.error('Reports executive load error', executiveResult.reason);
                    setExecutiveOverview(null);
                }

                if (stockResult.status === 'fulfilled') setStockHealth(stockResult.value);
                else {
                    console.error('Reports stock load error', stockResult.reason);
                    setStockHealth(null);
                }

                if (financeResult.status === 'fulfilled') setAccountingStats(financeResult.value);
                else {
                    console.error('Reports finance load error', financeResult.reason);
                    setAccountingStats(null);
                }

                if (salesResult.status === 'fulfilled') setSalesHistory(salesResult.value.items || []);
                else {
                    console.error('Reports sales history load error', salesResult.reason);
                    setSalesHistory([]);
                }

                if (invoicesResult.status === 'fulfilled') setInvoiceHistory(invoicesResult.value.items || []);
                else {
                    console.error('Reports invoices load error', invoicesResult.reason);
                    setInvoiceHistory([]);
                }

                if (crmResult.status === 'fulfilled') setCrmOverview(crmResult.value);
                else {
                    console.error('Reports CRM load error', crmResult.reason);
                    setCrmOverview(null);
                }

                if (procurementResult.status === 'fulfilled') setProcurementOverview(procurementResult.value);
                else {
                    console.error('Reports procurement load error', procurementResult.reason);
                    setProcurementOverview(null);
                }

                if (storesResult.status === 'fulfilled') setStoreComparison(storesResult.value);
                else {
                    console.error('Reports multi-store load error', storesResult.reason);
                    setStoreComparison(null);
                }

                if (allRejected) {
                    setError("Impossible de charger la bibliotheque de rapports.");
                } else if (hasRejectedSection) {
                    setError("Certaines sections n'ont pas pu etre chargees.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [
        analyticsFilters,
        derivedDays,
        filters.days,
        filters.endDate,
        filters.startDate,
        filters.storeId,
        filters.useCustomRange,
        isOrgAdmin,
        isRestaurantBusiness,
    ]);

    const buildExecutiveExcel = (): ExcelConfig | null => {
        if (!executiveOverview) return null;
        return {
            title: 'Rapport executif',
            period: periodLabel,
            storeName: scopeLabel,
            filename: 'rapport_executif_stockman',
            sheets: [
                {
                    name: 'Synthese',
                    columns: [
                        { key: 'kpi', label: 'Indicateur', width: 30 },
                        { key: 'value', label: 'Valeur', width: 18 },
                    ],
                    data: [
                        { kpi: 'Chiffre d affaires', value: executiveOverview.kpis.revenue },
                        { kpi: 'Marge brute', value: executiveOverview.kpis.gross_profit },
                        { kpi: 'Tickets', value: executiveOverview.kpis.sales_count },
                        { kpi: 'Panier moyen', value: executiveOverview.kpis.average_ticket },
                        { kpi: 'Rotation stock', value: executiveOverview.kpis.stock_turnover_ratio },
                        { kpi: 'Ruptures', value: executiveOverview.kpis.out_of_stock_count },
                        { kpi: 'Stock faible', value: executiveOverview.kpis.low_stock_count },
                    ],
                },
                {
                    name: 'Top produits',
                    columns: [
                        { key: 'name', label: 'Produit', width: 28 },
                        { key: 'quantity', label: 'Quantite', width: 12 },
                        { key: 'revenue', label: 'CA', width: 16 },
                        { key: 'gross_profit', label: 'Marge brute', width: 16 },
                    ],
                    data: executiveOverview.top_products || [],
                },
                {
                    name: 'Top categories',
                    columns: [
                        { key: 'name', label: 'Categorie', width: 24 },
                        { key: 'quantity', label: 'Quantite', width: 12 },
                        { key: 'revenue', label: 'CA', width: 16 },
                        { key: 'gross_profit', label: 'Marge brute', width: 16 },
                    ],
                    data: executiveOverview.top_categories || [],
                },
            ],
        };
    };

    const buildExecutivePdf = (): PDFConfig | null => {
        if (!executiveOverview) return null;
        return {
            title: 'Rapport executif',
            subtitle: executiveOverview.summary,
            period: periodLabel,
            storeName: scopeLabel,
            filename: 'rapport_executif_stockman',
            sections: [
                {
                    title: 'KPIs cles',
                    kpiCards: [
                        { label: 'CA', value: formatCurrency(executiveOverview.kpis.revenue) },
                        { label: 'Marge brute', value: formatCurrency(executiveOverview.kpis.gross_profit) },
                        { label: 'Tickets', value: String(executiveOverview.kpis.sales_count) },
                        { label: 'Panier moyen', value: formatCurrency(executiveOverview.kpis.average_ticket) },
                    ],
                    columns: [],
                    data: [],
                },
                {
                    title: 'Top produits',
                    columns: [
                        { key: 'name', label: 'Produit' },
                        { key: 'quantity', label: 'Quantite' },
                        { key: 'revenue', label: 'CA' },
                        { key: 'gross_profit', label: 'Marge brute' },
                    ],
                    data: executiveOverview.top_products.slice(0, 12),
                },
                {
                    title: 'Top categories',
                    columns: [
                        { key: 'name', label: 'Categorie' },
                        { key: 'quantity', label: 'Quantite' },
                        { key: 'revenue', label: 'CA' },
                        { key: 'gross_profit', label: 'Marge brute' },
                    ],
                    data: executiveOverview.top_categories.slice(0, 12),
                },
            ],
        };
    };

    const buildStockExcel = (): ExcelConfig | null => {
        if (!stockHealth) return null;
        return {
            title: 'Rapport stock',
            period: periodLabel,
            storeName: scopeLabel,
            filename: 'rapport_stock_stockman',
            sheets: [
                {
                    name: 'Synthese',
                    columns: [
                        { key: 'kpi', label: 'Indicateur', width: 28 },
                        { key: 'value', label: 'Valeur', width: 18 },
                    ],
                    data: [
                        { kpi: 'Valeur du stock', value: stockHealth.kpis.stock_value },
                        { kpi: 'Rotation stock', value: stockHealth.kpis.stock_turnover_ratio },
                        { kpi: 'Stock faible', value: stockHealth.kpis.low_stock_count },
                        { kpi: 'Ruptures', value: stockHealth.kpis.out_of_stock_count },
                        { kpi: 'Surstock', value: stockHealth.kpis.overstock_count },
                        { kpi: 'Dormants', value: stockHealth.kpis.dormant_products_count },
                        { kpi: 'Peremption proche', value: stockHealth.kpis.expiring_soon_count },
                    ],
                },
                {
                    name: 'Critiques',
                    columns: [
                        { key: 'name', label: 'Produit', width: 28 },
                        { key: 'quantity', label: 'Stock', width: 12 },
                        { key: 'min_stock', label: 'Min', width: 10 },
                        { key: 'shortage', label: 'Manque', width: 12 },
                        { key: 'stock_value', label: 'Valeur', width: 14 },
                    ],
                    data: stockHealth.critical_products || [],
                },
                {
                    name: 'Reappro',
                    columns: [
                        { key: 'name', label: 'Produit', width: 28 },
                        { key: 'quantity', label: 'Stock', width: 12 },
                        { key: 'suggested_order', label: 'Suggestion', width: 14 },
                        { key: 'stock_value', label: 'Valeur', width: 14 },
                    ],
                    data: stockHealth.replenishment_candidates || [],
                },
            ],
        };
    };

    const buildFinanceExcel = (): ExcelConfig | null => {
        if (!accountingStats) return null;
        return {
            title: 'Rapport finance',
            period: periodLabel,
            storeName: scopeLabel,
            filename: 'rapport_finance_stockman',
            sheets: [
                {
                    name: 'Synthese',
                    columns: [
                        { key: 'kpi', label: 'Indicateur', width: 28 },
                        { key: 'value', label: 'Valeur', width: 18 },
                    ],
                    data: [
                        { kpi: 'Revenus', value: accountingStats.revenue },
                        { kpi: 'COGS', value: accountingStats.cogs },
                        { kpi: 'Marge brute', value: accountingStats.gross_profit },
                        { kpi: 'Resultat net', value: accountingStats.net_profit },
                        { kpi: 'Charges', value: accountingStats.expenses },
                        { kpi: 'TVA collectee', value: accountingStats.tax_collected },
                        { kpi: 'Panier moyen', value: accountingStats.avg_sale },
                    ],
                },
                {
                    name: 'Ventes',
                    columns: [
                        { key: 'created_at', label: 'Date', width: 16 },
                        { key: 'customer_name', label: 'Client', width: 24 },
                        { key: 'payment_method', label: 'Paiement', width: 14 },
                        { key: 'item_count', label: 'Articles', width: 10 },
                        { key: 'total_amount', label: 'Montant', width: 14 },
                    ],
                    data: salesHistory,
                },
                {
                    name: 'Factures',
                    columns: [
                        { key: 'invoice_number', label: 'Facture', width: 18 },
                        { key: 'customer_name', label: 'Client', width: 24 },
                        { key: 'status', label: 'Statut', width: 12 },
                        { key: 'issued_at', label: 'Date', width: 16 },
                        { key: 'total_amount', label: 'Montant', width: 14 },
                    ],
                    data: invoiceHistory,
                },
            ],
        };
    };

    const buildFinancePdf = (): PDFConfig | null => {
        if (!accountingStats) return null;
        return {
            title: 'Rapport finance',
            subtitle: accountingStats.summary || 'Synthese financiere de la periode',
            period: periodLabel,
            storeName: scopeLabel,
            filename: 'rapport_finance_stockman',
            sections: [
                {
                    title: 'KPIs financiers',
                    kpiCards: [
                        { label: 'Revenus', value: formatCurrency(accountingStats.revenue) },
                        { label: 'Marge brute', value: formatCurrency(accountingStats.gross_profit) },
                        { label: 'Net', value: formatCurrency(accountingStats.net_profit) },
                        { label: 'TVA', value: formatCurrency(accountingStats.tax_collected) },
                    ],
                    columns: [],
                    data: [],
                },
                {
                    title: 'Dernieres ventes',
                    columns: [
                        { key: 'created_at', label: 'Date', type: 'date' },
                        { key: 'customer_name', label: 'Client' },
                        { key: 'payment_method', label: 'Paiement' },
                        { key: 'total_amount', label: 'Montant' },
                    ],
                    data: salesHistory.slice(0, 12),
                },
                {
                    title: 'Dernieres factures',
                    columns: [
                        { key: 'invoice_number', label: 'Facture' },
                        { key: 'customer_name', label: 'Client' },
                        { key: 'status', label: 'Statut' },
                        { key: 'total_amount', label: 'Montant' },
                    ],
                    data: invoiceHistory.slice(0, 12),
                },
            ],
        };
    };

    const buildCrmExcel = (): ExcelConfig | null => {
        if (!crmOverview) return null;
        return {
            title: 'Rapport CRM',
            period: periodLabel,
            storeName: scopeLabel,
            filename: 'rapport_crm_stockman',
            sheets: [
                {
                    name: 'Synthese',
                    columns: [
                        { key: 'kpi', label: 'Indicateur', width: 28 },
                        { key: 'value', label: 'Valeur', width: 18 },
                    ],
                    data: [
                        { kpi: 'Clients total', value: crmOverview.kpis.total_customers },
                        { kpi: 'Clients actifs', value: crmOverview.kpis.active_customers },
                        { kpi: 'Nouveaux clients', value: crmOverview.kpis.new_customers },
                        { kpi: 'Clients a risque', value: crmOverview.kpis.at_risk_customers },
                        { kpi: 'VIP', value: crmOverview.kpis.vip_customers },
                        { kpi: 'Panier moyen', value: crmOverview.kpis.average_basket },
                        { kpi: 'Dette clients', value: crmOverview.kpis.debt_balance },
                    ],
                },
                {
                    name: 'Segments',
                    columns: [
                        { key: 'label', label: 'Segment', width: 24 },
                        { key: 'description', label: 'Description', width: 38 },
                        { key: 'count', label: 'Clients', width: 12 },
                        { key: 'examples', label: 'Exemples', width: 40, format: (_value, row) => (row.examples || []).join(', ') },
                    ],
                    data: crmOverview.segments,
                },
            ],
        };
    };

    const buildProcurementExcel = (): ExcelConfig | null => {
        if (!procurementOverview) return null;
        return {
            title: 'Rapport procurement',
            period: periodLabel,
            storeName: procurementOverview.scope_label,
            filename: 'rapport_procurement_stockman',
            sheets: [
                {
                    name: 'Synthese',
                    columns: [
                        { key: 'kpi', label: 'Indicateur', width: 28 },
                        { key: 'value', label: 'Valeur', width: 18 },
                    ],
                    data: [
                        { kpi: 'Depense livree', value: procurementOverview.kpis.total_spend },
                        { kpi: 'Fournisseurs', value: procurementOverview.kpis.suppliers_count },
                        { kpi: 'Commandes ouvertes', value: procurementOverview.kpis.open_orders },
                        { kpi: 'Score moyen', value: procurementOverview.kpis.average_supplier_score },
                        { kpi: 'Opportunites groupees', value: procurementOverview.kpis.group_opportunities },
                        { kpi: 'Besoins locaux', value: procurementOverview.kpis.local_replenishment_items },
                    ],
                },
                {
                    name: 'Classement',
                    columns: [
                        { key: 'supplier_name', label: 'Fournisseur', width: 26 },
                        { key: 'kind', label: 'Type', width: 12 },
                        { key: 'score', label: 'Score', width: 10 },
                        { key: 'score_label', label: 'Statut', width: 14 },
                        { key: 'total_spend', label: 'Depense', width: 14 },
                        { key: 'orders_count', label: 'Commandes', width: 12 },
                        { key: 'avg_lead_time_days', label: 'Delai', width: 10 },
                    ],
                    data: procurementOverview.supplier_ranking,
                },
                {
                    name: 'Suggestions locales',
                    columns: [
                        { key: 'store_name', label: 'Boutique', width: 20 },
                        { key: 'product_name', label: 'Produit', width: 28 },
                        { key: 'supplier_name', label: 'Fournisseur', width: 24 },
                        { key: 'suggested_quantity', label: 'Suggestion', width: 12 },
                        { key: 'estimated_total', label: 'Budget estime', width: 16 },
                    ],
                    data: procurementOverview.local_suggestions,
                },
            ],
        };
    };

    const buildMultiStoreExcel = (): ExcelConfig | null => {
        if (!storeComparison) return null;
        return {
            title: 'Rapport multi-boutiques',
            period: periodLabel,
            storeName: 'Consolide',
            filename: 'rapport_multi_boutiques_stockman',
            sheets: [
                {
                    name: 'Boutiques',
                    columns: [
                        { key: 'store_name', label: 'Boutique', width: 24 },
                        { key: 'revenue', label: 'CA', width: 14 },
                        { key: 'gross_profit', label: 'Marge brute', width: 14 },
                        { key: 'sales_count', label: 'Tickets', width: 10 },
                        { key: 'average_ticket', label: 'Panier moyen', width: 14 },
                        { key: 'stock_turnover_ratio', label: 'Rotation', width: 10 },
                        { key: 'out_of_stock_count', label: 'Ruptures', width: 10 },
                    ],
                    data: storeComparison.stores,
                },
            ],
        };
    };

    const handleExport = async (reportId: string, format: 'excel' | 'pdf') => {
        setExporting(`${reportId}-${format}`);
        try {
            let excelConfig: ExcelConfig | null = null;
            let pdfConfig: PDFConfig | null = null;

            switch (reportId) {
                case 'executive':
                    excelConfig = buildExecutiveExcel();
                    pdfConfig = buildExecutivePdf();
                    break;
                case 'stock':
                    excelConfig = buildStockExcel();
                    break;
                case 'finance':
                    excelConfig = buildFinanceExcel();
                    pdfConfig = buildFinancePdf();
                    break;
                case 'crm':
                    excelConfig = buildCrmExcel();
                    break;
                case 'procurement':
                    excelConfig = buildProcurementExcel();
                    break;
                case 'multi_store':
                    excelConfig = buildMultiStoreExcel();
                    break;
                default:
                    break;
            }

            if (format === 'excel' && excelConfig) {
                exportToExcel(excelConfig);
            } else if (format === 'pdf' && pdfConfig) {
                exportToPDF(pdfConfig);
            }
        } catch (err) {
            console.error(`Failed to export ${reportId}`, err);
        } finally {
            setExporting(null);
        }
    };

    const reportCards: ReportCard[] = [
        {
            id: 'executive',
            title: 'Cockpit executif',
            description: 'Synthese direction: CA, marge, tickets, rotation et top produits.',
            icon: TrendingUp,
            accent: 'from-sky-500/15 to-sky-500/5 border-sky-500/20',
            available: !isRestaurantBusiness && Boolean(executiveOverview),
            highlights: executiveOverview ? [
                `${formatCurrency(executiveOverview.kpis.revenue)} de CA`,
                `${formatCurrency(executiveOverview.kpis.gross_profit)} de marge brute`,
                `${executiveOverview.kpis.sales_count} ticket(s)`,
            ] : [],
            excelLabel: 'Excel',
            pdfLabel: 'PDF',
        },
        {
            id: 'stock',
            title: 'Stock & sante',
            description: 'Ruptures, surstocks, dormants, peremption et reapprovisionnement.',
            icon: Package,
            accent: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/20',
            available: !isRestaurantBusiness && Boolean(stockHealth),
            highlights: stockHealth ? [
                `${stockHealth.kpis.out_of_stock_count} rupture(s)`,
                `${stockHealth.kpis.low_stock_count} stock(s) faible(s)`,
                `Rotation ${stockHealth.kpis.stock_turnover_ratio}`,
            ] : [],
            excelLabel: 'Excel',
        },
        {
            id: 'finance',
            title: 'Finance & ventes',
            description: 'Resultats, ventes, TVA, factures et performance financiere.',
            icon: Receipt,
            accent: 'from-violet-500/15 to-violet-500/5 border-violet-500/20',
            available: Boolean(accountingStats),
            highlights: accountingStats ? [
                `${formatCurrency(accountingStats.revenue)} de revenus`,
                `${formatCurrency(accountingStats.net_profit)} de resultat net`,
                `${invoiceHistory.length} facture(s) sur la periode`,
            ] : [],
            excelLabel: 'Excel',
            pdfLabel: 'PDF',
        },
        {
            id: 'crm',
            title: 'CRM & fidelisation',
            description: 'Segments clients, retention, dette, VIP et priorites de relance.',
            icon: Users,
            accent: 'from-rose-500/15 to-rose-500/5 border-rose-500/20',
            available: !isRestaurantBusiness && Boolean(crmOverview),
            highlights: crmOverview ? [
                `${crmOverview.kpis.active_customers} client(s) actif(s)`,
                `${crmOverview.kpis.at_risk_customers} a risque`,
                `${formatCurrency(crmOverview.kpis.debt_balance)} de dette`,
            ] : [],
            excelLabel: 'Excel',
        },
        {
            id: 'procurement',
            title: 'Approvisionnement',
            description: 'Classement fournisseurs, besoins locaux et opportunites groupees.',
            icon: Truck,
            accent: 'from-amber-500/15 to-amber-500/5 border-amber-500/20',
            available: !isRestaurantBusiness && Boolean(procurementOverview),
            highlights: procurementOverview ? [
                `${procurementOverview.kpis.suppliers_count} fournisseur(s)`,
                `${procurementOverview.kpis.group_opportunities} opportunite(s) groupee(s)`,
                `${procurementOverview.kpis.local_replenishment_items} besoin(s) local(aux)`,
            ] : [],
            excelLabel: 'Excel',
        },
        {
            id: 'multi_store',
            title: 'Benchmark multi-boutiques',
            description: 'Comparaison consolidee des boutiques, reservee au pilotage orga.',
            icon: Store,
            accent: 'from-primary/15 to-primary/5 border-primary/20',
            available: !isRestaurantBusiness && isOrgAdmin && Boolean(storeComparison),
            highlights: storeComparison ? [
                `${storeComparison.totals.store_count} boutique(s)`,
                `${formatCurrency(storeComparison.totals.revenue)} consolide`,
                `Rotation ${storeComparison.totals.stock_turnover_ratio}`,
            ] : [],
            excelLabel: 'Excel',
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-[#0F172A] custom-scrollbar p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="glass-card p-6">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Reports center</p>
                            <h1 className="text-3xl font-black text-white mt-2">Bibliotheque de rapports</h1>
                            <p className="text-slate-400 mt-3 max-w-3xl">
                                Retrouvez vos exports metier au meme endroit: direction, stock, finance, CRM, achats et multi-boutiques.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                            <span className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-300">
                                Periode : {periodLabel}
                            </span>
                            <span className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-300">
                                Portee : {scopeLabel}
                            </span>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all inline-flex items-center gap-2"
                            >
                                <RefreshCcw size={14} />
                                Recharger
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="glass-card p-5 border border-rose-500/20 bg-rose-500/5 text-rose-300">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="glass-card p-5">
                        <p className="text-[10px] font-black uppercase text-slate-500">Rapports disponibles</p>
                        <p className="text-2xl font-black text-white mt-2">{reportCards.filter((card) => card.available).length}</p>
                        <p className="text-xs text-slate-400 mt-2">Prets a exporter sur votre perimetre.</p>
                    </div>
                    <div className="glass-card p-5">
                        <p className="text-[10px] font-black uppercase text-slate-500">Ventes chargees</p>
                        <p className="text-2xl font-black text-white mt-2">{salesHistory.length}</p>
                        <p className="text-xs text-slate-400 mt-2">Historique comptable utilise pour les exports finance.</p>
                    </div>
                    <div className="glass-card p-5">
                        <p className="text-[10px] font-black uppercase text-slate-500">Factures chargees</p>
                        <p className="text-2xl font-black text-white mt-2">{invoiceHistory.length}</p>
                        <p className="text-xs text-slate-400 mt-2">Factures clients de la periode courante.</p>
                    </div>
                    <div className="glass-card p-5">
                        <p className="text-[10px] font-black uppercase text-slate-500">Mode d export</p>
                        <p className="text-2xl font-black text-white mt-2">Excel + PDF</p>
                        <p className="text-xs text-slate-400 mt-2">Selon le type de rapport et les donnees disponibles.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((index) => (
                            <div key={index} className="h-72 glass-card animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {reportCards.filter((card) => card.available).map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.id} className={`glass-card p-6 bg-gradient-to-br ${card.accent} space-y-5`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
                                            <Icon size={22} />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                            {card.id === 'multi_store' ? 'Org admin' : 'Pret'}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-white">{card.title}</h3>
                                        <p className="text-sm text-slate-300 mt-2 leading-relaxed">{card.description}</p>
                                    </div>

                                    <div className="space-y-2">
                                        {card.highlights.map((highlight, index) => (
                                            <div key={index} className="flex items-center gap-2 text-sm text-slate-200">
                                                <Layers3 size={14} className="text-primary shrink-0" />
                                                <span>{highlight}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3">
                                        {card.excelLabel && (
                                            <button
                                                onClick={() => handleExport(card.id, 'excel')}
                                                disabled={Boolean(exporting)}
                                                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-black text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                                            >
                                                {exporting === `${card.id}-excel` ? <RefreshCcw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                                                {card.excelLabel}
                                            </button>
                                        )}
                                        {card.pdfLabel && (
                                            <button
                                                onClick={() => handleExport(card.id, 'pdf')}
                                                disabled={Boolean(exporting)}
                                                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/15 border border-primary/30 px-4 py-3 text-sm font-black text-white hover:bg-primary/25 transition-all disabled:opacity-50"
                                            >
                                                {exporting === `${card.id}-pdf` ? <RefreshCcw size={16} className="animate-spin" /> : <FileText size={16} />}
                                                {card.pdfLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!loading && !reportCards.some((card) => card.available) && (
                    <div className="glass-card p-16 text-center text-slate-500">
                        <Download size={56} className="mx-auto mb-4 opacity-10" />
                        <p className="text-xl">Aucun rapport n'est disponible sur ce perimetre pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
