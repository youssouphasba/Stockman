# Audit REA : thèmes e-commerce Stockman

Date : 21 octobre 2026. Statut : audit et conception uniquement, sans mise en œuvre.

Correction de conception du 22 octobre 2026 : consultation du back-office web conservée pour Starter et Pro ; modifications web réservées à Enterprise, selon les permissions. Cette correction ne modifie ni le code ni les prix.

Révision examinée : `98d45c145200a49d8a2681dff61f07827ae8624c`, après la séparation d'E-com et des paramètres du site. Les modifications locales préexistantes ne font pas partie du livrable. Aucun accès à la base de production, aucune migration et aucun commit ne sont réalisés.

La [conception technique et les maquettes](CONCEPTION_THEMES_ECOMMERCE_2026-10-21.md) complètent ce rapport. Les recommandations de ces documents ne décrivent pas des fonctionnalités déjà livrées.

## 1. Conclusion

Stockman possède déjà un moteur public commun de fait : les boutiques utilisent le même composant React/Next.js, le même catalogue public et les mêmes routes de commande. En revanche, ce composant n'est pas encore un moteur de thèmes configurable par sections.

Recommandation : conserver les services commerciaux existants et ajouter un modèle de présentation versionné, interprété par un registre de composants de confiance. Starter et Pro conservent la consultation du back-office web et accèdent à une édition guidée du site sur mobile. Enterprise conserve cette édition mobile et dispose de la gestion web selon ses permissions, ainsi que d'un éditeur de thèmes web complet. Le plan ne doit jamais décider si une section déjà publiée peut être rendue après un downgrade.

Trois prérequis doivent être traités avant toute ouverture commerciale : les droits serveur des mutations, le véritable aperçu privé de brouillon et la conservation des versions publiées. Un simple formulaire de couleurs ou une galerie de modèles ne suffit pas.

### Trois espaces à distinguer

| Espace | Usage | Droits retenus |
| --- | --- | --- |
| Back-office Stockman — `app.stockman.pro` | Gestion de l'entreprise et consultation des données autorisées | Starter et Pro : consultation uniquement sur le web. Enterprise : consultation et modifications selon les permissions et les restrictions de souscription existantes. |
| Site e-commerce public — URL de boutique ou domaine personnalisé | Consultation du catalogue et commandes des clients | Disponible aux trois abonnements. Les restrictions du back-office ne s'appliquent pas aux clients du site public ; le rendu et le passage de commande ne sont pas conditionnés à Enterprise. |
| Personnalisation du site — Paramètres > Boutique en ligne | Apparence, modèles, aperçu et publication | Édition mobile guidée pour les trois abonnements ; éditeur de thèmes web complet réservé à Enterprise. Les pages web accessibles à Starter/Pro restent en consultation, sans droit de modification. |

E-com est une fonctionnalité métier de Stockman : commandes en ligne, traitement des commandes, livraisons et statistiques. Elle reste séparée des paramètres du site. Sa consultation web respecte les permissions du compte ; ses mutations web restent réservées à Enterprise. Cela n'interdit pas aux clients d'un site Starter ou Pro d'y passer commande.

## 2. Rapport REA

### Installation et capacités vérifiées

| Vérification | Résultat observé |
| --- | --- |
| Skill local | `C:/Users/Utilisateur/.agents/skills/reverse-engineer-anything/SKILL.md`, métadonnée de version 37 |
| Enregistrement | Section `[mcp_servers.rea]` existante dans la configuration Codex |
| Installation réutilisée | `C:/Users/Utilisateur/.codex/tools/rea/node_modules/rea-agents` |
| Serveur effectif | Appel MCP `binary_session({})` réussi ; paquet `rea-agents` version `6.4.0` |
| Catalogue exposé | 170 outils MCP REA annoncés dans cette session |
| Analyse web | `list_browser_targets`, `inspect_web_page` et `analyze_web_bundle` annoncés disponibles |
| Analyse JavaScript | `analyze_javascript_application` annoncé disponible |
| Session native | Aucune cible ouverte ; aucun binaire analysé |
| Ghidra | Non configuré sur cet hôte ; sans incidence sur l'analyse des sources React |
| Installation/réparation | Aucune installation, réinstallation ni modification de configuration |

La commande `rea` n'est pas résolue dans le PATH du shell, mais cela n'empêche pas le serveur MCP existant de fonctionner. Il n'y a donc pas lieu de réinstaller REA.

### Limite de l'observation Shopify

La recherche ciblée des processus Chrome/Edge exposant un argument de débogage distant n'a fourni aucun port CDP. Aucun endpoint n'a été supposé et aucun navigateur n'a été relancé avec des permissions supplémentaires. Aucun compte administrateur Shopify autorisé n'a été fourni ou observé.

