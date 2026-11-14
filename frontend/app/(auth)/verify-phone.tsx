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
    PHONE_RESEND_COOLDOWN_MS,
    sendPhoneVerification,
} from '../../services/firebasePhoneAuth';
import { useTheme } from '../../contexts/ThemeContext';

import { useTranslation } from 'react-i18next';

function sendErrorKey(error: unknown) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'auth/quota-exceeded' || code === 'auth/too-many-requests') {
        return 'auth.verifyPhone.limitReached';
    }
    return 'auth.verifyPhone.sendError';
}

export default function VerifyPhoneScreen() {
    const { user } = useAuth();
    return <VerifyPhoneForm key={JSON.stringify([user?.user_id, user?.phone])} />;
}

function VerifyPhoneForm() {
    const { t } = useTranslation();
    const { colors, glassStyle, isDark, setTheme } = useTheme();
    const { verifyPhone, user, logout } = useAuth();
    const router = useRouter();
    const phone = user?.phone;
    const phoneScope = user?.user_id ? `stockman-signup:${user.user_id}` : undefined;
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [sendError, setSendError] = useState<ReturnType<typeof sendErrorKey> | null>(null);
    const [sentAt, setSentAt] = useState<number | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [switching, setSwitching] = useState(false);
    const styles = createStyles(colors, glassStyle);

    function toggleThemeQuick() {
        void setTheme(isDark ? 'light' : 'dark');
    }

    const handleExit = async () => {
        if (phoneScope) clearPhoneVerificationState(phoneScope);
        try {
            await logout();
        } catch {
            // ignore logout errors
        }
        router.replace('/(auth)/login');
    };

    useEffect(() => {
        if (!phone || !phoneScope) return;
        let active = true;
        setResending(true);
        sendPhoneVerification(phone, phoneScope)
            .then((timestamp) => { if (active) setSentAt(timestamp); })
            .catch((cause) => { if (active) setSendError(sendErrorKey(cause)); })
            .finally(() => { if (active) setResending(false); });
        return () => { active = false; };
    }, [phone, phoneScope]);

    useEffect(() => {
        if (sentAt === null) {
            setCooldown(0);
            return;
        }
        const update = () => {
            const remaining = Math.max(0, Math.ceil((sentAt + PHONE_RESEND_COOLDOWN_MS - Date.now()) / 1000));
            setCooldown(remaining);
            return remaining;
        };
        if (!update()) return;
        const timer = setInterval(() => { if (!update()) clearInterval(timer); }, 1000);
        return () => clearInterval(timer);
    }, [sentAt]);

    async function handleVerify() {
        if (!phone || !phoneScope || sentAt === null || resending || switching || loading) return;
        const normalizedOtp = otp.replace(/\D/g, '').slice(0, 6);
        if (normalizedOtp.length !== 6) {
            setError(t('auth.verifyPhone.errorCode'));
            return;
        }

        setError('');
        setLoading(true);
        try {
            const firebaseIdToken = await confirmPhoneCode(normalizedOtp, phone, phoneScope);
            const verifiedUser = await verifyPhone(firebaseIdToken);
            if (verifiedUser.needs_profile_completion) {
                router.replace('/(auth)/complete-social-profile' as any);
            } else {
                router.replace('/(tabs)');
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : t('auth.verifyPhone.errorIncorrect'));
        } finally {
            setLoading(false);
        }
    }

    const handleSendCode = useCallback(async () => {
        if (cooldown > 0 || resending || switching || loading || !phone || !phoneScope) return;
        setResending(true);
        setError('');
        setSendError(null);
        setSentAt(null);
        setOtp('');
        try {
            setSentAt(await sendPhoneVerification(phone, phoneScope, true));
        } catch (e) {
            setSendError(sendErrorKey(e));
        } finally {
            setResending(false);
        }
    }, [cooldown, loading, resending, switching, phone, phoneScope]);

    const handleUseEmail = useCallback(async () => {
        if (switching || loading) return;
        setSwitching(true);
        setError('');
        try {
            await authApi.setVerificationChannel('email');
            if (phoneScope) clearPhoneVerificationState(phoneScope);
            router.replace('/(auth)/verify-email');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : t('auth.verifyEmail.switchError'));
        } finally {
            setSwitching(false);
        }
    }, [loading, phoneScope, router, switching, t]);

    const verifyDisabled = loading || resending || switching || sentAt === null || otp.length !== 6;
    const resendDisabled = loading || resending || switching || !phone || cooldown > 0;
    const notice = error || (sendError ? t(sendError) : '');

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
                        <TouchableOpacity style={styles.themeBtn} onPress={toggleThemeQuick} activeOpacity={0.85}>
                            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
                        </View>
                        <Text style={styles.title}>{t('auth.verifyPhone.title')}</Text>
                        <Text style={styles.subtitle}>
                            {phone && sentAt !== null && !resending
                                ? t('auth.verifyPhone.sentTo', { phone })
                                : phone && resending
                                    ? t('auth.verifyPhone.sendingTo', { phone })
                                    : t('auth.verifyPhone.subtitle')}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        {notice ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                                <Text style={styles.errorText}>{notice}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('auth.verifyPhone.label')}</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.otpInput}
                                    placeholder={t('auth.verifyPhone.placeholder')}
                                    placeholderTextColor={colors.textMuted}
                                    value={otp}
                                    onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    textAlign="center"
                                    textContentType="oneTimeCode"
                                    autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, verifyDisabled && styles.buttonDisabled]}
                            onPress={handleVerify}
                            disabled={verifyDisabled}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>{t('auth.verifyPhone.verify')}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.resendBtn, resendDisabled && styles.buttonDisabled]}
                            onPress={handleSendCode}
                            disabled={resendDisabled}
                        >
                            {resending ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.resendText}>
                                    {cooldown > 0
                                        ? t('auth.verifyPhone.resendCountdown', { seconds: cooldown })
                                        : t('auth.verifyPhone.resendCode')}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.switchBtn, switching && styles.buttonDisabled]}
                            onPress={handleUseEmail}
                            disabled={switching || loading}
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
    themeBtn: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        justifyContent: 'center',
        alignItems: 'center',
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
