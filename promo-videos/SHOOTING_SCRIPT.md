# Script de tournage — Vidéos promo Stockman

Objectif : enregistrer des clips d'écran réels (web + mobile) pour remplacer les screenshots statiques actuels. Chaque clip sera intégré dans Remotion via `<OffthreadVideo>`.

---

## 0. Préparation avant tournage

### Compte de démo (données remplies)
- URL web : `https://app.stockman.pro`
- Identifiants : `ysaerba@gmail.com` (plan enterprise, 2 boutiques, données peuplées)
- Avant de filmer : ouvrir chaque section **une fois** pour réchauffer le cache (dashboard, POS, accounting, CRM, stock). Les clips ne doivent pas montrer de spinners longs.

### Configuration écran (web)
- Résolution : **1920×1080** (Full HD, ratio 16:9)
- Navigateur : Chrome, plein écran (F11), fenêtre privée pour éviter extensions visibles
- Zoom navigateur : 100 %
- Cacher la barre des favoris (Ctrl+Shift+B)
- DevTools fermé, aucune notification OS active
- Curseur : souris normale, pas d'animation bleue — la frappe doit être lente et lisible

### Configuration enregistreur (web)
- **OBS Studio** : scène "Display Capture" → moniteur 1920×1080
- Base + Output Resolution : 1920×1080
- Framerate : **60 fps** (mouvements fluides sur dashboards)
- Encodage : x264, CRF 18, format MP4
- Audio : désactivé (voice-over ajouté en post dans Remotion)

