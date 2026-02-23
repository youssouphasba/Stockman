'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, CheckCircle, PieChart, TrendingUp, AlertCircle, FileSpreadsheet, BookOpen } from 'lucide-react';
import Modal from './Modal';
import { exportAccounting } from '../utils/ExportService';
import GrandLivreModal from './GrandLivreModal';


interface AccountingReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: any;
    expenses: any[];
    period: number;
    startDate?: string;
    endDate?: string;
}

export default function AccountingReportModal({ isOpen, onClose, stats, expenses, period, startDate, endDate }: AccountingReportModalProps) {
    const { t } = useTranslation();
    const [generating, setGenerating] = useState(false);
    const [showGrandLivre, setShowGrandLivre] = useState(false);

    const handleExport = (format: 'excel' | 'pdf') => {
        setGenerating(true);
        try {
            exportAccounting(stats, expenses, 'F', period, format);
        } catch (err) {
            console.error('Export error', err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Rapports d'Activité" maxWidth="lg">
                <div className="py-6 flex flex-col items-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
                        <FileText size={48} />
                    </div>

                    <h3 className="text-2xl font-black text-white text-center mb-2 tracking-tight">Rapports Financiers</h3>
                    <p className="text-slate-400 text-center max-w-sm mb-10 text-sm">
                        Synthèse complète de votre activité : marges, tops produits, charges et journal comptable.
                    </p>

                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Synthèse Profits */}
                        <div className="glass-card p-6 border-white/5 bg-white/5 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-white font-bold text-sm italic">Synthèse Profits</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Analyse complète des marges brutes et nettes pour la période de {period} jours.</p>
                            <ul className="mt-2 space-y-1.5">
                                <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                    <CheckCircle size={10} className="text-primary" /> Revenues & COGS
                                </li>
                                <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                    <CheckCircle size={10} className="text-primary" /> Top Produits + Dépenses
                                </li>
                                <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                    <CheckCircle size={10} className="text-primary" /> Export Excel 3 feuilles ou PDF
                                </li>
                            </ul>
                        </div>

                        {/* Grand Livre — NOW ACTIVE */}
                        <button
                            onClick={() => setShowGrandLivre(true)}
                            className="glass-card p-6 border-amber-500/20 bg-amber-500/5 flex flex-col gap-3 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                                    <BookOpen size={20} />
                                </div>
                                <span className="text-white font-bold text-sm italic">Grand Livre</span>
                                <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Nouveau</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Journal chronologique de toutes les écritures : ventes, dépenses, pertes, achats — avec solde cumulé.</p>
                            <ul className="mt-1 space-y-1">
                                <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                    <CheckCircle size={10} className="text-amber-400" /> Toutes les transactions unifiées
                                </li>
                                <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                    <CheckCircle size={10} className="text-amber-400" /> Solde cumulé en temps réel
                                </li>
                                <li className="flex items-center gap-2 text-[10px] text-slate-300">
                                    <CheckCircle size={10} className="text-amber-400" /> Export Excel 3 onglets + PDF
                                </li>
                            </ul>
                            <div className="mt-auto text-[10px] text-amber-400 font-bold flex items-center gap-1">
                                Ouvrir le Grand Livre →
                            </div>
                        </button>
                    </div>

                    <div className="w-full flex gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-sm"
                        >
                            Fermer
                        </button>
                        <button
                            onClick={() => handleExport('excel')}
                            disabled={generating}
                            className="flex-1 py-4 px-6 rounded-2xl font-black border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
                        >
                            <FileSpreadsheet size={18} />
                            Excel
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={generating}
                            className="flex-[2] btn-primary py-4 px-6 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                            {generating ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Download size={20} />
                                    PDF Professionnel
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                        <AlertCircle size={10} />
                        Le rapport couvre la période du {stats?.period_label || `${period} jours`}
                    </div>
                </div>
            </Modal>

            <GrandLivreModal
                isOpen={showGrandLivre}
                onClose={() => setShowGrandLivre(false)}
                period={period}
                startDate={startDate}
                endDate={endDate}
            />
        </>
    );
}
