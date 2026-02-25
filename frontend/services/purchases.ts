import { Platform } from 'react-native';

let isInitialized = false;
let PurchasesSDK: any = null;

// RevenueCat product identifiers — à mettre à jour quand les IDs sont confirmés
const PRODUCT_IDS = {
    starter: 'prod8c5386b688',
    pro: 'prod2fdacd46f0',   // ancien 'premium', mappé sur Pro
};

const ENTITLEMENTS = {
    starter: 'starter',
    pro: 'pro',
};

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

    // RevenueCat SDK crashes in production build if a test key is used.
    // We skip initialization if we detect a test key unless we are in development.
    if (apiKey.startsWith('test_') && !__DEV__) {
        console.warn('RevenueCat: Test API key detected in production build. Skipping init to prevent crash.');
        return;
    }

    try {
        PurchasesSDK = (await import('react-native-purchases')).default;
        PurchasesSDK.configure({ apiKey, appUserID: userId });
        isInitialized = true;
        console.log('RevenueCat initialized for user', userId);
    } catch (e) {
        console.warn('RevenueCat init failed (SDK may not be installed):', e);
    }
}

export function isPurchasesAvailable(): boolean {
    return isInitialized && Platform.OS !== 'web';
}

export async function getOfferings() {
    if (!isPurchasesAvailable()) return null;
    try {
        const offerings = await PurchasesSDK.getOfferings();
        return offerings.current;
    } catch (e) {
        console.warn('RevenueCat getOfferings failed:', e);
        return null;
    }
}

export async function purchaseStarter(): Promise<{ success: boolean; plan?: string }> {
    if (!isPurchasesAvailable()) return { success: false };
    try {
        const offerings = await PurchasesSDK.getOfferings();
        const pkg = offerings.current?.availablePackages?.find(
            (p: any) => p.product?.identifier === PRODUCT_IDS.starter
        );
        if (!pkg) return { success: false };
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        const hasStarter = customerInfo.entitlements.active[ENTITLEMENTS.starter];
        return { success: true, plan: hasPro ? 'pro' : hasStarter ? 'starter' : 'starter' };
    } catch (e: any) {
        if (e.userCancelled) return { success: false };
        console.warn('RevenueCat purchaseStarter failed:', e);
        return { success: false };
    }
}

export async function purchasePro(): Promise<{ success: boolean; plan?: string }> {
    if (!isPurchasesAvailable()) return { success: false };
    try {
        const offerings = await PurchasesSDK.getOfferings();
        const pkg = offerings.current?.availablePackages?.find(
            (p: any) => p.product?.identifier === PRODUCT_IDS.pro
        );
        if (!pkg) return { success: false };
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        return { success: true, plan: hasPro ? 'pro' : 'starter' };
    } catch (e: any) {
        if (e.userCancelled) return { success: false };
        console.warn('RevenueCat purchasePro failed:', e);
        return { success: false };
    }
}

export async function restorePurchases(): Promise<{ success: boolean; plan?: string }> {
    if (!isPurchasesAvailable()) return { success: false };
    try {
        const customerInfo = await PurchasesSDK.restorePurchases();
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        const hasStarter = customerInfo.entitlements.active[ENTITLEMENTS.starter];
        const plan = hasPro ? 'pro' : hasStarter ? 'starter' : undefined;
        return { success: true, plan };
    } catch (e) {
        console.warn('RevenueCat restorePurchases failed:', e);
        return { success: false };
    }
}

export async function getCustomerInfo(): Promise<{ plan: string; expiresAt?: string } | null> {
    if (!isPurchasesAvailable()) return null;
    try {
        const customerInfo = await PurchasesSDK.getCustomerInfo();
        const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        const starterEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.starter];
        if (proEntitlement) {
            return { plan: 'pro', expiresAt: proEntitlement.expirationDate };
        }
        if (starterEntitlement) {
            return { plan: 'starter', expiresAt: starterEntitlement.expirationDate };
        }
        return { plan: 'free' };
    } catch (e) {
        console.warn('RevenueCat getCustomerInfo failed:', e);
        return null;
    }
}
