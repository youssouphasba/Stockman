# Tester l'API Stockman avec Postman

Fichiers fournis :

- `Stockman.postman_collection.json`
- `Stockman.debug.postman_collection.json`
- `Stockman.postman_environment.json`

## Importer les fichiers

1. Ouvre Postman.
2. Clique sur `Import`.
3. Importe la collection :
   - `C:\Users\Utilisateur\projet_stock\docs\postman\Stockman.postman_collection.json`
4. Importe aussi la collection debug :
   - `C:\Users\Utilisateur\projet_stock\docs\postman\Stockman.debug.postman_collection.json`
5. Importe l'environnement :
   - `C:\Users\Utilisateur\projet_stock\docs\postman\Stockman.postman_environment.json`
6. Selectionne l'environnement `Stockman Production`.

## Configurer les variables

Dans l'environnement, renseigne :

- `email`
- `password`

Laisse `access_token`, `refresh_token` et `job_id` vides. Ils seront remplis automatiquement par les scripts Postman.

## Premier test

Ordre conseille :

1. `Auth > Login`
2. `Auth > Me`
3. `Settings > Get settings`
4. `Products > List products`

Si `Login` reussit, les tokens sont enregistres automatiquement dans les variables de collection.

## Collection debug

La collection `Stockman API Debug` sert a diagnostiquer rapidement :

- les abonnements
- les alertes
- les employes
- les boutiques
- les notifications push et in-app
- les endpoints analytics

Variables utiles a renseigner selon le test :

- `store_id`
- `sub_user_id`
- `alert_id`
- `notification_id`
- `expo_push_token`

## Tester l'import catalogue

1. Lance `Catalog import > Parse import file`
2. Dans le champ `file`, choisis ton fichier CSV
3. Recupere la reponse contenant `data`, `columns` et eventuellement `ai_mapping`
4. Copie les valeurs utiles dans `Catalog import > Confirm import job`
5. Lance `Catalog import > Get active import job` ou `Get import job by id`
6. Si besoin, lance `Resume import job`

## Notes utiles

- Les routes protegees utilisent `Authorization: Bearer {{access_token}}`
- L'URL de base de production est `https://stockman-production-149d.up.railway.app`
- Pour tester un autre environnement, duplique l'environnement Postman et change `base_url`
