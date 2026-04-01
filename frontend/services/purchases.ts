import { Platform } from 'react-native';

declare const require: (moduleName: string) => any;

let isInitialized = false;
let PurchasesSDK: any = null;

type PlanKey = 'starter' | 'pro';

export type PurchaseFailureReason =
    | 'not_initialized'
    | 'offerings_unavailable'
    | 'package_not_found'
    | 'cancelled'
    | 'billing_unavailable'
    | 'item_unavailable'
    | 'not_allowed'
    | 'network_error'
    | 'store_problem'
    | 'purchase_failed'
    | 'restore_failed'
    | 'no_active_purchase';

export type PurchaseResult =
    | { success: true; plan?: string }
    | { success: false; reason: PurchaseFailureReason; debugCode?: string };

const LEGACY_REVENUECAT_PRODUCT_IDS: Record<PlanKey, string> = {
    starter: process.env.EXPO_PUBLIC_REVENUECAT_STARTER_PRODUCT_ID?.trim() || '',
    pro: process.env.EXPO_PUBLIC_REVENUECAT_PRO_PRODUCT_ID?.trim() || '',
};

const ANDROID_REVENUECAT_PRODUCT_IDS: Record<PlanKey, string> = {
    starter:
        process.env.EXPO_PUBLIC_REVENUECAT_STARTER_PRODUCT_ID_ANDROID?.trim() ||
        LEGACY_REVENUECAT_PRODUCT_IDS.starter ||
        'stockman_starter_monthly:stockman-starter-monthly',
    pro:
        process.env.EXPO_PUBLIC_REVENUECAT_PRO_PRODUCT_ID_ANDROID?.trim() ||
        LEGACY_REVENUECAT_PRODUCT_IDS.pro ||
        'stockman_pro_monthly:stockman-pro-monthly',
};

const IOS_REVENUECAT_PRODUCT_IDS: Record<PlanKey, string> = {
    starter:
        process.env.EXPO_PUBLIC_REVENUECAT_STARTER_PRODUCT_ID_IOS?.trim() ||
        LEGACY_REVENUECAT_PRODUCT_IDS.starter ||
        'starter_monthly_V2',
    pro:
        process.env.EXPO_PUBLIC_REVENUECAT_PRO_PRODUCT_ID_IOS?.trim() ||
        LEGACY_REVENUECAT_PRODUCT_IDS.pro ||
        'pro_monthly_V2',
};

const ENTITLEMENTS: Record<PlanKey, string> = {
    starter: 'starter',
    pro: 'pro',
};

const PLAN_ALIASES: Record<PlanKey, string[]> = {
    starter: ['starter', 'basic', 'essential'],
    pro: ['pro', 'premium'],
};

function getExpectedProductId(plan: PlanKey): string {
    return Platform.OS === 'ios' ? IOS_REVENUECAT_PRODUCT_IDS[plan] : ANDROID_REVENUECAT_PRODUCT_IDS[plan];
}

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

