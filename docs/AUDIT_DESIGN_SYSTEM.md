# Audit du design system Stockman

Date : 23 novembre 2026. Périmètre : application web (`web-app/`, Next.js 16 + Tailwind 4), application mobile (`frontend/`, Expo), site vitrine (`landing-page/`) et vitrines e-commerce (`web-app/src/storefront/`).

Méthode : lecture du code et comptage automatique des classes et des styles réellement utilisés, puis vérification dans le CSS compilé (`.next/`). Aucune capture d'écran n'a été faite : les points visuels marqués « à confirmer » doivent être vérifiés à l'écran.

---

## Avancement

- **Lot 1 fait (23 novembre 2026)** : icônes des cartes de statistiques, chargement d'Inter, textes de `KpiCard` et `Modal` traduits, en-tête de `Modal` aux couleurs du thème.
- **Lot 2 fait (23 novembre 2026)** : jetons `--surface-sunken`, `--surface`, `--surface-raised`, `--surface-outline`, `--success`, `--warning`, `--info` ajoutés et exposés à Tailwind (`bg-surface`, `bg-surface-raised`, `bg-surface-sunken`, `text-success`, `border-line`, etc.). 170 fonds écrits en dur remplacés dans 50 composants. Les règles du mode clair correspondantes ne visent plus que les jetons. Restent volontairement en dur : `#0f0c29` (inscription Enterprise), `#060B14` (scène de l'aperçu de l'éditeur de site) et `#020617` (un encart superadmin).

## Résumé

L'identité de marque est claire et doit être conservée : vert émeraude `#10B981`, fond ardoise sombre, cartes « verre », coins très arrondis, titres en graisse forte, petites étiquettes en capitales espacées. Le problème n'est pas le style, c'est la façon dont il est appliqué : presque tout est écrit à la main, page par page.

Les trois constats qui comptent le plus :

1. **Deux bugs visibles aujourd'hui.** Les icônes des cartes de statistiques sont invisibles sur le tableau de bord web (8 cartes) et sur le tableau de bord superadmin (69 cartes). La police Inter, déclarée pour toute l'application web, n'est jamais chargée.
2. **Le mode clair web repose sur environ 700 lignes de CSS qui réécrivent les classes Tailwind** (`[data-theme="light"] .text-white { … }`). Chaque nouvelle classe sombre écrite dans un composant crée un nouveau trou dans le mode clair.
3. **Il n'existe aucun composant partagé pour le bouton, le champ de saisie ou la carte**, ni sur le web ni sur le mobile. Résultat : 30 variantes de bouton principal sur le web, 304 champs écrits à la main, une quarantaine de définitions de modale sur le mobile.

La bonne nouvelle : les vitrines e-commerce (`storefront/tokens.ts`) ont déjà un vrai système de jetons, avec contraste calculé. C'est le modèle à suivre pour le reste.

---

## 1. Inventaire du design system existant

### 1.1 Couleurs et jetons

| Surface | Où | Primaire | Fond sombre | Remarques |
|---|---|---|---|---|
| Web (tableau de bord) | `app/globals.css` | `#10B981` / `#059669` | `#0F172A` | 20 variables CSS, thème clair via `[data-theme="light"]`, seulement 4 exposées à Tailwind (`primary`, `secondary`, `background`, `foreground`) |
| Mobile | `constants/theme.ts` | `#10B981` (sombre), `#059669` (clair) | `#0F0C29` → `#302B63` (dégradé violet) | `DarkTheme` / `LightTheme` complets, avec `success`, `warning`, `danger`, `info` |
| Site vitrine | `landing-page/src/index.css` | `#007AFF` (bleu) | `#0D0E12` | Palette de type iOS, police Outfit, dégradé bleu-violet-rose |
| Vitrines e-commerce | `storefront/tokens.ts` | couleur du marchand | 3 palettes (clair, crème, sombre) | Vrai système de jetons, contraste WCAG calculé : à garder tel quel |

Sur le web, les jetons existent mais sont peu utilisés :

