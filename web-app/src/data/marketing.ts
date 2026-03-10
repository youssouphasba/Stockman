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

export const BUSINESS_TYPE_GROUPS = [
    {
        title: "Commerce",
        description: "Epicerie, supermarche, pharmacie, quincaillerie, mode, electronique et grossiste.",
        tags: ["Epicerie", "Supermarche", "Pharmacie", "Quincaillerie", "Grossiste"],
    },
    {
        title: "Restauration",
        description: "Restaurant, boulangerie, traiteur et activites alimentaires avec service ou production legere.",
        tags: ["Restaurant", "Boulangerie", "Traiteur", "Boissons"],
    },
    {
        title: "Production",
        description: "Couture, savonnerie, menuiserie, imprimerie, artisanat et ateliers.",
        tags: ["Couture", "Savonnerie", "Menuiserie", "Imprimerie", "Artisanat"],
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

export const PLAN_COMPARISON_ROWS = [
    { feature: "Application mobile complete", starter: true, pro: true, enterprise: true },
    { feature: "Boutiques", starter: "1", pro: "2", enterprise: "Illimite" },
    { feature: "Utilisateurs / staff", starter: "1", pro: "5", enterprise: "Illimite" },
    { feature: "Gestion equipe & permissions", starter: false, pro: true, enterprise: true },
    { feature: "IA (Assistant Stockman)", starter: "Limite", pro: "Illimite", enterprise: "Illimite" },
    { feature: "Alertes push stock bas", starter: false, pro: true, enterprise: true },
    { feature: "Application web back-office", starter: false, pro: false, enterprise: true },
    { feature: "Dashboard & reporting web", starter: false, pro: false, enterprise: true },
    { feature: "Caisse POS web multi-terminaux", starter: false, pro: false, enterprise: true },
    { feature: "Comptabilite P&L web", starter: false, pro: false, enterprise: true },
    { feature: "CRM avance web & anniversaires", starter: false, pro: false, enterprise: true },
    { feature: "Commandes fournisseurs web", starter: false, pro: false, enterprise: true },
    { feature: "Vue multi-boutiques consolidee", starter: false, pro: false, enterprise: true },
    { feature: "Transferts de stock inter-boutiques", starter: false, pro: false, enterprise: true },
    { feature: "Audit log des actions", starter: false, pro: false, enterprise: true },
    { feature: "Emplacements de stock (web)", starter: false, pro: false, enterprise: true },
];
