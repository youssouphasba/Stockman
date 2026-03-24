# Guide — Abonnement

## 1. Rôle du module

Le module Abonnement permet de consulter et gérer son plan tarifaire, choisir un moyen de paiement (carte ou Mobile Money), et mettre à jour le contact de facturation.

**Profils concernés** : shopkeeper, admin.

## 2. Accès

Barre latérale → **Compte** → **Abonnement**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Gestion d'abonnement ».
- **Sous-titre** : prix effectifs, devise et canal de paiement.

### Carte plan actuel
Bandeau coloré (vert si actif, rouge sinon) affichant :
- Plan actuel (Starter / Pro / Enterprise).
- Statut de l'abonnement et date d'expiration.
- Devise et région tarifaire.

### Session démo (si applicable)
Bandeau bleu indiquant le type de démo, la surface et l'expiration.

### Phase de continuité (si applicable)
Bandeau ambre indiquant la phase (grace, read_only) et les dates limites.

### Pays et devise
Informations en lecture seule : pays de facturation, devise, région tarifaire.

### Cartes plans
Trois plans côte à côte :
| Plan | Fonctionnalités clés |
|------|---------------------|
| Starter | App mobile, 1 boutique, 1 utilisateur |
| Pro | App mobile, 2 boutiques, 5 utilisateurs |
| Enterprise | Illimité + back-office web + CRM + analytics |

### Contact de facturation
Formulaire avec nom et email du contact de facturation.

### Informations paiement
Deux cartes : Mobile Money (Flutterwave) et Carte bancaire (Stripe).

### Historique de facturation
Section « Aucune facture disponible pour le moment ».

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Payer via Mobile Money | Clic | Redirige vers le checkout Flutterwave |
| Payer par carte bancaire | Clic | Redirige vers le checkout Stripe |
| Mettre à jour le contact | Enregistre | Sauvegarde nom et email de facturation |
| Réessayer | Clic (si erreur) | Recharge les données d'abonnement |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Erreur | Bandeau rose avec message et bouton « Réessayer » |
| Paiement en cours | Spinner sur le bouton de paiement |
| Plan actuel | Bouton « Plan actuel » grisé sur le plan souscrit |

## 6. Cas d'usage typiques

- **Upgrade** : consulter les plans → cliquer sur le bouton de paiement du plan souhaité → être redirigé vers le checkout.
- **Mise à jour facturation** : modifier le nom et l'email → cliquer « Mettre à jour le contact ».
- **Vérification** : consulter la devise, la région et le plan actif.

## 7. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment changer de devise ? | La devise est définie à l'inscription et ne peut être modifiée depuis cet écran. Contactez le support. |
| Mobile Money ou carte ? | Le moyen de paiement affiché dépend de votre pays de facturation. |
| Que se passe-t-il si mon abonnement expire ? | Votre compte passe en phase de grâce, puis en lecture seule. Vos données ne sont pas supprimées. |

## 8. Guide rapide intégré

1. **Votre abonnement** — Consultez votre plan actif, sa date d'expiration et votre devise.
2. **Choisir un plan** — Comparez les offres Starter, Pro et Enterprise.
3. **Payer** — Sélectionnez Mobile Money ou carte bancaire selon votre région.
4. **Contact facturation** — Mettez à jour le nom et l'email pour recevoir vos factures.
