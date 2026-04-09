# Guide - Analyse ABC

## 1. Role du module

L'analyse ABC classe vos produits en trois groupes selon leur contribution au chiffre d'affaires :

- **Classe A** : produits prioritaires qui portent l'essentiel des ventes.
- **Classe B** : produits intermediaires a optimiser.
- **Classe C** : produits a faible contribution, a surveiller pour eviter d'immobiliser trop de stock.

**Profils concernes** : shopkeeper, admin.

## 2. Acces

Barre laterale -> **Analyse ABC**.

## 3. Lecture de l'ecran

### En-tete

- **Titre** : `Analyse ABC stock & rotation`
- **Sous-titre** : resume dynamique selon la periode, la boutique, la categorie et le fournisseur selectionnes.

### Cartes KPI

Les cartes en haut de l'ecran servent a la fois de resume et de filtres rapides.

| Carte | Effet |
|------|-------|
| CA analyse | Revient a la vue complete |
| Produits classes | Revient a la vue complete |
| Classe A | Affiche seulement les produits de classe A |
| Classe B | Affiche seulement les produits de classe B |
| Classe C | Affiche seulement les produits de classe C |

### Graphiques

Deux graphiques completent la lecture :

| Graphique | Lecture |
|----------|---------|
| Repartition des produits | Compare le nombre de references dans les classes A, B et C |
| Poids du chiffre d'affaires | Compare la contribution au chiffre d'affaires de chaque classe |

### Zone de filtres locale

| Element | Usage |
|--------|-------|
| Recherche | Filtre le tableau par nom de produit |
| Boutons `Toutes les classes`, `Classe A`, `Classe B`, `Classe C` | Restreignent la liste au segment choisi |
| Badge de filtre actif | Rappelle si l'ecran affiche toute l'analyse ou une seule classe |

### Tableau des produits

| Colonne | Contenu |
|---------|---------|
| Produit | Nom du produit et part du chiffre d'affaires |
| Classe | Badge A, B ou C |
| Ventes | Nombre de ventes sur la periode |
| CA genere | Chiffre d'affaires et marge brute |
| Stock actuel | Quantite disponible et unite |
| Conseil | Recommandation de gestion du stock |

## 4. Filtres globaux

Les filtres globaux du panneau Analytics s'appliquent :

| Filtre | Impact |
|--------|--------|
| Periode | Change la fenetre d'analyse |
| Boutique | Restreint l'analyse a une boutique |
| Categorie | Filtre par categorie |
| Fournisseur | Filtre par fournisseur |

## 5. Etats de l'interface

| Etat | Description |
|------|-------------|
| Chargement | Spinner central pendant le calcul |
| Aucun produit classe | Message indiquant qu'aucun produit n'entre dans la selection |
| Bloc correlations | Apparait seulement si des produits sont souvent achetes ensemble |

## 6. Cas d'utilisation

| Scenario | Action recommandee |
|----------|--------------------|
| Prioriser les achats | Ouvrir la classe A pour securiser les produits critiques |
| Revoir le stock dormant | Filtrer la classe C pour identifier les produits a faible rotation |
| Optimiser un segment moyen | Analyser la classe B pour faire progresser les ventes ou la marge |

## 7. Questions frequentes

| Question | Reponse |
|----------|---------|
| Comment sont calculees les classes ? | Par contribution cumulative au chiffre d'affaires sur la periode analysee. |
| Le tableau change-t-il quand je clique sur une carte ? | Oui. Les cartes KPI servent de filtres rapides. |
| A quoi servent les graphiques ? | A visualiser rapidement la structure du portefeuille produit avant d'entrer dans le detail. |

## 8. Guide rapide integre

1. **Analyse ABC** - Reperez les produits prioritaires et ceux a faible rotation.
2. **Cartes KPI** - Cliquez sur une carte pour filtrer la vue.
3. **Graphiques** - Comparez en un coup d'oeil le poids de chaque classe.
4. **Tableau** - Detaillez chaque produit et appliquez les actions de gestion adaptees.
