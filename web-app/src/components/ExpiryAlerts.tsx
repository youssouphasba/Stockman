'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertCircle,
    Calendar,
    Trash2,
    Search,
    Filter,
    ArrowRight,
    History
} from 'lucide-react';
import { statistics as statsApi } from '../services/api';

export default function ExpiryAlerts() {
    const { t } = useTranslation();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const res = await statsApi.get();
            setAlerts(Array.isArray(res.expiry_alerts) ? res.expiry_alerts : []);
        } catch (err) {
            console.error("Error loading expiry alerts", err);
        } finally {
            setLoading(false);
        }
    };

    const getDaysRemaining = (date: string) => {
        const diff = new Date(date).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 3600 * 24));
    };

    const getStatusStyle = (days: number) => {
        if (days < 0) return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
        if (days < 30) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
    };

    const filteredAlerts = (Array.isArray(alerts) ? alerts : []).filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Calendar className="text-rose-500" size={32} />
                        Alertes de Péremption
                    </h1>
                    <p className="text-slate-400">Évitez les pertes en suivant les dates d'expiration de vos produits.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-primary/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="glass-card p-12 text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                        <History className="text-emerald-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Aucune alerte trouvée</h2>
                    <p className="text-slate-400 max-w-sm mx-auto">Tous vos produits sont à jour et leur date d'expiration est éloignée.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAlerts.map((alert, i) => {
                        const days = getDaysRemaining(alert.expiry_date);
                        return (
                            <div key={i} className="glass-card p-6 flex flex-col border border-white/5 hover:border-rose-500/30 transition-all scroll-reveal">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(days)}`}>
                                        {days < 0 ? 'PÉRIMÉ' : `${days} jours restants`}
                                    </div>
                                    <button className="text-slate-600 hover:text-rose-400 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">{alert.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Lot: {alert.lot_number || 'N/A'}</p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Date d'expiration</span>
                                        <span className="text-white font-bold">{new Date(alert.expiry_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Quantité en stock</span>
                                        <span className="text-rose-400 font-bold">{alert.quantity} {alert.unit}</span>
                                    </div>
                                </div>

                                <button className="w-full bg-white/5 hover:bg-rose-500/10 text-white py-3 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all font-bold text-sm flex items-center justify-center gap-2">
                                    Gérer le retrait <ArrowRight size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
