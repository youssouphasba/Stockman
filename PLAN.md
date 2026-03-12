# Configuration pas-à-pas des prix par devise

## Résumé
Oui, tu peux le configurer proprement, mais chaque provider a un rôle différent :

- `Backend Stockman` : source de vérité métier des prix affichés
- `App Store Connect` : prix réels iOS pour `Starter` et `Pro`
- `Google Play Console` : prix réels Android pour `Starter` et `Pro`
- `RevenueCat` : mapping des produits/offers, pas la source de prix
- `Stripe` : prix web carte bancaire
- `Flutterwave` : montant envoyé par ton backend, pas de grille de prix à gérer dans Flutterwave

La meilleure stratégie avec ton code actuel est :
- `FCFA` : prix fixes métier
- `EUR` : prix fixes métier
- `autres devises` : grille Stockman backend
- `Stripe` : privilégier un seul `Price ID` par plan avec options multi-devise si possible
- `RevenueCat` : seulement `Starter` et `Pro`

## 1. D’abord fixer la grille officielle Stockman
Avant de toucher aux providers, fige la grille métier.

Prix officiels actuels :
- `XOF/XAF/FCFA` : `Starter 2500`, `Pro 4900`, `Enterprise 9900`
- `EUR` : `Starter 6,99`, `Pro 9,99`, `Enterprise 19,99`

Règle pour les autres pays :
- prix déterminés par une grille Stockman par devise
- pas de conversion live à chaque affichage
- possibilité de mise à jour périodique plus tard

Décision à appliquer dans le produit :
- le pays/devise sont proposés automatiquement
- l’utilisateur peut corriger avant le premier paiement
- après premier paiement, la devise est figée

## 2. Configurer Stripe
Avec le code actuel, le backend attend un seul `Price ID` par plan dans [payment.py](C:/Users/Utilisateur/projet_stock/backend/services/payment.py). Donc la meilleure option est de garder :
- `1 produit Stripe par plan`
- `1 Price principal par plan`
- et d’ajouter des devises dessus si Stripe les supporte

