import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert as RNAlert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  orders as ordersApi,
  suppliers as suppliersApi,
  products as productsApi,
  ratings as ratingsApi,
  OrderWithDetails,
  OrderFull,
  Supplier,
  Product,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function OrdersScreen() {
  const { colors, glassStyle } = useTheme();
  const styles = getStyles(colors, glassStyle);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pending: { label: 'En attente', color: colors.warning, icon: 'time-outline' },
    confirmed: { label: 'Confirmée', color: colors.secondary, icon: 'checkmark-circle-outline' },
    shipped: { label: 'Expédiée', color: colors.info, icon: 'airplane-outline' },
    delivered: { label: 'Livrée', color: colors.success, icon: 'checkmark-done-outline' },
    cancelled: { label: 'Annulée', color: colors.danger, icon: 'close-circle-outline' },
  };

  const NEXT_STATUS: Record<string, string> = {
    pending: 'confirmed',
    confirmed: 'shipped',
    shipped: 'delivered',
  };
  const [orderList, setOrderList] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create order modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<{ product_id: string; name: string; quantity: string; unit_price: string }[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [createStep, setCreateStep] = useState<'supplier' | 'products'>('supplier');
  const [formLoading, setFormLoading] = useState(false);

  // Add item temp
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemProductId, setItemProductId] = useState<string | null>(null);
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState('');
  const [ratingSupplierUserId, setRatingSupplierUserId] = useState('');
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await ordersApi.list(statusFilter ?? undefined);
      setOrderList(result);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  async function openDetailModal(orderId: string) {
    setShowDetailModal(true);
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const result = await ordersApi.get(orderId);
      setDetailOrder(result);
    } catch {
      RNAlert.alert('Erreur', 'Impossible de charger les détails');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openCreateModal() {
    setShowCreateModal(true);
    setCreateStep('supplier');
    setSelectedSupplierId(null);
    setOrderItems([]);
    setOrderNotes('');
    try {
      const [sups, prods] = await Promise.all([suppliersApi.list(), productsApi.list()]);
      setSuppliersList(sups);
      setProductsList(prods);
    } catch {
      // ignore
    }
  }

  function selectSupplier(supplierId: string) {
    setSelectedSupplierId(supplierId);
    setCreateStep('products');
  }

  function openAddItem() {
    setItemProductId(null);
    setItemQuantity('');
    setItemPrice('');
    setShowAddItemModal(true);
  }

  function confirmAddItem() {
    if (!itemProductId || !itemQuantity) return;
    const product = productsList.find((p) => p.product_id === itemProductId);
    if (!product) return;
    setOrderItems((prev) => [
      ...prev,
      {
        product_id: itemProductId,
        name: product.name,
        quantity: itemQuantity,
        unit_price: itemPrice || String(product.purchase_price),
      },
    ]);
    setShowAddItemModal(false);
  }

  function removeItem(index: number) {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateOrder() {
    if (!selectedSupplierId || orderItems.length === 0) return;
    setFormLoading(true);
    try {
      await ordersApi.create({
        supplier_id: selectedSupplierId,
        items: orderItems.map((item) => ({
          product_id: item.product_id,
          quantity: parseInt(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
        })),
        notes: orderNotes || undefined,
      });
      setShowCreateModal(false);
      loadData();
    } catch {
      RNAlert.alert('Erreur', 'Impossible de créer la commande');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleAdvanceStatus(orderId: string, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    try {
      await ordersApi.updateStatus(orderId, next);
      loadData();
    } catch {
      RNAlert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  }

  async function handleCancel(orderId: string) {
    try {
      await ordersApi.updateStatus(orderId, 'cancelled');
      loadData();
    } catch {
      RNAlert.alert('Erreur', 'Impossible d\'annuler');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function getTotal() {
    return orderItems.reduce(
      (sum, item) => sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
      0
    );
  }

  function openRating(order: OrderFull) {
    if (!order.supplier_user_id) return;
    setRatingOrderId(order.order_id);
    setRatingSupplierUserId(order.supplier_user_id);
    setRatingScore(0);
    setRatingComment('');
    setShowRatingModal(true);
  }

  async function submitRating() {
    if (ratingScore === 0) return;
    setRatingSaving(true);
    try {
      await ratingsApi.create(ratingSupplierUserId, {
        order_id: ratingOrderId,
        score: ratingScore,
        comment: ratingComment.trim() || undefined,
      });
      setShowRatingModal(false);
      RNAlert.alert('Merci', 'Votre avis a été enregistré');
    } catch {
      RNAlert.alert('Erreur', 'Impossible de soumettre l\'avis');
    } finally {
      setRatingSaving(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Commandes</Text>
            <Text style={styles.subtitle}>{orderList.length} commande(s)</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !statusFilter && styles.filterChipActive]}
            onPress={() => setStatusFilter(null)}
          >
            <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>Toutes</Text>
          </TouchableOpacity>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, statusFilter === key && styles.filterChipActive]}
              onPress={() => setStatusFilter(key)}
            >
              <View style={[styles.filterDot, { backgroundColor: config.color }]} />
              <Text style={[styles.filterText, statusFilter === key && styles.filterTextActive]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {orderList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucune commande</Text>
            <Text style={styles.emptyText}>Créez votre première commande fournisseur</Text>
          </View>
        ) : (
          orderList.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const canAdvance = !!NEXT_STATUS[order.status];
            const canCancel = order.status === 'pending' || order.status === 'confirmed';

            return (
              <TouchableOpacity
                key={order.order_id}
                style={styles.orderCard}
                activeOpacity={0.7}
                onPress={() => openDetailModal(order.order_id)}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderSupplier}>{order.supplier_name}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
                    <Ionicons name={config.icon} size={14} color={config.color} />
                    <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <View style={styles.orderDetail}>
                    <Text style={styles.orderDetailLabel}>Articles</Text>
                    <Text style={styles.orderDetailValue}>{order.items_count}</Text>
                  </View>
                  <View style={styles.orderDetail}>
                    <Text style={styles.orderDetailLabel}>Total</Text>
                    <Text style={styles.orderDetailValue}>{order.total_amount.toLocaleString()} FCFA</Text>
                  </View>
                </View>

                {order.notes ? (
                  <Text style={styles.orderNotes}>{order.notes}</Text>
                ) : null}

                <View style={styles.orderActions}>
                  {canAdvance && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={(e) => { e.stopPropagation(); handleAdvanceStatus(order.order_id, order.status); }}
                    >
                      <Ionicons name="arrow-forward-circle-outline" size={16} color={colors.success} />
                      <Text style={[styles.actionText, { color: colors.success }]}>
                        {STATUS_CONFIG[NEXT_STATUS[order.status]]?.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={(e) => { e.stopPropagation(); handleCancel(order.order_id); }}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={[styles.actionText, { color: colors.danger }]}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Create Order Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {createStep === 'supplier' ? 'Choisir un fournisseur' : 'Articles de la commande'}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {createStep === 'supplier' ? (
              <ScrollView style={styles.modalScroll}>
                {suppliersList.length === 0 ? (
                  <Text style={styles.emptyLinked}>Aucun fournisseur. Ajoutez-en d'abord.</Text>
                ) : (
                  suppliersList.map((sup) => (
                    <TouchableOpacity
                      key={sup.supplier_id}
                      style={[
                        styles.supplierSelect,
                        selectedSupplierId === sup.supplier_id && styles.supplierSelectActive,
                      ]}
                      onPress={() => selectSupplier(sup.supplier_id)}
                    >
                      <Ionicons name="person-circle-outline" size={28} color={colors.primaryLight} />
                      <View style={styles.supplierSelectInfo}>
                        <Text style={styles.supplierSelectName}>{sup.name}</Text>
                        {sup.products_supplied ? (
                          <Text style={styles.supplierSelectSub} numberOfLines={1}>
                            {sup.products_supplied}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {/* Items list */}
                {orderItems.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetail}>
                        {item.quantity} x {parseFloat(item.unit_price).toLocaleString()} FCFA ={' '}
                        {((parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString()} FCFA
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Ionicons name="close-circle" size={22} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addItemBtn} onPress={openAddItem}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addItemText}>Ajouter un article</Text>
                </TouchableOpacity>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes (optionnel)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={orderNotes}
                    onChangeText={setOrderNotes}
                    placeholder="Remarques sur la commande"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total :</Text>
                  <Text style={styles.totalValue}>{getTotal().toLocaleString()} FCFA</Text>
                </View>

                <View style={styles.createActions}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setCreateStep('supplier')}
                  >
                    <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                    <Text style={styles.backBtnText}>Retour</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, (orderItems.length === 0 || formLoading) && styles.submitBtnDisabled]}
                    onPress={handleCreateOrder}
                    disabled={orderItems.length === 0 || formLoading}
                  >
                    {formLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Valider la commande</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Order Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail de la commande</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : detailOrder ? (
              <ScrollView style={styles.modalScroll}>
                {/* Supplier info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Fournisseur</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="person-circle-outline" size={20} color={colors.primaryLight} />
                    <Text style={styles.detailRowText}>{detailOrder.supplier.name}</Text>
                  </View>
                  {detailOrder.supplier.phone ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.detailRowSubtext}>{detailOrder.supplier.phone}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Status */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_CONFIG[detailOrder.status]?.color || colors.warning) + '20', alignSelf: 'flex-start' }]}>
                    <Ionicons name={STATUS_CONFIG[detailOrder.status]?.icon || 'time-outline'} size={14} color={STATUS_CONFIG[detailOrder.status]?.color || colors.warning} />
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[detailOrder.status]?.color || colors.warning }]}>
                      {STATUS_CONFIG[detailOrder.status]?.label || detailOrder.status}
                    </Text>
                  </View>
                </View>

                {/* Dates */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Dates</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowSubtext}>Créée le : {formatDate(detailOrder.created_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowSubtext}>Mise à jour : {formatDate(detailOrder.updated_at)}</Text>
                  </View>
                  {detailOrder.expected_delivery ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowSubtext}>Livraison prévue : {formatDate(detailOrder.expected_delivery)}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Items */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Articles ({detailOrder.items.length})</Text>
                  {detailOrder.items.map((item, index) => (
                    <View key={item.item_id || index} style={styles.detailItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailItemName}>{item.product?.name || 'Produit'}</Text>
                        <Text style={styles.detailItemSub}>
                          {item.quantity} x {item.unit_price.toLocaleString()} FCFA
                        </Text>
                      </View>
                      <Text style={styles.detailItemTotal}>{item.total_price.toLocaleString()} FCFA</Text>
                    </View>
                  ))}
                </View>

                {/* Notes */}
                {detailOrder.notes ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Notes</Text>
                    <Text style={styles.detailNotes}>{detailOrder.notes}</Text>
                  </View>
                ) : null}

                {/* Total */}
                <View style={[styles.totalRow, { marginTop: Spacing.sm }]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{detailOrder.total_amount.toLocaleString()} FCFA</Text>
                </View>

                {/* Rating button for delivered connected orders */}
                {detailOrder.status === 'delivered' && detailOrder.is_connected && detailOrder.supplier_user_id && (
                  <TouchableOpacity style={styles.rateBtn} onPress={() => openRating(detailOrder)}>
                    <Ionicons name="star-outline" size={20} color={colors.warning} />
                    <Text style={styles.rateBtnText}>Noter ce fournisseur</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Noter le fournisseur</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                  <Ionicons
                    name={star <= ratingScore ? 'star' : 'star-outline'}
                    size={40}
                    color={colors.warning}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {ratingScore === 0 ? 'Touchez une étoile' : `${ratingScore}/5`}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Commentaire (optionnel)</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={ratingComment}
                onChangeText={setRatingComment}
                placeholder="Partagez votre expérience..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (ratingScore === 0 || ratingSaving) && styles.submitBtnDisabled]}
              onPress={submitRating}
              disabled={ratingScore === 0 || ratingSaving}
            >
              {ratingSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Envoyer mon avis</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAddItemModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un article</Text>
              <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Quantité</Text>
                <TextInput
                  style={styles.formInput}
                  value={itemQuantity}
                  onChangeText={setItemQuantity}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Prix unitaire</Text>
                <TextInput
                  style={styles.formInput}
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.formLabel, { marginTop: Spacing.md }]}>Produit :</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {productsList.map((prod) => (
                <TouchableOpacity
                  key={prod.product_id}
                  style={[
                    styles.productOption,
                    itemProductId === prod.product_id && styles.productOptionActive,
                  ]}
                  onPress={() => {
                    setItemProductId(prod.product_id);
                    if (!itemPrice) setItemPrice(String(prod.purchase_price));
                  }}
                >
                  <Text
                    style={[
                      styles.productOptionText,
                      itemProductId === prod.product_id && styles.productOptionTextActive,
                    ]}
                  >
                    {prod.name}
                  </Text>
                  <Text style={styles.productOptionPrice}>{prod.purchase_price.toLocaleString()} FCFA</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, (!itemProductId || !itemQuantity) && styles.submitBtnDisabled]}
              onPress={confirmAddItem}
              disabled={!itemProductId || !itemQuantity}
            >
              <Text style={styles.submitBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
  },
  pageTitle: { fontSize: FontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: Spacing.xs },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  filterScroll: { marginBottom: Spacing.md },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.glassBorder, marginRight: Spacing.sm,
  },
  filterChipActive: { backgroundColor: colors.primary + '30', borderColor: colors.primary },
  filterDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.xs },
  filterText: { color: colors.textSecondary, fontSize: FontSize.sm },
  filterTextActive: { color: colors.primaryLight, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: Spacing.xs },
  orderCard: { ...glassStyle, padding: Spacing.md, marginBottom: Spacing.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  orderInfo: { flex: 1 },
  orderSupplier: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  orderDate: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  orderDetails: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm },
  orderDetail: {},
  orderDetailLabel: { fontSize: FontSize.xs, color: colors.textMuted },
  orderDetailValue: { fontSize: FontSize.md, fontWeight: '600', color: colors.text, marginTop: 2 },
  orderNotes: { fontSize: FontSize.sm, color: colors.textSecondary, fontStyle: 'italic', marginBottom: Spacing.sm },
  orderActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: FontSize.xs, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.bgMid, borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  modalScroll: { maxHeight: 500 },
  emptyLinked: { fontSize: FontSize.sm, color: colors.textMuted, padding: Spacing.md, textAlign: 'center' },
  supplierSelect: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.divider, marginBottom: Spacing.sm,
    backgroundColor: colors.inputBg,
  },
  supplierSelectActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  supplierSelectInfo: { flex: 1 },
  supplierSelectName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  supplierSelectSub: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  itemDetail: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.primary + '40', borderStyle: 'dashed',
    marginVertical: Spacing.md,
  },
  addItemText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
  formGroup: { marginBottom: Spacing.md },
  formLabel: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  formInput: {
    backgroundColor: colors.inputBg, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.divider, color: colors.text,
    fontSize: FontSize.md, padding: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    ...glassStyle, padding: Spacing.md, marginBottom: Spacing.md,
  },
  totalLabel: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  totalValue: { fontSize: FontSize.xl, fontWeight: '700', color: colors.success },
  createActions: { flexDirection: 'row', gap: Spacing.sm },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider,
  },
  backBtnText: { color: colors.textSecondary, fontSize: FontSize.sm },
  submitBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
  productOption: {
    padding: Spacing.sm, borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: colors.divider, marginBottom: Spacing.xs,
    backgroundColor: colors.inputBg, flexDirection: 'row', justifyContent: 'space-between',
  },
  productOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  productOptionText: { fontSize: FontSize.md, color: colors.text },
  productOptionTextActive: { color: colors.primaryLight, fontWeight: '600' },
  productOptionPrice: { fontSize: FontSize.sm, color: colors.textMuted },
  // Detail modal
  detailSection: { marginBottom: Spacing.md },
  detailSectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: colors.primaryLight, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  detailRowText: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  detailRowSubtext: { fontSize: FontSize.sm, color: colors.textSecondary },
  detailItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailItemName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  detailItemSub: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  detailItemTotal: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  detailNotes: { fontSize: FontSize.sm, color: colors.textSecondary, fontStyle: 'italic' },
  // Rating
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.warning + '20',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  rateBtnText: {
    color: colors.warning,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: FontSize.md,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
});
