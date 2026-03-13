'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            return;
        }

        if (!('serviceWorker' in navigator)) {
            return;
        }

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                await registration.update();

                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            } catch (registrationError) {
                console.log('SW registration failed: ', registrationError);
            }
        };

        if (document.readyState === 'complete') {
            void registerServiceWorker();
        } else {
            window.addEventListener('load', registerServiceWorker, { once: true });
        }

        return () => {
            window.removeEventListener('load', registerServiceWorker);
        };
    }, []);

    return null;
}
