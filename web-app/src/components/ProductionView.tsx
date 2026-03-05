
'use client';

import React, { useState, useEffect } from 'react';
import {
    Factory,
    Plus,
    LayoutDashboard,
    ClipboardList,
    Warehouse,
    TrendingUp,
    Clock,
    Search,
    ChevronRight,
    ChefHat,
    History,
    AlertCircle,
    CheckCircle2,
    Play,
    Settings2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { production, Recipe, ProductionOrder, ProductionDashboard } from '../services/api';

export default function ProductionView() {
    const { t } = useTranslation();
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'recipes' | 'orders' | 'warehouse'>('dashboard');
    const [dashboardData, setDashboardData] = useState<ProductionDashboard | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dash, rec, ord] = await Promise.all([
                production.dashboard(),
                production.recipes.list(),
                production.orders.list()
            ]);
            setDashboardData(dash);
            setRecipes(rec);
            setOrders(ord);
        } catch (err) {
            console.error('Failed to load production data:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { label: t('production.pending_orders'), value: dashboardData?.pending_orders || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: t('production.completed_today'), value: dashboardData?.completed_today || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: t('production.total_value_month'), value: `${dashboardData?.total_value_month?.toLocaleString() || 0} CFA`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: t('production.active_recipes'), value: recipes.length, icon: ChefHat, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0F172A] p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
                            <Factory size={28} />
                        </div>
                        {t('production.title')}
                    </h1>
                    <p className="text-slate-400 mt-1">{t('production.subtitle', 'Gérez vos recettes, ordres de production et transformations de stocks.')}</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">
                        <Plus size={20} />
                        {t('production.new_recipe')}
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-secondary/20">
                        <Play size={20} />
                        {t('production.start_production')}
                    </button>
                </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit mb-8 border border-white/5">
                {[
                    { id: 'dashboard', label: t('common.dashboard'), icon: LayoutDashboard },
                    { id: 'recipes', label: t('production.recipes'), icon: ChefHat },
                    { id: 'orders', label: t('production.orders'), icon: ClipboardList },
                    { id: 'warehouse', label: t('common.warehouse'), icon: Warehouse }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSubTab === tab.id
                                ? 'bg-white/10 text-white shadow-lg border border-white/10'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {activeSubTab === 'dashboard' && (
                        <div className="space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="glass-card p-6 flex items-center gap-5 group hover:border-secondary/30 transition-all border border-white/10">
                                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                            <stat.icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                            <p className="text-2xl font-black text-white">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Main Dashboard Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Orders */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <History size={20} className="text-secondary" />
                                        {t('production.recent_orders')}
                                    </h2>
                                    <div className="glass-card overflow-hidden border border-white/5">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 border-b border-white/10">
                                                <tr>
                                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('production.order_id')}</th>
                                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('production.recipe')}</th>
                                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('common.quantity')}</th>
                                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider">{t('common.status')}</th>
                                                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-wider"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {orders.slice(0, 5).map((order) => (
                                                    <tr key={order.order_id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="p-4 text-sm font-mono text-slate-400">#{order.order_id.slice(-6)}</td>
                                                        <td className="p-4">
                                                            <span className="text-sm font-bold text-white">{order.recipe_name}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="text-sm text-slate-300">{order.quantity}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${order.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                                                    order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                        'bg-amber-500/20 text-amber-400'
                                                                }`}>
                                                                {t(`production.status.${order.status}`)}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                                                                <ChevronRight size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Top Recipes */}
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <ChefHat size={20} className="text-purple-400" />
                                        {t('production.top_recipes')}
                                    </h2>
                                    <div className="glass-card p-6 space-y-4 border border-white/5 text-slate-300">
                                        {dashboardData?.top_recipes?.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-slate-500 w-4">{idx + 1}</span>
                                                    <span className="text-sm font-bold">{item.name}</span>
                                                </div>
                                                <span className="text-xs font-black text-secondary">{item.count} ordres</span>
                                            </div>
                                        ))}
                                        {!dashboardData?.top_recipes?.length && (
                                            <p className="text-center text-sm text-slate-500 py-8">Aucune donnée disponible</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'recipes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recipes.map((recipe) => (
                                <div key={recipe.recipe_id} className="glass-card p-6 group hover:border-secondary/20 transition-all border border-white/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                            <ChefHat size={24} />
                                        </div>
                                        <button className="p-2 rounded-lg bg-white/5 text-slate-500 hover:text-white">
                                            <Settings2 size={16} />
                                        </button>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-secondary transition-colors">{recipe.name}</h3>
                                    <p className="text-sm text-slate-400 mb-6 line-clamp-2">{recipe.description || 'Aucune description'}</p>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Coût total</span>
                                            <span className="font-black text-white">{recipe.total_cost.toLocaleString()} CFA</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Prix suggéré</span>
                                            <span className="font-black text-secondary">{recipe.suggested_price.toLocaleString()} CFA</span>
                                        </div>
                                    </div>

                                    <button className="w-full py-3 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white font-bold rounded-xl transition-all border border-secondary/20">
                                        Lancer la production
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
