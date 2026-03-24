# Guide — Vue Multi-Boutiques

## 1. Rôle du module

Le tableau de bord multi-boutiques offre un benchmark consolidé de toutes les boutiques de l'organisation : KPI agrégés, comparaison par boutique avec barre de performance, et actions rapides de bascule.

**Profils concernés** : admin d'organisation (isOrgAdmin).

## 2. Accès

Barre latérale → **Multi-boutiques** (visible si l'utilisateur gère au moins 2 boutiques).

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Vue Multi-Boutiques ».
- **Sous-titre** : nombre de boutiques et période sélectionnée.
- **Bouton** : « Nouvelle boutique » pour créer un point de vente.

### Cartes KPI (8 indicateurs cliquables)

| KPI | Description | Drill-down |
|-----|-------------|------------|
| Boutiques | Nombre de magasins inclus dans le benchmark | Détail par boutique |
| CA consolidé | Chiffre d'affaires total de toutes les boutiques | Ventilation par boutique |
| Ventes consolidées | Nombre total de tickets sur la période | Ventilation par boutique |
| Stock valorisé | Valeur totale du stock consolidé | Nombre de produits suivis |
| Rotation stock | Ratio sorties / stock valorisé | Détail rotation |
| Stocks bas | Nombre de produits à stock faible | Liste des produits |
| Ruptures | Nombre de produits à zéro stock | Liste des produits |
| Stock dormant | Produits sans vente depuis 30 jours | Liste des produits |

> Chaque KPI est cliquable et ouvre une modal de détail exportable.

### Performance par boutique

Tableau listant chaque boutique avec :

| Colonne | Contenu |
|---------|---------|
| Nom | Nom de la boutique + badge « Active » si c'est la boutique courante |
| Adresse | Adresse du point de vente |
| CA | Chiffre d'affaires (vert) |
| Ventes | Nombre de tickets |
| Panier | Panier moyen |
| Stock | Valeur du stock |
| Rotation | Ratio de rotation |
| Produits | Nombre de références |
| Stock bas | Nombre de produits faibles (ambre si > 0) |
| Ruptures | Nombre de ruptures (rose si > 0) |

- **Barre de progression** : barre horizontale proportionnelle au CA par rapport au meilleur.
- **Marge brute estimée** : affichée sous la barre.
- **Delta ventes** : variation en % par rapport à la période précédente.
- **Bouton Basculer** : change la boutique active.

### Modal — Nouvelle boutique
Formulaire avec :
- Nom de la boutique (obligatoire).
- Adresse (optionnel).
- Boutons : Annuler / Créer la boutique.

### Modal — Détail KPI
Modal affichant le tableau exportable du KPI sélectionné (via AnalyticsKpiDetailsModal).

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Nouvelle boutique | Ouvre la modal de création | Formulaire nom + adresse |
| Basculer | Ligne boutique | Change la boutique active et recharge la page |
| Carte KPI | Clic | Ouvre la modal de détail avec tableau exportable |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Erreur | Bandeau rose avec message d'erreur |
| Aucune boutique | Texte « Aucune boutique trouvée pour cette sélection » |

## 6. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Qui peut voir ce tableau de bord ? | Seuls les administrateurs d'organisation (org_admin). |
| Comment changer de boutique active ? | Cliquez « Basculer » sur la ligne de la boutique souhaitée. La page se recharge. |
| Les KPI sont-ils cliquables ? | Oui, chaque carte KPI ouvre un tableau de détail exportable. |

## 7. Guide rapide intégré

1. **Vue consolidée** — Consultez les performances de toutes vos boutiques.
2. **Comparaison** — Identifiez les boutiques les plus performantes.
3. **Transferts** — Suivez les mouvements de stock entre boutiques.
