import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Linking,
    Modal,
    FlatList,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
    customers as customersApi,
    promotions as promotionsApi,
    settings as settingsApi,
    Customer,
    Promotion,
    LoyaltySettings,
    Sale,
    CustomerSalesResponse,
    DebtTransaction,
    getToken,
    API_URL,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { generateAndSharePdf } from '../../utils/pdfReports';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';


// ─── Tier helpers ───
const TIER_CONFIG: Record<string, { color: string; icon: string; label: string; min: number; next: number }> = {
    bronze: { color: '#CD7F32', icon: 'shield-outline', label: 'Bronze', min: 0, next: 5 },
    argent: { color: '#C0C0C0', icon: 'shield-half-outline', label: 'Argent', min: 5, next: 15 },
    or: { color: '#FFD700', icon: 'shield', label: 'Or', min: 15, next: 30 },
    platine: { color: '#E5E4E2', icon: 'diamond-outline', label: 'Platine', min: 30, next: 999 },
};

function getTierConfig(tier?: string) {
    return TIER_CONFIG[tier || 'bronze'] || TIER_CONFIG.bronze;
}

function timeAgo(dateStr?: string): string {
    if (!dateStr) return 'Jamais';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return `Il y a ${Math.floor(diffDays / 365)} an(s)`;
}

type SortKey = 'name' | 'total_spent' | 'last_purchase' | 'visits';

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
    { key: 'name', label: 'Nom', icon: 'text-outline' },
    { key: 'total_spent', label: 'Dépenses', icon: 'trending-up-outline' },
    { key: 'last_purchase', label: 'Récent', icon: 'time-outline' },
    { key: 'visits', label: 'Visites', icon: 'repeat-outline' },
];

const TIER_FILTERS = ['tous', 'bronze', 'argent', 'or', 'platine'] as const;
type DetailTab = 'infos' | 'achats' | 'contact' | 'compte';
type CategoryOption = 'particulier' | 'revendeur' | 'vip' | 'autre';
const CATEGORIES: { key: CategoryOption; label: string }[] = [
    { key: 'particulier', label: 'Particulier' },
    { key: 'revendeur', label: 'Revendeur' },
    { key: 'vip', label: 'VIP' },
    { key: 'autre', label: 'Autre' },
];

import { useAuth } from '../../contexts/AuthContext';

