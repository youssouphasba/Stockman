# Roadmap Inscription, Verification et Suivi Admin

Date de preparation : 2026-03-10
Statut : plan 1 implemente, plan 2 implemente en V1, plan 3 conserve en backlog

Ce document fige les 3 plans valides pour une implementation ulterieure autour de l'inscription, de la verification OTP, de l'activation et du suivi admin.

## Vue d'ensemble

Ordre recommande :
1. Plan 1 : refonte du flux d'inscription et de verification
2. Plan 2 : dashboard admin onboarding, OTP et conversion
3. Plan 3 : onboarding, activation, securite et conversion long terme

Dependance cle :
- le Plan 2 depend des evenements et etats produits par le Plan 1
- le Plan 3 depend en partie du Plan 1, mais certaines briques peuvent etre lancees en parallele

---

## Plan 1 - Refonte du flux d'inscription et de verification

### Objectif

Mettre en place un flux officiel, coherent et evolutif :
- `Starter / Pro / mobile` : OTP telephone via Twilio
- `Enterprise / web` : OTP email via Resend
- `Supplier` : verification email par defaut, sauf decision produit contraire

### Regles produit cibles

- `Starter / Pro`
  - email obligatoire
  - telephone obligatoire
  - verification requise : `phone`
- `Enterprise`
  - email obligatoire
  - telephone optionnel
  - verification requise : `email`
- `Supplier`
  - email obligatoire
  - verification requise : `email`

### Backend

#### Donnees a ajouter

Dans le modele utilisateur :
- `is_email_verified`
- `email_otp`
- `email_otp_expiry`
- `email_otp_attempts`
- `required_verification`
- `verification_channel`
- `signup_surface`
- `verification_completed_at`

#### Endpoints a garder / creer

- garder `POST /auth/register`
- garder `POST /auth/verify-phone`
- remplacer `POST /auth/resend-otp` par `POST /auth/resend-phone-otp`
- ajouter `POST /auth/verify-email`
- ajouter `POST /auth/resend-email-otp`
- ajouter `GET /auth/verification-status`

#### Logique a introduire

- choisir automatiquement le canal de verification depuis `plan` et `signup_surface`
- envoyer l'OTP Twilio uniquement si `required_verification = phone`
- envoyer l'OTP Resend uniquement si `required_verification = email`
- renvoyer dans la reponse d'auth :
  - `required_verification`
  - `is_phone_verified`
  - `is_email_verified`
  - `can_access_app`
  - `can_access_web`

#### Evenements a journaliser

- `signup_started`
- `signup_completed`
- `otp_sent`
- `otp_send_failed`
- `otp_verified`
- `otp_verification_failed`
- `otp_expired`

Dimensions minimales :
- `user_id`
- `account_id`
- `plan`
- `surface`
- `provider`
- `channel`
- `country_code`
- `created_at`

### Mobile

Fichiers cibles :
- `frontend/app/(auth)/register.tsx`
- `frontend/app/(auth)/verify-phone.tsx`
- `frontend/app/(auth)/verify-email.tsx`
- `frontend/contexts/AuthContext.tsx`
- `frontend/services/api.ts`

Travaux :
- aligner le mot de passe minimal sur `8`
- garder le telephone obligatoire pour `starter/pro`
- supprimer le choix de plan au signup mobile et demarrer le commercant en `starter` par defaut
- router vers `verify-phone` si `required_verification = phone`
- router vers `verify-email` si `required_verification = email`
- renommer les appels OTP telephone pour correspondre aux nouveaux endpoints
- empecher l'acces plein a l'app tant que la verification requise n'est pas terminee

### Web

Fichiers cibles :
- `web-app/src/components/EnterpriseSignupModal.tsx`
- `web-app/src/services/api.ts`
- `web-app/src/app/HomeClient.tsx`
- creer un ecran ou modal `verify-email`

Travaux :
- passer l'inscription Enterprise par le client API partage
- stocker la session proprement apres inscription
- si `required_verification = email`, ouvrir directement le parcours `verify-email`
- ne plus forcer le telephone sur Enterprise
- afficher des messages clairs sur l'etape suivante

### Validation

Cas a tester :
- `starter mobile` : inscription -> OTP telephone -> acces
- `pro mobile` : inscription -> OTP telephone -> acces
- `enterprise web` : inscription -> OTP email -> acces
- `enterprise web sans telephone`
- `resend phone OTP`
- `resend email OTP`
- `otp expire`
- `otp incorrect`

### Critere de fin

Le flux d'inscription et de verification est unifie, coherent entre backend, mobile et web, et suit officiellement la regle :
- mobile = verification telephone
- enterprise web = verification email

Etat reel :
- backend implemente
- mobile aligne
- web Enterprise aligne
- comptes legacy preserves sans retro-blocage de verification

---

## Plan 2 - Dashboard Admin onboarding, OTP et conversion

### Objectif

Transformer le dashboard admin en poste de pilotage pour suivre :
- les inscriptions
- les OTP Twilio et Resend
- l'activation des comptes
- la conversion trial -> payant
- les blocages support et securite

### Onglets / sections a ajouter ou enrichir

#### Overview

KPIs :
- inscrits du jour
- OTP envoyes aujourd'hui
- taux de verification
- delai moyen de verification
- essais expirant sous 7 jours
- conversion trial -> payant

