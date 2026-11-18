import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supplierProfile, SupplierProfileData, SupplierProfileCreate } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatNumber } from '../../utils/format';
import LanguagePickerModal from '../../components/LanguagePickerModal';
import DeleteAccountModal from '../../components/DeleteAccountModal';
import HelpCenter from '../../components/HelpCenter';
import ScreenGuide from '../../components/ScreenGuide';
import { GUIDES } from '../../constants/guides';
import ContactSupportModal from '../../components/ContactSupportModal';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import AccountSwitcherModal from '../../components/AccountSwitcherModal';

export default function SupplierSettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const infoStyles = React.useMemo(() => createInfoStyles(colors), [colors]);
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<SupplierProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [helpGuide, setHelpGuide] = useState<{ title: string; steps: any[] } | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [zonesText, setZonesText] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [avgDays, setAvgDays] = useState('');
  const [invoiceBusinessName, setInvoiceBusinessName] = useState('');
  const [invoiceBusinessAddress, setInvoiceBusinessAddress] = useState('');
  const [invoiceLabel, setInvoiceLabel] = useState('Facture');
  const [invoicePrefix, setInvoicePrefix] = useState('FAC');
  const [invoicePaymentTerms, setInvoicePaymentTerms] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const result = await supplierProfile.get();
      setProfile(result);
      populateForm(result);
      setIsNew(false);
    } catch {
      setProfile(null);
      setCompanyName('');
      setDescription('');
      setPhone('');
      setAddress('');
      setCity('');
      setCategoriesText('');
      setZonesText('');
      setMinOrder('0');
      setAvgDays('3');
      setInvoiceBusinessName('');
      setInvoiceBusinessAddress('');
      setInvoiceLabel('Facture');
      setInvoicePrefix('FAC');
      setInvoicePaymentTerms('');
      setInvoiceFooter('');
      setIsNew(true);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  function populateForm(p: SupplierProfileData) {
    setCompanyName(p.company_name || '');
    setDescription(p.description || '');
    setPhone(p.phone || '');
    setAddress(p.address || '');
    setCity(p.city || '');
    setCategoriesText((p.categories || []).join(', '));
    setZonesText((p.delivery_zones || []).join(', '));
    setMinOrder(p.min_order_amount?.toString() || '0');
    setAvgDays(p.average_delivery_days?.toString() || '3');
    setInvoiceBusinessName(p.invoice_business_name || p.company_name || '');
    setInvoiceBusinessAddress(p.invoice_business_address || p.address || '');
    setInvoiceLabel(p.invoice_label || 'Facture');
    setInvoicePrefix(p.invoice_prefix || 'FAC');
    setInvoicePaymentTerms(p.invoice_payment_terms || '');
    setInvoiceFooter(p.invoice_footer || '');
  }

  async function handleSave() {
    if (!companyName.trim()) {
      Alert.alert(t('common.error'), t('supplier_settings.error_company_required'));
      return;
    }
    setSaving(true);
    const data: SupplierProfileCreate = {
      company_name: companyName.trim(),
      description: description.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      categories: categoriesText.split(',').map(s => s.trim()).filter(Boolean),
      delivery_zones: zonesText.split(',').map(s => s.trim()).filter(Boolean),
      min_order_amount: parseFloat(minOrder) || 0,
      average_delivery_days: parseInt(avgDays) || 3,
      invoice_business_name: invoiceBusinessName.trim() || companyName.trim(),
      invoice_business_address: invoiceBusinessAddress.trim() || undefined,
      invoice_label: invoiceLabel.trim() || 'Facture',
      invoice_prefix: invoicePrefix.trim() || 'FAC',
      invoice_payment_terms: invoicePaymentTerms.trim() || undefined,
      invoice_footer: invoiceFooter.trim() || undefined,
    };
    try {
      let result: SupplierProfileData;
      if (isNew) {
        result = await supplierProfile.create(data);
      } else {
        result = await supplierProfile.update(data);
      }
      setProfile(result);
      setIsNew(false);
      setIsEditing(false);
    } catch {
      Alert.alert(t('common.error'), t('supplier_settings.error_save'));
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm(t('auth.logout_confirm'))) {
        logout();
      }
    } else {
      Alert.alert(
        t('auth.logout_title'),
        t('auth.logout_confirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('auth.logout_btn'), style: 'destructive', onPress: () => logout() },
        ]
      );
    }
  }

  function launchGuide(guideKey: string) {
    const guide = GUIDES[guideKey];
    if (guide) {
      setHelpGuide(guide);
    }
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

  function InfoRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={infoStyles.row}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>{t('supplier_settings.page_title')}</Text>

        {/* User info */}
        <View style={styles.card}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() ?? 'F'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{t('supplier_settings.role_supplier')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Commercial profile */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('supplier_settings.commercial_profile')}</Text>
            {!isEditing && profile && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={20} color={colors.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <Text style={styles.label}>{t('supplier_settings.company_name_label')}</Text>
              <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder={t('supplier_settings.company_name_ph')} placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.description_label')}</Text>
              <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder={t('supplier_settings.description_ph')} placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

              <Text style={styles.label}>{t('supplier_settings.phone_label')}</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('supplier_settings_screen.221_xx_xxx_xx_xx')} placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />

              <Text style={styles.label}>{t('supplier_settings.address_label')}</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t('supplier_settings.address_ph')} placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.city_label')}</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={t('supplier_settings.city_ph')} placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.categories_label')}</Text>
              <TextInput style={styles.input} value={categoriesText} onChangeText={setCategoriesText} placeholder={t('supplier_settings.categories_ph')} placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.zones_label')}</Text>
              <TextInput style={styles.input} value={zonesText} onChangeText={setZonesText} placeholder={t('supplier_settings.zones_ph')} placeholderTextColor={colors.textMuted} />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>{t('supplier_settings.min_order_label')} ({t('common.currency_default')})</Text>
                  <TextInput style={styles.input} value={minOrder} onChangeText={setMinOrder} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>{t('supplier_settings.avg_delivery_label')}</Text>
                  <TextInput style={styles.input} value={avgDays} onChangeText={setAvgDays} placeholder="3" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.formActions}>
                {!isNew && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setIsEditing(false);
                      if (profile) populateForm(profile);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {isNew ? t('supplier_settings.create_profile') : t('common.save')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : profile ? (
            <>
              <InfoRow label={t('supplier_settings.info_company')} value={profile.company_name} />
              {profile.description ? <InfoRow label={t('supplier_settings.info_description')} value={profile.description} /> : null}
              {profile.phone ? <InfoRow label={t('supplier_settings.info_phone')} value={profile.phone} /> : null}
              {profile.address ? <InfoRow label={t('supplier_settings.info_address')} value={profile.address} /> : null}
              {profile.city ? <InfoRow label={t('supplier_settings.info_city')} value={profile.city} /> : null}
              {profile.categories?.length > 0 && <InfoRow label={t('supplier_settings.info_categories')} value={profile.categories.join(', ')} />}
              {profile.delivery_zones?.length > 0 && <InfoRow label={t('supplier_settings.info_zones')} value={profile.delivery_zones.join(', ')} />}
              <InfoRow label={t('supplier_settings.info_min_order')} value={`${formatNumber(profile.min_order_amount)} ${t('common.currency_default')}`} />
              <InfoRow label={t('supplier_settings.info_avg_delivery')} value={`${profile.average_delivery_days} ${t('supplier_settings.days')}`} />
              <InfoRow label={t('supplier_settings.info_note')} value={`${profile.rating_average.toFixed(1)}/5 (${profile.rating_count} ${t('supplier_settings.reviews')})`} />
            </>
          ) : null}
        </View>

        {/* Application / Language */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('supplier_settings.application')}</Text>
          <TouchableOpacity
            style={infoStyles.row}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={infoStyles.label}>{t('common.language_choice') || 'Langue'}</Text>
                <Text style={infoStyles.value}>{i18n.language.toUpperCase()}</Text>
              </View>
              <Ionicons name="language-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={infoStyles.row}
            onPress={() => launchGuide('supplierSettings')}
          >
            <View style={styles.utilityRow}>
              <View>
                <Text style={infoStyles.label}>{t('supplier_settings_screen.guide_de_l_espace_fournisseur')}</Text>
                <Text style={infoStyles.value}>{t('supplier_settings_screen.comprendre_les_parametres_et_les_documents')}</Text>
              </View>
              <Ionicons name="play-circle-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sales documents */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('supplier_settings_screen.documents_de_vente')}</Text>
            {!isEditing && profile && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={20} color={colors.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <Text style={styles.label}>{t('supplier_settings_screen.nom_affiche_sur_vos_documents')}</Text>
              <TextInput
                style={styles.input}
                value={invoiceBusinessName}
                onChangeText={setInvoiceBusinessName}
                placeholder={t('supplier_settings_screen.nom_commercial')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>{t('supplier_settings_screen.en_tete_du_document')}</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={invoiceBusinessAddress}
                onChangeText={setInvoiceBusinessAddress}
                placeholder={t('supplier_settings_screen.adresse_ville_telephone_e_mail')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>{t('supplier_settings_screen.type_de_document')}</Text>
                  <TextInput
                    style={styles.input}
                    value={invoiceLabel}
                    onChangeText={setInvoiceLabel}
                    placeholder={t('supplier_settings_screen.facture')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>{t('supplier_settings_screen.prefixe_des_numeros')}</Text>
                  <TextInput
                    style={styles.input}
                    value={invoicePrefix}
                    onChangeText={setInvoicePrefix}
                    placeholder={t('supplier_settings_screen.fac')}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.label}>{t('supplier_settings_screen.conditions_generales_de_vente')}</Text>
              <TextInput
                style={styles.input}
                value={invoicePaymentTerms}
                onChangeText={setInvoicePaymentTerms}
                placeholder={t('supplier_settings_screen.exemple_paiement_comptant_a_la_livraison')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>{t('supplier_settings_screen.pied_de_page')}</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={invoiceFooter}
                onChangeText={setInvoiceFooter}
                placeholder={t('supplier_settings_screen.informations_complementaires_remerciement_mentio')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </>
          ) : (
            <>
              <InfoRow label={t('supplier_settings_screen.nom_sur_le_document')} value={profile?.invoice_business_name || profile?.company_name || t('supplier_settings_screen.non_renseigne')} />
              <InfoRow label={t('supplier_settings_screen.type_de_document')} value={profile?.invoice_label || 'Facture'} />
              <InfoRow label={t('supplier_settings_screen.prefixe_de_numerotation')} value={profile?.invoice_prefix || 'FAC'} />
              <InfoRow label={t('supplier_settings_screen.conditions_de_vente')} value={profile?.invoice_payment_terms || t('supplier_settings_screen.aucune_condition_specifique')} />
              <InfoRow label={t('supplier_settings_screen.pied_de_page')} value={profile?.invoice_footer || t('supplier_settings_screen.aucun_pied_de_page_personnalise')} />
            </>
          )}
        </View>

        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('supplier_settings_screen.informations_legales')}</Text>

          <TouchableOpacity
            style={infoStyles.row}
            onPress={() => router.push({ pathname: '/terms', params: { returnTo: '/(supplier-tabs)/settings' } } as any)}
          >
            <View style={styles.utilityRow}>
              <View>
                <Text style={infoStyles.label}>{t('supplier_settings_screen.cgu_stockman')}</Text>
                <Text style={infoStyles.value}>{t('supplier_settings_screen.relire_les_conditions_d_utilisation_de')}</Text>
              </View>
              <Ionicons name="document-text-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[infoStyles.row, { borderBottomWidth: 0 }]}
            onPress={() => router.push({ pathname: '/privacy', params: { returnTo: '/(supplier-tabs)/settings' } } as any)}
          >
            <View style={styles.utilityRow}>
              <View>
                <Text style={infoStyles.label}>{t('supplier_settings_screen.politique_de_confidentialite')}</Text>
                <Text style={infoStyles.value}>{t('supplier_settings_screen.comprendre_le_traitement_de_vos_donnees')}</Text>
              </View>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support and security */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('supplier_settings_screen.assistance_et_securite')}</Text>

          <TouchableOpacity style={infoStyles.row} onPress={() => setShowHelpCenter(true)}>
            <View style={styles.utilityRow}>
              <View>
                <Text style={infoStyles.label}>{t('supplier_settings_screen.centre_d_aide')}</Text>
                <Text style={infoStyles.value}>{t('supplier_settings_screen.retrouver_les_guides_et_bonnes_pratiques')}</Text>
              </View>
              <Ionicons name="help-circle-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={infoStyles.row} onPress={() => setShowSupportModal(true)}>
            <View style={styles.utilityRow}>
              <View>
                <Text style={infoStyles.label}>{t('supplier_settings_screen.contacter_le_support')}</Text>
                <Text style={infoStyles.value}>{t('supplier_settings_screen.ouvrir_un_ticket_ou_discuter_avec')}</Text>
              </View>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[infoStyles.row, { borderBottomWidth: 0 }]} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.utilityRow}>
              <View>
                <Text style={infoStyles.label}>{user?.password_set ? t('account_switcher.mot_de_passe') : t('supplier_settings_screen.creer_un_mot_de_passe')}</Text>
                <Text style={infoStyles.value}>
                  {user?.password_set ? t('supplier_settings_screen.modifier_votre_mot_de_passe_de') : t('supplier_settings_screen.definir_un_mot_de_passe_en')}
                </Text>
              </View>
              <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={[styles.card, { borderColor: colors.danger + '30', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>{t('settings.danger_zone')}</Text>
          <Text style={[infoStyles.label, { marginBottom: Spacing.md }]}>
            {t('settings.delete_account_desc')}
          </Text>

          <TouchableOpacity style={[infoStyles.row, { borderBottomWidth: 0 }]} onPress={() => setShowDeleteModal(true)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[infoStyles.label, { color: colors.danger, fontSize: FontSize.md, marginBottom: 0 }]}>{t('settings.delete_account')}</Text>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.card} onPress={() => setShowAccountSwitcher(true)}>
          <View style={styles.utilityRow}>
            <View>
              <Text style={infoStyles.label}>{t('supplier_settings_screen.comptes_sur_cet_appareil')}</Text>
              <Text style={infoStyles.value}>{t('supplier_settings_screen.ajouter_un_compte_commercant_staff_ou')}</Text>
            </View>
            <Ionicons name="swap-horizontal-outline" size={20} color={colors.secondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>{t('auth.logout_btn')}</Text>
        </TouchableOpacity>

        <LanguagePickerModal
          visible={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
        />

        <DeleteAccountModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />

        <HelpCenter
          visible={showHelpCenter}
          onClose={() => setShowHelpCenter(false)}
          onLaunchGuide={launchGuide}
          userRole="supplier"
        />

        <ScreenGuide
          visible={!!helpGuide}
          title={helpGuide?.title || ''}
          steps={helpGuide?.steps || []}
          onClose={() => setHelpGuide(null)}
        />

        {showSupportModal && <ContactSupportModal
          visible={showSupportModal}
          onClose={() => setShowSupportModal(false)}
        />}

        <ChangePasswordModal
          visible={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          mode={user?.password_set ? 'change' : 'set'}
        />

        <AccountSwitcherModal
          visible={showAccountSwitcher}
          onClose={() => setShowAccountSwitcher(false)}
        />

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
}

const createInfoStyles = (colors: any) => StyleSheet.create({
  row: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  label: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.md,
    color: colors.text,
  },
});

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
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.secondaryLight,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: colors.secondary,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  formHalf: { flex: 1 },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: FontSize.md,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.danger,
  },
});
