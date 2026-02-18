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

const { width } = Dimensions.get('window');
type Segment = 'global' | 'users' | 'stores' | 'stock' | 'finance' | 'crm' | 'support' | 'disputes' | 'comms' | 'security' | 'logs' | 'settings' | 'cgu' | 'privacy';

const SEGMENTS: { id: Segment; label: string; icon: string }[] = [
    { id: 'global', label: 'Global', icon: 'grid' },
    { id: 'users', label: 'Utilisateurs', icon: 'people' },
    { id: 'stores', label: 'Magasins', icon: 'business' },
    { id: 'stock', label: 'Gestion Stock', icon: 'cube' },
    { id: 'finance', label: 'Finance', icon: 'cash' },
    { id: 'crm', label: 'CRM', icon: 'person-add' },
    { id: 'support', label: 'Support', icon: 'help-buoy' },
    { id: 'disputes', label: 'Litiges', icon: 'warning' },
    { id: 'comms', label: 'Communication', icon: 'megaphone' },
    { id: 'security', label: 'Sécurité', icon: 'shield' },
    { id: 'logs', label: 'Journal Activité', icon: 'list' },
    { id: 'settings', label: 'Paramètres', icon: 'settings' },
    { id: 'cgu', label: 'CGU', icon: 'document-text' },
    { id: 'privacy', label: 'Confidentialité', icon: 'shield-checkmark' },
];

const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
const fmtMoney = (n: any, currency?: string) => {
    const val = Number(n) || 0;
    return val.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' ' + (currency === 'EUR' ? '€' : 'F');
};

