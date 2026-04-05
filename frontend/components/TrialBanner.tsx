import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscription as subscriptionApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type BannerVariant = 'info' | 'warning' | 'danger';

function getVariant(days: number): BannerVariant {
    if (days <= 3) return 'danger';
    if (days <= 7) return 'warning';
    return 'info';
}

const VARIANT_STYLES_DARK: Record<BannerVariant, { bg: string; text: string; icon: string }> = {
    info: { bg: '#1a3a5c', text: '#7ec8f7', icon: 'time-outline' },
    warning: { bg: '#3a2e00', text: '#ffd700', icon: 'alert-circle-outline' },
    danger: { bg: '#3a0a0a', text: '#ff6b6b', icon: 'warning-outline' },
};

const VARIANT_STYLES_LIGHT: Record<BannerVariant, { bg: string; text: string; icon: string }> = {
    info: { bg: '#DBEAFE', text: '#1E40AF', icon: 'time-outline' },
    warning: { bg: '#FEF3C7', text: '#92400E', icon: 'alert-circle-outline' },
    danger: { bg: '#FEE2E2', text: '#991B1B', icon: 'warning-outline' },
};

export default function TrialBanner() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { user } = useAuth();
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [remainingDays, setRemainingDays] = useState<number | null>(null);
    const [isTrial, setIsTrial] = useState(false);
    const [isDemo, setIsDemo] = useState(false);
    const [demoType, setDemoType] = useState<string | null>(null);
    const [demoExpiresAt, setDemoExpiresAt] = useState<string | null>(null);

    const isSupplier = user?.role === 'supplier';
    const variantStyles = isDark ? VARIANT_STYLES_DARK : VARIANT_STYLES_LIGHT;

    const formatDate = (dateStr: string) => {
        try {
            const locale = i18n.resolvedLanguage || i18n.language || undefined;
            return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr));
        } catch {
            return new Date(dateStr).toLocaleDateString();
        }
    };

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
        const { bg, text, icon } = variantStyles[variant];
        const demoLabel = demoType === 'retail'
            ? t('demo.type_retail', 'Commerce')
            : demoType === 'restaurant'
                ? t('demo.type_restaurant', 'Restaurant')
                : demoType === 'enterprise'
                    ? t('demo.type_enterprise', 'Enterprise')
                    : t('demo.type_default', 'Demo');

        return (
            <TouchableOpacity
                style={[styles.banner, { backgroundColor: bg, paddingTop: insets.top + 4 }]}
                onPress={() => router.push('/subscription')}
                activeOpacity={0.85}
            >
                <Ionicons name={icon as any} size={16} color={text} />
                <Text style={[styles.label, { color: text }]} numberOfLines={1}>
                    {t('trial.demo_active', { type: demoLabel, date: formatDate(demoExpiresAt) })}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={text} style={{ opacity: 0.7 }} />
            </TouchableOpacity>
        );
    }

    if (isSupplier || !isTrial || remainingDays === null || remainingDays <= 0) return null;

    const variant = getVariant(remainingDays);
    const { bg, text, icon } = variantStyles[variant];

    const label = remainingDays === 1
        ? t('trial.banner_one', { defaultValue: "Dernier jour d'essai gratuit" })
        : t('trial.banner', { days: remainingDays, defaultValue: `{{days}} jours d'essai gratuit restants` });

    return (
        <TouchableOpacity
            style={[styles.banner, { backgroundColor: bg, paddingTop: insets.top + 4 }]}
            onPress={() => router.push('/subscription')}
            activeOpacity={0.85}
        >
            <Ionicons name={icon as any} size={16} color={text} />
            <Text style={[styles.label, { color: text }]} numberOfLines={1}>{label}</Text>
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
