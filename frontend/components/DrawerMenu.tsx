import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export type DrawerItem = {
  label: string;
  icon: string;
  onPress: () => void;
  plan?: 'starter' | 'pro' | 'enterprise';
  separator?: boolean;
  badge?: string | number;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: DrawerItem[];
  title?: string;
};

const PLAN_ORDER = { starter: 0, pro: 1, enterprise: 2 };

function planMeetsMinimum(userPlan: string | undefined, required: string): boolean {
  const u = PLAN_ORDER[userPlan as keyof typeof PLAN_ORDER] ?? 0;
  const r = PLAN_ORDER[required as keyof typeof PLAN_ORDER] ?? 0;
  return u >= r;
}

export default function DrawerMenu({ visible, onClose, items, title }: Props) {
  const { colors, isDark } = useTheme();
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const userPlan = user?.effective_plan || user?.plan || 'starter';

  const handlePress = (item: DrawerItem) => {
    if (item.plan && !isSuperAdmin && !planMeetsMinimum(userPlan, item.plan)) {
      onClose();
      router.push('/(tabs)/subscription' as any);
      return;
    }
    onClose();
    item.onPress();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.drawer,
            {
              backgroundColor: isDark ? '#1E1B3A' : '#FFFFFF',
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 12,
              borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {items.map((item, index) => {
              if (item.separator) {
                return (
                  <View
                    key={`sep-${index}`}
                    style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}
                  />
                );
              }

              const locked = !!(item.plan && !isSuperAdmin && !planMeetsMinimum(userPlan, item.plan));
              const planLabel = item.plan === 'enterprise' ? 'Enterprise' : item.plan === 'pro' ? 'Pro' : null;

              return (
                <TouchableOpacity
                  key={`${item.label}-${index}`}
                  style={[styles.item, locked && styles.itemLocked]}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={locked ? colors.textMuted : item.destructive ? colors.danger : colors.primary}
                    />
                    <Text
                      style={[
                        styles.itemLabel,
                        { color: locked ? colors.textMuted : item.destructive ? colors.danger : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    {item.badge != null && (
                      <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    {locked && planLabel && (
                      <View style={[styles.planBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                        <Ionicons name="lock-closed" size={10} color={colors.primary} />
                        <Text style={[styles.planBadgeText, { color: colors.primary }]}>{planLabel}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 320);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  separator: {
    height: 1,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 4,
    marginVertical: 1,
  },
  itemLocked: {
    opacity: 0.6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
