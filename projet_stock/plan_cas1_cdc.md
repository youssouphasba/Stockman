# Plan : CAS 1 + Complétion CDC

> Ce fichier contient le plan d'implémentation pour les prochaines sessions Claude.
> **Dernière mise à jour** : 2026-02-07

## Contexte
Le CAS 2 (fournisseur manuel) est terminé. Il reste à implémenter le CAS 1 (fournisseur inscrit) ET compléter tous les modules restants du cahier des charges. Ce plan couvre 4 phases : d'abord les gains rapides (frontend uniquement), puis le backend CAS 1, le frontend CAS 1, et enfin le polish.

---

## PHASE 1 : Gains rapides (frontend existant)

### 1.1 Modal d'édition produit
**Fichier** : `frontend/app/(tabs)/products.tsx`
- Ajouter un modal d'édition (réutiliser le modal d'ajout avec pré-remplissage)
- Bouton "Modifier" sur chaque carte produit
- Appeler `products.update(id, data)` (endpoint PUT existe déjà)

### 1.2 Modal gestion catégories
**Fichier** : `frontend/app/(tabs)/products.tsx`
- Bouton "Gérer" à côté des filtres catégories
- Modal avec liste des catégories + ajout/modifier/supprimer
- Appeler `categories.create/update/delete` (endpoints existent)

