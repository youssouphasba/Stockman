
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import { X, Delete } from 'lucide-react';

interface ChangeCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalAmount: number;
    onConfirm: () => void;
}

export default function ChangeCalculatorModal({ isOpen, onClose, totalAmount, onConfirm }: ChangeCalculatorModalProps) {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [received, setReceived] = useState('');
    const change = Math.max(0, (parseFloat(received) || 0) - totalAmount);
    const canConfirm = (parseFloat(received) || 0) >= totalAmount;

    useEffect(() => {
        if (isOpen) setReceived('');
    }, [isOpen]);

    const press = (val: string) => {
        if (val === 'C') { setReceived(''); return; }
        if (val === '⌫') { setReceived(prev => prev.slice(0, -1)); return; }
        setReceived(prev => prev + val);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#1E293B] rounded-t-2xl p-6 pb-8" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-black text-white">{t('pos.change_calculator', 'Calculateur de monnaie')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={22} /></button>
                </div>

                {/* Total */}
                <div className="flex justify-between text-sm mb-3">
                    <span className="text-slate-400">{t('pos.total_to_pay', 'Total à payer')}</span>
                    <span className="font-bold text-white">{formatCurrency(totalAmount)}</span>
                </div>

                {/* Received input */}
                <div className={`border-2 rounded-xl p-4 text-center mb-3 ${canConfirm ? 'border-secondary/60 bg-secondary/5' : 'border-white/20 bg-white/5'}`}>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('pos.received_amount', 'Montant reçu')}</p>
                    <p className="text-3xl font-black text-white">{received || '0'}</p>
                </div>

                {/* Change */}
                {canConfirm && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center mb-4">
                        <p className="text-xs font-bold text-emerald-400 uppercase">{t('pos.change_to_render', 'Monnaie à rendre')}</p>
                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(change)}</p>
                    </div>
                )}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(k => (
                        <button key={k} onClick={() => press(k)}
                            className={`h-14 rounded-xl font-bold text-xl transition-all ${k === 'C' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : k === '⌫' ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                            {k === '⌫' ? <Delete size={18} className="mx-auto" /> : k}
                        </button>
                    ))}
                </div>

                <button onClick={() => { onConfirm(); onClose(); }} disabled={!canConfirm}
                    className="w-full py-3.5 bg-secondary hover:bg-secondary/80 disabled:opacity-40 text-white font-black rounded-xl transition-all">
                    {t('common.confirm_sale', 'Confirmer la vente')}
                </button>
            </div>
        </div>
    );
}
