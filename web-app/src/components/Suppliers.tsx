'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    ShoppingBag as ShoppingBagIcon,
    Search as SearchIcon,
    Star as StarIcon,
    MapPin as MapPinIcon,
    ChevronRight as ChevronRightIcon,
    Store as StoreIcon,
    Filter as FilterIcon,
    ShieldCheck as ShieldCheckIcon,
    Globe as GlobeIcon,
    ClipboardList,
    Plus,
    RefreshCcw,
    Truck,
    History,
    UserPlus,
    AlertTriangle,
    CheckCircle,
    X,
    MoreVertical,
    Mail,
    Phone,
    Package as PackageIcon,
    ExternalLink,
    FileText,
    MessageSquare,
    Zap,
    TrendingUp,
    Download
} from 'lucide-react';
import { generateOrderPDF } from '../utils/OrderPDFGenerator';
import Modal from './Modal';
import DeliveryConfirmationModal from './DeliveryConfirmationModal';
import {
    marketplace as marketplaceApi,
    procurementAnalytics,
    suppliers as suppliersApi,
    supplierProducts as supplierProductsApi,
    supplier_orders as ordersApi,
    replenishment as replenishmentApi,
    products as productsApi
} from '../services/api';

type TabType = 'manual' | 'orders' | 'replenishment' | 'marketplace' | 'insights';

