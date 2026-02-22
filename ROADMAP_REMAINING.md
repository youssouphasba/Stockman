# Roadmap — Travaux Restants

## Contexte Architecture
- **Backend** : FastAPI + MongoDB, partagé mobile et web
- **Web** : Next.js — back-office avancé (plan Enterprise)
- **Mobile** : Expo/React Native — outil terrain (plans Starter/Pro/Enterprise)
- **Plans** : Starter (mobile, 1 user, 1 boutique) | Pro (mobile, 5 users, 2 boutiques) | Enterprise (web + mobile avancé)

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

## 📋 Phases Suivantes

### ✅ Phase 7 — Multi-Boutiques (Web + Backend)
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

## 🔧 Plan Tarifaire (À faire en dernier)

### Structure
| Plan | Accès | Boutiques | Users | Prix |
|------|-------|-----------|-------|------|
| Starter | Mobile uniquement | 1 | 1 | TBD |
| Pro | Mobile (actuel) | 2 | 5 | TBD |
| Enterprise | Web + Mobile avancé | Illimité | Illimité | TBD |

### Implémentation technique
- [ ] Champ `plan: str` sur `User` model (`starter` / `pro` / `enterprise`)
- [ ] Middleware backend : vérifier limites boutiques/users à la création selon plan
- [ ] Guard frontend web : rediriger si `plan != "enterprise"` (page upgrade)
- [ ] Mobile `PremiumGate` : adapter aux 3 niveaux de plan
- [ ] Webhook RevenueCat existant → mapper aux 3 plans
- [ ] Page pricing sur landing-page (déjà partiellement là)

---

## 🔮 Améliorations Mobile Enterprise (Après web terminé)
*Pour les clients Enterprise, enrichir le mobile comme "outil terrain avancé"*

- [ ] Afficher l'emplacement produit (location_id) en lecture seule lors des ajustements stock
- [ ] Terminal sélectionnable au login POS (config via web)
- [ ] Notifier le staff des alertes stock bas en push (déjà partiellement via notifications)
- [ ] Rapport journalier simplifié pour managers terrain (CA du jour, top produits)
- [ ] Gestion gracieuse des 403 : message "Accès refusé, contactez votre manager" au lieu d'erreur générique

---

## 🐛 Bugs Connus
- [x] **Accounting.tsx** : `stats?.daily_stats` → `stats?.daily_revenue` corrigé (Phase 4)
- [x] `get_batches` : `user.user_id` → `get_owner_id(user)` corrigé (staff voit maintenant les lots du propriétaire)
- [ ] Export CSV accounting n'inclut pas les dépenses dans le total

---

## Notes Techniques Importantes
- Tous les champs ajoutés en Phase 2-3 sont **optionnels** → rétrocompatibilité mobile garantie
- `require_permission` bypass automatique pour `shopkeeper` et `superadmin`
- `get_owner_id(user)` → retourne `parent_user_id` si staff, sinon `user_id` (multi-tenant)
- Les emplacements (locations) ne fragmentent PAS la quantité stock — c'est un tag informatif
- Le `FEFO` (First Expired First Out) est déjà partiellement implémenté dans `create_stock_movement`
