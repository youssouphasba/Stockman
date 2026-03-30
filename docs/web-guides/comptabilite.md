# Guide - Finance et comptabilite

## 1. Role du module

Le module Comptabilite fournit une vue financiere consolidee : chiffre d'affaires, marges, charges, resultat net, TVA, pertes de stock, diagnostic IA du P&L et gestion des depenses.

**Profils concernes** : `shopkeeper`, `staff`, `admin`, avec permission `accounting`.

## 2. Acces

Barre laterale -> **Finance et comptabilite**

## 3. Lecture de l'ecran

### En-tete
- **Titre** : Finance et comptabilite
- **Selecteur de periode** : 7j, 30j, 90j, 1 an
- **Calendrier** : active une plage de dates personnalisee
- **Rapport mensuel IA** : genere, sur clic, un rapport mensuel complet, redige et exportable
- **Rapports PDF** : ouvre le modal des exports comptables preformats
- **Historique factures** : bascule sur l'onglet factures
- **Nouvelle depense** : ouvre le formulaire d'ajout de depense

### Diagnostic IA

Le bloc violet n'est plus automatique.

- **Declenchement** : uniquement sur clic
- **But** : fournir une lecture courte et actionnable du P&L de la periode
- **Contenu** : diagnostic, point fort, point d'attention et actions prioritaires
- **Usage** : relire rapidement la rentabilite sans ouvrir un rapport complet

### Rapport mensuel IA

Le rapport mensuel IA est distinct du diagnostic IA.

- **Declenchement** : uniquement sur clic
- **But** : produire un rapport plus long et plus structure
- **Contenu** : synthese executive, performance commerciale, sante financiere, stocks, relation client, plan d'action
- **Usage** : analyse plus complete, partage interne, archivage et telechargement

### Section Finance avancee

Bloc avec indicateurs de rentabilite : marge brute, marge nette, poids des charges, poids des pertes et recommandations de pilotage.

### Cartes KPI

| KPI | Description |
|-----|-------------|
| Chiffre d'affaires | Total des ventes sur la periode |
| Marge brute | Chiffre d'affaires moins cout des ventes |
| Charges | Total des depenses enregistrees |
| Resultat net | Marge brute moins charges |
| Panier moyen | Ticket moyen sur la periode |
| Pertes stock | Valeur des pertes de stock |
| TVA collectee | Visible si la TVA est activee |

Chaque carte KPI est cliquable et ouvre un detail exploitable.

### Valeur du stock

Deux cartes : valeur au cout d'achat et valeur a la vente. Elles sont aussi cliquables pour afficher le detail.

### Graphique Evolution financiere

Vue d'evolution sur la periode avec comparaison des revenus et du resultat.

### Top produits - Performance

Classement des meilleurs produits par chiffre d'affaires, marge et volume vendu.

### Historique des depenses

Liste filtree par categorie, avec edition et suppression.

### Panneau droit - Onglets

| Onglet | Contenu |
|--------|---------|
| P&L | Vue de rentabilite et decomposition |
| Paiements | Repartition par mode de paiement |
| Pertes | Detail des pertes et de leur poids relatif |
| Produits | Classement des produits sur la periode |
| Ventes | Historique des ventes avec actions associees |
| Factures | Historique des factures client |

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Selecteur de periode | Clic | Recharge les donnees pour la periode |
| Calendrier | Clic | Active la plage personnalisee |
| Rapport mensuel IA | Clic | Genere un rapport mensuel IA complet |
| Rapports PDF | Clic | Ouvre le modal des rapports comptables |
| Nouvelle depense | Clic | Ouvre le formulaire de creation ou d'edition de depense |
| Lancer le diagnostic IA | Clic | Lance une lecture courte du P&L de la periode |
| Carte KPI | Clic | Ouvre le detail du KPI |
| Modifier depense | Clic | Ouvre le formulaire pre-rempli |
| Supprimer depense | Clic | Supprime avec confirmation |
| Creer facture | Onglet Ventes | Genere une facture client depuis une vente |
| Annuler vente | Onglet Ventes | Annule la vente et remet le stock |
| Voir facture | Onglet Factures | Ouvre la facture |

## 5. Filtres

- **Periode predefinie** : 7j, 30j, 90j, 1 an
- **Plage personnalisee** : date debut, date fin, puis validation
- **Filtre depenses** : toutes, loyer, salaires, transport, eau/energie, achats, autre

## 6. Etats de l'interface

| Etat | Description |
|------|-------------|
| Chargement | Spinner centre |
| Aucune donnee | Message adapte dans les graphiques |
| Generation rapport IA | Spinner et message de progression |
| Diagnostic IA non lance | Bloc violet avec bouton de lancement |
| Formulaire depense | Modal avec champs categorie, montant et description |

## 7. Cas d'usage typiques

- **Analyse rapide** : choisir une periode puis lancer le diagnostic IA pour un avis court et immediat.
- **Suivi mensuel** : choisir 30j, cliquer sur **Rapport mensuel IA**, puis telecharger si besoin.
- **Enregistrer une depense** : cliquer sur **Nouvelle depense**, choisir la categorie, saisir le montant et la description.
- **Creer une facture client** : ouvrir l'onglet ventes puis creer ou consulter une facture.

## 8. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Comptabilite | POS | Les ventes alimentent le chiffre d'affaires |
| Comptabilite | Stock | Les pertes de stock sont comptabilisees |
| Comptabilite | Fournisseurs | Les achats influencent les couts |

## 9. Questions frequentes

| Question | Reponse |
|----------|---------|
| Comment la marge brute est-elle calculee ? | Chiffre d'affaires moins cout des ventes. |
| Le diagnostic IA se lance-t-il tout seul ? | Non, il ne se lance que sur clic utilisateur. |
| Quelle difference entre diagnostic IA et rapport mensuel IA ? | Le diagnostic est court et actionnable. Le rapport mensuel est plus long, structure et orienté synthese. |
| Puis-je exporter les donnees ? | Oui, via les exports et les rapports disponibles dans l'ecran. |

## 10. Guide rapide integre

1. **Bienvenue dans Finance et comptabilite** : suivez la rentabilite de votre activite.
2. **Indicateurs cles** : consultez chiffre d'affaires, marges, charges et resultat net.
3. **Diagnostic IA** : lancez manuellement une lecture rapide du P&L de la periode.
4. **Rapport mensuel IA** : generez un rapport plus complet quand vous avez besoin d'une synthese detaillee.
5. **Depenses** : enregistrez vos charges pour garder un resultat net fiable.
6. **Detail des KPI** : cliquez sur un indicateur pour ouvrir ses details.
