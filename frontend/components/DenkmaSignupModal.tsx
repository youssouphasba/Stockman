import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce, type DenkmaConnection } from '../services/api';
import { clearPhoneVerificationState, confirmPhoneCode, sendPhoneVerification } from '../services/firebasePhoneAuth';
import { accuracyProblem, denkmaPhone, signupProblem } from '../utils/denkmaSignup';
import { useTranslation } from 'react-i18next';
import i18n from '../services/i18n';

type Props = {
  initialBusinessName?: string;
  initialOwnerName?: string;
  initialPhone?: string;
  onClose: () => void;
  onCreated: (state: DenkmaConnection) => void;
};

type Pin = { lat: number; lng: number; accuracy: number | null };

const TERMS_URL = 'https://denkma.com/terms/';
const PRIVACY_URL = 'https://denkma.com/privacy/';

function smsError(error: any): string {
  const code = String(error?.code || '');
  const tr = (key: string, fallback: string) => i18n.t(`denkma_signup.${key}`, { defaultValue: fallback });
  if (code.includes('invalid-verification-code')) return tr('sms_invalid_code', 'Code incorrect. Vérifiez le SMS reçu et réessayez.');
  if (code.includes('code-expired') || code.includes('session-expired')) return tr('sms_code_expired', 'Ce code a expiré. Demandez un nouveau SMS.');
  if (code.includes('too-many-requests')) return tr('sms_too_many', 'Trop de tentatives. Patientez quelques minutes avant de redemander un code.');
  if (code.includes('invalid-phone-number')) return tr('sms_invalid_phone', 'Ce numéro de téléphone est invalide.');
  if (code.includes('network')) return tr('sms_network', 'Pas de connexion internet. Vérifiez votre réseau et réessayez.');
  return error?.message || tr('sms_failed', 'L’envoi du SMS a échoué. Réessayez.');
}

const DENKMA_PHONE_SCOPE = 'denkma-signup';

