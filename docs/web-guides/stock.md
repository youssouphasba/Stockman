# Guide — Stock / Inventaire

## 1. Rôle du module

Le module Stock permet de gérer l'ensemble des produits : création, modification, suppression, mouvements de stock, transferts entre boutiques, import en masse et conseils de réapprovisionnement IA.

**Profils concernés** : shopkeeper, staff, admin (permission `stock` requise).

## 2. Accès

Barre latérale → **Stock & Inventaire** → **Stock**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Stock » + nombre de produits.
- **Mention** : « Création disponible : manuel, texte IA, import CSV et catalogue métier ».
- **Bandeau synchronisation** (si applicable) : indique les produits/mises à jour en attente.

### Barre d'actions
| Bouton | Description |
|--------|-------------|
| Exporter ▾ | Menu déroulant : Excel (.xlsx) ou PDF |
| Créer / importer ▾ | Menu : Créer manuellement, Importer texte IA, Import CSV, Catalogue métier |
| Scan par lot | Ouvre le modal de scan en lot |
| IA Réappro | Lance l'analyse IA de réapprovisionnement |

### Panneau Stock Health
Indicateurs visuels de la santé du stock (si les données analytics sont chargées).

### Conseil IA Réapprovisionnement
Bannière violette affichant le nombre de produits prioritaires et le conseil détaillé de l'IA.

### Filtres
- **Barre de recherche** : par nom ou SKU.
- **Bouton Filtrer** : filtres avancés.
- **Emplacement** : puces cliquables pour filtrer par emplacement (si des emplacements sont configurés).

### Tableau des produits
| Colonne | Contenu |
|---------|---------|
| Produit | Image miniature, nom, SKU, description |
| Catégorie | Nom de la catégorie associée |
| Stock | Quantité actuelle avec indicateurs visuels (rouge = rupture, orange = bas, badge = brut/matière) |
| Prix | Prix d'achat et prix de vente |
| Actions | Menu contextuel (…) : Modifier, Historique, Mouvement, Transférer, Supprimer |

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Créer manuellement | Ouvre le formulaire produit | Formulaire complet avec aide IA (catégorie, description, prix) |
| Importer depuis un texte | Ouvre TextImportModal | L'IA structure un texte libre en produits |
| Importer un CSV | Ouvre BulkImportModal | Import en masse avec mapping de colonnes |
| Importer le catalogue métier | Appelle catalogApi.importAll() | Précharge un catalogue adapté au secteur |
| Scan par lot | Ouvre BatchScanModal | Scanner plusieurs codes-barres d'affilée |
| IA Réappro | Appelle aiApi.replenishmentAdvice() | Affiche les conseils de réapprovisionnement |
| Modifier (crayon) | Ouvre le formulaire pré-rempli | Permet d'éditer tous les champs |
| Historique (horloge) | Ouvre ProductHistoryModal | Affiche l'historique des mouvements |
| Mouvement (+/-) | Ouvre le modal de mouvement de stock | Entrée (in) ou sortie (out) avec raison |
| Transférer (flèches) | Ouvre le modal de transfert | Transfère vers une autre boutique |
| Supprimer (corbeille) | Confirmation puis suppression | Suppression définitive du produit |

## 5. Filtres et recherche

- **Recherche** : filtre la liste par nom ou SKU en temps réel.
- **Emplacements** : puces cliquables, filtrent les produits par emplacement physique.
- **Filtre avancé** : bouton « Filtrer » (fonctionnalité de filtrage par catégorie, statut, etc.).

## 6. Actions sur une fiche

Le menu contextuel (⋯) de chaque ligne offre :
- **Modifier** : ouvre le formulaire d'édition.
- **Historique** : consulte les mouvements passés.
- **Mouvement de stock** : enregistre une entrée ou sortie.
- **Transférer** : vers une autre boutique (si multi-boutiques).
- **Supprimer** : avec confirmation préalable.

## 7. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Erreur critique | Carte d'erreur avec bouton « Réessayer » |
| Erreur partielle | Bandeau jaune, données disponibles mais catégories/emplacements indisponibles |
| Synchronisation en attente | Bandeau indiquant le nombre d'opérations en file |
| Liste vide | Aucun produit ne correspond aux filtres |

## 8. Cas d'usage typiques

- **Création rapide** : Créer manuellement → renseigner nom, prix, quantité → l'IA peut suggérer catégorie et description.
- **Import initial** : utiliser « Importer le catalogue métier » pour pré-remplir le stock avec des produits standards du secteur.
- **Réapprovisionnement** : cliquer « IA Réappro » pour obtenir la liste des produits à commander en priorité.
- **Inventaire** : filtrer par emplacement, puis ajuster les quantités via le modal de mouvement.

## 9. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Stock | POS | Les produits ajoutés ici sont disponibles dans le POS |
| Stock | Alertes | Les seuils min/max déclenchent des alertes |
| Stock | Historique stock | Chaque mouvement est journalisé |
| Stock | Fournisseurs | Les commandes modifient le stock à réception |

## 10. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Quelle est la différence entre stock physique et stock valorisé ? | Le stock physique est la quantité d'unités. Le stock valorisé est cette quantité × le prix d'achat. |
| Comment ajuster une erreur de stock ? | Utilisez l'action « Mouvement de stock » avec le type « Entrée » ou « Sortie » et une raison explicative. |
| Mon import CSV a échoué | Vérifiez le format du fichier et le mapping des colonnes dans le modal d'import. |
| Comment transférer du stock ? | Menu ⋯ → Transférer. Choisissez la boutique destination et la quantité. |

## 11. Guide rapide intégré

1. **Bienvenue dans votre inventaire** — Gérez tous vos produits et votre stock depuis cet écran.
2. **Créer un produit** — Cliquez « Créer / importer » pour ajouter des produits manuellement, par texte IA ou CSV.
3. **Rechercher et filtrer** — Utilisez la barre de recherche et les filtres d'emplacement pour trouver un produit.
4. **Mouvements de stock** — Enregistrez les entrées et sorties via le menu actions de chaque produit.
5. **Conseils IA** — Cliquez « IA Réappro » pour savoir quels produits réapprovisionner en priorité.
6. **Exporter** — Téléchargez votre inventaire complet en Excel ou PDF.
