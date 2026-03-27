import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { alerts as alertsApi, alertRules as alertRulesApi, ai as aiApi, Alert as AlertData, AlertRule, AiAnomaly } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '../../utils/date';
import { useAuth } from '../../contexts/AuthContext';

type RuleScope = 'account' | 'store';
type ContactGroupKey = 'default' | 'stock' | 'procurement' | 'finance' | 'crm' | 'operations' | 'billing';
type SeverityLevel = 'info' | 'warning' | 'critical';

const RULE_TEMPLATES: Record<string, { labelKey: string; descriptionKey: string; hasThreshold: boolean; defaultThreshold?: number; defaultRecipients: ContactGroupKey[]; defaultChannels: ('in_app' | 'push' | 'email')[]; defaultSeverity: SeverityLevel | null }> = {
  low_stock: { labelKey: 'alerts.rule_low_stock', descriptionKey: 'alerts.config.low_stock.desc', hasThreshold: true, defaultThreshold: 20, defaultRecipients: ['default', 'stock'], defaultChannels: ['in_app', 'push'], defaultSeverity: 'warning' },
  out_of_stock: { labelKey: 'alerts.rule_out_of_stock', descriptionKey: 'alerts.config.out_of_stock.desc', hasThreshold: false, defaultRecipients: ['default', 'stock'], defaultChannels: ['in_app', 'push', 'email'], defaultSeverity: 'critical' },
  overstock: { labelKey: 'alerts.rule_overstock', descriptionKey: 'alerts.config.overstock.desc', hasThreshold: true, defaultThreshold: 80, defaultRecipients: ['stock'], defaultChannels: ['in_app'], defaultSeverity: 'info' },
  slow_moving: { labelKey: 'alerts.rule_dormant', descriptionKey: 'alerts.config.slow_moving.desc', hasThreshold: false, defaultRecipients: ['stock'], defaultChannels: ['in_app', 'email'], defaultSeverity: 'info' },
  late_delivery: { labelKey: 'alerts.rule_supplier_delay', descriptionKey: 'alerts.config.late_delivery.desc', hasThreshold: false, defaultRecipients: ['default', 'procurement'], defaultChannels: ['in_app', 'push', 'email'], defaultSeverity: 'warning' },
};

const CONTACT_GROUPS: { key: ContactGroupKey; labelKey: string }[] = [
  { key: 'default', labelKey: 'alerts.group_default' },
  { key: 'stock', labelKey: 'alerts.group_stock' },
  { key: 'procurement', labelKey: 'alerts.group_supply' },
  { key: 'finance', labelKey: 'alerts.group_finance' },
  { key: 'crm', labelKey: 'alerts.group_crm' },
  { key: 'operations', labelKey: 'alerts.group_operations' },
  { key: 'billing', labelKey: 'alerts.group_billing' },
];

const SEVERITY_OPTIONS: { value: SeverityLevel; labelKey: string }[] = [
  { value: 'info', labelKey: 'alerts.severity_info' },
  { value: 'warning', labelKey: 'alerts.severity_warning' },
  { value: 'critical', labelKey: 'alerts.severity_critical' },
];

const CHANNEL_OPTIONS: { value: 'push' | 'email'; labelKey: string }[] = [
  { value: 'push', labelKey: 'alerts.channel_push' },
  { value: 'email', labelKey: 'alerts.channel_email' },
];

function buildRuleKey(type: string, scope: RuleScope, storeId?: string | null) {
  return `${scope}:${storeId || 'global'}:${type}`;
}

function buildDraftRule(type: string, scope: RuleScope, storeId?: string | null): AlertRule {
  const template = RULE_TEMPLATES[type];
  const now = new Date().toISOString();
  return {
    rule_id: `draft:${buildRuleKey(type, scope, storeId)}`,
    user_id: '',
    type,
    scope,
    store_id: scope === 'store' ? (storeId || null) : null,
    enabled: false,
    threshold_percentage: template.hasThreshold ? template.defaultThreshold ?? 20 : null,
    notification_channels: ['in_app', ...template.defaultChannels.filter((channel) => channel !== 'in_app')],
    recipient_keys: template.defaultRecipients,
    recipient_emails: [],
    minimum_severity: template.defaultSeverity,
    created_at: now,
    updated_at: now,
  } as AlertRule;
}

