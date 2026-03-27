# Roadmap Historique Système et Audit

Statut : document de référence mis à jour après audit du code et des implémentations récentes.

## 1) Objectif

Faire de l'historique système un véritable outil de pilotage, d'audit, d'investigation, de support et de contrôle.

L'historique doit permettre de :
- comprendre rapidement qui a fait quoi ;
- retracer une opération métier ou technique ;
- investiguer un incident sans parcourir plusieurs écrans ;
- identifier les risques de sécurité et les anomalies ;
- fournir des exports fiables à l'admin, au support et à la direction ;
- agir directement depuis une ligne d'historique quand une correction est possible.

## 2) Constat actuel

Le projet dispose déjà de plusieurs briques utiles :
- `security_events` pour certains événements de sécurité ;
- `verification_events` pour les flux de vérification ;
- `subscription_events` pour une partie des événements d'abonnement ;
- des historiques métier séparés, par exemple sur les prix, les ventes, les stocks ou certaines opérations comptables ;
- des vues admin orientées abonnement et finance ;
- des rappels intelligents et plusieurs flux actionnables sur le web et le mobile.

Mais l'ensemble reste encore fragmenté :
- certaines opérations importantes ne remontent pas dans un historique commun ;
- les schémas d'événements ne sont pas encore homogènes ;
- certaines écritures sont dans la mauvaise collection ;
- il manque parfois le contexte complet pour comprendre l'action ;
- la navigation entre historique, ressource concernée et action corrective n'est pas encore assez fluide ;
- l'historique n'est pas encore exploité comme une vraie console d'audit transverse.

## 3) Principe cible

Chaque action importante doit produire un événement d'audit standardisé, lisible, filtrable et exploitable.

Un événement doit permettre de répondre immédiatement à ces questions :
- qui a agi ;
- quand ;
- sur quel compte ;
- sur quelle boutique ;
- dans quel module ;
- sur quelle ressource ;
- avec quel résultat ;
- avec quel contexte ;
- et quelle action utile peut être faite ensuite.

## 4) Schéma standard cible des événements

### Champs obligatoires
- `event_id`
- `timestamp_utc`
- `event_type`
- `module`
- `action`
- `status` : `success`, `failed`, `warning`, `info`
- `account_id`
- `store_id` si applicable
- `actor_user_id`
- `actor_name` si disponible
- `actor_role`
- `resource_type`
- `resource_id`
- `resource_label` si disponible

### Champs fortement recommandés
- `request_id`
- `session_id`
- `source_app` : `web`, `mobile`, `admin`, `system`
- `device_type`
- `provider` si applicable : `firebase`, `google`, `apple`, `stripe`, `flutterwave`, `app_store`, `play_store`, etc.
- `reason`
- `summary`
- `metadata`

### Champs recommandés pour les modifications
- `before_snapshot`
- `after_snapshot`
- `changed_fields`

### Champs sensibles à protéger
- `ip_hash` au lieu de l'IP brute dans l'interface ;
- aucun token, secret, code OTP ni identifiant de session complet dans l'UI ;
- tout champ sensible doit être masqué, haché ou tronqué.

## 5) Couverture fonctionnelle attendue

### A. Authentification et sécurité
- connexion réussie ;
- connexion échouée ;
- déconnexion ;
- rotation de session ;
- session expirée ;
- révocation de session ;
- changement de mot de passe ;
- activation ou échec de biométrie si un événement serveur est produit ;
- vérification téléphone via Firebase ;
- vérification e-mail ;
- vérification sociale Google ;
- vérification sociale Apple ;
- changement de canal OTP ;
- récupération de compte ;
- verrouillage par PIN et déverrouillage si un événement serveur est produit.

### B. Abonnement et paiements
- génération de lien de paiement ;
- régénération de lien ;
- envoi de rappel de paiement ;
- ouverture du lien si traçable ;
- paiement confirmé ;
- paiement échoué ;
- abonnement activé ;
- renouvellement ;
- grâce activée ;
- mode lecture seule ;
- expiration ;
- restauration d'achat ;
- changement de plan ;
- tentative de paiement in-app ;
- décision de redirection vers le web pour les cas non pris en charge dans l'app.

