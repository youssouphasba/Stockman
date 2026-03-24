# Guide — Gestion des Tables

## 1. Rôle du module

Le plan de salle permet de visualiser et gérer l'état de toutes les tables du restaurant en temps réel : libre, occupée, réservée ou en nettoyage. C'est l'outil central pour la gestion de la salle.

**Profils concernés** : shopkeeper restaurant, serveurs.

## 2. Accès

Barre latérale → **Tables** (visible uniquement pour les comptes de type restaurant).

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Plan de Salle ».
- **Dernière mise à jour** : horodatage (rafraîchissement automatique toutes les 30 secondes).
- **Bouton Actualiser** : recharge les données.
- **Bouton** : « Ajouter une table ».

### Compteurs rapides (bandeau)

| Indicateur | Point | Description |
|------------|-------|-------------|
| Libres | 🟢 Vert | Tables disponibles |
| Occupées | 🟡 Ambre | Tables avec service en cours |
| Réservées | 🔵 Bleu | Tables attendant l'arrivée |
| Nettoyage | ⚫ Gris | Tables en cours de remise en état |

### Onglets de filtrage

| Filtre | Affichage |
|--------|-----------|
| Toutes | Toutes les tables |
| Libres | Uniquement les tables libres |
| Occupées | Tables en service |
| Réservées | Tables réservées |
| Nettoyage | Tables en cours de nettoyage |

### Cartes de table (grille 2-5 colonnes)

Chaque carte affiche :

| Élément | Contenu |
|---------|---------|
| Nom | Nom ou numéro de la table |
| Capacité | Nombre de couverts (icône Users) |
| Badge statut | Pastille colorée + texte (Libre, Occupée, Réservée, Nettoyage) |
| Timer (occupée) | Durée d'occupation en temps réel (HH:MM) |
| Couverts assis | Nombre de personnes actuellement installées |
| Montant en cours | Montant de la commande en cours (vert) |

### Codes couleur des statuts

| Statut | Bordure | Badge | Signification |
|--------|---------|-------|---------------|
| Libre (free) | Vert | Vert | Table disponible pour placement |
| Occupée (occupied) | Ambre | Ambre | Service en cours avec timer |
| Réservée (reserved) | Bleu | Bleu | Réservation confirmée |
| Nettoyage (cleaning) | Gris | Gris | En cours de remise en état |

### Actions par statut (menu contextuel)

Le clic droit ou appui long ouvre un menu contextuel :

| Statut actuel | Actions disponibles |
|---------------|-------------------|
| Libre | Réserver, Installer des clients |
| Réservée | Marquer l'arrivée, Libérer |
| Occupée | Passer en nettoyage |
| Nettoyage | Marquer propre, Réserver |

Toutes les tables peuvent être supprimées via le menu contextuel.

### Formulaire — Nouvelle table

| Champ | Type | Contrainte |
|-------|------|------------|
| Nom / Numéro | Texte | Obligatoire |
| Capacité (couverts) | Nombre | 1-30 |

## 4. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment changer le statut d'une table ? | Clic droit (ou appui long sur mobile) pour ouvrir le menu d'actions. |
| Le montant affiché est-il en temps réel ? | Oui, il correspond à la vente en cours liée à la table. |
| Comment supprimer une table ? | Via le menu contextuel (clic droit → Supprimer). Confirmation requise. |

## 5. Guide rapide intégré

1. **Plan de salle** — Visualisez toutes vos tables en temps réel.
2. **Statuts** — Identifiez d'un coup d'œil les tables libres, occupées et réservées.
3. **Actions rapides** — Clic droit pour changer le statut d'une table.
