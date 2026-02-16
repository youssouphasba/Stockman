import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser'; // Add this
import { subscription, SubscriptionData } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';

export default function SubscriptionScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SubscriptionData | null>(null);

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
            Alert.alert('Erreur', 'Impossible de charger les informations d\'abonnement');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        try {
            setLoading(true);
            const res = await subscription.subscribe();
            if (res.payment_url) {
                // Open the payment link (Stripe or Mobile Money Gateway)
                await WebBrowser.openBrowserAsync(res.payment_url);
                // On return, refresh specific details (or listen to deep link)
                // For now, simpler refresh
                fetchSubscription();
            }
        } catch (error) {
            Alert.alert("Erreur", "Impossible d'initialiser le paiement");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    const isTrial = data?.plan === 'trial';
    const remainingDays = data?.remaining_days || 0;
    const progress = isTrial ? Math.max(0, Math.min(1, (60 - remainingDays) / 60)) : 1;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {/* Header */}
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mon Abonnement</Text>
                <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>
                        {isTrial ? "Mois d'essai" : "Offre Premium"}
                    </Text>
                </View>
            </LinearGradient>

            <View style={styles.content}>
                {/* Status Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name={isTrial ? "time-outline" : "checkmark-circle"} size={24} color="#3B82F6" />
                        <Text style={styles.cardTitle}>Statut de l'offre</Text>
                    </View>

                    {isTrial ? (
                        <>
                            <Text style={styles.trialText}>
                                Il vous reste <Text style={styles.daysBold}>{remainingDays}</Text> jours d'essai gratuit.
                            </Text>
                            <View style={styles.progressBarContainer}>
                                <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                            </View>
                            <Text style={styles.trialSubtext}>Profitez de toutes les fonctionnalités Stockman sans limite.</Text>
                        </>
                    ) : (
                        <Text style={styles.premiumText}>Votre abonnement est actif. Merci de votre confiance !</Text>
                    )}
                </View>

                {/* Benefits Card */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Avantages Stockman</Text>
                    <View style={styles.benefitRow}>
                        <Ionicons name="infinite" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Gestion de stock illimitée</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <Ionicons name="people" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>CRM et fidélité client</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <Ionicons name="bar-chart" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Statistiques détaillées</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <Ionicons name="cloud-upload" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>Synchronisation Cloud 24/7</Text>
                    </View>
                    <View style={styles.benefitRow}>
                        <Ionicons name="sparkles" size={20} color="#10B981" />
                        <Text style={styles.benefitText}>IA Gemini (Assistance intelligente)</Text>
                    </View>
                </View>

                {/* Action Button */}
                {isTrial && (
                    <TouchableOpacity
                        style={styles.premiumButton}
                        onPress={handleSubscribe}
                    >
                        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.gradientButton}>
                            <Text style={styles.premiumButtonText}>
                                {user?.currency === 'EUR' ? 'Payer avec Stripe' : 'Payer avec Mobile Money'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
                    <Text style={styles.infoText}>
                        Prix de l'abonnement : {user?.currency === 'EUR' ? '4.99 €' : '2 000 FCFA'} / mois. Sans engagement.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingInline: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 55,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    planBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    planBadgeText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    content: {
        marginTop: -20,
        paddingInline: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#111827',
    },
    trialText: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
        marginBottom: 15,
    },
    daysBold: {
        fontWeight: 'bold',
        color: '#3B82F6',
        fontSize: 20,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 4,
    },
    trialSubtext: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 5,
    },
    premiumText: {
        fontSize: 16,
        color: '#059669',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 15,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    benefitText: {
        fontSize: 15,
        color: '#4B5563',
        marginLeft: 12,
    },
    premiumButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
    },
    gradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    premiumButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 8,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        marginLeft: 10,
        lineHeight: 18,
    },
});
