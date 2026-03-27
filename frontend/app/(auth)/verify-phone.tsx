import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { auth as authApi, ApiError } from '../../services/api';
import {
    clearPhoneVerificationState,
    confirmPhoneCode,
    resendPhoneVerification,
    sendPhoneVerification,
} from '../../services/firebasePhoneAuth';
import { useTheme } from '../../contexts/ThemeContext';

import { useTranslation } from 'react-i18next';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyPhoneScreen() {
    const { t } = useTranslation();
    const { colors, glassStyle } = useTheme();
    const { verifyPhone, user, logout } = useAuth();
    const router = useRouter();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [switching, setSwitching] = useState(false);
    const styles = createStyles(colors, glassStyle);

    const handleExit = async () => {
        try {
            await logout();
        } catch {
            // ignore logout errors
        }
        router.replace('/(auth)/login');
    };

    const [initialSent, setInitialSent] = useState(false);

    // Auto-send SMS on screen mount
    useEffect(() => {
        if (initialSent || !user?.phone) return;
        const phone = user.phone;
        setInitialSent(true);
        (async () => {
            setResending(true);
            try {
                await sendPhoneVerification(phone);
                setSuccess(t('auth.verifyPhone.sentTo', { phone }));
                setCooldown(RESEND_COOLDOWN);
            } catch (e) {
                const message = e instanceof ApiError || e instanceof Error ? e.message : t('auth.verifyPhone.resendError');
                if (typeof message === 'string' && message.toLowerCase().includes('quota')) {
                    setError(t('auth.verifyPhone.limitReached') || message);
                } else {
                    setError(message as string);
                }
            } finally {
                setResending(false);
            }
        })();
    }, [user?.phone]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    useEffect(() => {
        return () => {
            clearPhoneVerificationState();
        };
    }, []);

    async function handleVerify() {
        if (otp.length !== 6) {
            setError(t('auth.verifyPhone.errorCode'));
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);
        try {
            const firebaseIdToken = await confirmPhoneCode(otp);
            await verifyPhone(firebaseIdToken);
            router.replace('/(tabs)');
        } catch (e) {
            setError(e instanceof ApiError || e instanceof Error ? e.message : t('auth.verifyPhone.errorIncorrect'));
        } finally {
            setLoading(false);
        }
    }

    const handleSendCode = useCallback(async () => {
        if (cooldown > 0 || resending || !user?.phone) return;
        setResending(true);
        setError('');
        setSuccess('');
        try {
            await resendPhoneVerification(user.phone);
            setSuccess(t('auth.verifyPhone.sentTo', { phone: user.phone || t('common.none') }));
            setCooldown(RESEND_COOLDOWN);
        } catch (e) {
            const message = e instanceof ApiError || e instanceof Error ? e.message : t('auth.verifyPhone.resendError');
            if (typeof message === 'string' && message.toLowerCase().includes('quota')) {
                setError(t('auth.verifyPhone.limitReached') || message);
            } else {
                setError(message as string);
            }
        } finally {
            setResending(false);
        }
    }, [cooldown, resending, t, user?.phone]);

    const handleUseEmail = useCallback(async () => {
        if (switching) return;
        setSwitching(true);
        setError('');
        setSuccess('');
        try {
            const result = await authApi.setVerificationChannel('email');
            setSuccess(result.message || t('auth.verifyEmail.switchSuccess'));
            router.replace('/(auth)/verify-email');
        } catch (e) {
            setError(e instanceof ApiError || e instanceof Error ? e.message : t('auth.verifyEmail.switchError'));
        } finally {
            setSwitching(false);
        }
    }, [router, switching, t]);

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
                            <Ionicons name="arrow-back" size={22} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>{t('auth.verifyPhone.title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('auth.verifyPhone.sentTo', { phone: user?.phone || t('common.none') })}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {success ? (
                            <View style={styles.successBox}>
                                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                                <Text style={styles.successText}>{success}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('auth.verifyPhone.label')}</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.otpInput, { letterSpacing: 10 }]}
                                    placeholder={t('auth.verifyPhone.placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    textAlign="center"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{t('auth.verifyPhone.verify')}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.resendBtn, (cooldown > 0 || resending) && styles.buttonDisabled]}
                            onPress={handleSendCode}
                            disabled={cooldown > 0 || resending}
                        >
                            {resending ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.resendText}>
                                    {cooldown > 0
                                        ? `${t('auth.verifyPhone.resendCode')} (${cooldown}s)`
                                        : t('auth.verifyPhone.resendCode')}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.switchBtn, switching && styles.buttonDisabled]}
                            onPress={handleUseEmail}
                            disabled={switching}
                        >
                            {switching ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.switchText}>{t('auth.verifyPhone.useEmail')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const createStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1 },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    backBtn: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 6,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.glass,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        color: colors.text,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
    },
    card: {
        ...glassStyle,
        padding: Spacing.lg,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    errorText: {
        color: colors.danger,
        fontSize: FontSize.sm,
        flex: 1,
    },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    successText: {
        color: colors.success,
        fontSize: FontSize.sm,
        flex: 1,
    },
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    label: {
        color: colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    inputWrapper: {
        backgroundColor: colors.inputBg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    otpInput: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: Spacing.md,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    resendBtn: {
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    resendText: {
        color: colors.primary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    switchBtn: {
        marginTop: Spacing.md,
        alignItems: 'center',
    },
    switchText: {
        color: colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
