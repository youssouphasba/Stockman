import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, DeviceEventEmitter, Easing, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { userNotifications, type UserNotification } from '../services/api';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import AdminMessageLinkButton from './AdminMessageLinkButton';
import {
  ADMIN_MESSAGES_CHANGED_EVENT,
  hasAdminMessageDestination,
  useOpenAdminMessageDestination,
} from './AdminMessagesButton';

// Délai après l'ouverture de l'application, pour laisser l'écran s'afficher avant la fenêtre.
const SHOW_DELAY_MS = 1200;

// Les messages non lus de l'administrateur s'affichent d'abord dans cette fenêtre, un par un.
// Fermer un message le marque comme lu ; il reste consultable depuis le mégaphone ou l'Accueil.
export default function AdminMessagePopup({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const openDestination = useOpenAdminMessageDestination();
  const [queue, setQueue] = useState<UserNotification[]>([]);
  const [shown, setShown] = useState(false);
  const loadingRef = useRef(false);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const current = queue[0];

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const result = await userNotifications.list(0, 10);
      const unread = (result.items || []).filter((item) => item?.message_id && !item.is_read && (item.title || item.content));
      // Du plus ancien au plus récent : les messages se lisent dans l'ordre où ils ont été envoyés.
      setQueue(unread.reverse());
    } catch { /* hors connexion : on réessaiera au prochain retour dans l'application */ }
    finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => { void load(); }, SHOW_DELAY_MS);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [enabled, load]);

  const visible = enabled && Boolean(current);

  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    setShown(true);
    fade.setValue(0);
    scale.setValue(0.92);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [visible, current?.message_id, fade, scale]);

  const dismissCurrent = useCallback(() => {
    if (!current) return;
    const messageId = current.message_id;
    setQueue((items) => items.slice(1));
    userNotifications.markRead(messageId)
      .then(() => DeviceEventEmitter.emit(ADMIN_MESSAGES_CHANGED_EVENT))
      .catch(() => null);
  }, [current]);

  if (!visible || !shown || !current) return null;

  const remaining = queue.length - 1;
  const canOpen = hasAdminMessageDestination(current.deeplink);

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismissCurrent}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: Spacing.lg, opacity: fade }}>
        <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={dismissCurrent} />
        <Animated.View
          style={{
            backgroundColor: colors.bgMid,
            borderRadius: BorderRadius.xl,
            padding: Spacing.lg,
            maxHeight: '80%',
            transform: [{ scale }],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '800', textTransform: 'uppercase' }}>
                {t('dashboard.admin_message_new', 'Nouveau message')}
                {remaining > 0 ? ` · ${remaining + 1}` : ''}
              </Text>
              {!!current.sent_at && (
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  {new Date(current.sent_at).toLocaleDateString('fr-FR')}
                  {current.sent_by ? ` · ${current.sent_by}` : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('modals.close', 'Fermer')} onPress={dismissCurrent} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }}>
            {!!current.title && (
              <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.sm }}>{current.title}</Text>
            )}
            {!!current.content && (
              <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>{current.content}</Text>
            )}
            <AdminMessageLinkButton link={current.action_link} onOpened={dismissCurrent} />
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
            {canOpen && (
              <TouchableOpacity
                onPress={() => {
                  const deeplink = current.deeplink;
                  dismissCurrent();
                  openDestination(deeplink);
                }}
                style={{ flex: 1, borderRadius: 999, borderWidth: 1, borderColor: colors.primary, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: FontSize.sm }}>{t('dashboard.admin_message_open', 'Ouvrir')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={dismissCurrent}
              style={{ flex: 1, borderRadius: 999, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.sm }}>
                {remaining > 0 ? t('dashboard.admin_message_next', 'Message suivant') : t('dashboard.admin_message_got_it', "J'ai compris")}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
