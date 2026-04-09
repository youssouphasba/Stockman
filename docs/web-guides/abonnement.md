# Guide - Abonnement

## 1. Role du module

Le module Abonnement permet de consulter son plan, verifier la devise de facturation, mettre a jour le contact de facturation et lancer un paiement de renouvellement ou d'evolution.

**Profils concernes** : `billing_admin`, `org_admin`, `shopkeeper` autorise.

## 2. Acces

Barre laterale -> **Compte** -> **Abonnement**.

## 3. Lecture de l'ecran

### En-tete

- **Titre** : `Gestion d'abonnement`
- **Sous-titre** : prix effectifs, devise et canal de paiement

### Carte plan actuel

Le bloc du haut affiche :

- le plan actif ;
- le statut de l'abonnement ;
- la date de fin si elle existe ;
- la devise et la region tarifaire.

### Bloc d'evolution vers Enterprise

Si le compte est en `Starter` ou `Pro`, un bloc explique clairement que :

- le passage a `Enterprise` se fait sur le meme compte ;
- les boutiques, utilisateurs et donnees sont conserves ;
- le web complet se debloque apres confirmation du paiement.

### Creation d'un compte depuis le web

Une personne qui commence directement sur la web app cree un compte web `Enterprise`.
Le comportement doit rester le meme avec une inscription email/mot de passe et avec une
inscription sociale Google ou Apple.

Quand le compte est cree avec Google ou Apple, Stockman peut demander de terminer le profil :
pays, telephone et secteur d'activite. Cette finalisation fait partie du parcours
d'authentification et ne doit pas etre bloquee par le mode web en consultation.

### Pays et devise

Le pays et la devise de facturation sont affiches en lecture seule.

### Cartes des plans

- `Starter` : 1 utilisateur principal, sans employe supplementaire
- `Pro` : usage mobile renforce avec equipe et fonctions etendues
- `Enterprise` : mobile + back-office web complet

Quand le compte n'est pas encore `Enterprise`, la carte `Enterprise` rappelle que le paiement met a jour le compte actuel.

### Contact de facturation

Le nom et l'email de facturation peuvent etre mis a jour avant un paiement.

### Informations paiement

Deux canaux peuvent etre proposes selon la devise :

- `Stripe` pour la carte bancaire
- `Flutterwave` pour Mobile Money

### Historique de facturation

La section du bas affiche l'historique disponible. Si aucun document n'existe encore, l'ecran l'indique explicitement.

## 4. Cas d'usage

### Passer de Starter ou Pro a Enterprise

1. Ouvrir **Abonnement**.
2. Verifier le contact de facturation, le pays et la devise.
3. Choisir la carte `Enterprise`.
4. Lancer le paiement par carte ou Mobile Money selon la devise.
5. Attendre la confirmation du paiement.
6. Revenir sur le web app : le meme compte passe alors en `Enterprise`.

### Renouveler le plan actuel

1. Ouvrir **Abonnement**.
2. Choisir le canal de paiement propose.
3. Finaliser le checkout.

### Mettre a jour le contact de facturation

1. Modifier le nom ou l'email.
2. Cliquer sur `Mettre a jour le contact`.

## 5. Points de vigilance

- Le passage a `Enterprise` ne cree pas un nouveau compte.
- Les donnees existantes ne sont pas supprimees lors de l'evolution.
- Le changement de plan devient effectif apres confirmation du paiement par le prestataire.
- Une nouvelle inscription lancee depuis la web app initialise le compte pour le parcours web `Enterprise`, y compris lorsque l'utilisateur continue avec Google ou Apple.
- Un compte `Starter` ou `Pro` peut consulter le web app, mais ne peut pas y creer ou modifier des donnees tant que `Enterprise` n'est pas actif.
- Un compte `Starter` reste mono-utilisateur : pour ajouter des employes, il faut passer a `Pro` ou `Enterprise`.
