'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Clock,
    ArrowUpCircle,
    ArrowDownCircle,
    RefreshCcw,
    Filter,
    Download,
    Search,
    Calendar,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { stock as stockApi } from '../services/api';

export default function StockHistory() {
    const { t } = useTranslation();
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const limit = 20;

    useEffect(() => {
        loadMovements();
    }, [filter, page]);

    const loadMovements = async () => {
        setLoading(true);
        try {
            const res = await stockApi.getMovements(
                undefined, // product_id
                30,        // days
                undefined, // start_date
                undefined, // end_date
                page * limit,
                limit
            );
            // Handling both {items, total} and flat array responses
            const items = res.items || res;
            setMovements(items);
            setTotal(res.total || items.length);
        } catch (err) {
            console.error("Error loading movements", err);
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Clock className="text-primary" />
                        Historique des Stocks
                    </h1>
                    <p className="text-slate-400">Journal d'audit complet de tous les mouvements.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-primary/50 w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="glass-card p-2 text-slate-400 hover:text-white border border-white/5">
                        <Download size={20} />
                    </button>
                </div>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex gap-2">
                        {['all', 'in', 'out', 'adjustment'].map((f) => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f as any); setPage(0); }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {f === 'all' ? 'Tous' : f === 'in' ? 'Entrées' : f === 'out' ? 'Sorties' : 'Ajustements'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                        <Calendar size={14} />
                        Derniers 30 Jours
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4">Date & Heure</th>
                                <th className="px-6 py-4">Produit</th>
                                <th className="px-6 py-4">Mouvement</th>
                                <th className="px-6 py-4">Quantité</th>
                                <th className="px-6 py-4">Auteur</th>
                                <th className="px-6 py-4">Raison / Notes</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                [1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="animate-pulse border-b border-white/5">
                                        <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : movements.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">Aucun mouvement enregistré.</td>
                                </tr>
                            ) : movements.map((m) => (
                                <tr key={m.movement_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 text-slate-400">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{new Date(m.created_at).toLocaleDateString()}</span>
                                            <span className="text-[10px]">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary text-xs font-black">
                                                {m.product_name?.substring(0, 1).toUpperCase()}
                                            </div>
                                            <span className="text-white font-bold tracking-tight">{m.product_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getTypeColor(m.type)}`}>
                                            {getTypeIcon(m.type)}
                                            {m.type === 'in' ? 'Entrée' : m.type === 'out' ? 'Sortie' : 'Ajustement'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-lg font-black ${m.type === 'in' ? 'text-emerald-400' : m.type === 'out' ? 'text-rose-400' : 'text-amber-400'}`}>
                                            {m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-medium">{m.user_name || 'Système'}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{m.reason || 'Vente directe'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Affichage de {movements.length} sur {total} mouvements</span>
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
