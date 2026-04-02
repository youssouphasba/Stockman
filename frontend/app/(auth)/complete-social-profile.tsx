import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ApiError } from '../../services/api';
import { COUNTRIES, Country } from '../../constants/countries';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import { getFlagFromCountryCode } from '../../utils/flags';

const SECTORS = [
  { key: 'epicerie', label: 'Épicerie', icon: 'cart-outline' },
  { key: 'supermarche', label: 'Supermarché', icon: 'storefront-outline' },
  { key: 'pharmacie', label: 'Pharmacie', icon: 'medical-outline' },
  { key: 'vetements', label: 'Vêtements', icon: 'shirt-outline' },
  { key: 'cosmetiques', label: 'Cosmétiques', icon: 'sparkles-outline' },
  { key: 'electronique', label: 'Électronique', icon: 'phone-portrait-outline' },
  { key: 'quincaillerie', label: 'Quincaillerie', icon: 'hammer-outline' },
  { key: 'automobile', label: 'Auto / garage', icon: 'car-outline' },
  { key: 'grossiste', label: 'Grossiste', icon: 'cube-outline' },
  { key: 'papeterie', label: 'Papeterie', icon: 'document-text-outline' },
  { key: 'restaurant', label: 'Restaurant', icon: 'restaurant-outline' },
  { key: 'boulangerie', label: 'Boulangerie', icon: 'cafe-outline' },
  { key: 'traiteur', label: 'Traiteur', icon: 'fast-food-outline' },
  { key: 'boissons', label: 'Boissons', icon: 'wine-outline' },
  { key: 'couture', label: 'Couture', icon: 'cut-outline' },
  { key: 'savonnerie', label: 'Savonnerie', icon: 'flask-outline' },
  { key: 'menuiserie', label: 'Menuiserie', icon: 'construct-outline' },
  { key: 'imprimerie', label: 'Imprimerie', icon: 'print-outline' },
  { key: 'forge', label: 'Forge', icon: 'build-outline' },
  { key: 'artisanat', label: 'Artisanat', icon: 'color-palette-outline' },
  { key: 'autre', label: 'Autre', icon: 'apps-outline' },
] as const;

function getCountryFlag(country: Country): string {
  return getFlagFromCountryCode(country.code);
}

