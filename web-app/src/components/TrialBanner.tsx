'use client';
import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, AlertOctagon, ChevronRight } from 'lucide-react';
import { subscription as subscriptionApi } from '../services/api';

type Variant = 'info' | 'warning' | 'danger';

function getVariant(days: number): Variant {
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warning';
    return 'info';
}

const VARIANTS: Record<Variant, { bg: string; border: string; text: string; Icon: React.ElementType }> = {
    info:    { bg: 'bg-blue-950/60',  border: 'border-blue-500/30',  text: 'text-blue-300',  Icon: Clock },
    warning: { bg: 'bg-yellow-950/60', border: 'border-yellow-500/30', text: 'text-yellow-300', Icon: AlertTriangle },
    danger:  { bg: 'bg-red-950/60',   border: 'border-red-500/30',   text: 'text-red-400',   Icon: AlertOctagon },
};

interface Props {
    onNavigateToSubscription: () => void;
    userRole?: string;
}

export default function TrialBanner({ onNavigateToSubscription, userRole }: Props) {
    const [remainingDays, setRemainingDays] = useState<number | null>(null);
    const [isTrial, setIsTrial] = useState(false);

    useEffect(() => {
        if (userRole === 'supplier') return;
        subscriptionApi.getDetails()
            .then((data: any) => {
                setIsTrial(data.is_trial);
                setRemainingDays(data.remaining_days);
            })
            .catch(() => {});
    }, [userRole]);

    if (userRole === 'supplier' || !isTrial || remainingDays === null || remainingDays <= 0) return null;

    const variant = getVariant(remainingDays);
    const { bg, border, text, Icon } = VARIANTS[variant];

    const label = remainingDays === 1
        ? "Dernier jour d'essai gratuit — Activez votre plan pour continuer"
        : `${remainingDays} jours d'essai gratuit restants`;

    return (
        <button
            onClick={onNavigateToSubscription}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border-b ${bg} ${border} ${text} hover:opacity-90 transition-opacity`}
        >
            <Icon size={15} className="shrink-0" />
            <span>{label}</span>
            <ChevronRight size={14} className="opacity-60 shrink-0" />
        </button>
    );
}
