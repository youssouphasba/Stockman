# Guide — Support

## 1. Rôle du module

Le panneau de support permet aux utilisateurs de créer des tickets d'assistance, de consulter l'historique de leurs échanges et de répondre aux messages de l'équipe Stockman.

**Profils concernés** : tous les utilisateurs.

## 2. Accès

Icône support (💬) dans la barre supérieure ou latérale → ouvre le panneau latéral droit.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Support ».
- **Bouton retour** (en vue détail) : revient à la liste.
- **Bouton fermer** (✕).

### Navigation (2 onglets)

| Onglet | Contenu |
|--------|---------|
| Mes tickets | Liste de tous les tickets créés |
| Nouveau ticket | Formulaire de création |

---

### Vue Liste des tickets

Chaque ticket est une carte cliquable :

| Élément | Description |
|---------|-------------|
| Sujet | Titre du ticket (tronqué) |
| Badge statut | Statut avec code couleur |
| Dernier message | Aperçu du dernier message (préfixé « Support: » si réponse admin) |
| Date | Date de dernière mise à jour |
| Indicateur répondu | Badge vert « Répondu » si l'admin a répondu |

### Statuts des tickets

| Statut | Couleur | Signification |
|--------|---------|---------------|
| Ouvert (open) | Ambre | Ticket en attente de traitement |
| En cours (pending) | Bleu | Ticket pris en charge |
| Résolu (closed/resolved) | Vert | Ticket traité et fermé |

---

### Vue Nouveau ticket

#### Formulaire

| Champ | Type | Obligatoire |
|-------|------|-------------|
| Sujet | Texte | Oui |
| Message | Textarea (5 lignes) | Oui |

Bouton : « Envoyer » (avec spinner pendant l'envoi).

---

### Vue Détail du ticket

#### En-tête
- Sujet du ticket + badge statut.

#### Conversation (type chat)
- **Messages utilisateur** : alignés à droite, fond blanc/5.
- **Messages support** : alignés à gauche, fond primary/10, libellé « Stockman Support ».
- Chaque message : contenu + horodatage.

#### Zone de réponse (si ticket non fermé)
- Champ texte + bouton Envoyer.
- Entrée valide par touche Entrée.

## 4. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment savoir si le support a répondu ? | Un badge vert « Répondu » apparaît sur le ticket dans la liste. |
| Puis-je répondre à un ticket fermé ? | Non, la zone de réponse disparaît pour les tickets résolus/fermés. |
| Combien de temps pour une réponse ? | L'équipe Stockman répond généralement sous 24-48 heures. |

## 5. Guide rapide intégré

1. **Support** — Contactez l'équipe Stockman pour toute question.
2. **Créer un ticket** — Décrivez votre problème avec un sujet et un message clair.
3. **Suivi** — Consultez les réponses et répondez directement depuis le panneau.
