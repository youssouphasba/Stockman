import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { support } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface ContactSupportModalProps {
    visible: boolean;
    onClose: () => void;
}

import { useTranslation } from 'react-i18next';

export default function ContactSupportModal({ visible, onClose }: ContactSupportModalProps) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            Alert.alert(t('modals.error'), t('auth.register.errorFillRequired'));
            return;
        }

        setLoading(true);
        try {
            await support.createTicket(subject, message);
            Alert.alert(t('modals.success'), t('modals.contactSupport.success'));
            setSubject('');
            setMessage('');
            onClose();
        } catch (error) {
            console.error(error);
            Alert.alert(t('modals.error'), t('modals.contactSupport.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.container, { backgroundColor: colors.glass }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('modals.contactSupport.title')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.contactSupport.subjectLabel')}</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.glassBorder }]}
                            placeholder={t('modals.contactSupport.subjectPlaceholder')}
                            placeholderTextColor={colors.textMuted}
                            value={subject}
                            onChangeText={setSubject}
                        />

                        <Text style={[styles.label, { color: colors.textMuted }]}>{t('modals.contactSupport.messageLabel')}</Text>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, borderColor: colors.glassBorder }]}
                            placeholder={t('modals.contactSupport.messagePlaceholder')}
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={6}
                            value={message}
                            onChangeText={setMessage}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: colors.primary }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>{t('modals.contactSupport.send')}</Text>
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
        maxHeight: '80%',
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
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        height: 120,
        textAlignVertical: 'top',
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
