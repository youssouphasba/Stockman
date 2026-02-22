'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Store,
    TrendingUp,
    ShoppingCart,
    Package,
    AlertTriangle,
    RefreshCw,
    Plus,
    MapPin,
    BarChart2,
    ArrowRight,
    Check,
} from 'lucide-react';
import { stores as storesApi, auth as authApi } from '../services/api';

interface StoreStats {
    store_id: string;
    store_name: string;
    address?: string;
    revenue: number;
    orders: number;
    products_count: number;
    low_stock_count: number;
}

interface ConsolidatedStats {
    stores: StoreStats[];
    total_revenue: number;
    total_orders: number;
    days: number;
}

function formatCurrency(amount: number, currency = 'XOF') {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
    }
}

export default function MultiStoreDashboard() {
    const [stats, setStats] = useState<ConsolidatedStats | null>(null);
    const [storeList, setStoreList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [user, setUser] = useState<any>(null);
    const [switching, setSwitching] = useState<string | null>(null);
    const [showNewStore, setShowNewStore] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreAddress, setNewStoreAddress] = useState('');
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, storesRes, userRes] = await Promise.all([
                storesApi.getConsolidatedStats(days),
                storesApi.list(),
                authApi.me(),
            ]);
            setStats(statsRes);
            setStoreList(storesRes || []);
            setUser(userRes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { load(); }, [load]);

    const handleSwitch = async (storeId: string) => {
        setSwitching(storeId);
        try {
            await storesApi.setActive(storeId);
            window.location.reload();
        } catch (err) {
            console.error(err);
            setSwitching(null);
        }
    };

    const handleCreateStore = async () => {
        if (!newStoreName.trim()) return;
        setCreating(true);
        try {
            await storesApi.create({ name: newStoreName.trim(), address: newStoreAddress.trim() || undefined });
            setShowNewStore(false);
            setNewStoreName('');
            setNewStoreAddress('');
            load();
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const maxRevenue = stats ? Math.max(...stats.stores.map(s => s.revenue), 1) : 1;

    const PERIOD_OPTIONS = [
        { label: '7j', value: 7 },
        { label: '30j', value: 30 },
        { label: '90j', value: 90 },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw size={28} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <Store size={24} className="text-primary" />
                        Vue Multi-Boutiques
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Consolidé sur toutes vos boutiques</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        {PERIOD_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setDays(opt.value)}
                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${days === opt.value ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowNewStore(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus size={16} /> Nouvelle boutique
                    </button>
                </div>
            </div>

            {/* Global KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Boutiques</span>
                        <Store size={18} className="text-primary" />
                    </div>
                    <span className="text-3xl font-black text-white">{stats?.stores.length ?? 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">CA Total</span>
                        <TrendingUp size={18} className="text-emerald-400" />
                    </div>
                    <span className="text-2xl font-black text-white">{formatCurrency(stats?.total_revenue ?? 0, user?.currency)}</span>
                    <p className="text-[10px] text-slate-500 mt-1">{days} derniers jours</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Commandes</span>
                        <ShoppingCart size={18} className="text-blue-400" />
                    </div>
                    <span className="text-3xl font-black text-white">{stats?.total_orders ?? 0}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Stock Bas</span>
                        <AlertTriangle size={18} className="text-amber-400" />
                    </div>
                    <span className="text-3xl font-black text-amber-400">
                        {stats?.stores.reduce((sum, s) => sum + s.low_stock_count, 0) ?? 0}
                    </span>
                </div>
            </div>

            {/* Per-store comparison */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                    <BarChart2 size={18} className="text-primary" />
                    <h2 className="font-black text-white text-sm uppercase tracking-wider">Performance par Boutique</h2>
                </div>

                <div className="divide-y divide-white/5">
                    {(stats?.stores ?? []).length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Store size={40} className="mx-auto mb-3 opacity-30" />
                            <p>Aucune boutique trouvée</p>
                        </div>
                    ) : (
                        (stats?.stores ?? []).map((store) => {
                            const isActive = user?.active_store_id === store.store_id;
                            const revenueBar = maxRevenue > 0 ? (store.revenue / maxRevenue) * 100 : 0;
                            return (
                                <div key={store.store_id} className={`px-6 py-5 hover:bg-white/5 transition-colors ${isActive ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Store info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-black text-white">{store.store_name}</span>
                                                {isActive && (
                                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">Active</span>
                                                )}
                                            </div>
                                            {store.address && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <MapPin size={11} /> {store.address}
                                                </div>
                                            )}
                                        </div>

                                        {/* KPIs */}
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="text-center">
                                                <div className="font-black text-emerald-400">{formatCurrency(store.revenue, user?.currency)}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">CA</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-black text-white">{store.orders}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Ventes</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-black text-white">{store.products_count}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Produits</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`font-black ${store.low_stock_count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{store.low_stock_count}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Stock bas</div>
                                            </div>
                                        </div>

                                        {/* Switch button */}
                                        <button
                                            onClick={() => !isActive && handleSwitch(store.store_id)}
                                            disabled={isActive || switching === store.store_id}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isActive
                                                    ? 'bg-primary/10 text-primary cursor-default'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                                            }`}
                                        >
                                            {isActive ? <><Check size={12} /> Actuelle</> :
                                             switching === store.store_id ? <RefreshCw size={12} className="animate-spin" /> :
                                             <><ArrowRight size={12} /> Basculer</>}
                                        </button>
                                    </div>

                                    {/* Revenue bar */}
                                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                                            style={{ width: `${revenueBar}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Create store modal */}
            {showNewStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-white mb-4">Nouvelle Boutique</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                                placeholder="Nom de la boutique *"
                                value={newStoreName}
                                onChange={e => setNewStoreName(e.target.value)}
                                autoFocus
                            />
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                                placeholder="Adresse (optionnel)"
                                value={newStoreAddress}
                                onChange={e => setNewStoreAddress(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={() => { setShowNewStore(false); setNewStoreName(''); setNewStoreAddress(''); }}
                                className="flex-1 py-2 text-slate-400 hover:text-white font-bold transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateStore}
                                disabled={!newStoreName.trim() || creating}
                                className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {creating ? 'Création...' : 'Créer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