### C. Produits, stock, inventaire et emplacements
- création produit ;
- modification produit ;
- suppression produit ;
- duplication produit ;
- archivage produit ;
- import CSV ;
- import groupé ;
- échec d'import ;
- changement de prix ;
- consultation de l'historique de prix ;
- affectation de catégorie ;
- liaison produit/fournisseur ;
- changement de fournisseur principal ;
- entrée de stock ;
- sortie de stock ;
- ajustement manuel ;
- correction de stock ;
- mouvement de stock automatique après vente, retour ou réception ;
- lancement d'un inventaire ;
- création d'une tâche d'inventaire ;
- comptage ;
- validation d'écart ;
- clôture d'inventaire ;
- transfert d'emplacement ;
- création d'emplacement ;
- génération en lot des emplacements ;
- renommage d'emplacement ;
- suppression d'emplacement ;
- désaffectation d'un emplacement ;
- consultation d'historique stock.

### D. Catalogue fournisseur et marketplace
- création rapide produit fournisseur ;
- enregistrement en brouillon ;
- passage en prêt à publier ;
- publication ;
- archivage ;
- duplication ;
- suppression ;
- import catalogue ;
- recherche fournisseur ;
- consultation du catalogue ;
- liaison produit/fournisseur ;
- changement de fournisseur principal ;
- commande lancée depuis une suggestion ;
- tentative de liaison invalide.

### E. Ventes, commandes, CRM, comptabilité et restauration
- création de vente ;
- modification de vente si autorisée ;
- annulation de vente ;
- retour client ;
- retour fournisseur ;
- finalisation de retour ;
- génération d'avoir ;
- émission de reçu ;
- ouverture de reçu public ;
- création de commande ;
- modification de commande ;
- changement de statut de commande ;
- annulation de commande ;
- réception partielle ;
- réception complète ;
- retard de livraison ;
- création client ;
- modification client ;
- suppression client ;
- paiement client ;
- annulation de paiement ;
- consultation d'historique de dette ;
- création de facture client ;
- création d'avoir ;
- création de dépense ;
- modification de dépense ;
- suppression de dépense ;
- pic de dépenses détecté ;
- export comptable ;
- export produit ;
- export rapport ;
- export des ventes ;
- export des mouvements de stock ;
- consultation d'historique comptable.

### F. Restaurant et opérations de service
- création de table ;
- modification de table ;
- suppression de table ;
- création de réservation ;
- modification de réservation ;
- annulation de réservation ;
- changement de statut de réservation ;
- ouverture de service POS restaurant ;
- fermeture de service ;
- transfert de commande ou de table si applicable.

### G. Administration et communication
- action admin sur abonnement ;
- envoi de diffusion ;
- envoi d'e-mail ;
- envoi de notification push ;
- action de support ;
- suspension ou réactivation d'un compte ;
- suppression d'un compte ;
- action IA déclenchée par l'admin si elle produit une conséquence métier ;
- changement de paramètres sensibles ;
- modification des règles de rappels intelligents.

## 6) Actions utiles à exposer depuis l'historique

L'historique ne doit pas être une simple liste. Toute ligne utile doit permettre une action immédiate selon le contexte.

### Actions de navigation
- ouvrir la ressource concernée ;
- ouvrir la boutique concernée ;
- ouvrir le compte utilisateur ;
- ouvrir la commande, la vente, le produit, le client, le fournisseur ou l'abonnement lié ;
- ouvrir l'écran des emplacements ;
- ouvrir la fiche d'un produit incomplet.

### Actions de support ou d'investigation
- filtrer tous les événements liés au même `request_id` ;
- filtrer tous les événements de la même session ;
- afficher les événements du même utilisateur ;
- afficher les événements du même compte ;
- afficher les événements de la même boutique ;
- copier l'identifiant technique utile au support.

### Actions métier
- régénérer un lien de paiement ;
- renvoyer un rappel ;
- relancer un client ;
- ouvrir la vente concernée ;
- ouvrir le retour concerné ;
- ouvrir l'inventaire ou la tâche de comptage liée ;
- ouvrir l'écriture ou la dépense concernée ;
- ouvrir un produit concerné par une alerte ;
- ouvrir une commande à traiter ;
- ouvrir une fiche fournisseur ;
- ouvrir le client concerné ;
- ouvrir la facture ou l'avoir lié ;
- ouvrir la table ou la réservation concernée.

