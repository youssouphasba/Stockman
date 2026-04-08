# Guide - Fournisseurs et commandes

## 1. Role du module

Le module Fournisseurs centralise les relations fournisseurs : annuaire manuel, bons de commande, suggestions de reapprovisionnement et marketplace B2B.

**Profils concernes** : `shopkeeper`, `staff`, `admin`, avec permission `suppliers`.

## 2. Acces

Barre laterale -> **Fournisseurs** -> **Mes fournisseurs**

## 3. Lecture de l'ecran

### Onglets

| Onglet | Contenu |
|--------|---------|
| Mes fournisseurs | Liste des fournisseurs enregistres manuellement |
| Bons de commande | Creation et suivi des commandes fournisseurs |
| Reapprovisionnement | Suggestions de reapprovisionnement |
| Pilotage | Analyse fournisseurs et classement |
| Marketplace | Recherche de fournisseurs B2B connectes |

### Onglet Mes fournisseurs
- Recherche par nom ou contact
- Cartes fournisseur avec nom, telephone, email et adresse
- Actions principales : ouvrir la fiche, modifier ou supprimer

### Fiche fournisseur

Trois sous-onglets principaux :
- **Performance** : score, produits lies, historique commandes, historique prix
- **Journal** : notes d'echange
- **Factures** : factures fournisseur et statut de paiement

### Onglet Bons de commande
- Formulaire de creation avec selection fournisseur, articles, quantites et prix
- PDF de commande telechargeable
- Detail commande avec actions de statut

### Onglet Reapprovisionnement
- Suggestions basees sur l'historique de ventes et le stock
- Indication des ventes moyennes par jour pour aider a prioriser

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Nouveau fournisseur | Ouvre le modal | Cree une fiche fournisseur |
| Nouvelle commande | Ouvre le modal | Cree un bon de commande |
| Export Excel | Onglet Pilotage | Exporte le classement fournisseur |
| Benchmark | Marketplace | Compare les prix d'un produit |
| Commander | Marketplace | Cree un bon de commande marketplace |

## 5. Mode hors ligne et synchronisation

Le comportement offline a ete fiabilise sur cet ecran.

- Les fournisseurs deja charges restent consultables depuis le cache local.
- Un fournisseur cree hors ligne apparait tout de suite dans la liste avec un badge **En attente**.
- La synchronisation evite maintenant de rejouer plusieurs fois la meme creation fournisseur au retour du reseau.
- Un changement de boutique ne supprime plus la file locale des fournisseurs deja en attente de synchronisation.
- Un bon de commande cree hors ligne apparait dans la liste des commandes avec un badge **En attente**.
- Un bandeau de synchronisation resume le nombre total d'elements encore a envoyer au serveur.
- Des modifications locales compatibles restent visibles jusqu'au retour du reseau.

### Limites a connaitre
- Le mode hors ligne n'est pas complet sur toute l'experience fournisseur.
- Les actions dependantes d'un service distant, d'une verification immediate ou d'un contenu non encore charge restent limitees sans connexion.

## 6. Filtres et recherche

- **Recherche** : nom, contact ou fournisseur
- **Region** : filtre marketplace
- **Periode** : 30j, 60j, 90j dans les vues de pilotage

## 7. Etats de l'interface

| Etat | Description |
|------|-------------|
| Chargement | Squelette anime |
| Liste vide | Message d'invitation a creer un premier fournisseur |
| Element en attente | Badge **En attente** sur une carte ou une ligne |
| Synchronisation en attente | Bandeau resumant les actions locales non encore envoyees |

## 8. Cas d'usage typiques

- **Ajouter un fournisseur** : cliquer sur **Nouveau fournisseur**, saisir les informations puis enregistrer.
- **Creer une commande** : cliquer sur **Nouvelle commande**, ajouter les articles et valider.
- **Continuer hors ligne** : creer une fiche fournisseur ou un bon de commande, puis laisser la synchronisation automatique finaliser l'envoi.
- **Comparer des prix** : ouvrir Marketplace puis lancer un benchmark.

## 9. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Fournisseurs | Commandes | Les bons de commande structurent l'approvisionnement |
| Fournisseurs | Comptabilite | Les factures et achats influencent les charges |
| Fournisseurs | Stock | Les receptions mettent a jour les quantites |

## 10. Questions frequentes

| Question | Reponse |
|----------|---------|
| Quelle difference entre fournisseur manuel et marketplace ? | Manuel : vous creez la fiche vous-meme. Marketplace : le fournisseur vient du reseau B2B Stockman. |
| Comment savoir si une commande n'est pas encore envoyee au serveur ? | Elle porte un badge **En attente** et un bandeau de synchronisation peut apparaitre dans l'ecran. |
| Pourquoi un fournisseur ne se duplique plus apres la reconnexion ? | La synchronisation offline a ete verrouillee pour eviter de rejouer plusieurs fois la meme creation locale. |
| Le score fiabilite est-il automatique ? | Oui, il depend des donnees disponibles sur les delais, livraisons et completude. |
| Pourquoi la detection de doublons peut etre suspendue ? | Quand le quota IA mensuel est atteint, la detection de doublons se met en pause et un message d'information apparait dans l'ecran. |

## 11. Guide rapide integre

1. **Mes fournisseurs** : creez et retrouvez vos partenaires.
2. **Bons de commande** : preparez, partagez et suivez vos commandes.
3. **Reapprovisionnement** : utilisez les suggestions pour agir plus vite.
4. **Mode hors ligne** : reperez les badges **En attente** pour savoir ce qui reste a synchroniser.
