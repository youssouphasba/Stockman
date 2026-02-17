import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { Tip } from '../constants/tips';

type Props = {
  tip: Tip;
  onDismiss: () => void;
  onNavigate?: (deepLink: string) => void;
};

export default function TipCard({ tip, onDismiss, onNavigate }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          borderLeftColor: colors.primary,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Ionicons name="bulb-outline" size={14} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.primary }]}>
          {t('common.tip_of_the_day')}
        </Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.bodyRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={tip.icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tipTitle, { color: colors.text }]}>{t(tip.title)}</Text>
          <Text style={[styles.tipDesc, { color: colors.textSecondary }]}>
            {t(tip.description)}
          </Text>
        </View>
      </View>

      {/* Deep link */}
      {tip.deepLink && onNavigate && (
        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => onNavigate(tip.deepLink!)}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {t('common.see_feature')}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingLeft: 52,
  },
  linkText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
