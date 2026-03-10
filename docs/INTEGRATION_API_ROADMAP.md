# Roadmap API d'Integration Enterprise

Date de preparation : 2026-03-10
Statut : planifie, non implemente

Ce document fige le plan de l'API d'integration destinee aux entreprises qui souhaitent connecter Stockman a leurs outils existants.

## Objectif

Fournir une API stable, versionnee et securisee pour les outils tiers, sans exposer directement l'API interne utilisee par le mobile et le web.

Positionnement :
- API interne actuelle : pour les clients Stockman `mobile + web`
- API d'integration : pour les outils tiers des entreprises
- Webhooks : pour pousser les evenements vers leurs systemes

Namespace recommande :
- `/api/integrations/v1/...`

---

## Vision produit

L'API d'integration doit permettre a une entreprise de :
- lire ses boutiques
- synchroniser ses produits
- lire et pousser ses mouvements de stock
- lire ou injecter certaines ventes
- synchroniser clients et fournisseurs
- recuperer des indicateurs analytics
- recevoir des webhooks temps reel

Exemples d'outils cibles :
- ERP : `Odoo`
- comptabilite : `QuickBooks`
- automation : `Zapier`, `n8n`, `Make`
- BI : `Power BI`, `Looker Studio`
- e-commerce : `Shopify`
- outils internes maison

---

## Architecture cible

### Separation claire

- conserver l'API applicative existante pour les clients Stockman
- exposer une API publique d'integration dediee
- garder un contrat externe propre, stable et versionne

### Briques backend a creer

- `backend/integrations_models.py`
- `backend/integrations_auth.py`
- `backend/integrations_service.py`
- `backend/integrations_router.py`
- `backend/integrations_admin_router.py`
- `backend/integrations_webhooks.py`

### Briques a modifier

- `backend/server.py`
- `backend/enterprise_access.py`

### Ecran web Enterprise a prevoir

- `web-app/src/components/Integrations.tsx`
- `web-app/src/components/integrations/ApiKeysPanel.tsx`
- `web-app/src/components/integrations/WebhooksPanel.tsx`
- `web-app/src/components/integrations/LogsPanel.tsx`
- `web-app/src/components/integrations/IntegrationDocsPanel.tsx`
- `web-app/src/services/integrationsApi.ts`

---

## Modele de securite

### Authentification

Utiliser des `API keys` dediees aux integrations.

Header recommande :
- `Authorization: Bearer stk_live_xxx`

### Principes

- une entreprise peut creer plusieurs integrations
- une integration peut avoir plusieurs cles
- chaque cle a :
  - des scopes
  - un scope magasin
  - une date d'expiration optionnelle
  - un statut actif ou revoque

### Bonnes pratiques obligatoires

- stocker les cles hashées
- afficher le secret une seule fois a la creation
- permettre rotation et revocation
- journaliser tous les appels
- limiter le debit par integration
- signer les webhooks en HMAC
- utiliser `X-Idempotency-Key` sur les ecritures critiques

---

## Modeles a introduire

### IntegrationApp

- `integration_id`
- `account_id`
- `name`
- `provider`
- `status`
- `scopes`
- `allowed_store_ids`
- `created_by`
- `created_at`
- `updated_at`

### IntegrationApiKey

- `key_id`
- `integration_id`
- `account_id`
- `name`
- `key_prefix`
- `key_hash`
- `scopes`
- `allowed_store_ids`
- `last_used_at`
- `expires_at`
- `revoked_at`
- `created_at`

### IntegrationWebhookSubscription

- `webhook_id`
- `integration_id`
- `account_id`
- `url`
- `events`
- `secret_hash`
- `status`
- `last_delivery_at`
- `last_status_code`
- `failure_count`
- `created_at`

### IntegrationExternalMapping

- `mapping_id`
- `account_id`
- `integration_id`
- `resource_type`
- `internal_id`
- `external_id`
- `store_id`
- `created_at`

### IntegrationRequestLog

- `request_id`
- `integration_id`
- `account_id`
- `method`
- `path`
- `status_code`
- `store_id`
- `latency_ms`
- `idempotency_key`
- `created_at`

---

## Scopes recommandes

- `stores:read`
- `products:read`
- `products:write`
- `inventory:read`
- `inventory:write`
- `sales:read`
- `sales:write`
- `customers:read`
- `customers:write`
- `suppliers:read`
- `suppliers:write`
- `analytics:read`
- `webhooks:write`

---

## Endpoints v1 recommandes

### Admin interne Enterprise

- `GET /api/integrations/apps`
- `POST /api/integrations/apps`
- `PUT /api/integrations/apps/{integration_id}`
- `POST /api/integrations/apps/{integration_id}/keys`
- `POST /api/integrations/apps/{integration_id}/webhooks`
- `GET /api/integrations/apps/{integration_id}/logs`

