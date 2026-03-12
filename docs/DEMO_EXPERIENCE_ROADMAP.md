# Demo Experience Roadmap

Date de preparation : 2026-03-11
Statut : partiellement implemente

## Etat actuel

Ce qui est deja en place :

- backend v1 des sessions demo interactives
- email obligatoire avant creation d'une session demo interactive
- 3 types supportes :
  - `Epicerie ou boutique`
  - `Restaurant`
  - `Entreprise`
- durees :
  - `24h` pour les demos mobile
  - `48h` pour la demo Enterprise
- sandbox isolee par utilisateur
- donnees seed realistement cote backend :
  - boutiques
  - produits
  - clients
  - ventes
  - factures
  - fournisseurs
  - commandes fournisseurs
  - depenses
  - stock movements
  - tables/reservations pour restaurant
- expiration + nettoyage automatique cote backend
- blocage des paiements reels sur les comptes demo

Ce qui reste a faire :

- brancher le parcours frontend final `Tester en mode Demo`
- monitoring admin detaille des sessions demo
- prolongation admin `24h/48h`
- experience guidee pas a pas
- enrichissement visuel du selecteur public

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

Pour une cible de forte charge, la sandbox clonable doit devenir le vrai modele
de reference pour la demo interactive.

## Capacite cible

### Question produit

Peut-on permettre a `1000` personnes de faire une demo interactive en meme temps ?

### Reponse

Oui, mais pas avec :

- un seul compte demo partage
- un clonage lourd complet non optimise pour chaque prospect

La bonne cible est :

- `lecture seule partagee` pour les visiteurs
- `sandbox interactive isolee par utilisateur`
- architecture optimisee pour supporter `1000` sessions demo actives

## Architecture scalable recommandee

## Modele cible

Chaque utilisateur de demo interactive obtient :

- un `demo_account_id`
- un univers de demo choisi
- un jeu de donnees pre-rempli
- une date d'expiration
- un marquage fort `is_demo`

La separation doit etre logique et nette, meme si les donnees restent dans la
meme base principale avec des flags et scopes forts.

## Ce qu'il faut eviter

- cloner naivement toutes les collections sans index ni TTL
- recalculer tous les analytics a froid pour chaque prospect
- partager le meme sandbox interactif entre plusieurs utilisateurs
- laisser les demos vivre indefiniment

## Strategie recommandee pour tenir 1000 demos

### 1. Templates demo maitres

Creer quelques templates maitres :

- `commerce_demo_template`
- `restaurant_demo_template`
- `supplier_demo_template`
- `enterprise_demo_template`

Ces templates ne sont jamais utilises directement par les prospects.

Ils servent uniquement de source de clonage.

### 2. Clonage rapide par session

Au lancement de la demo interactive :

- on cree un `account demo`
- on copie les donnees du template choisi
- on remappe les IDs necessaires
- on affecte un `demo_session_id`
- on fixe un `expires_at`

### 3. TTL et nettoyage automatique

Chaque session demo interactive doit avoir :

- `expires_at`
- nettoyage automatique
- suppression ou reset planifie

Objectif :

- pas d'accumulation illimitee
- pas de pollution des donnees
- retour rapide a un etat propre

### 4. Analytics precomputees ou legeres

Pour tenir la charge :

- pre-remplir les datasets demo avec analytics deja coherentes
- recalculer seulement ce qui est necessaire
- eviter de lancer des agregations lourdes pour chaque session si ce n'est pas
  indispensable

### 5. Integrations coupees

Les demos interactives ne doivent jamais toucher :

- paiements reels
- OTP reels
- emails reels
- notifications push reelles
- webhooks reels
- integrateurs tiers reels

### 6. Limites et quotas demo

Pour 1000 utilisateurs simultanes, il faut aussi cadrer :

- duree max de session
- nombre max de boutiques demo
- taille max des imports demo
- nombre max de creations massives

Le but n'est pas de brider l'essai produit, mais d'eviter qu'un prospect
transforme la demo en environnement quasi permanent.

## Modele technique recommande

## Option A. Copie complete par sandbox

### Avantages

- simple a comprendre
- isolation forte
- comportement proche de la vraie production

### Inconvenients

- plus couteux en stockage
- clonage plus lent
- charge plus forte a 1000 sessions

## Option B. Template + overlays/session

### Principe

- dataset de base lecture seule
- modifications utilisateur stockees comme deltas ou overlays
- lecture fusionnee base + changements de session

### Avantages

- beaucoup plus scalable
- plus economique
- plus rapide a creer

### Inconvenients

- plus complexe a developper
- plus de logique applicative

## Recommandation technique

Pour Stockman, la meilleure trajectoire est :

1. `v1` simple : copie complete par sandbox pour lancer la fonctionnalite
2. `v2` scalable : passage progressif a un modele plus optimise si la demande
   demo explose

Autrement dit :

- oui, on peut viser 1000 utilisateurs
- mais on commence plus simple
- puis on optimise si le volume demo devient reel

## Regles d'isolation obligatoires

Chaque session demo interactive doit etre bornee par :

- `account_id`
- `demo_session_id`
- `is_demo = true`
- `demo_template`
- `expires_at`

Et toutes les lectures/ecritures doivent respecter ce scope.

## Impacts backend

Il faudra ajouter :

- generation de sessions demo
- clonage de datasets
- expiration automatique
- reset manuel
- outils admin demo
- garde-fous sur tous les services sensibles

## Impacts web et mobile

Le web et le mobile devront :

- afficher clairement le badge `Demo`
- connaitre la date d'expiration
- proposer un bouton `Reinitialiser`
- proposer un bouton `Convertir plus tard` seulement si on le veut

