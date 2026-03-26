'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Check, MapPin, Pencil, Plus, RotateCcw, Trash2, Wand2, X } from 'lucide-react';
import { locations as locationsApi } from '../services/api';

type LocationRecord = {
    location_id: string;
    name: string;
    type?: string | null;
    parent_id?: string | null;
    is_active?: boolean;
};

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

const TYPE_SUGGESTIONS = ['Allée', 'Rayon', 'Niveau', 'Étagère', 'Zone', 'Entrepôt', 'Réserve', 'Vitrine', 'Casier', 'Bloc'];

const STRUCTURE_TEMPLATES: StructureTemplate[] = [
    {
        id: 'warehouse',
        label: 'Allées / niveaux / étagères',
        description: 'Pour un entrepôt, une réserve ou un supermarché structuré.',
        levels: [
            { type: 'Allée', mode: 'range', start: '1', count: '4' },
            { type: 'Niveau', mode: 'range', start: '1', count: '3' },
            { type: 'Étagère', mode: 'range', start: '1', count: '6' },
        ],
    },
    {
        id: 'zones',
        label: 'Zones / rayons',
        description: 'Pour sectoriser de grandes surfaces par espace ou famille.',
        levels: [
            { type: 'Zone', mode: 'range', start: '1', count: '3' },
            { type: 'Rayon', mode: 'range', start: '1', count: '8' },
        ],
    },
    {
        id: 'blocks',
        label: 'Blocs / casiers',
        description: 'Pour un stockage simple avec rangées courtes et casiers.',
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

export default function Locations() {
    const { t } = useTranslation();
    const [locations, setLocations] = useState<LocationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('');
    const [newParent, setNewParent] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingType, setEditingType] = useState('');
    const [editingParent, setEditingParent] = useState('');

    const [levels, setLevels] = useState<LevelDraft[]>([
        createLevel({ type: 'Allée', mode: 'range', start: '1', count: '3' }),
        createLevel({ type: 'Niveau', mode: 'range', start: '1', count: '2' }),
        createLevel({ type: 'Étagère', mode: 'range', start: '1', count: '4' }),
    ]);
    const [rootParentId, setRootParentId] = useState('');
    const [reactivateExisting, setReactivateExisting] = useState(true);

    const locationMap = useMemo(() => new Map(locations.map((loc) => [loc.location_id, loc])), [locations]);
    const activeLocations = useMemo(() => locations.filter((loc) => loc.is_active !== false), [locations]);
    const visibleLocations = useMemo(() => (showArchived ? locations : activeLocations), [activeLocations, locations, showArchived]);

    const loadLocations = async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await locationsApi.list();
            setLocations(list || []);
        } catch (err: any) {
            setError(err?.message || 'Impossible de charger les emplacements.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadLocations();
    }, []);

    const getLocationPath = (locationId: string) => {
        const parts: string[] = [];
        let current = locationMap.get(locationId);
        let guard = 0;
        while (current && guard < 12) {
            if (current.name) parts.push(current.name);
            current = current.parent_id ? locationMap.get(current.parent_id) : undefined;
            guard += 1;
        }
        return parts.reverse().join(' / ');
    };

    const sortedActiveLocations = useMemo(
        () => [...activeLocations].sort((a, b) => getLocationPath(a.location_id).localeCompare(getLocationPath(b.location_id), 'fr')),
        [activeLocations, locationMap],
    );

    const getLevelEntryCount = (level: LevelDraft) => {
        if (level.mode === 'names') return parseNames(level.names).length;
        const count = Number(level.count);
        return Number.isFinite(count) && count > 0 ? count : 0;
    };

    const getLevelPreview = (level: LevelDraft) => {
        if (level.mode === 'names') return parseNames(level.names).slice(0, 3);
        const count = Math.min(getLevelEntryCount(level), 3);
        return Array.from({ length: count }, (_, index) => formatGeneratedName(level, index));
    };

    const totalGeneratedCount = useMemo(() => {
        if (!levels.length) return 0;
        return levels.reduce((accumulator, level) => {
            const count = getLevelEntryCount(level);
            if (!count) return 0;
            return accumulator * count;
        }, 1);
    }, [levels]);

    const examplePath = useMemo(() => {
        const items = levels.map((level) => getLevelPreview(level)[0]).filter(Boolean);
        return items.join(' / ');
    }, [levels]);

    const generationIssues = useMemo(() => {
        const issues: string[] = [];
        if (!levels.length) {
            issues.push('Ajoutez au moins un niveau.');
            return issues;
        }
        levels.forEach((level, index) => {
            if (!level.type.trim()) issues.push(`Le niveau ${index + 1} doit avoir un type.`);
            if (level.mode === 'range') {
                const start = Number(level.start);
                const count = Number(level.count);
                if (!Number.isFinite(start) || start < 0) issues.push(`Le niveau ${index + 1} doit avoir un premier numéro valide.`);
                if (!Number.isFinite(count) || count <= 0) issues.push(`Le niveau ${index + 1} doit avoir une quantité supérieure à 0.`);
            } else if (!parseNames(level.names).length) {
                issues.push(`Le niveau ${index + 1} doit contenir au moins un nom.`);
            }
        });
        if (totalGeneratedCount > 1000) issues.push('La génération dépasse la limite de 1000 emplacements en une seule fois.');
        return issues;
    }, [levels, totalGeneratedCount]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const payload: any = { name: newName.trim() };
            if (newType.trim()) payload.type = newType.trim();
            if (newParent) payload.parent_id = newParent;
            await locationsApi.create(payload);
            setNewName('');
            setNewType('');
            setNewParent('');
            await loadLocations();
        } catch (err: any) {
            setError(err?.message || "Impossible de créer l'emplacement.");
        } finally {
            setSaving(false);
        }
    };

    const generateStructure = async () => {
        if (generationIssues.length) {
            setError(generationIssues[0]);
            return;
        }
        setSaving(true);
        setError(null);
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
            setError(`${result.created_count} emplacement(s) créé(s), ${result.reused_count} réutilisé(s).`);
            await loadLocations();
        } catch (err: any) {
            setError(err?.message || 'Impossible de générer la structure.');
        } finally {
            setSaving(false);
        }
    };

    const startEditing = (loc: LocationRecord) => {
        setEditingId(loc.location_id);
        setEditingName(loc.name || '');
        setEditingType(loc.type || '');
        setEditingParent(loc.parent_id || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingName('');
        setEditingType('');
        setEditingParent('');
    };

    const saveEditing = async () => {
        if (!editingId || !editingName.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const payload: any = { name: editingName.trim() };
            if (editingType.trim()) payload.type = editingType.trim();
            if (editingParent) payload.parent_id = editingParent;
            else payload.parent_id = null;
            await locationsApi.update(editingId, payload);
            await loadLocations();
            cancelEditing();
        } catch (err: any) {
            setError(err?.message || "Impossible de mettre à jour l'emplacement.");
        } finally {
            setSaving(false);
        }
    };

    const toggleArchive = async (loc: LocationRecord, nextActive: boolean) => {
        setActionId(loc.location_id);
        setError(null);
        try {
            await locationsApi.update(loc.location_id, { is_active: nextActive });
            await loadLocations();
        } catch (err: any) {
            setError(err?.message || "Impossible de mettre à jour l'emplacement.");
        } finally {
            setActionId(null);
        }
    };

    const deleteLocation = async (loc: LocationRecord) => {
        if (!window.confirm(`Supprimer définitivement l'emplacement "${loc.name}" ?`)) {
            return;
        }
        setActionId(loc.location_id);
        setError(null);
        try {
            await locationsApi.delete(loc.location_id);
            await loadLocations();
        } catch (err: any) {
            setError(err?.message || "Impossible de supprimer l'emplacement.");
        } finally {
            setActionId(null);
        }
    };

    const applyTemplate = (template: StructureTemplate) => {
        setLevels(template.levels.map((seed) => createLevel(seed)));
    };

    const updateLevel = (levelId: string, patch: Partial<LevelDraft>) => {
        setLevels((current) => current.map((level) => (level.id === levelId ? { ...level, ...patch } : level)));
    };

    const addLevel = () => setLevels((current) => [...current, createLevel()]);
    const removeLevel = (levelId: string) => setLevels((current) => current.filter((level) => level.id !== levelId));
    const resetGenerator = () => {
        setLevels([createLevel()]);
        setRootParentId('');
        setReactivateExisting(true);
    };

    return (
        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#0F172A] p-8">
            <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">{t('settings_workspace.stores.locations.title')}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-slate-400">
                        Organisez vos zones de stockage avec une structure guidée : allées, zones, rayons, niveaux,
                        étagères ou toute autre configuration choisie.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowArchived((value) => !value)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:border-white/20"
                >
                    {showArchived ? 'Masquer les archivés' : 'Voir les archivés'}
                </button>
            </header>

            {error && (
                <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                </div>
            )}

            <section className="glass-card mb-8 p-6">
                <div className="mb-4 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                    <Wand2 size={16} className="text-primary" />
                    Génération guidée
                </div>
                <p className="mb-5 max-w-3xl text-sm text-slate-400">
                    Configurez votre structure en quelques étapes. Vous pouvez partir d’un modèle, ajuster les niveaux,
                    choisir une numérotation ou des noms libres, puis générer toute l’arborescence d’un coup.
                </p>

                <div className="mb-5 grid gap-4 lg:grid-cols-3">
                    {STRUCTURE_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-primary/40 hover:bg-primary/10"
                        >
                            <div className="text-sm font-black text-white">{template.label}</div>
                            <p className="mt-2 text-xs leading-5 text-slate-400">{template.description}</p>
                        </button>
                    ))}
                </div>

                {sortedActiveLocations.length > 0 && (
                    <div className="mb-5">
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Créer sous
                        </label>
                        <select
                            value={rootParentId}
                            onChange={(event) => setRootParentId(event.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                        >
                            <option value="">À la racine</option>
                            {sortedActiveLocations.map((loc) => (
                                <option key={loc.location_id} value={loc.location_id}>
                                    {getLocationPath(loc.location_id)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="mb-5 grid gap-4 xl:grid-cols-[220px,1fr]">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Prévision</div>
                        <div className="mt-3 text-3xl font-black text-primary">{totalGeneratedCount || 0}</div>
                        <div className="mt-1 text-xs text-slate-400">emplacement(s) prévus</div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Exemple de chemin</div>
                        <div className="mt-3 text-sm font-semibold text-white">
                            {examplePath || 'Ajoutez des niveaux pour voir un aperçu.'}
                        </div>
                    </div>
                </div>

                {generationIssues.length > 0 && (
                    <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {generationIssues[0]}
                    </div>
                )}

                <div className="space-y-4">
                    {levels.map((level, index) => {
                        const preview = getLevelPreview(level);
                        return (
                            <div key={level.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="text-sm font-black text-white">Niveau {index + 1}</div>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Définissez le type du niveau et la manière de créer ses éléments.
                                        </p>
                                    </div>
                                    {levels.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeLevel(level.id)}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200"
                                        >
                                            <Trash2 size={14} />
                                            Supprimer
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <input
                                        type="text"
                                        list={`location-type-options-${level.id}`}
                                        value={level.type}
                                        onChange={(event) => updateLevel(level.id, { type: event.target.value })}
                                        placeholder="Type du niveau (ex. Allée, Zone, Niveau)"
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                                    />
                                    <datalist id={`location-type-options-${level.id}`}>
                                        {TYPE_SUGGESTIONS.map((type) => (
                                            <option key={type} value={type} />
                                        ))}
                                    </datalist>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => updateLevel(level.id, { mode: 'range' })}
                                            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition ${level.mode === 'range' ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-white/[0.03] text-slate-300'}`}
                                        >
                                            Numérotation
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => updateLevel(level.id, { mode: 'names' })}
                                            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition ${level.mode === 'names' ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-white/[0.03] text-slate-300'}`}
                                        >
                                            Noms libres
                                        </button>
                                    </div>
                                </div>

                                {level.mode === 'range' ? (
                                    <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                                        <input
                                            type="number"
                                            min="0"
                                            value={level.start}
                                            onChange={(event) => updateLevel(level.id, { start: event.target.value.replace(/[^0-9]/g, '') })}
                                            placeholder="Premier numéro"
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            value={level.count}
                                            onChange={(event) => updateLevel(level.id, { count: event.target.value.replace(/[^0-9]/g, '') })}
                                            placeholder="Quantité"
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                                        />
                                        <input
                                            type="text"
                                            value={level.prefix}
                                            onChange={(event) => updateLevel(level.id, { prefix: event.target.value })}
                                            placeholder="Texte avant le numéro"
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                                        />
                                        <input
                                            type="text"
                                            value={level.suffix}
                                            onChange={(event) => updateLevel(level.id, { suffix: event.target.value })}
                                            placeholder="Texte après le numéro"
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <textarea
                                            value={level.names}
                                            onChange={(event) => updateLevel(level.id, { names: event.target.value })}
                                            placeholder="Un nom par ligne ou séparés par des virgules"
                                            rows={4}
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                                        />
                                    </div>
                                )}

                                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Aperçu</div>
                                    <div className="mt-2 text-sm font-semibold text-white">
                                        {preview.length ? preview.join(' • ') : 'Complétez ce niveau pour voir un aperçu.'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={addLevel}
                            className="inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary"
                        >
                            <Plus size={16} />
                            Ajouter un niveau
                        </button>
                        <button
                            type="button"
                            onClick={resetGenerator}
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-300"
                        >
                            <RotateCcw size={16} />
                            Réinitialiser
                        </button>
                    </div>
                    <label className="inline-flex items-center gap-3 text-sm text-slate-300">
                        <input
                            type="checkbox"
                            checked={reactivateExisting}
                            onChange={(event) => setReactivateExisting(event.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-[#0F172A] text-primary focus:ring-primary"
                        />
                        Réactiver les emplacements déjà existants
                    </label>
                </div>

                <div className="mt-5">
                    <button
                        type="button"
                        onClick={generateStructure}
                        disabled={saving || generationIssues.length > 0}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Wand2 size={18} />
                        Générer la structure
                    </button>
                </div>
            </section>

            <section className="glass-card mb-8 p-6">
                <div className="mb-4 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                    <MapPin size={16} className="text-primary" />
                    Ajout ponctuel
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr,1fr,1fr,auto]">
                    <input
                        type="text"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder="Nom de l'emplacement"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                    />
                    <div className="flex flex-col">
                        <input
                            type="text"
                            list="location-type-options-manual"
                            value={newType}
                            onChange={(event) => setNewType(event.target.value)}
                            placeholder="Type (allée, rayon, étagère...)"
                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                        />
                        <datalist id="location-type-options-manual">
                            {TYPE_SUGGESTIONS.map((type) => (
                                <option key={type} value={type} />
                            ))}
                        </datalist>
                    </div>
                    <select
                        value={newParent}
                        onChange={(event) => setNewParent(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                    >
                        <option value="">Aucun parent</option>
                        {sortedActiveLocations.map((loc) => (
                            <option key={loc.location_id} value={loc.location_id}>{getLocationPath(loc.location_id)}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={saving || !newName.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Plus size={18} />
                        Ajouter
                    </button>
                </div>
            </section>

            <section className="glass-card p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-white">Liste des emplacements</h2>
                    {loading && <span className="text-xs text-slate-400">Chargement...</span>}
                </div>

                {visibleLocations.length === 0 && !loading && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                        Aucun emplacement pour le moment.
                    </div>
                )}

                <div className="space-y-3">
                    {visibleLocations
                        .slice()
                        .sort((a, b) => getLocationPath(a.location_id).localeCompare(getLocationPath(b.location_id), 'fr'))
                        .map((loc) => {
                            const isEditing = editingId === loc.location_id;
                            const path = getLocationPath(loc.location_id);
                            const typeLabel = loc.type ? loc.type : 'Type non défini';
                            const parentOptions = sortedActiveLocations.filter((item) => item.location_id !== loc.location_id);
                            return (
                                <div key={loc.location_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-white">{loc.name}</p>
                                            <p className="text-xs text-slate-400">{path}</p>
                                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                {typeLabel}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={saveEditing}
                                                        disabled={saving}
                                                        className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                                    >
                                                        <Check size={14} />
                                                        Enregistrer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300"
                                                    >
                                                        <X size={14} />
                                                        Annuler
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(loc)}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-white/20"
                                                    >
                                                        <Pencil size={14} />
                                                        Modifier
                                                    </button>
                                                    {loc.is_active === false ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleArchive(loc, true)}
                                                            disabled={actionId === loc.location_id}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 disabled:opacity-50"
                                                        >
                                                            <RotateCcw size={14} />
                                                            Réactiver
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleArchive(loc, false)}
                                                            disabled={actionId === loc.location_id}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-50"
                                                        >
                                                            <Archive size={14} />
                                                            Archiver
                                                        </button>
                                                    )}
                                                    {loc.is_active === false && (
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteLocation(loc)}
                                                            disabled={actionId === loc.location_id}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 disabled:opacity-50"
                                                        >
                                                            <Trash2 size={14} />
                                                            Supprimer
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.2fr,1fr,1fr]">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(event) => setEditingName(event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-primary/50"
                                            />
                                            <input
                                                type="text"
                                                list="location-type-options-edit"
                                                value={editingType}
                                                onChange={(event) => setEditingType(event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none focus:border-primary/50"
                                            />
                                            <datalist id="location-type-options-edit">
                                                {TYPE_SUGGESTIONS.map((type) => (
                                                    <option key={type} value={type} />
                                                ))}
                                            </datalist>
                                            <select
                                                value={editingParent}
                                                onChange={(event) => setEditingParent(event.target.value)}
                                                className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none focus:border-primary/50"
                                            >
                                                <option value="">Aucun parent</option>
                                                {parentOptions.map((item) => (
                                                    <option key={item.location_id} value={item.location_id}>{getLocationPath(item.location_id)}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </section>
        </div>
    );
}
