# Plan d'implementation - Guides video par onglet

## 1. Objectif
Mettre a disposition des guides video consultables dans chaque onglet de l'application (mobile et web), avec une gestion centralisee du contenu, des droits et de la publication.

## 2. Resultat attendu (V1)
- Un bouton "Guide video" accessible dans chaque onglet supporte.
- Une lecture fluide de la video (mobile et web).
- Un contenu administable (ajout, edition, activation, desactivation).
- Un fallback propre en cas d'absence de video.

## 3. Perimetre fonctionnel
- Cibles: `dashboard`, `stock`, `alertes`, `produits`, `fournisseurs`, `crm`, `comptabilite`, `parametres`.
- Support multilingue par video (`fr`, `en`, `ar`).
- Priorite de selection:
1. langue exacte utilisateur
2. langue `fr`
3. premiere video active disponible pour l'onglet

## 4. Modele de donnees
Collection: `guide_videos`

Champs recommandes:
- `guide_video_id` (string, unique)
- `tab_key` (string, indexe)
- `title` (string)
- `description` (string, optionnel)
- `lang` (string, indexe)
- `video_url` (string)
- `thumbnail_url` (string, optionnel)
- `duration_seconds` (int, optionnel)
- `is_active` (bool)
- `sort_order` (int)
- `visible_to_roles` (array, optionnel)
- `visible_to_plans` (array, optionnel)
- `created_at` (datetime)
- `updated_at` (datetime)

Indexes recommandes:
- `(tab_key, lang, is_active, sort_order)`
- `(is_active, updated_at)`

## 5. API backend
Routes V1:
- `GET /guide-videos?tab_key={tab}&lang={lang}`
- `GET /guide-videos/{guide_video_id}`
- `POST /admin/guide-videos`
- `PUT /admin/guide-videos/{guide_video_id}`
- `DELETE /admin/guide-videos/{guide_video_id}`
- `PUT /admin/guide-videos/{guide_video_id}/status`

Regles:
- Lecture: utilisateur authentifie.
- Ecriture admin: `org_admin` ou role admin plateforme.
- Validation URL stricte (`https` uniquement).

## 6. Integration mobile et web
### Mobile
- Ajouter un composant reutilisable `GuideVideoButton`.
- Ouvrir un `GuideVideoModal` avec player natif.
- Afficher le bouton en haut de chaque onglet supporte.

### Web
- Ajouter le meme composant logique dans les pages onglets.
- Player HTML5 ou composant video centralise.

## 7. Hebergement video
Recommandation:
- Stockage objet + CDN (S3/CloudFront, R2, Firebase Storage).
- Preferer HLS (`.m3u8`) pour adaptatif reseau.
- Garder MP4 en fallback.

Contraintes:
- Ne pas embarquer les videos dans le build.
- Taille cible par video: optimisee mobile.

## 8. UX
- Placement: action guide visible en haut de l'onglet.
- Etats:
  - Chargement
  - Video disponible
  - Video indisponible (message clair)
- Accessibilite:
  - Sous-titres recommandes
  - Controle pause/reprise

## 9. Analytics
Evenements a tracer:
- `guide_video_opened`
- `guide_video_play_started`
- `guide_video_play_completed`
- `guide_video_closed`
- `guide_video_error`

Dimensions:
- `tab_key`, `lang`, `guide_video_id`, `platform`, `app_version`, `user_role`, `plan`

## 10. Securite et gouvernance
- Validation stricte des URLs et des metadonnees.
- Controle des droits sur routes admin.
- Journalisation des operations admin (create/update/delete/status).

## 11. Plan de deploiement
Phase 1:
- Onglets prioritaires: `dashboard`, `stock`, `alertes`.
- 1 video FR par onglet.

Phase 2:
- Extension a tous les onglets cibles.
- Ajout langues EN/AR.

Phase 3:
- Personnalisation par plan et role.
- Recommandation contextuelle de guide.

## 12. Checklist QA
- Lecture video Android/iOS/Web.
- Ouverture/fermeture sans crash.
- Fallback correct sans video.
- Respect langue/fallback.
- Respect droits role/plan.
- Perf correcte sur reseau lent.

## 13. Livrables techniques
- Backend:
  - modele + indexes `guide_videos`
  - routes publiques et admin
  - logs d'audit
- Front mobile:
  - `GuideVideoButton`
  - `GuideVideoModal`
  - integration onglets
- Front web:
  - composants equivalents
  - integration onglets
- Documentation:
  - ce plan
  - guide d'exploitation contenu video
