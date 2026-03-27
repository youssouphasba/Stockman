import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { reservations, tables } from '../../services/api';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

type ReservationItem = {
  reservation_id: string;
  customer_name: string;
  phone?: string;
  date: string;
  time: string;
  covers: number;
  table_id?: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'cancelled' | 'no_show';
};

type TableItem = {
  table_id: string;
  name: string;
};

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function ReservationsScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);
  const [date, setDate] = useState(today());
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [tableList, setTableList] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    date: today(),
    time: '12:00',
    covers: '2',
    table_id: '',
    notes: '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [reservationData, tableData] = await Promise.all([reservations.list(date), tables.list().catch(() => [])]);
      setItems(Array.isArray(reservationData) ? reservationData : []);
      setTableList(Array.isArray(tableData) ? tableData : []);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const updateStatus = async (item: ReservationItem, status: ReservationItem['status']) => {
    try {
      const updated = status === 'arrived'
        ? await reservations.arrive(item.reservation_id, item.table_id)
        : await reservations.update(item.reservation_id, { status });
      setItems((prev) => prev.map((entry) => (
        entry.reservation_id === item.reservation_id
          ? { ...entry, ...(updated || {}), status: updated?.status || status }
          : entry
      )));
    } catch {
      Alert.alert(t('common.error', 'Erreur'), t('restaurant.reservations.update_error', 'Impossible de mettre à jour la réservation.'));
    }
  };

  const createReservation = async () => {
    if (!form.customer_name.trim()) return;
    try {
      setSaving(true);
      const created = await reservations.create({
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || undefined,
        date: form.date,
        time: form.time,
        covers: Math.max(1, Number(form.covers) || 1),
        table_id: form.table_id || undefined,
        notes: form.notes.trim() || undefined,
      });
      if (form.date === date) {
        setItems((prev) => [...prev, created].sort((a, b) => a.time.localeCompare(b.time)));
      }
      setShowCreate(false);
      setForm({ customer_name: '', phone: '', date, time: '12:00', covers: '2', table_id: '', notes: '' });
    } catch {
      Alert.alert(t('common.error', 'Erreur'), t('restaurant.reservations.create_error', 'Impossible de créer la réservation.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('tabs.reservations', 'Réservations')}</Text>
            <Text style={styles.subtitle}>{t('restaurant.reservations.subtitle', 'Suivi simple des réservations du service.')}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>{t('common.date', 'Date')}</Text>
          <TextInput value={date} onChangeText={setDate} style={styles.dateInput} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('restaurant.reservations.empty', 'Aucune reservation pour cette date')}</Text>
            <Text style={styles.emptyText}>{t('restaurant.reservations.empty_desc', 'Planifie une arrivee pour preparer le service et affecter plus vite les tables.')}</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.reservation_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.customer_name}</Text>
                  <Text style={styles.cardText}>{item.time} · {item.covers} {t('restaurant.reservations.covers', 'couverts')}</Text>
                </View>
                <Text style={[styles.statusText, { color: getStatusColor(colors, item.status) }]}>{getStatusLabel(t, item.status)}</Text>
              </View>
              {item.phone ? <Text style={styles.cardText}>{item.phone}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus(item, 'confirmed')}>
                  <Text style={styles.actionText}>{t('restaurant.reservations.confirm', 'Confirmer')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus(item, 'arrived')}>
                  <Text style={styles.actionText}>{t('restaurant.reservations.arrived', 'Arrivé')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => updateStatus(item, 'cancelled')}>
                  <Text style={styles.actionText}>{t('common.cancel', 'Annuler')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {showCreate && <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('restaurant.reservations.new', 'Nouvelle réservation')}</Text>
              <TextInput value={form.customer_name} onChangeText={(value) => setForm((prev) => ({ ...prev, customer_name: value }))} placeholder={t('restaurant.reservations.customer_name', 'Nom du client')} placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={form.phone} onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))} placeholder={t('restaurant.reservations.phone', 'Téléphone')} placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={form.date} onChangeText={(value) => setForm((prev) => ({ ...prev, date: value }))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={form.time} onChangeText={(value) => setForm((prev) => ({ ...prev, time: value }))} placeholder="12:00" placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={form.covers} onChangeText={(value) => setForm((prev) => ({ ...prev, covers: value }))} keyboardType="number-pad" placeholder={t('restaurant.reservations.covers_only', 'Couverts')} placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={form.table_id} onChangeText={(value) => setForm((prev) => ({ ...prev, table_id: value }))} placeholder={tableList.length ? `${t('tabs.tables', 'Tables')}: ${tableList.map((table) => table.name).join(', ')}` : t('restaurant.reservations.table_optional', 'ID table optionnel')} placeholderTextColor={colors.textMuted} style={styles.input} />
              <TextInput value={form.notes} onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))} placeholder={t('common.notes', 'Notes')} placeholderTextColor={colors.textMuted} style={[styles.input, styles.notesInput]} multiline />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCreate(false)}>
                  <Text style={styles.secondaryText}>{t('common.cancel', 'Annuler')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={createReservation} disabled={saving}>
                  <Text style={styles.primaryText}>{saving ? t('common.loading', 'Chargement...') : t('common.save', 'Enregistrer')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>}
    </LinearGradient>
  );
}

function getStatusLabel(t: any, status: ReservationItem['status']) {
  const labels: Record<ReservationItem['status'], string> = {
    pending: t('restaurant.reservations.pending', 'En attente'),
    confirmed: t('restaurant.reservations.confirmed', 'Confirmée'),
    arrived: t('restaurant.reservations.arrived_label', 'Arrivée'),
    cancelled: t('restaurant.reservations.cancelled', 'Annulée'),
    no_show: t('restaurant.reservations.no_show', 'No-show'),
  };
  return labels[status];
}

function getStatusColor(colors: any, status: ReservationItem['status']) {
  const palette: Record<ReservationItem['status'], string> = {
    pending: colors.warning,
    confirmed: colors.info,
    arrived: colors.success,
    cancelled: colors.danger,
    no_show: colors.textMuted,
  };
  return palette[status];
}

const getStyles = (colors: any, glassStyle: any) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    content: { padding: Spacing.lg, gap: Spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
    title: { color: colors.text, fontSize: FontSize.xl, fontWeight: '800' },
    subtitle: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
    addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    dateRow: { ...glassStyle, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
    dateLabel: { color: colors.text, fontWeight: '700' },
    dateInput: { borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, color: colors.text, padding: 12, backgroundColor: colors.inputBg },
    loader: { marginTop: 48 },
    emptyCard: { ...glassStyle, padding: Spacing.lg, borderRadius: BorderRadius.xl, gap: Spacing.sm },
    emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
    emptyText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    card: { ...glassStyle, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
    cardTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.md },
    cardText: { color: colors.textSecondary, fontSize: FontSize.sm },
    statusText: { fontSize: FontSize.xs, fontWeight: '700' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    actionButton: { borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.primary + '18' },
    actionText: { color: colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalScroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
    modalCard: { ...glassStyle, padding: Spacing.lg, borderRadius: BorderRadius.xl, backgroundColor: colors.bgMid, gap: Spacing.md },
    modalTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800' },
    input: { borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, padding: 12, color: colors.text, backgroundColor: colors.inputBg },
    notesInput: { minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
    secondaryButton: { paddingHorizontal: 14, paddingVertical: 10 },
    secondaryText: { color: colors.textSecondary, fontWeight: '600' },
    primaryButton: { backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 10 },
    primaryText: { color: '#fff', fontWeight: '700' },
  });
