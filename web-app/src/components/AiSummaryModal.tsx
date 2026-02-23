'use client';

import React from 'react';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    Sparkles, Calendar, TrendingUp, AlertTriangle, Package,
    ShoppingCart, Bell, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import Modal from './Modal';

interface AiSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: string;
    data?: any;
}

export default function AiSummaryModal({ isOpen, onClose, summary, data }: AiSummaryModalProps) {
    const { formatCurrency } = useDateFormatter();
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const kpis = [
        {
            label: "CA du jour",
            value: data?.today_revenue != null ? formatCurrency(data.today_revenue) : '—',
            icon: <TrendingUp size={18} />,
            color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'
        },
        {
            label: "Ventes du jour",
            value: data?.today_sales_count != null ? `${data.today_sales_count} vente${data.today_sales_count !== 1 ? 's' : ''}` : '—',
            icon: <ShoppingCart size={18} />,
            color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20'
        },
        {
            label: "Ruptures de stock",
            value: data?.out_of_stock_count != null ? `${data.out_of_stock_count} produit${data.out_of_stock_count !== 1 ? 's' : ''}` : '—',
            icon: <AlertTriangle size={18} />,
            color: data?.out_of_stock_count > 0 ? 'text-rose-400' : 'text-slate-400',
            bg: data?.out_of_stock_count > 0 ? 'bg-rose-500/10' : 'bg-white/5',
            border: data?.out_of_stock_count > 0 ? 'border-rose-500/20' : 'border-white/10'
        },
        {
            label: "Stock faible",
            value: data?.low_stock_count != null ? `${data.low_stock_count} produit${data.low_stock_count !== 1 ? 's' : ''}` : '—',
            icon: <Package size={18} />,
            color: data?.low_stock_count > 0 ? 'text-amber-400' : 'text-slate-400',
            bg: data?.low_stock_count > 0 ? 'bg-amber-500/10' : 'bg-white/5',
            border: data?.low_stock_count > 0 ? 'border-amber-500/20' : 'border-white/10'
        },
        {
            label: "Alertes actives",
            value: data?.unread_alerts != null ? `${data.unread_alerts} alerte${data.unread_alerts !== 1 ? 's' : ''}` : '—',
            icon: <Bell size={18} />,
            color: data?.unread_alerts > 0 ? 'text-primary' : 'text-slate-400',
            bg: data?.unread_alerts > 0 ? 'bg-primary/10' : 'bg-white/5',
            border: data?.unread_alerts > 0 ? 'border-primary/20' : 'border-white/10'
        },
        {
            label: "Total produits",
            value: data?.total_products != null ? `${data.total_products} produit${data.total_products !== 1 ? 's' : ''}` : '—',
            icon: <Package size={18} />,
            color: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10'
        },
    ];

    const criticalProducts = data?.critical_products || [];
    const recentSales = data?.recent_sales || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rapport Quotidien">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">

                {/* Header */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-transparent border border-primary/20">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles className="text-primary animate-pulse" size={22} />
                    </div>
                    <div>
                        <p className="text-white font-black text-base capitalize">{today}</p>
                        <p className="text-slate-400 text-xs">Synthèse automatique de votre activité</p>
                    </div>
                </div>

                {/* KPI Grid */}
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Indicateurs clés</p>
                    <div className="grid grid-cols-2 gap-3">
                        {kpis.map((kpi, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${kpi.bg} border ${kpi.border}`}>
                                <span className={`shrink-0 ${kpi.color}`}>{kpi.icon}</span>
                                <div className="min-w-0">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide leading-none mb-0.5">{kpi.label}</p>
                                    <p className={`text-sm font-black ${kpi.color} truncate`}>{kpi.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Critical products (if any) */}
                {criticalProducts.length > 0 && (
                    <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Produits critiques</p>
                        <div className="space-y-2">
                            {criticalProducts.map((p: any) => (
                                <div key={p.product_id} className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${p.quantity === 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {p.quantity === 0
                                            ? <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                                            : <AlertCircle size={14} className="text-amber-400 shrink-0" />}
                                        <span className="text-white text-sm font-semibold truncate">{p.name}</span>
                                        {p.sku && <span className="text-slate-500 text-[10px] font-mono hidden sm:block">{p.sku}</span>}
                                    </div>
                                    <span className={`text-sm font-black shrink-0 ml-3 ${p.quantity === 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                                        {p.quantity} {p.unit || 'pcs'}
                                        {p.quantity > 0 && p.min_stock > 0 && <span className="text-slate-600 text-[10px] font-normal"> / min {p.min_stock}</span>}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent sales (if any) */}
                {recentSales.length > 0 && (
                    <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Dernières ventes</p>
                        <div className="space-y-2">
                            {recentSales.slice(0, 4).map((sale: any, i: number) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <ShoppingCart size={14} className="text-primary shrink-0" />
                                        <span className="text-slate-300 text-sm truncate">
                                            {sale.customer_name || 'Client anonyme'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-emerald-400 text-sm font-black">{formatCurrency(sale.total_amount || 0)}</span>
                                        <span className="text-slate-600 text-[10px] hidden sm:block">
                                            {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Analysis text */}
                {summary && (
                    <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Sparkles size={11} className="text-primary" /> Analyse IA
                        </p>
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                            <p className="text-slate-300 text-sm leading-relaxed">{summary}</p>
                        </div>
                    </div>
                )}

                {/* No data fallback */}
                {!data && !summary && (
                    <div className="text-center py-8 text-slate-500">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-slate-700" />
                        <p className="text-sm">Chargement des données...</p>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <Calendar size={12} /> {new Date().toLocaleDateString('fr-FR')}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-all"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </Modal>
    );
}
