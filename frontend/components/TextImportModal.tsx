import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { products as productsApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

interface TextImportModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TextImportModal({ visible, onClose, onSuccess }: TextImportModalProps) {
    const { t } = useTranslation();
    const { colors, glassStyle } = useTheme();
    const styles = getStyles(colors, glassStyle);

    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleImport() {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const result = await productsApi.importText(text, true);
            Alert.alert(t('common.success'), t('products.import_text_success', { count: result.created || result.count }));
            setText('');
            onSuccess();
            onClose();
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('products.import_text_error'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('products.import_text_title')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text style={styles.helpText}>{t('products.import_text_help')}</Text>

                        <TextInput
                            style={styles.textInput}
                            multiline
                            numberOfLines={10}
                            placeholder={t('products.import_text_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={text}
                            onChangeText={setText}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.importBtn, (!text.trim() || loading) && styles.btnDisabled]}
                            onPress={handleImport}
                            disabled={!text.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.btnText}>{t('products.import_text_btn')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.bgMid,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        maxHeight: '80%',
        padding: Spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.text,
    },
    helpText: {
        fontSize: FontSize.sm,
        color: colors.textSecondary,
        marginBottom: Spacing.md,
        lineHeight: 20,
    },
    textInput: {
        backgroundColor: colors.bgLight,
        color: colors.text,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        fontSize: FontSize.md,
        minHeight: 200,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: Spacing.lg,
    },
    importBtn: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDisabled: {
        opacity: 0.5,
    },
    btnText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
