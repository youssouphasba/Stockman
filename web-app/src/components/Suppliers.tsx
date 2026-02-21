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
import {
    marketplace as marketplaceApi,
    suppliers as suppliersApi,
    supplier_orders as ordersApi,
    replenishment as replenishmentApi,
    products as productsApi
} from '../services/api';

type TabType = 'manual' | 'orders' | 'replenishment' | 'marketplace';

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
        items: [] as any[],
        notes: '',
        expected_delivery: ''
    });
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showSupplierDetails, setShowSupplierDetails] = useState(false);
    const [supplierTab, setSupplierTab] = useState<'perf' | 'logs' | 'invoices'>('perf');
    const [partialItems, setPartialItems] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const handleWhatsApp = (phone?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^\d]/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
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
                setMarketplaceSuppliers(res);
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
            await ordersApi.create(orderForm);
            setSuccess("Bon de commande créé avec succès !");
            setShowOrderModal(false);
            setOrderForm({ supplier_id: '', items: [], notes: '', expected_delivery: '' });
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
            await ordersApi.receivePartial(orderId, partialItems);
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
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.city?.toLowerCase().includes(search.toLowerCase())
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
                            onClick={() => setShowOrderModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Nouvelle Commande
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
                                            <button className="text-slate-500 hover:text-white p-2">
                                                <MoreVertical size={20} />
                                            </button>
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
                                                onClick={() => { setSelectedSupplier(s); setShowSupplierDetails(true); }}
                                                className="flex-1 py-2 rounded-lg bg-white/5 text-slate-300 text-sm font-bold hover:bg-white/10 transition-colors"
                                            >
                                                Détails
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOrderForm({ ...orderForm, supplier_id: s.supplier_id });
                                                    setShowOrderModal(true);
                                                }}
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
                                                onClick={() => { setSelectedOrder(o); setShowOrderDetails(true); }}
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
                            <button className="btn-primary bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2">
                                <RefreshCcw size={18} />
                                Tout Automatiser
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
                                                    setOrderForm({
                                                        ...orderForm,
                                                        supplier_id: supplier?.supplier_id || '',
                                                        items: [{
                                                            product_id: s.product_id,
                                                            name: s.product_name,
                                                            quantity: s.suggested_quantity,
                                                            price: 0 // Will be filled by user
                                                        }]
                                                    });
                                                    setShowOrderModal(true);
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
                            <button className="px-6 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white flex items-center gap-2 transition-all">
                                <FilterIcon size={20} />
                                <span>Région</span>
                            </button>
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

                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Catalogue</span>
                                                <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
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
                                    <select
                                        required
                                        value={orderForm.supplier_id}
                                        onChange={e => setOrderForm({ ...orderForm, supplier_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 outline-none"
                                    >
                                        <option value="" className="bg-slate-800">Sélectionner...</option>
                                        {manualSuppliers.map(s => <option key={s.supplier_id} value={s.supplier_id} className="bg-slate-800">{s.name}</option>)}
                                    </select>
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
                                                const product = allProducts.find(p => p.product_id === prodId);
                                                if (product) {
                                                    const existing = orderForm.items.find(i => i.product_id === prodId);
                                                    if (existing) {
                                                        setOrderForm({
                                                            ...orderForm,
                                                            items: orderForm.items.map(i => i.product_id === prodId ? { ...i, quantity: i.quantity + 1 } : i)
                                                        });
                                                    } else {
                                                        setOrderForm({
                                                            ...orderForm,
                                                            items: [...orderForm.items, {
                                                                product_id: product.product_id,
                                                                name: product.name,
                                                                quantity: 1,
                                                                price: product.cost_price || 0
                                                            }]
                                                        });
                                                    }
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">Ajouter un produit...</option>
                                            {allProducts.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-6 flex items-end">
                                        <p className="text-xs text-slate-500 italic">Sélectionnez un produit pour l'ajouter à la liste.</p>
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
                                                    value={item.price}
                                                    onChange={e => setOrderForm({
                                                        ...orderForm,
                                                        items: orderForm.items.map((it, i) => i === idx ? { ...it, price: parseInt(e.target.value) || 0 } : it)
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
                                    Total: <span className="text-white font-bold">{orderForm.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()} F</span>
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
            {selectedOrder && showOrderDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0F172A] border-l border-white/10 h-full w-full max-w-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    Bon de Commande #{selectedOrder.order_id.substring(0, 8)}
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(selectedOrder.status)}`}>
                                        {selectedOrder.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </h2>
                                <p className="text-slate-500 mt-1">Fournisseur : <span className="text-white">{selectedOrder.supplier_name}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => generateOrderPDF(selectedOrder)}
                                    className="p-2 text-primary hover:text-white bg-primary/10 rounded-xl transition-all"
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
                                        onClick={() => handleUpdateOrderStatus(selectedOrder.order_id, 'delivered')}
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
                                            {selectedOrder.items?.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 font-bold text-white">{item.product_name}</td>
                                                    <td className="px-4 py-3 text-center text-slate-400">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-center text-emerald-400 font-bold">{item.received_quantity || 0}</td>
                                                    <td className="px-4 py-3 text-right text-white ">{item.price.toLocaleString()} F</td>
                                                </tr>
                                            ))}
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
                                            const remaining = item.quantity - (item.received_quantity || 0);
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
                                                                    const filter = prev.filter(p => p.product_id !== item.product_id);
                                                                    if (val > 0) return [...filter, { product_id: item.product_id, quantity: val }];
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
                                Journal de Bord
                            </button>
                            <button
                                onClick={() => setSupplierTab('invoices')}
                                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${supplierTab === 'invoices' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                Factures
                            </button>
                        </div>

                        {supplierTab === 'perf' ? (
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
                            <button
                                onClick={() => handleWhatsApp(selectedSupplier.phone)}
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
        </div>
    );
}
