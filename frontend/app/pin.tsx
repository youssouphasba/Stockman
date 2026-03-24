import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
    Vibration,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Spacing, FontSize } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const PIN_LENGTH = 4;

export default function PinScreen() {
    const { isPinSet, isBiometricsEnabled, setPin, unlockWithPin, unlockWithBiometrics, logout } = useAuth();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const router = useRouter();
    const [pin, setPinValue] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const styles = createStyles(colors);

    useEffect(() => {
        if (isPinSet && isBiometricsEnabled) {
            handleBiometrics();
        }
    }, []);

    async function handleBiometrics() {
        const success = await unlockWithBiometrics();
        if (success) {
            // AuthContext will update isAppLocked, which triggers navigation
        }
    }

    function handlePress(num: string) {
        if (pin.length < PIN_LENGTH) {
            const newPin = pin + num;
            setPinValue(newPin);
            setError('');

            if (newPin.length === PIN_LENGTH) {
                if (!isPinSet) {
                    if (!isConfirming) {
                        // First entry during setup
                        setTimeout(() => {
                            setConfirmPin(newPin);
                            setPinValue('');
                            setIsConfirming(true);
                        }, 300);
                    } else {
                        // Confirmation entry
                        if (newPin === confirmPin) {
                            setLoading(true);
                            setPin(newPin).then(() => {
                                // Redirect back to settings or dashboard after setup
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace('/(tabs)');
                                }
                            }).finally(() => setLoading(false));
                        } else {
                            Vibration.vibrate();
                            setError(t('pin.mismatch_error'));
                            setPinValue('');
                        }
                    }
                } else {
                    // Normal unlock
                    setLoading(true);
                    unlockWithPin(newPin).then(success => {
                        if (!success) {
                            Vibration.vibrate();
                            setError(t('pin.incorrect_error'));
                            setPinValue('');
                        }
                    }).finally(() => setLoading(false));
                }
            }
        }
    }

    function handleBackspace() {
        setPinValue(pin.slice(0, -1));
    }

    const renderDot = (index: number) => {
        const isActive = pin.length > index;
        return (
            <View
                key={index}
                style={[
                    styles.dot,
                    isActive && { backgroundColor: colors.primary, transform: [{ scale: 1.2 }] },
                ]}
            />
        );
    };

    const renderKey = (val: string, icon?: string) => (
        <TouchableOpacity
            key={val}
            style={styles.key}
            onPress={() => (icon === 'backspace' ? handleBackspace() : handlePress(val))}
        >
            {icon ? (
                <Ionicons name={icon as any} size={28} color={colors.text} />
            ) : (
                <Text style={styles.keyText}>{val}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Ionicons name="lock-closed" size={48} color={colors.primary} />
                    <Text style={styles.title}>
                        {!isPinSet
                            ? (isConfirming ? t('pin.confirm_title') : t('pin.create_title'))
                            : t('pin.unlock_title')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {!isPinSet
                            ? t('pin.setup_subtitle')
                            : t('pin.unlock_subtitle')}
                    </Text>
                </View>

                <View style={styles.pinDisplay}>
                    <View style={styles.dotsContainer}>
                        {[...Array(PIN_LENGTH)].map((_, i) => renderDot(i))}
                    </View>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />}
                </View>

                <View style={styles.keypad}>
                    <View style={styles.row}>
                        {['1', '2', '3'].map(k => renderKey(k))}
                    </View>
                    <View style={styles.row}>
                        {['4', '5', '6'].map(k => renderKey(k))}
                    </View>
                    <View style={styles.row}>
                        {['7', '8', '9'].map(k => renderKey(k))}
                    </View>
                    <View style={styles.row}>
                        {isPinSet && isBiometricsEnabled ? (
                            <TouchableOpacity style={styles.key} onPress={handleBiometrics}>
                                <Ionicons name="finger-print" size={32} color={colors.primary} />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.key} />
                        )}
                        {renderKey('0')}
                        {renderKey('', 'backspace')}
                    </View>
                </View>

                {isPinSet && (
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Text style={styles.logoutText}>{t('pin.logout_btn')}</Text>
                    </TouchableOpacity>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: colors.text,
        marginTop: Spacing.md,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: colors.textSecondary,
        marginTop: Spacing.xs,
    },
    pinDisplay: {
        alignItems: 'center',
        height: 80,
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: 'transparent',
    },
    errorText: {
        color: colors.danger,
        fontSize: FontSize.sm,
        marginTop: Spacing.md,
    },
    keypad: {
        width: width * 0.8,
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    key: {
        width: width * 0.2,
        height: width * 0.2,
        borderRadius: width * 0.1,
        backgroundColor: colors.inputBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.divider,
    },
    keyText: {
        fontSize: FontSize.xxl,
        color: colors.text,
        fontWeight: '600',
    },
    logoutBtn: {
        marginBottom: Spacing.lg,
    },
    logoutText: {
        color: colors.danger,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
});
