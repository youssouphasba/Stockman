# Guide — Fournisseurs & Commandes

## 1. Rôle du module

Le module Fournisseurs centralise les relations fournisseurs : gestion manuelle, bons de commande, réapprovisionnement IA, pilotage performance et marketplace B2B.

**Profils concernés** : shopkeeper, staff, admin (permission `suppliers` requise).

## 2. Accès

Barre latérale → **Fournisseurs** → **Mes fournisseurs**.

## 3. Lecture de l'écran

### Onglets

| Onglet | Contenu |
|--------|---------|
| Mes Fournisseurs | Liste des fournisseurs enregistrés manuellement |
| Bons de Commande | Création et suivi des bons de commande |
| Réapprovisionnement | Suggestions IA de réapprovisionnement |
| Pilotage | Analytics fournisseurs (scores, performance, classement) |
| Marketplace | Découverte de fournisseurs B2B connectés |

### Onglet Mes Fournisseurs
- Recherche par nom/contact.
- Cartes fournisseur avec nom, contact, téléphone, email, adresse.
- Menu contextuel : Voir les détails, Supprimer.

### Fiche fournisseur (modal)
Trois sous-onglets :
- **Performance** : score fiabilité, produits liés, historique commandes, historique prix.
- **Journal** : notes d'échange (appel, email, visite, autre).
- **Factures** : factures enregistrées avec statut (payée/impayée/partielle).

### Onglet Bons de Commande
- Formulaire création avec sélection fournisseur (manuel ou marketplace), articles, quantités, prix unitaire.
- PDF de commande téléchargeable.
- Détail commande avec actions de statut.

### Onglet Réapprovisionnement
- Suggestions IA basées sur l'historique de ventes et le stock.
- Bouton « Automatiser » : lance le réapprovisionnement automatique.

### Onglet Pilotage
- Analytics d'achat : KPI (dépenses, commandes, délais).
- Classement fournisseurs avec scores (fiable/à surveiller/risque).
- Export CSV du classement.

### Onglet Marketplace
- Catalogue fournisseurs B2B avec recherche, filtre par région.
- Fiche détaillée avec catalogue produits et prix.
- Benchmark prix : comparer les prix d'un produit entre fournisseurs marketplace.

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Nouveau Fournisseur | Ouvre modal | Formulaire nom, contact, email, téléphone, adresse |
| Nouvelle Commande | Ouvre modal | Sélection fournisseur + articles |
| Automatiser | Réapprovisionnement | Lance un réapprovisionnement automatique |
| Export Excel | Pilotage | Télécharge le classement en CSV |
| Benchmark | Marketplace | Compare les prix d'un produit |
| Commander | Marketplace | Crée un bon de commande marketplace |

## 5. Filtres et recherche

- **Recherche** : par nom ou contact.
- **Région** (marketplace) : filtre géographique.
- **Période** (pilotage) : 30j, 60j, 90j.

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Squelette animé |
| Liste vide | Icône + lien « Ajouter mon premier fournisseur » |
| Succès | Bandeau vert temporaire |

## 7. Cas d'usage typiques

- **Ajout fournisseur** : « Nouveau Fournisseur » → renseigner les informations → consulter la fiche avec l'historique.
- **Commande** : « Nouvelle Commande » → sélectionner articles → générer le PDF → envoyer au fournisseur.
- **Benchmark** : onglet Marketplace → cliquer Benchmark sur un produit → comparer les prix.

## 8. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Fournisseurs | Commandes | Les bons de commande modifient le stock |
| Fournisseurs | Comptabilité | Les factures impactent les charges |
| Fournisseurs | Stock | Le réapprovisionnement met à jour les quantités |

## 9. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Quelle est la différence entre fournisseur manuel et marketplace ? | Manuel : vous créez la fiche. Marketplace : connecté au réseau B2B Stockman. |
| Comment recevoir une commande partielle ? | Dans le détail de la commande, utilisez « Réception partielle ». |
| Le score fiabilité est-il automatique ? | Oui, il est calculé à partir des délais de livraison et des taux de complétion. |

## 10. Guide rapide intégré

1. **Bienvenue dans Fournisseurs** — Gérez vos partenaires et vos approvisionnements.
2. **Mes fournisseurs** — Ajoutez et consultez vos fournisseurs enregistrés.
3. **Bons de commande** — Créez et suivez vos commandes fournisseurs.
4. **Réapprovisionnement IA** — L'IA suggère les produits à commander en priorité.
5. **Marketplace** — Découvrez de nouveaux fournisseurs B2B connectés.