### Actions de sécurité
- révoquer une session ;
- forcer une déconnexion ;
- suspendre temporairement un compte ;
- ouvrir la fiche utilisateur concernée ;
- basculer vers une vue ciblée des échecs de connexion.

## 7) Gouvernance d'accès

### Qui voit l'historique système

- `Superadmin`
  - voit l'historique global plateforme ;
  - voit les événements de sécurité, de vérification, d'abonnement, d'administration et de communication ;
  - peut investiguer en transverse.

- `Admin d'organisation`
  - voit l'historique système du compte ;
  - voit l'historique multi-boutiques du compte ;
  - voit les événements utiles au pilotage, au support et à l'exploitation.

- `Responsable facturation`
  - ne voit pas automatiquement tout l'historique système ;
  - voit surtout l'historique lié à l'abonnement, à la facturation et aux paiements si une vue dédiée lui est exposée.

- `Employé / manager de module`
  - ne voit pas l'historique système global ;
  - voit uniquement les historiques métier liés à ses modules autorisés, par exemple stock, ventes, commandes ou CRM.

- `Support interne`
  - accès à définir explicitement selon le futur périmètre support ;
  - ne doit pas hériter par défaut de l'historique global sans cadre clair.

### Qui voit les paramètres

- `Utilisateur authentifié`
  - voit ses préférences personnelles ;
  - ne doit pas voir les paramètres d'organisation, de boutique ou de facturation sans autorisation.

- `Admin d'organisation`
  - voit les paramètres d'organisation ;
  - voit les paramètres de boutique ;
  - voit les réglages opérationnels partagés.

- `Responsable facturation`
  - voit les paramètres de facturation ;
  - ne doit pas voir automatiquement tous les autres paramètres sensibles.

- `Superadmin`
  - voit l'ensemble.

### Qui peut modifier les paramètres

- `Utilisateur authentifié`
  - peut modifier uniquement ses préférences personnelles.

- `Admin d'organisation`
  - peut modifier les paramètres d'organisation et de boutique ;
  - peut gérer les modules partagés, les contacts de notification et les règles opérationnelles.

- `Responsable facturation`
  - peut modifier les paramètres de facturation ;
  - ne modifie pas les réglages d'organisation hors facturation sauf rôle supplémentaire.

- `Superadmin`
  - peut tout modifier.

### Qui attribue les autorisations

- `Superadmin`
  - attribue les rôles et accès plateforme ;
  - intervient pour l'administration globale, le support avancé et les cas exceptionnels.

- `Admin d'organisation`
  - attribue les accès de compte ;
  - crée les employés ;
  - attribue les permissions par module ;
  - attribue l'accès à une ou plusieurs boutiques ;
  - peut donner les rôles `org_admin` et `billing_admin` dans le compte si le produit le permet.

- `Manager délégué`
  - peut gérer une partie de l'équipe uniquement si un `Admin d'organisation` lui a donné `staff:write` ;
  - ne peut pas attribuer de rôles de compte ;
  - ne peut pas créer, modifier ou supprimer un autre manager délégué ;
  - ne peut agir que dans le périmètre des boutiques qui lui sont attribuées.

- `Responsable facturation`
  - gère la facturation et les actions de paiement selon le périmètre autorisé ;
  - ne distribue pas les permissions métier générales sauf s'il a aussi un rôle d'organisation.

- `Employé standard`
  - ne distribue aucun droit.

### Règles d'attribution

- un utilisateur ne doit jamais pouvoir attribuer un droit qu'il ne possède pas au bon niveau ;
- un rôle de compte ne doit être attribué que par un `Admin d'organisation` ou un `Superadmin` ;
- les permissions module et boutique sont attribuées par l'organisation, pas par les employés standard ;
- le retrait d'un droit sensible doit être traçable dans l'historique système ;
- toute modification de rôle, de permissions ou de périmètre boutique doit produire un événement d'audit.

### Règle produit cible

- lecture et écriture doivent suivre le principe du moindre privilège ;
- un utilisateur ne doit pas voir un paramètre qu'il n'est pas censé administrer ;
- l'historique système doit être traité comme une surface sensible, au même niveau que les réglages critiques.

