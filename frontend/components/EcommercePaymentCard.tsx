import React from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          <Text style={{ color: active ? colors.success : colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' }}>{active ? t('ecommerce_payment.propose_a_vos_clients') : t('ecommerce_payment.non_propose')}</Text>
        </View>
      </View>
      {children}
    </View>
  );

  const hint = (text: string) => <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 }}>{text}</Text>;

  return (
    <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
      <Text style={[styles.settingLabel, { fontWeight: '700' }]}>{t('ecommerce_payment.paiement_des_commandes')}</Text>
      {hint(mobileMoney
        ? t('ecommerce_payment.vos_clients_vous_paient_directement_en')
        : t('ecommerce_payment.vos_clients_vous_paient_directement_ecrivez'))}

      {mobileMoney && <>
      {wallet('Wave', wave, <>
        <TextInput
          style={styles.input}
          value={draft.wave_phone || ''}
          onChangeText={(value) => onChange({ wave_phone: value })}
          placeholder={t('ecommerce_payment.votre_numero_wave_77_123_45')}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          editable={canEdit}
          accessibilityLabel={t('ecommerce_payment.votre_numero_wave')}
        />
        <TextInput
          style={styles.input}
          value={draft.wave_name || ''}
          onChangeText={(value) => onChange({ wave_name: value })}
          placeholder={t('ecommerce_payment.nom_affiche_dans_wave')}
          placeholderTextColor={colors.textMuted}
          editable={canEdit}
          accessibilityLabel={t('ecommerce_payment.nom_affiche_dans_wave')}
        />
        <TextInput
          style={styles.input}
          value={draft.wave_link || ''}
          onChangeText={(value) => onChange({ wave_link: value })}
          placeholder={t('ecommerce_payment.lien_de_paiement_wave_facultatif')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={canEdit}
          accessibilityLabel={t('ecommerce_payment.lien_de_paiement_wave_facultatif_2')}
        />
        {hint(t('ecommerce_payment.le_client_verifie_le_nom_avant'))}
      </>)}

      {wallet('Orange Money', orange, <>
        <TextInput
          style={styles.input}
          value={draft.orange_money_phone || ''}
          onChangeText={(value) => onChange({ orange_money_phone: value })}
          placeholder={t('ecommerce_payment.votre_numero_orange_money_77_123')}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          editable={canEdit}
          accessibilityLabel={t('ecommerce_payment.votre_numero_orange_money')}
        />
        <TextInput
          style={styles.input}
          value={draft.orange_money_name || ''}
          onChangeText={(value) => onChange({ orange_money_name: value })}
          placeholder={t('ecommerce_payment.nom_affiche_dans_orange_money')}
          placeholderTextColor={colors.textMuted}
          editable={canEdit}
          accessibilityLabel={t('ecommerce_payment.nom_affiche_dans_orange_money')}
        />
      </>)}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 48 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingLabel}>{t('ecommerce_payment.accepter_le_paiement_a_la_livraison')}</Text>
          {hint(mobile
            ? t('ecommerce_payment.le_client_peut_choisir_de_vous')
            : t('ecommerce_payment.ajoutez_un_numero_wave_ou_orange'))}
        </View>
        <Switch
          value={draft.pay_on_delivery !== false}
          onValueChange={(value) => onChange({ pay_on_delivery: value })}
          disabled={!canEdit || !mobile}
          accessibilityLabel={t('ecommerce_payment.accepter_le_paiement_a_la_livraison')}
        />
      </View>
      </>}

      <TextInput
        style={[styles.input, styles.textArea]}
        value={draft.payment_instructions || ''}
        onChangeText={(value) => onChange({ payment_instructions: value })}
        placeholder={mobileMoney ? t('ecommerce_payment.autres_consignes_de_paiement_facultatif_virement') : t('ecommerce_payment.consignes_de_paiement_virement_especes_au')}
        placeholderTextColor={colors.textMuted}
        multiline
        editable={canEdit}
        accessibilityLabel={t('ecommerce_payment.autres_consignes_de_paiement_facultatif')}
      />
    </View>
  );
}
