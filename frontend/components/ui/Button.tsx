import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

// Bouton partagé de l'application mobile.
// - primary : action principale de l'écran ou de la fenêtre ;
// - secondary : action neutre (annuler, fermer) ;
// - soft : action secondaire teintée de vert ;
// - danger : suppression ou action irréversible ;
// - ghost : action discrète, sans fond.
export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: keyof typeof Ionicons.glyphMap;
    loading?: boolean;
    disabled?: boolean;
    // Prend toute la largeur disponible.
    block?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };

export default function Button({ label, onPress, variant = 'primary', size = 'md', icon, loading = false, disabled = false, block = false, style, accessibilityLabel }: Props) {
    const { colors } = useTheme();
    const inactive = disabled || loading;
    const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
        primary: { bg: colors.primary, fg: '#FFFFFF' },
        secondary: { bg: colors.inputBg, fg: colors.text, border: colors.glassBorder },
        soft: { bg: colors.primary + '1A', fg: colors.primary },
        danger: { bg: colors.danger, fg: '#FFFFFF' },
        ghost: { bg: 'transparent', fg: colors.textSecondary },
    };
    const { bg, fg, border } = palette[variant];
    const fontSize = size === 'sm' ? FontSize.xs : FontSize.sm;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={inactive}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || label}
            accessibilityState={{ disabled: inactive, busy: loading }}
            style={[
                styles.base,
                { minHeight: HEIGHTS[size], paddingHorizontal: size === 'sm' ? Spacing.sm + 4 : Spacing.md, backgroundColor: bg },
                border ? { borderWidth: 1, borderColor: border } : null,
                block ? styles.block : null,
                inactive ? styles.inactive : null,
                style,
            ]}
        >
            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="small" color={fg} />
                ) : icon ? (
                    <Ionicons name={icon} size={size === 'sm' ? 14 : 18} color={fg} />
                ) : null}
                <Text style={[styles.label, { color: fg, fontSize }]} numberOfLines={1}>{label}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: { borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    block: { alignSelf: 'stretch' },
    inactive: { opacity: 0.5 },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    label: { fontWeight: '700' },
});