- `bg-[#0F172A]` écrit en dur **102 fois**, `bg-[#1E293B]` 26 fois, `bg-[#0B1220]` 23 fois, `bg-[#111827]` 14 fois, plus `#1a1f2e`, `#020617`, `#060B14`, `#101826`. Cela fait **8 fonds sombres différents** là où la palette en définit 3 (`--background`, `--background-secondary`, `--card-bg`).
- Le jeton `--danger` existe, mais `success`, `warning` et `info` n'existent pas côté web : les composants utilisent directement `emerald`, `rose`, `red`, `amber`, `sky`, `blue`.
- `--surface-muted`, `--surface-soft`, `--surface-elevated` ne sont définis qu'en mode clair.
- La classe `.theme-input` est définie mais utilisée **0 fois**.

Sur le mobile, 103 fichiers sur 123 utilisent bien `useTheme()`, mais on trouve encore **607 couleurs hexadécimales en dur** (`#10B981` 40 fois, `#F59E0B` 33 fois, `#EF4444` 27 fois, `#3B82F6` 22 fois). Certaines ne changent pas en mode clair, alors que le thème prévoit des variantes plus foncées (`#059669`, `#D97706`, `#DC2626`).

### 1.2 Typographie

| Surface | Police déclarée | Police réellement chargée |
|---|---|---|
| Web | `'Inter', system-ui` dans `body` | **Aucune.** Inter n'est chargé que pour les vitrines (`storefront/fonts.ts`). Le tableau de bord s'affiche en Segoe UI sous Windows et en San Francisco sur Mac. |
| Mobile | aucune | Police système (Roboto, San Francisco) |
| Site vitrine | Outfit | Outfit (Google Fonts) |

Échelle web réellement utilisée : `text-sm` (1 469), `text-xs` (1 147), puis `text-2xl` (129), `text-lg` (127), `text-xl` (110), `text-3xl` (71), `text-base` (71). S'y ajoutent des tailles arbitraires `text-[10px]` et `text-[11px]` pour les étiquettes en capitales. Graisses : `font-black` domine pour les titres et les boutons, `font-bold` ailleurs, sans règle.

Échelle mobile : le jeton `FontSize` (12, 14, 16, 18, 24, 32, 40) est utilisé environ 960 fois, mais il y a aussi environ 700 tailles en dur, dont 9, 10, 11, 13 et 15, qui ne font pas partie de l'échelle. Graisses : `'700'` (593), `'600'` (321), `'800'` (169), `'bold'` (40), `'900'` (21).

### 1.3 Espacements et tailles

- **Web** : échelle Tailwind standard, cohérente dans l'ensemble. Les cartes utilisent surtout `p-4`, `p-5` et `p-6` sans règle claire entre les trois.
- **Mobile** : le jeton `Spacing` (4, 8, 16, 24, 32, 48, avec réduction sur petits écrans) existe, mais les valeurs en dur dominent : `padding: 10` (131 fois), `12` (123), `14` (70), `6` (66). Ces valeurs ne sont pas dans l'échelle et ne profitent pas de la réduction automatique sur petits écrans.

### 1.4 Bordures, rayons et ombres

| | Web | Mobile |
|---|---|---|
| Rayons | `rounded-xl` 876, `rounded-2xl` 551, `rounded-full` 443, `rounded-lg` 239, `rounded-3xl` 108, `rounded-[28px]` 5 | `BorderRadius.md` 229, `8` 77, `12` 70, `20` 42, `16` 35, `10` 33, `18` 32, `14` 27, `22` 18 |
| Ombres | `shadow-lg` 58, `shadow-2xl` 55, `shadow-primary/20` 42, `shadow-sm` 34, une ombre arbitraire dans `KpiCard` | rares |
| Bordures | `border-white/10` presque partout, `glass-border` dans les classes thème | `colors.glassBorder` / `colors.border` |

Le langage est cohérent : coins arrondis à 12 ou 16 px, cartes en 16 à 24 px. Mais sur le mobile, 10, 14, 18, 20 et 22 px coexistent sans raison.

