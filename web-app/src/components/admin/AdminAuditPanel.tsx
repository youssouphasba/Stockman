'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { admin as adminApi, type AdminAuditEntry } from '../../services/api';

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString('fr-FR') : '—');

type Props = {
    // Limite le journal aux actions sur un compte (fiche client).
    targetUserId?: string;
    compact?: boolean;
    onOpenUser?: (user: { user_id: string; name: string }) => void;
};

// Journal des modifications faites depuis l'admin : qui, quoi, sur quel compte, quand.
export default function AdminAuditPanel({ targetUserId, compact = false, onOpenUser }: Props) {
    const [items, setItems] = useState<AdminAuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [outcome, setOutcome] = useState<'' | 'success' | 'error'>('');
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const data = await adminApi.getAuditLogs({
                target_user_id: targetUserId,
                outcome: outcome || undefined,
                limit: compact ? 30 : 200,
            });
            setItems(data.items || []);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [compact, outcome, targetUserId]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className={compact ? 'space-y-3' : 'glass-card p-6 space-y-4'}>
            {!compact ? (
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white">Journal des actions admin</h3>
                        <p className="text-sm text-slate-400">Chaque modification faite depuis l’admin, avec son auteur et son résultat.</p>
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={outcome}
                            onChange={event => setOutcome(event.target.value as typeof outcome)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                            aria-label="Filtrer par résultat"
                        >
                            <option value="">Tous les résultats</option>
                            <option value="success">Réussies</option>
                            <option value="error">En échec</option>
                        </select>
                        <button onClick={() => void load()} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white" aria-label="Actualiser">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            ) : null}

            {failed ? (
                <p className="text-sm text-rose-300">Impossible de charger le journal.</p>
            ) : loading && !items.length ? (
                <p className="text-sm text-slate-500">Chargement…</p>
            ) : !items.length ? (
                <p className="text-sm text-slate-500">
                    {targetUserId ? 'Aucune action admin sur ce compte depuis la mise en place du journal.' : 'Aucune action enregistrée pour le moment.'}
                </p>
            ) : (
                <ul className="divide-y divide-white/5">
                    {items.map(item => (
                        <li key={item.log_id} className="py-3">
                            <button onClick={() => setExpanded(expanded === item.log_id ? null : item.log_id)} className="w-full text-left flex items-start gap-3">
                                {item.outcome === 'success'
                                    ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                                    : <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white">{item.label}</p>
                                    <p className="text-xs text-slate-500">
                                        {item.admin_name || item.admin_email || item.admin_id} · {formatDate(item.created_at)}
                                        {item.outcome === 'error' ? ` · échec (${item.status_code})` : ''}
                                    </p>
                                </div>
                            </button>
                            {expanded === item.log_id ? (
                                <div className="mt-2 ml-7 space-y-2">
                                    {!targetUserId && onOpenUser && item.target_user_ids?.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {item.target_user_ids.slice(0, 10).map(userId => (
                                                <button key={userId} onClick={() => onOpenUser({ user_id: userId, name: userId })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-primary hover:bg-white/10">
                                                    Ouvrir la fiche {userId}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                    <pre className="whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-slate-400">
                                        {JSON.stringify({ route: `${item.method} ${item.route}`, parametres: item.path_params, filtres: item.query_params, donnees: item.payload }, null, 2)}
                                    </pre>
                                </div>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
