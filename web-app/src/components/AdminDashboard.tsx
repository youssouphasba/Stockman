'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Shield,
    Activity,
    Users,
    Store,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    TrendingUp,
    Globe,
    Search,
    ChevronRight,
    MessageSquare,
    Lock,
    Unlock,
    Trash2
} from 'lucide-react';
import { admin as adminApi } from '../services/api';

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'stores' | 'disputes'>('overview');
    const [health, setHealth] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [healthRes, statsRes] = await Promise.all([
                adminApi.getHealth(),
                adminApi.getDetailedStats()
            ]);
            setHealth(healthRes);
            setStats(statsRes);
        } catch (err) {
            console.error("Admin data load error", err);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setRefreshing(true);
        try {
            const data = await adminApi.listUsers();
            setUsers(data);
        } finally {
            setRefreshing(false);
        }
    };

    const loadStores = async () => {
        setRefreshing(true);
        try {
            const data = await adminApi.listStores();
            setStores(Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (activeSection === 'users') loadUsers();
        if (activeSection === 'stores') loadStores();
    }, [activeSection]);

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Backoffice Admin</h1>
                    <p className="text-slate-400">Supervision globale du système Stockman.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${health?.status === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                        <Activity size={18} />
                        <span className="text-sm font-bold uppercase tracking-widest">Système : {health?.status === 'ok' ? 'Operationnel' : 'Erreur'}</span>
                    </div>
                    <button onClick={loadInitialData} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                {[
                    { id: 'overview', icon: TrendingUp, label: 'Vue d\'ensemble' },
                    { id: 'users', icon: Users, label: 'Utilisateurs' },
                    { id: 'stores', icon: Store, label: 'Boutiques' },
                    { id: 'disputes', icon: MessageSquare, label: 'Litiges' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as any)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap border ${activeSection === tab.id
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSection === 'overview' && (
                <div className="space-y-8">
                    {/* Key Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Utilisateurs Totaux</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-white">{stats?.users_by_role?.shopkeeper || 0}</span>
                                <div className="p-3 rounded-xl bg-primary/10 text-primary"><Users size={24} /></div>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Revenue Today</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-emerald-500">{stats?.revenue_today || 0} F</span>
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500"><TrendingUp size={24} /></div>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tickets Ouverts</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-amber-500">{stats?.open_tickets || 0}</span>
                                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500"><AlertCircle size={24} /></div>
                            </div>
                        </div>
                        <div className="glass-card p-6 flex flex-col gap-2">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pays Couverts</span>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-blue-400">{Object.keys(stats?.users_by_country || {}).length}</span>
                                <div className="p-3 rounded-xl bg-blue-400/10 text-blue-400"><Globe size={24} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Geography & Roles */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Globe size={20} className="text-primary" /> Distribution Géographique
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(stats?.users_by_country || {}).map(([country, count]: [string, any]) => (
                                    <div key={country} className="flex items-center gap-4">
                                        <span className="text-slate-400 w-12 text-sm font-bold">{country}</span>
                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${(count / (stats?.users_by_role?.shopkeeper || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-white font-bold text-sm w-8 text-right">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Shield size={20} className="text-primary" /> Rôles Utilisateurs
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(stats?.users_by_role || {}).map(([role, count]: [string, any]) => (
                                    <div key={role} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 uppercase font-black">{role}</span>
                                        <span className="text-2xl font-bold text-white">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'users' && (
                <div className="glass-card overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h3 className="text-lg font-bold text-white">Gestion Utilisateurs</h3>
                        <div className="flex gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4">Utilisateur</th>
                                    <th className="px-6 py-4">Rôle</th>
                                    <th className="px-6 py-4">Pays</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {(Array.isArray(users) ? users : []).map(user => (
                                    <tr key={user.user_id} className="hover:bg-white/5 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                    {user.name?.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold">{user.name}</span>
                                                    <span className="text-[10px] text-slate-500">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-300 capitalize">{user.role}</td>
                                        <td className="px-6 py-4 text-slate-400 font-mono">{user.country_code || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${user.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`}>
                                                {user.is_active ? 'Actif' : 'Banni'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all">
                                                <Lock size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSection === 'disputes' && (
                <div className="glass-card p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                    <MessageSquare size={64} className="opacity-10" />
                    <p>Aucun litige en attente. Félicitations !</p>
                </div>
            )}
        </div>
    );
}
