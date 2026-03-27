import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';

interface LineDiscountModalProps {
    visible: boolean;
    onClose: () => void;
    productName: string;
    currentPrice: number;
    onApply: (discountType: 'percentage' | 'fixed', value: number) => void;
}

export default function LineDiscountModal({
    visible,
    onClose,
    productName,
    currentPrice,
    onApply,
}: LineDiscountModalProps) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [value, setValue] = useState('');

    useEffect(() => {
        if (visible) {
            setValue('');
        }
    }, [visible]);

    const handleApply = () => {
        const numValue = parseFloat(value) || 0;
        onApply(discountType, numValue);
        onClose();
    };

    if (!visible) return null;


    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.bgMid }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('pos.apply_discount')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.productName, { color: colors.textMuted }]}>{productName}</Text>

                    <View style={styles.typeSelector}>
                        <TouchableOpacity
                            style={[
                                styles.typeBtn,
                                { borderColor: colors.primary },
                                discountType === 'percentage' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setDiscountType('percentage')}
                        >
                            <Text style={[styles.typeText, discountType === 'percentage' && { color: '#fff' }]}>%</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.typeBtn,
                                { borderColor: colors.primary },
                                discountType === 'fixed' && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setDiscountType('fixed')}
                        >
                            <Text style={[styles.typeText, discountType === 'fixed' && { color: '#fff' }]}>Σ</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.divider, backgroundColor: colors.bgDark }]}
                        value={value}
                        onChangeText={setValue}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        autoFocus
                    />

                    <View style={styles.quickValues}>
                        {discountType === 'percentage' ? [5, 10, 15, 20].map(v => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.quickBtn, { backgroundColor: colors.bgLight }]}
                                onPress={() => setValue(v.toString())}
                            >
                                <Text style={{ color: colors.text }}>{v}%</Text>
                            </TouchableOpacity>
                        )) : [500, 1000, 2000, 5000].map(v => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.quickBtn, { backgroundColor: colors.bgLight }]}
                                onPress={() => setValue(v.toString())}
                            >
                                <Text style={{ color: colors.text }}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                        onPress={handleApply}
                    >
                        <Text style={styles.applyBtnText}>{t('common.apply')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 350,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    productName: {
        fontSize: FontSize.sm,
        marginBottom: Spacing.lg,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    typeBtn: {
        flex: 1,
        height: 45,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeText: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    input: {
        height: 60,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    quickValues: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    quickBtn: {
        flex: 1,
        height: 40,
        borderRadius: BorderRadius.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtn: {
        height: 50,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
});
