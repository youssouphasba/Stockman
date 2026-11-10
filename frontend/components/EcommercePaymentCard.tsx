import React from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

export type PaymentDraft = {
  wave_phone?: string | null;
  wave_name?: string | null;
  wave_link?: string | null;
  orange_money_phone?: string | null;
  orange_money_name?: string | null;
  pay_on_delivery?: boolean;
  payment_instructions?: string | null;
};

type Props = {
  draft: PaymentDraft;
  canEdit: boolean;
  styles: Record<string, any>;
  onChange: (patch: Partial<PaymentDraft>) => void;
  // Faux hors du Sénégal : Wave et Orange Money ne sont pas proposés à cette boutique.
  mobileMoneyAvailable?: boolean;
};

// Réglage « Paiement des commandes » de la boutique en ligne. Le client paie le commerçant
// directement, sur son compte Wave ou Orange Money : la boutique affiche le numéro et le montant,
// puis le commerçant confirme « Paiement reçu ». Stockman ne reçoit jamais cet argent.
export default function EcommercePaymentCard({ draft, canEdit, styles, onChange, mobileMoneyAvailable }: Props) {
  const { colors } = useTheme();
  const wave = Boolean((draft.wave_phone || '').trim());
  const orange = Boolean((draft.orange_money_phone || '').trim());
  const mobile = wave || orange;
  const mobileMoney = mobileMoneyAvailable !== false;

  const wallet = (title: string, active: boolean, children: React.ReactNode) => (
    <View style={{ borderWidth: 1, borderColor: active ? colors.success + '55' : colors.divider, backgroundColor: active ? colors.success + '0D' : 'transparent', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
        <Text style={[styles.settingLabel, { fontWeight: '700' }]}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={active ? colors.success : colors.textMuted} />
          <Text style={{ color: active ? colors.success : colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' }}>{active ? 'Proposé à vos clients' : 'Non proposé'}</Text>
        </View>
      </View>
      {children}
    </View>
  );

  const hint = (text: string) => <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 }}>{text}</Text>;

  return (
    <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
      <Text style={[styles.settingLabel, { fontWeight: '700' }]}>Paiement des commandes</Text>
      {hint(mobileMoney
        ? 'Vos clients vous paient directement, en une seule fois, articles et livraison compris. La boutique leur affiche votre numéro et le montant exact ; vous confirmez « Paiement reçu » dans la commande.'
        : 'Vos clients vous paient directement. Écrivez ci-dessous comment vous payer : ils le lisent avant de commander, et vous confirmez « Paiement reçu » dans la commande. Wave et Orange Money sont proposés aux boutiques du Sénégal.')}

      {mobileMoney && <>
      {wallet('Wave', wave, <>
        <TextInput
          style={styles.input}
          value={draft.wave_phone || ''}
          onChangeText={(value) => onChange({ wave_phone: value })}
          placeholder="Votre numéro Wave : 77 123 45 67"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          editable={canEdit}
          accessibilityLabel="Votre numéro Wave"
        />
        <TextInput
          style={styles.input}
          value={draft.wave_name || ''}
          onChangeText={(value) => onChange({ wave_name: value })}
          placeholder="Nom affiché dans Wave"
          placeholderTextColor={colors.textMuted}
          editable={canEdit}
          accessibilityLabel="Nom affiché dans Wave"
        />
        <TextInput
          style={styles.input}
          value={draft.wave_link || ''}
          onChangeText={(value) => onChange({ wave_link: value })}
          placeholder="Lien de paiement Wave (facultatif)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={canEdit}
          accessibilityLabel="Lien de paiement Wave, facultatif"
        />
        {hint('Le client vérifie le nom avant de payer. Si Wave Business vous a donné un lien de paiement, collez-le : le client l’ouvrira d’un geste.')}
      </>)}

      {wallet('Orange Money', orange, <>
        <TextInput
          style={styles.input}
          value={draft.orange_money_phone || ''}
          onChangeText={(value) => onChange({ orange_money_phone: value })}
          placeholder="Votre numéro Orange Money : 77 123 45 67"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          editable={canEdit}
          accessibilityLabel="Votre numéro Orange Money"
        />
        <TextInput
          style={styles.input}
          value={draft.orange_money_name || ''}
          onChangeText={(value) => onChange({ orange_money_name: value })}
          placeholder="Nom affiché dans Orange Money"
          placeholderTextColor={colors.textMuted}
          editable={canEdit}
          accessibilityLabel="Nom affiché dans Orange Money"
        />
      </>)}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 48 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>Accepter le paiement à la livraison</Text>
          {hint(mobile
            ? 'Le client peut choisir de vous payer à la réception. Désactivez pour exiger le paiement avant la préparation.'
            : 'Ajoutez un numéro Wave ou Orange Money pour proposer un choix à vos clients.')}
        </View>
        <Switch
          value={draft.pay_on_delivery !== false}
          onValueChange={(value) => onChange({ pay_on_delivery: value })}
          disabled={!canEdit || !mobile}
          accessibilityLabel="Accepter le paiement à la livraison"
        />
      </View>
      </>}

      <TextInput
        style={[styles.input, styles.textArea]}
        value={draft.payment_instructions || ''}
        onChangeText={(value) => onChange({ payment_instructions: value })}
        placeholder={mobileMoney ? 'Autres consignes de paiement (facultatif) : virement, espèces au retrait en boutique...' : 'Consignes de paiement : virement, espèces au retrait en boutique...'}
        placeholderTextColor={colors.textMuted}
        multiline
        editable={canEdit}
        accessibilityLabel="Autres consignes de paiement, facultatif"
      />
    </View>
  );
}