export default function CompleteSocialProfileScreen() {
  const { t } = useTranslation();
  const { user, completeSocialProfile, logout } = useAuth();
  const { colors, glassStyle, isDark, setTheme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors, glassStyle), [colors, glassStyle]);

  const initialCountry = useMemo(
    () => COUNTRIES.find((country) => country.code === user?.country_code) || COUNTRIES[0],
    [user?.country_code],
  );

  const [name, setName] = useState(user?.name || '');
  const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry);
  const initialPhone = useMemo(() => {
    const existingPhone = (user?.phone || '').trim();
    if (!existingPhone) return '';
    const dialCode = initialCountry.dialCode;
    return existingPhone.startsWith(dialCode) ? existingPhone.slice(dialCode.length) : existingPhone;
  }, [initialCountry.dialCode, user?.phone]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [businessType, setBusinessType] = useState(user?.business_type || '');
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState(user?.how_did_you_hear || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleThemeQuick() {
    void setTheme(isDark ? 'light' : 'dark');
  }

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter((country) =>
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.currency.toLowerCase().includes(query) ||
      country.dialCode.toLowerCase().includes(query),
    );
  }, [countrySearch]);

  const filteredSectors = useMemo(() => {
    const query = sectorSearch.trim().toLowerCase();
    if (!query) return SECTORS;
    return SECTORS.filter((sector) => sector.label.toLowerCase().includes(query));
  }, [sectorSearch]);

  const selectedSector = SECTORS.find((sector) => sector.key === businessType);

  async function handleSubmit() {
    if (!name.trim()) {
      setError(t('auth.completeSocialProfile.errorNameRequired'));
      return;
    }
    if (!businessType) {
      setError(t('auth.completeSocialProfile.errorBusinessTypeRequired'));
      return;
    }
    if (!phone.trim()) {
      setError(t('auth.completeSocialProfile.errorPhoneRequired'));
      return;
    }

    const fullPhone = phone.trim().startsWith('+')
      ? phone.trim()
      : `${selectedCountry.dialCode}${phone.trim()}`;

    setError('');
    setLoading(true);
    try {
      await completeSocialProfile({
        name: name.trim(),
        countryCode: selectedCountry.code,
        phone: fullPhone,
        businessType,
        referralSource: howDidYouHear,
      });
      router.replace('/(auth)/verify-phone' as any);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.completeSocialProfile.errorSubmit'));
    } finally {
      setLoading(false);
    }
  }

  async function handleExit() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.themeBtn} onPress={toggleThemeQuick} activeOpacity={0.85}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Ionicons name="business-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.completeSocialProfile.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.completeSocialProfile.subtitle')}</Text>
          </View>

          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.register.name')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.register.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.register.countryCurrency')}</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowCountryModal(true)} activeOpacity={0.85}>
                <View style={styles.selectorInfo}>
                  <Text style={styles.selectorFlag}>{getCountryFlag(selectedCountry)}</Text>
                  <View>
                    <Text style={styles.selectorValue}>{selectedCountry.name}</Text>
                    <Text style={styles.selectorHint}>
                      {selectedCountry.code} • {selectedCountry.currency}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.register.phone')}</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.register.phonePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.register.businessType')}</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowSectorModal(true)} activeOpacity={0.85}>
                <View style={styles.selectorInfo}>
                  <Ionicons
                    name={(selectedSector?.icon as keyof typeof Ionicons.glyphMap) || 'briefcase-outline'}
                    size={18}
                    color={colors.primary}
                  />
                  <View>
                    <Text style={styles.selectorValue}>
                      {selectedSector?.label || t('auth.register.selectBusinessType')}
                    </Text>
                    <Text style={styles.selectorHint}>{t('auth.completeSocialProfile.businessHint')}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.register.howDidYouHear')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="megaphone-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.register.howDidYouHearPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={howDidYouHear}
                  onChangeText={setHowDidYouHear}
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                {t('auth.completeSocialProfile.info', {
                  currency: selectedCountry.currency,
                  country: selectedCountry.name,
                })}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.completeSocialProfile.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCountryModal} animationType="slide" transparent onRequestClose={() => setShowCountryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.completeSocialProfile.countryModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textMuted}
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={styles.selectorFlag}>{getCountryFlag(item)}</Text>
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemTitle}>{item.name}</Text>
                    <Text style={styles.modalItemSubtitle}>{item.code} • {item.currency}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showSectorModal} animationType="slide" transparent onRequestClose={() => setShowSectorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.completeSocialProfile.sectorModalTitle')}</Text>
              <TouchableOpacity onPress={() => setShowSectorModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearch}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t('common.search')}
                placeholderTextColor={colors.textMuted}
                value={sectorSearch}
                onChangeText={setSectorSearch}
              />
            </View>
            <FlatList
              data={filteredSectors}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setBusinessType(item.key);
                    setShowSectorModal(false);
                    setSectorSearch('');
                  }}
                >
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
                  <View style={styles.modalItemText}>
                    <Text style={styles.modalItemTitle}>{item.label}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const createStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 6,
  },
  themeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  card: {
    ...glassStyle,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 14,
    fontSize: FontSize.md,
  },
  dialCode: {
    color: colors.text,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  selectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  selectorFlag: {
    fontSize: 20,
  },
  selectorValue: {
    color: colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  selectorHint: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: `${colors.primary}14`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  infoText: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: `${colors.danger}15`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bgDark,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: Spacing.md,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 14,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  modalItemText: {
    flex: 1,
  },
  modalItemTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  modalItemSubtitle: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
