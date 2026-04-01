# Plan des guides utilisateurs de l'application mobile

## Constat

L'application mobile dispose déjà d'une base de guides plus avancée que le web :

- plusieurs écrans utilisent déjà `ScreenGuide` ;
- une bibliothèque de guides existe dans `GUIDES` (`frontend/constants/guides.ts`) ;
- un `HelpCenter` permet déjà de relancer certains guides ;
- des écrans transverses comme le chat, l'assistance IA, les notifications et le sélecteur de boutique sont déjà intégrés dans l'expérience.

En revanche, l'ensemble reste encore incomplet et hétérogène :

- certains modules ont un guide rapide, mais pas de guide complet ;
- certains parcours critiques ne sont pas documentés ;
- les écrans transverses et les rôles spécifiques ne sont pas couverts de manière homogène ;
- l'administration mobile et l'espace fournisseur ne disposent pas encore d'une architecture de guide clairement définie.

L'objectif est donc de structurer les guides mobiles avec une logique claire, maintenable et adaptée aux usages terrain.

## Objectif produit

Chaque module mobile doit disposer de deux niveaux de guide complémentaires :

1. **Guide rapide intégré à l'écran**
   Un parcours court, orienté prise en main immédiate, pour comprendre les zones principales, les boutons importants et le résultat attendu.

2. **Guide complet de référence**
   Une documentation plus détaillée qui décrit chaque écran, chaque action, chaque modal et chaque état de l'interface.

## Spécificités mobiles à couvrir dans tous les guides

Contrairement au web, les guides mobiles doivent systématiquement prendre en compte :

- la navigation par onglets ;
- les actions dans le header ;
- les modals plein écran ou semi-plein écran ;
- les listes longues ;
- les cartes empilées ;
- les boutons flottants ;
- les bascules entre boutique active et boutique autorisée ;
- les états hors ligne et de synchronisation ;
- les restrictions liées au petit écran.

## Structure standard à appliquer à chaque guide mobile

Chaque guide module devra suivre une structure homogène.

### 1. Rôle du module

- À quoi sert l'écran.
- Pour quels profils il est disponible.
- À quel moment l'utilisateur doit l'utiliser.

### 2. Accès à l'écran

- Où toucher pour l'ouvrir.
- Depuis quel onglet ou quel bouton.
- Conditions de visibilité.
- Restrictions liées au rôle, au plan ou aux permissions.

### 3. Lecture de l'interface

- header ;
- actions du header ;
- cartes KPI ;
- liste principale ;
- boutons flottants ;
- onglets internes ;
- modals associés ;
- messages d'état.

### 4. Boutons et actions

Pour chaque bouton visible :

- libellé ou icône ;
- emplacement ;
- effet attendu ;
- confirmation éventuelle ;
- impact sur les données ;
- cas où l'action peut être indisponible.

### 5. Recherche, filtres et segments

- barre de recherche ;
- filtres rapides ;
- segments ;
- puces de catégorie ;
- changement de période ;
- changement de boutique.

### 6. Modals, panneaux et écrans secondaires

- comment les ouvrir ;
- à quoi ils servent ;
- ce qu'on peut modifier dedans ;
- comment valider ou annuler ;
- conséquences après validation.

### 7. États de l'interface

- chargement ;
- vide ;
- succès ;
- erreur ;
- hors ligne ;
- synchronisation en attente ;
- absence de permission ;
- lecture seule.

### 8. Cas d'usage typiques

- scénario simple ;
- scénario fréquent ;
- erreur habituelle ;
- bonne pratique terrain.

### 9. Liens avec les autres modules

- depuis quel écran on y arrive ;
- vers quel écran on poursuit ;
- quels modules sont impactés par l'action.

### 10. Questions fréquentes

- erreurs d'interprétation ;
- comportements attendus ;
- vocabulaire métier ;
- précisions sur les badges et statuts.

### 11. Guide rapide embarqué

Chaque écran doit aussi disposer d'une version courte :

- 4 à 7 étapes maximum ;
- orientée action ;
- lisible en quelques secondes ;
- relançable via le bouton d'aide ou le centre d'aide.

---

## Surfaces mobiles à documenter

---

## 1. Parcours d'accès et de sécurité

### A. Connexion (`frontend/app/(auth)/login.tsx`)

#### Rôle

Permet à l'utilisateur de s'authentifier avec ses identifiants (email + mot de passe) pour accéder à l'application.

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Champ email | TextInput | Saisie de l'adresse email du compte |
| Champ mot de passe | TextInput (secure) | Saisie du mot de passe avec icône œil pour afficher/masquer |
| Bouton « Se connecter » | TouchableOpacity principal | Lance l'authentification et redirige vers l'espace approprié |
| Lien « Mot de passe oublié » | TouchableOpacity texte | Redirige vers le flux de réinitialisation |
| Lien « Créer un compte » | TouchableOpacity texte | Redirige vers l'inscription |
| Bouton « Démo » | TouchableOpacity secondaire | Ouvre une session de démonstration sans inscription |

#### Le guide doit couvrir

- saisie des identifiants ;
- erreurs de connexion (mot de passe incorrect, compte inexistant, compte bloqué) ;
- rôle du compte (shopkeeper, supplier, admin) ;
- différence entre compte classique, fournisseur, admin et démo ;
- redirection automatique après connexion selon le rôle.

### B. Inscription (`frontend/app/(auth)/register.tsx`)

#### Rôle

Permet de créer un nouveau compte commerçant ou fournisseur.

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Champ nom complet | TextInput | Nom de l'utilisateur |
| Champ email | TextInput | Adresse email (sera vérifiée ensuite) |
| Champ mot de passe | TextInput (secure) | Mot de passe avec indicateur de force |
| Champ téléphone | TextInput | Numéro de téléphone avec indicatif pays |
| Sélecteur type de compte | RadioGroup | Commerçant ou Fournisseur |
| Sélecteur secteur d'activité | Picker | Épicerie, Pharmacie, Restaurant, etc. (21 secteurs) |
| Sélecteur pays | Picker | Pays d'activité (détermine la devise) |
| Bouton « Créer mon compte » | TouchableOpacity principal | Soumet l'inscription |

#### Le guide doit couvrir

- création de compte ;
- choix du profil (commerçant vs fournisseur) ;
- choix du secteur d'activité (impacte les catégories par défaut et les modules visibles) ;
- informations obligatoires ;
- cas de validation incomplète ;
- rôle du démo dans la découverte du produit.

### C. Vérification d'e-mail (`frontend/app/(auth)/verify-email.tsx`)

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Champs OTP (6 chiffres) | TextInput × 6 | Saisie du code reçu par email |
| Bouton « Vérifier » | TouchableOpacity principal | Valide le code |
| Bouton « Renvoyer le code » | TouchableOpacity secondaire | Envoie un nouveau code (timer de 60s) |
| Timer | Texte animé | Décompte avant possibilité de renvoi |

#### Le guide doit couvrir

- réception du code ;
- saisie OTP ;
- renvoi du code ;
- erreurs fréquentes (code expiré, code incorrect) ;
- suite du parcours après validation.

### D. Vérification du téléphone (`frontend/app/(auth)/verify-phone.tsx`)

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Affichage du numéro | Texte | Numéro masqué partiellement |
| Champ code SMS | TextInput | Code OTP reçu par SMS |
| Bouton « Vérifier » | TouchableOpacity principal | Valide le code SMS |
| Bouton « Renvoyer » | TouchableOpacity secondaire | Renvoi du SMS (avec timer) |
| Bouton « Passer » | TouchableOpacity tertiaire | Ignore la vérification téléphone |

#### Le guide doit couvrir

- envoi du code ;
- saisie du code ;
- nouvelles tentatives ;
- erreurs de correspondance ;
- différence entre validation réussie et option de passage.

### E. Écran PIN et biométrie (`frontend/app/pin.tsx`)

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Clavier numérique | Grille de TouchableOpacity | Saisie du code PIN à 4 chiffres |
| Points indicateurs | Circles animés | Affichent le nombre de chiffres saisis |
| Icône biométrie | TouchableOpacity | Empreinte digitale / Face ID (si activé) |
| Bouton « Déconnexion » | TouchableOpacity texte | Retour à l'écran de connexion (la reconnexion biométrique reste possible si activée) |
| Icône retour arrière | TouchableOpacity | Supprime le dernier chiffre saisi |

#### Le guide doit couvrir

- création du code PIN (saisie + confirmation) ;
- déverrouillage au lancement ;
- biométrie (empreinte, Face ID) ;
- déconnexion depuis l'écran PIN ;
- erreurs de code (3 tentatives max).

---

## 2. Navigation générale et éléments transverses

### A. Barre d'onglets (`frontend/app/(tabs)/_layout.tsx`)

#### Onglets visibles

