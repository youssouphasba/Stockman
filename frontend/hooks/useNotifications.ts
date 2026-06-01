import { useState, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { notifications as notificationsApi, PushInstallationPayload } from '../services/api';
import i18n from '../services/i18n';

const PUSH_INSTALLATION_ID_KEY = 'push-installation-id';

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
                    buildPushInstallationPayload(token).then(metadata => {
                        registerRef.current(token, metadata).catch(console.warn);
                    }).catch(console.warn);
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
            const deeplinkUrl = String(data?.deeplink_url || data?.url || '').trim();
            if (deeplinkUrl) {
                Linking.openURL(deeplinkUrl).catch(() => null);
                return;
            }
            const productId = data?.product_id || data?.productId;
            if (productId) {
                const params: Record<string, string> = {
                    product_id: String(productId),
                    source: 'notification',
                };
                if (data?.filter) params.filter = String(data.filter);
                if (data?.alert_id) params.alert_id = String(data.alert_id);
                if (data?.reminder_type) params.reminder_type = String(data.reminder_type);
                router.push({ pathname: '/(tabs)/products', params } as any);
                return;
            }
            const orderId = data?.order_id || data?.orderId;
            if (orderId) {
                const params: Record<string, string> = {
                    order_id: String(orderId),
                    source: String(data?.source || 'notification'),
                };
                if (data?.tab) params.tab = String(data.tab);
                if (data?.product_id) params.product_id = String(data.product_id);
                if (data?.reminder_type) params.reminder_type = String(data.reminder_type);
                router.push({ pathname: '/(tabs)/orders', params } as any);
                return;
            }
            const customerId = data?.customer_id || data?.customerId;
            if (customerId) {
                const params: Record<string, string> = { customer_id: String(customerId), source: 'notification' };
                if (data?.tab) params.tab = String(data.tab);
                if (data?.type === 'debt_recovery' || data?.type === 'customer_debt') params.tab = 'compte';
                router.push({ pathname: '/(tabs)/crm', params } as any);
                return;
            }
            const invoiceId = data?.invoice_id || data?.invoiceId;
            if (invoiceId) {
                router.push({ pathname: '/(tabs)/accounting', params: { invoice_id: String(invoiceId), source: 'notification' } } as any);
                return;
            }
            const ticketId = data?.ticket_id || data?.ticketId;
            if (ticketId) {
                router.push({ pathname: '/(tabs)/settings', params: { ticket_id: String(ticketId), source: 'notification' } } as any);
                return;
            }
            if (data?.screen === 'subscription' || data?.type === 'billing' || data?.type === 'subscription') {
                router.push({ pathname: '/(tabs)/subscription', params: { source: 'notification', reason: String(data?.reason || data?.type || '') } } as any);
                return;
            }
            if (data?.type === 'system_activation') {
                const scenario = String(data?.scenario || '');
                if (scenario === 'subscription_attention') {
                    router.push({ pathname: '/(tabs)/subscription', params: { source: 'notification', reason: scenario } } as any);
                    return;
                }
                if (scenario === 'add_first_products') {
                    router.push({ pathname: '/(tabs)/products', params: { source: 'notification', action: 'create' } } as any);
                    return;
                }
                if (scenario === 'first_sale') {
                    router.push({ pathname: '/(tabs)/pos', params: { source: 'notification' } } as any);
                    return;
                }
                if (scenario === 'reactivation') {
                    router.push({ pathname: '/(tabs)', params: { source: 'notification' } } as any);
                    return;
                }
            }
            if (data?.url) {
                Linking.openURL(String(data.url)).catch(() => null);
                return;
            }
            if (data?.screen === 'settings') {
                const params: Record<string, string> = { source: 'notification' };
                if (data?.section) params.section = String(data.section);
                router.push({ pathname: '/(tabs)/settings', params } as any);
                return;
            }
            if (data?.screen === 'home') {
                router.push({ pathname: '/(tabs)', params: { source: 'notification' } } as any);
                return;
            }
            if (data?.screen === 'orders') {
                router.push({ pathname: '/(tabs)/orders', params: { source: 'notification' } } as any);
                return;
            }
            if (data?.screen === 'pos') {
                router.push({ pathname: '/(tabs)/pos', params: { source: 'notification' } } as any);
                return;
            }
            if (data?.screen === 'crm') {
                const params: Record<string, string> = { source: 'notification' };
                if (data?.tab) params.tab = String(data.tab);
                router.push({ pathname: '/(tabs)/crm', params } as any);
                return;
            }
            if (data?.screen === 'accounting') {
                router.push({ pathname: '/(tabs)/accounting', params: { source: 'notification' } } as any);
                return;
            }
            if (data?.screen === 'subscription') {
                router.push({ pathname: '/(tabs)/subscription', params: { source: 'notification' } } as any);
                return;
            }
            if (data?.screen === 'alerts') {
                router.push('/(tabs)/alerts' as any);
                return;
            }
            if (data?.screen === 'products') {
                const filter = data?.filter;
                const params: Record<string, string> = { source: 'notification' };
                if (filter) params.filter = String(filter);
                if (data?.action) params.action = String(data.action);
                router.push({ pathname: '/(tabs)/products', params } as any);
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

export function useAnonymousPushRegistration(language?: string) {
    useEffect(() => {
        let cancelled = false;
        registerForPushNotificationsAsync().then(async token => {
            if (!token || cancelled) return;
            const payload = await buildPushInstallationPayload(token, language);
            if (!cancelled) {
                await notificationsApi.registerInstallation(payload);
            }
        }).catch(console.warn);
        return () => {
            cancelled = true;
        };
    }, [language]);
}

async function getPushInstallationId() {
    const existing = await AsyncStorage.getItem(PUSH_INSTALLATION_ID_KEY);
    if (existing) return existing;
    const created = `inst_${Crypto.randomUUID()}`;
    await AsyncStorage.setItem(PUSH_INSTALLATION_ID_KEY, created);
    return created;
}

async function buildPushInstallationPayload(token: string, languageOverride?: string): Promise<PushInstallationPayload> {
    const locales = getLocales();
    const locale = locales[0]?.languageTag || i18n.resolvedLanguage || i18n.language || 'fr';
    const language = (languageOverride || i18n.resolvedLanguage || i18n.language || locale || 'fr').split('-')[0];
    let timezone: string | undefined;
    try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch { }
    return {
        installation_id: await getPushInstallationId(),
        token,
        platform: Platform.OS,
        locale,
        language,
        country_code: locales[0]?.regionCode?.toUpperCase(),
        timezone,
        app_version: Constants.expoConfig?.version,
    };
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