export default function CRMScreen() {
    const { colors, glassStyle } = useTheme();
    const insets = useSafeAreaInsets();
    const styles = getStyles(colors, glassStyle);
    const { user, hasPermission } = useAuth();
    const canWrite = hasPermission('crm', 'write');
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [promoList, setPromoList] = useState<Promotion[]>([]);
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortKey>('name');
    const [tierFilter, setTierFilter] = useState<string>('tous');

    // Customer modal
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', notes: '', birthday: '', category: '' as string });
    const [customerFormLoading, setCustomerFormLoading] = useState(false);

    // Promotion modal
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
    const [promoForm, setPromoForm] = useState({ title: '', description: '', discount_percentage: '', points_required: '' });
    const [promoFormLoading, setPromoFormLoading] = useState(false);

    // Customer detail modal (with tabs)
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
    const [detailTab, setDetailTab] = useState<DetailTab>('infos');
    const [customerSales, setCustomerSales] = useState<Sale[]>([]);
    const [customerDebtHistory, setCustomerDebtHistory] = useState<DebtTransaction[]>([]);
    const [customerSalesStats, setCustomerSalesStats] = useState<{ visit_count: number; average_basket: number; last_purchase_date?: string }>({ visit_count: 0, average_basket: 0 });
    const [salesLoading, setSalesLoading] = useState(false);
    const [debtHistoryLoading, setDebtHistoryLoading] = useState(false);
    const [showAllSales, setShowAllSales] = useState(false);
    const [showAllDebt, setShowAllDebt] = useState(false);

    // Campaign modal
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [campaignMessage, setCampaignMessage] = useState('');
    const [campaignTarget, setCampaignTarget] = useState<'tous' | 'bronze' | 'argent' | 'or' | 'platine' | 'choisir_client'>('tous');
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignSending, setCampaignSending] = useState(false);

    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentType, setPaymentType] = useState<'payment' | 'debt'>('payment'); // NEW

    const loadData = useCallback(async () => {
        try {
            const [custsRes, promos, userSettings] = await Promise.all([
                customersApi.list(sortBy),
                promotionsApi.list(),
                settingsApi.get(),
            ]);
            setCustomerList(custsRes.items ?? custsRes as any);
            setPromoList(promos);
            setLoyaltySettings(userSettings.loyalty);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sortBy]);

    const handleExportCSV = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const params = new URLSearchParams();
            if (tierFilter !== 'tous') params.set('tier', tierFilter);
            params.set('token', token);
            const url = `${API_URL}/export/crm/csv?${params.toString()}`;
            Linking.openURL(url);
        } catch (error) {
            console.error(error);
            Alert.alert('Erreur', 'Impossible d\'exporter les clients');
        }
    };

    const handleExportPdf = async () => {
        const tierLabels: Record<string, string> = { bronze: 'Bronze', argent: 'Argent', or: 'Or', platine: 'Platine' };
        const totalSpent = customerList.reduce((s, c) => s + c.total_spent, 0);
        const totalDebt = customerList.reduce((s, c) => s + (c.current_debt || 0), 0);
        try {
            await generateAndSharePdf({
                storeName: 'Mon Commerce',
                reportTitle: 'RAPPORT CLIENTS & CRM',
                subtitle: `${customerList.length} clients`,
                kpis: [
                    { label: 'Clients', value: customerList.length.toString() },
                    { label: 'CA total', value: formatCurrency(totalSpent, user?.currency) },
                    { label: 'Dettes', value: formatCurrency(totalDebt, user?.currency), color: totalDebt > 0 ? '#f44336' : '#4CAF50' },
                ],
                sections: [{
                    title: 'Liste des clients',
                    headers: ['Nom', 'Téléphone', 'Tier', 'Achats', 'CA total', 'Dette'],
                    alignRight: [3, 4, 5],
                    rows: customerList.map((c) => [
                        c.name,
                        c.phone || '-',
                        tierLabels[c.tier || 'bronze'] || 'Bronze',
                        (c.visit_count ?? 0).toString(),
                        formatCurrency(c.total_spent, user?.currency),
                        c.current_debt ? formatCurrency(c.current_debt, user?.currency) : '-',
                    ]),
                }],
            });
        } catch {
            Alert.alert('Erreur', 'Impossible de générer le PDF');
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    useEffect(() => { loadData(); }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const updateLoyaltySettings = async (updates: Partial<LoyaltySettings>) => {
        if (!loyaltySettings || !canWrite) return;
        const newSettings = { ...loyaltySettings, ...updates };
        setLoyaltySettings(newSettings);
        try {
            setSavingSettings(true);
            await settingsApi.update({ loyalty: newSettings });
        } catch {
            Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleWhatsApp = (phone?: string, name?: string) => {
        if (!phone) {
            Alert.alert('Erreur', 'Numéro de téléphone non renseigné');
            return;
        }
        const message = `Bonjour ${name}, nous avons de nouvelles offres pour vous dans notre boutique !`;
        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Erreur', "Impossible d'ouvrir WhatsApp");
        });
    };

    const handleCall = (phone?: string) => {
        if (!phone) { Alert.alert('Erreur', 'Numéro non renseigné'); return; }
        Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir le téléphone"));
    };

    const handleSMS = (phone?: string, name?: string) => {
        if (!phone) { Alert.alert('Erreur', 'Numéro non renseigné'); return; }
        const msg = `Bonjour ${name}, merci pour votre fidélité !`;
        Linking.openURL(`sms:${phone}?body=${encodeURIComponent(msg)}`).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir les SMS"));
    };

    // --- Customer CRUD ---
    function openNewCustomer() {
        setEditingCustomer(null);
        setCustomerForm({ name: '', phone: '', email: '', notes: '', birthday: '', category: '' });
        setShowCustomerModal(true);
    }

    function openEditCustomer(customer: Customer) {
        setEditingCustomer(customer);
        setCustomerForm({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            notes: customer.notes || '',
            birthday: customer.birthday || '',
            category: customer.category || '',
        });
        setShowCustomerModal(true);
    }

    async function saveCustomer() {
        if (!customerForm.name.trim()) {
            Alert.alert('Erreur', 'Le nom est requis');
            return;
        }
        setCustomerFormLoading(true);
        try {
            const data: any = { ...customerForm };
            if (!data.birthday) delete data.birthday;
            if (!data.category) delete data.category;
            if (editingCustomer) {
                await customersApi.update(editingCustomer.customer_id, data);
            } else {
                await customersApi.create(data);
            }
            setShowCustomerModal(false);
            loadData();
        } catch {
            Alert.alert('Erreur', 'Impossible de sauvegarder le client');
        } finally {
            setCustomerFormLoading(false);
        }
    }

    function handleDeleteCustomer(customer: Customer) {
        Alert.alert(
            'Supprimer le client',
            `Voulez-vous vraiment supprimer "${customer.name}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await customersApi.delete(customer.customer_id);
                            setShowDetailModal(false);
                            loadData();
                        } catch {
                            Alert.alert('Erreur', 'Impossible de supprimer le client');
                        }
                    },
                },
            ]
        );
    }

    // --- Promotion CRUD ---
    function openNewPromo() {
        setEditingPromo(null);
        setPromoForm({ title: '', description: '', discount_percentage: '', points_required: '' });
        setShowPromoModal(true);
    }

    function openEditPromo(promo: Promotion) {
        setEditingPromo(promo);
        setPromoForm({
            title: promo.title,
            description: promo.description,
            discount_percentage: promo.discount_percentage ? String(promo.discount_percentage) : '',
            points_required: promo.points_required ? String(promo.points_required) : '',
        });
        setShowPromoModal(true);
    }

    async function savePromo() {
        if (!promoForm.title.trim()) {
            Alert.alert('Erreur', 'Le titre est requis');
            return;
        }
        setPromoFormLoading(true);
        try {
            const data: any = {
                title: promoForm.title,
                description: promoForm.description,
            };
            if (promoForm.discount_percentage) data.discount_percentage = parseFloat(promoForm.discount_percentage);
            if (promoForm.points_required) data.points_required = parseInt(promoForm.points_required);

            if (editingPromo) {
                await promotionsApi.update(editingPromo.promotion_id, data);
            } else {
                await promotionsApi.create(data);
            }
            setShowPromoModal(false);
            loadData();
        } catch {
            Alert.alert('Erreur', 'Impossible de sauvegarder la promotion');
        } finally {
            setPromoFormLoading(false);
        }
    }

    function handleDeletePromo(promo: Promotion) {
        Alert.alert(
            'Supprimer la promotion',
            `Voulez-vous vraiment supprimer "${promo.title}" ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await promotionsApi.delete(promo.promotion_id);
                            loadData();
                        } catch {
                            Alert.alert('Erreur', 'Impossible de supprimer');
                        }
                    },
                },
            ]
        );
    }

    // --- Customer detail ---
    function openCustomerDetail(customer: Customer) {
        setDetailCustomer(customer);
        setDetailTab('infos');
        setCustomerSales([]);
        setShowAllSales(false);
        setShowAllDebt(false);
        setCustomerSalesStats({ visit_count: 0, average_basket: 0 });
        setShowDetailModal(true);
    }

    async function loadCustomerSales(customerId: string) {
        setSalesLoading(true);
        try {
            const res: CustomerSalesResponse = await customersApi.getSales(customerId);
            setCustomerSales(res.sales);
            setCustomerSalesStats({
                visit_count: res.visit_count,
                average_basket: res.average_basket,
                last_purchase_date: res.last_purchase_date,
            });
        } catch (e) {
            console.error('Error loading sales:', e);
        } finally {
            setSalesLoading(false);
        }
    }

    async function loadCustomerDebtHistory(customerId: string) {
        setDebtHistoryLoading(true);
        try {
            const history = await customersApi.getDebtHistory(customerId);
            setCustomerDebtHistory(history);
        } catch (e) {
            console.error('Error loading debt history:', e);
        } finally {
            setDebtHistoryLoading(false);
        }
    }

    // Load sales when switching to achats tab
    useEffect(() => {
        if (detailTab === 'achats' && detailCustomer) {
            loadCustomerSales(detailCustomer.customer_id);
        }
        if (detailTab === 'compte' && detailCustomer) {
            loadCustomerDebtHistory(detailCustomer.customer_id);
        }
    }, [detailTab, detailCustomer]);

    // --- Campaign ---
    async function sendCampaign() {
        const targets = customerList.filter(c => {
            if (campaignTarget === 'choisir_client') {
                return selectedCustomerIds.some(id => String(id) === String(c.customer_id));
            }
            return campaignTarget === 'tous' || (c.tier || 'bronze') === campaignTarget;
        }).filter(c => c.phone);

        if (targets.length === 0) {
            Alert.alert('Erreur', 'Aucun client avec téléphone dans cette catégorie');
            return;
        }
        if (!campaignMessage.trim()) {
            Alert.alert('Erreur', 'Veuillez saisir un message');
            return;
        }

        setCampaignSending(true);
        try {
            // Save campaign in backend
            await customersApi.sendCampaign({
                message: campaignMessage,
                customer_ids: targets.map(c => c.customer_id),
                channel: 'whatsapp',
            });
        } catch { /* continue anyway */ }

        // Open WhatsApp for each contact sequentially
        for (const c of targets) {
            const msg = campaignMessage.replace('{nom}', c.name).replace('{points}', String(c.loyalty_points));
            const url = `whatsapp://send?phone=${c.phone}&text=${encodeURIComponent(msg)}`;
            try {
                await Linking.openURL(url);
                // Small delay between opens
                await new Promise(r => setTimeout(r, 500));
            } catch { /* skip */ }
        }

        setCampaignSending(false);
        setShowCampaignModal(false);
        Alert.alert('Campagne envoyée', `Message envoyé à ${targets.length} client(s)`);
    }

    // --- Payment ---
    function openPaymentModal() {
        setPaymentAmount('');
        setPaymentNotes('');
        setPaymentType('payment');
        setShowPaymentModal(true);
    }

    async function savePayment() {
        if (!detailCustomer) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Erreur', 'Montant invalide');
            return;
        }

        const performSave = async () => {
            setPaymentLoading(true);
            try {
                // If Type is DEBT, send negative amount to INCREASE debt
                // Backend: $inc: { current_debt: -amount } -> -(-amount) = +amount
                const finalAmount = paymentType === 'payment' ? amount : -amount;

                await customersApi.addPayment(detailCustomer.customer_id, finalAmount, paymentNotes || (paymentType === 'payment' ? 'Paiement manuel' : 'Dette manuelle'));

                Alert.alert('Succès', 'Opération enregistrée');
                setShowPaymentModal(false);
                // Refresh detail customer
                const updated = await customersApi.get(detailCustomer.customer_id);
                setDetailCustomer(updated);
                loadData(); // Refresh list
                if (detailTab === 'compte') {
                    loadCustomerDebtHistory(detailCustomer.customer_id);
                }
            } catch {
                Alert.alert('Erreur', 'Impossible d\'enregistrer');
            } finally {
                setPaymentLoading(false);
            }
        };

        const msg = paymentType === 'payment'
            ? `Confirmer la réception de ${amount.toLocaleString()} FCFA pour ce client ?`
            : `Confirmer l'ajout d'une dette de ${amount.toLocaleString()} FCFA pour ce client ?`;

        if (Platform.OS === 'web') {
            if (window.confirm(msg)) {
                await performSave();
            }
        } else {
            Alert.alert(
                "Confirmation",
                msg,
                [
                    { text: "Annuler", style: "cancel" },
                    { text: "Confirmer", onPress: performSave }
                ]
            );
        }
    }

    // --- Filtering ---
    const filteredCustomers = customerList.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone && c.phone.includes(search));
        const matchTier = tierFilter === 'tous' || (c.tier || 'bronze') === tierFilter;
        return matchSearch && matchTier;
    });

    // Stats
    const totalClients = customerList.length;
    const totalSpent = customerList.reduce((acc, c) => acc + c.total_spent, 0);
    const activeClients = customerList.filter(c => {
        if (!c.last_purchase_date) return false;
        const d = new Date(c.last_purchase_date);
        return (Date.now() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
    }).length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // ─── RENDER ───
    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <Text style={styles.title}>CRM & Fidélité</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleExportPdf}>
                            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={handleExportCSV}>
                            <Ionicons name="download-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Summary */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalClients}</Text>
                        <Text style={styles.statLabel}>Clients</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{formatCurrency(totalSpent, user?.currency)}</Text>
                        <Text style={styles.statLabel}>Ventes totales</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{activeClients}</Text>
                        <Text style={styles.statLabel}>Actifs (30j)</Text>
                    </View>
                </View>

                {/* Loyalty Settings SECTION */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Stratégie de Fidélité</Text>
                        {savingSettings && <ActivityIndicator size="small" color={colors.primary} />}
                    </View>
                    <View style={styles.loyaltySettingsCard}>
                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Points de fidélité</Text>
                                <Text style={styles.settingDesc}>Activer le cumul de points lors des ventes</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => updateLoyaltySettings({ is_active: !loyaltySettings?.is_active })}
                                style={[styles.toggle, loyaltySettings?.is_active && styles.toggleActive]}
                            >
                                <View style={[styles.toggleKnob, loyaltySettings?.is_active && styles.toggleKnobActive]} />
                            </TouchableOpacity>
                        </View>

                        {loyaltySettings?.is_active && (
                            <View style={styles.settingsGrid}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>1 point tous les :</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.settingInput}
                                            keyboardType="numeric"
                                            value={String(loyaltySettings.ratio)}
                                            onChangeText={(v) => updateLoyaltySettings({ ratio: parseInt(v) || 0 })}
                                        />
                                        <Text style={styles.inputUnit}>{getCurrencySymbol(user?.currency)}</Text>
                                    </View>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Récompense à :</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.settingInput}
                                            keyboardType="numeric"
                                            value={String(loyaltySettings.reward_threshold)}
                                            onChangeText={(v) => updateLoyaltySettings({ reward_threshold: parseInt(v) || 0 })}
                                        />
                                        <Text style={styles.inputUnit}>pts</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Promotions Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Promotions</Text>
                        {canWrite && (
                            <TouchableOpacity style={styles.addBtn} onPress={openNewPromo}>
                                <Ionicons name="add" size={20} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoList}>
                        {promoList.map(promo => (
                            <TouchableOpacity key={promo.promotion_id} style={styles.promoCard} onPress={() => openEditPromo(promo)} onLongPress={() => handleDeletePromo(promo)}>
                                <Text style={styles.promoTitle}>{promo.title}</Text>
                                <Text style={styles.promoDesc} numberOfLines={2}>{promo.description}</Text>
                                <View style={styles.promoFooter}>
                                    <View style={styles.promoBadge}>
                                        <Text style={styles.promoBadgeText}>
                                            {promo.discount_percentage ? `-${promo.discount_percentage}%` : promo.points_required ? `${promo.points_required} pts` : 'Offre'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeletePromo(promo)}>
                                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {promoList.length === 0 && (
                            <TouchableOpacity style={[styles.promoCard, { justifyContent: 'center', alignItems: 'center' }]} onPress={openNewPromo}>
                                <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} />
                                <Text style={[styles.promoTitle, { marginTop: Spacing.sm }]}>Créer une promotion</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                {/* Marketing Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Marketing</Text>
                    </View>
                    <TouchableOpacity style={styles.campaignBtn} onPress={() => setShowCampaignModal(true)}>
                        <Ionicons name="megaphone-outline" size={22} color="#FFF" />
                        <Text style={styles.campaignBtnText}>Campagne WhatsApp</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar + Add Customer */}
                <View style={styles.customerHeader}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={colors.textMuted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Rechercher un client..."
                            placeholderTextColor={colors.textMuted}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                    {canWrite && (
                        <TouchableOpacity style={styles.addCustomerBtn} onPress={openNewCustomer}>
                            <Ionicons name="person-add" size={20} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Sort Bar */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                    <View style={styles.sortRow}>
                        {SORT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
                                onPress={() => setSortBy(opt.key)}
                            >
                                <Ionicons name={opt.icon as any} size={14} color={sortBy === opt.key ? '#FFF' : colors.textSecondary} />
                                <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                {/* Tier Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                    <View style={styles.sortRow}>
                        {TIER_FILTERS.map(t => {
                            const tierCfg = t === 'tous' ? null : getTierConfig(t);
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.tierChip,
                                        tierFilter === t && { backgroundColor: tierCfg?.color || colors.primary, borderColor: tierCfg?.color || colors.primary },
                                    ]}
                                    onPress={() => setTierFilter(t)}
                                >
                                    {tierCfg && <Ionicons name={tierCfg.icon as any} size={12} color={tierFilter === t ? '#FFF' : tierCfg.color} />}
                                    <Text style={[styles.tierChipText, tierFilter === t && { color: '#FFF' }]}>
                                        {t === 'tous' ? 'Tous' : tierCfg?.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Customers Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fichier Clients ({filteredCustomers.length})</Text>
                    {filteredCustomers.map(customer => {
                        const tc = getTierConfig(customer.tier);
                        return (
                            <TouchableOpacity key={customer.customer_id} style={styles.customerCard} onPress={() => openCustomerDetail(customer)}>
                                <View style={[styles.customerAvatar, { borderColor: tc.color, borderWidth: 2 }]}>
                                    <Text style={styles.customerAvatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={styles.customerInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.customerName}>{customer.name}</Text>
                                        <View style={[styles.tierBadge, { backgroundColor: tc.color + '25', borderColor: tc.color }]}>
                                            <Ionicons name={tc.icon as any} size={10} color={tc.color} />
                                            <Text style={[styles.tierBadgeText, { color: tc.color }]}>{tc.label}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.loyaltyRow}>
                                        <Text style={styles.spentText}>{formatCurrency(customer.total_spent, user?.currency)}</Text>
                                        <Text style={styles.spentText}> • {customer.visit_count || 0} visites</Text>
                                    </View>
                                    {customer.current_debt > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                            <Ionicons name="alert-circle" size={12} color={colors.danger} />
                                            <Text style={{ fontSize: 10, color: colors.danger, fontWeight: 'bold', marginLeft: 2 }}>
                                                Dette: {formatCurrency(customer.current_debt, user?.currency)}
                                            </Text>
                                        </View>
                                    )}
                                    <Text style={[styles.spentText, { fontSize: 10, marginTop: 2 }]}>
                                        Dernier achat : {timeAgo(customer.last_purchase_date)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.waButton}
                                    onPress={() => handleWhatsApp(customer.phone, customer.name)}
                                >
                                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                    {filteredCustomers.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyText}>Aucun client trouvé</Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={openNewCustomer}>
                                <Text style={styles.emptyBtnText}>Ajouter un client</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={{ height: Spacing.xxl }} />
            </ScrollView>

            {/* Customer Create/Edit Modal */}
            <Modal visible={showCustomerModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.md }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingCustomer ? 'Modifier le client' : 'Nouveau client'}</Text>
                            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.formLabel}>Nom *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={customerForm.name}
                                onChangeText={(v) => setCustomerForm(prev => ({ ...prev, name: v }))}
                                placeholder="Nom du client"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.formLabel}>Téléphone</Text>
                            <TextInput
                                style={styles.formInput}
                                value={customerForm.phone}
                                onChangeText={(v) => setCustomerForm(prev => ({ ...prev, phone: v }))}
                                placeholder="+225 XX XX XX XX"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.formLabel}>Email</Text>
                            <TextInput
                                style={styles.formInput}
                                value={customerForm.email}
                                onChangeText={(v) => setCustomerForm(prev => ({ ...prev, email: v }))}
                                placeholder="email@exemple.com"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="email-address"
                            />

                            <Text style={styles.formLabel}>Anniversaire (MM-JJ)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={customerForm.birthday}
                                onChangeText={(v) => setCustomerForm(prev => ({ ...prev, birthday: v }))}
                                placeholder="Ex: 03-15 (15 mars)"
                                placeholderTextColor={colors.textMuted}
                                maxLength={5}
                            />

                            <Text style={styles.formLabel}>Catégorie</Text>
                            <View style={styles.categoryRow}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat.key}
                                        style={[styles.categoryChip, customerForm.category === cat.key && styles.categoryChipActive]}
                                        onPress={() => setCustomerForm(prev => ({ ...prev, category: prev.category === cat.key ? '' : cat.key }))}
                                    >
                                        <Text style={[styles.categoryChipText, customerForm.category === cat.key && styles.categoryChipTextActive]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Notes</Text>
                            <TextInput
                                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                                value={customerForm.notes}
                                onChangeText={(v) => setCustomerForm(prev => ({ ...prev, notes: v }))}
                                placeholder="Notes sur le client..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            <TouchableOpacity style={styles.submitBtn} onPress={saveCustomer} disabled={customerFormLoading}>
                                {customerFormLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitBtnText}>{editingCustomer ? 'Modifier' : 'Créer'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Customer Detail Modal (with tabs) */}
            <Modal visible={showDetailModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%', paddingBottom: insets.bottom + Spacing.md }]}>
                        {detailCustomer && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{detailCustomer.name}</Text>
                                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                {/* Hero summary */}
                                <View style={{ alignItems: 'center', paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: Spacing.sm }}>
                                    <View style={[styles.detailAvatarLarge, { borderColor: getTierConfig(detailCustomer.tier).color, borderWidth: 3, marginBottom: 6 }]}>
                                        <Text style={styles.detailAvatarText}>{detailCustomer.name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={[styles.tierBadgeLarge, { backgroundColor: getTierConfig(detailCustomer.tier).color + '25', borderColor: getTierConfig(detailCustomer.tier).color, marginBottom: 8 }]}>
                                        <Ionicons name={getTierConfig(detailCustomer.tier).icon as any} size={14} color={getTierConfig(detailCustomer.tier).color} />
                                        <Text style={[styles.tierBadgeLargeText, { color: getTierConfig(detailCustomer.tier).color }]}>{getTierConfig(detailCustomer.tier).label}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' }}>
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.warning }}>{detailCustomer.loyalty_points}</Text>
                                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Points</Text>
                                        </View>
                                        <View style={{ width: 1, height: 20, backgroundColor: colors.divider }} />
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.success }}>{detailCustomer.total_spent.toLocaleString()}</Text>
                                            <Text style={{ fontSize: 10, color: colors.textMuted }}>FCFA</Text>
                                        </View>
                                        <View style={{ width: 1, height: 20, backgroundColor: colors.divider }} />
                                        <View style={{ alignItems: 'center' }}>
                                            <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: colors.info }}>{detailCustomer.visit_count || 0}</Text>
                                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Visites</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Tabs */}
                                <View style={styles.tabRow}>
                                    {([
                                        { key: 'infos', label: 'Infos', icon: 'person-outline' },
                                        { key: 'achats', label: 'Achats', icon: 'receipt-outline' },
                                        { key: 'compte', label: 'Compte', icon: 'wallet-outline' },
                                        { key: 'contact', label: 'Contact', icon: 'chatbubble-outline' },
                                    ] as { key: DetailTab; label: string; icon: string }[]).map(tab => (
                                        <TouchableOpacity
                                            key={tab.key}
                                            style={[styles.tab, detailTab === tab.key && styles.tabActive]}
                                            onPress={() => setDetailTab(tab.key)}
                                        >
                                            <Ionicons name={tab.icon as any} size={16} color={detailTab === tab.key ? colors.primary : colors.textMuted} />
                                            <Text style={[styles.tabText, detailTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Tab Content */}
                                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Spacing.xl }}>
                                    {detailTab === 'infos' && (
                                        <View style={[styles.detailSection, { width: '100%' }]}>
                                            {/* Tier progress */}
                                            {(() => {
                                                const tc = getTierConfig(detailCustomer.tier);
                                                const vc = detailCustomer.visit_count || 0;
                                                const progress = tc.next <= tc.min ? 1 : Math.min((vc - tc.min) / (tc.next - tc.min), 1);
                                                const nextTierLabel = detailCustomer.tier === 'platine' ? null :
                                                    detailCustomer.tier === 'or' ? 'Platine' :
                                                        detailCustomer.tier === 'argent' ? 'Or' : 'Argent';
                                                return nextTierLabel ? (
                                                    <View style={{ alignItems: 'center', marginBottom: Spacing.md }}>
                                                        <View style={{ width: '80%' }}>
                                                            <View style={styles.progressBar}>
                                                                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: tc.color }]} />
                                                            </View>
                                                            <Text style={styles.progressText}>{vc}/{tc.next} visites pour {nextTierLabel}</Text>
                                                        </View>
                                                    </View>
                                                ) : null;
                                            })()}

                                            {/* DEBT SECTION */}
                                            {Math.abs(detailCustomer.current_debt) > 0 ? (
                                                <View style={[styles.debtCard, detailCustomer.current_debt < 0 && { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                                                    <View>
                                                        <Text style={[styles.debtLabel, detailCustomer.current_debt < 0 && { color: colors.success }]}>
                                                            {detailCustomer.current_debt > 0 ? 'Dette en cours' : 'Crédit (Avance)'}
                                                        </Text>
                                                        <Text style={[styles.debtValue, (detailCustomer.current_debt || 0) < 0 && { color: colors.success }]}>
                                                            {Math.abs(detailCustomer.current_debt || 0).toLocaleString()} FCFA
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity style={[styles.payBtn, detailCustomer.current_debt < 0 && { backgroundColor: colors.success }]} onPress={openPaymentModal}>
                                                        <Text style={styles.payBtnText}>{detailCustomer.current_debt > 0 ? 'Rembourser' : 'Modifier'}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.debtCardEmpty}>
                                                    <Text style={styles.debtLabelEmpty}>Aucune dette</Text>
                                                    <TouchableOpacity style={styles.payBtnOutline} onPress={openPaymentModal}>
                                                        <Text style={styles.payBtnTextOutline}>Ajouter crédit/débit</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}

                                            {detailCustomer.phone && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
                                                    <Text style={styles.detailRowText}>{detailCustomer.phone}</Text>
                                                </View>
                                            )}
                                            {detailCustomer.email && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
                                                    <Text style={styles.detailRowText}>{detailCustomer.email}</Text>
                                                </View>
                                            )}
                                            {detailCustomer.birthday && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="gift-outline" size={18} color={colors.textSecondary} />
                                                    <Text style={styles.detailRowText}>Anniversaire : {detailCustomer.birthday}</Text>
                                                </View>
                                            )}
                                            {detailCustomer.category && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
                                                    <Text style={styles.detailRowText}>{detailCustomer.category.charAt(0).toUpperCase() + detailCustomer.category.slice(1)}</Text>
                                                </View>
                                            )}
                                            {detailCustomer.notes && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                                                    <Text style={styles.detailRowText}>{detailCustomer.notes}</Text>
                                                </View>
                                            )}
                                            <Text style={styles.detailDate}>
                                                Client depuis le {detailCustomer.created_at ? new Date(detailCustomer.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                                            </Text>

                                            <View style={styles.detailActions}>
                                                <TouchableOpacity style={styles.detailActionBtn} onPress={() => { setShowDetailModal(false); openEditCustomer(detailCustomer); }}>
                                                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                                                    <Text style={[styles.detailActionText, { color: colors.primary }]}>Modifier</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.detailActionBtn} onPress={() => handleDeleteCustomer(detailCustomer)}>
                                                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                                    <Text style={[styles.detailActionText, { color: colors.danger }]}>Supprimer</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {detailTab === 'achats' && (
                                        <View style={{ paddingVertical: Spacing.md }}>
                                            {/* Mini stats */}
                                            <View style={styles.miniStatsRow}>
                                                <View style={styles.miniStat}>
                                                    <Text style={styles.miniStatValue}>{customerSalesStats.visit_count}</Text>
                                                    <Text style={styles.miniStatLabel}>Achats</Text>
                                                </View>
                                                <View style={styles.miniStat}>
                                                    <Text style={styles.miniStatValue}>{customerSalesStats.average_basket.toLocaleString()}</Text>
                                                    <Text style={styles.miniStatLabel}>Panier moy.</Text>
                                                </View>
                                                <View style={styles.miniStat}>
                                                    <Text style={styles.miniStatValue}>{timeAgo(customerSalesStats.last_purchase_date)}</Text>
                                                    <Text style={styles.miniStatLabel}>Dernier</Text>
                                                </View>
                                            </View>

                                            {salesLoading ? (
                                                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xl }} />
                                            ) : customerSales.length === 0 ? (
                                                <View style={styles.emptyState}>
                                                    <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
                                                    <Text style={styles.emptyText}>Aucun achat enregistré</Text>
                                                </View>
                                            ) : (
                                                <View>
                                                    {(showAllSales ? customerSales : customerSales.slice(0, 5)).map((sale, idx) => (
                                                        <View key={sale.sale_id || idx} style={styles.saleCard}>
                                                            <View style={styles.saleHeader}>
                                                                <Text style={styles.saleDate}>
                                                                    {new Date(sale.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </Text>
                                                                <View style={[styles.paymentBadge, { backgroundColor: sale.payment_method === 'cash' ? colors.success + '20' : colors.info + '20' }]}>
                                                                    <Text style={[styles.paymentBadgeText, { color: sale.payment_method === 'cash' ? colors.success : colors.info }]}>
                                                                        {sale.payment_method === 'cash' ? 'Espèces' : sale.payment_method === 'mobile_money' ? 'Mobile' : sale.payment_method}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                            {sale.items.map((item, i) => (
                                                                <View key={i} style={styles.saleItemRow}>
                                                                    <Text style={styles.saleItemName}>{item.product_name}</Text>
                                                                    <Text style={styles.saleItemQty}>x{item.quantity}</Text>
                                                                    <Text style={styles.saleItemPrice}>{item.total.toLocaleString()} F</Text>
                                                                </View>
                                                            ))}
                                                            <View style={styles.saleTotalRow}>
                                                                <Text style={styles.saleTotalLabel}>Total</Text>
                                                                <Text style={styles.saleTotalValue}>{sale.total_amount.toLocaleString()} FCFA</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                    {customerSales.length > 5 && (
                                                        <TouchableOpacity
                                                            style={styles.seeMoreBtn}
                                                            onPress={() => setShowAllSales(!showAllSales)}
                                                        >
                                                            <Text style={styles.seeMoreText}>
                                                                {showAllSales ? 'Voir moins' : `Voir les ${customerSales.length - 5} autres achats`}
                                                            </Text>
                                                            <Ionicons name={showAllSales ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    )}
                                    {detailTab === 'compte' && (
                                        <View style={{ paddingVertical: Spacing.md }}>
                                            {debtHistoryLoading ? (
                                                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xl }} />
                                            ) : customerDebtHistory.length === 0 ? (
                                                <View style={styles.emptyState}>
                                                    <Ionicons name="wallet-outline" size={40} color={colors.textMuted} />
                                                    <Text style={styles.emptyText}>Aucun historique</Text>
                                                </View>
                                            ) : (
                                                <View>
                                                    {(showAllDebt ? customerDebtHistory : customerDebtHistory.slice(0, 5)).map((item, idx) => {
                                                        const isDebtIncrease = item.type === 'credit_sale' || (item.type === 'payment' && item.amount < 0);

                                                        return (
                                                            <View key={idx} style={styles.saleCard}>
                                                                <View style={styles.saleHeader}>
                                                                    <View>
                                                                        <Text style={styles.saleDate}>
                                                                            {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </Text>
                                                                        <Text style={[styles.saleItemName, { fontSize: 13, color: colors.textSecondary }]}>
                                                                            {item.reference}
                                                                        </Text>
                                                                    </View>
                                                                    <Text style={{
                                                                        fontSize: 16,
                                                                        fontWeight: 'bold',
                                                                        color: isDebtIncrease ? colors.danger : colors.success
                                                                    }}>
                                                                        {isDebtIncrease ? '+' : '-'}{Math.abs(item.amount).toLocaleString()} F
                                                                    </Text>
                                                                </View>
                                                                {item.details ? (
                                                                    <Text style={[styles.saleItemQty, { marginTop: 4 }]}>{item.details}</Text>
                                                                ) : null}
                                                            </View>
                                                        );
                                                    })}
                                                    {customerDebtHistory.length > 5 && (
                                                        <TouchableOpacity
                                                            style={styles.seeMoreBtn}
                                                            onPress={() => setShowAllDebt(!showAllDebt)}
                                                        >
                                                            <Text style={styles.seeMoreText}>
                                                                {showAllDebt ? 'Voir moins' : `Voir les ${customerDebtHistory.length - 5} autres opérations`}
                                                            </Text>
                                                            <Ionicons name={showAllDebt ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {detailTab === 'contact' && (
                                        <View style={{ paddingVertical: Spacing.lg }}>
                                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleCall(detailCustomer.phone)}>
                                                <View style={[styles.contactIconCircle, { backgroundColor: colors.success + '20' }]}>
                                                    <Ionicons name="call" size={24} color={colors.success} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.contactBtnTitle}>Appeler</Text>
                                                    <Text style={styles.contactBtnSub}>{detailCustomer.phone || 'Non renseigné'}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleWhatsApp(detailCustomer.phone, detailCustomer.name)}>
                                                <View style={[styles.contactIconCircle, { backgroundColor: '#25D36620' }]}>
                                                    <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.contactBtnTitle}>WhatsApp</Text>
                                                    <Text style={styles.contactBtnSub}>Envoyer un message</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleSMS(detailCustomer.phone, detailCustomer.name)}>
                                                <View style={[styles.contactIconCircle, { backgroundColor: colors.info + '20' }]}>
                                                    <Ionicons name="chatbubble" size={24} color={colors.info} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.contactBtnTitle}>SMS</Text>
                                                    <Text style={styles.contactBtnSub}>Envoyer un SMS</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                            </TouchableOpacity>

                                            {detailCustomer.email && (
                                                <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${detailCustomer.email}`)}>
                                                    <View style={[styles.contactIconCircle, { backgroundColor: colors.primary + '20' }]}>
                                                        <Ionicons name="mail" size={24} color={colors.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.contactBtnTitle}>Email</Text>
                                                        <Text style={styles.contactBtnSub}>{detailCustomer.email}</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Promotion Create/Edit Modal */}
            <Modal visible={showPromoModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.md }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingPromo ? 'Modifier la promotion' : 'Nouvelle promotion'}</Text>
                            <TouchableOpacity onPress={() => setShowPromoModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.formLabel}>Titre *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={promoForm.title}
                                onChangeText={(v) => setPromoForm(prev => ({ ...prev, title: v }))}
                                placeholder="Ex: Remise de bienvenue"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={styles.formLabel}>Description</Text>
                            <TextInput
                                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                                value={promoForm.description}
                                onChangeText={(v) => setPromoForm(prev => ({ ...prev, description: v }))}
                                placeholder="Détails de la promotion..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            <Text style={styles.formLabel}>Réduction (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={promoForm.discount_percentage}
                                onChangeText={(v) => setPromoForm(prev => ({ ...prev, discount_percentage: v }))}
                                placeholder="Ex: 10"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />

                            <Text style={styles.formLabel}>Points requis</Text>
                            <TextInput
                                style={styles.formInput}
                                value={promoForm.points_required}
                                onChangeText={(v) => setPromoForm(prev => ({ ...prev, points_required: v }))}
                                placeholder="Ex: 50"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />

                            <TouchableOpacity style={styles.submitBtn} onPress={savePromo} disabled={promoFormLoading}>
                                {promoFormLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.submitBtnText}>{editingPromo ? 'Modifier' : 'Créer'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Campaign Modal */}
            <Modal visible={showCampaignModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.md }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Campagne WhatsApp</Text>
                            <TouchableOpacity onPress={() => setShowCampaignModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="always">
                            <Text style={styles.formLabel}>Audience cible</Text>
                            <View style={styles.categoryRow}>
                                {(['tous', 'choisir_client', 'bronze', 'argent', 'or', 'platine'] as const).map(t => {
                                    const tc = t === 'tous' ? null : t === 'choisir_client' ? null : getTierConfig(t);
                                    let count = 0;
                                    if (t === 'tous') count = customerList.filter(c => c.phone).length;
                                    else if (t === 'choisir_client') count = selectedCustomerIds.length;
                                    else count = customerList.filter(c => (c.tier || 'bronze') === t && c.phone).length;

                                    return (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.categoryChip, campaignTarget === t && styles.categoryChipActive]}
                                            onPress={() => setCampaignTarget(t)}
                                        >
                                            <Text style={[styles.categoryChipText, campaignTarget === t && styles.categoryChipTextActive]}>
                                                {t === 'tous' ? 'Tous' : t === 'choisir_client' ? 'Choisir client' : tc?.label} ({count})
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {campaignTarget === 'choisir_client' && (
                                <View style={{ marginTop: Spacing.md }}>
                                    <View style={[styles.searchBar, { marginBottom: Spacing.sm }]}>
                                        <Ionicons name="search" size={18} color={colors.textMuted} />
                                        <TextInput
                                            style={styles.searchInput}
                                            placeholder="Rechercher des clients..."
                                            value={campaignSearch}
                                            onChangeText={setCampaignSearch}
                                            placeholderTextColor={colors.textMuted}
                                        />
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                                        <TouchableOpacity
                                            style={styles.miniBtn}
                                            onPress={() => setSelectedCustomerIds(customerList.filter(c => c.phone).map(c => c.customer_id))}
                                        >
                                            <Text style={styles.miniBtnText}>Tout cocher</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.miniBtn}
                                            onPress={() => setSelectedCustomerIds([])}
                                        >
                                            <Text style={styles.miniBtnText}>Tout décocher</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        style={{ maxHeight: 250, borderTopWidth: 1, borderTopColor: colors.divider }}
                                        nestedScrollEnabled={true}
                                        keyboardShouldPersistTaps="always"
                                    >
                                        {customerList
                                            .filter(c => c.phone && (c.name.toLowerCase().includes(campaignSearch.toLowerCase()) || c.phone.includes(campaignSearch)))
                                            .map(c => {
                                                const cid = String(c.customer_id);
                                                const isSelected = selectedCustomerIds.some(id => String(id) === cid);
                                                return (
                                                    <TouchableOpacity
                                                        key={cid}
                                                        activeOpacity={0.7}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            padding: Spacing.sm,
                                                            paddingVertical: Spacing.md,
                                                            borderBottomWidth: 1,
                                                            borderBottomColor: colors.divider,
                                                            backgroundColor: isSelected ? colors.success + '10' : 'transparent'
                                                        }}
                                                        onPress={() => {
                                                            setSelectedCustomerIds(prev => {
                                                                const cidStr = String(c.customer_id);
                                                                const exists = prev.some(id => String(id) === cidStr);
                                                                if (exists) {
                                                                    return prev.filter(id => String(id) !== cidStr);
                                                                } else {
                                                                    return [...prev, cidStr];
                                                                }
                                                            });
                                                        }}
                                                    >
                                                        <View style={{ marginRight: Spacing.md }}>
                                                            <Ionicons
                                                                name={isSelected ? "checkbox" : "square-outline"}
                                                                size={26}
                                                                color={isSelected ? colors.success : colors.textMuted}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{c.name}</Text>
                                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{c.phone}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        }
                                    </ScrollView>
                                </View>
                            )}

                            <Text style={styles.formLabel}>Message</Text>
                            <Text style={[styles.settingDesc, { marginBottom: Spacing.sm }]}>Variables : {'{nom}'}, {'{points}'}</Text>
                            <TextInput
                                style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}
                                value={campaignMessage}
                                onChangeText={setCampaignMessage}
                                placeholder="Bonjour {nom}, profitez de nos offres exclusives !"
                                placeholderTextColor={colors.textMuted}
                                multiline
                            />

                            <TouchableOpacity style={styles.submitBtn} onPress={sendCampaign} disabled={campaignSending}>
                                {campaignSending ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                        <Ionicons name="send" size={18} color="#FFF" />
                                        <Text style={styles.submitBtnText}>Envoyer la campagne</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>



            {/* Payment Modal */}
            <Modal visible={showPaymentModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.md }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {paymentType === 'payment' ? 'Enregistrer un paiement' : 'Ajouter une dette'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Payment Type Selector */}
                        <View style={{ flexDirection: 'row', marginBottom: Spacing.md, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.md, padding: 4 }}>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm, backgroundColor: paymentType === 'payment' ? colors.success : 'transparent' }}
                                onPress={() => setPaymentType('payment')}
                            >
                                <Text style={{ color: paymentType === 'payment' ? '#fff' : colors.textMuted, fontWeight: '700' }}>Paiement (Reçu)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.sm, backgroundColor: paymentType === 'debt' ? colors.danger : 'transparent' }}
                                onPress={() => setPaymentType('debt')}
                            >
                                <Text style={{ color: paymentType === 'debt' ? '#fff' : colors.textMuted, fontWeight: '700' }}>Dette (Donné)</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Explanatory Text */}
                        <View style={{ marginBottom: Spacing.md, padding: Spacing.sm, backgroundColor: paymentType === 'payment' ? colors.success + '15' : colors.danger + '15', borderRadius: BorderRadius.sm }}>
                            <Text style={{ color: colors.text, fontSize: 12 }}>
                                {paymentType === 'payment'
                                    ? "Le client vous verse de l'argent. Cela diminue sa dette (ou crée une avance)."
                                    : "Vous prêtez de l'argent ou ajoutez une dette manuelle. Cela augmente ce que le client vous doit."}
                            </Text>
                        </View>

                        <Text style={styles.formLabel}>Montant (FCFA)</Text>
                        <TextInput
                            style={styles.formInput}
                            value={paymentAmount}
                            onChangeText={setPaymentAmount}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                        />

                        <View style={styles.quickAmountsRow}>
                            {paymentType === 'payment' && (
                                <TouchableOpacity style={styles.quickAmountBtn} onPress={() => setPaymentAmount(detailCustomer?.current_debt.toString() || '')}>
                                    <Text style={styles.quickAmountText}>Tout ({detailCustomer?.current_debt.toLocaleString()})</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => setPaymentAmount('5000')}>
                                <Text style={styles.quickAmountText}>5 000</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.quickAmountBtn} onPress={() => setPaymentAmount('10000')}>
                                <Text style={styles.quickAmountText}>10 000</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Balance Preview */}
                        {detailCustomer && (
                            <View style={styles.balancePreview}>
                                <Text style={styles.balancePreviewLabel}>Nouveau solde estimé :</Text>
                                <Text style={[
                                    styles.balancePreviewValue,
                                    (detailCustomer.current_debt - (parseFloat(paymentAmount) || 0) * (paymentType === 'payment' ? 1 : -1)) > 0 ? { color: colors.danger } : { color: colors.success }
                                ]}>
                                    {(detailCustomer.current_debt - (parseFloat(paymentAmount) || 0) * (paymentType === 'payment' ? 1 : -1)).toLocaleString()} FCFA
                                </Text>
                            </View>
                        )}

                        <Text style={styles.formLabel}>Notes (optionnel)</Text>
                        <TextInput
                            style={styles.formInput}
                            value={paymentNotes}
                            onChangeText={setPaymentNotes}
                            placeholder={paymentType === 'payment' ? "Référence, méthode..." : "Motif de la dette..."}
                            placeholderTextColor={colors.textMuted}
                        />

                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: paymentType === 'payment' ? colors.success : colors.danger }]} onPress={savePayment} disabled={paymentLoading}>
                            {paymentLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>{paymentType === 'payment' ? 'Valider le paiement' : 'Ajouter la dette'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient >
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    content: { padding: Spacing.md, paddingTop: Spacing.xxl },
    header: { marginBottom: Spacing.md },
    title: { fontSize: FontSize.xxl, fontWeight: '800', color: colors.text },

    // Stats
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    statCard: {
        flex: 1,
        ...glassStyle,
        padding: Spacing.md,
        alignItems: 'center',
    },
    statValue: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    statLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },

    searchBar: {
        ...glassStyle,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        height: 50,
        borderRadius: BorderRadius.md,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        color: colors.text,
        fontSize: FontSize.md,
    },

    customerHeader: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
        alignItems: 'center',
    },
    addCustomerBtn: {
        width: 50,
        height: 50,
        borderRadius: BorderRadius.md,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },

    section: { marginBottom: Spacing.xl },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },

    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.glass,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },

    loyaltySettingsCard: {
        ...glassStyle,
        padding: Spacing.md,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    settingLabel: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },
    settingDesc: { color: colors.textMuted, fontSize: FontSize.xs },

    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 2,
    },
    toggleActive: { backgroundColor: colors.success },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    toggleKnobActive: { transform: [{ translateX: 20 }] },

    settingsGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    inputGroup: { flex: 1 },
    inputLabel: { color: colors.textSecondary, fontSize: 11, marginBottom: 4 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
        height: 40,
    },
    settingInput: { flex: 1, color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
    inputUnit: { color: colors.textMuted, fontSize: 10, marginLeft: 4 },

    promoList: { gap: Spacing.md, paddingBottom: Spacing.sm },
    promoCard: {
        ...glassStyle,
        width: 220,
        padding: Spacing.md,
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        borderColor: 'rgba(124, 58, 237, 0.3)',
    },
    promoTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
    promoDesc: { color: colors.textSecondary, fontSize: FontSize.xs, marginBottom: Spacing.sm },
    promoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    promoBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    promoBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // Sort & filter
    sortRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: 2 },
    sortChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    sortChipText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
    sortChipTextActive: { color: '#FFF' },
    tierChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    tierChipText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },

    // Customer cards
    customerCard: {
        ...glassStyle,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    customerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.primary + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    customerAvatarText: { fontSize: FontSize.lg, fontWeight: '700', color: colors.primaryLight },

    seeMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: Spacing.md, marginTop: Spacing.xs,
    },
    seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },

    customerInfo: { flex: 1 },
    customerName: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },
    customerPhone: { color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
    loyaltyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    loyaltyText: { color: colors.warning, fontSize: 11, fontWeight: '700', marginLeft: 4 },
    spentText: { color: colors.textMuted, fontSize: 11 },

    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
    },
    tierBadgeText: { fontSize: 9, fontWeight: '700' },

    waButton: {
        backgroundColor: '#25D366',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
    emptyText: { color: colors.textMuted, fontSize: FontSize.md, marginTop: Spacing.md },
    emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.md },
    emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },

    // Campaign
    campaignBtn: {
        ...glassStyle,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        backgroundColor: '#25D366' + '15',
        borderColor: '#25D366' + '40',
    },
    campaignBtnText: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: colors.bgMid,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },

    formLabel: { color: colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4, marginTop: Spacing.md },
    formInput: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: colors.text,
        fontSize: FontSize.md,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    submitBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },

    // Category chips
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
    categoryChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    categoryChipText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
    categoryChipTextActive: { color: '#FFF' },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginBottom: Spacing.md,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
    },
    tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
    tabTextActive: { color: colors.primary },

    // Detail modal
    detailSection: { alignItems: 'center', paddingVertical: Spacing.md },
    detailAvatarLarge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary + '30',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    detailAvatarText: { fontSize: 28, fontWeight: '700', color: colors.primaryLight },
    detailStatsRow: { flexDirection: 'row', gap: Spacing.xl, marginBottom: Spacing.lg },
    detailStat: { alignItems: 'center' },
    detailStatValue: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginTop: 4 },
    detailStatLabel: { fontSize: FontSize.xs, color: colors.textSecondary },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, alignSelf: 'stretch', borderBottomWidth: 1, borderBottomColor: colors.divider },
    detailRowText: { color: colors.text, fontSize: FontSize.md },
    detailDate: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: Spacing.md },
    detailActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
    detailActionBtn: { alignItems: 'center', gap: 4 },
    detailActionText: { fontSize: FontSize.xs, fontWeight: '600' },

    // Tier badge large
    tierBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    tierBadgeLargeText: { fontSize: FontSize.sm, fontWeight: '700' },

    // Progress bar
    progressBar: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 4 },

    // Mini stats (purchase history)
    miniStatsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    miniStat: {
        flex: 1,
        ...glassStyle,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    miniStatValue: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    saleItemDate: {
        fontSize: FontSize.xs,
        color: '#888',
    },
    saleItemTotal: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: '#FFF',
    },

    // Debt History Styles
    debtSummaryCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    settleBtn: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50', // Success Green
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        gap: 8,
    },
    settleBtnText: {
        color: '#FFF',
        fontWeight: '700',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        gap: Spacing.md,
    },
    historyIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyRef: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: FontSize.sm,
    },
    historyDate: {
        color: '#888',
        fontSize: FontSize.xs,
    },
    historyAmount: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    miniStatLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

    // Sale cards
    saleCard: {
        ...glassStyle,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    saleDate: { color: colors.text, fontSize: FontSize.sm, fontWeight: '600' },
    paymentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    paymentBadgeText: { fontSize: 10, fontWeight: '700' },
    saleItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    saleItemName: { flex: 1, color: colors.textSecondary, fontSize: FontSize.sm },
    saleItemQty: { color: colors.textMuted, fontSize: FontSize.xs, marginRight: Spacing.md },
    saleItemPrice: { color: colors.text, fontSize: FontSize.sm, fontWeight: '600' },
    saleTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
    saleTotalLabel: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
    saleTotalValue: { color: colors.success, fontSize: FontSize.md, fontWeight: '700' },

    // Contact buttons
    contactBtn: {
        ...glassStyle,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.md,
    },
    contactIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactBtnTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },
    contactBtnSub: { color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },

    // Debt
    debtCard: {
        backgroundColor: colors.danger + '15',
        borderWidth: 1,
        borderColor: colors.danger + '30',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    debtCardEmpty: {
        backgroundColor: colors.success + '10',
        borderWidth: 1,
        borderColor: colors.success + '20',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    debtLabel: { fontSize: FontSize.sm, color: colors.danger, fontWeight: '600' },
    debtLabelEmpty: { fontSize: FontSize.sm, color: colors.success, fontWeight: '600' },
    debtValue: { fontSize: FontSize.xl, color: colors.danger, fontWeight: 'bold' },
    payBtn: {
        backgroundColor: colors.danger,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    payBtnOutline: {
        borderWidth: 1,
        borderColor: colors.success,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    payBtnText: { color: '#FFF', fontWeight: 'bold' },
    payBtnTextOutline: { color: colors.success, fontWeight: 'bold' },

    // Quick amounts (payment modal)
    quickAmountsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    quickAmountBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        alignItems: 'center',
    },
    quickAmountText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
    balancePreview: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.md,
        alignItems: 'center',
    },
    balancePreviewLabel: { color: colors.textMuted, fontSize: FontSize.xs },
    balancePreviewValue: { fontSize: FontSize.lg, fontWeight: '700', marginTop: 4 },
    miniBtn: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    miniBtnText: {
        color: colors.primaryLight,
        fontSize: 12,
        fontWeight: '600',
    },
});
