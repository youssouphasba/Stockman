import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
    message?: string;
    onRetry?: () => void;
};

/**
 * Displayed when a 403 Forbidden error is returned by the API.
 * Shown to staff users who lack the required permission for the screen.
 */
export default function AccessDenied({ message, onRetry }: Props) {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, glassStyle } = useTheme();

    const displayMessage = message || t('errors.access_denied') || 'Accès refusé. Contactez votre manager.';

    return (
        <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
            <View style={[styles.card, glassStyle]}>
                <View style={[styles.iconCircle, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                    <Ionicons name="lock-closed" size={40} color="#EF4444" />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>
                    {t('errors.access_denied_title') || 'Accès restreint'}
                </Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                    {displayMessage}
                </Text>
                <View style={styles.actions}>
                    {onRetry && (
                        <TouchableOpacity
                            style={[styles.retryButton, { borderColor: colors.primary }]}
                            onPress={onRetry}
                        >
                            <Ionicons name="refresh" size={16} color={colors.primary} />
                            <Text style={[styles.retryText, { color: colors.primary }]}>
                                {t('common.retry') || 'Réessayer'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={16} color="white" />
                        <Text style={styles.backText}>
                            {t('common.back') || 'Retour'}
                        </Text>
                    </TouchableOpacity>
                </View>
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
    card: {
        alignItems: 'center',
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        maxWidth: 360,
        width: '100%',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        borderWidth: 2,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    message: {
        fontSize: FontSize.md,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    retryButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        gap: 6,
    },
    retryText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    backButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: BorderRadius.md,
        gap: 6,
    },
    backText: {
        color: 'white',
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
