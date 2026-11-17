'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { admin as adminApi, type AdminScopeInfo } from '../../services/api';

type Props = {
    user: { user_id: string; role?: string; admin_scopes?: string[]; parent_user_id?: string | null };
    catalog: AdminScopeInfo[];
    onChanged: (update: { role: string; admin_scopes: string[] }) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
};

// Fiche client, réservé au superadmin : donner ou retirer l'accès à l'admin, par périmètre.
export default function AdminAccessCard({ user, catalog, onChanged, showToast }: Props) {
    const isTeam = user.role === 'admin';
    const [scopes, setScopes] = useState<string[]>(user.admin_scopes || []);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setScopes(user.admin_scopes || []); }, [user.user_id, user.admin_scopes]);

    if (user.role === 'superadmin') {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                <p className="flex items-center gap-2 font-black text-white"><ShieldCheck size={16} /> Accès à l’admin</p>
                <p className="mt-1">Superadmin : tous les droits.</p>
            </div>
        );
    }

    const blocked = user.role === 'staff' || user.role === 'supplier' || Boolean(user.parent_user_id);

    const save = async (enabled: boolean) => {
        if (enabled && !scopes.length) {
            showToast('Choisissez au moins un périmètre.', 'error');
            return;
        }
        if (enabled && !isTeam && !window.confirm('Ce compte deviendra un compte de l’équipe Stockman : il ne pourra plus gérer de boutique tant que l’accès est actif. Continuer ?')) return;
        setSaving(true);
        try {
            const result = await adminApi.setAdminAccess(user.user_id, enabled, enabled ? scopes : []);
            onChanged({ role: result.role, admin_scopes: result.admin_scopes });
            showToast(enabled ? 'Accès à l’admin enregistré.' : 'Accès à l’admin retiré.');
        } catch (error: any) {
            showToast(error?.message || 'Impossible de modifier l’accès.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div>
                <p className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck size={16} /> Accès à l’admin</p>
                <p className="mt-1 text-xs text-slate-400">
                    {isTeam ? 'Membre de l’équipe Stockman, limité aux périmètres cochés.' : 'Aucun accès. Cochez les périmètres à ouvrir à ce membre de l’équipe.'}
                </p>
            </div>
            {blocked ? (
                <p className="text-xs text-amber-300">Ce compte appartient à une boutique ou à un fournisseur. Créez un compte dédié pour ce membre de l’équipe.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catalog.map(scope => (
                            <label key={scope.key} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={scopes.includes(scope.key)}
                                    onChange={event => setScopes(current => event.target.checked ? [...current, scope.key] : current.filter(key => key !== scope.key))}
                                />
                                <span>
                                    <span className="block text-xs font-black text-white">{scope.label}</span>
                                    <span className="block text-[11px] text-slate-500">{scope.description}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => void save(true)} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
                            {isTeam ? 'Enregistrer les périmètres' : 'Donner l’accès'}
                        </button>
                        {isTeam ? (
                            <button onClick={() => void save(false)} disabled={saving} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-200 disabled:opacity-50">
                                Retirer l’accès
                            </button>
                        ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500">Les accès de l’équipe, la base de données, la sécurité, les modules et le journal admin restent réservés au superadmin.</p>
                </>
            )}
        </div>
    );
}
