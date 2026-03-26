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
                description: "Le système analyse vos ventes et suggère les produits à commander. Appuyez sur 'Commander' pour créer directement une commande fournisseur."
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
                title: "Trouver & Filtrer",
                description: "Utilisez la barre de recherche (nom, SKU, code-barres) et les puces catégories pour retrouver rapidement un article. Sur les comptes multi-boutiques, les produits affichés dépendent toujours de la boutique active."
            },
            {
                icon: "pricetag-outline",
                title: "État du Stock",
                description: "Badges sur chaque produit : Rouge (Rupture = 0), Orange (Bas ≤ seuil), Bleu (Surstock > 3× seuil) et Vert (Normal)."
            },
            {
                icon: "add-circle-outline",
                title: "Mouvements Rapides",
                description: "Boutons 'Entrée' et 'Sortie' sur chaque produit pour ajuster le stock (livraison, perte, correction). Annulez un mouvement via l'historique."
            },
            {
                icon: "create-outline",
                title: "Créer ou Modifier un Produit",
                description: "La fiche produit permet de renseigner le nom, le SKU, la quantité, l'unité, les prix, le stock minimum, le fournisseur, la date de péremption et les catégories. En modification, les changements sont enregistrés sur le produit déjà existant."
            },
            {
                icon: "qr-code-outline",
                title: "Étiquetage",
                description: "Le bouton 'Étiquette' génère une fiche PDF avec QR Code prête à imprimer pour vos rayons."
            },
            {
                icon: "cloud-upload-outline",
                title: "Import en Masse",
                description: "Importez vos produits via CSV/Excel (import fichier) ou par copier-coller de texte libre (import texte avec parsing IA)."
            },
            {
                icon: "scan-outline",
                title: "Scan par Lot",
                description: "Scannez plusieurs codes-barres à la suite pour des entrées/sorties rapides ou un inventaire complet."
            },
            {
                icon: "location-outline",
                title: "Emplacements de Stockage",
                description: "Si cette gestion est disponible sur votre compte, vous pouvez ranger vos produits dans une structure claire comme « Allée 1 / Niveau 2 / Étagère 7 ». Depuis la fiche produit, affectez un emplacement précis pour mieux organiser le stock, préparer l'inventaire et retrouver plus vite vos articles."
            },
            {
                icon: "settings-outline",
                title: "Catégories",
                description: "Gérez vos catégories via l'icône d'engrenage : créez, supprimez et organisez pour structurer votre inventaire."
            },
            {
                icon: "download-outline",
                title: "Export CSV",
                description: "Exportez votre liste de produits en CSV via l'icône de téléchargement dans le header pour analyse ou sauvegarde."
            }
        ]
    },
    pos: {
        title: "Point de Vente",
        steps: [
            {
                icon: "barcode-outline",
                title: "Scanner & Ajouter",
                description: "Scannez le code-barres d'un article ou recherchez-le dans la liste pour l'ajouter au panier. Basculez entre vue grille et liste."
            },
            {
                icon: "cart-outline",
                title: "Gestion du Panier",
                description: "Ajustez les quantités avec +/−, supprimez une ligne, ou videz tout le panier. Le total se calcule en temps réel."
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
                description: "Après validation, imprimez le ticket, envoyez-le par WhatsApp ou Email directement depuis l'écran de confirmation."
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
                title: "KPIs avec Explications",
                description: "6 cartes KPI : CA, Bénéfice brut, Dépenses, Bénéfice net, Articles vendus, Panier moyen. Touchez l'icône (i) pour comprendre chaque indicateur."
            },
            {
                icon: "wallet-outline",
                title: "Dépenses",
                description: "Ajoutez vos dépenses par catégorie (Loyer, Salaire, Transport, etc.). Le bénéfice net est automatiquement recalculé."
            },
            {
                icon: "document-text-outline",
                title: "Factures PDF",
                description: "Créez des factures pro avec TVA depuis une vente existante ou manuellement. Envoyez-les directement à vos clients."
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
                description: "Onglet Compte de la fiche client : ajoutez une dette manuelle, enregistrez un paiement, ou annulez un paiement. L'historique est complet."
            },
            {
                icon: "megaphone",
                title: "Campagnes Marketing",
                description: "Créez des campagnes SMS ou Email ciblées : tous les clients, par palier, par catégorie ou sélection manuelle."
            },
            {
                icon: "gift",
                title: "Promotions",
                description: "Créez des promotions (% ou montant fixe) avec dates de validité. Activez/désactivez en un clic."
            },
            {
                icon: "call-outline",
                title: "Contact Direct",
                description: "Depuis la fiche client : appelez, envoyez un SMS, ouvrez WhatsApp ou envoyez un email en un seul toucher."
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
                title: "Annuaire Interactif",
                description: "Appelez ou envoyez un mail à vos fournisseurs en un clic. Chaque fiche contient les produits liés, le journal et l'historique des commandes."
            },
            {
                icon: "cart-outline",
                title: "Commandes & Réappro",
                description: "Créez vos bons de commande. Validez la réception (complète ou partielle) pour incrémenter votre stock automatiquement."
            },
            {
                icon: "link-outline",
                title: "Produits & Prix",
                description: "Liez des produits à un fournisseur pour suivre l'évolution des prix d'achat et faciliter les commandes futures."
            },
            {
                icon: "globe-outline",
                title: "Marketplace Pro",
                description: "Accédez à un réseau de fournisseurs vérifiés. Commandez depuis le catalogue fournisseur pour une intégration directe en stock."
            },
            {
                icon: "chatbubble-outline",
                title: "Chat & Invitations",
                description: "Discutez avec vos fournisseurs directement dans l'app. Invitez un nouveau fournisseur à rejoindre la plateforme."
            },
            {
                icon: "document-text-outline",
                title: "Factures Fournisseur",
                description: "Scannez ou créez des factures fournisseur depuis la fiche. Gardez tout l'historique d'achat au même endroit."
            }
        ]
    },
    orders: {
        title: "Commandes Fournisseurs",
        steps: [
            {
                icon: "add-circle",
                title: "Nouvelle Commande",
                description: "Créez une commande en choisissant le fournisseur, puis ajoutez les articles avec quantités et prix. Ajoutez des notes si besoin."
            },
            {
                icon: "time",
                title: "Suivi par Statut",
                description: "Filtrez vos commandes par statut : En attente, Confirmée, Expédiée, Livrée, Annulée. Chaque statut a son badge couleur."
            },
            {
                icon: "checkbox",
                title: "Réception & Stock",
                description: "Validez la réception complète ou partielle (quantités reçues par ligne). Le stock est automatiquement incrémenté."
            },
            {
                icon: "arrow-undo-outline",
                title: "Retours de Marchandise",
                description: "Après livraison, sélectionnez les articles à retourner avec un motif. Le stock est ajusté en conséquence."
            },
            {
                icon: "star-outline",
                title: "Noter le Fournisseur",
                description: "Après livraison, attribuez une note (1 à 5 étoiles) et un commentaire. Les notes sont visibles dans la marketplace."
            },
            {
                icon: "camera-outline",
                title: "Scanner une Facture",
                description: "Capturez la facture papier du fournisseur avec la caméra pour l'archiver directement dans la commande."
            }
        ]
    },
    alerts: {
        title: "Alertes de Stock",
        steps: [
            {
                icon: "color-palette-outline",
                title: "Types d'Alertes",
                description: "Rouge (rupture = 0), Orange (stock bas ≤ seuil), Bleu (surstock > 3× seuil), Gris (dormant 30j+ sans vente), Jaune (péremption proche)."
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
                description: "Recevez une notification instantanée sur votre téléphone dès qu'un produit passe en rupture ou en stock bas."
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
                title: "Journal en Temps Réel",
                description: "L'écran affiche les principales actions enregistrées sur votre compte et sur la boutique active : ventes, mouvements de stock, créations, suppressions et modifications importantes."
            },
            {
                icon: "filter-outline",
                title: "Lire le Journal",
                description: "Chaque ligne indique qui a agi, à quelle heure et sur quel module. Utilisez cet écran pour reconstituer une chronologie, comprendre une anomalie ou vérifier une opération récente."
            },
            {
                icon: "people-outline",
                title: "Suivi par Utilisateur",
                description: "Identifiez quel employé, manager ou administrateur a effectué une action. C'est utile pour le contrôle interne, l'organisation d'équipe et les vérifications après incident."
            },
            {
                icon: "business-outline",
                title: "Contexte Boutique",
                description: "Sur les comptes multi-boutiques, l'historique doit être lu en tenant compte de la boutique active. Pour une analyse complète, vérifiez toujours le contexte avant d'interpréter une action."
            },
            {
                icon: "refresh-outline",
                title: "Actualisation",
                description: "Tirez vers le bas pour rafraîchir le journal. Les nouvelles actions apparaissent en temps réel."
            }
        ]
    },
    users: {
        title: "Gestion des Utilisateurs",
        steps: [
            {
                icon: "person-add-outline",
                title: "Ajouter un Employé",
                description: "Créez un compte avec email et mot de passe. Choisissez le rôle, les boutiques autorisées et le niveau d'accès adapté à la mission de la personne."
            },
            {
                icon: "shield-checkmark-outline",
                title: "Permissions Granulaires",
                description: "Par module (Stock, Caisse, Comptabilité, CRM, Fournisseurs, Personnel) : aucun accès, lecture seule, ou lecture + écriture."
            },
            {
                icon: "briefcase-outline",
                title: "Rôles Manager vs Staff",
                description: "Un Manager avec droit d'écriture sur Personnel peut créer d'autres comptes. Un Staff n'a accès qu'aux modules autorisés."
            },
            {
                icon: "share-social-outline",
                title: "Partage par WhatsApp",
                description: "Envoyez les identifiants de connexion par WhatsApp en un clic. L'employé se connecte avec son email et mot de passe."
            },
            {
                icon: "business-outline",
                title: "Boutiques Autorisées",
                description: "Chaque employé n'accède qu'aux boutiques que vous lui assignez. Les données restent cloisonnées par boutique et le changement de boutique ne donne pas accès aux autres données non autorisées."
            },
            {
                icon: "briefcase-outline",
                title: "Rôles Avancés",
                description: "Selon les accès disponibles sur votre compte, certains profils peuvent piloter plusieurs boutiques tandis que d'autres restent limités à une ou plusieurs boutiques précises. Attribuez ces rôles avec prudence."
            },
            {
                icon: "list-circle-outline",
                title: "Limites de votre Formule",
                description: "Le nombre d'employés autorisés dépend de votre formule. Si vous atteignez la limite, l'écran Abonnement vous indique la formule la plus adaptée pour continuer à agrandir votre équipe."
            }
        ]
    },
    settings: {
        title: "Paramètres",
        steps: [
            {
                icon: "person-outline",
                title: "Profil & Compte",
                description: "Consultez votre nom, email, rôle et formule active. Changez votre mot de passe ou votre photo de profil."
            },
            {
                icon: "language-outline",
                title: "Langue",
                description: "15 langues disponibles : Français, English, Wolof, Peul, Arabe, Espagnol, Portugais, Allemand, Italien, et plus."
            },
            {
                icon: "color-palette-outline",
                title: "Thème & Apparence",
                description: "Activez le mode sombre pour un confort visuel optimal. Le thème s'applique à toute l'application."
            },
            {
                icon: "toggle-outline",
                title: "Modules Actifs",
                description: "Activez/désactivez CRM, Comptabilité, Fournisseurs, Alertes, Activité. Les onglets correspondants apparaissent ou disparaissent."
            },
            {
                icon: "storefront-outline",
                title: "Boutiques",
                description: "Créez et gérez vos boutiques. Modifiez le nom, l'adresse et les documents liés. Selon votre compte, vous pouvez avoir une ou plusieurs boutiques à administrer."
            },
            {
                icon: "business-outline",
                title: "Centre de Pilotage",
                description: "Si cet espace est disponible sur votre compte, il regroupe le pilotage des boutiques, de l'équipe et de l'organisation avancée du stock depuis un écran dédié."
            },
            {
                icon: "document-text-outline",
                title: "Documents de Vente",
                description: "Personnalisez vos tickets de caisse (nom, pied de page) et vos factures (raison sociale, préfixe, mentions légales)."
            },
            {
                icon: "notifications-outline",
                title: "Notifications Push",
                description: "Activez/désactivez les alertes : stock bas, rupture, nouvelle vente, nouveau client. Définissez vos contacts d'alerte."
            },
            {
                icon: "receipt-outline",
                title: "Fiscalité & TVA",
                description: "Activez la TVA, définissez le taux par défaut et la mention légale affichée sur vos factures."
            },
            {
                icon: "lock-closed-outline",
                title: "Sécurité",
                description: "Activez le code PIN pour verrouiller l'app au lancement. Ajoutez la biométrie (empreinte, Face ID) pour un accès rapide."
            },
            {
                icon: "help-circle-outline",
                title: "Aide & Support",
                description: "Le centre d'aide regroupe les guides de chaque module. Servez-vous-en pour comprendre un écran, une action, un bouton ou un flux complet avant de contacter le support."
            },
            {
                icon: "download-outline",
                title: "Données & RGPD",
                description: "Exportez toutes vos données en JSON. La suppression de compte est définitive et irréversible."
            }
        ]
    },
    subscription: {
        title: "Abonnement",
        steps: [
            {
                icon: "diamond-outline",
                title: "Votre Formule Actuelle",
                description: "Consultez la formule active sur votre compte, son statut (actif, essai, expiré) et les limites qui s'appliquent à votre utilisation."
            },
            {
                icon: "card-outline",
                title: "Comparer les Formules",
                description: "Comparez les formules selon vos besoins : nombre de boutiques, nombre d'employés, accès web et outils avancés. Utilisez cet écran pour choisir ce qui correspond réellement à votre activité."
            },
            {
                icon: "phone-portrait-outline",
                title: "Paiement",
                description: "Selon votre appareil et votre compte, le règlement peut se faire par achat intégré mobile ou par lien de paiement sécurisé. L'écran affiche uniquement les options réellement disponibles pour vous."
            },
            {
                icon: "refresh-outline",
                title: "Récupérer mon Abonnement",
                description: "Après une réinstallation ou un changement de téléphone, retrouvez votre abonnement existant sans repayer."
            },
            {
                icon: "mail-outline",
                title: "Rappels et Renouvellement",
                description: "Avant la fin de période, des rappels peuvent être envoyés pour éviter une interruption. Si votre accès est limité, revenez dans cet écran pour vérifier votre statut et reprendre le plan adapté."
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
            { icon: "add-circle-outline", title: "Ajouter un Produit", description: "Ajoutez vos produits au catalogue avec nom, description, prix, quantité minimum de commande et photos." },
            { icon: "pricetag-outline", title: "Prix & Disponibilité", description: "Mettez à jour vos prix et basculez la disponibilité d'un produit en un clic. Les commerçants voient les changements en temps réel." },
            { icon: "grid-outline", title: "Catégories", description: "Organisez votre catalogue par catégories et sous-catégories pour faciliter la recherche des commerçants." }
        ]
    },
    supplierOrders: {
        title: "Commandes Reçues",
        steps: [
            { icon: "list-outline", title: "Nouvelles Commandes", description: "Les commandes en attente apparaissent ici. Consultez le détail (articles, quantités, montant) avant d'accepter ou refuser." },
            { icon: "checkmark-circle-outline", title: "Confirmer & Expédier", description: "Acceptez la commande puis marquez-la comme expédiée quand la livraison est en route." },
            { icon: "analytics-outline", title: "Suivi & Historique", description: "Filtrez par statut ou par période pour suivre toutes vos commandes passées et en cours." }
        ]
    },
    supplierSettings: {
        title: "Paramètres Fournisseur",
        steps: [
            { icon: "person-circle-outline", title: "Votre Profil", description: "Complétez votre profil fournisseur : nom d'entreprise, description, logo, coordonnées." },
            { icon: "business-outline", title: "Infos Entreprise", description: "Renseignez vos zones de livraison, délai moyen et montant minimum de commande." }
        ]
    },
    // ============ TRANSVERSES ============
    login: {
        title: "Connexion",
        steps: [
            { icon: "log-in-outline", title: "Se connecter", description: "Saisissez votre email et mot de passe. L'app vous redirige automatiquement vers votre espace selon votre rôle." },
            { icon: "eye-outline", title: "Mot de passe oublié", description: "Touchez 'Mot de passe oublié' pour recevoir un email de réinitialisation." },
            { icon: "flask-outline", title: "Mode Démo", description: "Testez l'app sans inscription avec des données pré-remplies. La session expire après un délai limité." }
        ]
    },
    register: {
        title: "Inscription",
        steps: [
            { icon: "person-add-outline", title: "Créer un compte", description: "Renseignez nom, email, mot de passe et téléphone. Choisissez votre profil : Commerçant ou Fournisseur." },
            { icon: "business-outline", title: "Secteur d'activité", description: "Choisissez parmi 21 secteurs (Épicerie, Pharmacie, Restaurant, etc.). Ce choix détermine les catégories par défaut et les modules visibles." },
            { icon: "globe-outline", title: "Pays", description: "Sélectionnez votre pays d'activité. La devise et les paramètres régionaux s'ajustent automatiquement." }
        ]
    },
    pin: {
        title: "Code PIN & Biométrie",
        steps: [
            { icon: "keypad-outline", title: "Code PIN", description: "Créez un code à 4 chiffres pour sécuriser l'accès à l'app. Saisissez-le à chaque ouverture." },
            { icon: "finger-print-outline", title: "Biométrie", description: "Activez l'empreinte digitale ou Face ID pour déverrouiller plus rapidement (nécessite le PIN actif)." },
            { icon: "log-out-outline", title: "Déconnexion", description: "Depuis l'écran PIN, touchez 'Déconnexion' pour revenir à l'écran de connexion." }
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
            { icon: "cloud-offline-outline", title: "Bannière Rouge", description: "Quand vous perdez la connexion, un bandeau rouge 'Vous êtes hors ligne' apparaît en haut de l'écran." },
            { icon: "sync-outline", title: "Synchronisation", description: "Un bandeau orange indique le nombre d'actions en attente de synchronisation. Elles seront envoyées dès le retour du réseau." },
            { icon: "checkmark-done-outline", title: "Fonctionnement Dégradé", description: "En mode hors ligne, vous pouvez continuer à vendre et ajuster le stock. Les données se synchronisent automatiquement." }
        ]
    },
    helpCenter: {
        title: "Centre d'Aide",
        steps: [
            { icon: "book-outline", title: "Guides par Module", description: "Chaque module a son guide. Sélectionnez-en un pour revoir les explications pas-à-pas de l'écran." },
            { icon: "sparkles-outline", title: "Assistant IA", description: "Posez une question à l'assistant IA (icône étincelle) pour une aide contextuelle instantanée." },
            { icon: "chatbubble-outline", title: "Tickets Support", description: "Créez un ticket avec sujet et description. Suivez les réponses de l'équipe dans l'onglet 'Mes tickets'." },
            { icon: "warning-outline", title: "Signaler un Problème", description: "Le formulaire de litige (Facturation, Technique, Paiement, Autre) envoie votre demande à l'administration." }
        ]
    }
};
