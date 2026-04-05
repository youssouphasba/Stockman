# Guide - Stock mobile - chargement progressif

## Objectif

Sur mobile, la liste des produits se charge maintenant par lots progressifs pour garder un affichage fluide quand le catalogue grossit.

## Nouveau comportement

- L'ecran Produits charge d'abord un premier lot de `100` produits.
- Un bouton `Charger ... produit(s) de plus` apparait en bas de la liste quand d'autres produits sont disponibles.
- La recherche serveur suit la meme logique progressive pour eviter de remonter tout le catalogue d'un coup.

## Impact utilisateur

- Ouverture plus rapide de l'ecran Produits.
- Moins de blocages quand le catalogue contient plusieurs centaines de references.
- Moins de pression memoire sur Android.

## Bon usage

- Utiliser la recherche pour aller vite vers une reference precise.
- Charger le lot suivant seulement si necessaire.
- Pour les tres gros imports, preferer un import termine puis une verification progressive de la liste.
