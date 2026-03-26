'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Check, MapPin, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { locations as locationsApi } from '../services/api';

type LocationRecord = {
    location_id: string;
    name: string;
    type?: string | null;
    parent_id?: string | null;
    is_active?: boolean;
};

const TYPE_SUGGESTIONS = [
    'Allée',
    'Rayon',
    'Niveau',
    'Étagère',
    'Zone',
    'Entrepôt',
    'Réserve',
    'Vitrine',
];

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

    const locationMap = new Map(locations.map((loc) => [loc.location_id, loc]));

    const activeLocations = locations.filter((loc) => loc.is_active !== false);
    const visibleLocations = showArchived ? locations : activeLocations;

    const loadLocations = async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await locationsApi.list();
            setLocations(list || []);
        } catch (err: any) {
            setError(err?.message || "Impossible de charger les emplacements.");
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
        while (current && guard < 8) {
            if (current.name) parts.push(current.name);
            current = current.parent_id ? locationMap.get(current.parent_id) : undefined;
            guard += 1;
        }
        return parts.reverse().join(' / ');
    };

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

    return (
        <div className="custom-scrollbar flex-1 overflow-y-auto bg-[#0F172A] p-8">
            <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">{t('settings_workspace.stores.locations.title')}</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Organisez vos zones de stockage par allée, rayon, niveau ou tout autre découpage utile.
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
                    <MapPin size={16} className="text-primary" />
                    Nouvel emplacement
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
                            list="location-type-options"
                            value={newType}
                            onChange={(event) => setNewType(event.target.value)}
                            placeholder="Type (allée, rayon, étagère...)"
                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                        />
                        <datalist id="location-type-options">
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
                        {activeLocations.map((loc) => (
                            <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
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
                    {visibleLocations.map((loc) => {
                        const isEditing = editingId === loc.location_id;
                        const path = getLocationPath(loc.location_id);
                        const typeLabel = loc.type ? loc.type : 'Type non défini';
                        const parentOptions = activeLocations.filter((item) => item.location_id !== loc.location_id);
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
                                            list="location-type-options"
                                            value={editingType}
                                            onChange={(event) => setEditingType(event.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none focus:border-primary/50"
                                        />
                                        <select
                                            value={editingParent}
                                            onChange={(event) => setEditingParent(event.target.value)}
                                            className="w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-2 text-sm text-white outline-none focus:border-primary/50"
                                        >
                                            <option value="">Aucun parent</option>
                                            {parentOptions.map((item) => (
                                                <option key={item.location_id} value={item.location_id}>{item.name}</option>
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
