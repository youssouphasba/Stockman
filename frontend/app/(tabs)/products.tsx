import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
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
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import BarcodeScanner from '../../components/BarcodeScanner';
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../hooks/useNetwork';
import { cache, KEYS } from '../../services/cache';
import { syncService } from '../../services/sync';
import {
  products as productsApi,
  recipes as recipesApi,
  categories as categoriesApi,
  stock as stockApi,
  sales as salesApi,
  batches,
  ai as aiApi,
  catalog as catalogApi,
  stores as storesApi,
  locations as locationsApi,
  Product,
  ProductVariant,
  Category,
  Location,
  ProductCreate,
  Recipe,
  StockMovement,
  Sale,
  PriceHistory,
  API_URL,
  getToken,
  uploads,
  ApiError,
  userFeatures as userFeaturesApi,
  suppliers as suppliersApi,
  supplierProducts as spApi,
  Supplier,
  SupplierProduct,
} from '../../services/api';
import AccessDenied from '../../components/AccessDenied';
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
import TextImportModal from '../../components/TextImportModal';
import ProductionView from '../../components/ProductionView';
import { formatCurrency, formatUserCurrency, formatNumber } from '../../utils/format';
import {
  defaultPrecisionForUnit,
  formatMeasurementQuantity,
  inferMeasurementType,
  normalizeProductMeasurement,
} from '../../utils/measurement';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProductsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const styles = getStyles(colors, glassStyle);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  const router = useRouter();
  const {
    filter: filterParam,
    product_id: productIdParam,
    reminder_type: reminderTypeParam,
  } = useLocalSearchParams<{
    filter?: string;
    product_id?: string;
    reminder_type?: string;
  }>();
  const { user, hasPermission, hasProduction, isRestaurant } = useAuth();
  const effectivePlan = user?.effective_plan || user?.plan;
  const hasEnterpriseLocations = effectivePlan === 'enterprise';
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
  const [filterType, setFilterType] = useState<'all' | 'out_of_stock' | 'low_stock' | 'overstock' | 'deadstock'>('all');
  const [deadstockIds, setDeadstockIds] = useState<Set<string>>(new Set());
  const [deadstockCount, setDeadstockCount] = useState(0);
  const [seasonalityMap, setSeasonalityMap] = useState<Record<string, any>>({});
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  // Vague 5: product correlations map {product_id: [{name, lift}]}
  const [correlationsMap, setCorrelationsMap] = useState<Record<string, Array<{name: string; lift: number}>>>({});
  const [supplierCoverageFilter, setSupplierCoverageFilter] = useState<'all' | 'no_supplier' | 'multi_supplier' | 'missing_primary'>('all');
  const handledReminderProductRef = useRef<string | null>(null);

  // Apply filter from notification deep-link
  useEffect(() => {
    if (filterParam === 'low_stock' || filterParam === 'out_of_stock' || filterParam === 'overstock') {
      setFilterType(filterParam);
    }
  }, [filterParam]);

  useEffect(() => {
    if (!productIdParam || productList.length === 0) return;
    const reminderKey = `${String(productIdParam)}:${String(reminderTypeParam || '')}`;
    if (handledReminderProductRef.current === reminderKey) return;

    const targetProduct = productList.find((product) => product.product_id === String(productIdParam));
    if (!targetProduct) return;

    handledReminderProductRef.current = reminderKey;
    openHistoryModal(targetProduct);
  }, [productIdParam, reminderTypeParam, productList]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [locationList, setLocationList] = useState<Location[]>([]);
  const [recipeList, setRecipeList] = useState<Recipe[]>([]);

  const locationMap = useMemo(() => {
    const map = new Map<string, Location>();
    locationList.forEach((location) => map.set(location.location_id, location));
    return map;
  }, [locationList]);

  const getLocationPath = useCallback((locationId?: string | null) => {
    if (!locationId) return '';
    const parts: string[] = [];
    let cursor = locationMap.get(locationId);
    let guard = 0;
    while (cursor && guard < 12) {
      parts.push(cursor.name);
      cursor = cursor.parent_id ? locationMap.get(cursor.parent_id) : undefined;
      guard += 1;
    }
    return parts.reverse().join(' / ');
  }, [locationMap]);

  const activeLocationChoices = useMemo(
    () => [...locationList]
      .filter((location) => location.is_active !== false)
      .sort((a, b) => getLocationPath(a.location_id).localeCompare(getLocationPath(b.location_id), 'fr')),
    [getLocationPath, locationList],
  );

  // Add/Edit product form
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formQuantity, setFormQuantity] = useState('0');
  const [formProductType, setFormProductType] = useState('standard');
  const [formUnit, setFormUnit] = useState(t('products.default_unit'));
  const [formQuantityPrecision, setFormQuantityPrecision] = useState('1');
  const [formPurchasePrice, setFormPurchasePrice] = useState('0');
  const [formSellingPrice, setFormSellingPrice] = useState('0');
  const [formMinStock, setFormMinStock] = useState('0');
  const [formMaxStock, setFormMaxStock] = useState('100');
  const [formCategory, setFormCategory] = useState<string | undefined>(undefined);
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formCategoryName, setFormCategoryName] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formRfidTag, setFormRfidTag] = useState('');
  const [formSupplierIds, setFormSupplierIds] = useState<string[]>([]);
  const [formPrimarySupplierId, setFormPrimarySupplierId] = useState<string | null>(null);
  const [formLocationId, setFormLocationId] = useState('');
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [supplierLinksByProduct, setSupplierLinksByProduct] = useState<Record<string, SupplierProduct[]>>({});
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
  const [formMenuCategory, setFormMenuCategory] = useState('');
  const [formKitchenStation, setFormKitchenStation] = useState<'plat' | 'grill' | 'froid' | 'boisson' | 'dessert'>('plat');
  const [formProductionMode, setFormProductionMode] = useState<'prepped' | 'on_demand' | 'hybrid'>('prepped');
  const [formLinkedRecipeId, setFormLinkedRecipeId] = useState('');

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

  // Global Catalog states
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [userSector, setUserSector] = useState('');
  const [currentStore, setCurrentStore] = useState<any>(null);

  const productFormBaselineRef = useRef('');
  const stockMovementBaselineRef = useRef('');
  const categoryFormBaselineRef = useRef('');

  const confirmDiscardChanges = (onConfirm: () => void) => {
    Alert.alert(
      t('common.unsaved_changes_title'),
      t('common.unsaved_changes_message'),
      [
        { text: t('common.stay'), style: 'cancel' },
        { text: t('common.leave_without_saving'), style: 'destructive', onPress: onConfirm },
      ]
    );
  };

  const getProductFormSnapshot = () => JSON.stringify({
    name: formName,
    sku: formSku,
    quantity: formQuantity,
    productType: formProductType,
    unit: formUnit,
    quantityPrecision: formQuantityPrecision,
    purchasePrice: formPurchasePrice,
    sellingPrice: formSellingPrice,
    minStock: formMinStock,
    maxStock: formMaxStock,
    category: formCategory || '',
    subcategory: formSubcategory,
    categoryName: formCategoryName,
    image: formImage || '',
    rfidTag: formRfidTag,
    supplierIds: [...formSupplierIds].sort(),
    primarySupplierId: formPrimarySupplierId || '',
    locationId: formLocationId,
    expiryDate: formExpiryDate,
    hasVariants: formHasVariants,
    variants: formVariants,
    description: formDescription,
    menuCategory: formMenuCategory,
    kitchenStation: formKitchenStation,
    productionMode: formProductionMode,
    linkedRecipeId: formLinkedRecipeId,
    inventoryMode: isInventoryMode,
    inventoryValues,
  });

  const getStockMovementSnapshot = () => JSON.stringify({
    type: movType,
    quantity: movQuantity,
    reason: movReason,
    batch: movBatchNumber,
    expiry: movExpiryDate,
  });

  const getCategoryFormSnapshot = () => JSON.stringify({
    name: catFormName,
    color: catFormColor,
    editingId: editingCategory?.category_id || '',
  });

  const hasProductFormChanges = () => {
    if (!productFormBaselineRef.current) return false;
    return productFormBaselineRef.current !== getProductFormSnapshot();
  };

  const hasStockMovementChanges = () => {
    if (!stockMovementBaselineRef.current) return false;
    return stockMovementBaselineRef.current !== getStockMovementSnapshot();
  };

  const hasCategoryFormChanges = () => {
    if (!categoryFormBaselineRef.current) return false;
    return categoryFormBaselineRef.current !== getCategoryFormSnapshot();
  };

  const requestCloseAddModal = () => {
    if (!hasProductFormChanges()) {
      setShowAddModal(false);
      setEditingProduct(null);
      return;
    }
    confirmDiscardChanges(() => {
      setShowAddModal(false);
      setEditingProduct(null);
    });
  };

  const requestCloseStockModal = () => {
    if (!hasStockMovementChanges()) {
      setShowStockModal(false);
      return;
    }
    confirmDiscardChanges(() => setShowStockModal(false));
  };

  const requestCloseCategoryModal = () => {
    if (!hasCategoryFormChanges()) {
      setShowCategoryModal(false);
      return;
    }
    confirmDiscardChanges(() => setShowCategoryModal(false));
  };
  const previousStoreIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (formSku.length >= 8 && !editingProduct && isConnected) {
      handleBarcodeLookup(formSku);
    }
  }, [formSku]);

  useEffect(() => {
    async function loadStore() {
      if (user?.active_store_id) {
        try {
          const storesList = await storesApi.list();
          const active = storesList.find((s: any) => s.store_id === user.active_store_id);
          if (active) setCurrentStore(active);
        } catch (e) { /* ignore */ }
      }
    }
    loadStore();
  }, [user?.active_store_id]);

  useEffect(() => {
    // On fresh native release installs, the onboarding modal can block the whole
    // screen before the user understands what happened. Keep guides accessible
    // from the help button, but only auto-open them on web/dev.
    if (isFirstVisit && (Platform.OS === 'web' || __DEV__)) {
      setShowGuide(true);
    }
  }, [isFirstVisit]);

  useEffect(() => {
    if (showAddModal) {
      productFormBaselineRef.current = getProductFormSnapshot();
    } else {
      productFormBaselineRef.current = '';
    }
  }, [showAddModal, editingProduct?.product_id]);

  useEffect(() => {
    if (showStockModal) {
      stockMovementBaselineRef.current = getStockMovementSnapshot();
    } else {
      stockMovementBaselineRef.current = '';
    }
  }, [showStockModal, selectedProduct?.product_id]);

  useEffect(() => {
    if (showCategoryModal) {
      categoryFormBaselineRef.current = getCategoryFormSnapshot();
    } else {
      categoryFormBaselineRef.current = '';
    }
  }, [showCategoryModal, editingCategory?.category_id]);

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
        const isEnterprise = hasEnterpriseLocations;
        const [prodsRes, cats] = await Promise.all([
          productsApi.list(selectedCategory ?? undefined, 0, 500, isRestaurant ? true : undefined),
          categoriesApi.list(),
        ]);
        let forecast: any = null;
        let locsRes: Location[] = [];
        let recipesRes: Recipe[] = [];

        try {
          forecast = await salesApi.forecast();
        } catch (forecastError) {
          console.warn('[Products] forecast unavailable', forecastError);
        }

        // Vague 1+2+5: load deadstock, seasonality, duplicates, correlations
        Promise.allSettled([
          aiApi.deadstockAnalysis(),
          aiApi.seasonalityAlerts(),
          aiApi.detectDuplicates('products'),
          aiApi.productCorrelations(),
        ]).then(([dsRes, seasonRes, dupsRes, corrRes]) => {
          if (dsRes.status === 'fulfilled' && dsRes.value?.deadstock) {
            setDeadstockIds(new Set(dsRes.value.deadstock.map((d: any) => d.product_id)));
            setDeadstockCount(dsRes.value.deadstock.length);
          }
          if (seasonRes.status === 'fulfilled' && seasonRes.value?.alerts) {
            const map: Record<string, any> = {};
            for (const a of seasonRes.value.alerts) map[a.product_id] = a;
            setSeasonalityMap(map);
          }
          if (dupsRes.status === 'fulfilled') {
            setDuplicatesCount(dupsRes.value?.total_found || 0);
          }
          if (corrRes.status === 'fulfilled' && corrRes.value?.pairs) {
            const cmap: Record<string, Array<{name: string; lift: number}>> = {};
            for (const pair of corrRes.value.pairs) {
              if (!cmap[pair.product_a_id]) cmap[pair.product_a_id] = [];
              if (!cmap[pair.product_b_id]) cmap[pair.product_b_id] = [];
              cmap[pair.product_a_id].push({ name: pair.product_b_name, lift: pair.lift });
              cmap[pair.product_b_id].push({ name: pair.product_a_name, lift: pair.lift });
            }
            setCorrelationsMap(cmap);
          }
        });

        if (isEnterprise) {
          try {
            locsRes = await locationsApi.list();
          } catch (locationError) {
            console.warn('[Products] locations unavailable', locationError);
          }
        }

        if (isRestaurant) {
          try {
            recipesRes = await recipesApi.list();
          } catch (recipeError) {
            console.warn('[Products] recipes unavailable', recipeError);
          }
        }

        try {
          const supRes = await suppliersApi.list(0, 200);
          setAllSuppliers((supRes.items ?? supRes) as Supplier[]);
        } catch { /* silent */ }

        try {
          const links = await spApi.list();
          const grouped: Record<string, SupplierProduct[]> = {};
          for (const link of links || []) {
            if (!link?.product_id) continue;
            if (!grouped[link.product_id]) grouped[link.product_id] = [];
            grouped[link.product_id].push(link);
          }
          setSupplierLinksByProduct(grouped);
        } catch {
          setSupplierLinksByProduct({});
        }

        const prods = prodsRes.items ?? prodsRes;
        setProductList(prods as Product[]);
        setCategoryList(cats);
        setForecastData(forecast);
        setLocationList(isEnterprise ? locsRes : []);
        setRecipeList(recipesRes.filter((recipe) => recipe.recipe_type !== 'prep'));
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
          const sectorFiltered = isRestaurant ? cachedProds.filter((p) => p.is_menu_item) : cachedProds;
          const filtered = selectedCategory
            ? sectorFiltered.filter((p) => p.category_id === selectedCategory)
            : sectorFiltered;
          setProductList(filtered);
        }
        if (cachedCats) setCategoryList(cachedCats);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      // Fallback to cache on error
      const cachedProds = await cache.get<Product[]>(KEYS.PRODUCTS);
      if (cachedProds) {
        const sectorFiltered = isRestaurant ? cachedProds.filter((p) => p.is_menu_item) : cachedProds;
        const filtered = selectedCategory
          ? sectorFiltered.filter((p) => p.category_id === selectedCategory)
          : sectorFiltered;
        setProductList(filtered);
      }
      const cachedCats = await cache.get<Category[]>(KEYS.CATEGORIES);
      if (cachedCats) setCategoryList(cachedCats);
      setSupplierLinksByProduct({});
      if (!hasEnterpriseLocations) setLocationList([]);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasEnterpriseLocations, isConnected, isRestaurant, selectedCategory, user?.active_store_id]);

  useEffect(() => {
    const nextStoreId = user?.active_store_id;
    if (!nextStoreId) return;

    const storeChanged = !!previousStoreIdRef.current && previousStoreIdRef.current !== nextStoreId;
    previousStoreIdRef.current = nextStoreId;

    if (storeChanged) {
      setAccessDenied(false);
      setSelectedProduct(null);
      setShowHistoryModal(false);
      setSelectedProductIds(new Set());
      setCurrentStore(null);
      setProductList([]);
      setForecastData(null);

      // Category ids are store-scoped; reset them before reloading the new store.
      if (selectedCategory !== null) {
        setSelectedCategory(null);
        return;
      }
    }

    setLoading(true);
    loadData();
  }, [loadData, selectedCategory, user?.active_store_id]);

  // Load user sector for catalog import
  useEffect(() => {
    if (isConnected) {
      userFeaturesApi.get().then((f: any) => setUserSector(f?.sector || '')).catch(() => {});
    }
  }, [isConnected]);

  const handleImportCatalog = async () => {
    if (!userSector) {
      const msg = t('products.no_sector_defined');
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.info'), msg);
      return;
    }
    setCatalogLoading(true);
    try {
      const result = await catalogApi.importAll(userSector);
      const msg = t('products.catalog_import_success', { count: result.imported });
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert(t('common.success'), msg);
      await loadData();
    } catch (error: any) {
      const errMsg = error.message || t('products.catalog_import_error');
      if (Platform.OS === 'web') window.alert(errMsg);
      else Alert.alert(t('common.error'), errMsg);
    } finally {
      setCatalogLoading(false);
    }
  };

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
      const url = `${API_URL}/api/export/stock/csv?${params.toString()}`;
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

  function normalizeText(value?: string | null) {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getSupplierMatchScore(supplier: Supplier) {
    const supplierText = normalizeText([
      supplier.name,
      supplier.products_supplied,
      supplier.notes,
    ].filter(Boolean).join(' '));
    if (!supplierText) return 0;

    const productTokens = normalizeText([
      formName,
      formCategoryName,
      formSubcategory,
    ].join(' ')).split(' ').filter((token) => token.length >= 3);
    if (productTokens.length === 0) return 0;

    let score = 0;
    for (const token of productTokens) {
      if (supplierText.includes(token)) score += 1;
    }
    return score;
  }

  const rankedSuppliers = useMemo(() => {
    return [...allSuppliers].sort((a, b) => {
      const scoreA = getSupplierMatchScore(a);
      const scoreB = getSupplierMatchScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (a.name || '').localeCompare(b.name || '', 'fr');
    });
  }, [allSuppliers, formName, formCategoryName, formSubcategory]);

  function toggleFormSupplier(supplierId: string) {
    setFormSupplierIds((current) => {
      const exists = current.includes(supplierId);
      const next = exists ? current.filter((id) => id !== supplierId) : [...current, supplierId];
      if (exists && formPrimarySupplierId === supplierId) {
        setFormPrimarySupplierId(next[0] || null);
      } else if (!exists && !formPrimarySupplierId) {
        setFormPrimarySupplierId(supplierId);
      }
      return next;
    });
  }

  function getSupplierNameById(supplierId?: string | null) {
    return allSuppliers.find((supplier) => supplier.supplier_id === supplierId)?.name || t('products.supplier', 'Fournisseur');
  }

  function getProductSupplyMeta(productId?: string | null) {
    const links = productId ? (supplierLinksByProduct[productId] || []) : [];
    const primaryLink = links.find((link) => link.is_preferred) || null;
    const primaryName = primaryLink ? getSupplierNameById(primaryLink.supplier_id) : '';

    if (links.length === 0) {
      return {
        tone: colors.danger,
        status: t('products.supplier_none_status', 'Aucun fournisseur'),
        subtitle: t('products.supplier_none_subtitle', 'Ajoutez un fournisseur pour préparer le réapprovisionnement.'),
      };
    }

    if (!primaryLink) {
      return {
        tone: colors.info,
        status: t('products.supplier_missing_primary_status', 'Principal manquant'),
        subtitle: t('products.supplier_missing_primary_subtitle', { count: links.length, defaultValue: '{{count}} fournisseur(s) lié(s), mais aucun principal défini.' }),
      };
    }

    return {
      tone: colors.success,
      status: links.length > 1
        ? t('products.supplier_ready_multi_status', 'Approvisionnement sécurisé')
        : t('products.supplier_ready_status', 'Approvisionnement prêt'),
      subtitle: links.length > 1
        ? t('products.supplier_ready_multi_subtitle', { primary: primaryName, count: links.length - 1, defaultValue: 'Principal : {{primary}} · {{count}} alternative(s)' })
        : t('products.supplier_ready_subtitle', { primary: primaryName, defaultValue: 'Principal : {{primary}}' }),
    };
  }

  const filtered = useMemo(() => {
    if (!productList || !Array.isArray(productList)) return [];
    return productList.filter((p) => {
      const searchTerms = debouncedSearch.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchTerms) ||
        p.sku?.toLowerCase().includes(searchTerms);

      let matchesFilter = true;
      if (filterType === 'out_of_stock') matchesFilter = p.quantity === 0;
      else if (filterType === 'low_stock') matchesFilter = p.min_stock > 0 && p.quantity <= p.min_stock;
      else if (filterType === 'overstock') matchesFilter = p.max_stock > 0 && p.quantity >= p.max_stock;
      else if (filterType === 'deadstock') matchesFilter = deadstockIds.has(p.product_id);

      const productLinks = supplierLinksByProduct[p.product_id] || [];
      const hasSupplier = productLinks.length > 0;
      const hasPrimarySupplier = productLinks.some((link) => link.is_preferred);
      let matchesSupplierCoverage = true;
      if (supplierCoverageFilter === 'no_supplier') matchesSupplierCoverage = !hasSupplier;
      else if (supplierCoverageFilter === 'multi_supplier') matchesSupplierCoverage = productLinks.length > 1;
      else if (supplierCoverageFilter === 'missing_primary') matchesSupplierCoverage = hasSupplier && !hasPrimarySupplier;

      return matchesSearch && matchesFilter && matchesSupplierCoverage;
    });
  }, [productList, debouncedSearch, filterType, supplierCoverageFilter, supplierLinksByProduct, deadstockIds]);

  const serviceRecipes = useMemo(
    () => recipeList.filter((recipe) => recipe.recipe_type !== 'prep'),
    [recipeList]
  );

  const activeProductControlCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count += 1;
    if (supplierCoverageFilter !== 'all') count += 1;
    if (selectedCategory) count += 1;
    return count;
  }, [filterType, selectedCategory, supplierCoverageFilter]);

  function getMenuProductionModeLabel(product: Product) {
    switch (product.production_mode) {
      case 'on_demand':
        return t('pos.production_mode_on_demand', 'A la commande');
      case 'hybrid':
        return t('pos.production_mode_hybrid', 'Hybride');
      default:
        return t('pos.production_mode_prepped', 'A l’avance');
    }
  }

  function getMenuProductionModeColor(product: Product) {
    switch (product.production_mode) {
      case 'on_demand':
        return colors.warning;
      case 'hybrid':
        return colors.info;
      default:
        return colors.success;
    }
  }

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

  function toUnitChipValue(unit?: string) {
    const normalized = String(unit || '').trim().toLowerCase();
    if (normalized === 'kg') return 'Kg';
    if (normalized === 'ml') return 'mL';
    if (normalized === 'cl') return 'cL';
    if (normalized === 'piece' || normalized === 'pièce') return t('products.default_unit');
    if (normalized === 'l') return 'L';
    return unit || t('products.default_unit');
  }

  function isPieceUnitValue(unit?: string) {
    return normalizeProductMeasurement({ unit }).unit === 'piece';
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
      const url = `${API_URL}/api/export/products/csv?${params.toString()}`;
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
      Alert.alert(t('common.offline'), t('products.ai_offline'));
      return;
    }
    setAiCatLoading(true);
    try {
      const result = await aiApi.suggestCategory(name, i18n.language);
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
      Alert.alert(t('common.error'), t('products.ai_category_error'));
    } finally {
      setAiCatLoading(false);
    }
  }

  async function handleAiPrice() {
    if (!editingProduct) {
      Alert.alert(t('common.info'), t('products.ai_price_info'));
      return;
    }
    if (!isConnected) {
      Alert.alert(t('common.offline'), t('products.ai_offline'));
      return;
    }
    setAiPriceLoading(true);
    setAiPriceReasoning('');
    try {
      const result = await aiApi.suggestPrice(editingProduct.product_id, i18n.language);
      setFormSellingPrice(String(result.suggested_price));
      setAiPriceReasoning(result.reasoning);
    } catch {
      Alert.alert(t('common.error'), t('products.ai_price_error'));
    } finally {
      setAiPriceLoading(false);
    }
  }

  async function handleAiDescription() {
    const name = formName.trim();
    if (!name || name.length < 2) return;
    if (!isConnected) {
      Alert.alert(t('common.offline'), t('products.ai_offline'));
      return;
    }
    setAiDescLoading(true);
    try {
      const result = await aiApi.generateDescription(name, formCategoryName || undefined, formSubcategory || undefined, i18n.language);
      setFormDescription(result.description);
    } catch {
      Alert.alert(t('common.error'), t('products.ai_desc_error'));
    } finally {
      setAiDescLoading(false);
    }
  }

  async function handleBarcodeLookup(barcode: string) {
    if (!barcode || barcode.length < 8 || !isConnected || editingProduct) return;
    setCatalogLoading(true);
    try {
      const result = await catalogApi.lookupBarcode(barcode);
      const resultName = result?.display_name || result?.name;
      if (result && resultName) {
        if (!formName) setFormName(resultName);
        if (!formDescription && result.description) setFormDescription(result.description);
        if (!formPurchasePrice || formPurchasePrice === '0') setFormPurchasePrice(String(result.purchase_price || 0));
        if (!formSellingPrice || formSellingPrice === '0') setFormSellingPrice(String(result.selling_price || 0));
        if (!formCategory && result.category) {
          const existing = categoryList.find(c => c.name === result.category);
          if (existing) setFormCategory(existing.category_id);
        }
      }
    } catch (e) {
      console.log("Barcode lookup failed:", e);
    } finally {
      setCatalogLoading(false);
    }
  }

  // handleImportText is handled by TextImportModal component

  function resetForm() {
    setFormName('');
    setFormSku('');
    setFormQuantity('0');
    setFormUnit(t('products.default_unit'));
    setFormQuantityPrecision(String(defaultPrecisionForUnit(t('products.default_unit'))));
    setFormPurchasePrice('0');
    setFormSellingPrice('0');
    setFormMinStock('0');
    setFormMaxStock('100');
    setFormProductType('standard');
    setFormCategory(undefined);
    setFormSubcategory('');
    setFormCategoryName('');
    setFormImage(null);
    setFormRfidTag('');
    setFormExpiryDate('');
    setFormDescription('');
    setFormMenuCategory('');
    setFormKitchenStation('plat');
    setFormProductionMode('prepped');
    setFormLinkedRecipeId('');
    setAiPriceReasoning('');
    setFormHasVariants(false);
    setFormVariants([]);
    setFormSupplierIds([]);
    setFormPrimarySupplierId(null);
    setFormLocationId('');
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
    setFormUnit(toUnitChipValue(product.display_unit || product.unit));
    setFormQuantityPrecision(String(product.quantity_precision || defaultPrecisionForUnit(product.pricing_unit || product.unit, product.measurement_type)));
    setFormPurchasePrice(String(product.purchase_price));
    setFormSellingPrice(String(product.selling_price));
    setFormMinStock(String(product.min_stock));
    setFormMaxStock(String(product.max_stock));
    setFormCategory(product.category_id);
    setFormSubcategory(product.subcategory || '');
    // Resolve category name from categoryList
    const cat = categoryList.find(c => c.category_id === product.category_id);
    setFormCategoryName(cat?.name || '');
    setFormProductType(product.product_type || 'standard');
    setFormImage(product.image || null);
    setFormRfidTag(product.rfid_tag || '');
    setFormExpiryDate(product.expiry_date ? product.expiry_date.split('T')[0] : '');
    setFormLocationId(product.location_id || '');
    setFormDescription(product.description || '');
    setFormMenuCategory(product.menu_category || '');
    setFormKitchenStation((product.kitchen_station as 'plat' | 'grill' | 'froid' | 'boisson' | 'dessert') || 'plat');
    setFormProductionMode((product.production_mode as 'prepped' | 'on_demand' | 'hybrid') || 'prepped');
    setFormLinkedRecipeId(product.linked_recipe_id || '');
    setFormHasVariants(product.has_variants || false);
    setFormVariants(product.variants || []);
    const existingLinks = supplierLinksByProduct[product.product_id] || [];
    const supplierIds = existingLinks.map((link) => link.supplier_id);
    const preferred = existingLinks.find((link) => link.is_preferred)?.supplier_id || supplierIds[0] || null;
    setFormSupplierIds(supplierIds);
    setFormPrimarySupplierId(preferred);
    setShowAddModal(true);
  }

  async function handleAdjustStock(product: Product, actualQuantityText: string) {
    const actualQuantity = parseFloat(actualQuantityText);
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
        Alert.alert(t('common.error'), error.message || t('products.stock_adjust_error'));
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
    if (isRestaurant && formProductionMode !== 'prepped' && !formLinkedRecipeId) {
      Alert.alert(t('common.error'), t('restaurant.recipe_required', 'Veuillez lier une recette de service pour ce plat.'));
      return;
    }
    setFormLoading(true);
    try {
      const measurement = normalizeProductMeasurement({
        unit: formUnit,
        display_unit: formUnit,
        pricing_unit: formUnit,
        measurement_type: inferMeasurementType(formUnit),
        allows_fractional_sale: inferMeasurementType(formUnit) !== 'unit',
        quantity_precision: parseFloat(formQuantityPrecision) || defaultPrecisionForUnit(formUnit),
      });
      const data: ProductCreate = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        sku: formSku.trim() || undefined,
        product_type: formProductType,
        quantity: parseFloat(formQuantity) || 0,
        unit: measurement.unit,
        measurement_type: measurement.measurement_type,
        display_unit: measurement.display_unit,
        pricing_unit: measurement.pricing_unit,
        allows_fractional_sale: measurement.allows_fractional_sale,
        quantity_precision: measurement.quantity_precision,
        purchase_price: parseFloat(formPurchasePrice) || 0,
        selling_price: parseFloat(formSellingPrice) || 0,
        min_stock: parseFloat(formMinStock) || 0,
        max_stock: parseFloat(formMaxStock) || 100,
        category_id: formCategory || undefined,
        subcategory: formSubcategory.trim() || undefined,
        image: formImage || undefined,
        rfid_tag: formRfidTag || undefined,
        expiry_date: formExpiryDate ? new Date(formExpiryDate).toISOString() : undefined,
        variants: formHasVariants
          ? formVariants
              .filter((variant) => String(variant?.name || '').trim())
              .map((variant) => ({
                ...variant,
                name: String(variant.name || '').trim(),
                sku: String(variant.sku || '').trim() || undefined,
              }))
          : [],
        has_variants: formHasVariants,
        location_id: hasEnterpriseLocations && !isRestaurant ? (formLocationId || undefined) : undefined,
        is_menu_item: isRestaurant || undefined,
        menu_category: isRestaurant ? (formMenuCategory.trim() || formCategoryName || undefined) : undefined,
        kitchen_station: isRestaurant ? formKitchenStation : undefined,
        production_mode: isRestaurant ? formProductionMode : undefined,
        linked_recipe_id: isRestaurant ? (formLinkedRecipeId || undefined) : undefined,
      };

      if (isConnected) {
        let savedProductId: string | undefined;
        if (editingProduct) {
          const { location_id: nextLocationId, ...updatePayload } = data;
          await productsApi.update(editingProduct.product_id, updatePayload);
          if (hasEnterpriseLocations && !isRestaurant && editingProduct.location_id !== (nextLocationId || undefined)) {
            await productsApi.transferLocation(editingProduct.product_id, {
              to_location_id: nextLocationId || null,
              note: 'Emplacement mis à jour depuis la fiche produit',
            });
          }
          savedProductId = editingProduct.product_id;
        } else {
          const created = await productsApi.create(data);
          savedProductId = created.product_id;
        }
        // Sync supplier links (multi-suppliers + primary supplier)
        if (savedProductId && !isRestaurant) {
          const desiredSupplierIds = Array.from(new Set(formSupplierIds));
          const existingLinks = supplierLinksByProduct[savedProductId] || [];
          const existingBySupplierId = new Map(existingLinks.map((link) => [link.supplier_id, link]));
          const supplierSyncErrors: string[] = [];

          for (const existingLink of existingLinks) {
            if (!desiredSupplierIds.includes(existingLink.supplier_id)) {
              try {
                await spApi.unlink(existingLink.link_id);
              } catch (error: any) {
                supplierSyncErrors.push(
                  error?.message || `Impossible de retirer ${getSupplierNameById(existingLink.supplier_id)}.`
                );
              }
            }
          }

          for (const supplierId of desiredSupplierIds) {
            const shouldBePrimary = formPrimarySupplierId === supplierId;
            const existingLink = existingBySupplierId.get(supplierId);
            if (!existingLink) {
              try {
                await spApi.link({
                  supplier_id: supplierId,
                  product_id: savedProductId,
                  is_preferred: shouldBePrimary,
                });
              } catch (error: any) {
                supplierSyncErrors.push(
                  error?.message || `Impossible de lier ${getSupplierNameById(supplierId)}.`
                );
              }
              continue;
            }

            if (existingLink.is_preferred !== shouldBePrimary) {
              try {
                await spApi.update(existingLink.link_id, { is_preferred: shouldBePrimary });
              } catch (error: any) {
                supplierSyncErrors.push(
                  error?.message || `Impossible de mettre à jour ${getSupplierNameById(supplierId)}.`
                );
              }
            }
          }

          if (supplierSyncErrors.length > 0) {
            Alert.alert(
              t('common.warning', 'Attention'),
              `Le produit a bien été enregistré, mais certaines liaisons fournisseurs ont échoué.\n\n${supplierSyncErrors[0]}`
            );
          }
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

        Alert.alert(t('common.offline_mode'), t('products.offline_saved'));
      }

      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || t('products.create_error'));
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
        Alert.alert(t('common.offline'), t('products.movements_offline'));
      }
      setShowStockModal(false);
      setMovQuantity('');
      setMovReason('');
      setMovBatchNumber('');
      setMovExpiryDate('');
      setSelectedProduct(null);
    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error'), t('products.stock_update_error'));
    } finally {
      setFormLoading(false);
    }
  }

  async function handleReverseMovement(movementId: string, qty: number, type: string) {
    const performReverse = async () => {
      try {
        await stockApi.reverseMovement(movementId);
        Alert.alert(t('common.success'), t('products.movement_reversed'));
        await loadData();
        if (selectedProduct) {
          loadHistory(historyPeriod);
        }
      } catch (err: any) {
        Alert.alert(t('common.error'), err?.message || t('products.reverse_movement_error'));
      }
    };
    const msg = t('products.confirm_reverse_movement', { qty, type: type === 'in' ? t('products.mov_in') : t('products.mov_out') });
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) await performReverse();
    } else {
      Alert.alert(t('common.confirmation'), msg, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: performReverse },
      ]);
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
      Alert.alert(t('common.offline'), t('products.categories_offline'));
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
      Alert.alert(t('common.error'), t('products.category_save_error'));
    } finally {
      setCatFormLoading(false);
    }
  }

  async function handleImportDefaults() {
    if (!isConnected) {
      Alert.alert(t('common.offline'), t('products.import_offline'));
      return;
    }

    // Check if categories already exist to warn user
    if (categoryList.length > 5) {
      Alert.alert(
        t('common.warning'),
        t('products.confirm_import_msg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.import'), onPress: processImport }
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
        Alert.alert(t('common.success'), `${importedCount} ${t('products.categories_imported')}`);
      } else {
        Alert.alert(t('common.info'), t('products.categories_exist'));
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('products.import_error'));
    } finally {
      setCatFormLoading(false);
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (!isConnected) {
      Alert.alert(t('common.offline'), t('products.categories_offline'));
      return;
    }
    try {
      await categoriesApi.delete(catId);
      if (selectedCategory === catId) setSelectedCategory(null);
      const cats = await categoriesApi.list();
      setCategoryList(cats);
      await cache.set(KEYS.CATEGORIES, cats);
    } catch {
      Alert.alert(t('common.error'), t('products.delete_category_error'));
    }
  }

  function handleDelete(productId: string) {
    const product = productList.find(p => p.product_id === productId);
    Alert.alert(
      t('products.confirm_delete_title'),
      t('products.confirm_delete_msg', { name: product?.name ?? t('common.this_product') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (isConnected) {
              try {
                await productsApi.delete(productId);
                loadData();
              } catch {
                Alert.alert(t('common.error'), t('products.delete_error'));
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
                Alert.alert(t('common.offline_mode'), t('products.offline_delete_queued'));
              } catch {
                Alert.alert(t('common.error'), t('products.offline_delete_error'));
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
      t('products.add_photo_title'),
      t('products.choose_source'),
      [
        {
          text: t('products.camera'),
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
          text: t('products.gallery'),
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
          text: t('products.remove_photo'),
          style: "destructive",
          onPress: () => setFormImage(null),
        },
        { text: t('common.cancel'), style: "cancel" }
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
      t('products.bulk_delete_title'),
      t('products.bulk_delete_msg', { count: selectedProductIds.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
                ${p.image ? `<img src="${uploads.getFullUrl(p.image) || p.image}" />` : '<div class="placeholder">ðŸ“¦</div>'}
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
          { label: t('products.kpi_products'), value: filtered.length.toString() },
          { label: t('products.kpi_stock_value'), value: formatUserCurrency(totalValue, user) },
          { label: t('products.kpi_low_stock'), value: lowStock.toString(), color: '#FF9800' },
          { label: t('products.kpi_out_of_stock'), value: outOfStock.toString(), color: '#f44336' },
        ],
        sections: [{
          title: t('products.report_section_stock'),
          headers: [
            t('products.pdf_headers.product'),
            t('products.pdf_headers.category'),
            t('products.pdf_headers.qty'),
            t('products.pdf_headers.unit'),
            t('products.pdf_headers.purchase_price'),
            t('products.pdf_headers.selling_price'),
            t('products.pdf_headers.value')
          ],
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
      Alert.alert(t('common.error'), t('products.pdf_error'));
    }
  }

  // If production mode → show the ProductionView instead
  if (hasProduction && !isRestaurant) {
    return <ProductionView currency={user?.currency || 'FCFA'} />;
  }

  if (accessDenied) {
    return <AccessDenied onRetry={() => { setAccessDenied(false); loadData(); }} />;
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
        <View style={styles.headerActionRow}>
          <View style={styles.headerActionRowGroup}>
            {!isRestaurant && (
              <TouchableOpacity
                style={[styles.headerActionChip, isInventoryMode && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
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
                <Text numberOfLines={1} style={[styles.headerActionText, isInventoryMode && { color: colors.primary }]}>
                  {isInventoryMode ? 'Inventaire actif' : 'Inventaire'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.headerActionChip, { backgroundColor: colors.success + '18', borderColor: colors.success + '40' }]}
              onPress={handleExportCSV}
            >
              <Ionicons name="download-outline" size={20} color={colors.primary} />
              <Text numberOfLines={1} style={styles.headerActionText}>Exporter</Text>
            </TouchableOpacity>
          </View>
          {canWrite && (
            <View style={styles.headerActionRowGroup}>
              <TouchableOpacity
                style={[styles.headerActionChip, isSelectionMode && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                onPress={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedProductIds(new Set());
                }}
              >
                <Ionicons name={isSelectionMode ? "close" : "list-outline"} size={20} color={isSelectionMode ? colors.primaryLight : colors.text} />
                <Text numberOfLines={1} style={[styles.headerActionText, isSelectionMode && { color: colors.primary }]}>
                  {isSelectionMode ? 'Fermer la sélection' : 'Sélection'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionChip, styles.headerActionPrimaryChip]}
                onPress={() => setShowAddMenu(!showAddMenu)}
              >
                <Ionicons name={showAddMenu ? "close" : "add"} size={20} color="#fff" />
                <Text numberOfLines={1} style={styles.headerActionPrimaryText}>{showAddMenu ? 'Fermer' : 'Ajouter'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {showAddMenu && canWrite && (
          <View style={{ backgroundColor: colors.glass, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, padding: Spacing.sm, marginTop: Spacing.xs, gap: 6 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm }}
              onPress={() => { setShowAddMenu(false); setEditingProduct(null); resetForm(); setShowAddModal(true); }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: FontSize.md }}>{isRestaurant ? t('restaurant.add_dish', 'Ajouter un plat') : t('products.add_product')}</Text>
            </TouchableOpacity>
            {!isRestaurant && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm }}
                onPress={() => { setShowAddMenu(false); router.push('/inventory/batch-scan'); }}
              >
                <Ionicons name="scan-outline" size={20} color={colors.info} />
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>{t('products.batch_scan', 'Scan en lot')}</Text>
              </TouchableOpacity>
            )}
            {!isRestaurant && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm }}
                onPress={() => { setShowAddMenu(false); setShowBulkImportModal(true); }}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={colors.warning} />
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>{t('products.import_csv', 'Import CSV')}</Text>
              </TouchableOpacity>
            )}
            {!isRestaurant && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm }}
                onPress={() => { setShowAddMenu(false); setShowTextImportModal(true); }}
              >
                <Ionicons name="text-outline" size={20} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>{t('products.text_import', 'Import texte')}</Text>
              </TouchableOpacity>
            )}
            {!isRestaurant && userSector && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm }}
                onPress={() => { setShowAddMenu(false); handleImportCatalog(); }}
                disabled={catalogLoading}
              >
                {catalogLoading ? (
                  <ActivityIndicator size="small" color={colors.success} />
                ) : (
                  <Ionicons name="storefront-outline" size={20} color={colors.success} />
                )}
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>{t('products.import_catalog', 'Import catalogue')}</Text>
              </TouchableOpacity>
            )}
            {!isRestaurant && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, paddingHorizontal: Spacing.sm }}
                onPress={() => { setShowAddMenu(false); exportInventoryPdf(); }}
              >
                <Ionicons name="document-text-outline" size={20} color={colors.danger} />
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>{t('products.export_pdf', 'Export PDF inventaire')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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

        {!isRestaurant && hasEnterpriseLocations && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPanelsScroll}>
            <TouchableOpacity
              style={styles.quickPanelCard}
              onPress={() => router.push('/(tabs)/locations' as never)}
              activeOpacity={0.9}
            >
              <Ionicons name="location-outline" size={18} color={colors.success} />
              <Text style={styles.quickPanelTitle}>Emplacements</Text>
              <Text style={styles.quickPanelDesc}>
                {locationList.length > 0 ? `${locationList.length} zone${locationList.length > 1 ? 's' : ''}` : 'Configurer les zones'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {!isRestaurant && (
          <TouchableOpacity
            style={styles.sectionToggleCard}
            onPress={() => setShowControlsPanel((current) => !current)}
            activeOpacity={0.85}
          >
            <View style={styles.sectionToggleCopy}>
              <Text style={styles.sectionToggleTitle}>Filtres avancés</Text>
              <Text style={styles.sectionToggleDescription}>
                {`${filtered.length} produit${filtered.length > 1 ? 's' : ''} visibles • ${activeProductControlCount > 0 ? `${activeProductControlCount} filtre${activeProductControlCount > 1 ? 's' : ''} actif${activeProductControlCount > 1 ? 's' : ''}` : 'aucun filtre avancé'}`}
              </Text>
            </View>
            <Ionicons
              name={showControlsPanel ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {!isRestaurant && showControlsPanel && (
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
              {deadstockCount > 0 && (
                <TouchableOpacity
                  style={[styles.filterChip, filterType === 'deadstock' && styles.filterChipActive, { borderColor: colors.warning }]}
                  onPress={() => setFilterType('deadstock')}
                >
                  <Text style={[styles.filterChipText, filterType === 'deadstock' && styles.filterChipTextActive, { color: filterType === 'deadstock' ? '#fff' : colors.warning }]}>
                    {t('products.deadstock', 'Dormants')} ({deadstockCount})
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, supplierCoverageFilter === 'all' && styles.filterChipActive]}
                onPress={() => setSupplierCoverageFilter('all')}
              >
                <Text style={[styles.filterChipText, supplierCoverageFilter === 'all' && styles.filterChipTextActive]}>
                  {t('products.supplier_filter_all', 'Tous fournisseurs')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, supplierCoverageFilter === 'no_supplier' && styles.filterChipActive, { borderColor: colors.danger }]}
                onPress={() => setSupplierCoverageFilter('no_supplier')}
              >
                <Text style={[styles.filterChipText, supplierCoverageFilter === 'no_supplier' && styles.filterChipTextActive, { color: supplierCoverageFilter === 'no_supplier' ? '#fff' : colors.danger }]}>
                  {t('products.supplier_filter_none', 'Sans fournisseur')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, supplierCoverageFilter === 'multi_supplier' && styles.filterChipActive, { borderColor: colors.warning }]}
                onPress={() => setSupplierCoverageFilter('multi_supplier')}
              >
                <Text style={[styles.filterChipText, supplierCoverageFilter === 'multi_supplier' && styles.filterChipTextActive, { color: supplierCoverageFilter === 'multi_supplier' ? '#fff' : colors.warning }]}>
                  {t('products.supplier_filter_multiple', 'Plusieurs fournisseurs')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, supplierCoverageFilter === 'missing_primary' && styles.filterChipActive, { borderColor: colors.info }]}
                onPress={() => setSupplierCoverageFilter('missing_primary')}
              >
                <Text style={[styles.filterChipText, supplierCoverageFilter === 'missing_primary' && styles.filterChipTextActive, { color: supplierCoverageFilter === 'missing_primary' ? '#fff' : colors.info }]}>
                  {t('products.supplier_filter_missing_primary', 'Principal manquant')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {showControlsPanel && (
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
        )}

        {!isRestaurant && hasEnterpriseLocations && showControlsPanel && (
          <TouchableOpacity
            style={styles.locationModuleCard}
            onPress={() => router.push('/(tabs)/locations' as never)}
            activeOpacity={0.9}
          >
            <View style={styles.locationModuleIcon}>
              <Ionicons name="location-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.locationModuleContent}>
              <Text style={styles.locationModuleTitle}>{t('products.location_module_title')}</Text>
              <Text style={styles.locationModuleDescription}>{t('products.location_module_description')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Valuation Card */}
        {!isRestaurant && showControlsPanel && (
          <View style={styles.valuationCard}>
            <View style={styles.valuationInfo}>
              <Text style={styles.valuationLabel}>{t('products.total_stock_value_label')}</Text>
              <Text style={styles.valuationValue}>
                {formatUserCurrency(Array.isArray(productList) ? productList.reduce((sum, p) => sum + (p.quantity * p.purchase_price), 0) : 0, user)}
              </Text>
            </View>
            <View style={styles.valuationBadge}>
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
          </View>
        )}

        <Text style={styles.resultCount}>
          {isRestaurant ? t(filtered.length > 1 ? 'pos.dish_count_plural' : 'pos.dish_count', { count: filtered.length }) : t('products.product_count', { count: filtered.length })}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState
            title={debouncedSearch ? t('common.no_results') : isRestaurant ? t('restaurant.no_dish', 'Aucun plat') : t('products.no_products')}
            message={debouncedSearch
              ? t('products.no_results_for', { query: debouncedSearch })
              : isRestaurant ? t('restaurant.first_dish_hint', 'Commencez par créer votre premier plat de menu.') : t('products.no_products_desc')}
            icon={debouncedSearch ? "search-outline" : "cube-outline"}
            actionLabel={
              debouncedSearch
                ? t('common.clear_search')
                : canWrite
                  ? isRestaurant
                    ? t('restaurant.add_dish', 'Ajouter un plat')
                    : t('products.add_product')
                  : undefined
            }
            onAction={() => {
              if (debouncedSearch) {
                setSearch('');
              } else if (canWrite) {
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
                    {isRestaurant ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={[styles.marginBadge, { backgroundColor: getMenuProductionModeColor(product) + '15' }]}>
                            <Text style={[styles.marginText, { color: getMenuProductionModeColor(product) }]}>
                              {getMenuProductionModeLabel(product)}
                            </Text>
                          </View>
                          {product.menu_category ? (
                            <View style={[styles.locationBadge, { backgroundColor: colors.secondary + '18' }]}>
                              <Text style={[styles.locationBadgeText, { color: colors.secondary }]} numberOfLines={1}>
                                {product.menu_category}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={[styles.productSku, { marginTop: 6 }]}>
                          {t('restaurant.station_label', 'Station')}: {product.kitchen_station || 'plat'}{product.linked_recipe_id ? ` · ${t('restaurant.recipe_linked', 'Recette liée')}` : ''}
                        </Text>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {product.sku && <Text style={styles.productSku}>{product.sku}</Text>}
                        <View style={[styles.marginBadge, { backgroundColor: margin > 0 ? colors.success + '15' : colors.danger + '15' }]}>
                          <Text style={[styles.marginText, { color: margin > 0 ? colors.success : colors.danger }]}>
                            +{formatUserCurrency(margin, user)}
                          </Text>
                        </View>
                        {hasEnterpriseLocations && product.location_id && (() => {
                          const loc = locationList.find(l => l.location_id === product.location_id);
                          return loc ? (
                            <View style={[styles.locationBadge, { backgroundColor: colors.info + '20' }]}>
                              <Ionicons name="location-outline" size={10} color={colors.info} />
                              <Text style={[styles.locationBadgeText, { color: colors.info }]} numberOfLines={1}>
                                {getLocationPath(loc.location_id) || loc.name}
                              </Text>
                            </View>
                          ) : null;
                        })()}
                      </View>
                    )}
                  </View>
                  {!isRestaurant && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(product) }]}>
                        {getStatusLabel(product)}
                      </Text>
                    </View>
                  )}
                  {!isRestaurant && product.expiry_date && (
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
                    {isRestaurant && (
                      <View style={styles.productDetails}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{t('restaurant.sale_price', 'Prix de vente')}</Text>
                          <Text style={styles.detailValue}>{formatUserCurrency(product.selling_price, user)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{t('common.recipe', 'Recette')}</Text>
                            <Text style={styles.detailValue}>{product.linked_recipe_id ? t('restaurant.recipe_linked', 'Recette liée') : t('restaurant.recipe_to_define', 'À définir')}</Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>{t('restaurant.production_label', 'Production')}</Text>
                          <Text style={styles.detailValue}>{getMenuProductionModeLabel(product)}</Text>
                        </View>
                      </View>
                    )}
                    {!isRestaurant && (
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
                                {t('products.forecast_7d_unit', { count: forecast.predicted_sales_7d })}
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
                    )}

                    {/* Vague 5: Product Correlations badge */}
                    {correlationsMap[product.product_id]?.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                        <Ionicons name="link-outline" size={13} color={colors.primary} />
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>Acheté avec : </Text>
                        {correlationsMap[product.product_id].slice(0, 3).map((c, i) => (
                          <View key={i} style={{ backgroundColor: colors.primary + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{c.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Seasonality alert badge */}
                    {!isRestaurant && seasonalityMap[product.product_id]?.urgency === 'high' && (() => {
                      const season = seasonalityMap[product.product_id];
                      return (
                        <View style={{ backgroundColor: colors.warning + '15', borderWidth: 1, borderColor: colors.warning + '30', borderRadius: 12, padding: 10, marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="flame-outline" size={16} color={colors.warning} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning, flex: 1 }}>
                            {t('products.season_peak_alert', { month: season.upcoming_peak_name, demand: season.expected_demand, gap: season.stock_gap, defaultValue: 'Pic saisonnier {{month}} — prévoir {{demand}} unités (manque {{gap}})' })}
                          </Text>
                        </View>
                      );
                    })()}

                    {!isRestaurant && (() => {
                      const supplyMeta = getProductSupplyMeta(product.product_id);
                      return (
                        <View style={[styles.supplyCard, { borderColor: supplyMeta.tone + '35', backgroundColor: supplyMeta.tone + '12' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.supplyTitle, { color: supplyMeta.tone }]}>{supplyMeta.status}</Text>
                            <Text style={styles.supplySubtitle}>{supplyMeta.subtitle}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.supplyManageBtn, { borderColor: supplyMeta.tone + '45' }]}
                            onPress={() => openEditModal(product)}
                          >
                            <Text style={[styles.supplyManageBtnText, { color: supplyMeta.tone }]}>
                              {t('products.manage_supply_cta', 'Gérer')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}

                    {/* Variants display */}
                    {!isRestaurant && product.has_variants && product.variants && product.variants.length > 0 && (
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
                        {!isRestaurant && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.info + '18', borderWidth: 1, borderColor: colors.info + '38', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                            onPress={() => openHistoryModal(product)}
                          >
                            <Ionicons name="time-outline" size={16} color={colors.info} />
                            <Text style={[styles.actionText, { color: colors.info }]}>{t('products.history')}</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                          onPress={() => openEditModal(product)}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.primary} />
                          <Text style={[styles.actionText, { color: colors.primary }]}>{t('products.edit')}</Text>
                        </TouchableOpacity>

                        {!isRestaurant && canWrite && (
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

                        {!isRestaurant && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.textMuted + '15', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }]}
                            onPress={() => printLabel(product)}
                          >
                            <Ionicons name="print-outline" size={16} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}

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
      < Modal visible={showAddModal} animationType="slide" transparent onRequestClose={requestCloseAddModal} >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isRestaurant
                  ? editingProduct ? t('restaurant.edit_dish', 'Modifier le plat') : t('restaurant.add_dish', 'Ajouter un plat')
                  : editingProduct ? t('products.edit_product', 'Modifier le produit') : t('products.add_product')}
              </Text>
              <TouchableOpacity onPress={requestCloseAddModal}>
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
                keyboardShouldPersistTaps="handled"
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
                {isRestaurant && (
                  <View style={{ backgroundColor: colors.primary + '10', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: colors.primary + '25' }}>
                    <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                      {t('restaurant.menu_form_hint', 'Ce formulaire crée un article de menu. Le stock sera piloté selon le mode choisi : préparation à l\'avance, à la commande ou hybride.')}
                    </Text>
                  </View>
                )}
                {isRestaurant && (
                  <>
                    <FormField
                      label={t('restaurant.menu_category', 'Catégorie menu')}
                      value={formMenuCategory}
                      onChangeText={setFormMenuCategory}
                      placeholder={t('restaurant.menu_category_placeholder', 'Ex: Grillades, Entrées, Desserts')}
                      colors={colors}
                      styles={styles}
                    />
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.formLabel, { marginBottom: 8 }]}>{t('restaurant.production_label', 'Production')}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { value: 'prepped', label: t('pos.production_mode_prepped', 'A l’avance') },
                          { value: 'on_demand', label: t('pos.production_mode_on_demand', 'A la commande') },
                          { value: 'hybrid', label: t('pos.production_mode_hybrid', 'Hybride') },
                        ].map((opt) => (
                          <TouchableOpacity
                            key={opt.value}
                            onPress={() => setFormProductionMode(opt.value as 'prepped' | 'on_demand' | 'hybrid')}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              alignItems: 'center',
                              backgroundColor: formProductionMode === opt.value ? colors.primary + '20' : 'transparent',
                              borderColor: formProductionMode === opt.value ? colors.primary : colors.glassBorder,
                            }}
                          >
                            <Text style={{ color: formProductionMode === opt.value ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 12 }}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.formLabel, { marginBottom: 8 }]}>{t('restaurant.station_label', 'Station cuisine')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                        {[
                          { value: 'plat', label: t('restaurant.station_plat', 'Plat') },
                          { value: 'grill', label: t('restaurant.station_grill', 'Grill') },
                          { value: 'froid', label: t('restaurant.station_froid', 'Froid') },
                          { value: 'boisson', label: t('restaurant.station_boisson', 'Boisson') },
                          { value: 'dessert', label: t('restaurant.station_dessert', 'Dessert') },
                        ].map((station) => (
                          <TouchableOpacity
                            key={station.value}
                            onPress={() => setFormKitchenStation(station.value as 'plat' | 'grill' | 'froid' | 'boisson' | 'dessert')}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              backgroundColor: formKitchenStation === station.value ? colors.primary : colors.glass,
                              borderRadius: 20,
                              marginRight: 8,
                              borderWidth: 1,
                              borderColor: formKitchenStation === station.value ? colors.primary : colors.glassBorder,
                            }}
                          >
                            <Text style={{ color: formKitchenStation === station.value ? '#fff' : colors.text, fontSize: 13 }}>
                              {station.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[styles.formLabel, { marginBottom: 8 }]}>{t('restaurant.service_recipe', 'Recette de service')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                          onPress={() => setFormLinkedRecipeId('')}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: formLinkedRecipeId === '' ? colors.primary : colors.glass,
                            borderRadius: 20,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: formLinkedRecipeId === '' ? colors.primary : colors.glassBorder,
                          }}
                        >
                          <Text style={{ color: formLinkedRecipeId === '' ? '#fff' : colors.text, fontSize: 13 }}>
                            {t('restaurant.no_recipe', 'Aucune')}
                          </Text>
                        </TouchableOpacity>
                        {serviceRecipes.map((recipe) => (
                          <TouchableOpacity
                            key={recipe.recipe_id}
                            onPress={() => setFormLinkedRecipeId(recipe.recipe_id)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              backgroundColor: formLinkedRecipeId === recipe.recipe_id ? colors.primary : colors.glass,
                              borderRadius: 20,
                              marginRight: 8,
                              borderWidth: 1,
                              borderColor: formLinkedRecipeId === recipe.recipe_id ? colors.primary : colors.glassBorder,
                            }}
                          >
                            <Text style={{ color: formLinkedRecipeId === recipe.recipe_id ? '#fff' : colors.text, fontSize: 13 }}>
                              {recipe.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      {(formProductionMode === 'on_demand' || formProductionMode === 'hybrid') && !formLinkedRecipeId && (
                        <Text style={{ color: colors.warning, fontSize: 11, marginTop: 6 }}>
                          {t('restaurant.recipe_required', 'Veuillez lier une recette de service pour ce plat.')}
                        </Text>
                      )}
                    </View>
                  </>
                )}
                <View style={styles.inputRowWithAction}>
                  <View style={{ flex: 1 }}>
                    <FormField label={t('products.field_sku')} value={formSku} onChangeText={setFormSku} placeholder={t('products.field_sku_placeholder')} colors={colors} styles={styles} />
                  </View>
                  <TouchableOpacity style={styles.scanBtnMini} onPress={() => openScanner('form')}>
                    <Ionicons name="barcode-outline" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {!isRestaurant && (
                  <View style={styles.inputRowWithAction}>
                    <View style={{ flex: 1 }}>
                      <FormField label={t('products.field_rfid')} value={formRfidTag} onChangeText={setFormRfidTag} placeholder={t('products.field_rfid_placeholder')} colors={colors} styles={styles} />
                    </View>
                    <TouchableOpacity
                      style={[styles.scanBtnMini, { backgroundColor: colors.info + '20' }]}
                      onPress={() => {
                        Alert.alert(t('products.rfid_info_title'), t('products.rfid_reading_not_supported'));
                      }}
                    >
                      <Ionicons name="radio-outline" size={24} color={colors.info} />
                    </TouchableOpacity>
                  </View>
                )}

                {editingProduct && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { marginVertical: Spacing.sm, backgroundColor: colors.info + '15', borderColor: colors.info, borderWidth: 1 }]}
                    onPress={() => generateProductLabelPdf(editingProduct, currentStore?.name || t('accounting.default_store_name'))}
                  >
                    <Ionicons name="pricetag-outline" size={18} color={colors.info} />
                    <Text style={[styles.actionText, { color: colors.info }]}>{t('products.print_label_rfid')}</Text>
                  </TouchableOpacity>
                )}

                {!isRestaurant && allSuppliers.length > 0 && (
                  <View style={styles.supplySection}>
                    <View style={styles.supplySectionHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formLabel}>{t('products.supply_section_title', 'Approvisionnement')}</Text>
                        <Text style={styles.supplySectionHelp}>
                          {t('products.supply_section_help', 'Définissez un fournisseur principal, puis ajoutez si besoin des alternatives pour sécuriser vos commandes.')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.supplyStatusPill,
                          {
                            borderColor: formSupplierIds.length === 0 ? colors.danger + '45' : (!formPrimarySupplierId ? colors.info + '45' : colors.success + '45'),
                            backgroundColor: formSupplierIds.length === 0 ? colors.danger + '14' : (!formPrimarySupplierId ? colors.info + '14' : colors.success + '14'),
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.supplyStatusPillText,
                            { color: formSupplierIds.length === 0 ? colors.danger : (!formPrimarySupplierId ? colors.info : colors.success) }
                          ]}
                        >
                          {formSupplierIds.length === 0
                            ? t('products.no_supplier', 'Aucun fournisseur')
                            : !formPrimarySupplierId
                              ? t('products.primary_missing_short', 'Principal à définir')
                              : t('products.primary_supplier_named', { name: getSupplierNameById(formPrimarySupplierId), defaultValue: 'Principal : {{name}}' })}
                        </Text>
                      </View>
                    </View>

                    {formSupplierIds.length > 0 && (
                      <View style={{ marginTop: 10, gap: 8 }}>
                        {formSupplierIds.map((supplierId) => {
                          const supplier = allSuppliers.find((item) => item.supplier_id === supplierId);
                          if (!supplier) return null;
                          const isPrimary = formPrimarySupplierId === supplierId;
                          return (
                            <View
                              key={supplierId}
                              style={[
                                styles.supplySelectedCard,
                                {
                                  borderColor: isPrimary ? colors.success + '45' : colors.glassBorder,
                                  backgroundColor: isPrimary ? colors.success + '12' : colors.glass,
                                }
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.supplySelectedName}>{supplier.name}</Text>
                                <Text style={styles.supplySelectedSubtitle}>
                                  {isPrimary
                                    ? t('products.primary_supplier_help', 'Fournisseur principal utilisé pour le réapprovisionnement.')
                                    : t('products.alt_supplier_help', 'Fournisseur alternatif disponible pour ce produit.')}
                                </Text>
                              </View>
                              <View style={styles.supplySelectedActions}>
                                {!isPrimary && (
                                  <TouchableOpacity
                                    style={[styles.supplyActionBtn, { borderColor: colors.success + '45' }]}
                                    onPress={() => setFormPrimarySupplierId(supplierId)}
                                  >
                                    <Text style={[styles.supplyActionBtnText, { color: colors.success }]}>
                                      {t('products.set_primary', 'Définir principal')}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  style={[styles.supplyActionBtn, { borderColor: colors.danger + '45' }]}
                                  onPress={() => toggleFormSupplier(supplierId)}
                                >
                                  <Text style={[styles.supplyActionBtnText, { color: colors.danger }]}>
                                    {t('common.remove', 'Retirer')}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    <Text style={[styles.formLabel, { marginTop: 14, marginBottom: 8 }]}>
                      {t('products.supplier_suggestions', 'Suggestions fournisseurs')}
                    </Text>
                    <View style={{ gap: 8 }}>
                      {rankedSuppliers.map((sup) => {
                        const isSelected = formSupplierIds.includes(sup.supplier_id);
                        if (isSelected) return null;
                        const score = getSupplierMatchScore(sup);
                        return (
                          <View key={sup.supplier_id} style={styles.supplySuggestionCard}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={styles.supplySelectedName}>{sup.name}</Text>
                                {score > 0 && (
                                  <View style={[styles.supplyMatchBadge, { backgroundColor: colors.success + '14', borderColor: colors.success + '45' }]}>
                                    <Text style={[styles.supplyMatchBadgeText, { color: colors.success }]}>
                                      {t('products.match_badge', 'Match')} {score}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.supplySelectedSubtitle}>
                                {score > 0
                                  ? t('products.supplier_match_help', 'Correspondance détectée avec ce produit ou sa catégorie.')
                                  : t('products.supplier_available_help', 'Disponible dans votre base fournisseurs.')}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.supplyActionBtn, { borderColor: colors.primary + '45' }]}
                              onPress={() => toggleFormSupplier(sup.supplier_id)}
                            >
                              <Text style={[styles.supplyActionBtnText, { color: colors.primary }]}>
                                {t('common.add', 'Ajouter')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {!isRestaurant && hasEnterpriseLocations && (
                  <View style={{ marginBottom: Spacing.sm }}>
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.formLabel}>{t('products.location_label')}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        {t('products.location_help')}
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <TouchableOpacity
                        style={[styles.filterChip, !formLocationId && styles.filterChipActive]}
                        onPress={() => setFormLocationId('')}
                      >
                        <Text style={[styles.filterChipText, !formLocationId && styles.filterChipTextActive]}>
                          {t('products.no_location')}
                        </Text>
                      </TouchableOpacity>
                      {activeLocationChoices.map((location) => (
                        <TouchableOpacity
                          key={location.location_id}
                          style={[styles.filterChip, formLocationId === location.location_id && styles.filterChipActive]}
                          onPress={() => setFormLocationId(location.location_id)}
                        >
                          <Text
                            style={[styles.filterChipText, formLocationId === location.location_id && styles.filterChipTextActive]}
                            numberOfLines={1}
                          >
                            {getLocationPath(location.location_id) || location.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {!isRestaurant && (
                  <View style={styles.formRow}>
                    <View style={[styles.formHalf, { flex: 1 }]}>
                      <FormField
                        label={t('products.field_expiry')}
                        value={formExpiryDate}
                        onChangeText={setFormExpiryDate}
                        placeholder={t('products.date_format_placeholder')}
                        colors={colors}
                        styles={styles}
                      />
                    </View>
                  </View>
                )}

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
                          onPress={() => {
                            setFormUnit(u);
                            setFormQuantityPrecision(String(defaultPrecisionForUnit(u)));
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: String(formUnit).toLowerCase() === String(u).toLowerCase() ? colors.primary : colors.glass,
                            borderRadius: 20,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: String(formUnit).toLowerCase() === String(u).toLowerCase() ? colors.primary : colors.glassBorder
                          }}
                        >
                          <Text style={{ color: formUnit === u ? '#fff' : colors.text, fontSize: 13 }}>{t(`products.unit_${u.toLowerCase().replace('é', 'e')}`)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                {inferMeasurementType(formUnit) !== 'unit' && (
                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <FormField
                        label={'Pas de vente'}
                        value={formQuantityPrecision}
                        onChangeText={setFormQuantityPrecision}
                        keyboardType="numeric"
                        colors={colors}
                        styles={styles}
                      />
                    </View>
                    <View style={[styles.formHalf, { justifyContent: 'center' }]}>
                      <Text style={[styles.formLabel, { marginBottom: 6 }]}>Vente fractionnee</Text>
                      <View style={{ backgroundColor: colors.primary + '10', borderRadius: BorderRadius.md, padding: 12, borderWidth: 1, borderColor: colors.primary + '25' }}>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', lineHeight: 18 }}>
                          Prix et stock geres au {formUnit}. Minimum conseille : {formatMeasurementQuantity(parseFloat(formQuantityPrecision) || defaultPrecisionForUnit(formUnit), formUnit)}.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                {!isRestaurant && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.formLabel, { marginBottom: 8 }]}>{t('products.product_type_label')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[{ value: 'standard', label: t('products.product_type_standard') }, { value: 'raw_material', label: t('products.product_type_raw_material') }].map(opt => (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setFormProductType(opt.value)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            alignItems: 'center',
                            backgroundColor: formProductType === opt.value ? colors.primary + '20' : 'transparent',
                            borderColor: formProductType === opt.value ? colors.primary : colors.glassBorder,
                          }}
                        >
                          <Text style={{ color: formProductType === opt.value ? colors.primary : colors.textMuted, fontWeight: '600', fontSize: 13 }}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
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
                {!isRestaurant && (
                  <View style={styles.formRow}>
                    <View style={styles.formHalf}>
                      <FormField label={t('products.field_min_stock')} value={formMinStock} onChangeText={setFormMinStock} keyboardType="numeric" colors={colors} styles={styles} />
                    </View>
                    <View style={styles.formHalf}>
                      <FormField label={t('products.field_max_stock')} value={formMaxStock} onChangeText={setFormMaxStock} keyboardType="numeric" colors={colors} styles={styles} />
                    </View>
                  </View>
                )}

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
                    <Text style={styles.submitBtnText}>{editingProduct ? t('common.validate') : t('common.add')}</Text>
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
                <Text style={styles.modalTitle}>{t('products.history')}</Text>
                <Text style={styles.modalSubtitle}>{selectedProduct?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  alignSelf: 'flex-end',
                  marginBottom: Spacing.sm,
                  backgroundColor: colors.success + '18',
                  borderWidth: 1,
                  borderColor: colors.success + '38',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                }
              ]}
              onPress={handleExportHistoryCSV}
            >
              <Ionicons name="download-outline" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>{t('common.export')} CSV</Text>
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
                <Text style={[styles.filterChipText, historyTab === 'stock' && styles.filterChipTextActive]}>{t('products.history_tab_stock')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, historyTab === 'finance' && styles.filterChipActive, { flex: 1 }]}
                onPress={() => setHistoryTab('finance')}
              >
                <Text style={[styles.filterChipText, historyTab === 'finance' && styles.filterChipTextActive]}>{t('products.history_tab_sales')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, historyTab === 'price' && styles.filterChipActive, { flex: 1 }]}
                onPress={() => setHistoryTab('price')}
              >
                <Text style={[styles.filterChipText, historyTab === 'price' && styles.filterChipTextActive]}>{t('products.history_tab_price')}</Text>
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {historyTab === 'stock' ? (
                  historyMovements.length === 0 ? (
                    <Text style={styles.emptyText}>{t('products.no_movements_period')}</Text>
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
                            <Text style={styles.historyReason}>{t(mov.reason) || (mov.type === 'in' ? t('products.mov_in') : t('products.mov_out'))}</Text>
                            <Text style={styles.historyDate}>{mov.created_at ? new Date(mov.created_at).toLocaleString() : ''}</Text>
                          </View>
                          <Text style={[styles.historyQty, { color: mov.type === 'in' ? colors.success : colors.warning }]}>
                            {mov.type === 'in' ? '+' : '-'}{mov.quantity}
                          </Text>
                          {!mov.reason?.startsWith('Annulation de') && (
                            <TouchableOpacity
                              style={{ marginLeft: 8, padding: 4 }}
                              onPress={() => handleReverseMovement(mov.movement_id, mov.quantity, mov.type)}
                            >
                              <Ionicons name="arrow-undo-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      {historyMovements.length > 5 && (
                        <TouchableOpacity
                          style={styles.seeMoreBtn}
                          onPress={() => setShowAllMovements(!showAllMovements)}
                        >
                          <Text style={styles.seeMoreText}>
                            {showAllMovements ? t('products.see_less') : t('products.see_more_count', { count: historyMovements.length - 5 })}
                          </Text>
                          <Ionicons name={showAllMovements ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                ) : historyTab === 'finance' ? (
                  historySales.length === 0 ? (
                    <Text style={styles.emptyText}>{t('products.no_sales_period')}</Text>
                  ) : (
                    <View>
                      <View style={{ backgroundColor: colors.primary + '10', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t('products.total_quantity').toUpperCase()}</Text>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                            {historySales.reduce((total, sale) => {
                              const item = sale.items.find(i => i.product_id === selectedProduct?.product_id);
                              return total + (item?.quantity || 0);
                            }, 0)} {selectedProduct?.unit}(s)
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{t('products.total_revenue').toUpperCase()}</Text>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>
                            {historySales.reduce((total, sale) => {
                              const item = sale.items.find(i => i.product_id === selectedProduct?.product_id);
                              return total + (item?.total || 0);
                            }, 0)} {t('common.currency_default')}
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
                              <Text style={styles.historyReason}>{t('products.sale_hash')} #{sale.sale_id.slice(-6)}</Text>
                              <Text style={styles.historyDate}>{sale.created_at ? new Date(sale.created_at).toLocaleString() : ''}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.historyQty, { color: colors.text }]}>{item?.quantity} x {formatNumber(item?.selling_price)}</Text>
                              <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('common.total')}: {formatNumber(item?.total)} {t('common.currency_default')}</Text>
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
                            {showAllSalesHistory ? t('products.see_less') : t('products.see_more_sales', { count: historySales.length - 5 })}
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
                    <Text style={styles.emptyText}>{t('products.no_price_history')}</Text>
                  ) : (
                    <View>
                      {priceHistory.map((ph) => (
                        <View key={ph.history_id} style={styles.historyItem}>
                          <View style={[styles.movIcon, { backgroundColor: colors.info + '20' }]}>
                            <Ionicons name="pricetag-outline" size={16} color={colors.info} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyReason}>{t('products.price_update')}</Text>
                            <Text style={styles.historyDate}>{new Date(ph.recorded_at).toLocaleDateString()}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.historyQty}>{formatNumber(ph.selling_price)} {t('common.currency_default')}</Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted }}>{t('products.purchase_price_short')}: {formatNumber(ph.purchase_price)} {t('common.currency_default')}</Text>
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
      < Modal visible={showCategoryModal} animationType="slide" transparent onRequestClose={requestCloseCategoryModal} >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('products.manage_categories')}</Text>
              <TouchableOpacity onPress={requestCloseCategoryModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Add / Edit form */}
              <View style={styles.catForm}>
                <Text style={styles.formLabel}>{editingCategory ? t('products.edit_category') : t('products.new_category')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={catFormName}
                  onChangeText={setCatFormName}
                  placeholder={t('products.category_name_placeholder')}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.formLabel, { marginTop: Spacing.sm }]}>{t('products.color_label')}</Text>
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
                      <Text style={styles.catCancelText}>{t('common.cancel')}</Text>
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
                      <Text style={styles.submitBtnText}>{editingCategory ? t('common.validate') : t('common.add')}</Text>
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
                  <Text style={[styles.actionText, { color: colors.primary }]}>{t('products.import_standard_btn')}</Text>
                </TouchableOpacity>
              </View>

              {/* Category list */}
              {categoryList.length === 0 ? (
                <Text style={styles.catEmptyText}>{t('products.no_categories')}</Text>
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
      < Modal visible={showStockModal} animationType="slide" transparent onRequestClose={requestCloseStockModal} >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {movType === 'in' ? t('products.stock_movement_in_title') : t('products.stock_movement_out_title')} {selectedProduct?.name}
              </Text>
              <TouchableOpacity onPress={requestCloseStockModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedProduct && (
              <Text style={styles.modalSubtitle}>
                {selectedProduct.name} — {t('products.current_stock_label')} : {selectedProduct.quantity} {selectedProduct.unit}(s)
              </Text>
            )}
            <FormField
              label={t('products.field_quantity')}
              value={movQuantity}
              onChangeText={setMovQuantity}
              keyboardType="numeric"
              placeholder={t('products.field_quantity')}
              colors={colors}
              styles={styles}
            />
            {movType === 'in' && (
              <>
                <FormField
                  label={t('products.batch_number_label')}
                  value={movBatchNumber}
                  onChangeText={setMovBatchNumber}
                  placeholder={t('products.batch_number_placeholder_hint')}
                  colors={colors}
                  styles={styles}
                />
                <FormField
                  label={t('products.expiry_date_label')}
                  value={movExpiryDate}
                  onChangeText={setMovExpiryDate}
                  placeholder={t('products.expiry_date_placeholder_hint')}
                  colors={colors}
                  styles={styles}
                />
              </>
            )}
            <FormField
              label={t('products.reason_label')}
              value={movReason}
              onChangeText={setMovReason}
              placeholder={t('products.reason_placeholder')}
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
                  {movType === 'in' ? t('products.validate_in') : t('products.validate_out')}
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

      <TextImportModal
        visible={showTextImportModal}
        onClose={() => setShowTextImportModal(false)}
        onSuccess={() => loadData()}
      />

      <ScreenGuide
        visible={showGuide}
        onClose={() => { setShowGuide(false); markSeen(); }}
        title={(isRestaurant ? GUIDES.restaurantProducts : GUIDES.products).title}
        steps={(isRestaurant ? GUIDES.restaurantProducts : GUIDES.products).steps}
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
  headerActionRow: {
    paddingTop: Spacing.xs,
    gap: Spacing.xs,
    paddingHorizontal: 2,
    marginBottom: Spacing.sm,
  },
  headerActionRowGroup: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerActionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  headerActionText: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerActionPrimaryChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headerActionPrimaryText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
    flexShrink: 1,
  },
  addBtnExtended: {
    width: 'auto',
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  addBtnLabel: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
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
  quickPanelsScroll: {
    marginBottom: Spacing.md,
  },
  quickPanelCard: {
    ...glassStyle,
    width: 170,
    minHeight: 98,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  quickPanelTitle: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  quickPanelDesc: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 17,
  },
  sectionToggleCard: {
    ...glassStyle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionToggleCopy: {
    flex: 1,
  },
  sectionToggleTitle: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  sectionToggleDescription: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  locationModuleCard: {
    ...glassStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  locationModuleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  locationModuleContent: {
    flex: 1,
  },
  locationModuleTitle: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  locationModuleDescription: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 19,
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
  supplyCard: {
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  supplyTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  supplySubtitle: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
  },
  supplyManageBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  supplyManageBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    maxHeight: '96%',
    minHeight: '82%',
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
  supplySection: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  supplySectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  supplySectionHelp: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  supplyStatusPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  supplyStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  supplySelectedCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  supplySelectedName: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  supplySelectedSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  supplySelectedActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  supplyActionBtn: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.bgMid,
  },
  supplyActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  supplySuggestionCard: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.bgMid,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  supplyMatchBadge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  supplyMatchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
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
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 80,
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
