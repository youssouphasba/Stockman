import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { tables } from '../../services/api';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

type TableItem = {
  table_id: string;
  name: string;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  current_amount?: number;
  current_sale_id?: string | null;
  covers?: number;
};

const NEXT_ACTION_BY_STATUS: Record<TableItem['status'], 'reserve' | 'seat' | 'clean' | 'free'> = {
  free: 'reserve',
  reserved: 'seat',
  occupied: 'clean',
  cleaning: 'free',
};

export default function TablesScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);
  const [items, setItems] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('4');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tables.list();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cycleStatus = async (table: TableItem) => {
    try {
      const action = NEXT_ACTION_BY_STATUS[table.status];
      const updated = action === 'seat'
        ? await tables.seat(table.table_id, { covers: table.covers })
        : await tables.act(table.table_id, action);
      setItems((prev) => prev.map((item) => (item.table_id === table.table_id ? { ...item, ...(updated || {}) } : item)));
    } catch (error: any) {
      Alert.alert(
        t('common.error', 'Erreur'),
        error?.message || t('restaurant.tables.update_error', 'Impossible de mettre a jour la table.')
      );
    }
  };

  const createTable = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const created = await tables.create({ name: name.trim(), capacity: Math.max(1, Number(capacity) || 1) });
      setItems((prev) => [created, ...prev]);
      setShowCreate(false);
      setName('');
      setCapacity('4');
    } catch {
      Alert.alert(t('common.error', 'Erreur'), t('restaurant.tables.create_error', 'Impossible de creer la table.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('tabs.tables', 'Tables')}</Text>
            <Text style={styles.subtitle}>{t('restaurant.tables.subtitle', 'Appuie sur une table pour faire avancer son statut.')}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('restaurant.tables.empty', 'Aucune table configuree')}</Text>
            <Text style={styles.emptyText}>{t('restaurant.tables.empty_desc', 'Ajoute tes premieres tables pour organiser la salle et ouvrir des commandes de service.')}</Text>
          </View>
        ) : (
          items.map((item) => (
            <TouchableOpacity key={item.table_id} style={styles.card} onPress={() => cycleStatus(item)}>
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardText}>{t('restaurant.tables.capacity', 'Capacite')} {item.capacity}</Text>
                </View>
                <View style={[styles.badge, { borderColor: getStatusColor(colors, item.status), backgroundColor: getStatusColor(colors, item.status) + '18' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(colors, item.status) }]}>{getStatusLabel(t, item.status)}</Text>
                </View>
              </View>
              {typeof item.current_amount === 'number' ? <Text style={styles.cardText}>{t('restaurant.tables.amount', 'Montant en cours')} {Math.round(item.current_amount).toLocaleString()}</Text> : null}
              <Text style={styles.cardHint}>{getActionHint(t, item.status)}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {showCreate && <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('restaurant.tables.new_table', 'Nouvelle table')}</Text>
            <TextInput value={name} onChangeText={setName} placeholder={t('restaurant.tables.name', 'Nom de table')} placeholderTextColor={colors.textMuted} style={styles.input} />
            <TextInput value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder={t('restaurant.tables.capacity_only', 'Capacite')} placeholderTextColor={colors.textMuted} style={styles.input} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCreate(false)}>
                <Text style={styles.secondaryText}>{t('common.cancel', 'Annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={createTable} disabled={saving}>
                <Text style={styles.primaryText}>{saving ? t('common.loading', 'Chargement...') : t('common.save', 'Enregistrer')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}
    </LinearGradient>
  );
}

function getStatusLabel(t: any, status: TableItem['status']) {
  const labels: Record<TableItem['status'], string> = {
    free: t('restaurant.tables.free', 'Libre'),
    reserved: t('restaurant.tables.reserved', 'Reservee'),
    occupied: t('restaurant.tables.occupied', 'Occupee'),
    cleaning: t('restaurant.tables.cleaning', 'Nettoyage'),
  };
  return labels[status];
}

function getStatusColor(colors: any, status: TableItem['status']) {
  const palette: Record<TableItem['status'], string> = {
    free: colors.success,
    reserved: colors.info,
    occupied: colors.warning,
    cleaning: colors.textMuted,
  };
  return palette[status];
}

function getActionHint(t: any, status: TableItem['status']) {
  const hints: Record<TableItem['status'], string> = {
    free: t('restaurant.tables.action_reserve', 'Toucher pour reserver'),
    reserved: t('restaurant.tables.action_seat', 'Toucher pour installer'),
    occupied: t('restaurant.tables.action_clean', 'Toucher pour passer en nettoyage'),
    cleaning: t('restaurant.tables.action_free', 'Toucher pour liberer'),
  };
  return hints[status];
}

const getStyles = (colors: any, glassStyle: any) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    content: { padding: Spacing.lg, gap: Spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: colors.text, fontSize: FontSize.xl, fontWeight: '800' },
    subtitle: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, maxWidth: 260 },
    addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    loader: { marginTop: 48 },
    emptyCard: { ...glassStyle, padding: Spacing.lg, borderRadius: BorderRadius.xl, gap: Spacing.sm },
    emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
    emptyText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
    card: { ...glassStyle, padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.sm },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
    cardTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
    cardText: { color: colors.textSecondary, fontSize: FontSize.sm },
    cardHint: { color: colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
    badge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
    badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
    modalCard: { ...glassStyle, padding: Spacing.lg, borderRadius: BorderRadius.xl, backgroundColor: colors.bgMid, gap: Spacing.md },
    modalTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800' },
    input: { borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, padding: 12, color: colors.text, backgroundColor: colors.inputBg },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
    secondaryButton: { paddingHorizontal: 14, paddingVertical: 10 },
    secondaryText: { color: colors.textSecondary, fontWeight: '600' },
    primaryButton: { backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 10 },
    primaryText: { color: '#fff', fontWeight: '700' },
  });
