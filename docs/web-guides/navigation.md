# Guide — Navigation générale

## 1. Rôle du module

La barre latérale (sidebar) est le point d'entrée vers tous les modules de l'application. Elle s'adapte automatiquement au secteur d'activité (commerce, restaurant, production) et aux permissions de l'utilisateur.

**Profils concernés** : tous les utilisateurs connectés.

## 2. Accès

La barre latérale est toujours visible sur écran large (≥ 768 px). Sur mobile, elle s'ouvre via le bouton hamburger en haut à gauche.

### Pré-configuration des comptes Google
- Lors d'une première création de compte via Google sur le web, Stockman peut demander une étape de complétion avant d'ouvrir l'application.
- Cette étape sert à confirmer le pays, la devise, le numéro de téléphone et le secteur d'activité.
- Tant que cette configuration n'est pas terminée, la barre latérale et les modules métiers ne s'affichent pas.

## 3. Lecture de l'écran

### En-tête
- **Logo Stockman** : identifie l'application.
- **Bouton ×** (mobile uniquement) : ferme la sidebar.

### Sélecteur de boutique
- Affiché si l'utilisateur a accès à au moins une boutique.
- Affiche le nom de la boutique active.
- Si plusieurs boutiques sont rattachées, un menu déroulant permet de basculer. Le changement recharge l'application.

### Menu principal
Les entrées affichées dépendent de trois facteurs :
1. **Secteur d'activité** : commerce (défaut), restaurant ou production.
2. **Rôle utilisateur** : shopkeeper, staff, admin, superadmin, supplier.
3. **Permissions effectives** : pos, stock, accounting, crm, suppliers, staff.

#### Commerce (défaut)
Dashboard · POS · Commandes · Finance · Rapports · Stock & Inventaire (sous-menu : Stock, Alertes, Historique stock, Inventaire tournant, Alertes d'expiration, Analyse ABC) · CRM · Personnel · Fournisseurs (sous-menu : Mes fournisseurs, Portail fournisseur) · Système (sous-menu : Historique) · Administration · Compte (sous-menu : Abonnement, Paramètres).

#### Restaurant
Dashboard · Multi-boutiques · POS · Tables · Réservations · Cuisine · Recettes · Finance · Rapports · Personnel · Système · Administration · Compte.

#### Production
Dashboard · Multi-boutiques · POS · Production · Stock & Inventaire · Finance · Personnel · Fournisseurs · Système · Administration · Compte.

### Raccourcis bas de page
- **Messages** : ouvre le panneau de chat. Un badge rouge indique les messages non lus.
- **Notifications** : ouvre le centre de notifications. Un badge rouge indique les alertes non lues.
- **Support** : ouvre le panneau d'assistance.
- **Déconnexion** : quitte la session.

## 4. Boutons et actions

| Bouton | Emplacement | Action | Effet |
|--------|-------------|--------|-------|
| Entrée de menu | Menu principal | Clic | Navigue vers le module correspondant ; sur mobile, ferme la barre latérale |
| Flèche de groupe (▸ / ▾) | Menu principal | Clic | Déplie ou replie un sous-menu |
| Sélecteur de boutique | Sous le logo | Changement | Appelle `storesApi.setActive()` puis recharge la page |
| Messages | Pied de page | Clic | Ouvre le panneau `ChatModal` |
| Notifications | Pied de page | Clic | Ouvre `NotificationCenter` |
| Support | Pied de page | Clic | Ouvre `SupportPanel` |
| Déconnexion | Pied de page | Clic | Appelle `onLogout()` |

## 5. Filtres et recherche

Aucun filtre local dans la sidebar. Le filtrage est implicite : seuls les modules autorisés par les permissions et le secteur sont affichés.

## 6. États de l'interface

| État | Description |
|------|-------------|
| Chargement des boutiques | Le sélecteur est désactivé, texte « Chargement des boutiques… » |
| Boutique unique | Le sélecteur n'apparaît pas en mode déroulant, texte « Une seule boutique vous est attribuée. » |
| Changement de boutique en cours | Le sélecteur est désactivé pendant le changement |
| Mobile ouvert | Overlay sombre semi-transparent couvre le reste de l'écran |

## 7. Cas d'usage typiques

- **Scénario simple** : un commerçant clique sur « POS » pour enregistrer une vente.
- **Scénario avancé** : un gérant multi-boutiques change de boutique active, vérifie le Dashboard, puis ouvre l'inventaire.
- **Erreur fréquente** : un employé ne voit pas « CRM » → le module est désactivé dans les paramètres ou sa permission ne l'inclut pas.

## 8. Liens avec les autres modules

La sidebar mène vers tous les modules de l'application. Elle ne reçoit de données d'aucun autre module, mais elle lit les permissions de l'utilisateur connecté.

## 9. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Pourquoi je ne vois pas certains menus ? | Votre rôle ou vos permissions ne l'autorisent pas. Contactez votre administrateur. |
| Comment changer de boutique ? | Utilisez le sélecteur sous le logo, si vous avez accès à plusieurs boutiques. |
| La page se recharge quand je change de boutique, est-ce normal ? | Oui, les données doivent être rechargées pour la nouvelle boutique. |

## 10. Guide rapide intégré

1. **Logo Stockman** — Identifie l'application en haut de la barre.
2. **Boutique active** — Changez de boutique ici si vous en gérez plusieurs.
3. **Menu principal** — Naviguez vers un module en cliquant sur son nom.
4. **Sous-menus** — Certains modules contiennent des sections ; cliquez sur la flèche pour les déplier.
5. **Messages et Notifications** — Accédez à vos échanges et alertes en bas de la barre.
6. **Support** — Besoin d'aide ? Cliquez ici pour contacter l'assistance.
