'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Clock, Package, RefreshCw, Search } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type Props = {
    stores: any[];
    showToast: (message: string, type?: 'success' | 'error') => void;
};

const STOCK_FILTERS = [
    ['all', 'Tous'],
    ['in_stock', 'En stock'],
    ['low_stock', 'Stock bas'],
    ['out_of_stock', 'Rupture'],
    ['overstock', 'Surstock'],
    ['expired', 'Expirés'],
    ['expiring_soon', 'À surveiller'],
] as const;

function formatMoney(amount: any, currency: string) {
    const numeric = Number(amount || 0);
    const suffix = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency || '';
    if (currency === 'EUR') return `${numeric.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    return `${numeric.toLocaleString('fr-FR')} ${suffix}`.trim();
}

function formatDate(value: any) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatQuantity(value: any, unit?: string) {
    const numeric = Number(value || 0);
    const quantity = Number.isInteger(numeric) ? numeric.toLocaleString('fr-FR') : numeric.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    return `${quantity}${unit ? ` ${unit}` : ''}`;
}

function stockLabel(status: string) {
    if (status === 'out_of_stock') return 'Rupture';
    if (status === 'low_stock') return 'Stock bas';
    if (status === 'overstock') return 'Surstock';
    return 'En stock';
}

function stockClass(status: string) {
    if (status === 'out_of_stock') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    if (status === 'low_stock') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    if (status === 'overstock') return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
}

function expiryLabel(status: string) {
    if (status === 'expired') return 'Expiré';
    if (status === 'expiring_soon') return 'À surveiller';
    if (status === 'ok') return 'Valide';
    return 'Non renseigné';
}

function expiryClass(status: string) {
    if (status === 'expired') return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    if (status === 'expiring_soon') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    if (status === 'ok') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    return 'border-slate-500/20 bg-slate-500/10 text-slate-400';
}

export default function AdminStoreInventoryPanel({ stores, showToast }: Props) {
    const [storeId, setStoreId] = useState('');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const selectedStore = useMemo(
        () => stores.find((store) => store.store_id === storeId) || stores[0] || null,
        [stores, storeId],
    );

    useEffect(() => {
        if (!storeId && stores[0]?.store_id) {
            setStoreId(stores[0].store_id);
        }
    }, [storeId, stores]);

    const loadInventory = async (targetStoreId = selectedStore?.store_id, targetFilter = filter, targetSearch = search) => {
        if (!targetStoreId) return;
        setLoading(true);
        try {
            const response = await adminApi.getStoreInventory(targetStoreId, {
                stock_status: targetFilter,
                search: targetSearch.trim() || undefined,
                limit: 1000,
            });
            setData(response);
        } catch {
            showToast("Impossible de charger l'inventaire de cette boutique.", 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStore?.store_id) {
            void loadInventory(selectedStore.store_id, filter, search);
        }
    }, [selectedStore?.store_id]);

    const summary = data?.summary || {};
    const currency = data?.store?.currency || selectedStore?.currency || 'XOF';
    const products = data?.products || [];

    return (
        <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/5 bg-white/5 space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">Inventaire par boutique</h3>
                        <p className="mt-1 text-xs text-slate-500">Produits, état de stock, lots, péremptions et alertes actives.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={selectedStore?.store_id || ''}
                            onChange={(event) => {
                                setStoreId(event.target.value);
                                setFilter('all');
                                setSearch('');
                            }}
                            className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-white outline-none"
                        >
                            {stores.map((store) => (
                                <option key={store.store_id} value={store.store_id}>{store.name || store.store_id}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => void loadInventory()}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-black text-primary hover:bg-primary/20"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <Package size={18} className="text-primary" />
                        <p className="mt-2 text-2xl font-black text-white">{summary.total_products || 0}</p>
                        <p className="text-[11px] text-slate-500">Produits</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <p className="text-2xl font-black text-emerald-300">{summary.in_stock || 0}</p>
                        <p className="text-[11px] text-emerald-200/70">En stock</p>
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                        <p className="text-2xl font-black text-amber-300">{summary.low_stock || 0}</p>
                        <p className="text-[11px] text-amber-200/70">Stock bas</p>
                    </div>
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                        <p className="text-2xl font-black text-rose-300">{summary.out_of_stock || 0}</p>
                        <p className="text-[11px] text-rose-200/70">Ruptures</p>
                    </div>
                    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
                        <Clock size={18} className="text-orange-300" />
                        <p className="mt-2 text-2xl font-black text-orange-300">{summary.expiring_soon || 0}</p>
                        <p className="text-[11px] text-orange-200/70">À surveiller</p>
                    </div>
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                        <p className="text-2xl font-black text-rose-300">{summary.expired || 0}</p>
                        <p className="text-[11px] text-rose-200/70">Expirés</p>
                    </div>
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                        <p className="text-lg font-black text-sky-300">{formatMoney(summary.stock_value || 0, currency)}</p>
                        <p className="text-[11px] text-sky-200/70">Valeur stock</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {STOCK_FILTERS.map(([value, label]) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setFilter(value);
                                    void loadInventory(selectedStore?.store_id, value, search);
                                }}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${filter === value ? 'border-primary bg-primary text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950 px-3 py-2">
                        <Search size={15} className="text-slate-500" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') void loadInventory();
                            }}
                            placeholder="Rechercher un produit, SKU ou code-barres"
                            className="w-72 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                            <th className="px-6 py-4">Produit</th>
                            <th className="px-6 py-4">Stock</th>
                            <th className="px-6 py-4">Valeur</th>
                            <th className="px-6 py-4">Péremption</th>
                            <th className="px-6 py-4">Lots</th>
                            <th className="px-6 py-4">Alertes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                                    <RefreshCw size={18} className="mx-auto mb-3 animate-spin" />
                                    Chargement de l'inventaire...
                                </td>
                            </tr>
                        ) : products.length ? products.map((product: any) => (
                            <tr key={product.product_id} className="hover:bg-white/5 transition-all">
                                <td className="px-6 py-4">
                                    <p className="text-white font-bold">{product.name || 'Produit sans nom'}</p>
                                    <p className="text-[11px] text-slate-500">{product.sku || product.barcode || product.product_id || 'Référence absente'}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${stockClass(product.stock_status)}`}>
                                        {stockLabel(product.stock_status)}
                                    </span>
                                    <p className="mt-2 text-xs text-slate-300">{formatQuantity(product.quantity, product.unit)}</p>
                                    <p className="text-[10px] text-slate-500">Min. {formatQuantity(product.min_stock || 0, product.unit)}</p>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <p className="font-black text-emerald-300">{formatMoney(product.stock_value || 0, currency)}</p>
                                    <p className="text-slate-500">Coût {formatMoney(product.purchase_price || 0, currency)}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${expiryClass(product.expiry_status)}`}>
                                        {expiryLabel(product.expiry_status)}
                                    </span>
                                    <p className="mt-2 text-xs text-slate-400">{formatDate(product.nearest_expiry_date)}</p>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">
                                    {(product.batches || []).length ? product.batches.map((batch: any) => (
                                        <div key={batch.batch_id || batch.batch_number} className="mb-1 rounded-lg bg-white/5 px-2 py-1">
                                            <span className="font-bold text-slate-300">{batch.batch_number || 'Lot'}</span>
                                            <span className="ml-2">{formatQuantity(batch.quantity, product.unit)}</span>
                                            <span className="ml-2">{formatDate(batch.expiry_date)}</span>
                                        </div>
                                    )) : <span className="text-slate-600">Aucun lot actif</span>}
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">
                                    {product.active_alerts_count ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-300">
                                            <AlertCircle size={12} />
                                            {product.active_alerts_count}
                                        </span>
                                    ) : 'Aucune'}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-600">Aucun produit pour ce filtre</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
