import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { orders, products as productsApi, MatchSuggestion, DeliveryMappingItem, Product } from '../services/api';
import { Spacing, FontSize, BorderRadius } from '../constants/theme';

type Props = {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onConfirmed: () => void;
};

type Decision = {
  product_id?: string;
  product_name?: string;
  create_new: boolean;
};

export default function DeliveryConfirmationModal({ visible, orderId, onClose, onConfirmed }: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [inventory, setInventory] = useState<Product[]>([]);
  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible && orderId) {
      setSearchingFor(null);
      setSearchText('');
      loadSuggestions();
    }
  }, [visible, orderId]);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const [matchRes, invRes] = await Promise.all([
        orders.suggestMatches(orderId),
        productsApi.list(),
      ]);

      setSuggestions(matchRes.suggestions);
      setInventory(invRes.items ?? invRes as any);

      // Pre-fill decisions
      const decs: Record<string, Decision> = {};
      for (const s of matchRes.suggestions) {
        if (s.source === 'mapping' && s.matched_product_id) {
          decs[s.catalog_id] = { product_id: s.matched_product_id, product_name: s.matched_product_name ?? '', create_new: false };
        } else if (s.matched_product_id && s.confidence >= 0.7) {
          decs[s.catalog_id] = { product_id: s.matched_product_id, product_name: s.matched_product_name ?? '', create_new: false };
        } else {
          decs[s.catalog_id] = { create_new: true };
        }
      }
      setDecisions(decs);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de charger les suggestions');
    } finally {
      setLoading(false);
    }
  }

  function selectProduct(catalogId: string, product: Product) {
    setDecisions((prev) => ({
      ...prev,
      [catalogId]: { product_id: product.product_id, product_name: product.name, create_new: false },
    }));
    setSearchingFor(null);
    setSearchText('');
  }

  function toggleCreateNew(catalogId: string) {
    setDecisions((prev) => ({
      ...prev,
      [catalogId]: { create_new: true, product_id: undefined, product_name: undefined },
    }));
  }

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const mappings: DeliveryMappingItem[] = suggestions.map((s) => {
        const d = decisions[s.catalog_id];
        return {
          catalog_id: s.catalog_id,
          product_id: d?.product_id,
          create_new: d?.create_new ?? false,
        };
      });

      await orders.confirmDelivery(orderId, mappings);
      Alert.alert('Livraison confirmée', 'Le stock a été mis à jour.');
      onConfirmed();
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de confirmer la livraison');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredInventory = searchText
    ? inventory.filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase()))
    : inventory;

  function getConfidenceIcon(s: MatchSuggestion) {
    if (s.source === 'mapping') return { icon: 'checkmark-circle' as const, color: colors.success, label: 'Auto' };
    if (s.confidence >= 0.7) return { icon: 'thumbs-up' as const, color: colors.success, label: `${Math.round(s.confidence * 100)}%` };
    if (s.confidence >= 0.4) return { icon: 'help-circle' as const, color: colors.warning, label: `${Math.round(s.confidence * 100)}%` };
    return { icon: 'close-circle' as const, color: colors.danger, label: 'Aucun' };
  }

  const searchingSuggestion = searchingFor ? suggestions.find((s) => s.catalog_id === searchingFor) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.bgDark }]}>

        {/* ─── Product Selector View ─── */}
        {searchingFor ? (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { setSearchingFor(null); setSearchText(''); }}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                Associer : {searchingSuggestion?.catalog_name}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.divider }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Rechercher un produit..."
                placeholderTextColor={colors.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
            </View>

            <ScrollView style={styles.productList}>
              {filteredInventory.map((p) => (
                <TouchableOpacity
                  key={p.product_id}
                  style={[styles.productRow, { borderColor: colors.divider }]}
                  onPress={() => selectProduct(searchingFor, p)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, { color: colors.text }]}>{p.name}</Text>
                    <Text style={[styles.productMeta, { color: colors.textMuted }]}>
                      Stock: {p.quantity} {p.unit}
                    </Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              ))}
              {filteredInventory.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucun produit trouvé
                </Text>
              )}
            </ScrollView>
          </>
        ) : (
          /* ─── Main Suggestions View ─── */
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} disabled={submitting}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Confirmer la réception</Text>
              <View style={{ width: 24 }} />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Analyse IA des produits...
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 100 }}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    {suggestions.length} produit{suggestions.length > 1 ? 's' : ''} à associer
                  </Text>

                  {suggestions.map((s) => {
                    const ci = getConfidenceIcon(s);
                    const decision = decisions[s.catalog_id];

                    return (
                      <View key={s.catalog_id} style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                        {/* Catalog product header */}
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.catalogName, { color: colors.text }]}>{s.catalog_name}</Text>
                            <Text style={[styles.catalogMeta, { color: colors.textMuted }]}>
                              {s.quantity} x {s.unit_price.toLocaleString()} F
                              {s.catalog_category ? ` | ${s.catalog_category}` : ''}
                              {s.catalog_subcategory ? ` > ${s.catalog_subcategory}` : ''}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: ci.color + '20' }]}>
                            <Ionicons name={ci.icon} size={14} color={ci.color} />
                            <Text style={[styles.badgeText, { color: ci.color }]}>{ci.label}</Text>
                          </View>
                        </View>

                        {/* AI reason */}
                        {s.reason && s.source !== 'mapping' && (
                          <Text style={[styles.reason, { color: colors.textMuted }]}>
                            IA : {s.reason}
                          </Text>
                        )}

                        {/* Decision area */}
                        <View style={styles.decisionArea}>
                          {decision?.product_id && !decision.create_new ? (
                            <View style={styles.decisionRow}>
                              <Ionicons name="link" size={16} color={colors.success} />
                              <Text style={[styles.decisionText, { color: colors.text }]} numberOfLines={1}>
                                {decision.product_name}
                              </Text>
                              <TouchableOpacity
                                onPress={() => setSearchingFor(s.catalog_id)}
                                style={[styles.smallBtn, { borderColor: colors.divider }]}
                              >
                                <Text style={[styles.smallBtnText, { color: colors.primary }]}>Changer</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => toggleCreateNew(s.catalog_id)}
                                style={[styles.smallBtn, { borderColor: colors.divider }]}
                              >
                                <Text style={[styles.smallBtnText, { color: colors.warning }]}>Nouveau</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={styles.decisionRow}>
                              <Ionicons name="add-circle" size={16} color={colors.warning} />
                              <Text style={[styles.decisionText, { color: colors.warning }]}>
                                Créer un nouveau produit
                              </Text>
                              <TouchableOpacity
                                onPress={() => setSearchingFor(s.catalog_id)}
                                style={[styles.smallBtn, { borderColor: colors.divider }]}
                              >
                                <Text style={[styles.smallBtnText, { color: colors.primary }]}>Associer</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Bottom confirm button */}
                <View style={[styles.bottomBar, { backgroundColor: colors.bgDark, borderTopColor: colors.divider }]}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
                    onPress={handleConfirm}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.confirmBtnText}>Confirmer la réception</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  catalogName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  catalogMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  reason: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  decisionArea: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  decisionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  smallBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
    paddingBottom: Spacing.xl,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  // Product selector styles
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  productList: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  productMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSize.sm,
  },
});
