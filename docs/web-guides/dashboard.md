# Guide — Dashboard

## 1. Rôle du module

Le Dashboard fournit une vue d'ensemble de l'activité commerciale : chiffre d'affaires, ventes, valeur du stock, prévisions IA et alertes. Il existe en version commerce et en version restaurant.

**Profils concernés** : shopkeeper, staff, admin.

## 2. Accès

Cliquer sur **Dashboard** dans la barre latérale. Aucun prérequis de permission spécifique.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Tableau de bord »
- **Badge anomalies** : apparaît en rouge si l'IA a détecté des anomalies.
- **Bouton Paramètres (⚙)** : ouvre un panneau pour masquer/afficher les sections du Dashboard.
- **Sélecteur de période** : Aujourd'hui, 7 jours, 30 jours, 90 jours.
- **Boutons Export** : XLS et PDF.
- **Bouton « + Vente »** : redirige vers le POS.

### Cartes KPI (mode commerce)
| KPI | Description |
|-----|-------------|
| CA du jour | Chiffre d'affaires réalisé ce jour |
| Ventes du jour | Nombre de transactions |
| Valeur du stock | Valeur totale au coût d'achat |
| CA du mois | Chiffre d'affaires cumulé sur le mois |

### Cartes KPI (mode restaurant)
| KPI | Description |
|-----|-------------|
| CA du jour | Chiffre d'affaires du service |
| Couverts servis | Nombre de couverts |
| Ticket moyen | CA / couverts |
| Tables occupées | Nombre de tables occupées / total + commandes en cuisine |

### Graphiques
- **Prévision IA** : graphique en aire comparant les revenus réels et prédits.
- **Évolution de la valeur du stock** : graphique en aire sur la période sélectionnée.
- **CA par heure** (restaurant) : graphique horaire du chiffre d'affaires du jour.

### Ventes récentes
Tableau des dernières ventes avec référence, nombre d'articles, montant, heure et bouton pour voir le reçu.

### Smart Reminders
Bloc IA affichant les alertes contextuelles : ruptures de stock, stock bas, alertes non lues, surstock, ventes du jour. Un résumé IA est affiché sous les rappels avec un lien « Voir le rapport complet ».

### Distribution du stock
Graphique en donut montrant la répartition par catégorie.

### Statut du stock
Liste des produits en rupture (quantité = 0) et en stock bas (sous le seuil minimum).

## 4. Boutons et actions

| Bouton | Emplacement | Action | Effet |
|--------|-------------|--------|-------|
| ⚙ Paramètres | En-tête, droite | Clic | Ouvre le panneau de visibilité des sections |
| Sélecteur de période | En-tête | Changement | Recharge les données pour la période choisie |
| XLS | En-tête | Clic | Exporte le Dashboard en Excel |
| PDF | En-tête | Clic | Exporte le Dashboard en PDF |
| + Vente / + Commande | En-tête | Clic | Navigue vers le POS |
| Voir le rapport complet | Smart Reminders | Clic | Ouvre le modal AiSummaryModal |
| ↗ (flèche) | Ligne de vente | Clic | Ouvre le reçu numérique (DigitalReceiptModal) |
| Voir plus | Ventes récentes | Clic | Navigue vers le POS |

## 5. Filtres et recherche

- **Période** : filtre global sur les données (1, 7, 30, 90 jours).
- **Sections visibles** : toggle par section (KPI, Prévision, Valeur stock, Ventes récentes, Rappels, Distribution, Statut stock).

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Erreur critique | Carte d'erreur avec bouton « Réessayer » |
| Erreur partielle | Bandeau jaune en haut indiquant les données indisponibles |
| État vide | Texte « Aucune donnée sur cette période » dans les graphiques |
| Données chargées | Affichage complet des sections activées |

## 7. Cas d'usage typiques

- **Ouverture de journée** : le commerçant consulte le Dashboard pour voir le CA de la veille et les alertes de stock.
- **Analyse hebdomadaire** : sélectionner « 7 jours » pour comparer l'activité semaine par semaine.
- **Erreur fréquente** : ne pas comprendre pourquoi certaines sections sont vides → vérifier la période sélectionnée.

## 8. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| Dashboard | POS | Bouton « + Vente » ou « Voir plus » |
| Dashboard | Reçu numérique | Bouton ↗ sur une vente |
| Dashboard | Rapport IA | Lien « Voir le rapport complet » |

## 9. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Pourquoi les prévisions IA sont-elles vides ? | Il faut un historique de ventes suffisant pour générer des prévisions. |
| Puis-je masquer des sections ? | Oui, cliquez sur ⚙ et désactivez les sections souhaitées. |
| Pourquoi le KPI « Anomalies détectées » clignote ? | L'IA a identifié des écarts suspects dans vos données récentes. |

## 10. Guide rapide intégré

1. **Bienvenue sur votre tableau de bord** — Suivez la santé de votre activité en un coup d'œil.
2. **Indicateurs clés (KPI)** — Suivez vos revenus, ventes et valeur du stock en temps réel.
3. **Prévision IA** — Notre IA analyse vos données pour prédire l'activité future.
4. **Rappels intelligents** — Recevez des conseils personnalisés et des rappels d'actions urgentes.
