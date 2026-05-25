import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { appVersion, AppVersionSettings } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

type VersionState = {
  loading: boolean;
  blocking: boolean;
  suggested: boolean;
  settings: AppVersionSettings | null;
};

const DISMISSED_UPDATE_KEY = 'dismissed_app_update_version';
const REQUIRED_UPDATE_TITLE = 'Mise \u00e0 jour requise';
const UPDATE_ACTION_LABEL = 'Mettre \u00e0 jour';
const UPDATE_MESSAGE_FALLBACK = 'Une nouvelle version est disponible.';
const SUGGESTED_UPDATE_TITLE = 'Nouvelle version disponible';

function normalizeVersion(version?: string | null) {
  return String(version || '0.0.0')
    .split(/[.-]/)
    .map((part) => {
      const value = Number.parseInt(part.replace(/\D/g, ''), 10);
      return Number.isFinite(value) ? value : 0;
    });
}

function compareVersions(current: string, target: string) {
  const left = normalizeVersion(current);
  const right = normalizeVersion(target);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index] || 0;
    const rightPart = right[index] || 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }
  return 0;
}

function getInstalledVersion() {
  return (Constants as any).nativeAppVersion || Constants.expoConfig?.version || '0.0.0';
}

function getAndroidPackage() {
  return Constants.expoConfig?.android?.package || 'com.youssouphasba.stockman';
}

export default function AppVersionGate({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const [state, setState] = useState<VersionState>({
    loading: Platform.OS !== 'web',
    blocking: false,
    suggested: false,
    settings: null,
  });

  const installedVersion = useMemo(() => getInstalledVersion(), []);

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      if (Platform.OS === 'web') {
        setState({ loading: false, blocking: false, suggested: false, settings: null });
        return;
      }

      try {
        const settings = await appVersion.get();
        const latestVersion = Platform.OS === 'ios' ? settings.ios_latest_version : settings.android_latest_version;
        const minVersion = Platform.OS === 'ios' ? settings.ios_min_version : settings.android_min_version;
        const belowMinVersion = compareVersions(installedVersion, minVersion) < 0;
        const belowLatestVersion = compareVersions(installedVersion, latestVersion) < 0;
        const blocking = belowMinVersion || (settings.force_update && belowLatestVersion);
        const dismissedVersion = await AsyncStorage.getItem(DISMISSED_UPDATE_KEY);
        const suggested = !blocking && belowLatestVersion && dismissedVersion !== latestVersion;

        if (mounted) {
          setState({ loading: false, blocking, suggested, settings });
        }
      } catch {
        if (mounted) {
          setState({ loading: false, blocking: false, suggested: false, settings: null });
        }
      }
    }

    checkVersion();
    return () => {
      mounted = false;
    };
  }, [installedVersion]);

  async function openStore() {
    const settings = state.settings;
    const fallbackUrl =
      Platform.OS === 'ios'
        ? settings?.ios_update_url || Constants.expoConfig?.extra?.mobileAppUrl || 'https://stockman.pro/app'
        : settings?.android_update_url || `https://play.google.com/store/apps/details?id=${getAndroidPackage()}`;
    const primaryUrl = Platform.OS === 'android' ? `market://details?id=${getAndroidPackage()}` : fallbackUrl;

    try {
      await Linking.openURL(primaryUrl);
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  }

  async function dismissSuggestion() {
    const latestVersion = Platform.OS === 'ios' ? state.settings?.ios_latest_version : state.settings?.android_latest_version;
    if (latestVersion) {
      await AsyncStorage.setItem(DISMISSED_UPDATE_KEY, latestVersion);
    }
    setState((current) => ({ ...current, suggested: false }));
  }

  if (state.loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgDark }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.blocking) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgDark }]}>
        <View style={[styles.blockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{REQUIRED_UPDATE_TITLE}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {state.settings?.message || UPDATE_MESSAGE_FALLBACK}
          </Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={openStore}>
            <Text style={styles.primaryButtonText}>{UPDATE_ACTION_LABEL}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      {children}
      <Modal transparent visible={state.suggested} animationType="fade" onRequestClose={dismissSuggestion}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{SUGGESTED_UPDATE_TITLE}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {state.settings?.message || UPDATE_MESSAGE_FALLBACK}
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={dismissSuggestion}>
                <Text style={[styles.secondaryButtonText, { color: isDark ? colors.text : colors.textSecondary }]}>Plus tard</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]} onPress={openStore}>
                <Text style={styles.primaryButtonText}>{UPDATE_ACTION_LABEL}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  blockCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalPrimaryButton: {
    flex: 1,
  },
});
