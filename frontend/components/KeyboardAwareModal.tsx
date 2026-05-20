import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
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
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const visibleHeight = height - insets.top - insets.bottom - keyboardHeight - Spacing.lg;
  const maxHeight = Math.max(280, visibleHeight * maxHeightRatio);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, align === 'center' && styles.overlayCenter]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(8, insets.top / 2) : 0}
          style={styles.keyboard}
        >
          <View
            style={[
              styles.content,
              {
                backgroundColor,
                borderColor: borderColor || 'transparent',
                maxHeight,
                paddingBottom: Math.max(Spacing.md, insets.bottom + Spacing.sm),
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
                  keyboardHeight > 0 && { paddingBottom: Spacing.xxl },
                ]}
              >
                {children}
              </ScrollView>
            ) : children}
          </View>
        </KeyboardAvoidingView>
      </View>
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
