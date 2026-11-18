import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce, type EcommerceSite } from '../services/api';
import {
  DNS_PROVIDERS,
  describeDomainState,
  domainInputProblem,
  domainRecords,
  domainState,
  formatCheckedAt,
  recordPurpose,
  redirectHint,
  shouldAutoCheck,
} from '../utils/ecommerceDomain';
import { useTranslation } from 'react-i18next';

type Props = {
  site: EcommerceSite;
  canEdit: boolean;
  styles: Record<string, any>;
  onSiteChange: (site: EcommerceSite) => void;
  onFeedback: (message: string, tone?: 'success' | 'error') => void;
};

// Les refus du serveur sont rédigés pour le commerçant ; les autres erreurs restent génériques.
function errorMessage(error: unknown, fallback: string) {
  const status = (error as { status?: number })?.status;
  const message = (error as { message?: string })?.message;
  return status && [400, 403, 409, 502].includes(status) && message ? message : fallback;
}

// Domaine du site : adresse Stockman, connexion d'un domaine en trois étapes et suivi de son état.
export default function EcommerceDomainCard({ site, canEdit, styles, onSiteChange, onFeedback }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState<null | 'connect' | 'check' | 'disconnect'>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const autoChecked = useRef<string | null>(null);

  const state = domainState(site);
  const status = describeDomainState(site);
  const records = domainRecords(site);
  const checkedAt = formatCheckedAt(site.domain_checked_at);
  const redirect = redirectHint(site);
  const stockmanUrl = site.stockman_site_url || site.site_url;
  const toneColor = { neutral: colors.textMuted, progress: colors.info, warning: colors.warning, success: colors.success }[status.tone];
  const inputProblem = domain.trim() ? domainInputProblem(domain) : null;
  const siteHost = records.find((record) => record.purpose === 'site')?.host || site.custom_domain || 'www.votredomaine.com';

  async function run(kind: 'connect' | 'check' | 'disconnect', action: () => Promise<EcommerceSite>, success: (next: EcommerceSite) => string, fallback: string) {
    if (busy) return;
    setBusy(kind);
    try {
      const next = await action();
      onSiteChange(next);
      onFeedback(success(next), 'success');
      return next;
    } catch (error) {
      onFeedback(errorMessage(error, fallback), 'error');
      return null;
    } finally {
      setBusy(null);
    }
  }

  // Tant que le domaine attend le DNS ou son certificat, une vérification part à l'ouverture.
  useEffect(() => {
    if (!canEdit || !site.custom_domain || autoChecked.current === site.custom_domain || !shouldAutoCheck(site)) return;
    autoChecked.current = site.custom_domain;
    ecommerce.checkDomain().then(onSiteChange).catch(() => undefined);
  }, [canEdit, site, onSiteChange]);

  async function connect() {
    const problem = domainInputProblem(domain);
    if (problem) {
      onFeedback(problem, 'error');
      return;
    }
    const next = await run('connect', () => ecommerce.connectDomain(domain.trim()), (value) => (domainState(value) === 'active' ? t('ecommerce_domain.domaine_connecte_votre_site_est_en') : t('ecommerce_domain.domaine_enregistre_ajoutez_maintenant_les_enregi')), t('ecommerce_domain.impossible_de_connecter_ce_domaine_pour'));
    if (next) setDomain('');
  }

  function check() {
    void run('check', () => ecommerce.checkDomain(), (value) => describeDomainState(value).title, t('ecommerce_domain.impossible_de_verifier_le_domaine_pour'));
  }

  function disconnect() {
    Alert.alert(
      t('ecommerce_domain.retirer_ce_domaine'),
      t('ecommerce_domain.remove_domain_message', { domain: site.custom_domain }),
      [
        { text: t('ecommerce_domain.annuler'), style: 'cancel' },
        { text: t('ecommerce_domain.retirer'), style: 'destructive', onPress: () => void run('disconnect', () => ecommerce.disconnectDomain(), () => t('ecommerce_domain.domaine_retire_votre_site_reste_en'), t('ecommerce_domain.impossible_de_retirer_le_domaine_pour')) },
      ],
    );
  }

  async function copy(value: string, label: string) {
    try {
      await Clipboard.setStringAsync(value);
      onFeedback(t('ecommerce_domain.copied', { label }), 'success');
    } catch {
      onFeedback(t('ecommerce_domain.copy_failed'), 'error');
    }
  }

  async function open(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      onFeedback(t('ecommerce_domain.impossible_d_ouvrir_le_site_pour'), 'error');
    }
  }

  const smallButton = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, minHeight: 36, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider };
  const actionButton = (color: string) => [styles.syncButton, { flex: 0, alignSelf: 'stretch' as const, minHeight: 48, backgroundColor: color + '15', borderColor: color + '40' }];

  function addressRow(label: string, url: string, canOpen: boolean) {
    return (
      <View style={[styles.metricCard, { gap: Spacing.xs }]}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text selectable style={[styles.metricValue, { fontSize: FontSize.sm }]}>{url}</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Copier ${label.toLowerCase()}`} style={smallButton} onPress={() => void copy(url, 'Lien')}>
            <Ionicons name="copy-outline" size={16} color={colors.text} />
            <Text style={styles.chipText}>{t('ecommerce_domain.copier')}</Text>
          </TouchableOpacity>
          {canOpen && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ouvrir ${label.toLowerCase()}`} style={smallButton} onPress={() => void open(url)}>
              <Ionicons name="open-outline" size={16} color={colors.text} />
              <Text style={styles.chipText}>{t('ecommerce_domain.ouvrir')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const recordsBlock = (
    <View style={{ gap: Spacing.sm }}>
      {records.map((record) => (
        <View key={`${record.type}-${record.name}-${record.value}`} style={[styles.metricCard, { gap: Spacing.xs }]}>
          <Text style={[styles.settingDesc, { fontWeight: '700', color: colors.text }]}>{recordPurpose(record, site)}</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <View style={{ width: 64 }}>
              <Text style={styles.metricLabel}>{t('ecommerce_domain.type')}</Text>
              <Text selectable style={[styles.metricValue, { fontSize: FontSize.sm }]}>{record.type}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricLabel}>{t('ecommerce_domain.nom')}</Text>
              <Text selectable style={[styles.metricValue, { fontSize: FontSize.sm }]}>{record.name}</Text>
            </View>
          </View>
          <Text style={styles.metricLabel}>{t('ecommerce_domain.valeur')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Text selectable style={[styles.metricValue, { flex: 1, fontSize: FontSize.sm }]}>{record.value}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('ecommerce_domain.copy_record_value', { type: record.type, name: record.name })} style={smallButton} onPress={() => void copy(record.value, t('ecommerce_domain.value'))}>
              <Ionicons name="copy-outline" size={16} color={colors.text} />
              <Text style={styles.chipText}>{t('ecommerce_domain.copier')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={styles.settingDesc}>{t('ecommerce_domain.remove_old_records', { host: siteHost })}</Text>
    </View>
  );

  return (
    <View style={{ gap: Spacing.md, marginBottom: Spacing.md }}>
      <View accessibilityRole="summary" style={{ borderLeftWidth: 4, borderLeftColor: toneColor, backgroundColor: toneColor + '14', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs }}>
        <Text style={[styles.settingLabel, { fontWeight: '700' }]}>{status.title}</Text>
        <Text style={styles.settingDesc}>{status.text}</Text>
        {!!redirect && <Text style={[styles.settingDesc, site.domain_redirect_ready ? null : { color: colors.warning }]}>{redirect}</Text>}
      </View>

      {state === 'active' && !!site.custom_domain && addressRow(t('ecommerce_domain.votre_domaine'), `https://${site.custom_domain}`, true)}
      {!!stockmanUrl && addressRow('Adresse Stockman', stockmanUrl, true)}

      {state === 'not_connected' && canEdit && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={[styles.settingLabel, { fontWeight: '700' }]}>{t('ecommerce_domain.connecter_votre_nom_de_domaine')}</Text>
          {[t('ecommerce_domain.saisissez_le_domaine_que_vous_possedez'), t('ecommerce_domain.ajoutez_chez_votre_fournisseur_les_enregistremen'), t('ecommerce_domain.lancez_la_verification_le_site_passe')].map((step, index) => (
            <View key={step} style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: FontSize.xs }}>{index + 1}</Text>
              </View>
              <Text style={[styles.settingDesc, { flex: 1 }]}>{step}</Text>
            </View>
          ))}
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            value={domain}
            onChangeText={setDomain}
            placeholder={t('ecommerce_domain.votredomaine_com')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!busy}
            accessibilityLabel={t('ecommerce_domain.votre_nom_de_domaine')}
            onSubmitEditing={() => void connect()}
          />
          <Text style={[styles.settingDesc, inputProblem ? { color: colors.warning } : null]}>
            {inputProblem || t('ecommerce_domain.sans_https_avec_un_domaine_comme')}
          </Text>
          <TouchableOpacity accessibilityRole="button" style={actionButton(colors.primary)} disabled={!!busy || !domain.trim()} onPress={() => void connect()}>
            <Ionicons name="link-outline" size={18} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' }}>{busy === 'connect' ? t('ecommerce_domain.connecting') : t('ecommerce_domain.connect_domain')}</Text>
          </TouchableOpacity>
          <Text style={styles.settingDesc}>{t('ecommerce_domain.pas_encore_de_domaine_achetez_le')}</Text>
        </View>
      )}

      {state !== 'not_connected' && state !== 'active' && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={[styles.settingLabel, { fontWeight: '700' }]}>{t('ecommerce_domain.enregistrements_a_creer_chez_votre_fournisseur')}</Text>
          {recordsBlock}
          <Text style={[styles.settingDesc, { fontWeight: '700', color: colors.text }]}>{t('ecommerce_domain.ou_faire_ces_reglages')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={t('ecommerce_domain.fournisseur_du_domaine')}>
            {DNS_PROVIDERS.map((item) => {
              const active = provider === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setProvider(active ? null : item.key)}
                  style={[styles.chip, { marginRight: 0, minHeight: 40, justifyContent: 'center' }, active && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={[styles.chipText, active && { color: colors.primary }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!!provider && <Text style={styles.settingDesc}>{DNS_PROVIDERS.find((item) => item.key === provider)?.tip}</Text>}
        </View>
      )}

      {state === 'active' && records.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showRecords }} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 40 }} onPress={() => setShowRecords((value) => !value)}>
            <Ionicons name={showRecords ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
            <Text style={styles.settingDesc}>{showRecords ? t('ecommerce_domain.masquer_les_enregistrements_dns') : t('ecommerce_domain.voir_les_enregistrements_dns')}</Text>
          </TouchableOpacity>
          {showRecords && recordsBlock}
        </View>
      )}

      {state !== 'not_connected' && canEdit && (
        <View style={{ gap: Spacing.sm }}>
          <TouchableOpacity accessibilityRole="button" style={actionButton(colors.info)} disabled={!!busy} onPress={check}>
            <Ionicons name="refresh-outline" size={18} color={colors.info} />
            <Text style={{ color: colors.info, fontSize: FontSize.sm, fontWeight: '700' }}>{busy === 'check' ? t('ecommerce_domain.verification') : state === 'active' ? t('ecommerce_domain.verifier_a_nouveau') : t('ecommerce_domain.verifier_maintenant')}</Text>
          </TouchableOpacity>
          {!!checkedAt && <Text style={[styles.settingDesc, { textAlign: 'center' }]}>{checkedAt}</Text>}
          <TouchableOpacity accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center' }} disabled={!!busy} onPress={disconnect}>
            <Text style={{ color: colors.danger, fontSize: FontSize.sm, fontWeight: '600' }}>{busy === 'disconnect' ? 'Retrait...' : 'Retirer ce domaine'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
