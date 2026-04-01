# Guide - Finance et comptabilite

## 1. Role du module

Le module Comptabilite donne une vue financiere consolidee : chiffre d'affaires, marges, charges, resultat net, pertes, factures et diagnostic IA du P&L.

**Profils concernes** : `shopkeeper`, `staff`, `admin`, avec permission `accounting`.

## 2. Acces

Barre laterale -> **Finance et comptabilite**

## 3. Lecture de l'ecran

### En-tete
- **Titre** : Finance et comptabilite
- **Selecteur de periode** : 7j, 30j, 90j, 1 an
- **Calendrier** : active une plage personnalisee
- **Rapport mensuel IA** : genere un rapport mensuel complet
- **Rapports PDF** : ouvre les exports comptables
- **Historique factures** : bascule sur l'onglet factures
- **Nouvelle depense** : ouvre le formulaire d'ajout

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

### Onglets lateraux

| Onglet | Contenu |
|--------|---------|
| P&L | Vue de rentabilite et decomposition |
| Paiements | Repartition par mode de paiement |
| Pertes | Detail des pertes |
| Produits | Classement des produits |
| Ventes | Historique des ventes avec actions associees |
| Factures | Historique des factures client |

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Selecteur de periode | Clic | Recharge les donnees |
| Calendrier | Clic | Active la plage personnalisee |
| Rapport mensuel IA | Clic | Genere un rapport IA complet |
| Rapports PDF | Clic | Ouvre le modal des exports |
| Nouvelle depense | Clic | Ouvre le formulaire de depense |
| Lancer le diagnostic IA | Clic | Lance une lecture courte du P&L |
| Carte KPI | Clic | Ouvre le detail du KPI |
| Modifier depense | Clic | Ouvre le formulaire pre-rempli |
| Supprimer depense | Clic | Supprime avec confirmation |
| Creer facture | Onglet Ventes | Genere une facture client depuis une vente |
| Annuler vente | Onglet Ventes | Annule la vente et remet le stock |
| Voir facture | Onglet Factures | Ouvre la facture |

## 5. Mode hors ligne et synchronisation

Le web app gere maintenant un mode hors ligne elargi pour ce module.

- Les dernieres donnees chargees restent consultables depuis le cache local.
- Une nouvelle depense creee hors ligne reste visible dans la liste avec un marquage **En attente de synchronisation**.
- Une facture creee depuis une vente, ou une facture libre, peut etre preparee hors ligne puis synchronisee des que le reseau revient.
- Une annulation de vente lancee hors ligne reste signalee comme **En attente** dans l'historique.
- Des bandeaux d'information resumant le nombre d'ecritures en attente apparaissent dans les onglets concernes.

### Ce qui reste a savoir
- L'affichage hors ligne est partiel : il s'appuie sur les donnees deja chargees et sur les actions en file d'attente.
- Les flux dependants d'un service externe ou d'une verification immediate restent tributaires d'une connexion active.

## 6. Filtres

- **Periode predefinie** : 7j, 30j, 90j, 1 an
- **Plage personnalisee** : date debut, date fin
- **Filtre depenses** : toutes, loyer, salaires, transport, eau/energie, achats, autre

## 7. Etats de l'interface

| Etat | Description |
|------|-------------|
| Chargement | Spinner centre |
| Aucune donnee | Message adapte dans les graphiques |
| Generation rapport IA | Spinner et message de progression |
| Diagnostic IA non lance | Bloc d'explication avec bouton de lancement |
| Formulaire depense | Modal avec categorie, montant et description |
| Ecriture en attente | Badge ou bandeau de synchronisation sur la liste concernee |

## 8. Cas d'usage typiques

- **Analyse rapide** : choisir une periode puis lancer le diagnostic IA.
- **Suivi mensuel** : choisir 30j, cliquer sur **Rapport mensuel IA**, puis telecharger si besoin.
- **Enregistrer une depense** : cliquer sur **Nouvelle depense**, choisir la categorie, saisir le montant et la description.
- **Creer une facture client** : ouvrir l'onglet ventes puis creer ou consulter une facture.
- **Continuer hors ligne** : enregistrer une depense ou preparer une facture, puis laisser la synchronisation automatique envoyer l'action plus tard.

## 9. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Comptabilite | POS | Les ventes alimentent le chiffre d'affaires |
| Comptabilite | Stock | Les pertes de stock sont comptabilisees |
| Comptabilite | Fournisseurs | Les achats influencent les couts |

## 10. Questions frequentes

| Question | Reponse |
|----------|---------|
| Comment la marge brute est-elle calculee ? | Chiffre d'affaires moins cout des ventes. |
| Le diagnostic IA se lance-t-il tout seul ? | Non, il se lance uniquement sur action utilisateur. |
| Quelle difference entre diagnostic IA et rapport mensuel IA ? | Le diagnostic est court et actionnable. Le rapport mensuel est plus long et plus structure. |
| Puis-je exporter les donnees ? | Oui, via les exports et rapports disponibles dans l'ecran. |
| Que signifie "En attente" ? | L'action a ete gardee localement et sera synchronisee automatiquement quand le reseau reviendra. |

## 11. Guide rapide integre

1. **Bienvenue dans Finance et comptabilite** : suivez la rentabilite de votre activite.
2. **Indicateurs cles** : consultez chiffre d'affaires, marges, charges et resultat net.
3. **Diagnostic IA** : lancez manuellement une lecture rapide du P&L de la periode.
4. **Depenses et factures** : creez vos ecritures et vos documents depuis les onglets dedies.
5. **Mode hors ligne** : reperez les bandeaux et badges **En attente** pour savoir ce qui reste a synchroniser.
