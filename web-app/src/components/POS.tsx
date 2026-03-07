'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    User,
    CreditCard,
    Smartphone,
    Wallet,
    Scan,
    Sparkles,
    UserPlus,
    X,
    ChevronRight,
    CheckCircle,
    Package,
    Tag,
    RotateCcw
} from 'lucide-react';
import {
    products as productsApi,
    sales as salesApi,
    categories as categoriesApi,
    customers as customersApi,
    ai as aiApi,
    settings as settingsApi,
    userFeatures as userFeaturesApi,
    tables as tablesApi,
    restaurantOrders
} from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import QuickCustomerModal from './QuickCustomerModal';
import DigitalReceiptModal from './DigitalReceiptModal';
import OrderReturnModal from './OrderReturnModal';
import ChangeCalculatorModal from './ChangeCalculatorModal';
import LineDiscountModal from './LineDiscountModal';
import { syncService } from '../services/syncService';
import { WifiOff, HelpCircle } from 'lucide-react';
import ScreenGuide, { GuideStep } from './ScreenGuide';

export default function POS() {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [categoriesList, setCategoriesList] = useState<any[]>([]);
    const [customersList, setCustomersList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

    // Cart state
    const [cart, setCart] = useState<any[]>([]);

    // Modals & UI state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Discount state (cart-level)
    const [discountType, setDiscountType] = useState<'%' | 'F'>('F');
    const [discountValue, setDiscountValue] = useState<number>(0);

    // Change calculator & line discount modals
    const [showChangeCalc, setShowChangeCalc] = useState(false);
    const [showLineDiscount, setShowLineDiscount] = useState(false);
    const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);

    // Restaurant mode
    const [restaurantMode, setRestaurantMode] = useState(false);
    const [tableList, setTableList] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<any | null>(null);
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);
    const [loadingTableOrder, setLoadingTableOrder] = useState(false);
    const [covers, setCovers] = useState(1);
    const [tipPercent, setTipPercent] = useState(0);
    const [tipFixed, setTipFixed] = useState(0);
    const [tipType, setTipType] = useState<'percent' | 'fixed'>('percent');
    const [serviceChargePercent, setServiceChargePercent] = useState(0);
    const [orderNotes, setOrderNotes] = useState('');
    const [showRestaurantPanel, setShowRestaurantPanel] = useState(false);

    // Store settings (terminals + receipt info)
    const [storeSettings, setStoreSettings] = useState<any>(null);
    const [selectedTerminal, setSelectedTerminal] = useState<string>('');

    // Split payment
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [splitPayments, setSplitPayments] = useState([
        { method: 'cash', amount: 0 },
        { method: 'mobile_money', amount: 0 },
    ]);

    // AI Suggestions
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const suggestTimeout = useRef<any>(null);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [prodsRes, catsRes, custsRes, settingsRes, featuresRes, tablesRes] = await Promise.all([
                productsApi.list(undefined, 0, 500),
                categoriesApi.list(),
                customersApi.list(),
                settingsApi.get().catch(() => null),
                userFeaturesApi.get().catch(() => null),
                tablesApi.list().catch(() => [])
            ]);
            setAllProducts((prodsRes.items || prodsRes));
            setCategoriesList(catsRes);
            setCustomersList(custsRes.items || custsRes);
            if (settingsRes) {
                setStoreSettings(settingsRes);
                // Auto-select terminal if only one
                if (settingsRes.terminals?.length === 1) setSelectedTerminal(settingsRes.terminals[0]);
            }
            if (featuresRes?.is_restaurant || ['restaurant', 'traiteur'].includes(featuresRes?.sector || '')) {
                setRestaurantMode(true);
                setTableList(Array.isArray(tablesRes) ? tablesRes : []);
            }
        } catch (err) {
            console.error("Load error", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // Basket Suggestions Effect
    useEffect(() => {
        if (cart.length === 0) {
            setSuggestions([]);
            return;
        }
        if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
        suggestTimeout.current = setTimeout(async () => {
            try {
                const pids = cart.map(item => item.product_id);
                const result = await aiApi.basketSuggestions(pids);
                const cartPids = new Set(pids);
                // Filter out products already in cart and products with 0 stock
                setSuggestions((Array.isArray(result.suggestions) ? result.suggestions : []).filter((s: any) =>
                    !cartPids.has(s.product_id) &&
                    (Array.isArray(allProducts) ? allProducts : []).find(p => p.product_id === s.product_id)?.quantity > 0
                ));
            } catch (err) {
                // silent
            }
        }, 800);
        return () => { if (suggestTimeout.current) clearTimeout(suggestTimeout.current); };
    }, [cart, allProducts]);

    const addToCart = (product: any) => {
        if (product.quantity <= 0) return;
        setCart(current => {
            const existing = current.find(item => item.product_id === product.product_id);
            if (existing) {
                if (existing.quantity >= product.quantity) return current;
                return current.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...current, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(current => current.map(item => {
            if (item.product_id === productId) {
                return { ...item, quantity: Math.max(1, item.quantity - 1) };
            }
            return item;
        }));
    };

    const deleteFromCart = (productId: string) => {
        setCart(current => current.filter(item => item.product_id !== productId));
    };

    const applyLineDiscount = (productId: string, type: 'percentage' | 'fixed', value: number) => {
        setCart(current => current.map(item => {
            if (item.product_id !== productId) return item;
            const base = item._base_price || item.selling_price;
            const discounted = type === 'percentage'
                ? Math.round(base * (1 - Math.min(value, 100) / 100))
                : Math.max(0, base - value);
            return { ...item, _base_price: base, selling_price: discounted };
        }));
    };

    const calculateSubtotal = () =>
        cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);

    const calculateDiscount = () => {
        const sub = calculateSubtotal();
        if (discountType === '%') return Math.round(sub * Math.min(discountValue, 100) / 100);
        return Math.min(discountValue, sub);
    };

    const calculateTotal = () => Math.max(0, calculateSubtotal() - calculateDiscount());

    const calculateTipAmount = () => {
        const base = calculateTotal();
        if (tipType === 'percent') return Math.round(base * tipPercent / 100);
        return tipFixed;
    };

    const calculateServiceCharge = () => {
        const base = calculateTotal();
        return Math.round(base * serviceChargePercent / 100);
    };

    const calculateGrandTotal = () => {
        return calculateTotal() + calculateTipAmount() + calculateServiceCharge();
    };

    const handleSplitCheckout = async () => {
        const total = calculateGrandTotal();
        const paid = splitPayments.reduce((s, p) => s + (p.amount || 0), 0);
        if (Math.abs(paid - total) > 0.01) {
            setError(`Les paiements (${paid}) ne couvrent pas le total (${total})`);
            return;
        }
        await handleCheckout(splitPayments[0].method, splitPayments);
    };

    const handleCheckout = async (method: string, payments?: { method: string; amount: number }[]) => {
        if (cart.length === 0 || submitting) return;
        if (method === 'credit' && !selectedCustomer) {
            setError("Veuillez sélectionner un client pour une vente à crédit.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const discountAmount = calculateDiscount();

            let result: any;
            if (restaurantMode && openOrderId) {
                // Finalize an existing open table order
                result = await restaurantOrders.finalize(openOrderId, {
                    payment_method: method,
                    payments: payments && payments.length > 1 ? payments : undefined,
                    tip_amount: calculateTipAmount() || undefined,
                    discount_amount: discountAmount || undefined,
                    service_charge_percent: serviceChargePercent || undefined,
                    covers: covers > 1 ? covers : undefined,
                });
            } else {
                const saleData: any = {
                    items: cart.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: item.selling_price
                    })),
                    total_amount: calculateGrandTotal(),
                    discount_amount: discountAmount,
                    payment_method: method,
                    customer_id: selectedCustomer?.customer_id,
                    terminal_id: selectedTerminal || undefined,
                    table_id: selectedTable?.table_id,
                    covers: covers > 1 ? covers : undefined,
                    tip_amount: calculateTipAmount(),
                    service_charge_percent: serviceChargePercent,
                    notes: orderNotes || undefined,
                };
                if (payments && payments.length > 1) saleData.payments = payments;

                if (!navigator.onLine) {
                    syncService.queueSale(saleData);
                    setLastSale({ ...saleData, id: 'offline-' + Date.now(), items: cart, is_offline: true });
                    setCart([]);
                    setSelectedCustomer(null);
                    setIsReceiptOpen(true);
                    return;
                }

                result = await salesApi.create(saleData);
            }
            setLastSale({ ...result, items: cart });
            setCart([]);
            setOpenOrderId(null);
            setSelectedCustomer(null);
            setDiscountValue(0);
            setIsSplitPayment(false);
            setSplitPayments([{ method: 'cash', amount: 0 }, { method: 'mobile_money', amount: 0 }]);
            setSelectedTable(null);
            setCovers(1);
            setTipPercent(0);
            setTipFixed(0);
            setServiceChargePercent(0);
            setOrderNotes('');
            setIsReceiptOpen(true);
            // Refresh table list to reflect freed table
            if (restaurantMode) tablesApi.list().then(res => setTableList(Array.isArray(res) ? res : [])).catch(() => {});

            // Refresh products
            const prodsRes = await productsApi.list(undefined, 0, 500);
            setAllProducts(prodsRes.items || prodsRes);
        } catch (err: any) {
            if (!navigator.onLine) {
                // Fallback if network dropped exactly during call
                syncService.queueSale({
                    items: cart.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: item.selling_price
                    })),
                    total_amount: calculateGrandTotal(),
                    payment_method: method,
                    customer_id: selectedCustomer?.customer_id
                });
                setLastSale({ items: cart, total_amount: calculateGrandTotal(), payment_method: method, is_offline: true });
                setCart([]);
                setIsReceiptOpen(true);
            } else {
                setError(err?.message || "Erreur lors de la validation");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleBarcodeScanned = (sku: string) => {
        const product = (Array.isArray(allProducts) ? allProducts : []).find(p => p.sku === sku);
        if (product) {
            addToCart(product);
        }
    };

    const handleTableSelect = async (tableId: string) => {
        const table = tableList.find(t => t.table_id === tableId) || null;
        setSelectedTable(table);
        setOpenOrderId(null);
        setCart([]);
        if (!table) return;
        if (table.status === 'occupied' && table.current_sale_id) {
            setLoadingTableOrder(true);
            try {
                const order = await restaurantOrders.getTableOrder(table.table_id);
                if (order && order.items?.length > 0) {
                    // Map server items back to cart format
                    const cartItems = order.items.map((item: any) => {
                        const prod = allProducts.find(p => p.product_id === item.product_id);
                        return {
                            product_id: item.product_id,
                            name: item.product_name || prod?.name || item.product_id,
                            selling_price: item.price,
                            quantity: item.quantity,
                            image: prod?.image,
                        };
                    });
                    setCart(cartItems);
                    setOpenOrderId(order.sale_id);
                    if (order.covers) setCovers(order.covers);
                }
            } catch {
                // Table occupied but no open order found — just proceed with empty cart
            } finally {
                setLoadingTableOrder(false);
            }
        }
    };

    const filteredProducts = (Array.isArray(allProducts) ? allProducts : []).filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const posSteps: GuideStep[] = [
        {
            title: "Bienvenue au POS",
            content: "C'est ici que vous effectuez vos ventes rapidement.",
            position: "center"
        },
        {
            title: "Recherche & Scan",
            content: "Recherchez un produit par son nom ou utilisez le scanner de code-barres pour aller plus vite.",
            targetId: "pos-search"
        },
        {
            title: "Gestion du Panier",
            content: "Vos articles s'affichent ici. Vous pouvez ajuster les quantités ou supprimer des produits.",
            targetId: "pos-cart"
        },
        {
            title: "Paiement & Validation",
            content: "Choisissez le mode de paiement (Cash, Mobile, Crédit) pour finaliser la vente.",
            targetId: "pos-checkout"
        }
    ];

    if (loading && allProducts.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden bg-slate-950">
            <ScreenGuide guideKey="pos_tour" steps={posSteps} />
            {/* Products Column */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
                <header className="mb-6 flex gap-4 items-center">
                    <div className="flex-1 relative" id="pos-search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Rechercher ou scanner un produit..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm font-medium"
                        />
                    </div>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="p-4 glass-card text-primary hover:bg-white/10 transition-colors"
                        title="Scanner Code-barres"
                    >
                        <Scan size={24} />
                    </button>
                </header>

                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 custom-scrollbar no-scrollbar">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-6 py-2 rounded-xl whitespace-nowrap transition-all font-black text-xs uppercase tracking-widest ${!selectedCategory ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}
                    >
                        Tous
                    </button>
                    {(Array.isArray(categoriesList) ? categoriesList : []).map(cat => (
                        <button
                            key={cat.category_id}
                            onClick={() => setSelectedCategory(cat.category_id)}
                            className={`px-6 py-2 rounded-xl whitespace-nowrap transition-all font-black text-xs uppercase tracking-widest ${selectedCategory === cat.category_id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        {filteredProducts.map((p) => (
                            <button
                                key={p.product_id}
                                onClick={() => addToCart(p)}
                                disabled={p.quantity <= 0}
                                className={`glass-card p-4 flex flex-col h-full hover:border-primary/50 hover:bg-white/5 transition-all text-left relative overflow-hidden group ${p.quantity <= 0 ? 'opacity-40 grayscale' : ''}`}
                            >
                                <div className="aspect-square rounded-xl bg-white/5 mb-3 flex items-center justify-center overflow-hidden">
                                    {p.image ? (
                                        <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                    ) : (
                                        <div className="text-3xl font-black text-white/10">{p.name.charAt(0)}</div>
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{p.name}</h3>
                                <div className="flex justify-between items-end mt-auto">
                                    <span className="text-primary font-black text-base">{formatCurrency(p.selling_price)}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.quantity < 5 ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-slate-500'}`}>
                                        {p.quantity} en stock
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Column */}
            <div className="hidden lg:flex w-[450px] bg-white/[0.02] border-l border-white/10 flex-col p-6 backdrop-blur-3xl" id="pos-cart">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-3">
                            <ShoppingCart className="text-primary" />
                            PANIER
                        </h2>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest bg-rose-400/10 px-3 py-1 rounded-full">
                                Vider
                            </button>
                        )}
                    </div>

                    {/* Customer Section */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 group relative">
                        {selectedCustomer ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <User size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-bold text-sm">{selectedCustomer.name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{selectedCustomer.phone || 'Sans téléphone'}</p>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/10 rounded-lg text-slate-500">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-transparent text-white font-bold outline-none text-xs appearance-none cursor-pointer"
                                    onChange={(e) => setSelectedCustomer(customersList.find(c => c.customer_id === e.target.value) || null)}
                                    value={selectedCustomer?.customer_id || ''}
                                >
                                    <option value="" className="bg-slate-900">Client Anonyme</option>
                                    {customersList.map(c => (
                                        <option key={c.customer_id} value={c.customer_id} className="bg-slate-900">{c.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setIsCustomerModalOpen(true)}
                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors border border-primary/20"
                                >
                                    <UserPlus size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar space-y-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-50">
                                <ShoppingCart size={64} strokeWidth={1} className="mb-4" />
                                <p className="font-black text-xs uppercase tracking-widest">Le panier est vide</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.product_id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-3 group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm leading-tight">{item.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-primary font-black text-xs">{formatCurrency(item.selling_price)}</p>
                                                {item._base_price && item._base_price !== item.selling_price && (
                                                    <p className="text-slate-500 line-through text-[10px]">{formatCurrency(item._base_price)}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => { setSelectedCartItemId(item.product_id); setShowLineDiscount(true); }}
                                                className="p-1 text-slate-500 hover:text-amber-400 transition-colors" title="Remise ligne">
                                                <Tag size={14} />
                                            </button>
                                            <button onClick={() => deleteFromCart(item.product_id)} className="p-1 text-slate-600 hover:text-rose-400 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-black/20 rounded-xl p-1 border border-white/5">
                                        <button onClick={() => removeFromCart(item.product_id)} className="p-2 hover:bg-white/5 rounded-lg text-white">
                                            <Minus size={14} />
                                        </button>
                                        <span className="text-white font-black text-sm">{item.quantity}</span>
                                        <button onClick={() => addToCart(item)} className="p-2 hover:bg-white/5 rounded-lg text-white">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* AI Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-1">
                                <Sparkles size={12} /> Suggeré pour vous
                            </h4>
                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {suggestions.map((s: any) => (
                                    <button
                                        key={s.product_id}
                                        onClick={() => addToCart(allProducts.find(p => p.product_id === s.product_id))}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 min-w-[140px] text-left hover:bg-white/10 transition-all group"
                                    >
                                        <p className="text-white font-bold text-[10px] line-clamp-1">{s.name}</p>
                                        <p className="text-primary font-black text-xs">{formatCurrency(s.selling_price)}</p>
                                        <div className="mt-1 flex justify-between items-center">
                                            <span className="text-[8px] text-slate-500 font-medium">IA Suggest</span>
                                            <Plus size={12} className="text-primary opacity-0 group-hover:opacity-100" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Terminal selector */}
                    {storeSettings?.terminals?.length > 1 && (
                        <div className="mb-2 flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                            <span className="text-xs text-slate-400 font-medium shrink-0">Caisse</span>
                            <select
                                value={selectedTerminal}
                                onChange={e => setSelectedTerminal(e.target.value)}
                                className="ml-auto bg-transparent text-white font-bold text-xs outline-none"
                            >
                                <option value="" className="bg-slate-900">— Sélectionner —</option>
                                {storeSettings.terminals.map((t: string) => (
                                    <option key={t} value={t} className="bg-slate-900">{t}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Restaurant Options Panel */}
                    {restaurantMode && (
                        <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">Options Restaurant</span>
                            </div>

                            {/* Table selector */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 flex items-center gap-1">
                                    Table
                                    {loadingTableOrder && <span className="text-[10px] text-primary animate-pulse">Chargement commande…</span>}
                                    {openOrderId && <span className="text-[10px] text-amber-400 font-bold">• Commande ouverte</span>}
                                </label>
                                <select
                                    value={selectedTable?.table_id || ''}
                                    onChange={e => handleTableSelect(e.target.value)}
                                    className="bg-[#0F172A] border border-white/10 rounded-xl p-2.5 text-white text-sm outline-none"
                                >
                                    <option value="">— Sans table —</option>
                                    {tableList.map(t => (
                                        <option key={t.table_id} value={t.table_id}>
                                            {t.name} ({t.capacity} pers.) {t.status === 'occupied' ? '🔴' : t.status === 'reserved' ? '🔵' : '🟢'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Covers */}
                            <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-400 flex-1">Couverts</label>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setCovers(c => Math.max(1, c - 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">-</button>
                                    <span className="text-white font-bold w-6 text-center">{covers}</span>
                                    <button onClick={() => setCovers(c => c + 1)} className="w-7 h-7 rounded-lg bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">+</button>
                                </div>
                            </div>

                            {/* Service charge */}
                            <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-400 flex-1">Service (%)</label>
                                <select value={serviceChargePercent} onChange={e => setServiceChargePercent(Number(e.target.value))} className="bg-[#0F172A] border border-white/10 rounded-lg p-1.5 text-white text-xs outline-none w-20">
                                    <option value={0}>0%</option>
                                    <option value={5}>5%</option>
                                    <option value={10}>10%</option>
                                    <option value={15}>15%</option>
                                </select>
                            </div>

                            {/* Tip */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400">Pourboire</label>
                                <div className="flex gap-1">
                                    {[0, 5, 10, 15].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => { setTipType('percent'); setTipPercent(p); setTipFixed(0); }}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${tipType === 'percent' && tipPercent === p ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'}`}
                                        >{p}%</button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400">Notes cuisine</label>
                                <input
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                    placeholder="Sans gluten, allergie arachide..."
                                    className="bg-white/5 border border-white/10 rounded-xl p-2 text-white text-xs outline-none"
                                />
                            </div>

                            {/* Total breakdown */}
                            {(serviceChargePercent > 0 || (tipType === 'percent' ? tipPercent > 0 : tipFixed > 0)) && (
                                <div className="pt-2 border-t border-white/10 space-y-1">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Sous-total</span><span>{calculateTotal().toLocaleString()}</span>
                                    </div>
                                    {serviceChargePercent > 0 && (
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Service ({serviceChargePercent}%)</span><span>+{calculateServiceCharge().toLocaleString()}</span>
                                        </div>
                                    )}
                                    {calculateTipAmount() > 0 && (
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Pourboire</span><span>+{calculateTipAmount().toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-bold text-white pt-1">
                                        <span>Total final</span><span>{calculateGrandTotal().toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer / Summary */}
                    <div className="mt-auto pt-6 border-t border-white/10 space-y-4">

                        {/* Discount row */}
                        {cart.length > 0 && (
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                                <Tag size={14} className="text-slate-500 shrink-0" />
                                <span className="text-xs text-slate-400 font-medium">Remise</span>
                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setDiscountType(t => t === '%' ? 'F' : '%'); setDiscountValue(0); }}
                                        className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 w-6 text-center"
                                    >
                                        {discountType}
                                    </button>
                                    <input
                                        type="number"
                                        min={0}
                                        max={discountType === '%' ? 100 : undefined}
                                        value={discountValue || ''}
                                        onChange={e => setDiscountValue(Math.max(0, Number(e.target.value)))}
                                        placeholder="0"
                                        className="w-20 bg-transparent text-white font-black text-sm outline-none text-right"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <span className="text-3xl font-black text-white tracking-tighter italic">TOTAL</span>
                            <div className="text-right">
                                {calculateDiscount() > 0 && (
                                    <p className="text-xs text-slate-500 line-through">{formatCurrency(calculateSubtotal())}</p>
                                )}
                                <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(calculateGrandTotal())}</span>
                                {calculateDiscount() > 0 && (
                                    <p className="text-xs text-rose-400 font-bold">-{formatCurrency(calculateDiscount())} remise</p>
                                )}
                            </div>
                        </div>

                        {/* Return button for last sale */}
                        {lastSale && cart.length === 0 && (
                            <button
                                onClick={() => setIsReturnModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                            >
                                <RotateCcw size={14} /> Retour sur dernière vente
                            </button>
                        )}

                        {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

                        {/* Restaurant: Send to kitchen (open order) */}
                        {restaurantMode && cart.length > 0 && (
                            <button
                                onClick={async () => {
                                    if (submitting) return;
                                    setSubmitting(true);
                                    setError(null);
                                    try {
                                        const items = cart.map(item => ({
                                            product_id: item.product_id,
                                            quantity: item.quantity,
                                            price: item.selling_price,
                                        }));
                                        if (openOrderId) {
                                            await restaurantOrders.addItems(openOrderId, items);
                                        } else {
                                            const order = await restaurantOrders.openOrder({
                                                table_id: selectedTable?.table_id,
                                                covers,
                                                items,
                                                notes: orderNotes || undefined,
                                                service_type: selectedTable ? 'dine_in' : 'takeaway',
                                            });
                                            setOpenOrderId(order.sale_id);
                                            // Refresh table list to show table as occupied
                                            tablesApi.list().then(res => setTableList(Array.isArray(res) ? res : [])).catch(() => {});
                                        }
                                        // Keep cart open for adding more items
                                    } catch (err: any) {
                                        setError(err?.message || 'Erreur envoi cuisine');
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                                disabled={submitting}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500/20 border border-orange-500/40 text-orange-300 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-orange-500/30 transition-all disabled:opacity-50"
                            >
                                🍽️ {openOrderId ? 'Ajouter à la commande' : 'Envoyer en cuisine'}
                            </button>
                        )}

                        {isSplitPayment ? (
                            <div className="space-y-3" id="pos-checkout">
                                {splitPayments.map((sp, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <select
                                            value={sp.method}
                                            onChange={e => setSplitPayments(prev => prev.map((p, i) => i === idx ? { ...p, method: e.target.value } : p))}
                                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none flex-1"
                                        >
                                            <option value="cash" className="bg-slate-900">Cash</option>
                                            <option value="mobile_money" className="bg-slate-900">Mobile Money</option>
                                            <option value="card" className="bg-slate-900">Carte</option>
                                        </select>
                                        <input
                                            type="number"
                                            min={0}
                                            value={sp.amount || ''}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                setSplitPayments(prev => {
                                                    const next = [...prev];
                                                    next[idx] = { ...next[idx], amount: val };
                                                    // Auto-fill other with remainder
                                                    if (prev.length === 2) {
                                                        const other = idx === 0 ? 1 : 0;
                                                        next[other] = { ...next[other], amount: Math.max(0, calculateGrandTotal() - val) };
                                                    }
                                                    return next;
                                                });
                                            }}
                                            placeholder="Montant"
                                            className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-black text-sm outline-none text-right"
                                        />
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsSplitPayment(false)}
                                        className="flex-1 py-2 text-xs font-bold text-slate-400 bg-white/5 rounded-xl border border-white/10"
                                    >Annuler</button>
                                    <button
                                        onClick={handleSplitCheckout}
                                        disabled={submitting}
                                        className="flex-1 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
                                    >{submitting ? '...' : 'Confirmer'}</button>
                                </div>
                            </div>
                        ) : (
                        <div className="space-y-3" id="pos-checkout">
                            <div className="grid grid-cols-3 gap-3">
                                <button
                                    onClick={() => cart.length > 0 && setShowChangeCalc(true)}
                                    disabled={cart.length === 0 || submitting}
                                    className="flex flex-col items-center gap-2 p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 group shadow-lg shadow-emerald-500/10"
                                >
                                    <Wallet size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cash</span>
                                </button>
                                <button
                                    onClick={() => handleCheckout('mobile_money')}
                                    disabled={cart.length === 0 || submitting}
                                    className="flex flex-col items-center gap-2 p-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all disabled:opacity-50 group shadow-lg shadow-amber-500/10"
                                >
                                    <Smartphone size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mobile</span>
                                </button>
                                <button
                                    onClick={() => handleCheckout('credit')}
                                    disabled={cart.length === 0 || submitting}
                                    className="flex flex-col items-center gap-2 p-4 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 transition-all disabled:opacity-50 group shadow-lg shadow-indigo-500/10"
                                >
                                    <CreditCard size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Crédit</span>
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    setSplitPayments([{ method: 'cash', amount: 0 }, { method: 'mobile_money', amount: calculateGrandTotal() }]);
                                    setIsSplitPayment(true);
                                }}
                                disabled={cart.length === 0}
                                className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-30"
                            >
                                ⇄ Paiement partagé
                            </button>
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isScannerOpen && (
                <BarcodeScanner
                    onScan={handleBarcodeScanned}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            <QuickCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSuccess={(cust) => {
                    setCustomersList([...customersList, cust]);
                    setSelectedCustomer(cust);
                }}
            />

            <DigitalReceiptModal
                isOpen={isReceiptOpen}
                onClose={() => setIsReceiptOpen(false)}
                sale={lastSale}
                businessInfo={{
                    name: storeSettings?.receipt_business_name,
                    footer: storeSettings?.receipt_footer,
                }}
            />

            <OrderReturnModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                order={lastSale}
                onSuccess={() => setIsReturnModalOpen(false)}
            />

            <ChangeCalculatorModal
                isOpen={showChangeCalc}
                onClose={() => setShowChangeCalc(false)}
                totalAmount={calculateGrandTotal()}
                onConfirm={() => handleCheckout('cash')}
            />

            <LineDiscountModal
                isOpen={showLineDiscount}
                onClose={() => { setShowLineDiscount(false); setSelectedCartItemId(null); }}
                productName={cart.find(i => i.product_id === selectedCartItemId)?.name || ''}
                currentPrice={cart.find(i => i.product_id === selectedCartItemId)?._base_price || cart.find(i => i.product_id === selectedCartItemId)?.selling_price || 0}
                onApply={(type, val) => { if (selectedCartItemId) applyLineDiscount(selectedCartItemId, type, val); }}
            />
        </div>
    );
}
