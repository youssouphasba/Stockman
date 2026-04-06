# Roadmap API d'Integration Enterprise

Date de mise a jour : 2026-04-05
Statut : vision long terme a implementer quand la base clients enterprise le justifie

Ce document cadre la future API d'integration destinee aux entreprises,
partenaires et outils tiers qui veulent se connecter a Stockman.

## Objectif

Fournir une API stable, versionnee, securisee et lisible pour les outils tiers,
sans exposer directement l'API interne mobile et web.

Positionnement retenu :

- API interne existante = `mobile + web-app + futures apps Stockman`
- API d'integration entreprise = `ERP / BI / no-code / e-commerce / outils maison`
- API marketplace = `annuaires partenaires / fournisseurs publies / ecosysteme`
- webhooks = propagation temps reel des changements

Namespaces publics recommandes :

- `/api/integrations/v1/...`
- `/api/marketplace/v1/...`

## Etat actuel du projet

Aujourd'hui, Stockman dispose deja d'une API interne exploitee par :

- l'application mobile
- la web app
- les tests Postman et les outils de debug internes

Cette API interne couvre deja plusieurs domaines :

- authentification
- boutiques
- produits
- ventes
- clients
- analytics
- notifications
- abonnement
- import catalogue asynchrone et reprenable

Cette API reste cependant une API interne :

- non versionnee comme un contrat public
- orientee besoins mobile et web
- basee sur l'auth utilisateur classique
- susceptible d'evoluer avec l'UX et les flux internes

Conclusion :

- l'API interne peut continuer a servir les applications Stockman
- la future app de livraison Stockman devra s'appuyer sur cette API interne
- l'API externe d'integration doit etre construite comme une facade stable
- l'API marketplace doit etre separee des donnees privees des entreprises

## Trois familles d'API

### 1. API interne

Pour :

- application mobile Stockman
- web app Stockman
- future app de livraison Stockman
- outils internes et debug

Caracteristiques :

- auth utilisateur
- logique metier partagee
- evolution rapide possible
- pas de promesse de stabilite publique

### 2. API externe entreprise

Pour :

- ERP
- Odoo
- outils comptables
- Power BI
- Zapier / Make / n8n
- outils prives des clients enterprise

Caracteristiques :

- plan Enterprise uniquement
- versionnee
- stable
- auth par cle API
- scopes par ressource
- restriction par boutique
- contrat public propre

Regle absolue :

- une entreprise ne peut acceder qu'a ses propres donnees

### 3. API marketplace

Pour :

- fournisseurs publies dans l'ecosysteme
- partenaires logistiques
- annuaires de sourcing
- services publies dans la marketplace

Caracteristiques :

- expose uniquement des donnees volontairement publiees
- ne doit jamais exposer les donnees privees d'une entreprise
- peut etre publique, semi-publique ou reservee a des partenaires

Regle absolue :

- ne pas melanger `suppliers` prives entreprise et `suppliers` publies marketplace

Note :

- la marketplace n'est pertinente que quand l'ecosysteme Stockman a suffisamment de fournisseurs et partenaires actifs
- ne pas implementer avant d'avoir une base clients enterprise solide

## Principes produit

### 1. Compte entreprise comme source de verite

L'API d'integration doit etre rattachee au `BusinessAccount`, pas a un utilisateur
individuel.

Consequences :

- les integrations appartiennent a `account_id`
- les scopes et limites sont portes par le compte
- les cles API survivent au changement d'utilisateur
- les responsables peuvent tourner sans casser l'integration
- les outils tiers comme Odoo doivent etre rattaches a l'entreprise, pas a une session utilisateur individuelle

### 2. Scope boutique explicite

L'API doit respecter le modele multi-boutiques et les permissions par boutique.

Regles :

- une cle peut etre globale compte ou limitee a certaines boutiques
- un endpoint peut exiger `store_id`
- les reponses doivent toujours rester dans le perimetre autorise
- une cle ne doit jamais permettre de sortir du perimetre `account_id`

### 3. Contrat stable et propre

Les payloads publics ne doivent pas reprendre les structures internes brutes.

On expose :

- des objets stables
- des statuts explicites
- des timestamps ISO
- des erreurs homogenes
- des champs `external_id` pour les syncs bidirectionnels

### 4. Pas de duplication des regles metier

Les routes d'integration doivent appeler la meme logique metier que le web et le mobile.

But :

- eviter les divergences
- garder les calculs TVA, stock, statuts et permissions coherents

## Cas d'usage cibles

### Applications Stockman futures

- app de livraison Stockman
- app terrain Stockman
- apps verticales internes a l'ecosysteme Stockman

### ERP et comptabilite

- `Odoo`
- `QuickBooks`
- outils comptables locaux

