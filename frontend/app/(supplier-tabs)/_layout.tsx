import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSegments } from 'expo-router';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import AiSupportModal from '../../components/AiSupportModal';
import HelpCenter from '../../components/HelpCenter';

export default function SupplierTabLayout() {
  const { colors } = useTheme();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('supplier-navigation');

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  const [showAiModal, setShowAiModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [guideOverride, setGuideOverride] = useState<{ title: string; steps: any[] } | null>(null);

  const getGuideForRoute = () => {
    const routeName = (segments[segments.length - 1] || 'index') as string;

    switch (routeName) {
      case 'index': return GUIDES.supplierDashboard ?? null;
      case 'catalog': return GUIDES.supplierCatalog ?? null;
      case 'orders': return GUIDES.supplierOrders ?? null;
      case 'settings': return GUIDES.supplierSettings ?? null;
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
              <TouchableOpacity onPress={() => setShowHelpCenter(true)} style={{ padding: 4 }}>
                <Ionicons name="book-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              {currentGuide && (
                <TouchableOpacity onPress={() => setShowGuide(true)} style={{ padding: 4 }}>
                  <Ionicons name="help-circle-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>
          ),
          tabBarStyle: {
            backgroundColor: colors.bgDark === '#F8FAFC' ? '#FFFFFF' : 'rgba(15, 12, 41, 0.95)',
            borderTopColor: colors.glassBorder,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 8,
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
          name="catalog"
          options={{
            title: 'Catalogue',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pricetags-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Commandes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
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

      {activeGuide && (
        <ScreenGuide
          visible={showGuide}
          onClose={() => { setShowGuide(false); markSeen(); setGuideOverride(null); }}
          title={activeGuide.title}
          steps={activeGuide.steps}
        />
      )}

      {showAiModal && <AiSupportModal visible={showAiModal} onClose={() => setShowAiModal(false)} />}

      <HelpCenter
        visible={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        userRole="supplier"
        onLaunchGuide={(guideKey) => {
          const guide = (GUIDES as any)[guideKey];
          if (guide) {
            setGuideOverride(guide);
            setShowGuide(true);
          }
        }}
      />
    </>
  );
}