## 8) Présentation UI cible

## Vue liste

### Filtres indispensables
- période ;
- module ;
- type d'action ;
- compte ;
- boutique ;
- utilisateur ;
- statut ;
- source : web, mobile, admin, système ;
- provider ;
- ressource ;
- niveau de gravité.

### Filtres avancés à prévoir
- rôle de l'acteur ;
- type d'événement : métier, sécurité, système, communication, facturation ;
- plan du compte ;
- devise ;
- pays ;
- type de boutique ;
- canal de vérification : téléphone, e-mail, Google, Apple ;
- type de paiement : Stripe, Flutterwave, App Store, Play Store ;
- présence d'erreur ;
- événement ayant généré une action corrective disponible ;
- événement avec avant/après ;
- événement lié à un import ;
- événement lié à une automatisation ;
- événement lié à une campagne ou à une diffusion.

### Recherche texte utile
- nom utilisateur ;
- e-mail utilisateur ;
- nom boutique ;
- identifiant ressource ;
- résumé ;
- raison ;
- référence de vente ;
- référence de commande ;
- numéro de facture ;
- nom client ;
- nom fournisseur ;
- nom produit ;
- SKU ou code-barres ;
- identifiant de paiement ;
- `request_id` ;
- `session_id`.

### Recherche rapide par jetons
- `event:login_failed`
- `module:billing`
- `status:failed`
- `provider:apple`
- `store:<id>`
- `user:<id>`
- `resource:product`

### Colonnes ou cartes minimales
- date et heure ;
- résumé lisible ;
- acteur ;
- boutique ;
- module ;
- statut ;
- ressource ;
- actions rapides.

## Vue détail

Chaque événement doit afficher :
- un résumé métier lisible ;
- le détail technique repliable ;
- les métadonnées utiles ;
- le contexte de session ou de requête si disponible ;
- l'avant/après pour les modifications ;
- les liens rapides vers les écrans utiles ;
- les actions correctives possibles.

## Vues prêtes à l'emploi

Prévoir des raccourcis de consultation :
- erreurs de connexion ;
- connexions réussies ;
- activité abonnement ;
- paiements et rappels ;
- ventes annulées ;
- retours et avoirs ;
- inventaires et écarts de stock ;
- imports et corrections catalogue ;
- modifications de catalogue ;
- mouvements de stock ;
- dépenses et anomalies comptables ;
- commandes en retard ou non reçues ;
- activité restaurant et réservations ;
- actions admin sensibles ;
- incidents récents ;
- opérations fournisseur ;
- imports groupés ;
- anomalies de publication catalogue ;
- changements de rôles et permissions ;
- exportations sensibles ;
- événements d'une même session ;
- événements d'une même requête.

## 9) Ce qui est déjà partiellement couvert dans le projet

Les éléments ci-dessous existent déjà ou sont déjà amorcés dans le code :
- `security_events` pour certains événements de sécurité ;
- `verification_events` pour les flux de vérification ;
- `subscription_events` pour une partie des événements d'abonnement et paiements ;
- des événements de génération et d'envoi de rappels de paiement ;
- des données abonnement exploitables côté admin web et mobile ;
- un historique de prix produit ;
- des historiques comptables, de ventes et de stocks séparés ;
- des rappels intelligents ;
- la gestion des emplacements avec transferts ;
- un workflow de publication du catalogue fournisseur ;
- des actions admin sur les abonnements.

## 10) Trous de traçabilité prioritaires à fermer

### Priorité 0
- centraliser les événements auth, sécurité, abonnement et paiements dans une lecture commune ;
- tracer systématiquement les connexions réussies ;
- tracer systématiquement les connexions sociales Apple et Google, avec succès, échec et annulation ;
- tracer les déconnexions, expirations et révocations de session ;
- tracer les actions admin sensibles avec cible, acteur et résultat ;
- tracer chaque changement de plan et chaque changement d'état d'abonnement ;
- corriger l'incohérence `payment_confirmed` placé dans `security_events` ;
- tracer les imports CSV et imports groupés avec nombre de lignes, succès, échecs et erreurs ;
- tracer les actions de publication du catalogue fournisseur.

