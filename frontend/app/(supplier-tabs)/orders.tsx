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
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatNumber } from '../../utils/format';
import PeriodSelector, { Period } from '../../components/PeriodSelector';
import i18n from '../../services/i18n';
import ChatModal from '../../components/ChatModal';

const FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

type StatusAction = { label: string; status: string; color: string; icon: string };

export default function SupplierOrdersScreen() {
  const { t } = useTranslation();
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
  const [invoiceOrderId, setInvoiceOrderId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [creatingSaving, setCreatingSaving] = useState(false);
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoiceData | null>(null);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const result = await supplierInvoices.list();
      setInvoices(result);
    } catch { /* ignore */ }
    finally { setInvoicesLoading(false); }
  }, []);

  async function handleCreateInvoice() {
    if (!invoiceOrderId) return;
    setCreatingSaving(true);
    try {
      await supplierInvoices.create({
        order_id: invoiceOrderId,
        invoice_number: invoiceNumber.trim() || undefined,
        notes: invoiceNotes.trim() || undefined,
      });
      setShowInvoiceCreate(false);
      setInvoiceOrderId('');
      setInvoiceNumber('');
      setInvoiceNotes('');
      loadInvoices();
    } catch (e: any) {
      Alert.alert(t('common.error'), t('supplier.invoice_already_exists'));
    } finally {
      setCreatingSaving(false);
    }
  }

  async function handleGenerateFromDetail() {
    if (!selectedOrder) return;
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
      case 'paid': return Colors.success;
      case 'partial': return Colors.warning;
      case 'unpaid': return Colors.danger;
      default: return Colors.textMuted;
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
          { label: t('supplier.accept'), status: 'confirmed', color: Colors.success, icon: 'checkmark-circle-outline' },
          { label: t('supplier.refuse'), status: 'cancelled', color: Colors.danger, icon: 'close-circle-outline' },
        ];
      case 'confirmed':
        return [{ label: t('supplier.ship'), status: 'shipped', color: Colors.secondary, icon: 'airplane-outline' }];
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
      case 'pending': return Colors.warning;
      case 'confirmed': return Colors.info;
      case 'shipped': return Colors.secondary;
      case 'delivered': return Colors.success;
      case 'cancelled': return Colors.danger;
      default: return Colors.textMuted;
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={[Colors.bgDark, Colors.bgMid, Colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.bgDark, Colors.bgMid, Colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* Orders / Invoices toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'orders' && styles.toggleBtnActive]}
            onPress={() => setViewMode('orders')}
          >
            <Ionicons name="receipt-outline" size={16} color={viewMode === 'orders' ? '#fff' : Colors.textMuted} />
            <Text style={[styles.toggleText, viewMode === 'orders' && styles.toggleTextActive]}>
              {t('orders.received_orders')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'invoices' && styles.toggleBtnActive]}
            onPress={() => { setViewMode('invoices'); loadInvoices(); }}
          >
            <Ionicons name="document-text-outline" size={16} color={viewMode === 'invoices' ? '#fff' : Colors.textMuted} />
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
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
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
                setInvoiceOrderId('');
                setInvoiceNumber('');
                setInvoiceNotes('');
                setShowInvoiceCreate(true);
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {invoicesLoading ? (
            <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: Spacing.xl }} />
          ) : invoices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t('supplier.no_invoices')}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' }}>{t('supplier.no_invoices_hint')}</Text>
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
                      <Text style={styles.orderDate}>{inv.shopkeeper_name}</Text>
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
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('orders.order_detail')}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ position: 'absolute', top: 12, right: 60 }}>
              <TouchableOpacity
                style={{ padding: 8, backgroundColor: Colors.primary + '20', borderRadius: 20 }}
                onPress={() => setShowChat(true)}
              >
                <Ionicons name="chatbubbles-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('orders.client')}</Text>
                  <Text style={styles.detailText}>{selectedOrder.shopkeeper_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('orders.status')}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {getStatusLabel(selectedOrder.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('common.date')}</Text>
                  <Text style={styles.detailText}>
                    {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString(i18n.language, {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    }) : ''}
                  </Text>
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
                    style={[styles.modalActionBtn, { backgroundColor: Colors.info, marginTop: Spacing.sm, flex: 0 }]}
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
      </Modal>

      {selectedOrder && (
        <ChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          partnerId={selectedOrder.shopkeeper_user_id}
          partnerName={selectedOrder.shopkeeper_name}
        />
      )}

      {/* Invoice Create Modal */}
      <Modal visible={showInvoiceCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('supplier.create_invoice')}</Text>
              <TouchableOpacity onPress={() => setShowInvoiceCreate(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.detailSectionTitle}>{t('supplier.select_order')}</Text>
              {invoiceableOrders.length === 0 ? (
                <Text style={{ color: Colors.textMuted, padding: Spacing.md }}>{t('supplier.no_invoiceable_orders')}</Text>
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
                      <Text style={{ color: Colors.text, fontWeight: '600', fontSize: FontSize.sm }}>
                        {order.shopkeeper_name}
                      </Text>
                      <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs }}>
                        {order.created_at ? new Date(order.created_at).toLocaleDateString(i18n.language) : ''} — {getStatusLabel(order.status)}
                      </Text>
                    </View>
                    <Text style={{ color: Colors.text, fontWeight: '700', fontSize: FontSize.sm }}>
                      {formatNumber(order.total_amount)} {t('common.currency_short')}
                    </Text>
                    {invoiceOrderId === order.order_id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                ))
              )}

              <Text style={[styles.detailSectionTitle, { marginTop: Spacing.lg }]}>{t('supplier.invoice_number')}</Text>
              <TextInput
                style={styles.invoiceInput}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder={t('supplier.invoice_number_placeholder')}
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={[styles.detailSectionTitle, { marginTop: Spacing.md }]}>{t('supplier.invoice_notes')}</Text>
              <TextInput
                style={[styles.invoiceInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={invoiceNotes}
                onChangeText={setInvoiceNotes}
                placeholder={t('supplier.invoice_notes_placeholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.invoiceSaveBtn, (!invoiceOrderId || creatingSaving) && { opacity: 0.5 }]}
              onPress={handleCreateInvoice}
              disabled={!invoiceOrderId || creatingSaving}
            >
              {creatingSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalActionText}>{t('supplier.create_invoice')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal visible={showInvoiceDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedInvoice?.invoice_number}</Text>
              <TouchableOpacity onPress={() => setShowInvoiceDetail(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>{t('supplier.invoice_client')}</Text>
                  <Text style={styles.detailText}>{selectedInvoice.shopkeeper_name}</Text>
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

                {/* Status actions */}
                <View style={[styles.modalActions, { marginTop: Spacing.lg }]}>
                  {selectedInvoice.status !== 'paid' && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: Colors.success }]}
                      onPress={() => handleInvoiceStatusChange(selectedInvoice.invoice_id, 'paid')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.modalActionText}>{t('supplier.mark_paid')}</Text>
                    </TouchableOpacity>
                  )}
                  {selectedInvoice.status !== 'partial' && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: Colors.warning }]}
                      onPress={() => handleInvoiceStatusChange(selectedInvoice.invoice_id, 'partial')}
                    >
                      <Ionicons name="hourglass-outline" size={18} color="#fff" />
                      <Text style={styles.modalActionText}>{t('supplier.mark_partial')}</Text>
                    </TouchableOpacity>
                  )}
                  {selectedInvoice.status !== 'unpaid' && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: Colors.danger }]}
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
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewToggle: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
    backgroundColor: Colors.secondary,
  },
  toggleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
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
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  orderSelectItemActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '10',
  },
  invoiceInput: {
    backgroundColor: Colors.inputBg || Colors.glass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  invoiceSaveBtn: {
    backgroundColor: Colors.secondary,
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
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  filtersScroll: { marginBottom: Spacing.md },
  filtersRow: { gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary + '30',
    borderColor: Colors.secondary,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.secondary,
    fontWeight: '600',
  },
  orderCard: {
    ...GlassStyle,
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
    color: Colors.text,
  },
  orderDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
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
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
  },
  orderTotal: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
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
    color: Colors.textMuted,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgDark,
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
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  modalScroll: {
    padding: Spacing.md,
  },
  detailSection: {
    marginBottom: Spacing.md,
  },
  detailSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  detailText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  itemQty: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.secondary + '40',
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.secondary,
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
