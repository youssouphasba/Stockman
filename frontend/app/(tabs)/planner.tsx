import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { planner as plannerApi, PlannerItem, PlannerChannel } from '../../services/api';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useDrawer } from '../../contexts/DrawerContext';

type PlannerFilter = 'active' | 'completed' | 'all';

const CHANNELS: PlannerChannel[] = ['in_app', 'push', 'email'];
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatInputDate(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatInputTime(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(11, 16);
}

function buildReminderIso(dateValue: string, timeValue: string) {
  if (!dateValue) return null;
  const safeTime = timeValue || '09:00';
  return new Date(`${dateValue}T${safeTime}:00`).toISOString();
}

function buildCalendarDays(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null; key: string }> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ date: null, key: `empty-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, key: isoDayKey(date) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: `tail-${cells.length}` });
  }
  return cells;
}

function formatHumanDate(value: string | null | undefined, locale: string, withTime = false) {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: withTime ? 'short' : undefined,
  }).format(new Date(value));
}

export default function PlannerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { setDrawerContent } = useDrawer();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const hasEnterprisePlan = (user?.effective_plan || user?.plan) === 'enterprise';
  const locale = i18n.resolvedLanguage || i18n.language || 'fr';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlannerFilter>('active');
  const [summary, setSummary] = useState({ total: 0, due_today: 0, completed: 0 });
  const [showGuide, setShowGuide] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [channels, setChannels] = useState<PlannerChannel[]>(['in_app']);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!hasEnterprisePlan) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await plannerApi.list({
        month: monthKey(selectedMonth),
        status: filter,
      });
      setItems(response.items || []);
      setSummary({
        total: response.total || 0,
        due_today: response.due_today || 0,
        completed: response.completed || 0,
      });
    } catch (err: any) {
      setError(err?.message || t('planner.load_error'));
    } finally {
      setLoading(false);
    }
  }, [filter, hasEnterprisePlan, selectedMonth, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      setDrawerContent(t('planner.title'), [
        { label: t('planner.new_item'), icon: 'add-circle-outline', onPress: openCreate, plan: 'enterprise' },
        { label: t('planner.filter_active'), icon: 'time-outline', onPress: () => setFilter('active'), plan: 'enterprise' },
        { label: t('planner.filter_all'), icon: 'calendar-outline', onPress: () => setFilter('all'), plan: 'enterprise' },
        { label: t('planner.filter_completed'), icon: 'checkmark-done-outline', onPress: () => setFilter('completed'), plan: 'enterprise' },
      ]);
    }, [openCreate, setDrawerContent, t])
  );

  const reminderCountByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      if (!item.reminder_at) return;
      const key = item.reminder_at.slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!selectedDay) return items;
    return items.filter((item) => (item.reminder_at || '').slice(0, 10) === selectedDay);
  }, [items, selectedDay]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);

  function resetForm() {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setDateValue('');
    setTimeValue('');
    setChannels(['in_app']);
    setError(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(item: PlannerItem) {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content || '');
    setDateValue(formatInputDate(item.reminder_at));
    setTimeValue(formatInputTime(item.reminder_at));
    setChannels(item.channels?.length ? item.channels : ['in_app']);
    setError(null);
    setShowForm(true);
  }

  function toggleChannel(channel: PlannerChannel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel]
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      setError(t('planner.title_required'));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        content: content.trim() || undefined,
        reminder_at: buildReminderIso(dateValue, timeValue),
        channels,
      };
      if (editingItem) {
        await plannerApi.update(editingItem.item_id, payload);
      } else {
        await plannerApi.create(payload);
      }
      setShowForm(false);
      resetForm();
      await loadItems();
    } catch (err: any) {
      setError(err?.message || t('planner.save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompletion(item: PlannerItem) {
    try {
      if (item.is_completed) {
        await plannerApi.reopen(item.item_id);
      } else {
        await plannerApi.complete(item.item_id);
      }
      await loadItems();
    } catch (err: any) {
      setError(err?.message || t('planner.save_error'));
    }
  }

  async function handleDelete(item: PlannerItem) {
    try {
      await plannerApi.remove(item.item_id);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || t('planner.delete_error'));
    }
  }

  if (!hasEnterprisePlan) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={42} color={colors.primary} />
        <Text style={styles.emptyTitle}>{t('planner.enterprise_only_title')}</Text>
        <Text style={styles.emptyText}>{t('planner.enterprise_only_desc')}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/subscription' as any)}>
          <Text style={styles.primaryButtonText}>{t('planner.discover_enterprise')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('planner.title')}</Text>
            <Text style={styles.subtitle}>{t('planner.subtitle')}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowGuide(true)}>
              <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>{t('common.help', 'Aide')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
              <Ionicons name="add-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>{t('planner.new_item')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('planner.active_items')}</Text>
            <Text style={styles.summaryValue}>{summary.total}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('planner.due_today')}</Text>
            <Text style={styles.summaryValue}>{summary.due_today}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('planner.completed_items')}</Text>
            <Text style={styles.summaryValue}>{summary.completed}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['active', 'all', 'completed'] as PlannerFilter[]).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterChip, filter === value && styles.filterChipActive]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>
                {value === 'active' ? t('planner.filter_active') : value === 'all' ? t('planner.filter_all') : t('planner.filter_completed')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}>
            <Ionicons name="chevron-back-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)}
          </Text>
          <TouchableOpacity onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {WEEKDAY_LABELS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>
          ))}
          {calendarDays.map((cell) => {
            if (!cell.date) {
              return <View key={cell.key} style={styles.dayCellEmpty} />;
            }
            const dayKey = isoDayKey(cell.date);
            const count = reminderCountByDay[dayKey] || 0;
            const selected = selectedDay === dayKey;
            return (
              <TouchableOpacity
                key={cell.key}
                style={[styles.dayCell, selected && styles.dayCellSelected]}
                onPress={() => setSelectedDay((current) => (current === dayKey ? null : dayKey))}
              >
                <Text style={[styles.dayCellLabel, selected && styles.dayCellLabelSelected]}>{cell.date.getDate()}</Text>
                {count > 0 ? <Text style={styles.dayCellCount}>{count}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDay ? (
          <TouchableOpacity style={styles.resetDayButton} onPress={() => setSelectedDay(null)}>
            <Ionicons name="close-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.resetDayText}>{t('planner.clear_day_filter')}</Text>
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.emptyStateInline}>
            <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('planner.empty_title')}</Text>
            <Text style={styles.emptyText}>{t('planner.empty_desc')}</Text>
          </View>
        ) : (
          visibleItems.map((item) => (
            <View key={item.item_id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>
                    {item.reminder_at ? formatHumanDate(item.reminder_at, locale, true) : t('planner.no_reminder')}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => toggleCompletion(item)}>
                    <Ionicons
                      name={item.is_completed ? 'refresh-outline' : 'checkmark-done-outline'}
                      size={18}
                      color={item.is_completed ? colors.warning : colors.success}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              {item.content ? <Text style={styles.itemContent}>{item.content}</Text> : null}
              <View style={styles.channelRow}>
                {item.channels.map((channel) => (
                  <View key={`${item.item_id}-${channel}`} style={styles.channelBadge}>
                    <Text style={styles.channelBadgeText}>{t(`planner.channel_${channel}`)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingItem ? t('planner.edit_item') : t('planner.new_item')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('planner.title_placeholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder={t('planner.content_placeholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textarea]}
              multiline
            />
            <View style={styles.formRow}>
              <TextInput
                value={dateValue}
                onChangeText={setDateValue}
                placeholder={t('planner.date_placeholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.formHalf]}
              />
              <TextInput
                value={timeValue}
                onChangeText={setTimeValue}
                placeholder={t('planner.time_placeholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.formHalf]}
              />
            </View>
            <Text style={styles.channelsTitle}>{t('planner.channels_title')}</Text>
            <View style={styles.channelPickerRow}>
              {CHANNELS.map((channel) => (
                <TouchableOpacity
                  key={channel}
                  style={[styles.channelOption, channels.includes(channel) && styles.channelOptionActive]}
                  onPress={() => toggleChannel(channel)}
                >
                  <Text style={[styles.channelOptionText, channels.includes(channel) && styles.channelOptionTextActive]}>
                    {t(`planner.channel_${channel}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowForm(false)}>
                <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScreenGuide
        visible={showGuide}
        onClose={() => setShowGuide(false)}
        title={GUIDES.planner.title}
        steps={GUIDES.planner.steps}
      />
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgDark,
    },
    content: {
      padding: Spacing.lg,
      gap: Spacing.lg,
      paddingBottom: Spacing.xxl,
    },
    header: {
      gap: Spacing.md,
    },
    headerActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: FontSize.md,
      marginTop: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: Spacing.md,
      gap: 4,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      fontWeight: '600',
    },
    summaryValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    filterRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    filterChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    filterChipActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: colors.primary,
    },
    calendarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.sm,
    },
    calendarTitle: {
      color: colors.text,
      fontSize: FontSize.lg,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    weekday: {
      width: '12%',
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: FontSize.sm,
      fontWeight: '700',
    },
    dayCell: {
      width: '12%',
      minHeight: 58,
      borderRadius: BorderRadius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    dayCellSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '18',
    },
    dayCellEmpty: {
      width: '12%',
      minHeight: 58,
    },
    dayCellLabel: {
      color: colors.text,
      fontSize: FontSize.md,
      fontWeight: '700',
    },
    dayCellLabelSelected: {
      color: colors.primary,
    },
    dayCellCount: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    resetDayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    resetDayText: {
      color: colors.primary,
      fontSize: FontSize.sm,
      fontWeight: '600',
    },
    loader: {
      paddingVertical: Spacing.xxl,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
      backgroundColor: colors.bgDark,
      gap: Spacing.sm,
    },
    emptyStateInline: {
      alignItems: 'center',
      padding: Spacing.xl,
      gap: Spacing.sm,
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: FontSize.lg,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: FontSize.md,
      textAlign: 'center',
      lineHeight: 22,
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    itemTitle: {
      color: colors.text,
      fontSize: FontSize.lg,
      fontWeight: '700',
    },
    itemMeta: {
      color: colors.textMuted,
      fontSize: FontSize.sm,
      marginTop: 4,
    },
    itemContent: {
      color: colors.textSecondary,
      fontSize: FontSize.md,
      lineHeight: 22,
    },
    itemActions: {
      flexDirection: 'row',
      gap: Spacing.md,
      alignItems: 'center',
    },
    channelRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    channelBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.primary + '14',
    },
    channelBadgeText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.bgDark,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: Spacing.lg,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    modalTitle: {
      color: colors.text,
      fontSize: FontSize.xl,
      fontWeight: '800',
      marginBottom: Spacing.xs,
    },
    input: {
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.card,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: FontSize.md,
    },
    textarea: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    formRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    formHalf: {
      flex: 1,
    },
    channelsTitle: {
      color: colors.text,
      fontSize: FontSize.md,
      fontWeight: '700',
      marginTop: Spacing.xs,
    },
    channelPickerRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      flexWrap: 'wrap',
    },
    channelOption: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    channelOptionActive: {
      backgroundColor: colors.primary + '18',
      borderColor: colors.primary,
    },
    channelOptionText: {
      color: colors.textSecondary,
      fontSize: FontSize.sm,
      fontWeight: '600',
    },
    channelOptionTextActive: {
      color: colors.primary,
    },
    errorText: {
      color: colors.danger,
      fontSize: FontSize.sm,
      fontWeight: '600',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 999,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: FontSize.sm,
      fontWeight: '700',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 999,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: FontSize.sm,
      fontWeight: '700',
    },
  });
}
