'use client';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
            return '';
    }
}

export default function TrialBanner({ onNavigateToSubscription, userRole }: Props) {
    const { t, i18n } = useTranslation();
    const locale = i18n.resolvedLanguage || i18n.language;
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
        const label = t('subscription_banner.demo', { type: formatDemoTypeLabel(demoType), date: expiresAt.toLocaleString(locale) });

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
        ? (graceUntil
            ? t('subscription_banner.grace_until', { date: new Date(graceUntil).toLocaleDateString(locale) })
            : t('subscription_banner.grace'))
        : accessPhase === 'restricted'
            ? t('subscription_banner.restricted')
            : accessPhase === 'read_only'
                ? t('subscription_banner.read_only')
                : remainingDays === 1
                    ? t('subscription_banner.last_day')
                    : t('subscription_banner.days', { count: remainingDays ?? 0 });

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
