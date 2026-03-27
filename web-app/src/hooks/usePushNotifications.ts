import { useState, useEffect } from 'react';
import { messaging, getToken, onMessage } from '../services/firebase';

export function usePushNotifications() {
    const [token, setToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        try {
            if (!('Notification' in window)) {
                console.warn('Ce navigateur ne supporte pas les notifications.');
                return null;
            }

            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted' && messaging) {
                const currentToken = await getToken(messaging);

                if (currentToken) {
                    setToken(currentToken);
                    return currentToken;
                } else {
                    console.warn('Aucun token de registre disponible. Demandez une autorisation pour générer un token.');
                }
            } else {
                console.warn('Permission Push refusée.');
            }
        } catch (error) {
            console.error('Erreur lors de la demande de permission Push:', error);
        }
        return null;
    };

    const listenToMessages = (callback: (payload: any) => void) => {
        if (messaging) {
            return onMessage(messaging, (payload) => {
                console.log('Message reçu on foreground: ', payload);
                callback(payload);
            });
        }
        return () => {};
    };

    return { token, permission, requestPermission, listenToMessages };
}
