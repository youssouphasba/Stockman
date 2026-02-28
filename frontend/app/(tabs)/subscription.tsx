import React, { useState, useEffect } from 'react';
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
import { purchaseStarter, purchasePro, restorePurchases, isPurchasesAvailable } from '../../services/purchases';

type PlanKey = 'starter' | 'pro' | 'enterprise';

type PlanConfig = {
    key: PlanKey;
    labelKey: string;
    gradient: [string, string];
    icon: string;
    stores: string;
    users: string;
    web: boolean;
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
        web: false,
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
        web: false,
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
        web: true,
        priceEUR: '14,99 €',
        priceXOF: '9 900',
    },
];

export default function SubscriptionScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>('pro');

    const userCurrency = user?.currency || 'XOF';
    const useMobileMoney = ['XOF', 'XAF', 'GNF', 'CDF'].includes(userCurrency);
    const isNative = Platform.OS !== 'web';

    useEffect(() => { fetchSubscription(); }, []);

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

    const handleRevenueCatPurchase = async (plan: PlanKey) => {
        if (!isPurchasesAvailable()) {
            Alert.alert(t('common.info'), t('subscription.iap_not_available'));
            return;
        }
        try {
            setPayLoading(true);
            const result = plan === 'pro'
                ? await purchasePro()
                : await purchaseStarter();
            if (result.success) {
                await subscription.sync();
                fetchSubscription();
                Alert.alert(t('common.success'), t('subscription.activated_success'));
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                Alert.alert(t('common.error'), t('subscription.payment_failed'));
            }
        } finally {
            setPayLoading(false);
        }
    };

    const handleFlutterwavePurchase = async (plan: PlanKey = selectedPlan) => {
        try {
            setPayLoading(true);
            const res = await subscription.checkout(plan);
            if (res.payment_url) {
                await WebBrowser.openBrowserAsync(res.payment_url);
                await subscription.sync();
                fetchSubscription();
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('subscription.payment_init_error') || 'Erreur lors de l\'initialisation du paiement.');
        } finally {
            setPayLoading(false);
        }
    };

    const handleEnterpriseContact = async () => {
        await WebBrowser.openBrowserAsync('https://app.stockman.pro/features');
    };

    const handleRestorePurchases = async () => {
        if (!isPurchasesAvailable()) return;
        try {
            setPayLoading(true);
            const result = await restorePurchases();
            if (result.success && result.plan && result.plan !== 'free') {
                await subscription.sync();
                fetchSubscription();
                Alert.alert(t('subscription.restored'), t('subscription.restored_success'));
            } else {
                Alert.alert(t('common.info'), t('subscription.no_purchase_found'));
            }
        } catch (e) {
            Alert.alert(t('common.error'), t('subscription.restore_error'));
        } finally {
            setPayLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <TouchableOpacity style={styles.loadingBack} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#3B82F6" />
                    <Text style={{ color: '#3B82F6', marginLeft: 8 }}>{t('common.back')}</Text>
                </TouchableOpacity>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const currentPlan = data?.plan;
    const isActive = data?.status === 'active';
    const isFreeTrial = data?.is_trial ?? false;
    const remainingDays = data?.remaining_days || 0;
    const activePlanConfig = PLANS.find(p => p.key === currentPlan);
    const selectedPlanConfig = PLANS.find(p => p.key === selectedPlan)!;
    const selectedPrice = useMobileMoney
        ? `${selectedPlanConfig.priceXOF} ${t('common.currency_default')}`
        : selectedPlanConfig.priceEUR;

    const headerGradient: [string, string] = activePlanConfig
        ? activePlanConfig.gradient
        : ['#3B82F6', '#2563EB'];

    const planLabel = activePlanConfig
        ? t(activePlanConfig.labelKey) || activePlanConfig.key.charAt(0).toUpperCase() + activePlanConfig.key.slice(1)
        : t('subscription.plan_starter');

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            {/* Header */}
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
                {isFreeTrial && (
                    <Text style={styles.trialDaysText}>
                        {t('subscription.trial_remaining', { count: remainingDays })}
                    </Text>
                )}
            </LinearGradient>

            <View style={styles.content}>
                {/* Plan Cards */}
                {(!isActive || isFreeTrial) && (
                    <View style={styles.planCards}>
                        {PLANS.map(plan => {
                            const price = useMobileMoney
                                    ? `${plan.priceXOF} ${t('common.currency_default')}`
                                    : plan.priceEUR;
                            const isSelected = selectedPlan === plan.key;
                            return (
                                <TouchableOpacity
                                    key={plan.key}
                                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                                    onPress={() => setSelectedPlan(plan.key)}
                                    activeOpacity={0.8}
                                >
                                    {plan.key === 'pro' && (
                                        <View style={styles.popularBadge}>
                                            <Text style={styles.popularText}>{t('subscription.popular')}</Text>
                                        </View>
                                    )}
                                    <LinearGradient
                                        colors={plan.gradient}
                                        style={styles.planCardIcon}
                                    >
                                        <Ionicons name={plan.icon as any} size={22} color="white" />
                                    </LinearGradient>
                                    <Text style={styles.planCardName}>
                                        {t(plan.labelKey) || plan.key}
                                    </Text>
                                    <Text style={styles.planCardPrice}>
                                        {price}{t('subscription.per_month')}
                                    </Text>
                                    <View style={styles.planCardDetails}>
                                        <Text style={styles.planCardDetail}>🏪 {plan.stores} {t('subscription.features.stores')}</Text>
                                        <Text style={styles.planCardDetail}>👥 {plan.users} {t('subscription.features.users')}</Text>
                                        {plan.web && <Text style={styles.planCardDetail}>🌐 {t('subscription.features.web_access') || 'Accès Web'}</Text>}
                                    </View>
                                    {isSelected && (
                                        <View style={styles.selectedCheck}>
                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Payment Buttons */}
                {(!isActive || isFreeTrial) && selectedPlan !== 'enterprise' && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            {t('subscription.choose_plan', { plan: t(selectedPlanConfig.labelKey) })}
                        </Text>

                        {useMobileMoney ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.payButton, styles.mobileMoneyButton]}
                                    onPress={() => handleFlutterwavePurchase(selectedPlan)}
                                    disabled={payLoading}
                                >
                                    {payLoading ? <ActivityIndicator size="small" color="white" /> : (
                                        <>
                                            <Ionicons name="phone-portrait-outline" size={22} color="white" />
                                            <Text style={styles.payButtonText}>{t('subscription.pay_mobile_money')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <Text style={styles.mmSubtext}>{t('subscription.mm_providers')}</Text>
                            </>
                        ) : (
                            isNative && (
                                <TouchableOpacity
                                    style={[styles.payButton, { backgroundColor: selectedPlanConfig.gradient[0] }]}
                                    onPress={() => handleRevenueCatPurchase(selectedPlan)}
                                    disabled={payLoading}
                                >
                                    {payLoading ? <ActivityIndicator size="small" color="white" /> : (
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
                            )
                        )}
                    </View>
                )}

                {/* Enterprise contact CTA */}
                {(!isActive || isFreeTrial) && selectedPlan === 'enterprise' && (
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Ionicons name="business-outline" size={24} color="#7C3AED" />
                            <Text style={[styles.sectionTitle, { marginBottom: 0, color: '#7C3AED' }]}>
                                {t('subscription.plan_enterprise') || 'Enterprise'}
                            </Text>
                        </View>
                        <Text style={styles.enterpriseDesc}>
                            {t('subscription.enterprise_contact_desc') || 'Pour accéder au plan Enterprise (Web + Mobile avancé), contactez-nous.'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.payButton, { backgroundColor: '#7C3AED' }]}
                            onPress={handleEnterpriseContact}
                        >
                            <Ionicons name="open-outline" size={22} color="white" />
                            <Text style={styles.payButtonText}>{'Accéder au plan Enterprise'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Restore */}
                {isNative && (!isActive || isFreeTrial) && (
                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
                        <Text style={styles.restoreText}>{t('subscription.restore_purchase')}</Text>
                    </TouchableOpacity>
                )}

                {/* Active plan info */}
                {isActive && !isFreeTrial && activePlanConfig && (
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('subscription.active')}</Text>
                        </View>
                        <Text style={styles.activeText}>
                            {t('subscription.premium_active_text')}
                        </Text>
                        {data?.subscription_end && (
                            <Text style={styles.renewalText}>
                                {t('subscription.renewal', { date: new Date(data.subscription_end).toLocaleDateString('fr-FR') })}
                                {data.subscription_provider === 'flutterwave' ? t('subscription.mobile_money_label') : ''}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
    loadingBack: { position: 'absolute', top: 60, left: 20, flexDirection: 'row', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
    backButton: { position: 'absolute', left: 20, top: 55, zIndex: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    planBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    planBadgeText: { color: 'white', fontWeight: '600', fontSize: 14 },
    trialDaysText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8 },
    content: { marginTop: -20, paddingHorizontal: 16 },

    // Plan Cards
    planCards: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    planCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    planCardSelected: { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
    planCardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    planCardName: { fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 2, textAlign: 'center' },
    planCardPrice: { fontSize: 11, color: '#6B7280', marginBottom: 8, textAlign: 'center' },
    planCardDetails: { width: '100%', gap: 3 },
    planCardDetail: { fontSize: 10, color: '#374151' },
    popularBadge: {
        position: 'absolute', top: -10, right: -10,
        backgroundColor: '#F59E0B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
    },
    popularText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
    selectedCheck: { position: 'absolute', top: 8, right: 8 },

    // Card
    card: {
        backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },

    // Payment
    payButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 12, gap: 10, marginBottom: 8,
    },
    mobileMoneyButton: { backgroundColor: '#10B981' },
    payButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    mmSubtext: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },
    restoreButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
    restoreText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },

    // Enterprise
    enterpriseDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 },

    // Active
    activeText: { fontSize: 15, color: '#059669', fontWeight: '500', lineHeight: 22 },
    renewalText: { fontSize: 13, color: '#6B7280', marginTop: 8 },
});
