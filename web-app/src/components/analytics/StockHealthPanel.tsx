'use client';

import React from 'react';
import { AlertTriangle, Boxes, Clock3, PackageCheck, ShieldAlert } from 'lucide-react';
import { AnalyticsStockHealth } from '../../services/api';
import KpiCard from './KpiCard';

function formatCurrency(amount: number, currency = 'XOF') {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
    } catch {
        return `${Math.round(amount || 0).toLocaleString('fr-FR')} ${currency}`;
    }
}

type RiskColumnProps = {
    title: string;
    accent: string;
    items: { product_id: string; name: string; quantity: number; stock_value?: number; shortage?: number; overstock_units?: number; suggested_order?: number; expiry_date?: string }[];
    renderMeta: (item: any) => string;
    emptyLabel: string;
};

function RiskColumn({ title, accent, items, renderMeta, emptyLabel }: RiskColumnProps) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className={`text-xs font-black uppercase tracking-[0.22em] ${accent}`}>{title}</p>
            <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-500">
                        {emptyLabel}
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.product_id} className="rounded-2xl border border-white/10 bg-[#111827] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-bold text-white truncate">{item.name}</p>
                                <p className="text-xs font-black text-slate-400">{item.quantity}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{renderMeta(item)}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default function StockHealthPanel({
    data,
    loading,
}: {
    data: AnalyticsStockHealth | null;
    loading?: boolean;
}) {
    if (loading && !data) {
        return (
            <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            </div>
        );
    }

    if (!data) {
        return null;
    }

    const { kpis } = data;

    return (
        <div className="mb-8 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                    icon={Boxes}
                    label="Stock valorisé"
                    value={formatCurrency(kpis.stock_value, data.currency)}
                    hint={`${kpis.total_products} produits actifs`}
                />
                <KpiCard
                    icon={ShieldAlert}
                    label="Réappro prioritaires"
                    value={kpis.replenishment_candidates_count.toLocaleString('fr-FR')}
                    hint="Produits sous minimum"
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Surstocks"
                    value={kpis.overstock_count.toLocaleString('fr-FR')}
                    hint="Capital immobilisé"
                />
                <KpiCard
                    icon={Clock3}
                    label="Dormants"
                    value={kpis.dormant_products_count.toLocaleString('fr-FR')}
                    hint="Sans sortie depuis 30 jours"
                />
                <KpiCard
                    icon={PackageCheck}
                    label="Péremption proche"
                    value={kpis.expiring_soon_count.toLocaleString('fr-FR')}
                    hint="Sous 30 jours"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <RiskColumn
                    title="Réappro conseillé"
                    accent="text-emerald-400"
                    items={data.replenishment_candidates}
                    emptyLabel="Aucun produit en dessous du minimum pour le moment."
                    renderMeta={(item) => `Manque ${item.shortage || 0} unités, commande suggérée ${item.suggested_order || 0}.`}
                />
                <RiskColumn
                    title="Surstock"
                    accent="text-amber-400"
                    items={data.overstock_products}
                    emptyLabel="Aucun surstock bloquant détecté."
                    renderMeta={(item) => `${item.overstock_units || 0} unités au-dessus du maximum, valeur ${formatCurrency(item.stock_value || 0, data.currency)}.`}
                />
                <RiskColumn
                    title="Dormants / péremption"
                    accent="text-rose-400"
                    items={(data.expiring_products.length ? data.expiring_products : data.dormant_products).slice(0, 6)}
                    emptyLabel="Aucun produit dormant ou à risque imminent."
                    renderMeta={(item) => item.expiry_date
                        ? `Expire le ${new Date(item.expiry_date).toLocaleDateString('fr-FR')}.`
                        : `Valeur immobilisée ${formatCurrency(item.stock_value || 0, data.currency)}.`}
                />
            </div>
        </div>
    );
}
