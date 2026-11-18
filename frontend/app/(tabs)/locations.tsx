import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import EnterpriseGate from '../../components/EnterpriseGate';
import AccessDenied from '../../components/AccessDenied';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import { Location, locations as locationsApi } from '../../services/api';
import i18n from '../../services/i18n';

type LevelDraft = {
  id: string;
  type: string;
  mode: 'range' | 'names';
  start: string;
  count: string;
  prefix: string;
  suffix: string;
  names: string;
};

type StructureTemplate = {
  id: string;
  label: string;
  description: string;
  levels: Array<Partial<LevelDraft>>;
};

// Types de niveau proposés : traduits dans la langue de l'application, le commerçant peut les renommer.
const LEVEL_TYPE_DEFAULTS: Record<string, string> = { allee: 'Allée', zone: 'Zone', rayon: 'Rayon', niveau: 'Niveau', etagere: 'Étagère', casier: 'Casier', bloc: 'Bloc' };
const levelType = (key: string) => i18n.t(`locations_screen.level_${key}`, { defaultValue: LEVEL_TYPE_DEFAULTS[key] });
const COMMON_LEVEL_TYPE_KEYS = ['allee', 'zone', 'rayon', 'niveau', 'etagere', 'casier', 'bloc'];

const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'warehouse',
    get label() { return i18n.t('locations_screen.allees_niveaux_etageres', { defaultValue: "Allées / niveaux / étagères" }); },
    get description() { return i18n.t('locations_screen.structure_classique_pour_entrepot_reserve_ou', { defaultValue: "Structure classique pour entrepôt, réserve ou magasin structuré." }); },
    levels: [
      { get type() { return levelType('allee'); }, mode: 'range', start: '1', count: '4' },
      { get type() { return levelType('niveau'); }, mode: 'range', start: '1', count: '3' },
      { get type() { return levelType('etagere'); }, mode: 'range', start: '1', count: '6' },
    ],
  },
  {
    id: 'zones',
    get label() { return i18n.t('locations_screen.zones_rayons', { defaultValue: "Zones / rayons" }); },
    get description() { return i18n.t('locations_screen.pratique_pour_organiser_de_grands_espaces', { defaultValue: "Pratique pour organiser de grands espaces en secteurs." }); },
    levels: [
      { get type() { return levelType('zone'); }, mode: 'range', start: '1', count: '3' },
      { get type() { return levelType('rayon'); }, mode: 'range', start: '1', count: '8' },
    ],
  },
  {
    id: 'blocks',
    get label() { return i18n.t('locations_screen.blocs_casiers', { defaultValue: "Blocs / casiers" }); },
    get description() { return i18n.t('locations_screen.simple_et_rapide_pour_une_reserve', { defaultValue: "Simple et rapide pour une réserve ou un petit dépôt." }); },
    levels: [
      { get type() { return levelType('bloc'); }, mode: 'range', start: '1', count: '5' },
      { get type() { return levelType('casier'); }, mode: 'range', start: '1', count: '10' },
    ],
  },
];