### 1.3 UI règles d'alertes
**Fichier** : `frontend/services/api.ts` — Ajouter objet `alertRules` :
```typescript
export const alertRules = {
  list: () => request<AlertRule[]>('/alert-rules'),
  create: (data: AlertRuleCreate) => request<AlertRule>('/alert-rules', { method: 'POST', body: data }),
  update: (id: string, data: AlertRuleCreate) => request<AlertRule>(`/alert-rules/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ message: string }>(`/alert-rules/${id}`, { method: 'DELETE' }),
};
```
+ types `AlertRule` et `AlertRuleCreate`

**Fichier** : `frontend/app/(tabs)/alerts.tsx`
- Bouton "Configurer" en haut pour ouvrir un modal de gestion des règles
- Toggle on/off par règle, seuil % modifiable, canaux de notification

### 1.4 Écran Statistiques
**Fichier** : `frontend/app/(tabs)/index.tsx` (Dashboard)
- Ajouter un bouton "Voir statistiques" qui ouvre un modal plein écran
- Affiche les données de `statistics.get()` : stock par catégorie (barres), distribution statuts (cercle), mouvements 30j (entrées/sorties), top produits par valeur
- Pas de librairie de graphiques externe : utiliser des barres en `View` avec largeur proportionnelle

### 1.5 Écran Historique mouvements
**Fichier** : `frontend/app/(tabs)/index.tsx` (Dashboard)
- Bouton "Historique" qui ouvre un modal avec la liste des mouvements
- Appeler `stock.getMovements()` — affiche date, produit, type (entrée/sortie), quantité, raison
- Filtre par type (tous/entrées/sorties)

### 1.6 Vue détail commande
**Fichier** : `frontend/app/(tabs)/orders.tsx`
- Taper sur une commande ouvre un modal de détail
- Appeler `orders.get(id)` — affiche fournisseur, liste items, prix, statut, dates
- Bouton de notation (préparation pour Phase 3)

---

## PHASE 2 : CAS 1 Backend

### 2.1 Système de rôles
**Fichier** : `backend/server.py`
- Ajouter `role: str = "shopkeeper"` au modèle `User` et à `UserCreate`
- Modifier `register()` pour accepter `role` (défaut: "shopkeeper")
- Ajouter helpers `require_shopkeeper` et `require_supplier` (dépendent de `require_auth`)
- Les utilisateurs existants → rôle "shopkeeper" par défaut (pas de migration nécessaire, MongoDB est schemaless)

### 2.2 Nouveaux modèles
**Fichier** : `backend/server.py` — Ajouter après les ORDER MODELS :

**SupplierProfile** (profil commercial du fournisseur inscrit) :
- `profile_id`, `user_id`, `company_name`, `description`, `phone`, `address`, `city`
- `categories: List[str]`, `delivery_zones: List[str]`
- `min_order_amount: float`, `average_delivery_days: int`
- `rating_average: float`, `rating_count: int`
- `is_verified: bool`

**CatalogProduct** (produit du catalogue fournisseur) :
- `catalog_id`, `supplier_user_id`, `name`, `description`, `category`
- `price: float`, `unit: str`, `min_order_quantity: int`
- `stock_available: int`, `available: bool`

**SupplierRating** :
- `rating_id`, `supplier_user_id`, `shopkeeper_user_id`, `order_id`
- `score: int` (1-5), `comment: Optional[str]`

**SupplierInvitation** (CAS 2 → CAS 1) :
- `invitation_id`, `shopkeeper_user_id`, `manual_supplier_id`
- `email`, `token` (uuid), `status` (pending/accepted/expired), `expires_at`

### 2.3 Enrichir le modèle Order
**Fichier** : `backend/server.py`
- Ajouter à `Order` : `supplier_user_id: Optional[str]`, `is_connected: bool = False`
- Ajouter à `OrderCreate` : `supplier_user_id: Optional[str]`

### 2.4 Nouveaux endpoints fournisseur inscrit
**Fichier** : `backend/server.py`

**Profil fournisseur** (protégé par `require_supplier`) :
- `GET /supplier/profile` — Récupérer son profil
- `POST /supplier/profile` — Créer son profil
- `PUT /supplier/profile` — Modifier son profil

**Catalogue** (protégé par `require_supplier`) :
- `GET /supplier/catalog` — Lister ses produits
- `POST /supplier/catalog` — Ajouter un produit
- `PUT /supplier/catalog/{id}` — Modifier un produit
- `DELETE /supplier/catalog/{id}` — Supprimer un produit

**Dashboard fournisseur** :
- `GET /supplier/dashboard` — Stats : nb produits catalogue, commandes par statut, CA total, note moyenne

**Commandes reçues** (protégé par `require_supplier`) :
- `GET /supplier/orders` — Lister les commandes reçues (avec filtre statut)
- `PUT /supplier/orders/{id}/status` — Accepter/refuser/expédier/livrer

### 2.5 Endpoints marketplace (pour boutiquiers)
**Fichier** : `backend/server.py` — Protégés par `require_shopkeeper`

- `GET /marketplace/suppliers` — Chercher fournisseurs (params: q, category, city)
- `GET /marketplace/suppliers/{supplier_user_id}` — Profil détaillé + catalogue + avis
- `GET /marketplace/search-products` — Chercher produits dans tous les catalogues

### 2.6 Système d'invitation
**Fichier** : `backend/server.py`
- `POST /suppliers/{supplier_id}/invite` — Envoyer invitation (email + token)
- `POST /auth/register-from-invitation` — Inscription fournisseur via token d'invitation
  → Crée le compte supplier, lie le supplier manuel existant (`linked_user_id`)

### 2.7 Système de notation
**Fichier** : `backend/server.py`
- `POST /suppliers/{supplier_user_id}/rate` — Noter après livraison (score 1-5 + commentaire)
  → Met à jour `rating_average` et `rating_count` sur le profil fournisseur

### 2.8 Détection slow_moving
**Fichier** : `backend/server.py` — Dans `check_and_create_alerts()` :
- Ajouter le cas `"slow_moving"` : vérifier s'il n'y a eu aucun mouvement "out" depuis 30 jours
- Si oui, créer une alerte "Produit dormant" de sévérité "info"

### 2.9 Export CSV
**Fichier** : `backend/server.py`
- `GET /export/products/csv` — Exporter la liste des produits en CSV
- `GET /export/movements/csv` — Exporter l'historique des mouvements en CSV
- Utiliser `csv` + `io.StringIO` + `StreamingResponse` (pas de dépendance externe)

### 2.10 Alertes livraison en retard
**Fichier** : `backend/server.py`
- `POST /check-late-deliveries` — Vérifier commandes dont `expected_delivery < now` et statut non "delivered"
  → Créer des alertes "Livraison en retard"
- Appeler automatiquement depuis l'endpoint dashboard

### 2.11 Push notifications (envoi réel)
**Fichier** : `backend/requirements.txt` — Ajouter `httpx`
**Fichier** : `backend/server.py`
- Fonction `send_push_notification(user_id, title, body)` via Expo Push API
- Appeler dans `check_and_create_alerts()` quand une alerte est créée
- Appeler dans `supplier_update_order_status()` pour notifier le boutiquier

---

## PHASE 3 : CAS 1 Frontend

### 3.1 Mettre à jour api.ts
**Fichier** : `frontend/services/api.ts`
- Ajouter `role` au type `User`
- Ajouter `register` avec paramètre `role` optionnel
- Ajouter objets API : `supplierProfile`, `supplierCatalog`, `supplierDashboard`, `supplierOrders`, `marketplace`, `invitations`, `ratings`
- Ajouter tous les types TS correspondants

### 3.2 Mettre à jour AuthContext
**Fichier** : `frontend/contexts/AuthContext.tsx`
- Ajouter `isSupplier` et `isShopkeeper` dérivés de `user.role`
- Passer `role` à `register()`

### 3.3 Écran inscription avec choix de rôle
**Fichier** : `frontend/app/(auth)/register.tsx`
- Étape 1 : Deux grandes cartes "Commerçant" / "Fournisseur"
- Étape 2 : Formulaire d'inscription (existant) avec le rôle sélectionné

### 3.4 Routing basé sur le rôle
**Fichier** : `frontend/app/_layout.tsx`
- Si `user.role === "supplier"` → rediriger vers `/(supplier-tabs)/`
- Si `user.role === "shopkeeper"` → rediriger vers `/(tabs)/`

### 3.5 Créer les onglets fournisseur (5 nouveaux fichiers)

**`frontend/app/(supplier-tabs)/_layout.tsx`** — 4 onglets :
Dashboard | Catalogue | Commandes | Paramètres

**`frontend/app/(supplier-tabs)/index.tsx`** — Dashboard fournisseur :
- KPIs : produits catalogue, commandes en attente/actives/livrées, CA total
- Note moyenne avec étoiles
- Commandes récentes

**`frontend/app/(supplier-tabs)/catalog.tsx`** — Gestion catalogue :
- Liste produits avec recherche
- Modal ajout/édition : nom, description, catégorie, prix, unité, qté min commande, stock, disponibilité
- Toggle disponibilité rapide

**`frontend/app/(supplier-tabs)/orders.tsx`** — Commandes reçues :
- Liste avec filtre par statut
- Cartes : boutiquier, date, articles, total
- Boutons d'action : Accepter/Refuser (pending), Expédier (confirmed), Livrer (shipped)

**`frontend/app/(supplier-tabs)/settings.tsx`** — Profil & paramètres :
- Édition profil commercial (nom entreprise, description, téléphone, adresse, ville, zones livraison, catégories, montant min commande, délai moyen)
- Déconnexion

### 3.6 Marketplace dans l'onglet Fournisseurs
**Fichier** : `frontend/app/(tabs)/suppliers.tsx`
- Ajouter un contrôle segmenté : "Mes Fournisseurs" | "Marketplace"
- Vue Marketplace : recherche, filtres (catégorie, ville), liste de profils fournisseurs
- Chaque carte : nom, ville, note (étoiles), nb produits, délai
- Modal détail : profil complet, catalogue avec prix, avis
- Bouton "Commander" → flux de commande connectée

### 3.7 Bouton d'invitation CAS 2 → CAS 1
**Fichier** : `frontend/app/(tabs)/suppliers.tsx`
- Dans le modal détail d'un fournisseur manuel, ajouter "Inviter à s'inscrire"
- Demande l'email, appelle `invitations.send()`
- Badge "Vérifié" si le fournisseur est lié à un compte

### 3.8 Notation après livraison
**Fichier** : `frontend/app/(tabs)/orders.tsx`
- Quand une commande connectée passe à "delivered", afficher un prompt de notation
- 5 étoiles + commentaire optionnel

---

## PHASE 4 : Polish

### 4.1 Boutons d'export dans l'UI
**Fichier** : `frontend/app/(tabs)/index.tsx`
- Boutons "Exporter CSV" dans les modals Statistiques et Historique
- Ouvrir l'URL d'export dans le navigateur via `Linking.openURL()`

### 4.2 Enforcement des toggles modules
**Fichier** : `frontend/app/(tabs)/settings.tsx` + écrans concernés
- Quand un module est désactivé, masquer la section correspondante ou afficher "Module désactivé"

### 4.3 Mettre à jour step_context.md

---

## Fichiers à modifier/créer

| Fichier | Action | Phase |
|---------|--------|-------|
| `backend/server.py` | Rôles, modèles CAS 1, 20+ endpoints, slow_moving, export, push | 2 |
| `backend/requirements.txt` | Ajouter `httpx` | 2 |
| `frontend/services/api.ts` | Types alertRules + tous types/objets CAS 1 | 1,3 |
| `frontend/app/(tabs)/products.tsx` | Modal édition + modal catégories | 1 |
| `frontend/app/(tabs)/alerts.tsx` | Modal config règles d'alertes | 1 |
| `frontend/app/(tabs)/index.tsx` | Modal statistiques + modal historique + export | 1,4 |
| `frontend/app/(tabs)/orders.tsx` | Modal détail + notation | 1,3 |
| `frontend/app/(tabs)/suppliers.tsx` | Marketplace + invitation | 3 |
| `frontend/contexts/AuthContext.tsx` | Rôles isSupplier/isShopkeeper | 3 |
| `frontend/app/_layout.tsx` | Routing basé sur rôle | 3 |
| `frontend/app/(auth)/register.tsx` | Choix de rôle | 3 |
| `frontend/app/(supplier-tabs)/_layout.tsx` | **CRÉER** — tabs fournisseur | 3 |
| `frontend/app/(supplier-tabs)/index.tsx` | **CRÉER** — dashboard fournisseur | 3 |
| `frontend/app/(supplier-tabs)/catalog.tsx` | **CRÉER** — gestion catalogue | 3 |
| `frontend/app/(supplier-tabs)/orders.tsx` | **CRÉER** — commandes reçues | 3 |
| `frontend/app/(supplier-tabs)/settings.tsx` | **CRÉER** — profil fournisseur | 3 |
| `step_context.md` | Mettre à jour | 4 |

---

## Nouvelles collections MongoDB

| Collection | Usage |
|------------|-------|
| `supplier_profiles` | Profils commerciaux des fournisseurs inscrits |
| `catalog_products` | Catalogue produits des fournisseurs |
| `supplier_ratings` | Notes et avis des boutiquiers |
| `supplier_invitations` | Invitations CAS 2 → CAS 1 |

---

## Ordre d'implémentation

```
Phase 1 (parallélisable, frontend uniquement) :
  1.1 Modal édition produit
  1.2 Modal gestion catégories
  1.3 API alertRules + UI config règles
  1.4 Modal statistiques (dashboard)
  1.5 Modal historique mouvements (dashboard)
  1.6 Modal détail commande

