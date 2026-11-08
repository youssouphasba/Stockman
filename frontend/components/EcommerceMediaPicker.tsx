import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce } from '../services/api';
import { MEDIA_UPLOAD_ERROR, parseThemeError, type ThemeMediaItem } from '../utils/ecommerceAppearance';

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
      if (mounted.current) setError(parseThemeError(err, "Impossible de charger vos images. Vérifiez votre connexion puis réessayez.").message);
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
      if (mounted.current) setError(parseThemeError(err, MEDIA_UPLOAD_ERROR).message);
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
      if (mounted.current) setError(parseThemeError(err, "Impossible d'enregistrer la description de l'image.").message);
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  function confirmDelete(item: ThemeMediaItem) {
    Alert.alert('Supprimer cette image ?', 'Elle sera retirée de votre bibliothèque. Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
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
            if (mounted.current) setError(parseThemeError(err, "Impossible de supprimer cette image.").message);
          } finally {
            if (mounted.current) setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark, paddingTop: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
          <Text style={{ flex: 1, color: colors.text, fontSize: FontSize.lg, fontWeight: '800' }} accessibilityRole="header">{title}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={{ padding: Spacing.sm, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
          <Text style={styles.settingDesc}>
            Formats acceptés : JPEG, PNG ou WebP, 8 Mo au maximum. Les images sont optimisées automatiquement et leurs métadonnées sont supprimées.
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
              <Text style={styles.outlineButtonText}>{busy === 'upload' ? 'Import et optimisation...' : 'Importer une image'}</Text>
            </TouchableOpacity>
          )}
          {error && <Text accessibilityRole="alert" style={{ color: errorText, fontWeight: '600' }}>{error}</Text>}
          {busy === 'load' && <ActivityIndicator color={colors.primary} />}
          {items && items.length === 0 && busy !== 'load' && (
            <Text style={styles.settingDesc}>Aucune image dans votre bibliothèque pour le moment.</Text>
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
                  <Image source={{ uri: item.thumbnail_url }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" accessibilityLabel={item.alt || 'Image de la bibliothèque'} />
                ) : null}
                <View style={{ flex: 1, gap: 4 }}>
                  <TextInput
                    value={altValue}
                    editable={canEdit && !busy}
                    maxLength={200}
                    onChangeText={(text) => setAltDrafts((current) => ({ ...current, [item.media_id]: text }))}
                    onEndEditing={() => { void saveAlt(item); }}
                    placeholder="Description de l'image (accessibilité)"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { paddingVertical: Spacing.sm }]}
                    accessibilityLabel="Description de l'image"
                  />
                  <Text style={styles.settingDesc}>{item.width} × {item.height} px{item.in_use ? ' · utilisée sur le site' : ''}</Text>
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
                      accessibilityLabel="Supprimer cette image"
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
          {usage && <Text style={styles.settingDesc}>Bibliothèque du site : {usage.total} image{usage.total > 1 ? 's' : ''} sur {usage.limit} possibles.</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}