const createLevel = (seed?: Partial<LevelDraft>): LevelDraft => ({
  id: `lvl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  type: seed?.type || '',
  mode: seed?.mode || 'range',
  start: seed?.start || '1',
  count: seed?.count || '',
  prefix: seed?.prefix || '',
  suffix: seed?.suffix || '',
  names: seed?.names || '',
});

const parseNames = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatGeneratedName = (level: LevelDraft, index: number) => {
  const start = Number(level.start || '1');
  const labelPrefix = level.prefix.trim() || (level.type.trim() ? `${level.type.trim()} ` : '');
  return `${labelPrefix}${start + index}${level.suffix.trim()}`.trim();
};

export default function LocationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const styles = getStyles(colors);

  const effectivePlan = user?.effective_plan || user?.plan;
  const hasEnterprisePlan = isSuperAdmin || effectivePlan === 'enterprise';
  const canRead = hasPermission('stock', 'read');
  const canWrite = hasPermission('stock', 'write');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [levels, setLevels] = useState<LevelDraft[]>([
    createLevel({ type: levelType('allee'), mode: 'range', start: '1', count: '3' }),
    createLevel({ type: levelType('niveau'), mode: 'range', start: '1', count: '2' }),
    createLevel({ type: levelType('etagere'), mode: 'range', start: '1', count: '4' }),
  ]);
  const [rootParentId, setRootParentId] = useState('');
  const [reactivateExisting, setReactivateExisting] = useState(true);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState('');
  const [manualParentId, setManualParentId] = useState('');
  const [editing, setEditing] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editParentId, setEditParentId] = useState('');

  const loadLocations = useCallback(async () => {
    if (!hasEnterprisePlan || !canRead) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLocations(await locationsApi.list());
    } catch (err: any) {
      Alert.alert(t('common.error', 'Erreur'), err?.message || t('locations.load_error', 'Impossible de charger les emplacements.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canRead, hasEnterprisePlan]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void loadLocations();
  }, [loadLocations]));

  const locationMap = useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach((location) => map.set(location.location_id, location));
    return map;
  }, [locations]);

  const getPath = useCallback((locationId?: string | null) => {
    if (!locationId) return '';
    const parts: string[] = [];
    let cursor = locationMap.get(locationId);
    let guard = 0;
    while (cursor && guard < 12) {
      parts.push(cursor.name);
      cursor = cursor.parent_id ? locationMap.get(cursor.parent_id) : undefined;
      guard += 1;
    }
    return parts.reverse().join(' / ');
  }, [locationMap]);

  const activeLocations = useMemo(
    () => locations.filter((location) => location.is_active !== false),
    [locations],
  );

  const visibleLocations = useMemo(() => {
    const list = showArchived ? locations : activeLocations;
    return [...list].sort((a, b) => getPath(a.location_id).localeCompare(getPath(b.location_id), 'fr'));
  }, [activeLocations, getPath, locations, showArchived]);

  const parentChoices = useMemo(
    () => activeLocations.map((location) => ({ id: location.location_id, label: getPath(location.location_id) || location.name })),
    [activeLocations, getPath],
  );

  const getLevelEntryCount = useCallback((level: LevelDraft) => {
    if (level.mode === 'names') {
      return parseNames(level.names).length;
    }
    const count = Number(level.count);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }, []);

  const getLevelPreview = useCallback((level: LevelDraft) => {
    if (level.mode === 'names') {
      return parseNames(level.names).slice(0, 3);
    }
    const count = Math.min(getLevelEntryCount(level), 3);
    return Array.from({ length: count }, (_, index) => formatGeneratedName(level, index));
  }, [getLevelEntryCount]);

  const totalGeneratedCount = useMemo(() => {
    if (!levels.length) return 0;
    return levels.reduce((accumulator, level) => {
      const count = getLevelEntryCount(level);
      if (!count) return 0;
      return accumulator * count;
    }, 1);
  }, [getLevelEntryCount, levels]);

  const examplePath = useMemo(() => {
    const items = levels
      .map((level) => getLevelPreview(level)[0])
      .filter(Boolean);
    return items.join(' / ');
  }, [getLevelPreview, levels]);

  const generationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!levels.length) {
      issues.push(t('locations.add_level', 'Ajoutez au moins un niveau.'));
      return issues;
    }
    levels.forEach((level, index) => {
      const n = index + 1;
      if (!level.type.trim()) {
        issues.push(t('locations.level_needs_type', { defaultValue: 'Le niveau {{n}} doit avoir un type.', n }));
      }
      if (level.mode === 'range') {
        const start = Number(level.start);
        const count = Number(level.count);
        if (!Number.isFinite(start) || start < 0) {
          issues.push(t('locations.level_needs_start', { defaultValue: 'Le niveau {{n}} doit avoir un premier numéro valide.', n }));
        }
        if (!Number.isFinite(count) || count <= 0) {
          issues.push(t('locations.level_needs_count', { defaultValue: 'Le niveau {{n}} doit avoir une quantité supérieure à 0.', n }));
        }
      } else if (!parseNames(level.names).length) {
        issues.push(t('locations.level_needs_name', { defaultValue: 'Le niveau {{n}} doit contenir au moins un nom.', n }));
      }
    });
    if (totalGeneratedCount > 1000) {
      issues.push(t('locations.limit_exceeded', 'La génération dépasse la limite de 1000 emplacements en une seule fois.'));
    }
    return issues;
  }, [levels, totalGeneratedCount]);

  const updateLevel = (levelId: string, patch: Partial<LevelDraft>) => {
    setLevels((current) => current.map((level) => (level.id === levelId ? { ...level, ...patch } : level)));
  };

  const addLevel = () => {
    setLevels((current) => [...current, createLevel()]);
  };

  const removeLevel = (levelId: string) => {
    setLevels((current) => current.filter((level) => level.id !== levelId));
  };

  const applyTemplate = (template: StructureTemplate) => {
    setLevels(template.levels.map((seed) => createLevel(seed)));
  };

  const resetGenerator = () => {
    setLevels([createLevel()]);
    setRootParentId('');
    setReactivateExisting(true);
  };

  const generateStructure = async () => {
    if (!canWrite) return;
    if (generationIssues.length) {
      Alert.alert(t('locations.incomplete_config', 'Configuration incomplète'), generationIssues[0]);
      return;
    }
    setSaving(true);
    try {
      const result = await locationsApi.generate({
        levels: levels.map((level) => {
          if (level.mode === 'names') {
            return {
              type: level.type.trim(),
              mode: 'names' as const,
              names: parseNames(level.names),
            };
          }
          const start = Number(level.start || '1');
          const count = Number(level.count || '0');
          return {
            type: level.type.trim(),
            mode: 'range' as const,
            start,
            end: start + count - 1,
            prefix: level.prefix.trim() || `${level.type.trim()} `,
            suffix: level.suffix.trim() || undefined,
          };
        }),
        root_parent_id: rootParentId || undefined,
        reactivate_existing: reactivateExisting,
      });
      Alert.alert(
        t('locations.structure_created', 'Structure créée'),
        t('locations.structure_created_desc', { defaultValue: '{{created}} emplacement(s) créé(s) et {{reused}} réutilisé(s).', created: result.created_count, reused: result.reused_count }),
      );
      await loadLocations();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Erreur'), err?.message || t('locations.generate_error', 'Impossible de générer la structure.'));
    } finally {
      setSaving(false);
    }
  };

  const createManualLocation = async () => {
    if (!manualName.trim()) {
      Alert.alert(t('common.error', 'Erreur'), t('locations.enter_name', "Saisissez un nom d'emplacement."));
      return;
    }
    setSaving(true);
    try {
      await locationsApi.create({
        name: manualName.trim(),
        type: manualType.trim() || undefined,
        parent_id: manualParentId || undefined,
      });
      setManualName('');
      setManualType('');
      setManualParentId('');
      await loadLocations();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Erreur'), err?.message || t('locations.create_error', 'Impossible de créer cet emplacement.'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    setEditName(location.name || '');
    setEditType(location.type || '');
    setEditParentId(location.parent_id || '');
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim()) return;
    setSaving(true);
    try {
      await locationsApi.update(editing.location_id, {
        name: editName.trim(),
        type: editType.trim() || undefined,
        parent_id: editParentId || null,
      });
      setEditing(null);
      await loadLocations();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Erreur'), err?.message || t('locations.update_error', 'Impossible de mettre à jour cet emplacement.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (location: Location) => {
    setSaving(true);
    try {
      await locationsApi.update(location.location_id, { is_active: location.is_active === false });
      await loadLocations();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Erreur'), err?.message || t('locations.toggle_error', 'Impossible de modifier cet emplacement.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (location: Location) => {
    Alert.alert(t('locations.delete_title', 'Supprimer cet emplacement'), t('locations.delete_confirm', { defaultValue: 'Supprimer définitivement "{{name}}" ?', name: location.name }), [
      { text: t('common.cancel', 'Annuler'), style: 'cancel' },
      {
        text: t('common.delete', 'Supprimer'),
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await locationsApi.delete(location.location_id);
            await loadLocations();
          } catch (err: any) {
            Alert.alert(t('common.error', 'Erreur'), err?.message || t('locations.delete_error', 'Impossible de supprimer cet emplacement.'));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (!hasEnterprisePlan) {
    return (
      <EnterpriseGate
        locked
        featureName={t('locations_screen.feature_name')}
        description={t('locations_screen.cette_fonctionnalite_permet_de_structurer_votre')}
        benefits={[
          t('locations_screen.creer_des_structures_a_plusieurs_niveaux'),
          t('locations_screen.generer_des_series_completes_sans_tout'),
          t('locations_screen.affecter_les_produits_a_des_reperes'),
        ]}
        icon="location-outline"
      >
        <View />
      </EnterpriseGate>
    );
  }

  if (!canRead) {
    return <AccessDenied message={t('locations_screen.vous_n_avez_pas_acces_a')} />;
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.bgDark, colors.bgMid, colors.bgLight]} style={styles.screen}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadLocations();
              }}
              tintColor={colors.primary}
            />
          )}
        >
          <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.circleButton}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowArchived((current) => !current)} style={styles.chipButton}>
                <Ionicons name={showArchived ? 'eye-off-outline' : 'archive-outline'} size={16} color={colors.text} />
                <Text style={styles.chipButtonText}>{showArchived ? t('locations_screen.masquer_archives') : t('locations_screen.voir_archives')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>{t('locations_screen.emplacements')}</Text>
            <Text style={styles.subtitle}>
              {t('locations_screen.organisez_votre_stock_comme_dans_la')}
            </Text>
            <View style={styles.introBox}>
              <Text style={styles.introTitle}>{t('locations_screen.exemple_concret')}</Text>
              <Text style={styles.introText}>
                {t('locations_screen.allee_1_niveau_2_etagere_7')}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('locations_screen.creer_votre_structure')}</Text>
            <Text style={styles.sectionHelp}>
              {t('locations_screen.commencez_par_une_base_simple_puis')}
            </Text>

            <Text style={styles.stepLabel}>{t('locations_screen.1_choisissez_une_structure_de_depart')}</Text>
            <View style={styles.templateList}>
              {STRUCTURE_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => applyTemplate(template)}
                >
                  <Text style={styles.templateTitle}>{template.label}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {parentChoices.length > 0 ? (
              <>
                <Text style={styles.stepLabel}>{t('locations_screen.2_choisissez_ou_creer_la_structure')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChoices}>
                  <TouchableOpacity
                    style={[styles.choiceChip, !rootParentId && styles.choiceChipActive]}
                    onPress={() => setRootParentId('')}
                  >
                    <Text style={[styles.choiceChipText, !rootParentId && styles.choiceChipTextActive]}>{t('locations_screen.a_la_racine')}</Text>
                  </TouchableOpacity>
                  {parentChoices.map((choice) => (
                    <TouchableOpacity
                      key={choice.id}
                      style={[styles.choiceChip, rootParentId === choice.id && styles.choiceChipActive]}
                      onPress={() => setRootParentId(choice.id)}
                    >
                      <Text
                        style={[styles.choiceChipText, rootParentId === choice.id && styles.choiceChipTextActive]}
                        numberOfLines={1}
                      >
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.stepLabel}>{t('locations_screen.3_verifiez_ce_qui_va_etre')}</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryValue}>{totalGeneratedCount || 0}</Text>
                <Text style={styles.summaryLabel}>{t('locations_screen.emplacements_prevus')}</Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>{t('locations_screen.exemple_de_chemin')}</Text>
                <Text style={styles.summaryPath} numberOfLines={2}>
                  {examplePath || t('locations_screen.ajoutez_des_niveaux_pour_voir_un')}
                </Text>
              </View>
            </View>

            {generationIssues.length > 0 ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.warningText}>{generationIssues[0]}</Text>
              </View>
            ) : null}

            <Text style={styles.stepLabel}>{t('locations_screen.4_ajustez_chaque_niveau')}</Text>
            <Text style={styles.sectionHelp}>
              {t('locations_screen.chaque_niveau_represente_une_couche_de')}
            </Text>
            {levels.map((level, index) => {
              const preview = getLevelPreview(level);
              return (
                <View key={level.id} style={styles.innerCard}>
                  <View style={styles.innerHeader}>
                    <View>
                      <Text style={styles.innerTitle}>{t('locations_screen.niveau')} {index + 1}</Text>
                      <Text style={styles.innerHelp}>{t('locations_screen.choisissez_librement_le_nom_du_niveau')}</Text>
                    </View>
                    {levels.length > 1 ? (
                      <TouchableOpacity onPress={() => removeLevel(level.id)} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TextInput
                    value={level.type}
                    onChangeText={(value) => updateLevel(level.id, { type: value })}
                    placeholder={t('locations_screen.nom_du_niveau_ex_allee_zone')}
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlineChips}>
                    {COMMON_LEVEL_TYPE_KEYS.map(levelType).map((suggestion) => (
                      <TouchableOpacity
                        key={`${level.id}_${suggestion}`}
                        style={[styles.choiceChip, level.type === suggestion && styles.choiceChipActive]}
                        onPress={() => updateLevel(level.id, { type: suggestion })}
                      >
                        <Text style={[styles.choiceChipText, level.type === suggestion && styles.choiceChipTextActive]}>
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.modeRow}>
                    <TouchableOpacity
                      style={[styles.modeButton, level.mode === 'range' && styles.modeButtonActive]}
                      onPress={() => updateLevel(level.id, { mode: 'range' })}
                    >
                      <Text style={[styles.modeText, level.mode === 'range' && styles.modeTextActive]}>{t('locations_screen.numerotation')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeButton, level.mode === 'names' && styles.modeButtonActive]}
                      onPress={() => updateLevel(level.id, { mode: 'names' })}
                    >
                      <Text style={[styles.modeText, level.mode === 'names' && styles.modeTextActive]}>{t('locations_screen.noms_libres')}</Text>
                    </TouchableOpacity>
                  </View>

                  {level.mode === 'range' ? (
                    <>
                      <View style={styles.row}>
                        <TextInput
                          value={level.start}
                          onChangeText={(value) => updateLevel(level.id, { start: value.replace(/[^0-9]/g, '') })}
                          placeholder={t('locations_screen.commencer_a')}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                          style={[styles.input, styles.flexInput]}
                        />
                        <TextInput
                          value={level.count}
                          onChangeText={(value) => updateLevel(level.id, { count: value.replace(/[^0-9]/g, '') })}
                          placeholder={t('locations_screen.nombre_d_elements')}
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                          style={[styles.input, styles.flexInput]}
                        />
                      </View>
                      <View style={styles.row}>
                        <TextInput
                          value={level.prefix}
                          onChangeText={(value) => updateLevel(level.id, { prefix: value })}
                          placeholder={t('locations_screen.nom_affiche_avant_le_numero_facultatif')}
                          placeholderTextColor={colors.textMuted}
                          style={[styles.input, styles.flexInput]}
                        />
                        <TextInput
                          value={level.suffix}
                          onChangeText={(value) => updateLevel(level.id, { suffix: value })}
                          placeholder={t('locations_screen.texte_apres_le_numero_facultatif')}
                          placeholderTextColor={colors.textMuted}
                          style={[styles.input, styles.flexInput]}
                        />
                      </View>
                      <Text style={styles.inlineHelp}>
                        {t('locations_screen.si_vous_laissez_le_texte_avant')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        value={level.names}
                        onChangeText={(value) => updateLevel(level.id, { names: value })}
                        placeholder={t('locations_screen.un_nom_par_ligne_ou_separe')}
                        placeholderTextColor={colors.textMuted}
                        multiline
                        style={[styles.input, styles.multilineInput]}
                      />
                      <Text style={styles.inlineHelp}>
                        {t('locations_screen.exemple_nord_sud_reserve_a_ou')}
                      </Text>
                    </>
                  )}

                  <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>{t('locations_screen.apercu')}</Text>
                    <Text style={styles.previewText}>
                      {preview.length ? preview.join(' • ') : t('locations_screen.completez_ce_niveau_pour_voir_un')}
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.generatorActions}>
              <TouchableOpacity style={styles.linkButton} onPress={addLevel}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.linkButtonText}>{t('locations_screen.ajouter_un_niveau')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={resetGenerator}>
                <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.linkButtonText, { color: colors.textSecondary }]}>{t('locations_screen.reinitialiser')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{t('locations_screen.reutiliser_les_emplacements_deja_existants')}</Text>
                <Text style={styles.switchHelp}>
                  {t('locations_screen.utile_si_vous_completez_une_structure')}
                </Text>
              </View>
              <Switch
                value={reactivateExisting}
                onValueChange={setReactivateExisting}
                trackColor={{ false: colors.divider, true: colors.primary + '60' }}
                thumbColor={reactivateExisting ? colors.primary : colors.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={generateStructure} disabled={saving || !canWrite}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{t('locations_screen.generer_la_structure')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('locations_screen.ajouter_un_seul_emplacement')}</Text>
            <Text style={styles.sectionHelp}>
              {t('locations_screen.pour_une_correction_rapide_ou_un')}
            </Text>
            <TextInput
              value={manualName}
              onChangeText={setManualName}
              placeholder={t('locations_screen.nom_complet_de_l_emplacement')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={manualType}
              onChangeText={setManualType}
              placeholder={t('locations_screen.type_facultatif')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {parentChoices.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChoices}>
                <TouchableOpacity
                  style={[styles.choiceChip, !manualParentId && styles.choiceChipActive]}
                  onPress={() => setManualParentId('')}
                >
                  <Text style={[styles.choiceChipText, !manualParentId && styles.choiceChipTextActive]}>{t('locations_screen.sans_parent')}</Text>
                </TouchableOpacity>
                {parentChoices.map((choice) => (
                  <TouchableOpacity
                    key={choice.id}
                    style={[styles.choiceChip, manualParentId === choice.id && styles.choiceChipActive]}
                    onPress={() => setManualParentId(choice.id)}
                  >
                    <Text
                      style={[styles.choiceChipText, manualParentId === choice.id && styles.choiceChipTextActive]}
                      numberOfLines={1}
                    >
                      {choice.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={createManualLocation} disabled={saving || !canWrite}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('locations_screen.creer_l_emplacement')}</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('locations_screen.emplacements_existants')}</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : visibleLocations.length === 0 ? (
              <Text style={styles.emptyText}>{t('locations_screen.aucun_emplacement_pour_le_moment')}</Text>
            ) : (
              visibleLocations.map((location) => (
                <View key={location.location_id} style={styles.listItem}>
                  <Text style={styles.listTitle}>{location.name}</Text>
                  <Text style={styles.listSubtitle}>{getPath(location.location_id)}</Text>
                  <Text style={styles.listMeta}>
                    {location.type || 'Type libre'}
                    {location.is_active === false ? t('locations_screen.archive') : ''}
                  </Text>
                  {canWrite ? (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity onPress={() => openEdit(location)}>
                        <Text style={[styles.actionText, { color: colors.primary }]}>{t('locations_screen.modifier')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleArchive(location)}>
                        <Text style={[styles.actionText, { color: location.is_active === false ? colors.success : colors.warning }]}>
                          {location.is_active === false ? t('locations_screen.reactiver') : 'Archiver'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteLocation(location)}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>{t('locations_screen.supprimer')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </LinearGradient>

      {!!editing && <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>{t('locations_screen.modifier_l_emplacement')}</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder={t('locations_screen.nom_complet')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={editType}
              onChangeText={setEditType}
              placeholder={t('locations_screen.type')}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {parentChoices.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChoices}>
                <TouchableOpacity
                  style={[styles.choiceChip, !editParentId && styles.choiceChipActive]}
                  onPress={() => setEditParentId('')}
                >
                  <Text style={[styles.choiceChipText, !editParentId && styles.choiceChipTextActive]}>{t('locations_screen.sans_parent')}</Text>
                </TouchableOpacity>
                {parentChoices
                  .filter((choice) => choice.id !== editing?.location_id)
                  .map((choice) => (
                    <TouchableOpacity
                      key={choice.id}
                      style={[styles.choiceChip, editParentId === choice.id && styles.choiceChipActive]}
                      onPress={() => setEditParentId(choice.id)}
                    >
                      <Text
                        style={[styles.choiceChipText, editParentId === choice.id && styles.choiceChipTextActive]}
                        numberOfLines={1}
                      >
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(null)}>
                <Text style={styles.secondaryButtonText}>{t('locations_screen.annuler')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButtonInline} onPress={saveEdit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>{t('locations_screen.enregistrer')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgDark },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  circleButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.glassBorder },
  chipButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  chipButtonText: { color: colors.text, fontSize: FontSize.xs, fontWeight: '700' },
  title: { color: colors.text, fontSize: FontSize.xxl, fontWeight: '900' },
  subtitle: { marginTop: Spacing.sm, color: colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 },
  introBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  introTitle: { color: colors.text, fontSize: FontSize.sm, fontWeight: '800', marginBottom: 4 },
  introText: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  card: { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, padding: Spacing.lg, borderRadius: BorderRadius.xl, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  cardTitle: { color: colors.text, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.xs },
  sectionHelp: { color: colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  stepLabel: { color: colors.text, fontSize: FontSize.sm, fontWeight: '800', marginBottom: Spacing.sm },
  subsectionTitle: { color: colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm },
  horizontalChoices: { marginBottom: Spacing.sm },
  templateList: { gap: Spacing.sm, marginBottom: Spacing.md },
  templateCard: { width: '100%', padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.glassBorder },
  templateTitle: { color: colors.text, fontSize: FontSize.sm, fontWeight: '800', marginBottom: 6 },
  templateDescription: { color: colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  summaryCard: { gap: Spacing.md, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.glassBorder },
  summaryPill: { alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '30' },
  summaryMetric: { flex: 1 },
  summaryValue: { color: colors.primary, fontSize: FontSize.xxl, fontWeight: '900' },
  summaryLabel: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 4 },
  summaryPath: { color: colors.text, fontSize: FontSize.sm, lineHeight: 20, fontWeight: '600' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: colors.warning + '14', borderWidth: 1, borderColor: colors.warning + '35', marginBottom: Spacing.md },
  warningText: { flex: 1, color: colors.warning, fontSize: FontSize.sm, fontWeight: '600', lineHeight: 20 },
  innerCard: { padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.glassBorder, marginTop: Spacing.sm },
  innerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  innerTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '700' },
  innerHelp: { color: colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4, maxWidth: 240 },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glass },
  input: { backgroundColor: colors.inputBg, color: colors.text, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, paddingHorizontal: Spacing.md, paddingVertical: 12, marginBottom: Spacing.sm },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.sm },
  flexInput: { flex: 1 },
  inlineChips: { marginBottom: Spacing.sm },
  modeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  modeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.glass },
  modeButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  modeText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  modeTextActive: { color: colors.primary },
  choiceChip: { maxWidth: 240, paddingHorizontal: 12, paddingVertical: 9, marginRight: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.bgDark },
  choiceChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  choiceChipText: { color: colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  choiceChipTextActive: { color: colors.primary },
  inlineHelp: { color: colors.textMuted, fontSize: FontSize.xs, lineHeight: 18, marginTop: -4, marginBottom: Spacing.sm },
  previewBox: { marginTop: Spacing.xs, padding: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassBorder },
  previewTitle: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 4 },
  previewText: { color: colors.text, fontSize: FontSize.sm, lineHeight: 20, fontWeight: '600' },
  generatorActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  linkButtonText: { color: colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginVertical: Spacing.sm },
  switchLabel: { color: colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  switchHelp: { color: colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4 },
  primaryButton: { marginTop: Spacing.sm, backgroundColor: colors.primary, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  primaryButtonInline: { flex: 1, backgroundColor: colors.primary, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800' },
  emptyText: { color: colors.textSecondary, marginTop: Spacing.sm },
  listItem: { paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: colors.glassBorder },
  listTitle: { color: colors.text, fontSize: FontSize.md, fontWeight: '800' },
  listSubtitle: { color: colors.textSecondary, fontSize: FontSize.sm, marginTop: 4 },
  listMeta: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: 10, flexWrap: 'wrap' },
  actionText: { fontSize: FontSize.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.72)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: colors.card, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: colors.glassBorder, padding: Spacing.lg },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  secondaryButton: { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.glassBorder, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: colors.text, fontWeight: '700' },
});
