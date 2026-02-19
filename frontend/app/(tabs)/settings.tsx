import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as FileSystem from 'expo-file-system';
const { documentDirectory } = FileSystem;
import * as Sharing from 'expo-sharing';
import { settings as settingsApi, UserSettings, ReminderRuleSettings, profile } from '../../services/api';
import ReminderRulesSettingsComponent from '../../components/ReminderRulesSettings';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import AiSupportModal from '../../components/AiSupportModal';
import HelpCenter from '../../components/HelpCenter';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useSync } from '../../contexts/SyncContext';
import ContactSupportModal from '../../components/ContactSupportModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import DeleteAccountModal from '../../components/DeleteAccountModal';
import { disputes } from '../../services/api';
import LanguagePickerModal from '../../components/LanguagePickerModal';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, glassStyle, isDark, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);
  const { user, logout, isPinSet, isBiometricsEnabled, togglePin, toggleBiometrics } = useAuth();
  const { isOnline, syncStatus, pendingCount, lastSyncLabel, processQueue, prefetchData } = useSync();
  const [settingsData, setSettingsData] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [helpGuide, setHelpGuide] = useState<{ title: string; steps: any[] } | null>(null);

  const handleExportData = async () => {
    try {
      setLoading(true);
      const data = await profile.exportData();
      const filename = `stockman_data_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: t('settings.export_data') });
      } else {
        Alert.alert(t('common.success'), t('settings.export_success') + ' ' + fileUri);
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('settings.export_error'));
    } finally {
      setLoading(false);
    }
  };
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeSubject, setDisputeSubject] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeType, setDisputeType] = useState('other');

  const loadSettings = useCallback(async () => {
    try {
      const result = await settingsApi.get();
      setSettingsData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmitDispute = async () => {
    if (!disputeSubject.trim() || !disputeDesc.trim()) {
      Alert.alert(t('common.error'), t('settings.report_subject_required'));
      return;
    }
    try {
      await disputes.create({ subject: disputeSubject, description: disputeDesc, type: disputeType });
      Alert.alert('✅ ' + t('common.success'), t('settings.report_sent'));
      setShowDisputeForm(false);
      setDisputeSubject('');
      setDisputeDesc('');
      setDisputeType('other');
    } catch {
      Alert.alert(t('common.error'), t('settings.report_error'));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  async function toggleModule(key: string) {
    if (!settingsData) return;
    const newModules = { ...settingsData.modules, [key]: !settingsData.modules[key] };
    try {
      const updated = await settingsApi.update({ modules: newModules });
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  async function toggleSimpleMode() {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({ simple_mode: !settingsData.simple_mode });
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  async function toggleNotifications() {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({ push_notifications: !settingsData.push_notifications });
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  async function updateReminderRules(newRules: ReminderRuleSettings) {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({ reminder_rules: newRules } as any);
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logout_confirm'))) {
        logout();
      }
    } else {
      Alert.alert(
        t('settings.logout'),
        t('settings.logout_confirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.logout_btn'), style: 'destructive', onPress: () => logout() },
        ]
      );
    }
  }

  const moduleLabels: Record<string, string> = {
    stock_management: t('settings.module_stock'),
    alerts: t('settings.module_alerts'),
    rules: t('settings.module_alert_rules'),
    statistics: t('settings.module_stats'),
    history: t('settings.module_history'),
    export: t('settings.module_export'),
  };

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={{ height: Spacing.sm }} />

        {/* User info */}
        <View style={styles.card}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(true)}>
                <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: '600' }}>{t('settings.change_password')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* App settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.application')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.dark_mode')}</Text>
              <Text style={styles.settingDesc}>{t('settings.dark_mode_desc')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.simple_mode')}</Text>
              <Text style={styles.settingDesc}>{t('settings.simple_mode_desc')}</Text>
            </View>
            <Switch
              value={settingsData?.simple_mode ?? true}
              onValueChange={toggleSimpleMode}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={settingsData?.simple_mode ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
              <Text style={styles.settingDesc}>{t('settings.notifications_desc')}</Text>
            </View>
            <Switch
              value={settingsData?.push_notifications ?? true}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={settingsData?.push_notifications ? colors.primary : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              <Text style={styles.settingDesc}>{i18n.language.toUpperCase()}</Text>
            </View>
            <Ionicons name="language-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Team (Owner only) */}
        {user?.role === 'shopkeeper' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('settings.team_title')}</Text>
            <Link href="/(tabs)/users" asChild>
              <TouchableOpacity style={styles.supportRow}>
                <View style={[styles.supportIconWrapper, { backgroundColor: colors.info }]}>
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{t('settings.users_permissions')}</Text>
                  <Text style={styles.settingDesc}>{t('settings.users_permissions_desc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Link>
          </View>
        )}

        {/* Modules */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.modules')}</Text>
          {settingsData && Object.entries(settingsData.modules).map(([key, enabled]) => (
            <View key={key} style={styles.settingRow}>
              <Text style={styles.settingLabel}>{moduleLabels[key] ?? key}</Text>
              <Switch
                value={enabled}
                onValueChange={() => toggleModule(key)}
                trackColor={{ false: colors.divider, true: colors.primary + '60' }}
                thumbColor={enabled ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </View>

        {/* Reminder Rules */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.reminders')}</Text>
          <Text style={[styles.settingDesc, { marginBottom: Spacing.sm }]}>
            {t('settings.reminders_desc')}
          </Text>
          <ReminderRulesSettingsComponent
            rules={settingsData?.reminder_rules ?? {
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
            }}
            onUpdate={updateReminderRules}
          />
        </View>

        {/* Synchronisation */}
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.connection_status')}</Text>
              <Text style={styles.settingDesc}>
                {isOnline ? t('settings.online') : t('settings.offline')}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.danger }]} />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.last_sync')}</Text>
              <Text style={styles.settingDesc}>{lastSyncLabel}</Text>
            </View>
          </View>
          {pendingCount > 0 && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{t('settings.pending_actions')}</Text>
                <Text style={styles.settingDesc}>
                  {pendingCount === 1 ? t('settings.pending_actions_desc', { count: pendingCount }) : t('settings.pending_actions_desc_plural', { count: pendingCount })}
                </Text>
              </View>
              <View style={[styles.pendingBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={{ color: colors.warning, fontSize: FontSize.sm, fontWeight: '700' }}>{pendingCount}</Text>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={prefetchData}
              disabled={!isOnline}
            >
              <Ionicons name="download-outline" size={18} color={isOnline ? colors.primary : colors.textMuted} />
              <Text style={{ color: isOnline ? colors.primary : colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' }}>
                {t('settings.prefetch')}
              </Text>
            </TouchableOpacity>
            {pendingCount > 0 && (
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}
                onPress={processQueue}
                disabled={!isOnline || syncStatus === 'syncing'}
              >
                <Ionicons name="sync-outline" size={18} color={isOnline ? colors.success : colors.textMuted} />
                <Text style={{ color: isOnline ? colors.success : colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' }}>
                  {syncStatus === 'syncing' ? t('settings.syncing') : t('settings.sync_now')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subscription */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.application')}</Text>
          <TouchableOpacity
            style={styles.supportRow}
            onPress={() => router.push('/subscription')}
          >
            <View style={[styles.supportIconWrapper, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="card-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.my_subscription')}</Text>
              <Text style={styles.settingDesc}>{t('settings.subscription_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.help_support')}</Text>
          <TouchableOpacity style={styles.supportRow}>
            <View style={styles.supportIconWrapper}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.ai_assistant')}</Text>
              <Text style={styles.settingDesc}>{t('settings.ai_assistant_desc')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportRow} onPress={() => setShowHelpCenter(true)}>
            <View style={[styles.supportIconWrapper, { backgroundColor: colors.info }]}>
              <Ionicons name="book-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.help_center')}</Text>
              <Text style={styles.settingDesc}>{t('settings.help_center_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportRow} onPress={() => setShowSupportModal(true)}>
            <View style={[styles.supportIconWrapper, { backgroundColor: colors.primary }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.contact_admin')}</Text>
              <Text style={styles.settingDesc}>{t('settings.contact_admin_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Signaler un problème */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⚠️ {t('settings.report_problem')}</Text>
          {!showDisputeForm ? (
            <TouchableOpacity onPress={() => setShowDisputeForm(true)} style={styles.supportRow}>
              <View style={[styles.supportIconWrapper, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="flag-outline" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{t('settings.report_problem')}</Text>
                <Text style={styles.settingDesc}>{t('settings.report_problem_desc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={[styles.settingDesc, { marginBottom: 4 }]}>{t('settings.problem_type')} :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[{ id: 'payment', label: '💳 ' + t('settings.dispute_payment') }, { id: 'product', label: '📦 ' + t('settings.dispute_product') }, { id: 'service', label: '🛠️ ' + t('settings.dispute_service') }, { id: 'delivery', label: '🚚 ' + t('settings.dispute_delivery') }, { id: 'other', label: '❓ ' + t('settings.dispute_other') }].map(dt => (
                    <TouchableOpacity key={dt.id} onPress={() => setDisputeType(dt.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: disputeType === dt.id ? colors.primary + '33' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: disputeType === dt.id ? colors.primary : 'rgba(255,255,255,0.1)' }}>
                      <Text style={{ color: disputeType === dt.id ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{dt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput value={disputeSubject} onChangeText={setDisputeSubject} placeholder={t('settings.problem_subject')}
                placeholderTextColor={colors.textMuted} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, color: colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
              <TextInput value={disputeDesc} onChangeText={setDisputeDesc} placeholder={t('settings.problem_desc_placeholder')}
                placeholderTextColor={colors.textMuted} multiline numberOfLines={4}
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, color: colors.text, minHeight: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowDisputeForm(false)} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSubmitDispute} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.send')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Security */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.security')}</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.pin_login')}</Text>
              <Text style={styles.settingDesc}>{t('settings.pin_login_desc')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => isPinSet ? togglePin(false) : router.push('/pin')}
              style={[styles.toggle, isPinSet && styles.toggleActive]}
            >
              <View style={[styles.toggleCircle, isPinSet && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.biometrics')}</Text>
              <Text style={styles.settingDesc}>{t('settings.biometrics_desc')}</Text>
            </View>
            <TouchableOpacity
              disabled={!isPinSet}
              onPress={() => toggleBiometrics(!isBiometricsEnabled)}
              style={[styles.toggle, isBiometricsEnabled && styles.toggleActive, !isPinSet && { opacity: 0.3 }]}
            >
              <View style={[styles.toggleCircle, isBiometricsEnabled && styles.toggleCircleActive]} />
            </TouchableOpacity>
          </View>
          {!isPinSet && <Text style={[styles.settingDesc, { marginTop: 4, color: colors.warning }]}>{t('settings.pin_required')}</Text>}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings.version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <TouchableOpacity
            style={[styles.aboutRow, { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.md }]}
            onPress={() => router.push('/terms')}
          >
            <Text style={[styles.aboutLabel, { color: colors.primary }]}>{t('settings.terms')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aboutRow, { marginTop: Spacing.sm }]}
            onPress={() => router.push('/privacy')}
          >
            <Text style={[styles.aboutLabel, { color: colors.primary }]}>{t('settings.privacy')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* GDPR - Danger Zone */}
        <View style={[styles.card, { borderColor: colors.danger + '30', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>{t('settings.danger_zone')}</Text>
          <Text style={[styles.settingDesc, { marginBottom: Spacing.md }]}>
            {t('settings.danger_zone_desc')}
          </Text>

          <TouchableOpacity style={styles.settingRow} onPress={handleExportData}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.export_data')}</Text>
              <Text style={styles.settingDesc}>{t('settings.export_data_desc')}</Text>
            </View>
            <Ionicons name="download-outline" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => setShowDeleteModal(true)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.danger }]}>{t('settings.delete_account')}</Text>
              <Text style={styles.settingDesc}>{t('settings.delete_account_desc')}</Text>
            </View>
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>{t('settings.logout_btn')}</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      <HelpCenter
        visible={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        userRole="shopkeeper"
        onLaunchGuide={(guideKey) => {
          const guide = (GUIDES as any)[guideKey];
          if (guide) {
            setHelpGuide(guide);
          }
        }}
      />

      {
        helpGuide && (
          <ScreenGuide
            visible={!!helpGuide}
            onClose={() => setHelpGuide(null)}
            title={helpGuide.title}
            steps={helpGuide.steps}
          />
        )
      }

      <ContactSupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <LanguagePickerModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </LinearGradient >
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.lg,
  },
  card: {
    ...glassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.md,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontSize: FontSize.md,
    color: colors.text,
  },
  settingDesc: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  aboutLabel: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
  },
  aboutValue: {
    fontSize: FontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...glassStyle,
    borderColor: colors.danger + '30',
    padding: Spacing.md,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  supportIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.danger,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pendingBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
});
