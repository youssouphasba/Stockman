# Guide — Alertes d'Expiration

## 1. Rôle du module

Le module alertes d'expiration surveille les dates limites des produits périssables et alerte l'utilisateur avant qu'ils ne deviennent invendables. Il permet d'agir rapidement : retrait, déstockage ou enregistrement de perte.

**Profils concernés** : shopkeeper, gestionnaire de stock.

## 2. Accès

Barre latérale → **Alertes d'expiration**.

## 3. Lecture de l'écran

### En-tête
- **Icône** : Calendar (rose).
- **Titre** : titre de la page (i18n).
- **Sous-titre** : description du module (i18n).
- **Barre de recherche** : filtrage par nom de produit.

### Cartes d'alerte (grille 1-3 colonnes)

Chaque alerte est une carte contenant :

| Élément | Description |
|---------|-------------|
| Badge statut | Code couleur selon le délai restant (voir tableau ci-dessous) |
| Bouton supprimer | Icône Trash2 — supprime l'alerte de la liste |
| Nom du produit | Titre principal |
| Numéro de lot | Sous-titre (ou « N/A ») |
| Date d'expiration | Date formatée |
| Quantité en stock | Quantité restante avec unité (en rose) |
| Bouton action | « Gérer le retrait » → ouvre la modal de retour |

### Code couleur des alertes

| Délai restant | Couleur badge | Texte |
|---------------|---------------|-------|
| Expiré (< 0 jours) | Rose (rose-400) | « Expiré » |
| < 30 jours | Ambre (amber-400) | « X jours restants » |
| ≥ 30 jours | Vert (emerald-400) | « X jours restants » |

### Modal de retrait (OrderReturnModal)

La modal permet de :
- Visualiser le produit et la quantité concernée.
- Enregistrer un retrait de stock (perte, déstockage, retour fournisseur).
- Confirmer l'opération.

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Rechercher | En-tête | Filtre les alertes par nom de produit |
| Supprimer (🗑) | Carte alerte | Retire l'alerte de la liste locale |
| Gérer le retrait (→) | Carte alerte | Ouvre la modal OrderReturnModal pour traiter le retrait |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Aucune alerte | Icône History verte + « Aucune alerte d'expiration » + message encourageant |
| Liste des alertes | Grille de cartes triées par urgence |

## 6. Cas d'utilisation

| Scénario | Action recommandée |
|----------|--------------------|
| Produit expiré dans 5 jours | Lancez une promotion rapide ou un retrait |
| Produit déjà expiré | Gérez le retrait immédiatement pour comptabiliser la perte |
| Aucun produit à risque | Consultez régulièrement pour anticiper |

## 7. Questions fréquentes

| Question | Réponse |
|----------|---------|
| D'où viennent les dates d'expiration ? | Elles sont renseignées lors de la réception ou de la saisie du produit dans le stock. |
| Puis-je ignorer une alerte ? | Oui, en cliquant sur l'icône corbeille, mais le produit reste en stock. |
| Le retrait met-il à jour le stock automatiquement ? | Oui, la modal de retrait ajuste les quantités et enregistre l'opération. |

## 8. Guide rapide intégré

1. **Alertes d'expiration** — Surveillez les dates limites de vos produits périssables.
2. **Produits à risque** — Les produits expirant bientôt sont mis en avant avec un code couleur.
3. **Agir** — Gérez le retrait ou enregistrez une perte de stock.
4. **Prévention** — Consultez régulièrement cette liste pour anticiper les pertes.
