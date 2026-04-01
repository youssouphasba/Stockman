# Base de Connaissances Stockman — Guide Complet pour l'Assistant IA

Ce document est la référence principale de l'assistant IA. Il couvre toutes les fonctionnalités de l'application Stockman avec des procédures étape par étape, des réponses aux questions fréquentes et des précisions techniques.

---

## 1. Importation de Produits (CSV / Excel)

### Comment importer des produits ?
L'importation permet d'ajouter des centaines de produits en masse depuis un fichier CSV ou Excel, sans les saisir un par un.

**Étapes :**
1. Aller dans l'onglet **Produits**
2. Appuyer sur le bouton **Importer** (icône nuage ou flèche vers le haut)
3. Sélectionner votre fichier CSV ou Excel (taille max : 5 Mo)
4. L'IA analyse automatiquement les colonnes et suggère un mapping (ex. : colonne "Prix Achat" → champ `purchase_price`)
5. Vérifier et ajuster le mapping des colonnes si nécessaire
6. Les champs **obligatoires** sont : `name` (nom du produit)
7. Les champs **optionnels** sont : `sku`, `quantity`, `purchase_price`, `selling_price`, `description`, `unit`, `min_stock`, `category_id`
8. Cliquer sur **Lancer l'importation**
9. Un résumé affiche le nombre de produits importés et les erreurs éventuelles

**Formats acceptés :** CSV (virgule `,` ou point-virgule `;`), Excel (.xls, .xlsx)
**Encodages supportés :** UTF-8, UTF-8 BOM, Latin-1, CP1252 (les accents français sont gérés automatiquement)

**Noms de colonnes reconnus automatiquement :**
- Nom du produit : `name`, `NOM`, `Désignation`, `Désignation Article`
- SKU / Référence : `sku`, `SKU`, `Référence`, `Ref #`
- Quantité : `quantity`, `stock`, `QTE`
- Prix d'achat : `purchase_price`, `prix_achat`, `Prix Achat`
- Prix de vente : `selling_price`, `prix_vente`, `Prix Vente`
- Unité : `unit`
- Stock minimum : `min_stock`

**Règles de validation :**
- Les prix négatifs sont refusés
- Les quantités négatives sont refusées
- Les prix supérieurs à 999 999 999 sont refusés
- Une ligne avec un nom manquant est ignorée (erreur signalée)
- Un mouvement de stock initial est automatiquement créé pour chaque produit importé avec une quantité > 0

**Erreurs courantes et solutions :**
- "Nom du produit manquant" → vérifier que la colonne nom est bien mappée
- "Fichier trop volumineux" → réduire le fichier à moins de 5 Mo
- "Type de fichier non autorisé" → utiliser uniquement CSV ou Excel
- Caractères spéciaux (é, à, ç) mal affichés → sauvegarder le fichier en UTF-8 depuis Excel

---

## 2. Gestion des Produits & Inventaire

### Comment ajouter un produit ?
1. Aller dans **Produits** → bouton **+** ou **Ajouter**
2. Remplir : Nom (obligatoire), Prix d'achat, Prix de vente, Quantité, SKU (code-barres), Catégorie, Stock minimum, Unité
3. Sauvegarder

### Comment modifier le stock d'un produit ?
- **Entrée de stock** (réception de marchandise) : bouton **+** ou "Entrée" sur la fiche produit
- **Sortie de stock** (perte, casse, correction) : bouton **-** ou "Sortie" sur la fiche produit
- Chaque mouvement est tracé dans l'historique avec la date, la raison et l'utilisateur

### Comment lire les badges de stock ?
- **Rouge** : Rupture de stock (quantité = 0)
- **Orange** : Stock bas (quantité ≤ seuil minimum défini)
- **Bleu** : Surstock (stock anormalement élevé)
- **Vert** : Stock normal

