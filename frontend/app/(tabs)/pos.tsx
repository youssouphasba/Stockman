import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
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

type CartItem = {
    product: Product;
    quantity: number;
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [isScannerVisible, setIsScannerVisible] = useState(false);

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
                if (active) setCurrentStore(active);
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

    const addToCart = (product: Product) => {
        setCart(current => {
            const existing = current.find(item => item.product.product_id === product.product_id);
            const currentQtyInCart = existing ? existing.quantity : 0;
            if (currentQtyInCart + 1 > product.quantity) {
                Alert.alert(t('pos.insufficient_stock'), t('pos.not_enough_stock_detail', { qty: product.quantity, unit: product.unit, name: product.name }));
                return current;
            }
            if (existing) {
                return current.map(item =>
                    item.product.product_id === product.product_id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...current, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(current => current.filter(item => item.product.product_id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(current => current.map(item => {
            if (item.product.product_id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                if (newQty > item.product.quantity) {
                    if (Platform.OS === 'web') {
                        window.alert(t('pos.not_enough_stock_detail', { qty: item.product.quantity, unit: item.product.unit, name: item.product.name }));
                    } else {
                        Alert.alert(t('pos.insufficient_stock'), t('pos.not_enough_stock_detail', { qty: item.product.quantity, unit: item.product.unit, name: item.product.name }));
                    }
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = useMemo(() => {
        return cart.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0);
    }, [cart]);

    const processCheckout = async (method: string) => {
        try {
            setCheckoutLoading(true);
            const items = cart.map(item => ({
                product_id: item.product.product_id,
                quantity: item.quantity
            }));

            const result = await salesApi.create({
                items,
                payment_method: method,
                customer_id: selectedCustomer?.customer_id
            });

            if (method === 'credit') {
                if (Platform.OS === 'web') {
                    window.alert(t('pos.credit_success'));
                } else {
                    Alert.alert(t('common.success'), t('pos.credit_success'));
                }
                setLastSale({
                    ...result,
                    customer_name: selectedCustomer?.name || t('pos.anonymous_customer')
                });
                setShowReceiptModal(true);
            }

            setCart([]);
            setSelectedCustomer(null);
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
            setSelectedCustomer(newCustomer);
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

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('pos.total')}</Text>
                <Text style={styles.totalAmount}>{formatUserCurrency(total, user)}</Text>
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
                {/* Left Side: Product Selection */}
                <View style={styles.leftPanel}>
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
                    </View>

                    <BarcodeScanner
                        visible={isScannerVisible}
                        onClose={() => setIsScannerVisible(false)}
                        onScanned={handleBarcodeScanned}
                    />

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

                {/* Right Side: Cart (checkout pinned at bottom on mobile) */}
                <View style={styles.rightPanel}>
                    <View style={styles.cartHeader}>
                        <Text style={styles.cartTitle}>{t('pos.cart_title')}</Text>
                        <TouchableOpacity onPress={() => setCart([])}>
                            <Text style={styles.clearCart}>{t('pos.clear_cart')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Customer Selection */}
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
                                onPress={() => setSelectedCustomer(null)}
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
                                    onPress={() => setSelectedCustomer(c)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Text style={[styles.customerBadgeText, selectedCustomer?.customer_id === c.customer_id && styles.customerBadgeTextActive]}>{c.name}</Text>
                                        {c.current_debt > 0 && (
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                                paddingHorizontal: 4,
                                                borderRadius: 4,
                                                gap: 2
                                            }}>
                                                <Ionicons name="alert-circle" size={10} color={colors.danger} />
                                                <Text style={{ fontSize: 10, color: colors.danger, fontWeight: '700' }}>
                                                    {formatNumber(c.current_debt)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
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
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                                        <Text style={styles.cartItemPrice}>{formatUserCurrency(item.product.selling_price * item.quantity, user)}</Text>
                                    </View>
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

                    {/* Checkout inline (tablet only) */}
                    {!isMobile && checkoutBar}
                </View>
            </View>

            {/* Checkout bar pinned at bottom (mobile only) */}
            {isMobile && checkoutBar}

            {/* Customer Creation Modal */}
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
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>{t('pos.customer_phone_label')}</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newCustomerPhone}
                                onChangeText={setNewCustomerPhone}
                                placeholder={t('pos.customer_phone_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.createBtn}
                            onPress={handleCreateCustomer}
                            disabled={createCustomerLoading}
                        >
                            {createCustomerLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.createBtnText}>{t('pos.create_customer_btn')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Digital Receipt Modal */}
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
                onScanned={(sku: string) => {
                    const product = productList.find(p => p.sku === sku);
                    if (product) {
                        addToCart(product);
                    } else {
                        Alert.alert(t('pos.unknown_product_title'), t('pos.product_not_found'));
                    }
                    setIsScannerVisible(false);
                }}
            />
        </LinearGradient >
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    content: {
        flex: 1,
        flexDirection: isMobile ? 'column' : 'row',
        padding: Spacing.md,
        paddingBottom: isMobile ? 0 : Spacing.md,
    },

    leftPanel: {
        // Mobile: fixed height = 35% of screen, products scroll inside
        // Tablet: flex 2 (takes 2/3 of row)
        flex: isMobile ? undefined : 2,
        height: isMobile ? Math.round(screenHeight * 0.35) : undefined,
        marginRight: isMobile ? 0 : Spacing.md,
        marginBottom: isMobile ? Spacing.sm : 0,
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
