import React, { useState } from 'react';
import { View, Text, Switch, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ReminderRuleSettings } from '../services/api';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

type Props = {
  rules: ReminderRuleSettings;
  onUpdate: (rules: ReminderRuleSettings) => void;
  allowedDomains?: ReminderRuleDomain[];
  editableDomains?: ReminderRuleDomain[];
};

type ReminderRuleDomain = 'stock' | 'crm' | 'finance';

type RuleConfig = {
  key: keyof ReminderRuleSettings;
  domain: ReminderRuleDomain;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit?: string;
  color: string;
};

const RULE_CONFIGS: RuleConfig[] = [
  {
    key: 'inventory_check',
    domain: 'stock',
    label: 'reminders.inventory_check_label',
    description: 'reminders.inventory_check_desc',
    icon: 'clipboard-outline',
    unit: 'reminders.unit_days',
    color: '#F59E0B',
  },
  {
    key: 'dormant_products',
    domain: 'stock',
    label: 'reminders.dormant_products_label',
    description: 'reminders.dormant_products_desc',
    icon: 'moon-outline',
    unit: 'reminders.unit_days',
    color: '#F59E0B',
  },
  {
    key: 'late_deliveries',
    domain: 'stock',
    label: 'reminders.late_deliveries_label',
    description: 'reminders.late_deliveries_desc',
    icon: 'alert-circle',
    unit: 'reminders.unit_days',
    color: '#EF4444',
  },
  {
    key: 'replenishment',
    domain: 'stock',
    label: 'reminders.replenishment_label',
    description: 'reminders.replenishment_desc',
    icon: 'cart-outline',
    color: '#3B82F6',
  },
  {
    key: 'pending_invitations',
    domain: 'stock',
    label: 'reminders.pending_invitations_label',
    description: 'reminders.pending_invitations_desc',
    icon: 'mail-unread-outline',
    unit: 'reminders.unit_days',
    color: '#3B82F6',
  },
  {
    key: 'debt_recovery',
    domain: 'crm',
    label: 'reminders.debt_recovery_label',
    description: 'reminders.debt_recovery_desc',
    icon: 'wallet-outline',
    unit: 'common.currency_default',
    color: '#8B5CF6',
  },
  {
    key: 'client_reactivation',
    domain: 'crm',
    label: 'reminders.client_reactivation_label',
    description: 'reminders.client_reactivation_desc',
    icon: 'person-outline',
    unit: 'reminders.unit_days',
    color: '#8B5CF6',
  },
  {
    key: 'birthdays',
    domain: 'crm',
    label: 'reminders.birthdays_label',
    description: 'reminders.birthdays_desc',
    icon: 'gift-outline',
    unit: 'reminders.unit_days',
    color: '#8B5CF6',
  },
  {
    key: 'monthly_report',
    domain: 'finance',
    label: 'reminders.monthly_report_label',
    description: 'reminders.monthly_report_desc',
    icon: 'document-text-outline',
    unit: 'reminders.unit_days',
    color: '#10B981',
  },
  {
    key: 'expense_spike',
    domain: 'finance',
    label: 'reminders.expense_spike_label',
    description: 'reminders.expense_spike_desc',
    icon: 'trending-up',
    unit: '%',
    color: '#10B981',
  },
];

const DEFAULT_RULES: ReminderRuleSettings = {
  inventory_check: { enabled: true, threshold: 30 },
  dormant_products: { enabled: true, threshold: 60 },
  late_deliveries: { enabled: true, threshold: 7 },
  replenishment: { enabled: true },
  pending_invitations: { enabled: true, threshold: 3 },
  debt_recovery: { enabled: true, threshold: 50000 },
  client_reactivation: { enabled: true, threshold: 30 },
  birthdays: { enabled: true, threshold: 7 },
  monthly_report: { enabled: true, threshold: 3 },
  expense_spike: { enabled: true, threshold: 50 },
};

export default function ReminderRulesSettings({
  rules,
  onUpdate,
  allowedDomains = ['stock', 'crm', 'finance'],
  editableDomains = ['stock', 'crm', 'finance'],
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  function toggleRule(key: keyof ReminderRuleSettings) {
    const current = rules[key] ?? DEFAULT_RULES[key];
    onUpdate({
      ...rules,
      [key]: { ...current, enabled: !current.enabled },
    });
  }

  function startEditing(key: string, currentVal: number) {
    setEditingKey(key);
    setEditValue(String(currentVal));
  }

  function commitEdit(key: keyof ReminderRuleSettings) {
    const num = parseInt(editValue, 10);
    if (!isNaN(num) && num > 0) {
      const current = rules[key] ?? DEFAULT_RULES[key];
      onUpdate({
        ...rules,
        [key]: { ...current, threshold: num },
      });
    }
    setEditingKey(null);
  }

  function canEditDomain(domain: ReminderRuleDomain) {
    return editableDomains.includes(domain);
  }

  const visibleRules = RULE_CONFIGS.filter((config) => allowedDomains.includes(config.domain));

  return (
    <View>
      {visibleRules.map((config) => {
        const rule = rules[config.key] ?? DEFAULT_RULES[config.key];
        const isEditing = editingKey === config.key;
        const canEditRule = canEditDomain(config.domain);

        return (
          <View
            key={config.key}
            style={[
              styles.ruleRow,
              { borderBottomColor: colors.divider, opacity: rule.enabled ? 1 : 0.5 },
            ]}
          >
            <View style={[styles.ruleIcon, { backgroundColor: config.color + '15' }]}>
              <Ionicons name={config.icon} size={18} color={config.color} />
            </View>

            <View style={styles.ruleContent}>
              <Text style={[styles.ruleLabel, { color: colors.text }]}>{t(config.label)}</Text>
              <Text style={[styles.ruleDesc, { color: colors.textMuted }]}>
                {t(config.description)}
              </Text>

              {config.unit && rule.enabled && (
                <View style={styles.thresholdRow}>
                  {isEditing ? (
                    <TextInput
                      style={[
                        styles.thresholdInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.inputBg,
                          borderColor: colors.primary,
                        },
                      ]}
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="numeric"
                      autoFocus
                      selectTextOnFocus
                      onBlur={() => commitEdit(config.key)}
                      onSubmitEditing={() => commitEdit(config.key)}
                      editable={canEditRule}
                    />
                  ) : (
                    <Text
                      style={[styles.thresholdValue, { color: colors.primary, backgroundColor: colors.primary + '10' }]}
                      onPress={() => canEditRule && startEditing(config.key, rule.threshold ?? 0)}
                    >
                      {rule.threshold ?? 0}
                    </Text>
                  )}
                  <Text style={[styles.thresholdUnit, { color: colors.textSecondary }]}>
                    {t(config.unit)}
                  </Text>
                </View>
              )}
            </View>

            <Switch
              value={rule.enabled}
              onValueChange={() => {
                if (canEditRule) {
                  toggleRule(config.key);
                }
              }}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={rule.enabled ? colors.primary : colors.textMuted}
              disabled={!canEditRule}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  ruleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleContent: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  ruleDesc: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  thresholdValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  thresholdInput: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 60,
    textAlign: 'center',
  },
  thresholdUnit: {
    fontSize: FontSize.xs,
  },
});
