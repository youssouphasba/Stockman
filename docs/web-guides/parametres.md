# Guide - Parametres

## 1. Role du module

Le module Parametres permet de gerer le compte, la boutique active, les canaux d'alerte, les documents, les options de securite et certains reglages avances de l'organisation.

Profils concernes : administrateurs et utilisateurs autorises selon la section.

## 2. Acces

Barre laterale -> **Compte** -> **Parametres**.

## 3. Ce qui a change

Les reglages ont ete harmonises avec plusieurs ajustements recents :

- les sauvegardes importantes affichent un retour visuel explicite ;
- certains ecrans juridiques et pages annexes reviennent proprement vers Parametres ;
- les alertes et rappels ont ete regroupes dans une logique plus claire ;
- la synchronisation offline est mieux expliquee et plus fiable ;
- le test des notifications push remonte l'erreur reelle quand la configuration n'est pas correcte.

## 4. Sections principales

### Compte et application

Permet de regler :

- langue ;
- preferences generales ;
- informations du compte ;
- certains comportements de l'application.

Dans le selecteur de langue mobile, les langues sont maintenant affichees avec des pastilles texte stables comme `FR`, `EN` ou `AR`, afin d'eviter les caracteres corrompus ou les drapeaux mal rendus selon l'appareil.

Quand un compte a ete cree via Google sans passer par le parcours complet, l'application peut demander une etape de completion avant de rendre l'experience normale.

### Boutique active

Cette section regroupe les informations de la boutique actuellement selectionnee :

- identite ;
- documents ;
- informations pratiques ;
- contexte de travail courant.

### Organisation et pilotage

On y retrouve les reglages transverses :

- equipe ;
- modules visibles ;
- options de gestion plus avancees.

### Alertes et rappels

Cette zone centralise :

- canaux in-app ;
- push ;
- email ;
- destinataires utiles ;
- regles d'alerte par famille.

Les alertes tres proches sur le meme sujet sont desormais mieux regroupees pour reduire le bruit.

### Abonnement et facturation

Cette section permet de :

- consulter le plan ;
- verifier la devise et le pays de facturation ;
- relancer une recuperation d'abonnement si necessaire ;
- comprendre les limites liees au plan actif.

### Synchronisation

Le bloc de synchronisation aide a comprendre :

- si l'appareil est connecte ou non ;
- quelles actions restent en attente ;
- quels modules compatibles hors ligne seront renvoyes automatiquement.

Les actions offline deja en attente ne sont plus perdues lors d'un simple changement de boutique.

### Securite et donnees

On y trouve notamment :

- mot de passe ;
- biometrie ;
- export ;
- suppression de compte ;
- options sensibles de protection des acces.

## 5. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi certains reglages sont en lecture seule ? | Selon le role, le plan ou la permission, certaines sections restent reservees aux administrateurs. |
| Comment savoir si une sauvegarde a bien fonctionne ? | Les reglages importants affichent maintenant une confirmation visuelle apres enregistrement. |
| Pourquoi le test push echoue parfois ? | Si Expo, FCM ou la configuration du terminal ne sont pas corrects, l'application affiche maintenant l'erreur reelle. |
| Est-ce qu'un changement de boutique efface mes actions offline ? | Non, la file locale deja en attente est preservee. |
