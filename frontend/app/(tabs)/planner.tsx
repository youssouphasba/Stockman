import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { planner as plannerApi, type PlannerChannel, type PlannerItem } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDrawer } from '../../contexts/DrawerContext';

type PlannerFilter = 'active' | 'completed' | 'all';

const CHANNELS: PlannerChannel[] = ['in_app', 'push', 'email'];
const DEFAULT_REMINDER_CHANNELS: PlannerChannel[] = ['in_app', 'push'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

function formatReminderDate(value: string | null | undefined, locale: string, withTime = false) {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: withTime ? 'short' : undefined,
  }).format(new Date(value));
}

function formatDateLabel(dayKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${dayKey}T12:00:00`));
}

function isoDateFromReminder(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function timeFromReminder(value?: string | null) {
  if (!value) return '09:00';
  return new Date(value).toISOString().slice(11, 16);
}

function buildReminderIso(dateValue: string, timeValue: string) {
  if (!dateValue) return null;
  return new Date(`${dateValue}T${timeValue || '09:00'}:00`).toISOString();
}

function timeValueToDate(timeValue: string) {
  const [hours, minutes] = timeValue.split(':').map((value) => Number(value) || 0);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function isSameMonth(reminderAt: string | null | undefined, currentMonth: Date) {
  if (!reminderAt) return false;
  return reminderAt.slice(0, 7) === monthKey(currentMonth);
}

export default function PlannerScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { setDrawerContent } = useDrawer();
  const router = useRouter();
  const locale = i18n.resolvedLanguage || i18n.language || 'fr';
  const hasEnterprisePlan = (user?.effective_plan || user?.plan) === 'enterprise';

  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlannerFilter>('active');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showComposer, setShowComposer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [channels, setChannels] = useState<PlannerChannel[]>(DEFAULT_REMINDER_CHANNELS);

  const loadItems = useCallback(async (showRefresh = false) => {
    if (!hasEnterprisePlan) {
      setLoading(false);
      return;
    }

    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const response = await plannerApi.list({ status: filter });
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || t('planner.load_error'));
    } finally {
      if (showRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [filter, hasEnterprisePlan, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setDrawerContent(t('planner.title'), [
      { label: t('planner.new_note'), icon: 'create-outline', onPress: () => openCreateNote() },
      { label: t('planner.new_reminder'), icon: 'alarm-outline', onPress: () => openCreateReminder(isoDayKey(new Date())) },
      { label: t('planner.filter_active'), icon: 'filter-outline', onPress: () => setFilter('active') },
      { label: t('planner.filter_completed'), icon: 'checkmark-done-outline', onPress: () => setFilter('completed') },
    ]);
  }, [setDrawerContent, t]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'completed') return items.filter((item) => item.is_completed);
    return items.filter((item) => !item.is_completed);
  }, [filter, items]);

  const notes = useMemo(
    () => filteredItems.filter((item) => !item.reminder_at).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')),
    [filteredItems],
  );

  const reminders = useMemo(
    () => filteredItems.filter((item) => Boolean(item.reminder_at)).sort((a, b) => (a.reminder_at || '').localeCompare(b.reminder_at || '')),
    [filteredItems],
  );

  const monthReminders = useMemo(
    () => reminders.filter((item) => isSameMonth(item.reminder_at, selectedMonth)),
    [reminders, selectedMonth],
  );

  const summary = useMemo(() => {
    const today = new Date();
    const todayKey = isoDayKey(today);
    return {
      total: filteredItems.length,
      dueToday: reminders.filter((item) => (item.reminder_at || '').slice(0, 10) === todayKey).length,
      notes: notes.length,
    };
  }, [filteredItems, notes.length, reminders]);

  const remindersByDay = useMemo(() => {
    const grouped: Record<string, PlannerItem[]> = {};
    monthReminders.forEach((item) => {
      const key = (item.reminder_at || '').slice(0, 10);
      if (!key) return;
      grouped[key] = grouped[key] || [];
      grouped[key].push(item);
    });
    return grouped;
  }, [monthReminders]);

  const calendarDays = useMemo(() => buildCalendarDays(selectedMonth), [selectedMonth]);
  const pickerDays = useMemo(() => buildCalendarDays(datePickerMonth), [datePickerMonth]);

  function resetComposer() {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setHasReminder(false);
    setSelectedDate('');
    setSelectedTime('09:00');
    setChannels(DEFAULT_REMINDER_CHANNELS);
    setError(null);
  }

  function openCreateNote() {
    resetComposer();
    setShowComposer(true);
  }

  function openCreateReminder(dayKey: string) {
    resetComposer();
    setHasReminder(true);
    setSelectedDate(dayKey);
    setSelectedTime('09:00');
    setDatePickerMonth(new Date(`${dayKey}T12:00:00`));
    setShowComposer(true);
  }

  function openEdit(item: PlannerItem) {
    setEditingItem(item);
    setTitle(item.title || '');
    setContent(item.content || '');
    setHasReminder(Boolean(item.reminder_at));
    setSelectedDate(isoDateFromReminder(item.reminder_at));
    setSelectedTime(timeFromReminder(item.reminder_at));
    setChannels(item.channels?.length ? item.channels : DEFAULT_REMINDER_CHANNELS);
    setDatePickerMonth(item.reminder_at ? new Date(item.reminder_at) : new Date());
    setError(null);
    setShowComposer(true);
  }

  function closeComposer() {
    setShowComposer(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setError(null);
  }

  function handleTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'dismissed' || !date) {
      return;
    }
    const nextHours = String(date.getHours()).padStart(2, '0');
    const nextMinutes = String(date.getMinutes()).padStart(2, '0');
    setSelectedTime(`${nextHours}:${nextMinutes}`);
  }

  function toggleChannel(channel: PlannerChannel) {
    setChannels((current) => (
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel]
    ));
  }

  async function saveItem() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      setError(t('planner.content_required'));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        title: trimmedTitle || undefined,
        content: trimmedContent || undefined,
        reminder_at: hasReminder && selectedDate ? buildReminderIso(selectedDate, selectedTime) : null,
        channels: hasReminder ? channels : DEFAULT_REMINDER_CHANNELS,
      };

      if (editingItem) {
        await plannerApi.update(editingItem.item_id, payload);
      } else {
        await plannerApi.create(payload);
      }

      closeComposer();
      resetComposer();
      await loadItems();
    } catch (err: any) {
      setError(err?.message || t('planner.save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompletion(item: PlannerItem) {
    try {
      setError(null);
      if (item.is_completed) {
        await plannerApi.reopen(item.item_id);
      } else {
        await plannerApi.complete(item.item_id);
      }
      await loadItems(true);
    } catch (err: any) {
      setError(err?.message || t('planner.save_error'));
    }
  }

  async function removeItem(itemId: string) {
    try {
      setError(null);
      await plannerApi.remove(itemId);
      await loadItems(true);
    } catch (err: any) {
      setError(err?.message || t('planner.delete_error'));
    }
  }

  if (!hasEnterprisePlan) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.bgDark, padding: 20 }]}>
        <View style={[styles.guardCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={[styles.guardIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : 'rgba(5,150,105,0.12)' }]}>
            <Ionicons name="alarm-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.guardTitle, { color: colors.text }]}>{t('planner.enterprise_only_title')}</Text>
          <Text style={[styles.guardDescription, { color: colors.textMuted }]}>{t('planner.enterprise_only_desc')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/subscription' as any)}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>{t('planner.discover_enterprise')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgDark }]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        refreshControl={undefined}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : 'rgba(5,150,105,0.12)' }]}>
              <Ionicons name="alarm-outline" size={18} color={colors.primary} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>{t('planner.badge')}</Text>
            </View>
            <TouchableOpacity
              onPress={openCreateNote}
              style={[styles.secondaryButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            >
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('planner.new_note')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('planner.title')}</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>{t('planner.subtitle_short')}</Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { key: 'total', label: t('planner.active_items'), value: summary.total, icon: 'list-outline' },
            { key: 'today', label: t('planner.due_today'), value: summary.dueToday, icon: 'today-outline' },
            { key: 'notes', label: t('planner.notes_section'), value: summary.notes, icon: 'document-text-outline' },
          ].map((stat) => (
            <View key={stat.key} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              <Ionicons name={stat.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filterRow}>
          {(['active', 'all', 'completed'] as PlannerFilter[]).map((value) => {
            const active = filter === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setFilter(value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? (isDark ? 'rgba(16,185,129,0.18)' : 'rgba(5,150,105,0.14)')
                      : colors.card,
                    borderColor: active ? colors.primary : colors.glassBorder,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {value === 'active' ? t('planner.filter_active') : value === 'all' ? t('planner.filter_all') : t('planner.filter_completed')}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => loadItems(true)}
            style={[styles.iconChip, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
          >
            <Ionicons name={refreshing ? 'sync-outline' : 'refresh-outline'} size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={styles.calendarHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('planner.calendar_title')}</Text>
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{t('planner.calendar_hint')}</Text>
            </View>
            <View style={styles.monthSwitcher}>
              <TouchableOpacity
                onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
                style={[styles.monthButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: colors.text }]}>
                {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
                style={[styles.monthButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((label, index) => (
              <Text key={`${label}-${index}`} style={[styles.weekLabel, { color: colors.textMuted }]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((cell) => {
              if (!cell.date) {
                return <View key={cell.key} style={styles.emptyCell} />;
              }

              const key = isoDayKey(cell.date);
              const dayItems = remindersByDay[key] || [];
              const firstPreview = dayItems[0]?.title || dayItems[0]?.content || '';
              const isToday = key === isoDayKey(new Date());

              return (
                <TouchableOpacity
                  key={cell.key}
                  onPress={() => openCreateReminder(key)}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: isToday
                        ? (isDark ? 'rgba(16,185,129,0.18)' : 'rgba(5,150,105,0.14)')
                        : colors.glass,
                      borderColor: isToday ? colors.primary : colors.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.dayNumber, { color: isToday ? colors.primary : colors.text }]}>
                    {cell.date.getDate()}
                  </Text>
                  {firstPreview ? (
                    <Text style={[styles.dayPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                      {firstPreview}
                    </Text>
                  ) : (
                    <Text style={[styles.dayPreview, { color: colors.textMuted }]} numberOfLines={2}>
                      {t('planner.tap_to_add')}
                    </Text>
                  )}
                  {dayItems.length > 0 ? (
                    <View style={[styles.dayCountBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.22)' : 'rgba(5,150,105,0.16)' }]}>
                      <Text style={[styles.dayCountText, { color: colors.primary }]}>{dayItems.length}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {error ? (
          <View style={[styles.errorCard, { borderColor: 'rgba(220, 38, 38, 0.28)', backgroundColor: isDark ? 'rgba(127, 29, 29, 0.18)' : 'rgba(254, 226, 226, 0.92)' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('planner.reminders_section')}</Text>
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{t('planner.reminders_section_hint')}</Text>
            </View>
          </View>
          {loading ? (
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('common.loading')}</Text>
          ) : monthReminders.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('planner.no_reminders_this_month')}</Text>
          ) : (
            monthReminders.map((item) => (
              <View key={item.item_id} style={[styles.itemCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title || t('planner.untitled_item')}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {formatReminderDate(item.reminder_at, locale, true)}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => toggleCompletion(item)} style={[styles.iconButton, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
                      <Ionicons name={item.is_completed ? 'refresh-outline' : 'checkmark-outline'} size={17} color={item.is_completed ? colors.warning : colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEdit(item)} style={[styles.iconButton, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
                      <Ionicons name="create-outline" size={17} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(item.item_id)} style={[styles.iconButton, { borderColor: 'rgba(220,38,38,0.24)', backgroundColor: isDark ? 'rgba(127,29,29,0.22)' : 'rgba(254,226,226,0.92)' }]}>
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.content ? (
                  <Text style={[styles.itemContent, { color: colors.textSecondary }]}>{item.content}</Text>
                ) : null}
                <View style={styles.tagsRow}>
                  {item.channels.map((channel) => (
                    <View key={`${item.item_id}-${channel}`} style={[styles.tag, { backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : 'rgba(5,150,105,0.12)' }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>{t(`planner.channel_${channel}`)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('planner.notes_section')}</Text>
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>{t('planner.notes_section_hint')}</Text>
            </View>
            <TouchableOpacity
              onPress={openCreateNote}
              style={[styles.secondaryButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            >
              <Ionicons name="add-outline" size={16} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('planner.new_note')}</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>{t('common.loading')}</Text>
          ) : notes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('planner.no_notes_yet')}</Text>
          ) : (
            notes.map((item) => (
              <View key={item.item_id} style={[styles.itemCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderText}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title || t('planner.untitled_note')}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {t('planner.updated_label', { value: formatReminderDate(item.updated_at, locale, true) })}
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={[styles.iconButton, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
                      <Ionicons name="create-outline" size={17} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(item.item_id)} style={[styles.iconButton, { borderColor: 'rgba(220,38,38,0.24)', backgroundColor: isDark ? 'rgba(127,29,29,0.22)' : 'rgba(254,226,226,0.92)' }]}>
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                {item.content ? (
                  <Text style={[styles.itemContent, { color: colors.textSecondary }]}>{item.content}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showComposer} animationType="slide" transparent onRequestClose={closeComposer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeComposer} />
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingItem ? t('planner.edit_item') : hasReminder ? t('planner.new_reminder') : t('planner.new_note')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  {hasReminder ? t('planner.composer_hint_reminder') : t('planner.composer_hint_note')}
                </Text>
              </View>
              <TouchableOpacity onPress={closeComposer} style={[styles.iconButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
                <Ionicons name="close-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('planner.title_optional')}</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('planner.title_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder, color: colors.text }]}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('planner.note_or_action')}</Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={t('planner.content_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.glassBorder, color: colors.text }]}
                />
              </View>

              <View style={[styles.formSection, styles.toggleCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <View style={styles.toggleHeader}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('planner.reminder_toggle_title')}</Text>
                    <Text style={[styles.smallHint, { color: colors.textMuted }]}>
                      {hasReminder ? t('planner.reminder_enabled_hint') : t('planner.reminder_disabled_hint')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (hasReminder) {
                        setHasReminder(false);
                        setSelectedDate('');
                      } else {
                        setHasReminder(true);
                        setSelectedDate(isoDayKey(new Date()));
                      }
                    }}
                    style={[
                      styles.toggleButton,
                      {
                        backgroundColor: hasReminder ? colors.primary : colors.inputBg,
                        borderColor: hasReminder ? colors.primary : colors.glassBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.toggleButtonText, { color: hasReminder ? '#FFFFFF' : colors.textSecondary }]}>
                      {hasReminder ? t('planner.reminder_enabled') : t('planner.add_reminder')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {hasReminder ? (
                  <View style={{ gap: 14 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setDatePickerMonth(selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date());
                        setShowDatePicker(true);
                      }}
                      style={[styles.datePreviewCard, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}
                    >
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.datePreviewLabel, { color: colors.textMuted }]}>{t('planner.selected_date')}</Text>
                        <Text style={[styles.datePreviewValue, { color: colors.text }]}>
                          {selectedDate ? formatDateLabel(selectedDate, locale) : t('planner.choose_date')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>

                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('planner.time_title')}</Text>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(true)}
                        style={[styles.datePreviewCard, { borderColor: colors.glassBorder, backgroundColor: colors.card, marginTop: 8 }]}
                      >
                        <Ionicons name="time-outline" size={18} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.datePreviewLabel, { color: colors.textMuted }]}>{t('planner.time_title')}</Text>
                          <Text style={[styles.datePreviewValue, { color: colors.text }]}>{selectedTime}</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                      {showTimePicker ? (
                        <View style={[styles.nativePickerCard, { borderColor: colors.glassBorder, backgroundColor: colors.card }]}>
                          <DateTimePicker
                            value={timeValueToDate(selectedTime)}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleTimeChange}
                            themeVariant={isDark ? 'dark' : 'light'}
                          />
                        </View>
                      ) : null}
                    </View>

                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('planner.channels_title')}</Text>
                      <View style={styles.channelsWrap}>
                        {CHANNELS.map((channel) => {
                          const active = channels.includes(channel);
                          return (
                            <TouchableOpacity
                              key={channel}
                              onPress={() => toggleChannel(channel)}
                              style={[
                                styles.channelChip,
                                {
                                  backgroundColor: active
                                    ? (isDark ? 'rgba(16,185,129,0.18)' : 'rgba(5,150,105,0.14)')
                                    : colors.card,
                                  borderColor: active ? colors.primary : colors.glassBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.channelChipText, { color: active ? colors.primary : colors.textSecondary }]}>
                                {t(`planner.channel_${channel}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>

              {error ? (
                <View style={[styles.inlineError, { borderColor: 'rgba(220, 38, 38, 0.28)', backgroundColor: isDark ? 'rgba(127, 29, 29, 0.18)' : 'rgba(254, 226, 226, 0.92)' }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.footerActions}>
              <TouchableOpacity
                onPress={closeComposer}
                style={[styles.secondaryFooterButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
              >
                <Text style={[styles.secondaryFooterButtonText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveItem}
                disabled={saving}
                style={[styles.primaryFooterButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              >
                <Text style={styles.primaryButtonText}>{saving ? t('planner.saving') : t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.datePickerSheet, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('planner.choose_date')}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{t('planner.date_picker_hint')}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={[styles.iconButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
                <Ionicons name="close-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthSwitcher}>
              <TouchableOpacity
                onPress={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1, 1))}
                style={[styles.monthButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: colors.text }]}>
                {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(datePickerMonth)}
              </Text>
              <TouchableOpacity
                onPress={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 1))}
                style={[styles.monthButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((label, index) => (
                <Text key={`picker-${label}-${index}`} style={[styles.weekLabel, { color: colors.textMuted }]}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {pickerDays.map((cell) => {
                if (!cell.date) {
                  return <View key={cell.key} style={styles.emptyCell} />;
                }
                const key = isoDayKey(cell.date);
                const active = selectedDate === key;
                return (
                  <TouchableOpacity
                    key={cell.key}
                    onPress={() => {
                      setSelectedDate(key);
                      setHasReminder(true);
                      setShowDatePicker(false);
                    }}
                    style={[
                      styles.pickerDayCell,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(16,185,129,0.18)' : 'rgba(5,150,105,0.14)')
                          : colors.glass,
                        borderColor: active ? colors.primary : colors.glassBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.pickerDayText, { color: active ? colors.primary : colors.text }]}>{cell.date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  guardCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  guardIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  guardDescription: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  heroCard: { borderWidth: 1, borderRadius: 26, padding: 18, gap: 10 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  heroBadgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  screenTitle: { fontSize: 28, fontWeight: '900' },
  screenSubtitle: { fontSize: 14, lineHeight: 20 },
  primaryButton: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 14, gap: 10 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, lineHeight: 16 },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  calendarCard: { borderWidth: 1, borderRadius: 26, padding: 16, gap: 14 },
  calendarHeader: { gap: 12 },
  sectionCard: { borderWidth: 1, borderRadius: 26, padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionHint: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  monthSwitcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  monthLabel: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center', textTransform: 'capitalize' },
  weekRow: { flexDirection: 'row', gap: 8 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyCell: { width: '13.5%', minWidth: '13.5%', aspectRatio: 0.9 },
  dayCell: {
    width: '13.5%',
    minWidth: '13.5%',
    aspectRatio: 0.9,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  dayNumber: { fontSize: 15, fontWeight: '900' },
  dayPreview: { fontSize: 10, lineHeight: 12 },
  dayCountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  dayCountText: { fontSize: 10, fontWeight: '800' },
  pickerDayCell: {
    width: '13.5%',
    minWidth: '13.5%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDayText: { fontSize: 15, fontWeight: '800' },
  itemCard: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  itemHeaderText: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 16, fontWeight: '800' },
  itemMeta: { fontSize: 12, lineHeight: 16 },
  itemContent: { fontSize: 14, lineHeight: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 11, fontWeight: '800' },
  loadingText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 12 },
  errorCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  inlineError: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginTop: 6 },
  errorText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 6, 23, 0.58)' },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    maxHeight: '88%',
  },
  datePickerSheet: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    maxHeight: '76%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  formSection: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  smallHint: { fontSize: 12, lineHeight: 17 },
  input: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  textArea: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, minHeight: 128, fontSize: 15, lineHeight: 21 },
  toggleCard: { borderWidth: 1, borderRadius: 22, padding: 14 },
  toggleHeader: { gap: 12, marginBottom: 10 },
  toggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  toggleButtonText: { fontSize: 13, fontWeight: '800' },
  datePreviewCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePreviewLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  datePreviewValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  nativePickerCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
  },
  channelsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  channelChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  channelChipText: { fontSize: 13, fontWeight: '700' },
  footerActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  secondaryFooterButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryFooterButtonText: { fontSize: 14, fontWeight: '800' },
  primaryFooterButton: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
