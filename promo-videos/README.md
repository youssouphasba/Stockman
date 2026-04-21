# Vidéos promotionnelles Stockman

Ce dossier contient un projet Remotion autonome pour créer des vidéos promotionnelles de Stockman (web app et mobile) à partir de captures réelles déjà présentes dans le projet.

Deux compositions sont disponibles :

- **stockman-webapp-promo** — tour des fonctionnalités de la web app (dashboard, stocks, POS, finance, clients, équipe).
- **stockman-mobile-promo** — tour des fonctionnalités de l'app mobile (dashboard, produits, caisse, finance, clients, fournisseurs).

Chaque composition est rendue en paysage (1920×1080) pour YouTube/landing/démo et en vertical (1080×1920) pour Reels/TikTok/Shorts.

## Prévisualiser gratuitement en local

```powershell
cd C:\Users\Utilisateur\projet_stock\promo-videos
npm install
npm run start
```

Remotion Studio s’ouvre dans le navigateur. Tu peux y lire la vidéo, ajuster le rendu et exporter si besoin.

## Générer les vidéos

### Web app

```powershell
npm run render:webapp
npm run render:webapp:vertical
```

### Mobile

```powershell
npm run render:mobile
npm run render:mobile:vertical
```

Les fichiers générés arrivent dans `out/`. Les formats paysage sont adaptés à YouTube, la landing et les démos commerciales. Les formats verticaux sont adaptés à TikTok, Reels, Shorts et WhatsApp Status.

## Règles de contenu

Les vidéos utilisent uniquement des captures réelles du projet. Aucun chiffre de performance, témoignage ou scénario commercial inventé n’est ajouté.

