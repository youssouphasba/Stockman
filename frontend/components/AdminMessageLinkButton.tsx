import React from 'react';
import { Alert, Linking, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, Spacing } from '../constants/theme';
import type { AdminMessageActionLink } from '../services/api';
import { isAdminMessageActionUrl } from '../utils/adminMessageActionLink';

export default function AdminMessageLinkButton({ link, onOpened }: {
  link?: AdminMessageActionLink | null;
  onOpened?: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (!link?.label || !isAdminMessageActionUrl(link.url)) return null;

  return (
    <TouchableOpacity
      accessibilityRole="link"
      onPress={async () => {
        try {
          await Linking.openURL(link.url);
          onOpened?.();
        } catch {
          Alert.alert(t('admin.actions.linkOpenError', "Impossible d’ouvrir ce lien."));
        }
      }}
      style={{
        alignSelf: 'flex-start', maxWidth: '100%', minHeight: 44, marginTop: Spacing.sm,
        borderColor: colors.primary, borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.sm,
        paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6,
      }}
    >
      <Ionicons name="open-outline" size={16} color={colors.primary} />
      <Text style={{ flexShrink: 1, color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' }}>{link.label}</Text>
    </TouchableOpacity>
  );
}
