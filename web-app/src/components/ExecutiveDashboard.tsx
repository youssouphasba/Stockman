'use client';

import React, { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Activity,
    Boxes,
    CircleDollarSign,
    Clock3,
    Package,
    Repeat,
    Search,
    ShoppingCart,
    Store,
    Target,
    TrendingUp,
    Zap,
} from 'lucide-react';
import { analytics, AnalyticsExecutiveOverview, AnalyticsKpiDetail, ai as aiApi } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';
import AnalyticsKpiDetailsModal from './analytics/AnalyticsKpiDetailsModal';
import ScreenGuide, { GuideStep } from './ScreenGuide';

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
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState<AnalyticsKpiDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [healthScore, setHealthScore] = useState<any>(null);
    const [prediction, setPrediction] = useState<any>(null);
    const [contextualTips, setContextualTips] = useState<any[]>([]);
    const [nlQuery, setNlQuery] = useState('');
    const [nlResult, setNlResult] = useState<any>(null);
    const [nlLoading, setNlLoading] = useState(false);
    const hasCustomRange = filters.useCustomRange && !!filters.startDate && !!filters.endDate;
    const analyticsFilters = {
        ...(hasCustomRange ? { start_date: filters.startDate, end_date: filters.endDate } : { days: filters.days }),
        store_id: filters.storeId || undefined,
        category_id: filters.categoryId || undefined,
        supplier_id: filters.supplierId || undefined,
    };
    const periodLabel = hasCustomRange
        ? `Du ${new Date(filters.startDate).toLocaleDateString('fr-FR')} au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`
        : `${filters.days} derniers jours`;

    useEffect(() => {
        const loadOverview = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await analytics.getExecutiveOverview(analyticsFilters);
                setOverview(response);
            } catch (err) {
                console.error(err);
                setError("Impossible de charger le cockpit executif.");
            } finally {
                setLoading(false);
            }

            Promise.allSettled([
                aiApi.businessHealthScore(),
                aiApi.dashboardPrediction(),
                aiApi.contextualTips(),
            ]).then(([healthRes, predictionRes, tipsRes]) => {
                if (healthRes.status === 'fulfilled') setHealthScore(healthRes.value);
                if (predictionRes.status === 'fulfilled') setPrediction(predictionRes.value);
                if (tipsRes.status === 'fulfilled') setContextualTips(tipsRes.value?.tips || []);
            });
        };

        loadOverview();
    }, [filters.categoryId, filters.days, filters.endDate, filters.startDate, filters.storeId, filters.supplierId, filters.useCustomRange]);

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
                {error || 'Aucune donnee analytique disponible.'}
            </div>
        );
    }

    const currency = overview.currency || 'XOF';
    const predictionDelta = Number(prediction?.delta_vs_last_month || 0);
    const kpis = {
        revenue: Number(overview.kpis?.revenue || 0),
        revenue_delta: Number(overview.kpis?.revenue_delta || 0),
        gross_profit: Number(overview.kpis?.gross_profit || 0),
        gross_profit_delta: Number(overview.kpis?.gross_profit_delta || 0),
        sales_count: Number(overview.kpis?.sales_count || 0),
        average_ticket: Number(overview.kpis?.average_ticket || 0),
        average_ticket_delta: Number(overview.kpis?.average_ticket_delta || 0),
        stock_value: Number(overview.kpis?.stock_value || 0),
        stock_turnover_ratio: Number(overview.kpis?.stock_turnover_ratio || 0),
        low_stock_count: Number(overview.kpis?.low_stock_count || 0),
        out_of_stock_count: Number(overview.kpis?.out_of_stock_count || 0),
        dormant_products_count: Number(overview.kpis?.dormant_products_count || 0),
        total_products: Number(overview.kpis?.total_products || 0),
    };
    const topProducts = Array.isArray(overview.top_products) ? overview.top_products : [];
    const topCategories = Array.isArray(overview.top_categories) ? overview.top_categories : [];

    const openDetail = async (metric: string) => {
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const response = await analytics.getKpiDetails('executive', metric, analyticsFilters);
            setDetail(response);
        } catch (err) {
            console.error(err);
            setDetail({
                title: 'Detail indisponible',
                description: "Impossible de charger le detail de ce KPI.",
                export_name: 'detail_indisponible',
                columns: [],
                rows: [],
                total_rows: 0,
            });
        } finally {
            setDetailLoading(false);
        }
    };

    const handleNaturalQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nlQuery.trim()) return;
        setNlLoading(true);
        setNlResult(null);
        try {
            const response = await aiApi.naturalQuery(nlQuery.trim(), filters.storeId || undefined);
            setNlResult(response);
        } catch {
            setNlResult({ answer: 'Erreur lors de la recherche.', data: [] });
        } finally {
            setNlLoading(false);
        }
    };

    const executiveSteps: GuideStep[] = [
        {
            title: 'Rôle du cockpit exécutif',
            content: "Ce tableau de bord sert à piloter un commerce avec une lecture consolidée du chiffre d'affaires, de la marge, du stock et des priorités d'action.",
        },
        {
            title: "Utilisation de l'IA",
            content: "Les blocs IA de ce dashboard aident à lire la santé du commerce, estimer la fin de mois, explorer les données en langage naturel et faire ressortir les actions utiles.",
            details: [
                { label: 'Santé business', description: "Le score résume plusieurs signaux métier. Il apparaît quand l'analyse peut être calculée à partir de vos données réelles.", type: 'card' },
                { label: 'Projection fin de mois', description: "Cette carte estime le chiffre d'affaires de fin de mois. Elle devient utile quand l'historique de ventes est suffisant.", type: 'card' },
                { label: 'Recherche langage naturel', description: "Posez une question libre pour interroger vos données. Le résultat n'apparaît qu'après clic sur Chercher.", type: 'button' },
                { label: 'Conseils du moment', description: "Les conseils apparaissent seulement quand une situation utile est détectée. L'absence de conseil ne signifie pas une panne.", type: 'tip' },
            ],
        },
        {
            title: 'KPI et détails',
            content: "Les cartes KPI du haut donnent la vue de synthèse. Cliquez sur une carte pour ouvrir le détail analytique correspondant.",
        },
    ];

    return (
        <>
        <div className="flex-1 overflow-y-auto bg-[#0F172A] px-6 pb-8 pt-6 custom-scrollbar">
            <ScreenGuide guideKey="executive_dashboard_tour" steps={executiveSteps} />
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">Cockpit executif</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Vue direction consolidee</h1>
                    {overview.scope_label ? (
                        <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            {overview.scope_label}
                        </p>
                    ) : null}
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
                    hint={periodLabel}
                    delta={toPercent(kpis.revenue_delta)}
                    onClick={() => openDetail('revenue')}
                />
                <KpiCard
                    icon={TrendingUp}
                    label="Marge brute"
                    value={formatCurrency(kpis.gross_profit, currency)}
                    hint="Basee sur le cout d'achat enregistre"
                    delta={toPercent(kpis.gross_profit_delta)}
                    onClick={() => openDetail('gross_profit')}
                />
                <KpiCard
                    icon={ShoppingCart}
                    label="Panier moyen"
                    value={formatCurrency(kpis.average_ticket, currency)}
                    hint={`${kpis.sales_count} ventes consolidees • ${periodLabel}`}
                    delta={toPercent(kpis.average_ticket_delta)}
                    onClick={() => openDetail('average_ticket')}
                />
                <KpiCard
                    icon={Boxes}
                    label="Stock valorise"
                    value={formatCurrency(kpis.stock_value, currency)}
                    hint={`${kpis.total_products} produits suivis`}
                    onClick={() => openDetail('stock_value')}
                />
                <KpiCard
                    icon={Repeat}
                    label="Rotation du stock"
                    value={`${kpis.stock_turnover_ratio.toFixed(2)}x`}
                    hint="Sorties / stock valorise sur la selection"
                    onClick={() => openDetail('stock_turnover_ratio')}
                />
                <KpiCard
                    icon={Package}
                    label="Produits a stock bas"
                    value={kpis.low_stock_count.toLocaleString('fr-FR')}
                    hint="Produits a traiter rapidement"
                    onClick={() => openDetail('low_stock_count')}
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Ruptures"
                    value={kpis.out_of_stock_count.toLocaleString('fr-FR')}
                    hint="Produits a zero stock"
                    onClick={() => openDetail('out_of_stock_count')}
                />
                <KpiCard
                    icon={Clock3}
                    label="Stock dormant"
                    value={kpis.dormant_products_count.toLocaleString('fr-FR')}
                    hint="Aucune vente depuis 30 jours"
                    onClick={() => openDetail('dormant_products_count')}
                />
            </div>

            <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/8 to-transparent p-6">
                    <div className="flex items-center gap-2">
                        <Activity size={18} className="text-emerald-400" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Santé business</p>
                    </div>
                    {healthScore ? (
                        <>
                            <div className="mt-5 flex items-center gap-6">
                                <div className="relative h-28 w-28 shrink-0">
                                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                                        <circle
                                            cx="60"
                                            cy="60"
                                            r="52"
                                            fill="none"
                                            stroke={healthScore.color === 'green' ? '#10B981' : healthScore.color === 'orange' ? '#F59E0B' : '#EF4444'}
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(healthScore.score / 100) * 327} 327`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-2xl font-black ${healthScore.color === 'green' ? 'text-emerald-400' : healthScore.color === 'orange' ? 'text-amber-400' : 'text-rose-400'}`}>
                                            {healthScore.score}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">/100</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    {[
                                        { key: 'margin', label: 'Marge', max: 30 },
                                        { key: 'rotation', label: 'Rotation', max: 20 },
                                        { key: 'debt_recovery', label: 'Recouvrement', max: 20 },
                                        { key: 'trend', label: 'Tendance CA', max: 30 },
                                    ].map(({ key, label, max }) => {
                                        const value = healthScore.components?.[key] ?? 0;
                                        const percent = max > 0 ? (value / max) * 100 : 0;
                                        return (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="w-24 truncate text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
                                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                                                    <div
                                                        className={`h-full rounded-full ${percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="w-12 text-right text-xs font-bold text-slate-300">{value.toFixed(0)}/{max}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="mt-5 text-sm text-slate-500">Le score apparaîtra dès que l’analyse pourra être calculée à partir de vos données.</p>
                    )}
                </div>

                <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/8 to-transparent p-6">
                    <div className="flex items-center gap-2">
                        <Target size={18} className="text-violet-400" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Projection fin de mois</p>
                    </div>
                    {prediction ? (
                        <div className="mt-5">
                            <p className="text-3xl font-black text-white">{formatCurrency(prediction.projected_revenue, currency)}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">Estimé fin de mois</p>
                            <div className="mt-5">
                                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Actuel : {formatCurrency(prediction.current_revenue, currency)}</span>
                                    <span>J{prediction.days_elapsed}/{prediction.days_in_month}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary"
                                        style={{ width: `${Math.min((prediction.current_revenue / Math.max(prediction.projected_revenue, 1)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                                predictionDelta >= 0
                                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                    : 'border border-rose-500/20 bg-rose-500/10 text-rose-400'
                            }`}>
                                <TrendingUp size={14} className={predictionDelta < 0 ? 'rotate-180' : ''} />
                                {predictionDelta >= 0 ? '+' : ''}{predictionDelta.toFixed(1)}% vs mois dernier
                            </div>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                                {prediction.confidence === 'high'
                                    ? 'Confiance élevée'
                                    : prediction.confidence === 'medium'
                                        ? 'Confiance moyenne'
                                        : 'Confiance faible'}
                            </p>
                        </div>
                    ) : (
                        <p className="mt-5 text-sm text-slate-500">La projection mensuelle s’affichera dès qu’il y aura assez d’historique pour l’estimation.</p>
                    )}
                </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-primary" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Recherche langage naturel</p>
                </div>
                <form onSubmit={handleNaturalQuery} className="mt-4 flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={nlQuery}
                            onChange={(e) => {
                                setNlQuery(e.target.value);
                                setNlResult(null);
                            }}
                            placeholder="Posez une question… ex : top produits ce mois, stock bas, dettes clients"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-primary/40"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={nlLoading || !nlQuery.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/15 px-5 py-3 text-sm font-black text-primary transition hover:bg-primary/20 disabled:opacity-40"
                    >
                        {nlLoading ? <div className="h-4 w-4 animate-spin rounded-full border border-primary/40 border-t-primary" /> : <Zap size={14} />}
                        Chercher
                    </button>
                </form>
                {nlResult ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-bold text-white">{nlResult.answer}</p>
                        {Array.isArray(nlResult.data) && nlResult.data.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                                {nlResult.data.slice(0, 12).map((item: any, index: number) => (
                                    <div key={`${item.label || 'item'}-${index}`} className="rounded-xl border border-white/5 bg-[#111827]/80 p-3">
                                        <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                                        <p className="mt-1 text-sm font-black text-white">{typeof item.value === 'number' ? item.value.toLocaleString('fr-FR') : item.value}</p>
                                        {item.revenue != null && <p className="mt-1 text-[10px] text-slate-500">{item.revenue.toLocaleString('fr-FR')} CA</p>}
                                        {item.threshold != null && <p className="mt-1 text-[10px] text-rose-400">Seuil : {item.threshold}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                        {nlResult.resolved_by === 'llm' && (
                            <p className="mt-3 text-[10px] italic text-slate-600">Interprété par IA</p>
                        )}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">Utilise une question libre pour explorer rapidement tes données métier.</p>
                )}
            </section>

            <section className="mt-6 rounded-3xl border border-amber-500/15 bg-amber-500/5 p-6">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Conseils du moment</p>
                </div>
                {contextualTips.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                        {contextualTips.map((tip: any) => (
                            <div
                                key={tip.id}
                                className="rounded-2xl border border-white/10 bg-[#111827]/80 p-4"
                                style={{ borderLeftColor: `${tip.color}55`, borderLeftWidth: 3 }}
                            >
                                <p className="text-sm font-black text-white">{tip.title}</p>
                                <p className="mt-2 text-xs leading-6 text-slate-400">{tip.message}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">Les conseils proactifs apparaîtront ici dès qu’une situation utile à signaler sera détectée.</p>
                )}
            </section>

            {overview.recommendations?.length ? (
                <section className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Synthese & recommandations</p>
                    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {overview.recommendations.map((recommendation, index) => (
                            <div
                                key={`${index}-${recommendation}`}
                                className="rounded-2xl border border-white/10 bg-[#111827]/80 px-4 py-4 text-sm leading-6 text-slate-200"
                            >
                                {recommendation}
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

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
                            <span className="text-right">Qte</span>
                            <span className="text-right">CA</span>
                            <span className="text-right">Marge</span>
                        </div>
                        {topProducts.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                Aucun produit vendu sur la periode filtree.
                            </div>
                        ) : (
                            topProducts.map((product) => (
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
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Top categories</p>
                    <h2 className="mt-2 text-xl font-black text-white">Les rayons qui performent</h2>

                    <div className="mt-6 space-y-4">
                        {topCategories.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                                Aucune categorie vendue sur cette selection.
                            </div>
                        ) : (
                            topCategories.map((category, index) => {
                                const topRevenue = topCategories[0]?.revenue || 1;
                                const width = Math.max(8, Math.round((category.revenue / topRevenue) * 100));
                                return (
                                    <div key={category.category_id || `${category.name}-${index}`}>
                                        <div className="mb-2 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-black text-white">{category.name}</p>
                                                <p className="text-xs text-slate-500">{category.quantity.toLocaleString('fr-FR')} unites</p>
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
        <AnalyticsKpiDetailsModal
            open={detailOpen}
            detail={detail}
            loading={detailLoading}
            onClose={() => {
                setDetailOpen(false);
                setDetail(null);
            }}
        />
        </>
    );
}
