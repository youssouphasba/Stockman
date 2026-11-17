'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type Props = {
    view: 'usage' | 'coverage';
    refreshToken?: number;
    showToast: (message: string, type?: 'success' | 'error') => void;
};

const PAGE_SIZE = 50;
const FILTERS = [
    { key: 'used', label: 'Les plus utilisées' },
    { key: 'never', label: 'Jamais utilisées' },
    { key: 'price', label: 'Écart de prix' },
    { key: 'pending', label: 'En attente de relecture' },
] as const;

function Tile({ label, value, hint, tone = 'text-white' }: { label: string; value: any; hint?: string; tone?: string }) {
    return (
        <div className="glass-card p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p>
            {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
        </div>
    );
}

// Catalogue, sous-onglets Usage et prix / Couverture.
export default function AdminCatalogUsage({ view, refreshToken = 0, showToast }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('used');
    const [search, setSearch] = useState('');
    const [sector, setSector] = useState('');
    const [page, setPage] = useState(0);
    const requestId = useRef(0);

    const load = async (refresh = false) => {
        const current = ++requestId.current;
        setLoading(true);
        try {
            const result = await adminApi.getCatalogUsage(refresh);
            if (current === requestId.current) setData(result);
        } catch (error: any) {
            if (current === requestId.current) showToast(error?.message || 'Impossible de charger l’usage du catalogue.', 'error');
        } finally {
            if (current === requestId.current) setLoading(false);
        }
    };

    useEffect(() => {
        void load(refreshToken > 0);
        // showToast change à chaque rendu du tableau de bord.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshToken]);

    useEffect(() => { setPage(0); }, [filter, search, sector]);

    const sectors = useMemo(() => Array.from(new Set((data?.items || []).map((row: any) => row.sector).filter(Boolean))).sort() as string[], [data]);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        let result: any[] = (data?.items || []).filter((row: any) =>
            (!sector || row.sector === sector)
            && (!term || String(row.display_name || '').toLowerCase().includes(term) || String(row.category || '').toLowerCase().includes(term)));
        if (filter === 'used') result = result.filter(row => row.visible).sort((a, b) => b.matched_stores - a.matched_stores || b.selling_stores_30d - a.selling_stores_30d);
        if (filter === 'never') result = result.filter(row => row.visible && !row.matched_stores).sort((a, b) => String(a.display_name).localeCompare(String(b.display_name), 'fr'));
        if (filter === 'price') result = result.filter(row => row.price_alert);
        if (filter === 'pending') result = result.filter(row => !row.visible).sort((a, b) => b.matched_stores - a.matched_stores);
        return result;
    }, [data, filter, search, sector]);

    const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const summary = data?.summary;
    const coverage = data?.coverage;

    const header = (
        <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
            {data?.computed_at ? <span>Données du {new Date(data.computed_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}, recalculées toutes les 5 minutes</span> : null}
            <button onClick={() => void load(true)} className="p-2 text-slate-400 hover:text-white" title="Recalculer maintenant">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
    );

    if (!data) {
        return (
            <div className="space-y-4">
                {header}
                <div className="glass-card py-16 text-center text-slate-400">
                    {loading ? <Loader2 className="mx-auto animate-spin" size={20} /> : 'Aucune donnée.'}
                </div>
            </div>
        );
    }

    if (view === 'coverage') {
        return (
            <div className="space-y-6">
                {header}
                <div className="glass-card p-6">
                    <h3 className="text-base font-black text-white">Couverture du catalogue par secteur et par pays</h3>
                    <p className="mt-1 text-xs text-slate-400">
                        Chaque case indique le nombre de fiches proposées aux commerçants, puis le nombre de commerçants de ce secteur dans ce pays.
                        Une fiche sans pays compte pour tous les pays. En orange : des commerçants mais moins de {coverage?.thin_threshold} fiches.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                    <th className="py-2 pr-4">Secteur</th>
                                    {(coverage?.countries || []).map((code: string) => <th key={code} className="py-2 px-2 text-center">{code}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(coverage?.rows || []).map((row: any) => (
                                    <tr key={row.sector}>
                                        <td className="py-2 pr-4 font-semibold text-slate-100 whitespace-nowrap">{row.sector_label}</td>
                                        {row.cells.map((cell: any) => (
                                            <td key={cell.country_code} className="py-1.5 px-1 text-center">
                                                <span
                                                    className={`inline-block min-w-[64px] rounded-lg px-2 py-1 text-xs ${cell.thin ? 'bg-amber-500/15 text-amber-200' : cell.entries ? 'bg-white/5 text-slate-200' : 'text-slate-600'}`}
                                                    title={`${cell.entries} fiche(s) proposée(s), ${cell.merchants} commerçant(s)`}
                                                >
                                                    <span className="font-black">{cell.entries}</span>
                                                    <span className="text-slate-500"> · {cell.merchants}</span>
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-base font-black text-white">À compléter en priorité</h3>
                    <p className="mt-1 text-xs text-slate-400">Secteurs et pays où des commerçants sont inscrits mais où le catalogue est maigre, du plus grand nombre de commerçants au plus petit.</p>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {(coverage?.gaps || []).map((gap: any) => (
                            <div key={`${gap.sector}-${gap.country_code}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
                                <p className="font-bold text-white">{gap.sector_label} · {gap.country_code}</p>
                                <p className="text-xs text-slate-400">{gap.entries} fiche(s) pour {gap.merchants} commerçant(s)</p>
                            </div>
                        ))}
                        {!(coverage?.gaps || []).length && <p className="text-xs text-slate-500">Aucun manque important.</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {header}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <Tile label="Fiches proposées" value={summary?.visible ?? 0} hint={`${(summary?.entries || 0) - (summary?.visible || 0)} en attente de relecture`} />
                <Tile label="Jamais utilisées" value={summary?.never_used ?? 0} hint="Aucune boutique ne les a" tone="text-amber-300" />
                <Tile label="Vendues sur 30 j" value={summary?.selling_30d ?? 0} hint="Fiches proposées vendues au moins une fois" tone="text-emerald-300" />
                <Tile label="Imports suivis" value={summary?.imported_links ?? 0} hint="Produits ajoutés depuis le catalogue depuis le suivi" />
                <Tile label="Écarts de prix" value={summary?.price_alerts ?? 0} hint="Prix de référence à revoir" tone="text-rose-300" />
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-white/5 space-y-3">
                    <p className="text-xs text-slate-400">
                        Une boutique « a » une fiche quand un de ses produits vient du catalogue, ou porte le même code-barres ou le même nom.
                        Les produits ajoutés depuis le catalogue avant le suivi sont reconnus de cette façon. L’écart de prix n’est calculé que pour les fiches liées à un seul pays, avec au moins 3 prix observés.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map(option => (
                            <button
                                key={option.key}
                                onClick={() => setFilter(option.key)}
                                className={`rounded-xl px-3 py-2 text-xs font-bold border ${filter === option.key ? 'border-primary/30 bg-primary/15 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                        <div className="relative flex-1 min-w-48">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nom ou catégorie..." className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-8 pr-3 text-sm text-white focus:border-primary/50 focus:outline-none" />
                        </div>
                        <select value={sector} onChange={event => setSector(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white">
                            <option value="">Tous les secteurs</option>
                            {sectors.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                <th className="px-5 py-3">Fiche</th>
                                <th className="px-5 py-3 text-right">Boutiques qui l’ont</th>
                                <th className="px-5 py-3 text-right">Vendue sur 30 j</th>
                                <th className="px-5 py-3 text-right">Prix de référence</th>
                                <th className="px-5 py-3">Prix observés (médiane par pays)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {pageRows.map((row: any) => (
                                <tr key={row.catalog_id} className="align-top">
                                    <td className="px-5 py-3">
                                        <p className="font-bold text-white">{row.display_name}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {[row.sector, row.category, row.country_codes?.length ? row.country_codes.join(', ') : 'Tous pays'].filter(Boolean).join(' · ')}
                                        </p>
                                        {!row.visible ? <p className="text-[11px] font-bold text-amber-300">En attente de relecture : pas encore proposée aux commerçants</p> : null}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <p className="font-bold text-white">{row.matched_stores}</p>
                                        <p className="text-[11px] text-slate-500">dont {row.imported_stores} ajout(s) suivi(s)</p>
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        <p className="font-bold text-white">{row.selling_stores_30d} boutique(s)</p>
                                        <p className="text-[11px] text-slate-500">{Number(row.quantity_30d || 0).toLocaleString('fr-FR')} vendu(s)</p>
                                    </td>
                                    <td className="px-5 py-3 text-right text-slate-300">{row.reference_price ? Number(row.reference_price).toLocaleString('fr-FR') : '—'}</td>
                                    <td className="px-5 py-3 text-xs">
                                        {(row.observed_prices || []).length ? (
                                            <div className="space-y-0.5">
                                                {row.observed_prices.map((price: any) => (
                                                    <p key={price.country_code} className="text-slate-300">
                                                        <span className="text-slate-500">{price.country_code}</span> {Number(price.median).toLocaleString('fr-FR')}
                                                        <span className="text-slate-600"> ({price.count})</span>
                                                        {price.drift_pct !== null && price.drift_pct !== undefined ? (
                                                            <span className={`ml-1.5 font-bold ${Math.abs(price.drift_pct) >= 30 ? 'text-rose-300' : 'text-slate-400'}`}>
                                                                {price.drift_pct > 0 ? '+' : ''}{Number(price.drift_pct).toLocaleString('fr-FR')} %
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                ))}
                                            </div>
                                        ) : <span className="text-slate-600">Aucun prix renseigné</span>}
                                    </td>
                                </tr>
                            ))}
                            {!pageRows.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-500">Aucune fiche pour ce filtre.</td></tr>}
                        </tbody>
                    </table>
                </div>
                {rows.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between gap-3 border-t border-white/5 px-5 py-3 text-xs text-slate-400">
                        <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} sur {rows.length}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-40"><ChevronLeft size={13} /> Précédent</button>
                            <span>Page {page + 1} / {pageCount}</span>
                            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-40">Suivant <ChevronRight size={13} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
