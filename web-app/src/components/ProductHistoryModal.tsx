'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, History, Package, DollarSign, X, Undo2, Sparkles } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';
import { stock as stockApi, products as productsApi, sales as salesApi } from '../services/api';
import Modal from './Modal';

interface ProductHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
}

export default function ProductHistoryModal({ isOpen, onClose, product }: ProductHistoryModalProps) {
    const { t } = useTranslation();
    const [movements, setMovements] = useState<any[]>([]);
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'stock' | 'price' | 'stats'>('stock');
    const [productForecast, setProductForecast] = useState<any>(null);
    const [productStats, setProductStats] = useState<any>(null);

    useEffect(() => {
        if (isOpen && product) {
            loadHistory();
        }
    }, [isOpen, product]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const [movRes, priceRes, forecastRes, statsRes] = await Promise.all([
                stockApi.getMovements(product.product_id, 30),
                productsApi.getPriceHistory(product.product_id),
                salesApi.productForecast(product.product_id).catch(() => null),
                productsApi.getStats(product.product_id).catch(() => null)
            ]);
            setMovements(movRes.items || movRes);
            setPriceHistory(priceRes || []);
            setProductForecast(forecastRes);
            setProductStats(statsRes);
        } catch (err) {
            console.error("History load error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleReverseMovement = async (movementId: string, qty: number, type: string) => {
        const label = type === 'in' ? t('products.mov_in') : t('products.mov_out');
        if (!window.confirm(t('products.confirm_reverse_movement', { qty, type: label }))) return;
        try {
            await stockApi.reverseMovement(movementId);
            await loadHistory();
        } catch (err: any) {
            alert(err?.message || t('products.reverse_movement_error'));
        }
    };

    if (!product) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('common.history') + ': ' + product.name}
            maxWidth="xl"
        >
            <div className="py-4">
                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
                    <button
                        onClick={() => setTab('stock')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === 'stock' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Stock
                    </button>
                    <button
                        onClick={() => setTab('price')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === 'price' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Prix
                    </button>
                    <button
                        onClick={() => setTab('stats')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === 'stats' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        Statistiques
                    </button>
                </div>

                {/* Résumé IA */}
                {!loading && productForecast && (
                    <div className="mb-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 mb-2 md:mb-0">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">Prévisions & Ventes</h4>
                                <p className="text-xs text-slate-400">Basé sur l'historique (30j)</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 md:gap-6 text-center justify-center">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Stock Actuel</p>
                                <p className="text-lg font-black text-white">{productForecast.current_stock}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Ventes (30j)</p>
                                <p className="text-lg font-black text-white">
                                    {movements.filter((m: any) => m.type === 'out').reduce((s: number, m: any) => s + m.quantity, 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Prév. (+30j)</p>
                                <p className="text-lg font-black text-emerald-400">+{productForecast.predicted_sales_30d}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Tendance</p>
                                <p className="text-sm font-bold mt-1">
                                    {productForecast.trend === 'up' || productForecast.trend === 'en hausse' ? <span className="text-emerald-400 flex items-center gap-1 justify-center"><TrendingUp size={14}/> Hausse</span> :
                                     productForecast.trend === 'down' || productForecast.trend === 'en baisse' ? <span className="text-rose-400 flex items-center gap-1 justify-center"><TrendingUp size={14} className="rotate-180"/> Baisse</span> :
                                     <span className="text-slate-400">Stable</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {tab === 'stock' ? (
                            <div className="glass-card p-4 md:p-6 h-[280px] md:h-[400px]">
                                <h3 className="text-white font-bold mb-4 md:mb-6 flex items-center gap-2">
                                    <Package size={18} className="text-primary" />
                                    Mouvements de stock (30j)
                                </h3>
                                <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={220}>
                                    <AreaChart data={(movements || []).filter((m: any) => m?.created_at != null)}>
                                        <defs>
                                            <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis
                                            dataKey="created_at"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickFormatter={(val) => { if (!val) return ''; const d = new Date(val); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                                        />
                                        <Area type="monotone" dataKey="new_quantity" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : tab === 'price' ? (
                            <div className="glass-card p-4 md:p-6 h-[280px] md:h-[400px]">
                                <h3 className="text-white font-bold mb-4 md:mb-6 flex items-center gap-2">
                                    <DollarSign size={18} className="text-emerald-500" />
                                    Historique des prix
                                </h3>
                                <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={220}>
                                    <BarChart data={(priceHistory || []).filter((p: any) => p?.recorded_at != null)}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis
                                            dataKey="recorded_at"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickFormatter={(val) => { if (!val) return ''; const d = new Date(val); return isNaN(d.getTime()) ? '' : d.toLocaleDateString(); }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="selling_price" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="purchase_price" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="glass-card p-4 md:p-6 mb-8">
                                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    Statistiques globales du produit (Historique Complet)
                                </h3>
                                
                                {productStats ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-slate-400 mb-1">Nombre total de Ventes</p>
                                            <p className="text-2xl font-bold text-white">{productStats.lifetime_sales}</p>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase">Unités vendues</p>
                                        </div>
                                        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                            <p className="text-xs text-emerald-400/80 mb-1">Chiffre d'affaires généré</p>
                                            <p className="text-2xl font-bold text-emerald-400">{productStats.lifetime_revenue.toLocaleString()} F</p>
                                            <p className="text-[10px] text-emerald-500/50 mt-1 uppercase">Total historique</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-slate-400 mb-1">Total Entrées (Achat/Réception)</p>
                                            <p className="text-2xl font-bold text-blue-400">{productStats.total_stock_in}</p>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase">Unités reçues</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-slate-400 mb-1">Total Sorties (Ventes + Pertes)</p>
                                            <p className="text-2xl font-bold text-rose-400">{productStats.total_stock_out}</p>
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase">Unités sorties</p>
                                        </div>
                                        
                                        <div className="col-span-2 md:col-span-4 mt-4 bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                                           <div>
                                               <p className="text-sm font-bold text-white mb-1">Ratio de performance</p>
                                               <p className="text-xs text-slate-400">Pourcentage des produits achetés qui ont été effectivement vendus.</p>
                                           </div>
                                           <div className="text-right">
                                               <p className="text-2xl font-black text-amber-400">
                                                   {productStats.total_stock_in > 0 
                                                       ? Math.round((productStats.lifetime_sales / productStats.total_stock_in) * 100) 
                                                       : 0}%
                                               </p>
                                           </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500 text-sm">
                                        Statistiques indisponibles pour ce produit.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4">Mouvements récents</h4>
                            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {movements.slice(0, 10).map((m: any) => (
                                    <div key={m.movement_id} className="flex justify-between items-center py-2 border-b border-white/5 group">
                                        <div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mr-2 ${m.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {m.type === 'in' ? 'Entrée' : 'Sortie'}
                                            </span>
                                            <span className="text-white font-bold text-sm">{m.reason || 'Régularisation'}</span>
                                            <p className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className={`font-black ${m.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {m.type === 'in' ? '+' : '-'}{m.quantity}
                                                </span>
                                                <p className="text-[10px] text-slate-500">Nouveau: {m.new_quantity}</p>
                                            </div>
                                            {!m.reason?.startsWith('Annulation de') && (
                                                <button
                                                    onClick={() => handleReverseMovement(m.movement_id, m.quantity, m.type)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400"
                                                    title={t('products.reverse_movement')}
                                                >
                                                    <Undo2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
