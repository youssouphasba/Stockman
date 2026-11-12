import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import type { AccountingStats, SalesChannel } from '../services/api';

// Les quatre vues de l'écran Finances. Chaque vue fixe le canal des chiffres de ventes demandés au serveur.
export type FinanceView = 'overview' | 'physical' | 'ecommerce' | 'treasury';

export const FINANCE_VIEW_CHANNEL: Record<FinanceView, SalesChannel> = {
  overview: 'all',
  physical: 'physical',
  ecommerce: 'ecommerce',
  treasury: 'all',
};

const PHYSICAL_COLOR = '#10B981';
const ECOMMERCE_COLOR = '#A855F7';

export function paymentMethodLabel(method: string, t: (...args: any[]) => any): string {
  const labels: Record<string, string> = {
    cash: t('accounting.payment_cash', { defaultValue: 'Espèces' }),
    credit: t('accounting.payment_credit', { defaultValue: 'Crédit' }),
    mobile_money: t('accounting.payment_mobile_money', { defaultValue: 'Mobile Money' }),
    card: t('accounting.payment_card', { defaultValue: 'Carte bancaire' }),
    transfer: t('accounting.payment_transfer', { defaultValue: 'Virement' }),
    online: t('accounting.payment_online', { defaultValue: 'Paiement en ligne' }),
  };
  return String(labels[method] || method);
}

