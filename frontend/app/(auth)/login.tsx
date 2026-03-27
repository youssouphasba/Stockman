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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { ApiError, demo as demoApi, setToken, setRefreshToken } from '../../services/api';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../../contexts/ThemeContext';
import auth from '@react-native-firebase/auth';
import * as Google from 'expo-auth-session/providers/google';

import { useTranslation } from 'react-i18next';

const ENTERPRISE_DEMO_URL = 'https://stockman.pro/demo?type=enterprise';
const GOOGLE_CLIENT_ID_KEYS = [
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
] as const;
const GOOGLE_CLIENT_ID_PLACEHOLDER = 'google-auth-not-configured';

function getGoogleClientId(envKey: (typeof GOOGLE_CLIENT_ID_KEYS)[number]) {
  const value = process.env[envKey]?.trim();
  return value ? value : undefined;
}

function getGoogleNativeRedirectUri(clientId?: string) {
  if (!clientId) return undefined;
  const normalizedClientId = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  if (!normalizedClientId) return undefined;
  return `com.googleusercontent.apps.${normalizedClientId}:/oauthredirect`;
}

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const { login, loginWithSocial, isBiometricsEnabled, restoreSession } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const styles = React.useMemo(() => createStyles(colors, glassStyle), [colors, glassStyle]);

  React.useEffect(() => {
    loadSavedCredentials();
    checkBiometrics();
    checkAppleAvailability();
  }, []);

  const googleClientIds = React.useMemo(() => {
    const webClientId = getGoogleClientId('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    const androidClientId = getGoogleClientId('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
    const iosClientId = getGoogleClientId('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    const platformClientId = Platform.select({
      ios: iosClientId,
      android: androidClientId,
      default: webClientId,
    });
    const fallbackClientId = platformClientId || webClientId || androidClientId || iosClientId || GOOGLE_CLIENT_ID_PLACEHOLDER;

    return {
      webClientId: webClientId || fallbackClientId,
      androidClientId: androidClientId || fallbackClientId,
      iosClientId: iosClientId || fallbackClientId,
      nativeRedirectUri: getGoogleNativeRedirectUri(platformClientId),
      hasConfig: Boolean(platformClientId),
    };
  }, []);

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: googleClientIds.webClientId,
    iosClientId: googleClientIds.iosClientId,
    androidClientId: googleClientIds.androidClientId,
    redirectUri: Platform.OS === 'web' ? undefined : googleClientIds.nativeRedirectUri,
  });

  React.useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type !== 'success') {
      setSocialLoading(null);
      if (googleResponse.type === 'error') {
        setError(t('auth.login.socialError'));
      }
      return;
    }
    const idToken = (googleResponse as any)?.params?.id_token;
    if (!idToken) {
      setError(t('auth.login.socialMissingToken'));
      setSocialLoading(null);
      return;
    }
    void handleGoogleToken(idToken);
  }, [googleResponse]);

  async function checkBiometrics() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(hasHardware && isEnrolled && isBiometricsEnabled);
    } catch {
      setIsBiometricAvailable(false);
    }
  }

  async function checkAppleAvailability() {
    if (Platform.OS !== 'ios') {
      setIsAppleAvailable(false);
      return;
    }
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAppleAvailable(available);
    } catch {
      setIsAppleAvailable(false);
    }
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
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('auth.login.biometricLogin'),
      });

      if (result.success) {
        setLoading(true);
        try {
          const restoredUser = await restoreSession();
          if (restoredUser) {
            router.replace('/(tabs)');
          } else {
            setError(t('auth.login.biometricNoCreds'));
          }
        } catch {
          setError(t('auth.login.biometricNoCreds'));
        } finally {
          setLoading(false);
        }
      }
    } catch {
      setError(t('auth.login.biometricNoCreds'));
    }
  }

  async function handleGoogleLogin() {
    if (!googleClientIds.hasConfig) {
      setError(t('auth.login.googleConfigMissing'));
      return;
    }
    if (!googleRequest) {
      setError(t('auth.login.socialError'));
      return;
    }
    setError('');
    setSocialLoading('google');
    try {
      await promptGoogle();
    } catch (e) {
      setError(t('auth.login.socialError'));
      setSocialLoading(null);
    }
  }

  async function handleGoogleToken(idToken: string) {
    try {
      const credential = auth.GoogleAuthProvider.credential(idToken);
      const firebaseUser = await auth().signInWithCredential(credential);
      const firebaseIdToken = await firebaseUser.user.getIdToken();
      const loggedInUser = await loginWithSocial(firebaseIdToken, 'mobile');
      await auth().signOut();
      if (loggedInUser.required_verification === 'email' && !loggedInUser.can_access_app) {
        router.replace('/(auth)/verify-email');
      } else if (loggedInUser.required_verification === 'phone' && !loggedInUser.can_access_app) {
        router.replace('/(auth)/verify-phone');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('auth.login.socialError'));
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleAppleLogin() {
    if (!isAppleAvailable) {
      setError(t('auth.login.appleUnavailable'));
      return;
    }
    setError('');
    setSocialLoading('apple');
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!appleCredential.identityToken) {
        setError(t('auth.login.socialMissingToken'));
        return;
      }

      const credential = auth.AppleAuthProvider.credential(
        appleCredential.identityToken,
        rawNonce,
      );
      const firebaseUser = await auth().signInWithCredential(credential);
      const firebaseIdToken = await firebaseUser.user.getIdToken();
      const loggedInUser = await loginWithSocial(firebaseIdToken, 'mobile');
      await auth().signOut();

      if (loggedInUser.required_verification === 'email' && !loggedInUser.can_access_app) {
        router.replace('/(auth)/verify-email');
      } else if (loggedInUser.required_verification === 'phone' && !loggedInUser.can_access_app) {
        router.replace('/(auth)/verify-phone');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        setSocialLoading(null);
        return;
      }
      console.error('Apple login error:', e?.code, e?.message, e);
      setError(e instanceof ApiError ? e.message : `${t('auth.login.socialError')} (${e?.code || e?.message || 'unknown'})`);
    } finally {
      setSocialLoading(null);
    }
  }


  const [demoType, setDemoType] = useState<string | null>(null);

  async function handleDemo(type: 'retail' | 'restaurant' | 'enterprise') {
    if (type === 'enterprise') {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Démo Enterprise',
          'Utilisez un ordinateur pour tester pleinement cet outil',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'OK', onPress: () => { void Linking.openURL(ENTERPRISE_DEMO_URL); } },
          ]
        );
        return;
      }
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
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="cube" size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('auth.login.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
          </View>

          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('auth.login.email')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.emailPlaceholder')}
                  placeholderTextColor={colors.textMuted}
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
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
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
                  style={[styles.button, { width: 56, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.primary }]}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <Ionicons name="finger-print" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.orContinue')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.socialButton, socialLoading === 'google' && styles.buttonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading || demoLoading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={colors.primary} />
                  <Text style={styles.socialButtonText}>{t('auth.login.continueGoogle')}</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && isAppleAvailable ? (
              <View style={styles.appleButtonWrapper}>
                {socialLoading === 'apple' ? (
                  <View style={styles.appleLoadingButton}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={BorderRadius.md}
                    style={styles.appleButton}
                    onPress={handleAppleLogin}
                  />
                )}
              </View>
            ) : null}

            

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.login.noAccount')} </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>{t('auth.login.signUp')}</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Text style={styles.demoTitle}>{t('auth.login.tryDemo')}</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[styles.demoButton, { flex: 1 }, demoType === 'retail' && styles.buttonDisabled]}
                onPress={() => handleDemo('retail')}
                disabled={demoLoading || loading}
              >
                {demoType === 'retail' ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="storefront-outline" size={18} color={colors.primary} />
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
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
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
              <Ionicons name="globe-outline" size={18} color={colors.text} />
              <Text style={styles.demoEnterpriseText}>{t('auth.login.demoEnterprise')}</Text>
              <Ionicons name="open-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.demoHint}>{t('auth.login.demoHint')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  subtitle: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
  },
  card: {
    ...glassStyle,
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
    color: colors.danger,
    fontSize: FontSize.sm,
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputIcon: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  eyeBtn: {
    padding: Spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: colors.primary,
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
    borderColor: colors.divider,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberText: {
    color: colors.textSecondary,
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
    backgroundColor: colors.divider,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.sm,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: colors.inputBg,
    marginBottom: Spacing.sm,
  },
  socialButtonText: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  appleButtonWrapper: {
    marginBottom: Spacing.sm,
  },
  appleButton: {
    width: '100%',
    height: 46,
  },
  appleLoadingButton: {
    height: 46,
    borderRadius: BorderRadius.md,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTitle: {
    color: colors.textSecondary,
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
    borderColor: colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: colors.primary + '12',
  },
  demoButtonText: {
    color: colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  demoEnterpriseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: colors.inputBg,
    marginTop: Spacing.sm,
  },
  demoEnterpriseText: {
    color: colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  demoHint: {
    color: colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
