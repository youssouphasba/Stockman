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
import * as FileSystem from 'expo-file-system/legacy';
const { documentDirectory } = FileSystem;
import * as Sharing from 'expo-sharing';
import { notifications as notificationsApi, settings as settingsApi, UserSettings, profile, userFeatures, stores as storesApi, Store } from '../../services/api';
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
import AccountSwitcherModal from '../../components/AccountSwitcherModal';

// Sector selection removed - defined at registration

const DEFAULT_NOTIFICATION_CONTACTS = {
  default: [] as string[],
  stock: [] as string[],
  procurement: [] as string[],
  finance: [] as string[],
  crm: [] as string[],
  operations: [] as string[],
  billing: [] as string[],
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  in_app: true,
  push: true,
  email: false,
  minimum_severity_for_push: 'warning' as 'info' | 'warning' | 'critical',
  minimum_severity_for_email: 'critical' as 'info' | 'warning' | 'critical',
};

const NOTIFICATION_CONTACT_FIELDS: { key: keyof typeof DEFAULT_NOTIFICATION_CONTACTS; labelKey: string; placeholder: string; requiredModule?: string }[] = [
  { key: 'default', labelKey: 'settings.email_channel_default', placeholder: 'direction@entreprise.com' },
  { key: 'stock', labelKey: 'settings.email_channel_stock', placeholder: 'stock@entreprise.com', requiredModule: 'stock_management' },
  { key: 'procurement', labelKey: 'settings.email_channel_procurement', placeholder: 'appro@entreprise.com', requiredModule: 'suppliers' },
  { key: 'finance', labelKey: 'settings.email_channel_finance', placeholder: 'finance@entreprise.com', requiredModule: 'accounting' },
  { key: 'crm', labelKey: 'settings.email_channel_crm', placeholder: 'crm@entreprise.com', requiredModule: 'crm' },
  { key: 'operations', labelKey: 'settings.email_channel_operations', placeholder: 'ops@entreprise.com' },
  { key: 'billing', labelKey: 'settings.email_channel_billing', placeholder: 'billing@entreprise.com' },
];

type SettingsSectionKey =
  | 'accountAppGroup'
  | 'storeGroup'
  | 'organizationGroup'
  | 'alertsGroup'
  | 'supportGroup'
  | 'securityGroup'
  | 'profile'
  | 'notifications'
  | 'team'
  | 'enterpriseHub'
  | 'organization'
  | 'storeIdentity'
  | 'storeDocuments'
  | 'storeEmpty'
  | 'storeAlerts'
  | 'billing'
  | 'accountAlerts'
  | 'tax'
  | 'reminders'
  | 'sync'
  | 'support'
  | 'incident'
  | 'security'
  | 'legal'
  | 'data';

const SETTINGS_SECTION_GROUPS: SettingsSectionKey[][] = [
  ['accountAppGroup', 'storeGroup', 'organizationGroup', 'alertsGroup', 'supportGroup', 'securityGroup'],
  ['billing', 'profile'],
  ['team', 'enterpriseHub', 'organization'],
  ['storeIdentity', 'storeDocuments', 'storeEmpty'],
  ['accountAlerts', 'storeAlerts', 'tax', 'reminders', 'sync'],
  ['support', 'incident'],
  ['security', 'legal', 'data'],
];

type SettingsAccordionSectionProps = {
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  expanded: boolean;
  onToggle: () => void;
  styles: ReturnType<typeof getStyles>;
  colors: any;
  variant?: 'default' | 'nested';
  children: React.ReactNode;
};

