# Roadmap Historique Système et Audit

Statut : plan validé, implémentation différée

## 1) Objectif

Rendre l’historique système fiable, exploitable et complet pour :
- l’audit interne ;
- l’investigation d’incidents ;
- le suivi des actions utilisateurs et admin ;
- la conformité et la sécurité.

## 2) Problèmes observés à corriger

- Certaines opérations ne sont pas historisées.
- Les événements ne sont pas toujours homogènes entre modules.
- Le niveau de détail est parfois insuffisant pour comprendre “qui a fait quoi”.
- Les écrans ne facilitent pas toujours la recherche d’un événement précis.

## 3) Principe cible

Chaque action importante doit produire un événement d’audit standardisé, avec :
- acteur ;
- action ;
- ressource ;
- portée (compte, boutique, module) ;
- avant/après (si modification) ;
- horodatage UTC ;
- contexte technique minimal (session, IP, appareil).

## 4) Schéma standard des événements

### Champs minimum obligatoires
- `event_id`
- `timestamp_utc`
- `actor_user_id`
- `actor_role`
- `account_id`
- `store_id` (si applicable)
- `module`
- `action`
- `resource_type`
- `resource_id`
- `status` (`success` / `failed`)

### Champs recommandés
- `before_snapshot` (modification/suppression)
- `after_snapshot` (création/modification)
- `reason` (annulation, correction, rejet, etc.)
- `request_id` (corrélation)
- `session_id`
- `ip_hash` (jamais IP brute en clair dans l’UI)
- `device_fingerprint` (si disponible)

## 5) Couverture fonctionnelle attendue

### A. Authentification et sécurité
- Connexion réussie / échouée
- Déconnexion
- Rotation de session / expiration
- Changement de mot de passe
- Vérification OTP (succès/échec)
- Récupération de compte

### B. Données métier
- Produits : création, modification, suppression, transfert d’emplacement
- Stock : entrée, sortie, ajustement, inventaire, correction
- Ventes : création, annulation, retour
- Clients : création, modification, paiement, annulation de paiement
- Fournisseurs : création, liaison produit, commande, réception

### C. Administration
- Changement de plan
- Actions d’abonnement (liens, rappels, grâce, read-only)
- Diffusions admin (emails, notifications)
- Modifications de paramètres sensibles

## 6) Lisibilité côté UI (web + mobile)

### Filtres indispensables
- Période
- Module
- Type d’action
- Utilisateur
- Boutique
- Statut (succès/échec)

### Détails d’un événement
- Résumé lisible en une ligne
- Détail technique dépliable
- Avant/après (diff clair) pour les modifications
- Liens rapides vers la ressource concernée

### Export audit
- Export CSV/PDF filtré
- En-tête avec période, filtres, généré par, date
- Signature logique du rapport (identifiant de lot d’export)

## 7) Règles de qualité et de sécurité

- Jamais de données sensibles en clair dans l’historique UI.
- Champs critiques masqués ou hachés (IP, tokens, secrets).
- Immutabilité logique : un log d’audit ne se modifie pas.
- Rétention configurée (ex. 12 à 24 mois selon le type).
- Alertes automatiques sur anomalies de sécurité (pics d’échecs login, actions admin massives).

## 8) Détection des trous de traçabilité

### Audit de couverture
- Lister les endpoints critiques.
- Vérifier pour chaque endpoint la présence d’un log.
- Générer un score de couverture par module.

### Contrôle CI recommandé
- Test automatique : endpoint critique sans log => échec CI.

## 9) Plan d’implémentation

### Phase 1 — Normalisation backend
- Créer un helper unique d’écriture d’événements.
- Uniformiser les schémas d’événements existants.
- Ajouter les logs manquants sur les endpoints critiques.

### Phase 2 — Interface d’audit
- Refonte de l’écran Historique (filtres + détail + export).
- Ajout d’un mode “investigation” (corrélation par `request_id` / `session_id`).

### Phase 3 — Gouvernance
- Dashboard de couverture de traçabilité.
- Alertes sécurité sur patterns suspects.
- Procédure interne d’investigation (runbook).

## 10) Critères d’acceptation

- 100 % des endpoints critiques couverts.
- Reconstitution d’un incident majeur possible en moins de 10 minutes.
- Export d’audit lisible et cohérent avec les filtres appliqués.
- Aucun secret sensible exposé dans les logs visibles.

## 11) Risques et mitigations

- Risque : volume de logs trop élevé.
  - Mitigation : niveaux d’événements, index, archivage.

- Risque : performances en lecture.
  - Mitigation : index ciblés + pagination + filtres obligatoires.

- Risque : surcharge équipe support.
  - Mitigation : vues prêtes à l’emploi (erreurs auth, actions admin, opérations stock).

---

Document de référence conservé pour implémentation ultérieure.
