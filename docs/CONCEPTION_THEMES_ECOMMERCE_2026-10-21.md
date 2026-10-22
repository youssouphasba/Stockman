# Conception : moteur commun de thèmes e-commerce

Date : 21 octobre 2026. Statut : proposition à valider, sans code d'application ni changement de données.

Correction de conception du 22 octobre 2026 : la matrice d'accès web Starter/Pro/Enterprise ci-dessous reprend la décision produit validée. Les autres choix de conception non contradictoires restent inchangés ; aucun code ni prix n'est modifié.

Lire d'abord l'[audit du socle et le rapport REA](AUDIT_REA_THEMES_ECOMMERCE_2026-10-21.md). Les noms techniques ci-dessous sont proposés ; ils n'existent pas encore sous cette forme dans Stockman.

## 1. Principes

- Un moteur React/Next.js commun pour tous les sites publics, sans branchement de rendu selon l'abonnement.
- L'abonnement ouvre des opérations d'édition, pas la visibilité d'un site publié. Conserver le mécanisme d'activation/désactivation volontaire existant.
- Starter et Pro : consultation du back-office web conservée sur `app.stockman.pro`, sans modification web ; création de site, cinq modèles initiaux, personnalisation guidée et prévisualisation depuis l'application mobile.
- Enterprise : consultation et gestion du back-office web selon les permissions ; édition mobile guidée conservée et éditeur visuel de thèmes web complet dans Paramètres > Boutique en ligne.
- E-com reste l'espace de commandes et d'opérations commerciales. Aucun modèle, formulaire de thème ou message d'activation n'y est ajouté.
- Ni le thème ni ses blocs ne définissent les prix, les calculs de stock, les paiements, les statuts de commande ou les règles Denkma.
- Aucun HTML/CSS/JavaScript arbitraire importé par le commerçant. Personnalisation complète signifie édition des sections, blocs et pages autorisés, pas exécution libre de code.

## 2. Architecture cible

### Périmètres et accès

| Espace | Nature et emplacement | Règles |
| --- | --- | --- |
| Back-office Stockman | Outil de gestion de l'entreprise, `app.stockman.pro` | Starter et Pro consultent les écrans et données autorisés sans pouvoir les modifier sur le web. Enterprise dispose de la gestion web complète dans la limite des permissions du rôle, du compte et de la souscription. |
| Site e-commerce public | Site marchand accessible aux clients via l'URL de boutique ou son domaine | Starter, Pro et Enterprise disposent du même moteur public. Les clients consultent les produits et passent commande selon les règles commerciales existantes ; aucune condition Enterprise n'est ajoutée au rendu ou au passage de commande. |
| Personnalisation du site | Paramètres > Boutique en ligne, dans l'application mobile ou le back-office | Édition guidée sur mobile pour Starter, Pro et Enterprise ; éditeur de thèmes web complet pour Enterprise uniquement. Starter/Pro peuvent consulter les paramètres autorisés sur le web, sans sauvegarder ni publier de modification depuis ce canal. |

La gestion e-commerce reste une fonctionnalité métier dans Stockman : commandes en ligne, traitement, livraisons et statistiques. E-com n'est ni le site marchand public ni l'éditeur du site ; sa séparation avec Paramètres > Boutique en ligne est conservée. Les restrictions d'écriture du back-office concernent les actions du gestionnaire sur le web, pas celles des clients de sa boutique publique.

### Chaîne de personnalisation et de rendu

Le schéma suivant représente les canaux d'édition, pas l'ensemble des accès au back-office : la consultation web Starter/Pro reste disponible en dehors de l'éditeur Enterprise.

```text
Application mobile                        Back-office web Enterprise
Paramètres > Boutique en ligne             Paramètres > Boutique en ligne
Galerie + formulaires guidés               Éditeur visuel
                  |                       |
                  +--- API de présentation commune ---+
                          Authentification / compte
                          Capacités / état d'abonnement
                          Validation schéma + différences
                          Révisions / médias / publication
                                      |
                          Révision publique immuable
                                      |
Slug ou domaine -> résolution du site -> moteur React/Next.js
                                      |
          Registres de sections et blocs + tokens de styles
                                      |
          Catalogue / panier / commande / contact existants
```

### Responsabilités proposées

