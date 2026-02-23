'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Scan, Trash2, Package, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { products as productsApi, replenishment as replenishmentApi } from '../services/api';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
    onClose: () => void;
}

type Action = 'inventory' | 'replenish' | null;

export default function BatchScanModal({ onClose }: Props) {
    const [scannedCodes, setScannedCodes] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [phase, setPhase] = useState<'scan' | 'action'>('scan');
    const [action, setAction] = useState<Action>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const html5QrRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

    useEffect(() => {
        if (phase === 'scan') inputRef.current?.focus();
    }, [phase]);

    useEffect(() => {
        if (cameraActive) {
            const qr = new Html5Qrcode('batch-reader');
            html5QrRef.current = qr;
            qr.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText: string) => {
                    const now = Date.now();
                    if (decodedText === lastScanRef.current.code && now - lastScanRef.current.time < 1500) return;
                    lastScanRef.current = { code: decodedText, time: now };
                    setScannedCodes(prev => prev.includes(decodedText) ? prev : [decodedText, ...prev]);
                },
                undefined
            ).catch(() => { });
        } else {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { }).finally(() => {
                    html5QrRef.current?.clear();
                    html5QrRef.current = null;
                });
            }
        }
        return () => {
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { }).finally(() => {
                    html5QrRef.current?.clear();
                    html5QrRef.current = null;
                });
            }
        };
    }, [cameraActive]);

    function addCode(code: string) {
        const trimmed = code.trim();
        if (trimmed && !scannedCodes.includes(trimmed)) {
            setScannedCodes(prev => [trimmed, ...prev]);
        }
    }

    function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            addCode(inputValue);
            setInputValue('');
        }
    }

    async function processBatch() {
        if (!action) return;
        setLoading(true);
        setError(null);
        try {
            if (action === 'inventory') {
                const res = await productsApi.batchStockUpdate(scannedCodes, 1);
                let msg = res.message || `${res.updated_count} articles mis à jour.`;
                if (res.not_found_count && res.not_found_count > 0) {
                    msg += ` (${res.not_found_count} code(s) inconnu(s) : ${res.not_found?.join(', ')})`;
                }
                setResult(msg);
            } else if (action === 'replenish') {
                const res = await replenishmentApi.automate();
                setResult(res.message || `Commandes générées avec succès.`);
            }
        } catch (err: any) {
            setError(err.message || 'Erreur lors du traitement.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="glass-card w-full max-w-xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden border-primary/20 shadow-2xl shadow-primary/10">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <Layers size={20} className="text-primary" />
                        Scan par Lot
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Result view */}
                {result ? (
                    <div className="flex flex-col items-center justify-center gap-6 p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 size={32} className="text-emerald-400" />
                        </div>
                        <p className="text-white font-bold text-base">{result}</p>
                        <button onClick={onClose} className="btn-primary px-8 py-3 rounded-xl font-black uppercase tracking-widest">
                            Fermer
                        </button>
                    </div>

                ) : phase === 'scan' ? (
                    /* ── Phase 1 : Scan ── */
                    <div className="flex flex-col gap-5 p-6 overflow-y-auto custom-scrollbar">

                        {/* Keyboard wedge input */}
                        <div>
                            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 block">
                                Scanner ou saisir un code-barres (+ Entrée)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder="Code SKU ou EAN..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-primary/50 outline-none font-mono text-sm"
                                    autoFocus
                                />
                                <button
                                    onClick={() => { addCode(inputValue); setInputValue(''); }}
                                    disabled={!inputValue.trim()}
                                    className="px-4 py-3 bg-primary/20 text-primary rounded-xl hover:bg-primary/30 transition-all font-black disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Camera toggle */}
                        <button
                            onClick={() => setCameraActive(prev => !prev)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-bold text-sm w-fit ${cameraActive
                                ? 'border-primary/50 bg-primary/10 text-primary'
                                : 'border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                        >
                            <Scan size={16} />
                            {cameraActive ? 'Arrêter la caméra' : 'Activer la caméra'}
                        </button>

                        {/* Camera scanner div */}
                        {cameraActive && (
                            <div
                                id="batch-reader"
                                className="rounded-xl overflow-hidden bg-black border border-white/10 min-h-[200px]"
                            />
                        )}

                        {/* Scanned codes list */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-black text-white uppercase tracking-widest">
                                    {scannedCodes.length} article(s) scanné(s)
                                </span>
                                {scannedCodes.length > 0 && (
                                    <button
                                        onClick={() => setScannedCodes([])}
                                        className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                                    >
                                        Tout effacer
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                                {scannedCodes.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm italic py-6">
                                        Aucun article. Connectez un lecteur USB ou activez la caméra.
                                    </p>
                                ) : (
                                    scannedCodes.map(code => (
                                        <div key={code} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-primary shrink-0" />
                                                <span className="font-mono text-sm text-white">{code}</span>
                                            </div>
                                            <button
                                                onClick={() => setScannedCodes(prev => prev.filter(c => c !== code))}
                                                className="p-1 text-rose-400 hover:text-rose-300 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {scannedCodes.length > 0 && (
                            <button
                                onClick={() => setPhase('action')}
                                className="btn-primary py-3 rounded-xl font-black uppercase tracking-widest"
                            >
                                Continuer ({scannedCodes.length} article{scannedCodes.length > 1 ? 's' : ''})
                            </button>
                        )}
                    </div>

                ) : (
                    /* ── Phase 2 : Action ── */
                    <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar">
                        <div className="text-center py-2">
                            <span className="text-5xl font-black text-primary">{scannedCodes.length}</span>
                            <p className="text-slate-400 text-sm mt-1">
                                article{scannedCodes.length > 1 ? 's' : ''} identifié{scannedCodes.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choisir une action</p>

                            <button
                                onClick={() => setAction('inventory')}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${action === 'inventory' ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Package size={22} className="text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-white text-sm">Inventaire rapide</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Confirmer l'existence de ces articles en stock (+1 unité chacun)</p>
                                </div>
                                {action === 'inventory' && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>

                            <button
                                onClick={() => setAction('replenish')}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${action === 'replenish' ? 'border-primary/50 bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <RefreshCw size={22} className="text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-white text-sm">Réapprovisionnement auto</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Générer des commandes fournisseurs pour les produits en rupture</p>
                                </div>
                                {action === 'replenish' && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPhase('scan')}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 font-bold hover:bg-white/5 transition-all"
                            >
                                Retour
                            </button>
                            <button
                                onClick={processBatch}
                                disabled={!action || loading}
                                className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest transition-all ${action && !loading ? 'btn-primary' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Traitement...
                                    </span>
                                ) : 'Appliquer'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
