# Base de Connaissances Stockman — Guide Complet pour l'Assistant IA

Ce document est la référence principale de l'assistant IA. Il couvre toutes les fonctionnalités de l'application Stockman avec des procédures étape par étape, des réponses aux questions fréquentes et des précisions techniques.

---

## 0. Controle de version mobile

Au lancement de l'application mobile, Stockman appelle l'endpoint public `/api/settings/app-version` pour comparer la version installee avec les versions minimales et recommandees configurees cote backend.

### Comportement utilisateur

- Si la version installee est inferieure a la version minimale Android ou iOS, l'application affiche un ecran bloquant **Mise a jour requise** avec le bouton **Mettre a jour**.
- Sur Android, le bouton ouvre la fiche Play Store de l'application, avec un repli web si le lien natif Play Store n'est pas disponible.
- Sur iOS, le bouton ouvre l'URL App Store configuree cote backend, avec un repli vers la page mobile Stockman.
- Si la version installee est ancienne mais encore autorisee, l'application affiche une fenetre **Nouvelle version disponible** avec **Mettre a jour** et **Plus tard**.
- Si l'appel backend echoue, l'application ne bloque pas l'utilisateur afin d'eviter une coupure injustifiee.

### Configuration backend

Les valeurs sont pilotables par variables d'environnement : `APP_ANDROID_LATEST_VERSION`, `APP_ANDROID_MIN_VERSION`, `APP_IOS_LATEST_VERSION`, `APP_IOS_MIN_VERSION`, `APP_FORCE_UPDATE`, `APP_UPDATE_MESSAGE`, `APP_ANDROID_UPDATE_URL` et `APP_IOS_UPDATE_URL`.

---

## 0 bis. Guide de démarrage (application mobile)

