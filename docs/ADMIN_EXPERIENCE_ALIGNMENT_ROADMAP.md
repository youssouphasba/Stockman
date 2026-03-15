# Admin Experience Alignment Roadmap

Date de preparation : 2026-03-15
Statut : plan valide, implementation differree

Ce document fige la direction produit pour :

- aligner les dashboards admin `web` et `mobile`
- supprimer les elements vraiment inutiles ou trompeurs
- rendre l'admin plus complet, detaille, actionnable et exportable
- ameliorer la communication `admin -> users` et `users -> admin`
- mieux structurer l'experience utilisateur cote `web` et `mobile`
- aligner l'IA admin sur cette nouvelle organisation

Important :

- `CGU` et `Privacy` sont conservees
- elles seront deplacees dans `Settings > Legal`
- ce plan est volontairement garde comme reference avant implementation

## Vision

Le produit doit offrir :

- un admin `web` complet pour le pilotage
- un admin `mobile` coherent, compact et rapide pour les actions urgentes
- une experience `user` plus claire, moins cachee dans `Settings`
- une couche `communication` centrale, traquable et segmentable
- une couche `IA admin` qui aide vraiment l'admin a comprendre, prioriser et agir

Le principe directeur :

- voir
- comprendre
- agir
- communiquer
- exporter
- tracer

## Etat actuel

### Forces actuelles

- le `mobile admin` a deja des briques terrain utiles :
  - `stock`
  - `crm`
  - `support`
  - `disputes`
  - `logs`
  - `security`
  - `settings`
  - `cgu`
  - `privacy`
- le `web admin` a deja des briques de pilotage utiles :
  - `subscriptions`
  - `demos`
  - `broadcast`
  - tables detaillees plus lisibles
- le produit a deja des briques reutilisables :
  - `smart reminders`
  - `user notifications`
  - `support tickets`
  - `disputes`
  - `campaign modal` cote CRM
  - plusieurs exports CSV / PDF

### Faiblesses actuelles

- architecture admin differente entre `web` et `mobile`
- noms d'onglets differents
- logique de navigation differente
- elements visibles mais trompeurs sur certains ecrans
- communication admin trop dispersee
- support / disputes trop caches cote user
- inbox utilisateur non unifiee
- exports presents mais disperses
- IA presente mais pas encore assez alignee sur le travail reel de l'admin

## Structure cible admin

Les deux surfaces admin doivent converger vers cette structure :

1. `Overview`
2. `Users`
3. `Stores`
4. `Subscriptions`
5. `Demos`
6. `Operations`
7. `Communications`
8. `Security & Audit`
9. `Settings`

### Detail de chaque section

#### 1. Overview

But :

- vue globale et priorisee

Contenu :

- sante systeme
- KPI business
- alertes critiques
- top boutiques
- comptes a risque
- trials / subscriptions a surveiller
- incidents securite recents

Regle :

- chaque KPI doit ouvrir une vue filtree utile

#### 2. Users

But :

- gerer les comptes

Contenu :

- liste utilisateurs
- roles
- statuts
- recherche
- filtres
- bannir / reactiver
- message individuel
- export CSV

#### 3. Stores

But :

- piloter les boutiques

Contenu :

- liste boutiques
- proprietaire
- activite
- chiffre d'affaires
- volume
- recherche
- export CSV

#### 4. Subscriptions

But :

- piloter le revenu et les comptes a risque

Contenu :

- plan
- provider
- statut
- echeance
- grace
- read-only
- evenements d'abonnement
- actions admin
- export CSV

#### 5. Demos

But :

- suivre et convertir les sessions demo

Contenu :

- sessions actives / expirees
- type `retail / restaurant / enterprise`
- surface `mobile / web`
- expiration
- contact capture
- conversion
- export leads

#### 6. Operations

But :

- rassembler les briques metier actionnables

Sous-sections :

- `Stock`
- `CRM`
- `Support`
- `Disputes`

