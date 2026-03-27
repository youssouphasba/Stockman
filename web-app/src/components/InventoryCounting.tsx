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
import ScreenGuide, { GuideStep } from './ScreenGuide';

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
        const count = prompt(t('inventory_counting.enter_count', { expected }), expected.toString());
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

    const countingSteps: GuideStep[] = [
        {
            title: t('guide.counting.role_title', "R�le de l'inventaire tournant"),
            content: t('guide.counting.role_content', "L'inventaire tournant permet de v�rifier r�guli�rement votre stock sans tout compter d'un coup. L'IA s�lectionne chaque session un sous-ensemble de produits � v�rifier en priorit� (ruptures probables, produits � forte rotation, articles non v�rifi�s depuis longtemps)."),
        },
        {
            title: t('guide.counting.generate_title', "G�n�rer les t�ches de comptage"),
            content: t('guide.counting.generate_content', "Cliquez sur le bouton 'G�n�rer les t�ches' pour lancer une session d'inventaire."),
            details: [
                { label: t('guide.counting.btn_generate', "Bouton G�n�rer les t�ches"), description: t('guide.counting.btn_generate_desc', "L'IA analyse votre stock et s�lectionne les produits � compter en priorit�. Une liste de t�ches est g�n�r�e sous forme de cartes."), type: 'button' as const },
                { label: t('guide.counting.generate_tip', "Astuce"), description: t('guide.counting.generate_tip_desc', "Faites un inventaire tournant chaque semaine pour maintenir votre stock � jour sans interruption d'activit�."), type: 'tip' as const },
            ],
        },
        {
            title: t('guide.counting.count_title', "Comptage des produits"),
            content: t('guide.counting.count_content', "Chaque carte repr�sente un produit � compter."),
            details: [
                { label: t('guide.counting.card_product', "Carte produit"), description: t('guide.counting.card_product_desc', "Affiche le nom du produit, sa cat�gorie et la quantit� th�orique attendue selon le syst�me."), type: 'card' as const },
                { label: t('guide.counting.input_qty', "Champ de saisie"), description: t('guide.counting.input_qty_desc', "Saisissez la quantit� physique que vous avez r�ellement compt�e pour ce produit."), type: 'button' as const },
                { label: t('guide.counting.btn_submit', "Bouton Soumettre"), description: t('guide.counting.btn_submit_desc', "Valide le comptage pour ce produit. Si la quantit� saisie diff�re de la quantit� th�orique, un ajustement de stock est enregistr� automatiquement."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.counting.validation_title', "Validation et �carts"),
            content: t('guide.counting.validation_content', "Quand tous les produits sont compt�s, la session est cl�tur�e."),
            details: [
                { label: t('guide.counting.discrepancy', "�cart de stock"), description: t('guide.counting.discrepancy_desc', "Si la quantit� compt�e ? quantit� th�orique, un mouvement d'ajustement est cr�� automatiquement dans l'historique de stock avec la mention 'Inventaire tournant'."), type: 'info' as const },
                { label: t('guide.counting.all_done', "�tat 'Tout compt�'"), description: t('guide.counting.all_done_desc', "Quand toutes les t�ches sont soumises, un �cran de confirmation s'affiche avec un bouton pour relancer une nouvelle session."), type: 'info' as const },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <ScreenGuide steps={countingSteps} guideKey="counting_tour" />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <ClipboardCheck className="text-primary" size={32} />
                        {t('inventory_counting.title')}
                    </h1>
                    <p className="text-slate-400">{t('inventory_counting.subtitle')}</p>
                </div>
                <button
                    onClick={handleGenerate}
                    className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-primary/20"
                >
                    <RefreshCw size={18} /> {t('inventory_counting.generate_tasks')}
                </button>
            </header>

            {loading && tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{t('inventory_counting.analyzing')}</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                        <CheckCircle2 className="text-emerald-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('inventory_counting.all_done')}</h2>
                    <p className="text-slate-400 mb-8 max-w-sm mx-auto">{t('inventory_counting.all_done_desc')}</p>
                    <button
                        onClick={handleGenerate}
                        className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/10 transition-all font-bold"
                    >
                        {t('inventory_counting.restart_cycle')}
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
                                        {t('inventory_counting.pending')}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 truncate">{task.product_name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">{task.category || t('common.general')}</p>

                                <div className="bg-white/5 rounded-2xl p-4 mb-6 flex justify-between items-center border border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('inventory_counting.expected_qty')}</span>
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
                                            <ClipboardCheck size={18} /> {t('inventory_counting.submit_count')}
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
