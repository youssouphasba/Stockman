import React, { useCallback, useState, useEffect } from 'react';
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
  Switch,
  Alert as RNAlert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { alerts as alertsApi, alertRules as alertRulesApi, Alert, AlertRule } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';

const RULE_TYPE_CONFIG: Record<string, { label: string; description: string; hasThreshold: boolean }> = {
  low_stock: { label: 'Stock bas', description: 'Alerte quand le stock descend sous le seuil minimum', hasThreshold: true },
  out_of_stock: { label: 'Rupture de stock', description: 'Alerte quand un produit est en rupture', hasThreshold: false },
  overstock: { label: 'Surstock', description: 'Alerte quand le stock dépasse le seuil maximum', hasThreshold: true },
  slow_moving: { label: 'Produit dormant', description: 'Alerte quand un produit n\'a pas bougé depuis 30 jours', hasThreshold: false },
};

export default function AlertsScreen() {
  const { colors, glassStyle } = useTheme();
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
      case 'critical': return 'Critique';
      case 'warning': return 'Attention';
      default: return 'Info';
    }
  }
  const [alertList, setAlertList] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('alerts');

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Rules modal
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await alertsApi.list();
      setAlertList(result.items ?? result as any);
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

  async function toggleRule(rule: AlertRule) {
    try {
      const updated = await alertRulesApi.update(rule.rule_id, {
        type: rule.type,
        enabled: !rule.enabled,
        threshold_percentage: rule.threshold_percentage,
        notification_channels: rule.notification_channels,
      });
      setRules((prev) => prev.map((r) => (r.rule_id === rule.rule_id ? updated : r)));
    } catch {
      RNAlert.alert('Erreur', 'Impossible de modifier la règle');
    }
  }

  async function updateThreshold(rule: AlertRule, value: string) {
    const threshold = parseInt(value) || 0;
    try {
      const updated = await alertRulesApi.update(rule.rule_id, {
        type: rule.type,
        enabled: rule.enabled,
        threshold_percentage: threshold,
        notification_channels: rule.notification_channels,
      });
      setRules((prev) => prev.map((r) => (r.rule_id === rule.rule_id ? updated : r)));
    } catch {
      RNAlert.alert('Erreur', 'Impossible de modifier le seuil');
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
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

  const unread = alertList.filter((a) => !a.is_read).length;

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerRow, { paddingTop: insets.top }]}>
          <View>
            <Text style={styles.pageTitle}>Alertes</Text>
            <Text style={styles.subtitle}>
              {unread > 0 ? `${unread} non lue(s)` : 'Tout est en ordre'}
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

        {alertList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
            <Text style={styles.emptyTitle}>Aucune alerte</Text>
            <Text style={styles.emptyText}>Tous vos stocks sont normaux</Text>
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
                      <Text style={[styles.alertActionText, { color: colors.success }]}>Marquer lue</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.alertActionBtn} onPress={() => handleDismiss(alert.alert_id)}>
                    <Ionicons name="close" size={16} color={colors.textMuted} />
                    <Text style={[styles.alertActionText, { color: colors.textMuted }]}>Ignorer</Text>
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
                  {showAllAlerts ? 'Voir moins' : `Voir les ${alertList.length - 10} autres alertes`}
                </Text>
                <Ionicons name={showAllAlerts ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Rules Configuration Modal */}
      <Modal visible={showRulesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Règles d'alertes</Text>
              <TouchableOpacity onPress={() => setShowRulesModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {rulesLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {rules.length === 0 ? (
                  <Text style={styles.rulesEmptyText}>Aucune règle configurée</Text>
                ) : (
                  rules.map((rule) => {
                    const config = RULE_TYPE_CONFIG[rule.type];
                    return (
                      <View key={rule.rule_id} style={styles.ruleCard}>
                        <View style={styles.ruleHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ruleTitle}>{config?.label || rule.type}</Text>
                            <Text style={styles.ruleDesc}>{config?.description || ''}</Text>
                          </View>
                          <Switch
                            value={rule.enabled}
                            onValueChange={() => toggleRule(rule)}
                            trackColor={{ false: colors.glass, true: colors.primary + '60' }}
                            thumbColor={rule.enabled ? colors.primary : colors.textMuted}
                          />
                        </View>

                        {config?.hasThreshold && rule.enabled && (
                          <View style={styles.thresholdRow}>
                            <Text style={styles.thresholdLabel}>Seuil :</Text>
                            <TextInput
                              style={styles.thresholdInput}
                              value={String(rule.threshold_percentage ?? 0)}
                              onChangeText={(v) => {
                                setRules((prev) =>
                                  prev.map((r) =>
                                    r.rule_id === rule.rule_id
                                      ? { ...r, threshold_percentage: parseInt(v) || 0 }
                                      : r
                                  )
                                );
                              }}
                              onBlur={() => updateThreshold(rule, String(rule.threshold_percentage ?? 0))}
                              keyboardType="numeric"
                              placeholderTextColor={colors.textMuted}
                            />
                            <Text style={styles.thresholdUnit}>%</Text>
                          </View>
                        )}

                        <View style={styles.channelsRow}>
                          <Text style={styles.channelLabel}>Canaux :</Text>
                          {rule.notification_channels.map((ch) => (
                            <View key={ch} style={styles.channelBadge}>
                              <Ionicons
                                name={ch === 'push' ? 'phone-portrait-outline' : ch === 'email' ? 'mail-outline' : 'notifications-outline'}
                                size={12}
                                color={colors.primaryLight}
                              />
                              <Text style={styles.channelText}>
                                {ch === 'in_app' ? 'App' : ch === 'push' ? 'Push' : ch === 'email' ? 'Email' : ch}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  // Channels
  channelsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  channelLabel: { fontSize: FontSize.xs, color: colors.textMuted },
  channelBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.primary + '15', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  channelText: { fontSize: FontSize.xs, color: colors.primaryLight },
});
