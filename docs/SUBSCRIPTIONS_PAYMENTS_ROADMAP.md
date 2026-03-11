# Roadmap Abonnements et Paiements

## Statut actuel

Le socle est maintenant en place et largement aligne :

- `mobile` : RevenueCat pour `starter/pro`, `enterprise` bloque en in-app
- `web` : Stripe + Flutterwave avec prix resolus par devise
- `backend` : `BusinessAccount` + service central `pricing.py`
- `landing` + `app.stockman.pro/pricing` : pricing dynamique par pays/devise
- `subscription/me` : renvoie maintenant `country_code`, `currency`, `pricing_region`, `effective_prices`, `recommended_checkout_provider`, `can_change_billing_country`
- `Railway` : secrets webhook et secret keys annonces comme deja configures

Ce qui reste surtout a faire maintenant :

- configurer les prices/providers dans les consoles externes
- etendre la grille Stockman aux autres devises que `XOF/XAF/EUR/GNF`
- verifier les parcours reels de paiement avec les vraies cles live

## Problemes encore a corriger

### 1. Mobile natif : mauvais mapping du plan `enterprise`

Aujourd'hui, sur mobile natif hors Mobile Money, le bouton d'achat passe par RevenueCat.
Mais le code ne gere que :

- `pro` -> `purchasePro()`
- tout le reste -> `purchaseStarter()`

Impact :

- si un utilisateur mobile selectionne `enterprise`, l'app peut acheter `starter`

Decision recommandee :

- sur mobile, ne pas proposer d'achat in-app `enterprise`
- `enterprise` doit renvoyer vers le web / contact commercial / page Enterprise

### 2. Web : ecran abonnement mal aligne avec la reponse backend

Le backend renvoie notamment :

- `status`
- `subscription_end`

Mais l'UI web lit encore des champs de type :

- `is_active`
- `expiry_date`

Impact :

- le statut affiche peut etre faux
- la date de fin peut etre vide ou incorrecte
- le bouton de reactivation peut s'afficher au mauvais moment

### 3. RevenueCat : synchronisation post-achat trop faible

Apres un achat mobile, l'app appelle `/subscription/sync`, mais cet endpoint ne resynchronise pas vraiment RevenueCat.
Il ne fait qu'une verification locale du `subscription_end` deja stocke.

Impact :

- si le webhook RevenueCat arrive avec retard, l'utilisateur peut payer puis ne pas voir son plan active tout de suite

### 4. Positionnement produit a clarifier

Le modele cible doit etre explicite :

- `Starter` : mobile
- `Pro` : mobile
- `Enterprise` : web + mobile terrain

Donc :

- achat in-app mobile : `starter` et `pro`
- achat `enterprise` : web uniquement

## Plan de correction code

### Phase 1. Corriger le contrat produit d'abonnement

Objectif :

- rendre l'UX abonnement conforme au vrai produit

Actions :

- retirer l'achat `enterprise` via RevenueCat sur mobile
- remplacer le CTA mobile `enterprise` par :
  - `Decouvrir Enterprise`
  - `Acceder a l'app web`
  - ou `Contacter l'equipe`
- garder `starter` et `pro` en achat mobile natif
- garder `enterprise` sur Stripe/Flutterwave web

Resultat attendu :

- plus aucun risque `enterprise -> starter`
- meilleure clarte pour l'utilisateur

### Phase 2. Aligner l'ecran abonnement web sur le backend

Objectif :

- fiabiliser l'affichage du statut et des dates

Actions :

- remplacer les lectures `is_active` par une logique derivee de `status === "active"`
- remplacer `expiry_date` par `subscription_end`
- afficher correctement :
  - essai actif
  - abonnement actif
  - abonnement expire
  - abonnement annule

Resultat attendu :

- le web reflete exactement l'etat serveur

### Phase 3. Renforcer la synchro RevenueCat

Objectif :

- supprimer la sensation de paiement reussi mais plan pas encore visible

Actions backend possibles :

- ajouter un vrai endpoint de resynchronisation RevenueCat si necessaire
- ou stocker mieux le dernier etat connu par `app_user_id`

Actions mobile :

- apres achat ou restore :
  - lire `customerInfo`
  - afficher un etat `activation en cours`
  - recharger l'abonnement plusieurs fois avec backoff court
  - sortir de l'etat des que le webhook a mis a jour le backend

Resultat attendu :

- UX plus fiable apres achat

### Phase 4. Durcir l'observabilite paiement

Objectif :

- mieux diagnostiquer les cas reels

Actions :

- journaliser clairement :
  - checkout initie
  - redirect ouverte
  - webhook recu
  - activation de plan
  - mismatch plan/provider
  - restore RevenueCat
- ajouter dans l'admin ou les logs :
  - provider
  - plan
  - date de debut
  - date de fin
  - transaction/session id

Resultat attendu :

- debug bien plus simple en production

## Reglages a faire de ton cote

### A. RevenueCat

A verifier / configurer :

- remplacer les cles `test_` par les vraies cles prod dans le build mobile de production
- verifier que les `product_id` du code correspondent exactement aux produits/offerings RevenueCat
- verifier que les `entitlements` sont bien :
  - `starter`
  - `pro`
- verifier que l'`app_user_id` RevenueCat est bien le `user_id` backend attendu

Important :

- si tu gardes une cle Android de test, le build production n'initialisera pas RevenueCat

### B. App Store / Play Console

A verifier :

- produits in-app actifs
- abonnements approuves et publiables
- liaisons correctes avec RevenueCat
- comptes test bien separes des comptes prod

### C. Stripe

A verifier :

- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_ENTERPRISE`

Ils doivent pointer vers les bons `Price ID` live.

Verifier aussi :

- webhook Stripe actif vers `/api/webhooks/stripe`
- events utiles bien coches :
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### D. Flutterwave

A verifier :

- que `FLW_SECRET_KEY` est bien une cle live et non test sur Railway
- que `FLW_HASH` correspond bien au webhook Flutterwave actif
- que le webhook pointe vers `/api/webhooks/flutterwave`
- que le compte supporte bien les devises utilisees (`XOF`, `XAF`, `GNF`, `CDF` selon tes usages reels)

### E. URLs / callbacks

A verifier :

- `API_URL` backend correct
- URLs de retour de paiement correctes
- domaine final utilise en production stable

## Tests manuels a faire apres correction

### Mobile

1. Achat `starter` Android
2. Achat `pro` Android
3. Restore purchases
4. Verifier que `enterprise` ne lance plus un achat in-app
5. Verifier l'activation du plan dans l'app apres webhook

### Web

1. Paiement Stripe `enterprise`
2. Paiement Flutterwave `enterprise`
3. Affichage du bon statut apres paiement
4. Reactivation d'un abonnement expire
5. Affichage de la bonne date de fin

### Backend / Admin

1. Verification des webhooks recus
2. Verification du `subscription_provider`
3. Verification de `subscription_end`
4. Verification du plan reel stocke dans `BusinessAccount`

## Priorite recommandee

1. retirer `enterprise` des achats in-app mobiles
2. corriger l'ecran abonnement web
3. renforcer la synchro post-achat RevenueCat
4. ajouter plus de logs / observabilite

## Decision produit retenue

- `Starter` et `Pro` : achat mobile natif
- `Enterprise` : achat web
- `mobile` : outil terrain
- `web` : surface d'abonnement Enterprise et gestion avancee