Chaque sous-section doit avoir :

- KPI
- liste detaillee
- filtres
- actions
- export

#### 7. Communications

But :

- centraliser toute la communication admin

Sous-sections :

- `Broadcast`
- `Segments`
- `Direct`
- `Templates`
- `History`

#### 8. Security & Audit

But :

- piloter la securite et tracer les actions

Sous-sections :

- `Security Events`
- `Admin Logs`
- `Sessions`
- `Sensitive actions`
- `Exports`

#### 9. Settings

But :

- configuration systeme et outils sensibles

Sous-sections :

- `System`
- `Data Explorer`
- `Legal`

Dans `Legal` :

- `CGU`
- `Privacy`

## Ce qu'on garde, deplace, fusionne, ajoute

### Garder

- `stock`
- `crm`
- `support`
- `disputes`
- `security`
- `logs`
- `subscriptions`
- `demos`
- `broadcast / comms`
- `settings`
- `cgu`
- `privacy`

### Deplacer

- `logs` -> `Security & Audit`
- `CGU` -> `Settings > Legal`
- `Privacy` -> `Settings > Legal`
- `finance` -> absorbe dans `Overview`

### Fusionner

- `comms` mobile + `broadcast` web -> `Communications`
- `global` mobile + `overview` web -> `Overview`
- `support`, `disputes`, `stock`, `crm` -> `Operations`

### Ajouter au web

- `stock`
- `crm`
- `logs admin`
- historique de messages plus riche

### Ajouter au mobile

- `subscriptions`
- `demos`
- exports compacts
- raccourcis KPI -> vues filtrees

## Communication admin -> users

La communication doit devenir un centre produit a part entiere.

### Capacites attendues

- envoyer a tous
- envoyer a un groupe
- envoyer a un utilisateur precis

### Ciblage attendu

- role
- plan
- statut abonnement
- pays
- boutique
- secteur
- utilisateurs actifs / inactifs
- nouveaux inscrits
- demos non converties
- tickets ouverts
- litiges ouverts
- clients avec impayes si applicable

### Types d'envoi

- `broadcast`
- `segment campaign`
- `direct message`

### Historique obligatoire

- auteur admin
- type d'envoi
- cible
- volume
- date
- statut

### Templates prioritaires

- bienvenue
- fin d'essai
- paiement echoue
- relance conversion demo
- maintenance
- incident produit
- support

## Communication users -> admin

### Probleme actuel

- support et litiges sont trop enfouis
- messages admin et support ne forment pas une inbox claire

### Experience cible

- une vraie `Inbox` utilisateur sur `web` et `mobile`
- categories :
  - `annonces admin`
  - `support`
  - `systeme`
  - `facturation`
- badge non lu
- recherche
- historique
- CTA dans chaque message

### Support cible

- vrai fil de discussion
- statut clair :
  - `open`
  - `waiting_admin`
  - `waiting_user`
  - `resolved`
- reponse simple
- historique lisible
- acces plus visible que `Settings`

## Ameliorations UX prioritaires cote user

### 1. Inbox unifiee

- remonter `/user/notifications` dans un vrai ecran
- ne plus laisser les messages admin uniquement dans un modal cache

### 2. Support visible

- sortir le support important de `Settings`
- garder `Settings` pour la configuration, pas pour les flux critiques

### 3. Rappels plus actionnables

- transformer `Smart Reminders` en cartes avec CTA clairs
- pas seulement de l'information

### 4. Parcours exports plus clairs

- harmoniser les exports
- mieux indiquer ce qui est exporte, dans quel format et depuis quel filtre

### 5. Parcours d'action rapide

- depuis le dashboard :
  - ajouter produit
  - creer commande
  - repondre a un ticket
  - payer abonnement
  - envoyer un message

### 6. Etats visuels plus fiables

- aucun bouton visible sans effet clair
- aucun KPI non cliquable
- aucun filtre visible qui ne filtre rien

## Exports

