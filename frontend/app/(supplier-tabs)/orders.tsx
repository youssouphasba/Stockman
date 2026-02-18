```javascript
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supplierOrders, SupplierOrderData, updateSupplierOrderStatus } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
const FILTER_LABELS: Record<string, string> = {
  all: 'Tous',
  pending: 'En attente',
  confirmed: 'Confirmées',
  shipped: 'Expédiées',
  delivered: 'Livrées',
  cancelled: 'Annulées',
};

type StatusAction = { label: string; status: string; color: string; icon: string };

function getActions(currentStatus: string): StatusAction[] {
  switch (currentStatus) {
    case 'pending':
      return [
        { label: 'Accepter', status: 'confirmed', color: Colors.success, icon: 'checkmark-circle-outline' },
        { label: 'Refuser', status: 'cancelled', color: Colors.danger, icon: 'close-circle-outline' },
      ];
    case 'confirmed':
      return [{ label: 'Expédier', status: 'shipped', color: Colors.secondary, icon: 'airplane-outline' }];
    case 'shipped':
      return []; // Le commerçant valide la réception
    default:
      return [];
  }
}

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
    }, [loadOrders, loadClients])
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
    const confirmText = newStatus === 'cancelled' ? 'Refuser cette commande ?' : `Changer le statut en "${STATUS_LABELS[newStatus]}" ? `;

    const executeChange = async () => {
      setUpdating(true);
      try {
        await supplierOrders.updateStatus(orderId, newStatus);
        loadOrders();
        setShowDetail(false);
      } catch {
        RNAlert.alert('Erreur', 'Impossible de changer le statut');
      } finally {
        setUpdating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmText)) {
        await executeChange();
      }
    } else {
      RNAlert.alert('Confirmer', confirmText, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
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
        <Text style={styles.pageTitle}>Commandes reçues</Text>

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
                {FILTER_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filters - Clients */}
        {clients.length > 0 && (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.filterTitle}>Filtrer par commerçant</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersRow}>
              <TouchableOpacity
                style={[styles.filterChip, !shopkeeperFilter && styles.filterChipActive]}
                onPress={() => setShopkeeperFilter(null)}
              >
                <Text style={[styles.filterText, !shopkeeperFilter && styles.filterTextActive]}>
                  Tous les commerçants
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
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <Text style={styles.orderItems}>{order.items_count} article{order.items_count > 1 ? 's' : ''}</Text>
                <Text style={styles.orderTotal}>{order.total_amount.toLocaleString()} {t('common.currency_default')}</Text>
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
            <Text style={styles.emptyText}>Aucune commande {filter !== 'all' ? FILTER_LABELS[filter].toLowerCase() : ''}</Text>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail commande</Text>
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
                  <Text style={styles.detailSectionTitle}>Client</Text>
                  <Text style={styles.detailText}>{selectedOrder.shopkeeper_name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {STATUS_LABELS[selectedOrder.status] ?? selectedOrder.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Date</Text>
                  <Text style={styles.detailText}>
                    {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Articles</Text>
                  {selectedOrder.items?.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.product?.name ?? `Produit #${ item.product_id.slice(-6) } `}</Text>
                        <Text style={styles.itemQty}>{item.quantity} x {item.unit_price.toLocaleString()} {t('common.currency_short')}</Text>
                      </View>
                      <Text style={styles.itemTotal}>{item.total_price.toLocaleString()} {t('common.currency_short')}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{selectedOrder.total_amount.toLocaleString()} {t('common.currency_default')}</Text>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
