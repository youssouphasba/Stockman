'use client';

// Moteur commun des modèles à sections : le document de thème publié (ou prévisualisé) décrit
// les pages et leurs sections ; le catalogue, le panier et les commandes restent ceux de Stockman.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './storefront.css';
import { CartDrawer, CartToast, ProductDialog } from './commerce-ui';
import type { InlineEdit } from './editable';
import { FONT_VARIABLES, fontStyle } from './fonts';
import { AnnouncementBar, Footer, Header, PreviewBanner, siteDisplayName } from './layout';
import { renderSection, sectionLabel, type MotionStyle, type SectionContext } from './sections';
import { buildTokens, FONT_PAIRINGS } from './tokens';
import { enumSetting, type StorefrontPageKind, type StorefrontPayload, type StorefrontProduct } from './types';
import { useStorefrontCommerce } from './useStorefrontCommerce';
import { LIVE_PREVIEW_EDIT, LIVE_PREVIEW_READY, LIVE_PREVIEW_SELECT, readLivePreviewMessage } from './livePreview';

const PREVIEW_UNAVAILABLE = "Cet aperçu a expiré ou n'existe pas. Créez-en un nouveau depuis Stockman.";
const PAGE_HASHES: Record<StorefrontPageKind, string> = { home: '', catalog: '#catalogue', contact: '#contact' };
const HEADING_SECTIONS = ['hero', 'catalog', 'contact'];
const MOTION_STYLES = ['none', 'subtle', 'expressive'] as const;
const TOAST_DURATION = 4000;

function pageFromHash(hash: string): StorefrontPageKind {
    if (hash.startsWith('#catalogue')) return 'catalog';
    if (hash.startsWith('#contact')) return 'contact';
    return 'home';
}

function StatusScreen({ title, text }: { title: string; text?: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-4 text-[#111827]">
            <div className="max-w-md rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] p-6 text-center shadow-sm">
                <h1 className="text-xl font-semibold">{title}</h1>
                {text && <p className="mt-2 text-sm text-[#4B5563]">{text}</p>}
            </div>
        </main>
    );
}

// Apparition au défilement : chaque élément marqué s'affiche une seule fois, quand il entre à
// l'écran. Sans script, sans animation demandée ou avec « moins de mouvement », tout reste visible.
function useScrollReveal(root: HTMLElement | null, enabled: boolean) {
    const [active, setActive] = useState(false);
    useLayoutEffect(() => {
        const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!root || !enabled || reduced || typeof IntersectionObserver === 'undefined') {
            setActive(false);
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.setAttribute('data-sf-shown', '');
                observer.unobserve(entry.target);
            }
        }, { rootMargin: '0px 0px -8% 0px' });
        const scan = () => root.querySelectorAll('[data-sf-reveal]:not([data-sf-shown])').forEach((node) => observer.observe(node));
        scan();
        const mutations = new MutationObserver(scan);
        mutations.observe(root, { childList: true, subtree: true });
        setActive(true);
        return () => {
            observer.disconnect();
            mutations.disconnect();
        };
    }, [enabled, root]);
    return active;
}