Le produit doit devenir systematiquement exportable la ou cela aide la gestion.

### Sections a exporter

- `Users`
- `Stores`
- `Subscriptions`
- `Demos`
- `Stock`
- `CRM`
- `Support`
- `Disputes`
- `Security events`
- `Admin audit logs`

### Formats

- `CSV` partout en priorite
- `PDF` la ou utile pour presentation / partage

### Regle

- export = toujours lie aux filtres actifs

## IA admin : cible

L'IA admin ne doit pas etre un gadget. Elle doit servir de copilote d'exploitation.

### Objectifs

- repondre aux questions de l'admin
- expliquer ce qui se passe
- proposer quoi faire ensuite
- gagner du temps
- reduire les clics

### Ce que l'IA admin doit savoir faire

#### 1. Repondre aux questions de pilotage

Exemples :

- quels comptes sont a risque cette semaine
- quels essais expirent sous 3 jours
- quels tickets sont en retard
- quels pays / boutiques ont baisse
- quels incidents securite meritent action

#### 2. Proposer des actions

Exemples :

- relancer ces 12 demos enterprise
- envoyer un message aux comptes en read-only
- preparer un broadcast pour les paiements echoues
- lister les boutiques a faible stock critique

#### 3. Generer la communication

Exemples :

- rediger un message pour les trials qui expirent
- preparer une relance support
- preparer une campagne vers un segment CRM

#### 4. Expliquer les indicateurs

Exemples :

- pourquoi le MRR baisse
- pourquoi les tickets support montent
- quels signaux montrent un risque de churn

#### 5. Aider a exporter et resumer

Exemples :

- exporte-moi les boutiques les plus rentables
- prepare un recap des litiges ouverts
- prepare un rapport CSV + resume humain

### Surface cible de l'IA admin

- bouton `Ask Admin AI` sur `Overview`
- panneau lateral sur `web`
- assistant compact sur `mobile`
- suggestions contextuelles dans :
  - `Subscriptions`
  - `Demos`
  - `Communications`
  - `Security & Audit`

### Guardrails IA admin

- pas d'action sensible sans confirmation
- citer les donnees utilisees
- distinguer faits / inference / recommandation
- proposer des segments ou exports, pas juste du texte

## Lots d'implementation recommandes

### Lot 1. Nettoyage et alignement de navigation

- retirer seulement les top-level inutiles
- harmoniser les noms
- deplacer `finance`, `logs`, `CGU`, `Privacy`
- corriger tous les controles trompeurs

### Lot 2. Communications et inbox

- creer la section `Communications`
- unifier `broadcast / comms / messages`
- creer la vraie `Inbox` utilisateur
- mieux exposer support et litiges

### Lot 3. Completer les sections manquantes

- ajouter `Subscriptions` et `Demos` au mobile
- ajouter `Stock`, `CRM` et `Audit logs` au web admin

### Lot 4. Exports et bulk actions

- exports CSV partout
- actions de masse
- historique d'exports

### Lot 5. IA admin

- assistant admin centre sur :
  - risque
  - priorisation
  - communication
  - export
  - audit

## Criteres de succes

- web et mobile partagent la meme architecture admin
- plus aucun onglet important absent d'une surface sans justification
- plus aucun bouton visible sans effet utile
- communication admin possible :
  - globale
  - segmentee
  - individuelle
- support user plus visible et plus clair
- inbox utilisateur unifiee
- exports coherents et accessibles
- IA admin capable d'aider sur les vraies taches de gestion

## Decision log

Decisions deja prises :

- garder `CGU`
- garder `Privacy`
- ne supprimer que les elements vraiment inutiles
- aligner `web` et `mobile`
- faire de la `communication` une brique centrale
- aligner l'IA admin sur ce nouveau modele

## Prochaine etape

Quand on reprendra ce chantier, commencer par :

1. `Lot 1`
2. puis `Lot 2`

Ne pas commencer par l'IA admin seule avant d'avoir aligne la structure et la communication.