Étapes :
1. Ouvre le Dashboard Stripe.
2. Va dans `Product catalog`.
3. Ouvre le produit `Starter`.
4. Clique `Edit product`.
5. Sur le prix existant, ajoute les devises supplémentaires si tu veux utiliser le mode multi-devise.
   Source : [Stripe manage prices](https://docs.stripe.com/products-prices/manage-prices)
6. Mets :
   - `EUR = 6,99`
   - autres devises supportées selon ta grille Stockman
7. Répète pour `Pro` et `Enterprise`.
8. Vérifie si les devises africaines que tu vises sont bien supportées par Stripe.
   - si non, laisse ces pays passer par `Flutterwave`
9. Garde ensuite dans Railway :
   - `STRIPE_PRICE_STARTER`
   - `STRIPE_PRICE_PRO`
   - `STRIPE_PRICE_ENTERPRISE`
10. Vérifie que ces IDs pointent vers les bons prix live.

Recommandation :
- n’essaie pas de forcer `XOF/XAF` dans Stripe si Stripe ne les supporte pas proprement pour ton cas
- garde `Flutterwave` pour ces pays

## 3. Configurer App Store Connect
Les prix iOS de `Starter` et `Pro` se configurent dans App Store Connect, pas dans RevenueCat.

Étapes :
1. Ouvre `App Store Connect`.
2. Va dans ton app.
3. Va dans `Subscriptions`.
4. Ouvre le groupe d’abonnements contenant `Starter` et `Pro`.
5. Ouvre l’abonnement `Starter`.
6. Va dans la section `Pricing`.
7. Définis le prix par storefront/pays.
   Source : [Manage pricing for auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
8. Vérifie aussi la disponibilité par pays/région.
   Source : [Set availability for an auto-renewable subscription](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-availability-for-an-auto-renewable-subscription/)
9. Répète pour `Pro`.

Conseil pratique :
- configure d’abord les pays prioritaires
- vérifie Sénégal et les pays clés FCFA si tu cibles iOS là-bas
- vérifie UE pour `6,99 / 9,99`
- ne crée pas `Enterprise` en abonnement in-app

Si tu modifies un abonnement déjà actif :
- vérifie l’impact sur les abonnés existants
- Apple gère différemment les baisses et hausses de prix
  Source : [Apple subscriptions pricing overview](https://developer.apple.com/app-store/subscriptions/)

## 4. Configurer Google Play Console
Les prix Android se configurent dans Google Play Console, pas dans RevenueCat.

Étapes :
1. Ouvre `Google Play Console`.
2. Va dans `Monetization` puis `Subscriptions`.
3. Ouvre `Starter`.
4. Ouvre le `base plan` mensuel.
5. Va sur les prix par région/pays.
6. Définis les prix régionaux selon ta grille.
   Source : [Change subscription prices](https://developer.android.com/google/play/billing/price-changes)
7. Vérifie la disponibilité pays/région.
8. Répète pour `Pro`.
9. Ne crée pas `Enterprise` comme abonnement in-app Android.

Conseil pratique :
- mets des prix manuels pour les zones importantes
- ne te repose pas seulement sur une conversion automatique du store si tu veux une cohérence métier stricte

## 5. Configurer RevenueCat
RevenueCat ne doit pas être ta source de prix.

Étapes :
1. Ouvre `RevenueCat`.
2. Va dans `Products`.
3. Vérifie que seuls les vrais produits stores `Starter` et `Pro` existent pour iOS/Android.
   Source : [RevenueCat product configuration](https://www.revenuecat.com/docs/offerings/products-overview)
4. Vérifie les `Entitlements` :
   - `starter`
   - `pro`
5. Vérifie les `Offerings` :
   - l’offre courante contient bien les bons produits iOS et Android
6. Vérifie que `Enterprise` n’est pas proposé en in-app.
7. Vérifie que les produits importés depuis Apple/Google sont bien `Approved / Active`.

Règle importante :
- si les prix changent dans Apple/Google, RevenueCat les reflète
- tu ne règles pas les prix définitifs dans RevenueCat

## 6. Configurer Flutterwave
Ici, le prix vient du backend.

Étapes :
1. Vérifie que Railway a bien :
   - `FLW_SECRET_KEY`
   - `FLW_HASH`
2. Vérifie dans Flutterwave que le compte est en `live`.
3. Vérifie que les moyens de paiement utiles sont actifs.
4. Vérifie les devises que tu acceptes réellement.
5. Côté produit, laisse le backend envoyer :
   - `amount`
   - `currency`

Important :
- tu n’as pas une vraie “grille de prix Flutterwave” à maintenir dans Flutterwave
- la grille de prix reste dans Stockman

## 7. Vérifier la cohérence avec le code actuel
Points à aligner ensuite dans le produit :
- mobile inscription affiche encore d’anciens prix
- mobile abonnement affiche encore `Enterprise 14,99`
- web abonnement affiche encore `Enterprise 14,99`
- backend `payment.py` a encore `Enterprise 1499 EUR`, à passer à `1999`
- `Starter/Pro` doivent être alignés partout

Règle de cohérence absolue :
- prix backend affiché
- prix store Apple
- prix store Google
- prix Stripe
- prix Flutterwave
doivent raconter la même histoire commerciale

## 8. Checklist finale de validation
Teste au moins ces cas :
1. `Sénégal / XOF`
- web : `2500 / 4900 / 9900`
- mobile : `Starter/Pro` in-app cohérents avec store

2. `UE / EUR`
- web : `6,99 / 9,99 / 19,99`
- mobile : `Starter/Pro` cohérents avec Apple/Google

3. `Pays FCFA autre que Sénégal`
- mêmes prix FCFA

4. `Autre devise`
- prix issus de la grille Stockman
- Stripe seulement si devise supportée
- sinon fallback Flutterwave ou stratégie explicitement définie

## Sources officielles
- Apple :
  - [Manage pricing for auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions)
  - [Set availability for an auto-renewable subscription](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-availability-for-an-auto-renewable-subscription/)
  - [Auto-renewable subscriptions overview](https://developer.apple.com/app-store/subscriptions/)
- Google Play :
  - [Change subscription prices](https://developer.android.com/google/play/billing/price-changes)
  - [Create and manage subscriptions](https://support.google.com/googleplay/android-developer/answer/140504?hl=en-my)
- Stripe :
  - [Manage products and prices](https://docs.stripe.com/products-prices/manage-prices)
  - [How products and prices work](https://docs.stripe.com/products-prices/how-products-and-prices-work)
- RevenueCat :
  - [Product configuration](https://www.revenuecat.com/docs/offerings/products-overview)
  - [Price changes](https://www.revenuecat.com/docs/subscription-guidance/price-changes)

## Assumptions
- `Enterprise` reste web-only.
- `Starter/Pro` restent les seuls produits in-app.
- Le backend Stockman reste la référence métier des prix affichés.
- La devise est figée après le premier paiement.
- `Stripe` sert aux devises qu’il supporte bien; `Flutterwave` couvre les cas Mobile Money et FCFA.
