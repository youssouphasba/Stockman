// Aperçu en direct de l'éditeur visuel : l'éditeur (même origine, fenêtre parente) envoie le
// document en cours de modification ; l'aperçu l'affiche sans rien enregistrer ni publier.
import type { StorefrontMedia, ThemeDocumentData } from './types';

export const LIVE_PREVIEW_SOURCE = 'stockman-theme-editor';
export const LIVE_PREVIEW_READY = 'stockman-preview-ready';
export const LIVE_PREVIEW_SELECT = 'stockman-preview-select';
// Texte modifié directement dans l'aperçu : l'éditeur vérifie le champ puis met à jour son document.
export const LIVE_PREVIEW_EDIT = 'stockman-preview-edit';

export type LivePreviewMessage = {
    source: typeof LIVE_PREVIEW_SOURCE;
    document: ThemeDocumentData;
    media: Record<string, StorefrontMedia>;
    // Identifiant de la page ouverte dans l'éditeur (pages du modèle et pages personnalisées).
    page: string;
    selected: string | null;
};

const PAGE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// Seuls des messages de la fenêtre parente, de la même origine et au schéma attendu sont acceptés.
export function readLivePreviewMessage(event: MessageEvent, expectedOrigin: string, parent: Window | null): LivePreviewMessage | null {
    if (event.origin !== expectedOrigin || !parent || event.source !== parent) return null;
    const data = event.data as Partial<LivePreviewMessage> | null;
    if (!data || data.source !== LIVE_PREVIEW_SOURCE) return null;
    const document = data.document as ThemeDocumentData | undefined;
    if (!document || typeof document.model_id !== 'string' || !Array.isArray(document.pages) || typeof document.global_settings !== 'object') return null;
    if (!document.pages.every((page) => page && typeof page.kind === 'string' && Array.isArray(page.sections))) return null;
    return {
        source: LIVE_PREVIEW_SOURCE,
        document,
        media: data.media && typeof data.media === 'object' ? data.media : {},
        page: typeof data.page === 'string' && PAGE_ID.test(data.page) ? data.page : 'home',
        selected: typeof data.selected === 'string' ? data.selected : null,
    };
}

export type LivePreviewEdit = { field: string; value: string };

// Côté éditeur : seul l'aperçu intégré (même origine, cadre attendu) peut proposer un texte, et
// uniquement pour un champ au format « page.section.réglage » ou « page.section.bloc.réglage ».
export function readLivePreviewEdit(event: MessageEvent, expectedOrigin: string, frame: Window | null | undefined): LivePreviewEdit | null {
    if (event.origin !== expectedOrigin || !frame || event.source !== frame) return null;
    const data = event.data as { type?: unknown; field?: unknown; value?: unknown } | null;
    if (!data || data.type !== LIVE_PREVIEW_EDIT || typeof data.field !== 'string' || typeof data.value !== 'string') return null;
    if (!/^[a-z0-9][a-z0-9_-]*(\.[a-z0-9][a-z0-9_-]*){2,3}$/.test(data.field) || data.value.length > 5000) return null;
    return { field: data.field, value: data.value };
}

// Mêmes règles que le serveur : pas de caractère de contrôle, pas de retour à la ligne dans un
// texte d'une seule ligne, et des espaces ordinaires à la place des espaces insécables de saisie.
export function cleanInlineText(raw: string, multiline: boolean, maxLength?: number) {
    let text = raw.replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n');
    text = multiline ? text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '') : text.replace(/\s*\n\s*/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '');
    return maxLength ? text.slice(0, maxLength) : text;
}