// Création du compte Denkma Pro sans quitter Stockman : le commerçant renseigne son commerce,
// localise son point de collecte, choisit son code PIN Denkma et confirme son numéro par SMS.
// Le compte est ensuite validé par Denkma avant la première expédition.
// À afficher seulement quand il est ouvert ({open && <DenkmaSignupModal />}).
export default function DenkmaSignupModal({ initialBusinessName, initialOwnerName, initialPhone, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [subtype, setSubtype] = useState<'merchant' | 'enterprise'>('merchant');
  const [businessName, setBusinessName] = useState(initialBusinessName || '');
  const [ownerName, setOwnerName] = useState(initialOwnerName || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [pin, setPin] = useState('');
  const [pinConfirmation, setPinConfirmation] = useState('');
  const [label, setLabel] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [position, setPosition] = useState<Pin | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [locating, setLocating] = useState(false);
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locate() {
    setError(null);
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(t('denkma_signup.autorisez_la_localisation_pour_enregistrer_votre'));
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const next = { lat: current.coords.latitude, lng: current.coords.longitude, accuracy: current.coords.accuracy ?? null };
      setPosition(next);
      // Le quartier et la ville sont proposés à partir de la position ; le commerçant peut les corriger.
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: next.lat, longitude: next.lng });
        if (place) {
          if (!city.trim() && place.city) setCity(place.city);
          if (!district.trim() && (place.district || place.subregion)) setDistrict(place.district || place.subregion || '');
        }
      } catch {
        // Sans adresse proposée, le commerçant saisit la ville lui-même.
      }
    } catch {
      setError(t('denkma_signup.impossible_de_vous_localiser_activez_la'));
    } finally {
      setLocating(false);
    }
  }

  async function sendCode() {
    const problem = signupProblem({ businessName, ownerName, phone, pin, pinConfirmation, label, city,
      accuracy: position?.accuracy ?? null, located: !!position, acceptedLegal });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendPhoneVerification(denkmaPhone(phone) as string, DENKMA_PHONE_SCOPE, step === 'code');
      setCode('');
      setStep('code');
    } catch (err: any) {
      setError(smsError(err));
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!position || code.trim().length < 6) {
      setError(t('denkma_signup.saisissez_le_code_a_6_chiffres'));
      return;
    }
    setBusy(true);
    setError(null);
    let proof: string;
    try {
      proof = await confirmPhoneCode(code.trim(), denkmaPhone(phone) as string, DENKMA_PHONE_SCOPE);
    } catch (err: any) {
      setError(smsError(err));
      setBusy(false);
      return;
    }
    try {
      const state = await ecommerce.signupDenkma({
        subtype,
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        phone: denkmaPhone(phone) as string,
        phone_proof: proof,
        pin,
        accepted_legal: true,
        pickup_location: {
          label: label.trim(),
          city: city.trim(),
          district: district.trim() || null,
          geopin: { lat: position.lat, lng: position.lng, accuracy: position.accuracy, source: 'gps' },
        },
      });
      onCreated(state);
    } catch (err: any) {
      // Le code SMS a été utilisé : en cas de refus, une nouvelle vérification est nécessaire.
      setStep('form');
      setError(err?.message || t('denkma_signup.denkma_n_a_pas_pu_creer'));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    clearPhoneVerificationState(DENKMA_PHONE_SCOPE);
    onClose();
  }

  const text = { color: colors.text, fontSize: FontSize.sm, lineHeight: 20 };
  const muted = { color: colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 };
  const input = { borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, minHeight: 48, color: colors.text, fontSize: FontSize.sm };
  const section = { borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm };
  const heading = [text, { fontWeight: '700' as const }];
  const imprecise = accuracyProblem(position?.accuracy ?? null);

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgDark || colors.card }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Platform.OS === 'ios' ? 56 : Spacing.lg, paddingBottom: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700' }}>{t('denkma_signup.creer_mon_compte_denkma_pro')}</Text>
            <Text style={muted}>{t('denkma_signup.livraison_de_vos_commandes_en_ligne')}</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('denkma_signup.fermer')} onPress={close} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {step === 'form' ? (
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl * 2 }} keyboardShouldPersistTaps="handled">
            <View style={section}>
              <Text style={heading}>{t('denkma_signup.1_votre_commerce')}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }} accessibilityRole="radiogroup">
                {([['merchant', t('denkma_signup.commercant')], ['enterprise', 'Entreprise']] as const).map(([value, name]) => {
                  const active = subtype === value;
                  return (
                    <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setSubtype(value)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: active ? colors.primary : colors.divider, backgroundColor: active ? colors.primary + '20' : 'transparent' }}>
                      <Text style={[text, active && { color: colors.primary, fontWeight: '700' }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput style={input} value={businessName} onChangeText={setBusinessName} placeholder={t('denkma_signup.nom_du_commerce')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.nom_du_commerce')} maxLength={160} />
              <TextInput style={input} value={ownerName} onChangeText={setOwnerName} placeholder={t('denkma_signup.nom_du_responsable')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.nom_du_responsable')} maxLength={120} />
              <TextInput style={input} value={phone} onChangeText={setPhone} placeholder={t('denkma_signup.numero_de_telephone_221_ou_33')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.numero_de_telephone_du_compte_denkma')} keyboardType="phone-pad" maxLength={32} />
              <Text style={muted}>{t('denkma_signup.ce_numero_sera_confirme_par_sms')}</Text>
            </View>

            <View style={section}>
              <Text style={heading}>{t('denkma_signup.2_point_de_collecte')}</Text>
              <Text style={muted}>{t('denkma_signup.placez_vous_a_l_endroit_ou')}</Text>
              <TouchableOpacity accessibilityRole="button" disabled={locating} onPress={() => void locate()} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#2563EB40', backgroundColor: '#2563EB15' }}>
                {locating ? <ActivityIndicator color="#2563EB" /> : <Ionicons name="locate-outline" size={18} color="#2563EB" />}
                <Text style={{ color: '#2563EB', fontSize: FontSize.sm, fontWeight: '700' }}>{locating ? 'Localisation...' : position ? 'Relocaliser' : 'Utiliser ma position actuelle'}</Text>
              </TouchableOpacity>
              {position && (
                <Text style={[muted, { color: imprecise ? colors.warning : colors.success }]}>
                  {imprecise || (position.accuracy != null ? t('denkma_signup.position_saved_accuracy', { meters: Math.round(position.accuracy) }) : t('denkma_signup.position_saved'))}
                </Text>
              )}
              <TextInput style={input} value={label} onChangeText={setLabel} placeholder={t('denkma_signup.rue_repere_ex_face_a_la')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.description_du_point_de_collecte')} maxLength={240} />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TextInput style={[input, { flex: 1 }]} value={district} onChangeText={setDistrict} placeholder={t('denkma_signup.quartier')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.quartier')} maxLength={120} />
                <TextInput style={[input, { flex: 1 }]} value={city} onChangeText={setCity} placeholder={t('denkma_signup.ville')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.ville')} maxLength={120} />
              </View>
            </View>

            <View style={section}>
              <Text style={heading}>{t('denkma_signup.3_code_pin_denkma')}</Text>
              <Text style={muted}>{t('denkma_signup.de_4_a_12_chiffres_avec')}</Text>
              <TextInput style={input} value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, ''))} placeholder={t('denkma_signup.code_pin')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.code_pin_denkma')} keyboardType="number-pad" secureTextEntry maxLength={12} />
              <TextInput style={input} value={pinConfirmation} onChangeText={(value) => setPinConfirmation(value.replace(/\D/g, ''))} placeholder={t('denkma_signup.confirmez_le_code_pin')} placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.confirmation_du_code_pin')} keyboardType="number-pad" secureTextEntry maxLength={12} />
            </View>

            <View style={[section, { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={text}>{t('denkma_signup.j_accepte_les_conditions_d_utilisation')}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <Text accessibilityRole="link" onPress={() => void Linking.openURL(TERMS_URL)} style={[muted, { color: colors.primary, textDecorationLine: 'underline' }]}>{t('denkma_signup.conditions')}</Text>
                  <Text accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} style={[muted, { color: colors.primary, textDecorationLine: 'underline' }]}>{t('denkma_signup.confidentialite')}</Text>
                </View>
              </View>
              <Switch value={acceptedLegal} onValueChange={setAcceptedLegal} accessibilityLabel={t('denkma_signup.j_accepte_les_conditions_de_denkma')} trackColor={{ true: colors.primary, false: colors.divider }} />
            </View>

            {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 }}>{error}</Text>}

            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void sendCode()} style={{ minHeight: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#2563EB', opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' }}>{busy ? t('denkma_signup.envoi_du_sms') : t('denkma_signup.recevoir_le_code_par_sms')}</Text>
            </TouchableOpacity>
            <Text style={[muted, { textAlign: 'center' }]}>{t('denkma_signup.denkma_verifie_ensuite_votre_commerce_vous')}</Text>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }} keyboardShouldPersistTaps="handled">
            <Text style={text}>{t('denkma_signup.saisissez_le_code_a_6_chiffres_2')} {denkmaPhone(phone)}.</Text>
            <TextInput style={[input, { fontSize: FontSize.lg, letterSpacing: 6, textAlign: 'center' }]} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ''))} placeholder="000000" placeholderTextColor={colors.textMuted} accessibilityLabel={t('denkma_signup.code_recu_par_sms')} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} autoFocus />
            {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 }}>{error}</Text>}
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void create()} style={{ minHeight: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#2563EB', opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' }}>{busy ? t('denkma_signup.creation_du_compte') : t('denkma_signup.creer_mon_compte_denkma_pro')}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => { setError(null); setStep('form'); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[text, { color: colors.primary }]}>{t('denkma_signup.modifier_mes_informations')}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void sendCode()} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[text, { color: colors.primary }]}>{t('denkma_signup.renvoyer_le_code')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
