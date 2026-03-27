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

type PublicationStatus = 'draft' | 'ready' | 'published' | 'archived';
type FilterKey = 'all' | 'incomplete' | PublicationStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'incomplete', label: 'À compléter' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'ready', label: 'Prêts' },
  { key: 'published', label: 'Publiés' },
  { key: 'archived', label: 'Archivés' },
];

const STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt à publier',
  published: 'Publié',
  archived: 'Archivé',
};

const PRESETS = [
  { key: 'epicerie', label: 'Épicerie', category: 'Épicerie', unit: 'pièce' },
  { key: 'boissons', label: 'Boissons', category: 'Boissons', unit: 'bouteille' },
  { key: 'hygiene', label: 'Hygiène', category: 'Hygiène', unit: 'pièce' },
  { key: 'restaurant', label: 'Restaurant', category: 'Cuisine', unit: 'portion' },
];

function getStatus(product: CatalogProductData): PublicationStatus {
  const raw = (product.publication_status || '').trim().toLowerCase();
  if (raw === 'draft' || raw === 'ready' || raw === 'published' || raw === 'archived') return raw;
  return product.available ? 'published' : 'draft';
}

function statusToAvailable(status: PublicationStatus) {
  return status === 'published';
}

function issues(product: CatalogProductData) {
  const list: string[] = [];
  if (!product.category?.trim()) list.push('Sans catégorie');
  if (!product.price || product.price <= 0) list.push('Sans prix');
  if ((product.stock_available ?? 0) <= 0) list.push('Sans stock');
  if (!product.description?.trim()) list.push('Description à compléter');
  return list;
}

