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
import { purchaseStarter, purchasePremium, restorePurchases, isPurchasesAvailable } from '../../services/purchases';

type FeatureRow = {
    label: string;
    starter: string;
    premium: string;
};

const FEATURES: FeatureRow[] = [
    { label: 'subscription.features.products', starter: 'subscription.features.unlimited', premium: 'subscription.features.unlimited' },
    { label: 'subscription.features.stores', starter: '1', premium: 'subscription.features.unlimited' },
    { label: 'subscription.features.users', starter: '1', premium: 'subscription.features.unlimited' },
    { label: 'subscription.features.pos', starter: 'common.yes', premium: 'common.yes' },
    { label: 'subscription.features.pdf_receipts', starter: 'subscription.features.with_watermark', premium: 'subscription.features.custom_logo' },
    { label: 'subscription.features.reports', starter: 'subscription.features.30_days', premium: 'subscription.features.full_history' },
    { label: 'subscription.features.ai_assistant', starter: 'subscription.features.14_req_week', premium: 'subscription.features.unlimited' },
    { label: 'subscription.features.suppliers_orders', starter: 'subscription.features.consultation', premium: 'subscription.features.full_management' },
    { label: 'subscription.features.csv_import_export', starter: '—', premium: 'common.yes' },
    { label: 'subscription.features.crm_loyalty', starter: '—', premium: 'common.yes' },
    { label: 'subscription.features.sms_alerts', starter: '—', premium: 'common.yes' },
    { label: 'subscription.features.support', starter: 'subscription.features.email_24h', premium: 'subscription.features.whatsapp_2h' },
];

