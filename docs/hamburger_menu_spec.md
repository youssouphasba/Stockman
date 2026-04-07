# Spec Menu Hamburger Mobile

Composant reutilisable `DrawerMenu` avec un bouton hamburger dans le header de chaque onglet (sauf Reglages).
Chaque element recoit : `{ label, icon, onPress, plan?, section? }`.
- `plan` : plan minimum requis (`starter` | `pro` | `enterprise`). Si absent = tous plans.
- `section` : si present, scroll vers la section au lieu d'ouvrir une modal.
- Les elements gates affichent un badge verrou + ouvrent la page abonnement au clic.

Legende plans :
- S = Starter (tous)
- P = Pro+
- E = Enterprise

---

## 1. Accueil (Dashboard)

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Historique des ventes | `time-outline` | `showHistoryModal` | S |
| Statistiques | `stats-chart-outline` | `showStatsModal` | S |
| Inventaire tournant | `clipboard-outline` | `showInventoryCountModal` | E |
| Notifications | `notifications-outline` | `showNotifModal` | S |
| --- | | | |
| Alertes | `alert-circle-outline` | naviguer `/alerts` | S |
| Utilisateurs | `people-outline` | naviguer `/users` | P |
| Multi-boutiques | `storefront-outline` | naviguer `/enterprise` | E |
| Abonnement | `card-outline` | naviguer `/subscription` | S |

---

## 2. Caisse (POS)

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Checkout vocal | `mic-outline` | `showVoiceModal` | S |
| Associer un client | `person-add-outline` | `showCustomerModal` | S |
| Choisir une table | `restaurant-outline` | `showTableModal` | S (restaurant) |
| Choisir un terminal | `desktop-outline` | `showTerminalModal` | E |
| --- | | | |
| Historique des ventes | `time-outline` | naviguer dashboard history | S |

---

## 3. Produits / Stock

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Ajouter un produit | `add-circle-outline` | `showAddModal` | S |
| Scanner en lot | `barcode-outline` | naviguer `/inventory/batch-scan` | S |
| Import CSV | `cloud-upload-outline` | `showBulkImportModal` | S |
| Import texte IA | `document-text-outline` | `showTextImportModal` | P |
| Gerer les categories | `pricetags-outline` | `showCategoryModal` | S |
| --- | | | |
| Emplacements | `map-outline` | naviguer `/locations` | E |
| Historique mouvements | `time-outline` | `showHistoryModal` | S |
| Exporter CSV | `download-outline` | `handleExportCSV` | S |
| Corbeille | `trash-outline` | `showTrashModal` | S |

---

## 4. Comptabilite

### Navigation sections (scroll vers)

| Element | Icone | Section cible | Plan |
|---------|-------|--------------|------|
| KPIs principaux | `stats-chart-outline` | KPI Grid (CA, marge, depenses, resultat) | S |
| Depenses | `wallet-outline` | Expenses Section | S |
| Stock & Pertes | `cube-outline` | KPI Grid 2 | S |
| Ventes & Achats | `cart-outline` | KPI Grid 3 | S |
| Courbe CA | `trending-up-outline` | Revenue Trend Chart | S |
| Repartition CA | `pie-chart-outline` | Revenue Breakdown PieChart | P |
| Moyens de paiement | `card-outline` | Payment Breakdown | S |
| Performance produits | `podium-outline` | Performance par Produit | P |
| Ventes recentes | `receipt-outline` | Recent Sales | S |
| Creances clients | `alert-circle-outline` | (futur P2) | P |
| Tresorerie | `swap-vertical-outline` | (futur P3) | E |
| CA par jour semaine | `calendar-outline` | (futur P5) | E |
| Rentabilite categorie | `layers-outline` | (futur P6) | E |

### Actions

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Ajouter une depense | `add-circle-outline` | `showExpenseModal` | S |
| Creer une facture | `document-text-outline` | `showInvoiceModal` | S |
| Rapport d'activite | `analytics-outline` | `generateActivityReportPdf` | S |
| Exporter CSV | `download-outline` | `handleExportCSV` | S |

---

## 5. Fournisseurs

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Ajouter un fournisseur | `add-circle-outline` | `showFormModal` | S |
| Passer une commande | `cart-outline` | `showOrderModal` | S |
| Inviter un fournisseur | `mail-outline` | `showInviteModal` | P |
| --- | | | |
| Voir les produits | `cube-outline` | naviguer `/products` | S |

---

## 6. CRM (Clients)

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Ajouter un client | `person-add-outline` | `showCustomerModal` | S |
| Creer une promo | `gift-outline` | `showPromoModal` | P |
| Lancer une campagne | `megaphone-outline` | `showCampaignModal` | E |
| --- | | | |
| Exporter CSV | `download-outline` | `handleExportCSV` | S |
| Exporter PDF | `print-outline` | `handleExportPdf` | S |

---

## 7. Commandes

| Element | Icone | Action | Plan |
|---------|-------|--------|------|
| Nouvelle commande | `add-circle-outline` | `showCreateModal` | S |
| Retours clients | `arrow-undo-outline` | `setActiveTab('returns')` | S |
| Historique | `time-outline` | `showHistoryModal` | P |

---

## Implementation technique

### Composant `DrawerMenu`
```
Props:
  items: DrawerMenuItem[]
  visible: boolean
  onClose: () => void

DrawerMenuItem:
  label: string
  icon: string (Ionicons)
  onPress: () => void
  plan?: 'starter' | 'pro' | 'enterprise'
  separator?: boolean        // ligne de separation
  badge?: string | number    // badge optionnel (ex: nb notifs)
  section?: boolean          // true = navigation intra-page (scroll)
```

### Fichier
`frontend/components/DrawerMenu.tsx`

### Comportement
- Slide-in depuis la gauche (ou overlay droit)
- Fond semi-transparent, fermeture au tap exterieur
- Elements gates : icone verrou + texte grise
- Tap sur element gate → naviguer vers `/subscription`
- Tap sur element section → fermer drawer + `scrollTo` ref

### Refs pour scroll (Comptabilite)
Ajouter `useRef` sur chaque `<View>` de section :
```tsx
const kpiGridRef = useRef<View>(null);
const expensesSectionRef = useRef<View>(null);
const stockLossRef = useRef<View>(null);
const itemsPurchasesRef = useRef<View>(null);
const revenueTrendRef = useRef<View>(null);
const revenueBreakdownRef = useRef<View>(null);
const paymentBreakdownRef = useRef<View>(null);
const perfTableRef = useRef<View>(null);
const recentSalesRef = useRef<View>(null);
```
Puis `ref.current?.measureLayout(scrollViewRef, (x, y) => scrollViewRef.scrollTo({ y }))`.

### Bouton hamburger
Dans le header de `_layout.tsx`, ajouter un bouton menu conditionnel (pas sur settings) :
```tsx
<TouchableOpacity onPress={() => setShowDrawer(true)}>
  <Ionicons name="menu-outline" size={26} color={colors.text} />
</TouchableOpacity>
```
