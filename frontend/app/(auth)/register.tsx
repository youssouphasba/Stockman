import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { ApiError } from '../../services/api';
import { COUNTRIES, Country } from '../../constants/countries';

import { useTranslation } from 'react-i18next';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'role' | 'plan' | 'form'>('role');
  const [selectedRole, setSelectedRole] = useState<'shopkeeper' | 'supplier'>('shopkeeper');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('starter');
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
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default Sénégal
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [businessType, setBusinessType] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState('');

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      setError(t('auth.register.errorFillRequired'));
      return;
    }
    // Combine country dial code + local number
    const fullPhone = phone.trim().startsWith('+') ? phone.trim() : `${selectedCountry.dialCode}${phone.trim()}`;
    if (password.length < 6) {
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
      await register(
        email.trim(),
        password,
        name.trim(),
        selectedRole,
        fullPhone,
        selectedCountry.currency,
        businessType,
        howDidYouHear,
        selectedCountry.code,
        selectedRole === 'shopkeeper' ? selectedPlan : undefined
      );
      // Redirect to verification instead of index
      router.replace('/(auth)/verify-phone');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.register.errorRegister'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.bgDark, Colors.bgMid, Colors.bgLight]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-add" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.title}>
              {step === 'plan' ? t('auth.register.choosePlan') : t('auth.register.title')}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'role'
                ? t('auth.register.chooseProfile')
                : step === 'plan'
                  ? t('auth.register.choosePlanSubtitle')
                  : selectedRole === 'shopkeeper' ? t('auth.register.shopkeeperAccount') : t('auth.register.supplierAccount')}
            </Text>
          </View>

          {step === 'role' ? (
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'shopkeeper' && styles.roleCardActive]}
                onPress={() => { setSelectedRole('shopkeeper'); setStep('plan'); }}
              >
                <View style={[styles.roleIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <Ionicons name="storefront-outline" size={32} color={Colors.primary} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{t('auth.register.shopkeeper')}</Text>
                  <Text style={styles.roleDesc}>{t('auth.register.shopkeeperDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'supplier' && styles.roleCardActive]}
                onPress={() => { setSelectedRole('supplier'); setStep('form'); }}
              >
                <View style={[styles.roleIcon, { backgroundColor: Colors.secondary + '20' }]}>
                  <Ionicons name="cube-outline" size={32} color={Colors.secondary} />
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
          ) : step === 'plan' ? (
            <View style={styles.card}>
              <TouchableOpacity style={styles.backRow} onPress={() => setStep('role')}>
                <Ionicons name="arrow-back" size={18} color={Colors.primaryLight} />
                <Text style={styles.backText}>{t('auth.register.backToRole')}</Text>
              </TouchableOpacity>

              {/* Starter */}
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'starter' && styles.planCardActive]}
                onPress={() => setSelectedPlan('starter')}
                activeOpacity={0.8}
              >
                <View style={styles.planCardHeader}>
                  <View style={[styles.planIcon, { backgroundColor: '#3B82F620' }]}>
                    <Ionicons name="storefront-outline" size={26} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{t('subscription.plan_starter')}</Text>
                    <Text style={styles.planPrice}>1 000 XOF / 3,99 € {t('subscription.per_month')}</Text>
                  </View>
                  {selectedPlan === 'starter' && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                </View>
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeature}>🏪 1 {t('subscription.features.stores')}</Text>
                  <Text style={styles.planFeature}>👤 1 {t('subscription.features.users')}</Text>
                  <Text style={styles.planFeature}>📱 {t('subscription.mobile_only', 'Application mobile')}</Text>
                </View>
              </TouchableOpacity>

              {/* Pro */}
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'pro' && styles.planCardActive]}
                onPress={() => setSelectedPlan('pro')}
                activeOpacity={0.8}
              >
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>{t('subscription.popular')}</Text>
                </View>
                <View style={styles.planCardHeader}>
                  <View style={[styles.planIcon, { backgroundColor: '#F59E0B20' }]}>
                    <Ionicons name="rocket-outline" size={26} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{t('subscription.plan_pro')}</Text>
                    <Text style={styles.planPrice}>2 500 XOF / 7,99 € {t('subscription.per_month')}</Text>
                  </View>
                  {selectedPlan === 'pro' && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                </View>
                <View style={styles.planFeatures}>
                  <Text style={styles.planFeature}>🏪 2 {t('subscription.features.stores')}</Text>
                  <Text style={styles.planFeature}>👥 5 {t('subscription.features.users')}</Text>
                  <Text style={styles.planFeature}>📱 {t('subscription.mobile_only', 'Application mobile')}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.trialNote}>
                <Ionicons name="gift-outline" size={16} color={Colors.primaryLight} />
                <Text style={styles.trialNoteText}>{t('auth.register.trialNote')}</Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => setStep('form')}
              >
                <Text style={styles.buttonText}>{t('auth.register.continueToPlan')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
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
              <TouchableOpacity style={styles.backRow} onPress={() => setStep(selectedRole === 'shopkeeper' ? 'plan' : 'role')}>
                <Ionicons name="arrow-back" size={18} color={Colors.primaryLight} />
                <Text style={styles.backText}>{t('auth.register.changeProfile')}</Text>
              </TouchableOpacity>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.name')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.register.namePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.countryCurrency')}</Text>
                <TouchableOpacity
                  style={styles.countrySelector}
                  onPress={() => setShowCountryModal(true)}
                >
                  <Text style={styles.flagText}>{selectedCountry.flag}</Text>
                  <Text style={styles.countryNameText}>{selectedCountry.name}</Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyText}>{selectedCountry.currency}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.phone')}</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.dialCodeBox}>
                    <Text style={styles.dialCodeText}>{selectedCountry.dialCode}</Text>
                  </View>
                  <TextInput
                    style={styles.inputWithPrefix}
                    placeholder={t('auth.register.phonePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={phone}
                    onChangeText={(val) => {
                      if (val.startsWith('+')) {
                        const dialCode = selectedCountry.dialCode;
                        if (val.startsWith(dialCode)) {
                          setPhone(val.replace(dialCode, '').trim());
                          return;
                        }
                      }
                      setPhone(val);
                    }}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.businessType')}</Text>
                <View style={[styles.inputWrapper, { paddingHorizontal: Spacing.md }]}>
                  <Ionicons name="business-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.register.businessTypePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={businessType}
                    onChangeText={setBusinessType}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.howDidYouHear')}</Text>
                <View style={[styles.inputWrapper, { paddingHorizontal: Spacing.md }]}>
                  <Ionicons name="megaphone-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.register.howDidYouHearPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={howDidYouHear}
                    onChangeText={setHowDidYouHear}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.email')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.login.emailPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.password')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('auth.register.confirmPassword')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                <TouchableOpacity
                  style={styles.legalRow}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={styles.legalText}>
                    {t('auth.register.acceptTerms')}{' '}
                    <Link href="/terms" asChild>
                      <TouchableOpacity style={{ marginBottom: -3 }}>
                        <Text style={styles.legalLinkSmall}>CGU</Text>
                      </TouchableOpacity>
                    </Link>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.legalRow}
                  onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, acceptedPrivacy && styles.checkboxActive]}>
                    {acceptedPrivacy && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={styles.legalText}>
                    {t('auth.register.acceptPrivacy')}{' '}
                    <Link href="/privacy" asChild>
                      <TouchableOpacity style={{ marginBottom: -3 }}>
                        <Text style={styles.legalLinkSmall}>Politique de Confidentialité</Text>
                      </TouchableOpacity>
                    </Link>
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.register.createAccount')}</Text>
                )}
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
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('auth.register.selectCountry')}</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('auth.register.searchCountry')}
                placeholderTextColor={Colors.textMuted}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                value={searchQuery}
              />
            </View>
            <FlatList
              data={searchQuery
                ? COUNTRIES.filter(c =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.dialCode.includes(searchQuery)
                )
                : COUNTRIES
              }
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setSelectedCountry(item);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={styles.countryItemFlag}>{item.flag}</Text>
                  <Text style={styles.countryItemName}>{item.name}</Text>
                  <Text style={styles.countryItemDial}>{item.dialCode}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  card: {
    ...GlassStyle,
    padding: Spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  inputIcon: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  eyeBtn: {
    padding: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Role selection
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.inputBg,
    marginBottom: Spacing.md,
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: { flex: 1 },
  roleTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  roleDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  backText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  legalText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  legalLinkSmall: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: FontSize.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  flagText: { fontSize: 24 },
  countryNameText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  currencyBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  currencyText: {
    color: Colors.primaryLight,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  dialCodeBox: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRightWidth: 1,
    borderRightColor: Colors.divider,
  },
  dialCodeText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  inputWithPrefix: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    height: '70%',
    padding: Spacing.lg,
    ...GlassStyle,
    backgroundColor: Colors.bgDark, // Overwrite glass color for opacity but keep other glass styles
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  countryItemFlag: { fontSize: 24 },
  countryItemName: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  countryItemDial: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
  },
  // Plan selection
  planCard: {
    borderWidth: 2,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.inputBg,
    position: 'relative',
  },
  planCardActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16,185,129,0.07)',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSize.lg,
  },
  planPrice: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  planFeatures: {
    gap: 4,
    paddingLeft: 4,
  },
  planFeature: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  trialNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  trialNoteText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
