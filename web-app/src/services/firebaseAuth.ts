import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  UserCredential,
} from 'firebase/auth';
import { app, hasFirebaseConfig } from './firebase';

const auth = app ? getAuth(app) : null;
const googleProvider = new GoogleAuthProvider();

async function getIdTokenFromCredential(result: UserCredential | null) {
  if (!result?.user) return null;
  return result.user.getIdToken();
}

function ensureFirebaseAuthReady(): Auth {
  if (!auth || !hasFirebaseConfig) {
    throw new Error('Firebase web auth is not configured.');
  }
  return auth;
}

export async function signInWithProvider(provider: 'google') {
  const readyAuth = ensureFirebaseAuthReady();
  const selected = googleProvider;
  try {
    const result = await signInWithPopup(readyAuth, selected);
    return await getIdTokenFromCredential(result);
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(readyAuth, selected);
      return null;
    }
    throw err;
  }
}

export async function completeRedirectSignIn() {
  if (!auth || !hasFirebaseConfig) {
    return null;
  }
  try {
    const result = await getRedirectResult(auth);
    return await getIdTokenFromCredential(result);
  } catch (err) {
    return null;
  }
}
