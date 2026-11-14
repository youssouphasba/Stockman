import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { subscription, SubscriptionData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { purchaseStarter, purchasePro, restorePurchases, isPurchasesAvailable } from '../../services/purchases';
import { COUNTRIES } from '../../constants/countries';
import { getFlagFromCountryCode } from '../../utils/flags';
import { openStockmanWebLogin } from '../../utils/openStockmanWebLogin';

type PlanKey = 'starter' | 'pro' | 'enterprise';

type PlanConfig = {
    key: PlanKey;
    labelKey: string;
    gradient: [string, string];
    icon: string;
    stores: string;
    users: string;
    priceEUR: string;
    priceXOF: string;
};

const PLANS: PlanConfig[] = [
    {
        key: 'starter',
        labelKey: 'subscription.plan_starter',
        gradient: ['#3B82F6', '#2563EB'],
        icon: 'storefront-outline',
        stores: '1',
        users: '1',
        priceEUR: '6,99 €',
        priceXOF: '2 500',
    },
    {
        key: 'pro',
        labelKey: 'subscription.plan_pro',
        gradient: ['#F59E0B', '#D97706'],
        icon: 'rocket-outline',
        stores: '2',
        users: '5',
        priceEUR: '9,99 €',
        priceXOF: '4 900',
    },
    {
        key: 'enterprise',
        labelKey: 'subscription.plan_enterprise',
        gradient: ['#7C3AED', '#5B21B6'],
        icon: 'business-outline',
        stores: '∞',
        users: '∞',
        priceEUR: '14,99 €',
        priceXOF: '9 900',
    },
];

const EXTRA_PLAN_BENEFITS = {
    pro: ['pro_team_benefit', 'advanced_catalog_audit', 'business_anomaly_detection'],
    enterprise: ['enterprise_benefits.stores', 'enterprise_benefits.team', 'enterprise_benefits.web', 'enterprise_benefits.analytics', 'enterprise_benefits.locations', 'enterprise_benefits.advanced_stock', 'enterprise_benefits.support'],
} as const;

function formatDemoTypeLabel(demoType: string | null | undefined, t: (key: string) => string) {
    switch (demoType) {
        case 'retail':
            return t('auth.login.demoRetail');
        case 'restaurant':
            return t('auth.login.demoRestaurant');
        case 'enterprise':
            return t('auth.login.demoEnterprise');
        default:
            return 'Démo';
    }
}

export default function SubscriptionScreen() {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, restoreSession, isBillingAdmin } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>('enterprise');

    const legalReturnRoute = '/(tabs)/subscription';
    const isNative = Platform.OS !== 'web';
    const isIOS = Platform.OS === 'ios';
    const userCurrency = data?.currency || user?.currency || 'XOF';
    const useMobileMoney = data?.use_mobile_money ?? ['XOF', 'XAF', 'GNF', 'CDF'].includes(userCurrency);

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const refreshSubscriptionState = useCallback(async (
        options: {
            syncServer?: boolean;
            showLoader?: boolean;
            expectedPlan?: PlanKey;
            purchasedPlan?: string;
            retries?: number;
        } = {}
    ) => {
        const { syncServer = false, showLoader = false, expectedPlan, purchasedPlan, retries = 0 } = options;
        try {
            if (showLoader) setLoading(true);

            let latest: SubscriptionData | null = null;
            for (let attempt = 0; attempt <= retries; attempt += 1) {
                if (syncServer && isNative) {
                    try {
                        await subscription.sync(purchasedPlan);
                    } catch (syncError) {
                        console.warn('Subscription sync failed:', syncError);
                    }
                }

                latest = await subscription.getDetails();
                setData(latest);
                await restoreSession();

                const matchedExpectedPlan = !expectedPlan || latest.plan === expectedPlan || latest.effective_plan === expectedPlan;
                if (matchedExpectedPlan) {
                    break;
                }

                if (attempt < retries) {
                    await wait(1200 * (attempt + 1));
                }
            }

            return latest;
        } catch (error) {
            console.error('Error fetching subscription:', error);
            return null;
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [isNative, restoreSession]);

    useEffect(() => {
        void refreshSubscriptionState({ showLoader: true });
    }, [refreshSubscriptionState]);

    useFocusEffect(
        useCallback(() => {
            void refreshSubscriptionState({ syncServer: isNative });
        }, [isNative, refreshSubscriptionState])
    );

    const currentPlan = data?.plan;
    const effectivePlan = data?.effective_plan || currentPlan;
    const isActive = data?.status === 'active';
    const isFreeTrial = data?.is_trial ?? false;
    const remainingDays = data?.remaining_days || 0;
    const accessPhase = data?.subscription_access_phase || 'active';
    const isEnterpriseManagedOnWeb = effectivePlan === 'enterprise' || currentPlan === 'enterprise';
    const activePlanConfig = PLANS.find((plan) => plan.key === currentPlan);
    const selectedPlanConfig = PLANS.find((plan) => plan.key === selectedPlan) ?? PLANS[1];
    const isSelectedPlanCurrent = Boolean(isActive && !isFreeTrial && currentPlan === selectedPlan);
    const shouldShowPurchaseAction = isBillingAdmin && !data?.is_demo && !isEnterpriseManagedOnWeb && selectedPlan !== 'enterprise' && !isSelectedPlanCurrent;
    const billingCountry = COUNTRIES.find((country) => country.code === (data?.country_code || user?.country_code)) || COUNTRIES[0];
    const getPlanPrice = (plan: PlanConfig) => data?.effective_prices?.[plan.key]?.display_price || (
        useMobileMoney ? `${plan.priceXOF} ${t('common.currency_default')}` : plan.priceEUR
    );
    const selectedPrice = getPlanPrice(selectedPlanConfig);
    const storeLabel = isIOS ? t('subscription.store_app_store') : t('subscription.store_google_play');
    const planLabel = activePlanConfig
        ? (t(activePlanConfig.labelKey) || activePlanConfig.key.charAt(0).toUpperCase() + activePlanConfig.key.slice(1))
        : t('subscription.plan_starter');

    const handleRevenueCatPurchase = async (plan: PlanKey) => {
        if (isEnterpriseManagedOnWeb) {
            Alert.alert(
                t('common.info'),
                t('subscription.enterprise_web_only', 'Le plan Enterprise se gère uniquement sur le web. Les changements de formule mobile ne sont pas disponibles pour ce compte.')
            );
            return;
        }
        if (plan === 'enterprise') {
            Alert.alert(t('common.info'), t('subscription.enterprise_not_here', 'Le plan Enterprise ne se souscrit pas directement depuis cet écran.'));
            return;
        }
        if (!isPurchasesAvailable()) {
            Alert.alert(t('common.info'), t('subscription.iap_not_available'));
            return;
        }
        try {
            setPayLoading(true);
            const result = plan === 'pro' ? await purchasePro() : await purchaseStarter();
            if (!result.success) {
                if (result.reason === 'cancelled') return;
                if (result.reason === 'already_owned') {
                    const restoreResult = await restorePurchases();
                    if (restoreResult.success) {
                        await refreshSubscriptionState({ syncServer: true, expectedPlan: restoreResult.plan as PlanKey, purchasedPlan: restoreResult.plan, retries: 2 });
                        Alert.alert(t('common.success'), t('subscription.restored_success'));
                        return;
                    }
                }
                const message = (
                    result.reason === 'offerings_unavailable' || result.reason === 'package_not_found'
                        ? t('subscription.purchase_not_ready')
                        : result.reason === 'billing_unavailable'
                            ? t('subscription.payment_billing_unavailable')
                            : result.reason === 'item_unavailable'
                                ? t('subscription.payment_item_unavailable')
                                : result.reason === 'not_allowed'
                                    ? t('subscription.payment_not_allowed')
                                    : result.reason === 'network_error'
                                        ? t('subscription.payment_network_error')
                                        : result.reason === 'store_problem'
                                            ? t('subscription.payment_store_error')
                                            : result.reason === 'not_initialized'
                                                ? t('subscription.iap_not_available')
                                                : t('subscription.payment_failed')
                );
                if (result.debugCode) {
                    console.warn('RevenueCat purchase failed with code:', result.debugCode);
                }
                Alert.alert(t('common.error'), message);
                return;
            }
            await refreshSubscriptionState({ syncServer: true, expectedPlan: result.plan as PlanKey, purchasedPlan: result.plan, retries: 2 });
            Alert.alert(t('common.success'), t('subscription.activated_success'));
        } catch (error: any) {
            if (!error?.userCancelled) {
                Alert.alert(t('common.error'), t('subscription.payment_failed'));
            }
        } finally {
            setPayLoading(false);
        }
    };

    const handleEnterpriseWeb = async () => {
        try {
            if (isNative) {
                await openStockmanWebLogin();
            } else {
                await WebBrowser.openBrowserAsync(new URL('/#subscription', Constants.expoConfig?.extra?.webAppUrl).toString());
            }
        } catch {
            Alert.alert(t('common.error'), t('subscription.web_open_error'));
        }
    };

    const handleRestorePurchases = async () => {
        if (isEnterpriseManagedOnWeb) {
            Alert.alert(
                t('common.info'),
                "Ce compte Enterprise est piloté sur le web. La restauration des achats intégrés mobile n'est pas utilisée pour cette formule."
            );
            return;
        }
        if (!isPurchasesAvailable()) {
            Alert.alert(t('common.info'), t('subscription.iap_not_available'));
            return;
        }
        try {
            setPayLoading(true);
            const result = await restorePurchases();
            if (result.success && result.plan && result.plan !== 'free') {
                await refreshSubscriptionState({ syncServer: true, expectedPlan: result.plan as PlanKey, purchasedPlan: result.plan, retries: 2 });
                Alert.alert(t('subscription.restored'), t('subscription.restored_success'));
            } else if (!result.success && result.reason === 'no_active_purchase') {
                Alert.alert(t('common.info'), t('subscription.no_purchase_found'));
            } else {
                Alert.alert(t('common.error'), t('subscription.restore_error'));
            }
        } catch {
            Alert.alert(t('common.error'), t('subscription.restore_error'));
        } finally {
            setPayLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <TouchableOpacity style={styles.loadingBack} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                    <Text style={styles.loadingBackText}>{t('common.back')}</Text>
                </TouchableOpacity>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCopy}>
                        <Text style={styles.headerTitle}>{t('subscription.title')}</Text>
                        {activePlanConfig ? (
                            <Text style={styles.cardSubtitle}>
                                {planLabel} · {isFreeTrial
                                    ? t('subscription.trial_remaining', { count: remainingDays, days: remainingDays })
                                    : isActive
                                        ? t('subscription.plan_active')
                                        : t('subscription.no_active_plan')}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View style={styles.planCards} accessibilityRole="tablist">
                    {PLANS.map((plan) => (
                        <TouchableOpacity
                            key={plan.key}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: selectedPlan === plan.key }}
                            style={[styles.planTab, plan.key === 'enterprise' && styles.recommendedTab, selectedPlan === plan.key && styles.planTabSelected]}
                            onPress={() => setSelectedPlan(plan.key)}
                        >
                            <Text style={styles.planTabName}>{t(plan.labelKey)}</Text>
                            <Text style={styles.planTabPrice}>{getPlanPrice(plan)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.planCard, selectedPlan === 'enterprise' && styles.recommendedCard]}>
                    <View style={styles.planBadgeRow}>
                        {selectedPlan === 'enterprise' && (
                            <Text style={styles.recommendedLabel}>{t('subscription.recommended')}</Text>
                        )}
                        {isSelectedPlanCurrent && <Text style={styles.currentLabel}>{t('subscription.current_plan')}</Text>}
                    </View>
                    <View style={styles.planHeading}>
                        <LinearGradient colors={selectedPlanConfig.gradient} style={styles.planCardIcon}>
                            <Ionicons name={selectedPlanConfig.icon as any} size={20} color="white" />
                        </LinearGradient>
                        <View style={styles.headerCopy}>
                            <Text style={styles.planCardName}>{t(selectedPlanConfig.labelKey)}</Text>
                            <Text style={styles.planCardPrice}>{selectedPrice}{t('subscription.per_month')}</Text>
                        </View>
                    </View>
                    <View style={styles.planCardDetails}>
                        {selectedPlan !== 'starter' && (
                            <Text accessibilityRole="header" style={styles.planCardName}>{t('subscription.beyond_starter')}</Text>
                        )}
                        {(selectedPlan === 'starter'
                            ? [
                                `${selectedPlanConfig.stores} ${t('subscription.features.stores')}`,
                                `${selectedPlanConfig.users} ${t('subscription.features.users')}`,
                                t('subscription.starter_operations_benefit'),
                            ]
                            : [
                                ...(selectedPlan === 'pro' ? [t('subscription.pro_store_limit', { count: Number(selectedPlanConfig.stores) })] : []),
                                ...EXTRA_PLAN_BENEFITS[selectedPlan].map((feature) => t(`subscription.${feature}`, { users: selectedPlanConfig.users })),
                            ]
                        ).map((feature) => (
                            <View key={feature} style={styles.featureRow}>
                                <Ionicons name="checkmark" size={17} color={colors.primary} />
                                <Text style={styles.planCardDetail}>{feature}</Text>
                            </View>
                        ))}
                    </View>
                    {selectedPlan === 'enterprise' && isBillingAdmin && !data?.is_demo ? (
                        <TouchableOpacity accessibilityRole="link" style={[styles.payButton, styles.enterpriseButton]} onPress={handleEnterpriseWeb}>
                            <Ionicons name="open-outline" size={18} color="white" />
                            <Text style={styles.payButtonText}>{t(isNative ? 'subscription.discover_enterprise' : 'subscription.enterprise_manage_web')}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {isNative && shouldShowPurchaseAction ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            {isActive && !isFreeTrial
                                ? (t('subscription.change_plan') || 'Changer de plan')
                                : t('subscription.choose_plan', { plan: t(selectedPlanConfig.labelKey) })}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                            {t('subscription.in_app_summary', {
                                plan: t(selectedPlanConfig.labelKey),
                                price: selectedPrice,
                                store: storeLabel,
                            })}
                        </Text>
                        {isNative ? (
                            <TouchableOpacity
                                style={[styles.payButton, { backgroundColor: selectedPlanConfig.gradient[1] }]}
                                onPress={() => handleRevenueCatPurchase(selectedPlan)}
                                disabled={payLoading}
                            >
                                {payLoading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
                                            size={22}
                                            color="white"
                                        />
                                        <Text style={styles.payButtonText}>
                                            {Platform.OS === 'ios' ? t('subscription.pay_app_store') : t('subscription.pay_google_play')}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : null}
                        <Text style={styles.legalHint}>{t('subscription.legal_links_hint')}</Text>
                        <View style={styles.legalLinksRow}>
                            <TouchableOpacity
                                onPress={() =>
                                    router.push({
                                        pathname: '/terms',
                                        params: { returnTo: legalReturnRoute },
                                    })
                                }
                            >
                                <Text style={styles.legalLink}>{t('common.terms')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.legalSeparator}>•</Text>
                            <TouchableOpacity
                                onPress={() =>
                                    router.push({
                                        pathname: '/privacy',
                                        params: { returnTo: legalReturnRoute },
                                    })
                                }
                            >
                                <Text style={styles.legalLink}>{t('common.privacy')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                {accessPhase !== 'active' ? (
                    <View style={[styles.card, styles.attentionCard]}>
                        <Text style={styles.sectionTitle}>Continuité d&apos;activité</Text>
                        <Text style={styles.cardSubtitle}>
                            Votre compte est actuellement en phase {accessPhase}. Vous pouvez continuer à utiliser l&apos;application sans perdre vos données, puis régulariser le paiement dès que possible.
                        </Text>
                        {data?.grace_until ? (
                            <Text style={styles.helperText}>
                                Fin de grâce : {new Date(data.grace_until).toLocaleDateString('fr-FR')}
                            </Text>
                        ) : null}
                        {data?.read_only_after ? (
                            <Text style={styles.helperText}>
                                Passage en lecture seule : {new Date(data.read_only_after).toLocaleDateString('fr-FR')}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {data?.is_demo ? (
                    <View style={[styles.card, styles.demoCard]}>
                        <View style={styles.demoHeader}>
                            <Ionicons name="time-outline" size={22} color="#38BDF8" />
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('subscription.demo_active', 'Session démo active')}</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>
                            Type : {formatDemoTypeLabel(data.demo_type, t)} · Surface : {data.demo_surface || 'mobile'}
                        </Text>
                        {Platform.OS !== 'ios' ? (
                            <Text style={styles.helperText}>
                                {t('subscription.expiration', 'Expiration')} : {data.demo_expires_at ? new Date(data.demo_expires_at).toLocaleDateString(i18n.language) : t('subscription.not_specified', 'Non renseignée')}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {data?.subscription_end && (
                    <Text style={styles.renewalText}>
                        {t('subscription.renewal', { date: new Date(data.subscription_end).toLocaleDateString(i18n.language) })}
                        {data.subscription_provider === 'flutterwave' ? t('subscription.mobile_money_label') : ''}
                    </Text>
                )}

                {isNative && isBillingAdmin && !data?.is_demo && !isEnterpriseManagedOnWeb ? (
                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
                        <Text style={styles.restoreText}>{t('subscription.restore_purchase')}</Text>
                    </TouchableOpacity>
                ) : null}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('subscription.billing_country_title')}</Text>
                    <View style={styles.pickerWrapper}>
                        <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.pickerLabel}>{getFlagFromCountryCode(billingCountry.code)}</Text>
                        <Text style={styles.pickerValue}>{billingCountry.name} ({billingCountry.currency})</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    loadingBack: { position: 'absolute', top: 60, left: 20, flexDirection: 'row', alignItems: 'center' },
    loadingBackText: { color: colors.primary, marginLeft: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerCopy: { flex: 1, minWidth: 0 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    content: { paddingHorizontal: 14, paddingTop: 8 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    attentionCard: {
        backgroundColor: isDark ? 'rgba(245,158,11,0.16)' : '#FEF3C7',
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    demoCard: {
        backgroundColor: isDark ? 'rgba(56,189,248,0.14)' : '#E0F2FE',
        borderWidth: 1,
        borderColor: '#38BDF8',
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    cardSubtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    helperText: { fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', marginTop: 8, lineHeight: 18 },
    demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    renewalText: { fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 18 },
    pickerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.divider,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginTop: 4,
        gap: 10,
    },
    pickerLabel: { color: colors.text, fontSize: 18 },
    pickerValue: { color: colors.text, fontSize: 14, flex: 1 },
    planCards: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    planTab: { flex: 1, minWidth: 0, minHeight: 54, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, paddingVertical: 5, borderWidth: 2, borderColor: colors.divider, borderRadius: 8 },
    recommendedTab: { backgroundColor: colors.card, borderColor: colors.primary },
    planTabSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5' },
    planTabName: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
    planTabPrice: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
    planCard: { backgroundColor: colors.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.divider, marginBottom: 12 },
    recommendedCard: { borderWidth: 2, borderColor: colors.primary, backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5' },
    planBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    recommendedLabel: { fontSize: 12, fontWeight: '700', color: isDark ? '#A7F3D0' : '#065F46', marginBottom: 6 },
    currentLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    planHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    planCardIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    planCardName: { fontSize: 16, fontWeight: '700', color: colors.text },
    planCardPrice: { fontSize: 14, color: colors.textSecondary },
    planCardDetails: { gap: 5, marginTop: 10 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    planCardDetail: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    enterpriseButton: { backgroundColor: '#065F46', marginTop: 12 },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
        marginTop: 4,
    },
    payButtonText: { flexShrink: 1, textAlign: 'center', color: 'white', fontSize: 16, fontWeight: 'bold' },
    legalHint: { fontSize: 12, color: colors.textMuted, marginTop: 12, textAlign: 'center', lineHeight: 17 },
    legalLinksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    legalLink: { color: colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    legalSeparator: { color: colors.textMuted, fontSize: 13 },
    restoreButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
    restoreText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});
