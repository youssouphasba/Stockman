# Guide — Finance & Comptabilité

## 1. Rôle du module

Le module Comptabilité fournit une vue financière consolidée : chiffre d'affaires, marges, charges, résultat net, TVA, pertes de stock, analyse IA Profit & Loss et gestion des dépenses.

**Profils concernés** : shopkeeper, staff, admin (permission `accounting` requise).

## 2. Accès

Barre latérale → **Finance & Comptabilité**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Finance & Comptabilité ».
- **Sélecteur de période** : 7j, 30j, 90j, 1 an.
- **Calendrier** : active/désactive la plage de dates personnalisée.
- **Rapport IA** : génère un rapport mensuel par l'IA.
- **Rapports PDF** : ouvre le modal des rapports comptables pré-formatés.
- **Historique factures** : bascule sur l'onglet factures.
- **Nouvelle dépense** : ouvre le formulaire d'ajout de dépense.

### Analyse IA
Bandeau violet affiché automatiquement avec une synthèse P&L générée par l'IA.

### Section Finance avancée
Bloc avec indicateurs de rentabilité : marge brute %, marge nette %, poids des charges %, poids des pertes %. Recommandations IA et postes de charges dominants.

### Cartes KPI
| KPI | Description |
|-----|-------------|
| Chiffre d'affaires | Total des ventes sur la période |
| Marge brute | CA - coût des ventes |
| Charges | Total des dépenses enregistrées |
| Résultat net | Marge brute - charges |
| Panier moyen | Ticket moyen sur la période |
| Pertes stock | Valeur des pertes de stock |
| TVA collectée | Si la TVA est activée |

Chaque carte KPI est cliquable pour afficher un détail (modal avec tableau exportable).

### Valeur du stock
Deux cartes : valeur au coût d'achat et valeur à la vente. Cliquables pour le détail.

### Graphique Évolution Financière
Aire chart avec deux courbes : Revenus (bleu) et Profit (vert) sur la période.

### Top Produits — Performance
Classement des 8 meilleurs produits par chiffre d'affaires, avec marge % et barre visuelle.

### Historique des Dépenses
Liste filtrée par catégorie, avec édition et suppression par dépense.

### Panneau droit — Onglets
| Onglet | Contenu |
|--------|---------|
| P&L | Graphique de rentabilité en anneau (marge brute) + décomposition |
| Paiements | Répartition par méthode de paiement (graphique barres) |
| Pertes | Détail des pertes de stock |
| Charges | Répartition des charges par catégorie |
| Ventes | Historique des ventes récentes avec statut, annulation possible, création de facture |
| Factures | Historique des factures client avec visualisation |

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Sélecteur de période | Clic | Recharge les données pour la période |
| Calendrier (📅) | Clic | Active la sélection de plage personnalisée |
| Rapport IA | Clic | Génère un rapport mensuel IA (téléchargeable en .md) |
| Rapports PDF | Clic | Ouvre AccountingReportModal |
| Nouvelle dépense (+) | Clic | Ouvre le formulaire de création/édition de dépense |
| Carte KPI | Clic | Ouvre le détail du KPI (modal avec tableau et export) |
| Modifier dépense (✏️) | Survol d'une ligne | Ouvre le formulaire pré-rempli |
| Supprimer dépense (🗑️) | Survol d'une ligne | Suppression avec confirmation |
| Filtre dépenses (⊞) | Panneau de droite | Filtre par catégorie de dépense |
| Créer facture | Onglet Ventes | Génère une facture client depuis une vente |
| Annuler vente | Onglet Ventes | Annule la vente et remet le stock |
| Voir facture | Onglet Factures | Ouvre InvoiceModal avec PDF |

## 5. Filtres et recherche

- **Période prédéfinie** : 7j, 30j, 90j, 1 an.
- **Plage personnalisée** : date début - date fin + bouton OK.
- **Filtre catégorie dépenses** : Toutes, Loyer, Salaires, Transport, Eau/Énergie, Achats, Autre.

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Aucune donnée | Texte « Aucune donnée sur cette période » dans les graphiques |
| Génération rapport | Spinner + texte « Génération en cours… » |
| Formulaire dépense | Modal avec champs catégorie, montant, description |

## 7. Cas d'usage typiques

- **Analyse quotidienne** : sélectionner « 7j », lire les KPI et l'analyse IA.
- **Suivi mensuel** : sélectionner « 30j », cliquer « Rapport IA » pour un résumé complet, puis « Rapports PDF » pour l'export.
- **Enregistrer une dépense** : cliquer « Nouvelle dépense » → choisir catégorie → saisir montant et description.
- **Créer une facture client** : onglet Ventes → cliquer sur l'icône facture d'une vente.

## 8. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Comptabilité | POS | Les ventes alimentent le chiffre d'affaires |
| Comptabilité | Stock | Les pertes de stock sont comptabilisées |
| Comptabilité | Fournisseurs | Les achats impactent le coût des ventes |

## 9. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment la marge brute est-elle calculée ? | CA - coût des ventes (achats × quantité vendue). |
| Comment annuler une vente dans la comptabilité ? | Onglet Ventes → bouton annuler. Le stock est remis en place. |
| Puis-je exporter les données ? | Oui, les KPI détaillés et les rapports sont exportables en Excel et PDF. |
| La TVA n'apparaît pas | Elle n'apparaît que si la TVA est activée dans les paramètres de la boutique. |

## 10. Guide rapide intégré

1. **Bienvenue dans Finance & Comptabilité** — Suivez la rentabilité de votre activité.
2. **Indicateurs clés** — Consultez votre CA, marges, charges et résultat net en un coup d'œil.
3. **Analyse IA** — L'IA analyse automatiquement vos données P&L et vous donne des recommandations.
4. **Gérez vos dépenses** — Enregistrez loyer, salaires et autres charges pour un suivi précis du résultat net.
5. **Rapports et export** — Générez des rapports IA mensuels ou téléchargez des rapports PDF formatés.
6. **Détail des KPI** — Cliquez sur n'importe quel indicateur pour afficher son détail en tableau.
