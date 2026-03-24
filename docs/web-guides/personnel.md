# Guide — Personnel

## 1. Rôle du module

Le module Personnel permet de gérer les employés (sous-utilisateurs) : création de comptes, attribution de rôles prédéfinis, permissions granulaires par module et par boutique, et invitation via WhatsApp.

**Profils concernés** : admin (permission `staff` requise).

## 2. Accès

Barre latérale → **Personnel**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Gestion de l'Équipe ».
- **Sous-titre** : « Gérez vos employés et leurs accès aux différents modules. »
- **Bouton** : « Ajouter un employé ».

### Liste des employés (grille de cartes)

Chaque carte affiche :

| Élément | Contenu |
|---------|---------|
| Avatar | Initiale du nom en cercle coloré |
| Nom | Nom complet de l'employé |
| Email | Adresse email |
| Magasins | Nombre de magasins assignés |
| Rôles admin | Badges ambre (Admin facturation, Admin opérations) |
| Permissions | Grille 2 colonnes avec badge par module (Gestion/Lecture/Aucun accès) |
| Bouton WhatsApp | Envoie une invitation via WhatsApp |
| Bouton Modifier | Ouvre la modal d'édition |
| Bouton Supprimer | Supprime l'employé après confirmation |

### Badges de permissions

| Badge | Couleur | Signification |
|-------|---------|---------------|
| Gestion (✏) | Vert (emerald) | Lecture + écriture |
| Lecture seule (👁) | Bleu (primary) | Consultation uniquement |
| Aucun accès (✕) | Gris (slate) | Module masqué |

### Modal — Ajouter / Modifier un employé

Le formulaire contient :

#### Informations de base
- **Nom complet** (obligatoire).
- **Email** (obligatoire, création uniquement).
- **Mot de passe** (obligatoire, création uniquement).

#### Modèles de rôle (boutons rapides)

| Modèle | Droits appliqués |
|--------|-----------------|
| Caissier | POS: écriture, Stock: lecture, le reste: aucun |
| Gestionnaire stock | Stock: écriture, Fournisseurs: lecture, le reste: aucun |
| Comptable | Compta: écriture, POS+Stock+Fournisseurs: lecture |
| Manager | Tout en écriture sauf Compta (lecture) |
| Agent CRM | CRM: écriture, POS: lecture, le reste: aucun |

#### Permissions par module
6 modules configurables : POS, Stock, Comptabilité, CRM, Fournisseurs, Personnel.
Chaque module alterne entre : Aucun → Lecture → Gestion (clic rotatif).

#### Magasins assignés
- **Sélection** : boutons pour chaque boutique.
- **Permissions par boutique** : droits spécifiques par module, affinant les permissions générales.
- **Indication** : « Suit les permissions générales » ou « Droits spécifiques configurés ».

#### Rôles de compte
- **Admin facturation** : gère l'abonnement.
- **Admin opérations** : gère les magasins, les modules et l'équipe (confirmation requise).

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Ajouter un employé | Ouvre modal de création | Formulaire avec identifiants et permissions |
| WhatsApp (💬) | Carte employé | Envoie un message d'invitation via WhatsApp |
| Modifier (✏) | Carte employé | Ouvre la modal d'édition avec les données actuelles |
| Supprimer (🗑) | Carte employé | Suppression après confirmation |
| Modèle de rôle | Modal | Applique un jeu de permissions prédéfini |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Erreur | Bandeau rose avec message et bouton « Réessayer » |
| Aucun employé | Icône Users + texte |

## 6. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment donner un accès partiel ? | Utilisez les permissions par module. Par exemple, « Lecture » pour le Stock. |
| Peut-on personnaliser les droits par boutique ? | Oui, développez la section boutique dans la modal pour ajuster module par module. |
| L'employé peut-il se connecter immédiatement ? | Oui, dès la création du compte avec l'email et le mot de passe définis. |

## 7. Guide rapide intégré

1. **Bienvenue dans Personnel** — Gérez votre équipe et les niveaux d'accès à chaque module.
2. **Ajouter un employé** — Créez un compte avec rôle et permissions adaptés à chaque poste.
3. **Permissions** — Contrôlez finement l'accès (lecture, écriture, aucun) pour chaque module.
4. **Magasins** — Assignez des employés à des boutiques spécifiques avec des droits personnalisés.