### Configuration mobile
- Appareil : téléphone Android (1080×2400 natif)
- Enregistrement écran natif Android (Paramètres → Avancé → Enregistrement d'écran)
  OU via PC : `scrcpy --record clip.mp4 --max-fps 60`
- Plein écran, notifications coupées (mode Ne pas déranger)
- Luminosité au max pour éviter transcodage YUV sombre

### Convention de nommage
Déposer dans `promo-videos/public/recordings/` :
```
web-01-dashboard.mp4
web-02-ventes.mp4
web-03-pos.mp4
...
mobile-01-dashboard.mp4
mobile-02-pos.mp4
...
```

### Règles générales
- **Attendre 1,5 s après chargement** avant de cliquer (laisse le temps à Remotion de placer une annotation)
- **Mouvements lents** : un clic toutes les 1-1,5 s max
- **Pas de hover inutile** : la souris va droit au bouton
- **Si erreur pendant la prise** : ne pas arrêter, refaire un segment propre à la fin (Remotion pourra couper)
- **Durée brute = durée cible + 3 s** (marge pour couper début/fin)

---

## 1. Web — 13 clips (app.stockman.pro)

### Clip 1 — Dashboard (durée cible : 6 s)
- Vue : sidebar → "Tableau de bord" déjà actif
- Action :
  1. Depuis POS ou autre section, cliquer **"Tableau de bord"** dans la sidebar
  2. Attendre que cartes KPI apparaissent (CA, nb ventes, marge)
  3. Laisser tourner 3 s sur le graphe principal qui s'anime
- **Voice-over (post)** : « Votre activité en un coup d'œil : ventes, marges, tendances — mis à jour en temps réel. »

### Clip 2 — Détail ventes (7 s)
- Action :
  1. Sur le Dashboard, scroller jusqu'à la section **"Ventes récentes"**
  2. Cliquer sur une ligne de vente
  3. Le modal du reçu numérique s'ouvre, laisser 2 s
  4. Fermer le modal (X)
- **Voice-over** : « Chaque vente, tracée. Un clic pour réimprimer un reçu, rembourser, ou envoyer au client. »

### Clip 3 — POS / Encaissement (10 s)
- Action :
  1. Cliquer **"Point de vente"** dans la sidebar
  2. Cliquer 3 produits dans la grille (total monte)
  3. Modifier la quantité d'un produit (+1)
  4. Cliquer le bouton **"Payer"** / **"Encaisser"**
  5. Choisir mode Espèces → Valider
- **Voice-over** : « Encaissement en 10 secondes. Produits, quantités, paiement — tout est fluide, même hors ligne. »

### Clip 4 — Finance IA (10 s)
- Action :
  1. Cliquer **"Finance"** dans la sidebar
  2. Attendre chargement (KPIs : CA, marge brute, trésorerie)
  3. Cliquer le bouton **"Analyse IA"** (icône sparkles)
  4. Laisser la réponse se streamer pendant 4 s
- **Voice-over** : « L'IA lit vos chiffres et vous dit ce qui marche, ce qui freine, et ce qu'il faut faire ensuite. »

### Clip 5 — Rentabilité P&L (6 s)
- Action :
  1. Toujours sur Finance, scroller jusqu'au bloc **"Compte de résultat"** (P&L)
  2. Hover sur une barre du graphique → tooltip apparaît
  3. Changer la période (7j → 30j) via le sélecteur
- **Voice-over** : « Compte de résultat mensuel, coûts fixes, marge brute — tout est calculé pour vous. »

### Clip 6 — Stock (6 s)
- Action :
  1. Cliquer **"Stock"** dans la sidebar (sous-menu "Stock & Inventaire")
  2. Liste produits s'affiche
  3. Taper dans la barre de recherche → la liste se filtre
  4. Effacer, filtrer par catégorie (dropdown)
- **Voice-over** : « Votre stock complet, filtrable en un instant. Par catégorie, boutique, ou niveau critique. »

### Clip 7 — Inventaire / fiche produit (7 s)
- Action :
  1. Depuis la liste stock, cliquer sur un produit
  2. Le panneau de détail s'ouvre
  3. Cliquer l'onglet **"Historique"** ou **"Mouvements"**
  4. Laisser 2 s sur la liste des entrées/sorties
- **Voice-over** : « Chaque produit a une histoire : entrées, sorties, inventaires. Traçabilité totale. »

### Clip 8 — Alertes IA (6 s)
- Action :
  1. Cliquer **"Alertes"** dans la sidebar (sous Stock)
  2. Liste d'alertes (rupture, péremption, anomalie)
  3. Cliquer une alerte rupture → détail
- **Voice-over** : « L'IA détecte ruptures, péremptions, et anomalies avant que ça coûte de l'argent. »

### Clip 9 — Analyse ABC (5 s)
- Action :
  1. Cliquer **"Analyse ABC"** dans la sidebar (sous Stock)
  2. Camembert + tableau des produits classés A/B/C
  3. Laisser l'animation du graphe se terminer
- **Voice-over** : « Classement ABC automatique : où sont les 20 % de produits qui font 80 % du CA. »

### Clip 10 — CRM (7 s)
- Action :
  1. Cliquer **"Clients"** / **"CRM"** dans la sidebar
  2. Liste clients
  3. Cliquer un client VIP
  4. Fiche s'ouvre → onglet **"Historique achats"**
- **Voice-over** : « Vos clients, segmentés automatiquement : VIP, fidèles, à relancer. Marketing IA inclus. »

### Clip 11 — Planner (6 s)
- Action :
  1. Cliquer **"Planner"** dans la sidebar
  2. Vue calendrier + liste de rappels
  3. Cliquer **"Nouvelle note"** → modal s'ouvre
  4. Taper un titre → fermer (sans sauver)
- **Voice-over** : « Rappels, tâches, livraisons fournisseurs — tout votre pilotage dans un seul planner. »

### Clip 12 — Pilotage achats / Commandes (8 s)
- Action :
  1. Cliquer **"Commandes"** dans la sidebar
  2. Cliquer **"Nouvelle commande"** ou **"Générer avec IA"**
  3. Lignes produits se remplissent automatiquement
  4. Scroller pour montrer la liste
- **Voice-over** : « Besoin de commander ? L'IA regarde votre stock, vos ventes, et génère le bon de commande. »

### Clip 13 — Marketplace fournisseurs (6 s)
- Action :
  1. Cliquer **"Fournisseurs"** → **"Portail fournisseurs"** ou équivalent
  2. Liste de fournisseurs (cartes)
  3. Scroller doucement
  4. Cliquer une carte fournisseur → panneau détail
- **Voice-over** : « Marketplace intégrée : trouvez, comparez, et commandez auprès de nouveaux fournisseurs. »

---

## 2. Mobile — 6 clips (Android 1080×2400)

### Clip M1 — Dashboard mobile (5 s)
- Action :
  1. Ouvrir l'app Stockman sur l'onglet **Dashboard** (index.tsx)
  2. Pull-to-refresh → spinner → données à jour
  3. Scroller doucement sur les KPIs
- **Voice-over** : « Votre business dans la poche. Tous les chiffres, partout. »

### Clip M2 — POS scan (6 s)
- Action :
  1. Onglet **"POS"**
  2. Taper le bouton **"Scanner"** (icône code-barres)
  3. Pointer caméra vers un code-barres réel → produit ajouté au panier
  4. Taper **"Payer"**
- **Voice-over** : « Scannez, encaissez, imprimez. Même sans connexion. »

### Clip M3 — Ajout produit par photo (6 s)
- Action :
  1. Onglet **"Produits"** → bouton **"+"** (nouveau produit)
  2. Taper **"Photo IA"** ou équivalent
  3. Prendre photo d'un produit
  4. Champs (nom, prix, catégorie) se remplissent automatiquement
- **Voice-over** : « Ajoutez un produit en une photo. L'IA remplit nom, prix, catégorie. »

### Clip M4 — Alertes / Notifications (5 s)
- Action :
  1. Faire apparaître une notification push **"Produit en rupture"** (déclencher depuis admin)
  2. Depuis écran verrouillé → taper la notif
  3. L'app ouvre la page Alertes
- **Voice-over** : « L'IA vous alerte avant la rupture. Vous agissez avant de perdre des ventes. »

### Clip M5 — Multi-boutiques (swipe) (5 s)
- Action :
  1. Onglet Dashboard
  2. Dans le header, taper le sélecteur de boutique
  3. Choisir Boutique 2
  4. Données changent
- **Voice-over** : « Plusieurs boutiques ? Basculez d'un geste. Consolidation incluse. »

### Clip M6 — Finance mobile (5 s)
- Action :
  1. Onglet **"Finance"** / **"Accounting"**
  2. Afficher cards CA / Marge / Trésorerie
  3. Scroller → graphique P&L
- **Voice-over** : « Compta, marges, trésorerie : tout dans l'app mobile. »

---

## 3. Après tournage

### Checklist qualité
- [ ] 13 clips web + 6 clips mobile dans `promo-videos/public/recordings/`
- [ ] Chaque fichier MP4, H.264, < 50 Mo idéalement (sinon transcoder)
- [ ] Nommage exact selon convention ci-dessus
- [ ] Premier et dernier 0,5 s de chaque clip : pas de souris parasite

### Transcodage si besoin (ffmpeg)
```bash
ffmpeg -i raw.mp4 -c:v libx264 -crf 20 -preset medium -an -movflags +faststart clip.mp4
```
- `-an` : retire l'audio (voice-over ajouté en post)
- `-movflags +faststart` : lecture streaming fluide dans Remotion

### Ensuite côté Remotion
Je câblerai :
1. `<OffthreadVideo src={staticFile('recordings/web-XX.mp4')} />` à la place des `<Img>` dans `StockmanWebAppPromo.tsx` et `StockmanMobilePromo.tsx`
2. Annotations par-dessus (callouts, zooms sur zones clés, compteurs animés synchronisés avec le clic)
3. Voice-over final (TTS ou enregistrement) monté en track audio séparée

### Timing global
- Web promo : 13 × ~6,5s moyen = **~85 s** (un peu long, on pourra couper à 60-70 s en post)
- Mobile promo : 6 × ~5,5 s = **~33 s**

---

## 4. Pitfalls connus (à éviter pendant le tournage)

1. **Ne pas enregistrer avec l'inspecteur ouvert** — même fermé, un DevTools docké se voit dans la résolution
2. **Ne pas avoir de badge/bulle sur icône navigateur** (notifications extensions)
3. **Data peuplée, pas vide** — un graphique vide tue le clip. Vérifier Dashboard a au moins 10 ventes sur la période affichée
4. **Souris : pas de double-clic accidentel** sur les onglets sidebar (ils ont du feedback visuel)
5. **Police système** : si Windows affiche du flou ClearType exagéré, désactiver "smooth edges of fonts" le temps du tournage
6. **Mode sombre** : choisir **light** OU **dark** pour tous les clips — pas mélanger. Recommandation : **light** (cohérent avec landing page)
