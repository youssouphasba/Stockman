'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Phone, Users, CalendarDays, Check } from 'lucide-react';
import { reservations as reservationsApi, tables as tablesApi } from '../services/api';

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    arrived: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    no_show: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmee',
    arrived: 'Arrivee',
    cancelled: 'Annulee',
    no_show: 'No-show',
};

const today = () => new Date().toISOString().split('T')[0];

export default function Reservations() {
    const [date, setDate] = useState(today());
    const [list, setList] = useState<any[]>([]);
    const [tableList, setTableList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ customer_name: '', phone: '', date: today(), time: '12:00', covers: 2, table_id: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [res, tabs] = await Promise.all([reservationsApi.list(date), tablesApi.list()]);
            setList(res || []);
            setTableList(tabs || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [date]);

    const handleCreate = async () => {
        if (!form.customer_name.trim()) return;
        setSaving(true);
        try {
            const r = await reservationsApi.create({ ...form, table_id: form.table_id || undefined });
            setList(prev => [...prev, r].sort((a, b) => a.time.localeCompare(b.time)));
            setShowCreate(false);
            setForm({ customer_name: '', phone: '', date: today(), time: '12:00', covers: 2, table_id: '', notes: '' });
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (reservation: any, status: string) => {
        const updated = status === 'arrived'
            ? await reservationsApi.arrive(reservation.reservation_id, reservation.table_id)
            : await reservationsApi.update(reservation.reservation_id, { status });
        setList(prev => prev.map(r => r.reservation_id === reservation.reservation_id ? { ...r, ...(updated || {}), status: updated?.status || status } : r));
    };

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#0F172A]">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Reservations</h1>
                    <p className="text-slate-400 text-sm">{list.length} reservation(s) le {date}</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white text-sm outline-none" />
                    <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold">
                        <Plus size={16} /> Nouvelle reservation
                    </button>
                </div>
            </header>

            {showCreate && (
                <div className="glass-card p-6 mb-8 space-y-4">
                    <h3 className="text-white font-bold text-lg">Nouvelle reservation</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Nom client *</label>
                            <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="M. Diallo" className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Telephone</label>
                            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+221 77..." className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Date</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Heure</label>
                            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Couverts</label>
                            <input type="number" min={1} max={50} value={form.covers} onChange={e => setForm(f => ({ ...f, covers: Number(e.target.value) }))} className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-sm" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400">Table</label>
                            <select value={form.table_id} onChange={e => setForm(f => ({ ...f, table_id: e.target.value }))} className="bg-[#0F172A] border border-white/10 rounded-xl p-3 text-white outline-none text-sm">
                                <option value="">— Sans preference —</option>
                                {tableList.map(t => <option key={t.table_id} value={t.table_id}>{t.name} ({t.capacity} pers.)</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 col-span-full">
                            <label className="text-xs text-slate-400">Notes</label>
                            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Allergie, occasion speciale..." className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleCreate} disabled={saving || !form.customer_name.trim()} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                            <Check size={16} /> {saving ? 'Enregistrement...' : 'Confirmer'}
                        </button>
                        <button onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm hover:bg-white/10">Annuler</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : list.length === 0 ? (
                <div className="text-center py-16 text-slate-500">Aucune reservation pour cette date.</div>
            ) : (
                <div className="space-y-3">
                    {list.map(r => (
                        <div key={r.reservation_id} className="glass-card p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 text-center">
                                    <div className="text-xl font-bold text-white">{r.time}</div>
                                </div>
                                <div>
                                    <div className="text-white font-bold">{r.customer_name}</div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        {r.phone && <span className="flex items-center gap-1"><Phone size={10} /> {r.phone}</span>}
                                        <span className="flex items-center gap-1"><Users size={10} /> {r.covers} pers.</span>
                                        {r.table_id && <span className="flex items-center gap-1"><CalendarDays size={10} /> {tableList.find(t => t.table_id === r.table_id)?.name || r.table_id}</span>}
                                        {r.notes && <span className="italic">{r.notes}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${STATUS_STYLES[r.status] || ''}`}>{STATUS_LABELS[r.status] || r.status}</span>
                                <select
                                    value={r.status}
                                    onChange={e => updateStatus(r, e.target.value)}
                                    className="bg-[#0F172A] border border-white/10 rounded-lg p-1.5 text-white text-xs outline-none"
                                >
                                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
