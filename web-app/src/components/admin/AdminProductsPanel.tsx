'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, ShieldOff, Store, Trash2 } from 'lucide-react';
import { admin as adminApi } from '../../services/api';
import { BUSINESS_SECTORS, getBusinessSectorLabel } from '../../data/businessSectors';

type ToastType = 'success' | 'error';

type AdminProductsPanelProps = {
    refreshToken: number;
    showToast: (message: string, type?: ToastType) => void;
};

type AdminProduct = {
    product_id: string;
    name: string;
    category?: string | null;
    quantity?: number | null;
    selling_price?: number | null;
    store_id?: string | null;
    store_name?: string | null;
    business_sector?: string | null;
    business_sector_label?: string | null;
    business_type?: string | null;
    owner_info?: {
        name?: string | null;
        email?: string | null;
    } | null;
    is_active?: boolean | null;
    updated_at?: string | null;
};

type AdminStoreOption = {
    store_id: string;
    name: string;
    owner_name?: string;
};

type ProductFilters = {
    search: string;
    store_id: string;
    business_sector: string;
    status: 'all' | 'active' | 'inactive';
    min_stock: string;
};

const DEFAULT_FILTERS: ProductFilters = {
    search: '',
    store_id: '',
    business_sector: '',
    status: 'all',
    min_stock: '',
};

function formatMoney(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    return `${Number(value).toLocaleString('fr-FR')} F`;
}

