import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce } from '../services/api';
import { mediaUploadError, parseThemeError, type ThemeMediaItem } from '../utils/ecommerceAppearance';
import { useTranslation } from 'react-i18next';
import KeyboardOverlay from './KeyboardOverlay';

type Props = {
  kind: 'logo' | 'image';
  siteSlug: string;
  title: string;
  selectedId: string | null;
  canEdit: boolean;
  styles: Record<string, any>;
  onSelect: (item: ThemeMediaItem) => void;
  onClose: () => void;
};

// Le parent n'affiche ce composant que lorsqu'il est ouvert (rendu conditionnel exigé sur iOS).
export default function EcommerceMediaPicker({ kind, siteSlug, title, selectedId, canEdit, styles, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<ThemeMediaItem[] | null>(null);
  const [usage, setUsage] = useState<{ total: number; limit: number } | null>(null);
  const [busy, setBusy] = useState<string | null>('load');
  const [error, setError] = useState<string | null>(null);
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  const errorText = isDark ? '#FCA5A5' : colors.danger;

  const load = useCallback(async () => {
    setBusy('load');
    setError(null);
    try {
      const result = await ecommerce.listMedia(kind);
      if (!mounted.current) return;
      setItems(result.media);
      setUsage({ total: result.total, limit: result.limit });
    } catch (err) {
      if (mounted.current) setError(parseThemeError(err, t('ecommerce_media.impossible_de_charger_vos_images_verifiez')).message);
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [kind]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [load]);

  async function importImage() {
    if (busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      // Un logo carré s'affiche au mieux dans l'en-tête de la boutique.
      allowsEditing: kind === 'logo',
      aspect: kind === 'logo' ? [1, 1] : undefined,
      quality: 0.85,
      base64: true,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    const asset = !result.canceled ? result.assets[0] : null;
    if (!asset?.base64) return;
    setBusy('upload');
    setError(null);
    try {
      const item = await ecommerce.uploadMedia({
        site_slug: siteSlug,
        kind,
        data: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`,
      });
      if (!mounted.current) return;
      onSelect(item);
    } catch (err) {
      if (mounted.current) setError(parseThemeError(err, mediaUploadError()).message);
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  async function saveAlt(item: ThemeMediaItem) {
    const draft = altDrafts[item.media_id];
    if (draft === undefined || draft.trim() === item.alt) return;
    setBusy(`alt:${item.media_id}`);
    setError(null);
    try {
      const updated = await ecommerce.updateMediaAlt(item.media_id, { site_slug: siteSlug, alt: draft });
      if (!mounted.current) return;
      setItems((current) => (current || []).map((entry) => (entry.media_id === updated.media_id ? updated : entry)));
      setAltDrafts((current) => {
        const next = { ...current };
        delete next[item.media_id];
        return next;
      });
    } catch (err) {
      if (mounted.current) setError(parseThemeError(err, t('ecommerce_media.impossible_d_enregistrer_la_description_de')).message);
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  function confirmDelete(item: ThemeMediaItem) {
    Alert.alert(t('ecommerce_media.supprimer_cette_image'), t('ecommerce_media.elle_sera_retiree_de_votre_bibliotheque'), [
      { text: t('ecommerce_media.annuler'), style: 'cancel' },
      {
        text: t('ecommerce_media.supprimer'),
        style: 'destructive',
        onPress: async () => {
          setBusy(`delete:${item.media_id}`);
          setError(null);
          try {
            await ecommerce.deleteMedia(item.media_id, { site_slug: siteSlug });
            if (!mounted.current) return;
            setItems((current) => (current || []).filter((entry) => entry.media_id !== item.media_id));
            setUsage((current) => (current ? { ...current, total: Math.max(0, current.total - 1) } : current));
          } catch (err) {
            if (mounted.current) setError(parseThemeError(err, t('ecommerce_media.impossible_de_supprimer_cette_image')).message);
          } finally {
            if (mounted.current) setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardOverlay style={{ flex: 1, backgroundColor: colors.bgDark, paddingTop: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: FontSize.lg, fontWeight: '800' }} accessibilityRole="header">{title}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('ecommerce_media.fermer')} onPress={onClose} style={{ padding: Spacing.sm, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
          <Text style={styles.settingDesc}>
            {t('ecommerce_media.formats_acceptes_jpeg_png_ou_webp')}
          </Text>
          {canEdit && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ disabled: !!busy }}
              disabled={!!busy}
              onPress={() => { void importImage(); }}
              style={[styles.outlineButton, { minHeight: 48 }, !!busy && { opacity: 0.5 }]}
            >
              {busy === 'upload' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />}
              <Text style={styles.outlineButtonText}>{busy === 'upload' ? 'Import et optimisation...' : t('ecommerce_media.importer_une_image')}</Text>
            </TouchableOpacity>
          )}
          {error && <Text accessibilityRole="alert" style={{ color: errorText, fontWeight: '600' }}>{error}</Text>}
          {busy === 'load' && <ActivityIndicator color={colors.primary} />}
          {items && items.length === 0 && busy !== 'load' && (
            <Text style={styles.settingDesc}>{t('ecommerce_media.aucune_image_dans_votre_bibliotheque_pour')}</Text>
          )}
          {items?.map((item) => {
            const selected = item.media_id === selectedId;
            const altValue = altDrafts[item.media_id] ?? item.alt;
            return (
              <View
                key={item.media_id}
                style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: selected ? colors.primary : colors.divider, backgroundColor: colors.card }}
              >
                {item.thumbnail_url ? (
                  <Image source={{ uri: item.thumbnail_url }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" accessibilityLabel={item.alt || t('ecommerce_media.image_de_la_bibliotheque')} />
                ) : null}
                <View style={{ flex: 1, gap: 4 }}>
                  <TextInput
                    value={altValue}
                    editable={canEdit && !busy}
                    maxLength={200}
                    onChangeText={(text) => setAltDrafts((current) => ({ ...current, [item.media_id]: text }))}
                    onEndEditing={() => { void saveAlt(item); }}
                    placeholder={t('ecommerce_media.description_de_l_image_accessibilite')}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { paddingVertical: Spacing.sm }]}
                    accessibilityLabel={t('ecommerce_media.description_de_l_image')}
                  />
                  <Text style={styles.settingDesc}>{item.width} × {item.height} {t('ecommerce_media.px')}{item.in_use ? t('ecommerce_media.utilisee_sur_le_site') : ''}</Text>
                </View>
                <View style={{ gap: Spacing.xs }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={selected ? 'Image choisie' : 'Utiliser cette image'}
                    disabled={!!busy || !canEdit}
                    onPress={() => onSelect(item)}
                    style={[styles.outlineButton, { minHeight: 40 }, (!!busy || !canEdit) && { opacity: 0.5 }]}
                  >
                    <Text style={styles.outlineButtonText}>{selected ? 'Choisie' : 'Utiliser'}</Text>
                  </TouchableOpacity>
                  {canEdit && !item.in_use && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t('ecommerce_media.supprimer_cette_image_2')}
                      disabled={!!busy}
                      onPress={() => confirmDelete(item)}
                      style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={errorText} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
          {usage && <Text style={styles.settingDesc}>{t('ecommerce_media.library_usage', { count: usage.total, limit: usage.limit })}</Text>}
        </ScrollView>
      </KeyboardOverlay>
    </Modal>
  );
}
