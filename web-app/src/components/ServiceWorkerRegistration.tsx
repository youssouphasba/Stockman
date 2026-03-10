'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        let refreshed = false;

        const handleControllerChange = () => {
            if (refreshed) return;
            refreshed = true;
            window.location.reload();
        };

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

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        window.addEventListener('load', registerServiceWorker);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            window.removeEventListener('load', registerServiceWorker);
        };
    }, []);

    return null;
}
