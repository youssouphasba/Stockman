# Paramètres Starter mobile

La vue simplifiée concerne les propriétaires commerçants dont le plan souscrit est Starter, hors démonstration, sur Android et iOS. Un plan Pro ou Enterprise temporairement restreint conserve sa présentation. Les autres rôles et le web ne changent pas.

## Accès

La navigation mobile Starter comporte cinq onglets : Produits, Caisse, Compta, E-com, Paramètres. E-com sert au suivi quotidien des commandes et des statistiques ; la configuration reste dans la rubrique Boutique en ligne des Paramètres, qui conserve ses six rubriques.

- Ma boutique : identité, adresse, reçus, factures et TVA. Les personnalisations des documents sont dans Plus d'options.
- Boutique en ligne : activation, aperçu, coordonnées, présentation, couleur, livraison, WhatsApp, instructions de paiement et commandes reçues. Le domaine et sa vérification sont dans Plus d'options.
- Mon compte : identité, mot de passe, PIN, biométrie, langue, thème, comptes enregistrés, accès autorisé à l'équipe et déconnexion.
- Notifications : interrupteur existant et préférences de réception secondaires. Les destinataires et seuils avancés sont conservés sans être exposés dans la vue initiale.
- Mon abonnement : plan, statut, échéance disponible et accès à l'écran de paiement et de changement d'offre existant, selon les droits de facturation.
- Aide et informations : synchronisation, support, incidents, informations légales, export et suppression du compte avec ses protections existantes.

## Cas particuliers

Le chargement de la boutique en ligne utilise `ecommerceApi.getSite`, qui prépare déjà un site désactivé. Une erreur de chargement propose une nouvelle tentative ; elle ne constitue pas une autorisation de créer un site avec des valeurs de remplacement. Sans boutique active, le sélecteur existant permet de sélectionner ou de créer une boutique selon les contrôles actuels du serveur.

Les employés existants restent gérables via l'écran Équipe déjà autorisé. Cet écran conserve son contrôle interdisant la création d'employés sur Starter.

Les paramètres `section=storeEcommerce`, `storeDocuments`, `billing`, `security`, `support` et l'événement `settings:open-ecommerce` ouvrent les rubriques correspondantes. Le retour arrière Android revient d'abord à la liste des six rubriques.

## Sauvegardes

Les champs secondaires restent dans l'état des formulaires. Les sauvegardes des documents conservent les valeurs vides explicites. Les sauvegardes e-commerce n'envoient que les différences, afin de préserver notamment le domaine et son statut lorsque seul le texte du site change. Aucun module, tarif ou droit commercial n'est modifié pour obtenir cette présentation.

Cette fiche sert de référence pour l'aide et l'indexation documentaire de l'assistant. Elle ne modifie pas l'index RAG du serveur, exclu du périmètre de cette intervention.