export default function SubscriptionScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<'starter' | 'premium'>('premium');

    const isEUR = user?.currency === 'EUR';
    const prices = {
        starter: isEUR ? '3,99 €' : `1 000 ${t('common.currency_default')}`,
        premium: isEUR ? '7,99 €' : `2 500 ${t('common.currency_default')}`,
    };

    useEffect(() => {
        fetchSubscription();
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

    const handleRevenueCatPurchase = async (plan: string) => {
        if (!isPurchasesAvailable()) {
            Alert.alert(t('common.info'), t('subscription.iap_not_available'));
            return;
        }
        try {
            setPayLoading(true);
            const result = plan === 'premium'
                ? await purchasePremium()
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

    const handleCinetPayPurchase = async () => {
        try {
            setPayLoading(true);
            const res = await subscription.initCinetPay();
            if (res.payment_url) {
                await WebBrowser.openBrowserAsync(res.payment_url);
                await subscription.sync();
                fetchSubscription();
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('subscription.cinetpay_init_error'));
        } finally {
            setPayLoading(false);
        }
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

    const currentPlan = data?.plan || 'starter';
    const isPremium = currentPlan === 'premium' && data?.status === 'active';
    const isFreeTrial = data?.is_trial ?? false;
    const remainingDays = data?.remaining_days || 0;
    const isNative = Platform.OS !== 'web';
    const selectedPrice = selectedPlan === 'premium' ? prices.premium : prices.starter;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            {/* Header */}
            <LinearGradient
                colors={isPremium ? ['#F59E0B', '#D97706'] : ['#3B82F6', '#2563EB']}
                style={[styles.header, { paddingTop: insets.top + 20 }]}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('subscription.title')}</Text>
                <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>
                        {isPremium ? t('subscription.plan_premium') : t('subscription.plan_starter')}
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
                {/* Plan Selector */}
                {!isPremium && (
                    <View style={styles.planSelector}>
                        <TouchableOpacity
                            style={[styles.planTab, selectedPlan === 'starter' && styles.planTabActive]}
                            onPress={() => setSelectedPlan('starter')}
                        >
                            <Text style={[styles.planTabText, selectedPlan === 'starter' && styles.planTabTextActive]}>
                                {t('subscription.plan_starter')}
                            </Text>
                            <Text style={[styles.planTabPrice, selectedPlan === 'starter' && styles.planTabTextActive]}>
                                {prices.starter}{t('subscription.per_month')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.planTab, selectedPlan === 'premium' && styles.planTabActivePremium]}
                            onPress={() => setSelectedPlan('premium')}
                        >
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularText}>{t('subscription.popular')}</Text>
                            </View>
                            <Text style={[styles.planTabText, selectedPlan === 'premium' && styles.planTabTextActive]}>
                                {t('subscription.plan_premium')}
                            </Text>
                            <Text style={[styles.planTabPrice, selectedPlan === 'premium' && styles.planTabTextActive]}>
                                {prices.premium}{t('subscription.per_month')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Trial info */}
                <View style={styles.trialBanner}>
                    <Ionicons name="gift-outline" size={20} color="#3B82F6" />
                    <Text style={styles.trialBannerText}>
                        {t('subscription.trial_banner', { price: selectedPrice })}
                    </Text>
                </View>

                {/* Feature Comparison Table */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('subscription.compare_plans')}</Text>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <View style={styles.tableColLabel} />
                        <View style={styles.tableColValue}>
                            <Text style={styles.tableHeaderText}>{t('subscription.plan_starter')}</Text>
                        </View>
                        <View style={styles.tableColValue}>
                            <Text style={[styles.tableHeaderText, { color: '#F59E0B' }]}>{t('subscription.plan_premium')}</Text>
                        </View>
                    </View>

                    {/* Feature Rows */}
                    {FEATURES.map((f, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                            <View style={styles.tableColLabel}>
                                <Text style={styles.featureLabel}>{t(f.label)}</Text>
                            </View>
                            <View style={styles.tableColValue}>
                                <Text style={[styles.featureValue, f.starter === '—' && styles.featureDisabled]}>
                                    {f.starter.includes('.') ? t(f.starter) : f.starter}
                                </Text>
                            </View>
                            <View style={styles.tableColValue}>
                                <Text style={[styles.featureValue, styles.featurePremium]}>
                                    {f.premium.includes('.') ? t(f.premium) : f.premium}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Payment Buttons */}
                {!isPremium && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            {t('subscription.choose_plan', { plan: selectedPlan === 'premium' ? t('subscription.plan_premium') : t('subscription.plan_starter') })}
                        </Text>

                        {isNative && (
                            <TouchableOpacity
                                style={[styles.payButton, selectedPlan === 'premium' ? styles.premiumBtn : styles.starterBtn]}
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
                        )}

                        {isNative && (
                            <View style={styles.divider}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>{t('common.or')}</Text>
                                <View style={styles.dividerLine} />
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.payButton, styles.mobileMoneyButton]}
                            onPress={handleCinetPayPurchase}
                            disabled={payLoading}
                        >
                            {payLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Ionicons name="phone-portrait-outline" size={22} color="white" />
                                    <Text style={styles.payButtonText}>{t('subscription.pay_mobile_money')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.mmSubtext}>{t('subscription.mm_providers')}</Text>
                    </View>
                )}

                {/* Restore */}
                {isNative && !isPremium && (
                    <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
                        <Text style={styles.restoreText}>{t('subscription.restore_purchase')}</Text>
                    </TouchableOpacity>
                )}

                {/* Premium active info */}
                {isPremium && (
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>{t('subscription.active')}</Text>
                        </View>
                        <Text style={styles.premiumActiveText}>
                            {t('subscription.premium_active_text')}
                        </Text>
                        {data?.subscription_end && (
                            <Text style={styles.renewalText}>
                                {t('subscription.renewal', { date: new Date(data.subscription_end).toLocaleDateString('fr-FR') })}
                                {data.subscription_provider === 'cinetpay' ? t('subscription.mobile_money_label') : ''}
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

    // Plan Selector
    planSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    planTab: {
        flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center',
        borderWidth: 2, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    planTabActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
    planTabActivePremium: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
    planTabText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
    planTabTextActive: { color: '#111827' },
    planTabPrice: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    popularBadge: {
        position: 'absolute', top: -10, right: -10,
        backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    },
    popularText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    // Trial Banner
    trialBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
        borderRadius: 12, padding: 12, marginBottom: 16, gap: 8,
        borderWidth: 1, borderColor: '#BFDBFE',
    },
    trialBannerText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },

    // Card
    card: {
        backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },

    // Feature Table
    tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: '#E5E7EB' },
    tableColLabel: { flex: 1.2 },
    tableColValue: { flex: 1, alignItems: 'center' },
    tableHeaderText: { fontSize: 13, fontWeight: 'bold', color: '#3B82F6' },
    tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#F3F4F6' },
    tableRowAlt: { backgroundColor: '#FAFAFA' },
    featureLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
    featureValue: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
    featureDisabled: { color: '#D1D5DB' },
    featurePremium: { color: '#059669', fontWeight: '500' },

    // Payment
    payButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 12, gap: 10,
    },
    starterBtn: { backgroundColor: '#3B82F6' },
    premiumBtn: { backgroundColor: '#F59E0B' },
    mobileMoneyButton: { backgroundColor: '#10B981' },
    payButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    mmSubtext: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },
    restoreButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 16 },
    restoreText: { color: '#3B82F6', fontSize: 14, fontWeight: '500' },

    // Premium Active
    premiumActiveText: { fontSize: 15, color: '#059669', fontWeight: '500', lineHeight: 22 },
    renewalText: { fontSize: 13, color: '#6B7280', marginTop: 8 },
});
