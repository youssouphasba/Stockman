'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Check } from 'lucide-react';
import { tables as tablesApi } from '../services/api';

const STATUS_COLORS: Record<string, string> = {
    free: 'border-emerald-500 bg-emerald-500/10 text-emerald-400',
    occupied: 'border-rose-500 bg-rose-500/10 text-rose-400',
    reserved: 'border-amber-500 bg-amber-500/10 text-amber-400',
    cleaning: 'border-slate-500 bg-slate-500/10 text-slate-400',
};

const STATUS_LABELS: Record<string, string> = {
    free: 'Libre',
    occupied: 'Occupée',
    reserved: 'Réservée',
    cleaning: 'Nettoyage',
};

export default function TableManagement() {
    const [tableList, setTableList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCapacity, setNewCapacity] = useState(4);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const data = await tablesApi.list();
            setTableList(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const cycleStatus = async (table: any) => {
        const order = ['free', 'occupied', 'cleaning'];
        const next = order[(order.indexOf(table.status) + 1) % order.length];
        await tablesApi.update(table.table_id, { status: next });
        setTableList(prev => prev.map(t => t.table_id === table.table_id ? { ...t, status: next } : t));
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const t = await tablesApi.create({ name: newName.trim(), capacity: newCapacity });
            setTableList(prev => [...prev, t]);
            setNewName('');
            setNewCapacity(4);
            setShowCreate(false);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette table ?')) return;
        await tablesApi.delete(id);
        setTableList(prev => prev.filter(t => t.table_id !== id));
    };

    if (loading) return <div className="flex-1 flex items-center justify-center bg-[#0F172A]"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A]">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Plan de Salle</h1>
                    <p className="text-slate-400 text-sm">{tableList.length} tables — cliquez sur une table pour changer son statut</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold">
                    <Plus size={16} /> Ajouter une table
                </button>
            </header>

            {showCreate && (
                <div className="glass-card p-6 mb-8 flex items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Nom</label>
                        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Table 1 / Terrasse A" className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none w-48" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Couverts</label>
                        <input type="number" min={1} max={20} value={newCapacity} onChange={e => setNewCapacity(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none w-24" />
                    </div>
                    <button onClick={handleCreate} disabled={saving || !newName.trim()} className="btn-primary px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-bold disabled:opacity-50">
                        <Check size={16} /> {saving ? 'Creation...' : 'Creer'}
                    </button>
                    <button onClick={() => setShowCreate(false)} className="px-5 py-3 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10">Annuler</button>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tableList.map(table => (
                    <div
                        key={table.table_id}
                        onClick={() => cycleStatus(table)}
                        className={`relative glass-card p-5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-105 group ${STATUS_COLORS[table.status] || STATUS_COLORS.free}`}
                    >
                        <button
                            onClick={e => { e.stopPropagation(); handleDelete(table.table_id); }}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={12} />
                        </button>
                        <div className="text-2xl font-bold text-white mb-1">{table.name}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                            <Users size={12} /> {table.capacity} pers.
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[table.status]}`}>
                            {STATUS_LABELS[table.status] || table.status}
                        </span>
                    </div>
                ))}
                {tableList.length === 0 && (
                    <div className="col-span-full text-center py-16 text-slate-500">
                        Aucune table. Cliquez sur "Ajouter une table" pour commencer.
                    </div>
                )}
            </div>

            <p className="mt-6 text-xs text-slate-600 text-center">Cliquer sur une table change son statut : Libre → Occupee → Nettoyage → Libre</p>
        </div>
    );
}
