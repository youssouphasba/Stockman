export const MOBILE_APP_URL = "https://play.google.com/store/apps/details?id=com.youssouphasba.stockman";
export const APP_WEB_URL = "https://app.stockman.pro";
export const ENTERPRISE_FEATURES_URL = `${APP_WEB_URL}/features`;
export const ENTERPRISE_PRICING_URL = `${APP_WEB_URL}/pricing`;
export const ENTERPRISE_SIGNUP_URL = `${APP_WEB_URL}/?signup=true`;
export const APP_LOGIN_URL = APP_WEB_URL;
export const LANDING_BUSINESS_TYPES_PATH = "/business-types";
export const LANDING_DEMO_PATH = "/demo";

export const BUSINESS_TYPE_SLUGS = ['commerce', 'restauration', 'production'] as const;
export type BusinessTypeSlug = typeof BUSINESS_TYPE_SLUGS[number];

export const BUSINESS_TYPE_GROUPS: Array<{
  slug: BusinessTypeSlug;
  title: string;
  overview: string;
  description: string;
  tags: string[];
}> = [
  {
    slug: 'commerce',
    title: 'Commerce',
    overview: 'Pour les boutiques, épiceries, supérettes et points de vente avec pilotage stock et caisse.',
    description: 'Stocks, ventes, caisse et alertes pour les commerces de proximité et multi-points de vente.',
    tags: ['Boutique', 'Épicerie', 'Supérette', 'POS'],
  },
  {
    slug: 'restauration',
    title: 'Restauration',
    overview: 'Pour les restaurants, snacks, fast-foods et cuisines avec service, tables et préparation.',
    description: 'Menu, caisse restaurant, tables, réservations et suivi cuisine pour les activités food.',
    tags: ['Restaurant', 'Snack', 'Fast-food', 'Cuisine'],
  },
  {
    slug: 'production',
    title: 'Production',
    overview: 'Pour les ateliers, boulangeries et petites productions qui suivent matières, lots et sorties.',
    description: 'Fabrication légère, consommation matières, rendement et traçabilité pour les activités de production.',
    tags: ['Boulangerie', 'Atelier', 'Production', 'Fabrication'],
  },
];

export const DEMO_CHOICE_IDS = ['commerce', 'restaurant', 'enterprise'] as const;
export type DemoChoiceId = typeof DEMO_CHOICE_IDS[number];

export const DEMO_CHOICE_SCREENSHOTS: Record<DemoChoiceId, string> = {
  commerce: '/assets/screenshots/stockman_screenshot_2_inventory_final_1771434576068.png',
  restaurant: '/assets/screenshots/pos-overview.jpg',
  enterprise: '/assets/screenshots/stockman-enterprise-preview.png',
};

export const DEMO_CHOICE_NEXT_LINKS: Record<DemoChoiceId, Array<{ href: string; external?: boolean }>> = {
  commerce: [
    { href: LANDING_BUSINESS_TYPES_PATH },
    { href: MOBILE_APP_URL, external: true },
  ],
  restaurant: [
    { href: LANDING_BUSINESS_TYPES_PATH },
    { href: MOBILE_APP_URL, external: true },
  ],
  enterprise: [
    { href: ENTERPRISE_FEATURES_URL, external: true },
    { href: '/enterprise' },
  ],
};

export const LANDING_KEYWORDS = [
  "Stockman",
  "logiciel gestion stock",
  "logiciel caisse POS",
  "logiciel supermarché",
  "logiciel commerce",
  "logiciel restaurant",
  "logiciel boulangerie",
  "logiciel inventaire",
  "back-office enterprise",
  "gestion multi-boutiques",
  "logiciel CRM commerce",
  "comptabilité boutique",
  "gestion stock Afrique",
];
