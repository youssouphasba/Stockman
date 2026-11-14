import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { filterGuideContent, type EcommerceGuideFeature } from '../utils/ecommerceGuideFeatures';

export type GuideStep = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  requires?: EcommerceGuideFeature;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  steps: GuideStep[];
};

export default function ScreenGuide({ visible, onClose, title, steps }: Props) {
  const { user } = useAuth();
  if (!visible) return null;
  const availableSteps = filterGuideContent(steps, user);
  if (availableSteps.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.overlay}>
            <GuideCard
              key={JSON.stringify([user?.user_id, user?.account_id, title, availableSteps.map((item) => item.title)])}
              onClose={onClose}
              title={title}
              steps={availableSteps}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function GuideCard({ onClose, title, steps }: Omit<Props, 'visible'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [page, setPage] = useState({ width: 0, height: 0 });
  const flatList = useRef<FlatList<GuideStep>>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const step = Math.min(currentStep, steps.length - 1);
  const isLast = step === steps.length - 1;
  const hasPager = page.width > 0 && page.height > 0;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const index = viewableItems[0]?.index;
    if (index != null) setCurrentStep(index);
  }, []);

  function goToStep(index: number) {
    if (!flatList.current || index < 0 || index >= steps.length) return;
    flatList.current.scrollToIndex({ index, animated: true });
    setCurrentStep(index);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgMid }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" numberOfLines={2} style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {t('common.step', { step: step + 1, total: steps.length })}
          </Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('screen_guide.close')} onPress={onClose} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
        <View style={{ width: `${((step + 1) / steps.length) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
      </View>

      <View
        style={styles.pager}
        onLayout={({ nativeEvent: { layout: { width, height } } }) =>
          setPage((current) => current.width === width && current.height === height ? current : { width, height })
        }
      >
        {hasPager && (
          <FlatList
            key={page.width}
            ref={flatList}
            data={steps}
            keyExtractor={(_, index) => String(index)}
            horizontal
            pagingEnabled
            style={styles.pager}
            showsHorizontalScrollIndicator={false}
            contentInsetAdjustmentBehavior="never"
            initialScrollIndex={step}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({ length: page.width, offset: page.width * index, index })}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width: page.width, height: page.height }}
                contentContainerStyle={styles.stepCard}
                contentInsetAdjustmentBehavior="never"
                nestedScrollEnabled
              >
                <View style={[styles.stepIconCircle, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name={item.icon || 'information-circle'} size={28} color={colors.primary} />
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{t(item.title)}</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{t(item.description)}</Text>
              </ScrollView>
            )}
          />
        )}
      </View>

      <View style={[styles.navRow, { borderTopColor: colors.divider }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('screen_guide.previous')}
          accessibilityState={{ disabled: step === 0 || !hasPager }}
          disabled={step === 0 || !hasPager}
          onPress={() => goToStep(step - 1)}
          style={[styles.iconButton, styles.previousBtn, { borderColor: colors.divider }, step === 0 && styles.disabled]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: !isLast && !hasPager }}
          disabled={!isLast && !hasPager}
          onPress={isLast ? onClose : () => goToStep(step + 1)}
          style={[styles.nextBtn, { backgroundColor: colors.primaryDark }]}
        >
          <Text style={styles.nextText}>{t(isLast ? 'screen_guide.finish' : 'screen_guide.next')}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BUTTON_SIZE = 44;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    height: '100%',
    maxHeight: 520,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingLeft: Spacing.md,
    gap: Spacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  progressTrack: {
    flexShrink: 0,
    height: 4,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  pager: {
    flex: 1,
    minHeight: 0,
  },
  stepCard: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  stepIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  navRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  iconButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  nextBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: BUTTON_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  nextText: {
    flexShrink: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
