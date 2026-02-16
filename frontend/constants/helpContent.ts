import { Ionicons } from '@expo/vector-icons';

export type HelpFeature = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

export type HelpModule = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  guideKey: string;
  features: HelpFeature[];
  role: 'shopkeeper' | 'supplier' | 'all';
};

export type FAQItem = {
  question: string;
  answer: string;
};

export const HELP_MODULES: HelpModule[] = [
  {
    key: 'dashboard',
    title: 'Tableau de Bord',
    icon: 'grid-outline',
    color: '#6366f1',
    guideKey: 'dashboard',
    role: 'shopkeeper',
    features: [
      { icon: 'trending-up-outline', title: 'KPIs en temps réel', description: "Suivez votre chiffre d'affaires journalier et mensuel, le nombre de produits et la valeur totale de votre stock. Les compteurs s'animent en temps réel." },
      { icon: 'pie-chart-outline', title: 'Santé du Stock', description: "Visualisez en un coup d'oeil combien de produits sont en rupture (rouge), en stock bas (orange) ou en surstock (bleu). Cliquez sur un badge pour voir les produits concernés." },
      { icon: 'alert-circle-outline', title: 'Alertes Péremption', description: "Si vous gérez des produits avec dates de péremption (lots), ceux arrivant à expiration dans les 30 prochains jours s'affichent automatiquement avec le numéro de lot." },
      { icon: 'repeat-outline', title: 'Réapprovisionnement Intelligent', description: "Le système analyse l'historique de vos ventes et vous suggère automatiquement les produits à commander, avec la quantité optimale et le niveau de priorité." },
      { icon: 'analytics-outline', title: 'Analyse ABC', description: "Vos produits sont classés en 3 groupes selon leur contribution au CA : Classe A (80% du CA), Classe B (15%) et Classe C (5%). Concentrez vos efforts sur la classe A." },
      { icon: 'bar-chart-outline', title: 'Statistiques & Historique', description: "Accédez aux graphiques détaillés (évolution du stock, répartition par catégorie) et à l'historique complet des mouvements avec filtres et export CSV." },
    ],
  },
  {
    key: 'products',
    title: 'Gestion des Produits',
    icon: 'cube-outline',
    color: '#10b981',
    guideKey: 'products',
    role: 'shopkeeper',
    features: [
      { icon: 'search-outline', title: 'Recherche & Filtres', description: "Retrouvez un produit en tapant son nom ou son SKU. Filtrez par catégorie grâce aux puces colorées horizontales." },
      { icon: 'pricetag-outline', title: 'Badges de Stock', description: "Chaque produit affiche un badge coloré : Rouge (Rupture), Orange (Stock bas), Bleu (Surstock), Vert (Normal). Le seuil est configurable par produit." },
      { icon: 'swap-vertical-outline', title: 'Mouvements Rapides', description: "Les boutons 'Entrée' et 'Sortie' permettent d'ajuster le stock sans créer de commande. Indiquez la raison (livraison, perte, inventaire, etc.)." },
      { icon: 'qr-code-outline', title: 'Étiquettes PDF', description: "Générez des étiquettes avec QR Code, nom, prix et code-barres. Imprimez-les pour vos étagères ou partagez-les." },
      { icon: 'settings-outline', title: 'Gestion des Catégories', description: "L'icône engrenage ouvre le gestionnaire de catégories. Créez, modifiez ou supprimez des catégories avec couleurs et icônes personnalisées." },
      { icon: 'layers-outline', title: 'Lots & Péremption', description: "Pour les produits alimentaires, créez des lots avec dates de péremption. Les lots expirant bientôt déclenchent des alertes automatiques." },
      { icon: 'trending-up-outline', title: 'Historique des Prix', description: "Consultez l'évolution des prix d'achat et de vente de chaque produit pour optimiser vos marges." },
    ],
  },
  {
    key: 'pos',
    title: 'Point de Vente (Caisse)',
    icon: 'calculator-outline',
    color: '#f59e0b',
    guideKey: 'pos',
    role: 'shopkeeper',
    features: [
      { icon: 'barcode-outline', title: 'Scanner de Code-Barres', description: "Utilisez la caméra pour scanner les articles. Le produit est identifié et ajouté au panier instantanément." },
      { icon: 'cart-outline', title: 'Gestion du Panier', description: "Ajoutez, supprimez ou modifiez les quantités dans le panier. Le total se recalcule en temps réel avec chaque modification." },
      { icon: 'person-outline', title: 'Sélection Client', description: "Associez un client existant à la vente ou créez-en un nouveau en 2 secondes. Ses points de fidélité sont crédités automatiquement." },
      { icon: 'card-outline', title: 'Modes de Paiement', description: "Acceptez 5 modes de paiement : espèces, mobile money, carte bancaire, virement et vente à crédit." },
      { icon: 'receipt-outline', title: 'Tickets de Caisse', description: "Après validation, imprimez le ticket ou envoyez-le par WhatsApp ou email. Le ticket inclut les détails complets de la transaction." },
      { icon: 'ribbon-outline', title: 'Fidélité Automatique', description: "Les points de fidélité sont calculés et crédités automatiquement à chaque achat. Le client progresse dans les tiers (Bronze → Platine)." },
    ],
  },
  {
    key: 'orders',
    title: 'Commandes Fournisseurs',
    icon: 'document-text-outline',
    color: '#3b82f6',
    guideKey: 'orders',
    role: 'shopkeeper',
    features: [
      { icon: 'add-circle-outline', title: 'Créer une Commande', description: "Sélectionnez un fournisseur (manuel ou marketplace), ajoutez les produits avec quantités et prix, définissez la date de livraison prévue." },
      { icon: 'navigate-outline', title: 'Suivi de Statut', description: "Suivez chaque commande : En attente → Confirmée → Expédiée → Livrée. La barre de progression visuelle montre l'avancement." },
      { icon: 'sparkles-outline', title: 'Réception IA', description: "À la livraison, l'IA analyse les produits reçus et les associe intelligemment à votre inventaire. Validez ou corrigez les suggestions." },
      { icon: 'link-outline', title: 'Association Manuelle', description: "Associez manuellement un produit du catalogue fournisseur à un produit de votre inventaire, même après la livraison." },
      { icon: 'filter-outline', title: 'Filtres Avancés', description: "Filtrez par statut, fournisseur ou période pour retrouver une commande." },
    ],
  },
  {
    key: 'suppliers',
    title: 'Relations Fournisseurs',
    icon: 'people-outline',
    color: '#8b5cf6',
    guideKey: 'suppliers',
    role: 'shopkeeper',
    features: [
      { icon: 'person-add-outline', title: 'Annuaire Fournisseurs', description: "Créez les fiches de vos fournisseurs avec coordonnées, conditions de paiement, délai de livraison et produits fournis." },
      { icon: 'call-outline', title: 'Contact Direct', description: "Appelez, envoyez un email ou un message WhatsApp à votre fournisseur en un clic depuis sa fiche." },
      { icon: 'globe-outline', title: 'Marketplace', description: "Accédez au réseau de fournisseurs vérifiés. Comparez les prix, consultez les avis et commandez directement." },
      { icon: 'link-outline', title: 'Liaison Produits', description: "Liez vos produits à chaque fournisseur avec son prix, sa référence et marquez-le comme fournisseur préféré." },
      { icon: 'chatbubble-outline', title: 'Journal de Contact', description: "Gardez une trace de vos échanges : appels, visites, emails. Ajoutez des notes pour chaque interaction." },
      { icon: 'arrow-up-circle-outline', title: 'Suggestions Réappro', description: "Le système identifie les produits sous le seuil minimum et vous suggère les quantités à commander par fournisseur." },
    ],
  },
  {
    key: 'crm',
    title: 'CRM & Fidélité',
    icon: 'heart-outline',
    color: '#ec4899',
    guideKey: 'crm',
    role: 'shopkeeper',
    features: [
      { icon: 'people-outline', title: 'Fichier Client', description: "Enregistrez vos clients avec nom, téléphone, email et date de naissance. Suivez leur historique d'achats complet." },
      { icon: 'ribbon-outline', title: 'Programme de Fidélité', description: "Configurez le ratio de points par achat et les paliers de récompense. Les tiers (Bronze, Argent, Or, Platine) se calculent automatiquement." },
      { icon: 'wallet-outline', title: 'Gestion des Dettes', description: "Enregistrez les ventes à crédit et les remboursements. Le solde du client est toujours à jour." },
      { icon: 'megaphone-outline', title: 'Campagnes Marketing', description: "Envoyez des SMS ou emails promotionnels ciblés par tier de fidélité ou sélection individuelle." },
      { icon: 'gift-outline', title: 'Promotions', description: "Créez des promotions avec pourcentage de réduction ou échange de points de fidélité. Activez/désactivez à volonté." },
      { icon: 'calendar-outline', title: 'Anniversaires', description: "Enregistrez la date de naissance pour des offres personnalisées automatiques et renforcer la relation client." },
    ],
  },
  {
    key: 'accounting',
    title: 'Comptabilité',
    icon: 'calculator-outline',
    color: '#14b8a6',
    guideKey: 'accounting',
    role: 'shopkeeper',
    features: [
      { icon: 'calendar-outline', title: 'Périodes & Filtres', description: "Analysez vos finances sur 7, 30 ou 90 jours, ou définissez une période personnalisée. Tous les KPIs s'adaptent." },
      { icon: 'stats-chart-outline', title: 'Bénéfices & Marges', description: "Suivez votre CA, coût des marchandises, bénéfice brut et net. Identifiez les produits les plus et moins rentables." },
      { icon: 'document-text-outline', title: 'Factures PDF', description: "Créez des factures professionnelles avec TVA, lignes détaillées et coordonnées. Envoyez-les par email ou imprimez." },
      { icon: 'cash-outline', title: 'Suivi des Dépenses', description: "Catégorisez vos dépenses (loyer, salaires, transport, électricité, etc.) pour un bilan complet et précis." },
      { icon: 'pie-chart-outline', title: 'Graphiques', description: "Visualisez la répartition des paiements, des dépenses par catégorie et l'évolution journalière du CA." },
      { icon: 'download-outline', title: 'Export CSV', description: "Exportez toutes vos données financières au format CSV pour votre comptable ou logiciel de comptabilité." },
    ],
  },
  {
    key: 'alerts',
    title: 'Alertes de Stock',
    icon: 'notifications-outline',
    color: '#ef4444',
    guideKey: 'alerts',
    role: 'shopkeeper',
    features: [
      { icon: 'settings-outline', title: 'Règles Personnalisables', description: "Définissez vos propres seuils pour chaque type d'alerte : stock bas (%), rupture, surstock, produit dormant." },
      { icon: 'flash-outline', title: 'Alertes Automatiques', description: "Les alertes se déclenchent automatiquement quand un produit franchit un seuil. Vous êtes notifié en temps réel." },
      { icon: 'bed-outline', title: 'Produits Dormants', description: "Détectez les produits sans aucune sortie depuis 30 jours. Idéal pour identifier le stock mort." },
      { icon: 'checkmark-done-outline', title: 'Gestion des Alertes', description: "Marquez les alertes comme lues, supprimez-les, ou effacez toutes les alertes résolues en un clic." },
    ],
  },
  {
    key: 'activity',
    title: "Flux d'Activité",
    icon: 'time-outline',
    color: '#64748b',
    guideKey: 'activity',
    role: 'shopkeeper',
    features: [
      { icon: 'list-outline', title: 'Journal Complet', description: "Chaque action (vente, mouvement de stock, modification produit, connexion) est enregistrée avec date, heure et auteur." },
      { icon: 'funnel-outline', title: 'Filtres', description: "Filtrez par module (stock, caisse, CRM, comptabilité), par utilisateur ou par période pour retrouver une action précise." },
      { icon: 'people-outline', title: 'Suivi par Utilisateur', description: "Identifiez quel employé a effectué chaque action. Essentiel pour la traçabilité et la responsabilisation." },
    ],
  },
  {
    key: 'users',
    title: 'Gestion des Utilisateurs',
    icon: 'shield-outline',
    color: '#f97316',
    guideKey: 'users',
    role: 'shopkeeper',
    features: [
      { icon: 'person-add-outline', title: 'Créer des Comptes', description: "Ajoutez un compte pour chaque employé avec email et mot de passe. Partagez les identifiants par WhatsApp." },
      { icon: 'lock-closed-outline', title: 'Permissions par Module', description: "Contrôlez l'accès à chaque module : aucun accès, lecture seule, ou lecture + écriture." },
      { icon: 'key-outline', title: 'Rôles Adaptés', description: "Un caissier n'a accès qu'à la caisse, un gérant à tout sauf la comptabilité. Configurez selon vos besoins." },
      { icon: 'trash-outline', title: 'Gestion des Comptes', description: "Modifiez les permissions, réinitialisez le mot de passe ou désactivez un compte à tout moment." },
    ],
  },
  {
    key: 'settings',
    title: 'Paramètres',
    icon: 'settings-outline',
    color: '#6366f1',
    guideKey: 'settings',
    role: 'all',
    features: [
      { icon: 'storefront-outline', title: 'Multi-Boutiques', description: "Créez et gérez plusieurs points de vente. Chaque boutique possède son propre stock, ses ventes et sa comptabilité." },
      { icon: 'moon-outline', title: 'Thème Sombre', description: "Basculez entre le thème clair et sombre selon votre préférence et vos conditions d'éclairage." },
      { icon: 'toggle-outline', title: 'Modules Actifs', description: "Activez ou désactivez les modules inutiles (CRM, comptabilité, fournisseurs) pour simplifier l'interface." },
      { icon: 'notifications-outline', title: 'Notifications Push', description: "Activez les notifications pour être alerté en temps réel des ruptures, stocks bas et produits dormants." },
    ],
  },
  {
    key: 'supplierDashboard',
    title: 'Dashboard Fournisseur',
    icon: 'stats-chart-outline',
    color: '#6366f1',
    guideKey: 'supplierDashboard',
    role: 'supplier',
    features: [
      { icon: 'trending-up-outline', title: 'KPIs Fournisseur', description: "Suivez votre CA total, le nombre de commandes, le panier moyen et le CA du mois en cours." },
      { icon: 'star-outline', title: 'Notes & Avis', description: "Consultez la note moyenne attribuée par vos clients commerçants et lisez leurs commentaires détaillés." },
      { icon: 'trophy-outline', title: 'Top Produits', description: "Découvrez vos 5 produits les plus commandés avec les quantités vendues. Optimisez votre catalogue en conséquence." },
      { icon: 'people-outline', title: 'Clients Actifs', description: "Voyez combien de commerçants différents ont commandé chez vous. Suivez l'évolution de votre base clients." },
    ],
  },
  {
    key: 'supplierCatalog',
    title: 'Catalogue Fournisseur',
    icon: 'cube-outline',
    color: '#10b981',
    guideKey: 'supplierCatalog',
    role: 'supplier',
    features: [
      { icon: 'add-circle-outline', title: 'Ajouter des Produits', description: "Ajoutez vos produits avec nom, description, catégorie, prix et quantité minimum de commande." },
      { icon: 'pricetag-outline', title: 'Tarification', description: "Définissez vos prix en FCFA. Mettez-les à jour à tout moment depuis la fiche produit." },
      { icon: 'toggle-outline', title: 'Disponibilité', description: "Basculez la disponibilité d'un produit en un clic. Les produits indisponibles n'apparaissent plus sur la marketplace." },
      { icon: 'grid-outline', title: 'Catégories', description: "Organisez votre catalogue par catégories et sous-catégories partagées avec vos clients commerçants." },
    ],
  },
  {
    key: 'supplierOrders',
    title: 'Commandes Reçues',
    icon: 'document-text-outline',
    color: '#3b82f6',
    guideKey: 'supplierOrders',
    role: 'supplier',
    features: [
      { icon: 'list-outline', title: 'Commandes Entrantes', description: "Les commandes de vos clients commerçants apparaissent ici avec le détail des produits, quantités et montants." },
      { icon: 'checkmark-circle-outline', title: 'Accepter ou Refuser', description: "Consultez le détail de chaque commande puis acceptez-la ou refusez-la avec un motif." },
      { icon: 'airplane-outline', title: 'Marquer Expédiée', description: "Une fois la commande préparée et envoyée, marquez-la comme expédiée. Le client est notifié." },
      { icon: 'funnel-outline', title: 'Filtres & Historique', description: "Filtrez par statut (en attente, confirmée, expédiée, livrée) ou par période pour retrouver vos commandes." },
    ],
  },
];

