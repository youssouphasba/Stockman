import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
    /** Feature name shown in the title */
    featureName: string;
    /** Description of what this feature does */
    description: string;
    /** List of benefits the user gets with Enterprise */
    benefits: string[];
    /** Icon name */
    icon?: string;
    /** If true, renders the gate. If false, renders children. */
    locked: boolean;
    children: React.ReactNode;
};

/**
 * Wraps a screen/section to gate it behind Enterprise plan.
 * Starter/Pro users see an informative upgrade message.
 * Enterprise users see the normal content.
 */
export default function EnterpriseGate({ featureName, description, benefits, icon = 'business', locked, children }: Props) {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, glassStyle } = useTheme();

    if (!locked) {
        return <>{children}</>;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
            <View style={styles.content}>
                <View style={[styles.iconCircle, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED30' }]}>
                    <Ionicons name={icon as any} size={48} color="#7C3AED" />
                </View>

                <View style={styles.badge}>
                    <Ionicons name="star" size={12} color="white" />
                    <Text style={styles.badgeText}>Enterprise</Text>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>{featureName}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

                <View style={[styles.benefitsCard, glassStyle]}>
                    <Text style={[styles.benefitsTitle, { color: colors.text }]}>
                        {t('enterprise.with_enterprise_you_can') || 'Avec Enterprise, vous pouvez :'}
                    </Text>
                    {Array.isArray(benefits) && benefits.map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />
                            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{b}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={() => router.push('/subscription')}
                    style={styles.upgradeButton}
                >
                    <LinearGradient
                        colors={['#7C3AED', '#5B21B6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    >
                        <Ionicons name="business" size={20} color="white" />
                        <Text style={styles.upgradeText}>
                            {t('enterprise.upgrade_now') || 'Passer à Enterprise'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
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
        marginBottom: Spacing.md,
        borderWidth: 2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7C3AED',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
        marginBottom: Spacing.md,
    },
    badgeText: {
        color: 'white',
        fontSize: FontSize.xs,
        fontWeight: 'bold',
        letterSpacing: 1,
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
});
