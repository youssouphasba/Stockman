'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type ToastType = 'success' | 'error';
type RuleValue = boolean | undefined;
type ModuleRule = { default: boolean; plans: Record<string, boolean>; business_types: Record<string, boolean> };
type Option = { key: string; label: string };
type PolicyResponse = { policy: Record<string, ModuleRule>; modules: Option[]; plans: Option[]; business_types: Option[] };

// Valeur d'un niveau : « hérité » laisse décider le niveau plus général.
const ruleToChoice = (value: RuleValue) => (value === true ? 'on' : value === false ? 'off' : 'inherit');
const choiceToRule = (choice: string): RuleValue => (choice === 'on' ? true : choice === 'off' ? false : undefined);

function ChoiceSelect({ value, onChange, inheritLabel }: { value: RuleValue; onChange: (value: RuleValue) => void; inheritLabel: string }) {
    const choice = ruleToChoice(value);
    return (
        <select
            value={choice}
            onChange={(event) => onChange(choiceToRule(event.target.value))}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold outline-none transition-colors bg-[#111827] ${choice === 'on' ? 'border-emerald-500/40 text-emerald-300' : choice === 'off' ? 'border-rose-500/40 text-rose-300' : 'border-white/10 text-slate-300'}`}
        >
            <option value="inherit">{inheritLabel}</option>
            <option value="on">Activé</option>
            <option value="off">Coupé</option>
        </select>
    );
}

// Réglage des modules de la plateforme : global, par plan et par type d'activité.
// Le niveau le plus précis l'emporte : compte, puis type d'activité, puis plan, puis réglage global.
export default function AdminModulesPanel({ showToast }: { showToast: (message: string, type?: ToastType) => void }) {
    const [data, setData] = useState<PolicyResponse | null>(null);
    const [draft, setDraft] = useState<Record<string, ModuleRule>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminApi.getModulePolicy();
            setData(result);
            setDraft(result.policy || {});
        } catch {
            showToast('Impossible de charger les modules.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { void load(); }, [load]);

    const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(data?.policy || {}), [data?.policy, draft]);

    const updateRule = (module: string, level: 'plans' | 'business_types', key: string, value: RuleValue) => {
        setDraft((current) => {
            const rule = current[module];
            const nextLevel = { ...rule[level] };
            if (value === undefined) delete nextLevel[key];
            else nextLevel[key] = value;
            return { ...current, [module]: { ...rule, [level]: nextLevel } };
        });
    };

    const save = async () => {
        setSaving(true);
        try {
            const result = await adminApi.setModulePolicy(draft);
            setData(result);
            setDraft(result.policy || {});
            showToast('Modules enregistrés. Les comptes voient le changement à leur prochaine connexion ou ouverture de l’application.');
        } catch {
            showToast('Impossible d’enregistrer les modules.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !data) {
        return <div className="glass-card p-10 text-center text-sm text-slate-400">Chargement des modules...</div>;
    }
    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="glass-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                        <h3 className="text-base font-black text-white uppercase tracking-tighter">Modules de la plateforme</h3>
                        <p className="mt-1 text-xs text-slate-400">
                            Un module coupé disparaît de l’application mobile et du web, avec tout ce qui s’y rattache (onglet, filtres, rappels, alertes, statistiques), et le serveur refuse ses accès.
                            Le niveau le plus précis l’emporte : réglage du compte (fiche client), puis type d’activité, puis plan, puis réglage global.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => void load()} className="p-2 text-slate-400 hover:text-white transition-all" aria-label="Recharger">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => void save()}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-primary/80 disabled:opacity-40 transition-all"
                        >
                            <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </div>
            </div>

            {data.modules.map((module) => {
                const rule = draft[module.key];
                if (!rule) return null;
                const globalLabel = rule.default ? 'Activé' : 'Coupé';
                return (
                    <div key={module.key} className="glass-card p-6 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h4 className="text-lg font-black text-white">{module.label}</h4>
                                <p className="text-xs text-slate-400">Réglage global, appliqué quand aucun niveau plus précis n’est défini.</p>
                            </div>
                            <button
                                onClick={() => setDraft((current) => ({ ...current, [module.key]: { ...rule, default: !rule.default } }))}
                                className={`relative h-7 w-14 shrink-0 rounded-full transition-all ${rule.default ? 'bg-primary' : 'bg-slate-700'}`}
                                aria-label={`${module.label} : ${globalLabel}`}
                            >
                                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${rule.default ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div>
                            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Par plan</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {data.plans.map((plan) => (
                                    <div key={plan.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                        <span className="text-sm font-bold text-white">{plan.label}</span>
                                        <ChoiceSelect
                                            value={rule.plans[plan.key]}
                                            onChange={(value) => updateRule(module.key, 'plans', plan.key, value)}
                                            inheritLabel={`Global (${globalLabel.toLowerCase()})`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500">Par type d’activité</p>
                            <p className="mb-3 text-xs text-slate-500">Prioritaire sur le plan. Sur l’application mobile, les restaurants gardent leur parcours propre, sans onglet Fournisseurs.</p>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {data.business_types.map((type) => (
                                    <div key={type.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                                        <span className="min-w-0 truncate text-sm text-slate-200">{type.label}</span>
                                        <ChoiceSelect
                                            value={rule.business_types[type.key]}
                                            onChange={(value) => updateRule(module.key, 'business_types', type.key, value)}
                                            inheritLabel="Selon le plan"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

type AccountModuleItem = { label: string; enabled: boolean; source: string; source_label: string; override: boolean | null };
export type AccountModulesView = { plan: string; business_type: string; items: Record<string, AccountModuleItem> } | null;

// Bloc de la fiche client : état de chaque module pour ce compte et réglage propre au compte.
export function AccountModulesCard({ userId, view, onChange, showToast }: {
    userId: string;
    view: AccountModulesView;
    onChange: (view: AccountModulesView) => void;
    showToast: (message: string, type?: ToastType) => void;
}) {
    const [savingKey, setSavingKey] = useState<string | null>(null);
    if (!view) return null;

    const setOverride = async (module: string, value: RuleValue) => {
        setSavingKey(module);
        try {
            const next = await adminApi.setAccountModules(userId, { [module]: value === undefined ? null : value });
            onChange(next);
            showToast('Module mis à jour pour ce compte.');
        } catch {
            showToast('Impossible de modifier le module.', 'error');
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Modules de la plateforme</div>
            {Object.entries(view.items).map(([key, item]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-white">
                            {item.label} : <span className={item.enabled ? 'text-emerald-300' : 'text-rose-300'}>{item.enabled ? 'activé' : 'coupé'}</span>
                        </div>
                        <div className="text-xs text-slate-500">Décidé par : {item.source_label}</div>
                    </div>
                    <div className={savingKey === key ? 'opacity-50 pointer-events-none' : ''}>
                        <ChoiceSelect value={item.override ?? undefined} onChange={(value) => void setOverride(key, value)} inheritLabel="Règles générales" />
                    </div>
                </div>
            ))}
        </div>
    );
}
