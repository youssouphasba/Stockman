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
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { ApiError } from '../../services/api';
import { COUNTRIES, Country } from '../../constants/countries';
import { BorderRadius, Colors, FontSize, Spacing } from '../../constants/theme';

type SignupStep = 'role' | 'details' | 'business';
type SignupRole = 'shopkeeper' | 'supplier';

const SECTORS = [
  { key: 'epicerie', label: 'Epicerie', icon: 'cart-outline' },
  { key: 'supermarche', label: 'Supermarche', icon: 'storefront-outline' },
  { key: 'pharmacie', label: 'Pharmacie', icon: 'medical-outline' },
  { key: 'vetements', label: 'Vetements', icon: 'shirt-outline' },
  { key: 'cosmetiques', label: 'Cosmetiques', icon: 'sparkles-outline' },
  { key: 'electronique', label: 'Electronique', icon: 'phone-portrait-outline' },
  { key: 'quincaillerie', label: 'Quincaillerie', icon: 'hammer-outline' },
  { key: 'automobile', label: 'Auto / Garage', icon: 'car-outline' },
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

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<SignupRole>('shopkeeper');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [sectorSearch, setSectorSearch] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState('');

  const openLegalDoc = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      setError(t('auth.register.errorRegister'));
    }
  };

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
  const phonePlaceholder = `${t('auth.register.phonePlaceholder')} (${selectedCountry.name})`;

  async function handleRegister() {
    const phoneRequired = selectedRole === 'shopkeeper';
    if (!name.trim() || !email.trim() || !password.trim() || (phoneRequired && !phone.trim())) {
      setError(t('auth.register.errorFillRequired'));
      return;
    }
    if (!businessType) {
      setError(t('auth.register.errorSelectSector') || "Veuillez selectionner votre secteur d'activite.");
      return;
    }

    const fullPhone = phone.trim()
      ? (phone.trim().startsWith('+') ? phone.trim() : `${selectedCountry.dialCode}${phone.trim()}`)
      : '';

    if (password.length < 8) {
      setError(t('auth.register.errorPasswordLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.register.errorPasswordsMismatch'));
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError(t('auth.register.errorTerms'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const registeredUser = await register(
        email.trim(),
        password,
        name.trim(),
        selectedRole,
        fullPhone || undefined,
        selectedCountry.currency,
        businessType,
        howDidYouHear,
        selectedCountry.code,
        selectedRole === 'shopkeeper' ? 'starter' : undefined,
        'mobile',
      );

      if (registeredUser.required_verification === 'email' && !registeredUser.can_access_app) {
        router.replace('/(auth)/verify-email');
      } else if (registeredUser.required_verification === 'phone' && !registeredUser.can_access_app) {
        router.replace('/(auth)/verify-phone');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.register.errorRegister'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.bgDark, Colors.bgMid, Colors.bgLight]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <Text style={styles.subtitle}>
              {step === 'role'
                ? t('auth.register.chooseProfile')
                : selectedRole === 'shopkeeper'
                  ? t('auth.register.shopkeeperAccount')
                  : t('auth.register.supplierAccount')}
            </Text>
          </View>

          {step === 'role' ? (
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'shopkeeper' && styles.roleCardActive]}
                onPress={() => {
                  setSelectedRole('shopkeeper');
                  setStep('form');
                }}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${Colors.primary}20` }]}>
                  <Ionicons name="storefront-outline" size={30} color={Colors.primary} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{t('auth.register.shopkeeper')}</Text>
                  <Text style={styles.roleDesc}>{t('auth.register.shopkeeperDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'supplier' && styles.roleCardActive]}
                onPress={() => {
                  setSelectedRole('supplier');
                  setStep('form');
                }}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${Colors.secondary}20` }]}>
                  <Ionicons name="cube-outline" size={30} color={Colors.secondary} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{t('auth.register.supplier')}</Text>
                  <Text style={styles.roleDesc}>{t('auth.register.supplierDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('auth.register.alreadyHaveAccount')} </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>{t('auth.login.signIn')}</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => setStep(step === 'business' ? 'details' : 'role')}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.primaryLight} />
                <Text style={styles.backText}>
                  {step === 'business' ? t('common.back') || 'Retour' : t('auth.register.changeProfile')}
                </Text>
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {step === 'details' && (
                <>
                  <Field label={t('auth.register.name')}>
                    <InputWrapper icon="person-outline">
                      <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.namePlaceholder')}
                        placeholderTextColor={Colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoComplete="name"
                      />
                    </InputWrapper>
                  </Field>

                  <Field label={t('auth.register.countryCurrency')}>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowCountryModal(true)}>
                      <Text style={styles.selectorFlag}>{selectedCountry.flag}</Text>
                      <Text style={styles.selectorValue}>{selectedCountry.name}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{selectedCountry.currency}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </Field>

                  <Field label={t('auth.register.phone')}>
                    <InputWrapper>
                      <View style={styles.dialCodeBox}>
                        <Text style={styles.dialCodeText}>{selectedCountry.dialCode}</Text>
                      </View>
                      <TextInput
                        style={styles.inputWithPrefix}
                        placeholder={phonePlaceholder}
                        placeholderTextColor={Colors.textMuted}
                        value={phone}
                        onChangeText={(value) => {
                          if (value.startsWith('+') && value.startsWith(selectedCountry.dialCode)) {
                            setPhone(value.replace(selectedCountry.dialCode, '').trim());
                            return;
                          }
                          setPhone(value);
                        }}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                      />
                    </InputWrapper>
                  </Field>

                  <Field label={t('auth.register.email')}>
                    <InputWrapper icon="mail-outline">
                      <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.emailPlaceholder')}
                        placeholderTextColor={Colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </InputWrapper>
                  </Field>

                  <Field label={t('auth.register.password')}>
                    <InputWrapper icon="lock-closed-outline">
                      <TextInput
                        style={[styles.input, styles.inputPassword]}
                        placeholder={t('auth.register.passwordPlaceholder')}
                        placeholderTextColor={Colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                      />
                      <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textMuted} />
                      </TouchableOpacity>
                    </InputWrapper>
                  </Field>

                  <Field label={t('auth.register.confirmPassword')}>
                    <InputWrapper icon="shield-checkmark-outline">
                      <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.confirmPasswordPlaceholder')}
                        placeholderTextColor={Colors.textMuted}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                      />
                    </InputWrapper>
                  </Field>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => {
                      const phoneRequired = selectedRole === 'shopkeeper';
                      if (!name.trim() || !email.trim() || !password.trim() || (phoneRequired && !phone.trim())) {
                        setError(t('auth.register.errorFillRequired'));
                        return;
                      }
                      if (password.length < 8) {
                        setError(t('auth.register.errorPasswordLength'));
                        return;
                      }
                      if (password !== confirmPassword) {
                        setError(t('auth.register.errorPasswordsMismatch'));
                        return;
                      }
                      setError('');
                      setStep('business');
                    }}
                  >
                    <Text style={styles.buttonText}>{t('auth.register.continueToPlan') || 'Continuer'}</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'business' && (
                <>
                  <Field label={t('auth.register.businessType') || "Secteur d'activite"}>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowSectorModal(true)}>
                      <View style={styles.selectorLeft}>
                        <Ionicons
                          name={(selectedSector?.icon || 'briefcase-outline') as keyof typeof Ionicons.glyphMap}
                          size={18}
                          color={Colors.primaryLight}
                        />
                        <Text style={styles.selectorValue}>
                          {selectedSector?.label || (t('auth.register.selectBusinessType') || 'Choisissez un secteur')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </Field>

                  <Field label={t('auth.register.howDidYouHear') || 'Comment avez-vous connu Stockman ?'} optional>
                    <InputWrapper icon="megaphone-outline">
                      <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.howDidYouHearPlaceholder') || 'Ex: Facebook, ami, client, Google'}
                        placeholderTextColor={Colors.textMuted}
                        value={howDidYouHear}
                        onChangeText={setHowDidYouHear}
                      />
                    </InputWrapper>
                  </Field>

                  <View style={styles.checkRow}>
                    <TouchableOpacity onPress={() => setAcceptedTerms((prev) => !prev)}>
                      <Ionicons
                        name={acceptedTerms ? 'checkbox-outline' : 'square-outline'}
                        size={22}
                        color={acceptedTerms ? Colors.primaryLight : Colors.textMuted}
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkText}>
                      {t('auth.register.acceptTerms')}{' '}
                      <Text style={styles.legalLink} onPress={() => openLegalDoc('https://stockman.pro/terms')}>
                        {t('common.terms')}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.checkRow}>
                    <TouchableOpacity onPress={() => setAcceptedPrivacy((prev) => !prev)}>
                      <Ionicons
                        name={acceptedPrivacy ? 'checkbox-outline' : 'square-outline'}
                        size={22}
                        color={acceptedPrivacy ? Colors.primaryLight : Colors.textMuted}
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkText}>
                      {t('auth.register.acceptPrivacy')}{' '}
                      <Text style={styles.legalLink} onPress={() => openLegalDoc('https://stockman.pro/privacy')}>
                        {t('common.privacy')}
                      </Text>
                    </Text>
                  </View>

                  <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>{t('auth.register.createAccount')}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>

                  {selectedRole === 'shopkeeper' && (
                    <View style={styles.infoBox}>
                      <Ionicons name="gift-outline" size={16} color={Colors.primaryLight} />
                      <Text style={styles.infoText}>{t('auth.register.trialNote')}</Text>
                    </View>
                  )}

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>{t('auth.register.alreadyHaveAccount')} </Text>
                    <Link href="/(auth)/login" asChild>
                      <TouchableOpacity>
                        <Text style={styles.footerLink}>{t('auth.login.signIn')}</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={showCountryModal}
        title={t('auth.register.countryCurrency')}
        placeholder={t('common.search') || 'Rechercher'}
        query={countrySearch}
        onQueryChange={setCountrySearch}
        onClose={() => setShowCountryModal(false)}
        data={filteredCountries}
        keyExtractor={(item) => item.code}
        renderItem={(item) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              setSelectedCountry(item);
              setShowCountryModal(false);
              setCountrySearch('');
            }}
          >
            <Text style={styles.modalItemTitle}>{item.flag} {item.name}</Text>
            <Text style={styles.modalItemMeta}>{item.dialCode} · {item.currency}</Text>
          </TouchableOpacity>
        )}
      />

      <SelectionModal
        visible={showSectorModal}
        title={t('auth.register.businessType') || "Secteur d'activite"}
        placeholder={t('common.search') || 'Rechercher'}
        query={sectorSearch}
        onQueryChange={setSectorSearch}
        onClose={() => setShowSectorModal(false)}
        data={filteredSectors}
        keyExtractor={(item) => item.key}
        renderItem={(item) => (
          <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
              setBusinessType(item.key);
              setShowSectorModal(false);
              setSectorSearch('');
            }}
          >
            <Text style={styles.modalItemTitle}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </LinearGradient>
  );
}

