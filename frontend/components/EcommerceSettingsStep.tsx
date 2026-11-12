import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '../constants/theme';

type EcommerceStepProps = {
  title: string;
  summary: string;
  icon: string;
  incomplete?: boolean;
  open: boolean;
  onToggle: () => void;
  // Styles de l'écran Paramètres, pour garder la même apparence que les autres réglages.
  styles: Record<string, any>;
  colors: any;
  children: React.ReactNode;
};

// Rubrique repliable du site e-commerce : le résumé indique l'état actuel sans avoir à l'ouvrir.
// Le contenu n'est monté qu'à la première ouverture, puis reste monté pour ne perdre aucune saisie.
export default function EcommerceSettingsStep({ title, summary, icon, incomplete = false, open, onToggle, styles, colors, children }: EcommerceStepProps) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        activeOpacity={0.85}
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 60, paddingVertical: Spacing.sm }}
      >
        <Ionicons name={icon as any} size={22} color={colors.primary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.settingLabel, { fontWeight: '600' }]}>{title}</Text>
          <Text numberOfLines={1} style={[styles.settingDesc, incomplete && { color: colors.warning }]}>{summary}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {mounted ? <View style={open ? { gap: Spacing.sm, paddingBottom: Spacing.md } : { display: 'none' }}>{children}</View> : null}
    </View>
  );
}
