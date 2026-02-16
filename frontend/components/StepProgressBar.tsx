import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

type Props = {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
};

export default function StepProgressBar({ currentStep, totalSteps, labels }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: i < currentStep ? colors.primary : colors.divider,
                marginLeft: i > 0 ? 3 : 0,
              },
            ]}
          />
        ))}
      </View>
      {labels && (
        <View style={styles.labelsRow}>
          {labels.map((label, i) => (
            <Text
              key={i}
              style={[
                styles.label,
                { color: i < currentStep ? colors.primary : colors.textMuted },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  barRow: {
    flexDirection: 'row',
    height: 4,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRadius: BorderRadius.full,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
