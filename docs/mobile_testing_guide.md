# Guide : Tester votre application sur le Play Store

## 1. Configurer le test interne (Recommandé)
Le test interne est le moyen le plus rapide de tester votre `.aab` (disponible en quelques minutes après l'examen initial).

1. Connectez-vous à la **Google Play Console**.
2. Allez dans **Tests** → **Test interne**.
3. Dans l'onglet **Testeurs**, créez une liste d'adresses e-mail (la vôtre et celle de vos collaborateurs).
4. En bas de la page, copiez le **Lien de partage** (ex: `https://play.google.com/apps/internaltest/...`).
5. Ouvrez ce lien sur votre téléphone Android pour accepter l'invitation.

## 2. Connecter RevenueCat (Sandbox)
Pour tester les paiements sans dépenser d'argent réel :

1. Créez un projet sur **[RevenueCat](https://app.revenuecat.com/)**.
2. Ajoutez une application Android avec votre **Package Name** (`com.youssouphasba.stockman`).
3. Créez des **Entitlements** (ex: `premium`) et des **Offerings**.
4. **IMPORTANT** : Dans le Play Store, le compte Google utilisé pour le test doit être ajouté comme "Testeur sous licence" dans **Configuration** → **Tests de licence**.

## 3. Déploiement
Une fois que vous m'aurez fourni les clés API, je les ajouterai au fichier `.env`. Vous devrez ensuite :
1. Re-générer un build (si vous utilisez EAS Build) ou re-tester en local.
2. Télécharger la version depuis le lien de test interne.
