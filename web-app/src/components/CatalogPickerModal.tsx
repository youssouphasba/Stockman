'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Loader2, Search } from 'lucide-react';
import Modal from './Modal';
import { catalog as catalogApi } from '../services/api';

const PAGE_SIZE = 60;

type CatalogEntry = {
    catalog_id: string;
    display_name: string;
    category?: string;
    unit?: string;
    in_store?: boolean;
};

type Props = {
    isOpen: boolean;
    sector: string;
    sectorLabel?: string;
    countryCode?: string;
    onClose: () => void;
    onImported: (count: number) => void;
};

// Choix des produits du catalogue de son secteur : rien n'est ajouté sans sélection.
export default function CatalogPickerModal({ isOpen, sector, sectorLabel, countryCode, onClose, onImported }: Props) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<CatalogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const requestId = useRef(0);

    const load = async (term: string, skip: number) => {
        const current = ++requestId.current;
        if (skip === 0) setLoading(true); else setLoadingMore(true);
        setError('');
        try {
            const result = await catalogApi.browse({ sector, country: countryCode, search: term || undefined, skip, limit: PAGE_SIZE });
            if (current !== requestId.current) return;
            const products: CatalogEntry[] = result?.products || [];
            setItems(previous => (skip === 0 ? products : [...previous, ...products]));
            setTotal(result?.total || 0);
        } catch (err: any) {
            if (current === requestId.current) setError(err?.message || t('catalog_picker.load_error', { defaultValue: 'Impossible de charger le catalogue.' }));
        } finally {
            if (current === requestId.current) { setLoading(false); setLoadingMore(false); }
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const timer = window.setTimeout(() => { void load(search.trim(), 0); }, 300);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, search, sector, countryCode]);

    useEffect(() => {
        if (!isOpen) { setSelected(new Set()); setSearch(''); setError(''); }
    }, [isOpen]);

    const selectable = items.filter(item => !item.in_store);
    const allVisibleSelected = selectable.length > 0 && selectable.every(item => selected.has(item.catalog_id));

    const toggle = (id: string) => setSelected(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const toggleVisible = () => setSelected(previous => {
        const next = new Set(previous);
        if (allVisibleSelected) selectable.forEach(item => next.delete(item.catalog_id));
        else selectable.forEach(item => next.add(item.catalog_id));
        return next;
    });

    const submit = async () => {
        if (!selected.size) return;
        setImporting(true);
        setError('');
        try {
            const result = await catalogApi.import(Array.from(selected));
            onImported(result?.imported || 0);
        } catch (err: any) {
            setError(err?.message || t('catalog_picker.import_error', { defaultValue: 'Impossible d’ajouter ces produits.' }));
        } finally {
            setImporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={sectorLabel
                ? `${t('catalog_picker.title', { defaultValue: 'Choisir dans le catalogue' })} · ${sectorLabel}`
                : t('catalog_picker.title', { defaultValue: 'Choisir dans le catalogue' })}
            maxWidth="2xl"
        >
            <div className="space-y-4">
                <p className="text-sm theme-text-muted">
                    {t('catalog_picker.subtitle', { defaultValue: 'Cochez seulement les produits que vous vendez. Rien n’est ajouté sans votre choix.' })}
                </p>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder={t('catalog_picker.search_placeholder', { defaultValue: 'Rechercher un produit ou un code-barres' })}
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm theme-text focus:border-primary/50 focus:outline-none"
                    />
                </div>
                <div className="flex items-center justify-between text-xs theme-text-muted">
                    <span>{t('catalog_picker.count', { count: total, defaultValue: '{{count}} produits proposés' })}</span>
                    {selectable.length > 0 && (
                        <button type="button" onClick={toggleVisible} className="font-bold text-primary hover:underline">
                            {allVisibleSelected
                                ? t('catalog_picker.unselect_visible', { defaultValue: 'Tout décocher' })
                                : t('catalog_picker.select_visible', { defaultValue: 'Tout cocher' })}
                        </button>
                    )}
                </div>
                <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={20} /></div>
                    ) : items.length ? (
                        <>
                            {items.map(item => {
                                const checked = selected.has(item.catalog_id);
                                const disabled = Boolean(item.in_store);
                                return (
                                    <label key={item.catalog_id} className={`flex items-center gap-3 px-4 py-3 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-white/5'}`}>
                                        {disabled ? (
                                            <CheckCheck size={16} className="shrink-0 text-slate-500" />
                                        ) : (
                                            <input type="checkbox" checked={checked} onChange={() => toggle(item.catalog_id)} className="h-4 w-4 shrink-0 accent-emerald-500" />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold theme-text">{item.display_name}</span>
                                            <span className="block truncate text-xs theme-text-muted">
                                                {disabled
                                                    ? t('catalog_picker.already_in_store', { defaultValue: 'Déjà dans votre boutique' })
                                                    : [item.category, item.unit].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                            {items.length < total && (
                                <button
                                    type="button"
                                    onClick={() => void load(search.trim(), items.length)}
                                    disabled={loadingMore}
                                    className="w-full py-3 text-xs font-bold text-primary hover:bg-white/5 disabled:opacity-50"
                                >
                                    {loadingMore ? <Loader2 size={14} className="mx-auto animate-spin" /> : t('catalog_picker.load_more', { defaultValue: 'Afficher plus de produits' })}
                                </button>
                            )}
                        </>
                    ) : (
                        <p className="px-4 py-10 text-center text-sm theme-text-muted">
                            {error || t('catalog_picker.empty', { defaultValue: 'Aucun produit proposé pour votre activité.' })}
                        </p>
                    )}
                </div>
                {error && items.length ? <p className="text-sm text-rose-400">{error}</p> : null}
                <p className="text-xs theme-text-muted">
                    {t('catalog_picker.hint', { defaultValue: 'Les produits sont ajoutés avec un stock et des prix à zéro : complétez-les ensuite.' })}
                </p>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm theme-text hover:bg-white/5">
                        {t('common.cancel', { defaultValue: 'Annuler' })}
                    </button>
                    <button
                        type="button"
                        onClick={() => void submit()}
                        disabled={!selected.size || importing}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {importing ? <Loader2 size={14} className="animate-spin" /> : null}
                        {t('catalog_picker.submit', { count: selected.size, defaultValue: 'Ajouter {{count}} produits' })}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
