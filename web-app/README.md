# Web App Stockman

## Démarrage local

```bash
npm run dev
```

L'application web tourne ensuite sur [http://localhost:3000](http://localhost:3000).

## Authentification Google web

Le web app utilise Firebase Auth avec un proxy Next.js sur ` /__/auth/* `.

Règle importante :

- en local, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` peut rester sur le domaine Firebase par défaut ;
- en production, l'application force le domaine courant comme `authDomain` pour éviter les iframes cross-domain et les erreurs Google Sign-In sur `app.stockman.pro`.

Pré-requis côté consoles :

- `app.stockman.pro` doit être ajouté dans **Firebase Authentication > Authorized domains** ;
- le flux ` /__/auth/* ` doit rester disponible sur le domaine web ;
- si Google Sign-In web est utilisé, le domaine public réel doit être autorisé côté configuration OAuth/Firebase.

## Déploiement

Avant un déploiement de production, vérifier :

- les variables Firebase publiques ;
- la réécriture Next.js ` /__/auth/:path* ` ;
- le bon domaine public de l'app (`app.stockman.pro`).
