import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce, type DenkmaConnection } from '../services/api';
import DenkmaSignupModal from './DenkmaSignupModal';
import { DENKMA_PRO_WEB_URL, denkmaAppUrl } from '../utils/denkmaSignup';
import { useTranslation } from 'react-i18next';
import i18n from '../services/i18n';

type Props = {
  canEdit: boolean;
  styles: Record<string, any>;
  onFeedback: (message: string, tone?: 'success' | 'error') => void;
};

const CATEGORIES: Array<{ value: 'small' | 'large'; label: string }> = [
  { value: 'small', get label() { return i18n.t('denkma_settings.petit_colis', { defaultValue: "Petit colis" }); } },
  { value: 'large', get label() { return i18n.t('denkma_settings.gros_colis', { defaultValue: "Gros colis" }); } },
];

// Livraison Denkma de la boutique : le commerçant crée son compte Denkma Pro depuis Stockman (ou
// connecte celui qu'il a déjà), puis ses clients choisissent leur position ou un point relais.
export default function DenkmaSettingsCard({ canEdit, styles, onFeedback }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [signingUp, setSigningUp] = useState(false);
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
      onFeedback(error?.message || t('denkma_settings.impossible_d_ouvrir_denkma_pro_pour'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function openLink(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      onFeedback(t('denkma_settings.impossible_d_ouvrir_ce_lien_pour'), 'error');
    }
  }

  async function save() {
    const value = Number(weight.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || value > 1000) {
      onFeedback(t('denkma_settings.indiquez_un_poids_entre_0_1'), 'error');
      return;
    }
    setBusy(true);
    try {
      setState(await ecommerce.updateDenkmaSettings({ weight_kg: value, parcel_category: category }));
      onFeedback(t('denkma_settings.reglages_de_livraison_denkma_enregistres'), 'success');
    } catch (error: any) {
      onFeedback(error?.message || t('denkma_settings.impossible_d_enregistrer_les_reglages_denkma'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    Alert.alert(t('denkma_settings.deconnecter_denkma'), t('denkma_settings.vos_clients_ecriront_de_nouveau_leur'), [
      { text: t('denkma_settings.annuler'), style: 'cancel' },
      {
        text: t('denkma_settings.deconnecter'),
        style: 'destructive',
        onPress: async () => {
          try {
            await ecommerce.disconnectDenkma();
            await load();
            onFeedback(t('denkma_settings.denkma_est_deconnecte'), 'success');
          } catch (error: any) {
            onFeedback(error?.message || t('denkma_settings.impossible_de_deconnecter_denkma'), 'error');
          }
        },
      },
    ]);
  }

  function created(next: DenkmaConnection) {
    setSigningUp(false);
    setState(next);
    onFeedback(t('denkma_settings.votre_compte_denkma_pro_est_cree'), 'success');
  }

  const text = { color: colors.text, fontSize: FontSize.sm, lineHeight: 20 };
  const muted = styles.settingDesc;
  const tone = state?.validation_pending || state?.problem || state?.transport_open === false ? colors.warning : colors.success;

  // Denkma livre au Sénégal : la carte n'est pas proposée aux autres commerces.
  if (state?.available === false && !state.connected) return null;

  return (
    <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
      <Text style={styles.settingLabel}>{t('denkma_settings.livraison_denkma')}</Text>
      {!state?.connected ? (
        <>
          <Text style={muted}>{t('denkma_settings.faites_livrer_vos_commandes_en_ligne')}</Text>
          {state?.signup_available ? (
            <Text style={muted}>{t('denkma_settings.pas_encore_de_compte_denkma_pro')}</Text>
          ) : (
            <Text style={muted}>{t('denkma_settings.il_faut_un_compte_denkma_pro')}</Text>
          )}
          {canEdit && state?.signup_available && (
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => setSigningUp(true)} style={[styles.syncButton, { flex: 0, minHeight: 48, backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '700' }}>{t('denkma_settings.creer_mon_compte_denkma_pro')}</Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void connect()} style={[styles.syncButton, { flex: 0, minHeight: 48, backgroundColor: '#2563EB15', borderColor: '#2563EB40' }]}>
              <Ionicons name="bicycle-outline" size={18} color="#2563EB" />
              <Text style={{ color: '#2563EB', fontSize: FontSize.sm, fontWeight: '700' }}>{busy ? t('denkma_settings.opening') : state?.signup_available ? t('denkma_settings.j_ai_deja_un_compte_denkma') : t('denkma_settings.connect_denkma_pro')}</Text>
            </TouchableOpacity>
          )}
          {canEdit && <Text style={muted}>{t('denkma_settings.avec_un_compte_existant_vous_autorisez')}</Text>}
          {signingUp && (
            <DenkmaSignupModal
              initialBusinessName={user?.store_name || ''}
              initialOwnerName={user?.name || ''}
              initialPhone={user?.phone || ''}
              onClose={() => setSigningUp(false)}
              onCreated={created}
            />
          )}
        </>
      ) : (
        <>
          <View style={{ borderLeftWidth: 4, borderLeftColor: tone, backgroundColor: tone + '14', borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4 }}>
            <Text style={[text, { fontWeight: '700' }]}>{state.validation_pending ? t('denkma_settings.compte_denkma_pro_en_attente_de') : (state.key_hint ? t('denkma_settings.connected_with_key', { hint: state.key_hint }) : t('denkma_settings.connected'))}</Text>
            <Text style={muted}>{state.problem || (state.transport_open === false ? t('denkma_settings.le_service_de_livraison_denkma_pro') : t('denkma_settings.vos_clients_choisissent_leur_position_ou'))}</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: '#2563EB40', backgroundColor: '#2563EB0D', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm }}>
            <Text style={[text, { fontWeight: '700' }]}>{t('denkma_settings.gerez_vos_livraisons_dans_l_application')}</Text>
            <Text style={muted}>{t('denkma_settings.connectez_vous_avec_le_numero_et')}</Text>
            <TouchableOpacity accessibilityRole="link" onPress={() => void openLink(denkmaAppUrl(Platform.OS))} style={[styles.syncButton, { flex: 0, minHeight: 48, backgroundColor: '#2563EB', borderColor: '#2563EB' }]}>
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '700' }}>{t('denkma_settings.telecharger_l_application_denkma')}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="link" onPress={() => void openLink(DENKMA_PRO_WEB_URL)} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center' }}>
              <Text style={{ color: '#2563EB', fontSize: FontSize.sm, fontWeight: '600' }}>{t('denkma_settings.ou_ouvrir_denkma_pro_sur_le')}</Text>
            </TouchableOpacity>
          </View>
          {canEdit && (
            <>
              <Text style={[text, { fontWeight: '600' }]}>{t('denkma_settings.colis_habituel')}</Text>
              <Text style={muted}>{t('denkma_settings.sert_au_calcul_du_prix_de')}</Text>
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
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" accessibilityLabel={t('denkma_settings.poids_habituel_d_un_colis_en')} placeholder={t('denkma_settings.poids_en_kg')} placeholderTextColor={colors.textMuted} />
                <Text style={text}>{t('denkma_settings.kg')}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.syncButton, { flex: 0, minHeight: 48, backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' }}>{t('denkma_settings.enregistrer')}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" onPress={disconnect} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: FontSize.sm, fontWeight: '600' }}>{t('denkma_settings.deconnecter_denkma_2')}</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}
