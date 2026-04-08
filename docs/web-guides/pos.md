# Guide - Point de Vente (POS)

## 1. Role du module

Le POS permet d'enregistrer les ventes, gerer le panier, selectionner un client et finaliser un paiement.

Profils concernes : utilisateurs ayant la permission `pos`.

## 2. Acces

- barre laterale -> **POS**
- ou bouton de vente depuis le dashboard

## 3. Fonctions principales

- recherche et ajout de produits ;
- gestion du panier ;
- selection ou creation rapide d'un client ;
- choix du mode de paiement ;
- recu et annulation de vente selon les droits.

## 4. Particularites recentes

### Client par defaut

Le POS gere un client par defaut quand aucun client connu n'est rattache a la vente. L'affichage et les chips doivent rester lisibles, sans chevauchement visuel.

### Caisse vocale

Le flux audio de la caisse a ete fiabilise :

- l'application verifie mieux le fichier temporaire ;
- la lecture ou l'analyse n'essaie plus d'utiliser un fichier deja disparu ;
- les erreurs de fichier audio sont mieux evitees.

### Choix de terminal

Le choix d'un terminal de paiement peut dependre du plan ou du contexte de l'organisation. Si cette fonction est reservee a un niveau superieur, elle ne doit pas apparaitre pour un plan inferieur.

## 5. Hors ligne

Le POS peut conserver certaines operations localement puis les renvoyer des le retour du reseau, selon le flux compatible.

## 6. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi je ne vois pas le choix du terminal ? | Cette fonction depend du plan et du contexte disponible. |
| Pourquoi un produit n'est pas cliquable ? | Il peut etre en rupture ou indisponible dans le contexte courant. |
| Que se passe-t-il si la connexion coupe ? | Les flux compatibles restent en attente puis se synchronisent quand le reseau revient. |
