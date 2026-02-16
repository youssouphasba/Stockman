import React, { useState, useCallback } from 'react';
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
} from 'react-native';
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
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function CRMScreen() {
    const { colors, glassStyle } = useTheme();
    const styles = getStyles(colors, glassStyle);
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [promoList, setPromoList] = useState<Promotion[]>([]);
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [search, setSearch] = useState('');

    // Customer modal
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', notes: '' });
    const [customerFormLoading, setCustomerFormLoading] = useState(false);

    // Promotion modal
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
    const [promoForm, setPromoForm] = useState({ title: '', description: '', discount_percentage: '', points_required: '' });
    const [promoFormLoading, setPromoFormLoading] = useState(false);

    // Customer detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [custs, promos, userSettings] = await Promise.all([
                customersApi.list(),
                promotionsApi.list(),
                settingsApi.get(),
            ]);
            setCustomerList(custs);
            setPromoList(promos);
            setLoyaltySettings(userSettings.loyalty);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const updateLoyaltySettings = async (updates: Partial<LoyaltySettings>) => {
        if (!loyaltySettings) return;
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
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert('Erreur', 'WhatsApp n\'est pas installé');
            }
        });
    };

    // --- Customer CRUD ---
    function openNewCustomer() {
        setEditingCustomer(null);
        setCustomerForm({ name: '', phone: '', email: '', notes: '' });
        setShowCustomerModal(true);
    }

    function openEditCustomer(customer: Customer) {
        setEditingCustomer(customer);
        setCustomerForm({
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            notes: customer.notes || '',
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
            if (editingCustomer) {
                await customersApi.update(editingCustomer.customer_id, customerForm);
            } else {
                await customersApi.create(customerForm);
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

    function openCustomerDetail(customer: Customer) {
        setDetailCustomer(customer);
        setShowDetailModal(true);
    }

    const filteredCustomers = customerList.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    // Stats
    const totalClients = customerList.length;
    const totalSpent = customerList.reduce((acc, c) => acc + c.total_spent, 0);
    const totalPoints = customerList.reduce((acc, c) => acc + c.loyalty_points, 0);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>CRM & Fidélité</Text>
                </View>

                {/* Stats Summary */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalClients}</Text>
                        <Text style={styles.statLabel}>Clients</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalSpent.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>FCFA total</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{totalPoints.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Points</Text>
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
                                        <Text style={styles.inputUnit}>FCFA</Text>
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
                        <TouchableOpacity style={styles.addBtn} onPress={openNewPromo}>
                            <Ionicons name="add" size={20} color="#FFF" />
                        </TouchableOpacity>
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
                    <TouchableOpacity style={styles.addCustomerBtn} onPress={openNewCustomer}>
                        <Ionicons name="person-add" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Customers Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fichier Clients ({filteredCustomers.length})</Text>
                    {filteredCustomers.map(customer => (
                        <TouchableOpacity key={customer.customer_id} style={styles.customerCard} onPress={() => openCustomerDetail(customer)}>
                            <View style={styles.customerAvatar}>
                                <Text style={styles.customerAvatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={styles.customerInfo}>
                                <Text style={styles.customerName}>{customer.name}</Text>
                                {customer.phone && <Text style={styles.customerPhone}>{customer.phone}</Text>}
                                <View style={styles.loyaltyRow}>
                                    <Ionicons name="star" size={12} color={colors.warning} />
                                    <Text style={styles.loyaltyText}>{customer.loyalty_points} pts</Text>
                                    <Text style={styles.spentText}> • {customer.total_spent.toLocaleString()} FCFA</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.waButton}
                                onPress={() => handleWhatsApp(customer.phone, customer.name)}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
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
                    <View style={styles.modalContent}>
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

            {/* Customer Detail Modal */}
            <Modal visible={showDetailModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {detailCustomer && (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{detailCustomer.name}</Text>
                                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                        <Ionicons name="close" size={24} color={colors.text} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.detailSection}>
                                    <View style={styles.detailAvatarLarge}>
                                        <Text style={styles.detailAvatarText}>{detailCustomer.name.charAt(0).toUpperCase()}</Text>
                                    </View>

                                    <View style={styles.detailStatsRow}>
                                        <View style={styles.detailStat}>
                                            <Ionicons name="star" size={20} color={colors.warning} />
                                            <Text style={styles.detailStatValue}>{detailCustomer.loyalty_points}</Text>
                                            <Text style={styles.detailStatLabel}>Points</Text>
                                        </View>
                                        <View style={styles.detailStat}>
                                            <Ionicons name="wallet-outline" size={20} color={colors.success} />
                                            <Text style={styles.detailStatValue}>{detailCustomer.total_spent.toLocaleString()}</Text>
                                            <Text style={styles.detailStatLabel}>FCFA</Text>
                                        </View>
                                    </View>

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
                                    {detailCustomer.notes && (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                                            <Text style={styles.detailRowText}>{detailCustomer.notes}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.detailDate}>Client depuis le {new Date(detailCustomer.created_at).toLocaleDateString('fr-FR')}</Text>
                                </View>

                                <View style={styles.detailActions}>
                                    <TouchableOpacity style={styles.detailActionBtn} onPress={() => handleWhatsApp(detailCustomer.phone, detailCustomer.name)}>
                                        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                                        <Text style={[styles.detailActionText, { color: '#25D366' }]}>WhatsApp</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.detailActionBtn} onPress={() => { setShowDetailModal(false); openEditCustomer(detailCustomer); }}>
                                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                                        <Text style={[styles.detailActionText, { color: colors.primary }]}>Modifier</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.detailActionBtn} onPress={() => handleDeleteCustomer(detailCustomer)}>
                                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                        <Text style={[styles.detailActionText, { color: colors.danger }]}>Supprimer</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Promotion Create/Edit Modal */}
            <Modal visible={showPromoModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
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
        </LinearGradient>
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
        marginBottom: Spacing.lg,
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
    customerInfo: { flex: 1 },
    customerName: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },
    customerPhone: { color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
    loyaltyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    loyaltyText: { color: colors.warning, fontSize: 11, fontWeight: '700', marginLeft: 4 },
    spentText: { color: colors.textMuted, fontSize: 11 },

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
});
