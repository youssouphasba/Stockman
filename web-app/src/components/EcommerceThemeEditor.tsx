'use client';

// Éditeur visuel Enterprise : structure des pages, pages personnalisées, réglages complets des
// sections et des blocs, aperçu privé intégré. Le serveur revalide chaque enregistrement et les
// droits Enterprise web.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Eye, EyeOff, GripVertical, Monitor, Paintbrush, Plus, Redo2, RefreshCw, Save, Send, Smartphone, Tablet, Trash2, Undo2, X } from 'lucide-react';
import { ecommerce as ecommerceApi } from '../services/api';
import FieldInput from './ThemeFieldInput';
import ThemePresetPicker from './ThemePresetPicker';
import EcommerceMediaPicker from './EcommerceMediaPicker';
import {
    activeThemePreset,
    applyThemePreset,
    groupThemeFields,
    parseThemeError,
    readThemeValues,
    writeThemeValues,
    type ThemeDocument,
    type ThemeField,
    type ThemeMediaItem,
    type ThemeState,
} from '../lib/ecommerceAppearance';
import {
    MAX_HEADER_PAGES,
    MAX_PATH_LENGTH,
    PAGE_MENUS,
    PAGE_TITLE_MAX_LENGTH,
    addBlock,
    addCustomPage,
    addSection,
    addableSections,
    blockSummary,
    blockTypes,
    canAddCustomPage,
    canAddSection,
    canUseHeaderMenu,
    customPageProblem,
    globalFields,
    isRequiredSection,
    moveBlock,
    moveBlockTo,
    moveSection,
    moveSectionTo,
    pageLabel,
    pageMenu,
    pathProblem,
    proposedPath,
    removeBlock,
    removeCustomPage,
    removeSection,
    sectionFields,
    sectionLabel,
    setSectionHidden,
    slugifyPath,
    updateCustomPage,
    type PageMenu,
} from '../lib/themeStructure';
import { LIVE_PREVIEW_READY, LIVE_PREVIEW_SELECT, LIVE_PREVIEW_SOURCE, cleanInlineText, readLivePreviewEdit, readLivePreviewInsert } from '../storefront/livePreview';

type Device = 'mobile' | 'tablet' | 'desktop';
const DEVICES: Array<{ id: Device; label: string; width: string; icon: React.ReactNode }> = [
    { id: 'mobile', label: 'Mobile', width: '390px', icon: <Smartphone size={16} /> },
    { id: 'tablet', label: 'Tablette', width: '820px', icon: <Tablet size={16} /> },
    { id: 'desktop', label: 'Ordinateur', width: '100%', icon: <Monitor size={16} /> },
];
const HISTORY_LIMIT = 60;
const SITE_FIELDS = globalFields();
const iconButton = 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:opacity-40';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-50';
// Actions compactes des rangées de la liste des sections.
const rowIcon = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30';
const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-white transition-colors hover:bg-primary/90 disabled:opacity-50';

type BlockItem = { id: string; type: string; settings: Record<string, unknown> };
// Élément en cours de glisser-déposer : une section de la page, ou un bloc dans sa section.
type DragItem = { kind: 'section'; id: string } | { kind: 'block'; id: string; sectionId: string };