Phase 2 (séquentiel, backend) :
  2.1 Système de rôles (PREMIER — tout CAS 1 en dépend)
  2.2-2.3 Nouveaux modèles + Order enrichi
  2.4-2.7 Tous les endpoints CAS 1
  2.8-2.11 Slow_moving, export, late delivery, push

Phase 3 (dépend de Phase 2) :
  3.1 api.ts types (PREMIER)
  3.2 AuthContext rôles
  3.3-3.4 Registration rôle + routing
  3.5 5 écrans supplier-tabs
  3.6-3.8 Marketplace + invitation + notation

Phase 4 (indépendant) :
  4.1-4.3 Export UI, toggles modules, step_context
```

---

## Vérification

- [ ] Un fournisseur peut s'inscrire avec le rôle "supplier" et voir ses 4 onglets
- [ ] Le fournisseur peut créer/modifier/supprimer des produits dans son catalogue
- [ ] Le fournisseur voit les commandes reçues et peut changer leur statut
- [ ] Le boutiquier peut chercher des fournisseurs dans le Marketplace
- [ ] Le boutiquier peut passer une commande connectée depuis le Marketplace
- [ ] Quand le fournisseur marque "livré", le stock du boutiquier est mis à jour
- [ ] Le boutiquier peut noter un fournisseur après livraison
- [ ] Le boutiquier peut inviter un fournisseur manuel à s'inscrire
- [ ] Le modal d'édition produit fonctionne
- [ ] Le modal catégories permet d'ajouter/modifier/supprimer
- [ ] Le modal statistiques affiche les données correctement
- [ ] Le modal historique affiche les mouvements de stock
- [ ] Les règles d'alertes sont configurables depuis l'écran Alertes
- [ ] Les alertes slow_moving sont générées pour les produits dormants
- [ ] L'export CSV des produits et mouvements fonctionne
- [ ] `docker-compose up` lance le projet sans erreur

---

## PHASE 5 : Mode Offline

### 5.0 Architecture offline

**Principe** : cacher les données localement, mettre en file d'attente les actions hors ligne, synchroniser au retour du réseau.

**Fichiers à créer** :
- `frontend/services/cache.ts` — Lecture/écriture locale via `AsyncStorage` (ou `expo-sqlite` pour gros volumes)
- `frontend/services/sync.ts` — File d'attente d'actions + synchronisation automatique au retour online
- `frontend/hooks/useNetwork.ts` — Hook qui détecte online/offline via `@react-native-community/netinfo`
- `frontend/components/OfflineBanner.tsx` — Bandeau "Hors ligne" affiché en haut de l'app

**Dépendances à ajouter** :
- `@react-native-async-storage/async-storage`
- `@react-native-community/netinfo`

**Priorité offline par écran** :

| Écran | Importance | Pourquoi |
|-------|-----------|----------|
| Produits | Critique | Le boutiquier consulte/modifie le stock en boutique, souvent sans wifi |
| Commandes | Haute | Marquer "livré" à la réception même sans internet |
| Fournisseurs | Moyenne | Consulter un numéro de téléphone hors ligne |
| Dashboard | Moyenne | Voir les stats même hors ligne (données cachées) |
| Alertes | Basse | Les alertes sont générées côté serveur |
| Paramètres | Basse | Rarement modifié |

### 5.1 Login / Register — Offline
- Garder le token JWT en cache (déjà fait via SecureStore)
- Si le token est encore valide (non expiré), permettre l'accès offline aux données cachées
- Afficher "Mode hors ligne" au lieu d'un écran d'erreur

### 5.2 Dashboard — Offline
- Cacher les données du dashboard dans AsyncStorage après chaque fetch
- Afficher les dernières données connues avec un badge "Mis à jour il y a X min"

### 5.3 Produits — Offline
- Cacher la liste complète des produits localement
- Consultation, recherche et filtrage dans le cache local
- Ajout / modification / suppression → mis en file d'attente, synchronisé au retour online
- Mouvements de stock → mis en file d'attente (critique pour un boutiquier en boutique sans wifi)

### 5.4 Fournisseurs — Offline
- Cacher la liste des fournisseurs + produits liés
- Consultation des fiches hors ligne
- Ajout / modification → file d'attente

### 5.5 Commandes — Offline
- Cacher la liste des commandes et détails
- Création de commande → file d'attente (données produits/fournisseurs déjà en cache)
- Changement de statut → file d'attente
- Le boutiquier reçoit une livraison → marque "livré" même sans internet → stock mis à jour localement → sync après

### 5.6 Alertes — Offline
- Cacher les alertes localement
- Marquer lu / ignorer → file d'attente

### 5.7 Paramètres — Offline
- Cacher les paramètres localement
- Modifications → file d'attente

---

## PHASE 6 : Améliorations UX par écran

### 6.1 Login / Register
- "Se souvenir de moi" — pré-remplir l'email
- Réinitialisation mot de passe (lien par email)
- Indicateur de force du mot de passe à l'inscription
- Biométrie (FaceID/empreinte) pour se reconnecter rapidement

### 6.2 Dashboard
- **Actions rapides** en haut : "+ Produit", "+ Commande", "Scanner"
- **Période sélectionnable** : 7j / 30j / 90j pour les stats
- **Mini graphiques** inline (barres de progression pour les KPIs, pas juste des chiffres)
- **Résumé commandes** : commandes en attente, prochaine livraison prévue
- **Résumé fournisseurs** : nombre total, commandes actives
- **Produits les plus vendus** cette semaine (top 3)
- **Alerte stock critique** plus visible — bandeau rouge en haut si ruptures

### 6.3 Produits
- **Tri** : par nom, prix, quantité, date d'ajout, statut stock
- **Vue grille / liste** — toggle pour changer la présentation
- **Scan code-barres** via la caméra (`expo-barcode-scanner`) pour rechercher un produit par SKU
- **Badges visuels** plus clairs sur chaque carte (pastille rouge "Rupture", orange "Stock bas", bleu "Surstock")
- **Historique par produit** — voir les mouvements de stock d'un produit spécifique
- **Photo produit** — prendre une photo avec la caméra et l'associer au produit
- **Import CSV** — importer une liste de produits depuis un fichier
- **Duplication produit** — bouton "Dupliquer" pour créer un produit similaire rapidement
- **Unités personnalisées** — proposer des suggestions : pièce, carton, kg, litre, sac, palette

### 6.4 Fournisseurs
- **Appel direct** — bouton téléphone qui ouvre `tel:` pour appeler le fournisseur
- **WhatsApp / SMS** — bouton pour envoyer un message directement
- **Historique commandes** par fournisseur — voir toutes les commandes passées avec ce fournisseur
- **Indicateur fiabilité** — % de livraisons à l'heure, note moyenne
- **Tri** : par nom, nb de commandes, dernière commande, note
- **Carte/localisation** — si adresse renseignée, ouvrir dans Google Maps
- **Notes rapides** — ajouter des notes libres sur un fournisseur (ex: "fermé le lundi")
- **Favoris** — épingler les fournisseurs les plus utilisés en haut

### 6.5 Commandes
- **Timeline visuelle** du statut — barre de progression (en attente → confirmée → expédiée → livrée) au lieu d'un badge texte
- **Duplication commande** — "Recommander" pour recréer la même commande en 1 tap
- **Commandes récurrentes** — programmer une commande automatique (tous les lundis, etc.)
- **Filtre par date** — voir les commandes de cette semaine / ce mois / période personnalisée
- **Filtre par fournisseur** — en plus du filtre par statut
- **Montant total dépensé** — résumé en haut : total ce mois, total ce trimestre
- **Pièce jointe** — ajouter une photo du bon de livraison ou de la facture
- **Alerte de suivi** — notification si une commande est en attente depuis X jours

### 6.6 Alertes
- **Actions directes** depuis l'alerte — "Stock bas sur Riz 5kg" → bouton "Commander" qui ouvre la création de commande avec ce produit pré-rempli
- **Grouper par type** — section "Ruptures", section "Stock bas", section "Surstock" au lieu d'une liste plate
- **"Tout marquer comme lu"** — bouton en haut
- **Filtre par sévérité** — chips Critique / Avertissement / Info
- **Historique des alertes** — voir les alertes passées (actuellement les ignorées sont supprimées)
- **Fréquence des alertes** — "Ce produit a déclenché 5 alertes ce mois" → identifier les produits problématiques
- **Suggestion d'action** — "Riz 5kg en rupture depuis 3 jours. Fournisseur habituel : Moussa. Commander ?"

### 6.7 Paramètres
- **Thème clair / sombre** — toggle (actuellement seulement le thème sombre)
- **Taille de police** — petite / normale / grande (accessibilité)
- **Backup / restauration** — exporter toutes les données en JSON, réimporter
- **Statistiques d'utilisation** — "Vous avez X produits, Y commandes ce mois, Z alertes traitées"
- **Gestion multi-boutiques** — si le boutiquier a plusieurs points de vente (futur)
- **Devise** — configurer FCFA, EUR, USD au lieu d'un format en dur
- **Format date** — JJ/MM/AAAA vs MM/DD/YYYY
- **Son des notifications** — activer/désactiver
- **Aide / tutoriel** — guide de prise en main intégré (premier lancement)

---

## PHASE 7 : Améliorations techniques

### 7.1 Sécurité
- **JWT Secret fort** — remplacer le secret par défaut par une clé de 64+ caractères aléatoires
- **CORS restreint** — `allow_origins` limité aux domaines frontend
- **Rate limiting** — protéger `/auth/login` contre le brute force (ajouter `slowapi`)
- **Validation mot de passe** — minimum 8 caractères + complexité
- **Pagination** — remplacer `to_list(1000)` par `skip/limit` sur tous les endpoints de liste

### 7.2 Performance
- **Index MongoDB** — ajouter `create_index()` sur `user_id`, `product_id`, `supplier_id`, `order_id` au startup
- **N+1 queries** — `get_orders()` fait un find par commande pour items_count ; utiliser `$lookup` ou dénormaliser
- **Alertes asynchrones** — `check_and_create_alerts()` avec `asyncio.create_task()` pour ne pas bloquer les endpoints

### 7.3 Qualité de code
- **Découper le backend** — séparer `server.py` en modules (`routes/`, `models/`, `services/`, `utils/`)
- **Tests** — ajouter `pytest` + `httpx` pour tester auth et endpoints critiques
- **CI/CD** — GitHub Actions pour lint + tests automatiques
- **Logs** — utiliser le logger dans les endpoints (erreurs et actions importantes)
- **Gestion d'erreurs centralisée** — middleware `exception_handler` global

### 7.4 DevOps / Production
- **MongoDB Atlas** — migrer de Docker MongoDB vers un service cloud
- **Déploiement** — Railway / Render / VPS avec reverse proxy (Caddy/Nginx)
- **Variables d'environnement** — sécuriser tous les secrets (pas dans le code)
- **Monitoring** — health checks + alertes si le serveur tombe
- **Backup automatique** — MongoDB dump quotidien
