'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Brain, RefreshCw } from 'lucide-react';
import { admin as adminApi } from '../../services/api';

type ToastType = 'success' | 'error';

const formatTime = (seconds?: number | null) => (seconds ? new Date(seconds * 1000).toLocaleString('fr-FR') : '—');

const RAG_MODE_LABELS: Record<string, string> = {
    semantic: 'Recherche par le sens (normal)',
    keywords: 'Mots-clés seulement (dégradé)',
    empty: 'Aucune documentation chargée',
};

// État du service d'IA : génération Gemini et recherche documentaire de l'assistant.
export default function AdminAiHealthCard({ showToast }: { showToast: (message: string, type?: ToastType) => void }) {
    const [health, setHealth] = useState<any>(null);
    const [checking, setChecking] = useState(false);
    const [lastCheck, setLastCheck] = useState<any>(null);

    const load = useCallback(async () => {
        try {
            setHealth(await adminApi.getAiHealth());
        } catch {
            showToast("Impossible de lire l'état de l'IA.", 'error');
        }
    }, [showToast]);

    useEffect(() => { void load(); }, [load]);

    const runCheck = async () => {
        setChecking(true);
        try {
            const result = await adminApi.checkAiHealth();
            setLastCheck(result);
            setHealth((prev: any) => ({ ...(prev || {}), gemini: result.gemini, rag: result.rag }));
            showToast(result.generation?.ok ? "L'IA répond normalement." : "L'IA ne répond pas : voir le détail.", result.generation?.ok ? 'success' : 'error');
        } catch {
            showToast('Le test a échoué.', 'error');
        } finally {
            setChecking(false);
        }
    };

    const gemini = health?.gemini || {};
    const rag = health?.rag;
    const down = gemini.status === 'down';
    const ragDegraded = rag && rag.mode !== 'semantic';

    return (
        <div className={`glass-card p-6 border ${down ? 'border-rose-500/40' : 'border-white/10'}`}>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${down ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                        <Brain size={20} />
                    </div>
                    <div>
                        <h4 className="text-base font-black text-white">Service d’IA</h4>
                        <p className="text-xs text-slate-400">Modèle {health?.model || '—'} · une alerte est envoyée au superadmin en cas de crédit épuisé, de quota dépassé ou de clé refusée.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => void load()} className="p-2 text-slate-400 hover:text-white transition-all" aria-label="Recharger">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => void runCheck()} disabled={checking} className="rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-primary/80 disabled:opacity-50">
                        {checking ? 'Test...' : 'Tester maintenant'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Génération (Gemini)</p>
                    <p className={`mt-1 text-sm font-black ${down ? 'text-rose-300' : gemini.status === 'ok' ? 'text-emerald-300' : 'text-slate-300'}`}>
                        {down ? gemini.category_label || 'En panne' : gemini.status === 'ok' ? 'Opérationnelle' : 'Pas encore sollicitée depuis le démarrage'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Dernier succès : {formatTime(gemini.last_success_at)}</p>
                    {gemini.last_error && (
                        <p className="mt-2 text-xs text-rose-300/90 break-words">Dernière erreur ({formatTime(gemini.last_error_at)}) : {gemini.last_error}</p>
                    )}
                    {!health?.api_key_configured && health && <p className="mt-2 text-xs text-rose-300">Aucune clé GEMINI_API_KEY configurée sur le serveur.</p>}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Recherche documentaire de l’assistant</p>
                    {rag ? (
                        <>
                            <p className={`mt-1 text-sm font-black ${ragDegraded ? 'text-amber-300' : 'text-emerald-300'}`}>{RAG_MODE_LABELS[rag.mode] || rag.mode}</p>
                            <p className="mt-1 text-xs text-slate-500">{rag.embedded_chunks} / {rag.chunks} passages indexés · {rag.model}</p>
                            {rag.last_error && <p className="mt-2 text-xs text-amber-300/90 break-words">Dernière erreur : {rag.last_error}</p>}
                            {rag.next_retry_in_seconds > 0 && <p className="mt-1 text-xs text-slate-500">Nouvel essai automatique dans {Math.ceil(rag.next_retry_in_seconds / 60)} min.</p>}
                        </>
                    ) : (
                        <p className="mt-1 text-sm text-slate-400">Non initialisée (clé absente ou démarrage en cours).</p>
                    )}
                </div>
            </div>

            {lastCheck && (
                <p className="mt-4 text-xs text-slate-400">
                    Dernier test : génération {lastCheck.generation?.ok ? `OK (« ${lastCheck.generation.sample} »)` : `en échec — ${lastCheck.generation?.error || 'erreur inconnue'}`} · embeddings {lastCheck.embedding?.ok ? `OK (${lastCheck.embedding.dimensions} dimensions)` : `en échec — ${lastCheck.embedding?.error || 'erreur inconnue'}`}.
                </p>
            )}
        </div>
    );
}
