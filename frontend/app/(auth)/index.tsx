import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Modal, TextInput, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ApiError, demo as demoApi, setToken, setRefreshToken } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import { DEMO_COUNTRIES, DemoCountry } from '../../data/demoCurrencies';

const ENTERPRISE_DEMO_URL = 'https://stockman.pro/demo?type=enterprise';

export default function AuthEntryScreen() {
  const { t } = useTranslation();
  const { colors, glassStyle, isDark, setTheme } = useTheme();
  const { restoreSession } = useAuth();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoType, setDemoType] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [pendingDemoType, setPendingDemoType] = useState<'retail' | 'restaurant' | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const primaryCtaContentColor = isDark ? '#fff' : colors.text;
  const styles = React.useMemo(() => createStyles(colors, glassStyle, isDark), [colors, glassStyle, isDark]);

  function toggleThemeQuick() {
    void setTheme(isDark ? 'light' : 'dark');
  }

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return DEMO_COUNTRIES;
    return DEMO_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.currencyLabel.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  async function launchDemoWithCountry(type: 'retail' | 'restaurant', country: DemoCountry) {
    setShowCountryPicker(false);
    setCountrySearch('');
    setPendingDemoType(null);
    setError('');
    setDemoType(type);
    setDemoLoading(true);
    try {
      const res = await demoApi.createSession(type, country.code);
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

  function handleDemo(type: 'retail' | 'restaurant' | 'enterprise') {
    if (type === 'enterprise') {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Démo Enterprise',
          'Utilisez un ordinateur pour tester pleinement cet outil.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'OK', onPress: () => { void Linking.openURL(ENTERPRISE_DEMO_URL); } },
          ]
        );
        return;
      }
      void Linking.openURL(ENTERPRISE_DEMO_URL);
      return;
    }
    setPendingDemoType(type);
    setShowCountryPicker(true);
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.themeButton} onPress={toggleThemeQuick} activeOpacity={0.85}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
        </TouchableOpacity>
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
              <Ionicons name="log-in-outline" size={20} color={primaryCtaContentColor} />
              <Text style={[styles.ctaPrimaryText, { color: primaryCtaContentColor }]}>{t('auth.login.signIn')}</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={[styles.cta, styles.ctaSecondary]}>
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
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

      {showCountryPicker && pendingDemoType && (
        <Modal transparent animationType="slide" visible onRequestClose={() => { setShowCountryPicker(false); setCountrySearch(''); }}>
          <View style={pickerStyles.overlay}>
            <View style={[pickerStyles.sheet, { backgroundColor: colors.background }]}>
              <View style={[pickerStyles.header, { borderBottomColor: colors.glassBorder }]}>
                <Text style={[pickerStyles.title, { color: colors.text }]}>Choisissez votre pays</Text>
                <Text style={[pickerStyles.subtitle, { color: colors.textMuted }]}>La démo utilisera votre devise locale.</Text>
              </View>
              <View style={[pickerStyles.searchWrap, { borderBottomColor: colors.glassBorder }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[pickerStyles.searchInput, { color: colors.text }]}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                  placeholder="Pays ou devise…"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>
              <FlatList
                data={filteredCountries}
                keyExtractor={item => item.code}
                style={pickerStyles.list}
                contentContainerStyle={pickerStyles.listContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={[pickerStyles.emptyText, { color: colors.textMuted }]}>
                    Aucun pays ne correspond à votre recherche.
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={pickerStyles.row}
                    onPress={() => void launchDemoWithCountry(pendingDemoType, item)}
                    activeOpacity={0.7}
                  >
                    <Text style={pickerStyles.flag}>{item.flag}</Text>
                    <Text style={[pickerStyles.countryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[pickerStyles.currencyBadge, { color: colors.primary }]}>{item.currencyLabel}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={[pickerStyles.cancelBtn, { borderColor: colors.glassBorder }]}
                onPress={() => { setShowCountryPicker(false); setCountrySearch(''); }}
              >
                <Text style={[pickerStyles.cancelText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '80%',
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 6,
  },
  flag: {
    fontSize: 22,
    width: 30,
  },
  countryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  currencyBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 14,
    textAlign: 'center',
  },
});

const createStyles = (colors: any, glassStyle: any, isDark: boolean) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    container: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
      gap: Spacing.xl,
    },
    themeButton: {
      position: 'absolute',
      top: 56,
      right: Spacing.lg,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    hero: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.glass,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    title: {
      color: colors.text,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: 0.4,
      textAlign: 'center',
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
      borderWidth: 1,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: isDark ? 0.28 : 0.18,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    ctaSecondary: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: `${colors.primary}66`,
    },
    ctaPrimaryText: {
      color: isDark ? '#fff' : colors.text,
      fontSize: FontSize.md,
      fontWeight: '800',
    },
    ctaSecondaryText: {
      color: colors.primary,
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
