'use client';

// Éditeur visuel Enterprise : structure des pages, pages personnalisées, réglages complets des
// sections et des blocs, aperçu privé intégré. Le serveur revalide chaque enregistrement et les
// droits Enterprise web.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, Monitor, Paintbrush, Plus, Redo2, Save, Smartphone, Tablet, Trash2, Undo2, X } from 'lucide-react';
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
    blockTypes,
    canAddCustomPage,
    canAddSection,
    canUseHeaderMenu,
    customPageProblem,
    globalFields,
    isRequiredSection,
    moveBlock,
    moveSection,
    pageLabel,
    pageMenu,
    pathProblem,
    proposedPath,
    removeBlock,
    removeCustomPage,
    removeSection,
    sectionFields,
    sectionLabel,
    slugifyPath,
    updateCustomPage,
    type PageMenu,
} from '../lib/themeStructure';
import { LIVE_PREVIEW_READY, LIVE_PREVIEW_SELECT, LIVE_PREVIEW_SOURCE, cleanInlineText, readLivePreviewEdit } from '../storefront/livePreview';

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

export default function EcommerceThemeEditor({ initialState, onClose }: { initialState: ThemeState; onClose: (changed: boolean) => void }) {
    const [server, setServer] = useState<ThemeState>(initialState);
    const [document, setDocument] = useState<ThemeDocument>(() => initialState.draft?.document || initialState.published.document);
    const [saved, setSaved] = useState(() => JSON.stringify(initialState.draft?.document || initialState.published.document));
    const [past, setPast] = useState<ThemeDocument[]>([]);
    const [future, setFuture] = useState<ThemeDocument[]>([]);
    const [pageId, setPageId] = useState(() => document.pages.find((page) => page.kind === 'home')?.id || document.pages[0]?.id);
    const [selected, setSelected] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    // Création d'une page personnalisée : seul le titre est demandé, l'adresse en découle.
    const [newPageTitle, setNewPageTitle] = useState<string | null>(null);
    const [device, setDevice] = useState<Device>('desktop');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState<null | 'save' | 'preview'>(null);
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

    function addNewSection(type: string) {
        if (!page) return;
        // La nouvelle section se place sous la section choisie, sinon en fin de page.
        const after = page.sections.findIndex((item) => item.id === selected);
        const result = addSection(document, page.id, type, after >= 0 ? after + 1 : undefined);
        apply(result.document);
        setSelected(result.id);
        setAdding(false);
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
    // Lien toujours valable du site sur le domaine de l'application ; un domaine connecté accepte le même #/.
    const pageLink = page?.kind === 'custom' && page.path && typeof window !== 'undefined' ? `${window.location.origin}/shop/${server.site_slug}#/${page.path}` : null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B1220] text-white" role="dialog" aria-modal="true" aria-label="Éditeur visuel du site">
            <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
                <p className="text-sm font-black">Éditeur visuel · {server.model.name}</p>
                <nav aria-label="Pages du site" className="flex min-w-0 max-w-full gap-1 overflow-x-auto">
                    {document.pages.map((item) => (
                        <button key={item.id} type="button" aria-current={item.id === page?.id ? 'page' : undefined} title={pageLabel(item)} onClick={() => { setPageId(item.id); setSelected(null); }} className={`max-w-[12rem] shrink-0 truncate rounded-xl px-3 py-2 text-sm font-bold ${item.id === page?.id ? 'bg-primary/20 text-white' : 'text-slate-400 hover:text-white'}`}>
                            {pageLabel(item)}
                        </button>
                    ))}
                    {canManagePages && canAddCustomPage(document) && (
                        <button type="button" className={`${button} shrink-0`} aria-expanded={newPageTitle !== null} aria-label="Ajouter une page personnalisée" title="Ajouter une page personnalisée" onClick={() => setNewPageTitle((value) => (value === null ? '' : null))}>
                            <Plus size={16} />Page
                        </button>
                    )}
                </nav>
                <div className="flex gap-1">
                    <button type="button" className={iconButton} onClick={undo} disabled={!past.length} aria-label="Annuler la dernière action" title="Annuler (Ctrl+Z)"><Undo2 size={16} /></button>
                    <button type="button" className={iconButton} onClick={redo} disabled={!future.length} aria-label="Rétablir" title="Rétablir (Ctrl+Maj+Z)"><Redo2 size={16} /></button>
                </div>
                <div className="flex gap-1" role="group" aria-label="Taille de l'aperçu">
                    {DEVICES.map((item) => (
                        <button key={item.id} type="button" aria-pressed={device === item.id} onClick={() => setDevice(item.id)} className={`${button} ${device === item.id ? 'border-primary bg-primary/20' : ''}`}>{item.icon}<span className="hidden xl:inline">{item.label}</span></button>
                    ))}
                </div>
                <span className="text-xs font-bold text-slate-400" aria-live="polite">Aperçu en direct · {dirty ? 'modifications non enregistrées' : 'brouillon à jour'}</span>
                <div className="ml-auto flex gap-2">
                    <button type="button" className={button} disabled={busy !== null} onClick={() => void openPreview()} title="Recharge aussi les produits et les informations de la boutique"><Eye size={16} />{busy === 'preview' ? 'Préparation...' : "Recharger l'aperçu"}</button>
                    <button type="button" className={button} disabled={busy !== null || !dirty} onClick={() => void save()}><Save size={16} />{busy === 'save' ? 'Enregistrement...' : 'Enregistrer le brouillon'}</button>
                    <button type="button" className={iconButton} onClick={close} aria-label="Fermer l'éditeur"><X size={16} /></button>
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
                    <ol className="mt-3 space-y-2">
                        {page?.sections.map((item, index) => {
                            const required = isRequiredSection(document, page.id, item.id);
                            return (
                                <li key={item.id} className={`rounded-xl border p-2 ${item.id === selected ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5'}`}>
                                    <button type="button" className="w-full text-left text-sm font-bold" onClick={() => setSelected(item.id)} aria-pressed={item.id === selected}>
                                        {sectionLabel(item.type)}{required ? <span className="ml-1 text-xs font-normal text-slate-400">(indispensable)</span> : null}
                                    </button>
                                    <div className="mt-2 flex gap-1">
                                        <button type="button" className={iconButton} disabled={index === 0} onClick={() => apply(moveSection(document, page.id, item.id, -1))} aria-label={`Monter ${sectionLabel(item.type)}`}><ArrowUp size={14} /></button>
                                        <button type="button" className={iconButton} disabled={index === page.sections.length - 1} onClick={() => apply(moveSection(document, page.id, item.id, 1))} aria-label={`Descendre ${sectionLabel(item.type)}`}><ArrowDown size={14} /></button>
                                        <button type="button" className={iconButton} disabled={required} title={required ? 'Section indispensable au parcours commercial' : undefined} onClick={() => { apply(removeSection(document, page.id, item.id)); if (selected === item.id) setSelected(null); }} aria-label={`Supprimer ${sectionLabel(item.type)}`}><Trash2 size={14} /></button>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                    {page && canAddSection(document, page.id) && (
                        <div className="mt-4 space-y-2">
                            <button type="button" className={`${button} w-full`} aria-expanded={adding} onClick={() => setAdding((value) => !value)}>
                                <Plus size={16} />{adding ? 'Fermer la liste' : section ? 'Ajouter une section ici' : 'Ajouter une section'}
                            </button>
                            {adding && (
                                <ul className="space-y-2" aria-label="Sections disponibles">
                                    {addableSections().map((item) => (
                                        <li key={item.type}>
                                            <button type="button" onClick={() => addNewSection(item.type)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/10">
                                                <span className="block text-sm font-bold text-white">{item.label}</span>
                                                {item.description && <span className="mt-1 block text-xs leading-5 text-slate-400">{item.description}</span>}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
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
                                    <fieldset key={group.id} className="space-y-3 rounded-xl border border-white/10 p-3">
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