### 1.5 Composants de base

| Composant | Web | Mobile |
|---|---|---|
| Bouton | Classe `.btn-primary` (75 usages dans 26 fichiers) + boutons écrits à la main | Aucun. Styles `primaryButton`, `submitBtn`, `saveBtn`, `confirmBtn`, `actionBtn` redéfinis dans chaque écran |
| Champ de saisie | Aucun. 304 `<input>`, dont 4 fichiers seulement avec une constante `inputClass` locale | `Field` et `InputWrapper` locaux à `register.tsx` |
| Carte | Classe `.glass-card` (310 usages) | Aucun hors admin. `AdminUI.Card` existe mais ne sert qu'à l'écran superadmin |
| Carte de statistique | `StatCard` (1 page), `KpiCard` (7 composants), `StatCard` local dans `AdminDashboard`, et des dizaines de cartes écrites à la main | `AdminUI.StatCard` (admin), `KpiCard` local dans `(tabs)/index.tsx` |
| Modale | `Modal.tsx` utilisé par 23 fichiers ; 24 autres fichiers construisent leur propre fond `fixed inset-0` | `<Modal>` natif dans 50 fichiers, `KeyboardAwareModal` dans 13 ; styles `modalOverlay` / `modalContent` redéfinis une quarantaine de fois |
| État vide | Aucun composant | `EmptyState.tsx` + `AdminUI.EmptyState` (deux versions) |
| Chargement | `Loader2 animate-spin` (160 occurrences), 11 fichiers avec squelettes `animate-pulse` | `ActivityIndicator` (237), `Skeleton.tsx` utilisé dans 3 fichiers |
| Confirmation et message | `alert()` / `confirm()` du navigateur : 120 appels, dont 43 dans `Inventory.tsx` | `Alert.alert` : 410 appels |
| Infobulle | attribut `title=` (194) et 9 infobulles maison en `group-hover` | `KpiInfoButton` |
| Liste déroulante | `<select>` natif (97) et 2 menus maison | sélecteurs en modale |

### 1.6 Navigation et mise en page

- **Web** : `Sidebar.tsx` (835 lignes) fixe sur ordinateur, en tiroir avec fond sombre sur mobile ; navigation de type application à page unique dans `HomeClient.tsx`. Comportement cohérent.
- **Mobile** : onglets Expo Router + `DrawerMenu.tsx`. Cohérent.
- **Gros fichiers** qui mélangent données, logique et affichage : `AdminDashboard.tsx` (5 368 lignes), `Suppliers.tsx` (4 630), `Inventory.tsx` (3 791), `Accounting.tsx` (2 669) côté web ; `products.tsx` (7 389), `suppliers.tsx` (3 780), `orders.tsx` (3 171) côté mobile.

---

## 2. Rapport d'incohérences

Classement par gravité, puis par nombre d'écrans touchés.

### 2.1 Bugs visibles

| # | Problème | Preuve | Écrans touchés |
|---|---|---|---|
| B1 | **Icônes invisibles dans les cartes de statistiques.** `StatCard` et le `StatCard` local de `AdminDashboard` utilisent `bg-opacity-10`, qui n'existe plus dans Tailwind 4. Le CSS compilé contient `.bg-amber-500{background-color:var(--color-amber-500)}` et aucune règle `bg-opacity-10` en mode sombre. La pastille est donc pleine, et l'icône, de la même couleur, disparaît. La surcharge du mode clair (`--tw-bg-opacity`) n'a pas d'effet non plus. | `components/StatCard.tsx:21`, `components/AdminDashboard.tsx:33`, `app/globals.css:857` | Tableau de bord web (8 cartes), tableau de bord superadmin (69 cartes) |
| B2 | **Police Inter jamais chargée** sur le tableau de bord web. L'affichage change selon le système. | `app/globals.css:70`, aucun import dans `app/layout.tsx` | Tout le web |
| B3 | **Textes français en dur et sans accents** dans des composants partagés : « Periode selectionnee », « Voir le detail » (`KpiCard`), « Fermer » (`Modal`). Ils ne sont pas traduits dans les 14 autres langues. | `components/analytics/KpiCard.tsx:39,42`, `components/Modal.tsx:80` | 7 composants analytiques + 23 modales |
| B4 | **En-tête de modale toujours blanc** (`text-white`, `border-white/10`, `bg-white/5`). Il ne s'affiche correctement en mode clair que grâce aux surcharges globales. | `components/Modal.tsx:76-79` | 23 modales |

