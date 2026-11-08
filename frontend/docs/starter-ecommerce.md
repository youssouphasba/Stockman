# E-com Starter mobile

Sur Android et iOS, le propriétaire commerçant Starter dispose des onglets Produits, Caisse, Compta, E-com et Paramètres. E-com reste proposé lorsque le site est désactivé ou n'a pas encore été configuré. Les droits, restrictions de souscription et autres parcours restent applicables. Pro et Enterprise conservent leur navigation et leurs paramètres.

## Utilisation quotidienne

E-com est un espace de gestion opérationnelle, distinct du site public de vente. Il réutilise l'écran Commandes en mode e-commerce, sans les actions d'approvisionnement. La vue Commandes s'affiche par défaut ; le sélecteur Statistiques ouvre les indicateurs commerciaux. Aucun statut d'activation ni formulaire de configuration du site n'est affiché dans cet espace. Seule exception : lors de la première visite, une proposition facultative « Bienvenue dans votre boutique en ligne ! » peut s'afficher une seule fois, dans une fenêtre non bloquante. « Configurer mon site » ouvre Paramètres > Boutique en ligne ; « Plus tard » enregistre ce choix pour le compte et le site, sur tous les appareils. E-com reste ensuite entièrement opérationnel. Les commandes récentes sont classées par date décroissante. Les filtres correspondent aux statuts existants : en attente, confirmées, en préparation, prêtes, terminées et annulées. Historique complet ne limite pas les résultats à une période ; Voir plus de commandes charge la suite via la pagination existante. La recherche porte sur les commandes chargées.

Le détail, les changements de statut et l'accès à Denkma réutilisent les traitements existants. Les liens de notification vers `orders?tab=web&source=ecommerce&order_id=…` restent valables. Le retour Android ferme le détail avant de quitter l'onglet.

## Indicateurs

Le nombre total de commandes et les commandes en attente sont fournis par l'API existante. Le CA E-com, le panier moyen, les visites et la conversion utilisent les indicateurs sur la période retournée par `ecommerceApi.getStats()`, actuellement 30 jours. Les valeurs à zéro sont affichées normalement ; une erreur propose Réessayer et ne transforme pas des données indisponibles en zéros. Les statistiques sont chargées uniquement dans la vue Statistiques, sans appel de repli à `getSite`. Une erreur de statistiques n'empêche pas de revenir aux commandes. Les indicateurs ne sont pas conditionnés au statut d'activation du site.

Ces indicateurs conservent les règles de calcul actuelles du serveur. En particulier, le CA E-com correspond au montant des commandes sur la période, pas à une nouvelle mesure des encaissements comptables. Le site lié et les commandes suivent le périmètre existant des API ; cette intervention ne modifie pas la liaison entre site et boutique.

## Configuration

L'activation, les textes, les couleurs, les coordonnées, WhatsApp, le domaine, sa vérification, les informations de livraison et les instructions de paiement restent exclusivement dans Paramètres > Boutique en ligne. Le logo, le nom du site, les textes d'accueil et la couleur de marque se modifient dans le bloc « Apparence du site » : brouillon, aperçu privé puis publication. Le logo se choisit dans la bibliothèque d'images du site. Les autres réglages s'enregistrent avec le formulaire du site. Aucun formulaire, interrupteur ou action de configuration du site n'est présent dans E-com, y compris dans son menu contextuel, en dehors de la proposition facultative de première visite décrite ci-dessus. Les six rubriques des Paramètres, le lien `/(tabs)/settings?section=storeEcommerce`, le raccourci historique vers les commandes et l'événement `settings:open-ecommerce` sont conservés.

Cette fiche complète les guides et le centre d'aide mobiles et peut servir à l'indexation documentaire de l'assistant. La proposition de première configuration et l'apparence du site sont également décrites dans `backend/docs/ecommerce-themes.md`, indexé par l'assistant.
