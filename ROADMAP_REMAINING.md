# Roadmap — Travaux Restants

## Contexte Architecture
- **Backend** : FastAPI + MongoDB, partagé mobile et web
- **Web** : Next.js — back-office avancé (plan Enterprise uniquement)
- **Mobile** : Expo/React Native — UNE SEULE application pour tous les plans, features gated par plan
- **Plans** : Starter (mobile full, 1 user, 1 boutique) | Pro (mobile full, 5 users, 2 boutiques) | Enterprise (web + mobile avancé)

---

## 🏗️ Décisions Architecturales Clés

### Une seule application mobile pour tous les plans
- **Starter et Pro** = accès complet à **toutes** les features mobiles actuelles (y compris ce qui est actuellement derrière `PremiumGate`)
- **Enterprise** = mobile Starter/Pro **+** features avancées liées au web (emplacements, terminaux, rapport journalier)
- **Pas d'accès web** pour Starter et Pro — le web est exclusif Enterprise
- **PremiumGate à refactoriser** : ce qui était `plan === 'premium'` devient `plan !== 'starter'` (c'est-à-dire Pro ET Enterprise). Les nouvelles features Enterprise mobile auront leur propre gate `plan === 'enterprise'`

### Mapping plans actuels → nouveaux plans
| Plan actuel (backend) | Nouveau plan | Accès |
|----------------------|-------------|-------|
| `trial` | `trial` | Mobile limité (durée limitée) |
| `premium` | `starter` ou `pro` | Mobile complet |
| *(nouveau)* | `enterprise` | Web + Mobile avancé |

### Accès web
- `plan === 'enterprise'` → accès complet au web app
- `plan === 'starter'` ou `plan === 'pro'` → **pas d'accès web** (guard frontend + backend)
- Le guard web actuel à implémenter : si `user.plan !== 'enterprise'`, rediriger vers page upgrade

---

## ✅ Phases Terminées

### Phase 1 — Fondations Sécurité
- [x] Templates de rôles dans Staff.tsx (5 presets)
- [x] Devise configurable (`PUT /auth/profile` + select Settings)
- [x] Enforcement permissions (`require_permission`) sur 17 routes backend
- [x] Audit logs (`log_activity`) sur actions clés

### Phase 2 — POS Complet (Web)
- [x] Remise (% ou montant fixe) — validée server-side
- [x] Paiement partagé (split payment) — validé server-side
- [x] Reçu personnalisé (nom établissement, message pied de reçu)
- [x] Multi-caisses / terminaux — config Settings + sélecteur POS
- [x] Retour sur dernière vente (OrderReturnModal)

### Phase 3 — Multi-emplacements Stock (Web)
- [x] Modèle `Location` + CRUD routes `/locations`
- [x] `location_id` sur Product, Batch (optionnel, rétrocompatible mobile)
- [x] Filtre par emplacement dans Inventory.tsx (chips)
- [x] Badge emplacement sur produit dans la liste
- [x] Champ emplacement dans formulaire produit
- [x] Section "Emplacements du Stock" dans Settings.tsx

### Phase 5 — Gestion Équipe (Web + Backend)
- [x] 6e module de permission `staff` (none/read/write)
- [x] Délégation : staff avec `staff:write` peut gérer l'équipe
- [x] Anti-escalade : impossible de créer un autre manager
- [x] Sidebar web respecte les permissions

---

## ✅ Phase 4 — Finance & Comptabilité Avancée (Web)
- [x] Fix bug : graphe `daily_stats` → `daily_revenue` (graphe fonctionnel)
- [x] Sélecteur de plage de dates custom (date range picker avec bouton calendrier)
- [x] Table performance produits (top 8 par revenus, marge colorée)
- [x] PUT /expenses/{id} backend + édition dépense (bouton crayon au hover)
- [x] Affichage valeur stock coût + valeur stock vente (2 cartes dédiées)
- [x] Panel droit avec 4 onglets : P&L, Paiements, Pertes, Répartition charges
- [x] `expenses.update()` ajouté dans api.ts

---

## ✅ Phase 6 — CRM & Marketing Avancé (Web)
- [x] Segmentation clients : filter chips par tier (Bronze/Silver/Gold/All)
- [x] Tri clients : par nom, dette, panier moyen, dernière visite
- [x] Tableau de bord CRM : métriques panier moyen + clients inactifs +30j
- [x] Historique complet par client : onglet Achats avec timeline des ventes
- [x] Anniversaires clients : bannière automatique (7 jours à venir)
- [x] Export liste clients CSV (filtres actifs appliqués)
- [x] `api.ts` : `sortBy`, `getSales()`, `getBirthdays()` ajoutés

---

## ✅ Phase 7 — Multi-Boutiques (Web + Backend)
- [x] `MultiStoreDashboard.tsx` — Vue consolidée : KPI totaux + tableau comparatif par boutique
- [x] `GET /stores/consolidated-stats` — Revenus, ventes, produits, stock bas agrégés par boutique
- [x] `POST /stock/transfer` — Transfert de stock entre boutiques (déduit source, crédite destination)
- [x] Bouton transfert dans Inventory.tsx (visible uniquement si ≥2 boutiques)
- [x] `PUT /stores/{store_id}` — Edition paramètres par boutique (nom, adresse, devise, reçu)
- [x] Section "Paramètres par Boutique" dans Settings.tsx (accordéon par boutique)
- [x] Entrée "Multi-Boutiques" dans Sidebar (shopkeeper + admin)
- [x] `Store` model enrichi : currency, receipt_business_name, receipt_footer, terminals
- [x] Paramètres par boutique : terminaux (ajout/suppression par boutique dans Settings.tsx)
- [ ] Gestion des accès staff par boutique (architecturalement complexe, reporté)

---

## 📋 Phases Restantes

---

## 🔧 Phase 8 — Plan Tarifaire

### Règles métier
| Plan | App mobile | App web | Boutiques | Users | PremiumGate mobile |
|------|-----------|---------|-----------|-------|--------------------|
| `starter` | ✅ Complète | ❌ | 1 | 1 | Débloqué |
| `pro` | ✅ Complète | ❌ | 2 | 5 | Débloqué |
| `enterprise` | ✅ Complète + Avancé | ✅ | Illimité | Illimité | Débloqué + features Enterprise |

### Implémentation Backend
- [x] Champ `plan` commente désormais : `'starter'` / `'pro'` / `'enterprise'` (legacy `'premium'` conservé)
- [x] Middleware boutiques : `POST /stores` limité — starter: 1, pro: 2, enterprise: illimité
- [x] Middleware users : `POST /sub-users` limité — starter: 1, pro: 5, enterprise: illimité
- [x] `check_ai_limit` : pro + enterprise = illimité (comme premium)
- [ ] Webhook RevenueCat : mapper product IDs → `starter` / `pro` / `enterprise` (nécessite les IDs RevenueCat)
- [x] Migration users existants : `plan: 'premium'` → `'starter'` ou `'pro'` selon usage (`migrate_premium_plans.py`)

### Implémentation Frontend Web
- [x] Guard au login : si `plan` ∉ `['enterprise', 'premium']` → page "Accès Enterprise requis" avec liste features + lien pricing
- [ ] Page pricing sur landing-page (déjà partiellement là, à compléter)

### Implémentation Frontend Mobile
- [x] `isLocked` mis à jour dans `accounting.tsx`, `crm.tsx`, `orders.tsx`, `suppliers.tsx` : `['starter', 'pro', 'enterprise']` uniquement, `premium` supprimé
- [x] `EnterpriseGate` (nouveau composant) pour les features avancées mobile : `locked = plan !== 'enterprise'`
- [x] Afficher badge plan correct dans écran Subscription (Starter / Pro / Enterprise)

---

## 🔮 Phase 9 — Améliorations Mobile Enterprise
*UNE seule app mobile. Ces features sont gated `plan === 'enterprise'`.*
*Prérequis : Phase 8 (Plan Tarifaire) terminée.*

### ✅ Tâche 1 — Gestion gracieuse des 403 ⭐ Facile
- [x] Dans `rawRequest()`, intercepter HTTP 403 → throw `ApiError('Accès refusé...', 403)`
- [x] Composant `AccessDenied` (icône + message + bouton retour + bouton retry)
- [x] Appliqué dans `products.tsx`, `accounting.tsx`, `crm.tsx`, `orders.tsx`

### ✅ Tâche 2 — Affichage emplacement produit (lecture seule) ⭐ Facile
- [x] `locations.list()` + type `Location` ajoutés dans `api.ts`
- [x] `location_id` ajouté sur le type `Product`
- [x] Chargement en parallèle dans `products.tsx` si plan enterprise
- [x] Badge `📍 Nom` sur la card produit si `location_id` défini
- [x] Gated : `plan === 'enterprise'`

### ✅ Tâche 3 — Terminal sélectionnable au démarrage POS ⭐⭐ Moyenne
**Fichiers** : `frontend/app/(tabs)/pos.tsx`
- Au chargement POS : lire `settings.terminals` (API existante)
- Si `terminals.length > 1` ET `plan === 'enterprise'` → modal de sélection terminal avant accès caisse
- Terminal sélectionné stocké en state, envoyé dans chaque `SaleCreate` (`terminal_id`)
- Afficher le terminal actif dans le header POS
- Infrastructure backend déjà prête (`terminal_id` dans `SaleCreate`)

### ✅ Tâche 4 — Rapport journalier simplifié ⭐⭐ Moyenne
- [x] Section "Rapport du Jour" sur le dashboard si `plan === 'enterprise'`
- [x] Backend : `yesterday_revenue`, `yesterday_sales_count`, `top_selling_today` ajoutés à `GET /dashboard`
- [x] CA du jour vs hier (delta % affiché)
- [x] Nb ventes vs hier (delta absolu)
- [x] Top 3 produits du jour (agrégation MongoDB)
- [x] Bouton "Partager" → `Share.share()` Expo (résumé texte formaté)
- [x] Visible aussi pour staff avec `accounting:read`
- [x] i18n : 14 langues (fr, en, ar, de, es, ff, hi, it, pl, pt, ro, ru, tr, wo, zh)

### ✅ Tâche 5 — Push notifications alertes stock bas ⭐⭐⭐ Haute
**Fichiers** : `backend/server.py`, `frontend/hooks/useNotifications.ts`
- Backend : dans `check_and_create_alerts()`, après création alerte stock bas → appel Expo Push API avec tokens du propriétaire
- Mobile : dans `useNotifications`, gérer tap sur notif → naviguer vers tab `products` avec filtre "stock bas" activé
- Infrastructure tokens déjà en place (`/notifications/register-token`)
- Plans : Pro + Enterprise (pertinent sans le web)

### Ordre recommandé
1. Tâche 1 — 403 gracieux (tous plans, sans prérequis Phase 8)
2. Tâche 2 — Emplacements lecture seule (Enterprise)
3. Tâche 3 — Terminal POS (Enterprise)
4. Tâche 4 — Rapport journalier (Enterprise)
5. Tâche 5 — Push notifs stock bas (Pro + Enterprise)

---

## ✅ Phase IA — Améliorations Intelligentes (Tous plans)
- [x] **Accounting.tsx** : P&L auto-analysis (Gemini, auto-load) + Rapport mensuel IA (modal markdown + download)
- [x] **CRM.tsx** : Churn prediction auto-load (banner violet, liste clients à risque)
- [x] **Alerts.tsx** : Détection anomalies auto-load au montage (affichage si ≥1 anomalie)
- [x] **Inventory.tsx** : Bouton "IA Réappro" → conseil réapprovisionnement (banner violet, priority_count)
- [x] Backend : 3 nouveaux endpoints `/ai/pl-analysis`, `/ai/churn-prediction`, `/ai/monthly-report`
- [x] `api.ts` web : 4 méthodes AI ajoutées (plAnalysis, churnPrediction, monthlyReport, replenishmentAdvice)
- [x] **AiSupportModal** (mobile) : Chatbot IA support + dictée vocale (expo-audio)

---

## 🤖 Phase IA Enterprise — Intelligence Artificielle Avancée
*Toutes ces features sont gated `plan === 'enterprise'`. Backend : vérifier le plan avant chaque endpoint IA Enterprise.*

### Catalogue & Saisie

**Saisie produit par photo**
- [ ] Web : `web-app/src/components/Inventory.tsx` — Bouton "Photo IA" dans formulaire création/édition → upload image → pré-remplissage champs
- [ ] Mobile : `frontend/app/(tabs)/products.tsx` — Bouton caméra dans modal ajout → `expo-camera` capture → pré-remplissage
- [ ] Backend : `POST /ai/scan-product` — Vision Gemini : extraction nom, catégorie, prix estimé, code-barre
- [ ] API : `ai.scanProduct(image)` dans `web-app/src/services/api.ts` + `frontend/services/api.ts`

**Détection de doublons produits/fournisseurs**
- [ ] Web : `web-app/src/components/Inventory.tsx` — Banner "X doublons détectés" + modal fusion
- [ ] Web : `web-app/src/components/Suppliers.tsx` — Idem pour fournisseurs
- [ ] Mobile : `frontend/app/(tabs)/products.tsx` — Banner doublons + action fusionner
- [ ] Mobile : `frontend/app/(tabs)/suppliers.tsx` — Idem
- [ ] Backend : `POST /ai/detect-duplicates?type=products|suppliers` — Analyse similarité textuelle

### Ventes & Prévisions

**Prévision de ventes**
- [ ] Web : `web-app/src/components/Dashboard.tsx` — Carte "Prévision CA" avec projection J+7/J+30
- [ ] Web : `web-app/src/components/Inventory.tsx` — Colonne "Ventes prévues J+7" dans tableau produits
- [ ] Mobile : `frontend/app/(tabs)/index.tsx` — Carte prévision sur dashboard
- [ ] Mobile : `frontend/components/ForecastCard.tsx` — Enrichir avec données IA
- [ ] Backend : `POST /ai/sales-forecast` — Modèle saisonnalité + vélocité → projection

**Caisse Intelligente Vocale (Voice POS)**
- [ ] Web : `web-app/src/components/POS.tsx` — Bouton micro dans barre recherche → voice → matching produits → ajout panier
- [ ] Mobile : `frontend/app/(tabs)/pos.tsx` — Bouton micro (infra `expo-audio` déjà en place) → matching catalogue
- [ ] Backend : `POST /ai/voice-to-cart` — `voiceToText` existant + nouveau matching produits catalogue

**Recherche en langage naturel**
- [ ] Web : `web-app/src/components/Inventory.tsx` — Barre de recherche intelligente : si pas un nom exact → envoi à l'IA
- [ ] Web : `web-app/src/components/Accounting.tsx` — Idem pour requêtes financières
- [ ] Mobile : `frontend/app/(tabs)/products.tsx` — Barre de recherche avec mode IA
- [ ] Backend : `POST /ai/natural-query` — Parse langage naturel → requête MongoDB → résultats

### Finance & Comptabilité

**Catégorisation automatique des dépenses**
- [ ] Web : `web-app/src/components/Accounting.tsx` — Auto-suggest catégorie dès saisie de la description dans formulaire dépense
- [ ] Mobile : `frontend/app/(tabs)/accounting.tsx` — Auto-catégorisation au blur du champ description
- [ ] Backend : `POST /ai/categorize-expense` — Input: description texte → Output: catégorie suggérée

**Score de santé business**
- [ ] Web : `web-app/src/components/Dashboard.tsx` — Nouvelle carte en haut : jauge 0-100 colorée + détail au clic (marge, rotation, dettes, tendance)
- [ ] Mobile : `frontend/app/(tabs)/index.tsx` — Carte score santé au-dessus des KPIs existants
- [ ] Backend : `GET /ai/business-health-score` — Composite : marge brute + rotation stock + dette clients + tendance CA → score 0-100

**Tableau de bord prédictif**
- [ ] Web : `web-app/src/components/Dashboard.tsx` — Ligne pointillée de projection sur le graphe CA + label "CA estimé fin de mois"
- [ ] Mobile : `frontend/app/(tabs)/index.tsx` — Carte "Projection mensuelle" avec delta vs mois dernier
- [ ] Backend : `GET /ai/dashboard-prediction` — Projection CA mensuel basée sur tendance + saisonnalité

### Stock & Approvisionnement

**Commandes Fournisseurs "Zéro Clic"**
- [ ] Web : `web-app/src/components/Orders.tsx` — Bouton "IA : Générer commandes" → liste brouillons pré-remplis → validation 1 clic
- [ ] Mobile : `frontend/app/(tabs)/orders.tsx` — Idem, bouton génération auto
- [ ] Backend : `POST /ai/auto-draft-orders` — Analyse vélocité + stock actuel + délais fournisseurs → brouillons

**Meilleur jour pour commander**
- [ ] Web : `web-app/src/components/Suppliers.tsx` — Encart "Jour optimal de commande" sur fiche fournisseur
- [ ] Mobile : `frontend/app/(tabs)/suppliers.tsx` — Badge IA avec jour recommandé sur chaque fournisseur
- [ ] Backend : `GET /ai/optimal-order-day/{supplier_id}` — Analyse cycles vente + délais livraison

**Détection de saisonnalité**
- [ ] Web : `web-app/src/components/Inventory.tsx` — Badge saisonnier sur produits + banner "Saison haute dans X semaines"
- [ ] Web : `web-app/src/components/Dashboard.tsx` — Alerte saisonnière
- [ ] Mobile : `frontend/app/(tabs)/products.tsx` — Badge saisonnier
- [ ] Backend : `GET /ai/seasonality-alerts` — Détection patterns cycliques sur 3-12 mois

**Produits à déstocker**
- [ ] Web : `web-app/src/components/Inventory.tsx` — Onglet/filtre "À déstocker" avec liste IA + valeur immobilisée + suggestions (promo, retour)
- [ ] Mobile : `frontend/app/(tabs)/products.tsx` — Filtre "Dormants" avec badge valeur bloquée
- [ ] Backend : `GET /ai/deadstock-analysis` — Produits sans vente > N jours + valeur stock immobilisé

**Estimation vol/perte (démarque inconnue)**
- [ ] Web : `web-app/src/components/InventoryCounting.tsx` — Après soumission comptage, afficher analyse IA des écarts
- [ ] Web : `web-app/src/components/Inventory.tsx` — Section "Démarque inconnue" avec tableau écarts suspects
- [ ] Mobile : `frontend/app/inventory/batch-scan.tsx` — Après scan inventaire, résumé écarts IA
- [ ] Backend : `POST /ai/shrinkage-analysis` — Comparaison stock théorique vs physique → produits suspects

### Fournisseurs

**Notation fournisseur automatique**
- [ ] Web : `web-app/src/components/Suppliers.tsx` — Score X/100 sur chaque carte fournisseur + détail au clic (délais, écarts, prix)
- [ ] Mobile : `frontend/app/(tabs)/suppliers.tsx` — Badge score sur chaque fournisseur dans la liste
- [ ] Backend : `GET /ai/supplier-rating/{supplier_id}` — Score basé sur historique : respect délais, écarts quantité, stabilité prix

### CRM & Clients

**Résumé client IA**
- [ ] Web : `web-app/src/components/CRM.tsx` — Bouton "Résumé IA" sur fiche client → modal avec profil généré
- [ ] Mobile : `frontend/app/(tabs)/crm.tsx` — Bouton sur fiche client → bottom sheet avec résumé
- [ ] Backend : `GET /ai/customer-summary/{customer_id}` — Agrégation achats + fréquence + panier moyen + dette + produits préférés → texte

**Messages personnalisés IA**
- [ ] Web : `web-app/src/components/CRM.tsx` — Bouton "Générer message" → choix canal (SMS/WhatsApp) → message pré-rédigé → envoi
- [ ] Mobile : `frontend/app/(tabs)/crm.tsx` — Bouton message IA → preview → partage via `Share.share()` ou lien WhatsApp
- [ ] Backend : `POST /ai/generate-customer-message` — Input: customer_id + contexte (promo/relance/anniversaire) → message personnalisé

### Multi-Boutiques (Enterprise exclusif)

**Rééquilibrage de stock inter-boutiques**
- [ ] Web : `web-app/src/components/MultiStoreDashboard.tsx` — Section "Transferts suggérés" + bouton "Transférer" (appelle `stores.transferStock` existant)
- [ ] Mobile : `frontend/app/(tabs)/index.tsx` — Carte "Rééquilibrage suggéré" si multi-boutiques
- [ ] Backend : `GET /ai/rebalance-suggestions` — Analyse stock vs vélocité par boutique → suggestions de transfert

**Benchmark entre boutiques**
- [ ] Web : `web-app/src/components/MultiStoreDashboard.tsx` — Section "Benchmark IA" avec comparaison par catégorie + explications écarts
- [ ] Mobile : `frontend/app/(tabs)/index.tsx` — Carte benchmark condensée (résumé top 3 différences)
- [ ] Backend : `GET /ai/store-benchmark` — Comparaison CA, marges, produits par boutique → insights textuels

### Analytics Avancés

**Corrélation produits cachée**
- [ ] Web : `web-app/src/components/AbcAnalysis.tsx` — Section "Corrélations" avec graphe de liens entre produits
- [ ] Web : `web-app/src/components/Inventory.tsx` — Sur fiche produit : "Produits liés"
- [ ] Mobile : `frontend/app/(tabs)/products.tsx` — Badge "Lié à X" sur produits corrélés
- [ ] Backend : `GET /ai/product-correlations` — Analyse paniers de vente → co-occurrences significatives

**Conseils contextuels proactifs**
- [ ] Web : `web-app/src/components/Dashboard.tsx` — Banner conseil IA en haut du dashboard (rotatif, dismissable)
- [ ] Mobile : `frontend/app/(tabs)/index.tsx` — Carte conseil du jour (composant `TipCard.tsx` existant à enrichir)
- [ ] Mobile : `frontend/hooks/useNotifications.ts` — Push notification IA périodique
- [ ] Backend : `GET /ai/contextual-tips` — Cron analyse usage + données → génère 1 conseil pertinent/jour

### Récapitulatif endpoints backend à créer

| Endpoint | Type | Méthode |
|----------|------|---------|
| `/ai/scan-product` | Vision | POST |
| `/ai/detect-duplicates` | Similarité texte | POST |
| `/ai/sales-forecast` | Prédiction | POST |
| `/ai/voice-to-cart` | Audio + Matching | POST |
| `/ai/natural-query` | NLP | POST |
| `/ai/categorize-expense` | Classification | POST |
| `/ai/business-health-score` | Scoring | GET |
| `/ai/dashboard-prediction` | Prédiction | GET |
| `/ai/auto-draft-orders` | Automatisation | POST |
| `/ai/optimal-order-day/{supplier_id}` | Analyse | GET |
| `/ai/seasonality-alerts` | Pattern detection | GET |
| `/ai/deadstock-analysis` | Analytics | GET |
| `/ai/shrinkage-analysis` | Comparaison | POST |
| `/ai/supplier-rating/{supplier_id}` | Scoring | GET |
| `/ai/customer-summary/{customer_id}` | Génération texte | GET |
| `/ai/generate-customer-message` | Génération texte | POST |
| `/ai/rebalance-suggestions` | Optimisation | GET |
| `/ai/store-benchmark` | Analyse comparative | GET |
| `/ai/product-correlations` | Data mining | GET |
| `/ai/contextual-tips` | Génération conseil | GET |

*Tous gated `plan === 'enterprise'` côté backend via middleware `check_enterprise_plan`.*

### Ordre de priorité recommandé
1. Score de santé business + Tableau de bord prédictif (valeur perçue immédiate sur le dashboard)
2. Saisie produit par photo (wow effect, gain de temps massif)
3. Catégorisation dépenses + Prévision de ventes (fondations analytiques)
4. Caisse vocale + Recherche langage naturel (UX différenciante)
5. Notation fournisseur + Meilleur jour commande + Détection saisonnalité (intelligence approvisionnement)
6. Résumé client + Messages personnalisés (CRM intelligent)
7. Produits à déstocker + Estimation vol/perte + Détection doublons (optimisation stock)
8. Commandes zéro clic (automatisation complète)
9. Rééquilibrage + Benchmark boutiques (multi-store intelligence)
10. Corrélation produits + Conseils proactifs (analytics avancés)

---

## 🚀 Vision Stratégique Future (Non planifié)
*Idées validées pour l'évolution long-terme, pas encore priorisées.*

1. **Alertes Proactives Météo/Calendrier** : Cron job backend analyse météo + jours fériés + stock → notifications push anticipées ("Canicule prévue vendredi : commandez 50 packs d'eau").
2. **CRM Marketing Hyper-Personnalisé** : Campagnes SMS ciblées automatiques (promo produit favori le jour de l'anniversaire client).
3. **Dynamic Pricing Anti-gaspillage** : Proposition auto de baisses de prix pour produits proches de la péremption ou stagnants.
4. **Détection de Fraudes Internes** : Analyse comportementale des caissiers (annulations, retours suspects) avec alerte discrète au gérant.
5. **Studio Photo Vision IA** : Détourage automatique de la photo produit pour rendu studio propre.
6. **Optimisation Rayons (Merchandising)** : Analyse achats groupés pour conseiller le placement physique en boutique.
7. **Gestion FEFO Automatisée** : To-do list quotidienne intelligente pour magasiniers ("Avancer les 12 bouteilles du lot #456, expire dans 3 jours").

---

## 📚 Post-Développement — Documentation & Formation
- [x] **Formation complète utilisateur** : générer un guide multi-chapitres couvrant toutes les fonctionnalités (Dashboard, Inventaire, POS, Alertes, Fournisseurs, Comptabilité, CRM, IA, Multi-boutiques, Mobile vs Web, Abonnements). Format : Markdown/PDF + version Help Center. À générer quand le développement est considéré terminé (ou en version intermédiaire si besoin).

---

## 🐛 Bugs Connus
- [x] **Accounting.tsx** : `stats?.daily_stats` → `stats?.daily_revenue` corrigé (Phase 4)
- [x] `get_batches` : `user.user_id` → `get_owner_id(user)` corrigé (staff voit maintenant les lots du propriétaire)
- [x] Import produits : `confirm_import` utilisait `user_id` au lieu de `get_owner_id()` + `store_id` était None
- [x] Export CSV accounting n'inclut pas les dépenses dans le total
- [x] **Tenant ID bug** : endpoints categories, produits (CRUD individuel) et paiements clients utilisaient `user.user_id` au lieu de `get_owner_id(user)` — les membres du staff ne pouvaient pas créer/modifier/supprimer (server.py)

---

## Notes Techniques Importantes
- Tous les champs ajoutés en Phase 2-3 sont **optionnels** → rétrocompatibilité mobile garantie
- `require_permission` bypass automatique pour `shopkeeper` et `superadmin`
- `get_owner_id(user)` → retourne `parent_user_id` si staff, sinon `user_id` (multi-tenant)
- Les emplacements (locations) ne fragmentent PAS la quantité stock — c'est un tag informatif
- Le `FEFO` (First Expired First Out) est déjà partiellement implémenté dans `create_stock_movement`
- **Mobile = une seule app** : features gated par plan, pas deux APK/IPA distincts
- **Web = Enterprise exclusif** : guard au login, Starter/Pro redirigés vers page upgrade
- **PremiumGate actuel** gate `plan === 'premium'` → à remplacer par `plan !== 'starter' && plan !== 'pro' && plan !== 'enterprise'` (i.e. seulement trial expiré)
- **EnterpriseGate** (nouveau) : `plan !== 'enterprise'` pour les features avancées mobile
- **IA Enterprise gating** : tous les endpoints IA avancés vérifient `plan === 'enterprise'` via middleware backend + gate frontend