function Field({ label, optional = false, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optionalText}> (optionnel)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function InputWrapper({
  icon,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.inputWrapper}>
      {icon ? <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.inputIcon} /> : null}
      {children}
    </View>
  );
}

function SelectionModal<T>({
  visible,
  title,
  placeholder,
  query,
  onQueryChange,
  onClose,
  data,
  keyExtractor,
  renderItem,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={onQueryChange}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => renderItem(item)}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: 72, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 14,
  },
  roleCardActive: { borderColor: Colors.primaryLight, backgroundColor: 'rgba(59,130,246,0.1)' },
  roleIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  roleDesc: { fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backText: { color: Colors.primaryLight, fontWeight: '700', marginLeft: 6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: Colors.danger, marginLeft: 8, flex: 1, fontSize: FontSize.sm },
  inputGroup: { marginBottom: 16 },
  label: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8 },
  optionalText: { color: Colors.textMuted, fontWeight: '500' },
  inputWrapper: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  inputPassword: { paddingRight: 36 },
  eyeButton: { paddingLeft: 8 },
  selector: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  selectorFlag: { fontSize: 22, marginRight: 10 },
  selectorValue: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  badge: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  badgeText: { color: Colors.primaryLight, fontSize: 12, fontWeight: '700' },
  dialCodeBox: {
    paddingRight: 10,
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  dialCodeText: { color: Colors.text, fontWeight: '700' },
  inputWithPrefix: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkText: { color: Colors.textMuted, marginLeft: 10, flex: 1, lineHeight: 20 },
  legalLink: { color: Colors.primaryLight, fontWeight: '700' },
  button: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonSecondary: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  infoBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}12`,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { color: Colors.primaryLight, fontSize: FontSize.sm, marginLeft: 8, flex: 1, lineHeight: 18 },
  footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { color: Colors.textMuted },
  footerLink: { color: Colors.primaryLight, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: Colors.bgDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  searchInput: { flex: 1, color: Colors.text, paddingVertical: 12, marginLeft: 8 },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalItemTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  modalItemMeta: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
});
