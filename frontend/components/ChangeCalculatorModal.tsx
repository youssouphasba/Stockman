import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { formatUserCurrency } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';

interface ChangeCalculatorModalProps {
    visible: boolean;
    onClose: () => void;
    totalAmount: number;
    onConfirm: (received: number) => void;
}

export default function ChangeCalculatorModal({
    visible,
    onClose,
    totalAmount,
    onConfirm,
}: ChangeCalculatorModalProps) {
    const { t } = useTranslation();
    const { colors, glassStyle } = useTheme();
    const { user } = useAuth();
    const [receivedAmount, setReceivedAmount] = useState('');
    const [change, setChange] = useState(0);

    useEffect(() => {
        if (visible) {
            setReceivedAmount('');
            setChange(0);
        }
    }, [visible]);

    useEffect(() => {
        const received = parseFloat(receivedAmount) || 0;
        setChange(Math.max(0, received - totalAmount));
    }, [receivedAmount, totalAmount]);

    const handleKeyPress = (val: string) => {
        if (val === 'C') {
            setReceivedAmount('');
        } else if (val === '⌫') {
            setReceivedAmount(prev => prev.slice(0, -1));
        } else {
            setReceivedAmount(prev => prev + val);
        }
    };

    const Key = ({ val, flex = 1, style = {} }: { val: string; flex?: number; style?: any }) => (
        <TouchableOpacity
            style={[styles.key, { backgroundColor: colors.bgLight, flex }, style]}
            onPress={() => handleKeyPress(val)}
        >
            <Text style={[styles.keyText, { color: colors.text }]}>{val}</Text>
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.bgMid }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('pos.change_calculator')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('pos.total_to_pay')}</Text>
                            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatUserCurrency(totalAmount, user)}</Text>
                        </View>
                        <View style={[styles.inputBox, { backgroundColor: colors.bgDark, borderColor: colors.primary }]}>
                            <Text style={[styles.inputLabel, { color: colors.primary }]}>{t('pos.received_amount')}</Text>
                            <Text style={[styles.inputValue, { color: colors.text }]}>
                                {receivedAmount || '0'} <Text style={{ fontSize: 18 }}>{user?.currency || 'XOF'}</Text>
                            </Text>
                        </View>
                        {parseFloat(receivedAmount) >= totalAmount && (
                            <View style={[styles.changeBox, { backgroundColor: colors.success + '20' }]}>
                                <Text style={[styles.changeLabel, { color: colors.success }]}>{t('pos.change_to_render')}</Text>
                                <Text style={[styles.changeValue, { color: colors.success }]}>{formatUserCurrency(change, user)}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.numpad}>
                        <View style={styles.row}>
                            <Key val="1" />
                            <Key val="2" />
                            <Key val="3" />
                        </View>
                        <View style={styles.row}>
                            <Key val="4" />
                            <Key val="5" />
                            <Key val="6" />
                        </View>
                        <View style={styles.row}>
                            <Key val="7" />
                            <Key val="8" />
                            <Key val="9" />
                        </View>
                        <View style={styles.row}>
                            <Key val="C" style={{ backgroundColor: colors.danger + '20' }} />
                            <Key val="0" />
                            <Key val="⌫" />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.confirmBtn,
                            { backgroundColor: colors.primary },
                            (!receivedAmount || parseFloat(receivedAmount) < totalAmount) && { opacity: 0.5 }
                        ]}
                        onPress={() => onConfirm(parseFloat(receivedAmount))}
                        disabled={!receivedAmount || parseFloat(receivedAmount) < totalAmount}
                    >
                        <Text style={styles.confirmBtnText}>{t('common.confirm_sale')}</Text>
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
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    summaryContainer: {
        marginBottom: Spacing.lg,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    summaryLabel: {
        fontSize: FontSize.md,
    },
    summaryValue: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    inputBox: {
        borderWidth: 2,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    inputValue: {
        fontSize: 32,
        fontWeight: '800',
    },
    changeBox: {
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    changeLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    changeValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    numpad: {
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    key: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.md,
    },
    keyText: {
        fontSize: 24,
        fontWeight: '600',
    },
    confirmBtn: {
        height: 55,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
});
