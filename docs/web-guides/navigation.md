# Guide - Navigation generale

## 1. Role

La navigation permet d'ouvrir les modules utiles selon :

- le plan actif ;
- le role ;
- les permissions ;
- le contexte de boutique.

## 2. Web app

Sur le web, la navigation principale passe par la barre laterale.

Elle permet :

- d'ouvrir les modules autorises ;
- de changer de boutique si plusieurs boutiques sont attribuees ;
- d'ouvrir certaines pages dans un autre onglet quand le navigateur est utilise pour cela.

## 3. Mobile

Sur mobile, chaque onglet peut proposer son propre menu lateral ou menu secondaire.

Ces menus ont ete realignes avec le code metier :

- les entrees renvoient vers les bons modules ;
- les elements reserves a un plan superieur sont masques ;
- les actions visibles correspondent aux vraies capacites de l'ecran.

Exemple dans `Produits` :

- `Historique mouvements` ouvre bien le module d'historique ;
- `Statistiques` ouvre bien le module de statistiques ;
- les entrees reservees a `Enterprise` ne s'affichent pas pour `Starter` ou `Pro`.

## 4. Regles de visibilite

La navigation ne doit pas afficher un element indisponible par simple cadenas si le plan ne l'autorise pas. Le comportement attendu est maintenant :

- si le plan ou les droits permettent l'acces : l'entree est visible ;
- sinon : l'entree est masquee.

Cela evite de montrer a un compte `Starter` ou `Pro` des elements reserves a `Enterprise`.

## 5. Changement de boutique

Quand la boutique active change :

- les donnees sont rechargees dans le nouveau contexte ;
- les menus et ecrans affichent alors les informations de la boutique selectionnee ;
- la file locale des actions offline deja en attente n'est plus effacee par un simple changement de boutique.

## 6. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi je ne vois pas certains menus ? | Ils peuvent etre masques par le plan, les permissions ou le role. |
| Pourquoi un collegue voit moins d'entrees que moi ? | Les menus suivent ses droits reels, pas seulement l'existence du module dans l'application. |
| Est-ce normal qu'un changement de boutique recharge les donnees ? | Oui, les ecrans doivent se recaler sur la boutique active. |