### 2.2 Incohérences de système

| # | Problème | Preuve | Étendue |
|---|---|---|---|
| I1 | **Mode clair par surcharge globale.** Environ 700 lignes `[data-theme="light"] .classe-tailwind` avec `!important`. `Planner.tsx`, écrit en clair d'abord (`bg-white`), a besoin de sa propre inversion pour le mode sombre (`.planner-shell`, 25 règles). Toute nouvelle couleur écrite dans un composant peut casser le mode clair sans que personne ne le voie. | `app/globals.css:222-1064` | Tout le web |
| I2 | **8 fonds sombres différents** au lieu de 3 jetons. | 102 × `bg-[#0F172A]`, 26 × `#1E293B`, 23 × `#0B1220`, 14 × `#111827`, etc. | Une trentaine de composants web |
| I3 | **30 variantes de bouton principal** pour 49 boutons « vert plein » analysés : `px-3 py-1.5`, `px-4 py-2`, `px-4 py-2.5`, `px-5 py-3`, `px-6 py-3`, `h-12` ; `rounded-lg`, `rounded-xl` ou `rounded-2xl` ; `font-bold` ou `font-black`. `.btn-primary` existe mais remonte de 2 px au survol, contrairement aux boutons écrits à la main. | analyse de `components/` | Toutes les pages web avec actions |
| I4 | **Champs de saisie hétérogènes** : `rounded-lg`, `rounded-xl` ou `rounded-2xl` ; `p-3`, `p-4`, `px-3 py-2` ou `px-4 py-3` ; fond `bg-white/5` ou `bg-[#0F172A]`. | 304 `<input>` | Tous les formulaires web |
| I5 | **Trois cartes de statistiques différentes** sur le web pour la même fonction : `StatCard` (étiquette sous la valeur, pastille colorée, zoom au survol), `KpiCard` (étiquette au-dessus, pastille toujours verte, cliquable) et le `StatCard` local d'`AdminDashboard` (étiquette en haut, valeur en `text-3xl`). D'autres pages, comme `Suppliers.tsx`, en construisent à la main. | voir 1.5 | Dashboard, Accounting, CRM, Analytics, Multi-boutiques, StockHistory, Suppliers, Admin |
| I6 | **Fond de modale incohérent** : `Modal.tsx` utilise `bg-black/60 backdrop-blur-sm` ; les 24 fichiers qui font leur propre modale choisissent leur opacité, leur flou, leur `z-index` (`z-40`, `z-50`), leur rayon et leur gestion de la touche Échap (6 fichiers seulement la gèrent). Seules 7 modales déclarent `role="dialog"`. | `fixed inset-0` dans 24 fichiers hors `Modal` | ChatModal, LineDiscountModal, ChangeCalculatorModal, BatchScanModal, EnterpriseSignupModal, AnalyticsKpiDetailsModal, StockChangeReason, Planner, etc. |
| I7 | **Fond mobile violet, fond web ardoise.** Mobile `#0F0C29` → `#302B63`, web `#0F172A`. Même marque, deux ambiances. | `frontend/constants/theme.ts:8-11` | Toute l'app mobile |
| I8 | **Site vitrine sur une autre identité** : primaire bleu `#007AFF`, police Outfit, dégradé bleu-violet-rose, alors que le produit est vert émeraude. | `landing-page/src/index.css` | Tout le site vitrine |
| I9 | **Couleurs d'état en dur sur le mobile** qui ignorent le mode clair (`#10B981`, `#F59E0B`, `#EF4444` en dur, alors que le thème clair prévoit `#059669`, `#D97706`, `#DC2626`). Plus des couleurs hors marque : `#FF9800`, `#4CAF50` (Material), `#2563EB`. | 607 hexadécimaux | Une centaine d'écrans et de composants |
| I10 | **Échelle typographique mobile non respectée** : environ 700 tailles en dur, dont 9, 10, 11, 13 et 15 hors échelle, qui ne bénéficient pas de la réduction sur petits écrans. | voir 1.2 | Tout le mobile |

