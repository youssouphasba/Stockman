export const MOBILE_APP_URL = "https://stockman.app";
export const APP_WEB_URL = "https://app.stockman.pro";
export const ENTERPRISE_FEATURES_URL = `${APP_WEB_URL}/features`;
export const ENTERPRISE_PRICING_URL = `${APP_WEB_URL}/pricing`;
export const ENTERPRISE_SIGNUP_URL = `${APP_WEB_URL}/?signup=true`;
export const APP_LOGIN_URL = APP_WEB_URL;
export const LANDING_BUSINESS_TYPES_PATH = "/business-types";

export type BusinessTypeGroup = {
  slug: string;
  title: string;
  overview: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  useCases: string[];
  recommendedPlan: string;
};

export const BUSINESS_TYPE_GROUPS: BusinessTypeGroup[] = [
  {
    slug: "commerce",
    title: "Commerce",
    overview:
      "Pour les epiceries, supermarches, pharmacies, grossistes, quincailleries, boutiques de mode et points de vente multi-boutiques.",
    seoTitle: "Logiciel de gestion pour commerce, supermarche et boutique",
    seoDescription:
      "Stock, caisse POS, inventaire, comptabilite, equipe et pilotage multi-boutiques pour le commerce moderne.",
    tags: ["Epicerie", "Supermarche", "Pharmacie", "Grossiste", "Mode", "Quincaillerie"],
    useCases: [
      "Suivre les stocks et les seuils en temps reel",
      "Encaisser vite avec la caisse mobile ou web",
      "Comparer les performances de plusieurs boutiques",
    ],
    recommendedPlan: "Starter / Pro sur mobile, Enterprise pour le back-office web",
  },
  {
    slug: "restauration",
    title: "Restauration",
    overview:
      "Pour les restaurants, boulangeries, traiteurs et activites alimentaires qui ont besoin de salle, cuisine, reservations et pilotage.",
    seoTitle: "Logiciel restaurant, boulangerie et traiteur",
    seoDescription:
      "Reservations, tables, commandes ouvertes, cuisine, comptabilite et analyses pour la restauration et les activites alimentaires.",
    tags: ["Restaurant", "Boulangerie", "Traiteur", "Boissons", "Snack"],
    useCases: [
      "Gerer reservations, arrivees et tables",
      "Ouvrir et suivre les commandes jusqu'au paiement",
      "Piloter la cuisine et la performance du service",
    ],
    recommendedPlan: "Enterprise pour le web, mobile terrain pour les equipes",
  },
  {
    slug: "production",
    title: "Production",
    overview:
      "Pour les ateliers et activites de fabrication legere: couture, savonnerie, menuiserie, imprimerie, artisanat et transformation.",
    seoTitle: "Logiciel de gestion pour atelier et production legere",
    seoDescription:
      "Stocks de matieres, production, equipe, commandes, CRM et reporting pour les activites de transformation et d'atelier.",
    tags: ["Couture", "Savonnerie", "Menuiserie", "Imprimerie", "Artisanat"],
    useCases: [
      "Suivre les matieres premieres et les sorties de stock",
      "Gerer les commandes clients et fournisseurs",
      "Piloter les marges et la charge d'equipe",
    ],
    recommendedPlan: "Pro ou Enterprise selon l'equipe et le niveau de pilotage",
  },
];

export const ENTERPRISE_HIGHLIGHTS = [
  {
    title: "Back-office web complet",
    description:
      "Dashboard, POS, CRM, comptabilite, stock, alertes et equipe dans une interface pensee pour les entreprises.",
  },
  {
    title: "Multi-boutiques reel",
    description:
      "Comparez vos points de vente, transferez du stock et donnez a chaque employe les bons acces par boutique.",
  },
  {
    title: "Mobile terrain relie au web",
    description:
      "Les equipes travaillent sur mobile pendant que la direction pilote l'activite et les analyses depuis le web.",
  },
  {
    title: "Business types pris en charge",
    description:
      "Commerce, restauration et production legere avec un parcours et des modules adaptes a chaque activite.",
  },
];

export const LANDING_KEYWORDS = [
  "Stockman",
  "logiciel gestion stock",
  "logiciel caisse POS",
  "logiciel supermarche",
  "logiciel commerce",
  "logiciel restaurant",
  "logiciel boulangerie",
  "logiciel inventaire",
  "back-office enterprise",
  "gestion multi-boutiques",
  "logiciel CRM commerce",
  "comptabilite boutique",
  "gestion stock Afrique",
];
