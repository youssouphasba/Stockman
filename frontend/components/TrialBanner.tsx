import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { subscription as subscriptionApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type BannerVariant = 'info' | 'warning' | 'danger';

function getVariant(days: number): BannerVariant {
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warning';
    return 'info';
}

const VARIANT_STYLES: Record<BannerVariant, { bg: string; text: string; icon: string }> = {
    info: { bg: '#1a3a5c', text: '#7ec8f7', icon: 'time-outline' },
    warning: { bg: '#3a2e00', text: '#ffd700', icon: 'alert-circle-outline' },
    danger: { bg: '#3a0a0a', text: '#ff6b6b', icon: 'warning-outline' },
};

export default function TrialBanner() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const [remainingDays, setRemainingDays] = useState<number | null>(null);
    const [isTrial, setIsTrial] = useState(false);
    const [isDemo, setIsDemo] = useState(false);
    const [demoType, setDemoType] = useState<string | null>(null);
    const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);

    // Les comptes fournisseurs sont gratuits — pas de bandeau trial
    const isSupplier = user?.role === 'supplier';

    useEffect(() => {
        if (isSupplier) return;
        subscriptionApi.getDetails()
            .then(data => {
                if (data) {
                    setIsTrial(!!data.is_trial);
                    setRemainingDays(data.remaining_days ?? null);
                    setIsDemo(Boolean(data.is_demo));
                    setDemoType(data.demo_type || null);
                    setDemoExpiresAt(data.demo_expires_at || null);
                }
            })
            .catch(() => { });
    }, [isSupplier]);

    if (isSupplier) return null;

    if (isDemo && demoExpiresAt) {
        const expiresAt = new Date(demoExpiresAt);
        const diffDays = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        const variant = getVariant(diffDays);
        const { bg, text, icon } = VARIANT_STYLES[variant];
        const demoLabel = demoType === 'retail'
            ? 'Commerce'
            : demoType === 'restaurant'
                ? 'Restaurant'
                : demoType === 'enterprise'
                    ? 'Enterprise'
                    : 'Demo';

        return (
            <TouchableOpacity
                style={[styles.banner, { backgroundColor: bg }]}
                onPress={() => router.push('/subscription')}
                activeOpacity={0.85}
            >
                <Ionicons name={icon as any} size={16} color={text} />
                <Text style={[styles.label, { color: text }]}>
                    {`Demo ${demoLabel} active jusqu'au ${expiresAt.toLocaleString('fr-FR')}`}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={text} style={{ opacity: 0.7 }} />
            </TouchableOpacity>
        );
    }

    if (isSupplier || !isTrial || remainingDays === null || remainingDays <= 0) return null;

    const variant = getVariant(remainingDays);
    const { bg, text, icon } = VARIANT_STYLES[variant];

    const label = remainingDays === 1
        ? t('trial.banner_one', { defaultValue: 'âš ï¸ Dernier jour d\'essai gratuit' })
        : t('trial.banner', { days: remainingDays, defaultValue: `{{days}} jours d'essai gratuit restants` });

    return (
        <TouchableOpacity
            style={[styles.banner, { backgroundColor: bg }]}
            onPress={() => router.push('/subscription')}
            activeOpacity={0.85}
        >
            <Ionicons name={icon as any} size={16} color={text} />
            <Text style={[styles.label, { color: text }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={14} color={text} style={{ opacity: 0.7 }} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        paddingHorizontal: 16,
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
});
