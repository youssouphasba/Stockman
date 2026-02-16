# Step Context - Projet Stock Management

> Ce fichier est lu au début de chaque session Claude pour reprendre le travail là où on s'est arrêté.
> **Dernière mise à jour** : 2026-02-09 (Session 11)

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

### Session 9-10 (2026-02-08) — Fix Dashboard KPIs à 0 + Cohérence Alertes
- [x] **Fix `Promise.all` crash** : Dashboard frontend utilisait `Promise.all` pour 4 appels API → si un seul échouait (ex: `/statistics`), TOUS les KPIs affichaient 0. Remplacé par des try/catch individuels.
- [x] **Fix `unread_alerts` count** : Comptait seulement `is_read: false` → maintenant compte TOUTES les alertes non-dismissed (`len(alerts)`)
- [x] **Safety net alertes** : Le dashboard déclenche `check_and_create_alerts` pour les produits critiques (filet de sécurité si alerte manquée lors du mouvement stock)
- [x] **Auto-resolve bulk** : Dismiss automatique des alertes `out_of_stock`/`low_stock` pour les produits revenus à la normale (1 seule requête MongoDB)
- [x] **Réorganisation layout Dashboard** : KPIs montés en premier (après header), section "Statut des stocks" fusionnée avec "Produits critiques", suppression des doublons (3 sections → 1)
- [x] **Fix graphiques mode clair** : LineChart grilles `rgba(255,255,255)` → adaptatif dark/light, PieChart COGS couleur visible, légendes en `colors.text`
- [x] **Fix dashboard 500 crash** : `check_slow_moving` et `check_late_deliveries_internal` wrappés en try/except + fix `order.get("supplier_id")` KeyError
- [x] **Fallback store_id** : Si la requête dashboard avec `store_id` retourne 0 produits, retry sans filtre + backfill automatique
- [x] **Séparation Pertes / Achats** : KPI unique "Pertes + Achats" → 2 KPIs distincts ("Pertes" + "Achats Fournisseurs") dans `accounting.tsx`
- [x] **Fix "flash then 0" KPIs** : `loadData` dépendait de `isConnected` dans `useCallback` → chaque changement NetInfo re-déclenchait `useFocusEffect` → double-render écrasait les données. Fix : `isConnectedRef` (ref au lieu de closure), `loadingRef` (guard anti-concurrent), `setData(prev => prev ?? cached)` (ne pas écraser des données valides avec un cache vide)
- [x] **Fix `parse_date` timezone safety** : Datetimes MongoDB potentiellement naive comparées à `today_start` timezone-aware → crash silencieux. Ajout normalisation tz-aware systématique

### Session 10 (2026-02-09) — Fix Dashboard 0 produits + CA mismatch + AnimatedCounter
- [x] **Fix AnimatedCounter sur web** : `Animated.Value.addListener` ne se déclenche pas fiablement sur web → `displayValue` restait à 0 (useState init). Fix : sur `Platform.OS === 'web'`, `setDisplayValue(value)` directement + `start(callback)` safety net sur natif
- [x] **Fix suffixe FCFA manquant** : KpiCard extrayait le nombre via regex mais ne remettait pas " FCFA" (isCurrency jamais passé). Fix : passer `isCurrency` sur CA du jour, CA 30j, Valeur du stock + passer le nombre brut au lieu de formatCurrency()
- [x] **Fix label "Valeur des actions"** : Chrome auto-translate traduisait "Valeur stock" → "Valeur des actions" (stock=actions financières). Renommé "Valeur du stock" (non ambigu)
- [x] **Fix CA mismatch Dashboard/Compta** : Endpoint compta DUPLIQUÉ (lignes 1356 + 2466). La 1re utilisait `created_at >= datetime` en requête MongoDB (incompatible avec dates string ISO) → ventes manquées. Fix : réécrit pour filtrer en mémoire (comme dashboard) + supprimé le doublon
- [x] **Fix Produits = 0** : Query `is_active: True` ne matchait pas les documents sans ce champ. Fix : supprimé le filtre DB, filtrage en mémoire avec `p.get("is_active", True)` (manquant = actif)
- [x] **Fix Dashboard bloqué par slow checks** : `check_slow_moving` + `check_late_deliveries_internal` bloquaient la réponse dashboard. Fix : exécution en background via `asyncio.ensure_future`
- [x] **Migration startup enrichie** : Ajout backfill `is_active: True` sur produits manquants + backfill `store_id` sur sales
- [x] **Fix useFocusEffect web** : Ajout `useEffect([], [])` comme filet de sécurité car `useFocusEffect` ne se déclenche pas toujours au premier rendu sur web

### Session 11 (2026-02-09) — Professionnalisation Facturation
- [x] **Facturation Professionnelle (Web/PDF)** :
    - [x] Refonte template HTML → Design type "Facture A4" propre (Header, Tableau zébré, Totaux alignés)
    - [x] Intégration données boutique : Nom/Adresse dynamiques (depuis `active_store`)
    - [x] Partage natif : Intégration `expo-sharing` pour envoi PDF par WhatsApp/Email/System-share
    - [x] Fix doublons imports et syntaxe dans `accounting.tsx`
