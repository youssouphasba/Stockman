# Web Enterprise Roadmap

Date de preparation : 2026-03-11
Statut : partiellement implemente

## Etat

Deja en place :

- cockpit executif web
- comparaison multi-boutiques
- stock sante / ABC / historique
- finance avancee v1
- CRM avance v1
- procurement enterprise v1
- bibliotheque de rapports v1

Reste pour les prochaines etapes :

- centre de notifications/actions
- recherche globale
- vues enregistrees
- audit log global
- multi-boutiques encore plus reactif sans reload brutal

Ce document regroupe les evolutions recommandees pour que le web soit au moins au
niveau du mobile, puis clairement au-dessus comme vrai back-office entreprise.

## Vision

Le modele cible :

- `mobile` = outil terrain, execution rapide, usage boutique
- `web` = outil de pilotage, controle, analyse, administration, coordination

Le web ne doit pas etre seulement "le mobile sur un grand ecran".
Il doit devenir le centre de gestion avancee de l'entreprise.

## Principes de conception

### 1. Le web doit aider a piloter

Le web doit privilegier :

- comparaison
- synthese
- consolidation
- audit
- export
- decision

### 2. Le web ne doit pas casser l'autonomie terrain

Les boutiques et responsables locaux doivent continuer a travailler vite.

Le web ajoute :

- plus de visibilite
- plus de coordination
- plus de controle optionnel

Mais ne doit pas bloquer les operations quotidiennes par defaut.

### 3. Les filtres et scopes doivent etre coherents partout

Toutes les vues web avancees doivent respecter les memes dimensions :

- date / periode
- boutique
- categorie
- fournisseur
- client
- staff

Et toujours respecter les droits effectifs de l'utilisateur.

## Axe 1. Multi-boutiques solide

### Objectif

Faire du web le meilleur outil pour piloter plusieurs boutiques.

### Chantiers

- contexte boutique reactif partout
- switch sans reload brutal quand possible
- vues consolidees et vues locales clairement distinguees
- scopes boutique visibles dans l'interface
- etats derives recalcules apres changement de boutique

### Livrables

- `store context` unifie
- barre globale de contexte
- badges "boutique active" / "vue consolidee"
- historique et analytics toujours scopes correctement

## Axe 2. Analytics et rapports

### Objectif

Faire du web la surface principale des donnees et de la decision.

### Direction retenue

- `Dashboard` = cockpit executif
- `Multi-store` = comparaison boutiques
- `Stock` = sante, rotation, couverture, ruptures
- `Finance` = marge, charges, resultats, taxes
- `CRM` = segments, retention, dette, campagnes
- `Procurement` = fournisseurs, achats, benchmarking
- `Reports` = exports et bibliotheque de rapports

### Regle UX

Chaque KPI important doit pouvoir ouvrir :

- un detail
- un filtre plus fin
- un export CSV/Excel

### Priorites

1. finir `Finance`
2. enrichir `CRM`
3. enrichir `Fournisseurs`
4. creer `Reports`

## Axe 3. Procurement web avance

Reference :

- [PROCUREMENT_ENTERPRISE_ROADMAP.md](C:/Users/Utilisateur/projet_stock/docs/PROCUREMENT_ENTERPRISE_ROADMAP.md)

### Objectif

Faire du web le centre d'achat entreprise.

### Briques

1. score fournisseur
2. historique des prix d'achat
3. suggestions locales par boutique
4. vue consolidee multi-boutiques
5. opportunites d'achat groupe
6. workflow d'approbation optionnel

### Regle

Le workflow d'approbation doit rester desactive par defaut.

## Axe 4. CRM avance

### Objectif

Donner au web une vraie profondeur client que le mobile n'a pas besoin de porter.

### Briques cibles

- segmentation clients
- retention / reactivation
- cohortes
- dette et encaissement
- valeur client
- campagnes et suivi
- export CRM

### Plus-value web

- vues plus larges
- drill-down
- priorisation des clients a relancer
- actions groupees

## Axe 5. Finance et compta avancees

### Objectif

Faire du web la vraie surface de controle financier.

### Briques cibles

- marge par categorie / produit / fournisseur / boutique
- charges par centre de cout
- taxes
- performance des paiements
- cloture journaliere
- historique des factures
- creation de facture depuis une vente
- exports comptables

