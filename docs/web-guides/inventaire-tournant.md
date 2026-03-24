# Guide — Inventaire Tournant

## 1. Rôle du module

L'inventaire tournant permet de vérifier le stock physique de manière progressive, sans compter tous les produits en même temps. Le système génère des tâches de comptage par rotation intelligente.

**Profils concernés** : shopkeeper, gestionnaire de stock.

## 2. Accès

Barre latérale → **Inventaire tournant**.

## 3. Lecture de l'écran

### En-tête
- **Icône** : ClipboardCheck (primary).
- **Titre** : titre de la page (i18n).
- **Sous-titre** : description du module (i18n).
- **Bouton** : « Générer les tâches » (icône RefreshCw) — lance la génération des produits à compter.

### Cartes de tâches (grille 1-3 colonnes)

Chaque tâche de comptage est une carte contenant :

| Élément | Description |
|---------|-------------|
| Icône produit | Box dans un cercle primary (animation au survol) |
| Badge statut | « Pending » en ambre |
| Nom du produit | Titre principal (tronqué si trop long) |
| Catégorie | Sous-titre en lettres majuscules grises |
| Quantité attendue | Affichée en grand dans un encart dédié |
| Icône alerte | Triangle d'avertissement (bordure pointillée) |
| Bouton Compter | « Soumettre le comptage » — ouvre un prompt pour saisir la quantité réelle |

### Cycle de comptage

1. **Génération** : le système sélectionne les produits à compter selon la fréquence et la priorité.
2. **Comptage** : l'utilisateur saisit la quantité réelle observée physiquement.
3. **Écart** : le système compare la quantité attendue vs réelle et corrige le stock automatiquement.
4. **Cycle terminé** : lorsque toutes les tâches sont traitées, l'écran affiche « Tout est à jour ».

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Générer les tâches | En-tête | Génère un nouveau lot de produits à compter |
| Soumettre le comptage | Carte produit | Ouvre un prompt avec la quantité attendue pré-remplie |
| Relancer un cycle | Écran « Tout est à jour » | Génère un nouveau cycle de comptage |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré + texte « Analyse en cours... » (lettres majuscules) |
| Aucune tâche | Icône CheckCircle2 verte + « Tout est à jour » + bouton « Relancer un cycle » |
| Soumission en cours | Spinner sur le bouton de la carte en cours de soumission |
| Liste des tâches | Grille de cartes avec produits à compter |

## 6. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment fonctionne la rotation ? | Le système sélectionne les produits à compter en fonction de leur fréquence de mouvement et de leur dernière date de comptage. |
| Que se passe-t-il en cas d'écart ? | Le stock est automatiquement ajusté à la valeur saisie. L'écart est enregistré dans l'historique. |
| Puis-je annuler un comptage ? | Non, un comptage soumis est définitif. Contactez le support si nécessaire. |

## 7. Guide rapide intégré

1. **Inventaire tournant** — Vérifiez votre stock par rotation régulière sans tout compter.
2. **Générer les tâches** — Cliquez le bouton en haut à droite pour générer les produits à compter.
3. **Compter** — Saisissez la quantité réelle sur chaque carte produit.
4. **Validation** — Les écarts sont corrigés automatiquement dans le stock.
