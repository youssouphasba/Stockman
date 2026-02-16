# Step Context - Projet Stock Management

> Ce fichier est lu au début de chaque session Claude pour reprendre le travail là où on s'est arrêté.
> **Dernière mise à jour** : 2026-02-08 (Session 6)

---

## Architecture du projet

- **Backend** : FastAPI + MongoDB (Motor async) — `backend/server.py` (~2700 lignes)
- **Frontend** : Expo React Native (expo-router) — `frontend/`
- **Base de données** : MongoDB (via Docker)
- **Auth** : Email/password avec JWT (bcrypt), deux rôles : `shopkeeper` et `supplier`
- **UI** : Style Glassmorphism (fond sombre bleu-violet, cards semi-transparentes), Dark/Light mode
- **Dev** : Docker Compose (MongoDB + Backend + Frontend)
- **Offline** : Support complet (AsyncStorage + Queue Sync)
- **Multi-Store** : Support backend (store_id filtering) + sélecteur frontend
- **Devise** : FCFA (unifié partout)

---

## Travail accompli

### Session 1-3 (2026-02-07) — Fondations & CAS 2
- [x] Fondations Backend & Frontend (Auth, Dashboard, Produits, Settings)
- [x] CAS 2 Fournisseurs manuels (CRUD, Commandes, Liaison produits)
- [x] Thème complet Glassmorphism
- [x] Dockerisation

### Session 4 (2026-02-07/08) — Offline & UX & Multi-store & Thèmes
- [x] **Phase 4 : Polish**
    - [x] Exports CSV (Produits, Mouvements)
    - [x] Toggles Modules (Settings & Dashboard enforcement)
- [x] **Phase 5 : Mode Offline**
    - [x] Infrastructure : `useNetwork`, `OfflineBanner`, `cache` (AsyncStorage), `sync` (Queue)
    - [x] Intégration : Dashboard (Read), Produits (Read/Write/Sync)
- [x] **Phase 6 : UX & Multi-boutiques & Thèmes**
    - [x] 6.1 Scanner Code-barres (Caméra)
    - [x] 6.2 Photos Produits
    - [x] 6.3 Fondation Multi-boutiques (Backend models, Frontend Context & Selector)
    - [x] 6.5 Système de Thème Dynamique (Dark/Light mode, Context, Persistance, Migration tous écrans)
- [x] **Phase 7 : Refonte UI & Fixes**
    - [x] Toggle Thème (Paramètres), Création Client (POS), UX Clavier
    - [x] Correctif Backend (Dashboard Refresh, Variable non définie)
- [x] **Phase 8 : Logique Métier & Déploiement**
    - [x] Isolation Multi-boutiques (Backend strict filtering)
    - [x] Impression Ticket de caisse (PDF/Sharing)
    - [x] Guide de déploiement (`deployment_guide.md`)

### Session 5-6 (2026-02-08) — Audit complet, Corrections & CRM
*Voir détails ci-dessous*

### Session 8 (2026-02-08) — Fix Dashboard CA + Refonte Comptabilité
- [x] **Backend `get_accounting_stats`** : ajout filtre `store_id`, `daily_revenue`, `payment_breakdown`, `avg_sale`, `total_items_sold`, `stock_value`, `stock_selling_value`
- [x] **Backend `get_dashboard`** : ajout `today_revenue`, `month_revenue`, `today_sales_count`
- [x] **Backend export** : `GET /export/accounting/csv` (ventes, pertes, achats, résumé)
- [x] **Dashboard KPIs** : remplacé "Revenu potentiel" → "CA du jour" + "CA (30j)", ajouté "Valeur stock"
- [x] **Refonte complète `accounting.tsx`** :
    - [x] Sélecteur de période (7j / 30j / 90j / 1an)
    - [x] 6 KPIs : CA, Marge Brute, Bénéfice Net, Panier Moyen, Valeur Stock, Pertes+Achats
    - [x] LineChart tendance CA (daily_revenue)
    - [x] PieChart répartition CA (COGS vs Marge)
    - [x] PieChart modes de paiement
    - [x] Détail pertes + Ventes récentes (10 dernières)
    - [x] Bouton **Export CSV** comptable
    - [x] Modal **Créer Facture** manuelle (client, lignes articles, note, génération PDF)
    - [x] Bouton facture PDF sur chaque vente (design amélioré)

