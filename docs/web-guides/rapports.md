# Guide — Bibliothèque de Rapports

## 1. Rôle du module

La bibliothèque de rapports centralise tous les exports analytiques : direction, stock, finance, CRM, approvisionnement et multi-boutiques. Chaque rapport est exportable en Excel et/ou PDF.

**Profils concernés** : shopkeeper, admin.

## 2. Accès

Barre latérale → **Rapports**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Bibliothèque de rapports ».
- **Sous-titre** : description de l'outil.
- **Badges** : période active et portée (boutique ou périmètre autorisé).
- **Bouton Recharger** : actualise toutes les données.

### Cartes KPI (bandeau)

| KPI | Description |
|-----|-------------|
| Rapports disponibles | Nombre de rapports prêts à l'export sur votre périmètre |
| Ventes chargées | Nombre de tickets dans l'historique comptable |
| Factures chargées | Nombre de factures clients de la période |
| Mode d'export | Types de formats disponibles (Excel + PDF) |

### Cartes de rapports

Chaque rapport est une carte colorée affichant : icône, titre, description, indicateurs clés (highlights) et boutons d'export.

| Rapport | Description | Highlights | Formats |
|---------|-------------|------------|---------|
| Cockpit exécutif | Synthèse direction : CA, marge, tickets, rotation et top produits | CA, marge brute, nombre de tickets | Excel, PDF |
| Stock & santé | Ruptures, surstocks, dormants, péremption et réapprovisionnement | Ruptures, stocks faibles, rotation | Excel |
| Finance & ventes | Résultats, ventes, TVA, factures et performance financière | Revenus, résultat net, factures | Excel, PDF |
| CRM & fidélisation | Segments clients, rétention, dette, VIP et priorités de relance | Clients actifs, à risque, dette | Excel |
| Approvisionnement | Classement fournisseurs, besoins locaux et opportunités groupées | Fournisseurs, opportunités, besoins | Excel |
| Benchmark multi-boutiques | Comparaison consolidée des boutiques (admin org uniquement) | Boutiques, CA consolidé, rotation | Excel |

### Contenu des exports

#### Export Cockpit exécutif
- **Excel** : feuilles Synthèse (7 KPI), Top produits (nom, quantité, CA, marge), Top catégories.
- **PDF** : 4 cartes KPI + tableaux top produits et catégories.

#### Export Stock & santé
- **Excel** : feuilles Synthèse (7 KPI stock), Produits critiques (nom, stock, min, manque, valeur), Candidats réappro.

#### Export Finance & ventes
- **Excel** : feuilles Synthèse (7 KPI financiers), Ventes (date, client, paiement, articles, montant), Factures (numéro, client, statut, date, montant).
- **PDF** : 4 cartes KPI + dernières ventes et factures.

#### Export CRM
- **Excel** : feuilles Synthèse (7 KPI CRM), Segments (label, description, clients, exemples).

#### Export Approvisionnement
- **Excel** : feuilles Synthèse (6 KPI), Classement fournisseurs (nom, type, score, dépense, commandes, délai), Suggestions locales.

#### Export Multi-boutiques
- **Excel** : feuille Boutiques (nom, CA, marge, tickets, panier moyen, rotation, ruptures).

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Excel | Sur chaque carte | Télécharge le rapport en format Excel (.xlsx) |
| PDF | Sur certaines cartes | Télécharge le rapport en format PDF |
| Recharger | En-tête | Actualise toutes les données |

## 5. Filtres

Les rapports utilisent les filtres globaux du panneau AnalyticsFilters :

| Filtre | Type | Impact |
|--------|------|--------|
| Période | Jours (7, 30, 90) ou dates personnalisées | Filtre temporel sur toutes les données |
| Boutique | Sélecteur | Restreint à une boutique |
| Catégorie | Sélecteur | Filtre par catégorie produit |
| Fournisseur | Sélecteur | Filtre par fournisseur |

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | 6 squelettes animés en grille |
| Erreur partielle | Bandeau rose « Certaines sections n'ont pas pu être chargées. » |
| Erreur totale | Bandeau rose « Impossible de charger la bibliothèque de rapports. » |
| Export en cours | Spinner sur le bouton d'export |

## 7. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Pourquoi certains rapports ne sont pas disponibles ? | Les rapports dépendent de votre secteur (commerce vs restaurant) et de votre rôle. |
| Comment filtrer par période ? | Utilisez le panneau de filtres analytics accessible depuis la page Rapports. |
| Le benchmark multi-boutiques est-il accessible à tous ? | Non, il est réservé aux administrateurs d'organisation gérant 2+ boutiques. |

## 8. Guide rapide intégré

1. **Bienvenue dans Rapports** — Analysez toutes les données de votre activité depuis un seul endroit.
2. **Filtres** — Ajustez la période, la boutique et la catégorie via le panneau de filtres.
3. **Catégories de rapports** — Chaque carte représente un rapport exportable : direction, stock, finance, CRM, achats.
4. **Export Excel & PDF** — Téléchargez vos rapports en Excel ou PDF depuis les boutons de chaque carte.
