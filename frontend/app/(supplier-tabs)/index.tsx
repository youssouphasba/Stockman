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

interface RatingRecord {
  rating_id: string;
  shopkeeper_name: string;
  score: number;
  comment?: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmées',
  shipped: 'Expédiées',
  delivered: 'Livrées',
  cancelled: 'Annulées',
};

export default function SupplierDashboardScreen() {
  const [data, setData] = useState<SupplierDashboardData | null>(null);
  const [ratings, setRatings] = useState<RatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashboardResult, ratingsResult] = await Promise.all([
        supplierDashboard.get(),
        supplierDashboard.getRatings(),
      ]);
      setData(dashboardResult);
      setRatings(ratingsResult);
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
            <Text style={styles.kpiLabel}>CA Total ({t('common.currency_default')})</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}>
            <View style={styles.ratingRow}>
              <Text style={styles.kpiValue}>{data?.rating_average?.toFixed(1) ?? '-'}</Text>
              <Text style={styles.kpiLabel}>/5</Text>
            </View>
            <Text style={styles.kpiLabel}>Note ({data?.rating_count ?? 0} avis)</Text>
          </View>
        </View>

        {/* New KPI row: pending, revenue this month, avg order, active clients */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.danger }]}>
            <Text style={styles.kpiValue}>{data?.pending_action ?? 0}</Text>
            <Text style={styles.kpiLabel}>Commandes en attente</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.info }]}>
            <Text style={styles.kpiValue}>{(data?.revenue_this_month ?? 0).toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>CA ce mois ({t('common.currency_default')})</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.secondary }]}>
            <Text style={styles.kpiValue}>{(data?.avg_order_value ?? 0).toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Panier moyen ({t('common.currency_default')})</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
            <Text style={styles.kpiValue}>{data?.active_clients ?? 0}</Text>
            <Text style={styles.kpiLabel}>Clients actifs</Text>
          </View>
        </View>

        {/* Top Produits */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top Produits</Text>
          {data?.top_products && data.top_products.length > 0 ? (
            data.top_products.map((product, index) => (
              <View key={index} style={styles.topProductRow}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.topProductQty}>{product.total_qty} vendus</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune donnée produit</Text>
          )}
        </View>

        {/* Recent orders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {data?.recent_orders && data.recent_orders.length > 0 ? (
            data.recent_orders.slice(0, 5).map((order) => (
              <View key={order.order_id} style={styles.orderRow}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.order_id.slice(-6).toUpperCase()}</Text>
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

        {/* Reviews Section */}
        <View style={styles.card}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Avis des clients</Text>
            {(data?.rating_count ?? 0) > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={Colors.warning} />
                <Text style={styles.ratingBadgeText}>{data?.rating_average?.toFixed(1)}/5</Text>
              </View>
            )}
          </View>

          {ratings && ratings.length > 0 ? (
            ratings.map((rating) => (
              <View key={rating.rating_id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.raterName}>{rating.shopkeeper_name}</Text>
                  <View style={styles.reviewStars}>
                    {renderStars(rating.score)}
                  </View>
                </View>
                {rating.comment && (
                  <Text style={styles.reviewComment}>{rating.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(rating.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
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
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.warning,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  raterName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  reviewDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  topProductRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  topProductRankText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.secondary,
  },
  topProductName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  topProductQty: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
});
