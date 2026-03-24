# Guide — Centre de notifications (Alertes)

## 1. Rôle du module

Le Centre de notifications regroupe les alertes de l'application : stock bas, ruptures, retards fournisseurs, anomalies détectées par l'IA. Il permet aussi de configurer les règles d'alerte.

**Profils concernés** : tous les utilisateurs connectés.

## 2. Accès

Barre latérale → **Stock & Inventaire** → **Alertes**, ou via l'icône Notifications en bas de la barre latérale.

## 3. Lecture de l'écran

### En-tête
- **Titre** : « Centre de notifications ».
- **Compteur** : nombre d'alertes non lues.
- **Bouton Configuration (⚙)** : ouvre les règles d'alertes.
- **Bouton Rafraîchir** : recharge la liste.

### Détection IA
Carte cliquable « Détecter des anomalies IA » : lance une analyse complète des données.

### Synthèse IA
Grille de cartes affichant les anomalies détectées (critique, alerte, info) avec bordure colorée selon la sévérité.

### Liste des alertes
Chaque alerte affiche :
- Icône de sévérité (critique = rose, alerte = ambre, info = bleu).
- Titre et message.
- Date.
- Indicateur non lu (bordure bleue à gauche).
- Boutons : Marquer comme lu, Ignorer.

### Modal Règles d'alertes
Configuration des règles :
- **Portée** : Niveau compte ou Boutique active.
- **Types** : Stock bas, Rupture de stock, Surstock, Produits dormants, Retards fournisseurs.
- **Paramètres** : seuil (%), canaux (push, email), destinataires par groupe, emails additionnels, sévérité minimale.

## 4. Boutons et actions

| Bouton | Action | Effet |
|--------|--------|-------|
| Détecter des anomalies IA | Clic | Analyse IA complète |
| ⚙ Configurer | Clic | Ouvre les règles d'alertes |
| Rafraîchir | Clic | Recharge la liste |
| ✓ Marquer lu | Clic sur une alerte | Marque comme lue |
| 🗑 Ignorer | Clic sur une alerte | Supprime l'alerte |
| Activer/Désactiver | Règle d'alerte | Toggle d'activation |
| Enregistrer | Règle d'alerte | Sauvegarde la configuration |

## 5. États de l'interface

| État | Description |
|------|-------------|
| Chargement | Spinner centré |
| Aucune alerte | Icône vert + texte « Tout est à jour » |
| Analyse en cours | Spinner sur le bouton IA |
| Anomalies détectées | Grille de cartes avec bordures colorées |

## 6. Cas d'usage typiques

- **Surveillance quotidienne** : ouvrir le centre → lire les alertes → marquer comme lues.
- **Détection IA** : cliquer « Détecter des anomalies » → consulter la synthèse.
- **Configuration** : ⚙ → activer la règle « Stock bas » → fixer le seuil à 20 % → activer push + email.

## 7. Questions fréquentes

| Question | Réponse |
|----------|---------|
| Comment recevoir des alertes par email ? | Configurez la règle dans ⚙ et ajoutez le canal « Email ». |
| Comment modifier le seuil de stock bas ? | Dans les règles d'alertes, section « Stock bas », ajustez le seuil (%). |
| Les anomalies IA sont-elles automatiques ? | Non, elles sont déclenchées à la demande via le bouton « Détecter ». |

## 8. Guide rapide intégré

1. **Centre de notifications** — Consultez vos alertes de stock, fournisseurs et anomalies IA.
2. **Détection IA** — Cliquez pour lancer une analyse intelligente de vos données.
3. **Gestion des alertes** — Marquez comme lues ou ignorez les alertes traitées.
4. **Règles d'alertes** — Configurez vos seuils et canaux de notification dans ⚙.
