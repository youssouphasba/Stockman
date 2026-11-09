import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce, type DenkmaConnection } from '../services/api';

type Props = {
  canEdit: boolean;
  styles: Record<string, any>;
  onFeedback: (message: string, tone?: 'success' | 'error') => void;
};

const CATEGORIES: Array<{ value: 'small' | 'large'; label: string }> = [
  { value: 'small', label: 'Petit colis' },
  { value: 'large', label: 'Gros colis' },
];

// Connexion de la boutique à Denkma Pro : le commerçant autorise Stockman dans son espace Denkma,
// puis ses clients choisissent leur position ou un point relais au moment de commander.
export default function DenkmaSettingsCard({ canEdit, styles, onFeedback }: Props) {
  const { colors } = useTheme();
  const [state, setState] = useState<DenkmaConnection | null>(null);
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState<'small' | 'large'>('small');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await ecommerce.getDenkma();
      setState(next);
      setWeight(String(next.weight_kg ?? 1).replace('.', ','));
      setCategory(next.parcel_category || 'small');
    } catch {
      setState(null);
    }
  }, []);

  // Au retour du navigateur (autorisation dans Denkma Pro), l'état est relu.
  useEffect(() => {
    void load();
    const subscription = AppState.addEventListener('change', (status) => { if (status === 'active') void load(); });
    return () => subscription.remove();
  }, [load]);

  async function connect() {
    setBusy(true);
    try {
      const { url } = await ecommerce.connectDenkma();
      await Linking.openURL(url);
    } catch (error: any) {
      onFeedback(error?.message || "Impossible d'ouvrir Denkma Pro pour le moment.", 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const value = Number(weight.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || value > 1000) {
      onFeedback('Indiquez un poids entre 0,1 et 1 000 kg.', 'error');
      return;
    }
    setBusy(true);
    try {
      setState(await ecommerce.updateDenkmaSettings({ weight_kg: value, parcel_category: category }));
      onFeedback('Réglages de livraison Denkma enregistrés.', 'success');
    } catch (error: any) {
      onFeedback(error?.message || "Impossible d'enregistrer les réglages Denkma.", 'error');
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    Alert.alert('Déconnecter Denkma ?', "Vos clients écriront de nouveau leur adresse. Les livraisons déjà demandées continuent. Révoquez aussi l'accès dans Mes boutiques de Denkma Pro si vous ne l'utilisez plus.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await ecommerce.disconnectDenkma();
            await load();
            onFeedback('Denkma est déconnecté.', 'success');
          } catch (error: any) {
            onFeedback(error?.message || 'Impossible de déconnecter Denkma.', 'error');
          }
        },
      },
    ]);
  }

  const text = { color: colors.text, fontSize: FontSize.sm, lineHeight: 20 };
  const muted = styles.settingDesc;

  return (
    <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
      <Text style={styles.settingLabel}>Livraison Denkma</Text>
      {!state?.connected ? (
        <>
          <Text style={muted}>Faites livrer vos commandes en ligne par Denkma : vos clients indiquent leur position sur une carte ou choisissent un point relais, au lieu d'écrire une adresse. Le prix exact de la livraison s'ajoute à leur commande.</Text>
          <Text style={muted}>Il faut un compte Denkma Pro approuvé, avec votre point de collecte confirmé et votre compte transport rechargé.</Text>
          {canEdit && (
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void connect()} style={[styles.syncButton, { flex: 0, minHeight: 48, backgroundColor: '#2563EB15', borderColor: '#2563EB40' }]}>
              <Ionicons name="bicycle-outline" size={18} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontSize: FontSize.sm, fontWeight: '700' }}>{busy ? 'Ouverture...' : 'Connecter Denkma Pro'}</Text>
            </TouchableOpacity>
          )}
          {canEdit && <Text style={muted}>Vous autorisez Stockman dans votre espace Denkma Pro, puis revenez ici.</Text>}
        </>
      ) : (
        <>
          <View style={{ borderLeftWidth: 4, borderLeftColor: state.problem ? colors.warning : colors.success, backgroundColor: (state.problem ? colors.warning : colors.success) + '14', borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4 }}>
            <Text style={[text, { fontWeight: '700' }]}>Denkma est connecté{state.key_hint ? ` (clé …${state.key_hint})` : ''}</Text>
            <Text style={muted}>{state.problem || (state.transport_open === false ? 'Le service de livraison Denkma Pro est fermé pour votre commerce.' : 'Vos clients choisissent leur position ou un point relais Denkma au moment de commander.')}</Text>
          </View>
          {canEdit && (
            <>
              <Text style={[text, { fontWeight: '600' }]}>Colis habituel</Text>
              <Text style={muted}>Sert au calcul du prix de livraison. Les gros colis ne vont pas en point relais.</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {CATEGORIES.map((item) => {
                  const active = category === item.value;
                  return (
                    <TouchableOpacity key={item.value} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setCategory(item.value)} style={[styles.chip, { marginRight: 0, minHeight: 44, justifyContent: 'center' }, active && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.chipText, active && { color: colors.primary }]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" accessibilityLabel="Poids habituel d'un colis en kilos" placeholder="Poids en kg" placeholderTextColor={colors.textMuted} />
                <Text style={text}>kg</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.syncButton, { flex: 0, minHeight: 48, backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' }}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={disconnect} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: FontSize.sm, fontWeight: '600' }}>Déconnecter Denkma</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}
