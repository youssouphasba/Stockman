import { Ionicons } from '@expo/vector-icons';

export type Tip = {
  id: string;
  module: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  deepLink?: string;
};

export const TIPS: Tip[] = [
  // ── Dashboard (5) ──────────────────────────────────────────────────────
  {
    id: 'tip_dashboard_01',
    module: 'dashboard',
    icon: 'swap-horizontal-outline',
    title: 'Changer de boutique',
    description:
      'Utilisez le sélecteur en haut à droite pour basculer rapidement entre vos différentes boutiques.',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_02',
    module: 'dashboard',
    icon: 'analytics-outline',
    title: 'Analyse ABC',
    description:
      'La classe A représente 80 % de votre chiffre d\u2019affaires. Concentrez vos efforts sur ces produits prioritaires.',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_03',
    module: 'dashboard',
    icon: 'repeat-outline',
    title: 'Réappro automatique',
    description:
      'Le système analyse vos ventes récentes et suggère automatiquement les produits à commander.',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_04',
    module: 'dashboard',
    icon: 'alert-circle-outline',
    title: 'Alertes péremption',
    description:
      'Les lots dont la date de péremption est inférieure à 30 jours s\u2019affichent automatiquement sur le tableau de bord.',
    deepLink: '/(tabs)/',
  },
  {
    id: 'tip_dashboard_05',
    module: 'dashboard',
    icon: 'bar-chart-outline',
    title: 'Graphiques détaillés',
    description:
      'Appuyez sur le bouton Statistiques pour accéder aux graphiques et à l\u2019historique complets de votre activité.',
    deepLink: '/(tabs)/',
  },

  // ── Produits (6) ───────────────────────────────────────────────────────
  {
    id: 'tip_products_01',
    module: 'products',
    icon: 'qr-code-outline',
    title: 'Étiquettes QR Code',
    description:
      'Générez des étiquettes PDF avec QR Code pour identifier rapidement vos produits en rayon.',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_02',
    module: 'products',
    icon: 'barcode-outline',
    title: 'Scanner code-barres',
    description:
      'Scannez un code-barres pour retrouver ou ajouter un produit instantanément dans votre inventaire.',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_03',
    module: 'products',
    icon: 'swap-vertical-outline',
    title: 'Mouvements rapides',
    description:
      'Utilisez les boutons Entrée/Sortie pour ajuster le stock directement sans créer de commande.',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_04',
    module: 'products',
    icon: 'calendar-outline',
    title: 'Lots & Péremption',
    description:
      'Gérez les lots avec leurs dates de péremption, idéal pour les produits alimentaires et périssables.',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_05',
    module: 'products',
    icon: 'color-palette-outline',
    title: 'Catégories colorées',
    description:
      'Organisez vos produits par catégories avec des couleurs distinctes pour les repérer en un coup d\u2019\u0153il.',
    deepLink: '/(tabs)/products',
  },
  {
    id: 'tip_products_06',
    module: 'products',
    icon: 'trending-up-outline',
    title: 'Historique des prix',
    description:
      'Consultez l\u2019évolution des prix d\u2019achat et de vente de chaque produit au fil du temps.',
    deepLink: '/(tabs)/products',
  },

  // ── Caisse / POS (5) ──────────────────────────────────────────────────
  {
    id: 'tip_pos_01',
    module: 'pos',
    icon: 'scan-outline',
    title: 'Scanner rapide',
    description:
      'Scannez les articles rapidement : le panier se remplit automatiquement au fur et à mesure.',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_02',
    module: 'pos',
    icon: 'gift-outline',
    title: 'Fidélité automatique',
    description:
      'Associez un client à la vente pour cumuler automatiquement ses points de fidélité.',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_03',
    module: 'pos',
    icon: 'card-outline',
    title: 'Multi-paiement',
    description:
      'Acceptez plusieurs moyens de paiement : espèces, mobile money, carte bancaire, virement ou crédit.',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_04',
    module: 'pos',
    icon: 'logo-whatsapp',
    title: 'Ticket WhatsApp',
    description:
      'Envoyez le ticket de caisse par WhatsApp directement au client après chaque vente.',
    deepLink: '/(tabs)/pos',
  },
  {
    id: 'tip_pos_05',
    module: 'pos',
    icon: 'flash-outline',
    title: 'Panier express',
    description:
      'Cliquez sur un produit pour l\u2019ajouter au panier en un seul geste, sans étape supplémentaire.',
    deepLink: '/(tabs)/pos',
  },

  // ── Commandes (4) ─────────────────────────────────────────────────────
  {
    id: 'tip_orders_01',
    module: 'orders',
    icon: 'globe-outline',
    title: 'Commande Marketplace',
    description:
      'Commandez directement auprès des fournisseurs vérifiés disponibles sur la marketplace.',
    deepLink: '/(tabs)/orders',
  },
  {
    id: 'tip_orders_02',
    module: 'orders',
    icon: 'sparkles-outline',
    title: 'Réception intelligente',
    description:
      'L\u2019IA analyse les produits reçus et les associe automatiquement à votre inventaire existant.',
    deepLink: '/(tabs)/orders',
  },
  {
    id: 'tip_orders_03',
    module: 'orders',
    icon: 'navigate-outline',
    title: 'Suivi en temps réel',
    description:
      'Suivez chaque étape de vos commandes : en attente, confirmée, expédiée, livrée.',
    deepLink: '/(tabs)/orders',
  },
  {
    id: 'tip_orders_04',
    module: 'orders',
    icon: 'time-outline',
    title: 'Historique fournisseur',
    description:
      'Retrouvez toutes vos commandes passées pour un fournisseur donné et comparez les délais.',
    deepLink: '/(tabs)/orders',
  },

  // ── Fournisseurs (5) ──────────────────────────────────────────────────
  {
    id: 'tip_suppliers_01',
    module: 'suppliers',
    icon: 'storefront-outline',
    title: 'Marketplace',
    description:
      'Découvrez de nouveaux fournisseurs et comparez les prix sur la marketplace intégrée.',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_02',
    module: 'suppliers',
    icon: 'call-outline',
    title: 'Appel direct',
    description:
      'Appelez ou envoyez un email à votre fournisseur en un clic depuis sa fiche détaillée.',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_03',
    module: 'suppliers',
    icon: 'link-outline',
    title: 'Liens produits',
    description:
      'Associez vos produits à chaque fournisseur avec son prix et sa référence catalogue.',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_04',
    module: 'suppliers',
    icon: 'chatbubble-outline',
    title: 'Journal de contact',
    description:
      'Gardez une trace de vos appels, visites et échanges avec chaque fournisseur.',
    deepLink: '/(tabs)/suppliers',
  },
  {
    id: 'tip_suppliers_05',
    module: 'suppliers',
    icon: 'arrow-up-circle-outline',
    title: 'Suggestions réappro',
    description:
      'Voyez quels produits sont à commander en priorité, classés par fournisseur.',
    deepLink: '/(tabs)/suppliers',
  },

  // ── CRM (5) ───────────────────────────────────────────────────────────
  {
    id: 'tip_crm_01',
    module: 'crm',
    icon: 'ribbon-outline',
    title: 'Tiers de fidélité',
    description:
      'Bronze, Argent, Or, Platine : vos clients progressent automatiquement selon le montant de leurs achats.',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_02',
    module: 'crm',
    icon: 'wallet-outline',
    title: 'Suivi des dettes',
    description:
      'Enregistrez les dettes et paiements de vos clients pour un suivi financier précis.',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_03',
    module: 'crm',
    icon: 'megaphone-outline',
    title: 'Campagnes SMS',
    description:
      'Envoyez des promotions ciblées par SMS à vos clients les plus fidèles en quelques clics.',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_04',
    module: 'crm',
    icon: 'gift-outline',
    title: 'Anniversaires',
    description:
      'Enregistrez la date de naissance de vos clients pour leur envoyer des offres personnalisées automatiques.',
    deepLink: '/(tabs)/crm',
  },
  {
    id: 'tip_crm_05',
    module: 'crm',
    icon: 'pricetag-outline',
    title: 'Promotions',
    description:
      'Créez des promotions avec réductions en pourcentage ou échange de points de fidélité.',
    deepLink: '/(tabs)/crm',
  },

  // ── Comptabilité (5) ──────────────────────────────────────────────────
  {
    id: 'tip_accounting_01',
    module: 'accounting',
    icon: 'calendar-outline',
    title: 'Filtres période',
    description:
      'Analysez vos finances sur 7 jours, 30 jours, 90 jours ou une période personnalisée de votre choix.',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_02',
    module: 'accounting',
    icon: 'document-text-outline',
    title: 'Factures PDF',
    description:
      'Générez des factures professionnelles avec TVA en quelques clics et partagez-les instantanément.',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_03',
    module: 'accounting',
    icon: 'download-outline',
    title: 'Export CSV',
    description:
      'Exportez vos données au format CSV pour votre comptable ou logiciel de comptabilité externe.',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_04',
    module: 'accounting',
    icon: 'cash-outline',
    title: 'Suivi dépenses',
    description:
      'Catégorisez vos dépenses (loyer, salaires, transport) pour obtenir un bilan précis de vos charges.',
    deepLink: '/(tabs)/accounting',
  },
  {
    id: 'tip_accounting_05',
    module: 'accounting',
    icon: 'trending-up-outline',
    title: 'Marge bénéficiaire',
    description:
      'Comparez prix d\u2019achat et de vente pour identifier rapidement vos produits les plus rentables.',
    deepLink: '/(tabs)/accounting',
  },

  // ── Alertes (3) ───────────────────────────────────────────────────────
  {
    id: 'tip_alerts_01',
    module: 'alerts',
    icon: 'settings-outline',
    title: 'Règles configurables',
    description:
      'Définissez vos propres seuils pour les alertes de stock bas et de surstock selon vos besoins.',
    deepLink: '/(tabs)/alerts',
  },
  {
    id: 'tip_alerts_02',
    module: 'alerts',
    icon: 'notifications-outline',
    title: 'Alertes automatiques',
    description:
      'Recevez des notifications push dès qu\u2019un produit passe en rupture de stock.',
    deepLink: '/(tabs)/alerts',
  },
  {
    id: 'tip_alerts_03',
    module: 'alerts',
    icon: 'bed-outline',
    title: 'Produits dormants',
    description:
      'Détectez les produits sans aucune sortie depuis 30 jours pour optimiser votre inventaire.',
    deepLink: '/(tabs)/alerts',
  },

  // ── Activité (3) ──────────────────────────────────────────────────────
  {
    id: 'tip_activity_01',
    module: 'activity',
    icon: 'list-outline',
    title: 'Journal complet',
    description:
      'Chaque action (vente, mouvement, modification) est enregistrée avec sa date et son auteur.',
  },
  {
    id: 'tip_activity_02',
    module: 'activity',
    icon: 'funnel-outline',
    title: 'Filtres avancés',
    description:
      'Filtrez par module, utilisateur ou période pour retrouver une action précise dans l\u2019historique.',
  },
  {
    id: 'tip_activity_03',
    module: 'activity',
    icon: 'finger-print-outline',
    title: 'Traçabilité',
    description:
      'Identifiez qui a fait quoi et quand grâce au suivi nominatif de chaque opération.',
  },

  // ── Utilisateurs (3) ──────────────────────────────────────────────────
  {
    id: 'tip_users_01',
    module: 'users',
    icon: 'shield-outline',
    title: 'Permissions',
    description:
      'Contrôlez l\u2019accès de chaque employé : lecture seule ou lecture + écriture, module par module.',
  },
  {
    id: 'tip_users_02',
    module: 'users',
    icon: 'share-outline',
    title: 'Partage WhatsApp',
    description:
      'Envoyez les identifiants de connexion par WhatsApp en un clic pour intégrer rapidement vos employés.',
  },
  {
    id: 'tip_users_03',
    module: 'users',
    icon: 'people-circle-outline',
    title: 'Rôles personnalisés',
    description:
      'Caissier, gérant, magasinier : créez des accès adaptés à chaque rôle dans votre équipe.',
  },

  // ── Paramètres (3) ────────────────────────────────────────────────────
  {
    id: 'tip_settings_01',
    module: 'settings',
    icon: 'business-outline',
    title: 'Multi-boutiques',
    description:
      'Gérez plusieurs points de vente avec un seul compte, chacun disposant de son propre stock et historique.',
  },
  {
    id: 'tip_settings_02',
    module: 'settings',
    icon: 'remove-circle-outline',
    title: 'Mode simplifié',
    description:
      'Désactivez les modules inutiles pour obtenir une interface plus épurée et adaptée à vos besoins.',
  },
  {
    id: 'tip_settings_03',
    module: 'settings',
    icon: 'moon-outline',
    title: 'Thème sombre',
    description:
      'Activez le mode sombre pour un meilleur confort visuel, surtout en conditions de faible luminosité.',
  },

  // ── Général (3) ───────────────────────────────────────────────────────
  {
    id: 'tip_general_01',
    module: 'general',
    icon: 'sparkles-outline',
    title: 'Assistant IA',
    description:
      'Appuyez sur l\u2019icône étincelles en haut de l\u2019écran pour ouvrir un assistant IA qui vous aide au quotidien.',
  },
  {
    id: 'tip_general_02',
    module: 'general',
    icon: 'cloud-offline-outline',
    title: 'Mode hors-ligne',
    description:
      'Vos données restent accessibles même sans connexion internet. La synchronisation reprend automatiquement.',
  },
  {
    id: 'tip_general_03',
    module: 'general',
    icon: 'help-circle-outline',
    title: 'Guide interactif',
    description:
      'Appuyez sur l\u2019icône ? en haut de chaque écran pour revoir le guide interactif et ses explications.',
  },

  // ── Fournisseur / Supplier (5) ────────────────────────────────────────
  {
    id: 'tip_supplier_01',
    module: 'supplier_catalog',
    icon: 'cube-outline',
    title: 'Gérer le catalogue',
    description:
      'Ajoutez, modifiez ou désactivez vos produits depuis l\u2019onglet Catalogue de votre espace fournisseur.',
    deepLink: '/(supplier-tabs)/catalog',
  },
  {
    id: 'tip_supplier_02',
    module: 'supplier_orders',
    icon: 'download-outline',
    title: 'Commandes entrantes',
    description:
      'Les nouvelles commandes apparaissent avec le statut \u00ab En attente \u00bb. Acceptez ou refusez en un geste.',
    deepLink: '/(supplier-tabs)/orders',
  },
  {
    id: 'tip_supplier_03',
    module: 'supplier_dashboard',
    icon: 'star-outline',
    title: 'Avis clients',
    description:
      'Consultez les notes et commentaires laissés par vos clients commerçants pour améliorer votre service.',
    deepLink: '/(supplier-tabs)/',
  },
  {
    id: 'tip_supplier_04',
    module: 'supplier_dashboard',
    icon: 'stats-chart-outline',
    title: 'KPIs fournisseur',
    description:
      'Suivez votre chiffre d\u2019affaires, panier moyen et nombre de clients actifs sur votre dashboard.',
    deepLink: '/(supplier-tabs)/',
  },
  {
    id: 'tip_supplier_05',
    module: 'supplier_settings',
    icon: 'map-outline',
    title: 'Zones de livraison',
    description:
      'Configurez vos zones de livraison et délais estimés dans les paramètres de votre espace fournisseur.',
    deepLink: '/(supplier-tabs)/settings',
  },
];

export function getTipsForRole(role: 'shopkeeper' | 'supplier' | 'staff'): Tip[] {
  if (role === 'supplier') {
    return TIPS.filter(t => t.module.startsWith('supplier_') || t.module === 'general');
  }
  return TIPS.filter(t => !t.module.startsWith('supplier_'));
}
