import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supplierCatalog, CatalogProductCreate, CatalogProductData } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import CategorySubcategoryPicker from '../../components/CategorySubcategoryPicker';
import SupplierCatalogImportModal from '../../components/SupplierCatalogImportModal';
import i18n from '../../services/i18n';

type VisibilityFilter = 'all' | 'needs_attention' | 'visible' | 'hidden';
type PublicationStatus = 'draft' | 'published';
type QuickEditRow = { catalog_id: string; name: string; price: string; stock: string; available: boolean };
type TextImportDraft = { name: string; price: number; stock_available: number; unit: string; category: string; description: string };

const FILTERS: Array<{ key: VisibilityFilter; label: string }> = [
  { key: 'all', get label() { return i18n.t('supplier_catalog_screen.tous', { defaultValue: "Tous" }); } },
  { key: 'needs_attention', get label() { return i18n.t('supplier_catalog_screen.a_corriger', { defaultValue: "A corriger" }); } },
  { key: 'visible', get label() { return i18n.t('supplier_catalog_screen.visibles', { defaultValue: "Visibles" }); } },
  { key: 'hidden', get label() { return i18n.t('supplier_catalog_screen.masques', { defaultValue: "Masqués" }); } },
];

const isVisibleProduct = (product: CatalogProductData) => Boolean(product.available || product.publication_status === 'published');
const deriveStatus = (available: boolean): PublicationStatus => (available ? 'published' : 'draft');
const parseDecimal = (value: string) => Number.parseFloat(value.replace(',', '.')) || 0;
const parseInteger = (value: string) => Number.parseInt(value, 10) || 0;

function getIssues(product: CatalogProductData) {
  return [
    !product.category?.trim() ? i18n.t('supplier_catalog_screen.issue_category', { defaultValue: 'Catégorie manquante' }) : '',
    !product.price || product.price <= 0 ? i18n.t('supplier_catalog_screen.issue_price', { defaultValue: 'Prix manquant' }) : '',
    (product.stock_available ?? 0) < 0 ? i18n.t('supplier_catalog_screen.issue_stock', { defaultValue: 'Stock invalide' }) : '',
    !product.description?.trim() ? i18n.t('supplier_catalog_screen.issue_description', { defaultValue: 'Description à compléter' }) : '',
  ].filter(Boolean);
}

function parseTextDraft(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const drafts: TextImportDraft[] = [];
  const errors: string[] = [];
  lines.forEach((line, index) => {
    const parts = (line.includes('\t') ? line.split('\t') : line.split(';')).map((part) => part.trim());
    if (!parts[0]) {
      errors.push(i18n.t('supplier_catalog_screen.line_name_required', { line: index + 1, defaultValue: 'Ligne {{line}} : le nom du produit est obligatoire.' }));
      return;
    }
    const [name, priceRaw = '', stockRaw = '', unit = 'piece', category = '', ...descriptionParts] = parts;
    drafts.push({
      name,
      price: parseDecimal(priceRaw),
      stock_available: parseInteger(stockRaw),
      unit: unit || 'piece',
      category,
      description: descriptionParts.join('; ').trim(),
    });
  });
  return { drafts, errors };
}

