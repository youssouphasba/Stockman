import React, { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BorderRadius, Spacing } from '../constants/theme';
import GuideHost from '../onboarding/GuideHost';
import KeyboardOverlay from './KeyboardOverlay';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor: string;
  borderColor?: string;
  maxHeightRatio?: number;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  align?: 'bottom' | 'center';
  // Identifiant de la couche du guide de démarrage affichée dans cette fenêtre.
  guideHost?: string;
};

export default function KeyboardAwareModal({
  visible,
  onClose,
  children,
  backgroundColor,
  borderColor,
  maxHeightRatio = 0.9,
  contentStyle,
  scroll = true,
  align = 'bottom',
  guideHost,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Hauteur de la fenêtre recouverte par le clavier : la fenêtre remonte d'autant (KeyboardOverlay).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardOpen = keyboardHeight > 0;
  const visibleHeight = height - (keyboardOpen ? keyboardHeight : insets.bottom) - insets.top - Spacing.lg;
  const maxHeight = Math.max(Math.min(280, visibleHeight), visibleHeight * maxHeightRatio);
  const fixedContentHeight = scroll ? undefined : maxHeight;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardOverlay style={[styles.overlay, align === 'center' && styles.overlayCenter]} onKeyboardOverlap={setKeyboardHeight}>
        <View style={styles.keyboard}>
          <View
            style={[
              styles.content,
              {
                backgroundColor,
                borderColor: borderColor || 'transparent',
                height: fixedContentHeight,
                maxHeight,
                paddingBottom: keyboardOpen ? Spacing.md : Math.max(Spacing.md, insets.bottom + Spacing.sm),
              },
              contentStyle,
            ]}
          >
            {scroll ? (
              <ScrollView
                automaticallyAdjustKeyboardInsets
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.scrollContent,
                  keyboardOpen && { paddingBottom: Spacing.xxl },
                ]}
              >
                {children}
              </ScrollView>
            ) : children}
          </View>
        </View>
      </KeyboardOverlay>
      {!!guideHost && visible && <GuideHost id={guideHost} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    justifyContent: 'center',
    padding: Spacing.md,
  },
  keyboard: {
    width: '100%',
  },
  content: {
    width: '100%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },
});