### No-code et automatisation

- `Zapier`
- `n8n`
- `Make`

### BI et reporting

- `Power BI`
- `Looker Studio`
- `Google Sheets`

### E-commerce et omnicanal

- `Shopify`
- `WooCommerce`
- site custom

### Outils internes clients

- dashboards internes
- scripts de reappro
- apps de supervision ou de terrain

## Sur quelles fonctionnalites batir l'API externe

L'API externe ne doit pas etre une copie brute de l'API interne. Elle doit etre
construite autour des cas d'usage tiers les plus rentables.

### 1. Authentification et securite

- cles API dediees
- scopes
- restrictions par boutique
- rotation et revocation
- rate limiting
- logs
- idempotence

Exemples :

- connecter Odoo a un compte Stockman
- limiter une cle a la lecture analytics
- limiter une cle a certaines boutiques seulement

### 2. Ressources metier centrales

- boutiques
- produits
- stock
- ventes
- clients
- plus tard fournisseurs et commandes d'achat

Exemples :

- un ERP synchronise les produits
- une caisse externe pousse les ventes
- Power BI lit les indicateurs de performance

### 3. Synchronisation fiable

- `external_id`
- `updated_since`
- pagination
- filtres standards
- webhooks

Exemples :

- ne recuperer que les produits modifies depuis la derniere synchro
- eviter les doublons lors d'une creation distante
- reagir a `sale.completed` sans polling permanent

### 4. Analytics en lecture seule

- executive overview
- stock health
- procurement
- comparaison des boutiques
- KPI CRM

Exemples :

- dashboard direction
- reporting franchise
- suivi procurement par une equipe finance

### 5. Webhooks

- `product.updated`
- `stock.changed`
- `sale.completed`
- `customer.updated`
- `purchase_order.updated`

Exemples :

- notifier un ERP
- synchroniser un e-commerce
- declencher un workflow no-code

## Acces

L'API externe d'integration est reservee au plan `Enterprise`.
Les plans Starter et Pro n'y ont pas acces.

Le guard backend doit verifier `plan === 'enterprise'` sur chaque route d'integration.

## Rate limits

| Niveau | Requetes / minute | Requetes / jour |
|---|---:|---:|
| Enterprise par defaut | 100 | 50 000 |
| Enterprise etendu | 500 | 200 000 |
| Partenaire certifie | 1 000 | 500 000 |

Les depassements retournent `429 Too Many Requests` avec un header `Retry-After`.

## Ce qu'une entreprise peut ou ne peut pas voir

### Donnees privees entreprise

Exposees seulement via l'API externe entreprise :

- boutiques de l'entreprise
- produits de l'entreprise
- stock de l'entreprise
- ventes de l'entreprise
- clients de l'entreprise
- fournisseurs prives de l'entreprise
- commandes d'achat de l'entreprise

Exemple :

- l'instance Odoo d'une pharmacie peut acceder aux donnees de cette pharmacie
- elle ne peut jamais acceder aux donnees d'une autre entreprise

### Donnees marketplace publiees

Exposees via l'API marketplace :

- fournisseurs publies dans la marketplace
- profils publics
- categories
- zones desservies
- services publies

Exemple :

- une entreprise logistique peut consulter les fournisseurs publies dans la marketplace
- elle ne doit pas voir les fournisseurs prives internes d'un client Stockman

## Tableau de cadrage des API

| Ressource | Type d'API | Qui l'utilise | Lecture / ecriture | Phase |
|---|---|---|---|---|
| `auth utilisateur` | Interne | mobile, web app, future app livraison | lecture + ecriture | existant |
| `stores` | Externe entreprise | ERP, BI, outils internes client | lecture | MVP |
| `products` | Externe entreprise | ERP, e-commerce, Odoo | lecture + ecriture | MVP |
| `inventory levels` | Externe entreprise | ERP, e-commerce, app logistique cliente | lecture | MVP |
| `inventory movements` | Externe entreprise | caisse externe, ERP stock | lecture + ecriture | MVP |
| `sales` | Externe entreprise | caisse externe, ERP, comptabilite | lecture + ecriture | MVP |
| `customers` | Externe entreprise | CRM, ERP, fidelite | lecture + ecriture | MVP |
| `analytics executive` | Externe entreprise | BI, direction, franchise | lecture | MVP |
| `analytics stock` | Externe entreprise | BI, supply, supervision | lecture | MVP |
| `webhooks` | Externe entreprise | ERP, no-code, partenaires techniques | ecriture config + reception evenements | MVP |
| `suppliers` prives | Externe entreprise | ERP achats, outils procurement du client | lecture + ecriture | Phase 2 |
| `purchase_orders` | Externe entreprise | ERP achats, approvisionnement | lecture + ecriture | Phase 2 |
| `documents` | Externe entreprise | comptabilite, audit, back-office | lecture | Phase 2 |
| `logs et replay` | Externe entreprise | debug, audit technique | lecture | Phase 2 |
| `app livraison Stockman` | Interne | ecosysteme Stockman | lecture + ecriture | Phase 2 |
| `suppliers` publies marketplace | Marketplace | logisticiens, partenaires, annuaires | lecture | Phase 3 |
| `catalogue marketplace` | Marketplace | partenaires, comparateurs, sourcing | lecture | Phase 3 |
| `services logistiques` publies | Marketplace | fournisseurs, distributeurs | lecture | Phase 3 |

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
- modules metier partages utilises par ventes, stock, clients, fournisseurs et documents

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

