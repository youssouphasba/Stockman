import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    useWindowDimensions,
    TouchableOpacity,
    Platform,
    Modal,
    TextInput,
    Linking,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { LineChart, PieChart } from 'react-native-chart-kit';
import {
    accounting as accountingApi,
    customers as customersApi,
    stores as storesApi,
    expenses as expensesApi,
    settings as settingsApi,
    sales as salesApi,
    AccountingStats,
    AccountingSaleHistoryItem,
    Customer,
    Store,
    Expense,
    UserSettings,
    CustomerInvoice,
    Sale,
    API_URL,
    getToken,
    ApiError,
} from '../../services/api';

import { useAuth } from '../../contexts/AuthContext';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawer } from '../../contexts/DrawerContext';
import PremiumGate from '../../components/PremiumGate';
import AccessDenied from '../../components/AccessDenied';
import PeriodSelector from '../../components/PeriodSelector';
import { formatCurrency as globalFormatCurrency, getCurrencySymbol } from '../../utils/format';
import {
    generateSalePdf,
    buildProfessionalInvoiceHtml,
    printAndShare
} from '../../utils/pdfReports';
import { mergeAccountingOfflineState } from '../../services/offlineState';
import KpiInfoButton from '../../components/KpiInfoButton';


// screenWidth is now read via useWindowDimensions() inside the component

// PERIODS constant removed as it's handled inside the component or by PeriodSelector

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'accounting.payment_cash',
    mobile_money: 'accounting.payment_mobile_money',
    card: 'accounting.payment_card',
    transfer: 'accounting.payment_transfer',
    credit: 'accounting.payment_credit',
};

const DEFAULT_EXPENSE_CATEGORIES = [
    'rent', 'salary', 'transport', 'merchandise', 'electricity', 'water', 'internet', 'other'
];

function normalizeExpenseCategory(category: string) {
    return category.trim().replace(/\s+/g, ' ');
}

function buildExpenseCategories(savedCategories: string[] = [], expenses: Expense[] = []) {
    const seen = new Set<string>();
    const merged: string[] = [];

    [...DEFAULT_EXPENSE_CATEGORIES, ...savedCategories, ...expenses.map((expense) => expense.category)].forEach((category) => {
        const value = normalizeExpenseCategory(String(category || ''));
        if (!value) return;
        const key = value.toLocaleLowerCase('fr-FR');
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(value);
    });

    return merged;
}

