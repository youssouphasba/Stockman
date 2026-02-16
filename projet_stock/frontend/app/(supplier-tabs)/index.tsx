import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supplierDashboard, SupplierDashboardData } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmées',
  shipped: 'Expédiées',
  delivered: 'Livrées',
  cancelled: 'Annulées',
};

export default function SupplierDashboardScreen() {
  const [data, setData] = useState<SupplierDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await supplierDashboard.get();
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  function renderStars(rating: number) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={18}
          color={Colors.warning}
        />
      );
    }
    return stars;
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
        <Text style={styles.pageTitle}>Dashboard Fournisseur</Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.secondary }]}>
            <Text style={styles.kpiValue}>{data?.catalog_products ?? 0}</Text>
            <Text style={styles.kpiLabel}>Produits</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
            <Text style={styles.kpiValue}>{data?.total_orders ?? 0}</Text>
            <Text style={styles.kpiLabel}>Commandes</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.kpiValue}>{(data?.total_revenue ?? 0).toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>CA Total (FCFA)</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}>
            <View style={styles.ratingRow}>
              <Text style={styles.kpiValue}>{data?.rating_average?.toFixed(1) ?? '-'}</Text>
              <Text style={styles.kpiLabel}>/5</Text>
            </View>
            <Text style={styles.kpiLabel}>Note ({data?.rating_count ?? 0} avis)</Text>
          </View>
        </View>

        {/* Rating stars */}
        {(data?.rating_count ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Note moyenne</Text>
            <View style={styles.starsRow}>
              {renderStars(data?.rating_average ?? 0)}
              <Text style={styles.ratingText}>{data?.rating_average?.toFixed(1)}/5</Text>
            </View>
          </View>
        )}

        {/* Orders by status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Commandes par statut</Text>
          {data?.orders_by_status && Object.entries(data.orders_by_status).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <Text style={styles.statusLabel}>{STATUS_LABELS[status] ?? status}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusCount}>{count}</Text>
              </View>
            </View>
          ))}
          {(!data?.orders_by_status || Object.keys(data.orders_by_status).length === 0) && (
            <Text style={styles.emptyText}>Aucune commande pour le moment</Text>
          )}
        </View>

        {/* Recent orders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {data?.recent_orders && data.recent_orders.length > 0 ? (
            data.recent_orders.slice(0, 5).map((order) => (
              <View key={order.order_id} style={styles.orderRow}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.order_id.slice(-6)}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{order.total_amount.toLocaleString()} F</Text>
                  <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune commande récente</Text>
          )}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
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

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    ...GlassStyle,
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  kpiValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  card: {
    ...GlassStyle,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  statusLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusCount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.secondary,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  orderInfo: { flex: 1 },
  orderId: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  orderDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  orderStatus: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  orderStatusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