Conséquence : les capacités REA sont vérifiées, mais il n'existe pas de capture REA de l'éditeur Shopify pour ce livrable. L'analyse Shopify repose sur sa documentation officielle, consultée pendant cet audit. Aucune conclusion sur son code interne propriétaire, son stockage privé ou ses requêtes authentifiées n'est formulée. L'appel d'état du serveur ne constitue pas une preuve d'exécution d'une application tierce.

L'analyse du dépôt Stockman est une inspection de sources ordinaires, pas une décompilation REA. Cette distinction évite de présenter des observations statiques comme des tests réels de production.

## 3. Audit du code Stockman

Les références de lignes correspondent à la révision examinée. Les recherches négatives ci-dessous sont limitées aux répertoires et contrats indiqués, pas à une base de données de production.

| Réf. | Source | Constat vérifié |
| --- | --- | --- |
| S01 | `frontend/app/(tabs)/settings.tsx:240`, `:460`, `:715`, `:735` | Paramètres mobiles, chargement du site, sauvegarde et ouverture d'un aperçu. La présentation simplifiée est propre au Starter mobile ; Pro conserve une présentation différente. |
| S02 | `frontend/utils/starterSettings.ts:25`, `:41` | Construction d'un état de formulaire et envoi des seuls champs modifiés. Les champs de domaine non modifiés ne sont plus renvoyés systématiquement depuis ce parcours mobile. |
| S03 | `frontend/services/api.ts:827`, `:862`, `:891` | Contrats plats `EcommerceSite` et `EcommerceSiteUpdate` ; services site, statistiques et commandes. Aucun identifiant de modèle ni arbre de sections dans ces contrats. |
| S04 | `frontend/app/(tabs)/ecommerce.tsx`, `orders.tsx`, `components/EcommerceOverview.tsx` | Espace Starter opérationnel, commandes réutilisées et statistiques séparées. La configuration du site n'y figure plus. |
| S05 | `web-app/src/app/shop/[slug]/StorefrontClient.tsx:96`, `:126`, `:188`, `:273`, `:309` | Un composant client regroupe chargement, catalogue, filtres, favoris, panier, formulaire de commande, contact et présentation. Couleurs dérivées d'une couleur principale. |
| S06 | `web-app/src/app/shop/[slug]/page.tsx:7`, `:16` ; `web-app/src/app/page.tsx:17`, `:91` | Les URL `/shop/{slug}` et le domaine personnalisé conduisent au même composant. Métadonnées générées séparément, avec revalidation de 300 secondes. |
| S07 | `backend/server.py:1371`, `:1406`, `:3949` | Modèle de site plat ; paramètres stockés dans `business_accounts` sous les champs `ecommerce_*`. Un site de compte est associé à une boutique de stock par défaut. |
| S08 | `backend/server.py:4053`, `:4134`, `:4144` | Projection publique du site et du catalogue ; publication publique conditionnée à `ecommerce_enabled`, pas au plan du commerçant dans ces fonctions. |
| S09 | `backend/server.py:18309`, `:18321`, `:18402` | Lecture, mise à jour et vérification de domaine. Les mutations vérifient le rôle d'administrateur opérationnel mais ne disposent pas d'une politique d'édition de thèmes par capacité. |
| S10 | `backend/enterprise_access.py:301`, `:357` ; `backend/server.py:5370`, `:5592` | Plan souscrit, plan effectif et état de souscription sont distincts. Des gardes de lecture seule existent et devront être réutilisés explicitement dans les futures mutations. |
| S11 | `backend/server.py:5179`, `:5203` ; `web-app/src/services/api.ts:287`, `:372` | Starter et Pro peuvent actuellement consulter le back-office web ; les écritures web ordinaires sont restreintes via la surface et les gardes existants. La décision corrigée conserve cette consultation et ces restrictions, sans les étendre aux sites marchands publics. |
| S12 | `backend/server.py:33082`, `:7117` | Upload actuel renvoyant une image encodée embarquée ; compression JPEG, taille maximale de redimensionnement 800 × 800, conversion des formats transparents en RGB. |
| S13 | `backend/server.py:4116` ; contrats site mobile et serveur | Le rendu public lit `ecommerce_logo_url`, mais ce champ n'est pas dans `EcommerceSiteUpdate` ni dans les formulaires de site examinés. Aucun parcours complet de téléversement du logo e-commerce n'est identifié dans ce périmètre. |
| S14 | `web-app/next.config.ts:23` | `X-Frame-Options: DENY` et CSP `frame-ancestors 'none'` sur les pages ordinaires : un éditeur intégrant la vitrine en iframe ne fonctionnera pas sans traitement ciblé de l'aperçu. |

### Fonctionnalités existantes à protéger

