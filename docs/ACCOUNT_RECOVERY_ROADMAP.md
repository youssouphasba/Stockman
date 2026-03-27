# Roadmap Récupération de Compte (ancien email -> nouvel email)

Statut : plan validé, implémentation différée

## 1) Objectif

Permettre à un utilisateur qui a créé un nouveau compte par erreur de récupérer ses données historiques, en rattachant son nouvel email à son ancien compte, sans perte de données.

## 2) Principe fonctionnel (important)

On ne copie pas les données vers un nouveau compte.

On conserve le compte d’origine (même `user_id` / même propriétaire de données) et on remplace les identifiants de connexion.

Résultat :
- toutes les données existantes restent intactes ;
- le nouvel email devient l’email de connexion principal ;
- les sessions actives sont révoquées.

## 3) Parcours utilisateur cible

### Étape A — Demande
- Écran “Récupérer mon compte”.
- Champs :
  - ancien email ;
  - nouvel email.

### Étape B — Vérifications obligatoires
- OTP envoyé à l’ancien email (preuve de propriété du compte source).
- OTP envoyé au nouvel email (validation de la destination).
- Les 2 OTP doivent être validés dans une fenêtre temporelle courte.

### Étape C — Confirmation
- Écran de confirmation avec résumé :
  - compte source trouvé ;
  - nouvel email validé ;
  - impact : “vos données restent identiques, seul l’accès change”.

### Étape D — Finalisation
- Mise à jour de l’email de connexion sur le compte source.
- Mise à jour des credentials.
- Révocation de toutes les sessions.
- Message final : “Récupération terminée, reconnectez-vous avec le nouvel email”.

## 4) Cas métiers à gérer

### Cas 1 — Nouveau compte déjà créé et vide
- Option recommandée : archiver/supprimer ce nouveau compte après récupération.
- Le compte source devient le compte unique à utiliser.

### Cas 2 — Nouveau compte déjà créé avec données
- Bloquer la récupération automatique.
- Exiger une intervention support (fusion manuelle supervisée).

### Cas 3 — Ancien compte introuvable
- Retour utilisateur clair : ancien email non reconnu.

### Cas 4 — Ancien compte supprimé
- Aucune récupération applicative possible.
- Seule option : restauration depuis sauvegarde serveur (si politique de backup disponible).

### Cas 5 — Utilisateur sans accès à l’ancien email
- Ne pas autoriser la récupération automatique.
- Basculer vers un processus support/KYC renforcé.

## 5) Exigences de sécurité

- OTP à usage unique, expiration courte, limitation des tentatives.
- Rate limit sur les endpoints de demande et de validation.
- Journalisation de sécurité complète :
  - demande créée ;
  - OTP ancien email validé ;
  - OTP nouvel email validé ;
  - récupération finalisée ;
  - sessions révoquées.
- Notification post-opération sur les deux emails.

## 6) Design technique (backend)

### Endpoints à ajouter
- `POST /auth/recovery/request`
  - crée la demande de récupération ;
  - envoie OTP ancien email + OTP nouvel email.

- `POST /auth/recovery/verify-old-email`
  - valide OTP ancien email.

- `POST /auth/recovery/verify-new-email`
  - valide OTP nouvel email.

- `POST /auth/recovery/confirm`
  - exécute l’opération atomique de récupération :
    - verrou de cohérence ;
    - update email utilisateur source ;
    - update credentials ;
    - réinitialisation sessions ;
    - clôture de la demande.

### Collections suggérées
- `account_recovery_requests`
  - `request_id`, `old_email`, `new_email`, `old_user_id`, `status`,
  - `old_email_verified_at`, `new_email_verified_at`,
  - `expires_at`, `created_at`, `updated_at`, `confirmed_at`.

### Règles d’atomicité
- Transaction MongoDB (si disponible) pour les écritures critiques.
- Idempotence sur `confirm` pour éviter une double exécution.

## 7) Design technique (web/mobile)

- Ajouter écran “Récupérer mon compte” sur web et mobile.
- Réutiliser composants OTP existants.
- Afficher des messages explicites :
  - erreurs OTP ;
  - email déjà utilisé ;
  - compte supprimé ;
  - récupération réussie.

## 8) Plan de test

- Test nominal : ancien email + nouvel email valides.
- Test OTP expiré.
- Test dépassement de tentatives.
- Test nouvel email déjà utilisé avec compte non vide.
- Test révocation de session après confirmation.
- Test non-régression login classique.

## 9) Rollout

- Phase 1 : backend + logs + feature flag.
- Phase 2 : activation interne (admin/support).
- Phase 3 : ouverture utilisateur finale.

## 10) Décisions produit

- Recommandation : implémenter ce flux avant d’ajouter une fusion automatique de données entre deux comptes actifs.
- Raison : risque élevé de mélange de données et de litiges.

---

Document de référence conservé pour implémentation ultérieure.
