# Guide — Portail Fournisseur

## 1. Rôle du module

Le portail fournisseur est l'interface dédiée aux fournisseurs sur la marketplace. Il leur permet de gérer leur profil, publier et maintenir un catalogue produit, consulter et traiter les commandes des commerçants.

**Profils concernés** : fournisseurs (supplier).

## 2. Accès

Barre latérale → **Portail Fournisseur** (visible si l'utilisateur a le rôle fournisseur).

## 3. Lecture de l'écran

### En-tête
- **Badge** : « Portail fournisseur marketplace ».
- **Titre** : « Catalogue, commandes et fiabilité fournisseur ».
- **Bouton Actualiser** : recharge toutes les données (spinner si en cours).

### Navigation par onglets (4 sections)

| Onglet | Icône | Contenu |
|--------|-------|---------|
| Vue d'ensemble | Store | KPI, fiabilité, avis, clients |
| Profil | BadgeCheck | Formulaire profil fournisseur |
| Catalogue | Package | Gestion des fiches produit |
| Commandes | ShoppingCart | Liste + détail des commandes |

---

### Onglet Vue d'ensemble

#### KPI (6 cartes)

| KPI | Description |
|-----|-------------|
| Catalogue | Nombre de produits publiés |
| Commandes | Nombre total de commandes reçues |
| Actions en attente | Commandes nécessitant une action fournisseur |
| CA livré | Chiffre d'affaires des commandes livrées |
| Ce mois-ci | CA du mois en cours |
| Clients actifs | Nombre de commerçants actifs |

#### Carte Fiabilité (visible par les commerçants)

| Indicateur | Description |
|------------|-------------|
| Badge vérifié | « Vérifié » (vert) ou « À compléter » (ambre) |
| Note moyenne | Score /5 avec nombre d'avis |
| Panier moyen | Valeur moyenne des commandes |
| Statuts | Badges colorés par statut de commande (Nouvelle, Confirmée, Expédiée, Livrée, Annulée) |

#### Top produits
Classement des produits les plus commandés avec quantité totale.

#### Clients marchands récents
Liste des 6 derniers clients avec date de dernière commande et nombre total de commandes.

#### Profil marketplace (résumé)
Société, ville, zones de livraison, minimum de commande, délai moyen.

#### Avis récents
5 derniers avis avec note, commentaire et date.

---

### Onglet Profil

#### Formulaire (8 champs)

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Nom de société | Texte | Oui |
| Téléphone pro | Texte | Non |
| Ville | Texte | Non |
| Adresse | Texte (pleine largeur) | Non |
| Catégories | Texte CSV | Non |
| Zones de livraison | Texte CSV | Non |
| Minimum de commande | Nombre | Non |
| Délai moyen (jours) | Nombre | Non |
| Description | Textarea (pleine largeur) | Non |

#### Checklist minimale
Indicateurs visuels (points vert/gris) pour : société, téléphone, catégories, zones.

#### Rappel produit
Conseils pour maintenir un profil de qualité.

---

### Onglet Catalogue

#### En-tête catalogue
- Recherche dans le catalogue.
- Bouton « Nouveau produit ».

#### Formulaire produit (création / édition)

| Champ | Type |
|-------|------|
| Nom | Texte |
| Catégorie | Texte |
| Sous-catégorie | Texte |
| Prix | Nombre |
| Unité | Texte (défaut : « unité ») |
| Stock disponible | Nombre |
| Minimum de commande | Nombre |
| Description | Textarea |
| Disponible | Case à cocher |

#### Grille de produits
Cartes avec : nom, catégorie, badge disponible/masqué, prix, stock, MOQ, description.
Actions par carte : Modifier, Masquer/Rendre visible, Supprimer.

---

### Onglet Commandes

#### Filtres

| Filtre | Type |
|--------|------|
| Statut | Sélecteur (tous, nouvelle, confirmée, expédiée, livrée, annulée) |
| Client marchand | Sélecteur |
| Date début | Date |
| Date fin | Date |

#### Liste des commandes (panneau gauche)
Cartes cliquables avec : nom du commerçant, ID, date, badge statut, montant, articles, date livraison souhaitée.

#### Détail de la commande (panneau droit)
- Informations : commerçant, statut, ID, date de création.
- Montant total et date de livraison souhaitée.
- Note du commerçant (si présente).
- Lignes de commande : produit, quantité × prix unitaire, total, quantité reçue.
- Actions disponibles selon le statut :
  - **Nouvelle** → Confirmer ou Annuler.
  - **Confirmée** → Expédier.
  - **Expédiée+** → Aucune action côté fournisseur.

#### Codes couleur des statuts

| Statut | Couleur |
|--------|---------|
| Nouvelle (pending) | Ambre |
| Confirmée | Bleu ciel |
| Expédiée | Violet |
| Partiellement livrée | Orange |
| Livrée | Vert |
| Annulée | Rose |

## 4. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment les commerçants voient mon profil ? | Ils consultent votre fiche marketplace avec votre note, catégories, zones et délais moyens. |
| Comment masquer un produit sans le supprimer ? | Utilisez le bouton « Masquer » sur la carte produit. Il ne sera plus visible dans la marketplace. |
| Puis-je filtrer les commandes par dates ? | Oui, utilisez les champs début et fin dans l'onglet Commandes. |

## 5. Guide rapide intégré

1. **Portail Fournisseur** — Gérez votre présence sur la marketplace.
2. **Profil** — Complétez votre fiche pour être visible et crédible.
3. **Catalogue** — Publiez vos produits avec prix, stock et minimum de commande.
4. **Commandes** — Traitez les commandes des commerçants.
