
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface LineDiscountModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    currentPrice: number;
    onApply: (type: 'percentage' | 'fixed', value: number) => void;
}

export default function LineDiscountModal({ isOpen, onClose, productName, currentPrice, onApply }: LineDiscountModalProps) {
    const { t } = useTranslation();
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [value, setValue] = useState('');

    useEffect(() => {
        if (isOpen) setValue('');
    }, [isOpen]);

    const handleApply = () => {
        onApply(discountType, parseFloat(value) || 0);
        onClose();
    };

    const pctShortcuts = [5, 10, 15, 20];
    const fixedShortcuts = [500, 1000, 2000, 5000];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#1E293B] rounded-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-black text-white">{t('pos.apply_discount', 'Remise produit')}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={22} /></button>
                </div>
                <p className="text-sm text-slate-400 mb-5">{productName}</p>

                {/* Type toggle */}
                <div className="flex gap-2 mb-4">
                    {(['percentage', 'fixed'] as const).map(type => (
                        <button key={type} onClick={() => setDiscountType(type)}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all ${discountType === type ? 'bg-secondary/20 border-secondary text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                            {type === 'percentage' ? '% Pourcentage' : 'Σ Montant fixe'}
                        </button>
                    ))}
                </div>

                {/* Value input */}
                <input
                    className="w-full bg-[#0F172A] border border-white/20 rounded-xl px-4 py-3 text-white text-2xl text-center font-bold focus:outline-none focus:border-secondary/50 mb-3"
                    type="number" value={value} onChange={e => setValue(e.target.value)}
                    placeholder="0" autoFocus
                />

                {/* Quick values */}
                <div className="flex gap-2 mb-5">
                    {(discountType === 'percentage' ? pctShortcuts : fixedShortcuts).map(v => (
                        <button key={v} onClick={() => setValue(v.toString())}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold transition-all">
                            {discountType === 'percentage' ? `${v}%` : v.toLocaleString()}
                        </button>
                    ))}
                </div>

                <button onClick={handleApply}
                    className="w-full py-3 bg-secondary hover:bg-secondary/80 text-white font-black rounded-xl transition-all">
                    {t('common.apply', 'Appliquer')}
                </button>
            </div>
        </div>
    );
}
