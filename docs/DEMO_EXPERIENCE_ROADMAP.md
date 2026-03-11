# Demo Experience Roadmap

Date de preparation : 2026-03-11
Statut : planifie, non implemente

Ce document fige la strategie d'un vrai `mode demo` pour Stockman, afin de
permettre a un prospect ou un nouveau client de tester le produit avec des
donnees realistes avant usage reel.

## Objectif

Permettre a un utilisateur de :

- comprendre rapidement la valeur de Stockman
- tester les ecrans sans partir d'un systeme vide
- manipuler des donnees realistes
- comparer les usages `mobile`, `web` et `enterprise`

Le mode demo doit etre :

- simple a lancer
- riche en donnees
- pedagogique
- sans risque pour les vraies donnees

## Vision produit

Le mode demo ne doit pas etre un simple compte vide.

Il doit etre une vraie experience pre-remplie avec :

- entreprises fictives
- boutiques
- staff
- ventes
- stock
- fournisseurs
- clients
- dettes
- factures
- analytics
- recommandations

## Les 3 niveaux de demo

## 1. Demo visiteur

### But

Permettre de voir l'outil sans inscription.

### Caracteristiques

- lecture seule
- accessible depuis le site public
- pas de modification persistante
- ideal pour montrer :
  - dashboard
  - analytics
  - web enterprise

### Usage

- marketing
- demos commerciales rapides
- prise en main avant creation de compte

## 2. Demo interactive

### But

Permettre de tester reellement le produit avec des actions.

### Caracteristiques

- compte sandbox
- donnees fictives pre-remplies
- l'utilisateur peut :
  - vendre
  - creer un produit
  - modifier un stock
  - generer une facture
  - recevoir une commande
- reset automatique periodique ou sur demande

### Usage

- essai produit
- qualification commerciale
- formation

## 3. Demo guidee

### But

Accompagner l'utilisateur dans la decouverte.

### Caracteristiques

- checklist
- coach visuel
- scenarios predefinis
- CTA du type :
  - "Faites votre premiere vente"
  - "Confirmez une reception fournisseur"
  - "Ouvrez l'analyse multi-boutiques"

### Usage

- onboarding
- salons / demos terrain
- prospects peu familiers avec le digital

## Univers de demo recommandes

Le plus rentable est de proposer plusieurs univers selon le besoin.

## A. Commerce

### Cas cible

- epicerie
- supermarche
- boutique multi-rayons

### Donnees

- catalogue produits large
- stock en boutique
- fournisseurs lies
- commandes d'achat
- ventes POS
- dettes clients
- factures
- KPI stock

### Scenarios

- vendre un produit
- enregistrer une dette
- receptionner un achat fournisseur
- voir les analytics stock

## B. Restaurant

### Cas cible

- restaurant
- fast-food
- boulangerie comme restaurant allege

### Donnees

- tables
- reservations
- commandes ouvertes
- statut cuisine
- tickets
- paiements

### Scenarios

- marquer une reservation arrivee
- ouvrir une commande
- envoyer en cuisine
- ajouter un article
- finaliser et imprimer

## C. Fournisseur

### Cas cible

- fournisseur marketplace
- grossiste

### Donnees

- catalogue
- commandes recues
- ratings
- livraisons
- benchmarks

### Scenarios

- consulter le catalogue
- voir les commandes
- comprendre la logique marketplace

## D. Enterprise multi-boutiques

### Cas cible

- direction
- groupe avec plusieurs points de vente

### Donnees

- plusieurs boutiques
- staff multi-boutiques
- achats par boutique
- analytics consolides
- CRM mutualise
- fournisseurs
- compta

### Scenarios

- changer de boutique
- comparer les boutiques
- ouvrir le multi-store dashboard
- consulter les KPIs procurement
- tester les settings entreprise

## Jeux de donnees a preparer

## Donnees minimales par univers

- `account`
- `stores`
- `users / staff`
- `settings`
- `products`
- `suppliers`
- `supplier_products`
- `orders`
- `sales`
- `customers`
- `debts`
- `expenses`
- `invoices`
- `stock_movements`
- `analytics`

## Qualite des donnees

Les donnees doivent sembler vraies :

- dates variees
- noms credibles
- montants realistes
- commandes en plusieurs statuts
- KPI coherents
- exemples de retards, dettes, ruptures, marges

## Architecture technique recommandee

## Option 1. Sandbox partagee

### Principe

Un environnement demo commun avec reset automatique.

### Avantages