function normalizeText(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

function matchesPlanAlias(value: unknown, plan: PlanKey): boolean {
    const normalized = normalizeText(value);
    if (!normalized) return false;
    return PLAN_ALIASES[plan].some((alias) => normalized.includes(alias));
}

function getAllOfferings(offerings: any): any[] {
    const list: any[] = [];
    if (offerings?.current) {
        list.push(offerings.current);
    }
    const fromAll = Object.values(offerings?.all || {});
    for (const entry of fromAll) {
        if (entry && !list.includes(entry)) {
            list.push(entry);
        }
    }
    return list;
}

function getAllPackages(offerings: any[]): any[] {
    const seen = new Set<string>();
    const packages: any[] = [];
    for (const offering of offerings) {
        const availablePackages = Array.isArray(offering?.availablePackages) ? offering.availablePackages : [];
        for (const pkg of availablePackages) {
            const productId = String(pkg?.product?.identifier || '');
            const pkgId = String(pkg?.identifier || '');
            const dedupeKey = `${pkgId}|${productId}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            packages.push(pkg);
        }
    }
    return packages;
}

function pickPreferredPackage(packages: any[]): any | null {
    if (!Array.isArray(packages) || packages.length === 0) return null;
    const monthly = packages.find((pkg) => {
        const packageType = String(pkg?.packageType || '').toUpperCase();
        const pkgIdentifier = normalizeText(pkg?.identifier);
        return packageType === 'MONTHLY' || pkgIdentifier.includes('monthly') || pkgIdentifier.includes('$rc_monthly');
    });
    return monthly || packages[0] || null;
}

function classifyPurchaseError(error: any): { reason: PurchaseFailureReason; debugCode?: string } {
    if (error?.userCancelled) {
        return { reason: 'cancelled', debugCode: String(error?.code || '') || undefined };
    }
    const rawCode = error?.code ?? error?.userInfo?.readableErrorCode ?? error?.userInfo?.readable_error_code;
    const debugCode = rawCode ? String(rawCode) : undefined;
    const upperCode = normalizeText(rawCode).toUpperCase();
    const message = normalizeText(error?.message);

    if (upperCode.includes('BILLING_UNAVAILABLE') || message.includes('billing unavailable')) {
        return { reason: 'billing_unavailable', debugCode };
    }
    if (
        upperCode.includes('PRODUCT_NOT_AVAILABLE') ||
        upperCode.includes('ITEM_UNAVAILABLE') ||
        message.includes('item unavailable') ||
        message.includes('not available for purchase')
    ) {
        return { reason: 'item_unavailable', debugCode };
    }
    if (upperCode.includes('PURCHASE_NOT_ALLOWED') || message.includes('not allowed')) {
        return { reason: 'not_allowed', debugCode };
    }
    if (upperCode.includes('NETWORK') || message.includes('network')) {
        return { reason: 'network_error', debugCode };
    }
    if (upperCode.includes('STORE_PROBLEM') || message.includes('store problem')) {
        return { reason: 'store_problem', debugCode };
    }
    return { reason: 'purchase_failed', debugCode };
}

async function getPackageForPlan(plan: PlanKey) {
    const offerings = await PurchasesSDK.getOfferings();
    const allOfferings = getAllOfferings(offerings);
    if (allOfferings.length === 0) {
        return { package: null, reason: 'offerings_unavailable' as const };
    }

    const allPackages = getAllPackages(allOfferings);
    const expectedProductId = getExpectedProductId(plan);
    const exactPackage = allPackages.find((pkg: any) => pkg?.product?.identifier === expectedProductId);
    if (exactPackage) {
        return { package: exactPackage, reason: null };
    }

    const matchingOffering = allOfferings.find((offering) => matchesPlanAlias(offering?.identifier, plan));
    if (matchingOffering) {
        const preferred = pickPreferredPackage(matchingOffering.availablePackages || []);
        if (preferred) {
            return { package: preferred, reason: null };
        }
    }

    const aliasedPackage = allPackages.find(
        (pkg: any) => matchesPlanAlias(pkg?.product?.identifier, plan) || matchesPlanAlias(pkg?.identifier, plan)
    );
    if (aliasedPackage) {
        return { package: aliasedPackage, reason: null };
    }

    console.warn('RevenueCat package not found', {
        plan,
        expectedProductId,
        availableProducts: allPackages.map((pkg: any) => pkg?.product?.identifier).filter(Boolean),
        availablePackageIds: allPackages.map((pkg: any) => pkg?.identifier).filter(Boolean),
    });
    return { package: null, reason: 'package_not_found' as const };
}

export async function purchaseStarter(): Promise<PurchaseResult> {
    if (!isPurchasesAvailable()) return { success: false, reason: 'not_initialized' };
    try {
        const { package: pkg, reason } = await getPackageForPlan('starter');
        if (!pkg || reason) return { success: false, reason: reason ?? 'package_not_found' };
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        const hasStarter = customerInfo.entitlements.active[ENTITLEMENTS.starter];
        return { success: true, plan: hasPro ? 'pro' : hasStarter ? 'starter' : 'starter' };
    } catch (e: any) {
        const failure = classifyPurchaseError(e);
        console.warn('RevenueCat purchaseStarter failed:', { reason: failure.reason, debugCode: failure.debugCode, message: e?.message });
        return { success: false, reason: failure.reason, debugCode: failure.debugCode };
    }
}

export async function purchasePro(): Promise<PurchaseResult> {
    if (!isPurchasesAvailable()) return { success: false, reason: 'not_initialized' };
    try {
        const { package: pkg, reason } = await getPackageForPlan('pro');
        if (!pkg || reason) return { success: false, reason: reason ?? 'package_not_found' };
        const { customerInfo } = await PurchasesSDK.purchasePackage(pkg);
        const hasPro = customerInfo.entitlements.active[ENTITLEMENTS.pro];
        return { success: true, plan: hasPro ? 'pro' : 'starter' };
    } catch (e: any) {
        const failure = classifyPurchaseError(e);
        console.warn('RevenueCat purchasePro failed:', { reason: failure.reason, debugCode: failure.debugCode, message: e?.message });
        return { success: false, reason: failure.reason, debugCode: failure.debugCode };
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
