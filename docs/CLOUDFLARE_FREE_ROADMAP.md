# Cloudflare Free Roadmap

Date de preparation : 2026-03-11
Statut : planifie, non implemente

## Etat

Stack actuelle :

- `stockman.pro` = landing publique
- `app.stockman.pro` = application web
- `backend FastAPI` sur Railway
- `mobile Expo` hors perimetre Cloudflare direct

Ce document decrit comment utiliser Cloudflare avec les elements gratuits ou quasi
gratuits, sans migration lourde et sans casser l'architecture actuelle.

## Objectif

Utiliser Cloudflare pour :

- proteger les domaines
- accelerer la landing
- securiser les formulaires publics
- preparer une couche edge simple
- preparer le stockage fichiers plus tard
- preparer l'observabilite IA

Sans :

- reecrire le backend FastAPI
- migrer toute l'application web
- dependre d'offres payantes des le debut

## Principe directeur

Cloudflare sera d'abord utilise comme :

- `edge`
- `DNS / proxy / SSL`
- `protection formulaire`
- `cache statique`
- `petites fonctions utilitaires`

La source de verite metier reste sur Railway :

- utilisateurs
- business accounts
- abonnements
- ventes
- stock
- CRM
- comptabilite

## Architecture cible v1

- `stockman.pro` -> Cloudflare Pages
- `app.stockman.pro` -> hebergement actuel + proxy Cloudflare
- `api.stockman.pro` -> Railway + proxy Cloudflare
- `workers utilitaires` -> petites fonctions edge seulement
- `R2` -> plus tard pour fichiers non critiques

## Phase 1. DNS, proxy et SSL

### Objectif

Faire passer les domaines principaux derriere Cloudflare sans toucher au code
applicatif.

### Sous-domaines a gerer

- `stockman.pro`
- `www.stockman.pro`
- `app.stockman.pro`
- `api.stockman.pro`

### Ce qu'on fera

- configurer la zone `stockman.pro` sur Cloudflare
- changer les nameservers chez le registrar
- recreer les enregistrements DNS utiles
- activer le proxy Cloudflare sur les domaines web/API publics
- verifier le SSL `Full (strict)` si possible

### Ce qu'on garde

- Railway reste l'origine de `app.stockman.pro`
- Railway reste l'origine de `api.stockman.pro`

### Benefices

- TLS/SSL gere proprement
- cache statique simple
- protection reseau de base
- meilleure maitrise des domaines

## Phase 2. Landing publique sur Cloudflare Pages

### Objectif

Sortir la landing publique de l'hebergement applicatif principal et la mettre sur
Cloudflare Pages.

### Perimetre

- `stockman.pro`
- pages marketing publiques
- pages pricing publiques
- pages business types publiques

### Ce qu'on fera

- deployer `landing-page/` sur Cloudflare Pages
- relier le domaine `stockman.pro`
- garder `app.stockman.pro` separe pour l'application
- conserver le SEO, sitemap et les redirections utiles

### Ce qu'on ne fera pas

- ne pas migrer `app.stockman.pro` vers Pages a cette etape

### Benefices

- hebergement tres economique
- distribution edge rapide
- deploiements simples de la landing
- separation claire `site marketing` / `app`

## Phase 3. Turnstile sur les formulaires publics

### Objectif

Proteger les points d'entree publics contre le spam et les abus sans cout
significatif.

### Ecrans/formulaires a couvrir

- contact landing
- demande de demo
- signup Enterprise web
- login web
- reset password
- support public si expose
- OTP resend si on veut durcir ce point ensuite

### Strategie

- widget Turnstile cote front
- validation serveur cote backend
- logs simples des echecs de verification

### Benefices

- reduction du spam
- reduction des abus sur signup/login
- cout quasi nul au depart

## Phase 4. Fonctions edge minimales

### Objectif

Ajouter de petites fonctions Cloudflare sans toucher au coeur metier.

### Cas d'usage cibles

- validation serveur Turnstile
- endpoint public de pricing/cache de pricing
- redirections marketing intelligentes
- headers de securite et cache-control centralises
- reponse legere pour health/public config si utile

