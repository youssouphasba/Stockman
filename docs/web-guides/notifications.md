# Guide - Notifications

## 1. Role du module

Le centre de notifications rassemble les notifications in-app et les messages utiles a l'utilisateur. Il sert aussi de point d'entree vers les alertes quand une notification demande une action metier.

## 2. Acces

- Icône cloche dans l'application
- Ou ouverture directe depuis une notification compatible

## 3. Ce que l'utilisateur peut faire

- consulter les notifications recues ;
- distinguer les non lues ;
- marquer une notification comme lue ;
- ouvrir l'ecran cible quand la notification est liee a un module compatible.

## 4. Lien avec les alertes

Les notifications et les alertes ne sont pas exactement la meme chose :

- la notification est le signal recu ;
- l'ecran Alertes est l'endroit ou l'on traite les alertes in-app metier.

Quand c'est pertinent, une notification peut ouvrir directement l'ecran Alertes au bon endroit.

## 5. Canaux

Selon le type d'information et la configuration :

- in-app ;
- push ;
- email.

Le test push affiche maintenant la vraie erreur technique si le branchement n'est pas correct.

## 6. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi une notification ne m'envoie pas toujours vers le meme ecran ? | Cela depend du type de notification et de l'action attendue. |
| Peut-on supprimer une notification ? | Cela depend du flux, mais le comportement standard reste la lecture et le traitement depuis l'ecran cible. |
| Pourquoi je ne recois pas les push ? | Verifiez les permissions du terminal et le branchement technique ; le test affiche maintenant l'erreur reelle en cas de probleme. |
