# Stockman Basic et thèmes e-commerce

Le site actuel porte le nom Stockman Basic et l'identifiant technique `legacy-v1`. Son rendu, son catalogue, son panier et ses commandes restent inchangés pour Starter, Pro et Enterprise. L'identification du modèle n'active aucun site et ne modifie ni les domaines ni la boutique liée.

La configuration du site reste dans Paramètres > Boutique en ligne. E-com reste consacré aux commandes et aux statistiques. Starter et Pro conservent la consultation du back-office web ; Enterprise conserve la gestion web selon ses permissions.

Sept modèles sont disponibles pour Starter, Pro et Enterprise : Stockman Basic, Atelier, Marché, Vitrine, Éclat, Prestige et Bazar. La bibliothèque est conçue pour s'enrichir progressivement, sans limite commerciale codée en dur ; les droits par modèle et par abonnement se règlent côté serveur. Enterprise dispose sur le web d'un éditeur visuel pour tous les modèles à sections (tous sauf Stockman Basic), avec lequel il peut aussi créer des pages personnalisées.

## Première configuration

À sa première entrée dans E-com ou dans Paramètres, un administrateur opérationnel autorisé peut recevoir la proposition « Bienvenue dans votre boutique en ligne ! ». Elle indique que la boutique dispose déjà d'un modèle de site prêt à personnaliser (Stockman Basic). « Configurer mon site » ouvre Paramètres > Boutique en ligne, sans activer le site. « Plus tard » ferme la proposition et enregistre ce choix. Dans les deux cas, Stockman reste utilisable normalement et le site peut être configuré à tout moment depuis Paramètres > Boutique en ligne.

La proposition n'est faite qu'une fois par compte et par site. E-com, Paramètres et tous les appareils partagent le même état, conservé sur le serveur. Elle ne s'affiche pas aux sites déjà établis : site activé, réglages déjà enregistrés ou commandes déjà reçues. Un site désactivé n'est pas considéré, à lui seul, comme non configuré. Tout enregistrement réussi des réglages du site marque la configuration comme faite.

Sur l'application mobile, la proposition apparaît dans une fenêtre non bloquante au-dessus de la barre d'onglets, sur l'onglet E-com, sur les commandes en ligne et dans Paramètres. Sur le web, elle concerne uniquement Enterprise, dans l'onglet Commandes E-com et dans Paramètres. Starter et Pro conservent la consultation seule du back-office web : la proposition leur est faite sur mobile. Les comptes de démonstration, les comptes en lecture seule et les membres d'équipe sans rôle d'administrateur opérationnel ne la reçoivent pas.

Si deux appareils sont ouverts en même temps, un seul affiche la proposition. Quitter l'écran sans répondre ne vaut pas refus : la proposition pourra réapparaître lors d'une prochaine visite. En cas d'erreur réseau, aucun choix n'est enregistré et un message invite à réessayer. Les rôles, les droits de boutique et les restrictions d'abonnement restent vérifiés par le serveur ; aucun prix, stock, commande, paiement ou accès Denkma n'est modifié.

## Apparence du site : brouillon, aperçu et publication

Le bloc « Apparence du site » se trouve dans Paramètres > Boutique en ligne. Il regroupe le logo, le nom du site, le titre d'accueil, le message d'accueil et la couleur de marque. Les autres réglages du site (activation, boutique liée, produits en rupture, coordonnées, livraison, WhatsApp, paiement des commandes et domaine) restent dans le formulaire du site et s'enregistrent avec « Enregistrer le site e-commerce ».

