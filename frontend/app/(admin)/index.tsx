import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert, Animated, Dimensions, ActivityIndicator, Platform, Linking } from 'react-native';
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
type Segment = 'global' | 'users' | 'stores' | 'subscriptions' | 'demos' | 'stock' | 'finance' | 'crm' | 'support' | 'disputes' | 'comms' | 'leads' | 'security' | 'logs' | 'settings' | 'cgu' | 'privacy';

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
    const { colors, isDark } = useTheme();
    const { user, logout } = useAuth();

    const SEGMENTS: { id: Segment; label: string; icon: string }[] = [
        { id: 'global', label: t('admin.segments.global'), icon: 'grid' },
        { id: 'users', label: t('admin.segments.users'), icon: 'people' },
        { id: 'stores', label: t('admin.segments.stores'), icon: 'business' },
        { id: 'subscriptions', label: 'Abonnements', icon: 'card' },
        { id: 'demos', label: 'Démos', icon: 'sparkles' },
        { id: 'stock', label: t('admin.segments.stock'), icon: 'cube' },
        { id: 'finance', label: t('admin.segments.finance'), icon: 'cash' },
        { id: 'crm', label: t('admin.segments.crm'), icon: 'person-add' },
        { id: 'support', label: t('admin.segments.support'), icon: 'help-buoy' },
        { id: 'disputes', label: t('admin.segments.disputes'), icon: 'warning' },
        { id: 'comms', label: t('admin.segments.comms'), icon: 'megaphone' },
        { id: 'leads', label: 'Leads', icon: 'mail' },
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
    const [verificationEvents, setVerificationEvents] = useState<any[]>([]);
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [subscriptionOverview, setSubscriptionOverview] = useState<any>(null);
    const [subscriptionAccounts, setSubscriptionAccounts] = useState<any[]>([]);
    const [subscriptionEvents, setSubscriptionEvents] = useState<any[]>([]);
    const [subscriptionAlerts, setSubscriptionAlerts] = useState<any>(null);
    const [demoOverview, setDemoOverview] = useState<any>(null);
    const [demoSessions, setDemoSessions] = useState<any[]>([]);
    const [demoSessionsTotal, setDemoSessionsTotal] = useState(0);
    // Filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('open');
    const [disputeFilter, setDisputeFilter] = useState('all');
    const [logModule, setLogModule] = useState('all');
    const [secFilter, setSecFilter] = useState('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const [subscriptionSearch, setSubscriptionSearch] = useState('');
    const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('all');
    const [subscriptionProviderFilter, setSubscriptionProviderFilter] = useState('all');
    const [demoSearch, setDemoSearch] = useState('');
    const [demoStatusFilter, setDemoStatusFilter] = useState('all');
    const [demoTypeFilter, setDemoTypeFilter] = useState('all');
    const [demoSurfaceFilter, setDemoSurfaceFilter] = useState('all');
    const [verificationProviderFilter, setVerificationProviderFilter] = useState('all');
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
    const [leadContacts, setLeadContacts] = useState<any[]>([]);
    const [leadSubscribers, setLeadSubscribers] = useState<any[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(false);
    const [subscriptionActionId, setSubscriptionActionId] = useState<string | null>(null);
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
            if (seg === 'subscriptions') {
                const [overview, accounts, events, alerts] = await Promise.all([
                    admin.getSubscriptionsOverview(),
                    admin.listSubscriptionAccounts({
                        search: subscriptionSearch || undefined,
                        status: subscriptionStatusFilter === 'all' ? undefined : subscriptionStatusFilter,
                        provider: subscriptionProviderFilter === 'all' ? undefined : subscriptionProviderFilter,
                    }),
                    admin.listSubscriptionEvents({
                        provider: subscriptionProviderFilter === 'all' ? undefined : subscriptionProviderFilter,
                    }),
                    admin.getSubscriptionAlerts(),
                ]);
                setSubscriptionOverview(overview);
                setSubscriptionAccounts(accounts.items || []);
                setSubscriptionEvents(events.items || []);
                setSubscriptionAlerts(alerts);
            }
            if (seg === 'demos') {
                const [overview, sessions] = await Promise.all([
                    admin.getDemoSessionsOverview(),
                    admin.listDemoSessions({
                        search: demoSearch || undefined,
                        status: demoStatusFilter === 'all' ? undefined : demoStatusFilter,
                        demo_type: demoTypeFilter === 'all' ? undefined : demoTypeFilter,
                        surface: demoSurfaceFilter === 'all' ? undefined : demoSurfaceFilter,
                    }),
                ]);
                setDemoOverview(overview);
                setDemoSessions(sessions.items || []);
                setDemoSessionsTotal(sessions.total || 0);
            }
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
            if (seg === 'leads') {
                setLeadsLoading(true);
                try {
                    const r = await admin.getLeads();
                    setLeadContacts(r.contacts || []);
                    setLeadSubscribers(r.subscribers || []);
                } finally { setLeadsLoading(false); }
            }
            if (seg === 'security') {
                const [events, securityStats, verifications, sessions] = await Promise.all([
                    admin.listSecurityEvents(secFilter === 'all' ? undefined : secFilter),
                    admin.getSecurityStats(),
                    admin.listVerificationEvents({ provider: verificationProviderFilter === 'all' ? undefined : verificationProviderFilter }),
                    admin.getActiveSessions(),
                ]);
                setSecEvents(events.items);
                setSecStats(securityStats);
                setVerificationEvents(verifications.items || []);
                setActiveSessions(sessions || []);
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
    }, [
        seg,
        search,
        ticketFilter,
        logModule,
        disputeFilter,
        secFilter,
        subscriptionSearch,
        subscriptionStatusFilter,
        subscriptionProviderFilter,
        demoSearch,
        demoStatusFilter,
        demoTypeFilter,
        demoSurfaceFilter,
        verificationProviderFilter,
    ]);

    useEffect(() => { setLoading(true); loadData(); }, [loadData]);
    const onRefresh = () => { setRefreshing(true); loadData(); };

    const fmtMoney = (n: any, currency?: string) => formatCurrency(n, currency);
    const openExternal = async (url: string) => {
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) {
                Alert.alert('Action indisponible', 'Cette action ne peut pas être ouverte sur cet appareil.');
                return;
            }
            await Linking.openURL(url);
        } catch {
            Alert.alert(t('admin.actions.error'));
        }
    };
    const handleCall = (phone?: string | null) => {
        if (!phone) return Alert.alert("Numéro indisponible", "Aucun numéro de téléphone n'est disponible pour ce contact.");
        openExternal(`tel:${phone}`);
    };
    const handleEmail = (email?: string | null) => {
        if (!email) return Alert.alert("Adresse indisponible", "Aucune adresse e-mail n'est disponible pour ce contact.");
        openExternal(`mailto:${email}`);
    };
    const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';
    const formatPlanLabel = (plan?: string | null) => {
        if (plan === 'enterprise') return 'Enterprise';
        if (plan === 'pro') return 'Pro';
        if (plan === 'starter') return 'Starter';
        return 'Trial';
    };
    const formatProviderLabel = (provider?: string | null) => {
        if (!provider || provider === 'none') return 'Aucun';
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    };
    const formatAccessPhase = (phase?: string | null) => {
        if (phase === 'active') return 'Actif';
        if (phase === 'grace') return 'Grâce';
        if (phase === 'restricted') return 'Restreint';
        if (phase === 'read_only') return 'Lecture seule';
        return phase || '—';
    };
    const formatDemoTypeLabel = (demoType?: string | null) => {
        if (demoType === 'retail') return 'Commerce';
        if (demoType === 'restaurant') return 'Restaurant';
        if (demoType === 'enterprise') return 'Enterprise';
        return demoType || '—';
    };
    const formatDemoStatusLabel = (status?: string | null) => {
        if (status === 'active') return 'Active';
        if (status === 'expired') return 'Expirée';
        if (status === 'cleaned') return 'Nettoyée';
        return status || '—';
    };
    const formatRemainingDuration = (seconds?: number | null) => {
        if (seconds === null || seconds === undefined) return '—';
        if (seconds <= 0) return 'Expirée';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours <= 0) return `${minutes} min`;
        return `${hours} h ${minutes} min`;
    };

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
    const handleDeleteUser = async (u: any) => {
        Alert.alert(
            'Supprimer ce compte ?',
            `Cette action est irréversible. Toutes les données de "${u.name}" (${u.email}) seront supprimées : produits, ventes, clients, boutiques, staff...`,
            [
                { text: t('admin.actions.cancel'), style: 'cancel' },
                {
                    text: 'Supprimer', style: 'destructive', onPress: async () => {
                        try {
                            await admin.deleteUser(u.email);
                            loadData();
                            Alert.alert('Compte supprimé', `"${u.name}" et toutes ses données ont été supprimés.`);
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
    const handleGrantGrace = async (accountId: string, days = 7) => {
        setSubscriptionActionId(`${accountId}:grace:${days}`);
        try {
            await admin.grantSubscriptionGrace(accountId, days);
            await loadData();
            Alert.alert('Succès', `Grâce de ${days} jours accordée.`);
        } catch {
            Alert.alert(t('admin.actions.error'));
        } finally {
            setSubscriptionActionId(null);
        }
    };
    const handleToggleReadOnly = async (accountId: string, enabled: boolean) => {
        setSubscriptionActionId(`${accountId}:readonly:${enabled ? 'on' : 'off'}`);
        try {
            if (enabled) await admin.enableSubscriptionReadOnly(accountId);
            else await admin.disableSubscriptionReadOnly(accountId);
            await loadData();
            Alert.alert('Succès', enabled ? 'Lecture seule activée.' : 'Lecture seule retirée.');
        } catch {
            Alert.alert(t('admin.actions.error'));
        } finally {
            setSubscriptionActionId(null);
        }
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
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('users')} style={{ flex: 1, minWidth: 140 }}>
                    <StatCard label={t('admin.retention.deletedTotal')} value={stats?.deleted_users || 0} icon="trash" color="#EF4444" colors={colors} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('users')} style={{ flex: 1, minWidth: 140 }}>
                    <StatCard label={t('admin.retention.inactive30')} value={stats?.inactive_users || 0} icon="moon" color="#6B7280" colors={colors} />
                </TouchableOpacity>
            </View>

            {/* Revenue Breakdown */}
            {detailed && (
                <>
                    <SectionHeader title={t('admin.revenue.title')} colors={colors} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{fmtMoney(stats?.total_revenue, user?.currency)}</Text>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('finance')} style={{ flex: 1, minWidth: 140 }}>
                            <StatCard label={t('admin.revenue.week')} value={fmtMoney(detailed.revenue_week)} icon="calendar" color="#3B82F6" colors={colors} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('finance')} style={{ flex: 1, minWidth: 140 }}>
                            <StatCard label={t('admin.revenue.month')} value={fmtMoney(detailed.revenue_month)} icon="trending-up" color="#8B5CF6" colors={colors} />
                        </TouchableOpacity>
                    </View>

                    <SectionHeader title={t('admin.alerts.title')} colors={colors} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('support')} style={{ flex: 1, minWidth: 140 }}>
                            <StatCard label={t('admin.alerts.openTickets')} value={detailed.open_tickets} icon="chatbubbles" color="#F59E0B" colors={colors} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('stock')} style={{ flex: 1, minWidth: 140 }}>
                            <StatCard label={t('admin.alerts.lowStock')} value={detailed.low_stock_count} icon="alert-circle" color="#EF4444" colors={colors} />
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('users')} style={{ flex: 1, minWidth: 140 }}>
                            <StatCard label={t('admin.alerts.recentSignups')} value={detailed.recent_signups} icon="person-add" color="#06B6D4" colors={colors} />
                        </TouchableOpacity>
                        {detailed.signups_today !== undefined && (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => setSeg('users')} style={{ flex: 1, minWidth: 140 }}>
                                <StatCard label={t('admin.distribution.signups_today')} value={detailed.signups_today} icon="today" color="#10B981" colors={colors} />
                            </TouchableOpacity>
                        )}
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

                    {/* Plan Distribution */}
                    {detailed.users_by_plan && (
                        <>
                            <SectionHeader title={t('admin.distribution.plan')} colors={colors} />
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                <StatCard label={t('admin.distribution.plan_enterprise')} value={detailed.users_by_plan?.enterprise || 0} icon="trophy" color="#8B5CF6" colors={colors} />
                                <StatCard label={t('admin.distribution.plan_pro')} value={detailed.users_by_plan?.pro || 0} icon="flash" color="#3B82F6" colors={colors} />
                                <StatCard label={t('admin.distribution.plan_starter')} value={detailed.users_by_plan?.starter || 0} icon="leaf" color="#10B981" colors={colors} />
                                <StatCard
                                    label={t('admin.distribution.trials_expiring')}
                                    value={detailed.trials_expiring_soon || 0}
                                    icon="timer"
                                    color={(detailed.trials_expiring_soon || 0) > 0 ? '#EF4444' : '#6B7280'}
                                    colors={colors}
                                />
                            </View>
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
                    { id: 'superadmin', label: t('admin.users.filterAdmins') },
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: roleColors[u.role] || '#6B7280', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{(u.name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{u.name}</Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>({u.user_id})</Text>
                                </View>
                                <Text style={{ color: colors.textMuted, fontSize: 11 }}>{u.email}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                    {u.phone ? <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>?? {u.phone}</Text> : null}
                                    {u.business_type ? <Text style={{ color: colors.textSecondary, fontSize: 11 }}>?? {u.business_type}</Text> : null}
                                </View>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                            <Badge label={u.role || 'user'} color={roleColors[u.role] || '#6B7280'} />
                            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <Badge label={u.country_code || '??'} color={colors.secondary} />
                                <TouchableOpacity onPress={() => handleToggleUser(u)}>
                                    <Badge label={u.is_active === false ? t('admin.users.banned') : t('admin.users.active')} color={u.is_active === false ? '#EF4444' : '#10B981'} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                        {u.phone ? <ActionButton label="Appeler" icon="call-outline" color={colors.primary} onPress={() => handleCall(u.phone)} /> : null}
                        {u.email ? <ActionButton label="E-mail" icon="mail-outline" color="#8B5CF6" onPress={() => handleEmail(u.email)} /> : null}
                        <ActionButton label={u.is_active === false ? 'Réactiver' : 'Suspendre'} icon={u.is_active === false ? 'checkmark-circle-outline' : 'pause-circle-outline'} color={u.is_active === false ? '#10B981' : '#F59E0B'} onPress={() => handleToggleUser(u)} />
                        <ActionButton label="Supprimer" icon="trash-outline" color="#DC2626" onPress={() => handleDeleteUser(u)} />
                    </View>
                </Card>
            ))}
        </View>
    );

    const renderStores = () => (
        (() => {
            const filteredStores = stores.filter((s) => {
                if (!search.trim()) return true;
                const query = search.toLowerCase();
                return [
                    s.name,
                    s.owner_name,
                    s.owner_email,
                    s.store_id,
                ].some((value) => String(value || '').toLowerCase().includes(query));
            });

            return (
                <View>
                    <SearchBar value={search} onChangeText={setSearch} placeholder={t('admin.placeholders.searchStores')} colors={colors} />
                    <SectionHeader title={t('admin.segments.stores')} count={filteredStores.length} colors={colors} />
                    {filteredStores.map(s => (
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
                    {filteredStores.length === 0 && (
                        <EmptyState icon="business-outline" message={t('admin.stores.empty') || t('admin.stock.empty')} colors={colors} />
                    )}
                </View>
            );
        })()
    );

    const renderSubscriptions = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: 'Tous' },
                    { id: 'active', label: 'Actifs' },
                    { id: 'expired', label: 'Expirés' },
                    { id: 'cancelled', label: 'Annulés' },
                ]}
                active={subscriptionStatusFilter}
                onSelect={setSubscriptionStatusFilter as any}
                colors={colors}
            />
            <FilterBar
                filters={[
                    { id: 'all', label: 'Tous les providers' },
                    { id: 'stripe', label: 'Stripe' },
                    { id: 'flutterwave', label: 'Flutterwave' },
                    { id: 'revenuecat', label: 'RevenueCat' },
                    { id: 'none', label: 'Sans provider' },
                ]}
                active={subscriptionProviderFilter}
                onSelect={setSubscriptionProviderFilter as any}
                colors={colors}
            />
            <SearchBar value={subscriptionSearch} onChangeText={setSubscriptionSearch} placeholder="Compte, propriétaire, e-mail, devise..." colors={colors} />

            {subscriptionOverview && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatCard label="Payants actifs" value={subscriptionOverview.active_paid_accounts || 0} icon="card" color="#3B82F6" colors={colors} />
                    <StatCard label="Trials actifs" value={subscriptionOverview.active_trials || 0} icon="flash" color="#8B5CF6" colors={colors} />
                    <StatCard label="Trials < 7 j" value={subscriptionOverview.trials_expiring_7d || 0} icon="time" color="#F59E0B" colors={colors} />
                    <StatCard label="Expirations proches" value={subscriptionOverview.subscriptions_expiring_soon || 0} icon="alert-circle" color="#EF4444" colors={colors} />
                </View>
            )}

            {subscriptionAlerts?.items?.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                    <SectionHeader title="Alertes abonnements" count={subscriptionAlerts.items.length} colors={colors} />
                    {subscriptionAlerts.items.map((alert: any, index: number) => (
                        <Card key={`${alert.code}-${index}`} colors={colors}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{alert.title}</Text>
                                <Badge label={`${alert.count || 0}`} color={alert.severity === 'critical' ? '#EF4444' : '#F59E0B'} />
                            </View>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{alert.message}</Text>
                        </Card>
                    ))}
                </View>
            )}

            <SectionHeader title="Comptes abonnés" count={subscriptionAccounts.length} colors={colors} />
            {subscriptionAccounts.map((account: any) => {
                const actionGraceId = `${account.account_id}:grace:7`;
                const actionReadOnlyId = `${account.account_id}:readonly:${account.manual_read_only_enabled ? 'off' : 'on'}`;
                return (
                    <Card key={account.account_id} colors={colors}>
                        <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{account.display_name || account.owner_name || account.account_id}</Text>
                                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{account.owner_email || account.billing_contact_email || '—'}</Text>
                                </View>
                                <Badge label={formatPlanLabel(account.plan)} color={account.plan === 'enterprise' ? '#8B5CF6' : account.plan === 'pro' ? '#3B82F6' : '#10B981'} />
                            </View>

                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                {formatProviderLabel(account.subscription_provider)} · {formatAccessPhase(account.subscription_access_phase)} · {account.country_code || '—'} · {account.currency || '—'}
                            </Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                Boutiques : {account.stores_count || 0} · Utilisateurs : {account.users_count || 0}
                            </Text>
                            {(account.last_payment_amount || account.last_payment_at) && (
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                                    Dernier paiement : {account.last_payment_amount ? fmtMoney(account.last_payment_amount, account.last_payment_currency || account.currency) : '—'} · {formatDateTime(account.last_payment_at)}
                                </Text>
                            )}

                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                <TouchableOpacity
                                    onPress={() => handleGrantGrace(account.account_id, 7)}
                                    disabled={subscriptionActionId === actionGraceId}
                                    style={{ backgroundColor: '#3B82F622', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, opacity: subscriptionActionId === actionGraceId ? 0.6 : 1 }}
                                >
                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>
                                        {subscriptionActionId === actionGraceId ? 'Traitement…' : 'Accorder 7 jours'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleToggleReadOnly(account.account_id, !account.manual_read_only_enabled)}
                                    disabled={subscriptionActionId === actionReadOnlyId}
                                    style={{ backgroundColor: account.manual_read_only_enabled ? '#10B98122' : '#F59E0B22', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, opacity: subscriptionActionId === actionReadOnlyId ? 0.6 : 1 }}
                                >
                                    <Text style={{ color: account.manual_read_only_enabled ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: '700' }}>
                                        {subscriptionActionId === actionReadOnlyId
                                            ? 'Traitement…'
                                            : account.manual_read_only_enabled
                                                ? 'Retirer lecture seule'
                                                : 'Passer en lecture seule'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Card>
                );
            })}
            {subscriptionAccounts.length === 0 && <EmptyState icon="card-outline" message="Aucun compte ne correspond aux filtres." colors={colors} />}

            <SectionHeader title="Événements récents" count={subscriptionEvents.length} colors={colors} />
            {subscriptionEvents.slice(0, 12).map((event: any, index: number) => (
                <Card key={event.event_id || `${event.account_id}-${index}`} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{event.event_type || 'événement'}</Text>
                        <Badge label={formatProviderLabel(event.provider)} color="#8B5CF6" />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{event.account_id || '—'} · {event.status || '—'}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{formatDateTime(event.created_at)}</Text>
                </Card>
            ))}
        </View>
    );

    const renderDemos = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: 'Tous statuts' },
                    { id: 'active', label: 'Actives' },
                    { id: 'expired', label: 'Expirées' },
                    { id: 'cleaned', label: 'Nettoyées' },
                ]}
                active={demoStatusFilter}
                onSelect={setDemoStatusFilter as any}
                colors={colors}
            />
            <FilterBar
                filters={[
                    { id: 'all', label: 'Tous types' },
                    { id: 'retail', label: 'Commerce' },
                    { id: 'restaurant', label: 'Restaurant' },
                    { id: 'enterprise', label: 'Enterprise' },
                ]}
                active={demoTypeFilter}
                onSelect={setDemoTypeFilter as any}
                colors={colors}
            />
            <FilterBar
                filters={[
                    { id: 'all', label: 'Toutes surfaces' },
                    { id: 'mobile', label: 'Mobile' },
                    { id: 'web', label: 'Web' },
                ]}
                active={demoSurfaceFilter}
                onSelect={setDemoSurfaceFilter as any}
                colors={colors}
            />
            <SearchBar value={demoSearch} onChangeText={setDemoSearch} placeholder="Session, e-mail, compte..." colors={colors} />

            {demoOverview && (
                <>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        <StatCard label="Actives" value={demoOverview.active_sessions || 0} icon="flash" color="#10B981" colors={colors} />
                        <StatCard label="Expirées" value={demoOverview.expired_sessions || 0} icon="time" color="#F59E0B" colors={colors} />
                        <StatCard label="Nettoyées" value={demoOverview.cleaned_sessions || 0} icon="trash" color="#8B5CF6" colors={colors} />
                        <StatCard label="Contacts captés" value={demoOverview.contacts_captured || 0} icon="mail" color="#3B82F6" colors={colors} />
                    </View>

                    {Object.keys(demoOverview.by_currency || {}).length > 0 && (
                        <Card colors={colors} style={{ marginBottom: 12 }}>
                            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Par devise</Text>
                            {Object.entries(demoOverview.by_currency as Record<string, number>).map(([currency, count]) => {
                                const total = demoOverview.total_sessions || 1;
                                const pct = Math.round((count / total) * 100);
                                const colorMap: Record<string, string> = { XOF: '#10B981', XAF: '#14B8A6', EUR: '#3B82F6', USD: '#8B5CF6', GNF: '#F59E0B', CDF: '#F97316' };
                                const barColor = colorMap[currency] || '#6B7280';
                                return (
                                    <View key={currency} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, width: 36 }}>{currency === 'unknown' ? '—' : currency}</Text>
                                        <View style={{ flex: 1, height: 6, backgroundColor: colors.glassBorder, borderRadius: 3, overflow: 'hidden' }}>
                                            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: 3 }} />
                                        </View>
                                        <Text style={{ color: colors.textMuted, fontSize: 12, width: 28, textAlign: 'right' }}>{count}</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 11, width: 32 }}>{pct}%</Text>
                                    </View>
                                );
                            })}
                        </Card>
                    )}

                    {Object.keys(demoOverview.by_country || {}).length > 0 && (
                        <Card colors={colors} style={{ marginBottom: 12 }}>
                            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Par pays</Text>
                            {Object.entries(demoOverview.by_country as Record<string, number>).slice(0, 10).map(([country, count]) => {
                                const total = demoOverview.total_sessions || 1;
                                const pct = Math.round((count / total) * 100);
                                return (
                                    <View key={country} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12, width: 36 }}>{country === 'unknown' ? '—' : country}</Text>
                                        <View style={{ flex: 1, height: 4, backgroundColor: colors.glassBorder, borderRadius: 2, overflow: 'hidden' }}>
                                            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 2, opacity: 0.7 }} />
                                        </View>
                                        <Text style={{ color: colors.textMuted, fontSize: 12, width: 28, textAlign: 'right' }}>{count}</Text>
                                    </View>
                                );
                            })}
                        </Card>
                    )}
                </>
            )}

            <SectionHeader title="Sessions démo" count={demoSessionsTotal || demoSessions.length} colors={colors} />
            {demoSessions.map((session: any) => (
                <Card key={session.demo_session_id} colors={colors}>
                    <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '700' }}>{session.demo_session_id}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{session.account_id || session.owner_user_id || '—'}</Text>
                            </View>
                            <Badge
                                label={formatDemoStatusLabel(session.status)}
                                color={session.status === 'active' ? '#10B981' : session.status === 'expired' ? '#F59E0B' : '#8B5CF6'}
                            />
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            {formatDemoTypeLabel(session.demo_type)} · {(session.surface || '—').toUpperCase()} · {session.country_code || '—'} · {session.currency || '—'}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            Contact : {session.contact_email || 'Non capté'}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                            Début : {formatDateTime(session.started_at || session.created_at)}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                            Expiration : {formatDateTime(session.expires_at)} · Restant : {formatRemainingDuration(session.remaining_seconds)}
                        </Text>
                    </View>
                </Card>
            ))}
            {demoSessions.length === 0 && <EmptyState icon="sparkles-outline" message="Aucune session démo ne correspond aux filtres." colors={colors} />}
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
                                {t('admin.stock.units', { count: (p as any).quantity || (p as any).current_stock || 0 })} · {t('admin.stock.seller')}: {(p as any).seller_name || (p as any).owner_name}
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
            {products.length === 0 && <EmptyState icon="cube-outline" message={t('admin.stock.empty')} colors={colors} />}
        </View>
    );

    const renderFinance = () => (
        <View>
            <SectionHeader title={t('admin.segments.finance')} colors={colors} />
            {stats && (
                <LinearGradient colors={['#7C3AED', '#4F46E5']} style={{ borderRadius: 16, padding: 20, marginBottom: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{t('admin.revenue.total_label')}</Text>
                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 }}>{fmtMoney(stats.total_revenue, user?.currency)}</Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('admin.segments.sales')}</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.sales}</Text></View>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('admin.segments.stock')}</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.products}</Text></View>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{t('admin.segments.stores')}</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.stores}</Text></View>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#06B6D4', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>{(c.name || '?')[0].toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{c.name}</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 11 }} numberOfLines={1}>{c.phone || c.email || 'N/A'}</Text>
                                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                                    {c.store_name ? <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Boutique : {c.store_name}</Text> : null}
                                    {c.last_purchase_at ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>Dernier achat : {new Date(c.last_purchase_at).toLocaleDateString()}</Text> : null}
                                </View>
                            </View>
                        </View>
                        {c.total_purchases > 0 && <Text style={{ color: '#10B981', fontWeight: '700', marginLeft: 8 }}>{fmtMoney(c.total_purchases, user?.currency)}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                        {c.phone ? <ActionButton label="Appeler" icon="call-outline" color={colors.primary} onPress={() => handleCall(c.phone)} /> : null}
                        {c.email ? <ActionButton label="E-mail" icon="mail-outline" color="#8B5CF6" onPress={() => handleEmail(c.email)} /> : null}
                        {c.phone ? <ActionButton label="WhatsApp" icon="logo-whatsapp" color="#10B981" onPress={() => openExternal(`https://wa.me/${String(c.phone).replace(/[^0-9]/g, '')}`)} /> : null}
                    </View>
                </Card>
            ))}
            {customers.length === 0 && <EmptyState icon="people-outline" message={t('admin.users.empty')} colors={colors} />}
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
                        {t_info.user_name} · {new Date(t_info.created_at).toLocaleDateString()}
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
                        {d.reporter_name} ({d.reporter_id}) · {t('admin.disputes.type')}: {d.type}
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
                        <Text style={{ color: '#fff', fontWeight: '700' }}>?? {t('admin.actions.send')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleBroadcast} style={{ flex: 1, backgroundColor: '#8B5CF6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>?? {t('admin.actions.broadcast')}</Text>
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
                        ? {m.target} · {m.sent_by} · {new Date(m.sent_at).toLocaleDateString()}
                    </Text>
                </Card>
            ))}
            {messages.length === 0 && <EmptyState icon="megaphone-outline" message={t('admin.comms.empty')} colors={colors} />}
        </View>
    );

    const renderLeads = () => (
        <View>
            <SectionHeader title="Contact Messages" count={leadContacts.length} colors={colors} />
            {leadsLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
            {leadContacts.map((c: any, i: number) => (
                <Card key={c._id || i} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{c.name}</Text>
                        <Badge label={c.type || 'contact'} color="#3B82F6" />
                    </View>
                    <Text style={{ color: colors.primary, fontSize: 13, marginBottom: 4 }}>{c.email}</Text>
                    {c.company ? <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>?? {c.company}</Text> : null}
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>{c.message}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString()}</Text>
                </Card>
            ))}
            {!leadsLoading && leadContacts.length === 0 && <EmptyState icon="mail-outline" message="No contact messages yet" colors={colors} />}

            <SectionHeader title="Newsletter Subscribers" count={leadSubscribers.length} colors={colors} />
            {leadSubscribers.map((s: any, i: number) => (
                <Card key={s._id || i} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{s.email}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(s.created_at).toLocaleDateString()}</Text>
                    </View>
                </Card>
            ))}
            {!leadsLoading && leadSubscribers.length === 0 && <EmptyState icon="newspaper-outline" message="No subscribers yet" colors={colors} />}
        </View>
    );

    const renderSecurity = () => (
        <View>
            <FilterBar
                filters={[
                    { id: 'all', label: t('admin.security.filterAll') },
                    { id: 'login_success', label: t('admin.security.filterLoginSuccess') || 'Connexions' },
                    { id: 'login_failed', label: t('admin.security.filterLoginFailed') || 'échecs' },
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
                    <StatCard label="Vérifications" value={verificationEvents.length} icon="mail" color="#3B82F6" colors={colors} />
                    <StatCard label="Sessions actives" value={activeSessions.length} icon="pulse" color="#8B5CF6" colors={colors} />
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

            <SectionHeader title="Journal des vérifications" count={verificationEvents.length} colors={colors} />
            <FilterBar
                filters={[
                    { id: 'all', label: 'Tous les providers' },
                    { id: 'firebase', label: 'Firebase' },
                    { id: 'resend', label: 'Resend' },
                ]}
                active={verificationProviderFilter}
                onSelect={setVerificationProviderFilter as any}
                colors={colors}
            />
            {verificationEvents.map((event: any, index: number) => (
                <Card key={event.verification_id || `${event.created_at}-${index}`} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>
                            {(event.channel || 'canal').toUpperCase()} · {(event.type || 'verification').replace(/_/g, ' ')}
                        </Text>
                        <Badge label={formatProviderLabel(event.provider)} color={event.provider === 'firebase' ? '#3B82F6' : '#10B981'} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {event.email || event.phone || event.user_id || 'Utilisateur non précisé'}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{formatDateTime(event.created_at)}</Text>
                </Card>
            ))}
            {verificationEvents.length === 0 && <EmptyState icon="mail-outline" message="Aucune vérification remontée." colors={colors} />}

            <SectionHeader title="Sessions actives" count={activeSessions.length} colors={colors} />
            {activeSessions.map((session: any, index: number) => (
                <Card key={session.session_id || `${session.user_id}-${index}`} colors={colors}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{session.user_name || 'Inconnu'}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{session.user_email || session.user_id || '—'}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
                        Créée : {formatDateTime(session.created_at)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        Expire : {formatDateTime(session.expires_at)}
                    </Text>
                </Card>
            ))}
            {activeSessions.length === 0 && <EmptyState icon="pulse-outline" message="Aucune session active remontée." colors={colors} />}
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
        global: renderGlobal, users: renderUsers, stores: renderStores, subscriptions: renderSubscriptions, demos: renderDemos, stock: renderStock,
        finance: renderFinance, crm: renderCRM, support: renderSupport, disputes: renderDisputes,
        comms: renderComms, leads: renderLeads, security: renderSecurity, logs: renderLogs, settings: renderSettings,
        cgu: renderCGU, privacy: renderPrivacy,
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
            <LinearGradient colors={(isDark ? ['#1E1B4B', '#312E81', '#1E1B4B'] : [colors.bgLight, colors.bgMid, colors.bgDark]) as [string, string, string]} style={st.header}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={[st.headerTitle, { color: colors.text }]}>{t('admin.dashboard_title') || 'Stockman Console'}</Text>
                            <Text style={[st.headerSub, { color: isDark ? 'rgba(255,255,255,0.6)' : colors.textMuted }]}>{user?.email}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={onRefresh} style={[st.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)' }]}>
                                <Ionicons name="refresh" size={18} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { logout(); router.replace('/(auth)/login' as any); }} style={[st.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)' }]}>
                                <Ionicons name="log-out" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {stats && (
                        <View style={[st.quickStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.82)' }]}>
                            {[
                                { l: t('admin.segments.users'), v: formatNumber(stats.users), c: '#3B82F6' },
                                { l: t('admin.segments.stores'), v: formatNumber(stats.stores), c: '#8B5CF6' },
                                { l: t('admin.segments.stock'), v: formatNumber(stats.products), c: '#10B981' },
                                { l: t('admin.segments.sales') || 'Sales', v: formatNumber(stats.sales), c: '#F59E0B' },
                            ].map((s, i) => (
                                <View key={i} style={st.quickItem}>
                                    <Text style={[st.quickVal, { color: s.c }]}>{s.v}</Text>
                                    <Text style={[st.quickLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : colors.textMuted }]}>{s.l}</Text>
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
    headerTitle: { fontSize: 24, fontWeight: '800' },
    headerSub: { fontSize: 12, marginTop: 2 },
    headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    quickStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, borderRadius: 12, padding: 10 },
    quickItem: { alignItems: 'center' },
    quickVal: { fontSize: 18, fontWeight: '800' },
    quickLabel: { fontSize: 10, marginTop: 2 },
    segScroll: { borderBottomWidth: 1, maxHeight: 50 },
    segContainer: { paddingHorizontal: 8, gap: 2 },
    segBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 12 },
    segLabel: { fontSize: 12, fontWeight: '600' },
});

