'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, GitMerge, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { admin as adminApi } from '../../services/api';
import { BUSINESS_SECTORS, getBusinessSectorLabel } from '../../data/businessSectors';

type ToastType = 'success' | 'error';

type AdminCatalogPanelProps = {
    refreshToken: number;
    showToast: (message: string, type?: ToastType) => void;
};

type AdminCatalogEntry = {
    catalog_id: string;
    display_name: string;
    category?: string | null;
    sector?: string | null;
    country_codes?: string[] | null;
    barcodes?: string[] | null;
    aliases?: string[] | null;
    image_url?: string | null;
    added_by_count?: number | null;
    verified?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type CatalogFilters = {
    search: string;
    sector: string;
    country: string;
    verified: 'all' | 'verified' | 'pending';
};

type CatalogFormState = {
    display_name: string;
    category: string;
    sector: string;
    barcodes: string;
    aliases: string;
    country_codes: string;
    image_url: string;
    added_by_count: string;
    verified: boolean;
};

const DEFAULT_FILTERS: CatalogFilters = { search: '', sector: '', country: '', verified: 'all' };
const DEFAULT_FORM: CatalogFormState = {
    display_name: '',
    category: '',
    sector: 'epicerie',
    barcodes: '',
    aliases: '',
    country_codes: 'SN',
    image_url: '',
    added_by_count: '1',
    verified: true,
};

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

function listToInput(value?: string[] | null) {
    return (value || []).join(', ');
}

function inputToList(value: string) {
    return value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeCatalogText(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function makeFormState(entry?: AdminCatalogEntry | null): CatalogFormState {
    if (!entry) return DEFAULT_FORM;
    return {
        display_name: entry.display_name || '',
        category: entry.category || '',
        sector: entry.sector || 'epicerie',
        barcodes: listToInput(entry.barcodes),
        aliases: listToInput(entry.aliases),
        country_codes: listToInput(entry.country_codes),
        image_url: entry.image_url || '',
        added_by_count: String(entry.added_by_count || 1),
        verified: entry.verified !== false,
    };
}

export default function AdminCatalogPanel({ refreshToken, showToast }: AdminCatalogPanelProps) {
    const [stats, setStats] = useState<any>(null);
    const [items, setItems] = useState<AdminCatalogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [draftFilters, setDraftFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
    const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [mergeKeepId, setMergeKeepId] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AdminCatalogEntry | null>(null);
    const [form, setForm] = useState<CatalogFormState>(DEFAULT_FORM);

    const loadData = async (nextFilters: CatalogFilters) => {
        const params: { search?: string; sector?: string; country?: string; verified?: boolean; limit: number } = { limit: 200 };
        if (nextFilters.search.trim()) params.search = nextFilters.search.trim();
        if (nextFilters.sector) params.sector = nextFilters.sector;
        if (nextFilters.country) params.country = nextFilters.country;
        if (nextFilters.verified === 'verified') params.verified = true;
        if (nextFilters.verified === 'pending') params.verified = false;

        const [statsResponse, listResponse] = await Promise.all([
            adminApi.getCatalogStats(),
            adminApi.listCatalogProducts(params),
        ]);

        setStats(statsResponse);
        setItems(Array.isArray(listResponse?.products) ? listResponse.products : []);
        setTotal(Number(listResponse?.total || 0));
    };

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            try {
                setLoading(true);
                await loadData(filters);
            } catch {
                if (!cancelled) showToast("Impossible de charger le catalogue global.", 'error');
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

    useEffect(() => {
        const ids = Array.from(selectedIds);
        if (!ids.length) {
            setMergeKeepId('');
            return;
        }
        if (!mergeKeepId || !selectedIds.has(mergeKeepId)) setMergeKeepId(ids[0]);
    }, [mergeKeepId, selectedIds]);

    const selectedEntries = useMemo(
        () => items.filter((item) => selectedIds.has(item.catalog_id)),
        [items, selectedIds],
    );

    const dominantSector = Object.entries(stats?.by_sector || {}).sort(
        (a: any, b: any) => Number(b[1]) - Number(a[1]),
    )[0]?.[0];

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            await loadData(filters);
        } catch {
            showToast("Impossible d'actualiser le catalogue.", 'error');
        } finally {
            setRefreshing(false);
        }
    };

    const openCreate = () => {
        setEditingEntry(null);
        setForm(DEFAULT_FORM);
        setEditorOpen(true);
    };

    const openEdit = (entry: AdminCatalogEntry) => {
        setEditingEntry(entry);
        setForm(makeFormState(entry));
        setEditorOpen(true);
    };

    const closeEditor = () => {
        if (saving) return;
        setEditorOpen(false);
        setEditingEntry(null);
        setForm(DEFAULT_FORM);
    };

    const submitFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFilters(draftFilters);
    };

    const resetFilters = () => {
        setDraftFilters(DEFAULT_FILTERS);
        setFilters(DEFAULT_FILTERS);
    };

    const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        try {
            const displayName = form.display_name.trim();
            const category = form.category.trim();
            const imageUrl = form.image_url.trim() || undefined;
            const barcodes = Array.from(new Set(inputToList(form.barcodes)));
            const aliases = Array.from(new Set(inputToList(form.aliases)));
            const countryCodes = Array.from(new Set(inputToList(form.country_codes).map((item) => item.toUpperCase())));

            if (!displayName) {
                showToast('Le nom du produit est obligatoire.', 'error');
                return;
            }

            const normalizedName = normalizeCatalogText(displayName);
            const duplicate = items.find((entry) => {
                if (editingEntry && entry.catalog_id === editingEntry.catalog_id) return false;
                const sameSector = (entry.sector || 'autre') === (form.sector || 'autre');
                if (!sameSector) return false;
                const entryName = normalizeCatalogText(entry.display_name || '');
                if (entryName && entryName === normalizedName) return true;
                const entryBarcodes = (entry.barcodes || []).map((item) => String(item).trim()).filter(Boolean);
                return barcodes.some((barcode) => entryBarcodes.includes(barcode));
            });

            if (duplicate) {
                showToast(
                    `Un produit catalogue similaire existe déjà (${duplicate.display_name}).`,
                    'error',
                );
                return;
            }

            const payload = {
                display_name: displayName,
                category: category || undefined,
                sector: form.sector,
                barcodes,
                aliases,
                country_codes: countryCodes,
                image_url: imageUrl,
                verified: form.verified,
                added_by_count: Math.max(1, Number(form.added_by_count || '1')),
            };

            if (editingEntry) {
                await adminApi.updateCatalogProduct(editingEntry.catalog_id, payload);
                showToast('Produit catalogue mis à jour.');
            } else {
                await adminApi.createCatalogProduct(payload);
                showToast('Produit catalogue ajouté.');
            }

            closeEditor();
            await loadData(filters);
        } catch (error: any) {
            const rawMessage = typeof error?.message === 'string' ? error.message : '';
            const message = rawMessage || "Impossible d'enregistrer ce produit catalogue.";
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleVerify = async (entry: AdminCatalogEntry) => {
        setVerifyingId(entry.catalog_id);
        try {
            await adminApi.verifyCatalogProduct(entry.catalog_id);
            setItems((current) => current.map((item) => (item.catalog_id === entry.catalog_id ? { ...item, verified: true } : item)));
            showToast('Produit catalogue vérifié.');
        } catch {
            showToast("Impossible de vérifier ce produit catalogue.", 'error');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleDelete = async (entry: AdminCatalogEntry) => {
        const confirmed = window.confirm(`Supprimer "${entry.display_name}" du catalogue global ?`);
        if (!confirmed) return;
        setDeletingId(entry.catalog_id);
        try {
            await adminApi.deleteCatalogProduct(entry.catalog_id);
            setItems((current) => current.filter((item) => item.catalog_id !== entry.catalog_id));
            setSelectedIds((current) => {
                const next = new Set(current);
                next.delete(entry.catalog_id);
                return next;
            });
            setTotal((current) => Math.max(0, current - 1));
            showToast('Produit catalogue supprimé.');
        } catch {
            showToast("Impossible de supprimer ce produit catalogue.", 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleMerge = async () => {
        const mergeIds = Array.from(selectedIds).filter((catalogId) => catalogId !== mergeKeepId);
        if (!mergeKeepId || mergeIds.length === 0) {
            showToast('Sélectionne au moins deux produits et choisis celui à conserver.', 'error');
            return;
        }
        try {
            await adminApi.mergeCatalogProducts(mergeKeepId, mergeIds);
            setSelectedIds(new Set());
            setMergeKeepId('');
            await loadData(filters);
            showToast('Produits catalogue fusionnés.');
        } catch {
            showToast("Impossible de fusionner ces produits catalogue.", 'error');
        }
    };

    const toggleSelection = (catalogId: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(catalogId)) next.delete(catalogId);
            else next.add(catalogId);
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Catalogue total</div>
                    <div className="text-3xl font-black text-white">{stats?.total_products ?? total}</div>
                    <div className="text-sm text-slate-400 mt-2">Produits disponibles pour les imports.</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Vérifiés</div>
                    <div className="text-3xl font-black text-emerald-400">{stats?.verified_products ?? 0}</div>
                    <div className="text-sm text-slate-400 mt-2">Entrées validées par l’équipe Stockman.</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">À relire</div>
                    <div className="text-3xl font-black text-amber-400">{stats?.unverified_products ?? 0}</div>
                    <div className="text-sm text-slate-400 mt-2">Entrées encore en attente de validation.</div>
                </div>
                <div className="glass-card p-5">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Secteur dominant</div>
                    <div className="text-2xl font-black text-white">{dominantSector ? getBusinessSectorLabel(dominantSector) : '—'}</div>
                    <div className="text-sm text-slate-400 mt-2">Base prioritaire pour les imports prêts à l’emploi.</div>
                </div>
            </div>

            <div className="glass-card p-6">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
                    <div>
                        <h2 className="text-xl font-black text-white">Catalogue global par secteur</h2>
                        <p className="text-sm text-slate-400">
                            Enrichir, corriger et valider les produits que les nouveaux business pourront importer.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
                        >
                            <Plus size={16} />
                            Nouveau produit
                        </button>
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
                </div>

                <form onSubmit={submitFilters} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
                    <input
                        value={draftFilters.search}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                        placeholder="Rechercher un nom, un code-barres..."
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-primary"
                    />
                    <select
                        value={draftFilters.sector}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, sector: event.target.value }))}
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
                        value={draftFilters.country}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, country: event.target.value }))}
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                    >
                        <option value="">Tous les pays</option>
                        {Object.entries(stats?.by_country || {}).sort((a, b) => Number(b[1]) - Number(a[1])).map(([code, count]) => (
                            <option key={code} value={code}>
                                {code} ({String(count)})
                            </option>
                        ))}
                    </select>
                    <select
                        value={draftFilters.verified}
                        onChange={(event) => setDraftFilters((current) => ({ ...current, verified: event.target.value as CatalogFilters['verified'] }))}
                        className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="verified">Vérifiés</option>
                        <option value="pending">À relire</option>
                    </select>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="w-full px-4 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
                        >
                            Appliquer
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </form>

                {selectedEntries.length >= 2 && (
                    <div className="mb-5 p-4 rounded-2xl border border-primary/20 bg-primary/5">
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                            <div>
                                <div className="text-sm font-bold text-white">Fusion de doublons</div>
                                <div className="text-sm text-slate-400">
                                    {selectedEntries.length} produits sélectionnés. Choisis l’entrée à conserver.
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={mergeKeepId}
                                    onChange={(event) => setMergeKeepId(event.target.value)}
                                    className="px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                >
                                    {selectedEntries.map((entry) => (
                                        <option key={entry.catalog_id} value={entry.catalog_id}>
                                            {entry.display_name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => void handleMerge()}
                                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10"
                                >
                                    <GitMerge size={16} />
                                    Fusionner
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="py-16 text-center text-slate-400">Chargement du catalogue…</div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                        Aucun produit catalogue ne correspond aux filtres sélectionnés.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500 border-b border-white/10">
                                    <th className="py-3 pr-4">Sélection</th>
                                    <th className="py-3 pr-4">Produit</th>
                                    <th className="py-3 pr-4">Secteur</th>
                                    <th className="py-3 pr-4">Pays / codes-barres</th>
                                    <th className="py-3 pr-4">Popularité</th>
                                    <th className="py-3 pr-4">Statut</th>
                                    <th className="py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((entry) => (
                                    <tr key={entry.catalog_id} className="border-b border-white/5 align-top">
                                        <td className="py-4 pr-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(entry.catalog_id)}
                                                onChange={() => toggleSelection(entry.catalog_id)}
                                                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-primary focus:ring-primary"
                                            />
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="font-bold text-white">{entry.display_name}</div>
                                            <div className="text-sm text-slate-400">{entry.category || 'Sans catégorie'}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Mis à jour : {formatDate(entry.updated_at || entry.created_at)}
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="text-white font-medium">{getBusinessSectorLabel(entry.sector)}</div>
                                            <div className="text-xs text-slate-500 mt-1">{entry.sector || 'autre'}</div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="text-white">{(entry.country_codes || []).join(', ') || '—'}</div>
                                            <div className="text-sm text-slate-400 mt-1">
                                                {(entry.barcodes || []).slice(0, 3).join(', ') || 'Aucun code-barres'}
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="text-white font-black">
                                                {Number(entry.added_by_count || 0).toLocaleString('fr-FR')}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Imports ou contributions</div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${entry.verified ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                                                <CheckCircle2 size={12} />
                                                {entry.verified ? 'Vérifié' : 'À relire'}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {!entry.verified && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleVerify(entry)}
                                                        disabled={verifyingId === entry.catalog_id}
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/15 disabled:opacity-50"
                                                    >
                                                        <CheckCircle2 size={14} />
                                                        {verifyingId === entry.catalog_id ? 'Validation…' : 'Vérifier'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(entry)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10"
                                                >
                                                    <Edit3 size={14} />
                                                    Modifier
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(entry)}
                                                    disabled={deletingId === entry.catalog_id}
                                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold hover:bg-rose-500/15 disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                    {deletingId === entry.catalog_id ? 'Suppression…' : 'Supprimer'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#111827] shadow-2xl">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    {editingEntry ? 'Modifier le produit catalogue' : 'Nouveau produit catalogue'}
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Préparer des produits fiables à importer selon le type de business.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEditor}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Nom du produit</label>
                                <input
                                    value={form.display_name}
                                    onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Catégorie</label>
                                <input
                                    value={form.category}
                                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Secteur cible</label>
                                <select
                                    value={form.sector}
                                    onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                >
                                    {BUSINESS_SECTORS.map((sector) => (
                                        <option key={sector.key} value={sector.key}>
                                            {sector.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Codes-barres</label>
                                <textarea
                                    value={form.barcodes}
                                    onChange={(event) => setForm((current) => ({ ...current, barcodes: event.target.value }))}
                                    rows={3}
                                    placeholder="Sépare avec des virgules ou des retours à la ligne"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Alias</label>
                                <textarea
                                    value={form.aliases}
                                    onChange={(event) => setForm((current) => ({ ...current, aliases: event.target.value }))}
                                    rows={3}
                                    placeholder="Variantes de nom utiles pour la recherche"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Pays ciblés</label>
                                <input
                                    value={form.country_codes}
                                    onChange={(event) => setForm((current) => ({ ...current, country_codes: event.target.value }))}
                                    placeholder="SN, CI, ML..."
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">URL image</label>
                                <input
                                    value={form.image_url}
                                    onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Popularité initiale</label>
                                <input
                                    value={form.added_by_count}
                                    onChange={(event) => setForm((current) => ({ ...current, added_by_count: event.target.value }))}
                                    inputMode="numeric"
                                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/10 text-white outline-none focus:border-primary"
                                />
                            </div>
                            <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                                <input
                                    type="checkbox"
                                    checked={form.verified}
                                    onChange={(event) => setForm((current) => ({ ...current, verified: event.target.checked }))}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-950 text-primary focus:ring-primary"
                                />
                                Marquer ce produit comme vérifié dès l’enregistrement
                            </label>
                            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditor}
                                    className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50"
                                >
                                    {saving ? 'Enregistrement…' : editingEntry ? 'Enregistrer les modifications' : 'Créer le produit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