| Onglet | Icône | Libellé | Condition de visibilité |
|--------|-------|---------|------------------------|
| Accueil | `home-outline` | Accueil | Toujours visible |
| Produits | `cube-outline` | Produits | Toujours visible |
| Caisse | `cart-outline` | Caisse | Toujours visible |
| Commandes | `receipt-outline` | Commandes | Module fournisseurs activé |
| Fournisseurs | `people-outline` | Fournisseurs | Module fournisseurs activé |
| Comptabilité | `stats-chart-outline` | Compta | Module comptabilité activé |
| CRM | `person-add-outline` | Clients | Module CRM activé |
| Alertes | `notifications-outline` | Alertes | Toujours visible |
| Activité | `time-outline` | Activité | Toujours visible |
| Utilisateurs | `people-circle-outline` | Équipe | Permission staff |
| Paramètres | `settings-outline` | Paramètres | Toujours visible |
| Abonnement | `diamond-outline` | Abonnement | Toujours visible |
| Restaurant | `restaurant-outline` | Restaurant | Secteur restaurant uniquement |
| Tables | `grid-outline` | Tables | Secteur restaurant uniquement |
| Cuisine | `flame-outline` | Cuisine | Secteur restaurant uniquement |
| Réservations | `calendar-outline` | Réservations | Secteur restaurant uniquement |

#### Le guide doit couvrir

- la logique des onglets ;
- les onglets masqués selon le rôle, le secteur ou les modules activés ;
- les écrans accessibles hors onglets (PIN, vérification, CGU, confidentialité) ;
- la différence entre navigation principale et écrans secondaires.

### B. Header global

#### Éléments du header

| Élément | Icône | Position | Action |
|---------|-------|----------|--------|
| Logo / Nom de la boutique | — | Gauche | Affichage informatif |
| Sélecteur de boutique | `business-outline` | Gauche (dropdown) | Change la boutique active |
| Cloche notifications | `notifications-outline` | Droite | Ouvre la modal des notifications (badge rouge si non lues) |
| Aide / Guide | `help-circle-outline` | Droite | Ouvre le `ScreenGuide` de l'écran courant |
| Chat support | `chatbubble-outline` | Droite | Ouvre le `ContactSupportModal` |
| Assistant IA | `sparkles` | Droite | Ouvre le `AiSupportModal` |
| Engrenage paramètres | `settings-outline` | Droite | Raccourci vers les paramètres (Dashboard uniquement) |

#### Le guide doit couvrir

- aide contextuelle ;
- guide de l'écran ;
- chat support ;
- notifications ;
- assistance IA ;
- sélecteur de boutique.

### C. Sélecteur de boutique (`frontend/components/StoreSelector.tsx`)

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Boutique active affichée | Badge en haut | Nom de la boutique courante |
| Liste des boutiques | FlatList / ScrollView | Boutiques autorisées pour l'utilisateur |
| Indicateur boutique active | Icône checkmark | Marque la boutique actuellement sélectionnée |

#### Le guide doit couvrir

- boutique active ;
- changement de boutique ;
- impact sur les données affichées (stock, ventes, clients sont isolés par boutique) ;
- restrictions aux boutiques autorisées selon le rôle et les permissions ;
- plan Starter = 1 boutique, Pro = 2, Enterprise = illimité.

### D. Aide et assistance

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `HelpCenter` | `frontend/components/HelpCenter.tsx` | Modal listant tous les guides par module |
| `ScreenGuide` | `frontend/components/ScreenGuide.tsx` | Overlay pas-à-pas (4-7 étapes) sur l'écran courant |
| `AiSupportModal` | `frontend/components/AiSupportModal.tsx` | Chat IA (Gemini) pour aide contextuelle |
| `ContactSupportModal` | `frontend/components/ContactSupportModal.tsx` | Création + suivi de tickets support (2 onglets : Nouveau / Mes tickets) dans une modale panneau pleine hauteur |

#### ContactSupportModal — Détail des onglets

| Onglet | Éléments | Description |
|--------|----------|-------------|
| **Nouveau ticket** | Champ sujet + description + bouton Envoyer | Crée un ticket support visible par l'admin |
| **Mes tickets** | Liste avec badges statut (open/pending/closed) | Historique des tickets avec vue détail par ticket |
| **Vue détail** | Bulles de conversation + champ réponse | Chat bidirectionnel : l'utilisateur peut répondre tant que le ticket est ouvert |

#### Le guide doit couvrir

- comment ouvrir le `HelpCenter` (depuis Paramètres ou icône aide) ;
- comment relancer un guide spécifique ;
- comment poser une question à l'IA ;
- comment créer un ticket support et suivre la réponse ;
- différence entre aide contextuelle (guide rapide) et support (ticket humain).

### E. Notifications

#### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Badge cloche (header) | Badge numérique rouge | Nombre de notifications non lues |
| Modal notifications | Modal plein écran | Liste des notifications avec indicateur lu/non lu |
| Point bleu | Indicateur | Notification non lue |
| Bouton « Tout marquer lu » | TouchableOpacity | Marque toutes les notifications comme lues |
| Bouton fermer | Icône X | Ferme la modal |

#### Types de notifications

- Alertes stock bas / rupture (push automatique) ;
- Réponse admin à un ticket support ;
- Message broadcast de l'administration ;
- Anomalies détectées par l'IA.

#### Le guide doit couvrir

- accès aux alertes ;
- badges ;
- marquer comme lu (individuel ou global) ;
- actions disponibles ;
- hiérarchie des urgences.

### F. États transverses

| État | Composant | Apparence |
|------|-----------|-----------|
| Bannière hors ligne | `OfflineBanner` | Bandeau rouge en haut « Vous êtes hors ligne » |
| Bannière de synchronisation | `SyncWarningBanner` | Bandeau orange « X actions en attente de synchronisation » |
| Bannière d'essai | Badge dans le header | « Période d'essai : X jours restants » |
| Compte restreint | `AccessDenied` | Écran de blocage avec message et bouton « Mettre à niveau » |
| Skeleton loading | `Skeleton` | Placeholder animé pendant le chargement des données |
| `EmptyState` | Composant réutilisable | Icône + message quand une liste est vide |

#### Le guide doit couvrir

- bannière d'essai et période de grâce ;
- compte restreint (permissions insuffisantes) ;
- hors ligne (fonctionnement dégradé) ;
- avertissement de synchronisation ;
- session expirée (redirection automatique vers le login).

### G. Démo mobile

#### Le guide doit couvrir

- ouverture d'une session démo depuis l'écran de connexion ;
- données pré-remplies dans la démo ;
- durée de validité de la session ;
- différence entre démo et compte réel ;
- collecte de contact (email) à la fin de la démo.

---

## 3. Dashboard (`frontend/app/(tabs)/index.tsx`)

### Cartes KPI (grille 2×2)

| Carte | Icône | Couleur | Donnée |
|-------|-------|---------|--------|
| CA du jour | `cash-outline` | Vert (success) | `today_revenue` formaté en devise utilisateur |
| Ventes du jour | `receipt-outline` | Bleu (info) | `today_sales_count` |
| Valeur du stock | `cube-outline` | Orange (warning) | `total_stock_value` formaté en devise |
| CA du mois | `card-outline` | Violet (primary) | `month_revenue` formaté en devise |

Les valeurs sont animées via `AnimatedCounter`.

### Cartes contextuelles

| Carte | Composant | Condition d'affichage | Description |
|-------|-----------|----------------------|-------------|
| Astuce du jour | `TipCard` | Si non dismissed | Conseil contextuel quotidien (rôle shopkeeper ou supplier) |
| Prévisions IA | `ForecastCard` | Si données dispo | Prédiction de ventes basée sur l'historique |
| Rappels intelligents | `SmartRemindersCard` | Si rappels actifs | Rappels de réapprovisionnement, péremption, etc. |
| Résumé IA quotidien | `AiDailySummary` | Si données dispo | Synthèse IA de la journée (Gemini) |

### Sections du dashboard

| Section | Contenu | Éléments |
|---------|---------|----------|
| Santé du stock | Badges colorés | Rouge (rupture), Orange (stock bas), Bleu (surstock), Vert (normal) avec compteurs |
| Alertes péremption | Liste | Produits expirant dans les 30 jours (lots/batches) |
| Top produits du jour | Liste numérotée | 5 produits les plus vendus aujourd'hui |
| Réapprovisionnement | Liste + bouton « Commander » | Produits sous seuil min avec suggestion de commande |
| Inventaires en cours | Carte compteur | Tâches d'inventaire en statut `pending` avec bouton « Compter » |
| Paramètres dashboard | `DashboardSettingsModal` | Toggle d'affichage des sections KPI, stock, rappels, etc. |

### Boutons et actions

