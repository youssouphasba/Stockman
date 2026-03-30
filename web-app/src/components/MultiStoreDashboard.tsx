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
    Repeat,
    ShoppingCart,
    Store,
    TrendingUp,
} from 'lucide-react';
import { analytics as analyticsApi, AnalyticsKpiDetail, AnalyticsStoreComparison, stores as storesApi, User, ai as aiApi } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';
import AnalyticsKpiDetailsModal from './analytics/AnalyticsKpiDetailsModal';
import ScreenGuide, { GuideStep } from './ScreenGuide';

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
    const [error, setError] = useState<string | null>(null);
    const [switching, setSwitching] = useState<string | null>(null);
    const [showNewStore, setShowNewStore] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreAddress, setNewStoreAddress] = useState('');
    const [creating, setCreating] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<AnalyticsKpiDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    // Vague 4: AI rebalance + benchmark
    const [rebalance, setRebalance] = useState<any>(null);
    const [benchmark, setBenchmark] = useState<any>(null);
    const { filters } = useAnalyticsFilters();
    const hasCustomRange = filters.useCustomRange && !!filters.startDate && !!filters.endDate;
    const analyticsFilters = {
        ...(hasCustomRange ? { start_date: filters.startDate, end_date: filters.endDate } : { days: filters.days }),
        store_id: filters.storeId || undefined,
        category_id: filters.categoryId || undefined,
        supplier_id: filters.supplierId || undefined,
    };
    const periodLabel = hasCustomRange
        ? `du ${new Date(filters.startDate).toLocaleDateString('fr-FR')} au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`
        : `sur ${filters.days} jours`;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const statsRes = await analyticsApi.getStoreComparison(analyticsFilters);
            setStats(statsRes);
        } catch (err) {
            console.error(err);
            setStats(null);
            setError("Impossible de charger la vue multi-boutiques.");
        } finally {
            setLoading(false);
        }
    }, [filters.categoryId, filters.days, filters.endDate, filters.startDate, filters.storeId, filters.supplierId, filters.useCustomRange]);

    useEffect(() => {
        load();
        // Vague 4: load AI features in background
        Promise.allSettled([aiApi.rebalanceSuggestions(), aiApi.storeBenchmark()])
            .then(([rebalRes, benchRes]) => {
                if (rebalRes.status === 'fulfilled') setRebalance(rebalRes.value);
                if (benchRes.status === 'fulfilled') setBenchmark(benchRes.value);
            });
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

    const openDetail = async (metric: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const response = await analyticsApi.getKpiDetails('multi_stores', metric, analyticsFilters);
            setDetail(response);
        } catch (err) {
            console.error(err);
            setDetail({
                title: 'Detail indisponible',
                description: "Impossible de charger le detail multi-boutiques.",
                export_name: 'detail_indisponible',
                columns: [],
                rows: [],
                total_rows: 0,
            });
        } finally {
            setDetailLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw size={28} className="animate-spin text-primary" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="mx-auto max-w-6xl p-6">
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-200">
                    {error || "Impossible de charger la vue multi-boutiques."}
                </div>
            </div>
        );
    }

    const multiStoreSteps: GuideStep[] = [
        {
            title: 'Rôle de la vue multi-boutiques',
            content: "Cet écran sert à piloter plusieurs boutiques dans une seule vue. Utilisez-le pour comparer les performances, repérer les écarts et décider rapidement où agir en priorité.",
        },
        {
            title: 'Tenir compte des filtres globaux',
            content: "Les chiffres affichés ici dépendent des filtres d'analyse actifs : période, boutique, catégorie ou fournisseur. Vérifiez toujours le contexte avant d'interpréter un écart ou de partager un chiffre consolidé.",
        },
        {
            title: 'Lire les KPI consolidés',
            content: "Les cartes du haut donnent une lecture globale du réseau : nombre de boutiques, chiffre d'affaires consolidé, ventes, stock valorisé, rotation, stocks bas, ruptures et stock dormant.",
            details: [
                { label: 'Cliquer sur une carte', description: "Ouvre le détail analytique correspondant pour aller au-delà du simple indicateur global.", type: 'button' },
                { label: 'Hint sous la carte', description: "Précise la période ou le type de donnée affichée afin d'éviter une mauvaise lecture.", type: 'info' },
            ],
        },
        {
            title: 'Comparer les boutiques ligne par ligne',
            content: "Le tableau principal affiche chaque boutique avec ses métriques essentielles. Utilisez-le pour identifier rapidement la meilleure performance, les points faibles et les écarts entre magasins.",
            details: [
                { label: 'CA, ventes, panier, stock', description: "Ces indicateurs aident à comparer l'activité commerciale et la pression sur le stock.", type: 'card' },
                { label: 'Stock bas et ruptures', description: "Permettent de repérer les boutiques qui nécessitent une action opérationnelle prioritaire.", type: 'card' },
            ],
        },
        {
            title: 'Basculer la boutique active',
            content: "Le bouton « Basculer » sert à faire d'une boutique la boutique active du compte. Utilisez-le quand vous voulez ensuite travailler directement dans ses écrans opérationnels avec le bon contexte.",
        },
        {
            title: 'Ajouter une nouvelle boutique',
            content: "Le bouton « Nouvelle boutique » ouvre une fenêtre simple pour créer un nouveau point de vente. Renseignez le nom, ajoutez l'adresse si vous l'avez, puis validez pour l'intégrer à votre organisation.",
        },
        {
            title: 'Ouvrir les détails analytiques',
            content: "Quand vous cliquez sur un KPI, une fenêtre détaillée s'ouvre. Servez-vous-en pour obtenir les lignes explicatives et approfondir une variation avant de prendre une décision.",
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6 max-w-6xl mx-auto">
            <ScreenGuide guideKey="multi_stores_tour" steps={multiStoreSteps} />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <Store size={24} className="text-primary" />
                        Vue Multi-Boutiques
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Benchmark consolide sur {stats?.totals.store_count ?? 0} boutique(s) {periodLabel}.
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
                    onClick={() => openDetail('store_count')}
                />
                <KpiCard
                    icon={TrendingUp}
                    label="CA consolide"
                    value={formatCurrency(stats?.totals.revenue ?? 0, stats?.currency || user?.currency)}
                    hint={hasCustomRange ? periodLabel : `${filters.days} derniers jours`}
                    delta={(stats?.totals.revenue_delta ?? 0) * 100}
                    onClick={() => openDetail('revenue')}
                />
                <KpiCard
                    icon={ShoppingCart}
                    label="Ventes consolidees"
                    value={(stats?.totals.sales_count ?? 0).toLocaleString('fr-FR')}
                    hint="Tickets sur la periode"
                    onClick={() => openDetail('sales_count')}
                />
                <KpiCard
                    icon={Boxes}
                    label="Stock valorise"
                    value={formatCurrency(stats?.totals.stock_value ?? 0, stats?.currency || user?.currency)}
                    hint={`${stats?.totals.total_products ?? 0} produits suivis`}
                    onClick={() => openDetail('stock_value')}
                />
                <KpiCard
                    icon={Repeat}
                    label="Rotation stock"
                    value={`${(stats?.totals.stock_turnover_ratio ?? 0).toFixed(2)}x`}
                    hint="Sorties / stock valorise"
                    onClick={() => openDetail('stock_turnover_ratio')}
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Stocks bas"
                    value={(stats?.totals.low_stock_count ?? 0).toLocaleString('fr-FR')}
                    hint="Produits a traiter"
                    onClick={() => openDetail('low_stock_count')}
                />
                <KpiCard
                    icon={Package}
                    label="Ruptures"
                    value={(stats?.totals.out_of_stock_count ?? 0).toLocaleString('fr-FR')}
                    hint="Produits a zero stock"
                    onClick={() => openDetail('out_of_stock_count')}
                />
                <KpiCard
                    icon={Clock3}
                    label="Stock dormant"
                    value={(stats?.totals.dormant_products_count ?? 0).toLocaleString('fr-FR')}
                    hint="Sans vente depuis 30 jours"
                    onClick={() => openDetail('dormant_products_count')}
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
                            <p>Aucune boutique trouvee pour cette selection</p>
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
                                                <div className="font-black text-white">{store.stock_turnover_ratio.toFixed(2)}x</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Rotation</div>
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
                                        <span>Marge brute estimee: {formatCurrency(store.gross_profit, stats?.currency || user?.currency)}</span>
                                        <span>Delta ventes: {(store.sales_count_delta * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {showNewStore && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111827] p-6 shadow-2xl">
                        <h3 className="text-xl font-black text-white">Ajouter une boutique</h3>
                        <p className="mt-2 text-sm text-slate-400">Creer un nouveau point de vente pour votre organisation.</p>
                        <div className="mt-5 space-y-3">
                            <input
                                value={newStoreName}
                                onChange={(event) => setNewStoreName(event.target.value)}
                                placeholder="Nom de la boutique"
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary/40"
                            />
                            <input
                                value={newStoreAddress}
                                onChange={(event) => setNewStoreAddress(event.target.value)}
                                placeholder="Adresse (optionnel)"
                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary/40"
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowNewStore(false)}
                                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/5"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateStore}
                                disabled={creating || !newStoreName.trim()}
                                className="rounded-2xl bg-primary px-4 py-2 text-sm font-black text-white transition hover:bg-primary/90 disabled:opacity-50"
                            >
                                {creating ? 'Creation...' : 'Creer la boutique'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vague 4: Store Benchmark */}
            {benchmark && benchmark.stores?.length >= 2 && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp size={20} className="text-primary" />
                        <h2 className="text-lg font-black text-white">Benchmark boutiques — 30 derniers jours</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="pb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Boutique</th>
                                    <th className="pb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">CA 30j</th>
                                    <th className="pb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Marge brute</th>
                                    <th className="pb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rotation</th>
                                    <th className="pb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {benchmark.stores.map((s: any) => (
                                    <tr key={s.store_id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3 pr-4">
                                            <span className="text-white font-bold">{s.store_name}</span>
                                            {s.rank_label === 'top' && <span className="ml-2 text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-black">TOP</span>}
                                            {s.rank_label === 'bottom' && <span className="ml-2 text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded-full font-black">À améliorer</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-white font-semibold">{formatCurrency(s.revenue_30d)}</td>
                                        <td className="py-3 pr-4">
                                            <span className={s.gross_margin_pct >= 30 ? 'text-emerald-400 font-bold' : s.gross_margin_pct >= 15 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
                                                {s.gross_margin_pct}%
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-300">{s.stock_rotation}×</td>
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 rounded-full bg-white/10">
                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.performance_score}%` }} />
                                                </div>
                                                <span className="text-primary font-black text-xs">{s.performance_score}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Vague 4: Rebalance Suggestions */}
            {rebalance && rebalance.suggestions?.length > 0 && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Repeat size={20} className="text-amber-400" />
                        <div>
                            <h2 className="text-lg font-black text-white">Rééquilibrage suggéré</h2>
                            <p className="text-xs text-slate-500">{rebalance.total_found} transfert(s) pour optimiser la couverture stock</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {rebalance.suggestions.slice(0, 8).map((s: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm truncate">{s.product_name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span className="text-amber-400 font-bold">{s.from_store_name}</span>
                                        <ArrowRight size={12} />
                                        <span className="text-emerald-400 font-bold">{s.to_store_name}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-white font-black text-sm">× {s.transfer_quantity}</p>
                                    <p className="text-[10px] text-slate-500">{s.to_days_cover}j restants</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AnalyticsKpiDetailsModal
                open={detailOpen}
                detail={detail}
                loading={detailLoading}
                onClose={() => {
                    setDetailOpen(false);
                    setDetail(null);
                }}
            />
        </div>
    );
}
