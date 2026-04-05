import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AccessDenied from '../../components/AccessDenied';
import EnterpriseGate from '../../components/EnterpriseGate';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { analytics, AnalyticsStoreComparison, stores as storesApi, Store } from '../../services/api';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import { formatCurrency, formatNumber } from '../../utils/format';

type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

function MetricCard({
  label,
  value,
  icon,
  accent,
  styles,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  styles: ReturnType<typeof getStyles>;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function EnterpriseScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, glassStyle } = useTheme();
  const { user, isOrgAdmin, isSuperAdmin, hasPermission, switchStore } = useAuth();
  const styles = getStyles(colors, glassStyle);

  const effectivePlan = user?.effective_plan || user?.plan;
  const hasEnterprisePlan = isSuperAdmin || effectivePlan === 'enterprise';
  const canReadStock = hasPermission('stock', 'read');
  const canManageStores = isOrgAdmin;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const lastLoadedAtRef = useRef(0);
  const FOCUS_TTL_MS = 60_000;
  const [comparison, setComparison] = useState<AnalyticsStoreComparison | null>(null);
  const [storeList, setStoreList] = useState<Store[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [switchingStoreId, setSwitchingStoreId] = useState<string | null>(null);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');

  const loadData = useCallback(async () => {
    if (!hasEnterprisePlan || !isOrgAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [storesRes, comparisonRes] = await Promise.allSettled([
        storesApi.list(),
        analytics.getStoreComparison({ days: 30 }),
      ]);

      if (storesRes.status === 'fulfilled') {
        setStoreList(storesRes.value || []);
      } else {
        setStoreList([]);
      }

      if (comparisonRes.status === 'fulfilled') {
        setComparison(comparisonRes.value);
      } else {
        setComparison(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      lastLoadedAtRef.current = Date.now();
    }
  }, [hasEnterprisePlan, isOrgAdmin]);

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoadedAtRef.current < FOCUS_TTL_MS) return;
      setLoading(true);
      void loadData();
    }, [loadData]),
  );

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      {
        id: 'users',
        title: 'Équipe',
        description: 'Inviter, limiter et répartir les accès par boutique.',
        icon: 'people-outline',
        color: colors.primary,
        onPress: () => router.push('/users'),
      },
      {
        id: 'activity',
        title: 'Activité',
        description: 'Suivre les actions réalisées sur le compte.',
        icon: 'time-outline',
        color: colors.info,
        onPress: () => router.push('/activity'),
      },
      {
        id: 'locations',
        title: 'Emplacements',
        description: 'Gérer les structures d’allées, zones, niveaux et étagères.',
        icon: 'location-outline',
        color: colors.warning,
        onPress: () => router.push('/(tabs)/locations' as never),
      },
      {
        id: 'settings',
        title: 'Boutique active',
        description: 'Modifier l’identité et les documents de la boutique courante.',
        icon: 'storefront-outline',
        color: colors.success,
        onPress: () => router.push('/settings'),
      },
      {
        id: 'subscription',
        title: 'Abonnement',
        description: 'Voir le plan, l’échéance et la facturation du compte.',
        icon: 'card-outline',
        color: '#F59E0B',
        onPress: () => router.push('/subscription'),
      },
    ];

    return canReadStock ? actions : actions.filter((action) => action.id !== 'locations');
  }, [canReadStock, colors.info, colors.primary, colors.success, colors.warning, router]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleSwitchStore = async (storeId: string) => {
    if (!storeId || storeId === user?.active_store_id) return;
    setSwitchingStoreId(storeId);
    try {
      await switchStore(storeId);
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || 'Impossible de changer de boutique pour le moment.');
    } finally {
      setSwitchingStoreId(null);
    }
  };

  const handleCreateStore = async () => {
    const trimmedName = newStoreName.trim();
    if (!trimmedName) {
      Alert.alert(t('common.error'), 'Saisissez au moins le nom de la boutique.');
      return;
    }

    setCreating(true);
    try {
      const created = await storesApi.create({
        name: trimmedName,
        address: newStoreAddress.trim() || undefined,
      });
      await switchStore(created.store_id);
      setShowCreateModal(false);
      setNewStoreName('');
      setNewStoreAddress('');
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || 'Impossible de créer cette boutique.');
    } finally {
      setCreating(false);
    }
  };

  if (!hasEnterprisePlan) {
    return (
      <EnterpriseGate
        locked
        featureName="Pilotage Enterprise"
        description="Le pilotage multi-boutiques et les emplacements avancés sont réservés au plan Enterprise."
        benefits={[
          'Comparer les performances de toutes les boutiques',
          'Créer des structures d’emplacements avancées',
          'Superviser l’équipe et les accès par boutique',
        ]}
        icon="business-outline"
      >
        <View />
      </EnterpriseGate>
    );
  }

  if (!isOrgAdmin) {
    return (
      <AccessDenied message="Le pilotage Enterprise mobile est réservé aux administrateurs opérations." />
    );
  }

  const totals = comparison?.totals;
  const currency = comparison?.currency || user?.currency || 'XOF';

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.screen}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              {canManageStores ? (
                <TouchableOpacity style={styles.headerAction} onPress={() => setShowCreateModal(true)}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.headerActionText}>Nouvelle boutique</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.headerEyebrow}>Enterprise</Text>
            <Text style={styles.headerTitle}>Pilotage mobile</Text>
            <Text style={styles.headerSubtitle}>
              Supervisez les boutiques, l’équipe et les emplacements avancés depuis le même backend que le web.
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vue consolidée</Text>
                <View style={styles.metricsGrid}>
                  <MetricCard
                    label="Boutiques"
                    value={formatNumber(totals?.store_count || storeList.length)}
                    icon="business-outline"
                    accent={colors.primary}
                    styles={styles}
                  />
                  <MetricCard
                    label="CA consolidé"
                    value={formatCurrency(totals?.revenue || 0, currency)}
                    icon="cash-outline"
                    accent={colors.success}
                    styles={styles}
                  />
                  <MetricCard
                    label="Ventes"
                    value={formatNumber(totals?.sales_count || 0)}
                    icon="receipt-outline"
                    accent={colors.info}
                    styles={styles}
                  />
                  <MetricCard
                    label="Stock valorisé"
                    value={formatCurrency(totals?.stock_value || 0, currency)}
                    icon="cube-outline"
                    accent={colors.warning}
                    styles={styles}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accès rapides</Text>
                <View style={styles.actionsGrid}>
                  {quickActions.map((action) => (
                    <TouchableOpacity key={action.id} style={styles.quickActionCard} onPress={action.onPress}>
                      <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                        <Ionicons name={action.icon} size={20} color={action.color} />
                      </View>
                      <Text style={styles.quickActionTitle}>{action.title}</Text>
                      <Text style={styles.quickActionDescription}>{action.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Boutiques du compte</Text>
                  <Text style={styles.sectionMeta}>{storeList.length} au total</Text>
                </View>
                {storeList.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="storefront-outline" size={28} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>{t('enterprise.no_stores', 'Aucune boutique pour le moment')}</Text>
                    <Text style={styles.emptyDescription}>
                      {t('enterprise.no_stores_desc', 'Créez votre première boutique pour commencer à piloter le compte Enterprise.')}
                    </Text>
                  </View>
                ) : (
                  storeList.map((store) => {
                    const comparisonRow = comparison?.stores?.find((item) => item.store_id === store.store_id);
                    const isActive = user?.active_store_id === store.store_id;
                    return (
                      <View key={store.store_id} style={styles.storeCard}>
                        <View style={styles.storeHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.storeTitleRow}>
                              <Text style={styles.storeTitle}>{store.name}</Text>
                              {isActive ? (
                                <View style={styles.activeBadge}>
                                  <Text style={styles.activeBadgeText}>Active</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.storeAddress}>
                              {store.address?.trim() || 'Adresse non renseignée'}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.switchButton, isActive && styles.switchButtonDisabled]}
                            disabled={isActive || switchingStoreId === store.store_id}
                            onPress={() => handleSwitchStore(store.store_id)}
                          >
                            {switchingStoreId === store.store_id ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <>
                                <Ionicons
                                  name={isActive ? 'checkmark-circle-outline' : 'swap-horizontal-outline'}
                                  size={16}
                                  color={isActive ? colors.success : colors.primary}
                                />
                                <Text style={[styles.switchButtonText, { color: isActive ? colors.success : colors.primary }]}>
                                  {isActive ? 'Courante' : 'Basculer'}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                        <View style={styles.storeMetricsRow}>
                          <View style={styles.storeMetric}>
                            <Text style={styles.storeMetricValue}>
                              {formatCurrency(comparisonRow?.revenue || 0, currency)}
                            </Text>
                            <Text style={styles.storeMetricLabel}>CA</Text>
                          </View>
                          <View style={styles.storeMetric}>
                            <Text style={styles.storeMetricValue}>{formatNumber(comparisonRow?.sales_count || 0)}</Text>
                            <Text style={styles.storeMetricLabel}>Ventes</Text>
                          </View>
                          <View style={styles.storeMetric}>
                            <Text style={styles.storeMetricValue}>
                              {formatCurrency(comparisonRow?.stock_value || 0, currency)}
                            </Text>
                            <Text style={styles.storeMetricLabel}>Stock</Text>
                          </View>
                          <View style={styles.storeMetric}>
                            <Text style={styles.storeMetricValue}>{formatNumber(comparisonRow?.low_stock_count || 0)}</Text>
                            <Text style={styles.storeMetricLabel}>Stocks bas</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </>
          )}
        </ScrollView>
      </LinearGradient>

      {showCreateModal && <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle boutique</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={newStoreName}
              onChangeText={setNewStoreName}
              placeholder="Nom de la boutique"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={newStoreAddress}
              onChangeText={setNewStoreAddress}
              placeholder="Adresse (facultatif)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCreateModal(false)} disabled={creating}>
                <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateStore} disabled={creating}>
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}
    </View>
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  headerEyebrow: {
    color: '#C4B5FD',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: FontSize.xs,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: FontSize.xxl,
    fontWeight: '900',
  },
  headerSubtitle: {
    marginTop: Spacing.sm,
    color: 'rgba(255,255,255,0.86)',
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  loadingCard: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metricCard: {
    width: '47%',
    minWidth: 150,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  metricValue: {
    color: colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  quickActionCard: {
    width: '47%',
    minWidth: 150,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  quickActionDescription: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyCard: {
    ...glassStyle,
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  storeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: Spacing.md,
  },
  storeHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  storeTitle: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  activeBadge: {
    backgroundColor: `${colors.success}22`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: colors.success,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  storeAddress: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 6,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + '55',
    backgroundColor: colors.primary + '12',
  },
  switchButtonDisabled: {
    borderColor: colors.success + '55',
    backgroundColor: colors.success + '12',
  },
  switchButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  storeMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  storeMetric: {
    minWidth: '47%',
    flex: 1,
    backgroundColor: colors.bgDark,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  storeMetricValue: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  storeMetricLabel: {
    color: colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    ...glassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primary,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
