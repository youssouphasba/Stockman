import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert, Animated, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { admin, system, SystemHealth, GlobalStats, DetailedStats, User, Product, Customer, SupportTicket, ActivityLog, StoreAdmin } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { FilterBar, SearchBar, StatCard, Badge, SectionHeader, Card, ActionButton, EmptyState } from '../../components/AdminUI';
import { formatCurrency, formatNumber } from '../../utils/format';

const { width } = Dimensions.get('window');
type Segment = 'global' | 'users' | 'stores' | 'stock' | 'finance' | 'crm' | 'support' | 'disputes' | 'comms' | 'security' | 'logs' | 'settings' | 'cgu' | 'privacy';

import { useTranslation } from 'react-i18next';

const COUNTRY_NAMES: Record<string, string> = {
    'SN': 'Sénégal',
    'CI': 'Côte d\'Ivoire',
    'ML': 'Mali',
    'BF': 'Burkina Faso',
    'TG': 'Togo',
    'BJ': 'Bénin',
    'NE': 'Niger',
    'GN': 'Guinée',
    'CM': 'Cameroun',
    'FR': 'France',
    'US': 'USA',
    'MA': 'Maroc',
    'TN': 'Tunisie',
    'DZ': 'Algérie',
    'GA': 'Gabon',
    'CG': 'Congo',
    'CD': 'RDC',
};

