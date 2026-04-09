'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlarmClock, CalendarDays, CheckCircle2, Clock3, Pencil, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { planner as plannerApi, type PlannerChannel, type PlannerItem, type User } from '../services/api';

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

function isSameMonth(reminderAt: string | null | undefined, currentMonth: Date) {
  if (!reminderAt) return false;
  return reminderAt.slice(0, 7) === monthKey(currentMonth);
}

type Props = {
  user: User | null;
};

export default function Planner({ user }: Props) {
  const { t, i18n } = useTranslation();
  const hasEnterprisePlan = (user?.effective_plan || user?.plan) === 'enterprise';
  const locale = i18n.resolvedLanguage || i18n.language || 'fr';
  const [items, setItems] = useState<PlannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlannerFilter>('active');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [channels, setChannels] = useState<PlannerChannel[]>(DEFAULT_REMINDER_CHANNELS);

  const loadItems = useCallback(async () => {
    if (!hasEnterprisePlan) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await plannerApi.list({ status: filter });
      setItems(response.items || []);
    } catch (err: any) {
      setError(err?.message || t('planner.load_error'));
    } finally {
      setLoading(false);
    }
  }, [filter, hasEnterprisePlan, t]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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

  function resetForm() {
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
    resetForm();
    setShowForm(true);
  }

  function openCreateReminder(dayKey: string) {
    resetForm();
    setHasReminder(true);
    setSelectedDate(dayKey);
    setSelectedTime('09:00');
    setDatePickerMonth(new Date(`${dayKey}T12:00:00`));
    setShowForm(true);
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
    setShowForm(true);
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

  async function removeItem(itemId: string) {
    try {
      await plannerApi.remove(itemId);
      await loadItems();
    } catch (err: any) {
      setError(err?.message || t('planner.delete_error'));
    }
  }

  if (!hasEnterprisePlan) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <AlarmClock className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">{t('planner.enterprise_only_title')}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t('planner.enterprise_only_desc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
              <AlarmClock className="h-4 w-4" />
              {t('planner.badge')}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">{t('planner.title')}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t('planner.subtitle_short')}</p>
          </div>
          <button
            type="button"
            onClick={openCreateNote}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            {t('planner.new_note')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('planner.active_items')}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('planner.due_today')}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.dueToday}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('planner.notes_section')}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.notes}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(['active', 'all', 'completed'] as PlannerFilter[]).map((value) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {value === 'active' ? t('planner.filter_active') : value === 'all' ? t('planner.filter_all') : t('planner.filter_completed')}
            </button>
          );
        })}
        <button
          type="button"
          onClick={loadItems}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t('planner.calendar_title')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('planner.calendar_hint')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
              <RefreshCcw className="h-4 w-4 -scale-x-100" />
            </button>
            <h3 className="min-w-48 text-center text-lg font-bold capitalize text-slate-900">
              {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)}
            </h3>
            <button type="button" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {WEEKDAYS.map((label, index) => (
            <div key={`${label}-${index}`} className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {label}
            </div>
          ))}

          {calendarDays.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="min-h-28 rounded-3xl" />;
            }

            const key = isoDayKey(cell.date);
            const dayItems = remindersByDay[key] || [];
            const isToday = key === isoDayKey(new Date());
            const firstPreview = dayItems[0]?.title || dayItems[0]?.content || '';

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => openCreateReminder(key)}
                className={`min-h-28 rounded-3xl border p-3 text-left transition ${
                  isToday
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-sm font-black ${isToday ? 'text-emerald-700' : 'text-slate-900'}`}>{cell.date.getDate()}</span>
                  {dayItems.length > 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
                      {dayItems.length}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1">
                  {firstPreview ? (
                    <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-700">{firstPreview}</p>
                  ) : (
                    <p className="text-xs font-medium leading-5 text-slate-400">{t('planner.tap_to_add')}</p>
                  )}
                  {dayItems.length > 1 ? (
                    <p className="text-[11px] font-semibold text-slate-500">
                      {t('planner.more_items_count', { count: dayItems.length - 1 })}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{t('planner.reminders_section')}</h2>
              <p className="mt-2 text-sm text-slate-600">{t('planner.reminders_section_hint')}</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">{t('common.loading')}</div>
          ) : monthReminders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">{t('planner.no_reminders_this_month')}</div>
          ) : (
            <div className="space-y-4">
              {monthReminders.map((item) => (
                <div key={item.item_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-extrabold text-slate-900">{item.title || t('planner.untitled_item')}</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.is_completed ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.is_completed ? t('planner.status_completed') : t('planner.status_active')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {formatReminderDate(item.reminder_at, locale, true)}
                      </p>
                      {item.content ? <p className="mt-3 text-sm leading-6 text-slate-700">{item.content}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.channels.map((channel) => (
                          <span key={`${item.item_id}-${channel}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            {t(`planner.channel_${channel}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => toggleCompletion(item)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100">
                        {item.is_completed ? <RefreshCcw className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </button>
                      <button type="button" onClick={() => openEdit(item)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100">
                        <Pencil className="h-4 w-4 text-sky-700" />
                      </button>
                      <button type="button" onClick={() => removeItem(item.item_id)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{t('planner.notes_section')}</h2>
              <p className="mt-2 text-sm text-slate-600">{t('planner.notes_section_hint')}</p>
            </div>
            <button
              type="button"
              onClick={openCreateNote}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              {t('planner.new_note')}
            </button>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">{t('common.loading')}</div>
          ) : notes.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">{t('planner.no_notes_yet')}</div>
          ) : (
            <div className="space-y-4">
              {notes.map((item) => (
                <div key={item.item_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-extrabold text-slate-900">{item.title || t('planner.untitled_note')}</h3>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {t('planner.updated_label', { value: formatReminderDate(item.updated_at, locale, true) })}
                      </p>
                      {item.content ? <p className="mt-3 text-sm leading-6 text-slate-700">{item.content}</p> : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => openEdit(item)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100">
                        <Pencil className="h-4 w-4 text-sky-700" />
                      </button>
                      <button type="button" onClick={() => removeItem(item.item_id)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 lg:items-center">
          <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {editingItem ? t('planner.edit_item') : hasReminder ? t('planner.new_reminder') : t('planner.new_note')}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {hasReminder ? t('planner.composer_hint_reminder') : t('planner.composer_hint_note')}
                </p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-900">{t('planner.title_optional')}</label>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('planner.title_placeholder')} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-900">{t('planner.note_or_action')}</label>
                <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('planner.content_placeholder')} className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t('planner.reminder_toggle_title')}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {hasReminder ? t('planner.reminder_enabled_hint') : t('planner.reminder_disabled_hint')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasReminder) {
                        setHasReminder(false);
                        setSelectedDate('');
                      } else {
                        setHasReminder(true);
                        setSelectedDate(isoDayKey(new Date()));
                      }
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                      hasReminder
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {hasReminder ? t('planner.reminder_enabled') : t('planner.add_reminder')}
                  </button>
                </div>

                {hasReminder ? (
                  <div className="mt-4 space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerMonth(selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date());
                        setShowDatePicker(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
                    >
                      <CalendarDays className="h-5 w-5 text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{t('planner.selected_date')}</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {selectedDate ? formatDateLabel(selectedDate, locale) : t('planner.choose_date')}
                        </p>
                      </div>
                    </button>

                    <div>
                      <p className="mb-2 text-sm font-bold text-slate-900">{t('planner.time_title')}</p>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(event) => setSelectedTime(event.target.value || '09:00')}
                          step={300}
                          className="w-full bg-transparent text-base font-bold text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-bold text-slate-900">{t('planner.channels_title')}</p>
                      <div className="flex flex-wrap gap-2">
                        {CHANNELS.map((channel) => {
                          const active = channels.includes(channel);
                          return (
                            <button
                              key={channel}
                              type="button"
                              onClick={() => toggleChannel(channel)}
                              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                                active
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {t(`planner.channel_${channel}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={saveItem} disabled={saving} className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-70">
                {saving ? t('planner.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDatePicker ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{t('planner.choose_date')}</h2>
                <p className="mt-2 text-sm text-slate-600">{t('planner.date_picker_hint')}</p>
              </div>
              <button type="button" onClick={() => setShowDatePicker(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <button type="button" onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() - 1, 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
                <RefreshCcw className="h-4 w-4 -scale-x-100" />
              </button>
              <h3 className="flex-1 text-center text-lg font-bold capitalize text-slate-900">
                {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(datePickerMonth)}
              </h3>
              <button type="button" onClick={() => setDatePickerMonth(new Date(datePickerMonth.getFullYear(), datePickerMonth.getMonth() + 1, 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-3">
              {WEEKDAYS.map((label, index) => (
                <div key={`picker-${label}-${index}`} className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  {label}
                </div>
              ))}
              {pickerDays.map((cell) => {
                if (!cell.date) {
                  return <div key={cell.key} className="min-h-14 rounded-2xl" />;
                }
                const key = isoDayKey(cell.date);
                const active = selectedDate === key;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => {
                      setSelectedDate(key);
                      setHasReminder(true);
                      setShowDatePicker(false);
                    }}
                    className={`min-h-14 rounded-2xl border text-sm font-black transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-white'
                    }`}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
