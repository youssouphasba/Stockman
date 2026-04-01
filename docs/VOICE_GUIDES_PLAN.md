# Plan des guides vocaux contextuels

## Objectif

Mettre en place un systeme de guides vocaux contextuels dans Stockman, consultables depuis le mobile et le web, et administrables depuis l'admin mobile et l'admin web.

L'objectif est de proposer des explications audio courtes, rattachees a des modules, des ecrans, des cartes KPI, des boutons d'action, des formulaires ou des modales, afin de rendre l'application plus simple a comprendre sur le terrain.

## Vision produit

Le systeme devra permettre :

- d'associer un guide vocal a un module entier ;
- d'associer un guide vocal a un element precis de l'interface ;
- d'importer un fichier audio enregistre depuis un telephone ;
- d'ajouter une transcription texte associee a chaque guide ;
- d'activer ou desactiver un guide sans redeploiement ;
- d'afficher les guides sur mobile et sur le web, selon le contexte ;
- de gerer les guides depuis l'admin mobile et l'admin web.

## Principes fonctionnels

- Les guides vocaux doivent etre courts, clairs et concrets.
- Chaque guide doit expliquer une seule idee principale.
- Chaque guide doit toujours avoir une transcription texte associee.
- L'enregistrement audio se fait de preference sur telephone, puis le fichier est importe dans l'admin.
- Le systeme doit permettre de reutiliser un meme guide sur plusieurs ecrans si besoin.
- L'affichage doit rester discret et contextuel, sans encombrer l'interface.

## Methodologie de construction

Le travail sera mene module par module.

Pour chaque module, il faudra :

1. Lister les cartes KPI, boutons, formulaires, modales et tableaux a couvrir.
2. Classer chaque futur guide en priorite haute, moyenne ou basse.
3. Definir une cle stable de ciblage pour chaque element.
4. Rediger le texte du guide.
5. Associer l'audio importe depuis le telephone.
6. Integrer l'affichage dans les interfaces concernees.

## Vagues de travail

### Vague 1

- Dashboard
- Caisse
- Produits

### Vague 2

- Stock et inventaire
- Comptabilite
- Fournisseurs

### Vague 3

- CRM et clients
- Commandes fournisseurs
- Factures, recus et exports
- Support

### Vague 4

- Parametres
- Abonnement
- Dashboard admin web
- Autres modules specifiques selon les besoins

## Priorisation des guides

### Priorite haute

- KPI sensibles ou complexes ;
- actions critiques ;
- ecrans de creation ou de validation ;
- notions metier difficiles a comprendre ;
- elements qui provoquent frequemment des erreurs d'usage.

### Priorite moyenne

- actions utiles mais non critiques ;
- filtres ;
- selecteurs ;
- tableaux a forte valeur de lecture.

### Priorite basse

- aides secondaires ;
- explications complementaires ;
- elements rarement utilises.

## Modele de donnees cible

Une entite de type `voice_guide` devra au minimum contenir :

- `guide_id`
- `title`
- `scope_type`
- `scope_key`
- `module`
- `screen`
- `language`
- `transcript`
- `audio_url`
- `audio_duration_seconds`
- `is_active`
- `display_mode`
- `sort_order`
- `created_at`
- `updated_at`

Des champs complementaires pourront etre ajoutes ensuite :

- `audience_plan`
- `audience_role`
- `audience_business_type`
- `first_time_only`
- `show_on_mobile`
- `show_on_web`

## Ciblage de l'interface

Le systeme devra pouvoir cibler plusieurs niveaux :

- `module`
- `screen`
- `kpi_card`
- `action`
- `field`
- `modal`
- `table`
- `empty_state`

Exemples de cles :

- `dashboard.net_profit_card`
- `dashboard.expenses_ratio_card`
- `pos.checkout_action`
- `pos.voice_cart_action`
- `products.add_product_action`
- `products.stock_movement_action`

## Administration

### Admin mobile

L'admin mobile devra permettre :

- de creer un guide vocal ;
- d'importer un fichier audio depuis le telephone ;
- de remplacer un audio existant ;
- de modifier le titre, la transcription et la cible ;
- d'activer ou desactiver un guide ;
- de previsualiser le rendu.

### Admin web

L'admin web devra permettre :

- de gerer la bibliotheque complete ;
- de rechercher et filtrer les guides ;
- de modifier en masse les metadonnees ;
- de reorganiser l'ordre d'affichage ;
- d'inspecter rapidement les guides affectes a chaque module.

## Flux d'import audio recommande

1. L'administrateur enregistre l'audio sur son telephone.
2. Il ouvre l'admin mobile ou web.
3. Il cree ou modifie un guide vocal.
4. Il importe le fichier audio.
5. Le backend valide le format et envoie le fichier vers le stockage.
6. Le guide est enregistre avec ses metadonnees et son URL audio.
7. Le guide devient disponible dans les modules cibles.

## Formats audio recommandes

- `m4a` en priorite
- `mp3` en alternative
- audios courts de 15 a 45 secondes
- une seule idee principale par audio

## Composant d'affichage

Un composant reutilisable devra etre prevu pour :

- afficher une icone ou un bouton d'aide vocale ;
- lancer la lecture ;
- afficher la transcription ;
- permettre de fermer ou masquer le guide ;
- etre integre facilement dans une carte KPI, un bouton, un formulaire ou une modale.

## Hors ligne et performance

Une fois la base fonctionnelle en place, il faudra ajouter :

- le cache local des guides les plus consultes ;
- le prechargement des guides critiques ;
- une lecture degradee sur transcription si l'audio n'est pas disponible ;
- des formats compacts pour limiter le poids des telechargements.

## Documentation et accompagnement

Chaque vague implemente devra aussi mettre a jour :

- les guides du produit ;
- le centre d'aide ;
- le RAG de l'IA ;
- les eventuels messages d'onboarding concernes.

## Etapes de mise en oeuvre

1. Valider la liste complete des modules et des elements UI a couvrir, module par module.
2. Classer chaque guide en priorite haute, moyenne ou basse.
3. Definir le modele de donnees des guides vocaux.
4. Concevoir les ecrans d'administration mobile et web.
5. Definir le flux d'import audio depuis le telephone.
6. Creer les endpoints backend.
7. Implementer un composant reutilisable de lecture audio contextuelle.
8. Integrer les guides dans les premiers modules prioritaires.
9. Etendre progressivement aux autres modules.
10. Ajouter ensuite la transcription enrichie, les regles d'affichage contextuel et le cache local.
