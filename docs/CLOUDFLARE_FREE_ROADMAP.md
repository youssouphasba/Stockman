# Cloudflare Free Roadmap

Date de préparation : 2026-03-11
Mise à jour : 2026-04-05
Statut : planifié, non implémenté

## État actuel

Stack actuelle :

- `stockman.pro` = landing publique (React, sur Vercel)
- `app.stockman.pro` = application web (Next.js, sur Vercel)
- `api` = backend FastAPI sur Railway (`stockman-production-149d.up.railway.app`)
- `mobile Expo` = hors périmètre Cloudflare direct

Ce document décrit comment utiliser Cloudflare avec les éléments gratuits ou quasi
gratuits, sans migration lourde et sans casser l'architecture actuelle.

## Objectif

Utiliser Cloudflare pour :

- protéger les domaines
- accélérer la landing
- sécuriser les formulaires publics
- préparer une couche edge simple
- préparer le stockage fichiers plus tard
- préparer l'observabilité IA

Sans :

- réécrire le backend FastAPI
- migrer l'application web de Vercel vers Pages (Next.js SSR non compatible Pages)
- dépendre d'offres payantes dès le début

## Principe directeur

Cloudflare sera d'abord utilisé comme :

- `edge` — DNS / proxy / SSL
- `protection` — Turnstile anti-spam
- `cache statique` — landing et assets uniquement
- `petites fonctions utilitaires` — Workers free tier

La source de vérité métier reste sur Railway :

- utilisateurs
- business accounts
- abonnements
- ventes
- stock
- CRM
- comptabilité

## Coûts estimés

| Service | Free tier | Limite gratuite | Coût si dépassement |
|---------|-----------|-----------------|---------------------|
| DNS + proxy + SSL | Gratuit | Illimité | — |
| Cloudflare Pages | Gratuit | 500 builds/mois, bande passante illimitée | — |
| Turnstile | Gratuit | 1M validations/mois | — |
| Workers | Gratuit | 100K requêtes/jour | $0.50/M requêtes |
| R2 Storage | Gratuit | 10 GB stockage, 1M lectures/mois | $0.015/GB/mois |
| AI Gateway | Gratuit | Logs + analytics de base | — |

**Les phases 1 à 4 sont 100% gratuites** pour le volume actuel de Stockman.

## Architecture cible v1

```
stockman.pro ──────► Cloudflare proxy ──► Vercel (landing React)
app.stockman.pro ──► Cloudflare proxy ──► Vercel (Next.js SSR)
api.stockman.pro ──► Cloudflare proxy ──► Railway (FastAPI)
```

Option future : migrer la landing sur Cloudflare Pages (statique pur, plus rapide).
Mais pas obligatoire — Vercel fonctionne bien pour les deux.

- `stockman.pro` → Vercel + proxy Cloudflare (migration Pages possible plus tard)
- `app.stockman.pro` → Vercel + proxy Cloudflare (reste sur Vercel, Next.js SSR)
- `api.stockman.pro` → Railway + proxy Cloudflare
- `workers utilitaires` → petites fonctions edge seulement
- `R2` → plus tard pour fichiers non critiques

## Phase 1 — DNS, proxy et SSL (gratuit)

### Objectif

Faire passer les domaines principaux derrière Cloudflare sans toucher au code
applicatif.

### Sous-domaines à gérer

| Sous-domaine | Origine actuelle | Proxy Cloudflare |
|---|---|---|
| `stockman.pro` | Vercel (landing React) | Oui |
| `www.stockman.pro` | Redirect → `stockman.pro` | Oui |
| `app.stockman.pro` | Vercel (Next.js) | Oui |
| `api.stockman.pro` | Railway (FastAPI) | Oui |

### Ce qu'on fera

- configurer la zone `stockman.pro` sur Cloudflare
- changer les nameservers chez le registrar
- recréer les enregistrements DNS utiles
- activer le proxy Cloudflare sur les domaines web/API publics
- vérifier le SSL `Full (strict)` si possible

### Règles de cache à configurer

| Pattern | Cache |
|---------|-------|
| `api.stockman.pro/*` | `Cache-Control: no-store` — ne jamais cacher l'API dynamique |
| `app.stockman.pro/_next/static/*` | Cache CDN (assets Next.js) |
| `stockman.pro/*` | Cache CDN (landing statique) |

### CORS — point d'attention

Quand `api.stockman.pro` passe derrière le proxy Cloudflare :

