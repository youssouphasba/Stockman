# Roadmap Commerce Pondere

Date de preparation : 2026-03-10
Statut : implemente en v1 pragmatique

## Mise a jour implementation

Le support `commerce pondere` est maintenant branche de bout en bout sur le backend, le mobile et le web pour les cas metiers principaux :
- produits avec `measurement_type`, `display_unit`, `pricing_unit`, `allows_fractional_sale`, `quantity_precision`
- creation et edition produit avec configuration de l'unite de vente/stock
- POS web et mobile avec saisie de quantite ponderee, unites compatibles et raccourcis rapides
- conversion automatique entre unite saisie et unite de prix
- lignes de vente, commandes ouvertes et recus qui conservent `sold_quantity_input` et `sold_unit`
- affichage des quantites stock et des quantites vendues avec le bon format

### Note d'architecture

La v1 implementee conserve l'architecture actuelle basee sur des quantites decimales + helpers de conversion.

Elle ne suit pas encore totalement la recommandation initiale la plus stricte :
- stockage interne systematique dans la plus petite unite entiere
- `base_unit` obligatoire sur tous les produits ponderes
- `price_per_unit` explicite separe de `selling_price`

Autrement dit :
- le besoin metier `100 kg -> vente 250 g -> stock 99,75 kg` fonctionne maintenant
- la v2 future pourra encore durcir le modele de donnees si on veut une architecture plus normalisee

Ce document decrit le plan pour ajouter la vraie vente au poids et au volume pour les business types `commerce` :
- epicerie
- supermarche
- boutique alimentaire
- grossiste
- quincaillerie si certains produits se vendent aussi au poids ou au volume

Ce chantier est distinct du restaurant.

## Probleme a resoudre

Cas metier cible :
- stock : `100 kg` de riz
- prix : `200 F / kg`
- vente : `250 g`

Le systeme doit produire :
- montant vendu : `50 F`
- stock restant : `99,75 kg`

Aujourd'hui, les unites produit existent, mais la vente POS reste pensee comme une quantite entiere.

## Objectif

Permettre a un commerce de vendre correctement des produits :
- au poids
- au volume
- a l'unite

Sans casser :
- les stocks existants
- le POS actuel
- les rapports
- les alertes stock

## Regle metier cible

Chaque produit commerce appartient a un type de mesure :
- `unit`
- `weight`
- `volume`

### Produits unitaires

Exemples :
- bouteille
- paquet
- carton
- piece

Comportement :
- quantite entiere
- pas de fraction obligatoire

### Produits ponderes

Exemples :
- riz
- sucre
- farine
- huile
- lait vendu au litre ou au demi-litre

Comportement :
- quantite fractionnable
- saisie en `g`, `kg`, `ml`, `L`
- calcul prix et stock en unite interne

## Principe d'architecture recommande

Ne pas utiliser des `float` partout pour le stock.

Recommandation :
- stocker les produits ponderes dans la plus petite unite entiere
- faire les conversions uniquement a l'affichage et a la saisie

Exemples :
- `kg` stocke en `g`
- `L` stocke en `ml`

### Exemple riz

- affichage stock : `100 kg`
- stockage interne : `100000 g`
- prix affiche : `200 F / kg`
- prix interne : `0,2 F / g`
- vente de `250 g`
  - quantite interne vendue : `250`
  - total : `50 F`
  - stock restant : `99750 g`

## Modele de donnees cible

### A ajouter sur Product

- `measurement_type: "unit" | "weight" | "volume"`
- `base_unit`
- `display_unit`
- `pricing_unit`
- `allows_fractional_sale`
- `quantity_precision`
- `price_per_unit`

### Signification

- `measurement_type`
  - logique metier principale
- `base_unit`
  - unite interne de stock
  - ex: `g`, `ml`, `piece`
- `display_unit`
  - unite preferree d'affichage
  - ex: `kg`, `L`, `piece`
- `pricing_unit`
  - unite de reference pour le prix
  - ex: `kg`, `L`, `piece`
- `allows_fractional_sale`
  - vrai pour les produits ponderes
- `quantity_precision`
  - nombre minimal de pas de saisie
  - ex:
    - `1` pour piece
    - `50` pour 50 g
    - `100` pour 100 ml
- `price_per_unit`
  - prix de reference sur `pricing_unit`

### Champs a conserver en compatibilite

- `unit`
- `quantity`
- `selling_price`

Pendant la migration, ils peuvent rester lisibles pour les produits legacy.

## Modele de vente cible

### SaleItem

Ajouter :
- `sold_quantity_input`
- `sold_unit`
- `stock_quantity_base`
- `stock_unit_base`
- `pricing_unit`
- `pricing_unit_price`

### Exemple

Pour une vente de `250 g` de riz :
- `sold_quantity_input = 250`
- `sold_unit = "g"`
- `stock_quantity_base = 250`
- `stock_unit_base = "g"`
- `pricing_unit = "kg"`
- `pricing_unit_price = 200`

