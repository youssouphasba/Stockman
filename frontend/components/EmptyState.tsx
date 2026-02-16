import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

interface Props {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon = 'search-outline', title, message, actionLabel, onAction }: Props) {
    const { colors, glassStyle } = useTheme();

    return (
        <View style={[styles.container, glassStyle]}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={icon} size={48} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onAction}
                >
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.xl,
        borderWidth: 1,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        marginBottom: Spacing.xs,
        textAlign: 'center',
    },
    message: {
        fontSize: FontSize.md,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        opacity: 0.8,
    },
    button: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    buttonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '600',
    },
});
