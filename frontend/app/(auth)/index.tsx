import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ApiError, demo as demoApi, setToken, setRefreshToken } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

const ENTERPRISE_DEMO_URL = 'https://stockman.pro/demo?type=enterprise';

export default function AuthEntryScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const { restoreSession } = useAuth();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoType, setDemoType] = useState<string | null>(null);
  const [error, setError] = useState('');
  const styles = React.useMemo(() => createStyles(colors, glassStyle), [colors, glassStyle]);

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
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>Pilotez votre commerce avec Stockman</Text>
          <Text style={styles.subtitle}>Stocks, ventes, commandes et fournisseurs : tout au même endroit.</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={[styles.cta, styles.ctaPrimary]}>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.ctaPrimaryText}>{t('auth.login.signIn')}</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={[styles.cta, styles.ctaSecondary]}>
              <Ionicons name="person-add-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.ctaSecondaryText}>Créer mon compte gratuit</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>{t('auth.login.tryDemo')}</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity
                style={[styles.demoBtn, demoLoading && demoType === 'retail' && styles.demoBtnDisabled]}
                disabled={demoLoading}
                onPress={() => handleDemo('retail')}
              >
                {demoLoading && demoType === 'retail' ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.demoBtnText}>{t('auth.login.demoRetail')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.demoBtn, demoLoading && demoType === 'restaurant' && styles.demoBtnDisabled]}
                disabled={demoLoading}
                onPress={() => handleDemo('restaurant')}
              >
                {demoLoading && demoType === 'restaurant' ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.demoBtnText}>{t('auth.login.demoRestaurant')}</Text>
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoEnterpriseBtn]}
              disabled={demoLoading}
              onPress={() => handleDemo('enterprise')}
            >
              <Text style={styles.demoBtnText}>{t('auth.login.demoEnterprise')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (colors: any, glassStyle: any) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    container: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
      gap: Spacing.xl,
    },
    hero: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: FontSize.md,
      textAlign: 'center',
    },
    card: {
      ...glassStyle,
      padding: Spacing.lg,
      gap: Spacing.md,
      borderRadius: BorderRadius.xl,
    },
    cta: {
      minHeight: 54,
      borderRadius: BorderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    ctaPrimary: {
      backgroundColor: colors.primary,
    },
    ctaSecondary: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.primary + '66',
    },
    ctaPrimaryText: {
      color: '#fff',
      fontSize: FontSize.md,
      fontWeight: '800',
    },
    ctaSecondaryText: {
      color: colors.primaryLight,
      fontSize: FontSize.md,
      fontWeight: '800',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239,68,68,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.35)',
      borderRadius: 14,
      padding: 10,
    },
    errorText: {
      color: colors.danger,
      marginLeft: 8,
      flex: 1,
      fontSize: FontSize.sm,
    },
    demoSection: {
      marginTop: Spacing.xs,
      gap: Spacing.sm,
    },
    demoTitle: {
      color: colors.textSecondary,
      fontSize: FontSize.sm,
      textAlign: 'center',
      fontWeight: '700',
    },
    demoRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    demoBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      backgroundColor: colors.glass,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    demoEnterpriseBtn: {
      flex: 0,
    },
    demoBtnText: {
      color: colors.text,
      fontSize: FontSize.sm,
      fontWeight: '700',
      textAlign: 'center',
    },
    demoBtnDisabled: {
      opacity: 0.7,
    },
  });
