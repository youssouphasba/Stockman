# Guide - Stock mobile - performance

## Objectif

L'ecran Produits mobile a ete adapte pour rester fluide meme quand le catalogue contient plusieurs centaines ou milliers de references.

## Ce qui a change

- la liste est maintenant virtualisee ;
- le premier affichage charge un lot initial de `100` produits ;
- les lots suivants se chargent seulement si necessaire ;
- la recherche serveur suit la meme logique progressive ;
- certaines recherches repetees par carte ont ete pre-calcullees pour alleger le rendu.

## Effets attendus

- ouverture plus rapide de l'ecran Produits ;
- moins de pression memoire sur Android ;
- moins de saccades lors du scroll ;
- moins de blocages quand un gros import vient d'etre termine.

## Bon usage

- utiliser la recherche avant de charger trop de lots ;
- verifier un import massif par etapes, pas en relisant tout le catalogue d'un coup ;
- utiliser les actions de selection ou d'edition rapide quand plusieurs produits doivent etre traites.
