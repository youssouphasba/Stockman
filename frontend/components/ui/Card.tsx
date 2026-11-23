import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing } from '../../constants/theme';

// Carte « verre » partagée : même fond, même bordure et même arrondi dans tous les écrans.
export default function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
    const { glassStyle } = useTheme();
    return <View style={[glassStyle, padded ? { padding: Spacing.md } : null, style]}>{children}</View>;
}