### Plus-value web

- meilleure lecture consolidée
- reporting multi-boutiques
- export et controle

## Axe 6. Documents et identite entreprise

### Objectif

Faire du web la surface de reference pour l'identite documentaire.

### Briques cibles

- personnalisation du nom de boutique
- personnalisation du recu
- personnalisation de la facture
- types de facture
- prefixes et numerotation
- adresse / mentions legales / conditions
- historique des factures
- partage / impression / export

### Regle produit

Le mobile peut modifier l'essentiel.
Le web doit proposer la configuration la plus complete.

## Axe 7. UX et ergonomie web

### Objectif

Rendre le web plus lisible, plus rapide et plus rassurant pour les usages longs.

### Chantiers

- navigation plus claire par centres metier
- centre de notifications/actions
- recherche globale
- vues enregistrees
- actions en masse
- meilleurs etats vides
- meilleurs statuts visuels
- badges `offline`, `pending sync`, `draft`, `approved`, `partial`

### Centre de notifications recommande

Le web doit pouvoir centraliser :

- ruptures
- dettes client
- commandes a approuver
- livraisons en retard
- factures a finaliser
- sync offline en attente

## Axe 8. Audit, gouvernance et securite

### Objectif

Donner au web les outils de controle qu'on n'attend pas forcement du mobile.

### Briques cibles

- journal d'audit global
- historique des changements sensibles
- qui a change quoi, quand, sur quelle boutique
- vues admin / support
- suivi des integrations plus tard

### Benefice

Le web devient rassurant pour les entreprises structurees.

## Axe 9. Offline visible et resilient

### Objectif

Le web ne sera pas "tout offline" au sens absolu, mais il doit etre tres robuste
sur le coeur metier.

### Chantiers

- cache des GET critiques
- file de sync des mutations
- etat local `pending`
- reconciliation visible apres resynchronisation
- UX claire sur ce qui est online-only

### Modules prioritaires

1. POS
2. Stock / inventaire
3. CRM dette et encaissement
4. Accounting / factures

## Axe 10. Centre d'integrations

Reference :

- [INTEGRATION_API_ROADMAP.md](C:/Users/Utilisateur/projet_stock/docs/INTEGRATION_API_ROADMAP.md)

### Objectif

Faire du web l'outil de gestion des integrations entreprise.

### Briques cibles

- creation d'integration
- scopes
- limitation par boutique
- cles API
- webhooks
- logs
- replays
- documentation partenaire

## Roadmap recommandee

## Phase 1. Fondation web

- store context unifie
- filtres globaux unifies
- statuts visuels homogenes
- centre d'actions minimum
- nettoyage i18n et copy

## Phase 2. Procurement et analytics

- score fournisseur
- historique prix achat
- suggestions locales par boutique
- detail KPI + export partout
- enrichissement finance / CRM / fournisseurs

## Phase 3. Pilotage entreprise

- vues consolidees multi-boutiques
- opportunites d'achat groupe
- audit log
- vues enregistrees
- recherche globale

## Phase 4. Documents et gouvernance

- configuration documentaire avancee
- reports center
- workflow d'approbation optionnel
- controle admin plus fort

## Phase 5. Plateforme

- centre d'integrations
- webhooks / logs / replay
- exports async
- connecteurs

## Priorites recommandees

Si on veut le meilleur retour rapidement :

1. store context + UX multi-boutiques
2. centre de notifications/actions
3. procurement avance
4. CRM/finance avances
5. audit log + vues enregistrees
6. centre d'integrations

## Questions a figer plus tard

- faut-il un ecran web `Reports` dedie ou une bibliotheque intégrée aux modules ?
- faut-il une recherche globale partout ou d'abord sur quelques ressources ?
- faut-il un workflow d'approbation uniquement sur achats ou aussi sur certains documents ?
- jusqu'ou veut-on pousser le offline visible sur le web ?

## Conclusion

La bonne cible n'est pas de rendre le web identique au mobile.

La bonne cible est :

- `mobile` pour executer
- `web` pour piloter, comparer, exporter, coordonner, auditer et configurer

Si on suit cette direction, le web devient naturellement plus avance que le
mobile, sans rendre l'ensemble plus lourd pour les utilisateurs terrain.
