import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { products as productsApi } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import StepProgressBar from './StepProgressBar';
import * as DocumentPicker from 'expo-document-picker';

interface BulkImportModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const REQUIRED_FIELDS = [
    { key: 'name', labelKey: 'bulk_import.field_name' },
    { key: 'sku', labelKey: 'bulk_import.field_sku' },
    { key: 'selling_price', labelKey: 'bulk_import.field_selling_price' },
];

const OPTIONAL_FIELDS = [
    { key: 'category', labelKey: 'bulk_import.field_category' },
    { key: 'quantity', labelKey: 'bulk_import.field_quantity' },
    { key: 'purchase_price', labelKey: 'bulk_import.field_purchase_price' },
    { key: 'min_stock', labelKey: 'bulk_import.field_min_stock' },
    { key: 'description', labelKey: 'bulk_import.field_description' },
];

export default function BulkImportModal({ visible, onClose, onSuccess }: BulkImportModalProps) {
    const { t } = useTranslation();
    const { colors, glassStyle } = useTheme();
    const styles = getStyles(colors, glassStyle);

    const [step, setStep] = useState(0); // 0: Upload, 1: Mapping, 2: Preview, 3: Success
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [rawData, setRawData] = useState<any[]>([]);
    const [importSummary, setImportSummary] = useState<{ count: number; errors?: any[] } | null>(null);

    async function handlePickFile() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/comma-separated-values', 'text/csv'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets?.[0]) {
                setFile(result);
                await parseFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Pick file error:', err);
            Alert.alert(t('common.error'), t('bulk_import.error_pick_file'));
        }
    }

    async function parseFile(pickerResult: DocumentPicker.DocumentPickerAsset) {
        setLoading(true);
        try {
            const formData = new FormData();
            // @ts-ignore
            formData.append('file', {
                uri: pickerResult.uri,
                name: pickerResult.name,
                type: pickerResult.mimeType || 'text/csv',
            });

            const response = await productsApi.parseImport(formData);
            const csvHeaders: string[] = response.headers || [];
            setHeaders(csvHeaders);
            setRawData(response.data || []);

            // Auto-mapping: match CSV columns to product fields
            const initialMapping: Record<string, string> = {};
            REQUIRED_FIELDS.concat(OPTIONAL_FIELDS).forEach(field => {
                const label = t(field.labelKey).toLowerCase();
                const suggested = csvHeaders.find((h: string) =>
                    h.toLowerCase().includes(field.key.toLowerCase()) ||
                    label.includes(h.toLowerCase()) ||
                    h.toLowerCase().includes(label)
                );
                if (suggested) initialMapping[field.key] = suggested;
            });

            setMapping(initialMapping);
            setStep(1);
        } catch (err) {
            console.error('Parse file error:', err);
            Alert.alert(t('common.error'), t('bulk_import.error_parse_file'));
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirmMapping() {
        // Check if required fields are mapped
        const missing = REQUIRED_FIELDS.filter(f => !mapping[f.key]);
        if (missing.length > 0) {
            Alert.alert(t('bulk_import.required_fields_title'), t('bulk_import.required_fields_msg', { fields: missing.map(f => t(f.labelKey)).join(', ') }));
            return;
        }

        setStep(2);
        // In a real app, we might fetch a preview from backend here
        // For now, we'll just show the mapping and proceed to final confirm
    }

    async function handleFinalImport() {
        setLoading(true);
        try {
            const result = await productsApi.confirmImport({
                importData: rawData,
                mapping: mapping,
            });
            setImportSummary({ count: result.count, errors: (result as any).errors });
            setStep(3);
        } catch (err) {
            console.error('Import error:', err);
            Alert.alert(t('common.error'), t('bulk_import.error_import_failed'));
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setStep(0);
        setFile(null);
        setHeaders([]);
        setMapping({});
        setRawData([]);
        setImportSummary(null);
    }

    function handleClose() {
        reset();
        onClose();
    }

    function renderStep() {
        switch (step) {
            case 0:
                return (
                    <View style={styles.stepContent}>
                        <Ionicons name="cloud-upload-outline" size={64} color={colors.primary} />
                        <Text style={styles.stepTitle}>{t('bulk_import.bulk_title')}</Text>
                        <Text style={styles.stepDesc}>
                            {t('bulk_import.upload_desc')}
                        </Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handlePickFile} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('bulk_import.choose_file')}</Text>}
                        </TouchableOpacity>
                    </View>
                );
            case 1:
                return (
                    <ScrollView style={styles.scrollContent}>
                        <Text style={styles.sectionTitle}>{t('bulk_import.map_columns')}</Text>
                        <Text style={styles.stepDesc}>{t('bulk_import.map_columns_desc')}</Text>

                        <View style={styles.mappingList}>
                            {REQUIRED_FIELDS.map(field => (
                                <View key={field.key} style={styles.mappingRow}>
                                    <Text style={styles.fieldLabel}>{t(field.labelKey)} *</Text>
                                    <View style={styles.pickerWrapper}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {headers.map(h => (
                                                <TouchableOpacity
                                                    key={h}
                                                    style={[styles.chip, mapping[field.key] === h && styles.chipActive]}
                                                    onPress={() => setMapping({ ...mapping, [field.key]: h })}
                                                >
                                                    <Text style={[styles.chipText, mapping[field.key] === h && styles.chipTextActive]}>{h}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            ))}

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitleSmall}>{t('bulk_import.optional_fields')}</Text>

                            {OPTIONAL_FIELDS.map(field => (
                                <View key={field.key} style={styles.mappingRow}>
                                    <Text style={styles.fieldLabel}>{t(field.labelKey)}</Text>
                                    <View style={styles.pickerWrapper}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <TouchableOpacity
                                                style={[styles.chip, !mapping[field.key] && styles.chipActive]}
                                                onPress={() => {
                                                    const newMapping = { ...mapping };
                                                    delete newMapping[field.key];
                                                    setMapping(newMapping);
                                                }}
                                            >
                                                <Text style={[styles.chipText, !mapping[field.key] && styles.chipTextActive]}>{t('bulk_import.skip')}</Text>
                                            </TouchableOpacity>
                                            {headers.map(h => (
                                                <TouchableOpacity
                                                    key={h}
                                                    style={[styles.chip, mapping[field.key] === h && styles.chipActive]}
                                                    onPress={() => setMapping({ ...mapping, [field.key]: h })}
                                                >
                                                    <Text style={[styles.chipText, mapping[field.key] === h && styles.chipTextActive]}>{h}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmMapping}>
                            <Text style={styles.btnText}>{t('bulk_import.next')}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                );
            case 2:
                const previewRows = rawData.slice(0, 5);
                return (
                    <ScrollView style={styles.scrollContent}>
                        <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
                            <Ionicons name="eye-outline" size={48} color={colors.secondary} />
                            <Text style={styles.stepTitle}>{t('bulk_import.preview_title')}</Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryText}>{t('bulk_import.file_label', { name: file?.assets?.[0]?.name || 'Products.csv' })}</Text>
                            <Text style={styles.summaryText}>{t('bulk_import.products_to_import', { count: rawData.length })}</Text>
                            <Text style={styles.summaryText}>{t('bulk_import.mapped_columns', { count: Object.keys(mapping).length })}</Text>
                        </View>

                        {previewRows.length > 0 && (
                            <View style={{ marginBottom: Spacing.lg }}>
                                <Text style={styles.sectionTitleSmall}>{t('bulk_import.preview_count', { count: Math.min(5, rawData.length) })}</Text>
                                {previewRows.map((row, idx) => {
                                    const name = mapping.name ? row[mapping.name] : '—';
                                    const sku = mapping.sku ? row[mapping.sku] : '—';
                                    const price = mapping.selling_price ? row[mapping.selling_price] : '—';
                                    return (
                                        <View key={idx} style={[styles.summaryCard, { marginBottom: 8 }]}>
                                            <Text style={[styles.summaryText, { fontWeight: '600' }]}>{name}</Text>
                                            <Text style={[styles.summaryText, { fontSize: FontSize.xs }]}>
                                                SKU: {sku}  •  {t('bulk_import.price_label')}: {price}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                                <Text style={styles.secondaryBtnText}>{t('bulk_import.back')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleFinalImport}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('bulk_import.start_import')}</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                );
            case 3:
                return (
                    <View style={styles.stepContent}>
                        <View style={styles.successCircle}>
                            <Ionicons name="checkmark" size={48} color={colors.success} />
                        </View>
                        <Text style={styles.stepTitle}>{t('bulk_import.success_title')}</Text>
                        <Text style={styles.stepDesc}>
                            {t('bulk_import.success_desc', { count: importSummary?.count || 0 })}
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => {
                                onSuccess();
                                handleClose();
                            }}
                        >
                            <Text style={styles.btnText}>{t('bulk_import.back_to_products')}</Text>
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('bulk_import.title')}</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.progressWrapper}>
                        <StepProgressBar
                            currentStep={step + 1}
                            totalSteps={4}
                            labels={[t('bulk_import.step_upload'), t('bulk_import.step_mapping'), t('bulk_import.step_preview'), t('bulk_import.step_done')]}
                        />
                    </View>

                    {renderStep()}
                </View>
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
        height: '90%',
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
    progressWrapper: {
        marginBottom: Spacing.xl,
    },
    stepContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    scrollContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: colors.text,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    stepDesc: {
        fontSize: FontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.text,
        marginBottom: Spacing.sm,
    },
    sectionTitleSmall: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    mappingList: {
        marginBottom: Spacing.xl,
    },
    mappingRow: {
        marginBottom: Spacing.md,
    },
    fieldLabel: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: colors.text,
        marginBottom: Spacing.xs,
    },
    pickerWrapper: {
        flexDirection: 'row',
    },
    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 8,
    },
    chipActive: {
        backgroundColor: colors.primary + '20',
        borderColor: colors.primary,
    },
    chipText: {
        fontSize: FontSize.xs,
        color: colors.textSecondary,
    },
    chipTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: Spacing.md,
    },
    primaryBtn: {
        backgroundColor: colors.primary,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        width: '100%',
        marginTop: Spacing.md,
    },
    btnText: {
        color: '#fff',
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
    },
    secondaryBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    secondaryBtnText: {
        color: colors.text,
        fontSize: FontSize.md,
        fontWeight: '600',
    },
    summaryCard: {
        width: '100%',
        padding: Spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xl,
    },
    summaryText: {
        color: colors.text,
        fontSize: FontSize.md,
        marginBottom: Spacing.xs,
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.success + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
});
