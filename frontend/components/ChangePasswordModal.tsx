import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

import { useTranslation } from 'react-i18next';

export default function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { logout } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert(t('modals.error'), t('auth.register.errorFillRequired'));
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert(t('modals.error'), t('modals.changePassword.errorMismatch'));
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert(t('modals.error'), t('modals.changePassword.errorLength'));
            return;
        }

        setLoading(true);
        try {
            await auth.changePassword(oldPassword, newPassword);
            Alert.alert(
                t('modals.success'),
                t('modals.changePassword.successMessage'),
                [{ text: 'OK', onPress: () => { onClose(); logout(); } }]
            );
        } catch (error: any) {
            console.error(error);
            const message = error.message || t('modals.changePassword.errorUpdate');
            Alert.alert(t('modals.error'), message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.container, { backgroundColor: colors.bgDark }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('modals.changePassword.title')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.changePassword.oldLabel')}</Text>
                            <View style={[styles.inputContainer, { borderColor: colors.glassBorder }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    secureTextEntry={!showPassword}
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    placeholder={t('modals.changePassword.oldPlaceholder')}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.changePassword.newLabel')}</Text>
                            <View style={[styles.inputContainer, { borderColor: colors.glassBorder }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    secureTextEntry={!showPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder={t('modals.changePassword.newPlaceholder')}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.changePassword.confirmLabel')}</Text>
                            <View style={[styles.inputContainer, { borderColor: colors.glassBorder }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    secureTextEntry={!showPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder={t('modals.changePassword.confirmPlaceholder')}
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.primary} />
                            <Text style={{ marginLeft: 8, color: colors.primary }}>{t('modals.changePassword.showPasswords')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>{t('modals.changePassword.update')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 40,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    form: {
        gap: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
    },
    inputContainer: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
        justifyContent: 'center',
        marginBottom: 5,
    },
    input: {
        fontSize: 16,
        height: '100%',
    },
    submitButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