### 2.3 Points à vérifier à l'écran

- Alignement icône et texte dans les boutons : la taille des icônes varie entre 14, 16, 18 et 24 px pour des boutons de même hauteur.
- Animations de survol hétérogènes : `hover:scale-105`, `scale-110`, `scale-125`, `scale-[1.02]`, `-translate-y-2px` (`.btn-primary`).
- Cartes `StatCard` avec `animate-in … duration-1000` : animation d'une seconde à chaque affichage du tableau de bord.

---

## 3. Composants dupliqués

| Doublon | Fichiers | Recommandation |
|---|---|---|
| Carte de statistique (web) | `StatCard.tsx`, `analytics/KpiCard.tsx`, `StatCard` local dans `AdminDashboard.tsx:28`, cartes à la main | **Fusionner** en un seul `KpiCard` avec options `tone` (couleur de pastille), `delta`, `hint` et `onClick` |
| Carte de statistique (mobile) | `AdminUI.StatCard`, `KpiCard` local dans `(tabs)/index.tsx:94` | **Fusionner** dans `components/ui/` |
| État vide (mobile) | `components/EmptyState.tsx`, `AdminUI.EmptyState` | **Garder** `EmptyState.tsx` (plus complet : titre, message, action), supprimer la version admin |
| Champ avec étiquette (web) | `Field` dans `ProductionView.tsx:29`, `ProjectView.tsx:43`, `SettingsWorkspace.tsx:160` ; `Input` dans `EcommercePaymentSettings.tsx:36` | **Fusionner** en un seul `Field` |
| Constante `inputClass` (web) | `SettingsWorkspace.tsx`, `ThemeFieldInput.tsx`, `EcommercePaymentSettings.tsx` (identiques), `EnterpriseSignupModal.tsx` (différente) | **Remplacer** par une classe `.ui-input` partagée |
| Carte de section | `SectionCard` dans `SettingsWorkspace.tsx:130` et `admin/AdminStoreOverviewPanel.tsx:128` | **Fusionner** |
| Modale (web) | `Modal.tsx` + 24 implémentations à la main | **Étendre** `Modal` (pied de page, largeur, plein écran mobile), puis migrer au fil de l'eau |
| Modale (mobile) | une quarantaine de styles `modalOverlay` / `modalContent` | **Généraliser** `KeyboardAwareModal` ou créer un `Sheet` partagé |
| Bouton (mobile) | `primaryButton` (9 définitions), `submitBtn` (5), `saveBtn` (3), `confirmBtn` (4), `actionBtn` (8), `secondaryButton` (7) | **Créer** un `Button` partagé |

**À ne pas fusionner**, car le comportement est réellement différent :

- **Composants web / mobile portant le même nom** (`BulkImportModal`, `ScreenGuide`, `BarcodeScanner`, `ChangeCalculatorModal`, etc.) : plateformes différentes, ils doivent rester séparés. Seule la logique pure, déjà dans `utils/` et `lib/`, est à partager.
- **Les vitrines e-commerce** : système de jetons propre, piloté par le marchand. Ne pas les aligner sur le thème du tableau de bord.
- **Le POS** (`POS.tsx`, `pos.tsx`) : boutons plus grands et zones tactiles larges, c'est voulu pour l'usage en caisse.
- **`KitchenDisplay`** : affichage écran de cuisine, contraste et tailles spécifiques.
- **Les fenêtres natives de confirmation sur mobile** (`Alert.alert`) : elles restent appropriées pour les confirmations simples. Seuls les messages de succès et d'erreur non bloquants gagneraient à passer par un toast.

