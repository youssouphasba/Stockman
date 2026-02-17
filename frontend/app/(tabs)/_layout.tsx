import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { settings as settingsApi, UserSettings } from '../../services/api';

import { useFocusEffect } from 'expo-router';

import StoreSelector from '../../components/StoreSelector';
import { View, TouchableOpacity } from 'react-native';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import { useSegments } from 'expo-router';
import AiSupportModal from '../../components/AiSupportModal';
import HelpCenter from '../../components/HelpCenter';
import { useNotifications } from '../../hooks/useNotifications';
import ChatModal from '../../components/ChatModal';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Register for push notifications
  useNotifications(user?.user_id);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    if (user && !settingsLoadedRef.current) {
      settingsLoadedRef.current = true;
      settingsApi.get().then(setUserSettings).catch(() => { });
    }
  }, [user?.user_id]);

  const modules = userSettings?.modules ?? {};
  const simpleMode = userSettings?.simple_mode ?? false;

  // Determine which tabs to hide (Global flags OR User permissions)
  const hideAlerts = modules.alerts === false || !hasPermission('stock', 'read');
  const hideStock = modules.stock_management === false || !hasPermission('stock', 'read');
  const hideAccounting = simpleMode || !hasPermission('accounting', 'read');
  const hideSuppliers = simpleMode || !hasPermission('suppliers', 'read');
  const hideOrders = simpleMode || !hasPermission('stock', 'read'); // Orders linked to stock
  const hidePos = !hasPermission('pos', 'read');
  const hideCrm = !hasPermission('crm', 'read');

  const segments = useSegments();
  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('navigation');

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [guideOverride, setGuideOverride] = useState<{ title: string; steps: any[] } | null>(null);

  const getGuideForRoute = () => {
    const routeName = (segments[segments.length - 1] || 'index') as string;

    switch (routeName) {
      case 'index': return GUIDES.dashboard;
      case 'pos': return GUIDES.pos ?? GUIDES.sales;
      case 'products': return GUIDES.products;
      case 'accounting': return GUIDES.accounting;
      case 'suppliers': return GUIDES.suppliers;
      case 'crm': return GUIDES.crm;
      case 'orders': return GUIDES.orders;
      case 'alerts': return GUIDES.alerts;
      case 'activity': return GUIDES.activity;
      case 'users': return GUIDES.users;
      case 'settings': return GUIDES.settings;
      default: return null;
    }
  };

  const activeGuide = guideOverride || getGuideForRoute();
  const currentGuide = getGuideForRoute();

  return (
    <>
      <Tabs
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
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
              <TouchableOpacity onPress={() => setShowAiModal(true)} style={{ padding: 4 }}>
                <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowChat(true)} style={{ padding: 4 }}>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/alerts')} style={{ padding: 4 }}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowHelpCenter(true)} style={{ padding: 4 }}>
                <Ionicons name="book-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              {currentGuide && (
                <TouchableOpacity onPress={() => setShowGuide(true)} style={{ padding: 4 }}>
                  <Ionicons name="help-circle-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              <StoreSelector />
            </View>
          ),
          tabBarStyle: {
            backgroundColor: colors.bgDark === '#F8FAFC' ? '#FFFFFF' : 'rgba(15, 12, 41, 0.95)',
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: t('tabs.products'),
            href: hideStock ? null : '/products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pos"
          options={{
            title: t('tabs.pos'),
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
      </Tabs>

      {activeGuide && (
        <ScreenGuide
          visible={showGuide}
          onClose={() => { setShowGuide(false); markSeen(); setGuideOverride(null); }}
          title={activeGuide.title}
          steps={activeGuide.steps}
        />
      )}

      {showAiModal && <AiSupportModal visible={showAiModal} onClose={() => setShowAiModal(false)} />}

      <ChatModal
        visible={showChat}
        onClose={() => setShowChat(false)}
      />

      <HelpCenter
        visible={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        userRole="shopkeeper"
        onLaunchGuide={(guideKey) => {
          const guide = GUIDES[guideKey];
          if (guide) {
            setGuideOverride(guide);
            setShowGuide(true);
          }
        }}
      />
    </>
  );
}
