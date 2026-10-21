import React, { useCallback } from 'react';
import { BackHandler, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { STARTER_SETTINGS_GROUPS, StarterSettingsGroup } from '../utils/starterSettings';

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
  activeSection: StarterSettingsGroup | null;
  onSectionChange: (section: StarterSettingsGroup | null) => void;
  pendingCount: number;
  children: React.ReactNode;
};

export default function StarterSettingsLayout({ enabled, activeSection, onSectionChange, pendingCount, children }: Props) {
  const { colors } = useTheme();
  useFocusEffect(useCallback(() => {
    if (!enabled || !activeSection) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onSectionChange(null); return true; });
    return () => subscription.remove();
  }, [enabled, activeSection, onSectionChange]));

  if (!enabled) return <>{children}</>;
  const group = STARTER_SETTINGS_GROUPS.find((item) => item.id === activeSection);
  if (!group) {
    return <View>
      {STARTER_SETTINGS_GROUPS.map((item) => <TouchableOpacity
        key={item.id}
        accessibilityRole="button"
        onPress={() => onSectionChange(item.id)}
        style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}
      >
        <Ionicons name={item.icon} size={24} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>{item.title}</Text>
        {item.id === 'help' && pendingCount > 0 && <Text style={{ color: colors.warning, fontWeight: '700' }}>{pendingCount}</Text>}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>)}
    </View>;
  }

  const sections = collectSettingsSections(children);
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retour aux paramètres" onPress={() => onSectionChange(null)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 21, fontWeight: '700' }}>{group.title}</Text>
    </View>
    {group.sections.map((key) => {
      const section = sections.get(key);
      if (!section) return null;
      return <View key={key} style={{ marginBottom: 20 }}>
        {section.props.title && key !== 'notifications' && <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{section.props.title}</Text>}
        {section.props.children}
      </View>;
    })}
  </View>;
}
