import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce, type DenkmaConnection } from '../services/api';
import { clearPhoneVerificationState, confirmPhoneCode, sendPhoneVerification } from '../services/firebasePhoneAuth';
import { accuracyProblem, denkmaPhone, signupProblem } from '../utils/denkmaSignup';

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
  if (code.includes('invalid-verification-code')) return 'Code incorrect. Vérifiez le SMS reçu et réessayez.';
  if (code.includes('code-expired') || code.includes('session-expired')) return 'Ce code a expiré. Demandez un nouveau SMS.';
  if (code.includes('too-many-requests')) return 'Trop de tentatives. Patientez quelques minutes avant de redemander un code.';
  if (code.includes('invalid-phone-number')) return 'Ce numéro de téléphone est invalide.';
  if (code.includes('network')) return 'Pas de connexion internet. Vérifiez votre réseau et réessayez.';
  return error?.message || "L'envoi du SMS a échoué. Réessayez.";
}

// Création du compte Denkma Pro sans quitter Stockman : le commerçant renseigne son commerce,
// localise son point de collecte, choisit son code PIN Denkma et confirme son numéro par SMS.
// Le compte est ensuite validé par Denkma avant la première expédition.
// À afficher seulement quand il est ouvert ({open && <DenkmaSignupModal />}).
export default function DenkmaSignupModal({ initialBusinessName, initialOwnerName, initialPhone, onClose, onCreated }: Props) {
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
        setError('Autorisez la localisation pour enregistrer votre point de collecte.');
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
      setError('Impossible de vous localiser. Activez la localisation du téléphone et réessayez.');
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
      await sendPhoneVerification(denkmaPhone(phone) as string);
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
      setError('Saisissez le code à 6 chiffres reçu par SMS.');
      return;
    }
    setBusy(true);
    setError(null);
    let proof: string;
    try {
      proof = await confirmPhoneCode(code.trim());
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
      setError(err?.message || "Denkma n'a pas pu créer votre compte. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    clearPhoneVerificationState();
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
            <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700' }}>Créer mon compte Denkma Pro</Text>
            <Text style={muted}>Livraison de vos commandes en ligne au Sénégal</Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {step === 'form' ? (
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl * 2 }} keyboardShouldPersistTaps="handled">
            <View style={section}>
              <Text style={heading}>1. Votre commerce</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }} accessibilityRole="radiogroup">
                {([['merchant', 'Commerçant'], ['enterprise', 'Entreprise']] as const).map(([value, name]) => {
                  const active = subtype === value;
                  return (
                    <TouchableOpacity key={value} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => setSubtype(value)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: active ? colors.primary : colors.divider, backgroundColor: active ? colors.primary + '20' : 'transparent' }}>
                      <Text style={[text, active && { color: colors.primary, fontWeight: '700' }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput style={input} value={businessName} onChangeText={setBusinessName} placeholder="Nom du commerce" placeholderTextColor={colors.textMuted} accessibilityLabel="Nom du commerce" maxLength={160} />
              <TextInput style={input} value={ownerName} onChangeText={setOwnerName} placeholder="Nom du responsable" placeholderTextColor={colors.textMuted} accessibilityLabel="Nom du responsable" maxLength={120} />
              <TextInput style={input} value={phone} onChangeText={setPhone} placeholder="Numéro de téléphone (+221 ou +33)" placeholderTextColor={colors.textMuted} accessibilityLabel="Numéro de téléphone du compte Denkma Pro" keyboardType="phone-pad" maxLength={32} />
              <Text style={muted}>Ce numéro sera confirmé par SMS. Il servira à vous connecter à Denkma Pro.</Text>
            </View>

            <View style={section}>
              <Text style={heading}>2. Point de collecte</Text>
              <Text style={muted}>Placez-vous à l'endroit où le livreur viendra chercher vos colis, puis enregistrez la position.</Text>
              <TouchableOpacity accessibilityRole="button" disabled={locating} onPress={() => void locate()} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#2563EB40', backgroundColor: '#2563EB15' }}>
                {locating ? <ActivityIndicator color="#2563EB" /> : <Ionicons name="locate-outline" size={18} color="#2563EB" />}
                <Text style={{ color: '#2563EB', fontSize: FontSize.sm, fontWeight: '700' }}>{locating ? 'Localisation...' : position ? 'Relocaliser' : 'Utiliser ma position actuelle'}</Text>
              </TouchableOpacity>
              {position && (
                <Text style={[muted, { color: imprecise ? colors.warning : colors.success }]}>
                  {imprecise || `Position enregistrée${position.accuracy != null ? ` (précision ± ${Math.round(position.accuracy)} m)` : ''}.`}
                </Text>
              )}
              <TextInput style={input} value={label} onChangeText={setLabel} placeholder="Rue, repère (ex. : face à la pharmacie)" placeholderTextColor={colors.textMuted} accessibilityLabel="Description du point de collecte" maxLength={240} />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <TextInput style={[input, { flex: 1 }]} value={district} onChangeText={setDistrict} placeholder="Quartier" placeholderTextColor={colors.textMuted} accessibilityLabel="Quartier" maxLength={120} />
                <TextInput style={[input, { flex: 1 }]} value={city} onChangeText={setCity} placeholder="Ville" placeholderTextColor={colors.textMuted} accessibilityLabel="Ville" maxLength={120} />
              </View>
            </View>

            <View style={section}>
              <Text style={heading}>3. Code PIN Denkma</Text>
              <Text style={muted}>De 4 à 12 chiffres. Avec votre numéro, il vous connecte à l'application Denkma Pro pour recharger votre compte transport et suivre vos colis.</Text>
              <TextInput style={input} value={pin} onChangeText={(value) => setPin(value.replace(/\D/g, ''))} placeholder="Code PIN" placeholderTextColor={colors.textMuted} accessibilityLabel="Code PIN Denkma" keyboardType="number-pad" secureTextEntry maxLength={12} />
              <TextInput style={input} value={pinConfirmation} onChangeText={(value) => setPinConfirmation(value.replace(/\D/g, ''))} placeholder="Confirmez le code PIN" placeholderTextColor={colors.textMuted} accessibilityLabel="Confirmation du code PIN" keyboardType="number-pad" secureTextEntry maxLength={12} />
            </View>

            <View style={[section, { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={text}>J'accepte les conditions d'utilisation et la politique de confidentialité de Denkma.</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <Text accessibilityRole="link" onPress={() => void Linking.openURL(TERMS_URL)} style={[muted, { color: colors.primary, textDecorationLine: 'underline' }]}>Conditions</Text>
                  <Text accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} style={[muted, { color: colors.primary, textDecorationLine: 'underline' }]}>Confidentialité</Text>
                </View>
              </View>
              <Switch value={acceptedLegal} onValueChange={setAcceptedLegal} accessibilityLabel="J'accepte les conditions de Denkma" trackColor={{ true: colors.primary, false: colors.divider }} />
            </View>

            {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 }}>{error}</Text>}

            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void sendCode()} style={{ minHeight: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#2563EB', opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' }}>{busy ? 'Envoi du SMS...' : 'Recevoir le code par SMS'}</Text>
            </TouchableOpacity>
            <Text style={[muted, { textAlign: 'center' }]}>Denkma vérifie ensuite votre commerce. Vous pourrez expédier dès la validation de votre compte.</Text>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }} keyboardShouldPersistTaps="handled">
            <Text style={text}>Saisissez le code à 6 chiffres envoyé par SMS au {denkmaPhone(phone)}.</Text>
            <TextInput style={[input, { fontSize: FontSize.lg, letterSpacing: 6, textAlign: 'center' }]} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, ''))} placeholder="000000" placeholderTextColor={colors.textMuted} accessibilityLabel="Code reçu par SMS" keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} autoFocus />
            {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 }}>{error}</Text>}
            <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void create()} style={{ minHeight: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, backgroundColor: '#2563EB', opacity: busy ? 0.6 : 1 }}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' }}>{busy ? 'Création du compte...' : 'Créer mon compte Denkma Pro'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => { setError(null); setStep('form'); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[text, { color: colors.primary }]}>Modifier mes informations</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void sendCode()} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={[text, { color: colors.primary }]}>Renvoyer le code</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
