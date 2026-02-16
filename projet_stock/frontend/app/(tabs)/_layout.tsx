import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { settings as settingsApi, UserSettings } from '../../services/api';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import StoreSelector from '../../components/StoreSelector';
import { View } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        settingsApi.get().then(setUserSettings).catch(() => {});
      }
    }, [user?.user_id])
  );

  const modules = userSettings?.modules ?? {};
  const simpleMode = userSettings?.simple_mode ?? false;

  // Determine which tabs to hide
  const hideAlerts = modules.alerts === false;
  const hideStock = modules.stock_management === false;
  // In simple mode, hide advanced tabs
  const hideAccounting = simpleMode;
  const hideSuppliers = simpleMode;
  const hideOrders = simpleMode;

  return (
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
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700',
        },
        headerRight: () => (
          <View style={{ marginRight: 16 }}>
            <StoreSelector />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.bgDark === '#F8FAFC' ? '#FFFFFF' : 'rgba(15, 12, 41, 0.95)',
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produits',
          href: hideStock ? null : '/products',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'Caisse',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounting"
        options={{
          title: 'Compta',
          href: hideAccounting ? null : '/accounting',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: 'Fournisseurs',
          href: hideSuppliers ? null : '/suppliers',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Commandes',
          href: hideOrders ? null : '/orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertes',
          href: hideAlerts ? null : '/alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