- Le propriétaire d'un commerce reçoit un guide de démarrage, proposé une seule fois sur l'application mobile : à l'inscription, ou à la prochaine ouverture de l'application pour un compte existant qui n'a encore aucun produit. Les comptes qui ont déjà des produits, les membres d'équipe, les comptes de démonstration et les restaurants ne le reçoivent pas.
- Le guide est guidé pas à pas et animé : un voile léger couvre l'écran, qui reste visible, sauf la zone à toucher (onglet, bouton ou champ). Un cadre lumineux glisse d'une zone à la suivante pour montrer où toucher, une bulle explique l'élément et la consigne sans jamais masquer la zone, et une barre indique la progression (Produits, Caisse, Compta, Clients). Quand le clavier s'ouvre, le champ à remplir remonte automatiquement à l'écran. Une saisie incorrecte fait trembler la bulle avec un message, et l'utilisateur réessaie.
- Étapes : présenter la barre des onglets en bas de l'écran, puis créer un produit d'exercice un par un (nom, prix d'achat, prix de vente, quantité), créer d'autres produits par import de texte, voir le scan en lot, l'import CSV et l'import catalogue, faire une vente en Caisse (produit au panier, client créé depuis la Caisse, encaissement en espèces, reçu), lire le chiffre d'affaires, la marge et les ventes récentes dans la Compta, puis la fiche du client et ses achats dans l'onglet Clients.
- Les produits, le client et la vente créés pendant le guide sont des données d'exercice : ils ne sont jamais envoyés au catalogue partagé et sont supprimés à la fin, avec leurs mouvements de stock, l'historique de prix, les alertes et le journal d'activité. Le commerçant peut garder le produit créé un par un s'il est réel : son stock est alors rétabli.
- À la fin, deux choix : « Ajouter mes vrais produits » ou « Je veux de l'aide pour créer mes produits », qui ouvre une demande d'assistance déjà remplie. Le lien « Passer » permet de quitter le guide après confirmation ; les données d'exercice sont aussi supprimées.
- Si l'application est fermée pendant le guide, il reprend à la dernière étape enregistrée.
- Suivi par l'équipe Stockman (tableau de bord admin web) : la Vue d'ensemble montre combien de commerçants ont le guide à faire, en cours, terminé ou passé, le taux de réussite, la durée médiane et les étapes où ils s'arrêtent. La fiche d'un client affiche l'état de son guide et sa dernière étape, avec un bouton « Relancer le guide » : le commerçant le refait depuis le début à sa prochaine ouverture de l'application. Dans le Support, un filtre isole les demandes d'aide envoyées depuis la fin du guide.

## 1. Importation de Produits (CSV / Excel)

### Comment importer des produits ?
L'importation permet d'ajouter des centaines de produits en masse depuis un fichier CSV ou Excel, sans les saisir un par un.

**Étapes :**
1. Aller dans l'onglet **Produits**
2. Appuyer sur le bouton **Importer** (icône nuage ou flèche vers le haut)
3. Sélectionner votre fichier CSV ou Excel (taille max : 5 Mo)
4. Si le fichier vient de Shopify, Odoo ou WooCommerce, Stockman détecte la source et mappe automatiquement les colonnes exportées vers les champs produits Stockman
5. Pour les autres fichiers CSV, l'IA analyse les colonnes et peut transformer le template vers les champs Stockman avant l'import si elle identifie le nom du produit avec suffisamment de confiance
6. Vérifier et ajuster le mapping des colonnes uniquement si la source n'a pas été reconnue ou si l'IA n'est pas assez sûre
7. Les champs **obligatoires** sont : `name` (nom du produit)
8. Les champs **optionnels** sont : `sku`, `quantity`, `purchase_price`, `selling_price`, `description`, `unit`, `min_stock`, `category_id`, `image`
9. Cliquer sur **Lancer l'importation**
10. Un résumé affiche le nombre de produits importés et les erreurs éventuelles

**Formats acceptés :** CSV (virgule `,` ou point-virgule `;`), Excel (.xls, .xlsx)
**Encodages supportés :** UTF-8, UTF-8 BOM, Latin-1, CP1252 (les accents français sont gérés automatiquement)

**Migrations sans mapping manuel :**
- Shopify : `Title`, `Variant SKU`, `Variant Price`, `Variant Inventory Qty`, `Image Src`, `Product Category` et champs de variantes
- Odoo : `Name`, `Internal Reference`, `Sales Price`, `Cost`, `Quantity On Hand`, `Product Category`
- WooCommerce : `Name`, `SKU`, `Regular price`, `Stock`, `Categories`, `Images`
- Templates personnalisés : l'IA peut associer des colonnes comme `PV_TTC`, `Tarif vente`, `QTE_DEPOT`, `ART_LIB` ou `Famille` aux champs Stockman, puis présenter un aperçu avant validation

**Noms de colonnes reconnus automatiquement :**
- Nom du produit : `name`, `NOM`, `Désignation`, `Désignation Article`
- SKU / Référence : `sku`, `SKU`, `Référence`, `Ref #`
- Quantité : `quantity`, `stock`, `QTE`
- Prix d'achat : `purchase_price`, `prix_achat`, `Prix Achat`
- Prix de vente : `selling_price`, `prix_vente`, `Prix Vente`
- Unité : `unit`
- Stock minimum : `min_stock`

**Règles de validation :**
- Les prix négatifs sont refusés
- Les quantités négatives sont refusées
- Les prix supérieurs à 999 999 999 sont refusés
- Une ligne avec un nom manquant est ignorée (erreur signalée)
- Un même SKU/code-barres ne peut pas être utilisé par deux produits actifs dans la même boutique
- Un mouvement de stock initial est automatiquement créé pour chaque produit importé avec une quantité > 0

**Erreurs courantes et solutions :**
- "Nom du produit manquant" → vérifier que la colonne nom est bien mappée
- "Fichier trop volumineux" → réduire le fichier à moins de 5 Mo
- "Type de fichier non autorisé" → utiliser uniquement CSV ou Excel
- "Code-barres déjà utilisé dans cette boutique" → corriger le SKU dans le fichier ou dans la fiche produit existante
- Caractères spéciaux (é, à, ç) mal affichés → sauvegarder le fichier en UTF-8 depuis Excel

---

## 2. Gestion des Produits & Inventaire

### Comment ajouter un produit ?
1. Aller dans **Produits** → bouton **+** ou **Ajouter**
2. Remplir : Nom (obligatoire), Prix d'achat, Prix de vente, Quantité, SKU (code-barres), Catégorie, Stock minimum, Unité
3. Sauvegarder

### Comment sont conservées les photos produits ?
- Les photos ajoutées depuis le mobile passent par l'endpoint `/api/upload/image`.
- L'image est compressée puis renvoyée sous forme d'image intégrée, afin d'être sauvegardée directement dans la fiche produit.
- Une photo produit ne doit pas dépendre d'un fichier temporaire du serveur backend, car ce fichier peut disparaître lors d'un redéploiement ou d'un redémarrage.

### Site e-commerce automatique
- Le nom du site web est personnalisable dans les paramètres e-commerce et s'affiche dans l'en-tête de la vitrine publique.
- Le domaine du site se connecte depuis la rubrique « Nom de domaine » (Paramètres > Site e-commerce, ou Boutique en ligne sur mobile Starter) : voir `ecommerce-domain.md` pour le parcours complet.
- Tant que le domaine personnalisé n'est pas prêt (DNS, propriété du domaine et certificat HTTPS), Stockman continue d'ouvrir l'adresse Stockman du site, pour ne jamais envoyer les visiteurs vers un ancien hébergement encore actif sur ce domaine.
- Les couleurs du site se choisissent avec des pastilles visuelles dans les paramètres E-com, sans saisie obligatoire de code couleur.
- Quand le client renseigne au moins une coordonnée utile, Stockman crée ou met à jour automatiquement sa fiche dans le CRM avec la source e-commerce.
- Chaque compte commerçant dispose d'un site e-commerce public généré par Stockman avec un slug unique, par exemple `/shop/ma-boutique`.
- Le site affiche les produits actifs de la boutique active, avec nom, description, prix de vente, stock disponible, unité, image et catégorie.
- Les clients peuvent ajouter des produits au panier et envoyer une commande avec nom, téléphone, email, adresse et note.
- La vitrine affiche jusqu'à 50 produits par page, avec pagination au-delà.
- Le clic sur une carte produit ouvre une fiche détaillée avec image agrandie, description, prix, stock, favori et ajout au panier.
- Sur mobile, le panier s'ouvre dans un panneau dédié depuis l'en-tête au lieu d'apparaître en bas de page.
- L'en-tête public reste sobre : il affiche le nom du site, le panier et le menu, sans exposer le numéro de téléphone du commerçant.
- La vitrine affiche désormais une identité de boutique visible dès l'en-tête avec un monogramme de marque par défaut, même quand aucun logo image n'a encore été configuré.
- Une section `Contactez-nous` complète a été ajoutée en bas de la vitrine, avec coordonnées, livraison, paiement et formulaire public de contact.
- Les coordonnées publiques du site E-com sont maintenant configurables dans les paramètres : e-mail, téléphone et adresse de contact.
- Chaque demande de contact E-com crée une trace dédiée, notifie le commerçant en in-app et en push, envoie un e-mail aux destinataires configurés, et peut enrichir le CRM si le visiteur laisse un e-mail ou un téléphone.
- Les notifications E-com embarquent désormais une destination directe pour ouvrir la bonne section dans l'application, par exemple les commandes ou le CRM.
- Le commerçant peut choisir d'afficher ou non les produits en rupture sur le site. S'ils sont affichés, ils restent visibles mais ne peuvent pas être commandés.
- Le bouton E-com du web et du mobile ouvre maintenant un menu avec trois actions : voir le site, consulter les statistiques E-com et ouvrir les paramètres E-com.
- Les statistiques E-com suivent les visites publiques hors aperçu commerçant, les ajouts au panier, les commandes, le chiffre d'affaires, la conversion, les produits visibles, les ruptures et les produits les plus ajoutés ou commandés.
- Les commandes créées depuis le site sont enregistrées avec la source `ecommerce`, le statut `pending`, le compte, la boutique, les lignes, le total et la devise.
- Le stock n'est pas décrémenté automatiquement à la création de la commande publique : la boutique doit confirmer et traiter la commande avant toute sortie de stock.
- Quand une commande E-com est livrée, elle est convertie en vente et sa sortie de stock n'est pas comptée comme une perte comptable.
- Sur mobile, un bouton visible dans l'en-tête ouvre directement le site e-commerce de la boutique active.
- Sur le web admin, un bouton visible sous le logo ouvre le site e-commerce dans un nouvel onglet.
- Dans l'admin web, l'onglet **Boutiques** affiche désormais un résumé exploitable par boutique sans noyer l'écran dans tout le détail.
- Chaque boutique peut être ouverte en mode **analyse** pour afficher un aperçu structuré du **stock**, des **alertes**, des **clients** et des **fournisseurs**.
- Le stock complet reste accessible à la demande depuis **Voir tout le stock**, avec l'inventaire détaillé filtré sur la boutique choisie.
- Les autres blocs ouvrent des vues complètes dédiées pour consulter toutes les alertes, tous les clients ou tous les fournisseurs liés à cette boutique.
- Les résumés ne sont pas limités à une période fixe : ils reflètent l'état global de la boutique, avec un aperçu léger et un accès immédiat au détail.
- Les anciennes fiches qui pointent encore vers `/uploads/products/...` peuvent perdre leur image si le fichier serveur d'origine n'existe plus ; il faut alors remettre la photo sur la fiche produit.

### Comment modifier le stock d'un produit ?
- **Entrée de stock** : bouton **+** ou « Entrée » sur la fiche produit, puis choisir la raison : Réapprovisionnement, Retour client ou Ajustement d'inventaire.
- **Sortie de stock** : bouton **-** ou « Sortie », puis choisir la raison : Vente hors caisse, Perte ou casse, Produit périmé, Vol, Usage interne, Ajustement d'inventaire ou Autre.
- **Quantité modifiée dans la fiche d'édition** : c'est possible. Dès que la saisie de la quantité est terminée, une fenêtre s'ouvre avec les raisons qui correspondent (raisons d'entrée si elle augmente, raisons de sortie si elle baisse). La raison choisie s'affiche ensuite sous le champ, avec un bouton **Modifier** ; fermer la fenêtre sans choisir remet la quantité d'origine. C'est la même chose sur le web. Il faut une raison pour enregistrer. Le stock change alors par un vrai mouvement, jamais sans trace. Les produits à variantes gardent leur quantité par variante.
- **Effet dans les statistiques** : « Vente hors caisse » enregistre une vraie vente au prix de vente, payée en espèces (chiffre d'affaires, marge, ventes récentes, Compta). Perte ou casse, Produit périmé, Vol, Usage interne, Ajustement d'inventaire à la baisse et Autre comptent dans les **pertes** de la Compta (valeur au prix d'achat, détail par raison) et réduisent le résultat net. Les entrées augmentent le stock sans toucher au chiffre d'affaires.
- Chaque mouvement est tracé dans l'historique avec la date, la raison et l'utilisateur

### Comment modifier rapidement le stock en lot ?
- **Web** : depuis **Stock** → bouton **Édition rapide du stock**
- **Mobile** : depuis **Produits** → bouton **Sélection** → choisir les produits → **Modifier le stock**
- Sur le web, l'éditeur charge tous les produits du filtre actif, y compris ceux qui ne sont pas encore visibles dans la pagination
- Saisir le **stock réel** dans la colonne/champ dédié
- À l'enregistrement, Stockman crée uniquement les mouvements d'entrée ou de sortie nécessaires pour conserver l'historique du stock

### Comment lire les badges de stock ?
- **Rouge** : Rupture de stock (quantité = 0)
- **Orange** : Stock bas (quantité ≤ seuil minimum défini)
- **Bleu** : Surstock (stock anormalement élevé)
- **Vert** : Stock normal

### Comment exporter l'inventaire ?
- Depuis **Produits** → bouton **Exporter**
- Formats disponibles : PDF (avec QR Codes pour l'étiquetage), Excel
- L'export contient tous les produits avec leur prix, quantité, catégorie

### Comment générer une étiquette QR Code ?
- Sur la fiche d'un produit → bouton **Étiquette**
- Un PDF est généré avec le QR Code, le nom et le prix du produit, prêt à imprimer

### Comment organiser les catégories ?
- Dans **Produits** → icône engrenage (paramètres)
- Créer, modifier ou supprimer des catégories
- Les catégories s'affichent comme des filtres colorés en haut de la liste

---

## 3. Caisse (Point de Vente / POS)

### Comment faire une vente ?
1. Aller dans l'onglet **Caisse** (ou POS)
2. Scanner le code-barres d'un article ou le rechercher dans la liste
3. Ajuster la quantité avec les boutons **+** / **-**
4. (Optionnel) Associer un client pour qu'il cumule des points de fidélité
5. Choisir le mode de paiement : Espèces, Mobile Money, Carte, Crédit
6. Valider la vente → le stock est automatiquement mis à jour
7. Imprimer le ticket ou l'envoyer par WhatsApp/Email

### Comment utiliser la caisse vocale ?
1. Dans la **Caisse** de l'application mobile, appuyer sur **Vocal** et dicter les articles, par exemple « deux gaze pièce et un savon liquide »
2. Les produits reconnus sont proposés avec leur quantité avant d'être ajoutés au panier
- Seuls les produits en stock de la boutique active sont reconnus
- L'écoute se fait avec la liste des produits de la boutique : un mot court ou mal prononcé est rapproché du bon produit (« gaz » pour « Gaze pièce », « eau » pour « Eau pour préparation injectable »)
- La reconnaissance tolère les accents, les pluriels et les petites différences d'orthographe (« gaz pièce » retrouve « Gaze pièce »)
- Le début d'un mot suffit quand la fin est mal comprise (« oxybupreakain » retrouve « Oxybuprocaïne »)
- Un nom partiel suffit s'il désigne un seul produit (« oxybuprocaïne » pour « Oxybuprocaïne 40mg collyre ») ; s'il correspond à plusieurs produits (« savon » pour « Savon liquide » et « Savon de Marseille »), ou si le mot ne ressemble que de loin à un produit, les produits possibles sont proposés : toucher le bon pour le cocher, puis **Ajouter au panier**
- Rien d'incertain n'est ajouté d'office : sans choix, le produit proposé n'entre pas dans le panier
- La quantité se dit avant le nom (« 3 coca », « deux boîtes de paracétamol ») ou après (« coca fois 3 ») ; sans quantité, 1 est retenu

### Comment annuler ou retourner une vente ?
- Chercher la vente dans **Activité** ou **Comptabilité**
- Utiliser la fonction de retour/annulation disponible sur la vente

### Quels modes de paiement sont disponibles ?
- Espèces
- Mobile Money (Orange Money, Wave, MTN, etc.)
- Carte bancaire
- Crédit (vente à crédit / dette client)

### Comment ajouter un client rapidement lors d'une vente ?
- Dans la caisse, cliquer sur **Ajouter client** ou icône personne
- Saisir le nom et le numéro de téléphone → client créé en 2 secondes

---

### Mes ventes peuvent-elles être modifiées ou supprimées ?
- Non. Une vente enregistrée ne peut être ni modifiée ni supprimée. Pour la corriger, on l'annule (avec un motif), puis on refait la bonne vente : la vente d'origine reste visible avec son annulation.
- Pour les commerces (hors restauration), chaque vente terminée et chaque annulation sont inscrites dans un **registre inaltérable** : numéro continu, copie figée de la vente (articles, montants, TVA, règlements), empreinte chaînée à la vente précédente et total cumulé depuis l'origine. Une annulation est une nouvelle ligne en négatif.
- Les journées, les mois et les années terminés sont **clôturés** automatiquement : chaque clôture fige le nombre de ventes, le total encaissé, les annulations, la TVA et la répartition par mode de paiement.
- Une période close peut être **archivée** : l'archive contient ses ventes, sa clôture et une empreinte qui prouve qu'elle n'a pas changé.
- Le registre se consulte en bas de l'écran **Comptabilité** (application mobile et web) : nombre d'inscriptions, total cumulé, bouton **Vérifier l'intégrité**, liste des clôtures par jour, mois ou année et bouton **Archive** pour télécharger une période close.
- Une **vérification** contrôle à tout moment que la série ne présente aucun trou, que le chaînage est intact et que chaque vente correspond à son inscription.
- Les ventes d'entraînement du guide de démarrage sont inscrites à part et ne comptent pas dans les totaux.
- Si le compte est supprimé, le registre des ventes est conservé 6 ans (durée légale de conservation), sans donnée personnelle de client.
- Le registre démarre à la première vente qui suit sa mise en service ; les ventes plus anciennes y sont reprises et marquées comme telles, leur intégrité n'étant garantie qu'à partir de cette date.

## 4. Alertes de Stock

### Comment configurer des alertes ?
1. Aller dans **Alertes** → **Configuration** ou icône engrenage
2. Définir des règles : alerter quand stock < X unités, rupture, produit dormant (pas vendu depuis X jours)
3. Activer les notifications push dans **Paramètres** pour recevoir des alertes en temps réel
4. Les alertes liées à un produit ouvrent directement la fiche de ce produit dans l'application mobile, avec le filtre adapté quand il s'agit d'une rupture, d'un stock bas ou d'un surstock

### Types d'alertes disponibles :
- **Stock bas** : quantité en dessous du seuil minimum
- **Rupture de stock** : quantité = 0
- **Produit dormant** : aucune vente depuis une période configurable
- **Péremption** : produits avec date d'expiration dans les 30 prochains jours

### Comment gérer les alertes ?
- Marquer une alerte comme lue une fois traitée
- Supprimer les alertes résolues
- Filtrer par type d'alerte
- Ouvrir le produit concerné depuis une notification push ou depuis la liste des alertes

---

## 5. Commandes Fournisseurs

### Le module Fournisseurs est-il disponible pour tous les comptes ?
- Non. Le module Fournisseurs est activé par l'équipe Stockman : il est coupé par défaut pour tous les comptes. Il peut être activé pour tout le monde, pour un plan (Starter, Pro, Enterprise), pour un type d'activité (épicerie, pharmacie, quincaillerie…) ou pour un compte précis. Le réglage le plus précis l'emporte : compte, puis type d'activité, puis plan, puis réglage global. Il s'applique à toute l'équipe du compte.
- Quand le module est coupé, sur mobile comme sur le web : pas d'onglet Fournisseurs ni de commandes fournisseurs, pas de carte « Aucun fournisseur » ni de filtres Fournisseur dans Produits, pas de carte « Achats fournisseurs » dans la Compta, pas de bouton « Commander » dans le réapprovisionnement, pas de règle d'alerte « Retard fournisseur » ni de rappels de livraison, de réapprovisionnement ou d'invitation fournisseur, pas de permission Fournisseurs pour l'équipe, pas de rapport Approvisionnement ni de filtre Fournisseur dans les analyses. L'assistant IA n'utilise plus les données fournisseurs.
- La création de produits ne dépend pas des fournisseurs : un produit se crée toujours sans fournisseur, que le module soit activé ou non.
- Pour en bénéficier, le commerçant contacte le support Stockman.

### Où se trouvent les commandes fournisseurs ?
- Les commandes et les retours fournisseurs sont dans l'écran **Fournisseurs** : bouton **Commandes fournisseurs** sur mobile, onglet **Bons de commande** sur le web.
- L'écran **Commandes** (onglet mobile et barre latérale web) ne montre que les commandes des clients passées sur la boutique en ligne.
- Les notifications de commande fournisseur et les rappels de réapprovisionnement ouvrent directement les commandes fournisseurs.

### Comment créer une commande fournisseur ?
1. Aller dans **Fournisseurs** → **Commandes fournisseurs** (mobile) ou **Bons de commande** (web)
2. Sélectionner un fournisseur
3. Ajouter les produits à commander avec les quantités
4. Valider la commande (statut : En attente)

### Comment valider la réception d'une commande ?
1. Dans les commandes fournisseurs, trouver la commande livrée
2. Cliquer sur **Valider la réception**
3. Le stock est automatiquement incrémenté des quantités reçues

### Statuts des commandes :
- **En attente** : commande créée, pas encore expédiée
- **Expédiée** : en cours de livraison
- **Livrée / Réceptionnée** : marchandise reçue, stock mis à jour

---

## 6. Marketplace (Plan Pro & Enterprise)

### Qu'est-ce que la Marketplace ?
La Marketplace connecte les commerçants à un réseau de fournisseurs vérifiés. Les commerçants peuvent commander directement depuis le catalogue des fournisseurs.

### Comment commander sur la Marketplace ?
1. Aller dans **Fournisseurs** → **Marketplace Pro**
2. Parcourir le catalogue des fournisseurs
3. Ajouter des produits au panier
4. Confirmer la commande → le fournisseur reçoit une notification

### Que se passe-t-il après la réception d'une commande Marketplace ?
- Les produits commandés sont automatiquement créés dans votre inventaire (s'ils sont nouveaux) ou leur quantité est mise à jour (s'ils existent déjà)
- Le système suggère un prix de vente basé sur le prix d'achat fournisseur et un coefficient de marge configurable

---

## 7. Comptabilité & Analyse Financière

### Comment accéder à la comptabilité ?
- Aller dans l'onglet **Comptabilité** (web) ou **Bilan** (mobile)

### Comment séparer les ventes en boutique et les ventes E-com ?
- L'écran Finances (web et mobile) propose quatre vues en haut : **Vue d'ensemble**, **Boutique physique**, **E-com** et **Trésorerie**. La période choisie s'applique aux quatre.
- Sur le web, les résultats s'affichent en premier, juste sous les vues : détail de la vue choisie, cartes d'indicateurs (chiffre d'affaires, marge brute, charges, résultat net, panier moyen, pertes) et valeur du stock. Viennent ensuite le **Pilotage financier** (Enterprise), le diagnostic IA et la vue rentabilité. Le Pilotage est replié par défaut : son en-tête montre l'évolution du CA et du résultat net par rapport à la période précédente, et un clic l'ouvre. Le navigateur mémorise s'il est ouvert ou fermé.
- **Vue d'ensemble** : tous les canaux réunis, avec la part de la boutique et celle de l'E-com dans le chiffre d'affaires, la marge brute de chacune et, sur le web, le CA par jour en deux couleurs.
- **Boutique physique** : chiffre d'affaires, marge, panier moyen et ventes de la caisse uniquement.
- **E-com** : circuit des commandes en ligne. « Commandé » (commandes passées sur la période, annulées et refusées exclues), « Livré (CA) », « Encaissé », « À encaisser » (commandes livrées sans paiement confirmé), puis « En cours », « Annulées ou refusées » et « Livraison en transit ».
- **Trésorerie** : sommes reçues sur la période (ventes payées et remboursements de dettes), répartition par moyen de paiement, créances clients dont la part E-com, et frais de livraison Denkma en transit.
- Dans les vues Boutique physique et E-com, les cartes Charges et Résultat net sont masquées : les charges et les pertes de stock ne sont pas réparties par canal. Elles restent dans la vue d'ensemble.
- Une vente E-com est créée à la livraison de la commande. Elle compte dans le CA E-com, qu'elle soit payée ou à crédit. Les frais de livraison Denkma n'entrent jamais dans le chiffre d'affaires.
- L'historique des ventes suit la vue choisie ; les ventes E-com y portent la mention « E-com ».

### Que signifient les indicateurs financiers ?
- **Chiffre d'Affaires (CA)** : Total des ventes terminées sur la période (annulations exclues), payées ou à crédit
- **COGS** (Coût des Marchandises Vendues) : Coût d'achat total des produits vendus
- **Bénéfice Brut** : CA - COGS
- **Dépenses** : Charges diverses saisies manuellement (loyer, salaires, électricité, etc.)
- **Bénéfice Net** : Bénéfice Brut - Dépenses

### Comment filtrer par période ?
- Boutons en haut : Aujourd'hui, Cette semaine, Ce mois, Personnalisé (choisir les dates)

### Comment exporter les rapports financiers ?
- Bouton **Exporter** → PDF ou Excel
- Le rapport inclut le CA, les ventes par produit, les dépenses, le bénéfice net

### Comment créer une facture ?
- Dans **Comptabilité** → **Factures** → **Nouvelle facture**
- Sélectionner un client, ajouter les produits, appliquer la TVA si nécessaire
- Générer et envoyer le PDF directement au client

### Graphiques disponibles :
- **Modes de paiement** : camembert montrant la répartition Espèces/Mobile Money/Carte/Crédit
- **Ventes quotidiennes** : courbe d'évolution du CA sur la période sélectionnée
- **Produits les plus vendus** : classement des meilleurs articles

---

## 8. CRM & Fidélité Client

### Comment ajouter un client ?
1. Aller dans **Clients** (CRM)
2. Bouton **+** → remplir : Nom, Téléphone, Email (optionnel), Anniversaire (optionnel)
3. Sauvegarder

### Comment fonctionne le système de fidélité ?
- Les points sont calculés automatiquement à chaque achat
- Le montant de points par achat est configurable (ex. : 1 point = 100 FCFA achetés)
- Des paliers de récompense peuvent être configurés (ex. : 100 points = réduction de 500 FCFA)
- Les points s'accumulent sur le profil client automatiquement

### Comment configurer les règles de fidélité ?
- Dans **Paramètres** → **Fidélité**
- Définir le taux de conversion (ex. : 1 point par 1000 FCFA)
- Définir les paliers de récompense

### Comment gérer les dettes clients ?
- Fiche client → **Dettes & Crédits**
- "Ajouter une dette" : le commerçant avance de l'argent ou des marchandises au client
- "Enregistrer un paiement" : le client rembourse (partiellement ou totalement)
- L'historique complet des dettes est conservé

### Comment envoyer une campagne marketing ?
- Dans **CRM** → **Campagnes**
- Créer une campagne SMS ou Email
- Sélectionner les clients cibles (tous, par segment, par fidélité)
- Envoyer une promotion, une annonce ou une relance

### Comment contacter un client via WhatsApp ?
- Sur la fiche client → icône WhatsApp → le message s'ouvre directement dans WhatsApp

---

## 9. Gestion du Personnel & Permissions

### Comment ajouter un employé ?
1. Aller dans **Utilisateurs** ou **Personnel**
2. Bouton **+** → remplir : Nom, Email, Mot de passe temporaire
3. Définir les permissions par module
4. Partager les identifiants par WhatsApp (bouton dédié)

### Comment fonctionnent les permissions ?
Chaque module a 3 niveaux d'accès :
- **Aucun** : l'employé ne voit pas ce module
- **Lecture** : l'employé peut consulter mais pas modifier
- **Écriture** : l'employé peut créer, modifier et supprimer

Modules configurables : Produits, Caisse, Comptabilité, CRM, Fournisseurs, Personnel, Alertes

### Quels sont les rôles disponibles ?
- **Propriétaire (Shopkeeper)** : accès total illimité à tout
- **Employé (Staff)** : accès limité selon les permissions définies par le propriétaire
- **Manager** : employé avec la permission "Personnel: Écriture" — il peut créer et gérer d'autres employés, mais ne peut pas modifier le propriétaire

### Combien d'employés peut-on ajouter ?
- **Plan Starter** : 1 employé supplémentaire
- **Plan Pro** : 5 employés supplémentaires
- **Plan Enterprise** : employés illimités

### Comment partager les identifiants d'un employé ?
- Sur la fiche de l'employé → bouton **Partager par WhatsApp**
- Les identifiants (email + mot de passe temporaire) sont envoyés directement

---

## 10. Multi-Boutiques

### Comment gérer plusieurs boutiques ?
- **Plan Starter** : 1 boutique
- **Plan Pro** : jusqu'à 2 boutiques
- **Plan Enterprise** : boutiques illimitées

### Comment basculer entre les boutiques ?
- Sur le tableau de bord → sélecteur de boutique en haut à droite (ou en haut de page)
- Chaque boutique a son propre stock, ses propres ventes et ses propres données

### Comment créer une nouvelle boutique ?
- **Paramètres** → **Boutiques** → **Ajouter une boutique**
- Remplir : Nom, Adresse, Numéro de téléphone

---

## 11. Tableau de Bord (Dashboard)

### Que montre le tableau de bord ?
- **Chiffre d'Affaires** du jour et du mois
- **Nombre de produits** dans l'inventaire
- **Valeur du stock** (coût total du stock disponible)
- **Santé du stock** : produits en rupture, en stock bas, en surstock
- **Alertes de péremption** : produits expirant dans les 30 prochains jours
- **Suggestions de réapprovisionnement** : produits à commander en priorité basé sur la vélocité des ventes

### Comment accéder aux statistiques détaillées ?
- Boutons en bas du tableau de bord : **Graphiques** et **Historique des mouvements**

---

## 12. Flux d'Activité (Journal)

### À quoi sert le journal d'activité ?
Il trace toutes les actions effectuées dans la boutique : ventes, mouvements de stock, modifications de produits, connexions des employés.

### Comment filtrer l'activité ?
- Par module : Stock, Caisse, CRM, Comptabilité
- Par utilisateur : voir les actions d'un employé spécifique
- Par date

---

## 13. Paramètres de l'Application

### Comment changer de langue ?
- **Paramètres** → **Langue** → choisir parmi les 15 langues disponibles

### Comment activer le mode sombre ?
- **Paramètres** → **Thème** → basculer entre Clair et Sombre

### Comment activer/désactiver des modules ?
- **Paramètres** → **Modules actifs**
- Cocher ou décocher : CRM, Comptabilité, Fournisseurs, Marketplace, etc.

### Comment configurer les notifications push ?
- **Paramètres** → **Notifications**
- Activer les alertes pour : stock bas, rupture, produits dormants
- L'application enregistre aussi l'installation mobile avec la langue de l'appareil ou la langue choisie, afin de pouvoir envoyer des notifications adaptées à la langue de l'utilisateur, y compris avant la création d'un compte lorsque l'autorisation push est accordée.

### Comment cibler les installations sans compte depuis l'administration ?
- Dans **Admin** → **Communication**, choisir la cible **Sans compte**.
- Rédiger le titre et le message dans la langue voulue.
- Filtrer l'audience par pays, langue et plateforme avant l'envoi.
- Choisir une destination au clic si la notification doit ouvrir un écran précis.
- Les installations sans compte reçoivent uniquement des notifications push ; les canaux in-app et e-mail restent réservés aux comptes enregistrés.

### Les notifications admin peuvent-elles ouvrir une section précise ?
- Oui. Depuis **Admin** → **Communication**, le champ **Destination au clic** permet d'ouvrir Accueil, Produits, Ajouter un produit, Alertes, Assistance, Abonnement, Commandes, Caisse, CRM, Comptabilité, Paramètres ou une section précise de **Paramètres**.
- Pour ajouter un lien externe, choisir **Ajouter un bouton de lien**, puis saisir le **Texte du bouton** et son **Adresse du lien (HTTPS)**. Le bouton est visible dans le message sur mobile et sur le web, et dans l'e-mail si ce canal est sélectionné. Il ne remplace pas la destination interne et ne s'affiche pas dans le push système. L'option n'est pas proposée pour les installations sans compte, qui ne reçoivent que le push.
- Les sections disponibles dans **Paramètres** couvrent notamment Compte et application, Abonnement et facturation, Profil et apparence, Synchronisation, Organisation et pilotage, Modules visibles, Boutique active, Boutique · Identité, Boutique · Documents, Fiscalité, Alertes et notifications, Canaux de réception, Destinataires, Support et incidents, Assistance, Déclarer un incident, Sécurité du compte, Informations légales, Données et suppression.
- Quand la notification est envoyée en push, le clic ouvre directement la destination choisie.
- Quand elle est envoyée en in-app, le centre de notifications affiche un bouton **Ouvrir** si une destination existe.
- Quand elle est envoyée par e-mail, l'e-mail contient un bouton **Ouvrir dans Stockman** si une destination existe.
- Pour les installations sans compte, privilégier une destination compatible avec l'étape d'inscription ou d'assistance, car les sections protégées nécessitent un compte connecté.

### Comment utiliser l'aide IA pour rédiger une notification admin ?
- Depuis **Admin** → **Communication**, renseigner l'objectif de la notification dans le bloc **Aide IA**.
- L'IA propose un titre, un message court et une destination au clic cohérente avec la cible.
- La proposition remplit le formulaire, mais l'envoi reste toujours manuel : l'administrateur doit relire puis cliquer sur **Envoyer**.
- L'aide IA doit rester factuelle : elle ne doit pas promettre une remise, un appel ou un résultat qui n'a pas été confirmé.

### Quelles notifications système reçoivent les installations sans compte ?
- Tant qu'aucun compte n'a été créé, l'installation reçoit un rappel quotidien pour créer son compte et commencer à gérer le stock, les ventes et les alertes.
- Le rappel s'arrête dès que l'installation passe à l'étape suivante, c'est-à-dire dès qu'un compte est rattaché à l'appareil.
- Les notifications sont envoyées uniquement si l'installation n'est pas encore rattachée à un compte.
- Le texte est choisi selon la langue enregistrée ; à défaut, les pays francophones reçoivent le français et les autres pays reçoivent l'anglais.

### Que reçoit un compte créé sans produit ?
- Si un compte existe mais qu'aucun produit n'a encore été créé, les notifications d'activation dirigent l'utilisateur vers l'assistance Stockman.
- Le message invite l'utilisateur à demander de l'aide pour créer ses premiers produits au lieu de simplement lui demander de les ajouter seul.
- L'assistance est proposée dès la création du compte, puis au maximum une fois par jour tant qu'aucun produit n'est créé.

### Comment changer le mot de passe ?
- **Paramètres** → **Sécurité** → **Changer le mot de passe**

---

## Filtres d’analyse sur le web

- Dans les vues d’analyse qui les utilisent, ouvrez **Filtres** pour modifier la période, la boutique, la catégorie ou le fournisseur lorsque ces options sont disponibles. La barre repliée affiche la période et les sélections actives. Les listes proviennent des données accessibles sur le compte.
- Pour une période personnalisée, choisissez **Dates**, renseignez les deux dates, puis choisissez **Appliquer**. La date de fin est incluse, et la période est limitée à 365 jours. Le filtre de dates porte sur les ventes de la période ; les niveaux de stock restent ceux d’aujourd’hui.
- Sur téléphone, le menu, le guide de l’onglet et l’assistant sont accessibles dans l’en-tête du back-office.
- Il est recommandé de se connecter depuis un ordinateur pour utiliser Stockman Web plus confortablement. Sur Starter et Pro, **Comprendre l’évolution vers Enterprise** déplie les explications. Les personnes autorisées à gérer la facturation peuvent choisir **Passer à Enterprise** pour afficher directement l’offre, sans déclencher de paiement.

## 14. Plans & Abonnements

### Note backoffice admin (stabilite abonnements)
- Dans l'onglet **Abonnements** du backoffice, si le MRR n'est pas encore fourni par l'API, l'interface affiche `-`.
- Si un compte n'a pas de liens de paiement, l'interface affiche `Stripe: —` et `Mobile Money: —` sans erreur.

### Quels sont les plans disponibles ?
| Plan | Prix FCFA/mois | Prix EUR/mois | Boutiques | Employés | Web |
|------|----------------|---------------|-----------|----------|-----|
| Starter | 2 500 | 6,99 | 1 | 1 | Non |
| Pro | 4 900 | 9,99 | 2 | 5 | Non |
| Enterprise | 9 900 | 14,99 | Illimitées | Illimités | Oui |

- Sur mobile, **Découvrir Enterprise** ouvre **Abonnement** sur [Stockman Web](https://app.stockman.pro) avec le compte déjà connecté, sans ressaisir son mot de passe. Ce raccourci ne change ni le plan ni les accès : Starter et Pro restent en consultation avant un éventuel changement d'offre.

### Quels onglets voit-on sur mobile ?
- **Starter** : Produits, Caisse, Compta, Clients et Réglages (plus Fournisseurs si l'équipe Stockman a activé ce module pour le compte). Il n'y a pas d'onglet Accueil : les chiffres clés sont dans la Compta. Les messages de l'administrateur (icône mégaphone, affichée quand il y en a, avec le nombre de messages non lus) et le bouton de thème clair/sombre sont dans l'en-tête, sur tous les onglets.
- **Messages de l'administrateur (tous les plans)** : à l'ouverture de l'application mobile, ou au retour dans l'application, chaque message non lu s'affiche d'abord dans une fenêtre, du plus ancien au plus récent (« Message suivant », puis « J'ai compris » ; « Ouvrir » mène à l'écran ou au lien prévu). Fermer la fenêtre marque le message comme lu ; il reste consultable depuis l'Accueil ou l'icône mégaphone. La fenêtre ne s'affiche jamais pendant le guide de démarrage.
- **Commandes en ligne** : sur tous les plans, l'onglet n'apparaît qu'une fois la boutique en ligne activée (Commandes sur Pro et Enterprise, E-com sur Starter). Sur le web, l'entrée Commandes de la barre latérale suit la même règle. Tant que le site est désactivé, les commandes déjà reçues restent accessibles depuis le bouton « Commandes » de la rubrique Boutique en ligne (Site e-commerce sur Pro et Enterprise) des Paramètres.

### Comment mettre à niveau son abonnement ?
- **Paramètres** → **Abonnement** → **Changer de plan**
- Paiement via Mobile Money (Orange Money, Wave, MTN) ou carte bancaire

---

## 15. Interface Fournisseur (Portail Supplier)

### Qu'est-ce que le portail fournisseur ?
Les fournisseurs ont leur propre interface dédiée pour gérer leur catalogue et leurs commandes.

### Fonctionnalités du portail fournisseur :
- **Dashboard** : KPIs (CA total, commandes reçues, panier moyen, note des clients)
- **Catalogue** : ajouter/modifier des produits avec prix et disponibilité
- **Commandes reçues** : accepter, refuser, marquer comme expédiée
- **Paramètres** : profil fournisseur, zones de livraison, montant minimum de commande

---

## 16. Scanning de Code-Barres

### Comment scanner un code-barres ?
- Sur mobile : activer la caméra depuis la caisse ou la page produits
- Pointer vers le code-barres — la reconnaissance est automatique
- Si un seul produit correspond au SKU scanné, il est ajouté au panier ou affiché
- En caisse, un scan ajoute une seule unité et déclenche une vibration de confirmation
- Si plusieurs produits actifs de la même boutique partagent le même code-barres, Stockman bloque l'ajout et demande de corriger les fiches produits

### Comment faire un scan en lot (batch scan) ?
- **Inventaire** → **Scan en lot** (Batch Scan)
- Scanner plusieurs articles en séquence pour effectuer un comptage ou une mise à jour rapide du stock
- Utile pour les inventaires physiques

---

## 17. Synchronisation Hors-ligne

### L'application fonctionne-t-elle sans Internet ?
- Oui, en mode hors-ligne limité : les données récentes sont mises en cache
- Les ventes effectuées hors-ligne sont synchronisées automatiquement dès que la connexion est rétablie
- Une bannière orange s'affiche en haut quand l'application est hors-ligne

---

## 17 bis. Assistant IA : disponibilité

### Que se passe-t-il si l'assistant IA ne répond pas ?
- Si le service d'IA est momentanément indisponible (crédit ou quota du fournisseur d'IA atteint), l'assistant affiche : « L'assistant IA est momentanément indisponible. Réessayez un peu plus tard ; en attendant, vous pouvez consulter les guides », avec des boutons directs : **Centre d'aide** et **Guide de cet écran** sur mobile, **Guide de cette page** sur le web. Le reste de l'application fonctionne normalement.
- L'équipe Stockman est alertée automatiquement (notification et e-mail) dès la panne, puis quand le service est rétabli. Le tableau de bord admin web (rubrique Monitoring) montre l'état de la génération et de la recherche documentaire de l'assistant, avec un bouton « Tester maintenant ».
- Pour répondre aux questions sur l'application, l'assistant s'appuie sur ce document, les guides et le centre d'aide. Si la recherche par le sens est indisponible, il continue de chercher par mots-clés (accents compris) et reprend la recherche par le sens tout seul dès que le service répond.

### Les fonctions IA ont-elles une limite d'utilisation ?
- Oui, pour les fonctions qui font appel à l'IA générative : chacune a un quota par jour ou par mois selon le plan (par exemple l'analyse du compte de résultat, les clients à risque de départ, le rapport mensuel, la dictée vocale, la caisse vocale, le résumé client). Le quota est compté par compte : le propriétaire et les membres de son équipe partagent la même limite. Une fois le quota atteint, un message indique la limite et la période.
- Le résumé IA du jour est généré une fois par jour et par boutique, puis réaffiché sans nouvel appel quand on rouvre le tableau de bord.
- Les analyses calculées sans IA générative (prévisions, produits dormants, saisonnalité, doublons, score de santé…) n'ont pas de quota d'utilisation ; elles restent seulement réservées aux plans qui les incluent.

## 18. Questions Fréquentes (FAQ)

**Q: Comment retrouver une vente passée ?**
R: Aller dans **Activité** et filtrer par "Caisse", ou dans **Comptabilité** pour les ventes d'une période.

**Q: Comment savoir quels produits se vendent le mieux ?**
R: **Comptabilité** → graphique **Produits les plus vendus** ou demander à l'IA "Quels sont mes meilleurs produits ?"

**Q: Comment corriger une erreur de stock ?**
R: Pour un produit : aller sur la fiche du produit → **Sortie** ou **Entrée** avec la raison "Correction". Pour plusieurs produits : sur le web utiliser **Stock → Édition rapide du stock** ; sur mobile utiliser **Produits → Sélection → Modifier le stock**. Saisir le stock réel : Stockman crée les mouvements d'écart.

**Q: Comment supprimer un produit ?**
R: Fiche produit → bouton **Supprimer** (ou trois points → Supprimer). Attention : les ventes passées conservent la trace du produit.

**Q: Comment réinitialiser le mot de passe d'un employé ?**
R: **Utilisateurs** → fiche de l'employé → **Réinitialiser le mot de passe** → partager les nouveaux identifiants.

**Q: Comment voir les mouvements de stock d'un produit spécifique ?**
R: Fiche produit → **Historique** → liste de toutes les entrées/sorties avec date, raison et utilisateur.

**Q: L'IA peut-elle me donner mes statistiques de ventes ?**
R: Oui, l'assistant peut accéder aux données en temps réel. Posez des questions comme : "Quel est mon CA aujourd'hui ?", "Quels produits sont en rupture ?", "Donne-moi mes meilleures ventes du mois".

**Q: Comment configurer un PIN de sécurité ?**
R: **Paramètres** → **Sécurité** → **Configurer le PIN** — le PIN permet un accès rapide sans ressaisir le mot de passe complet.

**Q: Comment imprimer un ticket de caisse ?**
R: Après validation d'une vente, l'écran de confirmation propose : Imprimer, Envoyer par WhatsApp, ou Envoyer par Email.

**Q: Comment voir les produits proches de leur date de péremption ?**
R: **Tableau de bord** → section **Alertes Péremption**, ou **Alertes** → filtre Péremption.

### Administration des boutiques
- Le backoffice admin permet d'ouvrir une boutique pour consulter son inventaire réel.
- Chaque produit affiche son état de stock, sa valeur, ses lots, sa prochaine date de péremption et ses alertes actives.
- Les péremptions sont distinguées par statut : expiré, à surveiller ou valide.
- Les filtres admin permettent de cibler rapidement les ruptures, les stocks bas et les produits proches de la péremption.
