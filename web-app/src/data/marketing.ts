export const MOBILE_APP_URL = "https://stockman.app";
export const PUBLIC_SITE_URL = "https://stockman.pro";
export const PUBLIC_ENTERPRISE_URL = `${PUBLIC_SITE_URL}/enterprise`;
export const PUBLIC_BUSINESS_TYPES_URL = `${PUBLIC_SITE_URL}/business-types`;
export const ENTERPRISE_SIGNUP_URL = "/?signup=true";

export type MarketingPlanId = "starter" | "pro" | "enterprise";
export type MarketingCtaKind = "mobile" | "enterprise";

export type MarketingPlan = {
    id: MarketingPlanId;
    name: string;
    priceXOF: string;
    priceEUR: string;
    description: string;
    ctaLabel: string;
    ctaKind: MarketingCtaKind;
    href: string;
    highlight?: boolean;
    features: { label: string; ok: boolean }[];
};

export const BUSINESS_TYPE_GROUP_IDS = ["commerce", "restauration", "production"] as const;
export type BusinessTypeGroupId = typeof BUSINESS_TYPE_GROUP_IDS[number];

export const BUSINESS_TYPE_GROUPS: Array<{
    slug: BusinessTypeGroupId;
    title: string;
    overview: string;
    description: string;
    tags: string[];
}> = [
    {
        slug: "commerce",
        title: "Commerce",
        overview: "Pour les boutiques, epiceries, superettes et points de vente avec pilotage stock et caisse.",
        description: "Stocks, ventes, caisse et alertes pour les commerces de proximite et multi-points de vente.",
        tags: ["Boutique", "Epicerie", "Superette", "POS"],
    },
    {
        slug: "restauration",
        title: "Restauration",
        overview: "Pour les restaurants, snacks, fast-foods et cuisines avec service, tables et preparation.",
        description: "Menu, caisse restaurant, tables, reservations et suivi cuisine pour les activites food.",
        tags: ["Restaurant", "Snack", "Fast-food", "Cuisine"],
    },
    {
        slug: "production",
        title: "Production",
        overview: "Pour les ateliers, boulangeries et petites productions qui suivent matieres, lots et sorties.",
        description: "Fabrication legere, consommation matieres, rendement et tracabilite pour les activites de production.",
        tags: ["Boulangerie", "Atelier", "Production", "Fabrication"],
    },
];

export const PLAN_MARKETING: MarketingPlan[] = [
    {
        id: "starter",
        name: "Starter",
        priceXOF: "2 500 FCFA",
        priceEUR: "6,99 EUR",
        description: "Pour demarrer sur mobile avec une boutique et les bases du pilotage.",
        ctaLabel: "Commencer sur mobile",
        ctaKind: "mobile",
        href: MOBILE_APP_URL,
        features: [
            { label: "Application mobile complete", ok: true },
            { label: "1 boutique", ok: true },
            { label: "1 utilisateur", ok: true },
            { label: "Stock, ventes et alertes de base", ok: true },
            { label: "Application web back-office", ok: false },
        ],
    },
    {
        id: "pro",
        name: "Pro",
        priceXOF: "4 900 FCFA",
        priceEUR: "9,99 EUR",
        description: "Pour les commerces en croissance qui gerent plusieurs equipes et deux boutiques.",
        ctaLabel: "Passer sur mobile",
        ctaKind: "mobile",
        href: MOBILE_APP_URL,
        features: [
            { label: "Application mobile complete", ok: true },
            { label: "2 boutiques", ok: true },
            { label: "Jusqu'a 5 utilisateurs", ok: true },
            { label: "Gestion equipe & permissions mobile", ok: true },
            { label: "Application web back-office", ok: false },
        ],
    },
    {
        id: "enterprise",
        name: "Enterprise",
        priceXOF: "9 900 FCFA",
        priceEUR: "14,99 EUR",
        description: "Pour piloter toute l'entreprise avec mobile + back-office web avance.",
        ctaLabel: "Creer mon compte Enterprise",
        ctaKind: "enterprise",
        href: ENTERPRISE_SIGNUP_URL,
        highlight: true,
        features: [
            { label: "Application mobile complete", ok: true },
            { label: "Boutiques illimitees", ok: true },
            { label: "Utilisateurs illimites", ok: true },
            { label: "Application web back-office", ok: true },
            { label: "Dashboard, POS, CRM et comptabilite web", ok: true },
        ],
    },
];

export const PLAN_COMPARISON_ROWS: Array<{
    key: string;
    starter: boolean | string;
    pro: boolean | string;
    enterprise: boolean | string;
}> = [
    { key: "f_mobile_app", starter: true, pro: true, enterprise: true },
    { key: "f_stores", starter: "1", pro: "2", enterprise: "unlimited" },
    { key: "f_users", starter: "1", pro: "5", enterprise: "unlimited" },
    { key: "f_team", starter: false, pro: true, enterprise: true },
    { key: "f_ai", starter: "limited", pro: "unlimited", enterprise: "unlimited" },
    { key: "f_push", starter: false, pro: true, enterprise: true },
    { key: "f_web", starter: false, pro: false, enterprise: true },
    { key: "f_dashboard", starter: false, pro: false, enterprise: true },
    { key: "f_pos", starter: false, pro: false, enterprise: true },
    { key: "f_pl", starter: false, pro: false, enterprise: true },
    { key: "f_crm", starter: false, pro: false, enterprise: true },
    { key: "f_orders", starter: false, pro: false, enterprise: true },
    { key: "f_multi", starter: false, pro: false, enterprise: true },
    { key: "f_transfers", starter: false, pro: false, enterprise: true },
    { key: "f_audit", starter: false, pro: false, enterprise: true },
    { key: "f_locations", starter: false, pro: false, enterprise: true },
];