#### Onboarding

Funnel :
- visite
- inscription commencee
- inscription completee
- OTP envoye
- OTP verifie
- premier login
- onboarding termine
- premiere valeur

Decoupages :
- par plan
- par surface `mobile/web`
- par pays
- par business type

#### OTP

Bloc `Twilio` :
- OTP envoyes
- OTP reussis
- OTP echoues
- OTP expires
- taux de delivrance
- taux de verification

Bloc `Resend` :
- emails OTP envoyes
- envois echoues
- verification email reussie
- verification email non terminee
- taux de verification

#### Enterprise

KPIs :
- comptes Enterprise crees
- comptes Enterprise verifies par email
- comptes Enterprise actives
- comptes avec premiere boutique active
- comptes avec premiere vente
- comptes inactifs a J+1 / J+7

#### Support

KPIs :
- tickets ouverts
- temps moyen de premiere reponse
- tickets > 24h
- tickets > 72h
- comptes bloques par un probleme OTP

#### Security

KPIs :
- login failed 24h
- OTP failures 24h
- pays ou IP suspectes
- comptes bloques

### Backend

Endpoints admin a ajouter :
- `GET /admin/stats/onboarding`
- `GET /admin/stats/otp`
- `GET /admin/stats/enterprise-signups`
- `GET /admin/stats/conversion`
- `GET /admin/verification-events`

### Frontend web admin

Fichier principal :
- `web-app/src/components/AdminDashboard.tsx`

Sous-composants recommandes :
- `AdminOnboardingPanel.tsx`
- `AdminOtpPanel.tsx`
- `AdminEnterprisePanel.tsx`
- `AdminConversionPanel.tsx`

### Validation

Le dashboard doit permettre de repondre en moins de 2 minutes a ces questions :
- quel plan s'inscrit le plus
- quel canal OTP echoue le plus
- quel pays convertit le mieux
- combien de comptes Enterprise restent bloques avant activation
- combien de trials sont a risque

### Critere de fin

Le dashboard admin devient un outil de suivi acquisition -> verification -> activation -> conversion, pas seulement un backoffice de supervision.

Etat reel :
- endpoints backend implementes
- vue d'ensemble admin enrichie avec onboarding / OTP / Enterprise / conversion
- V2 possible plus tard si on veut des onglets admin dedies plutot que des blocs dans `overview`

---

## Plan 3 - Onboarding, activation, securite et conversion long terme

### Objectif

Ameliorer toute la chaine apres inscription pour augmenter l'activation, la retention et la securite.

### Axe A - Onboarding post-inscription

- ajouter un onboarding par business type
- guider l'utilisateur vers la premiere valeur
- afficher une checklist differente selon :
  - commerce
  - restaurant
  - fournisseur
  - entreprise multi-boutiques

Etapes possibles :
- creer la premiere boutique
- ajouter le premier produit
- realiser la premiere vente
- inviter un premier staff
- configurer la devise et les taxes

### Axe B - Activation produit

Definir les statuts :
- `account_created`
- `verification_completed`
- `onboarding_started`
- `onboarding_completed`
- `activated`

Definir les moments de valeur :
- commerce : premier produit + premiere vente
- restaurant : premiere commande ouverte
- fournisseur : premier produit publie
- enterprise : premiere boutique + premier flux operationnel

### Axe C - Conversion et relances

Automatisations a prevoir :
- OTP non verifie apres X minutes
- compte cree sans activation apres 24h
- trial expirant bientot
- Enterprise cree sans activation apres 3 jours
- relance personnalisee selon business type

### Axe D - Securite et anti-abuse

- rate limit par email
- rate limit par telephone
- cooldown d'inscription et de renvoi OTP
- detection de tentatives suspectes par IP, pays, device
- politique claire d'acces avant verification

### Axe E - Legal et conformite

Tracer cote backend :
- acceptation CGU
- acceptation privacy
- date d'acceptation
- version du document
- IP et user agent si besoin

### Axe F - Architecture

- extraire la logique auth/signup/verification hors de `backend/server.py`
- creer une couche dediee pour les providers OTP/email
- unifier les abstractions web/mobile pour les parcours d'inscription
- formaliser les types :
  - `signup_intent`
  - `verification_status`
  - `activation_status`

### Validation

Questions auxquelles le produit doit pouvoir repondre :
- ou les utilisateurs abandonnent-ils
- quel business type s'active le mieux
- quel provider OTP a le meilleur taux de succes
- combien de comptes verifies deviennent vraiment actifs
- quels comptes doivent etre relances en priorite

### Critere de fin

L'inscription n'est plus seulement un formulaire + OTP, mais un vrai systeme d'acquisition, verification, activation et conversion.

---

## Resume operationnel

### Plan 1
Priorite : haute
Role : rendre le flux d'inscription correct

### Plan 2
Priorite : haute
Role : rendre le suivi admin utile et pilotable

### Plan 3
Priorite : moyenne a haute
Role : augmenter l'activation, la conversion et la robustesse long terme

## Rappel pratique

Ce plan est enregistre ici :
- `docs/AUTH_ONBOARDING_ADMIN_ROADMAP.md`

Quand on voudra reprendre, il suffira de dire :
- "reprends le plan 1"
- "on implemente le plan 2"
- "on attaque le plan 3"
