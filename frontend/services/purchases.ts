import { Platform } from 'react-native';

let isInitialized = false;
let PurchasesSDK: any = null;

const PRODUCT_IDS = {
    starter: 'prod8c5386b688',
    premium: 'prod2fdacd46f0',
};

const ENTITLEMENT_ID = 'premium';

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
        if (!pkg) {
            console.warn('Starter package not found in offerings');
            return { success: false };
        }
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        return { success: true, plan: hasEntitlement ? 'premium' : 'starter' };
    } catch (e: any) {
        if (e.userCancelled) return { success: false };
        console.warn('RevenueCat purchaseStarter failed:', e);
        return { success: false };
    }
}

export async function purchasePremium(): Promise<{ success: boolean; plan?: string }> {
    if (!isPurchasesAvailable()) return { success: false };
    try {
        const offerings = await PurchasesSDK.getOfferings();
        const pkg = offerings.current?.availablePackages?.find(
            (p: any) => p.product?.identifier === PRODUCT_IDS.premium
        );
        if (!pkg) {
            console.warn('Premium package not found in offerings');
            return { success: false };
        }
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        return { success: true, plan: hasEntitlement ? 'premium' : 'starter' };
    } catch (e: any) {
        if (e.userCancelled) return { success: false };
        console.warn('RevenueCat purchasePremium failed:', e);
        return { success: false };
    }
}

export async function restorePurchases(): Promise<{ success: boolean; plan?: string }> {
    if (!isPurchasesAvailable()) return { success: false };
    try {
        const customerInfo = await PurchasesSDK.restorePurchases();
        const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        return { success: true, plan: hasEntitlement ? 'premium' : 'starter' };
    } catch (e) {
        console.warn('RevenueCat restorePurchases failed:', e);
        return { success: false };
    }
}

export async function getCustomerInfo(): Promise<{ plan: string; expiresAt?: string } | null> {
    if (!isPurchasesAvailable()) return null;
    try {
        const customerInfo = await PurchasesSDK.getCustomerInfo();
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        if (entitlement) {
            return {
                plan: entitlement.productIdentifier === PRODUCT_IDS.premium ? 'premium' : 'starter',
                expiresAt: entitlement.expirationDate,
            };
        }
        return { plan: 'free' };
    } catch (e) {
        console.warn('RevenueCat getCustomerInfo failed:', e);
        return null;
    }
}