- Catalogue alimenté par les vrais produits de la boutique liée, prix positifs et filtres de disponibilité existants ; la projection actuelle est plafonnée techniquement à 2 000 produits côté serveur.
- Recherche et catégories dans le navigateur, pagination d'affichage par lots de 50, détail produit en modale et favoris locaux.
- Panier et formulaires existants ; le serveur reçoit les identifiants produit et quantités, pas une définition de prix issue du thème.
- Coordonnées, WhatsApp, informations de livraison, instructions de paiement et formulaire de contact.
- Commandes, notifications, CRM, statuts de traitement et intégration Denkma : hors responsabilité du moteur de thèmes.
- Slug, domaine personnalisé, URL de secours Stockman et statut de connexion du domaine.
- Consultation du back-office web Starter/Pro, navigation en lecture seule et visibilité limitée aux données autorisées du compte et de la boutique.

### Écarts et risques confirmés dans les sources

1. **Absence de moteur déclaratif.** Le JSX contient directement la structure de la page. Les contrats de site examinés ne contiennent ni modèle, ni sections, ni blocs, ni révision publiée. Une galerie seule ne rendrait pas la structure éditable.
2. **Aperçu actuel insuffisant pour un éditeur.** `preview=1` évite les événements de visites/ajouts au panier dans le composant, mais lit toujours le même site public. Il ne sélectionne pas un brouillon et ne permet pas de consulter un site désactivé. Les fonctions d'envoi de commande et de contact restent présentes : ce paramètre n'est pas une garantie d'absence d'effets métier.
3. **Politique web à clarifier sans retirer l'accès.** Conserver la consultation Starter/Pro sur `app.stockman.pro`, la navigation et les données permises. Réserver les modifications web à Enterprise. Présenter une invitation à découvrir Enterprise au moment d'une action de modification, sans bloquer la lecture ni exposer de données supplémentaires. Cette limite ne concerne ni les commandes des clients sur les sites publics ni l'édition mobile guidée autorisée.
4. **Mutations à sécuriser côté serveur.** Les routes actuelles de réglage de site et de vérification du domaine utilisent `require_auth` et le rôle organisationnel, sans appel explicite à `ensure_subscription_write_allowed` dans leurs corps. `require_auth` authentifie seulement ; aucune garde globale d'écriture n'est déclarée sur `api_router`. C'est un défaut de couverture visible dans les sources, pas une exploitation testée en production. Une politique de thèmes doit vérifier rôle, compte, état de souscription, espace et opération à chaque mutation. Préserver les gardes existants et refuser les mutations du back-office web Starter/Pro côté serveur, même si les boutons sont masqués ou désactivés. Ne pas appliquer ce refus aux commandes et autres opérations autorisées du site public, ni aux modifications mobiles guidées permises.
5. **Risque de revalidation du domaine au mauvais moment.** Le formulaire web existant renvoie l'ensemble de son état à `updateSite`, tandis que le serveur remet un domaine reçu à `pending_verification`. Séparer les mutations de présentation et de domaine ; réutiliser le principe de sauvegarde différentielle mobile.
6. **Chaîne d'images non adaptée au futur éditeur.** Les images embarquées et la conversion JPEG ne couvrent pas convenablement logos transparents, bannières haute définition, recadrages et bibliothèque de médias versionnée. Ne pas annoncer le changement de logo avant la fermeture de ce parcours serveur/mobile/rendu.
7. **Contrastes non garantis.** La couleur de texte calculée par seuil dans `getBrandOnColor` n'est pas un calcul de rapport WCAG. Certaines utilisations directes de la couleur principale sur fond clair doivent aussi être vérifiées. Ce constat ne prétend pas que toutes les couleurs actuelles sont illisibles.
8. **Publication et SEO non atomiques.** Le corps public est chargé côté client sans cache, alors que ses métadonnées sont mises en cache séparément. Le futur thème et ses métadonnées doivent partager une révision publiée et une invalidation cohérente.

Pas de système de thèmes, de pages personnalisées ou d'historique de présentation identifié dans les contrats et chemins examinés. Aucune vérification des données réellement présentes dans MongoDB n'est faite.

## 4. Shopify et Stockman : comparaison documentée

Les éléments Shopify ci-dessous sont des mécanismes documentés, pas une description de son implémentation serveur interne. Aucun composant propriétaire ne doit être reproduit.