### Comment exporter l'inventaire ?
- Depuis **Produits** → bouton **Exporter**
- Formats disponibles : PDF (avec QR Codes pour l'étiquetage), Excel
- L'export contient tous les produits avec leur prix, quantité, catégorie

### Comment générer une étiquette QR Code ?
- Sur la fiche d'un produit → bouton **Étiquette**
- Un PDF est généré avec le QR Code, le nom et le prix du produit, prêt à imprimer

### Comment organiser les catégories ?
- Dans **Produits** → icône engrenage (paramètres)
- Créer, modifier ou supprimer des catégories
- Les catégories s'affichent comme des filtres colorés en haut de la liste

---

## 3. Caisse (Point de Vente / POS)

### Comment faire une vente ?
1. Aller dans l'onglet **Caisse** (ou POS)
2. Scanner le code-barres d'un article ou le rechercher dans la liste
3. Ajuster la quantité avec les boutons **+** / **-**
4. (Optionnel) Associer un client pour qu'il cumule des points de fidélité
5. Choisir le mode de paiement : Espèces, Mobile Money, Carte, Crédit
6. Valider la vente → le stock est automatiquement mis à jour
7. Imprimer le ticket ou l'envoyer par WhatsApp/Email

### Comment annuler ou retourner une vente ?
- Chercher la vente dans **Activité** ou **Comptabilité**
- Utiliser la fonction de retour/annulation disponible sur la vente

### Quels modes de paiement sont disponibles ?
- Espèces
- Mobile Money (Orange Money, Wave, MTN, etc.)
- Carte bancaire
- Crédit (vente à crédit / dette client)

### Comment ajouter un client rapidement lors d'une vente ?
- Dans la caisse, cliquer sur **Ajouter client** ou icône personne
- Saisir le nom et le numéro de téléphone → client créé en 2 secondes

---

## 4. Alertes de Stock

### Comment configurer des alertes ?
1. Aller dans **Alertes** → **Configuration** ou icône engrenage
2. Définir des règles : alerter quand stock < X unités, rupture, produit dormant (pas vendu depuis X jours)
3. Activer les notifications push dans **Paramètres** pour recevoir des alertes en temps réel

### Types d'alertes disponibles :
- **Stock bas** : quantité en dessous du seuil minimum
- **Rupture de stock** : quantité = 0
- **Produit dormant** : aucune vente depuis une période configurable
- **Péremption** : produits avec date d'expiration dans les 30 prochains jours

### Comment gérer les alertes ?
- Marquer une alerte comme lue une fois traitée
- Supprimer les alertes résolues
- Filtrer par type d'alerte

---

## 5. Commandes Fournisseurs

### Comment créer une commande fournisseur ?
1. Aller dans **Fournisseurs** → **Commandes**
2. Sélectionner un fournisseur
3. Ajouter les produits à commander avec les quantités
4. Valider la commande (statut : En attente)

### Comment valider la réception d'une commande ?
1. Dans **Commandes**, trouver la commande livrée
2. Cliquer sur **Valider la réception**
3. Le stock est automatiquement incrémenté des quantités reçues

### Statuts des commandes :
- **En attente** : commande créée, pas encore expédiée
- **Expédiée** : en cours de livraison
- **Livrée / Réceptionnée** : marchandise reçue, stock mis à jour

---

## 6. Marketplace (Plan Pro & Enterprise)

### Qu'est-ce que la Marketplace ?
La Marketplace connecte les commerçants à un réseau de fournisseurs vérifiés. Les commerçants peuvent commander directement depuis le catalogue des fournisseurs.

### Comment commander sur la Marketplace ?
1. Aller dans **Fournisseurs** → **Marketplace Pro**
2. Parcourir le catalogue des fournisseurs
3. Ajouter des produits au panier
4. Confirmer la commande → le fournisseur reçoit une notification

### Que se passe-t-il après la réception d'une commande Marketplace ?
- Les produits commandés sont automatiquement créés dans votre inventaire (s'ils sont nouveaux) ou leur quantité est mise à jour (s'ils existent déjà)
- Le système suggère un prix de vente basé sur le prix d'achat fournisseur et un coefficient de marge configurable

---

## 7. Comptabilité & Analyse Financière

### Comment accéder à la comptabilité ?
- Aller dans l'onglet **Comptabilité** (web) ou **Bilan** (mobile)

### Que signifient les indicateurs financiers ?
- **Chiffre d'Affaires (CA)** : Total des ventes encaissées sur la période
- **COGS** (Coût des Marchandises Vendues) : Coût d'achat total des produits vendus
- **Bénéfice Brut** : CA - COGS
- **Dépenses** : Charges diverses saisies manuellement (loyer, salaires, électricité, etc.)
- **Bénéfice Net** : Bénéfice Brut - Dépenses

### Comment filtrer par période ?
- Boutons en haut : Aujourd'hui, Cette semaine, Ce mois, Personnalisé (choisir les dates)

### Comment exporter les rapports financiers ?
- Bouton **Exporter** → PDF ou Excel
- Le rapport inclut le CA, les ventes par produit, les dépenses, le bénéfice net

### Comment créer une facture ?
- Dans **Comptabilité** → **Factures** → **Nouvelle facture**
- Sélectionner un client, ajouter les produits, appliquer la TVA si nécessaire
- Générer et envoyer le PDF directement au client

### Graphiques disponibles :
- **Modes de paiement** : camembert montrant la répartition Espèces/Mobile Money/Carte/Crédit
- **Ventes quotidiennes** : courbe d'évolution du CA sur la période sélectionnée
- **Produits les plus vendus** : classement des meilleurs articles

---

## 8. CRM & Fidélité Client

### Comment ajouter un client ?
1. Aller dans **Clients** (CRM)
2. Bouton **+** → remplir : Nom, Téléphone, Email (optionnel), Anniversaire (optionnel)
3. Sauvegarder

### Comment fonctionne le système de fidélité ?
- Les points sont calculés automatiquement à chaque achat
- Le montant de points par achat est configurable (ex. : 1 point = 100 FCFA achetés)
- Des paliers de récompense peuvent être configurés (ex. : 100 points = réduction de 500 FCFA)
- Les points s'accumulent sur le profil client automatiquement

### Comment configurer les règles de fidélité ?
- Dans **Paramètres** → **Fidélité**
- Définir le taux de conversion (ex. : 1 point par 1000 FCFA)
- Définir les paliers de récompense

### Comment gérer les dettes clients ?
- Fiche client → **Dettes & Crédits**
- "Ajouter une dette" : le commerçant avance de l'argent ou des marchandises au client
- "Enregistrer un paiement" : le client rembourse (partiellement ou totalement)
- L'historique complet des dettes est conservé

### Comment envoyer une campagne marketing ?
- Dans **CRM** → **Campagnes**
- Créer une campagne SMS ou Email
- Sélectionner les clients cibles (tous, par segment, par fidélité)
- Envoyer une promotion, une annonce ou une relance

### Comment contacter un client via WhatsApp ?
- Sur la fiche client → icône WhatsApp → le message s'ouvre directement dans WhatsApp

---

## 9. Gestion du Personnel & Permissions

### Comment ajouter un employé ?
1. Aller dans **Utilisateurs** ou **Personnel**
2. Bouton **+** → remplir : Nom, Email, Mot de passe temporaire
3. Définir les permissions par module
4. Partager les identifiants par WhatsApp (bouton dédié)

### Comment fonctionnent les permissions ?
Chaque module a 3 niveaux d'accès :
- **Aucun** : l'employé ne voit pas ce module
- **Lecture** : l'employé peut consulter mais pas modifier
- **Écriture** : l'employé peut créer, modifier et supprimer

Modules configurables : Produits, Caisse, Comptabilité, CRM, Fournisseurs, Personnel, Alertes

### Quels sont les rôles disponibles ?
- **Propriétaire (Shopkeeper)** : accès total illimité à tout
- **Employé (Staff)** : accès limité selon les permissions définies par le propriétaire
- **Manager** : employé avec la permission "Personnel: Écriture" — il peut créer et gérer d'autres employés, mais ne peut pas modifier le propriétaire

### Combien d'employés peut-on ajouter ?
- **Plan Starter** : 1 employé supplémentaire
- **Plan Pro** : 5 employés supplémentaires
- **Plan Enterprise** : employés illimités

### Comment partager les identifiants d'un employé ?
- Sur la fiche de l'employé → bouton **Partager par WhatsApp**
- Les identifiants (email + mot de passe temporaire) sont envoyés directement

---

## 10. Multi-Boutiques

### Comment gérer plusieurs boutiques ?
- **Plan Starter** : 1 boutique
- **Plan Pro** : jusqu'à 2 boutiques
- **Plan Enterprise** : boutiques illimitées

### Comment basculer entre les boutiques ?
- Sur le tableau de bord → sélecteur de boutique en haut à droite (ou en haut de page)
- Chaque boutique a son propre stock, ses propres ventes et ses propres données

### Comment créer une nouvelle boutique ?
- **Paramètres** → **Boutiques** → **Ajouter une boutique**
- Remplir : Nom, Adresse, Numéro de téléphone

---

## 11. Tableau de Bord (Dashboard)

### Que montre le tableau de bord ?
- **Chiffre d'Affaires** du jour et du mois
- **Nombre de produits** dans l'inventaire
- **Valeur du stock** (coût total du stock disponible)
- **Santé du stock** : produits en rupture, en stock bas, en surstock
- **Alertes de péremption** : produits expirant dans les 30 prochains jours
- **Suggestions de réapprovisionnement** : produits à commander en priorité basé sur la vélocité des ventes

### Comment accéder aux statistiques détaillées ?
- Boutons en bas du tableau de bord : **Graphiques** et **Historique des mouvements**

---

## 12. Flux d'Activité (Journal)

### À quoi sert le journal d'activité ?
Il trace toutes les actions effectuées dans la boutique : ventes, mouvements de stock, modifications de produits, connexions des employés.

### Comment filtrer l'activité ?
- Par module : Stock, Caisse, CRM, Comptabilité
- Par utilisateur : voir les actions d'un employé spécifique
- Par date

---

## 13. Paramètres de l'Application

### Comment changer de langue ?
- **Paramètres** → **Langue** → choisir parmi les 15 langues disponibles

### Comment activer le mode sombre ?
- **Paramètres** → **Thème** → basculer entre Clair et Sombre

### Comment activer/désactiver des modules ?
- **Paramètres** → **Modules actifs**
- Cocher ou décocher : CRM, Comptabilité, Fournisseurs, Marketplace, etc.

### Comment configurer les notifications push ?
- **Paramètres** → **Notifications**
- Activer les alertes pour : stock bas, rupture, produits dormants

### Comment changer le mot de passe ?
- **Paramètres** → **Sécurité** → **Changer le mot de passe**

---

## 14. Plans & Abonnements

### Note backoffice admin (stabilite abonnements)
- Dans l'onglet **Abonnements** du backoffice, si le MRR n'est pas encore fourni par l'API, l'interface affiche `-`.
- Si un compte n'a pas de liens de paiement, l'interface affiche `Stripe: —` et `Mobile Money: —` sans erreur.

### Quels sont les plans disponibles ?
| Plan | Prix FCFA/mois | Prix EUR/mois | Boutiques | Employés | Web |
|------|----------------|---------------|-----------|----------|-----|
| Starter | 2 500 | 6,99 | 1 | 1 | Non |
| Pro | 4 900 | 9,99 | 2 | 5 | Non |
| Enterprise | 9 900 | 14,99 | Illimitées | Illimités | Oui |

### Comment mettre à niveau son abonnement ?
- **Paramètres** → **Abonnement** → **Changer de plan**
- Paiement via Mobile Money (Orange Money, Wave, MTN) ou carte bancaire

---

## 15. Interface Fournisseur (Portail Supplier)

### Qu'est-ce que le portail fournisseur ?
Les fournisseurs ont leur propre interface dédiée pour gérer leur catalogue et leurs commandes.

### Fonctionnalités du portail fournisseur :
- **Dashboard** : KPIs (CA total, commandes reçues, panier moyen, note des clients)
- **Catalogue** : ajouter/modifier des produits avec prix et disponibilité
- **Commandes reçues** : accepter, refuser, marquer comme expédiée
- **Paramètres** : profil fournisseur, zones de livraison, montant minimum de commande

---

## 16. Scanning de Code-Barres

### Comment scanner un code-barres ?
- Sur mobile : activer la caméra depuis la caisse ou la page produits
- Pointer vers le code-barres — la reconnaissance est automatique
- Si un produit correspond au SKU scanné, il est ajouté au panier ou affiché

### Comment faire un scan en lot (batch scan) ?
- **Inventaire** → **Scan en lot** (Batch Scan)
- Scanner plusieurs articles en séquence pour effectuer un comptage ou une mise à jour rapide du stock
- Utile pour les inventaires physiques

---

## 17. Synchronisation Hors-ligne

### L'application fonctionne-t-elle sans Internet ?
- Oui, en mode hors-ligne limité : les données récentes sont mises en cache
- Les ventes effectuées hors-ligne sont synchronisées automatiquement dès que la connexion est rétablie
- Une bannière orange s'affiche en haut quand l'application est hors-ligne

---

## 18. Questions Fréquentes (FAQ)

**Q: Comment retrouver une vente passée ?**
R: Aller dans **Activité** et filtrer par "Caisse", ou dans **Comptabilité** pour les ventes d'une période.

**Q: Comment savoir quels produits se vendent le mieux ?**
R: **Comptabilité** → graphique **Produits les plus vendus** ou demander à l'IA "Quels sont mes meilleurs produits ?"

**Q: Comment corriger une erreur de stock ?**
R: Aller sur la fiche du produit → **Sortie** (pour retirer du stock) ou **Entrée** (pour en ajouter) avec la raison "Correction".

**Q: Comment supprimer un produit ?**
R: Fiche produit → bouton **Supprimer** (ou trois points → Supprimer). Attention : les ventes passées conservent la trace du produit.

**Q: Comment réinitialiser le mot de passe d'un employé ?**
R: **Utilisateurs** → fiche de l'employé → **Réinitialiser le mot de passe** → partager les nouveaux identifiants.

**Q: Comment voir les mouvements de stock d'un produit spécifique ?**
R: Fiche produit → **Historique** → liste de toutes les entrées/sorties avec date, raison et utilisateur.

**Q: L'IA peut-elle me donner mes statistiques de ventes ?**
R: Oui, l'assistant peut accéder aux données en temps réel. Posez des questions comme : "Quel est mon CA aujourd'hui ?", "Quels produits sont en rupture ?", "Donne-moi mes meilleures ventes du mois".

**Q: Comment configurer un PIN de sécurité ?**
R: **Paramètres** → **Sécurité** → **Configurer le PIN** — le PIN permet un accès rapide sans ressaisir le mot de passe complet.

**Q: Comment imprimer un ticket de caisse ?**
R: Après validation d'une vente, l'écran de confirmation propose : Imprimer, Envoyer par WhatsApp, ou Envoyer par Email.

**Q: Comment voir les produits proches de leur date de péremption ?**
R: **Tableau de bord** → section **Alertes Péremption**, ou **Alertes** → filtre Péremption.
