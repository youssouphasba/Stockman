import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert as RNAlert,
} from 'react-native';
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
  Supplier,
  SupplierCreate,
  Product,
  SupplierProductLink,
  MarketplaceSupplier,
  MarketplaceSupplierDetail,
  CatalogProductData,
} from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function SuppliersScreen() {
  const { colors, glassStyle } = useTheme();
  const styles = getStyles(colors, glassStyle);
  const router = useRouter();
  const [tab, setTab] = useState<'manual' | 'marketplace'>('manual');
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Marketplace state
  const [mpSuppliers, setMpSuppliers] = useState<MarketplaceSupplier[]>([]);
  const [mpSearch, setMpSearch] = useState('');
  const [mpCity, setMpCity] = useState('');
  const [mpLoading, setMpLoading] = useState(false);
  const [showMpDetail, setShowMpDetail] = useState(false);
  const [mpDetail, setMpDetail] = useState<MarketplaceSupplierDetail | null>(null);
  const [mpDetailLoading, setMpDetailLoading] = useState(false);
  // Connected order
  const [showMpOrder, setShowMpOrder] = useState(false);
  const [mpOrderItems, setMpOrderItems] = useState<{ catalog_id: string; name: string; quantity: string; price: number }[]>([]);
  const [mpOrderNotes, setMpOrderNotes] = useState('');
  const [mpOrderSaving, setMpOrderSaving] = useState(false);

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
  const [linkedProducts, setLinkedProducts] = useState<SupplierProductLink[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Link product modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [linkPrice, setLinkPrice] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await suppliersApi.list();
      setSupplierList(result);
    } catch {
      // silently fail
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

  const filtered = supplierList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.products_supplied ?? '').toLowerCase().includes(search.toLowerCase())
  );

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
      RNAlert.alert('Erreur', 'Impossible de sauvegarder le fournisseur');
    } finally {
      setFormLoading(false);
    }
  }

  function handleDelete(supplierId: string) {
    const supplier = supplierList.find(s => s.supplier_id === supplierId);
    RNAlert.alert(
      'Supprimer le fournisseur',
      `Voulez-vous vraiment supprimer "${supplier?.name ?? 'ce fournisseur'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await suppliersApi.delete(supplierId);
              loadData();
            } catch {
              RNAlert.alert('Erreur', 'Impossible de supprimer');
            }
          }
        }
      ]
    );
  }

  async function openDetail(supplier: Supplier) {
    setDetailSupplier(supplier);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const products = await suppliersApi.getProducts(supplier.supplier_id);
      setLinkedProducts(products);
    } catch {
      setLinkedProducts([]);
    } finally {
      setDetailLoading(false);
    }
  }

  async function openLinkProduct() {
    if (!detailSupplier) return;
    setShowLinkModal(true);
    try {
      const prods = await productsApi.list();
      const linkedIds = linkedProducts.map((lp) => lp.product_id);
      setAllProducts(prods.filter((p) => !linkedIds.includes(p.product_id)));
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
      RNAlert.alert('Erreur', 'Impossible de lier le produit');
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
      RNAlert.alert('Erreur', 'Impossible de délier le produit');
    }
  }

  // Marketplace functions
  async function loadMarketplace() {
    setMpLoading(true);
    try {
      const result = await marketplaceApi.searchSuppliers({
        q: mpSearch || undefined,
        city: mpCity || undefined,
      });
      setMpSuppliers(result);
    } catch {
      // ignore
    } finally {
      setMpLoading(false);
    }
  }

  async function openMpDetail(supplier: MarketplaceSupplier) {
    setShowMpDetail(true);
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

  function openMpOrder() {
    if (!mpDetail) return;
    setMpOrderItems(
      mpDetail.catalog.filter(p => p.available).map(p => ({
        catalog_id: p.catalog_id,
        name: p.name,
        quantity: '',
        price: p.price,
      }))
    );
    setMpOrderNotes('');
    setShowMpOrder(true);
  }

  function updateMpOrderQty(catalogId: string, qty: string) {
    setMpOrderItems(prev =>
      prev.map(item => item.catalog_id === catalogId ? { ...item, quantity: qty } : item)
    );
  }

  async function submitMpOrder() {
    if (!mpDetail) return;
    const items = mpOrderItems
      .filter(item => parseInt(item.quantity) > 0)
      .map(item => ({
        product_id: item.catalog_id,
        quantity: parseInt(item.quantity),
        unit_price: item.price,
      }));
    if (items.length === 0) {
      RNAlert.alert('Erreur', 'Ajoutez au moins un article');
      return;
    }
    setMpOrderSaving(true);
    try {
      await ordersApi.create({
        supplier_id: mpDetail.profile.user_id,
        items,
        notes: mpOrderNotes.trim() || undefined,
      });
      setShowMpOrder(false);
      setShowMpDetail(false);
      RNAlert.alert('Commande envoyée', 'Votre commande a été transmise au fournisseur');
    } catch {
      RNAlert.alert('Erreur', 'Impossible de passer la commande');
    } finally {
      setMpOrderSaving(false);
    }
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
      RNAlert.alert('Invitation envoyée', `Une invitation a été envoyée à ${inviteEmail.trim()}`);
    } catch {
      RNAlert.alert('Erreur', 'Impossible d\'envoyer l\'invitation');
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

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.pageTitle}>Fournisseurs</Text>

        {/* Segmented control */}
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'manual' && styles.segmentBtnActive]}
            onPress={() => setTab('manual')}
          >
            <Text style={[styles.segmentText, tab === 'manual' && styles.segmentTextActive]}>
              Mes Fournisseurs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === 'marketplace' && styles.segmentBtnActive]}
            onPress={() => { setTab('marketplace'); if (mpSuppliers.length === 0) loadMarketplace(); }}
          >
            <Text style={[styles.segmentText, tab === 'marketplace' && styles.segmentTextActive]}>
              Marketplace
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'manual' ? (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.subtitle}>{supplierList.length} fournisseur(s)</Text>
              <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un fournisseur..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Aucun fournisseur</Text>
                <Text style={styles.emptyText}>Ajoutez vos fournisseurs habituels</Text>
              </View>
            ) : (
              filtered.map((supplier) => (
                <TouchableOpacity
                  key={supplier.supplier_id}
                  style={styles.supplierCard}
                  onPress={() => openDetail(supplier)}
                >
                  <View style={styles.supplierHeader}>
                    <View style={styles.supplierIcon}>
                      <Ionicons name="person-circle-outline" size={36} color={colors.primaryLight} />
                    </View>
                    <View style={styles.supplierInfo}>
                      <Text style={styles.supplierName}>{supplier.name}</Text>
                      {supplier.contact_name ? (
                        <Text style={styles.supplierContact}>{supplier.contact_name}</Text>
                      ) : null}
                    </View>
                  </View>

                  {supplier.phone ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.infoText}>{supplier.phone}</Text>
                    </View>
                  ) : null}

                  {supplier.products_supplied ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.infoText} numberOfLines={1}>{supplier.products_supplied}</Text>
                    </View>
                  ) : null}

                  {supplier.delivery_delay ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      <Text style={styles.infoText}>Délai : {supplier.delivery_delay}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.cardAction} onPress={() => openEditModal(supplier)}>
                      <Ionicons name="create-outline" size={16} color={colors.secondary} />
                      <Text style={[styles.cardActionText, { color: colors.secondary }]}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardAction} onPress={() => handleDelete(supplier.supplier_id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={[styles.cardActionText, { color: colors.danger }]}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        ) : (
          <>
            {/* Marketplace search */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un fournisseur..."
                placeholderTextColor={colors.textMuted}
                value={mpSearch}
                onChangeText={setMpSearch}
                onSubmitEditing={loadMarketplace}
                returnKeyType="search"
              />
            </View>
            <View style={styles.searchWrapper}>
              <Ionicons name="location-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filtrer par ville..."
                placeholderTextColor={colors.textMuted}
                value={mpCity}
                onChangeText={setMpCity}
                onSubmitEditing={loadMarketplace}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={loadMarketplace}>
                <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {mpLoading ? (
              <ActivityIndicator color={colors.primary} size="large" style={{ paddingVertical: Spacing.xxl }} />
            ) : mpSuppliers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Aucun fournisseur trouvé</Text>
                <Text style={styles.emptyText}>Modifiez vos critères de recherche</Text>
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
                      <Text style={styles.supplierName}>{ms.company_name}</Text>
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
                      <Text style={styles.infoText}>{ms.catalog_count} produits</Text>
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
            )}
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
                {editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
              </Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <FormField label="Nom *" value={formName} onChangeText={setFormName} placeholder="Nom commercial" />
              <FormField label="Contact" value={formContactName} onChangeText={setFormContactName} placeholder="Nom du contact" />
              <FormField label="Téléphone" value={formPhone} onChangeText={setFormPhone} placeholder="+225 XX XX XX XX" keyboardType="numeric" />
              <FormField label="Email" value={formEmail} onChangeText={setFormEmail} placeholder="email@exemple.com" />
              <FormField label="Adresse" value={formAddress} onChangeText={setFormAddress} placeholder="Localisation" />
              <FormField label="Produits habituels" value={formProductsSupplied} onChangeText={setFormProductsSupplied} placeholder="Riz, huile, sucre..." />
              <FormField label="Délai de livraison" value={formDeliveryDelay} onChangeText={setFormDeliveryDelay} placeholder="Ex: 2-3 jours" />
              <FormField label="Conditions de paiement" value={formPaymentConditions} onChangeText={setFormPaymentConditions} placeholder="Ex: À la livraison" />
              <FormField label="Notes" value={formNotes} onChangeText={setFormNotes} placeholder="Remarques..." />
              <TouchableOpacity
                style={[styles.submitBtn, formLoading && styles.submitBtnDisabled]}
                onPress={handleSaveSupplier}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingSupplier ? 'Sauvegarder' : 'Ajouter'}
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
              <ScrollView style={styles.modalScroll}>
                {detailSupplier.contact_name ? (
                  <DetailRow icon="person-outline" label="Contact" value={detailSupplier.contact_name} />
                ) : null}
                {detailSupplier.phone ? (
                  <DetailRow icon="call-outline" label="Téléphone" value={detailSupplier.phone} />
                ) : null}
                {detailSupplier.email ? (
                  <DetailRow icon="mail-outline" label="Email" value={detailSupplier.email} />
                ) : null}
                {detailSupplier.address ? (
                  <DetailRow icon="location-outline" label="Adresse" value={detailSupplier.address} />
                ) : null}
                {detailSupplier.products_supplied ? (
                  <DetailRow icon="cube-outline" label="Produits" value={detailSupplier.products_supplied} />
                ) : null}
                {detailSupplier.delivery_delay ? (
                  <DetailRow icon="time-outline" label="Délai" value={detailSupplier.delivery_delay} />
                ) : null}
                {detailSupplier.payment_conditions ? (
                  <DetailRow icon="card-outline" label="Paiement" value={detailSupplier.payment_conditions} />
                ) : null}
                {detailSupplier.notes ? (
                  <DetailRow icon="document-text-outline" label="Notes" value={detailSupplier.notes} />
                ) : null}

                {/* Invite button */}
                <TouchableOpacity style={styles.inviteBtn} onPress={openInvite}>
                  <Ionicons name="mail-outline" size={18} color={colors.secondary} />
                  <Text style={styles.inviteBtnText}>Inviter à s'inscrire</Text>
                </TouchableOpacity>

                <View style={styles.sectionDivider} />

                <View style={styles.linkedHeader}>
                  <Text style={styles.sectionTitle}>Produits liés</Text>
                  <TouchableOpacity style={styles.linkBtn} onPress={openLinkProduct}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.linkBtnText}>Lier un produit</Text>
                  </TouchableOpacity>
                </View>

                {detailLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ padding: Spacing.md }} />
                ) : linkedProducts.length === 0 ? (
                  <Text style={styles.emptyLinked}>Aucun produit lié</Text>
                ) : (
                  linkedProducts.map((lp) => (
                    <View key={lp.link_id} style={styles.linkedItem}>
                      <View style={styles.linkedInfo}>
                        <Text style={styles.linkedName}>{lp.product.name}</Text>
                        <Text style={styles.linkedPrice}>
                          Prix fournisseur : {lp.supplier_price.toLocaleString()} FCFA
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnlinkProduct(lp.link_id)}>
                        <Ionicons name="close-circle" size={22} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <View style={{ height: Spacing.lg }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Link Product Modal */}
      <Modal visible={showLinkModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lier un produit</Text>
              <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FormField
              label="Prix fournisseur"
              value={linkPrice}
              onChangeText={setLinkPrice}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={styles.formLabel}>Sélectionner un produit :</Text>
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
                <Text style={styles.emptyLinked}>Aucun produit disponible</Text>
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
                <Text style={styles.submitBtnText}>Lier</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '50%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inviter à s'inscrire</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inviteDesc}>
              Envoyez une invitation pour que ce fournisseur crée son compte et gère directement son catalogue et ses commandes.
            </Text>

            <FormField
              label="Email du fournisseur"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@fournisseur.com"
            />

            <TouchableOpacity
              style={[styles.submitBtn, (!inviteEmail.trim() || inviteSaving) && styles.submitBtnDisabled]}
              onPress={submitInvite}
              disabled={!inviteEmail.trim() || inviteSaving}
            >
              {inviteSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Envoyer l'invitation</Text>
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
                {mpDetail?.profile?.company_name ?? 'Fournisseur'}
              </Text>
              <TouchableOpacity onPress={() => setShowMpDetail(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {mpDetailLoading ? (
              <ActivityIndicator color={colors.primary} size="large" style={{ padding: Spacing.xxl }} />
            ) : mpDetail ? (
              <ScrollView style={styles.modalScroll}>
                {/* Profile info */}
                <View style={styles.mpProfileSection}>
                  {mpDetail.profile.is_verified && (
                    <View style={styles.mpVerifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.mpVerifiedText}>Vérifié</Text>
                    </View>
                  )}
                  {mpDetail.profile.description ? (
                    <Text style={styles.mpDescription}>{mpDetail.profile.description}</Text>
                  ) : null}
                  {mpDetail.profile.city ? (
                    <DetailRow icon="location-outline" label="Ville" value={mpDetail.profile.city} />
                  ) : null}
                  {mpDetail.profile.phone ? (
                    <DetailRow icon="call-outline" label="Téléphone" value={mpDetail.profile.phone} />
                  ) : null}
                  <DetailRow icon="time-outline" label="Délai moyen" value={`${mpDetail.profile.average_delivery_days} jours`} />
                  {mpDetail.profile.min_order_amount > 0 && (
                    <DetailRow icon="cash-outline" label="Commande min" value={`${mpDetail.profile.min_order_amount.toLocaleString()} FCFA`} />
                  )}
                  <View style={styles.mpRatingSection}>
                    <View style={styles.mpStars}>{renderStars(mpDetail.profile.rating_average)}</View>
                    <Text style={styles.mpRating}>
                      {mpDetail.profile.rating_average.toFixed(1)}/5 ({mpDetail.profile.rating_count} avis)
                    </Text>
                  </View>
                </View>

                {/* Catalogue */}
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>Catalogue ({mpDetail.catalog.length})</Text>
                {mpDetail.catalog.map((product) => (
                  <View key={product.catalog_id} style={styles.mpCatalogItem}>
                    <View style={styles.mpCatalogInfo}>
                      <Text style={styles.mpCatalogName}>{product.name}</Text>
                      {product.category ? (
                        <Text style={styles.mpCatalogCat}>{product.category}</Text>
                      ) : null}
                    </View>
                    <View style={styles.mpCatalogRight}>
                      <Text style={styles.mpCatalogPrice}>{product.price.toLocaleString()} F</Text>
                      <Text style={styles.mpCatalogUnit}>/{product.unit}</Text>
                    </View>
                  </View>
                ))}

                {/* Avis */}
                {mpDetail.ratings.length > 0 && (
                  <>
                    <View style={styles.sectionDivider} />
                    <Text style={styles.sectionTitle}>Avis ({mpDetail.ratings.length})</Text>
                    {mpDetail.ratings.slice(0, 5).map((r) => (
                      <View key={r.rating_id} style={styles.mpReview}>
                        <View style={styles.mpReviewHeader}>
                          <Text style={styles.mpReviewName}>{r.shopkeeper_name}</Text>
                          <View style={styles.mpStars}>{renderStars(r.score)}</View>
                        </View>
                        {r.comment ? <Text style={styles.mpReviewComment}>{r.comment}</Text> : null}
                        <Text style={styles.mpReviewDate}>
                          {new Date(r.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Commander button */}
                {mpDetail.catalog.length > 0 && (
                  <TouchableOpacity style={styles.mpOrderBtn} onPress={openMpOrder}>
                    <Ionicons name="cart-outline" size={20} color="#fff" />
                    <Text style={styles.mpOrderBtnText}>Commander</Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: Spacing.lg }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Marketplace Order Modal */}
      <Modal visible={showMpOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle commande</Text>
              <TouchableOpacity onPress={() => setShowMpOrder(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.formLabel}>Sélectionnez les quantités :</Text>
              {mpOrderItems.map((item) => (
                <View key={item.catalog_id} style={styles.mpOrderItemRow}>
                  <View style={styles.mpOrderItemInfo}>
                    <Text style={styles.mpOrderItemName}>{item.name}</Text>
                    <Text style={styles.mpOrderItemPrice}>{item.price.toLocaleString()} F/unité</Text>
                  </View>
                  <TextInput
                    style={styles.mpOrderQtyInput}
                    value={item.quantity}
                    onChangeText={(v) => updateMpOrderQty(item.catalog_id, v)}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              ))}

              <FormField
                label="Notes"
                value={mpOrderNotes}
                onChangeText={setMpOrderNotes}
                placeholder="Instructions spéciales..."
              />

              {/* Total */}
              <View style={styles.mpOrderTotal}>
                <Text style={styles.mpOrderTotalLabel}>Total estimé</Text>
                <Text style={styles.mpOrderTotalValue}>
                  {mpOrderItems
                    .reduce((sum, item) => sum + (parseInt(item.quantity) || 0) * item.price, 0)
                    .toLocaleString()} FCFA
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, mpOrderSaving && styles.submitBtnDisabled]}
                onPress={submitMpOrder}
                disabled={mpOrderSaving}
              >
                {mpOrderSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Envoyer la commande</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );

  function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
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
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    keyboardType?: 'numeric' | 'default';
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
  supplierIcon: {},
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
  // Marketplace detail
  mpProfileSection: {
    marginBottom: Spacing.sm,
  },
  mpVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  mpVerifiedText: {
    fontSize: FontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
  mpDescription: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  mpRatingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  mpCatalogItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mpCatalogInfo: { flex: 1 },
  mpCatalogName: {
    fontSize: FontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  mpCatalogCat: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  mpCatalogRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mpCatalogPrice: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  mpCatalogUnit: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  mpReview: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mpReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    marginTop: Spacing.xs,
  },
  mpReviewDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: Spacing.xs,
  },
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
  // Marketplace order
  mpOrderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mpOrderItemInfo: { flex: 1 },
  mpOrderItemName: {
    fontSize: FontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  mpOrderItemPrice: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  mpOrderQtyInput: {
    width: 70,
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textAlign: 'center',
  },
  mpOrderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary + '40',
  },
  mpOrderTotalLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  mpOrderTotalValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
});
