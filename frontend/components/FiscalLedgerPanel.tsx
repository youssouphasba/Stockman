import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../contexts/ThemeContext';
import { fiscal } from '../services/api';

type PeriodType = 'day' | 'month' | 'year';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  wave: 'Wave',
  orange_money: 'Orange Money',
  card: 'Carte',
  transfer: 'Virement',
  credit: 'À crédit',
};

// Registre inaltérable des ventes (commerces) : état, vérification, clôtures et archives.
export default function FiscalLedgerPanel({ formatCurrency }: { formatCurrency: (value: number) => string }) {
  const { t } = useTranslation();
  const { colors, glassStyle } = useTheme();
  const [available, setAvailable] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('day');
  const [closures, setClosures] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<any>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextStatus, nextClosures] = await Promise.all([fiscal.status(), fiscal.closures(periodType)]);
      setStatus(nextStatus);
      setClosures(nextClosures?.closures || []);
    } catch (err: any) {
      // Restauration : le registre ne s'applique pas, le bloc n'est pas affiché.
      if (err?.status === 404 || err?.status === 403) setAvailable(false);
    }
  }, [periodType]);

  useEffect(() => { void load(); }, [load]);

  const runVerification = async () => {
    setVerifying(true);
    try {
      setVerification(await fiscal.verify());
    } catch {
      Alert.alert(t('common.error'), t('fiscal.load_error', 'Impossible de charger le registre.'));
    } finally {
      setVerifying(false);
    }
  };

  const shareArchive = async (closure: any) => {
    const key = `${closure.period_type}-${closure.period_key}`;
    setDownloading(key);
    try {
      const archive = await fiscal.archive(closure.period_type, closure.period_key);
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const fileUri = `${baseDir}registre-ventes-${key}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(archive, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', UTI: 'public.json' });
      }
    } catch {
      Alert.alert(t('common.error'), t('fiscal.download_error', "Impossible de télécharger l'archive."));
    } finally {
      setDownloading(null);
    }
  };

  if (!available) return null;

  const periods: { value: PeriodType; label: string }[] = [
    { value: 'day', label: t('fiscal.period_day', 'Jours') },
    { value: 'month', label: t('fiscal.period_month', 'Mois') },
    { value: 'year', label: t('fiscal.period_year', 'Années') },
  ];
  const muted = { fontSize: 11, color: colors.textMuted };

  return (
    <View style={[glassStyle, { padding: 16, borderRadius: 16, marginTop: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, flex: 1 }}>{t('fiscal.title', 'Registre des ventes')}</Text>
      </View>
      <Text style={[muted, { marginBottom: 12 }]}>
        {t('fiscal.subtitle', 'Chaque vente et chaque annulation sont inscrites de façon inaltérable : numérotées, chaînées entre elles et clôturées chaque jour, mois et année.')}
      </Text>

      {status && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: colors.glass, borderRadius: 12, padding: 10 }}>
            <Text style={muted}>{t('fiscal.entries', 'Inscriptions')}</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>{status.entries}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.glass, borderRadius: 12, padding: 10 }}>
            <Text style={muted}>{t('fiscal.cumulative', 'Total cumulé')}</Text>
            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }} numberOfLines={1}>{formatCurrency(status.cumulative_total || 0)}</Text>
          </View>
        </View>
      )}
      {status && !status.last_entry_at && (
        <Text style={[muted, { marginBottom: 12 }]}>{t('fiscal.not_started', 'Le registre démarre à la prochaine vente.')}</Text>
      )}

      <TouchableOpacity
        onPress={() => void runVerification()}
        disabled={verifying}
        style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center', opacity: verifying ? 0.6 : 1 }}
      >
        {verifying
          ? <ActivityIndicator color="#fff" />
          : <Text style={{ color: '#fff', fontWeight: '800' }}>{t('fiscal.verify', "Vérifier l'intégrité")}</Text>}
      </TouchableOpacity>

      {verification && (
        <View style={{ marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: verification.ok ? colors.success : colors.danger }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: verification.ok ? colors.success : colors.danger }}>
            {verification.ok
              ? t('fiscal.verify_ok', 'Registre intact : {{count}} inscriptions contrôlées, aucune anomalie.', { count: verification.entries })
              : t('fiscal.verify_problems', 'Anomalies détectées : {{count}}', { count: verification.problems.length })}
          </Text>
          {!verification.ok && verification.problems.map((problem: any, index: number) => (
            <Text key={index} style={[muted, { marginTop: 4 }]}>• {problem.message}</Text>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{t('fiscal.closures', 'Clôtures')}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {periods.map((period) => {
            const selected = periodType === period.value;
            return (
              <TouchableOpacity
                key={period.value}
                onPress={() => setPeriodType(period.value)}
                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: selected ? colors.primary : colors.glass }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? '#fff' : colors.textMuted }}>{period.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {closures.length === 0 ? (
        <Text style={muted}>{t('fiscal.no_closures', 'Aucune période close pour l’instant. La première clôture apparaît le lendemain de la première vente.')}</Text>
      ) : closures.slice(0, 60).map((closure) => {
        const key = `${closure.period_type}-${closure.period_key}`;
        const methods = Object.entries(closure.totals?.by_payment_method || {})
          .map(([method, amount]) => `${PAYMENT_LABELS[method] || method} ${formatCurrency(Number(amount) || 0)}`)
          .join(' · ');
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{closure.period_key}</Text>
              <Text style={muted}>
                {t('fiscal.sales_count', 'Ventes : {{count}}', { count: closure.totals?.sales_count || 0 })}
                {' · '}
                {t('fiscal.cancellations', 'Annulations : {{count}}', { count: closure.totals?.cancellations_count || 0 })}
                {' · '}
                {t('fiscal.tax', 'TVA')} {formatCurrency(closure.totals?.tax_total || 0)}
              </Text>
              {methods ? <Text style={muted} numberOfLines={2}>{methods}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>{formatCurrency(closure.totals?.net_total || 0)}</Text>
              <TouchableOpacity onPress={() => void shareArchive(closure)} disabled={downloading === key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {downloading === key
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="download-outline" size={14} color={colors.primary} />}
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{t('fiscal.download', 'Archive')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}
