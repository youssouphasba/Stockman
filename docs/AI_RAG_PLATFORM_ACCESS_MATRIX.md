# Matrice RAG IA - Plans, roles et plateformes

## Objectif

Ce document sert de reference au RAG de l'IA pour repondre correctement sur :

- les fonctionnalites reelles du produit ;
- les differences entre web et mobile ;
- les differences entre compte commercant, compte fournisseur et compte admin ;
- les restrictions liees au plan, au role et aux permissions.

L'IA doit toujours croiser cette matrice avec :

- les permissions reelles de l'utilisateur ;
- la boutique active et les boutiques autorisees ;
- le plan effectif et la phase d'acces abonnement ;
- les donnees reelles du compte ;
- le code metier indexe.

## Regles de reponse

- Ne jamais presenter comme disponible une action, un ecran ou une donnee qui n'est pas accessible au profil courant.
- Si une action existe sur une seule plateforme, le dire explicitement.
- Si une fonctionnalite depend du plan, du role ou d'une permission de module, le dire explicitement.
- Si une fonctionnalite est disponible mais en lecture seule, le dire explicitement.
- Si une situation differe entre iOS et Android, le dire explicitement.

## Plans et capacites

Les reponses de l'IA doivent utiliser en priorite :

- `effective_plan`
- `subscription_access_phase`
- `can_write_data`
- `can_use_advanced_features`

### Starter

- Base de gestion commerciale.
- Peut etre limite en nombre de boutiques et en fonctionnalites avancees.
- Si `can_use_advanced_features` est faux, l'IA doit eviter de promettre les fonctions avancees.
- Si `can_write_data` est faux, l'IA doit expliquer que le compte est en lecture seule.

### Pro

- Debloque davantage de fonctions avancees que Starter.
- Les ecrans et actions avances ne doivent etre presentes que si `can_use_advanced_features` est vrai.

### Enterprise

- Contexte multi-boutiques, pilotage avance et fonctions etendues.
- Certaines fonctions restent reservees aux bons roles meme en Enterprise.

## Phases d'acces abonnement

### active

- Acces normal.

### grace

- Acces encore possible, mais l'IA doit pouvoir signaler une attention paiement.

### read_only

- L'IA doit indiquer que les modifications ne sont plus autorisees si `can_write_data` est faux.

### expired

- L'IA doit rester prudente et ne pas proposer de modifications si l'acces d'ecriture est coupe.

## Roles de compte

### superadmin

- Vision globale plateforme.
- Peut acceder aux vues transverses, securite, abonnements et administration globale.

### org_admin

- Gere l'organisation, les boutiques, les permissions et les reglages de compte.
- Peut voir l'historique de compte et les reglages d'organisation.

### billing_admin

- Oriente facturation et abonnement.
- Ne doit pas etre presente comme administrateur global si les autres permissions manquent.

### shopkeeper

- Profil commercant principal.
- Acces large a l'exploitation selon les permissions et le plan.

### staff

- Acces strictement limite aux modules explicitement autorises.
- L'IA doit se baser sur `effective_permissions` ou `permissions`.

### supplier

- Contexte fournisseur.
- L'IA ne doit pas repondre comme pour un commercant si le role est `supplier`.

## Modules et permissions

L'IA doit verifier les modules suivants avant d'affirmer qu'une action est disponible :

- `pos`
- `stock`
- `accounting`
- `crm`
- `suppliers`
- `staff`
- `ai`

### Lecture

- Si le module est en `read`, l'IA peut expliquer, resumer et aider a consulter.
- Elle ne doit pas presenter les actions d'ecriture comme disponibles.

### Ecriture

- Si le module est en `write`, l'IA peut decrire les actions de creation, modification et suppression autorisees.

### Aucun acces

- Si le module est absent ou vaut `none`, l'IA doit dire que le module n'est pas accessible a ce profil.

## Plateformes

## Web commercant

- Pilotage riche des fournisseurs, du stock, de la comptabilite, du CRM et des vues admin.
- Marketplace fournisseur plus riche que sur mobile commercant.
- Recherche, filtres, benchmark et liaisons produit/fournisseur plus complets.
- Parametrage et editions plus confortables sur ecran large.

## Mobile commercant

- Execution terrain rapide.
- Flux commandes, retours, avoirs, rappels et actions rapides plus immediats.
- Navigation orientee usage quotidien.
- Certaines vues sont simplifiees par rapport au web.

## Mobile fournisseur

- Oriente traitement des commandes recues, statuts, messages, factures et catalogue fournisseur.
- Ne doit pas etre decrit comme equivalent du web commercant.

## Web admin

- Administration, securite, support, litiges, abonnements, catalogues et reglages globaux.
- Certaines actions n'existent pas sur le mobile commercant standard.

## iOS

- Respect strict des achats integres.
- Les messages ou liens de paiement externes ne doivent pas etre presents comme disponibles dans l'app si ce n'est pas autorise.
- L'offre Enterprise doit etre decrite de facon informative si elle n'est pas achetable directement dans l'app.

## Android

- Achat integre et flux Google Play possibles pour les plans mobiles eligibles.
- Les reponses peuvent mentionner Google Play si le contexte mobile Android s'y prete.

## Flux a distinguer

### Abonnement

- Web : information, pilotage et facturation plus complets.
- Mobile : consultation du plan, changement de plan et restauration selon plateforme.
- iOS et Android ne doivent pas etre presentes de la meme facon.

### Fournisseurs et commandes

- Web commercant : pilotage, marketplace, benchmark, liaisons produit/fournisseur.
- Mobile commercant : execution rapide, retours, avoirs, actions terrain.
- Mobile fournisseur : traitement des commandes recues, pas pilotage equivalent au web commercant.

### Stock

- Web : vues plus larges, analyses et gestion detaillee.
- Mobile : operations rapides, acces terrain, imports et controles utiles.

### Reglages

- Les reglages visibles et modifiables dependent du role de compte et du niveau d'administration.

## Ce que l'IA doit dire explicitement

- "Disponible sur web uniquement" si la fonctionnalite n'existe pas sur mobile.
- "Disponible sur mobile uniquement" si la fonctionnalite n'existe pas sur web.
- "Disponible sur mobile fournisseur, pas sur le compte commercant" si les flux different.
- "Disponible avec ce plan uniquement" si la limitation depend du plan.
- "Visible mais non modifiable avec votre acces actuel" si le compte est en lecture seule.

## Sources prioritaires a croiser

- `backend/server.py`
- `backend/enterprise_access.py`
- `frontend/services/api.ts`
- `frontend/app/(tabs)/*`
- `frontend/app/(supplier-tabs)/*`
- `frontend/app/(auth)/*`
- `web-app/src/services/api.ts`
- `web-app/src/components/*`
- les guides et le centre d'aide

## Regle finale

En cas de doute, l'IA doit preferer une reponse prudente du type :

"Je peux vous expliquer le flux theorique, mais je ne dois pas affirmer que cette action est disponible pour votre profil sans confirmer votre role, votre plan, vos permissions et votre plateforme."
