'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Search, Store, TrendingDown, TrendingUp, X } from 'lucide-react';
import { admin as adminApi } from '../../services/api';
import Modal from '../Modal';
import SafeResponsiveContainer from '../charts/SafeResponsiveContainer';
import AdminStoreInventoryPanel from './AdminStoreInventoryPanel';

type Props = {
    refreshToken?: number;
    showToast: (message: string, type?: 'success' | 'error') => void;
    onOpenOwner?: (owner: { user_id: string; name?: string; email?: string }) => void;
};

const PAGE_SIZE = 25;
const CHART_COLOR = '#10B981';

const ACTIVITY: Record<string, { label: string; hint: string; className: string }> = {
    active: { label: 'Active', hint: 'Vente dans les 7 derniers jours', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' },
    slowing: { label: 'Ralentie', hint: 'Dernière vente il y a 8 à 30 jours', className: 'border-amber-500/20 bg-amber-500/10 text-amber-300' },
    inactive: { label: 'Inactive', hint: 'Aucune vente depuis plus de 30 jours', className: 'border-rose-500/20 bg-rose-500/10 text-rose-300' },
    never: { label: 'Jamais vendu', hint: 'Aucune vente enregistrée', className: 'border-white/10 bg-white/5 text-slate-400' },
};

const BILLING: Record<string, string> = { paying: 'Payant', trial: 'Essai', expired: 'Expiré' };

const PLAN_CLASS: Record<string, string> = {
    starter: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    pro: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    enterprise: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
};

const SORT_OPTIONS = [
    { value: 'revenue_30d', label: 'CA 30 jours' },
    { value: 'trend', label: 'Progression' },
    { value: 'last_sale', label: 'Dernière vente' },
    { value: 'created', label: 'Plus récentes' },
    { value: 'products', label: 'Produits' },
    { value: 'name', label: 'Nom' },
];

function formatMoney(amount: any, currency: string) {
    const numeric = Number(amount || 0);
    const suffix = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency && currency !== '—' ? currency : '';
    if (currency === 'EUR') {
        return `${numeric.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    return `${numeric.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${suffix}`.trim();
}

function formatDateTime(value: any) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(value: any) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function sinceLabel(value: any) {
    if (!value) return 'Aucune vente';
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (days <= 0) return 'Vente aujourd’hui';
    if (days === 1) return 'Vente hier';
    return `Vente il y a ${days} j`;
}

function businessTypeLabel(value: string) {
    if (!value || value === 'non renseigné') return 'Non renseigné';
    const text = value.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function sourceLabel(source: string) {
    if (source === 'ecommerce') return 'E-com';
    if (source === 'mixed') return 'Mixte';
    return 'Physique';
}

function severityLabel(severity: string) {
    if (severity === 'critical') return 'Critique';
    if (severity === 'warning') return 'Attention';
    return 'Info';
}

function severityClass(severity: string) {
    if (severity === 'critical') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
    if (severity === 'warning') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
}

function Trend({ pct }: { pct: number | null | undefined }) {
    if (pct === null || pct === undefined) {
        return <span className="text-[11px] text-slate-500" title="Aucune vente sur les 30 jours précédents : pas de comparaison possible.">—</span>;
    }
    const up = pct >= 0;
    const Icon = up ? TrendingUp : TrendingDown;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`} title="Par rapport aux 30 jours précédents">
            <Icon size={12} /> {up ? '+' : ''}{pct.toLocaleString('fr-FR')} %
        </span>
    );
}

function MetricPill({ label, value, tone = 'default', hint }: { label: string; value: any; tone?: 'default' | 'danger' | 'warning' | 'success' | 'info'; hint?: string }) {
    const toneClass =
        tone === 'danger' ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
            : tone === 'warning' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                : tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : tone === 'info' ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                        : 'border-white/10 bg-white/5 text-slate-200';
    return (
        <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
            <p className="mt-2 text-lg font-black">{value}</p>
            {hint ? <p className="mt-0.5 text-[11px] opacity-70">{hint}</p> : null}
        </div>
    );
}

function SectionCard({ title, subtitle, actionLabel, onAction, children }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
    return (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white">{title}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
                </div>
                {actionLabel && onAction ? (
                    <button onClick={onAction} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:bg-white/10">
                        {actionLabel}
                    </button>
                ) : null}
            </div>
            {children}
        </div>
    );
}

// Liste de parts : une barre par ligne, libellé et montant en clair (pas de couleur seule).
function ShareList({ rows, currency, empty }: { rows: { key: string; label: string; amount: number; count: number }[]; currency: string; empty: string }) {
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    if (!rows.length || total <= 0) return <p className="text-xs text-slate-500">{empty}</p>;
    return (
        <div className="space-y-2.5">
            {rows.map(row => {
                const share = Math.round((row.amount / total) * 100);
                return (
                    <div key={row.key}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-200">{row.label}</span>
                            <span className="text-slate-400">{formatMoney(row.amount, currency)} · {share} %</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/5">
                            <div className="h-1.5 rounded-full bg-emerald-400/70" style={{ width: `${Math.max(share, 2)}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function CountBars({ title, rows, onPick, format }: { title: string; rows: { key: string; count: number }[]; onPick?: (key: string) => void; format?: (key: string) => string }) {
    const max = Math.max(1, ...rows.map(row => row.count));
    return (
        <div className="glass-card p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
            <div className="mt-3 space-y-2">
                {rows.slice(0, 6).map(row => (
                    <button
                        key={row.key}
                        type="button"
                        disabled={!onPick}
                        onClick={() => onPick?.(row.key)}
                        className="block w-full text-left disabled:cursor-default"
                        title={onPick ? 'Filtrer la liste' : undefined}
                    >
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-200">{format ? format(row.key) : row.key}</span>
                            <span className="font-bold text-white">{row.count}</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/5">
                            <div className="h-1.5 rounded-full bg-sky-400/70" style={{ width: `${(row.count / max) * 100}%` }} />
                        </div>
                    </button>
                ))}
                {!rows.length && <p className="text-xs text-slate-500">Aucune donnée.</p>}
            </div>
        </div>
    );
}

function SalesSection({ sales, currency }: { sales: any; currency: string }) {
    const periods = sales?.periods || {};
    const margin = sales?.margin_30d || {};
    const daily = sales?.daily_30d || [];
    const hasSales = Number(periods['90d']?.count || 0) > 0;
    return (
        <SectionCard title="Ventes" subtitle="Chiffre d’affaires, panier moyen, marge, produits phares, moyens de paiement et canaux (ventes payées uniquement).">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <MetricPill label="CA 7 jours" value={formatMoney(periods['7d']?.revenue, currency)} hint={`${periods['7d']?.count || 0} vente(s)`} />
                <MetricPill label="CA 30 jours" value={formatMoney(periods['30d']?.revenue, currency)} hint={`${periods['30d']?.count || 0} vente(s)`} tone="success" />
                <MetricPill label="CA 90 jours" value={formatMoney(periods['90d']?.revenue, currency)} hint={`${periods['90d']?.count || 0} vente(s)`} />
                <MetricPill label="Panier moyen 30 j" value={formatMoney(periods['30d']?.avg_basket, currency)} />
            </div>
            {hasSales ? (
                <>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">CA par jour, 30 derniers jours</p>
                        <div className="mt-3 h-48">
                            <SafeResponsiveContainer width="100%" height={192} minWidth={0} minHeight={160}>
                                <BarChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#ffffff0d" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} interval={4}
                                        tickFormatter={(value) => { const d = new Date(`${value}T00:00:00`); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} width={44}
                                        tickFormatter={(value) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff0a' }}
                                        formatter={(value: any, _name: any, item: any) => [`${formatMoney(value, currency)} · ${item?.payload?.count || 0} vente(s)`, 'CA']}
                                        labelFormatter={(value: any) => new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}
                                        contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #ffffff1a', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                                        labelStyle={{ color: '#94A3B8', fontSize: '11px' }}
                                    />
                                    <Bar dataKey="revenue" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
                                </BarChart>
                            </SafeResponsiveContainer>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Marge 30 jours</p>
                            {margin.pct === null || margin.pct === undefined ? (
                                <p className="mt-3 text-xs text-slate-500">Prix d’achat non renseignés : marge non calculable.</p>
                            ) : (
                                <>
                                    <p className="mt-3 text-xl font-black text-white">{formatMoney(margin.amount, currency)}</p>
                                    <p className="text-xs text-emerald-300 font-bold">{Number(margin.pct).toLocaleString('fr-FR')} % du CA</p>
                                    {Number(margin.coverage_pct) < 100 ? (
                                        <p className="mt-2 text-[11px] text-amber-300">Calculée sur {margin.coverage_pct} % du CA : les autres produits n’ont pas de prix d’achat.</p>
                                    ) : null}
                                </>
                            )}
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Moyens de paiement 30 j</p>
                            <ShareList rows={(sales.payment_methods_30d || []).map((row: any) => ({ key: row.method, label: row.label, amount: row.amount, count: row.count }))} currency={currency} empty="Aucun paiement." />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Canaux 30 j</p>
                            <ShareList rows={(sales.channels_30d || []).map((row: any) => ({ key: row.source, label: row.label, amount: row.amount, count: row.count }))} currency={currency} empty="Aucune vente." />
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Produits les plus vendus, 30 jours</p>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                            {(sales.top_products_30d || []).map((product: any, index: number) => (
                                <div key={product.product_id || product.name} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="min-w-0 truncate text-slate-200"><span className="text-slate-500 mr-2">{index + 1}.</span>{product.name}</span>
                                    <span className="shrink-0 text-xs text-slate-400">{Number(product.quantity).toLocaleString('fr-FR')} vendus · <span className="font-bold text-white">{formatMoney(product.revenue, currency)}</span></span>
                                </div>
                            ))}
                            {!(sales.top_products_30d || []).length && <p className="text-xs text-slate-500">Aucune vente sur 30 jours.</p>}
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-xs text-slate-500">Aucune vente payée sur les 90 derniers jours.</p>
            )}
        </SectionCard>
    );
}

export default function AdminStoreOverviewPanel({ refreshToken = 0, showToast, onOpenOwner }: Props) {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [country, setCountry] = useState('');
    const [plan, setPlan] = useState('');
    const [activity, setActivity] = useState('');
    const [billing, setBilling] = useState('');
    const [sort, setSort] = useState('revenue_30d');
    const [page, setPage] = useState(0);
    const [data, setData] = useState<{ items: any[]; total: number; summary: any; countries: string[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
    const [overviewByStore, setOverviewByStore] = useState<Record<string, any>>({});
    const [loadingStoreId, setLoadingStoreId] = useState<string | null>(null);
    const [inventoryStoreId, setInventoryStoreId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<null | { type: 'alerts' | 'customers' | 'suppliers'; storeName: string; items: any[]; currency: string }>(null);
    const inventoryRef = useRef<HTMLDivElement | null>(null);
    const requestId = useRef(0);

    useEffect(() => {
        const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const load = async () => {
        const current = ++requestId.current;
        setLoading(true);
        try {
            const result = await adminApi.listStores({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, search, country, plan, activity, billing, sort });
            if (current !== requestId.current) return;
            setData({ items: result.items || [], total: result.total || 0, summary: result.summary || null, countries: result.countries || [] });
        } catch (error: any) {
            if (current === requestId.current) showToast(error?.message || 'Impossible de charger les boutiques.', 'error');
        } finally {
            if (current === requestId.current) setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // showToast change à chaque rendu du tableau de bord : on ne recharge que sur les filtres.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search, country, plan, activity, billing, sort, refreshToken]);

    const stores = data?.items || [];
    const summary = data?.summary;
    const total = data?.total || 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasFilters = Boolean(search || country || plan || activity || billing);

    useEffect(() => {
        if (stores[0]?.store_id && !stores.some(store => store.store_id === inventoryStoreId)) {
            setInventoryStoreId(stores[0].store_id);
        }
    }, [stores, inventoryStoreId]);

    const setFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(0); };
    const resetFilters = () => { setSearchInput(''); setSearch(''); setCountry(''); setPlan(''); setActivity(''); setBilling(''); setPage(0); };

    const activityTiles = useMemo(() => {
        if (!summary) return [];
        const pct = (value: number) => (summary.total ? `${Math.round((value / summary.total) * 100)} % des boutiques` : '');
        return [
            { key: '', label: 'Boutiques', value: summary.total, hint: `${summary.new_this_month} nouvelle(s) ce mois`, className: 'text-white' },
            { key: 'active', label: 'Actives 7 jours', value: summary.active_7d, hint: pct(summary.active_7d), className: 'text-emerald-300' },
            { key: 'slowing', label: 'Ralenties', value: summary.activity?.slowing || 0, hint: 'Dernière vente entre 8 et 30 j', className: 'text-amber-300' },
            { key: 'inactive', label: 'Inactives', value: summary.activity?.inactive || 0, hint: 'Plus de 30 j sans vente', className: 'text-rose-300' },
            { key: 'never', label: 'Jamais vendu', value: summary.never_sold, hint: `${summary.without_products} sans aucun produit`, className: 'text-slate-300' },
        ];
    }, [summary]);

    const loadOverview = async (storeId: string, force = false) => {
        if (!storeId) return;
        if (!force && overviewByStore[storeId]) return;
        setLoadingStoreId(storeId);
        try {
            const overview = await adminApi.getStoreOverview(storeId);
            setOverviewByStore((current) => ({ ...current, [storeId]: overview }));
        } catch (error: any) {
            showToast(error?.message || 'Impossible de charger la synthèse de cette boutique.', 'error');
        } finally {
            setLoadingStoreId((current) => (current === storeId ? null : current));
        }
    };

    const toggleStore = async (storeId: string) => {
        if (expandedStoreId === storeId) {
            setExpandedStoreId(null);
            return;
        }
        setExpandedStoreId(storeId);
        await loadOverview(storeId);
    };

    const focusInventory = (storeId: string) => {
        setInventoryStoreId(storeId);
        inventoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const selectClass = 'bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50';

    return (
        <div className="space-y-6">
            {summary ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                        {activityTiles.map(tile => (
                            <button
                                key={tile.label}
                                type="button"
                                onClick={() => setFilter(setActivity)(tile.key)}
                                className={`glass-card p-5 text-left transition-all hover:bg-white/10 ${activity === tile.key && tile.key ? 'ring-1 ring-primary/50' : ''}`}
                                title={tile.key ? 'Filtrer la liste' : 'Toutes les boutiques'}
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tile.label}</p>
                                <p className={`mt-3 text-3xl font-black ${tile.className}`}>{tile.value}</p>
                                <p className="mt-1 text-xs text-slate-500">{tile.hint}</p>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="glass-card p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">CA des 30 derniers jours, par devise</p>
                            <div className="mt-3 space-y-3">
                                {(summary.revenue_by_currency || []).filter((row: any) => row.sales_30d > 0 || row.revenue_prev_30d > 0).map((row: any) => (
                                    <div key={row.currency} className="flex items-end justify-between gap-3">
                                        <div>
                                            <p className="text-xl font-black text-white">{formatMoney(row.revenue_30d, row.currency)}</p>
                                            <p className="text-[11px] text-slate-500">{row.sales_30d} vente(s)</p>
                                        </div>
                                        <Trend pct={row.trend_pct} />
                                    </div>
                                ))}
                                {!(summary.revenue_by_currency || []).some((row: any) => row.sales_30d > 0 || row.revenue_prev_30d > 0) && (
                                    <p className="text-xs text-slate-500">Aucune vente sur les 60 derniers jours.</p>
                                )}
                                <p className="text-[11px] text-slate-600">Les devises ne sont pas additionnées entre elles.</p>
                            </div>
                        </div>
                        <CountBars title="Boutiques par pays" rows={summary.by_country || []} onPick={(key) => key !== '—' && setFilter(setCountry)(key)} />
                        <CountBars title="Boutiques par activité commerciale" rows={summary.by_business_type || []} format={businessTypeLabel} />
                    </div>
                </>
            ) : null}

            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-black text-white uppercase tracking-tighter">Boutiques ({total})</h3>
                            <p className="mt-1 text-xs text-slate-400">Cliquez sur « Analyser » pour les ventes, le stock, les alertes, les clients et les fournisseurs d’une boutique.</p>
                        </div>
                        <button onClick={() => void load()} className="p-2 text-slate-400 hover:text-white transition-all" title="Actualiser">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <div className="relative flex-1 min-w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Boutique, adresse, commerçant, e-mail..."
                                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2 pl-8 pr-8 text-sm text-white focus:outline-none focus:border-primary/50"
                            />
                            {searchInput && (
                                <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label="Effacer la recherche">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        <select value={country} onChange={e => setFilter(setCountry)(e.target.value)} className={selectClass} aria-label="Pays">
                            <option value="">Tous les pays</option>
                            {(data?.countries || []).map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                        <select value={plan} onChange={e => setFilter(setPlan)(e.target.value)} className={selectClass} aria-label="Forfait">
                            <option value="">Tous les forfaits</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <select value={billing} onChange={e => setFilter(setBilling)(e.target.value)} className={selectClass} aria-label="Abonnement">
                            <option value="">Tous les abonnements</option>
                            <option value="paying">Payants</option>
                            <option value="trial">En essai</option>
                            <option value="expired">Expirés</option>
                        </select>
                        <select value={activity} onChange={e => setFilter(setActivity)(e.target.value)} className={selectClass} aria-label="Activité">
                            <option value="">Toute activité</option>
                            {Object.entries(ACTIVITY).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                        </select>
                        <select value={sort} onChange={e => setFilter(setSort)(e.target.value)} className={selectClass} aria-label="Trier par">
                            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>Tri : {option.label}</option>)}
                        </select>
                        {hasFilters && (
                            <button onClick={resetFilters} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs text-rose-300 hover:bg-rose-500/20">
                                <X size={12} /> Réinitialiser
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                                <th className="px-5 py-3">Boutique</th>
                                <th className="px-5 py-3">Commerçant</th>
                                <th className="px-5 py-3">Forfait</th>
                                <th className="px-5 py-3">Activité</th>
                                <th className="px-5 py-3 text-right">CA 30 j</th>
                                <th className="px-5 py-3 text-right">Ventes 30 j</th>
                                <th className="px-5 py-3 text-right">Produits</th>
                                <th className="px-5 py-3">Stock</th>
                                <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {stores.map((store: any) => {
                                const isOpen = expandedStoreId === store.store_id;
                                const overview = overviewByStore[store.store_id];
                                const currency = overview?.store?.currency || store.currency || 'XOF';
                                const activityMeta = ACTIVITY[store.activity] || ACTIVITY.never;
                                return (
                                    <React.Fragment key={store.store_id}>
                                        <tr className={`align-top hover:bg-white/5 ${isOpen ? 'bg-white/5' : ''}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-9 w-9 shrink-0 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-primary"><Store size={15} /></div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white truncate max-w-[220px]">{store.name || 'Boutique sans nom'}</p>
                                                        <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{store.address || 'Adresse non renseignée'}</p>
                                                        <p className="text-[10px] text-slate-600">{store.country_code || '—'} · créée le {formatShortDate(store.created_at)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {onOpenOwner && store.user_id ? (
                                                    <button onClick={() => onOpenOwner({ user_id: store.user_id, name: store.owner_name, email: store.owner_email })} className="text-left hover:underline" title="Ouvrir la fiche du commerçant">
                                                        <p className="font-semibold text-slate-100">{store.owner_name}</p>
                                                        <p className="text-[11px] text-slate-500">{store.owner_email}</p>
                                                    </button>
                                                ) : (
                                                    <div>
                                                        <p className="font-semibold text-slate-100">{store.owner_name}</p>
                                                        <p className="text-[11px] text-slate-500">{store.owner_email}</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${PLAN_CLASS[store.plan] || PLAN_CLASS.starter}`}>{store.plan}</span>
                                                <p className={`mt-1 text-[11px] ${store.billing === 'paying' ? 'text-emerald-300' : store.billing === 'trial' ? 'text-sky-300' : 'text-slate-500'}`}>{BILLING[store.billing] || '—'}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border whitespace-nowrap ${activityMeta.className}`} title={activityMeta.hint}>{activityMeta.label}</span>
                                                <p className="mt-1 text-[11px] text-slate-500 whitespace-nowrap" title={formatDateTime(store.last_sale_at)}>{sinceLabel(store.last_sale_at)}</p>
                                            </td>
                                            <td className="px-5 py-4 text-right whitespace-nowrap">
                                                <p className="font-black text-white">{formatMoney(store.revenue_30d, store.currency)}</p>
                                                <Trend pct={store.revenue_trend_pct} />
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <p className="font-bold text-slate-100">{store.sales_30d}</p>
                                                <p className="text-[11px] text-slate-500" title="Depuis la création">{store.sales_count} au total</p>
                                            </td>
                                            <td className="px-5 py-4 text-right font-bold text-slate-100">{store.product_count}</td>
                                            <td className="px-5 py-4 text-[11px] leading-5 whitespace-nowrap">
                                                {store.product_count ? (
                                                    <>
                                                        <p className={store.out_of_stock_count ? 'text-rose-300 font-bold' : 'text-slate-500'}>{store.out_of_stock_count || 0} rupture(s)</p>
                                                        <p className={store.low_stock_count ? 'text-amber-300' : 'text-slate-500'}>{store.low_stock_count || 0} stock bas</p>
                                                        {(store.expired_count || store.expiring_soon_count) ? (
                                                            <p className="text-orange-300">{store.expired_count || 0} périmé(s) · {store.expiring_soon_count || 0} sous 30 j</p>
                                                        ) : null}
                                                        {store.active_alerts_count ? <p className={store.critical_alerts_count ? 'text-rose-300' : 'text-slate-400'}>{store.active_alerts_count} alerte(s)</p> : null}
                                                    </>
                                                ) : <span className="text-slate-600">Aucun produit</span>}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => focusInventory(store.store_id)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-100 hover:bg-white/10 whitespace-nowrap">
                                                        Stock
                                                    </button>
                                                    <button
                                                        onClick={() => void toggleStore(store.store_id)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 whitespace-nowrap"
                                                    >
                                                        {isOpen ? 'Réduire' : 'Analyser'}
                                                        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr>
                                                <td colSpan={9} className="px-5 pb-6 pt-1 bg-white/[0.02]">
                                                    {loadingStoreId === store.store_id && !overview ? (
                                                        <div className="rounded-3xl border border-white/10 bg-slate-950/50 px-6 py-10 text-center text-slate-400">
                                                            <RefreshCw size={18} className="mx-auto mb-3 animate-spin" />
                                                            Chargement de l’analyse de la boutique...
                                                        </div>
                                                    ) : overview ? (
                                                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                                                            <div className="2xl:col-span-2">
                                                                <SalesSection sales={overview.sales} currency={currency} />
                                                            </div>
                                                        <SectionCard
                                                            title="Stock"
                                                            subtitle={`État global du stock, références sensibles et derniers mouvements de ${store.name || 'la boutique'}.`}
                                                            actionLabel="Voir tout le stock"
                                                            onAction={() => focusInventory(store.store_id)}
                                                        >
                                                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                                                <MetricPill label="Produits" value={overview.stock.summary.total_products || 0} />
                                                                <MetricPill label="Ruptures" value={overview.stock.summary.out_of_stock_count || 0} tone={(overview.stock.summary.out_of_stock_count || 0) > 0 ? 'danger' : 'default'} />
                                                                <MetricPill label="Stock bas" value={overview.stock.summary.low_stock_count || 0} tone={(overview.stock.summary.low_stock_count || 0) > 0 ? 'warning' : 'default'} />
                                                                <MetricPill label="Dormants" value={overview.stock.summary.dormant_products_count || 0} />
                                                            </div>
                                                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 text-sm">
                                                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ruptures</p>
                                                                    <div className="mt-3 space-y-2">
                                                                        {(overview.stock.highlights.out_of_stock || []).slice(0, 4).map((item: any) => (
                                                                            <div key={item.product_id} className="flex items-center justify-between gap-3 text-slate-200">
                                                                                <span className="truncate">{item.name}</span>
                                                                                <span className="text-rose-300 font-bold">{item.quantity}</span>
                                                                            </div>
                                                                        ))}
                                                                        {!(overview.stock.highlights.out_of_stock || []).length && <p className="text-xs text-slate-500">Aucune rupture actuellement.</p>}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sous seuil</p>
                                                                    <div className="mt-3 space-y-2">
                                                                        {(overview.stock.highlights.low_stock || []).slice(0, 4).map((item: any) => (
                                                                            <div key={item.product_id} className="flex items-center justify-between gap-3 text-slate-200">
                                                                                <span className="truncate">{item.name}</span>
                                                                                <span className="text-amber-300 font-bold">{item.quantity} / {item.min_stock}</span>
                                                                            </div>
                                                                        ))}
                                                                        {!(overview.stock.highlights.low_stock || []).length && <p className="text-xs text-slate-500">Aucun produit sous seuil.</p>}
                                                                    </div>
                                                                </div>
                                                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Derniers mouvements</p>
                                                                    <div className="mt-3 space-y-2">
                                                                        {(overview.stock.highlights.recent_movements || []).slice(0, 4).map((movement: any) => (
                                                                            <div key={movement.movement_id} className="space-y-1">
                                                                                <p className="text-slate-200 font-semibold truncate">{movement.product_name || movement.reason || movement.movement_id}</p>
                                                                                <p className="text-[11px] text-slate-500">{movement.type === 'in' ? 'Entrée' : 'Sortie'} · {movement.quantity} · {formatDateTime(movement.created_at)}</p>
                                                                            </div>
                                                                        ))}
                                                                        {!(overview.stock.highlights.recent_movements || []).length && <p className="text-xs text-slate-500">Aucun mouvement récent.</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </SectionCard>

                                                        <SectionCard
                                                            title="Alertes"
                                                            subtitle="Signaux actifs, niveaux de gravité et dernières alertes remontées sur cette boutique."
                                                            actionLabel="Voir toutes les alertes"
                                                            onAction={() => setModalState({ type: 'alerts', storeName: store.name || 'Boutique', items: overview.alerts.items || [], currency })}
                                                        >
                                                            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                                                                <MetricPill label="Actives" value={overview.alerts.summary.total_active || 0} tone={(overview.alerts.summary.total_active || 0) > 0 ? 'warning' : 'default'} />
                                                                <MetricPill label="Critiques" value={overview.alerts.summary.critical_count || 0} tone={(overview.alerts.summary.critical_count || 0) > 0 ? 'danger' : 'default'} />
                                                                <MetricPill label="Attention" value={overview.alerts.summary.warning_count || 0} tone={(overview.alerts.summary.warning_count || 0) > 0 ? 'warning' : 'default'} />
                                                                <MetricPill label="Infos" value={overview.alerts.summary.info_count || 0} tone="info" />
                                                                <MetricPill label="Règles locales" value={overview.alerts.summary.store_rules_count || 0} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(overview.alerts.items || []).slice(0, 5).map((alert: any) => (
                                                                    <div key={alert.alert_id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-start justify-between gap-4">
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-white truncate">{alert.title || alert.type || 'Alerte'}</p>
                                                                            <p className="mt-1 text-xs text-slate-400">{alert.message}</p>
                                                                            <p className="mt-2 text-[11px] text-slate-500">{formatDateTime(alert.created_at)}{alert.product_name ? ` · ${alert.product_name}` : ''}</p>
                                                                        </div>
                                                                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${severityClass(alert.severity)}`}>
                                                                            {severityLabel(alert.severity)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {!(overview.alerts.items || []).length && <p className="text-xs text-slate-500">Aucune alerte active sur cette boutique.</p>}
                                                            </div>
                                                        </SectionCard>

                                                        <SectionCard
                                                            title="Clients"
                                                            subtitle="Répartition physique / E-com, dette client et principaux clients de la boutique."
                                                            actionLabel="Voir tous les clients"
                                                            onAction={() => setModalState({ type: 'customers', storeName: store.name || 'Boutique', items: overview.customers.items || [], currency })}
                                                        >
                                                            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                                                                <MetricPill label="Total" value={overview.customers.summary.total || 0} />
                                                                <MetricPill label="Physiques" value={overview.customers.summary.physical_count || 0} />
                                                                <MetricPill label="E-com" value={overview.customers.summary.ecommerce_count || 0} tone="info" />
                                                                <MetricPill label="Débiteurs" value={overview.customers.summary.debtors_count || 0} tone={(overview.customers.summary.debtors_count || 0) > 0 ? 'warning' : 'default'} />
                                                                <MetricPill label="Dette" value={formatMoney(overview.customers.summary.debt_balance || 0, currency)} tone={(overview.customers.summary.debt_balance || 0) > 0 ? 'warning' : 'default'} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(overview.customers.items || []).slice(0, 5).map((customer: any) => (
                                                                    <div key={customer.customer_id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-start justify-between gap-4">
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-white truncate">{customer.name}</p>
                                                                            <p className="mt-1 text-xs text-slate-400 truncate">{customer.phone || customer.email || 'Aucun contact'}</p>
                                                                            <p className="mt-2 text-[11px] text-slate-500">{sourceLabel(customer.customer_source)} · Dernier achat : {formatShortDate(customer.last_purchase_date)}</p>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="text-sm font-black text-emerald-300">{formatMoney(customer.total_spent || 0, currency)}</p>
                                                                            <p className={`mt-1 text-[11px] ${(customer.current_debt || 0) > 0 ? 'text-amber-300' : 'text-slate-500'}`}>Dette : {formatMoney(customer.current_debt || 0, currency)}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {!(overview.customers.items || []).length && <p className="text-xs text-slate-500">Aucun client lié à cette boutique.</p>}
                                                            </div>
                                                        </SectionCard>

                                                        <SectionCard
                                                            title="Fournisseurs"
                                                            subtitle="Fournisseurs liés, commandes ouvertes et retards éventuels sur cette boutique."
                                                            actionLabel="Voir tous les fournisseurs"
                                                            onAction={() => setModalState({ type: 'suppliers', storeName: store.name || 'Boutique', items: overview.suppliers.items || [], currency })}
                                                        >
                                                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                                                                <MetricPill label="Fournisseurs" value={overview.suppliers.summary.total || 0} />
                                                                <MetricPill label="Commandes ouvertes" value={overview.suppliers.summary.open_orders_count || 0} tone={(overview.suppliers.summary.open_orders_count || 0) > 0 ? 'warning' : 'default'} />
                                                                <MetricPill label="Retards" value={overview.suppliers.summary.late_orders_count || 0} tone={(overview.suppliers.summary.late_orders_count || 0) > 0 ? 'danger' : 'default'} />
                                                                <MetricPill label="Montant commandé" value={formatMoney(overview.suppliers.summary.total_ordered_amount || 0, currency)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(overview.suppliers.items || []).slice(0, 5).map((supplier: any) => (
                                                                    <div key={supplier.supplier_id || supplier.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 flex items-start justify-between gap-4">
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-white truncate">{supplier.name}</p>
                                                                            <p className="mt-1 text-xs text-slate-400 truncate">{supplier.phone || supplier.email || supplier.contact_name || 'Aucun contact'}</p>
                                                                            <p className="mt-2 text-[11px] text-slate-500">{supplier.orders_count || 0} commande(s) · Dernière commande : {formatShortDate(supplier.last_order_at)}</p>
                                                                        </div>
                                                                        <div className="text-right shrink-0">
                                                                            <p className="text-sm font-black text-white">{formatMoney(supplier.total_ordered_amount || 0, currency)}</p>
                                                                            <p className={`mt-1 text-[11px] ${(supplier.late_orders_count || 0) > 0 ? 'text-rose-300' : 'text-slate-500'}`}>{supplier.open_orders_count || 0} ouvertes · {supplier.late_orders_count || 0} en retard</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {!(overview.suppliers.items || []).length && <p className="text-xs text-slate-500">Aucun fournisseur lié à cette boutique.</p>}
                                                            </div>
                                                        </SectionCard>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-6 py-5 text-sm text-rose-200">
                                                            Impossible de charger l’analyse de cette boutique.
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {!loading && stores.length === 0 && (
                                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-500">{hasFilters ? 'Aucune boutique ne correspond à ces filtres.' : 'Aucune boutique'}</td></tr>
                            )}
                            {loading && stores.length === 0 && (
                                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-500"><RefreshCw size={16} className="mx-auto animate-spin" /></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {total > PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 border-t border-white/5 px-5 py-3 text-xs text-slate-400">
                        <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-40">
                                <ChevronLeft size={13} /> Précédent
                            </button>
                            <span>Page {page + 1} / {pageCount}</span>
                            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1 || loading} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-40">
                                Suivant <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div ref={inventoryRef}>
                <AdminStoreInventoryPanel
                    stores={stores}
                    showToast={showToast}
                    selectedStoreId={inventoryStoreId}
                    onStoreChange={setInventoryStoreId}
                />
            </div>

            <Modal
                isOpen={!!modalState}
                onClose={() => setModalState(null)}
                title={modalState ? `${modalState.type === 'alerts' ? 'Alertes' : modalState.type === 'customers' ? 'Clients' : 'Fournisseurs'} · ${modalState.storeName}` : ''}
                maxWidth="full"
            >
                {modalState?.type === 'alerts' && (
                    <div className="space-y-3">
                        {modalState.items.length ? modalState.items.map((alert: any) => (
                            <div key={alert.alert_id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">{alert.title || alert.type || 'Alerte'}</p>
                                    <p className="mt-1 text-sm text-slate-300">{alert.message}</p>
                                    <p className="mt-2 text-[11px] text-slate-500">{formatDateTime(alert.created_at)}{alert.product_name ? ` · ${alert.product_name}` : ''}</p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${severityClass(alert.severity)}`}>
                                    {severityLabel(alert.severity)}
                                </span>
                            </div>
                        )) : <p className="text-sm text-slate-500">Aucune alerte à afficher.</p>}
                    </div>
                )}

                {modalState?.type === 'customers' && (
                    <div className="space-y-3">
                        {modalState.items.length ? modalState.items.map((customer: any) => (
                            <div key={customer.customer_id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">{customer.name}</p>
                                    <p className="mt-1 text-sm text-slate-300">{customer.phone || customer.email || 'Aucun contact'}</p>
                                    <p className="mt-2 text-[11px] text-slate-500">{sourceLabel(customer.customer_source)} · Créé le {formatShortDate(customer.created_at)} · Dernier achat : {formatShortDate(customer.last_purchase_date)}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-black text-emerald-300">{formatMoney(customer.total_spent || 0, modalState.currency)}</p>
                                    <p className={`mt-1 text-[11px] ${(customer.current_debt || 0) > 0 ? 'text-amber-300' : 'text-slate-500'}`}>Dette : {formatMoney(customer.current_debt || 0, modalState.currency)}</p>
                                </div>
                            </div>
                        )) : <p className="text-sm text-slate-500">Aucun client à afficher.</p>}
                    </div>
                )}

                {modalState?.type === 'suppliers' && (
                    <div className="space-y-3">
                        {modalState.items.length ? modalState.items.map((supplier: any) => (
                            <div key={supplier.supplier_id || supplier.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white">{supplier.name}</p>
                                    <p className="mt-1 text-sm text-slate-300">{supplier.phone || supplier.email || supplier.contact_name || 'Aucun contact'}</p>
                                    <p className="mt-2 text-[11px] text-slate-500">{supplier.orders_count || 0} commande(s) · Dernière commande : {formatShortDate(supplier.last_order_at)}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-black text-white">{formatMoney(supplier.total_ordered_amount || 0, modalState.currency)}</p>
                                    <p className={`mt-1 text-[11px] ${(supplier.late_orders_count || 0) > 0 ? 'text-rose-300' : 'text-slate-500'}`}>{supplier.open_orders_count || 0} ouvertes · {supplier.late_orders_count || 0} en retard</p>
                                </div>
                            </div>
                        )) : <p className="text-sm text-slate-500">Aucun fournisseur à afficher.</p>}
                    </div>
                )}
            </Modal>
        </div>
    );
}
