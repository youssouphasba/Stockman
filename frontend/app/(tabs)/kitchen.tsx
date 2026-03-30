import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { kitchen } from '../../services/api';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

type KitchenTicket = {
  sale_id?: string;
  order_id?: string;
  table_name?: string;
  created_at?: string;
  items?: Array<{ product_name?: string; quantity?: number; ready?: boolean }>;
  customer_name?: string;
  status?: string;
};

export default function KitchenScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await kitchen.pending();
      setTickets(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReady = useCallback(async (saleId: string, itemIdx: number) => {
    try {
      setActionKey(`${saleId}_${itemIdx}`);
      await kitchen.markItemReady(saleId, itemIdx);
      await load();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('restaurant.kitchen_ready_error', 'Impossible de marquer cet article comme prêt.'));
    } finally {
      setActionKey(null);
    }
  }, [load, t]);

  const handleServe = useCallback(async (saleId: string) => {
    try {
      setActionKey(`serve_${saleId}`);
      await kitchen.serveOrder(saleId);
      await load();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('restaurant.kitchen_served_error', 'Impossible de marquer cette commande comme servie.'));
    } finally {
      setActionKey(null);
    }
  }, [load, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('tabs.kitchen', 'Cuisine')}</Text>
            <Text style={styles.subtitle}>
              {t('restaurant.kitchen_subtitle', 'Liste des tickets envoyés en cuisine et encore en attente.')}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={load}>
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : tickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('restaurant.kitchen.empty', 'Aucun ticket en attente')}</Text>
            <Text style={styles.emptyText}>
              {t('restaurant.kitchen_empty_desc', 'Les commandes envoyées depuis la caisse apparaîtront ici.')}
            </Text>
          </View>
        ) : (
          tickets.map((ticket, index) => (
            <View key={ticket.sale_id || ticket.order_id || String(index)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {ticket.table_name || ticket.customer_name || t('restaurant.kitchen.walkin', 'Commande comptoir')}
                </Text>
                <Text style={styles.badge}>{ticket.status || t('restaurant.kitchen.pending', 'En attente')}</Text>
              </View>
              {ticket.created_at ? <Text style={styles.cardText}>{new Date(ticket.created_at).toLocaleString()}</Text> : null}
              <View style={styles.itemsWrap}>
                {(ticket.items || []).map((item, itemIndex) => (
                  <View key={`${ticket.sale_id || index}_${itemIndex}`} style={styles.itemRow}>
                    <Text style={styles.itemText}>
                      • {item.quantity || 1} x {item.product_name || t('common.item', 'Article')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.itemAction, item.ready && styles.itemActionDone]}
                      onPress={() => ticket.sale_id && handleReady(ticket.sale_id, itemIndex)}
                      disabled={!ticket.sale_id || item.ready || actionKey === `${ticket.sale_id}_${itemIndex}`}
                    >
                      {actionKey === `${ticket.sale_id}_${itemIndex}` ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.itemActionText}>{t('restaurant.mark_ready', 'Prêt')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              {!!ticket.sale_id && (
                <TouchableOpacity
                  style={[styles.serveButton, actionKey === `serve_${ticket.sale_id}` && { opacity: 0.6 }]}
                  onPress={() => handleServe(ticket.sale_id!)}
                  disabled={actionKey === `serve_${ticket.sale_id}`}
                >
                  {actionKey === `serve_${ticket.sale_id}` ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                      <Text style={styles.serveButtonText}>{t('restaurant.served', 'Servi')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (colors: any, glassStyle: any) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    content: { padding: Spacing.lg, gap: Spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
    title: { color: colors.text, fontSize: FontSize.xl, fontWeight: '800' },
    subtitle: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, maxWidth: 280 },
    refreshButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    loader: { marginTop: 48 },
    emptyCard: { ...glassStyle, padding: Spacing.lg, borderRadius: BorderRadius.xl, gap: Spacing.sm },
    emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
    emptyText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    card: { ...glassStyle, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
    cardTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
    badge: {
      color: colors.warning,
      fontSize: FontSize.xs,
      fontWeight: '700',
      backgroundColor: colors.warning + '18',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      overflow: 'hidden',
    },
    cardText: { color: colors.textSecondary, fontSize: FontSize.sm },
    itemsWrap: { gap: 6 },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    itemText: { color: colors.text, fontSize: FontSize.sm, flex: 1 },
    itemAction: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      minWidth: 70,
      alignItems: 'center',
    },
    itemActionDone: { backgroundColor: colors.success },
    itemActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    serveButton: {
      marginTop: Spacing.sm,
      backgroundColor: colors.success,
      borderRadius: BorderRadius.md,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    serveButtonText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  });
