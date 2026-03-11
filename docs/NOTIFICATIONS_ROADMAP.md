# Notifications Roadmap

Date de preparation : 2026-03-11
Derniere mise a jour : 2026-03-11
Statut : v1 implementee sur alertes, emails et regles entreprise

## Vision

Le systeme de notifications doit couvrir 4 couches coherentes :

- `alertes metier`
- `notifications utilisateur`
- `messages admin`
- `rappels intelligents`

Et 3 canaux concrets :

- `in_app`
- `push`
- `email`

## Etat actuel

### Ce qui est maintenant implemente

- push Expo cote backend
- enregistrement des tokens push
- envoi email via Resend pour les alertes
- regles d alertes avec `scope = account | store`
- contacts email de notification au niveau `compte`
- contacts email de notification au niveau `boutique`
- preferences utilisateur `in_app / push / email`
- seuil minimal par severite pour `push` et `email`
- edition des regles et preferences sur `web` et `mobile`
- alertes metier principales :
  - `low_stock`
  - `out_of_stock`
  - `overstock`
  - `slow_moving`
  - `late_delivery`

### Ce qui manque encore

- un vrai `Notification Center` utilisateur unifie
- consommation riche de `/user/notifications`
- deep-links plus complets
- notifications navigateur
- digest / recap email
- supervision admin avancee sur la delivrabilite

## Hierarchie produit retenue

### 1. Utilisateur

Chaque utilisateur peut regler :

- `in_app`
- `push`
- `email`
- `minimum_severity_for_push`
- `minimum_severity_for_email`

### 2. Compte entreprise

Chaque entreprise peut definir ses propres destinataires emails par groupe :

- `default`
- `stock`
- `procurement`
- `finance`
- `crm`
- `operations`
- `billing`

### 3. Boutique

Chaque boutique peut surcharger ces emails pour les cas locaux.

## Regles d alertes

Une regle peut maintenant porter :

- `type`
- `scope`
- `store_id`
- `enabled`
- `threshold_percentage`
- `notification_channels`
- `recipient_keys`
- `recipient_emails`
- `minimum_severity`

## Experience cible

### Mobile

Role :

- execution terrain
- reaction rapide
- consultation et edition simple des regles

Encore a faire :

- inbox mobile dediee
- badge global
- deep-links riches

### Web

Role :

- tri
- pilotage
- configuration plus complete

Deja en place :

- centre d alertes
- configuration des regles `compte / boutique`
- edition des groupes destinataires et des canaux

Encore a faire :

- vrai `Notification Center`
- filtres avancés
- inbox unifiee

### Admin

Role :

- pilotage des canaux
- broadcast
- qualite / delivrabilite

Encore a faire :

- stats push
- stats email
- erreurs de delivrabilite
- bruit / volume par categorie

## Roadmap

### Phase 1. Socle multicanal

Statut : fait en v1

- alertes multicanal
- emails entreprise / boutique
- preferences utilisateur
- edition web et mobile des regles

### Phase 2. Centre utilisateur unifie

Statut : a faire

- `/user/notifications`
- inbox web
- inbox mobile
- badge et filtres

### Phase 3. Deep-links et actions

Statut : a faire

- ouvrir directement le bon ecran
- action rapide depuis la notification
- badge par categorie si utile

### Phase 4. Admin et qualite

Statut : a faire

- supervision push/email
- stats de delivrabilite
- suivi broadcast
- moderation du bruit

### Phase 5. Enrichissement

Statut : a faire

- notifications navigateur
- digest quotidiens / hebdo
- quiet hours
- templates email plus riches

## Conclusion

Le systeme n est plus seulement un socle push partiel.

Il couvre maintenant :

- les regles d alertes
- les canaux `in_app / push / email`
- les emails propres a chaque entreprise
- les surcharges par boutique
- les preferences utilisateur

La suite logique n est plus le moteur d alertes, mais le `centre de notifications` unifie et la supervision admin.
