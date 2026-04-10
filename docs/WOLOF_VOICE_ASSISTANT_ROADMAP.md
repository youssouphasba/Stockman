# Feuille de route - Assistant vocal wolof pour Stockman

## Statut

Ce document est un cadrage produit et technique mis de cote pour une future implementation.

Il ne decrit pas une fonctionnalite deja operationnelle dans Stockman.

Tant que cette feuille de route n'est pas implemente e2e, ni le produit ni l'IA ne doivent presenter l'assistant vocal wolof comme disponible en production.

## Objectif

Permettre a un commercant de piloter les flux essentiels de Stockman en wolof, y compris lorsqu'il lit peu ou difficilement le francais.

La cible n'est pas un chatbot libre dans un premier temps.

La cible est une experience guidee par la voix, avec :

- lecture vocale des consignes et des resultats ;
- commandes vocales courtes et robustes ;
- confirmations systematiques avant les actions sensibles ;
- parcours etapes par etapes sur les flux les plus utiles.

## Cas d'usage prioritaires

### POS

- annoncer le total ;
- annoncer le mode de paiement choisi ;
- confirmer la vente ;
- imprimer un recu ;
- passer au client suivant ;
- annuler la derniere action.

### Stock

- rechercher un produit ;
- ajouter du stock ;
- retirer du stock ;
- annoncer les alertes stock bas ;
- ouvrir l'historique d'un produit.

### CRM

- rechercher un client ;
- annoncer la dette restante ;
- enregistrer une note simple ;
- confirmer un paiement client.

## Pile cible avec GalsenAI

### TTS

But :

- faire parler l'application en wolof ;
- lire des instructions courtes ;
- confirmer une action ;
- annoncer des montants, des quantites et des statuts.

Base de travail recommandee :

- `galsenai/wolof_tts`

Role dans Stockman :

- sortie vocale guidee ;
- messages de confirmation ;
- aide contextuelle ;
- formulaires lus a voix haute.

### STT

But :

- comprendre la parole du commercant ;
- reconnaitre des commandes courtes ;
- alimenter une phase de confirmation avant execution.

Base de travail recommandee :

- `galsenai/wolof-audio-data`

Role dans Stockman :

- recherche vocale produit ;
- commandes vocales simples ;
- validation d'actions rapides.

### Commandes vocales courtes

But :

- declencher vite des actions connues et fermees ;
- rester robuste meme en environnement bruyant.

Base de travail recommandee :

- `galsenai/waxal_dataset`

Role dans Stockman :

- commandes courtes offline ;
- raccourcis vocaux terrain ;
- reveil vocal ou actions de navigation simples.

## Architecture fonctionnelle cible

Le pipeline recommande est le suivant :

1. L'application produit un texte metier interne.
2. Une couche de reformulation convertit ce texte en phrase orale claire.
3. Le moteur TTS genere la sortie vocale en wolof.
4. Le commercant parle dans l'application.
5. Le moteur STT convertit l'audio en texte.
6. Une couche d'intentions mappe le texte vers une action connue.
7. L'application relit ou reformule l'action comprise.
8. Le commercant confirme.
9. L'action metier est executee.

## Regles produit obligatoires

- Ne jamais lire brut les labels UI, les cles techniques ou les acronymes.
- Toujours reformuler les messages pour l'oral.
- Toujours confirmer les actions sensibles avant execution.
- Toujours garder une alternative tactile visible.
- Toujours journaliser la commande reconnue, la confiance et l'action finale.
- Ne jamais bloquer un flux metier critique si la voix echoue.

## Bibliotheque orale a preparer

Avant tout moteur vocal, Stockman devra disposer d'une bibliotheque de messages oraux metier.

Cette bibliotheque devra couvrir :

- salut et demarrage ;
- confirmation ;
- erreur ;
- ambiguite ;
- resultats de recherche ;
- total de vente ;
- quantite en stock ;
- dette client ;
- succes et echec d'action.

Exigence :

- le texte affiche et le texte lu ne doivent pas etre obligatoirement identiques ;
- la version lue doit etre plus simple, plus orale et plus explicite.

## Commandes a supporter

### V1

