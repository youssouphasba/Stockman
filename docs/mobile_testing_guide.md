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
- Depuis un compte de facturation mobile, choisir Enterprise puis toucher **Découvrir Enterprise** : vérifier que Stockman Web ouvre le **Tableau de bord** avec le même compte, même si le navigateur était connecté à un autre compte. Vérifier qu'un lien déjà utilisé ou expiré revient à la connexion sans ouvrir de session et qu'un compte Starter ou Pro ne reçoit pas de droits Enterprise.
- Dans **Réglages → Mon abonnement**, vérifier que les trois offres sont affichées directement et que les coordonnées de facturation s’ouvrent sous les offres. Les liens de paiement et de restauration doivent être les mêmes que depuis le bandeau d’essai.
- Vérifier en français et en anglais les messages de suppression et de restauration de produit, les règles d’alerte et les étapes d’import du catalogue fournisseur. Vérifier aussi les pluriels et l’absence de clés de traduction à la place des libellés.

## 4. Connexion Google mobile

- Le flux Google mobile natif dépend de la configuration OAuth Android et iOS intégrée au build.
- Android nécessite `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` et iOS nécessite `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Si l'identifiant Android manque, l'écran de connexion peut planter dès son ouverture.
- Lors d'une première création de compte via Google ou Apple sur mobile, Stockman ne doit plus entrer directement dans l'application : un écran de complétion demande maintenant de confirmer le pays, le numéro de téléphone et le secteur d'activité pour appliquer la bonne devise et le bon contexte métier.
- Pour valider ce flux, vérifiez qu'un nouveau compte Google arrive sur l'écran de complétion, puis qu'après validation il bascule vers la vérification téléphone et que `country_code`, `currency`, `phone` et `business_type` sont bien présents dans `/api/auth/me`.
- Après une modification des identifiants Google, du fichier `google-services.json`, du fichier `GoogleService-Info.plist` ou de la configuration native de connexion Google, un simple `eas update` ne suffit pas.
- Il faut générer un nouveau build pour tester correctement la connexion Google sur mobile.
- Sur un compte en attente de vérification SMS, ouvrir rapidement deux fois l'écran de saisie du code : un seul envoi doit démarrer, sans message d'erreur de concurrence. Vérifier que « code envoyé » n'apparaît qu'après la confirmation de l'envoi, que le code reçu fonctionne et que le passage à l'e-mail reste possible.

## 4.1 Disponibilité de l'inscription fournisseur

- Désactiver le réglage global **Fournisseurs** dans l'administration, puis ouvrir l'inscription mobile. Le profil **Fournisseur** doit rester visible avec la mention **Bientôt disponible**, sans ouvrir de formulaire.
- Vérifier qu'une demande directe d'inscription fournisseur, y compris par invitation, est refusée sans créer de compte. L'inscription commerçant et la connexion d'un fournisseur déjà inscrit doivent rester possibles.
- Réactiver le réglage global et rouvrir l'inscription : le profil **Fournisseur** doit redevenir sélectionnable.

## 5. Verification des notifications push

- L'alerte dans Stockman et la notification push sont deux etapes distinctes : une alerte peut etre creee meme si Expo ne parvient pas a envoyer la notification.
- Le bouton de test push renvoie maintenant la vraie cause en cas d'echec : aucun appareil enregistre, jeton invalide ou credentials Expo/FCM Android invalides.
- Si le test mentionne `InvalidCredentials`, le fichier `google-services.json` ne suffit pas : il faut aussi verifier la configuration FCM du projet Expo/EAS utilise pour l'application.

## 6. Guide contextuel de navigation

- Fermer l'application à l'étape « Ajouter au panier » du guide de démarrage, puis la rouvrir. Vérifier que la Caisse ouvre automatiquement la liste Produits et met l'article en surbrillance sans demander de relancer le guide.

- Le guide contextuel de navigation doit s'ouvrir automatiquement une seule fois lors de la premiere arrivee sur les onglets.
- Apres fermeture du guide, changer d'onglet ne doit plus le rouvrir automatiquement.
- Le guide doit ensuite rester accessible uniquement via le bouton d'aide.
- Sur un petit écran, ouvrir un guide d’écran en portrait, puis en paysage si l’appareil le permet. Vérifier que la fermeture et les boutons de navigation restent visibles, même avec une police agrandie. Sur une étape longue, faire défiler le texte verticalement, puis changer d’étape avec les boutons et par balayage horizontal. Fermer et rouvrir le guide : il doit repartir de la première étape.
- Avec un compte français, ouvrir le guide E-com et rechercher Wave, Orange Money ou Denkma dans le centre d’aide : les rubriques de configuration de ces services ne doivent pas apparaître. Les consignes de paiement et le traitement des commandes restent accessibles. Avec un compte sénégalais éligible en XOF, vérifier que les rubriques correspondantes apparaissent. Basculer entre les deux comptes sans redémarrer l’application et répéter la vérification.

## 7. Fluidite et reglages

- Enterprise sur mobile : vérifier que **Boutique en ligne** ouvre la première rubrique et que **Aide** suit **Ma boutique**. Dans **Mon compte > Modules de l’organisation**, vérifier que **Cuisine** et **Réservations** apparaissent uniquement pour une activité de restauration, et que modifier un autre module ne réinitialise pas les valeurs masquées. Tester également les liens directs et un compte sans droits d’administration.

- Caisse : avec une connexion lente, ouvrir Produits avant la fin du chargement des clients et des réglages. Vérifier que les articles apparaissent dès leur retour et que l'encaissement ne propose pas de total provisoire. Revenir sur la Caisse pendant un panier en cours : ni le panier ni le catalogue déjà affiché ne doivent disparaître.
- Produits : ralentir la réponse des catégories et vérifier que la liste se remplit sans les attendre. Changer rapidement de filtre ou de recherche, puis revenir sur l'onglet. Les réponses précédentes ne doivent pas remplacer la liste courante.
- Accueil : après une première visite en ligne, rouvrir l'application avec une connexion lente. L'Accueil peut reprendre les données en cache de la boutique active. Changer de compte ou de boutique et vérifier que les indicateurs précédents ne réapparaissent pas.
- Réglages et E-com : ralentir le chargement du site dans Réglages et vérifier que les autres rubriques restent accessibles. Dans E-com, revenir aux commandes ou les actualiser : la liste doit rester visible pour le même filtre, y compris en cas d'échec de l'actualisation.
- Pendant une actualisation, basculer vers un autre compte ou une autre boutique. Vérifier que les réponses en retard ne modifient pas l'écran de la nouvelle boutique. Refaire le même parcours hors ligne, puis après reconnexion.
- Compta : ralentir les historiques et vérifier que les indicateurs et les filtres restent accessibles. Changer rapidement de période et de canal : ne jamais afficher un ancien total ou un zéro provisoire pour le nouveau filtre. Vérifier aussi le retour en Compta après une vente et les factures en attente de synchronisation.
- Clients : ralentir les promotions et les réglages de fidélité. La liste des clients doit rester consultable dès qu'elle est disponible. Changer rapidement de tri et vérifier que la dernière demande l'emporte.

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

## 10. Publier une mise à jour OTA sur Expo

Les workflows `frontend/.eas/workflows/ota-android.yml` et `frontend/.eas/workflows/ota-ios.yml` préparent le bundle sur les serveurs d’Expo et publient sur le canal `production` pour la plateforme choisie. Ils se lancent à la demande, jamais à chaque push.

1. Dans les réglages GitHub du projet Expo, associez le dépôt Stockman et choisissez `frontend` comme répertoire de base.
2. Vérifiez que le commit à publier, qui doit aussi contenir le workflow, est poussé sur GitHub. Vérifiez les variables `EXPO_PUBLIC_*` dans l’environnement Expo `production` et la compatibilité du code avec le runtime du build installé.
3. Depuis `frontend`, lancez la commande de la plateforme concernée en remplaçant `SHA_DU_COMMIT` par l’identifiant exact du commit à publier :

```powershell
eas workflow:run .eas/workflows/ota-android.yml --ref "SHA_DU_COMMIT" --wait
eas workflow:run .eas/workflows/ota-ios.yml --ref "SHA_DU_COMMIT" --wait
```

`--ref` utilise le code du commit distant, sans inclure les modifications locales. Vérifiez le résultat dans **Workflows**, puis **Updates**, dans le tableau de bord Expo. Si le workflow signale un échec après la publication, vérifiez d’abord si le groupe OTA existe avant de relancer. Une modification native nécessite un nouveau build ; une OTA n’envoie rien à Google Play Console ni à App Store Connect.

Pour vérifier sur un téléphone qu’une OTA est bien appliquée, ouvrez **Réglages**, puis **Sécurité, légal et données**, puis **Informations légales** : la ligne **Version** affiche le numéro de l’application suivi de « mise à jour du JJ/MM à HH:MM » (heure du téléphone) quand une OTA est en cours d’exécution, ou de « version d’origine » quand l’application tourne encore sur le code livré avec le build.

Les builds de production vérifient les OTA à chaque ouverture et attendent jusqu’à 3 secondes au démarrage pour charger une mise à jour disponible. Si le téléchargement prend plus longtemps ou si le réseau est indisponible, l’application démarre sur la dernière version utilisable et reprend la mise à jour au prochain lancement. Vérifiez ce comportement en ligne, avec une connexion lente et hors ligne. Ce délai est intégré au build natif : une OTA seule ne peut pas le modifier.

Depuis la version 1.0.24, la même rubrique affiche sous la ligne **Version** le canal, la version d’exécution et l’identifiant de la mise à jour en cours, ainsi que le bouton **Rechercher une mise à jour**. Il interroge le serveur : si une mise à jour est trouvée, il la télécharge et redémarre l’application ; sinon, il affiche la raison donnée par expo-updates (rien de plus récent sur le serveur, mise à jour refusée par l’application ou déjà en échec) et le dernier incident enregistré. Les textes peuvent être sélectionnés pour être copiés.

Sur Android, vérifiez le runtime affiché sur un appareil installé depuis Google Play, au moins en français et en anglais. Le runtime doit rester identique lors d’un changement de langue et correspondre à celui annoncé dans Expo. Le plugin Android de Stockman inscrit la valeur de `runtimeVersion` directement dans le manifeste pour éviter qu’une ressource de langue ne la remplace. Si un ancien build affiche `1.0.0` alors qu’Expo annonce `1.0.22`, il faut le remplacer par un build corrigé. Ne publiez pas de rattrapage pour `1.0.0` sur `production` sans avoir vérifié la compatibilité de tous les anciens builds ciblés.

Si Expo cherche le workflow dans `.eas/workflows` à la racine du dépôt, corrigez le répertoire de base dans les réglages GitHub du projet Expo. Le workflow accepte aussi une archive sans métadonnées Git ; dans ce cas, utilisez une copie isolée du commit validé, pas le dossier de travail.

## 11. Vérification des mises à jour publiées dans les stores

La vérification automatique interroge le store de l’appareil : Google Play sur Android et l’App Store sur iOS. Aucun numéro « dernière version » n’est fixé dans Stockman. La fenêtre de mise à jour ne doit apparaître que lorsque le store confirme qu’une version plus récente est installable. Si le store ne répond pas, l’application doit rester utilisable.

- Tester sur Android une version installée plus ancienne que celle publiée sur Google Play, avec l’application distribuée par Play Store et un compte autorisé à accéder à la version.
- Tester sur iOS une version installée plus ancienne que celle publiée sur l’App Store, dans une région où l’application est disponible.
- Vérifier qu’aucune fenêtre ne s’affiche quand l’application est à jour ou quand le store est inaccessible.
- Fermer la fenêtre avec « Plus tard », puis vérifier qu’elle ne réapparaît pas pour la même version ; publier une version suivante et vérifier qu’une nouvelle proposition apparaît.
- Vérifier qu’une version minimale configurée rend la proposition bloquante seulement si une mise à jour est également proposée par le store.
- Vérifier qu’une notification envoyée depuis l’administration ouvre la fiche correspondant à sa plateforme.

Le contrôle automatique repose sur un module natif ajouté après les builds déjà distribués. Il doit donc être validé avec les nouveaux builds Android et iOS qui l’intègrent ; une OTA ne suffit pas.
