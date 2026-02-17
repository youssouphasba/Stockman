import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

type Props = {
    /** Feature name shown in the title */
    featureName: string;
    /** Description of what this feature does */
    description: string;
    /** List of benefits the user gets with Premium */
    benefits: string[];
    /** Icon name */
    icon?: string;
    /** If true, renders the gate. If false, renders children. */
    locked: boolean;
    children: React.ReactNode;
};

/**
 * Wraps a screen to gate it behind Premium plan.
 * Starter users see an informative upgrade message.
 * Premium users see the normal content.
 */
export default function PremiumGate({ featureName, description, benefits, icon = 'lock-closed', locked, children }: Props) {
    const router = useRouter();

    if (!locked) {
        return <>{children}</>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name={icon as any} size={48} color="#F59E0B" />
                </View>

                <Text style={styles.title}>{featureName}</Text>
                <Text style={styles.description}>{description}</Text>

                <View style={styles.benefitsCard}>
                    <Text style={styles.benefitsTitle}>Avec Premium, vous pouvez :</Text>
                    {benefits.map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <Text style={styles.benefitText}>{b}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/subscription')}
                    style={styles.upgradeButton}
                >
                    <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.gradient}>
                        <Ionicons name="diamond" size={20} color="white" />
                        <Text style={styles.upgradeText}>Passer à Premium</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.priceHint}>
                    3 mois gratuits, puis 2 500 FCFA/mois
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        maxWidth: 360,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FDE68A',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    benefitsCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    benefitsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    benefitText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    upgradeButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    upgradeText: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
    priceHint: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 12,
    },
});
