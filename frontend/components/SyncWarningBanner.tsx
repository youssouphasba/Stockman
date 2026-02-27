import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Banner shown when there are offline actions permanently stuck in the dead letter queue.
 * Drops in below the TrialBanner in the tab layout.
 */
export default function SyncWarningBanner() {
    const { failedCount, failedActions, isOnline, pendingCount, retryAll, dismissFailed } = useSyncStatus();
    const { colors } = useTheme();
    const [showDetail, setShowDetail] = useState(false);

    const entityLabels: Record<string, string> = {
        product: 'Produit',
        sale: 'Vente',
        order: 'Commande',
        stock: 'Mouvement stock',
        customer: 'Client',
        expense: 'Dépense',
        supplier: 'Fournisseur',
        alert_rule: 'Règle alerte',
        settings: 'Paramètres',
        notification: 'Notification',
    };

    const typeLabels: Record<string, string> = {
        create: 'Création',
        update: 'Modification',
        delete: 'Suppression',
    };

    // Show pending badge when offline
    if (!isOnline && pendingCount > 0 && failedCount === 0) {
        return (
            <View style={[styles.banner, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
                <Text style={styles.text}>
                    {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente de synchronisation
                </Text>
            </View>
        );
    }

    // Show error banner for dead letter items
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
                    {failedCount} action{failedCount > 1 ? 's' : ''} non synchronisée{failedCount > 1 ? 's' : ''} — Appuyez pour voir
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>

            <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowDetail(false)}>
                    <Pressable style={[styles.sheet, { backgroundColor: colors.bgDark }]} onPress={() => { }}>
                        <View style={styles.sheetHeader}>
                            <Ionicons name="warning-outline" size={22} color="#EF4444" />
                            <Text style={[styles.sheetTitle, { color: colors.text }]}>Actions non synchronisées</Text>
                        </View>
                        <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
                            Ces actions ont échoué après plusieurs tentatives. Elles sont sauvegardées localement et ne seront pas perdues.
                        </Text>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {failedActions.map((action) => (
                                <View key={action.id} style={[styles.actionRow, { borderColor: colors.glassBorder }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.actionTitle, { color: colors.text }]}>
                                            {typeLabels[action.type] || action.type} — {entityLabels[action.entity] || action.entity}
                                        </Text>
                                        <Text style={[styles.actionError, { color: colors.textMuted }]} numberOfLines={2}>
                                            {action.reason}
                                        </Text>
                                        <Text style={[styles.actionDate, { color: colors.textMuted }]}>
                                            {new Date(action.failedAt).toLocaleString('fr-FR')}
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
                                <Text style={styles.btnText}>Réessayer tout</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: colors.glassBorder }]}
                                onPress={() => setShowDetail(false)}
                            >
                                <Text style={[styles.btnText, { color: colors.text }]}>Fermer</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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
    actionDate: {
        fontSize: 11,
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
