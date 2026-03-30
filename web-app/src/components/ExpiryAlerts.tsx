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
import OrderReturnModal from './OrderReturnModal';
import ScreenGuide, { GuideStep } from './ScreenGuide';

export default function ExpiryAlerts() {
    const { t } = useTranslation();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedAlertForReturn, setSelectedAlertForReturn] = useState<any>(null);

    useEffect(() => {
        loadAlerts();
    }, []);

    const handleDeleteAlert = (alertIndex: number) => {
        setAlerts(prev => prev.filter((_, i) => i !== alertIndex));
    };

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
        (a.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const expirySteps: GuideStep[] = [
        {
            title: t('guide.expiry.role_title', "Rôle des alertes d'expiration"),
            content: t('guide.expiry.role_content', "Cet écran surveille les dates de péremption de vos produits périssables. Il vous alerte avant que les produits expirent pour que vous puissiez agir : vente accélérée, retrait ou enregistrement d'une perte. Consultez-le régulièrement pour limiter les pertes."),
        },
        {
            title: t('guide.expiry.cards_title', "Cartes d'alerte"),
            content: t('guide.expiry.cards_content', "Chaque carte représente un produit (ou un lot) avec une date de péremption."),
            details: [
                { label: t('guide.expiry.badge_expired', "Badge rouge — Expiré"), description: t('guide.expiry.badge_expired_desc', "Le produit est déjà périmé. Retirez-le immédiatement de la vente."), type: 'card' as const },
                { label: t('guide.expiry.badge_soon', "Badge orange — Expire bientôt (< 30 jours)"), description: t('guide.expiry.badge_soon_desc', "Le produit expire dans moins de 30 jours. Priorisez sa vente ou planifiez son retrait."), type: 'card' as const },
                { label: t('guide.expiry.badge_ok', "Badge vert — OK (> 30 jours)"), description: t('guide.expiry.badge_ok_desc', "Le produit est encore dans sa durée de vie normale. Surveillez quand même l'évolution."), type: 'card' as const },
                { label: t('guide.expiry.card_lot', "Numéro de lot"), description: t('guide.expiry.card_lot_desc', "Référence du lot concerné, utile pour la traçabilité et les retraits ciblés."), type: 'info' as const },
            ],
        },
        {
            title: t('guide.expiry.actions_title', "Actions disponibles"),
            content: t('guide.expiry.actions_content', "Pour chaque produit, vous pouvez agir directement depuis la carte."),
            details: [
                { label: t('guide.expiry.btn_withdraw', "Gérer le retrait (→)"), description: t('guide.expiry.btn_withdraw_desc', "Ouvre la modale de retrait : enregistrez la quantité retirée, la raison (perte, retour fournisseur, destruction) et la date. Le stock est mis à jour."), type: 'button' as const },
                { label: t('guide.expiry.btn_delete', "Supprimer la carte (🗑️)"), description: t('guide.expiry.btn_delete_desc', "Retire l'alerte de la liste sans ajustement de stock. À utiliser si l'alerte est un faux positif ou si le produit a déjà été traité."), type: 'button' as const },
            ],
        },
        {
            title: t('guide.expiry.search_title', "Recherche"),
            content: t('guide.expiry.search_content', "Utilisez la barre de recherche pour trouver un produit spécifique par nom dans la liste des alertes d'expiration."),
            details: [
                { label: t('guide.expiry.search_tip', "Astuce prévention"), description: t('guide.expiry.search_tip_desc', "Quand vous entrez un produit dans l'inventaire, saisissez toujours la date de péremption pour que le système puisse vous alerter à temps."), type: 'tip' as const },
            ],
        },
    ];

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-[#0F172A] custom-scrollbar">
            <ScreenGuide steps={expirySteps} guideKey="expiry_tour" />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Calendar className="text-rose-500" size={32} />
                        {t('expiry.title')}
                    </h1>
                    <p className="text-slate-400">{t('expiry.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder={t('common.search_placeholder')}
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
                    <h2 className="text-2xl font-bold text-white mb-2">{t('expiry.no_alerts')}</h2>
                    <p className="text-slate-400 max-w-sm mx-auto">{t('expiry.all_good')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAlerts.map((alert, i) => {
                        const days = getDaysRemaining(alert.expiry_date);
                        return (
                            <div key={i} className="glass-card p-6 flex flex-col border border-white/5 hover:border-rose-500/30 transition-all scroll-reveal">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(days)}`}>
                                        {days < 0 ? t('expiry.expired') : t('expiry.days_remaining', { count: days })}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAlert(i)}
                                        className="text-slate-600 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-500/10"
                                        title={t('expiry.delete_alert')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">{alert.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">{t('expiry.lot')}: {alert.lot_number || 'N/A'}</p>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">{t('expiry.expiry_date')}</span>
                                        <span className="text-white font-bold">{new Date(alert.expiry_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">{t('expiry.stock_quantity')}</span>
                                        <span className="text-rose-400 font-bold">{alert.quantity} {alert.unit}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setSelectedAlertForReturn(alert); setIsReturnModalOpen(true); }}
                                    className="w-full bg-white/5 hover:bg-rose-500/10 text-white py-3 rounded-xl border border-white/5 hover:border-rose-500/20 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    {t('expiry.manage_withdrawal')} <ArrowRight size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <OrderReturnModal
                isOpen={isReturnModalOpen}
                onClose={() => { setIsReturnModalOpen(false); setSelectedAlertForReturn(null); }}
                order={selectedAlertForReturn ? {
                    order_id: selectedAlertForReturn.product_id || 'expiry',
                    items: [{ product_name: selectedAlertForReturn.name, quantity: selectedAlertForReturn.quantity }]
                } : undefined}
                onSuccess={() => { setIsReturnModalOpen(false); loadAlerts(); }}
            />
        </div>
    );
}