Creer ou modifier des integrations doit etre reserve a :

- `org_admin`
- et plus tard `billing_admin` seulement si la partie abonnement API est exposee

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

### API externe entreprise

#### Stores

- `GET /api/integrations/v1/stores`
- `GET /api/integrations/v1/stores/{store_id}`

#### Products

- `GET /api/integrations/v1/products`
- `GET /api/integrations/v1/products/{product_id}`
- `POST /api/integrations/v1/products`
- `PUT /api/integrations/v1/products/{product_id}`

Exemple de reponse `GET /api/integrations/v1/products/{product_id}` :

```json
{
  "product_id": "prod_a1b2c3d4e5f6",
  "name": "Paracetamol 500mg",
  "sku": "PARA-500",
  "quantity": 145,
  "unit": "boite",
  "purchase_price": 1500,
  "selling_price": 2500,
  "category": { "id": "cat_abc123", "name": "Medicaments" },
  "store_id": "store_xyz789",
  "external_id": null,
  "is_active": true,
  "created_at": "2026-03-15T10:30:00Z",
  "updated_at": "2026-04-01T14:22:00Z"
}
```

#### Inventory

- `GET /api/integrations/v1/inventory/levels`
- `GET /api/integrations/v1/inventory/movements`
- `POST /api/integrations/v1/inventory/movements`

#### Sales

- `GET /api/integrations/v1/sales`
- `GET /api/integrations/v1/sales/{sale_id}`
- `POST /api/integrations/v1/sales`

Exemple de reponse `GET /api/integrations/v1/sales/{sale_id}` :

```json
{
  "sale_id": "sale_f7g8h9i0j1k2",
  "status": "completed",
  "items": [
    {
      "product_id": "prod_a1b2c3d4e5f6",
      "name": "Paracetamol 500mg",
      "quantity": 2,
      "unit_price": 2500,
      "total": 5000
    }
  ],
  "total_amount": 5000,
  "payment_method": "cash",
  "customer_id": "cust_m3n4o5p6",
  "store_id": "store_xyz789",
  "external_id": null,
  "created_at": "2026-04-05T09:15:00Z"
}
```

#### Customers

- `GET /api/integrations/v1/customers`
- `GET /api/integrations/v1/customers/{customer_id}`
- `POST /api/integrations/v1/customers`
- `PUT /api/integrations/v1/customers/{customer_id}`

#### Suppliers et procurement

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

### Evenements Phase 2

- `invoice.created`
- `purchase_order.updated`
- `purchase_order.created`

### Payload recommande

```json
{
  "event_id": "evt_q7r8s9t0u1v2",
  "event_type": "sale.completed",
  "occurred_at": "2026-04-05T09:15:00Z",
  "account_id": "acc_w3x4y5z6",
  "store_id": "store_xyz789",
  "resource_id": "sale_f7g8h9i0j1k2",
  "data": { "...": "payload complet de la ressource" }
}
```

### Exigences

- signature HMAC (`X-Stockman-Signature`)
- retries avec backoff exponentiel : 10s, 60s, 300s
- statut de livraison
- journalisation des erreurs
- possibilite de rejouer un webhook depuis l'admin web

## Contrat technique

### Pagination

Tous les listings doivent etre pagines.

Recommandation :

- `limit` max 100, defaut 50
- `cursor` ou `next_cursor`

### Filtrage

Exposer des filtres simples et standards :

- `store_id`
- `updated_since`
- `status`
- `start_date`
- `end_date`

### Erreurs

Schema d'erreurs stable :

```json
{
  "code": "INVALID_SCOPE",
  "message": "La cle API n'a pas le scope products:write",
  "details": { "required_scope": "products:write" },
  "request_id": "req_a1b2c3"
}
```

Codes HTTP utilises :

