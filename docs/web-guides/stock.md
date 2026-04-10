# Guide - Stock / Inventaire

## 1. Role du module

Le module Stock permet de gerer les produits, les niveaux de stock, les mouvements, les imports et les actions de lot sur mobile et sur web.

Profils concernes : utilisateurs ayant la permission `stock`.

## 2. Acces

- Mobile : onglet **Produits**
- Web app : module **Stock / Inventaire**

## 3. Fonctions principales

- creer un produit manuellement ;
- importer des produits par CSV, texte IA ou catalogue metier selon les options disponibles ;
- enregistrer des mouvements de stock ;
- consulter les statistiques et l'historique des mouvements ;
- exporter le catalogue ;
- envoyer un produit a la corbeille puis le restaurer ;
- modifier rapidement des prix sur plusieurs produits.

## 4. Mobile - fonctionnement actuel

### Chargement de la liste

- la liste est virtualisee ;
- les produits se chargent par lots progressifs ;
- un bouton de chargement apparait si d'autres produits sont disponibles ;
- la recherche serveur suit la meme logique pour eviter de remonter tout le catalogue d'un coup.

### Menu de l'onglet Produits

Le menu lateral de l'onglet Produits renvoie maintenant vers les bons modules :

- `Historique mouvements`
- `Statistiques`
- `Emplacements` si le plan l'autorise
- `Exporter CSV`
- `Corbeille`

### Selection multiple

Le mode `Selection` permet :

- de tout selectionner ;
- de partager le catalogue selectionne ;
- de supprimer plusieurs produits ;
- de modifier rapidement le prix de vente des produits selectionnes.

Sur mobile, la barre d'actions de selection est compacte et revient a la ligne proprement sur petit ecran pour eviter les chevauchements ou debordements visuels.

### Modification rapide des prix sur mobile

Quand plusieurs produits sont selectionnes, l'action `Modifier le prix de vente` ouvre une liste simple :

- nom du produit ;
- prix actuel ;
- champ pour le nouveau prix de vente.

L'enregistrement se fait en lot. En mode hors ligne, la mise a jour est placee en file d'attente puis renvoyee automatiquement des le retour du reseau.

### Corbeille

La corbeille masque les produits de la liste active et de la caisse. Elle est partagee avec le web : un produit supprime sur mobile apparait aussi dans la corbeille web, et inversement.

## 5. Web app - fonctionnement actuel

### Grille d'edition rapide

Le web propose une edition rapide des prix en mode tableur :

- edition directe des prix d'achat et de vente ;
- travail sur les produits filtres ;
- sauvegarde en lot des lignes modifiees.

### Corbeille sur le web

Sur le web, la corbeille est accessible directement dans l'en-tete du module Stock, a cote de `Edition rapide des prix`.

Elle permet :

- de voir les produits deja envoyes a la corbeille ;
- de restaurer un produit ;
- de supprimer definitivement un produit si necessaire.

### Selection multiple sur web

Le mode `Selection` du web sert aux actions de lot :

- partager le catalogue selectionne ;
- envoyer plusieurs produits a la corbeille.

L'edition des prix et la selection multiple restent deux usages distincts :

- grille pour modifier ;
- selection pour partager ou supprimer.

Le tableau web garde maintenant un contraste plus fort sur les informations secondaires importantes, notamment le SKU, le prix d'achat, les statuts d'approvisionnement et les actions de ligne.

L'ecran Emplacements et les actions destructives du stock utilisent aussi un contraste plus fort en mode clair pour garder une lecture correcte des boutons `Supprimer`, `Restaurer` et des textes secondaires.

Les cartes `Fournisseurs` du tableau doivent aussi rester lisibles en mode clair :

- le statut `Aucun fournisseur` doit etre visible ;
- le texte d'aide ne doit pas se fondre dans le fond ;
- les boutons `Associer un fournisseur` et `Gerer les fournisseurs` doivent rester clairement lisibles.

### Quantites en unites

Pour les produits vendus a la piece :

- les champs de stock doivent proposer un pas entier ;
- les mouvements de stock et les transferts ne doivent pas pousser vers des decimales inutiles ;
- les quantites fractionnees restent reservees aux produits vendus au poids ou au volume.

### Scan par lot sur le web

Le scan par lot peut utiliser :

- un lecteur code-barres branche en mode clavier ;
- ou la camera du navigateur.

Pour la camera :

- la web app doit autoriser `camera` dans sa politique de permissions ;
- le navigateur doit recevoir puis accepter la demande d'autorisation ;
- l'usage doit se faire sur une page HTTPS normale, pas dans un contexte qui bloque la camera.

Si l'acces camera est refuse ou bloque, le module affiche maintenant un message explicite au lieu d'echouer silencieusement.

## 6. Hors ligne et synchronisation

- les creations et mises a jour compatibles hors ligne restent en attente localement ;
- la synchronisation evite maintenant de rejouer plusieurs fois la meme action ;
- les creations de fournisseurs et les operations stock compatibles repartent automatiquement quand le reseau revient ;
- un changement de boutique ne vide plus la file locale deja en attente.

## 7. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi la liste s'ouvre plus vite qu'avant ? | Le chargement est progressif et la liste mobile est virtualisee. |
| Puis-je modifier les prix de plusieurs produits a la fois ? | Oui. Sur mobile via la selection, sur web via la grille d'edition rapide. |
| La corbeille est-elle separee entre mobile et web ? | Non. La corbeille est commune et synchronisee. |
| Pourquoi je ne vois pas Emplacements ? | Cette entree depend du plan et des droits disponibles. |
