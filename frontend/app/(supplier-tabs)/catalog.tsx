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

type VisibilityFilter = 'all' | 'needs_attention' | 'visible' | 'hidden';
type PublicationStatus = 'draft' | 'published';
type QuickEditRow = { catalog_id: string; name: string; price: string; stock: string; available: boolean };
type TextImportDraft = { name: string; price: number; stock_available: number; unit: string; category: string; description: string };

const FILTERS: Array<{ key: VisibilityFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'needs_attention', label: 'A corriger' },
  { key: 'visible', label: 'Visibles' },
  { key: 'hidden', label: 'Masques' },
];

const isVisibleProduct = (product: CatalogProductData) => Boolean(product.available || product.publication_status === 'published');
const deriveStatus = (available: boolean): PublicationStatus => (available ? 'published' : 'draft');
const parseDecimal = (value: string) => Number.parseFloat(value.replace(',', '.')) || 0;
const parseInteger = (value: string) => Number.parseInt(value, 10) || 0;

function getIssues(product: CatalogProductData) {
  return [
    !product.category?.trim() ? 'Categorie manquante' : '',
    !product.price || product.price <= 0 ? 'Prix manquant' : '',
    (product.stock_available ?? 0) < 0 ? 'Stock invalide' : '',
    !product.description?.trim() ? 'Description a completer' : '',
  ].filter(Boolean);
}

