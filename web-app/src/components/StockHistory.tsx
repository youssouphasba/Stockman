'use client';

import React, { useEffect, useState } from 'react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Boxes,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    RefreshCcw,
    Search,
} from 'lucide-react';
import { stock as stockApi } from '../services/api';
import { useAnalyticsFilters } from '../contexts/AnalyticsFiltersContext';
import KpiCard from './analytics/KpiCard';

export default function StockHistory() {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const { filters } = useAnalyticsFilters();
    const limit = 20;
    const hasCustomRange = filters.useCustomRange && !!filters.startDate && !!filters.endDate;
    const periodLabel = hasCustomRange
        ? `Du ${new Date(filters.startDate).toLocaleDateString('fr-FR')} au ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`
        : `${filters.days} derniers jours`;

    useEffect(() => {
        loadMovements();
    }, [filter, filters.categoryId, filters.days, filters.endDate, filters.startDate, filters.storeId, filters.supplierId, filters.useCustomRange, page]);

    const loadMovements = async () => {
        setLoading(true);
        try {
            const res = await stockApi.getMovements(
                undefined,
                hasCustomRange ? undefined : filters.days,
                hasCustomRange ? filters.startDate : undefined,
                hasCustomRange ? filters.endDate : undefined,
                page * limit,
                limit,
                filters.storeId || undefined,
                filters.categoryId || undefined,
                filters.supplierId || undefined,
            );
            const items = res.items || res;
            setMovements(items);
            setTotal(res.total || items.length);
        } catch (err) {
            console.error('Error loading movements', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMovements = movements
        .filter((movement) => filter === 'all' ? true : movement.type === filter)
        .filter((movement) => {
            const haystack = `${movement.product_name || ''} ${movement.reason || ''}`.toLowerCase();
            return haystack.includes(search.toLowerCase());
        });

    const movementsIn = filteredMovements.filter((movement) => movement.type === 'in').reduce((sum, movement) => sum + (movement.quantity || 0), 0);
    const movementsOut = filteredMovements.filter((movement) => movement.type === 'out').reduce((sum, movement) => sum + (movement.quantity || 0), 0);
    const uniqueProducts = new Set(filteredMovements.map((movement) => movement.product_id)).size;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'in': return 'text-emerald-400 bg-emerald-400/10';
            case 'out': return 'text-rose-400 bg-rose-400/10';
            default: return 'text-amber-400 bg-amber-400/10';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'in': return <ArrowUpCircle size={14} />;
            case 'out': return <ArrowDownCircle size={14} />;
            default: return <RefreshCcw size={14} />;
        }
    };

    const handleDownloadCSV = () => {
        const headers = ['Date', 'Produit', 'Mouvement', 'Quantite', 'Auteur', 'Raison'];
        const rows = filteredMovements.map((movement) => [
            new Date(movement.created_at).toLocaleString(),
            movement.product_name || '',
            movement.type === 'in' ? 'Entree' : movement.type === 'out' ? 'Sortie' : 'Ajustement',
            movement.quantity,
            movement.user_name || 'Systeme',
            movement.reason || '',
        ]);
        const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `historique_stock_${new Date().toISOString().split('T')[0]}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Clock className="text-primary" />
                        Historique des Stocks
                    </h1>
                    <p className="text-slate-400">Journal d'audit filtré par période, magasin, catégorie et fournisseur.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-primary/50 w-full md:w-64"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleDownloadCSV}
                        className="glass-card p-2 text-slate-400 hover:text-white border border-white/5 transition-all hover:text-primary"
                        title="Exporter CSV"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
                <KpiCard icon={Clock} label="Mouvements" value={total.toLocaleString('fr-FR')} hint={periodLabel} />
                <KpiCard icon={ArrowUpCircle} label="Entrées" value={movementsIn.toLocaleString('fr-FR')} hint="Quantités reçues / ajustées" />
                <KpiCard icon={ArrowDownCircle} label="Sorties" value={movementsOut.toLocaleString('fr-FR')} hint="Quantités consommées / vendues" />
                <KpiCard icon={Boxes} label="Produits touchés" value={uniqueProducts.toLocaleString('fr-FR')} hint="Références impliquées" />
            </div>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex gap-2">
                        {['all', 'in', 'out', 'adjustment'].map((value) => (
                            <button
                                key={value}
                                onClick={() => { setFilter(value as any); setPage(0); }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === value ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {value === 'all' ? 'Tous' : value === 'in' ? 'Entrees' : value === 'out' ? 'Sorties' : 'Ajustements'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                        <Calendar size={14} />
                        {periodLabel}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Date & heure</th>
                                <th className="px-6 py-4">Produit</th>
                                <th className="px-6 py-4">Mouvement</th>
                                <th className="px-6 py-4">Quantité</th>
                                <th className="px-6 py-4">Auteur</th>
                                <th className="px-6 py-4">Raison / notes</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                [1, 2, 3, 4, 5].map((index) => (
                                    <tr key={index} className="animate-pulse border-b border-white/5">
                                        <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">Aucun mouvement enregistré.</td>
                                </tr>
                            ) : filteredMovements.map((movement) => (
                                <tr key={movement.movement_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 text-slate-400">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{new Date(movement.created_at).toLocaleDateString()}</span>
                                            <span className="text-[10px]">{new Date(movement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary text-xs font-black">
                                                {(movement.product_name || '?').substring(0, 1).toUpperCase()}
                                            </div>
                                            <span className="text-white font-bold tracking-tight">{movement.product_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getTypeColor(movement.type)}`}>
                                            {getTypeIcon(movement.type)}
                                            {movement.type === 'in' ? 'Entree' : movement.type === 'out' ? 'Sortie' : 'Ajustement'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-lg font-black ${movement.type === 'in' ? 'text-emerald-400' : movement.type === 'out' ? 'text-rose-400' : 'text-amber-400'}`}>
                                            {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{movement.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-medium">{movement.user_name || 'Systeme'}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{movement.reason || 'Operation stock'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Affichage de {filteredMovements.length} sur {total} mouvements</span>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(page - 1)}
                            className="glass-card p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage(page + 1)}
                            className="glass-card p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
