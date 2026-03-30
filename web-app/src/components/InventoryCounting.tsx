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
import { inventory as inventoryApi, ai as aiApi } from '../services/api';
import { useDateFormatter } from '../hooks/useDateFormatter';
import ScreenGuide, { GuideStep } from './ScreenGuide';

export default function InventoryCounting() {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<string | null>(null);

    // Vague 2: Shrinkage analysis
    const [countedItems, setCountedItems] = useState<Array<{ product_id: string; counted_quantity: number }>>([]);
    const [shrinkageResult, setShrinkageResult] = useState<any>(null);
    const [shrinkageLoading, setShrinkageLoading] = useState(false);

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
        const task = tasks.find(t => t.task_id === taskId);
        const count = prompt(t('inventory_counting.enter_count', { expected }), expected.toString());
        if (count === null || isNaN(parseInt(count))) return;

        const countedQty = parseInt(count);
        setSubmitting(taskId);
        try {
            await inventoryApi.submitResult(taskId, countedQty);
            // Track counted items for shrinkage analysis
            if (task.product_id) {
                setCountedItems(prev => [...prev, { product_id: task.product_id, counted_quantity: countedQty }]);
            }
            await loadTasks();
        } catch (err) {
            console.error("Error submitting count", err);
        } finally {
            setSubmitting(null);
        }
    };

    const runShrinkageAnalysis = async () => {
        if (countedItems.length === 0) return;
        setShrinkageLoading(true);
        try {
            const res = await aiApi.shrinkageAnalysis(countedItems);
            setShrinkageResult(res);
        } catch (err) {
            console.error("Shrinkage analysis error", err);
        } finally {
            setShrinkageLoading(false);
        }
    };

    // Auto-trigger shrinkage when all tasks done and we have counted items
    useEffect(() => {
        if (!loading && tasks.length === 0 && countedItems.length > 0 && !shrinkageResult && !shrinkageLoading) {
            runShrinkageAnalysis();
        }
    }, [tasks, loading, countedItems]);

    const countingSteps: GuideStep[] = [
        {
            title: t('guide.counting.role_title', "Rôle de l'inventaire tournant"),
            content: t('guide.counting.role_content', "L'inventaire tournant permet de vérifier régulièrement votre stock sans tout compter d'un coup. L'IA sélectionne chaque session un sous-ensemble de produits à vérifier en priorité (ruptures probables, produits à forte rotation, articles non vérifiés depuis longtemps)."),
        },
        {
            title: t('guide.counting.generate_title', "Générer les tâches de comptage"),
            content: t('guide.counting.generate_content', "Cliquez sur le bouton 'Générer les tâches' pour lancer une session d'inventaire."),
            details: [
                { label: t('guide.counting.btn_generate', "Bouton Générer les tâches"), description: t('guide.counting.btn_generate_desc', "L'IA analyse votre stock et sélectionne les produits à compter en priorité. Une liste de tâches est générée sous forme de cartes."), type: 'button' as const },
                { label: t('guide.counting.generate_tip', "Astuce"), description: t('guide.counting.generate_tip_desc', "Faites un inventaire tournant chaque semaine pour maintenir votre stock à jour sans interruption d'activité."), type: 'tip' as const },
            ],
        },
        {
            title: t('guide.counting.count_title', "Comptage des produits"),
            content: t('guide.counting.count_content', "Chaque carte représente un produit à compter."),
            details: [
                { label: t('guide.counting.card_product', "Carte produit"), description: t('guide.counting.card_product_desc', "Affiche le nom du produit, sa catégorie et la quantité théorique attendue selon le système."), type: 'card' as const },
                { label: t('guide.counting.input_qty', "Champ de saisie"), description: t('guide.counting.input_qty_desc', "Saisissez la quantité physique que vous avez réellement comptée pour ce produit."), type: 'button' as const },
                { label: t('guide.counting.btn_submit', "Bouton Soumettre"), description: t('guide.counting.btn_submit_desc', "Valide le comptage pour ce produit. Si la quantité saisie diffère de la quantité théorique, un ajustement de stock est enregistré automatiquement."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.counting.validation_title', "Validation et Écarts"),
            content: t('guide.counting.validation_content', "Quand tous les produits sont comptés, la session est clôturée."),
            details: [
                { label: t('guide.counting.discrepancy', "Écart de stock"), description: t('guide.counting.discrepancy_desc', "Si la quantité comptée ≠ quantité théorique, un mouvement d'ajustement est créé automatiquement dans l'historique de stock avec la mention 'Inventaire tournant'."), type: 'info' as const },
                { label: t('guide.counting.all_done', "État 'Tout compté'"), description: t('guide.counting.all_done_desc', "Quand toutes les tâches sont soumises, un écran de confirmation s'affiche avec un bouton pour relancer une nouvelle session."), type: 'info' as const },
            ],
        },
        {
            title: "Utilisation de l'IA",
            content: "L'IA intervient ici à deux moments : au lancement de la session pour choisir quoi compter, puis à la fin pour lire les écarts de stock.",
            details: [
                { label: 'Sélection des tâches', description: "Le choix des produits à compter est piloté par les signaux de risque et de rotation. Ce n'est pas un tirage aléatoire.", type: 'info' as const },
                { label: 'Analyse de la démarque', description: "Le bloc d'analyse n'apparaît qu'une fois le cycle terminé et s'il existe réellement des écarts exploitables.", type: 'card' as const },
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
                <div className="space-y-6">
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

                    {/* Shrinkage Analysis Results */}
                    {shrinkageLoading && (
                        <div className="glass-card p-6 text-center">
                            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-slate-400 text-sm">{t('inventory_counting.analyzing_shrinkage', 'Analyse de la démarque en cours...')}</p>
                        </div>
                    )}

                    {shrinkageResult && shrinkageResult.items_with_discrepancy > 0 && (
                        <div className="glass-card p-6 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-amber-400" />
                                {t('inventory_counting.shrinkage_title', 'Analyse de la démarque')}
                            </h3>

                            {/* Summary KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <span className="text-2xl font-black text-white">{shrinkageResult.items_with_discrepancy}</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('inventory_counting.items_with_gap', 'Écarts')}</p>
                                </div>
                                <div className="bg-rose-500/10 rounded-xl p-3 text-center border border-rose-500/20">
                                    <span className="text-2xl font-black text-rose-400">{formatCurrency(shrinkageResult.total_loss_value)}</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('inventory_counting.losses', 'Pertes')}</p>
                                </div>
                                <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
                                    <span className="text-2xl font-black text-emerald-400">{formatCurrency(shrinkageResult.total_surplus_value)}</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('inventory_counting.surplus', 'Excédent')}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <span className="text-2xl font-black text-amber-400">{shrinkageResult.shrinkage_rate}%</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('inventory_counting.shrinkage_rate', 'Taux démarque')}</p>
                                </div>
                            </div>

                            {/* Discrepancy details */}
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {shrinkageResult.discrepancies.slice(0, 15).map((d: any) => (
                                    <div key={d.product_id} className={`flex items-center justify-between p-3 rounded-lg border ${d.status === 'loss' ? 'bg-rose-500/5 border-rose-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-white text-sm font-semibold truncate block">{d.name}</span>
                                            <span className="text-[10px] text-slate-500">
                                                {t('inventory_counting.theoretical', 'Théorique')}: {d.theoretical_stock} → {t('inventory_counting.counted', 'Compté')}: {d.counted_stock}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 ml-3">
                                            <span className={`text-sm font-black ${d.status === 'loss' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {d.difference > 0 ? '+' : ''}{d.difference}
                                            </span>
                                            <span className="text-[10px] text-slate-500">{formatCurrency(d.value_impact)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Suspects */}
                            {shrinkageResult.suspects.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">{t('inventory_counting.suspects', 'Produits suspects (>10% d\'écart)')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {shrinkageResult.suspects.map((s: any) => (
                                            <span key={s.product_id} className="text-xs bg-rose-500/10 text-rose-300 px-2 py-1 rounded-lg border border-rose-500/20">
                                                {s.name} ({s.shrinkage_pct}%)
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
