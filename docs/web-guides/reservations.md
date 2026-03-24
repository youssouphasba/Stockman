# Guide — Réservations

## 1. Rôle du module

Le module Réservations permet de gérer les créneaux de réservation par date : créer, confirmer, annuler et suivre le statut de chaque réservation, avec association optionnelle à une table.

**Profils concernés** : shopkeeper restaurant, hôte d'accueil.

## 2. Accès

Barre latérale → **Réservations** (visible pour les comptes de type restaurant).

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Réservations ».
- **Sous-titre** : nombre de réservations du jour sélectionné.
- **Sélecteur de date** : change la date affichée.
- **Bouton** : « Nouvelle réservation ».

### Liste des réservations

Chaque réservation apparaît sous forme de ligne horizontale avec :

| Élément | Contenu |
|---------|---------|
| Heure | Heure du créneau (grand format) |
| Nom du client | Nom du réservataire |
| Téléphone | Numéro de contact (icône Phone) |
| Couverts | Nombre de personnes (icône Users) |
| Table | Table assignée si définie (icône CalendarDays) |
| Notes | Notes spéciales (italique) |
| Badge statut | Statut actuel avec code couleur |
| Sélecteur de statut | Menu déroulant pour changer le statut |

### Statuts de réservation

| Statut | Couleur | Signification |
|--------|---------|---------------|
| En attente (pending) | Ambre | Réservation non encore confirmée |
| Confirmée (confirmed) | Bleu | Réservation validée |
| Arrivée (arrived) | Vert | Le client est arrivé et installé |
| Annulée (cancelled) | Rose | Réservation annulée |
| No-show | Gris | Le client ne s'est pas présenté |

### Formulaire — Nouvelle réservation (7 champs)

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Nom client | Texte | Oui |
| Téléphone | Texte | Non |
| Date | Date picker | Oui (pré-rempli) |
| Heure | Time picker | Oui (défaut : 12:00) |
| Couverts | Nombre (1-50) | Oui (défaut : 2) |
| Table | Sélecteur (liste des tables) | Non |
| Notes | Texte | Non |

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Nouvelle réservation | En-tête | Ouvre le formulaire de création |
| Sélecteur de date | En-tête | Change la date et recharge la liste |
| Menu statut | Chaque ligne | Change le statut via l'API (arrive = installe le client + occupe la table) |

## 5. Questions fréquentes

| Question | Réponse |
|----------|---------|
| La table est-elle automatiquement occupée à l'arrivée ? | Oui, « Arrivée » installe le client et marque la table comme occupée. |
| Puis-je réserver sans table ? | Oui, la table est optionnelle. Le client sera placé à l'arrivée. |

## 6. Guide rapide intégré

1. **Réservations** — Gérez les créneaux de réservation par date.
2. **Créer** — Ajoutez une réservation avec nom, heure et nombre de couverts.
3. **Suivi** — Changez le statut de chaque réservation depuis la liste.