### API publique

#### Stores
- `GET /api/integrations/v1/stores`

#### Products
- `GET /api/integrations/v1/products`
- `GET /api/integrations/v1/products/{product_id}`
- `POST /api/integrations/v1/products`
- `PUT /api/integrations/v1/products/{product_id}`

#### Inventory
- `GET /api/integrations/v1/inventory/levels`
- `GET /api/integrations/v1/inventory/movements`
- `POST /api/integrations/v1/inventory/movements`

#### Sales
- `GET /api/integrations/v1/sales`
- `GET /api/integrations/v1/sales/{sale_id}`
- `POST /api/integrations/v1/sales`

#### Customers
- `GET /api/integrations/v1/customers`
- `GET /api/integrations/v1/customers/{customer_id}`
- `POST /api/integrations/v1/customers`
- `PUT /api/integrations/v1/customers/{customer_id}`

#### Suppliers
- `GET /api/integrations/v1/suppliers`
- `GET /api/integrations/v1/purchase-orders`

#### Analytics
- `GET /api/integrations/v1/analytics/executive`
- `GET /api/integrations/v1/analytics/stores`
- `GET /api/integrations/v1/analytics/stock-health`

#### Webhooks
- `GET /api/integrations/v1/webhooks`
- `POST /api/integrations/v1/webhooks`
- `DELETE /api/integrations/v1/webhooks/{webhook_id}`
- `POST /api/integrations/v1/webhooks/test`

---

## Webhooks

### Evenements MVP

- `product.created`
- `product.updated`
- `stock.changed`
- `sale.completed`
- `customer.created`
- `customer.updated`
- `purchase_order.updated`

### Payload recommande

- `event_id`
- `event_type`
- `occurred_at`
- `account_id`
- `store_id`
- `data`

### Exigences

- signature HMAC
- retries
- statut de livraison
- journalisation des erreurs

---

## Contrat technique

### Pagination

Tous les endpoints de listing doivent etre pagines.

### Idempotence

Tous les `POST` et `PUT` critiques doivent supporter `X-Idempotency-Key`.

### Mapping externe

Prevoir une couche `external_id` pour relier les objets Stockman aux IDs des systemes tiers.

### Versioning

Ne rien exposer sans version :
- `v1` obligatoire des le debut

### Erreurs

Definir un schema d'erreurs stable et reutilisable.

---

## Compatibilite avec l'existant

- ne pas casser l'API actuelle `/api/...`
- ne pas exposer les payloads internes tels quels
- factoriser la logique metier commune au lieu de la dupliquer
- garder les routes d'integration comme facade stable

---

## MVP recommande

Le premier lot le plus rentable :
1. `stores`
2. `products`
3. `inventory`
4. `sales`
5. `webhooks`
6. `analytics read-only`

Ce MVP couvre les besoins les plus probables :
- synchronisation ERP
- automation
- reporting BI
- integrateurs no-code

---

## Ordre d'implementation recommande

### Phase 1

- modeles Mongo
- index
- auth API key
- scopes
- scope magasin

### Phase 2

- admin routes internes
- creation d'integration
- generation de cles
- gestion webhooks
- logs d'acces

### Phase 3

- endpoints read-only :
  - stores
  - products
  - inventory
  - sales

### Phase 4

- webhooks sortants

### Phase 5

- endpoints write :
  - products
  - inventory movements
  - customers
  - sales si conserve dans le perimetre

### Phase 6

- analytics read-only
- docs OpenAPI
- collection Postman
- page web Enterprise `Integrations`

---

## Validation

Cas de test a couvrir :
- une cle sans scope `inventory:read` ne lit pas le stock
- une cle scopee sur un seul magasin ne lit pas un autre magasin
- une cle expiree est rejetee
- un webhook signe est verifiable cote client
- un `POST` idempotent ne cree pas deux ressources
- une integration peut retrouver ses objets via `external_id`

---

## Suivi admin recommande plus tard

Dans l'interface web Enterprise, l'ecran `Integrations` devra permettre :
- creer une integration
- generer ou revoquer une cle
- choisir les scopes
- limiter par magasin
- voir les logs
- gerer les webhooks
- afficher des exemples `curl`
- suivre les erreurs de livraison webhook

---

## Resume operationnel

### Priorite
Moyenne a haute, surtout pour Enterprise

### Valeur business
- rend Stockman interoperable
- augmente la valeur Enterprise
- reduit la friction pour les clients equipes
- ouvre des usages BI, ERP, compta, e-commerce et automation

## Rappel pratique

Ce plan est enregistre ici :
- `docs/INTEGRATION_API_ROADMAP.md`

Quand on voudra reprendre, il suffira de dire :
- `reprends le plan API`
- `on implemente le MVP API`
- `on commence par les API keys et scopes`
