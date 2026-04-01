import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const isBrowser = typeof window !== 'undefined';
const browserHost = isBrowser ? window.location.host : '';
const useSameOriginAuthDomain =
    Boolean(browserHost) &&
    !browserHost.startsWith('localhost') &&
    !browserHost.startsWith('127.0.0.1');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: useSameOriginAuthDomain ? browserHost : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

// Firebase Auth / Messaging are browser-only in this app.
const app = isBrowser && hasFirebaseConfig
    ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
    : null;

let messaging: Messaging | null = null;
if (isBrowser && app && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.error('Firebase Messaging could not be initialized:', e);
    }
}

export { app, messaging, getToken, onMessage, hasFirebaseConfig };
