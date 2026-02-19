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
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { authApi, ApiError } from '../../services/api';

import { useTranslation } from 'react-i18next';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyPhoneScreen() {
    const { t } = useTranslation();
    const { verifyPhone, user } = useAuth();
    const router = useRouter();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    async function handleVerify() {
        if (otp.length !== 6) {
            setError(t('auth.verifyPhone.errorCode'));
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await verifyPhone(otp);
            router.replace('/(tabs)');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : t('auth.verifyPhone.errorIncorrect'));
        } finally {
            setLoading(false);
        }
    }

    const handleResend = useCallback(async () => {
        if (cooldown > 0 || resending) return;
        setResending(true);
        setError('');
        setSuccess('');
        try {
            const result = await authApi.resendOtp();
            setSuccess(result.message);
            // In dev mode, show the OTP fallback if WhatsApp failed
            if (result.otp_fallback) {
                Alert.alert(
                    "Code de test (DEV)",
                    `Votre code OTP : ${result.otp_fallback}\n\n(Visible uniquement en mode développement)`,
                );
            }
            setCooldown(RESEND_COOLDOWN);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Erreur lors du renvoi du code");
        } finally {
            setResending(false);
        }
    }, [cooldown, resending]);

    return (
        <LinearGradient colors={[Colors.bgDark, Colors.bgMid]} style={styles.gradient}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scroll}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>{t('auth.verifyPhone.title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('auth.verifyPhone.sentTo', { phone: user?.phone || t('common.none') })}
                        </Text>
                        <Text style={[styles.subtitle, { marginTop: 4, fontWeight: '600', color: Colors.primaryLight }]}>
                            {t('auth.verifyPhone.testTip')}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        {error ? (
                            <View style={styles.errorBox}>
                                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {success ? (
                            <View style={styles.successBox}>
                                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                                <Text style={styles.successText}>{success}</Text>
                            </View>
                        ) : null}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t('auth.verifyPhone.label')}</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.otpInput, { letterSpacing: 10 }]}
                                    placeholder={t('auth.verifyPhone.placeholder')}
                                    placeholderTextColor={Colors.textMuted}
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
                            onPress={handleResend}
                            disabled={cooldown > 0 || resending}
                        >
                            {resending ? (
                                <ActivityIndicator size="small" color={Colors.primaryLight} />
                            ) : (
                                <Text style={styles.resendText}>
                                    {cooldown > 0
                                        ? `${t('auth.verifyPhone.notReceived')} (${cooldown}s)`
                                        : t('auth.verifyPhone.notReceived')
                                    }
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
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
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
    },
    card: {
        ...GlassStyle,
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
        color: Colors.danger,
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
        color: Colors.success,
        fontSize: FontSize.sm,
        flex: 1,
    },
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    inputWrapper: {
        backgroundColor: Colors.inputBg,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.divider,
    },
    otpInput: {
        color: Colors.text,
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: Spacing.md,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    resendBtn: {
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    resendText: {
        color: Colors.primaryLight,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