| Élément | Responsabilité |
| --- | --- |
| Registre de modèles | Identifiant stable, version, compatibilité de schéma, prévisualisations de structure, variantes et points d'édition guidée |
| Registre de sections | Composant React de confiance, schéma des réglages, blocs acceptés, variantes responsive et propriétés obligatoires |
| Registre de blocs | Texte structuré, image, lien interne, bouton, coordonnée ou information de service ; aucune fonction métier autonome |
| Styles globaux | Palette sémantique, contraste calculé, polices prédéfinies, espacements et densité ; pas de couleurs injectées partout dans les composants |
| Modèles par page | Accueil, catalogue, contact ; adaptation du détail produit et du panier existants avant une éventuelle route dédiée |
| Pages personnalisées | Identifiant et chemin propres au site, titre, métadonnées et sections ; création/suppression/structure réservées à Enterprise |
| Adaptateur catalogue | Références aux produits/catégories réels autorisés pour la boutique liée, jamais copie des stocks ou prix dans le thème |
| Services commerciaux | État du panier, validation des commandes, contact et événements ; indépendants du rendu d'une section |
| Rendu public | Lecture de la seule révision publiée, résolution des ressources et rendu SSR des informations indexables ; composants clients pour les interactions |
| Prévisualisation | Même moteur et mêmes données de catalogue autorisées, mais révision non publiée privée et effets métier désactivés |

Prévoir un petit paquet partagé de contrats et de validateurs utilisables par les deux éditeurs et le site public ; ne pas imposer un remaniement global du monorepo. Le serveur Python reste l'autorité et valide aussi le document ; les types TypeScript ne suffisent pas.

### Réutilisation progressive du socle

Extraire les services d'interaction du `StorefrontClient` sans réécrire le processus de commande. Conserver les comportements existants dans un adaptateur `legacy-v1`, puis rendre les nouvelles sections autour des mêmes services. Le panier et son état ne doivent pas être démontés lors d'une sélection de bloc ou d'une modification de couleurs dans l'aperçu.

Un rendu inconnu doit produire un diagnostic et un repli contrôlé, pas une page blanche. Une version publiée ne doit pas être remplacée automatiquement par le modèle par défaut à cause d'une panne temporaire.

## 3. Modèles initiaux

Les cinq modèles sont disponibles aux trois abonnements. Ils partagent les composants, mais proposent des compositions et variantes réellement différentes. Aucun catalogue supplémentaire, nombre de pages ou quota Pro n'est inventé.

| Modèle | Composition initiale proposée | Contraintes métier |
| --- | --- | --- |
| Mode et accessoires | Bannière photographique, catégories visuelles, grille de photos portrait, contact | Ne pas inventer la gestion des tailles, couleurs ou variantes produit absente des contrats actuels |
| Beauté et cosmétiques | Identité visuelle, image avec texte, catégories, produits et coordonnées | Aucun avis, résultat clinique ou label de confiance fabriqué |
| Alimentation | Catégories immédiatement visibles, grille dense, nom, unité et disponibilité bien lisibles | Préserver les quantités décimales et unités ; ne pas changer les incréments de vente dans ce chantier |
| Électronique | Recherche visible, catégories et présentation produit plus informative | N'afficher les caractéristiques que si une donnée réelle existe ; ne pas ajouter un comparateur fictif |
| Boutique généraliste | Navigation sobre, catalogue et filtres prioritaires, informations de service et contact | Bon comportement sans bannière ou avec un catalogue peu illustré |

Les aperçus utilisent les vrais médias et produits du commerçant lorsqu'ils existent. En leur absence, montrer des cadres structurels explicitement vides, pas de faux produits ni de fausses ventes. Les visuels fournis avec un modèle devront avoir des droits d'usage vérifiés.

## 4. Schéma de données proposé

### Objets et séparation des responsabilités

| Objet | Données proposées | Règle |
| --- | --- | --- |
| Site existant | `account_id`, slug, boutique liée, domaine et activation | Garder les identifiants et URL ; le thème ne devient pas propriétaire du catalogue |
| État de présentation | `site_id`, `published_revision_id`, `draft_head_revision_id`, `lock_version`, `renderer_mode` | Pointeurs mis à jour par comparaison de version ; compte vérifié côté serveur |
| Révision | Identifiant, parent, auteur, date, raison, empreinte, document complet validé, compatibilité du moteur | Immuable après création ; historique technique conservé pour la sécurité de tous les plans |
| Définition du modèle | `model_id`, `model_version`, schéma, variantes et points guidés autorisés | Registre contrôlé par Stockman, pas JSON arbitraire fourni par le client |
| Document de thème | Version de schéma, modèle, styles globaux, pages, sections, blocs et références de médias | Aucune autorisation, clé secrète, donnée client ou définition de prix |
| Média | Identifiant, compte propriétaire, type, dimensions, variantes, transparence, texte alternatif, état de validation | Vérification de propriété avant rattachement ; ne pas supprimer un média encore référencé |
| Session d'aperçu | Compte, site, révision exacte, portée de lecture seule, expiration et révocation | Ni session d'administration ni publication publique |

