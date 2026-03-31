'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, Edit3, GitMerge, Layers3, PackagePlus, RefreshCw, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { admin as adminApi } from '../../services/api';
import { BUSINESS_SECTORS, getBusinessSectorLabel } from '../../data/businessSectors';

type ToastType = 'success' | 'error';
type PublicationStatus = 'draft' | 'ready' | 'published' | 'needs_review' | 'archived';
type AssistantBucket =
    | 'all'
    | 'incomplete'
    | 'missing_image'
    | 'missing_category'
    | 'missing_price'
    | 'missing_unit'
    | 'missing_marketplace_link'
    | 'published'
    | 'needs_review';

type Props = {
    refreshToken: number;
    showToast: (message: string, type?: ToastType) => void;
};

type CatalogEntry = {
    catalog_id: string;
    display_name: string;
    category?: string | null;
    sector?: string | null;
    country_codes?: string[] | null;
    barcodes?: string[] | null;
    aliases?: string[] | null;
    tags?: string[] | null;
    image_url?: string | null;
    unit?: string | null;
    publication_status?: PublicationStatus | null;
    reference_price?: number | null;
    sale_price?: number | null;
    supplier_hint?: string | null;
    verified?: boolean | null;
    added_by_count?: number | null;
    completeness?: Record<string, any> | null;
    updated_at?: string | null;
    created_at?: string | null;
};

type FormState = {
    display_name: string;
    category: string;
    sector: string;
    country_codes: string;
    barcodes: string;
    image_url: string;
    unit: string;
    tags: string;
    publication_status: PublicationStatus;
    reference_price: string;
    sale_price: string;
    supplier_hint: string;
    verified: boolean;
};

type BatchRow = {
    display_name: string;
    category?: string;
    sector?: string;
    barcodes?: string[];
    aliases?: string[];
    country_codes?: string[];
    image_url?: string;
    unit?: string;
    tags?: string[];
    supplier_suggestions?: string[];
    marketplace_matches?: string[];
    publication_status?: PublicationStatus;
    notes?: string;
    reference_price?: number;
    sale_price?: number;
    supplier_hint?: string;
    verified?: boolean;
    added_by_count?: number;
};

const DEFAULT_FORM: FormState = {
    display_name: '',
    category: '',
    sector: 'epicerie',
    country_codes: 'SN',
    barcodes: '',
    image_url: '',
    unit: 'pièce',
    tags: '',
    publication_status: 'draft',
    reference_price: '',
    sale_price: '',
    supplier_hint: '',
    verified: true,
};

const PUBLICATION_OPTIONS: { value: PublicationStatus; label: string }[] = [
    { value: 'draft', label: 'Brouillon' },
    { value: 'ready', label: 'Prêt à publier' },
    { value: 'published', label: 'Publié' },
    { value: 'needs_review', label: 'À corriger' },
    { value: 'archived', label: 'Archivé' },
];

const TEMPLATES = [
    { id: 'epicerie', label: 'Épicerie', sector: 'epicerie', category: 'Produits alimentaires', unit: 'pièce', tags: 'épicerie, rayon' },
    { id: 'boissons', label: 'Boissons', sector: 'boissons', category: 'Boissons', unit: 'L', tags: 'boisson, liquide' },
    { id: 'hygiene', label: 'Hygiène', sector: 'cosmetiques', category: 'Hygiène', unit: 'pièce', tags: 'hygiène, soin' },
    { id: 'marketplace', label: 'Fournisseur marketplace', sector: 'grossiste', category: 'Marketplace', unit: 'pièce', tags: 'marketplace, catalogue' },
    { id: 'restaurant', label: 'Restaurant', sector: 'restaurant', category: 'Ingrédients', unit: 'kg', tags: 'restaurant, cuisine' },
];

function listToInput(value?: string[] | null) {
    return (value || []).join(', ');
}

function inputToList(value: string) {
    return value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatDate(value?: string | null) {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString('fr-FR');
}

function statusClass(status?: string | null) {
    switch (status) {
        case 'published':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
        case 'ready':
            return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
        case 'needs_review':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
        case 'archived':
            return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
        default:
            return 'border-white/10 bg-white/5 text-slate-300';
    }
}

function parseCellList(value: string) {
    return value
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseOptionalNumber(value: string) {
    const cleaned = value.trim().replace(',', '.');
    if (!cleaned) return undefined;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return ['true', '1', 'oui', 'yes'].includes(normalized);
}

function splitCsvLine(line: string, separator: string) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === separator && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

function parseCsvImportRows(content: string): BatchRow[] {
    const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = splitCsvLine(lines[0], separator).map((item) => item.trim().toLowerCase());

    return lines.slice(1).map((line) => {
        const cells = splitCsvLine(line, separator);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            row[header] = (cells[index] || '').trim();
        });

        return {
            display_name: row.display_name || '',
            category: row.category || undefined,
            sector: row.sector || undefined,
            barcodes: parseCellList(row.barcodes || ''),
            aliases: parseCellList(row.aliases || ''),
            country_codes: parseCellList(row.country_codes || '').map((item) => item.toUpperCase()),
            image_url: row.image_url || undefined,
            unit: row.unit || undefined,
            tags: parseCellList(row.tags || '').map((item) => item.toLowerCase()),
            supplier_suggestions: parseCellList(row.supplier_suggestions || ''),
            marketplace_matches: parseCellList(row.marketplace_matches || ''),
            publication_status: (row.publication_status as PublicationStatus) || 'draft',
            notes: row.notes || undefined,
            reference_price: parseOptionalNumber(row.reference_price || ''),
            sale_price: parseOptionalNumber(row.sale_price || ''),
            supplier_hint: row.supplier_hint || undefined,
            verified: parseBoolean(row.verified || ''),
            added_by_count: parseOptionalNumber(row.added_by_count || ''),
        };
    }).filter((row) => row.display_name);
}