### Ce qu'on fera

- utiliser Pages Functions ou Workers free tier
- garder ces fonctions tres petites
- ne pas y deplacer la logique metier principale

### Ce qu'on ne fera pas

- pas de reecriture FastAPI
- pas de migration API complete vers Workers

## Phase 5. R2 pour les fichiers non critiques

### Objectif

Preparer un stockage objet simple pour les fichiers applicatifs.

### Fichiers cibles

- exports CSV/Excel
- recus PDF
- factures PDF
- images produits
- pieces jointes fournisseurs

### Strategie

- demarrer seulement quand le besoin est reel
- garder les donnees metier dans Mongo/Railway
- utiliser R2 comme stockage fichiers, pas comme base metier

### Benefices

- cout bas au debut
- distribution plus simple des fichiers
- base propre pour documents et medias

## Phase 6. AI Gateway

### Objectif

Mieux observer et controler les appels IA deja presents dans le projet.

### Cas d'usage

- logs d'utilisation IA
- suivi du volume
- limitation simple
- centralisation du trafic vers les modeles

### Strategie

- brancher les appels IA backend/web dessus plus tard
- ne pas changer le produit fonctionnel
- en faire une couche d'observabilite et de gouvernance

### Benefices

- meilleur suivi des couts IA
- meilleure visibilite sur les appels
- base utile pour du throttling plus tard

## Ce qu'on laisse volontairement hors scope au debut

- WAF payant avance
- Browser Rendering
- Queues/Workflows a volume reel
- migration complete Next.js vers Workers
- migration complete FastAPI vers Workers
- KV comme source de verite metier

## Repartition Cloudflare / Railway

### Cloudflare

- DNS
- proxy/CDN
- SSL
- landing publique sur Pages
- Turnstile
- petites fonctions edge
- R2 plus tard
- AI Gateway plus tard

### Railway

- backend FastAPI principal
- logique metier
- paiements
- webhooks Stripe/Flutterwave/RevenueCat
- base de donnees et etat metier
- application web existante

## Ordre d'implementation recommande

1. Configurer la zone DNS Cloudflare
2. Faire pointer les domaines et tester `stockman.pro`, `app.stockman.pro`, `api.stockman.pro`
3. Mettre la landing sur Cloudflare Pages
4. Ajouter Turnstile sur les formulaires publics
5. Ajouter une ou deux petites fonctions edge utiles
6. Ajouter R2 pour les documents quand le besoin est confirme
7. Ajouter AI Gateway pour les flux IA

## Checklist de validation

### Domaine et reseau

- `stockman.pro` repond correctement
- `app.stockman.pro` repond correctement
- `api.stockman.pro` repond correctement
- certificats SSL valides
- pas de boucle de redirection

### Landing

- pages marketing servies depuis Pages
- SEO/sitemap encore valides
- CTA vers `app.stockman.pro` corrects

### Turnstile

- contact protege
- signup/login proteges
- validation backend fonctionnelle
- pas de blocage abusif des utilisateurs legitimes

### Edge

- pricing public accessible
- headers de securite corrects
- cache coherent

### Fichiers

- uploads/documents lisibles si R2 active
- URLs stables
- pas de fuite de fichiers prives

## Risques et garde-fous

- ne pas faire de Cloudflare la source de verite metier
- ne pas cacher trop agressivement l'API dynamique
- ne pas migrer `app.stockman.pro` trop tot
- ne pas exposer de logique sensible dans des Workers improvises
- garder FastAPI/Railway comme coeur du systeme tant que l'architecture actuelle est stable

## Decision produit retenue

Le projet utilisera Cloudflare d'abord comme couche de distribution, protection et
support edge a faible cout, pas comme remplacement complet de Railway.

Le point de depart le plus rentable est :

- `stockman.pro` sur Pages
- `app.stockman.pro` et `api.stockman.pro` derriere proxy Cloudflare
- `Turnstile` sur les formulaires

Le reste viendra ensuite, sans remise a plat du projet.
