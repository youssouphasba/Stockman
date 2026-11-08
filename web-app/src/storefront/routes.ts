// Pages d'un site à sections et leurs adresses. Accueil, Catalogue et Contact gardent leurs
// fragments historiques (#catalogue, #contact) ; une page personnalisée s'ouvre avec « #/ »
// suivi de son chemin, ce qui fonctionne aussi sur un domaine connecté sans route supplémentaire.
import type { StorefrontPageKind, StorefrontRoute, ThemeDocumentData, ThemePageData } from './types';

const BUILT_IN_HASHES: Record<StorefrontPageKind, string> = { home: '', catalog: '#catalogue', contact: '#contact' };
const BUILT_IN_LABELS: Record<StorefrontPageKind, string> = { home: 'Accueil', catalog: 'Catalogue', contact: 'Contact' };
const BUILT_IN_KINDS = Object.keys(BUILT_IN_HASHES) as StorefrontPageKind[];
// Même borne que le registre : l'en-tête reste lisible quel que soit le document reçu.
export const MAX_HEADER_PAGES = 3;

export type NavigationItem = { route: StorefrontRoute; label: string; pageId: string | null };

function isBuiltIn(value: string): value is StorefrontPageKind {
    return (BUILT_IN_KINDS as string[]).includes(value);
}

// Page désignée par l'adresse. Une ancre simple (par exemple le lien d'accès au contenu) ne
// change pas de page : la page ouverte reste affichée.
export function routeFromHash(hash: string, current: StorefrontRoute | null = null): StorefrontRoute {
    if (!hash || hash === '#') return 'home';
    if (hash.startsWith('#catalogue')) return 'catalog';
    if (hash.startsWith('#contact')) return 'contact';
    if (hash.startsWith('#/')) {
        let path = hash.slice(2);
        try {
            path = decodeURIComponent(path);
        } catch {
            // Adresse mal encodée : elle mène à « page introuvable », jamais à une erreur.
        }
        return `/${path.replace(/\/+$/, '')}`;
    }
    return current ?? 'home';
}

// Fragment d'adresse d'une page ; une page désignée par son identifiant (aperçu de l'éditeur)
// n'apparaît jamais dans l'adresse.
export function hashForRoute(route: StorefrontRoute): string {
    if (route.startsWith('/')) return `#${route}`;
    return isBuiltIn(route) ? BUILT_IN_HASHES[route] : '';
}

export function routeForPage(page: ThemePageData): StorefrontRoute {
    if (page.kind === 'custom') return `/${page.path || ''}`;
    return isBuiltIn(page.kind) ? page.kind : `id:${page.id}`;
}

export function resolvePage(document: ThemeDocumentData, route: StorefrontRoute): ThemePageData | null {
    if (route.startsWith('/')) {
        const path = route.slice(1);
        return document.pages.find((page) => page.kind === 'custom' && page.path === path) || null;
    }
    if (route.startsWith('id:')) {
        const id = route.slice(3);
        return document.pages.find((page) => page.id === id) || document.pages.find((page) => page.kind === id) || null;
    }
    return document.pages.find((page) => page.kind === route) || null;
}

function customTitle(page: ThemePageData) {
    return typeof page.title === 'string' ? page.title.trim() : '';
}

export function pageMenu(page: ThemePageData): 'header' | 'footer' | 'hidden' {
    return page.menu === 'header' || page.menu === 'hidden' ? page.menu : 'footer';
}

// Navigation du site : les pages du modèle d'abord, puis les pages personnalisées selon leur
// emplacement. Le menu principal en accueille trois au plus ; le pied de page les liste toutes,
// sauf celles réservées à un lien direct.
export function siteNavigation(document: ThemeDocumentData): { header: NavigationItem[]; footer: NavigationItem[] } {
    const builtIn: NavigationItem[] = BUILT_IN_KINDS.map((kind) => ({
        route: kind,
        label: BUILT_IN_LABELS[kind],
        pageId: document.pages.find((page) => page.kind === kind)?.id ?? null,
    }));
    const custom = document.pages.filter((page) => page.kind === 'custom' && page.path && customTitle(page));
    const item = (page: ThemePageData): NavigationItem => ({ route: routeForPage(page), label: customTitle(page), pageId: page.id });
    return {
        header: [...builtIn, ...custom.filter((page) => pageMenu(page) === 'header').slice(0, MAX_HEADER_PAGES).map(item)],
        footer: [...builtIn, ...custom.filter((page) => pageMenu(page) !== 'hidden').map(item)],
    };
}

// Titre de l'onglet : celui de la page personnalisée suivi du nom du site.
export function documentTitle(page: ThemePageData | null, siteName: string): string | null {
    if (!page || page.kind !== 'custom') return null;
    const title = customTitle(page);
    return title ? `${title} · ${siteName}` : null;
}
