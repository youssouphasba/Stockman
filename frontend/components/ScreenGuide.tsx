import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

export type GuideStep = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  steps: GuideStep[];
};

const CARD_PADDING = Spacing.lg * 2;

export default function ScreenGuide({ visible, onClose, title, steps }: Props) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const flatListRef = useRef<FlatList<GuideStep>>(null);
  const [containerWidth, setContainerWidth] = useState(
    Dimensions.get('window').width - Spacing.lg * 2
  );

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
      }, 100);
    }
  }, [visible]);

  const itemWidth = containerWidth - CARD_PADDING;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentStep(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  function goToStep(index: number) {
    if (index >= 0 && index < steps.length) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setCurrentStep(index);
    }
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      onClose();
    }
  }

  const isLast = currentStep === steps.length - 1;

  const renderStep = useCallback(
    ({ item }: { item: GuideStep }) => (
      <View style={[styles.stepCard, { width: itemWidth }]}>
        <View
          style={[styles.stepIconCircle, { backgroundColor: colors.primary + '15' }]}
        >
          <Ionicons
            name={item.icon || 'information-circle'}
            size={36}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.stepTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    ),
    [itemWidth, colors]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: colors.bgMid }]}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}
            >
              <Ionicons name="help-buoy-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                Étape {currentStep + 1} sur {steps.length}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Paginated Steps */}
          <FlatList
            ref={flatListRef}
            data={steps}
            renderItem={renderStep}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={itemWidth}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: CARD_PADDING / 2 }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: itemWidth,
              offset: itemWidth * index,
              index,
            })}
          />

          {/* Dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentStep
                    ? { width: 20, backgroundColor: colors.primary }
                    : { width: 8, backgroundColor: colors.textMuted + '40' },
                ]}
              />
            ))}
          </View>

          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Passer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.nextText}>
                {isLast ? "J'ai compris !" : 'Suivant'}
              </Text>
              {!isLast && (
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    borderRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  stepCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  stepIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepDesc: {
    fontSize: FontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: Spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  skipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  nextText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
