import { GuideStep } from "../components/ScreenGuide";

export const GUIDES: Record<string, { title: string; steps: GuideStep[] }> = {
    products: {
        title: "Gestion des Produits",
        steps: [
            {
                icon: "search-outline",
                title: "Trouver & Filtrer",
                description: "Utilisez la barre de recherche ou les puces catégories (colorées) pour naviguer rapidement dans votre catalogue."
            },
            {
                icon: "pricetag-outline",
                title: "État du Stock",
                description: "Les badges vous guident : Rouge (Rupture), Orange (Bas), Bleu (Surstock) et Vert (Normal)."
            },
            {
                icon: "add-circle-outline",
                title: "Mouvements Rapides",
                description: "Les boutons 'Entrée' et 'Sortie' permettent d'ajuster le stock (livraison, perte) sans passer par une commande."
            },
            {
                icon: "qr-code-outline",
                title: "Étiquetage",
                description: "Le bouton 'Étiquette' génère une fiche PDF avec QR Code prête à imprimer pour vos rayons."
            },
            {
                icon: "settings-outline",
                title: "Organisation",
                description: "Gérez vos catégories via l'icône d'engrenage pour structurer votre inventaire efficacement."
            }
        ]
    },
    sales: {
        title: "Caisse Enregistreuse",
        steps: [
            {
                icon: "barcode-outline",
                title: "Scanner & Ajouter",
                description: "Bipez vos articles ou cliquez dessus dans la liste pour remplir le panier. Le total se met à jour instantanément."
            },
            {
                icon: "person-add-outline",
                title: "Client & Fidélité",
                description: "Associez un client à la vente pour qu'il cumule ses points de fidélité. Créez-en un nouveau en 2 secondes."
            },
            {
                icon: "cash-outline",
                title: "Encaissement",
                description: "Choisissez le mode de paiement. Une fois validé, le stock est débité et la vente apparait dans le bilan."
            },
            {
                icon: "receipt-outline",
                title: "Ticket de Caisse",
                description: "Après validation, imprimez le ticket ou envoyez-le par WhatsApp/Email à votre client."
            }
        ]
    },
    accounting: {
        title: "Gestion Financière",
        steps: [
            {
                icon: "calendar-outline",
                title: "Périodes & Filtres",
                description: "Analysez vos performances sur la journée, la semaine ou le mois via les filtres en haut de page."
            },
            {
                icon: "stats-chart-outline",
                title: "Bénéfices & Marges",
                description: "Ne suivez pas que le Chiffre d'Affaires. Gardez un œil sur vos bénéfices réels et vos produits les plus rentables."
            },
            {
                icon: "document-text-outline",
                title: "Factures Pro",
                description: "Créez des factures PDF avec TVA en quelques clics et envoyez-les directement à vos clients."
            },
            {
                icon: "wallet-outline",
                title: "Trésorerie",
                description: "Le bilan compare vos ventes et vos dépenses pour vous donner la santé financière exacte de votre commerce."
            }
        ]
    },
    crm: {
        title: "Clients & Fidélité",
        steps: [
            {
                icon: "people",
                title: "Fichier Client",
                description: "Enregistrez vos clients pour suivre leurs achats. Ajoutez leur anniversaire pour des offres spéciales."
            },
            {
                icon: "gift",
                title: "Fidélité",
                description: "Les points sont calculés automatiquement à chaque achat. Vous pouvez définir des paliers de récompense."
            },
            {
                icon: "megaphone",
                title: "Marketing",
                description: "Créez des campagnes SMS ou Email pour relancer vos clients ou annoncer des promotions."
            },
            {
                icon: "card-outline",
                title: "Dettes & Crédits",
                description: "Suivez les dettes. 'Paiement' = le client rembourse. 'Dette' = vous lui prêtez de l'argent (dette manuelle)."
            }
        ]
    },
    suppliers: {
        title: "Relations Fournisseurs",
        steps: [
            {
                icon: "people-outline",
                title: "Annuaire Interactif",
                description: "Appelez ou envoyez un mail à vos fournisseurs en un clic directement depuis leur fiche."
            },
            {
                icon: "cart-outline",
                title: "Commandes & Réappro",
                description: "Créez vos bons de commande ici. Une fois la marchandise reçue, validez la commande pour incrémenter votre stock."
            },
            {
                icon: "time-outline",
                title: "Historique",
                description: "Gardez une trace de tous vos achats passés pour faciliter votre comptabilité et vos réclamations."
            },
            {
                icon: "globe-outline",
                title: "Marketplace",
                description: "Accédez à un réseau de fournisseurs vérifiés pour découvrir de nouveaux produits aux meilleurs prix."
            }
        ]
    },
    dashboard: {
        title: "Tableau de Bord",
        steps: [
            {
                icon: "storefront-outline",
                title: "Vue d'ensemble",
                description: "Bienvenue sur votre tableau de bord. Ici, vous avez une vision globale de l'activité de votre boutique sélectionnée en haut à droite."
            },
            {
                icon: "trending-up-outline",
                title: "Indicateurs Clés (KPIs)",
                description: "Suivez en temps réel votre Chiffre d'Affaires jour/mois, le nombre total de produits et la valeur financière de votre stock."
            },
            {
                icon: "pie-chart-outline",
                title: "Santé du Stock",
                description: "Surveillez les produits en rupture, en stock bas (à commander) ou en surstock pour optimiser votre trésorerie."
            },
            {
                icon: "alert-circle-outline",
                title: "Alertes Péremption",
                description: "Si vous gérez des produits périssables, les lots arrivant à expiration dans les 30 jours s'affichent ici."
            },
            {
                icon: "repeat-outline",
                title: "Réapprovisionnement",
                description: "Le système analyse vos ventes et vous suggère automatiquement les produits à commander pour éviter les ruptures."
            },
            {
                icon: "bar-chart-outline",
                title: "Statistiques & Historique",
                description: "Utilisez les boutons en bas de page pour accéder aux graphiques détaillés ou à l'historique complet des mouvements de stock."
            }
        ]
    },
    orders: {
        title: "Commandes Fournisseurs",
        steps: [
            { icon: "add-circle", title: "Nouvelle commande", description: "Créez une commande pour réapprovisionner votre stock auprès de vos fournisseurs." },
            { icon: "time", title: "Suivi", description: "Suivez l'état de vos commandes (En attente, Expédiée, Livrée)." },
            { icon: "checkbox", title: "Réception", description: "Validez la réception des marchandises pour mettre à jour votre stock automatiquement." }
        ]
    },
    alerts: {
        title: "Alertes de Stock",
        steps: [
            { icon: "options", title: "Configuration", description: "Définissez des règles pour être alerté quand le stock est bas, en rupture ou dormant." },
            { icon: "notifications", title: "Notifications", description: "Consultez la liste des produits nécessitant votre attention." },
            { icon: "checkmark-done", title: "Gestion", description: "Marquez les alertes comme lues ou supprimez-les une fois le problème résolu." }
        ]
    },
    pos: {
        title: "Point de Vente",
        steps: [
            { icon: "barcode-outline", title: "Scanner & Ajouter", description: "Scannez le code-barres d'un article ou recherchez-le dans la liste pour l'ajouter au panier." },
            { icon: "cart-outline", title: "Gestion du Panier", description: "Ajustez les quantités avec les boutons +/−. Le total se calcule en temps réel." },
            { icon: "person-add-outline", title: "Client & Fidélité", description: "Associez un client existant ou créez-en un nouveau pour cumuler ses points de fidélité." },
            { icon: "cash-outline", title: "Encaissement", description: "Choisissez le mode de paiement (espèces, mobile money, carte, crédit) et validez la vente." },
            { icon: "receipt-outline", title: "Ticket de Caisse", description: "Imprimez le ticket ou partagez-le par WhatsApp/Email directement depuis l'écran de confirmation." }
        ]
    },
    activity: {
        title: "Flux d'Activité",
        steps: [
            { icon: "time-outline", title: "Journal en Temps Réel", description: "Consultez toutes les actions effectuées dans votre boutique : ventes, mouvements de stock, modifications." },
            { icon: "filter-outline", title: "Filtrer par Type", description: "Filtrez par module (stock, caisse, CRM, comptabilité) pour retrouver une action précise." },
            { icon: "people-outline", title: "Actions par Utilisateur", description: "Identifiez quel employé a effectué chaque action grâce au suivi nominatif." }
        ]
    },
    users: {
        title: "Gestion des Utilisateurs",
        steps: [
            { icon: "person-add-outline", title: "Ajouter un Employé", description: "Créez un compte pour chaque employé avec son email et un mot de passe temporaire." },
            { icon: "shield-checkmark-outline", title: "Permissions Granulaires", description: "Définissez les droits par module : aucun accès, lecture seule, ou lecture + écriture." },
            { icon: "key-outline", title: "Niveaux d'Accès", description: "Un caissier peut n'avoir accès qu'à la caisse, un gérant à tout sauf la comptabilité, etc." },
            { icon: "share-social-outline", title: "Partage des Identifiants", description: "Envoyez les identifiants de connexion par WhatsApp en un clic." }
        ]
    },
    settings: {
        title: "Paramètres",
        steps: [
            { icon: "storefront-outline", title: "Gérer vos Boutiques", description: "Créez plusieurs boutiques et basculez entre elles. Chaque boutique a son propre stock et ses propres données." },
            { icon: "color-palette-outline", title: "Thème & Apparence", description: "Activez le mode sombre pour un confort visuel optimal, surtout en conditions de faible luminosité." },
            { icon: "toggle-outline", title: "Modules Actifs", description: "Activez ou désactivez les modules selon vos besoins : CRM, comptabilité, fournisseurs, etc." },
            { icon: "notifications-outline", title: "Notifications Push", description: "Recevez des alertes en temps réel quand un produit est en rupture, en stock bas ou dormant." }
        ]
    },
    supplierDashboard: {
        title: "Dashboard Fournisseur",
        steps: [
            { icon: "stats-chart-outline", title: "Vos KPIs", description: "Suivez votre chiffre d'affaires total, le nombre de commandes reçues et votre panier moyen." },
            { icon: "star-outline", title: "Notes & Avis", description: "Consultez la note moyenne que vos clients vous attribuent et leurs commentaires." },
            { icon: "trophy-outline", title: "Produits Populaires", description: "Découvrez quels sont vos 5 produits les plus commandés par vos clients commerçants." },
            { icon: "people-outline", title: "Clients Actifs", description: "Voyez combien de commerçants différents commandent chez vous et le CA généré ce mois." }
        ]
    },
    supplierCatalog: {
        title: "Gestion du Catalogue",
        steps: [
            { icon: "add-circle-outline", title: "Ajouter un Produit", description: "Ajoutez vos produits au catalogue avec nom, description, prix et quantité minimum de commande." },
            { icon: "pricetag-outline", title: "Prix & Disponibilité", description: "Mettez à jour vos prix et basculez la disponibilité d'un produit en un clic." },
            { icon: "grid-outline", title: "Catégories", description: "Organisez votre catalogue par catégories et sous-catégories pour faciliter la recherche des commerçants." }
        ]
    },
    supplierOrders: {
        title: "Commandes Reçues",
        steps: [
            { icon: "list-outline", title: "Nouvelles Commandes", description: "Les commandes en attente apparaissent ici. Consultez le détail avant d'accepter ou refuser." },
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
    }
};