export default function ThemeStorefront({ slug, previewToken, initialPayload, fallback }: {
    slug: string;
    previewToken?: string | null;
    initialPayload?: StorefrontPayload | null;
    fallback?: React.ReactNode;
}) {
    const preview = Boolean(previewToken);
    const [payload, setPayload] = useState<StorefrontPayload | null>(initialPayload || null);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState<StorefrontPageKind>('home');
    // Aperçu intégré à l'éditeur visuel : section mise en évidence, sélection et textes modifiés sur place.
    const [embedded, setEmbedded] = useState(false);
    const [highlighted, setHighlighted] = useState<string | null>(null);
    const localSelection = useRef<string | null>(null);
    const [catalogFilter, setCatalogFilter] = useState<{ query: string; category: string | null }>({ query: '', category: null });
    const [product, setProduct] = useState<StorefrontProduct | null>(null);
    const [cartOpen, setCartOpen] = useState(false);
    const [added, setAdded] = useState<{ product: StorefrontProduct; at: number } | null>(null);
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const commerce = useStorefrontCommerce(payload, preview);

    useEffect(() => {
        if (initialPayload) return;
        let cancelled = false;
        // L'aperçu privé lit une révision grâce au jeton transmis dans le corps ; le site public lit par adresse.
        const request = previewToken
            ? fetch('/api/public/ecommerce/preview', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: previewToken }) })
            : fetch(`/api/public/ecommerce/${slug}`, { cache: 'no-store' });
        request
            .then(async (response) => {
                if (!response.ok) throw new Error(previewToken ? PREVIEW_UNAVAILABLE : 'Boutique en ligne introuvable.');
                return response.json();
            })
            .then((data: StorefrontPayload) => { if (!cancelled) { setPayload(data); setError(null); } })
            .catch((err) => { if (!cancelled) setError(err?.message || 'Impossible de charger cette boutique.'); });
        return () => { cancelled = true; };
    }, [initialPayload, previewToken, slug]);

    // Sur le site public, l'adresse garde la page ouverte (partage, retour arrière). Dans l'aperçu,
    // le fragment de l'adresse contient le jeton : la navigation reste en mémoire.
    useEffect(() => {
        if (preview) return;
        const sync = () => setPage(pageFromHash(window.location.hash));
        sync();
        window.addEventListener('hashchange', sync);
        return () => window.removeEventListener('hashchange', sync);
    }, [preview]);

    useEffect(() => {
        if (!preview || window.parent === window) return;
        setEmbedded(true);
        const receive = (event: MessageEvent) => {
            const message = readLivePreviewMessage(event, window.location.origin, window.parent);
            if (!message) return;
            setPayload((current) => current && ({
                ...current,
                theme: { model_id: message.document.model_id, document: message.document, media: { ...(current.theme?.media || {}), ...message.media } },
            }));
            setPage(message.page);
            if (message.selected !== localSelection.current) localSelection.current = null;
            setHighlighted(message.selected);
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [preview]);

    // L'éditeur attend ce signal pour envoyer le document en cours, une fois la boutique chargée.
    useEffect(() => {
        if (embedded && payload) window.parent.postMessage({ type: LIVE_PREVIEW_READY }, window.location.origin);
    }, [embedded, payload !== null]); // eslint-disable-line react-hooks/exhaustive-deps

    // Une section choisie dans l'éditeur est amenée à l'écran ; une section choisie dans l'aperçu ne bouge pas.
    useEffect(() => {
        if (!embedded || !highlighted || localSelection.current === highlighted) return;
        document.querySelector(`[data-sf-section="${CSS.escape(highlighted)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [embedded, highlighted, page]);

    const selectSection = useCallback((id: string) => {
        localSelection.current = id;
        setHighlighted(id);
        window.parent.postMessage({ type: LIVE_PREVIEW_SELECT, section: id }, window.location.origin);
    }, []);

    const edit = useMemo<InlineEdit | null>(() => (embedded ? {
        onEdit: (field: string, value: string) => window.parent.postMessage({ type: LIVE_PREVIEW_EDIT, field, value }, window.location.origin),
    } : null), [embedded]);

    const goTo = useCallback((target: StorefrontPageKind) => {
        setPage(target);
        if (!preview) {
            const hash = PAGE_HASHES[target];
            window.history.pushState(null, '', hash || `${window.location.pathname}${window.location.search}`);
        }
        window.scrollTo({ top: 0 });
    }, [preview]);

    const navigate = useCallback((target: StorefrontPageKind, category?: string | null) => {
        if (target === 'catalog') setCatalogFilter({ query: '', category: category ?? null });
        goTo(target);
    }, [goTo]);

    const search = useCallback((query: string) => {
        setCatalogFilter({ query, category: null });
        goTo('catalog');
    }, [goTo]);

    // Confirmation visible après chaque ajout, avec un accès direct au panier.
    const { addToCart } = commerce;
    const addWithFeedback = useCallback((item: StorefrontProduct, quantity = 1) => {
        if (!item.available || item.quantity <= 0) return;
        addToCart(item, quantity);
        setAdded({ product: item, at: Date.now() });
    }, [addToCart]);
    useEffect(() => {
        if (!added) return undefined;
        const timer = window.setTimeout(() => setAdded(null), TOAST_DURATION);
        return () => window.clearTimeout(timer);
    }, [added]);

    // Le fond de la page suit l'ambiance du modèle : aucune bande sombre de l'application lors d'un défilement élastique.
    const schemeBackground = payload?.theme ? String(buildTokens(payload.theme.document.global_settings, null).style['--sf-bg' as keyof React.CSSProperties] || '') : '';
    useEffect(() => {
        if (!schemeBackground) return;
        const { documentElement, body } = document;
        const previous = [documentElement.style.backgroundColor, body.style.backgroundColor];
        documentElement.style.backgroundColor = schemeBackground;
        body.style.backgroundColor = schemeBackground;
        return () => {
            documentElement.style.backgroundColor = previous[0];
            body.style.backgroundColor = previous[1];
        };
    }, [schemeBackground]);

    // Les sites publiés avant le réglage des animations gardent un rendu immobile tant que rien n'est choisi.
    const motion: MotionStyle = payload?.theme ? enumSetting(payload.theme.document.global_settings, 'animation_style', MOTION_STYLES, 'none') : 'none';
    const revealing = useScrollReveal(root, motion !== 'none');

    if (error && !payload) return <StatusScreen title="Boutique indisponible" text={error} />;
    if (!payload) return <StatusScreen title="Chargement de la boutique..." />;
    // Sans thème à sections (par exemple juste après un retour à Stockman Basic), le rendu Basic prend le relais.
    if (!payload.theme) return <>{fallback ?? <StatusScreen title="Boutique indisponible" />}</>;

    const { document: themeDocument, media } = payload.theme;
    const settings = themeDocument.global_settings;
    const tokens = buildTokens(settings, typeof settings.brand_color === 'string' ? settings.brand_color : payload.site.brand_color);
    const fonts = fontStyle(enumSetting(settings, 'font_pairing', FONT_PAIRINGS, 'modern'));
    const logo = typeof settings.logo_asset_id === 'string' ? media[settings.logo_asset_id] : undefined;
    const logoUrl = logo ? (logo.urls['192'] || Object.values(logo.urls).pop()) : payload.site.logo_url;
    const currentPage = themeDocument.pages.find((item) => item.kind === page) || themeDocument.pages.find((item) => item.kind === 'home') || themeDocument.pages[0];
    const context: SectionContext = {
        site: payload.site,
        products: payload.products,
        media,
        commerce: { ...commerce, addToCart: addWithFeedback },
        preview,
        outline: tokens.accentNeedsOutline,
        motion,
        pageId: currentPage?.id || '',
        edit,
        navigate,
        openProduct: setProduct,
        catalogQuery: catalogFilter.query,
        catalogCategory: catalogFilter.category,
    };
    const name = siteDisplayName(settings, payload.site);
    const firstType = currentPage?.sections[0]?.type;

    return (
        <div
            ref={setRoot}
            data-motion={motion}
            className={`sf-root ${revealing ? 'sf-js' : ''} ${FONT_VARIABLES} min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text)] antialiased [font-family:var(--sf-font-body)]`}
            style={{ ...tokens.style, ...fonts } as React.CSSProperties}
        >
            <a href="#sf-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[var(--sf-bg)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold">Aller au contenu</a>
            {preview && <PreviewBanner expiresAt={payload.preview?.expires_at} siteEnabled={payload.preview?.site_enabled} />}
            <AnnouncementBar settings={settings} onNavigate={navigate} />
            <Header settings={settings} site={payload.site} logoUrl={logoUrl} page={page} cartCount={commerce.count} onNavigate={navigate} onSearch={search} onOpenCart={() => setCartOpen(true)} />
            <main id="sf-main">
                <div key={currentPage?.id || 'page'} className="sf-page">
                    {!HEADING_SECTIONS.includes(firstType || '') && <h1 className="sr-only">{name}</h1>}
                    {currentPage?.sections.map((section, index) => embedded ? (
                        <div
                            key={section.id}
                            data-sf-section={section.id}
                            onFocus={(event) => { if ((event.target as HTMLElement).isContentEditable && highlighted !== section.id) selectSection(section.id); }}
                            className={`group/sf relative ${highlighted === section.id ? 'outline outline-2 -outline-offset-2 outline-[#10B981]' : 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-[#10B981]'}`}
                        >
                            <button
                                type="button"
                                onClick={() => selectSection(section.id)}
                                className={`absolute left-2 top-2 z-30 rounded-full bg-[#10B981] px-3 py-1 text-xs font-semibold text-[#052e16] shadow ${highlighted === section.id ? '' : 'opacity-0 group-hover/sf:opacity-100 focus:opacity-100'}`}
                            >
                                Modifier : {sectionLabel(section.type)}
                            </button>
                            {renderSection(section, context, index === 0)}
                        </div>
                    ) : renderSection(section, context, index === 0))}
                </div>
            </main>
            <Footer settings={settings} site={payload.site} onNavigate={navigate} />
            {product && (
                <ProductDialog
                    product={product}
                    currency={payload.site.currency}
                    outline={tokens.accentNeedsOutline}
                    inCart={commerce.cart[product.product_id]?.quantity || 0}
                    onClose={() => setProduct(null)}
                    onAdd={(item, quantity) => { addToCart(item, quantity); setProduct(null); setAdded(null); setCartOpen(true); }}
                />
            )}
            {cartOpen && <CartDrawer commerce={commerce} site={payload.site} preview={preview} outline={tokens.accentNeedsOutline} onClose={() => setCartOpen(false)} />}
            <p className="sr-only" aria-live="polite">{added ? `${added.product.name} a été ajouté au panier.` : ''}</p>
            {added && !cartOpen && !product && (
                <CartToast
                    key={added.at}
                    product={added.product}
                    currency={payload.site.currency}
                    count={commerce.count}
                    outline={tokens.accentNeedsOutline}
                    onOpenCart={() => { setAdded(null); setCartOpen(true); }}
                    onClose={() => setAdded(null)}
                />
            )}
        </div>
    );
}
