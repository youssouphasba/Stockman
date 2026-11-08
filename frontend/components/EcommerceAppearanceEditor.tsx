import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '../constants/theme';
import { ecommerce } from '../services/api';
import EcommerceMediaPicker from './EcommerceMediaPicker';
import {
  THEME_COLOR_SWATCHES,
  activeThemePreset,
  brandContrastWarning,
  createAppearanceController,
  describeAppearanceStatus,
  describeThemeChange,
  groupThemeFields,
  normalizeHexColor,
  type AppearanceView,
  type ThemeField,
  type ThemeMediaItem,
  type ThemeModelSummary,
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
  const [pickerField, setPickerField] = useState<ThemeField | null>(null);
  // Images importées pendant la session, affichées avant même l'enregistrement du brouillon.
  const [mediaCache, setMediaCache] = useState<Record<string, ThemeMediaItem>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  // Saisie en cours d'une couleur personnalisée, appliquée dès qu'elle forme un code valide.
  const [hexDrafts, setHexDrafts] = useState<Record<string, string>>({});
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
  const groups = state ? groupThemeFields(state.fields) : [];
  const contrastWarning = state ? brandContrastWarning(view.values) : null;
  const presets = state?.presets || [];
  const activePreset = state ? activeThemePreset(state.fields, view.values, presets) : null;

  // Résumé lisible d'un style prêt à l'emploi, à partir des libellés du registre.
  function describePreset(settings: Record<string, string>) {
    return Object.entries(settings)
      .map(([key, value]) => state?.fields.find((field) => field.scope === 'global' && field.key === key)?.options?.find((option) => option.value === value)?.label)
      .filter(Boolean)
      .join(' · ');
  }

  async function openUrl(url: string | null | undefined) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Aperçu privé', "Impossible d'ouvrir l'aperçu pour le moment.");
    }
  }

  function confirmPublish() {
    const changes = controller.current?.pendingChanges() || [];
    const modelChange = state && state.draft && state.draft.document.model_id !== state.published.model_id
      ? `Nouveau modèle : ${state.model.name}.\n` : '';
    const details = changes.length ? changes.slice(0, 12).map(describeThemeChange).join('\n') : 'Le brouillon enregistré sera publié.';
    const more = changes.length > 12 ? `\n… et ${changes.length - 12} autre${changes.length - 12 > 1 ? 's' : ''} modification${changes.length - 12 > 1 ? 's' : ''}.` : '';
    const disabledNote = state?.site_enabled ? '' : "\n\nLe site est désactivé : la publication n'active pas le site.";
    Alert.alert('Publier ces changements ?', `${modelChange}${details}${more}${disabledNote}`, [
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

  function confirmModel(model: ThemeModelSummary) {
    const replaceNote = hasDraft || dirty ? '\n\nLe brouillon en cours et vos modifications non enregistrées seront remplacés.' : '';
    Alert.alert(
      `Choisir le modèle ${model.name} ?`,
      `Un brouillon est créé avec vos textes, votre logo et votre couleur. Le site public ne change qu'à la publication.${replaceNote}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Choisir', onPress: () => { void controller.current?.changeModel(model.id); } },
      ],
    );
  }

  function renderField(field: ThemeField) {
    const value = view.values[field.id] || '';
    const disabled = !canEdit || busy;
    const setValue = (next: string) => controller.current?.setValue(field.id, next);
    if (field.type === 'media_id') {
      const item = value ? mediaCache[value] || state?.media?.[value] : null;
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm }}>
          <View style={{ width: 64, height: 64, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}>
            {item?.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} style={{ width: 64, height: 64 }} resizeMode="cover" accessibilityLabel={item.alt || field.label} />
            ) : (
              <Ionicons name="image-outline" size={24} color={colors.textMuted} accessibilityLabel={value ? 'Image indisponible' : 'Aucune image'} />
            )}
          </View>
          {canEdit && (
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => setPickerField(field)} style={[styles.outlineButton, { minHeight: 44 }, disabled && { opacity: 0.5 }]}>
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={styles.outlineButtonText}>{value ? "Changer l'image" : 'Choisir une image'}</Text>
            </TouchableOpacity>
          )}
          {canEdit && !!value && (
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => setValue('')} style={[styles.outlineButton, { minHeight: 44 }, disabled && { opacity: 0.5 }]}>
              <Text style={styles.outlineButtonText}>Retirer</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    if (field.type === 'color' || field.type === 'enum') {
      const options = field.type === 'color' ? THEME_COLOR_SWATCHES.map((swatch) => ({ value: swatch.value, label: swatch.label })) : field.options || [];
      const current = field.type === 'color' ? value.toUpperCase() : value;
      const custom = field.type === 'color' && !!current && !options.some((option) => option.value === current);
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={field.label}>
          {options.map((option) => {
            const active = current === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled }}
                disabled={disabled}
                onPress={() => setValue(option.value)}
                style={[styles.chip, { flexDirection: 'row', alignItems: 'center', marginRight: 0, minHeight: 44 }, active && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              >
                {field.type === 'color' && <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: option.value, marginRight: 6 }} />}
                <Text style={[styles.chipText, active && { color: colors.primary }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
          {custom && (
            <View style={[styles.chip, { flexDirection: 'row', alignItems: 'center', marginRight: 0, minHeight: 44, borderColor: colors.primary }]}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: current, marginRight: 6 }} />
              <Text style={styles.chipText}>Couleur actuelle {current}</Text>
            </View>
          )}
          {field.type === 'color' && canEdit && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, width: '100%' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.divider, backgroundColor: normalizeHexColor(hexDrafts[field.id] ?? current) || 'transparent' }} />
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }, disabled && { opacity: 0.6 }]}
                value={hexDrafts[field.id] ?? current}
                editable={!disabled}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                placeholder="Couleur personnalisée, par exemple #0E7490"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={`${field.label} : couleur personnalisée au format #RRGGBB`}
                onChangeText={(text) => {
                  setHexDrafts((drafts) => ({ ...drafts, [field.id]: text }));
                  const color = normalizeHexColor(text);
                  if (color) setValue(color);
                }}
                onEndEditing={() => setHexDrafts((drafts) => {
                  const next = { ...drafts };
                  delete next[field.id];
                  return next;
                })}
              />
            </View>
          )}
        </View>
      );
    }
    if (field.source === 'categories') {
      const categories = state?.categories || [];
      const missing = !!value && !categories.includes(value);
      if (!categories.length && !value) {
        return <Text style={styles.settingDesc}>Aucune catégorie dans votre catalogue pour le moment : classez vos produits pour utiliser cette section.</Text>;
      }
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={field.label}>
          {[...(missing ? [value] : []), ...categories].map((category) => {
            const active = value === category;
            return (
              <TouchableOpacity
                key={category}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled }}
                disabled={disabled}
                onPress={() => setValue(category)}
                style={[styles.chip, { marginRight: 0, minHeight: 44, justifyContent: 'center' }, active && { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              >
                <Text style={[styles.chipText, active && { color: colors.primary }]}>{category}{missing && category === value ? ' (introuvable)' : ''}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    if (field.type === 'boolean') {
      const checked = value === 'true';
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.settingDesc}>{checked ? 'Activé' : 'Désactivé'}</Text>
          <Switch
            value={checked}
            disabled={disabled}
            onValueChange={(next) => setValue(next ? 'true' : 'false')}
            trackColor={{ false: colors.divider, true: colors.primary + '66' }}
            thumbColor={checked ? colors.primary : colors.textMuted}
            accessibilityLabel={field.label}
          />
        </View>
      );
    }
    if (field.type === 'integer') {
      const min = field.min ?? 0;
      const max = field.max ?? 99;
      const number = value ? Number(value) : min;
      const step = (delta: number) => setValue(String(Math.min(max, Math.max(min, number + delta))));
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Diminuer : ${field.label}`} disabled={disabled || number <= min} onPress={() => step(-1)} style={[styles.outlineButton, { minHeight: 44, minWidth: 44 }, (disabled || number <= min) && { opacity: 0.4 }]}>
            <Ionicons name="remove" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: FontSize.md, fontWeight: '700', minWidth: 32, textAlign: 'center' }} accessibilityLiveRegion="polite">{number}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Augmenter : ${field.label}`} disabled={disabled || number >= max} onPress={() => step(1)} style={[styles.outlineButton, { minHeight: 44, minWidth: 44 }, (disabled || number >= max) && { opacity: 0.4 }]}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.settingDesc}>de {min} à {max}</Text>
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
        onChangeText={setValue}
        placeholder={field.label}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={field.label}
      />
    );
  }

  const currentModel = state?.model.id;
  const showGallery = !!state && !!capabilities?.change_model && state.models.length > 1;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.divider, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
        <Text style={[styles.settingLabel, { flex: 1, fontWeight: '700' }]} accessibilityRole="header">Apparence du site</Text>
        {state && <Text style={{ color: colors.text, fontSize: FontSize.xs, fontWeight: '700' }}>{hasDraft ? 'Brouillon non publié' : 'Version publiée'}</Text>}
      </View>
      <Text style={styles.settingDesc}>
        Choisissez un modèle, préparez vos changements en brouillon, vérifiez-les dans un aperçu privé, puis publiez-les. Le site public ne change qu'à la publication.
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
          {showGallery && (
            <View style={{ gap: Spacing.sm }}>
              <Text style={[styles.settingLabel, { fontSize: FontSize.sm, fontWeight: '700' }]}>Modèles</Text>
              {state.models.map((model) => {
                const current = model.id === currentModel;
                return (
                  <View key={model.id} style={{ borderWidth: 1, borderColor: current ? colors.primary : colors.divider, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: 6, backgroundColor: current ? colors.primary + '12' : 'transparent' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ color: colors.text, fontSize: FontSize.md, fontWeight: '800' }}>{model.name}</Text>
                      {model.published && <Text style={{ color: colors.text, fontSize: FontSize.xs, fontWeight: '700' }}>· En ligne</Text>}
                      {model.draft && <Text style={{ color: colors.text, fontSize: FontSize.xs, fontWeight: '700' }}>· Brouillon</Text>}
                    </View>
                    <Text style={styles.settingDesc}>{model.description}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                      {capabilities?.preview && (
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Aperçu du modèle ${model.name}`} disabled={busy} onPress={() => { void controller.current?.previewModel(model.id).then(openUrl); }} style={[styles.outlineButton, { minHeight: 40 }, busy && { opacity: 0.5 }]}>
                          <Ionicons name="eye-outline" size={16} color={colors.primary} />
                          <Text style={styles.outlineButtonText}>Aperçu</Text>
                        </TouchableOpacity>
                      )}
                      {current ? (
                        <Text style={[styles.settingDesc, { alignSelf: 'center', fontWeight: '700' }]}>Modèle en cours</Text>
                      ) : (
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choisir le modèle ${model.name}`} disabled={busy} onPress={() => confirmModel(model)} style={[styles.outlineButton, { minHeight: 40 }, busy && { opacity: 0.5 }]}>
                          <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                          <Text style={styles.outlineButtonText}>{view.busy === 'model' ? 'Préparation...' : 'Choisir ce modèle'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.settingDesc}>Modèle {hasDraft ? 'du brouillon' : 'publié'} : {state.model.name}</Text>
          {!canEdit && <Text style={styles.settingDesc}>L'apparence ne peut pas être modifiée pour le moment : votre accès est en lecture seule.</Text>}
          {state.published.issues.length > 0 && (
            <Text style={{ color: errorText, fontSize: FontSize.xs, fontWeight: '600' }}>
              Une valeur publiée n'est pas compatible avec le format actuel : {state.published.issues[0].message}. Corrigez le champ concerné avant d'enregistrer.
            </Text>
          )}
          {contrastWarning && <Text style={{ color: colors.text, fontSize: FontSize.xs, fontWeight: '600' }}>{contrastWarning}</Text>}

          {canEdit && presets.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.sm, gap: Spacing.sm }}>
              <Text style={[styles.settingLabel, { fontWeight: '700' }]}>Styles prêts à l'emploi</Text>
              <Text style={styles.settingDesc}>Un geste change l'ambiance, la typographie, la forme et les animations. Vos textes, vos images et votre couleur de marque restent les mêmes.</Text>
              <View style={{ gap: Spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel="Styles prêts à l'emploi">
                {presets.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active, disabled: busy }}
                      accessibilityLabel={`Style ${preset.label}`}
                      disabled={busy}
                      onPress={() => controller.current?.applyPreset(preset.id)}
                      style={{ minHeight: 48, borderWidth: 1, borderColor: active ? colors.primary : colors.divider, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: active ? colors.primary + '14' : 'transparent', flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
                    >
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? colors.primary : colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: FontSize.md, fontWeight: '700' }}>{preset.label}</Text>
                        <Text style={styles.settingDesc}>{describePreset(preset.settings)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {groups.map((group, index) => {
            const open = openGroups[group.id] ?? index === 0;
            return (
              <View key={group.id} style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: Spacing.sm, gap: Spacing.sm }}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setOpenGroups((current) => ({ ...current, [group.id]: !open }))}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}
                >
                  <Text style={[styles.settingLabel, { flex: 1, fontWeight: '700' }]}>{group.label}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {open && group.fields.map((field) => (
                  <View key={field.id} style={{ gap: 4 }}>
                    <Text style={[styles.settingLabel, { fontSize: FontSize.sm, fontWeight: '600' }]}>{field.label}</Text>
                    {field.hint ? <Text style={styles.settingDesc}>{field.hint}</Text> : null}
                    {renderField(field)}
                  </View>
                ))}
              </View>
            );
          })}

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
              <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || !dirty }} style={[styles.outlineButton, { minHeight: 44 }, (busy || !dirty) && { opacity: 0.5 }]} disabled={busy || !dirty} onPress={() => { void controller.current?.saveDraft(); }}>
                <Ionicons name="save-outline" size={18} color={colors.primary} />
                <Text style={styles.outlineButtonText}>{view.busy === 'save' ? 'Enregistrement...' : 'Enregistrer le brouillon'}</Text>
              </TouchableOpacity>
              {capabilities?.preview && (
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} style={[styles.outlineButton, { minHeight: 44 }, busy && { opacity: 0.5 }]} disabled={busy} onPress={() => { void controller.current?.preview().then(openUrl); }}>
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
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy }} style={[styles.outlineButton, { minHeight: 44 }, busy && { opacity: 0.5 }]} disabled={busy} onPress={confirmDiscard}>
                  <Ionicons name="trash-outline" size={18} color={colors.primary} />
                  <Text style={styles.outlineButtonText}>{hasDraft ? 'Abandonner le brouillon' : 'Annuler les modifications'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {pickerField && state && (
        <EcommerceMediaPicker
          kind={pickerField.media_kind || 'image'}
          siteSlug={state.site_slug}
          title={pickerField.label}
          selectedId={view.values[pickerField.id] || null}
          canEdit={canEdit}
          styles={styles}
          onSelect={(item) => {
            setMediaCache((current) => ({ ...current, [item.media_id]: item }));
            controller.current?.setValue(pickerField.id, item.media_id);
            setPickerField(null);
          }}
          onClose={() => setPickerField(null)}
        />
      )}
    </View>
  );
}
