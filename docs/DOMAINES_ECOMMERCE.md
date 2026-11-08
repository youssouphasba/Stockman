# Domaines des sites e-commerce : fonctionnement technique

Note d'exploitation pour l'équipe. Le parcours côté commerçant est décrit dans `backend/docs/ecommerce-domain.md`.

## Configuration à prévoir sur Railway

| Variable | Rôle |
| --- | --- |
| `VERCEL_API_TOKEN` | Jeton d'API Vercel autorisé à gérer les domaines du projet web. |
| `VERCEL_PROJECT_ID` | Identifiant du projet Vercel qui sert `app.stockman.pro`. |
| `VERCEL_TEAM_ID` | Identifiant de l'équipe Vercel, si le projet appartient à une équipe. |
| `ECOMMERCE_DOMAIN_CNAME_TARGET` | Facultatif : cible CNAME par défaut (`cname.vercel-dns.com`). |
| `ECOMMERCE_DOMAIN_APEX_IPV4` | Facultatif : adresse IP par défaut du domaine nu (`76.76.21.21`). |

Avec le jeton et le projet, l'activation est automatique : le domaine est ajouté au projet Vercel à la connexion, la redirection du domaine nu vers `www` est configurée chez Vercel (308), et les valeurs DNS recommandées par Vercel remplacent les valeurs par défaut. Sans eux, le commerçant voit « Activation par Stockman » une fois son DNS correct : il faut alors ajouter le domaine (et le domaine nu avec redirection) à la main dans le projet Vercel. Les domaines connectés avant cette version sont ajoutés automatiquement au projet à leur prochaine vérification, dès que le jeton est configuré.

## Parcours et états

- `POST /api/ecommerce/site/domain` connecte un domaine (`{"domain": "senlab.com"}`), `POST /api/ecommerce/site/domain/check` le vérifie, `DELETE /api/ecommerce/site/domain` le retire. L'ancienne route `POST /api/ecommerce/site/verify-domain` reste un alias de la vérification. Les anciennes applications qui envoient encore `custom_domain` avec `PUT /api/ecommerce/site` passent par la même logique ; un domaine inchangé n'est plus remis « en attente ».
- Droits : administrateur de la boutique, hors compte de démonstration, et écriture autorisée par l'abonnement (Starter et Pro restent en consultation sur le web).
- États (`domain_state`) : `not_connected`, `dns_pending`, `ownership_pending`, `certificate_pending`, `activation_pending`, `active`. Le champ historique `domain_status` vaut `verified` uniquement à l'état `active` ; l'adresse publique du site (`site_url`) bascule sur le domaine à ce moment-là.
- Vérification : avec Vercel, propriété (`verified`, enregistrement TXT `_vercel` éventuel) et DNS (`misconfigured`) lus par l'API ; sans Vercel, résolution DNS comparée à la cible. Dans les deux cas, le site doit répondre en HTTPS avec un certificat valide sur `/api/public/ecommerce/_domain-check` (réponse fixe `{"service": "stockman"}`), ce qui prouve que c'est bien Stockman qui répond. Seules des adresses IP publiques sont contactées.
- Le domaine nu redirigé est enregistré comme alias (`ecommerce_domain_aliases`) : la recherche publique par domaine l'accepte aussi.

## Code

`backend/ecommerce_addresses.py` (adresse Stockman, lecture du domaine saisi, enregistrements attendus), `backend/ecommerce_domains.py` (API Vercel, contrôles, états), `frontend/components/EcommerceDomainCard.tsx`, `web-app/src/components/EcommerceDomainPanel.tsx` et la logique partagée `ecommerceDomain.ts` (copies identiques mobile et web). Tests : `tests/test_ecommerce_domains.py`, `frontend/tests/ecommerce-domain.test.cjs`.
