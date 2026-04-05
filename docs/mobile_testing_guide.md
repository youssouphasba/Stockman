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
- Lors d'une première création de compte via Google ou Apple sur mobile, Stockman ne doit plus entrer directement dans l'application : un écran de complétion demande maintenant de confirmer le pays, le numéro de téléphone et le secteur d'activité pour appliquer la bonne devise et le bon contexte métier.
- Pour valider ce flux, vérifiez qu'un nouveau compte Google arrive sur l'écran de complétion, puis qu'après validation il bascule vers la vérification téléphone et que `country_code`, `currency`, `phone` et `business_type` sont bien présents dans `/api/auth/me`.
- Après une modification des identifiants Google, du fichier `google-services.json`, du fichier `GoogleService-Info.plist` ou de la configuration native de connexion Google, un simple `eas update` ne suffit pas.
- Il faut générer un nouveau build pour tester correctement la connexion Google sur mobile.

## 5. Verification des notifications push

- L'alerte dans Stockman et la notification push sont deux etapes distinctes : une alerte peut etre creee meme si Expo ne parvient pas a envoyer la notification.
- Le bouton de test push renvoie maintenant la vraie cause en cas d'echec : aucun appareil enregistre, jeton invalide ou credentials Expo/FCM Android invalides.
- Si le test mentionne `InvalidCredentials`, le fichier `google-services.json` ne suffit pas : il faut aussi verifier la configuration FCM du projet Expo/EAS utilise pour l'application.

## 6. Guide contextuel de navigation

- Le guide contextuel de navigation doit s'ouvrir automatiquement une seule fois lors de la premiere arrivee sur les onglets.
- Apres fermeture du guide, changer d'onglet ne doit plus le rouvrir automatiquement.
- Le guide doit ensuite rester accessible uniquement via le bouton d'aide.

## 7. Fluidite et reglages

- Le changement d'onglet doit rester fluide sans rechargement visible du layout de navigation a chaque appui.
- Depuis Parametres, l'ouverture des CGU ou de la politique de confidentialite doit permettre un retour simple vers Parametres.
- Les sauvegardes dans Parametres doivent afficher une confirmation visuelle dans l'ecran apres mise a jour.
- Dans Produits, la barre d'actions de selection en bas doit rester lisible sur fond sombre, notamment pour "Tout selectionner" et la suppression.

## 8. Enregistrement vocal et conformite iOS

- Le demarrage de l'enregistrement vocal (POS et support IA) attend maintenant explicitement le lancement du recorder avant de marquer l'etat "en cours".
- A l'arret, l'application attend la disponibilite du fichier audio avant de tenter la transcription. Cela evite l'erreur "Aucun enregistrement vocal exploitable n'a ete detecte" quand l'URI arrive avec un leger delai.
- La configuration iOS supprime explicitement `UIBackgroundModes.audio` au build. L'application ne revendique plus la lecture audio en arriere-plan si aucune fonction metier ne la necessite.

## 9. Encodage des textes (anti-caracteres corrompus)

- Le backend applique maintenant une normalisation automatique des reponses JSON pour corriger les chaines mojibake (exemples: `ÃƒÂ©`, `Ã¢â‚¬â€`) avant affichage.
- Ce correctif cible notamment les rappels intelligents et les textes dashboard renvoyes par API.
- Verification recommandee apres deploiement:
- Ouvrir Dashboard puis Alertes sur mobile.
- Verifier que les accents s'affichent correctement (exemples: "Vérification", "dépenses", "à", "é").
