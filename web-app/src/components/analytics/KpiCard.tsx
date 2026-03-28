'use client';

import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

type KpiCardProps = {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    delta?: number | null;
    onClick?: () => void;
};

export default function KpiCard({ icon: Icon, label, value, hint, delta, onClick }: KpiCardProps) {
    const showDelta = typeof delta === 'number' && Number.isFinite(delta);
    const isPositive = (delta || 0) >= 0;
    const clickable = typeof onClick === 'function';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={`w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left shadow-[0_24px_80px_-48px_rgba(15,23,42,0.95)] ${clickable ? 'cursor-pointer transition hover:border-primary/30 hover:bg-white/[0.06]' : 'cursor-default'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 truncate">{label}</p>
                    <p className="mt-3 text-2xl font-black tracking-tight text-white truncate">{value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon size={18} />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs text-slate-400">{hint || 'Periode selectionnee'}</p>
                    {clickable ? (
                        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                            Voir le detail
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
        </button>
    );
}
