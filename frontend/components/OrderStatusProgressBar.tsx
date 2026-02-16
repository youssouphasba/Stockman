import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, Spacing } from '../constants/theme';

const STEPS = [
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'shipped', label: 'Expédiée' },
  { key: 'delivered', label: 'Livrée' },
];

type Props = { status: string };

export default function OrderStatusProgressBar({ status }: Props) {
  const { colors } = useTheme();
  const isCancelled = status === 'cancelled';
  const currentIndex = STEPS.findIndex((s) => s.key === status);

  if (isCancelled) {
    return (
      <View style={styles.cancelledRow}>
        <Ionicons name="close-circle" size={16} color={colors.danger} />
        <Text style={[styles.cancelledText, { color: colors.danger }]}>Annulée</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const dotColor = done ? colors.primary : colors.divider;
        const lineColor = i <= currentIndex ? colors.primary : colors.divider;

        return (
          <View key={step.key} style={styles.stepItem}>
            {i > 0 && <View style={[styles.line, { backgroundColor: lineColor }]} />}
            <View style={[styles.dot, { backgroundColor: dotColor }]}>
              {done && <Ionicons name="checkmark" size={10} color="#fff" />}
            </View>
            <Text
              style={[styles.stepLabel, { color: done ? colors.text : colors.textMuted }]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    top: 10,
    right: '50%',
    left: '-50%',
    height: 2,
    zIndex: -1,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  cancelledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  cancelledText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
