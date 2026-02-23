'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    BookOpen, Download, FileSpreadsheet, FileText,
    TrendingUp, TrendingDown, X, Search, Filter,
    ArrowUpRight, ArrowDownLeft, RefreshCw
} from 'lucide-react';
import Modal from './Modal';
import { accounting as accountingApi } from '../services/api';
import { exportToExcel, exportToPDF, ExcelColumn } from '../utils/ExportService';

interface GrandLivreModalProps {
    isOpen: boolean;
    onClose: () => void;
    period: number;
    startDate?: string;
    endDate?: string;
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
    sale: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: ArrowUpRight },
    expense: { color: 'text-red-400', bg: 'bg-red-500/10', icon: ArrowDownLeft },
    loss: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: ArrowDownLeft },
    purchase: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: ArrowDownLeft },
};

const FILTERS = ['Tous', 'Vente', 'Dépense', 'Perte / Démarque', 'Achat Fournisseur'];

export default function GrandLivreModal({ isOpen, onClose, period, startDate, endDate }: GrandLivreModalProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Tous');

    useEffect(() => {
        if (isOpen) loadData().catch(() => { /* handled inside */ });
    }, [isOpen, period, startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await accountingApi.getGrandLivre(period, startDate, endDate);
            setData(res);
        } catch (err: any) {
            const msg = err?.message || 'Impossible de charger le grand livre.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const entries = useMemo(() => {
        if (!data?.entries) return [];
        let list = data.entries;
        if (typeFilter !== 'Tous') list = list.filter((e: any) => e.type === typeFilter);
        if (search) {
            const s = search.toLowerCase();
            list = list.filter((e: any) =>
                e.reference?.toLowerCase().includes(s) ||
                e.description?.toLowerCase().includes(s) ||
                e.type?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [data, typeFilter, search]);

    const handleExportExcel = () => {
        if (!data?.entries) return;
        const cols: ExcelColumn[] = [
            { key: 'date', label: 'Date / Heure', width: 22, type: 'date' },
            { key: 'type', label: 'Type', width: 20 },
            { key: 'reference', label: 'Référence', width: 16 },
            { key: 'description', label: 'Description', width: 45 },
            { key: 'payment_method', label: 'Mode paiement', width: 18 },
            { key: 'amount_in', label: 'Entrée (+)', width: 18, type: 'number' },
            { key: 'amount_out', label: 'Sortie (–)', width: 18, type: 'number' },
            { key: 'balance', label: 'Solde cumulé', width: 18, type: 'number' },
        ];
        exportToExcel({
            title: 'Grand Livre Comptable',
            period: data.period_start ? `${new Date(data.period_start).toLocaleDateString('fr-FR')} → ${new Date(data.period_end).toLocaleDateString('fr-FR')}` : `Derniers ${period} jours`,
            filename: 'Stockman_GrandLivre',
            sheets: [
                {
                    name: 'Grand Livre',
                    columns: cols,
                    data: data.entries,
                    summaryRows: [
                        ['TOTAL ENTRÉES (+)', data.total_in],
                        ['TOTAL SORTIES (–)', data.total_out],
                        ['SOLDE NET', data.net_balance],
                        ['NOMBRE D\'ÉCRITURES', data.count],
                    ],
                },
                {
                    name: 'Ventes uniquement',
                    columns: cols,
                    data: data.entries.filter((e: any) => e.type_code === 'sale'),
                    summaryRows: [['TOTAL VENTES', data.entries.filter((e: any) => e.type_code === 'sale').reduce((s: number, e: any) => s + e.amount_in, 0)]],
                },
                {
                    name: 'Dépenses & Pertes',
                    columns: cols,
                    data: data.entries.filter((e: any) => ['expense', 'loss', 'purchase'].includes(e.type_code)),
                    summaryRows: [['TOTAL SORTIES', data.total_out]],
                },
            ],
        });
    };

    const handleExportPDF = () => {
        if (!data?.entries) return;
        const cols: ExcelColumn[] = [
            { key: 'date', label: 'Date', width: 18, type: 'date' },
            { key: 'type', label: 'Type', width: 18 },
            { key: 'reference', label: 'Réf.', width: 14 },
            { key: 'description', label: 'Description', width: 40 },
            { key: 'amount_in', label: 'Entrée', width: 16, type: 'number' },
            { key: 'amount_out', label: 'Sortie', width: 16, type: 'number' },
            { key: 'balance', label: 'Solde', width: 16, type: 'number' },
        ];
        const periodLabel = data.period_start
            ? `${new Date(data.period_start).toLocaleDateString('fr-FR')} → ${new Date(data.period_end).toLocaleDateString('fr-FR')}`
            : `Derniers ${period} jours`;
        exportToPDF({
            title: 'Grand Livre Comptable',
            period: periodLabel,
            filename: 'Stockman_GrandLivre',
            sections: [
                {
                    title: 'Résumé',
                    columns: [],
                    data: [],
                    kpiCards: [
                        { label: 'Total Entrées', value: `${(data.total_in || 0).toLocaleString('fr-FR')} F` },
                        { label: 'Total Sorties', value: `${(data.total_out || 0).toLocaleString('fr-FR')} F` },
                        { label: 'Solde Net', value: `${(data.net_balance || 0).toLocaleString('fr-FR')} F` },
                        { label: 'Nb Écritures', value: String(data.count || 0) },
                    ],
                },
                {
                    title: 'Journal Chronologique',
                    columns: cols,
                    data: data.entries,
                },
            ],
        });
    };

    const fmt = (n: number) => n?.toLocaleString('fr-FR') ?? '0';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Grand Livre Comptable" maxWidth="xl">
            <div className="flex flex-col gap-4 py-2">

                {/* Header KPIs */}
                {data && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Total Entrées</span>
                            <span className="text-xl font-black text-white">{fmt(data.total_in)} <span className="text-sm font-normal text-slate-400">F</span></span>
                        </div>
                        <div className="glass-card p-4 border-red-500/20 bg-red-500/5 flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Total Sorties</span>
                            <span className="text-xl font-black text-white">{fmt(data.total_out)} <span className="text-sm font-normal text-slate-400">F</span></span>
                        </div>
                        <div className={`glass-card p-4 flex flex-col gap-1 ${data.net_balance >= 0 ? 'border-primary/20 bg-primary/5' : 'border-red-500/20 bg-red-500/5'}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Solde Net</span>
                            <span className={`text-xl font-black ${data.net_balance >= 0 ? 'text-primary' : 'text-red-400'}`}>
                                {data.net_balance >= 0 ? '+' : ''}{fmt(data.net_balance)} <span className="text-sm font-normal text-slate-400">F</span>
                            </span>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex gap-2 flex-wrap">
                    <div className="flex-1 relative min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <div className="flex gap-1">
                        {FILTERS.map(f => (
                            <button
                                key={f}
                                onClick={() => setTypeFilter(f)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${typeFilter === f ? 'bg-primary text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'}`}
                            >
                                {f === 'Tous' ? 'Tous' : f === 'Vente' ? 'Ventes' : f === 'Dépense' ? 'Dépenses' : f === 'Perte / Démarque' ? 'Pertes' : 'Achats'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="glass-card px-3 py-2 text-slate-400 hover:text-white transition-colors"
                        title="Rafraîchir"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Table */}
                <div className="glass-card overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                            <BookOpen size={36} className="opacity-20" />
                            <p className="text-sm text-red-400 text-center px-4">{error}</p>
                            <button onClick={loadData} className="text-xs text-primary hover:underline">Réessayer</button>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                            <BookOpen size={36} className="opacity-20" />
                            <p className="text-sm">Aucune écriture trouvée</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-[#0F172A] border-b border-white/10 z-10">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Date</th>
                                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-widest">Type</th>
                                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-widest">Réf.</th>
                                        <th className="text-left px-4 py-3 text-slate-400 font-bold uppercase tracking-widest">Description</th>
                                        <th className="text-right px-4 py-3 text-emerald-400 font-bold uppercase tracking-widest whitespace-nowrap">Entrée (+)</th>
                                        <th className="text-right px-4 py-3 text-red-400 font-bold uppercase tracking-widest whitespace-nowrap">Sortie (–)</th>
                                        <th className="text-right px-4 py-3 text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">Solde</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {entries.map((e: any, i: number) => {
                                        const cfg = TYPE_CONFIG[e.type_code] || TYPE_CONFIG.expense;
                                        const Icon = cfg.icon;
                                        return (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono">
                                                    {new Date(e.date).toLocaleDateString('fr-FR')}<br/>
                                                    <span className="text-slate-600 text-[10px]">{new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
                                                        <Icon size={10} />
                                                        {e.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">{e.reference}</td>
                                                <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate" title={e.description}>{e.description}</td>
                                                <td className="px-4 py-3 text-right font-mono text-emerald-400 whitespace-nowrap">
                                                    {e.amount_in > 0 ? `+${fmt(e.amount_in)} F` : ''}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-red-400 whitespace-nowrap">
                                                    {e.amount_out > 0 ? `–${fmt(e.amount_out)} F` : ''}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${e.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                                                    {e.balance >= 0 ? '' : '–'}{fmt(Math.abs(e.balance))} F
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Count info */}
                {data && (
                    <p className="text-xs text-slate-500 text-center">
                        {entries.length} écriture{entries.length > 1 ? 's' : ''} affichée{entries.length > 1 ? 's' : ''}
                        {typeFilter !== 'Tous' || search ? ` (filtrées sur ${data.count} total)` : ''}
                    </p>
                )}

                {/* Footer actions */}
                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-sm">
                        Fermer
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={!data || loading}
                        className="flex-1 py-3 rounded-2xl font-black border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm disabled:opacity-40"
                    >
                        <FileSpreadsheet size={16} />
                        Excel (3 feuilles)
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={!data || loading}
                        className="flex-1 btn-primary py-3 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all text-sm disabled:opacity-40"
                    >
                        <FileText size={16} />
                        PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
}
