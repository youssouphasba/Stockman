import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert as RNAlert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import StepProgressBar from './StepProgressBar';
import QuantityStepper from './QuantityStepper';
import {
  suppliers as suppliersApi,
  products as productsApi,
  marketplace as marketplaceApi,
  orders as ordersApi,
  Supplier,
  MarketplaceSupplier,
  CatalogProductData,
  OrderCreate,
} from '../services/api';

// ── Types ──────────────────────────────────────────────
type SelectedSupplier = {
  id: string;
  name: string;
  isMarketplace: boolean;
  userId?: string;
};

type ProductItem = {
  id: string;
  name: string;
  unit_price: number;
  unit: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
  preSelectedSupplier?: SelectedSupplier | null;
  preLoadedCatalog?: CatalogProductData[];
};

const STEP_LABELS = ['Fournisseur', 'Articles', 'Confirmation'];

// ── Component ──────────────────────────────────────────
export default function OrderCreationModal({
  visible,
  onClose,
  onOrderCreated,
  preSelectedSupplier,
  preLoadedCatalog,
}: Props) {
  const { colors, glassStyle } = useTheme();
  const s = getStyles(colors, glassStyle);

  // Steps
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Supplier
  const [supplierTab, setSupplierTab] = useState<'manual' | 'marketplace'>('manual');
  const [manualSuppliers, setManualSuppliers] = useState<Supplier[]>([]);
  const [mpSuppliers, setMpSuppliers] = useState<MarketplaceSupplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SelectedSupplier | null>(null);

  // Step 2 — Products
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [noLinkedProducts, setNoLinkedProducts] = useState(false);

  // Step 3 — Review
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Reset on open/close ──
  useEffect(() => {
    if (visible) {
      if (preSelectedSupplier) {
        setSelectedSupplier(preSelectedSupplier);
        setStep(2);
        loadProducts(preSelectedSupplier);
      } else {
        setStep(1);
        loadSuppliers();
      }
    } else {
      // Reset
      setStep(1);
      setSelectedSupplier(null);
      setSupplierTab('manual');
      setSupplierSearch('');
      setProducts([]);
      setQuantities({});
      setProductSearch('');
      setNotes('');
      setNoLinkedProducts(false);
    }
  }, [visible]);

  // ── Data loaders ──
  async function loadSuppliers() {
    setSuppliersLoading(true);
    try {
      const data = await suppliersApi.list();
      setManualSuppliers(data.items ?? data as any);
    } catch { /* ignore */ }
    setSuppliersLoading(false);
  }

  async function searchMpSuppliers() {
    setSuppliersLoading(true);
    try {
      const data = await marketplaceApi.searchSuppliers({
        q: supplierSearch || undefined,
      });
      setMpSuppliers(data);
    } catch { /* ignore */ }
    setSuppliersLoading(false);
  }

  async function loadProducts(supplier: SelectedSupplier) {
    setProductsLoading(true);
    setNoLinkedProducts(false);
    try {
      if (supplier.isMarketplace) {
        // Marketplace: use preloaded catalog or fetch
        let catalog: CatalogProductData[] = [];
        if (preLoadedCatalog && preLoadedCatalog.length > 0) {
          catalog = preLoadedCatalog;
        } else if (supplier.userId) {
          const detail = await marketplaceApi.getSupplier(supplier.userId);
          catalog = detail.catalog;
        }
        setProducts(
          catalog
            .filter((c) => c.available)
            .map((c) => ({ id: c.catalog_id, name: c.name, unit_price: c.price, unit: c.unit || 'unité' }))
        );
      } else {
        // Manual: try linked products first
        const linked = await suppliersApi.getProducts(supplier.id);
        if (linked.length > 0) {
          setProducts(
            linked.map((lp) => ({
              id: lp.product.product_id,
              name: lp.product.name,
              unit_price: lp.supplier_price || lp.product.purchase_price,
              unit: lp.product.unit || 'unité',
            }))
          );
        } else {
          // Fallback: shopkeeper's inventory
          setNoLinkedProducts(true);
          const allProdsRes = await productsApi.list(undefined, 0, 500);
          const allProds = allProdsRes.items ?? allProdsRes as any;
          setProducts(
            allProds.map((p: any) => ({
              id: p.product_id,
              name: p.name,
              unit_price: p.purchase_price,
              unit: p.unit || 'unité',
            }))
          );
        }
      }
    } catch {
      setProducts([]);
    }
    setProductsLoading(false);
  }

  // ── Supplier selection ──
  function selectSupplier(sup: SelectedSupplier) {
    setSelectedSupplier(sup);
    setQuantities({});
    setProductSearch('');
    setStep(2);
    loadProducts(sup);
  }

  // ── Quantity helpers ──
  function updateQty(id: string, qty: number) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  // ── Computed values ──
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const selectedItems = useMemo(
    () => products.filter((p) => (quantities[p.id] || 0) > 0),
    [products, quantities]
  );

  const total = useMemo(
    () => selectedItems.reduce((sum, p) => sum + (quantities[p.id] || 0) * p.unit_price, 0),
    [selectedItems, quantities]
  );

  const itemCount = selectedItems.length;

  // ── Submit ──
  async function handleSubmit() {
    if (!selectedSupplier || selectedItems.length === 0) return;

    const performSubmit = async () => {
      setSubmitting(true);
      try {
        const payload: OrderCreate = {
          supplier_id: selectedSupplier.id,
          supplier_user_id: selectedSupplier.isMarketplace ? selectedSupplier.userId : undefined,
          items: selectedItems.map((p) => ({
            product_id: p.id,
            quantity: quantities[p.id],
            unit_price: p.unit_price,
          })),
          notes: notes.trim() || undefined,
        };
        await ordersApi.create(payload);
        if (Platform.OS === 'web') {
          window.alert('Commande envoyée avec succès !');
        } else {
          RNAlert.alert('Succès', 'Commande envoyée avec succès !');
        }
        onOrderCreated();
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Impossible de créer la commande');
        } else {
          RNAlert.alert('Erreur', 'Impossible de créer la commande');
        }
      }
      setSubmitting(false);
    };

    const msg = `Confirmer l'envoi de cette commande à ${selectedSupplier.name} pour un montant de ${total.toLocaleString()} FCFA ?`;

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        await performSubmit();
      }
    } else {
      RNAlert.alert(
        "Confirmation de commande",
        msg,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer", onPress: performSubmit }
        ]
      );
    }
  }

  // ── Navigation ──
  function goBack() {
    if (step === 3) setStep(2);
    else if (step === 2 && !preSelectedSupplier) setStep(1);
    else onClose();
  }

  // ── Filtered suppliers ──
  const filteredManual = useMemo(() => {
    if (!supplierSearch.trim()) return manualSuppliers;
    const q = supplierSearch.toLowerCase();
    return manualSuppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [manualSuppliers, supplierSearch]);

  // ── Render helpers ──
  const renderProductRow = useCallback(
    ({ item }: { item: ProductItem }) => {
      const qty = quantities[item.id] || 0;
      const isSelected = qty > 0;
      return (
        <View style={[s.productRow, isSelected && s.productRowSelected]}>
          <View style={s.productInfo}>
            <Text style={s.productName}>{item.name}</Text>
            <Text style={s.productPrice}>
              {item.unit_price.toLocaleString()} F/{item.unit}
            </Text>
          </View>
          <View style={s.productRight}>
            {isSelected && (
              <Text style={s.lineTotal}>{(qty * item.unit_price).toLocaleString()} F</Text>
            )}
            <QuantityStepper
              value={qty}
              onIncrement={() => updateQty(item.id, qty + 1)}
              onDecrement={() => updateQty(item.id, qty - 1)}
            />
          </View>
        </View>
      );
    },
    [quantities, s]
  );

  // ═══════════════ RENDER ═══════════════
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalWrapper}
        >
          <View style={s.modal}>
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={step === 1 && !preSelectedSupplier ? 'close' : 'arrow-back'}
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <Text style={s.headerTitle}>
                {step === 1 ? 'Nouvelle commande' : step === 2 ? 'Articles' : 'Récapitulatif'}
              </Text>
              <Text style={s.stepLabel}>Étape {step}/3</Text>
            </View>

            <StepProgressBar currentStep={step} totalSteps={3} labels={STEP_LABELS} />

            {/* ═══ STEP 1: Supplier ═══ */}
            {step === 1 && (
              <View style={s.stepContent}>
                {/* Tabs */}
                <View style={s.tabs}>
                  <TouchableOpacity
                    style={[s.tab, supplierTab === 'manual' && s.tabActive]}
                    onPress={() => setSupplierTab('manual')}
                  >
                    <Text style={[s.tabText, supplierTab === 'manual' && s.tabTextActive]}>
                      Mes Fournisseurs
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.tab, supplierTab === 'marketplace' && s.tabActive]}
                    onPress={() => {
                      setSupplierTab('marketplace');
                      if (mpSuppliers.length === 0) searchMpSuppliers();
                    }}
                  >
                    <Text style={[s.tabText, supplierTab === 'marketplace' && s.tabTextActive]}>
                      Marketplace
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={s.searchRow}>
                  <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Rechercher..."
                    placeholderTextColor={colors.textMuted}
                    value={supplierSearch}
                    onChangeText={setSupplierSearch}
                    onSubmitEditing={supplierTab === 'marketplace' ? searchMpSuppliers : undefined}
                    returnKeyType="search"
                  />
                </View>

                {suppliersLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xxl }} />
                ) : supplierTab === 'manual' ? (
                  <FlatList
                    data={filteredManual}
                    keyExtractor={(item) => item.supplier_id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={s.supplierRow}
                        onPress={() =>
                          selectSupplier({
                            id: item.supplier_id,
                            name: item.name,
                            isMarketplace: false,
                          })
                        }
                      >
                        <View style={s.supplierIconBg}>
                          <Ionicons name="person-circle-outline" size={28} color={colors.primaryLight} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.supplierName}>{item.name}</Text>
                          {item.products_supplied ? (
                            <Text style={s.supplierSub} numberOfLines={1}>{item.products_supplied}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={s.emptyText}>Aucun fournisseur trouvé</Text>
                    }
                    contentContainerStyle={{ paddingBottom: Spacing.xxl }}
                  />
                ) : (
                  <FlatList
                    data={mpSuppliers}
                    keyExtractor={(item) => item.user_id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={s.supplierRow}
                        onPress={() =>
                          selectSupplier({
                            id: item.user_id,
                            name: item.company_name,
                            isMarketplace: true,
                            userId: item.user_id,
                          })
                        }
                      >
                        <View style={[s.supplierIconBg, { backgroundColor: colors.secondary + '20' }]}>
                          <Ionicons name="storefront" size={22} color={colors.secondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.supplierName}>{item.company_name}</Text>
                          <Text style={s.supplierSub}>
                            {item.city || 'Marketplace'} — {item.catalog_count} produits
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={s.emptyText}>Aucun fournisseur trouvé</Text>
                    }
                    contentContainerStyle={{ paddingBottom: Spacing.xxl }}
                  />
                )}
              </View>
            )}

            {/* ═══ STEP 2: Products ═══ */}
            {step === 2 && (
              <View style={s.stepContent}>
                {/* Supplier badge */}
                <TouchableOpacity
                  style={s.supplierBadge}
                  onPress={() => { if (!preSelectedSupplier) setStep(1); }}
                  disabled={!!preSelectedSupplier}
                >
                  <Ionicons name="storefront-outline" size={16} color={colors.primary} />
                  <Text style={s.supplierBadgeText} numberOfLines={1}>
                    {selectedSupplier?.name}
                  </Text>
                  {!preSelectedSupplier && (
                    <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {noLinkedProducts && (
                  <View style={s.noticeBanner}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                    <Text style={s.noticeText}>
                      Aucun produit lié. Affichage de votre inventaire.
                    </Text>
                  </View>
                )}

                {/* Search */}
                <View style={s.searchRow}>
                  <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Filtrer les produits..."
                    placeholderTextColor={colors.textMuted}
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                </View>

                {productsLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xxl }} />
                ) : (
                  <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProductRow}
                    ListEmptyComponent={
                      <Text style={s.emptyText}>Aucun produit disponible</Text>
                    }
                    contentContainerStyle={{ paddingBottom: 130 }}
                    initialNumToRender={20}
                  />
                )}

                {/* Sticky footer */}
                <View style={s.stickyFooter}>
                  <View style={s.footerInfo}>
                    <Text style={s.footerCount}>{itemCount} article(s)</Text>
                    <Text style={s.footerTotal}>{total.toLocaleString()} FCFA</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.footerBtn, itemCount === 0 && s.footerBtnDisabled]}
                    onPress={() => setStep(3)}
                    disabled={itemCount === 0}
                  >
                    <Text style={s.footerBtnText}>Voir le récapitulatif</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ═══ STEP 3: Review ═══ */}
            {step === 3 && (
              <FlatList
                data={selectedItems}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                  <View style={s.reviewSection}>
                    {/* Supplier */}
                    <View style={s.reviewCard}>
                      <Text style={s.reviewLabel}>Fournisseur</Text>
                      <Text style={s.reviewValue}>{selectedSupplier?.name}</Text>
                    </View>

                    <Text style={s.reviewSectionTitle}>Articles ({itemCount})</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={s.reviewItem}>
                    <Text style={s.reviewItemName}>{item.name}</Text>
                    <Text style={s.reviewItemDetail}>
                      {quantities[item.id]} x {item.unit_price.toLocaleString()} F
                    </Text>
                    <Text style={s.reviewItemTotal}>
                      {((quantities[item.id] || 0) * item.unit_price).toLocaleString()} F
                    </Text>
                  </View>
                )}
                ListFooterComponent={
                  <View style={s.reviewFooter}>
                    {/* Notes */}
                    <Text style={s.reviewLabel}>Notes (optionnel)</Text>
                    <TextInput
                      style={s.notesInput}
                      placeholder="Instructions spéciales..."
                      placeholderTextColor={colors.textMuted}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                    />

                    {/* Total */}
                    <View style={s.totalRow}>
                      <Text style={s.totalLabel}>Total</Text>
                      <Text style={s.totalValue}>{total.toLocaleString()} FCFA</Text>
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                      style={[s.confirmBtn, submitting && { opacity: 0.6 }]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={s.confirmBtnText}>Confirmer la commande</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <View style={{ height: Spacing.xxl }} />
                  </View>
                }
                contentContainerStyle={{ padding: Spacing.md }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────
const getStyles = (colors: any, glassStyle: any) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalWrapper: { maxHeight: '92%' },
    modal: {
      backgroundColor: colors.bgMid,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.md,
      height: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    stepLabel: { fontSize: FontSize.xs, color: colors.textMuted, fontWeight: '600' },

    // Tabs
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.glass,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 3,
      marginBottom: Spacing.sm,
    },
    tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: '#fff' },

    // Search
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      ...glassStyle,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: FontSize.md, marginLeft: Spacing.sm },

    // Step content
    stepContent: { flex: 1 },

    // Supplier list rows
    supplierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: Spacing.sm,
    },
    supplierIconBg: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    supplierName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    supplierSub: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 },

    // Supplier badge (step 2)
    supplierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: colors.primary + '12',
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      borderRadius: BorderRadius.full,
      alignSelf: 'flex-start',
      marginBottom: Spacing.sm,
    },
    supplierBadgeText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600', maxWidth: 200 },

    // Notice banner
    noticeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: colors.warning + '15',
      padding: Spacing.sm,
      borderRadius: BorderRadius.sm,
      marginBottom: Spacing.sm,
    },
    noticeText: { fontSize: FontSize.xs, color: colors.warning, flex: 1 },

    // Product rows
    productRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    productRowSelected: {
      backgroundColor: colors.success + '10',
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    productInfo: { flex: 1 },
    productName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
    productPrice: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 },
    productRight: { alignItems: 'flex-end', gap: 4 },
    lineTotal: { fontSize: FontSize.xs, fontWeight: '700', color: colors.success },

    // Sticky footer
    stickyFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.bgMid,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      padding: Spacing.md,
    },
    footerInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    footerCount: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: '600' },
    footerTotal: { fontSize: FontSize.lg, fontWeight: '700', color: colors.primary },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.primary,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    footerBtnDisabled: { opacity: 0.4 },
    footerBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

    // Review
    reviewSection: { marginBottom: Spacing.sm },
    reviewCard: {
      ...glassStyle,
      padding: Spacing.md,
      marginBottom: Spacing.md,
    },
    reviewLabel: { fontSize: FontSize.xs, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
    reviewValue: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
    reviewSectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: Spacing.sm },

    reviewItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    reviewItemName: { flex: 1, fontSize: FontSize.md, color: colors.text, fontWeight: '600' },
    reviewItemDetail: { fontSize: FontSize.xs, color: colors.textMuted, marginRight: Spacing.sm },
    reviewItemTotal: { fontSize: FontSize.md, fontWeight: '700', color: colors.primaryLight },

    reviewFooter: { marginTop: Spacing.md },

    notesInput: {
      backgroundColor: colors.inputBg,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.divider,
      color: colors.text,
      fontSize: FontSize.md,
      padding: Spacing.md,
      minHeight: 60,
      textAlignVertical: 'top',
      marginBottom: Spacing.lg,
    },

    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...glassStyle,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
    },
    totalLabel: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
    totalValue: { fontSize: FontSize.xl, fontWeight: '700', color: colors.primary },

    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.success,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },

    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: FontSize.sm,
      paddingVertical: Spacing.xxl,
    },
  });
