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
    info:    { bg: 'bg-blue-700',   border: 'border-blue-400/60',   text: 'text-white', Icon: Clock },
    warning: { bg: 'bg-amber-700',  border: 'border-amber-300/70',  text: 'text-white', Icon: AlertTriangle },
    danger:  { bg: 'bg-rose-700',   border: 'border-rose-300/70',   text: 'text-white', Icon: AlertOctagon },
};

interface Props {
    onNavigateToSubscription: () => void;
    userRole?: string;
}

function formatDemoTypeLabel(demoType?: string | null) {
    switch (demoType) {
        case 'retail':
            return 'Commerce';
        case 'restaurant':
            return 'Restaurant';
        case 'enterprise':
            return 'Enterprise';
        default:
            return 'Demo';
    }
}

export default function TrialBanner({ onNavigateToSubscription, userRole }: Props) {
    const [remainingDays, setRemainingDays] = useState<number | null>(null);
    const [isTrial, setIsTrial] = useState(false);
    const [isDemo, setIsDemo] = useState(false);
    const [demoType, setDemoType] = useState<string | null>(null);
    const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);
    const [accessPhase, setAccessPhase] = useState<'active' | 'grace' | 'restricted' | 'read_only'>('active');
    const [graceUntil, setGraceUntil] = useState<string | null>(null);
    const [requiresPaymentAttention, setRequiresPaymentAttention] = useState(false);

    useEffect(() => {
        if (userRole === 'supplier') return;
        subscriptionApi.getDetails()
            .then((data: any) => {
                setIsTrial(data.is_trial);
                setRemainingDays(data.remaining_days);
                setIsDemo(Boolean(data.is_demo));
                setDemoType(data.demo_type || null);
                setDemoExpiresAt(data.demo_expires_at || null);
                setAccessPhase(data.subscription_access_phase || 'active');
                setGraceUntil(data.grace_until || null);
                setRequiresPaymentAttention(Boolean(data.requires_payment_attention));
            })
            .catch(() => {});
    }, [userRole]);

    if (userRole === 'supplier') return null;

    if (isDemo && demoExpiresAt) {
        const expiresAt = new Date(demoExpiresAt);
        const diffMs = expiresAt.getTime() - Date.now();
        const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const variant = getVariant(diffDays);
        const { bg, border, text, Icon } = VARIANTS[variant];
        const label = `Demo ${formatDemoTypeLabel(demoType)} active jusqu'au ${expiresAt.toLocaleString('fr-FR')}`;

        return (
            <button
                onClick={onNavigateToSubscription}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-black border-b shadow-sm ${bg} ${border} ${text} hover:brightness-110 transition-all`}
            >
                <Icon size={15} className="shrink-0" />
                <span>{label}</span>
                <ChevronRight size={14} className="opacity-60 shrink-0" />
            </button>
        );
    }

    if (!requiresPaymentAttention && (!isTrial || remainingDays === null || remainingDays <= 0)) return null;

    const variant = accessPhase === 'grace'
        ? getVariant(remainingDays || 7)
        : accessPhase === 'restricted' || accessPhase === 'read_only'
            ? 'danger'
            : getVariant(remainingDays || 7);
    const { bg, border, text, Icon } = VARIANTS[variant];

    const label = accessPhase === 'grace'
        ? `Paiement a regulariser avant le ${graceUntil ? new Date(graceUntil).toLocaleDateString('fr-FR') : 'plus tard'}`
        : accessPhase === 'restricted'
            ? "Acces web limite — regularisez l'abonnement pour retrouver tous les modules"
            : accessPhase === 'read_only'
                ? "Compte en lecture seule — regularisez l'abonnement pour reprendre"
                : remainingDays === 1
                    ? "Dernier jour d'essai gratuit — Activez votre plan pour continuer"
                    : `${remainingDays} jours d'essai gratuit restants`;

    return (
        <button
            onClick={onNavigateToSubscription}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-black border-b shadow-sm ${bg} ${border} ${text} hover:brightness-110 transition-all`}
        >
            <Icon size={15} className="shrink-0" />
            <span>{label}</span>
            <ChevronRight size={14} className="opacity-60 shrink-0" />
        </button>
    );
}
