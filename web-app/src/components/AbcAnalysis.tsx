'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Boxes, Search, TrendingUp, Link2 } from 'lucide-react';
import { analytics as analyticsApi, AnalyticsStockAbc, AnalyticsStockAbcItem, ai as aiApi } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';
import ScreenGuide, { GuideStep } from './ScreenGuide';

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
    const [correlations, setCorrelations] = useState<any>(null);
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
        // Vague 5: load product correlations in background
        aiApi.productCorrelations().then(res => setCorrelations(res)).catch(() => {});
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
        (product.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const classCards = [
        { key: 'A', title: 'Classe A', accent: 'text-emerald-400', hint: 'Les produits qui portent l’essentiel du CA.' },
        { key: 'B', title: 'Classe B', accent: 'text-primary', hint: 'La zone à optimiser pour la marge et la couverture.' },
        { key: 'C', title: 'Classe C', accent: 'text-slate-400', hint: 'Le stock à surveiller pour éviter l’immobilisation.' },
    ] as const;

    const abcSteps: GuideStep[] = [
        {
            title: "Rôle de l'analyse ABC",
            content: "L'analyse ABC classe vos produits selon leur contribution au chiffre d'affaires. Classe A : les 20% de produits qui génèrent 80% du CA. Classe B : les produits moyens. Classe C : les produits à faible contribution. Cette classification aide à prioriser les efforts de gestion de stock.",
        },
        {
            title: "Cartes KPI et résumé des classes",
            content: "En haut de l'écran, les KPI globaux et les 3 cartes de classe donnent une vue d'ensemble.",
            details: [
                { label: "CA analysé", description: "Chiffre d'affaires total pris en compte dans l'analyse sur la période.", type: 'card' as const },
                { label: "Produits classés", description: "Nombre de produits ayant suffisamment de données pour être classés.", type: 'card' as const },
                { label: "Carte Classe A (vert)", description: "Nombre de produits classés A. Ces produits doivent toujours être en stock.", type: 'card' as const },
                { label: "Carte Classe B (bleu)", description: "Produits à rotation normale. Gestion standard.", type: 'card' as const },
                { label: "Carte Classe C (gris)", description: "Produits à faible contribution. Évaluez s'il faut les maintenir ou les retirer.", type: 'card' as const },
            ],
        },
        {
            title: "Tableau de classement",
            content: "Le tableau liste tous vos produits avec leur classe, leurs ventes et les conseils associés.",
            details: [
                { label: "Barre de recherche", description: "Filtrez le tableau par nom de produit.", type: 'filter' as const },
                { label: "Colonne Produit", description: "Nom du produit + % de contribution au CA total (ex : 12,4% du CA).", type: 'info' as const },
                { label: "Colonne Classe", description: "Badge A (vert), B (bleu) ou C (gris). Calculé automatiquement selon la part de CA.", type: 'info' as const },
                { label: "Colonne Ventes", description: "Nombre de fois que le produit a été vendu sur la période analysée.", type: 'info' as const },
                { label: "Colonne CA généré", description: "Chiffre d'affaires généré + marge brute du produit.", type: 'info' as const },
                { label: "Colonne Stock actuel", description: "Quantité disponible + unité de mesure.", type: 'info' as const },
                { label: "Colonne Conseil", description: "Recommandation IA : 'Maintenir le stock', 'Réduire', 'Déréférencer'…", type: 'tip' as const },
            ],
        },
        {
            title: "Filtres globaux",
            content: "L'analyse peut être affinée selon plusieurs axes.",
            details: [
                { label: "Période", description: "Choisissez la durée d'analyse : 30, 60 ou 90 jours. Une période plus longue donne une analyse plus stable.", type: 'filter' as const },
                { label: "Boutique", description: "Filtrez l'analyse par boutique active pour voir le classement local.", type: 'filter' as const },
                { label: "Catégorie / Fournisseur", description: "Focalisez l'analyse sur une catégorie ou un fournisseur spécifique.", type: 'filter' as const },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <ScreenGuide steps={abcSteps} guideKey="abc_tour" />
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

            {/* Vague 5: Product Correlations */}
            {correlations && correlations.pairs?.length > 0 && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Link2 size={20} className="text-primary" />
                        <div>
                            <h2 className="text-lg font-black text-white">Produits souvent achetés ensemble</h2>
                            <p className="text-xs text-slate-500">{correlations.total_baskets} paniers analysés sur 90 jours · Lift ≥ 1.5×</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {correlations.pairs.slice(0, 9).map((pair: any) => (
                            <div key={`${pair.product_a_id}-${pair.product_b_id}`} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-white font-semibold text-sm truncate flex-1">{pair.product_a_name}</span>
                                    <Link2 size={12} className="text-primary shrink-0" />
                                    <span className="text-white font-semibold text-sm truncate flex-1 text-right">{pair.product_b_name}</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-500">{pair.co_occurrence} paniers communs</span>
                                    <span className={`font-black ${pair.lift >= 3 ? 'text-emerald-400' : pair.lift >= 2 ? 'text-primary' : 'text-amber-400'}`}>
                                        Lift {pair.lift}×
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