### Priorité 1
- tracer toutes les liaisons produit/fournisseur ;
- tracer les transferts d'emplacements et les suppressions d'emplacements ;
- tracer les exports de données sensibles ;
- tracer les actions de communication admin ;
- tracer les restaurations d'achats et les tentatives in-app ;
- unifier le helper d'écriture sécurité avec le même niveau de robustesse que les helpers de vérification et d'abonnement.

### Priorité 2
- ajouter des scores de couverture de traçabilité par module ;
- corréler les rappels intelligents avec les actions réellement faites ensuite ;
- distinguer clairement événement métier, événement système et événement sécurité ;
- enrichir la recherche transverse par session, requête et ressource.

## 11) Détection des trous et contrôle qualité

### Audit de couverture
- lister les endpoints critiques ;
- lister les actions UI majeures ;
- vérifier pour chacune la présence d'un événement ;
- mesurer la couverture par module ;
- identifier les événements sans ressource exploitable ;
- identifier les événements sans action utile possible.

### Tooling concret à prévoir
- un script Python ou Node qui liste les endpoints sensibles ;
- une détection des routes qui modifient des données sans appel à `log_*` ;
- une détection des écritures directes `insert_one` qui contournent les helpers standard ;
- un rapport de couverture par module ;
- un rapport des événements sans `resource_id`, sans `actor_user_id` ou sans `status`.

### Contrôle qualité
- schéma JSON validé pour les événements ;
- normalisation des noms de modules et actions ;
- tests automatiques sur les endpoints critiques ;
- échec CI si un endpoint sensible ne produit aucun log attendu ;
- échantillonnage de lecture réelle depuis l'UI pour vérifier la lisibilité.

## 12) Matrice par module

Légende des statuts :
- `Existant` : déjà présent de manière exploitable dans le code ou l'UI.
- `Partiel` : présent mais incomplet, fragmenté ou non centralisé.
- `Manquant` : non trouvé ou pas encore exploitable comme vrai audit.

### Authentification et sécurité
- Connexion : succès, échec, verrouillage, déconnexion, expiration, révocation de session.
- Vérification : OTP téléphone, OTP e-mail, changement de canal, succès, échec, expiration.
- Connexions sociales : Google, Apple, succès, échec, annulation utilisateur.
- Protection locale : biométrie, PIN, verrouillage, déverrouillage, échec.
- Récupération : mot de passe oublié, récupération de compte, intervention admin si prévue.

Statut actuel :
- Connexion échouée, changement de mot de passe, vérification téléphone : `Partiel`
- Connexion réussie : `Manquant`
- Déconnexion, expiration, révocation de session : `Manquant`
- OTP téléphone / e-mail et vérifications : `Existant`
- Connexions sociales Google / Apple : `Partiel`
- Biométrie / PIN côté backend : `Manquant`
- Récupération de compte transverse : `Manquant`

### Abonnement et paiements
- Cycle d'abonnement : activation, renouvellement, expiration, annulation, grâce, lecture seule.
- Paiements : lien généré, lien régénéré, rappel envoyé, paiement confirmé, paiement échoué, paiement annulé.
- In-app : tentative d'achat, restauration d'achat, redirection web si nécessaire.
- Admin : rappel manuel, action sur compte, changement de plan, correction d'état.

Statut actuel :
- Événements abonnement via `subscription_events` : `Existant`
- Liens de paiement et rappels : `Existant`
- Paiement confirmé dans la bonne famille d'événements : `Partiel`
- Restaurations d'achat et tentatives in-app : `Partiel`
- Vue d'audit unifiée finance + abonnement : `Partiel`

### Produits, stock, inventaire et emplacements
- Produits : création, édition, suppression, duplication, archivage, changement de prix.
- Imports : CSV, groupés, erreurs, résumé d'import.
- Stock : entrées, sorties, corrections, mouvements automatiques.
- Inventaire : lancement, comptage, écarts, clôture.
- Emplacements : création, génération en lot, renommage, transfert, suppression.

Statut actuel :
- Mouvements de stock : `Existant`
- Historique de prix : `Existant`
- Inventaire : `Partiel`
- Imports : `Partiel`
- Emplacements et transferts : `Partiel`
- Vue d'audit consolidée stock : `Partiel`