---

## 4. Structure de jetons recommandée

Principe : **garder les valeurs actuelles**, leur donner un nom, et les exposer à Tailwind pour que les composants n'écrivent plus de couleurs en dur. Aucune nouvelle bibliothèque.

### 4.1 Web (`app/globals.css`)

```css
:root {
  /* Marque (inchangée) */
  --primary: #10B981;
  --primary-dark: #059669;
  --secondary: #F59E0B;

  /* Surfaces : 3 niveaux au lieu de 8 valeurs en dur */
  --background: #0F172A;            /* fond de page */
  --surface: #111827;               /* cartes pleines, menus */
  --surface-raised: #1E293B;        /* modales, listes déroulantes */
  --glass: rgba(255,255,255,.05);
  --glass-border: rgba(255,255,255,.1);

  /* Texte */
  --foreground: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;

  /* États (nouveaux noms, valeurs déjà utilisées) */
  --success: #10B981;  --warning: #F59E0B;  --danger: #EF4444;  --info: #0EA5E9;

  /* Formes */
  --radius-control: 0.75rem;  /* boutons, champs : rounded-xl */
  --radius-card: 1rem;        /* cartes : rounded-2xl */
  --radius-panel: 1.5rem;     /* grands panneaux, modales : rounded-3xl */
}
[data-theme="light"] { /* mêmes noms, valeurs claires existantes */ }

@theme inline {
  --color-primary: var(--primary);
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-muted: var(--text-muted);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-info: var(--info);
  --color-line: var(--glass-border);
  --font-sans: var(--font-inter), system-ui, sans-serif;
}
```

Gain : `bg-surface`, `text-muted`, `border-line` ou `text-danger` changent automatiquement avec le thème. Les surcharges du mode clair deviennent inutiles pour tout composant migré, et on pourra les supprimer progressivement.

### 4.2 Mobile (`constants/theme.ts`)

- Garder `DarkTheme` et `LightTheme`.
- Supprimer `GlassStyle` et l'export `Colors` (figés sur le thème sombre, 0 usage aujourd'hui) pour éviter qu'ils soient réutilisés par erreur.
- Ajouter `FontSize.xxs = scaleSize(10)` et `FontSize.xs2 = scaleSize(13)` pour couvrir les tailles réellement nécessaires, plutôt que de laisser 9, 10, 11, 13 et 15 en dur.
- Ajouter `BorderRadius.control = 12` et `BorderRadius.card = 16`, puis converger les 10, 14, 18, 20 et 22 vers l'échelle.
- Ajouter une palette `accent` pour les couleurs secondaires (bleu, violet) utilisées dans les graphiques, avec leurs variantes claires.

### 4.3 Décision qui vous revient

Fond mobile violet (`#0F0C29` / `#302B63`) contre fond web ardoise (`#0F172A`), et site vitrine bleu contre produit vert : ce sont des choix d'identité. **Je ne recommande pas de les changer sans votre accord.** Si vous voulez une seule ambiance, la moins risquée est d'aligner le mobile sur l'ardoise du web (une seule valeur à changer dans `theme.ts`), puis de décider séparément pour le site vitrine.

---

## 5. Plan d'amélioration des composants partagés

Chaque composant est petit, sans dépendance nouvelle, et adopté page par page.

### Web : `web-app/src/components/ui/`