export default function AccountingScreen() {
    const { colors, glassStyle, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const styles = getStyles(colors, glassStyle, screenWidth);
    const [stats, setStats] = useState<AccountingStats | null>(null);
    const [recentSales, setRecentSales] = useState<AccountingSaleHistoryItem[]>([]);
    const [invoiceHistory, setInvoiceHistory] = useState<CustomerInvoice[]>([]);
    const [invoiceBusyId, setInvoiceBusyId] = useState<string | null>(null);
    const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const lastLoadedAtRef = useRef(0);
    const FOCUS_TTL_MS = 60_000;

    const [selectedPeriod, setSelectedPeriod] = useState<number | 'custom'>(30);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    // Applied dates: only updated when user clicks "Appliquer", not on every keystroke
    const [appliedStart, setAppliedStart] = useState<string>('');
    const [appliedEnd, setAppliedEnd] = useState<string>('');
    const { user, isSuperAdmin } = useAuth();
    const { setDrawerContent } = useDrawer();
    const [currentStore, setCurrentStore] = useState<Store | null>(null);

    // Scroll refs for drawer navigation
    const scrollViewRef = useRef<ScrollView>(null);
    const sectionRefs = {
        kpiGrid: useRef<View>(null),
        expenses: useRef<View>(null),
        stockLoss: useRef<View>(null),
        itemsPurchases: useRef<View>(null),
        revenueTrend: useRef<View>(null),
        revenueBreakdown: useRef<View>(null),
        paymentBreakdown: useRef<View>(null),
        perfTable: useRef<View>(null),
        recentSales: useRef<View>(null),
    };
    const sectionOffsets = useRef<Record<string, number>>({});

    // Expenses
    const [expensesList, setExpensesList] = useState<Expense[]>([]);
    const [settingsData, setSettingsData] = useState<UserSettings | null>(null);
    const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState('other');
    const [expenseCategoryDraft, setExpenseCategoryDraft] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [savingExpense, setSavingExpense] = useState(false);
    const [savingExpenseCategory, setSavingExpenseCategory] = useState(false);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showAllPerf, setShowAllPerf] = useState(false);
    const [showAllExpenses, setShowAllExpenses] = useState(false);
    const [activeKpiDetail, setActiveKpiDetail] = useState<
        'revenue' | 'gross_profit' | 'expenses' | 'net_profit' | 'stock' | 'losses' | 'items' | 'purchases' | 'tax' | null
    >(null);
    const [accessDenied, setAccessDenied] = useState(false);
    const [pendingSummary, setPendingSummary] = useState({ pendingInvoices: 0, pendingExpenses: 0, pendingTotal: 0 });
    const [invoiceClient, setInvoiceClient] = useState('');
    const [invoiceItems, setInvoiceItems] = useState([{ desc: '', qty: '1', price: '', tva: '0' }]);
    const [invoiceNote, setInvoiceNote] = useState('');
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    const scrollToSection = useCallback((key: string) => {
        const y = sectionOffsets.current[key];
        if (y != null && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y, animated: true });
        }
    }, []);

    const loadData = useCallback(async (period: number | 'custom', start?: string, end?: string) => {
        try {
            const days = period === 'custom' ? undefined : period;
            const [statsRes, salesRes, invoicesRes, expensesRes, storesRes, userSettingsRes] = await Promise.all([
                accountingApi.getStats(days, start, end),
                accountingApi.getSalesHistory(days, start, end, 0, 100),
                accountingApi.getInvoices(days, start, end, 0, 100),
                expensesApi.list(days, start, end, 0, 500),
                storesApi.list(),
                settingsApi.get().catch(() => null),
            ]);
            const merged = await mergeAccountingOfflineState({
                recentSales: Array.isArray(salesRes?.items) ? salesRes.items : [],
                invoiceHistory: Array.isArray(invoicesRes?.items) ? invoicesRes.items : [],
                expensesList: Array.isArray(expensesRes?.items) ? expensesRes.items : (expensesRes as any),
            });
            setStats(statsRes);
            setRecentSales(merged.recentSales);
            setInvoiceHistory(merged.invoiceHistory);
            setExpensesList(merged.expensesList);
            setSettingsData(userSettingsRes);
            setExpenseCategories(buildExpenseCategories(userSettingsRes?.expense_categories || [], merged.expensesList));
            setPendingSummary(merged.summary);
            const active = (storesRes || []).find(s => s.store_id === user?.active_store_id) || null;
            setCurrentStore(active);
            setAccessDenied(false);
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                setAccessDenied(true);
            } else {
                console.error(error);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
            lastLoadedAtRef.current = Date.now();
        }
    }, [user?.active_store_id]);

    useFocusEffect(
        useCallback(() => {
            if (Date.now() - lastLoadedAtRef.current < FOCUS_TTL_MS) return;
            loadData(selectedPeriod, appliedStart, appliedEnd);
        }, [loadData, selectedPeriod, appliedStart, appliedEnd])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(selectedPeriod, appliedStart, appliedEnd);
    };

    const changePeriod = (period: number | 'custom') => {
        if (period !== 'custom') {
            setStartDate('');
            setEndDate('');
            setAppliedStart('');
            setAppliedEnd('');
            setLoading(true);
            loadData(period);
        }
        setSelectedPeriod(period);
    };

    const applyCustomDates = (nextStart = startDate, nextEnd = endDate) => {
        if (!nextStart || !nextEnd) return;
        setAppliedStart(nextStart);
        setAppliedEnd(nextEnd);
        setLoading(true);
        loadData('custom', nextStart, nextEnd);
    };

    const buildInvoiceStore = (invoice: CustomerInvoice): Store => ({
        store_id: invoice.store_id,
        user_id: user?.user_id || '',
        name: currentStore?.name || invoice.business_name || t('common.my_shop'),
        address: currentStore?.address || invoice.business_address || '',
        currency: invoice.currency || currentStore?.currency || user?.currency,
        receipt_business_name: currentStore?.receipt_business_name,
        receipt_footer: currentStore?.receipt_footer,
        invoice_business_name: invoice.business_name || currentStore?.invoice_business_name,
        invoice_business_address: invoice.business_address || currentStore?.invoice_business_address,
        invoice_label: invoice.invoice_label || currentStore?.invoice_label,
        invoice_prefix: invoice.invoice_prefix || currentStore?.invoice_prefix,
        invoice_footer: invoice.footer || currentStore?.invoice_footer,
        invoice_payment_terms: invoice.payment_terms || currentStore?.invoice_payment_terms,
        created_at: currentStore?.created_at || invoice.created_at,
        terminals: currentStore?.terminals,
        tax_enabled: currentStore?.tax_enabled,
        tax_rate: currentStore?.tax_rate,
        tax_mode: currentStore?.tax_mode,
    });

    const buildInvoiceItemsHtml = (invoice: CustomerInvoice) => invoice.items.map((item) => `
        <tr>
            <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${item.description || item.product_name || '-'}</td>
            <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:center">${item.quantity}</td>
            <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(item.unit_price)}</td>
            <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(item.line_total)}</td>
        </tr>
    `).join('');

    const generateStoredInvoicePdf = async (invoice: CustomerInvoice) => {
        const storeProfile = buildInvoiceStore(invoice);
        const paymentLabel = invoice.payment_method
            ? t(PAYMENT_LABELS[invoice.payment_method] || invoice.payment_method, { defaultValue: invoice.payment_method })
            : undefined;

        const html = buildProfessionalInvoiceHtml({
            store: storeProfile,
            title: invoice.invoice_label || t('accounting.invoice', 'Facture'),
            ref: invoice.invoice_number,
            date: formatDate(invoice.issued_at),
            recipientLabel: t('accounting.recipient_label'),
            recipientName: invoice.customer_name || t('accounting.client_diverse'),
            itemsHtml: buildInvoiceItemsHtml(invoice),
            total: invoice.total_amount,
            currency: invoice.currency || user?.currency,
            notes: invoice.notes,
            paymentMethod: paymentLabel,
            paymentTerms: invoice.payment_terms,
            footer: invoice.footer,
            brandingMode: 'invoice',
        });

        await printAndShare(html, `${invoice.invoice_prefix || 'FAC'}_${invoice.invoice_number}`);
    };

    const handleOpenStoredInvoice = async (invoiceId: string, existing?: CustomerInvoice) => {
        try {
            const invoice = existing || await accountingApi.getInvoice(invoiceId);
            await generateStoredInvoicePdf(invoice);
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('accounting.invoice_open_error', { defaultValue: "Impossible d'ouvrir la facture." }));
        }
    };

    const handleCreateInvoiceFromSale = async (saleId: string) => {
        setInvoiceBusyId(saleId);
        try {
            const invoice = await accountingApi.createInvoiceFromSale(saleId);
            if ((invoice as any)?.offline_pending) {
                const merged = await mergeAccountingOfflineState({
                    recentSales,
                    invoiceHistory,
                    expensesList,
                });
                setRecentSales(merged.recentSales);
                setInvoiceHistory(merged.invoiceHistory);
                setExpensesList(merged.expensesList);
                setPendingSummary(merged.summary);
                const pendingInvoice = merged.invoiceHistory.find((entry) => entry.sale_id === saleId && (entry as any).offline_pending);
                if (pendingInvoice) {
                    await generateStoredInvoicePdf(pendingInvoice);
                } else {
                    Alert.alert(t('common.error'), t('accounting.invoice_create_error', { defaultValue: "Impossible de creer la facture." }));
                }
                return;
            }
            await generateStoredInvoicePdf(invoice);
            await loadData(selectedPeriod, appliedStart, appliedEnd);
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('accounting.invoice_create_error', { defaultValue: "Impossible de creer la facture." }));
        } finally {
            setInvoiceBusyId(null);
        }
    };

    const handleCancelSale = async (saleId: string) => {
        Alert.alert(
            t('accounting.cancel_sale', { defaultValue: 'Annuler la vente' }),
            t('accounting.cancel_sale_confirm', { defaultValue: 'Annuler cette vente et remettre le stock en place ?' }),
            [
                { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
                {
                    text: t('common.confirm', { defaultValue: 'Confirmer' }),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancellingSaleId(saleId);
                            await salesApi.cancel(saleId);
                            await loadData(selectedPeriod, appliedStart || undefined, appliedEnd || undefined);
                        } catch (err: any) {
                            Alert.alert(
                                t('common.error', { defaultValue: 'Erreur' }),
                                err?.message || t('accounting.cancel_sale_error', { defaultValue: "Impossible d'annuler cette vente pour le moment." }),
                            );
                        } finally {
                            setCancellingSaleId(null);
                        }
                    },
                },
            ],
        );
    };

    const getSaleStatusLabel = (sale: AccountingSaleHistoryItem) =>
        sale.status === 'cancelled'
            ? t('accounting.sale_status_cancelled', { defaultValue: 'Annulée' })
            : t('accounting.sale_status_completed', { defaultValue: 'Complétée' });

    const getSaleStatusTone = (sale: AccountingSaleHistoryItem) =>
        sale.status === 'cancelled'
            ? {
                color: colors.danger,
                borderColor: colors.danger + '35',
                backgroundColor: colors.danger + '14',
            }
            : {
                color: colors.success,
                borderColor: colors.success + '35',
                backgroundColor: colors.success + '14',
            };



    const openExpenseModal = () => {
        // console.log("Opening expense modal");
        setExpenseCategory('other');
        setExpenseCategoryDraft('');
        setExpenseAmount('');
        setExpenseDescription('');
        setShowExpenseModal(true);
    };

    const hasExpenseChanges = () => {
        if (expenseAmount.trim()) return true;
        if (expenseDescription.trim()) return true;
        if (expenseCategoryDraft.trim()) return true;
        return expenseCategory !== 'other';
    };

    const requestCloseExpenseModal = () => {
        if (!hasExpenseChanges()) {
            setShowExpenseModal(false);
            return;
        }
        Alert.alert(
            t('common.unsaved_changes_title'),
            t('common.unsaved_changes_message'),
            [
                { text: t('common.stay'), style: 'cancel' },
                { text: t('common.leave_without_saving'), style: 'destructive', onPress: () => setShowExpenseModal(false) },
            ]
        );
    };

    const addExpenseCategory = async () => {
        const nextCategory = normalizeExpenseCategory(expenseCategoryDraft);
        if (!nextCategory) {
            Alert.alert(t('common.error'), t('accounting.enter_category_name', 'Saisissez un nom de catégorie.'));
            return;
        }

        if (expenseCategories.some((category) => category.toLocaleLowerCase('fr-FR') === nextCategory.toLocaleLowerCase('fr-FR'))) {
            setExpenseCategory(nextCategory);
            setExpenseCategoryDraft('');
            return;
        }

        const nextCategories = buildExpenseCategories(
            [...(settingsData?.expense_categories || []), nextCategory],
            expensesList,
        );

        setSavingExpenseCategory(true);
        try {
            const updatedSettings = await settingsApi.update({
                expense_categories: nextCategories.filter((category) => !DEFAULT_EXPENSE_CATEGORIES.includes(category)),
            } as any);
            setSettingsData(updatedSettings);
            setExpenseCategories(buildExpenseCategories(updatedSettings?.expense_categories || [], expensesList));
            setExpenseCategory(nextCategory);
            setExpenseCategoryDraft('');
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('accounting.category_save_error', "Impossible d'enregistrer cette catégorie."));
        } finally {
            setSavingExpenseCategory(false);
        }
    };

    const saveExpense = async () => {
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) {
            alert(t('accounting.invalid_amount'));
            return;
        }

        const normalizedCategory = normalizeExpenseCategory(expenseCategory);
        if (!normalizedCategory) {
            Alert.alert(t('common.error'), t('accounting.choose_expense_category', 'Choisissez une catégorie de dépense.'));
            return;
        }

        const performSave = async () => {
            setSavingExpense(true);
            try {
                await expensesApi.create({
                    category: normalizedCategory,
                    amount,
                    description: expenseDescription
                });
                setShowExpenseModal(false);
                loadData(selectedPeriod, appliedStart, appliedEnd);
            } catch (error) {
                console.error(error);
                alert(t('accounting.save_error'));
            } finally {
                setSavingExpense(false);
            }
        };

        const confirmMsg = t('accounting.confirm_expense', { amount: globalFormatCurrency(amount, user?.currency) });

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) {
                await performSave();
            }
        } else {
            Alert.alert(
                t('common.confirmation'),
                confirmMsg,
                [
                    { text: t('common.cancel'), style: "cancel" },
                    { text: t('common.confirm'), onPress: performSave }
                ]
            );
        }
    };

    const deleteExpense = async (id: string) => {
        const performDelete = async () => {
            try {
                await expensesApi.delete(id);
                loadData(selectedPeriod, appliedStart, appliedEnd);
            } catch (error) {
                console.error(error);
                Alert.alert(t('common.error'), t('accounting.delete_error'));
            }
        };
        if (Platform.OS === 'web') {
            if (window.confirm(t('accounting.confirm_delete_expense'))) await performDelete();
        } else {
            Alert.alert(t('common.confirmation'), t('accounting.confirm_delete_expense'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.delete'), style: 'destructive', onPress: performDelete },
            ]);
        }
    };

    function formatCurrency(val: number) {
        return globalFormatCurrency(val, user?.currency);
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString(i18n.language, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const revenueSeries = stats?.daily_revenue ?? [];
    const visibleRevenueLabels = revenueSeries.map((entry, index) => {
        if (revenueSeries.length <= 6) {
            const parts = entry.date.split('-');
            return `${parts[2]}/${parts[1]}`;
        }
        const stride = Math.ceil(revenueSeries.length / 5);
        const isFirst = index === 0;
        const isLast = index === revenueSeries.length - 1;
        if (!isFirst && !isLast && index % stride !== 0) return '';
        const parts = entry.date.split('-');
        return `${parts[2]}/${parts[1]}`;
    });
    const topLossEntries = Object.entries(stats?.loss_breakdown ?? {})
        .map(([reason, amount]) => ({ reason, amount }))
        .sort((a, b) => b.amount - a.amount);
    const topExpenseCategories = (stats?.top_expense_categories ?? [])
        .slice()
        .sort((a, b) => b.amount - a.amount);
    const firstRevenuePoint = revenueSeries[0]?.revenue ?? 0;
    const lastRevenuePoint = revenueSeries[revenueSeries.length - 1]?.revenue ?? 0;
    const revenueDelta = lastRevenuePoint - firstRevenuePoint;
    const bestRevenueDay = revenueSeries.reduce<{ date: string; revenue: number } | null>((best, item) => {
        if (!best || item.revenue > best.revenue) {
            return { date: item.date, revenue: item.revenue };
        }
        return best;
    }, null);
    const kpiModalTitle = {
        revenue: t('accounting.kpi_revenue', "Chiffre d'affaires"),
        gross_profit: t('accounting.kpi_gross_profit', 'Marge brute'),
        expenses: t('accounting.kpi_expenses', 'Dépenses et frais'),
        net_profit: t('accounting.kpi_net_profit', 'Résultat net'),
        stock: t('accounting.kpi_stock', 'Valeur du stock'),
        losses: t('accounting.kpi_losses', 'Détails des pertes'),
        items: t('accounting.kpi_items', 'Articles vendus'),
        purchases: t('accounting.kpi_purchases', 'Achats fournisseurs'),
        tax: t('accounting.kpi_tax', 'Taxes collectées'),
    } as const;

    function getLossLabel(reason: string) {
        const normalized = reason.trim().toLowerCase();
        if (normalized === 'lost' || normalized === 'perdu') return t('accounting.loss_unattributed', 'Perte non attribuée');
        if (normalized === 'inventory_adjustment' || normalized === 'inventaire physique') return t('accounting.loss_inventory', "Écart d'inventaire");
        if (normalized === 'expired' || normalized === 'expiration') return t('accounting.loss_expired', 'Péremption');
        if (normalized === 'broken' || normalized === 'casse') return t('accounting.loss_broken', 'Casse');
        if (normalized === 'theft' || normalized === 'vol') return t('accounting.loss_theft', 'Vol');
        return reason;
    }

    function getKpiInsight(kind: NonNullable<typeof activeKpiDetail>) {
        switch (kind) {
            case 'revenue':
                return [
                    `${t('accounting.insight_period', 'Période analysée')} : ${stats?.period_label || t('accounting.insight_undefined', 'non définie')}`,
                    `${t('accounting.insight_variation', 'Variation sur la période')} : ${formatCurrency(revenueDelta)}`,
                    bestRevenueDay ? `${t('accounting.insight_best_day', 'Meilleure journée')} : ${new Date(bestRevenueDay.date).toLocaleDateString(i18n.language)} (${formatCurrency(bestRevenueDay.revenue)})` : null,
                ].filter(Boolean) as string[];
            case 'gross_profit':
                return [
                    `${t('accounting.kpi_gross_profit', 'Marge brute')} : ${formatCurrency(stats?.gross_profit ?? 0)}`,
                    `${t('accounting.label_cogs', "Coût d'achat")} : ${formatCurrency(stats?.cogs ?? 0)}`,
                    `${t('accounting.insight_gross_margin_rate', 'Taux de marge brute')} : ${grossMarginPercentage.toFixed(1)} %`,
                ];
            case 'expenses':
                return [
                    `${t('accounting.insight_total_expenses', 'Total des dépenses')} : ${formatCurrency(stats?.expenses ?? 0)}`,
                    `${t('accounting.insight_categories_tracked', 'Catégories suivies')} : ${topExpenseCategories.length || Object.keys(stats?.expenses_breakdown ?? {}).length}`,
                    `${t('accounting.insight_expense_ratio', 'Poids des dépenses')} : ${expenseRatioPercentage.toFixed(1)} % ${t('accounting.insight_of_revenue', "du chiffre d'affaires")}`,
                ];
            case 'net_profit':
                return [
                    `${t('accounting.kpi_net_profit', 'Résultat net')} : ${formatCurrency(stats?.net_profit ?? 0)}`,
                    `${t('accounting.insight_net_margin', 'Marge nette')} : ${netMarginPercentage.toFixed(1)} %`,
                    `${t('accounting.insight_recorded_losses', 'Pertes comptabilisées')} : ${formatCurrency(stats?.total_losses ?? 0)}`,
                ];
            case 'stock':
                return [
                    `${t('accounting.label_stock_value', "Valeur d'achat")} : ${formatCurrency(stats?.stock_value ?? 0)}`,
                    `${t('accounting.label_selling_potential', 'Potentiel de vente')} : ${formatCurrency(stats?.stock_selling_value ?? 0)}`,
                    `${t('accounting.insight_potential_gap', 'Écart potentiel')} : ${formatCurrency((stats?.stock_selling_value ?? 0) - (stats?.stock_value ?? 0))}`,
                ];
            case 'losses':
                return [
                    `${t('accounting.insight_total_losses', 'Pertes totales')} : ${formatCurrency(stats?.total_losses ?? 0)}`,
                    `${t('accounting.insight_reasons_tracked', 'Motifs suivis')} : ${topLossEntries.length}`,
                    topLossEntries[0] ? `${t('accounting.insight_main_reason', 'Motif principal')} : ${getLossLabel(topLossEntries[0].reason)}` : t('accounting.insight_no_dominant_reason', 'Aucun motif dominant'),
                ];
            case 'items':
                return [
                    `${t('accounting.kpi_items', 'Articles vendus')} : ${(stats?.total_items_sold ?? 0).toString()}`,
                    `${t('accounting.insight_sales_made', 'Ventes réalisées')} : ${(stats?.sales_count ?? 0).toString()}`,
                    `${t('accounting.insight_avg_basket', 'Panier moyen')} : ${formatCurrency(stats?.avg_sale ?? 0)}`,
                ];
            case 'purchases':
                return [
                    `${t('accounting.kpi_purchases', 'Achats fournisseurs')} : ${formatCurrency(stats?.total_purchases ?? 0)}`,
                    `${t('accounting.label_restocks', 'Réapprovisionnements')} : ${(stats?.purchases_count ?? 0).toString()}`,
                    `${t('accounting.label_avg_purchase', 'Moyenne par achat')} : ${formatCurrency((stats?.total_purchases ?? 0) / Math.max(stats?.purchases_count ?? 1, 1))}`,
                ];
            case 'tax':
                return [
                    `${t('accounting.label_tax_collected', 'Taxes collectées')} : ${formatCurrency((stats as any)?.tax_collected ?? 0)}`,
                    `${t('accounting.insight_tax_rate', "Taux sur l'activité")} : ${(stats?.tax_ratio ?? 0).toFixed(1)} %`,
                ];
        }
    }

    const handleExportCSV = async () => {
        const token = await getToken();
        if (!token) return;
        const params = new URLSearchParams();
        if (selectedPeriod === 'custom' && appliedStart && appliedEnd) {
            params.set('start_date', appliedStart);
            params.set('end_date', appliedEnd);
        } else if (selectedPeriod !== 'custom') {
            params.set('days', selectedPeriod.toString());
        }

        try {
            const response = await fetch(`${API_URL}/api/export/accounting/csv?${params.toString()}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('export accounting failed');
            const csv = await response.text();

            if (Platform.OS === 'web' && typeof window !== 'undefined') {
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = 'accounting.csv';
                anchor.click();
                window.URL.revokeObjectURL(url);
                return;
            }

            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
            if (!baseDir) throw new Error('filesystem unavailable');
            const fileUri = `${baseDir}accounting.csv`;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
            } else {
                Alert.alert(t('common.error'), t('accounting.export_error', { defaultValue: "Impossible d'exporter le rapport comptable." }));
            }
        } catch {
            Alert.alert(t('common.error'), t('accounting.export_error', { defaultValue: "Impossible d'exporter le rapport comptable." }));
        }
    };

    // Custom invoice
    const openInvoiceModal = async () => {
        setShowInvoiceModal(true);
        setInvoiceClient('');
        setInvoiceItems([{ desc: '', qty: '1', price: '', tva: '0' }]);
        setInvoiceNote('');
        try {
            const custsRes = await customersApi.list();
            setCustomersList(custsRes.items ?? custsRes as any);
        } catch { /* ignore */ }
    };

    const addInvoiceLine = () => {
        setInvoiceItems([...invoiceItems, { desc: '', qty: '1', price: '', tva: '0' }]);
    };

    const removeInvoiceLine = (index: number) => {
        if (invoiceItems.length <= 1) return;
        setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    };

    const updateInvoiceLine = (index: number, field: string, value: string) => {
        setInvoiceItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const invoiceTotal = invoiceItems.reduce((sum, item) => {
        const price = parseFloat(item.price.replace(',', '.') || '0') || 0;
        const qty = parseFloat(item.qty.replace(',', '.') || '0') || 0;
        const tva = parseFloat(item.tva.replace(',', '.') || '0') || 0;
        return sum + (price * qty * (1 + tva / 100));
    }, 0);

    const generateInvoicePdf = async () => {
        if (!currentStore) return;

        const itemsHtml = invoiceItems
            .filter(item => item.desc && item.price)
            .map(item => {
                const price = parseFloat(item.price.replace(',', '.') || '0') || 0;
                const qty = parseFloat(item.qty.replace(',', '.') || '0') || 0;
                const tva = parseFloat(item.tva.replace(',', '.') || '0') || 0;
                const lineTotal = price * qty * (1 + tva / 100);
                return `
                <tr>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${item.desc}</td>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:center">${item.qty}</td>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(price)}</td>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(lineTotal)}</td>
                </tr>`;
            }).join('');

        const now = new Date();
        const refNum = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

        const html = buildProfessionalInvoiceHtml({
            store: currentStore,
            title: currentStore.invoice_label || t('accounting.invoice_title'),
            ref: refNum,
            date: now.toLocaleDateString(i18n.language),
            recipientLabel: t('accounting.recipient_label'),
            recipientName: invoiceClient || t('accounting.client_diverse'),
            itemsHtml,
            total: invoiceTotal,
            currency: user?.currency,
            notes: invoiceNote,
            paymentMethod: t('accounting.payment_cash'),
            paymentTerms: currentStore.invoice_payment_terms,
            footer: currentStore.invoice_footer,
            brandingMode: 'invoice',
        });

        await printAndShare(html, `Facture_${refNum}`);
        setShowInvoiceModal(false);
    };

    const generateActivityReportPdf = async () => {
        if (!stats) return;

        const topProductsHtml = (stats.product_performance || [])
            .slice(0, 10)
            .map(p => {
                const profit = p.revenue - (p.cogs || 0) - (p.loss || 0);
                return `
                <tr>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${p.name}</td>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:center">${p.qty_sold}</td>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(p.revenue)}</td>
                    <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right; color: ${profit >= 0 ? colors.success : colors.danger}">${formatCurrency(profit)}</td>
                </tr>
                `;
            }).join('');

        const expensesHtml = expensesList.map(e => `
            <tr>
                <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${e.category}</td>
                <td style="padding: 10px 5px; border-bottom: 1px solid #eee;">${e.description || '-'}</td>
                <td style="padding: 10px 5px; border-bottom: 1px solid #eee; text-align:right">${formatCurrency(e.amount)}</td>
            </tr>
        `).join('');

        const storeName = currentStore?.name || t('accounting.default_store_name');
        const storeAddress = currentStore?.address || t('accounting.default_address');
        const periodLabel = stats.period_label || (typeof selectedPeriod === 'number' ? t('accounting.last_days_label', { count: selectedPeriod }) : t('common.periods.custom'));

        const html = `
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.5; }
                    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid ${colors.primary}; }
                    .header h1 { margin: 0; color: ${colors.primary}; text-transform: uppercase; }
                    .header p { margin: 5px 0; color: #666; }
                    
                    .report-title { text-align: center; background: #f4f4f4; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
                    .report-title h2 { margin: 0; color: #333; }
                    
                    .kpi-grid { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; }
                    .kpi-card { flex: 1; min-width: 150px; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; text-align: center; }
                    .kpi-label { font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
                    .kpi-value { font-size: 18px; font-weight: bold; color: ${colors.primary}; }
                    
                    section { margin-bottom: 40px; }
                    h3 { border-left: 4px solid ${colors.primary}; padding-left: 10px; margin-bottom: 15px; }
                    
                    table { width: 100%; border-collapse: collapse; }
                    th { text-align: left; padding: 10px; background: ${colors.primary}; color: white; font-size: 12px; text-transform: uppercase; }
                    td { font-size: 13px; }
                    
                    .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${storeName}</h1>
                    <p>${storeAddress}</p>
                </div>

                <div class="report-title">
                    <h2>${t('accounting.report_title')}</h2>
                    <p>${t('accounting.period_label')} ${periodLabel}</p>
                </div>

                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">${t('accounting.revenue_kpi')}</div>
                        <div class="kpi-value">${formatCurrency(stats.revenue)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">${t('accounting.gross_margin_kpi')}</div>
                        <div class="kpi-value" style="color: ${colors.success}">${formatCurrency(stats.gross_profit)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">${t('accounting.total_expenses_kpi')}</div>
                        <div class="kpi-value" style="color: ${colors.danger}">${formatCurrency(stats.expenses)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">${t('accounting.net_profit')}</div>
                        <div class="kpi-value" style="color: ${stats.net_profit >= 0 ? colors.info : colors.danger}">${formatCurrency(stats.net_profit)}</div>
                    </div>
                </div>

                <section>
                    <h3>${t('accounting.pdf_top_products')}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('accounting.col_product')}</th>
                                <th style="text-align:center">${t('accounting.col_sold')}</th>
                                <th style="text-align:right">${t('accounting.col_revenue')}</th>
                                <th style="text-align:right">${t('accounting.col_profit')}</th>
                            </tr>
                        </thead>
                        <tbody>${topProductsHtml}</tbody>
                    </table>
                </section>

                <section>
                    <h3>${t('accounting.pdf_expenses_detail')}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('accounting.col_category')}</th>
                                <th>${t('accounting.col_description')}</th>
                                <th style="text-align:right">${t('accounting.col_amount')}</th>
                            </tr>
                        </thead>
                        <tbody>${expensesHtml || `<tr><td colspan="3" style="text-align:center; padding: 20px;">${t('accounting.no_expenses')}</td></tr>`}</tbody>
                    </table>
                </section>

                <div class="footer">
                    ${t('accounting.generated_on', { date: new Date().toLocaleString(i18n.language) })}
                </div>
            </body>
            </html>
        `;

        try {
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
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: t('accounting.report_activity_dialog', { period: periodLabel }) });
            }
        } catch (error) {
            console.error(error);
            alert(t('accounting.report_gen_error'));
        }
    };

    const generateReceiptPdf = async (sale: AccountingSaleHistoryItem) => {
        if (!currentStore) return;
        await generateSalePdf(sale as unknown as Sale, currentStore, user?.currency);
    };

    const handleShareWhatsApp = () => {
        const text = t('accounting.share_whatsapp_text', {
            amount: globalFormatCurrency(invoiceTotal, user?.currency),
            client: invoiceClient || t('accounting.client_diverse')
        });
        Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    };

    const handleShareEmail = () => {
        const subject = t('accounting.share_email_subject', { client: invoiceClient || t('accounting.client_diverse') });
        const body = t('accounting.share_email_body', {
            amount: formatCurrency(invoiceTotal),
            store: currentStore?.name || t('common.my_shop')
        });
        Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    // Register drawer menu items
    useFocusEffect(
        useCallback(() => {
            setDrawerContent(t('tabs.accounting'), [
                { label: t('accounting.kpi_revenue', "Chiffre d'affaires"), icon: 'stats-chart-outline', onPress: () => scrollToSection('kpiGrid') },
                { label: t('accounting.expenses', 'Dépenses'), icon: 'wallet-outline', onPress: () => scrollToSection('expenses') },
                { label: t('accounting.kpi_stock', 'Stock & Pertes'), icon: 'cube-outline', onPress: () => scrollToSection('stockLoss') },
                { label: t('accounting.items_sold', 'Ventes & Achats'), icon: 'cart-outline', onPress: () => scrollToSection('itemsPurchases') },
                { label: t('accounting.revenue_trend', 'Courbe CA'), icon: 'trending-up-outline', onPress: () => scrollToSection('revenueTrend') },
                { label: t('accounting.revenue_breakdown', 'Répartition CA'), icon: 'pie-chart-outline', onPress: () => scrollToSection('revenueBreakdown') },
                { label: t('accounting.payment_methods', 'Moyens de paiement'), icon: 'card-outline', onPress: () => scrollToSection('paymentBreakdown') },
                { label: t('accounting.product_performance', 'Performance produits'), icon: 'podium-outline', onPress: () => scrollToSection('perfTable') },
                { label: t('accounting.recent_sales', 'Ventes récentes'), icon: 'receipt-outline', onPress: () => scrollToSection('recentSales') },
                { label: '', icon: '', onPress: () => {}, separator: true },
                { label: t('planner.title'), icon: 'calendar-outline', onPress: () => router.push('/(tabs)/planner' as any), plan: 'enterprise' },
                { label: t('accounting.add_expense', 'Ajouter une dépense'), icon: 'add-circle-outline', onPress: () => setShowExpenseModal(true) },
                { label: t('accounting.free_invoice', 'Créer une facture'), icon: 'document-text-outline', onPress: () => setShowInvoiceModal(true) },
                { label: t('accounting.report', "Rapport d'activité"), icon: 'analytics-outline', onPress: () => generateActivityReportPdf() },
                { label: t('accounting.export_csv', 'Exporter CSV'), icon: 'download-outline', onPress: () => handleExportCSV() },
            ]);
        }, [t, scrollToSection])
    );

    const isLocked = !isSuperAdmin && user?.role !== 'supplier' && (!['starter', 'pro', 'enterprise'].includes(user?.plan || '') || user?.subscription_status === 'expired');

    if (accessDenied) {
        return <AccessDenied onRetry={() => { setAccessDenied(false); loadData(selectedPeriod, appliedStart, appliedEnd); }} />;
    }

    if (loading && !isLocked) {
        return (
            <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </LinearGradient>
        );
    }

    const grossMarginPercentage = stats && stats.revenue > 0
        ? (stats.gross_profit / stats.revenue) * 100
        : 0;
    const netMarginPercentage = stats && stats.revenue > 0
        ? (stats.net_profit / stats.revenue) * 100
        : 0;
    const expenseRatioPercentage = stats && stats.revenue > 0
        ? (stats.expenses / stats.revenue) * 100
        : 0;

    const paymentColors = [
        '#10B981', // Green
        '#6366F1', // Indigo
        '#F59E0B', // Amber
        '#06B6D4', // Cyan
        '#EF4444', // Red
        '#8B5CF6', // Violet
        '#EC4899', // Pink
    ];

    return (
        <PremiumGate
            featureName={t('premium.features.accounting.title')}
            description={t('premium.features.accounting.desc')}
            benefits={t('premium.features.accounting.benefits', { returnObjects: true }) as string[]}
            icon="calculator-outline"
            locked={isLocked}
        >
            <View style={styles.container}>
                <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    >
                        {/* Header */}
                        <View style={{ paddingTop: Spacing.xs, marginBottom: Spacing.sm }}>
                            <Text style={styles.subtitle}>{stats?.period_label}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, marginTop: Spacing.xs }}>
                                <TouchableOpacity style={styles.actionBtn} onPress={generateActivityReportPdf}>
                                    <Ionicons name="analytics-outline" size={16} color={colors.primary} />
                                    <Text style={styles.actionBtnText}>{t('accounting.report')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={handleExportCSV}>
                                    <Ionicons name="download-outline" size={16} color={colors.primary} />
                                    <Text style={styles.actionBtnText}>{t('accounting.export_csv')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={openInvoiceModal}>
                                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                                    <Text style={styles.actionBtnText}>{t('accounting.free_invoice', { defaultValue: 'Facture libre' })}</Text>
                                </TouchableOpacity>
                            </ScrollView>

                            <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
                                <PeriodSelector
                                    selectedPeriod={selectedPeriod}
                                    onSelectPeriod={changePeriod}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onApplyCustomDate={(s, e) => {
                                        setStartDate(s);
                                        setEndDate(e);
                                        applyCustomDates(s, e);
                                    }}
                                />
                            </View>
                        </View>

                        {/* KPI Grid */}
                        <View style={styles.kpiGrid} onLayout={e => { sectionOffsets.current.kpiGrid = e.nativeEvent.layout.y; }}>
                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.success + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('revenue')}>
                                <KpiInfoButton info={t('accounting.info_revenue')} />
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="cash-outline" size={20} color={colors.success} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.revenue')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.success }]}>
                                    {formatCurrency(stats?.revenue ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.sales_count_value', { count: stats?.sales_count ?? 0 })}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.primary + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('gross_profit')}>
                                <KpiInfoButton info={t('accounting.info_gross_profit')} />
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.margin_on_sales')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                                    {formatCurrency(stats?.gross_profit ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.margin_percentage', { percentage: grossMarginPercentage.toFixed(1) })}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.warning + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('expenses')}>
                                <KpiInfoButton info={t('accounting.info_expenses')} />
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="calculator-outline" size={20} color={colors.warning} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.total_expenses')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.warning }]}>
                                    {formatCurrency(stats?.expenses ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.expense_lines', { count: expensesList.length })}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.kpiCard, { borderColor: (stats?.net_profit ?? 0) >= 0 ? colors.info + '40' : colors.danger + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('net_profit')}>
                                <KpiInfoButton info={t('accounting.info_net_profit')} />
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color={(stats?.net_profit ?? 0) >= 0 ? colors.info : colors.danger} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.net_profit')}</Text>
                                <Text style={[styles.kpiValue, { color: (stats?.net_profit ?? 0) >= 0 ? colors.info : colors.danger }]}>
                                    {formatCurrency(stats?.net_profit ?? 0)}
                                </Text>
                            </TouchableOpacity>

                            {(stats as any)?.tax_collected > 0 && (
                                <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.warning + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('tax')}>
                                    <View style={styles.kpiHeader}>
                                        <Ionicons name="receipt-outline" size={20} color={colors.warning} />
                                        <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                    </View>
                                    <Text style={styles.kpiLabel}>{t('accounting.tax_collected')}</Text>
                                    <Text style={[styles.kpiValue, { color: colors.warning }]}>
                                        {formatCurrency((stats as any)?.tax_collected ?? 0)}
                                    </Text>
                                    <Text style={styles.kpiSubValue}>TVA</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {pendingSummary.pendingTotal > 0 && (
                            <View style={[styles.offlineBanner, { borderColor: colors.warning + '35', backgroundColor: colors.warning + '14' }]}>
                                <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
                                <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
                                    {pendingSummary.pendingInvoices} facture(s) et {pendingSummary.pendingExpenses} dépense(s) attendent encore la synchronisation. Les totaux ci-dessus restent ceux du dernier cache confirmé.
                                </Text>
                            </View>
                        )}

                        {/* Expenses Section */}
                        <View style={[styles.section, { marginTop: 20 }]} onLayout={e => { sectionOffsets.current.expenses = e.nativeEvent.layout.y; }}>
                            <View style={styles.sectionHeader}>
                                <View>
                                    <Text style={styles.sectionTitle}>{t('accounting.expenses')}</Text>
                                </View>
                                <TouchableOpacity style={styles.addExpenseBtn} onPress={openExpenseModal}>
                                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {expensesList.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>{t('accounting.no_expenses')}</Text>
                                </View>
                            ) : (
                                <View>
                                    <View style={styles.expensesList}>
                                        {(showAllExpenses ? expensesList : expensesList.slice(0, 5)).map((exp) => (
                                            <View key={exp.expense_id} style={styles.expenseItem}>
                                                <View style={styles.expenseInfo}>
                                                    <Text style={styles.expenseCategory}>
                                                        {t(`accounting.expenses_categories.${exp.category}`, { defaultValue: exp.category })}
                                                        {(exp as any).offline_pending ? ` • ${t('common.pending', { defaultValue: 'En attente' })}` : ''}
                                                    </Text>
                                                    <Text style={styles.expenseDate}>{formatDate(exp.created_at)}</Text>
                                                    {exp.description && <Text style={styles.expenseDesc}>{exp.description}</Text>}
                                                </View>
                                                <View style={styles.expenseAction}>
                                                    <Text style={styles.expenseAmount}>-{formatCurrency(exp.amount)}</Text>
                                                    <TouchableOpacity onPress={() => deleteExpense(exp.expense_id)}>
                                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                    {expensesList.length > 5 && (
                                        <TouchableOpacity
                                            style={styles.seeMoreBtn}
                                            onPress={() => setShowAllExpenses(!showAllExpenses)}
                                        >
                                            <Text style={styles.seeMoreText}>
                                                {showAllExpenses ? t('common.see_less') : t('accounting.see_other_expenses', { count: expensesList.length - 5 })}
                                            </Text>
                                            <Ionicons name={showAllExpenses ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* KPI Grid 2: Stock & Losses */}
                        <View style={[styles.kpiGrid, { marginTop: 10 }]} onLayout={e => { sectionOffsets.current.stockLoss = e.nativeEvent.layout.y; }}>
                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.warning + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('stock')}>
                                <KpiInfoButton info={t('accounting.info_stock_purchase')} />
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="cube-outline" size={20} color={colors.warning} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.stock_value_purchase')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.warning }]}>
                                    {formatCurrency(stats?.stock_value ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.stock_value_selling', { value: formatCurrency(stats?.stock_selling_value ?? 0) })}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.danger + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('losses')}>
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="flame-outline" size={20} color={colors.danger} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.losses')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.danger }]}>
                                    {formatCurrency(stats?.total_losses ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>
                                    {t('accounting.loss_reasons', { count: Object.keys(stats?.loss_breakdown ?? {}).length })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* KPI Grid 3: Items & Purchases */}
                        <View style={[styles.kpiGrid, { marginTop: 10 }]} onLayout={e => { sectionOffsets.current.itemsPurchases = e.nativeEvent.layout.y; }}>
                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.success + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('items')}>
                                <KpiInfoButton info={t('accounting.info_sales_count')} />
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="cart-outline" size={20} color={colors.success} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.items_sold')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.success }]}>
                                    {stats?.total_items_sold ?? 0}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.avg_sale', { value: formatCurrency(stats?.avg_sale ?? 0) })}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.kpiCard, { borderColor: colors.info + '40' }]} activeOpacity={0.9} onPress={() => setActiveKpiDetail('purchases')}>
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="bag-handle-outline" size={20} color={colors.info} />
                                    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.supplier_purchases')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.info }]}>
                                    {formatCurrency(stats?.total_purchases ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.purchases_count', { count: stats?.purchases_count ?? 0 })}</Text>
                            </TouchableOpacity>
                        </View>


                        {/* Revenue Trend Chart */}
                        {
                            stats && stats.daily_revenue && stats.daily_revenue.length > 1 && (
                                <View style={styles.section} onLayout={e => { sectionOffsets.current.revenueTrend = e.nativeEvent.layout.y; }}>
                                    <Text style={styles.sectionTitle}>{t('accounting.revenue_trend')}</Text>
                                    <Text style={styles.sectionSubtitle}>
                                        {revenueSeries.length > 1
                                            ? `Variation sur la période : ${revenueDelta >= 0 ? '+' : ''}${formatCurrency(revenueDelta)}${bestRevenueDay ? ` • pic le ${new Date(bestRevenueDay.date).toLocaleDateString(i18n.language)}` : ''}`
                                            : "Suivi quotidien du chiffre d'affaires sur la période."}
                                    </Text>
                                    <View style={styles.chartContainer}>
                                        <LineChart
                                            data={{
                                                labels: visibleRevenueLabels,
                                                datasets: [{
                                                    data: stats.daily_revenue.map(d => d.revenue || 0),
                                                    color: () => colors.success,
                                                    strokeWidth: 2,
                                                }],
                                            }}
                                            width={screenWidth - Spacing.md * 4}
                                            height={200}
                                            yAxisSuffix={" " + t('common.currency_short')}
                                            chartConfig={{
                                                backgroundColor: 'transparent',
                                                backgroundGradientFrom: 'transparent',
                                                backgroundGradientTo: 'transparent',
                                                decimalPlaces: 0,
                                                color: (opacity = 1) => isDark
                                                    ? `rgba(255, 255, 255, ${opacity})`
                                                    : `rgba(15, 23, 42, ${opacity * 0.5})`,
                                                labelColor: () => isDark ? colors.textSecondary : '#334155',
                                                propsForDots: { r: '3', strokeWidth: '1', stroke: colors.success },
                                            }}
                                            withInnerLines={false}
                                            withOuterLines={true}
                                            withVerticalLabels={true}
                                            withHorizontalLabels={true}
                                            style={{ borderRadius: BorderRadius.md }}
                                        />
                                    </View>
                                </View>
                            )
                        }

                        {/* Revenue Breakdown PieChart */}
                        {
                            stats && stats.revenue > 0 && (
                                <View style={styles.section} onLayout={e => { sectionOffsets.current.revenueBreakdown = e.nativeEvent.layout.y; }}>
                                    <Text style={styles.sectionTitle}>{t('accounting.revenue_breakdown')}</Text>
                                    <View style={styles.chartContainer}>
                                        <PieChart
                                            data={[
                                                {
                                                    name: t('accounting.cost_cogs'),
                                                    population: Math.round(stats.cogs),
                                                    color: isDark ? '#6B7280' : '#9CA3AF',
                                                    legendFontColor: colors.text,
                                                    legendFontSize: 11,
                                                },
                                                {
                                                    name: t('accounting.gross_margin'),
                                                    population: Math.round(stats.gross_profit),
                                                    color: colors.primary,
                                                    legendFontColor: colors.text,
                                                    legendFontSize: 11,
                                                },
                                            ]}
                                            width={screenWidth - Spacing.md * 4}
                                            height={180}
                                            chartConfig={{
                                                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                            }}
                                            accessor="population"
                                            backgroundColor="transparent"
                                            paddingLeft="15"
                                            absolute
                                        />
                                    </View>
                                </View>
                            )
                        }

                        {/* Payment Breakdown */}
                        {
                            stats && Object.keys(stats.payment_breakdown).length > 0 && (
                                <View style={styles.section} onLayout={e => { sectionOffsets.current.paymentBreakdown = e.nativeEvent.layout.y; }}>
                                    <Text style={styles.sectionTitle}>{t('accounting.payment_methods')}</Text>
                                    <View style={styles.chartContainer}>
                                        <PieChart
                                            data={Object.entries(stats.payment_breakdown).map(([method, amount], i) => ({
                                                name: t(PAYMENT_LABELS[method] || method),
                                                population: Math.round(amount),
                                                color: paymentColors[i % paymentColors.length],
                                                legendFontColor: colors.text,
                                                legendFontSize: 11,
                                            }))}
                                            width={screenWidth - Spacing.md * 4}
                                            height={180}
                                            chartConfig={{
                                                color: (opacity = 1) => isDark
                                                    ? `rgba(255, 255, 255, ${opacity})`
                                                    : `rgba(15, 23, 42, ${opacity * 0.5})`,
                                            }}
                                            accessor="population"
                                            backgroundColor="transparent"
                                            paddingLeft="15"
                                            absolute
                                        />
                                    </View>
                                </View>
                            )
                        }

                        {/* Performance par Produit */}
                        {stats && stats.product_performance && stats.product_performance.length > 0 && (
                            <View style={styles.section} onLayout={e => { sectionOffsets.current.perfTable = e.nativeEvent.layout.y; }}>
                                <View style={styles.sectionHeader}>
                                    <View>
                                        <Text style={styles.sectionTitle}>{t('accounting.product_performance')}</Text>
                                    </View>
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.perfTable}>
                                        {/* Table Header */}
                                        <View style={[styles.perfRow, styles.perfHeader]}>
                                            <Text style={[styles.perfCell, { width: 140 }]}>{t('accounting.product')}</Text>
                                            <Text style={[styles.perfCell, styles.perfCellRight, { width: 60 }]}>{t('accounting.sold')}</Text>
                                            <Text style={[styles.perfCell, styles.perfCellRight, { width: 90 }]}>{t('accounting.revenue')}</Text>
                                            <Text style={[styles.perfCell, styles.perfCellRight, { width: 90 }]}>{t('accounting.cost_purchase')}</Text>
                                            <Text style={[styles.perfCell, styles.perfCellRight, { width: 90 }]}>{t('accounting.losses')}</Text>
                                            <Text style={[styles.perfCell, styles.perfCellRight, { width: 90 }]}>{t('accounting.margin')}</Text>
                                        </View>

                                        {/* Table Body */}
                                        {(showAllPerf ? stats.product_performance : stats.product_performance.slice(0, 10))
                                            .sort((a, b) => b.revenue - a.revenue)
                                            .map((item) => {
                                                const margin = item.revenue - item.cogs - item.loss;
                                                return (
                                                    <View key={item.id} style={styles.perfRow}>
                                                        <Text style={[styles.perfCell, { width: 140, fontWeight: '500' }]} numberOfLines={1}>{item.name}</Text>
                                                        <Text style={[styles.perfCell, styles.perfCellRight, { width: 60 }]}>{item.qty_sold}</Text>
                                                        <Text style={[styles.perfCell, styles.perfCellRight, { width: 90, color: colors.success }]}>
                                                            {item.revenue.toLocaleString()}
                                                        </Text>
                                                        <Text style={[styles.perfCell, styles.perfCellRight, { width: 90, color: colors.textSecondary }]}>
                                                            {item.cogs.toLocaleString()}
                                                        </Text>
                                                        <Text style={[styles.perfCell, styles.perfCellRight, { width: 90, color: colors.danger }]}>
                                                            {item.loss > 0 ? `-${item.loss.toLocaleString()}` : '0'}
                                                        </Text>
                                                        <Text style={[styles.perfCell, styles.perfCellRight, { width: 90, color: margin >= 0 ? colors.primary : colors.danger, fontWeight: 'bold' }]}>
                                                            {margin.toLocaleString()}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                    </View>
                                </ScrollView>

                                {stats.product_performance.length > 10 && (
                                    <TouchableOpacity
                                        style={styles.seeMoreBtn}
                                        onPress={() => setShowAllPerf(!showAllPerf)}
                                    >
                                        <Text style={styles.seeMoreText}>
                                            {showAllPerf ? t('common.see_less') : t('accounting.see_other_products', { count: stats.product_performance.length - 10 })}
                                        </Text>
                                        <Ionicons name={showAllPerf ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Recent Sales */}
                        <View style={styles.section} onLayout={e => { sectionOffsets.current.recentSales = e.nativeEvent.layout.y; }}>
                            <Text style={styles.sectionTitle}>{t('accounting.recent_sales')}</Text>
                            {recentSales.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
                                    <Text style={styles.emptyText}>{t('accounting.no_sales')}</Text>
                                </View>
                            ) : (
                                <View style={styles.tableContainer}>
                                    {recentSales.slice(0, 10).map((sale) => (
                                        <View key={sale.sale_id} style={styles.saleRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.saleDate}>
                                                    {formatDate(sale.created_at)}
                                                </Text>
                                                <Text style={[styles.saleMeta, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                                                    {sale.customer_name || t('accounting.client_diverse')}
                                                </Text>
                                                <Text style={[styles.saleMeta, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                                    {sale.items.map(i => i.product_name).join(', ') || t('accounting.articles_count', { count: sale.items.length })}
                                                </Text>
                                                <Text style={styles.saleMeta}>{t('accounting.articles_short', { count: sale.items.length })} • {t(PAYMENT_LABELS[sale.payment_method] || sale.payment_method)}</Text>
                                                {(sale as any).offline_pending_invoice && (
                                                    <Text style={[styles.saleMeta, { color: colors.warning, fontWeight: '700' }]}>
                                                        {t('common.pending', { defaultValue: 'En attente' })} • {t('accounting.offline_invoice', 'facture hors ligne')}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                                <Text style={styles.saleTotal}>{formatCurrency(sale.total_amount)}</Text>
                                                <Text
                                                    style={[
                                                        styles.saleStatusBadge,
                                                        getSaleStatusTone(sale),
                                                    ]}
                                                >
                                                    {getSaleStatusLabel(sale)}
                                                </Text>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    <TouchableOpacity style={styles.receiptBtn} onPress={() => generateReceiptPdf(sale)}>
                                                        <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                                                    </TouchableOpacity>
                                                    {sale.invoice_id ? (
                                                        <TouchableOpacity
                                                            style={styles.receiptBtn}
                                                            onPress={() => handleOpenStoredInvoice(sale.invoice_id!, invoiceHistory.find((invoice) => invoice.invoice_id === sale.invoice_id))}
                                                        >
                                                            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                                                        </TouchableOpacity>
                                                    ) : sale.status !== 'cancelled' ? (
                                                        <TouchableOpacity
                                                            style={[styles.receiptBtn, invoiceBusyId === sale.sale_id && { opacity: 0.5 }]}
                                                            disabled={invoiceBusyId === sale.sale_id}
                                                            onPress={() => handleCreateInvoiceFromSale(sale.sale_id)}
                                                        >
                                                            {invoiceBusyId === sale.sale_id ? (
                                                                <ActivityIndicator size="small" color={colors.primary} />
                                                            ) : (
                                                                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ) : null}
                                                    {sale.status !== 'cancelled' && !sale.invoice_id ? (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.receiptBtn,
                                                                {
                                                                    borderColor: colors.danger + '35',
                                                                    backgroundColor: colors.danger + '14',
                                                                    opacity: cancellingSaleId === sale.sale_id ? 0.6 : 1,
                                                                },
                                                            ]}
                                                            disabled={cancellingSaleId === sale.sale_id}
                                                            onPress={() => handleCancelSale(sale.sale_id)}
                                                        >
                                                            {cancellingSaleId === sale.sale_id ? (
                                                                <ActivityIndicator size="small" color={colors.danger} />
                                                            ) : (
                                                                <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                                {sale.status === 'cancelled' && sale.cancelled_at ? (
                                                    <Text
                                                        style={[
                                                            styles.saleMeta,
                                                            {
                                                                color: colors.danger,
                                                                fontWeight: '700',
                                                                textAlign: 'right',
                                                                maxWidth: 180,
                                                            },
                                                        ]}
                                                    >
                                                        {t('accounting.cancelled_on', {
                                                            defaultValue: 'Annulée le {{date}}',
                                                            date: formatDate(sale.cancelled_at),
                                                        })}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('accounting.invoice_history', { defaultValue: 'Historique des factures' })}</Text>
                            {invoiceHistory.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
                                    <Text style={styles.emptyText}>{t('accounting.no_invoices', { defaultValue: 'Aucune facture sur cette periode.' })}</Text>
                                </View>
                            ) : (
                                <View style={styles.tableContainer}>
                                    {invoiceHistory.slice(0, 10).map((invoice) => (
                                        <View key={invoice.invoice_id} style={styles.saleRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.saleDate}>{invoice.invoice_number}</Text>
                                                <Text style={[styles.saleMeta, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                                                    {invoice.customer_name || t('accounting.client_diverse')}
                                                </Text>
                                                <Text style={styles.saleMeta}>
                                                    {(invoice.invoice_label || t('accounting.invoice', 'Facture'))} • {formatDate(invoice.issued_at)}
                                                </Text>
                                                {(invoice as any).offline_pending && (
                                                    <Text style={[styles.saleMeta, { color: colors.warning, fontWeight: '700' }]}>
                                                        {t('common.pending', { defaultValue: 'En attente de synchronisation' })}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                                <Text style={styles.saleTotal}>{formatCurrency(invoice.total_amount)}</Text>
                                                <TouchableOpacity
                                                    style={styles.receiptBtn}
                                                    onPress={() => handleOpenStoredInvoice(invoice.invoice_id, invoice)}
                                                >
                                                    <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={{ height: Spacing.xxl }} />
                    </ScrollView >
                </LinearGradient>

                {/* Invoice Modal */}
                {showInvoiceModal && <Modal visible={showInvoiceModal} animationType="slide" transparent >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('invoice.create_invoice')}</Text>
                                <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                                {/* Client */}
                                <Text style={styles.fieldLabel}>{t('invoice.client')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={invoiceClient}
                                    onChangeText={setInvoiceClient}
                                    placeholder={t('invoice.client_name_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                />
                                {customersList.length > 0 && !invoiceClient && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                                        {customersList.slice(0, 5).map(c => (
                                            <TouchableOpacity
                                                key={c.customer_id}
                                                style={styles.clientChip}
                                                onPress={() => setInvoiceClient(c.name)}
                                            >
                                                <Text style={styles.clientChipText}>{c.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}

                                {/* Items */}
                                <Text style={styles.fieldLabel}>{t('invoice.items')}</Text>
                                {invoiceItems.map((item, index) => (
                                    <View key={index} style={styles.invoiceLineRow}>
                                        <TextInput
                                            style={[styles.input, { flex: 2 }]}
                                            value={item.desc}
                                            onChangeText={v => updateInvoiceLine(index, 'desc', v)}
                                            placeholder={t('invoice.description_placeholder')}
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        <TextInput
                                            style={[styles.input, { width: 50, textAlign: 'center' }]}
                                            value={item.qty}
                                            onChangeText={v => updateInvoiceLine(index, 'qty', v)}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        <TextInput
                                            style={[styles.input, { flex: 1, textAlign: 'right' }]}
                                            value={item.price}
                                            onChangeText={v => updateInvoiceLine(index, 'price', v)}
                                            placeholder={t('invoice.price_placeholder')}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        <TextInput
                                            style={[styles.input, { width: 50, textAlign: 'center' }]}
                                            value={item.tva}
                                            onChangeText={v => updateInvoiceLine(index, 'tva', v)}
                                            placeholder={t('invoice.tva_percentage')}
                                            keyboardType="numeric"
                                            placeholderTextColor={colors.textMuted}
                                        />
                                        {invoiceItems.length > 1 && (
                                            <TouchableOpacity onPress={() => removeInvoiceLine(index)} style={{ padding: 8 }}>
                                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.addLineBtn} onPress={addInvoiceLine}>
                                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                                    <Text style={styles.addLineBtnText}>{t('invoice.add_line')}</Text>
                                </TouchableOpacity>

                                {/* Note */}
                                <Text style={styles.fieldLabel}>{t('invoice.note_optional')}</Text>
                                <TextInput
                                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                                    value={invoiceNote}
                                    onChangeText={setInvoiceNote}
                                    placeholder={t('invoice.note_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                />

                                {/* Total + Generate */}
                                <View style={styles.invoiceTotalRow}>
                                    <Text style={styles.invoiceTotalLabel}>{t('invoice.total')}</Text>
                                    <Text style={styles.invoiceTotalValue}>{invoiceTotal.toLocaleString()} {t('common.currency_default')}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.generateBtn}
                                    onPress={generateInvoicePdf}
                                >
                                    <Ionicons name="document-text" size={20} color="#fff" />
                                    <Text style={styles.generateBtnText}>{t('invoice.generate_pdf')}</Text>
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { flex: 1, backgroundColor: '#25D366', borderColor: '#25D366' }]}
                                        onPress={handleShareWhatsApp}
                                    >
                                        <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>WhatsApp</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { flex: 1, backgroundColor: '#007AFF', borderColor: '#007AFF' }]}
                                        onPress={handleShareEmail}
                                    >
                                        <Ionicons name="mail-outline" size={18} color="#fff" />
                                        <Text style={[styles.actionBtnText, { color: '#fff' }]}>Email</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>}

                {/* Expense Modal */}
                {showExpenseModal && <Modal visible={showExpenseModal} animationType="slide" transparent onRequestClose={requestCloseExpenseModal}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('accounting.new_expense')}</Text>
                                <TouchableOpacity onPress={requestCloseExpenseModal}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView>
                                <Text style={styles.fieldLabel}>{t('accounting.category')}</Text>
                                <View style={styles.categoryPicker}>
                                    {expenseCategories.map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.catBadge, expenseCategory === cat && styles.catBadgeActive]}
                                            onPress={() => setExpenseCategory(cat)}
                                        >
                                            <Text style={[styles.catBadgeText, expenseCategory === cat && styles.catBadgeTextActive]}>
                                                {t(`accounting.expenses_categories.${cat}`, { defaultValue: cat })}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.fieldLabel}>Ajouter une catégorie personnalisée</Text>
                                <View style={styles.customCategoryRow}>
                                    <TextInput
                                        style={[styles.input, styles.customCategoryInput]}
                                        value={expenseCategoryDraft}
                                        onChangeText={setExpenseCategoryDraft}
                                        placeholder="Ex : Marketing, Entretien, Frais bancaires"
                                        placeholderTextColor={colors.textMuted}
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.addCategoryBtn,
                                            (savingExpenseCategory || !expenseCategoryDraft.trim()) && styles.addCategoryBtnDisabled,
                                        ]}
                                        onPress={addExpenseCategory}
                                        disabled={savingExpenseCategory || !expenseCategoryDraft.trim()}
                                    >
                                        {savingExpenseCategory ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="add-outline" size={18} color="#fff" />
                                                <Text style={styles.addCategoryBtnText}>Ajouter</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.categoryHint}>
                                    Les catégories ajoutées ici seront réutilisables pour vos prochaines dépenses sur ce compte.
                                </Text>

                                <Text style={styles.fieldLabel}>{t('accounting.amount')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={expenseAmount}
                                    onChangeText={setExpenseAmount}
                                    keyboardType="numeric"
                                    placeholder={t('accounting.amount_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                />

                                <Text style={styles.fieldLabel}>{t('accounting.description_optional')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={expenseDescription}
                                    onChangeText={setExpenseDescription}
                                    placeholder={t('accounting.details_placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                />

                                <View style={styles.modalFooter}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={requestCloseExpenseModal}>
                                        <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.saveBtn} onPress={saveExpense} disabled={savingExpense}>
                                        {savingExpense ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>}

                {activeKpiDetail && (
                    <Modal visible={!!activeKpiDetail} animationType="slide" transparent onRequestClose={() => setActiveKpiDetail(null)}>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{kpiModalTitle[activeKpiDetail]}</Text>
                                    <TouchableOpacity onPress={() => setActiveKpiDetail(null)}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView>
                                    <View style={styles.kpiDetailSummary}>
                                        {getKpiInsight(activeKpiDetail).map((line) => (
                                            <View key={line} style={styles.kpiDetailBullet}>
                                                <Ionicons name="ellipse" size={8} color={colors.primary} />
                                                <Text style={styles.kpiDetailText}>{line}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    {activeKpiDetail === 'revenue' && revenueSeries.length > 0 && (
                                        <View style={styles.kpiDetailBlock}>
                                            {revenueSeries.slice().sort((a, b) => a.date.localeCompare(b.date)).map((entry) => (
                                                <View key={entry.date} style={styles.tableRow}>
                                                    <Text style={styles.tableLabel}>{new Date(entry.date).toLocaleDateString(i18n.language)}</Text>
                                                    <Text style={[styles.tableLabel, { color: colors.success, fontWeight: '700' }]}>{formatCurrency(entry.revenue)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {activeKpiDetail === 'gross_profit' && (stats?.product_performance?.length ?? 0) > 0 && (
                                        <View style={styles.kpiDetailBlock}>
                                            {stats?.product_performance?.slice()
                                                .slice()
                                                .sort((a, b) => (b.gross_profit ?? (b.revenue - b.cogs)) - (a.gross_profit ?? (a.revenue - a.cogs)))
                                                .slice(0, 6)
                                                .map((item) => (
                                                    <View key={item.id} style={styles.tableRow}>
                                                        <Text style={styles.tableLabel} numberOfLines={1}>{item.name}</Text>
                                                        <Text style={[styles.tableLabel, { color: colors.primary, fontWeight: '700' }]}>
                                                            {formatCurrency(item.gross_profit ?? (item.revenue - item.cogs))}
                                                        </Text>
                                                    </View>
                                                ))}
                                        </View>
                                    )}

                                    {activeKpiDetail === 'expenses' && (
                                        <View style={styles.kpiDetailBlock}>
                                            {(topExpenseCategories.length > 0
                                                ? topExpenseCategories.map((category) => ({
                                                    key: category.category,
                                                    label: category.label || category.category,
                                                    amount: category.amount,
                                                }))
                                                : Object.entries(stats?.expenses_breakdown ?? {}).map(([category, amount]) => ({
                                                    key: category,
                                                    label: category,
                                                    amount,
                                                }))
                                            ).map((item) => (
                                                <View key={item.key} style={styles.tableRow}>
                                                    <Text style={styles.tableLabel} numberOfLines={1}>{item.label}</Text>
                                                    <Text style={[styles.tableLabel, { color: colors.warning, fontWeight: '700' }]}>{formatCurrency(item.amount)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {activeKpiDetail === 'net_profit' && (
                                        <View style={styles.kpiDetailBlock}>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_revenue', "Chiffre d'affaires")}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.revenue ?? 0)}</Text>
                                            </View>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_cogs', "Coût d'achat")}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.cogs ?? 0)}</Text>
                                            </View>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_expenses', 'Dépenses')}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.expenses ?? 0)}</Text>
                                            </View>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_losses', 'Pertes')}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.total_losses ?? 0)}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {activeKpiDetail === 'stock' && (
                                        <View style={styles.kpiDetailBlock}>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_stock_value', "Valeur d'achat")}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.stock_value ?? 0)}</Text>
                                            </View>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_selling_potential', 'Potentiel de vente')}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.stock_selling_value ?? 0)}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {activeKpiDetail === 'losses' && (
                                        <View style={styles.kpiDetailBlock}>
                                            {topLossEntries.map(({ reason, amount }) => (
                                                <View key={reason} style={[styles.tableRow, styles.kpiLossRow]}>
                                                    <Text numberOfLines={2} style={styles.kpiLossLabel}>{getLossLabel(reason)}</Text>
                                                    <Text style={styles.kpiLossAmount}>{formatCurrency(amount)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {activeKpiDetail === 'items' && (stats?.product_performance?.length ?? 0) > 0 && (
                                        <View style={styles.kpiDetailBlock}>
                                            {stats?.product_performance?.slice()
                                                .slice()
                                                .sort((a, b) => b.qty_sold - a.qty_sold)
                                                .slice(0, 8)
                                                .map((item) => (
                                                    <View key={item.id} style={styles.tableRow}>
                                                        <Text style={styles.tableLabel} numberOfLines={1}>{item.name}</Text>
                                                        <Text style={[styles.tableLabel, { color: colors.success, fontWeight: '700' }]}>{item.qty_sold}</Text>
                                                    </View>
                                                ))}
                                        </View>
                                    )}

                                    {activeKpiDetail === 'purchases' && (
                                        <View style={styles.kpiDetailBlock}>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_total_amount', 'Montant total')}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency(stats?.total_purchases ?? 0)}</Text>
                                            </View>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_restocks', 'Réapprovisionnements')}</Text>
                                                <Text style={styles.tableLabel}>{stats?.purchases_count ?? 0}</Text>
                                            </View>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_avg_purchase', 'Moyenne par achat')}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency((stats?.total_purchases ?? 0) / Math.max(stats?.purchases_count ?? 1, 1))}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {activeKpiDetail === 'tax' && (
                                        <View style={styles.kpiDetailBlock}>
                                            <View style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{t('accounting.label_tax_collected', 'Taxes collectées')}</Text>
                                                <Text style={styles.tableLabel}>{formatCurrency((stats as any)?.tax_collected ?? 0)}</Text>
                                            </View>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}

            </View >
        </PremiumGate>
    );
}

const getStyles = (colors: any, glassStyle: any, screenWidth: number = 375) => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: Spacing.md, paddingTop: Spacing.xxl },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    pageTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        color: colors.text,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.glass,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    subtitle: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.glass, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder,
    },
    actionBtnText: { fontSize: FontSize.xs, fontWeight: '600', color: colors.primary },

    // Period selector
    periodRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    periodBtn: {
        flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
        backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center',
    },
    periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    periodBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.textSecondary },
    periodBtnTextActive: { color: '#fff' },

    // KPI Grid
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
    kpiCard: {
        ...glassStyle,
        width: (screenWidth - Spacing.md * 2 - Spacing.sm) / 2,
        padding: Spacing.md,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, gap: 2,
    },
    kpiLabel: { color: colors.textSecondary, fontSize: FontSize.xs },
    kpiValue: { fontSize: FontSize.md, fontWeight: '700' },
    kpiSubValue: { fontSize: 10, color: colors.textMuted },

    // Sections
    section: { marginBottom: Spacing.xl },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    sectionSubtitle: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
    offlineBanner: {
        ...glassStyle,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    offlineBannerText: {
        flex: 1,
        fontSize: FontSize.sm,
        fontWeight: '600',
        lineHeight: 20,
    },

    // Performance Table
    perfTable: { paddingTop: Spacing.sm },
    perfRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    perfHeader: { backgroundColor: 'rgba(255,255,255,0.03)', borderTopLeftRadius: BorderRadius.sm, borderTopRightRadius: BorderRadius.sm },
    perfCell: { fontSize: 12, color: colors.text, paddingHorizontal: 4 },
    perfCellRight: { textAlign: 'right' },

    seeMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: Spacing.md, marginTop: Spacing.xs,
    },
    seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },

    chartContainer: {
        ...glassStyle, padding: Spacing.md, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)',
    },

    // Tables
    tableContainer: { ...glassStyle, padding: Spacing.md, backgroundColor: 'rgba(255,255,255,0.02)' },
    tableRow: {
        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    tableLabel: { color: colors.text, fontSize: FontSize.sm, flexShrink: 1 },
    tableDanger: { color: colors.danger, fontSize: FontSize.sm, fontWeight: '600' },
    kpiLossRow: {
        alignItems: 'center',
        gap: Spacing.sm,
    },
    kpiLossLabel: {
        color: colors.text,
        fontSize: FontSize.sm,
        flex: 1,
        paddingRight: Spacing.sm,
    },
    kpiLossAmount: {
        color: colors.danger,
        fontSize: FontSize.sm,
        fontWeight: '700',
        minWidth: 104,
        textAlign: 'right',
        flexShrink: 0,
    },
    lossRow: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        gap: 6,
    },
    lossRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    lossBarTrack: {
        width: '100%',
        height: 8,
        borderRadius: 999,
        backgroundColor: colors.glass,
        overflow: 'hidden',
    },
    lossBarFill: {
        height: '100%',
        borderRadius: 999,
    },
    lossMeta: {
        color: colors.textMuted,
        fontSize: FontSize.xs,
        fontWeight: '600',
    },

    // Sales
    saleRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.divider, gap: Spacing.sm,
    },
    saleDate: { color: colors.text, fontSize: FontSize.sm, fontWeight: '600' },
    saleMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
    saleTotal: { color: colors.success, fontSize: FontSize.sm, fontWeight: '700' },
    saleStatusBadge: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    receiptBtn: {
        padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.sm,
    },

    // Empty
    emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
    emptyStateText: { color: colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
    emptyText: { color: colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },
    expensesList: { gap: Spacing.sm },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 9999 },
    modalContent: {
        backgroundColor: colors.bgMid, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg, maxHeight: '90%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    modalScroll: { maxHeight: 600 },

    // Form
    fieldLabel: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 4, marginTop: Spacing.sm },
    input: {
        backgroundColor: colors.inputBg || colors.glass, borderRadius: BorderRadius.sm,
        borderWidth: 1, borderColor: colors.divider, color: colors.text,
        fontSize: FontSize.sm, padding: Spacing.sm, marginBottom: Spacing.xs,
    },
    invoiceLineRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
    addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
    addLineBtnText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
    clientChip: {
        backgroundColor: colors.primary + '20', paddingHorizontal: Spacing.sm, paddingVertical: 4,
        borderRadius: BorderRadius.sm, marginRight: Spacing.xs,
    },
    clientChipText: { color: colors.primaryLight, fontSize: FontSize.xs, fontWeight: '600' },
    invoiceTotalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: Spacing.md, paddingVertical: Spacing.md,
        borderTopWidth: 2, borderTopColor: colors.primary,
    },
    invoiceTotalLabel: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    invoiceTotalValue: { fontSize: FontSize.lg, fontWeight: '800', color: colors.success },
    generateBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        backgroundColor: colors.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        marginTop: Spacing.md, marginBottom: Spacing.xl,
    },
    generateBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

    // Expense Styles
    expenseItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    expenseInfo: { flex: 1 },
    expenseCategory: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
    expenseDate: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    expenseDesc: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
    expenseAction: { alignItems: 'flex-end', gap: 8 },
    expenseAmount: { fontSize: 15, fontWeight: 'bold', color: colors.danger },
    filterSection: { marginBottom: 15 },
    customDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 4 },
    dateInput: { flex: 1, backgroundColor: colors.glass, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.divider, padding: 8, color: colors.text, fontSize: 13 },
    applyBtn: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 },
    addExpenseBtn: { padding: 4 },
    categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    catBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.divider, backgroundColor: 'transparent' },
    catBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catBadgeText: { color: colors.text, fontSize: 12 },
    catBadgeTextActive: { color: '#fff', fontWeight: 'bold' },
    customCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
    customCategoryInput: { flex: 1, marginBottom: 0 },
    addCategoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        minWidth: 110,
    },
    addCategoryBtnDisabled: {
        opacity: 0.5,
    },
    addCategoryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
    categoryHint: { color: colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },
    cancelBtn: { padding: Spacing.md },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
    kpiDetailSummary: {
        ...glassStyle,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    kpiDetailBullet: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    kpiDetailText: {
        flex: 1,
        color: colors.text,
        fontSize: FontSize.sm,
        lineHeight: 20,
    },
    kpiDetailBlock: {
        ...glassStyle,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
});

