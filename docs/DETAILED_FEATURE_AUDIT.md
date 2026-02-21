# 🔍 Audit Technique Détaillé 2.0 : Stockman (Mobile vs Web)

Ce second audit approfondit l'analyse en scrutant la logique métier, la couverture des APIs et les services socles.

---

## 🏗️ 1. Comparaison de l'Architecture des Services (API Coverage)

L'écart technique le plus flagrant se situe au niveau du fichier `services/api.ts` :
*   **Mobile (`~1848 lignes`)** : Couverture quasi-totale de l'API backend (tickets, litiges, sécurité, logs, broadcast, system configs).
*   **Web (`~366 lignes`)** : Uniquement le périmètre "MVP" (Auth, Products, Sales, Customers, AI basique).

### 📉 Tableau Comparatif des Endpoints Supportés

| Module API | Supporté sur Mobile | Supporté sur Web | Importance pour l'alignement |
| :--- | :---: | :---: | :--- |
| **Auth / Profile** | ✅ Complet | ✅ Complet | - |
| **Inventaire / Stock** | ✅ Complet | ✅ Complet | - |
| **Ventes / POS** | ✅ Complet | ✅ Complet | - |
| **Statistiques / KPI** | ✅ Avancé | ✅ Standard | ⭐ |
| **Support (Tickets)** | ✅ Gestion Totale | ❌ Absent | ⭐⭐⭐ (Admin) |
| **Sécurité / Logs** | ✅ Monitoring | ❌ Absent | ⭐⭐ (Admin) |
| **Communication / Broadcast**| ✅ Envoi massif | ❌ Absent | ⭐⭐ |
| **Système (CGU/Privacy)** | ✅ Édition in-app | ❌ Lecture seule | ⭐ |

---

## 🤖 2. Intelligence Artificielle & Assistant

L'application mobile se comporte comme un véritable **assistant pro-actif**, là où le web reste un **outil de saisie réactif**.

### 📱 Spécificités Mobile (Manquantes sur Web) :
*   **AiDailySummary.tsx** : Résumé vocal/textuel de la journée dès l'ouverture.
*   **SmartRemindersCard.tsx** : Rappels intelligents basés sur les habitudes de vente.
*   **TipCard / useDailyTip** : Système de conseils quotidiens pour améliorer la rentabilité.
*   **ScreenGuide** : Tutoriels interactifs pour chaque écran (Guided Tour).

---

## 🛡️ 3. Résilience et Offline-First

| Caractéristique | Mobile (React Native) | Web (Next.js) |
| :--- | :--- | :--- |
| **Stockage** | `SecureStore` + `WatermelonDB` (Cache) | `localStorage` (Basique) |
| **Détection réseau** | `NetInfo` (Dynamique) | Aucun (Dépend du navigateur) |
| **Synchronisation** | `syncService` (File d'attente) | Aucun (Échec en cas de coupure) |
| **Feedback** | `OfflineBanner` | Aucun |

---

## 🛠️ 4. Analyse du Back-Office (Admin)

Le **Mobile Admin** est actuellement le véritable cerveau de gestion de la plateforme. Le **Web Admin** n'est qu'une interface de visualisation simplifiée.

### Fonctionnalités Admin ABSENTES du Web :
1.  **Gestion des Litiges (`Disputes`)** : Pas d'interface pour enquêter ou rejeter des litiges.
2.  **Broadcast Marketing** : Impossible d'envoyer un message à tous les utilisateurs depuis le web.
3.  **Logs de Sécurité** : Pas de visibilité sur les tentatives de connexion suspectes.
4.  **Support Client** : Le web ne permet pas de répondre aux tickets ouverts par les commerçants.

---

## 🎯 5. Roadmap Technique d'Alignement

Pour transformer le Web-App en un véritable ERP de classe mondiale (SAP-like), voici les priorités techniques :

### Étape 1 : Muscler le Service Layer (Immédiat)
- Recopier et adapter les services `tickets`, `security`, `broadcast` et `disputes` du mobile vers le web (`web-app/src/services/api.ts`).

### Étape 2 : Portail Admin Complet
- Créer les composants `SupportManager.tsx`, `DisputeManager.tsx` et `SecurityMonitor.tsx` sur le Web pour donner aux administrateurs le même pouvoir que sur mobile.

### Étape 3 : Pro-activité IA
- Porter le composant `AiDailySummary` et le système de `SmartReminders` sur le Dashboard Web pour offrir une expérience cohérente.

### Étape 4 : PWA & Offline
- Implémenter un `Service Worker` robuste pour permettre au POS Web de fonctionner même lors des coupures internet (fréquentes dans certaines zones).
