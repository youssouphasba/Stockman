import React, { useCallback, useState, useEffect, useMemo } from 'react';
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
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  sales as salesApi,
  batches,
  ai as aiApi,
  Product,
  ProductVariant,
  Category,
  ProductCreate,
  StockMovement,
  Sale,
  PriceHistory,
  API_URL,
  getToken,
  uploads,
} from '../../services/api';
import PeriodSelector, { Period } from '../../components/PeriodSelector';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { DEFAULT_CATEGORIES, PRODUCT_UNITS, SHARED_CATEGORIES } from '../../constants/defaultCategories';
import CategorySubcategoryPicker from '../../components/CategorySubcategoryPicker';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import { generateAndSharePdf, generateProductLabelPdf } from '../../utils/pdfReports';
import BulkImportModal from '../../components/BulkImportModal';
import { formatCurrency, formatUserCurrency, getCurrencySymbol } from '../../utils/format';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductsScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const styles = getStyles(colors, glassStyle);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const insets = useSafeAreaInsets();

  const canWrite = hasPermission('stock', 'write');
  const { isConnected } = useNetwork();
  const [productList, setProductList] = useState<Product[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'out_of_stock' | 'low_stock' | 'overstock'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Add/Edit product form
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formQuantity, setFormQuantity] = useState('0');
  const [formUnit, setFormUnit] = useState('Pièce');
  const [formPurchasePrice, setFormPurchasePrice] = useState('0');
  const [formSellingPrice, setFormSellingPrice] = useState('0');
  const [formMinStock, setFormMinStock] = useState('0');
  const [formMaxStock, setFormMaxStock] = useState('100');
  const [formCategory, setFormCategory] = useState<string | undefined>(undefined);
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formCategoryName, setFormCategoryName] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formRfidTag, setFormRfidTag] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [inventoryValues, setInventoryValues] = useState<Record<string, string>>({});
  const [forecastData, setForecastData] = useState<any>(null);

  // Variants
  const [formHasVariants, setFormHasVariants] = useState(false);
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantIdx, setEditingVariantIdx] = useState<number | null>(null);
  const [varName, setVarName] = useState('');
  const [varSku, setVarSku] = useState('');
  const [varQty, setVarQty] = useState('0');
  const [varPurchasePrice, setVarPurchasePrice] = useState('');
  const [varSellingPrice, setVarSellingPrice] = useState('');

  // AI auto-categorization & description
  const [aiCatLoading, setAiCatLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiPriceLoading, setAiPriceLoading] = useState(false);
  const [aiPriceReasoning, setAiPriceReasoning] = useState('');
  const [formDescription, setFormDescription] = useState('');

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
  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('products');

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  // Search Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // LayoutAnimation triggered on search / filter changes
  useEffect(() => {
    if (!loading) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [debouncedSearch, filterType, selectedCategory]);

  // History state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<Period>(7);
  const [historyStartDate, setHistoryStartDate] = useState<Date | undefined>(undefined);
  const [historyEndDate, setHistoryEndDate] = useState<Date | undefined>(undefined);
  const [historyMovements, setHistoryMovements] = useState<StockMovement[]>([]);
  const [historySales, setHistorySales] = useState<Sale[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<'stock' | 'finance' | 'price'>('stock');
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [showAllSalesHistory, setShowAllSalesHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (isConnected) {
        const [prodsRes, cats, forecast] = await Promise.all([
          productsApi.list(selectedCategory ?? undefined, 0, 500),
          categoriesApi.list(),
          salesApi.forecast(),
        ]);
        const prods = prodsRes.items ?? prodsRes;
        setProductList(prods as Product[]);
        setCategoryList(cats);
        setForecastData(forecast);
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, selectedCategory, user?.active_store_id]);

  const handleExportHistoryCSV = async () => {
    if (!selectedProduct) return;
    try {
      const token = await getToken();
      if (!token) return;

      const params = new URLSearchParams();
      params.set('product_id', selectedProduct.product_id);

      if (historyPeriod === 'custom' && historyStartDate && historyEndDate) {
        params.set('start_date', historyStartDate.toISOString().split('T')[0]);
        params.set('end_date', historyEndDate.toISOString().split('T')[0]);
      } else if (historyPeriod !== 'custom') {
        params.set('days', historyPeriod.toString());
      }

      params.set('token', token);
      const url = `${API_URL}/export/stock/csv?${params.toString()}`;
      Linking.openURL(url);
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('products.error_export_history'));
    }
  };

  async function loadHistory(period: Period, start?: Date, end?: Date) {
    if (!selectedProduct) return;
    setHistoryLoading(true);
    try {
      const days = period === 'custom' ? undefined : period;
      const sDate = start ? start.toISOString().split('T')[0] : undefined;
      const eDate = end ? end.toISOString().split('T')[0] : undefined;

      const [movsRes, salesRes] = await Promise.all([
        stockApi.getMovements(selectedProduct.product_id, days, sDate, eDate),
        salesApi.list(undefined, days, sDate, eDate, selectedProduct.product_id)
      ]);
      setHistoryMovements(movsRes.items ?? movsRes as any);
      setHistorySales(salesRes.items ?? salesRes as any);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadPriceHistory() {
    if (!selectedProduct) return;
    setPriceHistoryLoading(true);
    try {
      const history = await productsApi.getPriceHistory(selectedProduct.product_id);
      setPriceHistory(history);
    } catch (error) {
      console.error("Failed to load price history", error);
    } finally {
      setPriceHistoryLoading(false);
    }
  }

  async function openHistoryModal(product: Product) {
    setSelectedProduct(product);
    setHistoryPeriod(7); // Default to 7 days
    setHistoryStartDate(undefined);
    setHistoryEndDate(undefined);
    setShowAllMovements(false);
    setShowAllSalesHistory(false);
    setShowHistoryModal(true);
    // Data will be loaded by the useEffect
  }

  // Effect to reload history when period changes
  useEffect(() => {
    if (showHistoryModal && selectedProduct) {
      if (historyPeriod !== 'custom') {
        loadHistory(historyPeriod);
      } else if (historyStartDate && historyEndDate) {
        loadHistory(historyPeriod, historyStartDate, historyEndDate);
      }
    }
  }, [historyPeriod, historyStartDate, historyEndDate, showHistoryModal, selectedProduct?.product_id]);

  useEffect(() => {
    if (showHistoryModal && selectedProduct && historyTab === 'price') {
      loadPriceHistory();
    }
  }, [showHistoryModal, selectedProduct?.product_id, historyTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  const filtered = useMemo(() => {
    if (!productList) return [];
    return productList.filter((p) => {
      const searchTerms = debouncedSearch.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchTerms) ||
        p.sku?.toLowerCase().includes(searchTerms);

      let matchesFilter = true;
      if (filterType === 'out_of_stock') matchesFilter = p.quantity === 0;
      else if (filterType === 'low_stock') matchesFilter = p.min_stock > 0 && p.quantity <= p.min_stock;
      else if (filterType === 'overstock') matchesFilter = p.max_stock > 0 && p.quantity >= p.max_stock;

      return matchesSearch && matchesFilter;
    });
  }, [productList, search, filterType]);

  function getStatusColor(product: Product) {
    if (product.quantity === 0) return colors.danger;
    if (product.min_stock > 0 && product.quantity <= product.min_stock) return colors.warning;
    if (product.max_stock > 0 && product.quantity >= product.max_stock) return colors.info;
    return colors.success;
  }

  function getStatusLabel(product: Product) {
    if (product.quantity === 0) return t('products.out_of_stock');
    if (product.min_stock > 0 && product.quantity <= product.min_stock) return t('products.low_stock');
    if (product.max_stock > 0 && product.quantity >= product.max_stock) return t('products.overstock');
    return t('products.normal');
  }

  function getExpiryWarningColor(expiryDate: string) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return colors.danger;
    if (diffDays <= 7) return colors.warning;
    return colors.info;
  }

  function getExpiryLabel(expiryDate: string) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return t('products.expired');
    if (diffDays === 0) return t('products.expiry_today');
    if (diffDays === 1) return t('products.expiry_tomorrow');
    if (diffDays <= 7) return t('products.expiry_in_days', { count: diffDays });
    return t('products.expiry_date', { date: expiry.toLocaleDateString() });
  }

  const handleExportCSV = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category_id', selectedCategory);
      params.set('token', token);
      const url = `${API_URL}/export/products/csv?${params.toString()}`;
      Linking.openURL(url);
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('products.error_export_products'));
    }
  };

  async function handleAiCategorize() {
    const name = formName.trim();
    if (!name || name.length < 2) return;
    if (!isConnected) {
      Alert.alert('Hors ligne', 'La suggestion IA nécessite une connexion internet.');
      return;
    }
    setAiCatLoading(true);
    try {
      const result = await aiApi.suggestCategory(name);
      const cat = result.category;
      const sub = result.subcategory;
      setFormCategoryName(cat);
      setFormSubcategory(sub);
      // Find or create category
      const existing = categoryList.find(c => c.name === cat);
      if (existing) {
        setFormCategory(existing.category_id);
      } else {
        const info = SHARED_CATEGORIES[cat];
        if (info) {
          const created = await categoriesApi.create({ name: cat, color: info.color, icon: info.icon || 'cube-outline' });
          setFormCategory(created.category_id);
          loadData();
        }
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de suggérer une catégorie');
    } finally {
      setAiCatLoading(false);
    }
  }

  async function handleAiPrice() {
    if (!editingProduct) {
      Alert.alert('Info', 'La suggestion de prix est disponible uniquement pour les produits existants (avec un historique de ventes).');
      return;
    }
    if (!isConnected) {
      Alert.alert('Hors ligne', 'La suggestion IA nécessite une connexion internet.');
      return;
    }
    setAiPriceLoading(true);
    setAiPriceReasoning('');
    try {
      const result = await aiApi.suggestPrice(editingProduct.product_id);
      setFormSellingPrice(String(result.suggested_price));
      setAiPriceReasoning(result.reasoning);
    } catch {
      Alert.alert('Erreur', 'Impossible de suggérer un prix');
    } finally {
      setAiPriceLoading(false);
    }
  }

  async function handleAiDescription() {
    const name = formName.trim();
    if (!name || name.length < 2) return;
    if (!isConnected) {
      Alert.alert('Hors ligne', 'La génération IA nécessite une connexion internet.');
      return;
    }
    setAiDescLoading(true);
    try {
      const result = await aiApi.generateDescription(name, formCategoryName || undefined, formSubcategory || undefined);
      setFormDescription(result.description);
    } catch {
      Alert.alert('Erreur', 'Impossible de générer la description');
    } finally {
      setAiDescLoading(false);
    }
  }

  function resetForm() {
    setFormName('');
    setFormSku('');
    setFormQuantity('0');
    setFormUnit('Pièce');
    setFormPurchasePrice('0');
    setFormSellingPrice('0');
    setFormMinStock('0');
    setFormMaxStock('100');
    setFormCategory(undefined);
    setFormSubcategory('');
    setFormCategoryName('');
    setFormImage(null);
    setFormRfidTag('');
    setFormExpiryDate('');
    setFormDescription('');
    setAiPriceReasoning('');
    setFormHasVariants(false);
    setFormVariants([]);
  }

  function resetVariantForm() {
    setVarName('');
    setVarSku('');
    setVarQty('0');
    setVarPurchasePrice('');
    setVarSellingPrice('');
    setEditingVariantIdx(null);
  }

  function openVariantForm(idx?: number) {
    if (idx !== undefined) {
      const v = formVariants[idx];
      setVarName(v.name);
      setVarSku(v.sku || '');
      setVarQty(String(v.quantity));
      setVarPurchasePrice(v.purchase_price != null ? String(v.purchase_price) : '');
      setVarSellingPrice(v.selling_price != null ? String(v.selling_price) : '');
      setEditingVariantIdx(idx);
    } else {
      resetVariantForm();
    }
    setShowVariantForm(true);
  }

  function saveVariant() {
    if (!varName.trim()) return;
    const variant: ProductVariant = {
      variant_id: editingVariantIdx !== null ? formVariants[editingVariantIdx].variant_id : `var_temp_${Date.now()}`,
      name: varName.trim(),
      sku: varSku.trim() || undefined,
      quantity: parseInt(varQty) || 0,
      purchase_price: varPurchasePrice ? parseFloat(varPurchasePrice) : undefined,
      selling_price: varSellingPrice ? parseFloat(varSellingPrice) : undefined,
      is_active: true,
    };
    if (editingVariantIdx !== null) {
      setFormVariants(prev => prev.map((v, i) => i === editingVariantIdx ? variant : v));
    } else {
      setFormVariants(prev => [...prev, variant]);
    }
    setShowVariantForm(false);
    resetVariantForm();
    // Auto-update total quantity
    const allVariants = editingVariantIdx !== null
      ? formVariants.map((v, i) => i === editingVariantIdx ? variant : v)
      : [...formVariants, variant];
    setFormQuantity(String(allVariants.reduce((sum, v) => sum + v.quantity, 0)));
  }

  function removeVariant(idx: number) {
    const updated = formVariants.filter((_, i) => i !== idx);
    setFormVariants(updated);
    setFormQuantity(String(updated.reduce((sum, v) => sum + v.quantity, 0)));
    if (updated.length === 0) setFormHasVariants(false);
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
    setFormSubcategory(product.subcategory || '');
    // Resolve category name from categoryList
    const cat = categoryList.find(c => c.category_id === product.category_id);
    setFormCategoryName(cat?.name || '');
    setFormImage(product.image || null);
    setFormRfidTag(product.rfid_tag || '');
    setFormExpiryDate(product.expiry_date ? product.expiry_date.split('T')[0] : '');
    setFormDescription(product.description || '');
    setFormHasVariants(product.has_variants || false);
    setFormVariants(product.variants || []);
    setShowAddModal(true);
  }

  async function handleAdjustStock(product: Product, actualQuantityText: string) {
    const actualQuantity = parseInt(actualQuantityText);
    if (isNaN(actualQuantity)) {
      Alert.alert(t('common.error'), t('products.error_invalid_quantity'));
      return;
    }

    const performAdjust = async () => {
      try {
        await productsApi.adjustStock(product.product_id, actualQuantity);

        // Update local state
        setProductList(prev => prev.map(p =>
          p.product_id === product.product_id
            ? { ...p, quantity: actualQuantity, updated_at: new Date().toISOString() }
            : p
        ));

        // Clear specific inventory value
        setInventoryValues(prev => {
          const next = { ...prev };
          delete next[product.product_id];
          return next;
        });
      } catch (error: any) {
        Alert.alert("Erreur", error.message || "Échec de l'ajustement du stock");
      }
    };

    const msg = t('products.confirm_adjust_stock', {
      name: product.name,
      oldQty: product.quantity,
      newQty: actualQuantity
    });

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        await performAdjust();
      }
    } else {
      Alert.alert(
        t('products.confirm_inventory'),
        msg,
        [
          { text: t('common.cancel'), style: "cancel" },
          { text: t('common.confirm'), onPress: performAdjust }
        ]
      );
    }
  }

  async function handleSubmitProduct() {
    if (!formName.trim()) return;
    setFormLoading(true);
    try {
      const data: ProductCreate = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        sku: formSku.trim() || undefined,
        quantity: parseInt(formQuantity) || 0,
        unit: formUnit,
        purchase_price: parseFloat(formPurchasePrice) || 0,
        selling_price: parseFloat(formSellingPrice) || 0,
        min_stock: parseInt(formMinStock) || 0,
        max_stock: parseInt(formMaxStock) || 100,
        category_id: formCategory,
        subcategory: formSubcategory || undefined,
        image: formImage || undefined,
        rfid_tag: formRfidTag || undefined,
        expiry_date: formExpiryDate ? new Date(formExpiryDate).toISOString() : undefined,
        variants: formHasVariants ? formVariants : [],
        has_variants: formHasVariants,
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

        Alert.alert('Mode hors ligne', 'Produit sauvegardé localement. Il sera synchronisé une fois la connexion rétablie.');
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
    } catch {
      Alert.alert('Erreur', editingProduct ? 'Impossible de modifier le produit' : 'Impossible de créer le produit');
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
        Alert.alert('Hors ligne', 'Les mouvements de stock ne sont pas encore disponibles hors ligne.');
      }
      setShowStockModal(false);
      setMovQuantity('');
      setMovReason('');
      setMovBatchNumber('');
      setMovExpiryDate('');
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le stock');
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
      Alert.alert('Hors ligne', 'La gestion des catégories est indisponible hors ligne.');
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
      Alert.alert('Erreur', 'Impossible de sauvegarder la catégorie');
    } finally {
      setCatFormLoading(false);
    }
  }

  async function handleImportDefaults() {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'L\'importation nécessite une connexion internet.');
      return;
    }

    // Check if categories already exist to warn user
    if (categoryList.length > 5) {
      Alert.alert(
        'Attention',
        'Vous avez déjà plusieurs catégories. Voulez-vous vraiment importer les catégories standards ? Cela pourrait créer des doublons.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Importer', onPress: processImport }
        ]
      );
    } else {
      processImport();
    }
  }

  async function processImport() {
    setCatFormLoading(true);
    try {
      // Find existing names to avoid duplicates (case insensitive)
      const existingNames = new Set(categoryList.map(c => c.name.toLowerCase()));
      let importedCount = 0;

      for (const defCat of DEFAULT_CATEGORIES) {
        if (!existingNames.has(defCat.name.toLowerCase())) {
          await categoriesApi.create(defCat);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        const cats = await categoriesApi.list();
        setCategoryList(cats);
        await cache.set(KEYS.CATEGORIES, cats);
        Alert.alert('Succès', `${importedCount} catégories importées.`);
      } else {
        Alert.alert('Info', 'Toutes les catégories existent déjà.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'import.');
    } finally {
      setCatFormLoading(false);
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'La suppression de catégorie est indisponible hors ligne.');
      return;
    }
    try {
      await categoriesApi.delete(catId);
      if (selectedCategory === catId) setSelectedCategory(null);
      const cats = await categoriesApi.list();
      setCategoryList(cats);
      await cache.set(KEYS.CATEGORIES, cats);
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer la catégorie');
    }
  }

  function handleDelete(productId: string) {
    const product = productList.find(p => p.product_id === productId);
    Alert.alert(
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
                Alert.alert('Erreur', 'Impossible de supprimer');
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
                Alert.alert('Mode hors ligne', 'Suppression mise en file d\'attente.');
              } catch {
                Alert.alert('Erreur', 'Impossible de supprimer hors ligne');
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
      // Logic: If product exists with this SKU, open edit. Otherwise start add flow.
      const found = productList.find(p => p.sku === data);
      if (found) {
        openEditModal(found);
      } else {
        // Not found: Start add flow with SKU pre-filled
        setEditingProduct(null);
        resetForm();
        setFormSku(data);
        setShowAddModal(true);
      }
    } else {
      setFormSku(data);
    }
  }

  function openScanner(mode: 'search' | 'form') {
    setScannerMode(mode);
    setShowScanner(true);
  }

  async function uploadToServer(base64: string) {
    setImageUploading(true);
    try {
      const result = await uploads.image(base64, 'products');
      setFormImage(result.url);
    } catch {
      // Fallback: store base64 locally if upload fails
      setFormImage('data:image/jpeg;base64,' + base64);
    } finally {
      setImageUploading(false);
    }
  }

  async function pickImage() {
    Alert.alert(
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
                quality: 0.6,
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                uploadToServer(result.assets[0].base64);
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
              quality: 0.6,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              uploadToServer(result.assets[0].base64);
            }
          }
        },
        {
          text: "Supprimer la photo",
          style: "destructive",
          onPress: () => setFormImage(null),
        },
        { text: "Annuler", style: "cancel" }
      ]
    );
  }

  function toggleSelection(id: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedProductIds.size === filtered.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filtered.map(p => p.product_id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedProductIds.size === 0) return;
    Alert.alert(
      'Suppression groupée',
      `Voulez-vous supprimer les ${selectedProductIds.size} produits sélectionnés ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const ids = Array.from(selectedProductIds);
              for (const id of ids) {
                await productsApi.delete(id);
              }
              setSelectedProductIds(new Set());
              setIsSelectionMode(false);
              await loadData();
              Alert.alert(t('common.success'), t('products.success_deleted'));
            } catch (error) {
              Alert.alert(t('common.error'), t('products.error_delete_failed'));
              await loadData();
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  async function handleBulkCategoryUpdate(catId: string) {
    if (selectedProductIds.size === 0) return;
    setLoading(true);
    try {
      const ids = Array.from(selectedProductIds);
      for (const id of ids) {
        await productsApi.update(id, { category_id: catId } as any);
      }
      setSelectedProductIds(new Set());
      setIsSelectionMode(false);
      await loadData();
      Alert.alert(t('common.success'), t('products.success_categories_updated'));
    } catch (error) {
      Alert.alert(t('common.error'), t('products.error_categories_update_failed'));
    } finally {
      setLoading(false);
    }
  }

  async function exportCatalog() {
    const list = selectedProductIds.size > 0
      ? productList.filter(p => selectedProductIds.has(p.product_id))
      : filtered;

    if (list.length === 0) {
      Alert.alert(t('common.info'), t('products.error_no_products_to_export'));
      return;
    }

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { 
              font-family: 'Helvetica', sans-serif; 
              padding: 20px; 
              background-color: #ffffff; 
              margin: 0;
            }
            h1 { text-align: center; color: #7c3aed; margin-bottom: 30px; font-size: 24px; }
            .grid { 
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              justify-content: center;
            }
            .card { 
              border: 1px solid #f0f0f0; 
              border-radius: 12px; 
              padding: 15px; 
              text-align: center; 
              width: 160px;
              background-color: #ffffff;
            }
            .price { font-weight: bold; color: #7c3aed; margin-top: 10px; font-size: 18px; }
            .name { font-weight: 600; margin-top: 10px; font-size: 14px; color: #333; height: 40px; overflow: hidden; }
            img { width: 140px; height: 140px; object-fit: cover; border-radius: 8px; background-color: #f9f9f9; }
            .placeholder { width: 140px; height: 140px; background: #f8f9fa; border-radius: 8px; margin: auto; display: flex; align-items: center; justify-content: center; font-size: 40px; }
          </style>
        </head>
        <body>
          <h1>${user?.name || t('common.my_store')} - ${t('products.catalog_title')}</h1>
          <div class="grid">
            ${list.map(p => `
              <div class="card">
                ${p.image ? `<img src="${uploads.getFullUrl(p.image) || p.image}" />` : '<div class="placeholder">📦</div>'}
                <div class="name">${p.name}</div>
                <div class="price">${formatUserCurrency(p.selling_price, user)}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentWindow?.document.open();
        iframe.contentWindow?.document.write(html);
        iframe.contentWindow?.document.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('products.error_export_catalog_failed'));
    }
  }

  async function printLabel(product: Product) {
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { 
              margin: 0; 
              padding: 0; 
              background-color: #ffffff; 
              width: 50mm; 
              height: 30mm; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center;
              font-family: 'Helvetica', sans-serif;
            }
            .container {
              width: 100%;
              text-align: center;
              padding: 2mm;
              box-sizing: border-box;
            }
            h1 { font-size: 14px; margin: 0; color: #000; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
            .price { font-size: 16px; font-weight: bold; color: #7c3aed; margin: 1mm 0; }
            .qr { width: 14mm; height: 14mm; margin: 1mm auto; display: block; }
            .sku { font-size: 8px; color: #666; margin-top: 1mm; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${product.name}</h1>
            <div class="price">${formatUserCurrency(product.selling_price, user)}</div>
            <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${product.sku || product.product_id}" />
            <div class="sku">SKU: ${product.sku || product.product_id.slice(-6).toUpperCase()}</div>
          </div>
        </body>
      </html>
    `;
    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.contentWindow?.document.open();
        iframe.contentWindow?.document.write(html);
        iframe.contentWindow?.document.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('products.error_print_label_failed'));
    }
  }

  async function exportInventoryPdf() {
    if (filtered.length === 0) {
      Alert.alert(t('common.info'), t('products.error_no_products_to_export'));
      return;
    }
    const totalValue = filtered.reduce((s, p) => s + p.quantity * p.purchase_price, 0);
    const lowStock = filtered.filter((p) => p.quantity <= p.min_stock).length;
    const outOfStock = filtered.filter((p) => p.quantity === 0).length;

    try {
      await generateAndSharePdf({
        storeName: user?.name || t('common.my_store'),
        reportTitle: t('products.inventory_report_title'),
        subtitle: t('products.product_count', { count: filtered.length }),
        kpis: [
          { label: 'Produits', value: filtered.length.toString() },
          { label: 'Valeur stock', value: formatUserCurrency(totalValue, user) },
          { label: 'Stock bas', value: lowStock.toString(), color: '#FF9800' },
          { label: 'Ruptures', value: outOfStock.toString(), color: '#f44336' },
        ],
        sections: [{
          title: 'État du stock',
          headers: ['Produit', 'Catégorie', 'Qté', 'Unité', 'P. Achat', 'P. Vente', 'Valeur'],
          alignRight: [2, 4, 5, 6],
          rows: filtered.map((p) => {
            const cat = categoryList.find((c: Category) => c.category_id === p.category_id);
            return [
              p.name,
              cat?.name || '-',
              p.quantity.toString(),
              p.unit,
              formatUserCurrency(p.purchase_price, user),
              formatUserCurrency(p.selling_price, user),
              formatUserCurrency(p.quantity * p.purchase_price, user),
            ];
          }),
        }],
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.content}>
          <View style={[styles.headerRow, { marginTop: insets.top }]}>
            <Skeleton width={150} height={28} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton circle width={40} height={40} />
              <Skeleton circle width={40} height={40} />
            </View>
          </View>
          <Skeleton width="100%" height={50} style={{ marginBottom: 20, borderRadius: BorderRadius.md }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={120} style={{ marginBottom: 12, borderRadius: BorderRadius.md }} />
          ))}
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
        <View style={{ paddingTop: Spacing.xs }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            <TouchableOpacity
              style={[styles.iconBtn, isInventoryMode && { backgroundColor: colors.primary + '20' }]}
              onPress={() => {
                setIsInventoryMode(!isInventoryMode);
                if (!isInventoryMode) {
                  setInventoryValues({});
                }
                Alert.alert(
                  isInventoryMode ? t('products.normal_mode') : t('products.inventory_mode'),
                  isInventoryMode ? t('products.normal_mode_desc') : t('products.inventory_mode_desc')
                );
              }}
            >
              <Ionicons name="clipboard-outline" size={20} color={isInventoryMode ? colors.primary : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={exportInventoryPdf}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleExportCSV}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            {canWrite && (
              <>
                <TouchableOpacity
                  style={[styles.iconBtn, isSelectionMode && { backgroundColor: colors.primary + '30', borderColor: colors.primary }]}
                  onPress={() => {
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) setSelectedProductIds(new Set());
                  }}
                >
                  <Ionicons name={isSelectionMode ? "close" : "list-outline"} size={20} color={isSelectionMode ? colors.primaryLight : colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.info + '20' }]}
                  onPress={() => router.push('/inventory/batch-scan')}
                >
                  <Ionicons name="scan-outline" size={20} color={colors.info} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: colors.secondary + '20' }]}
                  onPress={() => setShowBulkImportModal(true)}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color={colors.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtn} onPress={() => {
                  setEditingProduct(null);
                  resetForm();
                  setShowAddModal(true);
                }}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>

        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('products.search_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {canWrite && (
            <TouchableOpacity onPress={() => openScanner('search')}>
              <Ionicons name="barcode-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>{t('common.all')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterType === 'out_of_stock' && styles.filterChipActive, { borderColor: colors.danger }]}
              onPress={() => setFilterType('out_of_stock')}
            >
              <Text style={[styles.filterChipText, filterType === 'out_of_stock' && styles.filterChipTextActive, { color: filterType === 'out_of_stock' ? '#fff' : colors.danger }]}>{t('products.out_of_stock')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterType === 'low_stock' && styles.filterChipActive, { borderColor: colors.warning }]}
              onPress={() => setFilterType('low_stock')}
            >
              <Text style={[styles.filterChipText, filterType === 'low_stock' && styles.filterChipTextActive, { color: filterType === 'low_stock' ? '#fff' : colors.warning }]}>{t('products.low_stock')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filterType === 'overstock' && styles.filterChipActive, { borderColor: colors.info }]}
              onPress={() => setFilterType('overstock')}
            >
              <Text style={[styles.filterChipText, filterType === 'overstock' && styles.filterChipTextActive, { color: filterType === 'overstock' ? '#fff' : colors.info }]}>{t('products.overstock')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.categoryRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, { flex: 1 }]}>
            <TouchableOpacity
              style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                {t('common.all')}
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
          {canWrite && (
            <TouchableOpacity style={styles.manageCatBtn} onPress={() => { resetCatForm(); setShowCategoryModal(true); }}>
              <Ionicons name="settings-outline" size={16} color={colors.primaryLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Valuation Card */}
        <View style={styles.valuationCard}>
          <View style={styles.valuationInfo}>
            <Text style={styles.valuationLabel}>{t('products.total_stock_value_label')}</Text>
            <Text style={styles.valuationValue}>
              {formatUserCurrency(productList.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0), user)}
            </Text>
          </View>
          <View style={styles.valuationBadge}>
            <Ionicons name="trending-up" size={20} color={colors.success} />
          </View>
        </View>

        <Text style={styles.resultCount}>{t('products.product_count', { count: filtered.length })}</Text>

        {filtered.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? t('common.no_results') : t('products.no_products')}
            message={debouncedSearch
              ? t('products.no_results_for', { query: debouncedSearch })
              : t('products.no_products_desc')}
            icon={debouncedSearch ? "search-outline" : "cube-outline"}
            actionLabel={debouncedSearch ? t('common.clear_search') : t('products.add_product')}
            onAction={() => {
              if (debouncedSearch) {
                setSearch('');
              } else {
                setEditingProduct(null);
                resetForm();
                setShowAddModal(true);
              }
            }}
          />
        ) : (
          filtered.map((product) => {
            const margin = product.selling_price - product.purchase_price;
            const roi = product.purchase_price > 0 ? (margin / product.purchase_price) * 100 : 0;

            return (
              <TouchableOpacity
                key={product.product_id}
                style={[styles.productCard, isSelectionMode && selectedProductIds.has(product.product_id) && { borderColor: colors.primary, borderWidth: 1 }]}
                onPress={() => isSelectionMode ? toggleSelection(product.product_id) : null}
                activeOpacity={isSelectionMode ? 0.7 : 1}
              >
                {isSelectionMode && (
                  <View style={styles.selectionIndicator}>
                    <Ionicons
                      name={selectedProductIds.has(product.product_id) ? "checkbox" : "square-outline"}
                      size={24}
                      color={selectedProductIds.has(product.product_id) ? colors.primary : colors.textMuted}
                    />
                  </View>
                )}
                <View style={styles.productHeader}>
                  <View>
                    {product.image ? (
                      <Image
                        source={{ uri: uploads.getFullUrl(product.image) || product.image }}
                        style={styles.productThumb}
                      />
                    ) : (
                      <View style={[styles.productThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {product.sku && <Text style={styles.productSku}>{product.sku}</Text>}
                      <View style={[styles.marginBadge, { backgroundColor: margin > 0 ? colors.success + '15' : colors.danger + '15' }]}>
                        <Text style={[styles.marginText, { color: margin > 0 ? colors.success : colors.danger }]}>
                          +{formatUserCurrency(margin, user)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(product) }]}>
                      {getStatusLabel(product)}
                    </Text>
                  </View>
                  {product.expiry_date && (
                    <View style={[styles.expiryBadge, { backgroundColor: getExpiryWarningColor(product.expiry_date) }]}>
                      <Ionicons name="time-outline" size={12} color="#fff" />
                      <Text style={styles.expiryBadgeText}>{getExpiryLabel(product.expiry_date)}</Text>
                    </View>
                  )}
                </View>

                {isInventoryMode ? (
                  <View style={styles.inventoryReconciliation}>
                    <View style={styles.inventoryInfo}>
                      <Text style={styles.detailLabel}>{t('products.current_stock')}</Text>
                      <Text style={styles.detailValue}>{product.quantity}</Text>
                    </View>
                    <View style={styles.inventoryInputContainer}>
                      <Text style={styles.detailLabel}>{t('products.actual_stock')}</Text>
                      <TextInput
                        style={styles.inventoryInput}
                        keyboardType="numeric"
                        value={inventoryValues[product.product_id] !== undefined ? inventoryValues[product.product_id] : product.quantity.toString()}
                        onChangeText={(val) => setInventoryValues(prev => ({ ...prev, [product.product_id]: val }))}
                        placeholder="..."
                      />
                    </View>
                    <View style={styles.inventoryActions}>
                      {(inventoryValues[product.product_id] === undefined || parseInt(inventoryValues[product.product_id]) === product.quantity) ? (
                        <TouchableOpacity
                          style={[styles.inventoryBtn, { backgroundColor: colors.success + '20' }]}
                          onPress={() => handleAdjustStock(product, product.quantity.toString())}
                        >
                          <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.inventoryBtn, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleAdjustStock(product, inventoryValues[product.product_id])}
                        >
                          <Ionicons name="save-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.productDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('products.stock_label')}</Text>
                        <Text style={styles.detailValue}>
                          {product.quantity} {t(product.unit === 'Pièce' ? 'products.unit_piece' : 'products.unit_units', { count: product.quantity })}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('products.trend_forecast')}</Text>
                        {(() => {
                          const forecast = forecastData?.products?.find((f: any) => f.product_id === product.product_id);
                          if (!forecast) {
                            return <Text style={styles.detailValue}>--</Text>;
                          }
                          const trendIcon = forecast.trend === 'up' ? 'trending-up' : forecast.trend === 'down' ? 'trending-down' : 'remove';
                          const trendColor = forecast.trend === 'up' ? colors.success : forecast.trend === 'down' ? colors.danger : colors.textMuted;

                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Ionicons name={trendIcon as any} size={16} color={trendColor} />
                              <Text style={[styles.detailValue, { color: trendColor }]}>
                                {forecast.predicted_sales_7d} prédits (7j)
                              </Text>
                            </View>
                          );
                        })()}
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{t('products.stock_value')}</Text>
                        <Text style={styles.detailValue}>{formatUserCurrency(product.quantity * product.purchase_price, user)}</Text>
                      </View>
                    </View>

                    {/* Variants display */}
                    {product.has_variants && product.variants && product.variants.length > 0 && (
                      <View style={{ marginTop: Spacing.sm, padding: Spacing.sm, backgroundColor: colors.glass, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder }}>
                        <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>{t('products.variants')}</Text>
                        {product.variants.map(v => (
                          <View key={v.variant_id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                            <Text style={{ color: colors.text, fontSize: 12 }}>{v.name}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{v.quantity} {t(product.unit === 'Pièce' ? 'products.unit_piece' : 'products.unit_units', { count: v.quantity })}{v.selling_price != null ? ` · ${formatUserCurrency(v.selling_price, user)}` : ''}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {!isSelectionMode && (
                      <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.secondary + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                          onPress={() => openHistoryModal(product)}
                        >
                          <Ionicons name="time-outline" size={16} color={colors.secondary} />
                          <Text style={[styles.actionText, { color: colors.secondary }]}>{t('products.history')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                          onPress={() => openEditModal(product)}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.primary} />
                          <Text style={[styles.actionText, { color: colors.primary }]}>{t('products.edit')}</Text>
                        </TouchableOpacity>

                        {canWrite && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: colors.success + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                              onPress={() => {
                                setSelectedProduct(product);
                                setMovType('in');
                                setShowStockModal(true);
                              }}
                            >
                              <Ionicons name="add-circle-outline" size={16} color={colors.success} />
                              <Text style={[styles.actionText, { color: colors.success }]}>{t('products.add_stock')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: colors.warning + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                              onPress={() => {
                                setSelectedProduct(product);
                                setMovType('out');
                                setShowStockModal(true);
                              }}
                            >
                              <Ionicons name="remove-circle-outline" size={16} color={colors.warning} />
                              <Text style={[styles.actionText, { color: colors.warning }]}>{t('products.remove_stock')}</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.textMuted + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                          onPress={() => printLabel(product)}
                        >
                          <Ionicons name="print-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        {canWrite && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.danger + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                            onPress={() => handleDelete(product.product_id)}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {
          isSelectionMode && (
            <View style={styles.selectionToolbar}>
              <View style={styles.selectionInfo}>
                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
                  <Ionicons
                    name={selectedProductIds.size === filtered.length ? "checkbox" : "square-outline"}
                    size={20}
                    color={colors.primaryLight}
                  />
                  <Text style={styles.selectAllText}>{t('products.all')} ({selectedProductIds.size})</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.selectionActions}>
                <TouchableOpacity style={styles.selectionActionBtn} onPress={exportCatalog}>
                  <Ionicons name="share-social-outline" size={20} color={colors.primaryLight} />
                  <Text style={styles.selectionActionText}>{t('products.catalog')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectionActionBtn, { borderColor: colors.danger + '40' }]} onPress={handleBulkDelete}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  <Text style={[styles.selectionActionText, { color: colors.danger }]}>{t('products.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }

        <View style={{ height: Spacing.xl }} />
      </ScrollView >

      {/* Add Product Modal */}
      < Modal visible={showAddModal} animationType="slide" transparent >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? t('products.edit_product') : t('products.add_product')}</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setEditingProduct(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              >
                <TouchableOpacity onPress={pickImage} style={styles.imagePickerBtn} disabled={imageUploading}>
                  {imageUploading ? (
                    <View style={styles.imagePlaceholder}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.imagePlaceholderText, { marginTop: 8 }]}>{t('products.uploading')}</Text>
                    </View>
                  ) : formImage ? (
                    <Image source={{ uri: uploads.getFullUrl(formImage) || formImage }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                      <Text style={styles.imagePlaceholderText}>{t('products.add_photo')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={styles.inputRowWithAction}>
                  <View style={{ flex: 1 }}>
                    <FormField label={t('products.field_name')} value={formName} onChangeText={setFormName} placeholder={t('products.field_name_placeholder')} colors={colors} styles={styles} />
                  </View>
                  <TouchableOpacity
                    style={[styles.scanBtnMini, { backgroundColor: colors.primary + '15' }]}
                    onPress={handleAiCategorize}
                    disabled={aiCatLoading || !formName.trim()}
                  >
                    {aiCatLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="sparkles" size={20} color={!formName.trim() ? colors.textMuted : colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                {/* AI hint for categorization */}
                {!formCategoryName && formName.trim().length > 0 && !aiCatLoading && (
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, marginTop: -2 }}>
                    {t('products.ai_cat_hint')}
                  </Text>
                )}
                <View>
                  <View style={styles.inputRowWithAction}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { marginBottom: 5 }]}>{t('products.field_description')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleAiDescription}
                      disabled={aiDescLoading || !formName.trim()}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: BorderRadius.full, backgroundColor: colors.primary + '15' }}
                    >
                      {aiDescLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Ionicons name="sparkles" size={13} color={!formName.trim() ? colors.textMuted : colors.primary} />
                      )}
                      <Text style={{ fontSize: 11, color: !formName.trim() ? colors.textMuted : colors.primary, fontWeight: '600' }}>{t('common.generate')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={{
                      backgroundColor: colors.glass,
                      color: colors.text,
                      borderRadius: BorderRadius.md,
                      padding: 12,
                      fontSize: 13,
                      borderWidth: 1,
                      borderColor: colors.glassBorder,
                      minHeight: 60,
                      textAlignVertical: 'top',
                      marginBottom: 15,
                    }}
                    placeholder={t('products.field_description_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={formDescription}
                    onChangeText={setFormDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                <View style={styles.inputRowWithAction}>
                  <View style={{ flex: 1 }}>
                    <FormField label={t('products.field_sku')} value={formSku} onChangeText={setFormSku} placeholder={t('products.field_sku_placeholder')} colors={colors} styles={styles} />
                  </View>
                  <TouchableOpacity style={styles.scanBtnMini} onPress={() => openScanner('form')}>
                    <Ionicons name="barcode-outline" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRowWithAction}>
                  <View style={{ flex: 1 }}>
                    <FormField label={t('products.field_rfid')} value={formRfidTag} onChangeText={setFormRfidTag} placeholder={t('products.field_rfid_placeholder')} colors={colors} styles={styles} />
                  </View>
                  <TouchableOpacity
                    style={[styles.scanBtnMini, { backgroundColor: colors.info + '20' }]}
                    onPress={() => {
                      Alert.alert("RFID", "La lecture RFID nécessite un matériel compatible connecté. Vous pouvez saisir l'ID manuellement.");
                    }}
                  >
                    <Ionicons name="radio-outline" size={24} color={colors.info} />
                  </TouchableOpacity>
                </View>

                {editingProduct && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { marginVertical: Spacing.sm, backgroundColor: colors.info + '15', borderColor: colors.info, borderWidth: 1 }]}
                    onPress={() => generateProductLabelPdf(editingProduct, user?.name || "Stockman")}
                  >
                    <Ionicons name="pricetag-outline" size={18} color={colors.info} />
                    <Text style={[styles.actionText, { color: colors.info }]}>{t('products.print_label_rfid')}</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.formRow}>
                  <View style={[styles.formHalf, { flex: 1 }]}>
                    <FormField
                      label={t('products.field_expiry')}
                      value={formExpiryDate}
                      onChangeText={setFormExpiryDate}
                      placeholder="AAAA-MM-JJ"
                      colors={colors}
                      styles={styles}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <FormField label={t('products.field_quantity')} value={formQuantity} onChangeText={setFormQuantity} keyboardType="numeric" colors={colors} styles={styles} />
                  </View>
                  <View style={styles.formHalf}>
                    <Text style={[styles.formLabel, { marginBottom: 5 }]}>{t('products.field_unit')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                      {PRODUCT_UNITS.map(u => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setFormUnit(u)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: formUnit === u ? colors.primary : colors.glass,
                            borderRadius: 20,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: formUnit === u ? colors.primary : colors.glassBorder
                          }}
                        >
                          <Text style={{ color: formUnit === u ? '#fff' : colors.text, fontSize: 13 }}>{t(`products.unit_${u.toLowerCase().replace('é', 'e')}`)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <FormField label={t('products.field_purchase_price')} value={formPurchasePrice} onChangeText={setFormPurchasePrice} keyboardType="numeric" colors={colors} styles={styles} />
                  </View>
                  <View style={styles.formHalf}>
                    <FormField label={t('products.field_selling_price')} value={formSellingPrice} onChangeText={setFormSellingPrice} keyboardType="numeric" colors={colors} styles={styles} />
                  </View>
                </View>
                {editingProduct && (
                  <TouchableOpacity
                    onPress={handleAiPrice}
                    disabled={aiPriceLoading}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, backgroundColor: colors.primary + '15', marginBottom: 8, marginTop: -4 }}
                  >
                    {aiPriceLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="sparkles" size={13} color={colors.primary} />
                    )}
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{t('products.suggest_price')}</Text>
                  </TouchableOpacity>
                )}
                {aiPriceReasoning !== '' && (
                  <View style={{ backgroundColor: colors.primary + '10', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: colors.primary + '20' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <Ionicons name="sparkles" size={13} color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t('products.ai_advice')}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>{aiPriceReasoning}</Text>
                  </View>
                )}
                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <FormField label={t('products.field_min_stock')} value={formMinStock} onChangeText={setFormMinStock} keyboardType="numeric" colors={colors} styles={styles} />
                  </View>
                  <View style={styles.formHalf}>
                    <FormField label={t('products.field_max_stock')} value={formMaxStock} onChangeText={setFormMaxStock} keyboardType="numeric" colors={colors} styles={styles} />
                  </View>
                </View>

                {/* Variants Section */}
                <View style={{ marginBottom: Spacing.md }}>
                  <TouchableOpacity
                    onPress={() => {
                      setFormHasVariants(!formHasVariants);
                      if (formHasVariants) { setFormVariants([]); }
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: formHasVariants ? Spacing.sm : 0 }}
                  >
                    <Ionicons
                      name={formHasVariants ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={formHasVariants ? colors.primary : colors.textMuted}
                    />
                    <Text style={{ color: colors.text, fontSize: FontSize.sm, fontWeight: '600' }}>
                      {t('products.has_variants_label')}
                    </Text>
                  </TouchableOpacity>

                  {formHasVariants && (
                    <View style={{ backgroundColor: colors.glass, borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: colors.glassBorder }}>
                      {formVariants.map((v, idx) => (
                        <View key={v.variant_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: idx < formVariants.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: FontSize.sm, fontWeight: '600' }}>{v.name}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                              {t('products.qty')}: {v.quantity} {v.purchase_price != null ? `| ${t('products.purchase')}: ${v.purchase_price}` : ''} {v.selling_price != null ? `| ${t('products.selling')}: ${v.selling_price}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => openVariantForm(idx)} style={{ padding: 4 }}>
                            <Ionicons name="create-outline" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeVariant(idx)} style={{ padding: 4, marginLeft: 4 }}>
                            <Ionicons name="trash-outline" size={18} color={colors.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {showVariantForm ? (
                        <View style={{ marginTop: Spacing.sm, gap: 8 }}>
                          <TextInput
                            style={{ backgroundColor: colors.bgDark, color: colors.text, borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.glassBorder }}
                            placeholder={t('products.variant_name_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            value={varName}
                            onChangeText={setVarName}
                          />
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                              style={{ flex: 1, backgroundColor: colors.bgDark, color: colors.text, borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.glassBorder }}
                              placeholder={t('products.field_quantity')}
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numeric"
                              value={varQty}
                              onChangeText={setVarQty}
                            />
                            <TextInput
                              style={{ flex: 1, backgroundColor: colors.bgDark, color: colors.text, borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.glassBorder }}
                              placeholder={t('products.field_sku_optional')}
                              placeholderTextColor={colors.textMuted}
                              value={varSku}
                              onChangeText={setVarSku}
                            />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                              style={{ flex: 1, backgroundColor: colors.bgDark, color: colors.text, borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.glassBorder }}
                              placeholder={t('products.field_purchase_price_optional')}
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numeric"
                              value={varPurchasePrice}
                              onChangeText={setVarPurchasePrice}
                            />
                            <TextInput
                              style={{ flex: 1, backgroundColor: colors.bgDark, color: colors.text, borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.glassBorder }}
                              placeholder={t('products.field_selling_price_optional')}
                              placeholderTextColor={colors.textMuted}
                              keyboardType="numeric"
                              value={varSellingPrice}
                              onChangeText={setVarSellingPrice}
                            />
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => { setShowVariantForm(false); resetVariantForm(); }}
                              style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.glass, alignItems: 'center', borderWidth: 1, borderColor: colors.glassBorder }}
                            >
                              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={saveVariant}
                              style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '600' }}>{editingVariantIdx !== null ? t('common.edit') : t('common.add')}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => openVariantForm()}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm, paddingVertical: 8 }}
                        >
                          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                          <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>{t('products.add_variant')}</Text>
                        </TouchableOpacity>
                      )}

                      {formVariants.length > 0 && (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: colors.primary + '10', borderRadius: 6 }}>
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {t('products.total_stock_variants_label', { count: formVariants.reduce((s, v) => s + v.quantity, 0), unit: t(formUnit === 'Pièce' ? 'products.unit_piece' : 'products.unit_units', { count: formVariants.reduce((s, v) => s + v.quantity, 0) }) })}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <CategorySubcategoryPicker
                  selectedCategory={formCategoryName}
                  selectedSubcategory={formSubcategory}
                  onSelect={async (cat, sub) => {
                    setFormCategoryName(cat);
                    setFormSubcategory(sub);
                    if (!cat) {
                      setFormCategory(undefined);
                      return;
                    }
                    // Find or create category in user's collection
                    const existing = categoryList.find(c => c.name === cat);
                    if (existing) {
                      setFormCategory(existing.category_id);
                    } else if (isConnected) {
                      try {
                        const info = SHARED_CATEGORIES[cat];
                        const created = await categoriesApi.create({ name: cat, color: info?.color || '#6366f1', icon: info?.icon || 'cube-outline' });
                        setFormCategory(created.category_id);
                        loadData();
                      } catch { /* ignore */ }
                    }
                  }}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, formLoading && styles.submitBtnDisabled]}
                  onPress={handleSubmitProduct}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>{editingProduct ? 'Valider' : 'Ajouter'}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal >

      {/* Product History Modal */}
      < Modal visible={showHistoryModal} animationType="slide" transparent >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Historique</Text>
                <Text style={styles.modalSubtitle}>{selectedProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { alignSelf: 'flex-end', marginBottom: Spacing.sm }]}
              onPress={handleExportHistoryCSV}
            >
              <Ionicons name="download-outline" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Exporter CSV</Text>
            </TouchableOpacity>

            <View style={{ marginBottom: Spacing.sm }}>
              <PeriodSelector
                selectedPeriod={historyPeriod}
                onSelectPeriod={setHistoryPeriod}
                startDate={historyStartDate}
                endDate={historyEndDate}
                onApplyCustomDate={(start, end) => {
                  setHistoryStartDate(new Date(start));
                  setHistoryEndDate(new Date(end));
                }}
              />
            </View>

            <View style={[styles.filterRow, { marginBottom: Spacing.md }]}>
              <TouchableOpacity
                style={[styles.filterChip, historyTab === 'stock' && styles.filterChipActive, { flex: 1 }]}
                onPress={() => setHistoryTab('stock')}
              >
                <Text style={[styles.filterChipText, historyTab === 'stock' && styles.filterChipTextActive]}>Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, historyTab === 'finance' && styles.filterChipActive, { flex: 1 }]}
                onPress={() => setHistoryTab('finance')}
              >
                <Text style={[styles.filterChipText, historyTab === 'finance' && styles.filterChipTextActive]}>Ventes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, historyTab === 'price' && styles.filterChipActive, { flex: 1 }]}
                onPress={() => setHistoryTab('price')}
              >
                <Text style={[styles.filterChipText, historyTab === 'price' && styles.filterChipTextActive]}>Prix</Text>
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {historyTab === 'stock' ? (
                  historyMovements.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun mouvement sur cette période</Text>
                  ) : (
                    <View>
                      {(showAllMovements ? historyMovements : historyMovements.slice(0, 5)).map((mov) => (
                        <View key={mov.movement_id} style={styles.historyItem}>
                          <View style={[styles.movIcon, { backgroundColor: mov.type === 'in' ? colors.success + '20' : colors.warning + '20' }]}>
                            <Ionicons
                              name={mov.type === 'in' ? 'arrow-down' : 'arrow-up'}
                              size={16}
                              color={mov.type === 'in' ? colors.success : colors.warning}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyReason}>{mov.reason || (mov.type === 'in' ? 'Entrée' : 'Sortie')}</Text>
                            <Text style={styles.historyDate}>{new Date(mov.created_at).toLocaleString()}</Text>
                          </View>
                          <Text style={[styles.historyQty, { color: mov.type === 'in' ? colors.success : colors.warning }]}>
                            {mov.type === 'in' ? '+' : '-'}{mov.quantity}
                          </Text>
                        </View>
                      ))}
                      {historyMovements.length > 5 && (
                        <TouchableOpacity
                          style={styles.seeMoreBtn}
                          onPress={() => setShowAllMovements(!showAllMovements)}
                        >
                          <Text style={styles.seeMoreText}>
                            {showAllMovements ? 'Voir moins' : `Voir les ${historyMovements.length - 5} autres mouvements`}
                          </Text>
                          <Ionicons name={showAllMovements ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                ) : historyTab === 'finance' ? (
                  historySales.length === 0 ? (
                    <Text style={styles.emptyText}>Aucune vente sur cette période</Text>
                  ) : (
                    <View>
                      <View style={{ backgroundColor: colors.primary + '10', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>TOTAL VENDU</Text>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                            {historySales.reduce((total, sale) => {
                              const item = sale.items.find(i => i.product_id === selectedProduct?.product_id);
                              return total + (item?.quantity || 0);
                            }, 0)} {selectedProduct?.unit}(s)
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>REVENU TOTAL</Text>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>
                            {historySales.reduce((total, sale) => {
                              const item = sale.items.find(i => i.product_id === selectedProduct?.product_id);
                              return total + (item?.total || 0);
                            }, 0).toLocaleString()} {t('common.currency_default')}
                          </Text>
                        </View>
                      </View>
                      {(showAllSalesHistory ? historySales : historySales.slice(0, 5)).map((sale) => {
                        const item = sale.items.find(i => i.product_id === selectedProduct?.product_id);
                        return (
                          <View key={sale.sale_id} style={styles.historyItem}>
                            <View style={[styles.movIcon, { backgroundColor: colors.primary + '20' }]}>
                              <Ionicons name="cart-outline" size={16} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.historyReason}>Vente #{sale.sale_id.slice(-6)}</Text>
                              <Text style={styles.historyDate}>{new Date(sale.created_at).toLocaleString()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.historyQty, { color: colors.text }]}>{item?.quantity} x {item?.selling_price.toLocaleString()}</Text>
                              <Text style={{ fontSize: 10, color: colors.textMuted }}>Total: {item?.total.toLocaleString()} {t('common.currency_default')}</Text>
                            </View>
                          </View>
                        );
                      })}
                      {historySales.length > 5 && (
                        <TouchableOpacity
                          style={styles.seeMoreBtn}
                          onPress={() => setShowAllSalesHistory(!showAllSalesHistory)}
                        >
                          <Text style={styles.seeMoreText}>
                            {showAllSalesHistory ? 'Voir moins' : `Voir les ${historySales.length - 5} autres ventes`}
                          </Text>
                          <Ionicons name={showAllSalesHistory ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                ) : (
                  priceHistoryLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : priceHistory.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun historique de prix</Text>
                  ) : (
                    <View>
                      {priceHistory.map((ph) => (
                        <View key={ph.history_id} style={styles.historyItem}>
                          <View style={[styles.movIcon, { backgroundColor: colors.info + '20' }]}>
                            <Ionicons name="pricetag-outline" size={16} color={colors.info} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyReason}>Mise à jour des prix</Text>
                            <Text style={styles.historyDate}>{new Date(ph.recorded_at).toLocaleDateString()}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.historyQty}>{ph.selling_price.toLocaleString()} {t('common.currency_default')}</Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>Achat: {ph.purchase_price.toLocaleString()} {t('common.currency_default')}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal >

      {/* Category Management Modal */}
      < Modal visible={showCategoryModal} animationType="slide" transparent >
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
                      <Text style={styles.submitBtnText}>{editingCategory ? 'Valider' : 'Ajouter'}</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Import Defaults Button */}
                <TouchableOpacity
                  style={[styles.actionBtn, { marginTop: 20, backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }]}
                  onPress={handleImportDefaults}
                  disabled={catFormLoading}
                >
                  <Ionicons name="download-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Importer les catégories standards</Text>
                </TouchableOpacity>
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
      </Modal >

      {/* Stock Movement Modal */}
      < Modal visible={showStockModal} animationType="slide" transparent >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {movType === 'in' ? 'Entrée de stock pour' : 'Sortie de stock pour'} {selectedProduct?.name}
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
              colors={colors}
              styles={styles}
            />
            {movType === 'in' && (
              <>
                <FormField
                  label="Numéro de Lot (Optionnel)"
                  value={movBatchNumber}
                  onChangeText={setMovBatchNumber}
                  placeholder="Ex: LOT2024-001"
                  colors={colors}
                  styles={styles}
                />
                <FormField
                  label="Date de Péremption (AAAA-MM-JJ)"
                  value={movExpiryDate}
                  onChangeText={setMovExpiryDate}
                  placeholder="Ex: 2025-12-31"
                  colors={colors}
                  styles={styles}
                />
              </>
            )}
            <FormField
              label="Raison"
              value={movReason}
              onChangeText={setMovReason}
              placeholder="Raison du mouvement"
              colors={colors}
              styles={styles}
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
      </Modal >

      {/* Scanner Modal */}
      < BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleBarCodeScanned}
      />

      <BulkImportModal
        visible={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => loadData()}
      />

      <ScreenGuide
        visible={showGuide}
        onClose={() => { setShowGuide(false); markSeen(); }}
        title={GUIDES.products.title}
        steps={GUIDES.products.steps}
      />
    </LinearGradient >
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
  colors: any;
  styles: any;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
  styles
}: FormFieldProps) {
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
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, marginTop: Spacing.xs,
  },
  seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  productInfo: {
    flex: 1,
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
    maxHeight: '90%',
    minHeight: '50%',
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
  modalScroll: { flex: 1 },
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
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.xl,
    fontStyle: 'italic',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  movIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  historyReason: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  historyDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyQty: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  formCatChip: {
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
  formCatChipActive: {
    backgroundColor: colors.primary + '30',
    borderColor: colors.primary,
  },
  formCatChipText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
  },
  formCatChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '600',
  },
  valuationCard: {
    backgroundColor: colors.glass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  valuationInfo: {
    flex: 1,
  },
  valuationLabel: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  valuationValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  valuationBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    marginTop: 4,
  },
  expiryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  marginBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  marginText: {
    fontSize: 10,
    fontWeight: '700',
  },
  filterWrapper: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: 0,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.divider,
    marginRight: Spacing.sm,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    color: colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  selectionToolbar: {
    backgroundColor: colors.bgMid,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  selectionActionText: {
    fontSize: FontSize.xs,
  },
  inventoryReconciliation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inventoryInfo: {
    flex: 1,
    alignItems: 'center',
  },
  inventoryInputContainer: {
    flex: 1.5,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: Spacing.sm,
  },
  inventoryInput: {
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    width: '80%',
    textAlign: 'center',
    marginTop: 4,
  },
  inventoryActions: {
    flex: 1,
    alignItems: 'center',
  },
  inventoryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
