'use client';

// Chaque produit a sa propre adresse : /shop/<boutique>/produit/<id> sur Stockman, /produit/<id> sur
// un domaine connecté. Le lien s'envoie sur WhatsApp avec sa photo et son prix, et Google le référence.
// La fiche s'ouvre par-dessus la vitrine ; fermer la fiche rend l'adresse de la vitrine.
import { useCallback, useEffect, useRef, useState } from 'react';

const PRODUCT_PATH = /\/produit\/([A-Za-z0-9_-]{3,80})\/?$/;

export function productIdFromPath(pathname: string): string | null {
    return PRODUCT_PATH.exec(pathname)?.[1] ?? null;
}

// Adresse de la vitrine, sans la partie produit.
export function storefrontBasePath(pathname: string, slug: string): string {
    if (pathname.startsWith('/shop/')) return `/shop/${slug}`;
    return '/';
}

export function productPath(pathname: string, slug: string, productId: string): string {
    const base = storefrontBasePath(pathname, slug);
    return `${base === '/' ? '' : base}/produit/${encodeURIComponent(productId)}`;
}

export function productUrl(slug: string, productId: string): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${productPath(window.location.pathname, slug, productId)}`;
}

// Produit ouvert, synchronisé avec l'adresse sur le site public. Dans l'aperçu privé, l'adresse
// contient le jeton : la fiche s'ouvre en mémoire, sans changer l'adresse.
export function useProductRoute<T extends { product_id: string }>(slug: string, products: T[] | null | undefined, preview: boolean) {
    const [productId, setProductId] = useState<string | null>(null);
    const pushed = useRef(false);

    useEffect(() => {
        if (preview) return undefined;
        const sync = () => setProductId(productIdFromPath(window.location.pathname));
        sync();
        window.addEventListener('popstate', sync);
        return () => window.removeEventListener('popstate', sync);
    }, [preview]);

    const open = useCallback((product: T) => {
        setProductId(product.product_id);
        if (preview) return;
        const target = productPath(window.location.pathname, slug, product.product_id);
        if (window.location.pathname === target) return;
        // Une fiche ouverte depuis une autre fiche remplace l'adresse : « Retour » ramène à la vitrine.
        if (productIdFromPath(window.location.pathname)) window.history.replaceState(null, '', target);
        else {
            window.history.pushState(null, '', target);
            pushed.current = true;
        }
    }, [preview, slug]);

    const close = useCallback(() => {
        setProductId(null);
        if (preview || !productIdFromPath(window.location.pathname)) return;
        if (pushed.current) {
            pushed.current = false;
            window.history.back();
            return;
        }
        // Arrivée directe par le lien du produit : la vitrine prend sa place dans l'historique.
        window.history.replaceState(null, '', `${storefrontBasePath(window.location.pathname, slug)}${window.location.hash}`);
    }, [preview, slug]);

    const product = productId ? (products || []).find((item) => item.product_id === productId) || null : null;
    // Lien d'un produit retiré du site : la vitrine s'affiche normalement.
    const missing = Boolean(productId && products && !product);
    return { product, open, close, missing };
}

// Panier gardé sur l'appareil : il survit à une page rechargée ou fermée (navigateur intégré de
// WhatsApp, par exemple). Seuls l'identifiant et la quantité sont gardés ; le prix et le stock
// viennent toujours du catalogue publié.
type StoredCart = Record<string, number>;

function cartKey(slug: string) {
    return `stockman-shop-cart-${slug}`;
}

export function readStoredCart(slug: string): StoredCart {
    try {
        const raw = window.localStorage.getItem(cartKey(slug));
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const result: StoredCart = {};
        for (const [id, quantity] of Object.entries(parsed)) {
            if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) result[id] = quantity;
        }
        return result;
    } catch {
        return {};
    }
}

export function writeStoredCart(slug: string, cart: StoredCart) {
    try {
        if (Object.keys(cart).length === 0) window.localStorage.removeItem(cartKey(slug));
        else window.localStorage.setItem(cartKey(slug), JSON.stringify(cart));
    } catch {
        // Stockage indisponible (navigation privée) : le panier reste en mémoire.
    }
}

type Line<T> = { product: T; quantity: number };

// Recharge le panier gardé une fois le catalogue reçu, puis l'enregistre à chaque changement.
export function usePersistentCart<T extends { product_id: string; quantity: number; available: boolean }>(
    slug: string,
    products: T[] | null | undefined,
    enabled: boolean,
    cart: Record<string, Line<T>>,
    setCart: (cart: Record<string, Line<T>>) => void,
) {
    const restored = useRef(false);
    useEffect(() => {
        if (!enabled || !slug || !products || restored.current) return;
        restored.current = true;
        const stored = readStoredCart(slug);
        const next: Record<string, Line<T>> = {};
        for (const product of products) {
            const wanted = stored[product.product_id];
            if (!wanted || !product.available || product.quantity <= 0) continue;
            next[product.product_id] = { product, quantity: Math.min(wanted, product.quantity) };
        }
        if (Object.keys(next).length > 0) setCart(next);
    }, [enabled, products, setCart, slug]);

    useEffect(() => {
        if (!enabled || !slug || !restored.current) return;
        const stored: StoredCart = {};
        for (const [id, line] of Object.entries(cart)) stored[id] = line.quantity;
        writeStoredCart(slug, stored);
    }, [cart, enabled, slug]);
}
