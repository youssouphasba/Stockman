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

Nouveaute utile :

- les depenses et les ventes se lisent maintenant via un filtre de periode : Voir tout, Mois ou Annee ;
- en mode annee, vous pouvez choisir directement les mois rattaches a l'annee affichee.

## 4. Lecture des indicateurs

- le chiffre d'affaires correspond au total des ventes sur la periode ;
- la marge brute correspond au chiffre d'affaires moins le cout d'achat des produits vendus ;
- les charges correspondent aux depenses enregistrees manuellement ;
- les pertes de stock correspondent aux sorties declarees comme perte, casse ou ajustement ;
- le resultat net correspond au chiffre d'affaires moins le cout d'achat des produits vendus, moins les charges, moins les pertes de stock enregistrees.

Points importants :

- la valeur du stock restant n'est pas retiree du resultat net ;
- les cartes KPI sont cliquables pour ouvrir leur detail.

## 5. Menus et visibilite

Les sous-modules visibles doivent suivre le vrai code metier :

- les elements accessibles dans l'ecran ne doivent pas etre caches a tort ;
- les elements reserves a `Enterprise` doivent etre masques pour `Starter` et `Pro` ;
- les entrees ouvertes depuis le menu mobile doivent renvoyer vers le bon module.

## 6. Hors ligne et synchronisation

Le module conserve un comportement offline partiel sur les flux compatibles :

- certaines depenses peuvent rester visibles en attente ;
- certaines actions sont synchronisees automatiquement au retour du reseau ;
- les bandeaux ou badges **En attente** signalent ce qui n'est pas encore envoye.

## 7. Filtre de periode

Le filtre de periode sert a verifier rapidement la bonne tranche comptable sans dupliquer inutilement l'historique.

- **Voir tout** affiche l'historique detaille complet de la periode chargee ;
- **Mois** permet de naviguer avec des fleches ou de choisir directement un mois ;
- **Annee** affiche l'annee choisie et permet aussi de selectionner un mois de cette annee ;
- les cartes mensuelles gardent le total, le nombre d'ecritures ou de ventes, puis le detail ouvrable si besoin.

## 8. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi certains graphiques ou sous-modules n'apparaissent pas ? | Ils peuvent dependre du plan, des permissions ou des donnees disponibles. |
| Que signifie **En attente** ? | L'action a ete gardee localement et sera synchronisee des le retour du reseau. |
| Les analyses IA se lancent-elles seules ? | Non, elles dependent du flux et des actions disponibles dans l'ecran. |
