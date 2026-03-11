# Admin Subscriptions Monitoring Roadmap

## Objectif
Donner au dashboard admin un vrai cockpit `abonnements & paiements` basé sur `business_accounts`, pas sur les anciens agrégats `users`.

## Périmètre
- Vue d'ensemble abonnements
- Table comptes abonnés
- Journal d'événements paiements/webhooks
- Alertes d'anomalies

## Source de vérité
- `business_accounts` pour l'état d'abonnement
- `subscription_events` pour l'historique opérationnel

## KPI clés
- comptes payants actifs
- trials actifs
- trials expirant à 3 jours / 7 jours
- abonnements expirant bientôt
- comptes expirés / annulés
- répartition par plan, provider, devise
- volume de paiements récent par provider/canal/devise

## Journal d'événements
Types principaux :
- `checkout_initiated`
- `checkout_completed`
- `payment_succeeded`
- `payment_failed`
- `payment_issue`
- `subscription_deleted`
- `subscription_expired`
- `subscription_cancelled`
- `webhook_invalid_signature`
- `payment_unmatched`

## Alertes admin
- trials proches de l'expiration
- comptes payants sans `subscription_end`
- références provider manquantes
- plans supérieurs à `starter` alors que le compte est expiré
- incidents provider récents

## Statut
- `v1 implémentée`
  - endpoints backend admin
  - journal `subscription_events`
  - nouvel onglet admin web
- `v2 plus tard`
  - actions admin directes (`forcer sync`, `prolonger trial`, `réactiver`)
  - courbes d'évolution
  - export dédié des événements paiements
