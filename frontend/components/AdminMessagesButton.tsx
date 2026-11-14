import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { userNotifications, type UserNotification } from '../services/api';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import AdminMessageLinkButton from './AdminMessageLinkButton';

const ROUTES: Record<string, string> = {
  home: '/(tabs)',
  products: '/(tabs)/products',
  alerts: '/(tabs)/alerts',
  settings: '/(tabs)/settings',
  orders: '/(tabs)/orders',
  pos: '/(tabs)/pos',
  crm: '/(tabs)/crm',
  accounting: '/(tabs)/accounting',
  subscription: '/(tabs)/subscription',
};

// Émis quand un message est lu ailleurs (fenêtre d'arrivée) : les listes se rechargent.
export const ADMIN_MESSAGES_CHANGED_EVENT = 'admin-messages:changed';

export function hasAdminMessageDestination(deeplink?: Record<string, string>) {
  return Boolean(deeplink?.url || ROUTES[String(deeplink?.screen || '')]);
}

// Ouvre la destination d'un message : lien externe ou écran de l'application.
export function useOpenAdminMessageDestination() {
  const router = useRouter();
  return useCallback((deeplink?: Record<string, string>) => {
    const url = String(deeplink?.url || '');
    if (url) {
      Linking.openURL(url).catch(() => null);
      return;
    }
    const pathname = ROUTES[String(deeplink?.screen || '')];
    if (!pathname) return;
    const params: Record<string, string> = { source: 'in_app_message' };
    Object.entries(deeplink || {}).forEach(([key, value]) => {
      if (key !== 'screen' && value) params[key] = String(value);
    });
    router.push({ pathname, params } as any);
  }, [router]);
}

// Messages envoyés par l'administrateur (onglet Communication de l'admin), pour les comptes sans écran Accueil.
// L'icône n'apparaît que s'il y a des messages, comme sur l'Accueil.
export default function AdminMessagesButton({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const openMessageDestination = useOpenAdminMessageDestination();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await userNotifications.list(0, 5);
      setItems((result.items || []).filter((item) => Boolean(item && (item.title || item.content))));
      setUnread(result.unread || 0);
    } catch { /* hors connexion : on garde la dernière liste */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    const changed = DeviceEventEmitter.addListener(ADMIN_MESSAGES_CHANGED_EVENT, () => { void load(); });
    return () => { sub.remove(); changed.remove(); };
  }, [load]);

  const markRead = useCallback(async (messageId: string) => {
    try {
      const result = await userNotifications.markRead(messageId);
      if (!result?.marked) return;
      setItems((current) => current.map((item) => (item.message_id === messageId ? { ...item, is_read: true } : item)));
      setUnread((current) => Math.max(0, current - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const result = await userNotifications.markAllRead();
      if (!result?.marked) return;
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  }, []);

  const openDestination = useCallback((deeplink?: Record<string, string>) => {
    if (!hasAdminMessageDestination(deeplink)) return;
    setVisible(false);
    openMessageDestination(deeplink);
  }, [openMessageDestination]);

  if (items.length === 0) return null;

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.admin_messages')}
        onPress={() => { setVisible(true); void load(); }}
        style={{ padding: compact ? 3 : 4, position: 'relative' }}
      >
        <Ionicons name="megaphone-outline" size={compact ? 22 : 24} color={colors.primary} />
        {unread > 0 && (
          <View style={{
            position: 'absolute', right: -2, top: -2, backgroundColor: colors.danger, borderRadius: 9,
            minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
            borderWidth: 2, borderColor: colors.bgDark,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      {visible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.bgMid, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, height: '60%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                  <Text style={{ fontSize: FontSize.lg, fontWeight: '700', color: colors.text }}>{t('dashboard.admin_messages')}</Text>
                  {unread > 0 && (
                    <Text style={{ color: colors.primary, fontSize: FontSize.xs, marginTop: 4 }}>
                      {unread} {t('notifications.unread', 'non lues')}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  {unread > 0 && (
                    <TouchableOpacity onPress={() => void markAllRead()}>
                      <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '700' }}>
                        {t('notifications.markAllRead', 'Tout marquer comme lu')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity accessibilityRole="button" onPress={() => setVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView>
                {loading && items.length === 0 ? (
                  <View style={{ paddingVertical: Spacing.xl * 2, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : items.map((item, index) => (
                  <TouchableOpacity
                    key={item.message_id || index}
                    activeOpacity={0.85}
                    onPress={() => { if (!item.is_read && item.message_id) void markRead(item.message_id); }}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: index < items.length - 1 ? 1 : 0,
                      borderBottomColor: colors.divider,
                      opacity: item.is_read ? 0.7 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      {!item.is_read && <View style={{ width: 10, height: 10, borderRadius: 999, marginTop: 6, backgroundColor: colors.primary }} />}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: Spacing.sm }}>
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{item.title || ''}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {item.sent_at ? new Date(item.sent_at).toLocaleDateString('fr-FR') : ''}
                          </Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{item.content || ''}</Text>
                        {!!item.sent_by && <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>{item.sent_by}</Text>}
                        <AdminMessageLinkButton link={item.action_link} onOpened={() => {
                          if (!item.is_read && item.message_id) void markRead(item.message_id);
                        }} />
                        {!!(item.deeplink?.screen || item.deeplink?.url) && (
                          <TouchableOpacity
                            onPress={() => {
                              if (!item.is_read && item.message_id) void markRead(item.message_id);
                              openDestination(item.deeplink);
                            }}
                            style={{ alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 }}
                          >
                            <Text style={{ color: '#fff', fontSize: FontSize.xs, fontWeight: '700' }}>{t('dashboard.admin_message_open', 'Ouvrir')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
