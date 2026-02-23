'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { products as productsApi } from '../services/api';
import Modal from './Modal';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const REQUIRED_FIELDS = ['name'];
const OPTIONAL_FIELDS = ['sku', 'quantity', 'purchase_price', 'selling_price', 'unit', 'min_stock', 'category_name'];

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const { t } = useTranslation();
    const [step, setStep] = useState<'upload' | 'map' | 'confirm'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<any>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importSummary, setImportSummary] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (uploadFile: File) => {
        setLoading(true);
        setError(null);
        try {
            const res = await productsApi.importParse(uploadFile);
            setParseResult(res);

            // Smart mapping logic: Priority to AI, fallback to local heuristics
            const newMapping: Record<string, string> = { ...(res.ai_mapping || {}) };
            const columns = res.columns || [];

            [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].forEach(field => {
                // Only try heuristics if AI didn't find anything for this field
                if (!newMapping[field]) {
                    const match = columns.find((col: string) =>
                        col.toLowerCase() === field.toLowerCase() ||
                        col.toLowerCase().includes(field.toLowerCase())
                    );
                    if (match) newMapping[field] = match;
                }
            });

            setMapping(newMapping);
            setStep('map');
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'analyse du fichier");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!mapping['name']) {
            setError("Le champ 'Nom' est obligatoire.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await productsApi.importConfirm(parseResult.data, mapping);
            setImportSummary(res);
            setStep('confirm');
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'importation");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setStep('upload');
        setFile(null);
        setParseResult(null);
        setMapping({});
        setError(null);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { reset(); onClose(); }}
            title="Importation en masse (CSV)"
            maxWidth="2xl"
        >
            <div className="py-4">
                {step === 'upload' && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-12 hover:border-primary/50 transition-all group">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label htmlFor="csv-upload" className="flex flex-col items-center cursor-pointer">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} />
                            </div>
                            <span className="text-xl font-bold text-white mb-2">Choisir un fichier CSV</span>
                            <span className="text-slate-400 text-sm">Parcourir ou glisser-déposer</span>
                        </label>
                        {loading && <div className="mt-4 flex items-center gap-2 text-primary font-bold"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Analyse en cours...</div>}
                    </div>
                )}

                {step === 'map' && parseResult && (
                    <div className="space-y-6">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                                <CheckCircle size={18} className="text-emerald-400" />
                                {parseResult.data.length} produits détectés
                            </h3>
                            <p className="text-xs text-slate-400">Associez les colonnes de votre fichier aux champs Stockman.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {REQUIRED_FIELDS.map(field => (
                                <div key={field} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-primary/20">
                                    <div className="flex-1">
                                        <span className="text-xs font-black uppercase text-rose-400 block mb-1">Obligatoire</span>
                                        <span className="text-white font-bold flex items-center gap-2">
                                            {t(`common.${field}`)}
                                            {parseResult.ai_mapping?.[field] && (
                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">
                                                    IA ✨
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-600" />
                                    <select
                                        value={mapping[field] || ''}
                                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                        className="bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-primary w-48"
                                    >
                                        <option value="">Sélectionner...</option>
                                        {parseResult.columns?.map((col: string) => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            {OPTIONAL_FIELDS.map(field => (
                                <div key={field} className="flex items-center gap-4 bg-white/5 p-3 rounded-lg border border-white/5">
                                    <div className="flex-1">
                                        <span className="text-xs font-black uppercase text-slate-500 block mb-1">Optionnel</span>
                                        <span className="text-white font-bold flex items-center gap-2">
                                            {t(`common.${field}`)}
                                            {parseResult.ai_mapping?.[field] && (
                                                <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">
                                                    IA ✨
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-600" />
                                    <select
                                        value={mapping[field] || ''}
                                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                                        className="bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-primary w-48"
                                    >
                                        <option value="">Ignorer</option>
                                        {parseResult.columns?.map((col: string) => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={reset} className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">Retour</button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={loading || !mapping['name']}
                                className="flex-[2] btn-primary py-3 rounded-xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <div className="w-5 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Lancer l\'importation'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'confirm' && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Importation Terminée !</h3>
                        <p className="text-slate-400 mb-2 max-w-sm">
                            {importSummary?.count || 0} produits ont été ajoutés avec succès.
                        </p>
                        {importSummary?.errors?.length > 0 && (
                            <p className="text-rose-400 text-xs mb-8 italic">
                                ({importSummary.errors.length} erreurs ignorées)
                            </p>
                        )}
                        <div className="mb-8" />
                        <button
                            onClick={() => { onSuccess(); onClose(); reset(); }}
                            className="btn-primary px-12 py-3 rounded-xl font-black shadow-xl shadow-primary/20"
                        >
                            Terminer
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="text-rose-400 shrink-0" size={20} />
                        <div className="text-xs text-rose-400 font-bold">{error}</div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
