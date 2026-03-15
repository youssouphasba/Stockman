
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Factory, Plus, ChefHat, ClipboardList, ShoppingBag, Leaf,
    Play, CheckCircle2, XCircle, Trash2, Settings2, Flame,
    Calendar, DollarSign, AlertTriangle, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { production, products as productsApi, Recipe, ProductionOrder, ProductionDashboard } from '../services/api';
import { useDateFormatter } from '../hooks/useDateFormatter';

type SubTab = 'recipes' | 'orders' | 'shop' | 'materials';

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-[#1E293B] rounded-t-2xl p-4 md:p-6 max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
            {children}
        </div>
    );
}

const input = "w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-secondary/50";
const btn = (color: string) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${color}`;

export default function ProductionView({ onNavigate }: { onNavigate?: (page: string) => void }) {
    const { t } = useTranslation();
    const { formatCurrency } = useDateFormatter();
    const [activeTab, setActiveTab] = useState<SubTab>('recipes');
    const [loading, setLoading] = useState(true);
    const [recipesList, setRecipesList] = useState<Recipe[]>([]);
    const [ordersList, setOrdersList] = useState<ProductionOrder[]>([]);
    const [dashboard, setDashboard] = useState<ProductionDashboard | null>(null);
    const [rawMaterials, setRawMaterials] = useState<any[]>([]);
    const [shopProducts, setShopProducts] = useState<any[]>([]);

    // Modals
    const [showNewRecipe, setShowNewRecipe] = useState(false);
    const [showProduceModal, setShowProduceModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

    // Recipe form
    const [recipeName, setRecipeName] = useState('');
    const [recipeCategory, setRecipeCategory] = useState('');
    const [outputQty, setOutputQty] = useState('1');
    const [outputUnit, setOutputUnit] = useState('pièce');
    const [prepTime, setPrepTime] = useState('0');
    const [instructions, setInstructions] = useState('');

    // Produce form
    const [batchMultiplier, setBatchMultiplier] = useState('1');
    const [produceNotes, setProduceNotes] = useState('');

    // Complete form
    const [actualOutput, setActualOutput] = useState('');
    const [wasteQty, setWasteQty] = useState('0');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [r, o, d] = await Promise.all([
                production.recipes.list(),
                production.orders.list(),
                production.dashboard(),
            ]);
            setRecipesList(r);
            setOrdersList(o);
            setDashboard(d);
            const resp = await productsApi.list(undefined, 0, 200);
            const all = resp.items || resp;
            setRawMaterials(all.filter((p: any) => p.product_type === 'raw_material'));
            setShopProducts(all.filter((p: any) => !p.product_type || p.product_type === 'standard'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── Recipe CRUD ───
    const handleCreateRecipe = async () => {
        if (!recipeName.trim() || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await production.recipes.create({
                name: recipeName.trim(),
                category: recipeCategory || undefined,
                output_quantity: parseFloat(outputQty) || 1,
                output_unit: outputUnit,
                prep_time_min: parseInt(prepTime) || 0,
                instructions: instructions || undefined,
                ingredients: [],
            });
            setShowNewRecipe(false);
            setRecipeName(''); setRecipeCategory(''); setOutputQty('1'); setOutputUnit('pièce'); setPrepTime('0'); setInstructions('');
            loadData();
        } catch (e: any) {
            setError(e?.message || t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRecipe = async (recipe: Recipe) => {
        if (!confirm(`Supprimer la recette "${recipe.name}" ?`)) return;
        try {
            await production.recipes.delete(recipe.recipe_id);
            loadData();
        } catch (e: any) {
            alert(e?.message || t('common.error'));
        }
    };

    // ─── Order Actions ───
    const handleProduce = async () => {
        if (!selectedRecipe || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await production.orders.create(selectedRecipe.recipe_id, parseFloat(batchMultiplier) || 1, produceNotes || undefined);
            setShowProduceModal(false);
            setBatchMultiplier('1'); setProduceNotes(''); setSelectedRecipe(null);
            loadData();
        } catch (e: any) {
            setError(e?.message || t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartOrder = async (order: ProductionOrder) => {
        try {
            await production.orders.start(order.order_id);
            loadData();
        } catch (e: any) {
            alert(e?.message || t('common.error'));
        }
    };

    const handleCompleteOrder = async () => {
        if (!selectedOrder || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            const output = parseFloat(actualOutput) || selectedOrder.planned_output;
            const waste = parseFloat(wasteQty) || 0;
            await production.orders.complete(selectedOrder.order_id, output, waste);
            setShowCompleteModal(false);
            setSelectedOrder(null); setActualOutput(''); setWasteQty('0');
            loadData();
        } catch (e: any) {
            setError(e?.message || t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelOrder = async (order: ProductionOrder) => {
        if (!confirm('Annuler cet ordre ? Les matières premières seront remises en stock.')) return;
        try {
            await production.orders.cancel(order.order_id);
            loadData();
        } catch (e: any) {
            alert(e?.message || t('common.error'));
        }
    };

    const marginColor = (pct: number) => pct > 50 ? 'text-emerald-400' : pct > 20 ? 'text-amber-400' : 'text-red-400';

    const statusCfg: Record<string, { color: string; labelKey: string }> = {
        planned: { color: 'bg-blue-500/20 text-blue-400', labelKey: 'production.status_planned' },
        in_progress: { color: 'bg-amber-500/20 text-amber-400', labelKey: 'production.status_in_progress' },
        completed: { color: 'bg-emerald-500/20 text-emerald-400', labelKey: 'production.status_completed' },
        cancelled: { color: 'bg-red-500/20 text-red-400', labelKey: 'production.status_cancelled' },
    };

    const tabs: { key: SubTab; label: string; Icon: any }[] = [
        { key: 'recipes', label: t('production.tab_recipes', 'Recettes'), Icon: ChefHat },
        { key: 'orders', label: t('production.tab_orders', 'Ordres'), Icon: ClipboardList },
        { key: 'shop', label: t('production.tab_shop', 'Menu / Carte'), Icon: ShoppingBag },
        { key: 'materials', label: t('production.tab_materials', 'Ingrédients'), Icon: Leaf },
    ];

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-secondary" size={40} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0F172A] p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-secondary/20 text-secondary"><Factory size={24} /></div>
                    {t('production.title', 'Production')}
                </h1>
                {activeTab === 'recipes' && (
                    <button onClick={() => setShowNewRecipe(true)} className={btn('bg-secondary hover:bg-secondary/80 text-white shadow-lg shadow-secondary/20')}>
                        <Plus size={18} /> {t('production.new_recipe', 'Nouvelle recette')}
                    </button>
                )}
                {activeTab === 'shop' && onNavigate && (
                    <button onClick={() => onNavigate('inventory')} className={btn('bg-secondary hover:bg-secondary/80 text-white shadow-lg shadow-secondary/20')}>
                        <Plus size={18} /> {t('production.add_dish', 'Ajouter un plat')}
                    </button>
                )}
                {activeTab === 'materials' && onNavigate && (
                    <button onClick={() => onNavigate('inventory')} className={btn('bg-secondary hover:bg-secondary/80 text-white shadow-lg shadow-secondary/20')}>
                        <Plus size={18} /> {t('production.add_ingredient', 'Ajouter un ingrédient')}
                    </button>
                )}
            </div>

            {/* KPI Row */}
            {dashboard && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: t('production.today', "Aujourd'hui"), value: dashboard.today_productions, Icon: Flame, color: 'text-amber-400 bg-amber-500/10' },
                        { label: t('production.month', 'Ce mois'), value: dashboard.month_productions, Icon: Calendar, color: 'text-blue-400 bg-blue-500/10' },
                        { label: t('production.cost', 'Coût mois'), value: formatCurrency(dashboard.month_cost), Icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
                        { label: t('production.waste', 'Pertes'), value: `${dashboard.waste_percent}%`, Icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' },
                    ].map(({ label, value, Icon, color }) => (
                        <div key={label} className="glass-card p-4 flex items-center gap-3 border border-white/5">
                            <div className={`p-3 rounded-xl ${color.split(' ')[1]}`}>
                                <Icon size={20} className={color.split(' ')[0]} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">{label}</p>
                                <p className="text-xl font-black text-white">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit mb-6 border border-white/5">
                {tabs.map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => setActiveTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {/* ─── Recipes Tab ─── */}
            {activeTab === 'recipes' && (
                recipesList.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
                        <ChefHat size={56} className="mb-4 opacity-30" />
                        <p className="text-lg font-bold">{t('production.no_recipes', 'Aucune recette')}</p>
                        <p className="text-sm mt-1">{t('production.no_recipes_desc', 'Créez votre première recette.')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {recipesList.map(recipe => (
                            <div key={recipe.recipe_id} className="glass-card p-5 border border-white/5 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-white">{recipe.name}</p>
                                        {recipe.category && (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-secondary/20 text-secondary mt-1 inline-block">{recipe.category}</span>
                                        )}
                                    </div>
                                    <button onClick={() => handleDeleteRecipe(recipe)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                        <Trash2 size={15} />
                                    </button>
                                </div>

                                {recipe.ingredients.length > 0 && (
                                    <p className="text-xs text-slate-400 line-clamp-2">
                                        {recipe.ingredients.map(i => `${i.name || i.product_id} ${i.quantity}${i.unit}`).join(' · ')}
                                    </p>
                                )}

                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-xs text-slate-500">Coût</p>
                                        <p className="text-sm font-bold text-white">{Math.round(recipe.total_cost).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Sortie</p>
                                        <p className="text-sm font-bold text-white">{recipe.output_quantity} {recipe.output_unit}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Marge</p>
                                        <p className={`text-sm font-bold ${marginColor(recipe.margin_percent)}`}>{recipe.margin_percent}%</p>
                                    </div>
                                </div>

                                {recipe.prep_time_min > 0 && (
                                    <p className="text-xs text-slate-500">⏱ {recipe.prep_time_min} min</p>
                                )}

                                <button
                                    onClick={() => { setSelectedRecipe(recipe); setBatchMultiplier('1'); setShowProduceModal(true); }}
                                    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    <Play size={15} /> {t('production.produce', 'Produire')}
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ─── Orders Tab ─── */}
            {activeTab === 'orders' && (
                ordersList.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
                        <ClipboardList size={56} className="mb-4 opacity-30" />
                        <p className="text-lg font-bold">{t('production.no_orders', 'Aucun ordre de production')}</p>
                        <p className="text-sm mt-1">{t('production.no_orders_desc', "Lancez une production depuis l'onglet Recettes.")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {ordersList.map(order => {
                            const sc = statusCfg[order.status] || statusCfg.planned;
                            return (
                                <div key={order.order_id} className="glass-card p-4 border border-white/5 flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-bold text-white">{order.recipe_name}</p>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${sc.color}`}>{t(sc.labelKey)}</span>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            ×{order.batch_multiplier} → {order.planned_output} {order.output_unit} · Coût: {Math.round(order.total_material_cost).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {order.status === 'planned' && (
                                            <>
                                                <button onClick={() => handleStartOrder(order)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all" title="Démarrer">
                                                    <Play size={16} />
                                                </button>
                                                <button onClick={() => handleCancelOrder(order)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Annuler">
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'in_progress' && (
                                            <>
                                                <button onClick={() => { setSelectedOrder(order); setActualOutput(String(order.planned_output)); setShowCompleteModal(true); }}
                                                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all" title="Terminer">
                                                    <CheckCircle2 size={16} />
                                                </button>
                                                <button onClick={() => handleCancelOrder(order)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all" title="Annuler">
                                                    <XCircle size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ─── Shop Tab ─── */}
            {activeTab === 'shop' && (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500 mb-3">{t('production.shop_desc', 'Plats et produits du menu')}</p>
                    {shopProducts.length === 0 ? (
                        <div className="text-center py-16 text-slate-500"><ShoppingBag size={48} className="mx-auto mb-3 opacity-30" /><p>{t('production.no_shop', 'Aucun plat dans le menu')}</p></div>
                    ) : (
                        shopProducts.slice(0, 50).map((p: any) => (
                            <div key={p.product_id} className="glass-card px-4 py-3 border border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-white text-sm">{p.name}</p>
                                    <p className="text-xs text-slate-400">{formatCurrency(p.selling_price)} · Stock: {p.quantity} {p.unit || ''}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.quantity <= 0 ? 'bg-red-500/20 text-red-400' : p.quantity <= (p.min_stock || 5) ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {p.quantity}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ─── Materials Tab ─── */}
            {activeTab === 'materials' && (
                <div className="space-y-2">
                    <p className="text-xs text-slate-500 mb-3">{t('production.materials_desc', 'Ingrédients et matières premières')}</p>
                    {rawMaterials.length === 0 ? (
                        <div className="text-center py-16 text-slate-500"><Leaf size={48} className="mx-auto mb-3 opacity-30" /><p>{t('production.no_materials', 'Aucun ingrédient enregistré')}</p></div>
                    ) : (
                        rawMaterials.map((p: any) => (
                            <div key={p.product_id} className="glass-card px-4 py-3 border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10"><Leaf size={14} className="text-emerald-400" /></div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">{p.name}</p>
                                        <p className="text-xs text-slate-400">{formatCurrency(p.purchase_price)}/{p.unit || 'unité'} · Stock: {p.quantity}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.quantity <= 0 ? 'bg-red-500/20 text-red-400' : p.quantity <= (p.min_stock || 5) ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    {p.quantity}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ═══ Create Recipe Modal ═══ */}
            {showNewRecipe && (
                <Modal onClose={() => setShowNewRecipe(false)}>
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-black text-white">{t('production.new_recipe', 'Nouvelle recette')}</h2>
                        <button onClick={() => setShowNewRecipe(false)} className="text-slate-400 hover:text-white"><XCircle size={22} /></button>
                    </div>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('production.recipe_name', 'Nom de la recette')}>
                        <input className={input} value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Ex: Baguette tradition" />
                    </Field>
                    <Field label={t('production.category', 'Catégorie')}>
                        <input className={input} value={recipeCategory} onChange={e => setRecipeCategory(e.target.value)} placeholder="Ex: Pains, Viennoiseries" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('production.output_qty', 'Qté produite')}>
                            <input className={input} type="number" value={outputQty} onChange={e => setOutputQty(e.target.value)} />
                        </Field>
                        <Field label={t('production.output_unit', 'Unité')}>
                            <input className={input} value={outputUnit} onChange={e => setOutputUnit(e.target.value)} placeholder="pièce" />
                        </Field>
                    </div>
                    <Field label={t('production.prep_time', 'Temps préparation (min)')}>
                        <input className={input} type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
                    </Field>
                    <Field label={t('production.instructions', 'Instructions (optionnel)')}>
                        <textarea className={`${input} h-20 resize-none`} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Étapes de préparation..." />
                    </Field>
                    <p className="text-xs text-slate-500 italic mb-4">{t('production.ingredients_later', '💡 Vous pourrez ajouter les ingrédients après la création.')}</p>
                    <button onClick={handleCreateRecipe} disabled={submitting || !recipeName.trim()}
                        className="w-full py-3 bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
                        {submitting ? '...' : t('production.create_recipe', 'Créer la recette')}
                    </button>
                </Modal>
            )}

            {/* ═══ Produce Modal ═══ */}
            {showProduceModal && selectedRecipe && (
                <Modal onClose={() => setShowProduceModal(false)}>
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-black text-white">{t('production.produce', 'Produire')} : {selectedRecipe.name}</h2>
                        <button onClick={() => setShowProduceModal(false)} className="text-slate-400 hover:text-white"><XCircle size={22} /></button>
                    </div>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('production.multiplier', 'Multiplicateur de lot')}>
                        <input className={input} type="number" min="1" value={batchMultiplier} onChange={e => setBatchMultiplier(e.target.value)} />
                    </Field>
                    <p className="text-xs text-slate-400 italic mb-3">
                        → {(selectedRecipe.output_quantity * (parseFloat(batchMultiplier) || 1)).toFixed(0)} {selectedRecipe.output_unit} produites
                    </p>
                    <Field label={t('production.notes', 'Notes (optionnel)')}>
                        <input className={input} value={produceNotes} onChange={e => setProduceNotes(e.target.value)} placeholder="Notes..." />
                    </Field>
                    <button onClick={handleProduce} disabled={submitting}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                        <Play size={18} /> {t('production.create_order', 'Lancer la production')}
                    </button>
                </Modal>
            )}

            {/* ═══ Complete Modal ═══ */}
            {showCompleteModal && selectedOrder && (
                <Modal onClose={() => setShowCompleteModal(false)}>
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-lg font-black text-white">{t('production.complete', 'Terminer')} : {selectedOrder.recipe_name}</h2>
                        <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-white"><XCircle size={22} /></button>
                    </div>
                    {error && <p className="mb-3 text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{error}</p>}
                    <Field label={t('production.actual_output', 'Quantité réelle produite')}>
                        <input className={input} type="number" value={actualOutput} onChange={e => setActualOutput(e.target.value)} />
                    </Field>
                    <Field label={t('production.waste', 'Pertes (quantité)')}>
                        <input className={input} type="number" value={wasteQty} onChange={e => setWasteQty(e.target.value)} placeholder="0" />
                    </Field>
                    <button onClick={handleCompleteOrder} disabled={submitting}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 mt-2">
                        <CheckCircle2 size={18} /> {t('production.mark_complete', 'Marquer comme terminé')}
                    </button>
                </Modal>
            )}
        </div>
    );
}
