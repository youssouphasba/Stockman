# Guide — Production

## 1. Rôle du module

Le module Production gère les recettes, les ordres de fabrication, le menu/carte et le suivi des matières premières. Il permet de transformer des ingrédients en produits finis avec suivi des coûts, marges et pertes.

**Profils concernés** : shopkeeper restaurant, chef, boulanger.

## 2. Accès

Barre latérale → **Production** (visible pour les comptes de type restaurant/production).

## 3. Lecture de l'écran

### En-tête
- **Icône** : Factory (secondary).
- **Titre** : « Production ».
- **Bouton contextuel** : change selon l'onglet actif (Nouvelle recette / Ajouter un plat / Ajouter un ingrédient).

### Cartes KPI (4 indicateurs)

| KPI | Icône | Couleur | Description |
|-----|-------|---------|-------------|
| Aujourd'hui | Flame | Ambre | Nombre de productions lancées aujourd'hui |
| Ce mois | Calendar | Bleu | Productions du mois |
| Coût mois | DollarSign | Vert | Coût total des matières consommées |
| Pertes | AlertTriangle | Rouge | Pourcentage de pertes sur la production |

### Navigation par onglets (4 sections)

| Onglet | Icône | Contenu |
|--------|-------|---------|
| Recettes | ChefHat | Fiches recettes avec ingrédients et marges |
| Ordres | ClipboardList | Ordres de production en cours et passés |
| Menu / Carte | ShoppingBag | Produits finis disponibles à la vente |
| Ingrédients | Leaf | Matières premières et leurs stocks |

---

### Onglet Recettes

#### Carte de recette

| Élément | Description |
|---------|-------------|
| Nom | Nom de la recette |
| Catégorie | Badge secondary (optionnel) |
| Ingrédients | Liste résumée (nom, quantité, unité) |
| Coût | Coût total des ingrédients |
| Sortie | Quantité produite + unité |
| Marge | Pourcentage (vert > 50 %, ambre > 20 %, rouge sinon) |
| Temps de préparation | En minutes |
| Bouton Produire | Lance un nouvel ordre de production |
| Bouton Supprimer | Icône corbeille |

#### Modal — Nouvelle recette

| Champ | Type | Détail |
|-------|------|--------|
| Nom de la recette | Texte | Obligatoire |
| Catégorie | Texte | Ex : Pains, Viennoiseries |
| Quantité produite | Nombre | Défaut : 1 |
| Unité | Texte | Défaut : pièce |
| Temps de préparation | Nombre (min) | Optionnel |
| Instructions | Textarea | Optionnel |

> Les ingrédients sont ajoutés après la création de la recette.

---

### Onglet Ordres

#### Ligne d'ordre de production

| Élément | Description |
|---------|-------------|
| Nom de la recette | Titre de l'ordre |
| Badge statut | Couleur selon le statut |
| Multiplicateur | ×N → quantité prévue + unité |
| Coût matières | Coût total des ingrédients consommés |
| Actions | Selon le statut (voir ci-dessous) |

#### Statuts et actions

| Statut | Couleur | Actions disponibles |
|--------|---------|-------------------|
| Planifié (planned) | Bleu | Démarrer (▶) / Annuler (✕) |
| En cours (in_progress) | Ambre | Terminer (✓) / Annuler (✕) |
| Terminé (completed) | Vert | Aucune |
| Annulé (cancelled) | Rouge | Aucune (matières remises en stock) |

#### Modal — Lancer la production

| Champ | Description |
|-------|-------------|
| Multiplicateur de lot | Nombre de lots (défaut : 1) |
| Quantité résultante | Calculée automatiquement |
| Notes | Texte optionnel |

#### Modal — Terminer la production

| Champ | Description |
|-------|-------------|
| Quantité réelle produite | Pré-rempli avec la quantité prévue |
| Pertes (quantité) | Défaut : 0 |

---

### Onglet Menu / Carte

Liste des produits standards (plats/produits finis) avec :
- Nom, prix de vente, stock actuel.
- Badge stock coloré (vert/ambre/rouge selon le niveau).

---

### Onglet Ingrédients

Liste des matières premières (product_type = raw_material) avec :
- Nom, prix d'achat par unité, stock actuel.
- Icône Leaf.
- Badge stock coloré.

## 4. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment ajouter des ingrédients à une recette ? | Créez d'abord la recette, puis modifiez-la pour ajouter les ingrédients. |
| Les stocks sont-ils automatiquement déduits ? | Oui, au lancement de la production, les matières premières sont consommées. |
| Que se passe-t-il si j'annule un ordre ? | Les matières premières sont remises en stock. |
| Comment le coût est-il calculé ? | Somme des prix d'achat × quantité de chaque ingrédient × multiplicateur de lot. |

## 5. Guide rapide intégré

1. **Production** — Transformez vos matières premières en produits finis.
2. **Recettes** — Créez des fiches avec ingrédients, coûts et temps de préparation.
3. **Ordres** — Lancez, suivez et terminez vos productions.
4. **Pertes** — Enregistrez les pertes à la fin de chaque production.