export default function Suppliers() {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const [activeTab, setActiveTab] = useState<TabType>('manual');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Data states
    const [manualSuppliers, setManualSuppliers] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [marketplaceSuppliers, setMarketplaceSuppliers] = useState<any[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [supplierStats, setSupplierStats] = useState<any | null>(null);
    const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
    const [supplierLogs, setSupplierLogs] = useState<any[]>([]);
    const [linkedProducts, setLinkedProducts] = useState<any[]>([]);
    const [supplierOrderHistory, setSupplierOrderHistory] = useState<any[]>([]);
    const [supplierPriceHistory, setSupplierPriceHistory] = useState<any[]>([]);
    const [marketplaceSupplierDetail, setMarketplaceSupplierDetail] = useState<any | null>(null);
    const [supplierDetailLoading, setSupplierDetailLoading] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [logForm, setLogForm] = useState({ type: 'other', subject: '', content: '' });
    const [benchmarkLoading, setBenchmarkLoading] = useState(false);
    const [benchmarkProduct, setBenchmarkProduct] = useState<any | null>(null);
    const [benchmarkResults, setBenchmarkResults] = useState<any[]>([]);
    const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
    const [procurementOverview, setProcurementOverview] = useState<any | null>(null);
    const [procurementDays, setProcurementDays] = useState(90);

    // UI States
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    // New Supplier Form
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    });

    // New Order Form
    const [orderForm, setOrderForm] = useState({
        supplier_id: '',
        supplier_user_id: '',
        items: [] as any[],
        notes: '',
        expected_delivery: ''
    });
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [orderDetailLoading, setOrderDetailLoading] = useState(false);
    const [deliveryOrderId, setDeliveryOrderId] = useState<string | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showSupplierDetails, setShowSupplierDetails] = useState(false);
    const [supplierTab, setSupplierTab] = useState<'perf' | 'logs' | 'invoices'>('perf');
    const [partialItems, setPartialItems] = useState<any[]>([]);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkPrice, setLinkPrice] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [contextMenuSupplierId, setContextMenuSupplierId] = useState<string | null>(null);
    const [regionFilter, setRegionFilter] = useState('');
    const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
    const [automating, setAutomating] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab, procurementDays]);

    const handleWhatsApp = (phone?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^\d]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const handleAutomate = async () => {
        setAutomating(true);
        try {
            await replenishmentApi.automate();
            setSuccess("Réapprovisionnement automatique lancé avec succès !");
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Automate error", err);
        } finally {
            setAutomating(false);
        }
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        if (!confirm('Supprimer ce fournisseur ?')) return;
        try {
            await suppliersApi.delete(supplierId);
            setSuccess("Fournisseur supprimé.");
            setContextMenuSupplierId(null);
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Delete supplier error", err);
        }
    };

    const getScoreStyle = (label?: string) => {
        switch (label) {
            case 'fiable':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'a_surveiller':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'risque':
                return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default:
                return 'bg-white/5 text-slate-300 border-white/10';
        }
    };

    const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>) => {
        const escapeCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [headers, ...rows]
            .map((row) => row.map(escapeCell).join(','))
            .join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const exportProcurementRanking = () => {
        if (!procurementOverview?.supplier_ranking?.length) return;
        downloadCsv(
            `procurement-ranking-${procurementOverview.days}j.csv`,
            [
                'Fournisseur',
                'Type',
                'Score',
                'Statut',
                'Depense livree',
                'Commandes',
                'Commandes ouvertes',
                'Boutiques',
                'Delai moyen (jours)',
                'Taux a l heure (%)',
                'Taux livraison complete (%)',
                'Taux livraison partielle (%)',
                'Taux annulation (%)',
                'Variance prix (%)',
            ],
            procurementOverview.supplier_ranking.map((supplier: any) => [
                supplier.supplier_name,
                supplier.kind,
                supplier.score,
                supplier.score_label,
                supplier.total_spend,
                supplier.orders_count,
                supplier.open_orders,
                supplier.stores_count,
                supplier.avg_lead_time_days,
                supplier.on_time_rate,
                supplier.full_delivery_rate,
                supplier.partial_delivery_rate,
                supplier.cancel_rate,
                supplier.price_variance_pct,
            ]),
        );
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'manual') {
                const res = await suppliersApi.list();
                setManualSuppliers(res);
            } else if (activeTab === 'orders') {
                const res = await ordersApi.list();
                setOrders(res.items || res);
            } else if (activeTab === 'replenishment') {
                const res = await replenishmentApi.getSuggestions();
                setSuggestions(res);
            } else if (activeTab === 'marketplace') {
                const res = await marketplaceApi.searchSuppliers();
                const normalized = (Array.isArray(res) ? res : []).map((supplier: any) => ({
                    ...supplier,
                    name: supplier.company_name || supplier.name,
                    supplier_user_id: supplier.user_id || supplier.supplier_user_id,
                    category: supplier.categories?.[0] || supplier.category || '',
                    rating: supplier.rating_average ?? supplier.rating ?? 0,
                    country_code: supplier.country_code || '',
                    city: supplier.city || '',
                }));
                setMarketplaceSuppliers(normalized);
            } else if (activeTab === 'insights') {
                const res = await procurementAnalytics.getOverview(procurementDays);
                setProcurementOverview(res);
            }
        } catch (err) {
            console.error(`Error loading ${activeTab} data`, err);
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const res = await productsApi.list(undefined, 0, 500);
            setAllProducts(res.items || res);
        } catch (err) {
            console.error("Error loading products", err);
        }
    };

    useEffect(() => {
        if (showOrderModal) {
            loadProducts();
        }
    }, [showOrderModal]);

    const resetOrderForm = () => {
        setOrderForm({
            supplier_id: '',
            supplier_user_id: '',
            items: [],
            notes: '',
            expected_delivery: ''
        });
        setMarketplaceSupplierDetail(null);
    };

    const openManualOrderDraft = (supplier?: any, presetItems: any[] = []) => {
        setMarketplaceSupplierDetail(null);
        setOrderForm({
            supplier_id: supplier?.supplier_id || '',
            supplier_user_id: '',
            items: presetItems,
            notes: '',
            expected_delivery: ''
        });
        setShowOrderModal(true);
    };

    const openMarketplaceOrderDraft = async (supplier: any, presetItem?: any) => {
        const supplierUserId = supplier?.supplier_user_id || supplier?.user_id;
        setOrderForm({
            supplier_id: '',
            supplier_user_id: supplierUserId || '',
            items: presetItem ? [presetItem] : [],
            notes: '',
            expected_delivery: ''
        });
        setShowOrderModal(true);
        if (!supplierUserId) return;
        try {
            const detail = await marketplaceApi.getSupplier(supplierUserId);
            setMarketplaceSupplierDetail(detail);
        } catch (err) {
            console.error("Marketplace supplier detail error", err);
        }
    };

    const openBenchmarkForProduct = async (product: any) => {
        setBenchmarkProduct(product);
        setShowBenchmarkModal(true);
        setBenchmarkLoading(true);
        try {
            const results = await marketplaceApi.searchProducts({
                q: product?.name || '',
                category: product?.category || undefined,
            });
            const normalized = (Array.isArray(results) ? results : [])
                .sort((a, b) => (a.price || 0) - (b.price || 0))
                .slice(0, 20);
            setBenchmarkResults(normalized);
        } catch (err) {
            console.error("Marketplace benchmark error", err);
            setBenchmarkResults([]);
        } finally {
            setBenchmarkLoading(false);
        }
    };

    const openSupplierDetails = async (supplier: any, kind: 'manual' | 'marketplace') => {
        const normalizedSupplier = {
            ...supplier,
            kind,
            name: supplier?.name || supplier?.company_name,
            supplier_user_id: supplier?.supplier_user_id || supplier?.user_id,
        };
        setSelectedSupplier(normalizedSupplier);
        setSupplierTab('perf');
        setShowSupplierDetails(true);
        setSupplierDetailLoading(true);
        setSupplierStats(null);
        setSupplierInvoices([]);
        setSupplierLogs([]);
        setLinkedProducts([]);
        setSupplierOrderHistory([]);
        setSupplierPriceHistory([]);
        setMarketplaceSupplierDetail(null);
        try {
            if (kind === 'manual') {
                const [products, stats, ordersHistory, invoices, logs, priceHistory] = await Promise.all([
                    suppliersApi.getProducts(normalizedSupplier.supplier_id),
                    suppliersApi.getStats(normalizedSupplier.supplier_id),
                    ordersApi.list(undefined, normalizedSupplier.supplier_id).then((response) => response.items || response || []),
                    suppliersApi.getInvoices(normalizedSupplier.supplier_id),
                    suppliersApi.getLogs(normalizedSupplier.supplier_id),
                    suppliersApi.getPriceHistory(normalizedSupplier.supplier_id),
                ]);
                setLinkedProducts(Array.isArray(products) ? products : []);
                setSupplierStats(stats);
                setSupplierOrderHistory(Array.isArray(ordersHistory) ? ordersHistory : []);
                setSupplierInvoices(Array.isArray(invoices) ? invoices : []);
                setSupplierLogs(Array.isArray(logs) ? logs : []);
                setSupplierPriceHistory(Array.isArray(priceHistory) ? priceHistory : []);
            } else if (normalizedSupplier.supplier_user_id) {
                const detail = await marketplaceApi.getSupplier(normalizedSupplier.supplier_user_id);
                setMarketplaceSupplierDetail(detail);
            }
        } catch (err) {
            console.error("Supplier detail error", err);
        } finally {
            setSupplierDetailLoading(false);
        }
    };

    const openOrderDetails = async (orderId: string) => {
        setShowOrderDetails(true);
        setSelectedOrder(null);
        setOrderDetailLoading(true);
        try {
            const detail = await ordersApi.get(orderId);
            setSelectedOrder(detail);
        } catch (err) {
            console.error("Order detail error", err);
            setShowOrderDetails(false);
        } finally {
            setOrderDetailLoading(false);
        }
    };

    const handleCreateSupplierLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier?.supplier_id || !logForm.content.trim()) return;
        setSubmitting(true);
        try {
            const created = await suppliersApi.createLog(selectedSupplier.supplier_id, {
                type: logForm.type as any,
                subject: logForm.subject || undefined,
                content: logForm.content,
            });
            setSupplierLogs((current) => [created, ...current]);
            setLogForm({ type: 'other', subject: '', content: '' });
            setShowLogModal(false);
            setSuccess("Note fournisseur ajoutée.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Supplier log create error", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await suppliersApi.create(newSupplier);
            setSuccess("Fournisseur ajouté avec succès !");
            setShowSupplierModal(false);
            setNewSupplier({ name: '', contact_name: '', email: '', phone: '', address: '', notes: '' });
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Error creating supplier", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (orderForm.items.length === 0) return;
        setSubmitting(true);
        try {
            await ordersApi.create({
                supplier_id: orderForm.supplier_id || '',
                supplier_user_id: orderForm.supplier_user_id || undefined,
                notes: orderForm.notes || undefined,
                expected_delivery: orderForm.expected_delivery || undefined,
                items: orderForm.items.map((item) => ({
                    product_id: item.product_id,
                    quantity: Number(item.quantity) || 0,
                    unit_price: Number(item.unit_price) || 0,
                })),
            });
            setSuccess("Bon de commande créé avec succès !");
            setShowOrderModal(false);
            resetOrderForm();
            loadData();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Error creating order", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
        try {
            await ordersApi.updateStatus(orderId, status);
            setSuccess(`Statut mis à jour : ${status.toUpperCase()}`);
            loadData();
            if (selectedOrder?.order_id === orderId) {
                const updated = await ordersApi.get(orderId);
                setSelectedOrder(updated);
            }
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Error updating status", err);
        }
    };

    const handleReceivePartial = async (orderId: string) => {
        if (partialItems.length === 0) return;
        setSubmitting(true);
        try {
            await ordersApi.receivePartial(orderId, partialItems.map((item) => ({
                item_id: item.item_id,
                received_quantity: item.received_quantity,
            })));
            setSuccess("Réception partielle enregistrée. Le stock a été mis à jour.");
            loadData();
            const updated = await ordersApi.get(orderId);
            setSelectedOrder(updated);
            setPartialItems([]);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Error receiving partial", err);
        } finally {
            setSubmitting(false);
        }
    };

    const openLinkProduct = async () => {
        if (!selectedSupplier?.supplier_id) return;
        setShowLinkModal(true);
        setSelectedProductId(null);
        setLinkPrice('');
        try {
            const res = await productsApi.list(undefined, 0, 500);
            const products = res.items || res || [];
            const linkedIds = linkedProducts.map((link) => link.product_id);
            setAllProducts(products.filter((product: any) => !linkedIds.includes(product.product_id)));
        } catch (err) {
            console.error("Link product load error", err);
            setAllProducts([]);
        }
    };

    const handleLinkProduct = async () => {
        if (!selectedSupplier?.supplier_id || !selectedProductId) return;
        setSubmitting(true);
        try {
            await supplierProductsApi.link({
                supplier_id: selectedSupplier.supplier_id,
                product_id: selectedProductId,
                supplier_price: Number(linkPrice) || 0,
            });
            const refreshedProducts = await suppliersApi.getProducts(selectedSupplier.supplier_id);
            setLinkedProducts(Array.isArray(refreshedProducts) ? refreshedProducts : []);
            setShowLinkModal(false);
            setSelectedProductId(null);
            setLinkPrice('');
            setSuccess("Produit lie au fournisseur.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Link supplier product error", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnlinkProduct = async (linkId: string) => {
        if (!selectedSupplier?.supplier_id) return;
        try {
            await supplierProductsApi.unlink(linkId);
            const refreshedProducts = await suppliersApi.getProducts(selectedSupplier.supplier_id);
            setLinkedProducts(Array.isArray(refreshedProducts) ? refreshedProducts : []);
            setSuccess("Produit delie du fournisseur.");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error("Unlink supplier product error", err);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'confirmed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'shipped': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'partially_delivered': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-white/10';
        }
    };

    const filteredManualSuppliers = (Array.isArray(manualSuppliers) ? manualSuppliers : []).filter(s =>
        s?.name?.toLowerCase()?.includes(search.toLowerCase()) ||
        s?.contact_name?.toLowerCase()?.includes(search.toLowerCase())
    );

    const filteredMarketplace = (Array.isArray(marketplaceSuppliers) ? marketplaceSuppliers : []).filter(s =>
        (s.name || s.company_name || '')?.toLowerCase().includes(search.toLowerCase()) ||
        (s.city || '')?.toLowerCase().includes(search.toLowerCase())
    );

    const isMarketplaceOrder = Boolean(orderForm.supplier_user_id && !orderForm.supplier_id);
    const marketplaceOrderSupplier = isMarketplaceOrder
        ? marketplaceSuppliers.find((supplier: any) => (supplier.supplier_user_id || supplier.user_id) === orderForm.supplier_user_id)
            || (marketplaceSupplierDetail?.profile ? {
                ...marketplaceSupplierDetail.profile,
                name: marketplaceSupplierDetail.profile.company_name,
                supplier_user_id: marketplaceSupplierDetail.profile.user_id,
                category: marketplaceSupplierDetail.profile.categories?.[0] || '',
                rating: marketplaceSupplierDetail.profile.rating_average || 0,
            } : null)
        : null;
    const orderProductOptions = isMarketplaceOrder
        ? (marketplaceSupplierDetail?.catalog || [])
        : allProducts;
    const orderTotal = orderForm.items.reduce(
        (sum, item) => sum + ((Number(item.unit_price) || 0) * (Number(item.quantity) || 0)),
        0
    );

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar flex flex-col">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Fournisseurs & Commandes</h1>
                    <p className="text-slate-400">Gérez vos approvisionnements et découvrez de nouveaux partenaires.</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'manual' && (
                        <button
                            onClick={() => setShowSupplierModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <UserPlus size={18} />
                            Nouveau Fournisseur
                        </button>
                    )}
                    {activeTab === 'orders' && (
                        <button
                            onClick={() => {
                                resetOrderForm();
                                setShowOrderModal(true);
                            }}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Nouvelle Commande
                        </button>
                    )}
                    {activeTab === 'insights' && procurementOverview?.supplier_ranking?.length > 0 && (
                        <button
                            onClick={exportProcurementRanking}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Download size={18} />
                            Export Excel
                        </button>
                    )}
                </div>
            </header>

            {success && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle size={20} />
                    {success}
                </div>
            )}

            {/* Tabs Navigation */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-2xl w-fit mb-8 border border-white/5">
                {[
                    { id: 'manual', label: 'Mes Fournisseurs', icon: StoreIcon },
                    { id: 'orders', label: 'Bons de Commande', icon: ClipboardList },
                    { id: 'replenishment', label: 'Réapprovisionnement', icon: RefreshCcw },
                    { id: 'insights', label: 'Pilotage', icon: TrendingUp },
                    { id: 'marketplace', label: 'Marketplace', icon: GlobeIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1">
                {activeTab === 'manual' && (
                    <div className="space-y-6">
                        <div className="relative mb-6">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Rechercher parmi vos fournisseurs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all text-lg"
                            />
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
                                {[1, 2, 3].map(i => <div key={i} className="h-48 glass-card animate-pulse"></div>)}
                            </div>
                        ) : filteredManualSuppliers.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 glass-card">
                                <UserPlus size={64} className="mx-auto mb-4 opacity-10" />
                                <p className="text-xl mb-4">Vous n'avez pas encore de fournisseurs enregistrés.</p>
                                <button onClick={() => setShowSupplierModal(true)} className="text-primary font-bold hover:underline">
                                    Ajouter mon premier fournisseur
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredManualSuppliers.map((s) => (
                                    <div key={s.supplier_id} className="glass-card p-6 hover:border-primary/50 transition-all group flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                                    {s.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{s.name}</h3>
                                                    <p className="text-sm text-slate-500">{s.contact_name || 'Aucun contact'}</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setContextMenuSupplierId(contextMenuSupplierId === s.supplier_id ? null : s.supplier_id); }}
                                                    className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>
                                                {contextMenuSupplierId === s.supplier_id && (
                                                    <div className="absolute top-full right-0 mt-1 w-40 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                        <button
                                                            onClick={() => { openSupplierDetails(s, 'manual'); setContextMenuSupplierId(null); }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
                                                        >
                                                            Voir les détails
                                                        </button>
                                                        <button
                                                            onClick={() => { handleDeleteSupplier(s.supplier_id); }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-all"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            {s.phone && (
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Phone size={14} className="text-primary/50" />
                                                    {s.phone}
                                                </div>
                                            )}
                                            {s.email && (
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Mail size={14} className="text-primary/50" />
                                                    {s.email}
                                                </div>
                                            )}
                                            {s.address && (
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <MapPinIcon size={14} className="text-primary/50" />
                                                    <span className="line-clamp-1">{s.address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-white/5 flex gap-2">
                                            <button
                                                onClick={() => openSupplierDetails(s, 'manual')}
                                                className="flex-1 py-2 rounded-lg bg-white/5 text-slate-300 text-sm font-bold hover:bg-white/10 transition-colors"
                                            >
                                                Détails
                                            </button>
                                            <button
                                                onClick={() => openManualOrderDraft(s)}
                                                className="flex-1 py-2 rounded-lg bg-primary/10 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
                                            >
                                                Commander
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 glass-card animate-pulse"></div>)}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 glass-card">
                                <ClipboardList size={64} className="mx-auto mb-4 opacity-10" />
                                <p className="text-xl">Aucun bon de commande trouvé.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden glass-card">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/5 border-b border-white/10">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Référence</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fournisseur</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {orders.map((o) => (
                                            <tr
                                                key={o.order_id}
                                                onClick={() => openOrderDetails(o.order_id)}
                                                className="hover:bg-white/5 transition-colors group cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="text-white font-mono text-sm">#{o.order_id.substring(0, 8)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-white font-bold">{o.supplier_name}</div>
                                                    {o.is_connected && (
                                                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">Marketplace</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-400 text-sm">
                                                        {formatDate(o.created_at)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-primary font-bold">{formatCurrency(o.total_amount)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(o.status)}`}>
                                                        {o.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all">
                                                        <ChevronRightIcon size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'replenishment' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-amber-500/5 border border-amber-500/10 p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Analyse de Stock Intelligente</h3>
                                    <p className="text-sm text-slate-400">Ces suggestions sont basées sur votre vélocité de vente des 30 derniers jours.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAutomate}
                                disabled={automating}
                                className="btn-primary bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCcw size={18} className={automating ? 'animate-spin' : ''} />
                                {automating ? 'En cours...' : 'Tout Automatiser'}
                            </button>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 glass-card animate-pulse"></div>)}
                            </div>
                        ) : suggestions.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 glass-card">
                                <CheckCircle size={64} className="mx-auto mb-4 opacity-10 text-emerald-500" />
                                <p className="text-xl">Votre stock est optimal ! Aucune suggestion pour le moment.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suggestions.map((s, idx) => (
                                    <div key={idx} className={`glass-card p-5 border-l-4 transition-all hover:scale-[1.01] ${s.priority === 'critical' ? 'border-l-rose-500' : 'border-l-amber-500'
                                        }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-bold text-white mb-1">{s.product_name}</h4>
                                                <p className="text-xs text-slate-500">Fournisseur : <span className="text-slate-300 font-medium">{s.supplier_name}</span></p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${s.priority === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {s.priority}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <div className="bg-white/5 p-2 rounded-lg text-center">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Actuel</div>
                                                <div className="text-white font-bold">{s.current_quantity}</div>
                                            </div>
                                            <div className="bg-white/5 p-2 rounded-lg text-center">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Vélocité</div>
                                                <div className="text-white font-bold">{s.daily_velocity}/j</div>
                                            </div>
                                            <div className="bg-white/5 p-2 rounded-lg text-center">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Reste</div>
                                                <div className={`font-bold ${s.days_until_stock_out < 3 ? 'text-rose-400' : 'text-amber-400'}`}>
                                                    {s.days_until_stock_out || 'N/A'}j
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4">
                                            <div className="text-xs font-bold text-emerald-400">
                                                Suggestion: +{s.suggested_quantity} unités
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const supplier = manualSuppliers.find(ms => ms.name === s.supplier_name);
                                                    openManualOrderDraft(supplier, [{
                                                        product_id: s.product_id,
                                                        name: s.product_name,
                                                        quantity: s.suggested_quantity,
                                                        unit_price: 0
                                                    }]);
                                                }}
                                                className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold"
                                            >
                                                Commander
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        <div className="glass-card p-6 space-y-5">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Procurement enterprise</p>
                                    <h3 className="text-2xl font-black text-white mt-2">Pilotage achats multi-boutiques</h3>
                                    <p className="text-sm text-slate-400 mt-2">
                                        Consolidez les besoins, comparez les fournisseurs et detectez les opportunites d'achat groupe sans bloquer les responsables de boutique.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[30, 90, 365].map((days) => (
                                        <button
                                            key={days}
                                            onClick={() => setProcurementDays(days)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${procurementDays === days
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            {days} jours
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {!loading && procurementOverview && (
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                                        Perimetre : {procurementOverview.scope_label}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                                        Workflow approbation : {procurementOverview.approval.workflow_enabled ? 'optionnel actif' : 'non bloque'}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                        {procurementOverview.approval.pending_orders} demande(s) en attente
                                    </span>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6].map((index) => (
                                    <div key={index} className="h-32 glass-card animate-pulse" />
                                ))}
                            </div>
                        ) : !procurementOverview ? (
                            <div className="glass-card p-12 text-center text-slate-500">
                                <TrendingUp size={56} className="mx-auto mb-4 opacity-10" />
                                <p className="text-xl">Aucune donnee d'approvisionnement disponible.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    <div className="glass-card p-5">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Depense livree</p>
                                        <p className="text-2xl font-black text-white mt-2">{formatCurrency(procurementOverview.kpis.total_spend || 0)}</p>
                                        <p className="text-xs text-slate-400 mt-2">Sur {procurementOverview.days} jours.</p>
                                    </div>
                                    <div className="glass-card p-5">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Fournisseurs suivis</p>
                                        <p className="text-2xl font-black text-white mt-2">{procurementOverview.kpis.suppliers_count || 0}</p>
                                        <p className="text-xs text-slate-400 mt-2">Actifs sur le perimetre selectionne.</p>
                                    </div>
                                    <div className="glass-card p-5">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Score moyen</p>
                                        <p className="text-2xl font-black text-white mt-2">{procurementOverview.kpis.average_supplier_score || 0}/100</p>
                                        <p className="text-xs text-slate-400 mt-2">Fiabilite moyenne des fournisseurs.</p>
                                    </div>
                                    <div className="glass-card p-5">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Commandes ouvertes</p>
                                        <p className="text-2xl font-black text-amber-400 mt-2">{procurementOverview.kpis.open_orders || 0}</p>
                                        <p className="text-xs text-slate-400 mt-2">A suivre par les boutiques.</p>
                                    </div>
                                    <div className="glass-card p-5">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Opportunites groupees</p>
                                        <p className="text-2xl font-black text-primary mt-2">{procurementOverview.kpis.group_opportunities || 0}</p>
                                        <p className="text-xs text-slate-400 mt-2">Consolidation possible sans fusion imposee.</p>
                                    </div>
                                    <div className="glass-card p-5">
                                        <p className="text-[10px] font-black uppercase text-slate-500">Besoins locaux</p>
                                        <p className="text-2xl font-black text-rose-400 mt-2">{procurementOverview.kpis.local_replenishment_items || 0}</p>
                                        <p className="text-xs text-slate-400 mt-2">Suggestions d'appro par boutique.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    <div className="xl:col-span-2 glass-card p-6 space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Classement fournisseurs</p>
                                                <p className="text-sm text-slate-400 mt-1">Comparez fiabilite, delais, prix et charge multi-boutiques.</p>
                                            </div>
                                            <button
                                                onClick={exportProcurementRanking}
                                                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                                            >
                                                <Download size={14} />
                                                Exporter
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {procurementOverview.supplier_ranking.length === 0 ? (
                                                <div className="py-12 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                                    <StoreIcon size={32} className="mx-auto text-slate-700 mb-3" />
                                                    <p className="text-sm text-slate-500 font-bold uppercase">Aucun fournisseur a classer</p>
                                                </div>
                                            ) : procurementOverview.supplier_ranking.map((supplier: any) => (
                                                <div key={supplier.supplier_key} className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 space-y-4">
                                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-black text-white">{supplier.supplier_name}</p>
                                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getScoreStyle(supplier.score_label)}`}>
                                                                    {supplier.score_label?.replace('_', ' ') || 'neutre'}
                                                                </span>
                                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-white/5 text-slate-300 border-white/10">
                                                                    {supplier.kind === 'marketplace' ? 'Marketplace' : 'Manuel'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-2">
                                                                {supplier.orders_count} commande(s), {supplier.stores_count} boutique(s), {supplier.open_orders} ouverte(s)
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-2xl font-black text-white">{supplier.score}/100</p>
                                                            <p className="text-xs text-slate-400 mt-1">{formatCurrency(supplier.total_spend || 0)} livres</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Delai moyen</p>
                                                            <p className="text-white font-bold mt-1">{supplier.avg_lead_time_days || 0} j</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">A l heure</p>
                                                            <p className="text-emerald-400 font-bold mt-1">{Math.round(supplier.on_time_rate || 0)}%</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Livraison complete</p>
                                                            <p className="text-white font-bold mt-1">{Math.round(supplier.full_delivery_rate || 0)}%</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Livraison partielle</p>
                                                            <p className="text-amber-400 font-bold mt-1">{Math.round(supplier.partial_delivery_rate || 0)}%</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Variance prix</p>
                                                            <p className={`font-bold mt-1 ${(supplier.price_variance_pct || 0) > 8 ? 'text-rose-400' : 'text-white'}`}>
                                                                {Math.round(supplier.price_variance_pct || 0)}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {supplier.recent_incidents?.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {supplier.recent_incidents.map((incident: string, index: number) => (
                                                                <span
                                                                    key={`${supplier.supplier_key}-${index}`}
                                                                    className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]"
                                                                >
                                                                    {incident}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="glass-card p-6 space-y-4">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Synthese IA</p>
                                                <p className="text-sm text-slate-400 mt-1">Recommandations calcules sur la selection en cours.</p>
                                            </div>
                                            {procurementOverview.recommendations.length === 0 ? (
                                                <p className="text-sm text-slate-400">Aucun signal critique detecte. Les boutiques peuvent continuer leurs achats normalement.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {procurementOverview.recommendations.map((recommendation: string, index: number) => (
                                                        <div key={index} className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-sm text-slate-200 flex gap-3">
                                                            <Zap size={16} className="text-primary mt-0.5 shrink-0" />
                                                            <span>{recommendation}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="glass-card p-6 space-y-4">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Boutiques</p>
                                                <p className="text-sm text-slate-400 mt-1">Vue consolidee, sans perturber les responsables locaux.</p>
                                            </div>
                                            <div className="space-y-3">
                                                {procurementOverview.store_summaries.length === 0 ? (
                                                    <p className="text-sm text-slate-500">Aucune boutique active sur ce perimetre.</p>
                                                ) : procurementOverview.store_summaries.map((store: any) => (
                                                    <div key={store.store_id} className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 space-y-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-sm font-bold text-white">{store.store_name}</p>
                                                            <span className="text-xs text-slate-400">{store.active_suppliers} fournisseur(s)</span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                                            <div>
                                                                <p className="text-slate-500 uppercase font-black text-[10px]">Depense</p>
                                                                <p className="text-white font-bold mt-1">{formatCurrency(store.spent || 0)}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500 uppercase font-black text-[10px]">Ouvertes</p>
                                                                <p className="text-amber-400 font-bold mt-1">{store.open_orders || 0}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-slate-500 uppercase font-black text-[10px]">A reappro</p>
                                                                <p className="text-rose-400 font-bold mt-1">{store.critical_replenishments || 0}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="glass-card p-6 space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Suggestions locales</p>
                                            <p className="text-sm text-slate-400 mt-1">Aides a l'appro par boutique, jamais forcees.</p>
                                        </div>
                                        <div className="space-y-3">
                                            {procurementOverview.local_suggestions.length === 0 ? (
                                                <div className="py-12 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                                    <CheckCircle size={32} className="mx-auto text-emerald-500/50 mb-3" />
                                                    <p className="text-sm text-slate-500 font-bold uppercase">Aucun besoin local critique</p>
                                                </div>
                                            ) : procurementOverview.local_suggestions.map((suggestion: any) => (
                                                <div key={`${suggestion.store_id}-${suggestion.product_id}`} className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{suggestion.product_name}</p>
                                                            <p className="text-xs text-slate-400 mt-1">{suggestion.store_name} · {suggestion.supplier_name}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-primary">{formatCurrency(suggestion.estimated_total || 0)}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">Budget estime</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Actuel</p>
                                                            <p className="text-white font-bold mt-1">{suggestion.current_quantity}</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Min</p>
                                                            <p className="text-white font-bold mt-1">{suggestion.min_stock}</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">A commander</p>
                                                            <p className="text-emerald-400 font-bold mt-1">{suggestion.suggested_quantity}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="glass-card p-6 space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Opportunites d'achat groupe</p>
                                            <p className="text-sm text-slate-400 mt-1">Suggestions consolidees pour gagner du volume, sans imposer une commande centrale.</p>
                                        </div>
                                        <div className="space-y-3">
                                            {procurementOverview.group_opportunities.length === 0 ? (
                                                <div className="py-12 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                                    <Truck size={32} className="mx-auto text-slate-700 mb-3" />
                                                    <p className="text-sm text-slate-500 font-bold uppercase">Aucune opportunite groupee detectee</p>
                                                </div>
                                            ) : procurementOverview.group_opportunities.map((opportunity: any) => (
                                                <div key={`${opportunity.supplier_id || 'marketplace'}-${opportunity.supplier_name}`} className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{opportunity.supplier_name}</p>
                                                            <p className="text-xs text-slate-400 mt-1">{opportunity.stores_count} boutique(s) impliquee(s)</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-primary">{formatCurrency(opportunity.total_estimated_amount || 0)}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">Total estime</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {opportunity.stores.map((store: any) => (
                                                            <div key={`${opportunity.supplier_name}-${store.store_id}`} className="flex items-center justify-between gap-3 text-xs bg-white/5 rounded-xl px-3 py-2">
                                                                <span className="text-slate-300">{store.store_name}</span>
                                                                <span className="text-slate-400">{store.items_count} article(s)</span>
                                                                <span className="text-white font-bold">{formatCurrency(store.estimated_total || 0)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'marketplace' && (
                    <div className="space-y-6">
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Rechercher sur la Marketplace..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 transition-all text-lg"
                                />
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setIsRegionDropdownOpen(prev => !prev)}
                                    className={`px-6 py-4 rounded-2xl border flex items-center gap-2 transition-all ${regionFilter ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                >
                                    <FilterIcon size={20} />
                                    <span>{regionFilter || 'Région'}</span>
                                </button>
                                {isRegionDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-40 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 p-2">
                                        {['Dakar', 'Abidjan', 'Douala', 'Lagos', 'Accra'].map(region => (
                                            <button
                                                key={region}
                                                onClick={() => { setRegionFilter(region === regionFilter ? '' : region); setIsRegionDropdownOpen(false); setSearch(region === regionFilter ? '' : region); }}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${regionFilter === region ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {region}
                                            </button>
                                        ))}
                                        {regionFilter && (
                                            <button
                                                onClick={() => { setRegionFilter(''); setIsRegionDropdownOpen(false); setSearch(''); }}
                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all mt-1 border-t border-white/5"
                                            >
                                                Effacer le filtre
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading && marketplaceSuppliers.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 glass-card animate-pulse"></div>)}
                            </div>
                        ) : filteredMarketplace.length === 0 ? (
                            <div className="py-20 text-center text-slate-500 glass-card">
                                <GlobeIcon size={64} className="mx-auto mb-4 opacity-10" />
                                <p className="text-xl">Aucun fournisseur trouvé.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredMarketplace.map((s) => (
                                    <div key={s.supplier_user_id} className="glass-card overflow-hidden hover:border-primary/50 transition-all group">
                                        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                                            <div className="absolute -bottom-4 left-4">
                                                <div className="w-12 h-12 rounded-xl bg-[#0F172A] border-2 border-[#0F172A] shadow-lg flex items-center justify-center text-white overflow-hidden">
                                                    {s.logo_url ? (
                                                        <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="bg-primary/20 w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                                                            {s.name?.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-5 pt-7 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <h3 className="font-bold text-white text-base group-hover:text-primary transition-colors">{s.name}</h3>
                                                        {s.is_verified && <ShieldCheckIcon size={14} className="text-blue-400" />}
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                        {s.category || 'Grossiste'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-lg text-[10px] font-bold">
                                                    <StarIcon size={10} fill="currentColor" />
                                                    {s.rating || '4.5'}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 text-xs text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <MapPinIcon size={12} className="text-primary/50" />
                                                    {s.city}, {s.country_code || 'SN'}
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                                                <button
                                                    onClick={() => openMarketplaceOrderDraft(s)}
                                                    className="flex-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white"
                                                >
                                                    Commander
                                                </button>
                                                <button
                                                    onClick={() => openSupplierDetails(s, 'marketplace')}
                                                    className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all"
                                                >
                                                    <ChevronRightIcon size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: New Supplier */}
            {showSupplierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1E293B] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Ajouter un Fournisseur</h2>
                            <button onClick={() => setShowSupplierModal(false)} className="p-2 text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">Nom de l'entreprise *</label>
                                <input
                                    required
                                    type="text"
                                    value={newSupplier.name}
                                    onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">Contact (Nom)</label>
                                    <input
                                        type="text"
                                        value={newSupplier.contact_name}
                                        onChange={e => setNewSupplier({ ...newSupplier, contact_name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">Téléphone</label>
                                    <input
                                        type="tel"
                                        value={newSupplier.phone}
                                        onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    value={newSupplier.email}
                                    onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-400 mb-1">Adresse</label>
                                <textarea
                                    rows={2}
                                    value={newSupplier.address}
                                    onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full btn-primary py-4 mt-2 font-bold flex justify-center items-center gap-2"
                            >
                                {submitting ? <RefreshCcw size={20} className="animate-spin" /> : <UserPlus size={20} />}
                                Enregistrer le fournisseur
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: New Order */}
            {showOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1E293B] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Créer un Bon de Commande</h2>
                            <button onClick={() => setShowOrderModal(false)} className="p-2 text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">Fournisseur</label>
                                    {isMarketplaceOrder && marketplaceOrderSupplier ? (
                                        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
                                            <div className="text-sm font-bold text-white">
                                                {marketplaceOrderSupplier.name || marketplaceOrderSupplier.company_name}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                <span>{marketplaceOrderSupplier.city || 'Marketplace'}</span>
                                                <span>Catalogue: {(marketplaceSupplierDetail?.catalog || []).length} produits</span>
                                                <span>Note: {(marketplaceOrderSupplier.rating || 0).toFixed(1)}/5</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            required
                                            value={orderForm.supplier_id}
                                            onChange={e => setOrderForm({ ...orderForm, supplier_id: e.target.value, supplier_user_id: '' })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                        >
                                            <option value="" className="bg-slate-800">Sélectionner...</option>
                                            {manualSuppliers.map(s => <option key={s.supplier_id} value={s.supplier_id} className="bg-slate-800">{s.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-400 mb-1">Livraison Prévue</label>
                                    <input
                                        type="date"
                                        value={orderForm.expected_delivery}
                                        onChange={e => setOrderForm({ ...orderForm, expected_delivery: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Item Selector */}
                            <div className="bg-white/5 p-4 rounded-xl space-y-4 border border-white/5">
                                <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-6">
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Produit</label>
                                        <select
                                            className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
                                            onChange={(e) => {
                                                const prodId = e.target.value;
                                                if (!prodId) return;
                                                const product = isMarketplaceOrder
                                                    ? orderProductOptions.find((p: any) => p.catalog_id === prodId)
                                                    : orderProductOptions.find((p: any) => p.product_id === prodId);
                                                if (product) {
                                                    const existing = orderForm.items.find(i => i.product_id === prodId);
                                                    const nextQuantity = isMarketplaceOrder
                                                        ? Number(product.min_order_quantity) || 1
                                                        : 1;
                                                    const unitPrice = isMarketplaceOrder
                                                        ? Number(product.price) || 0
                                                        : Number(product.cost_price) || 0;
                                                    if (existing) {
                                                        setOrderForm({
                                                            ...orderForm,
                                                            items: orderForm.items.map(i => i.product_id === prodId ? { ...i, quantity: i.quantity + nextQuantity } : i)
                                                        });
                                                    } else {
                                                        setOrderForm({
                                                            ...orderForm,
                                                            items: [...orderForm.items, {
                                                                product_id: isMarketplaceOrder ? product.catalog_id : product.product_id,
                                                                name: product.name,
                                                                quantity: nextQuantity,
                                                                unit_price: unitPrice
                                                            }]
                                                        });
                                                    }
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Ajouter un produit...</option>
                                            {orderProductOptions.map((p: any) => (
                                                <option
                                                    key={isMarketplaceOrder ? p.catalog_id : p.product_id}
                                                    value={isMarketplaceOrder ? p.catalog_id : p.product_id}
                                                >
                                                    {p.name}
                                                    {isMarketplaceOrder ? ` - ${formatCurrency(p.price || 0)}/${p.unit || 'unité'}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-6 flex items-end">
                                        <p className="text-xs text-slate-500 italic">
                                            {isMarketplaceOrder
                                                ? "Le catalogue du fournisseur sélectionné est utilisé pour préparer la commande et comparer les prix."
                                                : "Sélectionnez un produit interne pour l'ajouter à la liste."}
                                        </p>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                                    {orderForm.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                                            <div className="flex-1 font-bold text-white text-sm">{item.name}</div>
                                            <div className="w-20">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => setOrderForm({
                                                        ...orderForm,
                                                        items: orderForm.items.map((it, i) => i === idx ? { ...it, quantity: parseInt(e.target.value) || 0 } : it)
                                                    })}
                                                    className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-center"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={e => setOrderForm({
                                                        ...orderForm,
                                                        items: orderForm.items.map((it, i) => i === idx ? { ...it, unit_price: parseInt(e.target.value) || 0 } : it)
                                                    })}
                                                    className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-right"
                                                />
                                            </div>
                                            <button
                                                onClick={() => setOrderForm({
                                                    ...orderForm,
                                                    items: orderForm.items.filter((_, i) => i !== idx)
                                                })}
                                                className="text-rose-500 hover:text-rose-400 p-1"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                <div className="text-slate-400">
                                    Total: <span className="text-white font-bold">{orderTotal.toLocaleString()} F</span>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowOrderModal(false)} className="px-6 py-2 rounded-xl text-slate-400 font-bold hover:text-white transition-all">Annuler</button>
                                    <button
                                        type="submit"
                                        disabled={submitting || orderForm.items.length === 0}
                                        className="btn-primary px-8 flex items-center gap-2"
                                    >
                                        {submitting ? <RefreshCcw size={18} className="animate-spin" /> : <ClipboardList size={18} />}
                                        Créer le Bon
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Order Details */}
            {showOrderDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0F172A] border-l border-white/10 h-full w-full max-w-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    {selectedOrder ? `Bon de Commande #${selectedOrder.order_id.substring(0, 8)}` : 'Chargement du bon'}
                                    {selectedOrder && (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(selectedOrder.status)}`}>
                                            {selectedOrder.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-slate-500 mt-1">Fournisseur : <span className="text-white">{selectedOrder?.supplier_name || '...'}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => selectedOrder && generateOrderPDF(selectedOrder)}
                                    disabled={!selectedOrder}
                                    className="p-2 text-primary hover:text-white bg-primary/10 rounded-xl transition-all disabled:opacity-40"
                                    title="Télécharger PDF"
                                >
                                    <FileText size={20} />
                                </button>
                                <button onClick={() => setShowOrderDetails(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                            {orderDetailLoading || !selectedOrder ? (
                                <div className="flex items-center justify-center py-24">
                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : (
                                <>
                            {/* Actions based on status */}
                            <div className="flex gap-3">
                                {selectedOrder.status === 'pending' && (
                                    <button
                                        onClick={() => handleUpdateOrderStatus(selectedOrder.order_id, 'confirmed')}
                                        className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} /> Confirmer la commande
                                    </button>
                                )}
                                {selectedOrder.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleUpdateOrderStatus(selectedOrder.order_id, 'shipped')}
                                        className="flex-1 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Truck size={20} /> Marquer comme expédiée
                                    </button>
                                )}
                                {(['shipped', 'partially_delivered'].includes(selectedOrder.status)) && (
                                    <button
                                        onClick={() => selectedOrder.is_connected ? setDeliveryOrderId(selectedOrder.order_id) : handleUpdateOrderStatus(selectedOrder.order_id, 'delivered')}
                                        className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PackageIcon size={20} /> Réception Finale (Total)
                                    </button>
                                )}
                                {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                                    <button
                                        onClick={() => handleUpdateOrderStatus(selectedOrder.order_id, 'cancelled')}
                                        className="px-6 py-3 bg-rose-500/10 text-rose-500 font-bold rounded-xl hover:bg-rose-500/20 transition-all"
                                    >
                                        Annuler
                                    </button>
                                )}
                            </div>

                            {/* Items Table */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <PackageIcon size={20} className="text-primary" />
                                    Articles commandés
                                </h3>
                                <div className="glass-card overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 text-slate-500 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Produit</th>
                                                <th className="px-4 py-3 text-center">Commandé</th>
                                                <th className="px-4 py-3 text-center">Reçu</th>
                                                <th className="px-4 py-3 text-right">Prix</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {selectedOrder.items?.map((item: any, idx: number) => {
                                                const receivedQuantity = selectedOrder.received_items?.[item.item_id] ?? item.received_quantity ?? 0;
                                                return (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 font-bold text-white">{item.product_name}</td>
                                                        <td className="px-4 py-3 text-center text-slate-400">{item.quantity}</td>
                                                        <td className="px-4 py-3 text-center text-emerald-400 font-bold">{receivedQuantity}</td>
                                                        <td className="px-4 py-3 text-right text-white ">{Number(item.unit_price || 0).toLocaleString()} F</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Partial Reception Form */}
                            {(['shipped', 'partially_delivered'].includes(selectedOrder.status)) && (
                                <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-2xl space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-white flex items-center gap-2">
                                            <Truck size={18} className="text-indigo-400" />
                                            Réception Partielle
                                        </h3>
                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">Mise à jour stock</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Saisissez les quantités réellement reçues pour mettre à jour votre stock immédiatement.</p>

                                    <div className="space-y-3">
                                        {selectedOrder.items?.map((item: any, idx: number) => {
                                            const receivedQuantity = selectedOrder.received_items?.[item.item_id] ?? item.received_quantity ?? 0;
                                            const remaining = item.quantity - receivedQuantity;
                                            if (remaining <= 0) return null;
                                            return (
                                                <div key={idx} className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-lg">
                                                    <div className="text-sm text-slate-300 font-medium">{item.product_name}</div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Reste: {remaining}</span>
                                                        <input
                                                            type="number"
                                                            max={remaining}
                                                            placeholder="0"
                                                            className="w-20 bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1 text-white text-sm text-center outline-none focus:border-indigo-500"
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setPartialItems(prev => {
                                                                    const filter = prev.filter(p => p.item_id !== item.item_id);
                                                                    if (val > 0) return [...filter, { item_id: item.item_id, received_quantity: val }];
                                                                    return filter;
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => handleReceivePartial(selectedOrder.order_id)}
                                        disabled={submitting || partialItems.length === 0}
                                        className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all disabled:opacity-50"
                                    >
                                        Valider la réception partielle
                                    </button>
                                </div>
                            )}

                            {/* Summary Card */}
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-slate-500 font-bold text-xs uppercase">Résumé financier</span>
                                    <History size={16} className="text-slate-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total commande</span>
                                        <span className="text-white font-bold">{selectedOrder.total_amount.toLocaleString()} F</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Date de création</span>
                                        <span className="text-white">{new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {selectedOrder.expected_delivery && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Livraison attendue</span>
                                            <span className="text-amber-400 font-bold">{new Date(selectedOrder.expected_delivery).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Modal: Supplier Details (Performance & Logs) */}
            <Modal
                isOpen={showSupplierDetails}
                onClose={() => setShowSupplierDetails(false)}
                title={selectedSupplier?.name || "Fournisseur"}
                maxWidth="xl"
            >
                {selectedSupplier && (
                    <div className="space-y-6">
                        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 w-fit mx-auto">
                            <button
                                onClick={() => setSupplierTab('perf')}
                                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${supplierTab === 'perf' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                Performance
                            </button>
                            <button
                                onClick={() => setSupplierTab('logs')}
                                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${supplierTab === 'logs' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                {selectedSupplier.kind === 'marketplace' ? 'Catalogue' : 'Journal de Bord'}
                            </button>
                            <button
                                onClick={() => setSupplierTab('invoices')}
                                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${supplierTab === 'invoices' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                {selectedSupplier.kind === 'marketplace' ? 'Avis' : 'Factures'}
                            </button>
                        </div>

                        {supplierDetailLoading ? (
                            <div className="py-16 flex justify-center">
                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : supplierTab === 'perf' && selectedSupplier.kind === 'marketplace' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Note moyenne</p>
                                        <p className="text-2xl font-black text-white">{Number(marketplaceSupplierDetail?.profile?.rating_average || 0).toFixed(1)}/5</p>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Avis</p>
                                        <p className="text-2xl font-black text-white">{marketplaceSupplierDetail?.profile?.rating_count || 0}</p>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Catalogue</p>
                                        <p className="text-2xl font-black text-white">{(marketplaceSupplierDetail?.catalog || []).length}</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-3 text-sm">
                                    <p className="text-white font-bold">{marketplaceSupplierDetail?.profile?.company_name || selectedSupplier.name}</p>
                                    <p className="text-slate-300 leading-relaxed">{marketplaceSupplierDetail?.profile?.description || "Ce fournisseur n'a pas encore ajouté de description détaillée."}</p>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Ville</span><span className="text-white font-bold">{marketplaceSupplierDetail?.profile?.city || '-'}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Commande min.</span><span className="text-white font-bold">{formatCurrency(marketplaceSupplierDetail?.profile?.min_order_amount || 0)}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Délai moyen</span><span className="text-white font-bold">{marketplaceSupplierDetail?.profile?.average_delivery_days || 0} jours</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Zones</span><span className="text-white font-bold text-right">{(marketplaceSupplierDetail?.profile?.delivery_zones || []).join(', ') || 'Non renseignées'}</span></div>
                                </div>
                            </div>
                        ) : supplierTab === 'perf' && selectedSupplier.kind !== 'marketplace' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl"><p className="text-[10px] font-black text-slate-500 uppercase">Commandes</p><p className="text-2xl font-black text-white">{supplierStats?.orders_count || 0}</p></div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl"><p className="text-[10px] font-black text-slate-500 uppercase">Total livré</p><p className="text-xl font-black text-white">{formatCurrency(supplierStats?.total_spent || 0)}</p></div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl"><p className="text-[10px] font-black text-slate-500 uppercase">En attente</p><p className="text-xl font-black text-amber-400">{formatCurrency(supplierStats?.pending_spent || 0)}</p></div>
                                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl"><p className="text-[10px] font-black text-emerald-500/50 uppercase">Taux de service</p><p className="text-xl font-black text-emerald-400">{supplierStats?.orders_count ? Math.round(((supplierStats?.delivered_count || 0) / supplierStats.orders_count) * 100) : 0}%</p></div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-3 text-sm">
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Commandes livrées</span><span className="text-white font-bold">{supplierStats?.delivered_count || 0}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Commandes ouvertes</span><span className="text-white font-bold">{supplierStats?.pending_orders || 0}</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Délai moyen</span><span className="text-white font-bold">{supplierStats?.avg_delivery_days || 0} jours</span></div>
                                    <div className="flex justify-between gap-4"><span className="text-slate-400">Contact</span><span className="text-white font-bold text-right">{selectedSupplier.contact_name || selectedSupplier.phone || 'Non renseigné'}</span></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                    <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl">
                                        <p className="text-[10px] font-black text-primary/60 uppercase">Score fournisseur</p>
                                        <p className="text-xl font-black text-white">{supplierStats?.score || 0}/100</p>
                                        <span className={`inline-flex mt-3 px-2 py-1 rounded-full text-[10px] font-bold border ${getScoreStyle(supplierStats?.score_label)}`}>
                                            {supplierStats?.score_label?.replace('_', ' ') || 'non classe'}
                                        </span>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">A l'heure</p>
                                        <p className="text-xl font-black text-emerald-400">{Math.round(supplierStats?.on_time_rate || 0)}%</p>
                                        <p className="text-xs text-slate-400 mt-2">Livraison complete: {Math.round(supplierStats?.full_delivery_rate || 0)}%</p>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Livraison partielle</p>
                                        <p className="text-xl font-black text-amber-400">{Math.round(supplierStats?.partial_delivery_rate || 0)}%</p>
                                        <p className="text-xs text-slate-400 mt-2">Annulation: {Math.round(supplierStats?.cancel_rate || 0)}%</p>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Variance prix</p>
                                        <p className={`text-xl font-black ${(supplierStats?.price_variance_pct || 0) > 8 ? 'text-rose-400' : 'text-white'}`}>{Math.round(supplierStats?.price_variance_pct || 0)}%</p>
                                        <p className="text-xs text-slate-400 mt-2">Panier moyen: {formatCurrency(supplierStats?.average_order_value || 0)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Incidents recents</p>
                                            <p className="text-sm text-slate-400 mt-1">Retards, annulations ou livraisons partielles detectes sur ce fournisseur.</p>
                                        </div>
                                        {supplierStats?.recent_incidents?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {supplierStats.recent_incidents.map((incident: string, index: number) => (
                                                    <span key={index} className="px-3 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                                        {incident}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                                <CheckCircle size={28} className="mx-auto text-emerald-500/50 mb-3" />
                                                <p className="text-sm text-slate-500 font-bold uppercase">Aucun incident recent</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Repartition par boutique</p>
                                            <p className="text-sm text-slate-400 mt-1">Pour piloter sans casser l'autonomie des responsables locaux.</p>
                                        </div>
                                        <div className="space-y-3">
                                            {supplierStats?.store_breakdown?.length ? supplierStats.store_breakdown.map((store: any) => (
                                                <div key={store.store_id || store.store_name} className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-bold text-white">{store.store_name}</p>
                                                        <span className="text-xs text-slate-400">{store.orders_count} commande(s)</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                                                        <div>
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Depense</p>
                                                            <p className="text-white font-bold mt-1">{formatCurrency(store.total_spent || 0)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Ouvertes</p>
                                                            <p className="text-amber-400 font-bold mt-1">{store.open_orders || 0}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Livrees</p>
                                                            <p className="text-emerald-400 font-bold mt-1">{store.delivered_orders || 0}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-sm text-slate-500">Aucune ventilation par boutique disponible.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Historique de prix</p>
                                        <p className="text-sm text-slate-400 mt-1">Suivez les variations recentes et comparez avec les autres fournisseurs lies.</p>
                                    </div>
                                    {supplierPriceHistory.length === 0 ? (
                                        <div className="py-12 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                            <History size={32} className="mx-auto text-slate-700 mb-3" />
                                            <p className="text-sm text-slate-500 font-bold uppercase">Pas encore d'historique de prix exploitable</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                            {supplierPriceHistory.map((item: any) => (
                                                <div key={item.product_id} className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{item.product_name}</p>
                                                            <p className="text-xs text-slate-500 mt-1">Derniere commande: {item.last_ordered_at ? formatDate(item.last_ordered_at) : 'jamais'}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-primary">{formatCurrency(item.current_supplier_price || 0)}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">Prix actuel</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Dernier prix</p>
                                                            <p className="text-white font-bold mt-1">{formatCurrency(item.last_order_price || 0)}</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Moy. 30j</p>
                                                            <p className="text-white font-bold mt-1">{formatCurrency(item.average_price_30d || 0)}</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Moy. 90j</p>
                                                            <p className="text-white font-bold mt-1">{formatCurrency(item.average_price_90d || 0)}</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Min/Max 90j</p>
                                                            <p className="text-white font-bold mt-1">{formatCurrency(item.min_price_90d || 0)} / {formatCurrency(item.max_price_90d || 0)}</p>
                                                        </div>
                                                        <div className="bg-white/5 rounded-xl p-3">
                                                            <p className="text-slate-500 uppercase font-black text-[10px]">Variation</p>
                                                            <p className={`font-bold mt-1 ${(item.latest_change_pct || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.round(item.latest_change_pct || 0)}%</p>
                                                        </div>
                                                    </div>
                                                    {item.competitor_prices?.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.competitor_prices.slice(0, 4).map((competitor: any, index: number) => (
                                                                <span key={`${item.product_id}-${index}`} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                                                                    {competitor.supplier_name}: {formatCurrency(competitor.supplier_price || 0)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Produits lies</p>
                                            <p className="text-sm text-slate-400 mt-1">Reliez votre catalogue a ce fournisseur pour commander plus vite et benchmarker les prix.</p>
                                        </div>
                                        <button
                                            onClick={openLinkProduct}
                                            className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                                        >
                                            <Plus size={14} className="inline mr-1" /> Lier un produit
                                        </button>
                                    </div>
                                    {linkedProducts.length === 0 ? (
                                        <div className="py-12 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                            <PackageIcon size={32} className="mx-auto text-slate-700 mb-3" />
                                            <p className="text-sm text-slate-500 font-bold uppercase">Aucun produit lie</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                            {linkedProducts.map((link: any) => (
                                                <div key={link.link_id} className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl space-y-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{link.product?.name || 'Produit'}</p>
                                                            <p className="text-xs text-slate-500 mt-1">
                                                                Stock: {link.product?.quantity ?? 0} {link.product?.unit || 'unite'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-primary">{formatCurrency(link.supplier_price || 0)}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">Prix fournisseur</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openBenchmarkForProduct(link.product)}
                                                            className="flex-1 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all"
                                                        >
                                                            Benchmark
                                                        </button>
                                                        <button
                                                            onClick={() => handleUnlinkProduct(link.link_id)}
                                                            className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-all"
                                                        >
                                                            Delier
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Historique commandes</p>
                                            <p className="text-sm text-slate-400 mt-1">Ouvrez les derniers bons de commande depuis la fiche fournisseur.</p>
                                        </div>
                                        <button
                                            onClick={() => setActiveTab('orders')}
                                            className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all"
                                        >
                                            Voir tout
                                        </button>
                                    </div>
                                    {supplierOrderHistory.length === 0 ? (
                                        <div className="py-12 text-center bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                            <ClipboardList size={32} className="mx-auto text-slate-700 mb-3" />
                                            <p className="text-sm text-slate-500 font-bold uppercase">Aucune commande pour ce fournisseur</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {supplierOrderHistory.slice(0, 5).map((order: any) => (
                                                <button
                                                    key={order.order_id}
                                                    onClick={() => openOrderDetails(order.order_id)}
                                                    className="w-full text-left bg-slate-950/30 border border-white/5 p-4 rounded-2xl hover:bg-white/5 transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-bold text-white">#{order.order_id.substring(0, 8)}</p>
                                                            <p className="text-xs text-slate-500 mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(order.status)}`}>
                                                            {order.status.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between text-sm">
                                                        <span className="text-slate-400">{order.items_count || order.items?.length || 0} articles</span>
                                                        <span className="text-white font-bold">{formatCurrency(order.total_amount || 0)}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : supplierTab === 'logs' && selectedSupplier.kind === 'marketplace' ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                {(marketplaceSupplierDetail?.catalog || []).length === 0 ? (
                                    <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <PackageIcon size={40} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-sm text-slate-500 font-bold uppercase">Catalogue vide pour le moment</p>
                                    </div>
                                ) : (marketplaceSupplierDetail?.catalog || []).map((product: any) => (
                                    <div key={product.catalog_id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold text-white">{product.name}</p>
                                                <p className="text-xs text-slate-400 mt-1">{product.description || product.category || 'Produit marketplace'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-primary">{formatCurrency(product.price || 0)}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{product.unit || 'unité'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                                            <span>Min: {product.min_order_quantity || 1}</span>
                                            <span>Stock: {product.stock_available || 0}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openMarketplaceOrderDraft(selectedSupplier, { product_id: product.catalog_id, name: product.name, quantity: product.min_order_quantity || 1, unit_price: product.price || 0 })} className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all">Commander</button>
                                            <button onClick={() => openBenchmarkForProduct(product)} className="flex-1 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all">Benchmark</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : supplierTab === 'logs' && selectedSupplier.kind !== 'marketplace' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Journal des échanges</label>
                                    <button onClick={() => { setLogForm({ type: 'other', subject: '', content: '' }); setShowLogModal(true); }} className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                                        <Plus size={12} /> Ajouter une note
                                    </button>
                                </div>
                                {supplierLogs.length === 0 ? (
                                    <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <History size={40} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-sm text-slate-500 font-bold uppercase">Aucune note fournisseur</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                        {supplierLogs.map((log: any) => (
                                            <div key={log.log_id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                                                    {log.type === 'call' ? <Phone size={14} /> : log.type === 'email' ? <Mail size={14} /> : log.type === 'visit' ? <MapPinIcon size={14} /> : <MessageSquare size={14} />}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-white leading-relaxed font-bold">{log.subject || log.content}</p>
                                                    {log.subject && <p className="text-xs text-slate-400 leading-relaxed">{log.content}</p>}
                                                    <p className="text-[10px] text-slate-600 font-bold uppercase">{new Date(log.created_at).toLocaleDateString()} • {log.type}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : supplierTab === 'invoices' && selectedSupplier.kind === 'marketplace' ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                {(marketplaceSupplierDetail?.ratings || []).length === 0 ? (
                                    <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                        <StarIcon size={40} className="mx-auto text-slate-700 mb-3" />
                                        <p className="text-sm text-slate-500 font-bold uppercase">Aucun avis publié</p>
                                    </div>
                                ) : (marketplaceSupplierDetail?.ratings || []).map((rating: any) => (
                                    <div key={rating.rating_id} className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-bold text-white">{rating.shopkeeper_name || 'Client marketplace'}</p>
                                                <p className="text-[10px] text-slate-500 uppercase">{new Date(rating.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg text-xs font-bold">
                                                <StarIcon size={12} fill="currentColor" />
                                                {rating.score}/5
                                            </div>
                                        </div>
                                        {rating.comment && <p className="text-sm text-slate-300 leading-relaxed">{rating.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : supplierTab === 'invoices' && selectedSupplier.kind !== 'marketplace' ? (
                            <div className="overflow-hidden bg-white/5 rounded-2xl border border-white/5">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/10 text-slate-500 font-bold">
                                        <tr>
                                            <th className="px-4 py-3">Numéro</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3 text-right">Montant</th>
                                            <th className="px-4 py-3 text-center">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {supplierInvoices.length === 0 ? (
                                            <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucune facture fournisseur</td></tr>
                                        ) : supplierInvoices.map((invoice: any) => (
                                            <tr key={invoice.invoice_id} className="hover:bg-white/5">
                                                <td className="px-4 py-3 font-mono text-white">{invoice.invoice_number}</td>
                                                <td className="px-4 py-3 text-slate-400">{new Date(invoice.created_at).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(invoice.amount || 0)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${invoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : invoice.status === 'partial' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>{invoice.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : supplierTab === 'perf' ? (
                            <div className="animate-in fade-in duration-300 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Commandes</p>
                                        <p className="text-2xl font-black text-white">12</p>
                                    </div>
                                    <div className="p-5 bg-white/5 border border-white/5 rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Total Commandé</p>
                                        <p className="text-xl font-black text-white">450,000 F</p>
                                    </div>
                                    <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-1">
                                        <p className="text-[10px] font-black text-emerald-500/50 uppercase">Taux de Service</p>
                                        <p className="text-xl font-black text-emerald-500">92%</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
                                        <TrendingUp size={16} /> Volume d'achat mensuel
                                    </h4>
                                    <div className="h-40 flex items-end justify-between gap-2 px-2">
                                        {[40, 60, 45, 90, 65, 80].map((h, i) => (
                                            <div key={i} className="flex-1 bg-primary/20 rounded-t-lg transition-all hover:bg-primary/40 relative group" style={{ height: `${h}%` }}>
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {h * 10}k F
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest px-2">
                                        <span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Fev</span>
                                    </div>
                                </div>
                            </div>
                        ) : supplierTab === 'logs' ? (
                            <div className="animate-in fade-in duration-300 space-y-4">
                                <div className="flex justify-between items-center px-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Journal des échanges</label>
                                    <button className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline">
                                        <Plus size={12} /> Ajouter une note
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                    {[
                                        { date: '2024-02-15', msg: 'Appel pour retard de livraison sur commande #A4B2', type: 'call' },
                                        { date: '2024-02-10', msg: 'Devis reçu pour nouveaux arrivages bijoux', type: 'mail' },
                                        { date: '2024-01-28', msg: 'Visite au showroom, discussion tarifs gros', type: 'visit' }
                                    ].map((l, i) => (
                                        <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                                                {l.type === 'call' ? <Phone size={14} /> : <MessageSquare size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-xs text-white leading-relaxed">{l.msg}</p>
                                                <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">{new Date(l.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-300 space-y-4">
                                <div className="overflow-hidden bg-white/5 rounded-2xl border border-white/5">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-white/10 text-slate-500 font-bold">
                                            <tr>
                                                <th className="px-4 py-3">Numéro</th>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3 text-right">Montant</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {[1, 2, 3].map(i => (
                                                <tr key={i} className="hover:bg-white/5">
                                                    <td className="px-4 py-3 font-mono">#FAC-00{i}</td>
                                                    <td className="px-4 py-3 text-slate-400">12/02/2024</td>
                                                    <td className="px-4 py-3 text-right font-bold text-white">45,000 F</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Payée</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4 pt-6 border-t border-white/10">
                            {selectedSupplier.kind === 'marketplace' && (
                                <button
                                    onClick={() => openMarketplaceOrderDraft(selectedSupplier)}
                                    className="flex-1 py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider"
                                >
                                    <ClipboardList size={18} /> Commander
                                </button>
                            )}
                            <button
                                onClick={() => handleWhatsApp(selectedSupplier.phone || marketplaceSupplierDetail?.profile?.phone)}
                                className="flex-1 py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm uppercase tracking-wider"
                            >
                                <MessageSquare size={18} /> WhatsApp
                            </button>
                            <button
                                onClick={() => setShowSupplierDetails(false)}
                                className="px-8 py-4 border border-white/10 text-slate-400 font-bold rounded-2xl hover:bg-white/5 transition-all"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            <Modal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                title="Ajouter une note fournisseur"
            >
                <form onSubmit={handleCreateSupplierLog} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Type</label>
                        <select
                            value={logForm.type}
                            onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        >
                            <option value="other" className="bg-slate-800">Note</option>
                            <option value="call" className="bg-slate-800">Appel</option>
                            <option value="email" className="bg-slate-800">Email</option>
                            <option value="whatsapp" className="bg-slate-800">WhatsApp</option>
                            <option value="visit" className="bg-slate-800">Visite</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Objet</label>
                        <input
                            type="text"
                            value={logForm.subject}
                            onChange={(e) => setLogForm({ ...logForm, subject: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Contenu</label>
                        <textarea
                            required
                            rows={4}
                            value={logForm.content}
                            onChange={(e) => setLogForm({ ...logForm, content: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowLogModal(false)} className="flex-1 px-4 py-3 rounded-xl text-slate-400 font-bold hover:text-white transition-all">
                            Annuler
                        </button>
                        <button type="submit" disabled={submitting} className="flex-1 btn-primary py-3 font-bold">
                            {submitting ? '...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </Modal>
            <Modal
                isOpen={showLinkModal}
                onClose={() => !submitting && setShowLinkModal(false)}
                title="Lier un produit au fournisseur"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Produit interne</label>
                        <select
                            value={selectedProductId || ''}
                            onChange={(e) => setSelectedProductId(e.target.value || null)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                        >
                            <option value="" className="bg-slate-800">Choisir un produit</option>
                            {allProducts.map((product: any) => (
                                <option key={product.product_id} value={product.product_id} className="bg-slate-800">
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-1">Prix fournisseur</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linkPrice}
                            onChange={(e) => setLinkPrice(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowLinkModal(false)} className="flex-1 px-4 py-3 rounded-xl text-slate-400 font-bold hover:text-white transition-all">
                            Annuler
                        </button>
                        <button type="button" onClick={handleLinkProduct} disabled={submitting || !selectedProductId} className="flex-1 btn-primary py-3 font-bold disabled:opacity-50">
                            {submitting ? '...' : 'Lier le produit'}
                        </button>
                    </div>
                </div>
            </Modal>
            <DeliveryConfirmationModal
                isOpen={Boolean(deliveryOrderId)}
                orderId={deliveryOrderId}
                onClose={() => setDeliveryOrderId(null)}
                onConfirmed={async () => {
                    if (deliveryOrderId) {
                        try {
                            const updated = await ordersApi.get(deliveryOrderId);
                            setSelectedOrder(updated);
                        } catch (err) {
                            console.error('Delivery detail refresh error', err);
                        }
                    }
                    setDeliveryOrderId(null);
                    loadData();
                }}
            />
            <Modal
                isOpen={showBenchmarkModal}
                onClose={() => setShowBenchmarkModal(false)}
                title={benchmarkProduct ? `Benchmark • ${benchmarkProduct.name}` : 'Benchmark produit'}
                maxWidth="xl"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                        Comparez les offres disponibles pour ce produit, puis préparez directement une commande vers le fournisseur le plus intéressant.
                    </p>
                    {benchmarkLoading ? (
                        <div className="py-16 flex justify-center">
                            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : benchmarkResults.length === 0 ? (
                        <div className="py-16 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <SearchIcon size={40} className="mx-auto text-slate-700 mb-3" />
                            <p className="text-sm text-slate-500 font-bold uppercase">Aucun résultat comparable trouvé</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            {benchmarkResults.map((result: any, index: number) => (
                                <div key={`${result.catalog_id}-${index}`} className={`border rounded-2xl p-4 ${index === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/5'}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-white">{result.supplier_name}</p>
                                                {index === 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase">Meilleur prix</span>}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{result.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase mt-1">{result.supplier_city || 'Marketplace'} • note {(result.supplier_rating || 0).toFixed(1)}/5</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-primary">{formatCurrency(result.price || 0)}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">{result.unit || 'unité'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowBenchmarkModal(false);
                                                openMarketplaceOrderDraft({
                                                    supplier_user_id: result.supplier_user_id,
                                                    name: result.supplier_name,
                                                    city: result.supplier_city,
                                                    rating: result.supplier_rating,
                                                }, {
                                                    product_id: result.catalog_id,
                                                    name: result.name,
                                                    quantity: result.min_order_quantity || 1,
                                                    unit_price: result.price || 0,
                                                });
                                            }}
                                            className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                                        >
                                            Commander
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
