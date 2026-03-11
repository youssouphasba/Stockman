# Roadmap API d'Integration Enterprise

Date de mise a jour : 2026-03-11
Statut : planifie, non implemente

Ce document fige une version amelioree de l'API d'integration destinee aux
entreprises qui veulent connecter Stockman a leurs outils existants.

## Objectif

Fournir une API stable, versionnee, securisee et lisible pour les outils tiers,
sans exposer l'API interne mobile/web telle quelle.

Positionnement retenu :

- API interne existante = `mobile + web-app`
- API d'integration = `ERP / BI / no-code / e-commerce / outils maison`
- webhooks = propagation temps reel des changements

Namespace public recommande :

- `/api/integrations/v1/...`

## Principes produit

### 1. Compte entreprise comme source de verite

L'API d'integration doit etre rattachee au `BusinessAccount`, pas a un utilisateur
individuel.

Conséquences :

- les integrations appartiennent a `account_id`
- les scopes et limites sont portes par le compte
- les cles API survivent au changement d'utilisateur
- les responsables peuvent tourner sans casser l'integration

### 2. Scope boutique explicite

L'API doit respecter le modele multi-boutiques et les permissions par boutique.

Regles :

- une cle peut etre globale compte ou limitee a certaines boutiques
- un endpoint peut exiger `store_id`
- les reponses doivent toujours rester dans le perimetre autorise

### 3. Contrat stable et propre

Les payloads publics ne doivent pas reprendre les structures internes brutes.

On expose :

- des objets stables
- des statuts explicites
- des timestamps ISO
- des erreurs homogenes
- des champs `external_id` pour les syncs bidirectionnels

### 4. Pas de duplication des regles metier

Les routes d'integration doivent appeler la meme logique metier que le web/mobile.

But :

- eviter les divergences
- garder les calculs TVA, stock, statuts et permissions coherents

## Cas d'usage cibles

### ERP / comptabilite

- `Odoo`
- `QuickBooks`
- outils comptables locaux

### No-code / automatisation

- `Zapier`
- `n8n`
- `Make`

### BI / reporting

- `Power BI`
- `Looker Studio`
- `Google Sheets`

### E-commerce / vente omnicanale

- `Shopify`
- `WooCommerce`
- site custom

### Outils internes

- dashboards internes
- scripts de reappro
- apps de supervision ou de terrain

## Architecture cible

### Backend a creer

- `backend/integrations_models.py`
- `backend/integrations_auth.py`
- `backend/integrations_service.py`
- `backend/integrations_router.py`
- `backend/integrations_admin_router.py`
- `backend/integrations_webhooks.py`
- `backend/integrations_schema.py`

### Backend a modifier

- `backend/server.py`
- `backend/enterprise_access.py`
- modules metier partages utilises par ventes, stock, clients, fournisseurs, documents

### Web Enterprise a prevoir

- `web-app/src/components/Integrations.tsx`
- `web-app/src/components/integrations/ApiKeysPanel.tsx`
- `web-app/src/components/integrations/WebhooksPanel.tsx`
- `web-app/src/components/integrations/LogsPanel.tsx`
- `web-app/src/components/integrations/IntegrationDocsPanel.tsx`
- `web-app/src/components/integrations/ReplayPanel.tsx`
- `web-app/src/services/integrationsApi.ts`

## Securite

### Authentification

Utiliser des `API keys` dediees.

Header recommande :

- `Authorization: Bearer stk_live_xxx`

### Regles obligatoires

- hash des cles
- affichage du secret une seule fois
- expiration optionnelle
- rotation et revocation
- rate limiting
- audit complet des appels
- signature HMAC des webhooks
- `X-Idempotency-Key` sur les ecritures

### Modele de gouvernance

Creer/modifier des integrations doit etre reserve a :

- `org_admin`
- et plus tard `billing_admin` seulement si tu veux exposer la partie abonnement API

### Scope et permissions

Chaque cle porte :

- `account_id`
- `scopes`
- `allowed_store_ids`
- limites techniques

Exemples de protections :

- lecture analytics consolidee = scope dedie
- ecriture inventaire = scope + boutique autorisee
- documents comptables = scopes plus sensibles

## Modeles a introduire

### IntegrationApp

- `integration_id`
- `account_id`
- `name`
- `provider`
- `status`
- `description`
- `environment`
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
- `last_ip`
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
- `retry_policy`
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
- `metadata`
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

### IntegrationWebhookDelivery

- `delivery_id`
- `webhook_id`
- `event_type`
- `payload_hash`
- `status`
- `attempt_count`
- `last_attempt_at`
- `last_status_code`
- `response_excerpt`

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
- `purchase_orders:read`
- `purchase_orders:write`
- `documents:read`
- `documents:write`
- `analytics:read`
- `analytics:consolidated`
- `webhooks:write`