function formatDate(value?: string | null) {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AdminProductsPanel({ refreshToken, showToast }: AdminProductsPanelProps) {
    const [stores, setStores] = useState<AdminStoreOption[]>([]);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [draftFilters, setDraftFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
    const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);

    const loadStores = async () => {
        try {
            const response = await adminApi.listStores(0, 200);
            const items = Array.isArray(response?.items) ? response.items : [];
            setStores(items.map((store: any) => ({
                store_id: store.store_id,
                name: store.name || 'Boutique sans nom',
                owner_name: store.owner_name || 'Inconnu',
            })));
        } catch {
            showToast("Impossible de charger les boutiques.", 'error');
        }
    };

    const loadProducts = async (nextFilters: ProductFilters) => {
        const params: {
            search?: string;
            store_id?: string;
            business_sector?: string;
            is_active?: boolean;
            min_stock?: number;
            limit: number;
        } = { limit: 200 };

        if (nextFilters.search.trim()) params.search = nextFilters.search.trim();
        if (nextFilters.store_id) params.store_id = nextFilters.store_id;
        if (nextFilters.business_sector) params.business_sector = nextFilters.business_sector;
        if (nextFilters.status === 'active') params.is_active = true;
        if (nextFilters.status === 'inactive') params.is_active = false;
        if (nextFilters.min_stock.trim()) {
            const numeric = Number(nextFilters.min_stock);
            if (Number.isFinite(numeric)) params.min_stock = numeric;
        }

        const response = await adminApi.listAllProducts(params);
        setProducts(Array.isArray(response?.items) ? response.items : []);
        setTotal(Number(response?.total || 0));
    };

    useEffect(() => {
        void loadStores();
    }, []);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                setLoading(true);
                await loadProducts(filters);
            } catch {
                if (!cancelled) {
                    showToast("Impossible de charger les produits.", 'error');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [filters, refreshToken]);

    const stats = useMemo(() => {
        const activeCount = products.filter((product) => product.is_active !== false).length;
        const inactiveCount = products.length - activeCount;
        const lowStockCount = products.filter((product) => Number(product.quantity || 0) <= 5).length;
        return { activeCount, inactiveCount, lowStockCount };
    }, [products]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await loadProducts(filters);
        } catch {
            showToast("Impossible d'actualiser les produits.", 'error');
        } finally {
            setRefreshing(false);
        }
    };

    const handleToggle = async (product: AdminProduct) => {
        setTogglingProductId(product.product_id);
        try {
            const response = await adminApi.toggleProduct(product.product_id);
            setProducts((current) =>
                current.map((item) =>
                    item.product_id === product.product_id
                        ? { ...item, is_active: response?.is_active ?? !item.is_active }
                        : item,
                ),
            );
            showToast(
                response?.is_active === false
                    ? 'Produit retiré de la vente.'
                    : 'Produit remis en vente.',
            );
        } catch {
            showToast("Impossible de modifier l'état du produit.", 'error');
        } finally {
            setTogglingProductId(null);
        }
    };

    const handleDelete = async (product: AdminProduct) => {
        const confirmed = window.confirm(`Supprimer définitivement "${product.name}" ?`);
        if (!confirmed) return;
        setDeletingProductId(product.product_id);
        try {
            await adminApi.deleteProduct(product.product_id);
            setProducts((current) => current.filter((item) => item.product_id !== product.product_id));
            setTotal((current) => Math.max(0, current - 1));
            showToast('Produit supprimé.');
        } catch {
            showToast("Impossible de supprimer ce produit.", 'error');
        } finally {
            setDeletingProductId(null);
        }
    };

    const submitFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFilters(draftFilters);
    };

    const resetFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setFilters(DEFAULT_FILTERS);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Produits remontés</div>
                    <div className="text-3xl font-black text-white">{total}</div>
                    <div className="text-sm text-slate-400 mt-2">Produits visibles avec les filtres actifs.</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">En vente</div>
                    <div className="text-3xl font-black text-emerald-400">{stats.activeCount}</div>
                    <div className="text-sm text-slate-400 mt-2">Produits actuellement actifs.</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Masqués</div>
                    <div className="text-3xl font-black text-amber-400">{stats.inactiveCount}</div>
                    <div className="text-sm text-slate-400 mt-2">Produits retirés de la vente.</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Stock faible</div>
                    <div className="text-3xl font-black text-rose-400">{stats.lowStockCount}</div>
                    <div className="text-sm text-slate-400 mt-2">Quantité inférieure ou égale à 5.</div>
                </div>
            </div>

            <div className="glass-card p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-xl font-black text-white">Produits en vente</h2>
                        <p className="text-sm text-slate-400">
                            Filtrer par boutique et par type de business, puis retirer ou remettre un produit en vente.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleRefresh()}
                        disabled={refreshing || loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold hover:bg-white/10 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Actualiser
                    </button>
                </div>

                <form onSubmit={submitFilters} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
                    <input
                        value={draftFilters.search}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                        placeholder="Rechercher un produit, un code-barres..."
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-primary"
                    />
                    <select
                        value={draftFilters.store_id}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, store_id: event.target.value }))}
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                    >
                        <option value="">Toutes les boutiques</option>
                        {stores.map((store) => (
                            <option key={store.store_id} value={store.store_id}>
                                {store.name} — {store.owner_name || 'Inconnu'}
                            </option>
                        ))}
                    </select>
                    <select
                        value={draftFilters.business_sector}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, business_sector: event.target.value }))}
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                    >
                        <option value="">Tous les secteurs</option>
                        {BUSINESS_SECTORS.map((sector) => (
                            <option key={sector.key} value={sector.key}>
                                {sector.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={draftFilters.status}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as ProductFilters['status'] }))}
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="active">En vente</option>
                        <option value="inactive">Masqués</option>
                    </select>
                    <div className="flex gap-3">
                        <input
                            value={draftFilters.min_stock}
                            onChange={(event) => setDraftFilters((current) => ({ ...current, min_stock: event.target.value }))}
                            placeholder="Stock max."
                            inputMode="numeric"
                            className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-primary"
                        />
                        <button
                            type="submit"
                            className="px-4 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
                        >
                            Appliquer
                        </button>
                    </div>
                </form>

                <div className="flex justify-end mb-4">
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Réinitialiser les filtres
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-400">Chargement des produits…</div>
                ) : products.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        Aucun produit ne correspond aux filtres sélectionnés.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500 border-b border-white/10">
                                    <th className="py-3 pr-4">Produit</th>
                                    <th className="py-3 pr-4">Boutique</th>
                                    <th className="py-3 pr-4">Business</th>
                                    <th className="py-3 pr-4">Stock</th>
                                    <th className="py-3 pr-4">Prix</th>
                                    <th className="py-3 pr-4">Statut</th>
                                    <th className="py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => {
                                    const isLowStock = Number(product.quantity || 0) <= 5;
                                    const isActive = product.is_active !== false;
                                    return (
                                        <tr key={product.product_id} className="border-b border-white/5 align-top">
                                            <td className="py-4 pr-4">
                                                <div className="font-bold text-white">{product.name}</div>
                                                <div className="text-sm text-slate-400">
                                                    {product.category || 'Sans catégorie'}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Mise à jour : {formatDate(product.updated_at)}
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4">
                                                <div className="inline-flex items-center gap-2 text-white font-medium">
                                                    <Store size={15} className="text-slate-500" />
                                                    {product.store_name || 'Boutique inconnue'}
                                                </div>
                                                <div className="text-sm text-slate-400 mt-1">
                                                    {product.owner_info?.name || 'Inconnu'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {product.owner_info?.email || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4">
                                                <div className="text-white font-medium">
                                                    {product.business_sector_label || getBusinessSectorLabel(product.business_sector)}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    {product.business_type || 'Non renseigné'}
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4">
                                                <div className={`font-black ${isLowStock ? 'text-rose-400' : 'text-white'}`}>
                                                    {Number(product.quantity || 0).toLocaleString('fr-FR')}
                                                </div>
                                                {isLowStock && (
                                                    <div className="inline-flex items-center gap-1 text-xs text-rose-300 mt-1">
                                                        <AlertTriangle size={12} />
                                                        Stock faible
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 text-white font-medium">
                                                {formatMoney(product.selling_price)}
                                            </td>
                                            <td className="py-4 pr-4">
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                                                    {isActive ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                                                    {isActive ? 'En vente' : 'Masqué'}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleToggle(product)}
                                                        disabled={togglingProductId === product.product_id}
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                                                    >
                                                        {isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                                                        {togglingProductId === product.product_id ? 'Mise à jour…' : isActive ? 'Retirer' : 'Remettre'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(product)}
                                                        disabled={deletingProductId === product.product_id}
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold hover:bg-rose-500/15 disabled:opacity-50"
                                                    >
                                                        <Trash2 size={14} />
                                                        {deletingProductId === product.product_id ? 'Suppression…' : 'Supprimer'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
