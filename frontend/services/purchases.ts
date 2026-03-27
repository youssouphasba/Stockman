import { Platform } from 'react-native';

declare const require: (moduleName: string) => any;

let isInitialized = false;
let PurchasesSDK: any = null;

export type PurchaseFailureReason =
    | 'not_initialized'
    | 'offerings_unavailable'
    | 'package_not_found'
    | 'cancelled'
    | 'purchase_failed'
    | 'restore_failed'
    | 'no_active_purchase';

export type PurchaseResult =
    | { success: true; plan?: string }
    | { success: false; reason: PurchaseFailureReason };

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
        const purchasesModule = require('react-native-purchases');
        PurchasesSDK = purchasesModule.default ?? purchasesModule;
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

async function getPackageForProduct(productId: string) {
    const offerings = await PurchasesSDK.getOfferings();
    const currentOffering = offerings?.current;
    if (!currentOffering) {
        return { package: null, reason: 'offerings_unavailable' as const };
    }

    const matchedPackage = currentOffering.availablePackages?.find(
        (pkg: any) => pkg.product?.identifier === productId
    );

    if (!matchedPackage) {
        return { package: null, reason: 'package_not_found' as const };
    }

    return { package: matchedPackage, reason: null };
}

export async function purchaseStarter(): Promise<PurchaseResult> {
    if (!isPurchasesAvailable()) return { success: false, reason: 'not_initialized' };
    try {
        const { package: pkg, reason } = await getPackageForProduct(PRODUCT_IDS.starter);
        if (!pkg || reason) return { success: false, reason: reason ?? 'package_not_found' };
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        const hasStarter = customerInfo.entitlements.active[ENTITLEMENTS.starter];
        return { success: true, plan: hasPro ? 'pro' : hasStarter ? 'starter' : 'starter' };
    } catch (e: any) {
        if (e.userCancelled) return { success: false, reason: 'cancelled' };
        console.warn('RevenueCat purchaseStarter failed:', e);
        return { success: false, reason: 'purchase_failed' };
    }
}

export async function purchasePro(): Promise<PurchaseResult> {
    if (!isPurchasesAvailable()) return { success: false, reason: 'not_initialized' };
    try {
        const { package: pkg, reason } = await getPackageForProduct(PRODUCT_IDS.pro);
        if (!pkg || reason) return { success: false, reason: reason ?? 'package_not_found' };
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        return { success: true, plan: hasPro ? 'pro' : 'starter' };
    } catch (e: any) {
        if (e.userCancelled) return { success: false, reason: 'cancelled' };
        console.warn('RevenueCat purchasePro failed:', e);
        return { success: false, reason: 'purchase_failed' };
    }
}

export async function restorePurchases(): Promise<PurchaseResult> {
    if (!isPurchasesAvailable()) return { success: false, reason: 'not_initialized' };
    try {
        const customerInfo = await PurchasesSDK.restorePurchases();
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        const hasStarter = customerInfo.entitlements.active[ENTITLEMENTS.starter];
        const plan = hasPro ? 'pro' : hasStarter ? 'starter' : undefined;
        if (!plan) return { success: false, reason: 'no_active_purchase' };
        return { success: true, plan };
    } catch (e) {
        console.warn('RevenueCat restorePurchases failed:', e);
        return { success: false, reason: 'restore_failed' };
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
