import React, { useState } from 'react';
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
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { ApiError } from '../../services/api';

import { useTranslation } from 'react-i18next';

export default function VerifyPhoneScreen() {
    const { t } = useTranslation();
    const { verifyPhone, user } = useAuth();
    const router = useRouter();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleVerify() {
        if (otp.length !== 6) {
            setError(t('auth.verifyPhone.errorCode'));
            return;
        }

        setError('');
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
                            style={styles.resendBtn}
                            onPress={() => setError(t('auth.verifyPhone.resendTip'))}
                        >
                            <Text style={styles.resendText}>{t('auth.verifyPhone.notReceived')}</Text>
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
