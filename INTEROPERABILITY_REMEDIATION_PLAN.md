# PLAN DE REMÉDIATION INTEROPÉRABILITÉ — STOCKMAN

**Date** : 27 février 2026
**Auteur** : Audit automatisé Antigravity
**Priorité** : CRITIQUE → HAUTE → MOYENNE → FAIBLE

> Ce document est autonome : un développeur qui ne connaît pas le projet peut corriger chaque point en suivant les instructions.
> Ce plan complète le `SECURITY_REMEDIATION_PLAN.md` en ciblant la **cohérence fonctionnelle** entre modules.

---

## TABLE DES MATIÈRES

- [SECTION A — CRITIQUES (3 items)](#section-a--critiques)
- [SECTION B — HAUTES (5 items)](#section-b--hautes)
- [SECTION C — MOYENNES (5 items)](#section-c--moyennes)
- [SECTION D — FAIBLES (4 items)](#section-d--faibles)
- [SECTION E — ARCHITECTURE PRODUIT (recommandations)](#section-e--architecture-produit)

---

## SECTION A — CRITIQUES

> À corriger **AVANT** toute mise en production. Impact direct sur l'intégrité des données ou la logique métier.

---

### I1 — Permissions Staff non vérifiées côté Backend

**Fichiers** :
- `backend/server.py` — tous les endpoints CRUD (produits, stock, ventes, clients, fournisseurs, commandes)
- `frontend/contexts/AuthContext.tsx` lignes 203-208

**Problème** : Les permissions fines par module (`stock: "read"`, `accounting: "write"`, etc.) définies dans `UserPermissions` sont **uniquement vérifiées côté frontend** dans `hasPermission()`. Aucun endpoint backend ne vérifie ces permissions. Un staff avec `stock: "read"` peut appeler directement `PUT /api/products/{id}` ou `POST /api/stock/movement` et modifier les données.

**Code frontend actuel** (AuthContext.tsx ligne 203) :
```tsx
hasPermission: (module: string, level: 'read' | 'write' = 'read') => {
  if (role === 'shopkeeper' || role === 'superadmin') return true;
  const userPerm = user?.permissions?.[module] || 'none';
  if (level === 'write') return userPerm === 'write';
  return userPerm === 'read' || userPerm === 'write';
},
```

**Code backend actuel** : Aucune vérification. Les endpoints utilisent uniquement `Depends(require_auth)` qui vérifie le JWT mais pas les permissions du user.

**Correction** : Ajouter un middleware/dependency FastAPI qui vérifie les permissions. Dans `backend/server.py`, ajouter après la définition de `require_auth` :

```python
def require_permission(module: str, level: str = "read"):
    """
    Dependency qui vérifie les permissions fines d'un staff.
    Les shopkeepers et superadmins ont toujours accès à tout.
    """
    async def check_permission(user: User = Depends(require_auth)):
        if user.role in ("shopkeeper", "superadmin"):
            return user
        user_perm = user.permissions.get(module, "none")
        if level == "write" and user_perm != "write":
            raise HTTPException(status_code=403, detail=f"Permission '{module}:write' requise")
        if level == "read" and user_perm not in ("read", "write"):
            raise HTTPException(status_code=403, detail=f"Permission '{module}:read' requise")
        return user
    return check_permission
```

**Puis appliquer sur chaque endpoint** (exemples) :

```python
# Produits — lecture
@api_router.get("/products")
async def get_products(..., user: User = Depends(require_permission("stock", "read"))):

# Produits — écriture
@api_router.post("/products")
async def create_product(..., user: User = Depends(require_permission("stock", "write"))):

# Ventes
@api_router.post("/sales")
async def create_sale(..., user: User = Depends(require_permission("pos", "write"))):

# Comptabilité
@api_router.get("/expenses")
async def get_expenses(..., user: User = Depends(require_permission("accounting", "read"))):

# CRM
@api_router.get("/customers")
async def get_customers(..., user: User = Depends(require_permission("crm", "read"))):

# Fournisseurs
@api_router.get("/suppliers")
async def get_suppliers(..., user: User = Depends(require_permission("suppliers", "read"))):
```

**Mapping modules ↔ endpoints** :

| Module | Endpoints en lecture (GET) | Endpoints en écriture (POST/PUT/DELETE) |
|---|---|---|
| `stock` | `/products`, `/stock/movements`, `/categories`, `/alerts` | `/products`, `/products/{id}`, `/stock/movement`, `/products/{id}/adjust`, `/products/import/*` |
| `pos` | `/sales`, `/dashboard` | `/sales` |
| `accounting` | `/expenses`, `/statistics`, `/accounting/*` | `/expenses` |
| `crm` | `/customers`, `/customers/{id}/debt-history` | `/customers`, `/customers/{id}/debts` |
| `suppliers` | `/suppliers`, `/orders` | `/suppliers`, `/orders`, `/orders/{id}/receive-partial` |

**Test** : Créer un staff avec `permissions: { stock: "read" }`. Tenter `POST /api/products` avec son JWT → doit retourner **403**.

---

### I2 — Réception partielle de commande non idempotente (double stock)

**Fichier** : `backend/server.py` — endpoint `PUT /api/orders/{order_id}/receive-partial`

**Problème** : Si l'endpoint est appelé deux fois avec les mêmes `item_id` et `received_quantity` (réseau instable, timeout + retry automatique), le stock est **incrémenté deux fois**. Il n'y a pas de mécanisme d'idempotency ni de vérification des quantités déjà reçues par item.

**Scénario réaliste** : Le commerçant clique "Confirmer réception", le réseau coupe → l'app retry en sync offline → la commande est reçue deux fois → stock doublé.

**Correction** : Dans le handler `receive-partial`, vérifier les quantités déjà reçues avant d'incrémenter :

```python
@api_router.put("/orders/{order_id}/receive-partial")
async def receive_partial(order_id: str, data: dict, user: User = Depends(require_auth)):
    order = await db.orders.find_one({"order_id": order_id, "user_id": get_owner_id(user)})
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    items = data.get("items", [])
    already_received = order.get("received_items", {})  # {item_id: qty_received}

    for item in items:
        item_id = item["item_id"]
        new_qty = item["received_quantity"]

        # Trouver la quantité commandée originale pour cette ligne
        order_item = next((oi for oi in order["items"] if oi["item_id"] == item_id), None)
        if not order_item:
            continue

        prev_received = already_received.get(item_id, 0)
        max_receivable = order_item["quantity"] - prev_received

        # Plafonner : on ne peut pas recevoir plus que ce qui reste
        actual_increment = min(new_qty, max_receivable)
        if actual_increment <= 0:
            continue  # Déjà entièrement reçu

        # Incrémenter le stock du produit
        await db.products.update_one(
            {"product_id": order_item["product_id"], "user_id": get_owner_id(user)},
            {"$inc": {"quantity": actual_increment}}
        )

        # Enregistrer la quantité reçue
        already_received[item_id] = prev_received + actual_increment

    # Sauvegarder l'état de réception
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"received_items": already_received}}
    )
```

**Test** : Appeler `PUT /orders/{id}/receive-partial` deux fois avec les mêmes items → le stock ne doit augmenter qu'une seule fois. La deuxième fois, `actual_increment` doit être 0.

---

### I3 — Refresh Token absent — Déconnexion silencieuse après 2h

**Fichiers** :
- `backend/server.py` lignes 87-108 (`ACCESS_TOKEN_EXPIRE_MINUTES = 120`)
- `frontend/services/api.ts` lignes 173-178 (gestion 401)
- `frontend/services/sync.ts` (queue offline)

**Problème** : JWT expire en 2h. Après expiration :
1. Les requêtes GET → 401 → `removeToken()` → déconnexion silencieuse
2. Les mutations offline queuées → rejouées avec token expiré → échec → dead letter queue
3. L'utilisateur perd sa session de travail sans avertissement

**Impact** : En Afrique subsaharienne, l'utilisateur travaille souvent en réseau instable. Il peut être offline 3h, puis revenir en ligne — toute sa session est détruite.

**Correction** : Implémenter un **refresh token** avec rotation.

**Backend — `server.py`** : Ajouter après `create_access_token` :

```python
REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_refresh_token(user_id: str) -> str:
    """Crée un refresh token longue durée (30 jours)."""
    token_id = f"rt_{uuid.uuid4().hex[:16]}"
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": user_id, "type": "refresh", "jti": token_id, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    """Renouvelle l'access token à partir du refresh token."""
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=401, detail="Refresh token manquant")

    try:
        payload = jwt.decode(refresh, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token invalide")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token expiré")

    user_id = payload.get("sub")
    user_doc = await db.users.find_one({"user_id": user_id})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    # Créer un nouveau access token
    new_access = create_access_token(data={"sub": user_id})

    # Rotation : créer un nouveau refresh token aussi
    new_refresh = create_refresh_token(user_id)
    response.set_cookie(
        key="refresh_token", value=new_refresh,
        httponly=True, secure=True, samesite="strict",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/"
    )

    return {"access_token": new_access, "token_type": "bearer"}
```

**Backend — dans `/auth/login`** : Après la création de l'access token, ajouter l'envoi du refresh token en cookie :

```python
refresh = create_refresh_token(user_doc["user_id"])
response.set_cookie(
    key="refresh_token", value=refresh,
    httponly=True, secure=True, samesite="strict",
    max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400, path="/"
)
```

**Frontend — `api.ts`** : Modifier le handler 401 pour tenter un refresh avant la déconnexion :

```typescript
if (response.status === 401) {
  if (endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    // Tenter un refresh avant de déconnecter
    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Envoie le cookie refresh_token
      });
      if (refreshRes.ok) {
        const { access_token } = await refreshRes.json();
        await setToken(access_token);
        // Rejouer la requête originale avec le nouveau token
        const retryConfig = { ...config };
        (retryConfig.headers as any).Authorization = `Bearer ${access_token}`;
        const retryResponse = await fetch(`${API_URL}/api${endpoint}`, retryConfig);
        if (retryResponse.ok) return retryResponse.json();
      }
    } catch {
      // Refresh a échoué, déconnecter normalement
    }
    await removeToken();
    throw new AuthError('Session expirée');
  }
}
```

**Test** : Attendre 2h+ → faire une requête → doit être transparente (refresh auto). Attendre 30j+ → doit déconnecter.

---

## SECTION B — HAUTES

> Impact fonctionnel significatif ou risque de données incohérentes.

---

### I4 — Boutiques accessibles après downgrade de plan

**Fichier** : `backend/server.py` — endpoint `PUT /api/auth/active-store` (~ ligne 4429)

**Problème** : `STORE_LIMITS` vérifie le plan uniquement lors de la **création** d'un store. Si un utilisateur crée 2 stores en plan Pro, puis downgrade en Starter, il conserve l'accès à ses 2 boutiques sans restriction. La limite n'est appliquée qu'au `POST /stores`.

**Code actuel** (~ ligne 4409) :
```python
@api_router.post("/stores", response_model=Store)
async def create_store(store_data: StoreCreate, user: User = Depends(require_auth)):
    STORE_LIMITS = {"starter": 1, "pro": 2, "enterprise": 9999}
    limit = STORE_LIMITS.get(user.plan, 1)
    current_count = len(user.store_ids)
    if current_count >= limit:
        raise HTTPException(...)
```

**Correction** : Aussi vérifier le plan dans `set_active_store` :

```python
@api_router.put("/auth/active-store", response_model=User)
async def set_active_store(store_data: dict, user: User = Depends(require_auth)):
    store_id = store_data.get("store_id")
    if not store_id or store_id not in user.store_ids:
        raise HTTPException(status_code=400, detail="Magasin invalide")

    # Vérifier que le store est dans la limite du plan actuel
    STORE_LIMITS = {"starter": 1, "pro": 2, "enterprise": 9999}
    limit = STORE_LIMITS.get(user.plan, 1)
    store_index = user.store_ids.index(store_id) if store_id in user.store_ids else 0
    if store_index >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Votre plan {user.plan} permet {limit} boutique(s). Passez à un plan supérieur pour accéder à cette boutique."
        )

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"active_store_id": store_id}}
    )
    user.active_store_id = store_id
    return user
```

**Test** : Créer 2 stores en plan pro. Downgrader en starter. Tenter `PUT /auth/active-store` vers le 2ᵉ store → doit retourner **403**.

---

### I5 — Upgrade de plan non reflété côté client sans reconnexion

**Fichiers** :
- `backend/server.py` — webhook Flutterwave (~ ligne 1436)
- `frontend/contexts/AuthContext.tsx`

**Problème** : Quand un paiement est confirmé via webhook, `user.plan` est mis à jour en DB. Mais le JWT en mémoire côté mobile contient encore le **plan précédent**. L'utilisateur doit se déconnecter/reconnecter pour obtenir les nouvelles fonctionnalités.

**Correction côté backend** : Après mise à jour du plan via webhook, envoyer une notification push invitant le client à rafraîchir :

```python
# Dans le handler webhook Flutterwave, après le update_one :
await notification_service.notify_user(
    db, pending["user_id"],
    "🎉 Plan mis à jour !",
    f"Votre plan {plan} est maintenant actif. Relancez l'app pour en profiter.",
    caller_owner_id=pending["user_id"]
)
```

**Correction côté frontend** : Ajouter un `refreshUser()` dans AuthContext, appelé au premier plan/focus de l'app :

```typescript
// AuthContext.tsx — ajouter dans AuthState
refreshUser: () => Promise<void>;

// Implémentation
async function refreshUser() {
  try {
    const userData = await authApi.me();
    setUser(userData);
  } catch {
    // ignore — l'utilisateur est peut-être offline
  }
}
```

Dans `(tabs)/_layout.tsx`, appeler `refreshUser` à chaque focus :
```typescript
const { refreshUser } = useAuth();
useFocusEffect(useCallback(() => { refreshUser(); }, []));
```

**Test** : Simuler un webhook de paiement. Revenir sur l'app → le plan doit être mis à jour sans reconnexion.

---

### I6 — Alertes push (expiration, slow-moving) envoyées quel que soit le plan

**Fichier** : `backend/server.py` — boucle `check_alerts_loop()` (~ ligne 3539)

**Problème** : Les alertes de stock bas vérifient correctement le plan (`owner.get("plan") not in ("pro", "enterprise")` → skip). Mais les alertes d'expiration et de slow-moving **n'ont pas cette vérification** et sont envoyées à tous les plans, y compris starter.

**Attendu** : Cohérence — toutes les alertes push devraient suivre la même logique de gate plan.

**Correction** : Appliquer le même filtre dans les sections expiration et slow-moving de `check_alerts_loop()` :

```python
# Dans la section expiration (après la boucle low_stock)
# AJOUTER la même vérification plan avant d'envoyer le push :
owner = await db.users.find_one({"user_id": owner_id}, {"plan": 1})
if not owner or owner.get("plan") not in ("pro", "enterprise"):
    continue  # Starter n'a pas droit aux push alerts
```

**Test** : Créer un produit périmé pour un user starter → ne doit **pas** recevoir de push notification.

---

### I7 — N+1 queries dans l'import CSV pour validation category_id

**Fichier** : `backend/services/import_service.py` — méthode `process_import` (~ ligne 77)

**Problème** : Pour chaque ligne du CSV importé, une requête MongoDB est effectuée pour valider le `category_id` :
```python
cat = await self.db.categories.find_one({
    "category_id": current_category_id,
    "user_id": user_id
})
```
Pour un import de 1000 produits, cela fait 1000 requêtes supplémentaires.

**Correction** : Précharger toutes les catégories une seule fois avant la boucle :

```python
# AVANT la boucle for index, row in enumerate(...)
valid_categories = set()
cats = await self.db.categories.find(
    {"user_id": user_id}, {"category_id": 1}
).to_list(None)
valid_categories = {c["category_id"] for c in cats}

# DANS la boucle — remplacer le find_one par :
if current_category_id and current_category_id not in valid_categories:
    current_category_id = None
```

**Test** : Importer un CSV de 500 lignes → observer dans les logs que le nombre de requêtes MongoDB reste constant (pas N+1).

---

### I8 — Boucles background asyncio non supervisées

**Fichier** : `backend/server.py` — événement startup (~ lignes 450-502)

**Problème** : 5 boucles asynchrones tournent en permanence via `asyncio.create_task()` :
1. `check_alerts_loop()` — toutes les 15 min
2. `ai_anomaly_detection_loop()` — toutes les 30 min
3. `check_expired_subscriptions()` — toutes les 24h
4. `check_slow_moving_products()` — toutes les 24h
5. `check_late_deliveries()` — toutes les 24h

Si une boucle plante avec une exception non-catchée, elle meurt silencieusement. Il n'y a **aucun monitoring ni healthcheck** de ces tâches.

**Correction** : Ajouter un registre de statut et un endpoint healthcheck :

```python
# En haut de server.py
background_tasks_status = {}

# Wrapper pour les boucles
async def supervised_loop(name: str, func, interval_seconds: int):
    """Wrapper qui supervise une boucle background."""
    while True:
        try:
            background_tasks_status[name] = {
                "status": "running",
                "last_run": datetime.now(timezone.utc).isoformat(),
            }
            await func()
            background_tasks_status[name]["status"] = "completed"
        except Exception as e:
            logger.error(f"Background task {name} error: {e}")
            background_tasks_status[name] = {
                "status": "error",
                "error": str(e),
                "last_run": datetime.now(timezone.utc).isoformat(),
            }
        await asyncio.sleep(interval_seconds)

# Endpoint admin
@api_router.get("/admin/background-tasks")
async def get_background_tasks_health(user: User = Depends(require_superadmin)):
    return background_tasks_status
```

**Test** : Appeler `GET /api/admin/background-tasks` → doit retourner le statut de chaque boucle avec la date du dernier run.

---

## SECTION C — MOYENNES

> Incohérence fonctionnelle qui mérite correction pour la stabilité du produit.

---

### I9 — Cache frontend sans invalidation après changement de plan

**Fichiers** :
- `frontend/services/cache.ts`
- `frontend/services/api.ts` lignes 84-102

**Problème** : L'api.ts cache toutes les réponses GET en AsyncStorage. Si le plan est upgradé (via webhook), le cache continue de servir les anciennes données (dashboard limité, anciennes stats). La fonction `isStale()` existe mais n'est pas utilisée dans la logique `request()`.

**Correction** : Ajouter une invalidation explicite dans le handler de notification "plan mis à jour" :

```typescript
// Dans le callback de notification push (useNotifications.ts)
if (data?.type === 'plan_upgraded') {
  await cache.remove(KEYS.DASHBOARD);
  await cache.remove(KEYS.SETTINGS);
  await cache.remove(KEYS.PRODUCTS);
  // Force refresh user
  await auth.me();
}
```

**Et** dans `request()`, imposer un TTL maximal :

```typescript
if (method === 'GET') {
  if (!online) {
    const cached = await cache.get<T>(endpoint);
    if (cached) return cached;
    throw new ApiError('Mode hors ligne', 503);
  }
  try {
    const data = await rawRequest<T>(endpoint, options);
    await cache.set(endpoint, data);
    return data;
  } catch (error) {
    // Fallback avec vérification d'âge
    const age = await cache.getAge(endpoint);
    if (age !== null && age < 60) { // Max 1h de cache stale
      const cached = await cache.get<T>(endpoint);
      if (cached) return cached;
    }
    throw error;
  }
}
```

---

### I10 — Signal `sync: true` non propagé dans l'UI

**Fichier** : `frontend/services/api.ts` lignes 132-139

**Problème** : Quand une mutation échoue offline, l'api retourne `{ status: 'pending', sync: true }`. Les écrans récepteurs traitent cette réponse comme un **succès réel** et mettent à jour l'état local (ex : produit affiché comme créé, stock modifié).

**Code actuel** :
```typescript
return { status: 'pending', sync: true } as any;
```

**Correction** : Créer un type dédié et vérifier dans les hooks :

```typescript
// api.ts — nouveau type
export type PendingSyncResponse = { status: 'pending'; sync: true };
export function isPendingSync(response: any): response is PendingSyncResponse {
  return response?.sync === true && response?.status === 'pending';
}
```

Puis dans chaque écran qui effectue des mutations :
```typescript
const result = await products.create(data);
if (isPendingSync(result)) {
  showToast("Action enregistrée — sera synchronisée plus tard", "info");
  return; // Ne pas mettre à jour l'état local comme un succès réel
}
// Succès réel — mettre à jour l'état
```

---

### I11 — Trial réinitialisable par re-inscription avec même numéro

**Fichier** : `backend/server.py` — endpoint `POST /auth/register` (~ ligne 4005)

**Problème** : Si un utilisateur supprime son compte puis se réinscrit avec le même numéro de téléphone, il obtient un **nouveau trial de 90 jours**. Le numéro de téléphone n'est pas vérifié pour les anciens comptes supprimés.

**Correction** : Lors de l'inscription, vérifier si le numéro a déjà eu un trial :

```python
# Dans le handler register, après la vérification email
if user_data.phone:
    existing_phone = await db.users.find_one(
        {"phone": user_data.phone, "user_id": {"$ne": ""}},
        {"trial_ends_at": 1}
    )
    # Aussi vérifier les comptes supprimés
    deleted_phone = await db.deleted_users.find_one(
        {"phone": user_data.phone},
        {"trial_ends_at": 1}
    )
    if existing_phone or deleted_phone:
        # Pas de nouveau trial — l'utilisateur commence directement en mode gratuit limité
        trial_ends_at = datetime.now(timezone.utc)  # Trial expiré immédiatement
```

**Note** : Cela nécessite que la suppression de compte archive les données dans une collection `deleted_users` (à vérifier si c'est déjà le cas).

---

### I12 — Désynchronisation active_store_id après retrait admin

**Fichier** : `backend/server.py` — endpoint `PUT /api/auth/active-store`

**Problème** : `active_store_id` est vérifié contre `user.store_ids` provenant du JWT (2h de vie). Si un admin retire un store de la liste de l'utilisateur pendant ce délai, le JWT contient encore l'ancien `store_ids`. L'utilisateur peut switcher vers un store auquel il n'a plus accès.

**Correction** : Recharger `store_ids` depuis la DB au lieu du JWT :

```python
@api_router.put("/auth/active-store", response_model=User)
async def set_active_store(store_data: dict, user: User = Depends(require_auth)):
    store_id = store_data.get("store_id")

    # Recharger les store_ids depuis la DB (pas depuis le JWT)
    fresh_user = await db.users.find_one({"user_id": user.user_id}, {"store_ids": 1})
    if not fresh_user or store_id not in fresh_user.get("store_ids", []):
        raise HTTPException(status_code=400, detail="Magasin invalide")

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"active_store_id": store_id}}
    )
    # ...
```

---

### I13 — Incohérence dette client calculée à la volée

**Fichier** : `backend/server.py` — endpoint `GET /customers/{id}/debt-history`

**Problème** : Le montant restant de la dette client n'est pas stocké en DB. Il est recalculé à chaque affichage en sommant `sales (payment_method=credit)` - `customer_payments`. Si un crash ou une erreur de sync offline fait perdre un paiement, le montant sera incohérent sans trace.

**Correction** : Ajouter un champ `total_debt` dans le document client, mis à jour atomiquement lors de chaque vente crédit et paiement :

```python
# Lors d'une vente crédit
await db.customers.update_one(
    {"customer_id": customer_id, "user_id": owner_id},
    {"$inc": {"total_debt": total_amount}}
)

# Lors d'un paiement
await db.customers.update_one(
    {"customer_id": customer_id, "user_id": owner_id},
    {"$inc": {"total_debt": -payment_amount}}
)
```

Le calcul dynamique reste comme **vérification**, mais le champ atomique devient la **source de vérité**.

---

## SECTION D — FAIBLES

> Améliorations de robustesse sans impact critique immédiat.

---

### I14 — Logs de route au démarrage en production

**Fichier** : `backend/server.py` — bloc `if __name__ == "__main__"` (fin de fichier)

**Statut** : ✅ Déjà corrigé dans le plan de sécurité (M13). Remplacé par `pass`.

---

### I15 — Pas d'idempotency key sur les créations de vente

**Fichier** : `backend/server.py` — endpoint `POST /api/sales`

**Problème** : Si le client envoie deux fois la même requête de création de vente (réseau flappy), deux ventes identiques sont créées.

**Correction** : Accepter un header `X-Idempotency-Key` optionnel :

```python
@api_router.post("/sales")
async def create_sale(request: Request, ...):
    idempotency_key = request.headers.get("X-Idempotency-Key")
    if idempotency_key:
        existing = await db.sales.find_one({"idempotency_key": idempotency_key})
        if existing:
            return existing  # Retourne la vente existante au lieu d'en créer une nouvelle

    # ... création normale ...
    sale_doc["idempotency_key"] = idempotency_key
    await db.sales.insert_one(sale_doc)
```

---

### I16 — Couplage monolithique backend (10 800+ lignes)

**Fichier** : `backend/server.py`

**Problème** : Un seul fichier contient routing, modèles, logique métier, boucles background et configuration. Risque de régression à chaque modification. Déjà partiellement découplé (`ImportService`, `TwilioService`, `NotificationService`).

**Recommandation** : Découper progressivement en sous-routeurs FastAPI :

```
backend/
  server.py          # App + config + startup uniquement
  routers/
    auth.py           # register, login, refresh, verify-phone
    products.py       # CRUD produits, import, variantes
    sales.py          # POS, ventes, dashboard
    customers.py      # CRM, dettes
    suppliers.py      # Fournisseurs, commandes
    admin.py          # Panel admin
    marketplace.py    # Marketplace B2B
  services/           # (déjà existant)
  models/             # Pydantic models
  background/         # Boucles asyncio supervisées
```

---

### I17 — Queue de sync offline utilise des IDs aléatoires courts

**Fichier** : `frontend/services/sync.ts` — ligne 21

**Code actuel** :
```typescript
id: Math.random().toString(36).substr(2, 9),
```

**Problème** : `Math.random()` peut générer des collisions sur un grand volume d'actions. Risque faible mais réel.

**Correction** : Utiliser `uuid` ou `Date.now()` :
```typescript
id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
```

---

## SECTION E — ARCHITECTURE PRODUIT

> Recommandations structurelles pour l'évolution du projet.

---

### ⚙️ E1 — Refresh Token (détail en I3)

Obligatoire pour une UX mobile fluide. Pattern : JWT 2h + Refresh Token 30j en HttpOnly cookie avec rotation.

### ⚙️ E2 — Worker background séparé

Les boucles `asyncio.create_task()` doivent à terme migrer vers un worker séparé (Celery avec Redis, ou APScheduler). Cela permet de scaler indépendamment l'API et les tâches de fond.

### ⚙️ E3 — Permission middleware côté API

Créer un middleware RBAC complet côté serveur au lieu de se fier au frontend. Toutes les permissions doivent être vérifiées côté serveur (détail en I1).

### ⚙️ E4 — Idempotency keys systématiques

Toutes les mutations critiques (ventes, réceptions, paiements) doivent accepter un `X-Idempotency-Key` header pour éviter les doublons réseau (détail en I15).

### ⚙️ E5 — Métriques de synchronisation

Ajouter un tableau de bord dans le panel admin qui affiche :
- Nombre de sync en erreur par utilisateur
- Volume de la dead letter queue globale
- Taux de succès des sync par entité
