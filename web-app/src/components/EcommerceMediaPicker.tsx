'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { ecommerce as ecommerceApi } from '../services/api';
import { MEDIA_UPLOAD_ERROR, parseThemeError, type ThemeMediaItem } from '../lib/ecommerceAppearance';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50';

type Props = {
    kind: 'logo' | 'image';
    siteSlug: string;
    title: string;
    selectedId: string | null;
    canEdit: boolean;
    onSelect: (item: ThemeMediaItem) => void;
    onClose: () => void;
};

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Lecture impossible'));
        reader.readAsDataURL(file);
    });
}

export default function EcommerceMediaPicker({ kind, siteSlug, title, selectedId, canEdit, onSelect, onClose }: Props) {
    const [items, setItems] = useState<ThemeMediaItem[] | null>(null);
    const [usage, setUsage] = useState<{ total: number; limit: number } | null>(null);
    const [busy, setBusy] = useState<string | null>('load');
    const [error, setError] = useState<string | null>(null);
    const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
    const fileInput = useRef<HTMLInputElement>(null);
    const mounted = useRef(true);

    const load = useCallback(async () => {
        setBusy('load');
        setError(null);
        try {
            const result = await ecommerceApi.listMedia(kind);
            if (!mounted.current) return;
            setItems(result.media);
            setUsage({ total: result.total, limit: result.limit });
        } catch (err) {
            if (mounted.current) setError(parseThemeError(err, 'Impossible de charger vos images. Vérifiez votre connexion puis réessayez.').message);
        } finally {
            if (mounted.current) setBusy(null);
        }
    }, [kind]);

    useEffect(() => {
        mounted.current = true;
        void load();
        return () => { mounted.current = false; };
    }, [load]);

    async function importFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || busy) return;
        // Contrôles immédiats pour éviter un envoi inutile ; le serveur vérifie de nouveau le contenu réel.
        if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
            setError('Format non pris en charge : utilisez une image JPEG, PNG ou WebP.');
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            setError('Image trop lourde : 8 Mo maximum.');
            return;
        }
        setBusy('upload');
        setError(null);
        try {
            const item = await ecommerceApi.uploadMedia({ site_slug: siteSlug, kind, data: await readAsDataUrl(file) });
            if (mounted.current) onSelect(item);
        } catch (err) {
            if (mounted.current) setError(parseThemeError(err, MEDIA_UPLOAD_ERROR).message);
        } finally {
            if (mounted.current) setBusy(null);
        }
    }

    async function saveAlt(item: ThemeMediaItem) {
        const draft = altDrafts[item.media_id];
        if (draft === undefined || draft.trim() === item.alt) return;
        setBusy(`alt:${item.media_id}`);
        setError(null);
        try {
            const updated = await ecommerceApi.updateMediaAlt(item.media_id, { site_slug: siteSlug, alt: draft });
            if (!mounted.current) return;
            setItems((current) => (current || []).map((entry) => (entry.media_id === updated.media_id ? updated : entry)));
            setAltDrafts((current) => {
                const next = { ...current };
                delete next[item.media_id];
                return next;
            });
        } catch (err) {
            if (mounted.current) setError(parseThemeError(err, "Impossible d'enregistrer la description de l'image.").message);
        } finally {
            if (mounted.current) setBusy(null);
        }
    }

    async function remove(item: ThemeMediaItem) {
        if (!window.confirm('Supprimer cette image de votre bibliothèque ? Cette action est définitive.')) return;
        setBusy(`delete:${item.media_id}`);
        setError(null);
        try {
            await ecommerceApi.deleteMedia(item.media_id, { site_slug: siteSlug });
            if (!mounted.current) return;
            setItems((current) => (current || []).filter((entry) => entry.media_id !== item.media_id));
            setUsage((current) => (current ? { ...current, total: Math.max(0, current.total - 1) } : current));
        } catch (err) {
            if (mounted.current) setError(parseThemeError(err, 'Impossible de supprimer cette image.').message);
        } finally {
            if (mounted.current) setBusy(null);
        }
    }

    return (
        <Modal isOpen onClose={onClose} title={title} maxWidth="2xl">
            <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-400">
                    Formats acceptés : JPEG, PNG ou WebP, 8 Mo au maximum. Les images sont optimisées automatiquement et leurs métadonnées sont supprimées.
                    {kind === 'logo' ? ' Une image carrée donne le meilleur rendu.' : ''}
                </p>
                {canEdit && (
                    <>
                        <input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(',')} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => void importFile(event)} />
                        <button type="button" className={buttonClass} disabled={busy !== null} onClick={() => fileInput.current?.click()}>
                            {busy === 'upload' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                            {busy === 'upload' ? 'Import et optimisation...' : 'Importer une image'}
                        </button>
                    </>
                )}
                {error && <p role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-bold text-rose-300">{error}</p>}
                {busy === 'load' && <p className="text-sm text-slate-400">Chargement de vos images...</p>}
                {items && items.length === 0 && busy !== 'load' && <p className="text-sm text-slate-400">Aucune image dans votre bibliothèque pour le moment.</p>}
                {items && items.length > 0 && (
                    <ul className="space-y-3">
                        {items.map((item) => {
                            const selected = item.media_id === selectedId;
                            return (
                                <li key={item.media_id} className={`flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center ${selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
                                    {item.thumbnail_url && (
                                        // Les médias sont déjà optimisés en WebP par le serveur.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={item.thumbnail_url} alt={item.alt} width={64} height={64} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                                    )}
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <label className="block text-xs font-bold text-slate-400" htmlFor={`alt-${item.media_id}`}>Description de l'image (accessibilité)</label>
                                        <input
                                            id={`alt-${item.media_id}`}
                                            value={altDrafts[item.media_id] ?? item.alt}
                                            maxLength={200}
                                            disabled={!canEdit || busy !== null}
                                            onChange={(event) => setAltDrafts((current) => ({ ...current, [item.media_id]: event.target.value }))}
                                            onBlur={() => void saveAlt(item)}
                                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-60"
                                        />
                                        <p className="text-xs text-slate-500">{item.width} × {item.height} px{item.in_use ? ' · utilisée sur le site' : ''}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <button type="button" className={buttonClass} disabled={!canEdit || busy !== null} onClick={() => onSelect(item)}>
                                            {selected ? 'Choisie' : 'Utiliser'}
                                        </button>
                                        {canEdit && !item.in_use && (
                                            <button type="button" aria-label="Supprimer cette image" className={buttonClass} disabled={busy !== null} onClick={() => void remove(item)}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {usage && <p className="text-xs text-slate-500">Bibliothèque du site : {usage.total} image{usage.total > 1 ? 's' : ''} sur {usage.limit} possibles.</p>}
            </div>
        </Modal>
    );
}
