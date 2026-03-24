# Plan des guides utilisateurs du web-app

## Constat

Le web-app dispose déjà d'une base de guides contextuels, mais elle reste très partielle :

- `Dashboard` a déjà un guide.
- `POS` a déjà un guide.
- Les autres modules n'ont pas encore de guide complet, homogène et maintenable.

L'objectif n'est donc pas seulement d'ajouter quelques bulles d'aide, mais de définir une vraie architecture de guides couvrant :

- chaque module ;
- chaque bouton principal et secondaire ;
- chaque filtre, tableau, carte KPI, modal et panneau ;
- chaque action métier ;
- les cas d'erreur, les permissions et les effets attendus.

## Objectif produit

Chaque module du web-app doit disposer de deux niveaux de guide complémentaires :

1. **Guide rapide intégré à l'écran**
   Un parcours court, orienté prise en main, pour expliquer les zones clés, les actions prioritaires et le résultat attendu.

2. **Guide complet de référence**
   Une documentation structurée qui décrit, écran par écran, chaque bouton, chaque action, chaque zone UI et leur utilité métier.

## Structure standard à appliquer à chaque guide

Chaque guide module devra suivre la même structure pour rester cohérent.

### 1. Rôle du module

- À quoi sert le module.
- Pour quels profils il est disponible.
- Dans quel cas il doit être utilisé.

### 2. Accès au module

- Où cliquer dans la barre latérale.
- Prérequis éventuels.
- Restrictions liées au plan ou aux permissions.

### 3. Lecture de l'écran

- En-tête.
- Cartes KPI.
- Barre d'actions.
- Filtres.
- Tableau, liste, cartes ou panneau latéral.
- Modals et panneaux secondaires.

### 4. Boutons et actions

Pour chaque bouton visible :

- libellé exact ;
- emplacement ;
- ce que le bouton fait ;
- ce qui change après le clic ;
- éventuelles validations ou confirmations ;
- cas où le bouton peut être désactivé.

### 5. Filtres et recherche

- sens de chaque filtre ;
- impact sur les résultats ;
- différences entre filtre local et filtre global ;
- cas de cumul de filtres.

### 6. Actions sur une ligne ou une fiche

- ouvrir ;
- modifier ;
- supprimer ;
- exporter ;
- archiver ;
- régulariser ;
- confirmer ;
- annuler.

### 7. États de l'interface

- chargement ;
- état vide ;
- succès ;
- erreur ;
- absence de permission ;
- données partielles.

### 8. Cas d'usage typiques

- scénario simple ;
- scénario avancé ;
- erreur fréquente ;
- bonne pratique.

### 9. Liens avec les autres modules

- depuis quel module on arrive ;
- vers quel module on peut poursuivre ;
- conséquences sur d'autres modules.

### 10. Questions fréquentes

- incompréhensions récurrentes ;
- blocages fréquents ;
- explication du vocabulaire métier.

### 11. Guide rapide intégré

Chaque module doit aussi avoir une version courte intégrée à l'écran :

- 5 à 8 étapes maximum ;
- centrée sur la prise en main ;
- sans entrer dans tous les cas métier ;
- avec une relance possible via un bouton d'aide.

## Modules à documenter

## 1. Navigation générale et éléments transverses

### A. Barre latérale

Le guide doit couvrir :

- la logique des menus ;
- les groupes repliables ;
- le changement de boutique ;
- les modules visibles selon le secteur ;
- la différence entre les espaces commerce, restaurant, fournisseur et administration ;
- les raccourcis support, chat, notifications et déconnexion.

### B. Notifications

Le guide doit couvrir :

- le centre de notifications ;
- les badges ;
- l'ouverture d'une notification ;
- les actions disponibles depuis une notification ;
- la différence entre alerte informative et action urgente.

### C. Support et messagerie

Le guide doit couvrir :

- le panneau d'assistance ;
- l'ouverture d'une conversation ;
- le suivi d'un ticket ou échange ;
- l'usage du chat IA et du chat humain si les deux sont visibles ;
- les limites de chaque canal.

### D. États globaux

Le guide doit couvrir :

- bannière hors ligne ;
- session expirée ;
- compte en lecture seule ;
- vérification d'e-mail ;
- accès limité selon l'abonnement.

## 2. Dashboard

Le guide doit couvrir :

- les cartes KPI ;
- les raccourcis vers les autres modules ;
- les résumés d'activité ;
- les alertes visibles ;
- les actions rapides ;
- la signification de chaque indicateur.

Le guide rapide doit montrer :

- comment lire la vue d'ensemble ;
- comment utiliser les raccourcis ;
- comment interpréter les alertes prioritaires.

