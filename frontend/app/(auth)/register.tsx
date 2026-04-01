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
import { useTheme } from '../../contexts/ThemeContext';
import { ApiError } from '../../services/api';
import { COUNTRIES, Country } from '../../constants/countries';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

type SignupStep = 'role' | 'details' | 'business';
type SignupRole = 'shopkeeper' | 'supplier';

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

const ASCII_UPPER_A = 65;
const ASCII_UPPER_Z = 90;
const REGIONAL_INDICATOR_A = 0x1f1e6;
const FALLBACK_FLAG = '🏳️';

function getCountryFlag(country: Country): string {
  const normalizedCode = country.code?.trim().toUpperCase();
  if (normalizedCode?.length !== 2) {
    return country.flag || FALLBACK_FLAG;
  }

  const first = normalizedCode.charCodeAt(0);
  const second = normalizedCode.charCodeAt(1);
  const hasOnlyAsciiLetters =
    first >= ASCII_UPPER_A &&
    first <= ASCII_UPPER_Z &&
    second >= ASCII_UPPER_A &&
    second <= ASCII_UPPER_Z;

  if (!hasOnlyAsciiLetters) {
    return country.flag || FALLBACK_FLAG;
  }

  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (first - ASCII_UPPER_A),
    REGIONAL_INDICATOR_A + (second - ASCII_UPPER_A),
  );
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { colors, glassStyle, isDark, setTheme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors, glassStyle), [colors, glassStyle]);
  const authText = {
    title: 'Créer un compte',
    chooseProfile: 'Choisissez votre profil',
    shopkeeper: 'Commerçant',
    shopkeeperAccount: 'Compte commerçant',
    shopkeeperDesc: 'Gérez vos stocks et commandez auprès de fournisseurs.',
    supplier: 'Fournisseur',
    supplierAccount: 'Compte fournisseur',
    supplierDesc: 'Publiez votre catalogue et recevez des commandes.',
    alreadyHaveAccount: 'Déjà un compte ?',
    name: 'Nom',
    namePlaceholder: 'Votre nom',
    countryCurrency: 'Pays et devise',
    phone: 'Téléphone',
    phonePlaceholder: 'Numéro local',
    email: 'Email',
    password: 'Mot de passe',
    passwordPlaceholder: 'Minimum 8 caractères',
    confirmPassword: 'Confirmer le mot de passe',
    confirmPasswordPlaceholder: 'Confirmez votre mot de passe',
    continue: 'Continuer',
    businessType: "Secteur d'activité",
    selectBusinessType: 'Choisissez un secteur',
    howDidYouHear: 'Comment avez-vous connu Stockman ?',
    howDidYouHearPlaceholder: 'Ex. : Facebook, ami, client, Google',
    createAccount: 'Créer mon compte',
    trialNote: '30 jours gratuits • Sans carte bancaire',
    errorFillRequired: 'Veuillez remplir tous les champs obligatoires.',
    errorSelectSector: "Veuillez sélectionner votre secteur d'activité.",
    errorPasswordLength: 'Le mot de passe doit contenir au moins 8 caractères.',
    errorPasswordsMismatch: 'Les mots de passe ne correspondent pas.',
    errorTerms: 'Veuillez accepter les CGU et la Politique de confidentialité.',
    acceptTerms: "J'accepte les",
    acceptPrivacy: "J'accepte la",
    changeProfile: 'Changer de profil',
  };

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

  function toggleThemeQuick() {
    void setTheme(isDark ? 'light' : 'dark');
  }

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
      setError(authText.errorFillRequired);
      return;
    }
    if (!businessType) {
      setError(authText.errorSelectSector);
      return;
    }

    const fullPhone = phone.trim()
      ? (phone.trim().startsWith('+') ? phone.trim() : `${selectedCountry.dialCode}${phone.trim()}`)
      : '';

    if (password.length < 8) {
      setError(authText.errorPasswordLength);
      return;
    }
    if (password !== confirmPassword) {
      setError(authText.errorPasswordsMismatch);
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      setError(authText.errorTerms);
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
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity style={styles.themeBtn} onPress={toggleThemeQuick} activeOpacity={0.85}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>{authText.title}</Text>
            <Text style={styles.subtitle}>
              {step === 'role'
                ? authText.chooseProfile
                : selectedRole === 'shopkeeper'
                  ? authText.shopkeeperAccount
                  : authText.supplierAccount}
            </Text>
          </View>

          {step === 'role' ? (
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'shopkeeper' && styles.roleCardActive]}
                onPress={() => {
                  setSelectedRole('shopkeeper');
                  setStep('details');
                }}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="storefront-outline" size={30} color={colors.primary} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{authText.shopkeeper}</Text>
                  <Text style={styles.roleDesc}>{authText.shopkeeperDesc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'supplier' && styles.roleCardActive]}
                onPress={() => {
                  setSelectedRole('supplier');
                  setStep('details');
                }}
              >
                <View style={[styles.roleIcon, { backgroundColor: `${colors.secondary}20` }]}>
                  <Ionicons name="cube-outline" size={30} color={colors.secondary} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{authText.supplier}</Text>
                  <Text style={styles.roleDesc}>{authText.supplierDesc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{authText.alreadyHaveAccount} </Text>
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
                <Ionicons name="arrow-back" size={18} color={colors.primary} />
                <Text style={styles.backText}>
                  {step === 'business' ? t('common.back') || 'Retour' : authText.changeProfile}
                </Text>
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {step === 'details' && (
                <>
                  <Field label={authText.name} styles={styles}>
                    <InputWrapper icon="person-outline" styles={styles} colors={colors}>
                      <TextInput
                        style={styles.input}
                        placeholder={authText.namePlaceholder}
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        autoComplete="name"
                      />
                    </InputWrapper>
                  </Field>

                  <Field label={authText.countryCurrency} styles={styles}>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowCountryModal(true)}>
                      <Text style={styles.selectorFlag}>{getCountryFlag(selectedCountry)}</Text>
                      <Text style={styles.selectorValue}>{selectedCountry.name}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{selectedCountry.currency}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </Field>

                  <Field label={authText.phone} styles={styles}>
                    <InputWrapper styles={styles} colors={colors}>
                      <View style={styles.dialCodeBox}>
                        <Text style={styles.dialCodeText}>{selectedCountry.dialCode}</Text>
                      </View>
                      <TextInput
                        style={styles.inputWithPrefix}
                        placeholder={phonePlaceholder}
                        placeholderTextColor={colors.textMuted}
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

                  <Field label={authText.email} styles={styles}>
                    <InputWrapper icon="mail-outline" styles={styles} colors={colors}>
                      <TextInput
                        style={styles.input}
                        placeholder={t('auth.register.emailPlaceholder')}
                        placeholderTextColor={colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </InputWrapper>
                  </Field>

                  <Field label={authText.password} styles={styles}>
                    <InputWrapper icon="lock-closed-outline" styles={styles} colors={colors}>
                      <TextInput
                        style={[styles.input, styles.inputPassword]}
                        placeholder={authText.passwordPlaceholder}
                        placeholderTextColor={colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete="new-password"
                      />
                      <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </InputWrapper>
                  </Field>

                  <Field label={authText.confirmPassword} styles={styles}>
                    <InputWrapper icon="shield-checkmark-outline" styles={styles} colors={colors}>
                      <TextInput
                        style={styles.input}
                        placeholder={authText.confirmPasswordPlaceholder}
                        placeholderTextColor={colors.textMuted}
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
                        setError(authText.errorFillRequired);
                        return;
                      }
                      if (password.length < 8) {
                        setError(authText.errorPasswordLength);
                        return;
                      }
                      if (password !== confirmPassword) {
                        setError(authText.errorPasswordsMismatch);
                        return;
                      }
                      setError('');
                      setStep('business');
                    }}
                  >
                    <Text style={styles.buttonSecondaryText}>{authText.continue}</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'business' && (
                <>
                  <Field label={authText.businessType} styles={styles}>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowSectorModal(true)}>
                      <View style={styles.selectorLeft}>
                        <Ionicons
                          name={(selectedSector?.icon || 'briefcase-outline') as keyof typeof Ionicons.glyphMap}
                          size={18}
                          color={colors.primary}
                        />
                        <Text style={styles.selectorValue}>
                          {selectedSector?.label || authText.selectBusinessType}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </Field>

                  <Field label={authText.howDidYouHear} optional styles={styles}>
                    <InputWrapper icon="megaphone-outline" styles={styles} colors={colors}>
                      <TextInput
                        style={styles.input}
                        placeholder={authText.howDidYouHearPlaceholder}
                        placeholderTextColor={colors.textMuted}
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
                        color={acceptedTerms ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkText}>
                      {authText.acceptTerms}{' '}
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
                        color={acceptedPrivacy ? colors.primary : colors.textMuted}
                      />
                    </TouchableOpacity>
                    <Text style={styles.checkText}>
                      {authText.acceptPrivacy}{' '}
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
                        <Text style={styles.buttonText}>{authText.createAccount}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </TouchableOpacity>

                  {selectedRole === 'shopkeeper' && (
                    <View style={styles.infoBox}>
                      <Ionicons name="gift-outline" size={16} color={colors.primary} />
                      <Text style={styles.infoText}>{authText.trialNote}</Text>
                    </View>
                  )}

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>{authText.alreadyHaveAccount} </Text>
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
        title={authText.countryCurrency}
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
            <Text style={styles.modalItemTitle}>{getCountryFlag(item)} {item.name}</Text>
            <Text style={styles.modalItemMeta}>{item.dialCode} • {item.currency}</Text>
          </TouchableOpacity>
        )}
        styles={styles}
        colors={colors}
      />

      <SelectionModal
        visible={showSectorModal}
        title={authText.businessType}
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
        styles={styles}
        colors={colors}
      />
    </LinearGradient>
  );
}

