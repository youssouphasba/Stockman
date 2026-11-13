// Étapes du guide de démarrage. Les identifiants doivent rester ceux du serveur (backend/onboarding_guide.py).

export type GuideContextData = { productId?: string; productName?: string; customerId?: string };

export type GuideStepKind = 'card' | 'tap' | 'field' | 'info';

export type GuideStep = {
  id: string;
  chapter: 'start' | 'products' | 'pos' | 'accounting' | 'crm' | 'end';
  kind: GuideStepKind;
  // Couche d'affichage : « root » pour les écrans, sinon la fenêtre (modale) qui contient la cible.
  host: string;
  target?: string | ((ctx: GuideContextData) => string);
  // Cible de repli quand la cible principale n'est pas affichée (ex. reprise après redémarrage).
  fallbackTarget?: string;
  title: string;
  body: string;
  // Consigne affichée en gras : ce que l'utilisateur doit faire.
  action?: string;
  advanceOn?: { route?: string; signal?: string; targetMounted?: string; hostMounted?: string; hostClosed?: string };
  // Champ : renvoie un message d'erreur, ou null si la saisie convient.
  validate?: (value: string, ctx: GuideContextData) => string | null;
  // Étape sautée si cette cible n'existe pas (fonction absente pour ce compte ou cet écran).
  optional?: boolean;
  // Si la fenêtre ou la cible requise disparaît (fenêtre fermée), on revient à cette étape.
  requires?: string;
  fallbackStep?: string;
  // Étape de reprise après un redémarrage de l'application.
  resumeAt?: string;
  // Écran où se joue l'étape quand on y revient.
  route?: string;
  scrollTo?: string;
  nextLabel?: string;
};

