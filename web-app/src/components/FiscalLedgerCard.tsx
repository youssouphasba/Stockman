'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, Download, RefreshCw } from 'lucide-react';
import { fiscal } from '../services/api';

type PeriodType = 'day' | 'month' | 'year';

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Espèces',
    mobile_money: 'Mobile Money',
    wave: 'Wave',
    orange_money: 'Orange Money',
    card: 'Carte',
    transfer: 'Virement',
    credit: 'À crédit',
};

// Registre inaltérable des ventes (commerces) : état, vérification, clôtures et archives.
export default function FiscalLedgerCard({ formatCurrency }: { formatCurrency: (value: number) => string }) {
    const { t } = useTranslation();
    const [available, setAvailable] = useState(true);
    const [status, setStatus] = useState<any>(null);
    const [periodType, setPeriodType] = useState<PeriodType>('day');
    const [closures, setClosures] = useState<any[]>([]);
    const [verifying, setVerifying] = useState(false);
    const [verification, setVerification] = useState<any>(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const [nextStatus, nextClosures] = await Promise.all([fiscal.status(), fiscal.closures(periodType)]);
            setStatus(nextStatus);
            setClosures(nextClosures?.closures || []);
            setError('');
        } catch (err: any) {
            // Restauration : le registre ne s'applique pas, la carte n'est pas affichée.
            if (err?.status === 404 || err?.status === 403) setAvailable(false);
            else setError(t('fiscal.load_error', 'Impossible de charger le registre.'));
        }
    }, [periodType, t]);

    useEffect(() => { void load(); }, [load]);

    const runVerification = async () => {
        setVerifying(true);
        try {
            setVerification(await fiscal.verify());
        } catch {
            setError(t('fiscal.load_error', 'Impossible de charger le registre.'));
        } finally {
            setVerifying(false);
        }
    };

    const downloadArchive = async (closure: any) => {
        try {
            const archive = await fiscal.archive(closure.period_type, closure.period_key);
            const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `registre-ventes-${closure.period_type}-${closure.period_key}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            setError(t('fiscal.download_error', "Impossible de télécharger l'archive."));
        }
    };

    if (!available) return null;

    const periods: { value: PeriodType; label: string }[] = [
        { value: 'day', label: t('fiscal.period_day', 'Jours') },
        { value: 'month', label: t('fiscal.period_month', 'Mois') },
        { value: 'year', label: t('fiscal.period_year', 'Années') },
    ];

    return (
        <section className="glass-card p-6 mt-8 border border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-300"><ShieldCheck size={20} /></div>
                    <div>
                        <h3 className="text-lg font-black text-white">{t('fiscal.title', 'Registre des ventes')}</h3>
                        <p className="text-xs text-slate-400 max-w-xl">
                            {t('fiscal.subtitle', 'Chaque vente et chaque annulation sont inscrites de façon inaltérable : numérotées, chaînées entre elles et clôturées chaque jour, mois et année.')}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => void load()} className="p-2 text-slate-400 hover:text-white" aria-label={t('common.refresh', 'Actualiser')}>
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => void runVerification()}
                        disabled={verifying}
                        className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-white hover:bg-primary/80 disabled:opacity-50"
                    >
                        {verifying ? t('fiscal.verifying', 'Vérification…') : t('fiscal.verify', "Vérifier l'intégrité")}
                    </button>
                </div>
            </div>

            {error && <p className="mb-4 text-sm text-rose-300">{error}</p>}

            {status && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">{t('fiscal.entries', 'Inscriptions')}</p>
                        <p className="mt-1 text-xl font-black text-white">{status.entries}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">{t('fiscal.cumulative', 'Total cumulé')}</p>
                        <p className="mt-1 text-xl font-black text-white">{formatCurrency(status.cumulative_total || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">{t('fiscal.last_entry', 'Dernière inscription')}</p>
                        <p className="mt-1 text-sm font-bold text-white">
                            {status.last_entry_at ? new Date(status.last_entry_at).toLocaleString() : t('fiscal.not_started', 'Le registre démarre à la prochaine vente.')}
                        </p>
                    </div>
                </div>
            )}

            {verification && (
                <div className={`mb-5 rounded-xl border p-4 text-sm ${verification.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                    <div className="flex items-center gap-2 font-bold">
                        {verification.ok ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                        {verification.ok
                            ? t('fiscal.verify_ok', 'Registre intact : {{count}} inscriptions contrôlées, aucune anomalie.', { count: verification.entries })
                            : t('fiscal.verify_problems', 'Anomalies détectées : {{count}}', { count: verification.problems.length })}
                    </div>
                    {!verification.ok && (
                        <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
                            {verification.problems.map((problem: any, index: number) => <li key={index}>{problem.message}</li>)}
                        </ul>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-black text-white">{t('fiscal.closures', 'Clôtures')}</h4>
                <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/10">
                    {periods.map((period) => (
                        <button
                            key={period.value}
                            onClick={() => setPeriodType(period.value)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold ${periodType === period.value ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            </div>

            {closures.length === 0 ? (
                <p className="text-sm text-slate-400">{t('fiscal.no_closures', 'Aucune période close pour l’instant. La première clôture apparaît le lendemain de la première vente.')}</p>
            ) : (
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto custom-scrollbar">
                    {closures.map((closure) => (
                        <div key={`${closure.period_type}-${closure.period_key}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div>
                                <p className="text-sm font-bold text-white">{closure.period_key}</p>
                                <p className="text-xs text-slate-400">
                                    {t('fiscal.sales_count', 'Ventes : {{count}}', { count: closure.totals?.sales_count || 0 })}
                                    {' · '}
                                    {t('fiscal.cancellations', 'Annulations : {{count}}', { count: closure.totals?.cancellations_count || 0 })}
                                    {' · '}
                                    {t('fiscal.tax', 'TVA')} {formatCurrency(closure.totals?.tax_total || 0)}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {Object.entries(closure.totals?.by_payment_method || {})
                                        .map(([method, amount]) => `${PAYMENT_LABELS[method] || method} ${formatCurrency(Number(amount) || 0)}`)
                                        .join(' · ')}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-white">{formatCurrency(closure.totals?.net_total || 0)}</span>
                                <button
                                    onClick={() => void downloadArchive(closure)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5"
                                >
                                    <Download size={13} /> {t('fiscal.download', 'Archive')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
