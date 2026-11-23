'use client';

import { useFeedback } from '../ui/Feedback';
import Button from '../ui/Button';
import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type Props = { showToast: (message: string, type?: 'success' | 'error') => void };

const monthsLabel = (months: number) => (months === 1 ? '1 mois' : `${months} mois`);

// Durée de l'essai gratuit offert à chaque nouvel inscrit (superadmin).
export default function AdminSignupTrialCard({ showToast }: Props) {
    const { confirm: confirmDialog } = useFeedback();
    const [current, setCurrent] = useState<number | null>(null);
    const [months, setMonths] = useState(1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        adminApi.getSignupTrial()
            .then(data => { setCurrent(data.months); setMonths(data.months); })
            .catch(() => showToast('Impossible de lire la durée de l’essai gratuit.', 'error'));
        // Chargé une seule fois : showToast change à chaque rendu du tableau de bord.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const save = async () => {
        if (!(await confirmDialog(`Les nouveaux inscrits auront ${monthsLabel(months)} d’essai gratuit (${months * 30} jours). Les comptes existants ne changent pas. Continuer ?`))) return;
        setSaving(true);
        try {
            const data = await adminApi.setSignupTrial(months);
            setCurrent(data.months);
            showToast(`Essai gratuit des nouveaux inscrits : ${monthsLabel(data.months)}.`);
        } catch (error: any) {
            showToast(error?.message || 'Impossible d’enregistrer la durée.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="glass-card p-5 border border-white/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-black text-white"><Gift size={16} /> Essai gratuit à l’inscription</p>
                <p className="mt-1 text-xs text-slate-400">
                    {current === null
                        ? 'Chargement…'
                        : `Actuellement ${monthsLabel(current)} (${current * 30} jours). S’applique aux comptes créés après l’enregistrement ; les comptes existants ne changent pas.`}
                </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <select
                    value={months}
                    onChange={event => setMonths(Number(event.target.value))}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    aria-label="Durée de l’essai gratuit"
                >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(value => (
                        <option key={value} value={value}>{monthsLabel(value)}</option>
                    ))}
                </select>
                <Button variant="primary" size="sm"
                    onClick={() => void save()}
                    disabled={saving || current === null || months === current}
                    className="text-xs uppercase tracking-widest"
                >
                    Enregistrer
                </Button>
            </div>
        </div>
    );
}
