import React, { useCallback } from 'react';
import { BackHandler, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { MANAGED_SETTINGS_GROUPS, STARTER_SETTINGS_GROUPS, StarterSettingsGroup } from '../utils/starterSettings';

type SectionProps = { sectionKey?: string; title?: string; children?: React.ReactNode; hidden?: boolean };

export function SettingsSlot({ children, hidden }: SectionProps) {
  return hidden ? null : <>{children}</>;
}

export function collectSettingsSections(children: React.ReactNode): Map<string, React.ReactElement<SectionProps>> {
  const sections = new Map<string, React.ReactElement<SectionProps>>();
  function visit(nodes: React.ReactNode) {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement<SectionProps>(child)) return;
      if (child.props.sectionKey) sections.set(child.props.sectionKey, child);
      visit(child.props.children);
    });
  }
  visit(children);
  return sections;
}

type Props = {
  enabled: boolean;
  managed?: boolean;
  activeSection: StarterSettingsGroup | null;
  onSectionChange: (section: StarterSettingsGroup | null) => void;
  pendingCount: number;
  children: React.ReactNode;
};

export default function StarterSettingsLayout({ enabled, managed = false, activeSection, onSectionChange, pendingCount, children }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const sections = enabled ? collectSettingsSections(children) : null;
  const groups = managed
    ? MANAGED_SETTINGS_GROUPS.filter((item) => item.sections.some((key) => sections?.has(key)))
    : STARTER_SETTINGS_GROUPS;
  const group = groups.find((item) => item.id === activeSection);
  useFocusEffect(useCallback(() => {
    if (!enabled || !group) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onSectionChange(null); return true; });
    return () => subscription.remove();
  }, [enabled, group, onSectionChange]));

  if (!sections) return <>{children}</>;
  if (!group) {
    return <View>
      {groups.map((item) => <TouchableOpacity
        key={item.id}
        accessibilityRole="button"
        onPress={() => onSectionChange(item.id)}
        style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}
      >
        <Ionicons name={item.icon} size={24} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>{t('settings.mobile_groups.' + item.id)}</Text>
        {item.id === 'information' && pendingCount > 0 && <Text style={{ color: colors.warning, fontWeight: '700' }}>{pendingCount}</Text>}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>)}
    </View>;
  }

  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('settings.mobile_groups.back')} onPress={() => onSectionChange(null)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 21, fontWeight: '700' }}>{t('settings.mobile_groups.' + group.id)}</Text>
    </View>
    {group.sections.map((key) => {
      const section = sections.get(key);
      if (!section) return null;
      if (managed && (key === 'organization' || key === 'accountAlerts' || key === 'storeAlerts')) {
        return React.cloneElement(section, { key });
      }
      return <View key={key} style={{ marginBottom: 20 }}>
        {section.props.title && key !== 'notifications' && <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{section.props.title}</Text>}
        {section.props.children}
      </View>;
    })}
  </View>;
}
