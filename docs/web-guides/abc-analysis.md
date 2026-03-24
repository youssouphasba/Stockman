# Guide — Analyse ABC

## 1. Rôle du module

L'analyse ABC classe vos produits en trois groupes (A, B, C) selon leur contribution au chiffre d'affaires et au volume de ventes. Cela permet d'identifier les produits stratégiques, intermédiaires et à faible rotation.

**Profils concernés** : shopkeeper, admin.

## 2. Accès

Barre latérale → **Analyse ABC** (ou via Analytics → ABC).

## 3. Lecture de l'écran

### En-tête
- **Icône** : BarChart3 (primary).
- **Titre** : « Analyse ABC — Priorisation du stock ».
- **Sous-titre** : « Classifiez vos produits selon leur impact sur le chiffre d'affaires et les ventes. »

### Cartes KPI (3 indicateurs)

| KPI | Description | Détail |
|-----|-------------|--------|
| Classe A | Nombre de produits stratégiques | % du CA total |
| Classe B | Nombre de produits intermédiaires | % du CA total |
| Classe C | Nombre de produits à surveiller | % du CA total |

### Barres résumées par classe

Chaque classe est présentée avec :

| Classe | Couleur | Rôle |
|--------|---------|------|
| A (stratégique) | Primary | Top produits : ~20 % des références générant ~80 % du CA |
| B (intermédiaire) | Ambre | Produits de soutien : ~30 % des références, ~15 % du CA |
| C (à surveiller) | Gris (slate) | Stock à risque d'immobilisation : ~50 % des références, ~5 % du CA |

### Tableau des produits par classe

Chaque section de classe affiche un tableau avec :

| Colonne | Contenu |
|---------|---------|
| Produit | Nom du produit |
| Catégorie | Catégorie principale |
| CA | Chiffre d'affaires sur la période |
| Quantité vendue | Volume total de ventes |
| % du CA | Contribution au CA total |
| % cumulé | Pourcentage cumulé (pour déterminer la classe) |

### Barre de recherche
Filtre texte pour rechercher un produit dans l'ensemble des résultats.

## 4. Filtres

Les filtres globaux du panneau AnalyticsFilters s'appliquent :

| Filtre | Impact |
|--------|--------|
| Période | Change la fenêtre d'analyse |
| Boutique | Restreint l'analyse à une boutique |
| Catégorie | Filtre par catégorie |
| Fournisseur | Filtre par fournisseur |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré avec texte « Analyse en cours... » |
| Aucune donnée | Message « Aucune donnée de vente pour cette période. » |
| Erreur | Message d'erreur dans un bandeau |

## 6. Cas d'utilisation

| Scénario | Action recommandée |
|----------|--------------------|
| Identifier les produits critiques | Consultez la classe A et veillez à ne jamais manquer de stock |
| Réduire les coûts de stockage | Analysez la classe C : envisagez le déréférencement des produits sans vente |
| Optimiser les réapprovisionnements | Priorisez les commandes fournisseur sur les produits de classe A |

## 7. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment sont calculées les classes ? | Par contribution cumulative au CA : A = 0-80 %, B = 80-95 %, C = 95-100 %. |
| La classification change-t-elle avec la période ? | Oui, modifiez la période dans les filtres pour voir l'évolution. |
| Puis-je exporter l'analyse ? | Utilisez la bibliothèque de rapports pour un export Excel. |

## 8. Guide rapide intégré

1. **Analyse ABC** — Identifiez vos produits phares (A) et ceux à faible rotation (C).
2. **Classe A — Stratégique** — Vos top produits : surveillez leur stock de près pour éviter les ruptures.
3. **Classe C — À surveiller** — Produits à faible contribution : évaluez s'il faut les maintenir ou les déréférencer.
4. **Recherche & filtres** — Utilisez la barre de recherche et les filtres analytics pour affiner l'analyse.