| Bouton | Icône | Position | Action |
|--------|-------|----------|--------|
| Cloche notifications | `notifications-outline` | Header droite | Ouvre la modal des notifications (badge avec compteur) |
| Engrenage paramètres | `settings-outline` | Header droite | Redirige vers l'écran Paramètres |
| Personnaliser dashboard | `options-outline` | Header droite | Ouvre `DashboardSettingsModal` |
| Partager le rapport | `share-outline` | Header droite | Génère un rapport HTML + partage natif (Share API) |
| Statistiques | `stats-chart-outline` + texte | Bas de page | Ouvre la modal des statistiques détaillées |
| Historique | `time-outline` + texte | Bas de page | Ouvre la modal d'historique des mouvements de stock |
| Commander (réappro) | Bouton primaire par produit | Section réappro | Redirige vers la création de commande fournisseur |
| Compter (inventaire) | Bouton primaire | Section inventaire | Redirige vers le batch-scan d'inventaire |
| Tout voir (stock critique) | Lien texte | Section santé du stock | Déploie la liste complète des produits critiques |

### Modals

| Modal | Déclencheur | Contenu |
|-------|-------------|---------|
| Notifications | Cloche header | Liste des notifications avec lu/non lu, bouton tout marquer lu |
| Statistiques | Bouton « Statistiques » | Graphiques LineChart, PieChart : CA par jour, répartition paiements, top produits. Boutons : Guide, Export, Fermer |
| Historique mouvements | Bouton « Historique » | Liste filtrée (Tous / Entrées / Sorties) avec PeriodSelector. Boutons : Export CSV, Fermer |
| Dashboard Settings | Icône options | Toggles pour afficher/masquer chaque section du dashboard |

### Le guide doit couvrir

- lecture des indicateurs principaux (KPI) ;
- rappels intelligents et prévisions IA ;
- état du stock (codes couleur des badges) ;
- alertes péremption ;
- raccourcis (commander, compter) ;
- personnalisation du dashboard (sections affichées) ;
- partage du rapport quotidien ;
- modal des statistiques et graphiques ;
- modal de l'historique des mouvements ;
- lecture de la santé globale de la boutique active.

---

## 4. Produits / Stock (`frontend/app/(tabs)/products.tsx`)

### Header et actions du header

| Bouton | Icône | Action |
|--------|-------|--------|
| Scanner | `scan-outline` | Ouvre `BarcodeScanner` pour recherche par code-barres |
| Export CSV | `download-outline` | Exporte la liste de produits en CSV (partage natif) |
| Guide | `help-circle-outline` | Lance le `ScreenGuide` produits |

### Barre de recherche et filtres

| Élément | Type | Description |
|---------|------|-------------|
| Barre de recherche | TextInput | Recherche par nom, SKU ou code-barres |
| Puces de catégorie | ScrollView horizontal | Filtres colorés par catégorie (Tout, puis catégories créées) |
| Filtre stock | Paramètre URL `filter` | Arrivée depuis le dashboard avec filtre prédéfini (`low_stock`, `out_of_stock`, `overstock`) |

### Liste des produits