### Session 7 (2026-02-08) — Fix incohérences alertes, dashboard & onglets
- [x] **Fix `simple_mode` par défaut** : changé de `True` → `False` (backend model + frontend fallback)
    - Bug : 3 onglets (Compta, Fournisseurs, Commandes) étaient masqués par défaut
- [x] **Refonte `check_and_create_alerts`** :
    - [x] Ajout paramètre `store_id` explicite (au lieu de dépendre de `product.store_id` potentiellement null)
    - [x] **Auto-résolution** : quand le stock remonte, les alertes `out_of_stock`/`low_stock`/`overstock` sont automatiquement dismissed
    - [x] Vérification des doublons inclut le `store_id`
    - [x] Nettoyage des anciennes alertes avec mauvais `store_id`
    - [x] Tous les 5 appelants mis à jour pour passer `store_id`
- [x] **Migration startup** : backfill `store_id` sur toutes les collections legacy (products, stock_movements, alerts, batches) + fix `simple_mode` existant
- [x] Dashboard fonctionne correctement car les données backend sont maintenant cohérentes

### Session 5-6 détails (2026-02-08) — Audit complet, Corrections & CRM
- [x] **Audit complet des 9 onglets** — Vérification des interconnexions entre tabs
- [x] **Corrections Backend critiques :**
    - [x] Ajout `store_id` aux modèles `StockMovement`, `Batch`, `Alert` (étaient manquants → filtres cassés)
    - [x] Ajout `customer_id` au modèle `Sale`
    - [x] Fix `out_of_stock_products` non défini dans endpoint Dashboard
    - [x] Fix endpoint `/statistics` : variables `user_id`/`store_id` non définies + filtrage par `store_id`
    - [x] Fix `JWT_SECRET` → `SECRET_KEY` dans export CSV
    - [x] Ajout index `store_id` sur collection `stock_movements`
    - [x] Vérification alertes après livraison commande
    - [x] Ajout données achats dans stats comptabilité (`total_purchases`, `purchases_count`)
- [x] **Routes Backend ajoutées :**
    - [x] `PUT /customers/{id}` et `DELETE /customers/{id}`
    - [x] `POST /promotions`, `PUT /promotions/{id}`, `DELETE /promotions/{id}` + modèle `PromotionCreate`
- [x] **Corrections Frontend :**
    - [x] Devise unifiée `FCFA` partout (Dashboard, Produits, Commandes, Fournisseurs, Compta)
    - [x] Fix bouton "Commander" Dashboard → `router.push('/orders')` (au lieu de Google)
    - [x] Ajout style `statusRow` manquant dans Dashboard
    - [x] Dialogues de confirmation suppression (Produits, Fournisseurs)
    - [x] Validation stock dans Caisse (POS) : empêche d'ajouter plus que le stock disponible
- [x] **Refonte _layout.tsx (tabs)** — Visibilité conditionnelle des onglets :
    - [x] `modules.alerts === false` → masque onglet Alertes
    - [x] `modules.stock_management === false` → masque onglet Produits
    - [x] `simpleMode` → masque Compta, Fournisseurs, Commandes
- [x] **Refonte complète CRM/Clients (crm.tsx)** :
    - [x] CRUD Clients complet (création, édition, suppression avec confirmation)
    - [x] CRUD Promotions complet (création, édition, suppression avec confirmation)
    - [x] Modal détail client avec avatar, stats, coordonnées
    - [x] Section résumé stats (total clients, total dépensé, total points)
    - [x] Avatars clients, états vides
- [x] **API service (api.ts)** mis à jour :
    - [x] `customers.update()`, `customers.delete()`
    - [x] `promotions.create()`, `promotions.update()`, `promotions.delete()`
    - [x] Type `AccountingStats` enrichi (`total_purchases`, `purchases_count`)
- [x] **Comptabilité** : Ajout carte KPI achats (total + nombre commandes livrées)

---

## Étapes restantes — Voir `plan_cas1_cdc.md` pour le plan détaillé

### Phase 1 — Gains rapides (Frontend)
- [ ] 1.1 Modal d'édition produit (amélioration)
- [ ] 1.2 Modal gestion catégories (complet)
- [x] 1.3 UI règles d'alertes (Migré & Fonctionnel)
- [ ] 1.4 Écran Statistiques (amélioration)
- [ ] 1.5 Écran Historique (amélioration)
- [x] 1.6 Vue détail commande (Migré & Fonctionnel)

