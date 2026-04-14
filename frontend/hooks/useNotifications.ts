import { useState, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function useNotifications(userId?: string, onNotificationsChanged?: () => void) {
    const [expoPushToken, setExpoPushToken] = useState('');
    const { registerPushTokenForStoredAccounts } = useAuth();
    const notificationListener = useRef<any>(null);
    const responseListener = useRef<any>(null);
    const registerRef = useRef(registerPushTokenForStoredAccounts);
    const onChangedRef = useRef(onNotificationsChanged);
    registerRef.current = registerPushTokenForStoredAccounts;
    onChangedRef.current = onNotificationsChanged;

    useEffect(() => {
        if (userId) {
            registerForPushNotificationsAsync().then(token => {
                if (token) {
                    setExpoPushToken(token);
                    registerRef.current(token).catch(console.warn);
                }
            });
        }

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification Received:', notification);
            onChangedRef.current?.();
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as any;
            onChangedRef.current?.();
            if (data?.url) {
                Linking.openURL(String(data.url)).catch(() => null);
                return;
            }
            if (data?.screen === 'alerts') {
                router.push('/(tabs)/alerts' as any);
                return;
            }
            if (data?.screen === 'products') {
                const filter = data?.filter;
                if (filter) {
                    router.push(`/(tabs)/products?filter=${filter}` as any);
                } else {
                    router.push('/(tabs)/products' as any);
                }
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [userId]);

    return { expoPushToken };
}

async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'web') return;

    // Expo SDK 53+ removed remote push notifications from Expo Go.
    // We check if we are in Expo Go to avoid a crash/warnings.
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (isExpoGo) {
        console.log('Skipping push notification registration in Expo Go (dev only)');
        return null;
    }

    if (Device.isDevice) {
        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Push permission not granted.');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            })).data;
            console.log('Expo push token acquired:', token);
        } catch (error) {
            console.warn('Error fetching push token:', error);
            return null;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
