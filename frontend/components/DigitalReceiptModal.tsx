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

    const isOfflineReceipt = Boolean((sale as any).is_offline || (sale as any).offline_pending || !sale.public_receipt_token);
    const receiptUrl = sale.public_receipt_token
        ? `${Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000'}/public/receipts/t/${sale.public_receipt_token}`
        : '';

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
        if (!receiptUrl) return;
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
                        {isOfflineReceipt
                            ? t('common.offline_mode', { defaultValue: 'Mode hors ligne' })
                            : t('modals.receipt_qr_subtitle')}
                    </Text>

                    <View style={styles.qrContainer}>
                        {isOfflineReceipt ? (
                            <View style={styles.offlineReceiptState}>
                                <Ionicons name="cloud-offline-outline" size={42} color={colors.warning || '#F59E0B'} />
                                <Text style={[styles.offlineReceiptTitle, { color: colors.text }]}>
                                    Vente enregistrée hors ligne
                                </Text>
                                <Text style={[styles.offlineReceiptText, { color: colors.textSecondary }]}>
                                    Le reçu partageable sera disponible après la synchronisation.
                                </Text>
                            </View>
                        ) : (
                            <QRCode
                                value={receiptUrl || 'receipt-unavailable'}
                                size={180}
                                color="#000"
                                backgroundColor="#fff"
                            />
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.shareBtn, { backgroundColor: isOfflineReceipt ? colors.textMuted : colors.primary, opacity: isOfflineReceipt ? 0.6 : 1 }]}
                        onPress={handleSharePdf}
                        disabled={sharing || isOfflineReceipt}
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
                        disabled={isOfflineReceipt}
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
        minHeight: 220,
        minWidth: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    offlineReceiptState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: Spacing.md,
    },
    offlineReceiptTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        textAlign: 'center',
    },
    offlineReceiptText: {
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
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

