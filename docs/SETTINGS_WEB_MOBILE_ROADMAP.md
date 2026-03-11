# Settings Web Mobile Roadmap

Date de preparation : 2026-03-11
Statut : planifie, non implemente comme chantier global

Ce document fige l'organisation cible des parametres `web` et `mobile` afin de
garder :

- une source de verite claire
- moins d'incoherences entre clients
- une experience mobile simple
- une experience web plus complete et plus avancee

## Vision

Le modele retenu :

- `mobile` = parametres utiles au terrain et a l'usage quotidien
- `web` = parametres complets, avances et structurants
- `compte entreprise` = source de verite des regles globales
- `boutique` = surcharge locale quand c'est pertinent
- `utilisateur` = preferences personnelles seulement

Le web doit etre la surface principale de configuration.
Le mobile doit rester simple, rapide et rassurant.

## Problemes a eviter

### 1. Deux sources de verite

Il ne faut pas qu'un meme parametre soit modifie :

- au niveau `user_settings`
- au niveau `store`
- et parfois au niveau `account`

sans regle explicite.

### 2. Parametres trop lourds sur mobile

Le mobile ne doit pas porter toute la complexite documentaire, fiscale,
multi-boutiques ou organisationnelle.

### 3. Parametres critiques caches

Le web ne doit pas etre moins complet que le mobile sur :

- identite
- boutique
- documents
- POS
- permissions
- integrations

## Regle generale de hierarchie

Ordre de precedence recommande :

1. `user preferences`
2. `store settings`
3. `account settings`
4. `defaults systeme`

Important :

- les `preferences utilisateur` ne doivent jamais redefinir des regles metier du compte
- elles servent seulement a personnaliser l'experience

## Les 3 couches de parametres

## 1. Parametres compte

Portes par `BusinessAccount`.

### Exemples

- nom entreprise
- business type principal
- contact principal
- contact de facturation
- modules actifs
- abonnement / plan
- regles globales d'entreprise
- branding global si commun
- integrations
- politiques d'approbation
- politiques de securite

### Surface principale

- `web` uniquement ou `web-first`

### Mobile

- consultation partielle
- edition tres limitee si necessaire

## 2. Parametres boutique

Portes par `store`.

### Exemples

- nom boutique
- adresse
- telephone
- email local
- devise ou contexte local si applicable
- parametres POS locaux
- terminaux
- recu boutique
- facture boutique
- caisses / imprimantes
- taxes locales si la logique produit l'exige

### Surface principale

- `web`

### Mobile

- edition des champs essentiels
- surtout pour les besoins terrain

## 3. Preferences utilisateur

Portees par `user`.

### Exemples

- langue
- boutique active
- mode simple mobile
- preferences d'affichage
- raccourcis
- options de notifications personnelles

### Surface principale

- `mobile + web`

### Regle

Une preference utilisateur ne doit pas modifier un document officiel,
une politique compte, ou une regle de boutique.

## Decoupage fonctionnel recommande

## Bloc A. Identite

### Compte

- nom legal entreprise
- raison sociale
- logo principal
- email principal
- telephone principal
- pays

### Boutique

- nom affiche boutique
- adresse
- telephone local
- email local

### Recommandation

- edition complete sur web
- edition rapide du nom/adresse boutique sur mobile

## Bloc B. POS

### Boutique

- terminaux
- modes de paiement actifs
- regles d'impression
- libelles ticket
- arrondi
- comportement caisse

### Regle produit

Le web doit offrir la configuration complete.
Le mobile doit permettre les ajustements rapides necessaires en boutique.

## Bloc C. Recu

### Boutique

- nom sur recu
- pied de recu
- telephone / adresse affiches
- message de remerciement

### Compte

- valeurs par defaut si une boutique n'a pas de surcharge

### Regle

Le web doit etre la reference complete.
Le mobile peut exposer les champs les plus utiles.

## Bloc D. Facture

### Boutique

- nom emetteur
- adresse facture
- type de facture
- prefixe / numerotation
- mentions legales
- conditions de paiement
- footer

### Compte

- regles par defaut
- politique documentaire globale

### Regle

La configuration facture avancee doit etre `web-first`.

## Bloc E. Taxes

### Compte

- politique TVA globale par defaut

### Boutique

- surcharge si necessaire selon la structure ou le pays

### Regle

Le calcul reel doit lire les `effective settings`, jamais un melange ambigu.

## Bloc F. Equipe et permissions

### Compte

- roles de compte
- politiques staff
- limites de plan

