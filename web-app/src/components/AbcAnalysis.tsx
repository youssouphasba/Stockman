'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Boxes, Link2, Search, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ai as aiApi, analytics as analyticsApi, AnalyticsStockAbc, AnalyticsStockAbcItem } from '../services/api';
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
    const [selectedClass, setSelectedClass] = useState<'all' | 'A' | 'B' | 'C'>('all');
    const [correlations, setCorrelations] = useState<any>(null);
    const { filters } = useAnalyticsFilters();
    const hasCustomRange = filters.useCustomRange && !!filters.startDate && !!filters.endDate;
    const analyticsFilters = useMemo(() => ({
        ...(hasCustomRange ? { start_date: filters.startDate, end_date: filters.endDate } : { days: filters.days }),
        store_id: filters.storeId || undefined,
        category_id: filters.categoryId || undefined,
        supplier_id: filters.supplierId || undefined,
    }), [filters.categoryId, filters.days, filters.endDate, filters.startDate, filters.storeId, filters.supplierId, hasCustomRange]);
    const periodLabel = hasCustomRange
        ? `du ${new Date(filters.startDate).toLocaleDateString('fr-FR')} au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`
        : `sur ${filters.days} jours`;

    const allProducts = abcData ? [
        ...(abcData.classes.A || []),
        ...(abcData.classes.B || []),
        ...(abcData.classes.C || []),
    ] : [];

    const products = allProducts.filter((product) => {
        const matchesSearch = (product.name || '').toLowerCase().includes(search.toLowerCase());
        const matchesClass = selectedClass === 'all' || product.class === selectedClass;
        return matchesSearch && matchesClass;
    });

    const abcChartData = useMemo(() => (['A', 'B', 'C'] as const).map((classe) => {
        const classProducts = abcData?.classes?.[classe] || [];
        return {
            name: `Classe ${classe}`,
            classe,
            produits: classProducts.length,
            chiffreAffaires: classProducts.reduce((sum, product) => sum + (product.revenue || 0), 0),
        };
    }), [abcData]);

    useEffect(() => {
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

            aiApi.productCorrelations().then((res) => setCorrelations(res)).catch(() => {});
        };

        loadAbc();
    }, [analyticsFilters, filters.useCustomRange]);

    const abcSteps: GuideStep[] = [
        {
            title: 'Role de l analyse ABC',
            content: 'L analyse ABC classe vos produits selon leur contribution au chiffre d affaires. Classe A : produits prioritaires, classe B : produits intermediaires, classe C : produits a faible contribution.',
        },
        {
            title: 'Cartes KPI et filtres rapides',
            content: 'Les cartes en haut de l ecran servent aussi de filtres. Cliquez sur une carte pour limiter le tableau et les graphiques a la classe choisie.',
            details: [
                { label: 'CA analyse', description: 'Revient a la vue complete sur toute la selection.', type: 'card' as const },
                { label: 'Produits classes', description: 'Affiche l ensemble des produits analyses.', type: 'card' as const },
                { label: 'Classe A', description: 'Filtre les produits strategiques a securiser en priorite.', type: 'card' as const },
                { label: 'Classe B', description: 'Filtre les produits intermediaires a optimiser.', type: 'card' as const },
                { label: 'Classe C', description: 'Filtre les produits a faible rotation a reevaluer.', type: 'card' as const },
            ],
        },
        {
            title: 'Graphiques et tableau',
            content: 'Les graphiques resument la structure de vos ventes, puis le tableau detaille chaque produit selon le filtre actif.',
            details: [
                { label: 'Graphique repartition des produits', description: 'Compare le nombre de references dans les classes A, B et C.', type: 'card' as const },
                { label: 'Graphique poids du chiffre d affaires', description: 'Compare la contribution au chiffre d affaires de chaque classe.', type: 'card' as const },
                { label: 'Barre de recherche', description: 'Filtre le tableau par nom de produit.', type: 'filter' as const },
                { label: 'Filtres de classe', description: 'Conservent uniquement les classes A, B ou C dans la liste.', type: 'filter' as const },
                { label: 'Colonne conseil', description: 'Affiche la recommandation de gestion du stock pour le produit.', type: 'tip' as const },
            ],
        },
    ];

    if (loading && !abcData) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <ScreenGuide steps={abcSteps} guideKey="abc_tour" />
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <BarChart3 className="text-primary" size={32} />
                    Analyse ABC stock et rotation
                </h1>
                <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
                    {`Classement dynamique ${periodLabel}, filtrable par magasin, categorie et fournisseur pour piloter les priorites de stock.`}
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 mb-8">
                <KpiCard icon={TrendingUp} label="CA analyse" value={formatCurrency(abcData?.totals.revenue || 0, abcData?.currency)} hint={selectedClass === 'all' ? 'Vue complete active' : 'Cliquer pour tout afficher'} onClick={() => setSelectedClass('all')} />
                <KpiCard icon={Boxes} label="Produits classes" value={(abcData?.totals.product_count || 0).toLocaleString('fr-FR')} hint={selectedClass === 'all' ? 'Vue complete active' : 'Cliquer pour tout afficher'} onClick={() => setSelectedClass('all')} />
                <KpiCard icon={BarChart3} label="Classe A" value={(abcData?.totals.class_a_count || 0).toLocaleString('fr-FR')} hint={selectedClass === 'A' ? 'Filtre actif' : 'Produits strategiques'} onClick={() => setSelectedClass('A')} />
                <KpiCard icon={BarChart3} label="Classe B" value={(abcData?.totals.class_b_count || 0).toLocaleString('fr-FR')} hint={selectedClass === 'B' ? 'Filtre actif' : 'Produits a optimiser'} onClick={() => setSelectedClass('B')} />
                <KpiCard icon={BarChart3} label="Classe C" value={(abcData?.totals.class_c_count || 0).toLocaleString('fr-FR')} hint={selectedClass === 'C' ? 'Filtre actif' : 'Faible rotation'} onClick={() => setSelectedClass('C')} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
                <div className="glass-card p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-white">Repartition des produits</h2>
                        <p className="text-xs text-slate-400">Nombre de references par classe sur la periode filtree.</p>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={abcChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                                <XAxis dataKey="name" stroke="#94A3B8" tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} stroke="#94A3B8" tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, color: '#E2E8F0' }} />
                                <Bar dataKey="produits" radius={[10, 10, 0, 0]} fill="#34D399" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-white">Poids du chiffre d affaires</h2>
                        <p className="text-xs text-slate-400">Contribution de chaque classe au chiffre d affaires total.</p>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={abcChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.12)" />
                                <XAxis dataKey="name" stroke="#94A3B8" tickLine={false} axisLine={false} />
                                <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(Number(value), abcData?.currency)} contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, color: '#E2E8F0' }} />
                                <Bar dataKey="chiffreAffaires" radius={[10, 10, 0, 0]} fill="#38BDF8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Rechercher un produit..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-primary/50"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: 'all', label: 'Toutes les classes' },
                                { key: 'A', label: 'Classe A' },
                                { key: 'B', label: 'Classe B' },
                                { key: 'C', label: 'Classe C' },
                            ].map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setSelectedClass(option.key as 'all' | 'A' | 'B' | 'C')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                                        selectedClass === option.key
                                            ? 'bg-primary text-white border-primary/50'
                                            : 'text-slate-300 border-white/10 bg-white/5 hover:border-primary/30 hover:text-white'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        {selectedClass === 'all' ? 'Analyse complete' : `Filtre actif : classe ${selectedClass}`}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Produit</th>
                                <th className="px-6 py-4">Classe</th>
                                <th className="px-6 py-4">Ventes</th>
                                <th className="px-6 py-4">CA genere</th>
                                <th className="px-6 py-4">Stock actuel</th>
                                <th className="px-6 py-4 text-right">Conseil</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">Aucun produit classe sur cette selection.</td>
                                </tr>
                            ) : products.map((product: AnalyticsStockAbcItem) => (
                                <tr key={product.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="text-white font-bold tracking-tight">{product.name}</span>
                                        <div className="text-[10px] text-slate-500 mt-1">{(product.share_of_revenue * 100).toFixed(1)}% du CA</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black ${product.class === 'A' ? 'bg-emerald-500/10 text-emerald-400' : product.class === 'B' ? 'bg-primary/10 text-primary' : 'bg-white/5 text-slate-400'}`}>
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

            {correlations && correlations.pairs?.length > 0 && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Link2 size={20} className="text-primary" />
                        <div>
                            <h2 className="text-lg font-black text-white">Produits souvent achetes ensemble</h2>
                            <p className="text-xs text-slate-500">{correlations.total_baskets} paniers analyses sur 90 jours · Lift ≥ 1.5×</p>
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
