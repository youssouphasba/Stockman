import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNetwork } from '../hooks/useNetwork';
import { ai } from '../services/api';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

export default function AiDailySummary() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isConnected } = useNetwork();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function fetchSummary() {
    if (!isConnected) return;
    setLoading(true);
    try {
      const result = await ai.dailySummary();
      setSummary(result.summary);
      setExpanded(true);
    } catch {
      setSummary(t('ai.error_summarizing') || 'Impossible de générer le résumé. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => summary ? setExpanded(!expanded) : fetchSummary()}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t('dashboard.ai_daily_summary') || 'Résumé IA du jour'}</Text>
          {!summary && !loading && (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('dashboard.ai_tap_to_generate') || 'Appuyez pour générer'}</Text>
          )}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : summary ? (
          <TouchableOpacity onPress={fetchSummary} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="refresh" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {summary && expanded && (
        <View style={[styles.content, { borderTopColor: colors.divider }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6, paddingTop: Spacing.sm }}>
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t('ai.ai_analysis') || 'Analyse IA'}</Text>
          </View>
          <Text style={[styles.summaryText, { color: colors.text }]}>{summary}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
  },
  summaryText: {
    fontSize: FontSize.xs,
    lineHeight: 20,
    paddingTop: Spacing.sm,
  },
});
