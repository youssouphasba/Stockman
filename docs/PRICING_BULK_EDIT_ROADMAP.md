# Roadmap Edition Rapide des Prix

Date de mise a jour : 2026-04-08
Statut : lot 1 et lot 2 implementes

## Etat actuel

Les points suivants sont maintenant implementes :

- backend : endpoint de mise a jour en lot des prix produits
- mobile : modification rapide du prix de vente depuis le mode `Selection`
- web app : grille d'edition rapide des prix basee sur les produits filtres
- web app : selection multiple pour suppression et partage
- web et mobile : corbeille commune conservee

Le lot 3 reste optionnel et n'est pas active dans cette intervention.

## Objectif

Permettre a un commercant de mettre a jour rapidement les prix de nombreux
produits apres un import massif, sans ouvrir chaque fiche produit une par une.

Le besoin cible est clair :

- apres import de centaines de produits
- modification rapide de prix fixes
- sur mobile et sur web
- sans calcul en pourcentage
- avec un minimum de friction

## Perimetre retenu

Deux experiences complementaires doivent etre proposees :

### 1. Mobile

Edition rapide a partir de la selection de produits.

Principe :

- l'utilisateur active le mode `Selection`
- il selectionne plusieurs produits
- un bouton `Modifier le prix de vente` apparait
- il ouvre un ecran ou une bottom sheet dediee
- il voit la liste des produits selectionnes
- chaque ligne affiche :
  - le nom du produit
  - le prix de vente actuel
  - un champ editable pour le nouveau prix de vente
- il modifie les prix un par un
- il valide tout en une seule fois

### 2. Web app

Edition en mode tableur.

Principe :

- l'utilisateur ouvre un ecran `Edition rapide des prix`
- il filtre les produits a afficher
- il modifie directement les cellules de prix
- les lignes modifiees restent en brouillon
- il enregistre toutes les modifications en lot

En parallele, le web app doit aussi supporter une vraie selection multiple pour
les actions de lot qui ne relevent pas de l'edition des prix.

## Pourquoi deux flux differents

Le mobile et le web n'ont pas les memes contraintes.

### Mobile

Le mobile est adapte a :

- des lots limites
- des saisies successives
- une interaction simple et lineaire

Le mobile n'est pas adapte a une grille dense type tableur.

### Web

Le web est adapte a :

- une grande quantite de lignes visibles
- une edition cellule par cellule
- des usages clavier plus intensifs
- une logique de tableur

Il doit aussi permettre des actions de lot via selection multiple, sans forcer
le mode tableur pour tout.

## Flux mobile detaille

### Point d'entree

Depuis l'ecran Produits :

1. l'utilisateur appuie sur `Selection`
2. il coche plusieurs produits
3. une action de lot apparait : `Modifier le prix de vente`

### Ecran de modification

L'ecran de modification doit afficher :

- un titre : `Modifier le prix de vente`
- le nombre de produits selectionnes
- une liste scrollable
- un bouton fixe `Enregistrer`

Chaque ligne doit contenir :

- nom du produit
- prix actuel
- champ `Nouveau prix`

### UX mobile attendue

- scroll fluide
- champ numerique uniquement
- navigation simple entre lignes
- bouton d'enregistrement toujours visible
- resume clair : `12 produits modifies`

### Contraintes UX

- ne pas transformer le flux en mini tableur complexe
- ne pas afficher trop d'informations par ligne
- ne pas masquer les champs avec le clavier
- ne pas sauvegarder a chaque frappe

### Validation

Avant envoi :

- valeur numerique obligatoire
- pas de prix negatif
- gestion propre des virgules et points
- message clair si une ligne est invalide

## Flux web detaille

### Point d'entree

Depuis la page Produits du web app :

- bouton `Edition rapide des prix`

### Structure de l'ecran

Barre haute :

- recherche
- filtres
- compteur de lignes modifiees
- bouton `Annuler`
- bouton `Enregistrer les modifications`

Table principale :

- `Nom`
- `SKU`
- `Categorie`
- `Fournisseur`
- `Prix d'achat`
- `Prix de vente`
- `Stock`
- `Boutique`

Colonnes modifiables :

- `Prix d'achat`
- `Prix de vente`

### Comportement

- edition directe dans les cellules
- les cellules modifiees sont surlignees
- les changements restent locaux jusqu'a validation
- enregistrement par lot en une seule action

