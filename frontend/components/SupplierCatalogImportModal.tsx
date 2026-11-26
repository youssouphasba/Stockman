import Button from './ui/Button';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { supplierCatalog } from '../services/api';
import KeyboardOverlay from './KeyboardOverlay';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const REQUIRED_FIELDS = [{ key: 'name' }];
const OPTIONAL_FIELDS = [
  { key: 'description' },
  { key: 'category' },
  { key: 'subcategory' },
  { key: 'price' },
  { key: 'unit' },
  { key: 'stock_available' },
  { key: 'min_order_quantity' },
  { key: 'sku' },
  { key: 'barcode' },
  { key: 'brand' },
  { key: 'origin' },
  { key: 'delivery_time' },
  { key: 'publication_status' },
];

export default function SupplierCatalogImportModal({ visible, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rawData, setRawData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ count: number; errors?: any[] } | null>(null);
  const [importVisibility, setImportVisibility] = useState<'published' | 'draft'>('published');

  function reset() {
    setStep(0);
    setLoading(false);
    setHeaders([]);
    setMapping({});
    setRawData([]);
    setFileName('');
    setResult(null);
    setImportVisibility('published');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handlePickFile() {
    try {
      const picker = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv'],
        copyToCacheDirectory: true,
      });
      if (picker.canceled || !picker.assets?.[0]) return;
      const asset = picker.assets[0];
      setFileName(asset.name || 'catalogue.csv');
      setLoading(true);
      const formData = new FormData();
      // @ts-ignore
      formData.append('file', {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'text/csv',
      });
      const parsed = await supplierCatalog.parseImport(formData);
      setHeaders(parsed.columns || []);
      setRawData(parsed.data || []);
      setMapping(parsed.ai_mapping || {});
      setStep(1);
    } catch {
      Alert.alert(t('common.error'), t('supplier_catalog_import.parse_error'));
    } finally {
      setLoading(false);
    }
  }

  function toggleMapping(target: string, source: string | null) {
    setMapping((prev) => {
      const next = { ...prev };
      if (!source) {
        delete next[target];
      } else {
        next[target] = source;
      }
      return next;
    });
  }

  function handleConfirmMapping() {
    const missing = REQUIRED_FIELDS.filter((field) => !mapping[field.key]);
    if (missing.length > 0) {
      Alert.alert(t('supplier_catalog_import.missing_field'), t('supplier_catalog_import.missing_mapping', { fields: missing.map((field) => t(`supplier_catalog_import.${field.key}`)).join(', ') }));
      return;
    }
    setStep(2);
  }

  async function handleImport() {
    setLoading(true);
    try {
      const importResult = await supplierCatalog.confirmImport({
        importData: rawData,
        mapping,
        fileName,
        publicationStatus: importVisibility,
      });
      setResult(importResult);
      setStep(3);
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('supplier_catalog_import.import_error'));
    } finally {
      setLoading(false);
    }
  }

  function renderUpload() {
    return (
      <View style={styles.centerContent}>
        <Ionicons name="cloud-upload-outline" size={60} color={colors.primary} />
        <Text style={styles.stepTitle}>{t('supplier_catalog_import.upload')}</Text>
        <Button
          label={t('supplier_catalog_import.choose')}
          onPress={handlePickFile}
          size="lg"
          disabled={loading}
          loading={loading}
        />
      </View>
    );
  }

  function renderMapping() {
    return (
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        <Text style={styles.stepTitle}>{t('supplier_catalog_import.mapping')}</Text>
        <Text style={styles.stepDescription}>
          {t('supplier_catalog_import.mapping_description')}
        </Text>
        {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
          <View key={field.key} style={styles.mappingBlock}>
            <Text style={styles.mappingLabel}>
              {t(`supplier_catalog_import.${field.key}`)}
              {REQUIRED_FIELDS.some((item) => item.key === field.key) ? ' *' : ''}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity style={[styles.chip, !mapping[field.key] && styles.chipActive]} onPress={() => toggleMapping(field.key, null)}>
                <Text style={[styles.chipText, !mapping[field.key] && styles.chipTextActive]}>{t('supplier_catalog_import.skip')}</Text>
              </TouchableOpacity>
              {headers.map((header) => (
                <TouchableOpacity key={`${field.key}-${header}`} style={[styles.chip, mapping[field.key] === header && styles.chipActive]} onPress={() => toggleMapping(field.key, header)}>
                  <Text style={[styles.chipText, mapping[field.key] === header && styles.chipTextActive]}>{header}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
        <Button
          label={t('supplier_catalog_import.next')}
          onPress={handleConfirmMapping}
          size="lg"
        />
      </ScrollView>
    );
  }

  function renderPreview() {
    const previewRows = rawData.slice(0, 5);
    return (
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        <Text style={styles.stepTitle}>{t('supplier_catalog_import.preview')}</Text>
        <Text style={styles.stepDescription}>
          {t('supplier_catalog_import.preview_description')}
        </Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{t('supplier_catalog_import.file', { name: fileName })}</Text>
          <Text style={styles.summaryText}>{t('supplier_catalog_import.rows', { count: rawData.length })}</Text>
          <Text style={styles.summaryText}>{t('supplier_catalog_import.visibility')}</Text>
          <View style={styles.importVisibilityRow}>
            <TouchableOpacity style={[styles.choiceChip, importVisibility === 'published' && styles.choiceChipActive]} onPress={() => setImportVisibility('published')}>
              <Text style={[styles.choiceChipText, importVisibility === 'published' && styles.choiceChipTextActive]}>{t('supplier_catalog_import.visible')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choiceChip, importVisibility === 'draft' && styles.choiceChipActive]} onPress={() => setImportVisibility('draft')}>
              <Text style={[styles.choiceChipText, importVisibility === 'draft' && styles.choiceChipTextActive]}>{t('supplier_catalog_import.hidden')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {previewRows.map((row, index) => (
          <View key={index} style={styles.previewCard}>
            <Text style={styles.previewTitle}>{mapping.name ? row[mapping.name] : t('supplier_catalog_import.unnamed')}</Text>
            <Text style={styles.previewMeta}>
              {mapping.price ? `${row[mapping.price] || 0} FCFA` : t('supplier_catalog_import.unmapped_price')} - {mapping.category ? row[mapping.category] || t('supplier_catalog_import.uncategorized') : t('supplier_catalog_import.uncategorized')}
            </Text>
          </View>
        ))}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
            <Text style={styles.secondaryButtonText}>{t('supplier_catalog_import.back')}</Text>
          </TouchableOpacity>
          <Button
            label={t('supplier_catalog_import.import')}
            onPress={handleImport}
            size="lg"
            disabled={loading}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  function renderDone() {
    return (
      <View style={styles.centerContent}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={40} color={colors.success} />
        </View>
        <Text style={styles.stepTitle}>{t('supplier_catalog_import.done')}</Text>
        <Text style={styles.stepDescription}>
          {t('supplier_catalog_import.imported', { count: result?.count || 0 })}
        </Text>
        {!!result?.errors?.length && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{t('supplier_catalog_import.rows_to_fix', { count: result.errors.length })}</Text>
            {result.errors.slice(0, 5).map((error, index) => (
              <Text key={index} style={styles.errorText}>{t('supplier_catalog_import.row_error', { row: error.row + 1, error: error.error })}</Text>
            ))}
          </View>
        )}
        <Button
          label={t('supplier_catalog_import.back_to_catalogue')}
          onPress={() => { onSuccess(); handleClose(); }}
          size="lg"
        />
      </View>
    );
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardOverlay style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('supplier_catalog_import.title')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {step === 0 && renderUpload()}
          {step === 1 && renderMapping()}
          {step === 2 && renderPreview()}
          {step === 3 && renderDone()}
        </View>
      </KeyboardOverlay>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.bgDark, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '92%', minHeight: '72%', padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  headerTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  scrollContent: { flex: 1 },
  scrollInner: { paddingBottom: Spacing.xl },
  stepTitle: { color: colors.text, fontSize: FontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  stepDescription: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, textAlign: 'center', marginBottom: Spacing.lg },
  primaryButton: { backgroundColor: colors.primary, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  secondaryButton: { borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: FontSize.md },
  mappingBlock: { marginBottom: Spacing.lg },
  mappingLabel: { color: colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  summaryText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  previewCard: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  previewTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.md, marginBottom: 4 },
  previewMeta: { color: colors.textSecondary, fontSize: FontSize.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${colors.success}18`, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  errorText: { color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 },
  importVisibilityRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg },
  choiceChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  choiceChipText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  choiceChipTextActive: { color: '#fff' },
});
