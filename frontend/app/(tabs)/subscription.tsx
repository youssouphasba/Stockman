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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { subscription, SubscriptionData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { purchaseStarter, purchasePro, restorePurchases, isPurchasesAvailable } from '../../services/purchases';
import { COUNTRIES } from '../../constants/countries';

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
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>('pro');

    const legalReturnRoute = '/(tabs)/subscription';
    const isNative = Platform.OS !== 'web';
    const isIOS = Platform.OS === 'ios';
    const userCurrency = data?.currency || user?.currency || 'XOF';
    const useMobileMoney = data?.use_mobile_money ?? ['XOF', 'XAF', 'GNF', 'CDF'].includes(userCurrency);

    useEffect(() => {
        void fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            setLoading(true);
            const res = await subscription.getDetails();
            setData(res);
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const currentPlan = data?.plan;
    const isActive = data?.status === 'active';
    const isFreeTrial = data?.is_trial ?? false;
    const remainingDays = data?.remaining_days || 0;
    const accessPhase = data?.subscription_access_phase || 'active';
    const activePlanConfig = PLANS.find((plan) => plan.key === currentPlan);
    const selectedPlanConfig = PLANS.find((plan) => plan.key === selectedPlan) ?? PLANS[1];
    const isSelectedPlanCurrent = Boolean(isActive && !isFreeTrial && currentPlan === selectedPlan);
    const shouldShowPurchaseAction = selectedPlan !== 'enterprise' && !isSelectedPlanCurrent;
    const billingCountry = COUNTRIES.find((country) => country.code === (data?.country_code || user?.country_code)) || COUNTRIES[0];
    const selectedPrice = data?.effective_prices?.[selectedPlan]?.display_price || (
        useMobileMoney ? `${selectedPlanConfig.priceXOF} ${t('common.currency_default')}` : selectedPlanConfig.priceEUR
    );
    const storeLabel = isIOS ? t('subscription.store_app_store') : t('subscription.store_google_play');
    const headerGradient: [string, string] = activePlanConfig ? activePlanConfig.gradient : ['#3B82F6', '#2563EB'];
    const planLabel = activePlanConfig
        ? (t(activePlanConfig.labelKey) || activePlanConfig.key.charAt(0).toUpperCase() + activePlanConfig.key.slice(1))
        : t('subscription.plan_starter');

    const handleRevenueCatPurchase = async (plan: PlanKey) => {
        if (plan === 'enterprise') {
            Alert.alert(t('common.info'), 'Le plan Enterprise ne se souscrit pas directement depuis cet écran.');
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
            await subscription.sync();
            await fetchSubscription();
            Alert.alert(t('common.success'), t('subscription.activated_success'));
        } catch (error: any) {
            if (!error?.userCancelled) {
                Alert.alert(t('common.error'), t('subscription.payment_failed'));
            }
        } finally {
            setPayLoading(false);
        }
    };

    const handleEnterpriseContact = async () => {
        await WebBrowser.openBrowserAsync('https://app.stockman.pro/features');
    };

    const handleRestorePurchases = async () => {
        if (!isPurchasesAvailable()) {
            Alert.alert(t('common.info'), t('subscription.iap_not_available'));
            return;
        }
        try {
            setPayLoading(true);
            const result = await restorePurchases();
            if (result.success && result.plan && result.plan !== 'free') {
                await subscription.sync();
                await fetchSubscription();
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
            <LinearGradient colors={headerGradient} style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('subscription.title')}</Text>
                <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>
                        {planLabel}
                        {isFreeTrial ? ` (${t('subscription.free_trial')})` : ''}
                    </Text>
                </View>
                {isFreeTrial ? (
                    <Text style={styles.trialDaysText}>
                        {t('subscription.trial_remaining', { count: remainingDays })}
                    </Text>
                ) : null}
            </LinearGradient>

            <View style={styles.content}>
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
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Session démo active</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>
                            Type : {formatDemoTypeLabel(data.demo_type, t)} · Surface : {data.demo_surface || 'mobile'}
                        </Text>
                        {Platform.OS !== 'ios' ? (
                            <Text style={styles.helperText}>
                                Expiration : {data.demo_expires_at ? new Date(data.demo_expires_at).toLocaleString('fr-FR') : 'Non renseignée'}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {activePlanConfig ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Votre plan actuel</Text>
                        <View style={styles.currentPlanRow}>
                            <LinearGradient colors={activePlanConfig.gradient} style={styles.currentPlanIcon}>
                                <Ionicons name={activePlanConfig.icon as any} size={22} color="white" />
                            </LinearGradient>
                            <View style={styles.currentPlanCopy}>
                                <Text style={styles.currentPlanName}>{planLabel}</Text>
                                <Text style={styles.cardSubtitle}>
                                    {isFreeTrial
                                        ? `Essai gratuit en cours, ${remainingDays} jour(s) restant(s).`
                                        : isActive
                                            ? 'Plan actuellement actif sur votre compte.'
                                            : 'Aucun abonnement actif confirmé pour le moment.'}
                                </Text>
                            </View>
                        </View>
                        {data?.subscription_end ? (
                            <Text style={styles.renewalText}>
                                {t('subscription.renewal', { date: new Date(data.subscription_end).toLocaleDateString('fr-FR') })}
                                {data.subscription_provider === 'flutterwave' ? t('subscription.mobile_money_label') : ''}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('subscription.billing_country_title') || 'Pays et devise'}</Text>
                    <Text style={styles.cardSubtitle}>{t('subscription.billing_country_locked')}</Text>
                    <View style={styles.pickerWrapper}>
                        <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.pickerLabel}>{billingCountry.flag}</Text>
                        <Text style={styles.pickerValue}>{billingCountry.name} ({billingCountry.currency})</Text>
                    </View>
                    <Text style={styles.helperText}>
                        {t('subscription.billing_region', { region: data?.pricing_region || 'fallback' })}
                    </Text>
                    <Text style={styles.helperText}>{t('subscription.billing_country_support')}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Comparer les offres</Text>
                    <Text style={styles.cardSubtitle}>
                        Consultez votre formule actuelle et les autres plans avant de lancer un changement.
                    </Text>
                    <View style={styles.planCards}>
                        {PLANS.map((plan) => {
                            const price = data?.effective_prices?.[plan.key]?.display_price || (
                                useMobileMoney ? `${plan.priceXOF} ${t('common.currency_default')}` : plan.priceEUR
                            );
                            const isSelected = selectedPlan === plan.key;
                            const isCurrentPlan = currentPlan === plan.key && isActive && !isFreeTrial;
                            return (
                                <TouchableOpacity
                                    key={plan.key}
                                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                                    onPress={() => setSelectedPlan(plan.key)}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.planBadgeRow}>
                                        {isCurrentPlan ? (
                                            <View style={[styles.inlineBadge, styles.currentBadge]}>
                                                <Text style={[styles.inlineBadgeText, styles.currentBadgeText]}>Actuel</Text>
                                            </View>
                                        ) : null}
                                        {plan.key === 'pro' ? (
                                            <View style={[styles.inlineBadge, styles.popularBadgeInline]}>
                                                <Text style={styles.inlineBadgeText}>{t('subscription.popular')}</Text>
                                            </View>
                                        ) : null}
                                        {isIOS && plan.key === 'enterprise' ? (
                                            <View style={[styles.inlineBadge, styles.infoBadge]}>
                                                <Text style={[styles.inlineBadgeText, styles.infoBadgeText]}>Info</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <LinearGradient colors={plan.gradient} style={styles.planCardIcon}>
                                        <Ionicons name={plan.icon as any} size={22} color="white" />
                                    </LinearGradient>
                                    <Text style={styles.planCardName}>{t(plan.labelKey) || plan.key}</Text>
                                    <Text style={styles.planCardPrice}>
                                        {price}{t('subscription.per_month')}
                                    </Text>
                                    <View style={styles.planCardDetails}>
                                        <Text style={styles.planCardDetail}>• {plan.stores} {t('subscription.features.stores')}</Text>
                                        <Text style={styles.planCardDetail}>• {plan.users} {t('subscription.features.users')}</Text>
                                        <Text style={styles.planCardDetail}>
                                            • {plan.key === 'enterprise'
                                                ? 'Gestion web avancée, gouvernance multi-boutiques et accompagnement dédié.'
                                                : 'Gestion et paiement directement depuis l’application.'}
                                        </Text>
                                    </View>
                                    {isSelected ? (
                                        <View style={styles.selectedCheck}>
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {shouldShowPurchaseAction ? (
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
                                style={[styles.payButton, { backgroundColor: selectedPlanConfig.gradient[0] }]}
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
                        {Platform.OS === 'android' ? (
                            <Text style={styles.helperText}>{t('subscription.google_play_test_hint')}</Text>
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
                        {!isIOS ? (
                            <Text style={styles.helperText}>{t('subscription.external_payment_notice')}</Text>
                        ) : null}
                    </View>
                ) : null}

                {isSelectedPlanCurrent ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Plan déjà actif</Text>
                        <Text style={styles.cardSubtitle}>
                            Cette formule est déjà appliquée à votre compte. Sélectionnez une autre offre pour la comparer ou utilisez la restauration si vous réinstallez l’application.
                        </Text>
                    </View>
                ) : null}

                {selectedPlan === 'enterprise' ? (
                    <View style={styles.card}>
                        <View style={styles.enterpriseHeader}>
                            <Ionicons name="business-outline" size={24} color="#7C3AED" />
                            <Text style={[styles.sectionTitle, styles.enterpriseTitle]}>
                                {t('subscription.plan_enterprise') || 'Enterprise'}
                            </Text>
                        </View>
                        <Text style={styles.enterpriseDesc}>
                            {isIOS
                                ? 'Le plan Enterprise est destiné aux équipes multi-boutiques avec pilotage web avancé. Cette page présente l’offre sans afficher de parcours de paiement externe.'
                                : (t('subscription.enterprise_contact_desc') || 'Pour accéder au plan Enterprise, ouvrez la présentation dédiée sur le web.')}
                        </Text>
                        {isIOS ? (
                            <View style={styles.enterpriseInfoCard}>
                                <Text style={styles.enterpriseInfoText}>
                                    Assistance dédiée, gouvernance multi-sites, back-office web avancé et accompagnement au déploiement.
                                </Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.payButton, { backgroundColor: '#7C3AED' }]}
                                onPress={handleEnterpriseContact}
                            >
                                <Ionicons name="open-outline" size={22} color="white" />
                                <Text style={styles.payButtonText}>Découvrir Enterprise</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : null}

                {isNative ? (
                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
                        <Text style={styles.restoreText}>{t('subscription.restore_purchase')}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </ScrollView>
    );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    loadingBack: { position: 'absolute', top: 60, left: 20, flexDirection: 'row', alignItems: 'center' },
    loadingBackText: { color: colors.primary, marginLeft: 8 },
    header: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
    backButton: { position: 'absolute', left: 20, top: 55, zIndex: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    planBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    planBadgeText: { color: 'white', fontWeight: '600', fontSize: 14 },
    trialDaysText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 8 },
    content: { marginTop: -20, paddingHorizontal: 16 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
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
    currentPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    currentPlanIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentPlanCopy: { flex: 1 },
    currentPlanName: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    renewalText: { fontSize: 13, color: colors.textSecondary, marginTop: 10, lineHeight: 18 },
    pickerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.divider,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginTop: 4,
        gap: 10,
    },
    pickerLabel: { color: colors.text, fontSize: 18 },
    pickerValue: { color: colors.text, fontSize: 14, flex: 1 },
    planCards: { gap: 10 },
    planCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 2,
        borderColor: colors.glassBorder,
    },
    planCardSelected: {
        borderColor: colors.success,
        backgroundColor: isDark ? colors.success + '20' : '#F0FDF4',
    },
    planBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 22, marginBottom: 10 },
    inlineBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    inlineBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
    currentBadge: { backgroundColor: isDark ? 'rgba(16,185,129,0.22)' : '#DCFCE7' },
    currentBadgeText: { color: isDark ? '#FFFFFF' : '#166534' },
    popularBadgeInline: { backgroundColor: '#F59E0B' },
    infoBadge: { backgroundColor: isDark ? 'rgba(124,58,237,0.24)' : '#EDE9FE' },
    infoBadgeText: { color: isDark ? '#FFFFFF' : '#5B21B6' },
    planCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    planCardName: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    planCardPrice: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
    planCardDetails: { gap: 4 },
    planCardDetail: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    selectedCheck: { position: 'absolute', top: 12, right: 12 },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
        marginTop: 4,
    },
    payButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    legalHint: { fontSize: 12, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
    legalLinksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
    legalLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    legalSeparator: { color: colors.textMuted, fontSize: 13 },
    enterpriseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    enterpriseTitle: { marginBottom: 0, color: '#7C3AED' },
    enterpriseDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
    enterpriseInfoCard: {
        backgroundColor: isDark ? 'rgba(124,58,237,0.16)' : '#F5F3FF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(124,58,237,0.24)' : '#DDD6FE',
    },
    enterpriseInfoText: { color: colors.text, fontSize: 14, lineHeight: 20 },
    restoreButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
    restoreText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
});