### Catalogue fournisseur et marketplace
- Brouillon, prêt à publier, publié, archivé.
- Duplication, import, suppression, recherche.
- Liaisons produit/fournisseur et fournisseur principal.
- Tentatives de liaison invalide.

Statut actuel :
- Workflow fournisseur : `Partiel`
- Publication catalogue : `Partiel`
- Imports catalogue : `Partiel`
- Liaisons produit/fournisseur : `Partiel`
- Recherche audit fournisseur : `Manquant`

### Ventes, commandes, CRM, comptabilité et restauration
- Vente, annulation, retour, avoir, reçu.
- Commande, réception, retard, annulation.
- Client, dette, paiement, facture.
- Dépense, pic de dépense, export, anomalie.
- Réservation, service, transfert si applicable.

Statut actuel :
- Ventes et stock associés : `Partiel`
- Comptabilité et dépenses : `Partiel`
- CRM et paiements client : `Partiel`
- Retours et avoirs : `Partiel`
- Vue d'audit transverse ventes + comptabilité : `Manquant`

### Administration et communication
- Rappels manuels, liens de paiement, actions support.
- Diffusions, e-mails, push.
- Changements de rôles, permissions et périmètres.
- Suspension, réactivation, suppression de compte.

Statut actuel :
- Actions admin abonnement : `Partiel`
- Communication admin : `Partiel`
- Changement de rôles et permissions : `Partiel`
- Audit de support : `Manquant`

## 13) Rétention, volumétrie et archivage

### Politique cible
- événements critiques de sécurité : conservation plus longue ;
- événements métier opérationnels : conservation standard ;
- événements très volumineux ou peu utiles en lecture courante : archivage froid.

### Décisions à formaliser
- durée de conservation par famille d'événements ;
- index TTL MongoDB si adapté ;
- stratégie d'archivage froid si nécessaire ;
- export d'archive si exigence légale ou support.

### Volumétrie à estimer
- nombre moyen d'événements par utilisateur et par jour ;
- nombre moyen d'événements par compte et par mois ;
- modules les plus bavards ;
- taille moyenne d'un événement avec et sans snapshots ;
- coût de stockage avec la croissance cible.

## 14) Stratégie de migration et d'unification

Le document ne doit pas présumer qu'une fusion physique des collections est obligatoire.

Trois options réalistes :
- garder plusieurs collections métier et construire une vue d'audit unifiée ;
- garder plusieurs collections mais normaliser strictement leur schéma ;
- migrer à terme vers une collection d'audit unique si la volumétrie et les usages le justifient.

### Décisions à prendre
- conserver `security_events`, `verification_events`, `subscription_events` avec schéma harmonisé ;
- ou introduire une collection `audit_events` commune ;
- ou créer une couche d'agrégation serveur/UI sans migration immédiate.

### Migration minimale recommandée
- harmoniser les helpers de log ;
- corriger les événements mal classés ;
- normaliser `module`, `action`, `status`, `resource_type` ;
- exposer une vue agrégée avant toute migration lourde.

## 15) Plan d'implémentation

### Phase 1
- normaliser les helpers de log ;
- tracer les connexions réussies, déconnexions, expirations et révocations ;
- corriger les incohérences de collections ;
- poser la vue agrégée d'audit.

### Phase 2
- couvrir imports, publications, liaisons produit/fournisseur, exports sensibles et actions admin ;
- ajouter les actions rapides depuis l'UI ;
- ajouter les vues prêtes à l'emploi.

### Phase 3
- ajouter les contrôles automatiques de couverture ;
- mesurer la volumétrie ;
- finaliser la politique de rétention ;
- décider d'une unification physique ou logique.

## 16) Critères d'acceptation

- un admin d'organisation peut retrouver rapidement une action métier importante ;
- un superadmin peut investiguer un incident transverse sans changer de collection manuellement ;
- les événements critiques ont tous un acteur, un statut, une ressource et un horodatage ;
- les actions sensibles sont correctement classées et consultables ;
- la recherche permet de retrouver un événement par utilisateur, boutique, ressource, paiement ou session ;
- les filtres permettent d'isoler rapidement les incidents d'un module ;
- les événements affichés sont lisibles, actionnables et conformes au principe du moindre privilège.
