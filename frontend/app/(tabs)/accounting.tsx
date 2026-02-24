import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
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
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LineChart, PieChart } from 'react-native-chart-kit';
import {
    accounting as accountingApi,
    sales as salesApi,
    customers as customersApi,
    stores as storesApi,
    expenses as expensesApi,
    AccountingStats,
    Sale,
    Customer,
    Store,
    Expense,
    API_URL,
    getToken,
    ApiError,
} from '../../services/api';

import { useAuth } from '../../contexts/AuthContext';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import PremiumGate from '../../components/PremiumGate';
import AccessDenied from '../../components/AccessDenied';
import PeriodSelector from '../../components/PeriodSelector';
import { formatCurrency as globalFormatCurrency, getCurrencySymbol } from '../../utils/format';
import {
    generateSalePdf,
    buildProfessionalInvoiceHtml,
    printAndShare
} from '../../utils/pdfReports';


const screenWidth = Dimensions.get('window').width;

// PERIODS constant removed as it's handled inside the component or by PeriodSelector

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'accounting.payment_cash',
    mobile_money: 'accounting.payment_mobile_money',
    card: 'accounting.payment_card',
    transfer: 'accounting.payment_transfer',
    credit: 'accounting.payment_credit',
};

const EXPENSE_CATEGORIES = [
    'rent', 'salary', 'transport', 'merchandise', 'electricity', 'water', 'internet', 'other'
];