const toNumber = (value: string) => Number(String(value || '').replace(',', '.').replace(/\s/g, ''));

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome', chapter: 'start', kind: 'card', host: 'root',
    title: 'Bienvenue dans Stockman !',
    body: "En quelques minutes, nous allons créer ensemble un produit d'exercice, faire une vraie vente en caisse, puis lire le résultat dans la Compta et la fiche du client. Tout ce que vous créez pendant ce guide sera supprimé à la fin.",
    nextLabel: 'Commencer',
  },
  {
    id: 'tour_tabs', chapter: 'start', kind: 'info', host: 'root', target: 'tab.bar',
    title: 'La barre des onglets',
    body: "En bas de l'écran, chaque onglet ouvre une partie de Stockman : Produits, Caisse, Compta, Clients… L'onglet en couleur indique l'écran où vous êtes. Suivez le cadre lumineux : il vous montre à chaque fois où toucher.",
  },
  {
    id: 'tab_products', chapter: 'products', kind: 'tap', host: 'root', target: 'tab.products',
    title: 'Onglet Produits',
    body: "C'est ici que vous gérez votre catalogue : prix, quantités en stock, catégories et alertes.",
    action: "Touchez l'onglet Produits.",
    advanceOn: { route: 'products' },
  },
  {
    id: 'open_add_menu', chapter: 'products', kind: 'tap', host: 'root', target: 'products.add', route: 'products',
    title: 'Bouton Ajouter',
    body: 'Il regroupe toutes les façons de créer vos produits.',
    action: 'Touchez « Ajouter ».',
    advanceOn: { targetMounted: 'products.menu.add' },
  },
  {
    id: 'add_one', chapter: 'products', kind: 'tap', host: 'root', target: 'products.menu.add', route: 'products',
    title: 'Créer un produit',
    body: 'Commençons par la méthode la plus simple : un produit à la fois.',
    action: 'Touchez « Ajouter un produit ».',
    advanceOn: { hostMounted: 'productForm' },
    requires: 'products.menu.add', fallbackStep: 'open_add_menu',
  },
  {
    id: 'product_name', chapter: 'products', kind: 'field', host: 'productForm', target: 'product.name',
    title: 'Nom du produit',
    body: "Le nom tel que vous l'appelez en boutique. Il apparaîtra en caisse et sur les reçus.",
    action: "Écrivez le nom d'un article de votre boutique, puis touchez « Suivant ».",
    validate: (value) => (String(value || '').trim().length >= 2 ? null : 'Écrivez au moins deux caractères.'),
    requires: 'productForm', fallbackStep: 'open_add_menu', resumeAt: 'open_add_menu',
  },
  {
    id: 'product_purchase_price', chapter: 'products', kind: 'field', host: 'productForm', target: 'product.purchase_price',
    title: "Prix d'achat",
    body: 'Ce que vous payez à votre fournisseur pour une unité. Il sert à calculer votre marge.',
    action: "Saisissez le prix d'achat, puis touchez « Suivant ».",
    validate: (value) => (toNumber(value) > 0 ? null : "Saisissez un prix d'achat supérieur à 0."),
    requires: 'productForm', fallbackStep: 'open_add_menu', resumeAt: 'open_add_menu',
  },
  {
    id: 'product_selling_price', chapter: 'products', kind: 'field', host: 'productForm', target: 'product.selling_price',
    title: 'Prix de vente',
    body: 'Le prix payé par votre client. La différence avec le prix d’achat est votre marge.',
    action: 'Saisissez le prix de vente, puis touchez « Suivant ».',
    validate: (value) => (toNumber(value) > 0 ? null : 'Saisissez un prix de vente supérieur à 0.'),
    requires: 'productForm', fallbackStep: 'open_add_menu', resumeAt: 'open_add_menu',
  },
  {
    id: 'product_quantity', chapter: 'products', kind: 'field', host: 'productForm', target: 'product.quantity',
    title: 'Quantité en stock',
    body: 'Le nombre d’unités que vous avez aujourd’hui. Chaque vente la fera baisser automatiquement.',
    action: 'Saisissez une quantité, puis touchez « Suivant ».',
    validate: (value) => (toNumber(value) >= 1 ? null : 'Saisissez une quantité d’au moins 1 pour pouvoir le vendre.'),
    requires: 'productForm', fallbackStep: 'open_add_menu', resumeAt: 'open_add_menu',
  },
  {
    id: 'product_save', chapter: 'products', kind: 'tap', host: 'productForm', target: 'product.save',
    title: 'Enregistrer',
    body: 'Votre produit est prêt.',
    action: 'Touchez le bouton pour l’enregistrer.',
    advanceOn: { signal: 'product.created' },
    requires: 'productForm', fallbackStep: 'open_add_menu', resumeAt: 'open_add_menu',
  },
  {
    id: 'open_add_menu_text', chapter: 'products', kind: 'tap', host: 'root', target: 'products.add', route: 'products',
    title: 'Bravo, votre premier produit est créé !',
    body: 'Voyons maintenant une méthode plus rapide quand vous avez une liste.',
    action: 'Touchez « Ajouter ».',
    advanceOn: { targetMounted: 'products.menu.text' },
  },
  {
    id: 'text_import', chapter: 'products', kind: 'tap', host: 'root', target: 'products.menu.text', route: 'products',
    title: 'Import par texte',
    body: "Collez une liste écrite comme vous voulez (message WhatsApp, notes) : l'IA crée les produits pour vous.",
    action: 'Touchez « Import texte ».',
    advanceOn: { hostMounted: 'textImport' },
    requires: 'products.menu.text', fallbackStep: 'open_add_menu_text',
  },
  {
    id: 'text_input', chapter: 'products', kind: 'field', host: 'textImport', target: 'textImport.input',
    title: 'Votre liste',
    body: 'Une ligne par produit, avec le prix et la quantité si vous les connaissez.',
    action: 'Écrivez deux ou trois produits de votre boutique, puis touchez « Suivant ».',
    validate: (value) => (String(value || '').trim().length >= 5 ? null : 'Écrivez au moins un produit avec son prix.'),
    requires: 'textImport', fallbackStep: 'open_add_menu_text', resumeAt: 'open_add_menu_text',
  },
  {
    id: 'text_submit', chapter: 'products', kind: 'tap', host: 'textImport', target: 'textImport.submit',
    title: 'Lancer l’import',
    body: "L'IA lit votre liste et crée les produits en quelques secondes.",
    action: 'Touchez le bouton d’import.',
    advanceOn: { signal: 'textImport.done' },
    requires: 'textImport', fallbackStep: 'open_add_menu_text', resumeAt: 'open_add_menu_text',
  },
  {
    id: 'other_methods', chapter: 'products', kind: 'tap', host: 'root', target: 'products.add', route: 'products',
    title: "D'autres façons d'ajouter vos produits",
    body: 'Il existe encore trois méthodes. Nous allons juste vous les montrer.',
    action: 'Touchez « Ajouter ».',
    advanceOn: { targetMounted: 'products.menu.csv' },
  },
  {
    id: 'other_scan', chapter: 'products', kind: 'info', host: 'root', target: 'products.menu.scan', route: 'products', optional: true,
    title: 'Scan en lot',
    body: "Scannez les codes-barres de vos articles les uns après les autres avec l'appareil photo.",
  },
  {
    id: 'other_csv', chapter: 'products', kind: 'info', host: 'root', target: 'products.menu.csv', route: 'products', optional: true,
    title: 'Import CSV',
    body: 'Vous avez déjà un fichier Excel ou CSV ? Importez tous vos produits en une fois.',
  },
  {
    id: 'other_catalog', chapter: 'products', kind: 'info', host: 'root', target: 'products.menu.catalog', route: 'products', optional: true,
    title: 'Import catalogue',
    body: 'Partez du catalogue de votre secteur : il ne reste qu’à compléter les prix et les quantités.',
  },
  {
    id: 'tab_pos', chapter: 'pos', kind: 'tap', host: 'root', target: 'tab.pos',
    title: 'Onglet Caisse',
    body: 'Place à votre première vente ! La Caisse enregistre vos ventes et met le stock à jour.',
    action: "Touchez l'onglet Caisse.",
    advanceOn: { route: 'pos' },
  },
  {
    id: 'pos_products', chapter: 'pos', kind: 'tap', host: 'root', target: 'pos.productsButton', route: 'pos', optional: true,
    title: 'Vos produits',
    body: 'Ce bouton affiche les produits disponibles à la vente.',
    action: 'Touchez « Produits ».',
    advanceOn: { targetMounted: 'pos.firstProduct' },
  },
  {
    id: 'pos_pick', chapter: 'pos', kind: 'tap', host: 'root', route: 'pos',
    target: (ctx) => (ctx.productId ? `pos.product.${ctx.productId}` : 'pos.firstProduct'), fallbackTarget: 'pos.firstProduct',
    title: 'Ajouter au panier',
    body: 'Chaque touche ajoute une unité au panier.',
    action: 'Touchez votre produit.',
    advanceOn: { signal: 'cart.added' },
  },
  {
    id: 'pos_add_customer', chapter: 'pos', kind: 'tap', host: 'root', target: 'pos.addCustomer', route: 'pos',
    title: 'Associer un client',
    body: 'Rattacher la vente à un client permet de suivre ses achats et, si besoin, ce qu’il vous doit.',
    action: 'Touchez « + » pour créer un client.',
    advanceOn: { hostMounted: 'customerForm' },
  },
  {
    id: 'customer_name', chapter: 'pos', kind: 'field', host: 'customerForm', target: 'customer.name',
    title: 'Nom du client',
    body: "C'est un client d'exercice : il sera supprimé à la fin du guide.",
    action: 'Écrivez un nom, puis touchez « Suivant ».',
    validate: (value) => (String(value || '').trim().length >= 2 ? null : 'Écrivez au moins deux caractères.'),
    requires: 'customerForm', fallbackStep: 'pos_add_customer', resumeAt: 'pos_add_customer',
  },
  {
    id: 'customer_save', chapter: 'pos', kind: 'tap', host: 'customerForm', target: 'customer.save',
    title: 'Créer le client',
    body: 'Le client sera associé à la vente en cours.',
    action: 'Touchez le bouton pour créer le client.',
    advanceOn: { signal: 'customer.created' },
    requires: 'customerForm', fallbackStep: 'pos_add_customer', resumeAt: 'pos_add_customer',
  },
  {
    id: 'pos_pay', chapter: 'pos', kind: 'tap', host: 'root', target: 'pos.payCash', route: 'pos',
    title: 'Encaisser',
    body: 'Le client paie en espèces. Vous pourriez aussi choisir Mobile Money ou la vente à crédit.',
    action: 'Touchez « Espèces » pour valider la vente.',
    advanceOn: { signal: 'sale.completed' },
  },
  {
    id: 'receipt', chapter: 'pos', kind: 'tap', host: 'receipt', target: 'receipt.done',
    title: 'Le reçu',
    body: 'Vous pouvez le partager au client. Votre stock a déjà baissé.',
    action: 'Touchez « Terminé ».',
    advanceOn: { hostClosed: 'receipt' },
  },
  {
    id: 'tab_accounting', chapter: 'accounting', kind: 'tap', host: 'root', target: 'tab.accounting',
    title: 'Onglet Compta',
    body: 'Voyons ce que votre vente a rapporté.',
    action: "Touchez l'onglet Compta.",
    advanceOn: { route: 'accounting' },
  },
  {
    id: 'accounting_kpis', chapter: 'accounting', kind: 'info', host: 'root', target: 'accounting.kpis', route: 'accounting', scrollTo: 'kpiGrid',
    title: 'Vos chiffres',
    body: "Le chiffre d'affaires est le montant de votre vente. La marge brute, c'est le prix de vente moins le prix d'achat. Le résultat net retire aussi vos dépenses et vos pertes.",
  },
  {
    id: 'accounting_sales', chapter: 'accounting', kind: 'info', host: 'root', target: 'accounting.sales', route: 'accounting', scrollTo: 'recentSales',
    title: 'Ventes récentes',
    body: 'Votre vente apparaît ici avec son montant, son moyen de paiement et son client. Touchez une vente pour voir son détail.',
  },
  {
    id: 'tab_crm', chapter: 'crm', kind: 'tap', host: 'root', target: 'tab.crm',
    title: 'Onglet Clients',
    body: 'Chaque client garde l’historique de ses achats.',
    action: "Touchez l'onglet Clients.",
    advanceOn: { route: 'crm' },
  },
  {
    id: 'crm_customer', chapter: 'crm', kind: 'tap', host: 'root', route: 'crm',
    target: (ctx) => (ctx.customerId ? `crm.customer.${ctx.customerId}` : 'crm.firstCustomer'), fallbackTarget: 'crm.firstCustomer',
    title: 'Votre client',
    body: 'Il apparaît avec le total de ses achats.',
    action: 'Touchez sa fiche.',
    advanceOn: { hostMounted: 'customerDetail' },
  },
  {
    id: 'crm_stats', chapter: 'crm', kind: 'info', host: 'customerDetail', target: 'crm.detailStats', optional: true,
    title: 'Sa fiche',
    body: 'Nombre de visites, panier moyen et date du dernier achat sont calculés automatiquement à chaque vente.',
    requires: 'customerDetail', fallbackStep: 'crm_customer', resumeAt: 'tab_crm',
  },
  {
    id: 'crm_purchases', chapter: 'crm', kind: 'tap', host: 'customerDetail', target: 'crm.tabPurchases',
    title: 'Ses achats',
    body: 'L’onglet Achats liste chaque vente de ce client. Le compte client suivra ce qu’il vous doit s’il achète à crédit.',
    action: 'Touchez « Achats ».',
    advanceOn: { signal: 'crm.purchasesShown' },
    requires: 'customerDetail', fallbackStep: 'crm_customer', resumeAt: 'tab_crm',
  },
  {
    id: 'finish', chapter: 'end', kind: 'card', host: 'root',
    title: 'Vous savez utiliser Stockman !',
    body: 'Le produit, le client et la vente de l’exercice vont être supprimés : vos chiffres repartent de zéro.',
  },
];

export const STEP_INDEX: Record<string, number> = Object.fromEntries(GUIDE_STEPS.map((step, index) => [step.id, index]));

export const CHAPTERS: { key: GuideStep['chapter']; label: string }[] = [
  { key: 'products', label: 'Produits' },
  { key: 'pos', label: 'Caisse' },
  { key: 'accounting', label: 'Compta' },
  { key: 'crm', label: 'Clients' },
];

export function resolveTarget(step: GuideStep, ctx: GuideContextData): string | undefined {
  if (!step.target) return undefined;
  return typeof step.target === 'function' ? step.target(ctx) : step.target;
}
