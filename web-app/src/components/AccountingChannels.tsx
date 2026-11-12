'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LayoutGrid, Store as StoreIcon, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import SafeResponsiveContainer from './charts/SafeResponsiveContainer';
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

type Props = {
    view: FinanceView;
    onViewChange: (view: FinanceView) => void;
};

export function FinanceViewTabs({ view, onViewChange }: Props) {
    const { t } = useTranslation();
    const tabs: { key: FinanceView; label: string; icon: typeof LayoutGrid }[] = [
        { key: 'overview', label: t('accounting.view_overview', { defaultValue: "Vue d'ensemble" }), icon: LayoutGrid },
        { key: 'physical', label: t('accounting.view_physical', { defaultValue: 'Boutique physique' }), icon: StoreIcon },
        { key: 'ecommerce', label: t('accounting.view_ecommerce', { defaultValue: 'E-com' }), icon: Globe },
        { key: 'treasury', label: t('accounting.view_treasury', { defaultValue: 'Trésorerie' }), icon: Wallet },
    ];
    return (
        <div role="tablist" className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1">
            {tabs.map(({ key, label, icon: Icon }) => (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => onViewChange(key)}
                    className={`flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${view === key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                >
                    <Icon size={16} />
                    {label}
                </button>
            ))}
        </div>
    );
}

type PanelProps = {
    view: FinanceView;
    stats: AccountingStats;
    formatCurrency: (value: number) => string;
};

function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warn' | 'muted' }) {
    return (
        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className={`mt-2 truncate text-xl font-black ${tone === 'warn' ? 'text-amber-400' : tone === 'muted' ? 'text-slate-300' : 'text-white'}`}>{value}</p>
            {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
    );
}

function OverviewPanel({ stats, formatCurrency }: Omit<PanelProps, 'view'>) {
    const { t } = useTranslation();
    const physical = stats.channels?.physical;
    const ecommerce = stats.channels?.ecommerce;
    if (!physical || !ecommerce) return null;
    const total = physical.revenue + ecommerce.revenue;
    const chartData = (stats.daily_revenue || []).filter((row: any) => row?.date);
    const rows = [
        { key: 'physical', label: t('accounting.channel_physical', { defaultValue: 'Boutique physique' }), color: PHYSICAL_COLOR, figures: physical },
        { key: 'ecommerce', label: t('accounting.channel_ecommerce', { defaultValue: 'E-com' }), color: ECOMMERCE_COLOR, figures: ecommerce },
    ];
    return (
        <section className="glass-card mb-8 p-6">
            <h3 className="text-lg font-bold text-white">{t('accounting.channels_title', { defaultValue: 'Répartition par canal' })}</h3>
            <p className="mt-1 text-sm text-slate-400">
                {t('accounting.channels_subtitle', { defaultValue: "Chiffre d'affaires des ventes terminées. L'E-com compte les commandes livrées, hors frais de livraison." })}
            </p>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/5" role="img"
                aria-label={t('accounting.channels_bar_label', { defaultValue: 'Part de chaque canal dans le chiffre d’affaires' })}>
                {total > 0 && rows.map((row) => (
                    <div key={row.key} style={{ width: `${(row.figures.revenue / total) * 100}%`, backgroundColor: row.color }} />
                ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {rows.map((row) => (
                    <div key={row.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-white">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                            {row.label}
                            <span className="ml-auto text-xs font-semibold text-slate-400">{row.figures.share_pct.toFixed(1)} %</span>
                        </p>
                        <p className="mt-2 text-2xl font-black text-white">{formatCurrency(row.figures.revenue)}</p>
                        <p className="mt-1 text-xs text-slate-400">
                            {t('accounting.channel_detail', {
                                defaultValue: '{{count}} ventes · marge brute {{margin}}',
                                count: row.figures.sales_count,
                                margin: formatCurrency(row.figures.gross_profit),
                            })}
                        </p>
                    </div>
                ))}
            </div>
            {chartData.length > 0 && (
                <div className="mt-6 h-56">
                    <SafeResponsiveContainer width="100%" height={224} minWidth={0} minHeight={200}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                                tickFormatter={(value) => { if (!value) return ''; const d = new Date(value); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false}
                                tickFormatter={(value) => value == null ? '' : value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)} />
                            <Tooltip
                                formatter={(value: any) => formatCurrency(Number(value) || 0)}
                                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                                labelStyle={{ color: '#94A3B8', fontSize: '10px' }}
                            />
                            <Bar dataKey="physical" stackId="channel" name={rows[0].label} fill={PHYSICAL_COLOR} />
                            <Bar dataKey="ecommerce" stackId="channel" name={rows[1].label} fill={ECOMMERCE_COLOR} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </SafeResponsiveContainer>
                </div>
            )}
        </section>
    );
}

function EcommercePanel({ stats, formatCurrency }: Omit<PanelProps, 'view'>) {
    const { t } = useTranslation();
    const flow = stats.ecommerce;
    if (!flow) return null;
    const orders = (count: number) => t('accounting.orders_count', { defaultValue: '{{count}} commandes', count });
    return (
        <section className="glass-card mb-8 p-6">
            <h3 className="text-lg font-bold text-white">{t('accounting.ecommerce_flow_title', { defaultValue: 'Circuit des commandes en ligne' })}</h3>
            <p className="mt-1 text-sm text-slate-400">
                {t('accounting.ecommerce_flow_subtitle', { defaultValue: 'Annulations exclues. Les frais de livraison Denkma ne font jamais partie du chiffre d’affaires.' })}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Figure label={t('accounting.ecommerce_ordered', { defaultValue: 'Commandé' })} value={formatCurrency(flow.ordered.amount)} hint={orders(flow.ordered.count)} />
                <Figure label={t('accounting.ecommerce_delivered', { defaultValue: 'Livré (CA)' })} value={formatCurrency(flow.revenue)} hint={orders(flow.delivered.count)} />
                <Figure label={t('accounting.ecommerce_collected', { defaultValue: 'Encaissé' })} value={formatCurrency(flow.collected)} />
                <Figure label={t('accounting.ecommerce_to_collect', { defaultValue: 'À encaisser' })} value={formatCurrency(flow.to_collect.amount)} hint={orders(flow.to_collect.count)} tone={flow.to_collect.amount > 0 ? 'warn' : undefined} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Figure label={t('accounting.ecommerce_open', { defaultValue: 'En cours' })} value={formatCurrency(flow.open.amount)} hint={orders(flow.open.count)} tone="muted" />
                <Figure label={t('accounting.ecommerce_cancelled', { defaultValue: 'Annulées ou refusées' })} value={formatCurrency(flow.cancelled.amount)} hint={orders(flow.cancelled.count)} tone="muted" />
                <Figure label={t('accounting.delivery_transit', { defaultValue: 'Livraison en transit' })} value={formatCurrency(flow.delivery_transit.amount)}
                    hint={t('accounting.delivery_transit_hint', { defaultValue: 'Frais payés par les clients, à reverser à Denkma' })} tone="muted" />
            </div>
        </section>
    );
}

function TreasuryPanel({ stats, formatCurrency }: Omit<PanelProps, 'view'>) {
    const { t } = useTranslation();
    const treasury = stats.treasury;
    if (!treasury) return null;
    const methods = Object.entries(treasury.collected_by_method || {}).filter(([, amount]) => amount > 0).sort((a, b) => b[1] - a[1]);
    return (
        <section className="glass-card mb-8 p-6">
            <h3 className="text-lg font-bold text-white">{t('accounting.treasury_title', { defaultValue: 'Trésorerie' })}</h3>
            <p className="mt-1 text-sm text-slate-400">
                {t('accounting.treasury_subtitle', { defaultValue: 'Sommes réellement reçues sur la période, créances en cours et frais de livraison à reverser.' })}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <Figure label={t('accounting.treasury_collected', { defaultValue: 'Encaissé' })} value={formatCurrency(treasury.collected)}
                    hint={t('accounting.treasury_collected_hint', {
                        defaultValue: 'Ventes : {{sales}} · remboursements de dettes : {{repayments}}',
                        sales: formatCurrency(treasury.collected_sales),
                        repayments: formatCurrency(treasury.debt_repayments),
                    })} />
                <Figure label={t('accounting.treasury_receivables', { defaultValue: 'Créances clients' })} value={formatCurrency(treasury.receivables_total)}
                    hint={t('accounting.treasury_receivables_hint', {
                        defaultValue: '{{customers}} clients · dont E-com : {{ecommerce}} ({{orders}} commandes)',
                        customers: treasury.receivables_customers,
                        ecommerce: formatCurrency(treasury.receivables_ecommerce),
                        orders: treasury.receivables_ecommerce_orders,
                    })} tone={treasury.receivables_total > 0 ? 'warn' : undefined} />
                <Figure label={t('accounting.delivery_transit', { defaultValue: 'Livraison en transit' })} value={formatCurrency(treasury.delivery_transit)}
                    hint={t('accounting.treasury_transit_hint', {
                        defaultValue: '{{count}} commandes · à reverser à Denkma, hors chiffre d’affaires',
                        count: treasury.delivery_transit_orders,
                    })} tone="muted" />
            </div>
            <div className="mt-6">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {t('accounting.treasury_by_method', { defaultValue: 'Ventes encaissées par moyen de paiement' })}
                </p>
                {methods.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">{t('accounting.treasury_no_payment', { defaultValue: 'Aucun encaissement sur cette période.' })}</p>
                ) : (
                    <div className="mt-3 flex flex-col gap-3">
                        {methods.map(([method, amount]) => (
                            <div key={method}>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-slate-300">{paymentMethodLabel(method, t)}</span>
                                    <span className="font-bold text-white">{formatCurrency(amount)}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                                    <div className="h-full rounded-full bg-primary"
                                        style={{ width: `${treasury.collected_sales > 0 ? Math.min(100, (amount / treasury.collected_sales) * 100) : 0}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {treasury.credit_sales > 0 && (
                    <p className="mt-4 text-xs text-slate-400">
                        {t('accounting.treasury_credit_sales', { defaultValue: 'Ventes laissées à crédit sur la période : {{amount}}', amount: formatCurrency(treasury.credit_sales) })}
                    </p>
                )}
            </div>
        </section>
    );
}

export function FinanceViewPanel({ view, stats, formatCurrency }: PanelProps) {
    const { t } = useTranslation();
    if (view === 'overview') return <OverviewPanel stats={stats} formatCurrency={formatCurrency} />;
    if (view === 'ecommerce') return <EcommercePanel stats={stats} formatCurrency={formatCurrency} />;
    if (view === 'treasury') return <TreasuryPanel stats={stats} formatCurrency={formatCurrency} />;
    return (
        <p className="mb-6 text-sm text-slate-400">
            {t('accounting.physical_note', { defaultValue: 'Ventes encaissées en boutique (caisse). Les charges et les pertes de stock ne sont pas réparties par canal : retrouvez-les dans la vue d’ensemble.' })}
        </p>
    );
}
