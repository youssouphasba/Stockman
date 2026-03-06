import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
} from 'react-native';
import Constants from 'expo-constants';
import DigitalReceiptModal from '../../components/DigitalReceiptModal';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import BarcodeScanner from '../../components/BarcodeScanner';
import {
    products as productsApi,
    sales as salesApi,
    customers as customersApi,
    stores as storesApi,
    ai as aiApi,
    tables,
    kitchen,
    userFeatures,
    Product,
    Sale,
    Customer,
    Store,
    BasketSuggestion,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency, formatUserCurrency, getCurrencySymbol, formatNumber } from '../../utils/format';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isMobile = screenWidth < 768;

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChangeCalculatorModal from '../../components/ChangeCalculatorModal';
import LineDiscountModal from '../../components/LineDiscountModal';

export type CartItem = {
    product: Product;
    quantity: number;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
};

export type POSSession = {
    id: string;
    cart: CartItem[];
    selectedCustomer: Customer | null;
    name: string;
};

export default function POSScreen() {
    const { colors, glassStyle } = useTheme();
    const { t } = useTranslation();
    const styles = getStyles(colors, glassStyle);
    const { user, hasPermission } = useAuth();
    const insets = useSafeAreaInsets();
    const canWrite = hasPermission('pos', 'write');
    const [productList, setProductList] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Multi-sessions (Tabs)
    const [sessions, setSessions] = useState<POSSession[]>([
        { id: '1', cart: [], selectedCustomer: null, name: 'Client 1' }
    ]);
    const [activeSessionId, setActiveSessionId] = useState('1');

    // Deriving current session data
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const cart = activeSession.cart;
    const selectedCustomer = activeSession.selectedCustomer;

    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [continuousScan, setContinuousScan] = useState(false);
    const [showProductList, setShowProductList] = useState(!isMobile); // Hidden by default on mobile

    // Modals
    const [showCalculator, setShowCalculator] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);

    // Quick Customer Creation
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [createCustomerLoading, setCreateCustomerLoading] = useState(false);

    // Basket suggestions
    const [basketSuggestions, setBasketSuggestions] = useState<BasketSuggestion[]>([]);

    // Fetch basket suggestions when cart changes
    const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (cart.length === 0) {
            setBasketSuggestions([]);
            return;
        }
        if (suggestTimeout.current) clearTimeout(suggestTimeout.current);
        suggestTimeout.current = setTimeout(async () => {
            try {
                const pids = cart.map(c => c.product.product_id);
                const result = await aiApi.basketSuggestions(pids);
                // Filter out products already in cart
                const cartPids = new Set(pids);
                setBasketSuggestions((result.suggestions || []).filter(s => !cartPids.has(s.product_id)));
            } catch {
                // silent
            }
        }, 500);
        return () => { if (suggestTimeout.current) clearTimeout(suggestTimeout.current); };
    }, [cart]);

    // Digital Receipt
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [currentStore, setCurrentStore] = useState<Store | null>(null);

    // Terminal selection (enterprise)
    const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
    const [showTerminalModal, setShowTerminalModal] = useState(false);
    const terminalSelectedRef = useRef(false);

    // Restaurant mode
    const [restaurantMode, setRestaurantMode] = useState(false);
    const [tableList, setTableList] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<any | null>(null);
    const [covers, setCovers] = useState(1);
    const [tipPercent, setTipPercent] = useState(0);
    const [serviceChargePercent, setServiceChargePercent] = useState(0);
    const [orderNotes, setOrderNotes] = useState('');
    const [showTableModal, setShowTableModal] = useState(false);
    const [showRestaurantOptions, setShowRestaurantOptions] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [prodsRes, custsRes, storesRes] = await Promise.all([
                productsApi.list(undefined, 0, 500),
                customersApi.list(),
                storesApi.list(),
            ]);
            const prods = prodsRes.items ?? prodsRes as any;
            const custs = custsRes.items ?? custsRes as any;
            const stores = storesRes as any;

            setProductList(prods.filter((p: any) => p.is_active));
            setCustomerList(custs);

            if (user?.active_store_id) {
                const active = stores.find((s: any) => s.store_id === user.active_store_id);
                if (active) {
                    setCurrentStore(active);
                    if (user?.plan === 'enterprise' && (active.terminals || []).length > 1 && !terminalSelectedRef.current) {
                        setShowTerminalModal(true);
                    }
                }
            }

            const features = await userFeatures.get().catch(() => null);
            if (features?.has_production && ['restaurant', 'traiteur'].includes(features?.sector || '')) {
                setRestaurantMode(true);
                const tabs = await tables.list().catch(() => []);
                setTableList(tabs);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const filteredProducts = useMemo(() => {
        return productList.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
        );
    }, [productList, search]);

    const updateActiveSession = (updater: (s: POSSession) => POSSession) => {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? updater(s) : s));
    };

    const addToCart = (product: Product) => {
        const existing = cart.find(item => item.product.product_id === product.product_id);
        const currentQtyInCart = existing ? existing.quantity : 0;

        if (currentQtyInCart + 1 > product.quantity) {
            Alert.alert(t('pos.insufficient_stock'), t('pos.not_enough_stock_detail', { qty: product.quantity, unit: product.unit, name: product.name }));
            return;
        }

        updateActiveSession(s => {
            const existingInSession = s.cart.find(item => item.product.product_id === product.product_id);
            if (existingInSession) {
                return {
                    ...s,
                    cart: s.cart.map(item =>
                        item.product.product_id === product.product_id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    )
                };
            }
            return {
                ...s,
                cart: [...s.cart, { product, quantity: 1 }]
            };
        });
    };

    const removeFromCart = (productId: string) => {
        updateActiveSession(s => ({
            ...s,
            cart: s.cart.filter(item => item.product.product_id !== productId)
        }));
    };

    const updateQuantity = (productId: string, delta: number) => {
        const item = cart.find(i => i.product.product_id === productId);
        if (!item) return;

        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.product.quantity) {
            Alert.alert(t('pos.insufficient_stock'), t('pos.not_enough_stock_detail', { qty: item.product.quantity, unit: item.product.unit, name: item.product.name }));
            return;
        }

        updateActiveSession(s => ({
            ...s,
            cart: s.cart.map(i => i.product.product_id === productId ? { ...i, quantity: newQty } : i)
        }));
    };

    const applyDiscount = (productId: string, type: 'percentage' | 'fixed', value: number) => {
        updateActiveSession(s => ({
            ...s,
            cart: s.cart.map(i => i.product.product_id === productId ? { ...i, discountType: type, discountValue: value } : i)
        }));
    };

    const addSession = () => {
        if (sessions.length >= 5) {
            Alert.alert(t('pos.max_sessions_reached'));
            return;
        }
        const newId = Date.now().toString();
        const newSession: POSSession = {
            id: newId,
            cart: [],
            selectedCustomer: null,
            name: `${t('pos.client')} ${sessions.length + 1}`
        };
        setSessions(prev => [...prev, newSession]);
        setActiveSessionId(newId);
    };

    const removeSession = (id: string) => {
        if (sessions.length === 1) return;
        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id);
            if (id === activeSessionId) {
                setActiveSessionId(filtered[0].id);
            }
            return filtered;
        });
    };

    const total = useMemo(() => {
        return cart.reduce((acc, item) => {
            let itemPrice = item.product.selling_price;
            if (item.discountType === 'percentage' && item.discountValue) {
                itemPrice = itemPrice * (1 - item.discountValue / 100);
            } else if (item.discountType === 'fixed' && item.discountValue) {
                itemPrice = Math.max(0, itemPrice - item.discountValue);
            }
            return acc + (itemPrice * item.quantity);
        }, 0);
    }, [cart]);

    const calculateTipAmount = () => Math.round(total * tipPercent / 100);
    const calculateServiceCharge = () => Math.round(total * serviceChargePercent / 100);
    const calculateGrandTotal = () => total + calculateTipAmount() + calculateServiceCharge();

    const processCheckout = async (method: string) => {
        try {
            setCheckoutLoading(true);
            const items = cart.map(item => {
                let unitPrice = item.product.selling_price;
                if (item.discountType === 'percentage' && item.discountValue) {
                    unitPrice = unitPrice * (1 - item.discountValue / 100);
                } else if (item.discountType === 'fixed' && item.discountValue) {
                    unitPrice = Math.max(0, unitPrice - item.discountValue);
                }
                const discount_amount = (item.product.selling_price - unitPrice) * item.quantity;

                return {
                    product_id: item.product.product_id,
                    quantity: item.quantity,
                    discount_amount: Math.round(discount_amount * 100) / 100
                };
            });

            const result = await salesApi.create({
                items,
                payment_method: method,
                customer_id: selectedCustomer?.customer_id,
                terminal_id: selectedTerminal || undefined,
                table_id: selectedTable?.table_id,
                covers: covers > 1 ? covers : undefined,
                tip_amount: calculateTipAmount(),
                service_charge_percent: serviceChargePercent,
                notes: orderNotes || undefined,
                total_amount: calculateGrandTotal(),
            });

            if (method === 'credit') {
                if (Platform.OS === 'web') {
                    window.alert(t('pos.credit_success'));
                } else {
                    Alert.alert(t('common.success'), t('pos.credit_success'));
                }
            }

            setLastSale({
                ...result,
                customer_name: selectedCustomer?.name || t('pos.anonymous_customer')
            });
            setShowReceiptModal(true);

            updateActiveSession(s => ({
                ...s,
                cart: [],
                selectedCustomer: null
            }));
            setSelectedTable(null);
            setCovers(1);
            setTipPercent(0);
            setServiceChargePercent(0);
            setOrderNotes('');
            await loadData();
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(error.message || t('pos.error_save_sale'));
            } else {
                Alert.alert(t('common.error'), error.message || t('pos.error_save_sale'));
            }
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleCheckout = async (method: string) => {
        if (cart.length === 0) return;

        if (method === 'credit' && !selectedCustomer) {
            if (Platform.OS === 'web') {
                window.alert(t('pos.select_customer_credit'));
            } else {
                Alert.alert(t('common.error'), t('pos.select_customer_credit'));
            }
            return;
        }

        if (method === 'credit' && selectedCustomer) {
            const newDebt = selectedCustomer.current_debt + total;
            if (Platform.OS === 'web') {
                if (window.confirm(
                    `${t('pos.credit_confirmation_title')}\n\n` +
                    `${t('pos.old_debt')} : ${formatNumber(selectedCustomer.current_debt)} ${t('common.currency_short')}\n` +
                    `${t('pos.new_amount')} : ${formatNumber(total)} ${t('common.currency_short')}\n` +
                    `----------------\n` +
                    `${t('pos.new_debt')} : ${formatNumber(newDebt)} ${t('common.currency_short')}\n\n` +
                    `${t('pos.confirm_credit_sale')}`
                )) {
                    processCheckout(method);
                }
            } else {
                Alert.alert(
                    t('pos.credit_confirmation_title'),
                    `${t('pos.old_debt')} : ${formatNumber(selectedCustomer.current_debt)} ${t('common.currency_short')}\n` +
                    `${t('pos.new_amount')} : ${formatNumber(total)} ${t('common.currency_short')}\n` +
                    `----------------\n` +
                    `${t('pos.new_debt')} : ${formatNumber(newDebt)} ${t('common.currency_short')}\n\n` +
                    `${t('pos.confirm_credit_sale')}`,
                    [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.confirm'), onPress: () => processCheckout(method) }
                    ]
                );
            }
            return;
        }

        processCheckout(method);
    };

    const handleBarcodeScanned = (sku: string) => {
        const found = productList.find(p => p.sku === sku);
        if (found) {
            if (found.quantity > 0) {
                addToCart(found);
                // No alert needed for speed, maybe a small sound or haptic feedback later
            } else {
                if (Platform.OS === 'web') {
                    window.alert(t('pos.out_of_stock_msg', { name: found.name }));
                } else {
                    Alert.alert(t('pos.out_of_stock_title'), t('pos.out_of_stock_msg', { name: found.name }));
                }
            }
        } else {
            if (Platform.OS === 'web') {
                window.alert(t('pos.unknown_product_msg', { sku: sku }));
            } else {
                Alert.alert(t('pos.unknown_product_title'), t('pos.unknown_product_msg', { sku: sku }));
            }
        }
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) {
            Alert.alert(t('common.error'), t('pos.customer_name_required'));
            return;
        }

        try {
            setCreateCustomerLoading(true);
            const newCustomer = await customersApi.create({
                name: newCustomerName,
                phone: newCustomerPhone,
            });
            setCustomerList(prev => [...prev, newCustomer]);
            updateActiveSession(s => ({ ...s, selectedCustomer: newCustomer }));
            setShowCustomerModal(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            if (Platform.OS === 'web') {
                window.alert(t('pos.customer_created'));
            } else {
                Alert.alert(t('common.success'), t('pos.customer_created'));
            }
        } catch (error) {
            if (Platform.OS === 'web') {
                window.alert(t('pos.customer_create_error'));
            } else {
                Alert.alert(t('common.error'), t('pos.customer_create_error'));
            }
        } finally {
            setCreateCustomerLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Checkout bar — rendered inside rightPanel on tablet, pinned below on mobile
    const checkoutBar = (
        <View style={isMobile ? styles.checkoutBar : styles.checkoutSection}>
            {/* Basket Suggestions */}
            {basketSuggestions.length > 0 && (
                <View style={[styles.suggestionsRow, { borderTopColor: colors.divider }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <Ionicons name="sparkles" size={13} color={colors.primary} />
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t('pos.suggestions_title')}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {basketSuggestions.map(s => {
                            const prod = productList.find(p => p.product_id === s.product_id);
                            return (
                                <TouchableOpacity
                                    key={s.product_id}
                                    style={[styles.suggestionChip, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
                                    onPress={() => prod && addToCart(prod)}
                                >
                                    <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600' }} numberOfLines={1}>{s.name}</Text>
                                    <Text style={{ fontSize: 10, color: colors.textMuted }}>{formatUserCurrency(s.selling_price, user)}</Text>
                                    <Ionicons name="add-circle" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {restaurantMode && (
                <View style={{ marginBottom: 8 }}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderRadius: 12, marginBottom: 4 }}
                        onPress={() => setShowRestaurantOptions(!showRestaurantOptions)}
                    >
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>🍽️ Options restaurant</Text>
                        <Ionicons name={showRestaurantOptions ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                    </TouchableOpacity>

                    {showRestaurantOptions && (
                        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 10 }}>
                            {/* Table */}
                            <TouchableOpacity
                                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                                onPress={() => setShowTableModal(true)}
                            >
                                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Table</Text>
                                <Text style={{ color: selectedTable ? colors.primary : colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                                    {selectedTable ? selectedTable.name : 'Sélectionner'}
                                </Text>
                            </TouchableOpacity>

                            {/* Covers */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Couverts</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <TouchableOpacity onPress={() => setCovers(c => Math.max(1, c-1))} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: colors.text, fontSize: 16 }}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, minWidth: 24, textAlign: 'center' }}>{covers}</Text>
                                    <TouchableOpacity onPress={() => setCovers(c => c+1)} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ color: colors.text, fontSize: 16 }}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Service charge */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Frais de service</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {[0, 5, 10, 15].map(p => (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => setServiceChargePercent(p)}
                                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: serviceChargePercent === p ? colors.primary : colors.divider, backgroundColor: serviceChargePercent === p ? colors.primary + '20' : 'transparent' }}
                                        >
                                            <Text style={{ color: serviceChargePercent === p ? colors.primary : colors.textMuted, fontSize: 11, fontWeight: '600' }}>{p}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Tip */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Pourboire</Text>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {[0, 5, 10, 15].map(p => (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => setTipPercent(p)}
                                            style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: tipPercent === p ? colors.primary : colors.divider, backgroundColor: tipPercent === p ? colors.primary + '20' : 'transparent' }}
                                        >
                                            <Text style={{ color: tipPercent === p ? colors.primary : colors.textMuted, fontSize: 11, fontWeight: '600' }}>{p}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Notes */}
                            <TextInput
                                value={orderNotes}
                                onChangeText={setOrderNotes}
                                placeholder="Notes cuisine..."
                                placeholderTextColor={colors.textMuted}
                                style={{ backgroundColor: colors.background, borderRadius: 10, padding: 10, color: colors.text, fontSize: 13 }}
                            />

                            {/* Total breakdown */}
                            {(serviceChargePercent > 0 || tipPercent > 0) && (
                                <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, gap: 4 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Service +{calculateServiceCharge()}</Text>
                                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Pourboire +{calculateTipAmount()}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Total final</Text>
                                        <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 14 }}>{calculateGrandTotal().toLocaleString()}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('pos.total')}</Text>
                <Text style={styles.totalAmount}>{formatUserCurrency(restaurantMode ? calculateGrandTotal() : total, user)}</Text>
            </View>

            <View style={styles.paymentMethods}>
                <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: colors.success }, (!canWrite || checkoutLoading || cart.length === 0) && { opacity: 0.5 }]}
                    onPress={() => handleCheckout('cash')}
                    disabled={!canWrite || checkoutLoading || cart.length === 0}
                >
                    <Ionicons name="cash-outline" size={20} color="#fff" />
                    <Text style={styles.payButtonText}>{t('pos.payment_cash')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: colors.primary }, (!canWrite || checkoutLoading || cart.length === 0) && { opacity: 0.5 }]}
                    onPress={() => handleCheckout('mobile_money')}
                    disabled={!canWrite || checkoutLoading || cart.length === 0}
                >
                    <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
                    <Text style={styles.payButtonText}>{t('pos.payment_mobile')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: colors.warning }, (!canWrite || checkoutLoading || cart.length === 0) && { opacity: 0.5 }]}
                    onPress={() => handleCheckout('credit')}
                    disabled={!canWrite || checkoutLoading || cart.length === 0}
                >
                    <Ionicons name="time-outline" size={20} color="#fff" />
                    <Text style={styles.payButtonText}>{t('pos.payment_credit')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <View style={[styles.content, { paddingTop: insets.top }]}>
                {/* 1. Session Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionScroll}>
                        {sessions.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.sessionTab, activeSessionId === s.id && styles.activeSessionTab]}
                                onPress={() => {
                                    setActiveSessionId(s.id);
                                    if (isMobile) setShowProductList(false);
                                }}
                            >
                                <Text style={[styles.sessionTabText, activeSessionId === s.id && styles.activeSessionTabText]}>
                                    {s.name} {s.cart.length > 0 ? `(${s.cart.length})` : ''}
                                </Text>
                                {sessions.length > 1 && (
                                    <TouchableOpacity onPress={() => removeSession(s.id)} style={{ paddingLeft: 8 }}>
                                        <Ionicons name="close-circle" size={16} color={activeSessionId === s.id ? '#fff' : colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.addSessionBtn} onPress={addSession}>
                            <Ionicons name="add" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <View style={{ flex: 1, flexDirection: isMobile ? 'column' : 'row' }}>
                    {/* Left Side: Product Selection (Modal or Panel) */}
                    {(showProductList || !isMobile) && (
                        <View style={[styles.leftPanel, isMobile && styles.mobileProductPanel]}>
                            <View style={styles.searchContainer}>
                                <View style={styles.searchBar}>
                                    <Ionicons name="search" size={20} color={colors.textMuted} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder={t('pos.search_placeholder')}
                                        placeholderTextColor={colors.textMuted}
                                        value={search}
                                        onChangeText={setSearch}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={styles.scanButton}
                                    onPress={() => setIsScannerVisible(true)}
                                >
                                    <Ionicons name="barcode-outline" size={24} color="#fff" />
                                </TouchableOpacity>
                                {isMobile && (
                                    <TouchableOpacity style={styles.closePanelBtn} onPress={() => setShowProductList(false)}>
                                        <Ionicons name="close" size={28} color={colors.text} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView contentContainerStyle={styles.productGrid}>
                                {filteredProducts.map(product => (
                                    <TouchableOpacity
                                        key={product.product_id}
                                        style={styles.productCard}
                                        onPress={() => addToCart(product)}
                                        disabled={product.quantity === 0}
                                    >
                                        <View style={[styles.stockBadge, { backgroundColor: product.quantity === 0 ? colors.danger : colors.success }]}>
                                            <Text style={styles.stockText}>{product.quantity}</Text>
                                        </View>
                                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                                        <Text style={styles.productPrice}>{formatUserCurrency(product.selling_price, user)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Right Side: Cart */}
                    {(!showProductList || !isMobile) && (
                        <View style={styles.rightPanel}>
                            <View style={styles.cartHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.cartTitle}>{t('pos.cart_title')}</Text>
                                    {isMobile && (
                                        <TouchableOpacity
                                            style={styles.mobileAddBtn}
                                            onPress={() => setShowProductList(true)}
                                        >
                                            <Ionicons name="add-circle" size={20} color={colors.primary} />
                                            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>{t('pos.add_product')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => updateActiveSession(s => ({ ...s, cart: [] }))}>
                                    <Text style={styles.clearCart}>{t('pos.clear_cart')}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.customerSelector}>
                                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                                {canWrite && (
                                    <TouchableOpacity style={styles.addCustomerBtn} onPress={() => setShowCustomerModal(true)}>
                                        <Ionicons name="add" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                )}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerScroll}>
                                    <TouchableOpacity
                                        style={[styles.customerBadge, !selectedCustomer && styles.customerBadgeActive]}
                                        onPress={() => updateActiveSession(s => ({ ...s, selectedCustomer: null }))}
                                    >
                                        <Text style={[styles.customerBadgeText, !selectedCustomer && styles.customerBadgeTextActive]}>{t('pos.anonymous_customer')}</Text>
                                    </TouchableOpacity>
                                    {customerList.map(c => (
                                        <TouchableOpacity
                                            key={c.customer_id}
                                            style={[
                                                styles.customerBadge,
                                                selectedCustomer?.customer_id === c.customer_id && styles.customerBadgeActive,
                                                c.current_debt > 0 && { borderColor: colors.danger, borderWidth: 1 }
                                            ]}
                                            onPress={() => updateActiveSession(s => ({ ...s, selectedCustomer: c }))}
                                        >
                                            <Text style={[styles.customerBadgeText, selectedCustomer?.customer_id === c.customer_id && styles.customerBadgeTextActive]}>{c.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <ScrollView style={styles.cartItems}>
                                {cart.length === 0 ? (
                                    <View style={styles.emptyCart}>
                                        <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
                                        <Text style={styles.emptyText}>{t('pos.empty_cart')}</Text>
                                    </View>
                                ) : (
                                    cart.map(item => (
                                        <View key={item.product.product_id} style={styles.cartItem}>
                                            <TouchableOpacity
                                                style={{ flex: 1 }}
                                                onPress={() => {
                                                    setSelectedCartItem(item);
                                                    setShowDiscountModal(true);
                                                }}
                                            >
                                                <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={[styles.cartItemPrice, (item.discountValue || 0) > 0 && { textDecorationLine: 'line-through' }]}>
                                                        {formatUserCurrency(item.product.selling_price * item.quantity, user)}
                                                    </Text>
                                                    {(item.discountValue || 0) > 0 && (
                                                        <Text style={[styles.cartItemPrice, { color: colors.success, fontWeight: '700' }]}>
                                                            {formatUserCurrency(
                                                                (item.discountType === 'percentage'
                                                                    ? item.product.selling_price * (1 - item.discountValue! / 100)
                                                                    : Math.max(0, item.product.selling_price - item.discountValue!)
                                                                ) * item.quantity,
                                                                user
                                                            )}
                                                        </Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                            <View style={styles.qtyContainer}>
                                                <TouchableOpacity onPress={() => updateQuantity(item.product.product_id, -1)}>
                                                    <Ionicons name="remove-circle-outline" size={24} color={colors.textMuted} />
                                                </TouchableOpacity>
                                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                                <TouchableOpacity onPress={() => updateQuantity(item.product.product_id, 1)}>
                                                    <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity onPress={() => removeFromCart(item.product.product_id)} style={{ marginLeft: 8 }}>
                                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                            {!isMobile && checkoutBar}
                        </View>
                    )}
                </View>
            </View>

            {isMobile && !showProductList && checkoutBar}

            <ChangeCalculatorModal
                visible={showCalculator}
                onClose={() => setShowCalculator(false)}
                totalAmount={total}
                onConfirm={() => {
                    setShowCalculator(false);
                    processCheckout('cash');
                }}
            />

            {selectedCartItem && (
                <LineDiscountModal
                    visible={showDiscountModal}
                    onClose={() => {
                        setShowDiscountModal(false);
                        setSelectedCartItem(null);
                    }}
                    productName={selectedCartItem.product.name}
                    currentPrice={selectedCartItem.product.selling_price}
                    onApply={(type, val) => applyDiscount(selectedCartItem.product.product_id, type, val)}
                />
            )}

            <DigitalReceiptModal
                visible={showReceiptModal}
                onClose={() => {
                    setShowReceiptModal(false);
                    setLastSale(null);
                }}
                sale={lastSale}
                store={currentStore}
            />

            <BarcodeScanner
                visible={isScannerVisible}
                onClose={() => setIsScannerVisible(false)}
                continuous={continuousScan}
                onToggleContinuous={() => setContinuousScan(!continuousScan)}
                onScanned={(sku: string) => {
                    const product = productList.find(p => p.sku === sku);
                    if (product) {
                        addToCart(product);
                    } else {
                        Alert.alert(t('pos.unknown_product_title'), t('pos.product_not_found'));
                    }
                    if (!continuousScan) setIsScannerVisible(false);
                }}
            />

            <Modal visible={showCustomerModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('pos.new_customer_title')}</Text>
                            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>{t('pos.customer_name_label')}</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newCustomerName}
                                onChangeText={setNewCustomerName}
                                placeholder={t('pos.customer_name_placeholder')}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>{t('pos.customer_phone_label')}</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newCustomerPhone}
                                onChangeText={setNewCustomerPhone}
                                placeholder={t('pos.customer_phone_placeholder')}
                                keyboardType="phone-pad"
                            />
                        </View>
                        <TouchableOpacity style={styles.createBtn} onPress={handleCreateCustomer} disabled={createCustomerLoading}>
                            {createCustomerLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>{t('pos.create_customer_btn')}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showTableModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Choisir une table</Text>
                        <FlatList
                            data={[{ table_id: '', name: 'Sans table', capacity: 0, status: 'free' }, ...tableList]}
                            keyExtractor={item => item.table_id || 'none'}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: selectedTable?.table_id === item.table_id ? colors.primary : colors.divider, backgroundColor: selectedTable?.table_id === item.table_id ? colors.primary + '15' : 'transparent', marginBottom: 6 }}
                                    onPress={() => { setSelectedTable(item.table_id ? item : null); setShowTableModal(false); }}
                                >
                                    <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
                                    {item.capacity > 0 && <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.capacity} pers.</Text>}
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity onPress={() => setShowTableModal(false)} style={{ padding: 14, borderRadius: 12, backgroundColor: colors.divider, alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ color: colors.text, fontWeight: '600' }}>Fermer</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    content: {
        flex: 1,
        flexDirection: isMobile ? 'column' : 'row',
        padding: Spacing.sm,
    },

    // Session Tabs Styles
    tabsContainer: {
        height: 50,
        marginBottom: Spacing.sm,
    },
    sessionScroll: {
        flexGrow: 0,
    },
    sessionTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.bgLight,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    activeSessionTab: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    sessionTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    activeSessionTabText: {
        color: '#fff',
    },
    addSessionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.bgLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.divider,
    },

    leftPanel: {
        flex: isMobile ? undefined : 2,
        height: isMobile ? '100%' : undefined,
        marginRight: isMobile ? 0 : Spacing.md,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    mobileProductPanel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: colors.bgDark,
        padding: Spacing.md,
    },
    closePanelBtn: {
        padding: 4,
    },
    mobileAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    rightPanel: {
        flex: 1,
        ...glassStyle,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        // On mobile: rightPanel sits between products and checkout bar
        marginBottom: isMobile ? Spacing.sm : 0,
    },

    // Mobile: checkout always pinned at the very bottom
    checkoutBar: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        backgroundColor: colors.bgMid,
    },

    customerSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    customerScroll: { marginLeft: Spacing.sm },
    customerBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginRight: 6,
    },
    customerBadgeActive: {
        backgroundColor: colors.primary,
    },
    customerBadgeText: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '600',
    },
    customerBadgeTextActive: {
        color: '#fff',
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    searchBar: {
        ...glassStyle,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        height: 50,
        borderRadius: BorderRadius.md,
    },
    scanButton: {
        width: 50,
        height: 50,
        borderRadius: BorderRadius.md,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        color: colors.text,
        fontSize: FontSize.md,
    },

    productGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    productCard: {
        ...glassStyle,
        width: (screenWidth * 0.6 - Spacing.md * 4) / 3,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.xs,
    },
    stockBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        paddingHorizontal: 6,
        borderRadius: 10,
    },
    stockText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    productName: {
        color: colors.text,
        fontSize: FontSize.sm,
        fontWeight: '600',
        marginTop: 15,
    },
    productPrice: {
        color: colors.primary,
        fontSize: FontSize.xs,
        fontWeight: '700',
        marginTop: 4,
    },

    cartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    cartTitle: {
        color: colors.text,
        fontSize: FontSize.lg,
        fontWeight: '700',
    },
    clearCart: {
        color: colors.danger,
        fontSize: FontSize.sm,
    },
    cartItems: { flex: 1 },
    emptyCart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: colors.textMuted,
        marginTop: Spacing.sm,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    cartItemName: {
        color: colors.text,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    cartItemPrice: {
        color: colors.textSecondary,
        fontSize: FontSize.xs,
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    qtyText: {
        color: colors.text,
        fontSize: FontSize.md,
        fontWeight: '700',
        minWidth: 20,
        textAlign: 'center',
    },

    checkoutSection: {
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    totalLabel: {
        color: colors.text,
        fontSize: FontSize.lg,
        fontWeight: '600',
    },
    totalAmount: {
        color: colors.success,
        fontSize: FontSize.xl,
        fontWeight: '800',
    },
    paymentMethods: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    payButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        gap: 8,
    },
    payButtonText: {
        color: '#fff',
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    // New styles for Customer Modal and Button
    addCustomerBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.bgMid,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: colors.text,
    },
    formGroup: {
        marginBottom: Spacing.md,
    },
    formLabel: {
        fontSize: FontSize.sm,
        color: colors.textSecondary,
        marginBottom: Spacing.xs,
    },
    formInput: {
        backgroundColor: colors.inputBg || '#2A2A2A',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    createBtn: {
        backgroundColor: colors.primary,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    createBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    terminalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: colors.primary + '15',
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    terminalBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.primary,
    },
    terminalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: colors.divider,
        marginBottom: Spacing.sm,
    },
    terminalOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '15',
    },
    terminalOptionText: {
        flex: 1,
        color: colors.text,
        fontWeight: '600',
        fontSize: FontSize.md,
    },
    suggestionsRow: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderTopWidth: 1,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginRight: 8,
    },
});
