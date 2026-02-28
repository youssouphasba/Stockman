// ─── Types ───────────────────────────────────────────────────────────────────

export type Region = 'africa_xof' | 'africa_xaf' | 'europe' | 'global';

export interface RegionPricing {
    region: Region;
    currency: string;   // affichage label
    symbol: string;     // symbole court
    starter: string;    // montant formaté
    pro: string;
    enterprise: string;
    useMobileMoney: boolean;  // true → CinetPay, false → Stripe
}

// ─── Prix par région ─────────────────────────────────────────────────────────

export const REGION_PRICING: Record<Region, RegionPricing> = {
    africa_xof: {
        region: 'africa_xof',
        currency: 'FCFA',
        symbol: 'FCFA',
        starter: '2 500',
        pro: '4 900',
        enterprise: '9 900',
        useMobileMoney: true,
    },
    africa_xaf: {
        region: 'africa_xaf',
        currency: 'FCFA',
        symbol: 'FCFA',
        starter: '2 500',
        pro: '4 900',
        enterprise: '9 900',
        useMobileMoney: true,
    },
    europe: {
        region: 'europe',
        currency: 'EUR',
        symbol: '€',
        starter: '6,99',
        pro: '9,99',
        enterprise: '14,99',
        useMobileMoney: false,
    },
    global: {
        region: 'global',
        currency: 'USD',
        symbol: '$',
        starter: '6.99',
        pro: '9.99',
        enterprise: '14.99',
        useMobileMoney: false,
    },
};

// ─── Timezones africaines ─────────────────────────────────────────────────────

// Zone UEMOA — franc CFA ouest-africain (XOF)
const XOF_TIMEZONES = new Set([
    'Africa/Dakar',        // Sénégal
    'Africa/Abidjan',      // Côte d'Ivoire
    'Africa/Bamako',       // Mali
    'Africa/Ouagadougou',  // Burkina Faso
    'Africa/Niamey',       // Niger
    'Africa/Lome',         // Togo
    'Africa/Cotonou',      // Bénin
    'Africa/Bissau',       // Guinée-Bissau
]);

// Zone CEMAC — franc CFA d'Afrique centrale (XAF)
const XAF_TIMEZONES = new Set([
    'Africa/Douala',       // Cameroun
    'Africa/Libreville',   // Gabon
    'Africa/Brazzaville',  // Congo
    'Africa/Kinshasa',     // Congo RDC
    'Africa/Bangui',       // Centrafrique
    'Africa/Ndjamena',     // Tchad
    'Africa/Malabo',       // Guinée Équatoriale
    'Africa/Conakry',      // Guinée (GNF, mais CinetPay opère ici)
    'Africa/Freetown',     // Sierra Leone
    'Africa/Monrovia',     // Liberia
]);

// ─── Détection ────────────────────────────────────────────────────────────────

export function detectRegion(): Region {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (XOF_TIMEZONES.has(tz)) return 'africa_xof';
        if (XAF_TIMEZONES.has(tz)) return 'africa_xaf';

        // Reste de l'Afrique → XOF par défaut (marché cible Stockman)
        if (tz.startsWith('Africa/')) return 'africa_xof';

        // Europe
        if (tz.startsWith('Europe/')) return 'europe';

        // Tout le reste (Amérique, Asie, Océanie...)
        return 'global';
    } catch {
        // Fallback sur la langue du navigateur (uniquement si Intl échoue)
        const lang = (navigator.language || '').split('-')[0].toLowerCase();
        // Langues exclusivement africaines → FCFA
        if (['wo', 'ff', 'ha', 'yo', 'ig', 'sw'].includes(lang)) return 'africa_xof';
        // Toutes les grandes langues européennes → EUR
        if (['fr', 'de', 'it', 'es', 'pl', 'ro', 'nl', 'pt', 'sv', 'da', 'fi', 'el'].includes(lang)) return 'europe';
        return 'global';
    }
}

export function getPricingByRegion(region: Region): RegionPricing {
    return REGION_PRICING[region];
}

// ─── Formatage ────────────────────────────────────────────────────────────────

export function formatPrice(amount: string, currency: string): string {
    if (currency === 'FCFA') return `${amount} FCFA`;
    if (currency === 'EUR') return `${amount} €`;
    if (currency === 'USD') return `$${amount}`;
    return `${amount} ${currency}`;
}
