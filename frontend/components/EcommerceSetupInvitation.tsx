import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ecommerce } from '../services/api';
import { createEcommerceSetupController, ECOMMERCE_SETUP_MESSAGE as message, EMPTY_SETUP_VIEW } from '../utils/ecommerceSetup';

type Props = {
  active: boolean;
  onConfigure: () => void;
  // Distance au bas de l'écran : la fenêtre, non modale, est posée au-dessus de la barre d'onglets.
  bottomOffset: number;
};

export default function EcommerceSetupInvitation({ active, onConfigure, bottomOffset }: Props) {
  const { colors, isDark } = useTheme();
  const [state, setState] = useState(EMPTY_SETUP_VIEW);
  const configureRef = useRef(onConfigure);
  configureRef.current = onConfigure;
  const controller = useRef<ReturnType<typeof createEcommerceSetupController> | null>(null);

  useEffect(() => {
    setState(EMPTY_SETUP_VIEW);
    if (!active) return;
    const current = createEcommerceSetupController(ecommerce, setState, () => configureRef.current());
    controller.current = current;
    current.start();
    return () => {
      controller.current = null;
      current.dispose();
    };
  }, [active]);

  if (!active || !state.visible) return null;

  // Couleurs opaques et contrastes AA dans les deux thèmes : la fenêtre flotte au-dessus du contenu.
  const surface = isDark ? colors.bgLight : colors.card;
  const actionBackground = isDark ? colors.primary : colors.primaryDark;
  const actionText = isDark ? '#0F172A' : '#FFFFFF';
  const errorText = isDark ? '#FCA5A5' : colors.danger;
  return (
    <View
      accessibilityRole="summary"
      style={{
        gap: 12,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: surface,
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: bottomOffset,
        zIndex: 20,
        elevation: 12,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Ionicons name="globe-outline" size={24} color={colors.primary} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>{message.title}</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{message.description}</Text>
        </View>
      </View>
      {state.error && <Text accessibilityRole="alert" style={{ color: errorText, fontWeight: '600' }}>{state.error}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: state.busy }}
          disabled={state.busy}
          onPress={() => { void controller.current?.respond('later'); }}
          style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', opacity: state.busy ? 0.5 : 1 }}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>{message.later}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ disabled: state.busy }}
          disabled={state.busy}
          onPress={() => { void controller.current?.respond('configure'); }}
          style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 14, justifyContent: 'center', backgroundColor: actionBackground, opacity: state.busy ? 0.5 : 1 }}
        >
          <Text style={{ color: actionText, fontWeight: '800' }}>{message.configure}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