export default function SupplierCatalogScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<CatalogProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VisibilityFilter>('all');
  const [showActions, setShowActions] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [editing, setEditing] = useState<CatalogProductData | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quickEditSearch, setQuickEditSearch] = useState('');
  const [quickEditRows, setQuickEditRows] = useState<QuickEditRow[]>([]);
  const [quickEditSourceLabel, setQuickEditSourceLabel] = useState('liste visible');
  const [textImportValue, setTextImportValue] = useState('');
  const [textImportSaving, setTextImportSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('piece');
  const [minQty, setMinQty] = useState('1');
  const [stock, setStock] = useState('0');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [origin, setOrigin] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const resetForm = useCallback(() => {
    setEditing(null); setName(''); setDescription(''); setCategory(''); setSubcategory(''); setPrice(''); setUnit('piece'); setMinQty('1'); setStock('0'); setSku(''); setBarcode(''); setBrand(''); setOrigin(''); setDeliveryTime(''); setIsVisible(true);
  }, []);

  const fillForm = useCallback((product: CatalogProductData) => {
    setEditing(product); setName(product.name || ''); setDescription(product.description || ''); setCategory(product.category || ''); setSubcategory(product.subcategory || ''); setPrice(product.price ? String(product.price) : ''); setUnit(product.unit || 'piece'); setMinQty(String(product.min_order_quantity || 1)); setStock(String(product.stock_available || 0)); setSku(product.sku || ''); setBarcode(product.barcode || ''); setBrand(product.brand || ''); setOrigin(product.origin || ''); setDeliveryTime(product.delivery_time || ''); setIsVisible(isVisibleProduct(product));
  }, []);

  const loadProducts = useCallback(async () => {
    try { setProducts(await supplierCatalog.list()); } catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.impossible_de_charger_le_catalogue_fournisseur')); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const counts = useMemo(() => {
    const visible = products.filter(isVisibleProduct).length;
    const needsAttention = products.filter((product) => getIssues(product).length > 0).length;
    return { all: products.length, needs_attention: needsAttention, visible, hidden: Math.max(products.length - visible, 0) };
  }, [products]);

  const filtered = useMemo(() => products.filter((product) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [product.name, product.category, product.subcategory, product.brand, product.sku, product.barcode].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    const visible = isVisibleProduct(product);
    const matchesFilter = filter === 'all' || (filter === 'needs_attention' && getIssues(product).length > 0) || (filter === 'visible' && visible) || (filter === 'hidden' && !visible);
    return matchesSearch && matchesFilter;
  }), [filter, products, search]);

  const selectedProducts = useMemo(() => products.filter((product) => selectedSet.has(product.catalog_id)), [products, selectedSet]);
  const quickEditFiltered = useMemo(() => !quickEditSearch.trim() ? quickEditRows : quickEditRows.filter((row) => row.name.toLowerCase().includes(quickEditSearch.trim().toLowerCase())), [quickEditRows, quickEditSearch]);
  const textImportPreview = useMemo(() => parseTextDraft(textImportValue), [textImportValue]);

  function buildPayload(): CatalogProductCreate {
    return { name: name.trim(), description: description.trim(), category: category.trim(), subcategory: subcategory.trim(), price: parseDecimal(price), unit: unit.trim() || 'piece', min_order_quantity: parseInteger(minQty) || 1, stock_available: parseInteger(stock), sku: sku.trim(), barcode: barcode.trim(), brand: brand.trim(), origin: origin.trim(), delivery_time: deliveryTime.trim(), available: isVisible, publication_status: deriveStatus(isVisible) };
  }

  async function saveProduct(payload: CatalogProductCreate) {
    if (!payload.name?.trim()) return Alert.alert(t('supplier_catalog_screen.information_manquante'), t('supplier_catalog_screen.le_nom_du_produit_est_obligatoire'));
    setSaving(true);
    try { editing ? await supplierCatalog.update(editing.catalog_id, payload) : await supplierCatalog.create(payload); setShowForm(false); resetForm(); await loadProducts(); }
    catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.impossible_d_enregistrer_ce_produit')); } finally { setSaving(false); }
  }

  async function duplicateProduct(product: CatalogProductData) {
    try { await supplierCatalog.duplicate(product.catalog_id); await loadProducts(); Alert.alert(t('supplier_catalog_screen.produit_duplique'), t('supplier_catalog_screen.une_copie_a_bien_ete_creee')); }
    catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.la_duplication_a_echoue')); }
  }

  async function updateVisibility(product: CatalogProductData, available: boolean) {
    try { await supplierCatalog.update(product.catalog_id, { ...product, available, publication_status: deriveStatus(available) }); await loadProducts(); }
    catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.la_mise_a_jour_de_la')); }
  }

  async function deleteProduct(product: CatalogProductData) {
    Alert.alert(t('supplier_catalog_screen.supprimer_le_produit'), `Voulez-vous vraiment supprimer "${product.name}" ?`, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await supplierCatalog.delete(product.catalog_id); await loadProducts(); } catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.la_suppression_a_echoue')); } } }]);
  }

  function openQuickEdit(source: 'selected' | 'filtered' | 'all' = 'filtered') {
    const sourceProducts = source === 'selected' ? selectedProducts : source === 'all' ? products : filtered;
    if (!sourceProducts.length) return Alert.alert(t('supplier_catalog_screen.aucun_produit'), t('supplier_catalog_screen.aucun_produit_n_est_disponible_pour'));
    setQuickEditRows(sourceProducts.map((product) => ({ catalog_id: product.catalog_id, name: product.name || '', price: String(product.price || 0), stock: String(product.stock_available || 0), available: isVisibleProduct(product) })));
    setQuickEditSourceLabel(source === 'selected' ? t('supplier_catalog_screen.selected_count', { count: sourceProducts.length }) : source === 'all' ? t('supplier_catalog_screen.tout_le_catalogue') : t('supplier_catalog_screen.la_liste_visible'));
    setQuickEditSearch(''); setShowActions(false); setShowQuickEdit(true);
  }

  function updateQuickEditRow(catalogId: string, patch: Partial<QuickEditRow>) {
    setQuickEditRows((prev) => prev.map((row) => row.catalog_id === catalogId ? { ...row, ...patch } : row));
  }

  async function saveQuickEditRows() {
    if (!quickEditRows.length) return;
    setBulkSaving(true);
    try {
      await supplierCatalog.bulkUpdate(
        quickEditRows.map((row) => ({
          catalog_id: row.catalog_id,
          name: row.name.trim(),
          price: parseDecimal(row.price),
          stock_available: parseInteger(row.stock),
          available: row.available,
        })),
      );
      setShowQuickEdit(false); await loadProducts(); Alert.alert(t('supplier_catalog_screen.edition_rapide'), t('supplier_catalog_screen.les_produits_ont_ete_mis_a'));
    } catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.impossible_d_enregistrer_toutes_les_modification')); }
    finally { setBulkSaving(false); }
  }

  function toggleSelectionMode() { setSelectionMode((prev) => { const next = !prev; if (!next) setSelectedIds([]); return next; }); setShowActions(false); }
  function toggleSelectedProduct(catalogId: string) { setSelectedIds((prev) => prev.includes(catalogId) ? prev.filter((id) => id !== catalogId) : [...prev, catalogId]); }
  function selectAllFiltered() { setSelectedIds(filtered.map((product) => product.catalog_id)); }
  function clearSelection() { setSelectedIds([]); }

  async function updateSelectedVisibility(available: boolean) {
    if (!selectedProducts.length) return;
    setBulkSaving(true);
    try { await supplierCatalog.bulkUpdate(selectedProducts.map((product) => ({ catalog_id: product.catalog_id, available }))); clearSelection(); setSelectionMode(false); await loadProducts(); Alert.alert(t('supplier_catalog_screen.selection_multiple'), available ? t('supplier_catalog_screen.les_produits_sont_maintenant_visibles') : t('supplier_catalog_screen.les_produits_sont_maintenant_masques')); }
    catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.la_mise_a_jour_en_lot')); } finally { setBulkSaving(false); }
  }

  async function deleteSelectedProducts() {
    if (!selectedProducts.length) return;
    Alert.alert(t('supplier_catalog_screen.supprimer_la_selection'), `Voulez-vous supprimer ${selectedProducts.length} produit(s) ?`, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { setBulkSaving(true); try { await supplierCatalog.bulkDelete(selectedProducts.map((product) => product.catalog_id)); clearSelection(); setSelectionMode(false); await loadProducts(); Alert.alert(t('supplier_catalog_screen.selection_multiple'), t('supplier_catalog_screen.les_produits_selectionnes_ont_ete_supprimes')); } catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.la_suppression_en_lot_a_echoue')); } finally { setBulkSaving(false); } } }]);
  }

  async function createProductsFromText() {
    const { drafts, errors } = parseTextDraft(textImportValue);
    if (!drafts.length || errors.length) return Alert.alert(t('supplier_catalog_screen.import_texte'), errors[0] || t('supplier_catalog_screen.ajoutez_au_moins_une_ligne_valide'));
    setTextImportSaving(true);
    try { await supplierCatalog.bulkCreate(drafts.map((draft) => ({ name: draft.name, description: draft.description, category: draft.category, price: draft.price, stock_available: draft.stock_available, unit: draft.unit || 'pièce', available: true, publication_status: 'published' }))); setTextImportValue(''); setShowTextImport(false); await loadProducts(); Alert.alert(t('supplier_catalog_screen.creation_par_texte'), t('supplier_catalog_screen.created_count', { count: drafts.length })); }
    catch { Alert.alert(t('supplier_catalog_screen.erreur'), t('supplier_catalog_screen.la_creation_des_produits_a_partir')); } finally { setTextImportSaving(false); }
  }

  if (loading) return <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.center}><ActivityIndicator size="large" color={colors.secondary} /></LinearGradient>;

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={colors.secondary} />}>
        <Text style={styles.title}>{t('supplier_catalog_screen.catalogue_fournisseur')}</Text>
        <Text style={styles.subtitle}>{t('supplier_catalog_screen.retrouvez_les_usages_essentiels_du_compte')}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.cta, styles.ctaGhost]} onPress={() => setShowActions(true)}><Text style={[styles.ctaText, { color: colors.secondary }]}>{t('supplier_catalog_screen.actions_rapides')}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cta} onPress={() => { resetForm(); setShowForm(true); }}><Text style={styles.ctaText}>{t('supplier_catalog_screen.nouveau_produit')}</Text></TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.secondaryAction, selectionMode && styles.secondaryActionActive]} onPress={toggleSelectionMode}>
            <Ionicons name={selectionMode ? 'checkbox-outline' : 'square-outline'} size={16} color={selectionMode ? '#fff' : colors.textSecondary} />
            <Text style={[styles.secondaryActionText, selectionMode && styles.secondaryActionTextActive]}>{selectionMode ? t('supplier_catalog_screen.quitter_la_selection') : t('supplier_catalog_screen.selection_multiple')}</Text>
          </TouchableOpacity>
          {selectionMode ? <TouchableOpacity style={styles.secondaryAction} onPress={selectAllFiltered}><Ionicons name="checkmark-done-outline" size={16} color={colors.textSecondary} /><Text style={styles.secondaryActionText}>{t('supplier_catalog_screen.tout_selectionner')}</Text></TouchableOpacity> : null}
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.all}</Text><Text style={styles.kpiLabel}>{t('supplier_catalog_screen.produits')}</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.needs_attention}</Text><Text style={styles.kpiLabel}>{t('supplier_catalog_screen.a_corriger')}</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.visible}</Text><Text style={styles.kpiLabel}>{t('supplier_catalog_screen.visibles')}</Text></View>
        </View>
        <View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.textMuted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder={t('supplier_catalog_screen.rechercher_un_produit')} placeholderTextColor={colors.textMuted} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => { const active = filter === item.key; return <TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(item.key)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label} ({counts[item.key]})</Text></TouchableOpacity>; })}
        </ScrollView>
        {selectionMode ? <View style={styles.infoBanner}><Text style={styles.infoBannerTitle}>{selectedIds.length ? t('supplier_catalog_screen.selected_count', { count: selectedIds.length }) : t('supplier_catalog_screen.selectionnez_un_ou_plusieurs_produits')}</Text><Text style={styles.infoBannerText}>{t('supplier_catalog_screen.utilisez_ensuite_la_barre_d_actions')}</Text></View> : null}
        {filtered.map((product) => {
          const issues = getIssues(product);
          const visible = isVisibleProduct(product);
          const selected = selectedSet.has(product.catalog_id);
          return (
            <TouchableOpacity key={product.catalog_id} activeOpacity={selectionMode ? 0.85 : 1} onPress={() => { if (selectionMode) toggleSelectedProduct(product.catalog_id); }} style={[styles.card, selectionMode && selected && styles.cardSelected]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  {selectionMode ? <TouchableOpacity style={[styles.checkbox, selected && styles.checkboxActive]} onPress={() => toggleSelectedProduct(product.catalog_id)}>{selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}</TouchableOpacity> : null}
                  <View style={[styles.badge, visible ? styles.badgeVisible : styles.badgeHidden]}><Text style={[styles.badgeText, visible ? styles.badgeTextVisible : styles.badgeTextHidden]}>{visible ? 'Visible' : t('supplier_catalog_screen.masque')}</Text></View>
                </View>
                <View style={styles.cardTopActions}>
                  <TouchableOpacity onPress={() => duplicateProduct(product)} style={styles.iconButton}><Ionicons name="copy-outline" size={18} color={colors.textSecondary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => { fillForm(product); setShowForm(true); }} style={styles.editButton}><Text style={styles.editButtonText}>{t('supplier_catalog_screen.modifier')}</Text></TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardMeta}>{[product.category, product.brand, product.sku].filter(Boolean).join(' - ') || t('supplier_catalog_screen.aucune_information_secondaire')}</Text>
              {issues.length > 0 ? <Text style={styles.warning}>{issues.join(' - ')}</Text> : <Text style={styles.ok}>{t('supplier_catalog_screen.fiche_complete_et_exploitable')}</Text>}
              <View style={styles.infoRow}><Text style={styles.info}>{t('supplier_catalog_screen.prix')} {(product.price || 0).toLocaleString()} {t('common.currency_short')}/{product.unit || 'piece'}</Text><Text style={styles.info}>{t('supplier_catalog_screen.stock')} {product.stock_available || 0}</Text></View>
              {!selectionMode ? <View style={styles.actionWrap}><TouchableOpacity style={styles.smallBtn} onPress={() => updateVisibility(product, !visible)}><Text style={styles.smallBtnText}>{visible ? 'Masquer' : 'Rendre visible'}</Text></TouchableOpacity><TouchableOpacity style={styles.smallDanger} onPress={() => deleteProduct(product)}><Text style={styles.smallDangerText}>{t('supplier_catalog_screen.supprimer')}</Text></TouchableOpacity></View> : null}
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>{t('supplier_catalog_screen.aucun_produit')}</Text><Text style={styles.emptyText}>{t('supplier_catalog_screen.commencez_par_importer_un_csv_creer')}</Text></View> : null}
      </ScrollView>

      {selectionMode ? <View style={styles.selectionBar}><View style={styles.selectionSummary}><Text style={styles.selectionCount}>{selectedIds.length || 0} {t('supplier_catalog_screen.selectionne_s')}</Text><TouchableOpacity onPress={clearSelection}><Text style={styles.selectionClear}>{t('supplier_catalog_screen.effacer')}</Text></TouchableOpacity></View><View style={styles.selectionActions}><TouchableOpacity style={[styles.selectionButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={() => openQuickEdit('selected')}><Text style={styles.selectionButtonText}>{t('supplier_catalog_screen.prix_et_stock')}</Text></TouchableOpacity><TouchableOpacity style={[styles.selectionButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={() => updateSelectedVisibility(true)}><Text style={styles.selectionButtonText}>{t('supplier_catalog_screen.visible')}</Text></TouchableOpacity><TouchableOpacity style={[styles.selectionButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={() => updateSelectedVisibility(false)}><Text style={styles.selectionButtonText}>{t('supplier_catalog_screen.masquer')}</Text></TouchableOpacity><TouchableOpacity style={[styles.selectionDangerButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={deleteSelectedProducts}><Text style={styles.selectionDangerButtonText}>{t('supplier_catalog_screen.supprimer')}</Text></TouchableOpacity></View></View> : null}

      {showActions ? <Modal visible={showActions} animationType="slide" transparent onRequestClose={() => setShowActions(false)}><View style={styles.modalBg}><View style={styles.modal}><Text style={styles.modalTitle}>{t('supplier_catalog_screen.actions_rapides')}</Text><Text style={styles.modalSubtitle}>{t('supplier_catalog_screen.ce_menu_regroupe_maintenant_les_vraies')}</Text>{[
        { icon: 'cloud-upload-outline', title: t('supplier_catalog_screen.importer_un_csv'), text: t('supplier_catalog_screen.importer_plusieurs_produits_a_partir_d'), onPress: () => { setShowActions(false); setShowImportModal(true); } },
        { icon: 'document-text-outline', title: t('supplier_catalog_screen.creation_par_texte'), text: t('supplier_catalog_screen.coller_plusieurs_lignes_au_format_nom'), onPress: () => { setShowActions(false); setShowTextImport(true); } },
        { icon: 'create-outline', title: t('supplier_catalog_screen.edition_rapide'), text: t('supplier_catalog_screen.modifier_en_lot_les_prix_les'), onPress: () => openQuickEdit('filtered') },
        { icon: 'checkbox-outline', title: t('supplier_catalog_screen.selection_multiple'), text: t('supplier_catalog_screen.selectionner_plusieurs_produits_puis_agir_en'), onPress: toggleSelectionMode },
        { icon: 'add-circle-outline', title: t('supplier_catalog_screen.nouveau_produit'), text: t('supplier_catalog_screen.ouvrir_la_fiche_complete_comme_sur'), onPress: () => { resetForm(); setShowActions(false); setShowForm(true); } },
      ].map((action) => <TouchableOpacity key={action.title} style={styles.actionCard} onPress={action.onPress}><View style={styles.actionIcon}><Ionicons name={action.icon as any} size={20} color={colors.primary} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionText}>{action.text}</Text></View></TouchableOpacity>)}</View></View></Modal> : null}

      {showQuickEdit ? <Modal visible={showQuickEdit} animationType="slide" transparent onRequestClose={() => setShowQuickEdit(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('supplier_catalog_screen.edition_rapide')}</Text><TouchableOpacity onPress={() => setShowQuickEdit(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><View style={styles.modalContent}><Text style={styles.modalSubtitle}>{t('supplier_catalog_screen.cette_vue_sert_a_corriger_rapidement')} {quickEditSourceLabel}.</Text><View style={styles.helperCard}><Text style={styles.helperTitle}>{t('supplier_catalog_screen.comment_remplir_cette_modale')}</Text><Text style={styles.helperText}>{t('supplier_catalog_screen.nom_intitule_du_produit_tel_qu')}</Text><Text style={styles.helperText}>{t('supplier_catalog_screen.prix_montant_de_vente_du_produit')}</Text><Text style={styles.helperText}>{t('supplier_catalog_screen.stock_quantite_actuellement_disponible_a_la')}</Text><Text style={styles.helperText}>{t('supplier_catalog_screen.visible_ou_masque_choisissez_si_le')}</Text></View><Text style={styles.fieldLabel}>{t('supplier_catalog_screen.recherche_dans_la_liste_a_corriger')}</Text><TextInput style={styles.input} value={quickEditSearch} onChangeText={setQuickEditSearch} placeholder={t('supplier_catalog_screen.rechercher_un_produit_a_modifier')} placeholderTextColor={colors.textMuted} /><ScrollView contentContainerStyle={styles.quickEditList}>{quickEditFiltered.map((row) => <View key={row.catalog_id} style={styles.quickCard}><Text style={styles.quickCardTitle}>{row.name || t('supplier_catalog_screen.produit_sans_nom')}</Text><Text style={styles.fieldLabel}>{t('supplier_catalog_screen.nom_du_produit')}</Text><TextInput style={styles.input} value={row.name} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { name: value })} placeholder={t('supplier_catalog_screen.exemple_paracetamol_500')} placeholderTextColor={colors.textMuted} /><View style={styles.row}><View style={styles.half}><Text style={styles.fieldLabel}>{t('supplier_catalog_screen.prix_de_vente')}</Text><TextInput style={styles.input} value={row.price} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { price: value })} placeholder={t('supplier_catalog_screen.exemple_1200')} placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><View style={styles.half}><Text style={styles.fieldLabel}>{t('supplier_catalog_screen.stock_disponible')}</Text><TextInput style={styles.input} value={row.stock} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { stock: value })} placeholder={t('supplier_catalog_screen.exemple_25')} placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View></View><Text style={styles.fieldLabel}>{t('supplier_catalog_screen.visibilite_dans_le_catalogue')}</Text><View style={styles.visibilityRow}><TouchableOpacity style={[styles.visibilityButton, row.available && styles.visibilityButtonActive]} onPress={() => updateQuickEditRow(row.catalog_id, { available: true })}><Text style={[styles.visibilityButtonText, row.available && styles.visibilityButtonTextActive]}>{t('supplier_catalog_screen.visible')}</Text></TouchableOpacity><TouchableOpacity style={[styles.visibilityButton, !row.available && styles.visibilityButtonActive]} onPress={() => updateQuickEditRow(row.catalog_id, { available: false })}><Text style={[styles.visibilityButtonText, !row.available && styles.visibilityButtonTextActive]}>{t('supplier_catalog_screen.masque')}</Text></TouchableOpacity></View></View>)}</ScrollView><TouchableOpacity style={styles.cta} onPress={saveQuickEditRows} disabled={bulkSaving}>{bulkSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{t('supplier_catalog_screen.enregistrer_toutes_les_modifications')}</Text>}</TouchableOpacity></View></View></View></Modal> : null}

      {showTextImport ? <Modal visible={showTextImport} animationType="slide" transparent onRequestClose={() => setShowTextImport(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('supplier_catalog_screen.creation_par_texte')}</Text><TouchableOpacity onPress={() => setShowTextImport(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><ScrollView contentContainerStyle={styles.modalContent}><Text style={styles.modalSubtitle}>{t('supplier_catalog_screen.collez_une_ligne_par_produit_format')}{'\n'}{t('supplier_catalog_screen.nom_prix_stock_unite_categorie_description')}{'\n\n'}{t('supplier_catalog_screen.exemple')}{'\n'}{t('supplier_catalog_screen.paracetamol_500_1200_25_boite_antalgique')}</Text><TextInput style={[styles.input, styles.multiline]} value={textImportValue} onChangeText={setTextImportValue} placeholder={t('supplier_catalog_screen.une_ligne_par_produit')} placeholderTextColor={colors.textMuted} multiline numberOfLines={8} /><View style={styles.previewCard}><Text style={styles.previewTitle}>{t('supplier_catalog_screen.apercu_avant_creation')}</Text><Text style={styles.previewText}>{t('supplier_catalog_screen.produits_detectes')} {textImportPreview.drafts.length}</Text>{textImportPreview.errors.length ? <Text style={styles.previewError}>{textImportPreview.errors[0]}</Text> : <Text style={styles.previewText}>{t('supplier_catalog_screen.les_produits_crees_par_texte_deviennent')}</Text>}</View><TouchableOpacity style={styles.cta} onPress={createProductsFromText} disabled={!textImportValue.trim() || textImportSaving}>{textImportSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{t('supplier_catalog_screen.creer_les_produits')}</Text>}</TouchableOpacity></ScrollView></View></View></Modal> : null}

      {showForm ? <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><ScrollView contentContainerStyle={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? t('supplier_catalog_screen.modifier_le_produit') : t('supplier_catalog_screen.nouveau_produit')}</Text><TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><Text style={styles.modalSubtitle}>{t('supplier_catalog_screen.cette_fiche_reprend_les_champs_essentiels')}</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('supplier_catalog_screen.nom_du_produit')} placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder={t('supplier_catalog_screen.description')} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} /><CategorySubcategoryPicker selectedCategory={category} selectedSubcategory={subcategory} onSelect={(selectedCategoryValue, selectedSubcategoryValue) => { setCategory(selectedCategoryValue); setSubcategory(selectedSubcategoryValue); }} /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={sku} onChangeText={setSku} placeholder={t('supplier_catalog_screen.sku')} placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={barcode} onChangeText={setBarcode} placeholder={t('supplier_catalog_screen.code_barres')} placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={brand} onChangeText={setBrand} placeholder={t('supplier_catalog_screen.marque')} placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={origin} onChangeText={setOrigin} placeholder={t('supplier_catalog_screen.origine')} placeholderTextColor={colors.textMuted} /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={price} onChangeText={setPrice} placeholder={t('supplier_catalog_screen.prix_2')} placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={unit} onChangeText={setUnit} placeholder={t('supplier_catalog_screen.unite')} placeholderTextColor={colors.textMuted} /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={minQty} onChangeText={setMinQty} placeholder={t('supplier_catalog_screen.quantite_minimale')} placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={stock} onChangeText={setStock} placeholder={t('supplier_catalog_screen.stock_disponible')} placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><TextInput style={styles.input} value={deliveryTime} onChangeText={setDeliveryTime} placeholder={t('supplier_catalog_screen.delai_de_livraison')} placeholderTextColor={colors.textMuted} /><Text style={styles.sectionLabel}>{t('supplier_catalog_screen.visibilite_dans_le_catalogue')}</Text><View style={styles.visibilityRow}><TouchableOpacity style={[styles.visibilityButton, isVisible && styles.visibilityButtonActive]} onPress={() => setIsVisible(true)}><Text style={[styles.visibilityButtonText, isVisible && styles.visibilityButtonTextActive]}>{t('supplier_catalog_screen.visible')}</Text></TouchableOpacity><TouchableOpacity style={[styles.visibilityButton, !isVisible && styles.visibilityButtonActive]} onPress={() => setIsVisible(false)}><Text style={[styles.visibilityButtonText, !isVisible && styles.visibilityButtonTextActive]}>{t('supplier_catalog_screen.masque')}</Text></TouchableOpacity></View><TouchableOpacity style={styles.cta} disabled={saving} onPress={() => saveProduct(buildPayload())}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{editing ? t('supplier_catalog_screen.enregistrer_les_changements') : t('supplier_catalog_screen.creer_le_produit')}</Text>}</TouchableOpacity></ScrollView></View></View></Modal> : null}

      <SupplierCatalogImportModal visible={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={loadProducts} />
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, content: { padding: Spacing.md, paddingTop: Spacing.xxl, paddingBottom: 140 },
  title: { color: colors.text, fontSize: FontSize.xl, fontWeight: '800' }, subtitle: { color: colors.textSecondary, marginTop: 6, marginBottom: Spacing.md, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }, kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }, row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }, infoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 8, marginBottom: 4 }, actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  cta: { flex: 1, minHeight: 46, borderRadius: BorderRadius.lg, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md }, ctaGhost: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.secondary }, ctaText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm, textAlign: 'center' },
  secondaryAction: { flex: 1, minHeight: 42, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md }, secondaryActionActive: { backgroundColor: colors.secondary, borderColor: colors.secondary }, secondaryActionText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' }, secondaryActionTextActive: { color: '#fff' },
  kpi: { flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' }, kpiValue: { color: colors.text, fontWeight: '800', fontSize: FontSize.xl }, kpiLabel: { color: colors.textMuted, marginTop: 4, fontSize: FontSize.xs, textAlign: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm }, searchInput: { flex: 1, color: colors.text },
  filters: { gap: 8, paddingVertical: 6, paddingRight: Spacing.md, flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, marginRight: 8, marginBottom: 8 }, chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary }, chipText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  infoBanner: { backgroundColor: `${colors.secondary}12`, borderWidth: 1, borderColor: `${colors.secondary}35`, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm }, infoBannerTitle: { color: colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 }, infoBannerText: { color: colors.textSecondary, lineHeight: 20, fontSize: FontSize.sm },
  card: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm }, cardSelected: { borderColor: colors.secondary, backgroundColor: `${colors.secondary}10` }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }, cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }, checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg }, checkboxActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }, badgeVisible: { backgroundColor: `${colors.success}18` }, badgeHidden: { backgroundColor: `${colors.textMuted}18` }, badgeText: { fontSize: FontSize.xs, fontWeight: '700' }, badgeTextVisible: { color: colors.success }, badgeTextHidden: { color: colors.textSecondary },
  cardTopActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, iconButton: { padding: 6 }, editButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.secondary, backgroundColor: `${colors.secondary}15` }, editButtonText: { color: colors.secondary, fontSize: FontSize.xs, fontWeight: '700' }, cardTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, cardMeta: { color: colors.textMuted, marginTop: 6, fontSize: FontSize.xs },
  warning: { color: colors.warning || colors.warning, marginTop: 8, fontSize: FontSize.xs, lineHeight: 18 }, ok: { color: colors.success, marginTop: 8, fontSize: FontSize.xs, fontWeight: '600' }, info: { flex: 1, color: colors.textSecondary, fontSize: FontSize.xs }, smallBtn: { borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallBtnText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' }, smallDanger: { borderWidth: 1, borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallDangerText: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl }, emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  selectionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bgDark, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.md, gap: 10 }, selectionSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, selectionCount: { color: colors.text, fontWeight: '700', fontSize: FontSize.sm }, selectionClear: { color: colors.secondary, fontWeight: '700', fontSize: FontSize.sm }, selectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, selectionButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg }, selectionButtonDisabled: { opacity: 0.45 }, selectionButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: FontSize.xs }, selectionDangerButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12` }, selectionDangerButtonText: { color: colors.danger, fontWeight: '700', fontSize: FontSize.xs },
  modalBg: { flex: 1, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'flex-end' }, modal: { backgroundColor: colors.bgDark, padding: Spacing.md, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl }, modalLarge: { backgroundColor: colors.bgDark, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '92%' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.md }, modalContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }, modalTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.xs }, modalSubtitle: { color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  actionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider }, actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20`, marginTop: 2 }, actionCopy: { flex: 1 }, actionTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, actionText: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, lineHeight: 20 },
  quickEditList: { paddingBottom: Spacing.md }, quickCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm }, quickCardTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.md, marginBottom: Spacing.xs }, previewCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md }, previewTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.sm, marginBottom: 6 }, previewText: { color: colors.textSecondary, lineHeight: 20, fontSize: FontSize.sm }, previewError: { color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 },
  helperCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md }, helperTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.sm, marginBottom: 6 }, helperText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: 4 }, fieldLabel: { color: colors.textSecondary, fontWeight: '700', fontSize: FontSize.xs, marginBottom: 6 },
  input: { flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, color: colors.text, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm }, half: { flex: 1 }, multiline: { minHeight: 120, textAlignVertical: 'top' }, sectionLabel: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, marginTop: 4 }, visibilityRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }, visibilityButton: { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }, visibilityButtonActive: { borderColor: colors.secondary, backgroundColor: `${colors.secondary}14` }, visibilityButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: FontSize.sm }, visibilityButtonTextActive: { color: colors.secondary },
});