## 3. Multi-boutiques

Le guide doit couvrir :

- la vue consolidée ;
- les comparaisons entre boutiques ;
- le changement de boutique active ;
- les indicateurs par boutique ;
- les actions d'accès aux fiches détaillées ;
- les limites entre vue consolidée et vue d'une boutique active.

## 4. POS

Le guide doit couvrir :

- la recherche produit ;
- la grille produits ;
- le panier ;
- les remises ;
- le calcul de monnaie ;
- l'ajout de client ;
- la validation d'une vente ;
- l'annulation d'une vente ;
- les reçus ;
- les cas de stock insuffisant ;
- les erreurs de session ou de paiement.

## 5. Stock / Inventaire

Le guide doit couvrir :

- la liste produits ;
- les colonnes principales ;
- la recherche ;
- les filtres ;
- la création produit ;
- la modification produit ;
- la suppression produit ;
- l'activation et la désactivation ;
- les transferts, mouvements ou ajustements si disponibles ;
- les modals liés à l'historique ou aux variantes ;
- la différence entre stock physique, stock valorisé et seuil d'alerte.

## 6. Commandes

Le guide doit couvrir :

- la création de commande ;
- les étapes de validation ;
- les statuts ;
- les lignes de commande ;
- les retours éventuels ;
- les réceptions ;
- les actions par ligne et par commande ;
- les effets sur le stock ;
- les erreurs fréquentes.

## 7. Comptabilité

Le guide doit couvrir :

- les indicateurs financiers ;
- les ventes, dépenses, marges et encaissements ;
- les filtres de période ;
- les actions d'export ;
- les reçus, factures et justificatifs ;
- les actions de régularisation ;
- les limites entre comptabilité synthétique et détail opérationnel.

## 8. Bibliothèque de rapports

Le guide doit couvrir :

- les catégories de rapports ;
- les filtres globaux ;
- l'export PDF/Excel ;
- le choix de la période ;
- les rapports exécutifs ;
- les rapports stock ;
- les rapports CRM ;
- les rapports achats ;
- les rapports multi-boutiques.

## 9. CRM

Le guide doit couvrir :

- la liste des clients ;
- la création et l'édition de client ;
- la fiche client ;
- l'historique d'achats ;
- l'historique de dette ;
- l'ajout et l'annulation de paiement ;
- les segments ;
- les anniversaires ;
- les campagnes ;
- les promotions ;
- les permissions d'écriture ;
- les conséquences sur le POS et la fidélité.

## 10. Personnel

Le guide doit couvrir :

- la liste du personnel ;
- les rôles ;
- les permissions ;
- l'ajout d'un membre ;
- la modification d'un accès ;
- les restrictions par module ;
- les erreurs fréquentes liées aux droits.

## 11. Fournisseurs

Le guide doit couvrir :

- la liste des fournisseurs ;
- la différence entre fournisseur interne et fournisseur marketplace ;
- la fiche fournisseur ;
- l'historique de performance ;
- les produits liés ;
- les factures fournisseur ;
- le journal d'activité ;
- la création de facture ;
- le rattachement de produits ;
- les actions de commande et de réception ;
- la lecture de l'historique de prix.

## 12. Portail fournisseur

Le guide doit couvrir :

- les commandes reçues ;
- le catalogue fournisseur ;
- la mise à jour des informations ;
- les actions de réponse ;
- la visibilité des produits ;
- les statuts ;
- la logique métier côté fournisseur.

## 13. Alertes

Le guide doit couvrir :

- les alertes de stock ;
- les alertes d'expiration ;
- les alertes intelligentes ;
- les actions de résolution ;
- la différence entre ignorer, corriger et traiter ;
- les liens vers les modules concernés.

## 14. Historique de stock

Le guide doit couvrir :

- les mouvements d'entrée ;
- les mouvements de sortie ;
- les transferts ;
- les ajustements ;
- les filtres par produit, date et boutique ;
- la lecture des références ;
- l'usage pour l'audit.

## 15. Analyse ABC

Le guide doit couvrir :

- la logique A, B, C ;
- l'intérêt métier ;
- les filtres ;
- la lecture des indicateurs ;
- les actions à prendre selon la classe d'un produit.

## 16. Inventaire tournant

Le guide doit couvrir :

- la planification de comptage ;
- les tâches d'inventaire ;
- la validation ;
- les écarts ;
- les corrections de stock ;
- les rôles concernés ;
- les bonnes pratiques de comptage.

## 17. Alertes d'expiration

Le guide doit couvrir :

- les produits proches de la date limite ;
- les niveaux de criticité ;
- les actions recommandées ;
- la suppression des faux positifs ;
- le lien avec l'inventaire et le stock.

