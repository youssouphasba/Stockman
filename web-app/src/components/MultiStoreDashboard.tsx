'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    Check,
    Clock3,
    MapPin,
    Package,
    Plus,
    RefreshCw,
    ShoppingCart,
    Store,
    TrendingUp,
} from 'lucide-react';
import { analytics as analyticsApi, AnalyticsStoreComparison, stores as storesApi, User } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';

interface MultiStoreDashboardProps {
    user?: User | null;
}

function formatCurrency(amount: number, currency = 'XOF') {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
    } catch {
        return `${Math.round(amount).toLocaleString('fr-FR')} ${currency}`;
    }
}

export default function MultiStoreDashboard({ user }: MultiStoreDashboardProps) {
    const [stats, setStats] = useState<AnalyticsStoreComparison | null>(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<string | null>(null);
    const [showNewStore, setShowNewStore] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreAddress, setNewStoreAddress] = useState('');
    const [creating, setCreating] = useState(false);
    const { filters } = useAnalyticsFilters();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const statsRes = await analyticsApi.getStoreComparison({
                days: filters.days,
                store_id: filters.storeId || undefined,
                category_id: filters.categoryId || undefined,
                supplier_id: filters.supplierId || undefined,
            });
            setStats(statsRes);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters.categoryId, filters.days, filters.storeId, filters.supplierId]);

    useEffect(() => {
        load();
    }, [load]);

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
            await load();
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const maxRevenue = stats ? Math.max(...stats.stores.map((store) => store.revenue), 1) : 1;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw size={28} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <Store size={24} className="text-primary" />
                        Vue Multi-Boutiques
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Benchmark consolidé sur {stats?.totals.store_count ?? 0} boutique(s) et {filters.days} jours.
                    </p>
                </div>
                <button
                    onClick={() => setShowNewStore(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={16} /> Nouvelle boutique
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    icon={Store}
                    label="Boutiques"
                    value={(stats?.totals.store_count ?? 0).toLocaleString('fr-FR')}
                    hint="Magasins inclus dans le benchmark"
                />
                <KpiCard
                    icon={TrendingUp}
                    label="CA consolidé"
                    value={formatCurrency(stats?.totals.revenue ?? 0, stats?.currency || user?.currency)}
                    hint={`${filters.days} derniers jours`}
                    delta={(stats?.totals.revenue_delta ?? 0) * 100}
                />
                <KpiCard
                    icon={ShoppingCart}
                    label="Ventes consolidées"
                    value={(stats?.totals.sales_count ?? 0).toLocaleString('fr-FR')}
                    hint="Tickets sur la période"
                />
                <KpiCard
                    icon={Boxes}
                    label="Stock valorisé"
                    value={formatCurrency(stats?.totals.stock_value ?? 0, stats?.currency || user?.currency)}
                    hint={`${stats?.totals.total_products ?? 0} produits suivis`}
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Stocks bas"
                    value={(stats?.totals.low_stock_count ?? 0).toLocaleString('fr-FR')}
                    hint="Produits à traiter"
                />
                <KpiCard
                    icon={Package}
                    label="Ruptures"
                    value={(stats?.totals.out_of_stock_count ?? 0).toLocaleString('fr-FR')}
                    hint="Produits à zéro stock"
                />
                <KpiCard
                    icon={Clock3}
                    label="Stock dormant"
                    value={(stats?.totals.dormant_products_count ?? 0).toLocaleString('fr-FR')}
                    hint="Sans vente depuis 30 jours"
                />
                <KpiCard
                    icon={TrendingUp}
                    label="Panier moyen"
                    value={formatCurrency(stats?.totals.average_ticket ?? 0, stats?.currency || user?.currency)}
                    hint="Consolidé sur les boutiques"
                />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" />
                    <h2 className="font-black text-white text-sm uppercase tracking-wider">Performance par Boutique</h2>
                </div>

                <div className="divide-y divide-white/5">
                    {(stats?.stores ?? []).length === 0 ? (
                        <div className="py-12 text-center text-slate-500">
                            <Store size={40} className="mx-auto mb-3 opacity-30" />
                            <p>Aucune boutique trouvée pour cette sélection</p>
                        </div>
                    ) : (
                        (stats?.stores ?? []).map((store) => {
                            const isActive = user?.active_store_id === store.store_id;
                            const revenueBar = maxRevenue > 0 ? (store.revenue / maxRevenue) * 100 : 0;

                            return (
                                <div key={store.store_id} className={`px-6 py-5 hover:bg-white/5 transition-colors ${isActive ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                                    <div className="flex flex-wrap items-center gap-4">
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

                                        <div className="flex flex-wrap items-center gap-6 text-sm">
                                            <div className="text-center">
                                                <div className="font-black text-emerald-400">{formatCurrency(store.revenue, stats?.currency || user?.currency)}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">CA</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-black text-white">{store.sales_count}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Ventes</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-black text-white">{formatCurrency(store.average_ticket, stats?.currency || user?.currency)}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Panier</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-black text-white">{formatCurrency(store.stock_value, stats?.currency || user?.currency)}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Stock</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-black text-white">{store.total_products}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Produits</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`font-black ${store.low_stock_count > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{store.low_stock_count}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Stock bas</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`font-black ${store.out_of_stock_count > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{store.out_of_stock_count}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Ruptures</div>
                                            </div>
                                        </div>

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

                                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500"
                                            style={{ width: `${revenueBar}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>Marge brute estimée: {formatCurrency(store.gross_profit, stats?.currency || user?.currency)}</span>
                                        <span className={store.revenue_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {store.revenue_delta >= 0 ? '+' : '-'}{Math.abs(store.revenue_delta * 100).toFixed(1)}% vs période précédente
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {showNewStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-white mb-4">Nouvelle Boutique</h3>
                        <div className="space-y-3">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                                placeholder="Nom de la boutique *"
                                value={newStoreName}
                                onChange={(event) => setNewStoreName(event.target.value)}
                                autoFocus
                            />
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                                placeholder="Adresse (optionnel)"
                                value={newStoreAddress}
                                onChange={(event) => setNewStoreAddress(event.target.value)}
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
