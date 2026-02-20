import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Linking,
  Alert,
  Image,
  Platform,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Skeleton from '../../components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import DashboardSettingsModal from '../../components/DashboardSettingsModal';
import AnimatedCounter from '../../components/AnimatedCounter';
import PeriodSelector, { Period } from '../../components/PeriodSelector'; // Assuming this component exists or reusing logic
import { useAuth } from '../../contexts/AuthContext';
import { useNetwork } from '../../hooks/useNetwork';
import { cache, KEYS } from '../../services/cache';
import {
  dashboard as dashboardApi,
  statistics as statisticsApi,
  stock as stockApi,
  settings as settingsApi,
  inventory,
  DashboardData,
  StatisticsData,
  StockMovement,
  InventoryTask,
  UserSettings,
  API_URL,
  getToken,
  userNotifications,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import { useDailyTip } from '../../hooks/useDailyTip';
import TipCard from '../../components/TipCard';
import ForecastCard from '../../components/ForecastCard';
import SmartRemindersCard from '../../components/SmartRemindersCard';
import AiDailySummary from '../../components/AiDailySummary';
import { formatCurrency as globalFormatCurrency, getCurrencySymbol } from '../../utils/format';

const screenWidth = Dimensions.get('window').width;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type KpiCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
  isCurrency?: boolean;
};


