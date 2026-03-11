# Subscription Access Policy Roadmap

## Objectif
Permettre a un commercant de continuer a utiliser Stockman sans perdre ses donnees en cas de probleme de paiement, tout en appliquant une politique d'acces progressive et gouvernable.

## Phases d'acces
- `active`
- `grace`
- `restricted`
- `read_only`

## Regles v1
- abonnement/trial actif : acces normal
- fin d'abonnement payant : `grace` automatique (7 jours par defaut)
- fin de trial : `grace` courte (3 jours par defaut)
- apres la grace : `restricted`
- `read_only` uniquement sur validation admin explicite

## Principes
- jamais de perte de donnees
- jamais de blocage du paiement / support / recuperation
- continuite mobile prioritaire
- web Enterprise limite quand necessaire, mais regularisation toujours possible
- la lecture seule n'est jamais automatique

## Donnees backend exposees
- `subscription_access_phase`
- `grace_until`
- `read_only_after`
- `requires_payment_attention`
- `can_write_data`
- `can_use_advanced_features`
- `subscription_plan`
- `manual_read_only_enabled`

## Reglages
- `PAID_SUBSCRIPTION_GRACE_DAYS`
- `TRIAL_SUBSCRIPTION_GRACE_DAYS`
- `SUBSCRIPTION_READ_ONLY_AFTER_DAYS`

## Admin
- visibilite des phases dans le cockpit abonnements
- action manuelle `Accorder 7j`
- action manuelle `Accorder 14j`
- action manuelle `Accorder 30j`
- action manuelle `Passer en lecture seule`
- action manuelle `Retirer lecture seule`
- note admin facultative sur chaque action manuelle
- journal d'evenement `manual_grace_granted`
- journaux `manual_read_only_enabled` / `manual_read_only_disabled`

## Matrice d'acces recommandee

### Regle globale
- `active` : usage normal
- `grace` : usage normal + alertes paiement
- `restricted` : continuite d'activite seulement
- `read_only` : consultation, export, paiement, support uniquement

### Par module
| Module | `active` | `grace` | `restricted` | `read_only` |
|---|---|---|---|---|
| `POS / ventes` | tout | tout | vente et encaissement autorises | consultation seulement |
| `Produits` | tout | tout | creation/edition simple autorisees, imports massifs bloques | consultation seulement |
| `Stock` | tout | tout | ajustements simples autorises, transferts/inventaires massifs bloques | consultation seulement |
| `CRM clients` | tout | tout | consultation + operations terrain simples, campagnes bloquees | consultation seulement |
| `Dettes clients` | tout | tout | consultation + encaissement autorise | consultation seulement |
| `Compta` | tout | tout | consultation + exports, ecritures manuelles/dépenses/factures bloquees | consultation seulement |
| `Fournisseurs / appro` | tout | tout | consultation + suivi commandes existantes, nouvelles commandes bloquees | consultation seulement |
| `Restaurant` | tout | tout | service terrain autorise | consultation seulement |
| `Boutiques` | tout | tout | creation/modification bloquees | consultation seulement |
| `Equipe / permissions` | tout | tout | bloque | consultation seulement |
| `Settings structurels` | tout | tout | bloque | consultation seulement |
| `Preferences perso` | tout | tout | autorise | autorise |
| `Analytics / rapports` | tout | tout | consultation + export autorises | consultation + export autorises |
| `Notifications` | tout | tout | lecture + preferences perso | lecture seulement |
| `Abonnement / paiement` | tout | tout | autorise | autorise |
| `Support` | tout | tout | autorise | autorise |
| `Sync offline deja en attente` | autorise | autorise | autorise | autorise |

## Statut
- `v1 implementee`
  - calcul backend des phases
  - affichage web/mobile abonnement
  - ecran web de recuperation limite
  - grace manuelle admin
  - lecture seule manuelle admin
  - premiers gardes backend sur les ecritures critiques `staff`, `boutiques`, `POS`, `CRM`, `Compta` et modules avec permissions d'ecriture
- `v2 plus tard`
  - lecture seule metier plus stricte par module
  - exports et support dedies en mode restreint
  - regles differentes par plan si necessaire
