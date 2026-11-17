'use client';

import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type Props = {
    userId: string;
    account: any;
    onExtended: (trialEndsAt: string) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR') : null);

// Fiche client : offrir des mois gratuits. Le commerçant est prévenu par notification interne, push et e-mail.
export default function AdminTrialExtensionCard({ userId, account, onExtended, showToast }: Props) {
    const [months, setMonths] = useState(1);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const provider = String(account?.subscription_provider || 'none');
    const paying = provider !== 'none' && provider !== '';
    const trialEnd = account?.trial_ends_at ? new Date(account.trial_ends_at) : null;
    const trialRunning = Boolean(trialEnd && trialEnd.getTime() > Date.now());
    const base = trialRunning && trialEnd ? trialEnd : new Date();
    const preview = new Date(base.getTime() + months * 30 * 86_400_000);

    const submit = async () => {
        const label = months === 1 ? '1 mois gratuit' : `${months} mois gratuits`;
        if (!window.confirm(`Offrir ${label} ? Le commerçant sera prévenu par notification et par e-mail.`)) return;
        setSaving(true);
        try {
            const result = await adminApi.extendTrial(userId, months, note.trim());
            onExtended(result.trial_ends_at);
            setNote('');
            showToast(`${label.charAt(0).toUpperCase()}${label.slice(1)} offert(s). Essai jusqu’au ${formatDate(result.trial_ends_at)}.`);
        } catch (error: any) {
            showToast(error?.message || 'Impossible de prolonger l’essai.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div>
                <p className="flex items-center gap-2 text-sm font-black text-white"><Gift size={16} /> Mois gratuits</p>
                <p className="mt-1 text-xs text-slate-400">
                    {paying
                        ? 'Ce compte paie déjà son abonnement : accordez plutôt un délai de grâce depuis l’onglet Abonnements.'
                        : trialRunning
                            ? `Essai gratuit en cours jusqu’au ${formatDate(account.trial_ends_at)}.`
                            : trialEnd
                                ? `Essai gratuit terminé le ${formatDate(account.trial_ends_at)}. Les mois offerts partent d’aujourd’hui.`
                                : 'Aucun essai enregistré. Les mois offerts partent d’aujourd’hui.'}
                </p>
            </div>
            {!paying ? (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={months}
                            onChange={event => setMonths(Number(event.target.value))}
                            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                            aria-label="Nombre de mois offerts"
                        >
                            {Array.from({ length: 12 }, (_, index) => index + 1).map(value => (
                                <option key={value} value={value}>{value === 1 ? '1 mois' : `${value} mois`}</option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400">Nouvelle fin d’essai : <strong className="text-white">{preview.toLocaleDateString('fr-FR')}</strong></span>
                    </div>
                    <textarea
                        value={note}
                        onChange={event => setNote(event.target.value)}
                        maxLength={300}
                        rows={2}
                        placeholder="Mot ajouté au message (facultatif), par exemple : Merci pour votre retour."
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    />
                    <button onClick={() => void submit()} disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
                        {saving ? 'Envoi…' : 'Offrir et prévenir le commerçant'}
                    </button>
                </>
            ) : null}
        </div>
    );
}
