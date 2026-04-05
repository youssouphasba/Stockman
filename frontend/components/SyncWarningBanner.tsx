import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useTheme } from '../contexts/ThemeContext';

export default function SyncWarningBanner() {
    const { t } = useTranslation();
    const { failedCount, failedActions, isOnline, pendingCount, retryAll, dismissFailed } = useSyncStatus();
    const { colors } = useTheme();
    const [showDetail, setShowDetail] = useState(false);

    if (!isOnline && pendingCount > 0 && failedCount === 0) {
        return (
            <View style={[styles.banner, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
                <Text style={styles.text}>
                    {t('sync.pending_count', { count: pendingCount, defaultValue: '{{count}} action(s) pending sync' })}
                </Text>
            </View>
        );
    }

    if (failedCount === 0) return null;

    return (
        <>
            <TouchableOpacity
                style={[styles.banner, { backgroundColor: '#EF4444' }]}
                onPress={() => setShowDetail(true)}
                activeOpacity={0.85}
            >
                <Ionicons name="warning-outline" size={16} color="#fff" />
                <Text style={styles.text}>
                    {t('sync.failed_count', { count: failedCount, defaultValue: '{{count}} action(s) failed to sync — Tap to view' })}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>

            {showDetail && <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowDetail(false)}>
                    <Pressable style={[styles.sheet, { backgroundColor: colors.bgDark }]} onPress={() => { }}>
                        <View style={styles.sheetHeader}>
                            <Ionicons name="warning-outline" size={22} color="#EF4444" />
                            <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('sync.failed_title', 'Unsynced actions')}</Text>
                        </View>
                        <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
                            {t('sync.failed_description', 'These actions failed after multiple attempts. They are saved locally and will not be lost.')}
                        </Text>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {failedActions.map((action) => (
                                <View key={action.id} style={[styles.actionRow, { borderColor: colors.glassBorder }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.actionTitle, { color: colors.text }]}>
                                            {t(`sync.type_${action.type}`, action.type)} — {t(`sync.entity_${action.entity}`, action.entity)}
                                        </Text>
                                        <Text style={[styles.actionError, { color: colors.textMuted }]} numberOfLines={2}>
                                            {action.reason}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => dismissFailed(action.id)} style={styles.dismissBtn}>
                                        <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.sheetActions}>
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: colors.primary }]}
                                onPress={() => { retryAll(); setShowDetail(false); }}
                            >
                                <Ionicons name="refresh-outline" size={16} color="#fff" />
                                <Text style={styles.btnText}>{t('sync.retry_all', 'Retry all')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: colors.glassBorder }]}
                                onPress={() => setShowDetail(false)}
                            >
                                <Text style={[styles.btnText, { color: colors.text }]}>{t('common.close', 'Close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>}
        </>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    text: {
        flex: 1,
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 12,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sheetSub: {
        fontSize: 13,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        gap: 10,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    actionError: {
        fontSize: 12,
        marginBottom: 2,
    },
    dismissBtn: {
        padding: 4,
    },
    sheetActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
    },
    btnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
