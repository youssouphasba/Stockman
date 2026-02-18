import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  orders as ordersApi,
  ratings as ratingsApi,
  suppliers as suppliersApi,
  products as productsApi,
  returns as returnsApi,
  creditNotes as creditNotesApi,
  stores as storesApi,
  ai as aiApi,
  OrderWithDetails,
  OrderFull,
  Supplier,
  Product,
  ReturnData,
  ReturnItem,
  CreditNote,
  Store,
  InvoiceScanResult,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import OrderCreationModal from '../../components/OrderCreationModal';
import OrderStatusProgressBar from '../../components/OrderStatusProgressBar';
import DeliveryConfirmationModal from '../../components/DeliveryConfirmationModal';
import PeriodSelector, { Period } from '../../components/PeriodSelector';
import { generateAndSharePdf, generatePurchaseOrderPdf } from '../../utils/pdfReports';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import PremiumGate from '../../components/PremiumGate';

export default function OrdersScreen() {
  const { colors, glassStyle } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pending: { label: t('orders.pending'), color: colors.warning, icon: 'time-outline' },
    confirmed: { label: t('orders.confirmed'), color: colors.secondary, icon: 'checkmark-circle-outline' },
    shipped: { label: t('orders.shipped'), color: colors.info, icon: 'airplane-outline' },
    partially_delivered: { label: t('orders.partially_delivered'), color: '#FF9800', icon: 'layers-outline' },
    delivered: { label: t('orders.delivered'), color: colors.success, icon: 'checkmark-done-outline' },
    cancelled: { label: t('orders.cancelled'), color: colors.danger, icon: 'close-circle-outline' },
  };

  const NEXT_STATUS: Record<string, string> = {
    pending: 'confirmed',
    confirmed: 'shipped',
    shipped: 'delivered',
    partially_delivered: 'delivered',
  };

  const [orderList, setOrderList] = useState<OrderWithDetails[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('orders');

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(30);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStart, setAppliedStart] = useState<string>('');
  const [appliedEnd, setAppliedEnd] = useState<string>('');
  const [filterSuppliers, setFilterSuppliers] = useState<any[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderFull | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllDetailItems, setShowAllDetailItems] = useState(false);

  // Create order modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // AI Invoice Scanner
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<InvoiceScanResult | null>(null);
  const [showScanResult, setShowScanResult] = useState(false);

  // Delivery confirmation modal (marketplace)
  const [deliveryOrderId, setDeliveryOrderId] = useState<string | null>(null);

  // Rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingOrderId, setRatingOrderId] = useState('');
  const [ratingSupplierUserId, setRatingSupplierUserId] = useState('');
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Partial delivery modal
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialOrder, setPartialOrder] = useState<OrderFull | null>(null);
  const [partialQuantities, setPartialQuantities] = useState<Record<string, string>>({});
  const [partialNotes, setPartialNotes] = useState('');
  const [partialSaving, setPartialSaving] = useState(false);

  // Main tab: 'orders' | 'returns'
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');

  // Returns
  const [returnsList, setReturnsList] = useState<ReturnData[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [creditNotesList, setCreditNotesList] = useState<CreditNote[]>([]);

  // Create return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnType, setReturnType] = useState<'supplier' | 'customer'>('supplier');
  const [returnOrderId, setReturnOrderId] = useState('');
  const [returnSupplierId, setReturnSupplierId] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnProducts, setReturnProducts] = useState<Product[]>([]);
  const [returnProductSearch, setReturnProductSearch] = useState('');

  // Return detail
  const [showReturnDetailModal, setShowReturnDetailModal] = useState(false);
  const [returnDetail, setReturnDetail] = useState<ReturnData | null>(null);
  const [completingReturn, setCompletingReturn] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const start = selectedPeriod === 'custom' ? appliedStart : undefined;
      const end = selectedPeriod === 'custom' ? appliedEnd : undefined;
      const days = typeof selectedPeriod === 'number' ? selectedPeriod : undefined;

      // Note: Backend handle 'days' if start_date/end_date are absent. 
      // But we can just convert everything to dates for consistency if preferred.
      // For now, let's just pass start/end if custom is selected.

      const [ordersRes, storesRes] = await Promise.all([
        ordersApi.list(
          statusFilter ?? undefined,
          supplierFilter ?? undefined,
          start || (days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : undefined),
          end
        ),
        storesApi.list()
      ]);

      setOrderList(ordersRes.items ?? ordersRes as any);

      const stores = storesRes as any;
      if (user?.active_store_id) {
        const active = stores.find((s: any) => s.store_id === user.active_store_id);
        if (active) setCurrentStore(active);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, supplierFilter, selectedPeriod, appliedStart, appliedEnd]);

  const changePeriod = (period: Period) => {
    if (period !== 'custom') {
      setAppliedStart('');
      setAppliedEnd('');
    }
    setSelectedPeriod(period);
  };

  const handleApplyCustomDates = (start: string, end: string) => {
    setAppliedStart(start);
    setAppliedEnd(end);
    setLoading(true);
  };

  const loadSuppliers = useCallback(async () => {
    setSuppliersLoading(true);
    try {
      const result = await ordersApi.getFilterSuppliers();
      setFilterSuppliers(result);
    } catch {
      // silently fail
    } finally {
      setSuppliersLoading(false);
    }
  }, []);

  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try {
      const [retRes, cnRes] = await Promise.all([
        returnsApi.list(),
        creditNotesApi.list(),
      ]);
      setReturnsList(retRes.items ?? retRes as any);
      setCreditNotesList(cnRes.items ?? cnRes as any);
    } catch {
      // silently fail
    } finally {
      setReturnsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSuppliers();
      loadReturns();
    }, [loadData, loadSuppliers, loadReturns])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  async function openDetailModal(orderId: string) {
    setShowDetailModal(true);
    setDetailLoading(true);
    setShowAllDetailItems(false);
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

  async function handleAdvanceStatus(orderId: string, currentStatus: string, isConnected?: boolean) {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    // For marketplace orders going to "delivered", open delivery confirmation modal
    if (next === 'delivered' && isConnected) {
      setDeliveryOrderId(orderId);
      return;
    }

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

  async function openPartialDelivery(orderId: string) {
    try {
      const order = await ordersApi.get(orderId);
      setPartialOrder(order);
      const initQtys: Record<string, string> = {};
      for (const item of order.items || []) {
        const received = order.received_items?.[item.item_id] ?? 0;
        initQtys[item.item_id] = received.toString();
      }
      setPartialQuantities(initQtys);
      setPartialNotes('');
      setShowPartialModal(true);
    } catch {
      RNAlert.alert('Erreur', 'Impossible de charger la commande');
    }
  }

  async function submitPartialDelivery() {
    if (!partialOrder) return;

    const performSubmit = async () => {
      setPartialSaving(true);
      try {
        const items = Object.entries(partialQuantities).map(([item_id, qty]) => ({
          item_id,
          received_quantity: parseInt(qty) || 0,
        }));
        await ordersApi.receivePartial(partialOrder.order_id, items, partialNotes || undefined);
        setShowPartialModal(false);
        setShowDetailModal(false);
        loadData();
      } catch {
        RNAlert.alert('Erreur', 'Impossible d\'enregistrer la réception');
      } finally {
        setPartialSaving(false);
      }
    };

    const msg = t('orders.confirm_partial_delivery');

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        await performSubmit();
      }
    } else {
      RNAlert.alert(
        t('orders.confirmation'),
        msg,
        [
          { text: t('common.cancel'), style: "cancel" },
          { text: t('common.confirm'), onPress: performSubmit }
        ]
      );
    }
  }

  async function openCreateReturn(fromOrder?: OrderFull) {
    try {
      const prodsRes = await productsApi.list();
      setReturnProducts(prodsRes.items ?? prodsRes as any);
    } catch { /* ignore */ }

    if (fromOrder) {
      setReturnType('supplier');
      setReturnOrderId(fromOrder.order_id);
      setReturnSupplierId(fromOrder.supplier_id);
      setReturnItems(
        fromOrder.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product?.name || item.product_name || 'Produit',
          quantity: 0,
          unit_price: item.unit_price,
          reason: '',
        }))
      );
    } else {
      setReturnType('supplier');
      setReturnOrderId('');
      setReturnSupplierId('');
      setReturnItems([]);
    }
    setReturnNotes('');
    setShowReturnModal(true);
  }

  function addReturnProduct(product: Product) {
    if (returnItems.find((i) => i.product_id === product.product_id)) return;
    setReturnItems((prev) => [
      ...prev,
      { product_id: product.product_id, product_name: product.name, quantity: 1, unit_price: product.selling_price, reason: '' },
    ]);
    setReturnProductSearch('');
  }

  function updateReturnItem(index: number, field: keyof ReturnItem, value: any) {
    setReturnItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function removeReturnItem(index: number) {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitReturn() {
    const validItems = returnItems.filter((i) => i.quantity > 0);
    if (validItems.length === 0) {
      RNAlert.alert(t('common.error'), t('orders.add_at_least_one_item'));
      return;
    }
    setReturnSaving(true);
    try {
      await returnsApi.create({
        order_id: returnOrderId || undefined,
        supplier_id: returnSupplierId || undefined,
        items: validItems,
        type: returnType,
        notes: returnNotes || undefined,
      });
      setShowReturnModal(false);
      loadReturns();
      RNAlert.alert(t('common.success'), t('orders.return_created_success'));
    } catch (error) {
      console.error(error);
      RNAlert.alert(t('common.error'), t('orders.create_return_error'));
    } finally {
      setReturnSaving(false);
    }
  }

  async function openReturnDetail(returnId: string) {
    try {
      const ret = await returnsApi.get(returnId);
      setReturnDetail(ret);
      setShowReturnDetailModal(true);
    } catch {
      RNAlert.alert('Erreur', 'Impossible de charger le retour');
    }
  }

  async function handleShareOrderPdf(order: OrderFull) {
    if (!currentStore) {
      RNAlert.alert(t('common.error'), t('orders.store_config_missing'));
      return;
    }
    setSharingPdf(true);
    try {
      await generatePurchaseOrderPdf(order, currentStore, user?.currency);
    } catch (error) {
      console.error(error);
      alert(t('orders.pdf_error'));
    } finally {
      setSharingPdf(false);
    }
  }

  async function completeReturn(returnId: string) {
    const performComplete = async () => {
      setCompletingReturn(true);
      try {
        const result = await returnsApi.complete(returnId);
        RNAlert.alert(t('common.success'), t('orders.return_completed_credit_note_generated'));
        setShowReturnDetailModal(false);
        loadReturns();
      } catch (error) {
        console.error(error);
        RNAlert.alert(t('common.error'), t('orders.complete_return_error'));
      } finally {
        setCompletingReturn(false);
      }
    };

    const msg = t('orders.confirm_complete_return');

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        await performComplete();
      }
    } else {
      RNAlert.alert(
        t('orders.confirmation'),
        msg,
        [
          { text: t('common.cancel'), style: "cancel" },
          { text: t('common.confirm'), onPress: performComplete }
        ]
      );
    }
  }

  async function handleScanInvoice() {
    RNAlert.alert(
      'Scanner une facture',
      "Prenez en photo une facture fournisseur. L'IA extraira automatiquement les articles.",
      [
        {
          text: 'Caméra',
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) return;
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              processInvoiceImage(result.assets[0].base64);
            }
          },
        },
        {
          text: 'Galerie',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
              base64: true,
            });
            if (!result.canceled && result.assets[0].base64) {
              processInvoiceImage(result.assets[0].base64);
            }
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  async function processInvoiceImage(base64: string) {
    setScanLoading(true);
    try {
      const result = await aiApi.scanInvoice(base64);
      if (result.error || !result.items || result.items.length === 0) {
        RNAlert.alert('Résultat', "Aucun article détecté sur cette image. Essayez avec une photo plus nette.");
        return;
      }
      setScanResult(result);
      setShowScanResult(true);
    } catch {
      RNAlert.alert('Erreur', "Impossible d'analyser la facture");
    } finally {
      setScanLoading(false);
    }
  }

  async function exportOrdersPdf() {
    const statusLabels: Record<string, string> = {
      pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée',
      partially_delivered: 'Partielle', delivered: 'Livrée', cancelled: 'Annulée',
    };
    const totalAmount = orderList.reduce((s, o) => s + o.total_amount, 0);
    const delivered = orderList.filter((o) => o.status === 'delivered').length;
    const pending = orderList.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;

    try {
      await generateAndSharePdf({
        storeName: 'Mon Commerce',
        reportTitle: 'RAPPORT DES COMMANDES',
        subtitle: `${orderList.length} commandes`,
        kpis: [
          { label: 'Total commandes', value: orderList.length.toString() },
          { label: 'Montant total', value: formatCurrency(totalAmount, user?.currency) },
          { label: 'Livrées', value: delivered.toString(), color: '#4CAF50' },
          { label: 'En cours', value: pending.toString(), color: '#FF9800' },
        ],
        sections: [{
          title: 'Liste des commandes',
          headers: ['Date', 'Fournisseur', 'Articles', 'Statut', 'Montant'],
          alignRight: [4],
          rows: orderList.map((o) => [
            new Date(o.created_at).toLocaleDateString('fr-FR'),
            o.supplier_name,
            o.items_preview?.join(', ') || '...',
            statusLabels[o.status] || o.status,
            formatCurrency(o.total_amount, user?.currency),
          ]),
        }],
      });
    } catch {
      RNAlert.alert('Erreur', 'Impossible de générer le PDF');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  const isLocked = user?.plan !== 'premium';

  if (loading && !isLocked) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <ScreenGuide
          visible={showGuide}
          onClose={() => { setShowGuide(false); markSeen(); }}
          title={GUIDES.orders.title}
          steps={GUIDES.orders.steps}
        />
      </LinearGradient>
    );
  }

  return (
    <PremiumGate
      featureName={t('premium.features.orders.title')}
      description={t('premium.features.orders.desc')}
      benefits={t('premium.features.orders.benefits', { returnObjects: true }) as string[]}
      icon="cart-outline"
      locked={isLocked}
    >
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={[styles.headerRow, { paddingTop: insets.top }]}>
            <View>
              <Text style={styles.pageTitle}>{t('orders.title')}</Text>
              <Text style={styles.subtitle}>
                {activeTab === 'orders'
                  ? t('orders.orders_count', { count: orderList.length })
                  : t('orders.returns_count', { count: returnsList.length })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]}
                onPress={handleScanInvoice}
                disabled={scanLoading}
              >
                {scanLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="scan-outline" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={exportOrdersPdf}>
                <Ionicons name="document-text-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowGuide(true)}>
                <Ionicons name="help-circle-outline" size={24} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => activeTab === 'orders' ? setShowCreateModal(true) : openCreateReturn()}
              >
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab switcher */}
          <View style={{ flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm }}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeTab === 'orders' && styles.filterChipActive,
                { flex: 1, justifyContent: 'center' },
              ]}
              onPress={() => setActiveTab('orders')}
            >
              <Ionicons name="cart-outline" size={16} color={activeTab === 'orders' ? colors.primaryLight : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.filterText, activeTab === 'orders' && styles.filterTextActive]}>{t('orders.title')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeTab === 'returns' && styles.filterChipActive,
                { flex: 1, justifyContent: 'center' },
              ]}
              onPress={() => { setActiveTab('returns'); loadReturns(); }}
            >
              <Ionicons name="return-down-back-outline" size={16} color={activeTab === 'returns' ? colors.primaryLight : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.filterText, activeTab === 'returns' && styles.filterTextActive]}>{t('orders.returns_credit_notes')}</Text>
              {returnsList.filter((r) => r.status === 'pending').length > 0 && (
                <View style={{ backgroundColor: colors.warning, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                    {returnsList.filter((r) => r.status === 'pending').length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {activeTab === 'orders' && (<>
            {/* Date Filter */}
            <View style={{ marginBottom: Spacing.md, paddingHorizontal: Spacing.xs }}>
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onSelectPeriod={changePeriod}
                startDate={startDate}
                endDate={endDate}
                onApplyCustomDate={handleApplyCustomDates}
              />
            </View>

            {/* Status filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['all', 'pending', 'confirmed', 'shipping', 'received', 'cancelled'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                  onPress={() => setStatusFilter(f as any)}
                >
                  <Text style={[styles.filterText, statusFilter === f && styles.filterTextActive]}>
                    {t(`orders.${f}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Supplier filter */}
            {filterSuppliers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, !supplierFilter && styles.filterChipActive]}
                  onPress={() => setSupplierFilter(null)}
                >
                  <Ionicons name="people-outline" size={14} color={!supplierFilter ? colors.primaryLight : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.filterText, !supplierFilter && styles.filterTextActive]}>{t('orders.all_suppliers')}</Text>
                </TouchableOpacity>
                {filterSuppliers.map((sup) => (
                  <TouchableOpacity
                    key={sup.id}
                    style={[styles.filterChip, supplierFilter === sup.id && styles.filterChipActive]}
                    onPress={() => setSupplierFilter(sup.id)}
                  >
                    {sup.is_connected && <Ionicons name="cart" size={12} color={supplierFilter === sup.id ? colors.primaryLight : colors.textMuted} style={{ marginRight: 4 }} />}
                    <Text style={[styles.filterText, supplierFilter === sup.id && styles.filterTextActive]}>
                      {sup.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {suppliersLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 10 }} />}
              </ScrollView>
            )}

            {/* Supplier Summary Card */}
            {supplierFilter && orderList.length > 0 && (
              <View style={[styles.summaryCard, { backgroundColor: colors.primary + '10' }]}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryTitle}>Synthèse : {orderList[0].supplier_name}</Text>
                    <Text style={styles.summarySubtitle}>Aperçu des commandes passées</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.summaryClearBtn}
                    onPress={() => setSupplierFilter(null)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryStats}>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>Volume total</Text>
                    <Text style={[styles.summaryStatValue, { color: colors.primaryLight }]}>
                      {formatCurrency(orderList.reduce((acc, o) => acc + o.total_amount, 0), user?.currency)}
                    </Text>
                  </View>
                  <View style={styles.summaryStatDivider} />
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>Commandes</Text>
                    <Text style={styles.summaryStatValue}>{orderList.length}</Text>
                  </View>
                  <View style={styles.summaryStatDivider} />
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>Dernière act.</Text>
                    <Text style={styles.summaryStatValue}>
                      {new Date(Math.max(...orderList.map(o => new Date(o.created_at).getTime()))).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.historyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowHistoryModal(true)}
                >
                  <Ionicons name="list" size={18} color="#FFF" />
                  <Text style={styles.historyBtnText}>Voir l'historique détaillé</Text>
                </TouchableOpacity>
              </View>
            )}

            {orderList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('orders.no_orders')}</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'orders'
                    ? t('orders.no_orders_desc')
                    : t('orders.no_orders_bulk_desc')}
                </Text>
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

                    <OrderStatusProgressBar status={order.status} />

                    <View style={styles.orderDetails}>
                      <View style={styles.orderDetail}>
                        <Text style={styles.orderDetailLabel}>Articles</Text>
                        <Text style={styles.orderDetailValue}>
                          {order.items_preview?.join(', ') || '...'}
                        </Text>
                      </View>
                      <View style={styles.orderDetail}>
                        <Text style={styles.orderDetailLabel}>Total</Text>
                        <Text style={styles.orderDetailValue}>{formatCurrency(order.total_amount, user?.currency)}</Text>
                      </View>
                    </View>

                    {order.notes ? (
                      <Text style={styles.orderNotes}>{order.notes}</Text>
                    ) : null}

                    <View style={styles.orderActions}>
                      {order.status === 'shipped' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.success + '20', padding: 8, borderRadius: 8 }]}
                          onPress={() => handleAdvanceStatus(order.order_id, order.status, order.is_connected)}
                        >
                          <Ionicons name="checkmark-done-outline" size={16} color={colors.success} />
                          <Text style={[styles.actionText, { color: colors.success }]}>Valider la réception</Text>
                        </TouchableOpacity>
                      )}
                      {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'shipped' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleAdvanceStatus(order.order_id, order.status, order.is_connected)}>
                          <Ionicons name="arrow-forward-outline" size={16} color={colors.primary} />
                          <Text style={[styles.actionText, { color: colors.primary }]}>
                            {order.status === 'pending' ? 'Confirmer' : 'Suivant'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {['shipped', 'partially_delivered'].includes(order.status) && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#FF9800' + '20', padding: 8, borderRadius: 8 }]}
                          onPress={() => openPartialDelivery(order.order_id)}
                        >
                          <Ionicons name="layers-outline" size={16} color="#FF9800" />
                          <Text style={[styles.actionText, { color: '#FF9800' }]}>Partielle</Text>
                        </TouchableOpacity>
                      )}
                      {order.status === 'pending' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancel(order.order_id)}>
                          <Ionicons name="close-outline" size={16} color={colors.danger} />
                          <Text style={[styles.actionText, { color: colors.danger }]}>Annuler</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

          </>)}

          {/* Returns Tab */}
          {activeTab === 'returns' && (
            <>
              {/* Credit Notes Summary */}
              {creditNotesList.length > 0 && (
                <View style={[styles.summaryCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
                  <View style={styles.summaryHeader}>
                    <View>
                      <Text style={styles.summaryTitle}>{t('orders.active_credit_notes')}</Text>
                      <Text style={styles.summarySubtitle}>
                        {t('orders.credit_notes_count', { count: creditNotesList.filter((cn) => cn.status === 'active').length })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.summaryStatValue, { color: colors.success }]}>
                        {formatCurrency(creditNotesList.filter((cn) => cn.status === 'active').reduce((sum, cn) => sum + cn.amount - cn.used_amount, 0), user?.currency)}
                      </Text>
                      <Text style={[styles.summarySubtitle]}>{t('orders.available')}</Text>
                    </View>
                  </View>
                </View>
              )}

              {returnsLoading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xl }} />
              ) : returnsList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="return-down-back-outline" size={64} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>{t('orders.no_returns')}</Text>
                  <Text style={styles.emptyText}>{t('orders.no_returns_desc')}</Text>
                </View>
              ) : (
                returnsList.map((ret) => {
                  const statusMap: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
                    pending: { label: t('orders.pending'), color: colors.warning, icon: 'time-outline' },
                    approved: { label: t('orders.approved'), color: colors.info, icon: 'checkmark-outline' },
                    completed: { label: t('orders.completed'), color: colors.success, icon: 'checkmark-done-outline' },
                    rejected: { label: t('orders.rejected'), color: colors.danger, icon: 'close-outline' },
                  };
                  const sc = statusMap[ret.status] || statusMap.pending;

                  return (
                    <TouchableOpacity
                      key={ret.return_id}
                      style={styles.orderCard}
                      activeOpacity={0.7}
                      onPress={() => openReturnDetail(ret.return_id)}
                    >
                      <View style={styles.orderHeader}>
                        <View style={styles.orderInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={ret.type === 'customer' ? 'person-outline' : 'business-outline'}
                              size={16}
                              color={colors.primaryLight}
                            />
                            <Text style={styles.orderSupplier}>
                              {ret.type === 'customer' ? 'Retour client' : ret.supplier_name || 'Retour fournisseur'}
                            </Text>
                          </View>
                          <Text style={styles.orderDate}>{formatDate(ret.created_at)}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: sc.color + '20' }]}>
                          <Ionicons name={sc.icon} size={14} color={sc.color} />
                          <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                      </View>

                      <View style={styles.orderDetails}>
                        <View style={styles.orderDetail}>
                          <Text style={styles.orderDetailLabel}>Articles</Text>
                          <Text style={styles.orderDetailValue}>{ret.items.length}</Text>
                        </View>
                        <View style={styles.orderDetail}>
                          <Text style={styles.orderDetailLabel}>Montant</Text>
                          <Text style={styles.orderDetailValue}>{formatCurrency(ret.total_amount, user?.currency)}</Text>
                        </View>
                        {ret.credit_note_id && (
                          <View style={styles.orderDetail}>
                            <Text style={styles.orderDetailLabel}>Avoir</Text>
                            <Text style={[styles.orderDetailValue, { color: colors.success }]}>Généré</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          )}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>

        {/* Order Creation Modal (3-step flow) */}
        <OrderCreationModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onOrderCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />

        {/* AI Invoice Scan Result Modal */}
        <Modal visible={showScanResult} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Facture scannée</Text>
                <TouchableOpacity onPress={() => setShowScanResult(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              {scanResult && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md }}>
                  {/* Header info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm }}>
                    <Ionicons name="sparkles" size={13} color={colors.primary} />
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>Extraction IA</Text>
                  </View>
                  {scanResult.supplier_name && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Fournisseur :</Text>
                      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{scanResult.supplier_name}</Text>
                    </View>
                  )}
                  {scanResult.invoice_number && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>N° facture :</Text>
                      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{scanResult.invoice_number}</Text>
                    </View>
                  )}
                  {scanResult.date && (
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Date :</Text>
                      <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{scanResult.date}</Text>
                    </View>
                  )}

                  {/* Items */}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: Spacing.xs }}>
                    {scanResult.items.length} article{scanResult.items.length > 1 ? 's' : ''} détecté{scanResult.items.length > 1 ? 's' : ''}
                  </Text>
                  {scanResult.items.map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: Spacing.xs,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {item.quantity} x {(item.unit_price || 0).toLocaleString()} {t('common.currency_default')}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>
                        {(item.total || item.quantity * item.unit_price || 0).toLocaleString()} {t('common.currency_short')}
                      </Text>
                    </View>
                  ))}

                  {/* Total */}
                  {scanResult.total_amount != null && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, marginTop: Spacing.xs }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Total</Text>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{scanResult.total_amount.toLocaleString()} {t('common.currency_default')}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: BorderRadius.md,
                      padding: Spacing.md,
                      alignItems: 'center',
                      marginTop: Spacing.lg,
                    }}
                    onPress={() => {
                      setShowScanResult(false);
                      setShowCreateModal(true);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Créer une commande</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.xs }}>
                    Les articles détectés serviront de référence pour votre commande
                  </Text>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Delivery Confirmation Modal (marketplace orders) */}
        <DeliveryConfirmationModal
          visible={!!deliveryOrderId}
          orderId={deliveryOrderId || ''}
          onClose={() => setDeliveryOrderId(null)}
          onConfirmed={() => {
            setDeliveryOrderId(null);
            setShowDetailModal(false);
            loadData();
          }}
        />

        {/* Order Detail Modal */}
        <Modal visible={showDetailModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('orders.order_detail')}</Text>
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
                    <Text style={styles.detailSectionTitle}>{t('orders.supplier')}</Text>
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

                  {/* Status progress */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('orders.status')}</Text>
                    <OrderStatusProgressBar status={detailOrder.status} />
                  </View>

                  {/* Dates */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('orders.dates')}</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowSubtext}>{t('orders.created_at')} : {formatDate(detailOrder.created_at)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowSubtext}>{t('orders.updated_at')} : {formatDate(detailOrder.updated_at)}</Text>
                    </View>
                    {detailOrder.expected_delivery ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowSubtext}>{t('orders.expected_delivery')} : {formatDate(detailOrder.expected_delivery)}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Items */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('orders.items_count', { count: detailOrder.items.length })}</Text>
                    <View>
                      {(showAllDetailItems ? detailOrder.items : detailOrder.items.slice(0, 10)).map((item, index) => (
                        <View key={item.item_id || index} style={styles.detailItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.detailItemName}>
                              {item.product?.name || item.product_name || 'Produit'}
                            </Text>
                            <Text style={styles.detailItemSub}>
                              {item.quantity} x {formatCurrency(item.unit_price, user?.currency)}
                            </Text>
                            {item.mapped_product_id && (
                              <Text style={[styles.detailItemSub, { color: colors.success }]}>
                                Associé au stock local
                              </Text>
                            )}
                            {detailOrder.received_items && detailOrder.received_items[item.item_id] != null && (
                              <Text style={[styles.detailItemSub, { color: '#FF9800' }]}>
                                Reçu : {detailOrder.received_items[item.item_id]} / {item.quantity}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.detailItemTotal}>{formatCurrency(item.total_price, user?.currency)}</Text>
                        </View>
                      ))}
                      {detailOrder.items.length > 10 && (
                        <TouchableOpacity
                          style={styles.seeMoreBtn}
                          onPress={() => setShowAllDetailItems(!showAllDetailItems)}
                        >
                          <Text style={styles.seeMoreText}>
                            {showAllDetailItems ? t('common.see_less') : t('orders.see_more_items', { count: detailOrder.items.length - 10 })}
                          </Text>
                          <Ionicons name={showAllDetailItems ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
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
                    <Text style={styles.totalValue}>{formatCurrency(detailOrder.total_amount, user?.currency)}</Text>
                  </View>

                  {/* PDF Share Button */}
                  <TouchableOpacity
                    style={[styles.sharePdfBtn, sharingPdf && { opacity: 0.7 }]}
                    onPress={() => handleShareOrderPdf(detailOrder)}
                    disabled={sharingPdf}
                  >
                    {sharingPdf ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <>
                        <Ionicons name="share-outline" size={20} color={colors.primary} />
                        <Text style={styles.sharePdfBtnText}>Partager le Bon de Commande (PDF)</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Action button inside details */}
                  {detailOrder.status === 'shipped' && (
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.success, marginTop: Spacing.md }]}
                      onPress={async () => {
                        if (detailOrder.is_connected) {
                          setShowDetailModal(false);
                          setDeliveryOrderId(detailOrder.order_id);
                        } else {
                          await handleAdvanceStatus(detailOrder.order_id, detailOrder.status, false);
                          setShowDetailModal(false);
                        }
                      }}
                    >
                      <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
                      <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>Valider la réception</Text>
                    </TouchableOpacity>
                  )}

                  {/* Partial delivery button */}
                  {['confirmed', 'shipped', 'partially_delivered'].includes(detailOrder.status) && (
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: '#FF9800', marginTop: Spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
                      onPress={() => openPartialDelivery(detailOrder.order_id)}
                    >
                      <Ionicons name="layers-outline" size={20} color="#FF9800" />
                      <Text style={[styles.submitBtnText, { marginLeft: 0 }]}>Réception partielle</Text>
                    </TouchableOpacity>
                  )}

                  {/* Return button for delivered orders */}
                  {detailOrder.status === 'delivered' && (
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.danger + '20', marginTop: Spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
                      onPress={() => { setShowDetailModal(false); openCreateReturn(detailOrder); }}
                    >
                      <Ionicons name="return-down-back-outline" size={20} color={colors.danger} />
                      <Text style={[styles.submitBtnText, { color: colors.danger, marginLeft: 0 }]}>Créer un retour</Text>
                    </TouchableOpacity>
                  )}

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
                <Text style={styles.modalTitle}>{t('orders.rate_supplier')}</Text>
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
                {ratingScore === 0 ? t('orders.touch_star') : `${ratingScore}/5`}
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

        {/* Supplier History Modal */}
        <Modal visible={showHistoryModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('orders.history')} : {orderList[0]?.supplier_name}</Text>
                  <Text style={styles.modalSubtitle}>{t('orders.total_orders', { count: orderList.length })}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={styles.historyTable}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHead, { flex: 0.6 }]}>{t('common.date')}</Text>
                    <Text style={[styles.tableHead, { flex: 1.5 }]}>{t('orders.items')}</Text>
                    <Text style={[styles.tableHead, { flex: 0.8 }]}>{t('orders.status')}</Text>
                    <Text style={[styles.tableHead, { flex: 0.8, textAlign: 'right' }]}>{t('common.amount')}</Text>
                  </View>
                  {orderList.map((o) => (
                    <TouchableOpacity
                      key={o.order_id}
                      style={styles.tableRow}
                      onPress={() => {
                        setShowHistoryModal(false);
                        openDetailModal(o.order_id);
                      }}
                    >
                      <Text style={[styles.tableCell, { flex: 0.6, fontSize: 11 }]}>
                        {new Date(o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.5, fontSize: 11 }]} numberOfLines={2}>
                        {o.items_preview?.join(', ') || '...'}
                      </Text>
                      <View style={[{ flex: 0.8, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_CONFIG[o.status]?.color || colors.divider }]} />
                        <Text style={[styles.tableCell, { fontSize: 10 }]}>{STATUS_CONFIG[o.status]?.label}</Text>
                      </View>
                      <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right', fontWeight: '700', fontSize: 11 }]}>
                        {formatCurrency(o.total_amount, user?.currency)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Partial Delivery Modal */}
        <Modal visible={showPartialModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t('orders.partial_delivery')}</Text>
                  <Text style={styles.modalSubtitle}>
                    {t('orders.enter_received_quantities')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowPartialModal(false)} disabled={partialSaving}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 400 }}>
                {partialOrder?.items.map((item) => {
                  const prevReceived = partialOrder.received_items?.[item.item_id] ?? 0;
                  const currentVal = parseInt(partialQuantities[item.item_id] || '0') || 0;

                  return (
                    <View
                      key={item.item_id}
                      style={{
                        padding: Spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <Text style={styles.detailItemName}>
                        {item.product?.name || item.product_name || 'Produit'}
                      </Text>
                      <Text style={[styles.detailItemSub, { marginBottom: Spacing.sm }]}>
                        {t('orders.ordered')} : {item.quantity} | {t('orders.already_received')} : {prevReceived}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                        <TouchableOpacity
                          onPress={() => {
                            const val = Math.max(0, currentVal - 1);
                            setPartialQuantities((prev) => ({ ...prev, [item.item_id]: val.toString() }));
                          }}
                          style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: colors.danger + '20',
                            justifyContent: 'center', alignItems: 'center',
                          }}
                        >
                          <Ionicons name="remove" size={20} color={colors.danger} />
                        </TouchableOpacity>

                        <TextInput
                          style={[
                            styles.formInput,
                            {
                              width: 70, textAlign: 'center', paddingVertical: Spacing.xs,
                              fontSize: FontSize.lg, fontWeight: '700',
                            },
                          ]}
                          value={partialQuantities[item.item_id] || '0'}
                          onChangeText={(text) => {
                            const num = text.replace(/[^0-9]/g, '');
                            setPartialQuantities((prev) => ({ ...prev, [item.item_id]: num }));
                          }}
                          keyboardType="numeric"
                        />

                        <TouchableOpacity
                          onPress={() => {
                            const val = Math.min(item.quantity, currentVal + 1);
                            setPartialQuantities((prev) => ({ ...prev, [item.item_id]: val.toString() }));
                          }}
                          style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: colors.success + '20',
                            justifyContent: 'center', alignItems: 'center',
                          }}
                        >
                          <Ionicons name="add" size={20} color={colors.success} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setPartialQuantities((prev) => ({ ...prev, [item.item_id]: item.quantity.toString() }));
                          }}
                          style={{
                            paddingHorizontal: Spacing.sm, paddingVertical: 6,
                            borderRadius: BorderRadius.sm, backgroundColor: colors.primary + '20',
                          }}
                        >
                          <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>Tout</Text>
                        </TouchableOpacity>
                      </View>

                      {currentVal > item.quantity && (
                        <Text style={{ color: colors.danger, fontSize: FontSize.xs, marginTop: 4 }}>
                          Dépasse la quantité commandée ({item.quantity})
                        </Text>
                      )}
                    </View>
                  );
                })}

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { marginTop: Spacing.md }]}>{t('common.notes')} ({t('common.optional')})</Text>
                  <TextInput
                    style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={partialNotes}
                    onChangeText={setPartialNotes}
                    placeholder={t('orders.partial_notes_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#FF9800', marginTop: Spacing.md, flexDirection: 'row', justifyContent: 'center', gap: 8 }, partialSaving && styles.submitBtnDisabled]}
                onPress={submitPartialDelivery}
                disabled={partialSaving}
              >
                {partialSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>{t('orders.confirm_receipt')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Return Detail Modal */}
        <Modal visible={showReturnDetailModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('orders.return_detail')}</Text>
                <TouchableOpacity onPress={() => setShowReturnDetailModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {returnDetail ? (
                <ScrollView style={styles.modalScroll}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('common.info')}</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name={returnDetail.type === 'customer' ? 'person-outline' : 'business-outline'} size={16} color={colors.primaryLight} />
                      <Text style={styles.detailRowText}>
                        {returnDetail.type === 'customer' ? t('orders.customer_return') : returnDetail.supplier_name || t('orders.supplier_return')}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowSubtext}>{t('orders.created_at')} : {formatDate(returnDetail.created_at)}</Text>
                    </View>
                    {returnDetail.order_id && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowSubtext}>{t('orders.related_order')} : {returnDetail.order_id}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('orders.returned_items')}</Text>
                    {returnDetail.items.map((item, index) => (
                      <View key={index} style={styles.detailItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailItemName}>{item.product_name}</Text>
                          <Text style={styles.detailItemSub}>
                            {item.quantity} x {formatCurrency(item.unit_price, user?.currency)}
                          </Text>
                          {item.reason && (
                            <Text style={[styles.detailItemSub, { color: colors.textMuted }]}>
                              {t('orders.reason')} : {item.reason}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.detailItemTotal}>{formatCurrency(item.quantity * item.unit_price, user?.currency)}</Text>
                      </View>
                    ))}
                  </View>

                  {returnDetail.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>{t('common.notes')}</Text>
                      <Text style={styles.detailNotes}>{returnDetail.notes}</Text>
                    </View>
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t('common.total')}</Text>
                    <Text style={styles.totalValue}>{formatCurrency(returnDetail.total_amount, user?.currency)}</Text>
                  </View>

                  {returnDetail.credit_note_id && (
                    <View style={[styles.detailSection, { marginTop: Spacing.md }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.sm, backgroundColor: colors.success + '15', borderRadius: BorderRadius.md }}>
                        <Ionicons name="document-text-outline" size={20} color={colors.success} />
                        <View>
                          <Text style={{ color: colors.success, fontWeight: '700', fontSize: FontSize.sm }}>{t('orders.credit_note_generated')}</Text>
                          <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>{returnDetail.credit_note_id}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {returnDetail.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: colors.success, marginTop: Spacing.md, flexDirection: 'row', justifyContent: 'center', gap: 8 }, completingReturn && styles.submitBtnDisabled]}
                      onPress={() => completeReturn(returnDetail.return_id)}
                      disabled={completingReturn}
                    >
                      {completingReturn ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={20} color="#fff" />
                          <Text style={styles.submitBtnText}>{t('orders.complete_return_generate_credit_note')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Create Return Modal */}
        <Modal visible={showReturnModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('orders.new_return')}</Text>
                <TouchableOpacity onPress={() => setShowReturnModal(false)} disabled={returnSaving}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {/* Return type */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('orders.return_type')}</Text>
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <TouchableOpacity
                      style={[styles.filterChip, returnType === 'supplier' && styles.filterChipActive, { flex: 1, justifyContent: 'center' }]}
                      onPress={() => setReturnType('supplier')}
                    >
                      <Ionicons name="business-outline" size={14} color={returnType === 'supplier' ? colors.primaryLight : colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.filterText, returnType === 'supplier' && styles.filterTextActive]}>{t('orders.supplier')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, returnType === 'customer' && styles.filterChipActive, { flex: 1, justifyContent: 'center' }]}
                      onPress={() => setReturnType('customer')}
                    >
                      <Ionicons name="person-outline" size={14} color={returnType === 'customer' ? colors.primaryLight : colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.filterText, returnType === 'customer' && styles.filterTextActive]}>{t('orders.customer')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('orders.items_to_return')}</Text>

                  {returnItems.map((item, index) => (
                    <View key={index} style={{ padding: Spacing.sm, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, marginBottom: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: FontSize.sm, flex: 1 }} numberOfLines={1}>
                          {item.product_name}
                        </Text>
                        <TouchableOpacity onPress={() => removeReturnItem(index)}>
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>{t('common.quantity_short')}</Text>
                          <TextInput
                            style={[styles.formInput, { paddingVertical: Spacing.xs, textAlign: 'center' }]}
                            value={item.quantity.toString()}
                            onChangeText={(t) => updateReturnItem(index, 'quantity', parseInt(t.replace(/[^0-9]/g, '')) || 0)}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>{t('common.unit_price_short')}</Text>
                          <TextInput
                            style={[styles.formInput, { paddingVertical: Spacing.xs, textAlign: 'center' }]}
                            value={item.unit_price.toString()}
                            onChangeText={(t) => updateReturnItem(index, 'unit_price', parseFloat(t.replace(/[^0-9.]/g, '')) || 0)}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={{ flex: 1.5 }}>
                          <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>{t('orders.reason')}</Text>
                          <TextInput
                            style={[styles.formInput, { paddingVertical: Spacing.xs }]}
                            value={item.reason || ''}
                            onChangeText={(t) => updateReturnItem(index, 'reason', t)}
                            placeholder={t('orders.reason_placeholder')}
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      </View>

                      <Text style={{ color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 4, textAlign: 'right' }}>
                        {t('common.subtotal')} : {formatCurrency(item.quantity * item.unit_price, user?.currency)}
                      </Text>
                    </View>
                  ))}

                  {/* Add product search */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs }}>
                    <View style={[styles.formInput, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 0, height: 44 }]}>
                      <Ionicons name="search" size={16} color={colors.textMuted} />
                      <TextInput
                        style={{ flex: 1, color: colors.text, fontSize: FontSize.sm }}
                        value={returnProductSearch}
                        onChangeText={setReturnProductSearch}
                        placeholder={t('orders.add_product_placeholder')}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {returnProductSearch.length > 0 && (
                    <View style={{ maxHeight: 150, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, marginTop: 4 }}>
                      <ScrollView nestedScrollEnabled>
                        {returnProducts
                          .filter((p) => p.name.toLowerCase().includes(returnProductSearch.toLowerCase()))
                          .slice(0, 10)
                          .map((p) => (
                            <TouchableOpacity
                              key={p.product_id}
                              style={{ padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                              onPress={() => addReturnProduct(p)}
                            >
                              <Ionicons name="add-circle" size={18} color={colors.primary} />
                              <Text style={{ color: colors.text, fontSize: FontSize.sm, flex: 1 }}>{p.name}</Text>
                              <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>{formatCurrency(p.selling_price || 0, user?.currency)}</Text>
                            </TouchableOpacity>
                          ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('common.notes')}</Text>
                  <TextInput
                    style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                    value={returnNotes}
                    onChangeText={setReturnNotes}
                    placeholder={t('orders.return_notes_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Total */}
                {returnItems.length > 0 && (
                  <View style={[styles.totalRow, { marginBottom: Spacing.md }]}>
                    <Text style={styles.totalLabel}>{t('orders.total_return')}</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(returnItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0), user?.currency)}
                    </Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: Spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: 8 }, returnSaving && styles.submitBtnDisabled]}
                onPress={submitReturn}
                disabled={returnSaving}
              >
                {returnSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="return-down-back" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>{t('orders.create_return')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ScreenGuide
          visible={showGuide}
          onClose={() => { setShowGuide(false); markSeen(); }}
          title={GUIDES.orders.title}
          steps={GUIDES.orders.steps}
        />
      </LinearGradient >
    </PremiumGate>
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
  tabs: { flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm },
  tabChip: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, backgroundColor: colors.glass,
    borderWidth: 1, borderColor: colors.glassBorder,
  },
  tabChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  orderCard: {
    ...glassStyle,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderSupplier: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderInfo: { flex: 1 },
  orderNotes: { fontSize: FontSize.sm, color: colors.textSecondary, fontStyle: 'italic', marginBottom: Spacing.sm },
  orderActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.divider + '20', paddingTop: Spacing.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: FontSize.xs, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider + '20',
  },
  orderDetail: {
    flex: 1,
  },
  orderDetailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  orderDetailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgMid,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
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
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.sm, marginTop: Spacing.xs,
  },
  seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  modalScroll: {
    marginBottom: Spacing.lg,
  },
  // Form styles
  formGroup: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  formInput: {
    backgroundColor: colors.glass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    fontSize: FontSize.md,
  },
  supplierSearch: {
    maxHeight: 200,
    backgroundColor: colors.bgMid,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  supplierSearchItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  supplierSearchName: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  supplierSearchPhone: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
  },
  itemForm: {
    backgroundColor: colors.glass,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  itemFormRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  removeBtn: {
    alignSelf: 'flex-end',
    padding: Spacing.xs,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
  },
  addItemText: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryCard: {
    ...glassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryClearBtn: {
    padding: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryStatItem: {
    flex: 1,
  },
  summaryStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  summaryStatValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  summaryStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.divider,
  },
  totalLabel: { fontSize: FontSize.md, fontWeight: '600', color: colors.textSecondary },
  totalValue: { fontSize: FontSize.xl, fontWeight: '700', color: colors.success },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.divider,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  historyBtnText: {
    color: '#FFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyTable: {
    marginTop: Spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: Spacing.xs,
  },
  tableHead: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider + '40',
  },
  tableCell: {
    fontSize: FontSize.sm,
    color: colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  submitBtn: {
    flex: 1, backgroundColor: colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
  // Detail modal
  detailSection: { marginBottom: Spacing.md },
  detailSectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: colors.primaryLight, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  detailRowText: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  detailRowSubtext: { fontSize: FontSize.sm, color: colors.textSecondary },
  detailItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailItemName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  sharePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderStyle: 'dashed',
  },
  sharePdfBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
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
