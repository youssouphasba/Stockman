'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ClipboardCheck,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Plus,
    Box
} from 'lucide-react';
import { inventory as inventoryApi } from '../services/api';

export default function InventoryCounting() {
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const res = await inventoryApi.getTasks('pending');
            setTasks(res);
        } catch (err) {
            console.error("Error loading inventory tasks", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            await inventoryApi.generateTasks();
            await loadTasks();
        } catch (err) {
            console.error("Error generating tasks", err);
        }
    };

    const handleSubmitCount = async (taskId: string, expected: number) => {
        const count = prompt(`Entrez la quantité réelle comptée (Attendu: ${expected}) :`, expected.toString());
        if (count === null || isNaN(parseInt(count))) return;

        setSubmitting(taskId);
        try {
            await inventoryApi.submitResult(taskId, parseInt(count));
            await loadTasks();
        } catch (err) {
            console.error("Error submitting count", err);
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <ClipboardCheck className="text-primary" size={32} />
                        Inventaire Tournant
                    </h1>
                    <p className="text-slate-400">Contrôles aléatoires pour garantir l'exactitude de vos stocks.</p>
                </div>
                <button
                    onClick={handleGenerate}
                    className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-primary/20"
                >
                    <RefreshCw size={18} /> Générer les tâches du jour
                </button>
            </header>

            {loading && tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Analyse des stocks...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                        <CheckCircle2 className="text-emerald-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Tout est à jour !</h2>
                    <p className="text-slate-400 mb-8 max-w-sm mx-auto">Toutes les tâches d'inventaire ont été complétées. Revenez demain ou générez de nouvelles tâches.</p>
                    <button
                        onClick={handleGenerate}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/10 transition-all font-bold"
                    >
                        Relancer un cycle
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.map((task) => {
                        return (
                            <div key={task.task_id} className="glass-card p-6 flex flex-col border border-white/5 hover:border-primary/30 transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Box size={24} />
                                    </div>
                                    <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                        En attente
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 truncate">{task.product_name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">{task.category || 'Général'}</p>

                                <div className="bg-white/5 rounded-2xl p-4 mb-6 flex justify-between items-center border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Quantité Théorique</span>
                                        <span className="text-2xl font-black text-white">{task.expected_quantity}</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                        <AlertTriangle className="text-slate-600" size={20} />
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSubmitCount(task.task_id, task.expected_quantity)}
                                    disabled={submitting === task.task_id}
                                    className="w-full btn-primary py-4 rounded-xl font-black flex items-center justify-center gap-2 group shadow-xl shadow-primary/20"
                                >
                                    {submitting === task.task_id ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <ClipboardCheck size={18} /> Saisir le comptage
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
