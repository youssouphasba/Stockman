import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Filter,
    Download,
    Plus,
    Minus,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    AlertCircle,
    Sparkles,
    Upload,
    Scan,
    History,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Layers,
    MapPin,
    ArrowLeftRight,
    FileSpreadsheet,
    FileText,
    X,
    Share2,
    TrendingUp,
    TrendingDown,
    Undo2,
    Clock,
    Package as PackageIcon
} from 'lucide-react';
import { exportInventory } from '../utils/ExportService';
import {
    products as productsApi,
    categories as categoriesApi,
    suppliers as suppliersApi,
    supplierProducts as supplierProductsApi,
    ai as aiApi,
    auth,
    catalog as catalogApi,
    locations as locationsApi,
    stores as storesApi,
    stock as stockApi,
    analytics as analyticsApi,
    userFeatures as userFeaturesApi,
    ApiError,
    AnalyticsStockHealth,
    ProductTrashItem,
    ProductDeleteJob,
    UserFeatures,
} from '../services/api';
import Modal from './Modal';
import BulkImportModal from './BulkImportModal';
import TextImportModal from './TextImportModal';
import ProductHistoryModal from './ProductHistoryModal';
import BarcodeScanner from './BarcodeScanner';
import BatchScanModal from './BatchScanModal';
import StockHealthPanel from './analytics/StockHealthPanel';
import { getPendingInventorySummary, mergeInventoryOfflineState } from '../services/offlineState';
import {
    defaultPrecisionForUnit,
    formatMeasurementQuantity,
    getInputStep,
    getQuantityInputMin,
    inferMeasurementType,
    isDiscreteUnitProduct,
    normalizeProductMeasurement,
} from '../utils/measurement';
import ScreenGuide, { GuideStep } from './ScreenGuide';