## 18. Abonnement

Le guide doit couvrir :

- le plan actif ;
- les limites du plan ;
- l'état de l'abonnement ;
- les paiements ;
- les actions de mise à niveau ;
- les restrictions d'accès au web ;
- les cas de grâce, lecture seule ou régularisation.

## 19. Paramètres

Le guide doit couvrir :

- les informations du compte ;
- les paramètres métier ;
- les modules activés ;
- les préférences visibles ;
- les impacts d'une modification ;
- les éléments modifiables et non modifiables.

## 20. Administration

Le guide doit couvrir séparément chaque sous-section :

### A. Vue d'ensemble

- indicateurs globaux ;
- alertes ;
- lecture du pilotage général.

### B. Abonnements

- comptes ;
- événements ;
- régularisations ;
- période de grâce ;
- lecture seule ;
- filtres et recherche.

### C. Démos

- sessions actives ;
- conversion ;
- type de démo ;
- durée ;
- lecture des statuts.

### D. Utilisateurs

- recherche ;
- activation et désactivation ;
- suppression ;
- lecture des statuts et du plan.

### E. Boutiques

- liste des boutiques ;
- lecture des informations business ;
- accès vers les autres modules.

### F. Produits

- régulation des produits en vente ;
- filtre par boutique ;
- filtre par type d'activité ;
- activation, désactivation et suppression ;
- surveillance de la cohérence catalogue/vente.

### G. Catalogue

- enrichissement du catalogue global ;
- segmentation par type de business ;
- ajout ;
- édition ;
- fusion ou suppression ;
- usage du catalogue lors de l'import initial d'un nouveau business.

### H. Litiges

- lecture ;
- suivi ;
- traitement ;
- changement de statut.

### I. Sécurité

- événements de vérification ;
- sessions actives ;
- incidents ;
- historique de sécurité.

### J. Support

- tickets ;
- réponses ;
- suivi ;
- priorisation.

### K. Diffusion

- envoi de messages ;
- ciblage ;
- historique ;
- différence entre message ponctuel et diffusion globale.

## 21. Modules restauration

Ces guides ne doivent être affichés et maintenus que pour les secteurs concernés.

### A. Tables

- plan de salle ;
- statut des tables ;
- ouverture de commande ;
- transfert ou fusion ;
- clôture.

### B. Réservations

- création ;
- modification ;
- arrivée client ;
- annulation ;
- conversion en table active.

### C. Cuisine

- file de préparation ;
- statuts ;
- priorisation ;
- passage en prêt ou servi ;
- articulation avec le POS et les tables.

## 22. Module production

Ce guide ne doit être maintenu que pour les secteurs qui l'utilisent réellement.

Le guide doit couvrir :

- recettes ;
- composants ;
- ordres de production ;
- consommation de stock ;
- rendement ;
- validations.

## Format recommandé pour la livraison des guides

Pour chaque module, je recommande de produire :

1. **Un guide intégré à l'écran**
   - 5 à 8 étapes.

2. **Une fiche d'aide complète**
   - une page dédiée par module.

3. **Une nomenclature interne**
   - inventaire des boutons ;
   - inventaire des filtres ;
   - inventaire des modals ;
   - inventaire des messages d'erreur ;
   - inventaire des permissions.

## Ordre de production recommandé

Pour aller vite sans perdre en qualité, je recommande cet ordre :

### Vague 1

- Navigation générale
- Dashboard
- POS
- Stock / Inventaire
- Commandes
- Comptabilité

### Vague 2

- CRM
- Fournisseurs
- Abonnement
- Paramètres
- Alertes
- Historique de stock

### Vague 3

- Rapports
- Multi-boutiques
- Personnel
- Administration
- Portail fournisseur

### Vague 4

- Modules restauration
- Module production
- Panneaux transverses : notifications, support, chat

## Priorité immédiate

Si l'objectif est d'avoir un impact rapide sur l'expérience utilisateur du web, la priorité doit être :

1. `Dashboard`
2. `POS`
3. `Stock / Inventaire`
4. `CRM`
5. `Commandes`
6. `Comptabilité`
7. `Fournisseurs`

Ce sont les modules les plus utilisés, les plus sensibles métier, et ceux où un guide réduit immédiatement les erreurs de manipulation.

## Décision de cadrage

Avant rédaction des guides eux-mêmes, la bonne méthode est :

1. valider cette architecture de guides ;
2. produire un inventaire écran par écran des boutons, actions et états UI ;
3. rédiger les guides complets ;
4. brancher ensuite les guides courts directement dans le web-app.

Ce document sert de feuille de route de référence pour cette mise en place.
