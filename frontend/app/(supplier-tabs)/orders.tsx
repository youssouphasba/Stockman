import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supplierOrders, supplierInvoices, SupplierOrderData, SupplierInvoiceData } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatNumber } from '../../utils/format';
import PeriodSelector, { Period } from '../../components/PeriodSelector';
import i18n from '../../services/i18n';
import ChatModal from '../../components/ChatModal';

const FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

type StatusAction = { label: string; status: string; color: string; icon: string };
type InvoiceMode = 'order' | 'manual';
type InvoiceDraftItem = { id: string; description: string; quantity: string; unitPrice: string };

export default function SupplierOrdersScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [ordersList, setOrdersList] = useState<SupplierOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [shopkeeperFilter, setShopkeeperFilter] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(30);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedStart, setAppliedStart] = useState<string>('');
  const [appliedEnd, setAppliedEnd] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrderData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Invoice state
  const [viewMode, setViewMode] = useState<'orders' | 'invoices'>('orders');
  const [invoices, setInvoices] = useState<SupplierInvoiceData[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showInvoiceCreate, setShowInvoiceCreate] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<InvoiceMode>('manual');
  const [invoiceOrderId, setInvoiceOrderId] = useState('');
  const [invoiceClientName, setInvoiceClientName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [creatingSaving, setCreatingSaving] = useState(false);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoiceData | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceDraftItem[]>([
    { id: `${Date.now()}`, description: '', quantity: '1', unitPrice: '' },
  ]);

  const resetInvoiceForm = useCallback((mode: InvoiceMode = 'manual') => {
    setInvoiceMode(mode);
    setInvoiceOrderId('');
    setInvoiceClientName('');
    setInvoiceNumber('');
    setInvoiceNotes('');
    setInvoiceItems([{ id: `${Date.now()}`, description: '', quantity: '1', unitPrice: '' }]);
  }, []);

  const addInvoiceLine = useCallback(() => {
    setInvoiceItems((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, description: '', quantity: '1', unitPrice: '' },
    ]);
  }, []);

  const removeInvoiceLine = useCallback((id: string) => {
    setInvoiceItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }, []);

  const updateInvoiceLine = useCallback((id: string, patch: Partial<InvoiceDraftItem>) => {
    setInvoiceItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const manualInvoiceItems = invoiceItems
    .map((item) => {
      const quantity = parseFloat(item.quantity.replace(',', '.'));
      const unitPrice = parseFloat(item.unitPrice.replace(',', '.'));
      return {
        description: item.description.trim(),
        quantity,
        unit_price: unitPrice,
      };
    })
    .filter((item) => item.description && item.quantity > 0 && item.unit_price >= 0);

  const manualInvoiceTotal = manualInvoiceItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const canSubmitInvoice = invoiceMode === 'order'
    ? Boolean(invoiceOrderId)
    : Boolean(invoiceClientName.trim()) && manualInvoiceItems.length > 0;

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const result = await supplierInvoices.list();
      setInvoices(result);
    } catch { /* ignore */ }
    finally { setInvoicesLoading(false); }
  }, []);

  async function handleCreateInvoice() {
    if (!canSubmitInvoice) return;
    setCreatingSaving(true);
    try {
      if (invoiceMode === 'order') {
        await supplierInvoices.create({
          order_id: invoiceOrderId,
          invoice_number: invoiceNumber.trim() || undefined,
          notes: invoiceNotes.trim() || undefined,
        });
      } else {
        await supplierInvoices.create({
          client_name: invoiceClientName.trim(),
          invoice_number: invoiceNumber.trim() || undefined,
          notes: invoiceNotes.trim() || undefined,
          items: manualInvoiceItems,
        });
      }
      setShowInvoiceCreate(false);
      resetInvoiceForm('manual');
      loadInvoices();
    } catch (e: any) {
      Alert.alert(
        t('common.error'),
        invoiceMode === 'order'
          ? t('supplier.invoice_already_exists')
          : "Impossible de créer cette facture pour le moment."
      );
    } finally {
      setCreatingSaving(false);
    }
  }

  async function handleGenerateFromDetail() {
    if (!selectedOrder) return;
    resetInvoiceForm('order');
    setInvoiceOrderId(selectedOrder.order_id);
    setInvoiceNumber('');
    setInvoiceNotes('');
    setShowDetail(false);
    setShowInvoiceCreate(true);
  }

  async function handleInvoiceStatusChange(invoiceId: string, newStatus: string) {
    try {
      await supplierInvoices.updateStatus(invoiceId, newStatus);
      loadInvoices();
      setShowInvoiceDetail(false);
    } catch {
      Alert.alert(t('common.error'), t('supplier.status_change_error'));
    }
  }

  function getInvoiceStatusColor(status: string): string {
    switch (status) {
      case 'paid': return colors.success;
      case 'partial': return colors.warning;
      case 'unpaid': return colors.danger;
      default: return colors.textMuted;
    }
  }

  // Get orders eligible for invoicing (confirmed/shipped/delivered, not already invoiced)
  const invoiceableOrders = ordersList.filter(o =>
    ['confirmed', 'shipped', 'delivered'].includes(o.status)
  );

  const getStatusLabel = (status: string) => t(`supplier.status_${status}`, { defaultValue: status });
  const getFilterLabel = (f: string) => f === 'all' ? t('supplier.filter_all') : t(`supplier.filter_${f}`, { defaultValue: f });
  const getActions = (currentStatus: string): StatusAction[] => {
    switch (currentStatus) {
      case 'pending':
        return [
          { label: t('supplier.accept'), status: 'confirmed', color: colors.success, icon: 'checkmark-circle-outline' },
          { label: t('supplier.refuse'), status: 'cancelled', color: colors.danger, icon: 'close-circle-outline' },
        ];
      case 'confirmed':
        return [{ label: t('supplier.ship'), status: 'shipped', color: colors.secondary, icon: 'airplane-outline' }];
      default:
        return [];
    }
  };

  const loadOrders = useCallback(async () => {
    try {
      const start = selectedPeriod === 'custom' ? appliedStart : undefined;
      const end = selectedPeriod === 'custom' ? appliedEnd : undefined;
      const days = typeof selectedPeriod === 'number' ? selectedPeriod : undefined;

      const result = await supplierOrders.list(
        filter === 'all' ? undefined : filter,
        shopkeeperFilter ?? undefined,
        start || (days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : undefined),
        end
      );
      setOrdersList(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, shopkeeperFilter, selectedPeriod, appliedStart, appliedEnd]);

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

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const result = await supplierOrders.getClients();
      setClients(result);
    } catch {
      // ignore
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      loadClients();
      loadInvoices();
    }, [loadOrders, loadClients, loadInvoices])
  );

  function onRefresh() {
    setRefreshing(true);
    loadOrders();
  }

  function openDetail(order: SupplierOrderData) {
    setSelectedOrder(order);
    setShowDetail(true);
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const confirmText = newStatus === 'cancelled' ? t('orders.confirm_cancel') : `${t('orders.change_status_to')} "${getStatusLabel(newStatus)}" ? `;

    const executeChange = async () => {
      setUpdating(true);
      try {
        await supplierOrders.updateStatus(orderId, newStatus);
        loadOrders();
        setShowDetail(false);
      } catch {
        Alert.alert(t('common.error'), t('supplier.status_change_error'));
      } finally {
        setUpdating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmText)) {
        await executeChange();
      }
    } else {
      Alert.alert(t('common.confirm'), confirmText, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: executeChange,
        },
      ]);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return colors.warning;
      case 'confirmed': return colors.info;
      case 'shipped': return colors.secondary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.textMuted;
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        {/* Orders / Invoices toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'orders' && styles.toggleBtnActive]}
            onPress={() => setViewMode('orders')}
          >
            <Ionicons name="receipt-outline" size={16} color={viewMode === 'orders' ? '#fff' : colors.textMuted} />
            <Text style={[styles.toggleText, viewMode === 'orders' && styles.toggleTextActive]}>
              {t('orders.received_orders')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'invoices' && styles.toggleBtnActive]}
            onPress={() => { setViewMode('invoices'); loadInvoices(); }}
          >
            <Ionicons name="document-text-outline" size={16} color={viewMode === 'invoices' ? '#fff' : colors.textMuted} />
            <Text style={[styles.toggleText, viewMode === 'invoices' && styles.toggleTextActive]}>
              {t('supplier.invoices')}
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'orders' ? (
        <>
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

        {/* Filters - Status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {getFilterLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filters - Clients */}
        {clients.length > 0 && (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.filterTitle}>{t('orders.filter_by_shopkeeper')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersRow}>
              <TouchableOpacity
                style={[styles.filterChip, !shopkeeperFilter && styles.filterChipActive]}
                onPress={() => setShopkeeperFilter(null)}
              >
                <Text style={[styles.filterText, !shopkeeperFilter && styles.filterTextActive]}>
                  {t('supplier.all_shopkeepers')}
                </Text>
              </TouchableOpacity>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.filterChip, shopkeeperFilter === client.id && styles.filterChipActive]}
                  onPress={() => setShopkeeperFilter(client.id)}
                >
                  <Text style={[styles.filterText, shopkeeperFilter === client.id && styles.filterTextActive]}>
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Orders */}
        {ordersList.map((order) => {
          const actions = getActions(order.status);
          const color = getStatusColor(order.status);
          return (
            <TouchableOpacity key={order.order_id} style={styles.orderCard} onPress={() => openDetail(order)}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderShopkeeper}>{order.shopkeeper_name}</Text>
                  <Text style={styles.orderDate}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString(i18n.language) : ''}
                  </Text>
                  {order.expected_delivery ? (
                    <Text style={styles.orderExpectedDate}>
                      {t('orders.expected_delivery')}: {new Date(order.expected_delivery).toLocaleDateString(i18n.language)}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <Text style={styles.orderItems}>{t('supplier.items_count', { count: order.items_count })}</Text>
                <Text style={styles.orderTotal}>{formatNumber(order.total_amount)} {t('common.currency_default')}</Text>
              </View>

              {actions.length > 0 && (
                <View style={styles.actionsRow}>
                  {actions.map((action) => (
                    <TouchableOpacity
                      key={action.status}
                      style={[styles.actionBtn, { backgroundColor: action.color + '20' }]}
                      onPress={() => handleStatusChange(order.order_id, action.status)}
                    >
                      <Ionicons name={action.icon as any} size={16} color={action.color} />
                      <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {ordersList.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('orders.no_orders')} {filter !== 'all' ? getFilterLabel(filter).toLowerCase() : ''}</Text>
          </View>
        )}
        </>
        ) : (
        /* ── INVOICES VIEW ── */
        <>
          <View style={styles.headerRow}>
            <Text style={styles.pageTitle}>{t('supplier.invoice_title')}</Text>
            <TouchableOpacity
              style={styles.addInvoiceBtn}
              onPress={() => {
                resetInvoiceForm('manual');
                setShowInvoiceCreate(true);
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {invoicesLoading ? (
            <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: Spacing.xl }} />
          ) : invoices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('supplier.no_invoices')}</Text>
              <Text style={{ color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' }}>{t('supplier.no_invoices_hint')}</Text>
            </View>
          ) : (
            invoices.map((inv) => {
              const statusColor = getInvoiceStatusColor(inv.status);
              return (
                <TouchableOpacity
                  key={inv.invoice_id}
                  style={styles.orderCard}
                  onPress={() => { setSelectedInvoice(inv); setShowInvoiceDetail(true); }}
                >
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderShopkeeper}>{inv.invoice_number}</Text>
                      <Text style={styles.orderDate}>{inv.shopkeeper_name || inv.client_name || 'Client'}</Text>
                      <Text style={styles.orderDate}>
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString(i18n.language) : ''}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {t(`supplier.invoice_status_${inv.status}`)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={styles.orderItems}>{inv.items.length} {t('orders.items').toLowerCase()}</Text>
                    <Text style={styles.orderTotal}>{formatNumber(inv.total_amount)} {t('common.currency_default')}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Detail Modal */}
      {showDetail && <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('orders.order_detail')}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ position: 'absolute', top: 12, right: 60 }}>
              <TouchableOpacity
                style={{ padding: 8, backgroundColor: colors.primary + '20', borderRadius: 20 }}
                onPress={() => setShowChat(true)}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.deliveryInfoCard}>
                  <Text style={styles.deliveryInfoTitle}>
                    {t('supplier.delivery_information', { defaultValue: 'Informations de livraison' })}
                  </Text>
                  <View style={styles.deliveryInfoItem}>
                    <Text style={styles.detailSectionTitle}>{t('orders.client')}</Text>
                    <Text style={styles.deliveryInfoValue}>{selectedOrder.shopkeeper_name}</Text>
                  </View>
                  <View style={styles.deliveryInfoItem}>
                    <Text style={styles.detailSectionTitle}>{t('orders.status')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20', alignSelf: 'flex-start', marginTop: 6 }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                        {getStatusLabel(selectedOrder.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.deliveryInfoItem}>
                    <Text style={styles.detailSectionTitle}>{t('common.date')}</Text>
                    <Text style={styles.deliveryInfoValue}>
                      {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString(i18n.language, {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                      } ) : '-'}
                    </Text>
                  </View>
                  <View style={styles.deliveryInfoItem}>
                    <Text style={styles.detailSectionTitle}>{t('orders.expected_delivery')}</Text>
                    <Text style={[styles.deliveryInfoValue, selectedOrder.expected_delivery ? styles.deliveryInfoHighlight : null]}>
                      {selectedOrder.expected_delivery
                        ? new Date(selectedOrder.expected_delivery).toLocaleDateString(i18n.language, {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : t('common.not_specified')}
                    </Text>
                  </View>
                  <View style={styles.deliveryInfoItem}>
                    <Text style={styles.detailSectionTitle}>{t('orders.items')}</Text>
                    <Text style={styles.deliveryInfoValue}>{selectedOrder.items_count || selectedOrder.items?.length || 0}</Text>
                  </View>
                  <View style={styles.deliveryInfoItem}>
                    <Text style={styles.detailSectionTitle}>{t('common.total')}</Text>
                    <Text style={[styles.deliveryInfoValue, styles.deliveryInfoHighlight]}>
                      {formatNumber(selectedOrder.total_amount)} {t('common.currency_default')}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('orders.items')}</Text>
                  {selectedOrder.items?.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.product?.name ?? t('supplier.product_fallback', { id: item.product_id.slice(-6) })}</Text>
                        <Text style={styles.itemQty}>{item.quantity} x {formatNumber(item.unit_price)} {t('common.currency_short')}</Text>
                      </View>
                      <Text style={styles.itemTotal}>{formatNumber(item.total_price)} {t('common.currency_short')}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('common.total')}</Text>
                  <Text style={styles.totalValue}>{formatNumber(selectedOrder.total_amount)} {t('common.currency_default')}</Text>
                </View>

                {/* Actions */}
                {getActions(selectedOrder.status).length > 0 && (
                  <View style={styles.modalActions}>
                    {getActions(selectedOrder.status).map((action) => (
                      <TouchableOpacity
                        key={action.status}
                        style={[styles.modalActionBtn, { backgroundColor: action.color }]}
                        onPress={() => handleStatusChange(selectedOrder.order_id, action.status)}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name={action.icon as any} size={18} color="#fff" />
                            <Text style={styles.modalActionText}>{action.label}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Generate Invoice button */}
                {['confirmed', 'shipped', 'delivered'].includes(selectedOrder.status) && (
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: colors.info, marginTop: Spacing.sm, flex: 0 }]}
                    onPress={handleGenerateFromDetail}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.modalActionText}>{t('supplier.create_invoice')}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>}

      {selectedOrder && (
        <ChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          partnerId={selectedOrder.shopkeeper_user_id}
          partnerName={selectedOrder.shopkeeper_name}
        />
      )}

      {/* Invoice Create Modal */}
      {showInvoiceCreate && <Modal visible={showInvoiceCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('supplier.create_invoice')}</Text>
              <TouchableOpacity onPress={() => { setShowInvoiceCreate(false); resetInvoiceForm('manual'); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.invoiceModeRow}>
                <TouchableOpacity
                  style={[styles.invoiceModeBtn, invoiceMode === 'manual' && styles.invoiceModeBtnActive]}
                  onPress={() => resetInvoiceForm('manual')}
                >
                  <Ionicons name="create-outline" size={16} color={invoiceMode === 'manual' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.invoiceModeText, invoiceMode === 'manual' && styles.invoiceModeTextActive]}>
                    Facture manuelle
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.invoiceModeBtn, invoiceMode === 'order' && styles.invoiceModeBtnActive]}
                  onPress={() => resetInvoiceForm('order')}
                >
                  <Ionicons name="receipt-outline" size={16} color={invoiceMode === 'order' ? '#fff' : colors.textMuted} />
                  <Text style={[styles.invoiceModeText, invoiceMode === 'order' && styles.invoiceModeTextActive]}>
                    Depuis une commande
                  </Text>
                </TouchableOpacity>
              </View>

              {invoiceMode === 'order' ? (
                <>
                  <Text style={styles.detailSectionTitle}>{t('supplier.select_order')}</Text>
                  {invoiceableOrders.length === 0 ? (
                    <View style={styles.invoiceHintCard}>
                      <Text style={styles.invoiceHintTitle}>Aucune commande prête</Text>
                      <Text style={styles.invoiceHintText}>
                        Confirmez, expédiez ou livrez une commande pour pouvoir générer une facture à partir de celle-ci.
                      </Text>
                    </View>
                  ) : (
                    invoiceableOrders.map((order) => (
                      <TouchableOpacity
                        key={order.order_id}
                        style={[
                          styles.orderSelectItem,
                          invoiceOrderId === order.order_id && styles.orderSelectItemActive,
                        ]}
                        onPress={() => setInvoiceOrderId(order.order_id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: '600', fontSize: FontSize.sm }}>
                            {order.shopkeeper_name}
                          </Text>
                          <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                            {order.created_at ? new Date(order.created_at).toLocaleDateString(i18n.language) : ''} — {getStatusLabel(order.status)}
                          </Text>
                        </View>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: FontSize.sm }}>
                          {formatNumber(order.total_amount)} {t('common.currency_short')}
                        </Text>
                        {invoiceOrderId === order.order_id && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.success} style={{ marginLeft: 8 }} />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.detailSectionTitle}>Client</Text>
                  <TextInput
                    style={styles.invoiceInput}
                    value={invoiceClientName}
                    onChangeText={setInvoiceClientName}
                    placeholder="Nom du client"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={[styles.detailSectionTitle, { marginTop: Spacing.md }]}>Lignes de facture</Text>
                  {invoiceItems.map((item, index) => (
                    <View key={item.id} style={styles.invoiceLineCard}>
                      <View style={styles.invoiceLineHeader}>
                        <Text style={styles.invoiceLineTitle}>Article {index + 1}</Text>
                        <TouchableOpacity
                          onPress={() => removeInvoiceLine(item.id)}
                          disabled={invoiceItems.length === 1}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={invoiceItems.length === 1 ? colors.textMuted : colors.danger}
                          />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.invoiceInput}
                        value={item.description}
                        onChangeText={(value) => updateInvoiceLine(item.id, { description: value })}
                        placeholder="Nom ou description"
                        placeholderTextColor={colors.textMuted}
                      />
                      <View style={styles.invoiceLineRow}>
                        <TextInput
                          style={[styles.invoiceInput, styles.invoiceLineHalf]}
                          value={item.quantity}
                          onChangeText={(value) => updateInvoiceLine(item.id, { quantity: value })}
                          placeholder="Qté"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.invoiceInput, styles.invoiceLineHalf]}
                          value={item.unitPrice}
                          onChangeText={(value) => updateInvoiceLine(item.id, { unitPrice: value })}
                          placeholder="Prix unitaire"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addLineBtn} onPress={addInvoiceLine}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.secondary} />
                    <Text style={styles.addLineText}>Ajouter une ligne</Text>
                  </TouchableOpacity>
                  <View style={styles.manualTotalCard}>
                    <Text style={styles.manualTotalLabel}>Total estimé</Text>
                    <Text style={styles.manualTotalValue}>
                      {formatNumber(manualInvoiceTotal)} {t('common.currency_default')}
                    </Text>
                  </View>
                </>
              )}

              <Text style={[styles.detailSectionTitle, { marginTop: Spacing.lg }]}>{t('supplier.invoice_number')}</Text>
              <TextInput
                style={styles.invoiceInput}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder={t('supplier.invoice_number_placeholder')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.detailSectionTitle, { marginTop: Spacing.md }]}>{t('supplier.invoice_notes')}</Text>
              <TextInput
                style={[styles.invoiceInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={invoiceNotes}
                onChangeText={setInvoiceNotes}
                placeholder={t('supplier.invoice_notes_placeholder')}
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.invoiceSaveBtn, (!canSubmitInvoice || creatingSaving) && { opacity: 0.5 }]}
              onPress={handleCreateInvoice}
              disabled={!canSubmitInvoice || creatingSaving}
            >
              {creatingSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalActionText}>
                  {invoiceMode === 'order' ? t('supplier.create_invoice') : 'Créer la facture'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>}

      {/* Invoice Detail Modal */}
      {showInvoiceDetail && <Modal visible={showInvoiceDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedInvoice?.invoice_number}</Text>
              <TouchableOpacity onPress={() => setShowInvoiceDetail(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('supplier.invoice_client')}</Text>
                  <Text style={styles.detailText}>{selectedInvoice.shopkeeper_name || selectedInvoice.client_name || 'Client'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('orders.status')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getInvoiceStatusColor(selectedInvoice.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getInvoiceStatusColor(selectedInvoice.status) }]}>
                      {t(`supplier.invoice_status_${selectedInvoice.status}`)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('supplier.invoice_date')}</Text>
                  <Text style={styles.detailText}>
                    {selectedInvoice.created_at ? new Date(selectedInvoice.created_at).toLocaleDateString(i18n.language, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    }) : ''}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('supplier.invoice_items')}</Text>
                  {selectedInvoice.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQty}>{item.quantity} x {formatNumber(item.unit_price)} {t('common.currency_short')}</Text>
                      </View>
                      <Text style={styles.itemTotal}>{formatNumber(item.total)} {t('common.currency_short')}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('supplier.invoice_total')}</Text>
                  <Text style={styles.totalValue}>{formatNumber(selectedInvoice.total_amount)} {t('common.currency_default')}</Text>
                </View>

                {selectedInvoice.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('supplier.invoice_notes')}</Text>
                    <Text style={styles.detailText}>{selectedInvoice.notes}</Text>
                  </View>
                )}

                {(selectedInvoice.invoice_business_name || selectedInvoice.invoice_business_address || selectedInvoice.invoice_footer || selectedInvoice.invoice_payment_terms) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>En-tête et mentions</Text>
                    {selectedInvoice.invoice_business_name ? <Text style={styles.detailText}>{selectedInvoice.invoice_business_name}</Text> : null}
                    {selectedInvoice.invoice_business_address ? <Text style={styles.detailMuted}>{selectedInvoice.invoice_business_address}</Text> : null}
                    {selectedInvoice.invoice_payment_terms ? <Text style={styles.detailMuted}>Conditions : {selectedInvoice.invoice_payment_terms}</Text> : null}
                    {selectedInvoice.invoice_footer ? <Text style={styles.detailMuted}>{selectedInvoice.invoice_footer}</Text> : null}
                  </View>
                )}

                {/* Status actions */}
                <View style={[styles.modalActions, { marginTop: Spacing.lg }]}>
                  {selectedInvoice.status !== 'paid' && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: colors.success }]}
                      onPress={() => handleInvoiceStatusChange(selectedInvoice.invoice_id, 'paid')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.modalActionText}>{t('supplier.mark_paid')}</Text>
                    </TouchableOpacity>
                  )}
                  {selectedInvoice.status !== 'partial' && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: colors.warning }]}
                      onPress={() => handleInvoiceStatusChange(selectedInvoice.invoice_id, 'partial')}
                    >
                      <Ionicons name="hourglass-outline" size={18} color="#fff" />
                      <Text style={styles.modalActionText}>{t('supplier.mark_partial')}</Text>
                    </TouchableOpacity>
                  )}
                  {selectedInvoice.status !== 'unpaid' && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: colors.danger }]}
                      onPress={() => handleInvoiceStatusChange(selectedInvoice.invoice_id, 'unpaid')}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#fff" />
                      <Text style={styles.modalActionText}>{t('supplier.mark_unpaid')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>}
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewToggle: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    backgroundColor: colors.glass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.secondary,
  },
  toggleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toggleTextActive: {
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addInvoiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: Spacing.sm,
  },
  orderSelectItemActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '10',
  },
  invoiceModeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  invoiceModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.inputBg || colors.glass,
  },
  invoiceModeBtnActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  invoiceModeText: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  invoiceModeTextActive: {
    color: '#fff',
  },
  invoiceHintCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  invoiceHintTitle: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  invoiceHintText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  invoiceInput: {
    backgroundColor: colors.inputBg || colors.glass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  invoiceLineCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    marginBottom: Spacing.sm,
  },
  invoiceLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  invoiceLineTitle: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  invoiceLineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  invoiceLineHalf: {
    flex: 1,
    marginBottom: 0,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '12',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addLineText: {
    color: colors.secondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  manualTotalCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.secondary + '35',
    backgroundColor: colors.secondary + '12',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  manualTotalLabel: {
    color: colors.textSecondary,
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  manualTotalValue: {
    color: colors.secondary,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  invoiceSaveBtn: {
    backgroundColor: colors.secondary,
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.md,
  },
  filtersScroll: { marginBottom: Spacing.md },
  filtersRow: { gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: colors.secondary + '30',
    borderColor: colors.secondary,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  orderShopkeeper: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  orderDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  orderExpectedDate: {
    fontSize: FontSize.xs,
    color: colors.warning,
    marginTop: 4,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  orderStatusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  filterTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
  },
  orderTotal: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: colors.textMuted,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgDark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    paddingBottom: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalScroll: {
    padding: Spacing.md,
  },
  deliveryInfoCard: {
    backgroundColor: colors.glass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  deliveryInfoTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.xs,
  },
  deliveryInfoItem: {
    backgroundColor: colors.inputBg || colors.glass,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  deliveryInfoValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
  },
  deliveryInfoHighlight: {
    color: colors.warning,
  },
  detailSection: {
    marginBottom: Spacing.md,
  },
  detailSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  detailText: {
    fontSize: FontSize.md,
    color: colors.text,
  },
  detailMuted: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: FontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  itemQty: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.secondary + '40',
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
});

