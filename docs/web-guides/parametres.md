# Guide — Paramètres

## 1. Rôle du module

Le module Paramètres permet de configurer l'ensemble de l'application : profil utilisateur, préférences régionales, notifications, documents commerciaux (reçu, facture), TVA, boutiques et sécurité.

**Profils concernés** : shopkeeper, admin. Certaines sections nécessitent le rôle admin ou le droit de gestion organisation.

## 2. Accès

Barre latérale → **Compte** → **Paramètres**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Paramètres de l'espace ».
- **Sous-titre** : présentation des trois niveaux (utilisateur, compte, boutique).
- **Carte d'aide** : explication rapide des portées de chaque réglage.

### Résumé
Trois cartes : Compte (nom utilisateur), Organisation (éditable ou lecture seule), Boutique active.

### Onglets
| Onglet | Contenu |
|--------|---------|
| Compte | Profil, préférences régionales, contact facturation |
| Organisation | Modules actifs, rappels automatiques |
| Notifications | Canaux personnels, contacts par groupe (compte et boutique) |
| Documents | TVA, terminaux, reçu, facture |
| Boutiques | Emplacements de stock, profil boutique |
| Sécurité | Mot de passe, suppression de compte |

## 4. Sections détaillées

### Compte
- **Profil** : nom affiché, email (non modifiable).
- **Préférences régionales** : langue (fr/en/wo), devise (XOF, EUR, USD…).
- **Contact facturation** (admin) : nom et email du contact de facturation.

### Organisation (admin)
- **Modules actifs** : toggles pour activer/désactiver les fonctionnalités (CRM, fournisseurs, commandes, comptabilité, etc.).
- **Rappels automatiques** : configuration des rappels envoyés automatiquement par le système.

### Notifications
- **Canaux personnels** : In-app, Push, Email avec seuils de sévérité.
- **Contacts compte** : emails destinataires par groupe (Défaut, Stock, Appro, Finance, CRM, Opérations, Facturation).
- **Contacts boutique** : idem mais au niveau de la boutique active.

### Documents (admin)
- **TVA** : activation, taux, mode (TTC ou HT).
- **Terminaux** : liste des terminaux de paiement enregistrés.
- **Reçu** : nom commercial et pied de page.
- **Facture** : nom, adresse, libellé, préfixe, pied de page, conditions de paiement.

### Boutiques
- **Emplacements** : création/suppression d'emplacements (étagère, entrepôt, quai).
- **Profil boutique** (admin) : nom et adresse de chaque boutique.

### Sécurité
- **Mot de passe** : changement avec ancien + nouveau + confirmation.
- **Suppression de compte** : action irréversible nécessitant le mot de passe.

## 5. Boutons et actions

| Bouton | Section | Effet |
|--------|---------|-------|
| Enregistrer | Chaque section | Sauvegarde les modifications |
| Toggle module | Organisation | Active/désactive un module |
| + (emplacement) | Boutiques | Crée un emplacement |
| 🗑 (emplacement) | Boutiques | Supprime un emplacement |
| Changer le mot de passe | Sécurité | Met à jour le mot de passe |
| Supprimer mon compte | Sécurité | Suppression définitive |

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Succès | Bandeau vert temporaire |
| Erreur | Bandeau rouge avec message |
| Non autorisé | Encadré ambre « Seul un administrateur peut modifier ce paramètre. » |

## 7. Cas d'usage typiques

- **Changer de langue** : onglet Compte → Préférences régionales → sélectionner la langue → Enregistrer.
- **Activer la TVA** : onglet Documents → TVA → activer le toggle → saisir le taux → Enregistrer.
- **Gérer les emplacements** : onglet Boutiques → Emplacements → ajouter un nouvel emplacement.

## 8. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Pourquoi je ne peux pas modifier certains paramètres ? | Votre rôle ne dispose pas des droits nécessaires. Contactez un administrateur. |
| Que se passe-t-il si je désactive un module ? | Le module disparaît de la barre latérale et de l'application mobile. |
| La suppression de compte est-elle réversible ? | Non, elle est définitive. Toutes vos données seront supprimées. |

## 9. Guide rapide intégré

1. **Bienvenue dans Paramètres** — Configurez votre espace de travail selon vos besoins.
2. **Profil et préférences** — Modifiez votre nom, langue et devise dans l'onglet Compte.
3. **Notifications** — Choisissez comment recevoir vos alertes (push, email, in-app).
4. **Documents** — Configurez la TVA, les terminaux, les formats de reçu et facture.
5. **Boutiques** — Gérez les emplacements de stock et les profils de vos boutiques.
