'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { admin as adminApi, type AdminScopeInfo, type AdminTeamMember } from '../../services/api';

type Props = {
    onOpenUser: (user: { user_id: string; name: string; email?: string }) => void;
};

// Équipe Stockman : qui a accès à l'admin et à quels périmètres.
export default function AdminTeamPanel({ onOpenUser }: Props) {
    const [members, setMembers] = useState<AdminTeamMember[]>([]);
    const [catalog, setCatalog] = useState<AdminScopeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const data = await adminApi.getTeam();
            setMembers(data.items || []);
            setCatalog(data.catalog || []);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const scopeLabel = (key: string) => catalog.find(scope => scope.key === key)?.label || key;

    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h3 className="text-xl font-black text-white">Équipe et accès</h3>
                    <p className="text-sm text-slate-400">
                        Pour donner un accès, ouvrez la fiche du compte (recherche en haut de page) puis l’onglet Infos.
                    </p>
                </div>
                <button onClick={() => void load()} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white" aria-label="Actualiser">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            {failed ? <p className="text-sm text-rose-300">Impossible de charger l’équipe.</p> : null}
            <ul className="divide-y divide-white/5">
                {members.map(member => (
                    <li key={member.user_id}>
                        <button
                            onClick={() => onOpenUser({ user_id: member.user_id, name: member.name || member.email || member.user_id, email: member.email })}
                            className="w-full py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between text-left hover:bg-white/5 rounded-lg px-2 -mx-2"
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-white truncate">{member.name || member.email}</span>
                                <span className="block text-xs text-slate-500 truncate">{member.email}</span>
                            </span>
                            <span className="flex flex-wrap gap-1.5">
                                {member.role === 'superadmin' ? (
                                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary">Superadmin</span>
                                ) : (member.admin_scopes || []).length ? (member.admin_scopes || []).map(scope => (
                                    <span key={scope} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-300">{scopeLabel(scope)}</span>
                                )) : (
                                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">Aucun périmètre</span>
                                )}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
