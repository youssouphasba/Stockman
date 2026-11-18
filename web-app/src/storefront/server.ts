// Côté serveur : lecture des boutiques publiques et métadonnées de partage (WhatsApp, Facebook)
// et de référencement (Google). Les robots de partage n'exécutent pas le script de la page :
// tout ce qu'ils doivent voir est produit ici.
import type { Metadata } from 'next';
import { headers } from 'next/headers';

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://stockman-production-149d.up.railway.app').replace(/\/$/, '');
const PRIMARY_WEB_HOSTS = new Set(['app.stockman.pro', 'stockman.pro', 'www.stockman.pro', 'localhost', '127.0.0.1']);
// Une minute de cache : un changement publié apparaît rapidement, sans surcharger l'API.
const REVALIDATE_SECONDS = 60;

export type PublicProductPayload = {
    site: { slug: string; name: string; currency: string; logo_url?: string | null; model_id?: string; base_url: string };
    product: {
        product_id: string;
        name: string;
        description?: string | null;
        selling_price: number;
        quantity: number;
        unit?: string | null;
        image?: string | null;
        category?: string | null;
        available: boolean;
    };
};

export function normalizeHost(value: string | null | undefined) {
    return (value || '').split(',')[0].trim().split(':')[0].trim().toLowerCase().replace(/\.$/, '');
}

export function isCustomStorefrontHost(host: string) {
    return !!host && !PRIMARY_WEB_HOSTS.has(host) && !host.endsWith('.vercel.app');
}

export async function requestHost() {
    const store = await headers();
    return normalizeHost(store.get('x-forwarded-host') || store.get('host'));
}

// Origine de la requête, pour rendre absolues les adresses des photos.
export async function requestOrigin() {
    const store = await headers();
    const host = (store.get('x-forwarded-host') || store.get('host') || 'app.stockman.pro').split(',')[0].trim();
    const proto = (store.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
    return `${proto}://${host}`;
}

async function getJson<T>(path: string): Promise<T | null> {
    try {
        const response = await fetch(`${API_BASE_URL}${path}`, { next: { revalidate: REVALIDATE_SECONDS } });
        if (!response.ok) return null;
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

export function fetchShopBySlug(slug: string) {
    return getJson<any>(`/api/public/ecommerce/${encodeURIComponent(slug)}`);
}

export function fetchShopByDomain(host: string) {
    return getJson<any>(`/api/public/ecommerce/by-domain?domain=${encodeURIComponent(host)}`);
}

export function fetchProductBySlug(slug: string, productId: string) {
    return getJson<PublicProductPayload>(`/api/public/ecommerce/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`);
}

export function fetchProductByDomain(host: string, productId: string) {
    return getJson<PublicProductPayload>(`/api/public/ecommerce/_by-domain/products/${encodeURIComponent(productId)}?domain=${encodeURIComponent(host)}`);
}

export function absoluteUrl(value: string | null | undefined, origin: string): string | undefined {
    if (!value || value.startsWith('data:')) return undefined;
    if (/^https?:\/\//i.test(value)) return value;
    return value.startsWith('/') ? `${origin}${value}` : undefined;
}

function shortText(value: string | null | undefined, max = 200) {
    const text = (value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function formatPrice(value: number, currency: string) {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'XOF', maximumFractionDigits: currency === 'XOF' ? 0 : 2 }).format(value || 0);
    } catch {
        return `${new Intl.NumberFormat('fr-FR').format(value || 0)} ${currency || ''}`.trim();
    }
}

// Métadonnées de la vitrine : la première photo de produit sert d'aperçu.
export function shopMetadata(payload: any, origin: string): Metadata {
    const site = payload?.site;
    const title = site?.hero_title || site?.name || 'Boutique Stockman';
    const description = site?.welcome_message || site?.delivery_info || 'Catalogue en ligne et commandes web.';
    const firstImage = (payload?.products || []).map((product: any) => absoluteUrl(product?.image, origin)).find(Boolean);
    return {
        title,
        description,
        openGraph: { title, description, type: 'website', images: firstImage ? [{ url: firstImage }] : undefined },
        twitter: { card: firstImage ? 'summary_large_image' : 'summary', title, description, images: firstImage ? [firstImage] : undefined },
    };
}

export function productCanonical(payload: PublicProductPayload) {
    return `${payload.site.base_url.replace(/\/$/, '')}/produit/${encodeURIComponent(payload.product.product_id)}`;
}

// Métadonnées d'un produit : nom, prix et photo dans l'aperçu WhatsApp ou Facebook.
export function productMetadata(payload: PublicProductPayload, origin: string): Metadata {
    const { site, product } = payload;
    const price = formatPrice(product.selling_price, site.currency);
    const title = `${product.name} · ${site.name}`;
    const description = shortText(product.description) || `${product.name} à ${price} chez ${site.name}.${product.available ? '' : ' Actuellement en rupture de stock.'}`;
    const image = absoluteUrl(product.image, origin);
    const canonical = productCanonical(payload);
    return {
        title,
        description,
        alternates: { canonical },
        openGraph: { title: `${product.name} : ${price}`, description, type: 'website', url: canonical, siteName: site.name, images: image ? [{ url: image, alt: product.name }] : undefined },
        twitter: { card: image ? 'summary_large_image' : 'summary', title: `${product.name} : ${price}`, description, images: image ? [image] : undefined },
    };
}

// Données structurées d'un produit (schema.org), lues par Google pour afficher prix et disponibilité.
export function productJsonLd(payload: PublicProductPayload, origin: string) {
    const { site, product } = payload;
    const image = absoluteUrl(product.image, origin);
    const data: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        ...(product.description ? { description: shortText(product.description, 5000) } : {}),
        ...(image ? { image: [image] } : {}),
        ...(product.category ? { category: product.category } : {}),
        offers: {
            '@type': 'Offer',
            url: productCanonical(payload),
            price: product.selling_price,
            priceCurrency: site.currency || 'XOF',
            availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: site.name },
        },
    };
    // « < » échappé : le texte d'un produit ne peut pas fermer la balise de script.
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