- « Enregistrer le brouillon » conserve les modifications sans changer le site public. Il existe un seul brouillon par site, partagé par tous les appareils et par tous les administrateurs opérationnels du compte.
- « Prévisualiser » ouvre un aperçu privé du brouillon, ou de la version publiée s'il n'y a pas de brouillon. Le lien reste valable 30 minutes, fonctionne même si le site est désactivé et n'est pas indexé par les moteurs de recherche. Dans l'aperçu, les commandes, les messages de contact et les statistiques de visite sont désactivés. Abandonner le brouillon rend ses aperçus inaccessibles. Le lien est personnel : il ne doit pas être partagé.
- « Publier » affiche d'abord les changements, puis met à jour le site public. La publication n'active pas un site désactivé et ne modifie ni le domaine, ni les coordonnées, ni les produits, ni les prix, ni les stocks, ni les commandes, ni les paiements. Une publication compte comme une configuration du site pour la proposition de première configuration.
- « Abandonner le brouillon » revient à la version publiée, sans changer le site public. Des modifications non enregistrées peuvent aussi être annulées.

Si le site a été modifié entre-temps depuis un autre appareil ou depuis le formulaire du site, l'enregistrement ou la publication est refusé avec un message clair. « Recharger en gardant mes saisies » récupère la dernière version et conserve les champs modifiés localement, afin de vérifier les différences avant de publier.

Sur mobile, les administrateurs opérationnels Starter, Pro et Enterprise peuvent enregistrer, prévisualiser et publier. Sur le web, ces actions sont réservées à Enterprise ; Starter et Pro voient l'apparence publiée en consultation et la modifient depuis l'application mobile. Les comptes de démonstration, les abonnements en lecture seule et les membres d'équipe sans rôle d'administrateur opérationnel ne peuvent rien modifier. Le serveur vérifie de nouveau les droits, la boutique et l'état de l'abonnement à chaque enregistrement, publication, restauration ou création d'aperçu.

Enterprise dispose aussi, dans les Paramètres web, de l'historique des versions enregistrées : la version en ligne et le brouillon en cours y sont signalés. « Restaurer comme brouillon » crée un nouveau brouillon à partir d'une ancienne version, sans rien publier ; la mise en ligne demande une nouvelle publication. La « Version d'origine » conserve l'apparence du site telle qu'elle était avant sa toute première publication depuis « Apparence du site » : elle est enregistrée automatiquement juste avant cette publication, et pour les sites existants par une migration qui ne change rien au site public. Elle se restaure comme les autres versions.

Les anciennes versions de l'application continuent d'enregistrer les textes et la couleur avec les réglages du site ; ces valeurs restent celles du site public et sont reprises par l'apparence.

## Logo et bibliothèque d'images

Dans « Apparence du site », le champ Logo propose « Choisir une image », « Changer l'image » et « Retirer ». La bibliothèque d'images du site s'ouvre alors : elle permet d'importer une image depuis le téléphone ou l'ordinateur, de réutiliser une image déjà importée, de décrire chaque image pour l'accessibilité et de supprimer une image inutilisée.

- Formats acceptés : JPEG, PNG et WebP, 8 Mo au maximum, 32 pixels minimum de côté. Les images animées, les SVG et les fichiers illisibles sont refusés. Sur iPhone, les photos sont converties dans un format compatible avant l'envoi.
- Chaque image est vérifiée par son contenu réel, redressée selon son orientation, puis réencodée : les métadonnées de l'appareil photo (position GPS comprise) sont supprimées et la transparence d'un logo est conservée. Plusieurs tailles optimisées sont produites automatiquement pour un affichage net et rapide.
- Sur mobile, le logo est recadré en carré au moment de l'import, car il s'affiche dans un cadre carré sur Stockman Basic.
- Le logo choisi n'apparaît sur le site public qu'après la publication ; l'aperçu privé le montre avant. Retirer le logo puis publier le fait disparaître du site. Un ancien logo défini autrement que par la bibliothèque reste affiché tant qu'aucun logo de la bibliothèque ne le remplace.
- Une image utilisée par le site publié ou par le brouillon ne peut pas être supprimée : il faut d'abord la retirer et publier ou abandonner le brouillon. Une version de l'historique qui utilise une image supprimée depuis ne peut plus être restaurée.
- La bibliothèque contient au plus 60 images par site. Importer deux fois le même fichier réutilise l'image existante.
- Les droits sont ceux de l'apparence : sur mobile pour Starter, Pro et Enterprise ; sur le web pour Enterprise. Le serveur vérifie que chaque image appartient bien au compte et au site, et qu'elle convient au champ choisi.

