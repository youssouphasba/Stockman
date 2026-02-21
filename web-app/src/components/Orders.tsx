'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '../hooks/useDateFormatter';
import {
    ShoppingBag,
    Truck,
    Clock,
    CheckCircle2,
    Package,
    Plus,
    Search,
    ExternalLink,
    ChevronRight
} from 'lucide-react';
import { supplier_orders as ordersApi } from '../services/api';

export default function Orders() {
    const { t } = useTranslation();
    const { formatDate, formatCurrency } = useDateFormatter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await ordersApi.list();
            setOrders(res.items || res);
        } catch (err) {
            console.error("Orders load error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await ordersApi.updateStatus(id, status);
            loadOrders();
        } catch (err) {
            console.error("Status update error", err);
        }
    };

    const STATUS_MAP: Record<string, { label: string, color: string, icon: any }> = {
        pending: { label: 'En attente', color: 'text-amber-500 bg-amber-500/10', icon: Clock },
        processing: { label: 'En cours', color: 'text-blue-500 bg-blue-500/10', icon: Truck },
        shipped: { label: 'Expédié', color: 'text-indigo-500 bg-indigo-500/10', icon: Truck },
        received: { label: 'Reçu', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
        cancelled: { label: 'Annulé', color: 'text-rose-500 bg-rose-500/10', icon: Package },
    };

    const filteredOrders = filterStatus === 'all'
        ? (Array.isArray(orders) ? orders : [])
        : (Array.isArray(orders) ? orders : []).filter(o => o.status === filterStatus);

    if (loading && orders.length === 0) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Commandes Fournisseurs</h1>
                    <p className="text-slate-400">Suivez vos approvisionnements et réceptions de stock.</p>
                </div>
                <button className="btn-primary rounded-xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                    <Plus size={20} /> Nouvelle Commande
                </button>
            </header>

            {/* Status Filter Tabs */}
            <div className="flex border-b border-white/5 mb-8 gap-8">
                {['all', 'pending', 'processing', 'received'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all relative ${filterStatus === status ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {status === 'all' ? 'Toutes' : STATUS_MAP[status]?.label || status}
                        {filterStatus === status && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {/* Orders Grid/List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="glass-card p-20 text-center text-slate-500 flex flex-col items-center gap-4">
                        <ShoppingBag size={48} className="opacity-20" />
                        <p>Aucune commande trouvée dans cette catégorie.</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const StatusIcon = STATUS_MAP[order.status]?.icon || ShoppingBag;
                        return (
                            <div key={order.order_id} className="glass-card p-6 flex items-center justify-between hover:border-primary/30 transition-all group">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${STATUS_MAP[order.status]?.color || 'bg-white/5'}`}>
                                        <StatusIcon size={28} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-white">#{order.order_id.substring(0, 8).toUpperCase()}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${STATUS_MAP[order.status]?.color}`}>
                                                {STATUS_MAP[order.status]?.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 flex items-center gap-2">
                                            <span className="font-bold text-slate-300">{order.supplier_name || 'Fournisseur Inconnu'}</span>
                                            <span className="text-slate-600">•</span>
                                            <span>{formatDate(order.created_at)}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-10">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-slate-500 uppercase tracking-widest">Montant</span>
                                        <span className="text-xl font-black text-white">{formatCurrency(order.total_amount || 0)}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status !== 'received' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.order_id, 'received')}
                                                className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                                                title="Marquer comme reçu"
                                            >
                                                <CheckCircle2 size={20} />
                                            </button>
                                        )}
                                        <button className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all border border-white/5">
                                            <ExternalLink size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
