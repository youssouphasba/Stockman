# ⚖️ Stockman : Analyse de Parité Front-end (Mobile vs Web)

Ce rapport compare les fonctionnalités présentes dans l'application mobile (`frontend/app`) et l'application web (`web-app/src/components`) afin d'identifier les écarts et de planifier l'alignement des deux plateformes.

---

## 🏗️ 1. Modules Communs (Parité Validée)

Les modules suivants sont présents et fonctionnels sur les deux plateformes (avec des interfaces adaptées à chaque support) :

*   **📊 Tableau de bord (Dashboard)** : KPIs globaux, graphiques de ventes. (`index.tsx` / `Dashboard.tsx`)
*   **📦 Stock/Inventaire** : Liste des produits, alertes de seuil critique. (`products.tsx` / `Inventory.tsx`)
*   **🛒 Point de Vente (POS)** : Encaissement, gestion du panier. (`pos.tsx` / `POS.tsx`)
*   **🤝 CRM (Clients)** : Liste des clients, historique d'achats. (`crm.tsx` / `CRM.tsx`)
*   **🏭 Fournisseurs (Suppliers)** : Gestion des fournisseurs locaux. (`suppliers.tsx` / `Suppliers.tsx`)
*   **📈 Comptabilité (Accounting)** : Chiffre d'affaires, dépenses de base. (`accounting.tsx` / `Accounting.tsx`)
*   **⚙️ Paramètres (Settings)** : Configuration de la boutique, profil utilisateur. (`settings.tsx` / `Settings.tsx`)
*   **🚨 Alertes (Alerts)** : Notifications système et IA. (`alerts.tsx` / `Alerts.tsx`)
*   **👥 Utilisateurs/Staff** : Gestion des employés et sous-comptes. (`users.tsx` / `Staff.tsx`)
*   **🧾 Abonnements** : Gestion du plan Premium (CinetPay). (`subscription.tsx` / `Subscription.tsx`)

---

## 🌐 2. Fonctionnalités exclusives au WEB (Manquantes sur Mobile)

Le Web App, conçu pour un usage "Back-Office / Ordinateur", possède des fonctionnalités d'analyse et de gestion de masse qui ne sont pas encore ou difficilement transposables sur l'application mobile.

1.  **📊 Analyse ABC (`AbcAnalysis.tsx`)** : Outil stratégique pour classer les produits par rotation. *Non présent sur mobile.*
2.  **👑 Tableau de bord Administrateur (`AdminDashboard.tsx`)** : Vue globale (Superadmin) des statistiques de la plateforme. *Le mobile a un routing admin basique mais moins étoffé.*
3.  **📂 Import d'Inventaire en Masse (`BulkImportModal.tsx`)** : Import par fichier CSV/Excel. *(Logiquement absent sur mobile car peu pratique, mais utile de le noter).*
4.  **💸 Gestion Avancée des Campagnes SMS/Email (`CampaignModal.tsx`)** : Outil d'envoi ciblé dans le CRM. *Non présent sur mobile.*
5.  **📉 Historique Détaillé (`StockHistory.tsx`, `ProductHistoryModal.tsx`)** : Vues tabulaires denses de l'historique des mouvements. *Simplifiées sur mobile.*
6.  **🛒 Portail Fournisseur Dédié (`SupplierPortal.tsx`)** : Interface B2B complète pour les grossistes (Commandes, Catalogue). *Le mobile gère les commandes fournisseurs (`orders.tsx`) mais de façon plus restreinte.*
7.  **⏰ Alertes d'Expiration dédiées (`ExpiryAlerts.tsx`)** : Module spécifique pour les dates de péremption (très utile pour l'alimentaire/pharmacie). *Absentes ou fondues dans les alertes générales sur mobile.*
8.  **🧾 Modèles de Reçus Avancés (`InvoiceModal.tsx`, `DigitalReceiptModal.tsx`)** : Génération de PDF complexes. *Le mobile utilise un partage simplifié.*
9.  **🎁 Paramètres de Fidélité Avancés (`LoyaltySettingsModal.tsx`)** : Configuration fine des points. *Simplifié sur mobile.*

---

## 📱 3. Fonctionnalités exclusives au MOBILE (Manquantes sur Web)

Le Mobile App tire parti des capacités natives du téléphone (hardware et UX mobile) qui ne sont pas toujours exploitées sur le web.

1.  **📷 Scanner de Code-barres / QR Code Natif** : Intégration profonde avec la caméra physique pour la recherche rapide (POS, Inventaire). *(Le web a un `BarcodeScanner.tsx`, mais il dépend de la webcam de l'ordinateur, souvent moins pratique).*
2.  **🔔 Notifications Push Natives (Expo Push Notifications)** : Les alertes système (ruptures, IA) arrivent directement sur l'écran verrouillé du téléphone. *(Le web utilise un système de badges in-app).*
3.  **🔗 Partage natif (WhatsApp, SMS)** : Partage instantané des reçus (`onShareReceipt`) et des bons de commande via l'API share du téléphone. *(Le web utilise des Web Share API ou de l'impression PDF).*
4.  **📡 Base de données locale (WatermelonDB / Async Storage)** : Capacité de fonctionnement "Offline-First" beaucoup plus robuste pour les zones à faible connectivité. *(Le web dépend beaucoup plus de la connexion en temps réel).*
5.  **📞 Vérification de numéro de téléphone (`verify-phone.tsx`)** : Le flux d'authentification mobile intègre OTP/SMS de manière plus fluide.
6.  **🗺️ Routage par Onglets Intuitif** : L'UX avec `frontend/app/(tabs)` est optimisée pour la navigation à un doigt.

---

## 🚦 4. Recommandations et Priorités de Développement

Pour atteindre une parité parfaite et cohérente entre les deux plateformes, voici les prochaines étapes recommandées :

### 🎯 Priorité Haute (Impact métier rapide)
1.  **[Mobile] Intégrer les Alertes de Péremption (`ExpiryAlerts`)** : Crucial pour les petits commerces alimentaires/pharmacies qui n'utilisent que le téléphone.
2.  **[Mobile] Analyse ABC simplifiée** : Permettre au gérant de voir ses "Top Produits (Catégorie A)" d'un coup d'œil sur l'app.
3.  **[Web] Améliorer l'expérience de Scan** : Supporter nativement les douchettes USB physiques branchées sur l'ordinateur de caisse (écouteurs d'événements clavier `keydown`) sans nécessiter la webcam.

### 🟡 Priorité Moyenne (Confort et scaling)
4.  **[Mobile] Création de Campagnes Marketing (SMS)** : Permettre l'envoi de SMS promotionnels simples depuis le téléphone.
5.  **[Web] PWA et Offline-First complet** : Renforcer l'utilisation de Service Workers côté Web pour égaler la résilience de l'application mobile en cas de coupure internet.

### 🟢 Priorité Basse (Spécifique aux "Power Users")
6.  **[Mobile] Import en Masse (CSV)** : Optionnel, les téléphones ne sont pas conçus pour manipuler de gros fichiers Excel. Mettre un message guidant l'utilisateur vers la version Web.