Proposition : index unique de l'état par site et du couple site/révision, avec accès aux révisions toujours filtré par compte. Le site reste à la granularité actuelle du compte/boutique liée ; ce chantier ne crée pas plusieurs sites par compte.

### Contrat formel du document

Ce JSON décrit un schéma de conception, pas une boutique fictive ni un fichier exécutable installé dans le projet. Les schémas détaillés de chaque type de section/bloc restent à spécifier avant implémentation.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:stockman:ecommerce:theme-document:1",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "model_id", "model_version", "global_settings", "pages"],
  "properties": {
    "schema_version": { "const": 1 },
    "model_id": { "type": "string", "minLength": 1 },
    "model_version": { "type": "string", "minLength": 1 },
    "global_settings": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "palette_id": { "type": "string" },
        "brand_color": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "font_pair_id": { "type": "string" },
        "density_id": { "type": "string" },
        "logo_asset_id": { "type": ["string", "null"] }
      }
    },
    "pages": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/page" }
    }
  },
  "$defs": {
    "page": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "kind", "sections"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "kind": { "enum": ["home", "catalog", "contact", "custom"] },
        "path": { "type": "string" },
        "title": { "type": "string" },
        "sections": { "type": "array", "items": { "$ref": "#/$defs/section" } }
      }
    },
    "section": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type", "type_version", "settings", "blocks"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "minLength": 1 },
        "type_version": { "type": "integer", "minimum": 1 },
        "settings": { "type": "object" },
        "blocks": { "type": "array", "items": { "$ref": "#/$defs/block" } }
      }
    },
    "block": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "type", "type_version", "settings"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "minLength": 1 },
        "type_version": { "type": "integer", "minimum": 1 },
        "settings": { "type": "object" }
      }
    }
  }
}
```

L'ordre des tableaux est l'ordre de rendu. Les identifiants de pages, sections et blocs restent stables lors d'un déplacement. Le validateur serveur impose leur unicité, les chemins de page uniques et l'appartenance au registre ; `type` et `settings` ne sont donc jamais acceptés sur la seule base du schéma générique ci-dessus.

Pour chaque type, définir un schéma strict des réglages, les blocs enfants admis, les variantes responsive, les longueurs de texte et les références autorisées. Un bloc de produits référence des identifiants ou une sélection de catégorie réelle ; il ne contient ni stock ni prix modifiables. Réserver les chemins applicatifs existants et empêcher collisions avec `/api`, `/shop`, l'authentification et les pages système.

Les bornes de poids, profondeur et complexité sont des protections techniques à fixer par mesure, indépendantes d'un quota commercial. Les propriétés de permissions et d'éditabilité ne sont jamais lues depuis le JSON client comme autorité.

## 5. Droits et validation serveur

### Matrice cible

Pour le back-office et la personnalisation, les droits restent soumis au rôle opérationnel, à l'accès au compte/boutique et, pour les mutations, à l'état d'écriture autorisé de la souscription. La lecture seule ne donne aucun droit sur les données d'un autre compte ni sur un module non autorisé. Le site public suit ses propres règles d'activation et de commande, sans hériter des restrictions d'édition du back-office.

| Opération | Starter | Pro | Enterprise |
| --- | --- | --- | --- |
| Site public web, catalogue et commandes clients | Oui | Oui | Oui |
| Création/activation du site depuis le mobile | Oui | Oui | Oui |
| Cinq modèles initiaux | Oui | Oui | Oui |
| Textes, logo, images, couleurs, polices proposées et variantes guidées | Mobile | Mobile | Mobile et web |
| Prévisualisation de ses changements avant publication | Depuis le mobile | Depuis le mobile | Mobile et web |
| Publication des seules modifications guidées autorisées | Mobile | Mobile | Mobile et web |
| Consultation du back-office web Stockman et des données autorisées | Oui, lecture seule | Oui, lecture seule | Oui, selon permissions |
| Modifications métier depuis le back-office web Stockman | Non | Non | Oui, selon permissions et état de souscription |
| Consultation web d'E-com : commandes en ligne, livraisons et statistiques autorisées | Oui, lecture seule | Oui, lecture seule | Oui, selon permissions |
| Traitement des commandes et autres modifications depuis E-com web | Non | Non | Oui, selon permissions et état de souscription |
| Consultation des paramètres autorisés dans Paramètres > Boutique en ligne sur le web | Oui, lecture seule | Oui, lecture seule | Oui, selon permissions |
| Éditeur de thèmes web complet, sauvegarde et publication web | Non | Non | Oui, selon permissions et état de souscription |
| Ajout/suppression/déplacement libres des sections | Non | Non | Éditeur web |
| Édition structurelle des blocs et pages personnalisées | Non | Non | Éditeur web |
| Aperçu responsive avec sélection directe | Pas d'éditeur visuel | Pas d'éditeur visuel | Éditeur web |
| Gestion explicite des brouillons et historique restaurable | Pas d'interface avancée | Pas d'interface avancée | Oui |
| Conservation des versions pour reprise technique | Oui, interne | Oui, interne | Oui, et interface de gestion |
| Rendu d'un thème Enterprise déjà publié après downgrade | Conservé | Conservé | Conservé |
| Nouveaux modèles/options Pro | Aucun droit supplémentaire décidé ici | Évolution future possible, sans quotas inventés | Selon catalogue futur validé |

L'édition mobile Enterprise conserve au minimum les possibilités guidées et l'accès aux réglages existants ; l'édition structurelle complète est prévue sur le web. Un constructeur visuel mobile complet serait une décision distincte, pas une fonctionnalité implicitement promise.

### Découverte du back-office et passage à Enterprise

- Conserver les pages et parcours de consultation existants pour Starter et Pro : navigation, recherche et filtres de lecture autorisés ne sont pas bloqués par une invitation commerciale.
- Présenter une indication discrète de lecture seule et proposer « Découvrir Enterprise » lorsqu'une modification web est souhaitée. Expliquer alors l'intérêt de la gestion sur ordinateur et de l'éditeur de thèmes web complet, sans ajouter de prix ni de fonctionnalité non décidée.
- Les contrôles d'écriture peuvent être désactivés ou remplacés par une invitation contextuelle ; ne pas rendre tout l'écran inaccessible et ne pas imposer de fenêtre bloquante à chaque navigation.
- Ne pas utiliser cette découverte pour montrer des données, modules ou boutiques interdits au rôle courant. Un abonnement Enterprise ne remplace pas les permissions métier.
- Dans les paramètres du site, distinguer « Personnaliser depuis l'application mobile » pour le parcours guidé et la proposition d'éditeur web Enterprise. Aucun message de restriction du back-office ne doit annoncer que la boutique publique ne peut pas recevoir de commandes.

### Politique commune

1. Authentifier l'acteur et résoudre le compte depuis la session serveur, jamais depuis un `account_id` arbitraire du corps de requête.
2. Vérifier le rôle opérationnel existant et les droits de boutique. Ne pas assimiler l'administrateur de facturation à un éditeur du site.
3. Lire le plan souscrit du compte et l'état de souscription séparément. Un Enterprise temporairement restreint ne doit pas perdre ses documents ; ses écritures restent soumises aux gardes de paiement existants.
4. Distinguer côté serveur l'espace et l'opération : lecture du back-office, mutation du back-office, édition mobile guidée, édition web du thème ou opération publique de boutique. Calculer les capacités d'édition guidée, de structure, de pages, de publication et de restauration dans ce contexte. Starter/Pro conservent la lecture web autorisée, mais aucune capacité d'écriture du back-office web. La réponse peut renseigner l'UI, mais chaque mutation recalcule la décision.
5. Valider le schéma, les références de médias/catalogue et la différence avec la révision de référence. Refuser tout changement de champ ou de structure non autorisé, même soumis par un autre client.
6. Répéter ces vérifications à la publication et à la restauration, ainsi que pour les autres mutations web, dont les réglages de site, le domaine et le traitement des commandes. Préserver les restrictions existantes et vérifier la portée depuis le contexte serveur ; un bouton caché, une police désactivée ou l'en-tête client `X-Stockman-Surface` ne constitue pas une sécurité de capacité ni un moyen de contourner le refus Starter/Pro.
7. Ne pas faire dépendre le rendu public du plan actuel. Le payload public n'expose ni brouillon ni capacités d'administration. Les API publiques de catalogue, de panier, de commande et de contact conservent leurs validations et ne requièrent pas Enterprise au motif que le marchand ne peut pas modifier son back-office web.

L'évaluation doit porter sur la capacité et la ressource, pas sur le seul verbe HTTP : une lecture utilisant POST reste une lecture si son contrat existant le définit ainsi ; une écriture métier ne devient pas permise en changeant de route ou d'en-tête. Les opérations techniques de connexion et de session nécessaires à la consultation restent régies par les protections existantes. Un endpoint public de commande ne doit jamais servir de passerelle vers une mutation de gestion privée.

Pour Starter/Pro, les points d'édition guidée sont définis par le registre du modèle : contenu d'une bannière existante, image, couleur, police autorisée ou variante reconnue. Ils ne permettent pas de modifier librement l'ordre, les types ou le nombre de sections. Changer de modèle est une opération dédiée qui instancie une structure approuvée côté serveur, préserve l'ancienne révision et demande confirmation.

### Downgrade sans perte

- Conserver les révisions publiées et les brouillons Enterprise ; ne supprimer ni page ni section et ne rebasculer automatiquement sur `legacy-v1`.
- Conserver la consultation web Starter/Pro et permettre depuis le mobile les changements guidés compatibles sur le thème publié existant, sans renvoyer une copie appauvrie de ses champs avancés. Le downgrade retire les capacités d'écriture web, pas l'accès en lecture aux données autorisées.
- Un brouillon Enterprise modifié avant le downgrade reste conservé, mais ne doit pas être publié par Starter/Pro s'il introduit encore des différences structurelles interdites. Comparer le candidat à la dernière révision publique de référence, pas seulement au dernier brouillon sauvegardé.
- La restauration avancée reste Enterprise. Un retour arrière technique de sécurité peut être opéré par un rôle de support autorisé et journalisé ; ce n'est pas un moyen de débloquer l'édition avancée.
- Aucun changement de prix, de quota ou de règle de paiement ne découle de cette politique.

## 6. Sauvegarde, publication et aperçu

### Parcours commun

Le client autorisé à modifier charge l'état, la révision et les capacités, conserve les valeurs masquées, puis transmet une modification ciblée accompagnée de sa version de base. Un conflit renvoie une erreur de concurrence et ne doit pas écraser silencieusement la dernière sauvegarde mobile ou web. En consultation web Starter/Pro, aucune sauvegarde automatique, publication ou autre mutation de gestion n'est déclenchée par l'ouverture d'une page.

Tous les plans ont besoin d'un état de travail non public pour l'aperçu avant publication. Starter/Pro l'utilisent à travers un parcours guidé, sans bibliothèque avancée de brouillons. Enterprise dispose d'une gestion explicite des brouillons, versions et restaurations. Il s'agit d'une différence d'interface et de capacités, pas d'une différence de moteur ou d'un quota de documents inventé.

La publication crée une révision immuable puis bascule atomiquement le pointeur public sous contrôle de `lock_version`. Une révision orpheline en cas de conflit reste non publiée. L'invalidation du cache et des métadonnées est déclenchée de façon réessayable ; conserver un événement de publication pour reprendre une invalidation interrompue. La restauration crée une nouvelle révision à partir d'une ancienne, sans réécrire l'historique.

L'activation du site, son domaine et les informations commerciales restent séparés du document visuel. Publier un thème ne doit ni activer un site désactivé ni relancer une vérification DNS. Les anciens champs de présentation sont adaptés ou synchronisés selon un protocole explicite, pas écrits concurremment par deux systèmes.

### Aperçu privé

- Créer une session d'aperçu courte et révocable, liée au compte, au site et à une révision exacte. Elle peut lire un site désactivé, sans rendre le brouillon accessible publiquement.
- Le lien ouvre uniquement le rendu d'une révision en lecture seule ; il ne donne pas de session de back-office. La consultation web authentifiée de Starter/Pro reste disponible par son accès normal, séparément de cet aperçu. Aucune session d'administration ou donnée client n'est transférée à l'aperçu.
- Désactiver les commandes, contacts, paiements et événements commerciaux uniquement dans cet aperçu privé ; ces routes ne doivent pas accepter une preuve d'aperçu comme autorisation de mutation. Le test ne repose pas seulement sur un paramètre `preview=1`. Les mêmes interactions restent opérationnelles sur le site public publié des trois abonnements, selon les règles existantes.
- Employer un périmètre/origine d'aperçu isolé à choisir avant développement, ou une route dédiée avec protections strictement ciblées. Conserver les interdictions d'iframe des autres pages. La CSP de l'aperçu autorise uniquement le parent Enterprise attendu ; pas de `frame-ancestors *`.
- Pour l'inspection visuelle, valider origine, fenêtre émettrice et schéma des messages `postMessage`. Le message de sélection transporte des identifiants de sections/blocs, jamais du JavaScript ou un chemin arbitraire à modifier.
- Prévoir liens expirés, perte de connexion, refus d'accès, `no-store`, exclusion des robots, absence de métadonnées de partage du brouillon et non-journalisation des secrets d'aperçu. Ne pas autoriser des destinations de redirection arbitraires.

### Compatibilité des anciennes applications

Garder les services et URL actuels disponibles. Après adoption du moteur, leurs écritures de présentation autorisées doivent être traduites vers les seuls champs compatibles du thème, avec conservation des autres propriétés et des révisions. Une ancienne application ne doit pas restaurer tout un formulaire ancien sur un thème récent. La distinction entre modification des coordonnées/domaines et publication de présentation doit être définie avant livraison ; pendant la transition, un adaptateur peut publier atomiquement les champs historiques autorisés afin de préserver le comportement des clients anciens, tout en bloquant les changements avancés non autorisés. Cet adaptateur ne contourne pas le refus d'écriture du back-office web Starter/Pro ; leurs lectures web et leurs modifications mobiles guidées permises sont conservées.

## 7. Médias et qualité visuelle

Introduire une bibliothèque de médias avec références stables, stockage durable et variantes dimensionnées, sans migration forcée de toutes les anciennes images. Détecter le type réel, valider décodage, taille et dimensions, supprimer les métadonnées inutiles et conserver la transparence des logos. Préserver les images historiques embarquées via l'adaptateur ; pour les nouveaux médias, préférer des URL optimisées et mises en cache. Les seuils et fournisseurs restent à décider.

Les tokens doivent distinguer fond, surface, texte, texte secondaire, action et texte sur action. Calculer le contraste réel et proposer une correction explicite des couleurs incompatibles, sans remplacer silencieusement la couleur de marque enregistrée. Les polices sont prédéfinies, embarquées ou distribuées depuis une origine maîtrisée. Les variantes responsive restent des choix du registre, pas une zone de CSS libre.

Les textes, le focus clavier, la taille des cibles, les images et les recadrages doivent être contrôlés sur petits écrans. Un changement de modèle ne doit pas produire une bannière vide, des textes superposés ou de faux contenus pour masquer l'absence de médias.

## 8. Maquettes fonctionnelles

Ces wireframes définissent les commandes et les états des éditeurs. Ce ne sont ni des captures d'une interface livrée ni des boutiques simulées.

### Éditeur mobile Starter/Pro

```text
Paramètres > Boutique en ligne

