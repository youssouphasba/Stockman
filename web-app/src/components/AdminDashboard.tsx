'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield, Activity, Users, Store, AlertCircle, CheckCircle2,
    RefreshCw, TrendingUp, Globe, Search, MessageSquare,
    Lock, Unlock, Trash2, Crown, Clock, Package,
    BarChart2, Zap, Bell, ChevronDown, X
} from 'lucide-react';
import { admin as adminApi } from '../services/api';

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: any; icon: any; color: string; sub?: string }) {
    return (
        <div className="glass-card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
            <span className="text-3xl font-black text-white">{value}</span>
            {sub && <span className="text-xs text-slate-500">{sub}</span>}
        </div>
    );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-rose-950 border-rose-500/30 text-rose-300'}`}>
            {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
    );
}

const PLAN_COLORS: Record<string, string> = {
    enterprise: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    pro: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    starter: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    trial: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export default function AdminDashboard() {
    const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'stores' | 'disputes' | 'security' | 'broadcast' | 'support'>('overview');
    const [health, setHealth] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [disputes, setDisputes] = useState<any[]>([]);
    const [disputeFilter, setDisputeFilter] = useState<'all' | 'open' | 'resolved'>('all');
    const [securityEvents, setSecurityEvents] = useState<any[]>([]);
    const [securityStats, setSecurityStats] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [replyTicketId, setReplyTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [replying, setReplying] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [togglingUser, setTogglingUser] = useState<string | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    useEffect(() => { loadInitialData(); }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [healthRes, statsRes] = await Promise.all([
                adminApi.getHealth(),
                adminApi.getDetailedStats(),
            ]);
            setHealth(healthRes);
            setStats(statsRes);
        } catch (err) {
            console.error('Admin data load error', err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setRefreshing(true);
        try { setUsers(await adminApi.listUsers()); }
        finally { setRefreshing(false); }
    };

    const loadStores = async () => {
        setRefreshing(true);
        try {
            const data = await adminApi.listStores();
            setStores(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
        } finally { setRefreshing(false); }
    };

    const loadDisputes = async () => {
        setRefreshing(true);
        try {
            const data = await adminApi.listDisputes();
            setDisputes(data?.items || []);
        } finally { setRefreshing(false); }
    };

    const loadSecurity = async () => {
        setRefreshing(true);
        try {
            const [eventsRes, statsRes] = await Promise.all([
                adminApi.listSecurityEvents(),
                adminApi.getSecurityStats(),
            ]);
            setSecurityEvents(eventsRes?.items || []);
            setSecurityStats(statsRes);
        } finally { setRefreshing(false); }
    };

    const loadTickets = async () => {
        setRefreshing(true);
        try { setTickets(await adminApi.listTickets() || []); }
        finally { setRefreshing(false); }
    };

    useEffect(() => {
        if (activeSection === 'users') loadUsers();
        if (activeSection === 'stores') loadStores();
        if (activeSection === 'disputes') loadDisputes();
        if (activeSection === 'security') loadSecurity();
        if (activeSection === 'support') loadTickets();
    }, [activeSection]);

    const handleToggleUser = async (userId: string, currentStatus: boolean) => {
        setTogglingUser(userId);
        try {
            await adminApi.toggleUser(userId);
            setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !currentStatus } : u));
            showToast(currentStatus ? 'Utilisateur banni.' : 'Utilisateur réactivé.');
        } catch {
            showToast('Erreur lors de la modification.', 'error');
        } finally {
            setTogglingUser(null);
        }
    };

    const handleReplyTicket = async () => {
        if (!replyTicketId || !replyContent.trim()) return;
        setReplying(true);
        try {
            await adminApi.replyTicket(replyTicketId, replyContent.trim());
            setReplyTicketId(null);
            setReplyContent('');
            loadTickets();
            showToast('Réponse envoyée.');
        } catch {
            showToast('Erreur lors de l\'envoi.', 'error');
        } finally {
            setReplying(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!userSearch.trim()) return users;
        const q = userSearch.toLowerCase();
        return users.filter(u =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.country_code?.toLowerCase().includes(q) ||
            u.plan?.toLowerCase().includes(q)
        );
    }, [users, userSearch]);

    const filteredDisputes = useMemo(() => {
        if (disputeFilter === 'all') return disputes;
        return disputes.filter(d => disputeFilter === 'open' ? d.status === 'open' : d.status !== 'open');
    }, [disputes, disputeFilter]);

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const tabs = [
        { id: 'overview', icon: TrendingUp, label: 'Vue d\'ensemble' },
        { id: 'users', icon: Users, label: 'Utilisateurs' },
        { id: 'stores', icon: Store, label: 'Boutiques' },
        { id: 'disputes', icon: AlertCircle, label: 'Litiges' },
        { id: 'security', icon: Shield, label: 'Sécurité' },
        { id: 'support', icon: MessageSquare, label: 'Support' },
        { id: 'broadcast', icon: Bell, label: 'Broadcast' },
    ];

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter">Backoffice Admin</h1>
                    <p className="text-slate-400 text-sm">Supervision globale du système Stockman.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold uppercase tracking-widest ${health?.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                        <Activity size={16} />
                        {health?.status === 'ok' ? 'Opérationnel' : 'Erreur'}
                    </div>
                    <button onClick={loadInitialData} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {/* Nav Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${activeSection === tab.id ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW ── */}
            {activeSection === 'overview' && (
                <div className="space-y-8">
                    {/* KPI Row 1 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Shopkeepers" value={stats?.users_by_role?.shopkeeper || 0} icon={Users} color="bg-primary" sub={`+${stats?.signups_today || 0} aujourd'hui`} />
                        <StatCard label="CA Global (30j)" value={`${(stats?.revenue_month || 0).toLocaleString()} F`} icon={TrendingUp} color="bg-emerald-500" sub={`Aujourd'hui : ${(stats?.revenue_today || 0).toLocaleString()} F`} />
                        <StatCard label="Tickets Ouverts" value={stats?.open_tickets || 0} icon={MessageSquare} color="bg-amber-500" />
                        <StatCard label="Pays Couverts" value={Object.keys(stats?.users_by_country || {}).length} icon={Globe} color="bg-blue-400" sub={`${stats?.recent_signups || 0} inscrits (7j)`} />
                    </div>

                    {/* KPI Row 2 — Plans & Trials */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Enterprise" value={stats?.users_by_plan?.enterprise || 0} icon={Crown} color="bg-purple-500" />
                        <StatCard label="Pro" value={stats?.users_by_plan?.pro || 0} icon={Zap} color="bg-blue-500" />
                        <StatCard label="Starter" value={stats?.users_by_plan?.starter || 0} icon={Package} color="bg-emerald-500" />
                        <StatCard
                            label="Trials expirant (7j)"
                            value={stats?.trials_expiring_soon || 0}
                            icon={Clock}
                            color={stats?.trials_expiring_soon > 0 ? 'bg-rose-500' : 'bg-slate-500'}
                            sub="Relance recommandée"
                        />
                    </div>

                    {/* Géographie + Top Boutiques */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white mb-5 flex items-center gap-2 uppercase tracking-tighter">
                                <Globe size={18} className="text-primary" /> Distribution Géographique
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(stats?.users_by_country || {})
                                    .sort(([, a]: any, [, b]: any) => b - a)
                                    .map(([country, count]: [string, any]) => (
                                        <div key={country} className="flex items-center gap-3">
                                            <span className="text-slate-400 w-10 text-sm font-bold font-mono">{country || '??'}</span>
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / Math.max(...Object.values(stats.users_by_country) as number[])) * 100}%` }} />
                                            </div>
                                            <span className="text-white font-black text-sm w-6 text-right">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-base font-black text-white mb-5 flex items-center gap-2 uppercase tracking-tighter">
                                <BarChart2 size={18} className="text-primary" /> Top Boutiques (CA)
                            </h3>
                            {(stats?.top_stores || []).length > 0 ? (
                                <div className="space-y-3">
                                    {stats.top_stores.map((s: any, i: number) => (
                                        <div key={s.store_id} className="flex items-center gap-3">
                                            <span className="text-slate-600 font-black text-sm w-5">#{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{s.name}</p>
                                                <p className="text-slate-500 text-xs">{s.sales_count} ventes</p>
                                            </div>
                                            <span className="text-emerald-400 font-black text-sm">{s.revenue.toLocaleString()} F</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-600 text-sm text-center py-8">Aucune donnée de vente</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── USERS ── */}
            {activeSection === 'users' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/5">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">
                            Utilisateurs {refreshing ? '' : `(${filteredUsers.length})`}
                        </h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                            <input
                                type="text"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                placeholder="Nom, email, pays, plan…"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
                            />
                            {userSearch && (
                                <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Utilisateur</th>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Pays</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {filteredUsers.map(user => (
                                    <tr key={user.user_id} className="hover:bg-white/5 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                                                    {user.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{user.name}</p>
                                                    <p className="text-[10px] text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${PLAN_COLORS[user.plan] || PLAN_COLORS.starter}`}>
                                                {user.plan || 'starter'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{user.country_code || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${user.is_active !== false ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                {user.is_active !== false ? 'Actif' : 'Banni'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleToggleUser(user.user_id, user.is_active !== false)}
                                                disabled={togglingUser === user.user_id}
                                                className={`p-2 rounded-lg transition-all ${user.is_active !== false ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'} disabled:opacity-40`}
                                                title={user.is_active !== false ? 'Bannir' : 'Réactiver'}
                                            >
                                                {togglingUser === user.user_id
                                                    ? <RefreshCw size={15} className="animate-spin" />
                                                    : user.is_active !== false ? <Lock size={15} /> : <Unlock size={15} />
                                                }
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-600">Aucun utilisateur trouvé</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── STORES ── */}
            {activeSection === 'stores' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">
                            Boutiques {refreshing ? '' : `(${stores.length})`}
                        </h3>
                        <button onClick={loadStores} className="p-2 text-slate-400 hover:text-white transition-all">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Boutique</th>
                                    <th className="px-6 py-4">Propriétaire</th>
                                    <th className="px-6 py-4">Pays</th>
                                    <th className="px-6 py-4">Produits</th>
                                    <th className="px-6 py-4">CA Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {stores.map((store: any) => (
                                    <tr key={store.store_id} className="hover:bg-white/5 transition-all">
                                        <td className="px-6 py-4">
                                            <p className="text-white font-bold">{store.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{store.store_id?.slice(-8)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">{store.owner_name || '—'}</td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">{store.country_code || '—'}</td>
                                        <td className="px-6 py-4 text-white font-bold">{store.product_count ?? '—'}</td>
                                        <td className="px-6 py-4 text-emerald-400 font-black">{store.total_revenue != null ? `${store.total_revenue.toLocaleString()} F` : '—'}</td>
                                    </tr>
                                ))}
                                {stores.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-600">Aucune boutique</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── DISPUTES ── */}
            {activeSection === 'disputes' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">Litiges ({filteredDisputes.length})</h3>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                            {(['all', 'open', 'resolved'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setDisputeFilter(f)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${disputeFilter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Résolus'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {filteredDisputes.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">Sujet</th>
                                        <th className="px-6 py-4">Utilisateur</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Statut</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {filteredDisputes.map((dispute: any) => (
                                        <tr key={dispute.id} className="hover:bg-white/5 transition-all">
                                            <td className="px-6 py-4 text-white font-bold">{dispute.subject}</td>
                                            <td className="px-6 py-4 text-slate-400">{dispute.user_name}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{new Date(dispute.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${dispute.status === 'open' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                    {dispute.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-primary hover:underline font-black text-xs uppercase tracking-widest">Gérer</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-20 text-center text-slate-600 flex flex-col items-center gap-4">
                                <CheckCircle2 size={48} className="opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Aucun litige {disputeFilter !== 'all' ? `(${disputeFilter})` : ''}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── SECURITY ── */}
            {activeSection === 'security' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Échecs Connexion (24h)" value={securityStats?.failed_logins_24h || 0} icon={Shield} color="bg-rose-500" />
                        <StatCard label="Connexions Réussies" value={securityStats?.successful_logins_24h || 0} icon={CheckCircle2} color="bg-emerald-500" />
                        <StatCard label="Changements MDP (7j)" value={securityStats?.password_changes_7d || 0} icon={Lock} color="bg-amber-500" />
                        <StatCard label="Utilisateurs Bloqués" value={securityStats?.blocked_users || 0} icon={Trash2} color="bg-primary" />
                    </div>
                    <div className="glass-card overflow-hidden">
                        <div className="p-5 border-b border-white/5 bg-white/5">
                            <h3 className="text-base font-black text-white uppercase tracking-tighter">Événements Récents</h3>
                        </div>
                        <table className="w-full text-left">
                            <tbody className="divide-y divide-white/5">
                                {securityEvents.length > 0 ? securityEvents.map((event: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-white/5">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${event.type?.includes('failed') ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                                <span className="text-white font-bold text-xs uppercase tracking-widest">{event.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs font-mono">{event.ip_address}</td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">{new Date(event.created_at).toLocaleString()}</td>
                                    </tr>
                                )) : (
                                    <tr><td className="p-10 text-center text-slate-600 text-sm">Aucun événement suspect.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── SUPPORT ── */}
            {activeSection === 'support' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">Support Client ({tickets.length})</h3>
                        <button onClick={loadTickets} className="p-2 text-slate-400 hover:text-white transition-all">
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="divide-y divide-white/5">
                        {tickets.length > 0 ? tickets.map((ticket: any) => (
                            <div key={ticket.ticket_id}>
                                <div className="p-5 hover:bg-white/5 transition-all flex justify-between items-center group">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${ticket.status === 'open' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            <h4 className="text-white font-bold">{ticket.subject}</h4>
                                        </div>
                                        <p className="text-xs text-slate-500">De <span className="text-slate-400 font-semibold">{ticket.user_name}</span> • {new Date(ticket.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => { setReplyTicketId(replyTicketId === ticket.ticket_id ? null : ticket.ticket_id); setReplyContent(''); }}
                                        className={`px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${replyTicketId === ticket.ticket_id ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-primary hover:text-white hover:border-primary'}`}
                                    >
                                        Répondre
                                    </button>
                                </div>
                                {replyTicketId === ticket.ticket_id && (
                                    <div className="px-5 pb-4 flex gap-3 animate-in slide-in-from-top-2 duration-200">
                                        <input
                                            type="text"
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleReplyTicket()}
                                            placeholder="Votre réponse…"
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleReplyTicket}
                                            disabled={replying || !replyContent.trim()}
                                            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-primary/80 transition-all"
                                        >
                                            {replying ? '…' : 'Envoyer'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="p-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs opacity-40">Tous les tickets sont résolus ✓</div>
                        )}
                    </div>
                </div>
            )}

            {/* ── BROADCAST ── */}
            {activeSection === 'broadcast' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-card p-8 bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-center gap-3 mb-8">
                            <Bell size={28} className="text-primary" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Diffusion Globale</h3>
                        </div>
                        <div className="space-y-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Titre</label>
                                <input
                                    type="text"
                                    value={broadcastForm.title}
                                    onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all"
                                    placeholder="Ex: Nouvelle mise à jour disponible !"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message</label>
                                <textarea
                                    value={broadcastForm.message}
                                    onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                                    rows={5}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                                    placeholder="Contenu du message…"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    if (!broadcastForm.message.trim()) return;
                                    setSaving(true);
                                    try {
                                        await adminApi.broadcast(broadcastForm.message, broadcastForm.title);
                                        showToast('Message diffusé à tous les utilisateurs.');
                                        setBroadcastForm({ title: '', message: '' });
                                    } catch {
                                        showToast('Erreur lors de la diffusion.', 'error');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving || !broadcastForm.message.trim()}
                                className="w-full py-4 rounded-xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Envoi en cours…' : 'Diffuser à tous les utilisateurs'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
                            <h4 className="text-amber-400 font-black uppercase tracking-widest text-xs mb-3">⚠ Attention</h4>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Les messages seront envoyés instantanément à <strong className="text-white">tous les utilisateurs</strong> (Shopkeepers et Suppliers) via push notification. Vérifiez le contenu avant d'envoyer.
                            </p>
                        </div>
                        <div className="glass-card p-6">
                            <h4 className="text-slate-400 font-black uppercase tracking-widest text-xs mb-4">Aperçu mobile</h4>
                            <div className="bg-[#020617] rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center gap-3 min-h-[180px]">
                                <Bell size={24} className="text-primary" />
                                <p className="text-white font-black text-sm">{broadcastForm.title || 'Titre du message'}</p>
                                <p className="text-slate-500 text-xs px-4 leading-relaxed">{broadcastForm.message || 'Le contenu apparaîtra ici.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
