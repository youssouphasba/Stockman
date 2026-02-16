import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LineChart, PieChart } from 'react-native-chart-kit';
import {
    accounting as accountingApi,
    sales as salesApi,
    customers as customersApi,
    AccountingStats,
    Sale,
    Customer,
    API_URL,
    getToken,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

const PERIODS = [
    { label: '7j', value: 7 },
    { label: '30j', value: 30 },
    { label: '90j', value: 90 },
    { label: '1 an', value: 365 },
];

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Espèces',
    mobile_money: 'Mobile Money',
    card: 'Carte',
    transfer: 'Virement',
    credit: 'Crédit',
};

export default function AccountingScreen() {
    const { colors, glassStyle } = useTheme();
    const styles = getStyles(colors, glassStyle);
    const [stats, setStats] = useState<AccountingStats | null>(null);
    const [recentSales, setRecentSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(30);

    // Invoice modal
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceClient, setInvoiceClient] = useState('');
    const [invoiceItems, setInvoiceItems] = useState([{ desc: '', qty: '1', price: '' }]);
    const [invoiceNote, setInvoiceNote] = useState('');
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    const loadData = useCallback(async (days: number) => {
        try {
            const [statsRes, salesRes] = await Promise.all([
                accountingApi.getStats(days),
                salesApi.list()
            ]);
            setStats(statsRes);
            setRecentSales(salesRes);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData(selectedPeriod);
        }, [loadData, selectedPeriod])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData(selectedPeriod);
    };

    const changePeriod = (days: number) => {
        setSelectedPeriod(days);
        setLoading(true);
        loadData(days);
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('fr-FR') + ' FCFA';
    };

    const handleExportCSV = async () => {
        const token = await getToken();
        if (!token) return;
        Linking.openURL(`${API_URL}/export/accounting/csv?days=${selectedPeriod}&token=${token}`);
    };

    const handleDownloadReceipt = async (sale: Sale) => {
        const itemsHtml = sale.items.map(item => `
            <tr>
                <td style="padding: 8px 5px; border-bottom: 1px solid #eee;">${item.product_name}</td>
                <td style="padding: 8px 5px; border-bottom: 1px solid #eee; text-align:center">${item.quantity}</td>
                <td style="padding: 8px 5px; border-bottom: 1px solid #eee; text-align:right">${item.selling_price.toLocaleString()}</td>
                <td style="padding: 8px 5px; border-bottom: 1px solid #eee; text-align:right">${item.total.toLocaleString()}</td>
            </tr>
        `).join('');

        const html = `
            <html>
            <body style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7C3AED; padding-bottom: 15px;">
                    <h1 style="margin:0; color: #7C3AED; font-size: 24px;">FACTURE</h1>
                    <p style="margin:5px 0; color: #666;">Ma Boutique Stock</p>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px;">
                    <div><strong>Date:</strong> ${new Date(sale.created_at).toLocaleDateString('fr-FR')}</div>
                    <div><strong>Réf:</strong> FAC-${sale.sale_id.slice(-6).toUpperCase()}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f0ebff;">
                            <th style="padding: 10px 5px; text-align: left; color: #7C3AED;">Produit</th>
                            <th style="padding: 10px 5px; color: #7C3AED;">Qté</th>
                            <th style="padding: 10px 5px; text-align: right; color: #7C3AED;">Prix unit.</th>
                            <th style="padding: 10px 5px; text-align: right; color: #7C3AED;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div style="text-align: right; border-top: 2px solid #7C3AED; padding-top: 15px;">
                    <p style="margin: 5px 0; font-size: 13px; color: #666;">Mode de paiement: <strong>${sale.payment_method}</strong></p>
                    <h2 style="margin: 5px 0; color: #10B981; font-size: 22px;">Total: ${sale.total_amount.toLocaleString()} FCFA</h2>
                </div>
                <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px;">
                    Merci de votre confiance.<br/>Généré par Antigravity
                </div>
            </body>
            </html>
        `;

        try {
            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Custom invoice
    const openInvoiceModal = async () => {
        setShowInvoiceModal(true);
        setInvoiceClient('');
        setInvoiceItems([{ desc: '', qty: '1', price: '' }]);
        setInvoiceNote('');
        try {
            const custs = await customersApi.list();
            setCustomersList(custs);
        } catch { /* ignore */ }
    };

    const addInvoiceLine = () => {
        setInvoiceItems([...invoiceItems, { desc: '', qty: '1', price: '' }]);
    };

    const removeInvoiceLine = (index: number) => {
        if (invoiceItems.length <= 1) return;
        setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    };

    const updateInvoiceLine = (index: number, field: string, value: string) => {
        const updated = [...invoiceItems];
        (updated[index] as any)[field] = value;
        setInvoiceItems(updated);
    };

    const invoiceTotal = invoiceItems.reduce((sum, item) => {
        return sum + (parseFloat(item.price) || 0) * (parseInt(item.qty) || 0);
    }, 0);

    const generateInvoicePdf = async () => {
        const itemsHtml = invoiceItems
            .filter(item => item.desc && item.price)
            .map(item => {
                const lineTotal = (parseFloat(item.price) || 0) * (parseInt(item.qty) || 0);
                return `
                <tr>
                    <td style="padding: 8px 5px; border-bottom: 1px solid #eee;">${item.desc}</td>
                    <td style="padding: 8px 5px; border-bottom: 1px solid #eee; text-align:center">${item.qty}</td>
                    <td style="padding: 8px 5px; border-bottom: 1px solid #eee; text-align:right">${parseFloat(item.price).toLocaleString()}</td>
                    <td style="padding: 8px 5px; border-bottom: 1px solid #eee; text-align:right">${lineTotal.toLocaleString()}</td>
                </tr>`;
            }).join('');

        const now = new Date();
        const refNum = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

        const html = `
            <html>
            <body style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto;">
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7C3AED; padding-bottom: 15px;">
                    <h1 style="margin:0; color: #7C3AED; font-size: 24px;">FACTURE</h1>
                    <p style="margin:5px 0; color: #666;">Ma Boutique Stock</p>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
                    <div><strong>Date:</strong> ${now.toLocaleDateString('fr-FR')}</div>
                    <div><strong>Réf:</strong> ${refNum}</div>
                </div>
                ${invoiceClient ? `<div style="font-size: 13px; margin-bottom: 20px;"><strong>Client:</strong> ${invoiceClient}</div>` : ''}
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background: #f0ebff;">
                            <th style="padding: 10px 5px; text-align: left; color: #7C3AED;">Description</th>
                            <th style="padding: 10px 5px; color: #7C3AED;">Qté</th>
                            <th style="padding: 10px 5px; text-align: right; color: #7C3AED;">Prix unit.</th>
                            <th style="padding: 10px 5px; text-align: right; color: #7C3AED;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div style="text-align: right; border-top: 2px solid #7C3AED; padding-top: 15px;">
                    <h2 style="margin: 5px 0; color: #10B981; font-size: 22px;">Total: ${invoiceTotal.toLocaleString()} FCFA</h2>
                </div>
                ${invoiceNote ? `<div style="margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 5px; font-size: 12px;"><strong>Note:</strong> ${invoiceNote}</div>` : ''}
                <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px;">
                    Merci de votre confiance.<br/>Généré par Antigravity
                </div>
            </body>
            </html>
        `;

        try {
            if (Platform.OS === 'web') {
                await Print.printAsync({ html });
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
            setShowInvoiceModal(false);
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
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
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Comptabilité</Text>
                        <Text style={styles.subtitle}>{stats?.period_label}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={openInvoiceModal}>
                            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                            <Text style={styles.actionBtnText}>Facture</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleExportCSV}>
                            <Ionicons name="download-outline" size={18} color={colors.success} />
                            <Text style={[styles.actionBtnText, { color: colors.success }]}>CSV</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Period Selector */}
                <View style={styles.periodRow}>
                    {PERIODS.map(p => (
                        <TouchableOpacity
                            key={p.value}
                            style={[styles.periodBtn, selectedPeriod === p.value && styles.periodBtnActive]}
                            onPress={() => changePeriod(p.value)}
                        >
                            <Text style={[styles.periodBtnText, selectedPeriod === p.value && styles.periodBtnTextActive]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* KPI Grid */}
                <View style={styles.kpiGrid}>
                    <View style={[styles.kpiCard, { borderColor: colors.success + '40' }]}>
                        <Ionicons name="cash-outline" size={20} color={colors.success} />
                        <Text style={styles.kpiLabel}>Chiffre d'Affaires</Text>
                        <Text style={[styles.kpiValue, { color: colors.success }]}>
                            {formatCurrency(stats?.revenue ?? 0)}
                        </Text>
                        <Text style={styles.kpiSubValue}>{stats?.sales_count ?? 0} ventes</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: colors.primary + '40' }]}>
                        <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                        <Text style={styles.kpiLabel}>Marge Brute</Text>
                        <Text style={[styles.kpiValue, { color: colors.primary }]}>
                            {formatCurrency(stats?.gross_profit ?? 0)}
                        </Text>
                        <Text style={styles.kpiSubValue}>{marginPercentage.toFixed(1)}% de marge</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: colors.info + '40' }]}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={colors.info} />
                        <Text style={styles.kpiLabel}>Bénéfice Net</Text>
                        <Text style={[styles.kpiValue, { color: (stats?.net_profit ?? 0) >= 0 ? colors.info : colors.danger }]}>
                            {formatCurrency(stats?.net_profit ?? 0)}
                        </Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: colors.secondary + '40' }]}>
                        <Ionicons name="cart-outline" size={20} color={colors.secondary} />
                        <Text style={styles.kpiLabel}>Panier Moyen</Text>
                        <Text style={[styles.kpiValue, { color: colors.secondary }]}>
                            {formatCurrency(stats?.avg_sale ?? 0)}
                        </Text>
                        <Text style={styles.kpiSubValue}>{stats?.total_items_sold ?? 0} articles vendus</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: colors.warning + '40' }]}>
                        <Ionicons name="cube-outline" size={20} color={colors.warning} />
                        <Text style={styles.kpiLabel}>Valeur Stock (Achat)</Text>
                        <Text style={[styles.kpiValue, { color: colors.warning }]}>
                            {formatCurrency(stats?.stock_value ?? 0)}
                        </Text>
                        <Text style={styles.kpiSubValue}>Vente: {formatCurrency(stats?.stock_selling_value ?? 0)}</Text>
                    </View>

                    <View style={[styles.kpiCard, { borderColor: colors.danger + '40' }]}>
                        <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                        <Text style={styles.kpiLabel}>Pertes + Achats</Text>
                        <Text style={[styles.kpiValue, { color: colors.danger }]}>
                            {formatCurrency((stats?.total_losses ?? 0) + (stats?.total_purchases ?? 0))}
                        </Text>
                        <Text style={styles.kpiSubValue}>
                            Pertes: {formatCurrency(stats?.total_losses ?? 0)}
                        </Text>
                    </View>
                </View>

                {/* Revenue Trend Chart */}
                {stats && stats.daily_revenue && stats.daily_revenue.length > 1 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tendance du CA</Text>
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
                                yAxisSuffix=" F"
                                chartConfig={{
                                    backgroundColor: 'transparent',
                                    backgroundGradientFrom: 'transparent',
                                    backgroundGradientTo: 'transparent',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                    labelColor: () => colors.textSecondary,
                                    propsForDots: { r: '3', strokeWidth: '1', stroke: colors.success },
                                }}
                                bezier
                                style={{ borderRadius: BorderRadius.md }}
                            />
                        </View>
                    </View>
                )}

                {/* Revenue Breakdown PieChart */}
                {stats && stats.revenue > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Répartition du CA</Text>
                        <View style={styles.chartContainer}>
                            <PieChart
                                data={[
                                    {
                                        name: 'Coût (COGS)',
                                        population: Math.round(stats.cogs),
                                        color: colors.textMuted,
                                        legendFontColor: colors.textSecondary,
                                        legendFontSize: 11,
                                    },
                                    {
                                        name: 'Marge Brute',
                                        population: Math.round(stats.gross_profit),
                                        color: colors.primary,
                                        legendFontColor: colors.textSecondary,
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
                )}

                {/* Payment Breakdown */}
                {stats && Object.keys(stats.payment_breakdown).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Modes de Paiement</Text>
                        <View style={styles.chartContainer}>
                            <PieChart
                                data={Object.entries(stats.payment_breakdown).map(([method, amount], i) => ({
                                    name: PAYMENT_LABELS[method] || method,
                                    population: Math.round(amount),
                                    color: paymentColors[i % paymentColors.length],
                                    legendFontColor: colors.textSecondary,
                                    legendFontSize: 11,
                                }))}
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
                )}

                {/* Loss Breakdown */}
                {stats && Object.keys(stats.loss_breakdown).length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Détail des Pertes</Text>
                        <View style={styles.tableContainer}>
                            {Object.entries(stats.loss_breakdown).map(([reason, value]) => (
                                <View key={reason} style={styles.tableRow}>
                                    <Text style={styles.tableLabel}>{reason}</Text>
                                    <Text style={styles.tableDanger}>{formatCurrency(value)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Recent Sales */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ventes Récentes</Text>
                    {recentSales.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
                            <Text style={styles.emptyText}>Aucune vente</Text>
                        </View>
                    ) : (
                        <View style={styles.tableContainer}>
                            {recentSales.slice(0, 10).map((sale) => (
                                <View key={sale.sale_id} style={styles.saleRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.saleDate}>
                                            {new Date(sale.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                        </Text>
                                        <Text style={styles.saleMeta}>{sale.items.length} art. · {sale.payment_method}</Text>
                                    </View>
                                    <Text style={styles.saleTotal}>{sale.total_amount.toLocaleString()} FCFA</Text>
                                    <TouchableOpacity style={styles.receiptBtn} onPress={() => handleDownloadReceipt(sale)}>
                                        <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={{ height: Spacing.xxl }} />
            </ScrollView>

            {/* Invoice Modal */}
            <Modal visible={showInvoiceModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Créer une Facture</Text>
                            <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {/* Client */}
                            <Text style={styles.fieldLabel}>Client</Text>
                            <TextInput
                                style={styles.input}
                                value={invoiceClient}
                                onChangeText={setInvoiceClient}
                                placeholder="Nom du client"
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
                            <Text style={styles.fieldLabel}>Articles</Text>
                            {invoiceItems.map((item, index) => (
                                <View key={index} style={styles.invoiceLineRow}>
                                    <TextInput
                                        style={[styles.input, { flex: 2 }]}
                                        value={item.desc}
                                        onChangeText={v => updateInvoiceLine(index, 'desc', v)}
                                        placeholder="Description"
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
                                        placeholder="Prix"
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
                                <Text style={styles.addLineBtnText}>Ajouter une ligne</Text>
                            </TouchableOpacity>

                            {/* Note */}
                            <Text style={styles.fieldLabel}>Note (optionnel)</Text>
                            <TextInput
                                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                                value={invoiceNote}
                                onChangeText={setInvoiceNote}
                                placeholder="Conditions, remarques..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            {/* Total + Generate */}
                            <View style={styles.invoiceTotalRow}>
                                <Text style={styles.invoiceTotalLabel}>Total :</Text>
                                <Text style={styles.invoiceTotalValue}>{invoiceTotal.toLocaleString()} FCFA</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.generateBtn, invoiceTotal === 0 && { opacity: 0.5 }]}
                                onPress={generateInvoicePdf}
                                disabled={invoiceTotal === 0}
                            >
                                <Ionicons name="document-text" size={20} color="#fff" />
                                <Text style={styles.generateBtnText}>Générer la facture PDF</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: Spacing.md, paddingTop: Spacing.xxl },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
    title: { fontSize: FontSize.xxl, fontWeight: '800', color: colors.text },
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
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },

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
    emptyText: { color: colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
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
});