function Field({
  label,
  optional = false,
  children,
  styles,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
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
  styles,
  colors,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
  colors: any;
}) {
  return (
    <View style={styles.inputWrapper}>
      {icon ? <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.inputIcon} /> : null}
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
  styles,
  colors,
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
  styles: ReturnType<typeof createStyles>;
  colors: any;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={onQueryChange}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
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

const createStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingTop: 72, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
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
    zIndex: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: FontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  card: {
    ...glassStyle,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg,
    marginBottom: 14,
  },
  roleCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}12` },
  roleIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  roleDesc: { fontSize: FontSize.sm, color: colors.textMuted, lineHeight: 18 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backText: { color: colors.primary, fontWeight: '700', marginLeft: 6 },
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
  errorText: { color: colors.danger, marginLeft: 8, flex: 1, fontSize: FontSize.sm },
  inputGroup: { marginBottom: 16 },
  label: { color: colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8 },
  optionalText: { color: colors.textMuted, fontWeight: '500' },
  inputWrapper: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  inputPassword: { paddingRight: 36 },
  eyeButton: { paddingLeft: 8 },
  selector: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  selectorFlag: { fontSize: 22, marginRight: 10 },
  selectorValue: { flex: 1, color: colors.text, fontSize: FontSize.md },
  badge: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  dialCodeBox: {
    paddingRight: 10,
    marginRight: 10,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dialCodeText: { color: colors.text, fontWeight: '700' },
  inputWithPrefix: { flex: 1, color: colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkText: { color: colors.textSecondary, marginLeft: 10, flex: 1, lineHeight: 20 },
  legalLink: { color: colors.primary, fontWeight: '700' },
  button: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonSecondary: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  buttonSecondaryText: { color: colors.text, fontWeight: '800', fontSize: FontSize.md },
  infoBox: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}12`,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { color: colors.primary, fontSize: FontSize.sm, marginLeft: 8, flex: 1, lineHeight: 18 },
  footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { color: colors.textMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: colors.inputBg,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, marginLeft: 8 },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
  modalItemMeta: { color: colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
});
