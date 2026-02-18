import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supplierCatalog, CatalogProductData, CatalogProductCreate } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import CategorySubcategoryPicker from '../../components/CategorySubcategoryPicker';

export default function CatalogScreen() {
  const [products, setProducts] = useState<CatalogProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CatalogProductData | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formUnit, setFormUnit] = useState('unité');
  const [formMinQty, setFormMinQty] = useState('1');
  const [formStock, setFormStock] = useState('0');
  const [formAvailable, setFormAvailable] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const result = await supplierCatalog.list();
      setProducts(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  function onRefresh() {
    setRefreshing(true);
    loadProducts();
  }

  function openAdd() {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormCategory('');
    setFormSubcategory('');
    setFormPrice('');
    setFormUnit('unité');
    setFormMinQty('1');
    setFormStock('0');
    setFormAvailable(true);
    setShowModal(true);
  }

  function openEdit(product: CatalogProductData) {
    setEditing(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormCategory(product.category || '');
    setFormSubcategory(product.subcategory || '');
    setFormPrice(product.price.toString());
    setFormUnit(product.unit || 'unité');
    setFormMinQty(product.min_order_quantity.toString());
    setFormStock(product.stock_available.toString());
    setFormAvailable(product.available);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    const data: CatalogProductCreate = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      category: formCategory.trim() || undefined,
      subcategory: formSubcategory.trim() || undefined,
      price: parseFloat(formPrice) || 0,
      unit: formUnit.trim() || 'unité',
      min_order_quantity: parseInt(formMinQty) || 1,
      stock_available: parseInt(formStock) || 0,
      available: formAvailable,
    };
    try {
      if (editing) {
        await supplierCatalog.update(editing.catalog_id, data);
      } else {
        await supplierCatalog.create(data);
      }
      setShowModal(false);
      loadProducts();
    } catch {
      RNAlert.alert('Erreur', 'Impossible de sauvegarder le produit');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: CatalogProductData) {
    const confirmText = `Supprimer "${product.name}" du catalogue ?`;

    const executeDelete = async () => {
      try {
        await supplierCatalog.delete(product.catalog_id);
        loadProducts();
      } catch {
        // ignore
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmText)) {
        await executeDelete();
      }
    } else {
      RNAlert.alert(
        'Supprimer',
        confirmText,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  }

  async function toggleAvailability(product: CatalogProductData) {
    try {
      await supplierCatalog.update(product.catalog_id, {
        name: product.name,
        available: !product.available,
      });
      loadProducts();
    } catch {
      // ignore
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <LinearGradient colors={[Colors.bgDark, Colors.bgMid, Colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.bgDark, Colors.bgMid, Colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Mon Catalogue</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Product count */}
        <Text style={styles.countText}>{filtered.length} produit{filtered.length > 1 ? 's' : ''}</Text>

        {/* Product list */}
        {filtered.map((product) => (
          <TouchableOpacity key={product.catalog_id} style={styles.productCard} onPress={() => openEdit(product)}>
            <View style={styles.productTop}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.category ? (
                  <Text style={styles.productCategory}>{product.category}</Text>
                ) : null}
              </View>
              <Switch
                value={product.available}
                onValueChange={() => toggleAvailability(product)}
                trackColor={{ false: Colors.divider, true: Colors.success + '60' }}
                thumbColor={product.available ? Colors.success : Colors.textMuted}
              />
            </View>
            <View style={styles.productBottom}>
              <View style={styles.productDetail}>
                <Text style={styles.detailLabel}>Prix</Text>
                <Text style={styles.detailValue}>{product.price.toLocaleString()} F/{product.unit}</Text>
              </View>
              <View style={styles.productDetail}>
                <Text style={styles.detailLabel}>Stock</Text>
                <Text style={styles.detailValue}>{product.stock_available}</Text>
              </View>
              <View style={styles.productDetail}>
                <Text style={styles.detailLabel}>Min cmd</Text>
                <Text style={styles.detailValue}>{product.min_order_quantity}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(product)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {search ? 'Aucun produit trouvé' : 'Votre catalogue est vide'}
            </Text>
            {!search && (
              <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
                <Text style={styles.emptyBtnText}>Ajouter un produit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editing ? 'Modifier le produit' : 'Nouveau produit'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Nom du produit" placeholderTextColor={Colors.textMuted} />

              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.multiline]} value={formDescription} onChangeText={setFormDescription} placeholder="Description" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />

              <CategorySubcategoryPicker
                selectedCategory={formCategory}
                selectedSubcategory={formSubcategory}
                onSelect={(cat, sub) => {
                  setFormCategory(cat);
                  setFormSubcategory(sub);
                }}
              />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Prix ({t('common.currency_default')})</Text>
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Unité</Text>
                  <TextInput style={styles.input} value={formUnit} onChangeText={setFormUnit} placeholder="unité" placeholderTextColor={Colors.textMuted} />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Qté min commande</Text>
                  <TextInput style={styles.input} value={formMinQty} onChangeText={setFormMinQty} placeholder="1" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Stock disponible</Text>
                  <TextInput style={styles.input} value={formStock} onChangeText={setFormStock} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Disponible à la vente</Text>
                <Switch
                  value={formAvailable}
                  onValueChange={setFormAvailable}
                  trackColor={{ false: Colors.divider, true: Colors.success + '60' }}
                  thumbColor={formAvailable ? Colors.success : Colors.textMuted}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editing ? 'Enregistrer' : 'Ajouter au catalogue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassStyle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
  },
  countText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  productCard: {
    ...GlassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  productCategory: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  productDetail: { flex: 1 },
  detailLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  emptyBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgDark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalScroll: {
    padding: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formHalf: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
