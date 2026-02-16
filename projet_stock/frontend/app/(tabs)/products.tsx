import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert as RNAlert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import BarcodeScanner from '../../components/BarcodeScanner';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../hooks/useNetwork';
import { cache, KEYS } from '../../services/cache';
import { syncService } from '../../services/sync';
import {
  products as productsApi,
  categories as categoriesApi,
  stock as stockApi,
  batches,
  Product,
  Category,
  ProductCreate,
  API_URL,
} from '../../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProductsScreen() {
  const { colors, glassStyle } = useTheme();
  const styles = getStyles(colors, glassStyle);
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [productList, setProductList] = useState<Product[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add/Edit product form
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formQuantity, setFormQuantity] = useState('0');
  const [formUnit, setFormUnit] = useState('pièce');
  const [formPurchasePrice, setFormPurchasePrice] = useState('0');
  const [formSellingPrice, setFormSellingPrice] = useState('0');
  const [formMinStock, setFormMinStock] = useState('0');
  const [formMaxStock, setFormMaxStock] = useState('100');
  const [formCategory, setFormCategory] = useState<string | undefined>(undefined);
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Category management modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catFormName, setCatFormName] = useState('');
  const [catFormColor, setCatFormColor] = useState('#6366f1');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormLoading, setCatFormLoading] = useState(false);

  // Stock movement
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movQuantity, setMovQuantity] = useState('');
  const [movReason, setMovReason] = useState('');
  const [movBatchNumber, setMovBatchNumber] = useState('');
  const [movExpiryDate, setMovExpiryDate] = useState('');

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'search' | 'form'>('search');

  const loadData = useCallback(async () => {
    try {
      if (isConnected) {
        const [prods, cats] = await Promise.all([
          productsApi.list(selectedCategory ?? undefined),
          categoriesApi.list(),
        ]);
        setProductList(prods);
        setCategoryList(cats);
        // Determine whether to cache: only cache full list (no category filter)
        if (!selectedCategory) {
          await cache.set(KEYS.PRODUCTS, prods);
        }
        await cache.set(KEYS.CATEGORIES, cats);
      } else {
        // Offline: read from cache
        const cachedProds = await cache.get<Product[]>(KEYS.PRODUCTS);
        const cachedCats = await cache.get<Category[]>(KEYS.CATEGORIES);
        if (cachedProds) {
          const filtered = selectedCategory
            ? cachedProds.filter((p) => p.category_id === selectedCategory)
            : cachedProds;
          setProductList(filtered);
        }
        if (cachedCats) setCategoryList(cachedCats);
      }
    } catch {
      // Fallback to cache on error
      const cachedProds = await cache.get<Product[]>(KEYS.PRODUCTS);
      if (cachedProds) {
        const filtered = selectedCategory
          ? cachedProds.filter((p) => p.category_id === selectedCategory)
          : cachedProds;
        setProductList(filtered);
      }
      const cachedCats = await cache.get<Category[]>(KEYS.CATEGORIES);
      if (cachedCats) setCategoryList(cachedCats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, selectedCategory, user?.active_store_id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  const filtered = productList.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function getStatusColor(product: Product) {
    if (product.quantity === 0) return colors.danger;
    if (product.min_stock > 0 && product.quantity <= product.min_stock) return colors.warning;
    if (product.max_stock > 0 && product.quantity >= product.max_stock) return colors.info;
    return colors.success;
  }

  function getStatusLabel(product: Product) {
    if (product.quantity === 0) return 'Rupture';
    if (product.min_stock > 0 && product.quantity <= product.min_stock) return 'Stock bas';
    if (product.max_stock > 0 && product.quantity >= product.max_stock) return 'Surstock';
    return 'Normal';
  }

  function resetForm() {
    setFormName('');
    setFormSku('');
    setFormQuantity('0');
    setFormUnit('pièce');
    setFormPurchasePrice('0');
    setFormSellingPrice('0');
    setFormMinStock('0');
    setFormMaxStock('100');
    setFormCategory(undefined);
    setFormImage(null);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku || '');
    setFormQuantity(String(product.quantity));
    setFormUnit(product.unit);
    setFormPurchasePrice(String(product.purchase_price));
    setFormSellingPrice(String(product.selling_price));
    setFormMinStock(String(product.min_stock));
    setFormMaxStock(String(product.max_stock));
    setFormCategory(product.category_id);
    setFormImage(product.image || null);
    setShowAddModal(true);
  }

  async function handleSubmitProduct() {
    if (!formName.trim()) return;
    setFormLoading(true);
    try {
      const data: ProductCreate = {
        name: formName.trim(),
        sku: formSku.trim() || undefined,
        quantity: parseInt(formQuantity) || 0,
        unit: formUnit,
        purchase_price: parseFloat(formPurchasePrice) || 0,
        selling_price: parseFloat(formSellingPrice) || 0,
        min_stock: parseInt(formMinStock) || 0,
        max_stock: parseInt(formMaxStock) || 100,
        category_id: formCategory,
        image: formImage || undefined,
      };

      if (isConnected) {
        if (editingProduct) {
          await productsApi.update(editingProduct.product_id, data);
        } else {
          await productsApi.create(data);
        }
        // Reload data from server
        await loadData();
      } else {
        // Offline: Queue & Optimistic Update
        const offlineId = editingProduct ? editingProduct.product_id : `offline_${Date.now()}`;

        await syncService.addToQueue({
          entity: 'product',
          type: editingProduct ? 'update' : 'create',
          payload: editingProduct ? { id: offlineId, data } : data,
        });

        const categoryObj = categoryList.find(c => c.category_id === data.category_id);

        const optimisticProduct: Product = {
          product_id: offlineId,
          user_id: 'offline', // Placeholder
          is_active: true,
          ...data,
          created_at: editingProduct ? editingProduct.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Optimistic UI fields
          category_name: categoryObj?.name,
          category_color: categoryObj?.color,
          supplier_name: undefined,
        } as Product;

        setProductList((prev) => {
          let updatedList;
          if (editingProduct) {
            updatedList = prev.map(p => p.product_id === offlineId ? optimisticProduct : p);
          } else {
            updatedList = [optimisticProduct, ...prev];
          }
          // Update cache
          cache.set(KEYS.PRODUCTS, updatedList);
          return updatedList;
        });

        RNAlert.alert('Mode hors ligne', 'Produit sauvegardé localement. Il sera synchronisé une fois la connexion rétablie.');
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
    } catch {
      RNAlert.alert('Erreur', editingProduct ? 'Impossible de modifier le produit' : 'Impossible de créer le produit');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleStockMovement() {
    if (!selectedProduct || !movQuantity) return;
    setFormLoading(true);
    try {
      if (isConnected) {
        let batch_id = undefined;

        // If adding stock and batch info provided, create batch first
        if (movType === 'in' && movBatchNumber) {
          const batch = await batches.create({
            product_id: selectedProduct.product_id,
            batch_number: movBatchNumber,
            quantity: 0, // Movement will add it
            expiry_date: movExpiryDate ? new Date(movExpiryDate).toISOString() : undefined
          });
          batch_id = batch.batch_id;
        }

        await stockApi.createMovement({
          product_id: selectedProduct.product_id,
          type: movType,
          quantity: parseInt(movQuantity),
          reason: movReason,
          batch_id: batch_id
        });
        await loadData();
      } else {
        RNAlert.alert('Hors ligne', 'Les mouvements de stock ne sont pas encore disponibles hors ligne.');
      }
      setShowStockModal(false);
      setMovQuantity('');
      setMovReason('');
      setMovBatchNumber('');
      setMovExpiryDate('');
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      RNAlert.alert('Erreur', 'Impossible de mettre à jour le stock');
    } finally {
      setFormLoading(false);
    }
  }

  const CAT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b'];

  function openEditCategory(cat: Category) {
    setEditingCategory(cat);
    setCatFormName(cat.name);
    setCatFormColor(cat.color);
  }

  function resetCatForm() {
    setEditingCategory(null);
    setCatFormName('');
    setCatFormColor('#6366f1');
  }

  async function handleSubmitCategory() {
    if (!catFormName.trim()) return;
    if (!isConnected) {
      RNAlert.alert('Hors ligne', 'La gestion des catégories est indisponible hors ligne.');
      return;
    }
    setCatFormLoading(true);
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.category_id, { name: catFormName.trim(), color: catFormColor });
      } else {
        await categoriesApi.create({ name: catFormName.trim(), color: catFormColor });
      }
      resetCatForm();
      const cats = await categoriesApi.list();
      setCategoryList(cats);
      await cache.set(KEYS.CATEGORIES, cats);
    } catch {
      RNAlert.alert('Erreur', 'Impossible de sauvegarder la catégorie');
    } finally {
      setCatFormLoading(false);
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (!isConnected) {
      RNAlert.alert('Hors ligne', 'La suppression de catégorie est indisponible hors ligne.');
      return;
    }
    try {
      await categoriesApi.delete(catId);
      if (selectedCategory === catId) setSelectedCategory(null);
      const cats = await categoriesApi.list();
      setCategoryList(cats);
      await cache.set(KEYS.CATEGORIES, cats);
    } catch {
      RNAlert.alert('Erreur', 'Impossible de supprimer la catégorie');
    }
  }

  function handleDelete(productId: string) {
    const product = productList.find(p => p.product_id === productId);
    RNAlert.alert(
      'Supprimer le produit',
      `Voulez-vous vraiment supprimer "${product?.name ?? 'ce produit'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (isConnected) {
              try {
                await productsApi.delete(productId);
                loadData();
              } catch {
                RNAlert.alert('Erreur', 'Impossible de supprimer');
              }
            } else {
              try {
                await syncService.addToQueue({
                  entity: 'product',
                  type: 'delete',
                  payload: { id: productId }
                });
                setProductList(prev => {
                  const updated = prev.filter(p => p.product_id !== productId);
                  cache.set(KEYS.PRODUCTS, updated);
                  return updated;
                });
                RNAlert.alert('Mode hors ligne', 'Suppression mise en file d\'attente.');
              } catch {
                RNAlert.alert('Erreur', 'Impossible de supprimer hors ligne');
              }
            }
          }
        }
      ]
    );
  }

  function handleBarCodeScanned(data: string) {
    setShowScanner(false);
    if (scannerMode === 'search') {
      setSearch(data);
    } else {
      setFormSku(data);
    }
  }

  function openScanner(mode: 'search' | 'form') {
    setScannerMode(mode);
    setShowScanner(true);
  }

  async function pickImage() {
    RNAlert.alert(
      "Ajouter une photo",
      "Choisissez une source",
      [
        {
          text: "Caméra",
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.granted) {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setFormImage('data:image/jpeg;base64,' + result.assets[0].base64);
              }
            }
          }
        },
        {
          text: "Galerie",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              setFormImage('data:image/jpeg;base64,' + result.assets[0].base64);
            }
          }
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  }

  async function printLabel(product: Product) {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; border: 1px dashed #ccc; width: 300px; margin: auto; }
            h1 { font-size: 24px; margin: 0; }
            p { font-size: 18px; color: #666; margin: 10px 0; }
            .price { font-size: 22px; font-weight: bold; color: #7c3aed; }
            .sku { font-size: 12px; color: #999; margin-top: 10px; }
            .qr { width: 150px; height: 150px; margin-top: 10px; border: 1px solid #eee; }
          </style>
        </head>
        <body>
          <h1>${product.name}</h1>
          <p class="price">${product.selling_price.toLocaleString()} FCFA</p>
          <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${product.sku || product.product_id}" />
          <p class="sku">SKU: ${product.sku || 'N/A'}</p>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      RNAlert.alert('Erreur', 'Impossible de générer l\'étiquette');
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Produits</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingProduct(null); resetForm(); setShowAddModal(true); }}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity onPress={() => openScanner('search')}>
            <Ionicons name="barcode-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.categoryRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, { flex: 1 }]}>
            <TouchableOpacity
              style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                Tous
              </Text>
            </TouchableOpacity>
            {categoryList.map((cat) => (
              <TouchableOpacity
                key={cat.category_id}
                style={[styles.categoryChip, selectedCategory === cat.category_id && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.category_id)}
              >
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat.category_id && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.manageCatBtn} onPress={() => { resetCatForm(); setShowCategoryModal(true); }}>
            <Ionicons name="settings-outline" size={16} color={colors.primaryLight} />
          </TouchableOpacity>
        </View>

        <Text style={styles.resultCount}>{filtered.length} produit(s)</Text>

        {filtered.map((product) => (
          <View key={product.product_id} style={styles.productCard}>
            <View style={styles.productHeader}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productThumb} />
              ) : (
                <View style={[styles.productThumb, { backgroundColor: colors.glassBorder, justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.productTitleRow}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.sku && <Text style={styles.productSku}>{product.sku}</Text>}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(product) }]}>
                  {getStatusLabel(product)}
                </Text>
              </View>
            </View>

            <View style={styles.productDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Stock</Text>
                <Text style={styles.detailValue}>
                  {product.quantity} {product.unit}(s)
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Prix achat</Text>
                <Text style={styles.detailValue}>{product.purchase_price.toLocaleString()} FCFA</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Prix vente</Text>
                <Text style={styles.detailValue}>{product.selling_price.toLocaleString()} FCFA</Text>
              </View>
            </View>

            <View style={styles.productActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openEditModal(product)}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedProduct(product);
                  setMovType('in');
                  setShowStockModal(true);
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Entrée</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedProduct(product);
                  setMovType('out');
                  setShowStockModal(true);
                }}
              >
                <Ionicons name="remove-circle-outline" size={18} color={colors.warning} />
                <Text style={[styles.actionText, { color: colors.warning }]}>Sortie</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => printLabel(product)}
              >
                <Ionicons name="print-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.actionText, { color: colors.textMuted }]}>Étiquette</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(product.product_id)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Add Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setEditingProduct(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <ScrollView style={styles.modalScroll}>
                <TouchableOpacity onPress={pickImage} style={styles.imagePickerBtn}>
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                      <Text style={styles.imagePlaceholderText}>Ajouter une photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <FormField label="Nom *" value={formName} onChangeText={setFormName} placeholder="Nom du produit" />
                <View style={styles.inputRowWithAction}>
                  <View style={{ flex: 1 }}>
                    <FormField label="SKU" value={formSku} onChangeText={setFormSku} placeholder="Référence ou Code-barres" />
                  </View>
                  <TouchableOpacity style={styles.scanBtnMini} onPress={() => openScanner('form')}>
                    <Ionicons name="barcode-outline" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <FormField label="Quantité" value={formQuantity} onChangeText={setFormQuantity} keyboardType="numeric" />
                  </View>
                  <View style={styles.formHalf}>
                    <FormField label="Unité" value={formUnit} onChangeText={setFormUnit} />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <FormField label="Prix achat" value={formPurchasePrice} onChangeText={setFormPurchasePrice} keyboardType="numeric" />
                  </View>
                  <View style={styles.formHalf}>
                    <FormField label="Prix vente" value={formSellingPrice} onChangeText={setFormSellingPrice} keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <FormField label="Stock min" value={formMinStock} onChangeText={setFormMinStock} keyboardType="numeric" />
                  </View>
                  <View style={styles.formHalf}>
                    <FormField label="Stock max" value={formMaxStock} onChangeText={setFormMaxStock} keyboardType="numeric" />
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.submitBtn, formLoading && styles.submitBtnDisabled]}
                  onPress={handleSubmitProduct}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>{editingProduct ? 'Enregistrer' : 'Ajouter'}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Category Management Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gérer les catégories</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Add / Edit form */}
              <View style={styles.catForm}>
                <Text style={styles.formLabel}>{editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</Text>
                <TextInput
                  style={styles.formInput}
                  value={catFormName}
                  onChangeText={setCatFormName}
                  placeholder="Nom de la catégorie"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.formLabel, { marginTop: Spacing.sm }]}>Couleur</Text>
                <View style={styles.colorPicker}>
                  {CAT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color }, catFormColor === color && styles.colorOptionActive]}
                      onPress={() => setCatFormColor(color)}
                    />
                  ))}
                </View>
                <View style={styles.catFormActions}>
                  {editingCategory && (
                    <TouchableOpacity style={styles.catCancelBtn} onPress={resetCatForm}>
                      <Text style={styles.catCancelText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1 }, catFormLoading && styles.submitBtnDisabled]}
                    onPress={handleSubmitCategory}
                    disabled={catFormLoading || !catFormName.trim()}
                  >
                    {catFormLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>{editingCategory ? 'Enregistrer' : 'Ajouter'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Category list */}
              {categoryList.length === 0 ? (
                <Text style={styles.catEmptyText}>Aucune catégorie</Text>
              ) : (
                categoryList.map((cat) => (
                  <View key={cat.category_id} style={styles.catItem}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color, width: 12, height: 12, borderRadius: 6 }]} />
                    <Text style={styles.catItemName}>{cat.name}</Text>
                    <TouchableOpacity onPress={() => openEditCategory(cat)} style={styles.catItemAction}>
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat.category_id)} style={styles.catItemAction}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal visible={showStockModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {movType === 'in' ? 'Entrée de stock' : 'Sortie de stock'}
              </Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedProduct && (
              <Text style={styles.modalSubtitle}>
                {selectedProduct.name} — Stock actuel : {selectedProduct.quantity} {selectedProduct.unit}(s)
              </Text>
            )}
            <FormField
              label="Quantité"
              value={movQuantity}
              onChangeText={setMovQuantity}
              keyboardType="numeric"
              placeholder="Nombre d'unités"
            />
            {movType === 'in' && (
              <>
                <FormField
                  label="Numéro de Lot (Optionnel)"
                  value={movBatchNumber}
                  onChangeText={setMovBatchNumber}
                  placeholder="Ex: LOT2024-001"
                />
                <FormField
                  label="Date de Péremption (AAAA-MM-JJ)"
                  value={movExpiryDate}
                  onChangeText={setMovExpiryDate}
                  placeholder="Ex: 2025-12-31"
                />
              </>
            )}
            <FormField
              label="Raison"
              value={movReason}
              onChangeText={setMovReason}
              placeholder="Raison du mouvement"
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: movType === 'in' ? colors.success : colors.warning },
                formLoading && styles.submitBtnDisabled,
              ]}
              onPress={handleStockMovement}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {movType === 'in' ? 'Valider l\'entrée' : 'Valider la sortie'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleBarCodeScanned}
      />
    </LinearGradient >
  );

  function FormField({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    keyboardType?: 'numeric' | 'default';
  }) {
    return (
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>{label}</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.bgMid }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
        />
      </View>
    );
  }
}


const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
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
    color: colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...glassStyle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: FontSize.md,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  categoryScroll: { marginBottom: Spacing.md },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
  },
  categoryChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  resultCount: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  productCard: {
    ...glassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  productTitleRow: { flex: 1 },
  productName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  productSku: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detailItem: { alignItems: 'center', flex: 1 },
  detailLabel: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgMid,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  modalScroll: { maxHeight: 500 },
  formGroup: { marginBottom: Spacing.md },
  formLabel: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  formInput: {
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: FontSize.md,
    padding: Spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formHalf: { flex: 1 },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  // Category row
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  manageCatBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.xs },
  // Category modal
  catForm: { marginBottom: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  colorOption: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorOptionActive: { borderColor: colors.text, transform: [{ scale: 1.15 }] },
  catFormActions: { flexDirection: 'row', gap: Spacing.sm },
  catCancelBtn: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider, justifyContent: 'center' },
  catCancelText: { color: colors.textSecondary, fontSize: FontSize.sm },
  catEmptyText: { fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
  catItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  catItemName: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  catItemAction: { padding: Spacing.xs },
  // Scanner styles
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  scannerText: {
    color: colors.text,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
  },
  closeScannerBtn: {
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  closeScannerText: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  inputRowWithAction: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scanBtnMini: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    height: 56, // Match FormField height
    justifyContent: 'center',
    alignItems: 'center',
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: Spacing.sm,
    backgroundColor: colors.bgLight,
  },
  imagePickerBtn: {
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
});
