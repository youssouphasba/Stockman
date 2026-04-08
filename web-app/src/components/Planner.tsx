'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Plus, RefreshCcw, Trash2, Pencil, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { planner as plannerApi, type PlannerChannel, type PlannerItem, type User } from '../services/api';

type PlannerFilter = 'active' | 'completed' | 'all';

const CHANNELS: PlannerChannel[] = ['in_app', 'push', 'email'];
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

function formatDate(value: string | null | undefined, locale: string, withTime = false) {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: withTime ? 'short' : undefined,
  }).format(new Date(value));
}

function formatDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatTimeInput(value?: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(11, 16);
}

function buildReminderIso(dateValue: string, timeValue: string) {
  if (!dateValue) return null;
  return new Date(`${dateValue}T${timeValue || '09:00'}:00`).toISOString();
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total: 0, due_today: 0, completed: 0 });

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [channels, setChannels] = useState<PlannerChannel[]>(['in_app']);

  const loadItems = useCallback(async () => {
    if (!hasEnterprisePlan) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
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

  const countsByDay = useMemo(() => {
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
    setDateValue(formatDateInput(item.reminder_at));
    setTimeValue(formatTimeInput(item.reminder_at));
    setChannels(item.channels?.length ? item.channels : ['in_app']);
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
          <CalendarDays className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">{t('planner.enterprise_only_title')}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">{t('planner.enterprise_only_desc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-600">{t('planner.badge')}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{t('planner.title')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{t('planner.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600"
        >
          <Plus className="h-4 w-4" />
          {t('planner.new_item')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('planner.active_items')}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('planner.due_today')}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.due_today}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('planner.completed_items')}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">{summary.completed}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {(['active', 'all', 'completed'] as PlannerFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              filter === value
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {value === 'active' ? t('planner.filter_active') : value === 'all' ? t('planner.filter_all') : t('planner.filter_completed')}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button type="button" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <RefreshCcw className="h-4 w-4 -scale-x-100" />
          </button>
          <h2 className="text-lg font-bold capitalize text-slate-900">
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(selectedMonth)}
          </h2>
          <button type="button" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))} className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAYS.map((label, index) => (
            <div key={`${label}-${index}`} className="text-center text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</div>
          ))}
          {calendarDays.map((cell) => {
            if (!cell.date) {
              return <div key={cell.key} className="min-h-16 rounded-2xl" />;
            }
            const key = isoDayKey(cell.date);
            const selected = selectedDay === key;
            const count = countsByDay[key] || 0;
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDay((current) => current === key ? null : key)}
                className={`min-h-16 rounded-2xl border p-2 text-center transition ${
                  selected
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`text-sm font-bold ${selected ? 'text-emerald-700' : 'text-slate-900'}`}>{cell.date.getDate()}</div>
                {count > 0 ? <div className="mt-1 text-[11px] font-semibold text-slate-500">{count}</div> : null}
              </button>
            );
          })}
        </div>
        {selectedDay ? (
          <button type="button" onClick={() => setSelectedDay(null)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <XCircle className="h-4 w-4" />
            {t('planner.clear_day_filter')}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">{t('common.loading')}</div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Clock3 className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{t('planner.empty_title')}</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t('planner.empty_desc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => (
            <div key={item.item_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.is_completed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {item.is_completed ? t('planner.status_completed') : t('planner.status_active')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {item.reminder_at ? formatDate(item.reminder_at, locale, true) : t('planner.no_reminder')}
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
                <div className="flex items-center gap-3 text-slate-500">
                  <button type="button" onClick={() => toggleCompletion(item)} className="rounded-full border border-slate-200 p-2 hover:bg-slate-50">
                    {item.is_completed ? <RefreshCcw className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </button>
                  <button type="button" onClick={() => openEdit(item)} className="rounded-full border border-slate-200 p-2 hover:bg-slate-50">
                    <Pencil className="h-4 w-4 text-sky-600" />
                  </button>
                  <button type="button" onClick={() => removeItem(item.item_id)} className="rounded-full border border-rose-200 bg-rose-50 p-2 hover:bg-rose-100">
                    <Trash2 className="h-4 w-4 text-rose-700" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 lg:items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-slate-900">{editingItem ? t('planner.edit_item') : t('planner.new_item')}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('planner.title_placeholder')} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400" />
              <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('planner.content_placeholder')} className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400" />
              <div className="grid gap-4 md:grid-cols-2">
                <input type="date" value={dateValue} onChange={(event) => setDateValue(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0" />
                <input type="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0" />
              </div>
              <div>
                <p className="mb-3 text-sm font-bold text-slate-900">{t('planner.channels_title')}</p>
                <div className="flex flex-wrap gap-3">
                  {CHANNELS.map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        channels.includes(channel)
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {t(`planner.channel_${channel}`)}
                    </button>
                  ))}
                </div>
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
    </div>
  );
}
