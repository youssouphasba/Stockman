# Guide — Point de Vente (POS)

## 1. Rôle du module

Le POS permet d'enregistrer des ventes rapidement. Il gère le panier, les remises, les paiements multiples et les reçus. En mode restaurant, il gère en plus les commandes ouvertes par table, l'envoi en cuisine et les options de service.

**Profils concernés** : shopkeeper, staff, admin (permission `pos` requise).

## 2. Accès

Cliquer sur **POS** dans la barre latérale, ou sur le bouton **+ Vente** du Dashboard.

## 3. Lecture de l'écran

### Colonne gauche — Produits
- **Barre de recherche** (`id="pos-search"`) : recherche par nom ou SKU.
- **Bouton scanner** : ouvre le scanner de code-barres.
- **Filtres par catégorie** : boutons « Tous » + une entrée par catégorie.
- **Grille produits** : cartes avec image, nom, prix, stock disponible. Cliquer ajoute au panier. Les produits en rupture sont grisés et désactivés.

### Colonne droite — Panier (`id="pos-cart"`)
- **Titre « PANIER »** + bouton **Vider**.
- **Section client** : sélection d'un client existant ou création rapide (bouton +).
- **Articles du panier** : nom, prix, quantité, boutons ±, remise par ligne (icône tag), supprimer (corbeille). Notes cuisine en mode restaurant.
- **Suggestions IA** : produits recommandés basés sur le panier.
- **Sélecteur de terminal** : si plusieurs terminaux sont configurés.
- **Options restaurant** (mode restaurant) : sélection de table, couverts, charge de service, pourboire, notes cuisine.
- **Zone remise** : type (% ou fixe) + montant.

### Zone de paiement (`id="pos-checkout"`)
- **Résumé** : sous-total, remise, TVA (si activée), total.
- **Boutons de paiement** : Espèces, Mobile Money, Carte, Crédit.
- **Paiement fractionné** : permet de diviser entre plusieurs méthodes.
- **Bouton « Envoyer en cuisine »** (restaurant) : enregistre les nouveaux articles sans clôturer.

## 4. Boutons et actions

| Bouton | Emplacement | Action | Effet |
|--------|-------------|--------|-------|
| Recherche | En-tête produits | Saisie | Filtre la grille en temps réel |
| Scanner | En-tête produits | Clic | Ouvre le scanner de code-barres |
| Catégorie | Sous la recherche | Clic | Filtre les produits par catégorie |
| Carte produit | Grille | Clic | Ajoute 1 unité au panier (ou ouvre modal poids) |
| Vider | En-tête panier | Clic | Supprime tous les articles du panier (hors articles déjà envoyés en mode restaurant) |
| + (client) | Section client | Clic | Ouvre la modal de création rapide de client |
| ± (quantité) | Ligne du panier | Clic | Incrémente ou décrémente la quantité |
| Tag (remise) | Ligne du panier | Clic | Ouvre la modal de remise par ligne |
| Corbeille | Ligne du panier | Clic | Supprime l'article du panier |
| Espèces / Mobile / Carte / Crédit | Zone paiement | Clic | Valide la vente avec le moyen choisi |
| Paiement fractionné | Zone paiement | Clic | Permet de saisir plusieurs paiements |
| Envoyer en cuisine | Zone paiement (restaurant) | Clic | Enregistre les nouveaux articles et les envoie en cuisine |

## 5. Filtres et recherche

- **Recherche produit** : par nom ou SKU.
- **Filtre catégorie** : boutons en haut de la grille.
- **Filtre restaurant** : les produits non marqués `is_menu_item` sont masqués en mode restaurant.

## 6. Actions sur une ligne

- **Modifier la quantité** : boutons + et -.
- **Appliquer une remise** : cliquer sur l'icône Tag.
- **Supprimer** : cliquer sur la corbeille.
- **Modifier le poids** (produits pesés) : cliquer sur la ligne pour rouvrir le modal de pesée.

## 7. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré, grille vide |
| Panier vide | Icône panier grisée + texte « Panier vide » |
| Stock insuffisant | Carte produit grisée et désactivée |
| Hors ligne | Vente mise en file d'attente locale, synchronisée au retour du réseau |
| Vente validée | Reçu numérique affiché avec option impression PDF et annulation |

## 8. Cas d'usage typiques

- **Vente standard** : rechercher un produit → ajouter au panier → choisir un mode de paiement → reçu.
- **Vente avec remise** : appliquer une remise globale (% ou fixe) dans la zone remise.
- **Restaurant** : sélectionner une table → ajouter des plats → envoyer en cuisine → plus tard, clôturer avec un paiement.
- **Annulation** : après validation, cliquer sur « Annuler cette vente » dans le reçu (stock remis en place).

## 9. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| POS | CRM | Ajout ou sélection de client |
| POS | Stock | Déstockage automatique après vente |
| POS | Dashboard | Ventes récentes mises à jour |
| POS | Cuisine | Envoi des articles (mode restaurant) |

## 10. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment annuler une vente ? | Depuis le reçu, cliquez sur « Annuler cette vente ». Le stock est automatiquement réajusté. |
| Pourquoi un produit est grisé ? | Il est en rupture de stock (quantité = 0). |
| Le paiement « Crédit » ne fonctionne pas | Vous devez d'abord sélectionner un client existant. |
| Comment scanner un code-barres ? | Cliquez sur l'icône scanner à côté de la barre de recherche. |

## 11. Guide rapide intégré

1. **Bienvenue au Point de Vente** — Enregistrez vos ventes rapidement depuis cet écran.
2. **Recherche et scan** — Recherchez un produit par nom ou scannez un code-barres.
3. **Gestion du panier** — Vos articles apparaissent ici. Ajustez quantités et remises.
4. **Paiement et validation** — Choisissez un mode de paiement pour finaliser la vente.