function parseTextDraft(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const drafts: TextImportDraft[] = [];
  const errors: string[] = [];
  lines.forEach((line, index) => {
    const parts = (line.includes('\t') ? line.split('\t') : line.split(';')).map((part) => part.trim());
    if (!parts[0]) {
      errors.push(`Ligne ${index + 1} : le nom du produit est obligatoire.`);
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
    try { setProducts(await supplierCatalog.list()); } catch { Alert.alert('Erreur', "Impossible de charger le catalogue fournisseur."); } finally { setLoading(false); setRefreshing(false); }
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
    if (!payload.name?.trim()) return Alert.alert('Information manquante', 'Le nom du produit est obligatoire.');
    setSaving(true);
    try { editing ? await supplierCatalog.update(editing.catalog_id, payload) : await supplierCatalog.create(payload); setShowForm(false); resetForm(); await loadProducts(); }
    catch { Alert.alert('Erreur', "Impossible d'enregistrer ce produit."); } finally { setSaving(false); }
  }

  async function duplicateProduct(product: CatalogProductData) {
    try { await supplierCatalog.duplicate(product.catalog_id); await loadProducts(); Alert.alert('Produit duplique', 'Une copie a bien ete creee.'); }
    catch { Alert.alert('Erreur', 'La duplication a echoue.'); }
  }

  async function updateVisibility(product: CatalogProductData, available: boolean) {
    try { await supplierCatalog.update(product.catalog_id, { ...product, available, publication_status: deriveStatus(available) }); await loadProducts(); }
    catch { Alert.alert('Erreur', 'La mise a jour de la visibilite a echoue.'); }
  }

  async function deleteProduct(product: CatalogProductData) {
    Alert.alert('Supprimer le produit', `Voulez-vous vraiment supprimer "${product.name}" ?`, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await supplierCatalog.delete(product.catalog_id); await loadProducts(); } catch { Alert.alert('Erreur', 'La suppression a echoue.'); } } }]);
  }

  function openQuickEdit(source: 'selected' | 'filtered' | 'all' = 'filtered') {
    const sourceProducts = source === 'selected' ? selectedProducts : source === 'all' ? products : filtered;
    if (!sourceProducts.length) return Alert.alert('Aucun produit', "Aucun produit n'est disponible pour l'edition rapide.");
    setQuickEditRows(sourceProducts.map((product) => ({ catalog_id: product.catalog_id, name: product.name || '', price: String(product.price || 0), stock: String(product.stock_available || 0), available: isVisibleProduct(product) })));
    setQuickEditSourceLabel(source === 'selected' ? `${sourceProducts.length} produit(s) selectionne(s)` : source === 'all' ? 'tout le catalogue' : 'la liste visible');
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
      setShowQuickEdit(false); await loadProducts(); Alert.alert('Edition rapide', 'Les produits ont ete mis a jour.');
    } catch { Alert.alert('Erreur', "Impossible d'enregistrer toutes les modifications."); }
    finally { setBulkSaving(false); }
  }

  function toggleSelectionMode() { setSelectionMode((prev) => { const next = !prev; if (!next) setSelectedIds([]); return next; }); setShowActions(false); }
  function toggleSelectedProduct(catalogId: string) { setSelectedIds((prev) => prev.includes(catalogId) ? prev.filter((id) => id !== catalogId) : [...prev, catalogId]); }
  function selectAllFiltered() { setSelectedIds(filtered.map((product) => product.catalog_id)); }
  function clearSelection() { setSelectedIds([]); }

  async function updateSelectedVisibility(available: boolean) {
    if (!selectedProducts.length) return;
    setBulkSaving(true);
    try { await supplierCatalog.bulkUpdate(selectedProducts.map((product) => ({ catalog_id: product.catalog_id, available }))); clearSelection(); setSelectionMode(false); await loadProducts(); Alert.alert('Selection multiple', available ? 'Les produits sont maintenant visibles.' : 'Les produits sont maintenant masques.'); }
    catch { Alert.alert('Erreur', 'La mise a jour en lot a echoue.'); } finally { setBulkSaving(false); }
  }

  async function deleteSelectedProducts() {
    if (!selectedProducts.length) return;
    Alert.alert('Supprimer la selection', `Voulez-vous supprimer ${selectedProducts.length} produit(s) ?`, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: async () => { setBulkSaving(true); try { await supplierCatalog.bulkDelete(selectedProducts.map((product) => product.catalog_id)); clearSelection(); setSelectionMode(false); await loadProducts(); Alert.alert('Selection multiple', 'Les produits selectionnes ont ete supprimes.'); } catch { Alert.alert('Erreur', 'La suppression en lot a echoue.'); } finally { setBulkSaving(false); } } }]);
  }

  async function createProductsFromText() {
    const { drafts, errors } = parseTextDraft(textImportValue);
    if (!drafts.length || errors.length) return Alert.alert('Import texte', errors[0] || 'Ajoutez au moins une ligne valide.');
    setTextImportSaving(true);
    try { await supplierCatalog.bulkCreate(drafts.map((draft) => ({ name: draft.name, description: draft.description, category: draft.category, price: draft.price, stock_available: draft.stock_available, unit: draft.unit || 'piece', available: true, publication_status: 'published' }))); setTextImportValue(''); setShowTextImport(false); await loadProducts(); Alert.alert('Creation par texte', `${drafts.length} produit(s) ont ete crees.`); }
    catch { Alert.alert('Erreur', "La creation des produits a partir du texte a echoue."); } finally { setTextImportSaving(false); }
  }

  if (loading) return <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.center}><ActivityIndicator size="large" color={colors.secondary} /></LinearGradient>;

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={colors.secondary} />}>
        <Text style={styles.title}>Catalogue fournisseur</Text>
        <Text style={styles.subtitle}>Retrouvez les usages essentiels du compte commercant adaptes au fournisseur : import CSV, creation par texte, edition rapide du prix et du stock, puis selection multiple.</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.cta, styles.ctaGhost]} onPress={() => setShowActions(true)}><Text style={[styles.ctaText, { color: colors.secondary }]}>Actions rapides</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cta} onPress={() => { resetForm(); setShowForm(true); }}><Text style={styles.ctaText}>Nouveau produit</Text></TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.secondaryAction, selectionMode && styles.secondaryActionActive]} onPress={toggleSelectionMode}>
            <Ionicons name={selectionMode ? 'checkbox-outline' : 'square-outline'} size={16} color={selectionMode ? '#fff' : colors.textSecondary} />
            <Text style={[styles.secondaryActionText, selectionMode && styles.secondaryActionTextActive]}>{selectionMode ? 'Quitter la selection' : 'Selection multiple'}</Text>
          </TouchableOpacity>
          {selectionMode ? <TouchableOpacity style={styles.secondaryAction} onPress={selectAllFiltered}><Ionicons name="checkmark-done-outline" size={16} color={colors.textSecondary} /><Text style={styles.secondaryActionText}>Tout selectionner</Text></TouchableOpacity> : null}
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.all}</Text><Text style={styles.kpiLabel}>Produits</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.needs_attention}</Text><Text style={styles.kpiLabel}>A corriger</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.visible}</Text><Text style={styles.kpiLabel}>Visibles</Text></View>
        </View>
        <View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.textMuted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un produit" placeholderTextColor={colors.textMuted} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => { const active = filter === item.key; return <TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(item.key)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label} ({counts[item.key]})</Text></TouchableOpacity>; })}
        </ScrollView>
        {selectionMode ? <View style={styles.infoBanner}><Text style={styles.infoBannerTitle}>{selectedIds.length ? `${selectedIds.length} produit(s) selectionne(s)` : 'Selectionnez un ou plusieurs produits'}</Text><Text style={styles.infoBannerText}>Utilisez ensuite la barre d actions en bas pour modifier les prix, le stock, la visibilite ou supprimer plusieurs produits d un coup.</Text></View> : null}
        {filtered.map((product) => {
          const issues = getIssues(product);
          const visible = isVisibleProduct(product);
          const selected = selectedSet.has(product.catalog_id);
          return (
            <TouchableOpacity key={product.catalog_id} activeOpacity={selectionMode ? 0.85 : 1} onPress={() => { if (selectionMode) toggleSelectedProduct(product.catalog_id); }} style={[styles.card, selectionMode && selected && styles.cardSelected]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  {selectionMode ? <TouchableOpacity style={[styles.checkbox, selected && styles.checkboxActive]} onPress={() => toggleSelectedProduct(product.catalog_id)}>{selected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}</TouchableOpacity> : null}
                  <View style={[styles.badge, visible ? styles.badgeVisible : styles.badgeHidden]}><Text style={[styles.badgeText, visible ? styles.badgeTextVisible : styles.badgeTextHidden]}>{visible ? 'Visible' : 'Masque'}</Text></View>
                </View>
                <View style={styles.cardTopActions}>
                  <TouchableOpacity onPress={() => duplicateProduct(product)} style={styles.iconButton}><Ionicons name="copy-outline" size={18} color={colors.textSecondary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => { fillForm(product); setShowForm(true); }} style={styles.editButton}><Text style={styles.editButtonText}>Modifier</Text></TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardTitle}>{product.name}</Text>
              <Text style={styles.cardMeta}>{[product.category, product.brand, product.sku].filter(Boolean).join(' - ') || 'Aucune information secondaire'}</Text>
              {issues.length > 0 ? <Text style={styles.warning}>{issues.join(' - ')}</Text> : <Text style={styles.ok}>Fiche complete et exploitable.</Text>}
              <View style={styles.infoRow}><Text style={styles.info}>Prix : {(product.price || 0).toLocaleString()} {t('common.currency_short')}/{product.unit || 'piece'}</Text><Text style={styles.info}>Stock : {product.stock_available || 0}</Text></View>
              {!selectionMode ? <View style={styles.actionWrap}><TouchableOpacity style={styles.smallBtn} onPress={() => updateVisibility(product, !visible)}><Text style={styles.smallBtnText}>{visible ? 'Masquer' : 'Rendre visible'}</Text></TouchableOpacity><TouchableOpacity style={styles.smallDanger} onPress={() => deleteProduct(product)}><Text style={styles.smallDangerText}>Supprimer</Text></TouchableOpacity></View> : null}
            </TouchableOpacity>
          );
        })}
        {filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Aucun produit</Text><Text style={styles.emptyText}>Commencez par importer un CSV, creer vos produits par texte ou ajouter un produit manuellement.</Text></View> : null}
      </ScrollView>

      {selectionMode ? <View style={styles.selectionBar}><View style={styles.selectionSummary}><Text style={styles.selectionCount}>{selectedIds.length || 0} selectionne(s)</Text><TouchableOpacity onPress={clearSelection}><Text style={styles.selectionClear}>Effacer</Text></TouchableOpacity></View><View style={styles.selectionActions}><TouchableOpacity style={[styles.selectionButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={() => openQuickEdit('selected')}><Text style={styles.selectionButtonText}>Prix et stock</Text></TouchableOpacity><TouchableOpacity style={[styles.selectionButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={() => updateSelectedVisibility(true)}><Text style={styles.selectionButtonText}>Visible</Text></TouchableOpacity><TouchableOpacity style={[styles.selectionButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={() => updateSelectedVisibility(false)}><Text style={styles.selectionButtonText}>Masquer</Text></TouchableOpacity><TouchableOpacity style={[styles.selectionDangerButton, !selectedIds.length && styles.selectionButtonDisabled]} disabled={!selectedIds.length || bulkSaving} onPress={deleteSelectedProducts}><Text style={styles.selectionDangerButtonText}>Supprimer</Text></TouchableOpacity></View></View> : null}

      {showActions ? <Modal visible={showActions} animationType="slide" transparent onRequestClose={() => setShowActions(false)}><View style={styles.modalBg}><View style={styles.modal}><Text style={styles.modalTitle}>Actions rapides</Text><Text style={styles.modalSubtitle}>Ce menu regroupe maintenant les vraies actions utiles du catalogue fournisseur.</Text>{[
        { icon: 'cloud-upload-outline', title: 'Importer un CSV', text: 'Importer plusieurs produits a partir d un fichier et controler les colonnes avant validation.', onPress: () => { setShowActions(false); setShowImportModal(true); } },
        { icon: 'document-text-outline', title: 'Creation par texte', text: 'Coller plusieurs lignes au format nom ; prix ; stock ; unite ; categorie ; description.', onPress: () => { setShowActions(false); setShowTextImport(true); } },
        { icon: 'create-outline', title: 'Edition rapide', text: 'Modifier en lot les prix, les stocks et la visibilite sur la liste visible.', onPress: () => openQuickEdit('filtered') },
        { icon: 'checkbox-outline', title: 'Selection multiple', text: 'Selectionner plusieurs produits puis agir en lot : edition rapide, visibilite ou suppression.', onPress: toggleSelectionMode },
        { icon: 'add-circle-outline', title: 'Nouveau produit', text: 'Ouvrir la fiche complete comme sur le compte commercant.', onPress: () => { resetForm(); setShowActions(false); setShowForm(true); } },
      ].map((action) => <TouchableOpacity key={action.title} style={styles.actionCard} onPress={action.onPress}><View style={styles.actionIcon}><Ionicons name={action.icon as any} size={20} color={colors.primary} /></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>{action.title}</Text><Text style={styles.actionText}>{action.text}</Text></View></TouchableOpacity>)}</View></View></Modal> : null}

      {showQuickEdit ? <Modal visible={showQuickEdit} animationType="slide" transparent onRequestClose={() => setShowQuickEdit(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Edition rapide</Text><TouchableOpacity onPress={() => setShowQuickEdit(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><View style={styles.modalContent}><Text style={styles.modalSubtitle}>Cette vue sert a corriger rapidement le nom, le prix, le stock et la visibilite sans rouvrir chaque fiche. Source : {quickEditSourceLabel}.</Text><TextInput style={styles.input} value={quickEditSearch} onChangeText={setQuickEditSearch} placeholder="Rechercher dans l edition rapide" placeholderTextColor={colors.textMuted} /><ScrollView contentContainerStyle={styles.quickEditList}>{quickEditFiltered.map((row) => <View key={row.catalog_id} style={styles.quickCard}><TextInput style={styles.input} value={row.name} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { name: value })} placeholder="Nom" placeholderTextColor={colors.textMuted} /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={row.price} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { price: value })} placeholder="Prix" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={row.stock} onChangeText={(value) => updateQuickEditRow(row.catalog_id, { stock: value })} placeholder="Stock" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><View style={styles.visibilityRow}><TouchableOpacity style={[styles.visibilityButton, row.available && styles.visibilityButtonActive]} onPress={() => updateQuickEditRow(row.catalog_id, { available: true })}><Text style={[styles.visibilityButtonText, row.available && styles.visibilityButtonTextActive]}>Visible</Text></TouchableOpacity><TouchableOpacity style={[styles.visibilityButton, !row.available && styles.visibilityButtonActive]} onPress={() => updateQuickEditRow(row.catalog_id, { available: false })}><Text style={[styles.visibilityButtonText, !row.available && styles.visibilityButtonTextActive]}>Masque</Text></TouchableOpacity></View></View>)}</ScrollView><TouchableOpacity style={styles.cta} onPress={saveQuickEditRows} disabled={bulkSaving}>{bulkSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Enregistrer toutes les modifications</Text>}</TouchableOpacity></View></View></View></Modal> : null}

      {showTextImport ? <Modal visible={showTextImport} animationType="slide" transparent onRequestClose={() => setShowTextImport(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Creation par texte</Text><TouchableOpacity onPress={() => setShowTextImport(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><ScrollView contentContainerStyle={styles.modalContent}><Text style={styles.modalSubtitle}>Collez une ligne par produit. Format conseille :{'\n'}nom ; prix ; stock ; unite ; categorie ; description{'\n\n'}Exemple :{'\n'}Paracetamol 500 ; 1200 ; 25 ; boite ; Antalgique ; Boite de 16 comprimes</Text><TextInput style={[styles.input, styles.multiline]} value={textImportValue} onChangeText={setTextImportValue} placeholder="Une ligne par produit" placeholderTextColor={colors.textMuted} multiline numberOfLines={8} /><View style={styles.previewCard}><Text style={styles.previewTitle}>Apercu avant creation</Text><Text style={styles.previewText}>Produits detectes : {textImportPreview.drafts.length}</Text>{textImportPreview.errors.length ? <Text style={styles.previewError}>{textImportPreview.errors[0]}</Text> : <Text style={styles.previewText}>Les produits crees par texte deviennent visibles tout de suite. Utilisez l edition rapide ensuite si vous devez corriger les prix ou le stock.</Text>}</View><TouchableOpacity style={styles.cta} onPress={createProductsFromText} disabled={!textImportValue.trim() || textImportSaving}>{textImportSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Creer les produits</Text>}</TouchableOpacity></ScrollView></View></View></Modal> : null}

      {showForm ? <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}><View style={styles.modalBg}><View style={styles.modalLarge}><ScrollView contentContainerStyle={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? 'Modifier le produit' : 'Nouveau produit'}</Text><TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity></View><Text style={styles.modalSubtitle}>Cette fiche reprend les champs essentiels du compte commercant, puis les adapte au catalogue fournisseur. Renseignez au minimum le nom, le prix, le stock et la categorie.</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom du produit" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} /><CategorySubcategoryPicker selectedCategory={category} selectedSubcategory={subcategory} onSelect={(selectedCategoryValue, selectedSubcategoryValue) => { setCategory(selectedCategoryValue); setSubcategory(selectedSubcategoryValue); }} /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={sku} onChangeText={setSku} placeholder="SKU" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={barcode} onChangeText={setBarcode} placeholder="Code-barres" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={brand} onChangeText={setBrand} placeholder="Marque" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={origin} onChangeText={setOrigin} placeholder="Origine" placeholderTextColor={colors.textMuted} /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={price} onChangeText={setPrice} placeholder="Prix" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={unit} onChangeText={setUnit} placeholder="Unite" placeholderTextColor={colors.textMuted} /></View><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={minQty} onChangeText={setMinQty} placeholder="Quantite minimale" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={stock} onChangeText={setStock} placeholder="Stock disponible" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View><TextInput style={styles.input} value={deliveryTime} onChangeText={setDeliveryTime} placeholder="Delai de livraison" placeholderTextColor={colors.textMuted} /><Text style={styles.sectionLabel}>Visibilite dans le catalogue</Text><View style={styles.visibilityRow}><TouchableOpacity style={[styles.visibilityButton, isVisible && styles.visibilityButtonActive]} onPress={() => setIsVisible(true)}><Text style={[styles.visibilityButtonText, isVisible && styles.visibilityButtonTextActive]}>Visible</Text></TouchableOpacity><TouchableOpacity style={[styles.visibilityButton, !isVisible && styles.visibilityButtonActive]} onPress={() => setIsVisible(false)}><Text style={[styles.visibilityButtonText, !isVisible && styles.visibilityButtonTextActive]}>Masque</Text></TouchableOpacity></View><TouchableOpacity style={styles.cta} disabled={saving} onPress={() => saveProduct(buildPayload())}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{editing ? 'Enregistrer les changements' : 'Creer le produit'}</Text>}</TouchableOpacity></ScrollView></View></View></Modal> : null}

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
  warning: { color: colors.warning || '#F59E0B', marginTop: 8, fontSize: FontSize.xs, lineHeight: 18 }, ok: { color: colors.success, marginTop: 8, fontSize: FontSize.xs, fontWeight: '600' }, info: { flex: 1, color: colors.textSecondary, fontSize: FontSize.xs }, smallBtn: { borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallBtnText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' }, smallDanger: { borderWidth: 1, borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallDangerText: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl }, emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  selectionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bgDark, borderTopWidth: 1, borderTopColor: colors.glassBorder, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.md, gap: 10 }, selectionSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, selectionCount: { color: colors.text, fontWeight: '700', fontSize: FontSize.sm }, selectionClear: { color: colors.secondary, fontWeight: '700', fontSize: FontSize.sm }, selectionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, selectionButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg }, selectionButtonDisabled: { opacity: 0.45 }, selectionButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: FontSize.xs }, selectionDangerButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12` }, selectionDangerButtonText: { color: colors.danger, fontWeight: '700', fontSize: FontSize.xs },
  modalBg: { flex: 1, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'flex-end' }, modal: { backgroundColor: colors.bgDark, padding: Spacing.md, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl }, modalLarge: { backgroundColor: colors.bgDark, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '92%' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.md }, modalContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }, modalTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.xs }, modalSubtitle: { color: colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  actionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider }, actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20`, marginTop: 2 }, actionCopy: { flex: 1 }, actionTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, actionText: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, lineHeight: 20 },
  quickEditList: { paddingBottom: Spacing.md }, quickCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm }, previewCard: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md }, previewTitle: { color: colors.text, fontWeight: '700', fontSize: FontSize.sm, marginBottom: 6 }, previewText: { color: colors.textSecondary, lineHeight: 20, fontSize: FontSize.sm }, previewError: { color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 },
  input: { flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, color: colors.text, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm }, half: { flex: 1 }, multiline: { minHeight: 120, textAlignVertical: 'top' }, sectionLabel: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, marginTop: 4 }, visibilityRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }, visibilityButton: { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }, visibilityButtonActive: { borderColor: colors.secondary, backgroundColor: `${colors.secondary}14` }, visibilityButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: FontSize.sm }, visibilityButtonTextActive: { color: colors.secondary },
});
