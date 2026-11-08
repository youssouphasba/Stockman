import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce } from '../services/api';
import {
  THEME_COLOR_SWATCHES,
  createAppearanceController,
  describeAppearanceStatus,
  describeThemeChange,
  type AppearanceView,
  type ThemeField,
} from '../utils/ecommerceAppearance';

type Props = {
  // Styles de l'écran Paramètres, pour garder la même apparence que les autres réglages du site.
  styles: Record<string, any>;
  onPublished?: () => void;
};

const INITIAL_VIEW: AppearanceView = { status: 'loading', state: null, base: {}, values: {}, busy: null, error: null, conflict: false, notice: null };

export default function EcommerceAppearanceEditor({ styles, onPublished }: Props) {
  const { colors, isDark } = useTheme();
  const [view, setView] = useState<AppearanceView>(INITIAL_VIEW);
  const controller = useRef<ReturnType<typeof createAppearanceController> | null>(null);
  const publishedRef = useRef(onPublished);
  publishedRef.current = onPublished;

  useEffect(() => {
    const current = createAppearanceController(ecommerce, setView);
    controller.current = current;
    void current.load();
    return () => {
      controller.current = null;
      current.dispose();
    };
  }, []);

  const state = view.state;
  const capabilities = state?.capabilities;
  const canEdit = !!capabilities && (capabilities.guided_edit || capabilities.structure_edit);
  const dirty = controller.current?.isDirty() || false;
  const hasDraft = !!state?.draft;
  const busy = view.busy !== null;
  // Contrastes AA dans les deux thèmes, comme pour la proposition de première configuration.
  const actionBackground = isDark ? colors.primary : colors.primaryDark;
  const actionText = isDark ? '#0F172A' : '#FFFFFF';
  const errorText = isDark ? '#FCA5A5' : colors.danger;

  async function openPreview() {
    const url = await controller.current?.preview();
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Aperçu privé', "Impossible d'ouvrir l'aperçu pour le moment.");
    }
  }

  function confirmPublish() {
    const changes = controller.current?.pendingChanges() || [];
    const details = changes.length ? changes.map(describeThemeChange).join('\n') : 'Le brouillon enregistré sera publié.';
    const disabledNote = state?.site_enabled ? '' : "\n\nLe site est désactivé : la publication n'active pas le site.";
    Alert.alert('Publier ces changements ?', `${details}${disabledNote}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Publier',
        onPress: () => {
          void controller.current?.publish().then((published) => {
            if (published) publishedRef.current?.();
          });
        },
      },
    ]);
  }

  function confirmDiscard() {
    Alert.alert(
      hasDraft ? 'Abandonner le brouillon ?' : 'Annuler les modifications ?',
      'Le site public ne changera pas.',
      [
        { text: 'Garder', style: 'cancel' },
        { text: hasDraft ? 'Abandonner' : 'Annuler les modifications', style: 'destructive', onPress: () => { void controller.current?.discard(); } },
      ],
    );
  }

  function renderField(field: ThemeField) {
    const value = view.values[field.id] || '';
    const disabled = !canEdit || busy;
    if (field.type === 'color') {
      const current = value.toUpperCase();
      const custom = !!current && !THEME_COLOR_SWATCHES.some((swatch) => swatch.value === current);
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={field.label}>
          {THEME_COLOR_SWATCHES.map((swatch) => {
            const active = current === swatch.value;
            return (
              <TouchableOpacity
                key={swatch.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled }}
                disabled={disabled}
                onPress={() => controller.current?.setValue(field.id, swatch.value)}
                style={[styles.chip, { flexDirection: 'row', alignItems: 'center', marginRight: 0, minHeight: 44 }, active && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              >
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: swatch.value, marginRight: 6 }} />
                <Text style={[styles.chipText, active && { color: colors.primary }]}>{swatch.label}</Text>
              </TouchableOpacity>
            );
          })}
          {custom && (
            <View style={[styles.chip, { flexDirection: 'row', alignItems: 'center', marginRight: 0, minHeight: 44, borderColor: colors.primary }]}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: current, marginRight: 6 }} />
              <Text style={styles.chipText}>Couleur actuelle {current}</Text>
            </View>
          )}
        </View>
      );
    }
    return (
      <TextInput
        style={[styles.input, field.multiline && styles.textArea, disabled && { opacity: 0.6 }]}
        value={value}
        editable={!disabled}
        maxLength={field.max_length}
        multiline={!!field.multiline}
        onChangeText={(text) => controller.current?.setValue(field.id, text)}
        placeholder={field.label}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={field.label}
      />
    );
  }

  return (
    <View style={{ borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
        <Text style={[styles.settingLabel, { flex: 1, fontWeight: '700' }]} accessibilityRole="header">Apparence du site</Text>
        {state && (
          <Text style={{ color: colors.text, fontSize: FontSize.xs, fontWeight: '700' }}>
            {hasDraft ? 'Brouillon non publié' : 'Version publiée'}
          </Text>
        )}
      </View>
      <Text style={styles.settingDesc}>
        Préparez vos changements en brouillon, vérifiez-les dans un aperçu privé, puis publiez-les. Le site public ne change qu'à la publication.
      </Text>

      {view.status === 'loading' && <Text style={styles.settingDesc}>Chargement de l'apparence du site...</Text>}

      {view.status === 'error' && (
        <View style={{ gap: Spacing.sm }}>
          <Text accessibilityRole="alert" style={{ color: errorText, fontWeight: '600' }}>{view.error?.message}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.outlineButton} onPress={() => { void controller.current?.load(); }}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.outlineButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {state && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={styles.settingDesc}>Modèle : {state.model.name}</Text>
          {!canEdit && (
            <Text style={styles.settingDesc}>L'apparence ne peut pas être modifiée pour le moment : votre accès est en lecture seule.</Text>
          )}
          {state.published.issues.length > 0 && (
            <Text style={{ color: errorText, fontSize: FontSize.xs, fontWeight: '600' }}>
              Une valeur publiée n'est pas compatible avec le format actuel : {state.published.issues[0].message}. Corrigez le champ concerné avant d'enregistrer.
            </Text>
          )}

          {state.fields.map((field) => (
            <View key={field.id} style={{ gap: 4 }}>
              <Text style={[styles.settingLabel, { fontSize: FontSize.sm, fontWeight: '600' }]}>{field.label}</Text>
              {field.hint ? <Text style={styles.settingDesc}>{field.hint}</Text> : null}
              {renderField(field)}
            </View>
          ))}

          {canEdit && <Text style={[styles.settingDesc, { fontWeight: '600' }]} accessibilityLiveRegion="polite">{describeAppearanceStatus(view)}</Text>}

          {view.error && view.status === 'ready' && (
            <View style={{ gap: Spacing.sm }}>
              <Text accessibilityRole="alert" style={{ color: errorText, fontWeight: '600' }}>{view.error.message}</Text>
              {view.conflict && (
                <TouchableOpacity accessibilityRole="button" style={styles.outlineButton} disabled={busy} onPress={() => { void controller.current?.reload(); }}>
                  <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                  <Text style={styles.outlineButtonText}>Recharger en gardant mes saisies</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {view.notice && <Text accessibilityRole="text" style={{ color: colors.text, fontWeight: '600' }}>{view.notice}</Text>}

          {canEdit && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !dirty }}
                style={[styles.outlineButton, { minHeight: 44 }, (busy || !dirty) && { opacity: 0.5 }]}
                disabled={busy || !dirty}
                onPress={() => { void controller.current?.saveDraft(); }}
              >
                <Ionicons name="save-outline" size={18} color={colors.primary} />
                <Text style={styles.outlineButtonText}>{view.busy === 'save' ? 'Enregistrement...' : 'Enregistrer le brouillon'}</Text>
              </TouchableOpacity>
              {capabilities?.preview && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  style={[styles.outlineButton, { minHeight: 44 }, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={() => { void openPreview(); }}
                >
                  <Ionicons name="eye-outline" size={18} color={colors.primary} />
                  <Text style={styles.outlineButtonText}>{view.busy === 'preview' ? "Préparation de l'aperçu..." : 'Prévisualiser'}</Text>
                </TouchableOpacity>
              )}
              {capabilities?.publish && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy || (!dirty && !hasDraft) }}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: actionBackground, opacity: busy || (!dirty && !hasDraft) ? 0.5 : 1 }}
                  disabled={busy || (!dirty && !hasDraft)}
                  onPress={confirmPublish}
                >
                  <Ionicons name="send-outline" size={18} color={actionText} />
                  <Text style={{ color: actionText, fontSize: FontSize.sm, fontWeight: '800' }}>{view.busy === 'publish' ? 'Publication...' : 'Publier'}</Text>
                </TouchableOpacity>
              )}
              {(hasDraft || dirty) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  style={[styles.outlineButton, { minHeight: 44 }, busy && { opacity: 0.5 }]}
                  disabled={busy}
                  onPress={confirmDiscard}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.primary} />
                  <Text style={styles.outlineButtonText}>{hasDraft ? 'Abandonner le brouillon' : 'Annuler les modifications'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
