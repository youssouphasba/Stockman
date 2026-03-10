'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Boxes, Search, TrendingUp } from 'lucide-react';
import { analytics as analyticsApi, AnalyticsStockAbc, AnalyticsStockAbcItem } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';

function formatCurrency(amount: number, currency = 'XOF') {
    try {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
    } catch {
        return `${Math.round(amount || 0).toLocaleString('fr-FR')} ${currency}`;
    }
}

export default function AbcAnalysis() {
    const [abcData, setAbcData] = useState<AnalyticsStockAbc | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { filters } = useAnalyticsFilters();
    const hasCustomRange = filters.useCustomRange && !!filters.startDate && !!filters.endDate;
    const analyticsFilters = {
        ...(hasCustomRange ? { start_date: filters.startDate, end_date: filters.endDate } : { days: filters.days }),
        store_id: filters.storeId || undefined,
        category_id: filters.categoryId || undefined,
        supplier_id: filters.supplierId || undefined,
    };
    const periodLabel = hasCustomRange
        ? `du ${new Date(filters.startDate).toLocaleDateString('fr-FR')} au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`
        : `sur ${filters.days} jours`;

    useEffect(() => {
        loadAbc();
    }, [filters.categoryId, filters.days, filters.endDate, filters.startDate, filters.storeId, filters.supplierId, filters.useCustomRange]);

    const loadAbc = async () => {
        setLoading(true);
        try {
            const response = await analyticsApi.getStockAbc(analyticsFilters);
            setAbcData(response);
        } catch (err) {
            console.error('Error loading ABC analysis', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !abcData) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    const allProducts = abcData ? [
        ...(abcData.classes.A || []),
        ...(abcData.classes.B || []),
        ...(abcData.classes.C || []),
    ] : [];

    const products = allProducts.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase())
    );

    const classCards = [
        { key: 'A', title: 'Classe A', accent: 'text-emerald-400', hint: 'Les produits qui portent l’essentiel du CA.' },
        { key: 'B', title: 'Classe B', accent: 'text-primary', hint: 'La zone à optimiser pour la marge et la couverture.' },
        { key: 'C', title: 'Classe C', accent: 'text-slate-400', hint: 'Le stock à surveiller pour éviter l’immobilisation.' },
    ] as const;

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <BarChart3 className="text-primary" size={32} />
                    Analyse ABC stock & rotation
                </h1>
                <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
                    {`Classement dynamique ${periodLabel}, filtrable par magasin, catégorie et fournisseur pour piloter les priorités de stock.`}
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <KpiCard
                    icon={TrendingUp}
                    label="CA analysé"
                    value={formatCurrency(abcData?.totals.revenue || 0, abcData?.currency)}
                    hint={`${abcData?.totals.product_count || 0} produits vendus`}
                />
                <KpiCard
                    icon={Boxes}
                    label="Produits classés"
                    value={(abcData?.totals.product_count || 0).toLocaleString('fr-FR')}
                    hint="Base ABC de la période"
                />
                <KpiCard
                    icon={BarChart3}
                    label="Classe A"
                    value={(abcData?.totals.class_a_count || 0).toLocaleString('fr-FR')}
                    hint="Produits stratégiques"
                />
                <KpiCard
                    icon={BarChart3}
                    label="Classe C"
                    value={(abcData?.totals.class_c_count || 0).toLocaleString('fr-FR')}
                    hint="Produits à faible rotation"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {classCards.map((card) => (
                    <div key={card.key} className="glass-card p-6 border-l-4 border-white/10">
                        <h3 className={`${card.accent} text-xs font-black uppercase tracking-widest mb-2`}>{card.title}</h3>
                        <div className="text-3xl font-black text-white mb-2">
                            {(abcData?.totals[`class_${card.key.toLowerCase()}_count` as 'class_a_count' | 'class_b_count' | 'class_c_count'] || 0).toLocaleString('fr-FR')}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">{card.hint}</p>
                    </div>
                ))}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-primary/50"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        Analyse basée sur la période filtrée
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Produit</th>
                                <th className="px-6 py-4">Classe</th>
                                <th className="px-6 py-4">Ventes</th>
                                <th className="px-6 py-4">CA généré</th>
                                <th className="px-6 py-4">Stock actuel</th>
                                <th className="px-6 py-4 text-right">Conseil</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">Aucun produit classé sur cette sélection.</td>
                                </tr>
                            ) : products.map((product: AnalyticsStockAbcItem) => (
                                <tr key={product.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="text-white font-bold tracking-tight">{product.name}</span>
                                        <div className="text-[10px] text-slate-500 mt-1">{(product.share_of_revenue * 100).toFixed(1)}% du CA</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black ${product.class === 'A'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : product.class === 'B'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-white/5 text-slate-400'
                                        }`}>
                                            CLASSE {product.class}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">{product.sales_count.toLocaleString('fr-FR')}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-black text-primary">{formatCurrency(product.revenue, abcData?.currency)}</div>
                                        <div className="text-[10px] text-slate-500">{formatCurrency(product.gross_profit, abcData?.currency)} de marge</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">{product.quantity} {product.unit}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] font-bold text-slate-400 italic">
                                            {product.recommendation}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
