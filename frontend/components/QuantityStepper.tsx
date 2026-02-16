import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, Spacing } from '../constants/theme';

type Props = {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
};

export default function QuantityStepper({ value, onIncrement, onDecrement, min = 0 }: Props) {
  const { colors } = useTheme();
  const atMin = value <= min;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onDecrement}
        disabled={atMin}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={atMin ? 'remove-circle-outline' : 'remove-circle'}
          size={28}
          color={atMin ? colors.divider : colors.danger}
        />
      </TouchableOpacity>
      <Text style={[styles.qty, { color: value > 0 ? colors.text : colors.textMuted }]}>
        {value}
      </Text>
      <TouchableOpacity
        onPress={onIncrement}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="add-circle" size={28} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qty: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
});
