# Guide — Administration (Backoffice)

## 1. Rôle du module

Le backoffice d'administration est le panneau de supervision globale du système Stockman. Il couvre la gestion des utilisateurs, boutiques, abonnements, démos, sécurité, litiges, support et communication.

**Profils concernés** : super-admin uniquement.

## 2. Accès

Barre latérale → **Administration** (visible uniquement pour les super-admins).

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Backoffice Admin ».
- **Sous-titre** : « Supervision globale du système Stockman. »
- **Indicateur système** : badge vert « Opérationnel » ou rouge « Erreur ».
- **Bouton Actualiser** : recharge la section active.

### Navigation par onglets (11 sections)

| Onglet | Icône | Contenu |
|--------|-------|---------|
| Vue d'ensemble | TrendingUp | KPI globaux + géographie + conversion |
| Abonnements | CreditCard | Comptes payants, trials, MRR, alertes |
| Démos | Clock | Sessions démo actives, expirées |
| Utilisateurs | Users | Liste, ban, suppression |
| Boutiques | Store | Toutes les boutiques du système |
| Produits | Package | Panel d'administration produit |
| Catalogue | BarChart2 | Catalogue admin |
| Litiges | AlertCircle | Gestion des réclamations |
| Sécurité | Shield | Événements de sécurité, sessions actives |
| Support | MessageSquare | Tickets et réponses |
| Broadcast | Bell | Messages groupés et historique |

---

### Onglet Vue d'ensemble

#### KPI ligne 1 (4 cartes)

| KPI | Sous-information |
|-----|-----------------|
| Shopkeepers | +X aujourd'hui |
| CA Global (30j) | CA aujourd'hui |
| Tickets ouverts | — |
| Pays couverts | X inscrits (7j) |

#### KPI ligne 2 — Plans & Trials (4 cartes)

| KPI | Couleur |
|-----|---------|
| Enterprise | Violet |
| Pro | Bleu |
| Starter | Vert |
| Trials expirant (7j) | Rose (relance recommandée) |

#### Carte Distribution Géographique
Barres horizontales par pays, proportionnelles au nombre d'utilisateurs.

#### Carte Top Boutiques (CA)
Classement des boutiques par chiffre d'affaires avec nombre de ventes.

#### KPI OTP (4 cartes)

| KPI | Description |
|-----|-------------|
| OTP envoyés | Aujourd'hui |
| OTP vérifiés | Aujourd'hui |
| Taux de vérification | Sur 30 jours |
| Temps moyen OTP | En minutes |

#### Section Onboarding & Conversion

| Bloc | Contenu |
|------|---------|
| Funnel | Comptes créés → OTP envoyés → OTP vérifiés → Premiers logins |
| Conversion | Comptes payants, trials actifs, trials à risque, taux global |
| Par plan | Répartition des utilisateurs par plan |
| Par surface | Répartition mobile/web |

#### Section OTP & Enterprise

| Bloc | Contenu |
|------|---------|
| Twilio | Envoyés, échecs, expirés, taux de vérification |
| Resend | Envoyés, échecs, expirés, taux de vérification |
| Enterprise | Créées, email vérifiés, première vente, actives, inactifs J+1, inactifs J+7 |

---

### Onglet Abonnements

#### Robustesse des donnees
- Si le MRR n'est pas encore disponible, la carte affiche `-` au lieu de bloquer l'ecran.
- Si un compte n'a pas de liens de paiement, la colonne actions affiche `Stripe: —` et `Mobile Money: —`.

#### KPI (8 cartes)

| KPI | Description |
|-----|-------------|
| Comptes payants | Abonnements actifs |
| Trials actifs | Dont X expirent sous 3 jours |
| Abonnements à risque | Expirent sous 7 jours |
| Paiements 30j | Tous providers confondus |
| MRR estimé | Revenus récurrents mensuels |
| Annulés | Comptes annulés |
| Expirés | Comptes expirés |
| Alertes | X critiques |

#### Filtres
- Recherche textuelle.
- Statut : tous/actif/expiré/annulé.
- Provider : tous/Stripe/Flutterwave/RevenueCat.

#### Tableau des comptes
Colonnes : nom, propriétaire, email, plan, statut, provider, devise, phase d'accès.
Actions par ligne : accorder X jours de grâce, activer/désactiver lecture seule.

#### Historique des événements
Timeline : type d'événement, date, provider, référence, message.

---

### Onglet Utilisateurs

#### Tableau
- Recherche par nom, email, code pays ou plan.
- Colonnes : avatar, nom, email, plan (badge couleur), pays, date.
- Actions : bannir/réactiver, supprimer (avec confirmation).

#### Modal de suppression
Confirmation explicite avec liste des données supprimées (produits, ventes, clients, boutiques, staff).

---

### Onglet Sécurité

#### KPI sécurité
Compteurs d'événements de sécurité.

#### Événements de sécurité
Liste chronologique des événements suspects.

#### Vérifications (Firebase/Resend)
Filtres : provider et canal (phone/email).

#### Sessions actives
Liste des sessions en cours.

---

### Onglet Broadcast

#### Formulaire d'envoi
- Titre du message.
- Corps du message.
- Bouton « Envoyer la notification ».

#### Historique
Filtres : broadcast/annonce/individuel.
Liste des messages avec date, type et contenu.

## 4. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Qui accède au backoffice ? | Uniquement les super-administrateurs. |
| Comment accorder une grâce à un compte ? | Onglet Abonnements → bouton « Grâce » sur la ligne du compte → indiquez le nombre de jours. |
| Comment bannir un utilisateur ? | Onglet Utilisateurs → bouton cadenas sur la ligne → le compte est désactivé. |

## 5. Guide rapide intégré

1. **Panneau d'administration** — Supervisez l'ensemble de la plateforme Stockman.
2. **KPI globaux** — Suivez les métriques clés : utilisateurs, CA, conversions.
3. **Abonnements** — Gérez les comptes payants, accordez des grâces.
4. **Sécurité** — Surveillez les événements suspects et les sessions actives.
