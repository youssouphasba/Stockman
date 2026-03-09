'use client';

import React, { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Boxes,
    CircleDollarSign,
    Clock3,
    Package,
    ShoppingCart,
    Store,
    TrendingUp,
} from 'lucide-react';
import { analytics, AnalyticsExecutiveOverview } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';

interface ExecutiveDashboardProps {
    onNavigate?: (tab: string) => void;
}

function formatCurrency(amount: number, currency = 'XOF') {
    try {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    } catch {
        return `${Math.round(amount || 0).toLocaleString('fr-FR')} ${currency}`;
    }
}

function toPercent(delta: number) {
    return Number.isFinite(delta) ? delta * 100 : 0;
}

export default function ExecutiveDashboard({ onNavigate }: ExecutiveDashboardProps) {
    const { filters } = useAnalyticsFilters();
    const [overview, setOverview] = useState<AnalyticsExecutiveOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOverview = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await analytics.getExecutiveOverview({
                    days: filters.days,
                    store_id: filters.storeId || undefined,
                    category_id: filters.categoryId || undefined,
                    supplier_id: filters.supplierId || undefined,
                });
                setOverview(response);
            } catch (err) {
                console.error(err);
                setError("Impossible de charger le cockpit exécutif.");
            } finally {
                setLoading(false);
            }
        };

        loadOverview();
    }, [filters.categoryId, filters.days, filters.storeId, filters.supplierId]);

    if (loading && !overview) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#0F172A]">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !overview) {
        return (
            <div className="m-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-200">
                {error || 'Aucune donnée analytique disponible.'}
            </div>
        );
    }

    const { kpis } = overview;
    const currency = overview.currency || 'XOF';

    return (
        <div className="flex-1 overflow-y-auto bg-[#0F172A] px-6 pb-8 pt-6 custom-scrollbar">
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Cockpit exécutif</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Vue direction consolidée</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                        {overview.summary}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => onNavigate?.('multi_stores')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:border-primary/30 hover:text-primary"
                    >
                        <Store size={16} />
                        Comparer les magasins
                    </button>
                    <button
                        onClick={() => onNavigate?.('inventory')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:border-primary/30 hover:text-primary"
                    >
                        <Package size={16} />
                        Ouvrir le centre stock
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    icon={CircleDollarSign}
                    label="Chiffre d'affaires"
                    value={formatCurrency(kpis.revenue, currency)}
                    hint={`${filters.days} derniers jours`}
                    delta={toPercent(kpis.revenue_delta)}
                />
                <KpiCard
                    icon={TrendingUp}
                    label="Marge brute"
                    value={formatCurrency(kpis.gross_profit, currency)}
                    hint="Basée sur le coût d'achat enregistré"
                    delta={toPercent(kpis.gross_profit_delta)}
                />
                <KpiCard
                    icon={ShoppingCart}
                    label="Panier moyen"
                    value={formatCurrency(kpis.average_ticket, currency)}
                    hint={`${kpis.sales_count} ventes consolidées`}
                    delta={toPercent(kpis.average_ticket_delta)}
                />
                <KpiCard
                    icon={Boxes}
                    label="Stock valorisé"
                    value={formatCurrency(kpis.stock_value, currency)}
                    hint={`${kpis.total_products} produits suivis`}
                />
                <KpiCard
                    icon={Package}
                    label="Produits à stock bas"
                    value={kpis.low_stock_count.toLocaleString('fr-FR')}
                    hint="Produits à traiter rapidement"
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Ruptures"
                    value={kpis.out_of_stock_count.toLocaleString('fr-FR')}
                    hint="Produits à zéro stock"
                />
                <KpiCard
                    icon={Clock3}
                    label="Stock dormant"
                    value={kpis.dormant_products_count.toLocaleString('fr-FR')}
                    hint="Aucune vente depuis 30 jours"
                />
                <KpiCard
                    icon={ShoppingCart}
                    label="Nombre de ventes"
                    value={kpis.sales_count.toLocaleString('fr-FR')}
                    hint="Tickets sur la période"
                    delta={toPercent(kpis.sales_count_delta)}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
                <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Top produits</p>
                            <h2 className="mt-2 text-xl font-black text-white">Ce qui tire le chiffre d'affaires</h2>
                        </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                        <div className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr] bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            <span>Produit</span>
                            <span className="text-right">Qté</span>
                            <span className="text-right">CA</span>
                            <span className="text-right">Marge</span>
                        </div>
                        {overview.top_products.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                Aucun produit vendu sur la période filtrée.
                            </div>
                        ) : (
                            overview.top_products.map((product) => (
                                <div
                                    key={product.product_id}
                                    className="grid grid-cols-[1.5fr_0.7fr_0.8fr_0.8fr] items-center border-t border-white/5 px-4 py-3 text-sm"
                                >
                                    <span className="truncate font-bold text-white">{product.name}</span>
                                    <span className="text-right text-slate-300">{product.quantity.toLocaleString('fr-FR')}</span>
                                    <span className="text-right font-bold text-emerald-400">{formatCurrency(product.revenue, currency)}</span>
                                    <span className="text-right text-slate-300">{formatCurrency(product.gross_profit, currency)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Top catégories</p>
                    <h2 className="mt-2 text-xl font-black text-white">Les rayons qui performent</h2>

                    <div className="mt-6 space-y-4">
                        {overview.top_categories.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                                Aucune catégorie vendue sur cette sélection.
                            </div>
                        ) : (
                            overview.top_categories.map((category, index) => {
                                const topRevenue = overview.top_categories[0]?.revenue || 1;
                                const width = Math.max(8, Math.round((category.revenue / topRevenue) * 100));
                                return (
                                    <div key={category.category_id || `${category.name}-${index}`}>
                                        <div className="mb-2 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-black text-white">{category.name}</p>
                                                <p className="text-xs text-slate-500">{category.quantity.toLocaleString('fr-FR')} unités</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-emerald-400">{formatCurrency(category.revenue, currency)}</p>
                                                <p className="text-xs text-slate-500">{formatCurrency(category.gross_profit, currency)} de marge</p>
                                            </div>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/5">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