- vérifier que les headers CORS (`Access-Control-Allow-Origin`, `Access-Control-Allow-Headers`) passent correctement
- Cloudflare ne modifie pas les headers CORS par défaut, mais certaines règles de cache ou de transformation peuvent les supprimer
- tester `app.stockman.pro` → `api.stockman.pro` après activation du proxy
- tester l'app mobile → `api.stockman.pro` après activation du proxy

### Bénéfices

- TLS/SSL géré proprement
- cache statique simple
- protection réseau de base
- meilleure maîtrise des domaines

## Phase 2 — Landing sur Cloudflare Pages (optionnel, gratuit)

### Objectif

Migrer la landing de Vercel vers Cloudflare Pages pour bénéficier du CDN edge.
Cette phase est **optionnelle** — la landing fonctionne bien sur Vercel.

### Périmètre

- `stockman.pro`
- pages marketing publiques
- pages pricing publiques
- pages business types publiques

### Pourquoi c'est possible

La landing (`landing-page/`) est du React statique pur (pas de SSR, pas d'API routes).
Elle est compatible Cloudflare Pages.

### Ce qu'on ferait

- déployer `landing-page/` sur Cloudflare Pages
- relier le domaine `stockman.pro`
- garder `app.stockman.pro` sur Vercel (Next.js SSR non compatible Pages)
- conserver le SEO, sitemap et les redirections utiles

### Ce qu'on ne fera pas

- ne pas migrer `app.stockman.pro` vers Pages (Next.js avec SSR/API routes nécessite un hébergement Node)

### Bénéfices

- distribution edge plus rapide que Vercel pour du statique
- un projet de moins sur Vercel
- séparation claire `site marketing` / `app`

### Alternative

Garder la landing sur Vercel et simplement la passer derrière le proxy Cloudflare (Phase 1). Résultat similaire avec moins d'effort.

## Phase 3 — Turnstile sur les formulaires publics (gratuit)

### Objectif

Protéger les points d'entrée publics contre le spam et les abus sans coût
significatif.

### Écrans/formulaires à couvrir

| Formulaire | Priorité | Côté |
|---|---|---|
| Contact landing | Haute | Landing |
| Demande de démo | Haute | Landing |
| Signup web | Haute | Web app |
| Login web | Moyenne | Web app |
| Reset password | Moyenne | Web app |
| OTP resend | Basse | Mobile (si exposé en web) |

### Stratégie

- widget Turnstile côté front
- validation serveur côté backend (`POST` vers `https://challenges.cloudflare.com/turnstile/v0/siteverify`)
- logs simples des échecs de vérification

### Bénéfices

- réduction du spam
- réduction des abus sur signup/login
- coût quasi nul (1M validations/mois gratuites)

## Phase 4 — Fonctions edge minimales (gratuit sous 100K req/jour)

### Objectif

Ajouter de petites fonctions Cloudflare sans toucher au cœur métier.

### Cas d'usage cibles

- validation serveur Turnstile
- endpoint public de pricing / cache de pricing
- redirections marketing intelligentes
- headers de sécurité et cache-control centralisés
- réponse légère pour health / public config si utile

### Ce qu'on fera

- utiliser Pages Functions ou Workers free tier
- garder ces fonctions très petites
- ne pas y déplacer la logique métier principale

### Ce qu'on ne fera pas

- pas de réécriture FastAPI
- pas de migration API complète vers Workers

## Phase 5 — R2 pour les fichiers non critiques (gratuit sous 10 GB)

### Objectif

Préparer un stockage objet simple pour les fichiers applicatifs.

### Fichiers cibles

| Type | Volume estimé | Priorité |
|------|---------------|----------|
| Exports CSV/Excel | Faible | Moyenne |
| Reçus PDF | Faible | Moyenne |
| Factures PDF | Faible | Moyenne |
| Images produits | Peut croître | Haute quand le volume le justifie |
| Pièces jointes fournisseurs | Faible | Basse |

### Stratégie

- démarrer seulement quand le besoin est réel
- garder les données métier dans Mongo/Railway
- utiliser R2 comme stockage fichiers, pas comme base métier
- servir les fichiers via un sous-domaine dédié (ex: `files.stockman.pro`)

### Bénéfices

- coût bas au début (10 GB gratuits)
- distribution plus simple des fichiers
- base propre pour documents et médias

## Phase 6 — AI Gateway (gratuit)

### Objectif

Mieux observer et contrôler les appels IA déjà présents dans le projet.

### Cas d'usage

- logs d'utilisation IA (Gemini, etc.)
- suivi du volume par feature / par plan
- limitation simple
- centralisation du trafic vers les modèles

### Stratégie

- brancher les appels IA backend dessus (`ai_governance.py`)
- ne pas changer le produit fonctionnel
- en faire une couche d'observabilité et de gouvernance

### Bénéfices

- meilleur suivi des coûts IA
- meilleure visibilité sur les appels
- base utile pour du throttling plus tard

## Ce qu'on laisse volontairement hors scope au début

- WAF payant avancé
- Browser Rendering
- Queues/Workflows à volume réel
- migration complète Next.js vers Workers
- migration complète FastAPI vers Workers
- KV comme source de vérité métier

## Répartition Cloudflare / Railway / Vercel

| Responsabilité | Service |
|---|---|
| DNS, proxy, CDN, SSL | Cloudflare |
| Landing publique | Vercel (migration Pages possible) |
| Turnstile anti-spam | Cloudflare |
| Petites fonctions edge | Cloudflare Workers |
| Stockage fichiers (futur) | Cloudflare R2 |
| Observabilité IA (futur) | Cloudflare AI Gateway |
| Application web (Next.js SSR) | Vercel |
| Backend FastAPI | Railway |
| Logique métier | Railway |
| Paiements (Stripe, Flutterwave, RevenueCat) | Railway |
| Base de données MongoDB | MongoDB Atlas |

## Ordre d'implémentation recommandé

| Étape | Phase | Coût | Effort |
|-------|-------|------|--------|
| 1. Configurer zone DNS Cloudflare | Phase 1 | Gratuit | 1h |
| 2. Pointer les domaines + tester SSL + CORS | Phase 1 | Gratuit | 2h |
| 3. (Optionnel) Migrer landing vers Pages | Phase 2 | Gratuit | 2h |
| 4. Ajouter Turnstile sur formulaires | Phase 3 | Gratuit | 3h |
| 5. Petites fonctions edge utiles | Phase 4 | Gratuit | 2h |
| 6. R2 pour documents | Phase 5 | Gratuit (<10GB) | 4h |
| 7. AI Gateway pour flux IA | Phase 6 | Gratuit | 2h |

## Checklist de validation

### Domaine et réseau

- [ ] `stockman.pro` répond correctement
- [ ] `app.stockman.pro` répond correctement
- [ ] `api.stockman.pro` répond correctement
- [ ] Certificats SSL valides
- [ ] Pas de boucle de redirection
- [ ] CORS fonctionne : `app.stockman.pro` → `api.stockman.pro`
- [ ] CORS fonctionne : app mobile → `api.stockman.pro`

### Landing

- [ ] Landing `stockman.pro` servie correctement (Vercel ou Pages)
- [ ] SEO/sitemap encore valides
- [ ] CTA vers `app.stockman.pro` corrects

### Turnstile

- [ ] Contact protégé
- [ ] Signup/login protégés
- [ ] Validation backend fonctionnelle
- [ ] Pas de blocage abusif des utilisateurs légitimes

### Cache

- [ ] API dynamique : `Cache-Control: no-store` vérifié
- [ ] Assets statiques : cache CDN actif
- [ ] Pas de données utilisateur en cache

### Edge

- [ ] Pricing public accessible
- [ ] Headers de sécurité corrects
- [ ] Cache cohérent

### Fichiers (quand R2 activé)

- [ ] Uploads/documents lisibles
- [ ] URLs stables
- [ ] Pas de fuite de fichiers privés

## Risques et garde-fous

- ne pas faire de Cloudflare la source de vérité métier
- ne pas cacher l'API dynamique (`Cache-Control: no-store` sur `/api/*`)
- ne pas migrer `app.stockman.pro` vers Pages (Next.js SSR incompatible)
- ne pas exposer de logique sensible dans des Workers improvisés
- garder FastAPI/Railway comme cœur du système tant que l'architecture actuelle est stable
- tester les CORS après activation du proxy sur chaque domaine

## Décision produit retenue

Le projet utilisera Cloudflare d'abord comme couche de distribution, protection et
support edge à faible coût, pas comme remplacement complet de Railway ou Vercel.

Le point de départ le plus rentable est :

1. `stockman.pro`, `app.stockman.pro` et `api.stockman.pro` derrière proxy Cloudflare
2. `Turnstile` sur les formulaires publics
3. Migration landing vers Pages si besoin (optionnel)

Le reste viendra ensuite, sans remise à plat du projet.