| Sujet | Shopify documenté | Stockman actuel | Principe retenu pour Stockman |
| --- | --- | --- | --- |
| Structure | Layouts, templates, sections et ressources [H1] | JSX d'une vitrine unique | Registre React et configuration indépendante |
| Modèles de pages | Templates JSON portant sections et ordre [H2] | Une page principale, ancres et modales | Types de pages et instances de sections versionnés |
| Sections et blocs | Sections réutilisables, blocs et réglages associés [H3, H4] | Sections codées dans le composant | Types autorisés et schémas propres à Stockman |
| Réglages globaux | Réglages de thème, section et bloc [H5] | Couleur, textes et coordonnées | Tokens globaux séparés des données commerciales |
| Éditeur | Arbre de contenu, aperçu et sélection dans l'aperçu [H6, H7] | Formulaires de réglage | Édition guidée mobile et éditeur web Enterprise |
| Publication | Un thème publié ; les autres restent non publiés [H8] | Mise à jour directe des réglages | Révision publiée immuable et brouillons séparés |
| Restauration classique | Timeline de fichier, limitée ; pas de restauration globale par ce mécanisme [H9] | Pas d'historique de thème identifié | Instantanés cohérents Stockman, pas simple historique de fichiers |
| Canvas | Éditeur distinct, historique de versions et restauration avant publication [H10] | Aucun équivalent identifié | S'inspirer du parcours, sans supposer le même format interne |

Ne pas importer Liquid, les quotas de sections/templates de Shopify, ses extensions d'applications, son éditeur de code, ses fonctions IA ou des canaux de vente absents de Stockman. Ces mécanismes ne sont pas nécessaires au besoin exprimé.

### Sources primaires consultées

- H1 : [Architecture des thèmes](https://shopify.dev/docs/storefronts/themes/architecture).
- H2 : [Templates JSON](https://shopify.dev/docs/storefronts/themes/architecture/templates/json-templates).
- H3 : [Sections](https://shopify.dev/docs/storefronts/themes/architecture/sections).
- H4 : [Blocs](https://shopify.dev/docs/storefronts/themes/architecture/blocks).
- H5 : [Réglages](https://shopify.dev/docs/storefronts/themes/architecture/settings).
- H6 : [Organisation de l'éditeur et prévisualisation](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/theme-editor/features-overview).
- H7 : [Sélection dans l'aperçu](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/theme-editor/preview-inspector).
- H8 : [Publication des thèmes](https://help.shopify.com/en/manual/online-store/themes/managing-themes/publishing-themes).
- H9 : [Éditeur de code et limites de la Timeline](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/edit-code/edit-theme-code).
- H10 : [Canvas : personnalisation et restauration](https://help.shopify.com/en/manual/online-store/themes/canvas/customizing).
- A1 : [W3C : contraste du texte](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Pour les futurs thèmes, viser au moins 4,5:1 pour le texte ordinaire et 3:1 pour le grand texte, selon les critères applicables.

## 5. Validation de cet audit

Lors de l'audit initial du 21 octobre 2026, les trois suites existantes ont été exécutées sans modification de leurs fichiers : `starter-navigation.test.cjs`, `starter-settings.test.cjs` et `starter-ecommerce.test.cjs`. Résultat historique : **50 tests réussis**.

Ces tests valident le socle mobile existant, pas un moteur de thèmes qui n'est pas implémenté. Aucun test du nouvel éditeur, aucune migration, aucune publication, aucun build de production et aucun appel de mutation aux API réelles ne sont effectués. La présentation Shopify n'a pas été testée dans un compte marchand. L'état réel des domaines, du CDN et des boutiques déployées reste à vérifier au moment de l'implémentation.

La correction du 22 octobre porte uniquement sur les deux documents de conception : cohérence des droits et des trois espaces, suppression des recommandations contradictoires et conservation des autres décisions. Les tests applicatifs ne sont pas réexécutés pour cette correction documentaire et aucun renforcement serveur n'est présenté comme déjà implémenté.

## 6. Décisions avant lancement

1. Finaliser le contrat commun et le traitement des thèmes hérités en respectant la matrice produit corrigée : consultation web Starter/Pro conservée, modifications web Enterprise et édition mobile guidée pour tous.
2. Vérifier les refus serveur des mutations web Starter/Pro et prévoir des invitations contextuelles à Enterprise sans bloquer la navigation en lecture seule. Tester séparément les commandes des clients sur les sites publics des trois abonnements.
3. Choisir l'hébergement des médias et de l'aperçu isolé, sans réutiliser aveuglément le stockage embarqué ou désactiver globalement les protections iframe.
4. Valider le comportement de publication simple mobile et la conservation des personnalisations Enterprise après downgrade.
5. Fixer après mesures les bornes techniques de taille/profondeur, les objectifs de performance et la politique de conservation des versions. Aucun quota commercial ni tarif n'est décidé ici.
6. Lors de la livraison future seulement, mettre à jour les guides de formation, le centre d'aide, la matrice d'accès documentaire et l'index RAG selon les fonctionnalités effectivement disponibles. Les documents de conception ne doivent pas faire annoncer des fonctions non livrées par l'assistant.
