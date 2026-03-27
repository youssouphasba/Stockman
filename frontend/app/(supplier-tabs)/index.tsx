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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supplierDashboard, SupplierDashboardData } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatNumber } from '../../utils/format';
import KpiInfoButton from '../../components/KpiInfoButton';
import i18n from '../../services/i18n';

interface RatingRecord {
  rating_id: string;
  shopkeeper_name: string;
  score: number;
  comment?: string;
  created_at: string;
}


export default function SupplierDashboard() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
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
          color={colors.warning}
        />
      );
    }
    return stars;
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
        <Text style={styles.pageTitle}>{t('supplier.dashboard_title')}</Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: colors.secondary }]}>
            <KpiInfoButton info={t('supplier.info_products')} />
            <Text style={styles.kpiValue}>{data?.catalog_products ?? 0}</Text>
            <Text style={styles.kpiLabel}>{t('tabs.products')}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: colors.warning }]}>
            <KpiInfoButton info={t('supplier.info_orders')} />
            <Text style={styles.kpiValue}>{data?.total_orders ?? 0}</Text>
            <Text style={styles.kpiLabel}>{t('tabs.orders')}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: colors.success }]}>
            <KpiInfoButton info={t('supplier.info_revenue')} />
            <Text style={styles.kpiValue}>{formatNumber(data?.total_revenue ?? 0)}</Text>
            <Text style={styles.kpiLabel}>{t('dashboard.total_revenue_kpi')} ({t('common.currency_default')})</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: colors.primary }]}>
            <KpiInfoButton info={t('supplier.info_rating')} />
            <View style={styles.ratingRow}>
              <Text style={styles.kpiValue}>{data?.rating_average?.toFixed(1) ?? '-'}</Text>
              <Text style={styles.kpiLabel}>/5</Text>
            </View>
            <Text style={styles.kpiLabel}>{t('supplier.rating')} ({data?.rating_count ?? 0} {t('supplier.reviews').toLowerCase()})</Text>
          </View>
        </View>

        {/* New KPI row: pending, revenue this month, avg order, active clients */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: colors.danger }]}>
            <KpiInfoButton info={t('supplier.info_pending')} />
            <Text style={styles.kpiValue}>{data?.pending_action ?? 0}</Text>
            <Text style={styles.kpiLabel}>{t('supplier.pending_orders')}</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: colors.info }]}>
            <KpiInfoButton info={t('supplier.info_revenue_month')} />
            <Text style={styles.kpiValue}>{formatNumber(data?.revenue_this_month ?? 0)}</Text>
            <Text style={styles.kpiLabel}>{t('supplier.revenue_this_month')} ({t('common.currency_default')})</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: colors.secondary }]}>
            <KpiInfoButton info={t('supplier.info_avg_basket')} />
            <Text style={styles.kpiValue}>{formatNumber(data?.avg_order_value ?? 0)}</Text>
            <Text style={styles.kpiLabel}>{t('supplier.average_basket')} ({t('common.currency_default')})</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: colors.success }]}>
            <KpiInfoButton info={t('supplier.info_active_clients')} />
            <Text style={styles.kpiValue}>{data?.active_clients ?? 0}</Text>
            <Text style={styles.kpiLabel}>{t('supplier.active_clients')}</Text>
          </View>
        </View>

        {/* Top Produits */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('supplier.top_products')}</Text>
          {data?.top_products && data.top_products.length > 0 ? (
            data.top_products.map((product, index) => (
              <View key={index} style={styles.topProductRow}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.topProductQty}>{t('supplier.sold_count', { count: product.total_qty })}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('supplier.no_product_data')}</Text>
          )}
        </View>

        {/* Recent orders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('supplier.recent_orders')}</Text>
          {data?.recent_orders && data.recent_orders.length > 0 ? (
            data.recent_orders.slice(0, 5).map((order) => (
              <View key={order.order_id} style={styles.orderRow}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.order_id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.orderDate}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString(i18n.language) : ''}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{formatNumber(order.total_amount)} {t('common.currency_short')}</Text>
                  <View style={[styles.orderStatus, { backgroundColor: getStatusColor(order.status, colors) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status, colors) }]}>
                      {t(`supplier.status_${order.status}`, { defaultValue: order.status })}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('supplier.no_recent_orders')}</Text>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.card}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>{t('supplier.client_reviews')}</Text>
            {(data?.rating_count ?? 0) > 0 && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color={colors.warning} />
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
                  {rating.created_at ? new Date(rating.created_at).toLocaleDateString(i18n.language) : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('supplier.no_reviews_yet')}</Text>
          )}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
}

function getStatusColor(status: string, colors: any): string {
  switch (status) {
    case 'pending': return colors.warning;
    case 'confirmed': return colors.info;
    case 'shipped': return colors.secondary;
    case 'delivered': return colors.success;
    case 'cancelled': return colors.danger;
    default: return colors.textMuted;
  }
}

const createStyles = (colors: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  kpiValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.text,
    marginLeft: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  statusLabel: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusCount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.secondary,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  orderInfo: { flex: 1 },
  orderId: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  orderDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.warning,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
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
    color: colors.text,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  reviewDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  topProductRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  topProductRankText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.secondary,
  },
  topProductName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: colors.text,
  },
  topProductQty: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: Spacing.sm,
  },
});
