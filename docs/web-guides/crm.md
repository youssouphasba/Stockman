# Guide — CRM (Gestion Clients)

## 1. Rôle du module

Le CRM centralise la gestion de la clientèle : fiches client, historique d'achats, gestion de dette, fidélité, promotions, campagnes marketing et analyse clients IA.

**Profils concernés** : shopkeeper, staff, admin (permission `crm` requise).

## 2. Accès

Barre latérale → **CRM**.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Gestion Clients (CRM) ».
- **Boutons** : Campagne, Fidélité (admin), Export XLS/PDF, Nouveau Client.
- **Bandeau sync** (si applicable) : clients et dettes en attente de synchronisation.

### Section Promotions
Carte listant les promotions actives/inactives avec remise %, points requis et actions (activer/désactiver, modifier, supprimer).

### Bannière Anniversaires
Alerte jaune signalant les anniversaires à venir (7 jours) avec envoi rapide de vœux.

### Bannière IA — Churn
Alerte violette indiquant le nombre de clients à risque de désabonnement avec la liste des noms.

### Analytics CRM
- **Vue d'ensemble** : recommandations IA + sélecteur de période (30j, 90j, 1 an) + dates personnalisées.
- **Segments** : cartes cliquables (VIP, Fidèles, Occasionnels, Nouveaux, À risque, Inactifs).

### KPI
| KPI | Description |
|-----|-------------|
| Base clients | Nombre total de clients |
| Rétention | Taux de clients revenant sur la période |
| Panier moyen client | Montant moyen par client |
| Encours dette | Total des dettes ouvertes |
| Croissance | Variation du nombre de clients |

### Liste des clients
Tableau avec filtres (catégorie, palier fidélité, tri), recherche, et pour chaque client : nom, palier (Bronze/Argent/Or/Platine), catégorie, total dépensé, dette courante, actions WhatsApp/détail.

### Détail client (modal)
Trois onglets :
- **Info** : nom, téléphone, email, catégorie, points fidélité, actions rapides (appel, WhatsApp, email, dette).
- **Historique** : journal des opérations de dette (reçus/paiements) avec solde courant et annulation.
- **Achats** : historique des ventes liées au client.

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Nouveau Client | Ouvre modal ajout | Formulaire nom, téléphone, email, catégorie, notes, anniversaire |
| Campagne | Ouvre CampaignModal | Envoi marketing par canal |
| Fidélité | Ouvre LoyaltySettingsModal | Configuration du programme de fidélité |
| Nouvelle promotion | Ouvre PromotionModal | Créer/éditer une offre |
| Export XLS / PDF | Télécharge la liste | Format Excel ou PDF |
| Carte client | Ouvre le détail | Modal avec onglets info/historique/achats |
| Gérer la dette | Ouvre DebtModal | Ajouter/soustraire une dette |
| Annuler paiement | Ligne historique | Annule un remboursement |

## 5. Filtres et recherche

| Filtre | Type | Impact |
|--------|------|--------|
| Recherche | Texte libre | Par nom ou téléphone |
| Catégorie | Sélecteur | Particulier, Revendeur, Professionnel, Elite/VIP |
| Palier fidélité | Sélecteur | Bronze, Argent, Or, Platine |
| Tri | Sélecteur | Par nom, total dépensé |
| Période analytics | Boutons | 30j, 90j, 1 an ou dates personnalisées |

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Liste vide | Icône + texte « Aucun client trouvé » |
| Sync en attente | Bandeau ambre indiquant les opérations en file |

## 7. Cas d'usage typiques

- **Vente à crédit** : ouvrir la fiche client → « Gérer la dette » → sélectionner « Ajout » et saisir le montant.
- **Campagne anniversaire** : voir la bannière → cliquer « Envoyer vœux » → préparer le message.
- **Analyse de rétention** : consulter les KPI analytics → cliquer sur le segment « À risque » pour voir les clients concernés.

## 8. Liens avec les autres modules

| Depuis | Vers | Action |
|--------|------|--------|
| CRM | POS | Sélection de client au moment de la vente |
| CRM | Comptabilité | Les dettes sont comptabilisées |
| CRM | Alertes | Rappels de relance client |

## 9. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment savoir si un client est à risque ? | Consultez la bannière IA churn ou le segment « À risque » dans les analytics. |
| Comment annuler un paiement de dette ? | Dans l'onglet « Historique » du détail client, cliquez sur le bouton annuler. |
| Comment fonctionne la fidélité ? | Les points s'accumulent selon les ventes. Les paliers (Bronze→Platine) sont basés sur le total dépensé. |

## 10. Guide rapide intégré

1. **Bienvenue dans le CRM** — Gérez vos clients, leur fidélité et suivez les dettes.
2. **Ajouter un client** — Cliquez « Nouveau Client » pour créer une fiche.
3. **Segments et analytics** — Analysez votre clientèle grâce aux segments IA et aux KPI.
4. **Promotions** — Créez des offres de fidélisation pour animer votre communauté.
5. **Gestion de dette** — Suivez et gérez les encours de vos clients à crédit.
