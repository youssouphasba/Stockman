# Supplier Portal Roadmap

Date de preparation : 2026-03-11
Statut : partiellement implemente

Ce document fige le modele cible du `compte fournisseur` dans Stockman.

Le principe retenu :

- le compte fournisseur n'est pas un deuxieme compte commercant
- ce n'est pas un outil complet pour gerer tout le business du fournisseur
- c'est un `portail fournisseur marketplace / approvisionnement`
- son but principal est d'ameliorer la qualite des donnees, des commandes et de
  l'approvisionnement pour le compte commercant

## Objectif

Permettre au commercant de disposer de donnees fiables pour :

- chercher un fournisseur
- comparer les offres
- commander
- suivre une livraison
- receptionner
- gerer les factures et incidents

Et permettre au fournisseur de :

- publier un catalogue
- recevoir des commandes
- suivre les livraisons
- fournir les documents necessaires

Sans transformer le compte fournisseur en ERP complet.

## Ce qu'il ne faut pas faire

Le compte fournisseur ne doit pas devenir :

- une caisse / POS
- une vraie comptabilite complete
- un CRM complet
- un vrai dashboard business multi-modules comme le compte commercant
- un back-office de gestion complet generaliste

## Ce qu'il faut faire

Le compte fournisseur doit devenir un portail structure autour de 5 briques.

## 1. Profil fournisseur fiable

### Donnees necessaires

- nom societe
- categorie / specialite
- ville / pays
- zones de livraison
- delai moyen
- minimum de commande
- contact principal
- email / telephone pro
- description simple

### Optionnel plus tard

- verifications documentaires
- statuts de validation
- badge fournisseur verifie

### But

Donner au commercant des informations exploitables et comparables.

## 2. Catalogue fournisseur propre

### Donnees necessaires

- produits
- prix
- unite
- stock ou disponibilite
- MOQ
- categorie
- photo si utile
- promotions B2B si pertinent

### Regle

Le catalogue doit etre pense pour :

- comparaison
- commande
- matching avec les produits commercant

Pas pour faire de la gestion interne fournisseur complete.

## 3. Cycle de commande fournisseur

### Etats cibles

- nouvelle commande
- confirmee
- en preparation
- expediee
- partiellement livree
- livree
- annulee

### Elements a supporter

- confirmation de disponibilite
- quantites partielles
- facture jointe
- bon de livraison
- commentaire / incident

### But

Rendre le flux achat fiable pour le commercant.

## 4. Documents fournisseur

### Documents minimum

- facture fournisseur
- bon de livraison
- piece jointe de commande si besoin

### But

Permettre au commercant de garder une trace exploitable.

## 5. Fiabilite fournisseur

### Indicateurs minimum

- commandes recues
- taux de confirmation
- taux de livraison complete
- retards
- annulations
- note moyenne

### But

Donner au commercant une idee claire de la fiabilite du fournisseur.

## Impacts cote commercant mobile

Le mobile doit rester un outil terrain.

### A faire

- distinguer clairement :
  - fournisseur manuel
  - fournisseur marketplace
- commander rapidement depuis le catalogue
- suivre les commandes
- receptionner
- faire le matching de produits
- consulter facture et livraison

### A ne pas surcharger

- pas trop d'analyse lourde
- pas de pilotage procurement complexe

### Positionnement

Le mobile commercant sert a :

- executer
- consulter
- receptionner

## Impacts cote commercant web

Le web devient l'outil avance.

### A faire

- score fournisseur
- comparaison des fournisseurs
- benchmark par produit
- historique prix
- commandes et documents
- vue multi-boutiques
- plus tard suggestions et opportunites groupees

### Positionnement

Le web commercant sert a :

- comparer
- decider
- piloter
- auditer

## Impacts cote dashboard admin

L'admin doit pouvoir superviser et proteger la qualite de la marketplace.

### A faire

- liste des comptes fournisseurs
- statut de validation
- controle de qualite du profil
- controle de qualite du catalogue
- suivi des commandes marketplace
- taux de service global
- retards
- annulations
- fournisseurs inactifs
- detection des comptes douteux

### Outils admin utiles

- valider / suspendre un fournisseur
- masquer un fournisseur
- desactiver un catalogue
- consulter les incidents

## Garde-fous anti-abus

Si le compte fournisseur est trop "riche", des commercants risquent de l'utiliser
comme compte principal detourne.

### Pour l'eviter

- limiter le scope fonctionnel
- parcours d'inscription distinct
- messaging clair `Compte fournisseur marketplace`
- moderation / verification plus forte
- modules visibles limites
- pas de dashboard business complet

### Verification plus tard

- email pro
- telephone pro
- categorie / activite
- zone geographique
- document legal selon pays si necessaire

## UX recommandee

## Cote fournisseur

Le portail fournisseur devrait etre organise en :

1. `Profil`
2. `Catalogue`
3. `Commandes`
4. `Livraisons`
5. `Documents`
6. `Performance`

### Important

Rester simple.

Le compte fournisseur ne doit pas ressembler a un compte commerçant complet.

## Cote commercant

### Mobile

- `Fournisseurs`
- `Commandes`
- `Reception`

### Web

- `Suppliers`
- `Orders`
- `Procurement`
- `Analytics achats`

## Donnees a fiabiliser

Pour que le compte commercant ait de bonnes donnees, il faut fiabiliser :

- statuts de commandes
- matching produits
- delais
- disponibilites
- quantites recues
- factures et bons
- historiques prix

## Roadmap recommandee

## Phase 1. Fondations fournisseur

- profil fournisseur
- catalogue propre
- cycle commande/livraison coherent
- documents minimum

## Phase 2. Coherence cote commercant

- mobile commercant : commande, reception, facture
- web commercant : detail fournisseur riche, benchmark, historique

## Phase 3. Fiabilite et admin

- score fournisseur
- moderation admin
- validation fournisseur
- suivi marketplace global

## Phase 4. Procurement avance

- historique prix
- comparaisons poussees
- suggestions de sourcing
- coordination multi-boutiques

## Priorites recommandees

1. profil + catalogue + statuts
2. coherence commande/livraison/facture
3. impacts cote commercant web/mobile
4. supervision admin
5. score fournisseur

## Questions a figer plus tard

- faut-il une validation manuelle de tous les fournisseurs ?
- faut-il un badge `verifie` ?
- faut-il permettre plusieurs utilisateurs par fournisseur ?
- faut-il autoriser plusieurs catalogues ou un catalogue unique ?

## Conclusion

Le bon modele n'est pas de faire un vrai "compte business fournisseur" complet.

Le bon modele est :

- `compte fournisseur = portail marketplace / appro`
- `compte commercant = coeur du produit`
- toutes les evolutions fournisseur doivent d'abord ameliorer :
  - la qualite des donnees
  - la fluidite d'approvisionnement
  - la coherence du parcours commercant

Statut :

- `v1 web implementee pour le portail fournisseur`
- `profil + catalogue + commandes + fiabilite visibles cote fournisseur`
- `alignement web sur le contrat backend/mobile pour les commandes recues`
- `supervision admin et couche documents fournisseur encore a completer`
- `important si la marketplace devient un axe fort`