export default function AdminDashboard() {
    const { colors } = useTheme();
    const { user, logout } = useAuth();
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

    const handleToggleUser = async (u: User) => {
        const action = u.is_active === false ? 'débloquer' : 'bloquer';
        Alert.alert(
            'Confirmation',
            `Voulez-vous vraiment ${action} l'utilisateur ${u.name} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer', onPress: async () => {
                        try { await admin.toggleUser(u.user_id); loadData(); Alert.alert('Succès', `Utilisateur ${action}é`); } catch { Alert.alert('Erreur'); }
                    }
                }
            ]
        );
    };
    const handleToggleProduct = async (p: Product) => {
        const action = p.is_active === false ? 'activer' : 'désactiver';
        try {
            await admin.toggleProduct(p.product_id);
            loadData();
            Alert.alert('Succès', `Produit ${action}é`);
        } catch { Alert.alert('Erreur'); }
    };
    const handleDeleteProduct = async (p: Product) => {
        Alert.alert(
            '⚠️ Suppression Définitive',
            `Voulez-vous vraiment supprimer le produit "${p.name}" ? Cette action est irréversible.`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer', style: 'destructive', onPress: async () => {
                        try { await admin.deleteProduct(p.product_id); loadData(); Alert.alert('Supprimé'); } catch { Alert.alert('Erreur'); }
                    }
                }
            ]
        );
    };
    const handleCloseTicket = async (id: string) => {
        try { await admin.closeTicket(id); loadData(); } catch { Alert.alert('Erreur'); }
    };
    const handleReply = async (id: string, type: 'ticket' | 'dispute') => {
        if (!replyText.trim()) return;
        try {
            if (type === 'ticket') await admin.replyTicket(id, replyText);
            else await admin.replyDispute(id, replyText);
            setReplyText(''); setReplyingTo(null); loadData();
        } catch { Alert.alert('Erreur'); }
    };
    const handleUpdateDisputeStatus = async (id: string, status: string) => {
        try {
            await admin.updateDisputeStatus(id, status, disputeResolution || undefined, disputeNotes || undefined);
            setDisputeResolution(''); setDisputeNotes(''); loadData();
            Alert.alert('✅ Statut mis à jour');
        } catch { Alert.alert('Erreur'); }
    };
    const handleSendMessage = async () => {
        if (!msgTitle.trim() || !msgContent.trim()) return Alert.alert('Remplir tous les champs');
        const finalTarget = msgTarget === 'specific' ? targetUserId : msgTarget;
        if (msgTarget === 'specific' && !targetUserId.trim()) return Alert.alert('Entrez un ID utilisateur');
        try {
            await admin.sendMessage({ title: msgTitle, content: msgContent, target: finalTarget });
            Alert.alert('✅ Envoyé'); setMsgTitle(''); setMsgContent(''); setTargetUserId(''); loadData();
        } catch { Alert.alert('Erreur'); }
    };
    const handleBroadcast = async () => {
        if (!msgTitle.trim() || !msgContent.trim()) return Alert.alert('Remplir tous les champs');
        try {
            const r = await admin.broadcast(msgContent, msgTitle);
            Alert.alert('✅ Diffusion', `Envoyé à ${r.sent_to} appareils`);
            setMsgTitle(''); setMsgContent(''); loadData();
        } catch { Alert.alert('Erreur'); }
    };

    const roleColors: Record<string, string> = { superadmin: '#EF4444', shopkeeper: '#3B82F6', staff: '#10B981', supplier: '#F59E0B' };
    const statusColors: Record<string, string> = { open: '#F59E0B', investigating: '#3B82F6', resolved: '#10B981', rejected: '#EF4444', closed: '#6B7280', pending: '#8B5CF6' };
    const moduleColors: Record<string, string> = { stock: '#3B82F6', auth: '#EF4444', crm: '#10B981', pos: '#F59E0B', broadcast: '#8B5CF6', communication: '#06B6D4' };

    // ============ RENDER SEGMENTS ============
    const renderGlobal = () => (
        <View>
            {/* Health */}
            <SectionHeader title="Santé Système" colors={colors} />
            <Card colors={colors}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: health?.database === 'connected' ? '#10B981' : '#EF4444' }} />
                        <Text style={{ color: colors.text, fontWeight: '600' }}>Base de données</Text>
                    </View>
                    <Badge label={health?.database === 'connected' ? 'EN LIGNE' : 'ERREUR'} color={health?.database === 'connected' ? '#10B981' : '#EF4444'} />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>Version {health?.version || '?'}</Text>
            </Card>

            {/* Retention */}
            <SectionHeader title="Rétention" colors={colors} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <StatCard label="Supprimés (Total)" value={stats?.deleted_users || 0} icon="trash" color="#EF4444" colors={colors} />
                <StatCard label="Inactifs (>30j)" value={stats?.inactive_users || 0} icon="moon" color="#6B7280" colors={colors} />
            </View>

            {/* Revenue Breakdown */}
            {detailed && (
                <>
                    <SectionHeader title="Revenus" colors={colors} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{fmtMoney(s.revenue, user?.currency)}</Text>
                        <StatCard label="7 jours" value={fmtMoney(detailed.revenue_week)} icon="calendar" color="#3B82F6" colors={colors} />
                        <StatCard label="30 jours" value={fmtMoney(detailed.revenue_month)} icon="trending-up" color="#8B5CF6" colors={colors} />
                    </View>

                    <SectionHeader title="Alertes" colors={colors} />
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <StatCard label="Tickets ouverts" value={detailed.open_tickets} icon="chatbubbles" color="#F59E0B" colors={colors} />
                        <StatCard label="Stock bas" value={detailed.low_stock_count} icon="alert-circle" color="#EF4444" colors={colors} />
                        <StatCard label="Inscriptions 7j" value={detailed.recent_signups} icon="person-add" color="#06B6D4" colors={colors} />
                    </View>

                    {detailed.top_stores.length > 0 && (
                        <>
                            <SectionHeader title="Top Magasins" count={detailed.top_stores.length} colors={colors} />
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
                                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{s.sales_count} ventes</Text>
                                </Card>
                            ))}
                        </>
                    )}

                    {detailed.users_by_country && (
                        <>
                            <SectionHeader title="Répartition par pays" colors={colors} />
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                                {Object.entries(detailed.users_by_country).map(([country, count]) => (
                                    <StatCard key={country} label={country} value={count} icon="globe" color="#3B82F6" colors={colors} />
                                ))}
                            </View>
                        </>
                    )}

                    {detailed.users_by_role && (
                        <>
                            <SectionHeader title="Utilisateurs par rôle" colors={colors} />
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
            <FilterBar filters={[{ id: 'all', label: 'Tous' }, { id: 'shopkeeper', label: 'Commerçants' }, { id: 'staff', label: 'Staff' }, { id: 'supplier', label: 'Fournisseurs' }, { id: 'superadmin', label: 'Admins' }]}
                active={roleFilter} onSelect={setRoleFilter} colors={colors} />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un utilisateur..." colors={colors} />
            <SectionHeader title="Utilisateurs" count={users.filter(u => roleFilter === 'all' || u.role === roleFilter).length} colors={colors} />
            {users.filter(u => (roleFilter === 'all' || u.role === roleFilter) && (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())))
                .map((u: any) => (
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
                                    {u.how_did_you_hear ? (
                                        <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>ℹ️ Source: {u.how_did_you_hear}</Text>
                                    ) : null}
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <Badge label={u.role || 'user'} color={roleColors[u.role] || '#6B7280'} />
                                <View style={{ flexDirection: 'row', gap: 4 }}>
                                    {u.is_phone_verified && <Badge label="✓ Tél" color="#10B981" />}
                                    <TouchableOpacity onPress={() => handleToggleUser(u)}>
                                        <Badge label={u.is_active === false ? '🔴 Banni' : '🟢 Actif'} color={u.is_active === false ? '#EF4444' : '#10B981'} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            <TouchableOpacity
                                onPress={() => { setSeg('comms'); setMsgTarget('specific'); setTargetUserId(u.user_id); }}
                                style={{ backgroundColor: '#3B82F622', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            >
                                <Ionicons name="chatbubble-ellipses" size={14} color="#3B82F6" />
                                <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '600' }}>Message</Text>
                            </TouchableOpacity>
                            {u.is_active !== false ? (
                                <TouchableOpacity onPress={() => { Alert.alert('Bannir cet utilisateur ?', `${u.name} ne pourra plus se connecter.`, [{ text: 'Annuler' }, { text: 'Bannir', style: 'destructive', onPress: () => handleToggleUser(u.user_id) }]); }}
                                    style={{ backgroundColor: '#EF444422', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="ban" size={14} color="#EF4444" />
                                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '600' }}>Bannir</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => handleToggleUser(u.user_id)}
                                    style={{ backgroundColor: '#10B98122', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                    <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600' }}>Réactiver</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </Card>
                ))}
            {users.length === 0 && <EmptyState icon="people-outline" message="Aucun utilisateur" colors={colors} />}
        </View>
    );

    const renderStores = () => (
        <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un magasin..." colors={colors} />
            <SectionHeader title="Magasins" count={stores.length} colors={colors} />
            {stores.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase())).map((s: any) => (
                <Card key={s.store_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="business" size={20} color="#8B5CF6" />
                            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{s.name}</Text>
                        </View>
                        <Text style={{ color: '#10B981', fontWeight: '700' }}>{fmtMoney(s.total_revenue, user?.currency)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>👤 {s.owner_name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>📦 {s.product_count} produits</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>🛒 {s.sales_count} ventes</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>{s.owner_email}</Text>
                </Card>
            ))}
            {stores.length === 0 && <EmptyState icon="business-outline" message="Aucun magasin" colors={colors} />}
        </View>
    );

    const renderStock = () => (
        <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." colors={colors} />
            <SectionHeader title="Produits" count={products.length} colors={colors} />
            {products.map((p: any) => {
                const stockColor = (p.quantity || 0) <= 5 ? '#EF4444' : (p.quantity || 0) <= 15 ? '#F59E0B' : '#10B981';
                return (
                    <Card key={p.product_id} colors={colors}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>{p.name}</Text>
                            <Badge label={`${p.quantity || 0} unités`} color={stockColor} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Prix: {fmtMoney(p.selling_price || p.sale_price || p.price || 0, user?.currency)}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{p.store_id ? `ID: ${p.store_id.slice(0, 8)}...` : ''}</Text>
                        </View>
                        {p.owner_info && (
                            <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.bgLight, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>Vendeur: {p.owner_info.name}</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>📧 {p.owner_info.email}</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>📞 {p.owner_info.phone || 'N/A'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <TouchableOpacity onPress={() => handleToggleProduct(p)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.is_active === false ? '#10B98122' : '#F59E0B22', alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name={p.is_active === false ? "eye" : "eye-off"} size={16} color={p.is_active === false ? '#10B981' : '#F59E0B'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteProduct(p)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF444422', alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="trash" size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </Card>
                );
            })}
            {products.length === 0 && <EmptyState icon="cube-outline" message="Aucun produit" colors={colors} />}
        </View>
    );

    const renderFinance = () => (
        <View>
            <SectionHeader title="Vue Financière" colors={colors} />
            {stats && (
                <LinearGradient colors={['#7C3AED', '#4F46E5']} style={{ borderRadius: 16, padding: 20, marginBottom: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Chiffre d'affaires total</Text>
                    <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 }}>{fmtMoney(stats.total_revenue, user?.currency)}</Text>
                    <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Ventes</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.sales}</Text></View>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Produits</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.products}</Text></View>
                        <View><Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Magasins</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{stats.stores}</Text></View>
                    </View>
                </LinearGradient>
            )}
            {detailed && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <StatCard label="Aujourd'hui" value={fmtMoney(detailed.revenue_today)} icon="today" color="#10B981" colors={colors} />
                    <StatCard label="Cette semaine" value={fmtMoney(detailed.revenue_week)} icon="calendar" color="#3B82F6" colors={colors} />
                    <StatCard label="Ce mois" value={fmtMoney(detailed.revenue_month)} icon="stats-chart" color="#8B5CF6" colors={colors} />
                </View>
            )}
        </View>
    );

    const renderCRM = () => (
        <View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un client..." colors={colors} />
            <SectionHeader title="Clients" count={customers.length} colors={colors} />
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
            {customers.length === 0 && <EmptyState icon="people-outline" message="Aucun client" colors={colors} />}
        </View>
    );

    const renderSupport = () => (
        <View>
            <FilterBar filters={[{ id: 'all', label: 'Tous' }, { id: 'open', label: 'Ouverts' }, { id: 'pending', label: 'En attente' }, { id: 'closed', label: 'Fermés' }]}
                active={ticketFilter} onSelect={setTicketFilter} colors={colors} />
            <SectionHeader title="Tickets" count={tickets.length} colors={colors} />
            {tickets.map((t: any) => (
                <Card key={t.ticket_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>{t.subject}</Text>
                        <Badge label={t.status} color={statusColors[t.status] || '#6B7280'} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t.user_name} • {new Date(t.created_at).toLocaleDateString('fr-FR')}</Text>
                    {t.messages?.length > 0 && <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{t.messages[t.messages.length - 1]?.content}</Text>}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        {t.status !== 'closed' && (
                            <>
                                <TouchableOpacity onPress={() => setReplyingTo(replyingTo === t.ticket_id ? null : t.ticket_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="chatbubble" size={14} color="#3B82F6" /><Text style={{ color: '#3B82F6', fontSize: 12 }}>Répondre</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleCloseTicket(t.ticket_id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" /><Text style={{ color: '#10B981', fontSize: 12 }}>Fermer</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                    {replyingTo === t.ticket_id && (
                        <View style={{ marginTop: 8, gap: 6 }}>
                            <TextInput value={replyText} onChangeText={setReplyText} placeholder="Votre réponse..." placeholderTextColor={colors.textMuted}
                                style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder }} multiline />
                            <TouchableOpacity onPress={() => handleReply(t.ticket_id, 'ticket')} style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Envoyer</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Card>
            ))}
            {tickets.length === 0 && <EmptyState icon="help-buoy-outline" message="Aucun ticket" colors={colors} />}
        </View>
    );

    const renderDisputes = () => (
        <View>
            <FilterBar filters={[{ id: 'all', label: 'Tous' }, { id: 'open', label: 'Ouverts' }, { id: 'investigating', label: 'En cours' }, { id: 'resolved', label: 'Résolus' }, { id: 'rejected', label: 'Rejetés' }]}
                active={disputeFilter} onSelect={setDisputeFilter} colors={colors} />
            {disputeStats && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatCard label="Ouverts" value={disputeStats.open} icon="alert-circle" color="#F59E0B" colors={colors} />
                    <StatCard label="En cours" value={disputeStats.investigating} icon="search" color="#3B82F6" colors={colors} />
                    <StatCard label="Résolus" value={disputeStats.resolved} icon="checkmark-circle" color="#10B981" colors={colors} />
                </View>
            )}
            <SectionHeader title="Litiges" count={disputes.length} colors={colors} />
            {disputes.map((d: any) => (
                <Card key={d.dispute_id} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>{d.subject}</Text>
                        <Badge label={d.status} color={statusColors[d.status] || '#6B7280'} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{d.reporter_name} ({d.reporter_id}) • Type: {d.type}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{d.description}</Text>

                    {d.resolution && (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}>
                            <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>RÉSOLUTION :</Text>
                            <Text style={{ color: colors.text, fontSize: 12 }}>{d.resolution}</Text>
                        </View>
                    )}
                    {d.admin_notes && (
                        <View style={{ marginTop: 4, padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>NOTES ADMIN :</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{d.admin_notes}</Text>
                        </View>
                    )}

                    {d.status !== 'resolved' && d.status !== 'rejected' && (
                        <View style={{ marginTop: 12, gap: 8 }}>
                            <TextInput
                                value={disputeResolution}
                                onChangeText={setDisputeResolution}
                                placeholder="Résolution (facultatif)..."
                                placeholderTextColor={colors.textMuted}
                                style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder }}
                                multiline
                            />
                            <TextInput
                                value={disputeNotes}
                                onChangeText={setDisputeNotes}
                                placeholder="Notes administratives..."
                                placeholderTextColor={colors.textMuted}
                                style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder }}
                                multiline
                            />
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                <TouchableOpacity onPress={() => handleUpdateDisputeStatus(d.dispute_id, 'investigating')} style={{ backgroundColor: '#3B82F622', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="search" size={14} color="#3B82F6" />
                                    <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '600' }}>Enquêter</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleUpdateDisputeStatus(d.dispute_id, 'resolved')} style={{ backgroundColor: '#10B98122', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                    <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>Résoudre</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleUpdateDisputeStatus(d.dispute_id, 'rejected')} style={{ backgroundColor: '#EF444422', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Rejeter</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Card>
            ))}
            {disputes.length === 0 && <EmptyState icon="warning-outline" message="Aucun litige" colors={colors} />}
        </View>
    );

    const renderComms = () => (
        <View>
            <SectionHeader title="Nouveau Message" colors={colors} />
            <Card colors={colors}>
                <TextInput value={msgTitle} onChangeText={setMsgTitle} placeholder="Titre du message" placeholderTextColor={colors.textMuted}
                    style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, marginBottom: 8 }} />
                <TextInput value={msgContent} onChangeText={setMsgContent} placeholder="Contenu du message..." placeholderTextColor={colors.textMuted}
                    style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, minHeight: 80, marginBottom: 8 }} multiline />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Cible:</Text>
                <FilterBar filters={[{ id: 'all', label: 'Tous' }, { id: 'shopkeeper', label: 'Commerçants' }, { id: 'supplier', label: 'Fournisseurs' }, { id: 'specific', label: 'Spécifique' }]} active={msgTarget} onSelect={setMsgTarget} colors={colors} />

                {msgTarget === 'specific' && (
                    <TextInput
                        value={targetUserId}
                        onChangeText={setTargetUserId}
                        placeholder="ID Utilisateur (ex: user_...)"
                        placeholderTextColor={colors.textMuted}
                        style={{ backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, color: colors.text, borderWidth: 1, borderColor: colors.glassBorder, marginTop: 8, marginBottom: 8 }}
                    />
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity onPress={handleSendMessage} style={{ flex: 1, backgroundColor: '#3B82F6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>📨 Envoyer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleBroadcast} style={{ flex: 1, backgroundColor: '#8B5CF6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>📢 Diffuser</Text>
                    </TouchableOpacity>
                </View>
            </Card>
            <SectionHeader title="Historique" count={messages.length} colors={colors} />
            {messages.map((m: any, i: number) => (
                <Card key={m.message_id || i} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{m.title}</Text>
                        <Badge label={m.type} color={m.type === 'broadcast' ? '#8B5CF6' : '#3B82F6'} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={2}>{m.content}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>→ {m.target} • {m.sent_by} • {new Date(m.sent_at).toLocaleDateString('fr-FR')}</Text>
                </Card>
            ))}
            {messages.length === 0 && <EmptyState icon="megaphone-outline" message="Aucun message envoyé" colors={colors} />}
        </View>
    );

    const renderSecurity = () => (
        <View>
            {secStats && (
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatCard label="Échecs 24h" value={secStats.failed_logins_24h} icon="close-circle" color="#EF4444" colors={colors} />
                    <StatCard label="Connexions 24h" value={secStats.successful_logins_24h} icon="checkmark-circle" color="#10B981" colors={colors} />
                    <StatCard label="Bloqués" value={secStats.blocked_users} icon="lock-closed" color="#F59E0B" colors={colors} />
                </View>
            )}
            <FilterBar filters={[{ id: 'all', label: 'Tous' }, { id: 'login_success', label: 'Connexions' }, { id: 'login_failed', label: 'Échecs' }, { id: 'password_changed', label: 'MDP changé' }]}
                active={secFilter} onSelect={setSecFilter} colors={colors} />
            <SectionHeader title="Événements" count={secEvents.length} colors={colors} />
            {secEvents.map((e: any, i: number) => {
                const eColor = e.type === 'login_failed' ? '#EF4444' : e.type === 'login_success' ? '#10B981' : '#F59E0B';
                return (
                    <Card key={e.event_id || i} colors={colors}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name={e.type === 'login_failed' ? 'close-circle' : 'shield-checkmark'} size={18} color={eColor} />
                                <Text style={{ color: colors.text, fontWeight: '600' }}>{e.type}</Text>
                            </View>
                            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(e.created_at).toLocaleString('fr-FR')}</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{e.user_email || e.details}</Text>
                    </Card>
                );
            })}
            {secEvents.length === 0 && <EmptyState icon="shield-outline" message="Aucun événement" colors={colors} />}
        </View>
    );

    const renderLogs = () => (
        <View>
            <FilterBar filters={[{ id: 'all', label: 'Tous' }, { id: 'stock', label: 'Stock' }, { id: 'auth', label: 'Auth' }, { id: 'crm', label: 'CRM' }, { id: 'pos', label: 'POS' }, { id: 'broadcast', label: 'Diffusion' }]}
                active={logModule} onSelect={setLogModule} colors={colors} />
            <SectionHeader title="Logs" count={logs.length} colors={colors} />
            {logs.map((l: any, i: number) => (
                <Card key={l.log_id || i} colors={colors}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: moduleColors[l.module] || '#6B7280' }} />
                            <Badge label={l.module || '?'} color={moduleColors[l.module] || '#6B7280'} />
                        </View>
                        <Text style={{ color: colors.textMuted, fontSize: 10 }}>{new Date(l.created_at).toLocaleString('fr-FR')}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{l.description || l.action}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{l.user_name}</Text>
                </Card>
            ))}
            {logs.length === 0 && <EmptyState icon="list-outline" message="Aucun log" colors={colors} />}
        </View>
    );

    const renderSettings = () => (
        <View>
            <SectionHeader title="Configuration" colors={colors} />
            <Card colors={colors}>
                <View style={{ gap: 16 }}>
                    {[
                        { label: 'Version de l\'app', value: health?.version || '1.0.0', icon: 'information-circle' },
                        { label: 'Statut du serveur', value: health?.status || 'inconnu', icon: 'server' },
                        { label: 'Base de données', value: health?.database || 'inconnu', icon: 'hardware-chip' },
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
            <SectionHeader title="Actions" colors={colors} />
            <View style={{ gap: 8 }}>
                <TouchableOpacity onPress={() => setShowPwdModal(true)} style={{ backgroundColor: '#F59E0B22', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#F59E0B44' }}>
                    <Ionicons name="key" size={20} color="#F59E0B" />
                    <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 15 }}>Changer le mot de passe</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/(admin)/data-explorer')} style={{ backgroundColor: '#8B5CF622', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#8B5CF644' }}>
                    <Ionicons name="server" size={20} color="#8B5CF6" />
                    <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 15 }}>📊 Explorateur de Données (MongoDB)</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { logout(); router.replace('/(auth)/login' as any); }} style={{ backgroundColor: '#EF444422', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#EF444444' }}>
                    <Ionicons name="log-out" size={20} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>Déconnexion</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const handleSaveCGU = async () => {
        try {
            setCguUpdating(true);
            await admin.updateCGU(cguContent);
            Alert.alert('Succès', 'Les CGU ont été mises à jour.');
        } catch (err) {
            Alert.alert('Erreur', 'Impossible de mettre à jour les CGU.');
        } finally {
            setCguUpdating(false);
        }
    };

    const renderCGU = () => (
        <View style={{ gap: 16 }}>
            <SectionHeader title="Éditeur de CGU" colors={colors} />
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
                Modifiez le contenu Markdown ci-dessous. Le changement sera immédiat pour tous les utilisateurs.
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
                    placeholder="Contenu Markdown des CGU..."
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
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sauvegarder les CGU</Text>
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
                <Text style={{ color: colors.text, fontWeight: '600' }}>Prévisualiser comme Utilisateur</Text>
            </TouchableOpacity>
        </View>
    );

    const handleSavePrivacy = async () => {
        try {
            setPrivacyUpdating(true);
            await admin.updatePrivacy(privacyContent);
            Alert.alert('Succès', 'La politique de confidentialité a été mise à jour.');
        } catch (err) {
            Alert.alert('Erreur', 'Impossible de mettre à jour la politique de confidentialité.');
        } finally {
            setPrivacyUpdating(false);
        }
    };

    const renderPrivacy = () => (
        <View style={{ gap: 16 }}>
            <SectionHeader title="Éditeur de Politique de Confidentialité" colors={colors} />
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>
                Modifiez le contenu Markdown ci-dessous. Le changement sera immédiat pour tous les utilisateurs.
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
                    placeholder="Contenu Markdown de la Politique de Confidentialité..."
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
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sauvegarder la Politique</Text>
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
                <Text style={{ color: colors.text, fontWeight: '600' }}>Prévisualiser comme Utilisateur</Text>
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
                            <Text style={st.headerTitle}>Stockman Console</Text>
                            <Text style={st.headerSub}>{user?.email}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity onPress={onRefresh} style={st.headerBtn}>
                                <Ionicons name="refresh" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { logout(); router.replace('/(auth)/login' as any); }} style={st.headerBtn}>
                                <Ionicons name="log-out" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {stats && (
                        <View style={st.quickStats}>
                            {[
                                { l: 'Users', v: fmt(stats.users), c: '#3B82F6' },
                                { l: 'Magasins', v: fmt(stats.stores), c: '#8B5CF6' },
                                { l: 'Produits', v: fmt(stats.products), c: '#10B981' },
                                { l: 'Ventes', v: fmt(stats.sales), c: '#F59E0B' },
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

            {/* Segments */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[st.segScroll, { borderBottomColor: colors.divider }]} contentContainerStyle={st.segContainer}>
                {SEGMENTS.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => { setSeg(s.id); setSearch(''); }} style={[st.segBtn, seg === s.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                        <Ionicons name={s.icon as any} size={16} color={seg === s.id ? colors.primary : colors.textMuted} />
                        <Text style={[st.segLabel, { color: seg === s.id ? colors.primary : colors.textMuted }]}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content */}
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
