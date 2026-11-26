// Reprise des données d'un ancien logiciel ou d'un cahier : produits et historique des ventes.
// Le fichier est analysé par le serveur (règles puis IA), le commerçant relit l'aperçu, puis valide.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import KeyboardAwareModal from './KeyboardAwareModal';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  dataMigration,
  MigrationBatch,
  MigrationDraft,
  MigrationKind,
  MigrationReport,
  MigrationTable,
} from '../services/api';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { formatUserCurrency } from '../utils/format';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported?: () => void;
};

type Step = 'home' | 'analyzing' | 'review' | 'importing' | 'report';

const FILE_TYPES = [
  'text/csv',
  'text/comma-separated-values',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'image/*',
];

const FIELDS: Record<'products' | 'sales', string[]> = {
  products: ['name', 'sku', 'quantity', 'purchase_price', 'selling_price', 'category_name', 'unit', 'min_stock', 'description'],
  sales: ['date', 'time', 'reference', 'product_name', 'quantity', 'unit_price', 'total', 'purchase_price', 'payment_method', 'customer_name'],
};

export default function DataMigrationModal({ visible, onClose, onImported }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = getStyles(colors);

  const [step, setStep] = useState<Step>('home');
  const [draft, setDraft] = useState<MigrationDraft | null>(null);
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [batches, setBatches] = useState<MigrationBatch[]>([]);
  const [busyTable, setBusyTable] = useState<number | null>(null);
  const [editingTable, setEditingTable] = useState<number | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [imported, setImported] = useState(false);

  const money = (amount?: number) => formatUserCurrency(amount || 0, user);
  const formatDate = (value?: string | null) => {
    if (!value) return '';
    const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(i18n.language);
  };

  const loadBatches = useCallback(async () => {
    try {
      const result = await dataMigration.batches();
      setBatches(result.batches || []);
    } catch {
      setBatches([]);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setStep('home');
    setDraft(null);
    setReport(null);
    setEditingTable(null);
    setImported(false);
    loadBatches();
  }, [visible, loadBatches]);

  const close = () => {
    if (step === 'analyzing' || step === 'importing') return;
    if (imported) onImported?.();
    onClose();
  };

  const confirmClose = () => {
    if (step !== 'review') {
      close();
      return;
    }
    Alert.alert(t('data_migration.leave_title'), t('data_migration.leave_message'), [
      { text: t('common.stay'), style: 'cancel' },
      { text: t('common.leave_without_saving'), style: 'destructive', onPress: close },
    ]);
  };

  async function analyze(uri: string, name: string, mimeType?: string | null) {
    setStep('analyzing');
    try {
      const formData = new FormData();
      // @ts-ignore format attendu par React Native pour l'envoi d'un fichier
      formData.append('file', { uri, name, type: mimeType || 'application/octet-stream' });
      const result = await dataMigration.analyze(formData);
      setDraft(result);
      setEditingTable(null);
      setStep('review');
    } catch (error: any) {
      setStep('home');
      Alert.alert(t('data_migration.analyze_error_title'), error?.message || t('data_migration.analyze_error'));
    }
  }

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES, copyToCacheDirectory: true });
      const asset = !result.canceled ? result.assets?.[0] : null;
      if (asset) await analyze(asset.uri, asset.name, asset.mimeType);
    } catch {
      Alert.alert(t('common.error'), t('data_migration.pick_error'));
    }
  }

  async function takePhoto(fromCamera: boolean) {
    try {
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('common.error'), t('data_migration.camera_denied'));
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      const result = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const asset = !result.canceled ? result.assets?.[0] : null;
      if (asset) await analyze(asset.uri, asset.fileName || 'photo.jpg', asset.mimeType || 'image/jpeg');
    } catch {
      Alert.alert(t('common.error'), t('data_migration.pick_error'));
    }
  }

  const replaceTable = (table: MigrationTable) => {
    setDraft((current) => current && {
      ...current,
      tables: current.tables.map((item) => (item.index === table.index ? table : item)),
    });
  };

  async function changeKind(table: MigrationTable, kind: MigrationKind) {
    if (!draft || table.kind === kind) return;
    setBusyTable(table.index);
    try {
      replaceTable(await dataMigration.setKind(draft.draft_id, table.index, kind));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('data_migration.update_error'));
    } finally {
      setBusyTable(null);
    }
  }

  async function changeColumn(table: MigrationTable, field: string, column: string | null) {
    if (!draft) return;
    const mapping = { ...table.mapping };
    if (column) {
      // Une colonne ne sert qu'à un seul champ.
      Object.keys(mapping).forEach((key) => { if (mapping[key] === column) delete mapping[key]; });
      mapping[field] = column;
    } else {
      delete mapping[field];
    }
    setBusyTable(table.index);
    try {
      replaceTable(await dataMigration.setMapping(draft.draft_id, table.index, mapping));
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('data_migration.update_error'));
    } finally {
      setBusyTable(null);
    }
  }

  async function runImport() {
    if (!draft) return;
    setStep('importing');
    try {
      const result = await dataMigration.confirm(draft.draft_id, t('data_migration.unnamed_sales_label'));
      setReport(result);
      setImported(true);
      setStep('report');
      loadBatches();
    } catch (error: any) {
      setStep('review');
      Alert.alert(t('data_migration.import_error_title'), error?.message || t('data_migration.import_error'));
    }
  }

  function undo(batch: MigrationBatch) {
    Alert.alert(
      t('data_migration.undo_title'),
      t('data_migration.undo_message', { file: batch.file_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('data_migration.undo_confirm'),
          style: 'destructive',
          onPress: async () => {
            setUndoingId(batch.batch_id);
            try {
              const result = await dataMigration.undo(batch.batch_id);
              setImported(true);
              Alert.alert(
                t('data_migration.undo_done_title'),
                [
                  t('data_migration.undo_done', { sales: result.sales_removed, products: result.products_removed }),
                  result.products_kept ? t('data_migration.undo_kept', { count: result.products_kept }) : '',
                ].filter(Boolean).join('\n\n'),
              );
              loadBatches();
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.message || t('data_migration.undo_error'));
            } finally {
              setUndoingId(null);
            }
          },
        },
      ],
    );
  }

  const importableTables = (draft?.tables || []).filter((table) => table.kind !== 'ignore');
  const canImport = importableTables.length > 0
    && importableTables.every((table) => table.missing_fields.length === 0)
    && importableTables.some((table) => (table.products_ready || 0) + (table.sales_ready || 0) > 0)
    && busyTable === null;

  const renderHome = () => (
    <>
      <Text style={styles.lead}>{t('data_migration.intro')}</Text>
      <View style={styles.tips}>
        {['tip_export', 'tip_notebook', 'tip_safe'].map((key) => (
          <View key={key} style={styles.tipRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.tipText}>{t(`data_migration.${key}`)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={pickFile}>
        <Ionicons name="document-attach-outline" size={20} color="#fff" />
        <Text style={styles.primaryText}>{t('data_migration.pick_file')}</Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.secondaryButton, styles.flex]} onPress={() => takePhoto(true)}>
          <Ionicons name="camera-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryText}>{t('data_migration.take_photo')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, styles.flex]} onPress={() => takePhoto(false)}>
          <Ionicons name="images-outline" size={18} color={colors.primary} />
          <Text style={styles.secondaryText}>{t('data_migration.pick_photo')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>{t('data_migration.formats')}</Text>

      {batches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('data_migration.history_title')}</Text>
          {batches.map((batch) => (
            <View key={batch.batch_id} style={styles.card}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={1}>{batch.file_name}</Text>
                <Text style={styles.meta}>
                  {formatDate(batch.created_at)} · {t('data_migration.history_counts', {
                    products: batch.report?.products_created || 0,
                    sales: batch.report?.sales_created || 0,
                  })}
                </Text>
                {batch.status === 'undone' && <Text style={[styles.meta, { color: colors.danger }]}>{t('data_migration.history_undone')}</Text>}
              </View>
              {batch.can_undo && (
                <TouchableOpacity style={styles.undoButton} disabled={undoingId === batch.batch_id} onPress={() => undo(batch)}>
                  {undoingId === batch.batch_id
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <Text style={styles.undoText}>{t('data_migration.undo')}</Text>}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </>
  );

  const renderWaiting = (title: string, body: string) => (
    <View style={styles.waiting}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.waitingTitle}>{title}</Text>
      <Text style={styles.hint}>{body}</Text>
    </View>
  );

  const renderTable = (table: MigrationTable) => {
    const busy = busyTable === table.index;
    const fields = table.kind === 'ignore' ? [] : FIELDS[table.kind];
    const editing = editingTable === table.index;
    return (
      <View key={table.index} style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Ionicons name="grid-outline" size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, styles.flex]} numberOfLines={1}>{table.name}</Text>
          <Text style={styles.meta}>{t('data_migration.rows', { count: table.row_count })}</Text>
        </View>

        <Text style={styles.label}>{t('data_migration.kind_question')}</Text>
        <View style={styles.row}>
          {(['products', 'sales', 'ignore'] as MigrationKind[]).map((kind) => (
            <TouchableOpacity
              key={kind}
              disabled={busy}
              onPress={() => changeKind(table, kind)}
              style={[styles.chip, table.kind === kind && styles.chipActive]}
            >
              <Text style={[styles.chipText, table.kind === kind && styles.chipTextActive]}>{t(`data_migration.kind_${kind}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {table.method === 'ai' || table.method === 'ai_document' ? (
          <Text style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color={colors.primary} /> {t(table.method === 'ai' ? 'data_migration.recognized_ai' : 'data_migration.read_by_ai')}
          </Text>
        ) : null}

        {busy && <ActivityIndicator style={{ marginVertical: Spacing.sm }} color={colors.primary} />}

        {!busy && table.kind !== 'ignore' && (
          <>
            {table.missing_fields.length > 0 ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                <Text style={[styles.tipText, { color: colors.warning }]}>
                  {t('data_migration.missing_column', { field: table.missing_fields.map((field) => t(`data_migration.fields.${field}`)).join(', ') })}
                </Text>
              </View>
            ) : table.kind === 'products' ? (
              <View style={styles.summary}>
                <Text style={styles.summaryLine}>{t('data_migration.products_ready', { count: table.products_ready || 0 })}</Text>
                {!!table.products_skipped && <Text style={styles.meta}>{t('data_migration.products_skipped', { count: table.products_skipped })}</Text>}
              </View>
            ) : (
              <View style={styles.summary}>
                <Text style={styles.summaryLine}>{t('data_migration.sales_ready', { count: table.sales_ready || 0 })}</Text>
                {!!table.sales_ready && (
                  <Text style={styles.meta}>
                    {t('data_migration.sales_period', { from: formatDate(table.first_date), to: formatDate(table.last_date), amount: money(table.revenue) })}
                  </Text>
                )}
                {!!table.already_imported && <Text style={styles.meta}>{t('data_migration.already_imported', { count: table.already_imported })}</Text>}
                {!!table.unmatched_lines && (
                  <Text style={styles.meta}>
                    {t('data_migration.unmatched', { count: table.unmatched_lines, names: (table.unmatched_names || []).slice(0, 3).join(', ') })}
                  </Text>
                )}
                <Text style={styles.meta}>{t('data_migration.sales_rules')}</Text>
              </View>
            )}
            {!!table.error_count && (
              <View style={styles.summary}>
                <Text style={[styles.meta, { color: colors.warning }]}>{t('data_migration.rows_rejected', { count: table.error_count })}</Text>
                {(table.errors || []).slice(0, 3).map((error, position) => (
                  <Text key={position} style={styles.meta}>
                    {error.row ? `${t('data_migration.line', { line: error.row })} : ` : ''}{error.error}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={() => setEditingTable(editing ? null : table.index)} style={styles.linkRow}>
              <Ionicons name={editing ? 'chevron-up' : 'options-outline'} size={16} color={colors.primary} />
              <Text style={styles.linkText}>{editing ? t('data_migration.hide_columns') : t('data_migration.check_columns')}</Text>
            </TouchableOpacity>

            {editing && fields.map((field) => (
              <View key={field} style={styles.fieldBlock}>
                <Text style={styles.label}>{t(`data_migration.fields.${field}`)}</Text>
                <View style={styles.wrap}>
                  <TouchableOpacity onPress={() => changeColumn(table, field, null)} style={[styles.smallChip, !table.mapping[field] && styles.chipActive]}>
                    <Text style={[styles.smallChipText, !table.mapping[field] && styles.chipTextActive]}>{t('data_migration.no_column')}</Text>
                  </TouchableOpacity>
                  {table.columns.map((column) => (
                    <TouchableOpacity
                      key={column}
                      disabled={table.method === 'ai_document'}
                      onPress={() => changeColumn(table, field, column)}
                      style={[styles.smallChip, table.mapping[field] === column && styles.chipActive]}
                    >
                      <Text style={[styles.smallChipText, table.mapping[field] === column && styles.chipTextActive]} numberOfLines={1}>
                        {table.method === 'ai_document' ? t(`data_migration.fields.${column}`) : column}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {table.preview.length > 0 && (
              <View style={styles.preview}>
                <Text style={styles.label}>{t('data_migration.preview')}</Text>
                {table.preview.slice(0, 3).map((row, position) => (
                  <Text key={position} style={styles.previewRow} numberOfLines={2}>
                    {fields.filter((field) => row[field]).map((field) => `${t(`data_migration.fields.${field}`)} : ${row[field]}`).join(' · ')}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const renderReview = () => (
    <>
      <Text style={styles.lead}>{t('data_migration.review_intro', { file: draft?.file_name })}</Text>
      {(draft?.tables || []).map(renderTable)}
      <TouchableOpacity style={[styles.primaryButton, !canImport && styles.disabled]} disabled={!canImport} onPress={runImport}>
        <Ionicons name="cloud-download-outline" size={20} color="#fff" />
        <Text style={styles.primaryText}>{t('data_migration.import_button')}</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>{t('data_migration.undo_hint')}</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('home')}>
        <Text style={styles.secondaryText}>{t('data_migration.other_file')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderReport = () => (
    <>
      <View style={styles.doneIcon}>
        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
      </View>
      <Text style={styles.waitingTitle}>{t('data_migration.done_title')}</Text>
      <View style={styles.summary}>
        {!!report?.products_created && <Text style={styles.summaryLine}>{t('data_migration.done_products', { count: report.products_created })}</Text>}
        {!!report?.sales_created && (
          <Text style={styles.summaryLine}>
            {t('data_migration.done_sales', { count: report.sales_created, from: formatDate(report.first_date), to: formatDate(report.last_date), amount: money(report.revenue) })}
          </Text>
        )}
        {!!report?.products_skipped && <Text style={styles.meta}>{t('data_migration.products_skipped', { count: report.products_skipped })}</Text>}
        {!!report?.sales_already_imported && <Text style={styles.meta}>{t('data_migration.already_imported', { count: report.sales_already_imported })}</Text>}
        {!!report?.error_count && <Text style={[styles.meta, { color: colors.warning }]}>{t('data_migration.rows_rejected', { count: report.error_count })}</Text>}
        {(report?.errors || []).slice(0, 8).map((error, position) => (
          <Text key={position} style={styles.meta}>
            {error.table}{error.row ? `, ${t('data_migration.line', { line: error.row })}` : ''} : {error.error}
          </Text>
        ))}
        {!!report?.unmatched_names?.length && (
          <Text style={styles.meta}>{t('data_migration.done_unmatched', { names: report.unmatched_names.slice(0, 5).join(', ') })}</Text>
        )}
      </View>
      <Text style={styles.hint}>{t('data_migration.undo_hint')}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={close}>
        <Text style={styles.primaryText}>{t('data_migration.finish')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('home')}>
        <Text style={styles.secondaryText}>{t('data_migration.add_another')}</Text>
      </TouchableOpacity>
    </>
  );

  if (!visible) return null;

  return (
    <KeyboardAwareModal visible={visible} onClose={confirmClose} backgroundColor={colors.bgMid} maxHeightRatio={0.95}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('data_migration.title')}</Text>
        <TouchableOpacity onPress={confirmClose} disabled={step === 'analyzing' || step === 'importing'} accessibilityLabel={t('common.close')}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      {step === 'home' && renderHome()}
      {step === 'analyzing' && renderWaiting(t('data_migration.analyzing_title'), t('data_migration.analyzing_body'))}
      {step === 'review' && renderReview()}
      {step === 'importing' && renderWaiting(t('data_migration.importing_title'), t('data_migration.importing_body'))}
      {step === 'report' && renderReport()}
    </KeyboardAwareModal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, flex: 1, marginRight: Spacing.sm },
  lead: { fontSize: FontSize.sm, color: colors.textSecondary || colors.textMuted, lineHeight: 20, marginBottom: Spacing.md },
  tips: { gap: Spacing.sm, marginBottom: Spacing.lg },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: FontSize.sm, color: colors.text, lineHeight: 20 },
  row: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flex: { flex: 1 },
  primaryButton: {
    backgroundColor: colors.primary, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm,
  },
  primaryText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  secondaryButton: {
    flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.sm,
  },
  secondaryText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.5 },
  hint: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: Spacing.sm, lineHeight: 18, textAlign: 'center' },
  section: { marginTop: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: colors.bgLight, borderWidth: 1, borderColor: colors.divider,
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  meta: { fontSize: FontSize.xs, color: colors.textMuted, lineHeight: 18, marginTop: 2 },
  undoButton: { paddingVertical: 6, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.danger },
  undoText: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
  waiting: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  waitingTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, textAlign: 'center' },
  tableCard: {
    padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: colors.bgLight, borderWidth: 1,
    borderColor: colors.divider, marginBottom: Spacing.md, gap: 6,
  },
  tableHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: colors.textSecondary || colors.textMuted, marginTop: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.divider },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: FontSize.sm, color: colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  smallChip: { paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.divider, maxWidth: 180 },
  smallChipText: { fontSize: FontSize.xs, color: colors.text },
  aiBadge: { fontSize: FontSize.xs, color: colors.primary, fontWeight: '600' },
  warningBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', padding: Spacing.sm, borderRadius: BorderRadius.sm, backgroundColor: colors.warning + '18' },
  summary: { gap: 2, marginTop: 4 },
  summaryLine: { fontSize: FontSize.sm, fontWeight: '700', color: colors.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingVertical: 4 },
  linkText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  fieldBlock: { gap: 4 },
  preview: { marginTop: 4, gap: 2 },
  previewRow: { fontSize: FontSize.xs, color: colors.text, lineHeight: 18 },
  doneIcon: { alignItems: 'center', marginBottom: Spacing.sm },
});