export default function AccountingScreen() {
    const { colors, glassStyle, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors, glassStyle);
    const [stats, setStats] = useState<AccountingStats | null>(null);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedPeriod, setSelectedPeriod] = useState<number | 'custom'>(30);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    // Applied dates: only updated when user clicks "Appliquer", not on every keystroke
    const [appliedStart, setAppliedStart] = useState<string>('');
    const [appliedEnd, setAppliedEnd] = useState<string>('');
    const { user, isSuperAdmin } = useAuth();
    const [currentStore, setCurrentStore] = useState<Store | null>(null);

    // Expenses
    const [expensesList, setExpensesList] = useState<Expense[]>([]);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState('other');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [savingExpense, setSavingExpense] = useState(false);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showAllPerf, setShowAllPerf] = useState(false);
    const [showAllExpenses, setShowAllExpenses] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [invoiceClient, setInvoiceClient] = useState('');
    const [invoiceItems, setInvoiceItems] = useState([{ desc: '', qty: '1', price: '', tva: '0' }]);
    const [invoiceNote, setInvoiceNote] = useState('');
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    const loadData = useCallback(async (period: number | 'custom', start?: string, end?: string) => {
        try {
            const days = period === 'custom' ? 0 : period;
            const [statsRes, salesRes, expensesRes] = await Promise.all([
                accountingApi.getStats(days, start, end),
                salesApi.list(undefined, days, start, end, undefined, 0, 500),
                expensesApi.list(days, start, end, 0, 500)
            ]);
            setStats(statsRes);
            setRecentSales(salesRes.items ?? salesRes as any);
            setExpensesList(expensesRes.items ?? expensesRes as any);

            // Fetch current store details
            if (user?.active_store_id) {
                const stores = await storesApi.list();
                const active = stores.find(s => s.store_id === user.active_store_id);
                if (active) setCurrentStore(active);
            }
        } catch (error) {
            if (error instanceof ApiError && error.status === 403) {
                setAccessDenied(true);
            } else {
                console.error(error);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.active_store_id]);

    useFocusEffect(
        useCallback(() => {
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

    const applyCustomDates = () => {
        if (!startDate || !endDate) return;
        setAppliedStart(startDate);
        setAppliedEnd(endDate);
        setLoading(true);
        loadData('custom', startDate, endDate);
    };



    const openExpenseModal = () => {
        // console.log("Opening expense modal");
        setExpenseCategory('other');
        setExpenseAmount('');
        setExpenseDescription('');
        setShowExpenseModal(true);
    };

    const saveExpense = async () => {
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) {
            alert(t('accounting.invalid_amount'));
            return;
        }

        const performSave = async () => {
            setSavingExpense(true);
            try {
                await expensesApi.create({
                    category: expenseCategory,
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
        try {
            await expensesApi.delete(id);
            loadData(selectedPeriod, appliedStart, appliedEnd);
        } catch (error) {
            console.error(error);
            alert(t('accounting.delete_error'));
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
        params.set('token', token);
        Linking.openURL(`${API_URL}/export/accounting/csv?${params.toString()}`);
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
            title: t('accounting.invoice_title'),
            ref: refNum,
            date: now.toLocaleDateString(i18n.language),
            recipientLabel: t('accounting.recipient_label'),
            recipientName: invoiceClient || t('accounting.client_diverse'),
            itemsHtml,
            total: invoiceTotal,
            currency: user?.currency,
            notes: invoiceNote,
            paymentMethod: t('accounting.payment_cash')
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

    const generateReceiptPdf = async (sale: Sale) => {
        if (!currentStore) return;
        await generateSalePdf(sale, currentStore, user?.currency);
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

    const marginPercentage = stats && stats.revenue > 0
        ? (stats.gross_profit / stats.revenue) * 100
        : 0;

    const paymentColors = [colors.success, colors.primary, colors.warning, colors.info, colors.danger];

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
                                    <Text style={styles.actionBtnText}>{t('accounting.new_invoice')}</Text>
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
                                        applyCustomDates();
                                    }}
                                />
                            </View>
                        </View>

                        {/* KPI Grid */}
                        <View style={styles.kpiGrid}>
                            <View style={[styles.kpiCard, { borderColor: colors.success + '40' }]}>
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="cash-outline" size={20} color={colors.success} />
                                    <TouchableOpacity onPress={() => alert(t('accounting.revenue_info'))}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.revenue')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.success }]}>
                                    {formatCurrency(stats?.revenue ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.sales_count_value', { count: stats?.sales_count ?? 0 })}</Text>
                            </View>

                            <View style={[styles.kpiCard, { borderColor: colors.primary + '40' }]}>
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                                    <TouchableOpacity onPress={() => alert(t('accounting.margin_on_sales_info'))}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.margin_on_sales')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.primary }]}>
                                    {formatCurrency(stats?.gross_profit ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.margin_percentage', { percentage: marginPercentage.toFixed(1) })}</Text>
                            </View>

                            <View style={[styles.kpiCard, { borderColor: colors.warning + '40' }]}>
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="calculator-outline" size={20} color={colors.warning} />
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.total_expenses')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.warning }]}>
                                    {formatCurrency(stats?.expenses ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.expense_lines', { count: expensesList.length })}</Text>
                            </View>

                            <View style={[styles.kpiCard, { borderColor: (stats?.net_profit ?? 0) >= 0 ? colors.info + '40' : colors.danger + '40' }]}>
                                <View style={styles.kpiHeader}>
                                    <Ionicons name="checkmark-circle-outline" size={20} color={(stats?.net_profit ?? 0) >= 0 ? colors.info : colors.danger} />
                                    <TouchableOpacity onPress={() => alert(t('accounting.net_profit_info'))}>
                                        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.kpiLabel}>{t('accounting.net_profit')}</Text>
                                <Text style={[styles.kpiValue, { color: (stats?.net_profit ?? 0) >= 0 ? colors.info : colors.danger }]}>
                                    {formatCurrency(stats?.net_profit ?? 0)}
                                </Text>
                            </View>
                        </View>

                        {/* Expenses Section */}
                        <View style={[styles.section, { marginTop: 20 }]}>
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
                                                    <Text style={styles.expenseCategory}>{t(`accounting.expenses_categories.${exp.category}`, { defaultValue: exp.category })}</Text>
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
                        <View style={[styles.kpiGrid, { marginTop: 10 }]}>
                            <View style={[styles.kpiCard, { borderColor: colors.warning + '40' }]}>
                                <Ionicons name="cube-outline" size={20} color={colors.warning} />
                                <Text style={styles.kpiLabel}>{t('accounting.stock_value_purchase')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.warning }]}>
                                    {formatCurrency(stats?.stock_value ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.stock_value_selling', { value: formatCurrency(stats?.stock_selling_value ?? 0) })}</Text>
                            </View>

                            <View style={[styles.kpiCard, { borderColor: colors.danger + '40' }]}>
                                <Ionicons name="flame-outline" size={20} color={colors.danger} />
                                <Text style={styles.kpiLabel}>{t('accounting.losses')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.danger }]}>
                                    {formatCurrency(stats?.total_losses ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>
                                    {t('accounting.loss_reasons', { count: Object.keys(stats?.loss_breakdown ?? {}).length })}
                                </Text>
                            </View>
                        </View>

                        {/* KPI Grid 3: Items & Purchases */}
                        <View style={[styles.kpiGrid, { marginTop: 10 }]}>
                            <View style={[styles.kpiCard, { borderColor: colors.secondary + '40' }]}>
                                <Ionicons name="cart-outline" size={20} color={colors.secondary} />
                                <Text style={styles.kpiLabel}>{t('accounting.items_sold')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.secondary }]}>
                                    {stats?.total_items_sold ?? 0}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.avg_sale', { value: formatCurrency(stats?.avg_sale ?? 0) })}</Text>
                            </View>

                            <View style={[styles.kpiCard, { borderColor: colors.info + '40' }]}>
                                <Ionicons name="bag-handle-outline" size={20} color={colors.info} />
                                <Text style={styles.kpiLabel}>{t('accounting.supplier_purchases')}</Text>
                                <Text style={[styles.kpiValue, { color: colors.info }]}>
                                    {formatCurrency(stats?.total_purchases ?? 0)}
                                </Text>
                                <Text style={styles.kpiSubValue}>{t('accounting.purchases_count', { count: stats?.purchases_count ?? 0 })}</Text>
                            </View>
                        </View>


                        {/* Revenue Trend Chart */}
                        {
                            stats && stats.daily_revenue && stats.daily_revenue.length > 1 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>{t('accounting.revenue_trend')}</Text>
                                    <View style={styles.chartContainer}>
                                        <LineChart
                                            data={{
                                                labels: stats.daily_revenue.map(d => {
                                                    const parts = d.date.split('-');
                                                    return `${parts[2]}/${parts[1]}`;
                                                }),
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
                                                    : `rgba(0, 0, 0, ${opacity * 0.15})`,
                                                labelColor: () => colors.textSecondary,
                                                propsForDots: { r: '3', strokeWidth: '1', stroke: colors.success },
                                            }}
                                            bezier
                                            style={{ borderRadius: BorderRadius.md }}
                                        />
                                    </View>
                                </View>
                            )
                        }

                        {/* Revenue Breakdown PieChart */}
                        {
                            stats && stats.revenue > 0 && (
                                <View style={styles.section}>
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
                                <View style={styles.section}>
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
                                                    : `rgba(0, 0, 0, ${opacity * 0.2})`,
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

                        {/* Loss Breakdown */}
                        {
                            stats && Object.keys(stats.loss_breakdown).length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>{t('accounting.loss_details')}</Text>
                                    <View style={styles.tableContainer}>
                                        {Object.entries(stats.loss_breakdown).map(([reason, value]) => (
                                            <View key={reason} style={styles.tableRow}>
                                                <Text style={styles.tableLabel}>{reason}</Text>
                                                <Text style={styles.tableDanger}>{formatCurrency(value)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )
                        }

                        {/* Performance par Produit */}
                        {stats && stats.product_performance && stats.product_performance.length > 0 && (
                            <View style={styles.section}>
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
                        <View style={styles.section}>
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
                                                <Text style={[styles.saleMeta, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                                                    {sale.items.map(i => i.product_name).join(', ') || t('accounting.articles_count', { count: sale.items.length })}
                                                </Text>
                                                <Text style={styles.saleMeta}>{t('accounting.articles_short', { count: sale.items.length })} · {t(PAYMENT_LABELS[sale.payment_method] || sale.payment_method)}</Text>
                                            </View>
                                            <Text style={styles.saleTotal}>{sale.total_amount.toLocaleString()} {t('common.currency_default')}</Text>
                                            <TouchableOpacity style={styles.receiptBtn} onPress={() => generateReceiptPdf(sale)}>
                                                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={{ height: Spacing.xxl }} />
                    </ScrollView >
                </LinearGradient>

                {/* Invoice Modal */}
                <Modal visible={showInvoiceModal} animationType="slide" transparent >
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
                </Modal >

                {/* Expense Modal */}
                <Modal visible={showExpenseModal} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('accounting.new_expense')}</Text>
                                <TouchableOpacity onPress={() => setShowExpenseModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView>
                                <Text style={styles.fieldLabel}>{t('accounting.category')}</Text>
                                <View style={styles.categoryPicker}>
                                    {EXPENSE_CATEGORIES.map(cat => (
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
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowExpenseModal(false)}>
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
                </Modal>

            </View >
        </PremiumGate>
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
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
    tableLabel: { color: colors.text, fontSize: FontSize.sm },
    tableDanger: { color: colors.danger, fontSize: FontSize.sm, fontWeight: '600' },

    // Sales
    saleRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: colors.divider, gap: Spacing.sm,
    },
    saleDate: { color: colors.text, fontSize: FontSize.sm, fontWeight: '600' },
    saleMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
    saleTotal: { color: colors.success, fontSize: FontSize.sm, fontWeight: '700' },
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
    cancelBtn: { padding: Spacing.md },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl },
});
