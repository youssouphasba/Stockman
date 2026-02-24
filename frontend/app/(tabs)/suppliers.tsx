import React, { useCallback, useMemo, useState } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  suppliers as suppliersApi,
  products as productsApi,
  supplierProducts as spApi,
  marketplace as marketplaceApi,
  orders as ordersApi,
  invitations as invitationsApi,
  replenishment as replenishmentApi,
  ai as aiApi,
  ReplenishmentSuggestion,
  Supplier,
  SupplierCreate,
  Product,
  SupplierProductLink,
  MarketplaceSupplier,
  MarketplaceSupplierDetail,
  CatalogProductData,
  SupplierStats,
  OrderWithDetails,
  SupplierInvoice,
  SupplierCommunicationLog,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Linking } from 'react-native';
import OrderCreationModal from '../../components/OrderCreationModal';
import ChatModal from '../../components/ChatModal';
import PremiumGate from '../../components/PremiumGate';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatUserCurrency, getCurrencySymbol } from '../../utils/format';


export default function SuppliersScreen() {
  const { colors, glassStyle } = useTheme();
  const { t, i18n } = useTranslation();
  const { user, isSuperAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, glassStyle);
  const router = useRouter();
  const [tab, setTab] = useState<'manual' | 'marketplace'>('manual');
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [replenishAdvice, setReplenishAdvice] = useState<string | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [filterSort, setFilterSort] = useState<'name' | 'recent' | 'delay'>('name');
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterHasEmail, setFilterHasEmail] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterProduct, setFilterProduct] = useState('');

  // Marketplace state
  const [mpSuppliers, setMpSuppliers] = useState<MarketplaceSupplier[]>([]);
  const [mpProducts, setMpProducts] = useState<CatalogProductData[]>([]);
  const [mpSearch, setMpSearch] = useState('');
  const [mpCity, setMpCity] = useState('');
  const [mpCategory, setMpCategory] = useState('');
  const [mpMinRating, setMpMinRating] = useState(0);
  const [mpVerifiedOnly, setMpVerifiedOnly] = useState(false);
  const [mpPriceMin, setMpPriceMin] = useState('');
  const [mpPriceMax, setMpPriceMax] = useState('');
  const [mpSearchType, setMpSearchType] = useState<'suppliers' | 'products'>('suppliers');
  const [mpLoading, setMpLoading] = useState(false);
  const [showMpFilters, setShowMpFilters] = useState(false);
  const [showMpDetail, setShowMpDetail] = useState(false);
  const [mpDetail, setMpDetail] = useState<MarketplaceSupplierDetail | null>(null);
  const [mpDetailLoading, setMpDetailLoading] = useState(false);
  // Order creation modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderPreselect, setOrderPreselect] = useState<{ id: string; name: string; isMarketplace: boolean; userId?: string } | undefined>();
  const [orderCatalog, setOrderCatalog] = useState<CatalogProductData[] | undefined>();

  // Invitation state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);

  // Add/Edit supplier modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formName, setFormName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formProductsSupplied, setFormProductsSupplied] = useState('');
  const [formDeliveryDelay, setFormDeliveryDelay] = useState('');
  const [formPaymentConditions, setFormPaymentConditions] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'products' | 'history' | 'invoices' | 'logs' | 'performance'>('info');
  const [linkedProducts, setLinkedProducts] = useState<SupplierProductLink[]>([]);
  const [detailStats, setDetailStats] = useState<SupplierStats | null>(null);
  const [detailOrders, setDetailOrders] = useState<OrderWithDetails[]>([]);
  const [detailInvoices, setDetailInvoices] = useState<SupplierInvoice[]>([]);
  const [detailLogs, setDetailLogs] = useState<SupplierCommunicationLog[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllLinked, setShowAllLinked] = useState(false);
  const [showAllMpCatalog, setShowAllMpCatalog] = useState(false);

  // Log creation
  const [newLogType, setNewLogType] = useState<'call' | 'visit' | 'other'>('call');
  const [newLogContent, setNewLogContent] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState<string | undefined>();
  const [chatPartnerName, setChatPartnerName] = useState<string | undefined>();

  // Link product modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [linkPrice, setLinkPrice] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [suppRes, sugRes] = await Promise.allSettled([
        suppliersApi.list(),
        replenishmentApi.getSuggestions(),
      ]);
      if (suppRes.status === 'fulfilled') setSupplierList(suppRes.value.items ?? suppRes.value as any);
      if (sugRes.status === 'fulfilled') setSuggestions(sugRes.value);
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

  // Fuzzy matching: tolerates typos, missing letters, transpositions
  function fuzzyMatch(text: string, query: string): boolean {
    if (!query) return true;
    const t = text.toLowerCase();
    const q = query.toLowerCase();
    // Exact substring match first
    if (t.includes(q)) return true;
    // Check each word in text against query words
    const queryWords = q.split(/\s+/).filter(Boolean);
    const textWords = t.split(/[\s,;|/]+/).filter(Boolean);
    return queryWords.every(qw => {
      // Direct word contains
      if (t.includes(qw)) return true;
      // Fuzzy per word: allow 1 edit distance for words >=3 chars
      if (qw.length >= 3) {
        return textWords.some(tw => editDistance(tw, qw) <= Math.floor(qw.length / 3));
      }
      return false;
    });
  }

  function editDistance(a: string, b: string): number {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
      const row = new Array(n + 1).fill(0);
      row[0] = i;
      return row;
    });
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  const filtered = useMemo(() => {
    if (!Array.isArray(supplierList)) return [];

    let res = supplierList.filter(s => {
      const q = search.trim();
      const fields = [
        s.name,
        s.contact_name ?? '',
        s.products_supplied ?? '',
        s.phone ?? '',
        s.email ?? '',
        s.address ?? '',
      ].join(' ');
      const matchSearch = !q || fuzzyMatch(fields, q);

      const matchProduct = !filterProduct || (s.products_supplied || '').toLowerCase().includes(filterProduct.toLowerCase());
      const matchPhone = !filterHasPhone || !!s.phone;
      const matchEmail = !filterHasEmail || !!s.email;

      return matchSearch && matchProduct && matchPhone && matchEmail;
    });

    // Safe sort
    return res.sort((a, b) => {
      if (filterSort === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (filterSort === 'delay') return (a.delivery_delay ?? 'zzz').localeCompare(b.delivery_delay ?? 'zzz');
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [supplierList, search, filterProduct, filterHasPhone, filterHasEmail, filterSort]);

  const activeFilterCount = (filterHasPhone ? 1 : 0) + (filterHasEmail ? 1 : 0) + (filterSort !== 'name' ? 1 : 0) + (filterProduct ? 1 : 0);

  const activeMpFilterCount = (mpCity ? 1 : 0) + (mpCategory ? 1 : 0) + (mpMinRating > 0 ? 1 : 0) + (mpVerifiedOnly ? 1 : 0) + (mpPriceMin ? 1 : 0) + (mpPriceMax ? 1 : 0);

  function resetForm() {
    setFormName('');
    setFormContactName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormProductsSupplied('');
    setFormDeliveryDelay('');
    setFormPaymentConditions('');
    setFormNotes('');
    setEditingSupplier(null);
  }

  function openAddModal() {
    resetForm();
    setShowFormModal(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormName(supplier.name);
    setFormContactName(supplier.contact_name ?? '');
    setFormPhone(supplier.phone ?? '');
    setFormEmail(supplier.email ?? '');
    setFormAddress(supplier.address ?? '');
    setFormProductsSupplied(supplier.products_supplied ?? '');
    setFormDeliveryDelay(supplier.delivery_delay ?? '');
    setFormPaymentConditions(supplier.payment_conditions ?? '');
    setFormNotes(supplier.notes ?? '');
    setShowFormModal(true);
  }

  async function handleSaveSupplier() {
    if (!formName.trim()) return;
    setFormLoading(true);
    const data: SupplierCreate = {
      name: formName.trim(),
      contact_name: formContactName.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      address: formAddress.trim() || undefined,
      products_supplied: formProductsSupplied.trim() || undefined,
      delivery_delay: formDeliveryDelay.trim() || undefined,
      payment_conditions: formPaymentConditions.trim() || undefined,
      notes: formNotes.trim() || undefined,
    };
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.supplier_id, data);
      } else {
        await suppliersApi.create(data);
      }
      setShowFormModal(false);
      resetForm();
      loadData();
    } catch {
      Alert.alert(t('common.error'), t('suppliers.save_error'));
    } finally {
      setFormLoading(false);
    }
  }

  function handleDelete(supplierId: string) {
    const supplier = supplierList.find(s => s.supplier_id === supplierId);
    Alert.alert(
      t('suppliers.delete_title'),
      t('suppliers.delete_confirm', { name: supplier?.name ?? t('suppliers.supplier') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await suppliersApi.delete(supplierId);
              loadData();
            } catch {
              Alert.alert(t('common.error'), t('suppliers.delete_error'));
            }
          }
        }
      ]
    );
  }

  async function openDetail(supplier: Supplier) {
    setDetailSupplier(supplier);
    setDetailTab('info');
    setShowDetailModal(true);
    setShowAllLinked(false);
    setDetailLoading(true);
    try {
      const [products, stats, orders, invoices, logs] = await Promise.all([
        suppliersApi.getProducts(supplier.supplier_id),
        suppliersApi.getStats(supplier.supplier_id),
        ordersApi.list(undefined, supplier.supplier_id).then(r => r.items ?? r as any),
        suppliersApi.getInvoices(supplier.supplier_id),
        suppliersApi.getLogs(supplier.supplier_id)
      ]);
      setLinkedProducts(products);
      setDetailStats(stats);
      setDetailOrders(orders);
      setDetailInvoices(invoices);
      setDetailLogs(logs);
    } catch (err) {
      console.error('Error loading detail data:', err);
      setLinkedProducts([]);
      setDetailStats(null);
      setDetailOrders([]);
      setDetailInvoices([]);
      setDetailLogs([]);
    } finally {
      setDetailLoading(false);
    }
  }

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert(t('common.error'), t('suppliers.phone_missing'));
      return;
    }
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        // Log communication
        if (detailSupplier) {
          suppliersApi.createLog(detailSupplier.supplier_id, {
            type: 'whatsapp',
            content: t('suppliers.whatsapp_log')
          }).then(log => setDetailLogs(prev => [log, ...prev]));
        }
        Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('suppliers.whatsapp_not_installed'));
      }
    });
  };

  async function handleAddLog() {
    if (!detailSupplier || !newLogContent.trim()) return;
    setIsLogging(true);
    try {
      const log = await suppliersApi.createLog(detailSupplier.supplier_id, {
        type: newLogType,
        content: newLogContent.trim()
      });
      setDetailLogs(prev => [log, ...prev]);
      setNewLogContent('');
    } catch {
      Alert.alert(t('common.error'), t('suppliers.log_error'));
    } finally {
      setIsLogging(false);
    }
  }

  async function openLinkProduct() {
    if (!detailSupplier) return;
    setShowLinkModal(true);
    try {
      const prodsRes = await productsApi.list(undefined, 0, 500);
      const prods = prodsRes.items ?? prodsRes as any;
      const linkedIds = linkedProducts.map((lp: any) => lp.product_id);
      setAllProducts(prods.filter((p: any) => !linkedIds.includes(p.product_id)));
    } catch {
      setAllProducts([]);
    }
  }

  async function handleLinkProduct() {
    if (!detailSupplier || !selectedProductId) return;
    setFormLoading(true);
    try {
      await spApi.link({
        supplier_id: detailSupplier.supplier_id,
        product_id: selectedProductId,
        supplier_price: parseFloat(linkPrice) || 0,
      });
      setShowLinkModal(false);
      setSelectedProductId(null);
      setLinkPrice('');
      // Refresh linked products
      const products = await suppliersApi.getProducts(detailSupplier.supplier_id);
      setLinkedProducts(products);
    } catch {
      Alert.alert(t('common.error'), t('suppliers.product_link_error'));
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUnlinkProduct(linkId: string) {
    if (!detailSupplier) return;
    try {
      await spApi.unlink(linkId);
      const products = await suppliersApi.getProducts(detailSupplier.supplier_id);
      setLinkedProducts(products);
    } catch {
      Alert.alert(t('common.error'), t('suppliers.product_unlink_error'));
    }
  }

  // Marketplace functions
  async function loadMarketplace() {
    setMpLoading(true);
    try {
      if (mpSearchType === 'suppliers') {
        const result = await marketplaceApi.searchSuppliers({
          q: mpSearch || undefined,
          city: mpCity || undefined,
          category: mpCategory || undefined,
          min_rating: mpMinRating || undefined,
          verified_only: mpVerifiedOnly || undefined,
        });
        setMpSuppliers(result);
      } else {
        const result = await marketplaceApi.searchProducts({
          q: mpSearch || undefined,
          category: mpCategory || undefined,
          price_min: parseFloat(mpPriceMin) || undefined,
          price_max: parseFloat(mpPriceMax) || undefined,
          min_supplier_rating: mpMinRating || undefined,
        });
        setMpProducts(result);
      }
    } catch {
      // ignore
    } finally {
      setMpLoading(false);
    }
  }

  async function openMpDetail(supplier: MarketplaceSupplier) {
    setShowMpDetail(true);
    setShowAllMpCatalog(false);
    setMpDetailLoading(true);
    try {
      const detail = await marketplaceApi.getSupplier(supplier.user_id);
      setMpDetail(detail);
    } catch {
      setMpDetail(null);
    } finally {
      setMpDetailLoading(false);
    }
  }

  function openMpOrderModal() {
    if (!mpDetail) return;
    setOrderPreselect({
      id: mpDetail.profile.user_id,
      name: mpDetail.profile.company_name,
      isMarketplace: true,
      userId: mpDetail.profile.user_id,
    });
    setOrderCatalog(mpDetail.catalog);
    setShowOrderModal(true);
  }

  function openInvite() {
    if (!detailSupplier) return;
    setInviteEmail(detailSupplier.email || '');
    setShowInviteModal(true);
  }

  async function submitInvite() {
    if (!detailSupplier || !inviteEmail.trim()) return;
    setInviteSaving(true);
    try {
      await invitationsApi.send(detailSupplier.supplier_id, inviteEmail.trim());
      setShowInviteModal(false);
      Alert.alert(t('suppliers.invite_sent'), t('suppliers.invite_sent_desc', { email: inviteEmail.trim() }));
    } catch {
      Alert.alert(t('common.error'), t('suppliers.invite_error'));
    } finally {
      setInviteSaving(false);
    }
  }

  function renderStars(rating: number) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={14}
          color={colors.warning}
        />
      );
    }
    return stars;
  }

  const isLocked = !isSuperAdmin && user?.role !== 'supplier' && (!['starter', 'pro', 'enterprise'].includes(user?.plan || '') || user?.subscription_status === 'expired');

  if (loading && !isLocked) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <PremiumGate
      featureName={t('premium.features.suppliers.title')}
      description={t('premium.features.suppliers.desc')}
      benefits={t('premium.features.suppliers.benefits', { returnObjects: true }) as string[]}
      icon="people-outline"
      locked={isLocked}
    >
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={[styles.headerRow, { paddingTop: insets.top }]}>
            <View>
              <Text style={styles.pageTitle}>{t('suppliers.title')}</Text>
              <Text style={styles.subtitle}>{t('suppliers.subtitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => { setChatPartnerId(undefined); setChatPartnerName(undefined); setShowChat(true); }}>
                <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Segmented control */}
          <View style={styles.segmented}>
            <TouchableOpacity
              style={[styles.segmentBtn, tab === 'manual' && styles.segmentBtnActive]}
              onPress={() => setTab('manual')}
            >
              <Text style={[styles.segmentText, tab === 'manual' && styles.segmentTextActive]}>
                {t('suppliers.my_suppliers')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, tab === 'marketplace' && styles.segmentBtnActive]}
              onPress={() => { setTab('marketplace'); loadMarketplace(); }}
            >
              <Text style={[styles.segmentText, tab === 'marketplace' && styles.segmentTextActive]}>
                {t('suppliers.marketplace')}
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'manual' ? (
            <>
              {/* Search + Filter bar */}
              <View style={styles.searchWrapper}>
                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('suppliers.search_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ marginLeft: 8 }}>
                  <View>
                    <Ionicons name="options-outline" size={22} color={showFilters ? colors.primary : colors.textMuted} />
                    {activeFilterCount > 0 && (
                      <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{activeFilterCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Filter panel */}
              {showFilters && (
                <View style={{ ...glassStyle, padding: Spacing.sm, marginBottom: Spacing.md, gap: Spacing.sm }}>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>{t('suppliers.sort_by')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([
                      { key: 'name', label: t('suppliers.sort_name'), icon: 'text-outline' },
                      { key: 'recent', label: t('suppliers.sort_recent'), icon: 'time-outline' },
                      { key: 'delay', label: t('suppliers.sort_delay'), icon: 'hourglass-outline' },
                    ] as const).map(opt => (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setFilterSort(opt.key)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 4,
                          paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20,
                          backgroundColor: filterSort === opt.key ? colors.primary : colors.glass,
                          borderWidth: 1, borderColor: filterSort === opt.key ? colors.primary : colors.glassBorder,
                        }}
                      >
                        <Ionicons name={opt.icon as any} size={14} color={filterSort === opt.key ? '#fff' : colors.textMuted} />
                        <Text style={{ color: filterSort === opt.key ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 }}>{t('suppliers.filter_by')}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      onPress={() => setFilterHasPhone(!filterHasPhone)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20,
                        backgroundColor: filterHasPhone ? colors.success + '20' : colors.glass,
                        borderWidth: 1, borderColor: filterHasPhone ? colors.success : colors.glassBorder,
                      }}
                    >
                      <Ionicons name="call-outline" size={14} color={filterHasPhone ? colors.success : colors.textMuted} />
                      <Text style={{ color: filterHasPhone ? colors.success : colors.text, fontSize: 12, fontWeight: '600' }}>{t('suppliers.with_phone')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setFilterHasEmail(!filterHasEmail)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20,
                        backgroundColor: filterHasEmail ? colors.success + '20' : colors.glass,
                        borderWidth: 1, borderColor: filterHasEmail ? colors.success : colors.glassBorder,
                      }}
                    >
                      <Ionicons name="mail-outline" size={14} color={filterHasEmail ? colors.success : colors.textMuted} />
                      <Text style={{ color: filterHasEmail ? colors.success : colors.text, fontSize: 12, fontWeight: '600' }}>{t('suppliers.with_email')}</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, minWidth: 150 }}>
                      <TextInput
                        style={{ ...styles.searchInput, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: filterProduct ? colors.primary : colors.glassBorder, backgroundColor: filterProduct ? colors.primary + '10' : colors.glass }}
                        placeholder={t('suppliers.filter_product_placeholder')}
                        placeholderTextColor={colors.textMuted}
                        value={filterProduct}
                        onChangeText={setFilterProduct}
                      />
                    </View>
                  </View>

                  {activeFilterCount > 0 && (
                    <TouchableOpacity
                      onPress={() => { setFilterSort('name'); setFilterHasPhone(false); setFilterHasEmail(false); setFilterProduct(''); }}
                      style={{ alignSelf: 'flex-start', marginTop: 2 }}
                    >
                      <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>{t('suppliers.reset_filters')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Result count */}
              <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm }}>
                {search || activeFilterCount > 0
                  ? t('suppliers.supplier_search_count', { count: filtered.length, search })
                  : t('suppliers.supplier_count', { count: filtered.length })
                }
              </Text>

              {/* AI Replenishment Suggestions */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                    <Text style={styles.sectionTitle}>{t('suppliers.ai_suggestions')}</Text>
                    <TouchableOpacity
                      onPress={async () => {
                        setAdviceLoading(true);
                        try {
                          const res = await aiApi.replenishmentAdvice(i18n.language);
                          setReplenishAdvice(res.advice);
                        } catch { /* silent */ }
                        finally { setAdviceLoading(false); }
                      }}
                      disabled={adviceLoading}
                      style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: colors.primary + '15' }}
                    >
                      {adviceLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={13} color={colors.primary} />
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{t('suppliers.ai_advice')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  {replenishAdvice && (
                    <View style={{ backgroundColor: colors.primary + '10', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: colors.primary + '20' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <Ionicons name="sparkles" size={13} color={colors.primary} />
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t('suppliers.ai_advice')}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.text, lineHeight: 18 }}>{replenishAdvice}</Text>
                    </View>
                  )}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                    {suggestions.map((sug) => (
                      <TouchableOpacity
                        key={sug.product_id}
                        style={[
                          styles.suggestionCard,
                          sug.priority === 'critical' && { borderColor: colors.danger, borderWidth: 1 }
                        ]}
                        onPress={() => {
                          Alert.alert(
                            t('suppliers.suggestion_order_title'),
                            t('suppliers.suggestion_order_desc', {
                              product: sug.product_name,
                              current: sug.current_quantity,
                              suggested: sug.suggested_quantity,
                              supplier: sug.supplier_name || t('common.unknown')
                            }),
                            [
                              { text: t('suppliers.later'), style: 'cancel' },
                              {
                                text: t('suppliers.order_action'),
                                onPress: async () => {
                                  if (!sug.supplier_id) {
                                    Alert.alert(t('common.error'), t('suppliers.supplier_no_phone_error'));
                                    return;
                                  }
                                  try {
                                    await ordersApi.create({
                                      supplier_id: sug.supplier_id,
                                      items: [{
                                        product_id: sug.product_id,
                                        quantity: sug.suggested_quantity,
                                        unit_price: 0
                                      }],
                                      notes: `Commande suggérée par IA (Vitesse: ${sug.daily_velocity}/jour)`
                                    });
                                    Alert.alert(t('common.success'), t('suppliers.draft_success'));
                                    loadData();
                                  } catch {
                                    Alert.alert(t('common.error'), t('modals.error'));
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <View style={[styles.priorityBadge, { backgroundColor: sug.priority === 'critical' ? colors.danger : colors.warning }]}>
                          <Text style={styles.priorityText}>{sug.priority === 'critical' ? t('suppliers.critical_alert') : t('suppliers.alert')}</Text>
                        </View>
                        <Text style={styles.suggestionName} numberOfLines={1}>{sug.product_name}</Text>
                        <View style={styles.suggestionDetails}>
                          <Text style={styles.suggestionVelocity}>{t('suppliers.suggestion_ai_notes', { velocity: sug.daily_velocity })}</Text>
                          <Text style={styles.suggestionDays}>
                            {sug.days_until_stock_out !== null ? t('suppliers.days_remaining', { count: sug.days_until_stock_out }) : t('suppliers.out_of_stock_alert')}
                          </Text>
                        </View>
                        <View style={styles.recommendationBox}>
                          <Text style={styles.recommendationText}>{t('suppliers.order_commander', { count: sug.suggested_quantity })}</Text>
                          <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {search || activeFilterCount > 0 ? t('suppliers.no_results') : t('suppliers.no_suppliers')}
                  </Text>
                  <Text style={styles.emptyText}>
                    {search || activeFilterCount > 0 ? t('marketplace.modify_criteria') : t('suppliers.add_suppliers_hint')}
                  </Text>
                </View>
              ) : (
                filtered.map((supplier) => {
                  const name = supplier.name || t('common.unknown');
                  const initials = name
                    ? name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    : '??';
                  const hue = name.charCodeAt(0) * 5 % 360;
                  const avatarColor = `hsl(${hue}, 60%, 50%)`;

                  return (
                    <TouchableOpacity
                      key={supplier.supplier_id}
                      style={styles.supplierCard}
                      onPress={() => openDetail(supplier)}
                    >
                      <View style={styles.supplierHeader}>
                        <View style={[styles.avatarCircle, { backgroundColor: avatarColor + '20' }]}>
                          <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
                        </View>
                        <View style={styles.supplierInfo}>
                          <Text style={styles.supplierName}>{supplier.name || t('common.unknown')}</Text>
                          {supplier.contact_name ? (
                            <Text style={styles.supplierContact}>{supplier.contact_name}</Text>
                          ) : null}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </View>

                      {/* Info chips row */}
                      <View style={styles.chipRow}>
                        {supplier.products_supplied ? (
                          <View style={[styles.infoChip, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="cube-outline" size={12} color={colors.primary} />
                            <Text style={[styles.infoChipText, { color: colors.primary }]} numberOfLines={1}>{supplier.products_supplied}</Text>
                          </View>
                        ) : null}
                        {supplier.delivery_delay ? (
                          <View style={[styles.infoChip, { backgroundColor: colors.secondary + '12' }]}>
                            <Ionicons name="time-outline" size={12} color={colors.secondary} />
                            <Text style={[styles.infoChipText, { color: colors.secondary }]}>{supplier.delivery_delay}</Text>
                          </View>
                        ) : null}
                        {supplier.payment_conditions ? (
                          <View style={[styles.infoChip, { backgroundColor: colors.success + '12' }]}>
                            <Ionicons name="card-outline" size={12} color={colors.success} />
                            <Text style={[styles.infoChipText, { color: colors.success }]} numberOfLines={1}>{supplier.payment_conditions}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Quick actions */}
                      <View style={styles.quickActions}>
                        {supplier.phone ? (
                          <>
                            <TouchableOpacity
                              style={[styles.quickBtn, { backgroundColor: '#25D366' + '15' }]}
                              onPress={(e) => { e.stopPropagation(); handleWhatsApp(supplier.phone); }}
                            >
                              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.quickBtn, { backgroundColor: colors.primary + '15' }]}
                              onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${supplier.phone}`); }}
                            >
                              <Ionicons name="call-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          </>
                        ) : null}
                        {supplier.email ? (
                          <TouchableOpacity
                            style={[styles.quickBtn, { backgroundColor: colors.secondary + '15' }]}
                            onPress={(e) => { e.stopPropagation(); Linking.openURL(`mailto:${supplier.email}`); }}
                          >
                            <Ionicons name="mail-outline" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                        ) : null}
                        <View style={{ flex: 1 }} />
                        <TouchableOpacity
                          style={[styles.quickBtn, { backgroundColor: colors.primary + '15' }]}
                          onPress={(e) => { e.stopPropagation(); openEditModal(supplier); }}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.quickBtn, { backgroundColor: colors.danger + '15' }]}
                          onPress={(e) => { e.stopPropagation(); handleDelete(supplier.supplier_id); }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </>
          ) : (
            <>
              {/* Marketplace search type toggle */}
              <View style={[styles.segmented, { marginBottom: Spacing.md, height: 36 }]}>
                <TouchableOpacity
                  style={[styles.segmentBtn, mpSearchType === 'suppliers' && styles.segmentBtnActive]}
                  onPress={() => { setMpSearchType('suppliers'); loadMarketplace(); }}
                >
                  <Text style={[styles.segmentText, mpSearchType === 'suppliers' && styles.segmentTextActive, { fontSize: 12 }]}>
                    {t('marketplace.suppliers')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, mpSearchType === 'products' && styles.segmentBtnActive]}
                  onPress={() => { setMpSearchType('products'); loadMarketplace(); }}
                >
                  <Text style={[styles.segmentText, mpSearchType === 'products' && styles.segmentTextActive, { fontSize: 12 }]}>
                    {t('marketplace.products')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Search bar + Filter button */}
              <View style={styles.searchWrapper}>
                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={mpSearchType === 'suppliers' ? t('marketplace.search_supplier') : t('marketplace.search_product')}
                  placeholderTextColor={colors.textMuted}
                  value={mpSearch}
                  onChangeText={setMpSearch}
                  onSubmitEditing={loadMarketplace}
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={() => setShowMpFilters(true)} style={{ marginLeft: 8 }}>
                  <View>
                    <Ionicons name="options-outline" size={22} color={activeMpFilterCount > 0 ? colors.primary : colors.textMuted} />
                    {activeMpFilterCount > 0 && (
                      <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: colors.primary, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{activeMpFilterCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={loadMarketplace} style={{ marginLeft: 8 }}>
                  <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {mpLoading ? (
                <ActivityIndicator color={colors.primary} size="large" style={{ paddingVertical: Spacing.xxl }} />
              ) : (mpSearchType === 'suppliers' ? (
                mpSuppliers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="storefront-outline" size={64} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>{t('marketplace.empty_suppliers')}</Text>
                    <Text style={styles.emptyText}>{t('marketplace.modify_criteria')}</Text>
                  </View>
                ) : (
                  mpSuppliers.map((ms) => (
                    <TouchableOpacity
                      key={ms.user_id}
                      style={styles.supplierCard}
                      onPress={() => openMpDetail(ms)}
                    >
                      <View style={styles.supplierHeader}>
                        <View style={[styles.mpIcon, { backgroundColor: colors.secondary + '20' }]}>
                          <Ionicons name="storefront" size={24} color={colors.secondary} />
                        </View>
                        <View style={styles.supplierInfo}>
                          <Text style={styles.supplierName}>{ms.company_name || t('common.unknown')}</Text>
                          {ms.city ? (
                            <View style={styles.infoRow}>
                              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                              <Text style={styles.infoText}>{ms.city}</Text>
                            </View>
                          ) : null}
                        </View>
                        {ms.is_verified && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        )}
                      </View>

                      <View style={styles.mpDetails}>
                        <View style={styles.mpDetailItem}>
                          <View style={styles.mpStars}>{renderStars(ms.rating_average)}</View>
                          <Text style={styles.mpRating}>({ms.rating_count})</Text>
                        </View>
                        <View style={styles.mpDetailItem}>
                          <Ionicons name="pricetags-outline" size={14} color={colors.textMuted} />
                          <Text style={styles.infoText}>{ms.catalog_count} {t('marketplace.products')}</Text>
                        </View>
                        <View style={styles.mpDetailItem}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text style={styles.infoText}>{ms.average_delivery_days}j</Text>
                        </View>
                      </View>

                      {ms.categories?.length > 0 && (
                        <View style={styles.mpCategories}>
                          {ms.categories.slice(0, 3).map((cat, i) => (
                            <View key={i} style={styles.mpCatChip}>
                              <Text style={styles.mpCatText}>{cat}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )
              ) : (
                mpProducts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>{t('marketplace.no_products_found')}</Text>
                    <Text style={styles.emptyText}>{t('marketplace.modify_criteria')}</Text>
                  </View>
                ) : (
                  <View style={styles.mpCatalogGrid}>
                    {mpProducts.map((p) => (
                      <TouchableOpacity
                        key={p.catalog_id}
                        style={styles.mpCatalogCard}
                        onPress={async () => {
                          const detail = await marketplaceApi.getSupplier(p.supplier_user_id);
                          setMpDetail(detail);
                          setShowMpDetail(true);
                        }}
                      >
                        <View style={styles.mpCatalogCardIcon}>
                          <Ionicons name="cube-outline" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mpCatalogName} numberOfLines={1}>{p.name || t('common.unknown')}</Text>
                          <Text style={styles.mpCatalogCat}>{p.supplier_name || ''} · {p.supplier_city || ''}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <View style={styles.mpStars}>{renderStars(p.supplier_rating || 0)}</View>
                          </View>
                        </View>
                        <View style={styles.mpCatalogPriceBox}>
                          <Text style={styles.mpCatalogPrice}>{formatUserCurrency(p.price, user)}</Text>
                          <Text style={styles.mpCatalogUnit}>/{p.unit}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              ))}
            </>
          )}

          <View style={{ height: Spacing.xl }} />
        </ScrollView>

        {/* Add/Edit Supplier Modal */}
        <Modal visible={showFormModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingSupplier ? t('suppliers.edit_supplier') : t('suppliers.new_supplier')}
                </Text>
                <TouchableOpacity onPress={() => setShowFormModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <FormField label={t('suppliers.form_name')} value={formName} onChangeText={setFormName} placeholder={t('suppliers.form_name_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_contact')} value={formContactName} onChangeText={setFormContactName} placeholder={t('suppliers.form_contact_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_phone')} value={formPhone} onChangeText={setFormPhone} placeholder={t('suppliers.form_phone_placeholder')} keyboardType="numeric" colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_email')} value={formEmail} onChangeText={setFormEmail} placeholder={t('suppliers.form_email_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_address')} value={formAddress} onChangeText={setFormAddress} placeholder={t('suppliers.form_address_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_products')} value={formProductsSupplied} onChangeText={setFormProductsSupplied} placeholder={t('suppliers.form_products_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_delay')} value={formDeliveryDelay} onChangeText={setFormDeliveryDelay} placeholder={t('suppliers.form_delay_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_payment')} value={formPaymentConditions} onChangeText={setFormPaymentConditions} placeholder={t('suppliers.form_payment_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('suppliers.form_notes')} value={formNotes} onChangeText={setFormNotes} placeholder={t('suppliers.form_notes_placeholder')} colors={colors} styles={styles} />
                <TouchableOpacity
                  style={[styles.submitBtn, formLoading && styles.submitBtnDisabled]}
                  onPress={handleSaveSupplier}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {editingSupplier ? t('common.save') : t('common.add')}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Detail Modal */}
        <Modal visible={showDetailModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{detailSupplier?.name}</Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {detailSupplier && (
                <View style={{ flex: 1 }}>
                  {/* Modal Tabs */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalTabs}>
                    {[
                      { id: 'info', label: t('common.info'), icon: 'information-circle' },
                      { id: 'products', label: t('marketplace.products'), icon: 'cube' },
                      { id: 'history', label: t('suppliers.order_history'), icon: 'cart' },
                      { id: 'invoices', label: t('accounting.expenses'), icon: 'receipt' },
                      { id: 'logs', label: t('suppliers.interaction_log'), icon: 'chatbubbles' },
                      { id: 'performance', label: t('suppliers.key_indicators'), icon: 'stats-chart' },
                    ].map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.modalTab, detailTab === t.id && styles.modalTabActive]}
                        onPress={() => setDetailTab(t.id as any)}
                      >
                        <Ionicons
                          name={(t.id === detailTab ? t.icon : t.icon + '-outline') as any}
                          size={18}
                          color={detailTab === t.id ? colors.primary : colors.textMuted}
                        />
                        <Text style={[styles.modalTabText, detailTab === t.id && styles.modalTabTextActive]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <ScrollView style={styles.modalScroll}>
                    {detailLoading && !linkedProducts.length && (
                      <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                    )}

                    {detailTab === 'info' && (
                      <View style={styles.tabContent}>
                        {detailSupplier.contact_name ? (
                          <DetailRow icon="person-outline" label={t('suppliers.form_contact')} value={detailSupplier.contact_name} colors={colors} styles={styles} />
                        ) : null}
                        <View style={styles.rowCentered}>
                          <View style={{ flex: 1 }}>
                            {detailSupplier.phone ? (
                              <DetailRow icon="call-outline" label={t('suppliers.form_phone')} value={detailSupplier.phone} colors={colors} styles={styles} />
                            ) : null}
                          </View>
                          <TouchableOpacity
                            style={styles.waBtn}
                            onPress={() => handleWhatsApp(detailSupplier.phone)}
                          >
                            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                            <Text style={styles.waBtnText}>WhatsApp</Text>
                          </TouchableOpacity>
                        </View>

                        {detailSupplier.email ? (
                          <DetailRow icon="mail-outline" label={t('suppliers.form_email')} value={detailSupplier.email} colors={colors} styles={styles} />
                        ) : null}
                        {detailSupplier.address ? (
                          <DetailRow icon="location-outline" label={t('suppliers.form_address')} value={detailSupplier.address} colors={colors} styles={styles} />
                        ) : null}
                        {detailSupplier.products_supplied ? (
                          <DetailRow icon="cube-outline" label={t('marketplace.products')} value={detailSupplier.products_supplied} colors={colors} styles={styles} />
                        ) : null}
                        {detailSupplier.delivery_delay ? (
                          <DetailRow icon="time-outline" label={t('suppliers.form_delay')} value={detailSupplier.delivery_delay} colors={colors} styles={styles} />
                        ) : null}
                        {detailSupplier.payment_conditions ? (
                          <DetailRow icon="card-outline" label={t('suppliers.payment_label')} value={detailSupplier.payment_conditions} colors={colors} styles={styles} />
                        ) : null}
                        {detailSupplier.notes ? (
                          <DetailRow icon="document-text-outline" label={t('suppliers.form_notes')} value={detailSupplier.notes} colors={colors} styles={styles} />
                        ) : null}

                        {detailSupplier.user_id && (
                          <TouchableOpacity
                            style={[styles.inviteBtn, { borderColor: colors.primary, marginTop: Spacing.md }]}
                            onPress={() => {
                              setChatPartnerId(detailSupplier.user_id);
                              setChatPartnerName(detailSupplier.name);
                              setShowChat(true);
                            }}
                          >
                            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                            <Text style={[styles.inviteBtnText, { color: colors.primary }]}>{t('suppliers.send_message')}</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity style={styles.inviteBtn} onPress={openInvite}>
                          <Ionicons name="mail-outline" size={18} color={colors.secondary} />
                          <Text style={styles.inviteBtnText}>{t('suppliers.invite')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {detailTab === 'products' && (
                      <View style={styles.tabContent}>
                        <View style={styles.linkedHeader}>
                          <Text style={styles.sectionTitle}>
                            {t('suppliers.linked_products', { count: linkedProducts.length })}
                          </Text>
                          <TouchableOpacity style={styles.linkBtn} onPress={openLinkProduct}>
                            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles.linkBtnText}>{t('suppliers.link_product')}</Text>
                          </TouchableOpacity>
                        </View>

                        {linkedProducts.length === 0 ? (
                          <View style={styles.emptyStateContainer}>
                            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyLinked}>{t('suppliers.no_linked_products')}</Text>
                            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                              {t('suppliers.link_hint')}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ gap: Spacing.sm }}>
                            {/* Summary bar */}
                            {(() => {
                              const totalValue = Array.isArray(linkedProducts) ? linkedProducts.reduce((sum, lp) => sum + ((lp.supplier_price || 0) * (lp.product?.quantity || 0)), 0) : 0;
                              const lowStockCount = Array.isArray(linkedProducts) ? linkedProducts.filter(lp => lp.product && lp.product.quantity <= lp.product.min_stock).length : 0;
                              return (
                                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs }}>
                                  <View style={{ flex: 1, backgroundColor: colors.primary + '12', borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textMuted, fontSize: 10, textTransform: 'uppercase' }}>{t('suppliers.stock_value')}</Text>
                                    <Text style={{ color: colors.primary, fontSize: FontSize.md, fontWeight: '700' }}>{formatUserCurrency(totalValue, user)}</Text>
                                  </View>
                                  {lowStockCount > 0 && (
                                    <View style={{ flex: 1, backgroundColor: colors.danger + '12', borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center' }}>
                                      <Text style={{ color: colors.textMuted, fontSize: 10, textTransform: 'uppercase' }}>{t('suppliers.low_stock_label')}</Text>
                                      <Text style={{ color: colors.danger, fontSize: FontSize.md, fontWeight: '700' }}>{t('suppliers.low_stock_count', { count: lowStockCount })}</Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })()}

                            {linkedProducts.map((lp) => {
                              const isLowStock = lp.product.quantity <= lp.product.min_stock;
                              const isOutOfStock = lp.product.quantity === 0;
                              const margin = lp.product.selling_price - lp.supplier_price;
                              const marginPct = lp.supplier_price > 0 ? (margin / lp.supplier_price * 100) : 0;
                              const stockValue = lp.supplier_price * lp.product.quantity;

                              return (
                                <View key={lp.link_id} style={[styles.productCard, isLowStock && { borderLeftWidth: 3, borderLeftColor: isOutOfStock ? colors.danger : colors.warning }]}>
                                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.linkedName} numberOfLines={1}>{lp.product.name}</Text>
                                      {lp.product.sku ? (
                                        <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>{lp.product.sku}</Text>
                                      ) : null}
                                    </View>

                                    {/* Stock badge */}
                                    <View style={{
                                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                                      backgroundColor: isOutOfStock ? colors.danger + '20' : isLowStock ? colors.warning + '20' : colors.success + '20',
                                    }}>
                                      <Text style={{
                                        color: isOutOfStock ? colors.danger : isLowStock ? colors.warning : colors.success,
                                      }}>
                                        {isOutOfStock ? t('suppliers.out_of_stock') : isLowStock ? t('suppliers.low_stock') : t('suppliers.in_stock')}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Metrics row */}
                                  <View style={{ flexDirection: 'row', marginTop: Spacing.sm, gap: Spacing.sm }}>
                                    <View style={styles.metricBox}>
                                      <Text style={styles.metricLabel}>{t('suppliers.stock')}</Text>
                                      <Text style={[styles.metricValue, isLowStock && { color: isOutOfStock ? colors.danger : colors.warning }]}>
                                        {lp.product.quantity} {lp.product.unit}
                                      </Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                      <Text style={styles.metricLabel}>{t('suppliers.supplier_price')}</Text>
                                      <Text style={styles.metricValue}>{formatUserCurrency(lp.supplier_price, user)}</Text>
                                    </View>
                                    <View style={styles.metric}>
                                      <Text style={styles.metricLabel}>{t('suppliers.selling_price')}</Text>
                                      <Text style={styles.metricValue}>{formatUserCurrency(lp.product?.selling_price, user)}</Text>
                                    </View>
                                  </View>

                                  {/* Bottom: margin + stock value + unlink */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider }}>
                                    <View style={{
                                      flexDirection: 'row', alignItems: 'center', gap: 4,
                                      backgroundColor: margin > 0 ? colors.success + '12' : colors.danger + '12',
                                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                                    }}>
                                      <Ionicons name={margin > 0 ? 'trending-up' : 'trending-down'} size={12} color={margin > 0 ? colors.success : colors.danger} />
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: margin > 0 ? colors.success : colors.danger }}>
                                        +{formatUserCurrency(margin, user)} ({marginPct.toFixed(0)}%)
                                      </Text>
                                    </View>
                                    <Text style={{ color: colors.textMuted, fontSize: 11, marginLeft: Spacing.sm }}>
                                      {t('suppliers.stock_value_short')}: {formatUserCurrency(stockValue, user)}
                                    </Text>
                                    <View style={{ flex: 1 }} />
                                    <TouchableOpacity
                                      onPress={() => handleUnlinkProduct(lp.link_id)}
                                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
                                    >
                                      <Ionicons name="unlink-outline" size={14} color={colors.danger} />
                                      <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '600' }}>{t('suppliers.unlink')}</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}

                    {detailTab === 'history' && (
                      <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>{t('suppliers.order_history')}</Text>
                        {detailOrders.length === 0 ? (
                          <Text style={styles.emptyLinked}>{t('suppliers.no_orders')}</Text>
                        ) : (
                          detailOrders.map((o) => (
                            <TouchableOpacity
                              key={o.order_id}
                              style={styles.historyItem}
                              onPress={() => router.push(`/orders?id=${o.order_id}`)}
                            >
                              <View style={styles.historyHeader}>
                                <Text style={styles.historyRef}>#{o.order_id.slice(-6).toUpperCase()}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(o.status, colors) + '20' }]}>
                                  <Text style={[styles.statusText, { color: getStatusColor(o.status, colors) }]}>
                                    {t(`suppliers.order_status_${o.status.toLowerCase()}`)}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.historyDetails}>
                                <Text style={styles.historyAmount}>{formatUserCurrency(o.total_amount || 0, user)}</Text>
                                <Text style={styles.historyDate}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</Text>
                              </View>
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    )}

                    {detailTab === 'invoices' && (
                      <View style={styles.tabContent}>
                        <View style={styles.linkedHeader}>
                          <Text style={styles.sectionTitle}>{t('suppliers.invoices_safe')}</Text>
                          <TouchableOpacity style={styles.linkBtn} onPress={() => Alert.alert('Info', t('suppliers.add_invoice_feature'))}>
                            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                            <Text style={styles.linkBtnText}>{t('common.add')}</Text>
                          </TouchableOpacity>
                        </View>
                        {detailInvoices.length === 0 ? (
                          <View style={styles.emptyStateContainer}>
                            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyLinked}>{t('suppliers.no_invoices')}</Text>
                          </View>
                        ) : (
                          detailInvoices.map((inv) => (
                            <View key={inv.invoice_id} style={styles.historyItem}>
                              <View style={styles.historyHeader}>
                                <Text style={styles.historyRef}>{inv.invoice_number}</Text>
                                <Text style={[styles.statusText, { color: inv.status === 'paid' ? colors.success : colors.warning }]}>
                                  {inv.status === 'paid' ? t('suppliers.status_paid') : t('suppliers.status_unpaid')}
                                </Text>
                              </View>
                              <Text style={styles.historyAmount}>{formatUserCurrency(inv.amount, user)}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {detailTab === 'logs' && (
                      <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>{t('suppliers.add_note')}</Text>
                        <View style={styles.logForm}>
                          <View style={styles.logTypeRow}>
                            {(['call', 'visit', 'other'] as const).map(type => (
                              <TouchableOpacity
                                key={type}
                                style={[styles.typeChip, newLogType === type && styles.typeChipActive]}
                                onPress={() => setNewLogType(type)}
                              >
                                <Ionicons
                                  name={type === 'call' ? 'call' : type === 'visit' ? 'briefcase' : 'chatbox'}
                                  size={14}
                                  color={newLogType === type ? '#fff' : colors.textMuted}
                                />
                                <Text style={[styles.typeText, newLogType === type && styles.typeTextActive]}>
                                  {type === 'call' ? t('suppliers.call') : type === 'visit' ? t('suppliers.visit') : t('suppliers.other')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput
                            style={styles.logInput}
                            placeholder={t('suppliers.log_placeholder')}
                            placeholderTextColor={colors.textMuted}
                            multiline
                            value={newLogContent}
                            onChangeText={setNewLogContent}
                          />
                          <TouchableOpacity
                            style={[styles.addLogBtn, !newLogContent.trim() && { opacity: 0.5 }]}
                            onPress={handleAddLog}
                            disabled={!newLogContent.trim() || isLogging}
                          >
                            {isLogging ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addLogBtnText}>{t('common.save')}</Text>}
                          </TouchableOpacity>
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('suppliers.interaction_log')}</Text>
                        {detailLogs.length === 0 ? (
                          <Text style={styles.emptyLinked}>{t('suppliers.no_logs')}</Text>
                        ) : (
                          detailLogs.map((log) => (
                            <View key={log.log_id} style={styles.logItem}>
                              <View style={styles.logIconCol}>
                                <Ionicons
                                  name={log.type === 'whatsapp' ? 'logo-whatsapp' : log.type === 'call' ? 'call' : 'chatbox'}
                                  size={20}
                                  color={log.type === 'whatsapp' ? colors.success : colors.primary}
                                />
                                <View style={styles.logLine} />
                              </View>
                              <View style={styles.logBody}>
                                <Text style={styles.logDate}>{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</Text>
                                <Text style={styles.logContent}>{log.content || ''}</Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {detailTab === 'performance' && (
                      <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>{t('suppliers.financial_summary')}</Text>
                        <View style={styles.statsGrid}>
                          <View style={styles.statBox}>
                            <Text style={styles.statVal}>{formatUserCurrency(detailStats?.total_spent || 0, user)}</Text>
                            <Text style={styles.statLab}>{t('suppliers.total_volume')}</Text>
                          </View>
                          <View style={styles.statBox}>
                            <Text style={[styles.statVal, { color: colors.warning }]}>
                              {formatUserCurrency(detailStats?.pending_spent || 0, user)}
                            </Text>
                            <Text style={styles.statLab}>{t('suppliers.pending_payment')}</Text>
                          </View>
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('suppliers.key_indicators')}</Text>
                        <View style={styles.perfRow}>
                          <View style={styles.perfItem}>
                            <Ionicons name="time-outline" size={24} color={colors.secondary} />
                            <Text style={styles.perfVal}>{(detailStats?.avg_delivery_days || 0).toString()} {t('common.days')}</Text>
                            <Text style={styles.perfLab}>{t('suppliers.avg_delivery_time')}</Text>
                          </View>
                          <View style={styles.perfItem}>
                            <Ionicons name="cart-outline" size={24} color={colors.primary} />
                            <Text style={styles.perfVal}>{detailStats?.delivered_count}</Text>
                            <Text style={styles.perfLab}>{t('suppliers.successful_deliveries')}</Text>
                          </View>
                        </View>

                        <View style={styles.insightCard}>
                          <Ionicons name="bulb-outline" size={20} color={colors.primary} />
                          <Text style={styles.insightText}>
                            {detailStats && detailStats.avg_delivery_days <= 3
                              ? t('suppliers.reliable_supplier')
                              : t('suppliers.warning_supplier')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Link Product Modal */}
        <Modal visible={showLinkModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '70%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('suppliers.link_product')}</Text>
                <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <FormField
                label={t('suppliers.supplier_price')}
                value={linkPrice}
                onChangeText={setLinkPrice}
                placeholder="0.00"
                keyboardType="numeric"
                colors={colors}
                styles={styles}
              />

              <Text style={styles.formLabel}>{t('suppliers.select_product')}</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                {allProducts.map((prod) => (
                  <TouchableOpacity
                    key={prod.product_id}
                    style={[
                      styles.productSelect,
                      selectedProductId === prod.product_id && styles.productSelectActive,
                    ]}
                    onPress={() => setSelectedProductId(prod.product_id)}
                  >
                    <Text
                      style={[
                        styles.productSelectText,
                        selectedProductId === prod.product_id && styles.productSelectTextActive,
                      ]}
                    >
                      {prod.name}
                    </Text>
                    <Text style={styles.productSelectQty}>
                      {prod.quantity} {prod.unit}(s)
                    </Text>
                  </TouchableOpacity>
                ))}
                {allProducts.length === 0 && (
                  <Text style={styles.emptyLinked}>{t('suppliers.no_products_available')}</Text>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitBtn, (!selectedProductId || formLoading) && styles.submitBtnDisabled]}
                onPress={handleLinkProduct}
                disabled={!selectedProductId || formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('suppliers.link')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Marketplace Filter Modal */}
        <Modal visible={showMpFilters} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('marketplace.filters')}</Text>
                <TouchableOpacity onPress={() => setShowMpFilters(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <FormField label={t('common.city')} value={mpCity} onChangeText={setMpCity} placeholder={t('marketplace.city_placeholder')} colors={colors} styles={styles} />
                <FormField label={t('common.category')} value={mpCategory} onChangeText={setMpCategory} placeholder={t('marketplace.category_placeholder')} colors={colors} styles={styles} />

                <Text style={styles.formLabel}>{t('marketplace.min_rating_supplier')}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: Spacing.md }}>
                  {[0, 3, 4, 4.5].map(val => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setMpMinRating(val)}
                      style={{
                        flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                        backgroundColor: mpMinRating === val ? colors.primary : colors.glass,
                        borderWidth: 1, borderColor: mpMinRating === val ? colors.primary : colors.glassBorder
                      }}
                    >
                      <Text style={{ color: mpMinRating === val ? '#fff' : colors.text, fontWeight: '600', fontSize: 12 }}>
                        {val === 0 ? t('common.all') : `${val}+ ⭐`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {mpSearchType === 'products' && (
                  <>
                    <Text style={styles.formLabel}>{t('marketplace.price_range', { currency: getCurrencySymbol(user?.currency) })}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: Spacing.md }}>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.logInput}
                          placeholder={t('common.min')}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={mpPriceMin}
                          onChangeText={setMpPriceMin}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={styles.logInput}
                          placeholder={t('common.max')}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                          value={mpPriceMax}
                          onChangeText={setMpPriceMax}
                        />
                      </View>
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg }}>
                  <Text style={styles.formLabel}>{t('marketplace.verified_only')}</Text>
                  <TouchableOpacity
                    onPress={() => setMpVerifiedOnly(!mpVerifiedOnly)}
                    style={{
                      width: 48, height: 26, borderRadius: 13, padding: 2,
                      backgroundColor: mpVerifiedOnly ? colors.success : colors.divider
                    }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: mpVerifiedOnly ? 'flex-end' : 'flex-start' }} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.divider, flex: 1 }]}
                    onPress={() => {
                      setMpCity('');
                      setMpCategory('');
                      setMpMinRating(0);
                      setMpVerifiedOnly(false);
                      setMpPriceMin('');
                      setMpPriceMax('');
                      loadMarketplace();
                      setShowMpFilters(false);
                    }}
                  >
                    <Text style={[styles.submitBtnText, { color: colors.text }]}>{t('common.reset')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 2 }]}
                    onPress={() => {
                      loadMarketplace();
                      setShowMpFilters(false);
                    }}
                  >
                    <Text style={styles.submitBtnText}>{t('common.apply')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Invite Modal */}
        <Modal visible={showInviteModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '50%' }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('suppliers.invite_to_register')}</Text>
                <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inviteDesc}>
                {t('suppliers.invite_desc')}
              </Text>

              <FormField
                label={t('suppliers.supplier_email')}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@fournisseur.com"
                colors={colors}
                styles={styles}
              />

              <TouchableOpacity
                style={[styles.submitBtn, (!inviteEmail.trim() || inviteSaving) && styles.submitBtnDisabled]}
                onPress={submitInvite}
                disabled={!inviteEmail.trim() || inviteSaving}
              >
                {inviteSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{t('suppliers.send_invite')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Marketplace Detail Modal */}
        <Modal visible={showMpDetail} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {mpDetail?.profile?.company_name ?? t('suppliers.supplier')}
                </Text>
                <TouchableOpacity onPress={() => setShowMpDetail(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {mpDetailLoading ? (
                <ActivityIndicator color={colors.primary} size="large" style={{ padding: Spacing.xxl }} />
              ) : mpDetail ? (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Hero header */}
                  <View style={styles.mpHero}>
                    <View style={styles.mpHeroAvatar}>
                      <Ionicons name="storefront" size={32} color={colors.primary} />
                    </View>
                    <View style={styles.mpHeroInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.mpHeroName}>{mpDetail.profile.company_name}</Text>
                        {mpDetail.profile.is_verified && (
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        )}
                      </View>
                      {mpDetail.profile.description ? (
                        <Text style={styles.mpHeroDesc} numberOfLines={2}>{mpDetail.profile.description}</Text>
                      ) : null}
                      <View style={styles.mpHeroRating}>
                        <View style={styles.mpStars}>{renderStars(mpDetail.profile.rating_average)}</View>
                        <Text style={{ color: colors.warning, fontSize: FontSize.sm, fontWeight: '700' }}>
                          {mpDetail.profile.rating_average.toFixed(1)}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                          ({mpDetail.profile.rating_count} {t('common.reviews')})
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* KPI pills */}
                  <View style={styles.mpKpiRow}>
                    {mpDetail.profile.city ? (
                      <View style={[styles.mpKpiPill, { backgroundColor: colors.info + '15' }]}>
                        <Ionicons name="location" size={14} color={colors.info} />
                        <Text style={[styles.mpKpiText, { color: colors.info }]}>{mpDetail.profile.city}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.mpKpiPill, { backgroundColor: colors.secondary + '15' }]}>
                      <Ionicons name="time" size={14} color={colors.secondary} />
                      <Text style={[styles.mpKpiText, { color: colors.secondary }]}>{mpDetail.profile.average_delivery_days}j {t('marketplace.delivery')}</Text>
                    </View>
                    {mpDetail.profile.min_order_amount > 0 && (
                      <View style={[styles.mpKpiPill, { backgroundColor: colors.warning + '15' }]}>
                        <Ionicons name="cash" size={14} color={colors.warning} />
                        <Text style={[styles.mpKpiText, { color: colors.warning }]}>{t('common.min')} {formatUserCurrency(mpDetail.profile.min_order_amount, user)}</Text>
                      </View>
                    )}
                    <View style={[styles.mpKpiPill, { backgroundColor: colors.primary + '15' }]}>
                      <Ionicons name="cube" size={14} color={colors.primary} />
                      <Text style={[styles.mpKpiText, { color: colors.primary }]}>{mpDetail.catalog.length} {t('marketplace.products')}</Text>
                    </View>
                  </View>

                  {/* Contact rapide */}
                  {mpDetail.profile.phone ? (
                    <View style={styles.mpContactRow}>
                      <TouchableOpacity
                        style={[styles.mpContactBtn, { backgroundColor: '#25D366' + '15', borderColor: '#25D366' + '30' }]}
                        onPress={() => handleWhatsApp(mpDetail.profile.phone)}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                        <Text style={{ color: '#25D366', fontSize: FontSize.xs, fontWeight: '600' }}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.mpContactBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                        onPress={() => Linking.openURL(`tel:${mpDetail.profile.phone}`)}
                      >
                        <Ionicons name="call" size={18} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontSize: FontSize.xs, fontWeight: '600' }}>{t('common.call')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Categories */}
                  {mpDetail.profile.categories && mpDetail.profile.categories.length > 0 && (
                    <View style={styles.mpCategoriesSection}>
                      <Text style={styles.mpSectionLabel}>{t('common.categories').toUpperCase()}</Text>
                      <View style={styles.mpCategories}>
                        {mpDetail.profile.categories.map((cat: string, i: number) => (
                          <View key={i} style={styles.mpCatChip}>
                            <Text style={styles.mpCatText}>{cat}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Catalogue */}
                  <View style={styles.mpCatalogSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                      <Ionicons name="pricetags" size={18} color={colors.primary} />
                      <Text style={styles.sectionTitle}>{t('marketplace.catalog')} ({mpDetail.catalog.length})</Text>
                    </View>
                    {mpDetail.catalog.length === 0 ? (
                      <Text style={{ color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md }}>
                        {t('marketplace.no_products_in_catalog')}
                      </Text>
                    ) : (
                      <View style={styles.mpCatalogGrid}>
                        {(showAllMpCatalog ? mpDetail.catalog : mpDetail.catalog.slice(0, 5)).map((product) => (
                          <View key={product.catalog_id} style={styles.mpCatalogCard}>
                            <View style={styles.mpCatalogCardIcon}>
                              <Ionicons name="cube-outline" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.mpCatalogName} numberOfLines={1}>{product.name}</Text>
                              {product.category ? (
                                <Text style={styles.mpCatalogCat}>{product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}</Text>
                              ) : null}
                            </View>
                            <View style={styles.mpCatalogPriceBox}>
                              <Text style={styles.mpCatalogPrice}>{formatUserCurrency(product.price, user)}</Text>
                              <Text style={styles.mpCatalogUnit}>/{product.unit}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {mpDetail.catalog.length > 5 && (
                      <TouchableOpacity
                        style={styles.seeMoreBtn}
                        onPress={() => setShowAllMpCatalog(!showAllMpCatalog)}
                      >
                        <Text style={styles.seeMoreText}>
                          {showAllMpCatalog ? t('common.see_less') : t('marketplace.see_more_products', { count: mpDetail.catalog.length - 5 })}
                        </Text>
                        <Ionicons name={showAllMpCatalog ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Avis */}
                  {mpDetail.ratings.length > 0 && (
                    <View style={styles.mpReviewsSection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
                        <Ionicons name="chatbubbles" size={18} color={colors.warning} />
                        <Text style={styles.sectionTitle}>{t('common.reviews')} ({mpDetail.ratings.length})</Text>
                      </View>
                      {mpDetail.ratings.slice(0, 5).map((r) => (
                        <View key={r.rating_id} style={styles.mpReviewCard}>
                          <View style={styles.mpReviewHeader}>
                            <View style={styles.mpReviewerAvatar}>
                              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                                {r.shopkeeper_name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.mpReviewName}>{r.shopkeeper_name}</Text>
                              <Text style={styles.mpReviewDate}>
                                {new Date(r.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <View style={styles.mpStars}>{renderStars(r.score)}</View>
                          </View>
                          {r.comment ? <Text style={styles.mpReviewComment}>{r.comment}</Text> : null}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.mpActionRow}>
                    <TouchableOpacity
                      style={styles.mpChatBtn}
                      onPress={() => {
                        if (mpDetail?.profile) {
                          setShowMpDetail(false);
                          setChatPartnerId(mpDetail.profile.user_id);
                          setChatPartnerName(mpDetail.profile.company_name);
                          setShowChat(true);
                        }
                      }}
                    >
                      <Ionicons name="chatbubble" size={20} color="#fff" />
                      <Text style={styles.mpActionBtnText}>{t('common.chat')}</Text>
                    </TouchableOpacity>
                    {mpDetail.catalog.length > 0 && (
                      <TouchableOpacity style={styles.mpOrderBtnNew} onPress={openMpOrderModal}>
                        <Ionicons name="cart" size={20} color="#fff" />
                        <Text style={styles.mpActionBtnText}>{t('suppliers.order_action')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ height: Spacing.lg }} />
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>

        {/* Order Creation Modal (3-step flow) */}
        <OrderCreationModal
          visible={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          onOrderCreated={() => {
            setShowOrderModal(false);
            setShowMpDetail(false);
            Alert.alert(t('suppliers.order_sent_title'), t('suppliers.order_sent_desc'));
          }}
          preSelectedSupplier={orderPreselect}
          preLoadedCatalog={orderCatalog}
        />

        <ChatModal
          visible={showChat}
          onClose={() => setShowChat(false)}
          partnerId={chatPartnerId}
          partnerName={chatPartnerName}
        />

      </LinearGradient>
    </PremiumGate>
  );

  function getStatusColor(status: string, colors: any) {
    switch (status) {
      case 'delivered': return colors.success;
      case 'shipped': return colors.info;
      case 'confirmed': return colors.secondary;
      case 'pending': return colors.warning;
      case 'cancelled': return colors.danger;
      default: return colors.textMuted;
    }
  }
}

function DetailRow({ icon, label, value, colors, styles }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string, colors: any, styles: any }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <View style={styles.detailRowInfo}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
  colors: any;
  styles: any;
}) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={styles.formInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pageTitle: { fontSize: FontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: Spacing.xs },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', ...glassStyle,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: FontSize.md, marginLeft: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: Spacing.xs },
  supplierCard: { ...glassStyle, padding: Spacing.md, marginBottom: Spacing.sm },
  supplierHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.md, fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm,
  },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, maxWidth: '48%',
  },
  infoChipText: {
    fontSize: 11, fontWeight: '600', flexShrink: 1,
  },
  quickActions: {
    flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.sm,
  },
  quickBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  supplierIcon: {},
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: Spacing.md, marginTop: Spacing.xs,
  },
  seeMoreText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  supplierInfo: { flex: 1 },
  supplierName: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  supplierContact: { fontSize: FontSize.sm, color: colors.textSecondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  infoText: { fontSize: FontSize.sm, color: colors.textSecondary, flex: 1 },
  cardActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.sm, marginTop: Spacing.sm,
  },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardActionText: { fontSize: FontSize.xs, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.bgMid, borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: colors.text },
  modalScroll: { maxHeight: 500 },
  formGroup: { marginBottom: Spacing.md },
  formLabel: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  formInput: {
    backgroundColor: colors.inputBg, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.divider, color: colors.text,
    fontSize: FontSize.md, padding: Spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
  // Detail
  detailRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  detailRowInfo: { flex: 1 },
  detailLabel: { fontSize: FontSize.xs, color: colors.textMuted },
  detailValue: { fontSize: FontSize.md, color: colors.text, marginTop: 2 },
  sectionDivider: { height: 1, backgroundColor: colors.glassBorder, marginVertical: Spacing.md },
  linkedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: colors.text },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkBtnText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: '600' },
  emptyLinked: { fontSize: FontSize.sm, color: colors.textMuted, padding: Spacing.md, textAlign: 'center' },
  linkedItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  linkedInfo: { flex: 1 },
  linkedName: { fontSize: FontSize.md, color: colors.text, fontWeight: '600' },
  linkedPrice: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  productCard: {
    ...glassStyle,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: FontSize.sm,
    color: colors.text,
    fontWeight: '700',
  },
  // Link product
  productSelect: {
    padding: Spacing.sm, borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: colors.divider, marginBottom: Spacing.xs,
    backgroundColor: colors.inputBg,
  },
  productSelectActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  productSelectText: { fontSize: FontSize.md, color: colors.text },
  productSelectTextActive: { color: colors.primaryLight, fontWeight: '600' },
  productSelectQty: { fontSize: FontSize.xs, color: colors.textMuted, marginTop: 2 },
  // Invitation
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.secondary + '15',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  inviteBtnText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  inviteDesc: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  // Segmented control
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: Spacing.md,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  // Marketplace
  mpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  mpDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mpStars: {
    flexDirection: 'row',
    gap: 1,
  },
  mpRating: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  mpCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  mpCatChip: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  mpCatText: {
    fontSize: FontSize.xs,
    color: colors.primaryLight,
  },
  // Marketplace detail - Hero
  mpHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mpHeroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpHeroInfo: {
    flex: 1,
  },
  mpHeroName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  mpHeroDesc: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  mpHeroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  // KPI pills
  mpKpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  mpKpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mpKpiText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Contact row
  mpContactRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mpContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  // Categories section
  mpCategoriesSection: {
    marginBottom: Spacing.md,
  },
  mpSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  // Catalog section
  mpCatalogSection: {
    marginBottom: Spacing.md,
  },
  mpCatalogGrid: {
    gap: 6,
  },
  mpCatalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.md,
  },
  mpCatalogCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpCatalogName: {
    fontSize: FontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  mpCatalogCat: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  mpCatalogPriceBox: {
    alignItems: 'flex-end',
  },
  mpCatalogPrice: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  mpCatalogUnit: {
    fontSize: 10,
    color: colors.textMuted,
  },
  // Reviews section
  mpReviewsSection: {
    marginBottom: Spacing.md,
  },
  mpReviewCard: {
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: 6,
  },
  mpReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  mpReviewerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpReviewName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  mpReviewComment: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 4,
    paddingLeft: 40,
    fontStyle: 'italic',
  },
  mpReviewDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  // Action buttons
  mpActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  mpChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  mpOrderBtnNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  mpActionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  // Legacy (keep for back compat)
  mpOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  mpOrderBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  // Replenishment Styles
  suggestionsContainer: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md, paddingHorizontal: 4 },
  suggestionsScroll: { paddingBottom: 4 },
  suggestionCard: {
    ...glassStyle,
    width: 200,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    backgroundColor: colors.bgMid + '30',
  },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  suggestionName: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  suggestionDetails: { marginBottom: 12, gap: 4 },
  suggestionVelocity: { color: colors.textSecondary, fontSize: 11 },
  suggestionDays: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '15',
    padding: 8,
    borderRadius: 8,
  },
  recommendationText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  // Tabs
  modalTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    maxHeight: 50,
  },
  modalTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  modalTabActive: {
    borderBottomColor: colors.primary,
  },
  modalTabText: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  modalTabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    padding: Spacing.md,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
    gap: 8,
  },
  waBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // History & Invoices
  historyItem: {
    ...glassStyle,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyRef: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  historyDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    opacity: 0.5,
  },

  // Performance
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.inputBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statVal: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.success,
  },
  statLab: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  perfRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  perfItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  perfVal: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  perfLab: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Logs
  logForm: {
    backgroundColor: colors.inputBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 12,
  },
  logTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: 4,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  typeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  logInput: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addLogBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addLogBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  logItem: {
    flexDirection: 'row',
    gap: 12,
  },
  logIconCol: {
    alignItems: 'center',
  },
  logLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.divider,
    marginVertical: 4,
  },
  logBody: {
    flex: 1,
    paddingBottom: 20,
  },
  logDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
  },
  logContent: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
