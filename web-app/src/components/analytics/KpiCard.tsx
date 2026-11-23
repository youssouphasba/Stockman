'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

// Carte d'indicateur unique de l'application web (tableau de bord, analytique, comptabilité, CRM, superadmin).
type KpiCardProps = {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
    // Texte d'aide sous la valeur (période, précision) ; rien n'est affiché s'il est absent.
    hint?: React.ReactNode;
    // Variation en pourcentage, affichée en vert ou en rouge.
    delta?: number | null;
    // Couleur de la pastille d'icône, sous forme de classe de fond Tailwind (ex. « bg-amber-500 ») ; vert par défaut.
    tone?: string;
    onClick?: () => void;
};

export default function KpiCard({ icon: Icon, label, value, hint, delta, tone = 'bg-primary', onClick }: KpiCardProps) {
    const { t } = useTranslation();
    const showDelta = typeof delta === 'number' && Number.isFinite(delta);
    const isPositive = (delta || 0) >= 0;
    const clickable = typeof onClick === 'function';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={`w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left shadow-[0_24px_80px_-48px_rgba(15,23,42,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${clickable ? 'cursor-pointer transition hover:border-primary/30 hover:bg-white/[0.06]' : 'cursor-default'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 truncate">{label}</p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-white truncate">{value}</p>
                </div>
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                    <span aria-hidden="true" className={`absolute inset-0 ${tone} opacity-15`} />
                    <Icon size={18} className={`relative ${tone.replace('bg-', 'text-')}`} />
                </div>
            </div>

            {(hint || clickable || showDelta) ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
                        {clickable ? (
                            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                                {t('modals.view_detail')}
                            </p>
                        ) : null}
                    </div>
                    {showDelta ? (
                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(delta || 0).toFixed(1)}%
                        </div>
                    ) : null}
                </div>
            ) : null}
        </button>
    );
}
