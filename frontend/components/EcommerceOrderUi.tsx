import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, Spacing } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'subtle';

type OrderActionButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  color?: string;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

// Bouton d'action d'une commande E-com : toujours un vrai bouton (fond ou contour), jamais un simple texte.
// « primary » met en avant la prochaine étape, « secondary » les autres gestes, « subtle » les corrections rares.
export function OrderActionButton({ label, onPress, color, variant = 'secondary', icon, style, fullWidth = false }: OrderActionButtonProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const tint = color || colors.primary;
  const filled = variant === 'primary';
  const foreground = filled ? '#FFFFFF' : variant === 'subtle' ? colors.textMuted : tint;
  const press = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPress();
    } finally {
      setBusy(false);
    }
  };
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      activeOpacity={0.8}
      disabled={busy}
      onPress={press}
      style={[
        styles.button,
        filled
          ? { backgroundColor: tint, borderColor: tint }
          : variant === 'subtle'
            ? { backgroundColor: 'transparent', borderColor: colors.divider }
            : { backgroundColor: tint + '14', borderColor: tint + '66' },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {busy
        ? <ActivityIndicator size="small" color={foreground} />
        : <>
          {icon ? <Ionicons name={icon} size={16} color={foreground} /> : null}
          <Text style={[styles.label, { color: foreground }]} numberOfLines={1}>{label}</Text>
        </>}
    </TouchableOpacity>
  );
}

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduceMotion(value); }).catch(() => null);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduceMotion;
}

// Halo autour d'une carte de commande qui attend un geste du commerçant. L'animation est coupée quand
// le téléphone demande moins de mouvement : la bordure colorée et le libellé « À faire » restent visibles.
export function ActionGlow({ active, color, label, children }: { active: boolean; color: string; label?: string; children: React.ReactNode }) {
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, pulse]);

  if (!active) return <>{children}</>;
  return (
    <View style={styles.glowWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { borderColor: color, shadowColor: color, opacity: reduceMotion ? 0.9 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
        ]}
      />
      {children}
      {label ? (
        <View pointerEvents="none" style={[styles.badge, { backgroundColor: color }]}>
          <Ionicons name="flash" size={11} color="#FFFFFF" />
          <Text style={styles.badgeText} numberOfLines={1}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  label: { fontSize: FontSize.sm, fontWeight: '700' },
  glowWrap: { position: 'relative' },
  glow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: Spacing.md - 3,
    borderRadius: 16,
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  badge: {
    position: 'absolute',
    top: -10,
    left: Spacing.md,
    maxWidth: '70%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