export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isConnected } = useNetwork();
  const [data, setData] = useState<DashboardData | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [inventoryTasks, setInventoryTasks] = useState<InventoryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { isFirstVisit, markSeen } = useFirstVisit('dashboard');
  const { tip, dismissTip, isDismissed } = useDailyTip(
    (user as any)?.role === 'supplier' ? 'supplier' : 'shopkeeper'
  );

  useEffect(() => {
    if (isFirstVisit) setShowGuide(true);
  }, [isFirstVisit]);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in' | 'out'>('all');
  const [historyPeriod, setHistoryPeriod] = useState<Period>(7);
  const [historyStartDate, setHistoryStartDate] = useState<Date | undefined>(undefined);
  const [historyEndDate, setHistoryEndDate] = useState<Date | undefined>(undefined);

  // Statistics modal
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAllCritical, setShowAllCritical] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showDashboardSettings, setShowDashboardSettings] = useState(false);

  // Use refs to avoid re-triggering useFocusEffect when isConnected changes
  const isConnectedRef = useRef(isConnected);
  const loadingRef = useRef(false);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const loadData = useCallback(async () => {
    // Guard against concurrent loads (prevents double-render overwrite)
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      if (isConnectedRef.current) {
        // Load all APIs in parallel for faster screen load
        const [dashRes, settingsRes, statsRes, tasksRes] = await Promise.allSettled([
          dashboardApi.get(),
          settingsApi.get(),
          statisticsApi.get(),
          inventory.getTasks('pending'),
        ]);

        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value);
          cache.set(KEYS.DASHBOARD, dashRes.value);
        } else {
          const cached = await cache.get<DashboardData>(KEYS.DASHBOARD);
          if (cached) setData(prev => prev ?? cached);
        }
        if (settingsRes.status === 'fulfilled') setUserSettings(settingsRes.value);
        if (statsRes.status === 'fulfilled') { setStats(statsRes.value); setStatsData(statsRes.value); }
        if (tasksRes.status === 'fulfilled') setInventoryTasks(tasksRes.value);
      } else {
        // Offline: only use cache if we don't already have fresh data
        const cached = await cache.get<DashboardData>(KEYS.DASHBOARD);
        if (cached) setData(prev => prev ?? cached);
      }
    } catch {
      const cached = await cache.get<DashboardData>(KEYS.DASHBOARD);
      if (cached) setData(prev => prev ?? cached);
    } finally {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [user?.active_store_id]);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await userNotifications.list(0, 5);
      setNotifications(result.items);
      setNotifCount(result.total);
    } catch { /* ignore */ }
  }, []);

  // Initial load on mount (safety net — useFocusEffect may not fire reliably on web)
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when tab regains focus (e.g. tab switch back)
  useFocusEffect(
    useCallback(() => {
      loadingRef.current = false; // Reset guard so focus-triggered reload works
      loadData();
      loadNotifications();
    }, [loadData, loadNotifications])
  );

  function onRefresh() {
    setRefreshing(true);
    loadingRef.current = false; // Reset guard so refresh always triggers a load
    loadData();
  }

  async function updateDashboardLayout(layout: NonNullable<UserSettings['dashboard_layout']>) {
    if (!userSettings) return;
    const newSettings = { ...userSettings, dashboard_layout: layout };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUserSettings(newSettings);
    try {
      await settingsApi.update({ dashboard_layout: layout });
    } catch {
      // Revert if API fails
      Alert.alert(t('common.error'), t('common.preferences_error'));
    }
  }

  const renderKPIs = () => {
    if (userSettings?.dashboard_layout && !userSettings.dashboard_layout.show_kpi) return null;
    return (
      <View style={styles.kpiGrid}>
        <KpiCard
          icon="cash-outline"
          label={t('dashboard.today_revenue')}
          value={data?.today_revenue ?? 0}
          color={colors.success}
          isCurrency
        />
        <KpiCard
          icon="receipt-outline"
          label={t('dashboard.today_sales')}
          value={data?.today_sales_count ?? 0}
          color={colors.info}
        />
        <KpiCard
          icon="cube-outline"
          label={t('dashboard.stock_value')}
          value={data?.total_stock_value ?? 0}
          color={colors.warning}
          isCurrency
        />
        <KpiCard
          icon="card-outline"
          label={t('dashboard.month_revenue')}
          value={data?.month_revenue ?? 0}
          color={colors.primary}
          isCurrency
        />
      </View>
    );
  };


  async function loadHistory(period: Period, start?: Date, end?: Date) {
    setHistoryLoading(true);
    try {
      const days = period === 'custom' ? undefined : period;
      const sDate = start ? start.toISOString().split('T')[0] : undefined;
      const eDate = end ? end.toISOString().split('T')[0] : undefined;

      const result = await stockApi.getMovements(undefined, days, sDate, eDate, 0, 500);
      setMovements(result.items ?? result as any);
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistoryModal() {
    setShowHistoryModal(true);
    setHistoryFilter('all');
    setHistoryPeriod(7); // Default to 7 days
    setHistoryStartDate(undefined);
    setHistoryEndDate(undefined);
    loadHistory(7);
  }

  // Effect to reload history when period changes (only if modal is open)
  useEffect(() => {
    if (showHistoryModal && historyPeriod !== 'custom') {
      loadHistory(historyPeriod);
    } else if (showHistoryModal && historyPeriod === 'custom' && historyStartDate && historyEndDate) {
      loadHistory(historyPeriod, historyStartDate, historyEndDate);
    }
  }, [historyPeriod, historyStartDate, historyEndDate, showHistoryModal]);

  async function exportHistory() {
    const token = await getToken();
    if (!token) return;
    Linking.openURL(`${API_URL}/export/movements/csv?token=${token}`);
  }

  async function openStatsModal() {
    setShowStatsModal(true);
    setStatsLoading(true);
    try {
      const result = await statisticsApi.get();
      setStatsData(result);
    } catch {
      // silently fail
    } finally {
      setStatsLoading(false);
    }
  }

  async function exportStats() {
    const token = await getToken();
    if (!token) return;
    Linking.openURL(`${API_URL}/export/products/csv?token=${token}`);
  }

  function formatCurrency(val: number) {
    return globalFormatCurrency(val, user?.currency);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const filteredMovements = movements.filter((m) => historyFilter === 'all' || m.type === historyFilter);

  // Module checks
  const showAlerts = userSettings?.modules?.alerts ?? true;
  const showStats = userSettings?.modules?.statistics ?? true;

  const { colors, glassStyle, isDark } = useTheme();
  const styles = getStyles(colors, glassStyle);

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={[styles.headerSection, { paddingTop: insets.top, marginBottom: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Skeleton width={150} height={28} style={{ marginBottom: 8 }} />
                <Skeleton width={200} height={16} />
              </View>
              <Skeleton circle width={40} height={40} />
            </View>
          </View>

          <View style={styles.kpiGrid}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                width={(screenWidth - Spacing.md * 3) / 2}
                height={130}
                style={{ marginBottom: Spacing.xs, borderRadius: BorderRadius.lg }}
              />
            ))}
          </View>

          <Skeleton width="100%" height={200} style={{ marginBottom: Spacing.md, borderRadius: BorderRadius.lg }} />
          <Skeleton width="100%" height={150} style={{ marginBottom: Spacing.md, borderRadius: BorderRadius.lg }} />
          <Skeleton width="100%" height={150} style={{ borderRadius: BorderRadius.lg }} />
        </ScrollView>
      </LinearGradient>
    );
  }

  function KpiCard({ icon, label, value, color, isCurrency = false }: KpiCardProps) {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;
    const isNumber = !isNaN(numericValue);

    return (
      <View style={[styles.kpiCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {isNumber ? (
          <AnimatedCounter
            value={numericValue}
            style={[styles.kpiValue, { color: colors.text }]}
            suffix={isCurrency ? ` ${getCurrencySymbol(user?.currency)}` : ''}
          />
        ) : (
          <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
        )}
        <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    );
  }

  function StatusBadge({ label, count, color }: { label: string; count: number; color: string }) {
    return (
      <View style={[styles.statusBadge, { borderColor: color + '40' }]}>
        <Text style={[styles.statusCount, { color }]}>{count}</Text>
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={[styles.headerSection, { paddingTop: insets.top }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.greeting}>{t('dashboard.greeting', { name: user?.name })}</Text>
              <Text style={styles.subGreeting}>{t('dashboard.sub_greeting')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowNotifModal(true)}
                  style={{ position: 'relative', padding: 8 }}
                >
                  <Ionicons name="megaphone-outline" size={26} color={colors.primary} />
                  <View style={{
                    position: 'absolute',
                    right: 4,
                    top: 4,
                    backgroundColor: colors.danger,
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 2,
                    borderColor: colors.bgDark
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{notifCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setShowDashboardSettings(true)}
                style={{
                  padding: 8,
                  backgroundColor: colors.glass,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.glassBorder
                }}
              >
                <Ionicons name="options-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Daily Tip */}
        {tip && !isDismissed && (
          <TipCard
            tip={tip}
            onDismiss={dismissTip}
            onNavigate={(link) => router.push(link as any)}
          />
        )}

        {renderKPIs()}

        {/* Profitability Analysis — NEW */}
        {userSettings?.dashboard_layout?.show_profitability && stats?.profit_by_category && stats.profit_by_category.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dashboard.profitability_analysis')}</Text>
            <BarChart
              data={{
                labels: stats.profit_by_category.map(c => c.name),
                datasets: [{ data: stats.profit_by_category.map(c => c.value) }]
              }}
              width={screenWidth - Spacing.md * 2}
              height={220}
              yAxisLabel=""
              yAxisSuffix={" " + getCurrencySymbol(user?.currency)}
              chartConfig={{
                backgroundColor: colors.bgMid,
                backgroundGradientFrom: colors.bgMid,
                backgroundGradientTo: colors.bgMid,
                decimalPlaces: 0,
                color: (opacity = 1) => colors.success,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: { borderRadius: 16 },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
              showValuesOnTopOfBars
              fromZero
            />
          </View>
        )}

        {/* Statut des stocks */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_stock_status) && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>{t('dashboard.stock_status')}</Text>
            <View style={styles.statusRow}>
              <StatusBadge label={t('dashboard.out_of_stock')} count={data?.out_of_stock_count ?? 0} color={colors.danger} />
              <StatusBadge label={t('dashboard.low_stock')} count={data?.low_stock_count ?? 0} color={colors.warning} />
              <StatusBadge label={t('dashboard.overstock')} count={data?.overstock_count ?? 0} color={colors.info} />
            </View>
            {data?.critical_products && data.critical_products.length > 0 && (
              <View style={{ marginTop: Spacing.md }}>
                {(showAllCritical ? data.critical_products : data.critical_products.slice(0, 5)).map((product) => (
                  <View key={product.product_id} style={styles.criticalItem}>
                    <View style={styles.criticalInfo}>
                      <Text style={styles.criticalName}>{product.name}</Text>
                      <Text style={styles.criticalQty}>
                        {product.quantity} {product.unit}(s)
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.criticalBadge,
                        { backgroundColor: product.quantity === 0 ? colors.danger + '20' : colors.warning + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.criticalBadgeText,
                          { color: product.quantity === 0 ? colors.danger : colors.warning },
                        ]}
                      >
                        {product.quantity === 0 ? t('dashboard.out_of_stock') : t('dashboard.low_stock')}
                      </Text>
                    </View>
                  </View>
                ))}

                {data.critical_products.length > 5 && (
                  <TouchableOpacity
                    style={styles.seeMoreBtn}
                    onPress={() => setShowAllCritical(!showAllCritical)}
                  >
                    <Text style={styles.seeMoreText}>
                      {showAllCritical ? t('dashboard.see_less') : t('dashboard.see_more_count', { count: data.critical_products.length - 5 })}
                    </Text>
                    <Ionicons name={showAllCritical ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* AI Daily Summary */}
        <AiDailySummary />

        {/* Smart Reminders */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_smart_reminders) && (
          <SmartRemindersCard onNavigate={(route) => router.push(route as any)} />
        )}

        {/* Sales Forecast */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_forecast) && (
          <ForecastCard />
        )}

        {/* Alertes récentes */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_recent_alerts) && data?.recent_alerts && data.recent_alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dashboard.recent_alerts')}</Text>
            {data.recent_alerts.slice(0, 3).map((alert) => (
              <View key={alert.alert_id} style={styles.alertItem}>
                <Ionicons
                  name={
                    alert.severity === 'critical'
                      ? 'warning'
                      : alert.severity === 'warning'
                        ? 'alert-circle'
                        : 'information-circle'
                  }
                  size={20}
                  color={
                    alert.severity === 'critical'
                      ? colors.danger
                      : alert.severity === 'warning'
                        ? colors.warning
                        : colors.info
                  }
                />
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Ventes Récentes */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_recent_sales) && data?.recent_sales && data.recent_sales.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>{t('dashboard.recent_sales')}</Text>
            </View>
            <View style={styles.recentSalesList}>
              {data.recent_sales.map(sale => (
                <View key={sale.sale_id} style={styles.recentSaleItem}>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleDate}>{formatDate(sale.created_at)}</Text>
                    <Text style={styles.saleItemsCount}>{t('common.items_count', { count: sale.items.length })}</Text>
                  </View>
                  <Text style={styles.saleAmount}>{globalFormatCurrency(sale.total_amount, user?.currency)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Evolution Valeur Stock */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_stock_chart) && stats?.stock_value_history && stats.stock_value_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dashboard.stock_evolution')}</Text>
            <LineChart
              data={{
                labels: stats.stock_value_history.map(d => {
                  const parts = d.date.split('-');
                  return `${parts[2]}/${parts[1]}`;
                }),
                datasets: [
                  {
                    data: stats.stock_value_history.map(d => d.value),
                    color: (opacity = 1) => colors.primary,
                    strokeWidth: 2
                  }
                ]
              }}
              width={screenWidth - Spacing.md * 2}
              height={220}
              yAxisLabel=""
              yAxisSuffix={" " + getCurrencySymbol(user?.currency)}
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: colors.bgMid,
                backgroundGradientFrom: colors.bgMid,
                backgroundGradientTo: colors.bgMid,
                decimalPlaces: 0,
                color: (opacity = 1) => isDark
                  ? `rgba(255, 255, 255, ${opacity})`
                  : `rgba(0, 0, 0, ${opacity * 0.5})`,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: colors.primary
                }
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16
              }}
            />
          </View>
        )}

        {/* Répartition par Catégorie */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_category_chart) && stats?.stock_by_category && stats.stock_by_category.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dashboard.category_distribution')}</Text>
            <PieChart
              data={stats.stock_by_category.map((c, i) => ({
                name: c.name,
                population: c.value,
                color: [colors.primary, colors.secondary, colors.success, colors.warning, colors.danger, colors.info][i % 6] || colors.primary,
                legendFontColor: colors.text,
                legendFontSize: 12
              }))}
              width={screenWidth - Spacing.md * 2}
              height={220}
              chartConfig={{
                color: (opacity = 1) => isDark
                  ? `rgba(255, 255, 255, ${opacity})`
                  : `rgba(0, 0, 0, ${opacity * 0.6})`,
              }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </View>
        )}

        {/* Analyse ABC */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_abc_analysis) && stats?.abc_analysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dashboard.abc_analysis')}</Text>
            <View style={styles.abcContainer}>
              <View style={[styles.abcCard, { borderLeftColor: colors.success, borderLeftWidth: 4 }]}>
                <Text style={[styles.abcClass, { color: colors.success }]}>{t('dashboard.class_a')}</Text>
                <Text style={styles.abcCount}>{t('dashboard.products_count', { count: stats.abc_analysis.A.length })}</Text>
                <Text style={styles.abcDesc}>{t('dashboard.class_a_desc')}</Text>
              </View>
              <View style={[styles.abcCard, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
                <Text style={[styles.abcClass, { color: colors.primary }]}>{t('dashboard.class_b')}</Text>
                <Text style={styles.abcCount}>{t('dashboard.products_count', { count: stats.abc_analysis.B.length })}</Text>
                <Text style={styles.abcDesc}>{t('dashboard.class_b_desc')}</Text>
              </View>
              <View style={[styles.abcCard, { borderLeftColor: colors.textMuted, borderLeftWidth: 4 }]}>
                <Text style={[styles.abcClass, { color: colors.textMuted }]}>{t('dashboard.class_c')}</Text>
                <Text style={styles.abcCount}>{t('dashboard.products_count', { count: stats.abc_analysis.C.length })}</Text>
                <Text style={styles.abcDesc}>{t('dashboard.class_c_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.abcFooter}
              onPress={() => setShowStatsModal(true)}
            >
              <Text style={styles.abcFooterText}>{t('dashboard.see_detail_product')}</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Réapprovisionnement Intelligent */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_reorder) && stats?.reorder_recommendations && stats.reorder_recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.smart_replenishment')}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.reorder_recommendations.length}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reorderScroll}>
              {stats.reorder_recommendations.map((item) => (
                <View key={item.product_id} style={styles.reorderCard}>
                  <View style={[styles.reorderStatus, { backgroundColor: item.priority === 'critical' ? colors.danger : colors.warning }]} />
                  <Text style={styles.reorderName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.reorderMeta}>{t('dashboard.reorder_stock_meta', { current: item.current_quantity, threshold: item.reorder_point })}</Text>
                  <Text style={styles.reorderSuggest}>{t('dashboard.reorder_suggested', { qty: item.suggested_quantity })}</Text>
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => router.push('/orders')}
                  >
                    <Ionicons name="cart-outline" size={16} color="#FFF" />
                    <Text style={styles.orderButtonText}>{t('dashboard.order_btn')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Inventaire Tournant */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_inventory_tasks) && inventoryTasks.length > 0 && (
          <View style={[styles.section, { marginTop: Spacing.md }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.rotating_inventory')}</Text>
              <View style={[styles.badge, { backgroundColor: colors.info }]}>
                <Text style={styles.badgeText}>{inventoryTasks.length}</Text>
              </View>
            </View>
            <View style={styles.inventoryContainer}>
              {inventoryTasks.slice(0, 3).map((task) => (
                <View key={task.task_id} style={styles.inventoryItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inventoryProductName}>{task.product_name}</Text>
                    <Text style={styles.inventoryMeta}>{t('dashboard.expected_qty', { qty: task.expected_quantity })}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.countButton}
                    onPress={() => {
                      Alert.prompt(
                        t('dashboard.count_stock'),
                        t('dashboard.enter_actual_qty', { name: task.product_name }),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('common.validate'),
                            onPress: async (val: string | undefined) => {
                              if (val) {
                                await inventory.submitResult(task.task_id, parseInt(val));
                                loadData();
                              }
                            }
                          }
                        ],
                        'plain-text',
                        task.expected_quantity.toString()
                      );
                    }}
                  >
                    <Text style={styles.countButtonText}>{t('dashboard.count_btn')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={async () => {
                  await inventory.generateTasks();
                  loadData();
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.generateBtnText}>{t('dashboard.generate_tasks')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Alertes Péremption */}
        {(!userSettings?.dashboard_layout || userSettings.dashboard_layout.show_expiry_alerts) && stats?.expiry_alerts && stats.expiry_alerts.length > 0 && (
          <View style={[styles.section, { marginTop: Spacing.md }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.expiry_alerts')}</Text>
              <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                <Text style={styles.badgeText}>{stats.expiry_alerts.length}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reorderScroll}>
              {stats.expiry_alerts.map((item, i) => {
                const expiryDate = new Date(item.expiry_date);
                const daysRemaining = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <View key={`${item.product_id}-${i}`} style={styles.reorderCard}>
                    <View style={[styles.reorderStatus, { backgroundColor: item.priority === 'critical' ? colors.danger : colors.warning }]} />
                    <Text style={styles.reorderName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.reorderMeta}>{t('common.batch') || 'Lot'}: {item.batch_number}</Text>
                    <Text style={[styles.reorderSuggest, { color: item.priority === 'critical' ? colors.danger : colors.warning }]}>
                      {daysRemaining <= 0 ? t('dashboard.expired') : t('dashboard.days_remaining', { count: daysRemaining })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={openStatsModal}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>{t('dashboard.stats')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={openHistoryModal}>
            <Ionicons name="time-outline" size={20} color={colors.secondary} />
            <Text style={styles.actionButtonText}>{t('dashboard.history')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dashboard.movement_history')}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <TouchableOpacity onPress={exportHistory}>
                  <Ionicons name="download-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Selector */}
            <View style={{ marginBottom: Spacing.sm }}>
              <PeriodSelector
                selectedPeriod={historyPeriod}
                onSelectPeriod={setHistoryPeriod}
                startDate={historyStartDate}
                endDate={historyEndDate}
                onApplyCustomDate={(start: string, end: string) => {
                  setHistoryStartDate(new Date(start));
                  setHistoryEndDate(new Date(end));
                }}
              />
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
              {(['all', 'in', 'out'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, historyFilter === f && styles.filterChipActive]}
                  onPress={() => setHistoryFilter(f)}
                >
                  <Text style={[styles.filterChipText, historyFilter === f && styles.filterChipTextActive]}>
                    {f === 'all' ? t('common.all') : f === 'in' ? t('dashboard.entries') : t('dashboard.exits')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {filteredMovements.length === 0 ? (
                  <Text style={styles.emptyText}>{t('dashboard.no_movements')}</Text>
                ) : (
                  filteredMovements.map((mov) => (
                    <View key={mov.movement_id} style={styles.movementItem}>
                      <View style={[styles.movementIcon, { backgroundColor: (mov.type === 'in' ? colors.success : colors.warning) + '20' }]}>
                        <Ionicons
                          name={mov.type === 'in' ? 'arrow-down-outline' : 'arrow-up-outline'}
                          size={18}
                          color={mov.type === 'in' ? colors.success : colors.warning}
                        />
                      </View>
                      <View style={styles.movementInfo}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.movementQty, { fontWeight: 'bold', marginBottom: 2 }]}>
                            {mov.product_name || t('common.unknown_product')}
                          </Text>
                          <Text style={styles.movementQty}>
                            {mov.type === 'in' ? '+' : '-'}{mov.quantity} ({mov.previous_quantity} → {mov.new_quantity})
                          </Text>
                          {mov.reason ? <Text style={styles.movementReason}>{mov.reason}</Text> : null}
                          <Text style={styles.movementDate}>{formatDate(mov.created_at)}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Statistics Modal */}
      <Modal visible={showStatsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{t('dashboard.greeting', { name: '' })}</Text>
                <Text style={styles.username}>{user?.name || t('common.merchant')}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => setShowGuide(true)}>
                  <Ionicons name="help-circle-outline" size={24} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
                  <Image
                    source={{ uri: user?.picture || 'https://ui-avatars.com/api/?name=' + (user?.name || 'User') }}
                    style={styles.avatar}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dashboard.stats')}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <TouchableOpacity onPress={exportStats}>
                  <Ionicons name="download-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>


            {statsLoading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : statsData ? (
              <ScrollView style={styles.modalScroll}>
                {/* Movements summary */}
                <View style={styles.statsSection}>
                  <Text style={styles.statsSectionTitle}>{t('dashboard.movements_30d')}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statsCard}>
                      <Ionicons name="arrow-down-outline" size={20} color={colors.success} />
                      <Text style={[styles.statsCardValue, { color: colors.success }]}>{statsData.movements_summary.in}</Text>
                      <Text style={styles.statsCardLabel}>{t('dashboard.entries')}</Text>
                    </View>
                    <View style={styles.statsCard}>
                      <Ionicons name="arrow-up-outline" size={20} color={colors.warning} />
                      <Text style={[styles.statsCardValue, { color: colors.warning }]}>{statsData.movements_summary.out}</Text>
                      <Text style={styles.statsCardLabel}>{t('dashboard.exits')}</Text>
                    </View>
                    <View style={styles.statsCard}>
                      <Ionicons name="swap-vertical-outline" size={20} color={colors.info} />
                      <Text style={[styles.statsCardValue, { color: colors.info }]}>{statsData.movements_summary.net}</Text>
                      <Text style={styles.statsCardLabel}>{t('dashboard.net')}</Text>
                    </View>
                  </View>
                </View>

                {/* Stock by category */}
                {statsData.stock_by_category.length > 0 && (
                  <View style={styles.statsSection}>
                    <Text style={styles.statsSectionTitle}>{t('dashboard.stock_by_category')}</Text>
                    {(() => {
                      const maxVal = Math.max(...statsData.stock_by_category.map((c) => c.count), 1);
                      return statsData.stock_by_category.map((cat, i) => (
                        <View key={i} style={styles.barRow}>
                          <Text style={styles.barLabel} numberOfLines={1}>{cat.name}</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${(cat.count / maxVal) * 100}%`, backgroundColor: colors.primary }]} />
                          </View>
                          <Text style={styles.barValue}>{cat.count}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                )}

                {/* Status distribution */}
                <View style={styles.statsSection}>
                  <Text style={styles.statsSectionTitle}>{t('dashboard.status_distribution')}</Text>
                  {(() => {
                    const entries = Object.entries(statsData.status_distribution);
                    const maxVal = Math.max(...entries.map(([, v]) => v), 1);
                    const statusColors: Record<string, string> = {
                      normal: colors.success, low_stock: colors.warning, out_of_stock: colors.danger, overstock: colors.info,
                    };
                    const statusLabels: Record<string, string> = {
                      normal: t('products.status_normal'), low_stock: t('products.status_low'), out_of_stock: t('products.status_out'), overstock: t('products.status_over'),
                    };
                    return entries.map(([key, val]) => (
                      <View key={key} style={styles.barRow}>
                        <Text style={styles.barLabel}>{statusLabels[key] || key}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${(val / maxVal) * 100}%`, backgroundColor: statusColors[key] || colors.primary }]} />
                        </View>
                        <Text style={styles.barValue}>{val}</Text>
                      </View>
                    ));
                  })()}
                </View>

                {/* Top products by value */}
                {statsData.top_products_by_value.length > 0 && (
                  <View style={styles.statsSection}>
                    <Text style={styles.statsSectionTitle}>{t('dashboard.top_products_value')}</Text>
                    {statsData.top_products_by_value.map((prod, i) => (
                      <View key={i} style={styles.topProductRow}>
                        <Text style={styles.topProductRank}>#{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.topProductName}>{prod.name}</Text>
                          <Text style={styles.topProductSub}>{t('products.product_count', { count: prod.quantity })}</Text>
                        </View>
                        <Text style={styles.topProductValue}>{formatCurrency(prod.value)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* ABC Analysis Details */}
                {statsData.abc_analysis && (
                  <View style={styles.statsSection}>
                    <Text style={styles.statsSectionTitle}>{t('dashboard.abc_analysis')}</Text>

                    {/* Class A */}
                    {statsData.abc_analysis.A.length > 0 && (
                      <View style={{ marginBottom: Spacing.md }}>
                        <Text style={[styles.abcClassTitle, { color: colors.success }]}>{t('dashboard.class_a')}</Text>
                        {statsData.abc_analysis.A.slice(0, 5).map((item, i) => (
                          <View key={i} style={styles.abcDetailRow}>
                            <Text style={styles.abcDetailName}>{item.name}</Text>
                            <Text style={styles.abcDetailValue}>{item.percentage.toFixed(1)}% du CA</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Class B */}
                    {statsData.abc_analysis.B.length > 0 && (
                      <View style={{ marginBottom: Spacing.md }}>
                        <Text style={[styles.abcClassTitle, { color: colors.primary }]}>{t('dashboard.class_b')}</Text>
                        {statsData.abc_analysis.B.slice(0, 5).map((item, i) => (
                          <View key={i} style={styles.abcDetailRow}>
                            <Text style={styles.abcDetailName}>{item.name}</Text>
                            <Text style={styles.abcDetailValue}>{item.percentage.toFixed(1)}%</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Class C */}
                    {statsData.abc_analysis.C.length > 0 && (
                      <View>
                        <Text style={[styles.abcClassTitle, { color: colors.textMuted }]}>{t('dashboard.class_c')}</Text>
                        <Text style={styles.abcDetailName}>{t('dashboard.other_products_count', { count: statsData.abc_analysis.C.length })}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Orders stats */}
                <View style={styles.statsSection}>
                  <Text style={styles.statsSectionTitle}>{t('tabs.orders')}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statsCard}>
                      <Text style={[styles.statsCardValue, { color: colors.warning }]}>{statsData.orders_stats.pending}</Text>
                      <Text style={styles.statsCardLabel}>{t('orders.status_pending')}</Text>
                    </View>
                    <View style={styles.statsCard}>
                      <Text style={[styles.statsCardValue, { color: colors.success }]}>{statsData.orders_stats.completed}</Text>
                      <Text style={styles.statsCardLabel}>{t('orders.status_completed')}</Text>
                    </View>
                    <View style={styles.statsCard}>
                      <Text style={[styles.statsCardValue, { color: colors.primary }]}>{formatCurrency(statsData.orders_stats.total_value)}</Text>
                      <Text style={styles.statsCardLabel}>{t('common.total_value')}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      <ScreenGuide
        visible={showGuide}
        onClose={() => { setShowGuide(false); markSeen(); }}
        title={GUIDES.sales.title} // Dashboard acts as Sales/POS entry often
        steps={GUIDES.sales.steps}
      />

      {/* Notifications Modal */}
      {showNotifModal && (
        <Modal visible={showNotifModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '60%', marginTop: 'auto' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('dashboard.admin_messages')}</Text>
                <TouchableOpacity onPress={() => setShowNotifModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ padding: Spacing.md }}>
                {notifications.map((n: any, i: number) => (
                  <View key={n.message_id || i} style={{ paddingVertical: 12, borderBottomWidth: i < notifications.length - 1 ? 1 : 0, borderBottomColor: colors.divider }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{n.title}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{new Date(n.sent_at).toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>{n.content}</Text>
                  </View>
                ))}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <DashboardSettingsModal
        visible={showDashboardSettings}
        onClose={() => setShowDashboardSettings(false)}
        settings={userSettings}
        onUpdate={updateDashboardLayout}
      />
    </LinearGradient>
  );
}


const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.xl + (Platform.OS === 'ios' ? 40 : 20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs },
  greeting: { fontSize: FontSize.xl, fontWeight: '700', color: colors.text },
  username: { fontSize: FontSize.md, color: colors.textSecondary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass },
  subGreeting: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  kpiCard: {
    ...glassStyle,
    width: (screenWidth - Spacing.md * 3) / 2,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  kpiIcon: { width: 48, height: 48, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  kpiValue: { fontSize: FontSize.xl, fontWeight: 'bold', color: colors.text, marginBottom: Spacing.xs },
  kpiLabel: { fontSize: FontSize.xs, color: colors.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginBottom: Spacing.md },
  statusSection: { backgroundColor: colors.bgMid, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl },
  statusRow: { flexDirection: 'row', gap: Spacing.sm },
  abcContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: Spacing.sm },
  abcCard: { ...glassStyle, flex: 1, padding: Spacing.sm, backgroundColor: colors.glass },
  abcClass: { fontSize: FontSize.sm, fontWeight: 'bold', marginBottom: 2 },
  abcCount: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  abcDesc: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  abcFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, gap: Spacing.xs },
  abcFooterText: { color: colors.primaryLight, fontSize: FontSize.sm, fontWeight: '600' },
  abcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  abcTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  abcBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  abcBadgeText: { color: colors.primaryLight, fontSize: FontSize.xs, fontWeight: '700' },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, marginTop: Spacing.xs,
  },
  seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  abcChartPlaceholder: { height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.glass, borderRadius: BorderRadius.md, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.divider },
  abcDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  abcDetailItem: { alignItems: 'center' },
  abcDetailLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  abcDetailValue: { fontSize: FontSize.sm, color: colors.text, fontWeight: '700' },
  abcDetailName: { fontSize: FontSize.sm, color: colors.text, flex: 1 },
  abcClassTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text, marginBottom: Spacing.xs },
  statusBadge: { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass },
  statusCount: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  statusLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 },
  section: { ...glassStyle, padding: Spacing.md, marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  criticalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  criticalInfo: { flex: 1 },
  criticalName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  criticalQty: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  criticalBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  criticalBadgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  alertItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  alertInfo: { flex: 1 },
  alertTitle: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
  alertMessage: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  badge: { backgroundColor: colors.danger, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionButton: { flex: 1, ...glassStyle, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  actionButtonText: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.bgMid, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  modalScroll: { maxHeight: 600 },
  emptyText: { fontSize: FontSize.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  filterChipActive: { backgroundColor: colors.primary + '30', borderColor: colors.primary },
  filterChipText: { fontSize: FontSize.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.primaryLight, fontWeight: '600' },
  movementItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  movementIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  movementInfo: { flex: 1 },
  movementQty: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  movementReason: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  movementDate: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 },
  statsSection: { marginBottom: Spacing.lg },
  statsSectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: colors.primaryLight, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statsCard: { flex: 1, ...glassStyle, padding: Spacing.md, alignItems: 'center' },
  statsCardValue: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  statsCardLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: Spacing.xs, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  barLabel: { width: 80, fontSize: FontSize.xs, color: colors.textSecondary, marginRight: Spacing.sm },
  barTrack: { flex: 1, height: 16, backgroundColor: colors.glass, borderRadius: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8 },
  barValue: { width: 36, fontSize: FontSize.xs, color: colors.text, textAlign: 'right', marginLeft: Spacing.sm, fontWeight: '600' },
  topProductRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  topProductRank: { fontSize: FontSize.md, fontWeight: '700', color: colors.primary, width: 28 },
  topProductName: { fontSize: FontSize.md, fontWeight: '600', color: colors.text },
  topProductSub: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  topProductValue: { fontSize: FontSize.md, fontWeight: '700', color: colors.success },
  inventoryContainer: { backgroundColor: colors.glass, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.xs },
  inventoryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  inventoryProductName: { color: colors.text, fontSize: FontSize.md, fontWeight: '600' },
  inventoryMeta: { color: colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  countButton: { backgroundColor: colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  countButtonText: { color: colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, marginTop: Spacing.xs },
  generateBtnText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600', marginLeft: Spacing.xs },
  sectionContainer: { marginTop: Spacing.lg, marginBottom: Spacing.xs },
  horizontalScroll: { paddingRight: Spacing.lg },
  stockUrgencyCard: { ...glassStyle, padding: Spacing.md, marginRight: Spacing.sm, width: 160, borderLeftWidth: 4, borderLeftColor: colors.danger },
  urgencyName: { fontSize: FontSize.sm, fontWeight: '700', color: colors.text, marginBottom: 4 },
  urgencyQty: { fontSize: FontSize.xs, fontWeight: '600' },
  recentSalesList: { gap: Spacing.sm },
  recentSaleItem: { ...glassStyle, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  saleInfo: { flex: 1 },
  saleDate: { fontSize: FontSize.sm, fontWeight: '600', color: colors.text },
  saleItemsCount: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  saleAmount: { fontSize: FontSize.md, fontWeight: '700', color: colors.primaryLight },
  orderButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 8, borderRadius: BorderRadius.md },
  orderButtonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  reorderScroll: { gap: Spacing.md, paddingBottom: Spacing.sm },
  reorderCard: { ...glassStyle, width: 200, padding: Spacing.md, backgroundColor: colors.glass },
  reorderStatus: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
  reorderName: { fontSize: FontSize.md, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  reorderMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  reorderSuggest: { fontSize: 14, color: colors.primaryLight, fontWeight: '600', marginBottom: Spacing.md },
});

