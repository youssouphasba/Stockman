import React from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';

export type StockChangeDirection = 'in' | 'out';

// Raisons d'un changement de stock, identiques côté serveur (STOCK_CHANGE_KINDS).
// Une vente devient une vraie vente (chiffre d'affaires) ; les autres sorties comptent dans les pertes.
export const STOCK_CHANGE_OPTIONS: Record<StockChangeDirection, { kind: string; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[]> = {
  in: [
    { kind: 'restock', labelKey: 'stock.reasons.restock', icon: 'cube-outline' },
    { kind: 'customer_return', labelKey: 'stock.reasons.customer_return', icon: 'return-down-back-outline' },
    { kind: 'inventory_adjustment_in', labelKey: 'stock.reasons.inventory_adjustment', icon: 'clipboard-outline' },
  ],
  out: [
    { kind: 'sale', labelKey: 'stock.reasons.sale_from_product', icon: 'cart-outline' },
    { kind: 'loss_damage', labelKey: 'stock.reasons.loss_damage', icon: 'trash-outline' },
    { kind: 'expired', labelKey: 'stock.reasons.expired', icon: 'time-outline' },
    { kind: 'theft', labelKey: 'stock.reasons.theft', icon: 'alert-circle-outline' },
    { kind: 'internal_use', labelKey: 'stock.reasons.internal_use', icon: 'home-outline' },
    { kind: 'inventory_adjustment_out', labelKey: 'stock.reasons.inventory_adjustment', icon: 'clipboard-outline' },
    { kind: 'other_out', labelKey: 'stock.reasons.other', icon: 'ellipsis-horizontal-outline' },
  ],
};

export function StockChangeReasonChips({ direction, value, onChange }: {
  direction: StockChangeDirection;
  value: string | null;
  onChange: (kind: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const accent = direction === 'in' ? colors.success : colors.warning;
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {STOCK_CHANGE_OPTIONS[direction].map((option) => {
          const selected = value === option.kind;
          return (
            <TouchableOpacity
              key={option.kind}
              onPress={() => onChange(option.kind)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
                borderColor: selected ? accent : colors.glassBorder,
                backgroundColor: selected ? accent + '22' : colors.glass,
              }}
            >
              <Ionicons name={option.icon} size={14} color={selected ? accent : colors.textMuted} />
              <Text style={{ color: selected ? accent : colors.text, fontSize: FontSize.sm, fontWeight: selected ? '700' : '500' }}>
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value === 'sale' && (
        <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 8 }}>{t('products.stock_change_sale_hint')}</Text>
      )}
    </View>
  );
}

// Fenêtre ouverte à l'enregistrement d'une fiche produit dont la quantité a changé.
export function StockChangeReasonModal({ visible, direction, subtitle, onSelect, onClose }: {
  visible: boolean;
  direction: StockChangeDirection;
  subtitle: string;
  onSelect: (kind: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [kind, setKind] = React.useState<string | null>(null);

  React.useEffect(() => { if (visible) setKind(null); }, [visible, direction]);

  if (!visible) return null;
  const accent = direction === 'in' ? colors.success : colors.warning;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: Spacing.lg }}>
        <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.bgMid, borderRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%' }}>
          <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '800' }}>{t('products.stock_change_title')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 6, marginBottom: Spacing.md }}>{subtitle}</Text>
          <ScrollView style={{ flexGrow: 0 }}>
            <StockChangeReasonChips direction={direction} value={kind} onChange={setKind} />
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, borderRadius: 999, borderWidth: 1, borderColor: colors.glassBorder, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!kind}
              onPress={() => { if (kind) onSelect(kind); }}
              style={{ flex: 1, borderRadius: 999, backgroundColor: accent, paddingVertical: 12, alignItems: 'center', opacity: kind ? 1 : 0.4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
