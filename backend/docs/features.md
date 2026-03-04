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

## 4. Assistant IA & RAG
L'assistant IA utilise ce document (`features.md`) et les guides utilisateur pour répondre aux questions. Il a accès à des outils internes pour extraire des statistiques en temps réel sur les ventes et les stocks de l'utilisateur.