- ouvrir la caisse ;
- ouvrir le stock ;
- chercher un produit ;
- ajouter du stock ;
- retirer du stock ;
- enregistrer la vente ;
- imprimer le recu ;
- voir les dettes ;
- annuler ;
- confirmer.

### V2

- ajoute 5 boites de paracetamol ;
- retire 2 unites ;
- encaisse en especes ;
- ouvre l'historique du produit ;
- montre les produits en rupture ;
- retrouve le client par nom ou numero.

### V3

- parcours semi-libres plus longs ;
- creation guidee de produit ;
- creation guidee de client ;
- vente guidee de bout en bout.

## Online vs offline

### Online au debut

Avantages :

- meilleure qualite initiale ;
- iteration plus rapide ;
- observabilite plus simple ;
- moins de contraintes sur la taille des modeles.

Limites :

- dependance au reseau ;
- cout serveur ;
- latence variable.

### Offline ensuite

Avantages :

- utile sur le terrain ;
- meilleure resilience en faible connectivite ;
- meilleure confidentialite locale.

Limites :

- qualite souvent inferieure ;
- integration mobile plus complexe ;
- besoin de modeles compacts et optimises.

### Strategie recommandee

- TTS : online d'abord ;
- STT commandes courtes : online d'abord puis offline partiel ;
- mots-cles critiques : offline des que possible ;
- conversation plus libre : online tant que la qualite locale n'est pas suffisante.

## Ordre de developpement recommande

### Phase 1 - Sortie vocale uniquement

Objectif :

- faire parler Stockman sans encore comprendre la voix de l'utilisateur.

Livrables :

- bibliotheque de messages metier ;
- bouton d'ecoute sur les ecrans prioritaires ;
- TTS sur POS et Stock ;
- tests de prononciation sur montants, unites et produits.

### Phase 2 - Commandes vocales fermees

Objectif :

- reconnaitre 10 a 20 commandes courtes, a forte valeur terrain.

Livrables :

- capture micro ;
- STT ;
- mapping d'intentions ;
- ecran de confirmation avant execution ;
- journal des commandes reconnues.

### Phase 3 - Recherche vocale produit

Objectif :

- retrouver un produit sans saisie clavier.

Livrables :

- recherche par nom parle ;
- gestion des homophones et variantes ;
- reformulation et confirmation vocale.

### Phase 4 - Parcours guides

Objectif :

- guider oralement un flux complet.

Livrables :

- ajout de stock guide ;
- vente guidee ;
- ajout client guide ;
- note CRM guidee.

### Phase 5 - Offline partiel

Objectif :

- rendre les usages critiques plus resilients.

Livrables :

- cache local des audios frequents ;
- commandes courtes offline ;
- file d'attente et reprise au retour du reseau ;
- mesure de performance sur appareils reels.

## Modules a prioriser

Ordre recommande :

1. POS
2. Stock
3. CRM
4. Dashboard
5. Autres modules

## Risques principaux

- accent ou prosodie insuffisamment credibles ;
- mauvaise lecture des montants et des unites ;
- erreurs STT en environnement bruyant ;
- confusion entre wolof, francais et noms commerciaux ;
- manque de confiance des commercants si la voix parait artificielle ;
- tentation de viser trop vite une conversation libre.

## Indicateurs de succes

- temps moyen pour conclure une vente guidee ;
- taux de comprehension des messages vocaux ;
- taux de reconnaissance correcte des commandes ;
- taux de confirmation avant action ;
- taux d'abandon d'un flux vocal ;
- satisfaction terrain des commercants testes.

## Regle RAG et centre d'aide

Tant que cette feuille de route n'est pas implementee en production :

- le centre d'aide ne doit pas presenter l'assistant vocal wolof comme disponible ;
- le RAG de l'IA doit le presenter comme une piste de travail ou une feuille de route ;
- toute reponse utilisateur doit expliciter qu'il s'agit d'un projet cible et non d'une fonctionnalite deja livree.

## References externes a suivre

- `https://huggingface.co/datasets/galsenai/wolof_tts`
- `https://huggingface.co/datasets/galsenai/wolof-audio-data`
- `https://huggingface.co/datasets/galsenai/waxal_dataset`
- `https://huggingface.co/galsenai/datasets`

