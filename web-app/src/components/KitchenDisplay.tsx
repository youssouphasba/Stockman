'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ChefHat, Clock, RefreshCw } from 'lucide-react';
import { kitchen } from '../services/api';

export default function KitchenDisplay() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const data = await kitchen.pending();
            setOrders(data || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    const minutesAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        return Math.floor(diff / 60000);
    };

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A]">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                        <ChefHat size={32} className="text-primary" /> Affichage Cuisine
                    </h1>
                    <p className="text-slate-400 text-sm">{orders.length} commande(s) en attente — rafraichissement auto 30s</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-slate-400 text-sm hover:bg-white/10">
                    <RefreshCw size={14} /> Rafraichir
                </button>
            </header>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <ChefHat size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Aucune commande en attente en cuisine</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.map(order => {
                        const mins = minutesAgo(order.created_at);
                        const urgent = mins > 15;
                        return (
                            <div key={order.sale_id} className={`glass-card p-5 border-2 ${urgent ? 'border-rose-500/50' : 'border-primary/20'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="text-white font-bold">#{order.sale_id?.slice(-6).toUpperCase()}</div>
                                    <div className={`flex items-center gap-1 text-xs font-bold ${urgent ? 'text-rose-400' : 'text-slate-400'}`}>
                                        <Clock size={12} /> {mins} min
                                    </div>
                                </div>
                                {order.table_id && (
                                    <div className="text-xs text-primary font-bold mb-2">Table {order.table_id}</div>
                                )}
                                {order.covers && (
                                    <div className="text-xs text-slate-400 mb-3">{order.covers} couvert(s)</div>
                                )}
                                <div className="space-y-1.5">
                                    {(order.items || []).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-slate-300">{item.product_name}</span>
                                            <span className="text-white font-bold">x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                                {order.notes && (
                                    <div className="mt-3 p-2 bg-amber-500/10 rounded-lg text-amber-400 text-xs">
                                        {order.notes}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