| Code | Usage |
|---:|---|
| 200 | Succes |
| 201 | Ressource creee |
| 400 | Requete invalide |
| 401 | Cle API manquante ou invalide |
| 403 | Scope insuffisant ou boutique non autorisee |
| 404 | Ressource introuvable |
| 409 | Conflit, idempotence ou doublon |
| 429 | Rate limit depasse |
| 500 | Erreur serveur |

### Idempotence

Tous les `POST` et `PUT` critiques doivent supporter `X-Idempotency-Key`.

### Mapping externe

Tous les objets synchronisables doivent supporter `external_id`.

### Versioning

Toujours exposer `v1` des le debut.

### Export et gros volumes

Prevoir plus tard :

- exports async
- rapports pre-generes
- limitation des gros scans synchrones

## Facturation et disponibilite

### Politique d'acces

L'API externe d'integration est reservee au plan `Enterprise`.

Regles :

- seuls les comptes `Enterprise` peuvent activer des integrations externes
- seuls les comptes `Enterprise` peuvent generer et gerer des cles API
- les integrations sont rattachees au `BusinessAccount`, pas a un utilisateur individuel
- si le plan n'est plus `Enterprise`, les nouvelles activations sont bloquees
- les cles existantes peuvent etre suspendues ou placees en lecture seule selon la politique commerciale retenue

### Ce que comprend l'acces API Enterprise

Le plan `Enterprise` peut inclure :

- acces a l'API externe entreprise
- cles API dediees
- scopes configurables
- restriction par boutique
- webhooks
- logs de base d'integration
- support de l'idempotence sur les ecritures critiques

### Quotas de base a definir

Le plan `Enterprise` doit prevoir des quotas de base, par exemple :

- nombre de cles API
- nombre de requetes par mois
- nombre de webhooks actifs
- nombre de livraisons webhook par mois

Les quotas exacts seront definis plus tard selon l'usage reel.

### Evolution future possible

Plus tard, Stockman pourra ajouter :

- options de volume supplementaire
- logs avances
- replay de webhooks
- SLA et support prioritaire
- connecteurs prets a l'emploi

## Compatibilite avec l'existant

- ne pas casser l'API actuelle `/api/...`
- ne pas exposer les payloads internes tels quels
- factoriser la logique metier commune
- garder les routes d'integration comme facade stable
- respecter les scopes boutique et `BusinessAccount`
- utiliser l'API interne comme base de logique metier pour la future app livraison
- separer clairement les donnees marketplace des donnees privees entreprise

## Phases d'implementation

### MVP - API externe entreprise

Prerequis :

- base clients enterprise active
- demande reelle d'integration
- priorite business justifiee

Acces :

- plan `Enterprise` uniquement

Contenu MVP :

1. Auth par cle API, scopes et guard `plan === 'enterprise'`
2. `stores` en lecture
3. `products` en lecture et ecriture
4. `inventory` en lecture et ecriture
5. `sales` en lecture et ecriture
6. `customers` en lecture et ecriture
7. `analytics` en lecture seule
8. `webhooks` en configuration et reception

### Phase 2 - Extension entreprise

1. `suppliers` prives
2. `purchase_orders`
3. `documents`
4. logs et replay webhooks
5. app de livraison Stockman via API interne

### Phase 3 - Marketplace et avance

1. API marketplace
2. OAuth2 si necessaire
3. connecteurs prets a l'emploi
4. exports async
5. templates Postman
6. portail docs public ou partenaire
7. quotas differencies selon le plan

## Decisions prises

| Question | Reponse |
|---|---|
| OAuth2 des le depart ? | Non. Les API keys suffisent pour le MVP. OAuth2 en Phase 3 si necessaire. |
| Mode sandbox ou test ? | Non au depart. Des cles de test avec prefixe `stk_test_` suffisent. |
| Multi-environnements par integration ? | Non. Un seul environnement par cle, differencie par le prefixe. |
| Quotas par plan ? | Oui, des le MVP, voir section Rate limits. |

## UX web a prevoir

L'ecran `Integrations` du web Enterprise doit permettre :

- creer une integration
- choisir les scopes
- limiter par boutique
- generer une cle
- revoquer ou tourner une cle
- configurer des webhooks
- voir les logs d'appel
- rejouer des webhooks
- tester l'API avec exemples `curl`

## Conclusion

Stockman doit a terme s'appuyer sur trois couches coherentes :

- API interne pour l'ecosysteme Stockman
- API externe entreprise pour les donnees privees des clients
- API marketplace pour les donnees publiees dans l'ecosysteme

L'API externe d'integration doit etre pensee comme un produit Enterprise a part entiere :

- stable
- versionnee
- scopee compte et boutique
- securisee
- lisible
- exploitable par des outils tres differents

Elle doit prolonger Stockman comme plateforme, sans exposer les donnees privees
d'une entreprise a une autre, et sans melanger API entreprise et API marketplace.
