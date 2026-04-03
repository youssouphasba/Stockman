# Messages de limites de plan (boutiques et employes)

## Objectif

Ce guide explique le comportement attendu quand une action est refusee a cause des limites du plan.

## Cas couverts

- Creation d'une boutique supplementaire.
- Creation d'un employe supplementaire.

## Comportement attendu

Quand le serveur renvoie un refus (403) avec un message metier, l'application doit afficher ce message tel quel a l'utilisateur.

Exemples de messages:

- "Votre plan Starter est limite a 1 boutique. Passez a un plan superieur."
- "Votre plan Starter est limite a 3 utilisateurs. Passez a un plan superieur."

## Pourquoi ce changement

Avant, certains ecrans affichaient un message generique ("Impossible de creer..."), sans expliquer la vraie cause.
Desormais, la raison precise est visible directement dans l'alerte.

## Impact support

- Moins de confusion lors des blocages lies au plan.
- Moins de tickets "bug" quand il s'agit en realite d'une limite de plan.