export default function AdminCatalogPanel({ refreshToken, showToast }: Props) {
    const [items, setItems] = useState<CatalogEntry[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [assistant, setAssistant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [batchOpen, setBatchOpen] = useState(false);
    const [variantOpen, setVariantOpen] = useState(false);
    const [batchText, setBatchText] = useState('');
    const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
    const [batchFileName, setBatchFileName] = useState('');
    const [batchSubmitting, setBatchSubmitting] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ total: 0, done: 0 });
    const [variantBaseName, setVariantBaseName] = useState('');
    const [variantValues, setVariantValues] = useState('');
    const [filters, setFilters] = useState({
        search: '',
        sector: '',
        country: '',
        verified: 'all' as 'all' | 'verified' | 'pending',
        publication_status: '',
        assistant_bucket: 'all' as AssistantBucket,
    });
    const [bulkEdit, setBulkEdit] = useState({
        category: '',
        tags: '',
        publication_status: '' as PublicationStatus | '',
        supplier_hint: '',
    });
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mergeKeepId, setMergeKeepId] = useState('');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    const load = async (assistantCatalogId?: string | null, pageOverride?: number) => {
        const currentPage = pageOverride ?? page;
        const params: any = { limit: PAGE_SIZE, skip: currentPage * PAGE_SIZE };
        if (filters.search.trim()) params.search = filters.search.trim();
        if (filters.sector) params.sector = filters.sector;
        if (filters.country.trim()) params.country = filters.country.trim().toUpperCase();
        if (filters.verified === 'verified') params.verified = true;
        if (filters.verified === 'pending') params.verified = false;
        if (filters.publication_status) params.publication_status = filters.publication_status;
        if (filters.assistant_bucket !== 'all') params.assistant_bucket = filters.assistant_bucket;

        const [statsResponse, listResponse, assistantResponse] = await Promise.all([
            adminApi.getCatalogStats(),
            adminApi.listCatalogProducts(params),
            adminApi.getCatalogAssistant(assistantCatalogId || undefined),
        ]);

        setStats(statsResponse);
        setItems(listResponse?.products || []);
        setTotalCount(listResponse?.total ?? 0);
        setAssistant(assistantResponse);
    };

    // Reset page to 0 when filters change
    useEffect(() => {
        setPage(0);
    }, [filters]);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                setLoading(true);
                await load(editingEntry?.catalog_id, page);
            } catch {
                if (!cancelled) showToast('Impossible de charger le catalogue global.', 'error');
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
    }, [refreshToken, filters, page, editingEntry?.catalog_id]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const selectedEntries = useMemo(() => items.filter((item) => selectedIds.has(item.catalog_id)), [items, selectedIds]);
    const dominantSector = Object.entries(stats?.by_sector || {}).sort((a: any, b: any) => Number(b[1]) - Number(a[1]))[0]?.[0];
    const assistantStats = stats?.assistant || {};
    const assistantSuggestions = assistant?.suggestions || {};
    const availableCountries = useMemo(() => {
        const fromStats = Object.keys(stats?.by_country || {});
        const fromItems = Array.from(
            new Set(
                items.flatMap((item) => (item.country_codes || []).map((code) => String(code || '').trim().toUpperCase())).filter(Boolean),
            ),
        );
        return Array.from(new Set([...fromStats, ...fromItems])).sort();
    }, [items, stats]);

    const openCreate = async () => {
        setEditingEntry(null);
        setForm(DEFAULT_FORM);
        try {
            setAssistant(await adminApi.getCatalogAssistant());
        } catch {
            setAssistant(null);
        }
        setEditorOpen(true);
    };

    const openEdit = async (entry: CatalogEntry) => {
        setEditingEntry(entry);
        setForm({
            display_name: entry.display_name || '',
            category: entry.category || '',
            sector: entry.sector || 'epicerie',
            country_codes: listToInput(entry.country_codes),
            barcodes: listToInput(entry.barcodes),
            image_url: entry.image_url || '',
            unit: entry.unit || 'pièce',
            tags: listToInput(entry.tags),
            publication_status: (entry.publication_status as PublicationStatus) || 'draft',
            reference_price: entry.reference_price != null ? String(entry.reference_price) : '',
            sale_price: entry.sale_price != null ? String(entry.sale_price) : '',
            supplier_hint: entry.supplier_hint || '',
            verified: entry.verified !== false,
        });
        try {
            setAssistant(await adminApi.getCatalogAssistant(entry.catalog_id));
        } catch {
            setAssistant(null);
        }
        setEditorOpen(true);
    };

    const formPayload = () => ({
        display_name: form.display_name.trim(),
        category: form.category.trim() || undefined,
        sector: form.sector,
        country_codes: inputToList(form.country_codes).map((item) => item.toUpperCase()),
        barcodes: inputToList(form.barcodes),
        image_url: form.image_url.trim() || undefined,
        unit: form.unit.trim() || undefined,
        tags: inputToList(form.tags).map((item) => item.toLowerCase()),
        publication_status: form.publication_status,
        reference_price: form.reference_price ? Number(form.reference_price) : undefined,
        sale_price: form.sale_price ? Number(form.sale_price) : undefined,
        supplier_hint: form.supplier_hint.trim() || undefined,
        verified: form.verified,
    });

    const save = async () => {
        try {
            if (editingEntry) await adminApi.updateCatalogProduct(editingEntry.catalog_id, formPayload());
            else await adminApi.createCatalogProduct(formPayload());
            setEditorOpen(false);
            setEditingEntry(null);
            await load();
            showToast(editingEntry ? 'Produit catalogue mis à jour.' : 'Produit catalogue ajouté.');
        } catch (error: any) {
            showToast(error?.message || "Impossible d'enregistrer ce produit catalogue.", 'error');
        }
    };

    const createBatch = async () => {
        const manualRows = batchText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const [display_name = '', category = '', sector = form.sector, unit = form.unit, reference_price = '', sale_price = '', tags = ''] = line.split(';');
                return {
                    display_name: display_name.trim(),
                    category: category.trim() || undefined,
                    sector: sector.trim() || form.sector,
                    unit: unit.trim() || form.unit,
                    reference_price: reference_price.trim() ? Number(reference_price) : undefined,
                    sale_price: sale_price.trim() ? Number(sale_price) : undefined,
                    tags: inputToList(tags).map((item) => item.toLowerCase()),
                    country_codes: inputToList(form.country_codes).map((item) => item.toUpperCase()),
                    publication_status: 'draft' as PublicationStatus,
                    verified: false,
                };
            })
            .filter((row) => row.display_name);

        const rows = batchRows.length ? batchRows : manualRows;

        if (!rows.length) {
            showToast('Ajoute au moins une ligne valide.', 'error');
            return;
        }

        try {
            const chunkSize = 200;
            setBatchSubmitting(true);
            setBatchProgress({ total: rows.length, done: 0 });
            let createdTotal = 0;
            let updatedTotal = 0;
            let errorCount = 0;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const slice = rows.slice(i, i + chunkSize);
                const result = await adminApi.bulkUpsertCatalogProducts(slice);
                createdTotal += Number(result?.created || 0);
                updatedTotal += Number(result?.updated || 0);
                errorCount += Array.isArray(result?.errors) ? result.errors.length : 0;
                setBatchProgress({ total: rows.length, done: Math.min(rows.length, i + slice.length) });
            }
            setBatchOpen(false);
            setBatchText('');
            setBatchRows([]);
            setBatchFileName('');
            await load();
            if (errorCount > 0) {
                showToast(`Création en lot terminée avec ${errorCount} erreur(s).`, 'error');
            } else {
                showToast(`Création en lot terminée (${createdTotal} créés, ${updatedTotal} mis à jour).`);
            }
        } catch (error: any) {
            showToast(error?.message || 'Impossible de créer les produits en lot.', 'error');
        } finally {
            setBatchSubmitting(false);
            setBatchProgress({ total: 0, done: 0 });
        }
    };

    const importBatchFile = async (file: File) => {
        try {
            const content = await file.text();
            const rows = parseCsvImportRows(content);
            if (!rows.length) {
                showToast('Le fichier ne contient aucune ligne exploitable.', 'error');
                return;
            }
            setBatchRows(rows);
            setBatchFileName(file.name);
            setBatchText('');
            showToast(`${rows.length} ligne(s) prêtes pour l'import.`);
        } catch {
            showToast("Impossible de lire ce fichier d'import.", 'error');
        }
    };

    const createVariants = async () => {
        const values = inputToList(variantValues);
        if (!variantBaseName.trim() || !values.length) {
            showToast('Ajoute un nom de base et des variantes.', 'error');
            return;
        }

        try {
            await adminApi.bulkUpsertCatalogProducts(
                values.map((value) => ({
                    display_name: `${variantBaseName.trim()} ${value}`.trim(),
                    category: form.category.trim() || undefined,
                    sector: form.sector,
                    unit: form.unit,
                    tags: inputToList(form.tags).map((item) => item.toLowerCase()),
                    reference_price: form.reference_price ? Number(form.reference_price) : undefined,
                    sale_price: form.sale_price ? Number(form.sale_price) : undefined,
                    country_codes: inputToList(form.country_codes).map((item) => item.toUpperCase()),
                    publication_status: 'draft' as PublicationStatus,
                    verified: false,
                })),
            );
            setVariantOpen(false);
            setVariantBaseName('');
            setVariantValues('');
            await load();
            showToast('Série de variantes créée.');
        } catch (error: any) {
            showToast(error?.message || 'Impossible de créer la série.', 'error');
        }
    };

    const applyBulkEdit = async () => {
        if (!selectedEntries.length) {
            showToast('Sélectionne au moins un produit.', 'error');
            return;
        }

        const updates: any = {};
        if (bulkEdit.category.trim()) updates.category = bulkEdit.category.trim();
        if (bulkEdit.tags.trim()) updates.tags = inputToList(bulkEdit.tags).map((item) => item.toLowerCase());
        if (bulkEdit.publication_status) updates.publication_status = bulkEdit.publication_status;
        if (bulkEdit.supplier_hint.trim()) updates.supplier_hint = bulkEdit.supplier_hint.trim();

        if (!Object.keys(updates).length) {
            showToast('Choisis au moins une modification.', 'error');
            return;
        }

        try {
            await adminApi.bulkUpdateCatalogProducts(Array.from(selectedIds), updates);
            setSelectedIds(new Set());
            setBulkEdit({ category: '', tags: '', publication_status: '', supplier_hint: '' });
            await load();
            showToast('Édition massive appliquée.');
        } catch (error: any) {
            showToast(error?.message || "Impossible d'appliquer l'édition massive.", 'error');
        }
    };

    const duplicate = async (entry: CatalogEntry) => {
        try {
            await adminApi.duplicateCatalogProduct(entry.catalog_id);
            await load();
            showToast('Produit catalogue dupliqué.');
        } catch (error: any) {
            showToast(error?.message || 'Impossible de dupliquer ce produit.', 'error');
        }
    };

    const verify = async (entry: CatalogEntry) => {
        try {
            await adminApi.verifyCatalogProduct(entry.catalog_id);
            await load();
            showToast('Produit catalogue vérifié.');
        } catch {
            showToast("Impossible de vérifier ce produit catalogue.", 'error');
        }
    };

    const merge = async () => {
        if (selectedEntries.length < 2 || !mergeKeepId) return;
        try {
            await adminApi.mergeCatalogProducts(
                mergeKeepId,
                selectedEntries.filter((item) => item.catalog_id !== mergeKeepId).map((item) => item.catalog_id),
            );
            setMergeModalOpen(false);
            setSelectedIds(new Set());
            await load();
            showToast('Produits catalogue fusionnés.');
        } catch {
            showToast("Impossible de fusionner ces produits catalogue.", 'error');
        }
    };

    const bulkDelete = async () => {
        const count = selectedIds.size;
        if (!window.confirm(`Supprimer ${count} produit(s) du catalogue global ? Cette action est irréversible.`)) return;
        try {
            await adminApi.bulkDeleteCatalogProducts(Array.from(selectedIds));
            setSelectedIds(new Set());
            await load();
            showToast(`${count} produit(s) supprimé(s) du catalogue.`);
        } catch {
            showToast('Impossible de supprimer les produits sélectionnés.', 'error');
        }
    };

    const exportCsv = () => {
        if (!items.length) { showToast('Aucun produit à exporter.', 'error'); return; }
        const headers = ['catalog_id', 'display_name', 'category', 'sector', 'country_codes', 'barcodes', 'unit', 'tags', 'publication_status', 'reference_price', 'sale_price', 'supplier_hint', 'verified', 'added_by_count'];
        const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = items.map((item) => [
            item.catalog_id, item.display_name, item.category || '', item.sector || '',
            (item.country_codes || []).join('|'), (item.barcodes || []).join('|'),
            item.unit || '', (item.tags || []).join('|'), item.publication_status || 'draft',
            item.reference_price ?? '', item.sale_price ?? '', item.supplier_hint || '',
            item.verified ? 'true' : 'false', item.added_by_count ?? 0,
        ].map(escape).join(';'));
        const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url; a.download = `catalogue_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
        showToast(`${items.length} produit(s) exportés.`);
    };

    const bulkVerify = async () => {
        const count = selectedIds.size;
        try {
            await Promise.all(Array.from(selectedIds).map((id) => adminApi.verifyCatalogProduct(id)));
            setSelectedIds(new Set());
            await load();
            showToast(`${count} produit(s) vérifiés.`);
        } catch {
            showToast('Impossible de vérifier tous les produits sélectionnés.', 'error');
        }
    };

    const bulkPublish = async () => {
        const count = selectedIds.size;
        try {
            await adminApi.bulkUpdateCatalogProducts(Array.from(selectedIds), { publication_status: 'published' });
            setSelectedIds(new Set());
            await load();
            showToast(`${count} produit(s) publiés.`);
        } catch {
            showToast('Impossible de publier les produits sélectionnés.', 'error');
        }
    };

    const remove = async (entry: CatalogEntry) => {
        if (!window.confirm(`Supprimer "${entry.display_name}" du catalogue global ?`)) return;
        try {
            await adminApi.deleteCatalogProduct(entry.catalog_id);
            await load();
            showToast('Produit catalogue supprimé.');
        } catch {
            showToast("Impossible de supprimer ce produit catalogue.", 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-9">
                <div className="glass-card p-5">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Catalogue</div>
                    <div className="text-3xl font-black text-white">{stats?.total_products ?? items.length}</div>
                </div>
                <button type="button" onClick={() => setFilters((f) => ({ ...f, verified: 'verified', assistant_bucket: 'all' }))} className="glass-card cursor-pointer p-5 text-left transition-all hover:border-emerald-500/30">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Vérifiés ↗</div>
                    <div className="text-3xl font-black text-emerald-400">{stats?.verified_products ?? 0}</div>
                </button>
                <button type="button" onClick={() => setFilters((f) => ({ ...f, publication_status: 'published', assistant_bucket: 'all' }))} className="glass-card cursor-pointer p-5 text-left transition-all hover:border-emerald-500/30">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Publiés ↗</div>
                    <div className="text-3xl font-black text-emerald-300">{stats?.published_products ?? 0}</div>
                </button>
                <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'incomplete' }))} className="glass-card cursor-pointer p-5 text-left transition-all hover:border-amber-500/30">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Incomplets ↗</div>
                    <div className="text-3xl font-black text-amber-300">{assistantStats.incomplete ?? 0}</div>
                </button>
                <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'missing_image' }))} className="glass-card cursor-pointer p-5 text-left transition-all hover:border-rose-500/30">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Sans image ↗</div>
                    <div className="text-3xl font-black text-rose-300">{assistantStats.missing_image ?? 0}</div>
                </button>
                <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'missing_price' }))} className="glass-card cursor-pointer p-5 text-left transition-all hover:border-sky-500/30">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Sans prix ↗</div>
                    <div className="text-3xl font-black text-sky-300">{assistantStats.missing_price ?? 0}</div>
                </button>
                <div className="glass-card p-5">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Total adoptions</div>
                    <div className="text-3xl font-black text-violet-300">{(stats?.total_adoptions ?? 0).toLocaleString('fr-FR')}</div>
                </div>
                <div className="glass-card p-5">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Score moyen</div>
                    <div className="text-3xl font-black text-white">{stats?.avg_completeness ?? 0}<span className="text-lg text-slate-400">/100</span></div>
                </div>
                <div className="glass-card p-5">
                    <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Secteur dominant</div>
                    <div className="text-xl font-black text-white">{dominantSector ? getBusinessSectorLabel(dominantSector) : '—'}</div>
                </div>
            </div>

            <div className="glass-card space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-white">Catalogue global par secteur</h2>
                        <p className="text-sm text-slate-400">Création en lot, duplication, workflow de publication, édition massive et assistant catalogue.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => void openCreate()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-white">
                            <PackagePlus size={16} />
                            Nouveau produit
                        </button>
                        <button type="button" onClick={() => setBatchOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">
                            <Layers3 size={16} />
                            Création en lot
                        </button>
                        <button type="button" onClick={() => setVariantOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">
                            <Sparkles size={16} />
                            Série de variantes
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white"
                        >
                            <Download size={16} />
                            Exporter CSV
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setRefreshing(true);
                                void load().finally(() => setRefreshing(false));
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Actualiser
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center gap-2 font-bold text-white">
                            <Bot size={16} className="text-primary" />
                            Assistant catalogue
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                            Préremplis rapidement ta fiche produit avec un modèle, puis affine avec les suggestions de catégorie, d'unité, de rapprochement marketplace et de doublons.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={async () => {
                                        await openCreate();
                                        setForm((current) => ({
                                            ...current,
                                            sector: template.sector,
                                            category: template.category,
                                            unit: template.unit,
                                            tags: template.tags,
                                        }));
                                    }}
                                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-primary/10"
                                >
                                    + {template.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-black text-white">Vue d'orchestration</div>
                            <div className="text-xs text-slate-500">Clique pour filtrer</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'missing_image' }))} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-rose-500/30 hover:bg-rose-500/5">
                                <div className="text-xs uppercase tracking-widest text-slate-500">Sans image ↗</div>
                                <div className="mt-1 text-2xl font-black text-rose-300">{assistantStats.missing_image ?? 0}</div>
                            </button>
                            <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'missing_category' }))} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/5">
                                <div className="text-xs uppercase tracking-widest text-slate-500">Sans catégorie ↗</div>
                                <div className="mt-1 text-2xl font-black text-amber-300">{assistantStats.missing_category ?? 0}</div>
                            </button>
                            <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'missing_unit' }))} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-sky-500/30 hover:bg-sky-500/5">
                                <div className="text-xs uppercase tracking-widest text-slate-500">Sans unité ↗</div>
                                <div className="mt-1 text-2xl font-black text-sky-300">{assistantStats.missing_unit ?? 0}</div>
                            </button>
                            <button type="button" onClick={() => setFilters((f) => ({ ...f, assistant_bucket: 'needs_review' }))} className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:border-violet-500/30 hover:bg-violet-500/5">
                                <div className="text-xs uppercase tracking-widest text-slate-500">Doublons probables ↗</div>
                                <div className="mt-1 text-2xl font-black text-violet-300">{assistantStats.duplicates_probable ?? 0}</div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
                    <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Nom, tag, code-barres..." className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary" />
                    <select value={filters.sector} onChange={(event) => setFilters((current) => ({ ...current, sector: event.target.value }))} className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary"><option value="">Tous les secteurs</option>{BUSINESS_SECTORS.map((sector) => <option key={sector.key} value={sector.key}>{sector.label}</option>)}</select>
                    <input list="admin-catalog-country-options" value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value.toUpperCase() }))} placeholder="Pays (SN, CI, FR...)" className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary" />
                    <datalist id="admin-catalog-country-options">
                        {availableCountries.map((country) => <option key={country} value={country} />)}
                    </datalist>
                    <select value={filters.verified} onChange={(event) => setFilters((current) => ({ ...current, verified: event.target.value as 'all' | 'verified' | 'pending' }))} className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary"><option value="all">Tous les statuts de vérification</option><option value="verified">Vérifiés</option><option value="pending">À relire</option></select>
                    <select value={filters.publication_status} onChange={(event) => setFilters((current) => ({ ...current, publication_status: event.target.value }))} className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary"><option value="">Tous les workflows</option>{PUBLICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                    <select value={filters.assistant_bucket} onChange={(event) => setFilters((current) => ({ ...current, assistant_bucket: event.target.value as AssistantBucket }))} className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary"><option value="all">Vue globale</option><option value="incomplete">Produits incomplets</option><option value="missing_image">Sans image</option><option value="missing_category">Sans catégorie</option><option value="missing_price">Sans prix</option><option value="missing_unit">Sans unité</option><option value="missing_marketplace_link">Sans lien marketplace</option><option value="published">Publiés</option><option value="needs_review">À corriger</option></select>
                    <button type="button" onClick={() => setFilters({ search: '', sector: '', country: '', verified: 'all', publication_status: '', assistant_bucket: 'all' })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition-all hover:bg-white/10">Réinitialiser</button>
                </div>
            </div>

            {selectedEntries.length > 0 && (
                <div className="glass-card space-y-4 p-6">
                    <div className="font-black text-white">{selectedEntries.length} produits sélectionnés</div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <input value={bulkEdit.category} onChange={(event) => setBulkEdit((current) => ({ ...current, category: event.target.value }))} placeholder="Catégorie" className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary" />
                        <input value={bulkEdit.tags} onChange={(event) => setBulkEdit((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags" className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary" />
                        <select value={bulkEdit.publication_status} onChange={(event) => setBulkEdit((current) => ({ ...current, publication_status: event.target.value as PublicationStatus | '' }))} className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary"><option value="">Workflow</option>{PUBLICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                        <input value={bulkEdit.supplier_hint} onChange={(event) => setBulkEdit((current) => ({ ...current, supplier_hint: event.target.value }))} placeholder="Suggestion fournisseur" className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-primary" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => void applyBulkEdit()} className="rounded-xl bg-primary px-4 py-2 font-bold text-white">Appliquer en lot</button>
                        <button type="button" onClick={() => void bulkVerify()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-300">
                            <ShieldCheck size={16} />Vérifier ({selectedIds.size})
                        </button>
                        <button type="button" onClick={() => void bulkPublish()} className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2 font-semibold text-sky-300">
                            <Sparkles size={16} />Publier ({selectedIds.size})
                        </button>
                        {selectedEntries.length >= 2 && (
                            <button
                                type="button"
                                onClick={() => { setMergeKeepId(selectedEntries[0]?.catalog_id || ''); setMergeModalOpen(true); }}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white"
                            >
                                <GitMerge size={16} />Fusionner
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => void bulkDelete()}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 font-semibold text-rose-300"
                        >
                            <Trash2 size={16} />Supprimer ({selectedIds.size})
                        </button>
                    </div>
                </div>
            )}

            <div className="glass-card p-6">
                {loading ? (
                    <div className="py-16 text-center text-slate-400">Chargement du catalogue...</div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-lg font-black text-white">Aucun produit catalogue trouvé</p>
                        <p className="mt-2 text-sm text-slate-400">
                            Vérifie les filtres actifs ou réinitialise la recherche pour revoir tout le catalogue.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1280px]">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-slate-500">
                                    <th className="py-3 pr-4">
                                        <input
                                            type="checkbox"
                                            checked={items.length > 0 && items.every((item) => selectedIds.has(item.catalog_id))}
                                            onChange={() => setSelectedIds(items.every((item) => selectedIds.has(item.catalog_id)) ? new Set() : new Set(items.map((item) => item.catalog_id)))}
                                            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-primary focus:ring-primary"
                                            title="Tout sélectionner / désélectionner"
                                        />
                                    </th>
                                    <th className="py-3 pr-4">Produit</th>
                                    <th className="py-3 pr-4">Workflow</th>
                                    <th className="py-3 pr-4">Complétude</th>
                                    <th className="py-3 pr-4">Prix / unité</th>
                                    <th className="py-3 pr-4">Tags / fournisseur</th>
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
                                                onChange={() => setSelectedIds((current) => {
                                                    const next = new Set(current);
                                                    if (next.has(entry.catalog_id)) next.delete(entry.catalog_id);
                                                    else next.add(entry.catalog_id);
                                                    return next;
                                                })}
                                                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-primary focus:ring-primary"
                                            />
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="font-bold text-white">{entry.display_name}</div>
                                            <div className="text-sm text-slate-400">{entry.category || 'Sans catégorie'} • {getBusinessSectorLabel(entry.sector)}</div>
                                            <div className="mt-1 text-xs text-slate-500">{(entry.country_codes || []).join(', ') || 'Sans pays'} • {formatDate(entry.updated_at || entry.created_at)}</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                Alias : {entry.aliases?.length ? entry.aliases.join(', ') : 'Aucun'} • Ajouts : {entry.added_by_count ?? 0}
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusClass(entry.publication_status)}`}>{PUBLICATION_OPTIONS.find((option) => option.value === (entry.publication_status || 'draft'))?.label || 'Brouillon'}</span>
                                            <div className="mt-2">
                                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${entry.verified ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                                                    <CheckCircle2 size={12} />
                                                    {entry.verified ? 'Vérifié' : 'À relire'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="font-black text-white">{entry.completeness?.score ?? 0}/100</div>
                                            <div className="mt-2 text-xs text-slate-500">
                                                {entry.completeness?.missing_image ? 'Image manquante · ' : ''}
                                                {entry.completeness?.missing_category ? 'Catégorie manquante · ' : ''}
                                                {entry.completeness?.missing_price ? 'Prix manquant · ' : ''}
                                                {entry.completeness?.missing_marketplace_link ? 'Sans lien marketplace' : 'Complet ou presque'}
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="text-white">Réf. : {entry.reference_price ?? '—'}</div>
                                            <div className="mt-1 text-sm text-slate-400">Vente : {entry.sale_price ?? '—'}</div>
                                            <div className="mt-1 text-xs text-slate-500">Unité : {entry.unit || '—'}</div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <div className="text-white">{(entry.tags || []).join(', ') || 'Aucun tag'}</div>
                                            <div className="mt-1 text-sm text-slate-400">{entry.supplier_hint || 'Aucune suggestion fournisseur'}</div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {!entry.verified && <button type="button" onClick={() => void verify(entry)} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">Vérifier</button>}
                                                <button type="button" onClick={() => void openEdit(entry)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white"><Edit3 size={14} />Modifier</button>
                                                <button type="button" onClick={() => void duplicate(entry)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white"><Copy size={14} />Dupliquer</button>
                                                <button type="button" onClick={() => void remove(entry)} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300"><Trash2 size={14} />Supprimer</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                                <span className="text-sm text-slate-400">
                                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} sur {totalCount} produits
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={page === 0}
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={16} />Préc.
                                    </button>
                                    <span className="min-w-[80px] text-center text-sm font-bold text-white">
                                        {page + 1} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={page >= totalPages - 1}
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        Suiv.<ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {editorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                    <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white">{editingEntry ? 'Modifier le produit catalogue' : 'Nouveau produit catalogue'}</h3>
                                <p className="mt-1 text-sm text-slate-400">L'IA propose des pistes, mais c'est toi qui valides les catégories, unités et rapprochements.</p>
                            </div>
                            <button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><X size={18} /></button>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} placeholder="Nom du produit" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                    <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Catégorie" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                    <select value={form.sector} onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary">{BUSINESS_SECTORS.map((sector) => <option key={sector.key} value={sector.key}>{sector.label}</option>)}</select>
                                    <input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} placeholder="Unité" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                    <select value={form.publication_status} onChange={(event) => setForm((current) => ({ ...current, publication_status: event.target.value as PublicationStatus }))} className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary">{PUBLICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                                    <input value={form.country_codes} onChange={(event) => setForm((current) => ({ ...current, country_codes: event.target.value }))} placeholder="Pays (SN, CI, FR...)" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                    <input value={form.reference_price} onChange={(event) => setForm((current) => ({ ...current, reference_price: event.target.value }))} placeholder="Prix de référence" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                    <input value={form.sale_price} onChange={(event) => setForm((current) => ({ ...current, sale_price: event.target.value }))} placeholder="Prix de vente" className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                </div>

                                <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                <input value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="URL image" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                <input value={form.barcodes} onChange={(event) => setForm((current) => ({ ...current, barcodes: event.target.value }))} placeholder="Codes-barres" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                <input value={form.supplier_hint} onChange={(event) => setForm((current) => ({ ...current, supplier_hint: event.target.value }))} placeholder="Suggestion fournisseur" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                                <label className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"><input type="checkbox" checked={form.verified} onChange={(event) => setForm((current) => ({ ...current, verified: event.target.checked }))} className="h-4 w-4 rounded border-white/20 bg-slate-950 text-primary focus:ring-primary" />Marquer ce produit comme vérifié</label>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                    <div className="flex items-center gap-2 font-bold text-white"><Sparkles size={16} className="text-primary" />Suggestions IA</div>
                                    <div className="mt-4 space-y-4 text-sm text-slate-200">
                                        <div>
                                            <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Catégories suggérées</div>
                                            <div className="flex flex-wrap gap-2">{(assistantSuggestions.category_suggestions || []).slice(0, 6).map((item: any) => <button key={item.value} type="button" onClick={() => setForm((current) => ({ ...current, category: item.value }))} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">{item.value}</button>)}</div>
                                        </div>
                                        <div>
                                            <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Unités suggérées</div>
                                            <div className="flex flex-wrap gap-2">{(assistantSuggestions.unit_suggestions || []).slice(0, 6).map((item: any) => <button key={item.value} type="button" onClick={() => setForm((current) => ({ ...current, unit: item.value }))} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200">{item.value}</button>)}</div>
                                        </div>
                                        <div>
                                            <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Rapprochements marketplace</div>
                                            <div className="space-y-2">{(assistantSuggestions.marketplace_matches || []).slice(0, 4).map((item: any) => <div key={item.catalog_id || item.display_name} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="font-semibold text-white">{item.display_name}</div><div className="text-xs text-slate-400">{item.category || 'Sans catégorie'} • Score {Math.round((item.match_score || 0) * 100)}%</div></div>)}</div>
                                        </div>
                                        <div>
                                            <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Doublons probables</div>
                                            <div className="space-y-2">{(assistantSuggestions.duplicate_candidates || []).slice(0, 4).map((item: any) => <div key={item.catalog_id || item.display_name} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="font-semibold text-white">{item.display_name}</div><div className="text-xs text-slate-400">Score {Math.round((item.match_score || 0) * 100)}%</div></div>)}</div>
                                        </div>
                                        <div>
                                            <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">Suggestions fournisseur</div>
                                            <div className="space-y-2">{(assistantSuggestions.supplier_suggestions || []).slice(0, 4).map((item: any) => <button key={item.id || item.name} type="button" onClick={() => setForm((current) => ({ ...current, supplier_hint: item.name || item.display_name || '' }))} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left"><div className="font-semibold text-white">{item.name || item.display_name}</div><div className="text-xs text-slate-400">{item.city || 'Ville non renseignée'} • Score {Math.round((item.match_score || 0) * 100)}%</div></button>)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                                    <div className="text-sm font-black text-white">Complétude actuelle</div>
                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">Catégorie : {form.category.trim() ? 'OK' : 'À renseigner'}</div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">Unité : {form.unit.trim() ? 'OK' : 'À renseigner'}</div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">Prix : {form.reference_price || form.sale_price ? 'OK' : 'À renseigner'}</div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">Image : {form.image_url.trim() ? 'OK' : 'À renseigner'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                            <button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">Annuler</button>
                            <button type="button" onClick={() => void save()} className="rounded-xl bg-primary px-4 py-2 font-bold text-white">Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}

            {mergeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <h3 className="text-xl font-black text-white">Fusionner {selectedEntries.length} produits</h3>
                            <button type="button" onClick={() => setMergeModalOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><X size={18} /></button>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">Choisis le produit à conserver. Les autres seront supprimés et leurs données fusionnées dedans.</p>
                        <div className="mt-4 space-y-2">
                            {selectedEntries.map((entry) => (
                                <label
                                    key={entry.catalog_id}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mergeKeepId === entry.catalog_id ? 'border-primary/40 bg-primary/10' : 'border-white/10 bg-white/5'}`}
                                >
                                    <input
                                        type="radio"
                                        name="merge_keep"
                                        value={entry.catalog_id}
                                        checked={mergeKeepId === entry.catalog_id}
                                        onChange={() => setMergeKeepId(entry.catalog_id)}
                                        className="mt-1 text-primary"
                                    />
                                    <div>
                                        <div className="font-bold text-white">{entry.display_name}</div>
                                        <div className="text-xs text-slate-400">
                                            {entry.category || 'Sans catégorie'} · {getBusinessSectorLabel(entry.sector)} · {entry.added_by_count ?? 0} ajouts · complétude {entry.completeness?.score ?? 0}/100
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setMergeModalOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">Annuler</button>
                            <button type="button" onClick={() => void merge()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-white"><GitMerge size={16} />Fusionner</button>
                        </div>
                    </div>
                </div>
            )}

            {batchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                    <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white">Création en lot</h3>
                                <p className="mt-1 text-sm text-slate-400">Tu peux soit coller des lignes rapides, soit importer un vrai CSV admin avec en-tête.</p>
                            </div>
                            <button type="button" onClick={() => setBatchOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><X size={18} /></button>
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-sm font-bold text-white">Import CSV admin</div>
                            <p className="mt-1 text-xs text-slate-400">Colonnes attendues : `display_name`, `category`, `sector`, `country_codes`, `unit`, `tags`, `publication_status`, `reference_price`, `sale_price`, `supplier_hint`, `verified`, avec les autres colonnes optionnelles du template admin.</p>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file) void importBatchFile(file);
                                    event.currentTarget.value = '';
                                }}
                                className="mt-4 block w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white"
                            />
                            {batchRows.length > 0 && (
                                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                                    <div className="font-semibold text-white">{batchFileName}</div>
                                    <div className="mt-1">{batchRows.length} ligne(s) prêtes à importer.</div>
                                    <div className="mt-2 text-xs text-emerald-100">
                                        Aperçu : {batchRows.slice(0, 3).map((row) => row.display_name).join(' • ')}
                                    </div>
                                    {batchSubmitting && (
                                        <div className="mt-3 text-xs text-emerald-100">
                                            Import en cours : {batchProgress.done} / {batchProgress.total}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="text-sm font-bold text-white">Saisie rapide</div>
                            <p className="mt-1 text-xs text-slate-400">Format rapide : nom;catégorie;secteur;unité;prix référence;prix vente;tags</p>
                            <textarea value={batchText} onChange={(event) => { setBatchRows([]); setBatchFileName(''); setBatchText(event.target.value); }} rows={10} className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" placeholder="Riz parfumé;Riz;epicerie;kg;650;850;riz, premium" />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => { setBatchRows([]); setBatchFileName(''); setBatchText(''); setBatchOpen(false); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">Annuler</button>
                            <button
                                type="button"
                                onClick={() => void createBatch()}
                                disabled={batchSubmitting}
                                className="rounded-xl bg-primary px-4 py-2 font-bold text-white disabled:opacity-60"
                            >
                                {batchSubmitting ? 'Import en cours…' : 'Créer les produits'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {variantOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
                    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white">Créer une série de variantes</h3>
                                <p className="mt-1 text-sm text-slate-400">Exemple : nom de base “Jus”, variantes “mangue, ananas, bissap”.</p>
                            </div>
                            <button type="button" onClick={() => setVariantOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300"><X size={18} /></button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <input value={variantBaseName} onChange={(event) => setVariantBaseName(event.target.value)} placeholder="Nom de base" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                            <textarea value={variantValues} onChange={(event) => setVariantValues(event.target.value)} rows={5} placeholder="mangue, ananas, orange, 1 L, 50 cl..." className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary" />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setVariantOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white">Annuler</button>
                            <button type="button" onClick={() => void createVariants()} className="rounded-xl bg-primary px-4 py-2 font-bold text-white">Créer la série</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
