# Roadmap Récupération Assistée (cas "tout oublié")

Statut : plan validé, implémentation différée

## 1) Objectif

Permettre la récupération d’un ancien compte quand l’utilisateur a perdu :
- son ancien mot de passe ;
- l’accès à son ancien email ;
- et ne peut pas passer par les parcours automatiques.

## 2) Principe

Le support n’effectue pas une fusion aveugle de comptes.  
Le support restaure l’accès au compte d’origine après vérifications fortes, puis force une reprise de contrôle sécurisée.

## 3) Parcours opérationnel

### Étape A — Ouverture du dossier
- Création d’un ticket “Récupération assistée”.
- Attribution d’un identifiant de dossier.
- Mise du compte source en “mode protégé” :
  - blocage des actions critiques ;
  - interdiction de suppression/transfer.

### Étape B — Vérification d’identité (KYC interne)
- Exiger au moins 3 preuves concordantes, par exemple :
  - identité du commerce (nom exact, adresse, activité) ;
  - preuve de paiement (montant, date, moyen) ;
  - éléments historiques (clients/fournisseurs/produits connus) ;
  - pièce d’identité si nécessaire.
- Si preuves insuffisantes : refus motivé.

### Étape C — Double validation admin
- Validation par 2 admins distincts (principe des 4 yeux).
- Traçabilité complète :
  - qui a validé ;
  - quand ;
  - sur quelles preuves.

### Étape D — Reprise de contrôle
- Génération d’un lien de récupération à usage unique :
  - durée courte (ex. 15 minutes) ;
  - invalidation immédiate après usage.
- L’utilisateur définit :
  - un nouveau mot de passe ;
  - un nouvel email de connexion.
- Révocation de toutes les sessions.

### Étape E — Période de sécurité post-récupération
- Gel 24 à 48 h des opérations sensibles :
  - suppression de compte ;
  - changement d’email à nouveau ;
  - actions administratives critiques.
- Notification de sécurité envoyée aux contacts disponibles.

## 4) Règles anti-vol de compte

- Aucune récupération assistée sans dossier.
- Aucune récupération assistée sans double validation admin.
- Limitation stricte du nombre de tentatives par dossier.
- Journal sécurité obligatoire à chaque action.
- Audit interne mensuel des récupérations assistées.

## 5) Backend (à implémenter)

### Endpoints support/admin
- `POST /admin/account-recovery/cases`
  - création du dossier.
- `POST /admin/account-recovery/cases/{id}/verify`
  - ajout des preuves et validation KYC.
- `POST /admin/account-recovery/cases/{id}/approve`
  - validation admin 1 puis admin 2.
- `POST /admin/account-recovery/cases/{id}/issue-link`
  - émission du lien de reprise.
- `POST /auth/recovery/assisted/complete`
  - finalisation côté utilisateur (nouvel email + nouveau mot de passe).

### Collections suggérées
- `account_recovery_cases`
  - `case_id`, `status`, `old_user_id`, `new_email_candidate`,
  - `proofs[]`, `risk_score`, `approved_by[]`,
  - `security_lock_until`, `created_at`, `updated_at`.
- `account_recovery_audit_logs`
  - événements détaillés et immuables.

## 6) Interface admin (minimum)

- Liste des dossiers :
  - En attente, En vérification, Validé, Refusé, Clos.
- Fiche dossier :
  - preuves ;
  - journal ;
  - actions autorisées selon l’état.
- Actions explicites :
  - Refuser ;
  - Demander preuve complémentaire ;
  - Valider ;
  - Émettre le lien.

## 7) Critères de décision

### Acceptation
- preuves suffisantes ;
- cohérence historique ;
- double validation obtenue.

### Refus
- preuves incohérentes ;
- suspicion de fraude ;
- tentative répétée anormale.

## 8) Plan de test

- Dossier nominal complet.
- Dossier refusé pour preuves insuffisantes.
- Vérification que 1 seule validation admin ne suffit pas.
- Vérification de l’expiration du lien.
- Vérification de la révocation de session et du gel post-récupération.

## 9) Déploiement

- Phase 1 : endpoints + logs + feature flag (non visible utilisateurs).
- Phase 2 : écran admin interne.
- Phase 3 : activation progressive sur tickets support.

---

Document de référence conservé pour implémentation ultérieure.