export default function SupplierCatalogScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [products, setProducts] = useState<CatalogProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showQuick, setShowQuick] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CatalogProductData | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('pièce');
  const [minQty, setMinQty] = useState('1');
  const [stock, setStock] = useState('0');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [origin, setOrigin] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>('draft');

  const resetForm = useCallback(() => {
    setEditing(null); setName(''); setDescription(''); setCategory(''); setSubcategory(''); setPrice(''); setUnit('pièce');
    setMinQty('1'); setStock('0'); setSku(''); setBarcode(''); setBrand(''); setOrigin(''); setDeliveryTime(''); setPublicationStatus('draft');
  }, []);

  const fillForm = useCallback((product: CatalogProductData) => {
    setEditing(product); setName(product.name || ''); setDescription(product.description || ''); setCategory(product.category || '');
    setSubcategory(product.subcategory || ''); setPrice(product.price ? String(product.price) : ''); setUnit(product.unit || 'pièce');
    setMinQty(String(product.min_order_quantity || 1)); setStock(String(product.stock_available || 0)); setSku(product.sku || '');
    setBarcode(product.barcode || ''); setBrand(product.brand || ''); setOrigin(product.origin || ''); setDeliveryTime(product.delivery_time || '');
    setPublicationStatus(getStatus(product));
  }, []);

  const loadProducts = useCallback(async () => {
    try { setProducts(await supplierCatalog.list()); }
    catch { Alert.alert('Erreur', "Impossible de charger le catalogue fournisseur."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadProducts(); }, [loadProducts]));

  const counts = useMemo(() => products.reduce((acc, product) => {
    const status = getStatus(product);
    acc.all += 1; acc[status] += 1; if (issues(product).length > 0) acc.incomplete += 1; return acc;
  }, { all: 0, incomplete: 0, draft: 0, ready: 0, published: 0, archived: 0 } as Record<FilterKey, number>), [products]);

  const filtered = useMemo(() => products.filter((product) => {
    const q = search.trim().toLowerCase();
    const inSearch = !q || [product.name, product.category, product.subcategory, product.brand, product.sku, product.barcode].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    const status = getStatus(product);
    const inFilter = filter === 'all' || (filter === 'incomplete' ? issues(product).length > 0 : status === filter);
    return inSearch && inFilter;
  }), [filter, products, search]);

  function applyPreset(key: string) {
    const preset = PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setCategory((current) => current || preset.category);
    setUnit(preset.unit);
  }

  function buildPayload(statusOverride?: PublicationStatus): CatalogProductCreate {
    const status = statusOverride || publicationStatus;
    return {
      name: name.trim(), description: description.trim(), category: category.trim(), subcategory: subcategory.trim(),
      price: parseFloat(price) || 0, unit: unit.trim() || 'pièce', min_order_quantity: parseInt(minQty, 10) || 1,
      stock_available: parseInt(stock, 10) || 0, sku: sku.trim(), barcode: barcode.trim(), brand: brand.trim(), origin: origin.trim(),
      delivery_time: deliveryTime.trim(), publication_status: status, available: statusToAvailable(status),
    };
  }

  async function saveProduct(payload: CatalogProductCreate) {
    if (!payload.name?.trim()) { Alert.alert('Information manquante', 'Le nom du produit est obligatoire.'); return; }
    setSaving(true);
    try {
      if (editing) await supplierCatalog.update(editing.catalog_id, payload); else await supplierCatalog.create(payload);
      setShowQuick(false); setShowForm(false); resetForm(); await loadProducts();
    } catch { Alert.alert('Erreur', "Impossible d'enregistrer ce produit."); }
    finally { setSaving(false); }
  }

  async function duplicateProduct(product: CatalogProductData) {
    try { await supplierCatalog.duplicate(product.catalog_id); await loadProducts(); Alert.alert('Produit dupliqué', 'Une copie brouillon a été créée.'); }
    catch { Alert.alert('Erreur', 'La duplication a échoué.'); }
  }

  async function updateStatus(product: CatalogProductData, nextStatus: PublicationStatus) {
    try {
      await supplierCatalog.update(product.catalog_id, { ...product, publication_status: nextStatus, available: statusToAvailable(nextStatus) });
      await loadProducts();
    } catch { Alert.alert('Erreur', 'Le changement de statut a échoué.'); }
  }

  async function deleteProduct(product: CatalogProductData) {
    Alert.alert('Supprimer le produit', `Voulez-vous vraiment supprimer "${product.name}" ?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await supplierCatalog.delete(product.catalog_id); await loadProducts(); }
        catch { Alert.alert('Erreur', 'La suppression a échoué.'); }
      }},
    ]);
  }

  if (loading) {
    return <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.center}><ActivityIndicator size="large" color={colors.secondary} /></LinearGradient>;
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={colors.secondary} />}>
        <Text style={styles.title}>Mon catalogue</Text>
        <Text style={styles.subtitle}>Créez vite, gardez des brouillons et publiez uniquement les fiches prêtes.</Text>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.cta, styles.ctaGhost]} onPress={() => { resetForm(); setShowQuick(true); }}><Text style={[styles.ctaText, { color: colors.secondary }]}>Création rapide</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cta} onPress={() => { resetForm(); setShowForm(true); }}><Text style={styles.ctaText}>Nouveau produit</Text></TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.draft}</Text><Text style={styles.kpiLabel}>Brouillons</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.incomplete}</Text><Text style={styles.kpiLabel}>À compléter</Text></View>
          <View style={styles.kpi}><Text style={styles.kpiValue}>{counts.published}</Text><Text style={styles.kpiLabel}>Publiés</Text></View>
        </View>

        <View style={styles.search}><Ionicons name="search-outline" size={18} color={colors.textMuted} /><TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Rechercher un produit" placeholderTextColor={colors.textMuted} /></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return <TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(item.key)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label} ({counts[item.key]})</Text></TouchableOpacity>;
          })}
        </ScrollView>

        {filtered.map((product) => {
          const status = getStatus(product);
          const productIssues = issues(product);
          return (
            <View key={product.catalog_id} style={styles.card}>
              <View style={[styles.badge, { backgroundColor: `${colors.secondary}15` }]}><Text style={styles.badgeText}>{STATUS_LABELS[status]}</Text></View>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{product.name}</Text>
                <View style={styles.cardTopActions}>
                  <TouchableOpacity onPress={() => duplicateProduct(product)} style={styles.iconButton}>
                    <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { fillForm(product); setShowForm(true); }} style={styles.editButton}>
                    <Text style={styles.editButtonText}>Modifier</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.cardMeta}>{[product.category, product.brand, product.sku].filter(Boolean).join(' • ') || 'Aucune information secondaire'}</Text>
              {productIssues.length > 0 ? <Text style={styles.warning}>{productIssues.join(' • ')}</Text> : <Text style={styles.ok}>Fiche prête pour la publication.</Text>}
              <View style={styles.row}><Text style={styles.info}>Prix: {(product.price || 0).toLocaleString()} {t('common.currency_short')}/{product.unit || 'pièce'}</Text><Text style={styles.info}>Stock: {product.stock_available || 0}</Text></View>
              <View style={styles.actionWrap}>
                {status === 'published'
                  ? <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(product, 'archived')}><Text style={styles.smallBtnText}>Archiver</Text></TouchableOpacity>
                  : <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(product, 'published')}><Text style={styles.smallBtnText}>Publier</Text></TouchableOpacity>}
                {status !== 'ready' && status !== 'published' ? <TouchableOpacity style={styles.smallBtn} onPress={() => updateStatus(product, 'ready')}><Text style={styles.smallBtnText}>Marquer prêt</Text></TouchableOpacity> : null}
                <TouchableOpacity style={styles.smallDanger} onPress={() => deleteProduct(product)}><Text style={styles.smallDangerText}>Supprimer</Text></TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Aucun produit</Text><Text style={styles.emptyText}>Commencez par une création rapide, puis complétez vos brouillons plus tard.</Text></View> : null}
      </ScrollView>

      {showQuick && <Modal visible={showQuick} animationType="slide" transparent onRequestClose={() => setShowQuick(false)}>
        <View style={styles.modalBg}><View style={styles.modal}><Text style={styles.modalTitle}>Création rapide</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom du produit" placeholderTextColor={colors.textMuted} /><TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Catégorie" placeholderTextColor={colors.textMuted} /><View style={styles.row}><TextInput style={[styles.input, styles.half]} value={price} onChangeText={setPrice} placeholder="Prix" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={unit} onChangeText={setUnit} placeholder="Unité" placeholderTextColor={colors.textMuted} /></View><TextInput style={styles.input} value={stock} onChangeText={setStock} placeholder="Stock disponible" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          <View style={styles.filters}>{PRESETS.map((item) => <TouchableOpacity key={item.key} style={styles.chip} onPress={() => applyPreset(item.key)}><Text style={styles.chipText}>{item.label}</Text></TouchableOpacity>)}</View>
          <View style={styles.row}><TouchableOpacity style={[styles.cta, styles.ctaGhost]} disabled={saving} onPress={() => saveProduct(buildPayload('draft'))}>{saving ? <ActivityIndicator color={colors.secondary} /> : <Text style={[styles.ctaText, { color: colors.secondary }]}>Brouillon</Text>}</TouchableOpacity><TouchableOpacity style={styles.cta} disabled={saving} onPress={() => saveProduct(buildPayload('published'))}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Publier</Text>}</TouchableOpacity></View>
        </View></View>
      </Modal>}

      {showForm && <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}><View style={styles.modalLarge}><ScrollView contentContainerStyle={styles.modalContent}><Text style={styles.modalTitle}>{editing ? 'Modifier le produit' : 'Nouveau produit'}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nom du produit" placeholderTextColor={colors.textMuted} />
          <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
          <CategorySubcategoryPicker selectedCategory={category} selectedSubcategory={subcategory} onSelect={(cat, sub) => { setCategory(cat); setSubcategory(sub); }} />
          <View style={styles.row}><TextInput style={[styles.input, styles.half]} value={sku} onChangeText={setSku} placeholder="SKU" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={barcode} onChangeText={setBarcode} placeholder="Code-barres" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View>
          <View style={styles.row}><TextInput style={[styles.input, styles.half]} value={brand} onChangeText={setBrand} placeholder="Marque" placeholderTextColor={colors.textMuted} /><TextInput style={[styles.input, styles.half]} value={origin} onChangeText={setOrigin} placeholder="Origine" placeholderTextColor={colors.textMuted} /></View>
          <View style={styles.row}><TextInput style={[styles.input, styles.half]} value={price} onChangeText={setPrice} placeholder="Prix" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={unit} onChangeText={setUnit} placeholder="Unité" placeholderTextColor={colors.textMuted} /></View>
          <View style={styles.row}><TextInput style={[styles.input, styles.half]} value={minQty} onChangeText={setMinQty} placeholder="Quantité minimale" placeholderTextColor={colors.textMuted} keyboardType="numeric" /><TextInput style={[styles.input, styles.half]} value={stock} onChangeText={setStock} placeholder="Stock disponible" placeholderTextColor={colors.textMuted} keyboardType="numeric" /></View>
          <TextInput style={styles.input} value={deliveryTime} onChangeText={setDeliveryTime} placeholder="Délai de livraison" placeholderTextColor={colors.textMuted} />
          <Text style={styles.section}>Statut de publication</Text>
          <View style={styles.filters}>{(['draft', 'ready', 'published', 'archived'] as PublicationStatus[]).map((item) => { const active = publicationStatus === item; return <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setPublicationStatus(item)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{STATUS_LABELS[item]}</Text></TouchableOpacity>; })}</View>
          <TouchableOpacity style={styles.cta} disabled={saving} onPress={() => saveProduct(buildPayload())}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{editing ? 'Enregistrer les changements' : 'Créer le produit'}</Text>}</TouchableOpacity>
        </ScrollView></View></View>
      </Modal>}
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, content: { padding: Spacing.md, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  title: { color: colors.text, fontSize: FontSize.xl, fontWeight: '800' }, subtitle: { color: colors.textSecondary, marginTop: 6, marginBottom: Spacing.md, lineHeight: 20 },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }, actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cta: { flex: 1, minHeight: 46, borderRadius: BorderRadius.lg, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.md },
  ctaGhost: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.secondary }, ctaText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  kpi: { flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center' },
  kpiValue: { color: colors.text, fontWeight: '800', fontSize: FontSize.xl }, kpiLabel: { color: colors.textMuted, marginTop: 4, fontSize: FontSize.xs, textAlign: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  searchInput: { flex: 1, color: colors.text }, filters: { gap: 8, paddingVertical: 6, flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg }, chipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary }, chipText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' }, chipTextActive: { color: '#fff' },
  card: { backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginBottom: 8 }, badgeText: { color: colors.secondary, fontSize: FontSize.xs, fontWeight: '700' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, cardTitle: { flex: 1, color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, cardMeta: { color: colors.textMuted, marginTop: 6, fontSize: FontSize.xs },
  cardTopActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { padding: 6 },
  editButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.secondary, backgroundColor: `${colors.secondary}15` },
  editButtonText: { color: colors.secondary, fontSize: FontSize.xs, fontWeight: '700' },
  warning: { color: colors.warning || '#F59E0B', marginTop: 8, fontSize: FontSize.xs, lineHeight: 18 }, ok: { color: colors.success, marginTop: 8, fontSize: FontSize.xs, fontWeight: '600' }, info: { flex: 1, color: colors.textSecondary, fontSize: FontSize.xs },
  smallBtn: { borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallBtnText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  smallDanger: { borderWidth: 1, borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}12`, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md }, smallDangerText: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl }, emptyTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' }, emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'flex-end' }, modal: { backgroundColor: colors.bgDark, padding: Spacing.md, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl },
  modalLarge: { backgroundColor: colors.bgDark, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '92%' }, modalContent: { padding: Spacing.md, paddingBottom: Spacing.xl }, modalTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.sm },
  input: { flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, color: colors.text, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  half: { flex: 1 }, multiline: { minHeight: 84, textAlignVertical: 'top' }, section: { color: colors.textSecondary, fontWeight: '700', marginBottom: 8, marginTop: 4 },
});
