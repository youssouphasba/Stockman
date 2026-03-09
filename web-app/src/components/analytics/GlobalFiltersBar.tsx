'use client';

import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { useAnalyticsFilters } from '../../contexts/AnalyticsFiltersContext';

export default function GlobalFiltersBar() {
    const { filters, meta, metaLoading, setFilter, resetFilters } = useAnalyticsFilters();

    return (
        <div className="mx-6 mt-6 rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-4 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.95)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <Filter size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Filtres analytiques</p>
                        <p className="text-xs text-slate-400">Une base commune pour le cockpit exécutif et la vue multi-boutiques.</p>
                    </div>
                </div>
                <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                    <RotateCcw size={14} />
                    Réinitialiser
                </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end">
                <div className="flex flex-wrap gap-2">
                    {(meta.periods || []).map((period) => (
                        <button
                            key={period.days}
                            onClick={() => setFilter('days', period.days)}
                            className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
                                filters.days === period.days
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white'
                            }`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>

                <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Magasin</span>
                        <select
                            value={filters.storeId}
                            onChange={(event) => setFilter('storeId', event.target.value)}
                            disabled={metaLoading}
                            className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-primary/40 disabled:opacity-60"
                        >
                            <option value="">Tous les magasins</option>
                            {meta.stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Catégorie</span>
                        <select
                            value={filters.categoryId}
                            onChange={(event) => setFilter('categoryId', event.target.value)}
                            disabled={metaLoading}
                            className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-primary/40 disabled:opacity-60"
                        >
                            <option value="">Toutes les catégories</option>
                            {meta.categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Fournisseur</span>
                        <select
                            value={filters.supplierId}
                            onChange={(event) => setFilter('supplierId', event.target.value)}
                            disabled={metaLoading}
                            className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-primary/40 disabled:opacity-60"
                        >
                            <option value="">Tous les fournisseurs</option>
                            {meta.suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                    {supplier.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>
        </div>
    );
}