| Élément de chaque carte produit | Description |
|----------------------------------|-------------|
| Image produit | Miniature (ou placeholder gris) |
| Nom du produit | Texte principal |
| Catégorie | Texte secondaire |
| Prix de vente | Formaté en devise utilisateur |
| Quantité en stock | Nombre avec badge couleur |
| Badge stock | Rouge (rupture), Orange (bas), Bleu (surstock), Vert (normal) |
| Bouton « Entrée » | Icône `add-circle` — mouvement de stock entrant |
| Bouton « Sortie » | Icône `remove-circle` — mouvement de stock sortant |
| Bouton « Étiquette » | Icône `pricetag` — génère un PDF avec QR Code |
| Bouton « Annuler mouvement » | Icône `arrow-undo` — annule un mouvement (dans l'historique) |

### Boutons flottants et actions principales

| Bouton | Icône | Position | Action |
|--------|-------|----------|--------|
| Ajouter un produit | `add` | Flottant en bas à droite | Ouvre la modal de création de produit |
| Import CSV | `cloud-upload-outline` | Header ou menu | Ouvre `BulkImportModal` (CSV/Excel) |
| Import texte | `text-outline` | Header ou menu | Ouvre `TextImportModal` (copier-coller texte) |
| Gérer les catégories | `settings-outline` | Header ou modal | Ouvre la modal de gestion des catégories |

### Modal de création / édition de produit

| Champ | Type | Description |
|-------|------|-------------|
| Nom du produit | TextInput (obligatoire) | Nom affiché |
| Catégorie | `CategorySubcategoryPicker` | Sélecteur hiérarchique catégorie/sous-catégorie |
| Prix d'achat | TextInput numérique | Prix fournisseur |
| Prix de vente | TextInput numérique | Prix client |
| Quantité initiale | TextInput numérique | Stock de départ |
| Stock minimum | TextInput numérique | Seuil d'alerte stock bas |
| Code-barres / SKU | TextInput | Identifiant unique |
| Unité de mesure | Picker | Pièce, Kg, Litre, Mètre, etc. |
| Image | `ImagePicker` | Photo depuis la galerie ou caméra |
| Produit actif | Toggle | Active/désactive le produit |
| Date d'expiration | DatePicker | Pour les lots périssables |
| Variantes | Section extensible | Ajouter des variantes (taille, couleur, etc.) |
| Emplacements | Picker multi-sélection | Localisation dans la boutique |

### Modal d'historique produit

| Élément | Description |
|---------|-------------|
| Onglet Mouvements | Liste chronologique des entrées/sorties avec raison, quantité, date |
| Onglet Ventes | Historique des ventes contenant ce produit |
| Bouton annuler mouvement | Icône `arrow-undo` sur chaque mouvement (sauf si raison commence par "Annulation de") |
| Filtre type | Tous / Entrées / Sorties |
| PeriodSelector | Filtre par période (7j, 30j, 90j, personnalisé) |
| Export CSV | Bouton export de l'historique |

### Modal gestion des catégories

| Élément | Description |
|---------|-------------|
| Liste des catégories existantes | Nom + nombre de produits |
| Bouton supprimer | Icône `trash-outline` par catégorie |
| Champ création | TextInput + bouton Ajouter |

### Imports

| Modal | Composant | Description |
|-------|-----------|-------------|
| Import CSV | `BulkImportModal` | Upload de fichier CSV/Excel, mapping des colonnes, preview, validation |
| Import texte | `TextImportModal` | Copier-coller d'un texte libre, parsing IA, preview des produits détectés |

### Vue Production (`ProductionView`)

Pour les secteurs avec production (boulangerie, couture, etc.) :

| Élément | Description |
|---------|-------------|
| Liste des recettes | Recettes liées aux produits |
| Statut de production | En cours, Terminé |
| Lien stock | Décrément automatique des ingrédients |

### Secteurs spécifiques

#### Commerce classique

- liste des produits, recherche, catégories, badges de stock ;
- entrées/sorties rapides ;
- impression d'étiquette QR ;
- organisation du catalogue ;
- valorisation du stock.

#### Restaurant

- menu / plats ;
- disponibilité (toggle actif/inactif) ;
- catégories menu ;
- lien avec les recettes ;
- mode de production (à l'avance, à la commande, hybride).

#### Production / artisanat

- logique métier du module ;
- création d'un article ;
- lien avec le stock (recettes) ;
- statut et disponibilité.

### Le guide doit couvrir

- recherche et filtrage par catégorie ;
- badges de stock (codes couleur) ;
- mouvements rapides (entrée/sortie) ;
- annulation de mouvement de stock ;
- impression d'étiquette PDF avec QR Code ;
- création et édition complète d'un produit ;
- import CSV et import texte ;
- gestion des catégories ;
- historique détaillé d'un produit ;
- export CSV ;
- fonctionnement par secteur (commerce, restaurant, production).

---

## 5. POS — Point de Vente (`frontend/app/(tabs)/pos.tsx`)

### Header et sessions

| Élément | Description |
|---------|-------------|
| Onglets de session | Tabs numérotés (Client 1, Client 2...) permettant de gérer plusieurs paniers simultanés |
| Bouton « + » session | Crée un nouveau panier parallèle |
| Indicateur panier | Nombre d'articles dans le panier courant |

### Zone produits

| Élément | Type | Description |
|---------|------|-------------|
| Barre de recherche | TextInput | Recherche par nom ou SKU |
| Scanner code-barres | `BarcodeScanner` | Icône scan dans le header |
| Grille produits | FlatList | Produits affichés en grille (photo, nom, prix, stock) |
| Bouton toggle liste/grille | Icône | Bascule entre affichage grille et liste (mobile) |
| Bouton afficher/masquer produits | Toggle | Sur mobile, masque la liste produits pour agrandir le panier |

### Zone panier

| Élément | Type | Description |
|---------|------|-------------|
| Ligne panier | Carte par article | Nom, prix unitaire, quantité, sous-total |
| Boutons +/− | TouchableOpacity | Ajustent la quantité |
| Bouton supprimer ligne | Icône `trash` | Supprime l'article du panier |
| Bouton remise de ligne | Icône `pricetag` | Ouvre `LineDiscountModal` (% ou fixe) |
| Bouton notes ligne | Icône `chatbubble` | Ajoute une note à la ligne (ex : « sans oignons ») |
| Total panier | Texte gras | Mis à jour en temps réel |
| Bouton client | Icône `person` | Associe un client existant ou en crée un nouveau |
| Bouton vider panier | Icône `trash-outline` | Vide tout le panier (avec confirmation) |

### Boutons d'encaissement

| Bouton | Icône | Description |
|--------|-------|-------------|
| Espèces | `cash-outline` | Paiement en espèces → ouvre le calculateur de monnaie |
| Mobile Money | `phone-portrait-outline` | Paiement mobile |
| Carte | `card-outline` | Paiement par carte |
| Virement | `swap-horizontal-outline` | Paiement par virement |
| Crédit | `time-outline` | Vente à crédit (associe la dette au client) |

### Modals du POS

| Modal | Composant | Déclencheur | Contenu |
|-------|-----------|-------------|---------|
| Calculateur de monnaie | `ChangeCalculatorModal` | Paiement espèces | Montant reçu, monnaie à rendre, billets suggérés |
| Remise de ligne | `LineDiscountModal` | Bouton tag sur une ligne | Type (% ou fixe), valeur, preview du nouveau prix |
| Reçu digital | `DigitalReceiptModal` | Après validation | Ticket de caisse avec options : imprimer, WhatsApp, Email |
| Client rapide | Modal inline | Bouton « + » client | Création rapide (nom + téléphone) |
| Produit pesé | Modal poids | Produit au poids | Saisie du poids, presets rapides, conversion automatique |
| Terminal POS | Modal terminal | Bouton terminal | Gestion du terminal physique de paiement |

### Options restaurant (si secteur restaurant)

| Élément | Description |
|---------|-------------|
| Associer une table | Sélecteur de table (libre, réservée, occupée) |
| Commande ouverte | Envoi en cuisine sans encaisser (service en cours) |
| Bouton « Envoyer en cuisine » | Crée un ticket cuisine avec les nouvelles lignes |
| Notes de service | Notes globales pour la commande |

### Le guide doit couvrir

- ajout d'un produit (recherche, scan, clic) ;
- gestion du panier (quantités +/−, suppression) ;
- multi-sessions (plusieurs paniers parallèles) ;
- remises de ligne (% ou fixe) ;
- calculateur de monnaie (espèces) ;
- client associé (existant ou création rapide) ;
- choix du mode de paiement (5 modes) ;
- vente à crédit et impact sur la dette client ;
- ticket de caisse et reçu digital (impression, WhatsApp, Email) ;
- produits au poids (saisie, presets, conversion) ;
- options restaurant (table, cuisine, commande ouverte) ;
- erreurs de stock (quantité insuffisante) ;
- validation et annulation.

---

## 6. Comptabilité (`frontend/app/(tabs)/accounting.tsx`)

### Cartes KPI

| Carte | Icône | Donnée |
|-------|-------|--------|
| Chiffre d'affaires | `cash-outline` | CA de la période |
| Bénéfice brut | `trending-up-outline` | Marge brute |
| Dépenses | `wallet-outline` | Total des dépenses (tap = catégories dominantes) |
| Bénéfice net | `stats-chart-outline` | CA − dépenses |
| Pertes | `warning-outline` | Total des pertes de la période (tap = détail par motif) |
| Nombre de ventes | `receipt-outline` | Compteur de transactions |
| Ticket moyen | `pricetag-outline` | CA / nombre de ventes |

Les ratios affichés dans les détails KPI (dépenses, marge nette, taxes) sont déjà en pourcentage.

### Filtre de période

| Élément | Type | Description |
|---------|------|-------------|
| `PeriodSelector` | Composant | 7j, 30j, 90j, 365j, personnalisé |
| Date début / fin | TextInput date | Mode personnalisé uniquement |
| Bouton « Appliquer » | TouchableOpacity | Applique la période personnalisée |

### Section dépenses

| Élément | Type | Description |
|---------|------|-------------|
| Liste des dépenses | FlatList | Date, catégorie, montant, description |
| Bouton ajouter dépense | `add-circle-outline` | Ouvre la modal de création |
| Bouton supprimer dépense | `trash-outline` | Supprime avec confirmation Alert (i18n) |
| Catégories de dépenses | Picker | Loyer, Salaire, Transport, Marchandise, Électricité, Eau, Internet, Autre |
| Toggle « Voir toutes » | Texte cliquable | Déploie la liste complète |

### Section ventes récentes

| Élément | Type | Description |
|---------|------|-------------|
| Liste des ventes | FlatList | Date, montant, mode paiement, nombre d'articles |
| Bouton créer facture | Icône `document-text` | Génère une facture PDF depuis une vente |
| Bouton annuler vente | Icône `close-circle` | Annule la vente (remet le stock, annule la fidélité) |
| Toggle « Voir toutes » | Texte cliquable | Déploie la liste complète |

### Section graphiques

| Graphique | Type | Données |
|-----------|------|---------|
| Évolution CA | `LineChart` | CA par jour sur la période |
| Répartition paiements | `PieChart` | Espèces, Mobile Money, Carte, Virement, Crédit |

### Section factures

| Élément | Description |
|---------|-------------|
| Liste des factures | Historique des factures générées |
| Statut facture | Payée, En attente |
| Bouton télécharger/partager | Génère et partage le PDF |

### Section performances

| Donnée | Description |
|--------|-------------|
| Top produits | Produits les plus vendus (quantité + CA) |
| Top catégories | Catégories les plus venteuses |
| Marge par produit | Produits les plus rentables |

### Boutons du header

| Bouton | Icône | Action |
|--------|-------|--------|
| Export CSV | `download-outline` | Exporte les données comptables en CSV |
| Créer facture | `document-text-outline` | Ouvre la modal de création de facture client |

### Modal création facture

| Champ | Type | Description |
|-------|------|-------------|
| Client | Picker | Sélection parmi les clients CRM |
| Lignes de facture | Liste dynamique | Produit, quantité, prix unitaire, TVA |
| Bouton ajouter ligne | TouchableOpacity | Ajoute une ligne à la facture |
| Notes | TextInput | Mentions libres |
| Bouton valider | TouchableOpacity principal | Génère la facture PDF |

### Le guide doit couvrir

- indicateurs clés et leur calcul (CA, bénéfice brut, net) ;
- dépenses : création, catégorisation, suppression avec confirmation ;
- filtres de période ;
- annulation de vente ;
- création de facture depuis une vente existante ;
- création de facture manuelle ;
- graphiques (CA, répartition paiements) ;
- performances (top produits, marges) ;
- export CSV ;
- différences entre synthèse et détail.

---

## 7. Fournisseurs (`frontend/app/(tabs)/suppliers.tsx`)

### Onglets internes

| Onglet | Description |
|--------|-------------|
| Mes fournisseurs | Liste des fournisseurs directs |
| Marketplace | Réseau de fournisseurs vérifiés (catalogue partagé) |

### Liste des fournisseurs

| Élément par carte | Description |
|-------------------|-------------|
| Nom du fournisseur | Texte principal |
| Téléphone / Email | Texte secondaire |
| Nombre de produits liés | Badge compteur |
| Bouton appeler | Icône `call-outline` — lance un appel |
| Bouton email | Icône `mail-outline` — ouvre le client email |
| Bouton supprimer | Icône `trash-outline` — supprime avec confirmation |

### Boutons et actions

| Bouton | Icône | Action |
|--------|-------|--------|
| Ouvrir fiche fournisseur | Tap sur la carte | Ouvre la modale détaillée du fournisseur |
| Ajouter fournisseur | `add` (flottant) | Ouvre la modal de création |
| Filtres | `filter-outline` | Ouvre les filtres (recherche, catégorie) |
| Inviter fournisseur | `person-add-outline` | Envoie une invitation au fournisseur |
| Chat fournisseur | `chatbubble-outline` | Ouvre la conversation avec le fournisseur |

### Modal création / édition fournisseur

| Champ | Type | Description |
|-------|------|-------------|
| Nom | TextInput (obligatoire) | Nom du fournisseur |
| Téléphone | TextInput | Numéro de contact |
| Email | TextInput | Adresse email |
| Adresse | TextInput | Adresse physique |
| Notes | TextInput multiline | Notes libres |

### Fiche fournisseur détaillée

| Section | Contenu |
|---------|---------|
| Infos générales | Nom, contact, adresse |
| Produits liés | Liste des produits associés à ce fournisseur |
| Journal | Historique des interactions (notes) |
| Commandes | Liste des commandes passées |
| Factures | Factures fournisseur scannées/créées |
| Historique prix | Évolution des prix d'achat par produit |

| Bouton dans la fiche | Action |
|---------------------|--------|
| Lier des produits | `link-outline` — ouvre le modal de liaison produit-fournisseur |
| Ajouter au journal | `add-outline` — ajoute une note d'interaction |
| Créer facture | `document-text-outline` — crée une facture fournisseur |
| Voir toutes les commandes | Lien texte — déploie l'historique complet |

### Marketplace

| Élément | Description |
|---------|-------------|
| Catalogue fournisseur | Produits proposés par les fournisseurs vérifiés |
| Filtres marketplace | Catégorie, prix, disponibilité |
| Bouton commander | Crée une commande marketplace |
| Fiche fournisseur MP | Note moyenne, délai, zone de livraison |

### Le guide doit couvrir

- liste des fournisseurs et actions rapides (appel, email) ;
- distinction fournisseur direct vs marketplace ;
- commandes fournisseur ;
- journal d'interactions ;
- factures fournisseur ;
- historique de prix d'achat ;
- création de facture fournisseur ;
- rattachement des produits à un fournisseur ;
- actions de contact direct ;
- invitation fournisseur ;
- chat avec un fournisseur.

---

## 8. CRM — Clients & Fidélité (`frontend/app/(tabs)/crm.tsx`)

### Barre de recherche et filtres

| Élément | Type | Description |
|---------|------|-------------|
| Barre de recherche | TextInput | Recherche par nom ou téléphone |
| Filtres de tri | Puces horizontales | Nom, Total dépensé, Dernier achat, Visites |
| Filtres de palier | Puces horizontales | Tous, Bronze, Argent, Or, Platine |

### Liste des clients

| Élément par carte | Description |
|-------------------|-------------|
| Nom du client | Texte principal |
| Téléphone | Texte secondaire |
| Catégorie | Badge (Particulier, Revendeur, VIP, Autre) |
| Palier fidélité | Badge couleur (Bronze 🟤, Argent ⚪, Or 🟡, Platine ⬜) avec icône bouclier |
| Total dépensé | Montant formaté |
| Dernier achat | Date relative (« il y a 3 jours ») |
| Points fidélité | Compteur numérique |
| Dette en cours | Montant en rouge (si > 0) |

### Boutons et actions

| Bouton | Icône | Position | Action |
|--------|-------|----------|--------|
| Ajouter client | `add` | Flottant | Ouvre la modal de création client |
| Export PDF | `document-text-outline` | Header | Génère un rapport PDF des clients |
| Export CSV | `download-outline` | Header | Exporte la liste en CSV |

### Modal création / édition client

| Champ | Type | Description |
|-------|------|-------------|
| Nom | TextInput (obligatoire) | Nom du client |
| Téléphone | TextInput | Numéro de contact |
| Email | TextInput | Adresse email |
| Catégorie | Picker | Particulier, Revendeur, VIP, Autre |
| Date d'anniversaire | DatePicker | Pour offres spéciales automatiques |
| Notes | TextInput multiline | Notes libres |

### Fiche client détaillée (modal avec 4 onglets)

| Onglet | Contenu |
|--------|---------|
| **Infos** | Nom, téléphone, email, catégorie, anniversaire, palier fidélité, points, date création |
| **Achats** | Historique des ventes associées (date, montant, articles, mode paiement) |
| **Contact** | Boutons appeler (`call`), SMS, WhatsApp, Email |
| **Compte** | Gestion dette : historique debt/payment, ajout dette manuelle, enregistrement paiement, annulation paiement |

### Gestion des dettes (onglet Compte)

| Élément | Type | Description |
|---------|------|-------------|
| Dette actuelle | Montant en gras rouge | `current_debt` du client |
| Bouton « Ajouter dette » | TouchableOpacity | Crée une dette manuelle (modal avec montant + description) |
| Bouton « Enregistrer paiement » | TouchableOpacity | Enregistre un remboursement (modal avec montant) |
| Historique dette | FlatList | Lignes dette/payment avec date, montant, description |
| Bouton annuler paiement | Icône `arrow-undo` | Sur chaque paiement — annule et recrédite la dette (avec confirmation) |

### Promotions

| Élément | Type | Description |
|---------|------|-------------|
| Carte rapide créer promo | `quickActionCard` | Ouvre la modal de création de promotion |
| Formulaire promo | Modal | Titre, description, remise (%) ou points, audience cible |
| Validation promo | Bouton principal | Crée ou met à jour la promotion |

### Campagnes marketing

| Élément | Type | Description |
|---------|------|-------------|
| Carte rapide campagne | `quickActionCard` | Ouvre la modal de campagne WhatsApp |
| Sélecteur de cible | Modal multi-sélection | Tous les clients, par palier ou sélection manuelle |
| Type de campagne | WhatsApp (lancement depuis la modal) |
| Message | TextInput multiline | Contenu du message |
| Bouton envoyer | TouchableOpacity principal | Envoie la campagne |

### Actions sur la fiche client

| Bouton | Action |
|--------|--------|
| Appeler | Lance un appel téléphonique |
| SMS | Ouvre l'app SMS |
| WhatsApp | Ouvre WhatsApp avec le numéro |
| Email | Ouvre le client email |
| Supprimer client | Supprime avec confirmation (Alert) |

### Le guide doit couvrir

- fichier client : création, modification, suppression ;
- fiche client (4 onglets) ;
- dette : ajout, paiement, annulation de paiement ;
- paliers de fidélité (Bronze → Platine) et points ;
- achats : historique par client ;
- campagnes marketing (SMS/Email) ;
- promotions : création, édition, suppression ;
- segments et filtres de tri ;
- anniversaires et offres spéciales ;
- conséquences sur la fidélité et le POS ;
- export PDF et CSV.

---

## 9. Commandes fournisseurs (`frontend/app/(tabs)/orders.tsx`)

### Liste des commandes

| Élément par carte | Description |
|-------------------|-------------|
| Numéro de commande | Identifiant unique |
| Fournisseur | Nom du fournisseur |
| Date | Date de création |
| Nombre d'articles | Compteur |
| Montant total | Formaté en devise |
| Statut | Badge couleur (En attente, Confirmée, Expédiée, Livrée, Annulée) |

### Boutons et actions

| Bouton | Icône | Action |
|--------|-------|--------|
| Importer une facture | `scan-outline` | Lance le scan de facture fournisseur |
| Exporter | `document-text-outline` | Exporte les commandes en PDF |
| Guide | `help-circle-outline` | Lance le `ScreenGuide` commandes |
| Nouvelle commande | `add` | Ouvre la modal de création |
| Filtres | Carte repliable `Filtres` | Affiche ou masque les filtres avancés (statut, période, fournisseur) sans cacher la liste |

### Modal création de commande

| Champ | Type | Description |
|-------|------|-------------|
| Fournisseur | Picker | Sélection du fournisseur destinataire |
| Lignes d'articles | Liste dynamique | Produit, quantité, prix unitaire |
| Notes | TextInput | Notes pour le fournisseur |
| Bouton valider | TouchableOpacity principal | Crée la commande |

### Modal détail de commande

| Section | Contenu |
|---------|---------|
| Informations | Fournisseur, date, statut, montant |
| Lignes | Détail des articles commandés |
| Actions | Selon le statut |

| Bouton d'action | Condition | Effet |
|----------------|-----------|-------|
| Annuler | Statut = En attente | Annule la commande (confirmation Alert) |
| Réception complète | Statut = Expédiée ou Confirmée | Valide toute la commande → incrémente le stock |
| Réception partielle | Statut = Expédiée ou Confirmée | Ouvre modal de saisie partielle (quantités reçues par ligne) |
| Retour | Statut = Livrée | Ouvre modal de retour (sélection articles retournés) |
| Noter le fournisseur | Statut = Livrée | Ouvre modal de notation (étoiles + commentaire) |
| Scanner facture | Tout statut | Ouvre le scanner pour capturer la facture papier |

### Modals spécifiques

| Modal | Déclencheur | Contenu |
|-------|-------------|---------|
| Réception partielle | Bouton « Partiel » | Lignes avec quantité commandée vs quantité reçue (TextInput par ligne) |
| Retour | Bouton « Retour » | Sélection d'articles à retourner avec motif |
| Notation | Bouton « Noter » | Étoiles (1-5) + commentaire texte |
| Scan facture | Bouton « Scanner » | Caméra pour capturer la facture fournisseur |
| Historique | Bouton « Historique » | Toutes les commandes passées avec ce fournisseur |

### Le guide doit couvrir

- création de commande fournisseur ;
- historique et filtres par statut ;
- détail d'une commande ;
- livraison complète et livraison partielle ;
- retour de marchandise ;
- notation du fournisseur ;
- scan de facture ;
- confirmations et annulations ;
- effets automatiques sur le stock (réception → incrémentation).

---

## 10. Alertes (`frontend/app/(tabs)/alerts.tsx`)

### Sections principales

| Section | Description |
|---------|-------------|
| Alertes actives | Liste des produits nécessitant une action |
| Anomalies IA | Alertes intelligentes détectées par l'IA (mouvements suspects, tendances) |
| Règles d'alerte | Configuration des seuils personnalisés |

### Types d'alertes

| Type | Badge | Description |
|------|-------|-------------|
| Rupture de stock | Rouge | Stock = 0 |
| Stock bas | Orange | Stock ≤ seuil minimum |
| Surstock | Bleu | Stock > 3× seuil minimum |
| Stock dormant | Gris | Aucune vente depuis 30+ jours |
| Péremption proche | Jaune | Lot expirant dans les 30 jours |
| Anomalie IA | Violet | Mouvement suspect ou tendance inhabituelle |

### Boutons et actions

| Bouton | Icône | Action |
|--------|-------|--------|
| Guide | `help-circle-outline` | Lance le `ScreenGuide` alertes |
| Règles d'alerte | `settings-outline` | Ouvre la modal des règles |
| Voir anomalies | Toggle | Affiche/masque la section anomalies IA |
| Voir toutes les alertes | Lien texte | Déploie la liste complète |

### Modal règles d'alerte

| Élément | Type | Description |
|---------|------|-------------|
| Seuil stock bas | TextInput numérique | Produit alerté si stock ≤ cette valeur |
| Seuil surstock | TextInput numérique | Produit alerté si stock ≥ cette valeur |
| Jours dormant | TextInput numérique | Jours sans vente avant alerte |
| Alerte péremption | Toggle + jours | Nombre de jours avant expiration |
| Bouton sauvegarder | TouchableOpacity principal | Enregistre les règles |

### Le guide doit couvrir

- types d'alertes et codes couleur ;
- règles personnalisables ;
- anomalies IA (quand elles apparaissent, que faire) ;
- résolution d'une alerte (action corrective) ;
- masquage d'une alerte ;
- lecture des priorités.

---

## 11. Activité (`frontend/app/(tabs)/activity.tsx`)

### Interface

| Élément | Type | Description |
|---------|------|-------------|
| Liste des actions | FlatList chronologique | Toutes les actions dans la boutique |
| Icône par type | Ionicons | Couleur et icône selon le module (stock, vente, CRM, etc.) |
| Filtre module | ScrollView horizontal | Puces de filtre (Tous, Stock, Ventes, CRM, Comptabilité, etc.) |
| Nom utilisateur | Texte | Qui a effectué l'action |
| Date et heure | Texte secondaire | Horodatage précis |
| Pull-to-refresh | RefreshControl | Actualise le journal |

### Types d'événements

| Module | Exemples d'actions |
|--------|-------------------|
| Stock | Création produit, mouvement entrée/sortie, annulation mouvement |
| Ventes | Vente validée, vente annulée |
| CRM | Client créé, paiement dette, campagne envoyée |
| Comptabilité | Dépense ajoutée, facture créée |
| Commandes | Commande créée, réception validée |
| Utilisateurs | Employé créé, permissions modifiées |
| Paramètres | Boutique créée, module activé/désactivé |

### Le guide doit couvrir

- journal des actions en temps réel ;
- filtres par type de module ;
- lecture des événements (icône, libellé, auteur, date) ;
- suivi par utilisateur (qui a fait quoi) ;
- utilité pour le contrôle interne et l'audit.

---

## 12. Utilisateurs (`frontend/app/(tabs)/users.tsx`)

### Liste des utilisateurs

| Élément par carte | Description |
|-------------------|-------------|
| Nom | Texte principal |
| Email | Texte secondaire |
| Rôle | Badge (staff, manager) |
| Statut | Actif/Inactif |
| Bouton supprimer | Icône `trash-outline` (avec confirmation) |

### Boutons et actions

| Bouton | Icône | Action |
|--------|-------|--------|
| Ajouter employé | `add` (flottant) | Ouvre la modal de création |
| Partager identifiants | `share-social-outline` | Envoie les identifiants par WhatsApp |

### Modal création / édition

| Champ | Type | Description |
|-------|------|-------------|
| Nom | TextInput (obligatoire) | Nom de l'employé |
| Email | TextInput (obligatoire) | Servira d'identifiant de connexion |
| Mot de passe | TextInput | Généré automatiquement ou saisi |
| Rôle | Picker | Staff ou Manager |
| Boutiques autorisées | Multi-sélection | Liste des boutiques accessibles |
| Permissions par module | Toggles par module | Aucun accès / Lecture / Lecture + Écriture |

### Permissions granulaires

| Module | Options |
|--------|---------|
| Stock / Produits | Aucun, Lecture, Écriture |
| Caisse (POS) | Aucun, Lecture, Écriture |
| Comptabilité | Aucun, Lecture, Écriture |
| CRM | Aucun, Lecture, Écriture |
| Fournisseurs | Aucun, Lecture, Écriture |
| Personnel | Aucun, Lecture, Écriture |

### Limites par plan

| Plan | Nombre max d'employés |
|------|-----------------------|
| Starter | 1 |
| Pro | 5 |
| Enterprise | Illimité |

### Le guide doit couvrir

- ajout d'un employé ;
- rôles (Staff vs Manager) ;
- permissions granulaires par module ;
- partage des identifiants par WhatsApp ;
- limitations selon l'abonnement ;
- gestion des boutiques autorisées ;
- suppression d'un employé.

---

## 13. Paramètres (`frontend/app/(tabs)/settings.tsx`)

### Sections accordéon

L'écran est organisé en sections repliables (`SettingsAccordionSection`).

#### 1. Profil et application

| Élément | Type | Action |
|---------|------|--------|
| Photo de profil | Image | Affichage informatif |
| Nom d'utilisateur | Texte | Affichage informatif |
| Email | Texte | Affichage informatif |
| Rôle | Badge | Affichage informatif |
| Plan actif | Badge couleur | Affichage informatif |
| Changer la langue | TouchableOpacity | Ouvre `LanguagePickerModal` (15 langues) |
| Changer le mot de passe | TouchableOpacity | Ouvre `ChangePasswordModal` |
| Thème sombre | Toggle | Bascule mode clair/sombre |

#### 2. Notifications personnelles

| Élément | Type | Description |
|---------|------|-------------|
| Stock bas | Toggle | Notification push quand un produit passe sous le seuil |
| Rupture de stock | Toggle | Notification push à 0 stock |
| Nouvelle vente | Toggle | Notification à chaque vente |
| Nouveau client | Toggle | Notification à chaque inscription client |
| Contacts d'alerte | TextInputs | Email et téléphone pour recevoir les alertes |

#### 3. Équipe (si manager ou admin)

| Élément | Type | Action |
|---------|------|--------|
| Lien « Gérer l'équipe » | TouchableOpacity | Redirige vers l'écran Utilisateurs |

#### 4. Organisation

| Élément | Type | Description |
|---------|------|-------------|
| Nom de l'organisation | TextInput | Nom affiché sur les documents |
| Modules activés | Toggles multiples | CRM, Comptabilité, Fournisseurs, Alertes, Activité |

#### 5. Boutique active

| Élément | Type | Description |
|---------|------|-------------|
| Nom de la boutique | TextInput | Nom modifiable |
| Adresse | TextInput | Adresse de la boutique |
| Bouton sauvegarder | TouchableOpacity | Enregistre les modifications |

#### 6. Documents de vente

| Élément | Type | Description |
|---------|------|-------------|
| Nom sur le ticket | TextInput | Nom commercial affiché sur le ticket de caisse |
| Pied de ticket | TextInput | Message en bas du ticket |
| Nom facture | TextInput | Raison sociale sur les factures |
| Adresse facture | TextInput | Adresse de facturation |
| Libellé facture | TextInput | « Facture » ou personnalisé |
| Préfixe numérotation | TextInput | Ex : FAC-001 |
| Pied de facture | TextInput | Mentions légales |
| Conditions de paiement | TextInput | Ex : « Payable à 30 jours » |

#### 7. Alertes du compte

| Élément | Type | Description |
|---------|------|-------------|
| Email d'alerte | TextInput | Adresse de réception des alertes |
| Téléphone d'alerte | TextInput | Numéro de réception SMS |

#### 8. Alertes de la boutique

| Élément | Type | Description |
|---------|------|-------------|
| Contacts boutique | TextInputs | Email et téléphone spécifiques à la boutique active |

#### 9. Fiscalité

| Élément | Type | Description |
|---------|------|-------------|
| TVA activée | Toggle | Active/désactive la TVA |
| Taux de TVA | TextInput numérique | Pourcentage par défaut |
| Mention légale TVA | TextInput | Texte affiché sur les factures |

#### 10. Rappels intelligents

| Élément | Type | Description |
|---------|------|-------------|
| Rappels activés | Toggle | Active/désactive les rappels IA |
| Heure de rappel | TimePicker | Heure quotidienne de rappel |
| Types de rappels | Toggles multiples | Réapprovisionnement, péremption, stock dormant |

#### 11. Synchronisation

| Élément | Type | Description |
|---------|------|-------------|
| Statut sync | Indicateur | Dernière synchronisation réussie |
| Forcer la synchronisation | TouchableOpacity | Déclenche une synchronisation manuelle |

#### 12. Abonnement et facturation

| Élément | Type | Description |
|---------|------|-------------|
| Plan actuel | Badge | Starter, Pro, Enterprise |
| Statut | Badge | Actif, Essai, Expiré |
| Contact facturation | TextInputs | Nom et email du contact facturation |
| Bouton mise à niveau | TouchableOpacity | Redirige vers l'écran Abonnement |

#### 13. Aide et support

| Élément | Type | Action |
|---------|------|--------|
| Centre d'aide | TouchableOpacity | Ouvre `HelpCenter` |
| Contacter le support | TouchableOpacity | Ouvre `ContactSupportModal` |
| Assistant IA | TouchableOpacity | Ouvre `AiSupportModal` |
| Signaler un problème | TouchableOpacity | Ouvre le formulaire de litige/dispute |

##### Formulaire de litige

| Champ | Type | Description |
|-------|------|-------------|
| Type | Puces horizontales | Facturation, Technique, Paiement, Autre |
| Sujet | TextInput | Objet du litige |
| Description | TextInput multiline | Détail du problème |
| Bouton envoyer | TouchableOpacity (rouge) | Soumet le litige à l'admin |

#### 14. Sécurité

| Élément | Type | Description |
|---------|------|-------------|
| Code PIN | Toggle | Active/désactive le code PIN |
| Biométrie | Toggle | Active/désactive (nécessite PIN actif) |

#### 15. Informations légales

| Élément | Type | Action |
|---------|------|--------|
| Version de l'app | Texte | Ex : 1.0.0 |
| CGU | TouchableOpacity | Ouvre l'écran CGU |
| Politique de confidentialité | TouchableOpacity | Ouvre l'écran Privacy |

#### 16. Données et suppression (zone danger)

| Élément | Type | Action |
|---------|------|--------|
| Exporter mes données | TouchableOpacity + `download-outline` | Exporte toutes les données en JSON (RGPD) |
| Supprimer mon compte | TouchableOpacity + `trash-outline` (rouge) | Ouvre `DeleteAccountModal` (suppression définitive) |

#### 17. Déconnexion

| Élément | Type | Action |
|---------|------|--------|
| Bouton déconnexion | TouchableOpacity (rouge) | Déconnecte et retourne au login |

### Modals des paramètres

| Modal | Composant | Déclencheur |
|-------|-----------|-------------|
| Langue | `LanguagePickerModal` | Bouton « Changer la langue » |
| Mot de passe | `ChangePasswordModal` | Bouton « Changer le mot de passe » |
| Suppression compte | `DeleteAccountModal` | Bouton « Supprimer mon compte » |
| Support | `ContactSupportModal` | Bouton « Contacter le support » |
| IA | `AiSupportModal` | Bouton « Assistant IA » |
| Centre d'aide | `HelpCenter` | Bouton « Centre d'aide » |
| Guide relancé | `ScreenGuide` | Sélection d'un guide dans le HelpCenter |

### Le guide doit couvrir

- profil et informations du compte ;
- langue (15 langues disponibles) ;
- apparence (thème sombre) ;
- modules activés et impact sur les onglets ;
- gestion des boutiques ;
- documents de vente (ticket, factures) ;
- fiscalité (TVA) ;
- notifications et alertes personnalisées ;
- rappels intelligents ;
- sécurité (PIN, biométrie) ;
- export de données (RGPD) ;
- suppression de compte (irréversible) ;
- aide et support (centre d'aide, chat, IA, litiges) ;
- déconnexion.

---

## 14. Abonnement (`frontend/app/(tabs)/subscription.tsx`)

### Éléments de l'interface

| Élément | Type | Description |
|---------|------|-------------|
| Plan actuel | Badge en haut | Affiche le plan et le statut |
| Cartes des plans | 3 cartes | Starter, Pro, Enterprise avec prix et fonctionnalités |
| Sélecteur de plan | RadioGroup (cartes cliquables) | Sélectionne le plan cible |

### Plans et prix

| Plan | Prix FCFA/mois | Prix EUR/mois | Boutiques | Utilisateurs |
|------|----------------|---------------|-----------|-------------|
| Starter | 2 500 | 6,99 | 1 | 1 |
| Pro | 4 900 | 9,99 | 2 | 5 |
| Enterprise | 9 900 | 14,99 | Illimité | Illimité |

### Boutons d'action

| Bouton | Condition | Action |
|--------|-----------|--------|
| Payer par Flutterwave | Afrique (Mobile Money) | Redirige vers le paiement Flutterwave |
| Payer par RevenueCat | Play Store / App Store | Lance l'achat in-app via RevenueCat |
| Aide test Google Play | Android (test interne) | Rappelle d'utiliser un compte testeur autorisé (tests de licence + piste de test) |
| Contacter pour Enterprise | Toujours visible | Ouvre le formulaire de contact Enterprise |
| Récupérer mon abonnement | Toujours visible | Retrouve un abonnement déjà payé après réinstallation ou changement de téléphone (RevenueCat) |
| Retour | Flèche gauche | Retourne à l'écran précédent |

### Le guide doit couvrir

- plan actif et ses limites ;
- comparaison des plans (fonctionnalités, prix) ;
- mise à niveau ;
- statut d'abonnement (actif, essai, expiré, période de grâce) ;
- lecture seule (quand l'abonnement expire) ;
- récupération d'un abonnement existant (après réinstallation ou changement de téléphone) ;
- régularisation.

---

## 15. Modules restauration

Ces guides ne doivent être visibles que pour les secteurs restaurant / fast-food.

### A. Hub restaurant (`frontend/app/(tabs)/restaurant.tsx`)

| Carte | Icône | Destination |
|-------|-------|-------------|
| Tables | `grid-outline` | Écran Tables |
| Réservations | `calendar-outline` | Écran Réservations |
| Cuisine | `flame-outline` | Écran Cuisine |
| Comptoir | `cart-outline` | Écran POS |

#### Le guide doit couvrir

- vue d'ensemble du hub ;
- accès rapides vers chaque sous-module ;
- articulation entre salle, réservations, cuisine et caisse.

### B. Tables (`frontend/app/(tabs)/tables.tsx`)

| Élément | Type | Description |
|---------|------|-------------|
| Grille des tables | FlatList de cartes | Chaque table = carte avec nom, capacité, statut |
| Badge statut | Couleur | Libre (vert), Réservée (bleu), Occupée (orange), Nettoyage (gris) |
| Bouton ajouter table | `add` (en haut) | Ouvre le formulaire de création |
| Tap sur une table | TouchableOpacity | Cycle le statut : Libre → Occupée → Nettoyage → Libre |

#### Modal création table

| Champ | Type |
|-------|------|
| Nom | TextInput |
| Capacité | TextInput numérique |

#### Le guide doit couvrir

- états des tables (4 statuts) ;
- occupation et cycle de statut ;
- création d'une nouvelle table ;
- capacité et impact sur les réservations ;
- libération après paiement.

### C. Réservations (`frontend/app/(tabs)/reservations.tsx`)

#### Le guide doit couvrir

- création d'une réservation (nom, heure, couverts, demandes) ;
- confirmation et arrivée ;
- annulation et no-show ;
- conversion vers le service (affecter table + ouvrir commande) ;
- suivi des statuts (demandée, confirmée, arrivée, annulée, no-show).

### D. Cuisine (`frontend/app/(tabs)/kitchen.tsx`)

| Élément | Type | Description |
|---------|------|-------------|
| Liste des tickets | FlatList | Tickets envoyés depuis la caisse |
| Détail ticket | Carte | Table, articles, quantités, notes |
| Bouton « Prêt » | TouchableOpacity par article | Marque un article comme prêt |
| Bouton « Servi » | TouchableOpacity par ticket | Marque tout le ticket comme servi |
| Bouton rafraîchir | `refresh-outline` | Actualise la file d'attente |
| Indicateur statut | Badge par article | En attente, En préparation, Prêt, Servi |

#### Le guide doit couvrir

- file d'attente des tickets cuisine ;
- progression par article (prêt) et par ticket (servi) ;
- marquage prêt et marquage servi ;
- lien avec les commandes de salle ;
- rafraîchissement de la file.

---

## 16. Administration mobile (`frontend/app/(admin)/index.tsx`)

### Segments disponibles

L'écran admin est organisé en segments navigables horizontalement.

| Segment | Icône | Description |
|---------|-------|-------------|
| Global | `grid` | KPIs et vue d'ensemble |
| Utilisateurs | `people` | Gestion de tous les utilisateurs |
| Boutiques | `business` | Liste de toutes les boutiques |
| Abonnements | — | États, providers, grâce |
| Démos | — | Sessions démo |
| Stock | `cube` | Produits globaux |
| Finance | `cash` | Synthèse financière |
| CRM | `person-add` | Clients globaux |
| Support | `help-buoy` | Tickets support |
| Litiges | `warning` | Disputes |
| Communications | `megaphone` | Messages broadcast |
| Sécurité | `shield` | Événements sécurité |
| Logs | `list` | Journal d'audit |
| Paramètres | `settings` | Paramètres admin |
| CGU | `document-text` | Consultation des CGU |
| Confidentialité | `shield-checkmark` | Politique de confidentialité |

### A. Vue globale

| KPI | Description |
|-----|-------------|
| Total utilisateurs | Nombre d'inscrits |
| Boutiques actives | Nombre de boutiques |
| Inscriptions aujourd'hui | `signups_today` |
| Essais expirant bientôt | `trials_expiring_soon` |
| Distribution par plan | `users_by_plan` (Starter, Pro, Enterprise) |
| Santé système | Statut API, DB, services |

### B. Utilisateurs

| Élément | Type | Description |
|---------|------|-------------|
| Barre de recherche | TextInput | Recherche par nom ou email |
| Filtre par rôle | Puces | Tous, shopkeeper, supplier, staff, admin |
| Liste des utilisateurs | FlatList | Nom, email, rôle, plan, statut |
| Bouton bloquer/débloquer | Toggle | Lock/unlock un compte |
| Bouton changer mot de passe | TouchableOpacity | Ouvre la modal de reset password |

### C. Boutiques

| Élément | Description |
|---------|-------------|
| Liste des boutiques | Nom, propriétaire, nombre de produits |
| Recherche | Par nom ou par propriétaire |

### D. Abonnements

| Élément | Description |
|---------|-------------|
| Vue d'ensemble | Total actifs, en essai, expirés, en grâce |
| Liste des comptes | Avec statut, provider (Stripe/Flutterwave/RevenueCat), plan |
| Événements | Historique des changements d'abonnement |
| Alertes | Comptes en situation critique |
| Recherche | Par email ou nom |
| Filtre pays | Par code pays |

### E. Démos

| Élément | Description |
|---------|-------------|
| Vue d'ensemble | Sessions actives, expirées, converties |
| Liste des sessions | Type (mobile/web), date, durée, statut |
| Total | Compteur total |

### F. Stock

| Élément | Description |
|---------|-------------|
| Liste globale produits | Tous les produits de tous les utilisateurs |
| Recherche | Par nom |
| Lecture par business | Identification du propriétaire |

### G. Finance

| Élément | Description |
|---------|-------------|
| Synthèse globale | CA total, dépenses, bénéfices |
| Indicateurs principaux | Agrégés sur tous les comptes |

### H. CRM

| Élément | Description |
|---------|-------------|
| Liste des clients | Vue transverse tous comptes |
| Recherche | Par nom ou téléphone |

### I. Support

| Élément | Description |
|---------|-------------|
| Liste des tickets | Avec statut (open, pending, closed) |
| Filtre | Par statut |
| Détail ticket | Conversation complète |
| Bouton répondre | TextInput + envoi (push notification + email au user) |
| Bouton fermer | Change le statut en closed |

### J. Litiges

| Élément | Description |
|---------|-------------|
| Liste des litiges | Type, sujet, statut |
| Filtre | Par statut (tous, open, pending, resolved) |
| Stats litiges | Total, par type, par statut |
| Bouton changer statut | Picker de statut |
| Bouton répondre | TextInput + envoi |

### K. Communications

| Élément | Description |
|---------|-------------|
| Liste des messages | Messages broadcast envoyés |
| Bouton nouveau message | Ouvre le formulaire de création |
| Formulaire | Titre, contenu, cible (tous les utilisateurs ou sélection) |
| Bouton envoyer | Envoie le message (push + notification) |

### L. Sécurité

| Élément | Description |
|---------|-------------|
| Événements | Liste des événements de sécurité (logins échoués, etc.) |
| Filtre | Par type d'événement |
| Stats sécurité | Compteurs par type |
| Vérifications | Vérifications email/phone |
| Sessions actives | Tokens actifs |

### M. Logs

| Élément | Description |
|---------|-------------|
| Journal d'activité | Tous les logs de tous les utilisateurs |
| Filtre par module | Stock, Ventes, CRM, etc. |
| Recherche | Par utilisateur |

### N. Paramètres, CGU et confidentialité

| Élément | Description |
|---------|-------------|
| CGU | Affichage en lecture seule |
| Confidentialité | Affichage en lecture seule |

### Data Explorer (`frontend/app/(admin)/data-explorer.tsx`)

| Élément | Description |
|---------|-------------|
| Exploration MongoDB | Requêtes directes sur les collections |
| Résultats | Affichage JSON |

---

## 17. Espace fournisseur mobile (`frontend/app/(supplier-tabs)/`)

### A. Dashboard fournisseur (`frontend/app/(supplier-tabs)/index.tsx`)

| KPI | Description |
|-----|-------------|
| CA total | Chiffre d'affaires fournisseur |
| Commandes reçues | Nombre total |
| Panier moyen | CA / nombre de commandes |
| Note moyenne | Moyenne des notations clients |
| Produits populaires | Top 5 produits les plus commandés |
| Clients actifs | Nombre de commerçants différents |

### B. Catalogue fournisseur (`frontend/app/(supplier-tabs)/catalog.tsx`)

| Élément | Type | Description |
|---------|------|-------------|
| Liste des produits | FlatList | Produits du catalogue fournisseur |
| Bouton ajouter | `add` (flottant) | Ouvre le formulaire de création |
| Toggle disponibilité | Switch | Active/désactive un produit |
| Prix | TextInput | Modifiable en ligne |
| Catégories | Filtre par catégorie |

### C. Commandes reçues (`frontend/app/(supplier-tabs)/orders.tsx`)

| Élément | Type | Description |
|---------|------|-------------|
| Liste des commandes | FlatList | Commandes des commerçants |
| Filtre statut | Puces | En attente, Confirmée, Expédiée, Livrée |
| Détail commande | Modal | Articles, quantités, client, montant |
| Bouton accepter | TouchableOpacity | Confirme la commande |
| Bouton refuser | TouchableOpacity | Refuse la commande |
| Bouton expédier | TouchableOpacity | Marque comme expédiée |
| Chat commande | `chatbubble-outline` | Conversation liée à la commande |

### D. Messages (`frontend/app/(supplier-tabs)/messages.tsx`)

| Élément | Type | Description |
|---------|------|-------------|
| Liste des conversations | FlatList | Conversations avec les commerçants |
| Détail conversation | Modal | Bulles de messages + champ réponse |
| Bouton répondre | TextInput + TouchableOpacity | Envoie un message |

### E. Paramètres fournisseur (`frontend/app/(supplier-tabs)/settings.tsx`)

| Élément | Type | Description |
|---------|------|-------------|
| Profil entreprise | TextInputs | Nom, description, logo |
| Zones de livraison | TextInput | Villes/régions couvertes |
| Délai moyen | TextInput | Jours de livraison |
| Montant minimum | TextInput | Commande minimum |
| Langue | Picker | 15 langues |
| Suppression de compte | Bouton danger | Ouvre `DeleteAccountModal` |

### Le guide doit couvrir

- KPI fournisseur ;
- gestion du catalogue (création, prix, disponibilité) ;
- commandes reçues (accepter, refuser, expédier) ;
- chat avec les commerçants ;
- profil et paramètres ;
- zones de livraison et conditions commerciales.

---

## Format recommandé pour la livraison des guides mobiles

Pour chaque écran, je recommande de produire :

1. **Un guide rapide intégré**
   - 4 à 7 étapes ;
   - centré sur l'action ;
   - relançable depuis l'icône d'aide.

2. **Une fiche de référence**
   - complète ;
   - pensée pour la formation et le support.

3. **Un inventaire fonctionnel**
   - boutons ;
   - filtres ;
   - modals ;
   - états d'erreur ;
   - permissions ;
   - dépendances avec les autres écrans.

## Ordre de production recommandé

### Vague 1

- Navigation générale
- Dashboard
- Produits / Stock
- POS
- Commandes
- CRM

### Vague 2

- Comptabilité
- Fournisseurs
- Alertes
- Paramètres
- Abonnement
- Activité

### Vague 3

- Utilisateurs
- Authentification
- Écran PIN
- Démo mobile
- États hors ligne et synchronisation

### Vague 4

- Modules restauration
- Administration mobile
- Espace fournisseur mobile

## Priorité immédiate

Si l'objectif est de réduire rapidement les erreurs d'usage sur mobile, la priorité doit être :

1. `Dashboard`
2. `Produits / Stock`
3. `POS`
4. `Commandes`
5. `CRM`
6. `Comptabilité`
7. `Fournisseurs`

Ce sont les écrans les plus utilisés sur le terrain, ceux où l'utilisateur agit vite, et ceux où un guide clair réduit immédiatement les mauvaises manipulations.

## Décision de cadrage

Avant de rédiger les guides eux-mêmes, la bonne méthode est :

1. valider cette architecture ;
2. inventorier écran par écran les actions, boutons, modals et états ;
3. rédiger les guides complets ;
4. harmoniser ensuite les guides rapides déjà présents avec cette structure cible.

Ce document sert de feuille de route pour améliorer l'ensemble des guides mobiles de manière cohérente.
