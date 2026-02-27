import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Constants from 'expo-constants';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Sale, Store } from '../services/api';
import { generateSalePdf } from '../utils/pdfReports';
import { useAuth } from '../contexts/AuthContext';

interface DigitalReceiptModalProps {
    visible: boolean;
    onClose: () => void;
    sale: Sale | null;
    store: Store | null;
}

export default function DigitalReceiptModal({ visible, onClose, sale, store }: DigitalReceiptModalProps) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { user } = useAuth();
    const [sharing, setSharing] = useState(false);

    if (!sale) return null;

    const receiptUrl = `${Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000'}/api/public/receipts/${sale.sale_id}`;

    const handleSharePdf = async () => {
        if (!sale || !store) return;
        setSharing(true);
        try {
            await generateSalePdf(sale, store, user?.currency);
        } catch (error) {
            console.error('Error sharing PDF:', error);
        } finally {
            setSharing(false);
        }
    };

    const shareToWhatsAppLegacy = () => {
        const text = t('modals.receipt_whatsapp_text', { url: receiptUrl });
        const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
            }
        });
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.bgMid, borderColor: colors.glassBorder }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{t('modals.receipt')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.receiptSubtitle, { color: colors.textSecondary }]}>
                        {t('modals.receipt_qr_subtitle')}
                    </Text>

                    <View style={styles.qrContainer}>
                        <QRCode
                            value={receiptUrl}
                            size={180}
                            color="#000"
                            backgroundColor="#fff"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                        onPress={handleSharePdf}
                        disabled={sharing}
                    >
                        {sharing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="share-outline" size={20} color="#fff" />
                                <Text style={styles.shareBtnText}>{t('modals.receipt_share_pdf')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryShareBtn, { marginTop: Spacing.sm }]}
                        onPress={shareToWhatsAppLegacy}
                    >
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <Text style={[styles.secondaryShareBtnText, { color: colors.textSecondary }]}>{t('modals.receipt_whatsapp_link')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={[styles.closeBtnText, { color: colors.primary }]}>{t('modals.receipt_done')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        alignItems: 'center',
    },
    modalHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    receiptSubtitle: {
        fontSize: FontSize.sm,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    qrContainer: {
        padding: Spacing.lg,
        backgroundColor: '#fff',
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
        width: '100%',
        justifyContent: 'center',
    },
    shareBtnText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    secondaryShareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: Spacing.xs,
    },
    secondaryShareBtnText: {
        fontSize: FontSize.xs,
        fontWeight: '500',
    },
    closeBtn: {
        marginTop: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    closeBtnText: {
        fontSize: FontSize.md,
        fontWeight: '600',
    },
});

