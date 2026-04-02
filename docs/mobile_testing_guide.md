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
3. Créez des **Entitlements** et des **Offerings**.
4. Pour Stockman, les entitlements attendus sont `starter` et `pro`.
5. **IMPORTANT** : Dans le Play Store, le compte Google utilisé pour le test doit être ajouté comme "Testeur sous licence" dans **Configuration** → **Tests de licence**.

### Variables d'environnement par plateforme

Pour éviter de mélanger les identifiants Android et iOS dans RevenueCat, Stockman utilise des variables distinctes :

- `EXPO_PUBLIC_REVENUECAT_STARTER_PRODUCT_ID_ANDROID`
- `EXPO_PUBLIC_REVENUECAT_PRO_PRODUCT_ID_ANDROID`
- `EXPO_PUBLIC_REVENUECAT_STARTER_PRODUCT_ID_IOS`
- `EXPO_PUBLIC_REVENUECAT_PRO_PRODUCT_ID_IOS`

Format attendu :

- Android : identifiant combiné RevenueCat / Google Play, par exemple `stockman_starter_monthly:stockman-starter-monthly`
- iOS : identifiant App Store Connect exact, par exemple `starter_monthly_V2`

## 3. Déploiement
Une fois que vous m'aurez fourni les clés API, je les ajouterai au fichier `.env`. Vous devrez ensuite :
1. Re-générer un build (si vous utilisez EAS Build) ou re-tester en local.
2. Télécharger la version depuis le lien de test interne.

## 3.1 Synchronisation après achat intégré

- Après un achat Starter ou Pro via Google Play / App Store, l’application lance une synchronisation serveur (`/subscription/sync`) puis recharge le contexte utilisateur pour propager immédiatement le nouveau plan dans les écrans verrouillés.
- Si la boutique indique "déjà abonné", utilisez le bouton **Récupérer mon abonnement**. L’application tente maintenant de reconnaître le plan à partir des entitlements actifs, des abonnements actifs et des identifiants de produits RevenueCat avant de relancer la synchronisation.

## 4. Connexion Google mobile

- Le flux Google mobile natif dépend de la configuration OAuth Android et iOS intégrée au build.
- Android nécessite `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` et iOS nécessite `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Si l'identifiant Android manque, l'écran de connexion peut planter dès son ouverture.
- Après une modification des identifiants Google, du fichier `google-services.json`, du fichier `GoogleService-Info.plist` ou de la configuration native de connexion Google, un simple `eas update` ne suffit pas.
- Il faut générer un nouveau build pour tester correctement la connexion Google sur mobile.

## 5. Verification des notifications push

- L'alerte dans Stockman et la notification push sont deux etapes distinctes : une alerte peut etre creee meme si Expo ne parvient pas a envoyer la notification.
- Le bouton de test push renvoie maintenant la vraie cause en cas d'echec : aucun appareil enregistre, jeton invalide ou credentials Expo/FCM Android invalides.
- Si le test mentionne `InvalidCredentials`, le fichier `google-services.json` ne suffit pas : il faut aussi verifier la configuration FCM du projet Expo/EAS utilise pour l'application.
