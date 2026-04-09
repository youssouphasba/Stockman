# Guide - Historique des stocks

## 1. Role du module

L'historique des stocks est le journal d'audit de tous les mouvements de stock : entrees, sorties et ajustements. Il permet de retracer chaque operation avec la date, le produit, la quantite, l'auteur et la raison.

**Profils concernes** : shopkeeper, staff, admin avec la permission `stock`.

## 2. Acces

Barre laterale -> **Stock & Inventaire** -> **Historique stock**.

## 3. Lecture de l'ecran

### En-tete

- **Titre** : `Historique des stocks`
- **Sous-titre** : journal d'audit filtre par periode, magasin, categorie et fournisseur
- **Recherche** : recherche par nom de produit ou raison
- **Export CSV** : telecharge l'historique filtre

### Cartes KPI

Les cartes du haut servent aussi de filtres rapides.

| Carte | Effet |
|------|-------|
| Mouvements | Revient a la vue complete |
| Entrees | N'affiche que les entrees |
| Sorties | N'affiche que les sorties |
| Ajustements | N'affiche que les ajustements |

### Filtres locaux

| Element | Usage |
|--------|-------|
| Boutons `Tous`, `Entrees`, `Sorties`, `Ajustements` | Filtrent la liste par type |
| Recherche | Filtre par produit ou raison |
| Periode globale | Applique la fenetre temporelle choisie dans Analytics |

### Tableau

| Colonne | Contenu |
|---------|---------|
| Date et heure | Horodatage du mouvement |
| Produit | Initiale et nom du produit |
| Mouvement | Badge colore selon le type |
| Quantite | Quantite du mouvement |
| Auteur | Utilisateur ou systeme |
| Raison / notes | Contexte du mouvement |

### Pagination

La pagination permet de parcourir l'historique page par page.

## 4. Boutons et actions

| Action | Effet |
|--------|-------|
| Carte KPI | Applique un filtre rapide |
| Bouton de type | Applique un filtre rapide dans le tableau |
| Export CSV | Telecharge l'historique filtre |
| Fleche precedente | Ouvre la page precedente |
| Fleche suivante | Ouvre la page suivante |

## 5. Etats de l'interface

| Etat | Description |
|------|-------------|
| Chargement | Lignes de squelette dans le tableau |
| Aucun mouvement | Message `Aucun mouvement enregistre.` |

## 6. Cas d'usage typiques

| Scenario | Action recommandee |
|----------|--------------------|
| Verifier les receptions | Cliquer sur la carte `Entrees` |
| Auditer les sorties | Cliquer sur la carte `Sorties` |
| Controler les corrections | Cliquer sur la carte `Ajustements` |
| Exporter l'audit | Utiliser le bouton CSV apres avoir filtre la vue |

## 7. Questions frequentes

| Question | Reponse |
|----------|---------|
| Les mouvements sont-ils modifiables ? | Non. C'est un journal d'audit en lecture seule. |
| Pourquoi les cartes sont cliquables ? | Pour filtrer plus vite sans passer par les boutons du tableau. |
| Que signifie `Systeme` comme auteur ? | Le mouvement a ete genere automatiquement par l'application. |

## 8. Guide rapide integre

1. **Journal d'audit** - Consultez tous les mouvements de stock enregistres.
2. **Cartes KPI** - Cliquez sur une carte pour filtrer immediatement la liste.
3. **Recherche** - Trouvez rapidement un produit ou une raison.
4. **Export** - Telechargez le resultat filtre en CSV pour analyse.
