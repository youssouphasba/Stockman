'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eye, History, Palette, RefreshCw, RotateCcw, Save, Send, Trash2 } from 'lucide-react';
import { ecommerce as ecommerceApi } from '../services/api';
import {
    THEME_COLOR_SWATCHES,
    createAppearanceController,
    describeAppearanceStatus,
    describeThemeChange,
    formatThemeDate,
    parseThemeError,
    type AppearanceView,
    type ThemeChange,
    type ThemeField,
    type ThemeRevisionItem,
} from '../lib/ecommerceAppearance';

const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-60';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50';
const INITIAL_VIEW: AppearanceView = { status: 'loading', state: null, base: {}, values: {}, busy: null, error: null, conflict: false, notice: null };

function FieldInput({ field, value, disabled, onChange }: { field: ThemeField; value: string; disabled: boolean; onChange: (value: string) => void }) {
    if (field.type === 'color') {
        const current = value.toUpperCase();
        const custom = current && !THEME_COLOR_SWATCHES.some((swatch) => swatch.value === current);
        return (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3" role="radiogroup" aria-label={field.label}>
                {THEME_COLOR_SWATCHES.map((swatch) => {
                    const active = current === swatch.value;
                    return (
                        <button
                            key={swatch.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={disabled}
                            onClick={() => onChange(swatch.value)}
                            className={`flex min-h-11 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-bold transition disabled:opacity-60 ${active ? 'border-primary bg-primary/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                        >
                            <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: swatch.value }} />
                            {swatch.label}
                        </button>
                    );
                })}
                {custom && (
                    <span className="flex min-h-11 items-center gap-2 rounded-2xl border border-primary bg-primary/10 px-3 text-sm font-bold text-white">
                        <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: current }} />
                        Couleur actuelle {current}
                    </span>
                )}
            </div>
        );
    }
    const common = {
        value,
        disabled,
        maxLength: field.max_length,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
        className: field.multiline ? `${inputClass} resize-none` : inputClass,
        'aria-label': field.label,
    };
    return field.multiline ? <textarea rows={3} {...common} /> : <input {...common} />;
}

function revisionLabel(item: ThemeRevisionItem) {
    const date = formatThemeDate(item.created_at);
    const author = item.author ? ` par ${item.author}` : '';
    return `${item.kind === 'restore' ? 'Restauration' : 'Brouillon'}${date ? ` du ${date}` : ''}${author}`;
}

export default function EcommerceAppearancePanel({
    readOnlyMessage = "L'apparence ne peut pas être modifiée depuis ce compte.",
    onPublished,
}: {
    readOnlyMessage?: string;
    onPublished?: () => void;
}) {
    const [view, setView] = useState<AppearanceView>(INITIAL_VIEW);
    const controller = useRef<ReturnType<typeof createAppearanceController> | null>(null);
    const [pendingChanges, setPendingChanges] = useState<ThemeChange[] | null>(null);
    const [history, setHistory] = useState<ThemeRevisionItem[] | null>(null);
    const [historyBusy, setHistoryBusy] = useState<string | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);

    useEffect(() => {
        const current = createAppearanceController(ecommerceApi, setView);
        controller.current = current;
        void current.load();
        return () => current.dispose();
    }, []);

    const state = view.state;
    const capabilities = state?.capabilities;
    const canEdit = !!capabilities && (capabilities.guided_edit || capabilities.structure_edit);
    const dirty = controller.current?.isDirty() || false;
    const hasDraft = !!state?.draft;
    const busy = view.busy !== null;

    async function openPreview() {
        // La fenêtre est ouverte pendant le clic pour ne pas être bloquée, puis dirigée vers l'aperçu.
        const tab = window.open('about:blank', '_blank');
        const url = await controller.current?.preview();
        if (!url) {
            tab?.close();
            return;
        }
        if (tab) {
            tab.opener = null;
            tab.location.replace(url);
        } else {
            window.location.assign(url);
        }
    }

    async function confirmPublication() {
        setPendingChanges(null);
        const published = await controller.current?.publish();
        if (published) {
            setHistory(null);
            onPublished?.();
        }
    }

    async function discard() {
        if (!window.confirm(hasDraft ? 'Abandonner le brouillon ? Le site public ne changera pas.' : 'Annuler les modifications non enregistrées ?')) return;
        setPendingChanges(null);
        await controller.current?.discard();
        setHistory(null);
    }

    async function loadHistory() {
        setHistoryBusy('load');
        setHistoryError(null);
        try {
            const result = await ecommerceApi.listThemeRevisions();
            setHistory(result.revisions);
        } catch (error) {
            setHistoryError(parseThemeError(error, "Impossible de charger l'historique des versions.").message);
        } finally {
            setHistoryBusy(null);
        }
    }

    async function restore(item: ThemeRevisionItem) {
        if (!state) return;
        if (dirty && !window.confirm('Vos modifications non enregistrées seront remplacées par cette version. Continuer ?')) return;
        if (!window.confirm('Restaurer cette version comme nouveau brouillon ? Le site public ne changera qu\'à la publication.')) return;
        setHistoryBusy(item.revision_id);
        setHistoryError(null);
        try {
            const next = await ecommerceApi.restoreThemeRevision(item.revision_id, { site_slug: state.site_slug, lock_version: state.lock_version });
            controller.current?.applyServerState(next);
            await loadHistory();
        } catch (error) {
            setHistoryError(parseThemeError(error, 'Impossible de restaurer cette version.').message);
        } finally {
            setHistoryBusy(null);
        }
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <p className="flex items-center gap-2 text-sm font-black text-white"><Palette size={18} className="text-primary" />Apparence du site</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        Préparez vos changements en brouillon, vérifiez-les dans un aperçu privé, puis publiez-les. Le site public ne change qu'à la publication.
                    </p>
                </div>
                {state && (
                    <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white">
                        <span className={`h-2 w-2 rounded-full ${hasDraft ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden="true" />
                        {hasDraft ? 'Brouillon non publié' : 'Version publiée'}
                    </span>
                )}
            </div>

            {view.status === 'loading' && <p className="mt-4 text-sm text-slate-400">Chargement de l'apparence du site...</p>}

            {view.status === 'error' && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 md:flex-row md:items-center md:justify-between">
                    <p role="alert" className="text-sm font-bold text-rose-300">{view.error?.message}</p>
                    <button type="button" className={secondaryButton} onClick={() => void controller.current?.load()}><RefreshCw size={16} />Réessayer</button>
                </div>
            )}

            {state && (
                <div className="mt-5 space-y-5">
                    <p className="text-sm text-slate-300">Modèle : <span className="font-black text-white">{state.model.name}</span></p>

                    {!canEdit && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">{readOnlyMessage}</p>}

                    {state.published.issues.length > 0 && (
                        <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
                            Une valeur publiée n'est pas compatible avec le format actuel : {state.published.issues[0].message}. Corrigez le champ concerné avant d'enregistrer.
                        </p>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        {state.fields.map((field) => (
                            <div key={field.id} className={field.multiline || field.type === 'color' ? 'flex flex-col gap-2 md:col-span-2' : 'flex flex-col gap-2'}>
                                <span className="text-sm font-semibold text-white">{field.label}</span>
                                {field.hint && <span className="text-xs leading-5 text-slate-500">{field.hint}</span>}
                                <FieldInput
                                    field={field}
                                    value={view.values[field.id] || ''}
                                    disabled={!canEdit || busy}
                                    onChange={(value) => controller.current?.setValue(field.id, value)}
                                />
                            </div>
                        ))}
                    </div>

                    {canEdit && <p className="text-xs font-bold text-slate-400" aria-live="polite">{describeAppearanceStatus(view)}</p>}

                    {view.error && view.status === 'ready' && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 md:flex-row md:items-center md:justify-between">
                            <p role="alert" className="text-sm font-bold text-rose-300">{view.error.message}</p>
                            {view.conflict && (
                                <button type="button" className={secondaryButton} disabled={busy} onClick={() => void controller.current?.reload()}>
                                    <RefreshCw size={16} />Recharger en gardant mes saisies
                                </button>
                            )}
                        </div>
                    )}
                    {view.notice && <p role="status" className="rounded-2xl bg-emerald-500/10 p-4 text-sm font-bold text-white">{view.notice}</p>}

                    {pendingChanges && (
                        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                            <p className="text-sm font-black text-white">Publier ces changements ?</p>
                            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                                {pendingChanges.map((change) => <li key={change.field.id}>{describeThemeChange(change)}</li>)}
                            </ul>
                            {!state.site_enabled && <p className="mt-2 text-xs leading-5 text-slate-400">Le site est désactivé : la publication n'active pas le site.</p>}
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white disabled:opacity-50" disabled={busy} onClick={() => void confirmPublication()}>
                                    <Send size={16} />Confirmer la publication
                                </button>
                                <button type="button" className={secondaryButton} onClick={() => setPendingChanges(null)}>Annuler</button>
                            </div>
                        </div>
                    )}

                    {canEdit && !pendingChanges && (
                        <div className="flex flex-wrap gap-3">
                            <button type="button" className={secondaryButton} disabled={busy || !dirty} onClick={() => void controller.current?.saveDraft()}>
                                <Save size={16} />{view.busy === 'save' ? 'Enregistrement...' : 'Enregistrer le brouillon'}
                            </button>
                            {capabilities?.preview && (
                                <button type="button" className={secondaryButton} disabled={busy} onClick={() => void openPreview()}>
                                    <Eye size={16} />{view.busy === 'preview' ? "Préparation de l'aperçu..." : 'Prévisualiser'}
                                </button>
                            )}
                            {capabilities?.publish && (
                                <button
                                    type="button"
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                    disabled={busy || (!dirty && !hasDraft)}
                                    onClick={() => setPendingChanges(controller.current?.pendingChanges() || [])}
                                >
                                    <Send size={16} />{view.busy === 'publish' ? 'Publication...' : 'Publier'}
                                </button>
                            )}
                            {(hasDraft || dirty) && (
                                <button type="button" className={secondaryButton} disabled={busy} onClick={() => void discard()}>
                                    <Trash2 size={16} />{hasDraft ? 'Abandonner le brouillon' : 'Annuler les modifications'}
                                </button>
                            )}
                        </div>
                    )}

                    {capabilities?.manage_history && (
                        <div className="border-t border-white/10 pt-4">
                            <button type="button" className={secondaryButton} disabled={historyBusy !== null} onClick={() => void loadHistory()}>
                                <History size={16} />{history ? "Actualiser l'historique" : "Afficher l'historique des versions"}
                            </button>
                            {historyError && <p role="alert" className="mt-3 text-sm font-bold text-rose-300">{historyError}</p>}
                            {history && history.length === 0 && <p className="mt-3 text-sm text-slate-400">Aucune version enregistrée pour le moment.</p>}
                            {history && history.length > 0 && (
                                <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
                                    {history.map((item) => (
                                        <li key={item.revision_id} className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between">
                                            <span className="text-sm text-slate-300">
                                                {revisionLabel(item)}
                                                {item.is_published && <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-white">En ligne</span>}
                                                {item.is_draft && <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-white">Brouillon en cours</span>}
                                            </span>
                                            {canEdit && !item.is_draft && (
                                                <button type="button" className={secondaryButton} disabled={historyBusy !== null || busy} onClick={() => void restore(item)}>
                                                    <RotateCcw size={16} />{historyBusy === item.revision_id ? 'Restauration...' : 'Restaurer comme brouillon'}
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
