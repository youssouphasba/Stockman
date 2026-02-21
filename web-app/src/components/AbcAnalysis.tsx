'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Info,
    ChevronRight,
    Search
} from 'lucide-react';
import { statistics as statsApi } from '../services/api';

interface AbcProduct {
    product_id: string;
    name: string;
    class: 'A' | 'B' | 'C';
    sales_count?: number;
    revenue?: number;
    quantity?: number;
    unit?: string;
}

export default function AbcAnalysis() {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [abcData, setAbcData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadAbc();
    }, []);

    const loadAbc = async () => {
        setLoading(true);
        try {
            const res = await statsApi.get();
            setAbcData(res.abc_analysis);
        } catch (err) {
            console.error("Error loading ABC analysis", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !abcData) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const getAllProducts = () => {
        if (!abcData) return [];
        const A = (Array.isArray(abcData?.A) ? abcData.A : []).map((p: any) => ({ ...p, class: 'A' }));
        const B = (Array.isArray(abcData?.B) ? abcData.B : []).map((p: any) => ({ ...p, class: 'B' }));
        const C = (Array.isArray(abcData?.C) ? abcData.C : []).map((p: any) => ({ ...p, class: 'C' }));
        return [...A, ...B, ...C].filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    };

    const products = getAllProducts();

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <BarChart3 className="text-primary" size={32} />
                    Analyse ABC (Loi de Pareto)
                </h1>
                <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
                    Cette analyse classe vos produits en 3 catégories basées sur leur contribution au chiffre d'affaires :
                    <span className="text-emerald-400 font-bold px-1">A (80% du CA)</span>,
                    <span className="text-primary font-bold px-1">B (15%)</span> et
                    <span className="text-slate-500 font-bold px-1">C (5%)</span>.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                <div className="glass-card p-6 border-l-4 border-emerald-500">
                    <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2">Classe A - Stratégiques</h3>
                    <div className="text-3xl font-black text-white mb-2">{abcData?.A?.length || 0} produits</div>
                    <p className="text-[10px] text-slate-500 font-medium">Génèrent ~80% de vos revenus. Ne jamais être en rupture.</p>
                </div>
                <div className="glass-card p-6 border-l-4 border-primary">
                    <h3 className="text-primary text-xs font-black uppercase tracking-widest mb-2">Classe B - Intermédiaires</h3>
                    <div className="text-3xl font-black text-white mb-2">{abcData?.B?.length || 0} produits</div>
                    <p className="text-[10px] text-slate-500 font-medium">Génèrent ~15% de vos revenus. Stockage modéré.</p>
                </div>
                <div className="glass-card p-6 border-l-4 border-slate-600">
                    <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Classe C - Faible rotation</h3>
                    <div className="text-3xl font-black text-white mb-2">{abcData?.C?.length || 0} produits</div>
                    <p className="text-[10px] text-slate-500 font-medium">Génèrent ~5% de vos revenus. Minimiser le stock.</p>
                </div>
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
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        <Info size={14} />
                        Analyse basée sur les 90 derniers jours
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Nom du Produit</th>
                                <th className="px-6 py-4">Classe</th>
                                <th className="px-6 py-4">Ventes</th>
                                <th className="px-6 py-4">CA Généré</th>
                                <th className="px-6 py-4">Stock Actuel</th>
                                <th className="px-6 py-4 text-right">Conseil IA</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(products || []).map((p: AbcProduct, idx: number) => (
                                <tr key={p.product_id || `${p.name}-${idx}`} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <span className="text-white font-bold tracking-tight">{p.name || 'Produit sans nom'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black ${p.class === 'A' ? 'bg-emerald-500/10 text-emerald-400' :
                                            p.class === 'B' ? 'bg-primary/10 text-primary' :
                                                'bg-white/5 text-slate-400'
                                            }`}>
                                            CLASSE {p.class}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">{p.sales_count || 0}</td>
                                    <td className="px-6 py-4 text-primary font-black">{formatCurrency(p.revenue || 0)}</td>
                                    <td className="px-6 py-4 text-slate-400">{p.quantity || 0} {p.unit || ''}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] font-bold text-slate-400 italic">
                                            {p.class === 'A' ? 'Augmenter le stock' : p.class === 'C' ? 'Liquidation suggérée' : 'Optimiser les marges'}
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