## Modèles de site

Le bloc « Apparence du site » présente les modèles disponibles :

- Stockman Basic : le site d'origine, sobre et éprouvé.
- Atelier : mode, accessoires et créations ; grandes images, typographie élégante, produits en format portrait.
- Marché : alimentation et produits du quotidien ; rayons visibles d'emblée, grille dense, prix, unités et disponibilité très lisibles.
- Vitrine : boutique généraliste sobre, recherche mise en avant, parfaite même avec peu de photos.
- Éclat : beauté, cosmétiques et bien-être ; ambiance douce et lumineuse, gammes mises en valeur, avis et questions fréquentes.
- Prestige : bijoux, parfums, montres et mode haut de gamme ; ambiance sombre, grandes images et pièces présentées comme en galerie.
- Bazar : quincaillerie, électronique et matériel ; rayons d'abord, catalogue dense, disponibilité visible et informations pratiques en évidence.

« Aperçu » montre un modèle avec les vrais produits et les vraies informations de la boutique, sans rien enregistrer. « Choisir ce modèle » crée un brouillon : il reprend le nom du site, le titre et le message d'accueil, la couleur et le logo. Les points forts (livraison, paiement, contact) ne sont créés qu'à partir des informations réellement renseignées dans les réglages du site. Aucun produit, avis ou texte commercial n'est inventé. Une valeur trop longue pour le nouveau modèle est laissée vide plutôt que tronquée. Le site public ne change qu'à la publication ; revenir à Stockman Basic se fait de la même manière. Les pages personnalisées suivent le site dans le nouveau modèle à sections. Stockman Basic n'en affiche pas : en y revenant, elles sortent du brouillon et restent disponibles dans l'historique des versions.