export function FinanceViewTabs({ view, onViewChange }: { view: FinanceView; onViewChange: (view: FinanceView) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabs: { key: FinanceView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overview', label: t('accounting.view_overview', { defaultValue: "Vue d'ensemble" }), icon: 'grid-outline' },
    { key: 'physical', label: t('accounting.view_physical', { defaultValue: 'Boutique physique' }), icon: 'storefront-outline' },
    { key: 'ecommerce', label: t('accounting.view_ecommerce', { defaultValue: 'E-com' }), icon: 'globe-outline' },
    { key: 'treasury', label: t('accounting.view_treasury', { defaultValue: 'Trésorerie' }), icon: 'wallet-outline' },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {tabs.map((tab) => {
        const active = view === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onViewChange(tab.key)}
            style={[styles.tab, { borderColor: active ? colors.primary : colors.glassBorder, backgroundColor: active ? colors.primary : 'rgba(255,255,255,0.04)' }]}
          >
            <Ionicons name={tab.icon} size={15} color={active ? '#fff' : colors.textSecondary} />
            <Text style={[styles.tabText, { color: active ? '#fff' : colors.textSecondary }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

type PanelProps = {
  view: FinanceView;
  stats: AccountingStats | null;
  formatCurrency: (value: number) => string;
};

function Figure({ label, value, hint, tone, half }: { label: string; value: string; hint?: string; tone?: string; half?: boolean }) {
  const { colors, glassStyle } = useTheme();
  return (
    <View style={[glassStyle, styles.figure, half && styles.half]}>
      <Text style={[styles.figureLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.figureValue, { color: tone || colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text style={[styles.figureHint, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

function OverviewPanel({ stats, formatCurrency }: { stats: AccountingStats; formatCurrency: (value: number) => string }) {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const physical = stats.channels?.physical;
  const ecommerce = stats.channels?.ecommerce;
  if (!physical || !ecommerce) return null;
  const total = physical.revenue + ecommerce.revenue;
  const rows = [
    { key: 'physical', label: t('accounting.channel_physical', { defaultValue: 'Boutique physique' }), color: PHYSICAL_COLOR, figures: physical },
    { key: 'ecommerce', label: t('accounting.channel_ecommerce', { defaultValue: 'E-com' }), color: ECOMMERCE_COLOR, figures: ecommerce },
  ];
  return (
    <Section
      title={t('accounting.channels_title', { defaultValue: 'Répartition par canal' })}
      subtitle={t('accounting.channels_subtitle', { defaultValue: "Chiffre d'affaires des ventes terminées. L'E-com compte les commandes livrées, hors frais de livraison." })}
    >
      <View style={styles.bar} accessibilityLabel={t('accounting.channels_bar_label', { defaultValue: 'Part de chaque canal dans le chiffre d’affaires' })}>
        {total > 0 && rows.map((row) => (
          <View key={row.key} style={{ flex: row.figures.revenue, backgroundColor: row.color }} />
        ))}
      </View>
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.key} style={[glassStyle, styles.figure, styles.half]}>
            <View style={styles.channelHead}>
              <View style={[styles.dot, { backgroundColor: row.color }]} />
              <Text style={[styles.figureLabel, { color: colors.text, flex: 1 }]} numberOfLines={1}>{row.label}</Text>
              <Text style={[styles.figureHint, { color: colors.textMuted }]}>{row.figures.share_pct.toFixed(1)} %</Text>
            </View>
            <Text style={[styles.figureValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(row.figures.revenue)}</Text>
            <Text style={[styles.figureHint, { color: colors.textMuted }]}>
              {t('accounting.channel_detail', {
                defaultValue: '{{count}} ventes · marge brute {{margin}}',
                count: row.figures.sales_count,
                margin: formatCurrency(row.figures.gross_profit),
              })}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

function EcommercePanel({ stats, formatCurrency }: { stats: AccountingStats; formatCurrency: (value: number) => string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const flow = stats.ecommerce;
  if (!flow) return null;
  const orders = (count: number) => t('accounting.orders_count', { defaultValue: '{{count}} commandes', count });
  return (
    <Section
      title={t('accounting.ecommerce_flow_title', { defaultValue: 'Circuit des commandes en ligne' })}
      subtitle={t('accounting.ecommerce_flow_subtitle', { defaultValue: 'Annulations exclues. Les frais de livraison Denkma ne font jamais partie du chiffre d’affaires.' })}
    >
      <View style={styles.grid}>
        <Figure half label={t('accounting.ecommerce_ordered', { defaultValue: 'Commandé' })} value={formatCurrency(flow.ordered.amount)} hint={orders(flow.ordered.count)} />
        <Figure half label={t('accounting.ecommerce_delivered', { defaultValue: 'Livré (CA)' })} value={formatCurrency(flow.revenue)} hint={orders(flow.delivered.count)} tone={colors.success} />
        <Figure half label={t('accounting.ecommerce_collected', { defaultValue: 'Encaissé' })} value={formatCurrency(flow.collected)} />
        <Figure half label={t('accounting.ecommerce_to_collect', { defaultValue: 'À encaisser' })} value={formatCurrency(flow.to_collect.amount)} hint={orders(flow.to_collect.count)} tone={flow.to_collect.amount > 0 ? colors.warning : undefined} />
        <Figure half label={t('accounting.ecommerce_open', { defaultValue: 'En cours' })} value={formatCurrency(flow.open.amount)} hint={orders(flow.open.count)} tone={colors.textSecondary} />
        <Figure half label={t('accounting.ecommerce_cancelled', { defaultValue: 'Annulées ou refusées' })} value={formatCurrency(flow.cancelled.amount)} hint={orders(flow.cancelled.count)} tone={colors.textSecondary} />
      </View>
      <Figure
        label={t('accounting.delivery_transit', { defaultValue: 'Livraison en transit' })}
        value={formatCurrency(flow.delivery_transit.amount)}
        hint={t('accounting.delivery_transit_hint', { defaultValue: 'Frais payés par les clients, à reverser à Denkma' })}
        tone={colors.textSecondary}
      />
    </Section>
  );
}

function TreasuryPanel({ stats, formatCurrency }: { stats: AccountingStats; formatCurrency: (value: number) => string }) {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const treasury = stats.treasury;
  if (!treasury) return null;
  const methods = Object.entries(treasury.collected_by_method || {}).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
  return (
    <Section
      title={t('accounting.treasury_title', { defaultValue: 'Trésorerie' })}
      subtitle={t('accounting.treasury_subtitle', { defaultValue: 'Sommes réellement reçues sur la période, créances en cours et frais de livraison à reverser.' })}
    >
      <Figure
        label={t('accounting.treasury_collected', { defaultValue: 'Encaissé' })}
        value={formatCurrency(treasury.collected)}
        tone={colors.success}
        hint={t('accounting.treasury_collected_hint', {
          defaultValue: 'Ventes : {{sales}} · remboursements de dettes : {{repayments}}',
          sales: formatCurrency(treasury.collected_sales),
          repayments: formatCurrency(treasury.debt_repayments),
        })}
      />
      <Figure
        label={t('accounting.treasury_receivables', { defaultValue: 'Créances clients' })}
        value={formatCurrency(treasury.receivables_total)}
        tone={treasury.receivables_total > 0 ? colors.warning : undefined}
        hint={t('accounting.treasury_receivables_hint', {
          defaultValue: '{{customers}} clients · dont E-com : {{ecommerce}} ({{orders}} commandes)',
          customers: treasury.receivables_customers,
          ecommerce: formatCurrency(treasury.receivables_ecommerce),
          orders: treasury.receivables_ecommerce_orders,
        })}
      />
      <Figure
        label={t('accounting.delivery_transit', { defaultValue: 'Livraison en transit' })}
        value={formatCurrency(treasury.delivery_transit)}
        tone={colors.textSecondary}
        hint={t('accounting.treasury_transit_hint', {
          defaultValue: '{{count}} commandes · à reverser à Denkma, hors chiffre d’affaires',
          count: treasury.delivery_transit_orders,
        })}
      />
      <View style={[glassStyle, styles.figure]}>
        <Text style={[styles.figureLabel, { color: colors.textSecondary }]}>
          {t('accounting.treasury_by_method', { defaultValue: 'Ventes encaissées par moyen de paiement' })}
        </Text>
        {methods.length === 0 ? (
          <Text style={[styles.figureHint, { color: colors.textMuted, marginTop: Spacing.xs }]}>
            {t('accounting.treasury_no_payment', { defaultValue: 'Aucun encaissement sur cette période.' })}
          </Text>
        ) : methods.map(([method, amount]) => (
          <View key={method} style={{ marginTop: Spacing.sm }}>
            <View style={styles.methodRow}>
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>{paymentMethodLabel(method, t)}</Text>
              <Text style={{ color: colors.text, fontSize: FontSize.sm, fontWeight: '700' }}>{formatCurrency(amount)}</Text>
            </View>
            <View style={styles.methodTrack}>
              <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.primary, width: `${treasury.collected_sales > 0 ? Math.min(100, (amount / treasury.collected_sales) * 100) : 0}%` }} />
            </View>
          </View>
        ))}
        {treasury.credit_sales > 0 && (
          <Text style={[styles.figureHint, { color: colors.textMuted, marginTop: Spacing.sm }]}>
            {t('accounting.treasury_credit_sales', { defaultValue: 'Ventes laissées à crédit sur la période : {{amount}}', amount: formatCurrency(treasury.credit_sales) })}
          </Text>
        )}
      </View>
    </Section>
  );
}

export function FinanceViewPanel({ view, stats, formatCurrency }: PanelProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!stats) return null;
  if (view === 'overview') return <OverviewPanel stats={stats} formatCurrency={formatCurrency} />;
  if (view === 'ecommerce') return <EcommercePanel stats={stats} formatCurrency={formatCurrency} />;
  if (view === 'treasury') return <TreasuryPanel stats={stats} formatCurrency={formatCurrency} />;
  return (
    <Text style={[styles.subtitle, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
      {t('accounting.physical_note', { defaultValue: 'Ventes encaissées en boutique (caisse). Les charges et les pertes de stock ne sont pas réparties par canal : retrouvez-les dans la vue d’ensemble.' })}
    </Text>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: Spacing.xs, paddingVertical: Spacing.xs, marginBottom: Spacing.md },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  tabText: { fontSize: FontSize.sm, fontWeight: '700' },
  section: { marginBottom: Spacing.lg, gap: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '700' },
  subtitle: { fontSize: FontSize.xs, lineHeight: 18 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', marginTop: Spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.sm, columnGap: Spacing.sm },
  figure: { padding: Spacing.md, gap: 2, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: BorderRadius.md },
  half: { flexBasis: '40%', flexGrow: 1 },
  figureLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  figureValue: { fontSize: FontSize.md, fontWeight: '700' },
  figureHint: { fontSize: 11 },
  channelHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  methodTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
});
