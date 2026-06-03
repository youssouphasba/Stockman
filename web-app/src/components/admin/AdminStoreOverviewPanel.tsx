'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Store } from 'lucide-react';
import { admin as adminApi } from '../../services/api';
import Modal from '../Modal';
import AdminStoreInventoryPanel from './AdminStoreInventoryPanel';

type Props = {
    stores: any[];
    refreshing: boolean;
    onRefresh: () => void | Promise<void>;
    showToast: (message: string, type?: 'success' | 'error') => void;
};

function formatMoney(amount: any, currency: string) {
    const numeric = Number(amount || 0);
    const suffix = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency || '';
    if (currency === 'EUR') {
        return `${numeric.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    return `${numeric.toLocaleString('fr-FR')} ${suffix}`.trim();
}

function formatDateTime(value: any) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatShortDate(value: any) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
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

function MetricPill({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: any;
    tone?: 'default' | 'danger' | 'warning' | 'success' | 'info';
}) {
    const toneClass =
        tone === 'danger'
            ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
            : tone === 'warning'
                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                : tone === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : tone === 'info'
                        ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                        : 'border-white/10 bg-white/5 text-slate-200';
    return (
        <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
            <p className="mt-2 text-lg font-black">{value}</p>
        </div>
    );
}

function SectionCard({
    title,
    subtitle,
    actionLabel,
    onAction,
    children,
}: {
    title: string;
    subtitle: string;
    actionLabel: string;
    onAction: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white">{title}</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
                </div>
                <button onClick={onAction} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:bg-white/10">
                    {actionLabel}
                </button>
            </div>
            {children}
        </div>
    );
}

export default function AdminStoreOverviewPanel({ stores, refreshing, onRefresh, showToast }: Props) {
    const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
    const [overviewByStore, setOverviewByStore] = useState<Record<string, any>>({});
    const [loadingStoreId, setLoadingStoreId] = useState<string | null>(null);
    const [inventoryStoreId, setInventoryStoreId] = useState<string | null>(null);
    const [modalState, setModalState] = useState<null | { type: 'alerts' | 'customers' | 'suppliers'; storeName: string; items: any[]; currency: string }>(null);
    const inventoryRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!inventoryStoreId && stores[0]?.store_id) {
            setInventoryStoreId(stores[0].store_id);
        }
    }, [inventoryStoreId, stores]);

    const storesInsights = useMemo(() => {
        const withoutProducts = stores.filter((store: any) => Number(store.product_count || 0) === 0);
        const withoutRevenue = stores.filter((store: any) => Number(store.total_revenue || 0) === 0);
        const lowStock = stores.filter((store: any) => Number(store.low_stock_count || 0) > 0 || Number(store.out_of_stock_count || 0) > 0);
        return { withoutProducts, withoutRevenue, lowStock };
    }, [stores]);

    const loadOverview = async (storeId: string, force = false) => {
        if (!storeId) return;
        if (!force && overviewByStore[storeId]) return;
        setLoadingStoreId(storeId);
        try {
            const data = await adminApi.getStoreOverview(storeId);
            setOverviewByStore((current) => ({ ...current, [storeId]: data }));
        } catch (error: any) {
            showToast(error?.message || "Impossible de charger la synthèse de cette boutique.", 'error');
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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Boutiques</p>
                    <p className="mt-3 text-3xl font-black text-white">{stores.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Total chargé</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sans produit</p>
                    <p className="mt-3 text-3xl font-black text-rose-300">{storesInsights.withoutProducts.length}</p>
                    <p className="mt-1 text-xs text-slate-500">À configurer</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sans CA</p>
                    <p className="mt-3 text-3xl font-black text-amber-300">{storesInsights.withoutRevenue.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Aucune vente connue</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Stock sensible</p>
                    <p className="mt-3 text-3xl font-black text-violet-300">{storesInsights.lowStock.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Boutiques à surveiller</p>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <div>
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">Boutiques ({stores.length})</h3>
                        <p className="mt-1 text-xs text-slate-400">Chaque boutique affiche un résumé utile. Le détail complet reste accessible à la demande.</p>
                    </div>
                    <button onClick={() => void onRefresh()} className="p-2 text-slate-400 hover:text-white transition-all">
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="divide-y divide-white/5">
                    {stores.map((store: any) => {
                        const isOpen = expandedStoreId === store.store_id;
                        const overview = overviewByStore[store.store_id];
                        const currency = overview?.store?.currency || store.currency || 'XOF';
                        return (
                            <div key={store.store_id} className="px-5 py-5 space-y-4">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-primary">
                                                <Store size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-lg font-black text-white truncate">{store.name || 'Boutique sans nom'}</p>
                                                <p className="text-xs text-slate-400 truncate">{store.owner_name || store.owner_email || 'Propriétaire inconnu'} · {store.country_code || '—'} / {store.currency || '—'}</p>
                                                <p className="text-[11px] text-slate-600 truncate">{store.address || 'Adresse non renseignée'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                                            <MetricPill label="Produits" value={store.product_count ?? 0} />
                                            <MetricPill label="Valeur stock" value={formatMoney(store.stock_value || 0, currency)} tone="info" />
                                            <MetricPill label="Ruptures" value={store.out_of_stock_count || 0} tone={(store.out_of_stock_count || 0) > 0 ? 'danger' : 'default'} />
                                            <MetricPill label="Stock bas" value={store.low_stock_count || 0} tone={(store.low_stock_count || 0) > 0 ? 'warning' : 'default'} />
                                            <MetricPill label="Alertes" value={store.active_alerts_count || 0} tone={(store.critical_alerts_count || 0) > 0 ? 'danger' : 'default'} />
                                            <MetricPill label="Clients" value={store.customer_count || 0} />
                                            <MetricPill label="Fournisseurs" value={store.supplier_count || 0} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => focusInventory(store.store_id)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-100 hover:bg-white/10">
                                            Voir le stock
                                        </button>
                                        <button
                                            onClick={() => void toggleStore(store.store_id)}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/20"
                                        >
                                            {isOpen ? 'Réduire' : 'Analyser'}
                                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    loadingStoreId === store.store_id && !overview ? (
                                        <div className="rounded-3xl border border-white/10 bg-slate-950/50 px-6 py-10 text-center text-slate-400">
                                            <RefreshCw size={18} className="mx-auto mb-3 animate-spin" />
                                            Chargement de la synthèse de la boutique...
                                        </div>
                                    ) : overview ? (
                                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
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
                                            Impossible de charger la synthèse de cette boutique.
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })}
                    {stores.length === 0 && (
                        <div className="px-6 py-16 text-center text-slate-500">Aucune boutique</div>
                    )}
                </div>
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
