# Guide — Commandes fournisseurs

## 1. Rôle du module

Le module Commandes permet de suivre le cycle de vie complet des commandes fournisseurs : de la commande initiale à la livraison, en passant par les réceptions partielles et les retours.

**Profils concernés** : shopkeeper, staff, admin (permission `stock` requise).

## 2. Accès

Barre latérale → **Commandes**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Commandes fournisseurs ».
- **Bouton Exporter** ▾ : Excel ou PDF.
- **Bouton Scanner facture** : analyse IA d'une photo de facture fournisseur.

### Onglets principaux
| Onglet | Contenu |
|--------|---------|
| Commandes | Liste des commandes avec cycle de statuts |
| Retours | Liste des retours enregistrés + avoirs disponibles |

### Filtres (onglet Commandes)
- **Statuts** : Toutes, En attente, Confirmée, Expédiée, Livraison partielle, Livrée, Annulée.
- **Fournisseur** : sélecteur déroulant.
- **Date début / Date fin** : champs date.

### Liste des commandes
Chaque commande affiche :
- Icône de statut colorée.
- Référence (8 premiers caractères).
- Badge de statut.
- Badge « Marketplace » si commande connectée.
- Nom du fournisseur et date.
- Montant total.
- Boutons d'action primaire et détail.

### Onglet Retours
- **Carte Avoirs disponibles** : nombre d'avoirs et montant total.
- **Bouton « Nouveau retour manuel »** : créer un retour sans commande liée.
- **Liste des retours** : référence, fournisseur, date, statut, valeur.

## 4. Boutons et actions

| Bouton | Emplacement | Action | Effet |
|--------|-------------|--------|-------|
| Exporter Excel | En-tête | Clic | Télécharge la liste en .xlsx |
| Exporter PDF | En-tête | Clic | Télécharge la liste en PDF |
| Scanner facture | En-tête | Clic | Upload d'une photo → analyse IA → affichage du résultat |
| Confirmer | Ligne commande (statut: pending) | Clic | Passe la commande en « Confirmée » |
| Marquer expédiée | Ligne commande (statut: confirmed) | Clic | Passe en « Expédiée » |
| Confirmer la réception | Ligne commande (statut: shipped, marketplace) | Clic | Ouvre DeliveryConfirmationModal |
| Marquer livrée | Ligne commande (statut: shipped, non-marketplace) | Clic | Passe en « Livrée » |
| Créer un retour | Ligne commande (statut: delivered) | Clic | Ouvre OrderReturnModal |
| Voir détails (↗) | Ligne commande | Clic | Ouvre la modal de détail complet |
| Annuler | Détail commande | Clic | Annule la commande |

## 5. Filtres et recherche

| Filtre | Type | Impact |
|--------|------|--------|
| Statut | Barre de boutons | Filtre la liste par statut |
| Fournisseur | Sélecteur déroulant | Filtre par fournisseur |
| Date début | Champ date | Filtre par date postérieure |
| Date fin | Champ date | Filtre par date antérieure |

Les filtres se cumulent : statut + fournisseur + plage de dates.

## 6. Actions sur une commande (détail)

Depuis la modal de détail :
- Confirmer / Expédier / Livrer / Annuler selon le statut actuel.
- Créer un retour (si livrée).
- Consulter les articles avec quantités commandées vs reçues.
- Lire les notes.

## 7. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Aucune commande | Icône ShoppingBag + texte « Aucune commande trouvée pour ces filtres. » |
| Scan en cours | Spinner sur le bouton scanner |
| Résultat scan | Modal avec fournisseur identifié, articles détectés et total |

## 8. Cas d'usage typiques

- **Suivi standard** : consulter les commandes en attente, confirmer, puis marquer livrée à la réception.
- **Réception marketplace** : utiliser « Confirmer la réception » qui permet de saisir les quantités reçues par article.
- **Scanner une facture** : prendre en photo, l'IA extrait les articles et le total.
- **Retour fournisseur** : depuis une commande livrée, créer un retour → un avoir est généré automatiquement.

## 9. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Commandes | Stock | La livraison met à jour les quantités en stock |
| Commandes | Fournisseurs | Les commandes sont liées aux fiches fournisseur |
| Commandes | Comptabilité | Les factures fournisseur impactent les charges |

## 10. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment modifier une commande déjà confirmée ? | Vous ne pouvez pas modifier une commande confirmée. Annulez-la et recréez-en une. |
| Comment enregistrer une livraison partielle ? | Utilisez « Confirmer la réception » (marketplace) pour saisir les quantités reçues par article. |
| Le scanner IA se trompe parfois | Le scan est une aide. Vérifiez toujours les résultats avant de les valider. |

## 11. Guide rapide intégré

1. **Bienvenue dans les Commandes** — Suivez vos commandes fournisseurs de bout en bout.
2. **Filtrez par statut** — Utilisez les onglets de statut pour voir les commandes en attente, expédiées ou livrées.
3. **Actions rapides** — Chaque commande a un bouton d'action adapté à son statut.
4. **Scanner une facture** — Photographiez une facture fournisseur et l'IA en extraira les informations.
5. **Retours et avoirs** — Basculez sur l'onglet « Retours » pour gérer les retours et avoirs fournisseurs.
