import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { products as productsApi, replenishment } from '../../services/api';
import BatchScanner from '../../components/BatchScanner';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';

export default function BatchScanScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, glassStyle } = useTheme();
    const [showScanner, setShowScanner] = useState(true);
    const [scannedCodes, setScannedCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<'inventory' | 'replenish' | 'associate_rfid' | null>(null);

    const handleScanComplete = (codes: string[]) => {
        setScannedCodes(codes);
        setShowScanner(false);
    };

    const processBatch = async () => {
        if (!action) {
            Alert.alert(t('batch_scan.action_required'), t('batch_scan.choose_action'));
            return;
        }

        setLoading(true);
        try {
            if (action === 'replenish') {
                const res = await replenishment.automate();
                Alert.alert(t('common.success'), t('batch_scan.orders_generated', { count: res.created_count }));
                router.back();
            } else if (action === 'inventory') {
                const res = await productsApi.batchStockUpdate(scannedCodes, 1);

                let message = res.message;
                if (res.not_found_count && res.not_found_count > 0) {
                    message += `\n\n${t('batch_scan.unknown_codes', { count: res.not_found_count })} : ${res.not_found.join(', ')}`;
                }

                Alert.alert(
                    (res.not_found_count && res.not_found_count > 0) ? t('batch_scan.partial_result') : t('common.success'),
                    message,
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else if (action === 'associate_rfid') {
                Alert.alert(t('common.info'), t('batch_scan.rfid_bulk_info'));
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('common.generic_error'));
        } finally {
            setLoading(false);
        }
    };

    if (showScanner) {
        return (
            <BatchScanner
                onComplete={handleScanComplete}
                onCancel={() => router.back()}
                title={t('batch_scan.title')}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.glass }]}>
                <TouchableOpacity onPress={() => setShowScanner(true)}>
                    <Ionicons name="camera-reverse-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('batch_scan.processing_title')}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.scannedCountContainer}>
                    <Text style={[styles.scannedCount, { color: colors.primary }]}>{scannedCodes.length}</Text>
                    <Text style={[styles.scannedLabel, { color: colors.text }]}>{t('batch_scan.items_identified')}</Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('batch_scan.select_action')}</Text>

                <TouchableOpacity
                    style={[styles.actionCard, action === 'inventory' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                    onPress={() => setAction('inventory')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="list-outline" size={24} color={colors.success} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionTitle, { color: colors.text }]}>{t('batch_scan.quick_inventory')}</Text>
                        <Text style={styles.actionDesc}>{t('batch_scan.quick_inventory_desc')}</Text>
                    </View>
                    {action === 'inventory' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionCard, action === 'replenish' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                    onPress={() => setAction('replenish')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="refresh-outline" size={24} color={colors.warning} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionTitle, { color: colors.text }]}>{t('batch_scan.auto_replenish')}</Text>
                        <Text style={styles.actionDesc}>{t('batch_scan.auto_replenish_desc')}</Text>
                    </View>
                    {action === 'replenish' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionCard, action === 'associate_rfid' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                    onPress={() => setAction('associate_rfid')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: colors.info + '20' }]}>
                        <Ionicons name="radio-outline" size={24} color={colors.info} />
                    </View>
                    <View style={styles.actionInfo}>
                        <Text style={[styles.actionTitle, { color: colors.text }]}>{t('batch_scan.rfid_associate')}</Text>
                        <Text style={styles.actionDesc}>{t('batch_scan.rfid_associate_desc')}</Text>
                    </View>
                    {action === 'associate_rfid' && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.processBtn, { backgroundColor: colors.primary }]}
                    onPress={processBatch}
                    disabled={loading || !action}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.processBtnText}>{t('batch_scan.apply_action')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingTop: 50,
        paddingBottom: Spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: Spacing.lg,
    },
    scannedCountContainer: {
        alignItems: 'center',
        marginVertical: 30,
    },
    scannedCount: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    scannedLabel: {
        fontSize: 14,
        opacity: 0.7,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: Spacing.md,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionInfo: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    actionDesc: {
        fontSize: 12,
        color: '#666',
    },
    footer: {
        padding: Spacing.lg,
        paddingBottom: 40,
    },
    processBtn: {
        height: 56,
        borderRadius: BorderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    processBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
