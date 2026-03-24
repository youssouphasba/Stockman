# Guide — Affichage Cuisine (KDS)

## 1. Rôle du module

L'affichage cuisine est un écran temps réel conçu pour la brigade en cuisine. Il affiche les commandes envoyées depuis le POS sous forme de tickets, avec suivi item par item, détection d'urgence, filtrage par station et alerte sonore.

**Profils concernés** : cuisinier, chef de cuisine.

## 2. Accès

Barre latérale → **Cuisine** (visible pour les comptes de type restaurant).

## 3. Lecture de l'écran

### En-tête
- **Icône** : ChefHat (primary).
- **Titre** : « Affichage Cuisine ».
- **Compteur** : « X commande(s) en attente ».
- **Badge urgent** : nombre de commandes en dépassement (> 15 minutes), en rose.
- **Horodatage** : dernière actualisation.
- **Bouton Actualiser** : recharge manuelle.

### Onglets par station (5 filtres)

| Station | Icône | Mots-clés reconnus |
|---------|-------|---------------------|
| Tout | ChefHat | Aucun filtre |
| Entrées | Salad | entrée, salade, starter |
| Plats | Beef | plat, principal, viande, poisson, pasta, grill |
| Desserts | Utensils | dessert, gâteau, glace, sucré |
| Boissons | Coffee | boisson, bière, vin, eau, jus, café, cocktail |

### Tickets de commande (grille 1-4 colonnes)

Chaque ticket est une carte contenant :

#### En-tête du ticket

| Élément | Description |
|---------|-------------|
| Nom de la table | Ou « À emporter » si pas de table |
| Couverts | Nombre de convives |
| Timer live | Compteur MM:SS en temps réel |
| Badge Urgent | Apparaît si > 15 minutes (avec animation pulse) |
| ID ticket | 6 derniers caractères de l'identifiant |
| Notes | Encart ambre avec notes de la commande |

#### Code couleur des bordures de ticket

| État | Bordure | Ombre |
|------|---------|-------|
| Normal | Blanc/10 | Aucune |
| Urgent (> 15 min) | Rose/70 | Rouge pulsant |
| Tout prêt | Vert/60 | Vert subtil |

#### Liste des articles

Chaque article affiche :
- **Checkbox ronde** : cliquer pour marquer prêt (remplie en vert).
- **Nom du produit** : barré si prêt.
- **Quantité** : ×N.
- **Badge station** : pastille colorée (entrées=vert, plats=orange, desserts=rose, boissons=bleu).
- **Notes d'article** : en ambre italique.

#### Pied du ticket

| État | Affichage |
|------|-----------|
| Partiellement prêt | « X/Y articles prêts » + lien « Marquer servi quand même » |
| Tout prêt | Bandeau vert « Prêt à servir » + bouton « Servi » |

### Alerte sonore
Lorsque de nouvelles commandes arrivent pendant l'utilisation, un son (double bip 800→1000 Hz) alerte la cuisine.

### Rafraîchissement automatique
Les tickets se rechargent automatiquement toutes les **15 secondes** (silencieux).

## 4. Boutons et actions

| Action | Cible | Effet |
|--------|-------|-------|
| Checkbox article | Article du ticket | Marque l'article comme prêt (API + optimistic update) |
| Servi | Ticket complet | Retire le ticket de l'affichage (API /serve) |
| Marquer servi quand même | Ticket partiel | Force le marquage même si tous les articles ne sont pas prêts |
| Onglet station | En-tête | Filtre les tickets par station |

## 5. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Quand un ticket devient-il urgent ? | Après 15 minutes sans être servi. La bordure pulse en rouge. |
| Comment gérer les stations ? | Les stations sont détectées automatiquement à partir du nom du produit ou de la station assignée. |
| Le son d'alerte fonctionne-t-il toujours ? | Il nécessite que le navigateur ait autorisé l'audio. Le premier clic sur la page l'active. |

## 6. Guide rapide intégré

1. **Affichage Cuisine** — Suivez les commandes en temps réel.
2. **Cochez** — Marquez chaque article comme prêt quand il est terminé.
3. **Urgences** — Les tickets > 15 minutes clignotent en rouge.
4. **Servi** — Validez la sortie quand tout est prêt.
