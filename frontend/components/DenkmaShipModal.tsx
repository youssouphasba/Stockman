import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce } from '../services/api';
import { amountDue, denkmaDelivery, denkmaDestination } from '../utils/denkmaShipping';

type Props = {
  order: any;
  formatAmount: (amount: number) => string;
  onClose: () => void;
  onShipped: (order: any) => void;
};

type Photo = { uri: string; type: string };

// « Livrer avec Denkma » : le commerçant confirme le paiement du client et photographie le colis ;
// Stockman réserve le transport, déclare le colis prêt et demande l'enlèvement à Denkma.
// À afficher seulement quand il est ouvert ({open && <DenkmaShipModal />}) : un Modal transparent
// toujours monté bloque les gestes sur iOS.
export default function DenkmaShipModal({ order, formatAmount, onClose, onShipped }: Props) {
  const { colors } = useTheme();
  const [paid, setPaid] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const delivery = denkmaDelivery(order);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Autorisez l'appareil photo, ou choisissez une photo existante.");
          return;
        }
      }
      const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setPhoto({ uri: asset.uri, type: asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) ? asset.mimeType : 'image/jpeg' });
      }
    } catch {
      setError('Impossible de récupérer la photo. Réessayez.');
    }
  }

  async function ship() {
    if (!paid || !photo || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('customer_paid', 'true');
      form.append('photo', { uri: photo.uri, name: 'colis.jpg', type: photo.type } as any);
      const updated = await ecommerce.shipWithDenkma(order.order_id, form);
      onShipped(updated);
    } catch (err: any) {
      setError(err?.message || "L'expédition n'a pas pu être demandée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const card = { borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs };
  const text = { color: colors.text, fontSize: FontSize.sm, lineHeight: 20 };
  const muted = { color: colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 };
  const ready = paid && !!photo && !busy;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <View style={{ maxHeight: '92%', backgroundColor: colors.bgDark || colors.card, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '700' }}>Livrer avec Denkma</Text>
              <Text style={muted}>{order.order_number}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ gap: Spacing.md, paddingBottom: Spacing.lg }}>
            {delivery && (
              <View style={card}>
                <Text style={[text, { fontWeight: '700' }]}>{denkmaDestination(delivery)}</Text>
                <Text style={text}>Frais Denkma réservés sur votre compte transport : {formatAmount(delivery.fee || 0)}</Text>
                <Text style={muted}>Le livreur vient chercher le colis au point de collecte enregistré dans Denkma Pro.</Text>
              </View>
            )}

            <View style={[card, { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={[text, { fontWeight: '700' }]}>1. Le client a payé {formatAmount(amountDue(order))}</Text>
                <Text style={muted}>Articles et livraison. Denkma ne collecte pas le paiement des marchandises.</Text>
              </View>
              <Switch value={paid} onValueChange={setPaid} accessibilityLabel="Le client a payé sa commande" trackColor={{ true: colors.primary, false: colors.divider }} />
            </View>

            <View style={card}>
              <Text style={[text, { fontWeight: '700' }]}>2. Photo du colis prêt</Text>
              <Text style={muted}>Denkma la demande pour la sécurité de l'envoi.</Text>
              {photo && <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 180, borderRadius: BorderRadius.md, marginTop: Spacing.sm }} resizeMode="cover" accessibilityLabel="Photo du colis" />}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                {(['camera', 'library'] as const).map((source) => (
                  <TouchableOpacity key={source} accessibilityRole="button" onPress={() => void pick(source)} disabled={busy} style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md }}>
                    <Ionicons name={source === 'camera' ? 'camera-outline' : 'images-outline'} size={18} color={colors.text} />
                    <Text style={text}>{source === 'camera' ? (photo ? 'Reprendre' : 'Prendre la photo') : 'Galerie'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: FontSize.sm, lineHeight: 20 }}>{error}</Text>}

            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={() => void ship()} style={{ minHeight: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, backgroundColor: ready ? '#2563EB' : colors.divider }}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="bicycle-outline" size={20} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' }}>{busy ? 'Expédition en cours...' : 'Expédier avec Denkma'}</Text>
            </TouchableOpacity>
            <Text style={[muted, { textAlign: 'center' }]}>Stockman réserve le transport, déclare le colis prêt et demande l'enlèvement. Le suivi s'affiche ensuite dans la commande.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
