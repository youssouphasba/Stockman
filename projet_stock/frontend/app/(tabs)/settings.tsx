import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { settings as settingsApi, UserSettings } from '../../services/api';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsScreen() {
  const { colors, glassStyle, isDark, setTheme } = useTheme();
  const styles = getStyles(colors, glassStyle);
  const { user, logout } = useAuth();
  const [settingsData, setSettingsData] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const result = await settingsApi.get();
      setSettingsData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  async function toggleModule(key: string) {
    if (!settingsData) return;
    const newModules = { ...settingsData.modules, [key]: !settingsData.modules[key] };
    try {
      const updated = await settingsApi.update({ modules: newModules });
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  async function toggleSimpleMode() {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({ simple_mode: !settingsData.simple_mode });
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  async function toggleNotifications() {
    if (!settingsData) return;
    try {
      const updated = await settingsApi.update({ push_notifications: !settingsData.push_notifications });
      setSettingsData(updated);
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    RNAlert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ]
    );
  }

  const moduleLabels: Record<string, string> = {
    stock_management: 'Gestion de stock',
    alerts: 'Alertes',
    rules: 'Règles d\'alerte',
    statistics: 'Statistiques',
    history: 'Historique',
    export: 'Export',
  };

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.gradient}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Paramètres</Text>

        {/* User info */}
        <View style={styles.card}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* App settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Application</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mode Nuit</Text>
              <Text style={styles.settingDesc}>Basculer entre thème clair et sombre</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => setTheme(val ? 'dark' : 'light')}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Mode simplifié</Text>
              <Text style={styles.settingDesc}>Interface allégée pour débutants</Text>
            </View>
            <Switch
              value={settingsData?.simple_mode ?? true}
              onValueChange={toggleSimpleMode}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={settingsData?.simple_mode ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications push</Text>
              <Text style={styles.settingDesc}>Recevoir les alertes de stock</Text>
            </View>
            <Switch
              value={settingsData?.push_notifications ?? true}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.divider, true: colors.primary + '60' }}
              thumbColor={settingsData?.push_notifications ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Modules */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Modules actifs</Text>
          {settingsData && Object.entries(settingsData.modules).map(([key, enabled]) => (
            <View key={key} style={styles.settingRow}>
              <Text style={styles.settingLabel}>{moduleLabels[key] ?? key}</Text>
              <Switch
                value={enabled}
                onValueChange={() => toggleModule(key)}
                trackColor={{ false: colors.divider, true: colors.primary + '60' }}
                thumbColor={enabled ? colors.primary : colors.textMuted}
              />
            </View>
          ))}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Langue</Text>
            <Text style={styles.aboutValue}>Français</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </LinearGradient>
  );
}

const getStyles = (colors: any, glassStyle: any) => StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingTop: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.lg,
  },
  card: {
    ...glassStyle,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: Spacing.md,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontSize: FontSize.md,
    color: colors.text,
  },
  settingDesc: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  aboutLabel: {
    fontSize: FontSize.md,
    color: colors.textSecondary,
  },
  aboutValue: {
    fontSize: FontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...glassStyle,
    borderColor: colors.danger + '30',
    padding: Spacing.md,
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: colors.danger,
  },
});