- simple a mettre en place
- bon pour les demos visiteur

### Inconvenients

- les utilisateurs se marchent dessus
- les donnees changent sans arret

## Option 2. Sandbox clonable par session

### Principe

A l'ouverture d'une demo interactive, on clone un template de donnees vers une
session ou un compte demo temporaire.

### Avantages

- chaque utilisateur a sa demo propre
- plus rassurant
- ideal pour essai reel

### Inconvenients

- plus lourd techniquement

## Recommandation

Faire en deux temps :

1. `lecture seule partagee`
2. puis `sandbox clonable`

## Reset et nettoyage

Le mode demo doit pouvoir etre remis a zero.

### Strategies

- reset cron quotidien
- reset manuel par bouton admin
- expiration automatique des sessions demo
- recreation depuis seed

### Important

Le reset doit etre :

- simple
- rapide
- fiable

## Separation des vraies donnees

Regles obligatoires :

- aucun compte demo dans les donnees clients reelles sans marquage fort
- flag `is_demo`
- impossibilite de confondre demo et production
- branding clair `Demo`
- limitation des integrations / paiements reels / OTP reels

## Fonctionnalites a adapter pour la demo

## Online-only

Certaines fonctions doivent etre simulees ou desactivees :

- OTP Twilio
- OTP Resend
- abonnements reels
- paiements reels
- integrations externes
- envois webhooks reels

## IA

L'IA peut :

- utiliser un mode normal si acceptable
- ou afficher des reponses de demonstration
- ou etre guidee avec donnees demo coherentes

## Documents

Les recus / factures doivent afficher un marquage demo discret mais clair.

## UX recommandee

## Entree dans la demo

Depuis `stockman.pro` :

- `Voir une demo`
- `Essayer l'app web`
- `Tester le mode commerce`
- `Tester le mode restaurant`

Depuis `app.stockman.pro` :

- `Essayer la demo Enterprise`

Depuis mobile :

- `Utiliser des donnees de demo`

## Indications visuelles

Toujours afficher :

- badge `Demo`
- environnement courant
- bouton `Reinitialiser la demo` si approprie
- message clair sur les limites

## Guidance integree

Elements recommandes :

- checklist
- visites guidees
- recommandations d'actions
- boutons "essayer ce flux"

## Scenarios guides recommandes

## Commerce

1. vendre un produit
2. enregistrer une dette client
3. creer une facture
4. ouvrir les analytics
5. receptionner une commande fournisseur

## Restaurant

1. marquer une reservation arrivee
2. ouvrir une commande
3. envoyer en cuisine
4. ajouter un article
5. finaliser

## Enterprise

1. changer de boutique
2. voir les analytics multi-boutiques
3. ouvrir un fournisseur
4. comparer les boutiques
5. consulter l'historique comptable

## Web vs mobile

## Mobile demo

Doit mettre en avant :

- POS
- stock
- CRM simple
- operations terrain

## Web demo

Doit mettre en avant :

- multi-boutiques
- analytics
- procurement
- CRM/finance
- settings avances

## Administration interne

Il faut un petit outil admin demo pour :

- recreer les datasets
- reset les environnements
- voir les sessions demo
- invalider une demo
- activer ou couper certains modules demo

## Roadmap recommandee

## Phase 1. Lecture seule marketing

- demo web lecture seule
- donnees commerce + enterprise
- badge demo
- CTA clairs

## Phase 2. Demo interactive partagee

- compte demo interactive
- actions principales autorisees
- reset quotidien

## Phase 3. Demo guidee

- checklist
- parcours par business type
- aide integree

## Phase 4. Sandboxes individuelles

- clonage d'un template demo
- expiration automatique
- reset a la demande

## Phase 5. Admin demo

- back-office reset
- seeds
- suivi des usages

## Priorites recommandees

1. demo web enterprise lecture seule
2. demo commerce interactive
3. demo restaurant interactive
4. demo guidee
5. sandboxes individuelles

## Questions a figer plus tard

- faut-il une seule demo ou plusieurs univers distincts ?
- la demo interactive doit-elle demander un email ou pas ?
- faut-il conserver les actions d'un prospect pendant quelques jours ?
- faut-il un bouton `convertir cette demo en vrai compte` plus tard ?

## Conclusion

Le mode demo doit etre pense comme une vraie experience produit, pas comme un
simple environnement de test.

S'il est bien fait, il peut servir a :

- vendre
- convaincre
- former
- onboarder

Et il deviendra un vrai accelerateur commercial pour Stockman.
