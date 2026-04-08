import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { alerts as alertsApi, demo as demoApi, settings as settingsApi, DemoSessionInfo, UserSettings } from '../../services/api';

import StoreSelector from '../../components/StoreSelector';
import { DeviceEventEmitter, Modal, Text, TextInput, View, TouchableOpacity } from 'react-native';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import { useSegments } from 'expo-router';
import AiSupportModal from '../../components/AiSupportModal';
import HelpCenter from '../../components/HelpCenter';
import { useNotifications } from '../../hooks/useNotifications';
import ChatModal from '../../components/ChatModal';
import TrialBanner from '../../components/TrialBanner';
import SyncWarningBanner from '../../components/SyncWarningBanner';
import DrawerMenu from '../../components/DrawerMenu';
import { DrawerProvider, useDrawer } from '../../contexts/DrawerContext';

function TabLayoutInner() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user, hasPermission, isSuperAdmin, hasProduction, isRestaurant, hasOperationalAccess, isBillingAdmin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const drawer = useDrawer();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const settingsLoadedRef = useRef(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const refreshAlertCount = useCallback(async () => {
    if (!user?.user_id || !hasOperationalAccess || isRestaurant || !hasPermission('stock', 'read')) {
      setUnreadAlertCount(0);
      return;
    }
    try {
      const result = await alertsApi.list(0, 1);
      setUnreadAlertCount(result?.unread || 0);
    } catch {
      setUnreadAlertCount(0);
    }
  }, [hasOperationalAccess, hasPermission, isRestaurant, user?.user_id]);

  useNotifications(user?.user_id, refreshAlertCount);

  useEffect(() => {
    if (user && !settingsLoadedRef.current) {
      settingsLoadedRef.current = true;
      settingsApi.get().then(setUserSettings).catch(() => { });
    }
  }, [user?.user_id]);

  useEffect(() => {
    refreshAlertCount();
  }, [refreshAlertCount]);

  useEffect(() => {
    Notifications.setBadgeCountAsync(unreadAlertCount).catch(() => null);
  }, [unreadAlertCount]);

  useEffect(() => {
    const sub1 = DeviceEventEmitter.addListener('alerts:changed', refreshAlertCount);
    const sub2 = DeviceEventEmitter.addListener('open:chat', () => setShowChat(true));
    return () => { sub1.remove(); sub2.remove(); };
  }, [refreshAlertCount]);

  const modules = userSettings?.modules ?? {};
  const billingOnly = isBillingAdmin && !hasOperationalAccess;

  const hideAlerts = isRestaurant || modules.alerts === false || !hasPermission('stock', 'read');
  const hideStock = isRestaurant || modules.stock_management === false || !hasPermission('stock', 'read');
  const hideAccounting = modules.accounting === false || !hasPermission('accounting', 'read');
  const hideSuppliers = isRestaurant || modules.suppliers === false || !hasPermission('suppliers', 'read');
  const hideOrders = isRestaurant || modules.orders === false || !hasPermission('stock', 'read');
  const hidePos = !hasPermission('pos', 'read');
  const hideCrm = isRestaurant || modules.crm === false || !hasPermission('crm', 'read');
  const hideDashboard = !hasPermission('dashboard', 'read');
  const hasEnterprisePlan = (user?.effective_plan || user?.plan) === 'enterprise';

  const productsTabTitle = isRestaurant
    ? t('tabs.menu', 'Menu')
    : hasProduction
      ? t('tabs.production', 'Production')
      : t('tabs.products');
  const productsTabIcon = isRestaurant
    ? 'restaurant-outline'
    : hasProduction
      ? 'flask-outline'
      : 'cube-outline';

  const segments = useSegments();
  const currentRoute = (segments[segments.length - 1] || 'index') as string;
  const [showGuide, setShowGuide] = useState(false);
  const autoGuideHandledRef = useRef(false);
  const { isFirstVisit, isReady, markSeen } = useFirstVisit('navigation');

  useEffect(() => {
    if (!isReady || !isFirstVisit || autoGuideHandledRef.current) return;

    autoGuideHandledRef.current = true;
    markSeen();
    setShowGuide(true);
  }, [isFirstVisit, isReady, markSeen]);

  useEffect(() => {
    if (user && user.can_access_app === false) {
      const target = user.required_verification === 'email' ? '/(auth)/verify-email' : '/(auth)/verify-phone';
      router.replace(target as any);
      return;
    }
    if (user && billingOnly && currentRoute !== 'settings' && currentRoute !== 'subscription') {
      router.replace('/subscription');
      return;
    }
    if (user && hideDashboard && currentRoute === 'index') {
      const firstTab = !hidePos ? '/pos' : !hideStock ? '/products' : !hideAccounting ? '/accounting' : !hideSuppliers ? '/suppliers' : !hideCrm ? '/crm' : '/settings';
      router.replace(firstTab as any);
    }
  }, [billingOnly, hideDashboard, currentRoute, router, user]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.is_demo || !user?.demo_session_id) {
      setDemoSessionInfo(null);
      setShowDemoLeadPrompt(false);
      setDemoLeadEmail('');
      setDemoLeadError(null);
      return;
    }

    demoApi.getCurrentSession()
      .then((session) => {
        if (cancelled) return;
        setDemoSessionInfo(session);
        setDemoLeadEmail(session.contact_email || '');
        setDemoLeadError(null);
        setShowDemoLeadPrompt(!session.contact_email);
      })
      .catch(() => {
        if (cancelled) return;
        setDemoSessionInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.is_demo, user?.demo_session_id]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [guideOverride, setGuideOverride] = useState<{ title: string; steps: any[] } | null>(null);
  const [demoSessionInfo, setDemoSessionInfo] = useState<DemoSessionInfo | null>(null);
  const [showDemoLeadPrompt, setShowDemoLeadPrompt] = useState(false);
  const [demoLeadEmail, setDemoLeadEmail] = useState('');
  const [demoLeadError, setDemoLeadError] = useState<string | null>(null);
  const [demoLeadSaving, setDemoLeadSaving] = useState(false);
  const formatDemoExpiration = (value?: string | null) => {
    if (!value) return t('demo_lead.not_available');
    return new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  const getGuideForRoute = () => {
    const routeName = (segments[segments.length - 1] || 'index') as string;

    switch (routeName) {
      case 'index': return isRestaurant ? GUIDES.restaurantDashboard : GUIDES.dashboard;
      case 'pos': return isRestaurant ? GUIDES.restaurantPos : (GUIDES.pos ?? GUIDES.sales);
      case 'products': return isRestaurant ? GUIDES.restaurantProducts : GUIDES.products;
      case 'locations': return GUIDES.locations;
      case 'accounting': return GUIDES.accounting;
      case 'suppliers': return GUIDES.suppliers;
      case 'crm': return GUIDES.crm;
      case 'orders': return GUIDES.orders;
      case 'alerts': return GUIDES.alerts;
      case 'activity': return GUIDES.activity;
      case 'users': return GUIDES.users;
      case 'settings': return GUIDES.settings;
      case 'subscription': return GUIDES.subscription;
      case 'planner': return GUIDES.planner;
      case 'restaurant': return GUIDES.restaurantHub;
      case 'tables': return GUIDES.restaurantTables;
      case 'reservations': return GUIDES.restaurantReservations;
      case 'kitchen': return GUIDES.restaurantKitchen;
      default: return null;
    }
  };

  const activeGuide = guideOverride || getGuideForRoute();
  const currentGuide = getGuideForRoute();

  const handleSaveDemoLead = async () => {
    const normalizedEmail = demoLeadEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setDemoLeadError(t('demo_lead.required'));
      return;
    }
    setDemoLeadSaving(true);
    setDemoLeadError(null);
    try {
      const updatedSession = await demoApi.captureContact(normalizedEmail);
      setDemoSessionInfo(updatedSession);
      setDemoLeadEmail(updatedSession.contact_email || normalizedEmail);
      setShowDemoLeadPrompt(false);
    } catch (err: any) {
      setDemoLeadError(err?.message || t('demo_lead.save_error'));
    } finally {
      setDemoLeadSaving(false);
    }
  };

  return (
    <>
      <TrialBanner />
      <SyncWarningBanner />
      <Tabs
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.bgDark,
            borderBottomWidth: 1,
            borderBottomColor: colors.glassBorder,
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTitle: '',
          headerTitleStyle: {
            color: colors.text,
            fontWeight: '700',
          },
          headerLeft: () => currentRoute !== 'settings' && drawer.items.length > 0 ? (
            <TouchableOpacity onPress={drawer.open} style={{ marginLeft: 16, padding: 4 }}>
              <Ionicons name="menu-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          ) : undefined,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
              {hasOperationalAccess && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/alerts' as any)} style={{ padding: 4, position: 'relative' }}>
                  <Ionicons name="notifications-outline" size={24} color={colors.text} />
                  {unreadAlertCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -6,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: colors.danger,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                        borderWidth: 1.5,
                        borderColor: colors.bgDark,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                        {unreadAlertCount > 99 ? '99+' : unreadAlertCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              {currentRoute === 'index' && hasEnterprisePlan && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/planner' as any)} style={{ padding: 4 }}>
                  <Ionicons name="calendar-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowAiModal(true)} style={{ padding: 4 }}>
                <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowHelpCenter(true)} style={{ padding: 4 }}>
                <Ionicons name="book-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              {currentGuide && (
                <TouchableOpacity onPress={() => setShowGuide(true)} style={{ padding: 4 }}>
                  <Ionicons name="help-circle-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              {hasOperationalAccess && <StoreSelector />}
            </View>
          ),
          tabBarStyle: {
            backgroundColor: isDark ? 'rgba(15, 12, 41, 0.95)' : '#FFFFFF',
            borderTopColor: colors.glassBorder,
            borderTopWidth: 1,
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom + 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            href: (billingOnly || hideDashboard) ? null : '/',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: productsTabTitle,
            href: billingOnly || (hideStock && !isRestaurant) ? null : '/products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={productsTabIcon as any} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pos"
          options={{
            title: t('tabs.pos'),
            href: hidePos ? null : '/pos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calculator-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="accounting"
          options={{
            title: t('tabs.accounting'),
            href: hideAccounting ? null : '/accounting',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="suppliers"
          options={{
            title: t('tabs.suppliers'),
            href: hideSuppliers ? null : '/suppliers',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="crm"
          options={{
            title: t('tabs.crm'),
            href: hideCrm ? null : '/crm',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-add-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: t('tabs.orders'),
            href: hideOrders ? null : '/orders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="restaurant"
          options={{
            title: t('tabs.restaurant', 'Service'),
            href: isRestaurant && hasOperationalAccess ? '/restaurant' : null,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: t('tabs.alerts'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: t('tabs.users'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: t('tabs.activity'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: t('tabs.admin'),
            href: (isSuperAdmin ? '/(admin)' : null) as any,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="subscription"
          options={{
            title: t('tabs.subscription'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="enterprise"
          options={{
            title: 'Enterprise',
            href: null,
          }}
        />
        <Tabs.Screen
          name="planner"
          options={{
            title: t('planner.title'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="locations"
          options={{
            title: t('tabs.locations', 'Emplacements'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="tables"
          options={{
            title: t('tabs.tables', 'Tables'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="reservations"
          options={{
            title: t('tabs.reservations', 'Réservations'),
            href: null,
          }}
        />
        <Tabs.Screen
          name="kitchen"
          options={{
            title: t('tabs.kitchen', 'Cuisine'),
            href: null,
          }}
        />
      </Tabs>

      {
        activeGuide && (
          <ScreenGuide
            visible={showGuide}
            onClose={() => { setShowGuide(false); markSeen(); setGuideOverride(null); }}
            title={activeGuide.title}
            steps={activeGuide.steps}
          />
        )
      }

      {showAiModal && <AiSupportModal visible={showAiModal} onClose={() => setShowAiModal(false)} />}

      <ChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
      />

      <HelpCenter
        visible={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        userRole="shopkeeper"
        isRestaurant={isRestaurant}
        hasEnterprisePlan={hasEnterprisePlan}
        onLaunchGuide={(guideKey) => {
          const guide = GUIDES[guideKey];
          if (guide) {
            setGuideOverride(guide);
            setShowGuide(true);
          }
        }}
      />
      {showDemoLeadPrompt && <Modal
        visible={showDemoLeadPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDemoLeadPrompt(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(2, 6, 23, 0.82)',
          justifyContent: 'center',
          padding: 20,
        }}>
          <View style={{
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: colors.card,
            overflow: 'hidden',
          }}>
            <View style={{
              paddingHorizontal: 20,
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderBottomColor: colors.glassBorder,
              backgroundColor: colors.glass,
            }}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
                {t('demo_lead.badge')}
              </Text>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 8 }}>
                {t('demo_lead.title')}
              </Text>
            </View>
            <View style={{ padding: 20, gap: 16 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>
                {t('demo_lead.description_mobile')}
              </Text>
              <View style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.glassBorder,
                backgroundColor: colors.glass,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {demoSessionInfo?.label || t('demo_lead.default_label')}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                  {t('demo_lead.expires_at', { value: formatDemoExpiration(demoSessionInfo?.expires_at) })}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {t('demo_lead.contact_label')}
                </Text>
                <TextInput
                  value={demoLeadEmail}
                  onChangeText={setDemoLeadEmail}
                  placeholder={t('demo_lead.contact_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                    backgroundColor: colors.bgDark,
                    color: colors.text,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 15,
                  }}
                />
              </View>
              {demoLeadError ? (
                <Text style={{ color: colors.danger, fontSize: 13 }}>{demoLeadError}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowDemoLeadPrompt(false)}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.glassBorder,
                    backgroundColor: colors.glass,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{t('demo_lead.later')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveDemoLead}
                  disabled={demoLeadSaving}
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    backgroundColor: colors.primary,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: demoLeadSaving ? 0.65 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>
                    {demoLeadSaving ? t('demo_lead.saving') : t('demo_lead.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>}

      <DrawerMenu
        visible={drawer.isOpen}
        onClose={drawer.close}
        items={drawer.items}
        title={drawer.title}
      />
    </>
  );
}

export default function TabLayout() {
  return (
    <DrawerProvider>
      <TabLayoutInner />
    </DrawerProvider>
  );
}