export default function AdminDashboard() {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { user, logout } = useAuth();

    const SEGMENTS: { id: Segment; label: string; icon: string }[] = [
        { id: 'global', label: t('admin.segments.global'), icon: 'grid' },
        { id: 'users', label: t('admin.segments.users'), icon: 'people' },
        { id: 'stores', label: t('admin.segments.stores'), icon: 'business' },
        { id: 'stock', label: t('admin.segments.stock'), icon: 'cube' },
        { id: 'finance', label: t('admin.segments.finance'), icon: 'cash' },
        { id: 'crm', label: t('admin.segments.crm'), icon: 'person-add' },
        { id: 'support', label: t('admin.segments.support'), icon: 'help-buoy' },
        { id: 'disputes', label: t('admin.segments.disputes'), icon: 'warning' },
        { id: 'comms', label: t('admin.segments.comms'), icon: 'megaphone' },
        { id: 'security', label: t('admin.segments.security'), icon: 'shield' },
        { id: 'logs', label: t('admin.segments.logs'), icon: 'list' },
        { id: 'settings', label: t('admin.segments.settings'), icon: 'settings' },
        { id: 'cgu', label: t('admin.segments.cgu'), icon: 'document-text' },
        { id: 'privacy', label: t('admin.segments.privacy'), icon: 'shield-checkmark' },
    ];

    const [seg, setSeg] = useState<Segment>('global');
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [detailed, setDetailed] = useState<DetailedStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [search, setSearch] = useState('');
    // Data
    const [users, setUsers] = useState<User[]>([]);
    const [stores, setStores] = useState<StoreAdmin[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [disputeStats, setDisputeStats] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [secEvents, setSecEvents] = useState<any[]>([]);
    const [secStats, setSecStats] = useState<any>(null);
    // Filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('open');
    const [disputeFilter, setDisputeFilter] = useState('all');
    const [logModule, setLogModule] = useState('all');
    const [secFilter, setSecFilter] = useState('all');
    const [countryFilter, setCountryFilter] = useState('all');
    // Compose
    const [msgTitle, setMsgTitle] = useState('');
    const [msgContent, setMsgContent] = useState('');
    const [msgTarget, setMsgTarget] = useState('all');
    const [replyText, setReplyText] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [disputeResolution, setDisputeResolution] = useState('');
    const [disputeNotes, setDisputeNotes] = useState('');
    const [targetUserId, setTargetUserId] = useState('');
    const [cguContent, setCguContent] = useState('');
    const [cguUpdating, setCguUpdating] = useState(false);
    const [privacyContent, setPrivacyContent] = useState('');
    const [privacyUpdating, setPrivacyUpdating] = useState(false);
    // Anim
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const loadData = useCallback(async () => {
        try {
            const [h, s] = await Promise.all([admin.getHealth(), admin.getGlobalStats()]);
            setHealth(h); setStats(s);
            if (seg === 'global') { try { setDetailed(await admin.getDetailedStats()); } catch { } }
            if (seg === 'users') setUsers(await admin.listUsers());
            if (seg === 'stores') { const r = await admin.listStores(); setStores(r.items); }
            if (seg === 'stock') { const r = await admin.listAllProducts({ search: search || undefined }); setProducts(r.items); }
            if (seg === 'crm') { const r = await admin.listAllCustomers({ search: search || undefined }); setCustomers(r.items); }
            if (seg === 'support') setTickets(await admin.listTickets(ticketFilter === 'all' ? undefined : ticketFilter));
            if (seg === 'logs') setLogs(await admin.listLogs(logModule === 'all' ? undefined : logModule));
            if (seg === 'disputes') {
                const r = await admin.listDisputes(disputeFilter === 'all' ? {} : { status: disputeFilter });
                setDisputes(r.items);
                try { setDisputeStats(await admin.getDisputeStats()); } catch { }
            }
            if (seg === 'comms') { const r = await admin.listMessages(); setMessages(r.items); }
            if (seg === 'security') {
                const r = await admin.listSecurityEvents(secFilter === 'all' ? undefined : secFilter);
                setSecEvents(r.items);
                try { setSecStats(await admin.getSecurityStats()); } catch { }
            }
            if (seg === 'cgu') {
                const res = await system.getCGU();
                setCguContent(res.content);
            }
            if (seg === 'privacy') {
                const res = await system.getPrivacy();
                setPrivacyContent(res.content);
            }
        } catch (e: any) { console.error('Admin load error:', e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [seg, search, ticketFilter, logModule, disputeFilter, secFilter]);

    useEffect(() => { setLoading(true); loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(); };

    const fmtMoney = (n: any, currency?: string) => formatCurrency(n, currency);

    const handleToggleUser = async (u: User) => {
        const action = (u as any).is_active === false ? t('admin.users.reactivateBtn') : t('admin.users.banBtn');
        Alert.alert(
            t('admin.actions.confirm'),
            t('admin.users.banDesc', { name: u.name }),
            [
                { text: t('admin.actions.cancel'), style: 'cancel' },
                {
                    text: t('admin.actions.confirm'), onPress: async () => {
                        try {
                            await admin.toggleUser(u.user_id);
                            loadData();
                            Alert.alert(t('admin.actions.success'));
                        } catch {
                            Alert.alert(t('admin.actions.error'));
                        }
                    }
                }
            ]
        );
    };
    const handleToggleProduct = async (p: Product) => {
        try {
            await admin.toggleProduct(p.product_id);
            loadData();
            Alert.alert(t('admin.actions.success'));
        } catch {
            Alert.alert(t('admin.actions.error'));
        }
    };
    const handleDeleteProduct = async (p: Product) => {
        Alert.alert(
            t('admin.stock.deleteConfirmTitle'),
            t('admin.stock.deleteConfirmDesc', { name: p.name }),
            [
                { text: t('admin.actions.cancel'), style: 'cancel' },
                {
                    text: t('admin.stock.deleteBtn') || 'Supprimer', style: 'destructive', onPress: async () => {
                        try { await admin.deleteProduct(p.product_id); loadData(); Alert.alert(t('admin.actions.success')); } catch { Alert.alert(t('admin.actions.error')); }
                    }
                }
            ]
        );
    };
    const handleCloseTicket = async (id: string) => {
        try { await admin.closeTicket(id); loadData(); } catch { Alert.alert(t('admin.actions.error')); }
    };
    const handleReply = async (id: string, type: 'ticket' | 'dispute') => {
        if (!replyText.trim()) return;
        try {
            if (type === 'ticket') await admin.replyTicket(id, replyText);
            else await admin.replyDispute(id, replyText);
            setReplyText(''); setReplyingTo(null); loadData();
        } catch { Alert.alert(t('admin.actions.error')); }
    };
    const handleUpdateDisputeStatus = async (id: string, status: string) => {
        try {
            await admin.updateDisputeStatus(id, status, disputeResolution || undefined, disputeNotes || undefined);
            setDisputeResolution(''); setDisputeNotes(''); loadData();
            Alert.alert(t('admin.actions.statusUpdated'));
        } catch { Alert.alert(t('admin.actions.error')); }
    };
    const handleSendMessage = async () => {
        if (!msgTitle.trim() || !msgContent.trim()) return Alert.alert(t('auth.register.errorFillRequired'));
        const finalTarget = msgTarget === 'specific' ? targetUserId : msgTarget;
        if (msgTarget === 'specific' && !targetUserId.trim()) return Alert.alert(t('admin.placeholders.targetUserId'));
        try {
            await admin.sendMessage({ title: msgTitle, content: msgContent, target: finalTarget });
            Alert.alert(t('admin.actions.sendSuccess')); setMsgTitle(''); setMsgContent(''); setTargetUserId(''); loadData();
        } catch { Alert.alert(t('admin.actions.error')); }
    };
    const handleBroadcast = async () => {
        if (!msgTitle.trim() || !msgContent.trim()) return Alert.alert(t('auth.register.errorFillRequired'));
        try {
            const r = await admin.broadcast(msgContent, msgTitle);
            Alert.alert(t('admin.actions.success'), t('admin.comms.broadcastSuccess', { count: r.sent_to }));
            setMsgTitle(''); setMsgContent(''); loadData();
        } catch { Alert.alert(t('admin.actions.error')); }
    };

    const roleColors: Record<string, string> = { superadmin: '#EF4444', shopkeeper: '#3B82F6', staff: '#10B981', supplier: '#F59E0B' };
    const statusColors: Record<string, string> = { open: '#F59E0B', investigating: '#3B82F6', resolved: '#10B981', rejected: '#EF4444', closed: '#6B7280', pending: '#8B5CF6' };
    const moduleColors: Record<string, string> = { stock: '#3B82F6', auth: '#EF4444', crm: '#10B981', pos: '#F59E0B', broadcast: '#8B5CF6', communication: '#06B6D4' };

    // ============ RENDER SEGMENTS ============
    const renderGlobal = () => (
        <View>
            {/* Health */}
            <SectionHeader title={t('admin.health.title')} colors={colors} />
            <Card colors={colors}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: health?.database === 'connected' ? '#10B981' : '#EF4444' }} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{t('admin.health.database')}</Text>
                    </View>
                    <Badge
                        label={health?.database === 'connected' ? t('admin.health.online') : t('admin.health.error')}
                        color={health?.database === 'connected' ? '#10B981' : '#EF4444'}
                    />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                    {t('admin.health.version', { version: health?.version || '?' })}
                </Text>
            </Card>

            {/* Retention */}
            <SectionHeader title={t('admin.retention.title')} colors={colors} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <StatCard label={t('admin.retention.deletedTotal')} value={stats?.deleted_users || 0} icon="trash" color="#EF4444" colors={colors} />
                <StatCard label={t('admin.retention.inactive30')} value={stats?.inactive_users || 0} icon="moon" color="#6B7280" colors={colors} />
            </View>

            {/* Revenue Breakdown */}
            {detailed && (
                <>
                    <SectionHeader title={t('admin.revenue.title')} colors={colors} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{fmtMoney(stats?.total_revenue, user?.currency)}</Text>
                        <StatCard label={t('admin.revenue.week')} value={fmtMoney(detailed.revenue_week)} icon="calendar" color="#3B82F6" colors={colors} />
                        <StatCard label={t('admin.revenue.month')} value={fmtMoney(detailed.revenue_month)} icon="trending-up" color="#8B5CF6" colors={colors} />
                    </View>

                    <SectionHeader title={t('admin.alerts.title')} colors={colors} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <StatCard label={t('admin.alerts.openTickets')} value={detailed.open_tickets} icon="chatbubbles" color="#F59E0B" colors={colors} />
                        <StatCard label={t('admin.alerts.lowStock')} value={detailed.low_stock_count} icon="alert-circle" color="#EF4444" colors={colors} />
                        <StatCard label={t('admin.alerts.recentSignups')} value={detailed.recent_signups} icon="person-add" color="#06B6D4" colors={colors} />
                    </View>

                    {detailed.top_stores.length > 0 && (
                        <>
                            <SectionHeader title={t('admin.topStores.title')} count={detailed.top_stores.length} colors={colors} />
                            {detailed.top_stores.map((s, i) => (
                                <Card key={i} colors={colors}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>#{i + 1}</Text>
                                            </View>
                                            <Text style={{ color: colors.text, fontWeight: '600' }}>{s.name}</Text>
                                        </View>
                                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{fmtMoney(s.revenue)}</Text>
                                    </View>
                                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                                        {t('admin.stores.sales', { count: s.sales_count })}
                                    </Text>
                                </Card>
                            ))}
                        </>
                    )}

                    {detailed.users_by_country && (
                        <>
                            <SectionHeader title={t('admin.distribution.country')} colors={colors} />
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(detailed.users_by_country).map(([country, count]) => (
                                    <TouchableOpacity
                                        key={country}
                                        onPress={() => {
                                            setCountryFilter(country);
                                            setSeg('users');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <StatCard
                                            label={COUNTRY_NAMES[country] || country}
                                            value={count}
                                            icon="globe"
                                            color="#3B82F6"
                                            colors={colors}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {detailed.users_by_role && (
                        <>
                            <SectionHeader title={t('admin.distribution.role')} colors={colors} />
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(detailed.users_by_role).map(([role, count]) => (
                                    <StatCard key={role} label={role} value={count} icon="person" color={roleColors[role] || '#6B7280'} colors={colors} />
                                ))}
                            </View>
                        </>
                    )}
                </>
            )}
        </View>
    );

    const renderUsers = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: t('admin.users.filterAll') },
                    { id: 'shopkeeper', label: t('admin.users.filterShopkeepers') },
                    { id: 'staff', label: t('admin.users.filterStaff') },
                    { id: 'supplier', label: t('admin.users.filterSuppliers') },
                    { id: 'admin', label: t('admin.users.filterAdmins') },
                ]}
                active={roleFilter}
                onSelect={setRoleFilter as any}
                colors={colors}
            />
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('admin.placeholders.searchUsers')} colors={colors} />

            {countryFilter !== 'all' && (
                <View style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                        onPress={() => setCountryFilter('all')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', padding: 8, borderRadius: 8, alignSelf: 'flex-start' }}
                    >
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                        <Text style={{ marginLeft: 6, color: colors.primary, fontWeight: '700' }}>
                            {t('admin.users.countryLabel', { country: COUNTRY_NAMES[countryFilter] || countryFilter })}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <SectionHeader
                title={t('admin.users.title')}
                count={users.filter(u =>
                    (roleFilter === 'all' || u.role === roleFilter) &&
                    (countryFilter === 'all' || u.country_code === countryFilter)
                ).length}
                colors={colors}
            />
            {users.filter(u =>
                (roleFilter === 'all' || u.role === roleFilter) &&
                (countryFilter === 'all' || u.country_code === countryFilter) &&
                (!search || (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()))
            ).map((u: any) => (
                <Card key={u.user_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: roleColors[u.role] || '#6B7280', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{(u.name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{u.name}</Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>({u.user_id})</Text>
                                </View>
                                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{u.email}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                    {u.phone ? <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>📞 {u.phone}</Text> : null}
                                    {u.business_type ? <Text style={{ color: colors.textSecondary, fontSize: 11 }}>🏢 {u.business_type}</Text> : null}
                                </View>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <Badge label={u.role || 'user'} color={roleColors[u.role] || '#6B7280'} />
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                <Badge label={u.country_code || '??'} color={colors.secondary} />
                                <TouchableOpacity onPress={() => handleToggleUser(u)}>
                                    <Badge label={u.is_active === false ? t('admin.users.banned') : t('admin.users.active')} color={u.is_active === false ? '#EF4444' : '#10B981'} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Card>
            ))}
        </View>
    );

    const renderStores = () => (
        <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('admin.placeholders.searchStores')} colors={colors} />
            <SectionHeader title={t('admin.segments.stores')} count={stores.length} colors={colors} />
            {stores.map(s => (
                <Card key={s.store_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{s.name}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('admin.stores.owner')}: {s.owner_name}</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {t('admin.stores.products', { count: s.product_count })}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="cart-outline" size={14} color={colors.textMuted} />
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                        {t('admin.stores.sales', { count: s.sales_count })}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Text style={{ color: '#10B981', fontWeight: '800' }}>{fmtMoney(s.total_revenue)}</Text>
                    </View>
                </Card>
            ))}
        </View>
    );

    const renderStock = () => (
        <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('admin.placeholders.searchProducts')} colors={colors} />
            <SectionHeader title={t('admin.segments.stock')} count={products.length} colors={colors} />
            {products.map(p => (
                <Card key={p.product_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                {t('admin.stock.units', { count: (p as any).quantity || (p as any).current_stock || 0 })} • {t('admin.stock.seller')}: {(p as any).seller_name || (p as any).owner_name}
                            </Text>
                            <Text style={{ color: colors.textMuted, fontSize: 10 }}>ID: {p.product_id}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <ActionButton
                                label={p.is_active ? t('admin.actions.disable') : t('admin.actions.enable')}
                                icon={p.is_active ? 'eye' : 'eye-off'}
                                color={p.is_active ? '#3B82F6' : '#6B7280'}
                                onPress={() => handleToggleProduct(p)}
                            />
                            <ActionButton
                                label={t('admin.stock.deleteBtn')}
                                icon="trash"
                                color="#EF4444"
                                onPress={() => handleDeleteProduct(p)}
                            />
                        </View>
                    </View>
                </Card>
            ))}
            {products.length === 0 && <EmptyState icon="cube-outline" message={t('admin.stock.empty') || 'Aucun produit'} colors={colors} />}
        </View>
    );

    const renderFinance = () => (
        <View>
            <SectionHeader title={t('admin.segments.finance')} colors={colors} />
            {stats && (
                <LinearGradient colors={['#7C3AED', '#4F46E5']} style={{ borderRadius: 16, padding: 20, marginBottom: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{t('admin.revenue.total_label') || "Chiffre d'affaires total"}</Text>
                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 }}>{fmtMoney(stats.total_revenue, user?.currency)}</Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('admin.segments.sales') || 'Ventes'}</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.sales}</Text></View>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('admin.segments.stock') || 'Produits'}</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.products}</Text></View>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('admin.segments.stores') || 'Magasins'}</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.stores}</Text></View>
                    </View>
                </LinearGradient>
            )}
            {detailed && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <StatCard label={t('admin.revenue.today')} value={fmtMoney(detailed.revenue_today)} icon="today" color="#10B981" colors={colors} />
                    <StatCard label={t('admin.revenue.week')} value={fmtMoney(detailed.revenue_week)} icon="calendar" color="#3B82F6" colors={colors} />
                    <StatCard label={t('admin.revenue.month')} value={fmtMoney(detailed.revenue_month)} icon="stats-chart" color="#8B5CF6" colors={colors} />
                </View>
            )}
        </View>
    );

    const renderCRM = () => (
        <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('admin.placeholders.searchCustomers')} colors={colors} />
            <SectionHeader title={t('admin.segments.crm')} count={customers.length} colors={colors} />
            {customers.map((c: any) => (
                <Card key={c.customer_id || c.name} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#06B6D4', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>{(c.name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{c.phone || c.email || 'N/A'}</Text>
                            </View>
                        </View>
                        {c.total_purchases > 0 && <Text style={{ color: '#10B981', fontWeight: '700' }}>{fmtMoney(c.total_purchases, user?.currency)}</Text>}
                    </View>
                </Card>
            ))}
            {customers.length === 0 && <EmptyState icon="people-outline" message={t('admin.crm.empty') || 'Aucun client'} colors={colors} />}
        </View>
    );

    const renderSupport = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: t('admin.support.filterAll') },
                    { id: 'open', label: t('admin.support.filterOpen') },
                    { id: 'pending', label: t('admin.support.filterPending') },
                    { id: 'closed', label: t('admin.support.filterClosed') }
                ]}
                active={ticketFilter}
                onSelect={setTicketFilter as any}
                colors={colors}
            />
            <SectionHeader title={t('admin.segments.support')} count={tickets.length} colors={colors} />
            {tickets.map((t_info: any) => (
                <Card key={t_info.ticket_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>{t_info.subject}</Text>
                        <Badge label={t_info.status} color={statusColors[t_info.status] || '#6B7280'} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {t_info.user_name} • {new Date(t_info.created_at).toLocaleDateString()}
                    </Text>
                    {t_info.messages?.length > 0 && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                            {t_info.messages[t_info.messages.length - 1]?.content}
                        </Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        {t_info.status !== 'closed' && (
                            <>
                                <TouchableOpacity onPress={() => setReplyingTo(replyingTo === t_info.ticket_id ? null : t_info.ticket_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>{t('admin.actions.reply')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleCloseTicket(t_info.ticket_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                                    <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '600' }}>{t('admin.actions.close')}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                    {replyingTo === t_info.ticket_id && (
                        <View style={{ marginTop: 12, gap: 8 }}>
                            <TextInput
                                value={replyText}
                                onChangeText={setReplyText}
                                placeholder={t('admin.placeholders.reply')}
                                placeholderTextColor={colors.textMuted}
                                style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder }}
                                multiline
                            />
                            <TouchableOpacity
                                onPress={() => handleReply(t_info.ticket_id, 'ticket')}
                                style={{ backgroundColor: colors.primary, borderRadius: 8, padding: 10, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('admin.actions.send')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Card>
            ))}
            {tickets.length === 0 && <EmptyState icon="help-buoy-outline" message={t('admin.support.empty')} colors={colors} />}
        </View>
    );

    const renderDisputes = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: t('admin.disputes.filterAll') },
                    { id: 'open', label: t('admin.disputes.filterOpen') },
                    { id: 'investigating', label: t('admin.disputes.filterInvestigating') },
                    { id: 'resolved', label: t('admin.disputes.filterResolved') },
                    { id: 'rejected', label: t('admin.disputes.filterRejected') }
                ]}
                active={disputeFilter}
                onSelect={setDisputeFilter as any}
                colors={colors}
            />
            {disputeStats && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatCard label={t('admin.disputes.statsOpen') || 'Ouverts'} value={disputeStats.open} icon="alert-circle" color="#F59E0B" colors={colors} />
                    <StatCard label={t('admin.disputes.statsInvestigating') || 'En cours'} value={disputeStats.investigating} icon="search" color="#3B82F6" colors={colors} />
                    <StatCard label={t('admin.disputes.statsResolved') || 'Résolus'} value={disputeStats.resolved} icon="checkmark-circle" color="#10B981" colors={colors} />
                </View>
            )}
            <SectionHeader title={t('admin.segments.disputes')} count={disputes.length} colors={colors} />
            {disputes.map((d: any) => (
                <Card key={d.dispute_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>{d.subject}</Text>
                        <Badge label={d.status} color={statusColors[d.status] || '#6B7280'} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {d.reporter_name} ({d.reporter_id}) • {t('admin.disputes.type')}: {d.type}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{d.description}</Text>

                    {d.resolution && (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.bgLight, borderRadius: 8, borderWidth: 1, borderColor: '#10B98133' }}>
                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>{t('admin.disputes.resolutionLabel') || 'RÉSOLUTION :'}</Text>
                            <Text style={{ color: colors.text, fontSize: 12 }}>{d.resolution}</Text>
                        </View>
                    )}

                    {d.status !== 'resolved' && d.status !== 'rejected' && (
                        <View style={{ marginTop: 12, gap: 8 }}>
                            <TextInput
                                value={disputeResolution}
                                onChangeText={setDisputeResolution}
                                placeholder={t('admin.placeholders.disputeResolution')}
                                placeholderTextColor={colors.textMuted}
                                style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder }}
                                multiline
                            />
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                <TouchableOpacity onPress={() => handleUpdateDisputeStatus(d.dispute_id, 'investigating')} style={{ backgroundColor: '#3B82F622', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="search" size={14} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>{t('admin.disputes.investigateBtn')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleUpdateDisputeStatus(d.dispute_id, 'resolved')} style={{ backgroundColor: '#10B98122', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>{t('admin.disputes.resolveBtn')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleUpdateDisputeStatus(d.dispute_id, 'rejected')} style={{ backgroundColor: '#EF444422', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>{t('admin.disputes.rejectBtn')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Card>
            ))}
            {disputes.length === 0 && <EmptyState icon="warning-outline" message={t('admin.disputes.empty')} colors={colors} />}
        </View>
    );

    const renderComms = () => (
        <View>
            <SectionHeader title={t('admin.segments.comms')} colors={colors} />
            <Card colors={colors}>
                <TextInput
                    value={msgTitle}
                    onChangeText={setMsgTitle}
                    placeholder={t('admin.placeholders.msgTitle')}
                    placeholderTextColor={colors.textMuted}
                    style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 8 }}
                />
                <TextInput
                    value={msgContent}
                    onChangeText={setMsgContent}
                    placeholder={t('admin.placeholders.msgContent')}
                    placeholderTextColor={colors.textMuted}
                    style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, minHeight: 80, marginBottom: 8 }}
                    multiline
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>{t('admin.comms.targetLabel')}:</Text>
                <FilterBar
                    filters={[
                        { id: 'all', label: t('admin.comms.targetAll') },
                        { id: 'shopkeeper', label: t('admin.comms.targetShopkeepers') },
                        { id: 'supplier', label: t('admin.comms.targetSuppliers') },
                        { id: 'specific', label: t('admin.comms.targetSpecific') }
                    ]}
                    active={msgTarget}
                    onSelect={setMsgTarget as any}
                    colors={colors}
                />

                {msgTarget === 'specific' && (
                    <TextInput
                        value={targetUserId}
                        onChangeText={setTargetUserId}
                        placeholder={t('admin.placeholders.targetUserId')}
                        placeholderTextColor={colors.textMuted}
                        style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, marginTop: 8, marginBottom: 8 }}
                    />
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity onPress={handleSendMessage} style={{ flex: 1, backgroundColor: '#3B82F6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>📨 {t('admin.actions.send')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleBroadcast} style={{ flex: 1, backgroundColor: '#8B5CF6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>📢 {t('admin.actions.broadcast')}</Text>
                    </TouchableOpacity>
                </View>
            </Card>
            <SectionHeader title={t('admin.comms.history')} count={messages.length} colors={colors} />
            {messages.map((m: any, i: number) => (
                <Card key={m.message_id || i} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{m.title}</Text>
                        <Badge label={m.type} color={m.type === 'broadcast' ? '#8B5CF6' : '#3B82F6'} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={2}>{m.content}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                        → {m.target} • {m.sent_by} • {new Date(m.sent_at).toLocaleDateString()}
                    </Text>
                </Card>
            ))}
            {messages.length === 0 && <EmptyState icon="megaphone-outline" message={t('admin.comms.empty')} colors={colors} />}
        </View>
    );

    const renderSecurity = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: t('admin.security.filterAll') },
                    { id: 'login_success', label: t('admin.security.filterLoginSuccess') || 'Connexions' },
                    { id: 'login_failed', label: t('admin.security.filterLoginFailed') || 'Échecs' },
                    { id: 'password_changed', label: t('admin.security.filterPwdChanged') || 'MDP changed' }
                ]}
                active={secFilter}
                onSelect={setSecFilter as any}
                colors={colors}
            />
            {secStats && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatCard label={t('admin.security.statsFailures')} value={secStats.failed_logins_24h || 0} icon="lock-closed" color="#EF4444" colors={colors} />
                    <StatCard label={t('admin.security.statsSuspicious')} value={secStats.successful_logins_24h || 0} icon="eye" color="#F59E0B" colors={colors} />
                    <StatCard label={t('admin.security.statsAlerts')} value={secStats.blocked_users || 0} icon="notifications" color="#EF4444" colors={colors} />
                </View>
            )}
            <SectionHeader title={t('admin.segments.security')} count={secEvents.length} colors={colors} />
            {secEvents.map((e: any, i: number) => {
                const eColor = e.type === 'login_failed' ? '#EF4444' : e.type?.includes('success') ? '#10B981' : '#F59E0B';
                return (
                    <Card key={e.event_id || i} colors={colors}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name={e.type === 'login_failed' ? 'close-circle' : 'shield-checkmark'} size={18} color={eColor} />
                                <Text style={{ color: colors.text, fontWeight: '700' }}>{e.type}</Text>
                            </View>
                            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(e.created_at).toLocaleString()}</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{e.user_email || e.details}</Text>
                    </Card>
                );
            })}
            {secEvents.length === 0 && <EmptyState icon="shield-outline" message={t('admin.security.empty')} colors={colors} />}
        </View>
    );

    const renderLogs = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: t('admin.logs.filterAll') },
                    { id: 'auth', label: t('admin.logs.filterAuth') },
                    { id: 'stock', label: t('admin.logs.filterStock') },
                    { id: 'crm', label: t('admin.logs.filterCRM') },
                    { id: 'system', label: t('admin.logs.filterSystem') }
                ]}
                active={logModule}
                onSelect={setLogModule as any}
                colors={colors}
            />
            <SectionHeader title={t('admin.segments.logs')} count={logs.length} colors={colors} />
            {logs.map((l: any, i: number) => (
                <Card key={l.log_id || l.id || i} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge label={l.module} color={moduleColors[l.module] || '#6B7280'} />
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(l.created_at || l.timestamp).toLocaleString()}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{l.description || l.action}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{l.user_name || l.admin_name}</Text>
                </Card>
            ))}
            {logs.length === 0 && <EmptyState icon="list-outline" message={t('admin.logs.empty')} colors={colors} />}
        </View>
    );

    const renderSettings = () => (
        <View>
            <SectionHeader title={t('admin.settings.system_info')} colors={colors} />
            <Card colors={colors}>
                <View style={{ gap: 16 }}>
                    {[
                        { label: t('admin.health.version_label') || 'Version', value: health?.version || '1.0.0', icon: 'information-circle' },
                        { label: t('admin.health.status_label') || 'Statut', value: health?.status || 'Active', icon: 'server' },
                        { label: t('admin.health.db_label') || 'Base de données', value: health?.database || 'Connected', icon: 'hardware-chip' },
                    ].map((item, i) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 2 ? 1 : 0, borderColor: colors.divider }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                                <Text style={{ color: colors.text, fontWeight: '500' }}>{item.label}</Text>
                            </View>
                            <Text style={{ color: colors.textSecondary }}>{item.value}</Text>
                        </View>
                    ))}
                </View>
            </Card>
            <SectionHeader title={t('admin.settings.actions')} colors={colors} />
            <View style={{ gap: 8 }}>
                <TouchableOpacity onPress={() => setShowPwdModal(true)} style={{ backgroundColor: '#F59E0B22', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F59E0B44' }}>
                    <Ionicons name="key" size={20} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 15 }}>{t('admin.settings.change_password')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/(admin)/data-explorer')} style={{ backgroundColor: '#8B5CF622', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#8B5CF644' }}>
                    <Ionicons name="server" size={20} color="#8B5CF6" />
                    <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 15 }}>{t('admin.settings.data_explorer')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { logout(); router.replace('/(auth)/login' as any); }} style={{ backgroundColor: '#EF444422', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EF444444' }}>
                    <Ionicons name="log-out" size={20} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>{t('admin.settings.logout')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const handleSaveCGU = async () => {
        try {
            setCguUpdating(true);
            await admin.updateCGU(cguContent);
            Alert.alert(t('admin.actions.success'), t('admin.cgu.save_success'));
        } catch (err) {
            Alert.alert(t('admin.actions.error'), t('admin.cgu.save_error'));
        } finally {
            setCguUpdating(false);
        }
    };

    const renderCGU = () => (
        <View style={{ gap: 16 }}>
            <SectionHeader title={t('admin.segments.cgu')} colors={colors} />
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
                {t('admin.cgu.editor_desc')}
            </Text>
            <Card colors={colors}>
                <TextInput
                    multiline
                    value={cguContent}
                    onChangeText={setCguContent}
                    style={{
                        color: colors.text,
                        fontSize: 14,
                        minHeight: 400,
                        textAlignVertical: 'top',
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
                    }}
                    placeholder={t('admin.placeholders.markdown')}
                    placeholderTextColor={colors.textMuted}
                />
            </Card>
            <TouchableOpacity
                onPress={handleSaveCGU}
                disabled={cguUpdating}
                style={{
                    backgroundColor: colors.primary,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    opacity: cguUpdating ? 0.6 : 1
                }}
            >
                {cguUpdating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('admin.actions.save_cgu')}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/terms')}
                style={{
                    backgroundColor: colors.bgLight,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.divider
                }}
            >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('admin.actions.preview')}</Text>
            </TouchableOpacity>
        </View>
    );

    const handleSavePrivacy = async () => {
        try {
            setPrivacyUpdating(true);
            await admin.updatePrivacy(privacyContent);
            Alert.alert(t('admin.actions.success'), t('admin.privacy.save_success'));
        } catch (err) {
            Alert.alert(t('admin.actions.error'), t('admin.privacy.save_error'));
        } finally {
            setPrivacyUpdating(false);
        }
    };

    const renderPrivacy = () => (
        <View style={{ gap: 16 }}>
            <SectionHeader title={t('admin.segments.privacy')} colors={colors} />
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
                {t('admin.privacy.editor_desc')}
            </Text>
            <Card colors={colors}>
                <TextInput
                    multiline
                    value={privacyContent}
                    onChangeText={setPrivacyContent}
                    style={{
                        color: colors.text,
                        fontSize: 14,
                        minHeight: 400,
                        textAlignVertical: 'top',
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
                    }}
                    placeholder={t('admin.placeholders.markdown')}
                    placeholderTextColor={colors.textMuted}
                />
            </Card>
            <TouchableOpacity
                onPress={handleSavePrivacy}
                disabled={privacyUpdating}
                style={{
                    backgroundColor: colors.primary,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    opacity: privacyUpdating ? 0.6 : 1
                }}
            >
                {privacyUpdating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('admin.actions.save_privacy')}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/privacy')}
                style={{
                    backgroundColor: colors.bgLight,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.divider
                }}
            >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('admin.actions.preview')}</Text>
            </TouchableOpacity>
        </View>
    );

    const segMap: Record<Segment, () => React.ReactNode> = {
        global: renderGlobal, users: renderUsers, stores: renderStores, stock: renderStock,
        finance: renderFinance, crm: renderCRM, support: renderSupport, disputes: renderDisputes,
        comms: renderComms, security: renderSecurity, logs: renderLogs, settings: renderSettings,
        cgu: renderCGU, privacy: renderPrivacy,
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
            <LinearGradient colors={['#1E1B4B', '#312E81', '#1E1B4B']} style={st.header}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={st.headerTitle}>{t('admin.dashboard_title') || 'Stockman Console'}</Text>
                            <Text style={st.headerSub}>{user?.email}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={onRefresh} style={st.headerBtn}>
                                <Ionicons name="refresh" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => logout()} style={st.headerBtn}>
                                <Ionicons name="log-out" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {stats && (
                        <View style={st.quickStats}>
                            {[
                                { l: t('admin.segments.users'), v: formatNumber(stats.users), c: '#3B82F6' },
                                { l: t('admin.segments.stores'), v: formatNumber(stats.stores), c: '#8B5CF6' },
                                { l: t('admin.segments.stock'), v: formatNumber(stats.products), c: '#10B981' },
                                { l: t('admin.segments.sales') || 'Sales', v: formatNumber(stats.sales), c: '#F59E0B' },
                            ].map((s, i) => (
                                <View key={i} style={st.quickItem}>
                                    <Text style={[st.quickVal, { color: s.c }]}>{s.v}</Text>
                                    <Text style={st.quickLabel}>{s.l}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </LinearGradient>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[st.segScroll, { borderBottomColor: colors.divider }]} contentContainerStyle={st.segContainer}>
                {SEGMENTS.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => { setSeg(s.id); setSearch(''); }} style={[st.segBtn, seg === s.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                        <Ionicons name={s.icon as any} size={16} color={seg === s.id ? colors.primary : colors.textMuted} />
                        <Text style={[st.segLabel, { color: seg === s.id ? colors.primary : colors.textMuted }]}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
                {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : segMap[seg]?.()}
            </ScrollView>

            <ChangePasswordModal visible={showPwdModal} onClose={() => setShowPwdModal(false)} />
        </View>
    );
}

const st = StyleSheet.create({
    header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    quickStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10 },
    quickItem: { alignItems: 'center' },
    quickVal: { fontSize: 18, fontWeight: '800' },
    quickLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
    segScroll: { borderBottomWidth: 1, maxHeight: 50 },
    segContainer: { paddingHorizontal: 8, gap: 2 },
    segBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 12 },
    segLabel: { fontSize: 12, fontWeight: '600' },
});
