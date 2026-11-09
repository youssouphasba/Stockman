# Stockman et Denkma Pro : fonctionnement technique

Note d'exploitation pour l'équipe. Le parcours côté commerçant et client est décrit dans `backend/docs/ecommerce-denkma.md`.

## Principe

Stockman est une boutique partenaire de l'API Denkma Pro (`/api/integrations/v1`, plateforme `custom_api`, domaine de boutique `app.stockman.pro`), comme le module WooCommerce. Aucune modification de Denkma n'est nécessaire.

- Connexion : `POST /api/ecommerce/denkma/connect` renvoie l'adresse `https://api.denkma.com/pro/?connect=1&platform=custom_api&domain=app.stockman.pro&return_url=…&state=…`. Denkma redirige vers `https://app.stockman.pro/api/public/ecommerce/denkma/connected?code=…&state=…` ; Stockman échange le code (`POST /connect/exchange`) en donnant l'adresse d'événements `…/api/public/ecommerce/denkma/events/{hook_id}`. La clé et le secret d'événements sont chiffrés (Fernet, clé dérivée de `JWT_SECRET`) dans `business_accounts.ecommerce_denkma`. Changer `JWT_SECRET` impose de reconnecter Denkma.
- Vitrine : `GET /api/public/ecommerce/{slug}/delivery` (prix « à partir de », modes finançables seulement, cache de 10 minutes), `POST …/delivery/session` (session de destination Denkma, intégrée seulement si la page est sur `https://app.stockman.pro`), `GET …/delivery/session/{id}` (confirmation et prix). La commande envoie `delivery.destination_session_id` ; le serveur revérifie le prix, ajoute `delivery_fee` et `amount_due`, puis enregistre la commande chez Denkma (`PUT /orders/{order_id}` avec la session, puis devis garanti). Un échec est conservé (`delivery.status = sync_failed`) et repris à l'expédition, tant que la session (30 minutes) est valable.
- Expédition : `POST /api/ecommerce/orders/{id}/denkma/ship` (multipart : `customer_paid`, `photo`) enchaîne `payment-confirmed`, nouveau devis et réservation si le prix a expiré, photo, `prepared`, `dispatch`. `POST …/denkma/refresh` relit la commande Denkma.
- Événements : signature `X-Denkma-Signature` (HMAC-SHA256 de `t.corps`, tolérance 10 minutes), dédoublonnage par identifiant d'événement. `parcel_status = delivered` passe la commande à « livrée » et crée la vente.
- Sécurité de la vitrine : `frame-src` et `Permissions-Policy` autorisent seulement `https://api.denkma.com` pour la carte et sa géolocalisation.

## Configuration

`DENKMA_API_URL` (facultatif, défaut `https://api.denkma.com`). `JWT_SECRET` doit être défini. Côté Denkma, les intégrations Denkma Pro doivent être ouvertes pour le commerce.

## Code

`backend/ecommerce_denkma.py`, routes dans `backend/server.py`, `web-app/src/storefront/DenkmaDelivery.tsx`, `frontend/components/DenkmaShipModal.tsx`, `frontend/components/DenkmaSettingsCard.tsx`, `web-app/src/components/DenkmaShipDialog.tsx`, `web-app/src/components/DenkmaSettingsPanel.tsx`, logique partagée `denkmaShipping.ts`. Tests : `tests/test_ecommerce_denkma.py`, `frontend/tests/denkma-delivery.test.cjs`.
