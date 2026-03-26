import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  UserCredential,
} from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

async function getIdTokenFromCredential(result: UserCredential | null) {
  if (!result?.user) return null;
  return result.user.getIdToken();
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  const selected = provider === 'google' ? googleProvider : appleProvider;
  try {
    const result = await signInWithPopup(auth, selected);
    return await getIdTokenFromCredential(result);
  } catch (err: any) {
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, selected);
      return null;
    }
    throw err;
  }
}

export async function completeRedirectSignIn() {
  try {
    const result = await getRedirectResult(auth);
    return await getIdTokenFromCredential(result);
  } catch (err) {
    return null;
  }
}
