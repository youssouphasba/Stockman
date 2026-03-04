# Documentation des Nouvelles Fonctionnalités Stockman

Cette documentation détaille les modules de Comptabilité, Gestion d'Équipe et Marketplace pour l'IA Assistant.

## 1. Comptabilité & Analyse Financière
Le module Comptabilité permet un suivi précis de la rentabilité.
- **Indicateurs Clés (KPIs)** :
    - **Chiffre d'Affaires (Revenue)** : Ventes totales.
    - **COGS (Cost of Goods Sold)** : Coût d'achat total des marchandises vendues.
    - **Bénéfice Brut (Gross Profit)** : Chiffre d'affaires - COGS.
    - **Bénéfice Net (Net Profit)** : Bénéfice Brut - Dépenses (loyer, salaires, etc.).
- **Graphiques** :
    - **Modes de Paiement** : Un diagramme circulaire montre la répartition (Espèces, Mobile Money, Carte, Crédit). *Note: Les couleurs ont été diversifiées pour éviter toute confusion entre 'Primary' et 'Success'.*
    - **Ventes Quotidiennes** : Courbe d'évolution du CA.
- **Exports** : Possibilité de générer des rapports PDF pour la comptabilité externe.

## 2. Gestion du Personnel & Permissions
Stockman utilise un système de permissions granulaires par module (Lecture/Écriture/Aucun).
- **Rôles** :
    - **Shopkeeper (Propriétaire)** : Accès total illimité.
    - **Staff (Employé)** : Accès restreint selon les permissions définies par le propriétaire.
    - **Manager (Staff avec 'Personnel: Écriture')** : Cas particulier d'un employé qui peut lui-même créer et gérer d'autres employés subalternes. Un Manager ne peut pas modifier un Propriétaire.
- **Limites par Plan** :
    - **Starter** : 1 employé supplémentaire.
    - **Pro** : 5 employés supplémentaires.
    - **Enterprise** : Employés illimités.

## 3. Marketplace & Réapprovisionnement
L'application connecte maintenant les commerçants aux fournisseurs.
- **Catalogue Fournisseur** : Les commerçants peuvent naviguer dans les produits des fournisseurs.
- **Commandes Marketplace** : Lorsqu'un commerçant commande sur la marketplace, le fournisseur reçoit une notification.
- **Réception Automatisée** : Une fois que le commerçant confirme la réception d'une commande Marketplace, les produits sont automatiquement créés (si nouveaux) ou mis à jour (quantité) dans son inventaire local.
- **Calcul de Marge** : Le système suggère des prix de vente basés sur le coût d'achat fournisseur et un coefficient de marge configurable.

## 4. Importation & Exportation de Données
L'application permet de manipuler les données en masse pour faciliter la migration.
- **Importation de Produits (CSV/Excel)** :
    - **Procédure** : L'utilisateur télécharge un fichier. L'IA analyse les colonnes pour suggérer un mapping (ex: 'Prix Achat' -> 'purchase_price').
    - **Validation** : Les prix négatifs, les quantités incohérentes et les doublons de SKU sont bloqués.
    - **Multi-encodage** : Supporte UTF-8, Latin-1 et CP1252 pour éviter les erreurs de caractères spéciaux.
- **Exportation** :
    - **Inventaire** : Export au format PDF (étiquettes QR Code) ou Excel.
    - **Ventes & Comptabilité** : Rapports périodiques exportables pour les comptables.

## 5. CRM & Fidélité Client
- **Dettes & Crédits** : Suivi manuel des dettes clients. Possibilité de marquer un remboursement total ou partiel.
- **Système de Fidélité** : Calcul automatique des points basé sur le montant des ventes. Paliers de récompense configurables.
- **Marketing** : Relances par WhatsApp/SMS intégrées directement depuis la fiche client.

## 6. Multi-Boutiques
- **Gestion Multi-Boutiques** : Un compte peut gérer plusieurs boutiques physiques avec des stocks indépendants. La bascule se fait via le sélecteur en haut du Dashboard.

## 7. Assistant IA & RAG
L'assistant IA utilise ce document (`features.md`) et les guides utilisateur pour répondre aux questions. 
- **Outils de Données** : Il peut appeler des fonctions pour récupérer le CA du jour, le top des ventes, ou les alertes de stock bas.
- **Support Fonctionnel** : Si un utilisateur demande "Comment importer ?", l'IA doit expliquer l'utilisation du bouton 'Import' dans l'onglet Produits et le processus de mapping.