export const FAQ: FAQItem[] = [
  {
    question: 'Comment ajouter mon premier produit ?',
    answer: "Allez dans l'onglet Produits, appuyez sur le bouton '+' en bas à droite. Remplissez le nom, le prix de vente et le stock initial. Vous pouvez aussi scanner un code-barres existant.",
  },
  {
    question: 'Comment faire une vente ?',
    answer: "Allez dans l'onglet Caisse. Scannez vos articles ou cherchez-les dans la liste. Ajoutez au panier, associez un client si souhaité, choisissez le mode de paiement et validez.",
  },
  {
    question: 'Comment gérer les dettes clients ?',
    answer: "Dans l'onglet Clients (CRM), sélectionnez un client puis allez dans l'onglet Compte. Vous pouvez enregistrer une dette manuelle ou un paiement. Le solde est mis à jour en temps réel.",
  },
  {
    question: "Comment commander auprès d'un fournisseur ?",
    answer: "Allez dans Commandes, cliquez sur '+'. Sélectionnez le fournisseur (manuel ou marketplace), ajoutez les produits et validez. À la réception, confirmez la livraison pour mettre à jour le stock.",
  },
  {
    question: 'Comment ajouter un employé ?',
    answer: "Dans Paramètres > Utilisateurs, ajoutez un nouvel utilisateur avec son email. Définissez ses permissions module par module et partagez les identifiants par WhatsApp.",
  },
  {
    question: 'Comment changer de boutique ?',
    answer: "Utilisez le sélecteur de boutique en haut à droite de l'écran. Toutes les données (stock, ventes, comptabilité) basculent vers la boutique sélectionnée.",
  },
  {
    question: 'Mes données sont-elles sauvegardées ?',
    answer: "Oui ! Vos données sont stockées dans le cloud et synchronisées en temps réel. Un cache local permet de consulter les données même hors connexion.",
  },
  {
    question: 'Comment exporter mes données ?',
    answer: "Depuis le Dashboard (bouton Historique > icône téléchargement) ou depuis la Comptabilité, exportez en CSV. Les factures s'exportent en PDF.",
  },
  {
    question: 'Comment configurer les alertes ?',
    answer: "Dans l'onglet Alertes, appuyez sur l'icône engrenage pour accéder aux règles. Activez les types d'alertes souhaités et ajustez les seuils selon vos besoins.",
  },
  {
    question: 'Comment envoyer un ticket par WhatsApp ?',
    answer: "Après avoir validé une vente dans la Caisse, l'écran de confirmation propose un bouton 'Partager'. Choisissez WhatsApp et sélectionnez le contact.",
  },
  {
    question: 'Comment créer une facture ?',
    answer: "Dans l'onglet Comptabilité, appuyez sur 'Créer une facture'. Ajoutez les lignes avec description, quantité, prix et TVA. La facture est générée en PDF.",
  },
  {
    question: 'Comment fonctionne la fidélité ?',
    answer: "Activez le programme dans Paramètres > Fidélité. Définissez le ratio de points (ex: 1 point pour 100 FCFA). Les points s'accumulent à chaque vente et les clients progressent automatiquement dans les tiers.",
  },
];