[Retour]  Boutique en ligne
Site public : activation et accès existants

Apparence                         [Aperçu]
Modèle actuel                     [Choisir un modèle]
Logo et images                    [Ouvrir]
Couleurs                          [Pastilles]
Polices                           [Liste prédéfinie]
Textes et bannière                 [Ouvrir]
Mise en page                       [Variantes autorisées]

Coordonnées / Livraison / Paiement / Domaine
Accès aux formulaires existants, distincts de l'apparence

État de sauvegarde
[Enregistrer les modifications]    [Prévisualiser]
                                   [Publier]
```

La galerie affiche les cinq familles et le modèle actuel ; sélectionner un modèle ouvre son aperçu avec les données réelles. Le choix ne modifie pas immédiatement le site publié. Un formulaire guidé ne contient pas d'arbre de sections, de glisser-déposer ou de code. Un aperçu reste consultable même si le site public est désactivé. Les six rubriques principales des Paramètres Starter ne sont pas modifiées.

À la publication : montrer les différences utiles, vérifier les médias et demander confirmation d'un changement de modèle. Pendant une sauvegarde, éviter les doubles actions. En cas d'erreur ou de réponse tardive d'un autre compte/boutique, conserver les saisies du bon contexte. Au retour arrière avec changements non enregistrés, proposer conserver ou abandonner, sans perte silencieuse.

### Éditeur visuel web Enterprise

```text
Paramètres > Boutique en ligne > Apparence

