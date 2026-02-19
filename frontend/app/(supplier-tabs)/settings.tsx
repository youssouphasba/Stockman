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
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supplierProfile, SupplierProfileData, SupplierProfileCreate } from '../../services/api';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { formatNumber } from '../../utils/format';
import LanguagePickerModal from '../../components/LanguagePickerModal';

export default function SupplierSettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<SupplierProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

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

  const loadProfile = useCallback(async () => {
    try {
      const result = await supplierProfile.get();
      setProfile(result);
      populateForm(result);
      setIsNew(false);
    } catch {
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
                <Ionicons name="create-outline" size={20} color={Colors.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <Text style={styles.label}>{t('supplier_settings.company_name_label')}</Text>
              <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder={t('supplier_settings.company_name_ph')} placeholderTextColor={Colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.description_label')}</Text>
              <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder={t('supplier_settings.description_ph')} placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />

              <Text style={styles.label}>{t('supplier_settings.phone_label')}</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+221 xx xxx xx xx" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />

              <Text style={styles.label}>{t('supplier_settings.address_label')}</Text>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t('supplier_settings.address_ph')} placeholderTextColor={Colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.city_label')}</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder={t('supplier_settings.city_ph')} placeholderTextColor={Colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.categories_label')}</Text>
              <TextInput style={styles.input} value={categoriesText} onChangeText={setCategoriesText} placeholder={t('supplier_settings.categories_ph')} placeholderTextColor={Colors.textMuted} />

              <Text style={styles.label}>{t('supplier_settings.zones_label')}</Text>
              <TextInput style={styles.input} value={zonesText} onChangeText={setZonesText} placeholder={t('supplier_settings.zones_ph')} placeholderTextColor={Colors.textMuted} />

              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>{t('supplier_settings.min_order_label')} ({t('common.currency_default')})</Text>
                  <TextInput style={styles.input} value={minOrder} onChangeText={setMinOrder} placeholder="0" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>{t('supplier_settings.avg_delivery_label')}</Text>
                  <TextInput style={styles.input} value={avgDays} onChangeText={setAvgDays} placeholder="3" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
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
              <Ionicons name="language-outline" size={20} color={Colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>{t('auth.logout_btn')}</Text>
        </TouchableOpacity>

        <LanguagePickerModal
          visible={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
        />

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
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

const infoStyles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
});

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
  card: {
    ...GlassStyle,
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
    color: Colors.text,
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
    backgroundColor: Colors.secondary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.secondaryLight,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.secondary,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    color: Colors.text,
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
    borderColor: Colors.divider,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: FontSize.md,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.secondary,
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
    ...GlassStyle,
    borderColor: Colors.danger + '30',
    padding: Spacing.md,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.danger,
  },
});
