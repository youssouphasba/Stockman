import React, { useState, useEffect } from 'react';
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
    TrendingUp,
    TrendingDown,
    Undo2,
    Clock
} from 'lucide-react';
import { exportInventory } from '../utils/ExportService';
import {
    products as productsApi,
    categories as categoriesApi,
    ai as aiApi,
    auth,
    catalog as catalogApi,
    locations as locationsApi,
    stores as storesApi,
    stock as stockApi,
    analytics as analyticsApi,
    userFeatures as userFeaturesApi,
    AnalyticsStockHealth,
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
    inferMeasurementType,
    normalizeProductMeasurement,
} from '../utils/measurement';
import ScreenGuide, { GuideStep } from './ScreenGuide';

export default function Inventory() {
    const { t, i18n } = useTranslation();
    const [products, setProducts] = useState<any[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [locationsList, setLocationsList] = useState<any[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

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
    const [catalogImportLoading, setCatalogImportLoading] = useState(false);
    const [stockHealth, setStockHealth] = useState<AnalyticsStockHealth | null>(null);
    const [stockHealthLoading, setStockHealthLoading] = useState(true);
    const [pendingInventorySummary, setPendingInventorySummary] = useState(() => getPendingInventorySummary());

    // AI Replenishment advice
    const [replenishAdvice, setReplenishAdvice] = useState<{ advice: string; priority_count: number } | null>(null);
    const [replenishLoading, setReplenishLoading] = useState(false);
    const [showReplenish, setShowReplenish] = useState(false);

    // Stock movement modal
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [stockModalProduct, setStockModalProduct] = useState<any>(null);
    const [stockMovType, setStockMovType] = useState<'in' | 'out'>('in');
    const [stockMovQty, setStockMovQty] = useState('');
    const [stockMovReason, setStockMovReason] = useState('');
    const [stockMovLoading, setStockMovLoading] = useState(false);

    const locationMap = new Map(locationsList.map((loc) => [loc.location_id, loc]));
    const activeLocationsList = locationsList.filter((loc) => loc.is_active !== false);
    const selectedLocationRecord = selectedLocation ? locationMap.get(selectedLocation) : undefined;
    const locationFilterOptions = selectedLocationRecord && selectedLocationRecord.is_active === false
        ? [...activeLocationsList, selectedLocationRecord]
        : activeLocationsList;
    const selectedFormLocation = form.location_id ? locationMap.get(form.location_id) : undefined;
    const formLocationOptions = selectedFormLocation && selectedFormLocation.is_active === false
        ? [...activeLocationsList, selectedFormLocation]
        : activeLocationsList;
    const getLocationLabel = (locationId?: string | null) => {
        if (!locationId) return '';
        const parts: string[] = [];
        let current = locationMap.get(locationId);
        let guard = 0;
        while (current && guard < 8) {
            if (current.name) parts.push(current.name);
            current = current.parent_id ? locationMap.get(current.parent_id) : undefined;
            guard += 1;
        }
        if (parts.length === 0) return 'Emplacement supprimé';
        return parts.reverse().join(' / ');
    };

    const handleStockMovement = async () => {
        const qty = parseFloat(stockMovQty);
        if (isNaN(qty) || qty <= 0) return;
        setStockMovLoading(true);
        try {
            await stockApi.addMovement({
                product_id: stockModalProduct.product_id,
                type: stockMovType,
                quantity: qty,
                reason: stockMovReason || (stockMovType === 'in' ? 'Entrée stock' : 'Sortie stock'),
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

    const fetchProducts = async (locationFilter?: string) => {
        setLoading(true);
        setError(null);
        try {
            const resolvedLocation = locationFilter !== undefined
                ? (locationFilter || undefined)
                : (selectedLocation || undefined);
            const offlineLocationKey = locationFilter !== undefined ? locationFilter : selectedLocation;
            let partialError = false;
            const [prodsRes, catsRes, locsRes] = await Promise.allSettled([
                productsApi.list(undefined, 0, 500, resolvedLocation),
                categoriesApi.list(),
                hasEnterpriseLocations ? locationsApi.list() : Promise.resolve([])
            ]);

            if (prodsRes.status !== 'fulfilled') {
                throw prodsRes.reason;
            }

            const merged = mergeInventoryOfflineState(
                prodsRes.value.items || prodsRes.value,
                offlineLocationKey || '',
            );
            setProducts(merged.products);
            setPendingInventorySummary(merged.summary);

            if (catsRes.status === 'fulfilled') {
                setCategoriesList(catsRes.value);
            } else {
                partialError = true;
                console.warn('Inventory categories unavailable', catsRes.reason);
            }

            if (locsRes.status === 'fulfilled') {
                setLocationsList(locsRes.value);
            } else {
                partialError = true;
                console.warn('Inventory locations unavailable', locsRes.reason);
            }
            if (partialError) {
                setError(t('inventory.partial_load_error', { defaultValue: 'Certaines données annexes du stock sont temporairement indisponibles.' }));
            }
        } catch (err) {
            console.error('Error fetching inventory data', err);
            setError(t('inventory.load_error', { defaultValue: 'Impossible de charger les produits pour le moment.' }));
            setPendingInventorySummary(getPendingInventorySummary());
        } finally {
            setLoading(false);
        }
    };

    const loadStockHealth = async () => {
        setStockHealthLoading(true);
        try {
            const response = await analyticsApi.getStockHealth({ days: 30 });
            setStockHealth(response);
        } catch (err) {
            console.error('Error loading stock health', err);
        } finally {
            setStockHealthLoading(false);
        }
    };

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
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        void fetchProducts();
    }, [currentUser?.effective_plan, currentUser?.plan, currentUser?.role]);

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
            const result = await catalogApi.importAll(sector, currentUser?.country_code);
            alert(`${result.imported || 0} produits ont été importés pour ${currentFeatures?.sector_label || sector}.`);
            await fetchProducts();
            await loadStockHealth();
        } catch (err: any) {
            alert(err?.message || "Erreur lors de l'import du catalogue métier");
        } finally {
            setCatalogImportLoading(false);
        }
    };

    const handleOpenEditModal = (product: any) => {
        setEditingProduct(product);
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
            allows_fractional_sale: product.allows_fractional_sale ?? inferMeasurementType(product.unit) !== 'unit',
            has_variants: product.has_variants || false,
            variants: product.variants || []
        });
        setIsProductModalOpen(true);
    };

    const handleOpenHistory = (product: any) => {
        setSelectedProductForHistory(product);
        setIsHistoryModalOpen(true);
    };

    const handleOpenTransfer = (product: any) => {
        setTransferProduct(product);
        setTransferQty(1);
        const otherStores = storeList.filter(s => s.store_id !== currentUser?.active_store_id);
        setTransferDest(otherStores[0]?.store_id || '');
        setIsTransferOpen(true);
    };

    const handleOpenLocationTransfer = (product: any) => {
        setLocationTransferProduct(product);
        const availableLocations = activeLocationsList.filter((loc) => loc.location_id !== product.location_id);
        setLocationTransferDest(availableLocations[0]?.location_id || '');
        setLocationTransferNote('');
        setIsLocationTransferOpen(true);
    };

    const handleTransfer = async () => {
        if (!transferProduct || !transferDest || transferQty <= 0) return;
        setTransferring(true);
        try {
            await storesApi.transferStock({
                product_id: transferProduct.product_id,
                from_store_id: currentUser?.active_store_id,
                to_store_id: transferDest,
                quantity: transferQty,
            });
            setIsTransferOpen(false);
            fetchProducts();
            loadStockHealth();
        } catch (err: any) {
            alert(err?.message || 'Erreur lors du transfert');
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
            alert(err?.message || "Erreur lors du transfert d'emplacement");
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
            alert(err?.message || t('inventory.reverse_transfer_error'));
        }
    };

    const handleDeleteProduct = async (product: any) => {
        if (!product?.product_id || deletingProductId) return;

        const confirmed = window.confirm(
            `Supprimer définitivement le produit "${product.name}" ?`,
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
            alert(err?.message || 'Erreur lors de la suppression du produit');
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
                unit: measurement.unit,
                measurement_type: measurement.measurement_type,
                display_unit: measurement.display_unit,
                pricing_unit: measurement.pricing_unit,
                allows_fractional_sale: measurement.allows_fractional_sale,
                quantity_precision: measurement.quantity_precision,
            };
            if (editingProduct) {
                await productsApi.update(editingProduct.product_id, payload);
            } else {
                await productsApi.create(payload);
            }
            setIsProductModalOpen(false);
            fetchProducts();
            loadStockHealth();
        } catch (err) {
            console.error('Error saving product', err);
        } finally {
            setFormLoading(false);
        }
    };

    const handleAiSuggestCategory = async () => {
        if (!form.name || form.name.length < 3) return;
        setAiLoading(prev => ({ ...prev, category: true }));
        try {
            const res = await aiApi.suggestCategory(form.name, i18n.language);
            const matchedCat = categoriesList.find(c => (c.name || '').toLowerCase() === (res.category || '').toLowerCase());
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

    const filteredProducts = (Array.isArray(products) ? products : []).filter(p =>
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading && products.length === 0 && !error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error && products.length === 0) {
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
                        {t('common.retry', { defaultValue: 'Réessayer' })}
                    </button>
                </div>
            </div>
        );
    }

    const inventorySteps: GuideStep[] = [
        {
            title: t('guide.inventory.role_title', "Rôle de l'inventaire"),
            content: t('guide.inventory.role_content', "L'inventaire regroupe tous vos produits actifs. C'est ici que vous créez, modifiez, suivez et exportez votre catalogue. Chaque modification de stock est tracée dans l'historique. Les données sont filtrées par la boutique active."),
        },
        {
            title: t('guide.inventory.header_title', "Barre d'en-tête"),
            content: t('guide.inventory.header_content', "Les boutons en haut permettent de créer ou importer des produits et d'exporter l'inventaire."),
            details: [
                { label: t('guide.inventory.btn_add', "Bouton + Produit"), description: t('guide.inventory.btn_add_desc', "Ouvre le formulaire de création d'un nouveau produit : nom, catégorie, prix d'achat, prix de vente, stock initial, seuils min/max, SKU, unité."), type: 'button' },
                { label: t('guide.inventory.btn_import_csv', "Import CSV"), description: t('guide.inventory.btn_import_csv_desc', "Importez un fichier CSV pour créer plusieurs produits d'un coup. Le format attendu est affiché dans la modale."), type: 'button' },
                { label: t('guide.inventory.btn_import_text', "Import texte (IA)"), description: t('guide.inventory.btn_import_text_desc', "Collez une liste de produits en texte libre (ex : depuis un bon de livraison). L'IA détecte automatiquement les noms, quantités et prix."), type: 'button' },
                { label: t('guide.inventory.btn_scan', "Scanner en lot"), description: t('guide.inventory.btn_scan_desc', "Scannez plusieurs codes-barres à la suite pour effectuer une entrée de stock rapide."), type: 'button' },
                { label: t('guide.inventory.btn_export_xls', "Exporter XLS"), description: t('guide.inventory.btn_export_xls_desc', "Télécharge l'inventaire complet au format Excel avec toutes les colonnes (nom, SKU, stock, prix…)."), type: 'button' },
                { label: t('guide.inventory.btn_export_pdf', "Exporter PDF"), description: t('guide.inventory.btn_export_pdf_desc', "Génère un PDF de l'inventaire, utile pour l'impression ou le partage avec un fournisseur."), type: 'button' },
            ],
        },
        {
            title: t('guide.inventory.search_title', "Recherche et filtres"),
            content: t('guide.inventory.search_content', "Trouvez rapidement un produit parmi des centaines grâce à la recherche et aux filtres."),
            details: [
                { label: t('guide.inventory.search_bar', "Barre de recherche"), description: t('guide.inventory.search_bar_desc', "Recherche en temps réel par nom de produit ou SKU."), type: 'filter' },
                { label: t('guide.inventory.filter_location', "Filtre emplacement"), description: t('guide.inventory.filter_location_desc', "Filtrez les produits par boutique ou emplacement de stockage."), type: 'filter' },
                { label: t('guide.inventory.filter_toggle', "Icône filtre avancé"), description: t('guide.inventory.filter_toggle_desc', "Ouvre des filtres supplémentaires : catégorie, statut de stock (faible, rupture, surstock), fournisseur."), type: 'filter' },
            ],
        },
        {
            title: t('guide.inventory.product_list_title', "Liste des produits"),
            content: t('guide.inventory.product_list_content', "Chaque ligne du tableau représente un produit. Les colonnes affichent les informations clés du stock."),
            details: [
                { label: t('guide.inventory.col_name', "Nom / Initiale"), description: t('guide.inventory.col_name_desc', "Nom du produit avec l'initiale en avatar coloré. Cliquez sur le nom pour ouvrir la fiche complète."), type: 'card' },
                { label: t('guide.inventory.col_sku', "SKU"), description: t('guide.inventory.col_sku_desc', "Référence interne du produit. Utilisée pour les exports et les imports."), type: 'info' },
                { label: t('guide.inventory.col_qty', "Quantité"), description: t('guide.inventory.col_qty_desc', "Stock disponible actuel. Affiché en rouge si en rupture, en orange si sous le seuil minimum."), type: 'card' },
                { label: t('guide.inventory.col_price', "Prix d'achat / vente"), description: t('guide.inventory.col_price_desc', "Prix d'achat (coût) et prix de vente. La marge est calculée automatiquement."), type: 'info' },
            ],
        },
        {
            title: t('guide.inventory.actions_title', "Actions sur un produit"),
            content: t('guide.inventory.actions_content', "Chaque produit dispose d'un menu d'actions accessible via l'icône ⋯ à droite de la ligne."),
            details: [
                { label: t('guide.inventory.action_edit', "Modifier (crayon)"), description: t('guide.inventory.action_edit_desc', "Ouvre le formulaire d'édition du produit : tous les champs sont modifiables."), type: 'button' },
                { label: t('guide.inventory.action_movement', "Mouvement de stock (+ / −)"), description: t('guide.inventory.action_movement_desc', "Enregistrez une entrée (réception fournisseur, retour) ou une sortie (perte, casse, correction) avec une raison et une quantité."), type: 'button' },
                { label: t('guide.inventory.action_transfer', "Transfert"), description: t('guide.inventory.action_transfer_desc', "Transférez une quantité de ce produit vers une autre boutique (multi-boutiques uniquement)."), type: 'button' },
                { label: t('guide.inventory.action_history', "Historique (horloge)"), description: t('guide.inventory.action_history_desc', "Affiche tous les mouvements de stock de ce produit : date, type, quantité, auteur."), type: 'button' },
                { label: t('guide.inventory.action_delete', "Supprimer (🗑️)"), description: t('guide.inventory.action_delete_desc', "Supprime définitivement le produit. Cette action est irréversible. Les ventes passées restent conservées."), type: 'button' },
            ],
        },
        {
            title: t('guide.inventory.ai_title', "Réapprovisionnement IA"),
            content: t('guide.inventory.ai_content', "Le bouton 'IA Réappro' analyse votre historique de ventes et votre stock actuel pour suggérer les produits à commander en priorité, avec les quantités recommandées."),
            details: [
                { label: t('guide.inventory.ai_tip', "Astuce"), description: t('guide.inventory.ai_tip_desc', "La suggestion IA est plus pertinente après 2 à 4 semaines de données de ventes. Plus vous avez d'historique, plus la recommandation est précise."), type: 'tip' },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <ScreenGuide steps={inventorySteps} guideKey="inventory_tour" />
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 md:mb-10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{t('common.stock')}</h1>
                    <p className="text-slate-400">{t('catalog.product_count', { count: filteredProducts.length })}</p>
                    {error && (
                        <div className="mt-4 inline-flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                            <button
                                onClick={() => void fetchProducts()}
                                className="rounded-full border border-amber-400/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100 hover:bg-amber-500/10"
                            >
                                {t('common.retry', { defaultValue: 'R?essayer' })}
                            </button>
                        </div>
                    )}
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
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
                    {/* Export Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(v => !v)}
                            className="glass-card px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <Download size={16} />
                            Exporter
                            <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[180px]">
                                <button
                                    onClick={() => { exportInventory(filteredProducts, 'F', 'excel'); setShowExportMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="text-emerald-400" />
                                    Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => { exportInventory(filteredProducts, 'F', 'pdf'); setShowExportMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors"
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
                                        <p className="text-xs text-slate-400">Formulaire complet avec aide IA dans la fiche produit.</p>
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
                                        <p className="text-xs text-slate-400">Colle une liste libre, l’IA structure et crée les produits.</p>
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
                                        <p className="text-xs text-slate-400">Import en masse avec mapping intelligent des colonnes.</p>
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
                                                ? 'Import du catalogue…'
                                                : `Importer le catalogue ${currentFeatures?.sector_label || 'du métier'}`}
                                        </p>
                                        <p className="text-xs text-slate-400">Précharge un catalogue adapté à ton type d’activité.</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsBatchScanOpen(true)}
                        className="glass-card px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center gap-2"
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

            <StockHealthPanel data={stockHealth} loading={stockHealthLoading} />

            {/* AI Replenishment Advice Banner */}
            {showReplenish && (
                <div className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Sparkles size={20} className="text-violet-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-violet-300 font-bold text-sm mb-1">
                                    IA — Conseils de réapprovisionnement
                                    {replenishAdvice && ` (${replenishAdvice.priority_count} produits prioritaires)`}
                                </p>
                                {replenishLoading ? (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                                        Analyse en cours...
                                    </div>
                                ) : (
                                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{replenishAdvice?.advice}</p>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setShowReplenish(false)} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0">
                            <X size={16} />
                        </button>
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
                        onChange={(e) => setSearch(e.target.value)}
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

            {/* Products Table */}
            <div className="glass-card overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-slate-400 text-sm bg-white/5 uppercase tracking-wider">
                            <th className="py-4 px-6 font-semibold">Produit</th>
                            <th className="py-4 px-6 font-semibold">Catégorie</th>
                            <th className="py-4 px-6 font-semibold text-center">Stock</th>
                            <th className="py-4 px-6 font-semibold">Prix</th>
                            <th className="py-4 px-6 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-white">
                        {filteredProducts.map((p) => {
                            const matchesMin = p.quantity <= p.min_stock;
                            const isOut = p.quantity === 0;

                            return (
                                <tr key={p.product_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-4">
                                            {p.image ? (
                                                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" alt={p.name} />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-primary font-bold">
                                                    {(p.name || '?').charAt(0)}
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
                                                <span className="text-xs text-slate-500 font-mono uppercase">{p.sku || 'SANS-REF'}</span>
                                                {hasEnterpriseLocations && p.location_id && (
                                                    <span className="flex items-center gap-1 text-[10px] text-primary/70 font-medium mt-0.5">
                                                        <MapPin size={9} /> {getLocationLabel(p.location_id)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                                            {categoriesList.find(c => c.category_id === p.category_id)?.name || t('common.uncategorized')}
                                        </span>
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
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{p.selling_price} F</span>
                                            <span className="text-xs text-slate-500">Achat: {p.purchase_price} F</span>
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
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                                    title="Historique"
                                                >
                                                    <History size={18} />
                                                </button>
                                                {activeLocationsList.length > 0 && (
                                                    <button
                                                        onClick={() => handleOpenLocationTransfer(p)}
                                                        className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                                                        title="Transférer d'emplacement"
                                                    >
                                                        <MapPin size={18} />
                                                    </button>
                                                )}
                                                {storeList.length > 1 && (
                                                    <button
                                                        onClick={() => handleOpenTransfer(p)}
                                                        className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                                        title="Transférer vers une autre boutique"
                                                    >
                                                        <ArrowLeftRight size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOpenEditModal(p)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDeleteProduct(p)}
                                                    disabled={deletingProductId === p.product_id}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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

            {/* Stock Movement Modal */}
            <Modal
                isOpen={stockModalOpen}
                onClose={() => setStockModalOpen(false)}
                title={stockMovType === 'in' ? '📦 Entrée de stock' : '📤 Sortie de stock'}
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
                                min="0.001"
                                step="0.001"
                                value={stockMovQty}
                                onChange={e => setStockMovQty(e.target.value)}
                                placeholder="Ex: 0.25"
                                autoFocus
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                            />
                            {stockMovQty && !isNaN(parseFloat(stockMovQty)) && (
                                <p className="text-xs mt-1.5 text-slate-400">
                                    Nouveau stock :{' '}
                                    <span className={`font-bold ${stockMovType === 'in' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {stockMovType === 'in'
                                            ? stockModalProduct.quantity + parseFloat(stockMovQty)
                                            : Math.max(0, stockModalProduct.quantity - parseFloat(stockMovQty))}
                                    </span> {stockModalProduct.unit || 'unité(s)'}
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
                                : stockMovType === 'in' ? <><Plus size={18} /> Valider l'entrée</> : <><Minus size={18} /> Valider la sortie</>
                            }
                        </button>
                    </div>
                )}
            </Modal>

            {/* Product Add/Edit Modal */}
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
                                    <label className="block text-sm font-medium text-slate-300">{t('common.category')}</label>
                                    <select
                                        value={form.category_id}
                                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-primary/50 text-sm"
                                    >
                                        <option value="">Choisir...</option>
                                        {categoriesList.map(c => (
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
                                    <option value="raw_material">Ingrédient / Matière première</option>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Stock initial</label>
                                    <input
                                        type="number"
                                        step="0.001"
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
                                        {['pi?ce', 'kg', 'g', 'L', 'cL', 'mL', 'Paquet', 'Bo?te', 'Bouteille', 'Sac', 'Carton', 'Lot'].map(unit => (
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
                                        step="0.001"
                                        value={form.min_stock}
                                        onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">Stock maximum</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={form.max_stock}
                                        onChange={(e) => setForm({ ...form, max_stock: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">{t('common.purchase_price')}</label>
                                    <input
                                        type="number"
                                        value={form.purchase_price}
                                        onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 flex justify-between">
                                        {t('common.selling_price')}
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
                                    {storeList.filter(s => s.store_id !== currentUser?.active_store_id).map(s => (
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
                                    min={0.001}
                                    step="0.001"
                                    max={transferProduct.quantity}
                                    value={transferQty}
                                    onChange={e => setTransferQty(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
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
                                                    {tr.from_store_name} → {tr.to_store_name}
                                                </p>
                                                <p className="text-[10px] text-slate-600 mt-1">
                                                    {new Date(tr.created_at).toLocaleString()} • {tr.transferred_by}
                                                    {tr.note ? ` • ${tr.note}` : ''}
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
        </div>
    );
}
