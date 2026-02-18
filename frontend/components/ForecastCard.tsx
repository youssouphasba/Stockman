import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { sales, ForecastProduct, SalesForecastResponse } from '../services/api';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

type Props = {
  onNavigate?: () => void;
};

export default function ForecastCard({ onNavigate }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<SalesForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadForecast();
  }, []);

  async function loadForecast() {
    try {
      const result = await sales.forecast();
      setData(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!data || !data.products || data.products.length === 0) return null;

  const products = data.products || [];
  const criticalCount = products.filter((p) => p.risk_level === 'critical').length;
  const warningCount = products.filter((p) => p.risk_level === 'warning').length;
  const topProducts = expanded ? products.slice(0, 10) : products.slice(0, 3);

  const trendIcons: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    up: { icon: 'trending-up', color: '#4CAF50' },
    down: { icon: 'trending-down', color: '#f44336' },
    stable: { icon: 'remove-outline', color: colors.textMuted },
  };

  const riskColors: Record<string, string> = {
    critical: '#f44336',
    warning: '#FF9800',
    ok: '#4CAF50',
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="analytics-outline" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>{t('dashboard.sales_forecast') || 'Prévisions de ventes'}</Text>
        </View>
        <TouchableOpacity onPress={loadForecast}>
          <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiBox, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{t('dashboard.ca_predicted_7d') || 'CA prévu 7j'}</Text>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>
            {data.total_predicted_revenue_7d.toLocaleString()} {t('common.currency_default')}
          </Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{t('dashboard.ca_predicted_30d') || 'CA prévu 30j'}</Text>
          <Text style={[styles.kpiValue, { color: colors.primary }]}>
            {data.total_predicted_revenue_30d.toLocaleString()} {t('common.currency_default')}
          </Text>
        </View>
      </View>

      {/* Alerts */}
      {(criticalCount > 0 || warningCount > 0) && (
        <View style={[styles.alertRow, { backgroundColor: '#f4433610', borderColor: '#f4433630' }]}>
          <Ionicons name="warning-outline" size={16} color="#f44336" />
          <Text style={[styles.alertText, { color: colors.text }]}>
            {criticalCount > 0 && t('dashboard.imminent_stockout', { count: criticalCount })}
            {criticalCount > 0 && warningCount > 0 && ' | '}
            {warningCount > 0 && t('dashboard.monitoring_stock', { count: warningCount })}
          </Text>
        </View>
      )}

      {/* Product list */}
      {topProducts.map((p) => {
        const trend = trendIcons[p.trend] || trendIcons.stable;
        const riskColor = riskColors[p.risk_level] || riskColors.ok;

        return (
          <View key={p.product_id} style={[styles.productRow, { borderBottomColor: colors.divider }]}>
            <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={[styles.productMeta, { color: colors.textMuted }]}>
                {t('common.stock')}: {p.current_stock} | {p.velocity}/{t('common.day_short')} | {p.days_of_stock < 999 ? t('dashboard.days_remaining', { count: p.days_of_stock }) : t('dashboard.no_sales')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={trend.icon} size={14} color={trend.color} />
                <Text style={[styles.predValue, { color: colors.text }]}>{p.predicted_sales_7d}</Text>
                <Text style={[styles.predLabel, { color: colors.textMuted }]}>/7j</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Expand / AI summary */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
        {products.length > 3 && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>
              {expanded ? t('common.see_less') : t('common.see_more_count', { count: products.length - 3 })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* AI Summary */}
      {data.ai_summary ? (
        <View style={[styles.aiBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.xs }}>{t('ai.ai_analysis') || 'Analyse IA'}</Text>
          </View>
          <Text style={[styles.aiText, { color: colors.textSecondary }]}>
            {data.ai_summary}
          </Text>
        </View>
      ) : null}
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
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  kpiBox: {
    flex: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  alertText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    flex: 1,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  productMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  predValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  predLabel: {
    fontSize: 10,
  },
  aiBox: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  aiText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
});
