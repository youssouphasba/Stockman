# Stockman 🦸‍♂️

Système complet de gestion de stock pour commerçants.

## Structure du Projet

- **`backend/`** : API FastAPI (Python). C'est ce dossier qu'il faut déployer sur Railway.
- **`frontend/`** : Application mobile Expo (React Native).
- **`landing-page/`** : Site vitrine (React + Vite).

## Déploiement sur Railway (Backend)

1. Connectez votre dépôt GitHub sur Railway.
2. Créez un nouveau service et pointez sur ce dépôt.
3. **IMPORTANT** : Dans les paramètres du service Railway, changez le **Root Directory** pour `backend`.
4. Ajoutez les variables d'environnement suivantes :
   - `MONGO_URL` : Votre URL de connexion MongoDB Atlas.
   - `JWT_SECRET` : Une chaîne aléatoire pour la sécurité.
   - `GOOGLE_API_KEY` : Votre clé API Gemini (pour l'IA).
   - `ENVIRONMENT` : `production`

## Développement Local

- Backend : `cd backend && python server.py`
- Frontend : `cd frontend && npx expo start`
- Landing Page : `cd landing-page && npm run dev`
