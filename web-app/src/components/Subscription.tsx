'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    CreditCard,
    CheckCircle2,
    ShieldCheck,
    Zap,
    History,
    Download,
    ExternalLink,
    AlertCircle,
    ArrowRight,
    Star,
    Smartphone,
    RefreshCw
} from 'lucide-react';
import { subscription as subApi } from '../services/api';

export default function Subscription() {
    const { t } = useTranslation();
    const [subDetails, setSubDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSubDetails();
    }, []);

    const loadSubDetails = async () => {
        setLoading(true);
        try {
            setError(null);
            const data = await subApi.getDetails();
            setSubDetails(data);
        } catch (err: any) {
            console.error("Subscription details error", err);
            setError(err.message || "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    const handleCinetPay = async () => {
        setPurchasing(true);
        try {
            const { payment_url } = await subApi.initCinetPay();
            window.location.href = payment_url;
        } catch (err) {
            console.error("CinetPay init error", err);
            alert("Erreur lors de l'initialisation du paiement.");
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-[#0F172A]">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: '3 000 F',
            period: '/ mois',
            icon: Zap,
            color: 'text-slate-400',
            bg: 'bg-slate-400/10',
            features: [
                'Jusqu\'à 100 produits',
                '1 utilisateur (fondateur)',
                'Gestion de stock basique',
                'Analyses de ventes quotidiennes',
                'Support par email'
            ]
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '7 500 F',
            period: '/ mois',
            icon: Star,
            color: 'text-primary',
            bg: 'bg-primary/10',
            popular: true,
            features: [
                'Produits illimités',
                'Équipe complète (5 employés)',
                'Analyses IA & Prévisions',
                'Centre d\'Alertes Avancé',
                'Portail Fournisseur',
                'Support prioritaire 24/7'
            ]
        }
    ];

    const currentPlan = subDetails?.plan || 'starter';

    return (
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[#0F172A]">
            {error && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-rose-500">
                        <AlertCircle size={20} />
                        <span className="font-medium text-sm tracking-tight">{error}</span>
                    </div>
                    <button
                        onClick={loadSubDetails}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                    >
                        Réessayer
                    </button>
                </div>
            )}

            <header className="mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Gestion d'Abonnement</h1>
                <p className="text-slate-400">Boostez votre boutique avec nos plans Premium.</p>
            </header>

            {/* Current Status Banner */}
            <div className={`mb-12 glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 ${subDetails?.is_active ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-rose-500 bg-rose-500/5'
                }`}>
                <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${subDetails?.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                        }`}>
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Plan actuel : {currentPlan}</h2>
                        <p className="text-slate-400 text-sm">
                            {subDetails?.is_active
                                ? `Votre abonnement est actif jusqu'au ${new Date(subDetails.expiry_date).toLocaleDateString()}.`
                                : "Votre période d'essai est terminée. Passez au Premium pour continuer."}
                        </p>
                    </div>
                </div>
                {!subDetails?.is_active && (
                    <button onClick={handleCinetPay} disabled={purchasing} className="btn-primary px-8 py-3 rounded-xl shadow-xl shadow-primary/20 transition-all hover:scale-105 flex items-center gap-2">
                        {purchasing ? <RefreshCw className="animate-spin" size={20} /> : <CreditCard size={20} />}
                        Réactiver maintenant
                    </button>
                )}
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {plans.map(plan => (
                    <div key={plan.id} className={`glass-card p-8 flex flex-col gap-8 relative overflow-hidden group border-2 ${plan.popular ? 'border-primary/30 shadow-2xl shadow-primary/10' : 'border-white/5'
                        }`}>
                        {plan.popular && (
                            <div className="absolute top-5 right-5 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                                Le plus populaire
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${plan.bg} ${plan.color}`}>
                                <plan.icon size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-white">{plan.price}</span>
                                    <span className="text-slate-500 text-sm font-medium">{plan.period}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <CheckCircle2 size={18} className="text-primary mt-0.5" />
                                    <span className="text-slate-300 text-sm leading-relaxed">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleCinetPay}
                            disabled={purchasing || (plan.id === currentPlan && subDetails?.is_active)}
                            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold transition-all shadow-xl ${plan.id === currentPlan && subDetails?.is_active
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                : 'btn-primary shadow-primary/20 hover:scale-105 active:scale-95'
                                }`}
                        >
                            {plan.id === currentPlan && subDetails?.is_active ? 'Plan Actuel' : 'Souscrire via CinetPay'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Mobile Money Info */}
            <div className="glass-card p-6 border-white/10 bg-white/5 flex items-center gap-6">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Smartphone size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="text-white font-bold mb-1 tracking-tight">Paiement Mobile Money Simplifié</h4>
                    <p className="text-slate-400 text-sm">Payez instantanément avec Orange Money, Wave ou Moov via CinetPay.</p>
                </div>
                <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <div className="bg-white px-3 py-1 rounded font-black text-[10px] text-orange-500">ORANGE</div>
                    <div className="bg-white px-3 py-1 rounded font-black text-[10px] text-blue-500">WAVE</div>
                    <div className="bg-white px-3 py-1 rounded font-black text-[10px] text-blue-900">MOOV</div>
                </div>
            </div>

            {/* Billing History */}
            <div className="mt-12 glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <History size={20} className="text-slate-400" />
                    <h3 className="text-lg font-bold text-white">Historique de Facturation</h3>
                </div>
                <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-4">
                    <Download size={48} className="opacity-10" />
                    <p>Aucune facture disponible pour le moment.</p>
                </div>
            </div>
        </div>
    );
}