Cela permet :
- une facture lisible
- un stock propre
- des rapports justes

## POS cible

### Commerce uniquement

Ce comportement doit s'activer pour les business types commerce, pas pour le restaurant.

### Regles UI

Si `measurement_type = unit` :
- boutons `+ / -`
- quantite entiere

Si `measurement_type = weight` ou `volume` :
- champ de saisie de quantite
- selecteur d'unite autorisee
- raccourcis rapides

Exemples de raccourcis :
- `100 g`
- `250 g`
- `500 g`
- `1 kg`
- `250 ml`
- `500 ml`
- `1 L`

### Affichage attendu

Produit `riz`
- stock : `100 kg`
- prix : `200 F / kg`
- saisie vente : `250 g`
- total ligne : `50 F`

### Validation POS

- interdire une quantite <= 0
- interdire une quantite non multiple du pas si `quantity_precision` l'exige
- interdire la vente si stock insuffisant
- afficher le reste de stock dans l'unite lisible

## Backend de conversion

Creer une couche dediee, par exemple :
- `backend/measurement_utils.py`

Fonctions recommandees :
- conversion unite affichee -> unite de base
- conversion unite de base -> unite affichee
- calcul du total a partir du prix de reference
- formatage lisible des quantites
- validation des unites compatibles

### Tables de conversion minimales

Poids :
- `1 kg = 1000 g`

Volume :
- `1 L = 1000 ml`

Unitaire :
- `1 piece = 1 piece`

## Migrations

### Strategie recommandee

Migration progressive, sans rupture.

#### Etape 1

Introduire les nouveaux champs sur les produits sans casser les anciens produits.

#### Etape 2

Pour les produits legacy :
- si `unit` est `piece`, `carton`, `paquet`
  - `measurement_type = unit`
- si `unit` est `kg`
  - `measurement_type = weight`
  - `base_unit = g`
  - `display_unit = kg`
  - `pricing_unit = kg`
- si `unit` est `L`
  - `measurement_type = volume`
  - `base_unit = ml`
  - `display_unit = L`
  - `pricing_unit = L`

#### Etape 3

Migrer la quantite stock :
- `100 kg` legacy devient `100000 g` en interne
- `50 L` legacy devient `50000 ml`

#### Etape 4

Migrer le POS commerce sur le nouveau contrat.

## Impact sur les modules

### Stock

A adapter :
- mouvements de stock
- transferts
- inventaires
- alertes stock
- reapprovisionnement

### Rapports

A adapter :
- quantites vendues
- stock restant
- valorisation de stock
- top produits
- marges

### Factures / recus

Doivent afficher l'unite vendue lisible :
- `250 g`
- `0,5 L`
- `1 kg`

### Forecast

Doit raisonner sur l'unite de base ou une unite harmonisee, pas sur un entier implicite.

## Cas limites a couvrir

- vente `250 g` d'un produit prix au `kg`
- vente `0,5 L` d'un produit prix au `L`
- stock insuffisant pour une quantite fractionnaire
- retour d'une vente fractionnaire
- annulation d'une vente fractionnaire
- inventaire manuel sur un produit pondere
- transfert inter-boutiques sur un produit pondere
- import/export CSV

## Tests a prevoir

### Backend

- conversion `kg -> g`
- conversion `L -> ml`
- total de vente calcule correctement
- deduction de stock correcte
- rapport total correct apres plusieurs ventes fractionnaires

### Mobile commerce

- saisie de `250 g`
- recalcul du total ligne
- blocage si stock insuffisant
- confirmation de vente

### Web commerce

- meme scenarios que mobile
- recap ligne lisible
- recu correct

## Ordre d'implementation recommande

### Phase 1

- definir le contrat produit pondere
- ajouter les champs de mesure
- ajouter les helpers de conversion

### Phase 2

- adapter le backend ventes
- adapter le backend stock
- adapter le format des `SaleItem`

### Phase 3

- adapter le POS mobile commerce
- adapter le POS web commerce

### Phase 4

- adapter rapports, analytics et exports

### Phase 5

- migration des produits existants
- validation manuelle sur vraies donnees

## Decision produit importante

Pour le commerce, il faut distinguer clairement :
- `unite metier du produit`
- `unite interne de stock`
- `unite de vente`
- `unite de prix`

Sans cette separation, les ventes fractionnaires restent fragiles.

## Resume operationnel

### Priorite
Haute pour les business types commerce

### Valeur

- rend l'application credible pour epiceries et supermarches
- corrige un vrai cas terrain
- ameliore stock, caisse et reporting en meme temps

## Rappel pratique

Ce plan est enregistre ici :
- `docs/WEIGHTED_COMMERCE_ROADMAP.md`

Quand on voudra reprendre, il suffira de dire :
- `reprends le plan commerce pondere`
- `on implemente la phase 1 du commerce pondere`
- `on adapte le POS commerce au poids`
