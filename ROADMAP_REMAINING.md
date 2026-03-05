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

## ✅ Phase IA — Améliorations Intelligentes (Web)
- [x] **Accounting.tsx** : P&L auto-analysis (Gemini, auto-load) + Rapport mensuel IA (modal markdown + download)
- [x] **CRM.tsx** : Churn prediction auto-load (banner violet, liste clients à risque)
- [x] **Alerts.tsx** : Détection anomalies auto-load au montage (affichage si ≥1 anomalie)
- [x] **Inventory.tsx** : Bouton "IA Réappro" → conseil réapprovisionnement (banner violet, priority_count)
- [x] Backend : 3 nouveaux endpoints `/ai/pl-analysis`, `/ai/churn-prediction`, `/ai/monthly-report`
- [x] `api.ts` web : 4 méthodes AI ajoutées (plAnalysis, churnPrediction, monthlyReport, replenishmentAdvice)

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