export default function Inventory() {
    const { t, i18n } = useTranslation();
    const isPerfEnabled = typeof window !== 'undefined' && localStorage.getItem('stockman_perf') === '1';
    const [products, setProducts] = useState<any[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [locationsList, setLocationsList] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [productsTotal, setProductsTotal] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const WEB_PRODUCTS_PAGE_SIZE = 100;

    // Modal & Form State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTextImportOpen, setIsTextImportOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState({ category: false, description: false, price: false });

    const [form, setForm] = useState({
        name: '',
        sku: '',
        quantity: 0,
        quantity_precision: 1,
        unit: 'piece',
        purchase_price: 0,
        selling_price: 0,
        min_stock: 0,
        max_stock: 100,
        category_id: '',
        location_id: '',
        product_type: 'standard',
        description: '',
        image: '',
        measurement_type: 'unit' as 'unit' | 'weight' | 'volume',
        display_unit: 'piece',
        pricing_unit: 'piece',
        allows_fractional_sale: false,
        has_variants: false,
        variants: [] as any[]
    });

    const [showVariantForm, setShowVariantForm] = useState(false);

    // Transfer state
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [transferProduct, setTransferProduct] = useState<any>(null);
    const [storeList, setStoreList] = useState<any[]>([]);
    const [transferQty, setTransferQty] = useState(1);
    const [transferDest, setTransferDest] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [showTransferHistory, setShowTransferHistory] = useState(false);
    const [transferHistory, setTransferHistory] = useState<any[]>([]);
    const [transferHistoryLoading, setTransferHistoryLoading] = useState(false);
    const [isLocationTransferOpen, setIsLocationTransferOpen] = useState(false);
    const [locationTransferProduct, setLocationTransferProduct] = useState<any>(null);
    const [locationTransferDest, setLocationTransferDest] = useState('');
    const [locationTransferNote, setLocationTransferNote] = useState('');
    const [locationTransferring, setLocationTransferring] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [currentFeatures, setCurrentFeatures] = useState<UserFeatures | null>(null);
    const hasEnterpriseLocations = currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || (currentUser?.effective_plan || currentUser?.plan) === 'enterprise';
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [isBulkPriceEditorOpen, setIsBulkPriceEditorOpen] = useState(false);
    const [bulkPriceProducts, setBulkPriceProducts] = useState<any[]>([]);
    const [isBulkStockEditorOpen, setIsBulkStockEditorOpen] = useState(false);
    const [bulkStockProducts, setBulkStockProducts] = useState<any[]>([]);
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [trashItems, setTrashItems] = useState<ProductTrashItem[]>([]);
    const [trashTotal, setTrashTotal] = useState(0);
    const [trashLoading, setTrashLoading] = useState(false);
    const [trashActionId, setTrashActionId] = useState<string | null>(null);
    const [bulkPriceDrafts, setBulkPriceDrafts] = useState<Record<string, { purchase_price: string; selling_price: string }>>({});
    const [bulkPriceLoading, setBulkPriceLoading] = useState(false);
    const [bulkPriceSaving, setBulkPriceSaving] = useState(false);
    const [bulkStockDrafts, setBulkStockDrafts] = useState<Record<string, string>>({});
    const [bulkStockLoading, setBulkStockLoading] = useState(false);
    const [bulkStockSaving, setBulkStockSaving] = useState(false);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [trackedDeleteJob, setTrackedDeleteJob] = useState<ProductDeleteJob | null>(null);
    const [bulkDeleteProcessedCount, setBulkDeleteProcessedCount] = useState(0);
    const [bulkDeleteTotalCount, setBulkDeleteTotalCount] = useState(0);
    const deleteJobNotificationRef = useRef<string | null>(null);
    const [catalogImportLoading, setCatalogImportLoading] = useState(false);
    const [stockHealth, setStockHealth] = useState<AnalyticsStockHealth | null>(null);
    const [stockHealthLoading, setStockHealthLoading] = useState(true);
    const [pendingInventorySummary, setPendingInventorySummary] = useState(() => getPendingInventorySummary());
    const [suppliersList, setSuppliersList] = useState<any[]>([]);
    const [supplierLinksByProduct, setSupplierLinksByProduct] = useState<Record<string, any[]>>({});
    const [formSupplierIds, setFormSupplierIds] = useState<string[]>([]);
    const [formPrimarySupplierId, setFormPrimarySupplierId] = useState('');
    const [supplierPickerProduct, setSupplierPickerProduct] = useState<any>(null);
    const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
    const [pickerSupplierIds, setPickerSupplierIds] = useState<string[]>([]);
    const [pickerPrimarySupplierId, setPickerPrimarySupplierId] = useState('');
    const [supplierPickerSaving, setSupplierPickerSaving] = useState(false);
    const [supplierCoverageFilter, setSupplierCoverageFilter] = useState<'all' | 'no_supplier' | 'multi_supplier' | 'missing_primary'>('all');

    // AI Replenishment advice
    const [replenishAdvice, setReplenishAdvice] = useState<{ advice: string; priority_count: number } | null>(null);
    const [replenishLoading, setReplenishLoading] = useState(false);
    const [showReplenish, setShowReplenish] = useState(false);

    // Vague 1: Sales forecast + Deadstock
    const [salesForecastMap, setSalesForecastMap] = useState<Record<string, any>>({});
    const [deadstockData, setDeadstockData] = useState<any>(null);
    const [showDeadstock, setShowDeadstock] = useState(false);

    // Vague 2: Seasonality + Duplicates
    const [seasonalityMap, setSeasonalityMap] = useState<Record<string, any>>({});
    const [duplicatesData, setDuplicatesData] = useState<any>(null);
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [duplicateActionKey, setDuplicateActionKey] = useState<string | null>(null);
    const [duplicatesBlockedUntil, setDuplicatesBlockedUntil] = useState<number>(0);
    const hasHydratedUserRef = useRef(false);
    const aiInsightsRequestKeyRef = useRef<string>('');
    const aiInsightsFailureAtRef = useRef<number>(0);
    const DUPLICATES_BLOCK_KEY = 'stockman_ai_detect_duplicates_blocked_until';

    // Stock movement modal
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [stockModalProduct, setStockModalProduct] = useState<any>(null);
    const [stockMovType, setStockMovType] = useState<'in' | 'out'>('in');
    const [stockMovQty, setStockMovQty] = useState('');
    const [stockMovReason, setStockMovReason] = useState('');
    const [stockMovLoading, setStockMovLoading] = useState(false);

    const sanitizeRows = <T extends Record<string, any>>(rows: unknown): T[] =>
        (Array.isArray(rows) ? rows : []).filter((row): row is T => Boolean(row) && typeof row === 'object');

    const safeProducts = useMemo(() => sanitizeRows<any>(products), [products]);
    const safeCategoriesList = useMemo(() => sanitizeRows<any>(categoriesList), [categoriesList]);
    const safeLocationsList = useMemo(() => sanitizeRows<any>(locationsList), [locationsList]);
    const safeSuppliersList = useMemo(() => sanitizeRows<any>(suppliersList), [suppliersList]);

    const locationMap = useMemo(
        () => new Map(safeLocationsList.map((loc) => [loc.location_id, loc])),
        [safeLocationsList],
    );
    const activeLocationsList = useMemo(
        () => safeLocationsList.filter((loc) => loc.is_active !== false),
        [safeLocationsList],
    );
    const selectedLocationRecord = selectedLocation ? locationMap.get(selectedLocation) : undefined;
    const locationFilterOptions = useMemo(
        () => (selectedLocationRecord && selectedLocationRecord.is_active === false
            ? [...activeLocationsList, selectedLocationRecord]
            : activeLocationsList),
        [activeLocationsList, selectedLocationRecord],
    );
    const selectedFormLocation = form.location_id ? locationMap.get(form.location_id) : undefined;
    const formLocationOptions = useMemo(
        () => (selectedFormLocation && selectedFormLocation.is_active === false
            ? [...activeLocationsList, selectedFormLocation]
            : activeLocationsList),
        [activeLocationsList, selectedFormLocation],
    );
    const getLocationLabel = useCallback((locationId: string | null) => {
        if (!locationId) return '';
        const parts: string[] = [];
        let current = locationMap.get(locationId);
        let guard = 0;
        while (current && guard < 8) {
            if (current.name) parts.push(current.name);
            current = current.parent_id ? locationMap.get(current.parent_id) : undefined;
            guard += 1;
        }
        if (parts.length === 0) return 'Emplacement supprime';
        return parts.reverse().join(' / ');
    }, [locationMap]);

    const handleStockMovement = async () => {
        const qty = parseFloat(stockMovQty);
        if (isNaN(qty) || qty <= 0) return;
        setStockMovLoading(true);
        try {
            await stockApi.addMovement({
                product_id: stockModalProduct.product_id,
                type: stockMovType,
                quantity: qty,
                reason: stockMovReason || (stockMovType === 'in' ? 'Entree stock' : 'Sortie stock'),
            });
            setProducts(prev => prev.map(p =>
                p.product_id === stockModalProduct.product_id
                    ? { ...p, quantity: stockMovType === 'in' ? p.quantity + qty : Math.max(0, p.quantity - qty) }
                    : p
            ));
            setPendingInventorySummary(getPendingInventorySummary());
            loadStockHealth();
            setStockModalOpen(false);
            setStockMovQty('');
            setStockMovReason('');
        } catch (err: any) {
            alert(err.message || 'Erreur lors du mouvement de stock');
        } finally {
            setStockMovLoading(false);
        }
    };

    const removeDuplicateFromState = (pairKey: string) => {
        setDuplicatesData((current: any) => {
            if (!current) return current;
            const nextDuplicates = (current.duplicates || []).filter((item: any) => item.pair_key !== pairKey);
            return {
                ...current,
                duplicates: nextDuplicates,
                total_found: Math.max(0, (current.total_found || 0) - 1),
            };
        });
    };

    const handleResolveDuplicate = async (itemAId: string, itemBId: string, status: 'ignored' | 'different') => {
        const ordered = [itemAId, itemBId].map(String).sort();
        const pairKey = `${ordered[0]}::${ordered[1]}`;
        setDuplicateActionKey(pairKey);
        try {
            await aiApi.resolveDuplicate('products', itemAId, itemBId, status);
            removeDuplicateFromState(pairKey);
        } catch (err: any) {
            alert(err.message || "Impossible d'enregistrer cette décision.");
        } finally {
            setDuplicateActionKey(null);
        }
    };

    const handleOpenDuplicateProduct = (productId: string) => {
        const product = safeProducts.find((entry) => entry.product_id === productId);
        if (!product) {
            alert("Produit introuvable dans la boutique active.");
            return;
        }
        handleOpenEditModal(product);
    };

    const fetchProducts = useCallback(async (locationFilter?: string, searchQuery?: string) => {
        const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        setLoading(true);
        setError(null);
        try {
            const resolvedLocation = locationFilter !== undefined
                ? (locationFilter || undefined)
                : (selectedLocation || undefined);
            const offlineLocationKey = locationFilter !== undefined ? locationFilter : selectedLocation;
            const resolvedSearch = searchQuery !== undefined ? searchQuery : search;
            let partialError = false;
            const [prodsRes, catsRes, locsRes, suppliersRes, linksRes] = await Promise.allSettled([
                productsApi.list(undefined, 0, WEB_PRODUCTS_PAGE_SIZE, resolvedLocation, undefined, resolvedSearch || undefined),
                categoriesApi.list(),
                hasEnterpriseLocations ? locationsApi.list() : Promise.resolve([]),
                suppliersApi.list(),
                supplierProductsApi.list(),
            ]);

            if (prodsRes.status !== 'fulfilled') {
                throw prodsRes.reason;
            }

            const merged = mergeInventoryOfflineState(
                prodsRes.value.items || prodsRes.value,
                offlineLocationKey || '',
            );
            setProducts(sanitizeRows<any>(merged.products));
            setProductsTotal(prodsRes.value.total || 0);
            setPendingInventorySummary(merged.summary);

            if (catsRes.status === 'fulfilled') {
                setCategoriesList(sanitizeRows<any>(catsRes.value));
            } else {
                partialError = true;
                console.warn('Inventory categories unavailable', catsRes.reason);
            }

            if (locsRes.status === 'fulfilled') {
                setLocationsList(sanitizeRows<any>(locsRes.value));
            } else {
                partialError = true;
                console.warn('Inventory locations unavailable', locsRes.reason);
            }

            if (suppliersRes.status === 'fulfilled') {
                const supplierRows = Array.isArray(suppliersRes.value)
                    ? suppliersRes.value
                    : (suppliersRes.value as any).items || [];
                setSuppliersList(sanitizeRows<any>(supplierRows));
            } else {
                partialError = true;
                console.warn('Inventory suppliers unavailable', suppliersRes.reason);
            }

            if (linksRes.status === 'fulfilled') {
                const grouped = sanitizeRows<any>(linksRes.value).reduce((acc: Record<string, any[]>, link: any) => {
                    if (!link.product_id) return acc;
                    if (!acc[link.product_id]) acc[link.product_id] = [];
                    acc[link.product_id].push(link);
                    return acc;
                }, {});
                setSupplierLinksByProduct(grouped);
            } else {
                partialError = true;
                console.warn('Inventory supplier links unavailable', linksRes.reason);
            }
            if (partialError) {
                setError(t('inventory.partial_load_error', { defaultValue: 'Certaines données annexes du stock sont temporairement indisponibles.' }));
            }
        } catch (err) {
            console.error('Error fetching inventory data', err);
            setError(t('inventory.load_error', { defaultValue: 'Impossible de charger les produits pour le moment.' }));
            setPendingInventorySummary(getPendingInventorySummary());
        } finally {
            if (isPerfEnabled) {
                const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
                console.info(`[SCREEN PERF][WEB][inventory] location=${locationFilter ?? selectedLocation ?? 'all'} duration=${elapsed.toFixed(1)}ms`);
                const host = window as unknown as { __stockmanScreenPerf?: any[] };
                if (!host.__stockmanScreenPerf) host.__stockmanScreenPerf = [];
                host.__stockmanScreenPerf.push({
                    screen: 'inventory',
                    location: locationFilter ?? selectedLocation ?? 'all',
                    duration_ms: elapsed,
                    ts: new Date().toISOString(),
                });
            }
            setLoading(false);
        }
    }, [currentUser?.role, hasEnterpriseLocations, isPerfEnabled, search, selectedLocation, t]);

    const loadMoreProducts = useCallback(async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            const resolvedLocation = selectedLocation || undefined;
            const res = await productsApi.list(undefined, products.length, WEB_PRODUCTS_PAGE_SIZE, resolvedLocation, undefined, search || undefined);
            const newItems = sanitizeRows<any>(res.items || []);
            setProducts(prev => {
                const existingIds = new Set(prev.map((p: any) => p.product_id));
                const unique = newItems.filter((p: any) => !existingIds.has(p.product_id));
                return [...prev, ...unique];
            });
            setProductsTotal(res.total || 0);
        } catch (err) {
            console.error('Error loading more products', err);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, products.length, search, selectedLocation]);

    const fetchAllProductsForCurrentFilter = useCallback(async () => {
        const resolvedLocation = selectedLocation || undefined;
        const resolvedSearch = search || undefined;
        const allProducts: any[] = [];
        const seenIds = new Set<string>();
        let skip = 0;
        let total = 0;

        do {
            const response = await productsApi.list(
                undefined,
                skip,
                WEB_PRODUCTS_PAGE_SIZE,
                resolvedLocation,
                undefined,
                resolvedSearch,
            );
            const pageItems = sanitizeRows<any>(response.items || response);
            total = Number(response.total ?? pageItems.length);
            pageItems.forEach((product) => {
                if (!product.product_id || seenIds.has(product.product_id)) return;
                seenIds.add(product.product_id);
                allProducts.push(product);
            });
            skip += pageItems.length;
            if (pageItems.length === 0) break;
        } while (allProducts.length < total);

        return allProducts;
    }, [search, selectedLocation]);

    const loadStockHealth = useCallback(async () => {
        setStockHealthLoading(true);
        try {
            const response = await analyticsApi.getStockHealth({ days: 30 });
            setStockHealth(response);
        } catch (err) {
            console.error('Error loading stock health', err);
        } finally {
            setStockHealthLoading(false);
        }
    }, []);

    const loadTrash = useCallback(async () => {
        setTrashLoading(true);
        try {
            const response = await productsApi.listTrash(0, 100);
            setTrashItems(sanitizeRows<ProductTrashItem>(response.items));
            setTrashTotal(response.total || 0);
        } catch (err) {
            console.error('Error loading product trash', err);
            window.alert(t('inventory.trash_load_error', { defaultValue: 'Impossible de charger la corbeille pour le moment.' }));
        } finally {
            setTrashLoading(false);
        }
    }, [t]);

    const handleOpenTrash = async () => {
        setIsTrashOpen(true);
        await loadTrash();
    };

    const handleRestoreTrashItem = async (productId: string) => {
        setTrashActionId(productId);
        try {
            await productsApi.restore(productId);
            await Promise.all([loadTrash(), fetchProducts(), loadStockHealth()]);
        } catch (err: any) {
            window.alert(err?.message || t('inventory.trash_restore_error', { defaultValue: 'Impossible de restaurer ce produit.' }));
        } finally {
            setTrashActionId(null);
        }
    };

    const handleDeleteTrashItemPermanently = async (item: ProductTrashItem) => {
        if (!window.confirm(t('inventory.trash_delete_confirm', { defaultValue: `Supprimer définitivement "${item.name}" ?`, name: item.name }))) {
            return;
        }
        setTrashActionId(item.product_id);
        try {
            await productsApi.deletePermanent(item.product_id);
            await Promise.all([loadTrash(), fetchProducts(), loadStockHealth()]);
        } catch (err: any) {
            window.alert(err?.message || t('inventory.trash_delete_error', { defaultValue: 'Impossible de supprimer définitivement ce produit.' }));
        } finally {
            setTrashActionId(null);
        }
    };

    useEffect(() => {
        let cancelled = false;
        productsApi.getActiveDeleteJob()
            .then((response) => {
                if (cancelled || !response.job) return;
                setTrackedDeleteJob(response.job);
                setBulkActionLoading(true);
                setBulkDeleteProcessedCount(response.job.processed_products);
                setBulkDeleteTotalCount(response.job.total_products);
            })
            .catch((err) => {
                console.warn('Active product delete job unavailable', err);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!trackedDeleteJob?.job_id) return;
        if (trackedDeleteJob.status !== 'queued' && trackedDeleteJob.status !== 'running') return;

        let cancelled = false;
        const refreshJob = async () => {
            try {
                const job = await productsApi.getDeleteJob(trackedDeleteJob.job_id);
                if (cancelled) return;
                setTrackedDeleteJob(job);
                setBulkDeleteProcessedCount(job.processed_products);
                setBulkDeleteTotalCount(job.total_products);
            } catch (err) {
                console.warn('Product delete job polling failed', err);
            }
        };

        void refreshJob();
        const interval = window.setInterval(() => void refreshJob(), 2000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [trackedDeleteJob?.job_id, trackedDeleteJob?.status]);

    useEffect(() => {
        if (!trackedDeleteJob?.job_id) return;

        if (trackedDeleteJob.status === 'completed') {
            if (deleteJobNotificationRef.current === trackedDeleteJob.job_id) return;
            deleteJobNotificationRef.current = trackedDeleteJob.job_id;
            setBulkActionLoading(false);
            setBulkDeleteProcessedCount(trackedDeleteJob.processed_products);
            setBulkDeleteTotalCount(trackedDeleteJob.total_products);
            void Promise.all([
                fetchProducts(),
                loadStockHealth(),
                isTrashOpen ? loadTrash() : Promise.resolve(),
            ]);
            window.alert(t('inventory.bulk_delete_job_completed', {
                defaultValue: 'Suppression terminée : {{deleted}} produit(s) envoyé(s) dans la corbeille.',
                deleted: trackedDeleteJob.deleted_count,
            }));
            return;
        }

        if (trackedDeleteJob.status === 'failed') {
            if (deleteJobNotificationRef.current === `${trackedDeleteJob.job_id}:failed`) return;
            deleteJobNotificationRef.current = `${trackedDeleteJob.job_id}:failed`;
            setBulkActionLoading(false);
            void fetchProducts();
            window.alert(trackedDeleteJob.last_error || t('inventory.bulk_delete_error'));
        }
    }, [fetchProducts, isTrashOpen, loadStockHealth, loadTrash, t, trackedDeleteJob]);

    useEffect(() => {
        void fetchProducts();
        void loadStockHealth();
        Promise.allSettled([storesApi.list(), auth.me(), userFeaturesApi.get()])
            .then(([storesRes, userRes, featuresRes]) => {
                if (storesRes.status === 'fulfilled') setStoreList(storesRes.value || []);
                else console.warn('Stores unavailable for inventory', storesRes.reason);

                if (userRes.status === 'fulfilled') setCurrentUser(userRes.value);
                else console.warn('Current user unavailable for inventory', userRes.reason);

                if (featuresRes.status === 'fulfilled') setCurrentFeatures(featuresRes.value);
                else console.warn('User features unavailable for inventory', featuresRes.reason);
            }).catch(() => {});
        const aiScopeKey = [
            currentUser?.user_id ?? 'anon',
            currentUser?.active_store_id ?? selectedLocation ?? '',
        ].join(':');
        const canRetryAiInsights = Date.now() - aiInsightsFailureAtRef.current > 30000;
        if (aiInsightsRequestKeyRef.current !== aiScopeKey && canRetryAiInsights) {
            aiInsightsRequestKeyRef.current = aiScopeKey;
            const shouldRunDuplicateDetection = (() => {
                if (typeof window === 'undefined') return true;
                const blockedUntil = Number(window.localStorage.getItem(DUPLICATES_BLOCK_KEY) || '0');
                setDuplicatesBlockedUntil(blockedUntil);
                return Date.now() >= blockedUntil;
            })();

            Promise.allSettled([
                aiApi.salesForecast(),
                aiApi.deadstockAnalysis(),
                aiApi.seasonalityAlerts(),
                shouldRunDuplicateDetection ? aiApi.detectDuplicates('products') : Promise.resolve(null),
            ]).then(([forecastRes, deadstockRes, seasonRes, dupsRes]) => {
                if (forecastRes.status === 'fulfilled' && forecastRes.value.forecasts) {
                    const map: Record<string, any> = {};
                    for (const f of forecastRes.value.forecasts) {
                        map[f.product_id] = f;
                    }
                    setSalesForecastMap(map);
                } else if (forecastRes.status === 'rejected') {
                    aiInsightsFailureAtRef.current = Date.now();
                }
                if (deadstockRes.status === 'fulfilled') {
                    setDeadstockData(deadstockRes.value);
                } else {
                    aiInsightsFailureAtRef.current = Date.now();
                }
                if (seasonRes.status === 'fulfilled' && seasonRes.value.alerts) {
                    const map: Record<string, any> = {};
                    for (const a of seasonRes.value.alerts) {
                        map[a.product_id] = a;
                    }
                    setSeasonalityMap(map);
                } else if (seasonRes.status === 'rejected') {
                    aiInsightsFailureAtRef.current = Date.now();
                }
                if (dupsRes.status === 'fulfilled') {
                    setDuplicatesData(dupsRes.value);
                    if (dupsRes.value?.blocked_until) {
                        setDuplicatesBlockedUntil(Number(dupsRes.value.blocked_until) || 0);
                    }
                } else {
                    aiInsightsFailureAtRef.current = Date.now();
                    const err = dupsRes.reason;
                    if (err instanceof ApiError && err.status === 429 && typeof window !== 'undefined') {
                        const blockedUntil = Date.now() + (12 * 60 * 60 * 1000);
                        window.localStorage.setItem(DUPLICATES_BLOCK_KEY, String(blockedUntil));
                        setDuplicatesBlockedUntil(blockedUntil);
                    }
                }
            });
        }
    }, [currentUser?.active_store_id, currentUser?.user_id, fetchProducts, loadStockHealth, selectedLocation]);

    useEffect(() => {
        if (!currentUser) return;
        if (!hasHydratedUserRef.current) {
            hasHydratedUserRef.current = true;
            return;
        }
        void fetchProducts();
    }, [currentUser?.effective_plan, currentUser?.plan, currentUser?.role, fetchProducts]);

    const handleReplenishAdvice = async () => {
        setReplenishLoading(true);
        setShowReplenish(true);
        try {
            const res = await aiApi.replenishmentAdvice(i18n.language);
            setReplenishAdvice(res);
        } catch (err) {
            console.error('Replenishment advice error', err);
        } finally {
            setReplenishLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setShowCreateMenu(false);
        setEditingProduct(null);
        setFormSupplierIds([]);
        setFormPrimarySupplierId('');
        setForm({
            name: '',
            sku: '',
            quantity: 0,
            quantity_precision: 1,
            unit: 'piece',
            purchase_price: 0,
            selling_price: 0,
            min_stock: 0,
            max_stock: 100,
            category_id: '',
            location_id: '',
            product_type: 'standard',
            description: '',
            image: '',
            measurement_type: 'unit',
            display_unit: 'piece',
            pricing_unit: 'piece',
            allows_fractional_sale: false,
            has_variants: false,
            variants: []
        });
        setIsProductModalOpen(true);
    };

    const handleImportCatalog = async () => {
        const sector = currentFeatures?.sector;
        if (!sector) {
            alert("Aucun type d'activité n'est défini pour ce compte.");
            return;
        }
        setShowCreateMenu(false);
        setCatalogImportLoading(true);
        try {
            const result = await catalogApi.importAll(sector, currentUser.country_code);
            alert(`${result.imported || 0} produits ont ete importes pour ${currentFeatures?.sector_label || sector}.`);
            await fetchProducts();
            await loadStockHealth();
        } catch (err: any) {
            alert(err.message || "Erreur lors de l'import du catalogue métier");
        } finally {
            setCatalogImportLoading(false);
        }
    };

    const handleOpenEditModal = (product: any) => {
        setEditingProduct(product);
        const productLinks = supplierLinksByProduct[product.product_id] || [];
        setFormSupplierIds(productLinks.map((link) => link.supplier_id).filter(Boolean));
        setFormPrimarySupplierId(productLinks.find((link) => link.is_preferred)?.supplier_id || '');
        setForm({
            name: product.name,
            sku: product.sku || '',
            quantity: product.quantity,
            quantity_precision: product.quantity_precision || defaultPrecisionForUnit(product.pricing_unit || product.unit, product.measurement_type),
            unit: normalizeProductMeasurement(product).unit,
            purchase_price: product.purchase_price,
            selling_price: product.selling_price,
            min_stock: product.min_stock || 0,
            max_stock: product.max_stock || 100,
            category_id: product.category_id || '',
            location_id: product.location_id || '',
            product_type: product.product_type || 'standard',
            description: product.description || '',
            image: product.image || '',
            measurement_type: product.measurement_type || inferMeasurementType(product.unit),
            display_unit: product.display_unit || product.unit || 'piece',
            pricing_unit: product.pricing_unit || product.unit || 'piece',
            allows_fractional_sale: product.allows_fractional_sale ?? (inferMeasurementType(product.unit) !== 'unit'),
            has_variants: product.has_variants || false,
            variants: product.variants || []
        });
        setIsProductModalOpen(true);
    };

    const handleOpenSupplierMarketplace = (product: any) => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('stockman_supplier_marketplace_context', JSON.stringify({
                productName: product.name || '',
                category: product.category_name || product.category_id || '',
                productId: product.product_id || '',
                countryCode: currentUser.country_code || '',
                city: currentUser.city || '',
            }));
            window.dispatchEvent(new CustomEvent('stockman:navigate-tab', {
                detail: { tab: 'suppliers' },
            }));
            return;
        }
    };

    const handleManageProductSuppliers = (product: any) => {
        const productLinks = supplierLinksByProduct[product.product_id] || [];
        setSupplierPickerProduct(product);
        setPickerSupplierIds(productLinks.map((link) => link.supplier_id).filter(Boolean));
        setPickerPrimarySupplierId(productLinks.find((link) => link.is_preferred).supplier_id || '');
        setIsSupplierPickerOpen(true);
    };

    const togglePickerSupplier = (supplierId: string) => {
        setPickerSupplierIds((prev) => {
            if (prev.includes(supplierId)) {
                const next = prev.filter((id) => id !== supplierId);
                if (pickerPrimarySupplierId === supplierId) {
                    setPickerPrimarySupplierId(next[0] || '');
                }
                return next;
            }
            const next = [...prev, supplierId];
            if (!pickerPrimarySupplierId) {
                setPickerPrimarySupplierId(supplierId);
            }
            return next;
        });
    };

    const handleSaveProductSuppliers = async () => {
        if (!supplierPickerProduct) return;
        setSupplierPickerSaving(true);
        try {
            const productId = supplierPickerProduct.product_id;
            const existingLinks = supplierLinksByProduct[productId] || [];
            const selectedIds = Array.from(new Set(pickerSupplierIds.filter(Boolean)));
            const selectedSet = new Set(selectedIds);
            const syncErrors: string[] = [];

            for (const link of existingLinks) {
                if (!selectedSet.has(link.supplier_id)) {
                    try {
                        await supplierProductsApi.unlink(link.link_id);
                    } catch (err: any) {
                        syncErrors.push(err.message || `Impossible de retirer le fournisseur ${getSupplierName(link.supplier_id)}.`);
                    }
                }
            }

            for (const supplierId of selectedIds) {
                const existing = existingLinks.find((link) => link.supplier_id === supplierId);
                if (existing) {
                    try {
                        await supplierProductsApi.update(existing.link_id, {
                            is_preferred: pickerPrimarySupplierId === supplierId,
                            supplier_price: Number(supplierPickerProduct.purchase_price) || existing.supplier_price || 0,
                        });
                    } catch (err: any) {
                        syncErrors.push(err.message || `Impossible de mettre à jour le fournisseur ${getSupplierName(supplierId)}.`);
                    }
                } else {
                    try {
                        await supplierProductsApi.link({
                            supplier_id: supplierId,
                            product_id: productId,
                            supplier_price: Number(supplierPickerProduct.purchase_price) || 0,
                            is_preferred: pickerPrimarySupplierId === supplierId,
                        });
                    } catch (err: any) {
                        syncErrors.push(err.message || `Impossible de lier le fournisseur ${getSupplierName(supplierId)}.`);
                    }
                }
            }

            if (syncErrors.length > 0) {
                alert(syncErrors[0]);
            }

            setIsSupplierPickerOpen(false);
            setSupplierPickerProduct(null);
            await fetchProducts();
        } finally {
            setSupplierPickerSaving(false);
        }
    };

    const handleOpenHistory = (product: any) => {
        setSelectedProductForHistory(product);
        setIsHistoryModalOpen(true);
    };

    const handleOpenTransfer = (product: any) => {
        setTransferProduct(product);
        setTransferQty(1);
        const otherStores = storeList.filter(s => s.store_id !== currentUser.active_store_id);
        setTransferDest(otherStores[0].store_id || '');
        setIsTransferOpen(true);
    };

    const handleOpenLocationTransfer = (product: any) => {
        setLocationTransferProduct(product);
        const availableLocations = activeLocationsList.filter((loc) => loc.location_id !== product.location_id);
        setLocationTransferDest(availableLocations[0].location_id || '');
        setLocationTransferNote('');
        setIsLocationTransferOpen(true);
    };

    const handleTransfer = async () => {
        if (!transferProduct || !transferDest || transferQty <= 0) return;
        setTransferring(true);
        try {
            await storesApi.transferStock({
                product_id: transferProduct.product_id,
                from_store_id: currentUser.active_store_id,
                to_store_id: transferDest,
                quantity: transferQty,
            });
            setIsTransferOpen(false);
            fetchProducts();
            loadStockHealth();
        } catch (err: any) {
            alert(err.message || 'Erreur lors du transfert');
        } finally {
            setTransferring(false);
        }
    };

    const handleLocationTransfer = async () => {
        if (!locationTransferProduct) return;
        setLocationTransferring(true);
        try {
            await productsApi.transferLocation(locationTransferProduct.product_id, {
                to_location_id: locationTransferDest || null,
                note: locationTransferNote || undefined,
            });
            setIsLocationTransferOpen(false);
            await fetchProducts();
        } catch (err: any) {
            alert(err.message || "Erreur lors du transfert d'emplacement");
        } finally {
            setLocationTransferring(false);
        }
    };

    const loadTransferHistory = async () => {
        setTransferHistoryLoading(true);
        try {
            const res = await storesApi.getTransfers(0, 50);
            setTransferHistory(res.items || []);
        } catch { /* silent */ }
        finally { setTransferHistoryLoading(false); }
    };

    const handleReverseTransfer = async (tr: any) => {
        if (!window.confirm(t('inventory.confirm_reverse_transfer', {
            qty: tr.quantity,
            product: tr.product_name,
            from: tr.from_store_name,
            to: tr.to_store_name,
        }))) return;
        try {
            await storesApi.reverseTransfer({
                product_id: tr.product_id,
                from_store_id: tr.from_store_id,
                to_store_id: tr.to_store_id,
                quantity: tr.quantity,
            });
            loadTransferHistory();
            fetchProducts();
        } catch (err: any) {
            alert(err.message || t('inventory.reverse_transfer_error'));
        }
    };

    const handleDeleteProduct = async (product: any) => {
        if (!product.product_id || deletingProductId) return;

        const confirmed = window.confirm(
            `Supprimer définitivement le produit "${product.name}" `,
        );

        if (!confirmed) {
            return;
        }

        setDeletingProductId(product.product_id);
        try {
            await productsApi.delete(product.product_id);
            setProducts(prev => prev.filter(item => item.product_id !== product.product_id));
            setPendingInventorySummary(getPendingInventorySummary());
            await fetchProducts();
            await loadStockHealth();
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la suppression du produit');
        } finally {
            setDeletingProductId(null);
        }
    };

    const handleSubmitProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const measurement = normalizeProductMeasurement({
                unit: form.unit,
                display_unit: form.unit,
                pricing_unit: form.unit,
                measurement_type: inferMeasurementType(form.unit),
                allows_fractional_sale: inferMeasurementType(form.unit) !== 'unit',
                quantity_precision: Number(form.quantity_precision) || defaultPrecisionForUnit(form.unit),
            });
            const payload = {
                ...form,
                name: form.name.trim(),
                sku: form.sku.trim() || undefined,
                description: form.description.trim() || undefined,
                category_id: form.category_id || undefined,
                location_id: form.location_id || undefined,
                image: form.image || undefined,
                unit: measurement.unit,
                measurement_type: measurement.measurement_type,
                display_unit: measurement.display_unit,
                pricing_unit: measurement.pricing_unit,
                allows_fractional_sale: measurement.allows_fractional_sale,
                quantity_precision: measurement.quantity_precision,
                variants: form.has_variants
                    ? form.variants
                        .filter((variant: any) => String(variant.name || '').trim())
                        .map((variant: any) => ({
                            ...variant,
                            name: String(variant.name || '').trim(),
                            sku: String(variant.sku || '').trim() || undefined,
                        }))
                    : [],
            };
            let savedProductId = editingProduct.product_id;
            if (editingProduct) {
                const updated = await productsApi.update(editingProduct.product_id, payload);
                savedProductId = updated.product_id || editingProduct.product_id;
            } else {
                const created = await productsApi.create(payload);
                savedProductId = created.product_id;
            }

            if (savedProductId) {
                const existingLinks = supplierLinksByProduct[savedProductId] || [];
                const selectedIds = Array.from(new Set(formSupplierIds.filter(Boolean)));
                const selectedSet = new Set(selectedIds);
                const supplierSyncErrors: string[] = [];

                for (const link of existingLinks) {
                    if (!selectedSet.has(link.supplier_id)) {
                        try {
                            await supplierProductsApi.unlink(link.link_id);
                        } catch (err: any) {
                            supplierSyncErrors.push(
                                err.message || `Impossible de retirer le fournisseur ${getSupplierName(link.supplier_id)}.`,
                            );
                        }
                    }
                }

                for (const supplierId of selectedIds) {
                    const existing = existingLinks.find((link) => link.supplier_id === supplierId);
                    if (existing) {
                        try {
                            await supplierProductsApi.update(existing.link_id, {
                                is_preferred: formPrimarySupplierId === supplierId,
                                supplier_price: Number(form.purchase_price) || existing.supplier_price || 0,
                            });
                        } catch (err: any) {
                            supplierSyncErrors.push(
                                err.message || `Impossible de mettre à jour le fournisseur ${getSupplierName(supplierId)}.`,
                            );
                        }
                    } else {
                        try {
                            await supplierProductsApi.link({
                                supplier_id: supplierId,
                                product_id: savedProductId,
                                supplier_price: Number(form.purchase_price) || 0,
                                is_preferred: formPrimarySupplierId === supplierId,
                            });
                        } catch (err: any) {
                            supplierSyncErrors.push(
                                err.message || `Impossible de lier le fournisseur ${getSupplierName(supplierId)}.`,
                            );
                        }
                    }
                }

                if (supplierSyncErrors.length > 0) {
                    alert(
                        `Le produit a bien ?t? enregistr?, mais certaines liaisons fournisseurs ont ?chou?.\n\n${supplierSyncErrors[0]}`,
                    );
                }
            }
            setIsProductModalOpen(false);
            await fetchProducts();
            await loadStockHealth();
        } catch (err: any) {
            console.error('Error saving product', err);
            alert(err.message || "Impossible d'enregistrer ce produit pour le moment.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleAiSuggestCategory = async () => {
        if (!form.name || form.name.length < 3) return;
        setAiLoading(prev => ({ ...prev, category: true }));
        try {
            const res = await aiApi.suggestCategory(form.name, i18n.language);
            const matchedCat = safeCategoriesList.find(c => (c.name || '').toLowerCase() === (res.category || '').toLowerCase());
            if (matchedCat) {
                setForm(prev => ({ ...prev, category_id: matchedCat.category_id }));
            }
        } catch (err) {
            console.error('AI Suggest category error', err);
        } finally {
            setAiLoading(prev => ({ ...prev, category: false }));
        }
    };

    const handleAiSuggestPrice = async () => {
        if (!editingProduct) return;
        setAiLoading(prev => ({ ...prev, price: true }));
        try {
            const res = await aiApi.suggestPrice(editingProduct.product_id, i18n.language);
            setForm(prev => ({ ...prev, selling_price: res.suggested_price }));
        } catch (err) {
            console.error('AI Suggest price error', err);
        } finally {
            setAiLoading(prev => ({ ...prev, price: false }));
        }
    };

    const handleAiGenerateDescription = async () => {
        if (!form.name) return;
        setAiLoading(prev => ({ ...prev, description: true }));
        try {
            const res = await aiApi.generateDescription(form.name, undefined, undefined, i18n.language);
            setForm(prev => ({ ...prev, description: res.description }));
        } catch (err) {
            console.error('AI Generate description error', err);
        } finally {
            setAiLoading(prev => ({ ...prev, description: false }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, image: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const addVariant = () => {
        setForm(prev => ({
            ...prev,
            has_variants: true,
            variants: [...prev.variants, { name: '', quantity: 0, selling_price: prev.selling_price }]
        }));
    };

    const updateVariant = (index: number, field: string, value: any) => {
        const newVariants = [...form.variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setForm(prev => ({ ...prev, variants: newVariants }));
    };

    const removeVariant = (index: number) => {
        const newVariants = form.variants.filter((_, i) => i !== index);
        setForm(prev => ({
            ...prev,
            variants: newVariants,
            has_variants: newVariants.length > 0
        }));
    };

    const normalizeMatchText = (value: string | null) =>
        (value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const toggleFormSupplier = (supplierId: string) => {
        setFormSupplierIds((prev) => {
            if (prev.includes(supplierId)) {
                const next = prev.filter((id) => id !== supplierId);
                if (formPrimarySupplierId === supplierId) {
                    setFormPrimarySupplierId(next[0] || '');
                }
                return next;
            }
            const next = [...prev, supplierId];
            if (!formPrimarySupplierId) {
                setFormPrimarySupplierId(supplierId);
            }
            return next;
        });
    };

    const rankedSuppliersForForm = [...safeSuppliersList]
        .map((supplier: any) => {
            const supplied = normalizeMatchText(supplier.products_supplied || '');
            const tokens = normalizeMatchText(`${form.name} ${form.category_id}`)
                .split(' ')
                .filter((token) => token.length >= 3);
            const normalizedScore = tokens.reduce((acc, token) => (supplied.includes(token) ? acc + 1 : acc), 0);
            return { supplier, score: normalizedScore };
        })
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.supplier.name || '').localeCompare(b.supplier.name || '');
        });

    const rankedSuppliersForPicker = [...safeSuppliersList]
        .map((supplier: any) => {
            const supplied = normalizeMatchText(supplier.products_supplied || '');
            const tokens = normalizeMatchText(`${supplierPickerProduct?.name || ''} ${supplierPickerProduct?.category_id || ''}`)
                .split(' ')
                .filter((token) => token.length >= 3);
            const score = tokens.reduce((acc, token) => (supplied.includes(token) ? acc + 1 : acc), 0);
            return { supplier, score };
        })
        .filter(({ supplier, score }) => score > 0 || pickerSupplierIds.includes(supplier.supplier_id))
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return (a.supplier.name || '').localeCompare(b.supplier.name || '');
        });

    const getSupplierName = (supplierId: string | null) =>
        safeSuppliersList.find((supplier: any) => supplier.supplier_id === supplierId)?.name || 'Fournisseur';

    const getProductSupplyMeta = (productId: string | null) => {
        const links = productId ? (supplierLinksByProduct[productId] || []) : [];
        const primaryLink = links.find((link) => link.is_preferred) || null;
        const primaryName = primaryLink ? getSupplierName(primaryLink.supplier_id) : '';

        if (links.length === 0) {
            return {
                tone: 'rose',
                status: 'Aucun fournisseur',
                subtitle: 'Ajoutez un fournisseur pour préparer le réapprovisionnement.',
            };
        }

        if (!primaryLink) {
            return {
                tone: 'sky',
                status: 'Principal manquant',
                subtitle: `${links.length} fournisseur(s) lié(s), aucun principal défini.`,
            };
        }

        return {
            tone: 'emerald',
            status: links.length > 1 ? 'Approvisionnement securise' : 'Approvisionnement pret',
            subtitle: links.length > 1
                ? `Principal : ${primaryName} + ${links.length - 1} alternative(s)`
                : `Principal : ${primaryName}`,
        };
    };

    const supplierCoverageStats = useMemo(() => ({
        noSupplier: safeProducts.filter((product) => (supplierLinksByProduct[product.product_id] || []).length === 0).length,
        multiSupplier: safeProducts.filter((product) => (supplierLinksByProduct[product.product_id] || []).length > 1).length,
        missingPrimary: safeProducts.filter((product) => {
            const links = supplierLinksByProduct[product.product_id] || [];
            return links.length > 0 && !links.some((link) => link.is_preferred);
        }).length,
    }), [safeProducts, supplierLinksByProduct]);

    const productMatchesSupplierCoverage = useCallback((product: any) => {
        const links = supplierLinksByProduct[product.product_id] || [];
        if (supplierCoverageFilter === 'all') return true;
        if (supplierCoverageFilter === 'no_supplier') return links.length === 0;
        if (supplierCoverageFilter === 'multi_supplier') return links.length > 1;
        if (supplierCoverageFilter === 'missing_primary') {
            return links.length > 0 && !links.some((link) => link.is_preferred);
        }
        return true;
    }, [supplierCoverageFilter, supplierLinksByProduct]);

    const filteredProducts = useMemo(
        () => safeProducts.filter(productMatchesSupplierCoverage),
        [productMatchesSupplierCoverage, safeProducts],
    );

    const filteredBulkPriceProducts = useMemo(
        () => sanitizeRows<any>(bulkPriceProducts).filter(productMatchesSupplierCoverage),
        [bulkPriceProducts, productMatchesSupplierCoverage],
    );

    const filteredBulkStockProducts = useMemo(
        () => sanitizeRows<any>(bulkStockProducts).filter(productMatchesSupplierCoverage),
        [bulkStockProducts, productMatchesSupplierCoverage],
    );

    const selectedProducts = useMemo(
        () => filteredProducts.filter((product) => selectedProductIds.has(product.product_id)),
        [filteredProducts, selectedProductIds],
    );

    const allVisibleSelected = filteredProducts.length > 0
        && filteredProducts.every((product) => selectedProductIds.has(product.product_id));

    const editedBulkPriceCount = useMemo(
        () => Object.values(bulkPriceDrafts).filter((draft) => draft.purchase_price !== '' || draft.selling_price !== '').length,
        [bulkPriceDrafts],
    );

    const editedBulkStockCount = useMemo(
        () => filteredBulkStockProducts.filter((product) => {
            const draft = bulkStockDrafts[product.product_id];
            if (draft == null || draft.trim() === '') return false;
            const parsed = Number(draft.replace(',', '.').trim());
            return Number.isFinite(parsed) && parsed !== Number(product.quantity ?? 0);
        }).length,
        [bulkStockDrafts, filteredBulkStockProducts],
    );

    const toggleSelectProduct = (productId: string) => {
        setSelectedProductIds((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const toggleSelectVisibleProducts = () => {
        setSelectedProductIds((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                filteredProducts.forEach((product) => next.delete(product.product_id));
            } else {
                filteredProducts.forEach((product) => next.add(product.product_id));
            }
            return next;
        });
    };

    const openBulkPriceEditor = async () => {
        setBulkPriceLoading(true);
        setIsBulkPriceEditorOpen(true);
        setBulkPriceDrafts({});
        setBulkPriceProducts([]);
        try {
            const editorProducts = safeProducts.length < productsTotal
                ? await fetchAllProductsForCurrentFilter()
                : safeProducts;
            const editableProducts = editorProducts.filter(productMatchesSupplierCoverage);
            const initialDrafts: Record<string, { purchase_price: string; selling_price: string }> = {};
            editableProducts.forEach((product) => {
                initialDrafts[product.product_id] = {
                    purchase_price: product.purchase_price != null ? String(product.purchase_price) : '',
                    selling_price: product.selling_price != null ? String(product.selling_price) : '',
                };
            });
            setBulkPriceProducts(editorProducts);
            setBulkPriceDrafts(initialDrafts);
        } catch (err: any) {
            console.error('Error loading products for quick price editor', err);
            setIsBulkPriceEditorOpen(false);
            window.alert(err.message || t('inventory.quick_price_editor_load_error', { defaultValue: "Impossible de charger tous les produits pour l'édition rapide." }));
        } finally {
            setBulkPriceLoading(false);
        }
    };

    const closeBulkPriceEditor = () => {
        setIsBulkPriceEditorOpen(false);
        setBulkPriceProducts([]);
        setBulkPriceDrafts({});
        setBulkPriceLoading(false);
        setBulkPriceSaving(false);
    };

    const openBulkStockEditor = async () => {
        setBulkStockLoading(true);
        setIsBulkStockEditorOpen(true);
        setBulkStockDrafts({});
        setBulkStockProducts([]);
        try {
            const editorProducts = safeProducts.length < productsTotal
                ? await fetchAllProductsForCurrentFilter()
                : safeProducts;
            const editableProducts = editorProducts.filter(productMatchesSupplierCoverage);
            const initialDrafts: Record<string, string> = {};
            editableProducts.forEach((product) => {
                initialDrafts[product.product_id] = String(product.quantity ?? 0);
            });
            setBulkStockProducts(editorProducts);
            setBulkStockDrafts(initialDrafts);
        } catch (err: any) {
            console.error('Error loading products for quick stock editor', err);
            setIsBulkStockEditorOpen(false);
            window.alert(err.message || t('inventory.quick_stock_editor_load_error', { defaultValue: "Impossible de charger tous les produits pour l'édition rapide du stock." }));
        } finally {
            setBulkStockLoading(false);
        }
    };

    const closeBulkStockEditor = () => {
        setIsBulkStockEditorOpen(false);
        setBulkStockProducts([]);
        setBulkStockDrafts({});
        setBulkStockLoading(false);
        setBulkStockSaving(false);
    };

    const updateBulkPriceDraft = (
        productId: string,
        field: 'purchase_price' | 'selling_price',
        value: string,
    ) => {
        setBulkPriceDrafts((prev) => ({
            ...prev,
            [productId]: {
                purchase_price: prev[productId]?.purchase_price ?? '',
                selling_price: prev[productId]?.selling_price ?? '',
                [field]: value,
            },
        }));
    };

    const updateBulkStockDraft = (productId: string, value: string) => {
        setBulkStockDrafts((prev) => ({
            ...prev,
            [productId]: value,
        }));
    };

    const handleBulkPriceSave = async () => {
        const updates: Array<{ product_id: string; purchase_price?: number; selling_price?: number }> = [];

        for (const product of filteredBulkPriceProducts) {
            const draft = bulkPriceDrafts[product.product_id];
            if (!draft) continue;

            const nextUpdate: { product_id: string; purchase_price?: number; selling_price?: number } = {
                product_id: product.product_id,
            };

            const purchaseValue = draft.purchase_price.replace(',', '.').trim();
            if (purchaseValue !== '') {
                const parsedPurchase = Number(purchaseValue);
                if (!Number.isFinite(parsedPurchase) || parsedPurchase < 0) {
                    window.alert(t('inventory.quick_price_editor_invalid', { name: product.name }));
                    return;
                }
                if (parsedPurchase !== Number(product.purchase_price ?? 0)) {
                    nextUpdate.purchase_price = parsedPurchase;
                }
            }

            const sellingValue = draft.selling_price.replace(',', '.').trim();
            if (sellingValue !== '') {
                const parsedSelling = Number(sellingValue);
                if (!Number.isFinite(parsedSelling) || parsedSelling < 0) {
                    window.alert(t('inventory.quick_price_editor_invalid', { name: product.name }));
                    return;
                }
                if (parsedSelling !== Number(product.selling_price ?? 0)) {
                    nextUpdate.selling_price = parsedSelling;
                }
            }

            if (nextUpdate.purchase_price !== undefined || nextUpdate.selling_price !== undefined) {
                updates.push(nextUpdate);
            }
        }

        if (updates.length === 0) {
            window.alert(t('inventory.quick_price_editor_no_changes'));
            return;
        }

        setBulkPriceSaving(true);
        try {
            const result = await productsApi.bulkUpdatePrices(updates);
            if (result.failed > 0) {
                const firstError = result.errors[0]?.message || t('inventory.quick_price_editor_error');
                window.alert(t('inventory.quick_price_editor_partial', { updated: result.updated, failed: result.failed, error: firstError }));
            } else {
                window.alert(t('inventory.quick_price_editor_success', { count: result.updated }));
            }
            closeBulkPriceEditor();
            await fetchProducts();
            await loadStockHealth();
        } catch (err: any) {
            window.alert(err.message || t('inventory.quick_price_editor_error'));
        } finally {
            setBulkPriceSaving(false);
        }
    };

    const handleBulkStockSave = async () => {
        const movements: Array<{ product_id: string; name: string; type: 'in' | 'out'; quantity: number }> = [];

        for (const product of filteredBulkStockProducts) {
            const rawValue = bulkStockDrafts[product.product_id];
            if (rawValue == null) continue;
            const normalizedValue = rawValue.replace(',', '.').trim();
            if (!normalizedValue) continue;
            const nextQuantity = Number(normalizedValue);
            if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
                window.alert(t('inventory.quick_stock_editor_invalid', { defaultValue: 'Stock invalide pour {{name}}.', name: product.name }));
                return;
            }
            const currentQuantity = Number(product.quantity ?? 0);
            const delta = nextQuantity - currentQuantity;
            if (Math.abs(delta) < 0.000001) continue;
            movements.push({
                product_id: product.product_id,
                name: product.name,
                type: delta > 0 ? 'in' : 'out',
                quantity: Math.abs(delta),
            });
        }

        if (movements.length === 0) {
            window.alert(t('inventory.quick_stock_editor_no_changes', { defaultValue: 'Aucun stock modifié.' }));
            return;
        }

        setBulkStockSaving(true);
        try {
            const failed: Array<{ name: string; message: string }> = [];
            for (const movement of movements) {
                try {
                    await stockApi.addMovement({
                        product_id: movement.product_id,
                        type: movement.type,
                        quantity: movement.quantity,
                        reason: t('inventory.quick_stock_editor_reason', { defaultValue: 'Correction rapide du stock web' }),
                    });
                } catch (err: any) {
                    failed.push({
                        name: movement.name,
                        message: err?.message || t('common.generic_error', { defaultValue: 'Une erreur est survenue.' }),
                    });
                }
            }

            if (failed.length > 0) {
                const firstError = failed[0];
                window.alert(t('inventory.quick_stock_editor_partial', {
                    defaultValue: '{{updated}} stock(s) mis à jour, {{failed}} échec(s). Premier échec : {{name}} - {{error}}',
                    updated: movements.length - failed.length,
                    failed: failed.length,
                    name: firstError.name,
                    error: firstError.message,
                }));
            } else {
                window.alert(t('inventory.quick_stock_editor_success', { defaultValue: '{{count}} stock(s) mis à jour.', count: movements.length }));
            }

            closeBulkStockEditor();
            await fetchProducts();
            await loadStockHealth();
        } catch (err: any) {
            window.alert(err.message || t('inventory.quick_stock_editor_error', { defaultValue: "Impossible d'enregistrer les stocks pour le moment." }));
        } finally {
            setBulkStockSaving(false);
        }
    };

    const handleShareSelectedProducts = async () => {
        const targetProducts = selectedProducts;
        if (targetProducts.length === 0) {
            window.alert(t('inventory.selection_required'));
            return;
        }

        const lines = targetProducts.map((product) => {
            const sku = product.sku ? ` (${product.sku})` : '';
            return `- ${product.name}${sku} · ${product.selling_price} F`;
        });
        const shareText = [
            t('inventory.bulk_share_catalog'),
            '',
            ...lines,
        ].join('\n');

        try {
            if (navigator.share) {
                await navigator.share({ text: shareText });
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareText);
            } else {
                throw new Error(t('inventory.share_selection_error'));
            }
            window.alert(t('inventory.share_selection_success', { count: targetProducts.length }));
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            window.alert(err?.message || t('inventory.share_selection_error'));
        }
    };

    const removeProductsLocally = (productIds: string[]) => {
        if (productIds.length === 0) return;
        const idsToRemove = new Set(productIds);
        setProducts(prev => prev.filter(product => !idsToRemove.has(product.product_id)));
        setProductsTotal(prev => Math.max(0, prev - productIds.length));
    };

    const handleDeleteSelectedProducts = async () => {
        if (selectedProducts.length === 0 || bulkActionLoading) {
            return;
        }
        const productsToDelete = selectedProducts;
        const productIds = productsToDelete.map((product) => product.product_id);

        const confirmed = window.confirm(
            t('inventory.bulk_delete_confirm', { count: productsToDelete.length }),
        );
        if (!confirmed) {
            return;
        }

        setBulkActionLoading(true);
        setBulkDeleteProcessedCount(0);
        setBulkDeleteTotalCount(productIds.length);
        removeProductsLocally(productIds);
        setSelectedProductIds(new Set());
        setSelectionMode(false);
        try {
            const job = await productsApi.createDeleteJob(productIds);
            setTrackedDeleteJob(job);
            setBulkDeleteProcessedCount(job.processed_products);
            setBulkDeleteTotalCount(job.total_products);
            window.alert(t('inventory.bulk_delete_job_started', {
                defaultValue: '{{count}} produit(s) vont être déplacés vers la corbeille en arrière-plan.',
                count: job.total_products,
            }));
        } catch (err: any) {
            window.alert(err.message || t('inventory.bulk_delete_error'));
            await fetchProducts();
            setBulkActionLoading(false);
            setBulkDeleteProcessedCount(0);
            setBulkDeleteTotalCount(0);
        }
    };

    if (loading && safeProducts.length === 0 && !error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error && safeProducts.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center px-6">
                <div className="glass-card max-w-md w-full p-8 text-center border border-rose-500/20">
                    <AlertCircle size={28} className="mx-auto mb-4 text-rose-400" />
                    <h2 className="text-xl font-black text-white mb-2">
                        {t('inventory.load_error_title', { defaultValue: 'Chargement impossible' })}
                    </h2>
                    <p className="text-sm text-slate-400 leading-6 mb-6">{error}</p>
                    <button
                        onClick={() => void fetchProducts()}
                        className="btn-primary px-6 py-3"
                    >
                        {t('common.retry', { defaultValue: 'R?essayer' })}
                    </button>
                </div>
            </div>
        );
    }

    const inventorySteps: GuideStep[] = [
        {
            title: t('guide.inventory.role_title', "Rôle de l'inventaire"),
            content: t('guide.inventory.role_content', "L'inventaire regroupe tous vos produits actifs. C'est ici que vous créez, modifiez, suivez, importez et exportez votre stock. Chaque mouvement est tracé et toutes les données affichées dépendent de la boutique active."),
        },
        {
            title: t('guide.inventory.header_title', "Barre d'en-tête"),
            content: t('guide.inventory.header_content', "Les boutons du haut servent à créer des produits, importer en lot, lancer un scan, exporter le stock, ouvrir les éditions rapides des prix ou du stock et activer la sélection multiple sans quitter l'écran."),
            details: [
                { label: t('guide.inventory.btn_add', "Nouveau produit"), description: t('guide.inventory.btn_add_desc', "Ouvre la fiche complète de création : nom, SKU, quantité initiale, unité, prix, seuils, catégorie, emplacement et description."), type: 'button' },
                { label: t('guide.inventory.btn_import_csv', "Import CSV"), description: t('guide.inventory.btn_import_csv_desc', "Utilisez cet import pour créer plusieurs produits d'un coup. Préparez votre fichier avec les bonnes colonnes, vérifiez l'aperçu puis validez la création."), type: 'button' },
                { label: t('guide.inventory.btn_import_text', "Import texte"), description: t('guide.inventory.btn_import_text_desc', "Collez une liste brute quand vous n'avez pas encore un fichier propre. Relisez toujours le résultat avant d'enregistrer pour éviter une création incorrecte."), type: 'button' },
                { label: t('guide.inventory.btn_scan', "Scan en lot"), description: t('guide.inventory.btn_scan_desc', "Le scan en série accélère les entrées de stock, les réceptions et certains contrôles. Il est utile quand vous manipulez beaucoup d'articles en peu de temps."), type: 'button' },
                { label: t('guide.inventory.btn_quick_prices', "Édition rapide des prix"), description: t('guide.inventory.btn_quick_prices_desc', "Ouvre une grille d'édition pour corriger en lot les prix d'achat et de vente des produits déjà filtrés."), type: 'button' },
                { label: t('guide.inventory.btn_quick_stock', "Édition rapide du stock"), description: t('guide.inventory.btn_quick_stock_desc', "Charge tous les produits du filtre actif. Saisissez le stock réel : Stockman enregistre seulement les écarts sous forme de mouvements d'entrée ou de sortie."), type: 'button' },
                { label: t('guide.inventory.btn_selection', "Sélection"), description: t('guide.inventory.btn_selection_desc', "Active la sélection multiple pour partager le catalogue visible ou envoyer plusieurs produits dans la corbeille commune."), type: 'button' },
                { label: t('guide.inventory.btn_export_xls', "Exporter Excel"), description: t('guide.inventory.btn_export_xls_desc', "Exporte le stock affiché avec ses colonnes utiles pour le contrôle, la comptabilité, le partage interne ou le travail hors application."), type: 'button' },
                { label: t('guide.inventory.btn_export_pdf', "Exporter PDF"), description: t('guide.inventory.btn_export_pdf_desc', "Génère un document plus lisible pour l'impression, la validation terrain ou le partage rapide."), type: 'button' },
            ],
        },
        {
            title: t('guide.inventory.search_title', "Recherche et filtres"),
            content: t('guide.inventory.search_content', "La recherche et les filtres servent à retrouver vite un article, à isoler une zone du stock ou à concentrer l'analyse sur un type précis de produit."),
            details: [
                { label: t('guide.inventory.search_bar', "Barre de recherche"), description: t('guide.inventory.search_bar_desc', "Recherche par nom, SKU ou code d'identification. C'est le plus rapide pour retrouver un article avant une correction ou une commande."), type: 'filter' },
                { label: t('guide.inventory.filter_location', "Filtre emplacement"), description: t('guide.inventory.filter_location_desc', "Affiche uniquement les produits rangés dans une zone donnée. Utilisez-le pendant les comptages, les transferts internes et les contrôles physiques."), type: 'filter' },
                { label: t('guide.inventory.filter_toggle', "Filtres de couverture fournisseur"), description: t('guide.inventory.filter_toggle_desc', "Isolez les produits sans fournisseur, avec plusieurs fournisseurs ou sans principal défini. Cette lecture est utile pour sécuriser le réapprovisionnement."), type: 'filter' },
            ],
        },
        {
            title: t('guide.inventory.product_list_title', "Liste des produits"),
            content: t('guide.inventory.product_list_content', "Chaque ligne résume l'état opérationnel d'un produit : quantité, prix, catégorie, emplacement, couverture fournisseur et actions disponibles."),
            details: [
                { label: t('guide.inventory.col_name', "Produit"), description: t('guide.inventory.col_name_desc', "Le nom ouvre la fiche complète. Utilisez cette fiche pour corriger les données, relier des fournisseurs, changer un emplacement ou compléter la description."), type: 'card' },
                { label: t('guide.inventory.col_sku', "SKU"), description: t('guide.inventory.col_sku_desc', "Le SKU sert de référence interne pour l'import, l'export, la recherche et certains contrôles terrain."), type: 'info' },
                { label: t('guide.inventory.col_qty', "Quantité"), description: t('guide.inventory.col_qty_desc', "La quantité affichée est votre stock disponible actuel. Comparez-la toujours avec le seuil minimum et l'état de couverture fournisseur avant une décision."), type: 'card' },
                { label: t('guide.inventory.col_price', "Prix"), description: t('guide.inventory.col_price_desc', "Les prix d'achat et de vente servent au suivi de marge et à la préparation des décisions d'achat ou de repositionnement."), type: 'info' },
                { label: t('guide.inventory.col_supplier', "Approvisionnement"), description: t('guide.inventory.col_supplier_desc', "Ce bloc vous indique si le produit a un fournisseur, plusieurs alternatives ou aucun principal défini. C'est la base pour savoir si le produit est vraiment prêt au réapprovisionnement."), type: 'card' },
            ],
        },
        {
            title: t('guide.inventory.actions_title', "Actions sur un produit"),
            content: t('guide.inventory.actions_content', "Chaque produit propose des actions directes pour corriger le stock, gérer le rangement et préparer l'approvisionnement. Les actions de lot passent par la sélection multiple et l'édition rapide des prix."),
            details: [
                { label: t('guide.inventory.action_edit', "Modifier"), description: t('guide.inventory.action_edit_desc', "Corrigez ici les informations de base : prix, seuils, catégorie, description, unité, emplacement et liaisons utiles."), type: 'button' },
                { label: t('guide.inventory.action_movement', "Mouvement de stock"), description: t('guide.inventory.action_movement_desc', "Utilisez cette action pour enregistrer une entrée, une sortie ou une correction avec une raison claire. Elle sert aux livraisons, pertes, casses et ajustements."), type: 'button' },
                { label: t('guide.inventory.action_transfer', "Transfert entre boutiques"), description: t('guide.inventory.action_transfer_desc', "Déplacez une quantité vers une autre boutique quand vous gérez plusieurs points de vente. Cela garde une trace du mouvement et évite les corrections manuelles."), type: 'button' },
                { label: t('guide.inventory.action_location_transfer', "Transfert d'emplacement"), description: t('guide.inventory.action_location_transfer_desc', "Déplacez le produit d'une zone de rangement à une autre sans changer la quantité globale. Cette action sert au rangement et aux réorganisations internes."), type: 'button' },
                { label: t('guide.inventory.action_supplier_find', "Associer à un fournisseur"), description: t('guide.inventory.action_supplier_find_desc', "Cette action ouvre la recherche fournisseurs avec le produit déjà préparé pour vous aider à trouver qui le vend."), type: 'button' },
                { label: t('guide.inventory.action_supplier_manage', "Gérer les fournisseurs"), description: t('guide.inventory.action_supplier_manage_desc', "Utilisez cette action quand le produit a déjà des liaisons. Elle sert à définir le principal, retirer un lien ou revoir les alternatives."), type: 'button' },
                { label: t('guide.inventory.action_history', "Historique"), description: t('guide.inventory.action_history_desc', "Affiche les mouvements, ajustements et événements liés au produit pour comprendre ce qui a changé et quand."), type: 'button' },
                { label: t('guide.inventory.action_delete', "Supprimer"), description: t('guide.inventory.action_delete_desc', "Supprime définitivement le produit si vous êtes certain qu'il ne doit plus exister. Cette action est sensible et ne doit pas servir à corriger un simple stock."), type: 'button' },
            ],
        },
        {
            title: t('guide.inventory.locations_title', "Organisation par emplacement"),
            content: t('guide.inventory.locations_content', "Quand la gestion des emplacements est active, elle sert à reproduire votre rangement réel : zones, allées, rayons, niveaux, étagères ou toute autre structure adaptée à votre activité."),
            details: [
                { label: t('guide.inventory.location_field', "Champ emplacement"), description: t('guide.inventory.location_field_desc', "Associez chaque produit à son bon emplacement pour faciliter le rangement, le contrôle et la préparation."), type: 'info' },
                { label: t('guide.inventory.location_filter', "Filtre emplacement"), description: t('guide.inventory.location_filter_desc', "Isole une zone précise du stock pour accélérer un inventaire, un contrôle ou un rangement."), type: 'filter' },
                { label: t('guide.inventory.location_import', "Import avec emplacement"), description: t('guide.inventory.location_import_desc', "Utilisez cette donnée dans vos imports quand vous connaissez déjà le rangement cible. Cela vous évite une affectation manuelle produit par produit."), type: 'info' },
            ],
        },
        {
            title: t('guide.inventory.ai_title', "KPI stock et réapprovisionnement"),
            content: t('guide.inventory.ai_content', "Les panneaux de santé du stock et de réapprovisionnement servent à piloter, pas seulement à observer. Ils aident à comprendre où agir en priorité."),
            details: [
                { label: t('guide.inventory.kpi_stock_health', "Santé du stock"), description: t('guide.inventory.kpi_stock_health_desc', "Ce bloc résume les ruptures, stocks bas, surstocks et produits dormants. Il vous aide à savoir si vous risquez une perte de vente, une immobilisation excessive ou un besoin de correction."), type: 'info' },
                { label: t('guide.inventory.kpi_pending_sync', "Synchronisations en attente"), description: t('guide.inventory.kpi_pending_sync_desc', "Ce compteur vous alerte quand des créations, mises à jour ou mouvements n'ont pas encore été envoyés. Avant une décision importante, vérifiez que tout est bien synchronisé."), type: 'info' },
                { label: t('guide.inventory.ai_tip', "Suggestion IA"), description: t('guide.inventory.ai_tip_desc', "La recommandation de réapprovisionnement devient plus fiable quand vous avez au moins quelques semaines de ventes cohérentes et des fournisseurs correctement liés."), type: 'tip' },
            ],
        },
        {
            title: "Utilisation de l'IA",
            content: "L'IA sur cette page sert à prioriser les produits à traiter. Elle ne remplace pas vos décisions de stock, elle vous aide à repérer les urgences.",
            details: [
                { label: 'Prév. 7j', description: "La colonne de prévision apparaît produit par produit si une estimation est disponible. Un tiret signifie simplement qu'aucune prévision exploitable n'est encore calculée.", type: 'info' },
                { label: 'Produits dormants', description: "La bannière s'affiche seulement si des articles sans vente sont détectés. Ouvrez-la pour voir lesquels immobilisent du stock.", type: 'card' },
                { label: 'Saisonnalité', description: "Le badge saisonnier n'apparaît que sur les produits avec un pic détecté et jugé urgent.", type: 'info' },
                { label: 'Doublons détectés', description: "Cette alerte n'apparaît que si des produits très proches ont été trouvés dans votre catalogue.", type: 'card' },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <ScreenGuide steps={inventorySteps} guideKey="inventory_tour" />
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 md:mb-10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('common.stock')}</h1>
                    <p className="theme-text-muted">{t('catalog.product_count', { count: productsTotal })}</p>
                    {error && (
                        <div className="mt-4 inline-flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                            <button
                                onClick={() => void fetchProducts()}
                                className="rounded-full border border-amber-400/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100 hover:bg-amber-500/10"
                            >
                                {t('common.retry', { defaultValue: 'Ressayer' })}
                            </button>
                        </div>
                    )}
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] theme-text-muted">
                        Création disponible : manuel, texte IA, import CSV et catalogue métier
                    </p>
                    {pendingInventorySummary.pendingTotal > 0 && (
                        <div className="mt-4 inline-flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200">
                            <AlertCircle size={14} />
                            <span>
                                {pendingInventorySummary.pendingProducts} produit(s), {pendingInventorySummary.pendingUpdates} mise(s) à jour et {pendingInventorySummary.pendingStockMovements} mouvement(s) de stock attendent encore la synchronisation.
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => void openBulkPriceEditor()}
                        disabled={productsTotal === 0 || bulkPriceLoading}
                        className="glass-card theme-text px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Edit size={16} />
                        {bulkPriceLoading ? t('common.loading', { defaultValue: 'Chargement...' }) : t('inventory.quick_price_editor')}
                    </button>
                    <button
                        onClick={() => void openBulkStockEditor()}
                        disabled={productsTotal === 0 || bulkStockLoading}
                        className="glass-card theme-text px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PackageIcon size={16} />
                        {bulkStockLoading
                            ? t('common.loading', { defaultValue: 'Chargement...' })
                            : t('inventory.quick_stock_editor', { defaultValue: 'Édition rapide du stock' })}
                    </button>
                    <button
                        onClick={() => void handleOpenTrash()}
                        className="glass-card theme-text px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        {t('inventory.trash_button', { defaultValue: 'Corbeille' })}
                    </button>
                    <button
                        onClick={() => {
                            setSelectionMode((prev) => {
                                if (prev) {
                                    setSelectedProductIds(new Set());
                                }
                                return !prev;
                            });
                        }}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-2xl border ${
                            selectionMode
                                ? 'border-primary bg-primary/15 text-primary'
                                : 'glass-card theme-text hover:bg-white/10'
                        }`}
                    >
                        <Layers size={16} />
                        {selectionMode ? t('inventory.selection_mode_close') : t('inventory.selection_mode')}
                    </button>
                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(v => !v)}
                            className="glass-card theme-text px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <Download size={16} />
                            Exporter
                            <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[180px]">
                                <button
                                    onClick={() => { exportInventory(filteredProducts, 'F', 'excel'); setShowExportMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm theme-text hover:bg-white/10 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-emerald-400" />
                                    Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => { exportInventory(filteredProducts, 'F', 'pdf'); setShowExportMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm theme-text hover:bg-white/10 transition-colors"
                                >
                                    <FileText size={16} className="text-red-400" />
                                    PDF
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowCreateMenu(v => !v)}
                            className="btn-primary py-2 px-6 flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Créer / importer
                            <ChevronDown size={14} className={`transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showCreateMenu && (
                            <div className="absolute right-0 top-full z-50 mt-1 min-w-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#1E293B] shadow-2xl">
                                <button
                                    onClick={handleOpenAddModal}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                                >
                                    <Plus size={16} className="text-primary" />
                                    <div>
                                        <p className="font-bold">Créer manuellement</p>
                                        <p className="text-xs theme-text-muted">Formulaire complet avec aide IA dans la fiche produit.</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateMenu(false);
                                        setIsTextImportOpen(true);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                                >
                                    <Sparkles size={16} className="text-violet-400" />
                                    <div>
                                        <p className="font-bold">Importer depuis un texte</p>
                                        <p className="text-xs theme-text-muted">Colle une liste libre, l'IA structure et crée les produits.</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateMenu(false);
                                        setIsImportModalOpen(true);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10"
                                >
                                    <Upload size={16} className="text-emerald-400" />
                                    <div>
                                        <p className="font-bold">Importer un CSV</p>
                                        <p className="text-xs theme-text-muted">Import en masse avec mapping intelligent des colonnes.</p>
                                    </div>
                                </button>
                                <button
                                    onClick={handleImportCatalog}
                                    disabled={catalogImportLoading || !currentFeatures?.sector}
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Layers size={16} className="text-amber-400" />
                                    <div>
                                        <p className="font-bold">
                                            {catalogImportLoading
                                                ? 'Import du catalogue?'
                                            : `Importer le catalogue ${currentFeatures?.sector_label || 'du metier'}`}
                                        </p>
                                        <p className="text-xs theme-text-muted">Précharge un catalogue adapté à ton type d'activité.</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsBatchScanOpen(true)}
                        className="glass-card theme-text px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <Layers size={16} />
                        Scan par lot
                    </button>
                    <button
                        onClick={handleReplenishAdvice}
                        disabled={replenishLoading}
                        className="glass-card px-4 py-2 text-sm font-medium text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Sparkles size={16} />
                        {replenishLoading ? 'Analyse...' : 'IA Réappro'}
                    </button>
                </div>
            </header>

            {selectionMode && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white">
                        <label className="inline-flex items-center gap-2 font-semibold">
                            <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                onChange={toggleSelectVisibleProducts}
                                className="h-4 w-4 rounded border-white/20 bg-transparent"
                            />
                            {t('inventory.selection_select_page', { count: filteredProducts.length })}
                        </label>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
                            {t('inventory.selection_count', { count: selectedProductIds.size })}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => void handleShareSelectedProducts()}
                            disabled={selectedProductIds.size === 0}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Share2 size={16} />
                            {t('inventory.bulk_share_catalog')}
                        </button>
                        <button
                            onClick={() => void handleDeleteSelectedProducts()}
                            disabled={selectedProductIds.size === 0 || bulkActionLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-400/45 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 transition-colors hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            {t('inventory.bulk_delete_selected')}
                        </button>
                    </div>
                </div>
            )}

            {trackedDeleteJob && (trackedDeleteJob.status === 'queued' || trackedDeleteJob.status === 'running') && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="mt-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-rose-300/30 border-t-rose-200" />
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.18em] text-rose-200">
                                {t('inventory.bulk_delete_running_title', { defaultValue: 'Suppression en arrière-plan' })}
                            </p>
                            <p className="mt-1 text-sm text-rose-50/80">
                                {t('inventory.bulk_delete_running_msg', {
                                    defaultValue: '{{processed}}/{{total}} produit(s) traités. Vous pouvez continuer à travailler.',
                                    processed: bulkDeleteProcessedCount || trackedDeleteJob.processed_products,
                                    total: bulkDeleteTotalCount || trackedDeleteJob.total_products,
                                })}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void productsApi.getDeleteJob(trackedDeleteJob.job_id).then((job) => {
                            setTrackedDeleteJob(job);
                            setBulkDeleteProcessedCount(job.processed_products);
                            setBulkDeleteTotalCount(job.total_products);
                        })}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-300/30 bg-white/5 px-4 py-2 text-sm font-semibold text-rose-50 transition-colors hover:bg-white/10"
                    >
                        {t('common.refresh', { defaultValue: 'Actualiser' })}
                    </button>
                </div>
            )}

            <StockHealthPanel data={stockHealth} loading={stockHealthLoading} />

            {/* AI Replenishment Advice Banner */}
            {showReplenish && (
                <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Sparkles size={20} className="text-violet-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-violet-300 font-bold text-sm mb-1">
                                    IA • Conseils de réapprovisionnement
                                    {replenishAdvice && ` (${replenishAdvice.priority_count} produits prioritaires)`}
                                </p>
                                {replenishLoading ? (
                        <div className="flex items-center gap-2 theme-text-muted text-sm">
                                        <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                        Analyse en cours...
                                    </div>
                                ) : (
                                    <p className="theme-text-secondary text-sm leading-relaxed whitespace-pre-line">{replenishAdvice?.advice || ''}</p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setShowReplenish(false)} className="theme-text-muted hover:text-white transition-colors shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Deadstock Banner */}
            {deadstockData && deadstockData.deadstock.length > 0 && (
                <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Clock size={20} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <p className="text-amber-300 font-bold text-sm">
                                        {t('inventory.deadstock_title', 'Produits dormants')}
                                    </p>
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full">
                                        {deadstockData.deadstock.length} {t('inventory.products', 'produits')}
                                    </span>
                                </div>
                                <p className="text-slate-300 text-sm">
                                    {t('inventory.deadstock_immobilized', { value: (deadstockData.total_value_blocked || 0).toLocaleString('fr-FR'), defaultValue: 'Valeur immobilisée : {{value}} F' })}
                                </p>
                                <div className="flex gap-3 mt-2 text-xs text-slate-400">
                                    <span className="text-amber-300">{deadstockData.by_severity.warning || 0} modéré</span>
                                    <span className="text-rose-400">{deadstockData.by_severity.critical || 0} critique</span>
                                </div>
                                <button
                                    onClick={() => setShowDeadstock(!showDeadstock)}
                                    className="mt-2 text-amber-200 text-xs font-bold hover:underline flex items-center gap-1"
                                >
                                    {showDeadstock ? t('common.hide', 'Masquer') : t('inventory.show_deadstock', 'Voir les produits dormants')}
                                    {showDeadstock ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {showDeadstock && (
                                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                        {deadstockData.deadstock.map((d: any) => (
                                            <div key={d.product_id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                                <div className="min-w-0 flex-1">
                                                    <span className="text-white text-sm font-semibold truncate block">{d.name}</span>
                                                    <span className="text-[10px] text-slate-500">{d.category || t('common.uncategorized', 'Non catégorisé')} · {d.current_stock} unités</span>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 ml-3">
                                                    <span className={`text-xs font-bold ${d.severity === 'critical' ? 'text-rose-400' : 'text-amber-300'}`}>
                                                        {d.days_since_last_sale}j sans vente
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">{(d.stock_value || 0).toLocaleString('fr-FR')} F</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicates Banner */}
            {duplicatesBlockedUntil > Date.now() && (
                <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                    <p className="text-amber-200 text-xs">
                        La vérification des doublons est temporairement suspendue car le quota mensuel IA est atteint.
                    </p>
                </div>
            )}
            {duplicatesData && duplicatesData.total_found > 0 && (
                <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Layers size={20} className="text-violet-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <p className="text-violet-300 font-bold text-sm">
                                        {t('inventory.duplicates_title', 'Doublons détectés')}
                                    </p>
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-200 px-2 py-0.5 rounded-full">
                                        {duplicatesData.total_found} {t('inventory.pairs', 'paire(s)')}
                                    </span>
                                </div>
                                <p className="text-slate-300 text-xs">
                                    {t('inventory.duplicates_desc', 'Des produits avec des noms similaires ont été trouvés. Vérifiez s\'il s\'agit de doublons à fusionner.')}
                                </p>
                                <button
                                    onClick={() => setShowDuplicates(!showDuplicates)}
                                    className="mt-2 text-violet-200 text-xs font-bold hover:underline flex items-center gap-1"
                                >
                                    {showDuplicates ? t('common.hide', 'Masquer') : t('inventory.show_duplicates', 'Voir les doublons')}
                                    {showDuplicates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                {showDuplicates && (
                                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                        {duplicatesData.duplicates.map((d: any, i: number) => (
                                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-white text-sm font-semibold truncate block">{d.item_a.name}</span>
                                                    <span className="text-[10px] text-slate-500">{d.item_a.sku || 'Sans REF'} · {d.item_a.quantity} unités · {d.item_a.price} F</span>
                                                </div>
                                                <div className="shrink-0 text-center">
                                                    <ArrowLeftRight size={14} className="text-violet-400 mx-auto" />
                                                    <span className="text-[9px] text-violet-300 font-bold">{Math.round(d.similarity * 100)}%</span>
                                                </div>
                                                <div className="flex-1 min-w-0 text-right">
                                                    <span className="text-white text-sm font-semibold truncate block">{d.item_b.name}</span>
                                                    <span className="text-[10px] text-slate-500">{d.item_b.sku || 'Sans REF'} · {d.item_b.quantity} unités · {d.item_b.price} F</span>
                                                </div>
                                                <div className="shrink-0 flex flex-col gap-1 min-w-[150px]">
                                                    <button
                                                        onClick={() => handleOpenDuplicateProduct(d.item_a.id)}
                                                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                                                    >
                                                        Ouvrir A
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenDuplicateProduct(d.item_b.id)}
                                                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/10"
                                                    >
                                                        Ouvrir B
                                                    </button>
                                                    <button
                                                        onClick={() => void handleResolveDuplicate(d.item_a.id, d.item_b.id, 'ignored')}
                                                        disabled={duplicateActionKey === d.pair_key}
                                                        className="rounded-lg border border-white/10 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
                                                    >
                                                        Ignorer
                                                    </button>
                                                    <button
                                                        onClick={() => void handleResolveDuplicate(d.item_a.id, d.item_b.id, 'different')}
                                                        disabled={duplicateActionKey === d.pair_key}
                                                        className="rounded-lg border border-emerald-700 bg-emerald-600 px-2 py-1 text-[11px] font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                                                    >
                                                        Marquer différent
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters & Search */}
            <div className="flex gap-3 mb-8">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('catalog.search_placeholder')}
                        value={search}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearch(val);
                            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                            searchDebounceRef.current = setTimeout(() => {
                                void fetchProducts(undefined, val);
                            }, 400);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                </div>
                <button className="glass-card px-6 py-3 text-white flex items-center gap-2 hover:bg-white/10 transition-colors">
                    <Filter size={20} />
                    {t('common.filter')}
                </button>
            </div>

            {/* Location filter chips */}
            {locationFilterOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => { setSelectedLocation(''); fetchProducts(''); }}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${selectedLocation === '' ? 'bg-primary text-white border-primary' : 'bg-white/5 text-slate-400 border-white/10 hover:border-primary/40 hover:text-white'}`}
                    >
                        <MapPin size={12} /> Tous
                    </button>
                    {locationFilterOptions.map(loc => (
                        <button
                            key={loc.location_id}
                            onClick={() => { setSelectedLocation(loc.location_id); fetchProducts(loc.location_id); }}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${selectedLocation === loc.location_id ? 'bg-primary text-white border-primary' : 'bg-white/5 text-slate-400 border-white/10 hover:border-primary/40 hover:text-white'}`}
                        >
                            <MapPin size={12} /> {getLocationLabel(loc.location_id)}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid gap-3 mb-4 md:grid-cols-3">
                <button
                    type="button"
                    onClick={() => setSupplierCoverageFilter('no_supplier')}
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-left transition-colors hover:bg-rose-500/15"
                >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-300">? traiter</p>
                    <p className="mt-2 text-2xl font-black text-white">{supplierCoverageStats.noSupplier}</p>
                    <p className="mt-1 text-sm text-slate-300">Produits sans fournisseur</p>
                </button>
                <button
                    type="button"
                    onClick={() => setSupplierCoverageFilter('multi_supplier')}
                    className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left transition-colors hover:bg-amber-500/15"
                >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">Couverture</p>
                    <p className="mt-2 text-2xl font-black text-white">{supplierCoverageStats.multiSupplier}</p>
                    <p className="mt-1 text-sm text-slate-300">Produits avec alternatives</p>
                </button>
                <button
                    type="button"
                    onClick={() => setSupplierCoverageFilter('missing_primary')}
                    className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-left transition-colors hover:bg-sky-500/15"
                >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">À compléter</p>
                    <p className="mt-2 text-2xl font-black text-white">{supplierCoverageStats.missingPrimary}</p>
                    <p className="mt-1 text-sm text-slate-300">Produits sans principal</p>
                </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                <button
                    onClick={() => setSupplierCoverageFilter('all')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${supplierCoverageFilter === 'all' ? 'border-primary bg-primary text-white' : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'}`}
                >
                    Tous
                </button>
                <button
                    onClick={() => setSupplierCoverageFilter('no_supplier')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${supplierCoverageFilter === 'no_supplier' ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:text-white'}`}
                >
                    Sans fournisseur
                </button>
                <button
                    onClick={() => setSupplierCoverageFilter('multi_supplier')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${supplierCoverageFilter === 'multi_supplier' ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:text-white'}`}
                >
                    Plusieurs fournisseurs
                </button>
                <button
                    onClick={() => setSupplierCoverageFilter('missing_primary')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${supplierCoverageFilter === 'missing_primary' ? 'border-sky-500 bg-sky-500 text-white' : 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:text-white'}`}
                >
                    Principal manquant
                </button>
            </div>

            {/* Products Table */}
            <div className="glass-card overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-slate-300 text-sm bg-white/5 uppercase tracking-wider">
                            {selectionMode && (
                                <th className="py-4 px-4 font-semibold text-center">
                                    <input
                                        type="checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectVisibleProducts}
                                        className="h-4 w-4 rounded border-white/20 bg-transparent"
                                        aria-label={t('inventory.selection_select_page', { count: filteredProducts.length })}
                                    />
                                </th>
                            )}
                            <th className="py-4 px-6 font-semibold">Produit</th>
                            <th className="py-4 px-6 font-semibold">Catégorie</th>
                            <th className="py-4 px-6 font-semibold">Fournisseurs</th>
                            <th className="py-4 px-6 font-semibold text-center">Stock</th>
                            <th className="py-4 px-6 font-semibold text-center">{t('inventory.forecast_7d', 'Prév. 7j')}</th>
                            <th className="py-4 px-6 font-semibold">Prix</th>
                            <th className="py-4 px-6 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-white">
                        {filteredProducts.map((p) => {
                            const matchesMin = p.quantity <= p.min_stock;
                            const isOut = p.quantity === 0;
                            const supplyMeta = getProductSupplyMeta(p.product_id);
                            const productLinks = supplierLinksByProduct[p.product_id] || [];
                            const hasPrimary = productLinks.some((link) => link.is_preferred);

                            return (
                                <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    {selectionMode && (
                                        <td className="py-4 px-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.has(p.product_id)}
                                                onChange={() => toggleSelectProduct(p.product_id)}
                                                className="h-4 w-4 rounded border-white/20 bg-transparent"
                                                aria-label={p.name}
                                            />
                                        </td>
                                    )}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            {p.image ? (
                                                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt={p.name} />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary font-bold">
                                                    {(p.name || '').charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-bold flex items-center gap-2">
                                                    {p.name}
                                                    {p.offline_pending && (
                                                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                                                            Hors ligne
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono uppercase">{p.sku || 'SANS-REF'}</span>
                                                <span className={`mt-1 text-[11px] font-semibold ${supplyMeta.tone === 'rose' ? 'text-rose-300' : supplyMeta.tone === 'sky' ? 'text-sky-300' : 'text-emerald-300'}`}>
                                                    {supplyMeta.status}
                                                </span>
                                                {hasEnterpriseLocations && p.location_id && (
                                                    <span className="flex items-center gap-1 text-[10px] text-primary/90 font-medium mt-0.5">
                                                        <MapPin size={9} /> {getLocationLabel(p.location_id)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200">
                                            {safeCategoriesList.find(c => c.category_id === p.category_id)?.name || t('common.uncategorized', { defaultValue: 'Non catégorisé' })}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        {productLinks.length === 0 ? (
                                            <div className="inventory-supplier-card inventory-supplier-card--warning rounded-xl px-3 py-3">
                                                <p className="inventory-supplier-card__title text-xs font-bold">Aucun fournisseur</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenSupplierMarketplace(p)}
                                                    className="inventory-supplier-card__button mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-black shadow-sm transition-colors"
                                                >
                                                    <Plus size={12} />
                                                    Associer un fournisseur
                                                </button>
                                                <p className="inventory-supplier-card__hint mt-2 text-[11px]">Produit non préparé pour le réapprovisionnement.</p>
                                            </div>
                                        ) : (
                                            <div className="inventory-supplier-card rounded-xl px-3 py-3">
                                                <span className="inventory-supplier-card__title text-xs font-bold">
                                                    {hasPrimary ? `${productLinks.length} fournisseur(s) - principal défini` : `${productLinks.length} fournisseur(s) - principal manquant`}
                                                </span>
                                                {!hasPrimary && (
                                                    <span className="inventory-supplier-card__hint inventory-supplier-card__hint--info mt-1 block text-[11px]">Choisissez un fournisseur principal dans la fiche produit.</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleManageProductSuppliers(p)}
                                                    className="inventory-supplier-card__secondary-button mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors"
                                                >
                                                    <Edit size={12} />
                                                    Gérer les fournisseurs
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-lg font-bold ${isOut ? 'text-red-400' : matchesMin ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {formatMeasurementQuantity(p.quantity, p.display_unit || p.unit)}
                                            </span>
                                            {matchesMin && (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400">
                                                    <AlertCircle size={10} />
                                                    Stock Bas
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {(() => {
                                            const fc = salesForecastMap[p.product_id];
                                            const season = seasonalityMap[p.product_id];
                                            const hasSeasonPeak = season?.urgency === 'high';
                                            return (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    {fc ? (
                                                        <>
                                                            <span className="text-sm font-bold text-emerald-400">+{fc.forecast_7d}</span>
                                                            <span className="text-[10px] theme-text-muted">{fc.velocity_per_day.toFixed(1)}/j</span>
                                                            {fc.alert && (
                                                                <span className="text-[9px] text-rose-400 font-bold uppercase">{fc.alert === 'stock_insufficient_7d' ? '⚠ Rupture <7j' : '⚠ Rupture <30j'}</span>
                                                            )}
                                                        </>
                                                    ) : <span className="theme-text-muted text-xs">—</span>}
                                                    {hasSeasonPeak && (
                                                        <span className="text-[9px] text-amber-400 font-bold uppercase mt-0.5" title={`Pic saisonnier ${season.upcoming_peak_name} — prévoir ${season.expected_demand} unités`}>
                                                            🔥 {t('inventory.season_peak', 'Pic')} {season.upcoming_peak_name}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{p.selling_price} F</span>
                                            <span className="text-xs theme-text-muted">Achat: {p.purchase_price} F</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            {/* Stock +/- toujours visibles */}
                                            <button
                                                onClick={() => { setStockModalProduct(p); setStockMovType('in'); setStockMovQty(''); setStockMovReason(''); setStockModalOpen(true); }}
                                                className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/30 rounded-lg text-emerald-400 transition-colors"
                                                title="Entrée stock"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                onClick={() => { setStockModalProduct(p); setStockMovType('out'); setStockMovQty(''); setStockMovReason(''); setStockModalOpen(true); }}
                                                className="p-1.5 bg-orange-500/15 hover:bg-orange-500/30 rounded-lg text-orange-400 transition-colors"
                                                title="Sortie stock"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            {/* Autres actions au hover */}
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenHistory(p)}
                                                    className="p-2 hover:bg-white/10 rounded-lg theme-text-muted hover:text-primary transition-colors"
                                                    title="Historique"
                                                >
                                                    <History size={18} />
                                                </button>
                                                {activeLocationsList.length > 0 && (
                                                    <button
                                                        onClick={() => handleOpenLocationTransfer(p)}
                                                    className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-300 hover:text-emerald-300 transition-colors"
                                                    title="Transférer d'emplacement"
                                                >
                                                    <MapPin size={18} />
                                                </button>
                                                )}
                                                {storeList.length > 1 && (
                                                    <button
                                                        onClick={() => handleOpenTransfer(p)}
                                                        className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-300 hover:text-blue-300 transition-colors"
                                                        title="Transférer vers une autre boutique"
                                                    >
                                                        <ArrowLeftRight size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenEditModal(p)}
                                                    className="p-2 hover:bg-white/10 rounded-lg theme-text-muted hover:text-white transition-colors"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteProduct(p)}
                                                    disabled={deletingProductId === p.product_id}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg theme-text-muted hover:text-red-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Load More */}
            {products.length < productsTotal && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => void loadMoreProducts()}
                        disabled={loadingMore}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl theme-text font-semibold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {loadingMore
                            ? t('products.loading_more', 'Chargement...')
                            : t('products.load_more', { defaultValue: 'Charger plus ({{loaded}} / {{total}})', loaded: products.length, total: productsTotal })}
                    </button>
                </div>
            )}
            {products.length > 0 && products.length >= productsTotal && (
                <p className="text-center text-slate-500 text-sm mt-4">
                    {search
                        ? t('products.all_search_results_loaded', { defaultValue: '{{count}} résultat(s) affiché(s)', count: products.length })
                        : t('products.all_products_loaded', { defaultValue: 'Tous les produits affichés ({{total}})', total: productsTotal })}
                </p>
            )}

            <Modal
                isOpen={isBulkPriceEditorOpen}
                onClose={closeBulkPriceEditor}
                title={t('inventory.quick_price_editor_title')}
                maxWidth="full"
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-slate-300">
                                {t('inventory.quick_price_editor_subtitle', { count: filteredBulkPriceProducts.length })}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {t('inventory.quick_price_editor_changes', { count: editedBulkPriceCount })}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={closeBulkPriceEditor}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                            >
                                {t('inventory.quick_price_editor_cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleBulkPriceSave()}
                                disabled={bulkPriceLoading || bulkPriceSaving}
                                className="rounded-xl border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {bulkPriceSaving
                                    ? t('common.saving', { defaultValue: 'Enregistrement...' })
                                    : bulkPriceLoading
                                        ? t('common.loading', { defaultValue: 'Chargement...' })
                                        : t('inventory.quick_price_editor_save')}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                        <table className="w-full min-w-[760px] border-collapse">
                            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">{t('inventory.quick_price_editor_product')}</th>
                                    <th className="px-4 py-3">{t('inventory.quick_price_editor_sku')}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.quick_price_editor_purchase')}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.quick_price_editor_selling')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm text-white">
                                {bulkPriceLoading && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center text-sm font-semibold text-slate-300">
                                            {t('inventory.quick_price_editor_loading_all', { defaultValue: 'Chargement de tous les produits...' })}
                                        </td>
                                    </tr>
                                )}
                                {!bulkPriceLoading && filteredBulkPriceProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-10 text-center text-sm font-semibold text-slate-300">
                                            {t('inventory.quick_price_editor_empty', { defaultValue: 'Aucun produit ne correspond aux filtres actuels.' })}
                                        </td>
                                    </tr>
                                )}
                                {!bulkPriceLoading && filteredBulkPriceProducts.map((product) => {
                                    const draft = bulkPriceDrafts[product.product_id] || {
                                        purchase_price: product.purchase_price != null ? String(product.purchase_price) : '',
                                        selling_price: product.selling_price != null ? String(product.selling_price) : '',
                                    };
                                    const isChanged =
                                        draft.purchase_price !== String(product.purchase_price ?? '')
                                        || draft.selling_price !== String(product.selling_price ?? '');

                                    return (
                                        <tr key={product.product_id} className={isChanged ? 'bg-primary/5' : ''}>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white">{product.name}</span>
                                                    <span className="text-xs text-slate-500">{product.quantity} en stock</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono uppercase text-slate-400">
                                                {product.sku || 'SANS-REF'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={draft.purchase_price}
                                                    onChange={(event) => updateBulkPriceDraft(product.product_id, 'purchase_price', event.target.value)}
                                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right text-sm text-white outline-none transition focus:border-primary"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={draft.selling_price}
                                                    onChange={(event) => updateBulkPriceDraft(product.product_id, 'selling_price', event.target.value)}
                                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right text-sm text-white outline-none transition focus:border-primary"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isBulkStockEditorOpen}
                onClose={closeBulkStockEditor}
                title={t('inventory.quick_stock_editor_title', { defaultValue: 'Édition rapide du stock' })}
                maxWidth="full"
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm text-slate-300">
                                {t('inventory.quick_stock_editor_subtitle', { defaultValue: '{{count}} produit(s) dans le filtre actuel. Saisissez le stock réel : Stockman enregistrera uniquement les écarts.', count: filteredBulkStockProducts.length })}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {t('inventory.quick_stock_editor_changes', { defaultValue: '{{count}} stock(s) modifié(s)', count: editedBulkStockCount })}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={closeBulkStockEditor}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleBulkStockSave()}
                                disabled={bulkStockLoading || bulkStockSaving}
                                className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {bulkStockSaving
                                    ? t('common.saving', { defaultValue: 'Enregistrement...' })
                                    : bulkStockLoading
                                        ? t('common.loading', { defaultValue: 'Chargement...' })
                                        : t('inventory.quick_stock_editor_save', { defaultValue: 'Enregistrer les stocks' })}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                        <table className="w-full min-w-[760px] border-collapse">
                            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">{t('inventory.quick_stock_editor_product', { defaultValue: 'Produit' })}</th>
                                    <th className="px-4 py-3">{t('inventory.quick_stock_editor_sku', { defaultValue: 'Référence' })}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.quick_stock_editor_current', { defaultValue: 'Stock actuel' })}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.quick_stock_editor_next', { defaultValue: 'Stock réel' })}</th>
                                    <th className="px-4 py-3 text-right">{t('inventory.quick_stock_editor_delta', { defaultValue: 'Écart' })}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm text-white">
                                {bulkStockLoading && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-slate-300">
                                            {t('inventory.quick_stock_editor_loading_all', { defaultValue: 'Chargement de tous les produits...' })}
                                        </td>
                                    </tr>
                                )}
                                {!bulkStockLoading && filteredBulkStockProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-slate-300">
                                            {t('inventory.quick_stock_editor_empty', { defaultValue: 'Aucun produit ne correspond aux filtres actuels.' })}
                                        </td>
                                    </tr>
                                )}
                                {!bulkStockLoading && filteredBulkStockProducts.map((product) => {
                                    const draftValue = bulkStockDrafts[product.product_id] ?? String(product.quantity ?? 0);
                                    const currentQuantity = Number(product.quantity ?? 0);
                                    const parsedDraft = Number(draftValue.replace(',', '.').trim());
                                    const delta = Number.isFinite(parsedDraft) ? parsedDraft - currentQuantity : 0;
                                    const isChanged = Math.abs(delta) >= 0.000001;

                                    return (
                                        <tr key={product.product_id} className={isChanged ? 'bg-emerald-500/5' : ''}>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white">{product.name}</span>
                                                    <span className="text-xs text-slate-500">{product.unit || product.display_unit || 'unité'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono uppercase text-slate-400">
                                                {product.sku || 'SANS-REF'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-200">
                                                {formatMeasurementQuantity(currentQuantity, product.display_unit || product.unit)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={draftValue}
                                                    onChange={(event) => updateBulkStockDraft(product.product_id, event.target.value)}
                                                    className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-right text-sm text-white outline-none transition focus:border-emerald-400"
                                                />
                                            </td>
                                            <td className={`px-4 py-3 text-right text-sm font-black ${delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-orange-300' : 'text-slate-500'}`}>
                                                {isChanged ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            {/* Stock Movement Modal */}
            <Modal
                isOpen={stockModalOpen}
                onClose={() => setStockModalOpen(false)}
                title={stockMovType === 'in' ? ' Entrée de stock' : ' Sortie de stock'}
                maxWidth="sm"
            >
                {stockModalProduct && (
                    <div className="space-y-5">
                        {/* Product info */}
                        <div className={`p-4 rounded-xl flex items-center gap-3 ${stockMovType === 'in' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                            <div className={`p-2 rounded-lg ${stockMovType === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                {stockMovType === 'in' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">{stockModalProduct.name}</p>
                                <p className="text-xs text-slate-400">Stock actuel : <span className="font-bold text-white">{formatMeasurementQuantity(stockModalProduct.quantity, stockModalProduct.display_unit || stockModalProduct.unit)}</span></p>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Quantité *</label>
                            <input
                                type="number"
                                min={String(getQuantityInputMin(stockModalProduct))}
                                step={String(getInputStep(stockModalProduct))}
                                value={stockMovQty}
                                onChange={e => setStockMovQty(e.target.value)}
                                placeholder={isDiscreteUnitProduct(stockModalProduct) ? 'Ex: 3' : 'Ex: 0.25'}
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                            />
                            {stockMovQty && !isNaN(parseFloat(stockMovQty)) && (
                                <p className="text-xs mt-1.5 text-slate-400">
                                    Nouveau stock :{' '}
                                    <span className={`font-bold ${stockMovType === 'in' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {formatMeasurementQuantity(
                                            stockMovType === 'in'
                                                ? stockModalProduct.quantity + parseFloat(stockMovQty)
                                                : Math.max(0, stockModalProduct.quantity - parseFloat(stockMovQty)),
                                            stockModalProduct.display_unit || stockModalProduct.unit
                                        )}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Motif (optionnel)</label>
                            <input
                                type="text"
                                value={stockMovReason}
                                onChange={e => setStockMovReason(e.target.value)}
                                placeholder={stockMovType === 'in' ? 'Ex: Réapprovisionnement' : 'Ex: Casse, vol, correction'}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleStockMovement}
                            disabled={stockMovLoading || !stockMovQty || parseFloat(stockMovQty) <= 0}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${stockMovType === 'in' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                        >
                            {stockMovLoading
                                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : stockMovType === 'in' ? <><Plus size={18} /> Valider l'entree</> : <><Minus size={18} /> Valider la sortie</>
                            }
                        </button>
                    </div>
                )}
            </Modal>

            {/* Product Add/Edit Modal */}
            <Modal
                isOpen={isSupplierPickerOpen}
                onClose={() => {
                    if (supplierPickerSaving) return;
                    setIsSupplierPickerOpen(false);
                    setSupplierPickerProduct(null);
                }}
                title={supplierPickerProduct ? `Fournisseurs pour ${supplierPickerProduct.name}` : 'Associer un fournisseur'}
                maxWidth="lg"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                        Choisis ici les fournisseurs qui vendent ce produit, puis définis le fournisseur principal.
                    </p>
                    {rankedSuppliersForPicker.length > 0 ? (
                        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                            {rankedSuppliersForPicker.map(({ supplier, score }) => {
                                const selected = pickerSupplierIds.includes(supplier.supplier_id);
                                return (
                                    <div key={supplier.supplier_id} className={`rounded-xl border px-4 py-3 ${selected ? 'border-primary/60 bg-primary/10' : 'border-white/10 bg-white/5'}`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="flex items-center gap-3 text-sm text-white">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => togglePickerSupplier(supplier.supplier_id)}
                                                />
                                                <span className="font-semibold">{supplier.name}</span>
                                            </label>
                                            {score > 0 && (
                                                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                                                    Match produit
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs text-slate-400">
                                            {supplier.city || 'Ville non renseignee'}{supplier.products_supplied ? ` - ${supplier.products_supplied}` : ''}
                                        </div>
                                        {selected && (
                                            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                                                <input
                                                    type="radio"
                                                    name="picker_primary_supplier"
                                                    checked={pickerPrimarySupplierId === supplier.supplier_id}
                                                    onChange={() => setPickerPrimarySupplierId(supplier.supplier_id)}
                                                />
                                                Fournisseur principal
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
                            Aucun fournisseur pertinent n'a été trouvé pour ce produit.
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSupplierPickerOpen(false);
                                setSupplierPickerProduct(null);
                            }}
                            className="rounded-lg px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleSaveProductSuppliers()}
                            disabled={supplierPickerSaving}
                            className="rounded-lg bg-primary px-5 py-2 font-medium text-white disabled:opacity-60"
                        >
                            {supplierPickerSaving ? 'Enregistrement...' : 'Enregistrer les liaisons'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title={editingProduct ? t('catalog.edit_product') : t('catalog.add_product')}
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmitProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Image Section */}
                        <div className="md:col-span-1 space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Image du produit</label>
                            <div className="aspect-square rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                                {form.image ? (
                                    <>
                                        <img src={form.image} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button type="button" onClick={() => setForm(prev => ({ ...prev, image: '' }))} className="p-2 bg-rose-500 rounded-lg text-white">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center gap-2">
                                        <Upload className="text-slate-600" size={32} />
                                        <span className="text-xs text-slate-500 font-bold">Ajouter</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="md:col-span-2 space-y-4">
                            <label className="block text-sm font-medium text-slate-300">{t('common.name')}</label>
                            <div className="flex gap-2">
                                <input
                                    required
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                />
                                <button
                                    type="button"
                                    onClick={handleAiSuggestCategory}
                                    disabled={aiLoading.category}
                                    className="p-2 glass-card text-primary hover:bg-white/10 disabled:opacity-50"
                                    title="IA Categorisation"
                                >
                                    <Sparkles size={20} className={aiLoading.category ? 'animate-pulse' : ''} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">{t('common.category', { defaultValue: 'Catégorie' })}</label>
                                    <select
                                        value={form.category_id}
                                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50 text-sm"
                                    >
                                        <option value="">Choisir...</option>
                                        {safeCategoriesList.map(c => (
                                            <option key={c.category_id} value={c.category_id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">SKU / Code-barres</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.sku}
                                            onChange={(e) => setForm({ ...form, sku: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-white outline-none focus:border-primary/50 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsScannerOpen(true)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary"
                                        >
                                            <Scan size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300">Type de produit</label>
                                <select
                                    value={form.product_type}
                                    onChange={(e) => setForm({ ...form, product_type: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50 text-sm"
                                >
                                    <option value="standard">Produit fini / Plat</option>
                                    <option value="raw_material">Ingrédient / matière première</option>
                                </select>
                            </div>

                            {formLocationOptions.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 flex items-center gap-1"><MapPin size={14} className="text-primary" /> Emplacement</label>
                                    <select
                                        value={form.location_id}
                                        onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50 text-sm"
                                    >
                                        <option value="">Aucun emplacement</option>
                                        {formLocationOptions.map(loc => (
                                            <option key={loc.location_id} value={loc.location_id}>
                                                {getLocationLabel(loc.location_id)}{loc.is_active === false ? ' (archivé)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {rankedSuppliersForForm.length > 0 && (
                                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300">Approvisionnement</label>
                                        <p className="mt-1 text-xs text-slate-400">Associez ici un ou plusieurs fournisseurs à ce produit. Définissez d'abord le fournisseur principal, puis ajoutez si besoin des alternatives.</p>
                                        <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${
                                            formSupplierIds.length === 0
                                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                                                : !formPrimarySupplierId
                                                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                        }`}>
                                            {formSupplierIds.length === 0
                                                ? 'Aucun fournisseur'
                                                : !formPrimarySupplierId
                                                    ? 'Principal à définir'
                                                    : `Principal : ${getSupplierName(formPrimarySupplierId)}`}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs text-slate-200">
                                        Cochez les fournisseurs à associer à ce produit, puis marquez-en un comme fournisseur principal. Cette liaison servira aux suggestions de réapprovisionnement et aux commandes.
                                    </div>
                                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                                        {rankedSuppliersForForm.map(({ supplier, score }) => {
                                            const selected = formSupplierIds.includes(supplier.supplier_id);
                                            return (
                                                <div key={supplier.supplier_id} className={`rounded-lg border px-3 py-2 ${selected ? 'border-primary/60 bg-primary/10' : 'border-white/10 bg-transparent'}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label className="flex items-center gap-2 text-sm text-white">
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={() => toggleFormSupplier(supplier.supplier_id)}
                                                            />
                                                            <span className="font-semibold">{supplier.name}</span>
                                                        </label>
                                                        {score > 0 && (
                                                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                                                                Match
                                                            </span>
                                                        )}
                                                    </div>
                                                    {selected && (
                                                        <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                                                            <input
                                                                type="radio"
                                                                name="primary_supplier"
                                                                checked={formPrimarySupplierId === supplier.supplier_id}
                                                                onChange={() => setFormPrimarySupplierId(supplier.supplier_id)}
                                                            />
                                                            Fournisseur principal
                                                        </label>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Stock initial</label>
                                    <input
                                        type="number"
                                        step={String(isDiscreteUnitProduct(form) ? 1 : getInputStep(form))}
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Unité de prix / stock</label>
                                    <select
                                        value={form.unit}
                                        onChange={(e) => {
                                            const nextUnit = e.target.value;
                                            const nextType = inferMeasurementType(nextUnit);
                                            setForm({
                                                ...form,
                                                unit: nextUnit,
                                                measurement_type: nextType,
                                                display_unit: nextUnit,
                                                pricing_unit: nextUnit,
                                                allows_fractional_sale: nextType !== 'unit',
                                                quantity_precision: defaultPrecisionForUnit(nextUnit, nextType),
                                            });
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50 text-sm"
                                    >
                                        {['piece', 'kg', 'g', 'L', 'cL', 'mL', 'Paquet', 'Boite', 'Bouteille', 'Sac', 'Carton', 'Lot'].map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {form.measurement_type !== 'unit' && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300">Pas de vente</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0.001"
                                            value={form.quantity_precision}
                                            onChange={(e) => setForm({ ...form, quantity_precision: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                        />
                                    </div>
                                    <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs text-slate-200">
                                        Vente fractionnee active. Le stock et le prix restent geres au {form.unit}, mais la caisse pourra vendre en sous-unites compatibles.
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Stock minimum</label>
                                    <input
                                        type="number"
                                        step={String(isDiscreteUnitProduct(form) ? 1 : getInputStep(form))}
                                        value={form.min_stock}
                                        onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Stock maximum</label>
                                    <input
                                        type="number"
                                        step={String(isDiscreteUnitProduct(form) ? 1 : getInputStep(form))}
                                        value={form.max_stock}
                                        onChange={(e) => setForm({ ...form, max_stock: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">{t('common.purchase_price', { defaultValue: "Prix d'achat" })}</label>
                                    <input
                                        type="number"
                                        value={form.purchase_price}
                                        onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 flex justify-between">
                                        {t('common.selling_price', { defaultValue: 'Prix de vente' })}
                                        <button type="button" onClick={handleAiSuggestPrice} disabled={aiLoading.price} className="text-primary hover:underline text-[10px] flex items-center gap-1 font-bold italic">
                                            <Sparkles size={10} className={aiLoading.price ? 'animate-pulse' : ''} /> Suggestion IA
                                        </button>
                                    </label>
                                    <input
                                        type="number"
                                        value={form.selling_price}
                                        onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Variants Section */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Variantes de produit</h3>
                            <button type="button" onClick={addVariant} className="text-xs text-primary font-bold flex items-center gap-1 hover:bg-primary/10 px-2 py-1 rounded-lg">
                                <Plus size={14} /> Ajouter une variante
                            </button>
                        </div>
                        {form.variants.length > 0 && (
                            <div className="space-y-3">
                                {form.variants.map((v, i) => (
                                    <div key={i} className="flex gap-4 items-end bg-white/5 p-4 rounded-xl border border-white/10">
                                        <div className="flex-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom (ex: XL, Rouge)</label>
                                            <input
                                                type="text"
                                                value={v.name}
                                                onChange={(e) => updateVariant(i, 'name', e.target.value)}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock</label>
                                            <input
                                                type="number"
                                                value={v.quantity}
                                                onChange={(e) => updateVariant(i, 'quantity', Number(e.target.value))}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prix (Optionnel)</label>
                                            <input
                                                type="number"
                                                value={v.selling_price}
                                                onChange={(e) => updateVariant(i, 'selling_price', Number(e.target.value))}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeVariant(i)} className="p-2 text-slate-500 hover:text-rose-400">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-slate-300">{t('common.description')}</label>
                            <button
                                type="button"
                                onClick={handleAiGenerateDescription}
                                disabled={aiLoading.description}
                                className="text-xs text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                            >
                                <Sparkles size={14} className={aiLoading.description ? 'animate-pulse' : ''} />
                                Générer par IA
                            </button>
                        </div>
                        <textarea
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50 resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsProductModalOpen(false)}
                            className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={formLoading}
                            className="btn-primary px-10 py-2 disabled:opacity-50 flex items-center gap-2"
                        >
                            {formLoading && <div className="w-4 h-4 border-2 border-white/20 border-b-white rounded-full animate-spin" />}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Sub-Modals */}
            <BulkImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => { fetchProducts(); loadStockHealth(); }}
            />

            <TextImportModal
                isOpen={isTextImportOpen}
                onClose={() => setIsTextImportOpen(false)}
                onSuccess={() => { fetchProducts(); loadStockHealth(); }}
            />

            <ProductHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                product={selectedProductForHistory}
            />

            {isScannerOpen && (
                <BarcodeScanner
                    onScan={(sku) => setForm(prev => ({ ...prev, sku }))}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {isBatchScanOpen && (
                <BatchScanModal onClose={() => setIsBatchScanOpen(false)} />
            )}

            {/* Location Transfer Modal */}
            {isLocationTransferOpen && locationTransferProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Transfert d'emplacement</h3>
                                <p className="text-xs text-slate-400">{locationTransferProduct.name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                                Emplacement actuel : <span className="font-bold text-white">{getLocationLabel(locationTransferProduct.location_id) || 'Aucun'}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nouvel emplacement</label>
                                <select
                                    value={locationTransferDest}
                                    onChange={(e) => setLocationTransferDest(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50"
                                >
                                    <option value="">Aucun emplacement</option>
                                    {activeLocationsList
                                        .filter((loc) => loc.location_id !== locationTransferProduct.location_id)
                                        .map((loc) => (
                                            <option key={loc.location_id} value={loc.location_id}>
                                                {getLocationLabel(loc.location_id)}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Note (optionnelle)</label>
                                <input
                                    type="text"
                                    value={locationTransferNote}
                                    onChange={(e) => setLocationTransferNote(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsLocationTransferOpen(false)}
                                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleLocationTransfer}
                                disabled={locationTransferring}
                                className="btn-primary px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                {locationTransferring && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                {locationTransferring ? 'Transfert...' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Transfer Modal */}
            {isTransferOpen && transferProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                <ArrowLeftRight size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Transfert de Stock</h3>
                                <p className="text-xs text-slate-400">{transferProduct.name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                                    Boutique destination
                                </label>
                                <select
                                    value={transferDest}
                                    onChange={e => setTransferDest(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50"
                                >
                                    {storeList.filter(s => s.store_id !== currentUser.active_store_id).map(s => (
                                        <option key={s.store_id} value={s.store_id} className="bg-[#1a1f2e]">
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                                    Quantité (stock dispo : {transferProduct.quantity})
                                </label>
                                <input
                                    type="number"
                                    min={getQuantityInputMin(transferProduct)}
                                    step={String(getInputStep(transferProduct))}
                                    max={transferProduct.quantity}
                                    value={transferQty}
                                    onChange={e => setTransferQty(Math.max(getQuantityInputMin(transferProduct), parseFloat(e.target.value) || getQuantityInputMin(transferProduct)))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary/50"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsTransferOpen(false)}
                                className="flex-1 py-2 text-slate-400 hover:text-white font-bold transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={!transferDest || transferQty <= 0 || transferring}
                                className="flex-1 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {transferring ? 'Transfert...' : 'Confirmer'}
                            </button>
                        </div>
                        <button
                            onClick={() => { loadTransferHistory(); setShowTransferHistory(true); }}
                            className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors"
                        >
                            <Clock size={14} /> {t('inventory.transfer_history')}
                        </button>
                    </div>
                </div>
            )}

            {/* Transfer History Modal */}
            {showTransferHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                    <ArrowLeftRight size={20} />
                                </div>
                                <h3 className="text-lg font-black text-white">{t('inventory.transfer_history')}</h3>
                            </div>
                            <button onClick={() => setShowTransferHistory(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {transferHistoryLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : transferHistory.length === 0 ? (
                                <div className="text-center py-10">
                                    <ArrowLeftRight size={40} className="mx-auto text-slate-700 mb-3" />
                                    <p className="text-sm text-slate-500 font-bold">{t('inventory.no_transfers')}</p>
                                </div>
                            ) : (
                                transferHistory.map((tr) => {
                                    const isReverse = (tr.note || '').startsWith('Annulation');
                                    return (
                                        <div key={tr.transfer_id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{tr.product_name}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {tr.from_store_name} ? {tr.to_store_name}
                                                </p>
                                                <p className="text-[10px] text-slate-600 mt-1">
                                                    {new Date(tr.created_at).toLocaleString()} ? {tr.transferred_by}
                                                    {tr.note ? ` - ${tr.note}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-blue-400">{tr.quantity}</span>
                                                {!isReverse && (
                                                    <button
                                                        onClick={() => handleReverseTransfer(tr)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                                                        title={t('inventory.reverse_transfer')}
                                                    >
                                                        <Undo2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                title={t('inventory.trash_title', { defaultValue: 'Corbeille du stock' })}
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div>
                            <p className="text-sm font-bold theme-text">{t('inventory.trash_subtitle', { defaultValue: 'Produits supprimés depuis le stock web ou mobile.' })}</p>
                            <p className="text-xs theme-text-muted">{t('inventory.trash_count', { defaultValue: '{{count}} produit(s) dans la corbeille', count: trashTotal })}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void loadTrash()}
                            disabled={trashLoading}
                            className="glass-card theme-text px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                        >
                            {t('common.refresh', { defaultValue: 'Actualiser' })}
                        </button>
                    </div>

                    {trashLoading ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm theme-text-muted">
                            {t('common.loading', { defaultValue: 'Chargement...' })}
                        </div>
                    ) : trashItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm theme-text-muted">
                            {t('inventory.trash_empty', { defaultValue: 'La corbeille est vide.' })}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {trashItems.map((item) => {
                                const busy = trashActionId === item.product_id;
                                return (
                                    <div key={item.product_id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold theme-text">{item.name}</p>
                                            <p className="text-xs theme-text-muted">
                                                {item.deleted_at
                                                    ? t('inventory.trash_deleted_at', {
                                                        defaultValue: 'Supprimé le {{date}}',
                                                        date: new Date(item.deleted_at).toLocaleString(i18n.language || 'fr-FR'),
                                                    })
                                                    : t('inventory.trash_deleted_unknown', { defaultValue: 'Date de suppression indisponible' })}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleRestoreTrashItem(item.product_id)}
                                                disabled={busy}
                                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                                            >
                                                <Undo2 size={15} />
                                                {t('inventory.trash_restore', { defaultValue: 'Restaurer' })}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteTrashItemPermanently(item)}
                                                disabled={busy}
                                                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/45 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
                                            >
                                                <Trash2 size={15} />
                                                {t('inventory.trash_delete_forever', { defaultValue: 'Supprimer définitivement' })}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