[Retour] [Page / Modèle] [Annuler] [Rétablir]
[Mobile | Tablette | Ordinateur] [Aperçu] [Enregistrer] [Publier]

Pages et sections       Aperçu du rendu commun       Propriétés
------------------      ----------------------       ----------------
Sélecteur de page       Sélection directe             Réglages du bloc
En-tête                 Contour de sélection          Texte / Média
Sections ordonnées      Catalogue réel                Variante
Blocs dépliables        Sans commande réelle          Responsive
Ajouter une section                                  Supprimer si autorisé
Déplacer par poignée
ou commandes clavier

[Réglages globaux] [Brouillons] [Historique]
État enregistré / non enregistré / conflit
```

Ajouter, supprimer et déplacer une section ne touche que le document de présentation. Le panneau de droite utilise le schéma du type sélectionné. Les commandes de déplacement clavier complètent le glisser-déposer. Les sections indispensables au parcours commercial ne peuvent pas être supprimées sans une alternative valide ; le validateur protège aussi cette contrainte côté serveur.

L'historique présente auteur, date, différences et version publiée. Restaurer ouvre un nouvel état de travail et un aperçu ; la mise en ligne exige une nouvelle publication autorisée. Une perte des droits Enterprise ferme l'édition avancée sans détruire le document. Les textes d'erreur distinguent abonnement, rôle, conflit, schéma invalide et média manquant.

## 9. Plan d'implémentation et migration

| Lot | Contenu | Critère de sortie |
| --- | --- | --- |
| 0. Décisions et contrat | Appliquer la matrice corrigée : consultation web Starter/Pro conservée, modifications web Enterprise ; préciser la séparation back-office/site public/personnalisation et conserver les autres décisions | Périmètres distincts, navigation en lecture seule et tests de refus définis |
| 1. Socle serveur | Capacités par espace et canal, schémas, révisions immuables, concurrence, garde de paiement et propriété des ressources ; préserver les restrictions web actuelles | Mutations du back-office web Starter/Pro refusées même via requête directe, sans bloquer leurs lectures web, leurs éditions mobiles guidées autorisées ni les commandes publiques |
| 2. Legacy et moteur | Envelopper le rendu actuel dans `legacy-v1`, puis extraire registres et services commerciaux sans changer leurs contrats | Parité fonctionnelle et visuelle du legacy, URL et commandes conservées |
| 3. Médias et aperçu | Chaîne logo/bannière, aperçu privé et protections iframe ciblées, effets commerciaux neutralisés | Aperçu de site désactivé fonctionnel sans fuite ni événement réel |
| 4. Galerie et mobile | Cinq modèles, choix/édition guidés Starter/Pro/Enterprise, sauvegarde et publication sûre | Les mêmes données validées produisent le même rendu publié et prévisualisé |
| 5. Éditeur Enterprise | Sections, blocs, pages personnalisées, responsive, brouillons, versions et restauration ; invitations contextuelles depuis la consultation web Starter/Pro | Contrôle des droits à chaque opération, navigation au clavier et découverte sans blocage de la lecture |
| 6. Déploiement progressif | Site pilote autorisé, activation par site, comparaison, métriques et reprise | Aucun ancien site ne change sans mécanisme de retour arrière testé |
| 7. Documentation | Guides mobile/web, centre d'aide, formation et RAG basés sur les fonctions réellement livrées | L'assistant distingue back-office en lecture seule ou modifiable, E-com métier, site public et personnalisation selon les droits |

### Migration sans perte

1. Sauvegarder les champs actuels et identifier les comptes/sites à migrer. Le dry-run initial ne modifie rien.
2. Associer les sites existants à `legacy-v1` par repli de lecture avant tout changement visuel. Ne pas renommer les slugs, domaines ou boutiques liées.
3. Générer, de façon idempotente, une révision initiale avec provenance des champs historiques. Préserver chaînes vides explicites, couleur, coordonnées, options de catalogue et médias ; comparer les valeurs effectives et leurs sources.
4. Ne pas écrire dans les collections de produits, ventes, commandes ou paiements. Conserver les API et les liens de notification/Denkma.
5. Faire coexister temporairement ancien rendu et moteur derrière une activation par site, sans double source d'autorité pour les écritures. Journaliser la révision servie et la publication, sans contenu personnel.
6. Appliquer un nouveau modèle uniquement après aperçu et validation du commerçant. Les anciennes versions et médias nécessaires restent disponibles après downgrade.
7. Tester retour à la dernière révision publiée et au moteur legacy sans restaurer la base entière. Le legacy de secours peut lire une projection compatible issue de la présentation courante ; les pages avancées restent stockées pour réactivation.
8. En cas de rollback de déploiement, conserver le stockage de thèmes, les révisions et les anciennes API adaptées. Un rollback n'est pas une suppression de données ou de thèmes.

## 10. Plan de tests et critères d'acceptation

| Domaine | Vérifications exigées avant livraison |
| --- | --- |
| Contrats | Validation identique des schémas par les clients et le serveur ; types inconnus, propriétés supplémentaires, doublons, routes réservées et documents surdimensionnés refusés |
| Autorisations | Trois plans, propriétaire, personnel autorisé/non autorisé, administrateur de facturation et superadmin ; vérification croisée des comptes/boutiques |
| Consultation du back-office | Sur `app.stockman.pro`, Starter/Pro naviguent, recherchent et filtrent les données autorisées sans mutation automatique ; Enterprise conserve ses accès selon permissions ; aucun accès supplémentaire à un autre compte ou module |
| Mutations web | Starter/Pro ne peuvent ni enregistrer les réglages du site, ni publier un thème, ni traiter une commande depuis le back-office web ; refus serveur même si l'UI est contournée ; Enterprise reste soumis aux permissions et restrictions de souscription |
| Contournement | Requêtes directes sans en-tête de surface ou avec une fausse surface mobile, fausse capacité client, remplacement intégral du document, import avancé et restauration d'une version interdite ; aucun endpoint public ne contourne les autorisations privées |
| Découverte Enterprise | Invitations contextuelles sans blocage de navigation ni exposition de données supplémentaires ; aucun prix modifié ; accès à l'édition mobile guidée correctement distingué |
| Souscriptions | Plan souscrit différent du plan effectif, expiration, grâce, lecture seule, upgrade/downgrade pendant l'édition ou avant publication |
| Downgrade | Thème et pages Enterprise toujours rendus et commandes publiques opérationnelles ; consultation web conservée ; écritures web interdites ; champs guidés modifiables depuis le mobile sans perte ; brouillon structurel non publiable sans droits ; réactivation ultérieure sans restauration manuelle |
| Sauvegarde | Valeurs masquées conservées, effacement explicite distingué de champ absent, double clic, conflit mobile/web, coupure réseau et changement de compte pendant une requête |
| Commandes publiques | Pour Starter, Pro et Enterprise, catalogue, prix et unités, panier, passage de commande, validation serveur, contacts, statuts, notifications et Denkma inchangés pour les cinq modèles et le legacy ; aucun refus lié à la lecture seule du back-office du marchand |
| Prévisualisation | Site désactivé, modèle non publié, jeton expiré/révoqué, autre compte, absence de fuite dans cache/robots/logs ; aucune création de commande/contact ni mesure commerciale |
| Publication | Pointeur atomique, conflit concurrent, idempotence et invalidation réessayable ; corps, métadonnées et pages issus de la même révision |
| Médias | Images historiques, logo transparent, mauvaise extension/MIME, fichier invalide, recadrage, médias d'un autre compte et suppression d'un média encore référencé |
| UX et accessibilité | Édition guidée iOS/Android, retour arrière, clavier, petites largeurs, grands textes, contrastes des palettes et déplacement clavier des sections |
| Migration | Dry-run, relance idempotente, comparaison avant/après, URL et domaines identiques, commandes intactes, retour arrière sans écrasement des données récentes |
| Performance | SSR, poids des médias, stabilité de mise en page, hydratation, coût du catalogue actuel et validation de documents complexes ; objectifs fixés à partir des mesures du socle |

Les tests doivent utiliser des cas techniques isolés et des données de test explicitement identifiées, jamais injecter de faux produits ou de fausses commandes dans les interfaces ou la production. Les comparaisons visuelles pilotes devront s'appuyer sur des boutiques autorisées, avec masquage des données personnelles.

## 11. Limites et décisions encore ouvertes

- Le schéma ci-dessus est un contrat de conception ; les schémas par section, les opérations exactes d'API et les migrations ne sont pas implémentés.
- Aucun éditeur Shopify authentifié n'a été observé ; la comparaison utilise uniquement les sources officielles recensées dans l'audit.
- Les limites de performance, la conservation des versions, l'hébergement des médias et l'origine de l'aperçu restent à valider ; aucun quota de plan n'est induit.
- Le catalogue actuel reste techniquement limité à 2 000 produits par projection publique et ses détails restent en modale. Le moteur ne doit pas annoncer une pagination serveur complète, des variantes produit ou un SEO produit individuel non encore développés.
- La consultation web Starter/Pro est une décision acquise à conserver, pas une suppression à planifier. Le futur chantier doit vérifier la couverture des refus serveur et les invitations Enterprise, sans changer les restrictions actuelles, bloquer la navigation autorisée ou affecter le site public.
- Les versions sont des versions de présentation : elles ne restaurent jamais stocks, prix, commandes, paiements ou état DNS.

Cette conception s'arrête avant l'implémentation. Aucun changement de code, de tarification ou de fonctionnalité existante n'est autorisé par la seule rédaction de ces documents.
