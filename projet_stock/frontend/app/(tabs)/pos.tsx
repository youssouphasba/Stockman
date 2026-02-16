import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import BarcodeScanner from '../../components/BarcodeScanner';
import {
    products as productsApi,
    sales as salesApi,
    customers as customersApi,
    Product,
    Sale,
    Customer,
} from '../../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;

type CartItem = {
    product: Product;
    quantity: number;
};

export default function POSScreen() {
    const { colors, glassStyle } = useTheme();
    const styles = getStyles(colors, glassStyle);
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

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [prods, custs] = await Promise.all([
                productsApi.list(),
                customersApi.list(),
            ]);
            setProductList(prods.filter(p => p.is_active));
            setCustomerList(custs);
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
                Alert.alert('Stock insuffisant', `Il ne reste que ${product.quantity} ${product.unit}(s) de ${product.name}`);
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
                    Alert.alert('Stock insuffisant', `Il ne reste que ${item.product.quantity} ${item.product.unit}(s) de ${item.product.name}`);
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


    const printReceipt = async (saleItems: CartItem[], totalAmount: number, customer?: Customer | null) => {
        try {
            const date = new Date().toLocaleString('fr-FR');

            const html = `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                        h1 { text-align: center; font-size: 24px; margin-bottom: 5px; }
                        .header { text-align: center; margin-bottom: 20px; font-size: 14px; color: #555; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
                        td { padding: 5px 0; border-bottom: 1px solid #eee; }
                        .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 10px; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; }
                    </style>
                </head>
                <body>
                    <h1>Tontetic Stock</h1>
                    <div class="header">
                        Reçu de vente<br>
                        Date: ${date}<br>
                        ${customer ? `Client: ${customer.name}<br>` : ''}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th style="text-align: right">Qté</th>
                                <th style="text-align: right">Prix</th>
                                <th style="text-align: right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${saleItems.map(item => `
                                <tr>
                                    <td>${item.product.name}</td>
                                    <td style="text-align: right">${item.quantity}</td>
                                    <td style="text-align: right">${item.product.selling_price}</td>
                                    <td style="text-align: right">${item.product.selling_price * item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="total">
                        Total: ${totalAmount.toLocaleString()} FCFA
                    </div>
                    
                    <div class="footer">
                        Merci pour votre confiance !
                    </div>
                </body>
            </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de générer le reçu');
        }
    };

    const handleCheckout = async (method: string) => {
        if (cart.length === 0) return;

        try {
            setCheckoutLoading(true);
            const items = cart.map(item => ({
                product_id: item.product.product_id,
                quantity: item.quantity
            }));

            await salesApi.create(items, method, selectedCustomer?.customer_id);

            Alert.alert(
                'Succès',
                'Vente enregistrée ! Voulez-vous un reçu ?',
                [
                    { text: 'Non', style: 'cancel' },
                    { text: 'Oui', onPress: () => printReceipt(cart, total, selectedCustomer) }
                ]
            );
            setCart([]);
            setSelectedCustomer(null);
            loadData(); // Update stocks and customer points
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible d\'enregistrer la vente');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleBarcodeScanned = (sku: string) => {
        const found = productList.find(p => p.sku === sku);
        if (found) {
            if (found.quantity > 0) {
                addToCart(found);
                // No alert needed for speed, maybe a small sound or haptic feedback later
            } else {
                Alert.alert('Stock épuisé', `Le produit ${found.name} n'est plus en stock.`);
            }
        } else {
            Alert.alert('Inconnu', `Aucun produit trouvé avec le SKU: ${sku}`);
        }
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerName.trim()) {
            Alert.alert('Erreur', 'Le nom est obligatoire');
            return;
        }

        try {
            setCreateCustomerLoading(true);
            const newCustomer = await customersApi.create({
                name: newCustomerName,
                phone: newCustomerPhone,
                user_id: 'default' // Backend handles this from token, but type might need it? No, backend overrides.
            });
            setCustomerList(prev => [...prev, newCustomer]);
            setSelectedCustomer(newCustomer);
            setShowCustomerModal(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
            Alert.alert('Succès', 'Client créé et sélectionné');
        } catch (error) {
            Alert.alert('Erreur', 'Impossible de créer le client');
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

    return (
        <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.container}>
            <View style={styles.content}>
                {/* Left Side: Product Selection */}
                <View style={styles.leftPanel}>
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color={colors.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Rechercher un produit..."
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
                                <Text style={styles.productPrice}>{product.selling_price.toLocaleString()} FCFA</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Right Side: Cart & Checkout */}
                <View style={styles.rightPanel}>
                    <View style={styles.cartHeader}>
                        <Text style={styles.cartTitle}>Panier</Text>
                        <TouchableOpacity onPress={() => setCart([])}>
                            <Text style={styles.clearCart}>Vider</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Customer Selection */}
                    <View style={styles.customerSelector}>
                        <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                        <TouchableOpacity style={styles.addCustomerBtn} onPress={() => setShowCustomerModal(true)}>
                            <Ionicons name="add" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerScroll}>
                            <TouchableOpacity
                                style={[styles.customerBadge, !selectedCustomer && styles.customerBadgeActive]}
                                onPress={() => setSelectedCustomer(null)}
                            >
                                <Text style={[styles.customerBadgeText, !selectedCustomer && styles.customerBadgeTextActive]}>Passant</Text>
                            </TouchableOpacity>
                            {customerList.map(c => (
                                <TouchableOpacity
                                    key={c.customer_id}
                                    style={[styles.customerBadge, selectedCustomer?.customer_id === c.customer_id && styles.customerBadgeActive]}
                                    onPress={() => setSelectedCustomer(c)}
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
                                <Text style={styles.emptyText}>Le panier est vide</Text>
                            </View>
                        ) : (
                            cart.map(item => (
                                <View key={item.product.product_id} style={styles.cartItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                                        <Text style={styles.cartItemPrice}>{(item.product.selling_price * item.quantity).toLocaleString()} FCFA</Text>
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

                    <View style={styles.checkoutSection}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalAmount}>{total.toLocaleString()} FCFA</Text>
                        </View>

                        <View style={styles.paymentMethods}>
                            <TouchableOpacity
                                style={[styles.payButton, { backgroundColor: colors.success }]}
                                onPress={() => handleCheckout('cash')}
                                disabled={checkoutLoading || cart.length === 0}
                            >
                                <Ionicons name="cash-outline" size={20} color="#fff" />
                                <Text style={styles.payButtonText}>Espèces</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.payButton, { backgroundColor: colors.primary }]}
                                onPress={() => handleCheckout('mobile_money')}
                                disabled={checkoutLoading || cart.length === 0}
                            >
                                <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
                                <Text style={styles.payButtonText}>Mobile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Customer Creation Modal */}
            <Modal visible={showCustomerModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nouveau Client</Text>
                            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Nom du client *</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newCustomerName}
                                onChangeText={setNewCustomerName}
                                placeholder="Ex: Jean Dupont"
                                placeholderTextColor={colors.textMuted}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Téléphone</Text>
                            <TextInput
                                style={styles.formInput}
                                value={newCustomerPhone}
                                onChangeText={setNewCustomerPhone}
                                placeholder="Ex: 77 000 00 00"
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
                                <Text style={styles.createBtnText}>Créer le client</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient >
    );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgDark },
    content: { flex: 1, flexDirection: 'row', padding: Spacing.md },

    leftPanel: { flex: 2, marginRight: Spacing.md },
    rightPanel: { flex: 1, ...glassStyle, padding: Spacing.md, borderRadius: BorderRadius.lg },

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
});
