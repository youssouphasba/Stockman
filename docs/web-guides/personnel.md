# Guide - Personnel

## 1. Role du module

Le module Personnel permet de gerer les acces a l'equipe : creation de sous-utilisateurs, attribution de roles, permissions par module, boutiques assignees et partage des acces via WhatsApp.

Profils concernes : administrateur ou utilisateur ayant la permission `staff`.

## 2. Acces

Barre laterale -> **Personnel**.

## 3. Regles importantes

- `Starter` : aucun sous-utilisateur supplementaire. Le compte principal reste l'unique utilisateur de l'organisation.
- `Pro` et `Enterprise` : creation d'employes autorisee selon la limite du plan.
- Les acces sont rattaches au meme compte entreprise : un employe rejoint l'organisation existante, il ne cree pas une nouvelle boutique.

## 4. Lecture de l'ecran

### En-tete

- Titre : `Gestion de l'equipe`
- Sous-titre : rappel sur la gestion des acces et des permissions
- Bouton `Ajouter un employe` : visible seulement si le plan et les permissions autorisent la creation

Si le compte est en `Starter`, un bandeau rappelle qu'il faut passer a `Pro` ou `Enterprise` pour ajouter un employe.

### Liste des employes

Chaque carte affiche :

- le nom ;
- l'email ;
- le nombre de boutiques assignees ;
- les droits eleves du compte si necessaire ;
- les permissions principales ;
- les actions `WhatsApp`, `Modifier` et `Supprimer`.

### Modal Ajouter / Modifier

Le formulaire permet de renseigner :

- nom complet ;
- email ;
- mot de passe initial lors de la creation ;
- role modele si besoin ;
- permissions par module ;
- boutiques autorisees ;
- droits de gestion avances.

## 5. Invitation et connexion

Lors de la creation d'un employe, Stockman peut partager un message WhatsApp avec :

- l'email de connexion ;
- le mot de passe initial defini a la creation ;
- un lien mobile pour ouvrir ou telecharger l'application ;
- un lien web de secours.

Important :

- le mot de passe initial est disponible seulement au moment de la creation ;
- si l'on repartage plus tard l'invitation depuis la liste, le mot de passe n'est plus revele ;
- dans ce cas, il faut redefinir un mot de passe si l'employe ne l'a plus.

## 6. Permissions et boutiques

Les permissions peuvent etre reglees :

- par module ;
- par niveau d'acces ;
- par boutique quand l'organisation en gere plusieurs.

Cela permet par exemple :

- un caissier sur une seule boutique ;
- un gestionnaire stock sur plusieurs boutiques ;
- un responsable operation avec droits elargis ;
- un admin facturation sans acces complet aux operations.

## 7. Actions disponibles

| Action | Effet |
|---|---|
| Ajouter un employe | Ouvre la creation d'un sous-utilisateur |
| Envoyer via WhatsApp | Partage les informations de connexion et les liens utiles |
| Modifier | Met a jour les droits, boutiques et informations de l'employe |
| Supprimer | Retire l'employe de l'organisation apres confirmation |

## 8. Questions frequentes

| Question | Reponse |
|---|---|
| Pourquoi je ne vois pas le bouton Ajouter un employe ? | Soit vous n'avez pas la permission `staff`, soit votre plan `Starter` ne permet pas d'ajouter de sous-utilisateur. |
| Un employe peut-il se connecter tout de suite ? | Oui, s'il utilise l'email et le mot de passe initial recus lors de la creation. |
| Peut-on limiter un employe a certaines boutiques ? | Oui, l'affectation par boutique est prevue dans le formulaire. |
| Pourquoi le mot de passe n'apparait plus quand je repartage l'invitation ? | Par securite, le mot de passe initial n'est affiche qu'au moment de la creation. |