export default function EcommerceThemeEditor({ initialState, onClose }: { initialState: ThemeState; onClose: (changed: boolean) => void }) {
    const [server, setServer] = useState<ThemeState>(initialState);
    const [document, setDocument] = useState<ThemeDocument>(() => initialState.draft?.document || initialState.published.document);
    const [saved, setSaved] = useState(() => JSON.stringify(initialState.draft?.document || initialState.published.document));
    const [past, setPast] = useState<ThemeDocument[]>([]);
    const [future, setFuture] = useState<ThemeDocument[]>([]);
    const [pageId, setPageId] = useState(() => document.pages.find((page) => page.kind === 'home')?.id || document.pages[0]?.id);
    const [selected, setSelected] = useState<string | null>(null);
    // Place où ajouter une section (0 = en haut de la page) ; null quand la liste est fermée.
    const [addAt, setAddAt] = useState<number | null>(null);
    // Sections dont les blocs sont dépliés dans la liste ; la section choisie l'est toujours.
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const [focusBlock, setFocusBlock] = useState<string | null>(null);
    const [drag, setDrag] = useState<DragItem | null>(null);
    const [dropAt, setDropAt] = useState<number | null>(null);
    // Création d'une page personnalisée : seul le titre est demandé, l'adresse en découle.
    const [newPageTitle, setNewPageTitle] = useState<string | null>(null);
    const [device, setDevice] = useState<Device>('desktop');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState<null | 'save' | 'preview' | 'publish'>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [changed, setChanged] = useState(false);
    const [pickerField, setPickerField] = useState<ThemeField | null>(null);
    const [mediaCache, setMediaCache] = useState<Record<string, ThemeMediaItem>>({});
    const lastField = useRef<string | null>(null);
    const frame = useRef<HTMLIFrameElement>(null);
    // Dernière version du traitement des textes tapés dans l'aperçu, pour l'écouteur de messages.
    const inlineEdit = useRef<(field: string, value: string) => void>(() => undefined);

    const dirty = JSON.stringify(document) !== saved;
    const page = document.pages.find((item) => item.id === pageId) || document.pages[0];
    const section = page?.sections.find((item) => item.id === selected) || null;
    // Sans section choisie, le panneau de droite règle le site entier (identité, style, en-tête, pied de page).
    const fields = useMemo(() => (section && page ? sectionFields(document, page.id, section.id) : SITE_FIELDS), [document, page, section]);
    const values = useMemo(() => readThemeValues(document, fields), [document, fields]);

    // Chaque action structurelle est annulable ; la saisie continue d'un même champ compte pour une étape.
    const apply = useCallback((next: ThemeDocument, fieldId: string | null = null) => {
        if (next === document) return;
        if (!fieldId || fieldId !== lastField.current) setPast((items) => [...items.slice(-(HISTORY_LIMIT - 1)), document]);
        lastField.current = fieldId;
        setFuture([]);
        setDocument(next);
        setNotice(null);
    }, [document]);

    const undo = useCallback(() => {
        if (!past.length) return;
        setFuture((items) => [document, ...items]);
        setDocument(past[past.length - 1]);
        setPast((items) => items.slice(0, -1));
        lastField.current = null;
    }, [document, past]);

    const redo = useCallback(() => {
        if (!future.length) return;
        setPast((items) => [...items, document]);
        setDocument(future[0]);
        setFuture((items) => items.slice(1));
        lastField.current = null;
    }, [document, future]);

    useEffect(() => {
        const handle = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (event.key === 'Escape') setAddAt(null);
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) redo(); else undo();
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [redo, undo]);

    async function save(): Promise<ThemeState | null> {
        // Mêmes règles que le serveur : le problème est montré sur la page concernée.
        const problem = customPageProblem(document);
        if (problem) {
            setPageId(problem.pageId);
            setSelected(null);
            setError(problem.message);
            return null;
        }
        setBusy('save');
        setError(null);
        try {
            const next = await ecommerceApi.saveThemeDraft({ site_slug: server.site_slug, lock_version: server.lock_version, document });
            setServer(next);
            const stored = next.draft?.document || next.published.document;
            setDocument(stored);
            setSaved(JSON.stringify(stored));
            setChanged(true);
            setNotice("Brouillon enregistré. Le site public n'a pas changé.");
            return next;
        } catch (err) {
            setError(parseThemeError(err, "Impossible d'enregistrer le brouillon. Vérifiez votre connexion puis réessayez.").message);
            return null;
        } finally {
            setBusy(null);
        }
    }

    // Publication directe depuis l'éditeur : les modifications sont d'abord enregistrées en brouillon,
    // puis ce brouillon devient le site public, avec les mêmes contrôles que « Apparence du site ».
    async function publish() {
        const message = server.site_enabled
            ? 'Publier ces changements ? Vos visiteurs verront aussitôt la nouvelle apparence du site. Les versions précédentes restent dans l\'historique.'
            : 'Publier ces changements ? Le site est désactivé : la publication ne l\'active pas.';
        if (!window.confirm(message)) return;
        const state = dirty ? await save() : server;
        if (!state) return;
        if (!state.draft) {
            setNotice('Rien à publier : le site public affiche déjà cette version.');
            return;
        }
        setBusy('publish');
        setError(null);
        try {
            const next = await ecommerceApi.publishTheme({
                site_slug: state.site_slug,
                lock_version: state.lock_version,
                revision_id: state.draft.revision_id,
                published_fingerprint: state.published.fingerprint,
            });
            setServer(next);
            const stored = next.draft?.document || next.published.document;
            setDocument(stored);
            setSaved(JSON.stringify(stored));
            setChanged(true);
            setNotice(next.site_enabled ? 'Apparence publiée sur votre site.' : "Apparence publiée. Le site reste désactivé tant que vous ne l'activez pas.");
        } catch (err) {
            setError(parseThemeError(err, "Impossible de publier l'apparence du site. Vérifiez votre connexion puis réessayez.").message);
        } finally {
            setBusy(null);
        }
    }

    // L'aperçu reçoit ensuite le document en cours à chaque modification, sans enregistrement.
    const openPreview = useCallback(async () => {
        setBusy('preview');
        setError(null);
        try {
            const result = await ecommerceApi.createThemePreview({ site_slug: server.site_slug, source: server.draft ? 'draft' : 'published' });
            setPreviewUrl(result.preview_url);
        } catch (err) {
            setError(parseThemeError(err, "Impossible de préparer l'aperçu.").message);
        } finally {
            setBusy(null);
        }
    }, [server.draft, server.site_slug]);

    useEffect(() => {
        void openPreview();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const previewOrigin = previewUrl ? new URL(previewUrl).origin : null;
    const sendLive = useCallback(() => {
        const target = frame.current?.contentWindow;
        if (!target || !previewOrigin) return;
        const liveMedia = Object.fromEntries(Object.entries({ ...server.media, ...mediaCache }).map(([id, item]) => [id, { alt: item.alt, width: item.width, height: item.height, urls: item.urls }]));
        target.postMessage({ source: LIVE_PREVIEW_SOURCE, document, media: liveMedia, page: page?.id || 'home', selected }, previewOrigin);
    }, [document, mediaCache, page?.id, previewOrigin, selected, server.media]);

    useEffect(() => {
        const timer = window.setTimeout(sendLive, 120);
        return () => window.clearTimeout(timer);
    }, [sendLive]);

    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (!previewOrigin || event.origin !== previewOrigin || event.source !== frame.current?.contentWindow) return;
            if (event.data?.type === LIVE_PREVIEW_READY) sendLive();
            if (event.data?.type === LIVE_PREVIEW_SELECT && typeof event.data.section === 'string') setSelected(event.data.section);
            const insert = readLivePreviewInsert(event, previewOrigin, frame.current?.contentWindow);
            if (insert !== null) setAddAt(insert);
            const inline = readLivePreviewEdit(event, previewOrigin, frame.current?.contentWindow);
            if (inline) inlineEdit.current(inline.field, inline.value);
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [previewOrigin, sendLive]);

    function close() {
        if (dirty && !window.confirm("Fermer l'éditeur ? Les modifications non enregistrées seront perdues.")) return;
        onClose(changed);
    }

    function setField(field: ThemeField, value: string) {
        apply(writeThemeValues(document, [field], { [field.id]: value }), field.id);
    }

    // Texte tapé directement dans l'aperçu : seul un champ texte existant de la section est accepté,
    // nettoyé selon les règles du registre, puis traité comme une saisie dans le panneau.
    function applyInlineEdit(fieldId: string, raw: string) {
        const [pageKey, sectionKey] = fieldId.split('.');
        let candidates: ThemeField[] = [];
        try {
            candidates = sectionFields(document, pageKey, sectionKey);
        } catch {
            return;
        }
        const field = candidates.find((item) => item.id === fieldId && item.type === 'text');
        if (!field) return;
        if (selected !== sectionKey) setSelected(sectionKey);
        setField(field, cleanInlineText(raw, !!field.multiline, field.max_length));
    }

    useEffect(() => { inlineEdit.current = applyInlineEdit; });

    // Liste des sections ouverte depuis la colonne de gauche : sous la section choisie, sinon en fin de page.
    function openAddList() {
        if (!page) return;
        const after = page.sections.findIndex((item) => item.id === selected);
        setAddAt(after >= 0 ? after + 1 : page.sections.length);
    }

    function addNewSection(type: string) {
        if (!page || addAt === null) return;
        const result = addSection(document, page.id, type, Math.min(addAt, page.sections.length));
        apply(result.document);
        setSelected(result.id);
        setAddAt(null);
    }

    function toggleExpanded(id: string) {
        setExpanded((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function chooseBlock(sectionId: string, blockId: string) {
        setSelected(sectionId);
        setFocusBlock(blockId);
    }

    // Le réglage du bloc choisi dans la liste est amené à l'écran dans le panneau de droite.
    useEffect(() => {
        if (!focusBlock) return;
        const timer = window.setTimeout(() => window.document.getElementById(`editor-block-${focusBlock}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        return () => window.clearTimeout(timer);
    }, [focusBlock, selected]);

    // --- Glisser-déposer (souris) et flèches haut / bas sur la poignée (clavier) ---
    function startDrag(event: React.DragEvent, item: DragItem) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.id);
        setDrag(item);
    }

    function endDrag() {
        setDrag(null);
        setDropAt(null);
    }

    function dragOver(event: React.DragEvent, index: number, kind: DragItem['kind'], sectionId?: string) {
        if (!drag || drag.kind !== kind || (drag.kind === 'block' && drag.sectionId !== sectionId)) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        // Sur une section dépliée, seule la rangée du titre décide d'avant ou d'après.
        const middle = rect.top + Math.min(rect.height, 40) / 2;
        setDropAt(index + (event.clientY > middle ? 1 : 0));
    }

    function drop(event: React.DragEvent) {
        if (!drag || dropAt === null || !page) return endDrag();
        event.preventDefault();
        event.stopPropagation();
        if (drag.kind === 'section') {
            const from = page.sections.findIndex((item) => item.id === drag.id);
            apply(moveSectionTo(document, page.id, drag.id, dropAt > from ? dropAt - 1 : dropAt));
        } else {
            const owner = page.sections.find((item) => item.id === drag.sectionId);
            const from = owner ? (owner.blocks as BlockItem[]).findIndex((item) => item.id === drag.id) : -1;
            if (owner && from >= 0) apply(moveBlockTo(document, page.id, owner.id, drag.id, dropAt > from ? dropAt - 1 : dropAt));
        }
        endDrag();
    }

    function keyMove(event: React.KeyboardEvent, move: (delta: number) => ThemeDocument, handleId: string) {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        apply(move(event.key === 'ArrowUp' ? -1 : 1));
        // L'élément déplacé garde le focus pour enchaîner les déplacements.
        window.requestAnimationFrame(() => (window.document.querySelector(`[data-editor-handle="${handleId}"]`) as HTMLElement | null)?.focus());
    }

    function dropLine(active: boolean, edge: 'top' | 'bottom') {
        return active ? <span aria-hidden="true" className={`pointer-events-none absolute inset-x-1 ${edge === 'top' ? '-top-[3px]' : '-bottom-[3px]'} h-0.5 rounded bg-primary`} /> : null;
    }

    function createPage(event: React.FormEvent) {
        event.preventDefault();
        try {
            const result = addCustomPage(document, newPageTitle || '');
            apply(result.document);
            setPageId(result.id);
            setSelected(null);
            setNewPageTitle(null);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Impossible d'ajouter la page.");
        }
    }

    function editPage(patch: { title?: string; path?: string; menu?: PageMenu }, field: string) {
        if (page?.kind === 'custom') apply(updateCustomPage(document, page.id, patch), `page:${page.id}:${field}`);
    }

    function deletePage() {
        if (page?.kind !== 'custom') return;
        if (!window.confirm(`Supprimer la page « ${pageLabel(page)} » et ses sections ? Elle peut être rétablie avec « Annuler la dernière action » (Ctrl+Z) tant que l'éditeur reste ouvert.`)) return;
        apply(removeCustomPage(document, page.id));
        setPageId(document.pages.find((item) => item.kind === 'home')?.id || document.pages[0]?.id);
        setSelected(null);
    }

    function applyPreset(presetId: string) {
        const preset = server.presets?.find((item) => item.id === presetId);
        if (!preset) return;
        const current = readThemeValues(document, SITE_FIELDS);
        apply(writeThemeValues(document, SITE_FIELDS, applyThemePreset(SITE_FIELDS, current, preset)));
    }

    const media = { ...server.media, ...mediaCache };
    const groups = groupThemeFields(fields);
    const deviceWidth = DEVICES.find((item) => item.id === device)?.width || '100%';
    const canManagePages = !!server.capabilities?.custom_pages;
    const pathError = page?.kind === 'custom' ? pathProblem(document, page.id, page.path || '') : null;
    const headerAvailable = page?.kind === 'custom' ? canUseHeaderMenu(document, page.id) : false;
    const status = dirty ? 'Modifications non enregistrées' : server.draft ? 'Brouillon enregistré, pas encore publié' : 'Identique au site publié';
    // Lien toujours valable du site sur le domaine de l'application ; un domaine connecté accepte le même #/.
    const pageLink = page?.kind === 'custom' && page.path && typeof window !== 'undefined' ? `${window.location.origin}/shop/${server.site_slug}#/${page.path}` : null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B1220] text-white" role="dialog" aria-modal="true" aria-label="Éditeur visuel du site">
            <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <button type="button" className={iconButton} onClick={close} aria-label="Fermer l'éditeur" title="Fermer l'éditeur"><X size={16} /></button>
                <div className="hidden min-w-0 max-w-[13rem] md:block">
                    <p className="truncate text-sm font-black">Éditeur visuel · {server.model.name}</p>
                    <p className="truncate text-xs font-bold text-slate-400" aria-live="polite">{status}</p>
                </div>
                <label htmlFor="editor-page" className="sr-only">Page à modifier</label>
                <select
                    id="editor-page"
                    value={page?.id || ''}
                    onChange={(event) => { setPageId(event.target.value); setSelected(null); }}
                    className="h-10 min-w-0 max-w-[14rem] rounded-xl border border-white/10 bg-[#0F172A] px-3 text-sm font-bold text-white"
                >
                    {document.pages.map((item) => <option key={item.id} value={item.id}>{pageLabel(item)}</option>)}
                </select>
                {canManagePages && canAddCustomPage(document) && (
                    <button type="button" className={iconButton} aria-expanded={newPageTitle !== null} aria-label="Ajouter une page personnalisée" title="Ajouter une page personnalisée" onClick={() => setNewPageTitle((value) => (value === null ? '' : null))}>
                        <Plus size={16} />
                    </button>
                )}
                <div className="mx-auto flex items-center gap-1">
                    <div className="flex gap-1" role="group" aria-label="Taille de l'aperçu">
                        {DEVICES.map((item) => (
                            <button key={item.id} type="button" aria-pressed={device === item.id} aria-label={`Aperçu ${item.label.toLowerCase()}`} title={item.label} onClick={() => setDevice(item.id)} className={`${iconButton} ${device === item.id ? 'border-primary bg-primary/20' : ''}`}>{item.icon}</button>
                        ))}
                    </div>
                    <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
                    <button type="button" className={iconButton} onClick={undo} disabled={!past.length} aria-label="Annuler la dernière action" title="Annuler (Ctrl+Z)"><Undo2 size={16} /></button>
                    <button type="button" className={iconButton} onClick={redo} disabled={!future.length} aria-label="Rétablir" title="Rétablir (Ctrl+Maj+Z)"><Redo2 size={16} /></button>
                    <button type="button" className={iconButton} disabled={busy !== null} onClick={() => void openPreview()} aria-label="Recharger l'aperçu" title="Recharger l'aperçu (produits et informations de la boutique)"><RefreshCw size={16} className={busy === 'preview' ? 'animate-spin' : undefined} /></button>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button type="button" className={button} disabled={busy !== null || !dirty} onClick={() => void save()} title="Enregistre un brouillon, sans changer le site public">
                        <Save size={16} /><span className="hidden lg:inline">{busy === 'save' ? 'Enregistrement...' : 'Enregistrer'}</span>
                    </button>
                    {server.capabilities?.publish && (
                        <button type="button" className={primaryButton} disabled={busy !== null || (!dirty && !server.draft)} onClick={() => void publish()}>
                            <Send size={16} />{busy === 'publish' ? 'Publication...' : 'Publier'}
                        </button>
                    )}
                </div>
            </header>
            {newPageTitle !== null && (
                <form onSubmit={createPage} aria-label="Nouvelle page" className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
                    <label htmlFor="editor-new-page" className="text-sm font-bold">Titre de la nouvelle page</label>
                    <input
                        id="editor-new-page"
                        autoFocus
                        value={newPageTitle}
                        maxLength={PAGE_TITLE_MAX_LENGTH}
                        onChange={(event) => setNewPageTitle(event.target.value)}
                        placeholder="Titre affiché dans la navigation"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-primary/50 sm:max-w-sm"
                    />
                    <span className="text-xs text-slate-400">Adresse : #/{newPageTitle.trim() ? proposedPath(document, newPageTitle) : '...'}</span>
                    <button type="submit" className={button} disabled={!newPageTitle.trim()}>Créer la page</button>
                    <button type="button" className={button} onClick={() => setNewPageTitle(null)}>Annuler</button>
                </form>
            )}
            {(error || notice) && (
                <p role={error ? 'alert' : 'status'} className={`px-4 py-2 text-sm font-bold ${error ? 'bg-rose-500/10 text-rose-300' : 'bg-emerald-500/10 text-white'}`}>{error || notice}</p>
            )}
            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_360px]">
                <aside className="min-h-0 overflow-y-auto border-r border-white/10 p-4" aria-label="Sections de la page">
                    {page?.kind === 'custom' && (
                        <fieldset className="mb-4 space-y-3 rounded-xl border border-white/10 p-3" disabled={!canManagePages}>
                            <legend className="px-1 text-sm font-black">Page personnalisée</legend>
                            <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
                                Titre
                                <input
                                    value={page.title || ''}
                                    maxLength={PAGE_TITLE_MAX_LENGTH}
                                    onChange={(event) => editPage({ title: event.target.value }, 'title')}
                                    className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm font-normal text-white outline-none focus:border-primary/50"
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
                                Adresse
                                <span className="flex items-center rounded-xl border border-white/10 bg-[#0F172A] focus-within:border-primary/50">
                                    <span className="pl-3 text-sm font-normal text-slate-500" aria-hidden="true">#/</span>
                                    <input
                                        value={page.path || ''}
                                        maxLength={MAX_PATH_LENGTH}
                                        spellCheck={false}
                                        aria-invalid={!!pathError}
                                        aria-describedby="editor-page-path-help"
                                        onChange={(event) => editPage({ path: slugifyPath(event.target.value, false) }, 'path')}
                                        onBlur={() => {
                                            const strict = slugifyPath(page.path || '');
                                            if (strict !== page.path) editPage({ path: strict }, 'path');
                                        }}
                                        className="min-w-0 flex-1 bg-transparent px-1 py-2 font-mono text-sm font-normal text-white outline-none"
                                    />
                                </span>
                            </label>
                            <p id="editor-page-path-help" className={`text-xs leading-5 [overflow-wrap:anywhere] ${pathError ? 'text-rose-300' : 'text-slate-500'}`}>
                                {pathError || (pageLink ? `Lien de la page : ${pageLink}. Sur un domaine connecté, ajoutez #/${page.path} à son adresse.` : null)}
                            </p>
                            <label className="flex flex-col gap-1 text-xs font-bold text-slate-400">
                                Navigation
                                <select
                                    value={pageMenu(page)}
                                    onChange={(event) => editPage({ menu: event.target.value as PageMenu }, 'menu')}
                                    className="rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-sm font-normal text-white"
                                >
                                    {PAGE_MENUS.map((option) => (
                                        <option key={option.value} value={option.value} disabled={option.value === 'header' && !headerAvailable && pageMenu(page) !== 'header'}>{option.label}</option>
                                    ))}
                                </select>
                            </label>
                            {!headerAvailable && pageMenu(page) !== 'header' && (
                                <p className="text-xs leading-5 text-slate-500">Le menu principal accueille déjà {MAX_HEADER_PAGES} pages personnalisées.</p>
                            )}
                            <button type="button" className={`${button} w-full`} onClick={deletePage}><Trash2 size={16} />Supprimer la page</button>
                        </fieldset>
                    )}
                    <button type="button" onClick={() => setSelected(null)} aria-pressed={!section} className={`mb-4 flex w-full items-center gap-2 rounded-xl border p-3 text-left text-sm font-bold ${!section ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                        <Paintbrush size={16} aria-hidden="true" />Réglages du site
                        <span className="ml-auto text-xs font-normal text-slate-400">Styles, couleurs, en-tête</span>
                    </button>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Sections</p>
                    <ol className="mt-2 space-y-1" aria-label="Sections de la page, dans l'ordre d'affichage" onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropAt(null); }}>
                        {page?.sections.map((item, index) => {
                            const label = sectionLabel(item.type);
                            const required = isRequiredSection(document, page.id, item.id);
                            const blocks = item.blocks as BlockItem[];
                            const open = blocks.length > 0 && (expanded.has(item.id) || item.id === selected);
                            const sectionDrag = drag?.kind === 'section';
                            return (
                                <li
                                    key={item.id}
                                    onDragOver={(event) => dragOver(event, index, 'section')}
                                    onDrop={drop}
                                    className={`relative rounded-xl border ${item.id === selected ? 'border-primary bg-primary/10' : 'border-transparent hover:border-white/10 hover:bg-white/5'} ${drag?.id === item.id ? 'opacity-50' : ''}`}
                                >
                                    {dropLine(sectionDrag && dropAt === index, 'top')}
                                    <div className="flex items-center gap-0.5 px-1 py-0.5">
                                        <button
                                            type="button"
                                            draggable
                                            data-editor-handle={item.id}
                                            onDragStart={(event) => startDrag(event, { kind: 'section', id: item.id })}
                                            onDragEnd={endDrag}
                                            onKeyDown={(event) => keyMove(event, (delta) => moveSection(document, page.id, item.id, delta), item.id)}
                                            aria-label={`Déplacer ${label} : glissez, ou utilisez les flèches haut et bas`}
                                            title="Glisser pour déplacer"
                                            className={`${rowIcon} cursor-grab active:cursor-grabbing`}
                                        >
                                            <GripVertical size={14} />
                                        </button>
                                        {blocks.length > 0 ? (
                                            <button type="button" className={rowIcon} aria-expanded={open} aria-label={`${open ? 'Replier' : 'Déplier'} les éléments de ${label}`} onClick={() => toggleExpanded(item.id)}>
                                                <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
                                            </button>
                                        ) : <span aria-hidden="true" className="w-7 shrink-0" />}
                                        <button type="button" className={`min-w-0 flex-1 truncate py-1.5 text-left text-sm font-bold ${item.hidden ? 'text-slate-400 line-through decoration-1' : ''}`} onClick={() => setSelected(item.id)} aria-pressed={item.id === selected} title={label}>
                                            {label}{required ? <span className="ml-1 text-xs font-normal text-slate-400">(indispensable)</span> : null}
                                            {item.hidden ? <span className="sr-only"> (masquée)</span> : null}
                                        </button>
                                        <button
                                            type="button"
                                            className={rowIcon}
                                            disabled={!item.hidden && required}
                                            onClick={() => apply(setSectionHidden(document, page.id, item.id, !item.hidden))}
                                            aria-label={item.hidden ? `Afficher ${label} sur le site` : `Masquer ${label} sur le site`}
                                            title={!item.hidden && required ? 'Section indispensable au parcours commercial' : item.hidden ? 'Afficher sur le site' : 'Masquer sur le site, sans supprimer'}
                                        >
                                            {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        <button type="button" className={rowIcon} disabled={required} title={required ? 'Section indispensable au parcours commercial' : 'Supprimer la section'} onClick={() => { apply(removeSection(document, page.id, item.id)); if (selected === item.id) setSelected(null); }} aria-label={`Supprimer ${label}`}><Trash2 size={14} /></button>
                                    </div>
                                    {open && (
                                        <ol className="mb-1 ml-9 mr-1 space-y-0.5 border-l border-white/10 pl-1" aria-label={`Éléments de ${label}`}>
                                            {blocks.map((block, blockIndex) => {
                                                const summary = blockSummary(item.type, block, blockIndex);
                                                const handle = `${item.id}:${block.id}`;
                                                return (
                                                    <li key={block.id} onDragOver={(event) => dragOver(event, blockIndex, 'block', item.id)} onDrop={drop} className={`relative flex items-center gap-0.5 rounded-lg ${focusBlock === block.id && selected === item.id ? 'bg-white/5' : ''} ${drag?.id === block.id ? 'opacity-50' : ''}`}>
                                                        {dropLine(drag?.kind === 'block' && drag.sectionId === item.id && dropAt === blockIndex, 'top')}
                                                        <button
                                                            type="button"
                                                            draggable
                                                            data-editor-handle={handle}
                                                            onDragStart={(event) => { event.stopPropagation(); startDrag(event, { kind: 'block', id: block.id, sectionId: item.id }); }}
                                                            onDragEnd={endDrag}
                                                            onKeyDown={(event) => keyMove(event, (delta) => moveBlock(document, page.id, item.id, block.id, delta), handle)}
                                                            aria-label={`Déplacer ${summary.label} : glissez, ou utilisez les flèches haut et bas`}
                                                            title="Glisser pour déplacer"
                                                            className={`${rowIcon} cursor-grab active:cursor-grabbing`}
                                                        >
                                                            <GripVertical size={12} />
                                                        </button>
                                                        <button type="button" className="min-w-0 flex-1 truncate py-1 text-left text-xs" onClick={() => chooseBlock(item.id, block.id)} title={summary.text || summary.label}>
                                                            <span className="font-bold">{summary.label}</span>
                                                            <span className="text-slate-400">{summary.text ? ` · ${summary.text}` : ' · vide'}</span>
                                                        </button>
                                                        <button type="button" className={rowIcon} onClick={() => apply(removeBlock(document, page.id, item.id, block.id))} aria-label={`Supprimer ${summary.label}`} title="Supprimer"><Trash2 size={12} /></button>
                                                        {blockIndex === blocks.length - 1 && dropLine(drag?.kind === 'block' && drag.sectionId === item.id && dropAt === blocks.length, 'bottom')}
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    )}
                                    {index === page.sections.length - 1 && dropLine(sectionDrag && dropAt === page.sections.length, 'bottom')}
                                </li>
                            );
                        })}
                    </ol>
                    {page && canAddSection(document, page.id) && (
                        <button type="button" className={`${button} mt-3 w-full`} onClick={openAddList}>
                            <Plus size={16} />{section ? 'Ajouter une section ici' : 'Ajouter une section'}
                        </button>
                    )}
                    <p className="mt-3 text-xs leading-5 text-slate-500">Glissez une section par sa poignée pour la déplacer. L'œil la masque sur le site sans perdre ses réglages. Dans l'aperçu, « + Section » ajoute une section entre deux autres.</p>
                </aside>
                <main className="flex min-h-0 items-start justify-center overflow-auto bg-[#060B14] p-4" aria-label="Aperçu">
                    {previewUrl ? (
                        <iframe ref={frame} key={previewUrl} src={previewUrl} title="Aperçu privé du site" style={{ width: deviceWidth }} className="h-full min-h-[600px] max-w-full rounded-xl border border-white/10 bg-white transition-[width]" />
                    ) : (
                        <div className="mt-20 max-w-sm text-center text-sm leading-6 text-slate-400">
                            {busy === 'preview' ? "Préparation de l'aperçu..." : "L'aperçu n'a pas pu être préparé. Utilisez « Recharger l'aperçu »."}
                        </div>
                    )}
                </main>
                <aside className="min-h-0 overflow-y-auto border-l border-white/10 p-4" aria-label={section ? 'Réglages de la section' : 'Réglages du site'}>
                    {!section ? (
                        <div className="space-y-5">
                            <div>
                                <p className="text-base font-black">Réglages du site</p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">Cliquez sur une section ou sur un texte de l'aperçu pour le modifier directement.</p>
                            </div>
                            {!!server.presets?.length && (
                                <section className="space-y-3" aria-labelledby="editor-presets-title">
                                    <p id="editor-presets-title" className="text-sm font-black">Styles prêts à l'emploi</p>
                                    <ThemePresetPicker
                                        presets={server.presets}
                                        fields={SITE_FIELDS}
                                        active={activeThemePreset(SITE_FIELDS, values, server.presets)}
                                        brandColor={values['global.brand_color']}
                                        disabled={busy !== null}
                                        onApply={(preset) => applyPreset(preset.id)}
                                    />
                                </section>
                            )}
                            {groups.map((group) => (
                                <fieldset key={group.id} className="space-y-3 rounded-xl border border-white/10 p-3">
                                    <legend className="px-1 text-sm font-black">{group.label}</legend>
                                    {group.fields.map((field) => (
                                        <div key={field.id} className="flex flex-col gap-2">
                                            <span className="text-sm font-semibold">{field.label}</span>
                                            {field.hint && <span className="text-xs leading-5 text-slate-500">{field.hint}</span>}
                                            <FieldInput
                                                field={field}
                                                value={values[field.id] || ''}
                                                disabled={busy !== null}
                                                media={values[field.id] ? media[values[field.id]] : null}
                                                onChange={(value) => setField(field, value)}
                                                onPick={() => setPickerField(field)}
                                            />
                                        </div>
                                    ))}
                                </fieldset>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <p className="text-base font-black">{sectionLabel(section.type)}</p>
                            {groups.map((group) => {
                                const block = group.id !== 'fields' ? (section.blocks as Array<{ id: string }>).find((item) => item.id === group.id) : null;
                                const blockIndex = block ? (section.blocks as Array<{ id: string }>).indexOf(block) : -1;
                                return (
                                    <fieldset key={group.id} id={block ? `editor-block-${block.id}` : undefined} className={`scroll-mt-4 space-y-3 rounded-xl border p-3 ${block && focusBlock === block.id ? 'border-primary/60' : 'border-white/10'}`}>
                                        {block && (
                                            <legend className="flex w-full items-center gap-1 px-1 text-sm font-black">
                                                <span className="flex-1">{group.label}</span>
                                                <button type="button" className={iconButton} disabled={blockIndex === 0} onClick={() => apply(moveBlock(document, page.id, section.id, block.id, -1))} aria-label={`Monter ${group.label}`}><ArrowUp size={14} /></button>
                                                <button type="button" className={iconButton} disabled={blockIndex === section.blocks.length - 1} onClick={() => apply(moveBlock(document, page.id, section.id, block.id, 1))} aria-label={`Descendre ${group.label}`}><ArrowDown size={14} /></button>
                                                <button type="button" className={iconButton} onClick={() => apply(removeBlock(document, page.id, section.id, block.id))} aria-label={`Supprimer ${group.label}`}><Trash2 size={14} /></button>
                                            </legend>
                                        )}
                                        {group.fields.map((field) => (
                                            <div key={field.id} className="flex flex-col gap-2">
                                                <span className="text-sm font-semibold">{field.label}</span>
                                                {field.hint && <span className="text-xs leading-5 text-slate-500">{field.hint}</span>}
                                                <FieldInput
                                                    field={field}
                                                    value={values[field.id] || ''}
                                                    disabled={busy !== null}
                                                    media={values[field.id] ? media[values[field.id]] : null}
                                                    categories={server.categories}
                                                    onChange={(value) => setField(field, value)}
                                                    onPick={() => setPickerField(field)}
                                                />
                                            </div>
                                        ))}
                                    </fieldset>
                                );
                            })}
                            {blockTypes(section.type).map((item) => (
                                <button key={item.type} type="button" className={`${button} w-full`} onClick={() => apply(addBlock(document, page.id, section.id, item.type))}><Plus size={16} />Ajouter : {item.label}</button>
                            ))}
                        </div>
                    )}
                </aside>
            </div>
            {addAt !== null && page && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setAddAt(null)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="editor-add-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0F172A] text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start gap-3 border-b border-white/10 p-4">
                            <div className="min-w-0 flex-1">
                                <p id="editor-add-title" className="text-base font-black">Ajouter une section</p>
                                <p className="mt-1 text-xs text-slate-400">
                                    {addAt <= 0 ? 'En haut de la page' : addAt >= page.sections.length ? 'En bas de la page' : `Entre « ${sectionLabel(page.sections[addAt - 1].type)} » et « ${sectionLabel(page.sections[addAt].type)} »`} · {pageLabel(page)}
                                </p>
                            </div>
                            <button type="button" className={iconButton} onClick={() => setAddAt(null)} aria-label="Fermer la liste des sections"><X size={16} /></button>
                        </div>
                        {canAddSection(document, page.id) ? (
                            <ul className="grid gap-2 overflow-y-auto p-4 sm:grid-cols-2" aria-label="Sections disponibles">
                                {addableSections().map((item, index) => (
                                    <li key={item.type}>
                                        <button type="button" autoFocus={index === 0} onClick={() => addNewSection(item.type)} className="h-full w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/10">
                                            <span className="block text-sm font-bold text-white">{item.label}</span>
                                            {item.description && <span className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</span>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="p-4 text-sm text-slate-300">Cette page compte déjà le nombre maximal de sections. Supprimez-en une pour en ajouter une autre.</p>
                        )}
                    </div>
                </div>
            )}
            {pickerField && (
                <EcommerceMediaPicker
                    kind={pickerField.media_kind || 'image'}
                    siteSlug={server.site_slug}
                    title={pickerField.label}
                    selectedId={values[pickerField.id] || null}
                    canEdit
                    onSelect={(item) => {
                        setMediaCache((current) => ({ ...current, [item.media_id]: item }));
                        setField(pickerField, item.media_id);
                        setPickerField(null);
                    }}
                    onClose={() => setPickerField(null)}
                />
            )}
        </div>
    );
}