## Impacts admin

L'admin demo doit permettre de :

- voir le nombre de sessions actives
- voir l'univers choisi
- voir les comptes demo expires
- reset une session
- supprimer une session
- recreer les templates
- monitorer la charge

## Reset et nettoyage

Le mode demo doit pouvoir etre remis a zero.

### Strategies

- reset cron quotidien
- reset manuel par bouton admin
- expiration automatique des sessions demo
- recreation depuis seed

### Durees retenues

- `demo mobile` (`Epicerie ou boutique`, `Restaurant`) : `24h`
- `demo Enterprise` : `48h`

### Extensions admin

Le dashboard admin doit pouvoir :

- prolonger une demo mobile de `24h`
- prolonger une demo Enterprise de `48h`
- reset une session
- supprimer une session

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

- `Tester en mode Demo`

Depuis `app.stockman.pro` :

- `Tester en mode Demo`

Depuis mobile :

- `Utiliser des donnees de demo`

## Parcours utilisateur recommande

Avant de lancer une demo interactive, l'utilisateur doit saisir au minimum :

- `email`

### But de l'email obligatoire

- qualification commerciale minimale
- relance apres expiration de la demo
- proposition de conversion vers un vrai compte
- support si la session demo pose probleme
- suivi admin des usages demo

### Regle produit

- `demo visiteur lecture seule` : peut rester sans email
- `demo interactive` : email obligatoire avant creation de la session

## Separation des parcours tres tot

Le choix entre `mobile` et `Entreprise` doit etre visible des le debut.

Le parcours ne doit pas donner l'impression qu'il s'agit de la meme offre avec
simplement plus de donnees.

Il faut montrer tres tot la difference entre :

- `outil terrain mobile`
- `pilotage Enterprise web`

Apres clic sur `Tester en mode Demo`, l'utilisateur choisit son business type :

- `Epicerie ou boutique`
- `Restaurant`
- `Entreprise`

### Regle de routage

- `Epicerie ou boutique` -> demo `mobile` commerce
- `Restaurant` -> demo `mobile` restaurant
- `Entreprise` -> demo `web Enterprise` complete

### Formulation recommandee

Le choix `Entreprise` doit etre explicite, par exemple :

- `Entreprise (supermarche, multi-boutiques, logistique, distribution)`

Les choix mobile doivent etre explicites aussi :

- `Epicerie ou boutique (demo mobile)`
- `Restaurant (demo mobile)`
- `Entreprise (demo web Enterprise)`

### Positionnement

Les demos `mobile` montrent surtout :

- la caisse
- le stock
- le CRM simple
- les operations terrain

La demo `Entreprise` montre surtout :

- le plan Enterprise complet
- le multi-boutiques
- les analytics
- le procurement
- les settings avances
- les rapports

### Message commercial recommande

Le parcours `Entreprise` doit etre mis en avant tres tot avec un message du type :

- `Vous gerez plusieurs boutiques ou avez besoin d'analyses avancees ? Testez la demo Enterprise.`

Le but est d'eviter qu'une vraie entreprise choisisse trop vite une demo mobile
qui ne montre pas la bonne valeur du produit.

## Indications visuelles

Toujours afficher :

- badge `Demo`
- environnement courant
- temps restant avant expiration
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

## Monitoring admin recommande

Le dashboard admin doit avoir une section `Demo` permettant de suivre :

- demos actives
- demos expirees
- demos creees aujourd'hui
- repartition par type :
  - `Epicerie ou boutique`
  - `Restaurant`
  - `Entreprise`
- repartition par surface :
  - `mobile`
  - `web`
- duree moyenne d'utilisation
- resets
- prolongations
- echec de creation de session
- echec de nettoyage

### Table admin demo

Colonnes recommandees :

- `demo_session_id`
- `demo_type`
- `surface`
- `template`
- `email`
- `started_at`
- `expires_at`
- `remaining_time`
- `status`
- `session_owner` si disponible

### Actions admin demo

- `Prolonger`
- `Reset`
- `Supprimer`
- `Voir les details`

### Alertes admin demo

- pic anormal de demos actives
- sessions expirees non nettoyees
- echec de clonage template
- echec du nettoyage automatique
- surcharge sur un univers demo

## Roadmap recommandee

## Phase 1. Lecture seule marketing

- demo web lecture seule
- donnees commerce + enterprise
- badge demo
- CTA clairs

## Phase 2. Demo interactive v1

- sandboxes interactives dediees
- un compte demo par utilisateur
- clonage simple depuis template
- expiration `24h` mobile / `48h` Enterprise
- reset manuel et automatique

## Phase 3. Demo guidee

- checklist
- parcours par business type
- aide integree

## Phase 4. Sandboxes individuelles optimisees

- optimisation du clonage
- reduction du poids des datasets
- monitoring de charge
- preparation a une forte concurrence simultanee

## Phase 5. Admin demo

- back-office reset
- seeds
- suivi des usages
- monitoring des sessions demo

## Priorites recommandees

1. demo web enterprise lecture seule
2. sandboxes interactives commerce dediees
3. sandboxes interactives restaurant dediees
4. demo guidee
5. optimisation pour forte concurrence simultanee

## Objectif de capacite

La cible `1000` demos interactives simultanees est atteignable si :

- les demos interactives sont isolees
- les templates sont bien prepares
- les integrations reelles sont neutralisees
- les sessions expirent automatiquement
- les analytics demo ne sont pas recalcules de maniere trop lourde

Il ne faut pas viser cette capacite avec un simple compte demo partage.

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