## Ressources v1 recommandees

### Admin interne Enterprise

- `GET /api/integrations/apps`
- `POST /api/integrations/apps`
- `GET /api/integrations/apps/{integration_id}`
- `PUT /api/integrations/apps/{integration_id}`
- `POST /api/integrations/apps/{integration_id}/keys`
- `POST /api/integrations/apps/{integration_id}/rotate-key`
- `POST /api/integrations/apps/{integration_id}/webhooks`
- `GET /api/integrations/apps/{integration_id}/logs`
- `GET /api/integrations/apps/{integration_id}/deliveries`

### API publique

#### Stores

- `GET /api/integrations/v1/stores`
- `GET /api/integrations/v1/stores/{store_id}`

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

#### Suppliers / procurement

- `GET /api/integrations/v1/suppliers`
- `GET /api/integrations/v1/purchase-orders`
- `GET /api/integrations/v1/purchase-orders/{order_id}`
- `POST /api/integrations/v1/purchase-orders`

#### Documents

- `GET /api/integrations/v1/invoices`
- `GET /api/integrations/v1/invoices/{invoice_id}`
- `GET /api/integrations/v1/receipts/{receipt_id}`

#### Analytics

- `GET /api/integrations/v1/analytics/executive`
- `GET /api/integrations/v1/analytics/stores`
- `GET /api/integrations/v1/analytics/stock-health`
- `GET /api/integrations/v1/analytics/procurement`

#### Webhooks

- `GET /api/integrations/v1/webhooks`
- `POST /api/integrations/v1/webhooks`
- `DELETE /api/integrations/v1/webhooks/{webhook_id}`
- `POST /api/integrations/v1/webhooks/test`

## Webhooks

### Evenements MVP

- `product.created`
- `product.updated`
- `stock.changed`
- `sale.completed`
- `customer.created`
- `customer.updated`
- `invoice.created`
- `purchase_order.updated`

### Payload recommande

- `event_id`
- `event_type`
- `occurred_at`
- `account_id`
- `store_id`
- `resource_id`
- `data`

### Exigences

- signature HMAC
- retries
- statut de livraison
- journalisation des erreurs
- possibilite de rejouer un webhook depuis l'admin web

## Contrat technique

### Pagination

Tous les listings doivent etre pagines.

Recommendation :

- `limit`
- `cursor` ou `next_cursor`

### Filtrage

Exposer des filtres simples et standards :

- `store_id`
- `updated_since`
- `status`
- `start_date`
- `end_date`

### Idempotence

Tous les `POST` et `PUT` critiques doivent supporter `X-Idempotency-Key`.

### Mapping externe

Tous les objets synchronisables doivent supporter `external_id`.

### Versioning

Toujours exposer `v1` des le debut.

### Erreurs

Schema d'erreurs stable recommande :

- `code`
- `message`
- `details`
- `request_id`

### Export / gros volumes

Prevoir plus tard :

- exports async
- rapports pre-generes
- limitation des gros scans synchrones

## Compatibilite avec l'existant

- ne pas casser l'API actuelle `/api/...`
- ne pas exposer les payloads internes tels quels
- factoriser la logique metier commune
- garder les routes d'integration comme facade stable
- respecter les scopes boutique et `BusinessAccount`

## MVP recommande

Le premier lot le plus rentable :

1. `stores`
2. `products`
3. `inventory`
4. `sales`
5. `webhooks`
6. `analytics read-only`

## Phase 2

1. `customers`
2. `suppliers`
3. `purchase_orders`
4. `documents`
5. `logs et replay`

## Phase 3

1. OAuth2 si necessaire
2. connecteurs prets a l'emploi
3. exports async
4. templates Postman
5. portail docs public/partner

## UX web a prevoir

L'ecran `Integrations` du web Enterprise doit permettre :

- creer une integration
- choisir les scopes
- limiter par boutique
- generer une cle
- revoquer / tourner une cle
- configurer des webhooks
- voir les logs d'appel
- rejouer des webhooks
- tester l'API avec exemples `curl`

## Questions a figer plus tard

- faut-il un mode sandbox / test ?
- faut-il supporter OAuth2 des le depart ou plus tard ?
- faut-il permettre plusieurs environnements par integration ?
- faut-il des quotas differents selon le plan Enterprise ?

## Conclusion

L'API d'integration doit etre pensee comme un produit Enterprise a part entiere :

- stable
- versionnee
- scoppée compte + boutique
- securisee
- lisible
- exploitable par des outils tres differents

Elle doit prolonger Stockman comme plateforme, pas seulement ouvrir quelques
routes REST.
