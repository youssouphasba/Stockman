# Procurement Enterprise Roadmap

## Objectif

Faire du web Enterprise le centre de pilotage de l'approvisionnement, sans bloquer
les responsables d'appro par boutique.

Le principe produit retenu :

- `mobile` = execution terrain boutique
- `web` = pilotage, comparaison, consolidation, suggestions, validation optionnelle
- chaque boutique peut continuer a travailler seule
- les fonctions avancees du web doivent aider a decider, pas imposer

## Principes non negociables

### 1. Pas de blocage par defaut

Le workflow d'approbation ne doit jamais etre actif par defaut.

Comportement cible :

- une boutique peut creer et envoyer une commande fournisseur sans validation centrale
- l'entreprise peut activer des regles d'approbation si elle le souhaite
- les commandes "normales" continuent de passer sans friction

### 2. Consolidation = vue, pas fusion automatique

La consolidation multi-boutiques ne doit pas transformer les achats de plusieurs
boutiques en une seule commande sans decision humaine.

Comportement cible :

- chaque boutique garde ses besoins, ses commandes, ses fournisseurs et son historique
- le web montre une lecture consolidee
- le siege ou les responsables multi-sites peuvent comparer et coordonner
- l'achat groupe reste une proposition explicite

### 3. Suggestions = assistives, jamais imposees

Les suggestions de reappro et les opportunites d'achat groupe doivent etre des aides :

- `suggestion locale boutique`
- `suggestion consolidee`
- `opportunite d'achat groupe`

Mais jamais une action automatique irreversible sans validation utilisateur.

### 4. Respect de l'organisation reelle

Une entreprise peut avoir :

- un responsable appro par boutique
- un superviseur regional
- une direction achats
- un admin orga

Le systeme doit respecter cette organisation, pas la remplacer.

## Roles cibles

### Roles metier proposes

- `store_procurement_manager`
  - gere les commandes de sa boutique
  - voit uniquement sa boutique ou son scope autorise
- `procurement_supervisor`
  - voit plusieurs boutiques
  - compare et coordonne
  - peut recommander un achat groupe
- `procurement_director`
  - vue consolidee entreprise
  - benchmarking fournisseurs
  - pilotage prix / delais / performance
- `org_admin`
  - configuration des regles, modules, politiques et seuils

### Regle de permission

Ne pas creer un systeme a part si on peut s'appuyer sur l'existant.

Extension recommandee :

- garder la matrice actuelle `suppliers`, `stock`, `accounting`, `staff`
- ajouter un niveau metier pour l'appro si necessaire plus tard
- utiliser d'abord :
  - `suppliers:write` pour creer et gerer les commandes
  - `stock:read/write` pour besoins / reappro / receptions
  - `org_admin` pour configurer les regles d'approbation

## Briques produit a livrer

## Phase 1. Score fournisseur

### But

Donner une note lisible et actionnable par fournisseur.

### KPIs

- delai moyen de livraison
- taux de livraison dans les temps
- taux de livraison complete
- taux d'annulation
- commandes partielles
- variance de prix
- montant achete
- frequence d'achat

### UI web

Dans `Suppliers` :

- cartes KPI par fournisseur
- badge global :
  - `fiable`
  - `a surveiller`
  - `risque`
- historique recent des incidents

### Benefice

Le web devient un vrai outil de decision achat, pas seulement un annuaire.

## Phase 2. Historique des prix d'achat

### But

Permettre de voir si un fournisseur devient plus cher, plus instable ou moins
competitif.

### Vues

- historique par produit
- comparaison fournisseurs pour un meme produit
- prix moyen sur 30j / 90j / 12 mois
- derniere hausse / derniere baisse

### UI web

- sur la fiche fournisseur : section `Historique prix`
- sur la fiche produit : section `Fournisseurs & prix d'achat`
- dans le benchmark : prix actuel + tendance

### Benefice

Le responsable appro peut negocier ou changer de fournisseur sur des donnees
concretes.

## Phase 3. Suggestions locales par boutique

### But

Aider chaque boutique a commander juste ce qu'il faut, sans dependre du siege.

### Regles

Les suggestions doivent rester locales a la boutique active :

- stock faible
- couverture faible
- ventes recentes
- saisonnalite simple plus tard
- delai moyen fournisseur

### UI web

- vue `Appro boutique`
- priorites :
  - rupture imminente
  - sous-stock
  - surstock
- proposition de bon de commande pre-rempli

### Benefice

Chaque responsable appro boutique garde la main et gagne du temps.

## Phase 4. Vue consolidee multi-boutiques

### But

Donner a l'entreprise une lecture groupee sans casser l'autonomie locale.

### Vues

