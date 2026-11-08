// Aperçu en direct de l'éditeur visuel : l'éditeur (même origine, fenêtre parente) envoie le
// document en cours de modification ; l'aperçu l'affiche sans rien enregistrer ni publier.
import type { StorefrontMedia, StorefrontPageKind, ThemeDocumentData } from './types';

export const LIVE_PREVIEW_SOURCE = 'stockman-theme-editor';
export const LIVE_PREVIEW_READY = 'stockman-preview-ready';
export const LIVE_PREVIEW_SELECT = 'stockman-preview-select';

export type LivePreviewMessage = {
    source: typeof LIVE_PREVIEW_SOURCE;
    document: ThemeDocumentData;
    media: Record<string, StorefrontMedia>;
    page: StorefrontPageKind;
    selected: string | null;
};

const PAGES: StorefrontPageKind[] = ['home', 'catalog', 'contact'];

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
        page: PAGES.includes(data.page as StorefrontPageKind) ? (data.page as StorefrontPageKind) : 'home',
        selected: typeof data.selected === 'string' ? data.selected : null,
    };
}
