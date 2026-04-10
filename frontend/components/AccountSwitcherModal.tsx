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
      return 'Fournisseur';
    case 'staff':
      return 'Staff';
    case 'superadmin':
      return 'Administration';
    default:
      return 'Commercant';
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
        'Informations manquantes',
        "Saisissez l'adresse e-mail et le mot de passe du compte a ajouter.",
      );
      return;
    }

    setSaving(true);
    try {
      await addAccount(email.trim().toLowerCase(), password);
      setEmail('');
      setPassword('');
      Alert.alert('Compte ajoute', 'Ce compte est maintenant disponible sur cet appareil.');
    } catch (error: any) {
      Alert.alert('Ajout impossible', error?.message || "Impossible d'ajouter ce compte pour le moment.");
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
      Alert.alert('Bascule impossible', error?.message || 'Impossible de changer de compte pour le moment.');
    } finally {
      setSwitchingId(null);
    }
  };

  const confirmRemoveAccount = (targetUserId: string, accountLabel: string) => {
    const title = 'Retirer ce compte';
    const message = "Ce compte sera retire de cet appareil. Vous pourrez le reconnecter plus tard avec son adresse e-mail et son mot de passe.";
    const proceed = async () => {
      try {
        await removeStoredAccount(targetUserId);
        if (targetUserId === activeAccountId) {
          onClose();
        }
      } catch (error: any) {
        Alert.alert('Retrait impossible', error?.message || `Impossible de retirer ${accountLabel} de cet appareil.`);
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
      { text: 'Retirer', style: 'destructive', onPress: () => void proceed() },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Comptes sur cet appareil</Text>
              <Text style={styles.subtitle}>
                Ajoutez plusieurs comptes, puis basculez rapidement de l&apos;un a l&apos;autre sans vous reconnecter a chaque fois.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comptes memorises</Text>
              <Text style={styles.helperText}>
                Le changement de compte utilise les sessions deja enregistrees sur ce telephone.
              </Text>

              {storedAccounts.length === 0 ? (
                <Text style={styles.emptyText}>Aucun autre compte n&apos;est encore enregistre sur cet appareil.</Text>
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
                            ? 'Compte actif'
                            : `Derniere utilisation : ${new Date(entry.last_used_at).toLocaleString()}`}
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
              <Text style={styles.sectionTitle}>Ajouter un autre compte</Text>
              <Text style={styles.helperText}>
                Saisissez l&apos;adresse e-mail et le mot de passe du compte fournisseur, commercant ou staff a memoriser sur ce telephone.
              </Text>

              <Text style={styles.label}>Adresse e-mail</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="nom@entreprise.com"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Votre mot de passe"
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                disabled={saving}
                onPress={() => void handleAddAccount()}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Ajouter ce compte</Text>}
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