- besoins par boutique
- commandes ouvertes par boutique
- depenses fournisseurs consolidees
- ecarts de prix entre boutiques
- fournisseurs les plus utilises

### Regle produit

La vue consolidee ne modifie rien par elle-meme.

Elle sert a :

- comparer
- coordonner
- detecter les opportunites
- arbitrer

### Benefice

Le web sert de poste de controle entreprise.

## Phase 5. Opportunites d'achat groupe

### But

Detecter quand plusieurs boutiques ont un besoin proche chez le meme fournisseur.

### Fonctionnement

Le systeme propose par exemple :

- boutique A : besoin 10
- boutique B : besoin 15
- boutique C : besoin 8
- opportunite suggeree : commande groupee de 33

### Important

Ce n'est jamais automatique.

Le web doit proposer :

- `garder les commandes separees`
- `preparer un achat groupe`
- `repartir les quantites par boutique`

### Benefice

L'entreprise peut reduire les couts ou negocier mieux, sans forcer les boutiques.

## Phase 6. Workflow d'approbation optionnel

### But

Ajouter du controle quand l'entreprise en a besoin, sans penaliser les structures
plus simples.

### Mode par defaut

- `desactive`

### Modes activables

- approbation au-dessus d'un montant
- approbation pour nouveau fournisseur
- approbation pour commande exceptionnelle
- approbation pour ecart de prix important

### Parcours cible

- la boutique cree la commande
- si aucune regle ne s'applique : envoi normal
- si une regle s'applique : statut `pending_approval`
- un responsable autorise approuve ou rejette

### Regle UX

Il faut que l'utilisateur comprenne clairement :

- pourquoi la commande attend
- qui doit l'approuver
- quel seuil ou quelle regle a declenche l'attente

### Benefice

Le workflow apporte du controle la ou il faut, sans ralentir tout le monde.

## Architecture recommandee

## Source de verite

Garder les commandes au niveau boutique.

Ne pas inventer un objet "groupe" tant qu'on n'en a pas besoin.

### Extensions de donnees recommandees

Pour `supplier_orders` :

- `approval_status`
- `approval_required`
- `approval_reason`
- `approved_by`
- `approved_at`
- `consolidation_candidate_id` optionnel

Pour les analytics achats :

- `supplier_score`
- `on_time_rate`
- `full_delivery_rate`
- `price_variance`
- `avg_lead_time_days`

### Aggregats futurs

- `daily_procurement_by_store`
- `daily_procurement_by_supplier`
- `product_purchase_price_history`
- `supplier_kpis_daily`
- `consolidation_opportunities`

## UX recommandee

## Web

Le web devient l'outil avance :

- scores fournisseur
- benchmarking
- historique prix
- suggestions locales
- vue consolidee
- opportunites d'achat groupe
- approbation optionnelle

## Mobile

Le mobile reste concentre sur :

- creer une commande
- suivre les livraisons
- receptionner
- consulter rapidement les statuts

Le mobile ne doit pas porter toute la complexite de pilotage entreprise.

## Ordre d'implementation recommande

1. `Score fournisseur`
2. `Historique des prix d'achat`
3. `Suggestions locales par boutique`
4. `Vue consolidee multi-boutiques`
5. `Opportunites d'achat groupe`
6. `Workflow d'approbation optionnel`

## Pourquoi cet ordre

- les 2 premiers donnent tout de suite de la valeur decisionnelle
- le 3e aide les boutiques sans dependre du siege
- le 4e et le 5e renforcent le pilotage entreprise
- le 6e ne vient qu'apres, pour ne pas rendre le produit plus lourd trop tot

## Ecrans web cibles

- `Suppliers`
  - score fournisseur
  - historique prix
  - performance / incidents
- `Orders`
  - filtres avancees
  - approbation optionnelle
  - vue par boutique
- `Approvisionnement`
  - suggestions locales
  - opportunites consolidees
- `Multi-store procurement`
  - comparaison boutiques
  - achats groupes

## Questions produit a figer plus tard

- faut-il un module web dedie `Approvisionnement`, ou enrichir `Suppliers` et `Orders` suffit-il ?
- a partir de quel seuil une approbation devient-elle utile ?
- l'achat groupe doit-il creer :
  - une commande mere
  - ou plusieurs commandes boutiques coordonnees
- les responsables boutique peuvent-ils refuser une opportunite d'achat groupe ?

## Conclusion

La bonne direction n'est pas de rendre l'approvisionnement plus rigide.

La bonne direction est :

- plus de visibilite
- plus de comparaison
- plus de coordination
- plus de recommandations
- plus de controle si l'entreprise le demande
- mais sans casser l'autonomie des boutiques

Statut :

- `planifie`
- `non implemente`
- `priorite produit web enterprise`
