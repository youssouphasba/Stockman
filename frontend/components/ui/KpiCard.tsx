import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { FontSize, Spacing } from '../../constants/theme';
import AnimatedCounter from '../AnimatedCounter';
import KpiInfoButton from '../KpiInfoButton';

// Carte d'indicateur partagée (accueil, superadmin). La largeur et les marges viennent de l'écran via `style`.
type Props = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
    color: string;
    info?: string;
    // Anime les valeurs numériques ; le suffixe (ex. devise) suit le chiffre.
    animate?: boolean;
    suffix?: string;
    compact?: boolean;
    style?: StyleProp<ViewStyle>;
};

export default function KpiCard({ icon, label, value, color, info, animate = false, suffix = '', compact = false, style }: Props) {
    const { colors, glassStyle } = useTheme();
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value;
    const showCounter = animate && !Number.isNaN(numericValue);
    const iconSize = compact ? 42 : 48;
    const valueStyle = [styles.value, { color: colors.text, fontSize: compact ? 20 : FontSize.xl }];

    return (
        <View style={[glassStyle, styles.card, { minHeight: compact ? 126 : 142, padding: compact ? Spacing.sm : Spacing.md }, style]}>
            {info ? <KpiInfoButton info={info} /> : null}
            <View style={[styles.icon, { width: iconSize, height: iconSize, borderRadius: iconSize / 2, backgroundColor: color + '20', marginBottom: compact ? Spacing.xs : Spacing.sm }]}>
                <Ionicons name={icon} size={compact ? 20 : 22} color={color} />
            </View>
            {showCounter ? (
                <AnimatedCounter value={numericValue} style={valueStyle} suffix={suffix} numberOfLines={1} adjustsFontSizeToFit />
            ) : (
                <Text style={valueStyle} numberOfLines={1} adjustsFontSizeToFit>{Number.isNaN(numericValue) ? value : `${value}${suffix}`}</Text>
            )}
            <Text style={[styles.label, { color: colors.textSecondary, fontSize: compact ? 11 : FontSize.xs }]} numberOfLines={2} ellipsizeMode="tail">{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { alignItems: 'center', justifyContent: 'center' },
    icon: { alignItems: 'center', justifyContent: 'center' },
    value: { fontWeight: '800', marginBottom: Spacing.xs, maxWidth: '100%', textAlign: 'center' },
    label: { textAlign: 'center', maxWidth: '100%' },
});