export default function AlertsScreen() {
  const { colors, glassStyle } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);

  function getSeverityIcon(severity: string): keyof typeof Ionicons.glyphMap {
    switch (severity) {
      case 'critical': return 'warning';
      case 'warning': return 'alert-circle';
      default: return 'information-circle';
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return colors.danger;
      case 'warning': return colors.warning;
      default: return colors.info;
    }
  }

  function getSeverityLabel(severity: string) {
    switch (severity) {
      case 'critical': return t('alerts.severity_critical');
      case 'warning': return t('alerts.severity_warning');
      default: return t('alerts.severity_info');
    }
  }
  const [alertList, setAlertList] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('alerts');

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // AI Anomaly detection
  const [anomalies, setAnomalies] = useState<AiAnomaly[]>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);

  async function handleDetectAnomalies() {
    setAnomalyLoading(true);
    try {
      const result = await aiApi.detectAnomalies(i18n.language);
      setAnomalies(result.anomalies || []);
      setShowAnomalies(true);
    } catch {
      Alert.alert(t('common.error'), t('alerts.error_anomaly'));
    } finally {
      setAnomalyLoading(false);
    }
  }

  // Rules modal
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [activeRuleScope, setActiveRuleScope] = useState<RuleScope>('account');
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, AlertRule>>({});
  const [savingRuleKey, setSavingRuleKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await alertsApi.list();
      setAlertList(result?.items || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }


  async function handleMarkRead(alertId: string) {
    try {
      await alertsApi.markRead(alertId);
      setAlertList((prev) =>
        prev.map((a) => (a.alert_id === alertId ? { ...a, is_read: true } : a))
      );
    } catch {
      // ignore
    }
  }

  async function handleDismiss(alertId: string) {
    try {
      await alertsApi.dismiss(alertId);
      setAlertList((prev) => prev.filter((a) => a.alert_id !== alertId));
    } catch {
      // ignore
    }
  }

  async function openRulesModal() {
    setShowRulesModal(true);
    setRulesLoading(true);
    try {
      const result = await alertRulesApi.list();
      setRules(result);
    } catch {
      // silently fail
    } finally {
      setRulesLoading(false);
    }
  }

  function updateDraft(baseRule: AlertRule, updater: (rule: AlertRule) => AlertRule) {
    const key = buildRuleKey(baseRule.type, baseRule.scope as RuleScope, baseRule.store_id);
    setRuleDrafts((current) => ({ ...current, [key]: updater(current[key] || baseRule) }));
  }

  function resetDraft(baseRule: AlertRule) {
    const key = buildRuleKey(baseRule.type, baseRule.scope as RuleScope, baseRule.store_id);
    setRuleDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function persistRule(rule: AlertRule) {
    const key = buildRuleKey(rule.type, rule.scope as RuleScope, rule.store_id);
    setSavingRuleKey(key);
    try {
      const payload = {
        type: rule.type,
        scope: rule.scope,
        store_id: rule.scope === 'store' ? (rule.store_id || user?.active_store_id || undefined) : undefined,
        enabled: rule.enabled,
        threshold_percentage: rule.threshold_percentage ?? undefined,
        notification_channels: Array.from(new Set(['in_app', ...(rule.notification_channels || []).filter((channel) => channel !== 'in_app')])) as ('in_app' | 'push' | 'email')[],
        recipient_keys: rule.recipient_keys || ['default'],
        recipient_emails: rule.recipient_emails || [],
        minimum_severity: rule.minimum_severity || undefined,
      };
      if (rule.scope === 'store' && !payload.store_id) {
        throw new Error('Aucune boutique active selectionnee pour cette regle.');
      }
      const updated = rule.rule_id.startsWith('draft:')
        ? await alertRulesApi.create(payload)
        : await alertRulesApi.update(rule.rule_id, payload);
      setRules((prev) => {
        const other = prev.filter((item) => buildRuleKey(item.type, item.scope as RuleScope, item.store_id) !== key);
        return [...other, updated];
      });
      resetDraft(rule);
    } catch {
      Alert.alert(t('common.error'), 'Impossible de sauvegarder cette regle.');
    } finally {
      setSavingRuleKey(null);
    }
  }

  const visibleRules = useMemo(() => {
    const activeStoreId = user?.active_store_id || null;
    return Object.keys(RULE_TEMPLATES).map((type) => {
      const persisted = rules.find((rule) =>
        rule.type === type
        && rule.scope === activeRuleScope
        && (activeRuleScope === 'account' || rule.store_id === activeStoreId)
      );
      const base = persisted || buildDraftRule(type, activeRuleScope, activeRuleScope === 'store' ? activeStoreId : null);
      return ruleDrafts[buildRuleKey(base.type, base.scope as RuleScope, base.store_id)] || base;
    });
  }, [activeRuleScope, ruleDrafts, rules, user?.active_store_id]);

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : i18n.language, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  const unread = (alertList || []).filter((a) => !a.is_read).length;

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerRow, { paddingTop: insets.top }]}>
          <View>
            <Text style={styles.pageTitle}>{t('alerts.title')}</Text>
            <Text style={styles.subtitle}>
              {unread > 0 ? t('alerts.subtitle_unread', { count: unread }) : t('alerts.subtitle_empty')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.configBtn} onPress={() => setShowGuide(true)}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primaryLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.configBtn} onPress={openRulesModal}>
              <Ionicons name="settings-outline" size={20} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Anomaly Detection */}
        <TouchableOpacity
          style={[styles.anomalyBtn, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
          onPress={handleDetectAnomalies}
          disabled={anomalyLoading}
        >
          <View style={[styles.anomalyIconWrap, { backgroundColor: colors.primary + '20' }]}>
            {anomalyLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sparkles" size={18} color={colors.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.anomalyBtnTitle, { color: colors.text }]}>{t('alerts.detect_anomalies')}</Text>
            <Text style={[styles.anomalyBtnSub, { color: colors.textMuted }]}>
              {anomalyLoading
                ? t('alerts.analyzing')
                : showAnomalies && anomalies.length === 0
                  ? t('alerts.no_anomalies')
                  : t('alerts.analyze_desc')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {showAnomalies && anomalies.length > 0 && (
          <View style={{ marginBottom: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.xs }}>
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                {t(anomalies.length > 1 ? 'alerts.anomaly_analysis_summary_plural' : 'alerts.anomaly_analysis_summary', { count: anomalies.length })}
              </Text>
            </View>
            {anomalies.map((a, idx) => {
              const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
                revenue: 'cash-outline',
                volume: 'trending-up',
                margin: 'pricetag-outline',
                stock: 'cube-outline',
              };
              return (
                <View
                  key={idx}
                  style={[styles.anomalyItem, {
                    backgroundColor: colors.glass,
                    borderColor: a.severity === 'critical' ? colors.danger + '40' : a.severity === 'warning' ? colors.warning + '40' : colors.info + '40',
                    borderLeftColor: a.severity === 'critical' ? colors.danger : a.severity === 'warning' ? colors.warning : colors.info,
                  }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons
                      name={iconMap[a.type] || 'alert-circle-outline'}
                      size={16}
                      color={a.severity === 'critical' ? colors.danger : a.severity === 'warning' ? colors.warning : colors.info}
                    />
                    <Text style={[styles.anomalyTitle, { color: colors.text }]}>{a.title}</Text>
                  </View>
                  <Text style={[styles.anomalyDesc, { color: colors.textMuted }]}>{a.description}</Text>
                </View>
              );
            })}
          </View>
        )}

        {alertList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
            <Text style={styles.emptyTitle}>{t('alerts.no_alerts')}</Text>
            <Text style={styles.emptyText}>{t('alerts.all_stocks_normal')}</Text>
          </View>
        ) : (
          <View>
            {(showAllAlerts ? alertList : alertList.slice(0, 10)).map((alert) => (
              <View
                key={alert.alert_id}
                style={[styles.alertCard, !alert.is_read && styles.alertCardUnread]}
              >
                <View style={styles.alertHeader}>
                  <View style={[styles.severityIcon, { backgroundColor: getSeverityColor(alert.severity) + '20' }]}>
                    <Ionicons
                      name={getSeverityIcon(alert.severity)}
                      size={20}
                      color={getSeverityColor(alert.severity)}
                    />
                  </View>
                  <View style={styles.alertInfo}>
                    <View style={styles.alertTitleRow}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) + '20' }]}>
                        <Text style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}>
                          {getSeverityLabel(alert.severity)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertDate}>{formatDate(alert.created_at)}</Text>
                  </View>
                </View>

                <View style={styles.alertActions}>
                  {!alert.is_read && (
                    <TouchableOpacity style={styles.alertActionBtn} onPress={() => handleMarkRead(alert.alert_id)}>
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                      <Text style={[styles.alertActionText, { color: colors.success }]}>{t('alerts.mark_read')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.alertActionBtn} onPress={() => handleDismiss(alert.alert_id)}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                    <Text style={[styles.alertActionText, { color: colors.textMuted }]}>{t('alerts.dismiss')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {alertList.length > 10 && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => setShowAllAlerts(!showAllAlerts)}
              >
                <Text style={styles.seeMoreText}>
                  {showAllAlerts
                    ? t('alerts.see_less')
                    : t('alerts.see_more_all_count', { count: alertList.length - 10 })}
                </Text>
                <Ionicons name={showAllAlerts ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Rules Configuration Modal */}
      {showRulesModal && <Modal visible={showRulesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('alerts.rules_title')}</Text>
              <TouchableOpacity onPress={() => setShowRulesModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {rulesLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
                  <TouchableOpacity
                    style={[styles.scopeChip, activeRuleScope === 'account' && styles.scopeChipActive]}
                    onPress={() => setActiveRuleScope('account')}
                  >
                    <Text style={[styles.scopeChipText, activeRuleScope === 'account' && styles.scopeChipTextActive]}>Compte</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeChip, activeRuleScope === 'store' && styles.scopeChipActive]}
                    onPress={() => setActiveRuleScope('store')}
                  >
                    <Text style={[styles.scopeChipText, activeRuleScope === 'store' && styles.scopeChipTextActive]}>Boutique active</Text>
                  </TouchableOpacity>
                </View>

                {activeRuleScope === 'store' && !user?.active_store_id ? (
                  <View style={[styles.ruleCard, { borderColor: colors.warning + '40' }]}>
                    <Text style={styles.ruleDesc}>Selectionnez d abord une boutique active pour creer des regles locales.</Text>
                  </View>
                ) : (
                  visibleRules.map((rule) => {
                    const config = RULE_TEMPLATES[rule.type];
                    const currentKey = buildRuleKey(rule.type, rule.scope as RuleScope, rule.store_id);
                    const hasDraft = Boolean(ruleDrafts[currentKey]);
                    return (
                      <View key={currentKey} style={styles.ruleCard}>
                        <View style={styles.ruleHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ruleTitle}>{config ? t(config.labelKey) : rule.type}</Text>
                            <Text style={styles.ruleDesc}>{config ? t(config.descriptionKey) : ''}</Text>
                          </View>
                          <Switch
                            value={rule.enabled}
                            onValueChange={() => updateDraft(rule, (current) => ({ ...current, enabled: !current.enabled }))}
                            trackColor={{ false: colors.glass, true: colors.primary + '60' }}
                            thumbColor={rule.enabled ? colors.primary : colors.textMuted}
                          />
                        </View>

                        {config?.hasThreshold && (
                          <View style={styles.thresholdRow}>
                            <Text style={styles.thresholdLabel}>Seuil</Text>
                            <TextInput
                              style={styles.thresholdInput}
                              value={String(rule.threshold_percentage ?? 0)}
                              onChangeText={(v) => updateDraft(rule, (current) => ({ ...current, threshold_percentage: parseInt(v, 10) || 0 }))}
                              keyboardType="numeric"
                              placeholderTextColor={colors.textMuted}
                            />
                            <Text style={styles.thresholdUnit}>%</Text>
                          </View>
                        )}

                        <View style={styles.channelsRow}>
                          <Text style={styles.channelLabel}>Canaux</Text>
                          <View style={styles.channelBadge}>
                            <Ionicons name="notifications-outline" size={12} color={colors.primaryLight} />
                            <Text style={styles.channelText}>App</Text>
                          </View>
                          {CHANNEL_OPTIONS.map((channel) => {
                            const enabled = rule.notification_channels.includes(channel.value);
                            return (
                              <TouchableOpacity
                                key={channel.value}
                                style={[styles.channelBadge, !enabled && { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.divider }]}
                                onPress={() => updateDraft(rule, (current) => ({
                                  ...current,
                                  notification_channels: enabled
                                    ? current.notification_channels.filter((item) => item !== channel.value)
                                    : [...current.notification_channels, channel.value],
                                }))}
                              >
                                <Ionicons
                                  name={channel.value === 'push' ? 'phone-portrait-outline' : 'mail-outline'}
                                  size={12}
                                  color={enabled ? colors.primaryLight : colors.textMuted}
                                />
                                <Text style={[styles.channelText, !enabled && { color: colors.textMuted }]}>{t(channel.labelKey)}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <View style={[styles.channelsRow, { marginTop: Spacing.sm, alignItems: 'flex-start' }]}>
                          <Text style={styles.channelLabel}>Groupes</Text>
                          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                            {CONTACT_GROUPS.map((group) => {
                              const enabled = (rule.recipient_keys || []).includes(group.key);
                              return (
                                <TouchableOpacity
                                  key={group.key}
                                  style={[styles.scopeChip, enabled && styles.scopeChipActive]}
                                  onPress={() => updateDraft(rule, (current) => ({
                                    ...current,
                                    recipient_keys: enabled
                                      ? (current.recipient_keys || []).filter((item) => item !== group.key)
                                      : [...(current.recipient_keys || []), group.key],
                                  }))}
                                >
                                  <Text style={[styles.scopeChipText, enabled && styles.scopeChipTextActive]}>{t(group.labelKey)}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
                          <Text style={styles.thresholdLabel}>Emails additionnels</Text>
                          <TextInput
                            style={[styles.inputInline, { minHeight: 46 }]}
                            value={(rule.recipient_emails || []).join(', ')}
                            onChangeText={(value) => updateDraft(rule, (current) => ({
                              ...current,
                              recipient_emails: value.split(',').map((item) => item.trim()).filter(Boolean),
                            }))}
                            placeholder="stock@entreprise.com, direction@entreprise.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>

                        <View style={[styles.channelsRow, { marginTop: Spacing.sm, alignItems: 'flex-start' }]}>
                          <Text style={styles.channelLabel}>Severite</Text>
                          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                            {SEVERITY_OPTIONS.map((severity) => {
                              const enabled = rule.minimum_severity === severity.value;
                              return (
                                <TouchableOpacity
                                  key={severity.value}
                                  style={[styles.scopeChip, enabled && styles.scopeChipActive]}
                                  onPress={() => updateDraft(rule, (current) => ({ ...current, minimum_severity: enabled ? null : severity.value }))}
                                >
                                  <Text style={[styles.scopeChipText, enabled && styles.scopeChipTextActive]}>{t(severity.labelKey)}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        <View style={[styles.channelsRow, { marginTop: Spacing.md, justifyContent: 'space-between' }]}>
                          <Text style={styles.ruleDesc}>{hasDraft ? 'Modifications non enregistrees' : 'Regle synchronisee'}</Text>
                          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                            {hasDraft && (
                              <TouchableOpacity style={styles.resetButton} onPress={() => resetDraft(rule)}>
                                <Text style={styles.resetButtonText}>Annuler</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[styles.saveButton, savingRuleKey === currentKey && { opacity: 0.6 }]}
                              onPress={() => persistRule(rule)}
                              disabled={savingRuleKey === currentKey}
                            >
                              <Text style={styles.saveButtonText}>
                                {savingRuleKey === currentKey ? '...' : rule.rule_id.startsWith('draft:') ? 'Creer' : 'Enregistrer'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>}
      <ScreenGuide
        visible={showGuide}
        onClose={() => { setShowGuide(false); markSeen(); }}
        title={GUIDES.alerts.title}
        steps={GUIDES.alerts.steps}
      />
    </LinearGradient>
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, marginTop: Spacing.xs,
  },
  seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  alertCard: {
    ...glassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alertCardUnread: {
    borderColor: colors.primary + '40',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  severityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertInfo: { flex: 1 },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  severityText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  alertDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: Spacing.xs,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: Spacing.sm,
  },
  alertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertActionText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  // Config button
  configBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgMid, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  modalScroll: { maxHeight: 500 },
  rulesEmptyText: { fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  scopeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.glass,
  },
  scopeChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  scopeChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  scopeChipTextActive: {
    color: colors.primary,
  },
  // Rule card
  ruleCard: { ...glassStyle, padding: Spacing.md, marginBottom: Spacing.sm },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  ruleDesc: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  // Threshold
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  thresholdLabel: { fontSize: FontSize.sm, color: colors.textSecondary },
  thresholdInput: { width: 60, backgroundColor: colors.inputBg, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.divider, color: colors.text, fontSize: FontSize.md, padding: Spacing.sm, textAlign: 'center' },
  thresholdUnit: { fontSize: FontSize.sm, color: colors.textSecondary },
  inputInline: {
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  // Channels
  channelsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  channelLabel: { fontSize: FontSize.xs, color: colors.textMuted },
  channelBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.primary + '15', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  channelText: { fontSize: FontSize.xs, color: colors.primaryLight },
  resetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  resetButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: colors.bgDark,
  },
  // AI Anomaly Detection
  anomalyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  anomalyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anomalyBtnTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  anomalyBtnSub: { fontSize: 11, marginTop: 1 },
  anomalyItem: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: Spacing.xs,
  },
  anomalyTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  anomalyDesc: { fontSize: FontSize.xs, lineHeight: 18 },
});
