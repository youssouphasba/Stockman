# Guide — Historique des stocks

## 1. Rôle du module

L'Historique des stocks est un journal d'audit de tous les mouvements de stock : entrées, sorties et ajustements. Il permet de retracer chaque opération avec date, produit, quantité, auteur et raison.

**Profils concernés** : shopkeeper, staff, admin (permission `stock` requise).

## 2. Accès

Barre latérale → **Stock & Inventaire** → **Historique stock**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Historique des Stocks ».
- **Sous-titre** : « Journal d'audit filtré par période, magasin, catégorie et fournisseur. »
- **Recherche** : par nom de produit.
- **Export CSV** : télécharge l'historique filtré.

### KPI
| KPI | Description |
|-----|-------------|
| Mouvements | Nombre total de mouvements sur la période |
| Entrées | Somme des quantités reçues / ajustées à la hausse |
| Sorties | Somme des quantités consommées / vendues |
| Produits touchés | Nombre de références distinctes impliquées |

### Filtres par type
Boutons : Tous, Entrées, Sorties, Ajustements.

### Tableau
| Colonne | Contenu |
|---------|---------|
| Date & heure | Date et heure du mouvement |
| Produit | Initiale + nom du produit |
| Mouvement | Badge coloré (vert=entrée, rouge=sortie, ambre=ajustement) |
| Quantité | Quantité avec signe (+/-) |
| Auteur | Nom de l'utilisateur ou « Système » |
| Raison / notes | Contexte du mouvement |

### Pagination
Navigation page par page avec compteur.

## 4. Filtres et recherche

| Filtre | Source | Impact |
|--------|--------|--------|
| Type | Boutons locaux | Tous, Entrées, Sorties, Ajustements |
| Recherche | Barre locale | Par nom de produit ou raison |
| Période | AnalyticsFiltersContext | Jours ou plage personnalisée |
| Boutique | AnalyticsFiltersContext | Filtre par boutique |
| Catégorie | AnalyticsFiltersContext | Filtre par catégorie produit |
| Fournisseur | AnalyticsFiltersContext | Filtre par fournisseur |

## 5. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Filtre type | Clic | Filtre la liste par type de mouvement |
| Export CSV | Clic | Télécharge l'historique filtré en CSV |
| Page ◀ | Clic | Page précédente |
| Page ▶ | Clic | Page suivante |

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Squelettes animés dans le tableau |
| Aucun mouvement | Texte « Aucun mouvement enregistré. » |

## 7. Cas d'usage typiques

- **Audit** : filtrer par « Sorties » pour vérifier les ventes du jour.
- **Investigation** : rechercher un produit spécifique pour retracer ses mouvements.
- **Export** : télécharger le CSV pour analyse dans un tableur.

## 8. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Les mouvements sont-ils modifiables ? | Non, c'est un journal d'audit en lecture seule. |
| Comment filtrer par période ? | Utilisez le panneau de filtres analytics de la page Rapports. |
| Que signifie « Système » comme auteur ? | Le mouvement a été généré automatiquement (vente, réception, etc.). |

## 9. Guide rapide intégré

1. **Journal d'audit** — Consultez tous les mouvements de stock enregistrés.
2. **Filtrez par type** — Entrées, sorties ou ajustements selon votre besoin.
3. **Recherche** — Trouvez rapidement un produit ou une raison de mouvement.
4. **Export** — Téléchargez l'historique en CSV pour une analyse approfondie.
