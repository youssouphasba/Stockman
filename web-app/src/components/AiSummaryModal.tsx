'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';

interface AiSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: string;
}

export default function AiSummaryModal({ isOpen, onClose, summary }: AiSummaryModalProps) {
    const { t } = useTranslation();

    // Parse the summary if it has bullet points or sections
    const lines = summary.split('.').filter(l => l.trim().length > 5);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Rapport Quotidien IA"
        >
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary/20 to-transparent p-6 rounded-2xl border border-primary/20 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="text-primary animate-pulse" size={28} />
                    </div>
                    <div>
                        <h4 className="text-white font-black uppercase tracking-tighter text-lg">Analyse Prédictive</h4>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Basé sur vos données récentes</p>
                    </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-all">
                                {idx % 3 === 0 ? <TrendingUp size={18} className="text-emerald-500" /> :
                                    idx % 3 === 1 ? <AlertCircle size={18} className="text-amber-500" /> :
                                        <CheckCircle2 size={18} className="text-primary" />}
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-white text-sm font-medium leading-relaxed">
                                    {line.trim()}.
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2"><Calendar size={12} /> Généré le {new Date().toLocaleDateString()}</span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </Modal>
    );
}
