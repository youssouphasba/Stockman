# Notes, calendrier et rappels

## Positionnement

Ce module est reserve au plan `Enterprise`.

Il permet a chaque utilisateur de gerer :

- ses notes personnelles ;
- ses rappels manuels ;
- un calendrier mensuel de suivi.

Les donnees sont personnelles par utilisateur. Un employe ne voit pas les notes ni les rappels d'un autre utilisateur.

## Regles produit

- Mobile et web partagent la meme source de donnees.
- Le module ne remplace pas les alertes automatiques de Stockman.
- Les rappels peuvent utiliser les canaux `in_app`, `push` et `email`.
- Une note peut exister sans date de rappel.
- Un rappel peut etre marque comme termine puis rouvert.

## Placement

- Web app : module visible dans la sidebar.
- Mobile : module visible dans les menus lateraux des onglets, avec ecran dedie.

## Donnees gerees

Un element contient au minimum :

- un titre ;
- un contenu optionnel ;
- une date de rappel optionnelle ;
- un ou plusieurs canaux ;
- un statut actif ou termine.

## Evolutions possibles

- repetition des rappels ;
- assignation a un autre utilisateur ;
- rappels lies a un client, un fournisseur, un produit ou une commande ;
- filtres par boutique dans les comptes multi-boutiques.
