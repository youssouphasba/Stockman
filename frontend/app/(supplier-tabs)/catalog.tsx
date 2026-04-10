import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supplierCatalog, CatalogProductData, CatalogProductCreate } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import CategorySubcategoryPicker from '../../components/CategorySubcategoryPicker';
import SupplierCatalogImportModal from '../../components/SupplierCatalogImportModal';

type PublicationStatus = 'draft' | 'ready' | 'published' | 'archived';
type FilterKey = 'all' | 'incomplete' | PublicationStatus;
type QuickEditRow = { catalog_id: string; name: string; price: string; stock: string; status: PublicationStatus };

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Tous' }, { key: 'incomplete', label: 'À compléter' }, { key: 'draft', label: 'Brouillons' },
  { key: 'ready', label: 'Prêts' }, { key: 'published', label: 'Publiés' }, { key: 'archived', label: 'Archivés' },
];
const STATUS_LABELS: Record<PublicationStatus, string> = { draft: 'Brouillon', ready: 'Prêt à publier', published: 'Publié', archived: 'Archivé' };
const ALL_STATUSES: PublicationStatus[] = ['draft', 'ready', 'published', 'archived'];

const getStatus = (p: CatalogProductData): PublicationStatus => {
  const raw = (p.publication_status || '').trim().toLowerCase();
  return raw === 'draft' || raw === 'ready' || raw === 'published' || raw === 'archived' ? raw : (p.available ? 'published' : 'draft');
};
const statusToAvailable = (status: PublicationStatus) => status === 'published';
const getIssues = (p: CatalogProductData) => [
  !p.category?.trim() ? 'Catégorie à compléter' : '',
  !p.price || p.price <= 0 ? 'Prix manquant' : '',
  (p.stock_available ?? 0) <= 0 ? 'Stock nul' : '',
  !p.description?.trim() ? 'Description à compléter' : '',
].filter(Boolean);

