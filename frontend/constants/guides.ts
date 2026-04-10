import { GuideStep } from "../components/ScreenGuide";

export const GUIDES: Record<string, { title: string; steps: GuideStep[] }> = {
    dashboard: {
        title: "Tableau de Bord",
        steps: [
            {
                icon: "storefront-outline",
                title: "Vue d'ensemble",
                description: "Votre tableau de bord affiche l'activité de la boutique sélectionnée. Changez de boutique via le sélecteur en haut à gauche."
            },
            {
                icon: "trending-up-outline",
                title: "Indicateurs Clés (KPIs)",
                description: "4 cartes KPI : CA du jour, Ventes du jour, Valeur du stock et CA du mois. Appuyez sur l'icône (i) de chaque carte pour comprendre le calcul."
            },
            {
                icon: "options-outline",
                title: "Personnaliser l'affichage",
                description: "Appuyez sur l'icône d'options dans le header pour choisir quelles sections afficher : KPIs, santé du stock, rappels, prévisions IA."
            },
            {
                icon: "swap-horizontal-outline",
                title: "Changer de compte",
                description: "Une carte Multi-compte est visible juste sous le message d'accueil. Utilisez-la pour basculer rapidement vers un autre compte mémorisé sur ce téléphone sans empiler d'icônes dans le header."
            },
            {
                icon: "layers-outline",
                title: "Vue simplifiée selon le plan",
                description: "Sur mobile, les comptes Starter et Pro voient un tableau de bord plus simple. Les blocs d'analyse avancée, l'inventaire tournant et les briques IA du dashboard restent réservés au plan Enterprise."
            },
            {
                icon: "pie-chart-outline",
                title: "Santé du Stock",
                description: "Badges colorés : Rouge (rupture), Orange (stock bas), Bleu (surstock), Vert (normal). Touchez 'Tout voir' pour la liste complète."
            },
            {
                icon: "alert-circle-outline",
                title: "Alertes Péremption",
                description: "Les lots arrivant à expiration dans les 30 jours s'affichent ici. Gérez vos produits périssables avant qu'il ne soit trop tard."
            },
            {
                icon: "repeat-outline",
                title: "Réapprovisionnement Intelligent",
                description: "Le système analyse vos ventes et suggère les produits à commander. Si un fournisseur est déjà lié au produit, vous pouvez créer directement une commande. Sinon, ouvrez la fiche produit pour associer le bon fournisseur avant de commander."
            },
            {
                icon: "bar-chart-outline",
                title: "Statistiques & Historique",
                description: "Boutons en bas de page : 'Statistiques' ouvre les graphiques (CA, paiements, top produits) et 'Historique' affiche tous les mouvements de stock."
            },
            {
                icon: "share-outline",
                title: "Partager le Rapport",
                description: "L'icône de partage dans le header génère un rapport HTML de la journée que vous pouvez envoyer par WhatsApp, Email ou toute autre app."
            }
        ]
    },
    products: {
        title: "Gestion des Produits",
        steps: [
            {
                icon: "search-outline",
                title: "Commencer par la bonne boutique",
                description: "Avant de créer, modifier ou compter un produit, vérifiez toujours la boutique active affichée en haut de l'application. Tous les produits, quantités et mouvements visibles dans cet écran dépendent de cette boutique."
            },
            {
                icon: "pricetag-outline",
                title: "Trouver rapidement un article",
                description: "Utilisez la recherche par nom, SKU ou code-barres, puis complétez avec les catégories. Cette méthode est la plus rapide pour retrouver un article précis avant une correction, une vente ou un contrôle."
            },
            {
                icon: "settings-outline",
                title: "Catégories selon votre secteur",
                description: "Le bouton engrenage reste visible en haut. Ouvrez-le pour créer vos catégories et importer des catégories adaptées à votre secteur (pharmacie, épicerie, supermarché, etc.)."
            },
            {
                icon: "add-circle-outline",
                title: "Lire l'état du stock",
                description: "Chaque carte ou ligne vous aide à repérer l'urgence : rupture si la quantité est à zéro, stock bas sous le seuil, surstock si la quantité devient trop élevée, stock normal si tout est équilibré."
            },
            {
                icon: "create-outline",
                title: "Créer ou modifier une fiche produit",
                description: "Ouvrez la fiche pour renseigner le nom, le SKU, la quantité initiale, l'unité, les prix, les seuils, la catégorie, les fournisseurs liés et les informations utiles au suivi. Relisez toujours les prix et le seuil minimum avant d'enregistrer."
            },
            {
                icon: "link-outline",
                title: "Préparer l'approvisionnement",
                description: "Quand un produit doit être réapprovisionné, cherchez d'abord le bon fournisseur ou gérez les fournisseurs déjà liés. Cette étape permet ensuite de commander plus vite et d'améliorer les suggestions intelligentes."
            },
            {
                icon: "swap-vertical-outline",
                title: "Ajuster le stock sans quitter l'écran",
                description: "Les actions rapides servent à enregistrer une entrée, une sortie, une correction ou un autre mouvement simple. Utilisez-les pour les livraisons, les pertes, la casse ou une correction d'inventaire."
            },
            {
                icon: "cloud-upload-outline",
                title: "Importer plusieurs produits d'un coup",
                description: "L'import fichier sert à intégrer un CSV structuré. L'import texte sert quand vous avez une liste brute issue d'un message, d'un bon ou d'une note. Vérifiez toujours le résultat avant de valider la création."
            },
            {
                icon: "scan-outline",
                title: "Utiliser le scan par lot",
                description: "Le scan en série est utile quand vous recevez de nombreux articles ou quand vous comptez le stock. Scannez plusieurs codes-barres à la suite pour gagner du temps sans rouvrir chaque fiche."
            },
            {
                icon: "time-outline",
                title: "Relire l'historique d'un produit",
                description: "Servez-vous de l'historique pour comprendre pourquoi une quantité a changé, qui a fait l'action et à quel moment. C'est le bon réflexe quand un stock semble incohérent."
            },
            {
                icon: "location-outline",
                title: "Organiser le rangement physique",
                description: "Si cet écran est disponible sur votre compte, vous pouvez rattacher chaque produit à un emplacement précis. Cela aide à ranger, retrouver, compter et transférer plus facilement vos articles."
            },
            {
                icon: "download-outline",
                title: "Exporter pour vérifier ou partager",
                description: "Utilisez l'export pour contrôler votre catalogue, préparer un partage ou garder une copie de travail. Revenez toujours dans l'application pour vérifier que les dernières modifications ont bien été prises en compte."
            },
            {
                icon: "checkbox-outline",
                title: "Utiliser la sélection multiple",
                description: "Utilisez la barre d'actions en bas pour modifier les prix ou les stocks des produits sélectionnés, exporter le catalogue ou envoyer des produits dans la corbeille. Pour le stock, saisissez le stock réel : Stockman enregistre seulement les écarts sous forme de mouvements."
            }
        ]
    },
    locations: {
        title: "Emplacements de Stockage",
        steps: [
            {
                icon: "map-outline",
                title: "À quoi sert cet écran",
                description: "Cet écran sert à reproduire l'organisation réelle de votre réserve, de votre magasin ou de votre entrepôt. Il vous aide à savoir où se trouve chaque produit et à gagner du temps pendant le rangement, l'inventaire ou la préparation."
            },
            {
                icon: "albums-outline",
                title: "Partir d'une structure simple",
                description: "Commencez par choisir le type d'organisation qui vous ressemble le plus : allées, zones, rayons, niveaux, étagères ou toute autre structure de votre choix. Vous n'avez pas besoin d'utiliser les mêmes mots qu'un autre commerce."
            },
            {
                icon: "layers-outline",
                title: "Configurer les niveaux",
                description: "Chaque niveau représente une couche de votre rangement. Par exemple : zone, puis rayon, puis étagère. Ajoutez uniquement les niveaux réellement utiles pour éviter une structure trop lourde à gérer."
            },
            {
                icon: "list-outline",
                title: "Créer plusieurs emplacements d'un coup",
                description: "Au lieu de créer les emplacements un par un, utilisez la génération guidée pour définir une série complète. Vous pouvez choisir une numérotation ou des noms libres selon votre façon de travailler."
            },
            {
                icon: "eye-outline",
                title: "Relire avant de générer",
                description: "Vérifiez toujours l'aperçu et le nombre d'emplacements prévus avant validation. Cette étape évite de créer une structure trop grande, mal nommée ou inutilement compliquée."
            },
            {
                icon: "cube-outline",
                title: "Affecter un produit au bon emplacement",
                description: "Une fois la structure créée, utilisez la fiche produit pour associer chaque article au bon emplacement. Cela permet ensuite de filtrer vos produits, de mieux compter le stock et de retrouver plus vite un article."
            },
            {
                icon: "swap-horizontal-outline",
                title: "Faire évoluer l'organisation",
                description: "Si votre rangement change, vous pouvez corriger, archiver, réactiver ou transférer l'affectation d'un produit vers un autre emplacement. Faites-le au fil de l'évolution du magasin pour garder une structure fiable."
            }
        ]
    },
    pos: {
        title: "Point de Vente",
        steps: [
            {
                icon: "barcode-outline",
                title: "Scanner & Ajouter",
                description: "Le bouton Scanner reste visible dans la caisse mobile, même sans ouvrir la liste produits. Scannez un code-barres ou ouvrez Ajouter produit pour rechercher manuellement."
            },
            {
                icon: "cart-outline",
                title: "Gestion du Panier",
                description: "Ajustez les quantités avec +/−, supprimez une ligne, ou videz tout le panier. Le total se calcule en temps réel et le panneau reste lisible en mode clair."
            },
            {
                icon: "layers-outline",
                title: "Multi-Sessions",
                description: "Gérez plusieurs paniers en parallèle via les onglets en haut (Client 1, Client 2...). Le bouton '+' crée un nouveau panier."
            },
            {
                icon: "pricetag-outline",
                title: "Remise par Ligne",
                description: "Appuyez sur l'icône étiquette d'une ligne pour appliquer une remise en pourcentage ou en montant fixe sur cet article."
            },
            {
                icon: "person-add-outline",
                title: "Client & Fidélité",
                description: "Associez un client existant ou créez-en un nouveau en 2 secondes. Les points de fidélité se cumulent automatiquement."
            },
            {
                icon: "cash-outline",
                title: "Encaissement",
                description: "5 modes de paiement : Espèces (avec calculateur de monnaie), Mobile Money, Carte, Virement et Crédit (dette client)."
            },
            {
                icon: "calculator-outline",
                title: "Calculateur de Monnaie",
                description: "En paiement espèces, saisissez le montant reçu. L'app calcule la monnaie à rendre et suggère les billets."
            },
            {
                icon: "receipt-outline",
                title: "Reçu Digital",
                description: "Après validation, le ticket local reste visible même hors ligne. L'impression utilise une mise en page dédiée pour garder un rendu propre sur le web."
            }
        ]
    },
    accounting: {
        title: "Gestion Financière",
        steps: [
            {
                icon: "calendar-outline",
                title: "Périodes & Filtres",
                description: "Analysez vos performances sur 7j, 30j, 90j, 365j ou une période personnalisée via le sélecteur en haut."
            },
            {
                icon: "information-circle-outline",
                title: "KPIs avec explications",
                description: "Les cartes KPI résument vos chiffres (CA, marges, dépenses, stock, pertes). Les ratios affichés sont déjà en %, et chaque carte ouvre un détail complet."
            },
            {
                icon: "wallet-outline",
                title: "Dépenses",
                description: "Ajoutez vos dépenses par catégorie (Loyer, Salaire, Transport, etc.). Hors ligne, la dépense reste visible comme écriture en attente, puis se synchronise automatiquement."
            },
            {
                icon: "document-text-outline",
                title: "Factures PDF",
                description: "Créez des factures pro avec TVA depuis une vente existante ou manuellement. Si vous êtes hors ligne, la facture est préparée localement puis finalisée lors de la synchronisation."
            },
            {
                icon: "pie-chart-outline",
                title: "Graphiques",
                description: "Visualisez l'évolution du CA par jour et la répartition par mode de paiement (Espèces, Mobile Money, Carte, etc.)."
            },
            {
                icon: "trophy-outline",
                title: "Performances",
                description: "Découvrez vos top produits (ventes + CA), top catégories et les produits les plus rentables par marge."
            },
            {
                icon: "download-outline",
                title: "Export CSV",
                description: "Exportez toutes vos données comptables en CSV pour votre comptabilité externe ou votre déclaration fiscale."
            }
        ]
    },
    crm: {
        title: "Clients & Fidélité",
        steps: [
            {
                icon: "people",
                title: "Fichier Client",
                description: "Créez une fiche par client (nom, téléphone, email, catégorie, anniversaire). Recherchez par nom ou téléphone, filtrez par palier."
            },
            {
                icon: "shield-outline",
                title: "Paliers de Fidélité",
                description: "4 niveaux automatiques selon les achats : Bronze, Argent, Or, Platine. Les points se cumulent à chaque vente associée."
            },
            {
                icon: "card-outline",
                title: "Dettes & Crédits",
                description: "Dans l'onglet Compte, ajoutez une dette manuelle ou enregistrez un paiement. Hors ligne, l'opération est gardée en attente puis synchronisée automatiquement, avec un rappel visuel dans la fiche client."
            },
            {
                icon: "megaphone",
                title: "Campagnes Marketing",
                description: "Depuis les cartes d'actions rapides du CRM, lancez des campagnes ciblées : tous les clients, par palier, par catégorie ou sélection manuelle."
            },
            {
                icon: "gift",
                title: "Promotions",
                description: "Depuis les cartes d'actions rapides du CRM, créez des promotions (% ou montant fixe) et mettez-les à jour facilement."
            },
            {
                icon: "call-outline",
                title: "Contact Direct",
                description: "Depuis la fiche client : appelez, envoyez un SMS, ouvrez WhatsApp ou envoyez un email en un seul toucher."
            },
            {
                icon: "document-text-outline",
                title: "Notes client reliées",
                description: "Quand vous enregistrez une note depuis la fiche client, elle reste dans le CRM, s'ajoute a l'historique du client et cree aussi une note liee dans Notes et rappels."
            },
            {
                icon: "download-outline",
                title: "Export PDF & CSV",
                description: "Exportez la liste complète de vos clients en PDF (rapport) ou CSV (données brutes) depuis les icônes du header."
            }
        ]
    },
    suppliers: {
        title: "Relations Fournisseurs",
        steps: [
            {
                icon: "people-outline",
                title: "Annuaire interactif",
                description: "Appelez, écrivez ou ouvrez rapidement la fiche d'un fournisseur. Chaque fiche regroupe les produits liés, le journal, les factures et l'historique des commandes."
            },
            {
                icon: "globe-outline",
                title: "Marketplace et filtres",
                description: "Recherchez un fournisseur par produit, ville, catégorie ou prix. Les filtres servent à trouver un vendeur plus pertinent avant de commander ou de lier durablement un produit."
            },
            {
                icon: "link-outline",
                title: "Produits liés et fournisseur principal",
                description: "Liez un ou plusieurs fournisseurs à un produit pour sécuriser votre approvisionnement. Définissez ensuite un principal pour faciliter le réapprovisionnement et les commandes futures."
            },
            {
                icon: "cart-outline",
                title: "Commandes et réception",
                description: "Créez des bons de commande, relisez les lignes, puis confirmez la réception complète ou partielle quand la livraison arrive. Le stock est mis à jour selon l'action effectuée."
            },
            {
                icon: "sparkles-outline",
                title: "Réapprovisionnement intelligent",
                description: "Les suggestions intelligentes vous aident à voir quel produit commander et auprès de quel fournisseur agir. Elles sont plus fiables quand vos produits sont bien liés et que vos ventes sont correctement enregistrées."
            },
            {
                icon: "document-text-outline",
                title: "Factures fournisseur",
                description: "Ajoutez une facture liée au fournisseur ou à une commande pour garder un historique d'achat plus propre et retrouver plus facilement ce qui a été reçu ou payé."
            }
        ]
    },
    orders: {
        title: "Commandes Fournisseurs",
        steps: [
            {
                icon: "search-outline",
                title: "Recherche et filtres",
                description: "Recherchez une commande par référence, fournisseur, note ou produit. Les commandes principales restent visibles en haut et le panneau « Filtres » permet d'affiner par statut, période et fournisseur."
            },
            {
                icon: "add-circle",
                title: "Nouvelle commande",
                description: "Créez une commande en choisissant le fournisseur, puis ajoutez les articles avec quantités et prix. Relisez la date de livraison prévue et les notes avant de valider."
            },
            {
                icon: "time",
                title: "Suivi par statut",
                description: "Le statut vous dit où en est la commande : en attente, confirmée, expédiée, livrée ou annulée. Utilisez-le pour relancer, réceptionner ou traiter un retard."
            },
            {
                icon: "checkbox",
                title: "Réception et stock",
                description: "Validez la réception complète ou partielle selon ce qui a réellement été livré. Le stock est mis à jour à partir des quantités reçues."
            },
            {
                icon: "arrow-undo-outline",
                title: "Retours et avoirs",
                description: "Basculez sur l'onglet de retours pour renvoyer des marchandises, suivre le statut du retour et consulter l'avoir généré après finalisation."
            },
            {
                icon: "camera-outline",
                title: "Importer une facture",
                description: "Importez une image de facture depuis la caméra ou la galerie pour l'archiver et préremplir certaines informations utiles au suivi de commande."
            }
        ]
    },
    alerts: {
        title: "Alertes de Stock",
        steps: [
            {
                icon: "color-palette-outline",
                title: "Types d'Alertes",
                description: "Rouge (rupture = 0), Orange (stock bas ≤ seuil), Bleu (surstock > 3× seuil), Gris (dormant 30j+ sans vente), Jaune (péremption proche). Pour un même produit, la rupture remplace désormais le stock bas afin d'éviter les alertes redondantes."
            },
            {
                icon: "sparkles-outline",
                title: "Anomalies IA",
                description: "L'intelligence artificielle détecte les mouvements suspects et les tendances inhabituelles. Les alertes violettes signalent ces anomalies."
            },
            {
                icon: "options",
                title: "Règles Personnalisables",
                description: "Définissez vos seuils : stock bas, surstock, jours dormant et alerte péremption. Chaque boutique peut avoir ses propres règles."
            },
            {
                icon: "notifications",
                title: "Notifications Push",
                description: "Les alertes non lues remontent maintenant sur l'icône d'alertes dans l'en-tête. Les notifications push peuvent aussi ouvrir directement l'écran Alertes si elles sont autorisées sur l'appareil."
            },
            {
                icon: "checkmark-done",
                title: "Résolution",
                description: "Marquez les alertes comme lues ou passez directement à l'action (commander, ajuster le stock) depuis la liste."
            }
        ]
    },
    activity: {
        title: "Flux d'Activité",
        steps: [
            {
                icon: "time-outline",
                title: "Comprendre le rôle du journal",
                description: "Cet écran rassemble les actions importantes enregistrées sur votre compte et sur la boutique active. Utilisez-le pour vérifier une opération récente, comprendre un incident ou reconstituer ce qui s'est passé à un moment précis."
            },
            {
                icon: "filter-outline",
                title: "Lire une ligne dans le bon ordre",
                description: "Commencez par le module, puis l'heure, puis le texte principal de la ligne. Cette lecture rapide vous permet de comprendre d'abord la zone concernée, puis l'action et enfin le contexte détaillé."
            },
            {
                icon: "people-outline",
                title: "Identifier qui a agi",
                description: "Le nom affiché sur la ligne permet de savoir quel utilisateur a réalisé l'action. Servez-vous-en pour vos vérifications d'équipe, vos contrôles internes et le suivi après une anomalie."
            },
            {
                icon: "business-outline",
                title: "Tenir compte du contexte boutique",
                description: "Sur un compte qui gère plusieurs boutiques, relisez toujours l'historique avec la bonne boutique active. Une même action n'a pas la même signification si vous n'êtes pas dans le bon contexte."
            },
            {
                icon: "download-outline",
                title: "Exporter quand un contrôle le demande",
                description: "Utilisez l'export si vous devez partager un suivi, archiver une période ou vérifier plusieurs événements à tête reposée dans un autre support."
            },
            {
                icon: "refresh-outline",
                title: "Actualiser avant de conclure",
                description: "Tirez vers le bas avant de valider une hypothèse. Cela vous permet de vérifier que vous regardez bien le journal le plus récent et pas une version déjà dépassée."
            }
        ]
    },
    users: {
        title: "Gestion des Utilisateurs",
        steps: [
            {
                icon: "person-add-outline",
                title: "Créer un compte avec la bonne mission",
                description: "Avant d'ajouter une personne, définissez ce qu'elle doit réellement faire : vendre, gérer le stock, suivre la comptabilité, piloter une ou plusieurs boutiques. Cela vous aide à attribuer le bon niveau d'accès dès le départ."
            },
            {
                icon: "shield-checkmark-outline",
                title: "Régler les permissions module par module",
                description: "Pour chaque espace de travail, choisissez si la personne ne voit rien, peut seulement consulter ou peut aussi modifier. Procédez module par module pour éviter un accès trop large."
            },
            {
                icon: "briefcase-outline",
                title: "Différencier responsable et employé",
                description: "Un profil de responsable peut superviser davantage d'éléments selon les droits que vous lui accordez. Un employé simple doit rester limité aux actions utiles à son poste pour garder un contrôle clair."
            },
            {
                icon: "business-outline",
                title: "Limiter l'accès aux bonnes boutiques",
                description: "Choisissez les boutiques autorisées pour chaque membre de l'équipe. Un utilisateur ne doit voir que les boutiques sur lesquelles il doit réellement travailler."
            },
            {
                icon: "share-social-outline",
                title: "Transmettre les accès proprement",
                description: "Une fois le compte créé, partagez immédiatement l'email, le mot de passe initial, le lien mobile d'ouverture ou de téléchargement et le lien web de secours. Si le mot de passe est perdu plus tard, faites-le redéfinir avant une nouvelle tentative de connexion."
            },
            {
                icon: "briefcase-outline",
                title: "Accorder les responsabilités sensibles avec prudence",
                description: "Les rôles les plus élevés doivent rester réservés aux personnes de confiance, car ils peuvent influencer l'organisation, l'abonnement ou la structure des boutiques selon les droits disponibles."
            },
            {
                icon: "trash-outline",
                title: "Corriger ou retirer un accès",
                description: "Si une personne change de poste, quitte l'équipe ou reçoit trop d'accès, revenez dans sa fiche pour corriger les autorisations ou supprimer le compte. Faites cette vérification régulièrement."
            }
        ]
    },
    settings: {
        title: "Paramètres",
        steps: [
            {
                icon: "person-outline",
                title: "Commencer par la bonne rubrique",
                description: "L'écran Paramètres est désormais organisé en grandes rubriques. Commencez toujours par celle qui correspond à votre besoin réel : compte, boutique active, organisation, alertes, aide ou sécurité."
            },
            {
                icon: "language-outline",
                title: "Compte et application",
                description: "Cette rubrique sert à régler l'apparence, la langue, les préférences de votre compte et certains paramètres de fonctionnement de l'application sur votre appareil. Les comptes créés via Google y finalisent aussi leur contexte métier si le pays ou le secteur n'ont pas encore été confirmés."
            },
            {
                icon: "swap-horizontal-outline",
                title: "Comptes sur cet appareil",
                description: "Ajoutez plusieurs comptes sur le même téléphone avec leur adresse e-mail et leur mot de passe. Vous pourrez ensuite passer d'un espace commerçant, staff ou fournisseur à un autre sans vous reconnecter complètement à chaque fois."
            },
            {
                icon: "storefront-outline",
                title: "Boutique active",
                description: "Retrouvez ici les réglages liés au point de vente sélectionné : identité, documents de vente et informations pratiques de la boutique active."
            },
            {
                icon: "business-outline",
                title: "Organisation et pilotage",
                description: "Cette zone regroupe l'équipe, les accès, les modules visibles et les réglages de gestion avancés. Utilisez-la quand vous pilotez l'activité ou coordonnez plusieurs utilisateurs."
            },
            {
                icon: "notifications-outline",
                title: "Alertes, rappels et facturation",
                description: "Definissez ici comment vous recevez les alertes, a qui elles sont envoyees, quelles regles automatiques sont actives et testez l'envoi d'une notification push depuis votre appareil. Le test remonte maintenant aussi les erreurs reelles de configuration Expo ou FCM."
            },
            {
                icon: "help-circle-outline",
                title: "Aide et support",
                description: "Le centre d'aide, l'assistant, le contact support et le signalement d'un problème sont regroupés au même endroit pour éviter de chercher plusieurs entrées différentes."
            },
            {
                icon: "lock-closed-outline",
                title: "Sécurité et données",
                description: "Le code PIN, la biométrie, les informations légales, l'export et la suppression du compte sont réunis ici. Prenez toujours le temps de relire avant une action sensible."
            },
            {
                icon: "checkmark-circle-outline",
                title: "Confirmer vos sauvegardes",
                description: "Quand vous modifiez un réglage, Stockman affiche maintenant une confirmation discrète dans l'écran. Les pages légales ouvertes depuis Paramètres reviennent aussi directement vers cet écran pour éviter de vous renvoyer inutilement au tableau de bord."
            }
        ]
    },
    planner: {
        title: "Notes, calendrier et rappels",
        steps: [
            {
                icon: "alarm-outline",
                title: "Un espace personnel bien visible",
                description: "Le module regroupe vos notes privées et vos rappels personnels. Il reste distinct des alertes automatiques générées par Stockman."
            },
            {
                icon: "calendar-number-outline",
                title: "Le calendrier crée les rappels",
                description: "Touchez directement un jour du calendrier pour ouvrir un nouveau rappel avec cette date déjà préremplie."
            },
            {
                icon: "document-text-outline",
                title: "Les notes restent séparées",
                description: "Les notes sans date sont visibles dans leur propre section. Une note creee depuis le CRM affiche aussi le nom du client pour rester compréhensible."
            },
            {
                icon: "time-outline",
                title: "Choisir l'heure sans la taper",
                description: "Après avoir choisi une date, sélectionnez simplement l'heure voulue avec le sélecteur natif du téléphone. Les canaux dans l'application et push sont activés par défaut."
            },
            {
                icon: "checkmark-done-outline",
                title: "Terminer ou rouvrir un élément",
                description: "Marquez une tâche comme terminée quand elle est faite. Vous pouvez la rouvrir plus tard si vous devez la reprendre."
            }
        ]
    },
    subscription: {
        title: "Abonnement",
        steps: [
            {
                icon: "diamond-outline",
                title: "Lire d'abord votre statut",
                description: "Commencez par vérifier si votre accès est actif, en essai, limité ou expiré. Ce bloc vous dit immédiatement si vous devez agir maintenant ou si votre compte fonctionne normalement."
            },
            {
                icon: "card-outline",
                title: "Comparer les formules avec votre usage réel",
                description: "Ne choisissez pas seulement en regardant le prix. Comparez surtout les limites, le nombre de boutiques, l'équipe autorisée et les outils disponibles afin de prendre une formule adaptée à votre activité."
            },
            {
                icon: "phone-portrait-outline",
                title: "Choisir le bon mode de paiement",
                description: "L'ecran affiche uniquement les moyens reellement disponibles pour votre appareil et votre formule. Sur mobile, passez par la boutique de paiement affichee a l'ecran pour Starter et Pro. Le passage a Enterprise se gere sur le web et garde le meme compte. En test Google Play, utilisez un compte testeur autorise et verifiez que le produit est actif."
            },
              {
                  icon: "refresh-outline",
                  title: "Récupérer un abonnement existant",
                  description: "Après une réinstallation, un changement d'appareil ou une reconnexion, utilisez l'option de récupération si vous avez déjà payé. L'application reconnaît maintenant le plan plus largement puis recharge automatiquement votre statut pour éviter de rester bloqué sur Starter."
              },
            {
                icon: "mail-outline",
                title: "Suivre les rappels et le renouvellement",
                description: "Avant l'échéance, des rappels peuvent être envoyés pour éviter une coupure. Revenez dans cet écran si vous avez un doute après un paiement ou si vous devez confirmer la date du prochain renouvellement."
            },
            {
                icon: "shield-checkmark-outline",
                title: "Vérifier les liens légaux",
                description: "Depuis l'écran d'abonnement, ouvrez toujours les conditions d'utilisation et la politique de confidentialité si vous voulez relire les règles de renouvellement, d'annulation et de traitement des données."
            },
            {
                icon: "sparkles-outline",
                title: "Comprendre les limites IA",
                description: "Certaines fonctions IA dépendent du plan actif. Le résumé quotidien reste limité à une fois par jour, tandis que la détection d'anomalies, la suggestion de prix ou la génération de description peuvent être réservées à des formules supérieures."
            }
        ]
    },
    // ============ RESTAURANT ============
    restaurantDashboard: {
        title: "Pilotage Restaurant",
        steps: [
            { icon: "speedometer-outline", title: "Service du jour", description: "Suivez le chiffre d'affaires du jour, les couverts servis, le ticket moyen et l'occupation de salle." },
            { icon: "restaurant-outline", title: "Salle et cuisine", description: "Le tableau de bord restaurant réunit les tables en cours, les tickets cuisine et les réservations attendues." },
            { icon: "bar-chart-outline", title: "Heures de pointe", description: "Le graphique horaire aide à repérer les pics de service pour ajuster votre mise en place." },
            { icon: "calendar-outline", title: "Réservations du jour", description: "Suivez les arrivées et transformez une réservation en service sans ressaisie inutile." }
        ]
    },
    restaurantProducts: {
        title: "Carte et Recettes",
        steps: [
            { icon: "book-outline", title: "Créer un plat", description: "Ajoutez un plat au menu avec son prix, sa catégorie, sa station cuisine et son mode de production." },
            { icon: "flask-outline", title: "Lier une recette", description: "Pour un plat à la commande ou hybride, reliez une recette de service pour consommer les bons ingrédients." },
            { icon: "layers-outline", title: "Choisir le bon mode", description: "Utilisez 'à l'avance' pour un produit fini, 'à la commande' pour une préparation minute, et 'hybride' pour les deux." },
            { icon: "time-outline", title: "Piloter la disponibilité", description: "Gardez la carte alignée avec la cuisine en désactivant un plat indisponible ou sans préparation." }
        ]
    },
    restaurantPos: {
        title: "Caisse Restaurant",
        steps: [
            { icon: "restaurant-outline", title: "Associer une table", description: "Choisissez une table ou laissez sans table pour l'emporté. La commande ouverte reste attachée au bon service." },
            { icon: "cart-outline", title: "Construire la commande", description: "Ajoutez les plats du menu au panier. Les lignes déjà envoyées restent verrouillées pour garder l'historique." },
            { icon: "send-outline", title: "Envoyer en cuisine", description: "Créez une commande ouverte puis ajoutez de nouveaux plats au fil du service sans perdre la table ni les couverts." },
            { icon: "chatbubble-outline", title: "Notes de service", description: "Ajoutez des notes par ligne (« sans oignons ») ou globales pour transmettre des instructions à la cuisine." },
            { icon: "cash-outline", title: "Clôturer l'addition", description: "Encaissez la commande en fin de repas pour libérer la table et finaliser correctement le stock." }
        ]
    },
    restaurantHub: {
        title: "Centre de Service",
        steps: [
            { icon: "restaurant-outline", title: "Vue d'ensemble", description: "Le hub restaurant regroupe les accès rapides vers les tables, réservations, cuisine et vente comptoir." },
            { icon: "grid-outline", title: "Tables", description: "Consultez les tables libres, réservées ou occupées pour guider la salle en temps réel." },
            { icon: "calendar-outline", title: "Réservations", description: "Planifiez les arrivées, affectez une table et gardez les notes utiles au service." },
            { icon: "flame-outline", title: "Cuisine", description: "Les tickets envoyés en cuisine passent de 'en attente' à 'prêt' puis 'servi'." }
        ]
    },
    restaurantTables: {
        title: "Gestion des Tables",
        steps: [
            { icon: "grid-outline", title: "Statuts de table", description: "4 statuts : Libre (vert), Réservée (bleu), Occupée (orange), Nettoyage (gris). Touchez pour changer le statut." },
            { icon: "people-outline", title: "Capacité", description: "Renseignez la capacité de chaque table pour aider le placement des clients et les réservations." },
            { icon: "add-outline", title: "Créer une table", description: "Bouton '+' en haut : donnez un nom et une capacité. La table apparaît dans la grille." },
            { icon: "checkmark-done-outline", title: "Fin de service", description: "Quand l'addition est réglée, la table revient à l'état libre ou nettoyage selon votre organisation." }
        ]
    },
    restaurantReservations: {
        title: "Réservations",
        steps: [
            { icon: "calendar-outline", title: "Planifier une arrivée", description: "Enregistrez le nom du client, l'heure, le nombre de couverts et les demandes spéciales." },
            { icon: "time-outline", title: "Suivre les statuts", description: "Demandée → Confirmée → Arrivée. Ou bien : Annulée / No-show. Chaque statut a son badge couleur." },
            { icon: "swap-horizontal-outline", title: "Basculer en salle", description: "Quand le client arrive, assignez la table et ouvrez la commande pour lancer le service." }
        ]
    },
    restaurantKitchen: {
        title: "Cuisine",
        steps: [
            { icon: "receipt-outline", title: "Tickets entrants", description: "La cuisine reçoit les plats envoyés depuis la caisse avec table, quantités et notes utiles." },
            { icon: "checkmark-circle-outline", title: "Marquer prêt", description: "Passez un item ou une commande à l'état prêt pour informer la salle que le dressage est terminé." },
            { icon: "walk-outline", title: "Marquer servi", description: "Une fois livrée au client, marquez la commande servie pour garder une trace claire du service." },
            { icon: "refresh-outline", title: "Rafraîchir", description: "Actualisez la file d'attente pour voir les nouveaux tickets envoyés depuis la caisse." }
        ]
    },
    // ============ FOURNISSEUR ============
    supplierDashboard: {
        title: "Dashboard Fournisseur",
        steps: [
            { icon: "stats-chart-outline", title: "Vos KPIs", description: "8 indicateurs : produits, commandes, CA total, note moyenne, commandes en attente, CA du mois, panier moyen, clients actifs. Touchez (i) pour le détail." },
            { icon: "star-outline", title: "Notes & Avis", description: "Consultez la note moyenne et les commentaires de vos clients. Chaque avis affiche le nom, la note et la date." },
            { icon: "trophy-outline", title: "Top Produits", description: "Découvrez vos 5 produits les plus commandés avec le nombre d'unités vendues." },
            { icon: "people-outline", title: "Clients Actifs", description: "Voyez combien de commerçants différents commandent chez vous et le CA généré ce mois." },
            { icon: "receipt-outline", title: "Commandes Récentes", description: "Les 5 dernières commandes avec statut, montant et date. Accédez au détail pour traiter chaque commande." }
        ]
    },
    supplierCatalog: {
        title: "Gestion du Catalogue",
        steps: [
            { icon: "flash-outline", title: "Actions rapides utiles", description: "Le catalogue fournisseur reprend maintenant les vrais usages attendus : import CSV, création par texte, édition rapide du prix et du stock, sélection multiple et suppression." },
            { icon: "cloud-upload-outline", title: "Importer un CSV", description: "Préparez votre fichier catalogue, mappez les colonnes puis validez l'import. Avant confirmation, choisissez si les produits importés doivent être visibles tout de suite ou gardés masqués." },
            { icon: "document-text-outline", title: "Créer par texte", description: "Collez plusieurs lignes au format nom ; prix ; stock ; unité ; catégorie ; description pour créer rapidement plusieurs produits." },
            { icon: "create-outline", title: "Édition rapide et sélection multiple", description: "L'édition rapide affiche maintenant des libellés clairs pour le nom, le prix, le stock et la visibilité. La sélection multiple permet ensuite d'agir sur plusieurs produits à la fois, y compris pour les supprimer." }
        ]
    },
    supplierOrders: {
        title: "Commandes Reçues",
        steps: [
            { icon: "list-outline", title: "Nouvelles Commandes", description: "Les commandes en attente apparaissent ici. Consultez le détail (articles, quantités, montant) avant d'accepter ou refuser." },
            { icon: "checkmark-circle-outline", title: "Confirmer & Expédier", description: "Acceptez la commande puis marquez-la comme expédiée quand la livraison est en route." },
            { icon: "document-text-outline", title: "Créer une facture comme un commerçant", description: "Depuis l'onglet Factures, vous pouvez désormais créer une facture à partir d'une commande ou créer une facture manuelle complète avec client, lignes d'articles, quantités et prix unitaires." },
            { icon: "analytics-outline", title: "Suivi & Historique", description: "Filtrez par statut ou par période pour suivre toutes vos commandes passées, puis ouvrez les détails de facture pour relire l'en-tête du document, le client, les lignes, les montants et le statut de paiement dans un ordre de lecture plus clair." }
        ]
    },
    supplierSettings: {
        title: "Paramètres Fournisseur",
        steps: [
            { icon: "person-circle-outline", title: "Votre Profil", description: "Complétez votre profil fournisseur : nom d'entreprise, description, coordonnées, zones de livraison, délai moyen et montant minimum de commande." },
            { icon: "document-outline", title: "Documents et CGV", description: "Définissez le nom affiché sur vos documents, l'en-tête, le préfixe, vos CGV et le pied de page utilisés dans vos factures et autres documents de vente." },
            { icon: "information-circle-outline", title: "CGU et confidentialité", description: "Relisez directement depuis cet écran les CGU Stockman et la politique de confidentialité sans quitter l'espace fournisseur." },
            { icon: "swap-horizontal-outline", title: "Comptes sur cet appareil", description: "Ajoutez aussi un compte commerçant, staff ou un autre fournisseur sur ce téléphone. Vous pourrez ensuite basculer entre ces comptes sans refaire toute la connexion." },
            { icon: "help-circle-outline", title: "Aide, sécurité et suppression", description: "Le centre d'aide, le contact support, la gestion du mot de passe et la suppression du compte sont accessibles directement depuis les paramètres fournisseur." }
        ]
    },
    // ============ TRANSVERSES ============
    login: {
        title: "Connexion",
        steps: [
            { icon: "log-in-outline", title: "Se connecter", description: "Saisissez votre email et mot de passe. L'app vous redirige automatiquement vers votre espace selon votre rôle et, pour un compte staff, vers le premier module réellement autorisé." },
            { icon: "logo-google", title: "Connexion sociale", description: "Selon votre appareil, vous pouvez continuer avec Google ou Apple. Sur mobile, Google s'ouvre via le flux natif de l'app. Si c'est votre première inscription sociale, Stockman vous demande maintenant de confirmer votre pays, votre téléphone et votre secteur avant d'entrer dans l'application." },
            { icon: "eye-outline", title: "Mot de passe oublié", description: "Touchez 'Mot de passe oublié' pour recevoir un email de réinitialisation." },
            { icon: "flask-outline", title: "Mode Démo", description: "Testez l'app sans inscription avec des données pré-remplies. La session expire après un délai limité." }
        ]
    },
    register: {
        title: "Inscription",
        steps: [
            { icon: "person-add-outline", title: "Créer un compte", description: "Renseignez nom, email, mot de passe et téléphone. Choisissez votre profil : Commerçant ou Fournisseur." },
            { icon: "business-outline", title: "Secteur d'activité", description: "Choisissez parmi 21 secteurs (Épicerie, Pharmacie, Restaurant, etc.). Ce choix détermine les catégories par défaut et les modules visibles." },
            { icon: "globe-outline", title: "Pays", description: "Sélectionnez votre pays d'activité. La devise et les paramètres régionaux s'ajustent automatiquement." },
            { icon: "logo-google", title: "Inscription avec Google", description: "Si vous créez votre compte via Google sur mobile, Stockman vous fait maintenant confirmer le pays, le téléphone et le secteur juste après la connexion afin d'appliquer la bonne devise puis d'enchaîner sur la vérification SMS comme dans le flux classique." }
        ]
    },
    pin: {
        title: "Code PIN & Biométrie",
        steps: [
            { icon: "keypad-outline", title: "Code PIN", description: "Créez un code à 4 chiffres pour sécuriser l'accès à l'app. Saisissez-le à chaque ouverture." },
            { icon: "finger-print-outline", title: "Biométrie", description: "Activez l'empreinte digitale ou Face ID pour déverrouiller plus rapidement (nécessite le PIN actif)." },
            { icon: "log-out-outline", title: "Déconnexion", description: "Depuis l'écran PIN, touchez 'Déconnexion' pour revenir à l'écran de connexion. Si la biométrie est activée, vous pourrez vous reconnecter rapidement avec l'empreinte ou Face ID." }
        ]
    },
    storeSelector: {
        title: "Sélecteur de Boutique",
        steps: [
            { icon: "business-outline", title: "Boutique Active", description: "Le nom de votre boutique active s'affiche en haut. Toutes les données affichées concernent cette boutique." },
            { icon: "swap-horizontal-outline", title: "Changer de Boutique", description: "Touchez le nom pour voir la liste de vos boutiques autorisées. Sélectionnez-en une autre pour basculer." },
            { icon: "lock-closed-outline", title: "Données Isolées", description: "Chaque boutique a son propre stock, ses propres ventes et ses propres clients. Rien n'est mélangé." }
        ]
    },
    offlineMode: {
        title: "Mode Hors Ligne",
        steps: [
            { icon: "cloud-offline-outline", title: "Lire les données déjà chargées", description: "Quand la connexion tombe, l'application continue d'afficher les données déjà mises en cache sur l'appareil pour vous laisser consulter l'essentiel." },
            { icon: "sync-outline", title: "Actions mises en attente", description: "Un bandeau de synchronisation vous indique combien d'actions attendent encore le réseau. Les ventes compatibles, certaines écritures comptables, les fiches clients et les paiements clients sont renvoyés automatiquement." },
            { icon: "checkmark-done-outline", title: "Limites à connaître", description: "Le mode hors ligne n'est pas total. Les flux d'authentification, d'abonnement, d'IA, d'upload et certaines actions avancées restent dépendants d'une connexion active." }
        ]
    },
    helpCenter: {
        title: "Centre d'Aide",
        steps: [
            { icon: "search-outline", title: "Chercher avant de demander", description: "Commencez par la recherche ou par le guide du module concerné. C'est souvent le moyen le plus rapide de comprendre un bouton, un écran ou une action sans quitter votre travail." },
            { icon: "book-outline", title: "Lancer le guide du bon module", description: "Chaque module a son propre parcours. Ouvrez le guide lié à l'écran où vous êtes pour obtenir une explication plus concrète et plus utile qu'une réponse générale." },
            { icon: "sparkles-outline", title: "Poser une question à l'assistant", description: "Utilisez l'assistant quand votre question porte sur un usage précis, une anomalie ou une marche à suivre. Formulez la situation clairement pour obtenir une réponse plus utile." },
            { icon: "chatbubble-outline", title: "Contacter le support si nécessaire", description: "Créez un ticket quand vous avez déjà essayé de comprendre le problème mais qu'une aide humaine reste nécessaire. Décrivez le contexte, le module concerné et ce que vous attendiez." },
            { icon: "warning-outline", title: "Signaler un problème important", description: "Utilisez le signalement quand il s'agit d'un sujet sensible comme la facturation, un blocage technique ou une incohérence sérieuse. Plus votre description est précise, plus la résolution sera rapide." }
        ]
    }
};

