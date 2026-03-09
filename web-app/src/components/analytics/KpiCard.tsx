'use client';

import React from 'react';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

type KpiCardProps = {
    icon: LucideIcon;
    label: string;
    value: string;
    hint?: string;
    delta?: number | null;
};

export default function KpiCard({ icon: Icon, label, value, hint, delta }: KpiCardProps) {
    const showDelta = typeof delta === 'number' && Number.isFinite(delta);
    const isPositive = (delta || 0) >= 0;

    return (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.95)]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon size={18} />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">{hint || 'Période sélectionnée'}</p>
                {showDelta ? (
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(delta || 0).toFixed(1)}%
                    </div>
                ) : null}
            </div>
        </div>
    );
}
