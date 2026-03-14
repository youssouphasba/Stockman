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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize, GlassStyle } from '../../constants/theme';
import { ApiError, demo as demoApi, setToken, setRefreshToken } from '../../services/api';
import * as LocalAuthentication from 'expo-local-authentication';

import { useTranslation } from 'react-i18next';

const ENTERPRISE_DEMO_URL = 'https://stockman.pro/demo?type=enterprise';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, isBiometricsEnabled, restoreSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  React.useEffect(() => {
    loadSavedCredentials();
    checkBiometrics();
  }, []);

  async function checkBiometrics() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricAvailable(hasHardware && isEnrolled && isBiometricsEnabled);
  }

  async function loadSavedCredentials() {
    try {
      const savedEmail = await SecureStore.getItemAsync('user_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
      // Security: clean up any legacy saved passwords
      await SecureStore.deleteItemAsync('user_password');
    } catch (e) {
      console.error("Failed to load credentials", e);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.login.errorFillFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      if (rememberMe) {
        await SecureStore.setItemAsync('user_email', email.trim());
      } else {
        await SecureStore.deleteItemAsync('user_email');
      }
      if (loggedInUser.required_verification === 'email' && !loggedInUser.can_access_app) {
        router.replace('/(auth)/verify-email');
      } else if (loggedInUser.required_verification === 'phone' && !loggedInUser.can_access_app) {
        router.replace('/(auth)/verify-phone');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.login.errorLogin'));
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('auth.login.biometricLogin'),
    });

    if (result.success) {
      // Use existing saved token to verify session (token is already in SecureStore from last login)
      setLoading(true);
      try {
        const { auth: authApi } = require('../../services/api');
        const userData = await authApi.me();
        if (userData) {
          // Token is still valid — session restored by AuthContext
          const { useAuth: _ } = require('../../contexts/AuthContext');
          // Force a re-check which will pick up the existing token
          const token = await SecureStore.getItemAsync('auth_token');
          if (token) {
            // Token exists and is valid (me() didn't throw), reload
            const { router } = require('expo-router');
            router.replace('/(tabs)');
          } else {
            setError(t('auth.login.biometricNoCreds'));
          }
        }
      } catch (e) {
        setError(t('auth.login.biometricNoCreds'));
      } finally {
        setLoading(false);
      }
    }
  }

  const [demoType, setDemoType] = useState<string | null>(null);

  async function handleDemo(type: 'retail' | 'restaurant' | 'enterprise') {
    if (type === 'enterprise') {
      await Linking.openURL(ENTERPRISE_DEMO_URL);
      return;
    }
    setError('');
    setDemoType(type);
    setDemoLoading(true);
    try {
      const res = await demoApi.createSession(type);
      await setToken(res.access_token);
      if (res.refresh_token) {
        await setRefreshToken(res.refresh_token);
      }
      const demoUser = await restoreSession();
      if (!demoUser) {
        throw new Error(t('auth.login.errorDemo'));
      }
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.login.errorDemo'));
    } finally {
      setDemoLoading(false);
      setDemoType(null);
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
              <Ionicons name="cube" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.login.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
          </View>

          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.login.email')}</Text>
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
              <Text style={styles.label}>{t('auth.login.password')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
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

            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>{t('auth.login.rememberMe')}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity
                style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>
                )}
              </TouchableOpacity>

              {isBiometricAvailable && (
                <TouchableOpacity
                  style={[styles.button, { width: 56, backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.primary }]}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <Ionicons name="finger-print" size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.login.noAccount')} </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>{t('auth.login.signUp')}</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.demoTitle}>{t('auth.login.tryDemo')}</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[styles.demoButton, { flex: 1 }, demoType === 'retail' && styles.buttonDisabled]}
                onPress={() => handleDemo('retail')}
                disabled={demoLoading || loading}
              >
                {demoType === 'retail' ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
                    <Text style={styles.demoButtonText}>{t('auth.login.demoRetail')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoButton, { flex: 1 }, demoType === 'restaurant' && styles.buttonDisabled]}
                onPress={() => handleDemo('restaurant')}
                disabled={demoLoading || loading}
              >
                {demoType === 'restaurant' ? (
                  <ActivityIndicator color={Colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                    <Text style={styles.demoButtonText}>{t('auth.login.demoRestaurant')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.demoEnterpriseButton}
              onPress={() => handleDemo('enterprise')}
              disabled={demoLoading || loading}
            >
              <Ionicons name="globe-outline" size={18} color={Colors.text} />
              <Text style={styles.demoEnterpriseText}>{t('auth.login.demoEnterprise')}</Text>
              <Ionicons name="open-outline" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.demoHint}>{t('auth.login.demoHint')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
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
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.divider,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.sm,
  },
  demoTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  demoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  demoButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  demoEnterpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: Spacing.sm,
  },
  demoEnterpriseText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  demoHint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