### Phase 2 — CAS 1 Backend (Fournisseur Inscrit)
- [ ] Rôles, Modèles, Endpoints CAS 1

### Phase 3 — CAS 1 Frontend
- [ ] Auth, Tabs Fournisseur, Marketplace, Invitations

### Améliorations restantes (basse priorité)
- [ ] POS : Mode offline complet
- [ ] Auto-ajout fournisseur marketplace dans "Mes Fournisseurs" après commande
- [ ] Dashboard : Lien direct alerte → onglet Commandes pour réapprovisionner
- [ ] Mode simplifié : aller au-delà du masquage d'onglets

### Phase 7 — Améliorations techniques
- [ ] Sécurité & Performance

---

## Structure frontend actuelle

```
frontend/
├── app/
│   ├── _layout.tsx              # Root layout (auth guard + providers + offline banner)
│   ├── index.tsx                # Redirect
│   ├── (auth)/                  # Login/Register
│   ├── (tabs)/                  # Tabs Commerçant (9 onglets)
│   │   ├── _layout.tsx          # Layout avec visibilité conditionnelle + StoreSelector
│   │   ├── index.tsx            # Dashboard (KPIs, graphiques, alertes, top produits)
│   │   ├── products.tsx         # Produits (Scanner, Photos, CRUD, Offline Write)
│   │   ├── pos.tsx              # Caisse (POS, validation stock, création client)
│   │   ├── accounting.tsx       # Comptabilité (CA, marge, pertes, achats, PieChart)
│   │   ├── suppliers.tsx        # Fournisseurs (CRUD, produits, commandes)
│   │   ├── crm.tsx              # Clients & Promotions (CRUD complet, stats, avatars)
│   │   ├── orders.tsx           # Commandes (suivi, livraison, détail)
│   │   ├── alerts.tsx           # Alertes (stock bas, FEFO, ruptures)
│   │   └── settings.tsx         # Paramètres (profil, modules, thème, export)
│   └── (supplier-tabs)/         # Tabs Fournisseur (CAS 1)
│       ├── _layout.tsx          # Layout fournisseur
│       ├── index.tsx            # Dashboard fournisseur
│       ├── catalog.tsx          # Catalogue produits
│       ├── orders.tsx           # Commandes reçues
│       └── settings.tsx         # Paramètres fournisseur
├── components/
│   ├── OfflineBanner.tsx        # Indicateur offline
│   ├── StoreSelector.tsx        # Sélecteur de magasin
│   ├── AnimatedCounter.tsx      # Compteur animé (Dashboard)
│   └── BarcodeScanner.tsx       # Scanner code-barres
├── contexts/
│   ├── AuthContext.tsx           # Authentification + JWT
│   └── ThemeContext.tsx          # Thème Dark/Light + Glassmorphism
├── services/
│   ├── api.ts                   # Client HTTP + Types (~784 lignes)
│   ├── cache.ts                 # Cache AsyncStorage
│   └── sync.ts                  # Queue de synchro offline
├── hooks/
│   └── useNetwork.ts            # Détection connectivité
├── constants/
│   └── theme.ts                 # Spacing, BorderRadius, FontSize
```

---

## Modèles Backend principaux

| Modèle | Champs clés |
|--------|------------|
| `User` | user_id, email, role (shopkeeper/supplier), active_store_id |
| `Product` | product_id, store_id, name, quantity, purchase_price, selling_price, batches[] |
| `Sale` | sale_id, store_id, customer_id, items[], total_amount, payment_method |
| `StockMovement` | movement_id, store_id, product_id, type, quantity_change |
| `Order` | order_id, user_id, supplier info, items[], status, total_amount |
| `Customer` | customer_id, store_id, name, phone, email, total_spent, loyalty_points |
| `Promotion` | promotion_id, store_id, title, discount_percentage, points_required |
| `Alert` | alert_id, store_id, product_id, type, message, is_read |
| `Batch` | batch_id, store_id, product_id, quantity, expiry_date (FEFO) |

---

## Comment lancer le projet

```bash
# Terminal 1 - Backend
cd backend && uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd frontend && npx expo start
```
