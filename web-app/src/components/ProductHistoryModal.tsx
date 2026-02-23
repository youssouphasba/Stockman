'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, History, Package, DollarSign, X } from 'lucide-react';
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
    const [tab, setTab] = useState<'stock' | 'price'>('stock');

    useEffect(() => {
        if (isOpen && product) {
            loadHistory();
        }
    }, [isOpen, product]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const [movRes, priceRes] = await Promise.all([
                stockApi.getMovements(product.product_id, 30),
                productsApi.getPriceHistory(product.product_id)
            ]);
            setMovements(movRes.items || movRes);
            setPriceHistory(priceRes || []);
        } catch (err) {
            console.error("History load error", err);
        } finally {
            setLoading(false);
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
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {tab === 'stock' ? (
                            <div className="glass-card p-6 h-[400px]">
                                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                    <Package size={18} className="text-primary" />
                                    Mouvements de stock (30j)
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
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
                        ) : (
                            <div className="glass-card p-6 h-[400px]">
                                <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                                    <DollarSign size={18} className="text-emerald-500" />
                                    Historique des prix
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
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
                        )}

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4">Mouvements récents</h4>
                            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {movements.slice(0, 10).map((m: any) => (
                                    <div key={m.movement_id} className="flex justify-between items-center py-2 border-b border-white/5">
                                        <div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mr-2 ${m.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                {m.type === 'in' ? 'Entrée' : 'Sortie'}
                                            </span>
                                            <span className="text-white font-bold text-sm">{m.reason || 'Régularisation'}</span>
                                            <p className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-black ${m.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {m.type === 'in' ? '+' : '-'}{m.quantity}
                                            </span>
                                            <p className="text-[10px] text-slate-500">Nouveau: {m.new_quantity}</p>
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