### Selection multiple web

Le web app doit aussi proposer un mode de selection multiple distinct du mode
edition des prix.

Ce mode sert aux actions de lot suivantes :

- supprimer plusieurs produits
- partager un catalogue ou une selection de produits

Comportement attendu :

- cases a cocher par ligne
- case a cocher dans l'entete pour selectionner la page visible
- compteur d'elements selectionnes
- barre d'actions de lot visible quand au moins un produit est selectionne

Actions minimales :

- `Supprimer`
- `Partager le catalogue`

### Corbeille synchronisee mobile et web

La suppression multiple web ne doit pas creer une logique separee de corbeille.

Regle produit :

- le web app doit reutiliser la meme corbeille que le mobile
- la suppression depuis le web doit envoyer les produits dans la corbeille commune
- la suppression depuis le mobile doit etre visible dans la corbeille web
- la restauration depuis le web ou le mobile doit rester synchronisee

Conclusion :

- une seule logique backend de corbeille
- une seule source de verite pour les produits supprimes
- pas de corbeille distincte par plateforme

Regle UX importante :

- la grille d'edition des prix et la selection multiple doivent rester lisibles
- l'utilisateur ne doit pas confondre `modifier des cellules` et `agir sur une selection`

### UX web attendue

- pagination ou virtualisation
- navigation clavier
- tri simple
- filtres rapides
- feedback clair apres sauvegarde

## Regles metier

### Champs a autoriser

Version 1 recommandee :

- modification du `selling_price`

Version 2 possible :

- modification du `purchase_price`
- visualisation de la marge

### Ce qui n'est pas dans le perimetre initial

- regles de pourcentage
- formules automatiques
- edition de masse par coefficient
- moteur de tarification avance

### Actions de lot web hors pricing

Le perimetre web doit aussi couvrir :

- suppression multiple
- partage de catalogue via selection multiple
- corbeille synchronisee entre web et mobile

## Backend necessaire

## Endpoint de mise a jour en lot

Un endpoint dedie doit etre cree pour appliquer les modifications en une seule requete.

Exemple de payload :

```json
{
  "updates": [
    {
      "product_id": "prod_1",
      "selling_price": 1500
    },
    {
      "product_id": "prod_2",
      "selling_price": 3200
    }
  ]
}
```

### Attendus backend

- validation de chaque ligne
- verification des permissions
- scoping par boutique
- journalisation de l'action
- reponse avec succes et erreurs ligne par ligne

Exemple de reponse :

```json
{
  "updated": 18,
  "failed": 2,
  "errors": [
    {
      "product_id": "prod_9",
      "message": "Prix invalide"
    }
  ]
}
```

## Performance

### Mobile

- ne charger que les produits selectionnes dans l'ecran de modification
- eviter les rerenders inutiles
- conserver une liste simple

### Web

- virtualiser ou paginer la table si le volume est eleve
- n'envoyer que les lignes modifiees
- limiter la taille des lots si necessaire

## Priorite de mise en oeuvre

### Lot 1

- bouton mobile `Modifier le prix de vente` apres selection
- ecran mobile de modification en lot
- endpoint backend de mise a jour en lot sur `selling_price`

### Lot 2

- ecran web `Edition rapide des prix`
- edition cellule par cellule
- sauvegarde en lot
- ajout de la selection multiple web
- actions de lot web : suppression et partage
- corbeille web branchee sur la meme logique que le mobile

### Lot 3

- extension optionnelle au `purchase_price`
- historique de changements plus detaille
- outils de controle et filtres avances

## Risques a surveiller

- mauvaise UX clavier sur mobile
- trop de lignes selectionnees sur mobile
- erreurs de validation mal expliquees
- sauvegarde partielle sans feedback clair
- divergence entre prix affiches et prix reellement sauvegardes

## Decision produit actuelle

Decision retenue :

- mobile : edition rapide par selection de produits
- web : edition type tableur pour les prix
- web : selection multiple pour suppression et partage
- web et mobile : corbeille unique et synchronisee
- prix fixes uniquement
- pas de pourcentages dans le perimetre initial

## Resultat attendu

Apres implementation, un commercant doit pouvoir :

- importer un gros catalogue
- selectionner rapidement des produits sur mobile pour corriger leurs prix
- utiliser le web pour corriger un plus grand volume en mode tableur
- enregistrer les changements en lot, avec un retour clair
