import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ecommerce as ecommerceApi, EcommerceSite, EcommerceStats } from '../services/api';
import { formatCurrency } from '../utils/format';

export default function EcommerceOverview({ refreshKey, showStats = true }: { refreshKey: number; showStats?: boolean }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<EcommerceStats | null>(null);
  const [site, setSite] = useState<EcommerceSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [siteError, setSiteError] = useState(false);
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setSiteError(false);
    void (async () => {
      try {
        const result = await ecommerceApi.getStats();
        if (cancelled) return;
        setStats(result);
        setSite(result.site);
      } catch {
        if (cancelled) return;
        setStats(null);
        setError(true);
        try {
          const result = await ecommerceApi.getSite();
          if (!cancelled) setSite(result);
        } catch {
          if (!cancelled) setSiteError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey, retry, user?.user_id, user?.active_store_id]));

  const configure = () => router.push({ pathname: '/(tabs)/settings', params: { section: 'storeEcommerce' } });
  const actionStyle = { minHeight: 48, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingVertical: 12 };
  const metrics = stats ? [
    ['Commandes', String(stats.orders_total)],
    ['En attente', String(stats.pending_orders)],
    [`CA E-com · ${stats.period_days} jours`, formatCurrency(stats.revenue_30d, stats.site.currency || user?.currency)],
    [`Panier moyen · ${stats.period_days} jours`, formatCurrency(stats.average_order_30d, stats.site.currency || user?.currency)],
    [`Visites · ${stats.period_days} jours`, String(stats.visits_30d)],
    [`Conversion · ${stats.period_days} jours`, `${stats.conversion_rate_30d} %`],
  ] : [];

  return (
    <View style={{ marginBottom: 20, gap: 12 }}>
      {loading ? <ActivityIndicator accessibilityLabel="Chargement de la boutique en ligne" color={colors.primary} /> : <>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
          {siteError ? 'Statut du site indisponible' : site?.enabled ? 'Boutique en ligne active' : !site?.store_id ? 'Configurez votre boutique pour commencer.' : 'Votre boutique en ligne est désactivée.'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20 }}>
          {site?.enabled && site.site_url && <TouchableOpacity accessibilityRole="button" style={actionStyle} onPress={async () => {
            try {
              await Linking.openURL(`${site.site_url}${site.site_url.includes('?') ? '&' : '?'}preview=1`);
            } catch { Alert.alert('Erreur', "Impossible d'ouvrir la boutique en ligne."); }
          }}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, flexShrink: 1 }}>Voir mon site</Text>
          </TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" style={actionStyle} onPress={configure}>
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, flexShrink: 1 }}>Configurer ma boutique en ligne</Text>
          </TouchableOpacity>
        </View>
        {showStats && (error ? <View>
          <Text style={{ color: colors.textMuted }}>Statistiques indisponibles.</Text>
          <TouchableOpacity accessibilityRole="button" style={actionStyle} onPress={() => setRetry((value) => value + 1)}>
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary }}>Réessayer</Text>
          </TouchableOpacity>
        </View> : <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {metrics.map(([label, value]) => <View key={label} style={{ width: '50%', minHeight: 88, paddingVertical: 12, paddingRight: 12, borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2} style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 6 }}>{value}</Text>
          </View>)}
        </View>)}
      </>}
    </View>
  );
}
