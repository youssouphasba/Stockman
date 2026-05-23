import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, Messaging } from 'firebase/messaging';

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

let messagingPromise: Promise<Messaging | null> | null = null;

function getMessagingInstance() {
    if (!isBrowser || !app || !('serviceWorker' in navigator)) {
        return Promise.resolve(null);
    }
    if (messagingPromise) {
        return messagingPromise;
    }
    messagingPromise = isSupported()
        .then((supported) => supported ? getMessaging(app) : null)
        .catch(() => null);
    return messagingPromise;
}

function clearMessagingInstance() {
    messagingPromise = null;
}

const messaging = null;

if (isBrowser && app && 'serviceWorker' in navigator) {
    try {
        void getMessagingInstance();
    } catch (e) {
        console.error('Firebase Messaging could not be initialized:', e);
    }
}

export { app, messaging, getMessagingInstance, clearMessagingInstance, getToken, onMessage, hasFirebaseConfig };
