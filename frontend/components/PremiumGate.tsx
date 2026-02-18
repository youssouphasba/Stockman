import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
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
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, glassStyle } = useTheme();
    const { user } = useAuth();
    const currency = user?.currency || 'XOF';
    const price = currency === 'EUR' ? '7,99' : '2 500';
    const premiumPrice = t('premium.pricing_hint', {
        price,
        currency,
        period: t('subscription.per_month')
    });

    if (!locked) {
        return <>{children}</>;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                    <Ionicons name={icon as any} size={48} color={colors.primary} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>{featureName}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

                <View style={[styles.benefitsCard, glassStyle]}>
                    <Text style={[styles.benefitsTitle, { color: colors.text }]}>
                        {t('premium.with_premium_you_can') || 'Avec Premium, vous pouvez :'}
                    </Text>
                    {benefits.map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{b}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/subscription')}
                    style={styles.upgradeButton}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark || colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    >
                        <Ionicons name="star" size={20} color="white" />
                        <Text style={styles.upgradeText}>
                            {t('premium.upgrade_now') || 'Passer à Premium'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.priceHint}>
                    {premiumPrice}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    content: {
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        borderWidth: 2,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '900',
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    description: {
        fontSize: FontSize.md,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
    },
    benefitsCard: {
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        width: '100%',
        marginBottom: Spacing.xl,
    },
    benefitsTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        gap: 12,
    },
    benefitText: {
        fontSize: FontSize.sm,
        flex: 1,
    },
    upgradeButton: {
        width: '100%',
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    gradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: 10,
    },
    upgradeText: {
        color: 'white',
        fontSize: FontSize.md,
        fontWeight: 'bold',
    },
    priceHint: {
        fontSize: FontSize.xs,
        color: 'rgba(255,255,255,0.4)',
        marginTop: Spacing.md,
    },
});