### Boutique

- assignation boutique
- overrides de permissions par boutique

### Surface principale

- `web`

### Mobile

- gestion rapide
- creation staff simple
- consultation et modifications limitees si besoin

## Bloc G. Modules

### Compte

- modules actifs/inactifs
- options entreprise

### Regle

- `web` = configuration complete
- `mobile` = consultation, voire edition tres limitee

## Bloc H. Notifications

### Compte

- grandes alertes entreprise
- alertes appro / stock / dettes / documents

### Utilisateur

- canal
- frequence
- bruit de notification

### Regle

- politiques globales au niveau compte
- preferences personnelles au niveau user

## Bloc I. Offline et synchronisation

### Compte / boutique

- comportement sync critique si necessaire
- politique de conflict resolution plus tard

### Utilisateur

- preferences d'affichage des statuts offline

### Regle

Le web et le mobile doivent afficher clairement :

- pending sync
- online only
- derniere synchro

## Bloc J. Integrations

### Compte

- API keys
- webhooks
- logs
- permissions d'integration

### Surface principale

- `web` uniquement

## Repartition web vs mobile

## Mobile = edition essentielle

Le mobile doit privilegier :

- nom boutique
- contact boutique
- recu simple
- caisse / ticket simple
- langue
- preferences perso
- equipe rapide
- boutique active

## Web = edition complete

Le web doit porter :

- identite entreprise complete
- regles multi-boutiques
- documents complets
- facturation / abonnement
- modules
- approbation / politiques
- integrations
- audit des changements

## Ecran web recommande

Le `Settings` web devrait etre redecoupe en centres clairs :

1. `Entreprise`
2. `Boutiques`
3. `POS & Paiements`
4. `Recus & Factures`
5. `Equipe & Permissions`
6. `Modules`
7. `Notifications`
8. `Integrations`
9. `Abonnement`

## Ecran mobile recommande

Le `Settings` mobile devrait etre redecoupe en :

1. `Ma boutique`
2. `Caisse`
3. `Documents`
4. `Equipe`
5. `Abonnement`
6. `Mon profil`
7. `Aide et synchronisation`

## Regles de gouvernance

### Qui peut modifier quoi

- `billing_admin`
  - abonnement
  - facturation
  - pas les regles operationnelles par defaut

- `org_admin`
  - compte
  - boutiques
  - documents
  - modules
  - equipe
  - integrations

- `staff`
  - preferences personnelles
  - et eventuellement quelques reglages terrain limites

## Audit recommande

Tous les changements sensibles doivent etre traces :

- avant / apres
- qui a modifie
- sur quel scope
- date / heure

Scopes sensibles :

- taxes
- documents
- modules
- roles / permissions
- parametres boutique critiques
- integrations

## Strategie de migration

## Phase 1. Cartographie

Faire un inventaire des champs actuels :

- `account settings`
- `store settings`
- `user settings`

Puis classer chaque champ dans la bonne couche.

## Phase 2. Clarification backend

Introduire un schema explicite :

- `AccountSettings`
- `StoreSettings`
- `UserPreferences`

Et une fonction claire de fusion :

- `effective settings`

## Phase 3. Nettoyage web

- regrouper les reglages
- retirer les doublons
- rendre le web complet

## Phase 4. Nettoyage mobile

- simplifier
- garder les reglages essentiels
- retirer les ecrans trop lourds ou ambigus

## Phase 5. Audit et logs

- journal des changements
- affichage des impacts

## Tests a prevoir

- changement d'un reglage compte -> bien refleter sur boutiques sans surcharge
- changement d'un reglage boutique -> surcharge effective seulement pour la boutique
- changement d'une preference user -> impact visuel seulement
- web et mobile lisent les memes `effective settings`
- documents et POS lisent la bonne boutique active
- changement multi-boutiques sans confusion

## Priorites recommandees

1. clarifier la hierarchie `account / store / user`
2. faire du web la reference complete
3. simplifier le mobile
4. tracer les changements sensibles
5. aligner tous les flux documentaires et POS sur les `effective settings`

## Conclusion

Le bon objectif n'est pas d'avoir exactement les memes parametres sur web et mobile.

Le bon objectif est :

- meme source de verite
- meme logique metier
- web plus complet
- mobile plus simple
- aucune ambiguite sur qui porte quel reglage

Statut :

- `planifie`
- `non implemente comme refonte globale`
- `priorite moyenne a forte` selon les modules documentaires, POS et multi-boutiques