function SettingsAccordionSection({
  title,
  description,
  icon,
  accentColor,
  expanded,
  onToggle,
  styles,
  colors,
  variant = 'default',
  children,
}: SettingsAccordionSectionProps) {
  return (
    <View style={variant === 'nested' ? styles.nestedCard : styles.card}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.85}>
        <View style={[styles.accordionIconWrap, { backgroundColor: accentColor + '20' }]}>
          <Ionicons name={icon as any} size={20} color={accentColor} />
        </View>
        <View style={styles.accordionCopy}>
          <Text style={styles.accordionTitle}>{title}</Text>
          <Text style={styles.accordionDescription}>{description}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, glassStyle, isDark, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);
  const { user, logout, isPinSet, isBiometricsEnabled, togglePin, toggleBiometrics, isRestaurant, isOrgAdmin, isBillingAdmin, hasPermission } = useAuth();
  const { isOnline, syncStatus, pendingCount, lastSyncLabel, processQueue, prefetchData } = useSync();
  const [settingsData, setSettingsData] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SettingsSectionKey, boolean>>({
    accountAppGroup: true,
    storeGroup: true,
    organizationGroup: false,
    alertsGroup: false,
    supportGroup: false,
    securityGroup: false,
    profile: true,
    notifications: false,
    team: false,
    enterpriseHub: false,
    organization: false,
    storeIdentity: true,
    storeDocuments: false,
    storeEmpty: true,
    storeAlerts: false,
    billing: true,
    accountAlerts: false,
    tax: false,
    reminders: false,
    sync: false,
    support: false,
    incident: false,
    security: false,
    legal: false,
    data: false,
  });
  const [billingContactName, setBillingContactName] = useState('');
  const [billingContactEmail, setBillingContactEmail] = useState('');
  const [notificationContacts, setNotificationContacts] = useState(DEFAULT_NOTIFICATION_CONTACTS);
  const [storeNotificationContacts, setStoreNotificationContacts] = useState(DEFAULT_NOTIFICATION_CONTACTS);
  const [notificationPreferences, setNotificationPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [testPushSending, setTestPushSending] = useState(false);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');
  const [invoiceLabel, setInvoiceLabel] = useState('Facture');
  const [invoicePrefix, setInvoicePrefix] = useState('FAC');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState('');
  const [helpGuide, setHelpGuide] = useState<{ title: string; steps: any[] } | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  // Sector state removed - sector is set at registration

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 2600);
    return () => clearTimeout(timeout);
  }, [feedback]);

  function showFeedback(message: string, tone: 'success' | 'error' = 'success') {
    setFeedback({ tone, message });
  }

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
  const showManagerZone = isOrgAdmin || isBillingAdmin;
  const hasEnterprisePlan = (user?.effective_plan || user?.plan) === 'enterprise';
  const canViewTeam = isOrgAdmin || hasPermission('staff', 'read');
  const canManageOrganizationSettings = isOrgAdmin;
  const canManageStoreSettings = isOrgAdmin;
  const canManageAlertSettings = isOrgAdmin;
  const canManageBillingSettings = showManagerZone && isBillingAdmin;
  const canViewOrganizationGroup = canViewTeam || (showManagerZone && isOrgAdmin && hasEnterprisePlan) || canManageOrganizationSettings;
  const canViewStoreGroup = canManageStoreSettings;

  const loadSettings = useCallback(async () => {
    try {
      const [result, _features, storesList] = await Promise.all([
        settingsApi.get(),
        userFeatures.get().catch(() => null),
        storesApi.list().catch(() => []),
      ]);
      setSettingsData(result);
      setBillingContactName(result?.billing_contact_name || '');
      setBillingContactEmail(result?.billing_contact_email || '');
      setNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(result?.notification_contacts || {}) });
      setStoreNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(result?.store_notification_contacts || {}) });
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(result?.notification_preferences || {}) });
      const activeStore = (storesList || []).find((store) => store.store_id === user?.active_store_id) || null;
      setCurrentStore(activeStore);
      setStoreName(activeStore?.name || '');
      setStoreAddress(activeStore?.address || '');
      setReceiptName(activeStore?.receipt_business_name || result?.receipt_business_name || '');
      setReceiptFooter(activeStore?.receipt_footer || result?.receipt_footer || '');
      setInvoiceName(activeStore?.invoice_business_name || result?.invoice_business_name || '');
      setInvoiceAddress(activeStore?.invoice_business_address || result?.invoice_business_address || '');
      setInvoiceLabel(activeStore?.invoice_label || result?.invoice_label || 'Facture');
      setInvoicePrefix(activeStore?.invoice_prefix || result?.invoice_prefix || 'FAC');
      setInvoiceFooter(activeStore?.invoice_footer || result?.invoice_footer || '');
      setInvoicePaymentTerms(activeStore?.invoice_payment_terms || result?.invoice_payment_terms || '');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user?.active_store_id]);

  const handleSubmitDispute = async () => {
    if (!disputeSubject.trim() || !disputeDesc.trim()) {
      Alert.alert(t('common.error'), t('settings.report_subject_required'));
      return;
    }
    try {
      await disputes.create({ subject: disputeSubject, description: disputeDesc, type: disputeType });
      Alert.alert(t('common.success'), t('settings.report_sent'));
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

  function toggleSection(section: SettingsSectionKey) {
    setExpandedSections((current) => {
      const isCurrentlyExpanded = current[section];
      if (isCurrentlyExpanded) {
        return {
          ...current,
          [section]: false,
        };
      }

      const nextState = { ...current, [section]: true };

      for (const group of SETTINGS_SECTION_GROUPS) {
        if (!group.includes(section)) {
          continue;
        }

        for (const sibling of group) {
          if (sibling !== section) {
            nextState[sibling] = false;
          }
        }
      }

      return nextState;
    });
  }

  async function toggleModule(key: string) {
    if (!settingsData) return;
    const newModules = { ...settingsData.modules, [key]: !settingsData.modules[key] };
    try {
      const updated = await settingsApi.update({ modules: newModules });
      setSettingsData(updated);
      showFeedback('Modules mis à jour.');
    } catch {
      showFeedback('Impossible de mettre à jour les modules.', 'error');
    }
  }

  async function toggleNotifications() {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({ push_notifications: !settingsData.push_notifications });
      setSettingsData(updated);
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(updated?.notification_preferences || {}) });
      showFeedback('Préférences de notification mises à jour.');
    } catch {
      showFeedback('Impossible de mettre à jour les notifications.', 'error');
    }
  }

  async function toggleManagerZone() {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({
        mobile_preferences: {
          ...(settingsData.mobile_preferences || {}),
          show_manager_zone: !(settingsData.mobile_preferences?.show_manager_zone ?? true),
        },
      } as any);
      setSettingsData(updated);
      showFeedback('Zone manager mise à jour.');
    } catch {
      showFeedback('Impossible de mettre à jour la zone manager.', 'error');
    }
  }

  function updateNotificationGroup(
    setter: React.Dispatch<React.SetStateAction<typeof DEFAULT_NOTIFICATION_CONTACTS>>,
    key: keyof typeof DEFAULT_NOTIFICATION_CONTACTS,
    value: string,
  ) {
    const emails = value.split(',').map((email) => email.trim()).filter(Boolean);
    setter((current) => ({ ...current, [key]: emails }));
  }

  async function saveNotificationPreferences() {
    try {
      const updated = await settingsApi.update({
        push_notifications: notificationPreferences.push,
        notification_preferences: notificationPreferences,
      } as any);
      setSettingsData(updated);
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...(updated?.notification_preferences || {}) });
      showFeedback('Préférences de notification enregistrées.');
    } catch {
      showFeedback('Impossible de mettre à jour vos notifications.', 'error');
    }
  }

  async function sendTestPush() {
    setTestPushSending(true);
    try {
      const result = await notificationsApi.testPush();
      Alert.alert(t('settings.test_push_title', 'Test push lancé'), result?.message || t('settings.test_push_sent', 'Une notification de test a été envoyée.'));
    } catch (err: any) {
      Alert.alert(t('settings.test_push_error_title', 'Test push impossible'), err?.message || t('settings.test_push_error', "Impossible d'envoyer la notification de test."));
    } finally {
      setTestPushSending(false);
    }
  }

  async function saveNotificationContacts() {
    try {
      const updated = await settingsApi.update({
        notification_contacts: notificationContacts,
      } as any);
      setSettingsData(updated);
      setNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(updated?.notification_contacts || {}) });
      showFeedback('E-mails de notification du compte enregistrés.');
    } catch {
      showFeedback('Impossible de mettre à jour les e-mails de notification.', 'error');
    }
  }

  async function saveStoreNotificationContacts() {
    try {
      const updated = await settingsApi.update({
        store_notification_contacts: storeNotificationContacts,
      } as any);
      setSettingsData(updated);
      setStoreNotificationContacts({ ...DEFAULT_NOTIFICATION_CONTACTS, ...(updated?.store_notification_contacts || {}) });
      showFeedback('E-mails de notification de la boutique enregistrés.');
    } catch {
      showFeedback('Impossible de mettre à jour les e-mails de la boutique.', 'error');
    }
  }

  async function saveActiveStoreSettings() {
    if (!currentStore) return;
    try {
      const updatedStore = await storesApi.update(currentStore.store_id, {
        name: storeName,
        address: storeAddress,
        receipt_business_name: receiptName,
        receipt_footer: receiptFooter,
        invoice_business_name: invoiceName,
        invoice_business_address: invoiceAddress,
        invoice_label: invoiceLabel,
        invoice_prefix: invoicePrefix,
        invoice_footer: invoiceFooter,
        invoice_payment_terms: invoicePaymentTerms,
      });
      setCurrentStore(updatedStore);
      setStoreName(updatedStore.name || '');
      setStoreAddress(updatedStore.address || '');
      setReceiptName(updatedStore.receipt_business_name || '');
      setReceiptFooter(updatedStore.receipt_footer || '');
      setInvoiceName(updatedStore.invoice_business_name || '');
      setInvoiceAddress(updatedStore.invoice_business_address || '');
      setInvoiceLabel(updatedStore.invoice_label || 'Facture');
      setInvoicePrefix(updatedStore.invoice_prefix || 'FAC');
      setInvoiceFooter(updatedStore.invoice_footer || '');
      setInvoicePaymentTerms(updatedStore.invoice_payment_terms || '');
      setSettingsData((prev) => prev ? ({
        ...prev,
        receipt_business_name: updatedStore.receipt_business_name,
        receipt_footer: updatedStore.receipt_footer,
        invoice_business_name: updatedStore.invoice_business_name,
        invoice_business_address: updatedStore.invoice_business_address,
        invoice_label: updatedStore.invoice_label,
        invoice_prefix: updatedStore.invoice_prefix,
        invoice_footer: updatedStore.invoice_footer,
        invoice_payment_terms: updatedStore.invoice_payment_terms,
      }) : prev);
      showFeedback('Boutique mise à jour.');
    } catch {
      showFeedback('Impossible de mettre à jour la boutique active.', 'error');
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
    crm: t('settings.module_crm', 'CRM clients'),
    suppliers: t('settings.module_suppliers', 'Fournisseurs'),
    orders: t('settings.module_orders', 'Commandes'),
    accounting: t('settings.module_accounting', 'Comptabilité'),
    reservations: t('settings.module_reservations', 'Réservations'),
    kitchen: t('settings.module_kitchen', 'Cuisine (KDS)'),
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
        {feedback ? (
          <View
            style={[
              styles.feedbackBanner,
              feedback.tone === 'success' ? styles.feedbackBannerSuccess : styles.feedbackBannerError,
            ]}
          >
            <Ionicons
              name={feedback.tone === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={18}
              color={feedback.tone === 'success' ? colors.success : colors.danger}
            />
            <Text
              style={[
                styles.feedbackBannerText,
                { color: feedback.tone === 'success' ? colors.success : colors.danger },
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        ) : null}

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
                <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                  {user?.auth_type !== 'email' && !user?.password_set
                    ? t('settings.set_password', 'Definir un mot de passe')
                    : t('settings.change_password')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>


        <SettingsAccordionSection
          title={t('settings.section_account')}
          description={t('settings.section_account_desc')}
          icon="settings-outline"
          accentColor={colors.primary}
          expanded={expandedSections.accountAppGroup}
          onToggle={() => toggleSection('accountAppGroup')}
          styles={styles}
          colors={colors}
        >
        {canManageBillingSettings && (
        <SettingsAccordionSection
          title={t('settings.section_subscription')}
          description={t('settings.section_subscription_desc')}
          icon="card-outline"
          accentColor={colors.warning}
          expanded={expandedSections.billing}
          onToggle={() => toggleSection('billing')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.sectionTitle}>{t('settings.subscription_title')}</Text>
          <TouchableOpacity
            style={styles.supportRow}
            onPress={() => router.push('/(tabs)/subscription' as any)}
          >
            <View style={[styles.supportIconWrapper, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="card-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>{t('settings.my_subscription')}</Text>
              <Text style={styles.settingDesc}>{t('settings.subscription_view_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.settingRow, { alignItems: 'flex-start', flexDirection: 'column', gap: Spacing.sm, borderBottomWidth: 0, marginTop: Spacing.md }]}>
            <Text style={styles.settingLabel}>{t('settings.billing_contact')}</Text>
            <Text style={styles.settingDesc}>{t('settings.billing_contact_desc')}</Text>
            <TextInput
              style={styles.input}
              value={billingContactName}
              onChangeText={setBillingContactName}
              placeholder={t('settings.billing_name_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={billingContactEmail}
              onChangeText={setBillingContactEmail}
              placeholder="email@entreprise.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch' }]}
              onPress={async () => {
                try {
                  const updated = await settingsApi.update({
                    billing_contact_name: billingContactName,
                    billing_contact_email: billingContactEmail,
                  } as any);
                  setSettingsData(updated);
                  setBillingContactName(updated?.billing_contact_name || '');
                  setBillingContactEmail(updated?.billing_contact_email || '');
                } catch {}
              }}
            >
              <Ionicons name="save-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
                {t('settings.save_billing_contact')}
              </Text>
            </TouchableOpacity>
          </View>
        </SettingsAccordionSection>
        )}
        <SettingsAccordionSection
          title={t('settings.section_profile')}
          description={t('settings.section_profile_desc')}
          icon="person-outline"
          accentColor={colors.primary}
          expanded={expandedSections.profile}
          onToggle={() => toggleSection('profile')}
          styles={styles}
          colors={colors}
          variant="nested"
        >

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

        </SettingsAccordionSection>

        <SettingsAccordionSection
          title={t('settings.section_sync')}
          description={t('settings.section_sync_desc')}
          icon="sync-outline"
          accentColor={colors.info}
          expanded={expandedSections.sync}
          onToggle={() => toggleSection('sync')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
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
        </SettingsAccordionSection>

        </SettingsAccordionSection>

        {canViewOrganizationGroup && (
        <SettingsAccordionSection
          title={t('settings.section_org')}
          description={t('settings.section_org_desc')}
          icon="business-outline"
          accentColor={colors.success}
          expanded={expandedSections.organizationGroup}
          onToggle={() => toggleSection('organizationGroup')}
          styles={styles}
          colors={colors}
        >
        {/* Team link (direct, no sub-dropdown) */}
        {canViewTeam && (
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
        )}

        {/* Modules */}
        {canManageOrganizationSettings && (
        <SettingsAccordionSection
          title={t('settings.section_modules')}
          description={t('settings.section_modules_desc')}
          icon="grid-outline"
          accentColor={colors.success}
          expanded={expandedSections.organization}
          onToggle={() => toggleSection('organization')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.subsectionTitle}>{t('settings.modules')}</Text>
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
        </SettingsAccordionSection>
        )}
        </SettingsAccordionSection>
        )}

        {canViewStoreGroup && (
        <SettingsAccordionSection
          title={t('settings.section_store')}
          description={t('settings.section_store_desc')}
          icon="storefront-outline"
          accentColor={colors.info}
          expanded={expandedSections.storeGroup}
          onToggle={() => toggleSection('storeGroup')}
          styles={styles}
          colors={colors}
        >
        {isOrgAdmin && currentStore && (
        <SettingsAccordionSection
          title={t('settings.section_store_identity')}
          description={t('settings.section_store_identity_desc')}
          icon="storefront-outline"
          accentColor={colors.info}
          expanded={expandedSections.storeIdentity}
          onToggle={() => toggleSection('storeIdentity')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.settingDesc}>{t('settings.store_identity_info')}</Text>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            <TextInput
              style={styles.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder={t('settings.store_name_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={storeAddress}
              onChangeText={setStoreAddress}
              placeholder={t('settings.store_address_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch', marginTop: Spacing.lg }]}
            onPress={saveActiveStoreSettings}
          >
            <Ionicons name="save-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              {t('settings.save_store')}
            </Text>
          </TouchableOpacity>
        </SettingsAccordionSection>
        )}

        {isOrgAdmin && currentStore && (
        <SettingsAccordionSection
          title={t('settings.section_store_docs')}
          description={t('settings.section_store_docs_desc')}
          icon="document-text-outline"
          accentColor={colors.info}
          expanded={expandedSections.storeDocuments}
          onToggle={() => toggleSection('storeDocuments')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.settingDesc}>{t('settings.store_docs_info')}</Text>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.sm, marginBottom: Spacing.sm }]}>{t('settings.receipt_title')}</Text>
          <View style={{ gap: Spacing.sm }}>
            <TextInput
              style={styles.input}
              value={receiptName}
              onChangeText={setReceiptName}
              placeholder={t('settings.receipt_name_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={receiptFooter}
              onChangeText={setReceiptFooter}
              placeholder={t('settings.receipt_footer_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>{t('settings.invoice_title_section')}</Text>
          <View style={{ gap: Spacing.sm }}>
            <TextInput
              style={styles.input}
              value={invoiceName}
              onChangeText={setInvoiceName}
              placeholder={t('settings.invoice_name_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={invoiceAddress}
              onChangeText={setInvoiceAddress}
              placeholder={t('settings.invoice_address_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={invoiceLabel}
              onChangeText={setInvoiceLabel}
              placeholder={t('settings.invoice_type_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={invoicePrefix}
              onChangeText={setInvoicePrefix}
              placeholder={t('settings.invoice_prefix_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={invoicePaymentTerms}
              onChangeText={setInvoicePaymentTerms}
              placeholder={t('settings.invoice_payment_terms_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.input}
              value={invoiceFooter}
              onChangeText={setInvoiceFooter}
              placeholder={t('settings.invoice_footer_placeholder')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch', marginTop: Spacing.lg }]}
            onPress={saveActiveStoreSettings}
          >
            <Ionicons name="save-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              {t('settings.save_documents')}
            </Text>
          </TouchableOpacity>
        </SettingsAccordionSection>
        )}

        {canManageStoreSettings && !currentStore && (
        <SettingsAccordionSection
          title={t('settings.store_settings', 'Boutique · Paramètres')}
          description={t('settings.no_store_selected', 'Aucune boutique sélectionnée pour les réglages du point de vente.')}
          icon="storefront-outline"
          accentColor={colors.info}
          expanded={expandedSections.storeEmpty}
          onToggle={() => toggleSection('storeEmpty')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.settingDesc}>{t('settings.no_active_store_docs', 'Aucune boutique active n\'est sélectionnée pour personnaliser les documents.')}</Text>
        </SettingsAccordionSection>
        )}

        {/* TVA / Taxes */}
        {isOrgAdmin && (
        <SettingsAccordionSection
          title={t('settings.section_tax')}
          description={t('settings.section_tax_desc')}
          icon="calculator-outline"
          accentColor={colors.warning}
          expanded={expandedSections.tax}
          onToggle={() => toggleSection('tax')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.sectionTitle}>{t('settings.tax')}</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('settings.tax_enabled')}</Text>
              <Text style={styles.settingDesc}>{t('settings.tax_enabled_desc')}</Text>
            </View>
            <Switch
              value={!!settingsData?.tax_enabled}
              onValueChange={async (value) => {
                try {
                  const updated = await settingsApi.update({ tax_enabled: value } as any);
                  setSettingsData(updated);
                } catch {
                  // ignore
                }
              }}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={settingsData?.tax_enabled ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={[styles.settingRow, { alignItems: 'flex-start', flexDirection: 'column', gap: Spacing.sm }]}>
            <Text style={styles.settingLabel}>{t('settings.tax_rate')}</Text>
            <TextInput
              style={styles.input}
              value={String(settingsData?.tax_rate ?? '')}
              onChangeText={async (value) => {
                setSettingsData((prev) => prev ? { ...prev, tax_rate: Number(value) || 0 } : prev);
              }}
              keyboardType="numeric"
              placeholder="18"
              placeholderTextColor={colors.textMuted}
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {(['ttc', 'ht'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.syncButton,
                    {
                      flex: 1,
                      backgroundColor: settingsData?.tax_mode === mode ? colors.primary + '20' : 'transparent',
                      borderColor: settingsData?.tax_mode === mode ? colors.primary : colors.divider,
                    }
                  ]}
                  onPress={async () => {
                    try {
                      const updated = await settingsApi.update({ tax_mode: mode } as any);
                      setSettingsData(updated);
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <Text style={{ color: settingsData?.tax_mode === mode ? colors.primary : colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }}>
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch' }]}
              onPress={async () => {
                try {
                  const updated = await settingsApi.update({
                    tax_rate: settingsData?.tax_rate ?? 0,
                  } as any);
                  setSettingsData(updated);
                } catch {
                  // ignore
                }
              }}
            >
              <Ionicons name="save-outline" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
                {t('common.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </SettingsAccordionSection>
        )}
        </SettingsAccordionSection>
        )}

        <SettingsAccordionSection
          title={t('settings.section_alerts')}
          description={t('settings.section_alerts_desc')}
          icon="notifications-outline"
          accentColor={colors.warning}
          expanded={expandedSections.alertsGroup}
          onToggle={() => toggleSection('alertsGroup')}
          styles={styles}
          colors={colors}
        >

        {/* ── Encart d'aide e-mail ── */}
        <View style={[styles.feedbackBanner, { marginBottom: Spacing.md, borderColor: colors.warning + '40', backgroundColor: colors.warning + '12', flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Ionicons name="mail-outline" size={16} color={colors.warning} />
            <Text style={[styles.settingLabel, { color: colors.warning }]}>{t('settings.email_alert_setup_label')}</Text>
          </View>
          {[
            { n: '1', text: t('settings.email_step_1') },
            { n: '2', text: t('settings.email_step_2') },
            { n: '3', text: t('settings.email_step_3') },
          ].map((step) => (
            <View key={step.n} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <Text style={[styles.settingDesc, { fontWeight: '700', color: colors.warning, minWidth: 16 }]}>{step.n}.</Text>
              <Text style={styles.settingDesc}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* ── 1. Canaux de réception ── */}
        <SettingsAccordionSection
          title={t('settings.section_channels')}
          description={t('settings.section_channels_desc')}
          icon="megaphone-outline"
          accentColor={colors.info}
          expanded={expandedSections.notifications}
          onToggle={() => toggleSection('notifications')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={[styles.settingDesc, { marginBottom: Spacing.md }]}>
            {t('settings.channels_intro')}
          </Text>

          {[
            { key: 'in_app', label: t('settings.channel_in_app'), desc: t('settings.channel_in_app_desc') },
            { key: 'push', label: t('settings.channel_push'), desc: t('settings.channel_push_desc') },
            { key: 'email', label: t('settings.channel_email'), desc: t('settings.channel_email_desc') },
          ].map((item, index, array) => (
            <View
              key={item.key}
              style={[
                styles.settingRow,
                index === array.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={Boolean(notificationPreferences[item.key as keyof typeof notificationPreferences])}
                onValueChange={(value) =>
                  setNotificationPreferences((current) => ({
                    ...current,
                    [item.key]: value,
                  }))
                }
                trackColor={{ false: colors.divider, true: colors.primary + '60' }}
                thumbColor={Boolean(notificationPreferences[item.key as keyof typeof notificationPreferences]) ? colors.primary : colors.textMuted}
              />
            </View>
          ))}

          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            <Text style={styles.settingLabel}>{t('settings.push_severity_label')}</Text>
            <Text style={[styles.settingDesc, { marginBottom: Spacing.xs }]}>{t('settings.push_severity_desc')}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {(['info', 'warning', 'critical'] as const).map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.syncButton,
                    {
                      flex: 1,
                      backgroundColor: notificationPreferences.minimum_severity_for_push === severity ? colors.primary + '20' : 'transparent',
                      borderColor: notificationPreferences.minimum_severity_for_push === severity ? colors.primary : colors.divider,
                    },
                  ]}
                  onPress={() =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      minimum_severity_for_push: severity,
                    }))
                  }
                >
                  <Text style={{ color: notificationPreferences.minimum_severity_for_push === severity ? colors.primary : colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }}>
                    {severity === 'info' ? 'Info' : severity === 'warning' ? t('settings.severity_warning') : t('settings.severity_critical')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
            <Text style={styles.settingLabel}>{t('settings.email_severity_label')}</Text>
            <Text style={[styles.settingDesc, { marginBottom: Spacing.xs }]}>{t('settings.email_severity_desc')}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {(['info', 'warning', 'critical'] as const).map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.syncButton,
                    {
                      flex: 1,
                      backgroundColor: notificationPreferences.minimum_severity_for_email === severity ? colors.primary + '20' : 'transparent',
                      borderColor: notificationPreferences.minimum_severity_for_email === severity ? colors.primary : colors.divider,
                    },
                  ]}
                  onPress={() =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      minimum_severity_for_email: severity,
                    }))
                  }
                >
                  <Text style={{ color: notificationPreferences.minimum_severity_for_email === severity ? colors.primary : colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' }}>
                    {severity === 'info' ? 'Info' : severity === 'warning' ? t('settings.severity_warning') : t('settings.severity_critical')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch', marginTop: Spacing.lg }]}
            onPress={saveNotificationPreferences}
          >
            <Ionicons name="save-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              {t('settings.save_preferences')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineButton, { marginTop: Spacing.md, opacity: testPushSending ? 0.7 : 1 }]}
            onPress={sendTestPush}
            disabled={testPushSending}
          >
            {testPushSending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
            )}
            <Text style={styles.outlineButtonText}>
              {testPushSending ? t('settings.test_push_sending') : t('settings.test_push_btn')}
            </Text>
          </TouchableOpacity>
        </SettingsAccordionSection>

        {/* ── 2. Destinataires e-mail du compte ── */}
        {canManageAlertSettings && (
        <SettingsAccordionSection
          title={t('settings.section_account_recipients')}
          description={t('settings.section_account_recipients_desc')}
          icon="mail-outline"
          accentColor={colors.warning}
          expanded={expandedSections.accountAlerts}
          onToggle={() => toggleSection('accountAlerts')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={[styles.settingDesc, { marginBottom: Spacing.md }]}>
            {t('settings.account_recipients_intro')}
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {NOTIFICATION_CONTACT_FIELDS.filter((field) => !field.requiredModule || settingsData?.modules?.[field.requiredModule]).map((field) => (
              <View key={field.key} style={{ gap: 6 }}>
                <Text style={styles.settingLabel}>{t(field.labelKey)}</Text>
                <Text style={styles.settingDesc}>{t('settings.example')}: {field.placeholder}</Text>
                <TextInput
                  style={styles.input}
                  value={(notificationContacts[field.key] || []).join(', ')}
                  onChangeText={(value) => updateNotificationGroup(setNotificationContacts, field.key, value)}
                  placeholder={t('settings.emails_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch', marginTop: Spacing.lg }]}
            onPress={saveNotificationContacts}
          >
            <Ionicons name="save-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              {t('settings.save_account_recipients')}
            </Text>
          </TouchableOpacity>
        </SettingsAccordionSection>
        )}

        {/* ── 3. Destinataires e-mail de la boutique ── */}
        {canManageAlertSettings && currentStore && (
        <SettingsAccordionSection
          title={`${t('settings.recipients')}: ${currentStore.name || t('settings.section_store')}`}
          description={t('settings.section_store_recipients_desc')}
          icon="storefront-outline"
          accentColor={colors.info}
          expanded={expandedSections.storeAlerts}
          onToggle={() => toggleSection('storeAlerts')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={[styles.settingDesc, { marginBottom: Spacing.md }]}>
            {t('settings.store_recipients_intro')}
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {NOTIFICATION_CONTACT_FIELDS.filter((field) => !field.requiredModule || settingsData?.modules?.[field.requiredModule]).map((field) => (
              <View key={field.key} style={{ gap: 6 }}>
                <Text style={styles.settingLabel}>{t(field.labelKey)}</Text>
                <Text style={styles.settingDesc}>{t('settings.example')}: {field.placeholder}</Text>
                <TextInput
                  style={styles.input}
                  value={(storeNotificationContacts[field.key] || []).join(', ')}
                  onChangeText={(value) => updateNotificationGroup(setStoreNotificationContacts, field.key, value)}
                  placeholder={t('settings.store_emails_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.syncButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', alignSelf: 'stretch', marginTop: Spacing.lg }]}
            onPress={saveStoreNotificationContacts}
          >
            <Ionicons name="save-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              {t('settings.save_store_recipients')}
            </Text>
          </TouchableOpacity>
        </SettingsAccordionSection>
        )}


        </SettingsAccordionSection>

        <SettingsAccordionSection
          title={t('settings.section_support')}
          description={t('settings.section_support_desc')}
          icon="help-circle-outline"
          accentColor={colors.info}
          expanded={expandedSections.supportGroup}
          onToggle={() => toggleSection('supportGroup')}
          styles={styles}
          colors={colors}
        >
        {/* Support */}
        <SettingsAccordionSection
          title={t('settings.section_assistance')}
          description={t('settings.section_assistance_desc')}
          icon="help-circle-outline"
          accentColor={colors.info}
          expanded={expandedSections.support}
          onToggle={() => toggleSection('support')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <TouchableOpacity style={styles.supportRow} onPress={() => setShowAiModal(true)}>
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
        </SettingsAccordionSection>

        {/* Signaler un incident */}
        <SettingsAccordionSection
          title={t('settings.section_incident')}
          description={t('settings.section_incident_desc')}
          icon="warning-outline"
          accentColor={colors.danger}
          expanded={expandedSections.incident}
          onToggle={() => toggleSection('incident')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
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
                  {[{ id: 'payment', label: ' ' + t('settings.dispute_payment') }, { id: 'product', label: ' ' + t('settings.dispute_product') }, { id: 'service', label: ' ' + t('settings.dispute_service') }, { id: 'delivery', label: ' ' + t('settings.dispute_delivery') }, { id: 'other', label: ' ' + t('settings.dispute_other') }].map(dt => (
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
        </SettingsAccordionSection>
        </SettingsAccordionSection>

        <SettingsAccordionSection
          title={t('settings.section_security')}
          description={t('settings.section_security_desc')}
          icon="shield-checkmark-outline"
          accentColor={colors.warning}
          expanded={expandedSections.securityGroup}
          onToggle={() => toggleSection('securityGroup')}
          styles={styles}
          colors={colors}
        >
        {/* Security */}
        <SettingsAccordionSection
          title={t('settings.section_account_security')}
          description={t('settings.section_account_security_desc')}
          icon="shield-checkmark-outline"
          accentColor={colors.warning}
          expanded={expandedSections.security}
          onToggle={() => toggleSection('security')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
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
        </SettingsAccordionSection>

        {/* About */}
        <SettingsAccordionSection
          title={t('settings.section_legal')}
          description={t('settings.section_legal_desc')}
          icon="information-circle-outline"
          accentColor={colors.info}
          expanded={expandedSections.legal}
          onToggle={() => toggleSection('legal')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings.version')}</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <TouchableOpacity
            style={[styles.aboutRow, { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.md }]}
            onPress={() => router.push({ pathname: '/terms', params: { returnTo: '/settings' } } as any)}
          >
            <Text style={[styles.aboutLabel, { color: colors.primary }]}>{t('settings.terms')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aboutRow, { marginTop: Spacing.sm }]}
            onPress={() => router.push({ pathname: '/privacy', params: { returnTo: '/settings' } } as any)}
          >
            <Text style={[styles.aboutLabel, { color: colors.primary }]}>{t('settings.privacy')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </SettingsAccordionSection>

        {/* GDPR - Danger Zone */}
        <SettingsAccordionSection
          title={t('settings.section_data')}
          description={t('settings.section_data_desc')}
          icon="warning-outline"
          accentColor={colors.danger}
          expanded={expandedSections.data}
          onToggle={() => toggleSection('data')}
          styles={styles}
          colors={colors}
          variant="nested"
        >
          <View style={[styles.dangerZoneCard, { borderColor: colors.danger + '30', borderWidth: 1 }]}>
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
        </SettingsAccordionSection>
        </SettingsAccordionSection>

        {/* Logout */}
        <TouchableOpacity style={styles.card} onPress={() => setShowAccountSwitcher(true)}>
          <View style={styles.supportRow}>
            <View style={[styles.supportIconWrapper, { backgroundColor: colors.primary }]}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Comptes sur cet appareil</Text>
              <Text style={styles.settingDesc}>Ajouter un autre compte ou basculer entre vos espaces commerçant, staff et fournisseur.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

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
        isRestaurant={isRestaurant}
        hasEnterprisePlan={hasEnterprisePlan}
        onLaunchGuide={(guideKey) => {
          const guide = (GUIDES as any)[guideKey];
          if (guide) {
            setHelpGuide(guide);
          }
        }}
      />

      <AiSupportModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
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
        mode={user?.auth_type !== 'email' && !user?.password_set ? 'set' : 'change'}
      />

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <LanguagePickerModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />

      <AccountSwitcherModal
        visible={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />

      {/* Sector modal removed  sector is defined at registration */}
    </LinearGradient >
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  feedbackBannerSuccess: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success + '30',
  },
  feedbackBannerError: {
    backgroundColor: colors.danger + '12',
    borderColor: colors.danger + '30',
  },
  feedbackBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
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
  nestedCard: {
    ...glassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: colors.bgDark + '35',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  accordionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionCopy: {
    flex: 1,
  },
  accordionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  accordionDescription: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  accordionBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.md,
  },
  subsectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: Spacing.md,
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
  input: {
    ...glassStyle,
    backgroundColor: colors.bgDark + '50',
    padding: Spacing.md,
    color: colors.text,
    borderRadius: BorderRadius.md,
    width: '100%',
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
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '12',
  },
  outlineButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.primary,
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
  dangerZoneCard: {
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.danger + '0F',
    padding: Spacing.md,
  },
});
