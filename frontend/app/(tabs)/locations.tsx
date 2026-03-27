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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import EnterpriseGate from '../../components/EnterpriseGate';
import AccessDenied from '../../components/AccessDenied';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import { Location, locations as locationsApi } from '../../services/api';

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

const COMMON_LEVEL_TYPES = ['Allée', 'Zone', 'Rayon', 'Niveau', 'Étagère', 'Casier', 'Bloc'];

const STRUCTURE_TEMPLATES: StructureTemplate[] = [
  {
    id: 'warehouse',
    label: 'Allées / niveaux / étagères',
    description: 'Structure classique pour entrepôt, réserve ou magasin structuré.',
    levels: [
      { type: 'Allée', mode: 'range', start: '1', count: '4' },
      { type: 'Niveau', mode: 'range', start: '1', count: '3' },
      { type: 'Étagère', mode: 'range', start: '1', count: '6' },
    ],
  },
  {
    id: 'zones',
    label: 'Zones / rayons',
    description: 'Pratique pour organiser de grands espaces en secteurs.',
    levels: [
      { type: 'Zone', mode: 'range', start: '1', count: '3' },
      { type: 'Rayon', mode: 'range', start: '1', count: '8' },
    ],
  },
  {
    id: 'blocks',
    label: 'Blocs / casiers',
    description: 'Simple et rapide pour une réserve ou un petit dépôt.',
    levels: [
      { type: 'Bloc', mode: 'range', start: '1', count: '5' },
      { type: 'Casier', mode: 'range', start: '1', count: '10' },
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
    createLevel({ type: 'Allée', mode: 'range', start: '1', count: '3' }),
    createLevel({ type: 'Niveau', mode: 'range', start: '1', count: '2' }),
    createLevel({ type: 'Étagère', mode: 'range', start: '1', count: '4' }),
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
      Alert.alert('Erreur', err?.message || 'Impossible de charger les emplacements.');
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
      issues.push('Ajoutez au moins un niveau.');
      return issues;
    }
    levels.forEach((level, index) => {
      if (!level.type.trim()) {
        issues.push(`Le niveau ${index + 1} doit avoir un type.`);
      }
      if (level.mode === 'range') {
        const start = Number(level.start);
        const count = Number(level.count);
        if (!Number.isFinite(start) || start < 0) {
          issues.push(`Le niveau ${index + 1} doit avoir un premier numéro valide.`);
        }
        if (!Number.isFinite(count) || count <= 0) {
          issues.push(`Le niveau ${index + 1} doit avoir une quantité supérieure à 0.`);
        }
      } else if (!parseNames(level.names).length) {
        issues.push(`Le niveau ${index + 1} doit contenir au moins un nom.`);
      }
    });
    if (totalGeneratedCount > 1000) {
      issues.push('La génération dépasse la limite de 1000 emplacements en une seule fois.');
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
      Alert.alert('Configuration incomplète', generationIssues[0]);
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
        'Structure créée',
        `${result.created_count} emplacement(s) créé(s) et ${result.reused_count} réutilisé(s).`,
      );
      await loadLocations();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de générer la structure.');
    } finally {
      setSaving(false);
    }
  };

  const createManualLocation = async () => {
    if (!manualName.trim()) {
      Alert.alert('Erreur', 'Saisissez un nom d’emplacement.');
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
      Alert.alert('Erreur', err?.message || 'Impossible de créer cet emplacement.');
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
      Alert.alert('Erreur', err?.message || 'Impossible de mettre à jour cet emplacement.');
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
      Alert.alert('Erreur', err?.message || 'Impossible de modifier cet emplacement.');
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (location: Location) => {
    Alert.alert('Supprimer cet emplacement', `Supprimer définitivement "${location.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await locationsApi.delete(location.location_id);
            await loadLocations();
          } catch (err: any) {
            Alert.alert('Erreur', err?.message || 'Impossible de supprimer cet emplacement.');
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
        featureName="Organisation détaillée des emplacements"
        description="Cette fonctionnalité permet de structurer votre stock avec des repères précis et une arborescence complète."
        benefits={[
          'Créer des structures à plusieurs niveaux adaptées à votre espace',
          'Générer des séries complètes sans tout saisir une par une',
          'Affecter les produits à des repères de stockage précis',
        ]}
        icon="location-outline"
      >
        <View />
      </EnterpriseGate>
    );
  }

  if (!canRead) {
    return <AccessDenied message="Vous n’avez pas accès à la gestion des emplacements." />;
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
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowArchived((current) => !current)} style={styles.chipButton}>
                <Ionicons name={showArchived ? 'eye-off-outline' : 'archive-outline'} size={16} color="#fff" />
                <Text style={styles.chipButtonText}>{showArchived ? 'Masquer archivés' : 'Voir archivés'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>Emplacements</Text>
            <Text style={styles.subtitle}>
              Organisez votre stock comme dans la réalité : allées, zones, rayons, niveaux, étagères ou toute autre
              structure adaptée à votre espace.
            </Text>
            <View style={styles.introBox}>
              <Text style={styles.introTitle}>Exemple concret</Text>
              <Text style={styles.introText}>
                Allée 1 / Niveau 2 / Étagère 7, ou toute autre configuration de votre choix.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Créer votre structure</Text>
            <Text style={styles.sectionHelp}>
              Commencez par une base simple, puis ajustez chaque niveau. Vous pouvez numéroter, nommer librement,
              ou mélanger les deux selon votre organisation.
            </Text>

            <Text style={styles.stepLabel}>1. Choisissez une structure de départ</Text>
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
                <Text style={styles.stepLabel}>2. Choisissez où créer la structure</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChoices}>
                  <TouchableOpacity
                    style={[styles.choiceChip, !rootParentId && styles.choiceChipActive]}
                    onPress={() => setRootParentId('')}
                  >
                    <Text style={[styles.choiceChipText, !rootParentId && styles.choiceChipTextActive]}>À la racine</Text>
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

            <Text style={styles.stepLabel}>3. Vérifiez ce qui va être créé</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryValue}>{totalGeneratedCount || 0}</Text>
                <Text style={styles.summaryLabel}>Emplacements prévus</Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>Exemple de chemin</Text>
                <Text style={styles.summaryPath} numberOfLines={2}>
                  {examplePath || 'Ajoutez des niveaux pour voir un aperçu.'}
                </Text>
              </View>
            </View>

            {generationIssues.length > 0 ? (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.warningText}>{generationIssues[0]}</Text>
              </View>
            ) : null}

            <Text style={styles.stepLabel}>4. Ajustez chaque niveau</Text>
            <Text style={styles.sectionHelp}>
              Chaque niveau représente une couche de votre organisation. Exemple : Allée, puis Niveau, puis Étagère.
            </Text>
            {levels.map((level, index) => {
              const preview = getLevelPreview(level);
              return (
                <View key={level.id} style={styles.innerCard}>
                  <View style={styles.innerHeader}>
                    <View>
                      <Text style={styles.innerTitle}>Niveau {index + 1}</Text>
                      <Text style={styles.innerHelp}>Choisissez librement le nom du niveau et la manière de le générer.</Text>
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
                    placeholder="Nom du niveau (ex. Allée, Zone, Niveau)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inlineChips}>
                    {COMMON_LEVEL_TYPES.map((suggestion) => (
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
                      <Text style={[styles.modeText, level.mode === 'range' && styles.modeTextActive]}>Numérotation</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeButton, level.mode === 'names' && styles.modeButtonActive]}
                      onPress={() => updateLevel(level.id, { mode: 'names' })}
                    >
                      <Text style={[styles.modeText, level.mode === 'names' && styles.modeTextActive]}>Noms libres</Text>
                    </TouchableOpacity>
                  </View>

                  {level.mode === 'range' ? (
                    <>
                      <View style={styles.row}>
                        <TextInput
                          value={level.start}
                          onChangeText={(value) => updateLevel(level.id, { start: value.replace(/[^0-9]/g, '') })}
                          placeholder="Commencer à"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                          style={[styles.input, styles.flexInput]}
                        />
                        <TextInput
                          value={level.count}
                          onChangeText={(value) => updateLevel(level.id, { count: value.replace(/[^0-9]/g, '') })}
                          placeholder="Nombre d’éléments"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="number-pad"
                          style={[styles.input, styles.flexInput]}
                        />
                      </View>
                      <View style={styles.row}>
                        <TextInput
                          value={level.prefix}
                          onChangeText={(value) => updateLevel(level.id, { prefix: value })}
                          placeholder="Nom affiché avant le numéro (facultatif)"
                          placeholderTextColor={colors.textMuted}
                          style={[styles.input, styles.flexInput]}
                        />
                        <TextInput
                          value={level.suffix}
                          onChangeText={(value) => updateLevel(level.id, { suffix: value })}
                          placeholder="Texte après le numéro (facultatif)"
                          placeholderTextColor={colors.textMuted}
                          style={[styles.input, styles.flexInput]}
                        />
                      </View>
                      <Text style={styles.inlineHelp}>
                        Si vous laissez le texte avant vide, l’application utilisera automatiquement le nom du niveau.
                      </Text>
                    </>
                  ) : (
                    <>
                      <TextInput
                        value={level.names}
                        onChangeText={(value) => updateLevel(level.id, { names: value })}
                        placeholder="Un nom par ligne ou séparé par des virgules"
                        placeholderTextColor={colors.textMuted}
                        multiline
                        style={[styles.input, styles.multilineInput]}
                      />
                      <Text style={styles.inlineHelp}>
                        Exemple : Nord, Sud, Réserve A, ou un nom par ligne.
                      </Text>
                    </>
                  )}

                  <View style={styles.previewBox}>
                    <Text style={styles.previewTitle}>Aperçu</Text>
                    <Text style={styles.previewText}>
                      {preview.length ? preview.join(' • ') : 'Complétez ce niveau pour voir un aperçu.'}
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.generatorActions}>
              <TouchableOpacity style={styles.linkButton} onPress={addLevel}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.linkButtonText}>Ajouter un niveau</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={resetGenerator}>
                <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.linkButtonText, { color: colors.textSecondary }]}>Réinitialiser</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Réutiliser les emplacements déjà existants</Text>
                <Text style={styles.switchHelp}>
                  Utile si vous complétez une structure déjà commencée sans recréer les mêmes emplacements.
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
                <Text style={styles.primaryButtonText}>Générer la structure</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ajouter un seul emplacement</Text>
            <Text style={styles.sectionHelp}>
              Pour une correction rapide ou un besoin isolé, vous pouvez créer un emplacement à l’unité.
            </Text>
            <TextInput
              value={manualName}
              onChangeText={setManualName}
              placeholder="Nom complet de l’emplacement"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={manualType}
              onChangeText={setManualType}
              placeholder="Type facultatif"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {parentChoices.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChoices}>
                <TouchableOpacity
                  style={[styles.choiceChip, !manualParentId && styles.choiceChipActive]}
                  onPress={() => setManualParentId('')}
                >
                  <Text style={[styles.choiceChipText, !manualParentId && styles.choiceChipTextActive]}>Sans parent</Text>
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
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Créer l’emplacement</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emplacements existants</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : visibleLocations.length === 0 ? (
              <Text style={styles.emptyText}>Aucun emplacement pour le moment.</Text>
            ) : (
              visibleLocations.map((location) => (
                <View key={location.location_id} style={styles.listItem}>
                  <Text style={styles.listTitle}>{location.name}</Text>
                  <Text style={styles.listSubtitle}>{getPath(location.location_id)}</Text>
                  <Text style={styles.listMeta}>
                    {location.type || 'Type libre'}
                    {location.is_active === false ? ' • archivé' : ''}
                  </Text>
                  {canWrite ? (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity onPress={() => openEdit(location)}>
                        <Text style={[styles.actionText, { color: colors.primary }]}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleArchive(location)}>
                        <Text style={[styles.actionText, { color: location.is_active === false ? colors.success : colors.warning }]}>
                          {location.is_active === false ? 'Réactiver' : 'Archiver'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteLocation(location)}>
                        <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
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
            <Text style={styles.cardTitle}>Modifier l’emplacement</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Nom complet"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={editType}
              onChangeText={setEditType}
              placeholder="Type"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            {parentChoices.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChoices}>
                <TouchableOpacity
                  style={[styles.choiceChip, !editParentId && styles.choiceChipActive]}
                  onPress={() => setEditParentId('')}
                >
                  <Text style={[styles.choiceChipText, !editParentId && styles.choiceChipTextActive]}>Sans parent</Text>
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
                <Text style={styles.secondaryButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButtonInline} onPress={saveEdit} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryButtonText}>Enregistrer</Text>}
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
  circleButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  chipButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.16)' },
  chipButtonText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  title: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '900' },
  subtitle: { marginTop: Spacing.sm, color: 'rgba(255,255,255,0.86)', fontSize: FontSize.md, lineHeight: 22 },
  introBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  introTitle: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800', marginBottom: 4 },
  introText: { color: 'rgba(255,255,255,0.86)', fontSize: FontSize.sm, lineHeight: 20 },
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
