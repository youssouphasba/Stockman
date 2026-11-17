'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { admin as adminApi, type AdminTodayGroup, type AdminTodayItem, type AdminTodayQueue } from '../../services/api';

const SEVERITY_TONE: Record<AdminTodayGroup['severity'], string> = {
    critical: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
};

type Props = {
    onOpenUser: (user: { user_id: string; name: string; email?: string }) => void;
    onOpenSection: (section: string) => void;
};

// Dossiers à traiter aujourd'hui, avec le nom de chaque client concerné.
export default function AdminTodayPanel({ onOpenUser, onOpenSection }: Props) {
    const [queue, setQueue] = useState<AdminTodayQueue | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            setQueue(await adminApi.getTodayQueue());
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openItem = (group: AdminTodayGroup, item: AdminTodayItem) => {
        if (item.user_id) onOpenUser({ user_id: item.user_id, name: item.name, email: item.email });
        else onOpenSection(group.section);
    };

    const groups = (queue?.groups || []).filter(group => group.total > 0);

    return (
        <div className="glass-card p-6 border border-primary/20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-5">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">À traiter aujourd’hui</p>
                    <h3 className="mt-2 text-xl font-black text-white tracking-tight">
                        {queue ? `${queue.total} dossier(s), dont ${queue.urgent} urgent(s)` : 'Dossiers du jour'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">Cliquez sur un client pour ouvrir sa fiche.</p>
                </div>
                <button
                    onClick={() => void load()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-white/10"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Actualiser
                </button>
            </div>

            {failed ? (
                <p className="text-sm text-rose-300">Impossible de charger les dossiers du jour.</p>
            ) : loading && !queue ? (
                <p className="text-sm text-slate-500">Chargement…</p>
            ) : groups.length === 0 ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
                    <CheckCircle2 size={18} /> Rien à traiter pour le moment.
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {groups.map(group => (
                        <div key={group.code} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-white">{group.title}</h4>
                                    <p className="text-xs text-slate-500">{group.hint}</p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black ${SEVERITY_TONE[group.severity]}`}>{group.total}</span>
                            </div>
                            <ul className="mt-3 divide-y divide-white/5">
                                {group.items.map((item, index) => (
                                    <li key={`${group.code}-${item.ref || item.user_id || index}`}>
                                        <button
                                            onClick={() => openItem(group, item)}
                                            className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-white/5 rounded-lg px-2 -mx-2"
                                        >
                                            {item.urgent ? <AlertTriangle size={14} className="shrink-0 text-rose-400" /> : <span className="w-3.5 shrink-0" />}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-white">{item.name}</p>
                                                <p className="truncate text-xs text-slate-400">{item.detail}{item.meta ? ` · ${item.meta}` : ''}</p>
                                            </div>
                                            <ChevronRight size={14} className="shrink-0 text-slate-600" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {group.total > group.items.length ? (
                                <button onClick={() => onOpenSection(group.section)} className="mt-2 text-xs font-bold text-primary hover:underline">
                                    Voir les {group.total} dossiers
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