Les modèles à sections proposent des rubriques : Identité (nom, couleur, logo), Style (ambiance claire, crème ou sombre, typographie, forme des éléments, animations), En-tête (disposition, recherche, bandeau d'annonce), Pied de page, puis chaque section de l'accueil, du catalogue et de la page de contact. Sections disponibles : bannière d'accueil, bandeau défilant, catégories, sélection de produits, collection mise en avant, bannière promotionnelle, image et texte, texte, points forts, galerie d'images, avis clients, questions fréquentes, contact et catalogue complet. Sur mobile, Starter, Pro et Enterprise modifient les textes, images, couleurs, polices et variantes proposées ; l'ordre et le nombre des sections suivent le modèle. Une alerte apparaît si la couleur de marque se distingue mal de l'ambiance choisie : les boutons reçoivent alors un contour, sans que la couleur soit remplacée.

- Couleur de marque : en plus des couleurs proposées, une couleur personnalisée se saisit avec son code (par exemple #0E7490) ; sur le web, un sélecteur de couleur est aussi disponible.
- Collection mise en avant : elle montre les produits d'une catégorie choisie parmi les catégories réelles du catalogue. À la création du brouillon, la catégorie la plus fournie est proposée. Sans produit dans la catégorie, la section reste masquée sur le site public.
- Avis clients : uniquement les avis réels de vos clients, avec leur accord. Aucun avis ni aucune note n'est généré. Sans avis saisi, la section reste masquée.
- Bandeau défilant : quelques messages courts (services, informations pratiques). Le défilement se met en pause au survol et avec son bouton pause ; il s'arrête si les animations sont coupées.
- Galerie d'images : des photos de la bibliothèque, en grille régulière ou en mosaïque, avec une légende facultative.

### Styles prêts à l'emploi et animations

Chaque modèle à sections propose trois styles prêts à l'emploi (par exemple Ivoire, Nuit et Galerie pour Atelier). Un style change en un geste l'ambiance, la typographie, la forme des éléments et les animations ; les textes, les images et la couleur de marque restent les mêmes. Comme toute modification, il s'enregistre en brouillon et ne change le site public qu'à la publication.

Le réglage « Animations » propose Aucune, Discrètes ou Expressives : apparition des éléments au défilement, entrée animée de la bannière, zoom lent des grandes images (Expressives), élévation des fiches au survol, transitions entre les pages, panier et menu qui glissent. Les animations sont toujours coupées pour les visiteurs qui ont demandé moins de mouvement dans les réglages de leur appareil. Un site publié avant l'arrivée de ce réglage reste sans animation tant qu'aucun choix n'est fait.

### Rendu sur téléphone

Les sites sont conçus d'abord pour le téléphone : les catégories, la collection mise en avant et les avis défilent au doigt en une rangée ; la sélection de produits s'affiche en grille de deux colonnes. Le réglage « Présentation sur téléphone » permet de choisir, pour la sélection de produits et la collection mise en avant, entre une grille de deux colonnes et un défilement au doigt. L'en-tête se masque quand le visiteur descend et réapparaît dès qu'il remonte. Après un ajout au panier, une confirmation « Ajouté au panier » propose d'ouvrir le panier. La fiche produit monte du bas de l'écran et permet de choisir la quantité, dans la limite du stock publié. Le menu mobile regroupe la recherche, les pages et les coordonnées de la boutique.

Sur le site public, une section vide reste masquée ; dans l'aperçu privé, elle apparaît comme un cadre « Section à compléter ». Les catégories et les produits affichés viennent toujours du catalogue réel ; une photo absente est remplacée par les initiales du produit. Le catalogue propose la recherche, le tri, les filtres par catégorie et la pagination. Le panier, les commandes, le formulaire de contact et les statistiques fonctionnent comme sur Stockman Basic. Les polices sont hébergées avec le site, sans appel à un service tiers.

Les anciennes versions de l'application continuent d'enregistrer le nom, la couleur, le titre et le message d'accueil : sur un modèle à sections, ces changements sont repris dans le modèle publié.

## Éditeur visuel Enterprise

Sur le web, avec un abonnement Enterprise, le bouton « Ouvrir l'éditeur visuel » apparaît dans « Apparence du site » pour tous les modèles à sections (Stockman Basic garde une structure fixe). Il s'ouvre quand aucune modification n'est en attente dans le formulaire.

- « Réglages du site » regroupe les styles prêts à l'emploi et les réglages communs à tout le site : identité, style (ambiance, typographie, forme, animations), en-tête et pied de page.
- Le sélecteur de page, en haut de l'éditeur, choisit la page à modifier (Accueil, Catalogue, Contact et pages personnalisées) ; la colonne de gauche liste ses sections dans l'ordre d'affichage. Une section se déplace en la glissant par sa poignée, ou au clavier avec les flèches haut et bas sur cette poignée. L'œil masque une section sur le site public sans la supprimer : elle garde ses réglages, reste visible dans l'éditeur, atténuée et marquée « Masquée sur le site public », et se réaffiche d'un clic. La corbeille la supprime.
- « Ajouter une section » ouvre la liste des sections, chacune avec une courte description ; la nouvelle section se place sous la section choisie, ou en fin de page. Dans l'aperçu, le bouton « + Section » qui apparaît au survol, au-dessus et au-dessous de chaque section, ajoute une section exactement à cette place. Le catalogue de la page Catalogue et le contact de la page Contact sont indispensables au parcours commercial : il en reste toujours un visible, qui ne peut être ni supprimé ni masqué.
- Une section qui contient des éléments se déplie dans la liste : chaque élément y apparaît avec son premier texte, se déplace en le glissant et se supprime. Cliquer sur un élément ouvre ses réglages dans le panneau de droite. Dans l'aperçu, une section encore vide propose « Ouvrir les réglages de la section ».
- Une section choisie montre tous ses réglages, y compris ceux réservés à Enterprise, ainsi que ses éléments (points forts, questions, messages, images, avis) : ajout, déplacement et suppression.
- « + Page » crée une page personnalisée à partir de son seul titre, par exemple pour la livraison, les retours ou l'histoire de la boutique. Elle commence par un bloc de texte qui reprend ce titre, puis se compose avec les mêmes sections que les autres pages. Le cadre « Page personnalisée » règle son titre, son adresse et sa place dans la navigation : menu principal et pied de page, pied de page uniquement, ou lien direct uniquement. Le menu principal accueille au plus trois pages personnalisées, pour rester lisible ; le pied de page les liste toutes, sauf celles réservées à un lien direct.
- L'adresse d'une page est proposée à partir du titre : lettres minuscules sans accent, chiffres et tirets. Elle s'ajoute après l'adresse du site sous la forme #/livraison, y compris sur un domaine connecté. Les adresses déjà utilisées par une autre page ou par Stockman (catalogue, contact, panier, paiement, etc.) sont refusées. « Supprimer la page » retire la page et ses sections ; « Annuler » la rétablit tant que l'éditeur reste ouvert. Sur le site public, l'adresse d'une page qui n'existe plus affiche « Page introuvable », avec un retour à l'accueil.
- Les textes se modifient aussi directement dans l'aperçu : cliquer sur un titre, un texte ou un bouton permet de le taper sur place, et la section correspondante s'ouvre dans le panneau. Les images, les couleurs et les autres réglages se choisissent dans le panneau. Les limites de longueur et les caractères autorisés sont les mêmes que dans le panneau.
- « Annuler » et « Rétablir » (Ctrl+Z, Ctrl+Maj+Z) reviennent sur les dernières actions.
- L'aperçu privé s'ouvre dans l'éditeur et se met à jour en direct à chaque modification, sans rien enregistrer : il suit la page ouverte et met en évidence la section choisie. Survoler une section dans l'aperçu fait apparaître « Modifier : … », qui la sélectionne. Le bouton de rechargement (flèches en cercle) met aussi à jour les produits et les informations de la boutique. Les icônes Mobile, Tablette et Ordinateur changent la largeur de l'aperçu ; les commandes et les messages y restent désactivés.
- Sous le nom du modèle, l'éditeur indique l'état du travail : « Modifications non enregistrées », « Brouillon enregistré, pas encore publié » ou « Identique au site publié ».
- « Enregistrer » conserve le travail en brouillon sans changer le site public. « Publier » enregistre les dernières modifications puis, après confirmation, les met en ligne aussitôt ; les versions précédentes restent dans l'historique. Publier n'active pas un site désactivé. La publication reste aussi possible depuis « Apparence du site », avec la liste des changements.

Le serveur vérifie chaque enregistrement : droits Enterprise sur le web, types de sections et d'éléments autorisés, sections indispensables (présentes et visibles), affichage des sections modifiable uniquement depuis l'éditeur visuel, pages personnalisées (titre obligatoire, adresse unique et non réservée, place dans la navigation), limites techniques. Seule la page d'aperçu peut être affichée dans l'éditeur, et uniquement depuis le domaine de l'application.

Après un passage à Starter ou Pro, les sections masquées le restent ; dans l'application mobile, leurs textes restent modifiables sous un titre suivi de « (masquée sur le site) ». Les pages personnalisées publiées restent affichées sur le site public. Dans l'application mobile, leurs sections apparaissent sous le titre de leur page et leurs textes restent modifiables ; la création, la suppression, le titre, l'adresse et la place d'une page dans la navigation demandent l'éditeur visuel web Enterprise.

