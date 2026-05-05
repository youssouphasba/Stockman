# Guide - Finance et comptabilité

## 1. Rôle du module

Le module Finance et comptabilité regroupe les indicateurs financiers, les dépenses, les ventes, certaines factures et les vues de synthèse.

Profils concernés : utilisateurs ayant la permission `accounting`.

## 2. Accès

Barre latérale -> **Finance et comptabilité**.

## 3. Ce que l'écran couvre

- indicateurs financiers ;
- charges et dépenses ;
- ventes et factures ;
- analyses, rapports et exports ;
- diagnostic ou résumé IA selon le contexte.

Nouveautés utiles :

- les dépenses et les ventes se lisent via un filtre de période : Voir tout, Mois ou Année ;
- en mode Année, vous pouvez choisir directement les mois rattachés à l'année affichée ;
- sur le plan Enterprise, la vue de pilotage affiche une synthèse multi-magasins, une comparaison explicite avec la période précédente, les objectifs facultatifs et le niveau d'accès staff.

## 4. Lecture des indicateurs

- le chiffre d'affaires correspond au total des ventes sur la période ;
- la marge brute correspond au chiffre d'affaires moins le coût d'achat des produits vendus ;
- les charges correspondent aux dépenses enregistrées manuellement ;
- les pertes de stock correspondent aux sorties déclarées comme perte, casse ou ajustement ;
- le résultat net correspond au chiffre d'affaires moins le coût d'achat des produits vendus, moins les charges, moins les pertes de stock enregistrées.

Points importants :

- la valeur du stock restant n'est pas retirée du résultat net ;
- les cartes KPI sont cliquables pour ouvrir leur détail ;
- les comparaisons période à période utilisent les données réelles de la période précédente équivalente.

## 5. Pilotage Enterprise

La vue de pilotage Enterprise sert au suivi de gestion sans saisie obligatoire :

- **Multi-magasins** : affiche le nombre de magasins suivis, le chiffre d'affaires consolidé et le magasin le plus performant sur la période ;
- **Comparaison avec la période précédente** : compare le chiffre d'affaires, le résultat net et les charges avec la période précédente équivalente, en affichant les montants actuels et précédents ;
- **Objectifs de pilotage** : permet de renseigner un objectif de chiffre d'affaires, une marge nette cible et un plafond de charges sans rendre ces champs obligatoires ;
- **Accès staff** : rappelle le niveau de permission comptable du membre connecté et limite les actions sensibles quand l'accès est en lecture seule.

## 6. Menus et visibilité

Les sous-modules visibles doivent suivre le vrai code métier :

- les éléments accessibles dans l'écran ne doivent pas être cachés à tort ;
- les éléments réservés à `Enterprise` doivent être masqués pour `Starter` et `Pro` ;
- les entrées ouvertes depuis le menu mobile doivent renvoyer vers le bon module ;
- les exports et écritures comptables doivent respecter les permissions staff.

## 7. Hors ligne et synchronisation

Le module conserve un comportement hors ligne partiel sur les flux compatibles :

- certaines dépenses peuvent rester visibles en attente ;
- certaines actions sont synchronisées automatiquement au retour du réseau ;
- les bandeaux ou badges **En attente** signalent ce qui n'est pas encore envoyé.

## 8. Filtre de période

Le filtre de période sert à vérifier rapidement la bonne tranche comptable sans dupliquer inutilement l'historique.

- **Voir tout** affiche l'historique détaillé complet de la période chargée ;
- **Mois** permet de naviguer avec des flèches ou de choisir directement un mois ;
- **Année** affiche l'année choisie et permet aussi de sélectionner un mois de cette année ;
- les cartes mensuelles gardent le total, le nombre d'écritures ou de ventes, puis le détail ouvrable si besoin.

## 9. Questions fréquentes

| Question | Réponse |
|---|---|
| Pourquoi certains graphiques ou sous-modules n'apparaissent pas ? | Ils peuvent dépendre du plan, des permissions ou des données disponibles. |
| Que signifie **En attente** ? | L'action a été gardée localement et sera synchronisée dès le retour du réseau. |
| Les analyses IA se lancent-elles seules ? | Non, elles dépendent du flux et des actions disponibles dans l'écran. |
| Les objectifs Enterprise sont-ils obligatoires ? | Non. Ils servent uniquement au pilotage interne et peuvent rester vides. |
