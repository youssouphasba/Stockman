# Guide — Centre de Notifications

## 1. Rôle du module

Le centre de notifications est un panneau latéral qui affiche les messages envoyés par l'administration (broadcasts, annonces, messages individuels). L'utilisateur peut marquer chaque notification comme lue.

**Profils concernés** : tous les utilisateurs.

## 2. Accès

Icône cloche (🔔) dans la barre supérieure → ouvre le panneau latéral droit.

## 3. Lecture de l'écran

### En-tête du panneau
- **Titre** : « Notifications ».
- **Badge non lues** : nombre de notifications non lues (rose).
- **Bouton** : « Tout marquer comme lu » (visible si non lues > 0).
- **Bouton fermer** (✕).

### Liste des notifications

Chaque notification est un bloc cliquable :

| Élément | Description |
|---------|-------------|
| Point bleu | Indicateur de notification non lue (primary, rond plein) |
| Titre | Titre de la notification (gras, tronqué) |
| Contenu | Corps du message (2 lignes max, coupé) |
| Date / heure | Horodatage complet |
| Expéditeur | Nom de l'émetteur |

### Comportement de lecture
- **Clic sur une notification non lue** → la marque comme lue (API).
- **Notifications lues** → opacité réduite, sans point bleu, non cliquables.

### Rafraîchissement
- Rechargement automatique toutes les **60 secondes** quand le panneau est ouvert.
- Le compteur de non-lues est remonté au composant parent via `onUnreadChange`.

## 4. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Aucune notification | Icône Bell grise + texte |
| Notifications présentes | Liste scrollable |

## 5. Questions fréquentes

| Question | Réponse |
|----------|---------|
| D'où viennent les notifications ? | Elles sont envoyées par l'administration via le module Broadcast du backoffice. |
| Puis-je supprimer une notification ? | Non, vous pouvez uniquement la marquer comme lue. |
| Le compteur se met-il à jour en temps réel ? | Il se rafraîchit automatiquement toutes les 60 secondes. |

## 6. Guide rapide intégré

1. **Notifications** — Consultez les messages de l'administration.
2. **Non lues** — Les notifications non lues ont un point bleu.
3. **Marquer comme lu** — Cliquez sur une notification ou utilisez « Tout marquer ».
