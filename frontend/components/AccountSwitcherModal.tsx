import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '../services/i18n';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRouteForUser } from '../utils/accountRouting';

type AccountSwitcherModalProps = {
  visible: boolean;
  onClose: () => void;
};

function getRoleLabel(role: string): string {
  switch (role) {
    case 'supplier':
      return i18n.t('account_switcher.role_supplier', { defaultValue: 'Fournisseur' });
    case 'staff':
      return i18n.t('account_switcher.role_staff', { defaultValue: 'Employé' });
    case 'superadmin':
      return i18n.t('account_switcher.role_admin', { defaultValue: 'Administration' });
    default:
      return i18n.t('account_switcher.role_merchant', { defaultValue: 'Commerçant' });
  }
}

export default function AccountSwitcherModal({ visible, onClose }: AccountSwitcherModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    user,
    storedAccounts,
    activeAccountId,
    addAccount,
    switchAccount,
    removeStoredAccount,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleAddAccount = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        t('account_switcher.informations_manquantes'),
        t('account_switcher.saisissez_l_adresse_e_mail_et'),
      );
      return;
    }

    setSaving(true);
    try {
      await addAccount(email.trim().toLowerCase(), password);
      setEmail('');
      setPassword('');
      Alert.alert(t('account_switcher.compte_ajoute'), t('account_switcher.ce_compte_est_maintenant_disponible_sur'));
    } catch (error: any) {
      Alert.alert(t('account_switcher.ajout_impossible'), error?.message || t('account_switcher.impossible_d_ajouter_ce_compte_pour'));
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchAccount = async (targetUserId: string) => {
    if (targetUserId === activeAccountId) {
      onClose();
      return;
    }

    setSwitchingId(targetUserId);
    try {
      const nextUser = await switchAccount(targetUserId);
      onClose();
      router.replace(getDefaultRouteForUser(nextUser || null) as any);
    } catch (error: any) {
      Alert.alert(t('account_switcher.bascule_impossible'), error?.message || t('account_switcher.impossible_de_changer_de_compte_pour'));
    } finally {
      setSwitchingId(null);
    }
  };

  const confirmRemoveAccount = (targetUserId: string, accountLabel: string) => {
    const title = 'Retirer ce compte';
    const message = t('account_switcher.ce_compte_sera_retire_de_cet');
    const proceed = async () => {
      try {
        await removeStoredAccount(targetUserId);
        if (targetUserId === activeAccountId) {
          onClose();
        }
      } catch (error: any) {
        Alert.alert(t('account_switcher.retrait_impossible'), error?.message || t('account_switcher.remove_failed', { name: accountLabel }));
      }
    };

    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) {
        void proceed();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: t('common.cancel', 'Annuler'), style: 'cancel' },
      { text: t('account_switcher.retirer'), style: 'destructive', onPress: () => void proceed() },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('account_switcher.comptes_sur_cet_appareil')}</Text>
              <Text style={styles.subtitle}>
                {t('account_switcher.ajoutez_plusieurs_comptes_puis_basculez_rapideme')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('account_switcher.comptes_memorises')}</Text>
              <Text style={styles.helperText}>
                {t('account_switcher.le_changement_de_compte_utilise_les')}
              </Text>

              {storedAccounts.length === 0 ? (
                <Text style={styles.emptyText}>{t('account_switcher.aucun_autre_compte_n_est_encore')}</Text>
              ) : (
                storedAccounts.map((entry) => {
                  const isActive = entry.user.user_id === activeAccountId;
                  const isBusy = switchingId === entry.user.user_id;
                  const label = entry.user.store_name || entry.user.name || entry.user.email;

                  return (
                    <View key={entry.user.user_id} style={[styles.accountCard, isActive && styles.accountCardActive]}>
                      <View style={styles.accountCopy}>
                        <View style={styles.accountHeaderRow}>
                          <Text style={styles.accountTitle}>{label}</Text>
                          <View style={[styles.roleBadge, isActive && styles.roleBadgeActive]}>
                            <Text style={[styles.roleBadgeText, isActive && styles.roleBadgeTextActive]}>
                              {getRoleLabel(entry.user.role)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.accountEmail}>{entry.user.email}</Text>
                        <Text style={styles.accountMeta}>
                          {isActive
                            ? t('account_switcher.active_account')
                            : t('account_switcher.last_used', { date: new Date(entry.last_used_at).toLocaleString(i18n.language) })}
                        </Text>
                      </View>

                      <View style={styles.accountActions}>
                        <TouchableOpacity
                          style={[styles.smallButton, isActive && styles.smallButtonDisabled]}
                          disabled={isActive || isBusy}
                          onPress={() => void handleSwitchAccount(entry.user.user_id)}
                        >
                          {isBusy ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                          ) : (
                            <Text style={[styles.smallButtonText, isActive && styles.smallButtonTextDisabled]}>
                              {isActive ? 'Actif' : 'Basculer'}
                            </Text>
                          )}
                        </TouchableOpacity>
                        {storedAccounts.length > 1 || entry.user.user_id !== user?.user_id ? (
                          <TouchableOpacity
                            style={styles.dangerGhostButton}
                            onPress={() => confirmRemoveAccount(entry.user.user_id, label)}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('account_switcher.ajouter_un_autre_compte')}</Text>
              <Text style={styles.helperText}>
                {t('account_switcher.saisissez_l_adresse_e_mail_et_2')}
              </Text>

              <Text style={styles.label}>{t('account_switcher.adresse_e_mail')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('account_switcher.nom_entreprise_com')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>{t('account_switcher.mot_de_passe')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t('account_switcher.votre_mot_de_passe')}
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                disabled={saving}
                onPress={() => void handleAddAccount()}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{t('account_switcher.ajouter_ce_compte')}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.72)',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      backgroundColor: colors.bgDark,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    header: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    headerCopy: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 6,
    },
    closeButton: {
      padding: 6,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      padding: 20,
      gap: 18,
    },
    section: {
      backgroundColor: colors.glass,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 8,
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 12,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
    },
    accountCard: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.bgMid,
      padding: 14,
      marginTop: 10,
    },
    accountCardActive: {
      borderColor: colors.primary + '66',
      backgroundColor: colors.primary + '14',
    },
    accountCopy: {
      flex: 1,
    },
    accountHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    accountTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    accountEmail: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 4,
    },
    accountMeta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 6,
    },
    accountActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    smallButton: {
      minWidth: 92,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + '55',
      backgroundColor: colors.primary + '12',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    smallButtonDisabled: {
      borderColor: colors.divider,
      backgroundColor: colors.glass,
    },
    smallButtonText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
    smallButtonTextDisabled: {
      color: colors.textMuted,
    },
    dangerGhostButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.danger + '40',
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: colors.bgDark,
      borderWidth: 1,
      borderColor: colors.divider,
    },
    roleBadgeActive: {
      backgroundColor: colors.primary + '16',
      borderColor: colors.primary + '44',
    },
    roleBadgeText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    roleBadgeTextActive: {
      color: colors.primary,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.divider,
      backgroundColor: colors.bgMid,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    primaryButton: {
      marginTop: 16,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    primaryButtonDisabled: {
      opacity: 0.65,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 15,
    },
  });