| Composant | Contenu | Remplace | Portée |
|---|---|---|---|
| `Button` | `variant` : `primary`, `secondary`, `ghost`, `danger` ; `size` : `sm` (h-9), `md` (h-11), `lg` (h-12) ; `loading` (icône qui tourne, bouton désactivé, largeur conservée) ; `icon` | `.btn-primary` + 30 variantes | Une quarantaine de fichiers |
| `Input`, `Select`, `Textarea` et `Field` | étiquette, aide, message d'erreur, `aria-invalid`, focus visible | 304 champs + 4 `Field` locaux | Tous les formulaires |
| `KpiCard` (fusion) | `tone`, `delta`, `hint`, `onClick`, textes traduits | `StatCard`, `KpiCard`, `StatCard` admin | 9 composants |
| `Modal` (étendu) | `footer`, `size`, textes traduits, couleurs par jetons, piège du focus, retour du focus à la fermeture | 24 modales maison, à migrer au fil de l'eau | 47 fichiers à terme |
| `EmptyState` | icône, titre, message, action | une soixantaine de messages « Aucun… » écrits à la main | Toutes les listes |
| `ConfirmDialog` + `useConfirm()` | remplace `window.confirm` par une modale aux couleurs de Stockman, traduite | 120 `alert()` / `confirm()` | `Inventory` (43), `Suppliers`, `Orders`… |

Les props restent simples et explicites. Pas de système de composition générique : quatre variantes de bouton suffisent.

### Mobile : `frontend/components/ui/`

| Composant | Remplace | Portée |
|---|---|---|
| `Button` (variantes, `loading`, `disabled`, hauteur minimale de 44 px, `accessibilityRole`) | une quarantaine de styles de bouton locaux | Tous les écrans |
| `Card` | sortir `AdminUI.Card` du dossier admin | Tous les écrans |
| `KpiCard` | `AdminUI.StatCard` + `KpiCard` de `index.tsx` | Accueil, admin, compta |
| `EmptyState` (unique) | 2 versions | Toutes les listes |
| `Sheet` / `ModalShell` | une quarantaine de couples `modalOverlay` / `modalContent` | 50 fichiers à terme |

---

## 6. Feuille de route priorisée

Chaque lot est livrable seul, vérifiable, et ne touche pas au comportement.

| Lot | Contenu | Pourquoi | Étendue | Effort |
|---|---|---|---|---|
| **1. Corrections visibles** | B1 (remplacer `${color} bg-opacity-10` par une teinte à 10 % qui fonctionne dans les deux thèmes), B2 (charger Inter via `next/font` dans `layout.tsx`), B3 et B4 (textes traduits, couleurs par jetons dans `Modal` et `KpiCard`) | Bugs visibles sur les deux tableaux de bord principaux | 3 fichiers, 2 tableaux de bord, 23 modales, 7 vues analytiques | Faible |
| **2. Jetons web** | Ajouter `surface`, `success`, `warning`, `info`, `line`, `radius-*` et `--font-sans` dans `@theme` ; remplacer les 165 `bg-[#0F172A]` / `#1E293B` / `#0B1220` / `#111827` par `bg-background`, `bg-surface` ou `bg-surface-raised` | Une seule source de vérité ; chaque composant migré n'a plus besoin des surcharges du mode clair | Une trentaine de fichiers, remplacement mécanique | Faible |
| **3. `Button` + `Input` / `Field` web** | Créer les composants et migrer d'abord les formulaires les plus utilisés (produit, client, fournisseur, réglages) | Le plus grand nombre d'incohérences visibles (30 variantes, 304 champs) ; focus et chargement uniformes | La plupart des pages | Moyen, progressif |
| **4. `KpiCard` unique + `EmptyState` web** | Fusion des trois cartes, état vide commun | Même information, même présentation sur tous les tableaux de bord | 9 composants + listes | Faible |
| **5. Modales et confirmations web** | Étendre `Modal`, migrer les 24 modales maison, remplacer `confirm()` par `useConfirm()` | Accessibilité (Échap, focus, `role="dialog"`), cohérence visuelle, traduction | 24 + 15 fichiers | Moyen |
| **6. Réduction des surcharges du mode clair** | Supprimer les règles `[data-theme="light"] .x` devenues inutiles après les lots 2 à 5, en commençant par `.planner-shell` (passer `Planner.tsx` aux jetons) | Fin des régressions silencieuses du mode clair | `globals.css` + `Planner.tsx` | Moyen |
| **7. Mobile : `Button`, `Card`, `EmptyState`, `KpiCard`** | Composants partagés, migration écran par écran, en commençant par les gros écrans (`products`, `orders`, `pos`) | Une quarantaine de styles de bouton différents | Tous les écrans | Moyen, progressif |
| **8. Mobile : couleurs et tailles en dur** | Remplacer les 607 hexadécimaux par `colors.*`, converger les tailles et rayons vers l'échelle | Le mode clair et la réduction sur petits écrans fonctionnent partout | Une centaine de fichiers | Moyen, mécanique |
| **9. Décisions d'identité** | Fond mobile, site vitrine | Seulement si vous le décidez | Mobile, site vitrine | Selon décision |