export default function SupplierCatalogScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<CatalogProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showActions, setShowActions] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CatalogProductData | null>(null);
  const [quickEditSearch, setQuickEditSearch] = useState('');
  const [quickEditRows, setQuickEditRows] = useState<QuickEditRow[]>([]);
  const [quickEditSavingId, setQuickEditSavingId] = useState<string | null>(null);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState(''); const [price, setPrice] = useState(''); const [unit, setUnit] = useState('pièce');
  const [minQty, setMinQty] = useState('1'); const [stock, setStock] = useState('0'); const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState(''); const [brand, setBrand] = useState(''); const [origin, setOrigin] = useState('');
  const [deliveryTime, setDeliveryTime] = useState(''); const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>('draft');

  const resetForm = useCallback(() => {
    setEditing(null); setName(''); setDescription(''); setCategory(''); setSubcategory(''); setPrice(''); setUnit('pièce'); setMinQty('1');
    setStock('0'); setSku(''); setBarcode(''); setBrand(''); setOrigin(''); setDeliveryTime(''); setPublicationStatus('draft');
  }, []);
  const fillForm = useCallback((p: CatalogProductData) => {
    setEditing(p); setName(p.name || ''); setDescription(p.description || ''); setCategory(p.category || ''); setSubcategory(p.subcategory || '');
    setPrice(p.price ? String(p.price) : ''); setUnit(p.unit || 'pièce'); setMinQty(String(p.min_order_quantity || 1)); setStock(String(p.stock_available || 0));
    setSku(p.sku || ''); setBarcode(p.barcode || ''); setBrand(p.brand || ''); setOrigin(p.origin || ''); setDeliveryTime(p.delivery_time || ''); setPublicationStatus(getStatus(p));
  }, []);

  const loadProducts = useCallback(async () => {
    try { setProducts(await supplierCatalog.list()); } catch { Alert.alert('Erreur', "Impossible de charger le catalogue fournisseur."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const counts = useMemo(() => products.reduce((acc, p) => { const status = getStatus(p); acc.all += 1; acc[status] += 1; if (getIssues(p).length) acc.incomplete += 1; return acc; }, { all: 0, incomplete: 0, draft: 0, ready: 0, published: 0, archived: 0 } as Record<FilterKey, number>), [products]);
  const filtered = useMemo(() => products.filter((p) => {
    const q = search.trim().toLowerCase();
    const inSearch = !q || [p.name, p.category, p.subcategory, p.brand, p.sku, p.barcode].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    const status = getStatus(p); const inFilter = filter === 'all' || (filter === 'incomplete' ? getIssues(p).length > 0 : status === filter); return inSearch && inFilter;
  }), [filter, products, search]);
  const quickEditFiltered = useMemo(() => quickEditRows.filter((row) => !quickEditSearch.trim() || row.name.toLowerCase().includes(quickEditSearch.trim().toLowerCase())), [quickEditRows, quickEditSearch]);

  function buildPayload(statusOverride?: PublicationStatus): CatalogProductCreate {
    const status = statusOverride || publicationStatus;
    return { name: name.trim(), description: description.trim(), category: category.trim(), subcategory: subcategory.trim(), price: parseFloat(price.replace(',', '.')) || 0, unit: unit.trim() || 'pièce', min_order_quantity: parseInt(minQty, 10) || 1, stock_available: parseInt(stock, 10) || 0, sku: sku.trim(), barcode: barcode.trim(), brand: brand.trim(), origin: origin.trim(), delivery_time: deliveryTime.trim(), publication_status: status, available: statusToAvailable(status) };
  }

  async function saveProduct(payload: CatalogProductCreate) {
    if (!payload.name?.trim()) return Alert.alert('Information manquante', 'Le nom du produit est obligatoire.');
    setSaving(true);
    try { editing ? await supplierCatalog.update(editing.catalog_id, payload) : await supplierCatalog.create(payload); setShowForm(false); resetForm(); await loadProducts(); }
    catch { Alert.alert('Erreur', "Impossible d'enregistrer ce produit."); } finally { setSaving(false); }
  }
  async function duplicateProduct(p: CatalogProductData) { try { await supplierCatalog.duplicate(p.catalog_id); await loadProducts(); Alert.alert('Produit dupliqué', 'Une copie brouillon a été créée.'); } catch { Alert.alert('Erreur', 'La duplication a échoué.'); } }
  async function updateStatus(p: CatalogProductData, nextStatus: PublicationStatus) { try { await supplierCatalog.update(p.catalog_id, { ...p, publication_status: nextStatus, available: statusToAvailable(nextStatus) }); await loadProducts(); } catch { Alert.alert('Erreur', 'Le changement de statut a échoué.'); } }
  async function deleteProduct(p: CatalogProductData) { Alert.alert('Supprimer le produit', `Voulez-vous vraiment supprimer "${p.name}" ?`, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await supplierCatalog.delete(p.catalog_id); await loadProducts(); } catch { Alert.alert('Erreur', 'La suppression a échoué.'); } } }]); }

  function openQuickEdit() { setQuickEditRows(products.map((p) => ({ catalog_id: p.catalog_id, name: p.name || '', price: String(p.price || 0), stock: String(p.stock_available || 0), status: getStatus(p) }))); setQuickEditSearch(''); setShowActions(false); setShowQuickEdit(true); }
  function updateQuickEditRow(catalogId: string, patch: Partial<QuickEditRow>) { setQuickEditRows((prev) => prev.map((row) => row.catalog_id === catalogId ? { ...row, ...patch } : row)); }
  async function saveQuickEditRow(catalogId: string) {
    const row = quickEditRows.find((item) => item.catalog_id === catalogId); const product = products.find((item) => item.catalog_id === catalogId); if (!row || !product) return;
    if (!row.name.trim()) return Alert.alert('Information manquante', 'Le nom du produit est obligatoire.');
    setQuickEditSavingId(catalogId);
    try { await supplierCatalog.update(catalogId, { ...product, name: row.name.trim(), price: parseFloat(row.price.replace(',', '.')) || 0, stock_available: parseInt(row.stock, 10) || 0, publication_status: row.status, available: statusToAvailable(row.status) }); await loadProducts(); }
    catch { Alert.alert('Erreur', "Impossible d'enregistrer cette ligne."); } finally { setQuickEditSavingId(null); }
  }

  if (loading) return <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.center}><ActivityIndicator size="large" color={colors.secondary} /></LinearGradient>;

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={colors.secondary} />}>
        <Text style={styles.title}>Mon catalogue</Text>
        <Text style={styles.subtitle}>Importez vos produits, créez des brouillons, modifiez vite vos fiches et publiez uniquement celles qui sont prêtes.</Text>
        <View style={styles.row}><TouchableOpacity style={[styles.cta, styles.ctaGhost]} onPress={() => setShowActions(true)}><Text style={[styles.ctaText, { color: colors.secondary }]}>Création rapide</Text></TouchableOpacity><TouchableOpacity style={styles.cta} onPress={() => { resetForm(); setShowForm(true); }}><Text style={styles.ctaText}>Nouveau produit</Text></TouchableOpacity></View>
        <View style={styles.row}><View style={styles.kpi}><Text style={styles.kpiValue}>{counts.draft}</Text><Text style={styles.kpiLabel}>Brouillons</Text></View><View style={styles.kpi}><Text style={styles.kpiValue}>{counts.incomplete}</Text><Text style={styles.kpiLabel}>À compléter</Text></View><View style={styles.kpi}><Text style={styles.kpiValue}>{counts.published}</Text><Text style={styles.kpiLabel}>Publiés</Text></View></View>
        <View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.textMuted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un produit" placeholderTextColor={colors.textMuted} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map((item) => { const active = filter === item.key; return <TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(item.key)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label} ({counts[item.key]})</Text></TouchableOpacity>; })}</ScrollView>

        {filtered.map((p) => { const status = getStatus(p); const issues = getIssues(p); return (
          <View key={p.catalog_id} style={styles.card}>
            <View style={[styles.badge, { backgroundColor: `${colors.secondary}15` }]}><Text style={styles.badgeText}>{STATUS_LABELS[status]}</Text></View>
            <View style={styles.cardTop}><Text style={styles.cardTitle}>{p.name}</Text><View style={styles.cardTopActions}><TouchableOpacity onPress={() => duplicateProduct(p)} style={styles.iconButton}><Ionicons name="copy-outline" size={18} color={colors.textSecondary} /></TouchableOpacity><TouchableOpacity onPress={() => { fillForm(p); setShowForm(true); }} style={styles.editButton}><Text style={styles.editButtonText}>Modifier</Text></TouchableOpacity></View></View>
            <Text style={styles.cardMeta}>{[p.category, p.brand, p.sku].filter(Boolean).join(' • ') || 'Aucune information secondaire'}</Text>
            {issues.length > 0 ? <Text style={styles.warning}>{issues.join(' • ')}</Text> : <Text style={styles.ok}>Fiche prête pour la publication.</Text>}
            <View style={styles.infoRow}><Text style={styles.info}>Prix : {(p.price || 0).toLocaleString()} {t('common.currency_short')}/{p.unit || 'pièce'}</Text><Text style={styles.info}>Stock : {p.stock_available || 0}</Text></View>
            <View style={styles.actionWrap}>{status === 'published' ? <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(p, 'archived')}><Text style={styles.smallBtnText}>Archiver</Text></TouchableOpacity> : <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(p, 'published')}><Text style={styles.smallBtnText}>Publier</Text></TouchableOpacity>}{status !== 'ready' && status !== 'published' ? <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(p, 'ready')}><Text style={styles.smallBtnText}>Marquer prêt</Text></TouchableOpacity> : null}<TouchableOpacity style={styles.smallDanger} onPress={() => deleteProduct(p)}><Text style={styles.smallDangerText}>Supprimer</Text></TouchableOpacity></View>
          </View>
        ); })}
        {filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Aucun produit</Text><Text style={styles.emptyText}>Commencez par importer un CSV, créer un produit ou reprendre vos brouillons.</Text></View> : null}
      </ScrollView>

      {showActions && <Modal visible={showActions} animationType="slide" transparent onRequestClose={() => setShowActions(false)}><View style={styles.modalBg}><View style={styles.modal}><Text style={styles.modalTitle}>Création rapide</Text><Text style={styles.modalSubtitle}>Choisissez l’action rapide utile pour votre catalogue fournisseur.</Text>{[
        { icon: 'cloud-upload-outline', title: 'Importer un CSV', text: 'Créer plusieurs fiches produit en une seule fois.', onPress: () => { setShowActions(false); setShowImportModal(true); } },
        { icon: 'add-circle-outline', title: 'Créer un produit', text: 'Ouvrir la fiche complète pour un nouveau produit.', onPress: () => { resetForm(); setShowActions(false); setShowForm(true); } },
        { icon: 'create-outline', title: 'Édition rapide', text: 'Modifier vite les prix, le stock et le statut.', onPress: openQuickEdit },
        { icon: 'document-outline', title: 'Voir les brouillons', text: 'Reprendre les fiches encore en préparation.', onPress: () => { setFilter('draft'); setShowActions(false); } },
        { icon: 'checkmark-done-outline', title: 'Voir les fiches prêtes', text: 'Retrouver les produits prêts à être publiés.', onPress: () => { setFilter('ready'); setShowActions(false); } },
      ].map((action) => <TouchableOpacity key={action.title} style={styles.actionCard} onPress={action.onPress}><View style={styles.actionIcon}><Ionicons name={action.icon as any} size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionText}>{action.text}</Text></View></TouchableOpacity>)}</View></View></Modal>}

      {showQuickEdit && <Modal visible={showQuickEdit} animationType="slide" transparent onRequestClose={() => setShowQuickEdit(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Édition rapide</Text><TouchableOpacity onPress={() => setShowQuickEdit(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><TextInput style={styles.input} value={quickEditSearch} onChangeText={setQuickEditSearch} placeholder="Rechercher dans l'édition rapide" placeholderTextColor={colors.textMuted} /><ScrollView contentContainerStyle={styles.modalContent}>{quickEditFiltered.map((row) => <View key={row.catalog_id} style={styles.quickCard}><TextInput style={styles.input} value={row.name} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { name: value })} placeholder="Nom" placeholderTextColor={colors.textMuted} /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={row.price} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { price: value })} placeholder="Prix" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={row.stock} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { stock: value })} placeholder="Stock" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{ALL_STATUSES.map((status) => { const active = row.status === status; return <TouchableOpacity key={status} style={[styles.chip, active && styles.chipActive]} onPress={() => updateQuickEditRow(row.catalog_id, { status })}><Text style={[styles.chipText, active && styles.chipTextActive]}>{STATUS_LABELS[status]}</Text></TouchableOpacity>; })}</ScrollView><TouchableOpacity style={styles.cta} onPress={() => saveQuickEditRow(row.catalog_id)} disabled={quickEditSavingId === row.catalog_id}>{quickEditSavingId === row.catalog_id ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Enregistrer</Text>}</TouchableOpacity></View>)}</ScrollView></View></View></Modal>}

      {showForm && <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><ScrollView contentContainerStyle={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? 'Modifier le produit' : 'Nouveau produit'}</Text><TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom du produit" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} /><CategorySubcategoryPicker selectedCategory={category} selectedSubcategory={subcategory} onSelect={(cat, sub) => { setCategory(cat); setSubcategory(sub); }} /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={sku} onChangeText={setSku} placeholder="SKU" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={barcode} onChangeText={setBarcode} placeholder="Code-barres" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={brand} onChangeText={setBrand} placeholder="Marque" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={origin} onChangeText={setOrigin} placeholder="Origine" placeholderTextColor={colors.textMuted} /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={price} onChangeText={setPrice} placeholder="Prix" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={unit} onChangeText={setUnit} placeholder="Unité" placeholderTextColor={colors.textMuted} /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={minQty} onChangeText={setMinQty} placeholder="Quantité minimale" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={stock} onChangeText={setStock} placeholder="Stock disponible" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><TextInput style={styles.input} value={deliveryTime} onChangeText={setDeliveryTime} placeholder="Délai de livraison" placeholderTextColor={colors.textMuted} /><Text style={styles.sectionLabel}>Statut de publication</Text><View style={styles.filters}>{ALL_STATUSES.map((item) => { const active = publicationStatus === item; return <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setPublicationStatus(item)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{STATUS_LABELS[item]}</Text></TouchableOpacity>; })}</View><TouchableOpacity style={styles.cta} disabled={saving} onPress={() => saveProduct(buildPayload())}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{editing ? 'Enregistrer les changements' : 'Créer le produit'}</Text>}</TouchableOpacity></ScrollView></View></View></Modal>}

      <SupplierCatalogImportModal visible={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={loadProducts} />
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, content: { padding: Spacing.md, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  title: { color: colors.text, fontSize: FontSize.xl, fontWeight: '800' }, subtitle: { color: colors.textSecondary, marginTop: 6, marginBottom: Spacing.md, lineHeight: 20 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }, infoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 8, marginBottom: 4 }, actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  cta: { flex: 1, minHeight: 46, borderRadius: BorderRadius.lg, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md }, ctaGhost: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.secondary }, ctaText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  kpi: { flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' }, kpiValue: { color: colors.text, fontWeight: '800', fontSize: FontSize.xl }, kpiLabel: { color: colors.textMuted, marginTop: 4, fontSize: FontSize.xs, textAlign: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm }, searchInput: { flex: 1, color: colors.text },
  filters: { gap: 8, paddingVertical: 6, paddingRight: Spacing.md, flexDirection: 'row', flexWrap: 'wrap' }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, marginRight: 8, marginBottom: 8 }, chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary }, chipText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  card: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm }, badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginBottom: 8 }, badgeText: { color: colors.secondary, fontSize: FontSize.xs, fontWeight: '700' }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, cardTitle: { flex: 1, color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, cardMeta: { color: colors.textMuted, marginTop: 6, fontSize: FontSize.xs }, cardTopActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, iconButton: { padding: 6 }, editButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.secondary, backgroundColor: `${colors.secondary}15` }, editButtonText: { color: colors.secondary, fontSize: FontSize.xs, fontWeight: '700' },
  warning: { color: colors.warning || '#F59E0B', marginTop: 8, fontSize: FontSize.xs, lineHeight: 18 }, ok: { color: colors.success, marginTop: 8, fontSize: FontSize.xs, fontWeight: '600' }, info: { flex: 1, color: colors.textSecondary, fontSize: FontSize.xs },
  smallBtn: { borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallBtnText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' }, smallDanger: { borderWidth: 1, borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallDangerText: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl }, emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'flex-end' }, modal: { backgroundColor: colors.bgDark, padding: Spacing.md, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl }, modalLarge: { backgroundColor: colors.bgDark, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '92%' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }, modalContent: { padding: Spacing.md, paddingBottom: Spacing.xl }, modalTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.xs }, modalSubtitle: { color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  actionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider }, actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20`, marginTop: 2 }, actionTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, actionText: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, lineHeight: 20 },
  quickCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  input: { flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, color: colors.text, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm }, half: { flex: 1 }, multiline: { minHeight: 84, textAlignVertical: 'top' }, sectionLabel: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, marginTop: 4 },
});
