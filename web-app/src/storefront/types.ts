// Données publiques d'une boutique, telles que renvoyées par l'API publique de Stockman.
import type { PaymentOptions } from './OrderPayment';

export type StorefrontProduct = {
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

export type StorefrontSite = {
    slug: string;
    store_id: string;
    name: string;
    model_id?: string;
    logo_url?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    currency: string;
    hero_title?: string | null;
    welcome_message?: string | null;
    brand_color?: string | null;
    delivery_info?: string | null;
    whatsapp_phone?: string | null;
    payment_instructions?: string | null;
    // Comptes Wave et Orange Money de la boutique, paiement à la livraison ; absent : consignes écrites seulement.
    payment?: PaymentOptions | null;
    // Livraison Denkma : position ou point relais choisi sur la carte Denkma, sans adresse écrite.
    denkma_delivery?: boolean;
};

export type StorefrontMedia = {
    alt: string;
    width: number;
    height: number;
    urls: Record<string, string>;
};

export type ThemeSettings = Record<string, unknown>;
export type ThemeBlockData = { id: string; type: string; settings: ThemeSettings };
// hidden : section masquée, jamais rendue sur le site public (visible et signalée dans l'éditeur).
export type ThemeSectionData = { id: string; type: string; hidden?: boolean; settings: ThemeSettings; blocks: ThemeBlockData[] };
export type ThemePageData = { id: string; kind: string; title?: string | null; path?: string; menu?: string; sections: ThemeSectionData[] };
export type ThemeDocumentData = {
    model_id: string;
    model_version: string;
    global_settings: ThemeSettings;
    pages: ThemePageData[];
};

export type StorefrontPayload = {
    site: StorefrontSite;
    products: StorefrontProduct[];
    theme?: { model_id: string; document: ThemeDocumentData; media: Record<string, StorefrontMedia> };
    preview?: { expires_at?: string | null; source?: string; site_enabled?: boolean };
};

export type StorefrontPageKind = 'home' | 'catalog' | 'contact';
// Page ouverte : une page du modèle, une page personnalisée par son chemin (« /a-propos »), ou une
// page désignée par son identifiant dans l'aperçu de l'éditeur (« id:page-1 »).
export type StorefrontRoute = StorefrontPageKind | `/${string}` | `id:${string}`;

export function textSetting(settings: ThemeSettings, key: string): string {
    const value = settings[key];
    return typeof value === 'string' ? value.trim() : '';
}

export function enumSetting<T extends string>(settings: ThemeSettings, key: string, allowed: readonly T[], fallback: T): T {
    const value = settings[key];
    return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function numberSetting(settings: ThemeSettings, key: string, min: number, max: number, fallback: number): number {
    const value = settings[key];
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export function booleanSetting(settings: ThemeSettings, key: string, fallback: boolean): boolean {
    const value = settings[key];
    return typeof value === 'boolean' ? value : fallback;
}
