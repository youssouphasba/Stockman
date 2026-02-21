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
    Package
} from 'lucide-react';
import {
    products as productsApi,
    sales as salesApi,
    categories as categoriesApi,
    customers as customersApi,
    ai as aiApi
} from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import QuickCustomerModal from './QuickCustomerModal';
import DigitalReceiptModal from './DigitalReceiptModal';
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
    const [lastSale, setLastSale] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI Suggestions
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const suggestTimeout = useRef<any>(null);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [prodsRes, catsRes, custsRes] = await Promise.all([
                productsApi.list(undefined, 0, 500),
                categoriesApi.list(),
                customersApi.list()
            ]);
            setAllProducts((prodsRes.items || prodsRes));
            setCategoriesList(catsRes);
            setCustomersList(custsRes.items || custsRes);
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

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
    };

    const handleCheckout = async (method: string) => {
        if (cart.length === 0 || submitting) return;
        if (method === 'credit' && !selectedCustomer) {
            setError("Veuillez sélectionner un client pour une vente à crédit.");
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const saleData = {
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.selling_price
                })),
                total_amount: calculateTotal(),
                payment_method: method,
                customer_id: selectedCustomer?.customer_id
            };

            if (!navigator.onLine) {
                syncService.queueSale(saleData);
                setLastSale({ ...saleData, id: 'offline-' + Date.now(), items: cart, is_offline: true });
                setCart([]);
                setSelectedCustomer(null);
                setIsReceiptOpen(true);
                return;
            }

            const result = await salesApi.create(saleData);
            setLastSale({ ...result, items: cart });
            setCart([]);
            setSelectedCustomer(null);
            setIsReceiptOpen(true);

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
                    total_amount: calculateTotal(),
                    payment_method: method,
                    customer_id: selectedCustomer?.customer_id
                });
                setLastSale({ items: cart, total_amount: calculateTotal(), payment_method: method, is_offline: true });
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
                                            <p className="text-primary font-black text-xs">{formatCurrency(item.selling_price)}</p>
                                        </div>
                                        <button onClick={() => deleteFromCart(item.product_id)} className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={16} />
                                        </button>
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

                    {/* Footer / Summary */}
                    <div className="mt-auto pt-6 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <span className="text-3xl font-black text-white tracking-tighter italic">TOTAL</span>
                            <span className="text-4xl font-black text-white tracking-tighter">{calculateTotal()} F</span>
                        </div>

                        {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">{error}</p>}

                        <div className="grid grid-cols-3 gap-3" id="pos-checkout">
                            <button
                                onClick={() => handleCheckout('cash')}
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
            />
        </div>
    );
}
