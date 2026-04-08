# Guide - Finance et comptabilite

## 1. Role du module

Le module Finance et comptabilite regroupe les indicateurs financiers, les depenses, les ventes, certaines factures et les vues de synthese.

Profils concernes : utilisateurs ayant la permission `accounting`.

## 2. Acces

Barre laterale -> **Finance et comptabilite**.

## 3. Ce que l'ecran couvre

- indicateurs financiers ;
- charges et depenses ;
- ventes et factures ;
- certaines analyses et rapports ;
- diagnostic ou resume IA selon le contexte.

## 4. Menus et visibilite

Les sous-modules visibles doivent suivre le vrai code metier :

- les elements accessibles dans l'ecran ne doivent pas etre caches a tort ;
- les elements reserves a `Enterprise` doivent etre masques pour `Starter` et `Pro` ;
- les entrees ouvertes depuis le menu mobile doivent renvoyer vers le bon module.

## 5. Hors ligne et synchronisation

Le module conserve un comportement offline partiel sur les flux compatibles :

- certaines depenses peuvent rester visibles en attente ;
- certaines actions sont synchronisees automatiquement au retour du reseau ;
- les bandeaux ou badges **En attente** signalent ce qui n'est pas encore envoye.

## 6. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi certains graphiques ou sous-modules n'apparaissent pas ? | Ils peuvent dependre du plan, des permissions ou des donnees disponibles. |
| Que signifie **En attente** ? | L'action a ete gardee localement et sera synchronisee des le retour du reseau. |
| Les analyses IA se lancent-elles seules ? | Non, elles dependent du flux et des actions disponibles dans l'ecran. |