**Hors périmètre volontairement** : découper `AdminDashboard.tsx`, `Suppliers.tsx`, `Inventory.tsx` et `products.tsx`. C'est souhaitable pour la maintenance, mais c'est un chantier d'architecture distinct. Le faire en même temps qu'une harmonisation visuelle multiplierait les risques de régression.

---

## 7. Liste de contrôle de non-régression visuelle

À passer après chaque lot, **en mode sombre et en mode clair**, sur ordinateur (1 440 px) et sur mobile (375 px), en français et en arabe (sens de lecture de droite à gauche).

### Web
- [ ] Tableau de bord : les 8 cartes de statistiques affichent leur icône, leur valeur et leur tendance.
- [ ] Superadmin : les cartes de statistiques affichent leur icône dans chaque onglet.
- [ ] Police : le texte est en Inter (vérifier dans l'inspecteur, propriété `font-family` calculée).
- [ ] Barre latérale : élément actif, survol, tiroir mobile qui s'ouvre et se ferme, fond sombre qui ferme au clic.
- [ ] Boutons principaux : même hauteur dans une même zone ; survol, focus au clavier (Tab), clic, désactivé, en chargement sans changement de largeur.
- [ ] Formulaires (produit, client, fournisseur, réglages) : focus visible, message d'erreur sous le champ, champ désactivé lisible, liste déroulante lisible dans les deux thèmes.
- [ ] Modales : ouverture, fermeture par la croix, par Échap et par clic sur le fond ; défilement interne ; titre lisible en mode clair ; focus rendu au bouton d'origine.
- [ ] Confirmations : suppression d'un produit, d'un client, d'une commande ; annulation sans effet.
- [ ] Listes vides : produits, clients, commandes, fournisseurs, alertes.
- [ ] Chargement : squelettes ou indicateur visibles, pas de saut de mise en page à l'arrivée des données.
- [ ] Analytique, comptabilité, CRM, multi-boutiques : cartes KPI cliquables, détail qui s'ouvre, variation positive en vert et négative en rouge.
- [ ] Planificateur : lisible dans les deux thèmes.
- [ ] Caisse (POS) : grands boutons inchangés, panier, suggestions.
- [ ] Vitrines e-commerce : **aucun changement attendu** (contrôle de non-impact).

### Mobile
- [ ] Accueil : cartes KPI, bouton d'information, réglages du tableau de bord.
- [ ] Produits, commandes, caisse, clients, fournisseurs, comptabilité : boutons principaux et secondaires, états désactivés et en chargement.
- [ ] Modales et feuilles : ouverture, fermeture, clavier qui ne masque pas les champs (Android et iOS).
- [ ] Mode clair : aucune couleur d'état trop pâle sur fond blanc.
- [ ] Petit écran (360 px) : pas de texte coupé, tailles réduites appliquées.
- [ ] Zones tactiles : au moins 44 px pour les boutons principaux.

### Automatisation conseillée (sans nouvelle bibliothèque d'interface)
- Captures de référence des écrans ci-dessus avant chaque lot, puis comparaison après le lot.
- Contrôle simple dans la revue : refuser tout nouveau `bg-[#…]` ou `bg-opacity-*` dans `web-app/src/components` (une recherche dans le code suffit).
