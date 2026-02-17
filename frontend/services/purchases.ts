import { Platform } from 'react-native';

let isInitialized = false;

/**
 * Initialize RevenueCat SDK with the user's ID.
 * Must be called after login on native platforms.
 */
export async function initPurchases(userId: string): Promise<void> {
    if (isInitialized || Platform.OS === 'web') return;

    const apiKey =
        Platform.OS === 'ios'
            ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || ''
            : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

    if (!apiKey) {
        console.warn('RevenueCat: API key not configured, skipping init');
        return;
    }

    try {
        const Purchases = (await import('react-native-purchases')).default;
        Purchases.configure({ apiKey, appUserID: userId });
        isInitialized = true;
        console.log('RevenueCat initialized for user', userId);
    } catch (e) {
        console.warn('RevenueCat init failed (SDK may not be installed):', e);
    }
}

/**
 * Check if RevenueCat is available and initialized.
 */
export function isPurchasesAvailable(): boolean {
    return isInitialized && Platform.OS !== 'web';
}
