import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { appVersion, AppVersionSettings } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import KeyboardOverlay from './KeyboardOverlay';

type VersionState = {
  blocking: boolean;
  suggested: boolean;
  settings: AppVersionSettings | null;
  dismissalKey: string | null;
};

function normalizeVersion(version: string) {
  return version
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

function getInstalledVersion(): string | null {
  const version = (Constants as any).nativeAppVersion || Constants.expoConfig?.version;
  return typeof version === 'string' && version.trim() ? version : null;
}

function getAndroidPackage() {
  return Constants.expoConfig?.android?.package || 'com.youssouphasba.stockman';
}

function getIosStoreUrl() {
  const appStoreId = String(Constants.expoConfig?.ios?.infoPlist?.AppStoreID || '6760587628');
  return `https://apps.apple.com/app/id${appStoreId}`;
}

export default function AppVersionGate({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [state, setState] = useState<VersionState>({
    blocking: false,
    suggested: false,
    settings: null,
    dismissalKey: null,
  });
  const checking = useRef(false);
  const installedVersion = useMemo(() => getInstalledVersion(), []);

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      if (Platform.OS === 'web' || checking.current) return;
      checking.current = true;

      try {
        const settingsPromise = appVersion.get().catch(() => null);
        let storeUpdate: { updateAvailable?: boolean; storeVersion?: string | number | null } | null = null;

        // Sur iOS, le module natif 0.10 embarqué dans la build 1.0.26 fait planter l'app au retour de la
        // vérification App Store : la version App Store y est fournie par le serveur (recherche iTunes).
        if (Platform.OS === 'android') {
          try {
            const nativeUpdates = await import('expo-in-app-updates');
            storeUpdate = await nativeUpdates.checkForUpdate();
          } catch {
            storeUpdate = null;
          }
        }

        const settings = await settingsPromise;
        if (!mounted) return;
        if (settings?.enabled === false) {
          setState({ blocking: false, suggested: false, settings, dismissalKey: null });
          return;
        }

        // Deux sources : le store (quand il répond) et la version annoncée depuis l'administration.
        const announcedVersion = Platform.OS === 'ios' ? settings?.ios_latest_version : settings?.android_latest_version;
        const announcedNewer = Boolean(
          announcedVersion && installedVersion && compareVersions(installedVersion, announcedVersion) < 0,
        );
        const storeNewer = storeUpdate?.updateAvailable === true;
        if (!announcedNewer && !storeNewer) {
          setState({ blocking: false, suggested: false, settings, dismissalKey: null });
          return;
        }

        const minVersion = Platform.OS === 'ios' ? settings?.ios_min_version : settings?.android_min_version;
        const belowMinimum = Boolean(
          minVersion && installedVersion && compareVersions(installedVersion, minVersion) < 0,
        );
        const blocking = belowMinimum || settings?.force_update === true;
        const storeVersion = announcedNewer
          ? String(announcedVersion)
          : String(storeUpdate?.storeVersion || 'in-progress');
        const dismissalKey = `dismissed_app_update_version:${Platform.OS}:${storeVersion}`;
        const dismissed = await AsyncStorage.getItem(dismissalKey);

        if (mounted) {
          setState({ blocking, suggested: !blocking && dismissed !== 'true', settings, dismissalKey });
        }
      } catch {
        if (mounted) setState({ blocking: false, suggested: false, settings: null, dismissalKey: null });
      } finally {
        checking.current = false;
      }
    }

    void checkVersion();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void checkVersion();
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [installedVersion]);

  async function openStore() {
    const fallbackUrl =
      Platform.OS === 'ios'
        ? state.settings?.ios_update_url || getIosStoreUrl()
        : state.settings?.android_update_url || `https://play.google.com/store/apps/details?id=${getAndroidPackage()}`;
    const primaryUrl = Platform.OS === 'android' ? `market://details?id=${getAndroidPackage()}` : fallbackUrl;

    try {
      await Linking.openURL(primaryUrl);
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  }

  async function dismissSuggestion() {
    if (state.dismissalKey) await AsyncStorage.setItem(state.dismissalKey, 'true');
    setState((current) => ({ ...current, suggested: false }));
  }

  if (state.blocking) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bgDark }]}>
        <View style={[styles.blockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('app_update.required_title')}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {state.settings?.message || t('app_update.message')}
          </Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={openStore}>
            <Text style={styles.primaryButtonText}>{t('app_update.update_action')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      {children}
      {state.suggested && (
      <Modal transparent visible animationType="fade" onRequestClose={dismissSuggestion}>
        <KeyboardOverlay style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('app_update.available_title')}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {state.settings?.message || t('app_update.message')}
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={dismissSuggestion}>
                <Text style={[styles.secondaryButtonText, { color: isDark ? colors.text : colors.textSecondary }]}>
                  {t('app_update.later_action')}
                </Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]} onPress={openStore}>
                <Text style={styles.primaryButtonText}>{t('app_update.update_action')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardOverlay>
      </Modal>
      )}
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
