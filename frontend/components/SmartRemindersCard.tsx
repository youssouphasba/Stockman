import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { smartReminders, SmartReminder, SmartRemindersResponse } from '../services/api';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

type Props = {
  onNavigate?: (route: string) => void;
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  stock: { label: 'stock', icon: 'cube-outline', color: '#F59E0B' },
  orders: { label: 'orders', icon: 'cart-outline', color: '#3B82F6' },
  crm: { label: 'crm', icon: 'people-outline', color: '#8B5CF6' },
  accounting: { label: 'accounting', icon: 'calculator-outline', color: '#10B981' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
};

export default function SmartRemindersCard({ onNavigate }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<SmartRemindersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      const result = await smartReminders.get();
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function dismiss(id: string) {
    setDismissedIds(prev => new Set(prev).add(id));
  }

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!data || data.total === 0) return null;

  const visibleReminders = data.reminders.filter(r => !dismissedIds.has(r.reminder_id));
  if (visibleReminders.length === 0) return null;

  const filtered = activeCategory
    ? visibleReminders.filter(r => r.category === activeCategory)
    : visibleReminders;

  const displayedReminders = expanded ? filtered : filtered.slice(0, 4);
  const hasMore = filtered.length > 4;

  // Count by category (only non-dismissed)
  const counts: Record<string, number> = {};
  for (const r of visibleReminders) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }

  const criticalCount = visibleReminders.filter(r => r.severity === 'critical').length;
  const warningCount = visibleReminders.filter(r => r.severity === 'warning').length;

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{t('dashboard.smart_reminders') || 'Rappels intelligents'}</Text>
          <View style={[styles.totalBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800' }}>{visibleReminders.length}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={loadReminders}>
          <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Severity summary */}
      {(criticalCount > 0 || warningCount > 0) && (
        <View style={[styles.severityBar, { backgroundColor: criticalCount > 0 ? '#EF444410' : '#F59E0B10', borderColor: criticalCount > 0 ? '#EF444430' : '#F59E0B30' }]}>
          <Ionicons name="warning-outline" size={14} color={criticalCount > 0 ? '#EF4444' : '#F59E0B'} />
          <Text style={{ color: colors.text, fontSize: FontSize.xs, fontWeight: '600', flex: 1 }}>
            {criticalCount > 0 && t('common.count_critical', { count: criticalCount })}
            {criticalCount > 0 && warningCount > 0 && ' · '}
            {warningCount > 0 && t('common.count_warning', { count: warningCount })}
          </Text>
        </View>
      )}

      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, !activeCategory && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[styles.chipText, { color: !activeCategory ? colors.primary : colors.textMuted }]}>
            {t('common.all')} ({visibleReminders.length})
          </Text>
        </TouchableOpacity>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = counts[key] || 0;
          if (count === 0) return null;
          const isActive = activeCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, isActive && { backgroundColor: config.color + '20', borderColor: config.color }]}
              onPress={() => setActiveCategory(isActive ? null : key)}
            >
              <Ionicons name={config.icon} size={12} color={isActive ? config.color : colors.textMuted} />
              <Text style={[styles.chipText, { color: isActive ? config.color : colors.textMuted }]}>
                {t(`common.${config.label}`)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Reminder items */}
      {displayedReminders.map((reminder) => {
        const sevColor = SEVERITY_COLORS[reminder.severity] || SEVERITY_COLORS.info;
        return (
          <View key={reminder.reminder_id} style={[styles.reminderItem, { borderLeftColor: sevColor }]}>
            <View style={[styles.reminderIcon, { backgroundColor: sevColor + '15' }]}>
              <Ionicons name={(reminder.icon || 'alert-circle-outline') as any} size={18} color={sevColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>{t(reminder.title)}</Text>
              <Text style={[styles.reminderMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                {reminder.message}
              </Text>
              {reminder.action_label && reminder.action_route && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => onNavigate?.(reminder.action_route!)}
                >
                  <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
                    {reminder.action_label}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => dismiss(reminder.reminder_id)}
              style={styles.dismissBtn}
            >
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        );
      })}

      {/* See more / less */}
      {hasMore && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.seeMore}>
          <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
            {expanded ? t('common.see_less') : t('common.see_more_count', { count: filtered.length - 4 })}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  totalBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  severityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    marginBottom: 2,
  },
  reminderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  reminderMessage: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dismissBtn: {
    padding: 4,
  },
  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Spacing.sm,
  },
});
